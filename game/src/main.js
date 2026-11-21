// main.js — game core for The Lantern Thief.
//
// State machine: title -> play -> clear -> play ... -> win, or play -> over.
// The thief moves with WASD/arrows or click-to-walk (BFS), sneaks with
// Shift, and throws pebbles with Q: the pebble's sound ring pulls every
// guard in earshot to investigate, which is the game's signature verb.
// Guards patrol, get suspicious, chase, and investigate; getting caught
// costs a life and respawns the thief at the level start.
//
// Shot mode: ?shot=<name> renders one deterministic scene (used for the
// screenshots) and stops — no loop, no clock, so renders are byte-identical.

import { LEVELS, TILE, parseLevel, isWalkable } from "./levels.js";
import {
  createGuard,
  updateGuard,
  applyNoise,
  guardCaught,
  NOISE_RADIUS_TILES,
} from "./guards.js";
import { createInput, moveDir, pathTo } from "./input.js";
import { createSound } from "./audio.js";
import { drawGame, VIEW_W, VIEW_H, HUD_H } from "./render.js";
import { clamp, dist } from "./random.js";
import { applyShot } from "./shots.js";

const WALK_SPEED = 3.0; // tiles per second
const SNEAK_SPEED = 1.7;
const PEBBLE_RANGE_TILES = 4;

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.input = createInput(canvas);
    this.sound = createSound();
    this.status = "title";
    this.levelIndex = 0;
    this.lives = 3;
    this.time = 0;
    this.maxAlert = 0;
    this.caption = "";
    this.loadLevel(0);
  }

  loadLevel(index) {
    this.levelIndex = index;
    this.level = parseLevel(LEVELS[index]);
    this.thief = {
      x: (this.level.spawn.x + 0.5) * TILE,
      y: (this.level.spawn.y + 0.5) * TILE,
      dir: 0,
      sneaking: false,
      running: false,
      path: null,
      pathIndex: 0,
    };
    this.guards = this.level.guards.map((g) => createGuard(g));
    this.rings = [];
    this.pebblesLeft = this.level.pebbles;
    this.time = 0;
    this.maxAlert = 0;
    this.caption = this.level.hint;
  }

  resetAfterCaught() {
    const spawn = this.level.spawn;
    this.thief.x = (spawn.x + 0.5) * TILE;
    this.thief.y = (spawn.y + 0.5) * TILE;
    this.thief.path = null;
    this.thief.pathIndex = 0;
    this.guards = this.level.guards.map((g) => createGuard(g));
    this.rings = [];
    this.maxAlert = 0;
    this.caption = "Caught! Back to the shadows — try a pebble next time.";
  }

  throwPebble() {
    if (this.status !== "play" || this.pebblesLeft <= 0) return;
    const tx0 = Math.floor(this.thief.x / TILE);
    const ty0 = Math.floor(this.thief.y / TILE);
    let target;
    if (this.input.mouse.inside) {
      const mx = Math.floor(this.input.mouse.x / TILE);
      const my = Math.floor((this.input.mouse.y - HUD_H) / TILE);
      target = { x: mx, y: my };
    } else {
      target = {
        x: tx0 + Math.round(Math.cos(this.thief.dir) * 3),
        y: ty0 + Math.round(Math.sin(this.thief.dir) * 3),
      };
    }
    // Clamp the throw to range, then walk it back until it lands on a floor tile.
    let dx = target.x - tx0;
    let dy = target.y - ty0;
    const d = Math.hypot(dx, dy) || 1;
    const reach = Math.min(d, PEBBLE_RANGE_TILES);
    dx = (dx / d) * reach;
    dy = (dy / d) * reach;
    let px = Math.round(tx0 + dx);
    let py = Math.round(ty0 + dy);
    while (
      (px < 0 || py < 0 || px >= this.level.w || py >= this.level.h ||
        !isWalkable(this.level.tiles[py][px])) &&
      (px !== tx0 || py !== ty0)
    ) {
      px -= Math.sign(dx) || 0;
      py -= Math.sign(dy) || 0;
    }
    if (!isWalkable(this.level.tiles[py]?.[px] ?? "#")) return;
    this.pebblesLeft--;
    this.rings.push({ x: px + 0.5, y: py + 0.5, age: 0, life: 0.9, maxR: NOISE_RADIUS_TILES });
    applyNoise(this.guards, this.level, px, py);
    this.sound.pebble();
    this.caption = "Clink! The guards turn toward the noise — slip past.";
  }

  moveThief(dt) {
    const t = this.thief;
    const dir = moveDir(this.input);
    t.sneaking = this.input.keys.has("sneak");
    if (dir.x !== 0 || dir.y !== 0) {
      t.path = null;
      t.dir = Math.atan2(dir.y, dir.x);
      const speed = (t.sneaking ? SNEAK_SPEED : WALK_SPEED) * TILE;
      this.stepThief(dir.x * speed * dt, dir.y * speed * dt);
      t.running = !t.sneaking;
      if (this.sound.stepTimer <= 0) {
        this.sound.footstep(t.sneaking);
        this.sound.stepTimer = t.sneaking ? 0.55 : 0.34;
      }
    } else if (t.path) {
      // Click-to-walk: follow the BFS path.
      const [tx, ty] = t.path[t.pathIndex] ?? [null, null];
      if (tx === null) {
        t.path = null;
        t.running = false;
      } else {
        const px = (tx + 0.5) * TILE;
        const py = (ty + 0.5) * TILE;
        const dx = px - t.x;
        const dy = py - t.y;
        const d = Math.hypot(dx, dy);
        const speed = (t.sneaking ? SNEAK_SPEED : WALK_SPEED) * TILE;
        const step = Math.min(d, speed * dt);
        if (d > 1) {
          t.dir = Math.atan2(dy, dx);
          this.stepThief((dx / d) * step, (dy / d) * step);
          t.running = !t.sneaking;
        }
        if (d <= 2) t.pathIndex++;
        if (t.pathIndex >= t.path.length) t.path = null;
      }
    } else {
      t.running = false;
    }
    this.sound.stepTimer -= dt;
  }

  /** Move the thief with axis-separated collision (slides along walls). */
  stepThief(dx, dy) {
    const t = this.thief;
    const nx = t.x + dx;
    const tx = Math.floor(nx / TILE);
    const ty = Math.floor(t.y / TILE);
    if (tx >= 0 && tx < this.level.w && isWalkable(this.level.tiles[ty][tx])) {
      t.x = nx;
    }
    const ny = t.y + dy;
    const tx2 = Math.floor(t.x / TILE);
    const ty2 = Math.floor(ny / TILE);
    if (ty2 >= 0 && ty2 < this.level.h && isWalkable(this.level.tiles[ty2][tx2])) {
      t.y = ny;
    }
  }

  update(dt) {
    if (this.status !== "play") return;
    this.time += dt;
    // Click-to-walk target.
    if (this.input.clickTile) {
      const from = { x: Math.floor(this.thief.x / TILE), y: Math.floor(this.thief.y / TILE) };
      const path = pathTo(this.level, from, this.input.clickTile);
      if (path) {
        this.thief.path = path;
        this.thief.pathIndex = 0;
      }
      this.input.clickTile = null;
    }
    if (this.input.throwQueued) {
      this.input.throwQueued = false;
      this.throwPebble();
    }
    if (this.input.pressed.has("mute")) {
      this.input.pressed.delete("mute");
      this.sound.toggleMute();
    }
    this.moveThief(dt);
    for (const g of this.guards) updateGuard(g, dt, { thief: this.thief, level: this.level });
    this.maxAlert = Math.max(0, ...this.guards.map((g) => g.alert));
    // Expanding pebble rings fade out.
    for (const ring of this.rings) ring.age += dt;
    this.rings = this.rings.filter((r) => r.age < r.life);
    // Relic pickup.
    for (const r of this.level.relics) {
      if (r.taken) continue;
      if (dist(this.thief.x, this.thief.y, (r.x + 0.5) * TILE, (r.y + 0.5) * TILE) < TILE * 0.6) {
        r.taken = true;
        this.sound.relic();
        const left = this.level.relics.filter((x) => !x.taken).length;
        this.caption =
          left === 0
            ? "Every relic is yours — the exit stands open. Go!"
            : `Relic taken. ${left} left — stay out of the light.`;
      }
    }
    // Exit: only open once every relic is taken.
    const allTaken = this.level.relics.every((r) => r.taken);
    if (allTaken) {
      const ex = this.level.exit;
      if (dist(this.thief.x, this.thief.y, (ex.x + 0.5) * TILE, (ex.y + 0.5) * TILE) < TILE * 0.7) {
        this.sound.clear();
        this.status = this.levelIndex + 1 >= LEVELS.length ? "win" : "clear";
        return;
      }
    }
    // Caught?
    for (const g of this.guards) {
      if (guardCaught(g, this.thief)) {
        this.lives--;
        this.sound.caught();
        if (this.lives <= 0) {
          this.status = "over";
        } else {
          this.resetAfterCaught();
        }
        return;
      }
    }
    // Spotted sting the moment the meter crosses into SPOTTED.
    if (this.maxAlert >= 75 && !this._stingPlayed) {
      this._stingPlayed = true;
      this.sound.spotted();
    } else if (this.maxAlert < 60) {
      this._stingPlayed = false;
    }
  }

  handleMenuKeys() {
    if (this.input.pressed.has("enter")) {
      this.input.pressed.delete("enter");
      if (this.status === "title") {
        this.status = "play";
      } else if (this.status === "clear") {
        this.loadLevel(this.levelIndex + 1);
        this.status = "play";
      }
    }
    if (this.input.pressed.has("restart")) {
      this.input.pressed.delete("restart");
      if (this.status === "over" || this.status === "win") {
        this.lives = 3;
        this.loadLevel(this.status === "win" ? 0 : this.levelIndex);
        this.status = "play";
      }
    }
    if (this.input.pressed.has("mute")) {
      this.input.pressed.delete("mute");
      this.sound.toggleMute();
    }
  }

  draw() {
    drawGame(this.ctx, this);
  }

  frame(dt) {
    this.handleMenuKeys();
    this.update(dt);
    this.draw();
  }
}

/** Start the game on a canvas. In shot mode (?shot=<name>) render one
 *  deterministic scene and stop; otherwise run the animation loop. */
export function boot(canvas) {
  const game = new Game(canvas);
  const params = new URLSearchParams(window.location.search);
  const shot = params.get("shot");
  if (shot) {
    game.status = "play";
    applyShot(game, shot);
    game.draw();
    window.__shotDone = true;
    window.__game = game;
    return game;
  }
  window.__game = game;
  let last = performance.now();
  function loop(now) {
    const dt = clamp((now - last) / 1000, 0, 0.05);
    last = now;
    game.frame(dt);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  return game;
}

// Auto-boot when loaded as the page's module script.
if (typeof document !== "undefined") {
  const canvas = document.getElementById("game");
  if (canvas) boot(canvas);
}
