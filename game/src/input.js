// input.js — keyboard and mouse input for The Lantern Thief.
// WASD / arrows move, Shift sneaks (slow, quiet, hard to spot), clicking a
// tile walks there along the shortest walkable route. Input is read into a
// small state object each frame; the game loop owns what the input does.
import { isWalkable, isWalkablePixel, tileAt, tileCenter, colOf, rowOf, TILE, HUD_H } from "./levels.js";

export function makeInput() {
  return {
    up: false,
    down: false,
    left: false,
    right: false,
    sneak: false,
    // Click-to-move target in pixels, or null.
    clickTarget: null,
    path: [],
  };
}

const KEYMAP = {
  KeyW: "up",
  ArrowUp: "up",
  KeyS: "down",
  ArrowDown: "down",
  KeyA: "left",
  ArrowLeft: "left",
  KeyD: "right",
  ArrowRight: "right",
  ShiftLeft: "sneak",
  ShiftRight: "sneak",
};

export function bindInput(input, canvas, onKey) {
  window.addEventListener("keydown", (event) => {
    const field = KEYMAP[event.code];
    if (field) {
      input[field] = true;
      event.preventDefault();
    }
    if (onKey) onKey(event.code);
  });
  window.addEventListener("keyup", (event) => {
    const field = KEYMAP[event.code];
    if (field) input[field] = false;
  });
  canvas.addEventListener("mousedown", (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((event.clientY - rect.top) / rect.height) * canvas.height;
    input.clickTarget = { x, y };
  });
}

// The movement direction from the held keys, normalised, or null.
export function keyDirection(input) {
  let x = 0;
  let y = 0;
  if (input.left) x -= 1;
  if (input.right) x += 1;
  if (input.up) y -= 1;
  if (input.down) y += 1;
  if (x === 0 && y === 0) return null;
  const len = Math.sqrt(x * x + y * y);
  return { x: x / len, y: y / len };
}

// Breadth-first shortest path over walkable tiles, from tile to tile.
// Returns a list of pixel waypoints (tile centres), or [] when unreachable.
export function findPath(world, fromCol, fromRow, toCol, toRow) {
  if (!isWalkable(world, toCol, toRow)) return [];
  const key = (c, r) => `${c},${r}`;
  const prev = new Map();
  const queue = [[fromCol, fromRow]];
  prev.set(key(fromCol, fromRow), null);
  while (queue.length > 0) {
    const [c, r] = queue.shift();
    if (c === toCol && r === toRow) break;
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nc = c + dc;
      const nr = r + dr;
      if (!isWalkable(world, nc, nr)) continue;
      if (prev.has(key(nc, nr))) continue;
      prev.set(key(nc, nr), [c, r]);
      queue.push([nc, nr]);
    }
  }
  if (!prev.has(key(toCol, toRow))) return [];
  const tiles = [];
  let cur = [toCol, toRow];
  while (cur) {
    tiles.unshift(cur);
    cur = prev.get(key(cur[0], cur[1]));
  }
  return tiles.map(([c, r]) => tileCenter(c, r));
}

// The tile under a pixel point, or null outside the playfield.
export function pixelToTile(x, y) {
  const col = colOf(x);
  const row = rowOf(y);
  if (col < 0 || row < 0 || col >= 32 || row >= 18) return null;
  return { col, row };
}

// Keep the thief out of walls and crates, sliding along them.
export function moveThief(world, thief, dx, dy) {
  const radius = 12;
  const nx = thief.x + dx;
  if (isWalkablePixel(world, nx, thief.y) &&
      isWalkablePixel(world, nx + Math.sign(dx) * radius, thief.y)) {
    thief.x = nx;
  }
  const ny = thief.y + dy;
  if (isWalkablePixel(world, thief.x, ny) &&
      isWalkablePixel(world, thief.x, ny + Math.sign(dy) * radius)) {
    thief.y = ny;
  }
}

export { tileAt };
