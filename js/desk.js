/* ============================================================
   DESK — the page between the work and About: typing speed (and a
   race against it), the record player, GitHub, coding time, what's
   on right now, and the tools. Each panel lives in its own module;
   this one lays out the page and lends them the pen — the same hand-
   drawn line that circles the cards in the globe circles a tool you
   point at, and your score when you finish the typing race.
   ============================================================ */
import { PERF } from './device.js';
import { $, clamp } from './utils.js';
import * as pen from './scribble.js';
import { createTyping } from './typing.js';
import { createMusic } from './music.js';
import { createGithub } from './github.js';
import { createCoding } from './coding.js';
import { scrub } from './reveal.js';

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const rich = s => esc(s).replace(/\*(.+?)\*/g, '<em>$1</em>');

export function createDesk({ desk, reduced }) {
  const page = $('desk');
  $('deskTitle').innerHTML = `<span><small>(03)</small>${rich(desk.title.join(' '))}</span>`;
  $('deskIntro').textContent = desk.intro;

  /* ---------- the pen: loops drawn round elements, in viewport space ---------- */
  const ink = $('deskInk'), ctx = ink.getContext('2d');
  let dpr = 1;
  const sizeInk = () => { dpr = Math.min(devicePixelRatio || 1, PERF.canvasDpr); ink.width = innerWidth * dpr; ink.height = innerHeight * dpr; };
  sizeInk(); addEventListener('resize', sizeInk);
  const loops = new Map();                                   // element → { pts, on, off, want }
  let seed = 100;
  function circle(el, want = true) {
    if (!el) return;
    let l = loops.get(el);
    if (!l && want) loops.set(el, l = { pts: pen.loop(++seed, { turns: 1.7, start: 0.6 + Math.random() }), on: 0, off: 0, want });
    if (l) l.want = want;
    wake();
  }

  /* ---------- panels ---------- */
  createTyping($('typing'), { ...desk.typing, onResult: el => { for (const k of loops.keys()) if (k.classList.contains('ty-you')) loops.get(k).want = false; circle(el); } });

  const listening = document.createElement('span');
  createMusic($('music'), {
    tracks: desk.music, reduced,
    onChange: t => { listening.innerHTML = `${esc(t.title)} <em>${esc(t.artist)}</em>${t.playing ? ' <i class="eq"><b></b><b></b><b></b></i>' : ' <small>· paused</small>'}`; }
  });
  createGithub($('github'), { user: desk.github, tip: $('tip') });
  createCoding($('coding'), desk.wakatime || {});

  const now = $('now');
  now.innerHTML = `<p class="panel-label"><b>E</b> Right now <span>updated ${esc(desk.updated || '')}</span></p>
    <dl>${desk.now.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}<div><dt>Listening</dt><dd class="now-music"></dd></div></dl>`;
  now.querySelector('.now-music').append(listening);

  const tools = $('tools');
  tools.innerHTML = `<p class="panel-label"><b>F</b> Tools</p>
    ${desk.tools.map(([group, items]) => `<div class="tl-group"><p>${esc(group)}</p><ul>${items.map(t => `<li><span>${esc(t)}</span></li>`).join('')}</ul></div>`).join('')}`;
  tools.addEventListener('pointerover', e => { const s = e.target.closest('li span'); if (s) circle(s, true); });
  tools.addEventListener('pointerout', e => { const s = e.target.closest('li span'); if (s) circle(s, false); });

  // each panel rises into place as it comes up the screen, its charts filling in with it (style.css) — with
  // the scroll, both ways, never by itself
  if (!reduced) scrub([...page.querySelectorAll('.panel')], '--in', 1, 0.35);

  /* ---------- drawing the pen ---------- */
  let running = false, last = 0;
  function wake() { if (!running) { running = true; last = performance.now(); requestAnimationFrame(draw); } }
  function draw(now) {
    const dt = Math.min((now - last) / 1000, 0.1); last = now;
    ctx.clearRect(0, 0, ink.width, ink.height);
    for (const [el, l] of loops) {
      if (l.want) { l.on = Math.min(1, l.on + dt / 0.5); l.off = Math.max(0, l.off - dt / 0.3); }
      else { l.off = Math.min(l.on, l.off + dt / 0.3); if (l.off >= l.on - 1e-3) { loops.delete(el); continue; } }
      if (!el.isConnected) { loops.delete(el); continue; }
      const r = el.getBoundingClientRect();
      if (r.bottom < -40 || r.top > innerHeight + 40) continue;
      const a = r.width / 2 + clamp(r.width * 0.12, 8, 22), b = r.height / 2 + clamp(r.height * 0.3, 7, 16);
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2, e = t => t * t * (3 - 2 * t);
      pen.draw(ctx, l.pts, (u, v) => [(cx + u * a) * dpr, (cy + v * b) * dpr], e(l.off), e(l.on), 1.9 * dpr);
    }
    // keep going while a loop is still being drawn or rubbed out; scrolling wakes it to follow along
    if ([...loops.values()].some(l => !l.want || l.on < 1 || l.off > 0)) requestAnimationFrame(draw); else running = false;
  }
  addEventListener('scroll', () => { if (loops.size) wake(); }, { passive: true });
}
