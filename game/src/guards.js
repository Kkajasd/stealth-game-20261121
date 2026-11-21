// guards.js — guard patrols, vision cones and the detection model.
// A guard walks a waypoint loop, looking along its direction of travel. When
// the thief is inside the cone, in range and in line of sight, the guard's
// alert rises — faster up close, in lantern light and when the thief runs;
// slower when the thief sneaks or hides in a bush. At full alert the guard
// chases; lose sight of it for a while and the guard calms down and returns
// to its patrol.
import { angleDiff, angleOf, clamp, distance } from "./random.js";
import { hasLineOfSight, isWalkablePixel, lightAt, inBush, tileCenter, TILE } from "./levels.js";

export const CONE_RANGE = 215;
export const CONE_HALF_ANGLE = 0.62; // ~35.5 degrees each side
export const ALERT_SUSPICIOUS = 25;
export const ALERT_SPOTTED = 70;
export const ALERT_DECAY = 16; // alert lost per second while unseen
export const CHASE_SPEED = 2.1; // tiles per second while chasing

export function makeGuard(def, world) {
  const start = tileCenter(def.waypoints[0].col, def.waypoints[0].row);
  const next = tileCenter(def.waypoints[1].col, def.waypoints[1].row);
  return {
    x: start.x,
    y: start.y,
    facing: angleOf(next.x - start.x, next.y - start.y),
    waypointIndex: 1,
    speed: def.speed,
    alert: 0,
    state: "patrol", // patrol | suspicious | chase
    chaseTimer: 0,
    seenTimer: 0,
    waypoints: def.waypoints,
  };
}

// How visible the thief is to one guard right now, 0 (invisible) to 1.
// Zero when out of range, outside the cone, behind a wall, or when the
// guard is not looking — a guard never sees through crates or walls.
export function computeVisibility(world, guard, thief) {
  const d = distance(guard.x, guard.y, thief.x, thief.y);
  if (d > CONE_RANGE) return 0;
  const toThief = angleOf(thief.x - guard.x, thief.y - guard.y);
  if (Math.abs(angleDiff(toThief, guard.facing)) > CONE_HALF_ANGLE) return 0;
  if (!hasLineOfSight(world, guard.x, guard.y, thief.x, thief.y)) return 0;
  // Close is dangerous, far is forgiving.
  let vis = 1 - (d / CONE_RANGE) * 0.65;
  if (lightAt(world, thief.x, thief.y)) vis *= 1.5;
  if (inBush(world, thief.x, thief.y)) vis *= 0.22;
  if (thief.sneaking) vis *= 0.55;
  if (thief.movingFast) vis *= 1.15;
  return clamp(vis, 0, 1);
}

// Advance one guard by dt seconds. Returns "caught" when the guard reaches
// the thief while chasing, otherwise null.
export function updateGuard(world, guard, thief, dt) {
  const vis = computeVisibility(world, guard, thief);
  if (vis > 0) {
    guard.alert = clamp(guard.alert + vis * 62 * dt, 0, 100);
    guard.seenTimer = 0;
  } else {
    guard.alert = clamp(guard.alert - ALERT_DECAY * dt, 0, 100);
    guard.seenTimer += dt;
  }

  if (guard.alert >= ALERT_SPOTTED) {
    guard.state = "chase";
    guard.chaseTimer = 0;
  } else if (guard.alert >= ALERT_SUSPICIOUS) {
    if (guard.state === "patrol") guard.state = "suspicious";
    // A suspicious guard turns toward the last thing it saw.
    if (vis > 0) {
      const want = angleOf(thief.x - guard.x, thief.y - guard.y);
      guard.facing += clamp(angleDiff(want, guard.facing), -2.4 * dt, 2.4 * dt);
    }
  } else if (guard.state !== "patrol" && guard.seenTimer > 2.5) {
    guard.state = "patrol";
  }

  if (guard.state === "chase") {
    // Run at the thief; give up and go back to patrol after 4 seconds of
    // seeing nothing.
    guard.chaseTimer += dt;
    const d = distance(guard.x, guard.y, thief.x, thief.y);
    if (d < TILE * 0.55) return "caught";
    if (guard.chaseTimer > 4 && vis === 0) {
      guard.state = "patrol";
      guard.alert = ALERT_SUSPICIOUS;
      guard.chaseTimer = 0;
    } else {
      moveToward(world, guard, thief.x, thief.y, CHASE_SPEED * TILE * dt);
      guard.facing = angleOf(thief.x - guard.x, thief.y - guard.y);
    }
    return null;
  }

  if (guard.state === "suspicious") return null; // stands and looks

  // Patrol: walk to the next waypoint, then turn to the one after it.
  const target = tileCenter(guard.waypoints[guard.waypointIndex].col, guard.waypoints[guard.waypointIndex].row);
  const d = distance(guard.x, guard.y, target.x, target.y);
  const step = guard.speed * TILE * dt;
  if (d <= Math.max(step, 3)) {
    guard.x = target.x;
    guard.y = target.y;
    guard.waypointIndex = (guard.waypointIndex + 1) % guard.waypoints.length;
    const after = tileCenter(
      guard.waypoints[guard.waypointIndex].col,
      guard.waypoints[guard.waypointIndex].row,
    );
    guard.facing = angleOf(after.x - guard.x, after.y - guard.y);
  } else {
    moveToward(world, guard, target.x, target.y, step);
    guard.facing = angleOf(target.x - guard.x, target.y - guard.y);
  }
  return null;
}

// Move toward a point, sliding along walls instead of stopping dead.
function moveToward(world, guard, tx, ty, step) {
  const dx = tx - guard.x;
  const dy = ty - guard.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 0.001) return;
  const nx = guard.x + (dx / len) * step;
  const ny = guard.y + (dy / len) * step;
  const radius = 12;
  if (isWalkablePixel(world, nx, guard.y) &&
      isWalkablePixel(world, nx + Math.sign(dx) * radius, guard.y)) {
    guard.x = nx;
  }
  if (isWalkablePixel(world, guard.x, ny) &&
      isWalkablePixel(world, guard.x, ny + Math.sign(dy) * radius)) {
    guard.y = ny;
  }
}

// The highest alert of any guard: what the HUD meter shows.
export function maxAlert(guards) {
  let m = 0;
  for (const g of guards) if (g.alert > m) m = g.alert;
  return m;
}

export function alertLabel(alert) {
  if (alert >= ALERT_SPOTTED) return "SPOTTED";
  if (alert >= ALERT_SUSPICIOUS) return "SUSPICIOUS";
  return "HIDDEN";
}
