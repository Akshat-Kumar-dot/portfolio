/* ============================================================
   MUSIC — a record player. The record turns while a song plays,
   the arm swings on and creeps inward as the song goes on, and the
   label carries the song's name.

   Songs are plain audio files listed in DESK.music (config.js).
   With none listed it plays "Desk loop": a short lo-fi loop the
   page composes itself with the Web Audio API the first time you
   press play (nothing is downloaded).
   ============================================================ */
import { paintRecord } from './record.js';
import { clamp, rng } from './utils.js';

const LABELS = ['#c65a3a', '#6f7a3a', '#3f5a7a', '#a8843a', '#7a3f5a'];
const SPIN = 1.9;                                            // radians per second at full speed
const ARM = { rest: -24, start: 0, end: 9 };                 // tonearm angles, degrees
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const clock = s => Number.isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '–:––';

const ICON = {
  prev: '<svg viewBox="0 0 24 24"><path d="M7 6v12M18 6l-8 6 8 6z"/></svg>',
  next: '<svg viewBox="0 0 24 24"><path d="M17 6v12M6 6l8 6-8 6z"/></svg>',
  play: '<svg viewBox="0 0 24 24"><path d="M8 5.5v13l10.5-6.5z"/></svg>',
  pause: '<svg viewBox="0 0 24 24"><path d="M8 5.5v13M16 5.5v13"/></svg>'
};

/* onChange({ title, artist, playing }) — whenever the song or play state changes */
export function createMusic(el, { tracks = [], onChange, reduced = false }) {
  const list = tracks.length ? tracks : [{ title: 'Desk loop', artist: 'Composed by this page', gen: true, length: LOOP_SECONDS }];
  el.innerHTML = `
    <p class="panel-label"><b>B</b> On repeat</p>
    <div class="mu">
      <div class="mu-deck">
        <div class="mu-rec"><canvas class="mu-face"></canvas><canvas class="mu-sheen"></canvas></div>
        <svg class="mu-arm" viewBox="0 0 100 100" aria-hidden="true">
          <circle cx="93" cy="8" r="4.6" class="base"/><circle cx="93" cy="8" r="1.4"/>
          <g class="arm"><path d="M93 8 L81 49 L71 61" class="rod"/><rect x="67.5" y="59" width="6" height="4.2" rx="0.8" transform="rotate(38 70.5 61)"/></g>
        </svg>
      </div>
      <div class="mu-info">
        <p class="mu-title"></p>
        <p class="mu-artist"></p>
        <div class="mu-seek" data-lenis-prevent role="slider" tabindex="0" aria-label="Position in the song" aria-valuemin="0" aria-valuemax="100"><i></i><b></b></div>
        <p class="mu-time"><span class="mu-cur">0:00</span><span class="mu-dur">0:00</span></p>
        <div class="mu-ctrl">
          <button type="button" class="mu-prev" aria-label="Previous song">${ICON.prev}</button>
          <button type="button" class="mu-play" aria-label="Play">${ICON.play}</button>
          <button type="button" class="mu-next" aria-label="Next song">${ICON.next}</button>
        </div>
      </div>
    </div>
    <ol class="mu-list">${list.map((t, i) => `<li><button type="button" data-i="${i}"><span>${String(i + 1).padStart(2, '0')}</span>${esc(t.title)}<em>${esc(t.artist || '')}</em></button></li>`).join('')}</ol>`;

  el.classList.toggle('single', list.length < 2);            // one song: no list, just the deck
  const q = s => el.querySelector(s);
  const face = q('.mu-face'), sheen = q('.mu-sheen'), deck = q('.mu-deck'), arm = q('.arm');
  const title = q('.mu-title'), artist = q('.mu-artist'), seek = q('.mu-seek'), fill = q('.mu-seek i'), knob = q('.mu-seek b');
  const cur = q('.mu-cur'), dur = q('.mu-dur'), play = q('.mu-play');
  const rows = [...el.querySelectorAll('.mu-list button')];

  const audio = new Audio();
  audio.preload = 'metadata';
  audio.loop = list.length === 1;
  let i = 0, busy = false, loopUrl = null, size = 0;

  function paint() {
    const t = list[i];
    size = deck.clientWidth * 0.84;
    if (size > 0) paintRecord(face, sheen, { size, title: t.title, artist: t.artist, color: LABELS[i % LABELS.length] });
  }
  function select(k) {
    i = (k + list.length) % list.length;
    const t = list[i];
    title.textContent = t.title; artist.textContent = t.artist || '';
    rows.forEach((r, j) => r.classList.toggle('on', j === i));
    dur.textContent = clock(t.length); cur.textContent = '0:00'; setSeek(0);
    if (!t.gen) audio.src = t.src;
    else if (loopUrl) audio.src = loopUrl;
    else audio.removeAttribute('src');
    paint();
    if ('mediaSession' in navigator) navigator.mediaSession.metadata = new MediaMetadata({ title: t.title, artist: t.artist || '' });
    changed();
  }
  const changed = () => onChange?.({ title: list[i].title, artist: list[i].artist || '', playing: !audio.paused });

  async function start() {
    const t = list[i];
    if (t.gen && !loopUrl) {
      busy = true; el.classList.add('busy');
      try { loopUrl = URL.createObjectURL(await composeLoop()); }
      catch (err) { console.warn('Could not compose the loop', err); }
      busy = false; el.classList.remove('busy');
      if (!loopUrl) return;
      audio.src = loopUrl;
    }
    try { await audio.play(); } catch (err) { console.warn('Playback was blocked', err); }
  }
  const toggle = () => { if (busy) return; audio.paused ? start() : audio.pause(); };
  const step = d => { const was = !audio.paused; select(i + d); if (was) start(); };

  play.addEventListener('click', toggle);
  q('.mu-prev').addEventListener('click', () => (audio.currentTime > 3 ? (audio.currentTime = 0) : step(-1)));
  q('.mu-next').addEventListener('click', () => step(1));
  rows.forEach(r => r.addEventListener('click', () => { if (+r.dataset.i !== i) select(+r.dataset.i); start(); }));
  audio.addEventListener('play', () => { play.innerHTML = ICON.pause; play.setAttribute('aria-label', 'Pause'); el.classList.add('playing'); changed(); });
  audio.addEventListener('pause', () => { play.innerHTML = ICON.play; play.setAttribute('aria-label', 'Play'); el.classList.remove('playing'); changed(); });
  audio.addEventListener('loadedmetadata', () => { dur.textContent = clock(audio.duration); });
  audio.addEventListener('timeupdate', () => { cur.textContent = clock(audio.currentTime); setSeek(audio.currentTime / (audio.duration || 1)); });
  audio.addEventListener('ended', () => { if (!audio.loop) { step(1); start(); } });

  function setSeek(f) {
    f = clamp(f || 0, 0, 1);
    fill.style.transform = `scaleX(${f})`; knob.style.left = (f * 100) + '%';
    seek.setAttribute('aria-valuenow', Math.round(f * 100));
  }
  function seekTo(e) {
    const r = seek.getBoundingClientRect();
    if (audio.duration) audio.currentTime = clamp((e.clientX - r.left) / r.width, 0, 1) * audio.duration;
  }
  seek.addEventListener('pointerdown', e => { seekTo(e); seek.setPointerCapture(e.pointerId); });
  seek.addEventListener('pointermove', e => { if (seek.hasPointerCapture(e.pointerId)) seekTo(e); });
  seek.addEventListener('keydown', e => {
    const d = { ArrowRight: 5, ArrowLeft: -5 }[e.key];
    if (d && audio.duration) { e.preventDefault(); audio.currentTime = clamp(audio.currentTime + d, 0, audio.duration); }
  });

  if ('mediaSession' in navigator) {
    const on = (action, fn) => { try { navigator.mediaSession.setActionHandler(action, fn); } catch { /* not supported here */ } };
    on('play', start); on('pause', () => audio.pause());
    on('previoustrack', () => step(-1)); on('nexttrack', () => step(1));
  }

  // the record turns up to speed and runs down, like a real deck; the arm follows the song.
  // It only animates while something's moving — nothing runs while the deck sits still
  let angle = 0, speed = 0, armAt = ARM.rest, last = performance.now(), running = false;
  function wake() { if (!running) { running = true; last = performance.now(); requestAnimationFrame(frame); } }
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.1); last = now;
    const on = !audio.paused;
    speed += ((on && !reduced ? SPIN : 0) - speed) * (1 - Math.exp(-dt * (on ? 1.6 : 2.4)));
    angle += speed * dt;
    face.style.transform = `rotate(${angle.toFixed(4)}rad)`;
    const f = audio.duration ? audio.currentTime / audio.duration : 0;
    const want = on || audio.currentTime > 0 ? ARM.start + (ARM.end - ARM.start) * f : ARM.rest;
    armAt += (want - armAt) * (1 - Math.exp(-dt * 4));
    arm.setAttribute('transform', `rotate(${armAt.toFixed(3)} 93 8)`);
    if (on || speed > 0.002 || Math.abs(want - armAt) > 0.02) requestAnimationFrame(frame); else running = false;
  }
  wake();
  for (const e of ['play', 'pause', 'seeked', 'emptied', 'loadedmetadata']) audio.addEventListener(e, wake);

  // repaint when the deck changes size — including the first time the page is shown
  new ResizeObserver(() => { if (Math.abs(deck.clientWidth * 0.84 - size) > 30) paint(); }).observe(deck);
  document.fonts?.ready.then(() => { size = 0; paint(); });
  select(0);
  return { get playing() { return !audio.paused; } };
}

/* ---------- Desk loop: a quiet lo-fi loop, composed and rendered in the browser ---------- */
const BPM = 80, BEAT = 60 / BPM, BAR = BEAT * 4, BARS = 16;
const LOOP_SECONDS = BAR * BARS;
const CHORDS = [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59, 62]];   // Fmaj7, Em7, Dm7, Cmaj9
const SCALE = [72, 74, 76, 79, 81, 84];                                                        // C major pentatonic, up high
const hz = m => 440 * Math.pow(2, (m - 69) / 12);

async function composeLoop() {
  const sr = 32000, ctx = new OfflineAudioContext(2, Math.ceil(sr * LOOP_SECONDS), sr);
  const r = rng('desk-loop');

  const master = ctx.createGain();
  master.gain.setValueAtTime(0, 0);
  master.gain.linearRampToValueAtTime(0.9, 0.4);
  master.gain.setValueAtTime(0.9, LOOP_SECONDS - 0.7);
  master.gain.linearRampToValueAtTime(0, LOOP_SECONDS);
  const warm = ctx.createBiquadFilter(); warm.type = 'lowpass'; warm.frequency.value = 5200;
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 3;
  master.connect(warm).connect(comp).connect(ctx.destination);

  const noise = ctx.createBuffer(1, sr * 2, sr);
  const nd = noise.getChannelData(0);
  for (let k = 0; k < nd.length; k++) nd[k] = Math.random() * 2 - 1;

  const pan = v => { const p = ctx.createStereoPanner(); p.pan.value = v; p.connect(master); return p; };
  const keysBus = pan(-0.18), padBus = pan(0.12), melBus = pan(0.25), drumBus = pan(0);

  function note(bus, m, t, { type = 'sine', gain = 0.1, attack = 0.01, decay = 1, cut = 0 } = {}) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = hz(m); o.detune.value = (r() - 0.5) * 8;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0008, t + Math.max(attack + 0.02, decay));
    let out = g;
    if (cut) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cut; g.connect(f); out = f; }
    o.connect(g); out.connect(bus);
    o.start(t); o.stop(t + decay + 0.05);
  }
  function hit(t, { freq, q = 0.8, type = 'bandpass', gain, len }) {
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noise; f.type = type; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0008, t + len);
    s.connect(f).connect(g).connect(drumBus);
    s.start(t, r() * 1.5, len + 0.02);
  }
  function kick(t) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    g.gain.setValueAtTime(0.85, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.34);
    o.connect(g).connect(drumBus); o.start(t); o.stop(t + 0.4);
  }

  for (let b = 0; b < BARS; b++) {
    const t = b * BAR, chord = CHORDS[b % CHORDS.length];
    const drums = b >= 2 && !(b === 12 || b === 13);           // two bars of keys alone, and a short break
    // keys, struck on the one and just before the three
    for (const m of chord) {
      note(keysBus, m, t, { gain: 0.07, decay: 2.6, cut: 2400 });
      note(keysBus, m + 12, t, { gain: 0.012, decay: 1.2 });
      note(keysBus, m, t + BEAT * 1.5 + 0.02, { gain: 0.035, decay: 1.4, cut: 2000 });
    }
    // a soft pad underneath
    for (const m of chord.slice(0, 3)) note(padBus, m - 12, t, { type: 'triangle', gain: 0.028, attack: 0.9, decay: BAR + 0.3, cut: 900 });
    // bass
    note(drumBus, chord[0] - 24, t, { type: 'triangle', gain: 0.22, decay: BEAT * 1.4, cut: 500 });
    note(drumBus, chord[0] - 24, t + BEAT * 2.5, { type: 'triangle', gain: 0.16, decay: BEAT * 0.9, cut: 500 });
    // a few high notes, not every bar
    if (b >= 4 && b % 4 !== 3) {
      const n = 2 + Math.floor(r() * 3);
      for (let k = 0; k < n; k++) {
        const at = t + Math.floor(r() * 8) * BEAT / 2;
        note(melBus, SCALE[Math.floor(r() * SCALE.length)], at, { gain: 0.05, decay: 0.9 });
      }
    }
    if (!drums) continue;
    for (let beat = 0; beat < 4; beat++) {
      const bt = t + beat * BEAT;
      if (beat === 0 || beat === 2) kick(bt);
      if (beat === 2 && r() < 0.4) kick(bt + BEAT * 0.58);
      if (beat === 1 || beat === 3) { hit(bt, { freq: 1900, gain: 0.32, len: 0.16 }); note(drumBus, 54, bt, { gain: 0.06, decay: 0.08 }); }
      hit(bt, { freq: 7600, type: 'highpass', gain: 0.07, len: 0.05 });
      hit(bt + BEAT * 0.58, { freq: 7600, type: 'highpass', gain: 0.045, len: 0.04 });   // swung
    }
  }
  // record crackle
  for (let t = 0; t < LOOP_SECONDS; t += 0.05 + r() * 0.3) hit(t, { freq: 3000 + r() * 3000, gain: 0.02 + r() * 0.05, len: 0.006 });

  return wav(await ctx.startRendering());
}

function wav(buf) {
  const ch = buf.numberOfChannels, n = buf.length, sr = buf.sampleRate;
  const v = new DataView(new ArrayBuffer(44 + n * ch * 2));
  const str = (o, s) => { for (let k = 0; k < s.length; k++) v.setUint8(o + k, s.charCodeAt(k)); };
  str(0, 'RIFF'); v.setUint32(4, 36 + n * ch * 2, true); str(8, 'WAVE'); str(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, ch, true);
  v.setUint32(24, sr, true); v.setUint32(28, sr * ch * 2, true); v.setUint16(32, ch * 2, true); v.setUint16(34, 16, true);
  str(36, 'data'); v.setUint32(40, n * ch * 2, true);
  const data = [...Array(ch)].map((_, c) => buf.getChannelData(c));
  let o = 44;
  for (let k = 0; k < n; k++) for (let c = 0; c < ch; c++) {
    const s = Math.max(-1, Math.min(1, data[c][k]));
    v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true); o += 2;
  }
  return new Blob([v], { type: 'audio/wav' });
}
