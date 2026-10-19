import { describe, expect, it } from 'vitest';
import { begin, done, fresh, nexts, solve, starsFor, starts, step, stuck, total, undo, type Sky } from './sim';
import { CHAPTERS, LEVELS, levelIndex } from './levels';
import { freshSave, isUnlocked, parseSave, recordResult, totalStars } from '../state/save';

const seg = (s: Sky, i: number) => [s.stars[s.lines[i].a], s.stars[s.lines[i].b]] as const;
const cross = (p: { x: number; y: number }, q: { x: number; y: number }, r: { x: number; y: number }, t: { x: number; y: number }) => {
  const d = (a: typeof p, b: typeof p, c: typeof p) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  return d(p, q, r) * d(p, q, t) < 0 && d(r, t, p) * d(r, t, q) < 0;
};

describe('charts', () => {
  it('has 24 constellations in three chapters of eight, with unique ids and names', () => {
    expect(LEVELS).toHaveLength(24); expect(CHAPTERS).toHaveLength(3);
    for (let c = 0; c < 3; c++) expect(LEVELS.filter((l) => l.chapter === c)).toHaveLength(8);
    expect(new Set(LEVELS.map((l) => l.id)).size).toBe(24); expect(new Set(LEVELS.map((l) => l.name)).size).toBe(24);
    expect(levelIndex(LEVELS[9].id)).toBe(9);
  });
  it('comets arrive in the second chapter, double lines in the third', () => {
    expect(LEVELS.filter((l) => l.chapter === 0).every((l) => l.lines.every((x) => !x.dir && x.times === 1))).toBe(true);
    expect(LEVELS.filter((l) => l.chapter === 1).every((l) => l.lines.some((x) => x.dir) && l.lines.every((x) => x.times === 1))).toBe(true);
    expect(LEVELS.filter((l) => l.chapter === 2).every((l) => l.lines.some((x) => x.times === 2))).toBe(true);
  });
  it('trickiness rises through each chapter', () => {
    for (let c = 0; c < 3; c++) { const p = LEVELS.filter((l) => l.chapter === c).map((l) => l.trick); for (let i = 1; i < 8; i++) expect(p[i]).toBeGreaterThanOrEqual(p[i - 1]); }
  });
});

describe('every constellation', () => {
  for (const l of LEVELS) {
    it(`${l.id} ${l.name}: can be drawn in one thread, lines never cross, stars sit apart and inside the box`, () => {
      const path = solve(l)!; expect(path).not.toBeNull();
      let t = begin(fresh(l), path[0]); for (const s of path.slice(1)) { const n = step(l, t, s); expect(n).not.toBeNull(); t = n!; }
      expect(done(l, t)).toBe(true); expect(t.used.length).toBe(total(l));
      expect(starts(l).length).toBeGreaterThan(0);
      for (let i = 0; i < l.lines.length; i++) for (let j = i + 1; j < l.lines.length; j++) { const [a, b] = seg(l, i), [c, d] = seg(l, j); expect(cross(a, b, c, d)).toBe(false); }
      for (let i = 0; i < l.stars.length; i++) for (let j = i + 1; j < l.stars.length; j++) expect(Math.hypot(l.stars[i].x - l.stars[j].x, l.stars[i].y - l.stars[j].y)).toBeGreaterThan(0.12);
      for (const s of l.stars) { expect(s.x).toBeGreaterThanOrEqual(0); expect(s.x).toBeLessThanOrEqual(1); expect(s.y).toBeGreaterThanOrEqual(0); expect(s.y).toBeLessThanOrEqual(1.25); }
      expect(new Set(l.lines.map((x) => [x.a, x.b].sort().join(','))).size).toBe(l.lines.length);
      for (let i = 0; i < l.stars.length; i++) expect(l.lines.some((x) => x.a === i || x.b === i)).toBe(true);
    });
  }
});

describe('the thread', () => {
  // a triangle with a tail: 0-1, 1-2, 2-0, 2-3. Odd stars are 2 and 3.
  const s: Sky = { stars: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0.5, y: 1 }, { x: 0.5, y: 1.2 }], lines: [{ a: 0, b: 1, times: 1 }, { a: 1, b: 2, times: 1 }, { a: 2, b: 0, times: 1 }, { a: 2, b: 3, times: 1 }] };
  it('only begins where a whole thread exists', () => { expect(starts(s).sort()).toEqual([2, 3]); });
  it('traces along lines only, each once', () => {
    let t = begin(fresh(s), 3);
    expect(step(s, t, 0)).toBeNull();
    t = step(s, t, 2)!; expect(nexts(s, t).sort()).toEqual([0, 1]);
    t = step(s, t, 0)!; t = step(s, t, 1)!; t = step(s, t, 2)!;
    expect(done(s, t)).toBe(true);
  });
  it('gets stuck from the wrong start, and undo takes a line back', () => {
    let t = begin(fresh(s), 0); t = step(s, t, 2)!; t = step(s, t, 3)!;
    expect(stuck(s, t)).toBe(true);
    t = undo(t); expect(t.at).toBe(2); expect(stuck(s, t)).toBe(false);
    expect(undo(undo(t)).at).toBeNull();
  });
  it('comet lines run one way; double lines take two passes', () => {
    const c: Sky = { stars: s.stars.slice(0, 2), lines: [{ a: 0, b: 1, times: 2 }] };
    let t = begin(fresh(c), 0); t = step(c, t, 1)!; t = step(c, t, 0)!; expect(done(c, t)).toBe(true);
    const d: Sky = { stars: s.stars.slice(0, 2), lines: [{ a: 0, b: 1, times: 1, dir: 1 }] };
    expect(step(d, begin(fresh(d), 1), 0)).toBeNull(); expect(step(d, begin(fresh(d), 0), 1)).not.toBeNull();
    expect(starts(d)).toEqual([0]);
  });
  it('solves from the middle of a thread, or reports that it cannot', () => {
    let t = begin(fresh(s), 0); t = step(s, t, 2)!; t = step(s, t, 3)!;
    expect(solve(s, t)).toBeNull();
    expect(solve(s, undo(t))).toBeNull();
    expect(solve(s, fresh(s))![0]).toBeGreaterThanOrEqual(2);
  });
});

describe('stars and save', () => {
  it('stars follow slips and hints', () => { expect(starsFor(0, false)).toBe(3); expect(starsFor(0, true)).toBe(2); expect(starsFor(2, false)).toBe(2); expect(starsFor(3, false)).toBe(1); });
  it('records the fewest slips and unlocks the next chart', () => {
    let v = freshSave(); expect(isUnlocked(v, 1)).toBe(false);
    v = recordResult(v, LEVELS[0].id, 2, 1); v = recordResult(v, LEVELS[0].id, 3, 0);
    expect(v.stars[LEVELS[0].id]).toBe(3); expect(v.best[LEVELS[0].id]).toBe(0); expect(isUnlocked(v, 1)).toBe(true); expect(totalStars(v)).toBe(3);
  });
  it('parses corrupt saves safely', () => { expect(parseSave('{')).toEqual(freshSave()); });
});
