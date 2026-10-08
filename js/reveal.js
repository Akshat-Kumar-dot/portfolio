/* ============================================================
   REVEAL — About and Contact come into place as you scroll to
   them, the way extrafazant.nl's text does: as a section comes up
   the screen its rule draws across, the big words rise into view
   one after another, the small type fades up. It follows the scroll,
   both ways — nothing plays by itself: stop scrolling and it stops
   where it is. (scrub() does the same for Behind the scenes' panels:
   js/desk.js.) Nothing moves for visitors who ask for reduced motion.
   ============================================================ */
import { onScroll } from './scroll.js';
import { box } from './perf.js';

const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* how far into view each element has come — 0 with its top `from` of the way down the screen, 1 once
   it's a further `span` of a screen up — kept in the CSS variable `name`, as the page scrolls. Where they
   are is measured once per layout (js/perf.js), never mid-frame; `live()` false: they're somewhere else for
   now (Behind the scenes in its folder) — shown whole, and left alone */
export function scrub(els, name, from, span, live = () => true) {
  const last = new Map();
  function set() {
    const H = innerHeight, on = live();
    els.forEach(el => {
      const v = on ? Math.min(1, Math.max(0, (H * from - (box(el).top - scrollY)) / (H * span))) : 1;
      if (Math.abs(v - (last.get(el) ?? -1)) < 0.002) return;
      last.set(el, v);
      el.style.setProperty(name, v.toFixed(3));
    });
  }
  onScroll(set, true);                                       // (after the folders have moved Behind the scenes, if they have)
  addEventListener('resize', set);
  set();
  return set;
}

/* each word in its own window, so it can rise from below the line; `at`: where in the section's
   progress it starts, so they come up one after another */
function words(el, at) {
  const parts = el.textContent.split(/(\s+)/), n = Math.max(1, parts.filter(w => w && !/^\s+$/.test(w)).length - 1);
  let i = 0;
  el.innerHTML = parts.map(w => /^\s+$/.test(w) || !w ? w
    : `<span class="w"><span style="--at:${(at + 0.6 * i++ / n).toFixed(3)}">${esc(w)}</span></span>`).join('');
  el.classList.add('split');
}

export function createReveals({ reduced = false } = {}) {
  if (reduced) return;
  const sections = [...document.querySelectorAll('.section')];
  for (const s of sections) {
    s.classList.add('reveal');
    s.querySelectorAll('.sec-lead, .mail').forEach(el => words(el, 0.12));
    s.querySelectorAll('.sec-label, .sec-kicker, .socials, .foot').forEach((el, k) => {
      el.classList.add('fade-up');
      el.style.setProperty('--at', (0.05 + k * 0.12).toFixed(2));
    });
  }
  scrub(sections, '--r', 0.92, 0.55);
}
