# C-27 town assets (in progress)

The branch `codex/c27-town-assets` starts from pilot `7c19f9f`, after the C-19 loader merged.
The owner supplied four relevant CC0 Kenney packs on `owner/o3-assets`: Suburban 2.0,
Commercial 2.1, Roads and Car Kit 3.1. Incoming archives stay outside the worktree.

The first slice is an offline preparation tool, not a change to the game town. It exports two houses,
a shop, a tree, a fence, a road section, a streetlight and a parked car. Source-detail exports total
430,260 bytes. Each export has one primitive, linear vertex colours, no image map and no external URI.
The static five-node car is flattened with its wheel positions intact. Source triangle winding yields
flat normals; exact position/normal/colour tuples are deduplicated without joining colour or hard edges.
The tool rejects animation, reflection/singular transforms, cycles and unsupported palette transforms.

Each temporary pack retains its original licence bytes and gets a SOURCE.md with the source page,
owner download date, archive/palette/model hashes, conversion command and output hashes. Repeated
conversions produce byte-identical models. The eight prepared models pass the real vendored loader,
placement-normalisation and disposal checks; their contact sheet renders with zero textures and no GL error.
Five synthetic conversion tests cover palette transfer, nested transforms/instances, colour/hard-edge
boundaries, rejected transforms and deterministic/aligned output. The current shipped asset-policy suite
also passes. Preparation evidence: `docs/review/set-8/c27-preparation.md`.

No prepared asset has been added to the game manifest yet. **C-27 remains doing.** Next steps are Low
geometry, runtime instanced replacements and road/kerb surface detail, preserving generated layout,
exact solids, delivery facades/targets and the procedural fallback. The source-detail houses/car are too
large for Low; they must not be shipped as Low. The unchanged gate is 64 calls, 2,500 triangles, two
Three.js textures, 4 MiB attachments and 4 MiB estimated Phaser textures. The complete route sweep,
rendered `test/fpbench.js` gate, physical-access/browser regressions, resume checks and final town screenshots
will run after integration. Native Intel frame-rate acceptance remains O-1.

Reproduce preparation (Pillow and the existing test dependencies are needed):

```sh
mkdir -p /tmp/c27-incoming
# Fetch owner/o3-assets first. The archive contains the owner's raw zips; none go into pilot.
git archive origin/owner/o3-assets assets/_incoming/kenney_city-kit-suburban_20.zip assets/_incoming/kenney_city-kit-commercial_2.1.zip assets/_incoming/kenney_city-kit-roads.zip assets/_incoming/kenney_car-kit.zip | tar -x -C /tmp/c27-incoming
python3 test/fptownprepare.py
python3 test/tools/prepare-town.py /tmp/c27-incoming/assets/_incoming /tmp/c27-converted
python3 test/tools/prepare-town.py /tmp/c27-incoming/assets/_incoming /tmp/c27-repeated
node test/tools/validate-town.js /tmp/c27-converted /tmp/c27-repeated
node test/assets.js
# Serve the checkout on the chosen port; this contact sheet uses only its local Three.js scripts.
node test/tools/preview-town.js http://127.0.0.1:8327 /tmp/c27-converted /tmp/c27-model-preparation.png
```
