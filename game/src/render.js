// render.js — every pixel of The Lantern Thief, drawn on one canvas.
//
// The scene is top-down: a dark manor floor at night, warm lantern pools,
// pale vision cones sweeping the stone, and the thief's small hooded figure
// slipping between cover. The HUD rides on a bar at the top; messages and
// overlays (menu, caught, level clear, victory) are drawn on the canvas too,
// so a screenshot always shows the whole game.

const VIEW_W = 1280;
const VIEW_H = 860;
const HUD_H = 56;
const PLAY_Y = 56;

// Tile palette: night stone, shadow ground, warm light, wood, leaf.
const FLOOR_A = "#232833";
const FLOOR_B = "#20242e";
const SHADOW_A = "#171a22";
const SHADOW_B = "#15181f";
const WALL_TOP = "#3a4152";
const WALL_FACE = "#272c38";
const WALL_LINE = "#14171f";
const CRATE = "#6b4f2a";
const CRATE_LINE = "#4a3419";
const BUSH = "#1e3d24";
const BUSH_LIT = "#2c5a33";

function drawFloor(ctx, grid, time) {
  for (let ty = 0; ty < ROWS; ty++) {
    for (let tx = 0; tx < COLS; tx++) {
      const ch = grid[ty][tx];
      const x = tx * TILE;
      const y = PLAY_Y + ty * TILE;
      const dark = isDarkTile(ch);
      const checker = (tx + ty) % 2 === 0;
      ctx.fillStyle = dark ? (checker ? SHADOW_A : SHADOW_B) : (checker ? FLOOR_A : FLOOR_B);
      ctx.fillRect(x, y, TILE, TILE);
      // A faint stone seam on every tile, so the floor reads at a glance.
      ctx.strokeStyle = "rgba(0,0,0,0.25)";
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
      if (ch === "L") {
        // A lantern pool: warm light spilling over the stone.
        const g = ctx.createRadialGradient(
          x + TILE / 2, y + TILE / 2, 6,
          x + TILE / 2, y + TILE / 2, TILE * 0.95
        );
        const pulse = 0.10 + 0.03 * Math.sin(time * 2.2 + tx + ty);
        g.addColorStop(0, "rgba(255,196,90," + pulse + ")");
        g.addColorStop(1, "rgba(255,196,90,0)");
        ctx.fillStyle = g;
        ctx.fillRect(x, y, TILE, TILE);
        // The lantern itself: a small hanging lamp on a post.
        ctx.fillStyle = "#3d2f16";
        ctx.fillRect(x + TILE / 2 - 2, y + 6, 4, 16);
        ctx.fillStyle = "#ffcf6e";
        ctx.beginPath();
        ctx.arc(x + TILE / 2, y + 26, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fff3c4";
        ctx.beginPath();
        ctx.arc(x + TILE / 2, y + 26, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
      if (ch === "B") {
        // A bush: a cluster of dark leaves the thief can hide inside.
        ctx.fillStyle = BUSH;
        for (let i = 0; i < 5; i++) {
          const bx = x + 12 + ((i * 13) % 40);
          const by = y + 14 + ((i * 17) % 36);
          ctx.beginPath();
          ctx.arc(bx, by, 13, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = BUSH_LIT;
        ctx.beginPath();
        ctx.arc(x + 20, y + 20, 6, 0, Math.PI * 2);
        ctx.arc(x + 44, y + 40, 6, 0, Math.PI * 2);
        ctx.fill();
      }
      if (ch === "C") {
        // A crate: wooden box with cross planks, solid cover.
        ctx.fillStyle = CRATE;
        ctx.fillRect(x + 6, y + 6, TILE - 12, TILE - 12);
        ctx.strokeStyle = CRATE_LINE;
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 6.5, y + 6.5, TILE - 13, TILE - 13);
        ctx.beginPath();
        ctx.moveTo(x + 6, y + 6);
        ctx.lineTo(x + TILE - 6, y + TILE - 6);
        ctx.moveTo(x + TILE - 6, y + 6);
        ctx.lineTo(x + 6, y + TILE - 6);
        ctx.stroke();
      }
      if (ch === "#") {
        // A wall: dark stone face with a lit top edge.
        ctx.fillStyle = WALL_FACE;
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = WALL_TOP;
        ctx.fillRect(x, y, TILE, 8);
        ctx.strokeStyle = WALL_LINE;
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
      }
    }
  }
}

function drawExit(ctx, exit, open, time) {
  const x = exit.x;
  const y = PLAY_Y + exit.y;
  const glow = open ? 0.75 + 0.2 * Math.sin(time * 3) : 0.25;
  ctx.save();
  ctx.globalAlpha = glow;
  const g = ctx.createRadialGradient(x, y, 4, x, y, 58);
  g.addColorStop(0, open ? "rgba(120,255,170,0.85)" : "rgba(120,140,120,0.35)");
  g.addColorStop(1, "rgba(120,255,170,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, 58, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // The doorway: a stone arch with a green door.
  ctx.fillStyle = "#39415a";
  ctx.fillRect(x - 20, y - 24, 40, 48);
  ctx.fillStyle = open ? "#37d67a" : "#5a6b52";
  ctx.fillRect(x - 14, y - 18, 28, 42);
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.fillRect(x - 14, y - 18, 28, 4);
  if (!open) {
    // Locked: a chain across the door until every relic is found.
    ctx.strokeStyle = "#c8b06a";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - 14, y - 2);
    ctx.lineTo(x + 14, y - 2);
    ctx.stroke();
  }
}

function drawRelic(ctx, relic, time) {
  const x = relic.x;
  const y = PLAY_Y + relic.y + Math.sin(time * 2 + relic.bob) * 3;
  const pulse = 0.5 + 0.25 * Math.sin(time * 3 + relic.bob);
  ctx.save();
  ctx.globalAlpha = pulse;
  const g = ctx.createRadialGradient(x, y, 2, x, y, 30);
  g.addColorStop(0, "rgba(255,214,90,0.9)");
  g.addColorStop(1, "rgba(255,214,90,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // A small golden lantern-relic with a star inside.
  ctx.fillStyle = "#ffd65a";
  ctx.beginPath();
  ctx.arc(x, y, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff6c9";
  ctx.beginPath();
  ctx.arc(x, y, 4, 0, Math.PI * 2);
  ctx.fill();
}

function drawVisionCone(ctx, guard, grid) {
  const gx = guard.x;
  const gy = PLAY_Y + guard.y;
  const hot = guard.state === "chase";
  const warm = guard.state === "suspicious" || guard.state === "search";
  const base = hot ? "255,80,60" : warm ? "255,170,60" : "255,220,120";
  const alpha = guard.alert > 60 ? 0.38 : guard.alert > 25 ? 0.28 : 0.20;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(gx, gy);
  ctx.arc(gx, gy, CONE_RANGE, guard.facing - CONE_FOV / 2, guard.facing + CONE_FOV / 2);
  ctx.closePath();
  const g = ctx.createRadialGradient(gx, gy, 10, gx, gy, CONE_RANGE);
  g.addColorStop(0, "rgba(" + base + "," + alpha + ")");
  g.addColorStop(1, "rgba(" + base + ",0)");
  ctx.fillStyle = g;
  ctx.fill();
  // A faint edge along the cone so its sweep reads even when shrunk.
  ctx.strokeStyle = "rgba(" + base + "," + (alpha * 0.9) + ")";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(gx, gy);
  ctx.lineTo(gx + Math.cos(guard.facing - CONE_FOV / 2) * CONE_RANGE, gy + Math.sin(guard.facing - CONE_FOV / 2) * CONE_RANGE);
  ctx.moveTo(gx, gy);
  ctx.lineTo(gx + Math.cos(guard.facing + CONE_FOV / 2) * CONE_RANGE, gy + Math.sin(guard.facing + CONE_FOV / 2) * CONE_RANGE);
  ctx.stroke();
  ctx.restore();
}

function drawGuard(ctx, guard, time) {
  const x = guard.x;
  const y = PLAY_Y + guard.y;
  const bob = Math.sin(guard.stepPhase) * 1.5;
  // Body: a watchman in a dark blue coat with a brass helmet.
  ctx.fillStyle = "#2e3d5c";
  ctx.beginPath();
  ctx.arc(x, y + bob * 0.3, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#c8a24a";
  ctx.beginPath();
  ctx.arc(x, y - 3 + bob * 0.3, 8, 0, Math.PI * 2);
  ctx.fill();
  // Facing tick: a short nose showing where the guard looks.
  ctx.strokeStyle = "#dfe6f2";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x + Math.cos(guard.facing) * 10, y + Math.sin(guard.facing) * 10);
  ctx.lineTo(x + Math.cos(guard.facing) * 20, y + Math.sin(guard.facing) * 20);
  ctx.stroke();
  // State mark above the head: ! when chasing, ? when searching or wary.
  if (guard.state === "chase") {
    drawMark(ctx, x, y - 30, "!", "#ff5a3c");
  } else if (guard.state === "search" || guard.state === "suspicious") {
    drawMark(ctx, x, y - 30, "?", "#ffcf5a");
  } else if (guard.alert > 40) {
    drawMark(ctx, x, y - 30, "!", "#ffcf5a");
  }
  // Alert arc under the guard: how close it is to raising the alarm.
  if (guard.alert > 2) {
    ctx.strokeStyle = guard.alert > 60 ? "#ff5a3c" : "#ffcf5a";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, 22, -Math.PI / 2, -Math.PI / 2 + (guard.alert / 100) * Math.PI * 2);
    ctx.stroke();
  }
}

function drawMark(ctx, x, y, text, color) {
  ctx.fillStyle = color;
  ctx.font = "bold 20px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x, y);
}

function drawPlayer(ctx, player, time) {
  const x = player.x;
  const y = PLAY_Y + player.y;
  const crouch = player.sneaking ? 0.8 : 1;
  // A faint warm halo from the thief's hand-lantern, so the small figure
  // reads against the dark floor even when the shot is shrunk.
  const halo = ctx.createRadialGradient(x, y, 4, x, y, 42);
  halo.addColorStop(0, "rgba(255,214,90,0.16)");
  halo.addColorStop(1, "rgba(255,214,90,0)");
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(x, y, 42, 0, Math.PI * 2);
  ctx.fill();
  // The thief: a small hooded figure in a dark cloak, lantern glint at hand.
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, crouch);
  ctx.fillStyle = "#1c2733";
  ctx.beginPath();
  ctx.arc(0, 0, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#31435c";
  ctx.beginPath();
  ctx.arc(0, -2, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffd65a";
  ctx.beginPath();
  ctx.arc(Math.cos(player.facing) * 10, Math.sin(player.facing) * 10, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Footstep puffs while moving, fainter while sneaking.
  if (player.moving) {
    ctx.fillStyle = player.sneaking ? "rgba(200,210,230,0.10)" : "rgba(200,210,230,0.18)";
    ctx.beginPath();
    ctx.arc(x - Math.cos(player.facing) * 12, y - Math.sin(player.facing) * 12, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawHud(ctx, hud) {
  ctx.fillStyle = "#10131a";
  ctx.fillRect(0, 0, VIEW_W, HUD_H);
  ctx.fillStyle = "#2a3040";
  ctx.fillRect(0, HUD_H - 2, VIEW_W, 2);
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillStyle = "#e8ecf4";
  ctx.font = "bold 17px sans-serif";
  ctx.fillText(hud.levelName, 16, HUD_H / 2);
  // Relics collected, as golden dots.
  ctx.font = "15px sans-serif";
  ctx.fillStyle = "#ffd65a";
  ctx.fillText("Relics " + hud.relicsGot + "/" + hud.relicsTotal, 300, HUD_H / 2);
  // Alert meter: the highest guard alert, filling red as danger grows.
  const mx = 480;
  const mw = 260;
  ctx.fillStyle = "#222634";
  ctx.fillRect(mx, 16, mw, 22);
  const alert = Math.max(0, Math.min(100, hud.alert));
  ctx.fillStyle = alert > 60 ? "#ff5a3c" : alert > 25 ? "#ffcf5a" : "#5ad07a";
  ctx.fillRect(mx, 16, (mw * alert) / 100, 22);
  ctx.strokeStyle = "#4a5165";
  ctx.lineWidth = 1;
  ctx.strokeRect(mx + 0.5, 16.5, mw, 22);
  ctx.fillStyle = "#e8ecf4";
  ctx.font = "bold 13px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(alert > 60 ? "SPOTTED!" : alert > 25 ? "SUSPICIOUS" : "HIDDEN", mx + mw / 2, 28);
  ctx.textAlign = "left";
  // Lives as hearts, timer, and the mute hint.
  ctx.fillStyle = "#ff6b81";
  ctx.font = "17px sans-serif";
  ctx.fillText("♥".repeat(Math.max(0, hud.lives)), 780, HUD_H / 2 + 1);
  ctx.fillStyle = "#e8ecf4";
  ctx.font = "15px sans-serif";
  ctx.fillText("Time " + hud.timeText, 900, HUD_H / 2);
  ctx.fillStyle = "#8a93a8";
  ctx.fillText("WASD move · Shift sneak · M mute", 1030, HUD_H / 2);
}

function drawBottomBar(ctx, text) {
  ctx.fillStyle = "#10131a";
  ctx.fillRect(0, VIEW_H - 36, VIEW_W, 36);
  ctx.fillStyle = "#c8cede";
  ctx.font = "14px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, VIEW_W / 2, VIEW_H - 18);
  ctx.textAlign = "left";
}

function drawCenterPanel(ctx, title, lines, accent) {
  ctx.fillStyle = "rgba(8,10,16,0.72)";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = "#1a1f2b";
  ctx.strokeStyle = accent || "#ffd65a";
  ctx.lineWidth = 2;
  const w = 560;
  const h = 120 + lines.length * 30;
  const x = (VIEW_W - w) / 2;
  const y = (VIEW_H - h) / 2;
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.fill();
  ctx.stroke();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = accent || "#ffd65a";
  ctx.font = "bold 30px sans-serif";
  ctx.fillText(title, VIEW_W / 2, y + 48);
  ctx.fillStyle = "#e8ecf4";
  ctx.font = "16px sans-serif";
  lines.forEach(function (line, i) {
    ctx.fillText(line, VIEW_W / 2, y + 96 + i * 30);
  });
  ctx.textAlign = "left";
}

// The full scene: floor, exit, relics, cones, guards, thief, HUD, bottom bar.
function drawScene(ctx, state, time) {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = "#0b0d12";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  drawFloor(ctx, state.grid, time);
  drawExit(ctx, state.exit, state.exitOpen, time);
  state.relics.forEach(function (relic) {
    if (!relic.taken) drawRelic(ctx, relic, time);
  });
  state.guards.forEach(function (guard) {
    drawVisionCone(ctx, guard, state.grid);
  });
  state.guards.forEach(function (guard) {
    drawGuard(ctx, guard, time);
  });
  drawPlayer(ctx, state.player, time);
  drawHud(ctx, state.hud);
  drawBottomBar(ctx, state.hint);
}
