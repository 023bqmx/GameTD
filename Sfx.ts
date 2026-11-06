// Tiny Web Audio synthesizer – no audio files needed.

type SoundName =
  | 'pulse' | 'zap' | 'cryo' | 'mortar' | 'boom' | 'hit' | 'kill' | 'build' | 'upgrade' | 'sell'
  | 'surge' | 'wave' | 'boss' | 'leak' | 'win' | 'lose' | 'click' | 'deny';

class SfxEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private musicNodes: AudioNode[] = [];
  private last = new Map<string, number>();
  sfxVolume = 0.7;
  musicVolume = 0.4;

  /** Must be called from a user gesture (browser autoplay policy). */
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.sfxVolume;
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.musicVolume * 0.25;
      this.musicGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  setVolumes(sfx: number, music: number) {
    this.sfxVolume = sfx;
    this.musicVolume = music;
    if (this.master) this.master.gain.value = sfx;
    if (this.musicGain) this.musicGain.gain.value = music * 0.25;
  }

  startMusic() {
    if (!this.ctx || !this.musicGain || this.musicNodes.length) return;
    const ctx = this.ctx;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 700;
    filter.connect(this.musicGain);
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.07;
    lfoGain.gain.value = 350;
    lfo.connect(lfoGain).connect(filter.frequency);
    lfo.start();
    this.musicNodes.push(lfo, lfoGain, filter);
    // A minor-ish drone pad
    [55, 82.41, 110, 130.81, 164.81].forEach((f, i) => {
      const o = ctx.createOscillator();
      o.type = i < 2 ? 'sawtooth' : 'triangle';
      o.frequency.value = f;
      o.detune.value = (i % 2 ? 1 : -1) * 6;
      const g = ctx.createGain();
      g.gain.value = i < 2 ? 0.18 : 0.12;
      o.connect(g).connect(filter);
      o.start();
      this.musicNodes.push(o, g);
    });
  }

  stopMusic() {
    for (const n of this.musicNodes) {
      try { (n as OscillatorNode).stop?.(); } catch { /* already stopped */ }
      n.disconnect();
    }
    this.musicNodes = [];
  }

  private tone(freq: number, dur: number, type: OscillatorType, vol: number, slideTo?: number, delay = 0) {
    const ctx = this.ctx!;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master!);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private noise(dur: number, vol: number, cutoff: number, delay = 0) {
    const ctx = this.ctx!;
    const t = ctx.currentTime + delay;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = cutoff;
    const g = ctx.createGain();
    g.gain.value = vol;
    src.connect(f).connect(g).connect(this.master!);
    src.start(t);
  }

  play(name: SoundName) {
    if (!this.ctx || !this.master || this.sfxVolume <= 0) return;
    const now = performance.now();
    const gap = name === 'hit' || name === 'pulse' ? 45 : name === 'kill' ? 35 : 25;
    if (now - (this.last.get(name) ?? 0) < gap) return;
    this.last.set(name, now);
    switch (name) {
      case 'pulse': this.tone(880, 0.08, 'square', 0.05, 440); break;
      case 'zap': this.noise(0.12, 0.12, 6000); this.tone(1400, 0.1, 'sawtooth', 0.04, 300); break;
      case 'cryo': this.tone(1600, 0.12, 'sine', 0.05, 2400); break;
      case 'mortar': this.tone(140, 0.18, 'sine', 0.12, 60); break;
      case 'boom': this.noise(0.35, 0.3, 900); this.tone(90, 0.3, 'sine', 0.18, 35); break;
      case 'hit': this.tone(320, 0.04, 'triangle', 0.03, 200); break;
      case 'kill': this.tone(520, 0.1, 'triangle', 0.06, 1040); break;
      case 'build': this.tone(392, 0.1, 'triangle', 0.1); this.tone(587, 0.16, 'triangle', 0.1, undefined, 0.08); break;
      case 'upgrade': [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.14, 'triangle', 0.09, undefined, i * 0.06)); break;
      case 'sell': this.tone(660, 0.1, 'sine', 0.08, 330); break;
      case 'surge': this.noise(0.8, 0.35, 2500); this.tone(110, 0.9, 'sawtooth', 0.15, 880); this.tone(220, 0.9, 'sine', 0.15, 55, 0.15); break;
      case 'wave': this.tone(220, 0.3, 'sawtooth', 0.08, 440); this.tone(330, 0.4, 'sawtooth', 0.06, 660, 0.12); break;
      case 'boss': [110, 104, 98, 92].forEach((f, i) => this.tone(f, 0.5, 'sawtooth', 0.14, undefined, i * 0.28)); break;
      case 'leak': this.tone(200, 0.3, 'square', 0.1, 70); break;
      case 'win': [523, 659, 784, 1046, 1318].forEach((f, i) => this.tone(f, 0.35, 'triangle', 0.1, undefined, i * 0.12)); break;
      case 'lose': [392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.45, 'sawtooth', 0.08, undefined, i * 0.2)); break;
      case 'click': this.tone(1200, 0.04, 'sine', 0.05); break;
      case 'deny': this.tone(160, 0.12, 'square', 0.06); break;
    }
  }
}

export const sfx = new SfxEngine();
export type { SoundName };
