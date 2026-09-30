# Portfolio — Akshat Kumar

A single-page portfolio. It opens on the name, set large — *Akshat Kumar* — with one line beneath it, *Software and AI, made by hand*. Beside it sits a graph of notes in the style of Obsidian's graph view, with no frame or buttons, just the graph on the page, its edges fading out: click it and zoom or pan, hover a note to light up its connections, drag notes about, and file names fade in as you zoom closer. As you scroll, the name lifts away and every note drifts in, closer and closer, until they gather into a single dark dot; the dot falls, and two hands rise into the bottom of the page to catch it between their thumbs — the notes are where the projects come from. The hands part, and a small globe of project cards rises out of them, growing until it fills the centre of the page while the hands settle into the bottom fifth. Once it's formed you can drag the globe, hover a card to see the project, and click through.

Scroll on and you step inside the globe: one card fills the middle of the screen as a project preview, its neighbours curving away at the edges like the countries around one you've zoomed into on a globe. Inside, scrolling walks down the globe a row at a time — scroll back and it walks back up — and nothing ever holds on to the scroll: past the bottom row you're simply on to the folders, past the top you zoom back out. Along a row it's a sideways swipe on a trackpad, a drag, or ← →, one card at a time (↑ ↓ scroll a row). Point at the centre card and a black pen line circles it once, loose, like someone ringing it on paper; move off and it's rubbed out from where it began. (On a phone it circles each card once it settles.) Click an edge card to bring it to the centre; click the centre card to open the project.

Keep scrolling and the globe slides away, and the site's sections come up as a stack of folders — 01 Notes, 02 Work, 03 Behind the scenes, 04 About, 05 Contact — one behind the other, their tabs stepping across. Scrolling goes through them, a folder every third of a screen: each one in turn lifts its sheet out so you can read it (the front of the stack reads out its name), then settles as the next comes up. Behind the scenes' sheet is the real page, shrunk down. Scroll on and the whole stack slides away beneath it, each folder keeping its place, while the sheet comes up out of it and grows until it fills the screen — ending exactly where the page sits below, with no cut and no reload. Like an app opening, the page lands there: the scroll that opened it eases to rest on the page's top and stays a beat (about a fifth of a second; the fading tail of a trackpad fling is let go), then your next scroll carries on down it. All of it follows the scroll both ways; scroll back up and the page shrinks back into its folder, and on up into the globe. The Behind the scenes, About and Contact links in the top bar glide straight there.

*Behind the scenes* is the page between the work and About. On a desktop screen all of it fits on one page — GitHub across the top with a small record player beside it, then typing, coding time and what's on now, and the tools along the foot; on narrower or shorter screens it scrolls.
- **GitHub** — a year of contributions as a grid of days (hover a day for its count), your streaks, and what you pushed to most recently (that list shows when the page scrolls rather than fits).
- **On repeat** — a record player: the record turns while a song plays, the arm swings on and creeps inward as it goes, the label carries the song's name. Your own audio files; until you add some it plays *Desk loop*, a short lo-fi loop the page composes itself in the browser.
- **Typing speed** — your best score, and a race visitors can run against it: type the sentence shown, see words per minute and accuracy as you go, and at the end how you compare (the pen circles your score).
- **Coding time** — hours coded over the last seven days, day by day, and the languages, from WakaTime.
- **Right now** — what you're building, learning and reading, and what's on the record player.
- **Tools** — your languages, frameworks and everyday tools; point at one and the pen circles it.

After it come About and Contact, as ordinary scrolling.

Scrolling is smoothed the way [extrafazant.nl](https://www.extrafazant.nl/) does it, with [Lenis](https://lenis.darkroom.engineering/) and the same settings (`js/scroll.js`): each turn of the wheel or trackpad swipe becomes a glide that eases into place, so even a quick flick travels at a pace you can follow instead of jumping straight to the bottom. On top of that, hard flicks have a speed limit (`FLICK` in `js/scroll.js`): an ordinary swipe or a few clicks of the wheel go exactly as far as they always would, but a hard flick — the wheel spun, or a trackpad fling — moves about a screen and a half and then carries on at a steady pace (0.8 screens a second) for as long as it lasts, so one flick can't throw you past the whole story. Pause or turn round and the next swipe is free again. `free` is how far a swipe goes before the limit starts, `rate` the pace after it. `LAND` in the same file is how long the page rests once Behind the scenes has opened (`hold`), and for how long the fading tail of the swipe that opened it is let go (`most`). Phones keep their own touch scrolling. About and Contact rise into place as you reach them — the rule draws across, the words come up one after another (`js/reveal.js`). Both stay off for visitors who ask for reduced motion.

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
│   ├── device.js       how much the device can take: the full version, or lighter ones for phones
│   ├── hands.js        the two hands: loading, posing, open/close, forearms
│   ├── skin.js         procedural skin shader: nails, creases, palm lines, veins, pores
│   ├── subdivide.js    smooths the low-poly hand model (Loop subdivision)
│   ├── globe.js        the globe of cards: layout, hover, drag, spin, zoomed-in navigation
│   ├── covers.js       the artwork on each card
│   ├── graph.js        the notes graph on the landing page (d3-force, canvas)
│   ├── files.js        the stack of folders after the globe, and Behind the scenes opening out of its folder
│   ├── record.js       paints the player's record: the face that spins, the light that doesn't
│   ├── desk.js         Behind the scenes: lays out the panels, Right now, Tools, and the pen that circles things
│   ├── typing.js       your typing score and the race against it
│   ├── music.js        the record player, and the loop it composes when you've added no songs
│   ├── github.js       the contribution grid, streaks and recent repositories
│   ├── coding.js       coding time from WakaTime
│   ├── scribble.js     the hand-drawn pen line (round the centre card, a tool, your typing score)
│   ├── scroll.js       smooth scrolling (Lenis), and jumpTo / glideTo for scrolling done in code
│   ├── reveal.js       About and Contact rising into place as you scroll to them
│   ├── grain.js        paper-grain background texture
│   └── utils.js        small shared helpers
├── assets/
│   ├── favicon.svg
│   ├── graph.json      the notes graph's data (names and links only)
│   ├── music/          put the player's songs here
│   └── projects/       put your project screenshots here
├── tools/
│   ├── make-graph.mjs  generates an illustrative graph.json
│   ├── export-graph.mjs builds graph.json from a real Obsidian vault
│   └── bake-graph.html  settles graph.json once, so visitors' browsers don't have to
├── archive/            earlier single-file experiments, kept for reference
├── dev-server.py       local server that never caches
├── package.json        `npm run dev`
└── README.md
```

---

## Customising

### The landing page, About and Contact
Edit `SITE` in [`js/config.js`](js/config.js): your name (the big text on the landing page, one line per word), the line beneath it (`headline`; wrap a word in `*asterisks*` for italics), role, location, the About paragraph, your email and social links.

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

The file also carries where each note settles, worked out once ahead of time so visitors' browsers don't have to (it used to cost half a second of frozen page on every visit, and several seconds on a budget phone). After making a new `graph.json`, open `http://localhost:5500/tools/bake-graph.html` and save the file it gives you over `assets/graph.json`. Skip that and the site still works — the notes just settle as the page loads.

A plain scroll-wheel over the graph only zooms after a click (a small "Click to zoom" tag follows the cursor until then), so visitors scrolling past don't get stuck; pinch or Ctrl + scroll always zoom. Moving the pointer off the graph hands the wheel back to the page. Look and forces are at the top of `js/graph.js`.

Once it has settled the graph stays gently alive: the notes float a couple of pixels (each cluster swaying together, loose notes a little more), and every so often a signal runs along a link — often hopping on through a few notes — and the note it reaches darkens, a ring spreading from it. All in the graph's one ink colour, like the rest of it. It runs only while the graph is on screen, at about 30 frames a second, stops as it folds into the dot, and stays still for visitors who've asked their system for reduced motion. The sway sizes are `n.amp`, the signals `signal()` / `send()`, in `js/graph.js`.

### Your projects
Edit `WORK` in [`js/config.js`](js/config.js). Each project:

```js
{ title: 'Note RAG', tag: 'AI Tool', year: '2026', url: 'https://…',
  desc: 'Ask questions of your own notes and get answers with sources.',
  img: 'assets/projects/note-rag.jpg' }
```

- `desc` is a one-line description shown on the card, next to the screenshot.
- `img` is optional. It fills the browser window on the left of the card; screenshots around 6:5 (e.g. 1200 × 1000) fit best. Without it the card shows a wireframe of a typical interface.
- `video` is optional too: the window becomes a little player — the clip loops, muted, fitted whole (never cropped), with a timeline under it that fills as it plays, on every card of that project around the globe. `img` is then the still the card shows the rest of the time. The clip plays only once you've zoomed into the globe and that card has come to rest in the middle — from the beginning, each time you arrive — and stops the moment you move to another card or back out. Keep clips short and light: ~10 s, 720 px wide, H.264 MP4 without sound (the *Resume* card's clip is 0.5 MB). To make one from a longer recording with ffmpeg:

  ```bash
  ffmpeg -i recording.mp4 -an -vf "scale=720:-2,fps=30" -c:v libx264 -preset slow -crf 27 -pix_fmt yuv420p -movflags +faststart assets/projects/clip.mp4
  ```

  Only use footage you have the right to publish — a clip from a TV show belongs to the studio.
- With a `video`, `caption` and `credit` are the two lines under the player's controls (the time beside the controls runs with the clip).
- `colors: { bg, ink, win, wink, acc }` gives one card its own colours — card, text, window, window text, accent — instead of the one it gets by its place in the list (the *Resume* card uses it to stand out in brick red).
- `url` is where the card links. `https://` links open in a new tab.
- The globe has about 90 card slots and repeats your list to fill them.

### Scroll timing
`STORY` in `js/config.js` — each range is a `[start, end]` in vh of scrolling from the top (100 = one screen's height); the story is as long as `STORY_VH`:

| key     | what happens                                                   |
|---------|----------------------------------------------------------------|
| `intro` | the headline lifts away                                        |
| `collapse` | the notes graph folds down into a single dot                |
| `drop`  | the dot falls between the thumbs of the rising hands           |
| `enter` | the closed hands rise into view from below the page            |
| `open`  | the hands part from pressed together to cupped                 |
| `lift`  | the globe rises out of them as they part, growing as it goes   |
| `zoom`  | you step inside: one card fills the screen                     |
| `browse`| scrolling on walks down the globe, one row per stretch         |

The gap between `lift` and `zoom` is where the whole globe floats free. `PACE`, just below it, is a speed limit for three moments — the notes gathering and the dot falling, the hands parting as the globe rises, and stepping inside the globe: however hard you scroll, each plays no faster than its pace (vh a second), so a hard flick still plays them through at a pace you can follow, then catches up with the page. `BROWSE` picks which rows the scroll walks through (top to bottom); `SCROLL.spin` is how far the globe turns while it rises; `ZOOM` is how much of the screen the centre card fills once you're inside.

### Behind the scenes
`DESK` in `js/config.js` (the page's id is still `#desk`). The one-page layout is the `min-width:1101px and min-height:620px` block in `css/style.css`. Everything marked `←` there is a placeholder to replace with your own:

- `title` — the page's name (`*asterisks*` for italics). Its folder's tab carries it too.
- `typing` — your best `wpm` and `accuracy`, and which test they're from (e.g. your Monkeytype personal best). Visitors race the `wpm`.
- `github` — your GitHub username. Empty shows made-up sample activity, marked *Sample data*. Once set, the grid is live: the calendar comes from [github-contributions-api.jogruber.de](https://github-contributions-api.jogruber.de) (GitHub's own API needs a token for it), repositories from api.github.com.
- `wakatime` — two share links from WakaTime (wakatime.com → Share → *Coding Activity* and *Languages*, format JSON). Empty shows sample numbers.
- `now`, `updated` — what you're building, learning, reading. The player fills in *Listening* itself.
- `tools` — groups of tools, each a name and a list.
- `music` — songs for the player: `{ title, artist, src }`, with the files in `assets/music/`. Only use music you have the right to publish — your own, or royalty-free with a licence that allows it. With none listed the player plays *Desk loop*, composed in the browser; its sound is `composeLoop()` in `js/music.js`.

### The folders before Behind the scenes
`FILES` in `js/config.js`: the line on the Notes folder's sheet, the cue on the front of the stack, `stepVh` — the scrolling from one folder to the next — and `openVh`, the scrolling it takes Behind the scenes to open out into the page (both in vh). The folders themselves (names, what's on each sheet) are listed where `createFiles` is called in `js/main.js`; their colours and sizes are `fit()` in `js/files.js`, and how the sheet rises and opens is `draw()` there.

The pen line itself (how loose, how many times round, how it presses and lifts) is `js/scribble.js`; the circle round the centre card is drawn from `drawCircle()` in `js/main.js`.

### The hands
- `HAND.tones` in `js/config.js`: back of hand, palm, knuckles, fingertips, veins and nails, as hex colours.
- `HAND.subdivisions`: `2` is smooth; `0` shows the raw model.
- Finger poses (closed / open) are the `POSE` table at the top of `js/hands.js`; how low the hands sit (`BASE_Y`), the gap between the palms and how far they roll open are just above it.
- The camera is fixed, in `js/main.js` (`CAM_POS`, `CAM_AT`), along with where the globe ends up (`GLOBE_AT`).
- The skin detail (how deep creases are, how visible veins are) is in `js/skin.js`.

### The globe
`GLOBE` in `js/config.js`: card size and spacing, number of rows, final size, size while it's hidden in the hands, idle spin.
The card design (palettes, the interface wireframes, the typography) is in `js/covers.js`.

### Phones and slower devices
`js/device.js` sorts each visitor into one of three tiers: `full` (a computer), `phone`, and `low` (a phone with 4 GB of memory or less — most budget phones). Phones get the same site, lighter: the 3D at fewer pixels and without edge smoothing (their screens are sharp enough), smaller shadows, the card covers at half size, the hands smoothed once instead of twice, and a thinner notes graph (700 or 420 of its 1,320 notes — every busy note kept, an even share of the rest). The project video only downloads when it plays.

The top of the page is just the section links, centred (your name is already big on the landing page); the work's heading — *Projects*, with the project count or the card you're on — sits top-left. On a phone the layout changes a little more: no section links, the line saying what to do sits under the heading, and the hands keep their wrists just below the bottom of the screen. A tall screen sees much further down than a laptop's, far enough to show the forearms, so this keeps it to the palms, as on a laptop, however the hands move (`edge` in `hands.js`).

Everywhere, work nobody would see is skipped: on the landing page no 3D is drawn at all (the hands are still out of sight below), the hands aren't drawn or shadowed once you're inside the globe, and the record player only animates while it's turning. The page's paper background is a layer of its own, so phones don't repaint it while scrolling.

On phones, `govern()` in `js/main.js` also watches the frame rate: below about 42 frames a second the 3D is drawn at fewer pixels, a step at a time (down to half), and it steps back up once the phone keeps a steady 60 again. A computer always draws at full quality — its frame rate can be capped for reasons that have nothing to do with its power (Chrome's Energy Saver holds pages to 30 fps on battery), so that's no reason to draw fewer pixels.

Add `?tier=low` (or `phone`, `full`) to the address to try a tier on your computer; the numbers for each are the `PERF` table in `js/device.js`.

### Colours and type
CSS variables at the top of `css/style.css` (`--bg`, `--ink`, `--muted`, `--accent`, fonts).

---

## Tuning tips

- `?p=0.4` freezes the scroll progress at 40% — handy for adjusting one moment.
- `?tier=low` shows the version a budget phone gets (see *Phones and slower devices*).
- `#desk`, `#about` or `#contact` at the end of the address opens the page there.
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
