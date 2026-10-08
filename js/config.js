/* ============================================================
   CONFIG — everything you're likely to edit lives here.
   ============================================================ */

/* The landing page and the sections after the globe.
   Wrap a word in *asterisks* in the headline to set it in italics.
   The notes graph beside it comes from assets/graph.json — made by
   tools/make-graph.mjs (illustrative) or tools/export-graph.mjs
   (from a real Obsidian vault).                                     */
export const SITE = {
  name: 'Akshat Kumar',
  headline: ['Software and AI,', 'made by *hand*'],
  role: 'Software & AI developer',
  location: 'India',
  about: 'I design and build software and AI tools — from the first sketch to the last pixel, and the model and the servers underneath. I care about the details people feel but rarely notice. (Replace this with a few lines about you.)',
  email: 'akshat.kumar.singh05@gmail.com',
  links: [
    { label: 'GitHub', url: '#' },
    { label: 'LinkedIn', url: '#' },
    { label: 'X', url: '#' }
  ]
};

/* One entry per project. The globe repeats the list to fill every
   card, so each project shows up several times around the sphere.
   Add `img: 'assets/projects/my-shot.jpg'` to show a real screenshot
   in the card's window (roughly 6:5, e.g. 1200 × 1000, fits best).
   Add `video: 'assets/projects/clip.mp4'` and the window becomes a little
   player: the clip loops, muted, fitted whole (never cropped), with a
   timeline under it; `img` is then the still shown until it plays,
   `caption` and `credit` the two lines under the controls.
   Keep clips short and small — ~10 s, 720 px wide, H.264 MP4.
   `colors: { bg, ink, win, wink, acc }` gives a card its own colours:
   card, text, window, window text, accent.                            */
export const WORK = [
  { title: 'Project 01', tag: 'Web App',      year: '2026', url: '#',
    desc: 'A marketing site and booking flow, designed and built end to end.' },
  { title: 'Project 02', tag: 'Dashboard',    year: '2026', url: '#',
    desc: 'Live metrics for a small team, with alerts that explain themselves.' },
  { title: 'Project 03', tag: 'Mobile',       year: '2025', url: '#',
    desc: 'A habit tracker that works offline and syncs when it can.' },
  { title: 'Project 04', tag: 'AI Tool',      year: '2025', url: '#',
    desc: 'Ask questions of your own notes and get answers with sources.' },
  { title: 'Resume', tag: 'CV',               year: '2025', url: '#',        // ← url: your résumé, e.g. 'assets/resume.pdf'
    desc: 'Where I’ve worked, what I’ve built, and what I know — on one page.',
    video: 'assets/projects/resume.mp4', img: 'assets/projects/resume.jpg',
    caption: 'Handing over the résumé', credit: 'Clip · The Office (NBC)',
    colors: { bg: '#241412', ink: '#f6ece2', win: '#0c0b0a', wink: '#ece4d9', acc: '#e0896a' } },   // dark oxblood
  { title: 'Project 06', tag: 'Maps',         year: '2025', url: '#',
    desc: 'Finding quiet places to work, from crowd data and open maps.' },
  { title: 'Project 07', tag: 'Commerce',     year: '2024', url: '#',
    desc: 'A storefront for a ceramics studio, from catalogue to checkout.' },
  { title: 'Project 08', tag: 'Productivity', year: '2024', url: '#',
    desc: 'A planning board that turns meeting notes into tasks.' },
  { title: 'Project 09', tag: 'Editorial',    year: '2024', url: '#',
    desc: 'A publishing system for long reads, with a reader built for focus.' },
  { title: 'Project 10', tag: 'Data',         year: '2024', url: '#',
    desc: 'Cleaning and exploring messy spreadsheets without writing code.' },
  { title: 'Project 11', tag: 'Gallery',      year: '2023', url: '#',
    desc: 'A photographer’s portfolio that loads instantly on slow networks.' },
  { title: 'Project 12', tag: 'Media',        year: '2023', url: '#',
    desc: 'A listening room for a record label, with shared queues.' }
];

/* The card globe. Sizes are relative to the sphere's radius. */
export const GLOBE = {
  cardWidth: 0.34,       // card width (cards are 16:10)
  gapX: 0.06,            // space between cards in a row
  gapY: 0.05,            // space between rows
  rows: 10,              // rows of latitude
  radius: 0.13,          // final radius in the scene, metres (a hand is ~0.19)
  seed: 0.0075,          // radius while it's held inside the closed hands
  spin: 0.12             // idle rotation, radians per second
};

/* Scroll choreography, in vh of scrolling from the top (100 = one screen's
   height). Everything follows the scroll directly and runs backwards when
   you scroll back up. The story is as long as its last number.          */
const STORY = {
  intro:    [0, 30],        // the headline lifts away
  collapse: [0, 45],        // the notes graph gathers into a single dot
  drop:     [45, 95],       // the dot falls and slips between the thumbs of the rising hands
  enter:    [12, 95],       // the closed hands rise into view from below the page
  open:     [101, 187],     // they part…
  lift:     [103, 267],     // …and the globe rises out of them as they do, growing as it goes
  zoom:     [295, 381],     // then you step inside: one card fills the screen, its neighbours curve away
  browse:   [381, 589],     // scrolling on walks down the globe row by row (BROWSE)…
  unzoom:   [589, 640],     // …then you step back out, and the whole globe floats again (a moment's rest: the
                            // real page, ready to use — it's never a picture of it you're left looking at)
  shrink:   [648, 705]      // and the page becomes a file: the screen shrinks into a sheet and goes into the Work
                            // folder, the folders rising round it (FILES); then Behind the scenes comes up out of its own
};
export const STORY_VH = 705;

/* Speed zones: over these stretches the page moves no faster than this many vh a second, however
   hard you scroll — a gentle scroll or a hard one, on the way in or the way back — so every moment
   plays at a pace you can follow, the animation in step with the scroll. `carry` is how far (in
   screens) a scroll there can run ahead of the page: how far it keeps going at that speed after one
   turn of the wheel. Stop scrolling and it eases to a stop within a moment. `whole`: never left half
   done — once you've scrolled into it, it carries on to its end (the way you're going, at that same
   speed) and comes to rest just past it, so the globe is never left half risen, half zoomed, or half
   in its folder — looking ready when it isn't.
   [from vh, to vh, vh a second, carry, whole] (js/scroll.js) */
const PACE = [
  [0, 95, 62, 0.3],         // the notes gather and the dot falls into the hands
  [95, 267, 150, 0.45, true],   // the hands part and the globe rises — all the way, or back into the hands
  [267, 295, 100, 0.4],     // it floats free (so a hard scroll doesn't lurch between the two)
  [295, 381, 86, 0.4, true],    // stepping inside the globe — all the way in to a card, or back out
  [589, 640, 70, 0.3, true],    // stepping back out — all the way out, or back in to the last row
  [640, 648, 60, 0.3],      // floating again, for a moment
  [648, 705, 60, 0.3, true]     // the page closing into its folder — all the way in, or back out to the page
];
export const SCROLL = {                                   // the same, as fractions of the story (0 → 1)
  ...Object.fromEntries(Object.entries(STORY).map(([k, [a, b]]) => [k, [a / STORY_VH, b / STORY_VH]])),
  spin: 7.2,                // radians the globe turns while it rises
  phoneOpening: 1.9,        // on a phone, the opening (the dot to the hands, the globe rising) this much quicker
  pace: PACE.map(([a, b, ...rest]) => [a / STORY_VH, b / STORY_VH, ...rest])
};

/* Inside the globe, scrolling walks through these rows, top to bottom
   (0 is the lowest row, GLOBE.rows − 1 the highest) — up and down the
   globe with the scroll, one row per stretch of browse.               */
export const BROWSE = { from: 8, to: 1 };

/* Zoomed in: how much of the screen the centre card takes up. */
export const ZOOM = {
  height: 0.6,           // at most this fraction of the screen's height
  width: 0.56            // and at most this fraction of its width
};

/* Behind the scenes — the page after the work, before About: how you work,
   and what you've got on while you do. Live where it can be, sample data where it
   isn't set up yet. Everything marked ← is a placeholder: put yours in.   */
export const DESK = {
  title: ['Behind', 'the *scenes*'], // the page's name; its folder's tab says it too
  intro: 'The speed, the soundtrack and the habits behind the work.',

  // your best typing test; visitors can race it on the page
  typing: { wpm: 92, accuracy: 97, test: 'Monkeytype · 60 s' },   // ← your real numbers

  // your GitHub username, e.g. 'akshatkumar'. Empty shows made-up sample activity.
  github: '',                                                      // ←

  // WakaTime share links (wakatime.com → Share → "Coding Activity" and "Languages", format JSON).
  // Empty shows sample numbers.
  wakatime: { activity: '', languages: '' },                       // ←

  // what you're up to; the player fills in "Listening" itself
  updated: 'September 2026',
  now: [                                                           // ←
    ['Building', 'This portfolio — hands, a globe, and a notes graph'],
    ['Learning', 'Fine-tuning small language models'],
    ['Reading', 'Designing Data-Intensive Applications']
  ],

  tools: [                                                         // ←
    ['Languages', ['Python', 'TypeScript', 'C++', 'SQL']],
    ['AI', ['PyTorch', 'Hugging Face', 'LangChain', 'OpenCV']],
    ['Web', ['React', 'Next.js', 'Three.js', 'Node']],
    ['Every day', ['VS Code', 'Git', 'Obsidian', 'Figma']]
  ],

  // songs for the player: files you have the right to publish, in assets/music.
  // Empty plays a loop the page composes itself, in the browser.
  music: [
    // { title: 'Song name', artist: 'Artist', src: 'assets/music/song.mp3' },
  ]
};

/* After the globe: the site's sections as a stack of folders. The globe's
   page closes into Work as they rise round it (STORY.shrink); scrolling on
   goes to Behind the scenes, and on again opens it: its sheet grows into
   the page — the same thing, the other way. It all follows the scroll.  */
export const FILES = {
  notes: 'Where every project starts — a vault of linked notes.',   // the line on the Notes folder's sheet
  cue: 'Keep scrolling to open',
  stepVh: 30,                        // scrolling from one folder to the next (Work → Behind the scenes), in vh
  openVh: 55,                        // scrolling to open Behind the scenes into the page, in vh
  pace: [36, 0.25],                  // through those two: a speed zone (vh a second, carry in screens — see STORY's)
  phoneQuick: 2.5                    // on a phone, this much quicker (a swipe covers far less than a turn of the wheel)
};

/* The hands. Colours are taken from real skin: backs darker, palms lighter. */
export const HAND = {
  url: 'https://cdn.jsdelivr.net/npm/@webxr-input-profiles/assets@1.0/dist/profiles/generic-hand/right.glb',
  subdivisions: 2,       // 0 = the raw low-poly model, 2 = smooth
  tones: {
    dorsal:  '#b4866b',  // back of the hand
    palm:    '#d9ae98',
    knuckle: '#997058',
    tipPink: '#dca394',
    vein:    '#8e8793',
    nail:    '#e2c0b3',
    lunula:  '#efdcd3',
    free:    '#f6ede6'   // nail tip
  }
};
