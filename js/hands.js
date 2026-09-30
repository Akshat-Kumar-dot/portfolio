/* ============================================================
   HANDS — two copies of one rigged hand (the second mirrored).

   Closed: cupped together around the small globe.
   Open:   rolled apart along the little-finger edges into an
           offering, with the globe resting in the palms.

   createHands(scene) returns:
     update(time, open, sink, enter) → world position where the globe rests
     ready              resolves once the model is loaded
     rig                measured joint frames (after ready)
   ============================================================ */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { HAND, GLOBE } from './config.js';
import { clamp, lerp, eio } from './utils.js';
import { subdivideSkinned } from './subdivide.js';
import { PERF } from './device.js';
import { createSkinMaterials } from './skin.js';

const TILT = 0.28;                                    // fingers raised above the forearms, radians
const BASE_Y = -0.04;                                 // how low the hands sit: they stay in the bottom fifth of the page
const GAP = { closed: 0.009, open: 0.003 };           // space between the palms, metres
const OPEN_ANGLE = 1.36;                              // how far each hand rolls open (π/2 = flat)

/* Finger poses. Each joint is [flex, spread, twist, swingY, swingX] in
   radians; the thumb's swing terms carry it across or away from the palm. */
const POSE = {
  closed: {                                           // pressed together, a small hollow between the palms
    index:  [[0, 0, 0], [0.3, -0.07, 0], [0.1, 0, 0], [0.05, 0, 0]],
    middle: [[0, 0, 0], [0.31, -0.01, 0], [0.1, 0, 0], [0.05, 0, 0]],
    ring:   [[0, 0, 0], [0.3, 0.04, 0], [0.1, 0, 0], [0.05, 0, 0]],
    pinky:  [[0, 0, 0], [0.27, 0.09, 0], [0.1, 0, 0], [0.05, 0, 0]],
    thumb:  [[0, 0, 0, -0.1, -0.3], [-0.1, 0, 0], [-0.1, 0, 0]]    // thumbs side by side on top, touching but not crossing
  },
  open: {                                             // relaxed cup
    index:  [[0, 0, 0], [0.3, 0.02, 0], [0.34, 0, 0], [0.18, 0, 0]],
    middle: [[0, 0, 0], [0.32, 0, 0], [0.36, 0, 0], [0.18, 0, 0]],
    ring:   [[0.03, 0, 0], [0.34, -0.02, 0], [0.36, 0, 0], [0.18, 0, 0]],
    pinky:  [[0.06, 0, 0], [0.38, -0.05, 0], [0.36, 0, 0], [0.18, 0, 0]],
    thumb:  [[0, 0, 0, -0.45, 0], [0.12, 0, 0], [0.2, 0, 0]]
  }
};
const DELAY = { thumb: 0, index: 0.04, middle: 0.08, ring: 0.12, pinky: 0.16 };   // fingers open in a ripple
const FINGERS = ['index', 'middle', 'ring', 'pinky'];

/* The rig's joints are siblings, so each finger is posed by walking its
   chain ourselves: every joint rotates everything after it.            */
const HAND_X = new THREE.Vector3(1, 0, 0), HAND_Y = new THREE.Vector3(0, 1, 0);
const _C = new THREE.Quaternion(), _r = new THREE.Quaternion(), _t = new THREE.Quaternion(),
      _P = new THREE.Vector3(), _d = new THREE.Vector3();

function restOf(b) {
  return { b, p: b.position.clone(), q: b.quaternion.clone(),
           ax: new THREE.Vector3(1, 0, 0).applyQuaternion(b.quaternion),
           ay: new THREE.Vector3(0, 1, 0).applyQuaternion(b.quaternion),
           az: new THREE.Vector3(0, 0, 1).applyQuaternion(b.quaternion) };
}
function chainsOf(model) {
  const bones = {};
  model.traverse(o => { if (o.isBone) bones[o.name] = o; });
  const chains = {};
  for (const f of FINGERS)
    chains[f] = ['metacarpal', 'phalanx-proximal', 'phalanx-intermediate', 'phalanx-distal', 'tip'].map(j => restOf(bones[f + '-finger-' + j]));
  chains.thumb = ['metacarpal', 'phalanx-proximal', 'phalanx-distal', 'tip'].map(j => restOf(bones['thumb-' + j]));
  return chains;
}
function poseChain(ch, rots) {
  _C.identity(); _P.copy(ch[0].p);
  for (let k = 0; k < ch.length; k++) {
    const j = ch[k];
    if (k) _P.add(_d.subVectors(j.p, ch[k - 1].p).applyQuaternion(_C));
    const a = rots[k];
    if (a) {
      _r.setFromAxisAngle(j.ay, a[1]);
      _r.multiply(_t.setFromAxisAngle(j.ax, -a[0]));
      if (a[2]) _r.multiply(_t.setFromAxisAngle(j.az, a[2]));
      if (a[3]) _r.premultiply(_t.setFromAxisAngle(HAND_Y, a[3]));
      if (a[4]) _r.premultiply(_t.setFromAxisAngle(HAND_X, a[4]));
      _C.multiply(_r);
    }
    j.b.position.copy(_P);
    j.b.quaternion.copy(_C).multiply(j.q);
  }
}
const _blend = [[0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0]];
function poseHand(chains, open, time) {
  for (const f in chains) {
    const o = eio(clamp((open - DELAY[f]) / 0.84, 0, 1));
    const A = POSE.closed[f], B = POSE.open[f];
    const breathe = Math.sin(time * 0.9 + DELAY[f] * 9) * 0.02;
    for (let k = 0; k < A.length; k++)
      for (let c = 0; c < 5; c++) _blend[k][c] = lerp(A[k][c] || 0, B[k][c] || 0, o) + (c === 0 && k ? breathe : 0);
    poseChain(chains[f], _blend.slice(0, A.length));
  }
}

/* ---------- measurements the skin shader needs, in rest space ---------- */
function measureRig(geo, chains) {
  const pos = geo.attributes.position, V = pos.count;
  const P = new THREE.Vector3(), D = new THREE.Vector3();
  function radiusAt(center, axis, band = 0.003, maxR = 0.013) {
    const ds = [];
    for (let i = 0; i < V; i++) {
      P.fromBufferAttribute(pos, i); D.subVectors(P, center);
      const t = D.dot(axis);
      if (Math.abs(t) > band) continue;
      const perp = D.addScaledVector(axis, -t).length();
      if (perp < maxR) ds.push(perp);
    }
    ds.sort((a, b) => a - b);
    return ds.length ? ds[Math.floor(ds.length * 0.6)] : 0.008;
  }
  const dorsalOf = (j, axis) => {
    const n = new THREE.Vector3(0, 1, 0).applyQuaternion(j.q);
    return n.addScaledVector(axis, -n.dot(axis)).normalize();
  };
  const dir = (a, b) => new THREE.Vector3().subVectors(b, a).normalize();

  // the rig's "tip" joint sits under the finger pad, so find where each finger really ends
  function reach(from, axis) {
    let best = 0;
    for (let i = 0; i < V; i++) {
      P.fromBufferAttribute(pos, i); D.subVectors(P, from);
      const t = D.dot(axis);
      if (t > best && D.addScaledVector(axis, -t).length() < 0.011) best = t;
    }
    return best;
  }
  const nails = [], tips = [];
  for (const f of ['thumb', ...FINGERS]) {
    const ch = chains[f], tip = ch[ch.length - 1].p, dj = ch[ch.length - 2];
    const A = dir(dj.p, tip), N = dorsalOf(dj, A), len = reach(dj.p, A);
    const c = dj.p.clone().addScaledVector(A, len * 0.66);
    const thumb = f === 'thumb';
    nails.push({ c, a: A, n: N,
                 h: new THREE.Vector2(len * (thumb ? 0.31 : 0.3), radiusAt(c, A) * (thumb ? 0.95 : 0.9)) });
    tips.push(tip.clone());
  }

  const joints = [];
  const add = (j, A, offset, wrinkle) =>
    joints.push({ p: j.p.clone(), a: A, n: dorsalOf(j, A), x: new THREE.Vector4(radiusAt(j.p, A) * 1.05, offset, wrinkle, 0) });
  for (const f of FINGERS) {
    const ch = chains[f];
    const prox = dir(ch[1].p, ch[2].p);
    add(ch[1], prox, 0.38 * ch[1].p.distanceTo(ch[2].p), 0);     // knuckle; palm crease sits out on the finger
    add(ch[2], dir(ch[1].p, ch[3].p), 0, 1);
    add(ch[3], dir(ch[2].p, ch[4].p), 0, 0.7);
  }
  const th = chains.thumb;
  add(th[1], dir(th[0].p, th[2].p), 0, 0.5);
  add(th[2], dir(th[1].p, th[3].p), 0, 0.9);

  let wristY = -1;
  for (let i = 0; i < V; i++) wristY = Math.max(wristY, pos.getY(i));
  return { nails, tips, joints, wristY };
}

function forearmGeometry(geo) {
  // continue the wrist opening as a tapered forearm, baked into rest space
  const pos = geo.attributes.position;
  let maxY = -1;
  for (let i = 0; i < pos.count; i++) maxY = Math.max(maxY, pos.getY(i));
  let cx = 0, cz = 0, n = 0, x0 = 1, x1 = -1, z0 = 1, z1 = -1;
  for (let i = 0; i < pos.count; i++) {
    if (pos.getY(i) < maxY - 0.012) continue;
    const x = pos.getX(i), z = pos.getZ(i);
    cx += x; cz += z; n++; x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z);
  }
  const len = 0.3, g = new THREE.CylinderGeometry(1.25, 0.97, len, 48, 16, true);
  g.translate(0, len / 2, 0);
  g.applyMatrix4(new THREE.Matrix4().makeScale((x1 - x0) / 2, 1, (z1 - z0) / 2));
  g.applyMatrix4(new THREE.Matrix4().makeTranslation(cx / n, maxY - 0.02, cz / n));
  return g;
}

export function createHands(scene) {
  const pair = new THREE.Group();
  scene.add(pair);
  const hands = [];
  let rig = null;

  function place(model, chains, mirror, palmX, pinkyZ) {
    // model axes: fingers −Y, palm −X, thumb −Z  →  fingers −z, palm faces the other hand, thumb up
    const holder = new THREE.Group(); holder.add(model);
    holder.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(
      new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, -1, 0)));
    holder.position.set(GAP.closed - palmX, pinkyZ, -0.01);    // palm near the centre plane, little-finger edge on the hinge
    const pivot = new THREE.Group(); pivot.add(holder);         // the hinge: rotates about z
    const side = new THREE.Group(); side.add(pivot);
    if (mirror) side.scale.x = -1;                              // the left hand is the right one, mirrored
    pair.add(side);
    let wrist = null;
    model.traverse(o => { if (o.isBone && o.name === 'wrist' && !wrist) wrist = o; });
    hands.push({ chains, pivot, holder, palmX, wrist });
  }

  const ready = new GLTFLoader().loadAsync(HAND.url).then(gltf => {
    const model = gltf.scene;
    let mesh = null;
    model.traverse(o => { if (o.isSkinnedMesh) mesh = o; });

    mesh.geometry = subdivideSkinned(mesh.geometry, Math.min(HAND.subdivisions, PERF.subdiv));   // phones: one step smoother, not two
    const chains = chainsOf(model);
    rig = measureRig(mesh.geometry, chains);
    const mats = createSkinMaterials(rig, HAND.tones);
    mesh.material = mats.hand;
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    const arm = new THREE.Mesh(forearmGeometry(mesh.geometry), mats.arm);
    arm.receiveShadow = true;
    model.add(arm);

    // palm plane and little-finger edge, for placing the hinge
    const pos = mesh.geometry.attributes.position;
    let palmX = 1, pinkyZ = -1;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      if (y > -0.03 && y < 0.035 && z > -0.012 && z < 0.03) palmX = Math.min(palmX, x);
      if (y > -0.03 && y < 0.03) pinkyZ = Math.max(pinkyZ, z);
    }

    const twin = SkeletonUtils.clone(model);
    place(model, chains, false, palmX, pinkyZ);
    place(twin, chainsOf(twin), true, palmX, pinkyZ);
  }).catch(err => console.warn('Hand model failed to load — the globe still works without it.', err));

  /* where the globe sits: between the palms when closed, in the cup when open */
  const cup = new THREE.Vector3(), _w = new THREE.Vector3();
  /* below: how far down the hands wait before they rise, metres (deeper on tall narrow screens, which see further down).
     edge(z) → y: on a tall screen (a phone), the bottom of the view at depth z. It sees much further down
     than a laptop — far enough to show the forearms — so there the hands keep their wrists just below it:
     the whole palm in view, no arm, however the pose moves the wrists */
  function update(time, open, sink = 0, enter = 1, below = 0.2, edge = null) {
    const o = eio(open);
    pair.rotation.x = TILT;
    pair.position.set(0, BASE_Y + Math.sin(time * 0.7) * 0.0015, 0);
    for (const h of hands) {
      h.pivot.rotation.z = -OPEN_ANGLE * o;
      h.holder.position.x = lerp(GAP.closed, GAP.open, o) - h.palmX;
      poseHand(h.chains, open, time);
    }
    if (edge && hands[0]?.wrist) {
      pair.updateMatrixWorld();
      hands[0].wrist.getWorldPosition(_w);
      pair.position.y -= _w.y - (edge(_w.z) - 0.022);        // wrist centre a little under the edge, so none of the arm shows
    }
    // rise into view from below the page, and settle a little once the globe has left
    pair.position.y -= (1 - enter) * below + sink * 0.015;
    // tucked up under the thumbs; the globe leaves from here as the hands part
    cup.set(0, 0.036, -0.04);
    pair.updateMatrixWorld();
    return pair.localToWorld(cup);
  }

  return { update, ready, pair, get rig() { return rig; }, POSE, hands };
}
