# Baton Rouge · River Pilot

Pilot an 80-knot turbine fanboat along a mapped, approximately 64.3 km reach of the Mississippi River around Baton Rouge.

**[Play River Pilot](https://ganeshakeymichael.github.io/river-pilot/)**

The game includes mapped terrain and aerial imagery, Baton Rouge landmarks, river traffic, weather, an anchor, and floating stunt ramps. It runs in a modern desktop browser with WebGL. The first load downloads the terrain and imagery; allow a moment for the river to appear.

## Controls

| Action | Key |
| --- | --- |
| Accelerate | Space |
| Reverse power | Ctrl + Space |
| Steer | Left / Right arrows |
| Change power stage | Up / Down arrows |
| Slow down | X |
| Drop / raise anchor | H, below 4 knots |
| Change camera | C |
| Pause | P / Escape |
| Recover to the channel | R |

Choose **Take the helm** for the voyage, **Free exploration** for downtown, or a landmark from **Explore a Location**. Choose **Jump ramps · practice approach**, shift up twice, and hold Space to try a jump.

## Hosting and source notes

This repository is the static web edition. GitHub Pages publishes `main` from the repository root. Keep all files together and retain `.nojekyll`. No API keys, accounts, or server-side code are required to play.

The game is a geographic reconstruction, with simplified landmark models and simulated handling, weather, currents, and water levels. It is not a photographic copy or a navigation tool. Stunt ramps are fictional.

See [README.txt](README.txt) for the full controls, geographic sources, modeling limits, and third-party license information. Google Maps was used for visual study only; no Google imagery is included.

## Shoreline and terrain detail (2.4)

Hull contact now uses the same mapped water polygons as the visible river, including islands and bank protrusions. The downtown terrain patch adds a 2 m USGS 3DEP export within a bounded 5 km north-south area. Other areas retain the earlier elevation grid. Historical data and a fixed gameplay water stage still limit current-day shoreline accuracy; this is not a survey or a live flood-stage model.

See [terrain-detail-provenance.json](terrain-detail-provenance.json) for exact coverage, source requests, datum, catalog evidence and edge treatment, and [validation.md](docs/validation.md) for completed checks and remaining visual QA.

Run regression checks from the repository root with `node tests/run.cjs`. No npm dependencies are needed. To reproduce the terrain patch, run `python tools/fetch-terrain-detail.py ../terrain-detail-source` (requires NumPy and Pillow), then `node tools/build-terrain-detail.cjs ../terrain-detail-source`. The live USGS mosaic can change; compare its downloaded SHA256 with the recorded source hash before claiming an identical rebuild. After editing web assets, run `node tools/update-web-manifest.cjs`.
