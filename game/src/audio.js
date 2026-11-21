// audio.js — procedural WebAudio sounds for The Lantern Thief. No audio files:
// every cue is a small oscillator or filtered-noise burst made on the spot,
// so the game ships no assets and never touches the network. Sound starts on
// the first user gesture (browsers block audio before that) and can be muted.

function makeSound() {
  const sound = {
    ctx: null,
    muted: false,
    lastStep: 0,
    ensure: function () {
      if (!this.ctx) {
        try {
          const AC = window.AudioContext || window.webkitAudioContext;
          this.ctx = new AC();
        } catch (e) {
          this.ctx = null;
        }
      }
      if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
      return this.ctx;
    },
    toggleMute: function () {
      this.muted = !this.muted;
      return this.muted;
    },
    // A short tone: frequency slide from f0 to f1 over `dur` seconds.
    tone: function (f0, f1, dur, type, gain) {
      if (this.muted) return;
      const ctx = this.ensure();
      if (!ctx) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type || "sine";
      osc.frequency.setValueAtTime(f0, t);
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
      g.gain.setValueAtTime(gain || 0.08, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    },
    // A soft footstep tick; louder and faster when the thief runs.
    step: function (running) {
      const now = performance.now();
      if (now - this.lastStep < (running ? 240 : 380)) return;
      this.lastStep = now;
      this.tone(running ? 140 : 110, 70, 0.07, "triangle", running ? 0.05 : 0.03);
    },
    // The rising sting when a guard starts a chase.
    sting: function () {
      this.tone(220, 660, 0.35, "sawtooth", 0.06);
      this.tone(330, 990, 0.3, "sine", 0.05);
    },
    // A two-note chime when a relic is collected.
    pickup: function () {
      this.tone(880, 880, 0.12, "sine", 0.07);
      const self = this;
      setTimeout(function () {
        self.tone(1318, 1318, 0.18, "sine", 0.07);
      }, 90);
    },
    // A low buzz when the thief is caught.
    caught: function () {
      this.tone(180, 55, 0.5, "square", 0.07);
    },
    // A small arpeggio when a level is cleared.
    win: function () {
      const self = this;
      [523, 659, 784, 1046].forEach(function (f, i) {
        setTimeout(function () {
          self.tone(f, f, 0.22, "sine", 0.07);
        }, i * 110);
      });
    },
    // A soft click for menu buttons and the exit opening.
    click: function () {
      this.tone(660, 520, 0.06, "sine", 0.05);
    },
  };
  return sound;
}
