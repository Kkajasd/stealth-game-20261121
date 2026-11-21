// levels.js — the three manors of The Lantern Thief.
//
// Tile legend (each map is 20 columns x 12 rows, one char per tile):
//   #  wall — solid, blocks sight and movement
//   .  floor — lit stone, guards spot you at full range here
//   ,  shadow floor — dark ground, guards spot you at half range here
//   B  bush — walkable cover, blocks sight (you are hidden inside it)
//   C  crate — solid cover, blocks sight and movement
//   L  lantern — a light pool on the floor (lit ground, full range)
//   R  relic — a glowing prize to collect
//   P  the thief's starting tile
//   E  the exit — opens once every relic is collected
//
// Guards are not in the maps: each level lists them with a patrol loop of
// tile waypoints. A guard walks its loop, pauses at each waypoint and scans.

const TILE = 64;
const COLS = 20;
const ROWS = 12;

function isSolidTile(ch) {
  return ch === "#" || ch === "C";
}

// A tile blocks a guard's line of sight.
function blocksSightTile(ch) {
  return ch === "#" || ch === "C" || ch === "B";
}

// A tile counts as dark ground (shadow floor, or inside a bush).
function isDarkTile(ch) {
  return ch === "," || ch === "B";
}

// A tile counts as lit ground (a lantern pool, or plain floor).
function isLitTile(ch) {
  return ch === "L" || ch === ".";
}

const LEVELS = [
  {
    name: "I — The Manor Garden",
    hint: "Two guards walk the garden. Bushes hide you; lantern light betrays you.",
    map: [
      "####################",
      "#P.....,.....C...R.#",
      "#..##......##....#.#",
      "#..##..B...##.C...R#",
      "#.......,.....##...#",
      "#.C....##......,.L.#",
      "#..##.......B...##.#",
      "#..##..C.....##....#",
      "#.....##.....,....R#",
      "#.B.....,....##..#.#",
      "#..L...C......,..E.#",
      "####################",
    ],
    guards: [
      { waypoints: [[5, 2], [5, 9], [15, 9], [15, 2]], speed: 1.15 },
      { waypoints: [[17, 4], [17, 8], [10, 8], [10, 4]], speed: 1.05 },
    ],
  },
  {
    name: "II — The Gallery",
    hint: "Three guards, four relics. The middle guard sweeps the hall — cross behind him.",
    map: [
      "####################",
      "#R...##......##...P#",
      "#....##..C...##....#",
      "#.C......,......B..#",
      "#..##....##....##..#",
      "#..##.L..##.R......#",
      "#......,....##..C..#",
      "#.B....##.......##.#",
      "#..##......B..R.,..#",
      "#....C....##....#..#",
      "#R....##......L..E.#",
      "####################",
    ],
    guards: [
      { waypoints: [[3, 2], [3, 9], [9, 9], [8, 2]], speed: 1.25 },
      { waypoints: [[16, 2], [15, 9], [12, 9]], speed: 1.15 },
      { waypoints: [[7, 5], [13, 5], [13, 7], [6, 7]], speed: 1.35 },
    ],
  },
  {
    name: "III — The Vault",
    hint: "Four guards and the tightest cover. Wait for the cone to pass — patience pays.",
    map: [
      "####################",
      "#P..##....,....##R.#",
      "#.C.##.B..##.C.##..#",
      "#....,....##....,R.#",
      "#.##..C......##....#",
      "#.#....##..L..##.B.#",
      "#..R..##......,....#",
      "#.##..R..C..##..##.#",
      "#....B...##....R...#",
      "#.C.....,....##..#.#",
      "#..L..##..C...,.E..#",
      "####################",
    ],
    guards: [
      { waypoints: [[6, 2], [4, 9], [9, 9], [9, 2]], speed: 1.35 },
      { waypoints: [[17, 2], [15, 9], [11, 9]], speed: 1.25 },
      { waypoints: [[6, 5], [13, 5]], speed: 1.45 },
      { waypoints: [[17, 4], [17, 8], [12, 8], [11, 4]], speed: 1.3 },
    ],
  },
];

// Parse a level into runtime data: grid of chars, player start, exit, relics.
function parseLevel(level) {
  const grid = level.map.map((row) => row.split(""));
  let player = null;
  let exit = null;
  const relics = [];
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const ch = grid[y][x];
      if (ch === "P") {
        player = { x: x * TILE + TILE / 2, y: y * TILE + TILE / 2 };
        grid[y][x] = ".";
      } else if (ch === "E") {
        exit = { x: x * TILE + TILE / 2, y: y * TILE + TILE / 2 };
        grid[y][x] = ".";
      } else if (ch === "R") {
        relics.push({
          x: x * TILE + TILE / 2,
          y: y * TILE + TILE / 2,
          taken: false,
          // A fixed bob phase from the tile, so a relic always bobs the same
          // way: screenshots of the same scene render byte-identical.
          bob: ((x * 0.13 + y * 0.29) % (Math.PI * 2)),
        });
        grid[y][x] = ".";
      }
    }
  }
  return { grid: grid, player: player, exit: exit, relics: relics };
}

// Tile char at pixel coordinates (walls outside the map count as solid).
function tileAt(grid, px, py) {
  const tx = Math.floor(px / TILE);
  const ty = Math.floor(py / TILE);
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return "#";
  return grid[ty][tx];
}

// Is the pixel point inside solid ground (wall or crate)?
function solidAt(grid, px, py) {
  return isSolidTile(tileAt(grid, px, py));
}

// Line of sight between two pixel points: step along the segment and check
// every tile it crosses for sight-blocking ground.
function hasLineOfSight(grid, x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / (TILE / 4)));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (blocksSightTile(tileAt(grid, x0 + dx * t, y0 + dy * t))) return false;
  }
  return true;
}
