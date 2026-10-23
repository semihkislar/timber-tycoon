# Layout v2.28: south yard and timber-frame line

Part 2 of item 7 (part 1: `layout-v2.27.md`).

## Grid
- `P(i,j)`: screen x = (i−j)·32, y = (i+j)·16, so u = i+j runs down the screen and v = i−j runs across it.

## Highway (`HWY={i0:31,ja:19,d:10,k:.894}`)
The road runs in three pieces:
1. North run: along j at i = 31, down to the river bridge (j = 19).
2. Diagonal: straight down the screen (v = 12), from (31,19) to (41,29).
3. South run: along j at i = 41.

Helpers:
- A lane line at lateral offset `o` is `hwI(j,o)`. Southbound lane: o = +.45; northbound lane: o = −.65; edges: ±.9; asphalt: ±1.
- On the diagonal, `o` is scaled by k = .894, so the road keeps its screen width.
- `hwOff(i,j)` is the inverse. Zoning uses it (|o| < 1 is road; forest is cleared for −3.4 ≤ o < 3.6).
- `hwSeg(o,j0,j1[,step])` gives a polyline with the corners. Pass `step` for `crPath`, so the spline hugs the corners.
- `hwAt(o,j0,d)` gives a point plus yaw by arc length (used for trains).
- The rail (offset `RAIL_I−31`) and its bridge follow the bend.

## South yard
- `yardTile` runs to u = 66, keeping a verge to the diagonal road (u ≥ 50 needs v ≤ 9.5). The lane runs to u = 65.
- **Beam Saw:** `mkLot(29,'R')` → (32,26), at the bottom of Phase 1.
- **Glulam Plant:** `mkLot(29,'L')` → (26,32), at the bottom of Phase 2, straight across the lane from the Beam Saw.
- Both are capped at bs ≤ 3.3, so they never reach the road band (v 11.1–12.9 on the diagonal).
- **South gate road** (`SGATE_J=32`, `sGate()`): runs along i from the lane end (i 31.6) to the highway. Market vans for the lane
  come in on its south side and leave on its north side.

## Phase 3 row
- **Timber-frame Houses:** `mkPLot('framer',55.6,2.6)`.
- The row end moved from u1 57 to 64, the dock from u 60 to 67.5, and the access road `PROAD_J` from 41.2 to 44.7.
- The access road meets the highway's south run (`hwI(PROAD_J,-1)`).
- Premium trucks and the client van come in on the northbound lane of the south run and leave north via `hwSeg`.
- The client parks relative to the dock (`PDOCK.ci+6.95`).

## Camera
- `CAM_WORLD.y1` is 1480.
- `fitCamera` frames down to y 1050 once `southYardBuilt()`.
