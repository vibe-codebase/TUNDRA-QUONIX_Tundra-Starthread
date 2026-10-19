/**
 * Starthread sound, synthesised with Web Audio. Every star has a note, higher in the sky for higher stars, and rings
 * like a celesta when the thread reaches it; the thread itself hums faintly while it is drawn. Under it, a slow pad
 * and night air. A finished constellation plays its stars back in the order they were drawn, then a chord.
 */
const PENTA = [0, 2, 4, 7, 9];
export function noteHz(degree: number) { const o = Math.floor(degree / 5), s = PENTA[((degree % 5) + 5) % 5] + o * 12; return 293.66 * Math.pow(2, s / 12); }

export class Sound {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private music!: GainNode;
  private sfx!: GainNode;
  private verb!: ConvolverNode;
  private noise!: AudioBuffer;
  private timer: number | null = null;
  private next = 0;
  private beatN = 0;
  private chapter = 0;
  private musicVol = 0.6;
  private sfxVol = 0.8;
  private ducked = false;
  private hum: { g: GainNode; o: OscillatorNode } | null = null;

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();
      this.ctx = ctx;
      this.master = ctx.createGain(); this.master.gain.value = 0.9;
      const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 3;
      this.master.connect(comp).connect(ctx.destination);
      this.music = ctx.createGain(); this.sfx = ctx.createGain();
      this.verb = ctx.createConvolver(); this.verb.buffer = this.impulse(4);
      const wet = ctx.createGain(); wet.gain.value = 0.5;
      this.verb.connect(wet).connect(this.master);
      this.music.connect(this.master); this.music.connect(this.verb);
      this.sfx.connect(this.master); this.sfx.connect(this.verb);
      this.noise = this.makeNoise();
      // the thread's hum: a soft sine that follows the finger
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = 440;
      const g = ctx.createGain(); g.gain.value = 0; o.connect(g).connect(this.sfx); o.start();
      this.hum = { g, o };
      this.applyVolumes();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }
  setVolumes(music: number, sfx: number) { this.musicVol = music; this.sfxVol = sfx; this.applyVolumes(); }
  private applyVolumes() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.music.gain.setTargetAtTime(this.musicVol * 0.5 * (this.ducked ? 0.55 : 1), t, 0.3);
    this.sfx.gain.setTargetAtTime(this.sfxVol, t, 0.05);
  }
  duck(on: boolean) { this.ducked = on; this.applyVolumes(); }
  suspend() { void this.ctx?.suspend(); }
  resume() { if (this.ctx?.state === 'suspended') void this.ctx.resume(); }

  startMusic(chapter: number) {
    if (!this.ctx) return;
    if (this.timer !== null && chapter === this.chapter) return;
    this.chapter = chapter;
    this.next = this.ctx.currentTime + 0.4;
    if (this.timer === null) this.timer = window.setInterval(() => this.schedule(), 200);
  }
  /** Slow pad chords, a breath of wind now and then, and a rare high twinkle. */
  private schedule() {
    const ctx = this.ctx!;
    const chords = [[[-5, 0, 2], [-4, 0, 3], [-6, -1, 2], [-5, -1, 1]], [[-7, -2, 1], [-6, -2, 0], [-8, -3, 1], [-7, -3, 0]], [[-5, -1, 2], [-3, 0, 4], [-6, -1, 1], [-4, 0, 2]]][this.chapter % 3];
    while (this.next < ctx.currentTime + 1.2) {
      const t = this.next, ch = chords[this.beatN % chords.length];
      ch.forEach((d, i) => this.pad(t + i * 0.08, noteHz(d), 9.5));
      this.hiss(t + 2, 4, 0.006, 500, 0.6, this.music);
      if (this.beatN % 2 === 1) this.bell(t + 4.5, noteHz(10 + (this.beatN % 4)), 0.008, 3, this.music);
      this.next += 8; this.beatN++;
    }
  }
  private pad(t: number, f: number, dur: number) {
    const ctx = this.ctx!, lp = ctx.createBiquadFilter(), g = ctx.createGain();
    lp.type = 'lowpass'; lp.frequency.value = 900;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.022, t + dur * 0.35); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    for (const det of [-4, 4]) { const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = f; o.detune.value = det; o.connect(lp); o.start(t); o.stop(t + dur + 0.1); }
    lp.connect(g).connect(this.music);
  }
  private hiss(t: number, dur: number, vol: number, freq: number, q = 1, bus?: GainNode) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource(); src.buffer = this.noise;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = q; bp.frequency.value = freq;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + dur * 0.4); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(bp).connect(g).connect(bus ?? this.sfx); src.start(t, Math.random()); src.stop(t + dur + 0.05);
  }
  /** A celesta-like bell: a sine, a bright partial and a quick tine. */
  private bell(t: number, f: number, vol: number, dur: number, bus?: GainNode) {
    const ctx = this.ctx!;
    [[1, 1, dur], [2.0, 0.35, dur * 0.5], [4.2, 0.12, dur * 0.15], [3.0, 0.08, dur * 0.3]].forEach(([m, v, d]) => {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = f * m;
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol * v, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g).connect(bus ?? this.sfx); o.start(t); o.stop(t + d + 0.05);
    });
  }
  /** A star's note: degree 0 is D4. */
  star(degree: number, vol = 0.06, at = 0) { if (this.ctx) this.bell(this.ctx.currentTime + at, noteHz(degree), vol, 2.2); }
  humAt(degree: number | null) {
    if (!this.ctx || !this.hum) return;
    const t = this.ctx.currentTime;
    if (degree === null) { this.hum.g.gain.setTargetAtTime(0, t, 0.08); return; }
    this.hum.o.frequency.setTargetAtTime(noteHz(degree) / 2, t, 0.05); this.hum.g.gain.setTargetAtTime(0.012, t, 0.08);
  }
  stuck() { if (this.ctx) { const t = this.ctx.currentTime; this.bell(t, noteHz(-5), 0.05, 1.4); this.bell(t + 0.05, noteHz(-4) * 1.03, 0.04, 1.2); this.hiss(t, 0.6, 0.02, 300, 1); } }
  tap() { if (this.ctx) this.bell(this.ctx.currentTime, noteHz(12), 0.012, 0.5); }
  undo() { if (this.ctx) { const t = this.ctx.currentTime; this.hiss(t, 0.3, 0.02, 2400, 2); } }
  hint() { if (this.ctx) { this.star(10, 0.03); this.star(12, 0.025, 0.12); } }
  /** The finished constellation: its stars in the order drawn, then all together. */
  play(degrees: number[], gap = 0.16) { degrees.forEach((d, i) => this.star(d, 0.05, 0.15 + i * gap)); }
  chord(degrees: number[], at: number) { [...new Set(degrees)].forEach((d) => this.star(d, 0.03, at)); if (this.ctx) this.hiss(this.ctx.currentTime + at, 2.5, 0.015, 6000, 0.5); }
  medal(i: number) { this.star([7, 9, 12][i] ?? 12, 0.05); }

  private makeNoise() {
    const ctx = this.ctx!;
    const b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }
  private impulse(seconds: number) {
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * seconds);
    const b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.4); }
    return b;
  }
}
export const sound = new Sound();
