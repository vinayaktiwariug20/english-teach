// Local progress and settings. Nothing leaves the device; there is no account
// and no network call anywhere in this app.

import * as review from './review.js';
import * as research from './research.js';

const KEY = 'englishteach.v1';

const DEFAULTS = {
  settings: {
    rate: 0.8,            // speech rate, 0.5 - 1.0
    englishVoice: null,   // preferred voice name, null = auto
    hindiVoice: null,
    hindiAudio: true,     // speak the Hindi line aloud
    learnerGender: 'm',   // Hindi verbs agree with the speaker in some tenses
    enVolume: 1,          // per-language volume, to balance mismatched voices
    hiVolume: 1,
    autoSpeak: true,      // speak the prompt on arrival without a tap
    // On Android the on-device voices are the good Google ones, so this costs
    // no quality and removes the network round trip before every prompt. On
    // Windows the local voices are plainer; turn it off there if it matters.
    preferLocalVoice: true,
    choices: 'auto',      // 'auto' | 2 | 3 | 4
    moneyMax: 10,         // highest price in the shopping mode
    numbersInQuiz: false, // keep counting out of the picture quizzes
    level: 1,             // 1-6; the caregiver decides when to move up
    reveal: 'both',       // 'both' | 'hindi' - hide the English until asked for
    // The corner code is unguessable by design, which also means it is
    // forgettable. A line on the home screen keeps it from being lost; it is
    // in English, small, and at the bottom, so the learner has no reason to
    // read it - but it can be switched off if it draws taps.
    showHint: true,
    // Putting the English in order, rather than picking a picture. The one
    // exercise here that asks the learner to produce rather than recognise,
    // and much the hardest, so it is worth being able to switch off.
    buildSentences: true,
    categories: null,     // null = all enabled, else array of category ids
    // A study code, typed in by whoever is running the study - "GS1-014". It
    // is the only identifier that exists anywhere in this app, and it means
    // nothing without the paper list that maps it to a child. Blank normally.
    studyId: '',
    // The event log is what makes a before-and-after comparison possible. It
    // stays on the device like everything else and can be switched off.
    logEvents: true
  },
  // item id -> { seen, ok, bad, last, box, due }
  progress: {},
  stats: { sessions: 0, answers: 0, correct: 0, byMode: {} },
  // One row per answer: see research.js. Capped, oldest dropped first.
  log: []
};

function clone(o) {
  return JSON.parse(JSON.stringify(o));
}

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return clone(DEFAULTS);
    const parsed = JSON.parse(raw);
    const loaded = {
      settings: { ...DEFAULTS.settings, ...(parsed.settings || {}) },
      progress: parsed.progress || {},
      stats: { ...DEFAULTS.stats, byMode: {}, ...(parsed.stats || {}) },
      log: Array.isArray(parsed.log) ? parsed.log : []
    };

    // Levels arrived after people were already using the full sentence set, so
    // anyone with existing progress starts at the top and can be moved down
    // deliberately. Quietly narrowing a working app would be a regression
    // dressed up as a feature.
    if (parsed.settings && parsed.settings.level === undefined
        && Object.keys(loaded.progress).length > 0) {
      loaded.settings.level = 5;
    }
    return loaded;
  } catch (_) {
    // Private mode, cleared storage, corrupt JSON: start fresh rather than break.
    return clone(DEFAULTS);
  }
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (_) {
    /* storage unavailable - the app still works, it just will not remember */
  }
}

export function settings() {
  return state.settings;
}

export function setSetting(key, value) {
  state.settings[key] = value;
  save();
}

export function stats() {
  return state.stats;
}

export function noteSession() {
  state.stats.sessions += 1;
  save();
}

export function wordStat(id) {
  return state.progress[id] || { seen: 0, ok: 0, bad: 0, last: 0, box: 0, due: 0 };
}

export function noteSeen(id) {
  const s = wordStat(id);
  s.seen += 1;
  s.last = Date.now();
  state.progress[id] = s;
  save();
}

/**
 * The question currently on screen, so an answer can be timed and counted as a
 * first attempt or a retry.
 *
 * Called where a question is BUILT rather than where it is drawn: a screen can
 * re-render for reasons that have nothing to do with the learner, and restarting
 * the clock then would record everyone as very fast. `key` makes the call
 * idempotent for the screens that do re-render mid-question.
 */
let pending = null;

export function startQuestion(key) {
  if (pending && pending.key === key) return;
  pending = { key, t0: Date.now(), attempts: 0 };
}

export function noteAnswer(id, correct, mode = 'other') {
  const now = Date.now();
  const s = wordStat(id);
  const boxBefore = s.box || 0;
  // How overdue this item was when it came round, which is what makes the
  // review data say something about retention rather than about practice.
  const overdueDays = s.due ? Math.floor((now - s.due) / 86400000) : null;

  let ms = null;
  let attempt = 1;
  if (pending) {
    pending.attempts += 1;
    attempt = pending.attempts;
    ms = now - pending.t0;
  }

  s.seen += 1;
  s.last = now;
  if (correct) s.ok += 1;
  else s.bad += 1;

  // Only answers schedule. Being shown a card is not evidence of anything, so
  // it must not push the next review further away.
  s.box = review.nextBox(s.box, correct);
  s.due = review.dueAt(s.box, now);
  state.progress[id] = s;

  state.stats.answers += 1;
  if (correct) state.stats.correct += 1;

  // Per-mode, because one overall figure cannot answer "is this still hard
  // enough for them" - a learner may be at ceiling in one mode and struggling in
  // another, and the average hides both.
  const m = (state.stats.byMode[mode] ||= { answers: 0, correct: 0 });
  m.answers += 1;
  if (correct) m.correct += 1;

  if (state.settings.logEvents) {
    research.append(state.log, research.makeEvent({
      t: now, mode, id, correct, ms, attempt,
      box: boxBefore, overdueDays, level: state.settings.level
    }));
  }

  // A correct answer ends the question; a wrong one leaves it on screen, still
  // being worked on, so the clock and the attempt count keep running.
  if (correct) pending = null;

  save();
}

// --- research -------------------------------------------------------------

export function eventLog() {
  return state.log;
}

export function researchSummary() {
  return research.summarise(state.log, state.progress);
}

export function researchCsv() {
  return research.toCsv(state.log, state.settings.studyId);
}

/**
 * Everything a study needs from this device, in one object.
 *
 * The settings go in because they are the conditions the data was produced
 * under - a result at level 2 with the English hidden is not the same result as
 * one at level 5 with it shown, and a month later nobody will remember which.
 */
export function researchExport() {
  return {
    format: 'english-teach/research/1',
    exportedAt: new Date().toISOString(),
    studyId: state.settings.studyId || null,
    settings: { ...state.settings },
    summary: research.summarise(state.log, state.progress),
    dailyCurve: research.dailyCurve(state.log),
    stats: state.stats,
    progress: state.progress,
    events: state.log
  };
}

export function clearLog() {
  state.log = [];
  save();
}

export function resetProgress() {
  state.progress = {};
  state.stats = clone(DEFAULTS.stats);
  state.log = [];
  save();
}

/** Words the learner has answered correctly at least twice and never recently missed. */
export function knownWords(pool) {
  return pool.filter((w) => {
    const s = wordStat(w.id);
    return s.ok >= 2 && s.ok > s.bad;
  });
}

/**
 * Weighted pick, driven by the review schedule.
 *
 * Anything whose review has come due outranks anything else, including words
 * never seen - going stale is a loss, meeting something new is only an
 * opportunity, and there is always more new material than there is time.
 * `exclude` (the last few items) is avoided so nothing repeats back-to-back.
 */
export function chooseTarget(pool, exclude = []) {
  const now = Date.now();
  const candidates = pool.filter((w) => !exclude.includes(w.id));
  const usable = candidates.length ? candidates : pool;

  const scored = usable.map((w) => ({ w, weight: review.priority(wordStat(w.id), now) }));

  const total = scored.reduce((sum, s) => sum + s.weight, 0);
  let r = Math.random() * total;
  for (const s of scored) {
    r -= s.weight;
    if (r <= 0) return s.w;
  }
  return scored[scored.length - 1].w;
}

/** A deck ordered for a session: due first, then unseen, then the rest. */
export function sessionDeck(pool) {
  return review.reviewOrder(pool, wordStat);
}

/** How many items in `pool` are waiting for review right now. */
export function dueNow(pool) {
  return review.dueCount(pool, wordStat);
}

/** How many answer choices to show, based on recent accuracy. */
export function choiceCount() {
  const fixed = state.settings.choices;
  if (fixed !== 'auto') return Number(fixed);
  const { answers, correct } = state.stats;
  if (answers < 10) return 2;
  const acc = correct / answers;
  if (acc > 0.85 && answers > 40) return 4;
  if (acc > 0.7) return 3;
  return 2;
}
