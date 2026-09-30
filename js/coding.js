/* ============================================================
   CODING TIME — hours spent coding over the last seven days, day by
   day, and the languages they went on. Live from WakaTime share
   links (DESK.wakatime) when they're set; sample numbers otherwise.
   ============================================================ */

const LETTER = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const hm = s => { const h = Math.floor(s / 3600), m = Math.round(s % 3600 / 60); return h ? `${h} h ${m} m` : `${m} m`; };

export async function createCoding(el, { activity, languages }) {
  el.innerHTML = `
    <p class="panel-label"><b>D</b> Coding time <span class="cd-src"></span></p>
    <p class="big-num cd-total"></p>
    <p class="cd-avg"></p>
    <div class="cd-days"></div>
    <ul class="cd-langs"></ul>`;

  let data = null;
  if (activity || languages) {
    try { data = await live(activity, languages); }
    catch (err) { console.warn('WakaTime stats could not be loaded; showing sample numbers instead.', err); }
  }
  el.querySelector('.cd-src').innerHTML = data ? 'WakaTime · last 7 days' : '<span class="sample">Sample data</span>';
  render(el, data || sample());
}

async function live(activityUrl, languagesUrl) {
  const get = u => u ? fetch(u).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }) : null;
  const [a, l] = await Promise.all([get(activityUrl), get(languagesUrl)]);
  const days = a ? a.data.slice(-7).map(d => ({ date: d.range.date, seconds: d.grand_total.total_seconds })) : sample().days;
  const langs = l ? l.data.slice(0, 5).map(x => ({ name: x.name, percent: x.percent })) : sample().langs;
  return { days, langs };
}

function sample() {
  const hours = [3.4, 5.1, 4.6, 6.2, 2.3, 0.9, 4.8], today = new Date();
  const days = hours.map((h, k) => {
    const d = new Date(today); d.setDate(today.getDate() - (hours.length - 1 - k));
    return { date: d.toISOString().slice(0, 10), seconds: h * 3600 };
  });
  return { days, langs: [['Python', 46], ['TypeScript', 27], ['C++', 9], ['Markdown', 8], ['Other', 10]].map(([name, percent]) => ({ name, percent })) };
}

function render(el, { days, langs }) {
  const total = days.reduce((s, d) => s + d.seconds, 0), top = Math.max(1, ...days.map(d => d.seconds));
  el.querySelector('.cd-total').innerHTML = hm(total).replace(/(\d+)\s(h|m)/g, '<span class="n">$1</span><span class="u">$2</span>');
  el.querySelector('.cd-avg').textContent = `last 7 days · ${hm(total / days.length)} a day`;
  el.querySelector('.cd-days').innerHTML = days.map(d => {
    const wd = new Date(d.date + 'T12:00:00').getDay();
    return `<p title="${esc(hm(d.seconds))}"><i style="--h:${(d.seconds / top).toFixed(3)}"></i><span>${LETTER[wd]}</span></p>`;
  }).join('');
  const most = Math.max(1, ...langs.map(l => l.percent));
  el.querySelector('.cd-langs').innerHTML = langs.map(l =>
    `<li><span>${esc(l.name)}</span><i style="--w:${(l.percent / most).toFixed(3)}"></i><b>${Math.round(l.percent)}%</b></li>`).join('');
}
