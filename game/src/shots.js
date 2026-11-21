// shots.js — frozen scenes for the entry's screenshots.
//
// ?shot=<name> loads a level, places the thief and the guards at fixed tiles,
// sets the alert and the relics, and renders one frame. The scenes are fully
// deterministic (no randomness, no clock): the same shot always renders the
// same picture, and every shot is a real render of the game's own code.
//
//   cover  — level 1: the thief crouched by the bushes as a guard's cone sweeps past
//   patrol — level 2: three guards on patrol, the thief waiting in the dark
//   alarm  — level 1: the thief caught at the edge of a cone, alarm nearly full
//   exit   — level 3: every relic taken, the exit open, the thief slipping out

function tileCenter(tx, ty) {
  return { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 };
}

function placeGuard(game, i, tx, ty, facing, state, alert) {
  const guard = game.guards[i];
  if (!guard) return;
  const at = tileCenter(tx, ty);
  guard.x = at.x;
  guard.y = at.y;
  guard.facing = facing;
  guard.state = state || "patrol";
  guard.alert = alert || 0;
  guard.pauseLeft = 0;
}

function placePlayer(game, tx, ty, facing, sneaking) {
  const at = tileCenter(tx, ty);
  game.player.x = at.x;
  game.player.y = at.y;
  game.player.facing = facing;
  game.player.sneaking = sneaking;
  game.player.moving = false;
  game.player.running = false;
}

function setHud(game, alert, relicsGot) {
  game.topAlert = alert;
  game.hud = {
    levelName: game.level.name,
    relicsGot: relicsGot,
    relicsTotal: game.relics.length,
    alert: alert,
    lives: game.lives,
    timeText: formatTime(game.levelTime),
  };
}

function applyShot(game, name) {
  if (name === "cover") {
    startLevel(game, 0);
    placePlayer(game, 7, 6, Math.PI, true);
    placeGuard(game, 0, 12, 5, 2.94, "patrol", 15);
    placeGuard(game, 1, 16, 7, Math.PI, "patrol", 0);
    game.relics[0].taken = true;
    game.levelTime = 47;
    game.hint = "A cone sweeps past the bushes — hold still, then slip through.";
    setHud(game, 15, 1);
  } else if (name === "patrol") {
    startLevel(game, 1);
    placePlayer(game, 2, 8, 0, true);
    placeGuard(game, 0, 5, 2, 0, "patrol", 0);
    placeGuard(game, 1, 14, 9, Math.PI, "patrol", 0);
    placeGuard(game, 2, 13, 5, Math.PI / 2, "patrol", 0);
    game.levelTime = 83;
    game.hint = "Three guards walk the gallery. Learn the patrol, then move.";
    setHud(game, 0, 0);
  } else if (name === "alarm") {
    startLevel(game, 0);
    placePlayer(game, 9, 4, Math.PI / 2, false);
    placeGuard(game, 0, 9, 7, -Math.PI / 2, "chase", 100);
    placeGuard(game, 1, 16, 7, Math.PI, "suspicious", 55);
    game.relics[0].taken = true;
    game.relics[1].taken = true;
    game.levelTime = 112;
    game.hint = "Spotted! Break the line of sight and the alarm will fade.";
    setHud(game, 100, 2);
  } else if (name === "exit") {
    startLevel(game, 2);
    game.relics.forEach(function (relic) {
      relic.taken = true;
    });
    game.exitOpen = true;
    placePlayer(game, 15, 10, 0, false);
    placeGuard(game, 0, 9, 9, Math.PI, "patrol", 30);
    placeGuard(game, 1, 12, 2, Math.PI / 2, "patrol", 0);
    placeGuard(game, 2, 7, 5, 0, "patrol", 0);
    placeGuard(game, 3, 14, 8, -Math.PI / 2, "patrol", 0);
    game.levelTime = 198;
    game.hint = "Every relic is yours — reach the glowing exit!";
    setHud(game, 30, 5);
  } else {
    return false;
  }
  game.phase = "shot";
  return true;
}
