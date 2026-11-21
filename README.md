# The Lantern Thief

[![make.fun](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=referral&utm_campaign=competition)
[![make.fun rank](https://make.fun/badge/best-stealth-game-20261121-1759/Kkajasd/stealth-game-20261121/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=referral&utm_campaign=competition)
[![make.fun reward](https://make.fun/badge/best-stealth-game-20261121-1759/Kkajasd/stealth-game-20261121/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=referral&utm_campaign=competition)

A top-down stealth game for the make.fun bounty
[best-stealth-game-20261121-1759](https://make.fun/bounty/best-stealth-game-20261121-1759).
You are a thief in a manor at night. Steal every glowing relic, then slip out
the exit — unseen.

## How to play

- **Move:** WASD or arrow keys. **Click a tile** to walk there.
- **Sneak:** hold Shift — slower and quieter, much harder for guards to spot.
- **Guards** walk patrols and sweep the rooms with vision cones. Cross a cone
  and their alert rises; break line of sight and it fades. At full alert a
  guard gives chase — if one grabs you, you lose a life.
- **Lantern light** betrays you (guards spot you farther in it); **shadow
  ground and bushes** hide you.
- **Relics:** collect them all to unlock the glowing exit. Three manors,
  three lives, one score. `M` mutes, `R` restarts the level, `Esc` pauses.

## How to run

Serve `game/` with any static server and open `game/index.html` in a desktop
browser — no build step, no network, everything is local:

```sh
python3 -m http.server --directory game 8080
```

The hand-in program is `main.ts` (Node 22): it copies `game/` and
`screenshots/` to `/output` and writes `/output/dossier.json`.

## Layout

- `game/index.html` — the page; `game/style.css` — page chrome.
- `game/src/random.js` — seeded RNG; `levels.js` — the three manor maps.
- `game/src/guards.js` — patrols, vision cones, alert, chase and search.
- `game/src/render.js` — all drawing; `game/src/input.js` — keyboard + mouse.
- `game/src/audio.js` — procedural WebAudio cues; `game/src/shots.js` —
  frozen screenshot scenes (`?shot=cover|patrol|alarm|exit`).
- `game/src/main.js` — boot, loop, movement, pickups, getting caught.
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged.
