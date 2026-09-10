// ============================================================
// MINIMIZE Card Game - Web Audio Sound Engine & Audio Effects
// ============================================================

class SoundEngine {
  private ctx: AudioContext | null = null;
  muted = false;

  private getCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  play(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.18): void {
    if (this.muted) return;
    try {
      const ctx = this.getCtx();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      o.frequency.value = freq;
      o.type = type;
      g.gain.setValueAtTime(vol, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      o.start();
      o.stop(ctx.currentTime + dur);
    } catch {}
  }

  // Card select click
  select(): void {
    this.play(800, 0.04, 'sine', 0.08);
  }

  // Card draw
  draw(): void {
    this.play(600, 0.08, 'sine', 0.12);
  }

  // Single card throw
  discard(): void {
    this.play(440, 0.12, 'triangle', 0.15);
  }

  // Multi-card Combo throw (ascending chord)
  comboThrow(): void {
    [440, 554, 659, 880].forEach((freq, i) => {
      setTimeout(() => this.play(freq, 0.18, 'sine', 0.15), i * 65);
    });
  }

  // Power card activation
  powerActivate(): void {
    [523, 698, 880].forEach((freq, i) => {
      setTimeout(() => this.play(freq, 0.22, 'triangle', 0.18), i * 80);
    });
  }

  // Round Declare
  declare(): void {
    [523, 659, 784, 1046].forEach((f, i) => {
      setTimeout(() => this.play(f, 0.25, 'sine', 0.2), i * 80);
    });
  }

  // Match Victory celebration fanfare
  victory(): void {
    [523, 659, 784, 1046, 1318, 1568].forEach((f, i) => {
      setTimeout(() => this.play(f, 0.35, 'triangle', 0.22), i * 110);
    });
  }

  // Action error or invalid selection
  error(): void {
    this.play(220, 0.2, 'sawtooth', 0.1);
  }
}

export const sound = new SoundEngine();
