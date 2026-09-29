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
  timeZone: 'Asia/Kolkata', tzLabel: 'IST',   // your local time, shown in the top bar
  available: 'Available for work',            // '' hides the status
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
   in the card's window (roughly 6:5, e.g. 1200 × 1000, fits best).  */
export const WORK = [
  { title: 'Project 01', tag: 'Web App',      year: '2026', url: '#',
    desc: 'A marketing site and booking flow, designed and built end to end.' },
  { title: 'Project 02', tag: 'Dashboard',    year: '2026', url: '#',
    desc: 'Live metrics for a small team, with alerts that explain themselves.' },
  { title: 'Project 03', tag: 'Mobile',       year: '2025', url: '#',
    desc: 'A habit tracker that works offline and syncs when it can.' },
  { title: 'Project 04', tag: 'AI Tool',      year: '2025', url: '#',
    desc: 'Ask questions of your own notes and get answers with sources.' },
  { title: 'Project 05', tag: 'Dev Tool',     year: '2025', url: '#',
    desc: 'An editor extension that explains and refactors code in place.' },
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

/* Scroll choreography, as fractions of the scroll track (0 → 1).
   The track's length is `.track { height }` in css/style.css.     */
export const SCROLL = {
  intro:    [0.00, 0.05],   // the headline lifts away
  collapse: [0.00, 0.07],   // the notes graph folds down into a single dot
  drop:     [0.07, 0.14],   // the dot falls and slips between the thumbs of the rising hands
  enter:    [0.02, 0.14],   // the closed hands rise into view from below the page
  open:     [0.155, 0.37],  // they part…
  lift:     [0.16, 0.57],   // …and the globe rises out of them as they do, growing as it goes
  zoom:     [0.67, 0.93],   // then you step inside: one card fills the screen, its neighbours curve away
  spin:     5.5             // radians the globe turns while it rises
};

/* Zoomed in: how much of the screen the centre card takes up. */
export const ZOOM = {
  height: 0.6,           // at most this fraction of the screen's height
  width: 0.56            // and at most this fraction of its width
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
