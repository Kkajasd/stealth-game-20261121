// levels.js — level definitions and grid logic for The Lantern Thief.
//
// Tile legend (20 columns x 12 rows, every row exactly 20 chars):
//   #  wall — blocks movement and sight
//   .  floor
//   C  crate — solid cover, blocks movement and sight
//   B  bush — walkable, hides the thief (visibility x0.22)
//   L  lantern — floor with a pool of light (visibility x1.35 nearby)
//   R  relic — collect it; the exit opens once all relics are taken
//   E  exit — locked until every relic is collected
//   S  thief spawn
//
// Guards patrol loops of waypoints. Every waypoint MUST be walkable:
// validateLevel() checks that, plus that the spawn can reach the exit
// and every relic (BFS), so a level can never soft-lock.

export const TILE = 64;

export const LEVELS = [
  {
    name: "I — The Manor Garden",
    hint: "A cone sweeps past the bushes — hold still, then slip through.",
    pebbles: 3,
    par: 75,
    guards: [
      { waypoints: [[3, 3], [9, 3], [9, 8], [3, 8]], speed: 1.6 },
      { waypoints: [[14, 2], [17, 5], [14, 8], [17, 8]], speed: 1.9 },
    ],
    grid: [
      "####################",
      "#S...B......L......#",
      "#.....C....#....R..#",
      "#..........#.......#",
      "#.B....C...#..C....#",
      "#......L......L....#",
      "#..C......B....#...#",
      "#..........#.......#",
      "#....C.....#.R.....#",
      "#.B.....L......C...#",
      "#......R......#...E#",
      "####################",
    ],
  },
  {
    name: "II — The Gallery",
    hint: "The gallery guards walk the long hall — time your crossing.",
    pebbles: 3,
    par: 105,
    guards: [
      { waypoints: [[3, 2], [8, 2], [8, 5], [3, 5]], speed: 1.8 },
      { waypoints: [[13, 3], [17, 3], [17, 7], [13, 7]], speed: 2.0 },
      { waypoints: [[4, 8], [4, 9], [9, 9], [9, 6]], speed: 1.7 },
    ],
    grid: [
      "####################",
      "#S..B.....L....R...#",
      "#....C....#...C....#",
      "#.........##.......#",
      "#.L...C...##..B....#",
      "#..........##......#",
      "#..C...B...#...L...#",
      "#......#.......C...#",
      "#.B....#..R....#...#",
      "#......#.......#..R#",
      "#..R...#...L...#..E#",
      "####################",
    ],
  },
  {
    name: "III — The Vault",
    hint: "Four guards, five relics — spend a pebble to pull one away.",
    pebbles: 4,
    par: 140,
    guards: [
      { waypoints: [[3, 2], [7, 2], [7, 5], [3, 5]], speed: 2.0 },
      { waypoints: [[12, 2], [17, 2], [17, 5], [12, 5]], speed: 2.1 },
      { waypoints: [[2, 8], [7, 8], [7, 10], [2, 10]], speed: 1.9 },
      { waypoints: [[12, 8], [14, 8], [14, 4], [12, 4]], speed: 2.2 },
    ],
    grid: [
      "####################",
      "#S...B....L....R...#",
      "#....C...#....C....#",
      "#........#.........#",
      "#.L..C...#..B...L..#",
      "#........#.........#",
      "#..C.....#....C....#",
      "#.R.B....#..R...#..#",
      "#........#......#..#",
      "#.L....C.#..L...#R.#",
      "#..R......#....#..E#",
      "####################",
    ],
  },
];

/** A tile blocks movement (and sight) when it is a wall or a crate. */
export function isSolid(ch) {
  return ch === "#" || ch === "C";
}

/** A tile can be stepped on: anything that is not solid. */
export function isWalkable(ch) {
  return !isSolid(ch);
}

/** Parse a level definition into a playable structure. */
export function parseLevel(def) {
  const h = def.grid.length;
  const w = def.grid[0].length;
  const tiles = def.grid.map((row) => row.split(""));
  let spawn = null;
  let exit = null;
  const relics = [];
  const lanterns = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ch = tiles[y][x];
      if (ch === "S") spawn = { x, y };
      if (ch === "E") exit = { x, y };
      if (ch === "R") relics.push({ x, y, taken: false });
      if (ch === "L") lanterns.push({ x, y });
    }
  }
  return {
    name: def.name,
    hint: def.hint,
    pebbles: def.pebbles,
    w,
    h,
    tiles,
    spawn,
    exit,
    relics,
    lanterns,
    guards: def.guards.map((g) => ({
      waypoints: g.waypoints.map(([x, y]) => ({ x, y })),
      speed: g.speed,
    })),
  };
}

/** Breadth-first search on walkable tiles. Returns a list of [x, y] tile
 *  steps from start to goal (excluding the start), or null if unreachable. */
export function bfs(level, sx, sy, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= level.w || ty >= level.h) return null;
  if (isSolid(level.tiles[ty][tx])) return null;
  const key = (x, y) => y * level.w + x;
  const prev = new Map();
  const seen = new Set([key(sx, sy)]);
  const queue = [[sx, sy]];
  while (queue.length > 0) {
    const [x, y] = queue.shift();
    if (x === tx && y === ty) {
      const path = [];
      let cur = [tx, ty];
      while (!(cur[0] === sx && cur[1] === sy)) {
        path.unshift(cur);
        cur = prev.get(key(cur[0], cur[1]));
      }
      return path;
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= level.w || ny >= level.h) continue;
      if (isSolid(level.tiles[ny][nx])) continue;
      const k = key(nx, ny);
      if (seen.has(k)) continue;
      seen.add(k);
      prev.set(k, [x, y]);
      queue.push([nx, ny]);
    }
  }
  return null;
}

/** Line of sight between two tile centres, blocked by walls and crates.
 *  Samples the segment finely; cheap and exact enough for a 20x12 grid. */
export function lineOfSight(level, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const steps = Math.ceil(Math.hypot(dx, dy) * 8) + 1;
  for (let i = 1; i < steps - 1; i++) {
    const t = i / steps;
    const x = Math.floor(ax + dx * t);
    const y = Math.floor(ay + dy * t);
    if (x < 0 || y < 0 || x >= level.w || y >= level.h) return false;
    if (isSolid(level.tiles[y][x])) return false;
  }
  return true;
}

/** One-line summary of a parsed level, for HUD captions and tests:
 *  "II — The Gallery: 3 guards, 4 relics, 3 pebbles". */
export function levelSummary(level) {
  return (
    `${level.name}: ${level.guards.length} guard${level.guards.length === 1 ? "" : "s"}, ` +
    `${level.relics.length} relics, ${level.pebbles} pebbles`
  );
}

/** Target clear time in seconds, per level: a good run beats par, and
 *  the timer in the HUD is judged against it. Stored on the definition
 *  so a level's difficulty and its par travel together. */
export function levelPar(def) {
  return def.par ?? 120;
}

/** Validate a level definition. Returns a list of error strings (empty = ok).
 *  Checks row lengths, spawn/exit/relic presence, waypoint walkability,
 *  and that the spawn can reach the exit and every relic. */
export function validateLevel(def) {
  const errors = [];
  const w = def.grid[0].length;
  def.grid.forEach((row, i) => {
    if (row.length !== w) errors.push(`row ${i} length ${row.length} != ${w}`);
  });
  const level = parseLevel(def);
  if (!level.spawn) errors.push("no spawn (S)");
  if (!level.exit) errors.push("no exit (E)");
  if (level.relics.length === 0) errors.push("no relics (R)");
  def.guards.forEach((g, gi) => {
    g.waypoints.forEach(([x, y], wi) => {
      if (x < 0 || y < 0 || x >= level.w || y >= level.h) {
        errors.push(`guard ${gi} waypoint ${wi} out of bounds (${x},${y})`);
      } else if (isSolid(level.tiles[y][x])) {
        errors.push(
          `guard ${gi} waypoint ${wi} (${x},${y}) sits on '${level.tiles[y][x]}'`
        );
      }
    });
  });
  if (level.spawn) {
    if (!bfs(level, level.spawn.x, level.spawn.y, level.exit.x, level.exit.y)) {
      errors.push("spawn cannot reach exit");
    }
    level.relics.forEach((r, i) => {
      if (!bfs(level, level.spawn.x, level.spawn.y, r.x, r.y)) {
        errors.push(`spawn cannot reach relic ${i} (${r.x},${r.y})`);
      }
    });
  }
  return errors;
}
