# Changelog

All notable changes to Timber Tycoon are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project uses [Semantic Versioning](https://semver.org/).

## [2.28.1] — 2026-10-24

**Maintenance day.** Covers assets, rules and text, balance, save robustness and tests. Item 8 (logistics tiers) is postponed.
The full audit and prioritized proposals are in `docs/maintenance-v2.28.1.md`.

### Fixed
- **Mobile Market table** no longer runs off a phone in late game, so the Sell buttons stay visible. Long names such as
  "Timber-frame Houses" now wrap.
- **Toasts** no longer cover the title and ✕ of a full-height sheet on phones. They stack above the bottom bar while a full sheet
  is open.
- **Mishap callouts** ("⚙️ Machine breakdown") no longer hang over lots that a Replant just emptied. At most 4 show at once.
- **Damaged saves:**
  - `merge()` keeps the default when a saved value has the wrong type (null in place of an object, text or Infinity in place of
    a number).
  - The new `sanitizeState()` clamps building levels, collectors, stocks and coins to sane values.
  - A save with `"buildings":null` used to crash every tick; it now loads.
- **Replant card:** the second line repeated the first. It now shows progress to the first Seed ("… · 42% there").

### Changed
- **Balance**, for the open v2.24 note (premium workshops starved of paper and chairs):

  | Building | Before | After |
  |---|---|---|
  | Paper Mill | 40 chips → 10 paper | 30 chips → 10 paper |
  | Luxury Showroom | furniture + 4 chairs | furniture + 2 chairs |
  | Boat Yard | 8 plywood + 2 chairs | 8 plywood + 1 chair |

  - Late-game sim over 4 Replants: earnings +15 % (run 4: 6.67e14 → 7.66e14).
  - Time the Research Lab and Stationery spend short of paper: 100 % → about 75 %.
  - The early-game bot is unchanged within noise.
- **Text:**
  - The *Export Contracts* upgrade is now **Export Licence**, so it no longer shares a name with the Shipping Yard's export
    contracts. Its effect is unchanged.
  - *Masterworks* now lists exactly what it boosts.

### Tests
- New `test/v2281.py`:
  - recipes and the tier rule;
  - the new texts;
  - mishap callouts;
  - 5 damaged saves plus a normal old save;
  - on iPhone 13 and Pixel 7: the late-game Market table fit and toasts with a full sheet.
- The full suite (37 files) passes.

## [2.28] — 2026-10-23

**Factory layout, part 2: the south yard and a timber-frame line.** Finishes item 7 of Semih's Oct 20 list. The highway now
bends around a new south end of the yard. Three new production buildings sit at the bottom of their phase columns.

### Added: timber-frame line (`js/logic_a.js`, `js/tiers.js`, `js/scene7.js`)
| Building | Phase | Recipe | Base cost | Where |
|---|---|---|---|---|
| **Beam Saw** 🪜 | I | 6 logs → 2 Timber Beams + 2 Wood Chips | 2 M | bottom of the Phase 1 column (south yard) |
| **Glulam Plant** 🌉 | II | 4 Timber Beams → 1 Glulam Beam | 25 M | bottom of the Phase 2 column, straight across from the Beam Saw |
| **Timber-frame Houses** 🏡 (premium) | III | 4 Glulam + 2 Plywood → 1 Timber-frame House | 600 M | last workshop of the Phase 3 row |

- New goods: Timber Beams ($14), Glulam Beams ($220), Timber-frame Houses ($3,200, premium).
- The line avoids paper and chairs, the inputs that held the premium workshops back after v2.24. The Beam Saw's offcuts are
  chipped, so it also adds chips to the pellet and paper lines.
- Fully integrated:
  - tiers (I → II → III, the tier rule holds);
  - research branches (milling: Beam Saw, Glulam; craft: Houses);
  - 3 workstations each and 3 new managers (Baran, Ingrid, Hana);
  - fire risk;
  - supply-flow tints and arcs;
  - the premium gate lift for glulam and tier forklifts for beams;
  - client orders (new client *Alpine Chalet Developers*; City Builders also like beams and glulam);
  - trade likes (Rotterdam: beams, Hamburg: glulam, New York: houses);
  - export contracts.
- Art: the Beam Saw is a timber shed with twin band-saw wheels and stacked beams. The Glulam Plant has a sawtooth hall, a clamp
  press and curved glulam members. The *TIMBER HOMES* workshop has a timber-frame house skeleton on its roof and house frames
  behind the glass.
- 3 new trophies: *Timber Line* (bronze: build a Beam Saw and a Glulam Plant), *Raise the Roof* (silver: build Timber-frame
  Houses) and *Chalet Village* (gold: Timber-frame Houses Lv 50). *Premium Row* now counts all 6 workshops.

### Changed: south yard and highway (`js/scene1.js`, `js/scene2.js`, `js/scene10.js`; design: `docs/layout-v2.28.md`)
- **The highway bends.** It runs along j down to the river bridge, then straight down the screen past the new south yard, then
  along j again further east. The rail line, its bridge, the trains, puddles and lane lines follow the bend.
- **The yard and lane run on to u ≈ 66.** A **south gate road** joins the lane end to the highway.
- **The Phase 3 row is one slot longer.** Its dock and access road moved down, and the road now reaches the bent highway.
- **Vehicles follow the bend:** dock trucks, premium trucks, the client van and market vans. Vans for the lane now use the
  south gate road.
- **Camera:** bounds y1 1320 → 1480. The fit view frames the south yard once a Beam Saw or Glulam Plant stands. The Phase 1 and
  Phase 2 chips frame the longer columns.

### Balance (`/workspace/scratch/p28/bal.py`: greedy late player, all research and premium, 4 Replants, seed 1)
| Run | v2.27 earned | v2.28 earned | change |
|---|---|---|---|
| 1 | 3.11e12 | 3.84e12 | +23 % |
| 2 | 1.06e14 | 1.32e14 | +25 % |
| 3 | 2.22e14 | 2.49e14 | +12 % |
| 4 | 5.57e14 | 6.67e14 | +20 % |

- The new buildings level like their neighbours (Beam Saw Lv 50–63, Glulam Lv 36–45, Houses Lv 18–25).
- The new line is rarely input-bound (Glulam ≤ 6–23 %, Houses 11–30 %), unlike the paper and chairs premium workshops.
- Pellet and paper stay chips-bound in this greedy sim, which upgrades every building evenly; the Beam Saw's chips shrink the gap.

### Compatibility
- Old saves load. The new buildings and goods start at 0 (fresh-state merge). Building positions are still not saved.

### Tests
- New `test/v228.py`: recipes, tiers, research, workstations and managers; layout (bottom of each column, no overlaps, nothing on
  the bent highway, continuous road, camera bounds, no trees); the running line; 63 vehicle paths clear of buildings; south gate
  vans; trucks on the bend; flow; orders; trade; trophies; fit view; taps; drawing at every milestone; a v2.27 save;
  iPhone 13 and Pixel 7 touch.
- `test/v227.py` accepts the longer columns and newer versions; `test/v12.py`, `v20.py` and `v26.py` drop stale v2.27-layout
  assumptions. The full suite passes (desktop + touch, `test/v28.py` perf, old saves). Screenshots: `test/shot_v228.py` → `screenshot-v228-*`.

## [2.27] — 2026-10-22

**Factory layout, part 1 + trophies for the newer systems.** Item 7 of Semih's Oct 20 list. Item 7 is split over releases:
this one ships the column layout, the helper strip on the right and the trophy batch. The new production buildings come in
v2.28, because the yard first has to grow south past the highway (see *Next steps*).

### Changed: factory layout (`js/scene1.js`, design: `docs/layout-v2.27.md`)
- **Every tier is a straight column that runs down the screen in production-chain and unlock order.** Newer buildings sit
  further down their column.
  - **Phase 1** (right of the lane): Sawmill → Wood Chipper → Charcoal Kiln → **Veneer Peeler**. The Peeler moved from its
    odd spot above the Sawmill to the bottom slot, straight across the lane from the Furniture Factory that uses its veneer.
  - **Phase 2** (left of the lane): Carpentry → Pellet Press → Paper Mill → Furniture Factory, unchanged. Each one sits
    straight across from its feeder (Sawmill ↔ Carpentry, Chipper ↔ Pellet Press, Peeler ↔ Furniture).
  - **Phase 3** (its own row on the far left), unchanged: Gift Box Atelier → Parquet → Stationery → Cabinets → Showroom.
- **Helper buildings sit in one strip on the right**, between the Phase 1 column and the highway. From top to bottom: Fire
  Station, R&D campus (Power plant beside it), Contract Office, Builders' Yard and Shipping dock.
  - The **Shipping dock** left the bottom of the Phase 1 column and now sits by the highway. Its forklifts use the aisle between
    the Kiln and the Peeler.
  - The **Builders' Yard** moved here from the bottom-left of the lane. The **Contract Office** (daily contracts) moved here from
    the end of the lane.
  - The strip is paved, with no trees.
- **Vehicles follow the new layout:**
  - Dock trucks, the dock forklift drop, the dock hand, dock-worker and forklift staff spots, and the dock night glow now follow
    the dock (`dk()`).
  - The courier van route is set relative to the office.
  - Town Market vans now come in from the highway at the south end of the lane and leave the same way: in on the outer side of
    the lane, out on the inner side. They used to cut across the new helper strip and the Phase 2/3 columns.
  - A test checks that every forklift, tier lift, van, courier and dock-truck path (28 of them, plus every possible dock run)
    stays clear of every building.
- **Camera and chips:**
  - The quick-jump chips list the production columns first (Forest, Log Yard, Factory, **Phase 1**, **Phase 2**, Phase 3), then
    the helpers (R&D, Power, **📅 Contracts**, Builders, Dock, Harbour).
  - The desktop fit view no longer grows downward when the Builders' Yard opens, because the yard is no longer at the bottom.
  - The world bounds are unchanged; every chip target and moved building is inside them.
  - On phones, the fit view frames the two production columns. The helper strip is one chip away.
- **Supply Flow:** the arcs follow the moved Peeler and dock automatically.
- Removed four stale gold night glows from the pre-v2.21.1 Premium Area. They had no lamps under them and sat in the new
  helper strip.
- **Saves keep every level.** Positions are not saved; they come from the code. A test checks that no `ci`/`cj` is saved.

### Added: 21 trophies for the newer systems (`ACH`, `g:'sys'`)
They have their own **🆕 Factory systems** section in the Trophies sheet, with a counter. Each one gives +2 % production, like
every trophy.

| System | Trophies |
|---|---|
| Workstations | 🛠️ Shop Floor (upgrade one) · 🔧 Tuned Lines (50 levels) · ⚙️ Precision Works (one at Lv 10) |
| Tiers | 🏗️ Three Phases (Phase 1, 2 and 3 running) · 💎 Premium Row (all 5 Phase 3 workshops) |
| Replant 2.0 | 🌲 Evergreen (5 Replants) · 🛒 Seed Shopper (a Seed Shop perk) · 🎯 Goal Getter (every run goal in one run) |
| Research | 🧪 Research Campus (25 nodes) · ♾️ Never Done (a repeatable node) |
| Setbacks | 🍀 Still Standing (first setback) · ☂️ Weathered (10) · 🔩 Quick Fix (5 × Repair now) · 💂 Night Watch (guard stops a theft) · 🛡️ Fully Covered (Insurance Lv 3) |
| Orders | 📋 Full Board (3 client orders at once) · 🏅 Preferred Supplier (50 client orders) · 🚢 Export Desk (10 export contracts) |
| Staff | 🎓 Night School (a finished training) · 🧑‍🏫 Master Class (a hired worker at skill 10) · 👥 Full Payroll (12 staff) |

- Progress is read from counters that already exist (`S.ws`, `S.mish.stats`, `S.orders`, `S.ship.stats`, `S.research`,
  `S.shop`, `S.prestiges`). The one new counter is `S.staff.trained`, which counts finished trainings from now on; old saves
  start at 0.
- "Full Chain" now reads "Build all 8 Phase 1–2 buildings". It said 7 from before the Peeler.

### Balance
- The bot sim (`test/balance.py`, 30 min fresh game) earned 8B–45B with v2.26 and 23B–31B with v2.27 over several runs. That is
  within v2.26's run-to-run spread; a fresh game gets 2–4 of the new trophies in its first half hour. Fully completed, the new
  trophies add up to +42 % production.
- `test/sim_v225.py` (orders across Replants): no small or tiny orders, reward ÷ goods value ≤ ×4.8.
- Order rewards are untouched, as Semih decided.

### Compatibility
- Old saves load with all levels, workstations, staff and trophies. A missing `S.staff.trained` reads as 0.
- Version `2.27`; service worker cache `timber-tycoon-v2.27`.

### Tests
- New `test/v227.py`, 80 checks:
  - columns straight, in order, feeders across the lane;
  - no overlaps between any two buildings or helper yards;
  - helpers right of Phase 1 and left of the highway, no trees in the strip;
  - all vehicle paths clear of buildings, dock forklifts in the Kiln–Peeler aisle;
  - camera bounds and chip order;
  - Contracts chip flies to the office;
  - hit tests and taps on the office, Builders' Yard, dock and Peeler;
  - flow anchors;
  - 21 trophies (finite progress, coverage, unlocks from counters, training counter, sheet section, Replant);
  - a v2.26 save loads, and positions are not saved;
  - iPhone 13 and Pixel 7 taps (chips, ≥ 36 px targets, the Dock chip frames the dock, tapping the office and yard, the
    Trophies sheet fits);
  - no console errors and no 404s.
- Updated for the new positions:
  - `test/v212.py` taps the Builders' Yard at `BYZ`;
  - `test/v213.py` jumps to the dock before tapping it on phones;
  - `test/v29.py` expects the new chip order.
- The whole suite passes (`test/v*.py` + `functional.py`), including the `test/v28.py` perf test (frame cost flat
  13.6 → 11.9 ms over 2 game-hours, p95 28 ms, heap stable).
- Screenshots: `python3 test/shot_v227.py` → `screenshot-v227-{desktop,mobile}-{layout,helpers,peeler,night,jump,trophies}.png`.

### Next steps (rest of item 7, then item 8)
- **v2.28: grow the yard south and add production buildings at the bottom of the columns.** The highway now runs just below the
  Phase 1 column (Peeler), so the yard has to grow south first, by moving the highway and dock road east or adding a bridge.
  Then the new buildings can go at the bottom of the columns. Candidates, each to be balanced and simulated across Replants:
  - Phase 1: a **Veneer Dryer** / second peeling line (veneer capacity for Furniture + Plywood);
  - Phase 2: a **Plywood Press** on the factory floor (plywood capacity beside the R&D Plywood Mill) and a **Glulam Beam** line
    (planks + glue);
  - Phase 3: a **Timber-frame Houses** workshop (beams + plywood).
- Camera bounds, quick-jump chips, Supply Flow and forklift lanes need extending to the longer columns, plus phone framing for
  them.
- Optional: park the Builders' crew trucks at the yard instead of the lane end.
- Then item 8: logistics tiers (forklift → conveyor → drone, with calm, readable forklift speed).

## [2.26] — 2026-10-21

**Bad-luck events ("setbacks").** Item 6 of Semih's Oct 20 list: random setbacks that really affect you, but stay
occasional and fair, are capped small, and come with counter-play.

### Added: seven setbacks (`js/mishaps.js`)
| Setback | What happens | Cap |
|---|---|---|
| ⛈️ Storm damage | Wind rips a roof: one building runs at **half speed for 1–1.5 min**, and rain spoils part of its stored goods | ≤ 8 % of that good, ≤ 1 min of income |
| 🌊 Log Yard flood | Water sweeps logs out of the yard, and the roads turn muddy (collectors −20 % for 40 s) | ≤ 10 % of logs; always leaves 30 s of mill use |
| 🦝 Night theft | Thieves take logs and one stored good | ≤ 6 % of logs (leaves 30 s of mill use) + ≤ 5 % of one good, ≤ 45 s of income |
| ⚙️ Machine breakdown | One building **stops for 1–1.7 min** | one building at a time |
| ⚡ Lightning strike | Starts a fire through the normal fire system (tap the flames, Fire Station) | summer or rain only, never during a fire or its cooldown |
| 🧾 Tax audit | A fine | ≤ 2 % of coins, ≤ 90 s of income |
| 📉 Market crash | Sale prices −30 % for 60 s (shows in the event bar) | 60 s |

- **How often:** one roll every **8–15 min of play** (≈ 4–7 per hour). Never two within 8 min, and only one damaged
  building at a time.
- **Grace periods:** none in the first **15 min of a game** or the first **5 min after a Replant**. Setbacks start once
  3 buildings run.
- **Seasons and weather:**
  - storms ×2.5 in wind, rain or snow and ×1.5 in autumn/winter;
  - floods ×3 in rain, ×1.6 in spring (snow melt) and ×0.5 in snow;
  - thefts ×2.5 at night and ×0.4 by day;
  - breakdowns ×1.3 in winter;
  - lightning only in summer or rain.
  The Safety sheet shows the odds right now.
- **Offline:** no setbacks while you are away, and the next one is at least 2 min after you return. Open repairs keep
  counting down. The welcome-back summary says "🍀 No bad luck while you were away" and lists finished repairs.
- **Notification + scene:** a red toast, a short red screen flash, particles and a floating loss tag over the building /
  Log Yard / HUD coins. A broken building smokes and carries a "🔧 Broken · 72s" / "⛈️ Damaged · 50s" tag. Tapping the tag
  opens the building sheet.

### Added: counter-play
- **Repair now:** in the building sheet (below the Upgrade row, so the buttons don't move) and in the Safety sheet. It costs
  about 20 s of income × the share of time left (half for storm damage).
- **Insurance** (Safety sheet, kept through Replant):
  - Lv 1–3 (🪙150K / 1.5M / 15M) pays back 25 / 50 / 75 % of storm, flood, theft and tax losses, and softens crashes
    (−22.5 / −15 / −7.5 % instead of −30 %).
  - Lv 2+ adds a night guard that stops half of all thefts.
- **Fire Station:** each level cuts storm, flood and lightning odds by 10 % (up to 50 %).
- **Workstations + engineers:** each workstation level makes breakdowns 3 % rarer and shorter (down to ×0.4). An assigned
  engineer cuts them like it cuts fires.
- **Safety & Insurance sheet** (bottom bar "Safety"; on phones in More):
  - a summary and when the next setback is possible;
  - open repairs and insurance;
  - "What can happen", with the cap, counter-play and current odds of each setback;
  - "What happened": a log of the last 20 setbacks with totals (setbacks, stopped, quick repairs, coins lost).

### Sim (real game code, greedy player, 6 runs / 5 Replants, 30–45 min per run, two seeds, setbacks on vs off)
- **Frequency:** 1–3 setbacks per run (≈ 2–4.7 per hour of play). The first one comes ~16–27 min into a run, because the
  grace period comes first and the 8–15 min gap starts after it.
- **Losses:**
  - worst stock loss 7.4 % of one good;
  - building downtime 0–8 % of a run;
  - coins never negative;
  - Replant gains and run lengths unchanged (total earned ≈ 1.09B with vs 1.09B without).
- **No soft-lock:** the yard always keeps 30 s of mill logs. Only one building is down at a time. Coins never go negative.

### Compatibility
- Old saves without `mish` load with no insurance and an empty log. Broken fields are repaired. Replant keeps insurance
  and the log, and clears open repairs.
- Version `2.26`; service worker cache `timber-tycoon-v2.26`.

### Tests
- New `test/v226.py`, 70 checks:
  - grace periods and offline (3 h away rolls nothing, repairs finish, nothing right on return);
  - 4 h frequency;
  - 60 forced rolls of each setback against its cap;
  - breakdown, storm, repair, insurance, night guard, Fire Station and workstation effects;
  - lightning → fire, and rain odds;
  - Replant;
  - the greedy 5-Replant sim (frequency, loss size, no soft-lock);
  - old saves and the welcome-back text;
  - desktop clicks (Safety button, sheet, repairs, insurance, scene tag → building sheet, crash in the event bar);
  - iPhone 13 and Pixel 7 taps (More tile, no sideways scroll, ≥ 40 px buttons, repair);
  - no console errors.
- `test/v225.py`: a running order could complete during the save check (timing race); its amount is now pinned.
- `test/v224.py`: setbacks are switched off in its greedy sim, which measures the veneer/plywood balance (a random Peeler
  breakdown made a run 10–16 % short). The setbacks themselves are tested in `test/v226.py`.
- Screenshots: `python3 test/shot_v226.py` → `screenshot-v226-{desktop,mobile}-{scene,repair,safety,log}.png`.

## [2.25] — 2026-10-21

**Orders that make sense after a Replant + a client order board.** Item 5 of Semih's Oct 20 list: "after a Replant, orders
ask for silly tiny amounts like 5 units".

### Why orders asked for 5 units (root cause)
- **Daily contracts were drawn about 4 seconds into a new run** and kept for the whole day. Replant clears the day's
  contracts, and the game drew new ones as soon as the first Sawmill ran. At that moment almost nothing was being made, so
  the draw fell back to a fixed list of goods (planks, chips, chairs, charcoal, paper, furniture) **sized at 0.05 per second**
  whether you made them or not. That gave "5 Furniture", "5 Charcoal" and "5 Chips". The reward came from an income floor,
  so "5 furniture" could pay 🪙170K, or 🪙40 in a fresh run. In the sim this happened after **every** Replant.
- **Client orders were sized on the smoothed output of one good** (the smaller of what the line could make and a slow
  ~60 s average of what it did make) × 25–40 % of the timer, with a floor of 5. The average lags. Right after a Replant
  everything grows quickly, and a line that is new, just upgraded or briefly short of inputs reads near 0. Premium goods
  were picked 65 % of the time, and they come from the newest Lv 1 workshops. So clients asked for a handful of units, and
  an income floor (25 % of income over the timer) paid **up to 7,000× the goods' value**.
- **Export contracts** (Shipping Yard) used the same idea on *sales*. A good that is mostly used inside the factory sells
  almost nothing, so contracts asked for **1 unit** with rewards up to ×74,000 the goods.
- The minimums (5 units, 🪙50 / 🪙40) were fixed numbers and did not follow forest value.

### Changed: order sizing (client orders, daily contracts, export contracts)
- **Amounts follow what the line really makes.**
  - The deliverable rate is the line's potential output, counted at no less than 35 % even while the average lags
    (`ordRate`).
  - The amount is that rate × 25–40 % of the timer, and at least worth **5 s of this run's income**. It also never drops
    below **20 units**, and it stays deliverable: at most 60 % of the output over the timer plus 80 % of stock (`ordPlan`).
- **Income reference** (`ordInc`): the larger of income now, half of the run's best smoothed income, and
  2 🪙/s × forest value. So amounts scale with production and forest value.
- **Goods that can't carry a real order are skipped.** A brand-new Lv 1 workshop is offered once it can fill an order worth
  5 s of income. Goods you don't make are never offered: the fallback list is gone.
- **Rewards are proportional to the goods.**
  - Client orders pay the goods' value × **1.5–2.5**; daily contracts pay × **1.4–2.2** (before premium, difficulty,
    streak, Client Charmer and research bonuses). Inside that band they follow ~15 % of income over the timer.
  - Export contracts pay value × multiplier; the income floor may top that up to at most 2×.
  - The minimum reward is 🪙50 × forest value (was 🪙50).
  - Bonus Seeds on orders need 🪙10M × forest value earned this run (was a flat 🪙10M, which a late run passes in a second).
- **Daily contracts wait for running lines.** The day's three are drawn once 3 goods can carry a contract, or after the
  run's first 5 minutes with at least 1 (a first game with no Replant still opens at ~🪙500, as before). Until you accept an
  offer, its amount and reward follow your output every 10 s (when they change by ≥ 15 %). Once accepted, it stays fixed.

### Added: client order board (more orders available)
- Clients now call every **45–75 s** (was once every 3–5 min after the last order ended). They wait on a **board**: up to
  2 offers, or 3 once you run Phase II goods. Offers stay up for 4 min (was 75 s), and each one asks for a different good.
- **Run several orders at once:** 1 slot, +1 with a Phase II line, +1 with the Premium Area (up to 3). Each order fills
  from its own line with the same ≥ 70 % priority as before.
- **Clients tab:**
  - A header with slots in use and waiting offers, and what unlocks the next slot.
  - One card per running order (progress, timer, Deliver from storage) and per offer (Accept / Decline). With every slot
    busy, Accept shows "All 3 slots busy".
- **On the scene:**
  - The order card shows **+N** for more orders on the board.
  - The client's bubble says "3 new orders!".
- Saves keep the lists (`S.orders.offers` / `S.orders.acts`). `S.orders.offer` / `.active` still point at the first one.

### Results (sim: real game code, greedy player, 6 runs / 5 Replants, sampled every 15 s)
| | v2.24 | v2.25 |
|---|---|---|
| Day's contracts right after a Replant | **5 units** (fresh player: every run; late player: run 1) | 150 – 1.7M units, only goods you make |
| Client orders worth < 1 s of income | 0–5 per run | **0** |
| Client order reward ÷ goods value, worst | ×47 – ×381 | ≤ ×5 incl. all bonuses (×1.5–2.5 before) |
| Export contracts, smallest | 1 unit, reward up to ×74,000 the goods | ≥ 34 units, ≤ ×5 |
| Smallest order value (any kind) | 0.00 s of income | 4.8 s of income |
| Client orders completed per run (bot accepts all) | 1–5 | 4–28 |
| Orders + dailies, share of the run's earnings (bot) | 0–30 % | 9–45 % |

The late player has all research and the Premium Area, and reaches forest value ×1 → ×12,600. The fresh greedy player
reaches ×1 → ×2.9. Orders now pay less each than the old income floor (~24–45 s of income instead of ~60–117 s), but there
are more of them and they are never silly. A player who fills every order earns about a third of a run from orders; that is
the reward for active play.

### Compatibility
- Old saves: the waiting offer and the running order move onto the board. Missing or broken fields are repaired. A 5-unit
  daily offer from before the update is resized within 10 s.
- Version `2.25`; service worker cache `timber-tycoon-v2.25`.

### Tests
- New `test/v225.py`, 61 checks:
  - after a Replant: no contract before a line runs, and the day's contracts are ≥ 20 units, ≥ 5 s of income and only for
    goods you make; a 5-unit offer is resized; an accepted contract stays fixed;
  - a lagging line, 300 client orders, 200 dailies and 200 export contracts (amount, value, reward band); a new Lv 1 premium
    workshop; the forest-value floors;
  - slots 1/2/3; the board fills to 3 different offers; accept by id, refuse a fourth, deliver, expire, decline;
  - saves and a v2.24 save;
  - multi-Replant sims for a late and a fresh player (`test/sim_v225.py`, which also compares any release:
    `python3 test/sim_v225.py releases/v2.24/index.html`);
  - desktop clicks, iPhone 13 and Pixel 7 taps with fit / size / no sideways scroll;
  - no console errors or 404s.
- `test/v22.py`: the Orders panel check looks for the order's own progress bar (one card per order).
- Screenshots: `python3 test/shot_v225.py` → `screenshot-v225-{desktop,mobile}-{scene,board,daily}.png`,
  `screenshot-v225-mobile-offers.png`.

## [2.24] — 2026-10-20

**Log fuel for the power plant + veneer/plywood balance.** Item 4 of Semih's Oct 20 list.

### Why veneer and plywood were always short (root cause)
- The Veneer Peeler (v2.20) makes **3 veneer per level**, but a Furniture Factory level wants **8** and a Plywood Mill
  level **24** (6 veneer × its built-in ×4 speed). The Sawmill had the same problem and got a yield bonus from Lv 50 in
  v2.15.1. The Peeler never got one, so it fell further behind as the factory grew.
- One step down it was the same: a Plywood Mill level makes 8 plywood/s, but a Boat Yard level wants 56 (14 × ×4).
  Toys want 8, parquet and cabinets 5 each.
- "Fair share" then split far too little between everyone. At equal spending (cost-balanced sim) the Peeler covered 14–30 %
  of the veneer wanted and the Plywood Mill 7–20 % of the plywood. In greedy play over 6 Replant runs every veneer/plywood
  building was short **75–100 %** of the time (100 % in the second half of every run).
- The Peeler's third workstation (Veneer Dryer) raised veneer's *price*, which does nothing for a good that is mostly used.

### Changed: supply chain balance
- **Peel yield and press yield.** The Peeler and the Plywood Mill get the Sawmill's yield curve: from Lv 50 milestones ×1.6
  plus +5 % per level above 50 (`chainYield`). Inputs are unchanged, and bark is not multiplied. Both building sheets show
  the yield and the next level's value.
- **Recipes.**
  - Peeler: 4 logs → **4** veneer + 1 bark (was 3).
  - Plywood Mill: **4** veneer + 2 glue → **3** plywood (was 6 → 2).
  - Furniture: 12 planks + **6** veneer (was 8).
  - Boat Yard: **8** plywood + 2 chairs (was 14).
- **Glue.** Pine-tar glue is .65 per charcoal (was .5), so late Plywood Mills are not glue-bound (`TAR_GLUE`).
- **Station.** The Veneer Dryer is now a 📦 Yield station (was 💎 Quality). Its saved levels carry over.
- **Sharing.** The v2.15.1 "best value first" mode now covers veneer and plywood too (`shareAlloc`, `SHARED_GOODS`). The
  shortage hint on a veneer- or plywood-bound building offers the toggle.
- **Results.**
  - Cost-balanced sim (supply / wanted per second):

    | Budget | Veneer v2.23 | Veneer v2.24 | Plywood v2.23 | Plywood v2.24 |
    |---|---|---|---|---|
    | 1e10 | 11.6K / 38.3K | 43.8K / 23.7K | 3.2K / 16.5K | 14.6K / 12.5K |
    | 1e12 | 15.9K / 117K | 100K / 79.5K | 5.0K / 72.7K | 100K / 50.2K |
    | 1e14 | 40.9K / 166K | 584K / 113K | 13K / 179K | 262K / 124K |

    No veneer- or plywood-bound consumer is left at any budget from 1e8 to 1e14.
  - Greedy play with 5–7 Replants:
    - Veneer was short 75–95 % of the time; now 3–16 % (the first minutes after buying a new consumer). In the second
      half of a run it is 0–2 %.
    - Plywood was short 93–100 %; now 3–21 %. In the second half it is 0 in most runs (worst 17 %).
    - Supply/demand: veneer 0.22–0.45 → 1.3–1.5; plywood 0.13–0.38 → 0.75–1.27. Below 1 only when the plywood users are
      held back by paper or chairs, not by plywood.

### Added: log fuel for the Biomass Power Plant
- The plant can burn **logs** (0.3 fuel per log, like the kiln's 10 → 3). Logs stay raw material: burning counts as use
  (`rates.logs.c`), never as a sale (`canSell('logs')` is still false).
- **🪵 Log fuel** on the plant card has three choices:
  - 🚫 Off.
  - 🔋 **Backup** (default; pellets/charcoal first, surplus logs fill the gap).
  - 🪵 **Logs first** (surplus logs first, pellets/charcoal for the rest, so more of them can be sold or used).
- **Keep in yard:** 30 s / 1 min / 2 min / 5 min of Phase-I log use is always left in the Log Yard, capped at 80 % of the
  yard so a full yard is always usable.
- **Phase I is never starved.** The plant takes logs only after the Sawmill, Peeler, Chipper and Kiln have their full
  share for the tick, only while the collectors bring in at least what they use, and never below the reserve.
- The card shows "Logs burned" and "Log reserve", plus a plain note. It works on phones: 36 px buttons that wrap, and no
  sideways scroll.
- With log fuel on, the plant keeps its size while the Pellet Press or Kiln is off or on fire, so logs can stand in.
- Simulated over 8 runs (7 Replants), "Logs first" burned logs in 45–84 % of samples. There were **0** samples where it
  burned while the Sawmill or Peeler were short of logs. The share of time Phase I was log-short matched log fuel Off:
  .38/.28/.26/.20/.12/.11 vs .37/.33/.21/.23/.13/.08.
- Old saves get Backup with a 60 s reserve. Fuel, level and on/off are kept, bad values are repaired, and Replant keeps
  the settings.

### Tests
- New `test/v224.py`, 54 checks:
  - recipes and yield; bark not multiplied;
  - cost-balanced 1e8–1e14 with no veneer/plywood shortage;
  - greedy 5 runs / 4 Replants with log fuel "Logs first": no shortage, and no burning while Phase I is log-short;
  - full yard, deficit, off, Backup vs Logs first, setters, Replant keep, veneer value sharing;
  - v2.23 and v2.20 saves;
  - desktop clicks, iPhone 13 and Pixel 7 taps with fit/size/no sideways scroll;
  - no console errors or 404s.
- Updated for the new balance:
  - `test/v220.py`: recipes;
  - `test/v25.py`: glue ratio read from `TAR_GLUE`;
  - `test/v210.py`: the pellet/charcoal-only power checks switch log fuel off first.
- Screenshots: `python3 test/shot_v224.py` → `screenshot-v224-{desktop,mobile}-{power,plymill}.png`,
  `screenshot-v224-mobile-power-logs.png`.

## [2.23] — 2026-10-20

**Staff training rework.** Item 3 of Semih's Oct 20 list: "training costs and effects look silly (tiny numbers) after a
Replant". Staff stay through Replant, but their prices were fixed coins (training 40·skill, wage 0.35·skill/s). In a
4-Replant sim, a skill 3→4 training cost 🪙120 while the run made ~🪙58K/s (0.002 s of income); a wage was 🪙1.05/s.

### Changed
- **Staff prices scale like Replant 2.0** (`staffEco` in `js/staffsys.js`). The floor is the forest value `cs()`; once
  this run's income is bigger, prices follow income instead.
  - The income reference is the run's best smoothed income (≈60 s EMA). It never drops within a run and resets on
    Replant (`S.run.inc`).
  - **Training:** 40·skill·rarity × max(cs, income/6), about 6.7·skill·rarity seconds of income (the screenshot review
    showed income/2 meant 1–1.5 h payback for a mill worker; now ~10–30 min).
  - **Wages:** 0.35·skill·rarity × max(cs, income/350), about 0.1%·skill·rarity of income per worker.
  - **Hiring:** 25·skill·rarity × max(cs, income/4), about 6·skill·rarity seconds of income.
  - A fresh game still starts at the old prices.
  - Same 4-Replant sim, run 4 (forest value ×1.5, ~🪙58K/s): training 3→4 **🪙120 → 🪙1.4M**, wage
    **🪙1.05/s → 🪙213/s**, hire **🪙63 → 🪙1.3M**. A training level now costs ~3 Sawmill levels (was ~1/3700).
- **Effects per training level are bigger.** All live in one table, `STAFF_FX`:
  - mill worker +3% → **+5%** speed per level (cap +45% → +60% per building);
  - engineer −2.5% → **−3%** input;
  - lumberjack +2% → **+3%** chop (team cap 40% → 60%);
  - driver +3% → **+4%** haul;
  - forklift +4% → **+5%** loading;
  - dock +1% → **+1.5%** export premium and +2% → +3% truck capacity;
  - firefighter +3% → **+4%** risk cut.
- **The next level is shown in plain words** on worker cards, in the Training tab and in Train all, for example
  "🎓 Next level: +5% Sawmill speed ≈ +🪙1.2K/s". At a team cap it says "team bonus is at its +60% cap" instead of a fake
  gain; an unassigned mill worker or engineer says "+5% per level once assigned".
- The Training tab lists the cheapest first and shows Fast-learner time.

### Added
- **🎓 Train all** (Training tab and Team tab) trains every affordable staff member, cheapest first.
  - The button shows the count and the total ("Train all 2 of 4", then the price).
  - Tapping it opens a confirm sheet listing who gets trained, the new skill, the gain and the price.
  - It never charges more than shown: if the income reference rose while the sheet was open, nothing is paid and the
    sheet re-opens with the new totals.

### Compatibility
- Saves need no migration. A v2.22.1 save has no income reference yet, so prices start at the forest-value floor and
  follow income from the first tick. Training in progress carries on.
- Version `2.23`; service worker cache `timber-tycoon-v2.23`.

### Tests
- New `test/v223.py`:
  - price formulas (fresh / ×4 forest value / 🪙1M/s);
  - the income reference (follows income, never drops, resets on Replant);
  - per-level effects and their text; caps; unassigned staff;
  - Train all: plan, label, confirm sheet, exact charge, disabled at 🪙0;
  - a 4-run multi-Replant sim with checks: ≥ 10 s of income per training level, ≥ half a Sawmill level, wages 0.05–1% of
    income, always paid;
  - v2.22.1 save; iPhone 13 and Pixel 7 touch, including "prices went up while open".
- `test/v2221.py`: version checks are now ≥ 2.22.1.

## [2.22.1] — 2026-10-20

**Staff hotfix: hiring limits and a working Assign button.** These are items 1 and 2 of Semih's Oct 20 list: "you can hire
infinitely many staff" and "the Assign button does nothing".

### Fixed: the staff "Assign" button did nothing
- **Root cause:** tapping Assign did build the building list, but it was appended to the *end* of the staff sheet's
  scrolling body, below every card and off-screen (about 800 px below the fold on desktop and 1,300 px on a phone).
  Its `position: sticky` never applied, because the list was the only child of its own wrapper. So nothing visible
  happened. On top of that, the Team tab rebuilds its HTML whenever a card's numbers change, and energy drains every few
  seconds. That rebuild wiped the hidden list within a few seconds (2–7 s in tests), before anyone could scroll down to it. The list itself
  worked: when it was scrolled into view in time, a tap did assign.
- **Fix:** Assign now opens its own **picker**, a modal bottom sheet on phones and a centred card on desktop. It lives in
  `#modalRoot`, above the staff sheet and outside the body that gets rebuilt, so it opens in view and stays open.
  - Every built building is a 52 px row with its slots (**used/slots**) and what the worker adds there, e.g.
    "⚙️ +9% speed ≈ +🪙106/s" or "🔧 −7.5% input".
  - Full buildings are greyed out with the next slot milestone ("Full · ★2 (Lv 25) adds a slot"). The current building
    is marked "✓ Working here now".
  - **⏳ Unassign** sends the worker back to the log yard.
  - Cancel, a tap outside or Esc closes the picker.
- After a pick the effect applies right away (mill speed / engineer input and fire risk). The card reads "Working at
  the …" and its button turns into **↔ Move**. The worker is highlighted and walks to that building in the scene.
- The building sheet's **"＋ Assign staff (N free)"** opens the same picker the other way round: pick a free mill worker
  or engineer for *this* building. Before, it only opened the Team tab.

### Fixed: unlimited hiring → team limits
Each role now has a hiring limit that grows with the part of the factory it works in. The limits show as **x/y** chips at
the top of the Team tab, each with what raises it. On phones you tap a chip to see that.

| Role | Limit | Raised by |
|---|---|---|
| 🪓 Lumberjacks | 2 + collector types owned (max 8) | buying a new collector type |
| 🚛 Drivers | 1 + machine types owned: truck, harvester, drone, helicopter (max 5) | buying those machines |
| 🏭 Mill crew (mill workers + engineers, shared) | one per open building slot. A slot is 1 per building, 2 at ★2 (Lv 25), 3 at ★4 (Lv 100). A founding foreman keeps his own slot | building factories, levelling them past ★2 / ★4 |
| 🚜 Forklift operators | one per forklift (2–6) | Shipping · Forklift Fleet |
| ⚓ Dock workers | 1 + loading bays (2–4) | Loading Dock Lv 4 / Lv 8 |
| 🚒 Firefighters | 1 + Fire Station level (1–6) | building / upgrading the Fire Station |

- With the mill crew limit, every mill worker or engineer you hire can always get a building slot.
- Limits **never drop**. The highest limit reached is remembered (`S.staff.capHi`, kept through Replant), so a Replant
  never leaves your kept team "over the limit". Founding foremen never count.
- At a limit, the candidate card reads **"🔒 Full · 2/2"** with what raises it, and the Hire button is disabled.
  `staffHireCandidate` refuses as well, and the refusal costs nothing. New candidates are rolled from roles that still
  have room, and the Staff dot ignores candidates you can't hire.

### Saves already over a limit
- **Nobody is removed.** Staff hired before v2.22.1 above a limit stay on the team and keep working with their effects.
  The per-role effect caps from v2.14 still apply, as before.
- Only hiring for that role is paused, until you're under the limit or it grows. The chip turns red ("Lumberjacks 14/8"),
  and a note explains: "… more than the limit (hired before limits existed). Everyone stays and keeps working; hiring is
  paused …". A one-time toast mentions it after loading.
- Over-limit roles get a **Let go** button on their cards (tap twice) if you want to cut wages. It is never automatic.
- Version `2.22.1`; service worker cache `timber-tycoon-v2.22.1`.

### Tests
- New `test/v2221.py` (78 checks):
  - limit formulas and growth; refused hire at a limit (team and coins unchanged); full roles skipped by candidate rolls;
    🔒 Full card;
  - 6 chips with x/y, ≥44 px; every mill-crew hire fits a slot; Replant keeps staff and limits;
  - over-cap v2.22 save: all 19 extras kept and working, hiring paused, red chip and note, two-tap Let go, foremen not
    counted; pre-staff save loads;
  - desktop mouse: Assign opens an on-screen, uncovered picker that survives 6.5 s of Team-tab rebuilds; pick →
    assignment, speed effect, card text, Move label, figure at the Carpentry in the scene; full rows disabled; Esc,
    outside tap, Unassign;
  - building-side picker (engineer −input, "Staff here 1/2");
  - iPhone 13 / Pixel 7 with real touch events: More → Staff, tap a limit to see what raises it, touch Assign → picker
    above the bottom bar → touch pick assigns; a full role can't be hired;
  - snapshot; no page errors or 404s.
- `test/v215.py`: the 49-staff draw-cap/perf scenario adds staff past the limits the way an older save would.
- Screenshots: `python3 test/shot_v2221.py` → `screenshot-v2221-{desktop,mobile}{,-picker}.png`.

### Next (rest of Semih's Oct 20 list, one per following release)
3. ~~Staff training rework~~: done in 2.23.
4. ~~The power plant also accepts logs; veneer and plywood balance~~: done in 2.24.
5. ~~Orders scale after Replant~~: done in 2.25.
6. ~~Bad-luck events~~: done in 2.26.
7. Factory layout: each phase in vertical columns growing downward, helper buildings (power plant, fire station,
   construction, R&D, staff) on the right, the chain order followed and gaps filled; new trophies for the new systems.
8. Logistics tiers: calm, readable-speed forklifts → conveyor belts between adjacent factories → drones.

## [2.22] — 2026-10-19

**Leveled upgrades and workstations inside every factory.** Semih's two ideas: "let's do the upgrade part with levels" and
"factories should have extra upgrade areas inside, e.g. the plank place has 3 workbenches and you can't progress without
upgrading one of them". Design and sim results: `docs/stations-v2.22.md`.

### Added
- **Leveled upgrades:** every Upgrades-panel item is now a line, Lv 0 → 5. Smoke Detectors and Sprinklers go to Lv 3;
  Sawdust Recovery stays one-time.
  - Lv 1 is exactly the old upgrade. Each further level strengthens the same effect: ×2 becomes ×2.1, ×2.2 … ×2.4, and
    −25% risk becomes −30% at Lv 3.
  - Cost is ×12 per level, scaled by forest value.
  - Lv 2+ unlock with what the upgrade is about: the related collector count (15/30/60/100), building level
    (25/50/100/200), buildings built (5/7/9/11) or taps.
  - Cards show **Lv X/N**, level pips and "now → next". A "Next levels unlock with progress" list shows the requirement for
    locked levels.
- **Workstations:** every production building (16; not the lab) has three stations, each with its own level (0–10) and
  effect: ⚙️ speed +5%/lv, 📦 output +4%/lv, 🌲 input −3%/lv or 💎 price +5%/lv.
  - Example, Sawmill: 🪵 Debarker (input), 🪚 Bandsaw (speed), 📏 Edger & Planer (output).
  - Example, Carpentry: Cutting Bench, Joinery Bench, Finishing Bench.
- **Milestone gates:** a building can't pass Lv 25 / 50 / 100 / 200 / 400 until the 2nd / 1st / 3rd / 2nd / 1st station
  reaches Lv 2 / 3 / 4 / 6 / 8.
  - The Upgrade button turns orange: "🔒 Upgrade Bandsaw to Lv 2 · capped at Lv 25 · tap for 🛠 Workstations".
  - The milestone line reads "🔒 Capped at Lv 25 · needs …", and the lot tag gets a 🔒.
  - ×10, Max, lot taps, the Builders' Yard and hold-to-repeat all stop at the cap. Nothing is lost.
- **Workstations view** (mobile first): opened from a 🛠 Stations chip in the buy row (no extra height on phones), with an
  Overview / Workstations tab row. It shows:
  - an isometric mini interior where the three benches grow with their level and the gate's bench is outlined;
  - the gate line;
  - three station cards with level pips, effect now → next, "🔓 Lv 3 lets Sawmill pass Lv 50" and a buy button.
- Station level L costs the building's own level cost at Lv 10/25/50/100/150/200/300/400/500/600 × forest value. Stations
  reset on Replant like building levels and stack on top of research, specialisations and staff.
- **Builders' Yard:** at a cap, the crew fits the station the gate needs, within the budget share.
- **Needs-attention:** "🔒 Sawmill capped at Lv 25 · 🪚 Bandsaw Lv 1 affordable" opens the Workstations tab.

### Compatibility
- Saves: owned upgrades become Lv 1. Buildings already past a gate keep every level and get the minimum station levels
  for free. Levels set directly are never clipped.
- `TT.buyBuilding` (dev/test API) also buys the station levels a purchase needs. The UI never does this silently.
- Version `2.22`; service worker cache `timber-tycoon-v2.22`.

### Tests
- New `test/v222.py` (50 checks): upgrade levels, effects, costs, max, requirements, migration and the Fully Tooled
  trophy; station effects on speed, input, output and price; gates clip ×10/Max; locked button → Workstations tab;
  interior; card buys; cs scaling; Replant reset; old-save grandfathering; iPhone 13 / Pixel 7.
- New pacing sim `test/sim_v222.js` (v2.21.1 vs v2.22: no soft-locks, gate delays, plank flow). The bot and the greedy
  sims count station costs.
- `test/v13.py` divides out station speed. `test/v29.py` maxes stations before the Max-button check.

## [2.21.1] — 2026-10-19

**Phase 3 gets its own row.** Semih: "do Phase 3, but as a separate row". The Premium Area is no longer a square compound by the highway: it is a third fenced row beyond Phase 2, parallel to the other two, so the factory reads left-to-right as three rows **I → II → III** along the lane.

### Changed
- **Row III layout** (`js/scene1.js` `PROW`, `uvIJ`, `inPremRow`): Gift Box Atelier → Parquet → Stationery → Cabinet Studio → Luxury Showroom run down one centre line in unlock order, slightly larger lots than before. `PREM` stays as the row's bounding box + centre for older callers.
- **Premium paving**: screen-square stone setts in a running bond with a light-stone forklift aisle and gold inlay (clearly unlike the diamond yard tiles), marble pads under each workshop, painted "III · PREMIUM" lettering, and a **PHASE 3 · PREMIUM** post sign at the head of the row (English to match the PHASE 1 / PHASE 2 signs).
- **II → III forklift lane**: a paved transfer lane between rows II and III with one gated opening per Phase-2 building (gold "II ▼ III" plates). Forklifts carry chairs / pellets / paper / furniture from the Phase-2 racks through their gate and down the row aisle to the workshop that uses them (one per link, ≤ 6). This replaces the overhead conveyor + receiving table.
- **Phase 3 dock** at the south end of the row (through a "TIMBER CO. RESERVE" arch) with its own access road; the premium trucks and the order client now come from the south on the northbound lane, so they never queue behind the Shipping dock trucks.
- Fence, locked-plot hoarding, survey stakes, lamps and planters follow the row.
- Left forest crew (landing, felling band, jack spots) moved past row III; the strip is cleared of trees and verge deco.
- Camera: `CAM_WORLD.x0` −860 → −1000. Phone focus zooms a little further on Phase 3 workshops so every one sits above the sheet (iPhone 13, Pixel 7).
- Quick-jump chip **💎 Phase 3** (was "Premium") frames the whole row; the Forest chip points at the moved crew; a new order flies to the client by the Phase 3 dock.
- Supply Flow: premium goods now ship from the Phase 3 dock (`pdock`), not the main Shipping dock; II → III arcs follow the new lots.
- Version `2.21.1`; service worker cache `timber-tycoon-v2.21.1`.

### Compatibility
- Saves are unaffected: only levels are stored, never positions. v2.21 saves load with every premium level intact.
- The Boat Yard stays at the harbour slipway (it needs water and the Harbour unlock) and the Toy Workshop stays on the R&D campus; both remain Phase-3 tier buildings.

### Tests
- New `test/v2211.py`: three parallel rows (row III beyond row II with a clear gap, one centre line, unlock order), no lot overlaps, no trees / deco in the row, premium ground for row + dock + road, forest crew outside the row, Phase 3 sign, camera bounds, locked tap → Premium sheet, Phase 3 chip lock/unlock + fly-to, II → III lifts (gate → aisle → door, ≤ 6, moving), Supply Flow to `pdock`, every workshop tappable, v2.21 save, iPhone 13 / Pixel 7 framing above the sheet.
- `test/v22.py`: premium forklift check uses the new lifts; `test/v24.py`: manager count allows the v2.21 peeler manager.

## [2.21] — 2026-10-19

**Town Market Fleet.** Auto-sell and market sales are now visible in the isometric scene: small town delivery vans (and early-game canvas carts) drive to Phase 1–2 stock piles, load tinted crates, and leave with a coin float. Separate from the dock shipping trucks. Also: a hireable manager for the Veneer Peeler.

### Added
- **Town Market Fleet** (`js/marketfleet.js`): 0 vans when idle, up to 3 when income is high. Soft-colour short vans (distinct from dock box trucks); canvas-roof carts while only a few buildings are up. Pickup on the factory apron south of stock piles — not the dock bay road. Sprite-cache friendly (quantised headings, `VBOX_S`, respects `SPR.maxMiss`).
- **Veneer Peeler manager** — Aylin Durmaz (Rare, Lean Line / thrift), hireable once the peeler is built. Fair migration: old saves do not auto-hire her.
- Coin float when a van departs with a load.

### Changed
- Version `2.21`; service worker cache `timber-tycoon-v2.21`.
- `docs/tiers-v2.20.md` §6 follow-up: peeler manager marked shipped.

### Fixed / Compatibility
- Cosmetic only: does not change `flowEdges`, `canSell`, or log raw-material rules from v2.20.1.
- v2.20.1 saves load cleanly; logs still never sell.

### Tests
- New `test/v221.py`: VERSION/sw cache, vans appear when selling and clear when idle, vans leave loaded, peeler in `MANAGERS` and hireable when built, no console errors, iPhone 13 / Pixel 7 smoke, v2.20.1 save still loads (logs not sellable). Re-run `test/v2201.py` and `test/v28.py` (perf).

## [2.20.1] — 2026-10-19

**Logs are raw material only.** Semih: "let's not sell logs directly". Logs now only feed the Phase-1 mills; exports start at Phase 1.

### Removed: every way to sell logs
- Market: the Logs row has no price, no auto-sell and no Sell button. It reads "Raw · not for sale" and shows how full the Log Yard is.
- Auto-sell and "Sell all" never sell logs, even if an old save had auto-sell on.
- Shipping-yard export contracts, client orders, daily contracts and trade ships never ask for logs. The "City Builders Co." client now likes veneer instead.
- Supply Flow: no logs arrow to the dock (logs still flow from the Log Yard into the mills).
- Tier texts: "Raw · raw material, not for sale, feeds Phase 1" and "Phase 1 · from logs only · exports start here". On Phase-1 sheets the margin reads "Earns 🪙X/s from logs, which can't be sold". Margins value logs at 0.

### Early game: the first Sawmill is built with logs
- Every run (fresh game and after each Replant) starts with no Sawmill and 0 coins. **The first Sawmill costs 🪵 40 logs, not coins.** That is about 40 s of one lumberjack or about 40 taps. The amount is flat, so it is never a wall after a Replant. Later levels cost coins as usual.
- The lot reads **"Build: 🪵 x / 40 logs"** with a progress bar. The sheet's Build button reads "🪵 x / 40 logs" with the same bar. Tapping the lot with enough logs builds it.
- **The first Lumberjack of every run is free** (the crew card reads "Free"), so a run with 0 coins can never soft-lock: free lumberjack → logs → Sawmill → planks → coins.
- Sims: with taps, the Sawmill is up within 30 s and ~800 coins are earned in the first minute (v2.20 bot: ~600). With no taps at all, the Sawmill is up within 60 s, both on a fresh game and after a Replant. At 20 minutes the bot earns about the same as in v2.20.

### Log Yard capacity
- The Log Yard holds about 3 minutes of collection (at least 600 logs). When it is full, the **collectors go idle**: no trees are felled (the forest is spared), and no logs are wasted or sold.
- It is shown clearly: the HUD log counter reads "Yard full" with a red outline, the Market row shows a fill bar, the attention button adds "Log Yard full · collectors idle", and chopping into a full yard shows "Log Yard full".

### Saves
- Log auto-sell is switched off. Held log stock is kept as raw stock, even above the new cap, and the mills use it up. Nothing is converted to coins.

### Tests
- New `test/v2201.py`: no sell path for logs (market, auto-sell, orders, daily contracts, export contracts, trade, flow), tier texts, logs-built first Sawmill (lot + sheet label and progress bar, tap-to-build), free first Lumberjack, fresh / idle / after-Replant no-soft-lock sims, Log Yard cap / idle collectors / HUD / attention, v2.20 save migration, iPhone 13 / Pixel 7. `test/bot.js` hires the free Lumberjack, builds the first Sawmill from logs and values buildings by their raw-log surplus; `test/functional.py` follows the new opening.

## [2.20] — 2026-10-19

**Factory tiers**: the yard now reads as one chain, raw → processed → finished. Each building belongs to a tier and is fed only by the tier before it. Design: `docs/tiers-v2.20.md`.

### New: three tiers (`js/tiers.js`)
- **Phase 1 · Primary** (right side of the lane, logs only): Sawmill, **Veneer Peeler (new, 4 logs → 3 veneer + 1 bark, 60K)**, Wood Chipper, Charcoal Kiln.
- **Phase 2 · Secondary** (left side + Plywood Mill, phase-1 goods only): Carpentry, Pellet Press, Paper Mill, Furniture Factory (planks + veneer), Plywood Mill (veneer + glue).
- **Phase 3 · Premium** (Premium Area, Toy Workshop, Boat Yard, phase-2 goods only): Gift Box Atelier (pellets + paper), Parquet (plywood + paper), Cabinet Studio (chairs + plywood), Luxury Showroom (furniture + chairs), Boat Yard (plywood + chairs).
- **Export from every tier**, and value per unit rises with each tier. The building sheet shows the processing margin (what processing earns over selling the inputs raw).
- Planks now feed 2 buildings instead of 7, so plank shortages are gone.

### Scene and UI
- Re-layout: phase 1 on the right of the lane, phase 2 on the left, with "PHASE 1 · PRIMARY" and "PHASE 2 · SECONDARY" ground signs.
- **Forklifts** shuttle pallets across the lane from phase 1 to phase 2 (1–2 per link, coloured by the good). The Premium conveyor carries only phase-2 goods.
- Tier badges (I / II / III) on building sheets and in the Supply Flow view; the flow legend reads Phase 1 → Phase 2 → Premium.
- The Market groups goods by tier.
- Phones: the margin line sits under the Buy row, so Buy stays on screen. The camera can travel further south so a phase-1 lot can sit above an open sheet.
- The needs-attention button opens the building it names.

### Saves
- Recipes change in place and levels are kept; the peeler starts at Lv 0. Old stock stays and can be sold. A one-time toast explains the new chain.

### Tests
- New `test/v220.py` (+ `test/sim_v220_hook.js`): tier rules (no building skips a tier), recipes, margins, layout and lot overlaps, forklifts, production, sheet/market/flow UI, Replant + research consistency, v2.19 migration, and a long shortage sim (phase-2 lines starved < 15% of samples), plus iPhone 13 / Pixel 7. Older tests updated for the new recipes and layout.

## [2.19] — 2026-10-19

**Research 2.0**: the research tree no longer finishes in your second run. It is now a long, permanent track that grows with your Forest Legacy. Design + audit: `docs/research-v2.19.md`.

### New: a deep tree (`js/research.js`)
- **67 nodes in 5 branches** (🔬 Science · 🌲 Forestry · 🪚 Milling · 🪑 Craft · ⚓ Logistics) and **5 tiers**.
- **Tiers open with Forest Legacy**: II at 25, III at 150, IV at 800, V at 2500 plus a line at Lv 200. Some nodes also need a milestone (Drone Fleet, Sawmill Lv 100, harbour Lv 3, Premium Area, …).
- **Costs grow**: base × tier factor × (+6% for every node already researched).
- **♾️ Repeatable nodes** in every branch (Applied Research, Forest Yield, Throughput, Craftsmanship, Market Reach): cost ×1.6 per level, effect +5% × level^0.7.
- New effects: offline cap +2 h / +4 h, Power Plant boost +25% / +50%, client orders & daily contracts pay +20% / +30%, trade speed, collector and mill boosts, premium prices.
- **No Seeds in research** any more; Seeds belong to the Seed Shop.
- The lab costs 500K (was 3M) so research starts in your first run. RP grows only ~Legacy^0.3, so Replanting can't rush the tree.
- Research and unspent RP are still kept through Replant.

### UI (mobile first)
- R&D → Research: lab card, overall progress with the next tier gate, 5 branch chips (ready dot), tier sections with lock reasons, 44 px node rows; tap a row to open it inline with the Research button.

### Saves
- Researched nodes stay researched. The Seeds you once paid for Automation (5) and Masterworks (10) are refunded to your Seed Shop wallet.

### Tests
- New `test/v219.py` (+ `test/sim_v219_hook.js`): tree shape, gates, cost growth, repeatables, effects and hooks, Replant keeps research, v2.18 / v2.17 migration, a 12-run pacing sim (≤ 35% after 5 runs), iPhone 13 / Pixel 7, snapshot. `test/v25.py` / `test/v27.py` updated for the new tree.

## [2.18] — 2026-10-18

**Replant 2.0**: the prestige module is rebuilt. Replanting no longer turns the next run into hundreds of free levels; every run starts fast and still matters. Design + audit: `docs/replant-v2.18.md`.

### New: Forest Legacy, Seed Shop, run goals (`js/replant.js`)
- **🌳 Forest Legacy**: every Seed you ever earn counts, it never goes down. Production bonus ×(1 + 0.1·L^0.8).
- **🌱 Seeds** are now a currency for the **Seed Shop**; spending them never lowers your bonus. 9 permanent items: Fertile Soil, Veteran Crews, Mill Know-how, Trusted Brand, Seed Money, Nursery Head Start, Arboretum, Premium Charter, Deep Roots.
- **Gain** = 3·(earned / (10M × forest value))^0.4, +8% per run goal, +15% per Deep Roots level. Live preview, "next Seed at …" and an ideal-time hint (wait / keep growing / replant now).
- **Forest value**: each new run is priced at your forest's power^0.88: building, collector, upgrade, wood, storage and premium costs, the first-Seed threshold and coin goals scale with it, so costs stay meaningful after a Replant.
- **12 run goals** (earn 100K…10T, Carpentry, Sawmill Lv 25, Furniture Factory, Lv 50, Premium Area, Research Lab, Lv 100).
- **Confirm sheet**: gain, Legacy and bonus before → after, two columns *Resets* / *Stays*. After replanting the Seed Shop opens if you can afford something.
- Mobile-first Replant sheet with three tabs (Replant · Seed Shop · Goals), 44 px touch targets.

### Saves
- Old saves migrate fairly: Legacy = Seeds held + Seeds already spent (research, managers); your Seeds stay spendable; the run in progress keeps its old bonus until the next Replant.

### Tests
- New `test/v218.py` (+ `test/sim_v218.js`): formulas, cost scaling, shop, goals, keep/reset list, confirm sheet, v2.17 migration, an 8-run pacing sim, iPhone 13 / Pixel 7, snapshot. Old suites updated where costs now follow the forest value.

### Next
- v2.19 Research 2.0 (deeper tree gated by Legacy, repeatable nodes) — plan in the design doc.

## [2.17] — 2026-10-18

**Line specialisations**: from Lv 50, every production building can run one of three specialised lines. It's a real choice about where your chain needs help.

### New: Specialisations (`js/spec.js`)
- At **Lv 50 (★3)** a 🎛️ Specialisation block opens in the building sheet with three lines:
  - ⚡ **High-speed line**: +40% speed, but each item takes +15% input.
  - ♻️ **Lean line**: −20% input per item. This helps when the building's inputs are short (for example planks for the Carpentry).
  - 💎 **Master craft**: the building's goods sell for +25%. That includes orders, daily contracts and trade, which all pay from the price.
- **Tiers grow with the building**: I at Lv 50, II at Lv 100 (×1.6 speed / −30% input / +40% price) and III at Lv 200 (×1.8 / −40% / +60%). The sheet shows ◆◇◇ and the level for the next tier.
- **Advisor**: a 💡 hint suggests a line and says why ("it is short on Logs", "Furniture Factory wants more Chairs", "100% of its goods are sold"). Each option shows a live estimate, e.g. "≈ +229 Chairs/s", "saves ≈ 458 Planks/s" or "≈ +🪙12K/s at today's sales".
- **First pick is free and instant.** Switching later **retools** the line for 30 s at 25% speed. It needs a second tap ("Tap again") so a stray tap never costs you, and offline time counts toward the retool.
- Premium and R&D buildings can specialise too. The Research Lab can't, because it makes no goods.

### Scene
- Every specialised building gets a **cloth banner on a steel post** at its front corner. The banner is blue ⚡, green ♻️ or gold 💎, with a vector emblem, a gold hem, 1–3 gold tier pips, a gold finial and snow on the arm in winter. It turns grey with a wrench while retooling and pops up when you pick a line.
- The level tag shows the line icon (e.g. "Lv 120 ★★★★ ⚡"). A "🔧 Retooling 23s" tag floats over a building while it retools.
- Banners are cached sprites (one blit each, about 10 µs).

### Also
- Needs-attention lists "🎛️ Sawmill: pick a specialisation" for every unpicked Lv 50+ building and opens the sheet at the block.
- The Lv 50 / 100 / 200 milestone toasts announce the unlock or the new tier.
- Two new trophies: **Specialist** (specialise a line) and **Master Lines** (3 lines at Specialisation III).
- The building sheet's input rates now include input savings (manager thrift and lean lines). So does the supply flow view.

### Compatibility
- **Replant**: your picks are remembered and switch back on once a building reaches Lv 50 again. A running retool is dropped. Building levels and upgrade/hire costs reset exactly as before.
- v2.16 and older saves load with no specialisations (`S.spec = {}`). Malformed entries are dropped.

### Tests
- New `test/v217.py`. It covers:
  - version, `sw.js` and the script tag
  - lock below Lv 50, the teaser, and the tiers
  - tap pick, effects (×1.4 / ×1.15, Lean ×0.8 with 20% fewer logs used in the sim, Craft ×1.25 price) and Tier II
  - the two-tap switch, the retool (25%, countdown, finish, offline)
  - the advisor, the attention entry, the milestone toast, trophies, the banner sprite and its cost
  - Replant, v2.16 save migration plus malformed entries
  - iPhone 13 and Pixel 7 taps, and the snapshot

## [2.16] — 2026-10-17

**Supply flow view**: an isometric overlay that shows the whole production chain at a glance.

### New: Supply flow (`js/flow.js`)
- Tap the new **🔀** button (or press **F**) to turn it on.
- Animated arcs rise over the roofs from each producer (or the Log Yard for logs) to every building that uses its goods. Up to 6 more arcs run from the factory to the Shipping dock for the goods that earn the most when sold.
- Arc width follows the flow rate, and moving dashes and arrowheads show the direction. Each arc has a rate label such as "🟫 255/s"; labels never overlap.
- Colours show health from the smoothed v2.15.1 shortage value: resource colour = fed, amber = low, red = short, green = sold.
- A legend at the top counts the short links. Buildings stay tappable with the view on.
- Mobile-friendly: 52 px button and the legend fits phone screens.

### Compatibility
- Purely visual: the save format is unchanged (the on/off choice lives in localStorage `tt_flow`). v2.15.1 saves load as before.
- The Replant cost reset is unchanged.

### Tests
- New `test/v216.py`: toggle (button and F key), legend, edges (Log Yard → Sawmill, Sawmill → Carpentry, sold → dock), red link when starved, pixels change, persistence, save untouched, tapping, Replant, overlay draw cost, v2.15.1 save migration, iPhone 13 and Pixel 7, snapshot.

## [2.15.1] — 2026-10-16

**Plank balance fix**: the Sawmill now keeps up, and shortage warnings are calmer and say what to do.

### Root cause
- A simulated early/mid/late game showed no new plank sink from v2.12–v2.15. Staff only ever speed the Sawmill up, and the shipping, Builders' Yard and forklift changes don't consume planks.
- The shortage was structural. One Sawmill (2 planks per speed unit) fed up to seven plank users (6 to 120 planks per unit, with ×4–×5 speed on premium and research buildings).
- With upgrades spread evenly by cost, the Sawmill covered only 19% of plank demand once premium unlocked, falling to 2–4% in the late game.
- Warnings flashed at a 1.5% shortage, once per building.

### Balance
- Sawmill: 4 logs → **3** planks (was 2). Plank price 4 → 3, so early plank income only rises about 12%.
- **Saw yield** from Sawmill Lv 50: each milestone gives ×1.6 planks per log, plus 5% per level above 50 (×3.9 at Lv 79, ×16 at Lv 158). Log use is unchanged and the plank storage cap grows with it.
- Leaner plank recipes:
  - Carpentry 6 → 4
  - Furniture 20 → 12
  - Parquet 12 → 6
  - Cabinets 10 → 6
  - Plywood 10 → 6
  - Boat Yard 30 → 18
  - Showroom 20 → 12
- Sawdust chips are unchanged.
- Result: the cost-balanced simulation is now fully fed at every stage. Greedy play stays at least 99.9% fed at 10, 30, 60 and 120 minutes.

### Plank allocation
- New toggle in the shortage hint: **shared fairly** (default, the old behaviour) or **best value first**.
- In best-value mode every consumer keeps 30% of its fair share, and the rest goes to the building that earns the most per plank.
- Orders, daily orders and trade ships now share one priority budget, at most 80% of fresh output beyond the surplus. Before, each could take its own 65–80%.

### Warnings
- Shortages are smoothed over about 6 s, so one-tick dips stay quiet. The card status reads "Short on Planks" below 90% and "Slightly short" for small dips.
- Attention entries are grouped per input, e.g. "🟫 Short on Planks (Carpentry 40%, Furniture 35%) · upgrade the Sawmill". Tapping it jumps to the Sawmill.
- The building sheet shows a hint: "Sawmill makes X/s, buildings want Y/s", with an **Upgrade Sawmill →** button and the allocation toggle. The hint sits below the buy row so it never moves the buttons.
- The Sawmill sheet shows saw yield (from Lv 40).

### Tests
- New `test/v2151.py`: greedy early/mid/late simulation plus cost-balanced premium/research states (plank supply must stay sustainable), allocation modes, priority budget, smoothed and grouped warnings, the hint jump on desktop, iPhone and Pixel, and save migration.

## [2.15] — 2026-10-16

**Staff in the world**: your hired staff now walk and work in the factory scene. Tired workers take real campfire breaks.

### Scene (`js/staffworld.js`, new)
- Every hired staff member appears as an animated isometric worker in their own area:
  - lumberjacks chop trees in the forest work zones (the tree shakes and throws chips)
  - drivers direct trucks at the log yard
  - mill workers carry goods and hammer at their assigned building; engineers inspect it with a clipboard
  - forklift operators marshal at the Shipping Yard drop; dock workers carry crates round the dock to the truck bays
  - firefighters stand by at the fire station
  - unassigned mill workers and engineers wait at the log yard
- Each role has its own hard-hat and hi-vis vest colours, plus a small role marker that shows the worker's rarity. The marker keeps a readable size when you zoom out.
- Resting workers walk to the campfire and sit on tree-stump stools, with a 💤 marker. Long commutes fade out and back in, so nobody walks through a building.
- Productivity bubbles: now and then a working worker shows their real effect (e.g. "🪓 +6% chop", "🔧 −10% input"). At most 3 show at once.
- Founding foremen stay at their building as the manager, so they are drawn only once.

### Tap and find
- Tap a worker to open the Team sheet scrolled to their card. The card is highlighted, the worker gets a ring and a name tag, and the camera moves so the worker stays visible above the sheet.
- Tap the portrait on a Team card (📍) to fly the camera to that worker. For founding foremen it flies to their building. The portrait button is at least 52 px.
- Team cards show what each worker is doing: working, waiting for an assignment, tired (80%), or "☕ On a break at the campfire · back in 1m 7s".

### Gameplay: campfire breaks (`js/staffsys.js`)
- Below 15% energy a worker takes a real break: no output while resting, energy refills at 1.2/s (+10% with a Local hero on the team), and they return at 100%. A break lasts about 70 s.
- In v2.14, tired workers stayed near 15% energy and worked at 80% for good. Now a long session averages about 91% output.
- The fatigue setting and the Steady trait still turn breaks off. Wages, training, Replant (keeps staff, still resets upgrade and hire costs) and offline progress are unchanged.

### Fixes
- Building sheets threw "updateBldMgr is not defined" in v2.14, so the sheet stopped updating part-way and the fire note never showed. The sheet is restored and now shows the building's foreman card and a **Staff here** list (used/total slots, a 44 px chip per worker that opens their card, and an Assign / Team button).
- An energy of 0 no longer reads as 100 (`w.energy||100`).

### Perf
- Workers use the cached `human()` sprites. Looks are shared per role and face, so sprite keys stay stable. Stools and markers are cached sprites, and bubbles use the cached pills.
- At most 24 workers are drawn on desktop and 14 on phones. All workers are still simulated, which is cheap.
- `test/v215.py`: median frame cost with 49 staff is 5.8 ms, against 5.1 ms with none. `test/v28.py` long-session perf still passes.

### Compatibility
- v2.14 saves migrate: every worker gets `brk` and a numeric energy. Tired v2.14 workers go on their first break right away. v2.13 saves still migrate managers to founding foremen.
- `test/v213.py` and `test/v214.py` now check the `sw.js` cache version with ≥, so later releases keep passing.

### Tests
- New `test/v215.py`. It covers:
  - version, `sw.js` and the script tag
  - v2.14 and v2.13 save migration
  - every role working in its area, the poses, and the role looks
  - breaks: start, no output, a seat at the campfire, the status line, the end of the break, the return to work, the fatigue setting, the Steady trait, a long-session average and offline range
  - tap a worker → card in view and highlighted; 📍 → camera
  - the building sheet's Staff here list and fire note
  - bubbles; the draw cap and frame cost with 49 staff; one seat per worker; Replant
  - touch taps on iPhone 13 and Pixel 7, and the release snapshot

## [2.14] — 2026-10-15

**Staff system**: roles, wages, candidates, training and light fatigue. Managers become founding foremen.

### Staff (`js/staffsys.js`, new · `js/staff.js`)
- Seven roles with area effects: Lumberjack, Driver, Mill worker, Engineer, Forklift operator, Dock worker, Firefighter.
- Rotating candidate pool (3–5) with rarity, skill 1–5 and traits (Night owl, Fast learner, Steady, Local hero). Free reroll every 10 minutes.
- Wages scale with skill + rarity (not headcount). Hire cost ≈ one minute of wage. If coins run out, staff work at 50% — nobody is fired.
- Training raises skill (coins + time, offline counts) up to a soft cap of 10.
- Mill workers & engineers assign to buildings (1 slot, 2 at ★2, 3 at ★4). Mobile uses an Assign → building-list sheet.
- Light fatigue: energy drains while working, refills at the campfire; below 30% work at 80%. Settings toggle + Steady trait can disable it.
- Staff sheet tabs: **Team | Candidates | Training**, with Fire Safety kept at the top. More-menu label: "Team, hires & fire".
- Profit bar on the Team tab shows wages vs estimated staff output.

### Migration & Replant
- Existing managers become named Legendary/Epic **Foremen** (mill workers) assigned to their building. Wage waived for life. Legacy `mgr*` bonuses still apply so production does not drop.
- Replant keeps staff and training; upgrade/hire costs still reset. Fire station kept as before.
- Trophies `mgr1` / `mgr6` count hired staff including founding foremen.

### Compatibility
- v2.13 saves migrate automatically. `test/v28.py` perf and `test/v213.py` shipping/manager checks still pass.

## [2.13] — 2026-10-14

**Shipping Yard, new forest machines, staff cost rebalance.**

### Shipping (`js/shipping.js`, new)
- New Shipping Yard sheet (tap the dock, or the Shipping button): a departures board with loading bays, per-bay load bars and departure timers.
- Upgrades: Dock level (1–10, +2% export premium per level, 2 bays at Lv 4 and 3 at Lv 8), forklift count (2–6), forklift speed (5 levels), and a gantry crane (3 levels) for faster loading and bigger contract rewards.
- Forklifts are twice as fast by default (base speed 1.7 → 3.4) and get faster with upgrades.
- Export contracts to trade-map cities: accept, skip or abandon. A harbour route to the city gives +25% reward.
- Load bar and timer drawn over the docked truck. The UI is mobile-friendly, with 44 px buttons and a More-menu entry.

### Forest machines (`js/forestveh.js`, new)
- The harvester has been redrawn (articulated 8-wheel, cab, boom, felling head).
- New forwarder whose log bunk shows its load, and a new skidder.
- The log-truck crane has been redrawn.
- All machines are cached per heading, with night lights and beacons.

### Staff
- Audit: level costs grew ×3.2 per level while the benefit was linear, and Legendary managers cost ×4 for ×2 effect.
- Level cost is now ×2.2 per level. Rarity cost now matches rarity power. Seeds are needed from Lv 7 instead of Lv 6.
- Each card shows "Next level: +X% ≈ +Y/s · pays back in T".
- The Replant cost reset is unchanged.
- The full staff system (roles, wages, training, specialists) is designed in `docs/staff-system-v2.14.md` and planned for v2.14.

### Compatibility
- v2.12 saves migrate automatically (`ship` state is added). Shipping levels survive a Replant.

## [2.12] — 2026-10-14

**Builders' Yard**: construction crews that upgrade your buildings on their own.

### Gameplay (`js/builders.js`, new)
- Unlocks once 3 production buildings are built, and shows in the scene from 2. Building it costs 25K, and each of the 6 levels costs ×12 more.
- Crews in yellow trucks go out to the factory, put up scaffolding, work for a few seconds and then pay the **normal price** for the levels.
  - Per job: up to 3 levels at Lv 1, rising to 100 at Lv 6.
  - Crews: 1 at Lv 1, rising to 4 at Lv 6.
  - Job time: 18 s at Lv 1, falling to 11 s at Lv 6.
- **Plans**:
  - ⭐ Milestones: the next ×2 milestone that is cheapest to reach.
  - 🪙 Cheapest: always the cheapest next level.
  - ⚖️ Lowest level: lifts the lowest-level building first.
- **Budget**: crews never spend more than 10 / 25 / 50 / 100% of your coins at the moment they pay. Nothing is reserved until a job finishes, so buying by hand costs exactly the same.
- **Exclusions and pauses**: you can exclude single buildings or switch the yard off. Burning buildings are skipped. Crews also work offline.
- **Replant**: the yard and its settings are kept. Building levels and costs reset as before, and running jobs are dropped.
- **Perks by level**:
  - Lv 2: tower crane.
  - Lv 3: two-storey site office.
  - Lv 4: floodlight mast.
  - Lv 5: cement silo.
  - Lv 6: gold trim and the ★ flag.
- Two new trophies: **Hard Hats On** (build the yard) and **Skyline** (crews build 1,000 levels).
- On mobile the yard has a **More → Builders** entry, a jump chip and a needs-attention entry ("Builders' Yard: build affordable").

### Scene (`js/scene13.js`, new)
- The yard sits at the bottom of the lane: gravel pad, fence, portacabin, material stacks and sign. The static part is cached as one live sprite. The crane slews and is drawn every frame.
- Crew trucks drive up the lane and back out. Builders appear on scaffolding at the building they're working on.

### Tests
- New `test/v212.py`. It covers:
  - save migration from v2.11 and v2.10.1, unlock and costs
  - plans, budget, paying on completion, opt-outs, the off switch, fires and the crew cap
  - offline building and Replant
  - scene, sheet, taps on desktop, iPhone 13 and Pixel 7, and the release snapshot
- `test/v211.py` now compares versions as tuples.

## [2.11] — 2026-10-13

**Factory facelift**: the core production buildings around the plaza get real materials, level-tier evolution, and stock yards that show what you actually have stored.

### Art: buildings (`js/facade.js`, new · `js/scene4.js`)
- Shared material helpers at the quality bar set by the v2.10.1 chimneys:
  - **Plank / brick / corrugated-metal walls** with kerfs, mortar courses and rib highlights.
  - **Shingle / tile / corrugated roofs** with lit and shaded slopes, a ridge cap and denser texture; winter snow still covers them.
  - **Framed windows** (sill + muntins) that glow at night, **roller / wood doors**, soft contact shadows and a side **sign band**.
- Every plaza building (sawmill, chipper, kiln, carpentry, pellet press, paper mill, furniture factory) was redrawn with those materials.

### Level-tier evolution
Milestones are still Lv 10 / 25 / 50 / 100 / 200 / 400. From Lv 25 a building grows a lean-to wing; from Lv 50 it gains rooftop vents; from Lv 100 it adds solar panels and a flag; Lv 400 keeps the gold trim. Progress on the plaza is visible without opening a sheet.

### Art: stock yards (`js/scene7.js`)
- Side racks are steel frames with wooden shelves and a corrugated back, not empty orange crates.
- Fill is drawn as the real goods (log piles, plank stacks, chip mounds, charcoal/pellet sacks, paper reams, chair crates, branded furniture crates) and **quantised into 5 steps** (`stockStep`) so the live-sprite cache is only rebuilt when the step, level, season or "FULL" flag changes — not every frame.

### Perf
- Buildings stay on the existing live-sprite path (re-render on level-tier / season / lights / running at 8 fps). Stock yards are one live sprite per building, keyed by fill step — no per-frame wobble.
- `tools/bench.py` late-game frame cost (avg ms): day-fit 15.8→15.9, day-zoom 13.3→14.5, night-fit 19.5→20.1, night-zoom 17.5→16.7. The v2.8 long-session test stays flat (p95 &lt; 40 ms, heap stable).

### Tests
- New `test/v211.py`: version, v2.10.1 save load, milestone / stockStep thresholds, cache stability, taps on desktop + iPhone 13 + Pixel 7, release snapshot, no 404s or console errors.

## [2.10.1] — 2026-10-10

Bug-fix release: the fire station is easy to build again, and the chimneys and smoke are redrawn.

### Fixed
- **"I can't build the fire station."** The build button worked, but it was buried. Tapping the station lot (or opening Staff from More) opened the Staff sheet at the top. The **Fire Safety** block came after all 15 manager cards, about 2,800 px down on a phone, below a half-height sheet. Nothing on screen showed where the button was.
  - **Fire Safety is now the first block** in the Staff sheet. The Build/Upgrade button is on screen as soon as the sheet opens, on desktop and on phones.
  - When you can't afford it yet, the button now says **"Need 🪙 X more"** instead of just being greyed out.
  - The **needs-attention** button now lists "🚒 Fire Station: build affordable" and opens the Staff sheet at the station.
- Checked every other buildable with real touch taps on iPhone 13 and Pixel 7, and with a mouse on desktop: production buildings, Research Lab, Premium Area, Harbour, Power Plant and planters (nursery). All of them build with one tap, and none needed a fix.
- **Chimney smoke was emitted about 4× too rarely.** Buildings are redrawn in throttled live sprites (about 15 fps), but smoke emission was tied to the frame time. Emission now uses real time per chimney.
- The power plant's red aviation light sat in the middle of the flue. It now sits on the rim.

### Art: chimneys (`js/chimney.js`, new)
- One shared, high-quality chimney renderer replaces the flat boxes and plain cylinders on the sawmill, carpentry, furniture factory, chipper vent, kiln, paper mill stacks, Gift Box Atelier and power plant.
  - **Square brick/stone stacks**: lit left face, dark right face, staggered brick courses, a corbelled cap and a dark flue opening.
  - Square stacks have a **soot gradient** near the top and **lead flashing** that follows the roof slope. They are seated on the real roof surface (new `gableZ` / `roofSeat`), so they no longer float or poke through. A soft ambient-occlusion shadow sits on the roof.
  - **Round stacks** (kiln, paper mill, power plant, chipper) have a cylindrical shade, brick courses or metal bands, an optional taper, a thick rim and an elliptical dark opening. The power plant keeps its red/white aviation bands, ladder and platform ring.
  - Snow caps in winter.
- Each chimney is **pre-rendered once into an offscreen sprite** (2×/3×/4× by zoom) and stamped with `drawImage`, so rebuilding a building's cache costs one blit per chimney.

### Art: smoke
- Puffs are soft, pre-rendered **multi-lobe sprites** instead of flat discs. Each puff fades in, rises with a slowing climb, grows, wobbles, **drifts with the wind** and fades out.
- Puffs are **tinted by time of day**: darker and cooler at night. Smoke kinds keep their colour (grey, dark kiln smoke, light, steam).
- Smoke is still fully pooled, including vehicle exhaust, which used to allocate a new object per puff. The perf test stays flat.

### Tests
- New `test/v2101.py` (48 checks):
  - On desktop, iPhone 13 and Pixel 7 (real CDP touch), the fire station builds via the scene lot with the button on screen without scrolling, and via More → Staff.
  - The shortfall note shows when you can't afford it, and the attention entry is listed.
  - Every other buildable builds by tap.
  - Chimney sprites are cached with no per-frame rebuilds, and smoke stays pooled.
  - The release snapshot runs.
- `test/v210.py` accepts patch versions (≥ 2.10).
- `tools/shot_chimneys.py` makes the close-up chimney screenshots.

## [2.10] — 2026-10-12

**Biomass Power Plant**: a new late-game building in a forest clearing east of the factory. It burns part of the factory's pellets and charcoal to power every building.

### Gameplay (`js/power.js`, new)
- Unlocks once a **Pellet Press** is built. Building it costs 250K; each of the 10 levels costs ×5 more (Lv 10 ≈ 488B).
- Each level gives **+5% production to all buildings**, up to **+50% at Lv 10**. The bonus scales with how well the plant is fuelled (0–100% efficiency, smoothed over a few seconds).
- It burns 16.5% (Lv 1) to 30% (Lv 10) of the Pellet Press + Kiln output. Fuel modes: **Mix** (default, falls back on the other fuel), **Pellets** only, **Charcoal** only. An on/off switch keeps all your pellets and charcoal for selling.
- Status shows **Running / Low fuel / No fuel / Off**. Low and no fuel appear in the needs-attention list, and that entry opens the power sheet and frames the plant.
- Perks shown in the sheet: Lv 1 boiler house, turbine hall, chimney and substation; Lv 3 cooling tower; Lv 5 twin fuel silos; Lv 7 second chimney; Lv 10 gold trim and ★ flag.
- **Kept through Replant** like the fire station and harbour. Upgrade and hire costs still reset as before.
- Two new trophies: **Lights On** (build the plant) and **Grid Tycoon** (Lv 10).
- Offline earnings include the boost. Saves from v2.9 and older load with the plant unbuilt.

### Scene (`js/scene12.js`, new)
- Detailed isometric plant: brick boiler house with a "TIMBER POWER" band, ribbed steel turbine hall with a roof sign and roller door, banded chimneys with smoke, a hyperboloid cooling tower with steam, fuel silos, a fenced substation, and a power line on wooden poles with sagging wires and gold energy pulses into the factory.
- Gravel clearing and access road to the highway. Lit windows, floodlights and blinking red aviation lights at night. Before it is built, a pegged plot with a price pill shows where it will go.
- Tap the plant to open its sheet. New ⚡ quick-jump chip and a **Power** button (More menu on phones). The camera's world bounds were widened so the plant can be framed.
- The plant is a cached sprite (re-rendered only when its level, season or lights change): about 4.3 ms per frame with it on screen, same as v2.9.

### Tests
- `test/v210.py` (new): migration, unlock and costs, burn share, boost, fuel modes, no-fuel and attention, off switch, max level, trophies, offline, save, Replant, scene taps, sheet buttons, frame cost, jump framing, phone More menu, release snapshot, no 404s or console errors.
- Version checks in the tests now compare version tuples (`ver()` in `test/_server.py`), so "2.10" sorts after "2.9".
- New screenshots: `screenshot-power.png`, `screenshot-power-night.png`, `screenshot-mobile-power.png`.

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
- ~~Research tree / skill points spent on specialisations~~ → research tree shipped in [2.5], line specialisations in [2.17]
- ~~Daily contracts (deliver X chairs in Y minutes for a reward)~~ → shipped in [2.6]
- Seasonal visuals (autumn/winter forest) and weather in the scene
- ~~Market cart / delivery truck carrying finished goods off-screen~~ → Town Market Fleet in [2.21]
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
- ~~Research tree / skill points spent on specialisations~~ → research tree shipped in [2.5], line specialisations in [2.17]
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
