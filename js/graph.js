/* ============================================================
   NOTES GRAPH — an Obsidian-style graph view, drawn straight onto
   the page (no frame: its edges simply fade out).

   Notes settle under a force simulation; unlinked notes drift to
   the edge. Zoom (only the graph zooms, not the page), pan, hover
   a note to light up its connections, drag notes about; file names
   fade in as you zoom closer.

   So a visitor scrolling past can't get stuck in it, a plain
   scroll-wheel only zooms once they've clicked the graph (a small
   label by the cursor says so); pinch and ctrl+scroll always work.

   createGraph({ frame, canvas, pill, dot }) → { setFold(t) }
     setFold: 0 = the graph, 1 = every note gathered into one dot
   ============================================================ */
import { forceSimulation, forceLink, forceManyBody, forceX, forceY, forceCollide } from 'd3-force';

const INK = '29,27,23', ACCENT = '#c65a3a';
const LABEL = '500 11px "JetBrains Mono", ui-monospace, Menlo, Consolas, monospace';
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const inOut = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export function createGraph({ frame, canvas, pill, dot = 8 }, url = 'assets/graph.json') {
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, dpr = 1, nodes = [], links = [], adj = [], sim = null, byDegree = [];
  const view = { x: 0, y: 0, k: 1 };
  let fitK = 1, hover = null, drag = null, dirty = true, active = false, fold = 0, inside = false;
  const pointers = new Map();

  /* ---------- size and framing ---------- */
  let touched = false;                                          // has the visitor moved the view yet?
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    const cx = (W / 2 - view.x) / view.k, cy = (H / 2 - view.y) / view.k;   // keep the same point centred
    W = w; H = h; dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    if (nodes.length) { view.x = W / 2 - cx * view.k; view.y = H / 2 - cy * view.k; if (!touched) fit(); }
    dirty = true;
  }
  addEventListener('resize', resize);
  resize();

  /* the view that shows the whole graph; `ease` < 1 glides toward it */
  function fit(ease = 1) {
    // frame the bulk of the graph; a few stragglers far out shouldn't shrink everything
    const xs = nodes.map(n => n.x).sort((a, b) => a - b), ys = nodes.map(n => n.y).sort((a, b) => a - b);
    const q = (a, t) => a[Math.min(a.length - 1, Math.max(0, Math.round(t * (a.length - 1))))];
    const x0 = q(xs, 0.03), x1 = q(xs, 0.97), y0 = q(ys, 0.03), y1 = q(ys, 0.97);
    fitK = Math.min(W * 0.8 / (x1 - x0), H * 0.8 / (y1 - y0));
    const tx = W / 2 - (x0 + x1) / 2 * fitK, ty = H / 2 - (y0 + y1) / 2 * fitK;
    view.k += (fitK - view.k) * ease; view.x += (tx - view.x) * ease; view.y += (ty - view.y) * ease;
    dirty = true;
  }

  /* ---------- data + simulation ---------- */
  fetch(url).then(r => r.json()).then(data => {
    nodes = data.nodes.map((d, i) => ({ i, name: d.n, type: d.t, g: d.g ?? -1, deg: 0 }));
    links = data.links.map(([a, b]) => ({ source: a, target: b }));
    adj = nodes.map(() => new Set());
    for (const l of data.links) { nodes[l[0]].deg++; nodes[l[1]].deg++; adj[l[0]].add(l[1]); adj[l[1]].add(l[0]); }
    byDegree = nodes.slice().sort((a, b) => (b.type === 'note') - (a.type === 'note') || b.deg - a.deg);
    for (const n of nodes) {
      // start each topic near its own spot, so the layout settles quickly
      const a = n.g >= 0 && n.g < 7 ? n.g / 6 * Math.PI * 2 : Math.random() * Math.PI * 2;
      const r = n.deg === 0 ? 120 + Math.sqrt(Math.random()) * 300 : n.g >= 0 && n.g < 7 ? 150 : 60 + Math.random() * 200;
      n.x = Math.cos(a) * r + (Math.random() - 0.5) * 60;
      n.y = Math.sin(a) * r + (Math.random() - 0.5) * 60;
      n.r = n.type === 'file' ? 1.7 : 2.2 + Math.min(7, Math.sqrt(n.deg) * 1.05);
      n.pull = n.deg === 0 ? 0.03 + Math.random() * 0.06 : 0.05;  // uneven pull: unlinked notes fill the edge unevenly, as in Obsidian
      n.delay = Math.random() * 0.45;                              // when this note starts drifting in, as the graph folds
    }
    sim = forceSimulation(nodes)
      .force('link', forceLink(links).distance(l => (l.source.deg > 10 || l.target.deg > 10) ? 28 : 18).strength(0.6))
      .force('charge', forceManyBody().strength(-24).distanceMax(260).theta(0.9))
      .force('x', forceX(0).strength(d => d.pull))
      .force('y', forceY(0).strength(d => d.pull))
      .force('collide', forceCollide(d => d.r + 2.4).iterations(1))
      .alphaDecay(0.018)
      .on('tick', () => { dirty = true; if (!touched) fit(0.12); });   // keep it framed while it settles
    sim.stop();
    for (let i = 0; i < 120; i++) sim.tick();                  // settle most of the way before the first frame
    fit();
    if (!fold) sim.restart();
  }).catch(err => console.warn('Notes graph: could not load ' + url, err));

  /* ---------- drawing ---------- */
  function draw() {
    dirty = false;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (!nodes.length) return;
    if (fold > 0) return drawFold();
    const k = view.k, hl = hover ? adj[hover.i] : null;
    const lit = n => !hover || n === hover || hl.has(n.i);

    ctx.save();
    ctx.translate(view.x, view.y); ctx.scale(k, k);

    // links: all of them faintly, then the hovered note's in the accent
    ctx.lineWidth = 0.9 / k;
    ctx.strokeStyle = `rgba(${INK},${hover ? 0.05 : 0.13})`;
    ctx.beginPath();
    for (const l of links) { ctx.moveTo(l.source.x, l.source.y); ctx.lineTo(l.target.x, l.target.y); }
    ctx.stroke();
    if (hover) {
      ctx.strokeStyle = ACCENT; ctx.lineWidth = 1.4 / k; ctx.beginPath();
      for (const l of links) if (l.source === hover || l.target === hover) { ctx.moveTo(l.source.x, l.source.y); ctx.lineTo(l.target.x, l.target.y); }
      ctx.stroke();
    }

    // nodes, batched by look. They grow more slowly than the spacing between
    // them, so a dense cluster opens up as you zoom in instead of clumping.
    const zr = k / fitK, shrink = Math.pow(zr, -0.5);
    const paths = { note: new Path2D(), file: new Path2D(), dim: new Path2D(), near: new Path2D() };
    for (const n of nodes) {
      if (n === hover) continue;
      const p = hover ? (lit(n) ? paths.near : paths.dim) : n.type === 'file' ? paths.file : paths.note;
      const r = n.r * shrink;
      p.moveTo(n.x + r, n.y); p.arc(n.x, n.y, r, 0, Math.PI * 2);
    }
    ctx.fillStyle = `rgba(${INK},0.3)`; ctx.fill(paths.file);
    ctx.fillStyle = `rgba(${INK},0.72)`; ctx.fill(paths.note);
    ctx.fillStyle = `rgba(${INK},0.1)`; ctx.fill(paths.dim);
    ctx.fillStyle = `rgba(${INK},0.9)`; ctx.fill(paths.near);
    if (hover) { ctx.fillStyle = ACCENT; ctx.beginPath(); ctx.arc(hover.x, hover.y, hover.r * shrink + 1.2 / k, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();

    // names fade in as you zoom closer, like Obsidian's text fade threshold.
    // Busier notes are named first, and a name is skipped if it would overlap one already drawn.
    const fadeIn = smooth(1.8, 3, zr);
    if (fadeIn > 0.01 || hover) {
      ctx.font = LABEL; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      const taken = new Set(), CW = 34, CH = 14;
      const claim = (x0, y0, x1, y1, force) => {
        const cells = [];
        for (let cx = Math.floor(x0 / CW); cx <= Math.floor(x1 / CW); cx++)
          for (let cy = Math.floor(y0 / CH); cy <= Math.floor(y1 / CH); cy++) {
            const key = cx + ',' + cy;
            if (!force && taken.has(key)) return false;
            cells.push(key);
          }
        for (const c of cells) taken.add(c);
        return true;
      };
      const order = hover ? [hover, ...[...hl].map(i => nodes[i]), ...byDegree] : byDegree;
      const done = new Set();
      for (const n of order) {
        if (done.has(n)) continue;
        done.add(n);
        const on = hover && lit(n);
        const a = on ? 1 : hover ? fadeIn * 0.25 : fadeIn * (n.type === 'file' ? 0.55 : 0.85);
        if (a < 0.02) continue;
        const sx = view.x + n.x * k, sy = view.y + n.y * k + n.r * shrink * k + 5;
        if (sx < -80 || sx > W + 80 || sy < -20 || sy > H + 20) continue;
        const w = ctx.measureText(n.name).width;
        if (!claim(sx - w / 2, sy, sx + w / 2, sy + 12, on)) continue;
        ctx.fillStyle = n === hover ? ACCENT : `rgba(${INK},${a})`;
        ctx.fillText(n.name, sx, sy);
      }
    }
  }

  /* folding: each note drifts in on its own schedule, with a slight swirl,
     until they all sit on one spot and a solid dot takes their place */
  function drawFold() {
    const k = view.k, cx = W / 2, cy = H / 2, shrink = Math.pow(k / fitK, -0.5);
    for (const n of nodes) {
      const g = inOut(Math.max(0, Math.min(1, (fold - n.delay) / (1 - n.delay))));
      const dx = view.x + n.x * k - cx, dy = view.y + n.y * k - cy;
      const a = g * 1.2, ca = Math.cos(a), sa = Math.sin(a);
      n.sx = cx + (dx * ca - dy * sa) * (1 - g);
      n.sy = cy + (dx * sa + dy * ca) * (1 - g);
      n.sr = n.r * shrink * k * (1 - g) + 1.1 * g;
      n.sa = (n.type === 'file' ? 0.3 : 0.72) * (1 - g) + 0.85 * g;
    }
    const la = 0.13 * (1 - smooth(0, 0.5, fold));
    if (la > 0.004) {
      ctx.lineWidth = 0.9; ctx.strokeStyle = `rgba(${INK},${la})`; ctx.beginPath();
      for (const l of links) { ctx.moveTo(l.source.sx, l.source.sy); ctx.lineTo(l.target.sx, l.target.sy); }
      ctx.stroke();
    }
    for (const n of nodes) {
      ctx.fillStyle = `rgba(${INK},${n.sa})`;
      ctx.beginPath(); ctx.arc(n.sx, n.sy, n.sr, 0, Math.PI * 2); ctx.fill();
    }
    const core = dot * smooth(0.55, 1, fold);
    if (core > 0.2) { ctx.fillStyle = `rgb(${INK})`; ctx.beginPath(); ctx.arc(cx, cy, core, 0, Math.PI * 2); ctx.fill(); }
  }

  (function loop() {
    requestAnimationFrame(loop);
    if (dirty) draw();
  })();

  /* ---------- interaction ---------- */
  const local = e => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  function nodeAt(p) {
    const wx = (p.x - view.x) / view.k, wy = (p.y - view.y) / view.k;
    let best = null, bd = Infinity;
    for (const n of nodes) {
      const d = (n.x - wx) ** 2 + (n.y - wy) ** 2, reach = n.r * Math.pow(view.k / fitK, -0.5) + 5 / view.k;
      if (d < reach * reach && d < bd) { bd = d; best = n; }
    }
    return best;
  }
  function zoomAt(px, py, f) {
    touched = true;
    const k2 = Math.max(fitK * 0.6, Math.min(fitK * 8, view.k * f));
    view.x = px - (px - view.x) * (k2 / view.k);
    view.y = py - (py - view.y) * (k2 / view.k);
    view.k = k2; dirty = true;
  }
  function showPill(on) {                                       // the only hint there is: a small label by the cursor
    if (!pill) return;
    if (on) pill.textContent = 'Click to zoom';
    pill.classList.toggle('on', on);
  }
  function setActive(on) {
    if (on === active) return;
    active = on;
    frame.classList.toggle('active', on);
    showPill(!on && inside && !fold);
  }
  const usable = () => nodes.length && !fold;

  canvas.addEventListener('pointerenter', () => { inside = true; if (usable()) showPill(!active); });
  canvas.addEventListener('pointerdown', e => {
    if (!usable()) return;
    setActive(true);
    const p = local(e);
    pointers.set(e.pointerId, p);
    canvas.setPointerCapture(e.pointerId);
    if (pointers.size === 2) { drag = { pinch: true }; return; }
    const n = nodeAt(p);
    touched = true;
    if (n) { drag = { node: n }; n.fx = n.x; n.fy = n.y; sim.alphaTarget(0.25).restart(); }
    else drag = { pan: true, x: p.x, y: p.y, vx: view.x, vy: view.y };
    canvas.classList.add('grabbing');
  });
  canvas.addEventListener('pointermove', e => {
    if (!usable()) return;
    const p = local(e);
    if (drag && drag.pinch && pointers.has(e.pointerId)) {
      const [a, b] = [...pointers.values()];
      const before = Math.hypot(a.x - b.x, a.y - b.y);
      pointers.set(e.pointerId, p);
      const [c, d] = [...pointers.values()];
      const after = Math.hypot(c.x - d.x, c.y - d.y);
      if (before > 0) zoomAt((c.x + d.x) / 2, (c.y + d.y) / 2, after / before);
      return;
    }
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, p);
    if (drag && drag.node) {
      drag.node.fx = (p.x - view.x) / view.k; drag.node.fy = (p.y - view.y) / view.k;
    } else if (drag && drag.pan) {
      view.x = drag.vx + p.x - drag.x; view.y = drag.vy + p.y - drag.y; dirty = true;
    } else {
      const n = nodeAt(p);
      if (n !== hover) { hover = n; dirty = true; canvas.classList.toggle('over', !!n); }
    }
  });
  function endDrag(e) {
    pointers.delete(e.pointerId);
    if (drag && drag.node) { drag.node.fx = drag.node.fy = null; sim.alphaTarget(0); }
    if (pointers.size === 0) { drag = null; canvas.classList.remove('grabbing'); }
  }
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('pointerleave', () => {
    inside = false;
    showPill(false);
    if (drag) return;
    setActive(false);
    if (hover) { hover = null; dirty = true; canvas.classList.remove('over'); }
  });
  canvas.addEventListener('wheel', e => {
    if (!usable()) return;
    if (!active && !e.ctrlKey) return;                          // let the page scroll until the graph's been clicked
    e.preventDefault();
    const p = local(e);
    zoomAt(p.x, p.y, Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0016)));
  }, { passive: false });

  /* scrolling folds the graph into its dot (and unfolds it on the way back) */
  function setFold(t) {
    if (t === fold) return;
    const was = fold;
    fold = t;
    dirty = true;
    frame.classList.toggle('folding', t > 0);
    if (t > 0 && was === 0) {                                   // freeze it where it is
      setActive(false); showPill(false);
      hover = null; canvas.classList.remove('over');
      if (sim) sim.stop();
    } else if (t === 0 && was > 0 && sim && sim.alpha() > sim.alphaMin()) sim.restart();
  }

  return { setFold };
}
