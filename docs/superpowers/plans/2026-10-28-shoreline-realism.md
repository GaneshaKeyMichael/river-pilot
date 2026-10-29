# Shoreline realism implementation plan

Goal: improve mapped shoreline consistency, recover finer source terrain detail where verified data is available, improve rendering, and fix demonstrated bugs.

Architecture: keep the static Three.js game and official local coordinates. Reuse the water polygon for rendering and hull collision. Add a bounded source-backed terrain patch instead of inventing geography or replacing the entire route. Preserve existing controls, missions, anchors, ramps and offline hosting.

User direction: geographical/topographical accuracy, shoreline truth, realistic appearance, and bug fixes; proceed autonomously.

- [x] Reproduce hull/shoreline disagreement, then share indexed polygon queries between scenery and physics. Check islands, narrow protrusions, fast and reverse contact, and retreat from shore.
- [x] Retrieve and validate a finer USGS elevation export for the downtown riverfront. Record spacing, source catalog, coverage, processing and remaining water-stage/epoch limitations. Keep tile transitions continuous and original horizontal coordinates.
- [x] Improve retained imagery detail and vegetation depth without adding unsupported geographic objects. Guard stale texture loads when graphics quality changes.
- [ ] Run deterministic controls/physics/geography regressions, verify terrain seams and finite geometry, and perform live desktop/mobile and weather/location checks. Capture before/after evidence.
- [ ] Package source changes and a validation report; publish a reviewable GitHub branch/PR without changing the live main branch.

Review focus: high-speed shoreline tunneling, turning hull corners, polygon holes, terrain patch borders, interrupted imagery loads, source precision claims, and frame rate/memory cost.

Implementation and automated checks complete. Live final visual/performance/mobile checks are pending because browser automation stopped responding during reload. Delivery is a draft for review.
