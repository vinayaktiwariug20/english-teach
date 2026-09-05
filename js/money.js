// Shopping money: a small transaction, walked through step by step.
//
// This follows the sequence a parent asked for, which is a life skill wearing
// arithmetic rather than the other way round:
//
//   चॉकलेट सात रुपए की है।              The chocolate costs seven rupees.
//   मेरे पास दस रुपए हैं।                I have ten rupees.
//   मैं दुकानदार को दस रुपए दूँगा।        I will give the shopkeeper ten rupees.
//   कितने रुपए बचे?                     How many rupees are left?
//   तीन रुपए बचे। उनका क्या करोगे?        Three rupees are left. What will you do with them?
//   मैं तीन रुपए घर वापस लाऊँगा।          I will bring three rupees home.
//
// Three bits of Hindi have to be right and none of them are optional:
//   - रुपया is singular, रुपए plural. एक रुपया बचा, but तीन रुपए बचे।
//   - the price agrees with the ITEM's gender: सेब ... का है, चॉकलेट ... की है।
//   - दूँगा / लाऊँगा agree with the speaker, so they follow the learner setting.

// Number words to a hundred.
//
// They stopped at twenty, which was fine while the highest price was ten - and
// silently wrong above it: enAmount(24) fell through to String(24) and the app
// said "The umbrella costs 24 rupees" in a mode whose entire purpose is saying
// amounts out loud. Anything the shop can produce has to have a word.
//
// English compounds regularly, so it is generated. Hindi does not - every one
// of the twenty-ones and thirty-sevens is its own word - so it is a table.
import { enPlural } from './sentences.js';

const HI_NUM = [
  'शून्य', 'एक', 'दो', 'तीन', 'चार', 'पाँच', 'छह', 'सात', 'आठ', 'नौ', 'दस',
  'ग्यारह', 'बारह', 'तेरह', 'चौदह', 'पंद्रह', 'सोलह', 'सत्रह', 'अठारह', 'उन्नीस', 'बीस',
  'इक्कीस', 'बाईस', 'तेईस', 'चौबीस', 'पच्चीस', 'छब्बीस', 'सत्ताईस', 'अट्ठाईस', 'उनतीस', 'तीस',
  'इकतीस', 'बत्तीस', 'तैंतीस', 'चौंतीस', 'पैंतीस', 'छत्तीस', 'सैंतीस', 'अड़तीस', 'उनतालीस', 'चालीस',
  'इकतालीस', 'बयालीस', 'तैंतालीस', 'चवालीस', 'पैंतालीस', 'छियालीस', 'सैंतालीस', 'अड़तालीस', 'उनचास', 'पचास',
  'इक्यावन', 'बावन', 'तिरपन', 'चौवन', 'पचपन', 'छप्पन', 'सत्तावन', 'अट्ठावन', 'उनसठ', 'साठ',
  'इकसठ', 'बासठ', 'तिरसठ', 'चौंसठ', 'पैंसठ', 'छियासठ', 'सड़सठ', 'अड़सठ', 'उनहत्तर', 'सत्तर',
  'इकहत्तर', 'बहत्तर', 'तिहत्तर', 'चौहत्तर', 'पचहत्तर', 'छिहत्तर', 'सतहत्तर', 'अठहत्तर', 'उन्यासी', 'अस्सी',
  'इक्यासी', 'बयासी', 'तिरासी', 'चौरासी', 'पचासी', 'छियासी', 'सत्तासी', 'अट्ठासी', 'नवासी', 'नब्बे',
  'इक्यानवे', 'बानवे', 'तिरानवे', 'चौरानवे', 'पचानवे', 'छियानवे', 'सत्तानवे', 'अट्ठानवे', 'निन्यानवे', 'सौ'
];

const EN_ONES = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen',
  'eighteen', 'nineteen'
];

const EN_TENS = [
  '', '', 'twenty', 'thirty', 'forty', 'fifty',
  'sixty', 'seventy', 'eighty', 'ninety'
];

function enWord(n) {
  if (n < 20) return EN_ONES[n];
  if (n === 100) return 'one hundred';
  if (n > 100) return String(n);
  const t = EN_TENS[Math.floor(n / 10)];
  const o = n % 10;
  return o ? `${t}-${EN_ONES[o]}` : t;
}

export function hindiNumber(n) {
  return HI_NUM[n] ?? String(n);
}

export function englishNumber(n) {
  return n >= 0 && n <= 100 ? enWord(n) : String(n);
}

/** "एक रुपया" / "तीन रुपए" - the singular noun is a different word. */
function hiAmount(n) {
  return n === 1 ? 'एक रुपया' : `${hindiNumber(n)} रुपए`;
}

/** The oblique form used before का/की: "एक रुपये का", "सात रुपए का". */
function hiAmountOblique(n) {
  return n === 1 ? 'एक रुपये' : `${hindiNumber(n)} रुपए`;
}

function enAmount(n) {
  return n === 1 ? 'one rupee' : `${englishNumber(n)} rupees`;
}

function cap(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Build one transaction.
 *
 * `items` is [{ word, meta }] - the vocabulary entry plus its grammar tags, so
 * the price sentence can agree with the item's gender.
 */
export function buildTransaction(items, { maxPrice = 10, learnerGender = 'm' } = {}) {
  const notes = [10, 20, 50].filter((v) => v <= Math.max(10, maxPrice * 2));
  const { word, meta } = pick(items);

  const paid = pick(notes);
  // Leave a change of at least one rupee, so there is always something to work out.
  const price = 1 + Math.floor(Math.random() * Math.min(paid - 1, maxPrice));
  const change = paid - price;

  const of = meta.g === 'f' ? 'की' : 'का';
  // "The pants COST", not "costs". English number is its own thing: पैंट and
  // चश्मा are singular in Hindi and plural in English, so the Hindi line here
  // is right either way and only the verb has to agree. The rule lives in
  // sentences.js and is imported rather than restated - having two copies of
  // "is this plural" is how the article bug happened.
  const costs = enPlural(meta) ? 'cost' : 'costs';
  const give = learnerGender === 'f' ? 'दूँगी' : 'दूँगा';
  const bring = learnerGender === 'f' ? 'लाऊँगी' : 'लाऊँगा';
  const leftHi = change === 1 ? 'एक रुपया बचा।' : `${hindiNumber(change)} रुपए बचे।`;
  const leftEn = change === 1 ? 'One rupee is left.' : cap(`${englishNumber(change)} rupees are left.`);

  const steps = [
    {
      kind: 'say',
      en: `The ${word.en} ${costs} ${enAmount(price)}.`,
      hi: `${word.hi} ${hiAmountOblique(price)} ${of} है।`,
      amount: price,
      // A price is a number on a shelf, not money in a hand. Drawing notes
      // here would suggest you hand over the exact amount, which is the one
      // thing this whole sequence exists to teach you do not have to do.
      isPrice: true
    },
    {
      kind: 'say',
      en: `I have ${enAmount(paid)}.`,
      hi: `मेरे पास ${hiAmount(paid)} ${paid === 1 ? 'है' : 'हैं'}।`,
      amount: paid
    },
    {
      kind: 'say',
      en: `I will give the shopkeeper ${enAmount(paid)}.`,
      hi: `मैं दुकानदार को ${hiAmount(paid)} ${give}।`,
      amount: paid
    },
    {
      kind: 'ask',
      en: 'How many rupees are left?',
      hi: 'कितने रुपए बचे?',
      answer: change,
      sum: `${paid} − ${price}`
    },
    {
      // The closing question is a cue for the person sitting alongside, not
      // something the app expects an answer to.
      kind: 'say',
      en: `${leftEn} What will you do with them?`,
      hi: `${leftHi} उनका क्या करोगे?`,
      amount: change
    },
    {
      kind: 'say',
      en: `I will bring ${enAmount(change)} home.`,
      hi: `मैं ${hiAmount(change)} घर वापस ${bring}।`,
      amount: change
    }
  ];

  return { id: `shop/${word.id}/${paid}/${price}`, word, price, paid, change, steps };
}

/** Plausible wrong answers for the arithmetic step: near misses, never negative. */
export function changeOptions(change, paid, count) {
  const wrong = new Set();
  for (const d of [1, -1, 2, -2, 3]) {
    const v = change + d;
    if (v > 0 && v !== change && v <= paid) wrong.add(v);
  }
  const picks = [...wrong].sort(() => Math.random() - 0.5).slice(0, Math.max(1, count - 1));
  return [change, ...picks].sort(() => Math.random() - 0.5);
}
