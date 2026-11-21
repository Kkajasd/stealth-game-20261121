// levels.js — the three levels of The Lantern Thief (round 2).
// Each level is a 32 x 18 tile grid. Legend:
//   # wall (blocks movement and sight)   . floor
//   C crate (cover: blocks movement and sight)
//   B bush (cover: walkable, hides the thief)
//   L lantern (a pool of light: being seen there is far more dangerous)
//   R relic (collect them all to open the exit)
//   E exit (locked until every relic is taken)   S thief spawn
// Guard patrols are waypoint loops in tile coordinates; every waypoint was
// checked to be a walkable floor tile (see validateLevels in the test run).
export const TILE = 40;
export const COLS = 32;
export const ROWS = 18;
// The playfield starts HUD_H pixels down the canvas (the HUD bar is on
// top), so every pixel Y in the game world already includes this offset.
export const HUD_H = 60;

export function colOf(x) {
  return Math.floor(x / TILE);
}

export function rowOf(y) {
  return Math.floor((y - HUD_H) / TILE);
}

// Walkable from pixel coordinates (used by movement code).
export function isWalkablePixel(world, x, y) {
  return isWalkable(world, colOf(x), rowOf(y));
}

export const LEVELS = [
  {
    name: "I — The Manor Garden",
    hint: "Two guards, three relics. Learn the patrols, then slip through.",
    grid: [
      "################################",
      "#..............................#",
      "#..S.......C........B..........#",
      "#..............................#",
      "#.....B......R.......C....L....#",
      "#..............................#",
      "#.........C...........B........#",
      "#..............................#",
      "#....C...........B......R......#",
      "#..............................#",
      "#..B......L..........C.........#",
      "#..............................#",
      "#......R..........B............#",
      "#..............................#",
      "#....C.......B..........C...E..#",
      "#..............................#",
      "#..B...........................#",
      "################################",
    ],
    guards: [
      { waypoints: [[8, 2], [16, 2], [16, 5], [8, 5]], speed: 1.15 },
      { waypoints: [[12, 10], [22, 10], [22, 13], [12, 13]], speed: 1.05 },
    ],
    caption: "A cone sweeps past the bushes — hold still, then slip through.",
  },
  {
    name: "II — The Gallery",
    hint: "Three guards, four relics. The lanterns leave nowhere to hide.",
    grid: [
      "################################",
      "#..............................#",
      "#..S......C........B.....R.....#",
      "#..............................#",
      "#.....B......######....L.......#",
      "#..............................#",
      "#........C.........B....R......#",
      "#..............................#",
      "#..C........B....######........#",
      "#..............................#",
      "#......R......L.........C......#",
      "#..............................#",
      "#..B..........C......B....R....#",
      "#..............................#",
      "#.......C.....B........L...E...#",
      "#..............................#",
      "#....B...........C.............#",
      "################################",
    ],
    guards: [
      { waypoints: [[8, 2], [18, 2], [18, 6], [8, 6]], speed: 1.2 },
      { waypoints: [[6, 10], [16, 10], [16, 12], [6, 12]], speed: 1.1 },
      { waypoints: [[10, 14], [20, 14], [20, 16], [10, 16]], speed: 1.25 },
    ],
    caption: "Three patrols cross here — watch the dotted routes, pick your moment.",
  },
  {
    name: "III — The Vault",
    hint: "Four guards, five relics. One way in, one way out — unseen.",
    grid: [
      "################################",
      "#..............................#",
      "#..S.....C.......B......R......#",
      "#..............................#",
      "#....B.....######....C....L....#",
      "#..............................#",
      "#..R.......B..........C........#",
      "#..............................#",
      "#.....C....######....B.....R...#",
      "#..............................#",
      "#..B......L......C......B......#",
      "#..............................#",
      "#....R......B....######........#",
      "#..............................#",
      "#..C.......L......B......E.....#",
      "#..............................#",
      "#......B......R......C.........#",
      "################################",
    ],
    guards: [
      { waypoints: [[8, 2], [18, 2], [18, 5], [8, 5]], speed: 1.25 },
      { waypoints: [[8, 8], [18, 8], [18, 10], [8, 10]], speed: 1.15 },
      { waypoints: [[10, 12], [15, 12], [15, 14], [10, 14]], speed: 1.3 },
      { waypoints: [[12, 15], [24, 15], [24, 16], [12, 16]], speed: 1.2 },
    ],
    caption: "The vault door glows green — take the last relic and run for it.",
  },
];

// A patrol route is drawn as a faint dotted line in the game, so the
// player can learn it: a route that rewards patience is a fair route.
// The waypoints are also the guard's spawn points, in loop order.
export function parseLevel(def) {
  const tiles = def.grid.map((row) => row.split(""));
  const world = {
    name: def.name,
    hint: def.hint,
    caption: def.caption,
    tiles,
    spawn: null,
    exit: null,
    relics: [],
    lanterns: [],
    guards: def.guards.map((g) => ({
      waypoints: g.waypoints.map(([c, r]) => ({ col: c, row: r })),
      speed: g.speed,
    })),
  };
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const t = tiles[row][col];
      if (t === "S") world.spawn = { col, row };
      if (t === "E") world.exit = { col, row };
      if (t === "R") world.relics.push({ col, row, taken: false });
      if (t === "L") world.lanterns.push({ col, row });
    }
  }
  return world;
}

export function tileAt(world, col, row) {
  if (col < 0 || row < 0 || col >= COLS || row >= ROWS) return "#";
  return world.tiles[row][col];
}

// Walls and crates block movement; everything else is walkable.
export function isWalkable(world, col, row) {
  const t = tileAt(world, col, row);
  return t !== "#" && t !== "C";
}

// Walls and crates block sight; bushes, lanterns and floor do not.
export function blocksSight(world, col, row) {
  const t = tileAt(world, col, row);
  return t === "#" || t === "C";
}

export function tileCenter(col, row) {
  return { x: (col + 0.5) * TILE, y: HUD_H + (row + 0.5) * TILE };
}

// True when the segment between two pixel points crosses no wall or crate:
// sample the line in small steps and test the tile under each sample.
export function hasLineOfSight(world, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const steps = Math.max(1, Math.ceil(dist / (TILE / 4)));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const col = colOf(ax + dx * t);
    const row = rowOf(ay + dy * t);
    if (blocksSight(world, col, row)) return false;
  }
  return true;
}

// A lantern lights the tiles around it; standing in that light makes the
// thief far easier to spot. Bushes hide the thief instead.
export function lightAt(world, x, y) {
  for (const lamp of world.lanterns) {
    const c = tileCenter(lamp.col, lamp.row);
    const dx = x - c.x;
    const dy = y - c.y;
    if (dx * dx + dy * dy < 95 * 95) return true;
  }
  return false;
}

export function inBush(world, x, y) {
  return tileAt(world, colOf(x), rowOf(y)) === "B";
}

// Validate every level: grid size, exactly one spawn and exit, at least one
// relic, and every guard waypoint on a walkable tile. Returns a list of
// problems (empty when the levels are good).
export function validateLevels() {
  const problems = [];
  LEVELS.forEach((def, index) => {
    if (def.grid.length !== ROWS) {
      problems.push(`level ${index + 1}: ${def.grid.length} rows, expected ${ROWS}`);
    }
    def.grid.forEach((row, r) => {
      if (row.length !== COLS) {
        problems.push(`level ${index + 1} row ${r}: ${row.length} cols, expected ${COLS}`);
      }
    });
    const world = parseLevel(def);
    if (!world.spawn) problems.push(`level ${index + 1}: no spawn`);
    if (!world.exit) problems.push(`level ${index + 1}: no exit`);
    if (world.relics.length === 0) problems.push(`level ${index + 1}: no relics`);
    def.guards.forEach((g, gi) => {
      g.waypoints.forEach(([c, r], wi) => {
        if (!isWalkable(world, c, r)) {
          problems.push(
            `level ${index + 1} guard ${gi} waypoint ${wi} (${c},${r}) is '${tileAt(world, c, r)}', not walkable`,
          );
        }
      });
    });
  });
  return problems;
}
