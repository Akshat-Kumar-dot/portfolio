/* ============================================================
   DEVICE — how much this device can take. A computer gets the full
   version; a phone a lighter one (fewer pixels, smaller textures, no
   edge smoothing — its screen is sharp enough — fewer notes in the
   graph); a phone with 4 GB of memory or less (most budget phones)
   lighter still. On top of that, main.js watches the frame rate and
   trims the 3D resolution if the device is struggling.

   Add ?tier=low (or phone, or full) to the address to try one.
   ============================================================ */
const forced = new URLSearchParams(location.search).get('tier');
const coarse = matchMedia('(pointer: coarse)').matches;          // a touch screen is the main input
const memory = navigator.deviceMemory || 8, cores = navigator.hardwareConcurrency || 8;

export const TIER = ['full', 'phone', 'low'].includes(forced) ? forced
  : !coarse ? (memory <= 2 ? 'low' : 'full')
  : memory <= 4 || cores <= 4 ? 'low' : 'phone';

export const PERF = {
  //        3D pixels  smoothing  shadow map     cover textures  hand detail  graph notes  2D canvases  texture filtering
  full:  { dpr: 2,    aa: true,  shadow: 2048, softShadow: true,  cover: 1,    subdiv: 2,   notes: Infinity, canvasDpr: 2,   aniso: 16 },
  phone: { dpr: 1.5,  aa: false, shadow: 1024, softShadow: false, cover: 0.5,  subdiv: 1,   notes: 700,      canvasDpr: 1.75, aniso: 4 },
  low:   { dpr: 1.25, aa: false, shadow: 1024, softShadow: false, cover: 0.5,  subdiv: 1,   notes: 420,      canvasDpr: 1.5,  aniso: 2 }
}[TIER];

document.documentElement.dataset.tier = TIER;
