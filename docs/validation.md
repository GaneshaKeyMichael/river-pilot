# Shoreline and terrain validation — October 28, 2026

Base: `ca4b37b8955847f732bfe1f0af2822627d7510a4`.

## Changes

- Shared indexed EBRGIS polygon geometry for visible water and full-hull collision. Checks include hull edges and enclosed islands, not only a few sample points. Ordinary navigation no longer uses a width-only invisible bank when mapped geometry is available. Anchor settling and ramp contact corrections also respect shore contact.
- A source-backed downtown terrain patch uses a 2 m export from USGS 3DEP. The 1 m source product `LA_2021GreaterNewOrleans_C22` and NAVD88 datum were verified in the catalog at the levee-lettering reference point. This point check does not certify one source across the entire mosaic.
- The patch covers land within 500 m of mapped water inside local X 400–2300, Z −3500–1500. It preserves the horizontal footprint. The first 3 m at the mapped shore retain existing heights, with a 17 m blend into source heights; export edges blend over 100 m. Water stays at the existing 4 m reference.
- Bounded aerial texture sizes, three-plane foliage, finer calm-water ripples, and protection against stale imagery callbacks following graphics-quality changes or tile eviction. Localized detail imagery is capped at 3072 pixels, broad core/overview imagery at 2048, and balanced at 1024, subject to the device limit. This limits the increased texture memory to detail tiles rather than the entire city core.

## Automated evidence

Run `node tests/run.cjs`. For the source-raster comparison, additionally set `RIVER_DEM_SOURCE` to the downloaded terrain source folder.

- The new shoreline regression failed against the original physics, then passed with the fix.
- 10,000 deterministic map points match the original polygon containment algorithm.
- All sampled navigation positions at 25 m intervals along the route remain clear; twenty fast approaches to actual mapped banks remain in water.
- Controls, acceleration, speed caps, current, reverse, braking, high-speed contact, anchoring, ramp entry and SI-gravity flight regressions passed.
- Stale image success/error callbacks, texture disposal, broad/detail texture memory limits, and device-resolution limits passed (7 checks).
- An independent review reproduced excessive damage during glancing shore contact: 40 m/s parallel travel plus only 0.2 m/s toward shore cost 17.99 hull points. Contact now uses land-facing shoreline normals and inward velocity; the regression preserves 100% hull while perpendicular impacts still damage the boat. Both polygon windings, island contacts, containment and retreat pass (17 shoreline physics checks).
- Terrain geometry is finite, upward-facing and preserves horizontal land area. No detail triangles have centroids inside mapped water beyond 2 cm tolerance. Coincident vertex heights agree within approximately 0.000001 m. This is a numerical consistency check, not survey accuracy.
- Across 4,967 sampled land positions, mean absolute difference from the new source raster decreases from 0.4523 m to 0.0681 m. This measures raster interpolation fidelity; it does not measure error against ground truth.
- The final mesh contains 1,122,007 triangles. The detail patch replaces 18,480 triangles with 295,680 and adds roughly 7.2 MB of JavaScript asset data.

## Live checks and remaining work

The original public build entered free exploration with no browser errors. On retry, the final local terrain and water build loaded, entered exploration, and displayed the downtown levee/riverwalk viewpoint at 1280 × 720. The captured console contained no warnings or errors. The scene showed the updated river surface and downtown embankment. Its displayed FPS diagnostic was 28 at one observation; this is not a sustained or cross-device performance benchmark. A pre-existing Three.js deprecation warning was seen in earlier runs.

Browser automation initially stopped responding during a reload. After reconnecting, it became unresponsive again while switching morning weather and High to Balanced graphics. A read-only code review and imagery-loading regressions found no demonstrated infinite loop or stale-request race; the cause of the stall is unresolved. The final broad-texture memory reduction and glancing-contact fix passed automated checks but could not be rechecked in the browser. Weather/quality switching, sustained performance, mobile layout, and an end-to-end uninterrupted voyage remain pending. The change is therefore a draft for review, not a claim of completed photorealism or exhaustive playtesting.

The existing mapped water geometry was preserved; it has not been re-surveyed or redrawn to a single current river stage. Other reaches retain their original terrain resolution, and buildings, bridge details, vegetation volumes, currents and depth remain models. Replacing those approximations is further work.

## Version 2.5: geographic audit and camera stability (2026-10-28)

The integrated `node tests/run.cjs` passed on the release worktree: 17 shoreline/contact checks, 10,000 mapped points plus six island/bank checks, 2,565 route samples, 20 fast bank approaches, 16 controls, 11 fanboat cases, 11 anchor/jump cases, 11 camera cases, 13 imagery-loading cases, and terrain mesh continuity/no-water-encroachment checks. Both corrected behaviors were reproduced by failing regressions before implementation.

Independent camera review compared 324 open-water configurations to the previous camera and found identical positions, targets and field of view. Eleven measured terrain/hull cases reproduced prior penetration and cleared the terrain by 0.75 m with the correction. This verifies camera-center clearance; building collisions, swept camera volume and line-of-sight occlusion remain outside this change.

Local browser smoke checks loaded the game, entered free exploration, accelerated from 2.3 to 5.0 kn with a two-second Space hold, selected the downtown levee viewpoint, changed high graphics to balanced, cycled helm/aerial/chase views and changed weather. The rendered aerials remained present after the quality change. One automation click timed out during the quality update; the selected setting was confirmed and the interface responded on the next observation. This is not a frame-rate or latency certification. Final live-deployment evidence is recorded separately after publishing.

The geographic audit inventories the full corridor but does not certify every facade, footprint, bank crest, contemporary waterline or a continuous voyage. See `geographic-audit.md` for source dates, modeled-height limits and next implementation priorities.

The isolated visual camera reproduction also passed in the browser at downtown boat x/z 740.85010278 / -1733.14242642 and heading 1.70551078, with default zoom and pitch -0.3. Actual full-hull water containment was true. Baseline camera y=2.00 m, rendered ground y=8.08 m, clearance=-6.08 m; corrected camera y=8.83 m, clearance=0.75 m. Before/after screenshots are in the local audit deliverable. The fixture freezes the scenario in separate QA files and is not included in the game. The corrected page logged no browser errors.
