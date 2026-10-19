# Factory tiers (v2.20)

Semih's idea: the yard should read as a clear chain — **raw → processed → finished**. Every building belongs to one tier and is fed
**only** by the tier before it. Every tier can export, and the profit per unit rises with each tier, so "sell it raw or process it?"
is a real choice. Code: `js/tiers.js` (+ recipe/lot changes in `js/logic_a.js`, `js/scene1.js`). Tests: `test/v220.py`.

## 1. The three tiers

| tier | where | input | buildings → output |
|---|---|---|---|
| **Phase 1 · Primary** | right side of the lane (sawmill side of the yard) | **logs only** | 🪚 Sawmill → planks · 🪵 **Veneer Peeler (new)** → veneer + bark · 🌀 Wood Chipper → chips · 🔥 Charcoal Kiln → charcoal (+ glue with *Pine Tar Glue*) · sawdust → chips with *Sawdust Recovery* |
| **Phase 2 · Secondary** | left side of the lane + Plywood Mill on the R&D campus | **phase-1 goods only** | 🔨 Carpentry (planks → chairs) · ⚙️ Pellet Press (chips → pellets) · 🏭 Paper Mill (chips → paper) · 🏗️ Furniture Factory (**planks + veneer** → furniture) · 🟧 Plywood Mill (**veneer + glue** → plywood) |
| **Phase 3 · Premium** | the fenced Premium Area (+ Toy Workshop on the campus, Boat Yard at the harbour) | **phase-2 goods only** | 🎁 Gift Box Atelier (pellets + paper) · 🪵 Parquet Workshop (plywood + paper) · ✒️ Stationery House (paper) · 🗄️ Cabinet Studio (chairs + plywood) · 👑 Luxury Showroom (furniture + chairs) · 🧸 Toy Workshop (plywood + paper) · ⛵ Boat Yard (plywood + chairs) |

The Research Lab burns paper (phase 2) but makes no goods, so it is outside the chain.

### Recipe changes (old → new)
| building | v2.19 | v2.20 |
|---|---|---|
| Furniture Factory | 8 chairs + 12 planks → 2 | 12 planks + 8 veneer → 2 |
| Plywood Mill | 6 planks + 2 glue → 2 | 6 veneer + 2 glue → 2 |
| Gift Box Atelier | 5 charcoal + 5 pellets → 1 | 5 pellets + 2 paper → 1 |
| Parquet Workshop | 6 planks + 3 charcoal → 1 | 1 plywood + 2 paper → 1 (engineered parquet: plywood core, paper underlay) |
| Cabinet Studio | 2 chairs + 6 planks → 1 | 2 chairs + 1 plywood → 1 |
| Luxury Showroom | 1 furniture + 12 planks → 1 | 1 furniture + 4 chairs → 1 |
| Boat Yard | 12 plywood + 18 planks + 4 glue → 1 | 14 plywood + 2 chairs → 1 |
| **Veneer Peeler (new)** | — | 4 logs → 3 veneer + 1 bark (cost 60K, ×1.19) |

*Note:* Semih listed parquet under phase 2. In v2.20 the Parquet Workshop stays in the Premium Area (that is where every save already
has it, and its art is a premium workshop), so its recipe moves up instead: engineered parquet from plywood + paper, i.e. phase-2 goods only.

### Why plank shortages can't come back
Planks now feed only the Carpentry and the Furniture Factory (before: 7 consumers). Veneer — from a separate, log-only building — carries
half of the Furniture Factory and all of the Plywood Mill. `test/v220.py` runs a long simulated game and checks plank and veneer supply.

## 2. Export from Phase 1 up
**v2.20.1:** logs are raw material only. They can't be sold, auto-sold, shipped or ordered, and the Log Yard holds about 3 minutes of collection; when it is full the collectors go idle. Each run's first Sawmill is built with 40 logs and the first Lumberjack is free, so a run with 0 coins always gets going. Every good from Phase 1 up can be sold (auto-sell or Market) or shipped. Value per unit rises by tier:

| tier | goods (price) | typical margin per unit over its inputs |
|---|---|---|
| raw | logs (not for sale; value 1 only as a reference) | — |
| Phase 1 | planks 3 · veneer 3.5 · bark 1.5 · chips 2 · charcoal 9 · glue 6 | +1 … +6 |
| Phase 2 | chairs 60 · pellets 10 · paper 20 · furniture 700 · plywood 90 | +5 … +670 |
| Phase 3 | gift box 230 · flooring 260 · stationery 380 · cabinets 380 · luxury 1.9K · toys 320 · boats 4.5K | +140 … +3.2K |

The Market sheet groups goods by tier and shows the **processing margin** of each building: what you gain per second by processing versus
selling the inputs raw. Turning a building off (or leaving auto-sell on for its input) is the "sell raw" choice.

## 3. Transport between tiers (visible)
* **Forklifts** shuttle pallets across the lane from phase-1 buildings to the phase-2 buildings that use their goods. The number of forklifts
  follows the flow (1–2 per link), and each carries the good's colour.
* The **overhead conveyor** into the Premium Area (v2.2) now carries only phase-2 goods.
* **Supply Flow view** (🔀): arcs are coloured by the good as before and each building gets a tier badge (I / II / III); the legend
  reads *Phase 1 → Phase 2 → Premium*. A "tier" check flags any arc that skips a tier (there are none by construction).

## 4. Scene re-layout
* Right side of the lane = phase 1: Veneer Peeler (new lot next to the Log Yard), Sawmill, Wood Chipper, Charcoal Kiln.
* Left side = phase 2: Carpentry, Pellet Press, Paper Mill, Furniture Factory.
* Ground signs at the head of each side: "PHASE 1 · PRIMARY" / "PHASE 2 · SECONDARY"; the Premium gate reads "PHASE 3".
* Buildings keep their levels; only where they stand changes.

## 5. Consistency
* **Replant 2.0 / forest value:** the peeler's cost scales with the run's forest value like every other building; it resets on Replant.
  New run goal: none needed (Furniture Factory goal now implies veneer).
* **Research 2.0:** the Plywood Mill node now reads "veneer + glue"; milling boosts (Throughput, Robotic Mill, Zero-waste) include the peeler.
* **Power, staff, managers, specialisations:** the peeler is a normal production building (fire risk 1, specialisations from Lv 50,
  power-plant boost, staff can be assigned). It has no manager in v2.20 (follow-up).
* **Saves:** recipes change in place; the peeler starts at Lv 0 (veneer/bark stock 0). Old stock of planks/chairs/charcoal stays and sells.
  A one-time toast explains the new chain. Nothing is lost.

## 6. Follow-ups
* ~~A peeler manager~~ → shipped in v2.21 (Aylin Durmaz); a phase-2 "Flooring line" if parquet should move out of the Premium Area.
* Tier-wide upgrades (e.g. "Phase 1 automation") in the Upgrades list.

## 7. Tests and perf (release check)
* Full suite green (functional, v12 … v220). Shortage sim in `test/v220.py`: 8 runs, phase-2 lines starved of planks/veneer in **1.4 %** of samples (limit 15 %).
* `tools/bench.py` late game, 1280×800, frame cost avg ms (v2.19 → v2.20): day-fit 12.0 → 13.6 · day-zoom 10.9 → 11.6 · night-fit 17.0 → 17.6 · night-zoom 13.1 → 14.6.
  The extra cost is the new peeler plus up to 10 cross-lane forklifts. To keep the sprite cache warm, there are at most 2 forklifts per link, they use 16 headings and they don't bounce.
* Phones: the processing-margin line sits under the Buy row, and the tier badge sits next to the building name, so Buy stays on screen on iPhone 13 and Pixel 7.
  The camera may travel further south (`CAM_WORLD.y1` 1180 → 1320), so a phase-1 lot can be framed above an open sheet.
