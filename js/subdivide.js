/* ============================================================
   Loop subdivision for a skinned, indexed mesh.

   The hand model is ~1,400 vertices, which shows as facets along
   the fingers. Each level splits every triangle in four and pulls
   the vertices onto a smooth limit surface; skin weights are
   carried along so the result still bends with the bones.
   ============================================================ */
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

export function subdivideSkinned(source, levels = 2) {
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

  for (let i = 0; i < levels; i++) g = loopOnce(g);

  const si = g.attributes.skinIndex;           // skinning wants integer bone indices
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(Uint16Array.from(si.array), 4));
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}

function loopOnce(g) {
  const pos = g.attributes.position.array, si = g.attributes.skinIndex.array, sw = g.attributes.skinWeight.array;
  const idx = g.index.array, V = pos.length / 3, F = idx.length / 3;

  // edges, with the vertex opposite them in each face they belong to
  const edgeMap = new Map(), edges = [], faceEdges = new Uint32Array(F * 3);
  for (let f = 0; f < F; f++) for (let e = 0; e < 3; e++) {
    const a = idx[f * 3 + e], b = idx[f * 3 + (e + 1) % 3], c = idx[f * 3 + (e + 2) % 3];
    const lo = a < b ? a : b, hi = a < b ? b : a, key = lo * V + hi;
    let E = edgeMap.get(key);
    if (!E) { E = { a: lo, b: hi, o: [], id: V + edges.length }; edgeMap.set(key, E); edges.push(E); }
    E.o.push(c);
    faceEdges[f * 3 + e] = E.id;
  }
  const nbr = Array.from({ length: V }, () => []), bnd = Array.from({ length: V }, () => []);
  for (const E of edges) {
    nbr[E.a].push(E.b); nbr[E.b].push(E.a);
    if (E.o.length === 1) { bnd[E.a].push(E.b); bnd[E.b].push(E.a); }
  }

  const NV = V + edges.length;
  const P = new Float32Array(NV * 3), SI = new Float32Array(NV * 4), SW = new Float32Array(NV * 4);
  const acc = new Map();
  function write(out, terms) {                 // terms = [vertex, weight, vertex, weight, …]
    let x = 0, y = 0, z = 0;
    acc.clear();
    for (let t = 0; t < terms.length; t += 2) {
      const v = terms[t], c = terms[t + 1];
      x += pos[v * 3] * c; y += pos[v * 3 + 1] * c; z += pos[v * 3 + 2] * c;
      for (let k = 0; k < 4; k++) {
        const w = sw[v * 4 + k] * c;
        if (w > 0) { const bi = si[v * 4 + k]; acc.set(bi, (acc.get(bi) || 0) + w); }
      }
    }
    P[out * 3] = x; P[out * 3 + 1] = y; P[out * 3 + 2] = z;
    const top = [...acc].sort((p, q) => q[1] - p[1]).slice(0, 4);
    const sum = top.reduce((s, e) => s + e[1], 0) || 1;
    for (let k = 0; k < 4; k++) {
      SI[out * 4 + k] = top[k] ? top[k][0] : 0;
      SW[out * 4 + k] = top[k] ? top[k][1] / sum : 0;
    }
  }

  // existing vertices move toward their neighbours
  for (let v = 0; v < V; v++) {
    const b = bnd[v];
    if (b.length === 2) write(v, [v, 0.75, b[0], 0.125, b[1], 0.125]);
    else if (b.length === 0 && nbr[v].length) {
      const n = nbr[v].length, beta = n > 3 ? 3 / (8 * n) : 3 / 16, t = [v, 1 - n * beta];
      for (const u of nbr[v]) t.push(u, beta);
      write(v, t);
    } else write(v, [v, 1]);
  }
  // one new vertex per edge
  for (const E of edges) {
    if (E.o.length === 2) write(E.id, [E.a, 0.375, E.b, 0.375, E.o[0], 0.125, E.o[1], 0.125]);
    else write(E.id, [E.a, 0.5, E.b, 0.5]);
  }
  // each triangle becomes four
  const I = new Uint32Array(F * 12);
  for (let f = 0; f < F; f++) {
    const a = idx[f * 3], b = idx[f * 3 + 1], c = idx[f * 3 + 2];
    const ab = faceEdges[f * 3], bc = faceEdges[f * 3 + 1], ca = faceEdges[f * 3 + 2];
    I.set([a, ab, ca, ab, b, bc, ca, bc, c, ab, bc, ca], f * 12);
  }

  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(P, 3));
  out.setAttribute('skinIndex', new THREE.BufferAttribute(SI, 4));
  out.setAttribute('skinWeight', new THREE.BufferAttribute(SW, 4));
  out.setIndex(new THREE.BufferAttribute(I, 1));
  return out;
}
