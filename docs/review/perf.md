# Performance review (Intel UHD integrated GPU)

Tester area: **perf**. Tools: `test/tools/playd.js --port 9309 --gpu default`, real-time mode (`/mode?turn=0`).
Scratch scripts (in-page probes, not project code): `test/out/review/perf/` — `perfkit.js` (frame timing, GL call
counters), `gpukit.js` (EXT_disjoint_timer_query GPU time per frame and per display object), `fill.js` (raw WebGL
fill-rate probe), `proto.js` (bake / atmosphere-merge prototypes), `res.js` (lower internal resolution),
`reboot.js` / `boot.js` (restart the game with a different Phaser config), `hitch.js` (long-frame attribution).

GPU confirmed via `WEBGL_debug_renderer_info`:
`ANGLE (Intel, Intel(R) UHD Graphics (0x0000A7A8) Direct3D11 vs_5_0 ps_5_0, D3D11)`; context attributes
`antialias: true, powerPreference: "default"`; Phaser `maxTextures` = 16.

## Findings (written as they come; plan and summary at the end)

### What the "~8 ms nothing drawn" floor is

It is not work. With the Phaser loop asleep and the canvas hidden (no WebGL calls at all), `requestAnimationFrame`
still runs at only **124–126 fps (8.0 ms)** in this headless Edge on the Intel GPU; a raw WebGL `clear()`-only loop
gives the same 124.6 fps. It is the browser's frame cadence here, not game cost. Every "fps" number below is capped
at ~125 by it. On a trainee's 60 Hz screen the cap is 60 fps (16.7 ms), so what matters is how far each scene's
frame time is below 16.7 ms; anything above that drops to 30–45 fps with judder.

### Raw fill rate of this GPU

`fill.js` (plain WebGL, no Phaser, 1280x720, one textured full-screen quad per layer, premultiplied blending):

| test | antialias (MSAA) | frame ms | fps | GPU ms (timer query) |
|---|---|---|---|---|
| clear only | on | 8.0 | 124.6 | 1.6 |
| clear only | off | 8.0 | 124.8 | 1.8 |
| clear + 7 full-screen layers | on | 12.9 | 77.8 | 7.9 |
| clear + 7 full-screen layers | off | 9.6 | 104.0 | 8.0 |

So one full-screen blended layer costs ~0.9 ms of GPU time here (about 1 Gpixel/s: this Raptor Lake "UHD" part
reports as UHD, not Iris Xe, which usually means single-channel memory, typical of cheap company laptops), and MSAA
adds a resolve cost outside the timed draw (~3 ms/frame at 7 layers). Inside Phaser the same full-screen quad costs
1.3–1.9 ms (see the 16-sampler shader below).

`powerPreference: 'high-performance'` on a WebGL context does **not** move it to the RTX 2050: a context created
with `high-performance` (and `low-power`) in the same page still reports the Intel renderer. Chromium on Windows picks
the adapter for the whole GPU process at startup (the playd `--force_high_performance_gpu` switch, or the Windows
per-app Graphics setting for Edge/Chrome), not per context.

### Per-scene baseline on the Intel GPU (as shipped: MSAA on, 16 texture units)

Measured after the intro cards, 3–4 s averages, real-time mode. "GPU ms" is the timer-query time of Phaser's own
draw calls; frame time is longer by the MSAA resolve and the browser's compositing.

| scene (scenario) | fps | frame p50 ms | GPU ms | draws/frame | CPU update+render ms | biggest layers (GPU ms each) |
|---|---|---|---|---|---|---|
| Conversation (m3-missing, afternoon) | 48.8 | 20.0 | 15.2 | 4 | 0.1 + 0.3 | sky 1.9, vignette 1.8, tint rect 1.35, dark rect 1.35, hills 1.3, house 1.1, house front 1.0 |
| Conversation, storm (m4-storm) | 46.1 | 21.0 | – | 4 | 0.2 + 0.5 | same as above |
| Doorstep stop outside, walking (m5-pod, morning) | 48–55 | 17.4–20.9 | 16.5 | 5.5 | 0.1 + 0.3 | sky 1.9, vignette 1.8, tint rect 1.3, hills 1.3 |
| Doorstep stop, heat (m8-heat) | 45.0 | 21.7 | – | 7.5 | 0.1 + 0.4 | + a 3rd full-screen ADD rect (1.3) and a 14x glow (0.6); 5 blend switches |
| Doorstep stop, midday (m8-dog) | 55.5 | 17.8 | – | 4.5 | 0.1 + 0.4 | no tint/dark rects at midday, vignette still 1.8 |
| Pre-trip (m1-pretrip) | 56.9 | 17.0 | – | 5 | 0.1 + 0.5 | sky, vignette, tint rect, hills, van close-up |
| Driving drill (m1-driving) | 65.6 | 14.9 | – | 4 | 0.5 + 0.6 | vignette 1.8, road TileSprites |
| Town drive (route day, midday) | 65–67 | 14.8 | – | 4 | 0.2 + 0.5 | 442 display objects, 2 cameras, grass TileSprite 1.4, vignette 1.8 |
| Route planner (m1-route) | 68.4 | 14.1 | – | 4 | 0.0 + 0.5 | route_bg 2.2, map 1.3, 2 Graphics |
| Sort / lift / labels (m2-*) | 72.4 / 69.0 / 67.4 | 13.3–14.4 | – | 2–4 | < 0.6 | bg_warehouse 1.9 + a full-screen Rectangle over it 1.3 |
| Loading (m6-load) | 70.9 | 13.6 | – | 2 | 0.0 + 0.3 | cargo bay 1.9, a Graphics 1.9 |
| Pickup (m7-business) | 73.8 | 13.1 | – | 3 | 0.1 + 0.3 | interior 1.9 + its front layer 1.9 (both ~full screen) |
| Title | 63.8 | 15.2 | – | 4 | – | sky 1.9, hills 1.2, scrim 0.9 |
| Hub (module cards) | 50.0 | 19.6 | – | 13 | 0.0 + 1.0 | hub_bg 1.9, then ~1 ms per module card (panel + Graphics header + rows) |

CPU is never the limit: update + render is under 1 ms per frame everywhere, and draw calls are 2–8 per frame.
Every scene is **GPU fill-bound**: the cost is the number of full-screen (or nearly) layers, each 1.3–1.9 ms on
this GPU, plus a fixed ~4 ms for MSAA. Nothing re-rasterises text or refreshes canvas textures every frame (clock and
timer texts update once a second; the town HUD already only redraws on change).

### Why a Phaser full-screen quad costs 1.3–1.9 ms instead of 0.9 ms: the 16-sampler shader

With `maxTextures` 16 Phaser's multi-texture fragment shader picks the sampler with a 16-way if/else chain on the
texture id. Under ANGLE/D3D11 on Intel this is much slower per pixel than a single `texture2D`. Only a value of 1
removes the chain (Phaser then compiles a single-sampler shader); 2, 4 and 8 are no better than 16.

A/B in the conversation (MSAA already off), same session: maxTextures 16 → 60.1 fps; 1 → 68.2; 2 → 61.8; 4 → 60.0;
8 → 60.5; 16 again → 59.7. Draw calls rise from 4 to 35 per frame (still trivial on the CPU: render stays 0.25 ms).

### PERF-1: every new face, mouth or package texture freezes the game for 50–95 ms (GPU-backed 2D canvases)
- **Severity:** major (visible stutter in every conversation; the biggest "feel" problem found)
- **Where:** all scenes; worst in conversations (m3-*, m4-*, m8-incident) and doorstep talks, and in m2-sort as each
  new package appears.
- **Repro:** `op m3-missing`, load `perfkit.js` + `hitch.js`, then `window.__bg = __hk.frames(9000, 12)` and click
  through the conversation (Enter / Digit1 every 0.7 s), then read `window.__bg`.
- **Actual:** in 9 s of conversation, 9 frames of 50–94 ms, each one exactly a first-use `OTR.tex.make` of a rig
  expression texture (`rg_6crfuk_h_face_angry_open 173x202 80.9ms`, `..._mouth_angry_wide 93.2ms`,
  `..._face_annoyed_blink 91.7ms`, ...): 22 textures, 978 ms of main-thread time. In m2-sort each new package
  texture (`pkg_s_... 115x111`) costs 53–59 ms. Drawing them takes 0.1–0.3 ms; the time is all in
  `textures.addCanvas` → `texImage2D` from a canvas whose 2D context is GPU-accelerated, which forces a synchronous
  read-back behind the frames already queued on the (busy) GPU. Measured directly: uploading a 115x111 canvas costs
  68–75 ms with a default context and **0.2 ms** with `getContext('2d', { willReadFrequently: true })`.
  Phaser's own Text canvases already use `willReadFrequently` (setText uploads cost 0.2–1.8 ms), so only the game's
  textures are affected.
- **With the fix prototyped** (every 2D context `willReadFrequently`, game restarted in the page, `boot.js`):
  - the same 9 s of conversation made the same 22 textures in **9 ms total, no frame over 12 ms** (was 978 ms, 9
    frames of 50–94 ms);
  - m2-sort, 6 s of play: 4 package hitches of 54–67 ms → **none** (a new package texture costs 0.4 ms);
  - cold scene start (new game → scenario scene running; textures generated; frames over 50 ms):

    | scenario | start ms, now → fixed | tex.make total ms | long frames (sum ms) |
    |---|---|---|---|
    | m3-missing | 279 → 98 | 218 → 36 | 369 → 51 |
    | m5-pod | 312 → 115 | 247 → 48 | 301 → 104 |
    | m7-business | 275 → 106 | 210 → 38 | 266 → 166 |
    | m1-driving | 365 → 150 | 325 → 24 | 451 → 161 |
    | m2-sort | 214 → 93 | 147 → 21 | 205 → 55 |
- **Suspected cause:** `src/core/textures.js:83` `const ctx = canvas.getContext('2d');` — the single place every game
  texture is drawn (`OTR.tex.make`).
- **Suggested fix:** `canvas.getContext('2d', { willReadFrequently: true })` there. One line, no visual change (the
  canvas is rasterised by Skia on the CPU instead of the GPU; output is the same). Optionally also pre-warm each
  rig's expression set at scene create so nothing is generated mid-conversation.
- **Status:** fixed — `src/core/textures.js` `OTR.tex.make` gets its context with `{ willReadFrequently: true }`
  (WP0). It is the only place the game creates a 2D canvas; the new shape textures (PERF-2) use it too. Re-measured
  on the Intel GPU (m3-missing, 9 s clicked through, old `make` put back in the page for the A/B): 5 new textures
  cost 14.6 ms with the default context, 10 cost 4.1 ms with the fix. The GPU was far less loaded than during the
  review (see the WP0 Log), so the old path no longer produced 50–95 ms frames here, but the per-texture cost still
  fell about 7x. Pre-warming expressions was not needed.

### Prototypes, measured A/B in one session each (Intel UHD, real time)

All numbers are fps (frame p50 ms); "GPU" is the timer-query GPU time of Phaser's draws. Scripts in
`test/out/review/perf/`. The game was restarted in the page with a changed Phaser config for the config tests
(`reboot.js`), and patched live for the others (`proto.js`, `trim.js`, `res.js`).

**P1. MSAA off (`render: { antialias: true, antialiasGL: false }`).** `antialias` in `src/main.js` only sets texture
smoothing; `antialiasGL` (default true) is what asks for a 4x MSAA back buffer. Conversation: 48.7 (20.0) → **59.7
(16.1)** → back to 48.8 (20.0) with MSAA on again; GPU draw time unchanged (15 ms), the saving is the MSAA resolve
and per-sample blending. Town drive: 65.0 → **90.7** → 66.0. Visual cost: only edges of Phaser *Graphics* geometry
lose smoothing (sprites are textures with soft alpha edges and look identical). Checked at full size: route planner
lines and pins look the same; the town speedometer dial circle and gear badge show visible stair-stepping
(`town-off-crop.png` vs `town-on-crop.png`).

**P2. One texture unit (`render: { maxTextures: 1 }`).** See the shader finding above. Conversation (MSAA already
off): 60.1 → **68.2** → 59.7. With MSAA on: 48.8 → 54.4 (GPU 15.2 → 13.4 ms). Town drive: 65.0 → 70.5, draws go
4 → 124 per frame but CPU render time only 0.53 → 0.61 ms. No visual change.

**P1+P2 together (a two-line change in `src/main.js`)**, every scene, same states as the baseline table:

| scene | baseline fps | MSAA off + maxTextures 1 |
|---|---|---|
| conversation m3-missing | 48.8 | 65.4–68.5 |
| conversation, storm m4-storm | 46.1 | 66.1 |
| doorstep stop outside, walking m5-pod | 55 | 76.5 |
| doorstep stop, heat m8-heat | 45.0 (van view, after the card) | 58–64 (walking outside) |
| pre-trip m1-pretrip | 56.9 | 83.6 |
| driving drill m1-driving | 65.6 | 100.7 |
| route planner m1-route | 68.4 | 104.5 |
| sort / lift / labels | 72.4 / 69.0 / 67.4 | 111.9 / 99.2 / 100.7 |
| loading m6-load | 70.9 | 96.0 |
| pickup m7-business | 73.8 | 115.0 |
| town drive | 65.0 | 90.7 (MSAA off only); 101–103 (both) |
| hub | 50.0 | 89.4 |

**P3. Merge the three atmosphere overlays into one MULTIPLY image** (`__proto.atmos1`). The tint rectangle
(MULTIPLY, alpha 0.55), the darkness rectangle (normal, alpha `dark`) and the vignette (alpha 0.7/1) are all
multiplicative darkenings of the same pixels, so one 640x360 canvas holding
`(1 - a + a*tint) * (1 - dark) * (1 - vigAlpha * vignette(x, y))`, drawn full screen with MULTIPLY, gives the same
image with one pass instead of three (the darkness rectangle's tiny navy lift, `0x0A0A24 * dark`, is dropped: at
most 3–11/255 in storm, invisible in clear weather). Screenshots before/after are indistinguishable
(`dlg-base.png` / `dlg-bake-atm.png`, `heat-base.png` / `heat-atm1.png`).
Conversation (as shipped): 48.8 → **57.0** (GPU 15.2 → 12.4 ms) → 48.8. Heat stop (with P1+P2): 63.5 → **73.3** →
58. Also removes two blend-mode switches per frame (MULTIPLY and back). At midday there is only the vignette, so
nothing to merge there.

**P4. Bake the static background into one RenderTexture** (`__proto.bakeBack`, conversation: sky, hills
TileSprite, ground, house, tree, door, van, mailbox → one 1280x720 RT). Conversation (as shipped): 48.8 → **60.1**
(GPU 15.2 → 11.8 ms) → 48.7. With P3 as well: **72.2** (GPU 9.0 ms).
For walkable stops (`bakeWorld` + `bakeFar`: every scroll-factor-1 layer below the courier into one 2540x720 RT;
sky + parallax hills into one 1915-wide RT scrolling at the hills' factor 0.25, so the sky scrolls with the hills),
with P1+P2+P3: 76.5 → **87.5** while walking. Smaller gain than in conversations because the stop's layers overlap
less and the RT is full height, so its transparent top is now filled too.

**P5. Trim transparent margins of big layers** (`trim.js`: set the texture's base frame to its alpha bounding box
with `frame.setSize` + `frame.setTrim`, as a texture atlas does; objects keep their size, origin and position).
Pickup interior front layer `intf_*` (1640x700, only 5% of pixels visible, box 500x174): 73.2 → **90.0** fps, its
GPU time 1.86 → 0.28 ms. House front layer `housef_*` (900x700, 9% visible, box 31%): conversation 49.3 → 50.2.
Hills texture `far_*`: top 139 of 420 rows are empty (bbox 67%), but it is a TileSprite, so trim it by giving the
TileSprite the smaller height at the right y instead. Screenshots unchanged (`trim-b.png`, `pu-b.png`).

**P6. Lower internal resolution, CSS upscale** (`res.js`: drawing buffer W*f x H*f, projection kept at 1280x720,
canvas keeps its CSS size, input unaffected because Phaser maps pointers from the game size). Stop outside,
as shipped: 48 → **78.7** at 0.75 (960x540) → 48. Conversation as shipped: 0.75 → 78.6, 0.85 → 65.4. With P1–P4
on the stop: 87.5 → **129** (at the 125 fps cap). Visual cost: text and thin lines go visibly soft at 0.75
(`txt-100.png` vs `txt-075.png`): readable, but a step down. Keep as an automatic fallback tier, not the default.

**P7. `powerPreference: 'high-performance'`** (Phaser `render.powerPreference`, and a raw WebGL context, and a
WebGPU `requestAdapter`): all still the Intel GPU. It does not pick the RTX on this dual-GPU Windows laptop. The
browser picks one adapter for its whole GPU process at start-up; only the Windows per-app graphics preference
(Settings → System → Display → Graphics → Microsoft Edge / Chrome → "High performance") or the NVIDIA control panel
changes it. Worth a line in the deployment notes for IT (it roughly doubles fps on laptops that have a discrete GPU),
but the game must be good on integrated graphics anyway. Setting it in the config is harmless and may help on macOS.

**Tried, no gain:** drawing the opaque sky with blending off (custom `[ONE, ZERO]` blend mode): 49.0 → 49.1.
maxTextures 2/4/8: same as 16.

**P8. `render: { clearBeforeRender: false }`.** Every scene starts with an opaque full-screen picture (sky, warehouse,
map, interior, grass), so Phaser's per-frame clear is wasted bandwidth on this GPU. Conversation (with P1+P2):
68.9 → **74.1** → 68.2. Hub (with P1+P2): 89.4 → **100.6**. Risk: any frame where nothing opaque covers a pixel
(scene switches, a scene without a full-screen background, fades) shows the previous frame there instead of the
background colour; needs a check of every scene and transition before shipping.

**P9. Drop or bake the vignette in the top-down drives.** Town drive at midday has no tint/dark rectangles, so the
vignette is the only overlay; hiding it (with P1+P2): 101.4 → **127** (cap) → 103.5. In the top-down view the
vignette adds little; this is a design call.

**P10. Bake the warehouse dim rectangles into the background.** LabelScene draws `bg_warehouse` and then a
full-screen `0x12041F` rectangle at alpha 0.55 over it (`LabelScene.js:22`; LiftingScene.js:16 at 0.35;
SortingScene.js:32 at 0.45). Hiding it in m2-labels (as shipped): 67.1 → **76.9** → 67.0. Drawing the same dim into
the background canvas once (a `bg_warehouse_dim55` texture) gives the same picture for free.

**All together**, to show the ceiling (P1+P2+P3+P4+P5+P8; for the stop P4 = sky+hills strip only):
conversation m3-missing 48.8 → **129.5 fps** (p50 7.7 ms, p95 8.4 ms: pinned at the 125 fps cap);
doorstep stop m5-pod walking ~55 → **107 fps** (p50 8.9 ms). Screenshots `dlg-all.png`, `stop-all.png`.

### PERF-2: Graphics objects are re-tessellated every frame, allocating 9–14 MB/s
- **Severity:** minor (CPU and GC churn; not the bottleneck on this laptop, but it is on weaker CPUs, and these are
  also the only shapes that turn jagged with MSAA off)
- **Where:** m2-labels (21 Graphics, one with 2409 path commands), town drive minimap/HUD (`mapG` 267 commands),
  hub module-card headers, loading-slot outlines (`LoadingScene.js:78` `slotG`), route planner lines.
- **Repro:** `op m2-labels`, Enter, `evf alloc.js` → 13.9 MB/s allocated, 21 minor GCs in 3 s while idle. Hide
  every Graphics → 1.7 MB/s, 2 GCs; CPU render 0.52 → 0.23 ms/frame. Town drive while driving: 9.2 MB/s, 11 GCs/3 s.
- **Cause:** Phaser redraws a Graphics from its command buffer each frame (path building, earcut for fills,
  arrays per path). These shapes change rarely (on hover, highlight or when a value changes).
- **Suggested fix:** draw static or rarely-changing shapes into canvas textures with `OTR.tex.make` (cached by key,
  antialiased by the 2D canvas), or `graphics.generateTexture(key)` once and show an Image; redraw only when the
  state changes. The HUD in `TownDriveScene.updateHud` already redraws only on change, which is the right pattern;
  the Graphics are still re-tessellated every frame.
- **Status:** fixed — `OTR.tex.shape()` (drawn once into a cached, antialiased canvas texture) and
  `OTR.tex.liveShape()` (repainted only when `redraw()` is called) in `src/core/textures.js`, used for every static
  or change-driven shape: HUD bars, panels, badges, tags and chips in all scenes (fx, rig, scanner, stage, talk, ui,
  Hub, Pre-trip, Route Planner (the route line is a liveShape), Labels, Town drive, Driving drill, Stop, Lifting,
  Sorting, Pickup, Loading (slot outlines are a liveShape redrawn on drag start/end), Results, Shift brief/debrief,
  Day summary, BaseScenario). The sorting belt rails used gradient fills, so they are a canvas texture. Left as
  Graphics on purpose because they change every frame while visible: the lifting figure (`gBack`/`gFront`), the
  sorting laser (shown 140 ms per scan), the town headlight beams and the photo-proof frame/shade (follows the
  mouse). The lifting load gauge now redraws only when its bar moves a pixel. The dev-only LabScene is untouched.

### PERF-3: Phaser loads from a CDN first; favicon 404 on every load
- **Severity:** minor (load-time reliability on company networks)
- **Where:** `index.html:14–15`: `<script src="https://cdn.jsdelivr.net/npm/phaser@3.80.1/dist/phaser.min.js">`
  then `document.write` of `lib/phaser.min.js` if `window.Phaser` is missing.
- **Actual:** every load fetches the whole Phaser build from jsdelivr although the same file ships in `lib/`. On a network that
  blocks or black-holes the CDN (common behind corporate proxies) the page waits for that request to fail before
  the fallback runs; I could not test a blocked network here. Edge also logs "Tracking Prevention blocked access
  to storage for https://cdn.jsdelivr.net/..." four times per load. Separately, there is no favicon, so every
  load logs `Failed to load resource: 404` for `/favicon.ico`, which buries real errors in the console.
- **Suggested fix:** load `lib/phaser.min.js` directly (no CDN), and add a `<link rel="icon">` (or an empty
  `favicon.ico`).
- **Status:** fixed — `index.html` loads `lib/phaser.min.js` (3.80.1, the same build) directly and has an inline
  SVG favicon (a parcel), so no request leaves the game's own server and nothing 404s.

## Implementation plan (ranked)

Target: at least 60 fps everywhere on the Intel GPU, ideally 100+. On a 60 Hz screen that means frame time well
under 16.7 ms; as shipped, every outdoor scene is at 17–22 ms and the hub at 19.6 ms, so on a 60 Hz screen they
present at 30–45 fps with judder (GPU-bound frames alternate between one and two refresh intervals; p95 here is
26–33 ms). Gains below are measured on this laptop in headless Edge at 1280x720 (fps capped at ~125); a real 1080p
screen adds a browser upscale pass that these numbers do not include, which is one more reason to aim well above 60.

| # | change | files | measured gain (Intel UHD) | visual risk | effort |
|---|---|---|---|---|---|
| 1 | **Fix PERF-1**: `getContext('2d', { willReadFrequently: true })` in `OTR.tex.make` | `src/core/textures.js:83` | removes every 50–95 ms stutter when a face, mouth or package texture is first used (9 per 9 s of conversation → 0); scenario start 2–3x faster (m3-missing 279 → 98 ms) | none | 1 line |
| 2 | **Renderer config**: `render: { antialias: true, antialiasGL: false, maxTextures: 1 }` (add `powerPreference: 'high-performance'` too; harmless) | `src/main.js:16` | +35–65% fps everywhere: conversation 48.8 → 65–68, doorstep stop 55 → 76, heat stop 45 → 58–64, pre-trip 57 → 84, hub 50 → 89, town 65 → 101–103, indoor and warehouse scenes 67–74 → 96–115 | low: *Graphics* edges (speedometer dial, gear badge, arcs) lose smoothing; fixed by #6 | 2 lines |
| 3 | **One atmosphere pass**: in `build()`, replace the MULTIPLY tint rectangle, the darkness rectangle and the vignette image with one MULTIPLY image of a generated canvas holding `(1 - a + a*tint) * (1 - dark) * (1 - vigAlpha * vignette)` (key per tod / weather / vignette alpha; 640x360 is plenty); keep the heat ADD rectangle, glare and particles as they are | `src/core/atmos.js:42–49, 88` | −2.5 to −3 ms in every tinted outdoor scene: conversation 48.8 → 57.0 as shipped; heat stop 63.5 → 73.3 on top of #2; two fewer blend switches per frame | very low (drops the darkness rectangle's ≤ 11/255 navy lift in storms; screenshots indistinguishable) | ~30 lines |
| 4a | **Conversations: one background texture.** The DialogueScene camera never moves, so draw sky, far hills, ground, house body and static props into one 1280x720 canvas once (their canvases already exist; with #1 this costs a few ms) and show one Image; keep the door, the van, glows, the house front layer and people as sprites | `src/scenes/shared/DialogueScene.js` (its set comes from `stage.js` sky/far/ground/house/props) | conversation 57 → 72 on top of #3; 92.7 on top of #2 + #3; **105** with #2 + #3 | low if the moving pieces stay separate | medium |
| 4b | **Stops: sky and far hills as one parallax strip.** Draw the sky and the hills into one canvas `W + worldWidth * 0.25` wide and scroll it at the hills' factor (the sky then drifts slowly with the hills); drop the hills' empty top band (420 → 281 rows) | `src/core/stage.js:48–53, 380`, `src/core/scenery.js:49, 92` | about one layer (~1–1.5 ms); part of the stop's 76.5 → 107 with #2, #3, #5, #7. Do **not** bake the whole walkable world into one full-height RenderTexture: that fills its transparent top too and gained less (76.5 → 87.5) | low (sky parallax is new but natural) | small |
| 4c | **Warehouse: bake the dim rectangle into the background texture** (`bg_warehouse` drawn already darkened) | `src/scenes/m2/LabelScene.js:22`, `LiftingScene.js:16`, `SortingScene.js:32`, `src/core/draw.js:943` | m2-labels 67.1 → 76.9 as shipped (−2 ms) | none | small |
| 5 | **Trim transparent margins of big layers**: after drawing, find the alpha bounding box and set the base frame to it (`frame.setSize(bw, bh, x0, y0); frame.setTrim(W, H, x0, y0, bw, bh)`), as a texture atlas does; objects keep size, origin and position. Opt-in per texture (house front, interior front, props, van); never for TileSprite textures | `src/core/textures.js:77–87` (an option), callers in `src/core/scenery.js` (`house`, `interior`, `prop`, `van`) | pickup 73.2 → **90.0** as shipped (the interior front layer is 1640x700 but 95% empty: 1.86 → 0.28 ms); conversation +1 fps | low (check nothing reads `frame.cutX/cutY` or pixels of those textures) | ~25 lines |
| 6 | **Static Graphics → textures** (PERF-2): speedometer dial/arc and gear badge, minimap frame, hub card headers, label-scene shapes, loading slots; draw with `OTR.tex.make` (2D canvas, antialiased) or `generateTexture` once, redraw only on state change | `src/scenes/shift/TownDriveScene.js:413, 1093–1105`, `src/scenes/m6/LoadingScene.js:78–93`, `src/scenes/m2/LabelScene.js`, `src/scenes/HubScene.js` | restores smooth edges after #2; allocation 13.9 → 1.7 MB/s and CPU render 0.52 → 0.23 ms in m2-labels; fewer GCs | none (improves) | medium |
| 7 | `render: { clearBeforeRender: false }` | `src/main.js` | −1.2 ms: conversation 68.9 → 74.1, hub 89.4 → 100.6 (with #2) | medium: every scene and transition must paint an opaque full-screen first layer; test each scene, fades and the pause overlay | 1 line + checks |
| 8 | **No vignette in the top-down drives** (`vignette: false` in their `atmos.apply`) | `src/scenes/shift/TownDriveScene.js`, `src/scenes/m1/DrivingScene.js` | town 101 → 127 (cap) with #2 | design call (slightly flatter look) | 2 lines |
| 9 | **Adaptive resolution safety net** for GPUs weaker than this one: if the 2 s median frame time stays above ~15 ms, render at 0.85 (then 0.75) scale: resize the drawing buffer, keep the 1280x720 projection and the canvas CSS size (see `res.js`; re-apply on the Scale Manager's resize) | `src/main.js` + a small new `src/core/perf.js` | 0.75 scale: stop 48 → 78.7 as shipped, 87.5 → 129 on top of #2–#4; 0.85: conversation 48.8 → 65.4 | medium: text and thin lines go soft at 0.75 (`txt-075.png`); acceptable only as a fallback | medium |
| 10 | **Deployment note, no code**: on laptops with a discrete GPU, set Edge/Chrome to "High performance" in Windows Settings → System → Display → Graphics (the page cannot ask for it: P7) | IT notes / README | earlier pass: 127–144 fps on the RTX vs 41–76 on Intel | none | – |
| 11 | PERF-3: load Phaser from `lib/`, add a favicon | `index.html:14–15` | load reliability, clean console | none | 2 lines |

Order of work: #1 and #2 first (three lines, biggest effect: measured together they already put every indoor and
warehouse scene at 96–115 fps and conversations/stops at 65–76); then #3 and #6 (#6 restores the MSAA look where it
matters); then #4a–#4c and #5 (conversations to 105+, stops toward 100, pickups and warehouse above 100); #7 and #8
after a visual check; #9 only if a weaker target machine still misses 60.

Expected result on this Intel GPU after #1–#6: conversation ~105 fps (129 with #7), doorstep stops ~90–107, heat
stops ~80+, pickups ~115+, warehouse ~110+, loading ~96+, route planner ~105, hub ~90–100, town ~100 (127 with #8).

## Revisit
- Measure headful on a real 60 Hz 1920x1080 screen (browser upscale pass, vsync pacing) after #1–#3 land; headless
  1280x720 does not include the upscale.
- Night scenes (vignette alpha 1, larger `dark`) and snow were not measured separately. Rain/storm particles showed
  no measurable cost (storm conversation 46.1 vs clear 48.8 fps; the difference is the extra darkness rectangle).
- The hub redraws ~14 static cards every frame (~1 ms each on this GPU); after #2 it is at 89–100 fps, but it is a
  static menu and could be baked into one texture with hover highlights as separate sprites.
- Modal and intro cards cost 2.5–2.9 ms while open (full-screen dim + a large shadowed panel); transient, left alone.
- The town drive allocates 9 MB/s even with its HUD change-driven (per-frame `bodies` / `concat` arrays in
  `stepVan`, plus Graphics); no long frames seen, low priority.

## Summary
1. **PERF-1**: every first use of a face, mouth or package texture stalls 50–95 ms (9 stutters in 9 s of
   conversation). One-line fix in `src/core/textures.js:83` (`willReadFrequently: true`), measured to remove them all
   and to make scenario start 2–3x faster.
2. Every scene is GPU fill-bound on Intel; CPU is under 1 ms/frame everywhere and draw calls are 2–8 per frame.
3. The "8 ms with nothing drawn" floor is the headless browser's 125 Hz frame cadence, not work.
4. MSAA (Phaser's default `antialiasGL`) costs ~4 ms/frame on this GPU: turning it off takes the conversation from
   48.8 to 59.7 fps and the town drive from 65 to 91.
5. Phaser's 16-texture shader is slow on Intel/ANGLE; `maxTextures: 1` saves ~2 ms (only 1 helps; 2–8 do not).
6. The three atmosphere overlays are one multiply: merging them saves ~2.8 ms (conversation +8 fps as shipped).
7. Conversations (static camera) can bake their whole set into one texture: with the items above, 48.8 → 105–129 fps.
8. Big layers are mostly transparent (the pickup front layer is 95% empty): trimming the frame takes pickups 73 → 90.
9. Graphics are re-tessellated every frame (9–14 MB/s of garbage); convert static shapes to textures (PERF-2).
10. `powerPreference: 'high-performance'` does not select the RTX; only the Windows per-app GPU setting does.

Not done: headful 60 Hz/1080p measurement; night and snow variants; the route-day flow end to end (the town drive
was started directly with the scene manager for measurement); implementing anything (every change here is a
prototype in the page).
