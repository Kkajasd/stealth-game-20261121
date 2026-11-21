// guards.js — guard senses, patrols and states for The Lantern Thief.
//
// A guard walks a loop of waypoints and watches a vision cone. What it
// sees depends on distance, light, cover and how the thief moves:
//   - in the cone and in line of sight: the thief is visible
//   - closer is more visible; lantern light makes the thief easier to see
//   - a bush hides the thief (x0.22), sneaking makes it harder (x0.55),
//     running makes it easier (x1.25)
// Alert 0..100: rises while the thief is seen, falls while hidden.
//   <30  PATROL — walking the loop
//   30+ SUSPICIOUS — stops, turns to look, "?" over its head
//   75+ SPOTTED — chases the thief, "!" over its head; touching the
//        thief costs a life
// A pebble's noise pulls every guard in earshot to INVESTIGATE: it walks
// to the noise, looks around, then returns to its patrol.

import { angleDiff, clamp, dist } from "./random.js";
import { bfs, isWalkable, lineOfSight, TILE } from "./levels.js";

export const CONE_RANGE_TILES = 5.2;
export const CONE_HALF_ANGLE = (38 * Math.PI) / 180;
export const ALERT_RISE = 55; // alert points per second at full visibility
export const ALERT_FALL = 26; // alert points per second while hidden
export const NOISE_RADIUS_TILES = 4.5;

/** Create a guard's runtime state from its definition. Waypoints may be
 *  [x, y] arrays or {x, y} objects; both are normalised here so a guard
 *  can never be born with an undefined position. */
export function createGuard(def) {
  const wps = def.waypoints.map((w) =>
    Array.isArray(w) ? { x: w[0], y: w[1] } : { x: w.x, y: w.y }
  );
  const first = wps[0];
  return {
    waypoints: wps,
    speed: def.speed,
    x: (first.x + 0.5) * TILE,
    y: (first.y + 0.5) * TILE,
    dir: 0,
    wpIndex: 1 % def.waypoints.length,
    alert: 0,
    state: "patrol",
    lookTimer: 0,
    path: null,
    pathIndex: 0,
    investigateTarget: null,
    stuckTimer: 0,
  };
}

/** How visible the thief is to this guard right now, 0..1.
 *  0 means the guard cannot see the thief at all. */
export function visibility(guard, thief, level) {
  const gx = guard.x / TILE;
  const gy = guard.y / TILE;
  const tx = thief.x / TILE;
  const ty = thief.y / TILE;
  const d = dist(gx, gy, tx, ty);
  if (d > CONE_RANGE_TILES) return 0;
  const toThief = Math.atan2(ty - gy, tx - gx);
  if (Math.abs(angleDiff(toThief, guard.dir)) > CONE_HALF_ANGLE) return 0;
  if (!lineOfSight(level, gx, gy, tx, ty)) return 0;
  // Closer is more visible; at the edge of the cone barely so.
  let vis = 1 - d / CONE_RANGE_TILES;
  vis = 0.25 + 0.75 * vis;
  // Lantern light gives the thief away.
  for (const lamp of level.lanterns) {
    if (dist(tx, ty, lamp.x + 0.5, lamp.y + 0.5) < 2.2) {
      vis *= 1.35;
      break;
    }
  }
  // Bushes hide; sneaking helps; running hurts.
  const tile = level.tiles[Math.floor(ty)]?.[Math.floor(tx)];
  if (tile === "B") vis *= 0.22;
  if (thief.sneaking) vis *= 0.55;
  if (thief.running) vis *= 1.25;
  return clamp(vis, 0, 1);
}

/** Move a guard toward a pixel target, sliding along walls. */
function moveToward(guard, level, px, py, speed, dt) {
  const dx = px - guard.x;
  const dy = py - guard.y;
  const d = Math.hypot(dx, dy);
  if (d < 1) return true;
  const step = Math.min(d, speed * TILE * dt);
  const nx = guard.x + (dx / d) * step;
  const ny = guard.y + (dy / d) * step;
  // Axis-separated so the guard slides along walls instead of sticking.
  const tx = Math.floor(nx / TILE);
  const ty = Math.floor(guard.y / TILE);
  if (tx >= 0 && tx < level.w && isWalkable(level.tiles[ty][tx])) guard.x = nx;
  const tx2 = Math.floor(guard.x / TILE);
  const ty2 = Math.floor(ny / TILE);
  if (ty2 >= 0 && ty2 < level.h && isWalkable(level.tiles[ty2][tx2])) guard.y = ny;
  guard.dir = Math.atan2(dy, dx);
  return d <= 2;
}

/** Walk the guard along a BFS tile path. Returns true when it arrives. */
function followPath(guard, level, dt, speed) {
  if (!guard.path || guard.pathIndex >= guard.path.length) return true;
  const [tx, ty] = guard.path[guard.pathIndex];
  const px = (tx + 0.5) * TILE;
  const py = (ty + 0.5) * TILE;
  if (moveToward(guard, level, px, py, speed, dt)) guard.pathIndex++;
  return guard.pathIndex >= guard.path.length;
}

/** Send the guard to a tile via BFS; returns false when unreachable. */
function routeTo(guard, level, tx, ty) {
  const fx = Math.floor(guard.x / TILE);
  const fy = Math.floor(guard.y / TILE);
  const path = bfs(level, fx, fy, tx, ty);
  if (!path) return false;
  guard.path = path;
  guard.pathIndex = 0;
  return true;
}

/** A pebble lands: every guard in earshot goes to investigate the noise. */
export function applyNoise(guards, level, nx, ny) {
  for (const g of guards) {
    const d = dist(g.x / TILE, g.y / TILE, nx + 0.5, ny + 0.5);
    if (d > NOISE_RADIUS_TILES) continue;
    if (g.state === "chase") continue; // a chasing guard ignores pebbles
    g.state = "investigate";
    g.investigateTarget = { x: nx, y: ny };
    g.lookTimer = 0;
    routeTo(g, level, nx, ny);
  }
}

/** Advance one guard by dt seconds. ctx: { thief, level, time }. */
export function updateGuard(guard, dt, ctx) {
  const { thief, level } = ctx;
  const vis = visibility(guard, thief, level);
  if (vis > 0.05) {
    guard.alert = clamp(guard.alert + vis * ALERT_RISE * dt, 0, 100);
  } else {
    guard.alert = clamp(guard.alert - ALERT_FALL * dt, 0, 100);
  }

  if (guard.state === "chase") {
    // Chase the thief until the trail goes cold.
    if (guard.alert < 25) {
      guard.state = "patrol";
      guard.path = null;
      routeToPatrol(guard, level);
    } else {
      moveToward(guard, level, thief.x, thief.y, guard.speed * 1.45, dt);
    }
    return;
  }

  if (guard.state === "investigate") {
    const arrived = followPath(guard, level, dt, guard.speed * 1.25);
    if (arrived) {
      // Look around for a moment, then give up and go back to patrol.
      guard.lookTimer += dt;
      guard.dir += dt * 1.6;
      if (guard.lookTimer > 1.6) {
        guard.state = "patrol";
        guard.investigateTarget = null;
        routeToPatrol(guard, level);
      }
    }
    if (guard.alert >= 75) guard.state = "chase";
    return;
  }

  if (guard.state === "suspicious") {
    // Stop and stare at where the thief was seen.
    guard.lookTimer += dt;
    const toThief = Math.atan2(thief.y - guard.y, thief.x - guard.x);
    guard.dir += angleDiff(toThief, guard.dir) * Math.min(1, dt * 6);
    if (guard.alert >= 75) {
      guard.state = "chase";
    } else if (guard.alert < 18 || guard.lookTimer > 2.2) {
      guard.state = "patrol";
      guard.lookTimer = 0;
      routeToPatrol(guard, level);
    }
    return;
  }

  // PATROL: walk the waypoint loop.
  if (guard.alert >= 75) {
    guard.state = "chase";
    return;
  }
  if (guard.alert >= 30) {
    guard.state = "suspicious";
    guard.lookTimer = 0;
    return;
  }
  const wp = guard.waypoints[guard.wpIndex];
  const px = (wp.x + 0.5) * TILE;
  const py = (wp.y + 0.5) * TILE;
  if (moveToward(guard, level, px, py, guard.speed, dt)) {
    guard.wpIndex = (guard.wpIndex + 1) % guard.waypoints.length;
  }
}

/** Route the guard back to its nearest waypoint and resume the loop. */
function routeToPatrol(guard, level) {
  let best = 0;
  let bestD = Infinity;
  guard.waypoints.forEach((wp, i) => {
    const d = dist(guard.x / TILE, guard.y / TILE, wp.x + 0.5, wp.y + 0.5);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  });
  guard.wpIndex = best;
}

/** True when a chasing guard has caught the thief. */
export function guardCaught(guard, thief) {
  if (guard.state !== "chase") return false;
  return dist(guard.x, guard.y, thief.x, thief.y) < TILE * 0.55;
}
