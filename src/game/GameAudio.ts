export class GameAudio {
  static play(type: 'bite' | 'success' | 'fail') {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();

      const o = ctx.createOscillator();
      const g = ctx.createGain();

      o.connect(g);
      g.connect(ctx.destination);

      if (type === 'bite') {
        o.frequency.value = 600;
        g.gain.value = 0.08;
      } else if (type === 'success') {
        o.frequency.value = 900;
        g.gain.value = 0.12;
      } else {
        o.frequency.value = 200;
        g.gain.value = 0.06;
      }

      o.start();
      o.stop(ctx.currentTime + 0.15);
    } catch (e) {}
  }
}
