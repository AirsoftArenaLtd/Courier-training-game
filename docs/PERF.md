# 3D workday rendering cost

## C-23: three physical mirrors (17 October 2026)

Three always-live mirrors replace the requested floating overlay. One atlas holds all three images; a maximum
of one reflection pass runs in a frame, before the world and its single fullscreen composite. Low schedules
30 aggregate updates per second (about 10 per mirror at 60 fps); High schedules 90 (about 20 per mirror at
60 fps). Low's atlas is 384 × 144; High's is 768 × 288. The world still has two allocated Three.js textures.
Total target attachments at 1280 × 720 are **3,557,376 bytes on Low** and **9,142,272 on High**. Colour filtering
runs once in the existing composite and reaches both the world and physical reflections.

The initial prototype exceeded the 64-call limit when the interior mirror also rendered the dashboard.
Batching the Low wheel hub with its spokes and mirror mounts with the housings saves two calls without changing
their geometry. Reflection cameras now cull individual static town instances into preallocated buffers and
restore the main view exactly afterwards. Low side-camera range is 40 metres; interior range is 12 metres.
The interior image shows the cab and bulkhead; it does not render the road through the solid body.

The expanded geometry sweep renders every stop on 30 days and ten variants, empty/loaded, four driving poses,
eleven cab controls and three mirror looks, with each of the three reflection passes. **162,000 loaded views**
peak at **59 calls / 2,090 triangles**; **162,000 fallback views** peak at **58 / 2,082**. The densest view is
day 6, variant 9, first stop, loaded van, looking at the wiper stalk with the interior reflection updating.
The renderer fixture `latermirrorpeak` reproduces it. No resource ceiling changed.

Seven actual Low samples with sound, larger text and colour filtering peak at **58 calls / 2,090 triangles**,
**two textures**, **3,557,376 attachment bytes** and **2,581,472 estimated Phaser texture bytes**. They include
all three mirror looks, barcode aim, a loaded turn, reverse and the densest cab angle. Four High samples peak
at **64 calls / 4,066 triangles**, **two textures**, **9,142,272 attachment bytes** and **6,663,515 Phaser bytes**.
Two Low samples with reduced motion added also pass, peaking at **58 / 2,090** and **2,528,539 Phaser bytes**.
Loaded source geometry storage is 4,832 bytes on Low and 21,536 on High. No page errors or context loss occur.

Commands (one Chromium at a time):

```sh
QA_ASSETS=1 QA_CAB=1 QA_CAMERA=1 QA_MIRRORS=1 QA_LATER=1 QA_TAG=c23 node test/fproute.js
QA_CAB=1 QA_CAMERA=1 QA_MIRRORS=1 QA_LATER=1 QA_TAG=c23-fallback node test/fproute.js
QA_GFX=low QA_TAG=c23 QA_PROTOTYPE_ONLY=1 QA_SOUND=1 QA_A11Y=large,colour QA_VIEWS=mirror,mirrorRight,mirrorInterior,barcodeAim,laterstressturn,laterstressreverse,latermirrorpeak QA_SHOTS=1 node test/fpbench.js
QA_GFX=high QA_TAG=c23 QA_PROTOTYPE_ONLY=1 QA_SOUND=1 QA_A11Y=large,colour QA_VIEWS=mirror,mirrorRight,mirrorInterior,latermirrorpeak QA_SHOTS=1 node test/fpbench.js
QA_GFX=low QA_TAG=c23-reduced QA_PROTOTYPE_ONLY=1 QA_SOUND=1 QA_A11Y=large,colour,reduced QA_VIEWS=mirror,latermirrorpeak node test/fpbench.js
QA_CAB=1 QA_LATER=1 node test/fpresume.js
node test/fpmirrors.js
QA_CLIP=1 node test/fpmirrorsbrowser.js
node test/fpaccessbrowser.js
node test/fpcamerabrowser.js
```

Mirrors and in-progress manoeuvres use compact optional arrays validated by the owned restore code. The
new gaze/control checkpoints, 30 seeded resume comparisons and 100-day soak pass, with **3,943 / 4,000 SCORM
characters** across 240 encode/decode checks. Shared save, settings, i18n and scoring sources are unchanged.
The first day retains its gentle route. Software rendering establishes resource/behaviour regressions;
O-1 still requires the owner's native Intel 60 fps check. Evidence: `docs/review/set-7/c23.md`.

## C-22: physical cab controls (17 October 2026)

The PRND selector, brake, belt, indicator, light/wiper switches and speed/RPM gauges share batched procedural cab
geometry. The dials use one shader quad; there are no image maps or added render targets/passes. Low uses a
16-sided ring rim and flat pillar/door/backrest/hub surfaces; High retains a tube rim, solid trim and additional
seat/console pieces. Low's cab submits 160 triangles, versus C-21's 172 for the old wheel/dashboard. Source
geometry storage is 4,224 bytes with the loaded Low starter and 20,088 on High. Functional switch positions and
dials remain live under reduced motion; the existing cosmetic camera movement remains suppressed.

The initial four-pose sweep missed the view when looking down at the controls: the extended sweep reached 2,530
triangles. Low trim was simplified to bring **both 45,000-view sweeps** (loaded glTF and missing-model procedural
fallback) inside the unchanged ceilings, at **60 calls / 2,500 triangles** with assets and **59 / 2,500** without.
The sweep covers every stop on 30 days and ten variants, empty/loaded, four driving poses and all eleven physical
cab targets. Its strict 2,500-triangle assertion is unchanged. At the peak there is no triangle headroom; subsequent
mirror/camera work must reserve its own room within this ceiling.

Seven rendered Low samples (cab, mirror, barcode aim, loaded braking, both turns, reverse) with sound, larger text
and colour mode peak at **60 calls / 2,444 triangles / two targets**, **3,575,808 attachment bytes**, and **2,573,947
Phaser intrinsic RGBA bytes including the full-mipmap estimate**. High's cab/loaded-turn pair reaches **62 calls /
4,782 triangles**, two targets, 8,409,600 attachment bytes and 6,471,942 Phaser estimated bytes. The separate loaded fourth-stop headlight-switch view confirms the CPU maximum in an actual complete frame at
55 calls / 2,500 triangles, the same two targets / 3,575,808 attachment bytes and 2,521,035 Phaser estimated bytes.
No context loss or page errors occur. These are complete rendered frames at 1280 × 720; the original Low limits remain 64 calls,
2,500 triangles, two textures, 4 MiB attachments and 4 MiB Phaser estimate.

```sh
QA_CAB=1 QA_CAMERA=1 QA_LATER=1 QA_TAG=c22-fallback node test/fproute.js
QA_ASSETS=1 QA_CAB=1 QA_CAMERA=1 QA_LATER=1 QA_TAG=c22 node test/fproute.js
QA_CAB=1 QA_LATER=1 node test/fpresume.js
QA_CLIP=1 node test/fpcabbrowser.js
QA_GFX=low QA_TAG=c22 QA_PROTOTYPE_ONLY=1 QA_SOUND=1 QA_A11Y=large,colour QA_VIEWS=cab,mirror,barcodeAim,laterstressbrake,laterstressturn,laterstressturnleft,laterstressreverse QA_SHOTS=1 node test/fpbench.js
QA_GFX=high QA_TAG=c22 QA_PROTOTYPE_ONLY=1 QA_VIEWS=cab,laterstressturn QA_SHOTS=1 node test/fpbench.js
QA_GFX=low QA_TAG=c22-cabfocus QA_PROTOTYPE_ONLY=1 QA_SOUND=1 QA_A11Y=large,colour QA_VIEWS=laterstresscab QA_SHOTS=1 node test/fpbench.js
```

Twenty-five Node suites pass, including ten cab tests and 24 driving checks. The physical browser flow passes 200
assertions across English/Tamil normal/larger layouts, colour mode, reduced motion, shortcuts, saved-control reload
and physical exit. The new-control resume soak preserves all score/event identity and its 240 SCORM round trips
peak at **3,944 / 4,000 characters**. Raw counters, a five-second clip and screenshots are in
`docs/review/set-7/c22.md`. New prompts await Claude's translations. Cloud SwiftShader FPS is diagnostic only;
native Intel 60 fps remains O-1.


## C-19: local glTF starter pipeline (17 October 2026)

The scene-owned bank loads one quality variant from a local manifest. The two CC0 starter files total 17,052 bytes;
Low loads 2,716 bytes (16 triangles), High 14,336 bytes (196 triangles). Both bake palette colours into vertices and
upload no image map. Two non-delivery lots share one source geometry/material and an instance batch. The source
and licence are in `assets/3d/kenney-city-starter/`; the loader shares the existing Three.js r158 runtime.

The actual loaded-model 30-day/ten-variant sweep passes 3,000 empty/loaded mirror views. The complete procedural
fallback also passes 3,000 views. The rendered gate samples six Low views with larger text, colour, reduced motion
and sound, and two focused High views. All reports have zero page errors/context loss.

| Mode | Calls | Triangles | Targets | Attachment bytes | Phaser full-mipmap estimate |
| --- | ---: | ---: | ---: | ---: | ---: |
| Loaded Low, six rendered views and 3,000 geometry views | 55 | 2,464 | 2 | 3,575,808 | 2,502,528 |
| Procedural fallback, 3,000 geometry views | 54 | 2,480 | unchanged | unchanged | unchanged |
| Loaded High, two rendered views | 57 | 4,532 | 2 | 8,409,600 | 6,200,688 |

The Low ceilings remain 64 calls / 2,500 triangles / two targets / 4 MiB attachments / 4 MiB Phaser textures.
The new model batch culls separately from the procedural lot batch, so this stress scene submits fewer triangles
despite adding one call. Source vertex/index storage is 8,356 bytes on Low and 19,948 on High, versus 6,532 bytes
without the starter. Instance buffers are reused and templates survive world rebuilds, then release on scene shutdown.
No render pass, image map, scoring field or save data was added.

```sh
QA_ASSETS=1 QA_LATER=1 node test/fproute.js
QA_LATER=1 node test/fproute.js
QA_GFX=low QA_PROTOTYPE_ONLY=1 QA_A11Y=large,colour,reduced QA_SOUND=1 QA_TAG=c19 QA_VIEWS=depot,mirror,barcodeAim,laterstress,laterstressbrake,assets QA_SHOTS=1 node test/fpbench.js
QA_GFX=high QA_PROTOTYPE_ONLY=1 QA_TAG=c19 QA_VIEWS=laterstressbrake,assets QA_SHOTS=1 node test/fpbench.js
```

Reports/screenshots/clip: `docs/review/set-7/c19.md`. Figures use Chromium/ANGLE SwiftShader at 1280 × 720;
software FPS cannot establish the owner's Intel 60 fps floor. O-1 remains the native acceptance gate. The separate
temporary runtime-file SCORM archive is 12,090,109 compressed bytes, includes the loader and every listed model,
excludes `_incoming/` and stays below the 100 MiB package limit. Claude's packaging implementation is unchanged.

## C-21: camera and feel (17 October 2026)

The reused rig adds no render pass, image texture, target or mesh. Speed FOV and head movement can expose more
of the existing town. The new 12,000-view Low sweep initially reached 2,528 triangles with C-20's steering wheel;
changing only Low's wheel from 216 to 160 triangles brings the procedural peak to **55 calls / 2,472 triangles**.
The same 12,000 views with C-19's loaded glTF instances peak at **56 calls / 2,456 triangles**. No ceiling was raised.
Source geometry is 5,204 bytes with procedural scenery, 7,028 with the Low starter; High remains 19,948 with its
starter. C-19's procedural-building replacement can reduce submitted triangles despite adding a material batch.

C-19 and C-21 topic diffs were applied to a separate detached checkout of pilot `a3cbfe2` for compatibility checks;
no merge or protected-branch change was made. The rendered seven-view Low gate includes mirror, barcode aiming,
loaded braking, both turn directions, reverse and the starter asset close-up. Larger text, colour mode and sound
are enabled, with optional camera motion enabled. It peaks at **56 calls / 2,456 triangles / two allocated targets**,
**3,575,808 attachment bytes** and **2,503,643 Phaser intrinsic RGBA bytes with the full-mipmap estimate**. The loaded
turn fixture has a 69.333-degree FOV at 8 m/s. High's same loaded brake/turn views peak at **58 calls / 4,580
triangles**, two targets, 8,409,600 attachment bytes and 6,205,147 Phaser estimated bytes; High retains wheel detail.
All samples are 1280 × 720. Low keeps the original 64-call / 2,500-triangle / two-target / 4 MiB attachment /
4 MiB Phaser ceilings. Reduced motion is checked separately at exactly 68 degrees with no body rotation.

The camera and sound adapters consume existing transient motor telemetry; saves, scoring and input stay with
the mission. RPM and road-impact sound hooks reuse six voices. Camera movement is damped by the trainer's aids;
the approved Academy getter is cached on launch, checkpoint restore and return from Settings.

```sh
QA_CAMERA=1 QA_LATER=1 node test/fproute.js
# With C-19 present, also exercise its real parser and loaded model bank:
QA_ASSETS=1 QA_CAMERA=1 QA_LATER=1 QA_TAG=c21-with-assets node test/fproute.js
QA_BASE=http://127.0.0.1:8321 QA_GFX=low QA_TAG=c21-assets QA_PROTOTYPE_ONLY=1 QA_SOUND=1 QA_A11Y=large,colour QA_VIEWS=mirror,barcodeAim,laterstressbrake,laterstressturn,laterstressturnleft,laterstressreverse,assets QA_SHOTS=1 node test/fpbench.js
QA_BASE=http://127.0.0.1:8321 QA_GFX=high QA_TAG=c21-assets QA_PROTOTYPE_ONLY=1 QA_VIEWS=laterstressbrake,laterstressturn QA_SHOTS=1 node test/fpbench.js
QA_BASE=http://127.0.0.1:8321 QA_GFX=low QA_TAG=c21-reduced QA_PROTOTYPE_ONLY=1 QA_A11Y=large,colour,reduced QA_VIEWS=laterstressturn QA_SHOTS=1 node test/fpbench.js
QA_CLIP=1 node test/fpcamerabrowser.js
```

The 23 Node suites, 28 camera-browser checks, 145 keyboard-only checks and 45 actual AudioContext checks pass.
Resume/SCORM soak stays at 3,596 of 4,000 characters, with 240 scored round trips. Raw reports, screenshots and the
nine-second real-key clip are indexed in `docs/review/set-7/c21.md`. SwiftShader FPS is recorded only for diagnosis;
O-1 still needs the owner's native Intel measurement. No new on-screen text needs translation for C-21.


## C-20: vehicle dynamics (17 October 2026)

The rear-axle motor reuses a scratch collision pose and one transient telemetry object. Body pitch/roll split the
existing moving instances into a sprung body and level tyres; no geometry, image maps, render targets or render
passes were added. The 30-day, ten-variant, five-stop empty/loaded mirror sweep passes all 3,000 views at a peak of
54 calls and 2,480 triangles. That is one call above C-18's 53-call peak, within the unchanged Low ceilings of
64 calls and 2,500 triangles. Source geometry storage remains 6,532 bytes.

The six-view rendered Low gate (depot, cab, mirror, barcode aim, loaded day-18 stress mirror and the same scene
under brake dive/roll) also peaks at 54 calls and 2,480 triangles. It keeps two targets and 3,575,808 attachment
bytes. These views peak at 2,502,528 Phaser RGBA bytes with the conservative full-mipmap estimate, with larger
text, the colour filter and sound enabled. No page errors or context loss occur. Raw reports and task screenshots
are in `docs/review/set-7/`; the body pose does not increase the stress fixture's submitted triangles.

A focused repeat with larger text, colour and reduced motion also passes at the same Low resource counts. The
same braking fixture on High passes at 56 calls, 4,188 triangles, two targets, 8,409,600 attachment bytes and
6,200,688 Phaser full-mipmap-estimate bytes. These are the actual Low/High presets; High does not use Low's ceilings.

```sh
QA_GFX=low QA_PROTOTYPE_ONLY=1 QA_A11Y=large,colour QA_SOUND=1 QA_TAG=c20 QA_VIEWS=depot,cab,mirror,barcodeAim,laterstress,laterstressbrake QA_SHOTS=1 node test/fpbench.js
QA_GFX=low QA_PROTOTYPE_ONLY=1 QA_A11Y=large,colour,reduced QA_TAG=c20-reduced QA_VIEWS=laterstressbrake node test/fpbench.js
QA_GFX=high QA_PROTOTYPE_ONLY=1 QA_TAG=c20 QA_VIEWS=laterstressbrake node test/fpbench.js
```

The measurements use Chromium/ANGLE SwiftShader at 1280 × 720. Their FPS cannot establish the Intel laptop's
60 fps floor. Repeat the native command in `docs/FRAME-BUDGET.md` on the expanded workday, including
`laterstressbrake`; the existing O-1 owner measurement remains necessary.

**Texture-counter correction (C-17):** the earlier C-16 texture reports read `TextureSource.width/height`, which can remain 1×1 for resized Phaser Text canvases. They undercount text. C-17 uses intrinsic image/canvas dimensions, native-resolution Low text at the same font size, and a vector Low handheld case to retain the 4 MiB ceiling. Use the corrected C-17 texture reports in `docs/FRAME-BUDGET.md`; the C-16 draw-call/triangle comparisons remain valid. High keeps its existing text/case rendering.

**C-17 follow-up:** the historical C-16 texture figures below undercount Phaser Text because source dimensions can remain 1×1 after canvas resizing. They cannot establish the 4 MiB limit. The ready `codex/c17-sound` tree includes C-16, the intrinsic-canvas counter and Low text/vector-case fixes; review/test that combined tree before publishing. Draw-call, triangle and Three.js-target figures remain valid.

C-16 compares untouched pilot `208465f` with the performance branch at 1280 × 720. Raw reports are in `docs/qa/c16-before-*.json` and `docs/qa/c16-after-*.json`. They come from Chromium with ANGLE SwiftShader; their FPS cannot establish native Intel performance. The existing O-1 laptop check remains necessary.

## Presets and reproduction

The shared graphics module currently implements **Low and High only**. `?gfx=medium` is unrecognized and falls back to the saved Low/High choice (High by default). Saved values other than Low also select High. The benchmark now records `actualQuality` as well as the requested label. These measurements use the actual supported presets. Claude confirmed on 16 October 2026 that no Medium preset will be added: Low and High remain the supported presets, and Low covers the pilot laptops. No High measurement is relabeled Medium.

Serve the untouched pilot checkout separately and run one browser benchmark at a time:

```sh
QA_BASE=http://127.0.0.1:8406 QA_GFX=low QA_PROTOTYPE_ONLY=1 QA_TAG=c16-before QA_VIEWS=hub,depot,mirror,barcodeAim,weatherstormMirror,doormirror,doorsignature node test/fpbench.js
QA_GFX=low QA_PROTOTYPE_ONLY=1 QA_TAG=c16-after node test/fpbench.js
```

Repeat with `QA_GFX=high`; the before/after comparison uses the same seven views. The final Low report includes every prototype view, completing the requested measurement of the merged C-12–C-15 features. `QA_NATIVE_GPU=1 QA_FPS_FLOOR=60` selects the native acceptance mode described in `docs/FRAME-BUDGET.md`.

## What costs work

The world already has no shadow maps, downloaded image maps or extra postprocessing passes. It uses Lambert shading, shared box and ground-plane geometry, a small steering-wheel torus, and existing world/mirror composites. Geometry vertex/index storage is 6,532 bytes across those three source geometries in both presets; the renderer also owns the two composite quads. Quality changes drawing-buffer scale, mirror resolution, scenery radius, parcel detail range, weather-drop count and resident legs.

Repeated houses, fences, signs, dog parts, barcodes and traffic details were already instanced per material and parent. Solid-only shapes were separate visible draw submissions as well as raycast obstacles. The change batches their visible geometry while retaining exact, non-rendering raycast proxies on a separate layer. Pointer targets, barcode rays and label occlusion include that layer; movement collision still uses the unchanged mission solids.

Small non-interactive details of moving objects now share a white material and per-instance colours. Road and scenery material groups retain their original ordering: merging those groups changes distant depth ties between the ground box and road planes. Solid scenery has its original immediate distance visibility; decorative scenery retains the existing three-metre update interval. No quality detail or silhouette was removed.

Resident matrices/colours upload when the visible resident set changes, rather than twice every frame. Stable visibility produces no resident buffer upload over the 100-update regression fixture; resolving the stop updates it immediately. Picking, scanning and label occlusion reuse scratch lists, and projected label positions reuse a vector and one result per label. These remove owned temporary arrays/vector results without claiming that Three.js itself allocates nothing.

## Measured before and after

| Same seven viewpoints | Low before | Low after | High before | High after |
| --- | ---: | ---: | ---: | ---: |
| Peak draw calls | 50 | 42 | 69 | 52 |
| Peak submitted triangles | 2,112 | 2,160 | 3,256 | 3,304 |
| Source geometry bytes | 6,532 | 6,532 | 6,532 | 6,532 |
| Allocated instance-buffer bytes | 29,424 | 32,968 | 30,576 | 34,120 |
| Shadow casters | 0 | 0 | 0 | 0 |

Peak submissions fall by 16% on Low and about 25% on High. Shared instance bounds submit a few additional offscreen triangles (up to 48 at the matching peak), trading roughly 3.5 KiB of instance buffers for fewer calls. Geometry detail, target sizes and textures stay the same. This is a measured resource improvement; software FPS is retained in the raw reports without being used as laptop evidence.

The full **31-view Low** run passes at **42 calls / 2,160 triangles**, two targets, **3,575,808 attachment bytes** and **3,169,803 Phaser full-mipmap-estimate bytes**. It covers all five stops and mirrors, the guide, handheld, driving hazards, weather, gates, doorstep hazards, ID and signature. Both preset runs have no page errors or WebGL context loss. The High attachments remain 8,409,600 bytes, as before; the 4 MiB attachment ceiling applies to Low.

## Appearance and behaviour

`test/fpperfbrowser.js` compares frozen depot, live-mirror/road-hazard, dog-doorstep and held-barcode frames against the untouched checkout in both presets. Six of eight pairs match every pixel. Only two Low mirror edge pixels and eight High mirror edge pixels differ by more than two channel values, out of 921,600 pixels per frame. The regression ceiling is 0.01%; report: `docs/qa/c16-pixels.json`. Both mirror pairs are retained as screenshots.

The Node geometry checks now respect camera layers, like the actual renderer, so non-rendering proxies are excluded from draw submissions. Theme tests inspect rendered instance colours as well as ordinary material colours. Existing 30-day geometry, physical-target, load-out, doorstep and resume/soak checks remain the behavioural gate. No mission, scoring or translation source changes are part of C-16.


## Corrected texture gate with C-17

The complete 32-view sound-enabled Low run uses intrinsic canvas/image dimensions and passes with 3,130,726 Phaser full-mipmap-estimate bytes, replacing the earlier undercounted texture figures. Draw calls remain 42 and triangles 2,160; target attachments remain 3,575,808 bytes. Low uses native-resolution text at unchanged font size and vector case graphics to stay below the original ceiling. High keeps its existing text and case. See `docs/qa/c17-low.json` and the C-17 section in `docs/FRAME-BUDGET.md`.
