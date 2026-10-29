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
