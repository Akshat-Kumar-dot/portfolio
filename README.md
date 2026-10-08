# Portfolio — Akshat Kumar

A single-page portfolio. It opens on the name, set large — *Akshat Kumar* — with one line beneath it, *Software and AI, made by hand*. Beside it sits a graph of notes in the style of Obsidian's graph view, with no frame or buttons, just the graph on the page, its edges fading out: click it and zoom or pan, hover a note to light up its connections, drag notes about, and file names fade in as you zoom closer. As you scroll, the name lifts away and every note drifts in, closer and closer, until they gather into a single dark dot; the dot falls, and two hands rise into the bottom of the page to catch it between their thumbs — the notes are where the projects come from. The hands part, and a small globe of project cards rises out of them, growing until it fills the centre of the page while the hands settle into the bottom fifth. Once it's formed you can drag the globe, hover a card to see the project, and click through.

Scroll on and you step inside the globe: one card fills the middle of the screen as a project preview, its neighbours curving away at the edges like the countries around one you've zoomed into on a globe. Inside, scrolling walks down the globe a row at a time — scroll back and it walks back up — and nothing ever holds on to the scroll: past the bottom row you're simply on to the folders, past the top you zoom back out. Along a row it's a sideways swipe on a trackpad, a drag, or ← →, one card at a time (↑ ↓ scroll a row). Point at the centre card and a black pen line circles it once, loose, like someone ringing it on paper; move off and it's rubbed out from where it began. (On a phone it circles each card once it settles.) Click an edge card to bring it to the centre; click the centre card to open the project.

Whenever the globe is out — floating or zoomed in — you can also turn it and zoom it freely, as on Google Earth. Pinch to zoom (two fingers on a phone, or on a trackpad), ctrl + scroll with a mouse, or + and − on the keyboard; drag to turn it — or, floating free, the arrow keys or a sideways swipe on a trackpad, nearly over the poles (point at a card and the globe eases to a stop under the pointer, so the card holds still) (inside the globe a mouse drag looks up and down too, and the scroll follows to the row you've turned to). On a phone a finger that sets off sideways turns the globe (inside, along its row) and the page holds still under it; one that sets off up or down always scrolls — through the story, or row by row inside the globe. On a computer, the controls at the bottom right do the same (a phone has pinch and swipe, and keeps its screen clear): a pan pad — floating, it turns the globe, held down it keeps turning; inside, it moves a card at a time, along the row or to the row above or below — with a reset in its middle, and zoom in and out under it. Your zoom is for the view you set it in: scroll on to the next part and it's back to the story's own.

Past the last row you step back out of the globe and it floats whole again, the *Projects* heading back at the top. Keep scrolling and the page you're on becomes a file: the whole screen turns into a sheet of paper — globe, hands, heading and all — and shrinks down into the Work folder, its corners rounding and a shadow coming under it, while the site's sections rise round it as a stack of folders — 01 Notes, 02 Work, 03 Behind the scenes, 04 About, 05 Contact — one behind the other, their tabs stepping across. (On the way it's a picture of the page, taken the moment it's handed over, so it can go *inside* a folder; scrolling back up, the real page takes over again at exactly the same spot.) Filed away, the sheet shows the globe above the folder's front, like a file's preview. Then Work's sheet sinks into its folder as Behind the scenes rises out of its own — its sheet is the real page, shrunk down — and opens into it: the same move, the other way. It plays like a film's sequence, shot by shot: the globe's page closes into Work; it sinks into its folder, the stack giving a little as it takes it; the label turns to Behind the scenes; that page rises out of its folder, a touch past and settling; then it opens. Every shot follows the scroll exactly — nothing plays on by itself or catches up afterwards — and the page is handed over exactly where it is. What keeps it from flying by is the scroll itself: through the closing and the folders it goes no faster than a steady pace, however hard you scroll or fling (the speed zones, below), so a hard flick moves through the sequence at a pace you can follow, never landing you at the end with the animation still to come. Scrolling back up runs it in reverse, in the same order. Scroll on and the whole stack slides away beneath it, each folder keeping its place, while the sheet comes up out of it and grows until it fills the screen — ending exactly where the page sits below, with no cut and no reload. Like an app opening, the page lands there: the scroll that opened it eases to rest on the page's top and stays a beat (about a fifth of a second; the fading tail of a trackpad fling is let go), then your next scroll carries on down it. All of it follows the scroll both ways; scroll back up and the page shrinks back into its folder, and on up into the globe. The Behind the scenes, About and Contact links in the top bar glide straight there.

*Behind the scenes* is the page between the work and About. On a desktop screen all of it fits on one page — GitHub across the top with a small record player beside it, then typing, coding time and what's on now, and the tools along the foot; on narrower or shorter screens it scrolls.
- **GitHub** — a year of contributions as a grid of days (hover a day for its count), your streaks, and what you pushed to most recently (that list shows when the page scrolls rather than fits).
- **On repeat** — a record player: the record turns while a song plays, the arm swings on and creeps inward as it goes, the label carries the song's name. Your own audio files; until you add some it plays *Desk loop*, a short lo-fi loop the page composes itself in the browser.
- **Typing speed** — your best score, and a race visitors can run against it: type the sentence shown, see words per minute and accuracy as you go, and at the end how you compare (the pen circles your score).
- **Coding time** — hours coded over the last seven days, day by day, and the languages, from WakaTime.
- **Right now** — what you're building, learning and reading, and what's on the record player.
- **Tools** — your languages, frameworks and everyday tools; point at one and the pen circles it.

After it come About and Contact, as ordinary scrolling.

Scrolling is smoothed the way [extrafazant.nl](https://www.extrafazant.nl/) does it, with [Lenis](https://lenis.darkroom.engineering/) and the same settings (`js/scroll.js`): each turn of the wheel or trackpad swipe becomes a glide that eases into place, so even a quick flick travels at a pace you can follow instead of jumping straight to the bottom. On a phone Lenis follows the finger too through the story (`syncTouch`), with a gentle momentum of its own once you let go, so everything below holds there as well; from the top of Behind the scenes down, the phone scrolls the way it always does, with its own momentum — and should that carry it back up into the story, it stops at the top of Behind the scenes.

Everything on the page follows the scroll: no animation plays on by itself, eases along behind it or catches up afterwards. What keeps the story's big moments from flying by is the scroll itself, in three ways (all in `js/scroll.js`):

- **Speed zones** (`slowIn`) — over the stretches where the story plays (the dot falling, the globe rising and floating free, stepping inside the globe, stepping back out as the page closes into its folder, and the folders up to Behind the scenes) the page moves no faster than the zone's speed, however hard you scroll — wheel, trackpad, finger and fling alike, and the same speed every time: a gentle scroll or a hard one, on the way in or the way back. Scroll hard and it just keeps going at that speed for as long as you scroll, the animation in step with it; stop, and it eases to a stop within a moment (nothing carries on by itself). Coming up to a zone fast, it slows smoothly into it. A scroll can run at most `carry` screens ahead of the page in a zone — that's how far one turn of the wheel carries it there. Four zones are *whole* — the globe rising out of the hands, stepping inside it, stepping back out, and the page closing into its folder — because left half done the globe looks ready to use when it isn't (half risen, half zoomed, or a picture of the page that hasn't quite handed back to the page itself): once you've scrolled into one, it carries on to its end in the direction you're going, at that same speed, picking up from your own scroll with no pause, and comes to rest a little past it (`PAST`, so a nudge doesn't set it off again); scroll the other way at any point and it goes back. So the globe only ever rests hidden in the hands, floating free, zoomed in on a row, floating again for a moment once you've stepped back out (the real page, ready to use), or filed in its folder — never in between. The zones are `PACE` in `js/config.js`, and `FILES.pace` for the folders; how quickly it comes to a stop is `FADE` in `js/scroll.js`. The smooth scroll is moved at the start of each frame (`main.js`), so everything drawn is exactly where the page is that frame.
- **A speed limit for hard flicks elsewhere in the story** (`FLICK`; past Behind the scenes there's nothing to fly past, so you scroll freely) — an ordinary swipe or a few clicks of the wheel go exactly as far as they always would, but a hard flick (the wheel spun, or a trackpad fling) moves about a screen and a half and then carries on at a steady pace (0.8 screens a second) for as long as it lasts. Pause or turn round and the next swipe is free again. `free` is how far a swipe goes before the limit starts, `rate` the pace after it.
- **Landing** (`LAND`) — how long the page rests once Behind the scenes has opened (`hold`) before scrolling on down moves on.

About and Contact come into place as you scroll to them — the rule draws across, the words rise one after another (`js/reveal.js`) — and Behind the scenes' panels rise in as they come up the screen, the contribution grid filling in a week at a time and the coding-time bars growing with them (`scrub()` in `js/reveal.js`, used by `js/desk.js`). All of it follows the scroll, both ways: stop and it stops where it is. Smooth scrolling and the reveals stay off for visitors who ask for reduced motion.

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
│   ├── mark.js         whose site this is: on the cards, in the metadata; and copies flagged
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
│   ├── reveal.js       About and Contact coming into place as you scroll to them (and scrub(), for the panels)
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
| `unzoom`| you step back out: the whole globe floats again                |
| `shrink`| the page becomes a sheet and closes into the Work folder       |

The gap between `lift` and `zoom` is where the whole globe floats free. `PACE`, just below it, is the story's speed zones — the notes gathering and the dot falling, the hands parting as the globe rises, the globe floating free, stepping inside the globe, and stepping back out as the page closes into its folder — each `[from, to, speed, carry, whole]`: from and to in the story's vh, how fast (vh a second) the page may move through it, how far (in screens) a scroll there may run ahead of the page, and whether, once started, it plays through to its end. However hard you scroll, it goes through at no more than that speed, the animation in step with it. `BROWSE` picks which rows the scroll walks through (top to bottom); `SCROLL.spin` is how far the globe turns while it rises; `ZOOM` is how much of the screen the centre card fills once you're inside.

### Behind the scenes
`DESK` in `js/config.js` (the page's id is still `#desk`). The one-page layout is the `min-width:1101px and min-height:620px` block in `css/style.css`. Everything marked `←` there is a placeholder to replace with your own:

- `title` — the page's name (`*asterisks*` for italics). Its folder's tab carries it too.
- `typing` — your best `wpm` and `accuracy`, and which test they're from (e.g. your Monkeytype personal best). Visitors race the `wpm`.
- `github` — your GitHub username. Empty shows made-up sample activity, marked *Sample data*. Once set, the grid is live: the calendar comes from [github-contributions-api.jogruber.de](https://github-contributions-api.jogruber.de) (GitHub's own API needs a token for it), repositories from api.github.com.
- `wakatime` — two share links from WakaTime (wakatime.com → Share → *Coding Activity* and *Languages*, format JSON). Empty shows sample numbers.
- `now`, `updated` — what you're building, learning, reading. The player fills in *Listening* itself.
- `tools` — groups of tools, each a name and a list.
- `music` — songs for the player: `{ title, artist, src }`, with the files in `assets/music/`. Only use music you have the right to publish — your own, or royalty-free with a licence that allows it. With none listed the player plays *Desk loop*, composed in the browser; its sound is `composeLoop()` in `js/music.js`.

The folders' section starts where `shrink` does — main.js overlaps it with the end of the globe's scroll — so the stack is there to take the page the moment it closes.

### The folders before Behind the scenes
`FILES` in `js/config.js`: the line on the Notes folder's sheet, the cue on the front of the stack, `stepVh` — the scrolling from one folder to the next — and `openVh`, the scrolling it takes Behind the scenes to open out into the page (both in vh); `pace` is the folders' speed zone, from the end of the globe up to Behind the scenes (`[vh a second, carry in screens]`, as in `PACE`). The folders themselves (names, what's on each sheet) are listed where `createFiles` is called in `js/main.js`; their colours and sizes are `fit()` in `js/files.js`, and how the sheet rises and opens is `draw()` there.

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
`js/device.js` sorts each visitor into one of three tiers: `full` (a computer), `phone`, and `low` (a phone with 2 GB of memory or less — browsers round memory down, so a 6 GB phone says 4). Phones get the same site, a little lighter but still sharp: the 3D at the screen's own pixels — up to 3 to the point on a phone that says it has 8 GB (or, like an iPhone, doesn't say), 2.5 otherwise, 1.75 on `low` — with its edges smoothed, the card covers at full size (three quarters on `low`), smaller shadows, the hands smoothed once instead of twice, and a thinner notes graph (700 or 420 of its 1,320 notes — every busy note kept, an even share of the rest). If a phone can't keep up, the 3D is drawn at fewer pixels, but never below the screen's own. Two fingers on the globe always zoom it — a pinch never scrolls the page, even when one finger lifts before the other. The project video only downloads when it plays.

The top of the page is just the section links, centred (your name is already big on the landing page); the work's heading — *Projects*, with the project count or the card you're on — sits top-left. On a phone the layout changes a little more: no section links, no line saying what to do and no controls (pinch, swipe and tap are all it takes), and the hands keep their wrists just below the bottom of the screen. The 3D (and the paper behind it) is as tall as the screen at its tallest (`100lvh`), so when the browser's address bar slides away there's no strip left under it; the hands' wrists follow the bottom of what's on screen as the bar comes and goes, so it's palms only either way. On a phone the opening — the dot falling into the hands, the globe rising out of them — goes quicker (`SCROLL.phoneOpening`), since a swipe covers less than a turn of the wheel: two ordinary flicks from the top to the globe. A tall screen sees much further down than a laptop's, far enough to show the forearms, so this keeps it to the palms, as on a laptop, however the hands move (`edge` in `hands.js`).

Everywhere, work nobody would see is skipped: on the landing page no 3D is drawn at all (the hands are still out of sight below), the hands aren't drawn or shadowed once you're inside the globe, and the record player only animates while it's turning. The page's paper background is a layer of its own, so phones don't repaint it while scrolling.

On phones, `govern()` in `js/main.js` also watches the frame rate: below about 42 frames a second the 3D is drawn at fewer pixels, a step at a time (down to half), and it steps back up once the phone keeps a steady 60 again. A computer always draws at full quality — its frame rate can be capped for reasons that have nothing to do with its power (Chrome's Energy Saver holds pages to 30 fps on battery), so that's no reason to draw fewer pixels.

Add `?tier=low` (or `phone`, `full`) to the address to try a tier on your computer; the numbers for each are the `PERF` table in `js/device.js`.

### Colours and type
CSS variables at the top of `css/style.css` (`--bg`, `--ink`, `--muted`, `--accent`, fonts).

---

### Watermark, and copies
Whose site this is is worked in all through it (`js/mark.js`): on every project card in its little browser window's address bar, in the page's metadata, and in the console, and search engines are told which address is the original. On the site itself the paper behind the pages is plain. A copy of it put up anywhere else carries a faint repeating mark in its paper — kept in place if it's hidden or taken out — and says at the bottom of the screen that it's an unofficial copy, and where the real one is.

To be straight about it: nothing a browser shows can be made impossible to remove — whoever has the files can change them, and so can an AI. What this does is make a copy obvious and a clean copy real work. The real protection is that the work is yours: it's dated in your own Git history, `LICENSE` says all rights are reserved, and a copy hosted somewhere can be taken down with a copyright (DMCA) notice to its host — GitHub, Netlify, Cloudflare and the rest all act on them.

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
