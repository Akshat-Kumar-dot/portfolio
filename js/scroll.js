/* ============================================================
   SCROLL — smooth scrolling, the way extrafazant.nl does it: Lenis
   turns every turn of the wheel or trackpad swipe into a glide. The
   page eases toward where you've scrolled instead of jumping there,
   so even a quick flick travels at a pace you can follow, slowing
   into place. On a phone Lenis follows the finger too (syncTouch), with
   its own gentle momentum, so everything below holds there as well.

   Same settings as theirs: lerp 0.165 (how much of the remaining
   distance it covers each frame), wheel steps ×1.25.

   The page's own wheel handling comes first (zooming the notes graph,
   a sideways swipe along a row of the globe): whatever that takes
   (preventDefault), Lenis leaves alone. Up and down is always the
   page's. For visitors who ask for reduced motion it stays off.

   Everything on the page follows the scroll — nothing plays on by
   itself. What keeps the story's big moments from flying by is the
   scroll itself, in three ways:

   · speed zones (slowIn): over the stretches where the story plays —
     the dot falling, the globe rising, the zoom, the page going into
     its folder, Behind the scenes coming up — each has an allowance
     (`burst`, in screens) that an ordinary scroll never uses up; past
     it, the scroll goes no faster than the zone's speed, wheel, finger
     and fling alike, the allowance refilling at that speed. A hard
     flick there just moves through it at that speed, the animation in
     step with it — never ahead, never behind.
   · a speed limit for hard flicks elsewhere (FLICK): an ordinary swipe
     goes as far as it always would; a wheel spun or a trackpad fling
     moves about a screen and a half, then carries on at a steady pace.
   · places the page lands on (landOn): a scroll down that would carry
     on past one comes to rest exactly there, easing in, and stays a beat
     (LAND) before scrolling moves on — like an app that's opened.

   Use jumpTo / glideTo for any scrolling done in code, so Lenis knows.
   ============================================================ */
import Lenis from 'lenis';
import { HANDHELD } from './device.js';

/* free: screens one swipe moves before the limit starts; rate: screens a second after that,
   however hard you scroll; pause: ms of stillness that ends a swipe */
export const FLICK = { free: 1.6, rate: 0.8, pause: 220 };

/* resting on a landing place: `hold` ms — and the fading tail of the swipe that brought
   you there (a trackpad's momentum) is let go, for up to `most` ms. A fresh scroll, or
   the wheel still turning, moves on once the hold is over */
export const LAND = { hold: 220, most: 1400 };

const LERP = 0.165, TOUCH_LERP = 0.085;                       // the wheel's glide; a fling's
let lenis = null;
const stops = [], zones = [];
let landing = null, restFrom = -1e9, lastDown = -1e9, lastRaw = 0, lastInput = 'wheel', gliding = false;

/* getY() → a scroll position the page comes to rest on, on the way down */
export function landOn(getY) { stops.push(getY); }
/* range() → [from, to] scroll positions (px); through them the scroll goes no faster than vhPerSec once
   it has used up `burst` screens of allowance (which refills at that speed) */
export function slowIn(range, vhPerSec, burst = 0.4) { zones.push({ range, v: vhPerSec, burst }); }

const listeners = [];
/* call fn whenever the page scrolls, in step with the frame the scroll is drawn in —
   for anything that has to line up exactly with the page as it moves */
export function onScroll(fn) { listeners.push(fn); }
const tell = () => { for (const fn of listeners) fn(); };
addEventListener('scroll', tell, { passive: true });

export function initSmoothScroll({ reduced = false } = {}) {
  if (reduced) return null;
  lenis = new Lenis({
    lerp: LERP,
    wheelMultiplier: 1.25,
    smoothWheel: true,
    syncTouch: HANDHELD,                 // phones too: the finger, then a gentle momentum — so the zones hold there
    syncTouchLerp: TOUCH_LERP,
    touchInertiaExponent: 1.6,
    autoRaf: true,
    anchors: false,                      // the nav links are handled in main.js
    virtualScroll: data => {
      const e = data.event;
      if (e.defaultPrevented) return false;                   // taken by the page's own handling
      if (e.target?.closest?.('.notes.active')) return false; // the notes graph, being zoomed and panned
      const touch = e.type.startsWith('touch');
      if (touch && e.type === 'touchmove' && Math.abs(data.deltaX) > Math.abs(data.deltaY)) return false;   // a sideways swipe isn't a scroll
      lastInput = touch ? 'touch' : 'wheel'; gliding = false;
      if (e.type === 'wheel') { const raw = Math.abs(data.deltaY); limitFlick(data); slow(data, LERP); land(data, raw); }
      else if (e.type === 'touchmove') slow(data, 1);
      if (data.deltaY || data.deltaX || e.type === 'touchend') return true;
      if (e.cancelable) e.preventDefault();                   // limited to nothing: nor may the browser scroll it
      return false;
    }
  });
  lenis.on('scroll', tell);             // the frame Lenis moves the page in (the native event comes a frame later)
  lenis.on('scroll', () => {
    if (landing !== null && Math.abs(lenis.animatedScroll - landing) < 1.5) { landing = null; restFrom = performance.now(); }   // arrived: the rest begins
    meter();
    if (!lenis.isTouching && !gliding) coast();
  });
  return lenis;
}

/* ---------- speed zones ----------
   Each frame the page's actual movement is metered against the zone it's in: the allowance goes
   down by however far it moved, and back up at the zone's speed, never past its burst. */
let allowanceIn = null, zAllow = 0, metY = null, metAt = 0;
const zoneHere = y => zones.find(z => { const [a, b] = z.range(); return y >= a && y <= b; }) || null;
function meter() {
  const y = lenis.animatedScroll, now = performance.now(), dt = (now - metAt) / 1000, H = innerHeight;   // (a pause refills it)
  const z = zoneHere(y);
  if (z !== allowanceIn) { allowanceIn = z; zAllow = z ? z.burst * H : 0; }
  else if (z) zAllow = Math.min(z.burst * H, Math.max(0, zAllow - Math.abs(y - (metY ?? y))) + z.v * H / 100 * dt);
  metY = y; metAt = now;
}
/* how far ahead of y (px) the scroll may be heading in direction dir, when it closes the gap at
   `rate` of it a frame: free up to a zone, then the zone's allowance, then just its speed's lead */
function reach(y, dir, rate) {
  const H = innerHeight;
  let most = Infinity;
  for (const z of zones) {
    const [a, b] = z.range();
    if (dir > 0 ? y >= b : y <= a) continue;                // behind us
    const before = dir > 0 ? Math.max(0, a - y) : Math.max(0, y - b);
    const allow = z === allowanceIn ? zAllow : z.burst * H, lead = z.v * H / 100 / (rate * 60);
    most = Math.min(most, before + allow + lead);
  }
  return most;
}
/* a turn of the wheel (its glide: rate LERP) or a move of the finger (the page follows at once: rate 1),
   held to what the zones allow */
function slow(data, rate) {
  const d = data.deltaY;
  if (!d || !zones.length) return;
  meter();
  const y = lenis.animatedScroll, dir = Math.sign(d);
  // (both add to where the scroll is already heading — a glide or a coast still under way — so measure from there)
  const t = lenis.isScrolling && Math.abs(lenis.targetScroll - y) < innerHeight * 3 ? lenis.targetScroll : y;
  const most = reach(y, dir, rate);
  if ((t + d - y) * dir <= most) return;
  data.deltaY = dir > 0 ? Math.max(0, y + most - t) : Math.min(0, y - most - t);
}
/* a fling, coasting after the finger lifts: brought to rest on a landing place, and held to the zones */
function coast() {
  if (!lenis.isScrolling || lastInput !== 'touch') return;
  const y = lenis.animatedScroll, t = lenis.targetScroll, dir = Math.sign(t - y);
  if (!dir) return;
  for (const getY of stops) {
    const Y = getY();
    if (dir > 0 && y < Y - 1.5 && t > Y + 1) { lenis.scrollTo(Y, { lerp: TOUCH_LERP }); return; }
  }
  const most = reach(y, dir, TOUCH_LERP);
  if (Math.abs(t - y) > most + 1) lenis.scrollTo(y + dir * most, { lerp: TOUCH_LERP });
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
  // where the page is, and where it's heading — the real scroll position unless a glide is under way (Lenis's
  // own idea of it can be left stale by a jump the browser made, e.g. restoring the position on reload)
  const y = scrollY, t = lenis.isScrolling && Math.abs(lenis.targetScroll - y) < innerHeight * 3 ? lenis.targetScroll : y;
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
  gliding = true;                                            // a glide goes where it's sent: no zones, no coasting
  lenis.scrollTo(y, { duration, force: true, onComplete: () => { gliding = false; } });
}
