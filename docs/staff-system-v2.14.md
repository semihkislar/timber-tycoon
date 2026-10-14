# Staff system: design for v2.14 (planned)

Semih's feedback was "personel olayını çeşitlendirip bir kurgu olmalı". It asks for a real staff system, not just a rebalance. That is too big to ship safely alongside the v2.13 vehicles and shipping work, so it is split:

- **v2.13 (shipped):** an audit and a rebalance of the existing manager costs, plus a cost-vs-benefit line on every manager card.
- **v2.14:** the full staff system described below.

## Current design (v2.4–v2.13)
- **Workers:** collectors (lumberjack, chainsaw crew, truck, harvester, drone, helicopter) are bought in bulk. Each unit costs ×1.15 more. They have no wages, roles or skills.
- **Managers:** one named manager per building, with a rarity and one skill. They are kept through Replant.
  - Hire cost = building base cost × 1000 × rarity.
  - Level cost ×3.2 per level (v2.13: ×2.2) up to Lv 10. Seeds are needed from Lv 6 (v2.13: from Lv 7).
- **Firefighters:** the fire station is a building, not people.

### Problems found
1. Level costs grew ×3.2 per level while the benefit grew linearly (+1% speed, plus +2.5% × rarity for speed skills). Lv 10 cost about 35,000× the hire price for about +30% speed. That was a hard exponential wall. Fixed in v2.13 with ×2.2.
2. Rarer managers cost ×1.6, ×2.5 and ×4 more for only ×1.3, ×1.6 and ×2 more effect, so Legendary managers were the *worst* value per coin. Fixed in v2.13: cost now scales with rarity power.
3. The hire cost is tied to the building's *base* cost, not to its output. Cheap buildings get managers that pay back instantly; late buildings get managers that never pay back. v2.13 makes this visible with "≈ +X/s · pays back in T".
4. There is no ongoing cost, no choice and no roles. Hiring is a one-time "buy" button per building, which is why the system feels shallow.

## v2.14 staff system
**Roles.** Each role has a clear area effect:

| Role | Area | Effect per skill point |
|---|---|---|
| 🪓 Lumberjack | forest | +chop / collector output |
| 🚛 Driver | log trucks, forwarders, skidders | +log haul rate |
| 🏭 Mill worker | assigned building | +speed of that building |
| 🔧 Engineer | assigned building | −input use, −breakdowns (fires) |
| 🚜 Forklift operator | shipping yard | +loading (shLoadF), +contract progress |
| ⚓ Dock worker | shipping yard / harbour | +export premium, +truck capacity |
| 🚒 Firefighter | fire station | faster response, −fire risk |

**Candidates.** A rotating pool of 3–5 named candidates refreshes every few minutes, with a free reroll every 10 minutes. Each candidate has:
- a role
- a skill level of 1–5
- a rarity (Common, Rare, Epic, Legendary)
- 1–2 traits, for example *Night owl* (+20% at night), *Fast learner* (training ×2), *Steady* (no fatigue) or *Local hero* (+morale)

**Wages.**
- Each hire draws a wage in coins per second, shown next to their output as "costs 🪙 X/s → adds 🪙 Y/s". Wages scale with skill and rarity, never exponentially by headcount.
- Hiring itself is cheap, about one minute of the wage.
- If coins run out, staff keep working at 50%. Nobody is fired automatically.
- The staff panel shows total wages against total staff output as a profit bar.

**Training.** Spend coins plus training time (offline counts) to raise skill. The cost is roughly linear in level, with a soft cap at 10.

**Assignment.**
- Mill workers and engineers are dragged or tapped onto buildings. Each building has slots: 1, 2 at milestone ★2, 3 at ★4.
- Other roles go to their area automatically.

**Light fatigue.** There is no morale micromanagement. Each worker has an energy bar that slowly drains while working and refills at the campfire. Below 30% they work at 80%. The *Steady* trait and a canteen upgrade remove it. It can be switched off in Settings.

**Existing managers.**
- Each current manager becomes a named Legendary/Epic "Foreman" specialist, a mill worker assigned to its building.
- Their level maps to skill, ⌈lvl/2⌉ capped at 5, plus training progress. Their skill becomes a trait.
- Their wage is waived for life ("founding staff"), so no existing save gets an upkeep bill.

**Replant.** Unchanged, as requested. Staff and their training are kept. Upgrade and hire costs reset exactly as today. Wages restart from the first worker's level.

**Mobile.**
- The staff sheet gets tabs for Team, Candidates and Training.
- Cards have 44 px buttons.
- Assignment works through a "Assign → building list" bottom sheet rather than dragging.
