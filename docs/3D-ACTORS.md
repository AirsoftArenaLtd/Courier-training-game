# Van and character models

C-28 replaces the van exterior, courier, crossing pedestrian and nearby resident art with locally bundled
CC0 assets. `codex/c28-van-characters` is stacked on C-27 `5e4568a`; all cab controls, inspection/parcel/door
raycasts, solid footprints, scores and save fields remain owned by the existing model.

The Kenney delivery van retains its named body, cargo door and four wheels. High keeps 2,461 source
triangles; Low uses a 190-triangle source-bounds shell, sloped cab, windshield and hexagonal tires. The
body and door follow the sprung chassis, front wheels steer, tires rotate from signed travel speed, and
the rear door lifts under the roof, staying inside the existing physical footprint. The existing cargo shelves, packages, restraint, fault lamp and tire defect
remain visible/selectable. Source pixels do not replace the original interaction or collision proxies.
The existing local company livery/name/logo and theme body colour remain; short stalks join the physical
mirrors to the cab. The interior reflection uses the retained procedural cab shell, because the source
windshield would otherwise occlude the original C-23 physical mirror camera. The new exterior remains
visible in outside, side-mirror and rear-camera views; every mirror position and gaze check stays intact. Existing procedural van art remains when the model fails to load.

Quaternius Worker supplies the courier; Casual and Casual_2 supply residents and the crossing pedestrian.
The source rigs retain `Idle_Neutral`, `Walk`, `Wave` and `Interact`. Each Low figure is 88 triangles;
High keeps its source geometry. The converter removes unused clips and unreferenced binary data.
Each pack keeps its original CC0 licence bytes (including the older title in the women's licence),
source link and source/output SHA-256 hashes. Incoming zips never enter the game.

Each scene clones independent bones, merges a figure's coloured primitives into one ordinary mesh and
CPU-poses positions and normals at 10 Hz on Low or 20 Hz on High. No rendered `SkinnedMesh`, bone texture,
image map or additional render pass is used. Pose changes use existing model time and reuse buffers.
The nearest eligible resident within 22 metres on Low or 35 on High gets the rig; farther residents
keep the existing simple art. The pedestrian also has a 35-metre range. Hidden residents do no animation
work. The bounded set is a crossing figure, one resident and the courier in the existing mirrors.

A new contact opens the facade panel inward, brings the resident to the existing standing point, waves,
then uses the source Interact gesture while talking. The stationary interaction/collision target remains
at the original facade. An absent recipient never appears. Resolution closes the visual door. A resumed
contact starts already open, without replaying an invented new contact or changing the checkpoint.
The courier follows the first-person walking position and appears in physical reflections; existing
first-person uniform sleeves remain. Only visual state is transient. Reduced motion uses one still
idle pose and immediate door changes; colour mode still uses the existing composites. Keyboard/remapped
controls and larger text keep their original paths. No new UI sentence or scoring event is introduced.

Preload validates the required clip names, normals/skin attributes, bone cap and semantic van parts.
Missing, corrupt or semantically incomplete actor files keep their procedural fallback; healthy town
models still load. The static instance adapter refuses character rigs. Scene disposal releases cloned
skeletons, mixers, pose geometry and material after restoring lighting/weather hooks; the asset bank
retains ownership of the source geometry until its own disposal.

Rebuild into a temporary directory (Node, the test dependencies and Pillow are needed):

```sh
python3 test/fpactorsprepare.py
python3 test/tools/prepare-actors-runtime.py CAR_KIT_ZIP CHARACTER_ZIP_DIRECTORY OUTPUT
node test/fpactors.js
```

The ten runtime variants reproduce byte for byte. Copy only their GLBs, original licences and source
notes into the existing packs, retaining the town provenance note in Kenney Car Kit, and update the
manifest byte counts. The initial source-only report `c28-prepared-validation.json` records the earlier
rig inspection; it is not the final runtime gate. Final resource figures, browser checks and screenshots
are recorded in `docs/PERF.md` and `docs/review/set-8/c28.md`. The unchanged Low gate is 64 calls, 2,500
triangles, two Three textures and 4 MiB each for attachments and estimated Phaser textures at 1280×720.
The owner's native Intel 60 fps measurement remains O-1; cloud SwiftShader timing is not acceptance.
