import { cpSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-game.ts";

// The Lantern Thief — the hand-in program for best-stealth-game-20261121-1759.
// It copies game/ and screenshots/ into the output directory and writes
// dossier.json exactly as buildDossier writes it from those files, so the
// gate's rebuild of the dossier matches this one byte for byte. Outside the
// grader, MAKEFUN_OUTPUT_DIR stands in for /output. The output directory
// itself is never removed: in the grader it is a bind-mount.
const root = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
mkdirSync(outDir, { recursive: true });
cpSync(join(root, "game"), join(outDir, "game"), { recursive: true });
cpSync(join(root, "screenshots"), join(outDir, "screenshots"), { recursive: true });
const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
});
writeFileSync(join(outDir, "dossier.json"), dossier);

// A short hand-in summary on stdout, so a build log shows what was handed in:
// the dossier bytes and the counts of game files and screenshots copied.
function countFiles(dir) {
  let n = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    n += entry.isDirectory() ? countFiles(join(dir, entry.name)) : 1;
  }
  return n;
}
console.log(
  "The Lantern Thief: dossier.json " + dossier.length + " bytes, " +
  countFiles(join(outDir, "game")) + " game files, " +
  readdirSync(join(outDir, "screenshots")).length + " screenshots -> " + outDir
);
