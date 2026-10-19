// Store icon, adaptive-icon layers, splash and feature graphic: a constellation drawn in one thread of light.
import * as A from '../src/game/art';

const M = A.MOODS[0], M2 = A.MOODS[2];
type P = [number, number];
/** A glowing thread through the points, in order; `upto` of the segments are lit, the rest dotted. */
function thread(g: CanvasRenderingContext2D, pts: P[], w: number, upto = pts.length - 1, tint = '255,226,160') {
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
    if (i < upto) {
      g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
      for (const [lw, a] of [[w * 6, 0.1], [w * 2.6, 0.3], [w, 1]] as const) { g.strokeStyle = lw === w ? 'rgba(255,255,255,0.95)' : `rgba(${tint},${a})`; g.lineWidth = lw; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); }
      g.restore();
    } else {
      const len = Math.hypot(x2 - x1, y2 - y1), n = Math.floor(len / (w * 6));
      g.fillStyle = 'rgba(200,212,255,0.5)'; for (let k = 0; k <= n; k++) { g.beginPath(); g.arc(x1 + (x2 - x1) * k / n, y1 + (y2 - y1) * k / n, w * 0.7, 0, Math.PI * 2); g.fill(); }
    }
  }
}
function stars(g: CanvasRenderingContext2D, pts: P[], s: number) { pts.forEach(([x, y], i) => { const c = A.star(s * (i % 3 === 0 ? 1.25 : 1), A.TINTS[i % A.TINTS.length], 1); g.save(); g.globalCompositeOperation = 'lighter'; g.drawImage(c, x - c.width / 2, y - c.height / 2); g.restore(); }); }
/** The bright head of the thread: a small comet. */
function head(g: CanvasRenderingContext2D, x: number, y: number, r: number) {
  const gl = g.createRadialGradient(x, y, 0, x, y, r * 3); gl.addColorStop(0, 'rgba(255,240,200,0.7)'); gl.addColorStop(1, 'rgba(255,240,200,0)'); g.fillStyle = gl; g.fillRect(x - r * 3, y - r * 3, r * 6, r * 6);
  g.strokeStyle = 'rgba(255,240,200,0.9)'; g.lineWidth = r * 0.18; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.stroke();
}

export function icon() {
  const { c, g } = A.canvas(1024, 1024);
  g.drawImage(A.sky(M, 1024, 1024, 1, 5), 0, 0);
  const v = g.createRadialGradient(512, 470, 100, 512, 470, 640); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(2,4,14,0.45)'); g.fillStyle = v; g.fillRect(0, 0, 1024, 1024);
  const pts: P[] = [[260, 700], [400, 330], [740, 270], [660, 640], [400, 330]];
  thread(g, [[660, 640], [260, 700]], 8, 0);
  thread(g, pts, 9, 4);
  stars(g, pts.slice(0, 4), 70);
  head(g, 400, 330, 36);
  return c;
}
export function adaptive() {
  const { c, g } = A.canvas(1024, 1024);
  const pts: P[] = [[330, 660], [430, 400], [680, 360], [620, 640], [430, 400]];
  thread(g, [[620, 640], [330, 660]], 6, 0); thread(g, pts, 7, 4); stars(g, pts.slice(0, 4), 54); head(g, 430, 400, 28);
  return c;
}
export function adaptiveBg() { const { c, g } = A.canvas(1024, 1024); g.drawImage(A.sky(M, 1024, 1024, 1, 5), 0, 0); return c; }
export function splash() {
  const W = 1284, H = 2778, { c, g } = A.canvas(W, H);
  g.drawImage(A.sky(M, W / 2, H / 2, 2, 9), 0, 0);
  const pts: P[] = [[330, 1820], [470, 1380], [880, 1300], [800, 1760], [470, 1380]];
  thread(g, [[800, 1760], [1040, 1950]], 6, 0); thread(g, [[800, 1760], [330, 1820]], 6, 0);
  thread(g, pts, 8, 4); stars(g, [...pts.slice(0, 4), [1040, 1950]], 64);
  g.textAlign = 'center'; g.font = '200px Marcellus, serif';
  const tg = g.createLinearGradient(0, 560, 0, 760); tg.addColorStop(0, '#ffffff'); tg.addColorStop(0.5, '#e8eeff'); tg.addColorStop(1, '#ffd98a');
  g.shadowColor = 'rgba(170,190,255,0.5)'; g.shadowBlur = 50; g.fillStyle = tg; g.fillText('Starthread', W / 2, 720); g.shadowBlur = 0;
  g.save(); g.shadowBlur = 0; g.font = '600 58px Manrope, sans-serif'; g.fillStyle = '#ffd98a'; try { g.letterSpacing = '34px'; } catch { /* */ } g.fillText('TUNDRA', W / 2 + 17, 540); g.restore();
  return c;
}
/** The feature graphic: an aurora night, a great constellation half drawn on the right, its thread still glowing at the head; the words on the left. */
export function feature() {
  const W = 1024, H = 500, { c, g } = A.canvas(W, H);
  g.drawImage(A.sky(M2, W / 2, H / 2, 2, 12), 0, 0);
  const A1: P = [560, 330], B: P = [640, 150], C: P = [800, 190], D: P = [760, 340], E: P = [900, 400], F: P = [960, 250];
  // the lines still to draw, dotted, then the lit part of the thread
  thread(g, [E, F], 2.2, 0); thread(g, [F, C], 2.2, 0); thread(g, [D, A1], 2.2, 0);
  thread(g, [A1, B, C, D, E], 2.6, 4, '200,255,228');
  stars(g, [A1, B, C, D, E, F], 30);
  head(g, E[0], E[1], 14);
  // a shooting star
  const sh = g.createLinearGradient(380, 40, 520, 90); sh.addColorStop(0, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(255,255,255,0.9)'); g.strokeStyle = sh; g.lineWidth = 2; g.beginPath(); g.moveTo(380, 40); g.lineTo(520, 90); g.stroke();
  const shade = g.createLinearGradient(0, 0, 520, 0); shade.addColorStop(0, 'rgba(2,8,12,0.72)'); shade.addColorStop(1, 'rgba(2,8,12,0)'); g.fillStyle = shade; g.fillRect(0, 0, 520, H);
  g.textAlign = 'left';
  const tg = g.createLinearGradient(0, 100, 0, 180); tg.addColorStop(0, '#ffffff'); tg.addColorStop(0.55, '#e8eeff'); tg.addColorStop(1, '#ffd98a');
  g.save(); g.shadowBlur = 0; g.font = '600 22px Manrope, sans-serif'; g.fillStyle = '#ffd98a'; try { g.letterSpacing = '13px'; } catch { /* */ } g.fillText('TUNDRA', 62, 98); g.restore();
  g.shadowColor = 'rgba(170,190,255,0.45)'; g.shadowBlur = 24; g.fillStyle = tg; g.font = '88px Marcellus, serif'; g.fillText('Starthread', 58, 172); g.shadowBlur = 0;
  g.fillStyle = '#eef0fa'; g.font = '32px Marcellus, serif'; g.fillText('Draw the sky in a single line.', 62, 222);
  g.fillStyle = '#ffd98a'; g.fillRect(64, 244, 48, 2);
  g.fillStyle = 'rgba(238,240,250,0.84)'; g.font = '600 18px Manrope, sans-serif';
  g.fillText('Trace every constellation in one unbroken', 64, 280);
  g.fillText('thread of light. 24 star charts, three skies.', 64, 306);
  return c;
}
(window as unknown as { brand: unknown }).brand = { icon, adaptive, adaptiveBg, splash, feature };
