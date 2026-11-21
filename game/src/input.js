// input.js — keyboard and mouse for The Lantern Thief.
//
// WASD / arrows: move. Shift: sneak (slower, quieter, harder to see).
// Click: walk to the clicked tile (BFS path). Q: throw a pebble toward
// the mouse (or the way the thief faces). M: mute. Enter / R: menus.

import { bfs, isWalkable, TILE } from "./levels.js";

export function createInput(canvas) {
  const input = {
    keys: new Set(),
    mouse: { x: 0, y: 0, inside: false },
    clickTile: null,
    throwQueued: false,
    pressed: new Set(),
  };

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

  window.addEventListener("keydown", (e) => {
    if (e.code === "KeyQ" && !e.repeat) input.throwQueued = true;
    if (e.code === "KeyM" && !e.repeat) input.pressed.add("mute");
    if (e.code === "Enter" && !e.repeat) input.pressed.add("enter");
    if (e.code === "KeyR" && !e.repeat) input.pressed.add("restart");
    const action = KEYMAP[e.code];
    if (action) {
      input.keys.add(action);
      e.preventDefault();
    }
  });
  window.addEventListener("keyup", (e) => {
    const action = KEYMAP[e.code];
    if (action) input.keys.delete(action);
  });
  window.addEventListener("blur", () => input.keys.clear());

  canvas.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    input.mouse.x = e.clientX - rect.left;
    input.mouse.y = e.clientY - rect.top;
    input.mouse.inside = true;
  });
  canvas.addEventListener("click", (e) => {
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    input.clickTile = { x: Math.floor(px / TILE), y: Math.floor((py - 44) / TILE) };
  });

  return input;
}

/** Movement direction from held keys, normalised. */
export function moveDir(input) {
  let x = 0;
  let y = 0;
  if (input.keys.has("left")) x -= 1;
  if (input.keys.has("right")) x += 1;
  if (input.keys.has("up")) y -= 1;
  if (input.keys.has("down")) y += 1;
  if (x !== 0 && y !== 0) {
    const inv = 1 / Math.sqrt(2);
    x *= inv;
    y *= inv;
  }
  return { x, y };
}

/** BFS path (list of tile steps) from the thief to a target tile. */
export function pathTo(level, fromTile, toTile) {
  if (toTile.x < 0 || toTile.y < 0 || toTile.x >= level.w || toTile.y >= level.h) {
    return null;
  }
  if (!isWalkable(level.tiles[toTile.y][toTile.x])) return null;
  return bfs(level, fromTile.x, fromTile.y, toTile.x, toTile.y);
}
