// Spaced review: a Leitner box, kept pure so it can be reasoned about and
// tested without a browser.
//
// The problem this solves is not forgetting. It is that the app kept running
// out. A shuffled deck shows everything once and then shows it again in a
// different order, so "he has learnt all of it" really means "he has seen all
// of it", and the only remedy anyone had was to write more content. With a
// schedule, what comes back is what was actually shaky, and there is always
// something worth doing without a single new sentence.
//
// Five boxes. A right answer promotes and pushes the next sighting further
// out; a wrong answer sends it straight back to box 1 and it returns today.
// The intervals are the ordinary Leitner ones - the exact numbers matter far
// less than the fact that failures come back soon and successes come back at
// all.

export const BOX_COUNT = 5;

/** Days to wait after an item lands in box n (1-indexed). */
export const BOX_DAYS = [0, 1, 3, 7, 16];

const DAY = 24 * 60 * 60 * 1000;

/**
 * An answer moves the item one box up, or all the way back to the first.
 *
 * An item that has never been answered counts as being in box 1 already, so
 * getting it right the first time promotes it to box 2 and it is next seen
 * tomorrow. Without that floor the first correct answer landed it in box 1,
 * whose interval is zero - so everything ever answered correctly stayed
 * permanently due and the review band swallowed the whole session.
 */
export function nextBox(box, correct) {
  if (!correct) return 1;
  return Math.min(BOX_COUNT, Math.max(1, box || 0) + 1);
}

/**
 * When an item in `box` should next be seen.
 *
 * Box 1 is due immediately: something just got wrong should come round again
 * in the same sitting, once a few other items have been in between.
 */
export function dueAt(box, now = Date.now()) {
  const days = BOX_DAYS[Math.max(1, Math.min(BOX_COUNT, box)) - 1];
  return now + days * DAY;
}

/**
 * How much this item wants to be shown, as a weight.
 *
 * Overdue beats new, because an item going stale is a real loss and an unseen
 * one is only an opportunity. The overdue bonus is capped so that a fortnight
 * away from the app does not produce a session made entirely of the same few
 * words the learner once got wrong.
 */
export function priority(stat, now = Date.now()) {
  const s = stat || {};
  const answered = (s.ok || 0) + (s.bad || 0);

  if (s.due && s.due <= now) {
    const overdueDays = Math.floor((now - s.due) / DAY);
    return 12 + Math.min(overdueDays, 5);
  }
  if (!s.seen) return 10;            // never shown at all
  if (!answered) return 6;           // met on a card, never actually tested
  if (s.due) return (s.box || 0) <= 2 ? 3 : 1;  // waiting, but not for long
  return 3;
}

export function isDue(stat, now = Date.now()) {
  return !!(stat && stat.due && stat.due <= now);
}

/** How many of `pool` are waiting to be reviewed right now. */
export function dueCount(pool, statOf, now = Date.now()) {
  return pool.filter((item) => isDue(statOf(item.id), now)).length;
}

function shuffled(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Order a deck of cards for a session: what is due, then what is new, then
 * everything else. Shuffled inside each band, so the same three due words do
 * not arrive in the same order every time.
 *
 * Card modes do not mark answers, so they cannot schedule - but they can still
 * put the right thing in front of the learner first, which is most of the
 * benefit for a mode with no questions in it.
 */
export function reviewOrder(pool, statOf, now = Date.now()) {
  const due = [];
  const fresh = [];
  const rest = [];

  for (const item of pool) {
    const s = statOf(item.id);
    if (isDue(s, now)) due.push(item);
    else if (!s || !s.seen) fresh.push(item);
    else rest.push(item);
  }

  // Longest overdue first within the due band; the rest is shuffled.
  due.sort((a, b) => (statOf(a.id).due || 0) - (statOf(b.id).due || 0));
  return [...due, ...shuffled(fresh), ...shuffled(rest)];
}
