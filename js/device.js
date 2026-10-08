/* ============================================================
   DEVICE — how much this device can take. A computer gets the full
   version; a phone a lighter one (a smaller shadow, fewer notes in the
   graph), still drawn as sharp as its screen: the 3D at its own pixels
   (up to 3 to the point, 2.5 on a phone with less memory), edges
   smoothed, the project cards at full size. A phone with 2 GB of memory or less lighter
   still. (Browsers round memory down — a 6 GB phone says 4 — and most
   phones report 8 cores, so it's memory that tells a budget phone.) On a phone, main.js also watches the frame rate and
   trims the 3D resolution if it's struggling. A computer always gets
   full quality: its frame rate can be capped for reasons that have
   nothing to do with its power (Chrome's Energy Saver holds pages to
   30 fps on battery), so it isn't a reason to draw fewer pixels.

   Add ?tier=low (or phone, or full) to the address to try one.
   ============================================================ */
const forced = new URLSearchParams(location.search).get('tier');
// a phone or tablet: says so, or touch is its only way in (a touch-screen laptop still has its trackpad)
export const HANDHELD = (navigator.userAgentData?.mobile ?? /Android|iPhone|iPod|Mobile/i.test(navigator.userAgent))
  || (matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches);
const memory = navigator.deviceMemory || 8, cores = navigator.hardwareConcurrency || 8;

export const TIER = ['full', 'phone', 'low'].includes(forced) ? forced
  : !HANDHELD ? (memory <= 2 ? 'low' : 'full')
  : memory <= 2 || cores <= 2 ? 'low' : 'phone';

// a phone that says it has 8 GB (the most a browser will ever say) — or doesn't say, as an iPhone doesn't: a phone
// whose screen is as sharp as they come (about 3 pixels to the point), drawn at that
const big = memory >= 8;
export const PERF = {
  //        3D pixels  smoothing  shadow map     cover textures  hand detail  graph notes  2D canvases  texture filtering  trim when slow
  full:  { dpr: 2,    aa: true,  shadow: 2048, softShadow: true,  cover: 1,    subdiv: 2,   notes: Infinity, canvasDpr: 2,   aniso: 16, adapt: false },
  phone: { dpr: big ? 3 : 2.5, aa: true, shadow: 1024, softShadow: false, cover: 1, subdiv: big ? 2 : 1, notes: 700, canvasDpr: big ? 3 : 2.5, aniso: 8, adapt: true },
  low:   { dpr: 1.75, aa: false, shadow: 1024, softShadow: false, cover: 0.75, subdiv: 1,   notes: 420,      canvasDpr: 1.75, aniso: 4,  adapt: true }
}[TIER];

document.documentElement.dataset.tier = TIER;
