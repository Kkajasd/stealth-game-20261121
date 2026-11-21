// guards.js — the watchmen of The Lantern Thief.
//
// A guard walks a patrol loop, pauses at each waypoint and scans the room.
// Its vision cone reaches CONE_RANGE pixels in a CONE_FOV arc around where it
// faces. When the thief is inside the cone with a clear line of sight, the
// guard's alert rises — faster up close, faster when the thief runs or stands
// in lantern light, slower when the thief sneaks or hides in shadow or bush.
// At full alert the guard gives chase; lose it for a while and it searches
// the last place it saw you, then goes back to its patrol. Loud running
// footsteps within earshot make a guard suspicious and draw it to listen.

const CONE_RANGE = 5.2 * TILE;
const CONE_FOV = (78 * Math.PI) / 180;
const HEAR_RANGE = 4.2 * TILE;
const CATCH_RANGE = 26;
const CHASE_SPEED = 2.35;
const SEARCH_TIME = 4.0;

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// Is the thief visible to this guard right now? Returns a visibility factor
// 0..1 (0 = unseen). The caller turns it into an alert rate.
function guardSeesThief(guard, thief, grid) {
  const dx = thief.x - guard.x;
  const dy = thief.y - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist > CONE_RANGE) return 0;
  const toThief = Math.atan2(dy, dx);
  if (Math.abs(angleDiff(toThief, guard.facing)) > CONE_FOV / 2) return 0;
  if (!hasLineOfSight(grid, guard.x, guard.y, thief.x, thief.y)) return 0;
  // Closer is easier to spot; distance falls off toward the cone's edge.
  let vis = 1 - (dist / CONE_RANGE) * 0.65;
  // The thief's own state changes how easy they are to spot.
  if (thief.sneaking) vis *= 0.45;
  if (thief.running) vis *= 1.6;
  const under = tileAt(grid, thief.x, thief.y);
  if (isDarkTile(under)) vis *= 0.45;
  if (isLitTile(under)) vis *= 1.35;
  return Math.max(0, Math.min(1.4, vis));
}

function makeGuard(def, rand) {
  const start = def.waypoints[0];
  return {
    waypoints: def.waypoints,
    speed: def.speed,
    x: start[0] * TILE + TILE / 2,
    y: start[1] * TILE + TILE / 2,
    facing: rand() * Math.PI * 2,
    waypointIndex: 1,
    pauseLeft: 0,
    state: "patrol",
    alert: 0,
    lastSeen: null,
    loseTimer: 0,
    searchTimer: 0,
    scanDir: 1,
    heard: null,
    stepPhase: rand() * Math.PI * 2,
  };
}

function guardTarget(guard) {
  const wp = guard.waypoints[guard.waypointIndex];
  return { x: wp[0] * TILE + TILE / 2, y: wp[1] * TILE + TILE / 2 };
}

// Move toward a point at speed tiles/sec, sliding along walls.
function guardStepToward(guard, tx, ty, speed, dt, grid) {
  const dx = tx - guard.x;
  const dy = ty - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 2) return true;
  const step = speed * TILE * dt;
  const nx = guard.x + (dx / dist) * Math.min(step, dist);
  const ny = guard.y + (dy / dist) * Math.min(step, dist);
  const r = 14;
  if (!solidAt(grid, nx + Math.sign(dx) * r, guard.y) && !solidAt(grid, nx - Math.sign(dx) * r, guard.y)) {
    guard.x = nx;
  }
  if (!solidAt(grid, guard.x, ny + Math.sign(dy) * r) && !solidAt(grid, guard.x, ny - Math.sign(dy) * r)) {
    guard.y = ny;
  }
  guard.facing = Math.atan2(dy, dx);
  guard.stepPhase += dt * 9;
  return Math.hypot(tx - guard.x, ty - guard.y) < 4;
}

// One simulation step for a guard. Returns an event string for the game:
// "spotted" when a chase starts, "lost" when a chase is given up, else null.
function updateGuard(guard, thief, grid, dt, sound) {
  const vis = guardSeesThief(guard, thief, grid);
  let event = null;

  if (vis > 0) {
    // Alert rises with visibility; a thief in the open at close range is
    // caught out in about a second, a sneaking one in the dark much slower.
    guard.alert = Math.min(100, guard.alert + vis * 62 * dt);
    guard.lastSeen = { x: thief.x, y: thief.y };
    guard.loseTimer = 0;
  } else {
    guard.alert = Math.max(0, guard.alert - 16 * dt);
  }

  // Loud running nearby draws a patrolling guard to listen.
  if (thief.running && thief.moving) {
    const d = Math.hypot(thief.x - guard.x, thief.y - guard.y);
    if (d < HEAR_RANGE && guard.state === "patrol") {
      guard.heard = { x: thief.x, y: thief.y };
      guard.state = "suspicious";
      guard.searchTimer = 2.0;
    }
  }

  if (guard.alert >= 100 && guard.state !== "chase") {
    guard.state = "chase";
    event = "spotted";
    if (sound) sound.sting();
  }

  if (guard.state === "patrol") {
    if (guard.pauseLeft > 0) {
      // Paused at a waypoint: slowly scan the room left and right.
      guard.pauseLeft -= dt;
      guard.facing += guard.scanDir * 0.9 * dt;
      if (guard.pauseLeft <= 0) guard.scanDir *= -1;
    } else {
      const target = guardTarget(guard);
      if (guardStepToward(guard, target.x, target.y, guard.speed, dt, grid)) {
        guard.waypointIndex = (guard.waypointIndex + 1) % guard.waypoints.length;
        guard.pauseLeft = 0.9 + Math.random() * 0.8;
      }
    }
    if (guard.heard) {
      guard.state = "suspicious";
      guard.searchTimer = 2.0;
    }
  } else if (guard.state === "suspicious") {
    const target = guard.heard || guard.lastSeen;
    if (target) {
      if (guardStepToward(guard, target.x, target.y, guard.speed * 1.25, dt, grid)) {
        guard.heard = null;
        guard.searchTimer -= dt;
        guard.facing += 1.6 * dt;
        if (guard.searchTimer <= 0) {
          guard.state = "patrol";
          guard.alert = Math.max(0, guard.alert - 30);
        }
      }
    } else {
      guard.state = "patrol";
    }
  } else if (guard.state === "chase") {
    if (vis > 0) {
      guardStepToward(guard, thief.x, thief.y, CHASE_SPEED, dt, grid);
      guard.loseTimer = 0;
    } else {
      guard.loseTimer += dt;
      if (guard.lastSeen) {
        guardStepToward(guard, guard.lastSeen.x, guard.lastSeen.y, CHASE_SPEED * 0.9, dt, grid);
      }
      if (guard.loseTimer > 3.0) {
        guard.state = "search";
        guard.searchTimer = SEARCH_TIME;
        event = "lost";
      }
    }
  } else if (guard.state === "search") {
    guard.searchTimer -= dt;
    guard.facing += 1.8 * dt;
    if (guard.searchTimer <= 0) {
      guard.state = "patrol";
      guard.alert = 25;
    }
  }
  return event;
}
