# The Lantern Thief

[![make.fun](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=referral&utm_campaign=competition)
[![make.fun rank](https://make.fun/badge/best-stealth-game-20261121-1759/Kkajasd/stealth-game-20261121/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=referral&utm_campaign=competition)
[![make.fun reward](https://make.fun/badge/best-stealth-game-20261121-1759/Kkajasd/stealth-game-20261121/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=referral&utm_campaign=competition)

A top-down stealth game for the [best-stealth-game-20261121-1759](https://make.fun/bounty/best-stealth-game-20261121-1759) bounty on make.fun. You are the Lantern Thief: slip through three guarded manors, take every relic, and reach the glowing exit unseen.

## How to play

- **Move** with WASD or the arrow keys; **click a tile** to walk there.
- Hold **Shift** to sneak — slower and quieter, much harder to spot.
- Guards patrol fixed routes (shown as faint dotted lines) with bright vision cones. Being seen raises the alert meter: **HIDDEN** (green) → **SUSPICIOUS** (amber, the guard turns to look) → **SPOTTED** (red, the guard chases).
- Hide in **bushes** and dark **shadow**; **lantern light** makes you far easier to spot. Breaking line of sight lets the alert fall again.
- Collect every **relic** (gold diamonds) to unlock the **exit**. Getting caught costs a life; three lives per level.
- **R** restarts the level, **N** starts a new game, **P** pauses, **M** mutes.

## Levels

1. **The Manor Garden** — 2 guards, 3 relics. Learn the patrols.
2. **The Gallery** — 3 guards, 4 relics. The lanterns leave nowhere to hide.
3. **The Vault** — 4 guards, 5 relics. One way in, one way out — unseen.

## Run it

The game is static files under `game/` — serve the folder and open `game/index.html` in a desktop browser (no network needed, no build step):

```sh
python3 -m http.server 8080 --directory game
```

`main.ts` (Node 22) hands the entry in: it copies `game/` and `screenshots/` to `/output` and writes `/output/dossier.json` via `buildDossier` from `vendor/makefun-game.ts`.

## Screenshots

The four screenshots under `screenshots/` are real renders of this game's own code: the cover shows the thief in a bush as a guard's cone sweeps past, with relics and the locked exit in frame; the others show patrols, a near-miss alarm, and the vault exit open.
