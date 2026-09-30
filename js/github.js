/* ============================================================
   GITHUB — a year of contributions as a grid of days, the streaks
   in it, and what you pushed to most recently.

   With DESK.github set it's live: the contribution calendar comes
   from github-contributions-api.jogruber.de (GitHub's own API needs
   a token for it), the rest from api.github.com. Without a username,
   or if those can't be reached, it shows made-up sample activity.
   ============================================================ */
import { rng } from './utils.js';

const CELL = 10, GAP = 3, STEP = CELL + GAP, LEFT = 26, TOP = 16;
const LEVELS = ['rgba(29,27,23,.07)', 'rgba(29,27,23,.24)', 'rgba(29,27,23,.44)', 'rgba(29,27,23,.68)', '#1d1b17'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const iso = d => d.toISOString().slice(0, 10);

export async function createGithub(el, { user, tip }) {
  el.innerHTML = `
    <p class="panel-label"><b>A</b> GitHub <span class="gh-side"><span class="gh-key"></span><span class="gh-who"></span></span></p>
    <div class="gh-map"></div>
    <div class="gh-stats"></div>
    <div class="gh-recent"></div>`;
  const who = el.querySelector('.gh-who');

  let data = null;
  if (user) {
    try { data = await live(user); }
    catch (err) { console.warn('GitHub activity could not be loaded; showing sample data instead.', err); }
  }
  if (data) who.innerHTML = `<a href="https://github.com/${encodeURIComponent(user)}" target="_blank" rel="noopener">@${esc(user)} ↗</a>`;
  else { data = sample(); who.innerHTML = '<span class="sample">Sample data</span>'; }
  render(el, data, tip);
}

async function live(user) {
  const u = encodeURIComponent(user);
  const cal = await fetch(`https://github-contributions-api.jogruber.de/v4/${u}?y=last`).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); });
  const [profile, repos] = await Promise.all([
    fetch(`https://api.github.com/users/${u}`).then(r => r.ok ? r.json() : null).catch(() => null),
    fetch(`https://api.github.com/users/${u}/repos?sort=pushed&per_page=4`).then(r => r.ok ? r.json() : []).catch(() => [])
  ]);
  return {
    days: cal.contributions.map(c => ({ date: c.date, count: c.count, level: c.level })),
    repos: (repos || []).filter(r => !r.fork).slice(0, 3).map(r => ({ name: r.name, url: r.html_url, lang: r.language, pushed: r.pushed_at, stars: r.stargazers_count })),
    publicRepos: profile?.public_repos
  };
}

/* a plausible year: busier on weekdays and lately, with quiet spells and a holiday */
function sample() {
  const r = rng('github-sample'), days = [];
  const end = new Date(); end.setUTCHours(0, 0, 0, 0);
  let spell = 0;
  for (let k = 364; k >= 0; k--) {
    const d = new Date(end); d.setUTCDate(end.getUTCDate() - k);
    const wd = d.getUTCDay(), recent = 1 - k / 365;
    if (spell > 0) spell--; else if (r() < 0.015) spell = 3 + Math.floor(r() * 9);
    const p = spell ? 0.05 : (wd === 0 || wd === 6 ? 0.35 : 0.78) * (0.7 + 0.4 * recent);
    const count = r() < p ? 1 + Math.floor(Math.pow(r(), 2.2) * 14 * (0.6 + recent)) : 0;
    days.push({ date: iso(d), count });
  }
  return { days, repos: [], publicRepos: null };
}

function render(el, { days, repos, publicRepos }, tip) {
  const max = Math.max(1, ...days.map(d => d.count));
  const level = d => d.level ?? (d.count === 0 ? 0 : Math.min(4, 1 + Math.floor(d.count / max * 3.999)));
  const first = new Date(days[0].date + 'T00:00:00Z').getUTCDay();
  const weeks = Math.ceil((days.length + first) / 7);
  const W = LEFT + weeks * STEP, H = TOP + 7 * STEP;

  let cells = '', months = '', lastMonth = -1, lastLabel = -9;
  days.forEach((d, k) => {
    const col = Math.floor((k + first) / 7), row = (k + first) % 7;
    const m = +d.date.slice(5, 7) - 1;
    if ((row === 0 || k === 0) && m !== lastMonth) {            // a month's name over the first week it starts
      lastMonth = m;
      if (col - lastLabel >= 3 && col < weeks - 2) { months += `<text x="${LEFT + col * STEP}" y="10">${MONTHS[m]}</text>`; lastLabel = col; }
    }
    cells += `<rect x="${LEFT + col * STEP}" y="${TOP + row * STEP}" width="${CELL}" height="${CELL}" rx="2" fill="${LEVELS[level(d)]}" data-k="${k}" style="--c:${col}"${k === days.length - 1 ? ' class="today"' : ''}/>`;
  });
  const labels = [1, 3, 5].map(row => `<text x="0" y="${TOP + row * STEP + 8}">${DAYS[row]}</text>`).join('');
  const map = el.querySelector('.gh-map');
  map.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Contributions over the last year">${months}${labels}${cells}</svg>`;
  el.querySelector('.gh-key').innerHTML = `Less ${LEVELS.map(c => `<i style="background:${c}"></i>`).join('')} More`;

  // on a narrow screen the grid scrolls sideways: start at the latest weeks
  requestAnimationFrame(() => { map.scrollLeft = map.scrollWidth; });

  // hover a day for its count
  const svg = map.querySelector('svg');
  svg.addEventListener('pointermove', e => {
    const k = e.target.dataset?.k;
    if (k === undefined) { tip.classList.remove('on'); return; }
    const d = days[+k], when = new Date(d.date + 'T00:00:00Z');
    tip.textContent = `${d.count || 'No'} contribution${d.count === 1 ? '' : 's'} · ${DAYS[when.getUTCDay()]} ${when.getUTCDate()} ${MONTHS[when.getUTCMonth()]}`;
    tip.style.translate = `${e.clientX + 14}px ${e.clientY - 34}px`;
    tip.classList.add('on');
  });
  svg.addEventListener('pointerleave', () => tip.classList.remove('on'));

  // the numbers
  const total = days.reduce((s, d) => s + d.count, 0);
  let longest = 0, run = 0;
  for (const d of days) { run = d.count ? run + 1 : 0; longest = Math.max(longest, run); }
  let current = 0;
  for (let k = days.length - 1; k >= 0; k--) {
    if (days[k].count) current++;
    else if (k === days.length - 1) continue;                // today isn't over yet
    else break;
  }
  const byDay = [0, 0, 0, 0, 0, 0, 0];
  days.forEach(d => { byDay[new Date(d.date + 'T00:00:00Z').getUTCDay()] += d.count; });
  const busiest = DAYS[byDay.indexOf(Math.max(...byDay))];
  const stats = [
    [total.toLocaleString('en-GB'), 'contributions'],
    [longest + ' days', 'longest streak'],
    [current + (current === 1 ? ' day' : ' days'), 'current streak'],
    publicRepos != null ? [publicRepos, 'public repos'] : [busiest, 'busiest day']
  ];
  el.querySelector('.gh-stats').innerHTML = stats.map(([n, l]) => `<p><b>${esc(n)}</b><span>${esc(l)}</span></p>`).join('');

  if (repos.length) {
    el.querySelector('.gh-recent').innerHTML = `<p class="gh-sub">Recently pushed</p><ul>${repos.map(r =>
      `<li><a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.name)}</a><span>${esc(r.lang || '')}</span><span>${ago(r.pushed)}</span></li>`).join('')}</ul>`;
  }

  // the grid fills in, a week at a time, the first time it comes into view
  new IntersectionObserver((entries, io) => {
    if (entries.some(e => e.isIntersecting)) { svg.classList.add('lit'); io.disconnect(); }
  }, { threshold: 0.3 }).observe(svg);
}

function ago(when) {
  const s = (Date.now() - new Date(when)) / 1000;
  const [n, u] = s < 3600 ? [s / 60, 'minute'] : s < 86400 ? [s / 3600, 'hour'] : s < 86400 * 30 ? [s / 86400, 'day'] : [s / 86400 / 30, 'month'];
  const k = Math.max(1, Math.floor(n));
  return `${k} ${u}${k === 1 ? '' : 's'} ago`;
}
