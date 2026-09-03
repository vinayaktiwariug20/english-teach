// Sentence generation.
//
// The goal is sentences, not words: "I ate an apple yesterday" should be as
// easy as its Hindi. Sentences are built from hand-written templates and
// grammar-tagged nouns rather than written out one by one, so a handful of
// templates covers a hundred-odd correct sentences, and they are correct by
// construction rather than by review.
//
// Hindi is why the tagging exists. A past-tense transitive sentence uses the
// ergative "ने", and the verb agrees with the GENDER and NUMBER of the object,
// not the speaker:
//
//     मैंने सेब खाया।    (सेब   masculine singular)
//     मैंने रोटी खाई।    (रोटी  feminine  singular)
//     मैंने अंगूर खाए।   (अंगूर masculine plural)
//
// So every noun below carries g (gender), n (number) and the English article,
// and every past-tense template carries all four verb forms. Get a gender wrong
// and the sentence is wrong, which is the one thing worth checking here.

// id -> { g: 'm'|'f', n: 'sg'|'pl', art: 'a'|'an'|'', use: [...] }
const NOUNS = {
  // ---- food: things you eat -------------------------------------------
  'food/apple':     { g: 'm', n: 'sg', art: 'an', use: ['eat', 'want', 'like', 'this'] },
  'food/banana':    { g: 'm', n: 'sg', art: 'a',  use: ['eat', 'want', 'like', 'this'] },
  'food/mango':     { g: 'm', n: 'sg', art: 'a',  use: ['eat', 'want', 'like', 'this'] },
  'food/orange':    { g: 'm', n: 'sg', art: 'an', use: ['eat', 'want', 'like', 'this'] },
  'food/grapes':    { g: 'm', n: 'pl', art: '',   use: ['eat', 'want', 'like', 'this'] },
  'food/rice':      { g: 'm', n: 'sg', art: '',   use: ['eat', 'want', 'like'] },
  'food/bread':     { g: 'f', n: 'sg', art: '',   use: ['eat', 'want', 'like'] },
  'food/egg':       { g: 'm', n: 'sg', art: 'an', use: ['eat', 'want', 'like', 'this'] },
  'food/potato':    { g: 'm', n: 'sg', art: 'a',  use: ['eat', 'want', 'like', 'this'] },
  'food/tomato':    { g: 'm', n: 'sg', art: 'a',  use: ['eat', 'want', 'like', 'this'] },
  'food/onion':     { g: 'm', n: 'sg', art: 'an', use: ['eat', 'want', 'like', 'this'] },
  'food/carrot':    { g: 'f', n: 'sg', art: 'a',  use: ['eat', 'want', 'like', 'this'] },
  'food/fish':      { g: 'f', n: 'sg', art: 'a',  use: ['eat', 'want', 'like', 'this'] },
  'food/biscuit':   { g: 'm', n: 'sg', art: 'a',  use: ['eat', 'want', 'like', 'this'] },
  'food/cake':      { g: 'm', n: 'sg', art: 'a',  use: ['eat', 'want', 'like', 'this'] },
  'food/ice cream': { g: 'f', n: 'sg', art: '',   use: ['eat', 'want', 'like'] },
  'food/honey':     { g: 'm', n: 'sg', art: '',   use: ['eat', 'want', 'like'] },
  'food/corn':      { g: 'm', n: 'sg', art: '',   use: ['eat', 'want', 'like'] },

  // ---- food: things you drink ------------------------------------------
  'food/milk':      { g: 'm', n: 'sg', art: '',   use: ['drink', 'want', 'like'] },
  'food/water':     { g: 'm', n: 'sg', art: '',   use: ['drink', 'want'] },
  'food/tea':       { g: 'f', n: 'sg', art: '',   use: ['drink', 'want', 'like'] },

  // ---- animals ----------------------------------------------------------
  'animals/dog':       { g: 'm', n: 'sg', art: 'a',  use: ['see', 'like', 'this'] },
  'animals/cat':       { g: 'f', n: 'sg', art: 'a',  use: ['see', 'like', 'this'] },
  'animals/cow':       { g: 'f', n: 'sg', art: 'a',  use: ['see', 'like', 'this'] },
  'animals/horse':     { g: 'm', n: 'sg', art: 'a',  use: ['see', 'like', 'this'] },
  'animals/elephant':  { g: 'm', n: 'sg', art: 'an', use: ['see', 'like', 'this'] },
  'animals/monkey':    { g: 'm', n: 'sg', art: 'a',  use: ['see', 'like', 'this'] },
  'animals/bird':      { g: 'f', n: 'sg', art: 'a',  use: ['see', 'like', 'this'] },
  'animals/lion':      { g: 'm', n: 'sg', art: 'a',  use: ['see', 'like', 'this'] },
  'animals/tiger':     { g: 'm', n: 'sg', art: 'a',  use: ['see', 'like', 'this'] },
  'animals/goat':      { g: 'f', n: 'sg', art: 'a',  use: ['see', 'like', 'this'] },
  'animals/mouse':     { g: 'm', n: 'sg', art: 'a',  use: ['see', 'like', 'this'] },
  'animals/snake':     { g: 'm', n: 'sg', art: 'a',  use: ['see', 'this'] },
  'animals/butterfly': { g: 'f', n: 'sg', art: 'a',  use: ['see', 'like', 'this'] },
  'animals/frog':      { g: 'm', n: 'sg', art: 'a',  use: ['see', 'this'] },
  'animals/rabbit':    { g: 'm', n: 'sg', art: 'a',  use: ['see', 'like', 'this'] },
  'animals/duck':      { g: 'f', n: 'sg', art: 'a',  use: ['see', 'like', 'this'] },
  'animals/sheep':     { g: 'f', n: 'sg', art: 'a',  use: ['see', 'like', 'this'] },
  'animals/hen':       { g: 'f', n: 'sg', art: 'a',  use: ['see', 'like', 'this'] },
  'animals/turtle':    { g: 'm', n: 'sg', art: 'a',  use: ['see', 'like', 'this'] },
  'animals/camel':     { g: 'm', n: 'sg', art: 'a',  use: ['see', 'like', 'this'] },

  // ---- things around the house -----------------------------------------
  'home/house':    { g: 'm', n: 'sg', art: 'a',  use: ['see', 'this'] },
  'home/door':     { g: 'm', n: 'sg', art: 'a',  use: ['see', 'this'] },
  'home/window':   { g: 'f', n: 'sg', art: 'a',  use: ['see', 'this'] },
  'home/bed':      { g: 'm', n: 'sg', art: 'a',  use: ['see', 'this'] },
  'home/chair':    { g: 'f', n: 'sg', art: 'a',  use: ['see', 'want', 'this'] },
  'home/key':      { g: 'f', n: 'sg', art: 'a',  use: ['see', 'want', 'this'] },
  'home/book':     { g: 'f', n: 'sg', art: 'a',  use: ['see', 'want', 'like', 'this'] },
  'home/pen':      { g: 'f', n: 'sg', art: 'a',  use: ['see', 'want', 'this'] },
  'home/bag':      { g: 'm', n: 'sg', art: 'a',  use: ['see', 'want', 'this'] },
  'home/phone':    { g: 'm', n: 'sg', art: 'a',  use: ['see', 'want', 'this'] },
  'home/ball':     { g: 'f', n: 'sg', art: 'a',  use: ['see', 'want', 'like', 'this'] },
  'home/umbrella': { g: 'm', n: 'sg', art: 'an', use: ['see', 'want', 'this'] },

  // ---- getting about -----------------------------------------------------
  'travel/car':     { g: 'f', n: 'sg', art: 'a', use: ['see', 'this'] },
  'travel/bus':     { g: 'f', n: 'sg', art: 'a', use: ['see', 'this'] },
  'travel/train':   { g: 'f', n: 'sg', art: 'a', use: ['see', 'this'] },
  'travel/bicycle': { g: 'f', n: 'sg', art: 'a', use: ['see', 'want', 'this'] },
  'travel/boat':    { g: 'f', n: 'sg', art: 'a', use: ['see', 'this'] },
  'travel/truck':   { g: 'm', n: 'sg', art: 'a', use: ['see', 'this'] }
};


// ---------------------------------------------------------------------------
// Verbs
//
// One entry per verb, holding every Hindi form the frames below need. The forms
// are stored rather than derived because Hindi perfectives are not regular
// enough to build from a root: खा -> खाया, but पी -> पिया and देख -> देखा.
//
//   perf   - perfective, used in the ergative past. Agrees with the OBJECT.
//   imperf - habitual ("eats"). Agrees with the SUBJECT.
//   prog   - continuous ("is eating"). Agrees with the SUBJECT.
//   fut1   - first-person future.  fut3 - third-person future. Both subject.
//
// `skip` lists frames whose English is unnatural for that verb - nobody says
// "I was seeing a dog".
// ---------------------------------------------------------------------------
const VERBS = {
  eat: {
    use: 'eat', icon: '🍽️', article: true,
    en: { base: 'eat', s: 'eats', past: 'ate', ing: 'eating' },
    hi: {
      perf: { 'm.sg': 'खाया', 'f.sg': 'खाई', 'm.pl': 'खाए', 'f.pl': 'खाईं' },
      imperf: { m: 'खाता', f: 'खाती' },
      prog: { m: 'खा रहा', f: 'खा रही' },
      fut1: { m: 'खाऊँगा', f: 'खाऊँगी' },
      fut3: { m: 'खाएगा', f: 'खाएगी' }
    }
  },
  drink: {
    use: 'drink', icon: '🥤', article: false,
    en: { base: 'drink', s: 'drinks', past: 'drank', ing: 'drinking' },
    hi: {
      perf: { 'm.sg': 'पिया', 'f.sg': 'पी', 'm.pl': 'पिए', 'f.pl': 'पीं' },
      imperf: { m: 'पीता', f: 'पीती' },
      prog: { m: 'पी रहा', f: 'पी रही' },
      fut1: { m: 'पिऊँगा', f: 'पिऊँगी' },
      fut3: { m: 'पिएगा', f: 'पिएगी' }
    }
  },
  see: {
    use: 'see', icon: '👀', article: true, skip: ['iProg', 'heProg'],
    en: { base: 'see', s: 'sees', past: 'saw', ing: 'seeing' },
    hi: {
      perf: { 'm.sg': 'देखा', 'f.sg': 'देखी', 'm.pl': 'देखे', 'f.pl': 'देखीं' },
      imperf: { m: 'देखता', f: 'देखती' },
      prog: { m: 'देख रहा', f: 'देख रही' },
      fut1: { m: 'देखूँगा', f: 'देखूँगी' },
      fut3: { m: 'देखेगा', f: 'देखेगी' }
    }
  }
};

// ---------------------------------------------------------------------------
// Tense frames, applied to every verb above.
//
// `mark` and `sub` build the picture: subject glyph, verb glyph, tense glyph.
// Three glyphs will not fit a choice tile on a narrow phone, so a frame that
// needs all three is shown on cards but marked `quiz: false` and left out of
// the recognition questions.
// ---------------------------------------------------------------------------
const FRAMES = [
  { id: 'iPast', mark: '⏪',
    en: (v, o) => `I ${v.en.past} ${o} yesterday.`,
    hi: (v, o, m) => `कल मैंने ${o} ${v.hi.perf[`${m.g}.${m.n}`]}।` },

  { id: 'iPresent', mark: '',
    en: (v, o) => `I ${v.en.base} ${o}.`,
    hi: (v, o, m, g) => `मैं ${o} ${v.hi.imperf[g]} हूँ।` },

  { id: 'iProg', mark: '▶️',
    en: (v, o) => `I am ${v.en.ing} ${o}.`,
    hi: (v, o, m, g) => `मैं ${o} ${v.hi.prog[g]} हूँ।` },

  { id: 'iFuture', mark: '⏩',
    en: (v, o) => `I will ${v.en.base} ${o} tomorrow.`,
    hi: (v, o, m, g) => `कल मैं ${o} ${v.hi.fut1[g]}।` },

  { id: 'iPastNeg', mark: '❌',
    en: (v, o) => `I did not ${v.en.base} ${o}.`,
    hi: (v, o, m) => `मैंने ${o} नहीं ${v.hi.perf[`${m.g}.${m.n}`]}।` },

  { id: 'hePast', sub: '👨', mark: '⏪', quiz: false,
    en: (v, o) => `He ${v.en.past} ${o} yesterday.`,
    hi: (v, o, m) => `कल उसने ${o} ${v.hi.perf[`${m.g}.${m.n}`]}।` },

  { id: 'hePresent', sub: '👨',
    en: (v, o) => `He ${v.en.s} ${o}.`,
    hi: (v, o) => `वह ${o} ${v.hi.imperf.m} है।` },

  { id: 'shePresent', sub: '👩',
    en: (v, o) => `She ${v.en.s} ${o}.`,
    hi: (v, o) => `वह ${o} ${v.hi.imperf.f} है।` },

  { id: 'heProg', sub: '👨', mark: '▶️', quiz: false,
    en: (v, o) => `He is ${v.en.ing} ${o}.`,
    hi: (v, o) => `वह ${o} ${v.hi.prog.m} है।` }
];

// Standalone sentences that are not built from a verb table.
const TEMPLATES = [
  { id: 'want', use: 'want', article: true, icon: '🤲',
    en: 'I want {obj}.', hi: 'मुझे {obj} चाहिए।' },
  { id: 'like', use: 'like', article: false, icon: '❤️',
    en: 'I like this {obj}.', hi: 'मुझे यह {obj} पसंद है।',
    enPl: 'I like these {obj}.', hiPl: 'मुझे ये {obj} पसंद हैं।' },
  { id: 'this', use: 'this', article: true, icon: '👉',
    en: 'This is {obj}.', hi: 'यह {obj} है।',
    enPl: 'These are {obj}.', hiPl: 'ये {obj} हैं।' }
];

function objectPhrase(word, meta, wantArticle) {
  return (wantArticle && meta.art ? `${meta.art} ` : '') + word.en;
}

/**
 * Build every sentence the verbs, frames, templates and tagged nouns allow.
 * `words` are the WORDS entries, so the Hindi noun and the picture come
 * straight from the vocabulary rather than being repeated here.
 */
export function buildSentences(words, { learnerGender = 'm' } = {}) {
  const byId = new Map(words.map((w) => [w.id, w]));
  const out = [];

  for (const [verbId, v] of Object.entries(VERBS)) {
    for (const frame of FRAMES) {
      if (v.skip && v.skip.includes(frame.id)) continue;

      for (const [nounId, meta] of Object.entries(NOUNS)) {
        if (!meta.use.includes(v.use)) continue;
        const w = byId.get(nounId);
        if (!w || !w.emoji) continue;

        out.push({
          id: `${frame.id}/${verbId}/${nounId}`,
          en: frame.en(v, objectPhrase(w, meta, v.article)),
          hi: frame.hi(v, w.hi, meta, learnerGender),
          word: w,
          template: `${frame.id}/${verbId}`,
          icon: (frame.sub || '') + v.icon + (frame.mark || ''),
          quizzable: frame.quiz !== false
        });
      }
    }
  }

  for (const t of TEMPLATES) {
    for (const [nounId, meta] of Object.entries(NOUNS)) {
      if (!meta.use.includes(t.use)) continue;
      const w = byId.get(nounId);
      if (!w || !w.emoji) continue;

      const plural = meta.n === 'pl';
      const enTpl = plural && t.enPl ? t.enPl : t.en;
      const hiTpl = plural && t.hiPl ? t.hiPl : t.hi;

      out.push({
        id: `${t.id}/${nounId}`,
        en: enTpl.replace('{obj}', objectPhrase(w, meta, t.article)),
        hi: hiTpl.replace('{obj}', w.hi),
        word: w,
        template: t.id,
        icon: t.icon,
        quizzable: true
      });
    }
  }

  return out;
}

export const FRAME_COUNT = FRAMES.length;
export const VERB_COUNT = Object.keys(VERBS).length;
export const TEMPLATE_COUNT = TEMPLATES.length;
export const TAGGED_NOUN_COUNT = Object.keys(NOUNS).length;
