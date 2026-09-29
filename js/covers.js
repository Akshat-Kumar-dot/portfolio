/* ============================================================
   COVERS — the artwork on each globe card.

   Each card is a small case study, laid out to read well both on the
   globe and full-size when you've zoomed in: a window with a screenshot
   on the left; the number, name, type, a line of description and the
   year on the right. Until a project has a real `img`, the window
   shows a quiet wireframe of a typical interface for its type.
   ============================================================ */
import { TAU, pad, rng } from './utils.js';

export const COVER_W = 1024, COVER_H = 640;
const SERIF = '"Instrument Serif", Georgia, serif';
const MONO = '"JetBrains Mono", ui-monospace, Menlo, Consolas, monospace';

/* card colour, text, window, window text, accent */
const PALETTES = [
  { bg: '#efe9de', ink: '#1d1b17', win: '#ffffff', wink: '#1d1b17', acc: '#c65a3a' },
  { bg: '#1f1e1c', ink: '#f1ebe0', win: '#2b2a27', wink: '#f1ebe0', acc: '#e2a93b' },
  { bg: '#c9d4dc', ink: '#1a2430', win: '#ffffff', wink: '#1a2430', acc: '#3f5f7f' },
  { bg: '#b9bea4', ink: '#1f2419', win: '#f6f5ee', wink: '#1f2419', acc: '#2f4a3a' },
  { bg: '#d8d2c7', ink: '#1d1b17', win: '#1f1e1c', wink: '#ece6da', acc: '#9aa57f' },
  { bg: '#e4cfa8', ink: '#2a2116', win: '#fffaf0', wink: '#2a2116', acc: '#b4532a' },
  { bg: '#c65a3a', ink: '#fff4ea', win: '#fbf5ee', wink: '#2a1a12', acc: '#c65a3a' },
  { bg: '#2f3d33', ink: '#eef0e6', win: '#f4f1e8', wink: '#1f2a22', acc: '#e2a93b' },
  { bg: '#ecd3c6', ink: '#2b1a14', win: '#ffffff', wink: '#2b1a14', acc: '#c65a3a' },
  { bg: '#2a3140', ink: '#eef1f6', win: '#1b2029', wink: '#e6ebf3', acc: '#7fb2ff' },
  { bg: '#f4efe6', ink: '#1d1b17', win: '#fbf9f4', wink: '#1d1b17', acc: '#3f5f7f' },
  { bg: '#7a7a52', ink: '#f7f4e8', win: '#fbf9f1', wink: '#2a2a1c', acc: '#c65a3a' }
];

const rr = (x, X, Y, W, H, r) => { x.beginPath(); x.roundRect(X, Y, W, H, r); };
const alpha = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; };

/* ---------- wireframe interfaces, one per project type ---------- */
const UI = [
  function landing(x, A, C, r) {                      // marketing site
    const { X, Y, W, H } = A;
    x.fillStyle = C.ink; x.beginPath(); x.arc(X + 8, Y + 9, 6, 0, TAU); x.fill();
    x.fillStyle = C.soft; for (let i = 0; i < 3; i++) { rr(x, X + W - 170 + i * 42, Y + 6, 30, 6, 3); x.fill(); }
    x.fillStyle = C.ink; rr(x, X + W - 40, Y, 40, 18, 9); x.fill();
    x.fillStyle = C.ink; rr(x, X, Y + 58, W * 0.46, 18, 4); x.fill(); rr(x, X, Y + 84, W * 0.34, 18, 4); x.fill();
    x.fillStyle = C.soft; rr(x, X, Y + 120, W * 0.4, 6, 3); x.fill(); rr(x, X, Y + 132, W * 0.3, 6, 3); x.fill();
    x.fillStyle = C.acc; rr(x, X, Y + 158, 86, 26, 13); x.fill();
    const g = x.createLinearGradient(0, Y + 40, 0, Y + H);
    g.addColorStop(0, alpha(C.acc, 0.85)); g.addColorStop(1, alpha(C.acc, 0.35));
    x.fillStyle = g; rr(x, X + W * 0.54, Y + 40, W * 0.46, H - 52, 10); x.fill();
    x.fillStyle = 'rgba(255,255,255,.55)'; x.beginPath(); x.arc(X + W * 0.77, Y + 40 + (H - 52) * 0.45, 28, 0, TAU); x.fill();
  },
  function dashboard(x, A, C, r) {                    // analytics dashboard
    const { X, Y, W, H } = A;
    x.fillStyle = C.faint; rr(x, X, Y, 40, H, 8); x.fill();
    x.fillStyle = C.soft; for (let i = 0; i < 5; i++) { rr(x, X + 13, Y + 14 + i * 26, 14, 14, 4); x.fill(); }
    const cx = X + 52, cw = W - 52;
    for (let i = 0; i < 3; i++) {
      const bx = cx + i * (cw / 3);
      x.strokeStyle = C.soft; x.lineWidth = 1.5; rr(x, bx, Y, cw / 3 - 8, 54, 8); x.stroke();
      x.fillStyle = C.ink; rr(x, bx + 10, Y + 12, 40 + r() * 20, 12, 3); x.fill();
      x.fillStyle = i === 1 ? C.acc : C.soft; rr(x, bx + 10, Y + 34, 30, 6, 3); x.fill();
    }
    const top = Y + 70, bh = H - 70;
    x.strokeStyle = C.faint; x.lineWidth = 1;
    for (let i = 0; i < 4; i++) { const y = top + i * bh / 4; x.beginPath(); x.moveTo(cx, y); x.lineTo(cx + cw, y); x.stroke(); }
    const pts = []; let v = 0.5;
    for (let i = 0; i <= 24; i++) { v = Math.min(0.92, Math.max(0.1, v + (r() - 0.45) * 0.18)); pts.push([cx + i * cw / 24, top + bh * (1 - v)]); }
    x.beginPath(); x.moveTo(cx, top + bh); pts.forEach(p => x.lineTo(p[0], p[1])); x.lineTo(cx + cw, top + bh);
    x.fillStyle = alpha(C.acc, 0.14); x.fill();
    x.beginPath(); pts.forEach((p, i) => i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1]));
    x.strokeStyle = C.acc; x.lineWidth = 2.5; x.stroke();
  },
  function mobile(x, A, C, r) {                       // two phone screens
    const { X, Y, W, H } = A;
    for (let k = 0; k < 2; k++) {
      const pw = 118, ph = H, px = X + W / 2 - pw - 12 + k * (pw + 24);
      x.strokeStyle = C.soft; x.lineWidth = 2; rr(x, px, Y, pw, ph, 18); x.stroke();
      x.fillStyle = C.ink; rr(x, px + pw / 2 - 18, Y + 8, 36, 6, 3); x.fill();
      if (k === 0) {
        x.fillStyle = alpha(C.acc, 0.8); rr(x, px + 10, Y + 26, pw - 20, 88, 10); x.fill();
        x.fillStyle = C.ink; rr(x, px + 10, Y + 126, 70, 9, 4); x.fill();
        x.fillStyle = C.soft; rr(x, px + 10, Y + 142, 90, 6, 3); x.fill(); rr(x, px + 10, Y + 154, 60, 6, 3); x.fill();
        x.fillStyle = C.ink; rr(x, px + 10, ph + Y - 44, pw - 20, 28, 14); x.fill();
      } else {
        for (let i = 0; i < 6; i++) {
          const ry = Y + 30 + i * 40;
          x.fillStyle = i === 1 ? C.acc : C.soft; x.beginPath(); x.arc(px + 24, ry + 12, 11, 0, TAU); x.fill();
          x.fillStyle = C.ink; rr(x, px + 42, ry + 4, 50 + r() * 16, 7, 3); x.fill();
          x.fillStyle = C.soft; rr(x, px + 42, ry + 16, 36, 5, 2); x.fill();
        }
      }
    }
  },
  function chat(x, A, C, r) {                         // AI assistant
    const { X, Y, W, H } = A;
    x.fillStyle = C.faint; rr(x, X, Y, 104, H, 8); x.fill();
    x.fillStyle = C.soft; for (let i = 0; i < 6; i++) { rr(x, X + 12, Y + 14 + i * 22, 60 + r() * 24, 7, 3); x.fill(); }
    const cx = X + 120, cw = W - 120;
    x.fillStyle = C.acc; rr(x, cx + cw * 0.38, Y + 6, cw * 0.62, 34, 12); x.fill();
    x.fillStyle = 'rgba(255,255,255,.8)'; rr(x, cx + cw * 0.38 + 12, Y + 19, cw * 0.4, 7, 3); x.fill();
    x.fillStyle = C.faint; rr(x, cx, Y + 52, cw * 0.82, 86, 12); x.fill();
    x.fillStyle = C.soft;
    for (let i = 0; i < 4; i++) { rr(x, cx + 12, Y + 66 + i * 16, (cw * 0.82 - 24) * (i === 3 ? 0.5 : 0.9), 7, 3); x.fill(); }
    x.strokeStyle = C.soft; x.lineWidth = 1.5; rr(x, cx, Y + H - 34, cw, 34, 17); x.stroke();
    x.fillStyle = C.ink; x.beginPath(); x.arc(cx + cw - 17, Y + H - 17, 10, 0, TAU); x.fill();
  },
  function code(x, A, C, r) {                         // code editor
    const { X, Y, W, H } = A;
    x.fillStyle = C.faint; rr(x, X, Y, 96, H, 8); x.fill();
    x.fillStyle = C.soft; for (let i = 0; i < 8; i++) { rr(x, X + 12 + (i % 3 ? 10 : 0), Y + 12 + i * 20, 44 + r() * 30, 6, 3); x.fill(); }
    const cols = [C.acc, C.ink, C.soft, C.soft, C.acc2];
    for (let i = 0; i < 12; i++) {
      const y = Y + 10 + i * 19;
      x.fillStyle = C.soft; x.font = `500 10px ${MONO}`; x.fillText(String(i + 1), X + 108, y + 8);
      let cx = X + 130 + ((r() * 3) | 0) * 16;
      for (let k = 0; k < 2 + (r() * 3 | 0) && cx < X + W - 30; k++) {
        const w = 18 + r() * 60; x.fillStyle = cols[(r() * cols.length) | 0];
        rr(x, cx, y, w, 7, 3); x.fill(); cx += w + 7;
      }
    }
  },
  function map(x, A, C, r) {                          // maps / location
    const { X, Y, W, H } = A;
    x.fillStyle = C.faint; rr(x, X, Y, W, H, 8); x.fill();
    x.fillStyle = alpha(C.acc2, 0.22); x.beginPath(); x.ellipse(X + W * 0.78, Y + H * 0.3, 70, 44, 0.4, 0, TAU); x.fill();
    x.strokeStyle = C.soft; x.lineCap = 'round';
    for (let i = 0; i < 7; i++) {
      x.lineWidth = i < 2 ? 6 : 2.5; x.beginPath();
      const y0 = Y + r() * H, y1 = Y + r() * H;
      x.moveTo(X, y0); x.bezierCurveTo(X + W * 0.3, y0 + (r() - .5) * 90, X + W * 0.7, y1 + (r() - .5) * 90, X + W, y1); x.stroke();
    }
    for (let i = 0; i < 3; i++) {
      const px = X + 60 + r() * (W - 120), py = Y + 40 + r() * (H - 80);
      x.fillStyle = C.acc; x.beginPath(); x.arc(px, py, 7, 0, TAU); x.fill();
      x.strokeStyle = alpha(C.acc, 0.35); x.lineWidth = 6; x.beginPath(); x.arc(px, py, 13, 0, TAU); x.stroke();
    }
    x.fillStyle = C.win; rr(x, X + 12, Y + H - 62, 150, 50, 10); x.fill();
    x.fillStyle = C.ink; rr(x, X + 24, Y + H - 50, 80, 8, 4); x.fill();
    x.fillStyle = C.soft; rr(x, X + 24, Y + H - 34, 110, 6, 3); x.fill();
  },
  function shop(x, A, C, r) {                         // e-commerce grid
    const { X, Y, W, H } = A, tw = (W - 30) / 4;
    for (let i = 0; i < 4; i++) {
      const tx = X + i * (tw + 10);
      x.fillStyle = i % 2 ? alpha(C.acc, 0.3) : C.faint; rr(x, tx, Y, tw, H * 0.62, 8); x.fill();
      x.fillStyle = 'rgba(255,255,255,.6)'; x.beginPath(); x.ellipse(tx + tw / 2, Y + H * 0.36, tw * 0.26, tw * 0.3, 0, 0, TAU); x.fill();
      x.fillStyle = C.ink; rr(x, tx, Y + H * 0.66, tw * 0.8, 7, 3); x.fill();
      x.fillStyle = C.soft; rr(x, tx, Y + H * 0.66 + 14, tw * 0.45, 6, 3); x.fill();
      x.fillStyle = C.acc; rr(x, tx, Y + H - 22, tw, 22, 11); x.fill();
    }
  },
  function board(x, A, C, r) {                        // kanban / productivity
    const { X, Y, W, H } = A, cw = (W - 20) / 3;
    for (let k = 0; k < 3; k++) {
      const cx = X + k * (cw + 10);
      x.fillStyle = C.faint; rr(x, cx, Y, cw, H, 10); x.fill();
      x.fillStyle = C.ink; rr(x, cx + 10, Y + 10, 50, 7, 3); x.fill();
      let y = Y + 28;
      for (let i = 0; i < 3 && y < Y + H - 40; i++) {
        const h = 34 + r() * 26;
        x.fillStyle = C.win; rr(x, cx + 8, y, cw - 16, h, 7); x.fill();
        x.fillStyle = i === 0 && k === 1 ? C.acc : C.soft; rr(x, cx + 16, y + 10, 26, 6, 3); x.fill();
        x.fillStyle = C.soft; rr(x, cx + 16, y + 22, (cw - 32) * (0.5 + r() * 0.4), 5, 2); x.fill();
        y += h + 8;
      }
    }
  },
  function article(x, A, C, r) {                      // editorial / blog
    const { X, Y, W, H } = A;
    const g = x.createLinearGradient(X, Y, X + W, Y + 110);
    g.addColorStop(0, alpha(C.acc, 0.7)); g.addColorStop(1, alpha(C.acc2, 0.5));
    x.fillStyle = g; rr(x, X, Y, W * 0.62, 110, 8); x.fill();
    x.fillStyle = C.ink; rr(x, X, Y + 124, W * 0.55, 13, 4); x.fill(); rr(x, X, Y + 144, W * 0.38, 13, 4); x.fill();
    x.fillStyle = C.soft;
    for (let i = 0; i < 4; i++) { rr(x, X, Y + 172 + i * 14, W * 0.6 * (i === 3 ? 0.6 : 1), 6, 3); x.fill(); }
    const sx = X + W * 0.68;
    x.fillStyle = C.ink; rr(x, sx, Y, 60, 7, 3); x.fill();
    for (let i = 0; i < 5; i++) { x.fillStyle = C.soft; rr(x, sx, Y + 22 + i * 18, W * 0.28 * (0.6 + r() * 0.4), 6, 3); x.fill(); }
  },
  function table(x, A, C, r) {                        // data table
    const { X, Y, W, H } = A;
    x.fillStyle = C.faint; rr(x, X, Y, W, 24, 6); x.fill();
    for (let i = 0; i < 4; i++) { x.fillStyle = C.soft; rr(x, X + 12 + i * W / 4, Y + 9, 40, 6, 3); x.fill(); }
    for (let row = 0; row < 7; row++) {
      const y = Y + 36 + row * 28;
      x.strokeStyle = C.faint; x.lineWidth = 1; x.beginPath(); x.moveTo(X, y + 20); x.lineTo(X + W, y + 20); x.stroke();
      x.fillStyle = C.ink; rr(x, X + 12, y + 4, 60 + r() * 30, 7, 3); x.fill();
      x.fillStyle = C.soft; rr(x, X + 12 + W / 4, y + 4, 50, 7, 3); x.fill(); rr(x, X + 12 + W / 2, y + 4, 36, 7, 3); x.fill();
      const ok = r() > 0.3;
      x.fillStyle = ok ? alpha(C.acc, 0.25) : C.faint; rr(x, X + 12 + 3 * W / 4, y, 56, 16, 8); x.fill();
      x.fillStyle = ok ? C.acc : C.soft; rr(x, X + 22 + 3 * W / 4, y + 5, 36, 6, 3); x.fill();
    }
  },
  function gallery(x, A, C, r) {                      // image gallery
    const { X, Y, W, H } = A, cw = (W - 20) / 3;
    const tints = [alpha(C.acc, 0.55), C.faint, alpha(C.acc2, 0.45), C.soft];
    for (let k = 0; k < 3; k++) {
      let y = Y - (k === 1 ? 30 : 0);
      while (y < Y + H) {
        const h = 60 + r() * 70;
        x.fillStyle = tints[(r() * tints.length) | 0]; rr(x, X + k * (cw + 10), y, cw, h, 8); x.fill();
        y += h + 10;
      }
    }
  },
  function player(x, A, C, r) {                       // music / media
    const { X, Y, W, H } = A, s = H - 20;
    const g = x.createLinearGradient(X, Y, X + s, Y + s);
    g.addColorStop(0, C.acc); g.addColorStop(1, C.acc2);
    x.fillStyle = g; rr(x, X, Y, s, s, 10); x.fill();
    x.fillStyle = 'rgba(255,255,255,.35)'; x.beginPath(); x.arc(X + s * 0.5, Y + s * 0.5, s * 0.22, 0, TAU); x.fill();
    const tx = X + s + 22, tw = W - s - 22;
    x.fillStyle = C.ink; rr(x, tx, Y + 20, tw * 0.8, 14, 4); x.fill();
    x.fillStyle = C.soft; rr(x, tx, Y + 44, tw * 0.5, 8, 4); x.fill();
    x.fillStyle = C.faint; rr(x, tx, Y + s - 70, tw, 5, 3); x.fill();
    x.fillStyle = C.acc; rr(x, tx, Y + s - 70, tw * (0.3 + r() * 0.4), 5, 3); x.fill();
    const my = Y + s - 30;
    x.fillStyle = C.ink; x.beginPath(); x.arc(tx + tw / 2, my, 16, 0, TAU); x.fill();
    x.fillStyle = C.soft; x.beginPath(); x.arc(tx + tw / 2 - 48, my, 8, 0, TAU); x.fill();
    x.beginPath(); x.arc(tx + tw / 2 + 48, my, 8, 0, TAU); x.fill();
  }
];

function wrapLines(x, text, maxW) {
  const lines = [];
  let line = '';
  for (const w of String(text).split(/\s+/)) {
    const t = line ? line + ' ' + w : w;
    if (line && x.measureText(t).width > maxW) { lines.push(line); line = w; } else line = t;
  }
  if (line) lines.push(line);
  return lines;
}

/* Draws one cover. Returns the canvas; if the project has an `img`,
   `onReady` fires again once the screenshot has been painted in.   */
export function drawCover(item, index, total, onReady) {
  const C0 = PALETTES[index % PALETTES.length];
  const c = document.createElement('canvas');
  c.width = COVER_W; c.height = COVER_H;
  const x = c.getContext('2d');
  const r = rng(item.title + index);
  const C = { ...C0, ink: C0.wink, soft: alpha(C0.wink, 0.22), faint: alpha(C0.wink, 0.07),
              acc2: C0.acc === '#c65a3a' ? '#e2a93b' : '#c65a3a' };
  const tagCol = C0.acc === C0.bg ? C0.ink : C0.acc;
  const spacing = v => { if ('letterSpacing' in x) x.letterSpacing = v; };

  // card
  rr(x, 0, 0, COVER_W, COVER_H, 30); x.fillStyle = C0.bg; x.fill();

  // window, left
  const WX = 28, WY = 28, WW = 640, WH = COVER_H - 56;
  x.save();
  x.shadowColor = 'rgba(0,0,0,.18)'; x.shadowBlur = 22; x.shadowOffsetY = 8;
  rr(x, WX, WY, WW, WH, 14); x.fillStyle = C0.win; x.fill();
  x.restore();
  x.fillStyle = alpha(C0.wink, 0.25);
  for (let i = 0; i < 3; i++) { x.beginPath(); x.arc(WX + 22 + i * 16, WY + 18, 5, 0, TAU); x.fill(); }
  x.fillStyle = alpha(C0.wink, 0.07); rr(x, WX + WW / 2 - 110, WY + 9, 220, 18, 9); x.fill();
  const inner = { X: WX, Y: WY + 36, W: WW, H: WH - 36 };
  x.save(); rr(x, inner.X, inner.Y, inner.W, inner.H, [0, 0, 14, 14]); x.clip();
  const s = (inner.W - 40) / 430;                             // the wireframes are drawn at 430 wide
  x.translate(inner.X + 20, inner.Y + 16); x.scale(s, s);
  UI[index % UI.length](x, { X: 0, Y: 0, W: 430, H: (inner.H - 36) / s }, C, r);
  x.restore();

  // text, right
  const TX = WX + WW + 32, TW = COVER_W - TX - 32;
  x.fillStyle = C0.ink;
  spacing('2px');
  x.font = `500 17px ${MONO}`; x.globalAlpha = 0.7;
  x.fillText(pad(index + 1) + '  /  ' + pad(total), TX, 62);
  x.globalAlpha = 1;

  spacing('-1px');
  let size = 62, lines;
  do { x.font = `400 ${size}px ${SERIF}`; lines = wrapLines(x, item.title, TW); size -= 2; }
  while ((lines.length > 2 || lines.some(l => x.measureText(l).width > TW)) && size > 34);
  let y = 150;
  for (const l of lines) { x.fillText(l, TX - 2, y); y += size * 0.98; }

  spacing('2px');
  x.font = `500 15px ${MONO}`; x.fillStyle = tagCol;
  x.fillText((item.tag || '').toUpperCase(), TX, y + 14);
  y += 58;

  if (item.desc) {
    spacing('0px');
    x.font = `400 24px ${SERIF}`; x.fillStyle = C0.ink; x.globalAlpha = 0.72;
    for (const l of wrapLines(x, item.desc, TW).slice(0, 6)) { x.fillText(l, TX, y); y += 30; }
    x.globalAlpha = 1;
  }

  spacing('2px');
  x.fillStyle = C0.ink;
  x.globalAlpha = 0.25; x.fillRect(TX, COVER_H - 86, TW, 1.5); x.globalAlpha = 0.8;
  x.font = `500 15px ${MONO}`;
  x.fillText(item.year || '', TX, COVER_H - 48);
  x.textAlign = 'right'; x.fillText('OPEN ↗', TX + TW, COVER_H - 48); x.textAlign = 'left';
  x.globalAlpha = 1;

  // a real screenshot, if there is one, replaces the wireframe
  if (item.img && onReady) {
    const im = new Image();
    im.onload = () => {
      x.save(); rr(x, inner.X, inner.Y, inner.W, inner.H, [0, 0, 14, 14]); x.clip();
      const k = Math.max(inner.W / im.width, inner.H / im.height);
      x.drawImage(im, inner.X + (inner.W - im.width * k) / 2, inner.Y + (inner.H - im.height * k) / 2, im.width * k, im.height * k);
      x.restore();
      onReady(c);
    };
    im.src = item.img;
  }
  return c;
}

/* Resolves once the cover fonts have loaded (or after 1.5s regardless). */
export function coverFontsReady() {
  if (!document.fonts || !document.fonts.load) return Promise.resolve();
  return Promise.race([
    Promise.all([document.fonts.load(`400 60px "Instrument Serif"`),
                 document.fonts.load(`500 16px "JetBrains Mono"`)]).catch(() => {}),
    new Promise(r => setTimeout(r, 1500))
  ]);
}
