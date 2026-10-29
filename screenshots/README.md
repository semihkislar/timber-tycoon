# Screenshots

- **[highlights/](highlights/)**: the curated images used by the main [README](../README.md). Refresh them with
  `python3 test/shot_highlights.py`, which also copies the overview shots to `history/v<VERSION>/`.
- **[history/](history/)**: release screenshots, one folder per version (`v1.0` … `v2.36`). Names are short, with no prefix
  and no version: `desktop.png`, `mobile.png`, `<feature>.png`, `desktop-<feature>.png` and `mobile-<feature>.png`.

Scripts should build paths with `test/shots.py` (`shot_path('desktop.png')`, `shot_dir('2.31')`, `highlight_path(...)`).
Never write screenshots into the repo root; `.gitignore` blocks root `*.png`. See [docs/DEVELOPMENT.md](../docs/DEVELOPMENT.md#screenshots).
