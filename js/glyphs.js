// Which emoji this device can actually draw.
//
// The app is used on Windows 10, whose Segoe UI Emoji stops short of Emoji 13,
// and on an old Android. A glyph the font does not have renders as a "tofu"
// box: plainly visible to the learner, and invisible to every test that reads
// text rather than pixels. Four words shipped that way - window, bucket,
// mirror and toothbrush are all Emoji 13 - and turned up only because a box
// appeared in a screenshot.
//
// Hard-coding those four would fix this device and not the next one, so the
// check is done at runtime against the font actually in use. A word whose
// picture cannot be drawn is dropped from the pools; it is better to know
// fewer words than to be shown a box and asked what it is.

let unsupported = null;

function measure() {
  const found = new Set();
  try {
    const cv = document.createElement('canvas');
    cv.width = 32;
    cv.height = 32;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    if (!ctx) return found;

    const draw = (text) => {
      ctx.clearRect(0, 0, 32, 32);
      ctx.font = '20px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
      ctx.textBaseline = 'top';
      ctx.fillText(text, 2, 2);
      return ctx.getImageData(0, 0, 32, 32).data.join(',');
    };

    // U+10FFFF is a noncharacter, so no font defines it: this is what a missing
    // glyph looks like. A blank result means nothing was drawn at all.
    const tofu = draw(String.fromCodePoint(0x10ffff));
    const blank = draw(' ');

    return { tofu, blank, draw, found };
  } catch (_) {
    return null; // no canvas: assume everything renders rather than hide words
  }
}

/** True if `glyph` draws as something other than a missing-glyph box. */
export function canRender(glyph) {
  if (!glyph) return true;
  if (unsupported === null) unsupported = measure();
  if (!unsupported || !unsupported.draw) return true;
  const shown = unsupported.draw(glyph);
  return shown !== unsupported.tofu && shown !== unsupported.blank;
}

/**
 * Drop words whose emoji this device cannot draw.
 *
 * Colours and numbers have no emoji and are always kept. Fails open: if the
 * measurement cannot run, every word stays.
 */
export function renderable(words) {
  const cache = new Map();
  const ok = (g) => {
    if (!cache.has(g)) cache.set(g, canRender(g));
    return cache.get(g);
  };
  const out = words.filter((w) => !w.emoji || ok(w.emoji));
  return out.length >= 4 ? out : words;
}

/** The ones that were dropped, for the caregiver screen. */
export function missingGlyphs(words) {
  return words.filter((w) => w.emoji && !canRender(w.emoji));
}
