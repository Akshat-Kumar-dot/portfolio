/* ============================================================
   REVEAL — About and Contact come into place as you scroll to
   them, the way extrafazant.nl's text does: once a section is 15%
   up from the bottom of the screen its rule draws across, the big
   words rise into view one after another, the small type fades up.
   Nothing moves for visitors who ask for reduced motion.
   ============================================================ */

const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* each word in its own window, so it can rise from below the line */
function words(el, delay) {
  let i = 0;
  el.innerHTML = el.textContent.split(/(\s+)/).map(w => /^\s+$/.test(w) || !w ? w
    : `<span class="w"><span style="--i:${i++}">${esc(w)}</span></span>`).join('');
  el.classList.add('split');
  el.style.setProperty('--d', delay + 's');
}

export function createReveals({ reduced = false } = {}) {
  if (reduced) return;
  const sections = [...document.querySelectorAll('.section')];
  for (const s of sections) {
    s.classList.add('reveal');
    s.querySelectorAll('.sec-lead, .mail').forEach(el => words(el, 0.12));
    s.querySelectorAll('.sec-label, .sec-kicker, .socials, .foot').forEach((el, k) => {
      el.classList.add('fade-up');
      el.style.setProperty('--d', (0.05 + k * 0.1) + 's');
    });
  }
  const io = new IntersectionObserver(entries => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add('shown'); io.unobserve(e.target); }
  }, { rootMargin: '0px 0px -15% 0px' });
  sections.forEach(s => io.observe(s));
}
