# Portfolio — Akshat Kumar

A single-page portfolio. It opens on the name, set large — *Akshat Kumar* — with one line beneath it, *Software and AI, made by hand*. Beside it sits a graph of notes in the style of Obsidian's graph view, with no frame or buttons, just the graph on the page, its edges fading out: click it and zoom or pan, hover a note to light up its connections, drag notes about, and file names fade in as you zoom closer. As you scroll, the name lifts away and every note drifts in, closer and closer, until they gather into a single dark dot; the dot falls, and two hands rise into the bottom of the page to catch it between their thumbs — the notes are where the projects come from. The hands part, and a small globe of project cards rises out of them, growing until it fills the centre of the page while the hands settle into the bottom fifth. Once it's formed you can drag the globe, hover a card to see the project, and click through.

Scroll on and you step inside the globe: one card fills the middle of the screen as a project preview, its neighbours curving away at the edges like the countries around one you've zoomed into on a globe. Drag or swipe in any direction (or use the arrow keys, or a sideways trackpad swipe) and the globe turns to the next card and snaps it into place. Click an edge card to bring it to the centre; click the centre card to open the project.

The hands and the globe share one Three.js scene, so the globe really sits in the palms: the fingers hide it, it casts shadows on them, and nothing appears out of thin air.

Plain HTML, CSS and ES modules. No build step. Three.js is loaded from a CDN.

---

## Run it

The JavaScript is split into ES modules, and browsers won't load modules from a `file://` page — so open it through a local server rather than double-clicking `index.html`.

```bash
python dev-server.py
```

Then open <http://localhost:5500>. (`npm run dev` does the same.)

`dev-server.py` is `python -m http.server` with caching switched off, so an edited file shows up on a normal refresh. With any other server, use a hard refresh (Ctrl + Shift + R) after changing a `.js` file, or the browser may keep running the old one.

It needs an internet connection: Three.js, d3-force, the hand model and the fonts all come from CDNs.

---

## Project structure

```
portfolio/
├── index.html          markup — the canvas and the text around it
├── css/
│   └── style.css       page, labels, readout, responsive rules
├── js/
│   ├── config.js       ← your projects and every setting worth tweaking
│   ├── main.js         scroll choreography: hands → globe → camera, plus hover and drag
│   ├── stage.js        renderer, camera, lights, fog
│   ├── hands.js        the two hands: loading, posing, open/close, forearms
│   ├── skin.js         procedural skin shader: nails, creases, palm lines, veins, pores
│   ├── subdivide.js    smooths the low-poly hand model (Loop subdivision)
│   ├── globe.js        the globe of cards: layout, hover, drag, spin, zoomed-in navigation
│   ├── covers.js       the artwork on each card
│   ├── graph.js        the notes graph on the landing page (d3-force, canvas)
│   ├── grain.js        paper-grain background texture
│   └── utils.js        small shared helpers
├── assets/
│   ├── favicon.svg
│   ├── graph.json      the notes graph's data (names and links only)
│   └── projects/       put your project screenshots here
├── tools/
│   ├── make-graph.mjs  generates an illustrative graph.json
│   └── export-graph.mjs builds graph.json from a real Obsidian vault
├── archive/            earlier single-file experiments, kept for reference
├── dev-server.py       local server that never caches
├── package.json        `npm run dev`
└── README.md
```

---

## Customising

### The landing page, About and Contact
Edit `SITE` in [`js/config.js`](js/config.js): your name (the big text on the landing page, one line per word), the line beneath it (`headline`; wrap a word in `*asterisks*` for italics), role, location, time zone for the clock in the top bar, the "available" status, the About paragraph, your email and social links.

### The notes graph
The graph reads `assets/graph.json`. The one included is illustrative — made up to look like a real vault:

```bash
node tools/make-graph.mjs              # regenerate it
node tools/make-graph.mjs --seed 7     # a different arrangement
node tools/make-graph.mjs --scale 0.6  # fewer notes
```

To show a real vault instead (names and links only, never note contents — check the names are ones you're happy to publish):

```bash
node tools/export-graph.mjs "C:/path/to/vault" --exclude "Private,Journal"
```

A plain scroll-wheel over the graph only zooms after a click (a small "Click to zoom" tag follows the cursor until then), so visitors scrolling past don't get stuck; pinch or Ctrl + scroll always zoom. Moving the pointer off the graph hands the wheel back to the page. Look and forces are at the top of `js/graph.js`.

### Your projects
Edit `WORK` in [`js/config.js`](js/config.js). Each project:

```js
{ title: 'Note RAG', tag: 'AI Tool', year: '2026', url: 'https://…',
  desc: 'Ask questions of your own notes and get answers with sources.',
  img: 'assets/projects/note-rag.jpg' }
```

- `desc` is a one-line description shown on the card, next to the screenshot.
- `img` is optional. It fills the browser window on the left of the card; screenshots around 6:5 (e.g. 1200 × 1000) fit best. Without it the card shows a wireframe of a typical interface.
- `url` is where the card links. `https://` links open in a new tab.
- The globe has about 90 card slots and repeats your list to fill them.

### Scroll timing
`SCROLL` in `js/config.js` — each range is a `[start, end]` fraction of the scroll:

| key     | what happens                                                   |
|---------|----------------------------------------------------------------|
| `intro` | the headline lifts away                                        |
| `collapse` | the notes graph folds down into a single dot                |
| `drop`  | the dot falls between the thumbs of the rising hands           |
| `enter` | the closed hands rise into view from below the page            |
| `open`  | the hands part from pressed together to cupped                 |
| `lift`  | the globe rises out of them as they part, growing as it goes   |
| `zoom`  | you step inside: one card fills the screen                     |
| `spin`  | radians the globe turns while it rises                         |

The gap between `lift` and `zoom` is where the whole globe floats free. How much of the screen the centre card fills once you're inside is `ZOOM` in the same file. The overall scroll length is `.track { height: 500vh }` in `css/style.css`.

### The hands
- `HAND.tones` in `js/config.js`: back of hand, palm, knuckles, fingertips, veins and nails, as hex colours.
- `HAND.subdivisions`: `2` is smooth; `0` shows the raw model.
- Finger poses (closed / open) are the `POSE` table at the top of `js/hands.js`; how low the hands sit (`BASE_Y`), the gap between the palms and how far they roll open are just above it.
- The camera is fixed, in `js/main.js` (`CAM_POS`, `CAM_AT`), along with where the globe ends up (`GLOBE_AT`).
- The skin detail (how deep creases are, how visible veins are) is in `js/skin.js`.

### The globe
`GLOBE` in `js/config.js`: card size and spacing, number of rows, final size, size while it's hidden in the hands, idle spin.
The card design (palettes, the interface wireframes, the typography) is in `js/covers.js`.

### Colours and type
CSS variables at the top of `css/style.css` (`--bg`, `--ink`, `--muted`, `--accent`, fonts).

---

## Tuning tips

- `?p=0.4` freezes the scroll progress at 40% — handy for adjusting one moment.
- `?cam=top` (the page's own angle), `?cam=side`, `?cam=palm`, `?cam=back` put the camera right up to the hands, for checking poses and skin detail. Combine them: `?p=0.1&cam=top`.
- The page respects `prefers-reduced-motion`: no idle spin.
- If the hand model can't load, the page still works — the globe rises from where the hands would be.

---

## Credits

- Hand model: [WebXR Input Profiles](https://github.com/immersive-web/webxr-input-profiles) `generic-hand` (MIT), loaded from jsDelivr. Skin detail is generated in `js/skin.js`.
- [Three.js](https://threejs.org) r170 (MIT).
- Fonts: Instrument Serif and JetBrains Mono, via Google Fonts.

---

## Next steps

- [ ] Replace the placeholder projects in `js/config.js` with real ones and add screenshots
- [ ] Fill in About and Contact (`SITE` in `js/config.js`)
- [ ] A project detail page for each card
- [ ] For film-quality hands: swap in a scanned hand model with the same WebXR joint names
- [ ] Deploy (GitHub Pages, Netlify or Vercel all serve this folder as-is)
