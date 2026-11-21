// main.ts — the hand-in program for The Lantern Thief (round 2).
// It copies game/ and screenshots/ from this repository into the output
// directory and writes /output/dossier.json with buildDossier from the
// kit's vendor library. No network, no dependencies, deterministic: two
// runs over the same repository write byte-identical output. Outside the
// grader, MAKEFUN_OUTPUT_DIR stands in for /output. The output directory
// itself is never removed: in the grader it is a bind-mount.
import { cpSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-game.ts";

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR || "/output";

mkdirSync(outDir, { recursive: true });
cpSync(join(repoRoot, "game"), join(outDir, "game"), { recursive: true });
cpSync(join(repoRoot, "screenshots"), join(outDir, "screenshots"), { recursive: true });

const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
});
writeFileSync(join(outDir, "dossier.json"), dossier);

// A short hand-in summary for the log: what was copied and how big the
// dossier is, so a failed or partial hand-in is obvious at a glance.
import { readdirSync, statSync } from "node:fs";

function countFiles(dir) {
  let files = 0;
  let bytes = 0;
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const info = statSync(path);
    if (info.isDirectory()) {
      const sub = countFiles(path);
      files += sub.files;
      bytes += sub.bytes;
    } else {
      files += 1;
      bytes += info.size;
    }
  }
  return { files, bytes };
}

const gameStats = countFiles(join(outDir, "game"));
const shotStats = countFiles(join(outDir, "screenshots"));
console.log(`The Lantern Thief: dossier.json ${dossier.length} bytes -> ${outDir}`);
console.log(`  game/: ${gameStats.files} files, ${gameStats.bytes} bytes`);
console.log(`  screenshots/: ${shotStats.files} files, ${shotStats.bytes} bytes`);
