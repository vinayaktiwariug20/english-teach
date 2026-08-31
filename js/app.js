import { CATEGORIES, WORDS, PHRASES, READING_WORDS } from './data.js';
import { buildSentences } from './sentences.js';
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

function activeWords() {
  const cats = enabledCats();
  const pool = WORDS.filter((w) => cats.includes(w.cat));
  return pool.length >= 4 ? pool : WORDS;
}

function readingPool() {
  const cats = enabledCats();
  const pool = READING_WORDS.filter((w) => cats.includes(w.cat));
  return pool.length >= 4 ? pool : READING_WORDS;
}

function visualKey(w) {
  return w.emoji || w.swatch || `#${w.num}`;
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Build a question: one target plus distractors that never look alike. */
function buildQuestion(pool) {
  const target = store.chooseTarget(pool, state.recent);
  const n = Math.min(store.choiceCount(), pool.length);

  const used = new Set([visualKey(target)]);
  const distractors = [];
  // Prefer same-category distractors once the learner is doing well; they make
  // the choice a real discrimination rather than a guess.
  const sameCat = shuffle(pool.filter((w) => w.cat === target.cat && w.id !== target.id));
  const others = shuffle(pool.filter((w) => w.cat !== target.cat));
  const order = n >= 3 ? [...sameCat, ...others] : [...others, ...sameCat];

  for (const w of order) {
    if (distractors.length >= n - 1) break;
    const key = visualKey(w);
    if (used.has(key)) continue;
    used.add(key);
    distractors.push(w);
  }

  state.target = target;
  state.choices = shuffle([target, ...distractors]);
  state.recent = [target.id, ...state.recent].slice(0, 6);
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
  { id: 'sentences', cls: 't-sentences', icon: '🗣️', hi: 'वाक्य', en: 'Sentences' }
];

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

function startWords(catId) {
  const deck = shuffle(WORDS.filter((w) => w.cat === catId));
  go('words', { cat: catId, deck, deckIndex: 0 });
}

function startPhrases() {
  go('phrases', { deck: shuffle(PHRASES), deckIndex: 0 });
}

function startSentences() {
  const deck = shuffle(
    buildSentences(activeWords(), { learnerGender: store.settings().learnerGender })
  );
  go('sentences', { deck, deckIndex: 0, sentSeen: [], sentQuiz: null });
}

/** A sentence shown as pictures: the verb, then what it acts on. */
function sentencePicture(s, size = 'ico') {
  return el('div', { class: 'sent-pic' },
    el('span', { class: `emoji ${size === 'ico' ? 'ico' : 'pic'} verb`, text: s.icon }),
    pictureNode(s.word, size)
  );
}

/**
 * Every fourth card, test what was just shown. Retrieval right after exposure
 * is what turns a sentence he can repeat into one he recognises.
 */
function buildSentenceQuiz() {
  const recent = state.sentSeen.slice(-4);
  const target = recent[Math.floor(Math.random() * recent.length)];
  const n = Math.min(store.choiceCount(), 3);

  const seenKeys = new Set([`${target.icon}|${visualKey(target.word)}`]);
  const picks = [];
  // Distractors from the same recent batch first, so the choice is between
  // sentences he has actually just met. Sharing a noun with a different verb
  // is the most useful contrast, so those are not filtered out.
  for (const s of shuffle(recent).concat(shuffle(state.deck))) {
    if (picks.length >= n - 1) break;
    const key = `${s.icon}|${visualKey(s.word)}`;
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);
    picks.push(s);
  }
  state.sentQuiz = { target, choices: shuffle([target, ...picks]) };
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
        store.noteAnswer(target.id, true);
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
        store.noteAnswer(target.id, false);
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
  const item = state.deck[state.deckIndex];
  if (!item) return screenHome();

  store.noteSeen(item.id);

  const card = el('div', {
    class: 'card',
    onclick: () => sayEn(item.en)
  },
    kind === 'sentence' ? sentencePicture(item, 'pic') : pictureNode(item, 'pic'),
    el('div', { class: `word-en ${isLong ? 'phrase' : ''}`, text: item.en }),
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
    el('button', { class: 'act act-hear', onclick: () => sayEn(item.en) },
      el('span', { class: 'ico emoji', text: '🔊' })
    ),
    el('button', { class: 'act act-hindi', onclick: () => sayHi(item.hi) }, 'हिंदी'),
    el('button', {
      class: 'act act-next',
      onclick: () => {
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
    setTimeout(() => sayEn(item.en), 320);
  }

  return el('div', { class: 'screen' }, topBar({ withStars: false }), card, actions);
}

// --- quiz modes (Listen, Read) --------------------------------------------

function startQuiz(mode) {
  const pool = mode === 'read' ? readingPool() : activeWords();
  state.recent = [];
  buildQuestion(pool);
  go(mode);
}

function nextQuestion(mode) {
  // Releasing the lock here is essential: it is taken when a correct answer is
  // tapped, and only go() clears it. Advancing to the next question goes
  // straight to render(), so without this the very next tap is swallowed and
  // the quiz appears to freeze after one answer.
  state.locked = false;
  buildQuestion(mode === 'read' ? readingPool() : activeWords());
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
        store.noteAnswer(target.id, true);
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
        store.noteAnswer(target.id, false);
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

  wrap.append(
    el('h2', { text: 'Difficulty' }),
    el('div', { class: 'panel' },
      row('Answer choices', choiceSelect),
      el('div', { class: 'note' },
        'Automatic starts at 2 pictures and only widens to 3 or 4 once the learner ' +
        'is answering most questions correctly.'
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

  wrap.append(
    el('h2', { text: 'Progress' }),
    el('div', { class: 'panel' },
      row('Words and phrases seen', el('strong', { text: String(seenWords) })),
      row('Words learned', el('strong', { text: String(known) })),
      row('Questions answered', el('strong', { text: String(st.answers) })),
      row('Correct', el('strong', { text: `${acc}%` })),
      row('Sessions', el('strong', { text: String(st.sessions) })),
      el('div', { style: 'margin-top:14px' }, resetBtn)
    )
  );

  // --- how to get back here ----------------------------------------------
  wrap.append(
    el('h2', { text: 'Reaching this screen' }),
    el('div', { class: 'panel' },
      el('div', { class: 'note' },
        'From the home screen, tap the four corners in this order, within six seconds: ',
        el('strong', { text: 'top-left → bottom-right → top-right → bottom-left' }),
        '. Nothing on screen reacts until the full sequence is correct, so it ' +
        'cannot be stumbled into, and a half-finished attempt is invisible.'
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
      node = state.sentQuiz ? screenSentenceQuiz() : screenCard('sentence');
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
