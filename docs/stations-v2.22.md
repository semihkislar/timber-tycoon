# v2.22 — Leveled upgrades + building workstations (design)

Semih (translated): **(1)** "Let's do the upgrade part with levels." **(2)** "Factories should have extra upgrade areas
inside — e.g. the plank place has 3 workbenches and we can't progress without upgrading one of them."

## 1. Leveled upgrades (interpretation of idea 1)

The Upgrades sheet used to sell 27 one-time purchases. In v2.22 every upgrade is a **levelled line, Lv 0 → N**:

* **Lv 1 is exactly the old upgrade** (same price, same unlock, same effect), so an owned upgrade migrates to **Lv 1**
  with nothing gained or lost.
* Higher levels strengthen the same effect: the Lv-1 bonus is scaled by `g(L) = 1 + 0.3·(L−1)`.
  * multipliers: `×f` → `×(1 + (f−1)·g)`, e.g. Sharper Axes ×2 → ×2.3 → ×2.6 → ×2.9 → ×3.2;
  * reductions: Smoke Detectors −25 % → −32.5 % → −40 % (floored at −80 % per line);
  * additive: Ambidextrous Chopping 2 % → 2.6 % → 3.2 % …
* **Max level**: 5 for most lines; 3 for the fire-safety lines (Smoke Detectors, Sprinkler System); 1 for the on/off
  line Sawdust Recovery (it unlocks a by-product, there is nothing to scale).
* **Cost** of level L: `base × 8^(L−1) × forest value (cs)`.
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

Level L of a workstation costs `3 × (the building's level cost at WS_LV[L]) × forest value`, with
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

(filled in after the sim and perf runs)
