#!/usr/bin/env node
/* ============================================================
   Make an illustrative Obsidian-style note graph for the landing
   page — dense topic clusters, small fans of daily notes, bridges
   between topics, project notes that pull from several topics,
   and a cloud of unlinked notes around the edge.

     node tools/make-graph.mjs              → assets/graph.json
     node tools/make-graph.mjs --seed 7     → a different arrangement
     node tools/make-graph.mjs --scale 0.6  → fewer notes

   (tools/export-graph.mjs builds the same file from a real vault.)
   ============================================================ */
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const out = opt('--out', 'assets/graph.json');
const scale = parseFloat(opt('--scale', '1'));
let seed = parseInt(opt('--seed', '11'), 10) >>> 0;
const rnd = () => { seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const pick = a => a[(rnd() * a.length) | 0];
const int = (a, b) => a + ((rnd() * (b - a + 1)) | 0);
const n = x => Math.max(1, Math.round(x * scale));

/* ---------- vocabulary ---------- */
const TOPICS = [
  { hub: 'Machine Learning — MOC', size: 70, words: ['Gradient descent', 'Backpropagation', 'Attention', 'Transformers', 'Tokenization', 'Embeddings',
    'RAG pipeline', 'Vector databases', 'Fine-tuning', 'LoRA', 'RLHF', 'Evaluation metrics', 'Overfitting', 'Regularization', 'Batch norm',
    'CNNs', 'RNNs', 'LSTM', 'Diffusion models', 'Prompt engineering', 'Agents', 'Tool use', 'Chunking strategies', 'Cosine similarity',
    'Loss functions', 'Softmax', 'Dropout', 'Learning rate schedules', 'Adam optimizer', 'Quantization', 'KV cache', 'Context windows',
    'Hallucinations', 'Reranking', 'Hybrid search', 'BM25', 'Few-shot prompting', 'Chain of thought', 'Mixture of experts', 'Distillation'] },
  { hub: 'Web — MOC', size: 60, words: ['React hooks', 'useEffect pitfalls', 'CSS grid', 'Flexbox', 'Three.js basics', 'WebGL shaders', 'Next.js routing',
    'Server components', 'REST vs GraphQL', 'Auth with JWT', 'OAuth flow', 'HTTP caching', 'CDNs', 'Web performance', 'Core Web Vitals',
    'Accessibility checklist', 'Forms and validation', 'State management', 'Service workers', 'WebSockets', 'CORS', 'Tailwind notes',
    'Animations with GSAP', 'Scroll-driven animation', 'Image optimisation', 'Fonts and loading', 'TypeScript generics', 'Vite config',
    'Testing with Playwright', 'Design tokens', 'Component patterns', 'SEO basics'] },
  { hub: 'Systems — MOC', size: 50, words: ['Processes vs threads', 'Mutexes', 'Deadlocks', 'TCP handshake', 'DNS', 'HTTP/2', 'Docker', 'Kubernetes',
    'Linux commands', 'Git internals', 'Rebase vs merge', 'SSH keys', 'Nginx config', 'Load balancing', 'Message queues', 'Redis',
    'Postgres indexes', 'Transactions', 'CAP theorem', 'Consistent hashing', 'Rate limiting', 'Logging', 'Observability', 'CI pipelines',
    'Memory management', 'Virtual memory', 'File systems', 'Scheduling'] },
  { hub: 'Algorithms — MOC', size: 55, words: ['Binary search', 'Two pointers', 'Sliding window', 'Dynamic programming', 'Knapsack', 'Graphs', 'BFS', 'DFS',
    'Dijkstra', 'Topological sort', 'Union find', 'Segment trees', 'Tries', 'Heaps', 'Big-O', 'Recursion', 'Backtracking', 'Greedy',
    'Bit manipulation', 'Hash maps', 'Linked lists', 'Monotonic stack', 'Intervals', 'Prefix sums', 'Minimum spanning tree', 'Bellman-Ford',
    'Floyd–Warshall', 'Sorting', 'Quickselect', 'String matching'] },
  { hub: 'Maths — MOC', size: 40, words: ['Linear algebra', 'Eigenvalues', 'SVD', 'Probability', 'Bayes theorem', 'Markov chains', 'Calculus',
    'Chain rule', 'Statistics', 'Hypothesis testing', 'Distributions', 'Entropy', 'KL divergence', 'Matrix calculus', 'Discrete maths',
    'Combinatorics', 'Graph theory', 'Automata', 'DFA and NFA', 'Regular languages', 'Optimisation', 'Convexity'] }
];
const SUFFIX = ['', '', '', ' — notes', ' — examples', ' (cheatsheet)', ' — questions', ' in practice', ' — summary', ' — deep dive', ' — gotchas'];
const LEAF = [s => `${s} — figure.png`, s => `${s} — source.pdf`, s => `${s} — snippet`, s => `ref — ${s}`, s => `${s} — diagram.canvas`, s => `${s} — highlights`];
const IDEAS = ['a CLI for my notes', 'offline-first sync', 'a better reading list', 'voice notes to tasks', 'a tiny search engine', 'a habit tracker',
  'teaching DP visually', 'map of my commute', 'shader playground', 'auto-tagging notes', 'a kanban for ideas', 'weekly review template'];
const PROJECTS = ['Project 01', 'Project 02', 'Project 03', 'Project 04', 'Project 05', 'Project 06',
  'Project 07', 'Project 08', 'Project 09', 'Project 10', 'Project 11', 'Project 12'];

/* ---------- build ---------- */
const nodes = [], links = [], names = new Set(), seen = new Set();
function node(name, type = 'note', group = -1) {
  let nm = name, k = 2;
  while (names.has(nm)) nm = `${name} ${k++}`;
  names.add(nm);
  nodes.push({ n: nm, t: type, g: group });
  return nodes.length - 1;
}
function link(a, b) {
  if (a === b) return;
  const key = a < b ? a + ',' + b : b + ',' + a;
  if (!seen.has(key)) { seen.add(key); links.push([a, b]); }
}

// dense topic clusters, each around a map-of-content note
const members = [];
TOPICS.forEach((topic, g) => {
  const hub = node(topic.hub, 'note', g);
  const mine = [hub];
  for (let i = 0; i < n(topic.size); i++) {
    const m = node(pick(topic.words) + pick(SUFFIX), 'note', g);
    if (rnd() < 0.4) link(m, hub);
    const k = int(1, 4);                                          // earlier notes collect more links — a dense core
    for (let j = 0; j < k; j++) link(m, mine[Math.floor(Math.pow(rnd(), 1.8) * mine.length)]);
    mine.push(m);
    const leaves = rnd() < 0.55 ? int(1, 4) : 0;
    for (let j = 0; j < leaves; j++) link(m, node(pick(LEAF)(nodes[m].n.split(' — ')[0]), 'file', g));
  }
  members.push(mine);
});

// bridges between topics
for (let i = 0; i < n(55); i++) {
  const a = pick(members), b = pick(members);
  if (a !== b) link(pick(a), pick(b));
}

// projects pull from several topics — this is where the notes go
for (const title of PROJECTS) {
  const p = node(title, 'note', 9);
  for (let j = 0; j < int(4, 8); j++) link(p, pick(pick(members)));
  for (let j = 0; j < int(1, 3); j++) link(p, node(`${title} — ${pick(['spec', 'retro', 'todo', 'launch notes', 'screens.png', 'brief.pdf'])}`, 'file', 9));
}

// daily notes and reading notes: small fans scattered around
for (let i = 0; i < n(58); i++) {
  const d = new Date(2023, 0, 1 + int(0, 1300));
  const title = rnd() < 0.7 ? d.toISOString().slice(0, 10) : `Book — ${pick(['Designing Data-Intensive Applications', 'Clean Architecture', 'The Pragmatic Programmer', 'Deep Learning', 'Grokking Algorithms', 'Refactoring UI', 'Hands-On ML', 'Structure and Interpretation'])}`;
  const f = node(title, 'note', 8);
  for (let j = 0; j < int(2, 7); j++) link(f, node(pick([...TOPICS.flatMap(t => t.words), ...IDEAS]) + pick([' — thought', ' — todo', ' — link', ' — q', '']), 'file', 8));
  if (rnd() < 0.35) link(f, pick(pick(members)));
}

// short chains: reading lists and threads of thought
for (let i = 0; i < n(9); i++) {
  let prev = pick(pick(members));
  for (let j = 0; j < int(3, 7); j++) { const c = node(`Thread — ${pick(IDEAS)}`, 'note', 7); link(prev, c); prev = c; }
}

// and the long tail: notes that never got linked
for (let i = 0; i < n(290); i++) {
  const r = rnd();
  node(r < 0.3 ? `Untitled ${int(1, 240)}` : r < 0.55 ? new Date(2022, 0, 1 + int(0, 1600)).toISOString().slice(0, 10)
     : r < 0.8 ? `Idea — ${pick(IDEAS)}` : `Inbox — ${pick(TOPICS).words[int(0, 20)].toLowerCase()}`, 'note', -1);
}

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify({ nodes, links }));
console.log(`Wrote ${out}: ${nodes.length} notes and files, ${links.length} links`);
