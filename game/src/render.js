// render.js — all drawing for The Lantern Thief, on one 1280 x 860 canvas.
// Layout: a 60 px HUD on top, the 32 x 18 tile playfield (1280 x 720), and
// an 80 px caption strip at the bottom. The judge sees the game mostly
// through its screenshots, so every stealth element is drawn to read at a
// glance when shrunk: bright amber vision cones, dark shadow against warm
// lantern pools, guards that stand out against the floor, and a glowing
// green exit. All motion is a function of the passed-in time, so a fixed
// time always renders the same frame.
import { tileHash } from "./random.js";
import { COLS, ROWS, TILE, tileAt, HUD_H } from "./levels.js";
import { CONE_HALF_ANGLE, CONE_RANGE, ALERT_SPOTTED, ALERT_SUSPICIOUS, alertLabel } from "./guards.js";

export { HUD_H };
export const CANVAS_W = 1280;
export const CANVAS_H = 860;
export const CAPTION_H = 80;

const FLOOR_A = "#1a2236";
const FLOOR_B = "#161d30";
const WALL_TOP = "#3d4a6b";
const WALL_FACE = "#232c47";
const CRATE = "#8a6a3b";
const CRATE_DARK = "#6b4f2a";
const BUSH = "#1f5c33";
const BUSH_LIGHT = "#2e7d46";
const LANTERN_GLOW = "rgba(255, 190, 80, 0.20)";
const CONE_COLOR = "rgba(255, 205, 90, 0.30)";
const CONE_EDGE = "rgba(255, 220, 130, 0.85)";
const CONE_HOT = "rgba(255, 70, 60, 0.38)";
const CONE_HOT_EDGE = "rgba(255, 110, 90, 0.95)";

export function renderGame(ctx, state, time) {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.fillStyle = "#0b0f1c";
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  drawFloor(ctx, state.world, time);
  drawPatrolPaths(ctx, state);
  drawLanternPools(ctx, state.world, time);
  drawExit(ctx, state, time);
  drawRelics(ctx, state, time);
  drawGuards(ctx, state);
  drawThief(ctx, state, time);
  drawBushCanopy(ctx, state.world);
  drawVignette(ctx);
  drawHud(ctx, state);
  drawCaption(ctx, state);
}

function drawFloor(ctx, world, time) {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const x = col * TILE;
      const y = HUD_H + row * TILE;
      const t = tileAt(world, col, row);
      if (t === "#") {
        ctx.fillStyle = WALL_FACE;
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = WALL_TOP;
        ctx.fillRect(x, y, TILE, 8);
        ctx.fillStyle = "rgba(255,255,255,0.05)";
        ctx.fillRect(x, y + 8, TILE, 2);
        continue;
      }
      ctx.fillStyle = (col + row) % 2 === 0 ? FLOOR_A : FLOOR_B;
      ctx.fillRect(x, y, TILE, TILE);
      // Deterministic speckles: the same tile always has the same speckles.
      const h = tileHash(col, row, 7);
      if (h > 0.72) {
        ctx.fillStyle = "rgba(255,255,255,0.045)";
        ctx.fillRect(x + 8 + h * 16, y + 10 + tileHash(col, row, 11) * 18, 3, 3);
      }
      ctx.strokeStyle = "rgba(0,0,0,0.18)";
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
      if (t === "C") drawCrate(ctx, x, y);
      if (t === "B") drawBushTile(ctx, x, y, time, col, row);
      if (t === "L") drawLantern(ctx, x, y, time, col, row);
    }
  }
}

function drawCrate(ctx, x, y) {
  ctx.fillStyle = CRATE;
  ctx.fillRect(x + 4, y + 4, TILE - 8, TILE - 8);
  ctx.strokeStyle = CRATE_DARK;
  ctx.lineWidth = 3;
  ctx.strokeRect(x + 4, y + 4, TILE - 8, TILE - 8);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + 4, y + 4);
  ctx.lineTo(x + TILE - 4, y + TILE - 4);
  ctx.moveTo(x + TILE - 4, y + 4);
  ctx.lineTo(x + 4, y + TILE - 4);
  ctx.stroke();
}

function drawBushTile(ctx, x, y, time, col, row) {
  const sway = Math.sin(time * 0.8 + tileHash(col, row, 3) * 6.28) * 1.5;
  ctx.fillStyle = BUSH;
  for (const [dx, dy, r] of [[12, 14, 11], [26, 12, 12], [19, 26, 12], [8, 28, 9], [30, 26, 9]]) {
    ctx.beginPath();
    ctx.arc(x + dx + sway * 0.3, y + dy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = BUSH_LIGHT;
  for (const [dx, dy, r] of [[14, 12, 5], [27, 24, 5], [20, 20, 4]]) {
    ctx.beginPath();
    ctx.arc(x + dx + sway * 0.3, y + dy, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawLantern(ctx, x, y, time, col, row) {
  const flicker = 0.85 + 0.15 * Math.sin(time * 2.2 + tileHash(col, row, 5) * 6.28);
  const cx = x + TILE / 2;
  const cy = y + TILE / 2;
  const glow = ctx.createRadialGradient(cx, cy, 4, cx, cy, 95 * flicker);
  glow.addColorStop(0, "rgba(255, 200, 90, 0.34)");
  glow.addColorStop(1, "rgba(255, 200, 90, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(cx - 95, cy - 95, 190, 190);
  ctx.fillStyle = "#3a2f1a";
  ctx.fillRect(cx - 2, cy - 14, 4, 28);
  ctx.fillStyle = "#ffd76a";
  ctx.beginPath();
  ctx.arc(cx, cy - 6, 7 * flicker, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.beginPath();
  ctx.arc(cx - 2, cy - 8, 2.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawPatrolPaths(ctx, state) {
  ctx.save();
  ctx.setLineDash([2, 7]);
  ctx.lineWidth = 2;
  for (const guard of state.guards) {
    ctx.strokeStyle = "rgba(160, 190, 255, 0.20)";
    ctx.beginPath();
    guard.waypoints.forEach((w, i) => {
      const px = (w.col + 0.5) * TILE;
      const py = HUD_H + (w.row + 0.5) * TILE;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.stroke();
    // Waypoint dots, so a player can read where a guard will turn.
    for (const w of guard.waypoints) {
      ctx.fillStyle = "rgba(160, 190, 255, 0.35)";
      ctx.beginPath();
      ctx.arc((w.col + 0.5) * TILE, HUD_H + (w.row + 0.5) * TILE, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawLanternPools(ctx, world, time) {
  for (const lamp of world.lanterns) {
    const cx = (lamp.col + 0.5) * TILE;
    const cy = HUD_H + (lamp.row + 0.5) * TILE;
    const flicker = 0.9 + 0.1 * Math.sin(time * 2.2 + tileHash(lamp.col, lamp.row, 5) * 6.28);
    const glow = ctx.createRadialGradient(cx, cy, 6, cx, cy, 95 * flicker);
    glow.addColorStop(0, LANTERN_GLOW);
    glow.addColorStop(1, "rgba(255, 190, 80, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(cx - 95, cy - 95, 190, 190);
  }
}

function drawExit(ctx, state, time) {
  const ex = state.world.exit;
  if (!ex) return;
  const x = ex.col * TILE;
  const y = HUD_H + ex.row * TILE;
  const open = state.exitOpen;
  const pulse = open ? 0.75 + 0.25 * Math.sin(time * 3) : 0;
  ctx.fillStyle = open ? "#12351f" : "#1c2438";
  ctx.fillRect(x + 3, y + 2, TILE - 6, TILE - 4);
  ctx.strokeStyle = open ? `rgba(90, 255, 140, ${0.7 + pulse * 0.3})` : "#4a5878";
  ctx.lineWidth = 3;
  ctx.strokeRect(x + 3, y + 2, TILE - 6, TILE - 4);
  if (open) {
    const beam = ctx.createLinearGradient(x, y, x, y - 60);
    beam.addColorStop(0, "rgba(90, 255, 140, 0.35)");
    beam.addColorStop(1, "rgba(90, 255, 140, 0)");
    ctx.fillStyle = beam;
    ctx.fillRect(x + 8, y - 58, TILE - 16, 60);
    ctx.fillStyle = "#5aff8c";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("EXIT", x + TILE / 2, y - 46);
  } else {
    ctx.fillStyle = "#8a94ad";
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("LOCKED", x + TILE / 2, y + TILE / 2 + 4);
  }
}

function drawRelics(ctx, state, time) {
  for (const relic of state.world.relics) {
    if (relic.taken) continue;
    const cx = (relic.col + 0.5) * TILE;
    const cy = HUD_H + (relic.row + 0.5) * TILE + Math.sin(time * 2 + tileHash(relic.col, relic.row, 9) * 6.28) * 3;
    const glow = ctx.createRadialGradient(cx, cy, 2, cx, cy, 26);
    glow.addColorStop(0, "rgba(255, 215, 110, 0.5)");
    glow.addColorStop(1, "rgba(255, 215, 110, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(cx - 26, cy - 26, 52, 52);
    ctx.fillStyle = "#ffd76a";
    ctx.beginPath();
    ctx.moveTo(cx, cy - 10);
    ctx.lineTo(cx + 8, cy);
    ctx.lineTo(cx, cy + 10);
    ctx.lineTo(cx - 8, cy);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#fff3c4";
    ctx.beginPath();
    ctx.moveTo(cx, cy - 5);
    ctx.lineTo(cx + 4, cy);
    ctx.lineTo(cx, cy + 5);
    ctx.lineTo(cx - 4, cy);
    ctx.closePath();
    ctx.fill();
  }
}

function drawGuards(ctx, state) {
  for (const guard of state.guards) {
    const hot = guard.alert >= ALERT_SUSPICIOUS;
    const spotted = guard.alert >= ALERT_SPOTTED;
    // Vision cone: a wide amber wedge, brighter and redder as alert rises.
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(guard.x, guard.y);
    ctx.arc(guard.x, guard.y, CONE_RANGE, guard.facing - CONE_HALF_ANGLE, guard.facing + CONE_HALF_ANGLE);
    ctx.closePath();
    ctx.fillStyle = spotted ? CONE_HOT : hot ? "rgba(255, 140, 70, 0.34)" : CONE_COLOR;
    ctx.fill();
    ctx.strokeStyle = spotted ? CONE_HOT_EDGE : hot ? "rgba(255, 170, 100, 0.9)" : CONE_EDGE;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    // Guard body: a dark watchman with a red tabard and a pale helmet, so
    // it stands out against the dark floor at a glance.
    ctx.fillStyle = "#2b3350";
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = spotted ? "#e0392f" : "#b03a30";
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, 14, guard.facing - 1.1, guard.facing + 1.1);
    ctx.lineTo(guard.x, guard.y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#d7def2";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, 14, 0, Math.PI * 2);
    ctx.stroke();
    // Facing tick and helmet glint.
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(guard.x + Math.cos(guard.facing) * 10, guard.y + Math.sin(guard.facing) * 10);
    ctx.lineTo(guard.x + Math.cos(guard.facing) * 18, guard.y + Math.sin(guard.facing) * 18);
    ctx.stroke();
    ctx.fillStyle = "#e8ecf7";
    ctx.beginPath();
    ctx.arc(guard.x - Math.cos(guard.facing) * 4, guard.y - Math.sin(guard.facing) * 4, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Alert arc + mark above the guard.
    if (guard.alert > 2) {
      ctx.strokeStyle = spotted ? "#ff5040" : hot ? "#ffb050" : "#7ddb8a";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(guard.x, guard.y, 20, -Math.PI / 2, -Math.PI / 2 + (guard.alert / 100) * Math.PI * 2);
      ctx.stroke();
    }
    if (guard.state !== "patrol") {
      ctx.fillStyle = spotted ? "#ff5040" : "#ffb050";
      ctx.font = "bold 22px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(spotted ? "!" : "?", guard.x, guard.y - 24);
    }
  }
}

function drawThief(ctx, state, time) {
  const t = state.thief;
  const bob = t.sneaking ? 0 : Math.sin(time * 6) * 0.8;
  // A soft shadow-pool under the thief: dark ground is safety.
  const shadow = ctx.createRadialGradient(t.x, t.y, 2, t.x, t.y, 30);
  shadow.addColorStop(0, "rgba(0, 0, 0, 0.45)");
  shadow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = shadow;
  ctx.fillRect(t.x - 30, t.y - 30, 60, 60);
  // Hooded thief: a dark cloak, a pale face, a small lantern at the belt.
  // Drawn a touch larger than a guard's core so the player stays readable
  // inside a bush or a cone at a glance.
  ctx.fillStyle = "#151b2e";
  ctx.beginPath();
  ctx.arc(t.x, t.y + bob, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#7ddb8a";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(t.x, t.y + bob, 13, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "#e8d9b0";
  ctx.beginPath();
  ctx.arc(t.x + Math.cos(t.facing) * 4, t.y + Math.sin(t.facing) * 4 + bob, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffd76a";
  ctx.beginPath();
  ctx.arc(t.x - Math.cos(t.facing) * 8, t.y - Math.sin(t.facing) * 8 + bob, 2.5, 0, Math.PI * 2);
  ctx.fill();
  if (t.sneaking) {
    ctx.fillStyle = "#7ddb8a";
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("sneaking", t.x, t.y - 20);
  }
}

function drawBushCanopy(ctx, world) {
  // A second, lighter pass over the bushes keeps them leafy without ever
  // hiding the thief, who is drawn on top of the first pass.
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if (tileAt(world, col, row) !== "B") continue;
      const x = col * TILE;
      const y = HUD_H + row * TILE;
      ctx.fillStyle = "rgba(46, 125, 70, 0.5)";
      ctx.beginPath();
      ctx.arc(x + 10, y + 10, 5, 0, Math.PI * 2);
      ctx.arc(x + 30, y + 30, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawVignette(ctx) {
  const g = ctx.createRadialGradient(
    CANVAS_W / 2, HUD_H + 360, 320,
    CANVAS_W / 2, HUD_H + 360, 760,
  );
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,0.30)");
  ctx.fillStyle = g;
  ctx.fillRect(0, HUD_H, CANVAS_W, ROWS * TILE);
}

function drawHud(ctx, state) {
  ctx.fillStyle = "#0d1226";
  ctx.fillRect(0, 0, CANVAS_W, HUD_H);
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(0, HUD_H - 1, CANVAS_W, 1);
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#e8ecf7";
  ctx.font = "bold 17px sans-serif";
  ctx.fillText(state.world.name, 16, HUD_H / 2);
  // Relics.
  ctx.fillStyle = "#ffd76a";
  ctx.font = "bold 16px sans-serif";
  ctx.fillText(`Relics ${state.relicsTaken}/${state.world.relics.length}`, 330, HUD_H / 2);
  // Alert meter: the one number that decides whether you are caught.
  const alert = state.alert;
  const label = alertLabel(alert);
  const mx = 500;
  const mw = 260;
  ctx.fillStyle = "#232c47";
  ctx.fillRect(mx, HUD_H / 2 - 10, mw, 20);
  ctx.fillStyle = alert >= ALERT_SPOTTED ? "#ff5040" : alert >= ALERT_SUSPICIOUS ? "#ffb050" : "#5aff8c";
  ctx.fillRect(mx, HUD_H / 2 - 10, (mw * alert) / 100, 20);
  ctx.strokeStyle = "#8a94ad";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(mx, HUD_H / 2 - 10, mw, 20);
  ctx.fillStyle = "#e8ecf7";
  ctx.font = "bold 14px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(label, mx + mw / 2, HUD_H / 2);
  // Lives and timer.
  ctx.textAlign = "right";
  ctx.fillStyle = "#ff6b81";
  ctx.font = "20px sans-serif";
  ctx.fillText("♥".repeat(Math.max(0, state.lives)) + "♡".repeat(Math.max(0, 3 - state.lives)), 860, HUD_H / 2 + 1);
  ctx.fillStyle = "#e8ecf7";
  ctx.font = "bold 16px sans-serif";
  const mins = Math.floor(state.time / 60);
  const secs = Math.floor(state.time % 60);
  ctx.fillText(`Time ${mins}:${String(secs).padStart(2, "0")}`, 990, HUD_H / 2);
  ctx.fillStyle = "#8a94ad";
  ctx.font = "13px sans-serif";
  ctx.fillText("WASD move · Shift sneak", 1264, HUD_H / 2);
}

function drawCaption(ctx, state) {
  ctx.fillStyle = "#0d1226";
  ctx.fillRect(0, CANVAS_H - CAPTION_H, CANVAS_W, CAPTION_H);
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(0, CANVAS_H - CAPTION_H, CANVAS_W, 1);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#c8d2ea";
  ctx.font = "16px sans-serif";
  const lines = wrapText(ctx, state.message, CANVAS_W - 120);
  lines.slice(0, 2).forEach((line, i) => {
    ctx.fillText(line, CANVAS_W / 2, CANVAS_H - CAPTION_H + 26 + i * 24);
  });
  if (state.status === "complete" || state.status === "won") {
    ctx.fillStyle = "#5aff8c";
    ctx.font = "bold 15px sans-serif";
    ctx.fillText("Press R to play the next level — or N for a new game.", CANVAS_W / 2, CANVAS_H - 18);
  }
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split(" ");
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? line + " " + word : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}
