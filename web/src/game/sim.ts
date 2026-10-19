/**
 * Starthread: a constellation is a set of stars and the lines between them. Draw it in one unbroken thread: start at
 * any star and trace from star to star until every line is lit. A line can be traced only as many times as it is
 * drawn (once, or twice for a double line), and a comet line only the way its arrows point. If the thread reaches
 * a star with nothing left to trace while lines remain, it is stuck: undo, or begin again.
 * Coordinates are in a box 1 wide and BOX_H tall.
 */
export const BOX_H = 1.25;
export type Star = { x: number; y: number };
/** A line between stars a and b, traced `times` times; `dir` 1 means a to b only, -1 means b to a only. */
export type Line = { a: number; b: number; times: 1 | 2; dir?: 1 | -1 };
export type Sky = { stars: Star[]; lines: Line[] };
export type Thread = { at: number | null; path: number[]; used: number[]; traced: number[] };

export const fresh = (sky: Sky): Thread => ({ at: null, path: [], used: [], traced: sky.lines.map(() => 0) });
export const total = (sky: Sky) => sky.lines.reduce((a, l) => a + l.times, 0);
export const tracedCount = (t: Thread) => t.used.length;
export const done = (sky: Sky, t: Thread) => t.used.length === total(sky);

/** The line that can carry the thread from `from` to `to` now, or -1. */
export function lineFor(sky: Sky, t: Thread, from: number, to: number) {
  for (let i = 0; i < sky.lines.length; i++) {
    const l = sky.lines[i];
    if (t.traced[i] >= l.times) continue;
    if (l.a === from && l.b === to && l.dir !== -1) return i;
    if (l.b === from && l.a === to && l.dir !== 1) return i;
  }
  return -1;
}
/** Stars the thread can go to next. */
export function nexts(sky: Sky, t: Thread): number[] {
  if (t.at === null) return sky.stars.map((_, i) => i);
  const out: number[] = [];
  for (let i = 0; i < sky.lines.length; i++) {
    const l = sky.lines[i];
    if (t.traced[i] >= l.times) continue;
    if (l.a === t.at && l.dir !== -1 && !out.includes(l.b)) out.push(l.b);
    if (l.b === t.at && l.dir !== 1 && !out.includes(l.a)) out.push(l.a);
  }
  return out;
}
export function begin(t: Thread, star: number): Thread { return { at: star, path: [star], used: [], traced: t.traced.map(() => 0) }; }
/** Trace to `to`; null if no line goes there. */
export function step(sky: Sky, t: Thread, to: number): Thread | null {
  if (t.at === null) return null;
  const i = lineFor(sky, t, t.at, to); if (i < 0) return null;
  const traced = t.traced.slice(); traced[i]++;
  return { at: to, path: [...t.path, to], used: [...t.used, i], traced };
}
export function undo(t: Thread): Thread {
  if (!t.used.length) return { at: null, path: [], used: [], traced: t.traced.map(() => 0) };
  const traced = t.traced.slice(); traced[t.used[t.used.length - 1]]--;
  const path = t.path.slice(0, -1);
  return { at: path[path.length - 1], path, used: t.used.slice(0, -1), traced };
}
export const stuck = (sky: Sky, t: Thread) => t.at !== null && !done(sky, t) && nexts(sky, t).length === 0;
const key = (t: Thread) => `${t.at}|${t.traced.join('')}`;

/**
 * The rest of a full thread from here, as the stars to visit (with its start first when nothing is drawn yet), or
 * null if none exists. Depth-first, remembering positions already known to fail.
 */
export function solve(sky: Sky, t: Thread = fresh(sky), budget = 200000): number[] | null {
  const dead = new Set<string>(); let work = 0;
  const go = (s: Thread): number[] | null => {
    if (done(sky, s)) return [];
    if (++work > budget) return null;
    const k = key(s); if (dead.has(k)) return null;
    for (const n of nexts(sky, s)) { const r = go(step(sky, s, n)!); if (r) return [n, ...r]; }
    dead.add(k); return null;
  };
  if (t.at !== null) return go(t);
  for (const st of starts(sky)) { const r = go(begin(t, st)); if (r) return [st, ...r]; }
  return null;
}
/** Stars a whole thread can begin from, by the counting rule: in an undirected sky, the odd stars if there are two. */
export function starts(sky: Sky): number[] {
  const out: number[] = [];
  for (let i = 0; i < sky.stars.length; i++) {
    const s = begin(fresh(sky), i);
    if (sky.lines.some((l) => l.a === i || l.b === i) && solveFrom(sky, s)) out.push(i);
  }
  return out;
}
function solveFrom(sky: Sky, s: Thread) {
  const dead = new Set<string>(); let work = 0;
  const go = (x: Thread): boolean => {
    if (done(sky, x)) return true;
    if (++work > 100000) return false;
    const k = key(x); if (dead.has(k)) return false;
    for (const n of nexts(sky, x)) if (go(step(sky, x, n)!)) return true;
    dead.add(k); return false;
  };
  return go(s);
}
/** How often a thread made of random choices gets stuck, starting from a star where a whole thread is possible. */
export function trickiness(sky: Sky, rnd: () => number, n = 400) {
  const st = starts(sky); if (!st.length) return 1;
  let fail = 0;
  for (let k = 0; k < n; k++) {
    let t = begin(fresh(sky), st[Math.floor(rnd() * st.length)]);
    for (;;) { const ns = nexts(sky, t); if (!ns.length) break; t = step(sky, t, ns[Math.floor(rnd() * ns.length)])!; }
    if (!done(sky, t)) fail++;
  }
  return fail / n;
}
/** Stars: three for a thread that never got stuck and needed no hint, two for a slip or two, one otherwise. */
export function starsFor(stuckCount: number, hinted: boolean) { const s = stuckCount === 0 ? 3 : stuckCount <= 2 ? 2 : 1; return hinted ? Math.min(2, s) : s; }
