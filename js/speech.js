// Text-to-speech wrapper around the Web Speech API.
//
// Everything here degrades quietly. If a language has no installed voice we
// simply stay silent for that language rather than reading Devanagari with an
// English voice, which is worse than nothing. The caregiver screen surfaces
// what is actually available.

let voices = [];
let unlocked = false;

const listeners = new Set();

function loadVoices() {
  if (!('speechSynthesis' in window)) return;
  const next = window.speechSynthesis.getVoices();
  if (next && next.length) {
    voices = next;
    listeners.forEach((fn) => fn());
  }
}

if ('speechSynthesis' in window) {
  loadVoices();
  window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
  // Some Chrome builds only populate voices after a few hundred ms.
  setTimeout(loadVoices, 300);
  setTimeout(loadVoices, 1200);
}

export function onVoicesChanged(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function isSupported() {
  return 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
}

/** All voices whose language tag starts with `prefix` (e.g. "hi", "en"). */
export function voicesFor(prefix) {
  return voices.filter((v) => (v.lang || '').toLowerCase().startsWith(prefix));
}

/**
 * Rank a voice. Higher is better.
 *
 * Quality leads. The modern neural voices (Chrome's Google set, and the
 * "Natural"/"Neural" system voices) are markedly better than the legacy SAPI5
 * ones, and better speech is worth more here than guaranteed offline speech -
 * most listening happens with a connection, and speak() falls back to a local
 * voice when there isn't one. Accent is deliberately not scored: there is no
 * reason to prefer Indian-accented English over any other good voice.
 */
function scoreVoice(v) {
  let score = 0;
  if (/natural|neural|enhanced|premium/i.test(v.name)) score += 40;
  if (/^google/i.test(v.name)) score += 30;
  if (v.localService) score += 3; // tiebreak only
  return score;
}

function pickVoice(lang, preferredName, { requireLocal = false } = {}) {
  const prefix = lang.slice(0, 2).toLowerCase();
  let pool = voicesFor(prefix);
  if (requireLocal) pool = pool.filter((v) => v.localService);
  if (!pool.length) return null;
  if (preferredName && !requireLocal) {
    const named = pool.find((v) => v.name === preferredName);
    if (named) return named;
  }
  return pool.reduce((best, v) => (scoreVoice(v) > scoreVoice(best) ? v : best));
}

/** The voice that would actually be used - so the UI can describe it. */
export function resolveVoice(lang, preferredName) {
  return pickVoice(lang, preferredName);
}

/** Whether a local voice exists to fall back to when the network is gone. */
export function hasLocalVoice(prefix) {
  return voicesFor(prefix).some((v) => v.localService);
}

export function hasVoiceFor(prefix) {
  return voicesFor(prefix).length > 0;
}

/**
 * Speak `text`. Returns a promise that settles when speech finishes (or
 * immediately if we cannot speak it).
 */
export function speak(text, {
  lang = 'en-US', rate = 0.85, voiceName = null, volume = 1, preferLocal = false
} = {}) {
  return new Promise((resolve) => {
    if (!isSupported() || !text) return resolve(false);

    // A cloud voice cannot speak with no connection. Go straight to a local
    // voice when the browser already knows it is offline, and fall back again
    // if the attempt errors anyway (navigator.onLine is optimistic - it only
    // reports whether there is a network, not whether it works).
    const offline = navigator.onLine === false;
    let voice = pickVoice(lang, voiceName, { requireLocal: offline || preferLocal });
    if (!voice) voice = pickVoice(lang, voiceName);
    if (!voice) return resolve(false); // No voice for this language: stay silent.

    try {
      // Only cancel if something is actually queued. An unconditional cancel()
      // before every utterance measurably delays the next one on Android.
      const synth = window.speechSynthesis;
      if (synth.speaking || synth.pending) synth.cancel();
    } catch (_) {
      /* ignore */
    }

    let done = false;
    let usedFallback = false;

    const say = (chosen) => {
      const u = new SpeechSynthesisUtterance(text);
      u.voice = chosen;
      u.lang = chosen.lang;
      u.rate = rate;
      u.pitch = 1;
      u.volume = Math.max(0, Math.min(1, volume));

      const finish = (ok) => {
        if (done) return;
        done = true;
        resolve(ok);
      };

      u.onend = () => finish(true);
      u.onerror = () => {
        // Most likely a network voice with no network. Try once more locally.
        if (!usedFallback && !chosen.localService) {
          const local = pickVoice(lang, null, { requireLocal: true });
          if (local) {
            usedFallback = true;
            say(local);
            return;
          }
        }
        finish(false);
      };

      // Chrome occasionally drops onend; make sure callers never hang.
      setTimeout(() => finish(true), Math.max(2500, text.length * 140));

      window.speechSynthesis.speak(u);
    };

    say(voice);
  });
}

export function stop() {
  if (!isSupported()) return;
  try {
    window.speechSynthesis.cancel();
  } catch (_) {
    /* ignore */
  }
}

/**
 * Browsers block speech until a user gesture. Call this from the first tap so
 * later automatic prompts are allowed to play.
 */
export function unlock() {
  if (unlocked || !isSupported()) return;
  unlocked = true;
  try {
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    window.speechSynthesis.speak(u);
  } catch (_) {
    /* ignore */
  }
  loadVoices();
}

// ---------------------------------------------------------------------------
// Simple synthesised tones, so we need no audio files and stay fully offline.
// ---------------------------------------------------------------------------

let ctx = null;
function audioCtx() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  return ctx;
}

function tone(freq, startAt, duration, gainPeak = 0.14) {
  const ac = audioCtx();
  if (!ac) return;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  const t0 = ac.currentTime + startAt;
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(gainPeak, t0 + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

export function chimeCorrect() {
  tone(660, 0, 0.18);
  tone(880, 0.1, 0.3);
}

/** Deliberately soft and neutral: a nudge, never a buzzer. */
export function chimeRetry() {
  tone(330, 0, 0.16, 0.07);
}

export function chimeCelebrate() {
  tone(660, 0, 0.16);
  tone(880, 0.12, 0.16);
  tone(1040, 0.24, 0.34);
}
