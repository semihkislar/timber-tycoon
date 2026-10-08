# Changelog

All notable changes to Timber Tycoon are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project uses [Semantic Versioning](https://semver.org/).

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

[1.3]: ./releases/timber-tycoon-v1.3.html
[1.2]: ./releases/timber-tycoon-v1.2.html
[1.1]: ./releases/timber-tycoon-v1.1.html
[1.0]: ./releases/timber-tycoon-v1.0.html
