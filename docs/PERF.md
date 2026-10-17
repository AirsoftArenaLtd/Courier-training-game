# 3D workday rendering cost

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
