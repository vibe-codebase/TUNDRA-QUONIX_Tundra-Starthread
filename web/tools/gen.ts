/**
 * Constellation generator. Stars are scattered with a minimum spacing; candidate lines join near neighbours without
 * crossing, without grazing another star and without meeting another line at a narrow angle. A random walk over the
 * candidates (each line used at most once, or twice where double lines are allowed) becomes the constellation, so a
 * whole thread always exists; in the comet chapters some lines are made one-way along that walk. Each sky is then
 * measured: how often a thread of random choices gets stuck. Templates ask for a range of that trickiness.
 * Run: npx esbuild tools/gen.ts --bundle --platform=node --format=esm --outfile=tools/.gen.mjs && node tools/.gen.mjs
 */
import fs from 'node:fs';
import { BOX_H, starts, trickiness, type Line, type Sky, type Star } from '../src/game/sim';

type T = { id: string; stars: [number, number]; lines: [number, number]; comets: [number, number]; doubles: [number, number]; trick: [number, number]; seed: number };
const t = (id: string, stars: [number, number], lines: [number, number], comets: [number, number], doubles: [number, number], trick: [number, number], seed: number): T => ({ id, stars, lines, comets, doubles, trick, seed });
const TEMPLATES: T[] = [
  t('f1', [4, 5], [4, 5], [0, 0], [0, 0], [0, 0.05], 1), t('f2', [5, 6], [6, 7], [0, 0], [0, 0], [0.1, 0.35], 2), t('f3', [6, 7], [7, 9], [0, 0], [0, 0], [0.2, 0.45], 3), t('f4', [6, 8], [8, 10], [0, 0], [0, 0], [0.3, 0.55], 4),
  t('f5', [7, 8], [9, 11], [0, 0], [0, 0], [0.4, 0.62], 5), t('f6', [7, 9], [10, 12], [0, 0], [0, 0], [0.45, 0.7], 6), t('f7', [8, 9], [11, 13], [0, 0], [0, 0], [0.5, 0.75], 7), t('f8', [8, 10], [12, 14], [0, 0], [0, 0], [0.55, 0.8], 8),
  t('m1', [5, 6], [6, 8], [2, 2], [0, 0], [0.2, 0.5], 11), t('m2', [6, 7], [8, 9], [2, 3], [0, 0], [0.3, 0.6], 12), t('m3', [6, 8], [9, 10], [3, 3], [0, 0], [0.4, 0.65], 13), t('m4', [7, 8], [10, 11], [3, 4], [0, 0], [0.45, 0.7], 14),
  t('m5', [7, 9], [11, 12], [3, 4], [0, 0], [0.5, 0.75], 15), t('m6', [8, 9], [12, 13], [4, 5], [0, 0], [0.55, 0.8], 16), t('m7', [8, 10], [12, 14], [4, 5], [0, 0], [0.6, 0.85], 17), t('m8', [9, 10], [13, 15], [5, 6], [0, 0], [0.62, 0.88], 18),
  t('d1', [5, 6], [7, 8], [0, 0], [1, 1], [0.25, 0.55], 21), t('d2', [6, 7], [8, 10], [0, 1], [1, 2], [0.35, 0.6], 22), t('d3', [6, 8], [10, 11], [1, 2], [2, 2], [0.4, 0.68], 23), t('d4', [7, 8], [11, 12], [1, 2], [2, 3], [0.45, 0.72], 24),
  t('d5', [7, 9], [12, 13], [2, 3], [2, 3], [0.5, 0.78], 25), t('d6', [8, 9], [13, 14], [2, 3], [3, 3], [0.55, 0.82], 26), t('d7', [8, 10], [14, 15], [3, 4], [3, 4], [0.6, 0.86], 27), t('d8', [9, 10], [15, 17], [3, 4], [3, 4], [0.62, 0.9], 28),
];
function rng(seed: number) { let s = Math.imul(seed + 0x9e3779b9, 2654435761) >>> 0 || 1; for (let i = 0; i < 8; i++) { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; } return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

const cross = (p: Star, q: Star, r: Star, s: Star) => {
  const d = (a: Star, b: Star, c: Star) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  return d(p, q, r) * d(p, q, s) < 0 && d(r, s, p) * d(r, s, q) < 0;
};
const segDist = (p: Star, a: Star, b: Star) => { const vx = b.x - a.x, vy = b.y - a.y, k = Math.max(0, Math.min(1, ((p.x - a.x) * vx + (p.y - a.y) * vy) / (vx * vx + vy * vy))); return Math.hypot(a.x + vx * k - p.x, a.y + vy * k - p.y); };
const ang = (a: Star, b: Star) => Math.atan2(b.y - a.y, b.x - a.x);

function attempt(T: T, rnd: () => number) {
  const ri = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));
  // stars, spaced
  const n = ri(T.stars[0], T.stars[1]) + 3, pts: Star[] = [], minD = n > 10 ? 0.19 : 0.22;
  for (let k = 0; k < 4000 && pts.length < n; k++) { const p = { x: 0.08 + rnd() * 0.84, y: 0.08 + rnd() * (BOX_H - 0.16) }; if (pts.every((q) => Math.hypot(q.x - p.x, q.y - p.y) > minD)) pts.push(p); }
  // candidate lines: short, not crossing, not grazing a star, not at a narrow angle to another at the same star
  const pairs: [number, number, number][] = [];
  for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) { const d = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y); if (d < 0.46) pairs.push([i, j, d]); }
  pairs.sort((a, b) => a[2] - b[2] + (rnd() - 0.5) * 0.08);
  const cand: [number, number][] = [];
  const narrow = (i: number, j: number) => cand.some(([a, b]) => {
    const share = a === i || b === i ? i : a === j || b === j ? j : -1; if (share < 0) return false;
    const o1 = share === i ? j : i, o2 = a === share ? b : a;
    let d = Math.abs(ang(pts[share], pts[o1]) - ang(pts[share], pts[o2])); if (d > Math.PI) d = 2 * Math.PI - d;
    return d < 0.5;
  });
  for (const [i, j] of pairs) {
    if (cand.some(([a, b]) => a !== i && a !== j && b !== i && b !== j && cross(pts[i], pts[j], pts[a], pts[b]))) continue;
    if (pts.some((p, k) => k !== i && k !== j && segDist(p, pts[i], pts[j]) < 0.075)) continue;
    if (narrow(i, j)) continue;
    cand.push([i, j]);
  }
  // a random walk over the candidates
  const L = ri(T.lines[0], T.lines[1]), maxUse = T.doubles[1] > 0 ? 2 : 1, use = new Map<string, number>();
  const k2 = (a: number, b: number) => (a < b ? `${a},${b}` : `${b},${a}`);
  let at = Math.floor(rnd() * pts.length); const walk: [number, number][] = [];
  for (let s = 0; s < L; s++) {
    const opts = cand.filter(([a, b]) => (a === at || b === at) && (use.get(k2(a, b)) ?? 0) < maxUse);
    if (!opts.length) return null;
    // prefer fresh lines; double back only now and then
    const fresh = opts.filter(([a, b]) => !use.has(k2(a, b))), pool = fresh.length && rnd() < 0.82 ? fresh : opts;
    const [a, b] = pool[Math.floor(rnd() * pool.length)], to = a === at ? b : a;
    use.set(k2(a, b), (use.get(k2(a, b)) ?? 0) + 1); walk.push([at, to]); at = to;
  }
  const doubles = [...use.values()].filter((v) => v === 2).length;
  if (doubles < T.doubles[0] || doubles > T.doubles[1]) return null;
  // the sky: only the stars the walk touched
  const touched = [...new Set(walk.flat())].sort((a, b) => a - b), idx = new Map(touched.map((s, i) => [s, i]));
  if (touched.length < T.stars[0] || touched.length > T.stars[1]) return null;
  const stars = touched.map((s) => ({ x: +pts[s].x.toFixed(4), y: +pts[s].y.toFixed(4) }));
  const lines: Line[] = []; const seen = new Map<string, number>();
  for (const [a, b] of walk) {
    const k = k2(a, b);
    if (seen.has(k)) { lines[seen.get(k)!].times = 2; continue; }
    seen.set(k, lines.length); lines.push({ a: idx.get(a)!, b: idx.get(b)!, times: 1, dir: 1 });
  }
  // comets: some single lines become one-way, the way the walk went; the rest go either way
  const singles = lines.map((l, i) => [l, i] as const).filter(([l]) => l.times === 1).map(([, i]) => i).sort(() => rnd() - 0.5);
  const nc = ri(T.comets[0], T.comets[1]); if (singles.length < nc) return null;
  const comet = new Set(singles.slice(0, nc));
  lines.forEach((l, i) => { if (l.times === 2 || !comet.has(i)) delete l.dir; });
  // stars that only a single line touches are fine; stars with no line can't exist here. Spread the sky to fill the box.
  const xs = stars.map((s) => s.x), ys = stars.map((s) => s.y), w = Math.max(...xs) - Math.min(...xs), h = Math.max(...ys) - Math.min(...ys);
  if (w < 0.45 || h < 0.45) return null;
  const k = Math.min(0.84 / w, (BOX_H - 0.16) / h, 1.6), cx = (Math.max(...xs) + Math.min(...xs)) / 2, cy = (Math.max(...ys) + Math.min(...ys)) / 2;
  for (const s of stars) { s.x = +(0.5 + (s.x - cx) * k).toFixed(4); s.y = +(BOX_H / 2 + (s.y - cy) * k).toFixed(4); }
  const sky: Sky = { stars, lines };
  const tr = trickiness(sky, rng(T.seed * 31 + 7), 600);
  if (tr < T.trick[0] || tr > T.trick[1]) return null;
  return { ...sky, trick: +tr.toFixed(3), starts: starts(sky).length };
}

const only = process.argv[2] ? process.argv[2].split(',') : null;
const file = new URL('../src/game/skies.json', import.meta.url);
const out: Record<string, unknown> = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
for (const T of TEMPLATES) {
  if (only && !only.includes(T.id)) continue;
  const rnd = rng(T.seed * 7919);
  let got = null, tries = 0;
  while (!got && tries < 200000) { tries++; got = attempt(T, rnd); }
  if (!got) { console.log(T.id, 'NONE'); continue; }
  out[T.id] = got;
  console.log(T.id, 'tries', tries, 'stars', got.stars.length, 'lines', got.lines.length, 'doubles', got.lines.filter((l) => l.times === 2).length, 'comets', got.lines.filter((l) => l.dir).length, 'trick', got.trick, 'starts', got.starts);
}
fs.writeFileSync(file, JSON.stringify(out) + '\n');
