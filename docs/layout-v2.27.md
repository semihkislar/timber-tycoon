# Factory layout (v2.27)

Item 7 of Semih's Oct 20 list: "each phase's factories in vertical columns that extend downward, new factories at the bottom of
their column, helper buildings on the right, everything else in production-chain order".

## Grid
`P(i,j)`: screen x = (i−j)·32, y = (i+j)·16. Lane coordinates: **u = i+j** runs down the screen, **v = i−j** runs across it (the
lane is v = 0, right of the lane is v > 0).

| Column | v | Slots (u, top → bottom) |
|---|---|---|
| Phase 3 (own fenced row, `PROW`) | −17.6 | Atelier 20.3 · Parquet 27.2 · Stationery 34.1 · Cabinets 41.0 · Showroom 48.4 |
| Phase 2 (`mkLot(..,'L')`) | −6 | Carpentry 18 · Pellet Press 28 · Paper Mill 38 · Furniture 48 |
| Phase 1 (`mkLot(..,'R')`) | +6 | Sawmill 18 · Chipper 28 · Kiln 38 · **Veneer Peeler 48** (was u 8.75, above the Sawmill) |
| Helper strip (`HSTRIP`) | ≈ +10 … +17 | Fire Station 11.6 · R&D campus ~18 (Power plant beside it, v ≈ 28) · **Contract Office 25.1** · **Builders' Yard 33** · **Shipping dock 42** |

Feeders sit straight across the lane: Sawmill ↔ Carpentry (planks), Chipper ↔ Pellet Press (chips), Peeler ↔ Furniture (veneer).

## Moved things and how they follow
- `DOCK` (27,21 → 27,15). `dk(i,j)` shifts the old dock-relative points: truck bay `DOCKB`, apron and bay stripes, dock hand,
  staff spots `SW_FORK`/`SW_DOCK_*`, night glow. Dock forklifts drop at `dockDrop()` through the Kiln–Peeler aisle (u ≈ 43–44).
- `BYZ` (Builders' Yard): the art is still authored at its old coordinates (`BYZ0`) and drawn with a canvas translate (`byShift`).
  `P` is linear, so this is exact. The crane mast is `BY_CR`, and `byP()` is used for lights.
- `OFFICE`/`OFFB` (Contract Office): the box and courier route are relative to `OFFICE.ci/cj`.
- Town Market vans: in and out through the south end of the lane (`MKT_LANE_END`), outer and inner lane sides.
- The ground strip is `hStrip()`: paved (`yardTile`, `zoneAt`) and tree-free (`isForestPt`).

## Not saved
Positions are never saved. Saves keep levels only, so a layout change needs no migration.

## Next (v2.28)
The highway (i ≈ 30–32) runs just below the Phase 1 column. Before new production buildings can go at the bottom of the
columns (u ≥ 58), the yard has to grow south: move the highway / dock road east or add a bridge. Then extend `yardTile`,
`laneTile`, `CAM_WORLD`, the fit view and the chips.
