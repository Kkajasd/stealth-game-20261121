// audio.js — procedural WebAudio cues for The Lantern Thief.
//
// No audio files: every sound is synthesised (footsteps, relic chime,
// spotted sting, pebble clink, level-clear arpeggio). The context is
// created lazily on the first user gesture and every call is guarded,
// so a headless run without audio never throws.

export function createSound() {
  const sound = {
    ctx: null,
    muted: false,
    stepTimer: 0,
  };

  function ac() {
    if (sound.muted) return null;
    try {
      if (!sound.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        sound.ctx = new AC();
      }
      if (sound.ctx.state === "suspended") sound.ctx.resume().catch(() => {});
      return sound.ctx;
    } catch {
      return null;
    }
  }

  function tone(freq, dur, type, vol, when = 0, slideTo = null) {
    const ctx = ac();
    if (!ctx) return;
    try {
      const t0 = ctx.currentTime + when;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(vol, t0 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.05);
    } catch {
      // Audio is decoration; never let it break the game.
    }
  }

  sound.footstep = function (sneaking) {
    tone(sneaking ? 140 : 95, 0.07, "triangle", sneaking ? 0.03 : 0.06);
  };
  sound.relic = function () {
    tone(880, 0.18, "sine", 0.12);
    tone(1318, 0.24, "sine", 0.1, 0.07);
  };
  sound.spotted = function () {
    tone(220, 0.3, "sawtooth", 0.1, 0, 180);
    tone(233, 0.3, "sawtooth", 0.08, 0.02, 190);
  };
  sound.pebble = function () {
    tone(1900, 0.08, "sine", 0.09);
    tone(1400, 0.12, "sine", 0.07, 0.06);
  };
  sound.clear = function () {
    [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.28, "sine", 0.11, i * 0.09));
  };
  sound.caught = function () {
    tone(160, 0.4, "square", 0.08, 0, 90);
  };
  sound.toggleMute = function () {
    sound.muted = !sound.muted;
    return sound.muted;
  };

  return sound;
}
