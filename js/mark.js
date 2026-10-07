/* ============================================================
   MARK — whose site this is, worked in all through it, so that any
   copy carries it and taking it out is a chore rather than a click:
     · a faint repeating line of it in the paper behind every page,
       painted into the same layer as the paper's grain
     · on every project card, in its footer (covers.js)
     · in the page's metadata (index.html) and in the console
     · kept in place: hide the paper's layer or delete it, and it's
       put straight back
     · served from anywhere but SITE.url (or your own machine), a
       notice says it's a copy, and where the original is

   Honestly: nothing a browser shows can be made impossible to remove —
   whoever has the files can change them. This makes a copy obvious and
   a clean one real work. The real protection is that the work is yours,
   dated in your own repository, and copyright (see LICENSE).
   ============================================================ */
import { SITE } from './config.js';
import { paintGrain } from './grain.js';

const year = new Date().getFullYear();
const home = (() => { try { return SITE.url ? new URL(SITE.url) : null; } catch { return null; } })();
export const SIGN = `© ${year} ${SITE.name}`;                       // on the cards
export const MARK = SIGN + (home ? ` · ${home.host}${home.pathname.replace(/\/$/, '')}` : '');

/* the paper's mark: two lines of it on a slant, in a tile that repeats */
function markTile() {
  const w = 480, h = 300, c = document.createElement('canvas');
  c.width = w; c.height = h;
  const x = c.getContext('2d');
  x.font = '500 11px "JetBrains Mono", ui-monospace, Menlo, Consolas, monospace';
  if ('letterSpacing' in x) x.letterSpacing = '2.5px';
  x.fillStyle = 'rgba(29,27,23,0.13)';                       // under the paper layer's own opacity: faint, like a banknote's
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.translate(w / 2, h / 2); x.rotate(-0.3);
  const t = MARK.toUpperCase();
  x.fillText(t, -w * 0.2, -h * 0.2);
  x.fillText(t, w * 0.22, h * 0.24);
  return c.toDataURL();
}

const LOCK = { position: 'fixed', inset: '0', 'z-index': '0', display: 'block', visibility: 'visible', opacity: '.45',
               'pointer-events': 'none', 'background-repeat': 'repeat', transform: 'none', filter: 'none', 'clip-path': 'none' };

export function createMark(paper) {
  let tileUrl = '', sealed = '', mended = 0;
  function paint() {
    tileUrl = markTile();
    paintGrain(paper, [`url(${tileUrl})`]);
    for (const [k, v] of Object.entries(LOCK)) paper.style.setProperty(k, v, 'important');   // a stylesheet can't hide it
    document.documentElement.style.setProperty('--mark', `url(${tileUrl})`);                  // folder sheets carry it too
    sealed = paper.style.cssText;                           // just as the browser keeps it (it rewrites values: .45 → 0.45)
  }
  paint();
  document.fonts?.ready.then(paint);

  // kept in place: put back if it's taken out of the page, hidden, or its picture stripped
  const mend = () => {
    if (!paper.isConnected) document.body.prepend(paper);
    if (paper.style.cssText !== sealed && performance.now() - mended > 50) { mended = performance.now(); paint(); }
    if (notice && !notice.isConnected) document.body.append(notice);
  };
  new MutationObserver(mend).observe(document.body, { childList: true });                 // taken out of the page
  new MutationObserver(mend).observe(paper, { attributes: true });                         // its style changed
  setInterval(mend, 2000);

  // served somewhere else: say it's a copy, and where the original is
  let notice = null;
  const here = location.hostname;
  const local = !here || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(here) || here.endsWith('.localhost') || location.protocol === 'file:';
  if (home && !local && here !== home.hostname) {
    notice = document.createElement('div');
    notice.className = 'copy-notice';
    notice.setAttribute('role', 'note');
    notice.innerHTML = `This is an unofficial copy. ${SITE.name}’s portfolio is at <a href="${home.href}">${home.host}${home.pathname.replace(/\/$/, '')}</a>`;
    document.body.append(notice);
    document.title = '(Copy) ' + document.title;
  }

  if (home) {                                                // the address search engines should credit
    const link = document.querySelector('link[rel="canonical"]') || Object.assign(document.createElement('link'), { rel: 'canonical' });
    link.href = home.href;
    document.head.append(link);
  }
  console.info(`%c${MARK}%c\nDesigned and built by ${SITE.name}. All rights reserved.`, 'font:600 13px monospace', 'font:12px monospace');
}
