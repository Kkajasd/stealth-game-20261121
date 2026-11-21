# The Lantern Thief

[![make.fun](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=referral&utm_campaign=competition)
[![make.fun rank](https://make.fun/badge/best-stealth-game-20261121-1759/Kkajasd/stealth-game-20261121/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=referral&utm_campaign=competition)
[![make.fun reward](https://make.fun/badge/best-stealth-game-20261121-1759/Kkajasd/stealth-game-20261121/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=referral&utm_campaign=competition)

A top-down stealth game for the make.fun bounty
**best-stealth-game-20261121-1759**. You are the Lantern Thief: steal
every relic in the manor, the gallery and the vault, then reach the exit
unseen. Guards walk patrol loops with vision cones — lantern light gives
you away, bushes hide you, and a thrown pebble pulls a guard off its
route so you can slip past.

## How to play

- **WASD / arrows** — move. **Click** a tile to walk there.
- **Shift** — sneak: slower and quieter, much harder to spot.
- **Q** — throw a pebble toward the mouse. Guards in earshot walk over
  to investigate the noise. You have a few pebbles per level.
- **M** — mute. **Enter** — start / next level. **R** — retry.

Watch the alert meter: **HIDDEN** means no guard can see you,
**SUSPICIOUS** means one stopped to look, **SPOTTED** means it is
chasing you. If a guard touches you while spotted, you lose a life and
wake up back at the start of the level. Collect every relic to unlock
the exit.

## Run it

Open `game/index.html` in a desktop browser (or serve `game/` with any
static server). No build step, no network, no dependencies — the game is
plain files under `game/`, and `main.ts` (Node 22) copies `game/` and
`screenshots/` to `/output` and writes `/output/dossier.json`.

Deterministic screenshot scenes live in `game/src/shots.js` and are
rendered with `?shot=cover`, `?shot=distract`, `?shot=alarm` or
`?shot=exit`.
