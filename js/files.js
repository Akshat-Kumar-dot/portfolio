/* ============================================================
   FILES — between the globe and Behind the scenes, the site's
   sections as a stack of folders: Notes, Work, Behind the scenes,
   About, Contact, one behind the other, their tabs stepping across.

   All of it follows the scroll, both ways, and nothing holds on to it.
   Scroll and you go through the stack, a folder every stepVh: each
   one's sheet rises out as it comes up and settles as the next does.
   Behind the scenes' sheet is the real page, shrunk down. Scroll on
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
export function createFiles({ folders, target, cue, stepVh = 30, openVh = 55, reduced = false }) {
  const root = document.documentElement, section = $('files'), stage = $('filesStage');
  const desk = $('desk'), slot = $('deskSlot');

  const n = folders.length;
  stage.innerHTML = folders.map((f, i) => `
    <div class="folder${i === target ? ' target' : ''}">
      <svg class="f-back" aria-hidden="true"><path/></svg>
      <p class="f-tab"><span>${esc(f.n)}</span>${esc(f.name)}</p>
      <div class="f-sheet">${i === target ? '<div class="f-page"></div>'
        : `<div class="f-note"><p class="f-n">(${esc(f.n)})</p><p class="f-name">${esc(f.name)}</p><p class="f-line">${esc(f.line || '')}</p><div class="f-media"></div></div>`}</div>
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
  const page = stage.querySelector('.f-page'), tf = els[target];
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
  function handOver(toSlot) {
    out = toSlot;
    (toSlot ? slot : page).append(desk);
    slot.classList.toggle('empty', !toSlot);
    stage.style.visibility = toSlot ? 'hidden' : '';
  }
  handOver(false);

  /* ---------- sizes ----------
     The section is a screen plus the scrolling it takes: STEP per folder up to the page,
     then OPEN. The page's place (#deskSlot) starts a screen before the section ends, so
     the moment the opening finishes, the top of the screen is exactly the top of the page. */
  let W = 0, H = 0, T = 26, geo = [], s0 = 1, STEP = 1, OPEN = 1, L = 1;
  function fit() {
    W = root.clientWidth; H = innerHeight;
    STEP = H * stepVh / 100; OPEN = H * openVh / 100; L = target * STEP + OPEN;
    section.style.height = (H + L) + 'px';
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
    Object.assign(slot.style, { height: pageH + 'px', marginTop: -H + 'px' });
    place();
  }
  addEventListener('resize', fit);
  document.fonts?.ready.then(fit);
  new ResizeObserver(() => { if (Math.abs(Math.max(desk.offsetHeight, H) - slot.offsetHeight) > 1) fit(); }).observe(desk);

  /* ---------- following the scroll ---------- */
  let pos = 0, shown = -1, last = performance.now(), easing = false;

  function place(now = performance.now()) {
    const dt = Math.min((now - last) / 1000, 0.1); last = now;
    const top = section.getBoundingClientRect().top, s = -top;          // how far into the section you've scrolled
    const o = clamp((s - target * STEP) / OPEN, 0, 1);                   // 0 → 1: the page opening out
    if ((s >= L - 0.5) !== out) handOver(!out);

    // through the stack: a folder every STEP, a little slower as each one comes up
    const q = clamp(s / STEP, 0, target), k = Math.min(Math.floor(q), target - 1), f = q - k;
    const aim = k + lerp(f, sm([0, 1], f), 0.6);
    const seen = !out && top < H && s < L;
    if (!seen || reduced || o > 0) pos = aim;                            // off screen or opening: exactly where the scroll is
    else pos += (aim - pos) * (1 - Math.exp(-dt * 20));                  // on it, a touch of easing
    if (Math.abs(aim - pos) < 1e-3) pos = aim;
    easing = pos !== aim;
    if (seen) draw(clamp(1 - top / H, 0, 1), o);
  }
  onScroll(place);
  landOn(() => slot.offsetTop);                              // opened: the page comes to rest on its top for a beat
  (function loop(now) { requestAnimationFrame(loop); if (easing) place(now); else last = now; })(performance.now());

  function draw(enter, o) {
    const LAND = H * 0.27, PASS = H * 0.15;
    const lead = sm([0, 0.3], o);                                        // the sheet slides a little further out…
    const grow = eio(sm([0.12, 1], o));                                  // …and grows into the page
    // while the stack slides away beneath it, all together and each folder in its place — so the
    // ones in front keep covering the rest, and the sheet simply comes up out of the stack
    const drop = eio(sm([0.04, 0.72], o));
    els.forEach((f, i) => {
      const ein = reduced ? 1 : eio(sm([0.08 + i * 0.06, 0.62 + i * 0.06], enter));
      const l = sm([0, 1], clamp(1 - Math.abs(pos - i), 0, 1));        // how far this one's sheet is out
      const y = (1 - ein) * H * 0.7 - l * 8 + (i > target ? drop * H * 1.1 : 0);
      f.el.style.transform = `translateY(${y.toFixed(1)}px)`;
      if (i < target) f.el.style.opacity = (1 - sm([0, 0.6], o)).toFixed(3);
      if (f.cover || !f.sheet) return;
      const up = l * (i === target ? LAND : PASS);
      if (i !== target || o === 0) {
        f.sheet.style.transform = `translateY(${(-up).toFixed(1)}px)`;
        if (i === target) {
          for (const x of [f.back, f.tab, f.front]) x.style.transform = '';
          Object.assign(f.sheet.style, { borderRadius: '', boxShadow: '', background: '' });
        }
        return;
      }
      // opening: the rest of this folder drops away, and the sheet grows until the page in it is
      // full size, its top-left at the screen's — where the page itself sits once handed over.
      // It rises slowly at first, then faster, arriving moving just as the scroll does, so there's
      // no jump at the hand-over (and a scroll that opens it comes to rest there: landOn, below)
      for (const x of [f.back, f.tab, f.front]) x.style.transform = `translateY(${(drop * H * 1.1).toFixed(1)}px)`;
      const x0 = geo[i].x + f.sheet.offsetLeft, y0 = geo[i].y + y + f.sheet.offsetTop;
      const from = y0 - LAND - lead * H * 0.06, rise = Math.max(1, OPEN / Math.max(1, y0 - LAND - H * 0.06));
      const tx = -x0 * grow, ty = from * (1 - Math.pow(o, rise)) - y0;
      const sc = 1 + (1 / s0 - 1) * grow;
      f.sheet.style.transform = `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px) scale(${sc.toFixed(5)})`;
      const r = (6 * (1 - grow)).toFixed(2);
      f.sheet.style.borderRadius = `${r}px ${r}px 0 0`;
      f.sheet.style.boxShadow = grow > 0.9 ? 'none' : '';
      // at the very end the paper thins away, leaving the page on the site's own background — as it is out of the folder
      f.sheet.style.background = `rgba(251,248,241,${(1 - sm([0.6, 1], grow)).toFixed(3)})`;
    });

    // the front cover reads out the folder that's up, and at the page, how to open it
    const cur = clamp(Math.round(pos), 0, n - 1);
    if (cur !== shown) {
      shown = cur;
      coverIdx.textContent = `${folders[cur].n} / ${String(n).padStart(2, '0')}`;
      const span = document.createElement('span');
      span.textContent = folders[cur].name;
      coverName.replaceChildren(span);
    }
    coverCue.style.opacity = (sm([target - 0.3, target], pos) * (1 - sm([0.2, 0.45], o))).toFixed(3);
    cueLine.style.transform = `scaleX(${sm([0, 0.3], o).toFixed(4)})`;
  }

  fit();
}
