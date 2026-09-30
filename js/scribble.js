/* ============================================================
   SCRIBBLE — a pen line drawn by hand: uneven, pressing harder in
   places, thin where the pen lands and lifts.

   A path is made once, in unit space, from a seed, then mapped onto
   whatever it circles each frame (it follows the shape if that moves).
   Draw any stretch of it: [from, to] as fractions of its length, so it
   can be drawn on (to: 0 → 1) and rubbed out again (from: 0 → 1).
   ============================================================ */
import { TAU, clamp, rng } from './utils.js';

const INK = '#1d1b17';
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

/* a loose loop round a shape, as a pen circles something on paper:
   turns   how many times round (2 ≈ the double loop in the reference)
   start   where the pen lands, radians (0 = right, π/2 = bottom — screen space, clockwise)
   n       2 = ellipse; higher hugs a rectangle more closely (a card)
   Returns points {u, v, w}: u, v ≈ −1..1 around the shape's centre, w = pen pressure 0..1 */
export function loop(seed, { turns = 2.05, start = 1.05, n = 2, wobble = 1 } = {}) {
  const r = rng('loop' + seed);
  const ph = Array.from({ length: 6 }, () => r() * TAU);
  const drift = [(r() - 0.5) * 0.05, (r() - 0.5) * 0.05];
  const N = Math.round(150 * turns);
  const pts = [];
  for (let i = 0; i <= N; i++) {
    const s = i / N, th = start + s * turns * TAU;
    // each pass lands a little off the last: slow swell, lumps, a slight lean
    let k = 1 + wobble * (0.045 * Math.sin(s * TAU * 0.8 + ph[0]) + 0.02 * Math.sin(th * 2 + ph[1]) + 0.01 * Math.sin(th * 5 + ph[2]));
    k *= 1 - 0.07 * (1 - smooth(0, 0.07, s));              // the pen lands just inside…
    k *= 1 + 0.2 * smooth(0.9, 1, s) ** 1.6;                // …and flicks outward as it lifts
    const c = Math.cos(th), sn = Math.sin(th), e = 2 / n;
    const u = Math.sign(c) * Math.abs(c) ** e, v = Math.sign(sn) * Math.abs(sn) ** e;
    pts.push({
      u: u * k + drift[0] * Math.sin(s * Math.PI),
      v: v * k + drift[1] * Math.sin(s * Math.PI + 1),
      w: pressure(s, ph)
    });
  }
  return pts;
}

function pressure(s, ph) {
  const taper = 0.18 + 0.82 * smooth(0, 0.05, s) * (1 - smooth(0.88, 1, s));
  return taper * (0.8 + 0.12 * Math.sin(s * 23 + ph[3]) + 0.08 * Math.sin(s * 57 + ph[4]));
}

/* draw [from, to] of a path onto a 2D context.
   map(u, v) → [x, y] in canvas pixels; width = full pen width in pixels */
export function draw(ctx, pts, map, from, to, width, color = INK) {
  if (to - from <= 1e-4) return;
  const P = pts.map(p => map(p.u, p.v));
  const L = [0];                                            // length so far, for [from, to]
  for (let i = 1; i < P.length; i++) L.push(L[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
  const total = L[L.length - 1], a = from * total, b = to * total;

  ctx.save();
  ctx.strokeStyle = ctx.fillStyle = color;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  // strokes grouped by width, so a few hundred segments cost a handful of calls
  let cur = -1;
  const flush = () => { if (cur >= 0) ctx.stroke(); };
  for (let i = 1; i < P.length; i++) {
    if (L[i] < a || L[i - 1] > b) continue;
    const t0 = Math.max(0, (a - L[i - 1]) / (L[i] - L[i - 1] || 1)), t1 = Math.min(1, (b - L[i - 1]) / (L[i] - L[i - 1] || 1));
    const x0 = P[i - 1][0] + (P[i][0] - P[i - 1][0]) * t0, y0 = P[i - 1][1] + (P[i][1] - P[i - 1][1]) * t0;
    const x1 = P[i - 1][0] + (P[i][0] - P[i - 1][0]) * t1, y1 = P[i - 1][1] + (P[i][1] - P[i - 1][1]) * t1;
    const w = Math.max(0.6, width * (pts[i].w + pts[i - 1].w) / 2);
    const q = Math.round(w * 4);
    if (q !== cur) { flush(); cur = q; ctx.lineWidth = q / 4; ctx.beginPath(); }
    ctx.moveTo(x0, y0); ctx.lineTo(x1, y1);
  }
  flush();
  ctx.restore();
}
