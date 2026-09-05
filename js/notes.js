// Indian rupee notes and coins, drawn rather than photographed.
//
// Three reasons it is drawn. Photographs of banknotes are restricted -
// reproducing currency is not something to do casually in a file that gets
// pushed to a public repository. Nothing else in this app is a bitmap, and
// adding a folder of JPEGs would make the offline cache many times its size
// for the first time. And most usefully: colour and length are how a note is
// actually told apart at a shop counter. Nobody reads the denomination. They
// see brown-and-small or grey-and-long, so those are the two things the
// drawing has to get right, and a photograph would carry a great deal of
// detail that is not the lesson.
//
// The lengths below are the real ones in millimetres, kept in proportion, so
// bigger money is a longer note here exactly as it is in a hand.

export const NOTES = [
  { value: 10,  mm: 123, bg: '#8d6a4b', ink: '#fdf6ee', name: 'brown'  },
  { value: 20,  mm: 129, bg: '#b5b348', ink: '#241f00', name: 'green-yellow' },
  { value: 50,  mm: 135, bg: '#4aa5c4', ink: '#04222c', name: 'blue'   },
  { value: 100, mm: 142, bg: '#9d8bc4', ink: '#1b1030', name: 'purple' },
  { value: 200, mm: 146, bg: '#e3b23c', ink: '#33240a', name: 'yellow' },
  { value: 500, mm: 150, bg: '#8f8b86', ink: '#1d1b19', name: 'grey'   }
];

// Coins are what small change actually comes back as, so they belong in the
// same picture vocabulary as the notes.
export const COINS = [1, 2, 5, 10];

const HI_NOTE = {
  1: 'एक', 2: 'दो', 5: 'पाँच', 10: 'दस', 20: 'बीस', 50: 'पचास',
  100: 'सौ', 200: 'दो सौ', 500: 'पाँच सौ'
};

export function hindiValue(v) {
  return HI_NOTE[v] || String(v);
}

export function noteFor(value) {
  return NOTES.find((n) => n.value === value) || null;
}

/** The set of notes and coins that can appear at a given highest price. */
export function moneyInPlay(maxPrice) {
  const ceiling = Math.max(20, maxPrice * 5);
  return NOTES.filter((n) => n.value <= ceiling);
}

/**
 * The fewest notes and coins that make `amount`.
 *
 * Used to show what "I have twenty rupees" looks like in a hand, which is a
 * different question from what twenty is as a numeral, and the one that comes
 * up at a shop.
 */
export function tender(amount) {
  const out = [];
  let left = amount;
  for (const n of [...NOTES].sort((a, b) => b.value - a.value)) {
    while (left >= n.value) { out.push({ kind: 'note', value: n.value }); left -= n.value; }
  }
  for (const c of [...COINS].sort((a, b) => b - a)) {
    while (left >= c) { out.push({ kind: 'coin', value: c }); left -= c; }
  }
  return out;
}
