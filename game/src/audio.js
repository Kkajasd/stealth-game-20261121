// audio.js — procedural WebAudio sounds for The Lantern Thief.
// No audio files: every cue is a short oscillator or noise burst made on
// the spot. The context is created lazily on the first user gesture (a
// browser will not let it start before one), and every call is guarded so
// a headless run without audio never throws.
let ctx = null;
let muted = false;
let master = null;

export function ensureAudio() {
  if (ctx) {
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    return;
  }
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.16;
    master.connect(ctx.destination);
  } catch (e) {
    ctx = null;
  }
}

export function setMuted(value) {
  muted = value;
  if (master) master.gain.value = value ? 0 : 0.16;
}

export function isMuted() {
  return muted;
}

function tone(freq, duration, type, volume, slideTo) {
  if (!ctx || muted) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || "sine";
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + duration);
    gain.gain.setValueAtTime(volume || 0.5, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(master);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    // Audio is decoration; a failure here must never break the game.
  }
}

function noiseBurst(duration, volume, lowpass) {
  if (!ctx || muted) return;
  try {
    const len = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = lowpass || 900;
    const gain = ctx.createGain();
    gain.gain.value = volume || 0.4;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start();
  } catch (e) {
    // Audio is decoration; a failure here must never break the game.
  }
}

// One soft footstep, quieter while sneaking.
export function playStep(sneaking) {
  noiseBurst(0.05, sneaking ? 0.12 : 0.3, sneaking ? 400 : 800);
}

// A two-note chime when a relic is taken.
export function playRelic() {
  tone(660, 0.12, "sine", 0.5);
  setTimeout(() => tone(990, 0.2, "sine", 0.5), 90);
}

// A rising sting when a guard spots the thief.
export function playSpotted() {
  tone(220, 0.35, "sawtooth", 0.4, 440);
}

// A low thud when the thief is caught.
export function playCaught() {
  tone(140, 0.4, "triangle", 0.6, 60);
  noiseBurst(0.25, 0.5, 300);
}

// A small arpeggio when a level is cleared.
export function playLevelClear() {
  [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.22, "sine", 0.5), i * 110));
}
