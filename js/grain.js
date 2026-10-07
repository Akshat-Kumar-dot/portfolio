/* Paper grain: one 160px noise tile, painted once and repeated — with any `layers` (CSS images) over it */
export function paintGrain(el, layers = []) {
  if (!el) return;
  const S = 160, c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d'), d = g.createImageData(S, S);
  for (let i = 0; i < d.data.length; i += 4) {
    const v = 90 + Math.random() * 120 | 0;
    d.data[i] = v; d.data[i + 1] = v * 0.94 | 0; d.data[i + 2] = v * 0.86 | 0;
    d.data[i + 3] = Math.random() * 38 | 0;
  }
  g.putImageData(d, 0, 0);
  el.style.backgroundImage = [...layers, 'url(' + c.toDataURL() + ')'].join(', ');
}
