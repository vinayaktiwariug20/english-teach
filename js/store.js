// Local progress and settings. Nothing leaves the device; there is no account
// and no network call anywhere in this app.

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
    categories: null      // null = all enabled, else array of category ids
  },
  // item id -> { seen, ok, bad, last }
  progress: {},
  stats: { sessions: 0, answers: 0, correct: 0 }
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
    return {
      settings: { ...DEFAULTS.settings, ...(parsed.settings || {}) },
      progress: parsed.progress || {},
      stats: { ...DEFAULTS.stats, ...(parsed.stats || {}) }
    };
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
  return state.progress[id] || { seen: 0, ok: 0, bad: 0, last: 0 };
}

export function noteSeen(id) {
  const s = wordStat(id);
  s.seen += 1;
  s.last = Date.now();
  state.progress[id] = s;
  save();
}

export function noteAnswer(id, correct) {
  const s = wordStat(id);
  s.seen += 1;
  s.last = Date.now();
  if (correct) s.ok += 1;
  else s.bad += 1;
  state.progress[id] = s;
  state.stats.answers += 1;
  if (correct) state.stats.correct += 1;
  save();
}

export function resetProgress() {
  state.progress = {};
  state.stats = clone(DEFAULTS.stats);
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
 * Weighted pick: unseen words first, then ones recently answered wrong, then
 * everything else. Avoids `exclude` (the last few items) so nothing repeats
 * back-to-back.
 */
export function chooseTarget(pool, exclude = []) {
  const candidates = pool.filter((w) => !exclude.includes(w.id));
  const usable = candidates.length ? candidates : pool;

  const scored = usable.map((w) => {
    const s = wordStat(w.id);
    let weight;
    if (s.seen === 0) weight = 10;          // never shown: highest priority
    else if (s.bad > s.ok) weight = 8;      // struggling: bring it back
    else if (s.ok < 3) weight = 4;          // still learning
    else weight = 1;                        // solid: occasional review
    return { w, weight };
  });

  const total = scored.reduce((sum, s) => sum + s.weight, 0);
  let r = Math.random() * total;
  for (const s of scored) {
    r -= s.weight;
    if (r <= 0) return s.w;
  }
  return scored[scored.length - 1].w;
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
