# Changelog

All notable changes to Timber Tycoon are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project uses [Semantic Versioning](https://semver.org/).

## [2.1] — 2026-10-08

Feedback addressed: *"the trucks are really bad"* and *"I want realistic people in the forest"*.

### Added
- **Real iso 3D vehicle kit** (`VF`/`vbox`/`vwheel`/`vlog`): every vehicle is now a small 3D model drawn from oriented
  boxes, so it's correct at *any* heading, including smooth turns at corners (it's no longer a flat rotated sprite).
  Visible faces are chosen by normal, faces are shaded, wheels are dark ellipses with hubcaps on the visible side,
  and footprints have a soft two-layer shadow.
- **Log trucks**: a cab with hood, grille, headlights, windshield, side windows, mirrors, roof marker lights and a chrome
  exhaust stack; a ladder headboard, stakes and a 3-2-1 pyramid of round-ended logs. They drive the dirt road,
  brake to a stop beside the log yard, and unload log by log with their own **knuckle-boom crane**
  (the grapple lifts each log off). Then they turn round in a turnaround bulb and drive out. Trucks keep a following
  distance by route progress.
- **Shipping trucks**: a box trailer with a company stripe, ribs and a "TIMBER CO." wordmark (never mirrored), plus five
  liveries. They drive the highway, wait in a queue on the road, and **reverse into the dock bay** on an arc. The rear doors swing open
  so crates are visible inside, and a dock hand carries crates from the platform. A loading bar fills, then the truck pulls out
  with a coin pop.
- Accelerating and braking (brake lights), a slight suspension bounce, and exhaust puffs that scale with throttle.
- **Forklifts** with a seated driver, overhead guard, mast, forks and pallet; the **harvester** is a 6-wheel model with a boom.
- **Realistic people** (`human()`): proportioned figures with a head about 1/7.5 of their height, varied skin tones and hair, men and women,
  hard hats or caps, plaid or hi-vis shirts, arms, legs and boots, plus a walk cycle. Poses: two-handed axe swing (wind-up, strike,
  chips, recoil), chainsaw with vibration and sawdust, log on the shoulder, crate carry, plant, sit, drink,
  wipe brow, look around, clipboard and point.
- **Forest crew AI**: lumberjacks pick a tree and walk to a work spot facing the camera. They chop or saw, the tree **falls in
  the cut direction** with a "Timber!" callout, they buck it, carry the log to a **landing pile** that visibly
  grows, and rest. Stumps stay until regrowth.
- Other forest roles: a **foreman** with a clipboard who paces and points, a **planter** who plants saplings at stumps
  that grow back, and a **tea break** with two people on a log bench and one standing by a campfire with a kettle. Caps are 8 axe + 5 chainsaw crew.
  A 2-person starter crew is always working, so the forest is alive from the first second.
- Yard workers use the same human figure.
- Test helpers `TT.forestPeople()`, `TT.vehicles()` and `TT.LANDINGS`; new `test/v21.py` (28 checks).
- Screenshots `screenshot-forest.png` and `screenshot-trucks.png`.

### Changed
- People are about 15% larger. The default camera now shows the forest band, with a crew working on load on desktop and mobile.
- Removed a lamp post that stood in the log-truck turnaround.

### Compatibility
- v2.0 (and older) saves load unchanged; the version is bumped to 2.1.

## [2.0] — 2026-10-08

> **Visual direction (read this before future releases):** from v2.0 the game is *scene-first* — a full-screen,
> Lumber Inc.-style **isometric 2.5D factory** drawn entirely in code on a canvas. The old 3-column card layout is gone
> for good. New features should show up *in the world* (a building, vehicle, worker, prop or effect on the iso map) and
> only use the bottom sheets for numbers and buttons. Keep the cozy palette (warm earth yard, grass, cream/brown UI),
> tile-aligned ground (no screen-aligned rectangles), shaded 3-face boxes for anything solid, and no external
> images, fonts or CDNs. `lumber-idle.html` is a build artifact: edit `src/*` and run `src/build.sh`.

### Added
- **Isometric factory world** filling the whole viewport (desktop and mobile portrait): diamond-tile grass, a raised
  tile-aligned packed-earth factory yard, a paved production lane with curbs and lamps, concrete pads per lot, a dirt log
  road and an asphalt highway past the shipping dock; depth-sorted (painter's algorithm) objects, soft shadows, drifting
  cloud shadows and a vignette
- **Every building on its own lot** as a shaded 3D model: Sawmill (red gable, spinning saw), Wood Chipper (hopper and fan),
  Charcoal Kiln (brick, glowing arches, tall chimney), Carpentry (timber-frame), Pellet Press (silo), Paper Mill
  (sawtooth roof, turning rollers), Furniture Factory (signage). Buildings grow and gain windows, a cupola, a flag
  and gold trim at milestones; smoke rises from chimneys while running
- Conveyors with moving belts and visible goods run from each building to the lane; yard workers carry the right
  inputs, forklifts haul finished goods to the **shipping dock**, and box trucks back in, load and drive off when goods sell
  (with a big coin pop)
- Forest crews in the world: lumberjacks chopping (tree shake, fall, stump, regrow), chainsaw crews, log trucks on the
  dirt road, harvesters working a stump clearing, drones and a sky-crane helicopter; tree look follows your wood tier
- Unbuilt lots show a dashed construction plot with brambles or cones and a price/“Earn X” tag; an affordable lot glows
  and is built with a single tap (with a build "poof")
- Status in the world: red **!** bubbles over starved buildings, **zzz** and dimming when switched off, level pills with
  milestone stars, milestone star flashes, floating +coin numbers over the dock
- **Tap anything:** a building opens its bottom-sheet card (level, rate, inputs → outputs, milestone stars, status,
  ×1/×10/Max upgrade, on/off, prev/next); the log yard opens Crew, the dock opens Market; tapping the forest chops
  with an axe swing and wood-chip particles. Hit-testing uses the real iso building outlines
- **Camera:** drag to pan, mouse wheel / pinch to zoom (clamped), auto-fit on load, "Fit factory" in Settings; the camera
  slides the selected building above the open sheet
- Slim top bar (coins, income/s, logs/s, Seeds, version badge, mute) and a compact bottom bar (Crew, Market, Upgrades,
  Trophies, Replant, Settings) with notification dots; all panels are bottom sheets
- `src/` with the source parts and `src/build.sh`; `test/v20.py` covering v1.3 save migration, viewport coverage,
  hit-testing of all 7 lots + yard + dock, sheet focus, build-by-tap, pan/zoom bounds, entity caps, pause-when-hidden,
  golden logs in the scene and mobile touch

### Changed
- Whole UI rebuilt around the scene; trophies, market, upgrades, prestige and settings moved into bottom sheets
- `test/functional.py`, `v12.py`, `v13.py` and `shot.py` rewritten for the scene UI; release screenshots:
  `screenshot.png` (desktop mid-game), `screenshot-mobile.png`, `screenshot-sheet.png`, `screenshot-early.png`

### Performance
- requestAnimationFrame loop with DPR-aware canvas; static ground (tiles, roads, static trees) is cached in 512px
  offscreen chunks per zoom level (LRU, bounded); particles and entities are capped; rendering pauses while the tab is hidden

### Fixed / Compatibility
- v1.x saves (v1.0–v1.3) load and migrate; all systems (collectors, chain logic, market/auto-sell, upgrades, tree tiers,
  Seeds prestige, events, golden logs, trophies, milestones, yard workers, offline progress, autosave, SFX) are unchanged

## [1.3] — 2026-10-08

### Added
- **Building milestones** ⭐: at levels 10, 25, 50, 100, 200 and 400 every building doubles its speed (×2 per star, stacking)
- Milestone row on each building card: lit stars, a gold progress bar to the next milestone, and the current speed multiplier
- Milestone celebration: toast, card glow pulse, confetti and a spinning gold star with "×2 speed!" over the building in the scene
- **Yard workers** 👷 (Lumber Inc. style): hard-hat workers in colour-coded vests walk a dirt yard in front of the factory row, carrying logs from a new log pile at the forest edge, planks from the Sawmill, chips from the Chipper and chairs from the Carpentry to the buildings that need them, then walk back empty
- Each building has 1 yard worker plus 1 per milestone (max 5); they slow down when the building is starved and nap ("z") when it is switched off
- Log pile at the forest edge grows with your log stock; delivery pops when cargo is dropped off
- Scene level badges show milestone stars (e.g. `L45 ★★`)
- 3 new trophies: Milestone!, Star Factory (10 stars) and Centurion (any building Lv 100) — 32 in total
- Company stats show milestone stars
- `test/v13.py` covering milestones, yard workers, v1.2 save migration and mobile

### Changed
- Version bumped to `v1.3`; release screenshots show the Buildings tab with milestones

### Fixed / Compatibility
- v1.2 saves load cleanly; milestones come from existing building levels, so older empires get their stars (and the new trophies) straight away

### Next ideas
- Research tree / skill points spent on specialisations
- Daily contracts (deliver X chairs in Y minutes for a reward)
- Seasonal visuals (autumn/winter forest) and weather in the scene
- Market cart / delivery truck carrying finished goods off-screen
- Managers that auto-upgrade a building to its next milestone

## [1.2] — 2026-10-07

### Added
- **Trophies tab** 🏆 with 29 achievements in bronze, silver and gold (chopping, earnings, crews, logs/s, buildings, wood tiers, upgrades, replanting, golden logs)
- Each trophy permanently gives **+2% to all production** (collectors, buildings, chopping); trophies survive replanting
- Illustrated SVG medals with shine animation, progress bars on locked trophies, "NEW" badges, tab notification dot, and trophy toasts (gold trophies throw confetti)
- **Golden Logs** ✨: a glowing, sparkling golden log occasionally appears over the forest scene for ~13s; tap/click it for a Lucky Haul (coin bonus), **Timber Frenzy** (collectors & chopping ×5 for 20s) or **Gold Rush** (all prices ×3 for 20s)
- Scene label flashes "Golden Log! Tap it!" while one is up; sparkle burst and chime on catch
- Company stats show trophies and golden logs caught
- `test/v12.py` covering trophies, golden logs, v1.1 save migration, mobile tap

### Changed
- Version bumped to `v1.2`; screenshots show the trophy tab and a golden log

### Fixed / Compatibility
- v1.1 saves load cleanly: trophy data is added on load and already-earned trophies unlock at once with a single summary toast

### Next ideas
- Worker carriers walking logs between buildings in the scene (Lumber Inc. style)
- Research tree / skill points spent on specialisations
- Daily contracts (deliver X chairs in Y minutes for a reward)
- Seasonal visuals (autumn/winter forest) and weather in the scene
- Building-level milestones (×2 speed at levels 25/50/100)

## [1.1] — 2026-10-06

### Added
- Animated empire scene canvas: forest trees (tier + collector count), chopping lumberjacks, trucks/harvesters/drones/helicopters when owned, day/night sky cycle, drifting clouds, birds, falling trees
- Factory row in the scene with per-building art (spinning sawmill blade, kiln/paper smoke); starved or off buildings grey out
- Animated resource flow particles along the factory chain (rate-proportional)
- Custom inline SVG icons for resources, collectors, and buildings
- Chop polish: axe swing animation, wood-chip particle burst, panel screen-shake, floating +N
- Coin counter tick-up animation; purchase progress bars; card hover polish; wood-grain panel textures
- Celebratory confetti/leaf burst on new building unlock and tree-tier advance
- Event banners with small illustration badges
- Optional WebAudio sound effects (chop, buy, unlock, coin, event) with mute toggle (default muted)
- Version badge in header/footer (`v1.1`); version stored in save with backward-compatible migration from v1.0
- Frozen release copy at `releases/timber-tycoon-v1.1.html`

### Changed
- Visual overhaul across header, panels, and market (SVG icons alongside emoji labels)
- Scene scales responsively on mobile; rendering pauses when the tab is hidden

### Fixed
- Save loading migrates missing v1.1 fields (`version`, `muted`) from v1.0 saves

## [1.0] — 2026-10-06

### Added
- Chop logs with floating feedback; 6 wood collectors (Lumberjack → Sky-Crane)
- Production chain: Sawmill, Wood Chipper, Charcoal Kiln, Carpentry, Pellet Press, Paper Mill, Furniture Factory
- Starved / utilization badges on buildings and live production-chain view
- Warehouse & market with auto-sell (surplus only, 2s buffer for downstream)
- 20 upgrades, tree tiers Pine → Ebony (global price multiplier)
- Prestige: Replant the Forest for permanent Seeds (+10% production each)
- Random timed events, offline progress (capped at 8h), autosave every 10s
- `window.TT` test/debug hook; Playwright functional & balance tests

[2.1]: ./releases/timber-tycoon-v2.1.html
[2.0]: ./releases/timber-tycoon-v2.0.html
[1.3]: ./releases/timber-tycoon-v1.3.html
[1.2]: ./releases/timber-tycoon-v1.2.html
[1.1]: ./releases/timber-tycoon-v1.1.html
[1.0]: ./releases/timber-tycoon-v1.0.html
