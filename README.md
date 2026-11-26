# Skyline Courier — Island Run

A complete, original flight game for the make.fun **Best Flight Game** bounty
($500). Fly the little red mail plane over a tropical island chain, thread
eight golden rings, then land on the island runway before the clock runs out.

## Play

Open `game/index.html` in a desktop browser (served over HTTP, no network
needed — everything is static files under `game/`).

- **↑ / W** climb · **↓ / S** descend · **← → / A D** or **mouse** to steer
- **SHIFT** faster · **CTRL** slower · **C** cockpit / chase view
- **P** pause · **M** mute · **R** fly again · **ENTER** start

Rings are worth +100 points and +15 seconds; landing after all eight rings
pays +500 plus a time bonus. Watch the fuel gauge — rings top it up a
little. Clip a hill or the sea and the run is over.

## What the screenshots show

1. Chase view with a golden ring dead ahead over a green island coast.
2. Cockpit view on final approach: runway, windsock and lit instruments.
3. Low pass between islands with a ring ahead and a snow-capped peak behind.
4. Cockpit view threading a ring over the sea.

Every screenshot is a real render of the game's own code (`?shot=1..4`
stages the plane mid-course and holds the frame).

## Structure

- `game/index.html` — page + styles, loads the game
- `game/src/main.js` — boot, frame loop, phase switching, screenshot mode
- `game/src/game.js` — flight model, course progress, scoring, crash/landing
- `game/src/world.js` — island terrain height, ring course, runway
- `game/src/render.js` — pseudo-3D forward view: sky, terrain mesh, rings,
  runway, plane and cockpit
- `game/src/hud.js` — instruments (altitude, speed, heading, attitude,
  fuel, throttle), compass, course panel, menus
- `game/src/input.js` — keyboard + mouse controls
- `game/src/audio.js` — synthesised engine hum, ring chime, wind (WebAudio)
- `game/src/shots.js` — screenshot presets

`main.ts` (Node 22, standard library only) copies `game/` and `screenshots/`
to `/output` and writes `/output/dossier.json` via `vendor/makefun-game.ts`.

## License

MIT — see `LICENSE`.
