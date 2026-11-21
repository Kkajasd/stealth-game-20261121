// main.js — the game loop and state machine of The Lantern Thief.
// With ?shot= in the URL the page renders one deterministic staged frame
// and stops (that is how the screenshots are taken). Without it, the live
// game runs: move, sneak, collect every relic, reach the exit unseen.
import { parseLevel, tileCenter, LEVELS, TILE, colOf, rowOf } from "./levels.js";
import { makeGuard, updateGuard, maxAlert, alertLabel } from "./guards.js";
import { renderGame, CANVAS_W, CANVAS_H, HUD_H } from "./render.js";
import { makeInput, bindInput, keyDirection, findPath, pixelToTile, moveThief } from "./input.js";
import { ensureAudio, playStep, playRelic, playSpotted, playCaught, playLevelClear, setMuted, isMuted } from "./audio.js";
import { makeShotState } from "./shots.js";

const WALK_SPEED = 3.4; // tiles per second
const SNEAK_SPEED = 1.8;
const STEP_INTERVAL = 0.34;

export function newGameState(levelIndex) {
  const def = LEVELS[levelIndex];
  const world = parseLevel(def);
  const spawn = tileCenter(world.spawn.col, world.spawn.row);
  return {
    levelIndex,
    world,
    thief: { x: spawn.x, y: spawn.y, facing: 0, sneaking: false, movingFast: false },
    guards: world.guards.map((g) => makeGuard(g, world)),
    relicsTaken: 0,
    lives: 3,
    time: 0,
    alert: 0,
    status: "playing", // playing | complete | won | over
    message: def.caption,
    exitOpen: false,
    stepTimer: 0,
    wasSpotted: false,
  };
}

function respawn(state) {
  const spawn = tileCenter(state.world.spawn.col, state.world.spawn.row);
  state.thief.x = spawn.x;
  state.thief.y = spawn.y;
  state.thief.facing = 0;
  for (const guard of state.guards) {
    guard.alert = 0;
    guard.state = "patrol";
    guard.chaseTimer = 0;
    const start = tileCenter(guard.waypoints[0].col, guard.waypoints[0].row);
    guard.x = start.x;
    guard.y = start.y;
    guard.waypointIndex = 1;
  }
  state.alert = 0;
  state.message = state.world.caption;
}

function updatePlaying(state, input, dt) {
  const thief = state.thief;
  const speed = (input.sneak ? SNEAK_SPEED : WALK_SPEED) * TILE;
  thief.sneaking = input.sneak;
  thief.movingFast = !input.sneak;

  // Click-to-move: a click plans a path; keys override it.
  const dir = keyDirection(input);
  if (dir) {
    input.path = [];
    input.clickTarget = null;
    moveThief(state.world, thief, dir.x * speed * dt, dir.y * speed * dt);
    thief.facing = Math.atan2(dir.y, dir.x);
    thief.movingFast = true;
  } else if (input.clickTarget) {
    const tile = pixelToTile(input.clickTarget.x, input.clickTarget.y);
    if (tile) {
      input.path = findPath(state.world, colOf(thief.x), rowOf(thief.y), tile.col, tile.row);
      input.clickTarget = null;
    } else {
      input.clickTarget = null;
    }
  }
  if (input.path.length > 0) {
    const target = input.path[0];
    const dx = target.x - thief.x;
    const dy = target.y - thief.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    const step = speed * dt;
    if (d <= step) {
      thief.x = target.x;
      thief.y = target.y;
      input.path.shift();
    } else {
      moveThief(state.world, thief, (dx / d) * step, (dy / d) * step);
      thief.facing = Math.atan2(dy, dx);
    }
  }

  // Footsteps, quieter while sneaking.
  state.stepTimer -= dt;
  if ((dir || input.path.length > 0) && state.stepTimer <= 0) {
    playStep(input.sneak);
    state.stepTimer = STEP_INTERVAL * (input.sneak ? 1.6 : 1);
  }

  // Guards: patrol, suspect, chase — and catch.
  for (const guard of state.guards) {
    const result = updateGuard(state.world, guard, thief, dt);
    if (result === "caught") {
      state.lives -= 1;
      playCaught();
      if (state.lives <= 0) {
        state.status = "over";
        state.message = "Caught for the last time — the lanterns win this night. Press N for a new game.";
      } else {
        state.message = "Caught! A life lost — the guards settle back to their patrols.";
        respawn(state);
      }
      return;
    }
  }
  state.alert = maxAlert(state.guards);
  if (state.alert >= 70 && !state.wasSpotted) {
    playSpotted();
    state.wasSpotted = true;
  }
  if (state.alert < 25) state.wasSpotted = false;

  // Relics: walk over one to take it; the exit opens on the last.
  for (const relic of state.world.relics) {
    if (relic.taken) continue;
    const c = tileCenter(relic.col, relic.row);
    if (Math.abs(thief.x - c.x) < 26 && Math.abs(thief.y - c.y) < 26) {
      relic.taken = true;
      state.relicsTaken += 1;
      playRelic();
      if (state.relicsTaken === state.world.relics.length) {
        state.exitOpen = true;
        state.message = "Every relic is yours — the exit is open. Run for it, unseen.";
      }
      break;
    }
  }

  // The exit: only open once every relic is taken.
  if (state.exitOpen && state.world.exit) {
    const c = tileCenter(state.world.exit.col, state.world.exit.row);
    if (Math.abs(thief.x - c.x) < 26 && Math.abs(thief.y - c.y) < 26) {
      playLevelClear();
      if (state.levelIndex + 1 < LEVELS.length) {
        state.status = "complete";
        state.message = `Level clear — ${state.relicsTaken} relics, ${Math.floor(state.time)}s. Press R for the next level.`;
      } else {
        state.status = "won";
        state.message = `The Lantern Thief vanishes into the night — all ${state.relicsTaken} relics, ${Math.floor(state.time)}s. Press N to play again.`;
      }
    }
  }
}

function boot() {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const params = new URLSearchParams(window.location.search);

  // Screenshot mode: one deterministic frame, then stop.
  if (params.has("shot")) {
    const shot = makeShotState(params.get("shot"));
    if (shot) {
      renderGame(ctx, shot, shot.time);
      window.__shotReady = true;
      document.title = `The Lantern Thief — ${params.get("shot")}`;
      return;
    }
  }

  const input = makeInput();
  let state = newGameState(0);
  let paused = false;
  bindInput(input, canvas, (code) => {
    ensureAudio();
    if (code === "KeyM") setMuted(!isMuted());
    if (code === "KeyP") paused = !paused;
    if (code === "KeyR") {
      if (state.status === "complete") {
        state = newGameState(state.levelIndex + 1);
      } else {
        state = newGameState(state.levelIndex);
      }
    }
    if (code === "KeyN") state = newGameState(0);
  });
  canvas.addEventListener("mousedown", ensureAudio);

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!paused && state.status === "playing") {
      state.time += dt;
      updatePlaying(state, input, dt);
    }
    renderGame(ctx, state, state.time);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  window.__game = { get state() { return state; }, newGameState };
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
}

export { alertLabel };
