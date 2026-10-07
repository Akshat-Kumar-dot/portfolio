/* ============================================================
   TYPING — your best score, and a short race visitors can run
   against it. The clock starts on the first key. Words per minute
   counts the characters typed correctly (five to a word); accuracy
   counts every key pressed, mistakes you fixed included.
   ============================================================ */

const TEXTS = [
  'Good software is mostly careful thinking written down slowly, then tested until it stops surprising you.',
  'Name things well, delete what you do not need, and leave the code a little kinder than you found it.',
  'The fastest way through a hard problem is to make it small enough to see all of it at once.',
  'A good interface feels obvious only after someone has spent weeks making it that way.',
  'Measure first, guess second, and write down what you learned before you forget it.',
  'Most bugs live in the space between what you meant to write and what you actually typed.',
  'Small tools that do one thing well outlast clever tools that try to do everything.',
  'Every model is wrong in some way, but a few of them are useful enough to ship.'
];

const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const TAP = matchMedia('(hover: hover) and (pointer: fine)').matches ? 'Click here' : 'Tap here';   // a phone's finger, a computer's mouse

/* onResult(el): called with the visitor's score once they finish, so the page can circle it */
export function createTyping(el, { wpm, accuracy, test, onResult }) {
  el.innerHTML = `
    <p class="panel-label"><b>C</b> Typing speed</p>
    <div class="ty-best">
      <p class="big-num"><span class="n">${wpm}</span><span class="u">wpm</span></p>
      <p class="ty-best-meta">${accuracy}% accuracy<br>${esc(test)}</p>
    </div>
    <div class="ty-box">
      <p class="ty-text" aria-hidden="true"></p>
      <input class="ty-input" type="text" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false"
             aria-label="Type the sentence shown to race my typing speed">
      <p class="ty-hint">${TAP} and start typing — race me</p>
    </div>
    <div class="ty-bar">
      <p class="ty-live"><b class="ty-wpm">0</b> wpm · <b class="ty-acc">100</b>% · <b class="ty-time">0.0</b> s</p>
      <button class="ty-again" type="button">New sentence ↻</button>
    </div>
    <p class="ty-result" aria-live="polite"></p>`;

  const box = el.querySelector('.ty-box'), text = el.querySelector('.ty-text'), input = el.querySelector('.ty-input');
  const hint = el.querySelector('.ty-hint'), result = el.querySelector('.ty-result');
  const out = { wpm: el.querySelector('.ty-wpm'), acc: el.querySelector('.ty-acc'), time: el.querySelector('.ty-time') };

  let target = '', typed = '', keys = 0, good = 0, t0 = 0, done = false, pick = -1, spans = [], timer = 0;

  function load(next = true) {
    if (next) pick = (pick + 1 + Math.floor(Math.random() * (TEXTS.length - 1))) % TEXTS.length;
    target = TEXTS[pick]; typed = ''; keys = good = 0; t0 = 0; done = false;
    text.innerHTML = [...target].map(c => `<span>${esc(c)}</span>`).join('');
    spans = [...text.children];
    spans[0].classList.add('cur');
    input.value = ''; input.maxLength = target.length;
    result.innerHTML = ''; el.classList.remove('finished');
    clearInterval(timer);
    show(0, 100, 0);
    hint.textContent = TAP + ' and start typing — race me';
  }

  const correct = () => { let c = 0; for (let i = 0; i < typed.length; i++) if (typed[i] === target[i]) c++; return c; };
  function show(w, a, s) { out.wpm.textContent = Math.round(w); out.acc.textContent = Math.round(a); out.time.textContent = s.toFixed(1); }
  function tick() {
    const s = (performance.now() - t0) / 1000;
    show(s > 1 ? correct() / 5 / (s / 60) : 0, keys ? good / keys * 100 : 100, s);
  }

  input.addEventListener('input', () => {
    if (done) { input.value = typed; return; }
    const v = input.value.slice(0, target.length);
    if (!t0 && v.length) { t0 = performance.now(); timer = setInterval(tick, 100); }
    for (let i = typed.length; i < v.length; i++) { keys++; if (v[i] === target[i]) good++; }   // new keys only; backspace is free
    const from = Math.min(typed.length, v.length), to = Math.max(typed.length, v.length);
    typed = v;
    for (let i = from; i <= Math.min(to, spans.length - 1); i++) {
      const s = spans[i];
      s.className = i < typed.length ? (typed[i] === target[i] ? 'ok' : 'no') : '';
    }
    if (typed.length < spans.length) spans[typed.length].classList.add('cur');
    if (typed.length === target.length) finish();
  });
  // the caret only moves by typing: keep it at the end, whatever clicks or keys try
  const toEnd = () => { const n = input.value.length; if (input.selectionStart !== n || input.selectionEnd !== n) input.setSelectionRange(n, n); };
  document.addEventListener('selectionchange', () => { if (document.activeElement === input) toEnd(); });
  input.addEventListener('keydown', e => {
    if (/^Arrow|^Home$|^End$|^PageUp$|^PageDown$/.test(e.key)) e.preventDefault();
    toEnd();
    if (e.key === 'Escape') load(false);
    if (e.key === 'Enter' && done) load();
  });

  function finish() {
    done = true; clearInterval(timer);
    const s = (performance.now() - t0) / 1000;
    const w = Math.round(correct() / 5 / (s / 60)), a = Math.round(keys ? good / keys * 100 : 100);
    show(w, a, s);
    el.classList.add('finished');
    const gap = wpm - w;
    result.innerHTML = gap <= 0
      ? `You typed <b class="ty-you">${w} wpm</b> at ${a}% — faster than me. Well played.`
      : `You typed <b class="ty-you">${w} wpm</b> at ${a}%. I'm ${gap} wpm ahead — <button type="button" class="ty-retry">try again?</button>`;
    result.querySelector('.ty-retry')?.addEventListener('click', () => { load(); input.focus(); });
    onResult?.(result.querySelector('.ty-you'));
  }

  box.addEventListener('pointerdown', e => { if (e.target !== input) { e.preventDefault(); input.focus(); } });
  input.addEventListener('focus', () => { box.classList.add('focus'); });
  input.addEventListener('blur', () => {
    box.classList.remove('focus');
    if (t0 && !done) hint.textContent = 'Click to carry on';
  });
  el.querySelector('.ty-again').addEventListener('click', () => { load(); input.focus(); });

  load();
}
