/* ============================================================
   The hands' subdivision, off the main thread (js/subdivide.js):
   the arrays of the welded model in, each level of it back out.
   ============================================================ */
import { loopOnce } from './loop.js';

onmessage = ({ data: { base, levels } }) => {
  const out = [];
  let d = base;
  for (let i = 0; i < levels; i++) out.push(d = loopOnce(d));
  postMessage(out, out.flatMap(l => [l.pos.buffer, l.si.buffer, l.sw.buffer, l.idx.buffer]));
};
