/* Small shared helpers. */

export const TAU = Math.PI * 2;
export const DEG = 180 / Math.PI;

export const $ = id => document.getElementById(id);
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const pad = v => String(v).padStart(2, '0');

/* smoothstep across a [start, end] range */
export const sm = (range, t) => {
  const x = clamp((t - range[0]) / (range[1] - range[0]), 0, 1);
  return x * x * (3 - 2 * x);
};

/* cubic ease-in-out on 0..1 */
export const eio = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/* seeded random stream — same seed, same sequence */
export function rng(seed) {
  let a = 2166136261;
  for (let i = 0; i < seed.length; i++) { a ^= seed.charCodeAt(i); a = Math.imul(a, 16777619); }
  return () => {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/* stable 0..1 value for a key */
export function hash01(key) {
  let a = 2166136261;
  for (let q = 0; q < key.length; q++) { a ^= key.charCodeAt(q); a = Math.imul(a, 16777619); }
  return (a >>> 0) / 4294967296;
}

export const prefersReducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
export const hasFinePointer = () => matchMedia('(hover: hover) and (pointer: fine)').matches;
