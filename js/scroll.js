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
     its folder, Behind the scenes coming up — the page moves no faster
     than the zone's speed, however hard you scroll: wheel, trackpad,
     finger and fling alike, and the same speed every time, a gentle
     scroll or a hard one, the way in or the way back. Scroll harder
     and it just keeps going at that speed for as long as you scroll;
     stop and it eases to a stop within a moment. Coming up to a zone
     it slows into it, rather than hitting a wall. A zone can also be
     whole: one that mustn't be left half done (the globe half risen
     looks like the globe, ready, when it isn't) — once you've scrolled
     into it, it carries on through to its end in the direction you're
     going, at the same speed, picking up from your own scroll without a
     pause; scroll the other way and it goes back.
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

/* resting on a landing place: `hold` ms before scrolling on down moves on */
export const LAND = { hold: 220 };

/* in a speed zone, once you stop scrolling (no input for `after` ms), what the scroll still had in hand
   fades away over about `wheel` / `touch` seconds — so the page eases to a stop, and nothing plays on */
const FADE = { after: 90, wheel: 0.12, touch: 0.45 };   // (a fling carries on a little, as a phone's own does)

const LERP = 0.165, TOUCH_LERP = 0.085;                       // the wheel's glide; a fling's
let lenis = null;
const stops = [], zones = [];
let landing = null, restFrom = -1e9, lastInput = 'wheel', gliding = false;
let pinching = false;                                        // two fingers on the screen: a pinch (main.js zooms the globe), not a scroll
let held = false, nativeY = null, nativeTouch = false, deciding = false;

/* a finger turning the globe (main.js): the page holds still under it until it lifts */
export function holdTouch(on) { held = on; }
/* past the end of the story — the top of Behind the scenes, and `margin` screens more */
function pastStory(y, margin = 0) {
  const ys = where().stops;
  return ys.length > 0 && y >= Math.max(...ys) - 2 + innerHeight * margin;
}

/* getY() → a scroll position the page comes to rest on, on the way down */
export function landOn(getY) { stops.push(getY); }
/* range() → [from, to] scroll positions (px). Through them the page moves no faster than vhPerSec,
   however hard you scroll; a scroll there can run at most `carry` screens ahead of the page, which it
   then travels at that speed while you keep scrolling. whole: once you're into it, it plays through */
export function slowIn(range, vhPerSec, carry = 0.35, whole = false) { zones.push({ range, v: vhPerSec, carry, whole }); }

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
    autoRaf: false,                      // main.js moves it at the start of each frame, so what's drawn is where the page is
    anchors: false,                      // the nav links are handled in main.js
    virtualScroll: data => {
      const e = data.event;
      if (e.defaultPrevented) return false;                   // taken by the page's own handling
      if (e.target?.closest?.('.notes.active')) return false; // the notes graph, being zoomed and panned
      const touch = e.type.startsWith('touch');
      // past the story a phone scrolls the way it always does — its own scrolling, with its own momentum, smooth
      // however busy the page is; the story keeps the finger in step with it (the zones). Decided as each touch begins
      // (from the very top of Behind the scenes it's the phone's own the moment you scroll down — and the site's if you
      // scroll back up into the folders, where the zones hold)
      if (HANDHELD && e.type === 'touchstart' && e.touches?.length === 1) {
        lenis.options.syncTouch = !pastStory(lenis.animatedScroll, 0.25); nativeTouch = !lenis.options.syncTouch; held = false;
        deciding = lenis.options.syncTouch && pastStory(lenis.animatedScroll);
      }
      if (deciding && e.type === 'touchmove' && data.deltaY) {
        deciding = false;
        if (data.deltaY > 0) { lenis.options.syncTouch = false; nativeTouch = true; }
      }
      if (touch && !lenis.options.syncTouch) return true;
      // a second finger down makes it a pinch — and it stays one until every finger is off, so the page
      // neither scrolls under the pinch nor jumps when one finger lifts before the other
      if (e.type === 'touchstart' && e.touches?.length === 1) pinching = false;   // a fresh touch (should a lift have gone missing)
      if (touch && e.touches?.length > 1) pinching = true;
      if (pinching) {
        if (e.type === 'touchend' && !e.touches?.length) pinching = false;
        if (e.type === 'touchmove' && e.cancelable) e.preventDefault();   // nor may the browser scroll it
        return false;
      }
      if (touch && held) { if (e.type === 'touchmove' && e.cancelable) e.preventDefault(); return false; }
      if (touch && e.type === 'touchmove' && Math.abs(data.deltaX) > Math.abs(data.deltaY)) return false;   // a sideways swipe isn't a scroll
      lastInput = touch ? 'touch' : 'wheel'; gliding = false;
      if (e.type === 'wheel') { limitFlick(data); rest(data); govern(data, LERP); }
      else if (e.type === 'touchmove') { rest(data); govern(data, 1); }
      else if (e.type === 'touchend') { rate = TOUCH_LERP; inputAt = performance.now(); requestAnimationFrame(resume); }
      if (data.deltaY || data.deltaX || e.type === 'touchend') return true;
      if (e.cancelable) e.preventDefault();                   // limited to nothing: nor may the browser scroll it
      return false;
    }
  });
  // the frame Lenis moves the page in (and it passes on the browser's own scrolling too) — so the page's own scroll
  // listener would only do it all again a frame later
  lenis.on('scroll', tell);
  removeEventListener('scroll', tell);
  lenis.on('scroll', () => {
    if (landing !== null && Math.abs(lenis.animatedScroll - landing) < 1.5) { landing = null; restFrom = performance.now(); bank = 0; }   // arrived: the rest begins
    // the phone's own scrolling, flung back up past the end of the story: it stops there, as a landing place
    // would — the story is scrolled the story's way (the next touch takes it from there)
    if (lenis.isScrolling === 'native' && HANDHELD) {
      const y = lenis.animatedScroll, Y = Math.max(...where().stops);
      if (nativeY !== null && nativeY >= Y - 2 && y < Y - 2 && !lenis.isStopped) {
        lenis.stop();                                    // (for a moment: the only way to end a fling)
        scrollTo({ top: Y, behavior: 'instant' });
        setTimeout(() => { lenis.options.syncTouch = true; nativeTouch = false; lenis.start(); }, 80);   // (long enough that the fling is over)
      }
      nativeY = y;
    } else nativeY = null;
    pace();
  });
  return lenis;
}

/* ---------- speed zones ----------
   Lenis glides the page toward where you've scrolled to (its target) at a speed in proportion to the
   gap: the gap shrinks by 1 − e^−lerp of itself each frame. So holding the gap to v ÷ (60·that) holds
   the page to exactly v — and whatever you scrolled beyond it waits in `bank`, let out each frame as
   the page moves on, so the page keeps going at v while you scroll. The bank never holds more than the
   zone's carry, and fades once you've stopped scrolling. Short of a zone the gap allowed grows with the
   distance left to it, so a fast scroll slows smoothly into the zone. A landing place ahead bounds it
   all, so the page comes to rest on it. */
let bank = 0, bankDir = 0, rate = LERP, inputAt = -1e9, paceAt = 0, paceY = null;
let through = null;                                          // a whole zone playing through: { end, dir }
// vh past a whole zone's end it comes to rest — clear of it, so a nudge doesn't set it going again, and clear of
// the edge itself (where the page may be about to change: the globe's page to its picture); s it takes to get up to speed
const PAST = 2, RAMP = 0.25;
const go = to => lenis.scrollTo(to, { lerp: rate, programmatic: false });   // (programmatic: false keeps Lenis's target where we put it)

/* where the zones and landing places are, measured now and then rather than every frame (measuring
   straight after the page has been restyled would make the browser lay it out again, each frame) */
let spots = null, spotsAt = -1e9;
function where() {
  const now = performance.now();
  if (!spots || now - spotsAt > 500) { spots = { zones: zones.map(z => [z.range(), z]), stops: stops.map(g => g()) }; spotsAt = now; }
  return spots;
}
addEventListener('resize', () => { setTimeout(() => { spots = null; }); });

/* from y, heading dir, gliding at `r`: how far ahead the target may be now (cap), and how far ahead what
   you've scrolled may run at all (most); `stop`: the landing place that bounds it, if one does */
function reach(y, dir, r) {
  const H = innerHeight, k = 60 * (1 - Math.exp(-r));
  let cap = Infinity, most = Infinity, stop = null;
  const { zones: zs, stops: ys } = where();
  for (const [[a, b], z] of zs) {
    if (dir > 0 ? y >= b : y <= a) continue;                // behind us
    const before = dir > 0 ? Math.max(0, a - y) : Math.max(0, y - b);
    const lead = z.v * H / 100 / k, far = dir > 0 ? b - y : y - a;
    cap = Math.min(cap, before + lead);
    most = Math.min(most, Math.max(before + lead + z.carry * H, z.whole ? far : 0));
  }
  if (dir > 0) for (const Y of ys) {
    if (y < Y - 1.5 && Y - y < most) { most = Y - y; cap = Math.min(cap, most); stop = Y; }
  }
  return { cap, most, stop };
}

/* a turn of the wheel (gliding at LERP) or a move of the finger (the page follows at once: 1) */
function govern(data, r) {
  const d = data.deltaY;
  if (!d) return;
  const y = lenis.animatedScroll, dir = Math.sign(d);
  rate = r; inputAt = performance.now();
  if (dir !== bankDir || !lenis.isScrolling) { bank = 0; bankDir = dir; }
  if (through && through.dir !== dir) through = null;      // turned round: it goes back the way you're going now
  // where the page is already heading — Lenis's target, unless a jump the browser made has left it stale
  const t = lenis.isScrolling && Math.abs(lenis.targetScroll - y) < innerHeight * 3 ? lenis.targetScroll : y;
  const ahead = Math.max(0, (t - y) * dir), { cap, most, stop } = reach(y, dir, r);
  if (cap === Infinity) { data.deltaY = dir * (Math.abs(d) + bank); bank = 0; return; }   // nothing ahead to slow for
  const wish = ahead + Math.abs(d) + bank, want = Math.min(wish, Math.max(most, ahead));
  if (stop !== null && wish > most) landing = stop;           // it would carry on past the landing place: rest there
  const give = Math.max(ahead, Math.min(want, cap));
  bank = want - give;
  data.deltaY = dir * (give - ahead);
}

/* every frame the page moves: let out what's banked, as far as the zone allows — or, if the target has run
   ahead of it (a fling coasting on, a fast scroll coming up to a zone), take the rest back into the bank */
function pace() {
  const now = performance.now(), dt = Math.min(0.1, (now - paceAt) / 1000); paceAt = now;
  if (lenis.isScrolling === 'native' && nativeTouch) { bank = 0; return; }   // the phone's own scrolling, past the story: not ours to pace
  if (lenis.isScrolling === 'native') {                     // the browser's own (the keyboard, the scrollbar): heading whichever way it's going
    const way = Math.sign(lenis.animatedScroll - (paceY ?? lenis.animatedScroll));
    if (way && way !== bankDir) { bank = 0; through = null; bankDir = way; }
  }
  if (gliding || !bankDir) return;
  if (lenis.isTouching) rate = 1; else if (lastInput === 'touch') rate = TOUCH_LERP;
  const y = lenis.animatedScroll, t = lenis.targetScroll, dir = bankDir, ahead = (t - y) * dir;
  const moved = Math.abs(y - (paceY ?? y)); paceY = y;
  playThrough(y, dir);
  if (through && !lenis.isTouching) rate = LERP;             // playing through, it ends as crisply as a turn of the wheel
  // playing a whole zone through: enough in hand to get to its end (once the finger's off — till then it's the
  // finger's); otherwise, once you've stopped scrolling, what's in hand fades
  if (through) { if (!lenis.isTouching) bank = Math.max(bank, (through.end - t) * dir); }
  else if (now - inputAt > FADE.after) bank *= Math.exp(-dt / (lastInput === 'touch' ? FADE.touch : FADE.wheel));
  if (ahead < -1) { bank = 0; return; }                     // heading the other way now
  const { cap, most, stop } = reach(y, dir, rate);
  if (cap === Infinity) { if (bank >= 1) { const to = t + dir * bank; bank = 0; go(to); } return; }
  if (ahead > cap + 1) {
    if (stop !== null && ahead > most) landing = stop;
    bank = Math.min(bank + ahead - cap, Math.max(0, most - cap));
    go(y + dir * cap);
  } else if (bank >= 1 && cap - ahead >= 1) {
    // (playing through, the gap — and so the speed — grows to the zone's over RAMP rather than all at once, picking
    // up from a gentle scroll: what it lets out each frame is what the page just moved, and a little more)
    const room = through ? Math.min(cap - ahead, moved + Math.max(1, cap * dt / RAMP)) : cap - ahead;
    const to = Math.round(t + dir * Math.min(bank, room));
    bank = Math.max(0, bank - Math.abs(to - t));
    go(to);
  }
}

/* inside a whole zone, heading dir: it plays through to the end you're heading for, and a little past it */
function playThrough(y, dir) {
  if (through && (through.dir !== dir || (through.end - y) * dir <= 1.5)) through = null;   // there (or turned round)
  if (through) return;
  const m = innerHeight * PAST / 100;
  for (const [[a, b], z] of where().zones) {
    if (z.whole && y > a + 0.5 && y < b - 0.5) { through = { end: dir > 0 ? b + m : a - m, dir }; return; }
  }
}
/* a tap stops the page where it is — mid-way through a whole zone, it carries on once the finger's off */
function resume() {
  if (!lenis || !through || lenis.isTouching || lenis.isScrolling) return;
  const y = lenis.animatedScroll, { cap } = reach(y, through.dir, rate);
  bankDir = through.dir;
  go(y + through.dir * Math.max(1, Math.min(cap * 0.2, Math.abs(through.end - y))));
}

/* resting on a landing place: scrolling on down waits a beat. Turning back up is always free */
function rest(data) {
  if (data.deltaY < 0) { landing = null; restFrom = -1e9; return; }
  if (data.deltaY > 0 && performance.now() - restFrom < LAND.hold) { data.deltaY = 0; bank = 0; }
}

/* each swipe has an allowance: it starts full, refills at FLICK.rate while the swipe
   goes on, and the swipe moves freely until it's nearly spent — then only as fast as
   it refills. Deltas arrive already in pixels (and ×wheelMultiplier) */
let allowance = 0, lastAt = -1e9, lastDir = 0;
function limitFlick(data) {
  const d = data.deltaY;
  if (!d || pastStory(lenis.animatedScroll)) return;          // past the story there's nothing to fly past: scroll as you like
  const now = performance.now(), H = innerHeight, full = FLICK.free * H, dir = Math.sign(d);
  if (now - lastAt > FLICK.pause || dir !== lastDir) allowance = full;               // a new swipe
  else allowance = Math.min(full, allowance + (now - lastAt) / 1000 * FLICK.rate * H);
  lastAt = now; lastDir = dir;
  const gain = Math.min(1, allowance / (full * 0.2));                               // eases off over the last fifth
  const take = Math.min(Math.abs(d) * gain, allowance);
  allowance -= take;
  // (in a speed zone the zone sets the pace, the same however long you've been scrolling: the swipe still
  // spends its allowance there, so it comes out the other side no freer than it went in)
  if (!inZone(lenis.animatedScroll)) data.deltaY = dir * take;
}
const inZone = y => where().zones.some(([[a, b]]) => y >= a && y <= b);

/* straight there, no glide — for jumps the eye shouldn't see */
export function jumpTo(y) {
  bank = 0; landing = null; through = null;
  if (lenis) { lenis.resize(); lenis.scrollTo(y, { immediate: true, force: true }); }
  else scrollTo({ top: y, behavior: 'instant' });
}

/* a glide, taking longer the further it goes — for the nav links and the like */
export function glideTo(y) {
  const far = Math.abs(y - scrollY) / innerHeight, duration = Math.min(2.6, 0.8 + far * 0.28);
  if (!lenis) { scrollTo({ top: y, behavior: 'smooth' }); return; }
  lenis.resize();
  gliding = true; bank = 0; landing = null; through = null;  // a glide goes where it's sent: no zones, no landing
  lenis.scrollTo(y, { duration, force: true, onComplete: () => { gliding = false; } });
}
