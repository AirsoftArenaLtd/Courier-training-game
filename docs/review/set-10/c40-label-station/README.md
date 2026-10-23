# C-40 physical label station

C-40 remains **doing** on `codex/c40-package-handling`, stacked on pushed C-38. This is the label-inspection slice;
physical sorting, lifting, team/equipment workflows and optional `m2-heavy` still follow. The sorting/lifting kernels
are separately source-scoped in `../c40-models-progress/` and are not loaded by the game.

The owned `package-label-station` definition uses existing `m2-labels` content, categories, local ScoreLog and the
original 3,150-point maximum. The unchanged registry still starts 2D by default. `registry-labels.patch` proposes only
the `scene3d` field for Claude/A-30; it changes no default, threshold, save field or completion rule.

The trainee operates a physical inspection table from its front, turning an actual cardboard parcel to expose the
front, back, left, right, top and base. Its shipping barcode, handling marks, hazard symbols and leak/crush marks are
coloured geometry on those faces. A side is credited only when its whole face fits on screen, is within 2.65 metres,
faces the camera and has five unobstructed sightlines. Merely selecting a face does not count. First-person walking
still collides with the furniture and depot walls. Seven native P/E targets cover the parcel and six numbered stations.
The physical station numbers have accessible names; the handheld provides paged rotation controls, neutral readings
and a paged practice-only guide with the original precedence. Controls use the existing key map. Reduced motion adds
no turning animation. The same physical readings stay available in assessment, with neutral decision acknowledgement
and no guide or answer coaching.

There are two additional visible meshes, a bounded station geometry and one replaceable parcel geometry. Old parcel
buffers are disposed on replacement. There are no image maps, new reflection passes or outside assets. The artwork's
provenance is recorded in `docs/ASSETS.md`.

Runtime and native script are frozen at `028d5637`. The later sorting/lifting commit adds only unloaded models, their
Node tests and documentation; `runtime-bridge.json` records the unchanged loaded sources. These are checks of the
pushed C-38 stack, not a merge with current pilot. All six original m2 data/scene files and ScoreLog match fetched
pilot `90844ac5` byte for byte. Current-pilot combined acceptance remains necessary before the whole task is ready.

The first corrected real-day Tamil larger-text assessment passed 103 native checks, including all six exposed faces,
a real station placement, body/choice/Back separation and exact saved-day/checkpoint/report preservation on quit. The
complete eight-layout native matrix and the separate five-view/four-profile `fpbench` gate are recorded beside this
file when they finish. `test/tools/fp-package-label-quality.js` calls the existing measurement and budget checker;
default benchmark views and Low/High ceilings are unchanged. Its 20-view scope is not the complete workday gate.

The initial rejected diagnostics distinguish a table accidentally placed beyond the depot wall (corrected with a
permanent real-world collision/raycast test), a missing test profile, and the hub normalising an absent empty journal.
The final fixture starts and pauses an actual saved workday before entering the module. None of those rejected runs
is counted as final acceptance.

New sentences are English fallback until Claude translates them. English/Tamil checks use the current catalogue's
shell and English sources for comparisons. Cloud SwiftShader resource measurements cannot certify Intel 60 fps;
the existing O-1 owner measurement remains necessary.
