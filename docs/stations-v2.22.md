# v2.22 — Leveled upgrades + building workstations (design)

Semih (translated): **(1)** "Let's do the upgrade part with levels." **(2)** "Factories should have extra upgrade areas
inside — e.g. the plank place has 3 workbenches and we can't progress without upgrading one of them."

## 1. Leveled upgrades (interpretation of idea 1)

The Upgrades sheet used to sell 27 one-time purchases. In v2.22 every upgrade is a **levelled line, Lv 0 → N**:

* **Lv 1 is exactly the old upgrade** (same price, same unlock, same effect), so an owned upgrade migrates to **Lv 1**
  with nothing gained or lost.
* Higher levels strengthen the same effect: the Lv-1 bonus is scaled by `g(L) = 1 + 0.1·(L−1)` (tuned down from 0.3 by the pacing sim, §7).
  * multipliers: `×f` → `×(1 + (f−1)·g)`, e.g. Sharper Axes ×2 → ×2.3 → ×2.6 → ×2.9 → ×3.2;
  * reductions: Smoke Detectors −25 % → −32.5 % → −40 % (floored at −80 % per line);
  * additive: Ambidextrous Chopping 2 % → 2.6 % → 3.2 % …
* **Max level**: 5 for most lines; 3 for the fire-safety lines (Smoke Detectors, Sprinkler System); 1 for the on/off
  line Sawdust Recovery (it unlocks a by-product, there is nothing to scale).
* **Cost** of level L: `base × 12^(L−1) × forest value (cs)`.
* **Unlocks**: Lv 1 keeps the old requirement. Lv 2+ also need the thing the upgrade is about:
  * collector / planter lines: 15 / 30 / 60 / 100 owned for Lv 2 / 3 / 4 / 5;
  * building lines: that building at Lv 25 / 50 / 100 / 200;
  * "all buildings" lines: 5 / 7 / 9 / 11 buildings built;
  * chopping lines: 200 / 600 / 1 500 / 4 000 taps this run.
  The card shows the next requirement when it is not met ("Lv 3 needs Lumberjack ×30").
* The card shows **Lv X/N**, the effect now → next level, and the next cost. Upgrades reset on Replant (as before).
* Trophy "Fully Tooled" still means "own every upgrade" (Lv ≥ 1 on every line).

## 2. Workstations (idea 2)

Every production building (all Phase 1/2/3 buildings, the Plywood Mill, Toy Workshop and Boat Yard — not the R&D Lab)
has **three internal workstations**. Each has its own level (0 → 10) and one effect:

| kind | effect per level | at Lv 10 |
|---|---|---|
| ⚙️ speed | +5 % building speed | ×1.5 |
| 📦 yield | +4 % output per batch | ×1.4 |
| 🌲 input | −3 % input per batch | −30 % |
| 💎 quality | +5 % sale price of the building's product | ×1.5 |

Examples: **Sawmill** — Debarker (input), Bandsaw (speed), Edger & Planer (yield).
**Carpentry** — Cutting Bench (input), Joinery Bench (speed), Finishing Bench (quality).
(Full table in `js/stations.js`.)

### Milestone gates

A building cannot be levelled past a milestone until one of its workstations is good enough:

| pass Lv | needs |
|---|---|
| 25 | station 2 (the speed station, e.g. Bandsaw) Lv 2 |
| 50 | station 1 Lv 3 |
| 100 | station 3 Lv 4 |
| 200 | station 2 Lv 6 |
| 400 | station 1 Lv 8 |

So a Sawmill stops at **Lv 25** with "🔒 Bandsaw Lv 2 needed" on its Upgrade button until the Bandsaw is levelled.
Purchases (×1/×10/Max, lot taps, Builders' Yard) are clipped at the cap; nothing is lost.

### Costs

Level L of a workstation costs `1 × (the building's level cost at WS_LV[L]) × forest value`, with
`WS_LV = [–, 10, 25, 50, 100, 150, 200, 300, 400, 500, 600]` — i.e. about three building levels at the milestone it
unlocks. This keeps the gates meaningful (a real purchase decision, a visible step) but never a wall: the station needed
for a gate always costs about as much as three levels the player is about to buy anyway, and it pays back through its
own bonus. Costs scale with the run's forest value (Replant 2.0), exactly like building levels.

### Replant, research, specialisations, staff

* Workstation levels **reset on Replant** like building levels (they are part of the building).
* They are separate multipliers in `bSpeed`, `bOutMult`, `bInMult` and `computeMods().price`, so research,
  specialisations (v2.17), managers and staff stack with them unchanged. Specialisation picks happen at Lv 50/100/200
  as before — the gates just sit in front of those levels.
* **Builders' Yard**: when its crew reaches a gated cap it fits the required workstation level (from the same budget)
  instead of stalling.

### UI (mobile first)

* The building sheet gets two tabs: **Overview** (the old sheet) and **🛠 Workstations**.
* Workstations tab: a small isometric interior (three benches whose height/colour show their level, the next gate
  highlighted), then one card per station: icon, name, **Lv X/10**, effect now → next, cost button.
  The next gate is spelled out: "Pass Lv 25: Bandsaw Lv 2".
* When the building is at its cap the Upgrade button reads "🔒 Bandsaw Lv 2" and opens the Workstations tab.
* Scene: a gated building's level tag shows a 🔒.

### Old saves

Saves before v2.22 have no workstations. On load every building gets, **for free**, the minimum workstation levels its
current level needs (a Lv 120 Sawmill gets Bandsaw 2, Debarker 3, Edger 4), so nothing that was owned is blocked.
Owned upgrades become Lv 1.

### Pacing check

`test/sim_v222.js` (bot run, same seed, v2.21.1 vs v2.22): no soft-lock (every gate is passed), time held at a gate,
income at 10/20/40/60 min, plank flow (planks made ≥ planks used). Results in §7.

## 7. Results

### Tuning the sim forced
* **Upgrade levels:** the first draft used `g(L)=1+0.3·(L−1)` and ×8 cost per level. In a 120-min greedy sim that made
  v2.22 earn **4.3×** what v2.21.1 earns (upgrade levels stack multiplicatively). Raising the cost growth barely helped,
  because late income dwarfs early upgrade prices. The fix was a smaller step: **`g(L)=1+0.1·(L−1)`**, cost **×12** per level.
  A ×2 upgrade is ×2.1 at Lv 2 and ×2.4 at Lv 5; "−25% risk" goes to −30% at Lv 3.
* **Station cost:** the first draft used 3× the building's level cost at `WS_LV[L]`. That held the Sawmill at Lv 25 for
  about 6 extra minutes in the first half hour, so I lowered it to **1×**. One gate now costs about the price of one or
  two more building levels.
* **Levels already past a gate are never lost.** A gate below a building's current level counts as passed. That covers
  levels set directly (old saves, dev tools); old saves also get the free minimum station levels.

### Pacing sim (`test/sim_v222.js`, greedy cheapest-first player, median of 4 runs, 90 min, fresh game)
| min | v2.21.1 earned | v2.22 earned | ratio |
|---|---|---|---|
| 10 | 4.5e5 | 3.7e5 | 0.83 |
| 20 | 5.2e6 | 4.0e6 | 0.78 |
| 40 | 9.2e7 | 8.0e7 | 0.87 |
| 60 | 7.1e8 | 8.5e8 | 1.20 |
| 90 | 2.7e9 | 3.8e9 | 1.39 |

With the 1.5× station cost, the same sim gave 0.88 / 0.96 / 1.01 / 1.03 / 1.25. The sim varies by about ±20% from run to run
(chops, events and weather are random). In the first ~40 min, v2.22 runs 10–20% behind because the greedy player spends on
upgrade levels and stations. After that, their bonuses pay it back.

* **No soft-lock in any run:** 0 failed purchases, and the longest stretch without a buy was 18–38 s.
* **Gates are felt but are not walls.** The first Sawmill gate (Lv 25 → Bandsaw Lv 2) arrives about 3 min later than the
  Lv 26 did in v2.21.1. Later Lv 26/51 milestones come 6–11 min later, because the greedy player now also spends on upgrade
  levels and stations. Income is within about 20% early on, and v2.22 pulls ahead after about 50 min (upgrade levels,
  station bonuses).
* **Plank flow stays healthy:** consumers get 96–100% of the planks they want (v2.21.1: 97.5–100%), and shortage warnings
  stay ≤ 2.3% of the time.

### Perf (`tools/bench.py`, ms per frame, avg / p95)
| scene | v2.21.1 | v2.22 |
|---|---|---|
| day-fit | 13.4 / 17.3 | 13.2 / 18.4 |
| day-zoom | 9.6 / 12.7 | 9.7 / 12.8 |
| night-fit | 18.2 / 24.6 | 17.3 / 21.3 |
| night-zoom | 11.9 / 14.2 | 12.2 / 16.3 |

These are within run-to-run noise. Workstation effects are three multiplies per building per tick, and the interior
canvas is only drawn when a level changes.

