# Replant 2.0 (v2.18) — and the Research 2.0 plan (v2.19)

## 1. Audit of the old Replant (v2.17 and earlier)

| | old behaviour |
|---|---|
| Gain | `seeds = floor(3·√(totalEarned / 1e7))`, first Seed at 1e7 coins |
| Bonus | **linear**: `×(1 + 0.1·seeds)` × trophies |
| Spending | Seeds were spent on Research nodes (Automation 5, Masterworks 10) and on manager levels 6+ — **spending lowered the production bonus** |
| Resets | coins, stock, buildings, collectors, planters, upgrades, wood species, Premium Area, storage, active orders |
| Stays | research, staff + managers, fire station, power plant, builders' yard, shipping yard, harbour + routes, trophies, line picks, stats, settings |
| Costs | **every cost went back to its base value** while the multiplier stayed |

**Why post-Replant costs looked silly.** Building costs are exponential (`cost·1.15–1.19^lvl`). A production multiplier X is worth
`log X / log 1.19` free levels on *every* building at once. With ×16 (150 Seeds) a fresh Sawmill costs ~0.1 s of income: you tap
"Max" and get hundreds of levels instantly; costs shown as 100, 1.2K… next to a +300K/s income. The run had no early game left.

Sim (greedy player, real game code, headless):

| player | run length | levels bought in first 60 s | cheapest cost / income | notes |
|---|---|---|---|---|
| fresh, replant at +50 % | 13–25 min | — | 1.7–5 s | only reaches early furniture |
| late (150 Seeds, research done) | **2–3 min** | **325–606** | **0.1–0.3 s** | seeds 150→234→372, runs get *shorter* |

The linear bonus + base-cost reset is a runaway: each loop is shorter and emptier than the last, and the "should I spend
Seeds?" choice was a trap.

## 2. New design

Inspired by AdVenture Capitalist (angels never lost), Egg Inc. (soul eggs + an epic shop, run goals) and Lumber Inc.

### Two numbers
* **🌳 Forest Legacy (L)** — every Seed ever earned. Never goes down. Production bonus `×(1 + 0.1·L^0.8)` (L=10 → ×1.63, 50 → ×3.3, 200 → ×7.9, 1000 → ×26).
* **🌱 Seeds** — the same gain, as a currency for the **Seed Shop**. Spending never lowers the Legacy.

### Gain
`gain = floor( 3·(E / (1e7·cs))^0.4 · (1 + 0.08·goals) · (1 + 0.15·Deep Roots) )`, min 1 once over the threshold.
`E` = coins earned this run, `cs` = the run's forest value (below). Exponent 0.4 (between sqrt and log): 10× more coins ≈ 2.5× more Seeds.

### Forest value — the cost fix
At each Replant the new run is priced at `cs = runPower^0.88` where `runPower` = Legacy × shop production boosts × start tree.
Every building, collector, upgrade, wood species, storage and premium cost, the first-Seed threshold and the coin goals are × `cs`.
So your power still grows (net speed-up per run ≈ runPower^0.12, plus the head-start items), but costs stay **meaningful**:
a fresh run starts fast (12–55 buys in the first minute) and then the cheapest building costs 3–5 s of income again.
Kept infrastructure (stations, power, yards, harbour, managers, staff) is not rescaled.

### Seed Shop (permanent, survives every Replant)
| item | effect / level | price | max |
|---|---|---|---|
| 🌾 Fertile Soil | +25 % all production | 4·1.7^l | 25 |
| 🪓 Veteran Crews | +50 % collectors & chopping | 3·1.75^l | 12 |
| 🏭 Mill Know-how | +50 % buildings | 3·1.75^l | 12 |
| 🏷️ Trusted Brand | +10 % prices | 4·1.6^l | 15 |
| 💰 Seed Money | start coins 1K·4^(l-1) × forest value | 1,3,8,20,50,120 | 6 |
| 🌱 Nursery Head Start | +5 lumberjacks, +2 planters at start | 2·1.8^l | 5 |
| 🌳 Arboretum | start on a better wood species | 6,15,40,100 | 4 |
| 🏛️ Premium Charter | Premium Area opened at start (needs 2 Replants) | 30 | 1 |
| 🌰 Deep Roots | +15 % Seeds from every Replant | 5·1.9^l | 10 |

Production items also raise the next run's forest value, so they are a real trade-off, not free power; head-start items and Deep Roots are not.

### Run goals (reset every run, +8 % gain each)
Earn 100K / 10M / 1B / 100B / 10T (× forest value), build the Carpentry, Sawmill Lv 25, build the Furniture Factory, any line Lv 50,
open the Premium Area, run the Research Lab, any line Lv 100. 12 goals → up to +96 % Seeds.

### Ideal time hint
`rpAdvice()`: **wait** below the threshold · **grow** while Seeds/minute is still climbing · **now** once the gain is
≥ max(3, ¼·L) and the Seeds/min rate dropped below 85 % of this run's peak (after ≥ 5 min). Shown in the Replant tab with "next Seed at …".

### Confirm sheet
"Review & Replant" opens a sheet: gain, Legacy L→L+g, production ×P→×P', two columns **Resets** / **Stays**, and the new forest value.
After replanting the Seed Shop tab opens if something is affordable. Mobile first: 3 tabs (Replant · Seed Shop · Goals), 44 px targets.

### Migration (fair)
A pre-v2.18 save gets `Legacy = Seeds held + Seeds spent` (research nodes + manager levels), keeps its Seeds as shop currency,
and the run in progress keeps its old ×(1+0.1·seeds) bonus (or the new one if higher) until the next Replant. Nothing is lost.

### Pacing sim (test/v218.py, 8 runs, greedy player using the advice)
| run | min | gain | Legacy | forest value | buys 1st min | cost/income (median) | Sawmill |
|---|---|---|---|---|---|---|---|
| 1 | 25 | 3 | 0 | 1 | 12 | 4.4 s | 43 |
| 3 | 18 | 4 | 6 | 1.36 | 31 | 4.0 s | 43 |
| 5 | 29 | 8 | 15 | 2.48 | 30 | 5.1 s | 51 |
| 8 | 31 | 27 | 54 | 6.35 | 52 | 3.0 s | 65 |

Runs stay 17–33 min, the first minute is lively but bounded, every run goes deeper (Furniture from run ~5), gain keeps growing.
In an 18-run sim late runs hit the 90-min cap with ~230 Seeds/run — that plateau is where Research 2.0 and the second prestige tier come in.

## 3. Follow-ups
* **v2.19 Research 2.0** (below).
* **Biomes per Legacy tier** (Pine valley → Birch lakes at L 100 → Redwood coast at L 1000): cosmetic palette + one unique line each.
* **Second prestige "Timber Dynasty"** at L ≈ 5000: converts Legacy into Dynasty crowns (log curve) that multiply the Legacy exponent; resets the shop.
* Seed Shop: offline-cap item, auto-buyer item, "keep one manager tier".

## 4. Research 2.0 plan (v2.19) — shipped, see `docs/research-v2.19.md`

**Audit.** 15 nodes, 27,075 RP in total. The lab starts ~55 min into a fresh run, 13/15 nodes are done by ~140 min, the last two only need
5 + 10 Seeds. Research persists through Replant, so the whole tree is finished by run 2 and never matters again.

**Decision: research keeps persisting through Replant** (it is the long, slow track; Replant is the fast loop). They interlock instead of overlapping:
* Replant gives *multipliers & head-starts*; Research gives *new mechanics and qualitative unlocks* (auto-sell rules, line tiers, logistics, offline).
* **Tiers gated by Legacy**: T1 (now) · T2 at L 25 · T3 at L 150 · T4 at L 800 · T5 after the second prestige. Some nodes gated by milestones (any line Lv 200, 10 harbour routes…).
* ~60 nodes in 5 branches (Forestry, Milling, Craft, Logistics, Science) × 5 tiers.
* **RP cost scales with progress**: `rp = base · 2.2^tier · (1 + 0.06·nodesDone)`; RP stays the pacing resource (lab output grows with Legacy^0.3 only).
* **Repeatable late nodes** ("Refined sawing I…∞"): +5 % each, cost ×1.6 per level, effect with diminishing returns (`1 + 0.05·n^0.7`).
* Seeds are no longer spent in research (no conflict with the Seed Shop).
* **Sim target**: after 5 runs (~2.5 h) ≤ 35 % of non-repeatable nodes; after 15 runs ≤ 70 %; tree never "complete" thanks to repeatables.
* Migration: done v2.18 nodes stay done and map to their T1 equivalents.
