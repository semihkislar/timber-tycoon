# Changelog

All notable changes to Timber Tycoon are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project uses [Semantic Versioning](https://semver.org/).

## [2.9] — 2026-10-10

**Mobile-first controls**: the game is now designed for a phone in portrait first (360–430 px), with a usable landscape layout, and desktop keeps working as before.

### Camera & gestures (`js/input.js`, new)
- One **Pointer Events** layer for touch, pen and mouse (`touch-action:none` on the canvas).
- **One-finger pan with momentum**: the release velocity (last ~110 ms of the gesture) carries on with friction. Holding still before lifting gives no fling. A tap during a glide only stops it.
- **Pinch zoom anchored at the pinch midpoint**. The midpoint also pans, so two fingers can zoom and move at once. Past the zoom limits it resists and springs back on release.
- **Double-tap open ground** zooms ×2 toward that point; a second double-tap flies back out to the fit view. Taps on buildings, trees, fires and golden logs still act immediately, so rapid chopping is unaffected.
- **Rubber-band soft bounds** sized to the world (`CAM_WORLD`, limits depend on zoom and viewport). Dragging past the edge is progressively resisted and springs back.
- **Tap vs drag threshold**: 10 px for touch, 8 px for pen, 5 px for mouse. Taps longer than 650 ms count as long presses, not taps. Gesture timing uses the events' own timestamps, so a slow frame can't turn a tap into a long press.
- **Smooth eased fly-to** (`flyTo` / `flyToWorld`, cubic in-out, 320–900 ms by distance) frames targets in the visible band between the HUD and the bottom bar or open sheet. In landscape it frames them between the rail and the side sheet.
- **Generous hit areas**: when hit polygons overlap, the nearest object centre wins. A tap up to 12 screen px outside a building, office or fire-station outline still counts.
- **No accidental browser gestures**: `viewport-fit=cover`, no user scaling, fixed `html`/`body` with `overscroll-behavior:none`, and non-passive `touchmove` guard outside scrollable areas. This blocks pull-to-refresh, iOS bounce and page pinch. `gesturestart` and `dblclick` are cancelled, and text selection, the long-press callout and tap highlight are off. Safe-area insets are applied on all edges.
- Desktop: mouse drag (with momentum), wheel / trackpad-pinch zoom at the cursor, arrow keys pan, `+`/`-` zoom.

### Keeping 60 fps while panning and zooming
- **Pan-margin ground layer**: the ground is composed once with a margin around the viewport (256 css px, capped at half a chunk of world). Panning at a fixed zoom only shifts the blit. Before, every pan frame redrew all ground chunks scaled (the v2.8 limitation).
- **While zooming**, sprites and buildings missing at the new scale blit their last cached frame scaled. The ground layer is drawn scaled too. Sharp versions are rendered once the zoom settles: at most 4 building re-renders per frame, a few new sprites per frame, and new chunks only where no fallback exists.
- **Chunk cache sized to the viewport** (was a fixed 42). Wide or zoomed-out views (landscape phones) used to thrash it, re-rendering chunks every frame at ~300 ms/frame. They now stay at ~1.6 ms of JS per frame.
- `tools/panbench.py` (new): real CDP touch input on an emulated Pixel 7, late game. Frame cost includes raster flush, headless software rendering:

| gesture | v2.8 avg / p95 / max | v2.9 avg / p95 / max | frames over 16.7 ms |
|---|---|---|---|
| 4 s one-finger pan | 15.5 / 25.4 / **115** ms | 14.0 / 19.4 / **35** ms | 35 % → 19 % (with 28 % more frames rendered) |
| 3 s pinch in/out | 22.1 / 45.7 / **131** ms | 19.2 / 25.3 / **54** ms | p95 and hitches down; most pinch frames still above 16.7 ms in software raster |

### Navigation without swiping (`js/mobile.js`, new)
- **📍 Quick-jump chips**: Forest, Log Yard, Factory, Premium, Harbour, R&D, Dock. Each is a 46 px chip in a scrollable row above the bottom bar that flies the camera there. Locked areas show 🔒 and still fly to the empty plot.
- **⚠️ Needs-attention button** with a count badge. It cycles through fires, full storage, starved buildings and affordable builds/upgrades, in that order. Each tap opens the building sheet, flies the camera and shows a short tip ("⚠ Kiln: starved for Logs 2/5").
- **Auto-focus on events** (Settings toggle, on by default): new fires, golden logs and client orders fly the camera there when off screen. It never interrupts you: it is skipped for 6 s after you touch the camera, during a gesture or with a full-height sheet.
- The building sheet's **‹ › arrows** fly the camera to the next building.

### Mobile-first UI
- **Bottom bar**: 5 thumb targets on phones (Crew, Market, Orders, Upgrades, **More**), each at least 56 px tall. **More** opens a sheet of large tiles for Staff, R&D, Trophies, Replant and Settings, and shows a red dot when any of them has news. Desktop keeps the full bar.
- **Draggable bottom sheets** with **half** (~52 % of the screen) and **full** snap points. Drag the header, tap it, or use ▴/▾ to switch. A downward swipe or fast flick closes the sheet; from full it drops to half. Pulling the content down while it is scrolled to the top drags the sheet. Content scrolls natively with momentum (`touch-action:pan-y`, `overscroll-behavior:contain`) and never pans the scene or the page.
- **Compact top HUD**: coins, income and logs. Tap the numbers or ▾ to show seeds, the scene label and the weather/calendar widget.
- **Bigger text and targets** in sheets: 15 px body text, ≥44 px buttons, 44 px prev/next arrows, larger segmented controls and switches.
- **Hold-to-repeat** on Build/Upgrade, Hire (collectors and planters) and storage buttons. It starts after 420 ms, speeds up to ~20 buys per second and stops on release; the release never buys an extra one. A new **Max** button buys as many levels as you can afford and shows how many (+N).
- **Haptic feedback** via `navigator.vibrate` on taps, buys, snaps, fires and the attention button. It can be turned off in Settings.
- **Toasts** sit under the HUD, at most two at a time on phones, so they never cover the bottom controls or action buttons. The order card and daily chip moved left of the action buttons.
- **Landscape phones** (height ≤ 520 px): the bottom bar becomes a left **rail**, and sheets open as a **right side panel**. The camera frames targets between the two.

### Installable (PWA)
- `manifest.webmanifest` (fullscreen, any orientation) with icons generated from the in-game logo (`python3 tools/build_icons.py` → `assets/icon-192/512/180.png`, maskable 512).
- `sw.js`: **network-first for every request**, so a new GitHub Pages deploy shows up on the next load; the cache is only an offline fallback. It skips `releases/` snapshots and other origins. It is only registered over https and never from a release snapshot.

### Saves
- v2.8 → v2.9: new `prefs` (`autoFocus`, `haptics`, both on), kept through Replant. No gameplay or balance changes.

### Tests
- New `test/v29.py` (140 checks) on **iPhone 13** and **Pixel 7** emulation (`hasTouch`, real CDP touch events):
  - touch: pan with momentum and friction, no fling after holding still, rubber band and spring-back, pinch anchored at the midpoint (0 px drift) with spring-back at the limit, double-tap zoom in/out, tap vs 7 px wobble vs drag, generous hit area
  - navigation: quick-jump chips, needs-attention cycling, ‹ › framing, auto-focus on/off/after-touch
  - sheets: half→full→half→closed by drag, header tap, content scroll not moving the camera or page, pull-down at the top
  - no page scroll or browser zoom; hold-to-repeat (one tap = one level, hold = many, stops on release); Buy max; haptics on/off; toasts clear of the controls
  - pan render path (ground layer reused, sprite caches hit); landscape rail and side sheet; desktop mouse, wheel, click and keys; v2.8 → v2.9 save migration; PWA files; no 404s or console errors
- Updated for the new phone layout: v23 (weather widget lives in the expanded HUD), v24/v25/v26 (5 bottom buttons + More instead of 8–9 squeezed ones), v20 (chunk-cache bound follows the viewport). v28 version checks are now forward-compatible.
- Screenshots: `screenshot-mobile.png`, `screenshot-mobile-sheet.png`, `screenshot-mobile-jump.png`, `screenshot-mobile-landscape.png` (made by `python3 test/shot_mobile.py`) and a refreshed `screenshot.png`.

## [2.8] — 2026-10-10

**Performance & assets**: no more stutter in long sessions, a multi-file project layout, sprite caching and an art pass.

### Profiling (what was wrong)
Measured with Playwright + CDP (`tools/profile.py`): a late-game save (40 min of greedy bot play) fast-forwarded for **2.5 game hours** with the balance bot (24 game-s per real s, Crew/Market/Orders/… sheets opening and closing) while the scene rendered in real time. Every ~12 s: frame cost incl. raster flush, post-GC heap, DOM nodes, listeners, scene/save array sizes, save size/time. GC pauses came from CDP tracing windows at the start and end, plus a heap-snapshot constructor diff.
- **Root cause of the stutter: a memory leak in `shade()`.** The colour-shade cache was keyed by the raw float factor. Animated faces (vehicles, people, building parts) pass a new float every frame, so the cache grew by **~1,000 strings per second, without bound**. The heap snapshot diff: +866K strings / +34 MB in 7 minutes. Post-GC heap went 11 → 68 MB, and the longest GC pause tripled (9 → 27 ms). Over a 1–2 hour real session that means hundreds of MB and ever-longer GC hitches.
  Side bug: `rgb()` inputs came out as `rgb(NaN,…)` and were silently dropped.
- **Frame cost was dominated by rasterising vector paths every frame** (~70 % of main-thread time showed up as raster, not JS): ~50 people, ~90 trees, all buildings and vehicles were redrawn path by path at 60 fps. Scaled or sub-pixel `drawImage` was ~7× slower than integer-aligned blits (micro-benchmarked).
- Not the cause (measured): save size (8.5 KB, 0.1 ms stringify), event/order/trade arrays (all capped), particles/smoke (capped), DOM listeners (stable), HUD DOM updates (< 0.3 ms per render).
- Also found: **opening the Market sheet after buying Steel Spades crashed** (`baseUpgPrice` stub lacked `plantT`). Fixed.

### Before → after (same 2.5-game-hour session, headless Chromium, 1280×800, software raster)
| metric | v2.7 | v2.8 |
|---|---|---|
| post-GC heap, start → end | 11.2 → **68.0 MB** (growing ~8 MB per real minute) | 8.9 → **10.6 MB** (flat) |
| longest GC pause (8 s trace, end of session) | 26.9 ms | 11.1 ms |
| major GC time (8 s trace, end) | 27 ms | 11 ms |
| frame cost incl. raster, avg (first → last third) | 29.7 → 27.2 ms | 20.1 → 19.9 ms |
| frame cost p95 | 34.3 → 30.0 ms | 24.8 → 24.6 ms |

Steady-scene benchmark (`tools/bench.py`, late game, no sheets open): day/fit **22.7 → 13.2 ms**, day/zoomed **17.8 → 11.9 ms**, night/fit **26.2 → 17.5 ms**, night/zoomed **23.2 → 15.1 ms** per frame, i.e. ~1.7× faster.

### Changed: project layout (no longer a single HTML file)
- `index.html`: slim shell (markup only). `css/style.css`: all styles. `js/*.js`: the game as **ordered classic scripts** sharing one global scope, no bundler. Load order is the `<script>` list in `index.html`: logic → ui → systems → `scene1.js` → `sprites.js` → `scene2…11.js` → `main.js`.
- `assets/atlas-trees.png` + `.json`: pre-rendered 2× tree atlas (484 frames: 5 tree tiers × 4 seasons × 11 colour variants, growth stages, stumps). It is built by `python3 tools/build_assets.py`, which runs the game's own `drawTreeRaw` in headless Chromium and packs the frames. The atlas is optional at runtime (`?noatlas` disables it).
- **Releases**: `python3 tools/release.py` copies a full playable snapshot into `releases/v<VERSION>/` and regenerates `versions.html` (newest first). Single-file releases v1.0–v2.7 stay as they are. `lumber-idle.html` now redirects to `index.html`.
- Tests load `index.html` over a local HTTP server (`test/_server.py`, started automatically on a free port). Migration tests open the old single-file releases on the same origin.
- `src/` and `src/build.sh` are gone: edit `js/`, `css/` and `index.html` directly.

### Performance
- `shade()` cache: factors quantised to 1/128 and stored in a bounded `Map`. It parses `#rgb`, `#rrggbb` and `rgb()`.
- **Sprite cache** (`js/sprites.js`): people (pose × 12-frame walk cycle × facing × cargo), trees/saplings/stumps, vehicles (64 headings × bounce/load/doors; exhaust points re-based) and cargo icons are rendered once at the exact device scale. They are then blitted unscaled on whole pixels. LRU with a 20 MP budget, canvas pool, OffscreenCanvas, and at most 24 new sprites per frame (direct drawing while zooming).
- **Live building sprites**: each building is cached in its own canvas and re-rendered at 15 fps while running (3 fps idle), or immediately on level/season/weather/zoom change. Window-light quads are replayed and emitters get the skipped dt, so smoke/particle rates are unchanged.
- **Static ground layer**: with a still camera the visible ground is composed once into a screen-sized layer (invalidated on camera move or chunk re-render). The camera snaps when its easing is below 0.01 px.
- **Light map** at 0.4× resolution, rebuilt every other frame, upscaled once, then multiplied with an unscaled blit.
- Labels/pills cached as bitmaps. Particles and smoke pooled with in-place compaction (no per-frame arrays). Floats capped at 60. Lamps culled off-screen.
- HUD/DOM updates throttled to ~4 Hz, with dirty checks (forest card). Autosave every 30 s plus on tab hide/pagehide (was 10 s).
- **Hidden tabs do no simulation work**. On return the elapsed time is caught up through the offline simulation.

### Art pass (worst-looking assets, redrawn)
1. **Broadleaf trees**: dark outline, shaded/lit leaf clusters, highlight clusters, leaf texture, visible branches, bark-shaded trunk with root flare.
2. **Conifers**: scalloped needle tiers with outline, shadow side, underside band, needle strokes, layered snow caps in winter.
3. **Stumps**: outlined, with root flare, bark ridges, growth rings and a crack. **Saplings**: mulch ring and outlined canopy.
4. **Helicopter**: shaded rounded fuselage, glass cockpit with glare, tapered tail boom with fin and tail rotor, skids, twin-blade rotor disc, strapped log bundle.
5. **Drone**: shaded body, outlined arms, motion-blurred rotors, camera gimbal.
6. **Cargo icons** (conveyors, pallets): small outlined isometric objects (log bundle with end grain, plank stack, chip heap, chair, labelled crates) instead of flat rectangles.
7. **Street lamps**: cast-iron post with base, curved arm and glass lantern.

Screenshots: `screenshot-assets-before.png`, `screenshot-assets-after.png`, `screenshot-assets-compare.png` (side by side), refreshed `screenshot.png`.

### Tests
- New `test/v28.py`: layout/no-404 checks, v2.7 → v2.8 save migration, atlas, sprite-cache hit rate and budget, bounded shade cache, particle caps, 4 Hz HUD, hidden-tab pause + catch-up + save on hide, release snapshot, and a **long-session perf test**. The perf test fast-forwards ~2 game hours (default `V28_LONG_SEC=300` ≈ 2 game hours) and asserts frame cost stays flat and the post-GC heap does not grow.
- Fixed two timing races in `functional.py` / `v27.py` (now read values in one evaluate).

## [2.7] — 2026-10-09

**Planting crew**: the forest is now a resource. Loggers use up grown trees, and you hire planters to put saplings back on the stumps.

### Added
- **Forest stock**: the logging forest has a fixed number of plots, each holding a grown tree, a young tree, a sapling or a stump. Every collector fells grown trees in proportion to its count (lumberjacks least, helicopters most). Manual chopping takes a little too.
  - Full log output while at least ~10 s of felling stands grown. Below that, output falls with the stock. At 0 only what matures gets cut, plus a very slow natural regrowth (a small trickle).
  - Growth: sapling → young → grown (~30 s + ~40 s at base). **Spring ×1.5, summer ×1.1, autumn ×0.85, winter ×0.6.**
- **Planting crew** (new section in the Crew sheet, own cost scaling ×1.15):
  🧑‍🌾 **Planter** (0.1 saplings/s, 🪙60; **the first one is free**), 👩‍🌾 **Planting Team** (0.8/s, 🪙15K), 🏡 **Tree Nursery** greenhouse (6/s, 🪙1.5M), 🛸 **Seed Drone** (45/s, 🪙120M).
  Each hire also adds forest land (+90 plots per sapling/s), which is planted straight away.
- **Upgrades**: ⛏️ Steel Spades (Planters & Teams ×2), 🌾 Fertilizer (growth +50 %), 🌲 Elite Saplings (+50 % logs per tree), 💧 Drip Irrigation (growth +50 %).
- **Research**: 🧬 Tree Genetics (after the Experimental Lab): saplings grow 30 % faster and each tree yields +20 % logs.
- **Forest HUD chip**: cover bar plus the grown-tree count. It turns amber when thinning and pulses red when depleted. Tapping it opens Crew.
  A forest card in the Crew sheet shows the grown / young / sapling / stump bar, felling vs planting rates, the growth multiplier with the season, and log output %.
- **Depletion warnings**: a toast and an in-world bubble say "Forest depleted, hire planters!". The Crew button gets a dot when you can afford a planter.
- **Scene**: the logging zones mirror the stock. Felled trees stay as stumps until planted.
  Planters (varied looks, sapling bag) walk to a stump, **dig** with a spade (dirt flies), set the sapling, **water** it and move on. Team members wear orange/yellow vests.
  Saplings grow in place through visible stages. The **Tree Nursery** greenhouse has glass panels, white mullions, benches of seedlings, seed beds, a gardener, and a warm glow at night.
  **Seed drones** circle over the forest dropping seed pods. Entity caps: ≤ 2 planters + 4 team members + 1 gardener, ≤ 2 drones.
- Trophies: 🌱 **Green Thumb** (plant 1,000 saplings), 🌳 **Reforestation** (plant 100,000).
- `test/v27.py` (60+ checks). Screenshots: `screenshot-planters.png`, `screenshot-depleted.png`.

### Changed
- Save version 2.7. **v2.6 saves migrate with a full forest** and a free planting crew sized to cover the loggers they already own, so nobody loads into a depleted forest.
- **Replant** resets the forest to full and the crew to one free planter. Lifetime saplings planted (trophies) are kept.
- Offline progress simulates felling, planting and growth. The welcome-back card reports saplings planted and forest cover.
- Balance bot buys planters when depletion looms. Over 10 one-hour runs it stays within roughly ±15 % of v2.6 at most checkpoints (see README / report).
- The old single cosmetic planter is replaced by the real planting crew.
- Mobile: compact forest chip. Golden logs now spawn below the HUD sub-bar.

## [2.6] — 2026-10-09

**Daily contracts** — three local-day jobs at the new Contract Office, with streaks, a courier van and an Orders tab.

### Added
- **Daily contracts**: once the Sawmill is running and you have earned ~🪙500, each local calendar day offers **exactly 3 contracts** (Easy / Standard / Hard).
  Deliver amount A of resource R within duration D for coin rewards (Hard ones can also grant a Seed or a short VIP Rush).
  Amounts and rewards scale from current production (same idea as client orders). Mix of common goods plus premium/tech goods when you make them.
- **Up to 2 concurrent** active contracts. Declining frees that day's slot with **no replacement**.
- **Priority fill**: active dailies take surplus plus ≥65 % of that item's output; **Deliver from storage** fills the rest.
- **Streak**: consecutive local days with ≥1 complete. Bonuses while the streak is active: day 3 → +8 %, day 7 → +15 %, day 14 → +25 % contract rewards.
  A single timeout does not break the streak; ending a day with zero completes does.
- **Contract Office / Notice Board** between the Furniture Factory and the Shipping dock: wooden porch, cork board with fluttering papers, night lamp, winter snow on the roof. Tap it to open the Daily tab.
- On complete: toast + confetti and a realistic **courier van** (box truck) loads at the office then drives onto the highway off-screen.
- Orders sheet tabs: **📅 Daily | 📋 Clients**. Defaults to Daily when new offers await. Streak badge, progress cards, history. Notification dot on Orders when a daily offer is waiting. Optional HUD chip while a daily is active.
- Trophies: On the Clock, Three-Day Grind, Week Warrior, Contract Ace.
- `test/v26.py` (60 checks). Screenshots: `screenshot-daily.png`, `screenshot-daily-office.png`, `screenshot-mobile-daily.png`.

### Changed
- Save version 2.6. v2.5 saves migrate automatically: daily state starts empty; everything else is kept.
- **Replant** keeps streak / best streak / total completes; clears today's offers and actives.
- Offline: contracts keep filling from production and timers advance with the existing offline cap (no unfair extra expiry).

### Fixed
- (none required beyond migration init)

## [2.5] — 2026-10-08

A **Research Lab** turns paper into Research Points for a 14-node **research tree**. A **harbour and rail station** on the river ships your goods to six cities on a **trade map**.

### Added
- **Research Lab** on a new **R&D campus** north-east of the yard. It opens once you own a Paper Mill.
  The lab burns paper and makes **Research Points** (RP): +0.015 RP/s per unit of lab speed, more with level, milestones and research.
- **Research tree** with 14 nodes in 6 tiers:
  Wood Science (lab +25 % RP); Carbide Blades, Pulp Chemistry, Steam Bending (+15 % for their buildings);
  Pine Tar Glue (kilns also distil glue); Market Research (all prices +5 %); Kiln Science (kiln & pellets +15 %, fire risk −30 %);
  Trade Logistics (trade payouts +20 %, trips 20 % faster); Automation (all buildings +10 %, costs Seeds); Lab Robotics (lab +50 % RP);
  Masterworks (plywood, toys, boats & luxury goods +25 %, costs Seeds).
  Each node has prerequisites, an RP cost and a detail card with time-to-afford.
- **Three tech buildings** unlocked by research:
  **Plywood Mill** (planks + glue → plywood), **Toy Workshop** (plywood + paper → wooden toys), and **Boat Yard** at the harbour (plywood + planks + glue → wooden boats).
  The Boat Yard has a boat on its slipway under a gantry crane. New goods: Pine Tar Glue, Plywood, Wooden Toys, Wooden Boats.
- **Harbour & Rail Station** (5 levels) on the river by the highway. It has a quay, container cranes, a rail platform and a harbour office.
  Levels add ships (1 → 3) and trains (1 → 2) and bigger holds.
- **Trade map** (🌍 Trade tab): a stylised world map with our mill at Bartın. You can open routes to Istanbul and Hamburg (rail) and to Rotterdam, Dubai, New York and Tokyo (sea).
  Each city pays its own multiplier per good (likes ×1.2–1.7), and demand drifts every 45 s.
  Random **demand spikes** pay ×2 for 2½ min. Tap a good to load the next free ship or train.
  It collects up to 80 % of that good's production until full (or tap **Depart**), then sails and pays on arrival.
  **Auto-repeat** (on by default, toggle in the Trade tab) reloads returning vessels with the same cargo, so trade also runs while you are away.
- Ships and trains **move in the scene**. Ships berth at the quay and steer out to the far fairway when they leave, and trains load at the platform and run along the rail line.
  A ribbon over the harbour shows every vessel's progress. The campus and harbour get street lamps at night, and roofs take snow in winter.
- **R&D button** (🧪) in the bottom bar. It appears once the lab or harbour is available and opens a **Research & Trade** sheet with both tabs.
  A dot shows when a node is affordable or a spike is live.
- Trophies: Eureka!, Think Tank, Bon Voyage, Global Brand.
- `test/v25.py` (86 checks). New screenshots: `screenshot-research.png`, `screenshot-trade.png`, `screenshot-harbour.png`, `screenshot-campus.png`, `screenshot-mobile-research.png`.

### Changed
- Save version 2.5. v2.4 saves migrate automatically: research, RP and trade start empty, tech buildings start unbuilt, and everything else is kept.
- **Replant** keeps research, unspent RP, the harbour level, opened routes and trade stats. Tech buildings reset like the other buildings, and vessels at sea are cleared.
- The camera fit widens to frame the harbour once it is built.
- On landscape screens the R&D sheet can grow to 76 % of the height so the whole tree fits. The bottom bar tightens when the 9th button appears.
- Balance: v2.5 earns ≈ +30 % at 1 h vs v2.4 and is slightly behind at 20 min while the lab pays off (12 seeded bot runs).
  With research and trade unused it is within noise of v2.4.
- Tests: the v2.3 weather-roll check now samples two in-game years instead of one (it was flaky), and the v2.4 bottom-bar check accepts the 9th button.

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
- ~~Daily contracts (deliver X chairs in Y minutes for a reward)~~ → shipped in [2.6]
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
- ~~Daily contracts (deliver X chairs in Y minutes for a reward)~~ → shipped in [2.6]
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

[2.6]: ./releases/timber-tycoon-v2.6.html
