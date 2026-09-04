// Question building for the Listen and Read modes.
//
// Kept out of app.js so it can be exercised directly, because the thing that
// makes a picture quiz weak is invisible from a screenshot: whether a wrong
// answer can be ruled out without knowing the word.

import * as store from './store.js';

/** What a word looks like on screen. Two choices must never share one. */
export function visualKey(w) {
  return w.emoji || w.swatch || `#${w.num}`;
}

/**
 * How a word is DRAWN: a picture, a colour disc, or a numeral.
 *
 * This matters more than it looks. The rendering class lines up almost exactly
 * with the topic - every colour is a disc, every number is a numeral - so a
 * question mixing classes can be answered without listening at all: hear a
 * colour, pick the only disc. Distractors are therefore drawn from the target's
 * own class first, which makes the class carry no information.
 */
export function renderClass(w) {
  if (w.swatch) return 'swatch';
  if (w.num) return 'num';
  return 'emoji';
}

export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * One target plus distractors that never look alike.
 *
 * Preference order for distractors:
 *   1. same rendering class AND same topic - the hardest, most real choice
 *   2. same rendering class, any topic
 *   3. anything left, only if the pool cannot do better
 */
export function buildQuestion(pool, recent = [], choiceCount = null) {
  const target = store.chooseTarget(pool, recent);
  const n = Math.min(choiceCount ?? store.choiceCount(), pool.length);

  const cls = renderClass(target);
  const notTarget = (w) => w.id !== target.id;

  const sameClassSameCat = shuffle(
    pool.filter((w) => notTarget(w) && renderClass(w) === cls && w.cat === target.cat)
  );
  const sameClassOtherCat = shuffle(
    pool.filter((w) => notTarget(w) && renderClass(w) === cls && w.cat !== target.cat)
  );
  const otherClass = shuffle(pool.filter((w) => notTarget(w) && renderClass(w) !== cls));

  // With only two pictures on screen, a distractor from another topic is an
  // easier discrimination; with three or four, same-topic makes it real.
  const sameClass = n >= 3
    ? [...sameClassSameCat, ...sameClassOtherCat]
    : [...sameClassOtherCat, ...sameClassSameCat];

  const used = new Set([visualKey(target)]);
  const distractors = [];
  for (const w of [...sameClass, ...otherClass]) {
    if (distractors.length >= n - 1) break;
    const key = visualKey(w);
    if (used.has(key)) continue;
    used.add(key);
    distractors.push(w);
  }

  return {
    target,
    choices: shuffle([target, ...distractors]),
    recent: [target.id, ...recent].slice(0, 6)
  };
}
