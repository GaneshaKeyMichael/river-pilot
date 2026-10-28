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
