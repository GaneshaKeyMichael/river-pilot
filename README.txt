BATON ROUGE — RIVER PILOT: WEB HOSTING PACKAGE

Upload the contents of this folder to a static website host. index.html and every other file must be uploaded at the published root.
This flat variant has no nested folders.
For GitHub Pages, upload these files together at the repository root,
and retain .nojekyll. All paths are relative, so a project-site subpath works.

This package includes the playable game, aerial imagery, source notes and
licenses. It needs no server-side code, accounts, API keys or runtime API.
Use a web server or published URL; opening index.html directly as a local
file can trigger browser WebGL image restrictions. The separate offline
mississippi-river.html is not part of this smaller web package.

Original raw TIFF surveys, GIS downloads, test outputs and offline bundles
are omitted. The game already contains their required processed geometry.

THE REACH
Explore approximately 64.3 km of the Mississippi along East Baton Rouge
Parish, from the Port Hudson area toward the Bayou Manchac area. The scene
also shows the opposite bank, including Port Allen. The route follows mapped
water and flowline geometry at full geographic scale.

YOUR FANBOAT
Pilot a compact 7.0 m by 3.2 m fanboat powered by one turbine engine driving
the rear fan. Its modeled maximum is 80 knots over ground, including the
effect of river current. The speed display shows that same over-ground speed.
This is a custom game vehicle; its performance is not a real-boat specification.

Choose "Take the helm" to begin the voyage at the northern end of the reach.
"Free exploration" starts downtown. The location menu lets you jump directly
to a mapped riverfront location. The boat begins at idle in power stage 1.
Hold Space to add power; shift up for the higher power stages.

CONTROLS
Space                 Add turbine power in the selected stage
Ctrl + Space          Apply reverse power while held
Up / Down arrows      Select R, N, or power stage 1, 2, 3
Left / Right arrows   Steer left / right
A / D                 Alternate steering keys
X                     Slow the boat / reduce engine power
H                     Drop / raise anchor (below 4 knots, on water)
C                     Cycle camera views
Drag                  Look around
Mouse wheel           Zoom a landmark / adjust sailing camera distance
P / Escape            Pause / resume
R                     Recover the boat to the channel

Stage 1 limits power for maneuvering; stage 2 allows cruising power; stage 3
allows full turbine power and the 80-knot maximum. These are power limits,
not fixed speed settings. N selects neutral; R selects reverse power.
Releasing Space keeps the selected power. Use X to reduce power and slow down.
Changing stages or selecting neutral does not instantly stop the boat: it
retains momentum and is affected by the simulated current. Touch controls
and on-screen stage buttons are also available.

ANCHOR AND JUMP RAMPS
Press H or click the anchor button to drop anchor below 4 knots. The boat
slows as the anchor sets, then holds against the current. Raise it before
applying power. An impact from another vessel can release the anchor.

Eighteen fictional floating stunt ramps are scattered through clear water
with checked approaches and landing corridors. Orange triangles mark them
on the river chart. In Explore a Location, choose "Jump ramps · practice
approach", shift up twice to stage 3, and hold Space to approach the ramp.
The practice start leaves about 395 metres of run-up before its entry.

The deck slope and takeoff speed determine launch velocity. Climbing costs
kinetic energy; flight uses gravity at 9.81 m/s². There is no added thrust,
lift or steering in midair. The camera follows the boat's actual height.
Landing shows airtime, distance and peak height; rough landings can damage
the hull. Collision and hull damage remain game approximations. Recovery,
restart and location changes reset anchor and flight state.

Voyage settings can hide all ramps or generate a new layout after landing.
Ramps are new each session, keep clear of the shipping lanes and bridges,
and are fictional game objects rather than actual Baton Rouge structures.

LOCATION INSPECTION
Selecting a landmark holds the boat still at a checked water viewpoint.
The location name appears in the information card. Drag to pan and scroll
to zoom without releasing the hold; Space, reverse, steering, or the camera
button resumes ordinary navigation. Inland landmarks use elevated views
and a closer lens so their real position behind the levee remains intact.

At high speed, leave room to turn and slow before the shore, bridge piers,
and other vessels. The voyage's final arrival still requires less than
8 knots. Press R to recover to the channel after grounding or hull damage.

The top-right menu provides Golden hour, Morning mist, River squall, river
current and graphics settings. Sound is optional. Balanced graphics uses
less graphics memory and can improve animation on laptops.

WHAT COMES FROM REAL DATA
- Official EBRGIS water polygons, river flowline and parish boundary.
- USGS 3DEP terrain elevations.
- Thirteen georeferenced USGS/USDA aerial tiles. Detailed city-core imagery
  was acquired May 3, 2023; its native 0.3-m imagery is exported at 1.625 m
  per pixel for this application. The downtown levee and USS KIDD detail tile
  uses 0.586 m per pixel. Wider overview tiles have lower resolution.
- 5,617 raw official EBR building footprints within the river corridor.
  4,932 have positive source height values; 685 have no recorded height.
  This is the source record count, not the number of generic buildings drawn:
  5,352 remain generic buildings, 256 are replaced by custom models, and
  nine unsupported footprints are omitted from generic building scenery.
- Official bridge axes and landmark positions. Bridge types and major
  dimensions, and the State Capitol's 450-foot height, are source-backed.

SCENERY UPDATE
Building foundations now meet the visible terrain surface. Footprints that
cross unsupported ground or mapped water are omitted instead of floating.
Levee triangles have been refined near mapped alignments to retain more of
the existing USGS elevation profile. The source remains a roughly 13.8-m
elevation grid; smaller triangles do not create a finer survey or resolve
every narrow crest, stair, path or retaining wall.

The refinery replaces 252 circular source footprints with tanks and process
columns at their mapped locations and recorded heights. L’Auberge adds its
hotel wing, casino, garage, supported skybridge and rooftop details. Their
facades, equipment classifications and pipework are visual approximations.
The hotel's 43.2-m tower height is modeled from its documented 12 stories,
not a surveyed height. Both locations are available in the location menu.

Tiger Stadium now has an open field, separate upper grandstands, press box
and south expansion. The State Capitol has stepped Art Deco massing; the
Old State Capitol has its Gothic form and eight towers. Both river bridges
have more distinct truss, bracing and approach details. These remain visual
reconstructions at mapped locations. Stadium details follow the 2023 aerial
context and do not claim the later scoreboard retrofit.

WHAT IS MODELED
This is a reconstruction from geographic data, not a photographic carbon
copy. Aerial imagery is historical and does not supply photographic facades.
Building extrusion, roof interpretation, landmark facade details, individual
bridge members, piers and approach grades simplify the real structures.
Ground elevations in the building source do not specify a verified vertical
datum in the published metadata. Missing building heights are not measured
heights. EBR's building layer does not cover West Baton Rouge Parish; the
opposite bank is represented by real aerial imagery and available terrain.

Water level, currents, weather, traffic, depths and boat handling are
gameplay simulations. Displayed bridge elevations are not current surveyed
clearances. USS KIDD is reconstructed at her normal berth as a historical
riverfront view. This is not a claim that she is currently in Baton Rouge;
the museum's website reports her away in Houma for repairs. Select USS KIDD
in the location menu to inspect the ship from the river. The nearby Downtown
levee & riverwalk location faces the raised embankment.

Select "BATON ROUGE · red levee lettering" to inspect the red BATON,
fleur-de-lis and ROUGE paint about 600 m north of USS KIDD. The paint follows
the sloping terrain at its public aerial-image location. Its font, spacing
and paint color are approximations. Google Maps was used only for visual
study; no Google imagery is included in the game.

SOURCES
Detailed provenance and limitations: br-assets-sources.json
Tile extents and resolution: br-assets-imagery.json
Building coverage counts: br-assets-buildings-summary.json
Refinery and L’Auberge sources: br-landmark-reference-notes.json
Civic landmarks and bridges: br-civic-reference-notes.json

EBRGIS: https://maps.brla.gov/gis/rest/services/
USGS imagery: https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPPlus/ImageServer
USGS elevation: https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer
Louisiana Capitol: https://house.louisiana.gov/pubinfo/VirtualTour/Default.htm
USS KIDD status: https://www.usskidd.com/plan-your-visit/uss-kidd-overhaul-2024-25/

LICENSES
Three.js r160 and Water/Sky examples: MIT, three-LICENSE.txt.
Manrope font: SIL Open Font License, manrope-OFL.txt.
USGS/USDA imagery is public-domain geographic imagery, with attribution
retained. Building and bridge source attribution: EBRGIS, Department of
Information Services. The standalone HTML includes the license notices.
