# Shoreline and terrain validation — October 28, 2026

Base: `ca4b37b8955847f732bfe1f0af2822627d7510a4`.

## Changes

- Shared indexed EBRGIS polygon geometry for visible water and full-hull collision. Checks include hull edges and enclosed islands, not only a few sample points. Ordinary navigation no longer uses a width-only invisible bank when mapped geometry is available. Anchor settling and ramp contact corrections also respect shore contact.
- A source-backed downtown terrain patch uses a 2 m export from USGS 3DEP. The 1 m source product `LA_2021GreaterNewOrleans_C22` and NAVD88 datum were verified in the catalog at the levee-lettering reference point. This point check does not certify one source across the entire mosaic.
- The patch covers land within 500 m of mapped water inside local X 400–2300, Z −3500–1500. It preserves the horizontal footprint. The first 3 m at the mapped shore retain existing heights, with a 17 m blend into source heights; export edges blend over 100 m. Water stays at the existing 4 m reference.
- Higher retained aerial detail, three-plane foliage, finer calm-water ripples, and protection against stale imagery callbacks following graphics-quality changes or tile eviction. Core imagery is capped at 3072 pixels, overview at 2048, and balanced at 1024, subject to the device limit.

## Automated evidence

Run `node tests/run.cjs`. For the source-raster comparison, additionally set `RIVER_DEM_SOURCE` to the downloaded terrain source folder.

- The new shoreline regression failed against the original physics, then passed with the fix.
- 10,000 deterministic map points match the original polygon containment algorithm.
- All sampled navigation positions at 25 m intervals along the route remain clear; twenty fast approaches to actual mapped banks remain in water.
- Controls, acceleration, speed caps, current, reverse, braking, high-speed contact, anchoring, ramp entry and SI-gravity flight regressions passed.
- Stale image success/error callbacks, texture disposal, and quality-specific resolution checks passed.
- Terrain geometry is finite, upward-facing and preserves horizontal land area. No detail triangles have centroids inside mapped water beyond 2 cm tolerance. Coincident vertex heights agree within approximately 0.000001 m. This is a numerical consistency check, not survey accuracy.
- Across 4,967 sampled land positions, mean absolute difference from the new source raster decreases from 0.4523 m to 0.0681 m. This measures raster interpolation fidelity; it does not measure error against ground truth.
- The final mesh contains 1,122,007 triangles. The detail patch replaces 18,480 triangles with 295,680 and adds roughly 7.2 MB of JavaScript asset data.

## Live checks and remaining work

The original public build entered free exploration with no browser errors. The first local improved build loaded, entered exploration, and displayed the downtown levee/riverwalk viewpoint without browser errors. A pre-existing Three.js deprecation warning remains.

Browser automation stopped responding during a later reload. Final visual approval of the revised water shader, performance with the final texture cap, mobile layout, weather/quality switching, and an end-to-end uninterrupted voyage remain pending. The change is therefore a draft for review, not a claim of completed photorealism or exhaustive playtesting.

The existing mapped water geometry was preserved; it has not been re-surveyed or redrawn to a single current river stage. Other reaches retain their original terrain resolution, and buildings, bridge details, vegetation volumes, currents and depth remain models. Replacing those approximations is further work.
