# Low-graphics 3D workday budget

The pilot targets 60 fps on the owner's Intel integrated-graphics laptop. This resource budget is a regression ceiling. The native headless Edge run below passed 60 fps on Intel UHD Graphics at the benchmark viewport; the owner's interactive check remains useful for full-screen behavior and sustained use.

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
