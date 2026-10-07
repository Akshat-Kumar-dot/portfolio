/* ============================================================
   FILES — between the globe and Behind the scenes, the site's
   sections as a stack of folders: Notes, Work, Behind the scenes,
   About, Contact, one behind the other, their tabs stepping across.

   All of it follows the scroll, both ways, and nothing holds on to it.
   It begins with the page you've been on — the globe's — becoming a
   file: the whole screen turns into a sheet of paper (a picture of it,
   standing in for the 3D page: main.js) and shrinks down into the Work
   folder as the stack rises round it (closeVh) — the opening below, in
   reverse. Then on through the stack, a folder every stepVh: each one's
   sheet rises out as it comes up and settles as the next does. Behind
   the scenes' sheet is the real page, shrunk down. All of it is in step
   with the scroll — the scroll there just can't go faster than you can
   follow (a speed zone, js/scroll.js), a phone's fling too. Scroll on
   (openVh) and the folders around it drop away while the sheet grows
   to fill the screen — ending exactly where the page sits in the
   document (#deskSlot), so the page is handed over from the sheet to
   its place without a jump. Scroll back up and it shrinks back into
   its folder, and on up into the globe.
   ============================================================ */
import { $, clamp, lerp, sm, eio, rng } from './utils.js';
import { onScroll, landOn } from './scroll.js';

const INSET = 14;                             // the sheet inside its folder, px from each side

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const hex = c => [1, 3, 5].map(k => parseInt(c.slice(k, k + 2), 16));
const mix = (a, b, t) => 'rgb(' + hex(a).map((v, k) => Math.round(v + (hex(b)[k] - v) * t)).join(',') + ')';

/* a folder's back, with its tab: tab at tx, tw wide, T tall, smooth shoulders */
function backPath(w, h, tx, tw, T) {
  const r = 12, s = T * 0.95;
  return `M0 ${T + r} Q0 ${T} ${r} ${T} L${tx} ${T} C${tx + s * 0.55} ${T} ${tx + s * 0.45} 0 ${tx + s} 0 ` +
         `L${tx + tw - s} 0 C${tx + tw - s * 0.45} 0 ${tx + tw - s * 0.55} ${T} ${tx + tw} ${T} ` +
         `L${w - r} ${T} Q${w} ${T} ${w} ${T + r} L${w} ${h} L0 ${h} Z`;
}

/* for the Notes folder: a small sketch of a notes graph — a few clusters, linked */
export function graphSketch() {
  const r = rng('sketch'), pts = [], links = [];
  const hubs = [[48, 30], [120, 22], [186, 38], [96, 62]];
  hubs.forEach(([hx, hy], h) => {
    const base = pts.length;
    pts.push([hx, hy, 2.6]);
    for (let k = 0; k < 9; k++) {
      const a = r() * Math.PI * 2, d = 8 + r() * 16;
      pts.push([hx + Math.cos(a) * d * 1.4, hy + Math.sin(a) * d * 0.8, 0.9 + r() * 0.8]);
      links.push([base, pts.length - 1]);
    }
    if (h) links.push([0, base]);
  });
  links.push([30, 10], [20, 30]);                             // a couple of notes that link across
  const svg = `<svg class="f-graph" viewBox="0 0 230 86" aria-hidden="true">${
    links.map(([a, b]) => `<line x1="${pts[a][0].toFixed(1)}" y1="${pts[a][1].toFixed(1)}" x2="${pts[b][0].toFixed(1)}" y2="${pts[b][1].toFixed(1)}"/>`).join('')}${
    pts.map(([x, y, s]) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${s.toFixed(2)}"/>`).join('')}</svg>`;
  const tpl = document.createElement('template');
  tpl.innerHTML = svg;
  return tpl.content.firstChild;
}

/* folders: [{ n, name, line, media? }]; target: the one that opens (its sheet holds #desk) */
/* holder: the folder the globe's page goes into. The section begins closeVh before the globe's scroll
   ends (main.js overlaps them), so it's there to take the page the moment it's done with. story.p is the
   globe's own progress (main.js), and closeAt the stretch of it over which its page closes into the folder:
   it closes at the globe's pace, so it's in step with the page it stands in for */
export function createFiles({ folders, target, cue, stepVh = 30, openVh = 55, holder = 1, closeVh = 0, story = null, closeAt = [1, 1], reduced = false }) {
  const root = document.documentElement, section = $('files'), stage = $('filesStage');
  const desk = $('desk'), slot = $('deskSlot');

  const n = folders.length;
  stage.innerHTML = folders.map((f, i) => `
    <div class="folder${i === target ? ' target' : ''}${i === holder ? ' holder' : ''}">
      <svg class="f-back" aria-hidden="true"><path/></svg>
      <p class="f-tab"><span>${esc(f.n)}</span>${esc(f.name)}</p>
      <div class="f-sheet">${i === target ? '<div class="f-page"></div>'
        : `<div class="f-note"><p class="f-n">(${esc(f.n)})</p><p class="f-name">${esc(f.name)}</p><p class="f-line">${esc(f.line || '')}</p><div class="f-media"></div></div>`}${
        i === holder ? '<div class="f-shot" aria-hidden="true"><div class="f-shot-paper"></div><div class="f-shot-grain"></div><canvas class="f-shot-3d"></canvas></div>' : ''}</div>
      <div class="f-front"></div>
    </div>`).join('') + `
    <div class="folder cover">
      <svg class="f-back" aria-hidden="true"><path/></svg>
      <div class="cover-face">
        <p class="cover-idx"></p>
        <p class="cover-name"><span></span></p>
        <p class="cover-cue">${esc(cue)} <b>↓</b><i></i></p>
      </div>
    </div>`;
  const els = [...stage.querySelectorAll('.folder')].map((el, i) => ({
    el, i, cover: i === n, back: el.querySelector('.f-back'), path: el.querySelector('path'), tab: el.querySelector('.f-tab'),
    sheet: el.querySelector('.f-sheet'), front: el.querySelector('.f-front')
  }));
  folders.forEach((f, i) => { if (f.media) els[i].sheet.querySelector('.f-media')?.append(f.media); });
  const page = stage.querySelector('.f-page'), tf = els[target], hf = els[holder];
  const shot = stage.querySelector('.f-shot'), shotGrain = shot?.querySelector('.f-shot-grain'), shotCanvas = shot?.querySelector('.f-shot-3d');
  if (shot) {                                                // the globe page's top bar, as it is on that page
    const top = document.querySelector('.top')?.cloneNode(true);
    if (top) { top.querySelectorAll('[id]').forEach(e => e.removeAttribute('id')); top.removeAttribute('id'); shot.append(top); }
  }
  const coverName = stage.querySelector('.cover-name'), coverIdx = stage.querySelector('.cover-idx');
  const coverCue = stage.querySelector('.cover-cue'), cueLine = coverCue.querySelector('i');

  // colours: the site's terracotta, paler toward the back of the stack
  const ACC = '#c65a3a', DEEP = '#a9472b', BG = '#f3ede2';
  els.forEach(({ el, i, cover }) => {
    const t = cover ? 1 : 0.6 + 0.36 * i / n;
    el.style.setProperty('--f-back', mix(BG, DEEP, t));
    el.style.setProperty('--f-front', mix(BG, ACC, t * 0.9));
  });

  /* ---------- where the page is: in its folder, or out in the document ---------- */
  let out = false;
  let before = false;                                        // still on the globe's page: nothing of the stack to show yet
  function handOver(toSlot) {
    out = toSlot;
    (toSlot ? slot : page).append(desk);
    slot.classList.toggle('empty', !toSlot);
    stage.style.visibility = out || before ? 'hidden' : '';
    root.classList.toggle('filing', !out && !before);       // while it plays, what's after it stays out of sight (style.css)
  }
  handOver(false);

  /* ---------- sizes ----------
     The section is a screen plus the scrolling it takes: STEP per folder up to the page,
     then OPEN. The page's place (#deskSlot) starts a screen before the section ends, so
     the moment the opening finishes, the top of the screen is exactly the top of the page. */
  let W = 0, H = 0, T = 26, geo = [], s0 = 1, s1 = 1, STEP = 1, OPEN = 1, L = 1, CLOSE = 0, PRE = 0, BUF = 0, LAND = 0, SHIFT = 0, shotOn = false;
  function fit() {
    if (!root.clientWidth || !innerHeight) return;            // not laid out yet (a tab opened in the background)
    W = root.clientWidth; H = innerHeight;
    STEP = H * stepVh / 100; OPEN = H * openVh / 100;
    CLOSE = H * closeVh / 100; PRE = CLOSE;
    L = PRE + (target - holder) * STEP + OPEN;
    LAND = H * 0.27;
    const narrow = W < 760;
    T = narrow ? 22 : 26;
    const G = clamp(H * (narrow ? 0.052 : 0.062), 30, 64), top0 = H * 0.3;
    stage.style.setProperty('--tab', T + 'px');
    stage.style.setProperty('--peek', Math.round(G * 0.42) + 'px');
    geo = els.map(({ i, cover, tab }) => {
      const w = W * (cover ? (narrow ? 1.02 : 0.94) : (narrow ? 0.86 + 0.03 * i : 0.6 + 0.065 * i));
      const tw = cover ? w * 0.26 : Math.min(w * 0.6, tab.offsetWidth + T * 1.9 + 14);   // the tab fits its label
      const tx = cover ? (w - tw) / 2 : (w - tw) * (0.03 + 0.94 * i / (n - 1));
      const y = top0 + i * G + (cover ? G * 0.35 : 0);
      return { x: (W - w) / 2, y, w, h: H - y + 80, tx, tw };
    });
    els.forEach(({ el, back, path, tab }, i) => {
      const g = geo[i];
      Object.assign(el.style, { left: g.x + 'px', top: g.y + 'px', width: g.w + 'px', height: g.h + 'px' });
      back.setAttribute('width', g.w); back.setAttribute('height', g.h);
      back.setAttribute('viewBox', `0 0 ${g.w} ${g.h}`);
      path.setAttribute('d', backPath(g.w, g.h, g.tx, g.tw, T));
      if (tab) tab.style.left = (g.tx + T * 0.95) + 'px';
    });
    // the page inside its folder: laid out at full width, shrunk to the sheet's
    s0 = (geo[target].w - INSET * 2) / W;
    page.style.width = W + 'px';
    page.style.transform = `scale(${s0})`;
    const pageH = Math.max(desk.offsetHeight, H);
    tf.sheet.style.height = Math.max(pageH * s0, geo[target].h) + 'px';
    // room for the page to finish opening while the scroll runs on past it (a phone's fling) — as much as the
    // page is long, so nothing after it comes into view before it's done
    BUF = clamp(pageH - H, H * 0.8, H * 2.5);
    section.style.height = (H + L + BUF) + 'px';
    // the globe's page in its folder: the screen as it was, shrunk to the sheet's width
    if (shot) {
      s1 = (geo[holder].w - INSET * 2) / W;
      Object.assign(shot.style, { width: W + 'px', height: H + 'px', transform: `scale(${s1})` });
      // (once it holds the page's picture the sheet is exactly as tall as the page it shows: draw())
      hf.sheet.style.height = (shotOn ? s1 * (H - SHIFT) : Math.max(H * s1, geo[holder].h)) + 'px';
    }
    Object.assign(slot.style, { height: pageH + 'px', marginTop: -(H + BUF) + 'px' });
    place();
  }
  addEventListener('resize', fit);
  document.fonts?.ready.then(fit);
  new ResizeObserver(() => { if (Math.abs(Math.max(desk.offsetHeight, H) - slot.offsetHeight) > 1) fit(); }).observe(desk);

  /* ---------- following the scroll, shot by shot ----------
     Like a film's sequence, one shot after another, each over its own stretch of the scroll — and the
     scroll there is held to a pace you can follow, however hard you scroll (a speed zone: main.js,
     scroll.js), so every shot plays in step with it, never on by itself:
       1. the globe's page closes into the Work folder (with the globe's own progress: main.js)
       2. it sinks into the folder, the stack giving a little as it takes it; a beat; and the next page
          comes up out of its own, rising a touch past and settling (sw: 0 → 1)
       3. that page opens, heading for wherever its own place is on screen right then, and is handed
          over exactly there (o: 0 → 1) */

  let sw = 0, o = 0, shown = -1, last = performance.now(), lastS = null, easing = false;

  function place(now = performance.now()) {
    const dt = Math.min((now - last) / 1000, 0.1); last = now;
    const top = section.getBoundingClientRect().top, s = -top;          // how far into the section you've scrolled
    const c = shot && story ? 1 - clamp((story.p - closeAt[0]) / (closeAt[1] - closeAt[0]), 0, 1) : 0;   // 1 → 0
    const wasBefore = before;
    before = !!shot && c >= 1;                               // still the globe's page: nothing of the stack to show yet
    const swAim = clamp((s - CLOSE) / STEP, 0, 1), oAim = clamp((s - CLOSE - STEP) / OPEN, 0, 1);
    lastS = s;
    sw = swAim; o = oAim;                                     // exactly where the scroll is: the smooth scroll is the only easing
    easing = c > 0 && c < 1;
    // the page goes to its place once it has opened all the way there (the last of it is too small to see)
    const wantOut = s >= L - 0.5 && o >= 0.98;
    if (wantOut !== out || before !== wasBefore) handOver(wantOut);
    if (!out && !before) draw(o, c, sw, L - s);
  }
  onScroll(place);
  landOn(() => slot.offsetTop);                              // opened: the page comes to rest on its top for a beat
  // every frame while any of it is under way, or near enough that the globe's pace may move it on
  (function loop(now) {
    requestAnimationFrame(loop);
    const near = lastS !== null && lastS > -H * 3 && lastS < L + BUF + H;
    if (easing || near) place(now); else last = now;
  })(performance.now());

  /* how far along a sheet is in becoming its page (t: 0 in its folder → 1 the page): the sheet slides a
     little further out, then grows into the page, while the stack slides away beneath it, all together
     and each folder in its place — so the ones in front keep covering the rest */
  const phase = t => ({ lead: sm([0, 0.3], t), grow: eio(sm([0.12, 1], t)), drop: eio(sm([0.04, 0.72], t)) });
  const backOut = t => { const k = 0.9, u = t - 1; return 1 + (k + 1) * u * u * u + k * u * u; };   // up, a touch past, and back

  function draw(o, c, sw, placeTop) {
    const PASS = H * 0.15;
    const O = phase(o), C = phase(c);
    // shot 2: the globe's page sinks into its folder; a beat; the next page rises out of its own
    const lH = 1 - eio(sm([0, 0.42], sw)), rise = sm([0.56, 1], sw), lT = rise > 0 ? backOut(rise) : 0;
    const dip = Math.sin(Math.PI * sm([0.16, 0.6], sw)) * H * 0.014;   // the stack giving a little as it takes the page
    els.forEach((f, i) => {
      const l = i === holder ? lH : i === target ? lT : 0;   // how far this one's sheet is out
      // below the page, as one opens or closes
      const y = dip - Math.min(l, 1) * 8 + (i > target ? O.drop * H * 1.1 : 0) + (i > holder && shot ? C.drop * H * 1.1 : 0);
      f.el.style.transform = `translateY(${y.toFixed(1)}px)`;
      if (i < target || (i < holder && shot)) f.el.style.opacity = (Math.min(i < target ? 1 - sm([0, 0.6], o) : 1, i < holder && shot ? 1 - sm([0, 0.6], c) : 1)).toFixed(3);
      if (f.cover || !f.sheet) return;
      const opening = i === target ? o : i === holder && shot ? c : 0, E = i === target ? O : C, s = i === target ? s0 : s1;
      const up = l * (i === target || (i === holder && shot) ? LAND : PASS);
      if (i === holder && shotOn) {
        // in the folder the picture slides up to keep the globe above the folder's front; the sheet ends exactly
        // where the page does, so as it closes it's the page itself, edge to edge — no blank paper below it
        const shift = SHIFT * (1 - (opening ? E.grow : 0));
        shot.style.transform = `scale(${s1}) translateY(${(-shift).toFixed(1)}px)`;
        f.sheet.style.height = (s1 * (H - shift)).toFixed(1) + 'px';
      }
      if (!opening) {
        f.sheet.style.transform = `translateY(${(-up).toFixed(1)}px)`;
        if (i === target || i === holder) {
          for (const x of [f.back, f.tab, f.front]) x.style.transform = '';
          Object.assign(f.sheet.style, { borderRadius: '', boxShadow: '', background: '' });
        }
        return;
      }
      // the rest of this folder drops away, and the sheet grows until the page in it is full size, its
      // top-left at the screen's — where the page itself is, either side of the hand-over
      for (const x of [f.back, f.tab, f.front]) x.style.transform = `translateY(${(E.drop * H * 1.1).toFixed(1)}px)`;
      const x0 = geo[i].x + f.sheet.offsetLeft, y0 = geo[i].y + y + f.sheet.offsetTop;
      const from = y0 - LAND - E.lead * H * 0.06;
      // Behind the scenes heads for its page's place, wherever that is on screen now (placeTop) — so whenever
      // it gets there the page is handed over without a jump; the globe's page stood still on the screen
      const top = lerp(from, i === target ? placeTop : 0, E.grow);
      const tx = -x0 * E.grow, ty = top - y0, sc = 1 + (1 / s - 1) * E.grow;
      f.sheet.style.transform = `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px) scale(${sc.toFixed(5)})`;
      const r = (6 * (1 - E.grow)).toFixed(2);
      f.sheet.style.borderRadius = i === holder && shotOn ? `${r}px` : `${r}px ${r}px 0 0`;   // the globe's page shows its foot as it closes
      f.sheet.style.boxShadow = E.grow > 0.9 ? 'none' : '';
      // at the very end the paper thins away, leaving the page on the site's own background — as it is out of the folder
      f.sheet.style.background = i === target ? `rgba(251,248,241,${(1 - sm([0.6, 1], E.grow)).toFixed(3)})` : '';
    });

    // the front cover reads out the folder that's up, and at the page, how to open it
    const cur = sw < 0.5 ? holder : target;
    if (cur !== shown) {
      shown = cur;
      coverIdx.textContent = `${folders[cur].n} / ${String(n).padStart(2, '0')}`;
      const span = document.createElement('span');
      span.textContent = folders[cur].name;
      coverName.replaceChildren(span);
    }
    coverCue.style.opacity = (sm([0.85, 1], sw) * (1 - sm([0.2, 0.45], o))).toFixed(3);
    cueLine.style.transform = `scaleX(${sm([0, 0.3], o).toFixed(4)})`;
  }

  fit();

  return {
    /* the globe's page, standing in for it in its folder: main.js draws the 3D into `canvas`,
       full screen, then calls ready() — the paper and its grain are copied from the page itself */
    shot: shot && {
      canvas: shotCanvas,
      ready(focusY = H * 0.45) {
        // in the folder, the part of the page above the folder's front: slide the content up to centre the globe in it
        const seenH = (LAND + T + 12) / s1;
        SHIFT = clamp(focusY - seenH * 0.52, 0, H * 0.5);
        shotGrain.style.backgroundImage = $('grain').style.backgroundImage;
        // its heading, as it reads now
        shot.querySelector('.readout')?.remove();
        const ro = $('readout')?.cloneNode(true);
        if (ro) { ro.querySelectorAll('[id]').forEach(e => e.removeAttribute('id')); ro.removeAttribute('id'); ro.classList.remove('away', 'swap'); shot.append(ro); }
        hf.sheet.classList.add('has-shot');
        shotOn = true;
        place();
      }
    }
  };
}
