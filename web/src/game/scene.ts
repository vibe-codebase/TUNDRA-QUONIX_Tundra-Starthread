import Phaser from 'phaser';
import * as A from './art';
import { LEVELS, type Level } from './levels';
import { BOX_H, begin, done, fresh, lineFor, nexts, solve, starsFor, step, stuck, total, undo as undoThread, type Thread } from './sim';
import { sound } from '../audio/sound';

export type Result = { slips: number; stars: number; hinted: boolean };
export type Finish = { level: Level; result: Result };
type Hooks = { onFinish?: (f: Finish) => void; onFirstAction?: () => void; onHaptic?: (s: 'light' | 'medium' | 'success' | 'warning') => void };
export type HudState = { phase: 'play' | 'done'; traced: number; total: number; stuck: boolean; slips: number; canUndo: boolean; hints: number; msg: string; msgId: number };

/** Bridge between React and the Phaser scene. */
export const night = {
  hooks: {} as Hooks,
  scene: null as SkyScene | null,
  reducedMotion: false,
  show(mode: 'menu' | 'play', level: Level) { this.scene?.show(mode, level); },
  setPaused(p: boolean) { this.scene?.setPaused(p); },
  state(): HudState | null { return this.scene?.hudState() ?? null; },
  undo() { this.scene?.undo(); },
  hint() { this.scene?.hint(); },
  restart() { this.scene?.restart(); },
  debug() { return this.scene?.debugState(); },
  /** QA only: CSS position of a star. */
  qaStar(i: number) { return this.scene?.qaStar(i); },
  /** QA only: a whole thread from here. */
  solvePath() { return this.scene ? solve(this.scene.level, this.scene.thread) : null; },
};
(window as unknown as { __night: typeof night }).__night = night;

const VIEW_W = 360;
const SHOWCASE = ['d8', 'm8', 'f8', 'd5', 'm6'];
const DRAW_T = 0.17;

export class SkyScene extends Phaser.Scene {
  level: Level = LEVELS[0];
  thread: Thread = { at: null, path: [], used: [], traced: [] };
  private mode: 'menu' | 'play' = 'menu';
  private phase: 'play' | 'done' = 'play';
  private paused = false;
  private acted = false;
  private texSeq = 0;
  private r = 2;
  private viewW = VIEW_W; private viewH = 700;
  private k = 300; private ox = 0; private oy = 0;
  private pts: { x: number; y: number }[] = [];
  private starImgs: Phaser.GameObjects.Image[] = [];
  private twinkles: { img: Phaser.GameObjects.Image; ph: number; sp: number }[] = [];
  private lineG!: Phaser.GameObjects.Graphics; private litG!: Phaser.GameObjects.Graphics; private fx!: Phaser.GameObjects.Graphics;
  private nameText: Phaser.GameObjects.Text | null = null;
  private drawnAt: number[] = []; // when each traced step began to draw
  private starT: number[] = []; // when each star last rang
  private finger: { x: number; y: number } | null = null;
  private slips = 0; private hints = 0;
  private stuckT = -9; private hintStar: number | null = null; private hintT = -9; private winT = -9;
  private msg = ''; private msgId = 0;
  private clock = 0;
  private demo: { path: number[]; k: number; wait: number } | null = null;
  private shoot: { x: number; y: number; vx: number; vy: number; t: number } | null = null;

  constructor() { super('sky'); }

  create() {
    night.scene = this;
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.down(p));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.move(p));
    this.input.on('pointerup', () => this.up());
    this.input.on('pointerupoutside', () => this.up());
    this.scale.on('resize', () => this.rebuild());
    this.show('menu', LEVELS.find((l) => l.id === SHOWCASE[0])!);
  }
  isMenu() { return this.mode === 'menu'; }
  setPaused(p: boolean) { this.paused = p; if (p) { this.finger = null; sound.humAt(null); } }
  hudState(): HudState {
    return { phase: this.phase, traced: this.thread.used.length, total: total(this.level), stuck: stuck(this.level, this.thread), slips: this.slips, canUndo: this.thread.at !== null && this.phase === 'play', hints: this.hints, msg: this.msg, msgId: this.msgId };
  }
  debugState() { return { ...this.hudState(), mode: this.mode, at: this.thread.at, path: this.thread.path.slice() }; }
  qaStar(i: number) {
    const z = this.cameras.main.zoom, kk = (this.game.canvas.clientWidth || VIEW_W) / this.scale.width;
    return { x: this.pts[i].x * z * kk, y: this.pts[i].y * z * kk };
  }
  private say(m: string) { this.msg = m; this.msgId++; }

  /** A timer that only fires if the scene has not been shown anew since: a finished demo must never bring the menu back over a new game. */
  private gen = 0;
  private later(ms: number, fn: () => void) { const g = this.gen; this.time.delayedCall(ms, () => { if (g === this.gen) fn(); }); }
  show(mode: 'menu' | 'play', level: Level) {
    this.mode = mode; this.level = level;
    this.gen++;
    this.paused = false; this.acted = false; this.phase = 'play';
    this.thread = fresh(level); this.drawnAt = []; this.starT = level.stars.map(() => -9);
    this.slips = 0; this.hints = 0; this.msg = ''; this.hintStar = null; this.stuckT = -9; this.winT = -9; this.finger = null; this.shoot = null;
    this.demo = mode === 'menu' ? { path: solve(level) ?? [], k: 0, wait: 1.2 } : null;
    this.rebuild();
  }
  restart() { if (this.mode === 'play' && this.phase === 'play') { this.thread = fresh(this.level); this.drawnAt = []; this.hintStar = null; sound.undo(); } }

  // ── layout ────────────────────────────────────────────────────────────
  private tex(prefix: string, c: HTMLCanvasElement) { const key = `${prefix}-${++this.texSeq}`; this.textures.addCanvas(key, c); return key; }
  private rebuild() {
    const stale = this.textures.getTextureKeys().filter((k) => /-\d+$/.test(k));
    this.tweens.killAll();
    this.children.removeAll(true);
    if (stale.length) this.events.once('postrender', () => stale.forEach((k) => this.textures.exists(k) && this.textures.remove(k)));
    const pw = this.scale.width, ph = this.scale.height, dpr = Math.min(2, window.devicePixelRatio || 1);
    const zoom = Math.min(pw / VIEW_W, ph / 640);
    this.r = Math.min(2, Math.max(1, zoom));
    this.viewW = pw / zoom; this.viewH = ph / zoom;
    this.cameras.main.setZoom(zoom).centerOn(this.viewW / 2, this.viewH / 2);
    const css = zoom / dpr, play = this.mode === 'play', W = this.viewW, H = this.viewH, l = this.level, m = A.MOODS[l.chapter], r = this.r;
    const top = (play ? 74 : 236) / css, bottom = Math.max((play ? 100 : 196) / css, H * 0.15);
    this.add.image(0, 0, this.tex('sky', A.sky(m, W, H, Math.min(r, 1.5), 3 + l.chapter * 7))).setOrigin(0, 0).setScale(1 / Math.min(r, 1.5));
    // twinkling stars of the backdrop
    const tw = this.tex('tw', A.glow(5, '230,236,255', r, 0.9));
    this.twinkles = Array.from({ length: 26 }, (_, i) => ({ img: this.add.image(A.hash(i, 71) * W, A.hash(i, 72) * H * 0.8, tw).setScale((0.5 + A.hash(i, 73) * 0.7) / r).setBlendMode(Phaser.BlendModes.ADD), ph: A.hash(i, 74) * 6.28, sp: 0.6 + A.hash(i, 75) * 1.8 }));
    // the constellation's box
    const availH = H - top - bottom, availW = W - 44;
    this.k = Math.min(availW, availH / BOX_H, 420);
    this.ox = (W - this.k) / 2; this.oy = top + (availH - this.k * BOX_H) / 2;
    this.pts = l.stars.map((s) => ({ x: this.ox + s.x * this.k, y: this.oy + s.y * this.k }));
    this.lineG = this.add.graphics().setDepth(2);
    this.litG = this.add.graphics().setDepth(3).setBlendMode(Phaser.BlendModes.ADD);
    const deg = l.stars.map((_, i) => l.lines.reduce((a, ln) => a + (ln.a === i || ln.b === i ? ln.times : 0), 0));
    this.starImgs = this.pts.map((p, i) => this.add.image(p.x, p.y, this.tex('st', A.star(16 + deg[i] * 2.5, A.TINTS[i % A.TINTS.length], r))).setScale(1 / r).setDepth(4).setBlendMode(Phaser.BlendModes.ADD));
    this.fx = this.add.graphics().setDepth(5);
    const nameY = this.oy + this.k * BOX_H + 4, nameFits = !play || nameY + 34 < H - bottom + 12;
    this.nameText = this.add.text(W / 2, play ? nameY : top - 30, l.name, { fontFamily: 'Marcellus, serif', fontSize: `${26 * r}px`, color: '#f4ecd8' }).setOrigin(0.5, 0).setScale(1 / r).setDepth(6).setAlpha(0).setVisible(nameFits);
    if (!play) this.nameText.setPosition(W / 2, H - bottom + 26).setOrigin(0.5, 0).setFontSize(20 * r);
  }

  // ── input ─────────────────────────────────────────────────────────────
  private starNear(x: number, y: number, rad: number) {
    let best = -1, bd = rad;
    this.pts.forEach((p, i) => { const d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; best = i; } });
    return best;
  }
  private snap() { return Math.max(24, this.k * 0.075); }
  private down(p: Phaser.Input.Pointer) {
    if (this.mode !== 'play' || this.paused || this.phase !== 'play') return;
    const w = this.cameras.main.getWorldPoint(p.x, p.y), s = this.starNear(w.x, w.y, this.snap() * 1.15);
    const t = this.thread;
    if (t.at === null || t.used.length === 0) {
      // choose (or change) where the thread begins
      if (s >= 0) { this.firstAction(); this.thread = begin(t, s); this.ring(s, 0.05); this.hintStar = null; harp(this, 'light'); }
      else if (t.at === null) return;
    } else if (s >= 0 && s !== t.at) {
      // a tap on a star the thread can reach
      this.firstAction(); this.tryStep(s);
    }
    this.finger = { x: w.x, y: w.y };
  }
  private move(p: Phaser.Input.Pointer) {
    if (!this.finger || this.mode !== 'play' || this.paused || this.phase !== 'play') return;
    const w = this.cameras.main.getWorldPoint(p.x, p.y); this.finger = { x: w.x, y: w.y };
    const t = this.thread; if (t.at === null) return;
    const s = this.starNear(w.x, w.y, this.snap());
    if (s >= 0 && s !== t.at && lineFor(this.level, t, t.at, s) >= 0) this.tryStep(s);
    sound.humAt(this.degreeAt(w.y));
  }
  private up() { this.finger = null; sound.humAt(null); }
  private firstAction() { if (!this.acted) { this.acted = true; night.hooks.onFirstAction?.(); } }
  private tryStep(s: number) {
    const t = this.thread; if (t.at === null) return;
    const next = step(this.level, t, s);
    if (!next) {
      const ln = this.level.lines.findIndex((l) => (l.a === t.at && l.b === s) || (l.b === t.at && l.a === s));
      if (ln >= 0 && this.level.lines[ln].dir && t.traced[ln] < this.level.lines[ln].times && this.msg !== 'That comet line runs the other way.') this.say('That comet line runs the other way.');
      return;
    }
    this.thread = next; this.drawnAt[next.used.length - 1] = this.clock; this.hintStar = null;
    this.ring(s, 0.055); harp(this, 'light');
    if (done(this.level, next)) this.win();
    else if (stuck(this.level, next)) {
      this.slips++; this.stuckT = this.clock; this.finger = null; sound.humAt(null);
      this.say('Nowhere left to go from this star. Undo, or begin again.');
      this.later(140, () => sound.stuck()); harp(this, 'warning');
    }
  }
  private degreeAt(y: number) { return Math.round((1 - (y - this.oy) / (this.k * BOX_H)) * 10); }
  private ring(i: number, vol: number) { sound.star(this.degreeAt(this.pts[i].y), vol); this.starT[i] = this.clock; }
  undo() {
    if (this.mode !== 'play' || this.phase !== 'play' || this.thread.at === null) return;
    this.thread = undoThread(this.thread); this.drawnAt.length = this.thread.used.length; this.hintStar = null; sound.undo();
  }
  hint() {
    if (this.mode !== 'play' || this.phase !== 'play') return;
    let t = this.thread, undone = 0;
    // if the thread can no longer be finished, take it back to where it still can
    while (t.used.length && !solve(this.level, t)) { t = undoThread(t); undone++; }
    if (t.at !== null && !t.used.length && !solve(this.level, t)) { t = fresh(this.level); undone++; }
    const path = solve(this.level, t); if (!path) return;
    this.hints++; this.thread = t; this.drawnAt.length = t.used.length;
    this.hintStar = path[0]; this.hintT = this.clock;
    if (t.at === null) this.say(undone ? 'That start can’t light every line. Begin at the glowing star.' : 'Begin at the glowing star.');
    else this.say(undone ? `Took back ${undone} ${undone === 1 ? 'line' : 'lines'}. Go on to the glowing star.` : 'Go on to the glowing star.');
    sound.hint();
  }
  private win() {
    this.phase = 'done'; this.winT = this.clock; this.finger = null; sound.humAt(null);
    const st = starsFor(this.slips, this.hints > 0);
    const degs = this.thread.path.map((i) => this.degreeAt(this.pts[i].y)), gap = Math.max(0.09, Math.min(0.17, 2.2 / degs.length));
    this.thread.path.forEach((i, k) => this.later(150 + k * gap * 1000, () => { this.starT[i] = this.clock; }));
    sound.play(degs, gap); sound.chord(degs, 0.25 + degs.length * gap);
    night.hooks.onHaptic?.('success');
    if (this.nameText) this.tweens.add({ targets: this.nameText, alpha: 1, duration: 1200, delay: 300 + degs.length * gap * 1000 });
    const W = this.viewW; this.later(400 + degs.length * gap * 1000, () => { this.shoot = { x: W * 0.95, y: this.viewH * 0.08, vx: -W * 1.1, vy: this.viewH * 0.35, t: 0 }; });
    const end = (1.6 + degs.length * gap) * 1000;
    if (this.mode === 'play') this.later(end + 600, () => night.hooks.onFinish?.({ level: this.level, result: { slips: this.slips, stars: st, hinted: this.hints > 0 } }));
    else this.later(end + 2600, () => { const i = (SHOWCASE.indexOf(this.level.id) + 1) % SHOWCASE.length; this.show('menu', LEVELS.find((x) => x.id === SHOWCASE[i])!); });
  }

  // ── drawing ───────────────────────────────────────────────────────────
  update(_t: number, dms: number) {
    const dt = Math.min(0.05, dms / 1000);
    if (!this.paused) this.clock += dt;
    if (this.mode === 'menu') this.runDemo(dt);
    const m = A.MOODS[this.level.chapter], reduced = night.reducedMotion;
    for (const tw of this.twinkles) tw.img.setAlpha(reduced ? 0.6 : 0.35 + 0.65 * Math.abs(Math.sin(this.clock * tw.sp + tw.ph)));
    const l = this.level, t = this.thread, lg = this.lineG, lit = this.litG, fx = this.fx;
    lg.clear(); lit.clear(); fx.clear();
    // how many strands of each line are lit, and how far the newest is drawn
    const shown = l.lines.map(() => 0), partial = new Map<number, { k: number; from: number; e: number }>();
    t.used.forEach((li, k) => {
      const e = reduced ? 1 : Math.min(1, (this.clock - (this.drawnAt[k] ?? -9)) / DRAW_T);
      if (e >= 1) shown[li]++; else partial.set(li, { k: shown[li], from: t.path[k], e });
    });
    const flare = this.phase === 'done' ? Math.max(0, 1 - (this.clock - this.winT) / 2.2) : 0;
    const stuckA = Math.max(0, 1 - (this.clock - this.stuckT) / 0.9);
    l.lines.forEach((ln, i) => {
      const a = this.pts[ln.a], b = this.pts[ln.b], len = Math.hypot(b.x - a.x, b.y - a.y), ux = (b.x - a.x) / len, uy = (b.y - a.y) / len;
      const strands = ln.times === 2 ? [-3.2, 3.2] : [0];
      // leave the stars' cores clear
      const pad = 9, ax = a.x + ux * pad, ay = a.y + uy * pad, bx = b.x - ux * pad, by = b.y - uy * pad;
      strands.forEach((off, si) => {
        const px = -uy * off, py = ux * off;
        const isLit = si < shown[i], part = partial.get(i), isPart = part && part.k === si;
        if (!isLit) {
          // untraced: a fine dotted line
          const n = Math.max(2, Math.floor((len - pad * 2) / 7));
          lg.fillStyle(m.line, 0.42);
          for (let d = 0; d <= n; d++) { const f = d / n; lg.fillCircle(ax + (bx - ax) * f + px, ay + (by - ay) * f + py, 0.95); }
        }
        if (isLit || isPart) {
          let x1 = ax + px, y1 = ay + py, x2 = bx + px, y2 = by + py;
          if (isPart) { const fwd = part!.from === ln.a; if (!fwd) { [x1, y1, x2, y2] = [x2, y2, x1, y1]; } x2 = x1 + (x2 - x1) * part!.e; y2 = y1 + (y2 - y1) * part!.e; }
          const col = stuckA > 0 ? Phaser.Display.Color.Interpolate.ColorWithColor(Phaser.Display.Color.ValueToColor(m.lit), Phaser.Display.Color.ValueToColor(0xff8a7a), 1, stuckA * (0.5 + 0.5 * Math.sin(this.clock * 30))) : null;
          const c = col ? Phaser.Display.Color.GetColor(col.r, col.g, col.b) : m.lit;
          lit.lineStyle(8, c, 0.1 + flare * 0.2); lit.lineBetween(x1, y1, x2, y2);
          lit.lineStyle(3.4, c, 0.3 + flare * 0.3); lit.lineBetween(x1, y1, x2, y2);
          lit.lineStyle(1.5, 0xffffff, 0.95); lit.lineBetween(x1, y1, x2, y2);
        }
      });
      // comet lines: chevrons pointing the way
      if (ln.dir) {
        const dx = ux * ln.dir, dy = uy * ln.dir, litAll = shown[i] >= ln.times;
        for (const f of [0.38, 0.5, 0.62]) {
          const cx = a.x + (b.x - a.x) * f, cy = a.y + (b.y - a.y) * f, s = 5.5;
          const g2 = litAll ? lit : lg; g2.lineStyle(1.6, litAll ? 0xffffff : 0xffd890, litAll ? 0.9 : 0.75);
          g2.beginPath(); g2.moveTo(cx - dx * s - dy * s, cy - dy * s + dx * s); g2.lineTo(cx, cy); g2.lineTo(cx - dx * s + dy * s, cy - dy * s - dx * s); g2.strokePath();
        }
      }
    });
    // stars: those with lines still to trace shine fully; spent ones dim a little; a rung star blooms
    this.starImgs.forEach((img, i) => {
      const left = l.lines.some((ln, li) => (ln.a === i || ln.b === i) && t.traced[li] < ln.times);
      const rung = Math.max(0, 1 - (this.clock - this.starT[i]) / 0.7), tw = reduced ? 0 : Math.sin(this.clock * 2.3 + i * 1.7) * 0.04;
      img.setScale((1 + rung * 0.35 + tw + flare * 0.15) / this.r).setAlpha(left || this.phase === 'done' || t.at === null ? 1 : 0.7);
    });
    // the thread's head, the finger's guide line, and hints
    if (t.at !== null && this.phase === 'play') {
      const h = this.pts[t.at], pulse = reduced ? 0.5 : 0.5 + 0.5 * Math.sin(this.clock * 5);
      fx.lineStyle(1.6, stuck(l, t) ? 0xff9a8a : 0xfff0c8, 0.55 + pulse * 0.35); fx.strokeCircle(h.x, h.y, 13 + pulse * 3);
      if (this.finger && !stuck(l, t)) { fx.lineStyle(1.2, 0xfff0c8, 0.35); fx.lineBetween(h.x, h.y, this.finger.x, this.finger.y); fx.fillStyle(0xfff0c8, 0.5); fx.fillCircle(this.finger.x, this.finger.y, 3); }
      // where the thread can go next: a faint ring on each reachable star
      if (!this.finger && this.mode === 'play') for (const n of nexts(l, t)) { const q = this.pts[n]; fx.lineStyle(1, 0xfff0c8, 0.18 + pulse * 0.12); fx.strokeCircle(q.x, q.y, 11); }
    }
    const he = this.clock - this.hintT;
    if (this.hintStar !== null && he < 6 && this.phase === 'play') {
      const q = this.pts[this.hintStar], a = Math.min(1, he * 3) * Math.min(1, (6 - he) * 2) * (0.72 + 0.28 * Math.sin(he * 6));
      fx.fillStyle(0xffe39a, a * 0.16); fx.fillCircle(q.x, q.y, 24);
      fx.lineStyle(2.4, 0xffe39a, a); fx.strokeCircle(q.x, q.y, 18 + Math.sin(he * 6) * 3);
      if (t.at !== null) { const h = this.pts[t.at]; fx.lineStyle(2, 0xffe39a, a * 0.7); fx.lineBetween(h.x + (q.x - h.x) * 0.15, h.y + (q.y - h.y) * 0.15, h.x + (q.x - h.x) * 0.8, h.y + (q.y - h.y) * 0.8); }
    }
    // a shooting star when a constellation is finished
    if (this.shoot) {
      const s = this.shoot; s.t += dt; const e = s.t / 0.9;
      if (e >= 1) this.shoot = null;
      else { const x = s.x + s.vx * e, y = s.y + s.vy * e, tl = 0.18; for (let k = 0; k < 8; k++) { const f = e - (k / 8) * tl; if (f < 0) break; fx.fillStyle(0xffffff, (1 - k / 8) * (1 - e) * 0.9); fx.fillCircle(s.x + s.vx * f, s.y + s.vy * f, 1.8 - k * 0.18); } fx.fillStyle(0xffffff, 1 - e); fx.fillCircle(x, y, 2.2); }
    }
  }

  // ── attract mode ──────────────────────────────────────────────────────
  private runDemo(dt: number) {
    const d = this.demo; if (!d || this.phase !== 'play') return;
    d.wait -= dt; if (d.wait > 0) return;
    if (d.k === 0 && d.path.length) { this.thread = begin(this.thread, d.path[0]); this.starT[d.path[0]] = this.clock; d.k = 1; d.wait = 0.45; return; }
    if (d.k < d.path.length) { const nx = step(this.level, this.thread, d.path[d.k]); d.k++; if (nx) { this.thread = nx; this.drawnAt[nx.used.length - 1] = this.clock; this.starT[d.path[d.k - 1]] = this.clock; if (done(this.level, nx)) this.win(); } d.wait = 0.32; }
  }
}
function harp(s: SkyScene, k: 'light' | 'warning') { void s; night.hooks.onHaptic?.(k); }

export function startGame(parent: HTMLElement) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: '#070b1a',
    scale: { mode: Phaser.Scale.NONE, width: parent.clientWidth * dpr, height: parent.clientHeight * dpr, zoom: 1 / dpr },
    render: { antialias: true, pixelArt: false, powerPreference: 'high-performance' },
    audio: { noAudio: true },
    fps: { target: 60, smoothStep: false },
    input: { activePointers: 1 },
    scene: [SkyScene],
    banner: false,
  });
  const onResize = () => {
    const d = Math.min(window.devicePixelRatio || 1, 2);
    game.scale.setZoom(1 / d);
    game.scale.resize(parent.clientWidth * d, parent.clientHeight * d);
  };
  window.addEventListener('resize', onResize);
  return () => { window.removeEventListener('resize', onResize); game.destroy(true); };
}
