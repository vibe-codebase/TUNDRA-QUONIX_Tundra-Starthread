import { useEffect, useRef } from 'react';
import { canvas, MOODS, sky } from '../game/art';
import type { Level } from '../game/levels';
import { BOX_H } from '../game/sim';

const cache = new Map<string, HTMLCanvasElement>();
/** The chart in miniature: its night and its stars, with the lines dotted; once drawn, lit and named. */
function paintCard(level: Level, solved: boolean, w: number, h: number, dpr: number) {
  const m = MOODS[level.chapter], { c, g } = canvas(w * dpr, h * dpr);
  g.scale(dpr, dpr);
  g.save(); g.beginPath(); g.roundRect(0, 0, w, h, 8); g.clip();
  g.drawImage(sky(m, w, h, dpr, 3 + level.id.charCodeAt(1) * 5, true), 0, 0, w, h);
  const k = Math.min((w - 14) / 1, (h * 0.8) / BOX_H), ox = (w - k) / 2, oy = (h * 0.86 - k * BOX_H) / 2;
  const P = level.stars.map((s) => [ox + s.x * k, oy + s.y * k] as const);
  const lit = `rgba(${m.litCss},`;
  for (const l of level.lines) {
    const [x1, y1] = P[l.a], [x2, y2] = P[l.b], len = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / len, uy = (y2 - y1) / len;
    for (const off of l.times === 2 ? [-1.3, 1.3] : [0]) {
      const px = -uy * off, py = ux * off;
      if (solved) { g.strokeStyle = `${lit}0.3)`; g.lineWidth = 3; g.beginPath(); g.moveTo(x1 + px, y1 + py); g.lineTo(x2 + px, y2 + py); g.stroke(); g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 0.8; g.stroke(); }
      else { g.fillStyle = 'rgba(200,212,255,0.5)'; const n = Math.max(2, Math.floor(len / 4)); for (let d = 0; d <= n; d++) g.fillRect(x1 + px + (x2 - x1) * d / n - 0.4, y1 + py + (y2 - y1) * d / n - 0.4, 0.8, 0.8); }
    }
  }
  for (const [x, y] of P) {
    const gr = g.createRadialGradient(x, y, 0, x, y, 5); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, `${lit}0.6)`); gr.addColorStop(1, `${lit}0)`);
    g.fillStyle = gr; g.fillRect(x - 5, y - 5, 10, 10);
  }
  g.restore();
  return c;
}

export function Postcard({ level, solved, locked, width }: { level: Level; solved: boolean; locked: boolean; width: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const height = Math.round(width * 1.3);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1), key = `${level.id}|${solved}|${locked}|${width}|${dpr}`;
    let src = cache.get(key);
    if (!src) { src = paintCard(level, solved && !locked, width, height, dpr); cache.set(key, src); }
    el.width = src.width; el.height = src.height; el.getContext('2d')!.drawImage(src, 0, 0);
  }, [level, solved, locked, width, height]);
  return <canvas ref={ref} className="postcard" style={{ width, height }} aria-hidden />;
}
