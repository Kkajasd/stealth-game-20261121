// main.js — the game itself: boot, loop, movement, pickups, getting caught.
//
// Phases: "menu" (title, press any key or click to play), "playing",
// "caught" (a guard grabbed you — lose a life, retry the level),
// "clear" (level done — next level), "over" (no lives left), "won"
// (all three manors robbed). A "shot" phase renders one frozen scene for
// screenshots and never starts the loop.

const WALK_SPEED = 3.4 * TILE;
const SNEAK_SPEED = 1.9 * TILE;
const PLAYER_RADIUS = 13;

function makeGame(canvas) {
  const ctx = canvas.getContext("2d");
  const sound = makeSound();
  const input = makeInput(canvas);
  const game = {
    canvas: canvas,
    ctx: ctx,
    sound: sound,
    input: input,
    phase: "menu",
    levelIndex: 0,
    level: null,
    grid: null,
    player: null,
    guards: [],
    relics: [],
    exit: null,
    exitOpen: false,
    lives: 3,
    time: 0,
    levelTime: 0,
    score: 0,
    detections: 0,
    hint: "",
    lastFrame: 0,
    rand: mulberry32(20261121),
  };
  input.onKey = function (key) {
    sound.ensure();
    if (key === "m") {
      sound.toggleMute();
      return;
    }
    if (game.phase === "menu") {
      startLevel(game, 0);
    } else if (game.phase === "caught") {
      if (game.lives > 0) startLevel(game, game.levelIndex);
      else startLevel(game, 0);
    } else if (game.phase === "clear") {
      startLevel(game, game.levelIndex + 1);
    } else if (game.phase === "over" || game.phase === "won") {
      startLevel(game, 0);
    } else if (key === "r") {
      startLevel(game, game.levelIndex);
    } else if (key === "escape") {
      game.phase = "menu";
    }
  };
  input.onClick = function (px, py) {
    sound.ensure();
    if (game.phase === "menu") {
      startLevel(game, 0);
      return;
    }
    if (game.phase !== "playing") {
      input.onKey("enter");
      return;
    }
    const gx = px;
    const gy = py - PLAY_Y;
    if (!solidAt(game.grid, gx, gy)) {
      input.clickTarget = { x: gx, y: gy };
    }
  };
  return game;
}

function startLevel(game, levelIndex) {
  if (levelIndex >= LEVELS.length) {
    game.phase = "won";
    game.sound.win();
    return;
  }
  if (levelIndex === 0) {
    // A fresh run from the first manor: lives, score and time reset.
    game.lives = 3;
    game.score = 0;
    game.detections = 0;
    game.time = 0;
  }
  const level = LEVELS[levelIndex];
  const parsed = parseLevel(level);
  game.levelIndex = levelIndex;
  game.level = level;
  game.grid = parsed.grid;
  game.exit = parsed.exit;
  game.relics = parsed.relics;
  game.player = {
    x: parsed.player.x,
    y: parsed.player.y,
    facing: 0,
    sneaking: false,
    running: false,
    moving: false,
  };
  game.guards = level.guards.map(function (def) {
    return makeGuard(def, game.rand);
  });
  game.exitOpen = false;
  game.levelTime = 0;
  game.topAlert = 0;
  game.hud = {
    levelName: level.name,
    relicsGot: 0,
    relicsTotal: parsed.relics.length,
    alert: 0,
    lives: game.lives,
    timeText: "0:00",
  };
  game.hint = level.hint;
  game.phase = "playing";
  game.sound.click();
}

function movePlayer(game, dt) {
  const p = game.player;
  const input = game.input;
  input.update();
  let mx = input.moveX;
  let my = input.moveY;
  if ((mx === 0 && my === 0) && input.clickTarget) {
    const dx = input.clickTarget.x - p.x;
    const dy = input.clickTarget.y - p.y;
    const d = Math.hypot(dx, dy);
    if (d < 8) {
      input.clickTarget = null;
    } else {
      mx = dx / d;
      my = dy / d;
    }
  }
  p.moving = mx !== 0 || my !== 0;
  p.sneaking = input.sneaking && p.moving;
  // Normal pace is quick but loud and easy to spot; sneaking is slow, quiet
  // and hard to spot. That trade-off is the whole game.
  p.running = p.moving && !p.sneaking;
  const speed = p.sneaking ? SNEAK_SPEED : WALK_SPEED;
  if (p.moving) {
    p.facing = Math.atan2(my, mx);
    const nx = p.x + mx * speed * dt;
    const ny = p.y + my * speed * dt;
    const r = PLAYER_RADIUS;
    if (!solidAt(game.grid, nx + Math.sign(mx) * r, p.y) && !solidAt(game.grid, nx - Math.sign(mx) * r, p.y)) {
      p.x = nx;
    }
    if (!solidAt(game.grid, p.x, ny + Math.sign(my) * r) && !solidAt(game.grid, p.x, ny - Math.sign(my) * r)) {
      p.y = ny;
    }
    if (p.moving) game.sound.step(p.running);
  }
}

function updateGame(game, dt) {
  game.time += dt;
  game.levelTime += dt;
  movePlayer(game, dt);
  const p = game.player;
  // Pick up relics by walking over them.
  game.relics.forEach(function (relic) {
    if (!relic.taken && Math.hypot(relic.x - p.x, relic.y - p.y) < 30) {
      relic.taken = true;
      game.score += 100;
      game.sound.pickup();
      if (game.relics.every(function (r) {
        return r.taken;
      })) {
        game.exitOpen = true;
        game.hint = "Every relic is yours — reach the glowing exit!";
        game.sound.click();
      }
    }
  });
  // Update the guards; a chase starting is a detection against the score.
  let topAlert = 0;
  game.guards.forEach(function (guard) {
    const event = updateGuard(guard, p, game.grid, dt, game.sound);
    if (event === "spotted") game.detections += 1;
    if (guard.alert > topAlert) topAlert = guard.alert;
    // Caught: a chasing guard closes in and grabs the thief.
    if (guard.state === "chase" && Math.hypot(guard.x - p.x, guard.y - p.y) < CATCH_RANGE + 10) {
      game.lives -= 1;
      game.score = Math.max(0, game.score - 50);
      game.sound.caught();
      game.phase = game.lives <= 0 ? "over" : "caught";
    }
  });
  game.topAlert = topAlert;
  // Reach the open exit to clear the level.
  if (game.exitOpen && Math.hypot(game.exit.x - p.x, game.exit.y - p.y) < 34) {
    const timeBonus = Math.max(0, 300 - Math.floor(game.levelTime) * 2);
    game.score += 150 + timeBonus;
    game.phase = "clear";
    game.sound.win();
  }
  game.hud = {
    levelName: game.level.name,
    relicsGot: game.relics.filter(function (r) {
      return r.taken;
    }).length,
    relicsTotal: game.relics.length,
    alert: game.topAlert || 0,
    lives: game.lives,
    timeText: formatTime(game.levelTime),
  };
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return m + ":" + (s < 10 ? "0" : "") + s;
}

function frame(game, timestamp) {
  const dt = Math.min(0.05, (timestamp - game.lastFrame) / 1000 || 0.016);
  game.lastFrame = timestamp;
  if (game.phase === "playing") {
    updateGame(game, dt);
    drawScene(game.ctx, game, timestamp / 1000);
  } else if (game.phase === "menu") {
    drawMenu(game);
  } else if (game.phase === "caught") {
    drawScene(game.ctx, game, timestamp / 1000);
    drawCenterPanel(game.ctx, "CAUGHT!", [
      game.lives > 0
        ? "A guard grabbed you. " + game.lives + (game.lives === 1 ? " life" : " lives") + " left."
        : "That was your last life.",
      "Press any key to try the level again.",
    ], "#ff5a3c");
  } else if (game.phase === "clear") {
    drawScene(game.ctx, game, timestamp / 1000);
    drawCenterPanel(game.ctx, "LEVEL CLEAR", [
      "Every relic is yours. Score: " + game.score,
      game.levelIndex + 1 < LEVELS.length
        ? "Press any key for the next manor."
        : "Press any key for the final reckoning.",
    ], "#37d67a");
  } else if (game.phase === "over") {
    drawCenterPanel(game.ctx, "GAME OVER", [
      "The manor keeps its lanterns tonight.",
      "Score: " + game.score + " — press any key to try again.",
    ], "#ff5a3c");
  } else if (game.phase === "won") {
    drawCenterPanel(game.ctx, "THE VAULT IS YOURS", [
      "Three manors, every relic, unseen. Score: " + game.score,
      "Detections: " + game.detections + " — press any key to play again.",
    ], "#ffd65a");
  }
  if (game.phase !== "shot") {
    requestAnimationFrame(function (t) {
      frame(game, t);
    });
  }
}

function drawMenu(game) {
  // A quiet title scene: the first level, guards mid-patrol, thief waiting.
  if (!game.level) startLevel(game, 0);
  game.phase = "menu";
  const savedPhase = game.phase;
  drawScene(game.ctx, game, performance.now() / 1000);
  game.phase = savedPhase;
  drawCenterPanel(game.ctx, "THE LANTERN THIEF", [
    "Steal every glowing relic, then slip out the exit — unseen.",
    "WASD / arrows to move · Shift to sneak · click a tile to walk there",
    "Lantern light betrays you. Bushes and shadow hide you.",
    "",
    "Press any key or click to begin.",
  ], "#ffd65a");
}

function boot() {
  const canvas = document.getElementById("game");
  const game = makeGame(canvas);
  const params = new URLSearchParams(window.location.search);
  const shot = params.get("shot");
  if (shot) {
    // A frozen screenshot scene: set it up, render one frame, stop.
    game.phase = "shot";
    if (applyShot(game, shot)) {
      drawScene(game.ctx, game, 1.6);
    } else {
      document.body.textContent = "unknown shot: " + shot;
    }
    return;
  }
  game.lastFrame = performance.now();
  drawMenu(game);
  game.phase = "menu";
  requestAnimationFrame(function (t) {
    frame(game, t);
  });
}

window.addEventListener("DOMContentLoaded", boot);
