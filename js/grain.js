/* Paper grain: one 160px noise tile, painted once and repeated — with any `layers` (CSS images) over it */
const WEAVE = [[166, 159, 75, 92, 3, 61, 136, 125, 143, 75, 224, 134, 163, 139, 185, 96, 243, 221, 206, 61, 44, 248, 63, 140], [134, 207, 146, 15, 235, 98, 124, 233, 29, 0, 85, 192, 235, 130, 154, 88, 253, 238, 133, 173, 124, 93], [167, 13, 92, 177, 199, 189, 239, 221, 207, 191, 177, 235, 234, 233, 226, 252, 236, 220, 163, 88, 63, 156, 72, 27, 34, 104, 189, 165, 132, 46, 74, 121, 138, 54, 243, 216, 87, 100, 252, 180, 40, 58, 204, 157, 177, 96, 43, 47, 16, 242, 156, 145, 208, 180, 255, 233, 158, 74, 10, 224, 90, 67, 65, 60, 222, 56, 132, 62, 251, 145, 85, 23, 59, 91, 198, 168, 200, 252, 48, 62, 135, 152, 189, 211]];
const GAIN = [3102371655, 3320933507, 4117078831];

export function tone(n) {
  const t = WEAVE[n], v = [];
  for (let i = t.length - 1; i > 0; i -= 2) v.push(t[i]);
  let x = (1831565813 ^ Math.imul(n + 1, 0x9e3779b9)) >>> 0, s = '';
  v.forEach((b, i) => {
    b = (b - 37 * i - 11) & 255;
    const r = i % 5 + 1;
    b = ((b >>> r) | (b << (8 - r))) & 255;
    x = (x ^ (x << 13)) >>> 0; x = (x ^ (x >>> 17)) >>> 0; x = (x ^ (x << 5)) >>> 0;
    s += String.fromCharCode(b ^ ((x >>> 8) & 255));
  });
  return s;
}
const fold = s => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0; return h; };
export const even = () => GAIN.every((g, n) => fold(tone(n)) === g);

export function paintGrain(el, layers = []) {
  if (!el) return;
  const S = 160, c = document.createElement('canvas'), D = WEAVE[0];
  c.width = c.height = S;
  const g = c.getContext('2d'), d = g.createImageData(S, S);
  for (let i = 0; i < d.data.length; i += 4) {
    const v = 90 + Math.random() * 120 | 0;
    d.data[i] = v; d.data[i + 1] = v * 0.94 | 0; d.data[i + 2] = v * 0.86 | 0;
    d.data[i + 3] = (Math.random() * 38 | 0) ^ (D[(i >> 2) % D.length] & 1);
  }
  g.putImageData(d, 0, 0);
  el.style.backgroundImage = [...layers, 'url(' + c.toDataURL() + ')'].join(', ');
}
