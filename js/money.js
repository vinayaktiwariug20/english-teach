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

const HI_NUM = [
  'शून्य', 'एक', 'दो', 'तीन', 'चार', 'पाँच', 'छह', 'सात', 'आठ', 'नौ', 'दस',
  'ग्यारह', 'बारह', 'तेरह', 'चौदह', 'पंद्रह', 'सोलह', 'सत्रह', 'अठारह', 'उन्नीस', 'बीस'
];

const EN_NUM = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen',
  'eighteen', 'nineteen', 'twenty'
];

export function hindiNumber(n) {
  return HI_NUM[n] ?? String(n);
}

export function englishNumber(n) {
  return EN_NUM[n] ?? String(n);
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
  const give = learnerGender === 'f' ? 'दूँगी' : 'दूँगा';
  const bring = learnerGender === 'f' ? 'लाऊँगी' : 'लाऊँगा';
  const leftHi = change === 1 ? 'एक रुपया बचा।' : `${hindiNumber(change)} रुपए बचे।`;
  const leftEn = change === 1 ? 'One rupee is left.' : cap(`${englishNumber(change)} rupees are left.`);

  const steps = [
    {
      kind: 'say',
      en: `The ${word.en} costs ${enAmount(price)}.`,
      hi: `${word.hi} ${hiAmountOblique(price)} ${of} है।`,
      amount: price
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
