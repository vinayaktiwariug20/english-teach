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
  'food/apple':     { g: 'm', n: 'sg', art: 'an', use: ['eat', 'want', 'like', 'this', 'buy'] },
  'food/banana':    { g: 'm', n: 'sg', art: 'a',  use: ['eat', 'want', 'like', 'this', 'buy'] },
  'food/mango':     { g: 'm', n: 'sg', art: 'a',  use: ['eat', 'want', 'like', 'this', 'buy'] },
  'food/orange':    { g: 'm', n: 'sg', art: 'an', use: ['eat', 'want', 'like', 'this', 'buy'] },
  'food/grapes':    { g: 'm', n: 'pl', art: '',   use: ['eat', 'want', 'like', 'this', 'buy'] },
  'food/rice':      { g: 'm', n: 'sg', art: '',   use: ['eat', 'want', 'like', 'buy'] },
  'food/bread':     { g: 'f', n: 'sg', art: '',   use: ['eat', 'want', 'like', 'buy'] },
  'food/egg':       { g: 'm', n: 'sg', art: 'an', use: ['eat', 'want', 'like', 'this', 'buy'] },
  'food/potato':    { g: 'm', n: 'sg', art: 'a',  use: ['eat', 'want', 'like', 'this', 'buy'] },
  'food/tomato':    { g: 'm', n: 'sg', art: 'a',  use: ['eat', 'want', 'like', 'this', 'buy'] },
  'food/onion':     { g: 'm', n: 'sg', art: 'an', use: ['eat', 'want', 'like', 'this', 'buy'] },
  'food/carrot':    { g: 'f', n: 'sg', art: 'a',  use: ['eat', 'want', 'like', 'this', 'buy'] },
  'food/fish':      { g: 'f', n: 'sg', art: 'a',  use: ['eat', 'want', 'like', 'this', 'buy'] },
  'food/biscuit':   { g: 'm', n: 'sg', art: 'a',  use: ['eat', 'want', 'like', 'this', 'buy'] },
  'food/cake':      { g: 'm', n: 'sg', art: 'a',  use: ['eat', 'want', 'like', 'this', 'buy'] },
  'food/ice cream': { g: 'f', n: 'sg', art: '',   use: ['eat', 'want', 'like', 'buy'] },
  'food/honey':     { g: 'm', n: 'sg', art: '',   use: ['eat', 'want', 'like', 'buy'] },
  'food/corn':      { g: 'm', n: 'sg', art: '',   use: ['eat', 'want', 'like', 'buy'] },

  // ---- food: things you drink ------------------------------------------
  'food/milk':      { g: 'm', n: 'sg', art: '',   use: ['drink', 'want', 'like', 'buy'] },
  'food/water':     { g: 'm', n: 'sg', art: '',   use: ['drink', 'want', 'buy'] },
  'food/tea':       { g: 'f', n: 'sg', art: '',   use: ['drink', 'want', 'like', 'buy'] },

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
  'home/door':     { g: 'm', n: 'sg', art: 'a',  use: ['see', 'this', 'open', 'close'] },
  'home/window':   { g: 'f', n: 'sg', art: 'a',  use: ['see', 'this', 'open', 'close'] },
  'home/bed':      { g: 'm', n: 'sg', art: 'a',  use: ['see', 'this'] },
  'home/chair':    { g: 'f', n: 'sg', art: 'a',  use: ['see', 'want', 'this', 'buy'] },
  'home/key':      { g: 'f', n: 'sg', art: 'a',  use: ['see', 'want', 'this', 'buy'] },
  'home/book':     { g: 'f', n: 'sg', art: 'a',  use: ['see', 'want', 'like', 'this', 'buy', 'open', 'close'] },
  'home/pen':      { g: 'f', n: 'sg', art: 'a',  use: ['see', 'want', 'this', 'buy'] },
  'home/bag':      { g: 'm', n: 'sg', art: 'a',  use: ['see', 'want', 'this', 'wash', 'buy', 'open', 'close'] },
  'home/phone':    { g: 'm', n: 'sg', art: 'a',  use: ['see', 'want', 'this', 'buy', 'wash'] },
  'home/ball':     { g: 'f', n: 'sg', art: 'a',  use: ['see', 'want', 'like', 'this', 'wash', 'buy'] },
  'home/umbrella': { g: 'm', n: 'sg', art: 'an', use: ['see', 'want', 'this', 'buy', 'open', 'close'] },
  'home/plate':      { g: 'f', n: 'sg', art: 'a', use: ['see', 'this', 'wash', 'buy'] },
  'home/cup':        { g: 'm', n: 'sg', art: 'a', use: ['see', 'this', 'wash', 'buy'] },
  'home/spoon':      { g: 'm', n: 'sg', art: 'a', use: ['see', 'this', 'wash', 'buy'] },
  'home/knife':      { g: 'm', n: 'sg', art: 'a', use: ['see', 'this', 'wash', 'buy'] },
  'home/box':        { g: 'm', n: 'sg', art: 'a', use: ['see', 'this', 'open', 'close', 'buy'] },
  'home/bucket':     { g: 'f', n: 'sg', art: 'a', use: ['see', 'this', 'wash', 'buy'] },
  'home/soap':       { g: 'm', n: 'sg', art: '',  use: ['see', 'this', 'buy'] },
  'home/toothbrush': { g: 'm', n: 'sg', art: 'a', use: ['see', 'this', 'wash', 'buy'] },
  'home/clock':      { g: 'f', n: 'sg', art: 'a', use: ['see', 'this', 'buy'] },
  'home/mirror':     { g: 'm', n: 'sg', art: 'a', use: ['see', 'this', 'wash', 'buy'] },
  'home/scissors':   { g: 'f', n: 'sg', enN: 'pl', art: '', use: ['see', 'this', 'buy'] },
  'home/candle':     { g: 'f', n: 'sg', art: 'a', use: ['see', 'this', 'buy'] },

  // ---- clothes. `enN` is English number, kept apart from `n` because they
  // disagree: "pants" is plural in English but पैंट is feminine singular in
  // Hindi, so the article and the verb ending need different answers. -------
  'clothes/shirt':   { g: 'f', n: 'sg', art: 'a',  use: ['wear', 'wash', 'buy', 'this'] },
  'clothes/pants':   { g: 'f', n: 'sg', enN: 'pl', art: '', use: ['wear', 'wash', 'buy', 'this'] },
  'clothes/shoes':   { g: 'm', n: 'pl', art: '',  use: ['wear', 'wash', 'buy', 'this'] },
  'clothes/socks':   { g: 'm', n: 'pl', art: '',  use: ['wear', 'wash', 'buy', 'this'] },
  'clothes/cap':     { g: 'f', n: 'sg', art: 'a', use: ['wear', 'wash', 'buy', 'this'] },
  'clothes/dress':   { g: 'f', n: 'sg', art: 'a', use: ['wear', 'wash', 'buy', 'this'] },
  'clothes/glasses': { g: 'm', n: 'sg', enN: 'pl', art: '', use: ['wear', 'buy', 'this'] },
  'clothes/watch':   { g: 'f', n: 'sg', art: 'a', use: ['wear', 'buy', 'this'] },
  'clothes/coat':    { g: 'm', n: 'sg', art: 'a', use: ['wear', 'wash', 'buy', 'this'] },
  'clothes/gloves':  { g: 'm', n: 'pl', art: '', use: ['wear', 'wash', 'buy', 'this'] },
  'clothes/ring':    { g: 'f', n: 'sg', art: 'a', use: ['wear', 'buy', 'this'] },
  'clothes/sari':    { g: 'f', n: 'sg', art: 'a', use: ['wear', 'wash', 'buy', 'this'] },

  // ---- places. `to` is the English destination phrase, because English is
  // inconsistent about it: "to school" but "to the market". -----------------
  'places/school':   { g: 'm', n: 'sg', art: 'a', to: 'to school',       use: ['see', 'this', 'go'] },
  'places/market':   { g: 'm', n: 'sg', art: 'a', to: 'to the market',   use: ['see', 'this', 'go'] },
  'places/shop':     { g: 'f', n: 'sg', art: 'a', to: 'to the shop',     use: ['see', 'this', 'go'] },
  'places/hospital': { g: 'm', n: 'sg', art: 'a', to: 'to the hospital', use: ['see', 'this', 'go'] },
  'places/temple':   { g: 'm', n: 'sg', art: 'a', to: 'to the temple',   use: ['see', 'this', 'go'] },
  'places/park':     { g: 'm', n: 'sg', art: 'a', to: 'to the park',     use: ['see', 'this', 'go'] },
  'places/station':  { g: 'm', n: 'sg', art: 'a', to: 'to the station',  use: ['see', 'this', 'go'] },
  'places/office':   { g: 'm', n: 'sg', art: 'a', to: 'to the office',   use: ['see', 'this', 'go'] },

  // ---- getting about -----------------------------------------------------
  'travel/car':     { g: 'f', n: 'sg', art: 'a', use: ['see', 'this', 'wash', 'buy'] },
  'travel/bus':     { g: 'f', n: 'sg', art: 'a', use: ['see', 'this'] },
  'travel/train':   { g: 'f', n: 'sg', art: 'a', use: ['see', 'this'] },
  'travel/bicycle': { g: 'f', n: 'sg', art: 'a', use: ['see', 'want', 'this', 'wash', 'buy'] },
  'travel/boat':    { g: 'f', n: 'sg', art: 'a', use: ['see', 'this'] },
  'travel/truck':   { g: 'm', n: 'sg', art: 'a', use: ['see', 'this', 'wash'] }
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
    level: 2, use: 'eat', icon: '🍽️', article: true,
    en: { base: 'eat', s: 'eats', past: 'ate', ing: 'eating' },
    hi: {
      perf: { 'm.sg': 'खाया', 'f.sg': 'खाई', 'm.pl': 'खाए', 'f.pl': 'खाईं' },
      imperf: { m: 'खाता', f: 'खाती' },
      prog: { m: 'खा रहा', f: 'खा रही' },
      fut1: { m: 'खाऊँगा', f: 'खाऊँगी' },
      fut2: { m: 'खाओगे', f: 'खाओगी' },
      fut3: { m: 'खाएगा', f: 'खाएगी' }
    }
  },
  drink: {
    level: 2, use: 'drink', icon: '🥤', article: false,
    en: { base: 'drink', s: 'drinks', past: 'drank', ing: 'drinking' },
    hi: {
      perf: { 'm.sg': 'पिया', 'f.sg': 'पी', 'm.pl': 'पिए', 'f.pl': 'पीं' },
      imperf: { m: 'पीता', f: 'पीती' },
      prog: { m: 'पी रहा', f: 'पी रही' },
      fut1: { m: 'पिऊँगा', f: 'पिऊँगी' },
      fut2: { m: 'पिओगे', f: 'पिओगी' },
      fut3: { m: 'पिएगा', f: 'पिएगी' }
    }
  },
  see: {
    level: 2, use: 'see', icon: '👀', article: true, skip: ['iProg', 'heProg'],
    en: { base: 'see', s: 'sees', past: 'saw', ing: 'seeing' },
    hi: {
      perf: { 'm.sg': 'देखा', 'f.sg': 'देखी', 'm.pl': 'देखे', 'f.pl': 'देखीं' },
      imperf: { m: 'देखता', f: 'देखती' },
      prog: { m: 'देख रहा', f: 'देख रही' },
      fut1: { m: 'देखूँगा', f: 'देखूँगी' },
      fut2: { m: 'देखोगे', f: 'देखोगी' },
      fut3: { m: 'देखेगा', f: 'देखेगी' }
    }
  },
  wear: {
    level: 3, use: 'wear', icon: '👕', article: true,
    en: { base: 'wear', s: 'wears', past: 'wore', ing: 'wearing' },
    hi: {
      perf: { 'm.sg': 'पहना', 'f.sg': 'पहनी', 'm.pl': 'पहने', 'f.pl': 'पहनीं' },
      imperf: { m: 'पहनता', f: 'पहनती' },
      prog: { m: 'पहन रहा', f: 'पहन रही' },
      fut1: { m: 'पहनूँगा', f: 'पहनूँगी' },
      fut2: { m: 'पहनोगे', f: 'पहनोगी' },
      fut3: { m: 'पहनेगा', f: 'पहनेगी' }
    }
  },
  wash: {
    level: 3, use: 'wash', icon: '🧼', article: true,
    en: { base: 'wash', s: 'washes', past: 'washed', ing: 'washing' },
    hi: {
      perf: { 'm.sg': 'धोया', 'f.sg': 'धोई', 'm.pl': 'धोए', 'f.pl': 'धोईं' },
      imperf: { m: 'धोता', f: 'धोती' },
      prog: { m: 'धो रहा', f: 'धो रही' },
      fut1: { m: 'धोऊँगा', f: 'धोऊँगी' },
      fut2: { m: 'धोओगे', f: 'धोओगी' },
      fut3: { m: 'धोएगा', f: 'धोएगी' }
    }
  },
  buy: {
    level: 3, use: 'buy', icon: '💵', article: true,
    en: { base: 'buy', s: 'buys', past: 'bought', ing: 'buying' },
    hi: {
      perf: { 'm.sg': 'खरीदा', 'f.sg': 'खरीदी', 'm.pl': 'खरीदे', 'f.pl': 'खरीदीं' },
      imperf: { m: 'खरीदता', f: 'खरीदती' },
      prog: { m: 'खरीद रहा', f: 'खरीद रही' },
      fut1: { m: 'खरीदूँगा', f: 'खरीदूँगी' },
      fut2: { m: 'खरीदोगे', f: 'खरीदोगी' },
      fut3: { m: 'खरीदेगा', f: 'खरीदेगी' }
    }
  },
  open: {
    level: 3, use: 'open', icon: '🔓', article: true,
    en: { base: 'open', s: 'opens', past: 'opened', ing: 'opening' },
    hi: {
      perf: { 'm.sg': 'खोला', 'f.sg': 'खोली', 'm.pl': 'खोले', 'f.pl': 'खोलीं' },
      imperf: { m: 'खोलता', f: 'खोलती' },
      prog: { m: 'खोल रहा', f: 'खोल रही' },
      fut1: { m: 'खोलूँगा', f: 'खोलूँगी' },
      fut2: { m: 'खोलोगे', f: 'खोलोगी' },
      fut3: { m: 'खोलेगा', f: 'खोलेगी' }
    }
  },
  close: {
    // बंद करना is a compound: the करना half carries all the inflection.
    level: 3, use: 'close', icon: '🔒', article: true,
    en: { base: 'close', s: 'closes', past: 'closed', ing: 'closing' },
    hi: {
      perf: { 'm.sg': 'बंद किया', 'f.sg': 'बंद की', 'm.pl': 'बंद किए', 'f.pl': 'बंद कीं' },
      imperf: { m: 'बंद करता', f: 'बंद करती' },
      prog: { m: 'बंद कर रहा', f: 'बंद कर रही' },
      fut1: { m: 'बंद करूँगा', f: 'बंद करूँगी' },
      fut2: { m: 'बंद करोगे', f: 'बंद करोगी' },
      fut3: { m: 'बंद करेगा', f: 'बंद करेगी' }
    }
  }
};

// ---------------------------------------------------------------------------
// Intransitive verbs of motion. These take a destination rather than an object,
// and - crucially - their perfective agrees with the SUBJECT, because there is
// no object and so no ergative ने: मैं बाज़ार गया, not मैंने.
// ---------------------------------------------------------------------------
const MOTION = {
  go: {
    icon: '🚶', en: { base: 'go', s: 'goes', past: 'went', ing: 'going' },
    hi: {
      perfS: { m: 'गया', f: 'गई' },
      perfS2: { m: 'गए', f: 'गईं' },
      imperf: { m: 'जाता', f: 'जाती' },
      prog: { m: 'जा रहा', f: 'जा रही' },
      fut1: { m: 'जाऊँगा', f: 'जाऊँगी' },
      fut2: { m: 'जाओगे', f: 'जाओगी' },
      fut3: { m: 'जाएगा', f: 'जाएगी' }
    }
  },
  come: {
    icon: '🏃', en: { base: 'come', s: 'comes', past: 'came', ing: 'coming' },
    hi: {
      perfS: { m: 'आया', f: 'आई' },
      perfS2: { m: 'आए', f: 'आईं' },
      imperf: { m: 'आता', f: 'आती' },
      prog: { m: 'आ रहा', f: 'आ रही' },
      fut1: { m: 'आऊँगा', f: 'आऊँगी' },
      fut2: { m: 'आओगे', f: 'आओगी' },
      fut3: { m: 'आएगा', f: 'आएगी' }
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
  { id: 'iPast', level: 2, mark: '⏪',
    en: (v, o) => `I ${v.en.past} ${o} yesterday.`,
    hi: (v, o, m) => `कल मैंने ${o} ${v.hi.perf[`${m.g}.${m.n}`]}।` },

  { id: 'iPresent', level: 2, mark: '',
    en: (v, o) => `I ${v.en.base} ${o}.`,
    hi: (v, o, m, g) => `मैं ${o} ${v.hi.imperf[g]} हूँ।` },

  { id: 'iProg', level: 3, mark: '▶️',
    en: (v, o) => `I am ${v.en.ing} ${o}.`,
    hi: (v, o, m, g) => `मैं ${o} ${v.hi.prog[g]} हूँ।` },

  { id: 'iFuture', level: 3, mark: '⏩',
    en: (v, o) => `I will ${v.en.base} ${o} tomorrow.`,
    hi: (v, o, m, g) => `कल मैं ${o} ${v.hi.fut1[g]}।` },

  { id: 'iPastNeg', level: 4, mark: '❌',
    en: (v, o) => `I did not ${v.en.base} ${o}.`,
    hi: (v, o, m) => `मैंने ${o} नहीं ${v.hi.perf[`${m.g}.${m.n}`]}।` },

  { id: 'hePast', level: 4, sub: '👨', mark: '⏪', quiz: false,
    en: (v, o) => `He ${v.en.past} ${o} yesterday.`,
    hi: (v, o, m) => `कल उसने ${o} ${v.hi.perf[`${m.g}.${m.n}`]}।` },

  { id: 'hePresent', level: 4, sub: '👨',
    en: (v, o) => `He ${v.en.s} ${o}.`,
    hi: (v, o) => `वह ${o} ${v.hi.imperf.m} है।` },

  { id: 'shePresent', level: 4, sub: '👩',
    en: (v, o) => `She ${v.en.s} ${o}.`,
    hi: (v, o) => `वह ${o} ${v.hi.imperf.f} है।` },

  { id: 'heProg', level: 4, sub: '👨', mark: '▶️', quiz: false,
    en: (v, o) => `He is ${v.en.ing} ${o}.`,
    hi: (v, o) => `वह ${o} ${v.hi.prog.m} है।` },

  // Questions are addressed to "you". The past question is the safest one to
  // teach first: तुमने takes the ergative, so the verb agrees with the object
  // and the listener's own gender never enters into it.
  { id: 'youPastQ', level: 5, mark: '❓',
    en: (v, o) => `Did you ${v.en.base} ${o}?`,
    hi: (v, o, m) => `क्या तुमने ${o} ${v.hi.perf[`${m.g}.${m.n}`]}?` },

  { id: 'youFutureQ', level: 5, mark: '⏩❓', quiz: false,
    en: (v, o) => `Will you ${v.en.base} ${o} tomorrow?`,
    hi: (v, o) => `क्या तुम कल ${o} ${v.hi.fut2.m}?` }
];

// Frames for the motion verbs. The destination replaces the object, and the
// perfective agrees with the subject.
const MOTION_FRAMES = [
  { id: 'iWent', mark: '⏪',
    en: (v, d) => `I ${v.en.past} ${d} yesterday.`,
    hi: (v, d, g) => `कल मैं ${d} ${v.hi.perfS[g]}।` },

  { id: 'iGo', mark: '',
    en: (v, d) => `I ${v.en.base} ${d}.`,
    hi: (v, d, g) => `मैं ${d} ${v.hi.imperf[g]} हूँ।` },

  { id: 'iGoing', mark: '▶️',
    en: (v, d) => `I am ${v.en.ing} ${d}.`,
    hi: (v, d, g) => `मैं ${d} ${v.hi.prog[g]} हूँ।` },

  { id: 'iWillGo', mark: '⏩',
    en: (v, d) => `I will ${v.en.base} ${d} tomorrow.`,
    hi: (v, d, g) => `कल मैं ${d} ${v.hi.fut1[g]}।` },

  { id: 'heWent', sub: '👨', mark: '⏪', quiz: false,
    en: (v, d) => `He ${v.en.past} ${d} yesterday.`,
    hi: (v, d) => `कल वह ${d} ${v.hi.perfS.m}।` },

  { id: 'sheWent', sub: '👩', mark: '⏪', quiz: false,
    en: (v, d) => `She ${v.en.past} ${d} yesterday.`,
    hi: (v, d) => `कल वह ${d} ${v.hi.perfS.f}।` },

  // तुम takes the plural perfective (गए, not गया), even for one person.
  { id: 'youWentQ', mark: '❓',
    en: (v, d) => `Did you ${v.en.base} ${d}?`,
    hi: (v, d) => `क्या तुम ${d} ${v.hi.perfS2.m}?` }
];

// Standalone sentences that are not built from a verb table.
const TEMPLATES = [
  { id: 'want', level: 1, use: 'want', article: true, icon: '🤲',
    en: 'I want {obj}.', hi: 'मुझे {obj} चाहिए।' },
  { id: 'wantQ', level: 5, use: 'want', article: true, icon: '🤲❓',
    en: 'Do you want {obj}?', hi: 'क्या तुम्हें {obj} चाहिए?' },
  { id: 'like', level: 1, use: 'like', article: false, icon: '❤️',
    en: 'I like this {obj}.', hi: 'मुझे यह {obj} पसंद है।',
    enPl: 'I like these {obj}.', hiPl: 'मुझे ये {obj} पसंद हैं।' },
  { id: 'this', level: 1, use: 'this', article: true, icon: '👉',
    en: 'This is {obj}.', hi: 'यह {obj} है।',
    enPl: 'These are {obj}.', hiPl: 'ये {obj} हैं।' }
];

/**
 * The indefinite article, derived rather than stored.
 *
 * `art` only records WHETHER the noun takes one - an empty string means
 * uncountable or plural ("rice", "shoes"). Which one it is comes from the word
 * itself, because storing "a" next to "office" is a typo waiting to happen, and
 * it was one. Nothing in this vocabulary is an exception to the vowel rule; a
 * word like "hour" or "university" would need a stored override.
 */
function objectPhrase(word, meta, wantArticle) {
  if (!wantArticle || !meta.art) return word.en;
  return `${/^[aeiou]/i.test(word.en) ? 'an' : 'a'} ${word.en}`;
}

/** English number, which is not always the Hindi one ("pants" vs पैंट). */
function enPlural(meta) {
  return (meta.enN || meta.n) === 'pl';
}

/**
 * Build every sentence the verbs, frames, templates and tagged nouns allow.
 * `words` are the WORDS entries, so the Hindi noun and the picture come
 * straight from the vocabulary rather than being repeated here.
 */
export function buildSentences(words, { learnerGender = 'm', level = 99 } = {}) {
  const byId = new Map(words.map((w) => [w.id, w]));
  const out = [];

  for (const [verbId, v] of Object.entries(VERBS)) {
    if ((v.level || 3) > level) continue;
    for (const frame of FRAMES) {
      if (v.skip && v.skip.includes(frame.id)) continue;
      if ((frame.level || 3) > level) continue;

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

  // Motion verbs and places arrive together, at the top level.
  for (const [verbId, v] of Object.entries(MOTION)) {
    if (level < 5) break;
    for (const frame of MOTION_FRAMES) {
      for (const [nounId, meta] of Object.entries(NOUNS)) {
        if (!meta.use.includes('go') || !meta.to) continue;
        const w = byId.get(nounId);
        if (!w || !w.emoji) continue;

        out.push({
          id: `${frame.id}/${verbId}/${nounId}`,
          en: frame.en(v, meta.to),
          hi: frame.hi(v, w.hi, learnerGender),
          word: w,
          template: `${frame.id}/${verbId}`,
          icon: (frame.sub || '') + v.icon + (frame.mark || ''),
          quizzable: frame.quiz !== false
        });
      }
    }
  }

  out.push(...buildPairs(byId, level, learnerGender));

  for (const t of TEMPLATES) {
    if ((t.level || 3) > level) continue;
    for (const [nounId, meta] of Object.entries(NOUNS)) {
      if (!meta.use.includes(t.use)) continue;
      const w = byId.get(nounId);
      if (!w || !w.emoji) continue;

      // English and Hindi number are chosen independently. "scissors" is plural
      // in English but कैंची is singular, so it is "These are scissors" and
      // यह कैंची है - taking one number for both gets one language wrong.
      const enTpl = enPlural(meta) && t.enPl ? t.enPl : t.en;
      const hiTpl = meta.n === 'pl' && t.hiPl ? t.hiPl : t.hi;

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

// ---------------------------------------------------------------------------
// Two-clause sentences: the top tier.
//
// Two verb phrases sharing one subject. In the ergative past a single मैंने
// covers both clauses, and each verb still agrees with its OWN object - which
// makes these the clearest demonstration of the agreement rule in the whole
// app: मैंने सेब खाया और चाय पी। (सेब masculine, चाय feminine.)
//
// They carry two pictures, so they are taught on cards and never asked as
// picture questions - four glyphs will not fit a choice tile.
// ---------------------------------------------------------------------------
const CLAUSE_PAIRS = [
  { a: 'eat', b: 'drink' },
  { a: 'buy', b: 'eat', aCat: 'food' }
];

const PAIR_FRAMES = [
  {
    id: 'iPastAnd', level: 6, mark: '⏪',
    en: (va, oa, vb, ob) => `I ${va.en.past} ${oa} and ${vb.en.past} ${ob} yesterday.`,
    hi: (va, ha, ma, vb, hb, mb) =>
      `कल मैंने ${ha} ${va.hi.perf[`${ma.g}.${ma.n}`]} और ${hb} ${vb.hi.perf[`${mb.g}.${mb.n}`]}।`
  },
  {
    id: 'iPresentAnd', level: 6, mark: '',
    en: (va, oa, vb, ob) => `I ${va.en.base} ${oa} and ${vb.en.base} ${ob}.`,
    hi: (va, ha, ma, vb, hb, mb, g) =>
      `मैं ${ha} ${va.hi.imperf[g]} हूँ और ${hb} ${vb.hi.imperf[g]} हूँ।`
  }
];

const PAIR_CAP = 40; // per pair per frame, so these do not swamp the deck

function nounsFor(use, byId, cat) {
  const out = [];
  for (const [id, meta] of Object.entries(NOUNS)) {
    if (!meta.use.includes(use)) continue;
    if (cat && !id.startsWith(`${cat}/`)) continue;
    const word = byId.get(id);
    if (word && word.emoji) out.push({ word, meta });
  }
  return out;
}

function buildPairs(byId, level, learnerGender) {
  const out = [];
  if (level < 6) return out;

  for (const pair of CLAUSE_PAIRS) {
    const va = VERBS[pair.a];
    const vb = VERBS[pair.b];
    const as = nounsFor(va.use, byId, pair.aCat);
    const bs = nounsFor(vb.use, byId, pair.bCat);

    for (const frame of PAIR_FRAMES) {
      const combos = [];
      for (const A of as) {
        for (const B of bs) {
          if (A.word.id === B.word.id) continue;
          combos.push([A, B]);
        }
      }
      for (const [A, B] of shuffleLocal(combos).slice(0, PAIR_CAP)) {
        out.push({
          id: `${frame.id}/${pair.a}-${pair.b}/${A.word.id}/${B.word.id}`,
          en: frame.en(
            va, objectPhrase(A.word, A.meta, va.article),
            vb, objectPhrase(B.word, B.meta, vb.article)
          ),
          hi: frame.hi(va, A.word.hi, A.meta, vb, B.word.hi, B.meta, learnerGender),
          word: A.word,
          pair: [
            { icon: va.icon + (frame.mark || ''), word: A.word },
            { icon: vb.icon, word: B.word }
          ],
          template: `${frame.id}/${pair.a}-${pair.b}`,
          icon: va.icon + vb.icon + (frame.mark || ''),
          quizzable: false
        });
      }
    }
  }
  return out;
}

function shuffleLocal(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Vocabulary entries that can be bought, with their grammar tags. */
export function shoppableNouns(words) {
  const byId = new Map(words.map((w) => [w.id, w]));
  const out = [];
  for (const [id, meta] of Object.entries(NOUNS)) {
    if (!meta.use.includes('buy') || meta.n !== 'sg') continue;
    const word = byId.get(id);
    if (word && word.emoji) out.push({ word, meta });
  }
  return out;
}

export const FRAME_COUNT = FRAMES.length;
export const VERB_COUNT = Object.keys(VERBS).length + Object.keys(MOTION).length;
export const TEMPLATE_COUNT = TEMPLATES.length;
export const TAGGED_NOUN_COUNT = Object.keys(NOUNS).length;
