/* ============================================================
   SCROLL — smooth scrolling, the way extrafazant.nl does it: Lenis
   turns every turn of the wheel or trackpad swipe into a glide. The
   page eases toward where you've scrolled instead of jumping there,
   so even a quick flick travels at a pace you can follow, slowing
   into place. Touch keeps the phone's own scrolling.

   Same settings as theirs: lerp 0.165 (how much of the remaining
   distance it covers each frame), wheel steps ×1.25.

   The page's own wheel handling comes first (zooming the notes graph,
   a sideways swipe along a row of the globe): whatever that takes
   (preventDefault), Lenis leaves alone. Up and down is always the
   page's. For visitors who ask for reduced motion it stays off.

   One thing theirs doesn't need: a speed limit for hard flicks (FLICK).
   An ordinary swipe or a few clicks of the wheel go exactly as far as
   they always would. A hard flick — the wheel spun, or a trackpad fling
   that keeps coming for a second or two — moves about a screen and a
   half, then carries on at a steady pace for as long as it lasts,
   instead of throwing you to the bottom of the page. Stop for a moment,
   or turn round, and the next swipe is free again.

   And places the page lands on (landOn): a scroll down that would carry
   on past one comes to rest exactly there instead, easing in, and stays
   a beat (LAND) before scrolling moves on — like an app that's opened.

   Use jumpTo / glideTo for any scrolling done in code, so Lenis knows.
   ============================================================ */
import Lenis from 'lenis';

/* free: screens one swipe moves before the limit starts; rate: screens a second after that,
   however hard you scroll; pause: ms of stillness that ends a swipe */
export const FLICK = { free: 1.6, rate: 0.8, pause: 220 };

/* resting on a landing place: `hold` ms — and the fading tail of the swipe that brought
   you there (a trackpad's momentum) is let go, for up to `most` ms. A fresh scroll, or
   the wheel still turning, moves on once the hold is over */
export const LAND = { hold: 220, most: 1400 };

let lenis = null;
const stops = [];
let landing = null, restFrom = -1e9, lastDown = -1e9, lastRaw = 0;

/* getY() → a scroll position the page comes to rest on, on the way down */
export function landOn(getY) { stops.push(getY); }
const listeners = [];

/* call fn whenever the page scrolls, in step with the frame the scroll is drawn in —
   for anything that has to line up exactly with the page as it moves */
export function onScroll(fn) { listeners.push(fn); }
const tell = () => { for (const fn of listeners) fn(); };

addEventListener('scroll', tell, { passive: true });

export function initSmoothScroll({ reduced = false } = {}) {
  if (reduced) return null;
  lenis = new Lenis({
    lerp: 0.165,
    wheelMultiplier: 1.25,
    smoothWheel: true,
    syncTouch: false,                    // phones: native scrolling, with its own momentum
    autoRaf: true,
    anchors: false,                      // the nav links are handled in main.js
    virtualScroll: data => {
      if (data.event.defaultPrevented) return false;          // taken by the page's own handling
      if (data.event.type === 'wheel') { const raw = Math.abs(data.deltaY); limitFlick(data); land(data, raw); }
      if (data.deltaY || data.deltaX) return true;
      data.event.preventDefault();                          // limited to nothing: nor may the browser scroll it
      return false;
    }
  });
  lenis.on('scroll', tell);
  lenis.on('scroll', () => {                                 // arrived: the rest begins
    if (landing !== null && Math.abs(lenis.animatedScroll - landing) < 1.5) { landing = null; restFrom = performance.now(); }
  });             // the frame Lenis moves the page in (the native event comes a frame later)
  return lenis;
}

/* each swipe has an allowance: it starts full, refills at FLICK.rate while the swipe
   goes on, and the swipe moves freely until it's nearly spent — then only as fast as
   it refills. Deltas arrive already in pixels (and ×wheelMultiplier) */
let allowance = 0, lastAt = -1e9, lastDir = 0;
function limitFlick(data) {
  const d = data.deltaY;
  if (!d) return;
  const now = performance.now(), H = innerHeight, full = FLICK.free * H, dir = Math.sign(d);
  if (now - lastAt > FLICK.pause || dir !== lastDir) allowance = full;               // a new swipe
  else allowance = Math.min(full, allowance + (now - lastAt) / 1000 * FLICK.rate * H);
  lastAt = now; lastDir = dir;
  const gain = Math.min(1, allowance / (full * 0.2));                               // eases off over the last fifth
  const take = Math.min(Math.abs(d) * gain, allowance);
  allowance -= take;
  data.deltaY = dir * take;
}

function land(data, raw) {
  const d = data.deltaY, now = performance.now();
  if (d < 0) { landing = null; restFrom = -1e9; return; }                       // turning back up is always free
  if (d === 0) return;
  const gap = now - lastDown, fading = gap < 250 && raw < lastRaw;              // the same swipe, dying away
  lastDown = now; lastRaw = raw;
  const rest = now - restFrom;
  if (rest < LAND.hold || (rest < LAND.most && fading)) { data.deltaY = 0; return; }   // resting on it
  const y = lenis.animatedScroll, t = lenis.targetScroll;
  for (const getY of stops) {
    const Y = getY();
    if (y < Y - 1.5 && t + d > Y) { data.deltaY = Math.max(0, Y - t); landing = Y; }   // would carry past it: stop there
  }
}

/* straight there, no glide — for jumps the eye shouldn't see */
export function jumpTo(y) {
  if (lenis) { lenis.resize(); lenis.scrollTo(y, { immediate: true, force: true }); }
  else scrollTo({ top: y, behavior: 'instant' });
}

/* a glide, taking longer the further it goes — for the nav links and the like */
export function glideTo(y) {
  const far = Math.abs(y - scrollY) / innerHeight, duration = Math.min(2.6, 0.8 + far * 0.28);
  if (!lenis) { scrollTo({ top: y, behavior: 'smooth' }); return; }
  lenis.resize();
  lenis.scrollTo(y, { duration, force: true });
}
