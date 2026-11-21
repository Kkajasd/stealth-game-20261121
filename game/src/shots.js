// shots.js — deterministic screenshot scenes for The Lantern Thief.
//
// Each shot stages level 1 into one frozen moment: fixed positions,
// fixed alert values, a fixed clock. Nothing here rolls dice, so the
// same shot always paints the same pixels — screenshots are reproducible
// real renders of the game's own code.
//
//   cover    — the thief mid-grab of a relic as a cone sweeps across,
//              all four stealth elements in one frame
//   distract — a pebble's sound ring pulls a guard to investigate
//   alarm    — SPOTTED: a guard's red cone is right on the thief
//   exit     — every relic taken, the exit stands open

import { TILE } from "./levels.js";

function placeGuard(game, i, tx, ty, dir, alert, state) {
  const g = game.guards[i];
  if (!g) return;
  g.x = (tx + 0.5) * TILE;
  g.y = (ty + 0.5) * TILE;
  g.dir = dir;
  g.alert = alert;
  g.state = state;
  g.lookTimer = 0;
  g.path = null;
}

function placeThief(game, tx, ty, dir, sneaking) {
  game.thief.x = (tx + 0.5) * TILE;
  game.thief.y = (ty + 0.5) * TILE;
  game.thief.dir = dir;
  game.thief.sneaking = sneaking;
  game.thief.running = false;
  game.thief.path = null;
}

function takeRelics(game, count) {
  game.level.relics.forEach((r, i) => {
    r.taken = i < count;
  });
}

export function applyShot(game, name) {
  game.loadLevel(0);
  game.status = "play";
  game.lives = 3;
  game.rings = [];
  const shots = {
    cover() {
      // The thief, crouched beside the glowing relic, as a guard's bright
      // amber cone sweeps right across. Exit locked, bottom-right.
      takeRelics(game, 1);
      placeThief(game, 15, 2, 0, true);
      placeGuard(game, 0, 12, 3, -0.32, 45, "suspicious");
      placeGuard(game, 1, 14, 7, -2.2, 18, "patrol");
      game.time = 47;
      game.caption = "One relic down — the cone is sweeping your way.";
    },
    distract() {
      // The pebble has just landed: its ring expands, the guard turns
      // toward the noise, and the thief slips past behind the bush.
      takeRelics(game, 1);
      placeThief(game, 8, 6, 0.5, true);
      placeGuard(game, 0, 13, 5, Math.PI, 40, "investigate");
      placeGuard(game, 1, 15, 8, -1.2, 12, "patrol");
      game.rings = [{ x: 11.5, y: 5.5, age: 0.45, life: 0.9, maxR: 4.5 }];
      game.time = 63;
      game.caption = "Clink! The guard turns toward the noise — slip past.";
    },
    alarm() {
      // SPOTTED: the guard is two tiles away, red cone on the thief,
      // the meter maxed. Break line of sight or lose a life.
      takeRelics(game, 2);
      placeThief(game, 10, 4, 0, false);
      game.thief.running = true;
      placeGuard(game, 0, 8, 4, 0, 92, "chase");
      placeGuard(game, 1, 15, 6, 2.6, 60, "suspicious");
      game.time = 88;
      game.caption = "SPOTTED! Break line of sight — hide in the dark.";
    },
    exit() {
      // Every relic taken, the exit glowing open, the guards far away.
      takeRelics(game, 3);
      placeThief(game, 16, 10, 0, false);
      placeGuard(game, 0, 3, 3, Math.PI, 5, "patrol");
      placeGuard(game, 1, 14, 2, -Math.PI / 2, 10, "patrol");
      game.time = 92;
      game.caption = "Every relic is yours — the exit stands open. Go!";
    },
  };
  const fn = shots[name];
  if (!fn) return false;
  fn();
  game.maxAlert = Math.max(0, ...game.guards.map((g) => g.alert));
  return true;
}

export const SHOT_NAMES = ["cover", "distract", "alarm", "exit"];
