# Town assets (C-27)

The town uses eight locally bundled templates from the owner's CC0 Kenney packs: two houses,
a shop, a tree, a fence, a streetlight, a road/kerb section and a parked car. High retains the source
detail. Low uses small closed silhouettes, source-palette windows/frames and broad roof colours;
the already-small tree and road retain their original geometry. No image map or decoder is needed.

`test/tools/prepare-town.py` makes both variants from the owner branch's Suburban 2.0, Commercial 2.1,
Roads and Car Kit 3.1 archives. Static node transforms are flattened, palette sRGB becomes linear vertex
colour, triangle winding yields flat normals, and exact position/normal/colour tuples are deduplicated.
Low palette choices are weighted by surface area so small bevels and lamps cannot replace the main paint.
Six conversion tests cover transfer, nested transforms/instances, hard edges, invalid transforms,
deterministic alignment and Low geometry/palette bounds. Each shipped pack keeps the original licence
bytes and a SOURCE.md with source URLs, owner download date and archive/palette/model/output hashes.

The 16 new variants total **457,596 bytes**; with the C-19 starter assets the manifest totals **474,648 bytes**.
Low downloads **30,052 bytes**, High **444,596 bytes**. Nine templates load through the existing bank; the
unused starter garage remains available to older adapters. All files stay far below A-20's byte limits.
No incoming zip, external URI, image texture or new player-facing text ships.

## Placement, fallback and physical access

`src/core/fptown.js` owns scene-only art state. Houses face the street and fit the generated non-delivery
lots, with a private front yard keeping props outside the building; roofs, windows, roadside trees/furniture and parked cars add visual detail. Existing customer facades,
front doors, labels, exact collision solids, public paths, road markings, parking points and generated
route identities stay intact. Decoration remains inside already-solid non-delivery lots. The original lot
footprint remains the collision boundary, including visible yards; delivery paths remain accessible.
No new obstacle, hazard, control, score event or saved field is introduced, including on the first day.

Every lot retains its procedural building when its template is missing or outside Low's detail selection.
Missing decorative models use small procedural equivalents. Missing road files keep the existing road
planes. The loader still handles absent/corrupt files, unsupported decoders, timeouts and cancellation.
The owner-supplied Poly Haven road/pavement zips omit a licence file; a question is in Claude's inbox for
B-1. Their files are not shipped. Road/kerb detail currently uses the licensed Kenney palette geometry and
analytic surface grain, preserving the two-texture Low ceiling.

Low selects nearby detail within a **290-triangle allowance**, updated at the existing three-metre scenery
cadence; unused/distant houses retain their old silhouette. High uses the existing 95-metre scenery radius.
Instance matrices and selection records are preallocated; one primitive per template shares geometry and
one cheap vertex-colour Lambert material. Weather, sun, night and High shadows reach the new geometry.
Reduced motion leaves the anchored surface grain static, with existing cab and accessibility controls intact.

The route's existing boxes/planes now use per-instance colours in shared batches, with separate solid proxies.
Reflection passes compact the town templates by their true transformed bounding spheres and restore every
main-view matrix, colour, count and visibility afterward. World disposal restores shader hooks before
releasing the town material/instance buffers; bank-owned source geometry survives world rebuilds and is
released only at scene shutdown. No town art state enters the mission save or score log.

## Resource and review gate

Before adding art, the 240,000-view loaded sweep fell from C-26's 64 calls to **48 calls / 1,890 triangles**.
The complete integrated sweep now peaks at **58 calls / 2,306 triangles**, and fallback at **47 / 2,266**.
Both cover 240,000 complete-frame views across days, stops, cargo states, camera poses, cab controls,
all four lighting presets and mirror/rear passes. The 64-call / 2,500-triangle ceilings stay unchanged.
Rendered figures, commands and test counts are in `docs/PERF.md`; final review evidence is indexed in
`docs/review/set-8/c27.md`. The historical preparation contact sheet is `c27-preparation.md` in that folder.
The software renderer measures resources/behaviour; the native Intel 60 fps acceptance remains O-1.

Reproduce conversion (Pillow and the existing test dependencies are needed):

```sh
mkdir -p /tmp/c27-incoming
# Fetch owner/o3-assets first; raw zips stay out of the game and LMS packages.
git archive origin/owner/o3-assets assets/_incoming/kenney_city-kit-suburban_20.zip assets/_incoming/kenney_city-kit-commercial_2.1.zip assets/_incoming/kenney_city-kit-roads.zip assets/_incoming/kenney_car-kit.zip | tar -x -C /tmp/c27-incoming
python3 test/fptownprepare.py
python3 test/tools/prepare-town.py /tmp/c27-incoming/assets/_incoming /tmp/c27-prepared
python3 test/tools/prepare-town.py /tmp/c27-incoming/assets/_incoming /tmp/c27-repeated
node test/tools/validate-town.js /tmp/c27-prepared /tmp/c27-repeated
QA_GFX=low node test/tools/validate-town.js /tmp/c27-prepared /tmp/c27-repeated
node test/fptown.js
node test/assets.js
# Serve the checkout on the chosen port for a source-detail contact sheet.
node test/tools/preview-town.js http://127.0.0.1:8328 /tmp/c27-prepared /tmp/c27-models-high.png
QA_GFX=low node test/tools/preview-town.js http://127.0.0.1:8328 /tmp/c27-prepared /tmp/c27-models-low.png
```
