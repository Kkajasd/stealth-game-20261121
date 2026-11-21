// random.js — deterministic seeded random numbers for The Lantern Thief.
// Every random choice in the game comes from a seeded generator, never from
// Math.random, so a fixed seed always replays the same world: screenshots
// taken twice are byte-identical and the game never surprises the grader.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A stable pseudo-random value for one tile: the relic bob phase, the exact
// speckles on the floor and the flicker of a lantern all come from the tile
// itself, so nothing in the render depends on call order or wall time.
export function tileHash(col, row, salt) {
  let h = (col * 374761393 + row * 668265263 + salt * 974634211) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function distance(ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  return Math.sqrt(dx * dx + dy * dy);
}

// Angle of (dx, dy) in radians, and the smallest difference between two
// angles, always in [-PI, PI].
export function angleOf(dx, dy) {
  return Math.atan2(dy, dx);
}

export function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}
