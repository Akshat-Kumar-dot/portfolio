/* ============================================================
   RECORD — the vinyl on the music player, seen from above:
     face   grooves and the paper label with the song on it; spins
     sheen  the two wedges of light a record catches, which don't move
   ============================================================ */
import { TAU, rng } from './utils.js';

export function paintRecord(face, sheen, { size, title, artist, color = '#c65a3a' }) {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const S = Math.round(Math.min(size * dpr, 1200)), R = S / 2;
  for (const c of [face, sheen]) { c.width = c.height = S; }

  const x = face.getContext('2d'), rnd = rng('record');
  x.clearRect(0, 0, S, S);
  x.save(); x.translate(R, R);
  x.fillStyle = '#171513'; x.beginPath(); x.arc(0, 0, R * 0.995, 0, TAU); x.fill();
  // grooves, with a few wider gaps between tracks
  x.lineWidth = Math.max(0.6, S / 1600);
  for (let r = R * 0.36; r < R * 0.97; r += R * 0.0065) {
    const gap = [0.52, 0.66, 0.8].some(g => Math.abs(r / R - g) < 0.006);
    x.strokeStyle = gap ? 'rgba(0,0,0,.6)' : `rgba(255,255,255,${0.025 + rnd() * 0.035})`;
    x.beginPath(); x.arc(0, 0, r, 0, TAU); x.stroke();
  }
  x.strokeStyle = 'rgba(255,255,255,.12)'; x.lineWidth = R * 0.01;
  x.beginPath(); x.arc(0, 0, R * 0.985, 0, TAU); x.stroke();

  // the label
  const L = R * 0.33;
  x.fillStyle = color; x.beginPath(); x.arc(0, 0, L, 0, TAU); x.fill();
  const shade = x.createRadialGradient(-L * 0.3, -L * 0.3, 0, 0, 0, L);
  shade.addColorStop(0, 'rgba(255,240,225,.14)'); shade.addColorStop(1, 'rgba(40,10,4,.18)');
  x.fillStyle = shade; x.fill();
  x.strokeStyle = 'rgba(247,232,219,.5)'; x.lineWidth = Math.max(1, L * 0.012);
  x.beginPath(); x.arc(0, 0, L * 0.9, 0, TAU); x.stroke();
  x.fillStyle = 'rgba(247,238,228,.94)'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = `400 ${L * 0.26}px "Instrument Serif", Georgia, serif`;
  fitText(x, title, 0, -L * 0.42, L * 1.3);
  x.font = `500 ${L * 0.085}px "JetBrains Mono", ui-monospace, monospace`;
  fitText(x, (artist || '').toUpperCase(), 0, L * 0.4, L * 1.2);
  x.fillText('33⅓ RPM', 0, L * 0.62);
  x.font = `400 ${L * 0.16}px "Instrument Serif", Georgia, serif`;
  x.fillText('AK', -L * 0.52, 0); x.fillText('A', L * 0.52, 0);
  // the spindle hole
  x.globalCompositeOperation = 'destination-out';
  x.beginPath(); x.arc(0, 0, R * 0.028, 0, TAU); x.fill();
  x.restore();

  const s = sheen.getContext('2d');
  s.clearRect(0, 0, S, S);
  s.save(); s.translate(R, R);
  s.beginPath(); s.arc(0, 0, R * 0.99, 0, TAU); s.arc(0, 0, L, 0, TAU, true); s.clip('evenodd');
  if (s.createConicGradient) {
    const c = s.createConicGradient(-Math.PI / 4, 0, 0);
    [[0, 0], [0.04, 0.2], [0.09, 0], [0.5, 0], [0.54, 0.14], [0.59, 0], [1, 0]]
      .forEach(([t, a]) => c.addColorStop(t, `rgba(255,250,242,${a})`));
    s.fillStyle = c; s.fillRect(-R, -R, S, S);
  }
  s.restore();
}

function fitText(x, text, cx, cy, max) {
  const w = x.measureText(text).width;
  if (w <= max) { x.fillText(text, cx, cy); return; }
  x.save(); x.translate(cx, cy); x.scale(max / w, max / w); x.fillText(text, 0, 0); x.restore();
}
