/* ============================================================
   GLOBE — project cards wrapped around a sphere, in the same 3D
   scene as the hands, so it can sit in them, cast shadows on them
   and be hidden by the fingers.

   Built on a unit sphere; main.js places, scales and aims `group`.
   Two ways to move it:
     free   — idle drift, drag with inertia
     focus  — zoomed in: one card faces you; drag / step to a
              neighbour and it snaps into place
   ============================================================ */
import * as THREE from 'three';
import { WORK, GLOBE } from './config.js';
import { drawCover, COVER_W, COVER_H } from './covers.js';
import { PERF, TIER } from './device.js';

const PAPER = new THREE.Color('#e9e2d6');         // the back of each card
const TAU = Math.PI * 2;
const wrapAngle = a => Math.atan2(Math.sin(a), Math.cos(a));

function wrap(g) {
  // project a flat shape onto the unit sphere around (0,0,1); keeps its
  // proportions wherever the card is placed, poles included
  const pos = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.set(pos.getX(i), pos.getY(i), 1).normalize();
    pos.setXYZ(i, v.x, v.y, v.z - 1);
  }
  g.computeVertexNormals();
  return g;
}

function capTexture() {
  // the medallion at each pole
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S;
  const x = c.getContext('2d');
  x.fillStyle = '#efe9de'; x.beginPath(); x.arc(S / 2, S / 2, S / 2 - 2, 0, TAU); x.fill();
  x.strokeStyle = 'rgba(29,27,23,.35)'; x.lineWidth = 3; x.beginPath(); x.arc(S / 2, S / 2, S / 2 - 18, 0, TAU); x.stroke();
  x.fillStyle = '#1d1b17'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = `400 104px "Instrument Serif", Georgia, serif`; x.fillText('AK', S / 2, S / 2 + 6);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/* a card whose project has a video: the picture plays in the player drawn on its cover
   (fitted whole inside it), and the timeline under it fills as it goes */
const PLAYER_HEAD = `
uniform sampler2D uVideo;
uniform float uVideoOn, uVideoAspect, uProgress;
uniform vec4 uVidRect, uBarRect;
uniform vec3 uBarFill;
`;
const PLAYER_PAINT = `
  vec3 playerCol = vec3(0.0), playerGlow = vec3(0.0); float playerMix = 0.0;
  if (gl_FrontFacing) {
    vec2 cp = vec2(vMapUv.x, 1.0 - vMapUv.y) * vec2(${COVER_W}.0, ${COVER_H}.0);   // canvas pixels
    vec2 q = (cp - uVidRect.xy) / uVidRect.zw, v = q;
    float ra = uVidRect.z / uVidRect.w;
    if (uVideoAspect > ra) v.y = (q.y - 0.5) * uVideoAspect / ra + 0.5; else v.x = (q.x - 0.5) * ra / uVideoAspect + 0.5;
    if (uVideoOn > 0.5 && all(greaterThanEqual(v, vec2(0.0))) && all(lessThanEqual(v, vec2(1.0)))) {
      // a screen lights itself: mostly glow, a little of the room's light, so it shows at its own brightness
      vec3 c = texture2D(uVideo, vec2(v.x, 1.0 - v.y)).rgb;
      playerCol = c * 0.12; playerGlow = c * 0.84; playerMix = 1.0;
    }
    // the timeline fills as it plays, a knob riding its end
    vec2 b = (cp - uBarRect.xy) / uBarRect.zw;
    float fill = step(0.0, b.x) * step(b.x, uProgress) * step(0.0, b.y) * step(b.y, 1.0);
    float knob = uVideoOn * (1.0 - smoothstep(6.0, 7.5, distance(cp, uBarRect.xy + vec2(uBarRect.z * uProgress, uBarRect.w * 0.5))));
    float ui = max(fill, knob);
    if (ui > 0.0) { playerCol = mix(playerCol, uBarFill, ui); playerGlow = mix(playerGlow, emissive * uBarFill, ui); playerMix = max(playerMix, ui); }
    diffuseColor.rgb = mix(diffuseColor.rgb, playerCol, playerMix);
  }
`;

function cardMaterial(map, player) {
  const m = new THREE.MeshStandardMaterial({
    map, emissiveMap: map, emissive: 0xffffff, emissiveIntensity: 0.2,
    roughness: 0.85, metalness: 0, envMapIntensity: 0.35, side: THREE.DoubleSide,   // printed card, not glossy
    alphaTest: 0.5, alphaToCoverage: true
  });
  m.onBeforeCompile = sh => {
    sh.uniforms.uPaper = { value: PAPER };
    if (player) Object.assign(sh.uniforms, player.uniforms);
    sh.fragmentShader = 'uniform vec3 uPaper;\n' + (player ? PLAYER_HEAD : '') + sh.fragmentShader
      .replace('#include <map_fragment>', '#include <map_fragment>\n  if (!gl_FrontFacing) diffuseColor.rgb = uPaper;' + (player ? PLAYER_PAINT : ''))
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n  if (!gl_FrontFacing) totalEmissiveRadiance *= 0.0;' +
        (player ? '\n  if (playerMix > 0.0) totalEmissiveRadiance = mix(totalEmissiveRadiance, playerGlow, playerMix);' : ''));
  };
  m.customProgramCacheKey = () => player ? 'card-player-v1' : 'card-v1';
  return m;
}

/* the video for a project that has one: muted, looping, and only playing while the globe is on screen */
function makePlayer(item, cover, coverTex, reduced) {
  const v = document.createElement('video');
  Object.assign(v, { muted: true, loop: true, playsInline: true, preload: TIER === 'full' ? 'auto' : 'metadata', crossOrigin: 'anonymous' });   // phones fetch the clip when it plays
  v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('aria-hidden', 'true');
  // on the page but out of sight: browsers pause a muted video they think nobody can see
  v.className = 'globe-video';
  document.body.append(v);
  v.src = item.video;
  const tex = new THREE.VideoTexture(v);
  tex.colorSpace = THREE.SRGBColorSpace;
  const { video: V, bar: B, fill } = cover.player;
  const uniforms = {
    uVideo: { value: tex }, uVideoOn: { value: 0 }, uVideoAspect: { value: 16 / 9 }, uProgress: { value: 0 },
    uVidRect: { value: new THREE.Vector4(V.x, V.y, V.w, V.h) }, uBarRect: { value: new THREE.Vector4(B.x, B.y, B.w, B.h) },
    uBarFill: { value: new THREE.Color(fill) }
  };
  // the running time on the card's canvas, redrawn once a second
  let shownSec = -1;
  const showTime = () => {
    const s = Math.floor(v.currentTime);
    if (s === shownSec || !v.duration) return;
    shownSec = s;
    cover.player.drawTime(s, Math.round(v.duration));
    coverTex.needsUpdate = true;
  };
  v.addEventListener('loadedmetadata', () => { uniforms.uVideoAspect.value = v.videoWidth / v.videoHeight; showTime(); });
  v.addEventListener('playing', () => { uniforms.uVideoOn.value = 1; });
  return {
    uniforms, el: v,
    /* on: from the start. off: stopped, and the card goes back to its still, timeline empty */
    play(on) {
      if (on && !reduced) {
        if (v.paused) { v.currentTime = 0; v.play().catch(() => {}); }   // autoplay can be refused: the still stays
        return;
      }
      if (!v.paused) v.pause();
      uniforms.uVideoOn.value = 0; uniforms.uProgress.value = 0;
      shownSec = -1;
      if (v.duration) { cover.player.drawTime(0, Math.round(v.duration)); coverTex.needsUpdate = true; }
    },
    tick() {
      if (v.paused) return;
      uniforms.uProgress.value = v.duration ? v.currentTime / v.duration : 0;
      showTime();
    }
  };
}

export function createGlobe(renderer, { reduced = false } = {}) {
  const group = new THREE.Group();
  const spinner = new THREE.Group();
  group.add(spinner);

  const CW = GLOBE.cardWidth, CH = CW * (COVER_H / COVER_W);
  const geo = wrap(new THREE.PlaneGeometry(CW, CH, 14, 10));
  const aniso = Math.min(renderer.capabilities.getMaxAnisotropy(), PERF.aniso);

  const players = [];
  const textures = WORK.map((item, i) => {
    const cover = drawCover(item, i, WORK.length, () => { t.needsUpdate = true; });
    const t = new THREE.CanvasTexture(cover);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = aniso;
    players[i] = item.video && cover.player ? makePlayer(item, cover, t, reduced) : null;
    return t;
  });

  /* even rows of latitude, each holding as many cards as fit, and a
     round medallion capping each pole                                */
  const cards = [], rows = [];
  const step = CH + GLOBE.gapY;
  let slot = 0;
  for (let r = 0; r < GLOBE.rows; r++) {
    const lat = (r - (GLOBE.rows - 1) / 2) * step;
    const n = Math.floor(TAU * Math.cos(Math.abs(lat) + CH / 2) / (CW + GLOBE.gapX));
    const row = { lat, n, cards: [] };
    for (let j = 0; j < n; j++) {
      const lon = (j + (r % 2) * 0.5) / n * TAU;
      const k = (slot * 5 + 3) % WORK.length;                  // neighbours are never the same project
      const mesh = new THREE.Mesh(geo, cardMaterial(textures[k], players[k]));
      mesh.castShadow = true;
      mesh.quaternion.setFromEuler(new THREE.Euler(-lat, lon, 0, 'YXZ'));
      const dir = new THREE.Vector3(Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon));
      mesh.position.copy(dir);
      const card = { mesh, mat: mesh.material, k, dir, lat, lon, row: r, col: j, hover: 0 };
      mesh.userData.card = card;
      spinner.add(mesh); cards.push(card); row.cards.push(card);
      slot++;
    }
    rows.push(row);
  }
  const capAngle = Math.PI / 2 - (Math.abs(rows[0].lat) + CH / 2) - 0.03;
  const capGeo = wrap(new THREE.CircleGeometry(Math.tan(capAngle), 48));
  const capMat = cardMaterial(capTexture());
  for (const s of [1, -1]) {
    const cap = new THREE.Mesh(capGeo, capMat);
    cap.quaternion.setFromEuler(new THREE.Euler(-s * Math.PI / 2, 0, 0, 'YXZ'));
    cap.position.set(0, s, 0);
    cap.castShadow = true;
    spinner.add(cap);
  }
  const meshes = cards.map(c => c.mesh);

  /* ---------- rotation ---------- */
  // spinner.rotation = (tilt, spin): a card at (lat, lon) faces the viewer when tilt = lat, spin = −lon
  let spin = 0.4, tilt = 0.12, vSpin = 0, vTilt = 0, drift = 0;
  const TILT = 1.4;                                          // how far it turns up or down, floating free: nearly over the poles
  let focus = null, spinT = 0, tiltT = 0;
  let rest = 0.12;                                            // the lean it drifts back to when floating free (until you turn it yourself)

  function aimAt(card) {
    focus = card;
    tiltT = card.lat;
    spinT = spin + wrapAngle(-card.lon - spin);
  }
  function nearestTo(t, s) {
    let row = rows[0];
    for (const r of rows) if (Math.abs(r.lat - t) < Math.abs(row.lat - t)) row = r;
    let best = row.cards[0];
    for (const c of row.cards) if (Math.abs(wrapAngle(-c.lon - s)) < Math.abs(wrapAngle(-best.lon - s))) best = c;
    return best;
  }

  /* focus mode on/off: on, the card nearest the front swings round to face you */
  function setFocus(on) {
    if (on && !focus) aimAt(nearestTo(tilt, spin));
    if (!on && focus) { focus = null; vSpin = vTilt = 0; }
  }
  /* move the focus: dx = ±1 column (right/left), dy = ±1 row (up/down).
     Returns false when there's no row that way (you're at the top or bottom). */
  function stepFocus(dx, dy) {
    if (!focus) return false;
    if (dx) {
      const row = rows[focus.row];
      aimAt(row.cards[(focus.col + dx + row.n) % row.n]);
    } else if (dy) {
      const r = rows[focus.row + dy];
      if (!r) return false;
      let best = r.cards[0];
      for (const c of r.cards) if (Math.abs(wrapAngle(c.lon - focus.lon)) < Math.abs(wrapAngle(best.lon - focus.lon))) best = c;
      aimAt(best);
    }
    return true;
  }
  /* turn to row r (0 = the lowest), to the card on it nearest the one you're on — so scrolling
     walks straight up or down the globe, and a sideways move you've made is kept */
  function aimRow(r) {
    const row = rows[Math.max(0, Math.min(rows.length - 1, r))];
    const lon = focus ? focus.lon : -spin;                   // the front of the globe faces the viewer at lon = −spin
    let best = row.cards[0];
    for (const c of row.cards) if (Math.abs(wrapAngle(c.lon - lon)) < Math.abs(wrapAngle(best.lon - lon))) best = c;
    aimAt(best);
  }
  function focusCard(card) { if (focus && card) aimAt(card); }

  /* drag: in free mode the globe spins; in focus mode it follows the finger, then snaps */
  let dragX = 0, dragY = 0;
  function drag(dx, dy) {
    const k = focus ? 0.0032 : 0.006;
    vSpin = dx * k; vTilt = dy * k * (focus ? 1 : 0.66);
    spin += vSpin; tilt = THREE.MathUtils.clamp(tilt + vTilt, focus ? -1.3 : -TILT, focus ? 1.3 : TILT);
    if (!focus && dy) rest = tilt;                            // tilted it yourself: it stays that way
    dragX += dx; dragY += dy;
  }
  /* the pan control, held down: turn by (ax, ay) radians — round the poles, and over them */
  function turn(ax, ay) {
    spin += ax;
    tilt = rest = THREE.MathUtils.clamp(tilt + ay, -TILT, TILT);
  }
  /* back to how it floats at first: a slight forward lean, no spin of your own */
  function home() { rest = 0.12; vSpin = vTilt = 0; }
  function release() {
    const dx = dragX, dy = dragY;
    dragX = dragY = 0;
    if (!focus) return;
    const next = nearestTo(tilt, spin);                        // wherever the drag left it
    vSpin = vTilt = 0;
    if (next !== focus) return aimAt(next);
    // a flick too short to reach the next card still moves exactly one
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) return stepFocus(dx < 0 ? 1 : -1, 0);
    if (Math.abs(dy) > 40) return stepFocus(0, dy > 0 ? 1 : -1);
    aimAt(focus);
  }

  const _n = new THREE.Vector3(), _q = new THREE.Quaternion();
  function pick(ray) {
    const hits = ray.intersectObjects(meshes, false);
    for (const h of hits) {
      const c = h.object.userData.card;
      _n.copy(c.dir).applyQuaternion(spinner.getWorldQuaternion(_q));
      if (_n.dot(ray.ray.direction) < -0.1) return c;       // only cards that face the viewer
    }
    return null;
  }

  /* s = { scrollSpin, hovered, dragging, idle, peek: {x, y}, frozen } — frozen: held exactly as it is
     (while a picture of it stands in for it, in the Work folder) */
  /* a project's video plays only while its card is the one you've stopped on (k = its
     index in WORK; −1 plays nothing) — main.js decides, from the zoomed-in view */
  const videos = players.filter(Boolean);
  let playingK = null;
  function setPlaying(k) {
    if (k === playingK) return;
    playingK = k;
    players.forEach((p, i) => p?.play(i === k));
  }

  function update(dt, s) {
    for (const p of videos) p.tick();
    if (s.frozen) return;
    if (focus) {
      if (!s.dragging) {
        const k = 1 - Math.pow(0.0006, dt);                  // settle onto the focused card
        spin += (spinT - spin) * k; tilt += (tiltT - tilt) * k;
      }
    } else if (!s.dragging) {
      vSpin *= Math.pow(0.04, dt); vTilt *= Math.pow(0.02, dt);
      // pointing at a card, it eases to a stop — so the card stays where the pointer is (a globe that kept creeping
      // would slide the card's edge out from under it, again and again: the globe and the pointer would wobble)
      drift += ((s.hovered ? 0 : GLOBE.spin * s.idle) - drift) * (1 - Math.pow(0.02, dt));
      spin += drift * dt + vSpin + s.scrollSpin;
      tilt = THREE.MathUtils.clamp(tilt + vTilt, -TILT, TILT);
      tilt += (rest - tilt) * (1 - Math.pow(0.3, dt));      // drift back to its lean
    }
    // in focus mode the cursor tilts the globe a little, to peek at the neighbours
    const px = focus && !s.dragging ? -s.peek.x * 0.07 : 0, py = focus && !s.dragging ? s.peek.y * 0.05 : 0;
    spinner.rotation.set(tilt + py, spin + px, 0, 'XYZ');

    for (const c of cards) {
      const target = c === s.hovered && !focus ? 1 : 0;
      if (!target && !c.hover) continue;                     // at rest and staying so: nothing to do (most of them, most frames)
      c.hover += (target - c.hover) * (1 - Math.pow(0.0008, dt));
      if (!target && c.hover < 1e-3) c.hover = 0;
      c.mesh.position.copy(c.dir).multiplyScalar(1 + c.hover * 0.07);
      c.mesh.scale.setScalar(1 + c.hover * 0.12);
      c.mat.emissiveIntensity = 0.2 + c.hover * 0.22;
    }
  }

  /* whether the cards (and the poles' medallions) cast shadows — only while the globe is low in the hands do they reach them */
  let casting = true;
  function castShadows(on) {
    if (on === casting) return;
    casting = on;
    spinner.traverse(o => { if (o.isMesh) o.castShadow = on; });
  }

  return { group, cards, rows, update, pick, drag, release, turn, home, setFocus, stepFocus, aimRow, focusCard, setPlaying, videos, castShadows,
           get focus() { return focus; },
           /* the focused card has arrived in the middle (not still swinging in) */
           get settled() { return !!focus && Math.abs(wrapAngle(spinT - spin)) < 0.02 && Math.abs(tiltT - tilt) < 0.02; } };
}
