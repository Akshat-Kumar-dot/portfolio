/* ============================================================
   MAIN — scroll choreography and interaction.

   Scroll progress p runs 0 → 1 over the .track element:
     0. the landing: one line, and beside it a graph of notes
     1. the line lifts away; the graph folds down into a single dot,
        which falls — the closed hands rise to catch it between
        their thumbs (the notes are where the projects come from)
     2. they part, and the globe of projects rises out of them
     3. the globe floats free — drag it, hover a card
     4. scroll on and you step inside: one card fills the screen,
        its neighbours curve away at the edges; scrolling on walks
        down the globe row by row (and back up), sideways swipes, drag
        and ← → move along a row. Point at the card and a pen circles it.
   Past the track come the site's sections as a stack of folders
   (js/files.js): scroll through them to Behind the scenes (js/desk.js),
   whose sheet opens out into the page; About and Contact follow it.
   Everything follows the scroll — nothing holds on to it.
   Add ?p=0.4 to the URL to pin the progress while tuning.
   ============================================================ */
import * as THREE from 'three';
import { SITE, WORK, GLOBE, SCROLL, STORY_VH, BROWSE, ZOOM, FILES, DESK } from './config.js';
import { $, clamp, lerp, sm, eio, pad, prefersReducedMotion, hasFinePointer } from './utils.js';
import { paintGrain } from './grain.js';
import { coverFontsReady, drawCover, COVER_W, COVER_H } from './covers.js';
import { createStage } from './stage.js';
import { createHands } from './hands.js';
import { createGlobe } from './globe.js';
import { createGraph } from './graph.js';
import { createFiles, graphSketch } from './files.js';
import { createDesk } from './desk.js';
import { initSmoothScroll, jumpTo, glideTo } from './scroll.js';
import { createReveals } from './reveal.js';
import * as pen from './scribble.js';
import { PERF } from './device.js';

const params = new URLSearchParams(location.search);
const FORCE_P = parseFloat(params.get('p'));
/* ?cam=back / ?cam=palm / ?cam=side frame the hands up close, for checking skin detail */
const DEBUG_CAM = {
  back: { pos: new THREE.Vector3(0.05, 0.2, 0.2), at: new THREE.Vector3(0, 0.03, -0.05) },
  palm: { pos: new THREE.Vector3(0.0, 0.26, 0.12), at: new THREE.Vector3(0, 0.0, -0.04) },
  side: { pos: new THREE.Vector3(0.24, 0.1, 0.02), at: new THREE.Vector3(0.02, 0.03, -0.06) },
  top:  { pos: new THREE.Vector3(0, 0.19, 0.27), at: new THREE.Vector3(0, 0.02, -0.04) }      // the page's own angle, close up
}[params.get('cam')];
const reduced = prefersReducedMotion(), fine = hasFinePointer();

const canvas = $('scene'), track = $('track'), hint = $('hint'), guide = $('guide'), pill = $('pill'), hero = $('hero');
const readout = $('readout'), roIdx = $('roIdx'), roTitle = $('roTitle'), roMeta = $('roMeta');
const inkCanvas = $('ink'), inkCtx = inkCanvas.getContext('2d');
paintGrain($('grain'));
track.style.height = (STORY_VH + 100) + 'vh';               // the story's length, plus the screen it's seen through

/* ---------- page text, from SITE in config.js ---------- */
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const rich = s => esc(s).replace(/\*(.+?)\*/g, '<em>$1</em>');                 // *word* → italics
const years = WORK.map(w => +w.year).filter(Boolean);
const SPAN = years.length ? Math.min(...years) + ' — ' + Math.max(...years) : '';

$('headline').innerHTML = SITE.name.split(/\s+/).map(w => `<span class="line">${esc(w)}</span>`).join('');
$('tagline').innerHTML = rich(SITE.headline.join(' '));
$('heroMeta').textContent = [SITE.role, SITE.location, `${WORK.length} projects, ${SPAN}`].filter(Boolean).join('  ·  ');

$('aboutText').textContent = SITE.about;
$('mail').textContent = SITE.email; $('mail').href = 'mailto:' + SITE.email;
$('socials').innerHTML = SITE.links.map(l => `<li><a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)} ↗</a></li>`).join('');
$('footName').textContent = '© ' + new Date().getFullYear() + ' ' + SITE.name;
$('footYear').textContent = SITE.location;
document.title = SITE.name + ' — ' + SITE.headline.join(' ').replace(/\*/g, '');

/* accessible list of the projects (the globe itself is a canvas) */
$('links').innerHTML = WORK.map(w => `<li><a href="${esc(w.url)}">${esc(w.title)} — ${esc(w.tag)}, ${esc(w.year)}</a></li>`).join('');

const stage = createStage(canvas);
const { scene, camera, renderer } = stage;
const hands = createHands(scene);
let globe = null;

/* ---------- camera: one fixed view looking down past the hands, which sit in
   the bottom fifth of the page; the zoom then carries it into the globe ---------- */
const CAM_POS = new THREE.Vector3(0, 0.5, 0.75);
const CAM_AT = new THREE.Vector3(0, 0.153, -0.188);
const GLOBE_AT = new THREE.Vector3(0, 0.126, -0.316);   // where the globe ends up
const TO_CAM = new THREE.Vector3().subVectors(CAM_POS, GLOBE_AT).normalize();
const LOOK_DOWN = Math.atan2(CAM_POS.y - CAM_AT.y, CAM_POS.z - CAM_AT.z);
let W = innerWidth, H = innerHeight, inkDpr = 1, handsBelow = 0.2, handsEdge = null;

function fit() {
  W = innerWidth; H = innerHeight;
  stage.resize(W, H);
  inkDpr = Math.min(devicePixelRatio || 1, PERF.canvasDpr);
  inkCanvas.width = Math.round(W * inkDpr); inkCanvas.height = Math.round(H * inkDpr);
  // on narrow screens widen the lens rather than cropping the sides
  const half = Math.tan(13 * Math.PI / 180) * Math.max(1, 1.2 / camera.aspect);
  camera.fov = Math.min(60, 2 * Math.atan(half) * 180 / Math.PI);
  camera.updateProjectionMatrix();
  // how far down the view reaches at depth z. A tall screen (a phone) sees much further down than a
  // wide one — far enough to show the forearms — so there the hands are held with their wrists at
  // the bottom edge (hands.js): palms only, as on a laptop
  const slope = Math.tan(LOOK_DOWN + camera.fov * Math.PI / 360);
  const edge = z => CAM_POS.y - slope * (CAM_POS.z - z);
  handsEdge = camera.fov > 26.01 ? edge : null;
  // before they rise, the hands wait just below the bottom of the view — the fingertips (~0.19 m up) too
  handsBelow = handsEdge ? 0.3 : Math.max(0.2, 0.2 - edge(-0.05)) + 0.04;   // …with room to spare, so they're wholly out of view (and not drawn)
}
addEventListener('resize', () => { fit(); measureNotes(); lastFold = -1; });
fit();

/* ---------- the notes graph, and the dot it folds into ---------- */
const notesEl = $('notes');
const DOT_PX = 16;                                           // the dot the notes gather into, in pixels
const graph = createGraph({ frame: notesEl, canvas: $('graph'), pill, dot: DOT_PX / 2 });
const DOT_DEPTH = 0.93;                                      // how far from the camera the 3D dot lives (≈ the hands)
const dot = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 20),
  new THREE.MeshBasicMaterial({ color: new THREE.Color('#1d1b17'), toneMapped: false, fog: false }));
dot.visible = false;
scene.add(dot);

let notesPx = { x: -999, y: -999 }, lastFold = -1;
function measureNotes() {                                    // the centre of the graph, where its notes gather
  const r = notesEl.getBoundingClientRect();
  notesPx = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}
measureNotes();

/* c: 0 = the graph … 1 = every note gathered into one dark dot */
function foldNotes(c) {
  if (c === lastFold || (Math.abs(c - lastFold) < 1e-4 && c > 0 && c < 1)) return;   // always let 0 and 1 through
  lastFold = c;
  graph.setFold(c);
  notesEl.style.visibility = c >= 1 ? 'hidden' : 'visible';   // from here the 3D dot takes over
}

/* after the globe: the site's sections as a stack of folders. Scrolling goes through
   them to Behind the scenes, whose sheet is the page itself, and it opens out into it */
createDesk({ desk: DESK, reduced });
const workThumbs = Object.assign(document.createElement('div'), { className: 'f-thumbs' });
const firstSentence = s => (String(s).match(/^.*?[.!?](?=\s|$)/) || [s])[0];
createFiles({
  cue: FILES.cue, stepVh: FILES.stepVh, openVh: FILES.openVh, reduced, target: 2,
  folders: [
    { n: '01', name: 'Notes', line: FILES.notes, media: graphSketch() },
    { n: '02', name: 'Work', line: [WORK.length + ' projects', SPAN].filter(Boolean).join('  ·  '), media: workThumbs },
    { n: '03', name: DESK.title.join(' ').replace(/\*/g, '') },
    { n: '04', name: 'About', line: firstSentence(SITE.about) },
    { n: '05', name: 'Contact', line: SITE.email }
  ]
});

/* nav: Work glides to the floating globe; Behind the scenes, About and Contact glide straight there */
function scrollToProgress(q) {
  glideTo(q * (track.offsetHeight - innerHeight));
}
const sectionTop = hash => (hash === '#desk' ? $('deskSlot') : $(hash.slice(1))).offsetTop;   // Behind the scenes' place in the page
$('navWork').addEventListener('click', e => { e.preventDefault(); scrollToProgress((SCROLL.lift[1] + SCROLL.zoom[0]) / 2); });
for (const a of document.querySelectorAll('a[href="#desk"], a[href="#about"], a[href="#contact"]')) {
  a.addEventListener('click', e => { e.preventDefault(); glideTo(sectionTop(a.hash)); });
}
if (/^#(desk|about|contact)$/.test(location.hash)) requestAnimationFrame(() => jumpTo(sectionTop(location.hash)));

/* how far from the front card the camera stops so it fills ZOOM of the screen */
function zoomDistance(R) {
  const t = Math.tan(camera.fov * Math.PI / 360);
  const cw = GLOBE.cardWidth * R, ch = cw * COVER_H / COVER_W;
  return Math.max(ch / (ZOOM.height * 2 * t), cw / (ZOOM.width * 2 * t * camera.aspect));
}

/* ---------- the readout (top-left: Projects, or the card you're on) and the guide line (bottom-centre) ---------- */
let mode = 'rising';                                        // rising → free → zooming → focus
const idx = v => '<b>' + v + '</b><span>/</span><span>' + pad(WORK.length) + '</span>';
function swap() { readout.classList.remove('swap'); void readout.offsetWidth; readout.classList.add('swap'); }
function showDefault() {
  roIdx.innerHTML = idx('—');
  roTitle.innerHTML = '<em>Projects</em>';
  roMeta.textContent = mode === 'free'
    ? (fine ? 'Drag to rotate · Click a card to open' : 'Drag to rotate · Tap a card to open')
    : [WORK.length + ' projects', SPAN].filter(Boolean).join(' · ');
  swap();
}
function showProject(k) {
  const w = WORK[k];
  roIdx.innerHTML = idx(pad(k + 1));
  roTitle.textContent = w.title;
  roMeta.textContent = [w.tag, w.year].filter(Boolean).join('  ·  ');
  swap();
}
showDefault();

/* the line at the foot of the screen */
const GUIDE = {
  free: 'Scroll to step inside ↓',
  focus: fine ? 'Scroll up and down the globe · drag or ← → along it' : 'Scroll up and down the globe · swipe sideways along it'
};
let guideKey = '';
function setGuide(m) {
  if (m === guideKey) return;
  guideKey = m;
  guide.textContent = GUIDE[m] || '';
  guide.dataset.mode = m;
  guide.classList.toggle('on', !!GUIDE[m]);
}

/* ---------- pointer: hover, drag, click ---------- */
const ray = new THREE.Raycaster(), mouse = new THREE.Vector2(9, 9), peek = new THREE.Vector2();
let hovered = null, dragging = false, moved = 0, lx = 0, ly = 0;
const interactive = () => mode === 'free' || mode === 'focus';

addEventListener('pointermove', e => {
  mouse.set(e.clientX / W * 2 - 1, -(e.clientY / H) * 2 + 1);
  if (e.pointerType === 'mouse') pill.style.translate = (e.clientX + 18) + 'px ' + (e.clientY + 18) + 'px';
  if (!dragging || !globe) return;
  const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY;
  moved += Math.abs(dx) + Math.abs(dy);
  if (moved > 6) {
    if (!canvas.hasPointerCapture(e.pointerId)) canvas.setPointerCapture(e.pointerId);
    canvas.classList.add('drag');
    globe.drag(dx, mode === 'focus' ? 0 : dy);               // inside, a drag moves along the row; up and down is the scroll's
  }
}, { passive: true });
canvas.addEventListener('pointerdown', e => {
  if (!interactive() || e.button !== 0) return;
  dragging = true; moved = 0; lx = e.clientX; ly = e.clientY;
});
addEventListener('pointerup', () => {
  if (!dragging) return;
  dragging = false; canvas.classList.remove('drag');
  if (moved > 6) { globe.release(); return; }
  if (!hovered) return;
  if (mode === 'focus' && hovered !== globe.focus) { globe.focusCard(hovered); return; }   // an edge card: bring it to the centre
  const url = WORK[hovered.k].url;
  if (url && url !== '#') open(url, /^https?:/.test(url) ? '_blank' : '_self', 'noopener');
});
canvas.addEventListener('pointerleave', () => mouse.set(9, 9));

const stageInView = () => scrollY < track.offsetTop + track.offsetHeight - innerHeight * 0.5;

/* ---------- inside the globe ----------
   Scrolling walks up and down the globe, one row per stretch of scroll (see the frame loop).
   It never holds on to the scroll: past the bottom row you're simply on to the folders, past
   the top you zoom back out. Along a row: a sideways swipe, a drag, or ← →; ↑ ↓ scroll a row. */
const FREE_Y = () => (SCROLL.lift[1] + SCROLL.zoom[0]) / 2 * (track.offsetHeight - innerHeight);   // the floating globe
const ROWS = BROWSE.from - BROWSE.to + 1;
const rowY = row => (SCROLL.browse[0] + (BROWSE.from - row + 0.5) / ROWS * (SCROLL.browse[1] - SCROLL.browse[0])) * (track.offsetHeight - innerHeight);
let bandRow = null;                                         // the row the scroll position has walked to

addEventListener('keydown', e => {
  if (mode !== 'focus' || !globe || !stageInView()) return;
  const along = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
  if (along) { e.preventDefault(); globe.stepFocus(along, 0); return; }
  const up = { ArrowUp: 1, ArrowDown: -1 }[e.key];
  if (!up || bandRow === null) return;
  e.preventDefault();
  const row = bandRow + up;
  glideTo(row > BROWSE.from ? FREE_Y() : row < BROWSE.to ? track.offsetTop + track.offsetHeight : rowY(row));
});

/* a sideways swipe moves one card along the row. Telling one swipe from the next: a trackpad
   keeps sending smaller and smaller deltas for a second after the fingers lift, so a new swipe
   is a pause, a change of direction, or a delta well above the ones just before it.          */
const swipe = { last: 0, dir: 0, recent: [], sum: 0, used: true, stepAt: 0 };
addEventListener('wheel', e => {
  if (mode !== 'focus' || !globe || !stageInView()) return;
  const k = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? innerHeight : 1;
  const dx = e.deltaX * k, dy = e.deltaY * k;
  if (Math.abs(dx) <= Math.abs(dy)) return;                 // up and down belongs to the page
  e.preventDefault();
  const now = performance.now(), dir = Math.sign(dx), mag = Math.abs(dx);
  const gap = now - swipe.last, peak = Math.max(0, ...swipe.recent);
  const fresh = gap > 160 || dir !== swipe.dir || (mag >= 50 && gap > 45) || (mag > peak * 1.7 && mag > 6 && now - swipe.stepAt > 150);
  swipe.last = now;
  if (fresh) Object.assign(swipe, { dir, recent: [], sum: 0, used: false });
  swipe.recent.push(mag); if (swipe.recent.length > 4) swipe.recent.shift();
  swipe.sum += mag;
  if (swipe.used || swipe.sum < 16 || now - swipe.stepAt < 180) return;
  swipe.used = true; swipe.stepAt = now;
  globe.stepFocus(dir, 0);
}, { passive: false });

function setHovered(c) {
  if (c === hovered) return;
  hovered = c;
  canvas.classList.toggle('point', !!c);
  pill.textContent = mode === 'focus' && c && c !== globe.focus ? 'View' : 'Open ↗';
  pill.classList.toggle('on', !!c && fine);
  if (c) showProject(c.k);
  else if (mode === 'focus' && globe.focus) showProject(globe.focus.k);
  else showDefault();
}

/* ---------- inside the globe, a pen circles the card in the middle ----------
   one loose line round it, drawn on when you point at it (on touch, once it
   has settled), rubbed out from where it began when you move off or on to another card */
const CARD_W = GLOBE.cardWidth, CARD_H = CARD_W * COVER_H / COVER_W;
const EDGE = [[-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0]];
const _e = new THREE.Vector3();
function cardOnScreen(card) {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const [sx, sy] of EDGE) {
    _e.set(sx * CARD_W / 2, sy * CARD_H / 2, 1).normalize(); _e.z -= 1;      // the card is wrapped onto the sphere (wrap() in globe.js)
    card.mesh.localToWorld(_e).project(camera);
    const x = (_e.x + 1) / 2 * W, y = (1 - _e.y) / 2 * H;
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }
  return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, a: (x1 - x0) / 2, b: (y1 - y0) / 2 };
}
const circle = { card: null, pts: null, on: 0, off: 0, n: 0 };
let inkDirty = false;
function drawCircle(dt) {
  let want = null;
  if (mode === 'focus' && globe.focus && !dragging && stageInView()) {
    const r = cardOnScreen(globe.focus);
    const settled = Math.abs(r.cx - W / 2) < W * 0.08 && Math.abs(r.cy - H / 2) < H * 0.1;
    if (settled && (fine ? hovered === globe.focus : true)) want = globe.focus;
  }
  if (circle.card && want !== circle.card) {
    circle.off = Math.min(circle.on, circle.off + dt / 0.3);
    if (circle.off >= circle.on - 1e-3) circle.card = null;
  } else if (!circle.card && want) {
    circle.card = want; circle.on = circle.off = 0;
    circle.pts = pen.loop(++circle.n, { n: 5, turns: 1.1, start: 0.8 + Math.random() * 0.6 });   // once round, just overlapping where it began
  } else if (circle.card) {
    circle.on = Math.min(1, circle.on + dt / 0.6);
    circle.off = Math.max(0, circle.off - dt / 0.3);
  }

  if (!circle.card && !inkDirty) return;
  inkCtx.clearRect(0, 0, inkCanvas.width, inkCanvas.height);
  inkDirty = false;
  if (!circle.card) return;
  const r = cardOnScreen(circle.card), a = r.a * 1.1, b = r.b * 1.17;
  const ease = t => t * t * (3 - 2 * t);
  pen.draw(inkCtx, circle.pts, (u, v) => [(r.cx + u * a) * inkDpr, (r.cy + v * b) * inkDpr],
    ease(circle.off), ease(circle.on), clamp(W / 560, 1.8, 3.4) * inkDpr);
  inkDirty = true;
}

/* ---------- scroll → progress ---------- */
function scrollTarget() {
  if (Number.isFinite(FORCE_P)) return clamp(FORCE_P, 0, 1);
  const max = track.offsetHeight - innerHeight;
  return max > 0 ? clamp(scrollY / max, 0, 1) : 1;
}

/* the dot's fall, the globe rising and the zoom keep to a pace you can follow, however hard
   the scroll (SCROLL.pace): inside one of those stretches p moves no faster than its pace,
   and a step that would leap into one stops at its edge, to go on at that pace from there */
function paced(q, step, dt) {
  for (const [a, b, v] of SCROLL.pace) {
    if (step > 0 ? q >= a && q < b : q > a && q <= b) step = clamp(step, -v * dt, v * dt);
    else if (step > 0 && q < a && q + step > a) step = a - q;
    else if (step < 0 && q > b && q + step < b) step = b - q;
  }
  return step;
}

/* ---------- keeping it smooth on any device ----------
   Every second, the average frame time. Slower than about 42 frames a second and the 3D is
   drawn at fewer pixels (a step at a time, down to half); back at a steady 60 for a few
   seconds and it steps back up — but not again to a level that proved too slow straight after
   stepping up to it, so it settles instead of see-sawing. */
const gov = { t: 0, n: 0, calm: 0, ceil: 1, raised: -1e9, from: performance.now() + 2500 };   // not while it's still starting up
function govern(dt, now) {
  if (dt > 0.25 || now < gov.from) return;                   // a hiccup (a tab switch, a load), not the pace
  gov.t += dt; gov.n++;
  if (gov.t < 1) return;
  const ms = gov.t / gov.n * 1000, q = stage.quality;
  gov.t = gov.n = 0;
  if (ms > 24 && q > 0.5) {
    if (now - gov.raised < 5000) gov.ceil = q * 0.97;       // just stepped up to this, and it's too much
    stage.setQuality(Math.max(0.5, q * 0.85)); gov.calm = 0;
  } else if (ms < 18 && q < gov.ceil) {
    if (++gov.calm >= 4) { gov.calm = 0; gov.raised = now; stage.setQuality(Math.min(gov.ceil, q / 0.9)); }
  }
  else gov.calm = 0;
}
addEventListener('visibilitychange', () => { gov.t = gov.n = 0; gov.from = performance.now() + 1000; });

/* what's in view: the hands are skinned and cast shadows — no need for either once they're
   off screen (before they rise, and once you're inside the globe) */
const _frustum = new THREE.Frustum(), _pv = new THREE.Matrix4(), _box = new THREE.Box3();
function inView(obj, margin) {
  _box.setFromObject(obj);
  if (_box.isEmpty()) return false;
  _pv.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  return _frustum.setFromProjectionMatrix(_pv).intersectsBox(_box.expandByScalar(margin));
}
let blank = false;

/* ---------- loop ---------- */
const _at = new THREE.Vector3(), _close = new THREE.Vector3(), _ray = new THREE.Vector3(), _from = new THREE.Vector3();
let p = scrollTarget(), pPrev = p, last = performance.now(), lastFocus = null, readoutAway = true;
let videoK = -1;                                            // the project whose video is playing, if any

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - last) / 1000, 0.1); last = now;
  const time = now / 1000;
  if (scrollY >= track.offsetTop + track.offsetHeight - 1) {                // the globe is scrolled out of view: nothing to draw
    if (hovered) setHovered(null);
    videoK = -1; globe?.setPlaying(-1);
    return;
  }

  const target = scrollTarget();
  let step = (target - p) * (1 - Math.exp(-dt * (reduced ? 30 : 16)));   // a touch of easing on top of the smooth scroll
  if (!reduced) step = paced(p, step, dt);
  p += step;
  if (Math.abs(target - p) < 2e-4) p = target;                            // …but it does arrive (e.g. back at exactly 0)
  const dp = p - pPrev; pPrev = p;
  const enter = eio(sm(SCROLL.enter, p)), open = sm(SCROLL.open, p), lift = sm(SCROLL.lift, p);
  const zoom = eio(sm(SCROLL.zoom, p));

  // hands rise into view, part, and settle a touch once the globe has risen clear
  const cup = hands.update(time, open, sm([0.6, 1], lift), enter, handsBelow, handsEdge);

  let R = GLOBE.seed;
  if (globe) {
    // small enough to hide between the closed palms; grows steadily as it rises
    R = GLOBE.seed * Math.pow(GLOBE.radius / GLOBE.seed, lift);
    globe.group.position.lerpVectors(cup, GLOBE_AT, lift);
    globe.group.position.y += Math.sin(Math.PI * lift) * 0.02 + Math.sin(time * 0.8) * 0.004 * lift * (1 - zoom);
    globe.group.scale.setScalar(R);
    globe.group.visible = lift > 0;                        // until it starts to rise it's hidden in the closed hands: don't draw it
    globe.group.lookAt(CAM_POS);                            // rows stay level with the page
  }

  // camera: the fixed view, carried in toward the front card as you zoom
  camera.position.copy(CAM_POS);
  _at.copy(CAM_AT);
  if (globe && zoom > 0) {
    _close.copy(globe.group.position).addScaledVector(TO_CAM, R + zoomDistance(R));
    camera.position.lerp(_close, zoom);
    _at.lerp(globe.group.position, zoom);
  }
  if (mode === 'free') { camera.position.x += mouse.x * 0.012 * (Math.abs(mouse.x) < 2); camera.position.y += mouse.y * 0.008 * (Math.abs(mouse.y) < 2); }
  if (DEBUG_CAM) { camera.position.copy(DEBUG_CAM.pos); _at.copy(DEBUG_CAM.at); }
  camera.lookAt(_at);
  camera.updateMatrixWorld();

  // the landing line lifts away, and the notes graph folds into a dot
  const intro = sm(SCROLL.intro, p), fold = sm(SCROLL.collapse, p);
  hero.style.opacity = (1 - intro).toFixed(3);
  hero.style.setProperty('--up', (intro * 60).toFixed(1) + 'px');
  hero.style.visibility = intro >= 1 ? 'hidden' : 'visible';
  hint.style.opacity = (1 - sm([0, 0.03], p)).toFixed(3);
  foldNotes(fold < 0.003 ? 0 : fold);                       // a hair from the top counts as unfolded, so the graph stays usable

  // once folded, the dot is handed to the 3D scene at the same spot and size: it falls,
  // slips between the thumbs of the rising hands, and melts into the globe as it grows
  const drop = sm(SCROLL.drop, p);
  _ray.set((notesPx.x / W) * 2 - 1, -(notesPx.y / H) * 2 + 1, 0.5).unproject(camera).sub(camera.position).normalize();
  _from.copy(camera.position).addScaledVector(_ray, DOT_DEPTH);
  const r0 = DOT_PX / 2 * (2 * DOT_DEPTH * Math.tan(camera.fov * Math.PI / 360) / H);
  if (drop < 1 || !globe) {
    const f = eio(drop);
    dot.position.lerpVectors(_from, cup, f);
    dot.position.y += Math.sin(Math.PI * f) * 0.03;        // a small arc, like something tossed
    dot.scale.setScalar(r0);
    dot.visible = fold >= 1;
  } else {
    const melt = 1 - sm([0, 0.12], lift);
    dot.position.copy(globe.group.position);
    dot.scale.setScalar(Math.max(1e-4, r0 * melt));
    dot.visible = melt > 0.001;
  }

  // the readout belongs to the work, not the landing or the zoomed-in view
  const away = p < SCROLL.drop[1] || mode === 'zooming' || mode === 'focus';
  if (away !== readoutAway) { readoutAway = away; readout.classList.toggle('away', away); }

  if (globe) {
    const d = camera.position.distanceTo(globe.group.position);
    scene.fog.near = d - R * 0.2;
    scene.fog.far = d + R * 5.5;

    // which phase are we in?
    const next = lift < 0.985 ? 'rising' : zoom < 0.002 ? 'free' : zoom < 0.985 ? 'zooming' : 'focus';
    if (next !== mode) {
      mode = next;
      globe.setFocus(mode === 'zooming' || mode === 'focus');
      if (mode !== 'free' && mode !== 'focus') setHovered(null);
      if (mode === 'focus' && globe.focus) showProject(globe.focus.k); else if (!hovered) showDefault();
    }
    // inside, where you are in the scroll picks the row: scrolling on walks down the globe, scrolling
    // back walks up it
    if (mode === 'zooming' || mode === 'focus') {
      const f = clamp((p - SCROLL.browse[0]) / (SCROLL.browse[1] - SCROLL.browse[0]), 0, 0.9999);
      const row = BROWSE.from - Math.floor(f * ROWS);
      if (row !== bandRow) { bandRow = row; globe.aimRow(row); }
    } else bandRow = null;
    setGuide(mode === 'free' || (mode === 'focus' && stageInView()) ? mode : '');
    if (interactive() && !dragging && fine) { ray.setFromCamera(mouse, camera); setHovered(stageInView() ? globe.pick(ray) : null); }
    if (mode === 'focus' && globe.focus !== lastFocus && !hovered) showProject(globe.focus.k);
    lastFocus = globe.focus;

    peek.set(Math.abs(mouse.x) < 2 ? mouse.x : 0, Math.abs(mouse.y) < 2 ? mouse.y : 0);
    // a project's video plays only once you've zoomed in and its card has come to rest in the middle;
    // it stops the moment you move on to another card or back out
    const k = mode === 'focus' && globe.focus && stageInView() ? globe.focus.k : -1;
    if (k !== videoK) {
      if (videoK !== -1) videoK = -1;                        // moved off it: stop at once
      else if (k !== -1 && globe.settled) videoK = k;        // arrived: start, from the beginning
    }
    globe.setPlaying(videoK);
    globe.update(dt, { scrollSpin: dp * SCROLL.spin * (1 - lift), hovered, dragging, idle: reduced ? 0 : 1, peek });
    stage.inner.position.copy(cup);
  }

  // warm light glowing between the closed fingers, fading as they part
  // it flares as the full stop lands between the thumbs
  const land = Math.exp(-(((p - SCROLL.drop[1]) * STORY_VH / 7.2) ** 2));
  stage.inner.intensity = 0.05 * enter * (1 - sm([0.04, 0.3], open)) * (0.85 + 0.15 * Math.sin(time * 2.1) + 1.4 * land);

  const handsSeen = inView(hands.pair, 0.01);
  hands.pair.visible = handsSeen;
  renderer.shadowMap.autoUpdate = handsSeen;                // only the hands take shadows
  if (handsSeen || dot.visible || (globe && lift > 0.001)) {
    renderer.render(scene, camera);
    blank = false;
    govern(dt, now);
  } else if (!blank) { renderer.clear(); blank = true; }    // nothing 3D in view (the landing): draw nothing
  if (globe) drawCircle(dt);                                // after the render, so the card's position is this frame's
}

coverFontsReady().then(() => {
  globe = createGlobe(renderer, { reduced });
  gov.from = performance.now() + 2000;                     // its textures go up to the GPU first
  scene.add(globe.group);
  // the Work folder's sheet: the first few covers, as on the globe
  for (let k = 0; k < Math.min(3, WORK.length); k++) workThumbs.append(drawCover(WORK[k], k, WORK.length, () => {}));
});
addEventListener('visibilitychange', () => { if (document.hidden) { videoK = -1; globe?.setPlaying(-1); } });
requestAnimationFrame(frame);

// About and Contact rise into place as you scroll to them
createReveals({ reduced });

// smooth scrolling: set up last, so the graph, the globe and the folders see each wheel event first
const lenis = initSmoothScroll({ reduced });

window.__dbg = { hands, stage, lenis, jumpTo, get globe() { return globe; }, get p() { return p; }, get mode() { return mode; } };
