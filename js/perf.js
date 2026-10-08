/* ============================================================
   PERF — what keeps it smooth, in one place. Worked out by stepping
   through the whole story in a phone-sized window, part by part, and
   timing every frame: the script, and the 3D to when the graphics
   chip had finished it (README, "Keeping it smooth").

   1. Layout is measured when the page changes, never mid-frame. A
      frame that restyles the page and then asks where something is
      makes the browser lay the whole page out again, there and then —
      and the scrolling asked several times a frame. box(el) keeps
      where an element sits in the page until the page changes size.
   2. Shadows only where they show. The globe's cards cast one only
      while the globe is low in the hands — by the time it's 40% risen
      not one pixel of it reaches them (measured) — and the hands cast
      theirs from a lighter copy of themselves (hands.js). Together
      that's well over a third of every frame with the globe out.
   3. The 3D isn't drawn when there's nothing of it to see (main.js).
   4. Never below the screen's own sharpness. A computer draws above it
      (SUPERSAMPLE) and, should it struggle, eases down to the screen's
      own pixels but no further; a phone draws at its screen's own and
      stays there. Only a budget phone trims below that (governor).
   ============================================================ */
import { PERF } from './device.js';

/* ---------- 1. where things are, measured once per layout ---------- */
let epoch = 0;
const boxes = new WeakMap();
/* el's place in the page (document coordinates, so it holds while the page scrolls) */
export function box(el) {
  let b = boxes.get(el);
  if (!b || b.epoch !== epoch) {
    const r = el.getBoundingClientRect();
    b = { top: r.top + scrollY, left: r.left + scrollX, width: r.width, height: r.height, epoch };
    boxes.set(el, b);
  }
  return b;
}
/* the page has changed: measure again, the next time anything asks */
export function relayout() { epoch++; }
addEventListener('resize', relayout);
document.fonts?.ready.then(relayout);
if (window.ResizeObserver) new ResizeObserver(relayout).observe(document.body);   // something grew or shrank

/* ---------- 2. shadows ---------- */
/* the globe's cards cast a shadow on the hands only while it's this far risen, or less */
export const CARD_SHADOW_UNTIL = 0.45;

/* the hands' shadows, cast by lighter copies of them (hands.js: the same skeleton, a step less smoothing). The 3D
   library draws a shadow from whatever the camera would draw, so for that one pass each copy (inside its hand)
   is shown and casts, and the hand itself doesn't; then the copy steps back out of sight: [{ shown, caster }] */
export function castFromCopies(renderer, pairs) {
  const shadows = renderer.shadowMap, draw = shadows.render.bind(shadows);
  shadows.render = (...a) => {
    for (const p of pairs) { p.caster.visible = true; p.shown.castShadow = false; }
    try { draw(...a); }
    finally { for (const p of pairs) { p.caster.visible = false; p.shown.castShadow = true; } }
  };
}

/* ---------- 4. how sharp the 3D is drawn ---------- */
/* stage.js: the pixel ratio to draw at, given how far the governor has trimmed it (quality 0.5 … 1) */
export function pixelRatio(quality) {
  const screen = devicePixelRatio || 1;
  const top = Math.min(screen * PERF.supersample, PERF.dpr);              // where it starts
  const floor = PERF.adapt === 'screen' ? Math.min(screen, top) : PERF.adapt ? Math.min(screen, 1) : top;
  return Math.max(floor, top * quality);
}

/* the governor: every second, the average frame time. Slower than about 42 frames a second
   and the 3D is drawn at fewer pixels, a step at a time, down to its floor (above); back at a
   steady 60 for a few seconds and it steps back up — but not again to a level that proved too
   slow straight after stepping up to it, so it settles instead of see-sawing */
export function createGovernor(stage) {
  const gov = { t: 0, n: 0, calm: 0, ceil: 1, raised: -1e9, from: performance.now() + 2500 };   // not while it's starting up
  addEventListener('visibilitychange', () => { gov.t = gov.n = 0; gov.from = performance.now() + 1000; });
  return {
    wait(ms) { gov.from = performance.now() + ms; },
    tick(dt, now) {
      if (!PERF.adapt || dt > 0.25 || now < gov.from) return;               // a hiccup (a tab switch, a load), not the pace
      gov.t += dt; gov.n++;
      if (gov.t < 1) return;
      const ms = gov.t / gov.n * 1000, q = stage.quality;
      gov.t = gov.n = 0;
      if (ms > 24 && q > 0.5) {
        if (now - gov.raised < 5000) gov.ceil = q * 0.97;   // just stepped up to this, and it's too much
        stage.setQuality(Math.max(0.5, q * 0.85)); gov.calm = 0;
      } else if (ms < 18 && q < gov.ceil) {
        if (++gov.calm >= 4) { gov.calm = 0; gov.raised = now; stage.setQuality(Math.min(gov.ceil, q / 0.9)); }
      }
      else gov.calm = 0;
    }
  };
}
