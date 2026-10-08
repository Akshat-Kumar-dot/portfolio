/* ============================================================
   MARK — whose site this is: on every project card, in the page's
   metadata and in the console. A copy of the site put up somewhere
   else carries it in its paper too, says it's a copy, and where the
   original is. (Nothing a browser shows can be made impossible to
   remove — whoever has the files can change them; this makes a copy
   obvious and a clean one real work. The real protection is that the
   work is yours, dated in your own repository, and copyright: LICENSE.)
   ============================================================ */
import { paintGrain, tone, even } from './grain.js';

const year = new Date().getFullYear();
const [by, at, also] = [0, 1, 2].map(tone);
export const SIGN = `© ${year} ${by}`;                               // on the cards

const here = location.hostname;
const near = !here || location.protocol === 'file:' || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(here) || here.endsWith('.localhost')
  || /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(here);
const copy = !near && !(even() && (here === at || here.endsWith('.' + at) || here === also));

/* two lines of it on a slant, in a tile that repeats — sized to the line, so it's never cut off */
function tile(text) {
  const c = document.createElement('canvas'), x = c.getContext('2d');
  const set = () => { x.font = '500 11px "JetBrains Mono", ui-monospace, Menlo, Consolas, monospace'; if ('letterSpacing' in x) x.letterSpacing = '2.5px'; };
  set();
  const tw = x.measureText(text).width;
  const w = c.width = Math.max(480, Math.ceil(tw * 1.9)), h = c.height = Math.max(300, Math.ceil(tw * 0.7));
  set();                                                      // (sizing the canvas resets it)
  x.fillStyle = 'rgba(29,27,23,0.13)';                       // under the paper layer's own opacity: faint, like a banknote's
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.translate(w / 2, h / 2); x.rotate(-0.3);
  x.fillText(text, -w * 0.2, -h * 0.2);
  x.fillText(text, w * 0.22, h * 0.24);
  return c.toDataURL();
}

const LOCK = { position: 'fixed', inset: '0', 'z-index': '0', display: 'block', visibility: 'visible', opacity: '.45',
               'pointer-events': 'none', 'background-repeat': 'repeat', transform: 'none', filter: 'none', 'clip-path': 'none' };

export function createMark(paper) {
  console.info(`%c${SIGN}%c\nDesigned and built by ${by}. All rights reserved.`, 'font:600 13px monospace', 'font:12px monospace');
  const link = document.querySelector('link[rel="canonical"]') || Object.assign(document.createElement('link'), { rel: 'canonical' });
  link.href = `https://${at}/`;                              // the address search engines should credit
  document.head.append(link);

  if (!copy) { paintGrain(paper); return; }                  // the site itself: just the paper

  const text = `${SIGN} · ${at}`.toUpperCase();
  let sealed = '', mended = 0;
  function paint() {
    const url = tile(text);
    paintGrain(paper, [`url(${url})`]);
    for (const [k, v] of Object.entries(LOCK)) paper.style.setProperty(k, v, 'important');   // a stylesheet can't hide it
    document.documentElement.style.setProperty('--mark', `url(${url})`);                      // folder sheets carry it too
    sealed = paper.style.cssText;                           // just as the browser keeps it (it rewrites values: .45 → 0.45)
  }
  paint();
  document.fonts?.ready.then(paint);

  const notice = document.createElement('div');
  notice.className = 'copy-notice';
  notice.setAttribute('role', 'note');
  notice.innerHTML = `This is an unofficial copy. ${by}’s portfolio is at <a href="https://${at}/">${at}</a>`;
  document.body.append(notice);
  document.title = '(Copy) ' + document.title;

  // kept in place: put back if it's taken out of the page, hidden, or its picture stripped
  const mend = () => {
    if (!paper.isConnected) document.body.prepend(paper);
    if (paper.style.cssText !== sealed && performance.now() - mended > 50) { mended = performance.now(); paint(); }
    if (!notice.isConnected) document.body.append(notice);
  };
  new MutationObserver(mend).observe(document.body, { childList: true });                 // taken out of the page
  new MutationObserver(mend).observe(paper, { attributes: true });                         // its style changed
  setInterval(mend, 2000);
}
