[![make.fun](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/takhao666/gta6-cover-art-v2/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/takhao666/gta6-cover-art-v2/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

# Vice City Nights — GTA-style Cover Art Maker

An offline browser web app that turns your photo and a caption into GTA 6-style cover art: the multi-panel poster look, bold caption lettering and a Vice City sunset or neon grade, exported as a PNG to share.

**Try it:** serve `app/` with any static server (`node serve.ts` → http://localhost:8081) and open `app/index.html` in desktop Chrome. No network requests, no uploads — photos never leave your machine.

## What it does

- **6 layouts** — Four Panel Grid, Hero And Three, Full Bleed, Tilted Snapshots (rotated white-bordered cards on a sunset sky), Nine Panel, Split Duo.
- **5 grades** — Sunset, Neon Nights, Vice Pink, Noir, Original. Overlay / soft-light washes plus seeded film grain and a vignette.
- **Lettering** — Title in Anton, Bebas Neue or Pacifico (shipped under the SIL Open Font License), 5 colours including a sunset gradient, outline + shadow, adjustable tilt; Pacifico subtitle, an optional Vice City Nights ribbon and a 5-star heat meter.
- **Any photo** — Upload several photos from your machine or use the two built-in samples. Fill all panels with one photo or one photo per panel. Crop each panel with zoom / pan sliders, by clicking a panel and dragging it, or with the scroll wheel.
- **Undo / redo** — 60-step history (Ctrl+Z / Ctrl+Y).
- **Export** — PNG in 1080×1080, 1080×1350 and 1920×1080, one at a time or all three at once.

An original design: no Rockstar Games logo, artwork, character or font anywhere.

## Layout

- `app/` — the static app (`index.html`, `style.css`, `src/` modules, `fonts/`, `samples/`).
- `screenshots/` — screenshots taken with headless Chromium (see `shots.json`).
- `main.ts` — the entry program: copies `app/` and `screenshots/` to `/output` and writes `/output/dossier.json`.
- `serve.ts` — a tiny static server for local tries.
- `vendor/makefun-app.ts` — make.fun's dossier library, unchanged.

## License

MIT — see [LICENSE](LICENSE). Fonts under `app/fonts/` are licensed under the SIL Open Font License 1.1 (`app/fonts/OFL.txt`).
