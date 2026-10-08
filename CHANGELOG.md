# Changelog

All notable changes to Timber Tycoon are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project uses [Semantic Versioning](https://semver.org/).

## [2.4] — 2026-10-08

**Managers** run your buildings and **fires** break out now and then. Tap them out, or build a **fire station** whose red truck answers every call.

### Added
- **12 unique managers**, one per building, each with a hand-drawn SVG portrait, a rarity (Common/Rare/Epic/Legendary) and a special skill:
  Emre Yıldız (Sawmill, Pace Setter), Sofia Rossi (Chipper, Stock Master), Mert Demir (Kiln, Fire Marshal), Elif Kaya (Carpentry, Lucky Batch),
  Kwame Mensah (Pellets, Lean Line), Yuki Tanaka (Paper, Pace Setter), Defne Aydın (Furniture, Lucky Batch), Lucas Moreau (Atelier, Lean Line), Zeynep Çelik (Parquet, Stock Master),
  Priya Sharma (Stationer, Client Charmer), Can Öztürk (Cabinetry, Pace Setter) and Isabella García (Showroom, Lucky Batch).
  Skills: faster production, chance to double each batch, lower input use, bigger storage, better order rewards, fire safety.
  Every manager also adds +3…12 % speed. Managers are hired with coins, levelled 1→10 with coins (levels 6–10 also cost Seeds).
  No random rolls. They keep working offline and stay through Replant.
- **Staff panel** (new 👔 Staff button): manager cards with portrait, rarity, skill and hire/level button, plus the fire-safety block.
  The building sheet shows that building's manager, and a fire note while it burns.
- Managers **walk around their building** in the scene in a suit or a coloured safety vest with a rarity diamond above them.
  Lucky Batch managers pop a "×2" over the building when it triggers.
- **Fires**: occasional fires (kiln ≈3× and pellet press ≈2× more likely; premium buildings never burn, no fires in the first 5 min, offline, or within 2 min of the last one).
  A burning building shows flames, glow, smoke and embers and pauses. **Tap the flames 12×** for a hero bonus (≈30 s of income).
  Unattended, a fire burns out after 60 s with no permanent loss.
- **Fire Station** (5 levels) in the empty yard corner next to the Log Yard: a red truck with a flashing light bar drives to the fire,
  firefighters hop out and spray water arcs, then the truck backs into its bay. Each level: −10 % fire risk, faster dispatch, stronger spray.
  New upgrades **Smoke Detectors** (−25 % risk) and **Sprinkler System** (−35 %). Trophies: Firefighter, Fire Brigade, First Hire, Management Team.
- `test/v24.py` (69 checks). New screenshots: `screenshot-fire.png`, `screenshot-fire-night.png`, `screenshot-managers.png`, `screenshot-mobile-staff.png`.

### Changed
- Save version 2.4. v2.3 saves migrate automatically (managers/station/fire state initialised, everything else kept).
- Balance bot now checks trophies every simulated second, as the real game loop does. Earlier bot runs undercounted trophy bonuses.
  v2.4 with managers earns ≈ +23 % at 1 h vs v2.3 (8 seeded runs). Without managers it is within noise of v2.3.

## [2.3] — 2026-10-08

The world now lives: a **day/night cycle**, **four seasons** and **weather**, each with gameplay effects.

### Added
- **Day/night cycle** (7 min per in-game day). A half-resolution light map is multiplied over the iso scene:
  warm morning, white midday, golden hour, orange dusk and a moonlit blue night that stays readable (≈55 % of daytime brightness).
  After dusk every window lights up, street lamps and the premium area's gold lamps cast light pools, building door lamps,
  the kiln furnace and the campfire flicker, trucks/vans/forklifts drive with headlight beams and red taillights (brighter when braking),
  the premium showroom glass glows, and a starry sky band with a moon appears at the top of the screen.
- **Seasons** (3 in-game days each, a full year is 84 min), with ground, trees and roofs redrawn per season:
  spring cherry-blossom trees, blossoming bushes and petals drifting; lush summer; autumn golden larches, orange/red
  broadleaves, yellowed grass, fallen leaves and leaves blowing across the screen; winter snow on the ground, roofs,
  box tops, bushes and snow-capped trees.
- **Weather events** rolled per season: rain (streaks, splashes, puddles with ripples that dry slowly, overcast tint, headlights on),
  snowfall (winter only), sunny spells (soft sunbeams) and wind (wind streaks, swaying trees, more leaves). Weather is announced with a toast.
- **Gameplay effects**: spring collectors +10 % and stumps regrow ~2× faster; summer buildings +8 %; autumn chairs, furniture,
  cabinets & luxury furniture +25 %; winter charcoal & pellets +35 %, gift boxes +20 %. Rain collectors & chopping −15 %,
  sunny +15 %, snowfall collectors −10 % but charcoal & pellets +15 %, wind kiln +20 %.
- **Season · weather · clock widget** in the top HUD (day/night dial, season & day, weather with its current effect, clock);
  tap it for a season calendar with all effects and the time until the next season.
- `test/v23.py` (43 checks) and new screenshots: `screenshot-night.png`, `screenshot-winter.png`, `screenshot-autumn.png`,
  `screenshot-rain.png`, `screenshot-mobile-night.png`.

### Changed
- The Cold Snap event no longer rolls in summer.
- `test/shot.py` pins the world clock and weather for every shot so screenshots are deterministic; `test/balance.py` accepts a `URL` override.
- Balance: the bot reaches ≈ +13 % lifetime earnings after 1 h compared with v2.2 (seasonal boosts outweigh rain/snow), so progression stays in range.

### Compatibility
- v2.2 saves migrate automatically: the world clock starts at 07:12 on day 1 of spring with fair weather; everything else is kept.
- The calendar keeps running through Replant and while offline.

## [2.2] — 2026-10-08

Three new systems: a **Premium Factory Area**, **premium client orders** and **upgradable stock areas**.

### Added
- **Premium Factory Area**: a fenced compound east of the main yard, between the factory and the highway.
  - Its plot shows from 500K earned and opens for **2M coins**. While locked it shows a "COMING SOON" board.
  - **Showroom levels 2–5** cost 2M × 12^level; each one adds **+25 % to premium prices**.
  - Look: dark walnut buildings with gold cornices, lit glass storefronts with goods inside, kind-specific roof details,
    lamps, planters, and a "TIMBER CO. RESERVE" gate arch.
  - It has its own **RESERVE dock** where black-and-gold premium trucks reverse in, load and leave by their own lane.
    A premium forklift and staff work inside.
  - Main-factory goods visibly travel in on an **elevated overhead conveyor**. A lift tower carries them over the
    carpentry line and they come down to a receiving table.
- **5 luxury workshops** fed only by main-factory products:

  | Workshop | Inputs | Output (price) |
  |---|---|---|
  | Gift Box Atelier | charcoal + pellets | Grill Gift Boxes (230) |
  | Parquet Workshop | planks + charcoal | Artisan Flooring (180) |
  | Stationery House | paper | Premium Stationery (380) |
  | Cabinet Studio | chairs + planks | Designer Cabinets (380) |
  | Luxury Showroom | furniture + planks | Luxury Furniture (1,900) |

  They share the main buildings' levels, milestones and stars, and have a Premium sheet that lists them.
- **Client orders**:
  - Clients start calling once you've earned 250 coins and the Sawmill runs, then every 3–5 minutes.
  - Each offer arrives with an **animated order card**, a red dot on the new **Orders** bottom-bar button, and a client
    **limo that drives up to the premium gate**. The client steps out under a "New order!" bubble.
  - An offer can be accepted or declined within 75 s. You then get **3, 4 or 5 minutes** to deliver.
  - The amount scales with your current output: 25–40 % of what you make over that time.
  - An accepted order is a priority contract. It takes the surplus plus **at least 70 %** of the item's output, and any
    stockpiled stock goes in right away. "Deliver from storage" also hands over the downstream buffer.
  - **Reward**: the larger of 1.8× the goods' sale value or 25 % of your income over the time limit, ×1.25 for premium
    goods. There's a chance of a bonus: **VIP Rush** (all prices ×2 for 45 s) or **+1 Seed** (premium orders, after 10M earned).
  - Orders use main-factory goods early and mostly premium goods once you have them.
  - Delivery celebration: confetti, toast, coin burst, and the client leaving happy. A missed order counts in the order
    book but has no penalty.
  - The Orders panel shows the live offer or progress, an order book (completed / missed / history) and a shortcut to
    the Premium area.
- **Stock areas**: every building now has visible stockpiles on its lot (premium ones in front of the workshop).
  - The **input pallet** empties when the building is short of inputs, and the **output rack** fills with crates of the
    real product.
  - Higher levels add racking (Lv 2), a canopy (Lv 4) and gold trim (Lv 6).
  - **Capacity** is the building's output for 60 s × 2^level, pooled per product.
  - When the output stockpile is full, the building **pauses**. A red "⛔ FULL" pill shows over it, a "FULL" sign on
    the rack, and "Storage FULL" in its sheet.
  - **Upgrades (Lv 1–8)** are in the building sheet. Each costs base cost × 5 × 5^level and doubles capacity, and each
    level adds **+5 % loading speed**.
  - A **Keep stock** toggle turns auto-sell off for that product so stock builds up for orders.
- 3 new trophies: *Order Up!*, *Trusted Supplier*, *Haute Bois*.
- New `test/v22.py` (51 checks). `test/bot.js` now buys the premium area and stock upgrades and accepts orders.
  Screenshots `screenshot-premium.png`, `screenshot-order.png` and `screenshot-storage.png`.

### Changed
- The desktop camera framing is wider so the premium compound fits. On mobile, opening the Premium sheet pans to it.
- On mobile the order card sits above the bottom bar, so toasts never cover it, and it hides while a sheet is open.
- Shortage badges: a mild shortage (≥70 % running) is now a small calm amber "!". The bouncing red alert is only for
  real starvation.
- Dock trucks, premium trucks and the client limo keep a gap from each other in the shared highway lane.
- Balance: with default settings (auto-sell on) the early game never hits FULL. Orders, the premium area and storage
  together make the 30-minute bot run about 2–5× faster than v2.1, depending on which orders come up.

### Compatibility
- v2.1 saves (and older ones) migrate automatically. New fields start empty: premium area locked, stock areas Lv 0,
  no orders yet, premium workshops at 0, auto-sell on for premium goods.
- Offline progress: stockpiles fill to their caps and stop. No new clients call while you're away, but an accepted order
  keeps collecting and can complete (VIP Rush isn't granted offline) or expire.

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

[2.4]: ./releases/timber-tycoon-v2.4.html
[2.3]: ./releases/timber-tycoon-v2.3.html
[2.2]: ./releases/timber-tycoon-v2.2.html
[2.1]: ./releases/timber-tycoon-v2.1.html
[2.0]: ./releases/timber-tycoon-v2.0.html
[1.3]: ./releases/timber-tycoon-v1.3.html
[1.2]: ./releases/timber-tycoon-v1.2.html
[1.1]: ./releases/timber-tycoon-v1.1.html
[1.0]: ./releases/timber-tycoon-v1.0.html
