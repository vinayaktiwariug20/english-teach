// An event log, and the summaries a study needs from it.
//
// The progress store answers "what does this learner know now". A study asks
// different questions - did they improve, how much practice did it take, does
// anything stick a week later - and none of them can be answered from a running
// total. They need one row per answer, with when it happened.
//
// Two things this deliberately does NOT do.
//
// It does not phone home. The app has never made a network call and has no
// account, which is a large part of why it is usable at all; a study is not a
// reason to change that. Data leaves a device when a person presses Export and
// gets a file, and not otherwise.
//
// It records no names. The only identifier is a study code the researcher types
// in - "GS1-014" - and the mapping from that to a child stays on paper, in the
// school, in whatever the ethics approval says. Nothing here can identify
// anyone on its own.

// Roughly a megabyte of localStorage at ~70 bytes an event, which is months of
// daily use. The oldest go first, so a long study loses its beginning rather
// than stopping dead - and the summary is recomputed from what remains.
export const MAX_EVENTS = 15000;

/** A gap longer than this between answers is someone putting the phone down. */
const IDLE_MS = 60 * 1000;

/** Keys are short because fifteen thousand of them share one storage quota. */
export function makeEvent({ t, mode, id, correct, ms, attempt, box, overdueDays, level }) {
  const e = { t, m: mode, i: id, c: correct ? 1 : 0 };
  if (ms != null) e.ms = ms;
  if (attempt != null) e.a = attempt;
  if (box != null) e.b = box;
  if (overdueDays != null) e.g = overdueDays;
  if (level != null) e.lv = level;
  return e;
}

export function append(log, event) {
  log.push(event);
  if (log.length > MAX_EVENTS) log.splice(0, log.length - MAX_EVENTS);
  return log;
}

const day = (t) => new Date(t).toISOString().slice(0, 10);

function accuracy(rows) {
  if (!rows.length) return null;
  return rows.filter((e) => e.c).length / rows.length;
}

/**
 * Time actually spent answering, rather than elapsed time.
 *
 * Summing first-to-last would count a phone left on a desk overnight. Each gap
 * between consecutive answers is counted, capped at a minute: a child thinking
 * for forty seconds is practice, a gap of two hours is not.
 */
function activeMinutes(rows) {
  let ms = 0;
  for (let i = 1; i < rows.length; i++) {
    ms += Math.min(rows[i].t - rows[i - 1].t, IDLE_MS);
  }
  return Math.round(ms / 60000);
}

function median(xs) {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

/**
 * The numbers a paper would report.
 *
 * `firstTry` is the one to use as the outcome. Overall accuracy counts every
 * tap, so a question got wrong once and then right scores 50% - fine as
 * feedback for a caregiver, wrong as a measure, because it moves when a learner
 * changes how freely they guess rather than when they learn something.
 */
export function summarise(log, progress = {}) {
  const rows = [...log].sort((a, b) => a.t - b.t);
  const firstAttempts = rows.filter((e) => e.a == null || e.a === 1);
  const days = new Set(rows.map((e) => day(e.t)));

  const byMode = {};
  for (const e of rows) {
    const m = (byMode[e.m] ||= { answers: 0, correct: 0, first: 0, firstCorrect: 0 });
    m.answers += 1;
    if (e.c) m.correct += 1;
    if (e.a == null || e.a === 1) {
      m.first += 1;
      if (e.c) m.firstCorrect += 1;
    }
  }
  for (const m of Object.values(byMode)) {
    m.accuracy = m.answers ? m.correct / m.answers : null;
    m.firstTry = m.first ? m.firstCorrect / m.first : null;
  }

  // Retention: items met again after at least a day away. This is the one
  // measure here that says anything about learning rather than performance,
  // and the review schedule produces it for nothing.
  const returned = firstAttempts.filter((e) => e.g != null && e.g >= 1);

  const boxes = Object.values(progress).map((p) => p.box || 0);

  return {
    events: rows.length,
    firstDay: rows.length ? day(rows[0].t) : null,
    lastDay: rows.length ? day(rows[rows.length - 1].t) : null,
    daysActive: days.size,
    activeMinutes: activeMinutes(rows),
    answers: rows.length,
    accuracy: accuracy(rows),
    firstTryAccuracy: accuracy(firstAttempts),
    medianResponseMs: median(rows.filter((e) => e.ms != null).map((e) => e.ms)),
    byMode,
    retention: {
      n: returned.length,
      accuracy: accuracy(returned)
    },
    itemsSeen: Object.keys(progress).length,
    itemsMastered: boxes.filter((b) => b >= 4).length
  };
}

/**
 * Accuracy per day, for a learning curve.
 *
 * First attempts only, and days with too few answers to mean anything are kept
 * but marked, because dropping them quietly would flatter the curve.
 */
export function dailyCurve(log) {
  const byDay = new Map();
  for (const e of log) {
    if (e.a != null && e.a !== 1) continue;
    const d = day(e.t);
    if (!byDay.has(d)) byDay.set(d, { day: d, n: 0, correct: 0 });
    const row = byDay.get(d);
    row.n += 1;
    if (e.c) row.correct += 1;
  }
  return [...byDay.values()]
    .sort((a, b) => a.day.localeCompare(b.day))
    .map((r) => ({ ...r, accuracy: r.correct / r.n, sparse: r.n < 10 }));
}

const CSV_COLUMNS = [
  'study_id', 'timestamp', 'date', 'mode', 'item', 'correct',
  'attempt', 'response_ms', 'leitner_box', 'overdue_days', 'level'
];

function csvCell(v) {
  if (v == null) return '';
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** One row per answer. Opens in Excel, reads into R or SPSS without fuss. */
export function toCsv(log, studyId) {
  const lines = [CSV_COLUMNS.join(',')];
  for (const e of [...log].sort((a, b) => a.t - b.t)) {
    lines.push([
      studyId || '', new Date(e.t).toISOString(), day(e.t), e.m, e.i, e.c,
      e.a ?? '', e.ms ?? '', e.b ?? '', e.g ?? '', e.lv ?? ''
    ].map(csvCell).join(','));
  }
  return lines.join('\n');
}
