# Timber Tycoon

Isometric lumber factory idle game: a static multi-file web app (no bundler).

- Play: https://semihkislar.github.io/timber-tycoon/
- All versions: https://semihkislar.github.io/timber-tycoon/versions.html
- Changelog: [CHANGELOG.md](CHANGELOG.md)

## Layout (since v2.8)
- `index.html`: slim shell (markup + ordered `<script>` list)
- `css/style.css`: styles
- `js/*.js`: game code as ordered classic scripts sharing one global scope (order = the script list in `index.html`)
- `assets/`: pre-rendered sprite atlases (`atlas-trees.png` + `.json`) and PWA icons (`icon-*.png`)
- `js/input.js` (v2.9): camera + pointer/touch gestures (pan momentum, pinch, double-tap, rubber band, fly-to, hit areas)
- `js/mobile.js` (v2.9): mobile UI (quick-jump chips, needs-attention, auto-focus, More overflow, draggable sheets, compact HUD, hold-to-repeat/Buy max, haptics, landscape rail, SW registration)
- `js/power.js` + `js/scene12.js` (v2.10): biomass power plant (sim, sheet UI) and its isometric scene (plant, cooling tower, chimneys, silos, power line)
- `js/flow.js` (v2.16): Supply flow view (isometric producer → consumer arcs with rates and health colours, 🔀 button / F key)
- `js/shipping.js` (v2.13): Shipping Yard (loading bays, departures, export contracts, dock/forklift/crane upgrades, sheet UI)
- `js/forestveh.js` (v2.13): cached forest machines (harvester, forwarder, skidder) with lights
- `js/staffsys.js` (v2.14): staff system — roles, wages, rotating candidates, training, assignment, light fatigue; managers migrate to founding foremen
- `js/staffworld.js` (v2.15): staff in the world — hired staff walk and work in their area (cached role-coloured sprites, draw cap), campfire breaks, tap a worker → Team card, 📍 on a card → camera
- `js/builders.js` + `js/scene13.js` (v2.12): Builders' Yard (construction crews that auto-upgrade buildings: plans, budget, sheet UI) and its scene (yard, crane, crew trucks, scaffolding)
- `js/chimney.js` (v2.10.1): shared high-quality chimney renderer (square + round stacks seated on roofs, cached sprites) and the soft layered smoke puffs
- `js/facade.js` (v2.11): factory facelift helpers — plank/brick/metal walls, shingle/tile/corrugated roofs, framed windows, roller doors, contact shadows, level-tier extras, and stock-yard goods with quantised fill steps
- `manifest.webmanifest` + `sw.js` (v2.9): installable PWA; the service worker is network-first for everything and ignores `releases/`
- `releases/`: every release. v1.0–v2.7 are single HTML files; v2.8+ are folder snapshots `releases/vX.Y/`
- `tools/`: build, profiling and release scripts
- `test/`: Playwright suites (served over HTTP automatically via `test/_server.py`)

## Workflow
- Run locally: `python3 -m http.server` in the repo root, then open http://localhost:8000/ (module-free, but needs http:// for the atlas fetch).
- Edit `js/`, `css/` and `index.html` directly. There is no build step for the game itself.
- After changing tree art, rebuild the atlas: `python3 tools/build_assets.py`
- Tests: `python3 test/v215.py` (staff in the world), `python3 test/v214.py` (staff system), `python3 test/v213.py` (shipping), `python3 test/v212.py` (builders), `python3 test/v211.py` (factory facelift), `python3 test/v2101.py` (fire station + chimneys), `python3 test/v210.py` (power plant), `python3 test/v29.py` (phone emulation, touch gestures) and `python3 test/v28.py` (layout + long-session perf), plus the older `test/v*.py` and `test/functional.py`. Balance: `python3 test/balance.py`
- Screenshots: `python3 test/shot.py` (desktop + feature shots, `ONLY=name` to filter) and `python3 test/shot_mobile.py` (phone portrait/sheet/jump/landscape), plus per-feature scripts such as `python3 test/shot_staff_v215.py`
- PWA icons: `python3 tools/build_icons.py` (from the in-game logo). When releasing, bump `CACHE` in `sw.js` to the new version.
- Phone UX rules (v2.9): ≥44–48 px touch targets, phones (≤720 px) show 5 bottom buttons + More, landscape phones (height ≤520 px) use the left rail + right side sheet; test both with `test/v29.py`.
- Perf: `python3 tools/bench.py <url>` (frame cost), `python3 tools/panbench.py <url> [label] [device]` (pan/pinch on a phone), `python3 tools/profile.py <url> out.json [realSec] [gameSecPerSec]` (long session: heap, GC, DOM), `python3 tools/cpuprof.py <url>`
- Release: bump `VERSION` in `js/logic_a.js` (and `CACHE` in `sw.js`), update CHANGELOG, `python3 tools/release.py` (snapshot to `releases/vX.Y/` + `versions.html`), commit, tag, push. GitHub Pages serves the repo root.
