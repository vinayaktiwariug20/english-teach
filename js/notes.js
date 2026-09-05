// Indian rupee notes and coins.
//
// A photograph is the better teaching picture, and the app prefers one wherever
// it has been given one. Recognising a note is a transfer task - the point is
// the object in a hand at a shop counter - and transfer from a stylised drawing
// to the real thing cannot be assumed, least of all for a learner who takes
// things literally. Depicting currency for teaching is ordinary; Indian school
// textbooks are full of it. What the law is aimed at is a reproduction that
// could pass as money, which a hundred-pixel picture on a phone is not.
//
// The reason the drawings exist and are the default is licensing, not legality.
// An image found online is almost always somebody's copyright, and the current
// series is a Government of India work besides, so it cannot simply be
// committed to a public repository. Photographs you took yourself of the notes
// in your own wallet carry no such problem - and they are the notes actually in
// circulation where the learner lives, which a generic drawing can never be.
//
// So: add a file, add a line to NOTE_PHOTOS, and that denomination becomes a
// photograph. Anything not listed stays drawn, and an image that fails to load
// falls back to the drawing rather than leaving a hole.
//
// The drawings get the two things that carry the recognition: colour, and
// length. The lengths below are the real millimetres, kept in proportion, so
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

/**
 * Photographs, by denomination. Empty by default.
 *
 * Put the file in images/notes/ and name it here, e.g.
 *
 *   export const NOTE_PHOTOS = {
 *     10: './images/notes/10.jpg',
 *     20: './images/notes/20.jpg'
 *   };
 *
 * One side, in focus, filling the frame. The app crops to the note's real
 * proportions, so a straight-on photograph needs no trimming. Denominations
 * left out keep the drawing, so a half-finished set is fine.
 */
export const NOTE_PHOTOS = {
  10: './images/notes/10.jpg',
  20: './images/notes/20.jpg',
  50: './images/notes/50.jpg'
};

export function photoFor(value) {
  return NOTE_PHOTOS[value] || null;
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
