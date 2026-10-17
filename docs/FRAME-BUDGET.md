# Low-graphics 3D workday budget

**C-25 review update (17 October 2026):** the texture-free sky adds at most two calls and four triangles
across the world and one reflection. Low keeps shadows/contact occlusion off, with two allocated Three.js
textures and 3,557,376 estimated attachment bytes. Its loaded 162,000-view sweep peaks at 61 calls / 2,094
triangles; fallback peaks at 60 / 2,086. A separate checkout with pushed C-24 rear-camera code passes
240,000 views at 63 / 2,124. The same 64-call, 2,500-triangle and memory ceilings remain in force.
High alone adds a bounded 512-pixel soft shadow map. Rendered figures and evidence: `docs/PERF.md`,
`docs/review/set-8/c25.md`. SwiftShader does not establish the native Intel 60 fps floor.

**C-23 mirror update (17 October 2026):** the current renderer has three always-live physical mirrors sharing a
384 × 144 atlas on Low, with at most one reflection update per frame. The old requested floating mirror below
is historical. The ceilings are unchanged. Two 162,000-view sweeps peak at 59 calls / 2,090 triangles with loaded
models and 58 / 2,082 with fallback. Allocated attachments are 3,557,376 bytes at 1280 × 720, with two Three.js
textures. Current rendered measurements and the mirror schedule are in `docs/PERF.md` and `docs/3D-MIRRORS.md`.

**C-17 measurement correction:** use the corrected C-17 texture figures below. Earlier Phaser texture estimates in this document used source metadata that can remain 1×1 for resized text canvases; they undercounted text. The benchmark now measures intrinsic image/canvas dimensions. Low uses native-resolution text at the same font size and a vector handheld case to keep the existing ceilings; High rendering is unchanged. Draw-call, triangle and Three.js target measurements are unaffected.

**C-17 follow-up:** the historical C-16 texture figures below undercount Phaser Text because source dimensions can remain 1×1 after canvas resizing. They cannot establish the 4 MiB limit. The ready `codex/c17-sound` tree includes C-16, the intrinsic-canvas counter and Low text/vector-case fixes; review/test that combined tree before publishing. Draw-call, triangle and Three.js-target figures remain valid.

C-12 accessibility measurement (16 October 2026): with larger text, the colour filter and reduced motion enabled together, seven selected depot, mirror, driving-hazard, snow and doorstep views still peak at 48 calls, 2,084 triangles, two Three.js targets and 3,575,808 attachment bytes. The Phaser texture estimate peaks at 3,956,310 bytes including mipmaps. No page errors or context loss occurred. Report: `docs/qa/c12-low.json`. The colour matrix runs in the existing main/mirror composite shaders; keyboard focus uses native graphics, and wrapping handheld choices reuses their existing button textures. No additional 3D pass or image texture was introduced. The software renderer does not establish the Intel laptop's 60 fps floor.

The pilot targets 60 fps on the owner's Intel integrated-graphics laptop. This resource budget is a regression ceiling. The latest merged-pilot resource measurements are in the final section. The native C-5 Edge run below passed 60 fps on the earlier route; O-1 still needs a native measurement of the expanded five-stop day.

At a 1280 × 720 drawing buffer, the low setting renders the world at 832 × 468 (65% in each dimension), with a 320 × 180 mirror only while requested. The mirror target remains allocated while hidden. There are no shadow maps, postprocessing passes or downloaded 3D textures. The world uses shared box geometry and instanced static scenery; high quality adds trees and increases target sizes.

| Three.js resource per complete frame | Measured peak | Regression ceiling |
| --- | ---: | ---: |
| Draw calls, including mirror and composite | 53 | 64 |
| Submitted triangles, including instancing and composite | 1,636 | 2,500 |
| Allocated render-target textures after mirror use | 2 | 2 |
| Color and depth attachment estimate | 3,575,808 bytes (3.41 MiB) | 4 MiB |
| Phaser texture RGBA8 estimate, including full mip chains | 3,640,038 bytes (3.47 MiB) | 4 MiB |
| Combined texture/attachment estimate | 7,215,846 bytes (6.88 MiB) | 8 MiB |

The attachment estimate allows 4 bytes per color pixel plus up to 4 bytes of depth. It includes both allocated targets even with the mirror off. It excludes driver alignment, back buffers, geometry, shader programs and Phaser textures. The 3D world has no image maps; its two textures are the world and mirror targets. Phaser draws the HUD and handheld separately. The benchmark reports a separate inventory of Phaser source textures as RGBA8 base levels and a conservative full-mipmap estimate; that is not a driver memory measurement.

The native run found 83 unique Phaser texture sources, 2,730,028 bytes at RGBA8 base level. Counting a full mip chain for every source gives the upper estimate above, although many canvas textures do not use mipmaps. The combined ceiling concerns only these inventoried textures and attachments, not total GPU-process memory.

`view.diagnostics` is one preallocated object updated with numeric counters. Three.js resets its render counters once per complete frame, so mirror and composite submissions are included. The benchmark observes the previous completed frame and records maxima throughout each ten-second sample. No diagnostic arrays or objects are created in the game render loop.

| Low-graphics sample | Draw calls | Triangles | Software average fps | Software worst 1% fps |
| --- | ---: | ---: | ---: | ---: |
| Hub | 13 | 146 | 70.29 | 53.73 |
| Depot | 44 | 1,262 | 62.04 | 50.11 |
| Cab | 32 | 1,106 | 60.98 | 46.57 |
| Mirror | 53 | 1,636 | 57.09 | 46.33 |
| Handheld | 44 | 1,262 | 53.17 | 43.57 |
| Barcode aiming | 44 | 1,262 | 51.93 | 43.89 |
| First stop | 24 | 998 | 60.04 | 47.46 |
| Doorstep | 17 | 770 | 51.78 | 42.05 |
| Returns | 15 | 506 | 56.46 | 45.98 |

Measured 14 October 2026 on the C-5 branch at 1280 × 720, low graphics, Edge with ANGLE SwiftShader. All nine samples completed without page errors or WebGL context loss. These software frame rates do not establish the Intel laptop's performance. Raw report committed at `docs/qa/c5-software-low.json`.

A second run omitted the SwiftShader flags. Edge reported `ANGLE (Intel, Intel(R) UHD Graphics (0x0000A7A8) Direct3D11 vs_5_0 ps_5_0, D3D11)`. All nine samples averaged 144.03–144.11 fps; the worst-1% averages were 127.44–134.41 fps. The same resource peaks passed the ceilings. No page errors or context loss occurred. Report: `docs/qa/c5-native-low.json`. This is a native GPU measurement of ten-second static benchmark viewpoints with live actors, not a long interactive driving session, a fullscreen measurement or a CPU/GPU isolation profile.

## Reproduce and verify on the laptop

Start the training server on port 8302. Run one browser benchmark at a time. In PowerShell:

```powershell
$env:QA_BROWSER = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
$env:QA_GFX = 'low'
$env:QA_PROTOTYPE_ONLY = '1'
$env:QA_NATIVE_GPU = '1'
$env:QA_TAG = 'intel-low'
$env:QA_FPS_FLOOR = '60'
node test/fpbench.js
```

Check the saved report's `renderer.name`: it must identify the Intel GPU, not SwiftShader, a software rasterizer or a different GPU. Record power mode, browser version and whether other GPU workloads were running. The optional floor checks both the average and worst-1%-frame averages; frame time at 60 fps is 16.67 ms. The report is saved even if a resource or fps check fails. With no `QA_FPS_FLOOR`, the benchmark checks resources and context health without claiming hardware acceptance. Without `QA_NATIVE_GPU=1`, it requests SwiftShader for repeatable functional checks.

The low resource ceilings apply to the fixed 1280 × 720 benchmark viewport. A larger drawing buffer increases target memory quadratically; it needs its own measurement. A hardware miss within these ceilings calls for profiling CPU frame work, fill rate, HUD texture uploads and the mirror before increasing or lowering a budget. Do not use software fps to make that decision.

## C-7: five generated stops and the town grid

The same ceilings apply to the full route. `test/fpbench.js` now samples all five generated curb positions and a live mirror at each, as well as the depot, cab, scanner, doorstep and return desk (18 viewpoints). On 15 October 2026, the cloud SwiftShader run peaked at 46 calls, 1,354 triangles, two target textures and 3,575,808 attachment bytes. The Phaser full-mipmap estimate was 3,639,686 bytes; combined estimate 7,215,494 bytes. No page errors or context loss occurred. Raw report: `docs/qa/c7-software-low.json`. Software FPS is not evidence of the Intel laptop's 60 fps floor; O-1 still needs the owner's measurement on the expanded route.

Road markings use shared horizontal planes. Static scenery uses preallocated instance buffers, updated after moving three metres; low graphics keeps nearby scenery within 55 metres, high within 95 metres, with matching fog. Interactions follow the walking player as well as the van. Closed cargo hides its enclosed parcels. No new image textures or render passes were added. `test/fproute.js` also checks complete-frame visible submissions at every stop across 30 generated days, with both depot and loaded cargo, including the mirror.

## C-11: weather and route-day messages

The four generated weather conditions use existing sky/fog/material colours. Rain/storm and snow add one preallocated instance batch (18 shared boxes on low; 36 on high); no image textures or render passes. Low graphics limits small parcel detail to eight metres while in the cab, retaining twenty metres on foot; high retains twenty metres in the cab. This leaves room for weather and the C-10 actors together. Physical parcel interactions still require getting out.

The 15 October cloud run samples the depot plus live-mirror rain, storm, snow and heat views: 42 peak calls, 1,288 triangles, two targets, 3,575,808 attachment bytes and 3,639,686 bytes for Phaser's full-mipmap estimate. No errors/context loss. Report: `docs/qa/c11-software-low.json`. `test/fpday.js` also checks all five curb views and the depot approach in every weather condition with a live mirror. The benchmark configures C-10 actors too when that module is present. The native Intel floor still needs O-1.
## C-10: live bus and emergency vehicle

The 15 October cloud run passes all 18 existing route viewpoints and three new hazard viewpoints. The corrected live-mirror hazard fixture (simulation frozen without pausing the mirror) peaks at 60 complete-frame calls and 1,598 triangles, including both solid vehicles and flashing lamps. Attachments remain 3,575,808 bytes, two target textures; the Phaser full-mipmap estimate remains 3,639,686 bytes. No page errors or context loss occurred. Reports: `docs/qa/c10-software-low.json` and `docs/qa/c10-hazards-software-low.json`. The first report's paused hazard mirror is superseded by the second report. Native Intel acceptance remains O-1.

`test/fproute.js` includes active hazards, loaded/depot cargo and a live mirror at every curb position over 30 generated days. New vehicles reuse box geometry, instanced colour groups and the existing mirror; no image textures or render passes were added. `QA_VIEWS=hazardsfront,hazardsmirror,hazardswalk` can restrict benchmark sampling to changed viewpoints; every selected sample still lasts ten seconds.

On 16 October, the merged C-8/C-10/C-11 tree passed seven live hazard/weather views at 48 calls and 1564 triangles. Both road actors, the sixth package and weather are configured together. Attachments and Phaser estimates stay within the same ceilings; report: `docs/qa/c11-pilot-low.json`.

## C-9: doorstep situations

The 16 October combined C-8/C-9/C-10/C-11 run passes nine weather, gate, hazard, live-mirror, signature and ID views. Peak complete-frame submissions are 48 calls / 2,084 triangles. The two targets still use 3,575,808 attachment bytes. Phaser's largest observed full-mipmap estimate is 3,956,310 bytes (3.78 MiB), including the existing signature pad and live ink. The benchmark records Phaser inventories per view so closing the handheld cannot hide that peak. No page errors or context loss occurred. Raw report: `docs/qa/c9-combined-low.json`; cloud SwiftShader FPS does not establish the Intel 60 fps floor (O-1).

Residents use one preallocated coloured instance batch, with three body parts on low graphics and four on high. Gates, dogs and path patches reuse box geometry and shared materials, with bounded visibility; the ID comparison uses native Phaser Graphics. There are no new image assets or render passes. The 30-day route geometry test configures all four model extensions, the extra package, active road actors and every contacted resident before checking every stop with a live mirror.

## Merged pilot: all milestone 3 features

On 16 October 2026, `pilot` at `d3330dd` passed all 30 prototype viewpoints in the low-graphics benchmark at 1280 × 720. This includes the five generated curb positions and their live mirrors; depot, cargo/scanning and return views; both road hazards; rain/storm/snow/heat; and dog gate, path hazard, signature and photo-ID views. The weather and doorstep fixtures configure the full route, load-out extra, road actors and doorstep props together. Each selected viewpoint samples ten seconds.

| Complete-frame resource | Merged-pilot peak | Ceiling |
| --- | ---: | ---: |
| Draw calls, including mirror/composite | 48 | 64 |
| Submitted triangles | 2,084 | 2,500 |
| Render-target textures | 2 | 2 |
| Color/depth attachment estimate | 3,575,808 bytes | 4 MiB |
| Phaser RGBA8 full-mipmap estimate | 3,956,310 bytes | 4 MiB |
| Combined attachment/Phaser estimate | 7,532,118 bytes | 8 MiB |

The largest Phaser inventory contains 92 sources, with 2,967,232 RGBA8 base-level bytes; it includes the existing signature pad and ink. No page errors or WebGL context loss occurred. Raw report: `docs/qa/pilot-merged-low.json`. Chromium identified ANGLE SwiftShader: its software frame rates do not establish Intel acceptance. O-1 should use the reproduction command above with `QA_NATIVE_GPU=1` and `QA_FPS_FLOOR=60` on the owner's laptop.

## C-13: company appearance

On 16 October 2026, the custom company theme with a local logo and larger text/colour/reduced motion passed seven low viewpoints: peak 50 calls, 2,112 triangles, two Three.js target textures and 3,575,808 attachment bytes. The Phaser full-mipmap estimate reached 3,257,168 bytes (3.11 MiB), including the single 256 × 64 company-logo canvas; combined estimate 6,832,976 bytes (6.52 MiB). The handheld skin repaints its existing canvas. Its page backgrounds use native graphics and release generated images only when no other scene references them: opening the home, scanning and changing eight header colours no longer retains a full canvas per colour. Livery and sleeves reuse shared flat materials; company labels use the existing Phaser overlay. No errors or context loss occurred. Report: `docs/qa/c13-low.json`. These remain software resource checks; native Intel acceptance is still O-1.


## C-15: first-time guidance and translated handheld headers

On 16 October 2026, four selected low views (guide, barcode aiming, live doorstep mirror and signature) with the company logo and larger text/colour/reduced motion peak at 50 calls, 2,112 triangles, two Three.js target textures and 3,575,808 attachment bytes. Phaser's full-mipmap estimate peaks at 3,257,168 bytes; combined estimate 6,832,976 bytes. All ceilings pass with no page errors or context loss. Report: `docs/qa/c15-low.json`. The guide, growing translated panel rows, wrapped handheld footer and header use native text/graphics; no new world geometry, image maps or render passes were added. The language-list layout runner passes 216 selected layouts in all 12 languages at normal/larger text with Noto script fonts; C-15's new whole sentences await Claude's translation pass. These four views check the changed UI and existing peaks; the requested full benchmark of merged pilot follows C-15's merge. SwiftShader FPS does not establish the native Intel 60 fps floor (O-1).


## C-16: rendering headroom after merged C-15

On 16 October 2026, the full 31-view Low benchmark of the performance branch over merged pilot `208465f` passes at 42 peak complete-frame calls, 2,160 triangles, two targets, 3,575,808 attachment bytes and 3,169,803 Phaser full-mipmap-estimate bytes (combined 6,745,611 bytes). This includes all five stops/mirrors and every weather/doorstep view. The matched seven-view peak falls from 50 to 42 calls on Low and from 69 to 52 on High; source geometry stays at 6,532 bytes. Instancing solid-only shapes and compatible details adds about 3.5 KiB of instance buffers and slightly increases submitted offscreen triangles, without reducing quality. Pixel comparisons have six exact matches and at most eight changed edge pixels in either live-mirror frame. No errors/context loss. Reports and reproduction are in `docs/PERF.md` and `docs/qa/c16-*.json`. Claude confirmed on 16 October 2026 that Low and High remain the only presets; no Medium preset will be added. These remain software resource checks; native Intel acceptance remains O-1.


## C-17: sound and corrected canvas accounting

On 16 October 2026, the full **32-view Low** run with a running real AudioContext, a company logo, larger text, colour filtering and reduced motion passes at **42 calls / 2,160 triangles**, **two targets**, **3,575,808 attachment bytes** and **3,130,726 Phaser bytes** (the conservative full-mipmap estimate). Combined attachments plus Phaser estimate: **6,706,534 bytes**. No page errors or context loss. Report: `docs/qa/c17-low.json`.

The texture counter now uses intrinsic image/canvas dimensions, not stale `TextureSource.width/height` metadata. Earlier estimates undercounted text. Low now uses 1x text canvases at the same on-screen font size and a vector handheld case with native company-name text; High retains its existing 2x text and painted case. No ceiling was raised. The header wraps sound captions and moves the mirror below them without adding a render pass or image texture. The audio controller owns at most six nodes and releases them on scene shutdown.

Reproduce with `QA_SOUND=1 QA_GFX=low QA_PROTOTYPE_ONLY=1 QA_TAG=c17-final QA_A11Y=large,colour,reduced node test/fpbench.js`; the retained report also includes the Example Two theme and an embedded 256 × 64 test logo supplied through `QA_THEME`. SwiftShader FPS is software evidence only; native Intel 60 fps remains the owner's O-1 check.

The 288-layout audit opens each named panel afresh in all 12 languages at normal/larger text, checks overlap/readability and applies the corrected texture gate on every page. Peak Phaser estimate is **3,386,592 bytes**; the combined six-cue caption canvas peaks at **267,680 RGBA bytes**. `docs/qa/c17-layouts.json` retains the results. Three focused High views also pass with no errors/context loss (`docs/qa/c17-high.json`); High is outside the Low resource ceilings.


## C-18: later-day weather and road works

On 16 October 2026, 3,000 CPU complete-frame geometry checks cover 30 workdays × ten variants × five stops × empty/loaded extra cargo, with bus/siren and mirrors. They peak at **53 calls / 2,480 triangles**, within the original 64/2,500 ceilings. The matching real WebGL stress view (day 18, variant 2, stop 5, loaded) confirms the same counters. The final three-view Low gate adds fog/closure and planning, with real audio, larger text, colour filtering and reduced motion: **two targets**, **3,575,808 attachment bytes**, **3,145,958 Phaser full-mipmap-estimate bytes** (combined **6,721,766 bytes**), no errors or context loss. A preceding nine-view weather gate also covers both closure approaches, rain/ice mirrors, signature and the existing doorstep peak; its only later UI change is the shorter, wrapped closure caption, checked in the final gate.

Low's new closure is a two-piece block/cap; later-day rain uses twelve particles. High retains the new rail/legs and 36 particles. Day one and existing checkpoints retain their original rendering. The world uses the same shared source geometry and two composites; no new image, shadow or render target was added. The single closure caption wraps at full readable size and is visible from either approach. The 96 planning layouts and four English/Tamil caption layouts check actual canvas memory; their peak is 3,038,928 bytes.

Reports: `docs/qa/c18-geometry.json`, `c18-weather-low.json`, `c18-low.json`, `c18-high.json`, `c18-layouts.json`, `c18-road-layouts.json`. Reproduce with `QA_LATER=1 node test/fproute.js` and `QA_SOUND=1 QA_GFX=low QA_PROTOTYPE_ONLY=1 QA_TAG=c18 QA_A11Y=large,colour,reduced QA_VIEWS=laterfogmirror,laterplan,laterstress node test/fpbench.js`. The existing Intel O-1 check remains; cloud SwiftShader FPS is not native performance evidence.
