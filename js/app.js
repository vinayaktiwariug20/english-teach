import { CATEGORIES, WORDS, PHRASES, READING_WORDS } from './data.js';
import { buildSentences, shoppableNouns } from './sentences.js';
import { buildTransaction, changeOptions, hindiNumber } from './money.js';
import { NOTES, moneyInPlay, tender, hindiValue, noteFor, photoFor } from './notes.js';
import { buildQuestion, visualKey, shuffle } from './quiz.js';
import { renderable, missingGlyphs } from './glyphs.js';
import * as sp from './speech.js';
import * as store from './store.js';

// ---------------------------------------------------------------------------
// Caregiver gate.
//
// Four invisible corner targets, tapped in this exact order inside 6 seconds.
// There is deliberately NO feedback of any kind until the whole sequence
// completes, so a stray corner tap by the learner is a no-op they never notice.
// Any tap
// elsewhere on the screen resets the sequence.
// ---------------------------------------------------------------------------
const CORNER_CODE = ['tl', 'br', 'tr', 'bl'];
const CORNER_WINDOW_MS = 6000;

let codeIndex = 0;
let codeStarted = 0;

function cornerTap(which) {
  const now = Date.now();
  if (codeIndex > 0 && now - codeStarted > CORNER_WINDOW_MS) codeIndex = 0;

  if (which === CORNER_CODE[codeIndex]) {
    if (codeIndex === 0) codeStarted = now;
    codeIndex += 1;
    if (codeIndex === CORNER_CODE.length) {
      codeIndex = 0;
      go('admin');
    }
  } else {
    // Restart cleanly if this tap happens to be the first step.
    codeIndex = which === CORNER_CODE[0] ? 1 : 0;
    codeStarted = which === CORNER_CODE[0] ? now : 0;
  }
}

function resetCode() {
  codeIndex = 0;
  codeStarted = 0;
}

// ---------------------------------------------------------------------------
// Tiny DOM helper
// ---------------------------------------------------------------------------
function el(tag, props = {}, ...kids) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v !== null && v !== undefined) node.setAttribute(k, v);
  }
  for (const kid of kids.flat()) {
    if (kid == null) continue;
    node.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return node;
}

// ---------------------------------------------------------------------------
// Speech helpers bound to current settings
// ---------------------------------------------------------------------------
function sayEn(text) {
  const s = store.settings();
  return sp.speak(text, {
    lang: 'en-US', rate: s.rate, voiceName: s.englishVoice,
    volume: s.enVolume, preferLocal: s.preferLocalVoice
  });
}

function sayHi(text) {
  const s = store.settings();
  if (!s.hindiAudio) return Promise.resolve(false);
  return sp.speak(text, {
    lang: 'hi-IN', rate: s.rate, voiceName: s.hindiVoice,
    volume: s.hiVolume, preferLocal: s.preferLocalVoice
  });
}

const PRAISE_HI = ['शाबाश!', 'बहुत बढ़िया!', 'वाह!', 'बहुत अच्छे!'];
const PRAISE_EN = ['Well done!', 'Very good!', 'Excellent!'];

function praise() {
  if (sp.hasVoiceFor('hi') && store.settings().hindiAudio) {
    const t = PRAISE_HI[Math.floor(Math.random() * PRAISE_HI.length)];
    sayHi(t);
    return t;
  }
  const t = PRAISE_EN[Math.floor(Math.random() * PRAISE_EN.length)];
  sayEn(t);
  return PRAISE_HI[0];
}

// ---------------------------------------------------------------------------
// App state
// ---------------------------------------------------------------------------
const state = {
  screen: 'gate',
  cat: null,
  deck: [],
  deckIndex: 0,
  target: null,
  choices: [],
  recent: [],
  stars: 0,
  revealed: false,
  shop: null,
  shopStep: 0,
  noteQ: null,
  sentSeen: [],
  sentQuiz: null,
  locked: false,
  adminConfirmReset: false
};

const STARS_PER_ROUND = 10;
const root = document.getElementById('root');

function go(screen, extra = {}) {
  sp.stop();
  resetCode();
  state.locked = false;
  state.adminConfirmReset = false;
  Object.assign(state, extra);
  state.screen = screen;
  render();
}

// ---------------------------------------------------------------------------
// Word pools
// ---------------------------------------------------------------------------
function enabledCats() {
  const chosen = store.settings().categories;
  if (!chosen || !chosen.length) return CATEGORIES.map((c) => c.id);
  return chosen;
}

// Measured once: every word whose emoji this device can actually draw. A glyph
// the font lacks renders as a box, and being shown a box and asked to name it
// is worse than never meeting the word.
const DRAWABLE = renderable(WORDS);

function activeWords() {
  const cats = enabledCats();
  const pool = DRAWABLE.filter((w) => cats.includes(w.cat));
  return pool.length >= 4 ? pool : DRAWABLE;
}

/**
 * The pool the picture quizzes draw from.
 *
 * Numbers are held out by default. They are twenty of the words but a different
 * kind of task - matching a spoken number to a numeral is arithmetic reading,
 * not vocabulary - and they already get worked hard in Money and can be drilled
 * on their own in Words. Left in, they were about a tenth of every Listen
 * session.
 */
function quizWords() {
  const pool = activeWords();
  if (store.settings().numbersInQuiz) return pool;
  const without = pool.filter((w) => w.cat !== 'numbers');
  return without.length >= 4 ? without : pool;
}

function readingPool() {
  const cats = enabledCats();
  const drawable = new Set(DRAWABLE.map((w) => w.id));
  const pool = READING_WORDS.filter((w) => cats.includes(w.cat) && drawable.has(w.id));
  return pool.length >= 4 ? pool : READING_WORDS;
}

// ---------------------------------------------------------------------------
// Shared pieces
// ---------------------------------------------------------------------------
function pictureNode(w, size = 'ico') {
  if (w.swatch) {
    return el('div', {
      class: size === 'ico' ? 'swatch' : 'pic-swatch',
      style: `background:${w.swatch}`
    });
  }
  if (w.num) {
    return el('div', { class: size === 'ico' ? 'num' : 'pic-num', text: w.num });
  }
  return el('div', { class: `emoji ${size === 'ico' ? 'ico' : 'pic'}`, text: w.emoji });
}

function topBar({ withStars = true } = {}) {
  const bar = el('div', { class: 'topbar' },
    el('button', {
      class: 'home-btn emoji',
      'aria-label': 'Home',
      onclick: () => go('home')
    }, '🏠')
  );
  if (withStars) {
    const strip = el('div', { class: 'stars emoji' });
    for (let i = 0; i < STARS_PER_ROUND; i++) {
      strip.append(el('span', { class: i < state.stars ? 'on' : '', text: '⭐' }));
    }
    bar.append(strip);
  }
  return bar;
}

function overlay(mark, msg, ms = 1300) {
  const node = el('div', { class: 'overlay' },
    el('div', {},
      el('div', { class: 'mark emoji', text: mark }),
      el('div', { class: 'msg hi', text: msg })
    )
  );
  document.body.append(node);
  setTimeout(() => node.remove(), ms);
  return node;
}

function awardStar() {
  state.stars += 1;
  if (state.stars >= STARS_PER_ROUND) {
    state.stars = 0;
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Screens
// ---------------------------------------------------------------------------
function screenGate() {
  return el('div', { class: 'screen gate' },
    el('div', { class: 'big-emoji emoji', text: '👋' }),
    el('div', { class: 'home-title' },
      el('div', { class: 'big hi', text: 'नमस्ते!' }),
      el('div', { class: 'sub', text: "Let's learn English" })
    ),
    el('button', {
      class: 'go',
      onclick: () => {
        sp.unlock();
        store.noteSession();
        requestWakeLock();
        go('home');
      }
    }, 'शुरू करें')
  );
}

const MODES = [
  { id: 'words',   cls: 't-words',   icon: '🖼️', hi: 'शब्द',    en: 'Words' },
  { id: 'listen',  cls: 't-listen',  icon: '👂', hi: 'सुनो',    en: 'Listen' },
  { id: 'read',    cls: 't-read',    icon: '🔤', hi: 'पढ़ो',    en: 'Read' },
  { id: 'phrases', cls: 't-phrases', icon: '💬', hi: 'बोलो',    en: 'Say it' },
  { id: 'sentences', cls: 't-sentences', icon: '🗣️', hi: 'वाक्य', en: 'Sentences' },
  { id: 'money', cls: 't-money', icon: '💰', hi: 'पैसे', en: 'Money' }
];

// The level is how hard the LANGUAGE is, not which modes exist. Every mode is
// always available; what changes is the grammar the sentences are built from.
// Each level keeps everything below it, so moving up widens rather than swaps.
const LEVELS = [
  { n: 1, hi: 'यह क्या है', en: 'Naming', count: 153,
    note: 'This is an apple. I want water. I like this book. No tenses yet.' },
  { n: 2, hi: 'बीता कल', en: 'Past and present', count: 311,
    note: 'I ate an apple yesterday. I eat an apple. Three verbs.' },
  { n: 3, hi: 'आने वाला कल', en: 'Future and continuous', count: 815,
    note: 'I will eat an apple tomorrow. I am eating an apple. Eight verbs.' },
  { n: 4, hi: 'वह और नहीं', en: 'He, she, and not', count: 1657,
    note: 'She eats an apple. I did not eat an apple. He is eating an apple.' },
  { n: 5, hi: 'सवाल और जगहें', en: 'Questions and places', count: 2159,
    note: 'Did you eat an apple? I went to the market yesterday. Do you want water?' },
  { n: 6, hi: 'दो बातें', en: 'Two things at once', count: 2319,
    note: 'I ate honey and drank tea yesterday. Two clauses in one sentence - each verb still agreeing with its own object.' }
];

function level() {
  return store.settings().level || 1;
}

function screenHome() {
  const tiles = el('div', { class: 'tiles' });
  for (const m of MODES) {
    tiles.append(
      el('button', {
        class: `tile ${m.cls}`,
        onclick: () => {
          resetCode();
          if (m.id === 'words') go('cats');
          else if (m.id === 'phrases') startPhrases();
          else if (m.id === 'sentences') startSentences();
          else if (m.id === 'money') startMoney();
          else startQuiz(m.id);
        }
      },
        el('div', { class: 'ico emoji', text: m.icon }),
        el('div', { class: 'lab-hi', text: m.hi }),
        el('div', { class: 'lab-en', text: m.en })
      )
    );
  }

  const screen = el('div', { class: 'screen home' },
    el('div', { class: 'home-title' },
      el('div', { class: 'big hi', text: 'क्या सीखें?' }),
      el('div', { class: 'sub', text: 'Choose one' })
    ),
    tiles
  );

  // The way back into the caregiver screen, written down. The code cannot be
  // stumbled into and cannot be discovered, which also makes it easy to lose;
  // this line is small, English, and inert - it cannot be tapped, so it can
  // neither open the panel nor break a code being entered over it.
  if (store.settings().showHint) {
    screen.append(
      el('div', { class: 'hint' },
        el('div', { class: 'hint-label', text: 'Caregiver settings' }),
        el('div', { class: 'hint-steps' },
          'tap the corners ',
          el('b', { text: 'top-left' }), ' → ',
          el('b', { text: 'bottom-right' }), ' → ',
          el('b', { text: 'top-right' }), ' → ',
          el('b', { text: 'bottom-left' })
        )
      )
    );
  }

  // Invisible caregiver corners live only on the home screen.
  for (const c of ['tl', 'tr', 'bl', 'br']) {
    screen.append(
      el('button', {
        class: `corner ${c}`,
        tabindex: '-1',
        'aria-hidden': 'true',
        onclick: (e) => {
          e.stopPropagation();
          cornerTap(c);
        }
      })
    );
  }
  return screen;
}

function screenCats() {
  const grid = el('div', { class: 'grid-cats' });
  for (const c of CATEGORIES) {
    if (!enabledCats().includes(c.id)) continue;
    grid.append(
      el('button', {
        class: 'cat',
        onclick: () => startWords(c.id)
      },
        el('div', { class: 'ico emoji', text: c.emoji }),
        el('div', { class: 'lab-hi', text: c.hi }),
        el('div', { class: 'lab-en', text: c.en })
      )
    );
  }
  return el('div', { class: 'screen' }, topBar({ withStars: false }), grid);
}

// --- card modes (Words, Say it) -------------------------------------------

// Card decks are ordered by the review schedule rather than shuffled: due
// first, then never-seen, then the rest. Cards mark nothing, so they cannot
// move an item along the schedule - but they can still put the thing most
// worth revisiting at the front, which is most of the benefit in a mode that
// asks no questions.
function startWords(catId) {
  const deck = store.sessionDeck(DRAWABLE.filter((w) => w.cat === catId));
  go('words', { cat: catId, deck, deckIndex: 0 });
}

function startPhrases() {
  go('phrases', { deck: store.sessionDeck(PHRASES), deckIndex: 0 });
}

function startSentences() {
  const deck = store.sessionDeck(
    buildSentences(activeWords(), {
      learnerGender: store.settings().learnerGender,
      level: level()
    })
  );
  go('sentences', { deck, deckIndex: 0, sentSeen: [], sentQuiz: null });
}

// --- money -----------------------------------------------------------------

function makeTransaction() {
  const s = store.settings();
  return buildTransaction(shoppableNouns(activeWords()), {
    maxPrice: s.moneyMax,
    learnerGender: s.learnerGender
  });
}

function startMoney() {
  // Build first, navigate second. Going to the screen with no transaction in
  // hand makes the render fall straight back into here.
  go('money', { shop: makeTransaction(), shopStep: 0, noteQ: null });
}

function nextTransaction() {
  // Roughly every third time, a note question instead of another shop trip.
  // Recognising the money is the half of the skill the arithmetic assumes.
  if (Math.random() < 0.34 && buildNoteQuestion()) {
    state.locked = false;
    render();
    return;
  }
  state.shop = makeTransaction();
  state.shopStep = 0;
  state.noteQ = null;
  state.locked = false;
  render();
}

/**
 * "Which one is twenty rupees?"
 *
 * The distractors are the neighbouring denominations, because those are the
 * ones actually confused in a hand - and they are the ones whose colours have
 * to be told apart. A ₹10 against a ₹500 would be a question about size only.
 */
function buildNoteQuestion() {
  const pool = moneyInPlay(store.settings().moneyMax);
  if (pool.length < 2) return false;

  const i = Math.floor(Math.random() * pool.length);
  const target = pool[i];

  // Distractors are the neighbouring denominations, because those are the ones
  // confused in a hand - but photographs and drawings are matched first. With
  // only some denominations photographed, a lone drawing among photographs is
  // the odd one out on sight, and the question can be answered without knowing
  // which note is which. The picture quiz guards the same way against a colour
  // disc sitting among emoji.
  const near = (a, b) => Math.abs(a.value - target.value) - Math.abs(b.value - target.value);
  const wanted = !!photoFor(target.value);
  const others = pool.filter((n) => n.value !== target.value);
  const sameKind = others.filter((n) => !!photoFor(n.value) === wanted).sort(near);
  const otherKind = others.filter((n) => !!photoFor(n.value) !== wanted).sort(near);
  const neighbours = [...sameKind, ...otherKind];

  const n = Math.max(2, Math.min(store.choiceCount(), pool.length));
  state.noteQ = {
    value: target.value,
    choices: shuffle([target, ...neighbours.slice(0, n - 1)])
  };
  return true;
}

function screenNoteQuiz() {
  const q = state.noteQ;
  const spoken = `${q.value} rupees`;
  const hindi = `${hindiValue(q.value)} रुपए`;

  const prompt = el('div', { class: 'prompt', onclick: () => sayEn(spoken) },
    el('div', { class: 'speaker emoji', text: '🔊' }),
    el('div', { class: 'ask-hi hi', text: hindi })
  );

  const grid = el('div', { class: `choices n${q.choices.length} note-choices` });
  for (const choice of q.choices) {
    const btn = el('button', { class: 'choice' }, noteNode(choice.value, 'pic'));
    btn.addEventListener('click', () => {
      if (state.locked) return;
      const id = `note/${q.value}`;
      if (choice.value === q.value) {
        state.locked = true;
        store.noteAnswer(id, true, 'notes');
        btn.classList.add('right');
        sp.chimeCorrect();
        const full = awardStar();
        setTimeout(() => {
          const msg = praise();
          if (full) sp.chimeCelebrate();
          overlay(full ? '🎉' : '✅', full ? 'बहुत बढ़िया!' : msg, full ? 1900 : 1200);
          setTimeout(() => {
            state.noteQ = null;
            nextTransaction();
          }, full ? 1900 : 1200);
        }, 260);
      } else {
        store.noteAnswer(id, false, 'notes');
        btn.classList.add('wrong');
        sp.chimeRetry();
        setTimeout(() => btn.classList.remove('wrong'), 450);
        setTimeout(() => sayEn(spoken), 520);
      }
    });
    grid.append(btn);
  }

  if (store.settings().autoSpeak) setTimeout(() => sayEn(spoken), 380);

  return el('div', { class: 'screen' }, topBar(), prompt, grid);
}

function coins(n) {
  // The number is the lesson, so it is shown as a numeral and a Hindi word
  // rather than as a row of coins that would have to be counted twice.
  return el('div', { class: 'price' },
    el('span', { class: 'rupee', text: '₹' }),
    el('span', { class: 'amount', text: String(n) }),
    el('span', { class: 'amount-hi hi', text: hindiNumber(n) })
  );
}

/**
 * One note: a photograph if one has been supplied for this denomination,
 * otherwise the drawing.
 *
 * Both go in a box of the note's real proportions - a ₹500 is longer than a
 * ₹10, and length is half of how a note is recognised in a hand - so the
 * layout is the same either way and swapping one for the other cannot break
 * anything that was measured. A photograph that fails to load reverts to the
 * drawing in place, so a missing or misnamed file costs nothing.
 */
function noteNode(value, size = 'ico') {
  const n = noteFor(value);
  if (!n) return coinNode(value, size);

  const cls = `rnote ${size === 'ico' ? 'rnote-ico' : 'rnote-pic'}`;
  const style = `--bg:${n.bg};--ink:${n.ink};--mm:${n.mm};aspect-ratio:${n.mm}/63`;

  const drawn = () => el('div', { class: cls, style },
    el('div', { class: 'rnote-val' },
      el('span', { class: 'rnote-rupee', text: '₹' }),
      String(value)
    ),
    el('div', { class: 'rnote-hi hi', text: hindiValue(value) })
  );

  const src = photoFor(value);
  if (!src) return drawn();

  const wrap = el('div', { class: `${cls} rnote-photo`, style });
  const img = el('img', {
    src,
    alt: `${value} rupees`,
    // Decorative in the sense that matters: the question is answered by
    // looking, and the amount is spoken aloud, so nothing is lost if it
    // never arrives.
    loading: 'eager',
    decoding: 'async'
  });
  img.addEventListener('error', () => wrap.replaceWith(drawn()));
  wrap.append(img);
  return wrap;
}

function coinNode(value, size = 'ico') {
  return el('div', { class: `rcoin ${size === 'ico' ? 'rcoin-ico' : 'rcoin-pic'}` },
    el('span', { class: 'rcoin-val', text: `\u20b9${value}` })
  );
}

/** What an amount looks like as actual money in a hand. */
function tenderStrip(amount) {
  const strip = el('div', { class: 'tender' });
  for (const piece of tender(amount)) {
    strip.append(piece.kind === 'note' ? noteNode(piece.value) : coinNode(piece.value));
  }
  return strip;
}

function screenMoney() {
  const t = state.shop;
  if (!t) return screenHome(); // never expected; better than a blank screen
  const step = t.steps[state.shopStep];

  if (store.settings().autoSpeak) setTimeout(() => sayEn(step.en), 320);

  if (step.kind === 'ask') {
    // A compact prompt, not the full card: the sum and the answer buttons need
    // the room, and the item has already been shown on the steps before this.
    const prompt = el('div', { class: 'prompt money-ask', onclick: () => sayEn(step.en) },
      el('div', {},
        el('div', { class: 'ask-en', text: step.en }),
        el('div', { class: 'ask-hi hi', text: step.hi })
      )
    );
    const grid = el('div', { class: 'choices n3 num-choices' });
    for (const value of changeOptions(t.change, t.paid, Math.min(store.choiceCount(), 3))) {
      const btn = el('button', { class: 'choice' }, coins(value));
      btn.addEventListener('click', () => {
        if (state.locked) return;
        if (value === t.change) {
          state.locked = true;
          store.noteAnswer(`money/${t.paid}-${t.price}`, true, 'money');
          btn.classList.add('right');
          sp.chimeCorrect();
          const full = awardStar();
          setTimeout(() => {
            const msg = praise();
            if (full) sp.chimeCelebrate();
            overlay(full ? '🎉' : '✅', full ? 'बहुत बढ़िया!' : msg, full ? 1900 : 1200);
            setTimeout(() => {
              state.locked = false;
              state.shopStep += 1;
              render();
            }, full ? 1900 : 1200);
          }, 260);
        } else {
          store.noteAnswer(`money/${t.paid}-${t.price}`, false, 'money');
          btn.classList.add('wrong');
          sp.chimeRetry();
          setTimeout(() => btn.classList.remove('wrong'), 450);
          setTimeout(() => sayEn(step.en), 520);
        }
      });
      grid.append(btn);
    }

    const sum = el('div', { class: 'sum', text: `${t.paid} − ${t.price} = ?` });
    return el('div', { class: 'screen' }, topBar(), prompt, sum, grid);
  }

  const card = el('div', { class: 'card money-card', onclick: () => sayEn(step.en) },
    el('div', { class: 'shop-item' },
      pictureNode(t.word, 'pic'),
      step.amount !== undefined ? coins(step.amount) : null
    ),
    // The steps about having, giving and bringing home money show it as money.
    // The price step does not: a price is a number written on a shelf, not a
    // note in a hand, and showing the note there suggests you pay exactly.
    step.amount !== undefined && step.kind === 'say' && !step.isPrice
      ? tenderStrip(step.amount)
      : null,
    el('div', { class: 'word-en phrase', text: step.en }),
    el('div', { class: 'word-hi hi phrase', text: step.hi })
  );

  const actions = el('div', { class: 'actions' },
    el('button', { class: 'act act-hear', onclick: () => sayEn(step.en) },
      el('span', { class: 'ico emoji', text: '🔊' })),
    el('button', { class: 'act act-hindi', onclick: () => sayHi(step.hi) }, 'हिंदी'),
    el('button', {
      class: 'act act-next',
      onclick: () => {
        if (state.shopStep >= t.steps.length - 1) nextTransaction();
        else { state.shopStep += 1; render(); }
      }
    }, el('span', { class: 'arrow', text: '→' }))
  );

  return el('div', { class: 'screen' }, topBar(), card, actions);
}

/**
 * How many glyphs an icon is.
 *
 * It decides how much room the picture needs, and CSS cannot count. Variation
 * selectors are stripped first, or ▶️ counts as two. Intl.Segmenter would be
 * the precise tool and is not on every Android this has to run on.
 */
function glyphCount(icon) {
  return [...String(icon || '').replace(/\uFE0F/g, '')].length;
}

/** A sentence shown as pictures: the verb, then what it acts on. */
function sentencePicture(s, size = 'ico') {
  const cls = size === 'ico' ? 'ico' : 'pic';
  if (s.pair) {
    // Two clauses, so two verb-and-object pairs side by side.
    const node = el('div', { class: 'sent-pic two' });
    for (const part of s.pair) {
      node.append(
        el('span', { class: `emoji ${cls} verb`, text: part.icon }),
        pictureNode(part.word, size)
      );
    }
    return node;
  }
  // A frame like "Will you ... tomorrow?" carries three glyphs (verb, future,
  // question) and the object beside them. At the card sizes that is wider than
  // a phone, and it ran off BOTH edges - the same failure as the one reported
  // from a real handset, in a frame that is shown on cards but never quizzed,
  // so no choice tile ever revealed it.
  return el('div', { class: `sent-pic g${Math.min(3, glyphCount(s.icon))}` },
    el('span', { class: `emoji ${cls} verb`, text: s.icon }),
    pictureNode(s.word, size)
  );
}

// ---------------------------------------------------------------------------
// The four times a sentence can be about.
//
// English calls two of these the present, but "I eat rice" and "I am eating
// rice" are different times to a learner - one is a fact about every day, the
// other is happening at this moment - so they are kept apart. The glyphs are
// the tense markers the cards already use; the Hindi label is what actually
// teaches the distinction, because कल is both yesterday and tomorrow and the
// tense is the only thing that says which.
// ---------------------------------------------------------------------------
const TIMES = [
  { id: 'past',   icon: '⏪',  hi: 'बीता कल',      en: 'yesterday' },
  { id: 'habit',  icon: '🔁',  hi: 'रोज़',          en: 'every day' },
  { id: 'now',    icon: '▶️',  hi: 'अभी',           en: 'right now' },
  { id: 'future', icon: '⏩',  hi: 'आने वाला कल',   en: 'tomorrow' }
];

/**
 * "When?" - the question the app was not asking.
 *
 * The picture quiz keys its distractors on verb glyph plus object, so two
 * sentences differing only in tense collapse to the same key and can never be
 * the two options. The entire level ladder is built on tense, and until now
 * tense was shown on cards and never once tested. This asks for it directly:
 * the sentence is spoken, the picture is shown WITHOUT its tense marker, and
 * the answer is a time.
 *
 * Only times the current level actually produces are offered, so at level 2
 * this is a straight choice between yesterday and every day.
 */
function buildWhenQuiz(recent) {
  const withTense = recent.filter((s) => s.tense);
  if (!withTense.length) return false;

  const available = new Set(state.deck.map((s) => s.tense).filter(Boolean));
  if (available.size < 2) return false;

  const target = withTense[Math.floor(Math.random() * withTense.length)];
  const offered = TIMES.filter((t) => available.has(t.id));
  const others = shuffle(offered.filter((t) => t.id !== target.tense));
  const n = Math.max(2, Math.min(store.choiceCount(), offered.length));
  const times = shuffle([
    TIMES.find((t) => t.id === target.tense),
    ...others.slice(0, n - 1)
  ]);

  state.sentQuiz = { kind: 'when', target, times };
  return true;
}

function screenWhenQuiz() {
  const { target, times } = state.sentQuiz;
  // The picture is shown stripped of its tense marker: the marker is the answer.
  const shown = { ...target, icon: target.baseIcon || target.icon };

  const prompt = el('div', { class: 'prompt when-prompt', onclick: () => sayEn(target.en) },
    el('div', { class: 'speaker emoji', text: '🔊' }),
    sentencePicture(shown, 'ico')
  );

  const grid = el('div', { class: `choices n${times.length} time-choices` });
  for (const t of times) {
    const btn = el('button', { class: 'choice time-choice' },
      el('div', { class: 'time-ico emoji', text: t.icon }),
      el('div', { class: 'time-hi hi', text: t.hi }),
      el('div', { class: 'time-en', text: t.en })
    );
    btn.addEventListener('click', () => {
      if (state.locked) return;
      // Scored against the frame and the verb, not the noun: what is being
      // learned here is "the past of eat", and the apple is incidental.
      const id = `when/${target.template}`;
      if (t.id === target.tense) {
        state.locked = true;
        store.noteAnswer(id, true, 'tenses');
        btn.classList.add('right');
        sp.chimeCorrect();
        const full = awardStar();
        setTimeout(() => {
          const msg = praise();
          if (full) sp.chimeCelebrate();
          overlay(full ? '🎉' : '✅', full ? 'बहुत बढ़िया!' : msg, full ? 1900 : 1200);
          setTimeout(() => {
            state.locked = false;
            state.sentQuiz = null;
            render();
          }, full ? 1900 : 1200);
        }, 260);
      } else {
        store.noteAnswer(id, false, 'tenses');
        btn.classList.add('wrong');
        sp.chimeRetry();
        setTimeout(() => btn.classList.remove('wrong'), 450);
        // English again, then the Hindi. The Hindi is where the tense is
        // unmistakable, so it is the way back to the right answer.
        setTimeout(() => sayEn(target.en), 520);
        setTimeout(() => sayHi(target.hi), 2100);
      }
    });
    grid.append(btn);
  }

  if (store.settings().autoSpeak) setTimeout(() => sayEn(target.en), 380);

  return el('div', { class: 'screen' }, topBar(), prompt, grid);
}

// ---------------------------------------------------------------------------
// Building a sentence, rather than recognising one.
//
// Everything else in this app is a choice between pictures. The goal was that
// he could SAY "I ate an apple yesterday", and nothing here has ever asked him
// to produce a word - only to point at the right one. Speech recognition is
// out, but production does not need a microphone: Hindi is verb-final and
// English is not, so putting the English words in order IS the part that does
// not carry over from the sentence he already knows.
//
// Words are tapped one at a time in order, rather than arranged freely and
// checked at the end. A wrong tap costs a chime and nothing else - the tile
// stays where it is and the sentence so far stays on the line - so there is no
// way to build a wrong sentence, get told, and have to work out where it went
// wrong. The English is not spoken on arrival: that would make it copying.
// The speaker is there to be asked.
// ---------------------------------------------------------------------------
const MAX_BUILD_WORDS = 6;

function buildOrderQuiz(recent) {
  const usable = recent.filter((s) => {
    const words = s.en.split(' ');
    return words.length >= 3 && words.length <= MAX_BUILD_WORDS;
  });
  if (!usable.length) return false;

  const target = usable[Math.floor(Math.random() * usable.length)];
  const words = target.en.split(' ');
  state.sentQuiz = {
    kind: 'order',
    target,
    words,
    tiles: shuffle(words.map((w, i) => ({ w, i }))),
    placed: [],
    missed: false
  };
  return true;
}

function screenOrderQuiz() {
  const q = state.sentQuiz;
  const done = q.placed.length === q.words.length;

  const prompt = el('div', { class: 'prompt build-prompt' },
    sentencePicture(q.target, 'ico'),
    el('div', { class: 'build-hi hi', text: q.target.hi })
  );

  // The line being built. Empty slots are shown so the length of the answer is
  // visible from the start - it is a sentence, not an open-ended pile.
  const line = el('div', { class: 'build-line' });
  for (let i = 0; i < q.words.length; i++) {
    line.append(q.placed[i]
      ? el('span', { class: 'build-word', text: q.placed[i] })
      : el('span', { class: 'build-slot' }));
  }

  const tray = el('div', { class: 'build-tray' });
  for (const tile of q.tiles) {
    if (tile.used) continue;
    const btn = el('button', { class: 'build-tile', text: tile.w });
    btn.addEventListener('click', () => {
      if (state.locked || done) return;
      const expected = q.words[q.placed.length];
      if (tile.w === expected) {
        tile.used = true;
        q.placed.push(tile.w);
        sp.chimeTick();
        if (q.placed.length === q.words.length) finishOrder();
        else render();
      } else {
        q.missed = true;
        btn.classList.add('wrong');
        sp.chimeRetry();
        setTimeout(() => btn.classList.remove('wrong'), 450);
      }
    });
    tray.append(btn);
  }

  const actions = el('div', { class: 'actions build-actions' },
    el('button', { class: 'act act-hear', onclick: () => sayEn(q.target.en) },
      el('span', { class: 'ico emoji', text: '🔊' })),
    el('button', { class: 'act act-hindi', onclick: () => sayHi(q.target.hi) }, 'हिंदी')
  );

  return el('div', { class: 'screen' }, topBar(), prompt, line, tray, actions);
}

function finishOrder() {
  const q = state.sentQuiz;
  state.locked = true;
  // Scored once for the whole sentence, and only clean if it went in without a
  // wrong tap - otherwise the tiles could be exhausted into a right answer.
  store.noteAnswer(`build/${q.target.id}`, !q.missed, 'building');
  render();
  sayEn(q.target.en);
  sp.chimeCorrect();
  const full = !q.missed && awardStar();
  setTimeout(() => {
    if (full) sp.chimeCelebrate();
    overlay(full ? '🎉' : '✅', full ? 'बहुत बढ़िया!' : PRAISE_HI[0], full ? 1900 : 1400);
    setTimeout(() => {
      state.locked = false;
      state.sentQuiz = null;
      render();
    }, full ? 1900 : 1400);
  }, 900);
}

/**
 * Every fourth card, test what was just shown. Retrieval right after exposure
 * is what turns a sentence the learner can repeat into one they recognise.
 *
 * Two kinds of question alternate: which picture, and when. The second only
 * exists once the level in use produces more than one tense.
 */
function buildSentenceQuiz() {
  const lastFour = state.sentSeen.slice(-4);
  if (store.settings().buildSentences && Math.random() < 0.3
      && buildOrderQuiz(lastFour)) return;
  if (level() >= 2 && Math.random() < 0.45 && buildWhenQuiz(lastFour)) return;

  // Some frames need three glyphs to show subject, verb and tense, which will
  // not fit a choice tile. Those are taught on cards but never asked here.
  const recent = state.sentSeen.slice(-4).filter((s) => s.quizzable);
  if (!recent.length) {
    state.sentQuiz = null;
    return;
  }
  const target = recent[Math.floor(Math.random() * recent.length)];
  const n = Math.min(store.choiceCount(), 3);

  const seenKeys = new Set([`${target.icon}|${visualKey(target.word)}`]);
  const picks = [];
  // Distractors from the same recent batch first, so the choice is between
  // sentences the learner has actually just met. Sharing a noun with a different verb
  // is the most useful contrast, so those are not filtered out.
  for (const s of shuffle(recent).concat(shuffle(state.deck.filter((x) => x.quizzable)))) {
    if (picks.length >= n - 1) break;
    const key = `${s.icon}|${visualKey(s.word)}`;
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);
    picks.push(s);
  }
  state.sentQuiz = { kind: 'picture', target, choices: shuffle([target, ...picks]) };
}

function screenSentenceQuiz() {
  const { target, choices } = state.sentQuiz;

  const prompt = el('div', { class: 'prompt', onclick: () => sayEn(target.en) },
    el('div', { class: 'speaker emoji', text: '🔊' })
  );

  const grid = el('div', { class: `choices n${choices.length}` });
  for (const choice of choices) {
    const btn = el('button', { class: 'choice' }, sentencePicture(choice, 'ico'));
    btn.addEventListener('click', () => {
      if (state.locked) return;
      if (choice.id === target.id) {
        state.locked = true;
        store.noteAnswer(target.id, true, 'sentences');
        btn.classList.add('right');
        sp.chimeCorrect();
        const full = awardStar();
        setTimeout(() => {
          const msg = praise();
          if (full) sp.chimeCelebrate();
          overlay(full ? '🎉' : '✅', full ? 'बहुत बढ़िया!' : msg, full ? 1900 : 1200);
          setTimeout(() => {
            state.locked = false;
            state.sentQuiz = null;
            render();
          }, full ? 1900 : 1200);
        }, 260);
      } else {
        store.noteAnswer(target.id, false, 'sentences');
        btn.classList.add('wrong');
        sp.chimeRetry();
        setTimeout(() => btn.classList.remove('wrong'), 450);
        setTimeout(() => sayEn(target.en), 520);
      }
    });
    grid.append(btn);
  }

  if (store.settings().autoSpeak) setTimeout(() => sayEn(target.en), 380);

  return el('div', { class: 'screen' }, topBar(), prompt, grid);
}

function screenCard(kind) {
  const isLong = kind !== 'word';
  // With the scaffold off, the Hindi is the prompt and the English is what the
  // learner has to come up with. Nothing is marked; they say it, then check
  // themselves.
  const hideEnglish = store.settings().reveal === 'hindi' && !state.revealed;
  const item = state.deck[state.deckIndex];
  if (!item) return screenHome();

  store.noteSeen(item.id);

  const reveal = () => {
    state.revealed = true;
    render();
    sayEn(item.en);
  };

  const card = el('div', {
    class: 'card',
    onclick: () => (hideEnglish ? reveal() : sayEn(item.en))
  },
    kind === 'sentence' ? sentencePicture(item, 'pic') : pictureNode(item, 'pic'),
    hideEnglish
      ? el('div', { class: 'hidden-en' }, el('span', { class: 'emoji', text: '👁️' }))
      : el('div', { class: `word-en ${isLong ? 'phrase' : ''}`, text: item.en }),
    el('div', { class: `word-hi hi ${isLong ? 'phrase' : ''}`, text: item.hi }),
    // A reviewed example sentence, when one has been approved for this item.
    item.ex
      ? el('div', {
          class: 'example',
          onclick: (e) => {
            e.stopPropagation();
            sayEn(item.ex.en);
          }
        },
          el('div', { class: 'ex-en', text: item.ex.en }),
          el('div', { class: 'ex-hi hi', text: item.ex.hi })
        )
      : null
  );

  const actions = el('div', { class: 'actions' },
    hideEnglish
      ? el('button', { class: 'act act-reveal', onclick: reveal },
          el('span', { class: 'ico emoji', text: '👁️' }))
      : el('button', { class: 'act act-hear', onclick: () => sayEn(item.en) },
          el('span', { class: 'ico emoji', text: '🔊' })),
    el('button', { class: 'act act-hindi', onclick: () => sayHi(item.hi) }, 'हिंदी'),
    el('button', {
      class: 'act act-next',
      onclick: () => {
        state.revealed = false;
        if (kind === 'sentence') {
          state.sentSeen.push(item);
          if (state.sentSeen.length % 4 === 0) buildSentenceQuiz();
        }
        state.deckIndex += 1;
        if (state.deckIndex >= state.deck.length) {
          // Never a dead end: reshuffle and keep going.
          state.deck = shuffle(state.deck);
          state.deckIndex = 0;
        }
        render();
      }
    },
      el('span', { class: 'arrow', text: '→' })
    )
  );

  if (store.settings().autoSpeak) {
    // Speaking the English while it is hidden would hand over the answer.
    setTimeout(() => (hideEnglish ? sayHi(item.hi) : sayEn(item.en)), 320);
  }

  return el('div', { class: 'screen' }, topBar({ withStars: false }), card, actions);
}

// --- quiz modes (Listen, Read) --------------------------------------------

function askQuestion(mode) {
  const pool = mode === 'read' ? readingPool() : quizWords();
  const q = buildQuestion(pool, state.recent);
  state.target = q.target;
  state.choices = q.choices;
  state.recent = q.recent;
}

function startQuiz(mode) {
  state.recent = [];
  askQuestion(mode);
  go(mode);
}

function nextQuestion(mode) {
  // Releasing the lock here is essential: it is taken when a correct answer is
  // tapped, and only go() clears it. Advancing to the next question goes
  // straight to render(), so without this the very next tap is swallowed and
  // the quiz appears to freeze after one answer.
  state.locked = false;
  askQuestion(mode);
  render();
}

function screenQuiz(mode) {
  const target = state.target;
  if (!target) {
    startQuiz(mode);
    return el('div');
  }

  const isRead = mode === 'read';

  const prompt = isRead
    ? el('div', { class: 'prompt', onclick: () => sayEn(target.en) },
        el('div', { class: 'read-word', text: target.en })
      )
    : el('div', { class: 'prompt', onclick: () => sayEn(target.en) },
        el('div', { class: 'speaker emoji', text: '🔊' })
      );

  const n = state.choices.length;
  const grid = el('div', { class: `choices n${n}` });

  for (const choice of state.choices) {
    const btn = el('button', { class: 'choice' }, pictureNode(choice, 'ico'));
    btn.addEventListener('click', () => {
      if (state.locked) return;

      if (choice.id === target.id) {
        state.locked = true;
        store.noteAnswer(target.id, true, mode);
        btn.classList.add('right');
        sp.chimeCorrect();
        const full = awardStar();
        setTimeout(() => {
          const msg = praise();
          if (full) {
            sp.chimeCelebrate();
            overlay('🎉', 'बहुत बढ़िया!', 1900);
            setTimeout(() => nextQuestion(mode), 1900);
          } else {
            overlay('✅', msg, 1200);
            setTimeout(() => nextQuestion(mode), 1200);
          }
        }, 260);
      } else {
        // Wrong taps cost nothing: a soft nudge, the prompt again, and the
        // right answer is still sitting there waiting.
        store.noteAnswer(target.id, false, mode);
        btn.classList.add('wrong');
        sp.chimeRetry();
        setTimeout(() => btn.classList.remove('wrong'), 450);
        setTimeout(() => sayEn(target.en), 520);
      }
    });
    grid.append(btn);
  }

  // Listen mode says the word on arrival; Read mode must not, or there is
  // nothing left to read.
  if (!isRead && store.settings().autoSpeak) {
    setTimeout(() => sayEn(target.en), 380);
  }

  return el('div', { class: 'screen' }, topBar(), prompt, grid);
}

// --- caregiver panel -------------------------------------------------------

function row(label, control) {
  return el('div', { class: 'row' }, el('div', {}, label), control);
}

function screenAdmin() {
  const s = store.settings();
  const st = store.stats();

  const wrap = el('div', { class: 'screen admin' });

  wrap.append(
    el('div', { class: 'topbar' },
      el('button', { class: 'home-btn emoji', onclick: () => go('home') }, '🏠'),
      el('h1', { text: "Caregiver settings" })
    )
  );

  // --- level ---------------------------------------------------------------
  const levelPanel = el('div', { class: 'panel' });

  for (const lv of LEVELS) {
    const current = lv.n === level();
    levelPanel.append(
      el('button', {
        class: `level-row ${current ? 'on' : ''}`,
        onclick: () => { store.setSetting('level', lv.n); render(); }
      },
        el('div', { class: 'level-n' }, String(lv.n)),
        el('div', { class: 'level-body' },
          el('div', { class: 'level-name' },
            el('span', { class: 'hi', text: lv.hi }),
            el('span', { class: 'level-en', text: lv.en }),
            el('span', { class: 'level-count', text: `${lv.count} sentences` })
          ),
          el('div', { class: 'level-note', text: lv.note })
        )
      )
    );
  }

  levelPanel.append(
    el('div', { class: 'note' },
      'The level sets how hard the Hindi and English are, not which buttons the '
      + 'learner sees - every mode is always there. Each level keeps everything '
      + 'below it, so moving up widens what they meet rather than replacing it. '
      + 'Move up when the sentences at this level have stopped teaching them '
      + 'anything; the accuracy figures below are the best evidence for that.'
    )
  );

  wrap.append(el('h2', { text: 'Level' }), levelPanel);

  // --- voices -------------------------------------------------------------
  const enVoices = sp.voicesFor('en');
  const hiVoices = sp.voicesFor('hi');

  const voicePanel = el('div', { class: 'panel' });

  const rateInput = el('input', {
    type: 'range', min: '0.5', max: '1', step: '0.05', value: String(s.rate)
  });
  rateInput.addEventListener('change', () => {
    store.setSetting('rate', Number(rateInput.value));
    sayEn('This is the speaking speed.');
  });
  voicePanel.append(row('Speaking speed', rateInput));

  const voiceLabel = (v) => `${v.name} (${v.lang})${v.localService ? '' : ' - needs internet'}`;

  const enSelect = el('select', {});
  enSelect.append(el('option', { value: '', text: 'Automatic' }));
  for (const v of enVoices) {
    const opt = el('option', { value: v.name, text: voiceLabel(v) });
    if (v.name === s.englishVoice) opt.selected = true;
    enSelect.append(opt);
  }
  enSelect.addEventListener('change', () => {
    store.setSetting('englishVoice', enSelect.value || null);
    sayEn('Hello, this is the English voice.');
  });
  voicePanel.append(row('English voice', enSelect));
  voicePanel.append(row('English volume', volumeSlider('enVolume', () =>
    sayEn('This is the English volume.'))));

  if (hiVoices.length) {
    const hiSelect = el('select', {});
    hiSelect.append(el('option', { value: '', text: 'Automatic' }));
    for (const v of hiVoices) {
      const opt = el('option', { value: v.name, text: voiceLabel(v) });
      if (v.name === s.hindiVoice) opt.selected = true;
      hiSelect.append(opt);
    }
    hiSelect.addEventListener('change', () => {
      store.setSetting('hindiVoice', hiSelect.value || null);
      sayHi('नमस्ते, यह हिंदी आवाज़ है।');
    });
    voicePanel.append(row('Hindi voice', hiSelect));
    voicePanel.append(row('Hindi volume', volumeSlider('hiVolume', () =>
      sayHi('यह हिंदी की आवाज़ है।'))));

    voicePanel.append(row('Speak Hindi aloud', toggleBtn('hindiAudio')));
  } else {
    voicePanel.append(
      el('div', { class: 'note warn' },
        'No Hindi voice is installed on this device, so Hindi is shown as text only. ' +
        'On Windows: Settings → Time & language → Language & region → add Hindi → ' +
        'Language options → install Speech. On Android: install Google Text-to-speech ' +
        'and download Hindi in Settings → System → Languages → Text-to-speech output.'
      )
    );
  }

  voicePanel.append(row('Speak automatically', toggleBtn('autoSpeak')));

  const revealSelect = el('select', {});
  for (const [val, label] of [['both', 'Show both languages'], ['hindi', 'Hindi first, English hidden']]) {
    const opt = el('option', { value: val, text: label });
    if (s.reveal === val) opt.selected = true;
    revealSelect.append(opt);
  }
  revealSelect.addEventListener('change', () => store.setSetting('reveal', revealSelect.value));
  voicePanel.append(row('On the cards', revealSelect));
  voicePanel.append(
    el('div', { class: 'note' },
      'Showing both is the gentler setting and the way to learn something new. '
      + 'Hiding the English turns every card into a test the learner marks '
      + 'themselves: the Hindi is spoken, they say the English, then tap the eye '
      + 'to check. It is '
      + 'the single biggest step up in difficulty here, and it does not change '
      + 'the words at all - only how much help is on the screen.'
    )
  );
  voicePanel.append(row('Build sentences from words', toggleBtn('buildSentences')));
  voicePanel.append(
    el('div', { class: 'note' },
      'In Sentences, some questions ask for the English to be put in order one '
      + 'word at a time instead of pointing at a picture. Hindi puts the verb '
      + 'last and English does not, so the order is exactly the part that does '
      + 'not carry over from the Hindi sentence the learner already knows - and '
      + 'it is the only exercise here that asks them to produce rather than '
      + 'recognise. A wrong word costs nothing: it simply does not go on the '
      + 'line. Turn this off if it is discouraging.'
    )
  );
  voicePanel.append(row('Use offline voice (faster)', toggleBtn('preferLocalVoice')));
  voicePanel.append(
    el('div', { class: 'note' },
      'On by default. Uses a voice already on the device, so it speaks with no '
      + 'pause and works offline. On Android those are the same Google voices, so '
      + 'there is nothing to lose. Turn it off only on a desktop where the '
      + 'installed voices sound dated and the internet is reliable.'
    )
  );

  const genderSelect = el('select', {});
  for (const [val, label] of [['m', 'Boy / man (करता हूँ)'], ['f', 'Girl / woman (करती हूँ)']]) {
    const opt = el('option', { value: val, text: label });
    if (s.learnerGender === val) opt.selected = true;
    genderSelect.append(opt);
  }
  genderSelect.addEventListener('change', () => {
    store.setSetting('learnerGender', genderSelect.value);
  });
  voicePanel.append(row('Learner is a…', genderSelect));
  voicePanel.append(
    el('div', { class: 'note' },
      'Hindi verbs change with the speaker in the present and future tenses, so '
      + '"I will eat" is कल मैं खाऊँगा for a boy and कल मैं खाऊँगी for a girl. '
      + 'This only affects sentences that say "I".'
    )
  );

  // Say plainly what happens offline. A cloud voice is the better-sounding
  // choice most of the time; the honest caveat is only what it degrades to.
  const netNotes = [
    ['English', 'en', sp.resolveVoice('en-US', s.englishVoice)],
    ['Hindi', 'hi', sp.resolveVoice('hi-IN', s.hindiVoice)]
  ]
    .filter(([, , v]) => v && !v.localService)
    .map(([label, prefix]) => {
      const local = sp.hasLocalVoice(prefix);
      return local
        ? `${label} uses a Google voice over the internet. Offline it falls back `
          + `to a voice installed on this device, which will sound plainer.`
        : `${label} uses a Google voice over the internet, and this device has no `
          + `${label} voice of its own - so ${label} is silent when offline. To fix `
          + `it, Windows: Settings → Time & language → Language & region → add the `
          + `language → Language options → install Speech. Android: Settings → `
          + `System → Languages → Text-to-speech output → install the voice data.`;
    });

  for (const note of netNotes) {
    voicePanel.append(el('div', { class: 'note' }, note));
  }

  wrap.append(el('h2', { text: 'Voice' }), voicePanel);

  // --- difficulty ---------------------------------------------------------
  const choiceSelect = el('select', {});
  for (const [val, label] of [['auto', 'Automatic'], ['2', '2 pictures'], ['3', '3 pictures'], ['4', '4 pictures']]) {
    const opt = el('option', { value: val, text: label });
    if (String(s.choices) === val) opt.selected = true;
    choiceSelect.append(opt);
  }
  choiceSelect.addEventListener('change', () => {
    const v = choiceSelect.value;
    store.setSetting('choices', v === 'auto' ? 'auto' : Number(v));
  });

  const moneySelect = el('select', {});
  for (const [val, label] of [['5', 'Up to ₹5'], ['10', 'Up to ₹10'], ['20', 'Up to ₹20'], ['50', 'Up to ₹50']]) {
    const opt = el('option', { value: val, text: label });
    if (String(s.moneyMax) === val) opt.selected = true;
    moneySelect.append(opt);
  }
  moneySelect.addEventListener('change', () => store.setSetting('moneyMax', Number(moneySelect.value)));

  wrap.append(
    el('h2', { text: 'Difficulty' }),
    el('div', { class: 'panel' },
      row('Answer choices', choiceSelect),
      row('Highest price in Money', moneySelect),
      row('Numbers in Listen', toggleBtn('numbersInQuiz')),
      el('div', { class: 'note' },
        'Automatic starts at 2 pictures and only widens to 3 or 4 once the learner ' +
        'is answering most questions correctly. Numbers are kept out of Listen by ' +
        'default - they are practised in Money and in Words instead, and left in ' +
        'they take up about a tenth of every session.'
      )
    )
  );

  // --- categories ---------------------------------------------------------
  const chips = el('div', { class: 'chips' });
  const active = enabledCats();
  for (const c of CATEGORIES) {
    const on = active.includes(c.id);
    const chip = el('button', { class: `chip ${on ? 'on' : ''}`, text: `${c.emoji} ${c.hi}` });
    chip.addEventListener('click', () => {
      const cur = new Set(enabledCats());
      if (cur.has(c.id)) cur.delete(c.id);
      else cur.add(c.id);
      if (cur.size === 0) return; // never leave the app with nothing to teach
      store.setSetting('categories', [...cur]);
      render();
    });
    chips.append(chip);
  }

  const missing = missingGlyphs(WORDS);
  if (missing.length) {
    wrap.append(
      el('h2', { text: 'Pictures this device cannot draw' }),
      el('div', { class: 'panel' },
        el('div', { class: 'note warn' },
          `${missing.length} word${missing.length === 1 ? '' : 's'} `
          + `(${missing.map((w) => w.en).join(', ')}) `
          + 'use a picture the emoji font on this device does not have, so they '
          + 'would appear as an empty box. They have been left out here. They '
          + 'will show up normally on a device with a newer emoji font, and '
          + 'either way it makes no difference to recorded progress.'
        )
      )
    );
  }

  wrap.append(
    el('h2', { text: 'Topics in use' }),
    el('div', { class: 'panel' }, chips,
      el('div', { class: 'note', style: 'margin-top:10px' },
        'Switched-off topics disappear from every mode. Starting with two or three ' +
        'topics usually works better than all of them.'
      )
    )
  );

  // --- progress -----------------------------------------------------------
  const seenWords = WORDS.concat(PHRASES).filter((w) => store.wordStat(w.id).seen > 0).length;
  const known = store.knownWords(WORDS).length;
  const acc = st.answers ? Math.round((st.correct / st.answers) * 100) : 0;

  const resetBtn = el('button', { class: 'btn danger', text: 'Reset all progress' });
  resetBtn.addEventListener('click', () => {
    if (!state.adminConfirmReset) {
      state.adminConfirmReset = true;
      resetBtn.textContent = 'Tap again to confirm';
      setTimeout(() => {
        state.adminConfirmReset = false;
        resetBtn.textContent = 'Reset all progress';
      }, 4000);
      return;
    }
    store.resetProgress();
    state.adminConfirmReset = false;
    render();
  });

  const reviewPool = WORDS.concat(PHRASES);
  const due = store.dueNow(reviewPool);

  const progressPanel = el('div', { class: 'panel' },
    row('Words and phrases seen', el('strong', { text: String(seenWords) })),
    row('Words learned', el('strong', { text: String(known) })),
    row('Waiting for review', el('strong', { text: String(due) })),
    row('Questions answered', el('strong', { text: String(st.answers) })),
    row('Correct overall', el('strong', { text: `${acc}%` })),
    row('Sessions', el('strong', { text: String(st.sessions) }))
  );

  const MODE_LABELS = {
    listen: 'Listen', read: 'Read', sentences: 'Sentences',
    tenses: 'Tenses (when?)', building: 'Building sentences',
    money: 'Money', notes: 'Rupee notes'
  };
  const perMode = Object.entries(MODE_LABELS)
    .map(([key, label]) => [label, (st.byMode || {})[key]])
    .filter(([, m]) => m && m.answers);

  if (perMode.length) {
    progressPanel.append(el('h2', { text: 'By section', style: 'margin:16px 0 2px' }));
    for (const [label, m] of perMode) {
      const pct = Math.round((m.correct / m.answers) * 100);
      progressPanel.append(
        row(label, el('strong', { text: `${pct}%  (${m.answers} answers)` }))
      );
    }
    progressPanel.append(
      el('div', { class: 'note', style: 'margin-top:10px' },
        'Every tap counts, so a question answered wrongly once and then correctly '
        + 'scores 50%. Consistently above about 90% in a section means it has '
        + 'stopped stretching them - raise the level, or the number of pictures.'
      )
    );
  }

  progressPanel.append(
    el('div', { class: 'note', style: 'margin-top:10px' },
      'Anything answered goes into a review schedule. Answered correctly, it '
      + 'comes back in a day, then three, then a week, then a fortnight; '
      + 'answered wrongly, it drops to the front and returns the same session. '
      + '"Waiting for review" is what has come round again and is being put '
      + 'first in every mode. It is normal for it to be zero right after a long '
      + 'session and to climb over the following days - that is the app keeping '
      + 'hold of what was learned rather than running out of new things to say.'
    )
  );

  progressPanel.append(el('div', { style: 'margin-top:14px' }, resetBtn));

  wrap.append(el('h2', { text: 'Progress' }), progressPanel);

  // --- how to get back here ----------------------------------------------
  wrap.append(
    el('h2', { text: 'Reaching this screen' }),
    el('div', { class: 'panel' },
      el('div', { class: 'note' },
        'From the home screen, tap the four corners in this order, within six seconds: ',
        el('strong', { text: 'top-left → bottom-right → top-right → bottom-left' }),
        '. Nothing on screen reacts until the full sequence is correct, so it ' +
        'cannot be stumbled into, and a half-finished attempt is invisible.'
      ),
      row('Show a reminder on the home screen', toggleBtn('showHint')),
      el('div', { class: 'note' },
        'The reminder is a small line of English at the foot of the home screen. '
        + 'It cannot be tapped, so it opens nothing and cannot interfere with the '
        + 'corner taps. Turn it off if the learner reads it and starts trying the '
        + 'corners, or once the code is remembered - but write it down somewhere '
        + 'first, because there is no other way in.'
      )
    ),
    el('div', { style: 'padding:18px 0 30px' },
      el('button', { class: 'btn', text: 'Back to the home screen', onclick: () => go('home') })
    )
  );

  return wrap;
}

function volumeSlider(key, preview) {
  const input = el('input', {
    type: 'range', min: '0.2', max: '1', step: '0.05',
    value: String(store.settings()[key])
  });
  input.addEventListener('change', () => {
    store.setSetting(key, Number(input.value));
    preview();
  });
  return input;
}

function toggleBtn(key) {
  const on = store.settings()[key];
  const btn = el('button', { class: `chip ${on ? 'on' : ''}`, text: on ? 'On' : 'Off' });
  btn.addEventListener('click', () => {
    store.setSetting(key, !store.settings()[key]);
    render();
  });
  return btn;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------
function render() {
  root.replaceChildren();
  let node;
  switch (state.screen) {
    case 'gate':    node = screenGate(); break;
    case 'home':    node = screenHome(); break;
    case 'cats':    node = screenCats(); break;
    case 'words':     node = screenCard('word'); break;
    case 'phrases':   node = screenCard('phrase'); break;
    case 'sentences':
      if (!state.sentQuiz) node = screenCard('sentence');
      else if (state.sentQuiz.kind === 'when') node = screenWhenQuiz();
      else if (state.sentQuiz.kind === 'order') node = screenOrderQuiz();
      else node = screenSentenceQuiz();
      break;
    case 'money':
      node = state.noteQ ? screenNoteQuiz() : screenMoney();
      break;
    case 'listen':  node = screenQuiz('listen'); break;
    case 'read':    node = screenQuiz('read'); break;
    case 'admin':   node = screenAdmin(); break;
    default:        node = screenHome();
  }
  root.append(node);
}

// ---------------------------------------------------------------------------
// Lockdown: no context menu, no accidental exit, screen stays awake
// ---------------------------------------------------------------------------
document.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('dragstart', (e) => e.preventDefault());

// Any tap that is not a corner abandons a half-typed caregiver code.
document.addEventListener('click', (e) => {
  if (!e.target.closest('.corner')) resetCode();
}, true);

// Android hardware back never leaves the app; it just returns to the home screen.
history.pushState({ app: true }, '');
window.addEventListener('popstate', () => {
  history.pushState({ app: true }, '');
  if (state.screen !== 'home' && state.screen !== 'gate') go('home');
});

let wakeLock = null;
async function requestWakeLock() {
  if (!('wakeLock' in navigator)) return;
  try {
    wakeLock = await navigator.wakeLock.request('screen');
  } catch (_) {
    /* not critical */
  }
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    if (state.screen !== 'gate') requestWakeLock();
  } else {
    sp.stop();
  }
});

// Voice lists arrive asynchronously; refresh the caregiver screen when they do.
sp.onVoicesChanged(() => {
  if (state.screen === 'admin') render();
});

// ?nosw skips offline caching. The service worker serves from cache first, so
// during development it happily hands back the previous version of a file you
// just edited; this is the way out without unregistering anything.
if ('serviceWorker' in navigator && !location.search.includes('nosw')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      /* offline support simply will not be available */
    });
  });
}

render();
