/* ============================================================
   Loop subdivision for a skinned, indexed mesh.

   The hand model is ~1,400 vertices, which shows as facets along
   the fingers. Each level splits every triangle in four and pulls
   the vertices onto a smooth limit surface; skin weights are
   carried along so the result still bends with the bones.
   ============================================================ */
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { loopOnce } from './loop.js';

/* the model's arrays, its UV seams welded so the surface smooths across them */
function weld(source) {
  let g = new THREE.BufferGeometry();
  const src = source.attributes, count = src.position.count;
  const P = new Float32Array(count * 3), SI = new Float32Array(count * 4), SW = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    P[i * 3] = src.position.getX(i); P[i * 3 + 1] = src.position.getY(i); P[i * 3 + 2] = src.position.getZ(i);
    SI[i * 4] = src.skinIndex.getX(i); SI[i * 4 + 1] = src.skinIndex.getY(i);
    SI[i * 4 + 2] = src.skinIndex.getZ(i); SI[i * 4 + 3] = src.skinIndex.getW(i);
    SW[i * 4] = src.skinWeight.getX(i); SW[i * 4 + 1] = src.skinWeight.getY(i);   // getX() undoes normalised ints
    SW[i * 4 + 2] = src.skinWeight.getZ(i); SW[i * 4 + 3] = src.skinWeight.getW(i);
  }
  g.setAttribute('position', new THREE.BufferAttribute(P, 3));
  g.setAttribute('skinIndex', new THREE.BufferAttribute(SI, 4));
  g.setAttribute('skinWeight', new THREE.BufferAttribute(SW, 4));
  g.setIndex(source.index.clone());
  g = mergeVertices(g, 1e-5);                 // weld UV seams so the surface smooths across them
  return { pos: g.attributes.position.array, si: g.attributes.skinIndex.array, sw: g.attributes.skinWeight.array, idx: g.index.array };
}

/* a level's arrays, as a geometry ready to be skinned */
function geometry({ pos, si, sw, idx }) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(Uint16Array.from(si), 4));   // skinning wants integer bone indices
  g.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}

export function subdivideSkinned(source, levels = 2) {
  let d = weld(source);
  for (let i = 0; i < levels; i++) d = loopOnce(d);
  return geometry(d);
}

/* every level from 0 (the welded model) up to `levels`, worked out off the main thread — it takes a third of a second
   or more, and the page would stop for it just as you'd start to scroll. (Where a worker can't be had, here.) */
export function subdivideLevels(source, levels = 2) {
  const base = weld(source);
  const here = () => { const out = [base]; for (let i = 0; i < levels; i++) out.push(loopOnce(out[i])); return out.map(geometry); };
  if (!levels || !window.Worker) return Promise.resolve(here());
  return new Promise(resolve => {
    let w;
    try { w = new Worker(new URL('./subdivide-worker.js', import.meta.url), { type: 'module' }); }
    catch { resolve(here()); return; }
    w.onmessage = ({ data }) => { w.terminate(); resolve([base, ...data].map(geometry)); };
    w.onerror = e => { e.preventDefault?.(); w.terminate(); resolve(here()); };
    // (copies go to it: the welded arrays are still wanted here, for level 0)
    w.postMessage({ base: { pos: base.pos.slice(), si: base.si.slice(), sw: base.sw.slice(), idx: base.idx.slice() }, levels });
  });
}
