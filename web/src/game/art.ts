/**
 * Starthread art, painted with Canvas 2D: a night sky over a dark hill line (dusk, deep midnight with a crescent moon,
 * and an aurora night), the Milky Way as a soft band of dust and tiny stars, and the constellation's stars as glowing
 * points with fine diffraction spikes. Lines are drawn live by the scene.
 */
export type Mood = { name: string; sky: [string, string, string]; glow: string; hill: string; band: number; line: number; lit: number; litCss: string; moon: boolean; aurora: boolean };
export const MOODS: Mood[] = [
  { name: 'dusk', sky: ['#070b22', '#18204a', '#5a3c62'], glow: 'rgba(255,150,110,', hill: '#07081a', band: 0.5, line: 0xc8d4ff, lit: 0xffe2a0, litCss: '255,226,160', moon: false, aurora: false },
  { name: 'midnight', sky: ['#03050f', '#0b1230', '#1c2a50'], glow: 'rgba(150,170,255,', hill: '#04050c', band: 0.85, line: 0xc8d4ff, lit: 0xd8ecff, litCss: '216,236,255', moon: true, aurora: false },
  { name: 'aurora', sky: ['#020a10', '#062026', '#0e3a36'], glow: 'rgba(120,255,200,', hill: '#020708', band: 0.6, line: 0xc8f0e4, lit: 0xc8ffe4, litCss: '200,255,228', moon: false, aurora: true },
];
export function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h));
  return { c, g: c.getContext('2d')! };
}
export const hash = (a: number, b: number) => { let h = Math.imul(a + 0x9e3779b9, 374761393) ^ Math.imul(b + 7, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
const TAU = Math.PI * 2;

/** The night: sky, Milky Way, a field of faint stars, the moon or the aurora, and the hills. W×H at scale r. */
export function sky(m: Mood, W: number, H: number, r: number, seed = 1, hills = true) {
  const { c, g } = canvas(W * r, H * r);
  g.scale(r, r);
  const horizon = H * 0.88;
  const gr = g.createLinearGradient(0, 0, 0, horizon); gr.addColorStop(0, m.sky[0]); gr.addColorStop(0.6, m.sky[1]); gr.addColorStop(1, m.sky[2]);
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  const hz = g.createRadialGradient(W * 0.5, horizon + H * 0.1, 10, W * 0.5, horizon + H * 0.1, Math.max(W, H) * 0.7); hz.addColorStop(0, `${m.glow}0.32)`); hz.addColorStop(0.4, `${m.glow}0.08)`); hz.addColorStop(1, `${m.glow}0)`);
  g.fillStyle = hz; g.fillRect(0, 0, W, H);
  // the Milky Way: a diagonal band of soft dust and dense tiny stars, with dark lanes
  g.save(); g.translate(W * 0.5, H * 0.42); g.rotate(-0.62 + (hash(seed, 1) - 0.5) * 0.3);
  const bw = Math.max(W, H) * 0.16;
  for (let i = 0; i < 70; i++) { const x = (hash(i, seed + 2) - 0.5) * Math.max(W, H) * 1.6, y = (hash(i, seed + 3) - 0.5) * bw * 1.4, rr = bw * (0.3 + hash(i, seed + 4) * 0.6); const d = g.createRadialGradient(x, y, 0, x, y, rr); d.addColorStop(0, `rgba(200,210,255,${0.05 * m.band})`); d.addColorStop(1, 'rgba(200,210,255,0)'); g.fillStyle = d; g.fillRect(x - rr, y - rr, rr * 2, rr * 2); }
  for (let i = 0; i < 26; i++) { const x = (hash(i, seed + 5) - 0.5) * Math.max(W, H) * 1.5, y = (hash(i, seed + 6) - 0.5) * bw * 0.5, rr = bw * (0.12 + hash(i, seed + 7) * 0.2); const d = g.createRadialGradient(x, y, 0, x, y, rr); d.addColorStop(0, `rgba(0,0,10,${0.18 * m.band})`); d.addColorStop(1, 'rgba(0,0,10,0)'); g.fillStyle = d; g.fillRect(x - rr, y - rr, rr * 2, rr * 2); }
  for (let i = 0; i < 1400 * m.band; i++) { const x = (hash(i, seed + 8) - 0.5) * Math.max(W, H) * 1.6, y = (hash(i, seed + 9) + hash(i, seed + 10) - 1) * bw * 0.8; g.fillStyle = `rgba(230,236,255,${0.12 + hash(i, seed + 11) * 0.35})`; g.fillRect(x, y, 0.7, 0.7); }
  g.restore();
  // the field of faint stars
  const n = Math.round((W * H) / 520);
  for (let i = 0; i < n; i++) {
    const x = hash(i, seed + 20) * W, y = Math.pow(hash(i, seed + 21), 1.25) * horizon, b = hash(i, seed + 22), s = 0.4 + b * b * 1.3;
    const tint = hash(i, seed + 23); g.fillStyle = tint < 0.15 ? `rgba(255,214,170,${0.25 + b * 0.6})` : tint < 0.35 ? `rgba(180,206,255,${0.25 + b * 0.6})` : `rgba(240,244,255,${0.2 + b * 0.6})`;
    g.beginPath(); g.arc(x, y, s * 0.6, 0, TAU); g.fill();
  }
  if (m.moon) {
    const mx = W * 0.8, my = H * 0.12, mr = Math.min(W, H) * 0.045;
    const halo = g.createRadialGradient(mx, my, mr, mx, my, mr * 6); halo.addColorStop(0, 'rgba(220,230,255,0.18)'); halo.addColorStop(1, 'rgba(220,230,255,0)'); g.fillStyle = halo; g.fillRect(mx - mr * 6, my - mr * 6, mr * 12, mr * 12);
    const mc = canvas(mr * 2.4 * r, mr * 2.4 * r), mg = mc.g; mg.scale(r, r);
    mg.fillStyle = '#f4f2e6'; mg.beginPath(); mg.arc(mr * 1.2, mr * 1.2, mr, 0, TAU); mg.fill();
    mg.globalCompositeOperation = 'destination-out'; mg.beginPath(); mg.arc(mr * 1.2 + mr * 0.45, mr * 1.2 - mr * 0.2, mr * 0.92, 0, TAU); mg.fill();
    g.drawImage(mc.c, mx - mr * 1.2, my - mr * 1.2, mr * 2.4, mr * 2.4);
  }
  if (m.aurora) {
    for (let k = 0; k < 3; k++) {
      const base = horizon * (0.42 + k * 0.1), amp = H * 0.05;
      for (let x = -10; x < W + 10; x += 2) {
        const y = base + Math.sin(x / W * 5 + k * 1.7 + seed) * amp + Math.sin(x / W * 13 + k) * amp * 0.3, h2 = H * (0.12 + 0.06 * Math.sin(x / W * 7 + k * 2));
        const a = 0.05 + 0.045 * Math.sin(x / W * 9 + k * 3) ** 2;
        const cg = g.createLinearGradient(0, y - h2, 0, y); cg.addColorStop(0, 'rgba(160,110,255,0)'); cg.addColorStop(0.6, `rgba(120,255,190,${a})`); cg.addColorStop(1, 'rgba(120,255,190,0)');
        g.fillStyle = cg; g.fillRect(x, y - h2, 2.4, h2);
      }
    }
  }
  if (hills) hillLine(g, m, W, H, horizon, seed);
  return c;
}
/** Rolling hills with a few pines, black against the glow. */
function hillLine(g: CanvasRenderingContext2D, m: Mood, W: number, H: number, horizon: number, seed: number) {
  g.fillStyle = m.hill; g.beginPath(); g.moveTo(0, H);
  for (let x = 0; x <= W + 4; x += 4) { const y = horizon + Math.sin(x / W * 3.1 + seed) * H * 0.018 + Math.sin(x / W * 7.3 + seed * 2) * H * 0.008 + H * 0.01; g.lineTo(x, y); }
  g.lineTo(W, H); g.closePath(); g.fill();
  for (let i = 0; i < 14; i++) {
    const x = hash(i, seed + 40) * W, base = horizon + Math.sin(x / W * 3.1 + seed) * H * 0.018 + Math.sin(x / W * 7.3 + seed * 2) * H * 0.008 + H * 0.012, h = H * (0.025 + hash(i, seed + 41) * 0.035), w = h * 0.36;
    g.beginPath(); g.moveTo(x, base - h);
    for (let k = 1; k <= 4; k++) { const yy = base - h + (h * k) / 4.4; g.lineTo(x + w * (k / 4) * 1.1, yy); g.lineTo(x + w * (k / 4) * 0.45, yy - h * 0.04); }
    g.lineTo(x + w * 0.1, base); g.lineTo(x - w * 0.1, base);
    for (let k = 4; k >= 1; k--) { const yy = base - h + (h * k) / 4.4; g.lineTo(x - w * (k / 4) * 0.45, yy - h * 0.04); g.lineTo(x - w * (k / 4) * 1.1, yy); }
    g.closePath(); g.fill();
  }
  const mist = g.createLinearGradient(0, horizon - H * 0.03, 0, H); mist.addColorStop(0, `${m.glow}0)`); mist.addColorStop(0.4, `${m.glow}0.05)`); mist.addColorStop(1, 'rgba(0,0,0,0.4)');
  g.fillStyle = mist; g.fillRect(0, horizon - H * 0.03, W, H);
}
/** A constellation star: a hot core, a soft glow and four fine spikes. `s` is the glow's radius. */
export function star(s: number, tint: string, r: number) {
  const S = s * 2, { c, g } = canvas(S * r, S * r);
  g.scale(r, r);
  const glow = g.createRadialGradient(s, s, 0, s, s, s); glow.addColorStop(0, 'rgba(255,255,255,1)'); glow.addColorStop(0.08, `rgba(${tint},0.95)`); glow.addColorStop(0.22, `rgba(${tint},0.32)`); glow.addColorStop(1, `rgba(${tint},0)`);
  g.fillStyle = glow; g.fillRect(0, 0, S, S);
  g.globalCompositeOperation = 'lighter';
  for (const [dx, dy, L] of [[1, 0, 0.95], [0, 1, 0.95], [0.7, 0.7, 0.45], [0.7, -0.7, 0.45]] as const) {
    const sp = g.createLinearGradient(s - dx * s * L, s - dy * s * L, s + dx * s * L, s + dy * s * L); sp.addColorStop(0, `rgba(${tint},0)`); sp.addColorStop(0.5, 'rgba(255,255,255,0.9)'); sp.addColorStop(1, `rgba(${tint},0)`);
    g.strokeStyle = sp; g.lineWidth = L > 0.5 ? 1.1 : 0.7; g.beginPath(); g.moveTo(s - dx * s * L, s - dy * s * L); g.lineTo(s + dx * s * L, s + dy * s * L); g.stroke();
  }
  return c;
}
/** A soft round glow. */
export function glow(rad: number, tint: string, r: number, a = 0.6) {
  const S = rad * 2, { c, g } = canvas(S * r, S * r);
  g.scale(r, r);
  const gr = g.createRadialGradient(rad, rad, 0, rad, rad, rad); gr.addColorStop(0, `rgba(${tint},${a})`); gr.addColorStop(1, `rgba(${tint},0)`);
  g.fillStyle = gr; g.fillRect(0, 0, S, S);
  return c;
}
export const TINTS = ['220,232,255', '255,236,200', '200,220,255', '255,250,235', '210,240,255'];
