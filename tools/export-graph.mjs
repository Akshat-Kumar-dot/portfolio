#!/usr/bin/env node
/* ============================================================
   Export an Obsidian vault's graph for the landing page.

   Reads every note in the vault, follows its [[wiki links]],
   markdown links, embeds, canvas references and #tags — the same
   things Obsidian's graph view draws — and writes just the names
   and connections to assets/graph.json. Note contents are never
   copied.

     node tools/export-graph.mjs "C:/Users/you/Documents/Obsidian Vault"

   Options
     --out <file>          where to write (default: assets/graph.json)
     --exclude <a,b,...>   folders to leave out entirely, e.g. "Private,Journal"
     --private-tag <tag>   leave out notes tagged with this (default: private)
     --no-tags             don't draw tags as nodes
     --no-attachments      don't draw PDFs, images, canvases…
     --hide-orphans        leave out notes with no connections
   ============================================================ */
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const opt = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; };
const flag = name => args.includes(name);
const vault = args.find((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--') && !['--no-tags', '--no-attachments', '--hide-orphans'].includes(args[i - 1])));
if (!vault || !fs.existsSync(vault)) {
  console.error('Usage: node tools/export-graph.mjs "<path to vault>" [--out assets/graph.json] [--exclude "A,B"] [--no-tags] [--no-attachments] [--hide-orphans]');
  process.exit(1);
}
const out = opt('--out', 'assets/graph.json');
const exclude = (opt('--exclude', '') || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
const privateTag = (opt('--private-tag', 'private') || '').toLowerCase();
const withTags = !flag('--no-tags'), withFiles = !flag('--no-attachments'), hideOrphans = flag('--hide-orphans');

const ATTACH = new Set(['canvas', 'pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'mp3', 'wav', 'm4a', 'ogg', 'mp4', 'webm', 'mov']);
const SKIP_DIRS = new Set(['.obsidian', '.trash', '.git', 'node_modules']);

/* ---------- collect files ---------- */
const files = [];
(function walk(dir, rel) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.') && e.isDirectory()) continue;
    const r = rel ? rel + '/' + e.name : e.name;
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name) || exclude.some(x => r.toLowerCase() === x || r.toLowerCase().startsWith(x + '/'))) continue;
      walk(path.join(dir, e.name), r);
    } else {
      const ext = path.extname(e.name).slice(1).toLowerCase();
      if (ext === 'md' || (withFiles && ATTACH.has(ext))) files.push({ rel: r, ext, abs: path.join(dir, e.name) });
    }
  }
})(vault, '');

/* ---------- resolve links the way Obsidian does: by name, nearest match ---------- */
const byName = new Map();                                     // lowercase name (with and without .md) → files
for (const f of files) {
  const base = path.basename(f.rel).toLowerCase();
  for (const key of [base, f.ext === 'md' ? base.slice(0, -3) : null, f.rel.toLowerCase(), f.ext === 'md' ? f.rel.toLowerCase().slice(0, -3) : null]) {
    if (!key) continue;
    if (!byName.has(key)) byName.set(key, []);
    byName.get(key).push(f);
  }
}
function resolve(target) {
  let t = decodeURIComponent(target.split('#')[0].split('|')[0].trim()).replace(/\\/g, '/').replace(/^\.\//, '').toLowerCase();
  if (!t) return null;
  const hit = byName.get(t) || byName.get(t.replace(/\.md$/, ''));
  if (!hit) return null;
  return hit.slice().sort((a, b) => a.rel.length - b.rel.length)[0];
}

/* ---------- read links and tags ---------- */
const edges = new Set(), tags = new Map(), privateNotes = new Set();
const key = (a, b) => (a < b ? a + '\u0000' + b : b + '\u0000' + a);
const tagId = t => '#' + t;
for (const f of files) {
  if (f.ext !== 'md' && f.ext !== 'canvas') continue;
  const text = fs.readFileSync(f.abs, 'utf8');
  const targets = [];
  const noteTags = new Set();
  if (f.ext === 'md') {
    const body = text.replace(/```[\s\S]*?```/g, '');           // links in code blocks aren't links
    for (const m of body.matchAll(/!?\[\[([^\]]+?)\]\]/g)) targets.push(m[1]);
    for (const m of body.matchAll(/\[[^\]]*\]\(([^)\s]+?)\)/g)) if (!/^[a-z]+:/i.test(m[1])) targets.push(m[1]);
    const fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (fm) {                                                     // tags: [a, b]  or  tags:\n  - a\n  - b
      const lines = fm[1].split(/\r?\n/);
      lines.forEach((line, i) => {
        const m = line.match(/^tags?:\s*(.*)$/i);
        if (!m) return;
        const found = m[1].trim()
          ? m[1].replace(/[\[\]"']/g, '').split(/[,\s]+/)
          : lines.slice(i + 1).filter((l, j, a) => a.slice(0, j + 1).every(x => /^\s+-\s*\S/.test(x))).map(l => l.replace(/^\s+-\s*/, ''));
        for (const t of found) { const tag = t.replace(/^#/, '').trim().toLowerCase(); if (/\p{L}/u.test(tag)) noteTags.add(tag); }
      });
    }
    const bodyOnly = fm ? body.slice(fm[0].length) : body;
    for (const m of bodyOnly.matchAll(/(?:^|\s)#([\p{L}\p{N}_][\p{L}\p{N}_\-/]*)/gu)) if (/\p{L}/u.test(m[1])) noteTags.add(m[1].toLowerCase());
  } else {
    try { for (const n of JSON.parse(text).nodes || []) if (n.file) targets.push(n.file); } catch { /* not a canvas we can read */ }
  }
  if (privateTag && noteTags.has(privateTag)) { privateNotes.add(f.rel); continue; }
  for (const t of targets) { const hit = resolve(t); if (hit && hit !== f) edges.add(key(f.rel, hit.rel)); }
  if (withTags) for (const t of noteTags) { tags.set(t, (tags.get(t) || 0) + 1); edges.add(key(f.rel, tagId(t))); }
}

/* ---------- write names and connections only ---------- */
const ids = new Map(), nodes = [];
const add = (id, name, type) => { if (!ids.has(id)) { ids.set(id, nodes.length); nodes.push({ n: name, t: type }); } return ids.get(id); };
const degree = new Map();
for (const e of edges) for (const id of e.split('\u0000')) degree.set(id, (degree.get(id) || 0) + 1);
for (const f of files) {
  if (privateNotes.has(f.rel)) continue;
  if (hideOrphans && !degree.get(f.rel)) continue;
  add(f.rel, f.ext === 'md' ? path.basename(f.rel, '.md') : path.basename(f.rel), f.ext === 'md' ? 'note' : 'file');
}
if (withTags) for (const t of tags.keys()) add(tagId(t), '#' + t, 'tag');
const links = [];
for (const e of edges) {
  const [a, b] = e.split('\u0000');
  if (ids.has(a) && ids.has(b)) links.push([ids.get(a), ids.get(b)]);
}

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify({ nodes, links }));
const count = t => nodes.filter(n => n.t === t).length;
console.log(`Wrote ${out}: ${count('note')} notes, ${count('file')} attachments, ${count('tag')} tags, ${links.length} links` +
            (privateNotes.size ? ` (left out ${privateNotes.size} #${privateTag} notes)` : ''));
