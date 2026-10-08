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
        Any time it's out, you can turn it and zoom it as you like, as on
        Google Earth: drag, pinch, ctrl + scroll, or the controls (bottom right).
     5. past the last row you step back out, and the page you've been on
        becomes a file: the whole screen turns into a sheet and shrinks down
        into the Work folder, the site's sections rising round it as a stack
        of folders (js/files.js). Then Behind the scenes (js/desk.js) comes up
        out of its folder and opens into the page; About and Contact follow it.
   Everything follows the scroll — nothing holds on to it.
   Add ?p=0.4 to the URL to pin the progress while tuning.
   ============================================================ */
import * as THREE from 'three';
import { SITE, WORK, GLOBE, SCROLL, STORY_VH, BROWSE, ZOOM, FILES, DESK } from './config.js';
import { $, clamp, lerp, sm, eio, pad, prefersReducedMotion, hasFinePointer } from './utils.js';
import { createMark } from './mark.js';
import { coverFontsReady, drawCover, COVER_W, COVER_H } from './covers.js';
import { createStage } from './stage.js';
import { createHands } from './hands.js';
import { createGlobe } from './globe.js';
import { createGraph } from './graph.js';
import { createFiles, graphSketch } from './files.js';
import { createDesk } from './desk.js';
import { initSmoothScroll, jumpTo, glideTo, slowIn } from './scroll.js';
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
createMark($('grain'));                                     // the paper, its grain, and whose site this is (js/mark.js)
track.style.height = (STORY_VH + 100) + 'vh';               // the story's length, plus the screen it's seen through
// the folders' section starts where the globe's page closes into its folder, so their stage is there to take it
const SHRINK_VH = SCROLL.shrink[0] * STORY_VH;
$('files').style.marginTop = -(STORY_VH - SHRINK_VH + 100) + 'vh';

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
  // against the stage, not the window: the stage is the screen whenever the dot is falling, but the page may
  // be scrolled anywhere when this is measured (a reload lands you back where you were)
  const r = notesEl.getBoundingClientRect(), st = $('stage').getBoundingClientRect();
  notesPx = { x: r.left - st.left + r.width / 2, y: r.top - st.top + r.height / 2 };
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
const story = { p: 0 };                                     // the globe's progress (set each frame), for the folders
const files = createFiles({
  cue: FILES.cue, stepVh: FILES.stepVh, openVh: FILES.openVh, reduced, target: 2, holder: 1,
  closeVh: (SCROLL.shrink[1] - SCROLL.shrink[0]) * STORY_VH, story, closeAt: SCROLL.shrink,
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
  const wide = camera.aspect < 0.8 ? 0.86 : ZOOM.width;     // on a phone the card takes most of the width, to be readable
  return Math.max(ch / (ZOOM.height * 2 * t), cw / (wide * 2 * t * camera.aspect));
}

/* ---------- the readout (top-left: Projects, or the card you're on) and the guide line (bottom-centre) ---------- */
let mode = 'rising';                                        // rising → free → zooming → focus (→ zooming → free) → packing
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
  free: fine ? 'Scroll to step inside ↓ · pinch or ctrl + scroll to zoom' : 'Scroll to step inside ↓ · pinch to zoom',
  focus: fine ? 'Scroll up and down the globe · drag to look around · pinch to zoom' : 'Scroll up and down the globe · swipe along it · pinch to zoom'
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
  if (touches.has(e.pointerId)) { touches.set(e.pointerId, [e.clientX, e.clientY]); if (pinch) pinchMove(); }
  if (!dragging || !globe) return;
  const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY;
  moved += Math.abs(dx) + Math.abs(dy);
  if (moved > 6) {
    if (!canvas.hasPointerCapture(e.pointerId)) canvas.setPointerCapture(e.pointerId);
    canvas.classList.add('drag');
    // inside, a finger's drag moves along the row (up and down is the page's scroll); a mouse looks around freely
    globe.drag(dx, mode === 'focus' && e.pointerType !== 'mouse' ? 0 : dy);
  }
}, { passive: true });
canvas.addEventListener('pointerdown', e => {
  if (!interactive() || e.button !== 0) return;
  if (e.pointerType === 'touch') {
    touches.set(e.pointerId, [e.clientX, e.clientY]);
    if (touches.size === 2) { if (dragging) { dragging = false; canvas.classList.remove('drag'); globe.release(); } pinchStart(); return; }
  }
  dragging = true; moved = 0; lx = e.clientX; ly = e.clientY;
});
const lift1 = e => { touches.delete(e.pointerId); if (touches.size < 2) pinch = null; };
addEventListener('pointercancel', lift1);
addEventListener('pointerup', e => {
  lift1(e);
  if (!dragging) return;
  dragging = false; canvas.classList.remove('drag');
  if (moved > 6) { globe.release(); keepRow(); return; }
  if (!hovered) return;
  if (mode === 'focus' && hovered !== globe.focus) { globe.focusCard(hovered); return; }   // an edge card: bring it to the centre
  const url = WORK[hovered.k].url;
  if (url && url !== '#') open(url, /^https?:/.test(url) ? '_blank' : '_self', 'noopener');
});
canvas.addEventListener('pointerleave', () => mouse.set(9, 9));

/* ---------- zoom and turn it yourself, as on Google Earth ----------
   pinch (two fingers on a phone, or a trackpad — which the browser sends as ctrl + scroll),
   ctrl + scroll on a mouse, + and − on the keyboard, and the controls at the bottom right:
   a pan pad (turn it; inside the globe, a card at a time), a reset in its middle, and zoom */
const touches = new Map();
let pinch = null;
const spread = () => { const [a, b] = [...touches.values()]; return Math.hypot(a[0] - b[0], a[1] - b[1]); };
function pinchStart() { pinch = { d: Math.max(1, spread()), uz: uzT }; }
function pinchMove() { uzT = pinch.uz; zoomBy(Math.log(spread() / pinch.d) * 1.3); }

addEventListener('wheel', e => {
  if (!e.ctrlKey || !interactive() || !globe || !stageInView()) return;
  e.preventDefault();                                       // not the browser's own page zoom
  zoomBy(-e.deltaY * (e.deltaMode ? 0.06 : 0.0045));
}, { passive: false });

addEventListener('keydown', e => {
  if (!interactive() || !globe || !stageInView() || e.target.closest?.('input, textarea, [contenteditable]')) return;
  const zk = { '+': 1, '=': 1, '-': -1, '_': -1 }[e.key];
  if (zk) { e.preventDefault(); zoomBy(zk * 0.25); return; }
  const side = { ArrowLeft: -1, ArrowRight: 1 }[e.key];      // floating free, ← → turn it (↑ ↓ still scroll the page)
  if (side && mode === 'free') { e.preventDefault(); turnQ.x -= side * 0.35; }
});

const icon = d => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;
const earth = Object.assign(document.createElement('div'), { className: 'earth' });
earth.setAttribute('role', 'group');
earth.setAttribute('aria-label', 'Globe controls');
earth.innerHTML = `
  <div class="e-pad">
    <button class="e-n" data-pan="0,1" aria-label="Turn up" title="Turn up">${icon('M7 14.5l5-5 5 5')}</button>
    <button class="e-w" data-pan="-1,0" aria-label="Turn left" title="Turn left">${icon('M14.5 7l-5 5 5 5')}</button>
    <button class="e-home" data-home="" aria-label="Reset the view" title="Reset the view">${icon('M12 4.5v3M12 16.5v3M4.5 12h3M16.5 12h3M12 9.6a2.4 2.4 0 1 0 0 4.8a2.4 2.4 0 1 0 0-4.8')}</button>
    <button class="e-e" data-pan="1,0" aria-label="Turn right" title="Turn right">${icon('M9.5 7l5 5-5 5')}</button>
    <button class="e-s" data-pan="0,-1" aria-label="Turn down" title="Turn down">${icon('M7 9.5l5 5 5-5')}</button>
  </div>
  <div class="e-zoom">
    <button data-zoom="1" aria-label="Zoom in" title="Zoom in">${icon('M12 6.5v11M6.5 12h11')}</button>
    <button data-zoom="-1" aria-label="Zoom out" title="Zoom out">${icon('M6.5 12h11')}</button>
  </div>`;
// only where there's a mouse or a trackpad; on a phone, pinch and swipe do it, and the screen stays clear
if (matchMedia('(any-pointer: fine)').matches) $('stage').append(earth);
/* one step at once; held down, it keeps going */
function press(b) {
  if (b.dataset.home !== undefined) { uzT = 0; turnQ.x = turnQ.y = 0; globe?.home(); return; }
  if (b.dataset.zoom) { const d = +b.dataset.zoom; zoomBy(d * 0.22); return { zoom: d, from: performance.now() + 280 }; }
  const v = b.dataset.pan.split(',').map(Number);
  if (mode === 'focus') { stepView(v); heldNext = performance.now() + 460; }
  else { turnQ.x -= v[0] * 0.3; turnQ.y += v[1] * 0.22; }
  return { pan: v, from: performance.now() + 280 };
}
earth.addEventListener('pointerdown', e => {
  const b = e.target.closest('button');
  if (!b || !globe) return;
  e.preventDefault();
  try { b.setPointerCapture(e.pointerId); } catch { /* already let go */ }
  held = press(b) || null;
});
for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) earth.addEventListener(ev, () => { held = null; });
earth.addEventListener('click', e => { const b = e.target.closest('button'); if (b && e.detail === 0 && globe) press(b); });   // from the keyboard

const stageInView = () => scrollY < track.offsetTop + track.offsetHeight - innerHeight * 0.5;

/* ---------- inside the globe ----------
   Scrolling walks up and down the globe, one row per stretch of scroll (see the frame loop).
   It never holds on to the scroll: past the bottom row you're simply on to the folders, past
   the top you zoom back out. Along a row: a sideways swipe, a drag, or ← →; ↑ ↓ scroll a row. */
const FREE_Y = () => (SCROLL.lift[1] + SCROLL.zoom[0]) / 2 * (track.offsetHeight - innerHeight);   // the floating globe
const ROWS = BROWSE.from - BROWSE.to + 1;
const rowY = row => (SCROLL.browse[0] + (BROWSE.from - row + 0.5) / ROWS * (SCROLL.browse[1] - SCROLL.browse[0])) * (track.offsetHeight - innerHeight);
let bandRow = null;                                         // the row the scroll position has walked to

/* you've turned to another row yourself (a drag, the pan control): the scroll comes along to that
   row's stretch, so scrolling on carries on from where you are rather than swinging you back */
function keepRow() {
  if (mode !== 'focus' || !globe?.focus) return;
  const row = clamp(globe.focus.row, BROWSE.to, BROWSE.from);
  if (row === bandRow) return;
  bandRow = row;
  jumpTo(rowY(row));
}

addEventListener('keydown', e => {
  if (mode !== 'focus' || !globe || !stageInView()) return;
  const along = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
  if (along) { e.preventDefault(); globe.stepFocus(along, 0); return; }
  const up = { ArrowUp: 1, ArrowDown: -1 }[e.key];
  if (!up || bandRow === null) return;
  e.preventDefault();
  const row = bandRow + up;
  glideTo(row > BROWSE.from ? FREE_Y() : row < BROWSE.to ? track.offsetTop + track.offsetHeight - innerHeight : rowY(row));
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

/* the story's speed zones (SCROLL.pace, and the folders' FILES.pace): over those stretches the scroll itself
   is held to a pace you can follow, however hard you scroll (js/scroll.js) — everything still just follows it */
const storyPx = f => f * (track.offsetHeight - innerHeight);
for (const [a, b, v, carry, whole] of SCROLL.pace) slowIn(() => [storyPx(a), storyPx(b)], v, carry, whole);
slowIn(() => [storyPx(1), $('deskSlot').offsetTop], ...FILES.pace);

/* ---------- keeping it smooth on a phone ----------
   (Phones only — PERF.adapt. A computer always draws at full quality.)
   Every second, the average frame time. Slower than about 42 frames a second and the 3D is
   drawn at fewer pixels (a step at a time, down to half); back at a steady 60 for a few
   seconds and it steps back up — but not again to a level that proved too slow straight after
   stepping up to it, so it settles instead of see-sawing. */
const gov = { t: 0, n: 0, calm: 0, ceil: 1, raised: -1e9, from: performance.now() + 2500 };   // not while it's still starting up
function govern(dt, now) {
  if (!PERF.adapt || dt > 0.25 || now < gov.from) return;                   // a hiccup (a tab switch, a load), not the pace
  gov.t += dt; gov.n++;
  if (gov.t < 1) return;
  const ms = gov.t / gov.n * 1000, q = stage.quality;
  gov.t = gov.n = 0;
  if (ms > 24 && q > 0.7) {
    if (now - gov.raised < 5000) gov.ceil = q * 0.97;       // just stepped up to this, and it's too much
    stage.setQuality(Math.max(0.7, q * 0.85)); gov.calm = 0;
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

/* ---------- your own zoom, and the pan control (Google Earth-like) ----------
   uz: how far you've zoomed in (+) or out (−) from where the scroll has the camera, in the same
   units as the scroll's zoom (1 = from floating free to one card filling the screen) */
const Z_MIN = -0.5, Z_MAX = 1.45;
let uz = 0, uzT = 0, uzW = 0, held = null, heldNext = 0;
const turnQ = { x: 0, y: 0 };                               // turning still to do, eased out over the next frames
const zoomBy = d => { const zNow = mode === 'focus' ? 1 : 0; uzT = clamp(uzT + d, Z_MIN - zNow, Z_MAX - zNow); };

/* a pan or zoom button held down; a tap does one step */
function steer(dt, now) {
  const going = held && now >= held.from;
  if (going && held.zoom) zoomBy(held.zoom * 1.1 * dt);
  if (going && held.pan && mode === 'free') { turnQ.x -= held.pan[0] * 1.4 * dt; turnQ.y += held.pan[1] * 1.0 * dt; }
  if (held?.pan && mode === 'focus' && now >= heldNext) { heldNext = now + 420; stepView(held.pan); }
  if (globe && mode === 'free' && (turnQ.x || turnQ.y)) {
    const k = 1 - Math.exp(-dt * 9), ax = turnQ.x * k, ay = turnQ.y * k;
    globe.turn(ax, ay); turnQ.x -= ax; turnQ.y -= ay;
    if (Math.abs(turnQ.x) + Math.abs(turnQ.y) < 1e-4) turnQ.x = turnQ.y = 0;
  } else if (mode !== 'free') turnQ.x = turnQ.y = 0;
}
/* inside the globe the pan control moves a card at a time: along the row, or to the row above or below */
function stepView([ax, ay]) {
  if (!globe?.focus) return;
  if (ax) { globe.stepFocus(ax, 0); return; }
  const row = clamp((bandRow ?? globe.focus.row) + ay, BROWSE.to, BROWSE.from);
  if (row !== bandRow) glideTo(rowY(row));
}

/* the globe's page, as it becomes a file: the 3D drawn just as it is the moment you're done with the
   globe — the floating view, the hands open beneath it — into a full-screen picture that the Work folder's
   sheet carries over a copy of the paper (files.js). From then on the real page is hidden and the globe
   held still, so scrolling back up it takes over again exactly where the picture leaves off */
let snapped = false;
const stageEl = $('stage');
function snapPage(time) {
  if (!files.shot || !renderer.domElement.width || !renderer.domElement.height) return;   // no picture to take yet
  snapped = true;
  const cup = hands.update(time, 1, 1, 1, handsBelow, handsEdge);   // open, settled, in place
  hands.pair.visible = true; dot.visible = false; globe.group.visible = true;
  stage.inner.position.copy(cup); stage.inner.intensity = 0;
  camera.position.copy(CAM_POS); camera.lookAt(CAM_AT); camera.updateMatrixWorld();
  globe.group.position.copy(GLOBE_AT); globe.group.scale.setScalar(GLOBE.radius); globe.group.lookAt(CAM_POS);
  globe.group.updateMatrixWorld(true);
  const d = camera.position.distanceTo(GLOBE_AT);
  scene.fog.near = d - GLOBE.radius * 0.2; scene.fog.far = d + GLOBE.radius * 5.5;
  renderer.shadowMap.needsUpdate = true;
  renderer.render(scene, camera);
  const out = files.shot.canvas, src = renderer.domElement;
  out.width = src.width; out.height = src.height;
  out.getContext('2d').drawImage(src, 0, 0);
  const c = GLOBE_AT.clone().project(camera);
  files.shot.ready((1 - c.y) / 2 * H);                      // where the globe is on the page, to keep it in sight in the folder
}
addEventListener('resize', () => { snapped = false; });

function frame(now) {
  requestAnimationFrame(frame);
  lenis?.raf(now);                                          // the smooth scroll moves first: everything below is drawn where the page now is
  const dt = Math.min((now - last) / 1000, 0.1); last = now;
  const time = now / 1000;
  const target = scrollTarget();
  p = target;                                                             // exactly where the scroll is: the smooth scroll is the only easing
  story.p = p;
  // (the story's progress first: however far past the globe the scroll is, the folders follow it to the end)
  if (scrollY >= track.offsetTop + track.offsetHeight - 1 && p > SCROLL.shrink[0]) {    // scrolled out of view and handed over: nothing to draw
    if (hovered) setHovered(null);
    videoK = -1; globe?.setPlaying(-1);
    if (globe && !snapped) { snapPage(time); renderer.clear(); }          // …but the folder still needs its picture of the page
    stageEl.style.visibility = 'hidden';
    return;
  }

  const dp = p - pPrev; pPrev = p;
  // stepping back out, and the page going into its folder, follow the scroll itself, so they line up exactly
  // with the folders (which follow it too); the picture of the page takes over the moment it starts to close
  // (both follow p, at the story's pace, as the folders do — so however fast you scroll, the page is handed
  // over to them, and they close it, in step)
  const unzoom = eio(sm(SCROLL.unzoom, p)), handed = !Number.isFinite(FORCE_P) && p > SCROLL.shrink[0];   // (the folders' own test is the exact opposite)
  // and until it is handed over, the globe's page stays on the screen even if the scroll has run on past it
  stageEl.classList.toggle('pinned', !handed && scrollY > track.offsetTop + track.offsetHeight - innerHeight);
  const enter = eio(sm(SCROLL.enter, p)), open = sm(SCROLL.open, p), lift = sm(SCROLL.lift, p);
  const zoom = eio(sm(SCROLL.zoom, p)) * (1 - unzoom);
  if (globe && handed && !snapped) { if (hovered) setHovered(null); snapPage(time); }   // a picture of the page, as it is (its heading as it reads by default), goes into the folder
  if (!handed) snapped = false;
  stageEl.style.visibility = handed && snapped ? 'hidden' : '';

  // hands rise into view, part, and settle a touch once the globe has risen clear
  const cup = hands.update(time, open, sm([0.6, 1], lift), enter, handsBelow, handsEdge);

  let R = GLOBE.seed;
  if (globe) {
    // small enough to hide between the closed palms; grows steadily as it rises
    R = GLOBE.seed * Math.pow(GLOBE.radius / GLOBE.seed, lift);
    globe.group.position.lerpVectors(cup, GLOBE_AT, lift);
    globe.group.position.y += Math.sin(Math.PI * lift) * 0.02 + Math.sin(time * 0.8) * 0.004 * lift * (1 - zoom) * (1 - unzoom);
    globe.group.scale.setScalar(R);
    globe.group.lookAt(CAM_POS);                            // rows stay level with the page
    globe.group.visible = lift > 0;                        // until it starts to rise it's hidden in the closed hands: don't draw it
  }

  // camera: the fixed view, carried in toward the front card as you zoom — and your own zoom on top
  // (z beyond 1 goes closer than the scroll does, below 0 further out than the floating view)
  // (stepped back out, floating a moment before the page closes, it's just as its picture will have it: no zoom of your own, no peek)
  uzW += (((mode === 'free' && !unzoom) || mode === 'focus' ? 1 : 0) - uzW) * (1 - Math.exp(-dt * 8));
  uz += (uzT - uz) * (1 - Math.exp(-dt * 9));
  const z = clamp(zoom + uz * uzW, Z_MIN, Z_MAX);
  camera.position.copy(CAM_POS);
  _at.copy(CAM_AT);
  if (globe && z > 0) {
    const zd = zoomDistance(R) * (1 - 0.55 * sm([1, Z_MAX], z));
    _close.copy(globe.group.position).addScaledVector(TO_CAM, R + zd);
    camera.position.lerp(_close, Math.min(z, 1));
    _at.lerp(globe.group.position, Math.min(z, 1));
  } else if (globe && z < 0) {
    camera.position.sub(globe.group.position).multiplyScalar(1 - z * 0.9).add(globe.group.position);
  }
  if (mode === 'free' && !unzoom) { camera.position.x += mouse.x * 0.012 * (Math.abs(mouse.x) < 2); camera.position.y += mouse.y * 0.008 * (Math.abs(mouse.y) < 2); }
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

  // the readout belongs to the work, not the landing or the zoomed-in view — and it's back as you step out,
  // so the page that goes into the folder carries its heading
  const away = p < SCROLL.drop[1] || (mode === 'zooming' && unzoom < 0.3) || mode === 'focus' || mode === 'packing';
  if (away !== readoutAway) { readoutAway = away; readout.classList.toggle('away', away); }

  if (globe) {
    const d = camera.position.distanceTo(globe.group.position);
    scene.fog.near = d - R * 0.2;
    scene.fog.far = d + R * 5.5;

    // which phase are we in?
    // (stepping back out is 'zooming' all the way, so nothing floats in — no guide, no controls — before the page closes)
    // (once you've stepped all the way back out it floats free again — the real page, ready to use — until the page closes)
    const next = lift < 0.985 ? 'rising' : handed ? 'packing' : zoom >= 0.985 ? 'focus' : zoom >= 0.002 || (unzoom > 0 && unzoom < 0.999) ? 'zooming' : 'free';
    if (next !== mode) {
      mode = next;
      globe.setFocus(mode === 'zooming' || mode === 'focus');
      if (mode !== 'free' && mode !== 'focus') { setHovered(null); uzT = 0; held = null; }   // your zoom is for the view you set it in
      if (mode === 'focus' && globe.focus) showProject(globe.focus.k); else if (!hovered) showDefault();
    }
    // inside, where you are in the scroll picks the row: scrolling on walks down the globe, scrolling
    // back walks up it (read from the scroll itself once you're in, so a row you've turned to stays put)
    if (mode === 'zooming' || mode === 'focus') {
      const f = clamp(((mode === 'focus' ? target : p) - SCROLL.browse[0]) / (SCROLL.browse[1] - SCROLL.browse[0]), 0, 0.9999);
      const row = BROWSE.from - Math.floor(f * ROWS);
      if (row !== bandRow) { bandRow = row; globe.aimRow(row); }
    } else bandRow = null;
    setGuide(mode === 'free' || (mode === 'focus' && stageInView()) ? mode : '');
    earth.classList.toggle('on', ((mode === 'free' && !unzoom) || mode === 'focus') && stageInView());
    steer(dt, now);
    if (interactive() && !dragging && fine) { ray.setFromCamera(mouse, camera); setHovered(stageInView() ? globe.pick(ray) : null); }
    if (mode === 'focus' && globe.focus !== lastFocus && !hovered) showProject(globe.focus.k);
    lastFocus = globe.focus;

    peek.set(Math.abs(mouse.x) < 2 ? mouse.x : 0, Math.abs(mouse.y) < 2 ? mouse.y : 0);
    if (unzoom > 0) peek.set(0, 0);                         // stepping back out: no peeking, so it's just as the picture will have it
    // a project's video plays only once you've zoomed in and its card has come to rest in the middle;
    // it stops the moment you move on to another card or back out
    const k = mode === 'focus' && globe.focus && stageInView() ? globe.focus.k : -1;
    if (k !== videoK) {
      if (videoK !== -1) videoK = -1;                        // moved off it: stop at once
      else if (k !== -1 && globe.settled) videoK = k;        // arrived: start, from the beginning
    }
    globe.setPlaying(videoK);
    // floating free it turns slowly by itself — more slowly the closer you've zoomed in; packed away it's held still
    globe.update(dt, { scrollSpin: dp * SCROLL.spin * (1 - lift), hovered, dragging, peek, frozen: handed,
                       idle: reduced ? 0 : 1 - 0.85 * clamp(z, 0, 1) });
    stage.inner.position.copy(cup);
  }

  // warm light glowing between the closed fingers, fading as they part
  // it flares as the full stop lands between the thumbs
  const land = Math.exp(-(((p - SCROLL.drop[1]) * STORY_VH / 7.2) ** 2));
  stage.inner.intensity = 0.05 * enter * (1 - sm([0.04, 0.3], open)) * (0.85 + 0.15 * Math.sin(time * 2.1) + 1.4 * land);

  const handsSeen = inView(hands.pair, 0.01);
  hands.pair.visible = handsSeen;
  renderer.shadowMap.autoUpdate = handsSeen;                // only the hands take shadows
  if (!handed && (handsSeen || dot.visible || (globe && lift > 0.001))) {   // (once the page is in its folder, nothing to draw)
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
