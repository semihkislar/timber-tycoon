# Timber Tycoon

Isometric lumber factory idle game: a static multi-file web app (no bundler).

- Play: https://semihkislar.github.io/timber-tycoon/
- All versions: https://semihkislar.github.io/timber-tycoon/versions.html
- Changelog: [CHANGELOG.md](CHANGELOG.md)

## Layout (since v2.8)
- `index.html`: slim shell (markup + ordered `<script>` list)
- `css/style.css`: styles
- `js/*.js`: game code as ordered classic scripts sharing one global scope (order = the script list in `index.html`)
- `assets/`: pre-rendered sprite atlases (`atlas-trees.png` + `.json`)
- `releases/`: every release. v1.0–v2.7 are single HTML files; v2.8+ are folder snapshots `releases/vX.Y/`
- `tools/`: build, profiling and release scripts
- `test/`: Playwright suites (served over HTTP automatically via `test/_server.py`)

## Workflow
- Run locally: `python3 -m http.server` in the repo root, then open http://localhost:8000/ (module-free, but needs http:// for the atlas fetch).
- Edit `js/`, `css/` and `index.html` directly. There is no build step for the game itself.
- After changing tree art, rebuild the atlas: `python3 tools/build_assets.py`
- Tests: `python3 test/v28.py` (plus the older `test/v*.py` and `test/functional.py`). Balance: `python3 test/balance.py`
- Perf: `python3 tools/bench.py <url>` (frame cost), `python3 tools/profile.py <url> out.json [realSec] [gameSecPerSec]` (long session: heap, GC, DOM), `python3 tools/cpuprof.py <url>`
- Release: bump `VERSION` in `js/logic_a.js`, update CHANGELOG, `python3 tools/release.py` (snapshot to `releases/vX.Y/` + `versions.html`), commit, tag, push. GitHub Pages serves the repo root.
