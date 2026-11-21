// shots.js — deterministic staged scenes for the screenshots.
// ?shot=cover|patrol|alarm|exit&seed=1 renders one fixed frame: the level,
// the thief, every guard's position and facing, the alert and the clock are
// all pinned down, so the same URL always renders the same pixels. The
// scenes are staged to show the game at its best: the cover shows all four
// stealth elements (level, vision cone, cover, exit) in one readable frame.
import { parseLevel, tileCenter, LEVELS } from "./levels.js";
import { makeGuard } from "./guards.js";

export const SHOTS = ["cover", "patrol", "alarm", "exit"];

function stagedGuard(world, def, col, row, facing, alert, state) {
  const guard = makeGuard(def, world);
  const c = tileCenter(col, row);
  guard.x = c.x;
  guard.y = c.y;
  guard.facing = facing;
  guard.alert = alert;
  guard.state = state;
  return guard;
}

function baseState(levelIndex, time, message) {
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
    time,
    alert: 0,
    status: "playing",
    message,
    exitOpen: false,
  };
}

// Build the staged state for one named shot. Returns null for an unknown
// shot name, so the caller can fall back to the live game.
export function makeShotState(shot, levelOverride) {
  if (shot === "cover") {
    const s = baseState(0, 47, LEVELS[0].caption);
    // Thief crouched in the bush at (21,2); a guard's cone sweeps right
    // across it; a second guard patrols below; relics and the locked exit
    // are all in the same frame.
    const bush = tileCenter(21, 2);
    s.thief.x = bush.x;
    s.thief.y = bush.y;
    s.thief.facing = Math.PI / 2;
    s.thief.sneaking = true;
    const g0 = stagedGuard(s.world, s.world.guards[0], 17, 2, 0, 12, "patrol");
    const g1 = stagedGuard(s.world, s.world.guards[1], 18, 11, -Math.PI / 2, 4, "patrol");
    s.guards = [g0, g1];
    s.relicsTaken = 1;
    s.world.relics[0].taken = true;
    s.alert = 12;
    return s;
  }
  if (shot === "patrol") {
    const s = baseState(1, 32, LEVELS[1].caption);
    // Three guards mid-patrol, cones pointing three ways, dotted patrol
    // routes under them; the thief sneaks along the top wall.
    const thief = tileCenter(19, 2);
    s.thief.x = thief.x;
    s.thief.y = thief.y;
    s.thief.facing = Math.PI;
    s.thief.sneaking = true;
    const g0 = stagedGuard(s.world, s.world.guards[0], 20, 4, Math.PI / 2, 8, "patrol");
    const g1 = stagedGuard(s.world, s.world.guards[1], 11, 11, 0, 18, "suspicious");
    const g2 = stagedGuard(s.world, s.world.guards[2], 15, 15, -Math.PI / 2, 3, "patrol");
    s.guards = [g0, g1, g2];
    s.relicsTaken = 1;
    s.world.relics[0].taken = true;
    s.alert = 18;
    return s;
  }
  if (shot === "alarm") {
    const s = baseState(0, 12, "Spotted! Break the line of sight — hide in the dark, not the light.");
    // A near-miss turned into a chase: the guard's red cone is right on
    // the thief, who is sprinting for the bush at (21,2).
    const thief = tileCenter(18, 3);
    s.thief.x = thief.x;
    s.thief.y = thief.y;
    s.thief.facing = Math.PI / 4;
    s.thief.movingFast = true;
    const g0 = stagedGuard(s.world, s.world.guards[0], 14, 3, 0.3, 88, "chase");
    const g1 = stagedGuard(s.world, s.world.guards[1], 18, 11, -Math.PI / 2, 30, "suspicious");
    s.guards = [g0, g1];
    s.relicsTaken = 1;
    s.world.relics[0].taken = true;
    s.alert = 88;
    return s;
  }
  if (shot === "exit") {
    const s = baseState(2, 88, LEVELS[2].caption);
    // Every relic taken, the vault door open and glowing, the thief one
    // dash away — the last guard is looking the other way.
    for (const relic of s.world.relics) relic.taken = true;
    s.relicsTaken = s.world.relics.length;
    s.exitOpen = true;
    const thief = tileCenter(22, 14);
    s.thief.x = thief.x;
    s.thief.y = thief.y;
    s.thief.facing = 0;
    const g0 = stagedGuard(s.world, s.world.guards[0], 12, 3, Math.PI, 6, "patrol");
    const g1 = stagedGuard(s.world, s.world.guards[1], 12, 9, Math.PI / 2, 10, "patrol");
    const g2 = stagedGuard(s.world, s.world.guards[2], 16, 13, -Math.PI / 2, 2, "patrol");
    const g3 = stagedGuard(s.world, s.world.guards[3], 18, 16, Math.PI, 5, "patrol");
    s.guards = [g0, g1, g2, g3];
    s.alert = 10;
    return s;
  }
  if (levelOverride !== undefined && levelOverride >= 0 && levelOverride < LEVELS.length) {
    return baseState(levelOverride, 30, LEVELS[levelOverride].caption);
  }
  return null;
}
