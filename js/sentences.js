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

// Templates carry an `icon` for the verb, so a sentence can be shown as a
// picture pair (verb + object) and recognised without reading. Icons may be two
// emoji where one cannot carry it - 👨👀 for "he saw", 🍽️⏩ for "will eat". They
// must never be emoji that are really letters: 🔜 renders as a box reading
// "SOON", which is unreadable to a learner who cannot read yet.
//
// `agree` says what the Hindi verb agrees with, and this is not a detail:
//   - 'object'  - ergative past (मैंने/उसने ... खाया). Agrees with the OBJECT,
//                 so "He ate" and "She ate" are the same sentence in Hindi.
//   - 'subject' - future and present (मैं ... खाऊँगा / वह ... खाती है). Agrees
//                 with the SUBJECT, which for "I" means the learner's own
//                 gender - hence the setting on the caregiver screen.
//
// Note कल is both "yesterday" and "tomorrow"; the verb tense is what separates
// them. That is real Hindi, and worth meeting early.
const TEMPLATES = [
  {
    id: 'ate', use: 'eat', article: true, icon: '🍽️', agree: 'object',
    en: 'I ate {obj} yesterday.',
    hi: 'कल मैंने {obj} {v}।',
    v: { 'm.sg': 'खाया', 'f.sg': 'खाई', 'm.pl': 'खाए', 'f.pl': 'खाईं' }
  },
  {
    id: 'drank', use: 'drink', article: false, icon: '🥤', agree: 'object',
    en: 'I drank {obj} yesterday.',
    hi: 'कल मैंने {obj} {v}।',
    v: { 'm.sg': 'पिया', 'f.sg': 'पी', 'm.pl': 'पिए', 'f.pl': 'पीं' }
  },
  {
    id: 'saw', use: 'see', article: true, icon: '👀', agree: 'object',
    en: 'I saw {obj} yesterday.',
    hi: 'कल मैंने {obj} {v}।',
    v: { 'm.sg': 'देखा', 'f.sg': 'देखी', 'm.pl': 'देखे', 'f.pl': 'देखीं' }
  },
  {
    id: 'heSaw', use: 'see', article: true, icon: '👨👀', agree: 'object',
    en: 'He saw {obj} yesterday.',
    hi: 'कल उसने {obj} {v}।',
    v: { 'm.sg': 'देखा', 'f.sg': 'देखी', 'm.pl': 'देखे', 'f.pl': 'देखीं' }
  },
  {
    id: 'willEat', use: 'eat', article: true, icon: '🍽️⏩', agree: 'subject', subject: 'learner',
    en: 'I will eat {obj} tomorrow.',
    hi: 'कल मैं {obj} {v}।',
    v: { 'm.sg': 'खाऊँगा', 'f.sg': 'खाऊँगी' }
  },
  {
    id: 'willDrink', use: 'drink', article: false, icon: '🥤⏩', agree: 'subject', subject: 'learner',
    en: 'I will drink {obj} tomorrow.',
    hi: 'कल मैं {obj} {v}।',
    v: { 'm.sg': 'पिऊँगा', 'f.sg': 'पिऊँगी' }
  },
  {
    id: 'eating', use: 'eat', article: true, icon: '😋', agree: 'subject', subject: 'learner',
    en: 'I am eating {obj}.',
    hi: 'मैं {obj} {v}।',
    v: { 'm.sg': 'खा रहा हूँ', 'f.sg': 'खा रही हूँ' }
  },
  {
    id: 'heEats', use: 'eat', article: true, icon: '👨🍽️', agree: 'subject', subject: 'm',
    en: 'He eats {obj}.',
    hi: 'वह {obj} {v}।',
    v: { 'm.sg': 'खाता है' }
  },
  {
    id: 'sheEats', use: 'eat', article: true, icon: '👩🍽️', agree: 'subject', subject: 'f',
    en: 'She eats {obj}.',
    hi: 'वह {obj} {v}।',
    v: { 'f.sg': 'खाती है' }
  },
  {
    id: 'want', use: 'want', article: true, icon: '🤲',
    en: 'I want {obj}.',
    hi: 'मुझे {obj} चाहिए।'
  },
  {
    // "I like a book" is wrong and "I like books" would need plural forms for
    // every noun; "I like this book" is correct for countable and uncountable
    // alike, and so is its Hindi.
    id: 'like', use: 'like', article: false, icon: '❤️',
    en: 'I like this {obj}.',
    hi: 'मुझे यह {obj} पसंद है।',
    enPl: 'I like these {obj}.',
    hiPl: 'मुझे ये {obj} पसंद हैं।'
  },
  {
    id: 'this', use: 'this', article: true, icon: '👉',
    en: 'This is {obj}.',
    hi: 'यह {obj} है।',
    enPl: 'These are {obj}.',
    hiPl: 'ये {obj} हैं।'
  }
];

/**
 * Build every sentence the templates and tagged nouns allow.
 * `words` are the WORDS entries, so the Hindi noun and the picture come
 * straight from the vocabulary rather than being repeated here.
 */
export function buildSentences(words, { learnerGender = 'm' } = {}) {
  const byId = new Map(words.map((w) => [w.id, w]));
  const out = [];

  for (const t of TEMPLATES) {
    for (const [id, meta] of Object.entries(NOUNS)) {
      if (!meta.use.includes(t.use)) continue;
      const w = byId.get(id);
      if (!w || !w.emoji) continue;

      const plural = meta.n === 'pl';
      const enTpl = plural && t.enPl ? t.enPl : t.en;
      const hiTpl = plural && t.hiPl ? t.hiPl : t.hi;

      const article = t.article && meta.art ? `${meta.art} ` : '';
      const en = enTpl.replace('{obj}', article + w.en);
      // Ergative past agrees with the object; future and present agree with
      // the subject, which for "I" is the learner.
      const subject = t.subject === 'learner' ? learnerGender : t.subject;
      const key = t.agree === 'subject' ? `${subject}.sg` : `${meta.g}.${meta.n}`;
      const verb = t.v ? t.v[key] : '';
      if (t.v && !verb) continue; // no form for this combination: skip it

      const hi = hiTpl.replace('{obj}', w.hi).replace('{v}', verb);

      out.push({
        id: `${t.id}/${id}`, en, hi, word: w, template: t.id, icon: t.icon
      });
    }
  }
  return out;
}

export const TEMPLATE_COUNT = TEMPLATES.length;
export const TAGGED_NOUN_COUNT = Object.keys(NOUNS).length;
