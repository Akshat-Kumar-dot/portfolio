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
        its neighbours curve away at the edges; drag, swipe or use
        the arrow keys to move between cards
   Add ?p=0.4 to the URL to pin the progress while tuning.
   ============================================================ */
import * as THREE from 'three';
import { SITE, WORK, GLOBE, SCROLL, ZOOM } from './config.js';
import { $, clamp, lerp, sm, eio, pad, prefersReducedMotion, hasFinePointer } from './utils.js';
import { paintGrain } from './grain.js';
import { coverFontsReady, COVER_W, COVER_H } from './covers.js';
import { createStage } from './stage.js';
import { createHands } from './hands.js';
import { createGlobe } from './globe.js';
import { createGraph } from './graph.js';

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
paintGrain($('grain'));

/* ---------- page text, from SITE in config.js ---------- */
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const rich = s => esc(s).replace(/\*(.+?)\*/g, '<em>$1</em>');                 // *word* → italics
const years = WORK.map(w => +w.year).filter(Boolean);
const SPAN = years.length ? Math.min(...years) + ' — ' + Math.max(...years) : '';

$('brandName').textContent = SITE.name;
$('headline').innerHTML = SITE.name.split(/\s+/).map(w => `<span class="line">${esc(w)}</span>`).join('');
$('tagline').innerHTML = rich(SITE.headline.join(' '));
$('heroMeta').textContent = [SITE.role, SITE.location, `${WORK.length} projects, ${SPAN}`].filter(Boolean).join('  ·  ');
$('availability').textContent = SITE.available;
$('status').classList.toggle('hidden', !SITE.available);
$('tzLabel').textContent = SITE.tzLabel;
const clockFmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: SITE.timeZone });
const tickClock = () => { $('clock').textContent = clockFmt.format(new Date()); };
tickClock(); setInterval(tickClock, 15000);

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
let W = innerWidth, H = innerHeight;

function fit() {
  W = innerWidth; H = innerHeight;
  stage.resize(W, H);
  // on narrow screens widen the lens rather than cropping the sides
  const half = Math.tan(13 * Math.PI / 180) * Math.max(1, 1.2 / camera.aspect);
  camera.fov = Math.min(60, 2 * Math.atan(half) * 180 / Math.PI);
  camera.updateProjectionMatrix();
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

/* nav: Work scrolls to the floating globe; About and Contact are plain anchors */
function scrollToProgress(q) {
  scrollTo({ top: q * (track.offsetHeight - innerHeight), behavior: reduced ? 'auto' : 'smooth' });
}
$('navWork').addEventListener('click', e => { e.preventDefault(); scrollToProgress((SCROLL.lift[1] + SCROLL.zoom[0]) / 2); });
$('brand').addEventListener('click', e => { e.preventDefault(); scrollToProgress(0); });

/* how far from the front card the camera stops so it fills ZOOM of the screen */
function zoomDistance(R) {
  const t = Math.tan(camera.fov * Math.PI / 360);
  const cw = GLOBE.cardWidth * R, ch = cw * COVER_H / COVER_W;
  return Math.max(ch / (ZOOM.height * 2 * t), cw / (ZOOM.width * 2 * t * camera.aspect));
}

/* ---------- readout (bottom-left) and the guide line (bottom-centre) ---------- */
let mode = 'rising';                                        // rising → free → zooming → focus
const idx = v => '<b>' + v + '</b><span>/</span><span>' + pad(WORK.length) + '</span>';
function swap() { readout.classList.remove('swap'); void readout.offsetWidth; readout.classList.add('swap'); }
function showDefault() {
  roIdx.innerHTML = idx('—');
  roTitle.innerHTML = 'Selected <em>Work</em>';
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

const GUIDE = {
  free: 'Scroll to step inside ↓',
  focus: fine ? 'Drag or use ← → ↑ ↓ to move · Click to open' : 'Swipe to move · Tap to open'
};
function setGuide(m) {
  guide.textContent = GUIDE[m] || '';
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
    globe.drag(dx, dy);
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

/* arrow keys and sideways trackpad swipes, once you're inside */
addEventListener('keydown', e => {
  if (mode !== 'focus' || !globe) return;
  const k = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[e.key];
  if (!k) return;
  e.preventDefault();
  globe.stepFocus(k[0], k[1]);
});
let wheelLock = 0;
addEventListener('wheel', e => {
  if (mode !== 'focus' || !globe || Math.abs(e.deltaX) < 12 || Math.abs(e.deltaX) < Math.abs(e.deltaY)) return;
  const now = performance.now();
  if (now < wheelLock) return;
  wheelLock = now + 450;
  globe.stepFocus(e.deltaX > 0 ? 1 : -1, 0);
}, { passive: true });

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

/* ---------- scroll → progress ---------- */
function scrollTarget() {
  if (Number.isFinite(FORCE_P)) return clamp(FORCE_P, 0, 1);
  const max = track.offsetHeight - innerHeight;
  return max > 0 ? clamp(scrollY / max, 0, 1) : 1;
}

/* ---------- loop ---------- */
const _at = new THREE.Vector3(), _close = new THREE.Vector3(), _ray = new THREE.Vector3(), _from = new THREE.Vector3();
let p = scrollTarget(), pPrev = p, last = performance.now(), lastFocus = null, readoutAway = true;

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - last) / 1000, 0.1); last = now;
  const time = now / 1000;
  if (scrollY > track.offsetHeight) return;                 // scrolled on to About / Contact: nothing to draw

  const target = scrollTarget();
  p += (target - p) * (1 - Math.exp(-dt * (reduced ? 30 : 6)));           // eased, so scrolling feels smooth
  if (Math.abs(target - p) < 2e-4) p = target;                            // …but it does arrive (e.g. back at exactly 0)
  const dp = p - pPrev; pPrev = p;
  const enter = eio(sm(SCROLL.enter, p)), open = sm(SCROLL.open, p), lift = sm(SCROLL.lift, p);
  const zoom = eio(sm(SCROLL.zoom, p));

  // hands rise into view, part, and settle a touch once the globe has risen clear
  const cup = hands.update(time, open, sm([0.6, 1], lift), enter);

  let R = GLOBE.seed;
  if (globe) {
    // small enough to hide between the closed palms; grows steadily as it rises
    R = GLOBE.seed * Math.pow(GLOBE.radius / GLOBE.seed, lift);
    globe.group.position.lerpVectors(cup, GLOBE_AT, lift);
    globe.group.position.y += Math.sin(Math.PI * lift) * 0.02 + Math.sin(time * 0.8) * 0.004 * lift * (1 - zoom);
    globe.group.scale.setScalar(R);
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

  // the bottom-left readout belongs to the work, not the landing or the zoomed-in view
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
      setGuide(mode);
      if (mode === 'focus' && globe.focus) showProject(globe.focus.k); else if (!hovered) showDefault();
    }
    if (interactive() && !dragging && fine) { ray.setFromCamera(mouse, camera); setHovered(globe.pick(ray)); }
    if (mode === 'focus' && globe.focus !== lastFocus && !hovered) showProject(globe.focus.k);
    lastFocus = globe.focus;

    peek.set(Math.abs(mouse.x) < 2 ? mouse.x : 0, Math.abs(mouse.y) < 2 ? mouse.y : 0);
    globe.update(dt, { scrollSpin: dp * SCROLL.spin * (1 - lift), hovered, dragging, idle: reduced ? 0 : 1, peek });
    stage.inner.position.copy(cup);
  }

  // warm light glowing between the closed fingers, fading as they part
  // it flares as the full stop lands between the thumbs
  const land = Math.exp(-(((p - SCROLL.drop[1]) / 0.018) ** 2));
  stage.inner.intensity = 0.05 * enter * (1 - sm([0.04, 0.3], open)) * (0.85 + 0.15 * Math.sin(time * 2.1) + 1.4 * land);

  renderer.render(scene, camera);
}

coverFontsReady().then(() => {
  globe = createGlobe(renderer);
  scene.add(globe.group);
});
requestAnimationFrame(frame);

window.__dbg = { hands, stage, get globe() { return globe; }, get p() { return p; }, get mode() { return mode; } };
