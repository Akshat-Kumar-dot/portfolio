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
   5. Nothing worked out the moment it's first needed. The first frame
      the globe was drawn in took a quarter of a second — its shaders
      worked out, its pictures sent to the graphics chip, just as it
      rose out of the hands. That's all done while the landing is up.
   6. The same frame isn't drawn twice. Looking at a card inside the
      globe, nothing moves: the frame would be the one on the screen.
   7. A light that's out doesn't cost anything: the glow between the
      closed hands is taken out of the lighting while it's dark.
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

/* the hands only breathe once they're open and the globe has risen clear of them — a fraction of a millimetre a
   second — so then their shadow is worked out afresh only every this many frames (it can't be told apart) */
export const STILL_SHADOW_EVERY = 3;

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

/* ---------- 5. made ready before it's needed ----------
   The shaders for everything in the scene, in the background — both ways it can be lit (`lights` on, and out: 7) —
   and then, a step at a time from the frame loop (step(), only while the page is still: each can take a moment),
   each material drawn once on its own at a single pixel, what's out of sight too (`show`: the hands below the screen,
   the globe inside them), so its pictures go up to the graphics chip; last, everything with its shadows, for the
   shadows' own shaders. Each is rubbed out before it's ever seen. (All in one go it was half a second — just as
   you'd start to scroll.) */
const ALONE = 31;                                             // the layer a step draws on: just the one thing
export function prepare(renderer, scene, camera, { show = [], lights = [] } = {}) {
  const state = { ready: false, done: false };
  const seen = new Set(), todo = [];                         // one of each material (then the shadows)
  for (const root of show) root.traverse(o => { if (o.isMesh && o.visible && !seen.has(o.material)) { seen.add(o.material); todo.push(o); } });
  todo.push(null);
  (async () => {
    // a material at a time, a frame apart — all at once, just setting them going held the page up for a moment
    for (const on of [true, false]) for (const o of todo) {
      if (!o) continue;
      for (const l of lights) l.visible = on;                   // (the frame loop sets them back as it needs them)
      await renderer.compileAsync(o, camera, scene).catch(() => {});
      await new Promise(r => requestAnimationFrame(r));
    }
    state.ready = true;
  })();
  state.step = () => {
    const one = todo.shift(), was = show.map(o => o.visible), culled = [];
    scene.traverse(o => { if (o.isMesh && o.frustumCulled) { culled.push(o); o.frustumCulled = false; } });
    for (const o of show) o.visible = true;
    const lit = [];
    if (one) {                                                // just this one (and the lights, so it's lit as ever)
      camera.layers.set(ALONE); one.layers.enable(ALONE);
      scene.traverse(o => { if (o.isLight) { lit.push(o); o.layers.enable(ALONE); } });
    } else renderer.shadowMap.needsUpdate = true;
    renderer.setScissorTest(true); renderer.setScissor(0, 0, 1, 1);
    renderer.render(scene, camera);
    renderer.setScissorTest(false);
    renderer.clear();
    if (one) { camera.layers.set(0); one.layers.disable(ALONE); for (const l of lit) l.layers.disable(ALONE); }
    show.forEach((o, i) => { o.visible = was[i]; });
    for (const o of culled) o.frustumCulled = true;
    state.done = !todo.length;
  };
  return state;
}

/* ---------- 6. the same frame isn't drawn twice ----------
   A canvas that isn't drawn to keeps showing what it showed. So when nothing in the frame has moved — the camera,
   `object` (the globe), the canvas's size, and `still` (what can't be read from where things are: the globe's own
   turning, its pictures; the hands, always breathing, out of view) — it isn't drawn again. forget(): the canvas has
   been drawn on or cleared some other way */
export function createRedraw(renderer, camera) {
  let was = [], now = [], held = false;
  return {
    needed(still, object) {
      let i = 0;
      for (const x of camera.matrixWorld.elements) now[i++] = x;
      for (const x of camera.projectionMatrix.elements) now[i++] = x;
      now[i++] = renderer.domElement.width; now[i++] = renderer.domElement.height; now[i++] = renderer.getPixelRatio();
      if (object) {
        const { position: p, quaternion: q, scale: s } = object;
        now[i++] = object.visible ? 1 : 0;
        now[i++] = p.x; now[i++] = p.y; now[i++] = p.z; now[i++] = q.x; now[i++] = q.y; now[i++] = q.z; now[i++] = q.w;
        now[i++] = s.x; now[i++] = s.y; now[i++] = s.z;
      }
      now.length = i;
      let same = held && still && i === was.length;
      for (let k = 0; same && k < i; k++) same = now[k] === was[k];
      const t = was; was = now; now = t; held = true;           // (the two take turns: nothing made each frame)
      return !same;
    },
    forget() { held = false; }
  };
}
