// main.ts — hand-in program for The Lantern Thief (round 3).
//
// Copies game/ and screenshots/ from this repository into /output and
// writes /output/dossier.json with buildDossier from vendor/makefun-game.ts.
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output.
// Deterministic: two runs write byte-identical outputs. Standard library
// only, no network. Never deletes the output directory itself: in the
// grader /output is a bind-mount, so only its contents are cleared.

import { copyFileSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-game.ts";

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? "/output");

function copyTree(srcDir: string, dstDir: string): void {
  mkdirSync(dstDir, { recursive: true });
  const entries = readdirSync(srcDir).sort();
  for (const entry of entries) {
    const src = join(srcDir, entry);
    const dst = join(dstDir, entry);
    const st = statSync(src);
    if (st.isDirectory()) {
      copyTree(src, dst);
    } else if (st.isFile()) {
      copyFileSync(src, dst);
    }
  }
}

function clearDir(dir: string): void {
  mkdirSync(dir, { recursive: true });
  for (const entry of readdirSync(dir)) {
    rmSync(join(dir, entry), { recursive: true, force: true });
  }
}

clearDir(outDir);
copyTree(join(repoRoot, "game"), join(outDir, "game"));
copyTree(join(repoRoot, "screenshots"), join(outDir, "screenshots"));

const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 256 * 1024 },
  game_max_files: 993,
  game_max_bytes: 48 * 1024 * 1024,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outDir, "dossier.json"), dossier);

// Hand-in summary: how much went out, so a human running this by hand
// can see at a glance that the game, its screenshots and its dossier
// all landed in /output.
const gameFiles = readdirSync(join(outDir, "game"), { recursive: true }).length;
const shotFiles = readdirSync(join(outDir, "screenshots")).length;
console.log(
  `The Lantern Thief: dossier.json ${dossier.length} bytes, ` +
    `${gameFiles} game files, ${shotFiles} screenshots -> ${outDir}`
);
