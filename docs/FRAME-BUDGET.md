# Low-graphics 3D workday budget

**C-52 road visibility review correction (28 October 2026):** lowering the common instrument face 4 cm restores the existing 23 m road pixel; native lighting sum differences are +21.72 Low and +20.38 High against the unchanged +12 test. On pilot `9105e301` plus pushed B-181 and the C-52 visual patch, all **40 focused resource views**, **392 native checks** and **1,176 strict normal/larger language views** pass. Peaks (calls / triangles / Three textures / attachment bytes / Phaser estimate): loaded Low **53 / 1858 / 2 / 3557376 / 2074422**, High **76 / 122843 / 4 / 11239424 / 6830182**, accessible Low **53 / 1858 / 2 / 3557376 / 2528230**, fallback Low **47 / 1654 / 2 / 3557376 / 2074422**. Original ceilings, fixtures and road sample remain. The inherited benchmark hub-only wrapper closing brace is repaired; native/language runtime is identical across the two attempts. Exact sources, failures, captures, manual review and cleanup: `docs/review/set-10/c52-road-followup/README.md` and `verification.json`. Earlier broad results retain their original scope; cloud FPS does not certify Intel 60 fps (O-1).

**C-52 cab and device appearance (22 October 2026):** all 224 resource views pass on candidate `7dcbd2b6`, carrying current pilot and the pushed B-164/C-49/C-50/C-51 stack. loaded-low **53 / 2402 / 2 / 3557376 / 2623766**; loaded-high **113 / 240133 / 4 / 11239424 / 7947600**; accessible-low **53 / 2402 / 2 / 3557376 / 2946992**; fallback-low **53 / 2168 / 2 / 3557376 / 2371462** (calls / triangles / Three textures / attachment bytes / Phaser estimated bytes). Ceilings are unchanged. Native instrument/device checks, normal/larger layouts in all 12 languages on Low and English/Tamil on High, controls, delivery layouts, narration, theme cleanup, sign/selector clearance and both geometry sweeps pass. Exact source scopes, reports and screenshots: `docs/review/set-10/c52-acceptance/manifest.json`. Cloud FPS does not certify Intel 60 fps (O-1).

**C-52 partial resource progress (22 October 2026; not final acceptance):** candidate `7dcbd2b6`, runtime/fixture `f5d4ab68`, passes the first 130 of 224 rendered views: loaded Low **53 calls / 2,402 triangles / two Three textures / 3,557,376 attachment bytes / 2,623,766 Phaser estimate bytes**, and loaded High **113 / 240,133 / four / 11,239,424 / 7,947,600**. The original ceilings stay unchanged. Both raw reports were independently revalidated. The accessible and missing-model profiles continue separately. High sign clearance passes all 240 approaches and 192 first-day poses; both 285,600-view geometry sweeps pass at 60/2,436 loaded and 59/2,196 fallback. Reports, logs and exact source hashes: `docs/review/set-10/c52-resource-progress/manifest.json`. These resource/geometry results do not certify native Intel FPS (O-1).

**C-51 visible people (22 October 2026):** all 224 current-pilot resource views pass on candidate `055415cf`, carrying B-164/C-49/C-50 and owned runtime `32623203`. loaded-low **53 / 2402 / 2 / 3557376 / 2623766**; loaded-high **113 / 240133 / 4 / 11239424 / 7947600**; accessible-low **53 / 2402 / 2 / 3557376 / 2946992**; fallback-low **53 / 2168 / 2 / 3557376 / 2371462** (calls / triangles / Three textures / attachment bytes / Phaser estimate bytes). Ceilings are unchanged. Two High uploaded adults and up to four benches use no additional texture; Low adds a bounded silhouette only after collision-bearing cars have their original budget priority. All final repository, source-equivalence, native people/asset/actor/town and loaded/fallback geometry checks pass. Exact commands, figures, hashes and screenshots: `docs/review/set-10/c51-acceptance/manifest.json`. Cloud FPS cannot certify Intel 60 fps; O-1 remains.

**C-51 geometry progress (22 October 2026; full rendered gate pending):** corrected runtime `32623203` passes 285,600 loaded and 285,600 missing-model Low CPU views on current-pilot candidate `281bb8b5`, peaking at **60 calls / 2,436 triangles** and **59 / 2,196**. The original 64 / 2,500 ceilings stay unchanged. Test-only fixture `bf37a0cb` retains generated weather and uses the real departure adapters; all 10 world tests include the exact nine actual benchmark setups and their resume checks. The 17 new resource views and complete 224-view rendered gate run separately on candidate `055415cf`; no final render/memory peak or native Intel FPS is claimed here. Evidence: `docs/review/set-10/c51-geometry-progress/manifest.json`.

**C-51 progress (22 October 2026, not acceptance):** two uploaded adult rigs and the unchanged Furniture Kit bench add 222,124 High-only download bytes, with palette RGB baked into vertices and no new image texture. Low requests none of these files. The corrected selector funds collision-bearing parked cars before reserving optional people. Final current-pilot acceptance is running; no final peak is claimed here and the Low/High ceilings stay unchanged. Nine world integration checks, six rig checks, six pure controller checks, 15 resource-contract guards and exact source-equivalence/reproduction pass. Evidence: `docs/review/set-10/c51-progress/manifest.json`. Intel FPS remains O-1.

**C-50 physical sign lettering (22 October 2026):** all 207 current-pilot resource views pass on base `573b0f4d` plus owned runtime `6ff88c94` / fixture `4cd7a344`, carrying B-164 and C-49. loaded-low **53 / 2402 / 2 / 3557376 / 2623766**; loaded-high **107 / 235915 / 4 / 11239424 / 7947600**; accessible-low **53 / 2402 / 2 / 3557376 / 2946992**; fallback-low **53 / 2156 / 2 / 3557376 / 2371462** (calls / triangles / Three textures / attachment bytes / Phaser estimate bytes). Unchanged ceilings. The 157 ink, 83 reading and 50 High town checks, plus 504 language and text size views, pass. The 78 repository suites include one unchanged isolated route-day rerun after 77/78 in the batch. Exact source, raw reports and screenshots: `docs/review/set-10/c50-acceptance/manifest.json`. Cloud FPS does not certify Intel 60 fps; O-1 remains.

**C-49 progress (22 October 2026, not acceptance):** 120 native checks pass for actual uploaded surface pixels, missing-image/Low behavior, High model fallback and exact culling. The High atlas owns **8,388,608 base RGBA bytes** (at most **11,184,811** with mipmaps) and one additional Three texture; Low requests none of the five JPEGs and creates no atlas. Existing Low/High ceilings stay unchanged. Full combined resource measurements are still running and no final peak is claimed here. Frozen source, screenshots, reports and the shared credits blocker: `docs/review/set-10/c49-progress/manifest.json`. Intel FPS remains O-1.

**C-48 cab acceptance (21 October 2026):** 207 complete fixed resource views pass unchanged ceilings. Loaded Low and accessible Low peak at **53 calls / 2,402 triangles / two textures / 3,557,376 attachment bytes**, with estimated Phaser maxima **2,740,246 / 3,123,238 bytes**. Missing-model fallback: **53 / 2,156 / two / 3,557,376 / 2,638,592**. High: **107 / 235,915 / three / 11,239,424 / 9,087,536**. Wider cab/mirror framing, lamp target separation and aligned mirror wear add no image map or reflection pass. Raw evidence and source scopes: `docs/review/set-10/c48-accepted/manifest.json`. Native Intel FPS remains O-1.

**C-32 traffic with C-31 navigation (19 October 2026):** all 91 baseline and 18 final traffic resource views pass. Later Low uses two procedural children, four crossed bicycle profiles in an existing batch, shared signal surfaces and a 180-triangle town-decoration allowance. No new asset, texture, target or pass. Full 264,000-view loaded/fallback sweeps peak at **62 / 2,410** and **57 / 2,088** calls/triangles. Original ceilings are unchanged. Raw figures and screenshots: `docs/review/set-9/c32.md`.

**C-30 signs (18 October 2026):** the existing route-plane batch holds at most five signs per Low view,
adding at most 20 triangles including a reflection, without another draw call, texture, target or pass.
All 57 fixed resource views pass unchanged ceilings. Full signed 264,000-view sweeps peak at **63 calls /
2,492 triangles** loaded and **56 / 2,072** fallback. Five reused normal/larger text objects bound readings.
Figures, screenshots, clip, raw reports and reproduction: `docs/PERF.md`, `docs/review/set-8/c30.md`.
Native Intel 60 fps remains O-1.

**C-29 fixed quality gate (18 October 2026):** `node test/fpquality.js` now runs fixed
loaded Low/High, accessible Low and actual missing-model Low profiles, with 46 retained views.
The original Low ceilings stay unchanged. High's separate review ceilings are 128 calls,
300,000 triangles, four Three textures, 16 MiB attachments and 16 MiB estimated Phaser textures;
see `docs/3D-QUALITY-GATE.md`. These are regression ceilings, not native FPS acceptance.
High mirror housings move behind their reflective faces; no render resources are added. Final per-profile figures, raw reports and screenshots:
`docs/PERF.md` and `docs/review/set-8/c29.md`. Native Intel 60 fps remains O-1.

**C-47 compact display (18 October 2026):** the physical dashboard/handheld replace full-width
bars without adding any Three geometry, texture, target or pass. Fourteen rendered Low views and
four larger/colour/reduced views peak at **56 calls / 2,400 triangles / two textures / 3,557,376
attachment bytes**. Estimated Phaser maxima are **2,966,288 / 2,744,118 bytes**. High passes its
separate four-view gate. Every requested view is sampled; no ceiling changes. C-28's unchanged CPU
world sweep remains 63 / 2,480. Reports and matched captures: `docs/review/set-8/c47.md`. Native FPS is O-1.

**C-28 van/people update (18 October 2026):** loaded and procedural-fallback sweeps now include
standing behind and inside open cargo, for 264,000 complete-frame views each. Peaks are
**63 calls / 2,480 triangles** loaded and **56 / 2,058** fallback. Parcel/shelf batching, Low
surface details and main-view per-instance culling keep the original ceilings. Eight Low pixel
comparisons against disabled frustum tests are exact; High retains offscreen shadow casters.
Final rendered Low (30 views) and reduced Low (four) peak at **56 calls / 2,400 triangles**,
two textures / 3,557,376 attachment bytes; estimated Phaser maxima are 3,045,024 / 2,381,510 bytes.
High's nine-view gate passes separately. All requested views must now be sampled to pass.
Source and pose limits are in `docs/3D-ACTORS.md`; rendered gates, screenshots and review evidence
are in `docs/PERF.md` and `docs/review/set-8/c28.md`. The native Intel O-1 check remains outstanding.

**C-27 town update (17 October 2026):** static per-instance colour batching recovers calls before
adding art: the loaded 240,000-view sweep first falls to 48 calls / 1,890 triangles. With all town
templates, it peaks at 58 / 2,306; fallback peaks at 47 / 2,266. Low selects nearby detail within a
290-triangle allowance and keeps procedural distant buildings. Twenty-two rendered Low samples
peak at 57 / 2,306, two textures, 3,557,376 attachment bytes and 2,600,662 estimated Phaser bytes.
Three reduced-motion views also pass. Every existing ceiling below remains unchanged. High uses
source-detail models; its figures are recorded separately in `docs/PERF.md`. No image texture or
additional render pass is added. Review evidence: `docs/review/set-8/c27.md`; native Intel FPS remains O-1.

**C-26 visible-weather update (17 October 2026):** two 240,000-view loaded/fallback sweeps peak at
64/63 calls and 1,886 triangles. Soft precipitation quads replace the old cubes; breath and wheel spray
reuse the same bounded batch. Wet/snow/ice surface shaders allocate no textures or reflection targets.
The windscreen adds one main-view call/two triangles and is excluded from mirrors. Ten rendered Low
views peak at 63 calls / 1,888 triangles, two Three.js textures, 3,557,376 attachment bytes and
2,580,838 estimated Phaser texture bytes. Reduced motion also passes. All existing ceilings remain
unchanged. Details: `docs/PERF.md`; screenshots, clip and reports: `docs/review/set-8/c26.md`.
The native Intel frame-rate check remains O-1.

**C-24 rear-camera update (17 October 2026):** reverse uses the spare quarter of the C-23 atlas and alternates
rear/mirror updates, still at most one reflection pass per frame. Attachment allocation and the two-texture
ceiling are unchanged. Two 240,000-view loaded/fallback sweeps peak at 61/60 calls and 2,120 triangles; 324
practice-space views peak at 49 calls / 1,014 triangles. The ceilings below remain the gate; current rendered
figures are in `docs/PERF.md` and evidence is indexed in `docs/review/set-7/c24.md`.

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


### C-28: van and people

The 264,000-view loaded Low sweep peaks at **63 calls / 2,480 triangles**; fallback peaks at **56 / 2,058**.
It includes walking behind and inside open cargo. Parcels and shelf markers share instance batches;
Low uses surfaces for printing, livery and moving facade panels. Main-view instance culling retains
every visible pixel in eight comparisons, while High keeps its offscreen shadow candidates.
The new Low van has 190 triangles and each Low figure 88. CPU poses on ordinary meshes avoid a bone
texture; the existing main/reflection targets and pass schedule remain. The interior reflection keeps
the C-23 cab shell so the imported windshield does not obstruct the unchanged physical mirror camera.
Character distance/count limits and pose cadence are described in `docs/3D-ACTORS.md`; raw sweeps and
rendered resource gates are in `docs/review/set-8/c28.md`. No ceiling is raised. Native Intel 60 fps is O-1.
The final 30-view rendered Low gate peaks at 56 calls / 2,400 triangles / two textures /
3,557,376 attachment bytes / 3,045,024 estimated Phaser bytes. Four large/colour/reduced views
retain the same calls/triangles/attachments and peak at 2,381,510 Phaser bytes. High passes separately.

## C-34 damage and load (20 October 2026)

The pilot/C-32 and damage combination passes **285,600 complete-frame views per
CPU sweep**: loaded **64 calls / 2,449 triangles**, missing-model fallback **59 /
2,121**. Sweeps include full cargo, seven damaged zones, active traffic, cab
controls, mirrors/reverse, weather and lighting across 30 days and ten variants.
The worst loaded geometry is day 21, variant 10, stop 1, loaded cargo exterior,
right reflection. Damage/clearances share one bounded texture-free batch, at most
15 instances / 45 triangles per pass. Tire wear uses the actual imported wheel;
rear wear follows the cargo door. No texture, target, pass or ceiling is added.

All **127 rendered resource views** pass the strict four-profile gate:

| Profile | Views | Calls | Triangles | Three textures | Attachment bytes | Phaser bytes, mipmap estimate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| loaded-low | 48 | 56 | 2,412 | 2 | 3,557,376 | 3,379,819 |
| loaded-high | 33 | 107 | 235,653 | 3 | 11,239,424 | 8,571,952 |
| accessible-low | 23 | 56 | 2,412 | 2 | 3,557,376 | 3,442,016 |
| fallback-low | 23 | 53 | 2,090 | 2 | 3,557,376 | 3,104,582 |

Rendering/assets/HUD are frozen at `fee4d72`. The final pure adapter correction
at `2faa074` uses perpendicular-traffic bounds and omits unused successful-check
coordinates. Its actual-motor regression, affected 150-case batch and final
61-case adapter/workday/save batch pass. No rendering input, checkpoint field or
score type changes. The source is then rebased onto pilot `3fdfc22` at `b23d903`:
owned 3D code is byte-identical to `2faa074`; the additional changes are Claude's
B-68 packer, translations, corporate reports/trainer tools and review tools.
Source hashes, both delta patches and exact validation scopes are archived.

The final **58-suite repository set passes: 53 directly, five over local HTTP**
through the archived environment transport adapter. Chromium policy blocks those
legacy suites' file URLs; actual file-protocol launch is untested here. Assertions
and shared tests are unchanged. The full five-flow Low workday review set passes
on `b23d903`: workday-3d, workday-3d-b, workday-3d-c, workday-aids and drive-review.
Both SCORM package formats and current-catalogue i18n pass on this integration.

Earlier focused verification passes 35 isolated Node suites / 490 cases, Low/High
English/Tamil normal/larger damage matrices / 80 checks each, delayed reverse
warnings / 14 each, cargo practice / 68 and sound / 45. The expanded 130-day
cab/reverse/lighting resume/soak passes again on `b23d903`: **3,817 checkpoints,
240 SCORM round trips, 3,974/4,000 characters, no failures**. B-68's separate
worst-day damage/report fixture retains at least 300 characters of room.

Screenshots, raw reports, source/evidence hashes and the five-minute checklist:
[C-34 review](review/set-9/c34.md). New text is 14 player-facing sentences plus
two internal validation messages for Claude; the shared catalogue is unchanged.
Earlier progress archives retain their sources. Cloud SwiftShader FPS cannot
establish the native Intel 60 fps floor; the existing O-1 owner check remains.

Reproduce the sweeps with `QA_DAMAGE=1 QA_TRAFFIC=1 QA_NAV=1 QA_SIGNS=1 QA_LATER=1
QA_CAMERA=1 QA_CAB=1 QA_MIRRORS=1 QA_REAR=1 QA_LIGHTING=1 QA_WEATHER=1 QA_CARGO=1
QA_ASSETS=1 QA_TAG=c34-pilot-loaded node --test --test-isolation=none test/fproute.js`;
repeat with `QA_ASSETS=0 QA_TAG=c34-pilot-fallback`. The rendered gate is
`QA_BASE=http://127.0.0.1:8341 QA_TAG=c34-pilot node test/fpquality.js`.


### C-33 progress: physical stops (19 October 2026)

The unchanged Low ceilings hold in each 264,000-view native-plan CPU sweep at runtime
`b1d01d6`: loaded **59 calls / 2,398 triangles**, fallback **56 / 2,120**. Physical controls
and furniture share existing palette batches. Marked days use a 120-triangle decorative
town allowance; no new image, target or pass is added. Seven focused rendered views per
profile passed at earlier pre-polish `18d8658`; those 28 views are not the complete
101-view gate. Full rendered acceptance, High workflows and live locker policy remain
outstanding. Automatic approval review blocked the next browser commands because its
review model was at capacity. Exact scopes/figures: `docs/review/set-9/c33.md` and
`docs/PERF.md`. No FPS or finished-task claim; native Intel remains O-1.

## C-33 historical 101-view resource gate (20 October 2026)

The full 101-view `test/fpquality.js` gate passes at source `1e1c0db`, runtime
`b1d01d6`, superseding the earlier focused 28-view resource sample. Physical stops,
existing route/cab controls, all live mirror pixel probes, accessibility and missing
model files are checked. All profiles have zero browser errors and no lost contexts.

| Profile | Views | Calls | Triangles | Three textures | Attachment bytes | Phaser bytes, mipmap estimate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| loaded-low | 40 | 53 | 2,386 | 2 | 3,557,376 | 3,235,467 |
| loaded-high | 25 | 98 | 220,081 | 3 | 11,239,424 | 7,972,870 |
| accessible-low | 18 | 53 | 2,386 | 2 | 3,557,376 | 3,268,112 |
| fallback-low | 18 | 52 | 2,108 | 2 | 3,557,376 | 2,910,528 |

All ceilings are unchanged. Cloud SwiftShader checks resources, not native Intel
60 fps (the existing O-1 owner check). At that revision, locker policy and gameplay
validation were unresolved. Current policy and acceptance follow below.
[Raw reports, all 101 screenshots and source/evidence hashes](review/set-9/c33-complete/manifest.json).

Reproduce sequentially: `QA_BASE=http://127.0.0.1:8339 QA_TAG=c33-complete node test/fpquality.js`.

## C-33 combined resource gate (21 October 2026)

All **155 rendered views** pass in four profiles: native authorized later-day delivery
fixtures, located damage, traffic/navigation, live mirror pixels, running sound,
larger text/colour/reduced motion and actual missing-model fallback. No missing view,
page error or lost context occurs. The measured runtime is `220f2ba`; the current branch
retains pilot `da7bd3f`. Later changes correct one US spelling and remove an unused
six-pixel gap after the handheld choices. The owned handheld now releases unused
page shapes after clearing them; the new doorstep memory guard exposed four retained
signature-pad canvases. 3D rendering inputs, glyph sizes and canvas resolutions are
unchanged. Repeated doorstep tests check body/Back clearance and the same 4 MiB Low ceiling.

| Profile | Views | Calls | Triangles | Three textures | Attachment bytes | Phaser bytes, mipmap estimate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| loaded-low | 55 | 54 | 2,396 | 2 | 3,557,376 | 3,627,158 |
| loaded-high | 40 | 107 | 235,893 | 3 | 11,239,424 | 9,552,176 |
| accessible-low | 30 | 54 | 2,396 | 2 | 3,557,376 | 3,783,483 |
| fallback-low | 30 | 53 | 2,150 | 2 | 3,557,376 | 3,332,672 |

The repeated full CPU sweeps each cover **285,600 complete-frame views**: loaded
**60 calls / 2,443 triangles**, fallback **59 / 2,181**. A combined pre-fix view failed
at 2,510 triangles. Decorative town geometry is reduced to 60 triangles on combined
damage/stop days (120 on other marked days); High retains its detail. No resource
ceiling is raised. All cargo, damage zones, clearance posts, cab, camera, mirrors,
weather, lighting, actors and traffic remain present.

The 24 High English/Tamil normal/larger physical stop workflows pass **608 checks**.
The current-pilot audit passes 240 native sign approaches (3,113,414 estimated Phaser
bytes) and 540 larger-text language views. After correcting a trailing handheld gap
and releasing unused signature-pad canvases, the 394-check doorstep suite peaks at
3,192,507 Phaser bytes. HUD 186, scanner/signature layouts 8, themes 43, keyboard
accessibility 145, all ten page suites, the final required Node subset 125, all 33
changed-JS syntax checks and the current catalogue pass.

All five shared Low scenarios were run: workday-3d and workday-aids pass; the two
later-day variants fail their old handheld-only expectation, and drive-review fails
the Results-to-map click in unchanged shared source. Claude has the exact failures
and physical-stop helper recipe. The branch is ready for review with that shared-QA
gate and translation pass explicit; no all-green or merge-ready claim is made.

The older 101-view gate and pre-damage sweeps above belong to their original sources.
[Current review and remaining checks](review/set-9/c33.md),
[raw reports, captures and hashes](review/set-9/c33-release/manifest.json).
Cloud SwiftShader verifies resources; native Intel 60 fps remains O-1.

## C-35 complete frozen resource gate (21 October 2026)

All **179 rendered views** pass with product runtime `501fb82`. Each profile
checks live reflections, native richer stops, damage, traffic, sound and walkaround.
All ceilings remain unchanged.

| Profile | Views | Calls | Triangles | Three textures | Attachment bytes | Phaser bytes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| loaded-low | 61 | 54 | 2,396 | 2 | 3,557,376 | 2,778,774 |
| loaded-high | 46 | 107 | 235,893 | 3 | 11,239,424 | 8,902,512 |
| accessible-low | 36 | 54 | 2,396 | 2 | 3,557,376 | 3,067,056 |
| fallback-low | 36 | 53 | 2,150 | 2 | 3,557,376 | 2,549,552 |

[All 179 captures, raw reports, measured harnesses and hashes](review/set-9/c35-render/manifest.json).
After capture, the cargo regression was corrected by moving/narrowing only its
non-rendered rear inspection proxy. All 161 required cases and 24 changed-JS
syntax checks pass. Final real-key cargo/inspection checks, eight focused rendered cargo/rear views
and nine shared journeys pass; the following section records their source.
The 179-view figures retain their measured source. No Intel FPS claim; O-1 remains.


## C-35 final cargo target verification (21 October 2026)

The non-rendered rear proxy correction keeps cargo and inspection independently
selectable. All **eight focused rendered views** pass on product `d58a876`:

| Profile | Views | Calls | Triangles | Three textures | Attachment bytes | Phaser bytes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| loaded-low | 2 | 46 | 1,054 | 2 | 3,557,376 | 2,141,755 |
| loaded-high | 2 | 72 | 79,027 | 3 | 11,239,424 | 7,100,635 |
| accessible-low | 2 | 46 | 1,054 | 2 | 3,557,376 | 2,506,192 |
| fallback-low | 2 | 44 | 796 | 2 | 3,557,376 | 2,141,755 |

These check the actual cargo/rear ray IDs in the same unchanged ceilings; they
supplement the full 179-view gate at `501fb82`. The only later product delta is the
non-rendered rear target position/width. Final native cargo/inspection workflows
pass **658 checks**, including Tamil larger Low at **3,880,838 Phaser bytes**.
All **nine shared journeys pass** after the correction. They preserve existing
routes; positive new records are tested by the owned native workflows pending
Claude's B-99 helper. [Final captures/raw reports/scopes/hashes](review/set-9/c35-release/manifest.json).
Latest pilot `74cd60a` retains the owned rendering code unchanged and adds Claude's
save v2 and safety translation corrections. No resource ceiling changed. Cloud
SwiftShader does not measure the owner's Intel 60 fps requirement (O-1).


## C-36 frozen resource gate and current-pilot integration (21 October 2026)

All **183 views** passed at product `eb13629` before the C-35 merge:

| Profile | Views | Calls | Triangles | Three textures | Attachment bytes | Phaser bytes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| loaded-low | 62 | 54 | 2,396 | 2 | 3,557,376 | 3,619,878 |
| loaded-high | 47 | 107 | 235,893 | 3 | 11,239,424 | 9,552,176 |
| accessible-low | 37 | 54 | 2,396 | 2 | 3,557,376 | 3,783,483 |
| fallback-low | 37 | 53 | 2,150 | 2 | 3,557,376 | 3,327,531 |

[Exact reports, 183 captures and source hashes](review/set-9/c36-render/manifest.json).
Final cue checks pass 110 real-key assertions (Low Tamil larger / High English),
with Low Phaser memory at **3,789,531 bytes**. Actual glare changes 23,102 Low and
22,912 High pixels; reduced motion suppresses it. Combined model journeys pass
30 resumed days / 3,723 checkpoints, 100-day soak and 240 SCORM round trips.

Pilot `54d7a63` is now combined at `d44c7e6`, retaining C-35 walkaround, its cargo
proxy fix, translations and Claude's B-103 save correction. The expanded **207-view**
gate and current-pilot native/shared journeys are being repeated; the previous
183 views are not claimed for the combined build. The earlier shared batch passed
seven of nine flows, with two Results-to-debrief timeouts. Initial combined native
restore found a fixture that skipped walkaround departure; the fixture now invokes
the actual departure adapter. No production guard was weakened.

All four new heavy-save variants retain every pin and exact score on reload:
failed lights pack at 3,929/4,000 or 3,931/4,000; successful lights at 3,993/4,000
or 3,995/4,000. The latter still have little headroom and are reported to Claude.
No resource ceiling changed. Cloud SwiftShader cannot certify Intel 60 fps (O-1).
