// Language checks over everything the app can generate.
//
// Agreement bugs here are invisible in review and obvious to a reader: "a
// office", "I want book.", "These are scissors" against ये कैंची हैं, "The
// pants costs". Each was found by a person using the app, one at a time. The
// content is generated, so it can be checked exhaustively instead.
//
//   node tools/lang-check.mjs

const base = new URL('../js/', import.meta.url);
const { WORDS } = await import(new URL('data.js', base));
const sentences = await import(new URL('sentences.js', base));
const money = await import(new URL('money.js', base));

const problems = [];
const flag = (kind, text, why) => problems.push({ kind, text, why });

// ---- articles -------------------------------------------------------------
const VOWEL = /^(a|an) ([aeiou])/i;
const CONSONANT = /^(a|an) ([^aeiou\s])/i;

function checkArticles(text, where) {
  for (const m of text.matchAll(/\b(an?) ([a-z]+)/gi)) {
    const phrase = `${m[1]} ${m[2]}`;
    const startsVowel = /^[aeiou]/i.test(m[2]);
    if (startsVowel && m[1].toLowerCase() === 'a') flag(where, text, `"${phrase}" should be "an"`);
    if (!startsVowel && m[1].toLowerCase() === 'an') flag(where, text, `"${phrase}" should be "a"`);
  }
}

// ---- sentences ------------------------------------------------------------
const all = sentences.buildSentences(WORDS, { learnerGender: 'm', level: 6 });

for (const s of all) {
  checkArticles(s.en, 'sentence');

  // Bare count nouns: "I want book."
  //
  // Two false starts here, both from guessing at the sentence instead of
  // looking at the noun. A word list of mass nouns reinvents the `art` tagging
  // badly and flagged forty-six good sentences; matching the end of the string
  // assumes the noun is the last word, which it is not in "I ate an apple
  // yesterday." So: find the noun where it actually is, and look at the word
  // in front of it. An empty `art` means uncountable or plural and correctly
  // takes no determiner ("I eat grapes", "I buy soap").
  const noun = sentences.NOUNS[s.word && s.word.id];
  // Motion destinations are authored phrases, not derived ones, and English
  // is idiomatic about them: "to school" is right and "to the school" is not,
  // while every other place does take the article. The `to` tag records which,
  // so a sentence using it is not the article rule to judge.
  const isDestination = noun && noun.to && s.en.includes(noun.to);
  if (noun && noun.art && !isDestination) {
    const m = s.en.match(new RegExp(`(\\S+)\\s+${s.word.en}\\b`, 'i'));
    const before = m ? m[1].toLowerCase() : null;
    if (!before || !/^(a|an|the|this|these|those|my|your)$/.test(before)) {
      flag('sentence', s.en, `countable noun with no determiner (before it: ${before || 'nothing'})`);
    }
  }

  // this/these must follow ENGLISH number, is/are with it
  if (/^This is /.test(s.en) && / are /.test(s.en)) flag('sentence', s.en, 'This is ... are');
  if (/^These are /.test(s.en) && /\bis\b/.test(s.en)) flag('sentence', s.en, 'These are ... is');

  if (!s.hi || !s.en) flag('sentence', s.id, 'missing a language');
  if (/undefined|NaN|\{obj\}/.test(s.en + s.hi)) flag('sentence', s.en + ' / ' + s.hi, 'unsubstituted');
}

// "This is"/"These are" must match the noun's English number, and the Hindi
// must match the HINDI number - the two are independent.
for (const s of all.filter((x) => x.template === 'this')) {
  const enPl = /^These are/.test(s.en);
  // No word-boundary escape here: JavaScript defines \b over
  // [A-Za-z0-9_], so it never matches beside a Devanagari letter and this
  // test was always false - which is why only the four Hindi-plural nouns
  // ever showed up.
  const hiPl = /हैं।$/.test(s.hi);
  const meta = sentences.NOUNS[s.word.id];
  if (meta) {
    if (enPl !== ((meta.enN || meta.n) === 'pl')) flag('this', s.en, 'English number wrong');
    if (hiPl !== (meta.n === 'pl')) flag('this', s.hi, 'Hindi number wrong');
  }
}

// ---- money ----------------------------------------------------------------
const items = sentences.shoppableNouns(WORDS);
for (const it of items) {
  for (const gender of ['m', 'f']) {
    for (let i = 0; i < 8; i++) {
      const t = money.buildTransaction([it], { maxPrice: 50, learnerGender: gender });
      for (const step of t.steps) {
        checkArticles(step.en, 'money');
        if (/\d/.test(step.en)) flag('money', step.en, 'digits in a spoken English line');
        if (/\d/.test(step.hi)) flag('money', step.hi, 'digits in a spoken Hindi line');
        if (/undefined|NaN/.test(step.en + step.hi)) flag('money', step.en, 'undefined');
      }
      const price = t.steps[0].en;
      const wantsPlural = (it.meta.enN || it.meta.n) === 'pl';
      if (wantsPlural && / costs /.test(price)) flag('money', price, 'plural subject, singular verb');
      if (!wantsPlural && / cost /.test(price)) flag('money', price, 'singular subject, plural verb');
    }
  }
}

// ---- number words ---------------------------------------------------------
for (let n = 0; n <= 100; n++) {
  if (/^\d+$/.test(money.englishNumber(n))) flag('numbers', String(n), 'no English word');
  if (/^\d+$/.test(money.hindiNumber(n))) flag('numbers', String(n), 'no Hindi word');
}

// ---- report ---------------------------------------------------------------
console.log(`sentences: ${all.length}   shoppable nouns: ${items.length}`);
if (!problems.length) {
  console.log('no language problems found');
} else {
  const seen = new Set();
  for (const p of problems) {
    const key = p.kind + p.why + p.text;
    if (seen.has(key)) continue;
    seen.add(key);
    console.log(`  [${p.kind}] ${p.why}\n      ${p.text}`);
  }
  console.log(`\n${seen.size} distinct problems`);
  process.exitCode = 1;
}
