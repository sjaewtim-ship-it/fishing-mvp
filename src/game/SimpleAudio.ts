export class SimpleAudio {
  private static ctx: AudioContext | null = null;

  private static getCtx() {
    if (!this.ctx) {
      const AC = (window.AudioContext || (window as any).webkitAudioContext);
      this.ctx = new AC();
    }
    return this.ctx;
  }

  private static beep(freq: number, duration = 0.08, type: OscillatorType = 'sine', gainValue = 0.03) {
    const ctx = this.getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = gainValue;

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    osc.start(now);
    gain.gain.setValueAtTime(gainValue, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.stop(now + duration);
  }

  static cast() {
    this.beep(320, 0.08, 'triangle', 0.04);
  }

  static bite() {
    this.beep(680, 0.06, 'square', 0.05);
    setTimeout(() => this.beep(820, 0.06, 'square', 0.04), 60);
  }

  static success() {
    this.beep(520, 0.08, 'triangle', 0.05);
    setTimeout(() => this.beep(720, 0.1, 'triangle', 0.05), 70);
  }

  static fail() {
    this.beep(260, 0.12, 'sawtooth', 0.05);
  }

  static click() {
    this.beep(460, 0.04, 'square', 0.03);
  }
}
