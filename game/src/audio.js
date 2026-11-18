// Synthesised WebAudio: engine hum, gunshots, punches, sirens, mission stingers.
// Everything is generated — no audio files, no network. Safe to call headless.
export function createAudio() {
  const A = {
    ctx: null, muted: false, sirenNodes: null, engineNodes: null,
    ensure() {
      if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {}); return true; }
      try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return false;
        this.ctx = new Ctx();
        return true;
      } catch { return false; }
    },
    setMuted(m) {
      this.muted = m;
      if (this.ctx) this.ctx.suspend().catch(() => {});
      if (!m && this.ctx) this.ctx.resume().catch(() => {});
      if (m) this.siren(false);
    },
    _tone(freq, dur, type, gain, slideTo) {
      if (!this.ensure() || this.muted) return;
      try {
        const t = this.ctx.currentTime;
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t);
        if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
        g.gain.setValueAtTime(gain || 0.12, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        o.connect(g); g.connect(this.ctx.destination);
        o.start(t); o.stop(t + dur + 0.02);
      } catch {}
    },
    _noise(dur, gain, lowpass) {
      if (!this.ensure() || this.muted) return;
      try {
        const t = this.ctx.currentTime;
        const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
        const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
        const src = this.ctx.createBufferSource(); src.buffer = buf;
        const g = this.ctx.createGain(); g.gain.setValueAtTime(gain || 0.2, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        let node = src;
        if (lowpass) { const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lowpass; src.connect(f); node = f; }
        node.connect(g); g.connect(this.ctx.destination);
        src.start(t);
      } catch {}
    },
    shot() { this._noise(0.14, 0.28, 3200); this._tone(160, 0.1, 'square', 0.1, 55); },
    punch() { this._noise(0.09, 0.22, 900); this._tone(95, 0.09, 'sine', 0.16, 45); },
    stinger() { [523, 659, 784].forEach((f, i) => setTimeout(() => this._tone(f, 0.22, 'triangle', 0.12), i * 90)); },
    fail() { this._tone(220, 0.35, 'sawtooth', 0.1, 110); },
    engine(speed01, on) {
      if (!this.ensure() || this.muted || !on) { this._stopEngine(); return; }
      try {
        if (!this.engineNodes) {
          const o = this.ctx.createOscillator(); o.type = 'sawtooth';
          const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 420;
          const g = this.ctx.createGain(); g.gain.value = 0.045;
          o.connect(f); f.connect(g); g.connect(this.ctx.destination); o.start();
          this.engineNodes = { o, g };
        }
        this.engineNodes.o.frequency.setValueAtTime(55 + speed01 * 130, this.ctx.currentTime);
        this.engineNodes.g.gain.setValueAtTime(0.03 + speed01 * 0.05, this.ctx.currentTime);
      } catch {}
    },
    _stopEngine() {
      if (this.engineNodes) { try { this.engineNodes.o.stop(); } catch {} this.engineNodes = null; }
    },
    siren(on) {
      if (!this.ensure()) return;
      if (!on || this.muted) {
        if (this.sirenNodes) { try { this.sirenNodes.o.stop(); this.sirenNodes.lfo.stop(); } catch {} this.sirenNodes = null; }
        return;
      }
      try {
        if (this.sirenNodes) return;
        const o = this.ctx.createOscillator(); o.type = 'sine'; o.frequency.value = 800;
        const lfo = this.ctx.createOscillator(); lfo.frequency.value = 0.7;
        const lg = this.ctx.createGain(); lg.gain.value = 260;
        lfo.connect(lg); lg.connect(o.frequency);
        const g = this.ctx.createGain(); g.gain.value = 0.035;
        o.connect(g); g.connect(this.ctx.destination);
        o.start(); lfo.start();
        this.sirenNodes = { o, lfo };
      } catch {}
    },
  };
  return A;
}
