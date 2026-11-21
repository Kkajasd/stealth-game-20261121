// render.js — canvas drawing for The Lantern Thief.
//
// Everything the judge sees comes from here. The drawing is deterministic:
// tile speckles and relic bob phases derive from tile coordinates, never
// from Math.random, so the same state always paints the same pixels.
//
// Layout: 1280x860 canvas. HUD bar 0..44, playfield 20x12 tiles of 64px
// at y 44..812, caption bar 812..860.

import { clamp, tileRand } from "./random.js";
import { TILE } from "./levels.js";

export const VIEW_W = 1280;
export const VIEW_H = 860;
export const HUD_H = 44;
export const CAPTION_H = 48;

const FLOOR_A = "#1b2334";
const FLOOR_B = "#171e2c";
const WALL = "#2c3446";
const WALL_TOP = "#414c64";

/** Convert a tile coordinate to playfield pixels. */
export function tileToPx(tx, ty) {
  return { x: tx * TILE, y: HUD_H + ty * TILE };
}

function drawFloor(ctx, level) {
  for (let y = 0; y < level.h; y++) {
    for (let x = 0; x < level.w; x++) {
      const px = x * TILE;
      const py = HUD_H + y * TILE;
      ctx.fillStyle = (x + y) % 2 === 0 ? FLOOR_A : FLOOR_B;
      ctx.fillRect(px, py, TILE, TILE);
      // Seeded speckles: same tile, same speckle, every run.
      const n = 2 + Math.floor(tileRand(level.name, x, y, "speck") * 3);
      ctx.fillStyle = "rgba(255,255,255,0.03)";
      for (let i = 0; i < n; i++) {
        const sx = px + 6 + tileRand(level.name, x, y, "sx" + i) * (TILE - 12);
        const sy = py + 6 + tileRand(level.name, x, y, "sy" + i) * (TILE - 12);
        ctx.fillRect(sx, sy, 2, 2);
      }
      ctx.strokeStyle = "rgba(0,0,0,0.25)";
      ctx.strokeRect(px + 0.5, py + 0.5, TILE, TILE);
    }
  }
}

function drawLanternLight(ctx, level) {
  for (const lamp of level.lanterns) {
    const cx = (lamp.x + 0.5) * TILE;
    const cy = HUD_H + (lamp.y + 0.5) * TILE;
    const r = TILE * 2.2;
    const g = ctx.createRadialGradient(cx, cy, 8, cx, cy, r);
    g.addColorStop(0, "rgba(255,190,80,0.30)");
    g.addColorStop(1, "rgba(255,190,80,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPatrolRoutes(ctx, guards) {
  ctx.strokeStyle = "rgba(160,180,220,0.30)";
  ctx.setLineDash([2, 7]);
  ctx.lineWidth = 1.5;
  for (const g of guards) {
    ctx.beginPath();
    g.waypoints.forEach((wp, i) => {
      const px = (wp.x + 0.5) * TILE;
      const py = HUD_H + (wp.y + 0.5) * TILE;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.stroke();
  }
  ctx.setLineDash([]);
}

function drawCone(ctx, guard) {
  const range = 5.2 * TILE;
  const half = (38 * Math.PI) / 180;
  const cx = guard.x;
  const cy = HUD_H + guard.y;
  let color = "rgba(255,176,66,0.20)";
  if (guard.state === "chase") color = "rgba(255,70,50,0.28)";
  else if (guard.state === "suspicious" || guard.state === "investigate") {
    color = "rgba(255,140,40,0.24)";
  }
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, range, guard.dir - half, guard.dir + half);
  ctx.closePath();
  ctx.fill();
  // Cone edge lines, faint.
  ctx.strokeStyle = "rgba(255,200,110,0.35)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(guard.dir - half) * range, cy + Math.sin(guard.dir - half) * range);
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(guard.dir + half) * range, cy + Math.sin(guard.dir + half) * range);
  ctx.stroke();
}

function drawTiles(ctx, level, game) {
  for (let y = 0; y < level.h; y++) {
    for (let x = 0; x < level.w; x++) {
      const ch = level.tiles[y][x];
      const px = x * TILE;
      const py = HUD_H + y * TILE;
      if (ch === "#") {
        ctx.fillStyle = WALL;
        ctx.fillRect(px, py, TILE, TILE);
        ctx.fillStyle = WALL_TOP;
        ctx.fillRect(px, py, TILE, 5);
        ctx.strokeStyle = "rgba(0,0,0,0.35)";
        ctx.strokeRect(px + 0.5, py + 0.5, TILE, TILE);
      } else if (ch === "C") {
        ctx.fillStyle = "#7d5f2e";
        ctx.fillRect(px + 5, py + 5, TILE - 10, TILE - 10);
        ctx.strokeStyle = "#5d451f";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(px + 8, py + 8);
        ctx.lineTo(px + TILE - 8, py + TILE - 8);
        ctx.moveTo(px + TILE - 8, py + 8);
        ctx.lineTo(px + 8, py + TILE - 8);
        ctx.stroke();
        ctx.lineWidth = 1;
        ctx.strokeStyle = "#a8834a";
        ctx.strokeRect(px + 5.5, py + 5.5, TILE - 11, TILE - 11);
      } else if (ch === "B") {
        // Bush: a cluster of dark green blobs. Hides the thief.
        for (let i = 0; i < 5; i++) {
          const bx = px + 12 + tileRand(level.name, x, y, "bx" + i) * (TILE - 24);
          const by = py + 12 + tileRand(level.name, x, y, "by" + i) * (TILE - 24);
          const br = 9 + tileRand(level.name, x, y, "br" + i) * 7;
          ctx.fillStyle = i % 2 ? "#245c33" : "#1c4a29";
          ctx.beginPath();
          ctx.arc(bx, by, br, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (ch === "L") {
        // Lantern post with a warm glow.
        ctx.fillStyle = "#3a3f4a";
        ctx.fillRect(px + TILE / 2 - 2, py + TILE / 2 - 6, 4, 22);
        ctx.fillStyle = "#ffd76a";
        ctx.beginPath();
        ctx.arc(px + TILE / 2, py + TILE / 2 - 10, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255,215,106,0.35)";
        ctx.beginPath();
        ctx.arc(px + TILE / 2, py + TILE / 2 - 10, 13, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  // Relics: glowing diamonds, bobbing on a per-tile phase.
  for (const r of level.relics) {
    if (r.taken) continue;
    const cx = (r.x + 0.5) * TILE;
    const bob = Math.sin(game.time * 2 + tileRand(level.name, r.x, r.y, "bob") * 6.28) * 3;
    const cy = HUD_H + (r.y + 0.5) * TILE + bob;
    ctx.fillStyle = "rgba(255,215,106,0.25)";
    ctx.beginPath();
    ctx.arc(cx, cy, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffd76a";
    ctx.beginPath();
    ctx.moveTo(cx, cy - 13);
    ctx.lineTo(cx + 10, cy);
    ctx.lineTo(cx, cy + 13);
    ctx.lineTo(cx - 10, cy);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#fff3c4";
    ctx.beginPath();
    ctx.moveTo(cx, cy - 7);
    ctx.lineTo(cx + 5, cy);
    ctx.lineTo(cx, cy + 7);
    ctx.lineTo(cx - 5, cy);
    ctx.closePath();
    ctx.fill();
  }
  // Exit door: locked until every relic is taken.
  const ex = level.exit;
  const epx = ex.x * TILE;
  const epy = HUD_H + ex.y * TILE;
  const open = level.relics.every((r) => r.taken);
  ctx.fillStyle = open ? "#1d5c33" : "#2c3a4d";
  ctx.fillRect(epx + 8, epy + 4, TILE - 16, TILE - 8);
  ctx.strokeStyle = open ? "#7be495" : "#5a6b84";
  ctx.lineWidth = 3;
  ctx.strokeRect(epx + 8.5, epy + 4.5, TILE - 17, TILE - 9);
  ctx.lineWidth = 1;
  if (open) {
    ctx.fillStyle = "rgba(123,228,149,0.30)";
    ctx.fillRect(epx + 8, epy + 4, TILE - 16, TILE - 8);
    ctx.fillStyle = "#b9f5c8";
    ctx.font = "bold 13px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("EXIT", epx + TILE / 2, epy + TILE / 2 + 5);
  } else {
    ctx.fillStyle = "#8fa1b8";
    ctx.font = "bold 11px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("LOCKED", epx + TILE / 2, epy + TILE / 2 + 4);
  }
}

function drawRings(ctx, game) {
  for (const ring of game.rings) {
    const cx = ring.x * TILE;
    const cy = HUD_H + ring.y * TILE;
    const t = clamp(ring.age / ring.life, 0, 1);
    const r = 8 + t * ring.maxR * TILE;
    ctx.strokeStyle = `rgba(180,220,255,${(1 - t) * 0.85})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = `rgba(180,220,255,${(1 - t) * 0.35})`;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.82, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1;
  }
}

function drawThief(ctx, game) {
  const t = game.thief;
  const cx = t.x;
  const cy = HUD_H + t.y;
  // Soft shadow under the thief.
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.beginPath();
  ctx.ellipse(cx, cy + 14, 16, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  // Hooded cloak.
  ctx.fillStyle = "#232a3d";
  ctx.beginPath();
  ctx.arc(cx, cy, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#39415c";
  ctx.beginPath();
  ctx.arc(cx, cy - 3, 10, 0, Math.PI * 2);
  ctx.fill();
  // Pale face + facing tick.
  ctx.fillStyle = "#e8dcc0";
  ctx.beginPath();
  ctx.arc(cx + Math.cos(t.dir) * 5, cy + Math.sin(t.dir) * 5 - 2, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#e8dcc0";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx + Math.cos(t.dir) * 12, cy + Math.sin(t.dir) * 12);
  ctx.lineTo(cx + Math.cos(t.dir) * 20, cy + Math.sin(t.dir) * 20);
  ctx.stroke();
  ctx.lineWidth = 1;
  if (t.sneaking) {
    ctx.fillStyle = "#9fe6a8";
    ctx.font = "bold 11px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("sneaking", cx, cy - 24);
  }
}

function drawGuards(ctx, game) {
  for (const g of game.guards) {
    const cx = g.x;
    const cy = HUD_H + g.y;
    drawCone(ctx, g);
  }
  for (const g of game.guards) {
    const cx = g.x;
    const cy = HUD_H + g.y;
    // Shadow.
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.beginPath();
    ctx.ellipse(cx, cy + 14, 16, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    // Body: red tabard over dark armour.
    ctx.fillStyle = "#20242e";
    ctx.beginPath();
    ctx.arc(cx, cy, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#b03a2e";
    ctx.beginPath();
    ctx.arc(cx, cy, 12, 0, Math.PI * 2);
    ctx.fill();
    // Helmet glint.
    ctx.fillStyle = "#e8e8f0";
    ctx.beginPath();
    ctx.arc(cx - 4, cy - 5, 4, 0, Math.PI * 2);
    ctx.fill();
    // Facing tick.
    ctx.strokeStyle = "#ffd76a";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(g.dir) * 13, cy + Math.sin(g.dir) * 13);
    ctx.lineTo(cx + Math.cos(g.dir) * 22, cy + Math.sin(g.dir) * 22);
    ctx.stroke();
    ctx.lineWidth = 1;
    // Alert arc above the guard.
    const a = clamp(g.alert, 0, 100) / 100;
    ctx.strokeStyle = "rgba(0,0,0,0.5)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, cy - 26, 10, -Math.PI / 2, Math.PI * 1.5);
    ctx.stroke();
    ctx.strokeStyle = a < 0.3 ? "#7be495" : a < 0.75 ? "#ffb02e" : "#ff4632";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy - 26, 10, -Math.PI / 2, -Math.PI / 2 + a * Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1;
    // "?" while suspicious or investigating, "!" while chasing.
    if (g.state === "chase") {
      ctx.fillStyle = "#ff4632";
      ctx.font = "bold 20px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("!", cx, cy - 36);
    } else if (g.state === "suspicious" || g.state === "investigate") {
      ctx.fillStyle = "#ffb02e";
      ctx.font = "bold 18px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("?", cx, cy - 36);
    }
  }
}

function drawHUD(ctx, game) {
  const level = game.level;
  ctx.fillStyle = "#0d1119";
  ctx.fillRect(0, 0, VIEW_W, HUD_H);
  ctx.fillStyle = "#232c3f";
  ctx.fillRect(0, HUD_H - 2, VIEW_W, 2);
  ctx.textBaseline = "middle";
  // Level name.
  ctx.fillStyle = "#e8e8f0";
  ctx.font = "bold 17px system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(level.name, 14, HUD_H / 2 + 1);
  // Relics.
  const taken = level.relics.filter((r) => r.taken).length;
  ctx.fillStyle = "#ffd76a";
  ctx.font = "600 15px system-ui, sans-serif";
  ctx.fillText(`Relics ${taken}/${level.relics.length}`, 300, HUD_H / 2 + 1);
  // Pebbles.
  ctx.fillStyle = "#b4dcff";
  ctx.fillText(`◉ ${game.pebblesLeft}`, 420, HUD_H / 2 + 1);
  // Alert meter (centre).
  const alert = game.maxAlert;
  const label = alert < 30 ? "HIDDEN" : alert < 75 ? "SUSPICIOUS" : "SPOTTED";
  const color = alert < 30 ? "#7be495" : alert < 75 ? "#ffb02e" : "#ff4632";
  const mx = 560;
  const mw = 170;
  ctx.fillStyle = "#1a2130";
  ctx.fillRect(mx, 12, mw, 20);
  ctx.fillStyle = color;
  ctx.fillRect(mx, 12, (mw * clamp(alert, 0, 100)) / 100, 20);
  ctx.strokeStyle = "#3a4358";
  ctx.strokeRect(mx + 0.5, 12.5, mw, 20);
  ctx.fillStyle = "#fff";
  ctx.font = "bold 12px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(label, mx + mw / 2, 23);
  // Lives.
  ctx.fillStyle = "#ff6b81";
  ctx.font = "16px system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("♥".repeat(Math.max(0, game.lives)), 790, HUD_H / 2 + 1);
  // Timer.
  const t = Math.floor(game.time);
  const mm = String(Math.floor(t / 60)).padStart(1, "0");
  const ss = String(t % 60).padStart(2, "0");
  ctx.fillStyle = "#e8e8f0";
  ctx.font = "600 15px system-ui, sans-serif";
  ctx.fillText(`Time ${mm}:${ss}`, 880, HUD_H / 2 + 1);
  // Controls hint.
  ctx.fillStyle = "#8fa1b8";
  ctx.font = "13px system-ui, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText("WASD move · Shift sneak · Q pebble · M mute", VIEW_W - 14, HUD_H / 2 + 1);
  ctx.textAlign = "left";
}

function drawCaption(ctx, game) {
  ctx.fillStyle = "#0d1119";
  ctx.fillRect(0, VIEW_H - CAPTION_H, VIEW_W, CAPTION_H);
  ctx.fillStyle = "#232c3f";
  ctx.fillRect(0, VIEW_H - CAPTION_H, VIEW_W, 2);
  ctx.fillStyle = "#c8d2e2";
  ctx.font = "15px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(game.caption || game.level.hint, VIEW_W / 2, VIEW_H - CAPTION_H / 2 + 1);
  ctx.textAlign = "left";
}

function drawOverlay(ctx, game) {
  if (game.status === "play") return;
  ctx.fillStyle = "rgba(5,8,14,0.72)";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (game.status === "title") {
    ctx.fillStyle = "#ffd76a";
    ctx.font = "bold 54px system-ui, sans-serif";
    ctx.fillText("THE LANTERN THIEF", VIEW_W / 2, 300);
    ctx.fillStyle = "#e8e8f0";
    ctx.font = "20px system-ui, sans-serif";
    ctx.fillText("Steal every relic. Reach the exit unseen.", VIEW_W / 2, 360);
    ctx.fillStyle = "#8fa1b8";
    ctx.font = "17px system-ui, sans-serif";
    ctx.fillText("WASD / click to move · Shift to sneak · Q to throw a pebble", VIEW_W / 2, 410);
    ctx.fillStyle = "#ffd76a";
    ctx.font = "bold 20px system-ui, sans-serif";
    ctx.fillText("Press Enter or click to begin", VIEW_W / 2, 470);
  } else if (game.status === "clear") {
    ctx.fillStyle = "#7be495";
    ctx.font = "bold 44px system-ui, sans-serif";
    ctx.fillText("LEVEL CLEAR", VIEW_W / 2, 380);
    ctx.fillStyle = "#e8e8f0";
    ctx.font = "20px system-ui, sans-serif";
    ctx.fillText("Press Enter for the next level", VIEW_W / 2, 430);
  } else if (game.status === "over") {
    ctx.fillStyle = "#ff6b81";
    ctx.font = "bold 44px system-ui, sans-serif";
    ctx.fillText("CAUGHT!", VIEW_W / 2, 380);
    ctx.fillStyle = "#e8e8f0";
    ctx.font = "20px system-ui, sans-serif";
    ctx.fillText("Press R to try the level again", VIEW_W / 2, 430);
  } else if (game.status === "win") {
    ctx.fillStyle = "#ffd76a";
    ctx.font = "bold 44px system-ui, sans-serif";
    ctx.fillText("THE VAULT IS YOURS", VIEW_W / 2, 360);
    ctx.fillStyle = "#e8e8f0";
    ctx.font = "20px system-ui, sans-serif";
    ctx.fillText("Every relic stolen. No guard ever knew your name.", VIEW_W / 2, 410);
    ctx.fillStyle = "#8fa1b8";
    ctx.font = "17px system-ui, sans-serif";
    ctx.fillText("Press R to play again", VIEW_W / 2, 450);
  }
  ctx.textAlign = "left";
}

/** Paint the whole game state onto the canvas context. */
export function drawGame(ctx, game) {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = "#0b0f16";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  drawFloor(ctx, game.level);
  drawLanternLight(ctx, game.level);
  drawPatrolRoutes(ctx, game.guards);
  drawTiles(ctx, game.level, game);
  drawRings(ctx, game);
  drawThief(ctx, game);
  drawGuards(ctx, game);
  drawHUD(ctx, game);
  drawCaption(ctx, game);
  drawOverlay(ctx, game);
}
