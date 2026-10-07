/* ============================================================
   DEVICE — how much this device can take. A computer gets the full
   version; a phone a lighter one (fewer pixels, smaller textures, no
   edge smoothing — its screen is sharp enough — fewer notes in the
   graph); a phone with 4 GB of memory or less (most budget phones)
   lighter still. On a phone, main.js also watches the frame rate and
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
  : memory <= 4 || cores <= 4 ? 'low' : 'phone';

export const PERF = {
  //        3D pixels  smoothing  shadow map     cover textures  hand detail  graph notes  2D canvases  texture filtering  trim when slow
  full:  { dpr: 2,    aa: true,  shadow: 2048, softShadow: true,  cover: 1,    subdiv: 2,   notes: Infinity, canvasDpr: 2,   aniso: 16, adapt: false },
  phone: { dpr: 1.5,  aa: false, shadow: 1024, softShadow: false, cover: 0.5,  subdiv: 1,   notes: 700,      canvasDpr: 1.75, aniso: 4,  adapt: true },
  low:   { dpr: 1.25, aa: false, shadow: 1024, softShadow: false, cover: 0.5,  subdiv: 1,   notes: 420,      canvasDpr: 1.5,  aniso: 2,  adapt: true }
}[TIER];

document.documentElement.dataset.tier = TIER;
