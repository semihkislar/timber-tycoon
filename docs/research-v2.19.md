# Research 2.0 (v2.19)

Companion to `docs/replant-v2.18.md`. Code: `js/research.js`. Tests: `test/v219.py` (+ `test/sim_v219_hook.js`).

## Audit (v2.18 and earlier)
* 15 nodes, 27,075 RP in total. The lab started ~55 min into a fresh run; 13/15 nodes were done ~140 min in; the last two only asked for 5 + 10 Seeds.
* Research persists through Replant, so the tree was finished in run 2 and never mattered again.
* Seeds were spent in research, competing with the Replant bonus (and, since v2.18, with the Seed Shop).

## Design
**Research persists through Replant** (nodes and unspent RP). It is the slow, permanent track; Replant is the fast loop.
They interlock without overlap:
* Replant gives multipliers and head-starts (Seed Shop); Research gives building/branch-specific boosts and mechanics
  (glue, Plywood Mill, Toy Workshop, Boat Yard, +offline hours, power-plant boost, order pay, trade speed).
* **Tiers open with Forest Legacy:** I always · II at 25 · III at 150 · IV at 800 · V at 2500 **and** a line at Lv 200.
* **Milestone gates** on single nodes: Aerial Survey (own a Drone Fleet), Old Growth (20K saplings planted, lifetime),
  Lab Network (Research Lab Lv 25), Laser Grading (Sawmill Lv 100), Upholstery (Furniture Factory built), Atelier Methods (Premium Area open),
  Pallet Standards (harbour built), Container Port (harbour Lv 3).
* **Cost** = base × tier factor (I ×1 · II ×2 · III ×3 · IV ×5 · V ×6) × (1 + 0.06 × non-repeatable nodes done).
* **Repeatable ♾️ nodes** (one per branch, Tier IV): cost ×1.6 per level, effect +5 % × level^0.7 (Market Reach +4 % × level^0.7) — diminishing.
* **RP pacing:** RP/s = lab speed × 0.04 × rep^−0.7, i.e. the lab only feels ~Legacy^0.3 of your Replant power. The lab is cheaper (500K instead of 3M,
  scaled by the run's forest value) so it appears in run 1.
* **No Seeds** in research. Migration: nodes already researched stay done (even above the new gates); the Seeds once paid for
  Automation (5) and Masterworks (10) are refunded to the Seed Shop wallet. For v2.17 saves those Seeds also count toward the Legacy (v2.18 rule).
* UI (mobile first): lab card, progress bar with the next tier gate, 5 branch chips (≥ 44 px, ready dot), tier sections with
  lock reasons, node rows ≥ 44 px; tapping a row opens its detail inline with the Research button.

## Pacing sim (test/v219.py: greedy player, saves for the lab, researches the cheapest open node)
| run | min | Legacy | nodes done |
|---|---|---|---|
| 1 | 25 | 0 | 2 % |
| 5 | 14 | 16 | 6 % |
| 6 | 23 | 20 | 13 % |
| 8 | 21 | 45 | 21 % |
| 10 | 38 | 103 | 29 % |
| 12 | 38 | 233 | 42 % |

(A 15-run sim reaches 66 %; Tier IV/V and the repeatables carry it much further.) Targets: ≤ 35 % after 5 runs ✔, research started by run 6 ✔, < 80 % after 12 runs ✔.

## Nodes

### 🔬 Science
| tier | node | base RP | needs | effect |
|---|---|---|---|---|
| I | 🔬 Wood Science | 5 | — | Research Lab +25 % RP |
| I | 🧯 Fire Science | 60 | Wood Science | Fire risk −20 % |
| I | 🦾 Lab Robotics | 900 | Fire Science | Research Lab +50 % RP |
| II | 🌙 Night Shift | 5.00K | Lab Robotics | Offline earnings cap +2 h (8 h → 10 h) |
| II | ⚡ Grid Tuning | 6.00K | Lab Robotics | Power Plant boost +25 % |
| II | 📑 Peer Review | 8.00K | Night Shift, Grid Tuning | Research Lab +40 % RP |
| III | 🖥️ Process Simulation | 27.0K | Peer Review | Every building +12 % |
| III | 📡 Remote Control Room | 30.0K | Peer Review | Offline earnings cap +4 h |
| III | 🧠 Lab Network | 36.0K | Process Simulation · Research Lab Lv 25 | Research Lab +60 % RP |
| IV | 🔌 Smart Grid | 150K | Lab Network | Power Plant boost +50 % |
| IV | ⚗️ Material Science | 175K | Lab Network | Every building +20 % |
| IV | ♾️ Applied Research ♾️ | 200K | Material Science | Every building +5 % × level^0.7 (repeatable) |
| V | 🌌 Unified Wood Theory | 1.50M | Smart Grid, Material Science | All production ×1.3 |

### 🌲 Forestry
| tier | node | base RP | needs | effect |
|---|---|---|---|---|
| I | 🌰 Seed Bank | 25 | Wood Science | Saplings grow 20 % faster |
| I | 🪓 Felling Physics | 120 | Seed Bank | Collectors +15 % |
| I | 🧬 Tree Genetics | 1.50K | Felling Physics | Saplings grow 30 % faster and every grown tree yields +20 % logs |
| II | 🍄 Mycorrhiza | 5.00K | Tree Genetics | Every grown tree yields +25 % logs |
| II | 🦺 Crew Ergonomics | 6.00K | Tree Genetics | Collectors +25 %, chopping ×2 |
| II | 🛰️ Aerial Survey | 9.00K | Crew Ergonomics · own a Forest Drone Fleet | Drone Fleets & Sky-Cranes +50 % |
| III | 🌱 Clonal Forestry | 27.0K | Mycorrhiza | Saplings grow 40 % faster |
| III | 🎯 Precision Felling | 33.0K | Aerial Survey | Collectors +40 % |
| III | 🌳 Old Growth | 39.0K | Clonal Forestry · 20K saplings planted (lifetime) | Every grown tree yields +30 % logs |
| IV | 🤖 Canopy Robotics | 160K | Precision Felling | Collectors +50 % |
| IV | 🪱 Living Soil | 170K | Old Growth | Saplings grow 30 % faster, trees yield +30 % |
| IV | ♾️ Forest Yield ♾️ | 200K | Canopy Robotics | Collectors +5 % × level^0.7 (repeatable) |
| V | 🏞️ Eternal Forest | 1.50M | Canopy Robotics, Living Soil | Saplings grow ×2, trees yield ×1.5 |

### 🪚 Milling
| tier | node | base RP | needs | effect |
|---|---|---|---|---|
| I | 🪚 Carbide Blades | 30 | Wood Science | Sawmill & Wood Chipper +15 % |
| I | 🍯 Pine Tar Glue | 40 | Wood Science | Charcoal Kilns also distil glue (½ per charcoal) |
| I | 🧪 Pulp Chemistry | 30 | Wood Science | Paper Mill +15 % |
| I | 🟧 Plywood Mill | 120 | Pine Tar Glue | Unlocks the Plywood Mill (planks + glue → plywood) |
| I | 🌡️ Kiln Science | 500 | Plywood Mill | Kiln & Pellet Press +15 %, fire risk −30 % |
| II | 🔪 Thin-kerf Saws | 5.00K | Carbide Blades | Sawmill +30 % |
| II | 🌀 Pressure Refiner | 6.00K | Kiln Science | Wood Chipper & Pellet Press +30 % |
| II | 🛢️ Black Liquor | 7.00K | Pulp Chemistry | Paper Mill +30 % |
| III | 🔦 Laser Grading | 30.0K | Thin-kerf Saws · Sawmill Lv 100 | Sawmill & Plywood Mill +40 % |
| III | ⚫ Biochar Retorts | 33.0K | Pressure Refiner | Charcoal Kiln +50 %, charcoal sells +20 % |
| III | 📜 Twin-wire Paper | 36.0K | Black Liquor | Paper Mill +50 % |
| IV | 🏭 Robotic Mill | 160K | Laser Grading | Sawmill, Chipper, Kiln, Pellet Press & Paper Mill +50 % |
| IV | 🧊 Cold Press | 170K | Twin-wire Paper | Plywood Mill +60 % |
| IV | ♾️ Throughput ♾️ | 200K | Robotic Mill | Primary mills +5 % × level^0.7 (repeatable) |
| V | ♻️ Zero-waste Mill | 1.50M | Robotic Mill, Cold Press | All mills ×2 |

### 🪑 Craft
| tier | node | base RP | needs | effect |
|---|---|---|---|---|
| I | 🪑 Steam Bending | 150 | Carbide Blades | Carpentry & Furniture Factory +15 % |
| I | 📐 Joinery Jigs | 300 | Steam Bending | Carpentry +20 % |
| I | 🧸 Toy Workshop | 600 | Plywood Mill | Unlocks the Toy Workshop (plywood + paper → wooden toys) |
| II | 🤖 Automation | 6.00K | Steam Bending, Toy Workshop | Every building +10 % |
| II | ⛵ Boat Yard | 6.00K | Toy Workshop | Unlocks the Boat Yard at the harbour (plywood + planks + glue → boats) |
| II | 🛋️ Upholstery | 7.00K | Joinery Jigs · Furniture Factory built | Chairs & Furniture Sets sell +25 % |
| III | 🏆 Masterworks | 30.0K | Automation, Boat Yard | Plywood, toys, boats & luxury goods sell +25 % |
| III | 🎨 Atelier Methods | 33.0K | Upholstery · Premium Area open | Premium buildings +40 % |
| III | 🪀 Toy Line | 36.0K | Masterworks | Toy Workshop & Boat Yard +50 % |
| IV | 🛠️ CNC Workshop | 160K | Atelier Methods | All craft buildings +50 % |
| IV | ✍️ Signature Pieces | 170K | Toy Line | Premium & tech goods sell +30 % |
| IV | ♾️ Craftsmanship ♾️ | 200K | CNC Workshop | Craft buildings +5 % × level^0.7 (repeatable) |
| V | 👑 Heritage Brand | 1.50M | CNC Workshop, Signature Pieces | Premium & tech goods sell ×1.5 |

### ⚓ Logistics
| tier | node | base RP | needs | effect |
|---|---|---|---|---|
| I | 📊 Market Research | 150 | Pulp Chemistry | All sell prices +5 % |
| I | 📋 Order Desk | 250 | Market Research | Client orders & daily contracts pay +20 % |
| I | ⚓ Trade Logistics | 450 | Market Research | Trade payouts +20 %, trips 20 % faster |
| II | 📦 Pallet Standards | 5.00K | Trade Logistics · Harbour built | Trade payouts +15 %, trips 15 % faster |
| II | 🤝 Bulk Contracts | 6.00K | Order Desk | Client orders & daily contracts pay +30 % |
| II | 📈 Price Analytics | 7.00K | Order Desk | All sell prices +8 % |
| III | 🏗️ Container Port | 30.0K | Pallet Standards · Harbour Lv 3 | Trade payouts +30 % |
| III | 🚂 Rail Spur | 33.0K | Pallet Standards | Trips 20 % faster |
| III | 🏷️ Brand Agency | 36.0K | Price Analytics | All sell prices +12 % |
| IV | 🌐 Global Network | 160K | Container Port | Trade payouts +50 % |
| IV | 💹 Futures Desk | 170K | Brand Agency | All sell prices +15 % |
| IV | ♾️ Market Reach ♾️ | 200K | Futures Desk | All sell prices +4 % × level^0.7 (repeatable) |
| V | 🌍 World Exchange | 1.50M | Global Network, Futures Desk | All prices ×1.4, trade payouts ×1.4 |
