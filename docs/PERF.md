# 3D workday rendering cost

**C-48 front inspection correction (22 October 2026):** source `4158b3a7` passes all 70 task-branch repository suites, 12 geometry cases and 668 native High/accessible Low inspection checks. Six focused resource views peak at Low **44 / 1570 / 2 / 3557376 / 2600726** and High **70 / 103283 / 3 / 11239424 / 6925520** (calls / triangles / Three textures / attachment bytes / Phaser estimate bytes). The one-time body-surface fit adds no rendered resource or per-frame work. The earlier 207-view gate retains its original source scope. Raw evidence: `docs/review/set-10/c48-marker-correction/manifest.json`. Native Intel FPS remains O-1.

**C-48 cab acceptance (21 October 2026):** all 207 fixed resource views pass on `bf60fc1f`. Loaded Low peaks at **53 calls / 2,402 triangles / two Three textures / 3,557,376 attachment bytes / 2,740,246 estimated Phaser bytes**; High **107 / 235,915 / three / 11,239,424 / 9,087,536**. Accessible Low: **53 / 2,402 / two / 3,557,376 / 3,123,238**; actual missing-model fallback Low: **53 / 2,156 / two / 3,557,376 / 2,638,592**. Native mirror, rear-camera, HUD, signs, lighting and High/accessible walkaround checks pass. Matched views, raw reports, exact source scopes and carried camera/cab component checks: `docs/review/set-10/c48.md` and `c48-accepted/manifest.json`. No ceiling changes; current-pilot strict integration is recorded separately. Native Intel FPS remains O-1.

## B-87: 2D scenes on a PC without a graphics driver (21 October 2026)

On a software renderer (Chromium's SwiftShader, as on a PC with no graphics driver), at 1280 x 720:

| Scene | fps | Screens drawn |
| --- | --- | --- |
| m8-heat | 12 | 5.9 |
| m5-exceptions | 13 | |
| m5-pod | 14 to 18 | 4.3 |
| m8-dog | 14 | |
| m5-adult, m8-steps | 16 | 4.5 (m8-steps) |
| m1-driving | 17 | 3.7 |
| m7-business (for comparison) | 30 to 35 | 2.5 (plus two zones that draw nothing) |

The game's own code is not the cost: a 5-second CPU profile of m5-pod and m8-heat is over 90% idle. Skipping the
frame's clear changes nothing. Hiding each layer in turn, five times on and off, shows **about 9 ms a frame for each
full-screen layer**:

- the sky: +3 fps;
- the colour grade (tint, darkness and vignette, already one multiply pass): +3;
- an open card's dimmer and panel: +3.5;
- the heat's additive warmth, glare and shimmer: +2.3;
- all fixed-to-screen layers together: about +10.

A scene that draws 4 to 6 screens therefore runs at 12 to 18 fps there. Merging layers does not save pixels, and 25 fps
needs about two screens fewer, which means drawing less: no grade, no heat overlays, or rendering at a lower
resolution on such PCs. Each of those changes how the scene looks, so it is owner question 8. Until it is answered,
nothing changes: every scene stays above the QA floor of 10 fps for software renderers.

`node test/tools/overdraw.js <scenario,...>` lists what a scene draws, largest first, in screens.

## C-30: generated signs (18 October 2026)

Signs share the existing route-plane batch: at most five two-triangle instances per view on Low, 24 on High,
without a new draw call, texture, target or pass. Five reused Phaser text objects hold normal/larger readings.
The integrated gate now retains 57 views, adding junction, number, one-way and loaded-peak sign fixtures.

| Profile | Views | Calls | Triangles | Three textures | Attachment bytes | Phaser bytes, mipmap estimate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| loaded-low | 28 | 57 | 2,480 | 2 | 3,557,376 | 3,106,512 |
| loaded-high | 13 | 98 | 224,937 | 3 | 11,239,424 | 6,978,086 |
| accessible-low | 8 | 57 | 2,480 | 2 | 3,557,376 | 2,865,328 |
| fallback-low | 8 | 52 | 2,060 | 2 | 3,557,376 | 2,711,126 |

Full signed CPU sweeps cover 264,000 complete-frame views each and peak at **63 calls / 2,492 triangles** loaded
and **56 / 2,072** fallback. All stops, full cargo, physical controls, mirrors, automatic rear camera, weather
and lighting are included. The strictest loaded fixture is day 21 / variant 10 / stop 1 / open-cargo exterior.
Low and High ceilings remain unchanged. SwiftShader verifies resources; native Intel 60 fps remains O-1.

Rendered gate: `QA_TAG=c30 node test/fpquality.js`, with local server in `QA_BASE` and Chromium in `QA_BROWSER`.
CPU sweep: `QA_SIGNS=1 QA_LATER=1 QA_CAMERA=1 QA_CAB=1 QA_MIRRORS=1 QA_REAR=1 QA_LIGHTING=1 QA_WEATHER=1 QA_CARGO=1 QA_ASSETS=1 node test/fproute.js`; repeat with `QA_ASSETS=0` for fallback.
[Raw reports, screenshots, clip and checklist](review/set-8/c30.md).

## B-44: fallback diagnostics (18 October 2026)

An additive asset-bank counter and healthy-fixture guard change no model selection or rendering. Two cab
samples pass the existing ceilings:

| Quality | Calls | Triangles | Three textures | Attachment bytes | Phaser bytes, mipmap estimate |
| --- | ---: | ---: | ---: | ---: | ---: |
| low | 39 | 1,034 | 2 | 3,557,376 | 1,659,371 |
| high | 73 | 92,396 | 3 | 11,239,424 | 5,171,099 |

Nine Node suites, 39 asset-browser assertions and the healthy packaged SCORM 1.2 Low/High launch pass.
Evidence and missing-High-van diagnostics: `docs/review/set-8/b44.md`. SwiftShader is a resource check;
native Intel FPS remains O-1.

## C-29: fixed integrated quality gate (18 October 2026)

C-29 adds a repeatable review gate for the integrated cab, mirrors, rear camera, lighting,
weather, local town, van/people and compact display. High mirror housings now sit behind their
reflective faces. Targets, gaze, scoring, saves, controls, translations and Settings retain their
behavior. This is stacked on pushed C-47 `55acbe3`, including C-28 and B-30 over pilot `951ef36`;
Claude merges the stack in order.

| Profile | Views | Calls | Triangles | Three textures | Attachment bytes | Phaser bytes, mipmap estimate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| loaded-low | 24 | 56 | 2,400 | 2 | 3,557,376 | 2,992,496 |
| loaded-high | 10 | 96 | 215,348 | 3 | 11,239,424 | 6,494,182 |
| accessible-low | 6 | 56 | 2,400 | 2 | 3,557,376 | 2,744,118 |
| fallback-low | 6 | 51 | 1,914 | 2 | 3,557,376 | 2,609,430 |

Low keeps its original **64 calls / 2,500 triangles / two textures / 4 MiB attachments /
4 MiB estimated Phaser textures** at 1280×720. High now has separate explicit review ceilings:
**128 calls / 300,000 triangles / four textures / 16 MiB attachments / 16 MiB estimated Phaser
textures**. These bound its source-detail assets and shadows; they do not certify a native frame
rate. Resource maxima are per column and include the complete frame's sampled passes.

All 46 views pass with running audio, no page errors or context loss. The fallback profile
actually fails all 14 GLB requests and renders procedural replacements; accessible Low enables
large/colour/reduced settings. The checker rejects absent views/quality/aids/audio and exhausted
budgets. Reproduce with `node test/fpquality.js`; the fixed sets, report provenance, screenshots
and five-minute review are in `docs/3D-QUALITY-GATE.md` and `docs/review/set-8/c29.md`.
Nine Node suites (including required mission/world/workday/i18n, save size, assets and credits)
and six gate fault-injection cases pass. The High mirror housing fix adds no render resources. The unchanged
C-28 loaded CPU peak remains 63 calls / 2,480 triangles. Native Intel 60 fps remains O-1.

## C-47: compact workday display (18 October 2026)

The persistent objective/footer bars move into the physical cab and handheld. A bounded Phaser
vector overview reuses the existing dashboard mount, then clears for reverse, menus and trainer
sat-nav-off. There is no added Three geometry, texture, render target or pass. Text canvases update
only when their content/size changes; map work is bounded at a 90 ms cadence. First-day help wraps
at full size, routine prompts expire, and active warnings/captions retain their independent display.

| Rendered gate at 1280×720 | Views | Calls | Triangles | Textures | Attachments | Phaser mipmap estimate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Low | 14 | 56 | 2,400 | 2 | 3,557,376 B | 2,966,288 B |
| High | 4 | 97 | 224,563 | 3 | 11,239,424 B | 6,476,006 B |
| Low, larger/colour/reduced | 4 | 56 | 2,400 | 2 | 3,557,376 B | 2,744,118 B |

Every requested view is sampled, with no errors/context loss. Maxima are per column. Low retains
all original ceilings; the unchanged Three world retains C-28's conservative 264,000-view loaded
peak of 63 calls / 2,480 triangles. Native Intel 60 fps remains O-1; SwiftShader is resource evidence.
This branch is stacked on pushed C-28 `5c8279b`, over B-30 and pilot `951ef36`. Raw reports, exact
view lists, matched before/after screenshots and regression evidence: `docs/review/set-8/c47.md`.

## C-28: van and animated people (18 October 2026)

C-28 is stacked on pushed B-30 `5667be9`, over pilot `951ef36`; C-27 is merged.
The new van exterior uses one CPU-updated mesh with separate semantic wheel
and lifting-door transforms; the existing cab and physical inspection/collision targets stay in place.
The interior reflection uses the retained cab shell, avoiding obstruction from the imported sloped
windshield at the unchanged C-23 mirror-camera position. Other reflections use the new exterior.

The Low figures have 88 triangles, the Low van 190. One nearby resident, the crossing figure and the
reflected courier are bounded by distance; hidden characters do no pose work. All figures use ordinary
CPU-posed meshes (10 Hz Low, 20 Hz High), shared vertex-colour material and no bone texture or image map.
A dark, batched doorway recess gives the opening facade a visible interior shadow without changing its
solid. The lifting cargo door stays inside the existing van footprint throughout its motion.

There are 14 selected templates per quality. Ten new actor variants total 4,375,304 bytes; all shipped
3D files total 4,849,952 bytes. Low selects 824,208 encoded bytes / 354,468 decoded accessor bytes; High
selects 4,025,744 / 3,506,550. Source originals and unneeded animations do not ship. Seven scene-local
figure buffers are the fixed maximum; only eligible visible poses are updated. Full source geometry is
High only. The bank retains source CPU arrays separately from the live scene geometry inventory.

The final CPU loaded sweep covers 264,000 views (30 days, ten seeds, camera/suspension, every cab
control, all four reflection cells, lighting and weather, plus standing behind and inside open cargo):
**63 calls / 2,480 triangles**. The procedural fallback sweep covers the same views at **56 / 2,058**.
The original cab-only sweep missed open cargo. Its first rendered view failed at 81 calls / 2,882
triangles; world parcels and shelf markers now share bounded instance batches, while every physical
proxy remains exact. Low printing/livery/door panels are surfaces. Main-view per-instance frustum
culling discards unseen town geometry, with eight exact pixel comparisons to disabled frustum tests.
High keeps offscreen shadow candidates; the town's 290-triangle allowance and scenery radius remain.
The ceilings remain **64 / 2,500**, two allocated
Three textures, 4 MiB attachments and 4 MiB estimated Phaser textures at 1280×720. Native Intel 60 fps
remains O-1; SwiftShader timing is not native performance evidence.

Final rendered gates pass every requested view with no context loss:

| Quality | Views | Peak calls | Peak triangles | Textures | Attachments | Phaser estimate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Low | 30 | 56 | 2,400 | 2 | 3,557,376 B | 3,045,024 B |
| High | 9 | 97 | 224,563 | 3 | 11,239,424 B | 6,580,955 B |
| Low, large/colour/reduced | 4 | 56 | 2,400 | 2 | 3,557,376 B | 2,381,510 B |

The six-parcel cargo view is included. Maxima are per column; High has its own quality limits.
The gate now fails if any requested view is not sampled. Source/fallback browser checks, eight
exact Low pixel comparisons, an actual High camera turn retaining offscreen shadow instances,
all 33 Node suites, 1,852 browser assertions, nine conversion tests and both SCORM packages pass.
Commands, raw resource reports, 18 screenshots, clip and regression evidence:
`docs/review/set-8/c28.md`. Run rendered gates with `QA_ACTORS=1 QA_TOWN=1 QA_LIGHTING=1
QA_WEATHER=1 QA_PROTOTYPE_ONLY=1 QA_SHOTS=1 QA_TAG=c28`; view lists and accessibility flags are
preserved in `docs/review/set-8/c28/gates.json`. The 30-seed / 100-day resume soak and 240 SCORM
round trips preserve scores (3,595/4,000 characters for its later-day fixture).

## B-30: bounded cab narration (18 October 2026)

Narration adds no render resource or pass. The fixed 1280×720 Low gate samples the cab,
three physical mirrors and the loaded day-21 reverse peak, with larger text, colour filtering
and reduced motion. Combined maxima are **52 calls / 2,172 triangles / two textures /
3,557,376 attachment bytes / 2,557,622 estimated Phaser texture bytes**. All unchanged
ceilings pass. High is recorded separately (cab: 88 calls / 67,910 triangles / three textures /
11,239,424 attachment bytes). The 145-check keyboard workday also passes. Reports,
commands and narration evidence: `docs/review/set-8/b30.md`. These are SwiftShader resource
checks; the existing native Intel O-1 measurement remains outstanding.

## C-27: local town assets and recovered call headroom (17 October 2026)

Route boxes/planes now share per-instance colour batches while solid raycast proxies remain exact.
Before adding any Low geometry, the loaded 240,000-view sweep falls from C-26's 64 calls / 1,886
triangles to **48 / 1,890**. Both the main view and reflections retain their colours and restore all
matrices, colours, counts and visibility exactly after every reflection pass.

Eight CC0 town templates add houses, a shop, trees, fences, roads/kerbs, streetlights and parked cars.
High retains source detail. Low uses small silhouette variants (12–44 triangles), with at most
**290 triangles of nearby detailed scenery** selected at the existing three-metre update cadence.
Distant/missing buildings retain their old procedural silhouette; missing props have small procedural
equivalents. No image texture, extra pass, scoring/save field, control or new UI text is introduced.
All generated solids, customer facades, delivery targets, road markings and public paths are retained.

The integrated **240,000-view loaded** sweep peaks at **58 calls / 2,306 triangles**. The equally large
fallback sweep peaks at **47 / 2,266**. Both include cargo states, camera dynamics, physical cab controls,
all lighting presets, weather and all mirror/rear reflections. Eight model types pass real GL pixel
comparisons on both qualities, with no render-induced mission or scoring changes. The 49 loader/failure/
loading-layout assertions also pass, including native-font English/Tamil normal/larger layouts.

Rendered samples at the fixed 1280 × 720 viewport, with sound, larger text and colour filtering:

| Sample set | Calls | Triangles | Three.js textures | Attachment bytes | Phaser texture estimate |
| --- | ---: | ---: | ---: | ---: | ---: |
| Low, 22 town/cab/mirror/rear/scan/turn/weather/night views | 57 | 2,306 | 2 | 3,557,376 | 2,600,662 |
| High, six town/cab/reverse/night/rain views | 92 | 184,814 | 3 | 11,239,424 | 6,952,006 |
| Low, three town/reverse/rain views with reduced motion | 57 | 2,306 | 2 | 3,557,376 | 2,575,206 |

Source geometry peaks at **23,272 bytes Low / 431,296 High**. High's complete-frame triangle counter
includes the source-detail town in the world, reflection and sun-shadow passes; Low retains its original
64-call / 2,500-triangle ceilings and has no shadow map. No WebGL/page errors or context loss occur.
The two-texture and 4 MiB attachment/Phaser ceilings remain unchanged. Software FPS is not native Intel acceptance.

The 16 new Low/High files total **457,596 bytes**. All manifest files, including the starter garage,
total **474,648 bytes**; Low loads **30,052**, High **444,596**. Colours are baked from the source palette,
with shared cheap Lambert shading at runtime. Licence files retain original author bytes. Repeated
conversions match byte for byte; six Python conversion tests and all 30 Node suites pass. The
resume/100-day soak and 240 SCORM round trips preserve identity/scores at **3,869 / 4,000 characters**.
Both SCORM package formats pass, as do nine offline checks. The complete browser pass totals **1705 assertions**: town Low/High, loader/failures/layouts, cab, mirrors, rear camera, keyboard, driving, camera, route-day, doorsteps, guide, themes, lighting, weather, load-out and the five-stop physical route. The raw incoming zips are never shipped. The Poly Haven texture zips
omit their licence record, so their files remain unshipped pending Claude's reply; Kenney palette geometry
and texture-free surface grain provide the current road/kerb detail.

Final review index, screenshots, clip and individual regression reports: `docs/review/set-8/c27.md`.
Implementation, conversion, source provenance and fallback details: `docs/3D-TOWN-ASSETS.md`.
The source-detail preparation contact sheet is historical; final in-game Low/High views are in the review index.

Commands (set `QA_BASE` to the checkout server; one Chromium at a time):

```sh
python3 test/fptownprepare.py
node test/fptown.js
node test/assets.js
QA_ASSETS=1 QA_LATER=1 QA_CAMERA=1 QA_CAB=1 QA_MIRRORS=1 QA_REAR=1 QA_LIGHTING=1 QA_WEATHER=1 QA_TAG=c27-loaded node test/fproute.js
QA_LATER=1 QA_CAMERA=1 QA_CAB=1 QA_MIRRORS=1 QA_REAR=1 QA_LIGHTING=1 QA_WEATHER=1 QA_TAG=c27-fallback node test/fproute.js
QA_CAB=1 QA_REAR=1 QA_LATER=1 QA_LIGHTING=1 node test/fpresume.js
QA_CLIP=1 QA_TAG=c27-assets node test/fpassetsbrowser.js
node test/fptownbrowser.js
QA_GFX=high node test/fptownbrowser.js
QA_GFX=low QA_TAG=c27 QA_TOWN=1 QA_WEATHER=1 QA_LIGHTING=1 QA_PROTOTYPE_ONLY=1 QA_SOUND=1 QA_A11Y=large,colour QA_VIEWS=assets,townhouse,townroad,townparked-car,towncab,townreverse,laterrearpeak,mirror,mirrorRight,mirrorInterior,barcodeAim,laterstressturn,laterstressreverse,visibleweatherrainnight,visibleweatherrainreverse,visibleweatherstorm,visibleweatherfog,visibleweathersnow,visibleweatherice,visibleweathersnowwalk,visibleweathericewalk,lightingnightreverse QA_SHOTS=1 node test/fpbench.js
QA_GFX=high QA_TAG=c27 QA_TOWN=1 QA_WEATHER=1 QA_LIGHTING=1 QA_PROTOTYPE_ONLY=1 QA_SOUND=1 QA_A11Y=large,colour QA_VIEWS=assets,townhouse,townparked-car,townreverse,visibleweatherrainreverse,lightingnightreverse QA_SHOTS=1 node test/fpbench.js
QA_GFX=low QA_TAG=c27-reduced QA_TOWN=1 QA_WEATHER=1 QA_PROTOTYPE_ONLY=1 QA_SOUND=1 QA_A11Y=large,colour,reduced QA_VIEWS=towncab,townreverse,visibleweatherrainreverse node test/fpbench.js
for suite in fpcabbrowser fpmirrorsbrowser fprearbrowser fpaccessbrowser fpdrivingbrowser fpcamerabrowser fpdaybrowser fpdoorsbrowser fpguidebrowser fpbrandingbrowser fplightingbrowser fpweatherbrowser fploadoutbrowser fproutebrowser; do node test/$suite.js || exit 1; done
node --test test/package.js
QA_BROWSER=/usr/bin/chromium node test/offline.js
```

## C-26: visible weather (17 October 2026)

Rain beads and physical wipers share one texture-free cab pane, visible only to the main camera.
Wet ground reflects the existing analytic sky/sun; snow coverage, ice patches and height mist reuse
the Lambert surface shaders. No new render pass or texture is allocated. Clear/cloudy/heat materials
keep their existing shaders. Wiping uses the saved physical switch and existing K shortcut; no scoring,
weather schedule, collision, shared save, Settings or i18n source changed.

One preallocated particle batch replaces the old precipitation cubes with two-triangle camera-facing
quads. Its existing Low counts remain 12 on later days / 18 otherwise, and 36 on High. Walking breath
and moving wheel spray reuse slots; every reflection uses its own camera for billboarding. Reduced
motion freezes particles, drops and ripples while the wiper control still clears the pane. Geometry,
materials, shader hooks and the instance buffer are released on world disposal.

Two **240,000-view** Low sweeps include loaded/fallback assets, all four lighting presets, physical
controls and mirror/rear reflections. Loaded peaks at **64 calls / 1,886 triangles**; fallback at
**63 / 1,886**. The lower triangle count comes from replacing the old twelve-triangle precipitation
cubes. The first clear day remains unchanged. Existing fog ranges remain 6–28 m (fog) / 12–40 m (storm).

Actual rendered samples at the fixed 1280 × 720 viewport, with sound, larger text and colour filtering:

| Sample set | Calls | Triangles | Three.js textures | Attachment bytes | Phaser texture estimate |
| --- | ---: | ---: | ---: | ---: | ---: |
| Low, ten views: busiest rear view, rain/day/night/reverse, storm, fog, snow, ice and walking cold weather | 63 | 1,888 | 2 | 3,557,376 | 2,580,838 |
| High, five rain/day/night/reverse, snow-walk and ice views | 97 | 4,942 | 3 | 11,239,424 | 6,872,710 |
| Low, reduced-motion rain reverse and walking snow | 63 | 1,878 | 2 | 3,557,376 | 2,580,838 |

Source geometry peaks at **5,464 bytes Low / 22,240 High**. High's third texture is the existing
512-pixel sun shadow map, allocated only when needed. No errors or context loss occur. All Low ceilings
remain 64 calls, 2,500 triangles, two textures, 4 MiB attachments and 4 MiB estimated Phaser textures.
These software-rendered figures establish resources and functionality; native Intel FPS remains O-1.

All **28 Node suites** pass, including eleven weather cases, mission/world/workday, savesize and i18n.
Weather browser checks pass **48 Low / 46 High** assertions, plus **12** real-key clip assertions.
Cab (200), mirrors (132), rear camera (146), keyboard accessibility (145), camera (28), driving (24),
route-day (127) and guide (85) regressions also pass: **993 browser assertions** in total.
The four English/Tamil normal/larger caption layouts use native Tamil glyphs and retain the existing
17/18 px weather-caption sizes. Both SCORM package formats pass three packaging checks; nine offline
checks confirm that the game, 3D models and Dispatch brief work without outside requests.
Thirty seeded resume comparisons, 100 complete days and 240 SCORM score round trips preserve identity,
with a maximum of **3,869 / 4,000 characters**. Final rendered samples and the clip exercise the active-camera
particle shader; the broader control/palette regressions also cover the preceding equivalent main-view shader.

The branch was moved onto pilot `492dcb1` after C-24/C-25 merged. The requested build/sync/dispose order
is retained; weather restores material hooks before lighting and cab disposal. Latest pilot `7c19f9f`
was read before publishing; its additions are the language audit, physical-cab QA flows and board updates.
Evidence, fixture limits, screenshots and the real-key wiper clip: `docs/review/set-8/c26.md`.

Commands (set `QA_BASE` to the checkout's HTTP server; one Chromium at a time):

```sh
node test/fpweather.js
node test/fpworld.js
node test/fpweatherbrowser.js
QA_GFX=high node test/fpweatherbrowser.js
QA_CLIP=1 QA_CLIP_ONLY=1 node test/fpweatherbrowser.js
QA_ASSETS=1 QA_LATER=1 QA_CAMERA=1 QA_CAB=1 QA_MIRRORS=1 QA_REAR=1 QA_LIGHTING=1 QA_WEATHER=1 QA_TAG=c26-loaded node test/fproute.js
QA_LATER=1 QA_CAMERA=1 QA_CAB=1 QA_MIRRORS=1 QA_REAR=1 QA_LIGHTING=1 QA_WEATHER=1 QA_TAG=c26-fallback node test/fproute.js
QA_CAB=1 QA_REAR=1 QA_LATER=1 QA_LIGHTING=1 node test/fpresume.js
QA_GFX=low QA_TAG=c26 QA_WEATHER=1 QA_PROTOTYPE_ONLY=1 QA_SOUND=1 QA_A11Y=large,colour QA_VIEWS=laterrearpeak,visibleweatherrain,visibleweatherrainnight,visibleweatherrainreverse,visibleweatherstorm,visibleweatherfog,visibleweathersnow,visibleweatherice,visibleweathersnowwalk,visibleweathericewalk QA_SHOTS=1 node test/fpbench.js
QA_GFX=high QA_TAG=c26 QA_WEATHER=1 QA_PROTOTYPE_ONLY=1 QA_SOUND=1 QA_A11Y=large,colour QA_VIEWS=visibleweatherrain,visibleweatherrainnight,visibleweatherrainreverse,visibleweathersnowwalk,visibleweatherice node test/fpbench.js
QA_GFX=low QA_TAG=c26-reduced QA_WEATHER=1 QA_PROTOTYPE_ONLY=1 QA_SOUND=1 QA_A11Y=large,colour,reduced QA_VIEWS=visibleweatherrainreverse,visibleweathersnowwalk node test/fpbench.js
node test/fpcabbrowser.js
QA_TAG=c26-mirror node test/fpmirrorsbrowser.js
node test/fprearbrowser.js
node test/fpaccessbrowser.js
node test/fpcamerabrowser.js
node test/fpdrivingbrowser.js
node test/fpdaybrowser.js
node test/fpguidebrowser.js
node --test test/package.js
QA_BROWSER=/usr/bin/chromium node test/offline.js
```

## C-24: automatic rear camera and parking practice (17 October 2026)

The dash camera uses C-23's unused atlas quarter, so target allocation remains **3,557,376 bytes Low** /
**9,142,272 High** at 1280 × 720 and **two Three.js textures**. One reflection pass updates either the rear
camera or a physical mirror. In R, alternating rear/mirror scheduling permits approximately 15 rear updates
and five per mirror per second on Low at 60 fps; High permits 30 and ten. Outside R the C-23 mirror schedule
remains. The screen and mirror faces are hidden in all reflection passes to avoid framebuffer feedback.

One small shader quad draws the image, projected steering guidelines and three distance/sensor sectors. The
housing and stem join the existing flat cab batch. No image file, texture, postprocessing pass or audio sample
is added. Sensor strips overlap across the van's width, check current collision rectangles/traffic/pedestrians
without per-frame allocations and run only while the camera is on. Steering paths reuse 18 projected vectors;
the rear camera shares the existing static-instance reflection culling and exact main-buffer restoration.

The expanded route sweep includes four driving poses, eleven cab controls, three mirror looks, reverse and the
rear screen, with all four possible reflection passes, empty/loaded at every stop of 30 days and ten variants.
**240,000 loaded views** peak at **61 calls / 2,120 triangles**; **240,000 fallback views** peak at
**60 / 2,120**. The densest view is day 21, variant 10, second stop, loaded, looking at the screen with the rear
camera updating (`laterrearpeak` in the renderer gate). Another **324 practice-space views** peak at
**49 calls / 1,014 triangles**. The 64-call / 2,500-triangle ceilings are unchanged.

Actual rendered samples with sound, larger text and colour filtering:

| Sample set | Calls | Triangles | Three.js textures | Attachment bytes | Phaser texture estimate |
| --- | ---: | ---: | ---: | ---: | ---: |
| Low, ten views including all mirrors, barcode aim, loaded turn/reverse, the busiest rear view and three practice spaces | 58 | 2,120 | 2 | 3,557,376 | 2,581,472 |
| High, four mirror/rear/practice views | 62 | 3,810 | 2 | 9,142,272 | 6,760,390 |
| Low, rear/practice pair with reduced motion added | 54 | 2,120 | 2 | 3,557,376 | 2,552,758 |

No page errors or context loss occur. Loaded source geometry is **4,972 bytes Low / 21,676 High**; the empty
practice world uses **3,148 / 8,260 bytes** respectively. The intrinsic-canvas estimate and complete-frame
counters retain C-17's corrected accounting.

The new guide, practice-start and resume-selector layouts use 19 px body text normally and 23 px with larger
text. All four English/Tamil layouts, including the five-choice resume menu, fit without shrinking; their
largest Phaser texture estimate is **2,598,203 bytes**, also within Low's unchanged 4 MiB ceiling.

The resume/soak now reverses six times per day, including checkpoints during unfinished manoeuvres and unique
gear/backing reports. Thirty seeded comparisons, 100 complete days and **240 SCORM encode/decode checks** pass;
the expanded run peaks at **3,869 / 4,000 characters**, with the score preserved through the merged save packer.
Practice uses a separate owned checkpoint and cannot report into the workday. Shared save, Settings, scoring
and translation sources were not edited. The unpublished branch was moved onto pilot `153c3a8` after C-23 merged.

Commands (one Chromium at a time):

```sh
QA_ASSETS=1 QA_CAB=1 QA_CAMERA=1 QA_MIRRORS=1 QA_REAR=1 QA_LATER=1 QA_TAG=c24 node test/fproute.js
QA_CAB=1 QA_CAMERA=1 QA_MIRRORS=1 QA_REAR=1 QA_LATER=1 QA_TAG=c24-fallback node test/fproute.js
QA_CAB=1 QA_REAR=1 QA_LATER=1 node test/fpresume.js
node test/fprear.js
QA_CLIP=1 node test/fprearbrowser.js
QA_TAG=c24-mirror-regression node test/fpmirrorsbrowser.js
QA_FIRST_ONLY=1 QA_CPU_RATE=4 QA_TAG=c24-mirror-slow node test/fpmirrorsbrowser.js
QA_FIRST_ONLY=1 QA_CPU_RATE=6 QA_TAG=c24-mirror-slower node test/fpmirrorsbrowser.js
node test/fpguidebrowser.js
QA_GFX=low QA_TAG=c24 QA_PROTOTYPE_ONLY=1 QA_SOUND=1 QA_A11Y=large,colour QA_VIEWS=mirror,mirrorRight,mirrorInterior,barcodeAim,laterstressturn,laterstressreverse,laterrearpeak,rear-alley,rear-dock,rear-tight-drive QA_SHOTS=1 node test/fpbench.js
QA_GFX=high QA_TAG=c24 QA_PROTOTYPE_ONLY=1 QA_SOUND=1 QA_A11Y=large,colour QA_VIEWS=mirror,mirrorInterior,laterrearpeak,rear-tight-drive QA_SHOTS=1 node test/fpbench.js
QA_GFX=low QA_TAG=c24-reduced QA_PROTOTYPE_ONLY=1 QA_SOUND=1 QA_A11Y=large,colour,reduced QA_VIEWS=laterrearpeak,rear-tight-drive node test/fpbench.js
```

The WebGL 1 pixel check caught and fixed a guideline shader index unsupported by that context. The real browser
proves a live image with red/blue world markers, rather than accepting a powered but blank screen. The mirror
test launch-race follow-up now requires a non-null new loading token, retains fixture identity and waits on
model/frame state; full and CPU-throttled runs cover it. Evidence: `docs/review/set-7/c24.md`; model and controls:
`docs/3D-REAR-CAMERA.md`. Software rendering measures resources and behaviour; O-1 still requires native Intel FPS.

## C-25: lighting and time of day (17 October 2026)

The four clock-derived presets keep the first day's existing start time. The sky uses two triangles and
no image texture; Low adds one combined headlight beam, an automatic reverse beam and interior illumination.
High has two front beams, eight bounded contact-occlusion footprints and a 512 × 512 soft sun shadow map.
The map refreshes at 8 Hz or after sufficient movement, after restoring main-view instance buffers.
The bounded shadow area follows the current cab or walking viewpoint. Reduced motion removes sky glare.

Low's 162,000-view loaded sweep peaks at **61 calls / 2,094 triangles**, and its procedural fallback at
**60 / 2,086**. Both rotate through the four lighting presets across days/stops. A temporary checkout with
pushed C-24 `2472760` and C-25 code passes **240,000 views at 63 / 2,124**, including the reverse reflection.
It applies topic code without a merge and leaves both review branches intact. Low retains **two Three.js
textures / 3,557,376 attachment bytes**. High's allocated shadow map brings its attachment estimate to
**11,239,424 bytes**, including the world and reflection atlas. No Low ceiling changed.

Nine rendered combined Low views peak at **62 calls / 2,124 triangles**, two textures, **3,557,376
attachment bytes** and **2,600,662 estimated Phaser texture bytes**. Four High views, including actual
shadow refresh frames, peak at **103 / 5,784**, three textures, **11,239,424 attachment bytes** and
**6,952,006 Phaser bytes**. Two Low reduced-motion views also pass with the same texture ceilings.
The two language/size caption audits pass 32 Low and 28 High assertions with native Tamil fonts; the
existing live-mirror regression passes 45. The full lighting pixel/controls checks pass 47 Low and 45 High
assertions. Caption audit Phaser memory stays below 2 MiB on Low. Combined source geometry storage is 5,112 bytes on Low and 21,816 on High. No page errors or context loss
occur. Both the forward night scene and automatic rear camera remain live under the colour filter.

All 26 Node suites pass, including twelve lighting cases, world, mission, driving, workday, savesize and
the current i18n catalogue. Thirty seeded resume comparisons and the 100-day soak preserve complete
mission/event identity with all four saved presets; 240 SCORM score round trips peak at **3,943 / 4,000**.
The existing day number for trainer aids is unchanged. No shared save, scoring, Settings or i18n source
was edited. New lighting sentences await Claude's translation pass. Resource and screenshot evidence:
`docs/review/set-8/c25.md`; implementation details: `docs/3D-LIGHTING.md`. Cloud software FPS remains
outside native Intel acceptance (O-1).

Commands, one Chromium at a time (set `QA_BASE` to the chosen checkout's HTTP server):

```sh
node test/fplighting.js
node test/fplightingbrowser.js
QA_GFX=high node test/fplightingbrowser.js
QA_LAYOUT_ONLY=1 node test/fplightingbrowser.js
QA_LAYOUT_ONLY=1 QA_GFX=high node test/fplightingbrowser.js
QA_LATER=1 QA_CAMERA=1 QA_CAB=1 QA_MIRRORS=1 QA_LIGHTING=1 QA_TAG=c25-fallback node test/fproute.js
QA_ASSETS=1 QA_LATER=1 QA_CAMERA=1 QA_CAB=1 QA_MIRRORS=1 QA_LIGHTING=1 QA_TAG=c25-loaded node test/fproute.js
QA_ASSETS=1 QA_LATER=1 QA_CAMERA=1 QA_CAB=1 QA_MIRRORS=1 QA_REAR=1 QA_LIGHTING=1 QA_TAG=c25-combined node test/fproute.js
QA_CAB=1 QA_LATER=1 QA_LIGHTING=1 node test/fpresume.js
QA_GFX=low QA_TAG=c25-combined QA_LIGHTING=1 QA_PROTOTYPE_ONLY=1 QA_SOUND=1 QA_A11Y=large,colour QA_VIEWS=mirror,barcodeAim,laterstressturn,laterrearpeak,lightingmorning,lightingmidday,lightingdusk,lightingnight,lightingnightreverse QA_SHOTS=1 node test/fpbench.js
QA_GFX=high QA_TAG=c25-combined QA_LIGHTING=1 QA_PROTOTYPE_ONLY=1 QA_SOUND=1 QA_A11Y=large,colour QA_VIEWS=lightingmorning,lightingmidday,lightingnight,lightingnightreverse QA_SHOTS=1 node test/fpbench.js
QA_GFX=low QA_TAG=c25-reduced QA_LIGHTING=1 QA_PROTOTYPE_ONLY=1 QA_SOUND=1 QA_A11Y=large,colour,reduced QA_VIEWS=laterrearpeak,lightingnightreverse QA_SHOTS=1 node test/fpbench.js
```

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

## C-31: navigation and solid diversions (18 October 2026)

The physical map reuses Phaser vectors and existing text. Two street/approach cars replace
existing decorative choices; Low reduces that town allowance from 290 to 260 triangles.
The final 264,000-view loaded sweep peaks at 62 calls / 2,444 triangles;
fallback peaks at 56 / 2,072. No new model, image, target or pass.

| Profile | Views | Calls | Triangles | Three textures | Attachment bytes | Phaser bytes, mipmap estimate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| loaded-low | 33 | 55 | 2,432 | 2 | 3,557,376 | 3,068,096 |
| loaded-high | 18 | 98 | 220,885 | 3 | 11,239,424 | 7,278,470 |
| accessible-low | 11 | 55 | 2,432 | 2 | 3,557,376 | 2,865,328 |
| fallback-low | 11 | 52 | 2,060 | 2 | 3,557,376 | 2,698,950 |

All 73 fixed resource views pass. Ceilings stay unchanged. Navigation uses cached small
graphs and 150 ms projection polling; its two polling/reverse fields persist so resume is
identical. Evidence and reproduction: `docs/review/set-8/c31.md` and `docs/3D-NAVIGATION.md`.
Cloud SwiftShader resource figures do not establish native Intel 60 fps (O-1).

## C-32 controller progress (18 October 2026)

At the initial claim, the pure controller was not loaded by the scene.
The inherited C-30 loaded Low sweep remains 63 calls / 2,492 triangles. This is a baseline,
not a C-32 measurement. Scene integration now recovers geometry and will rerun `test/fpbench.js`
and the quality gate before review. Status and controller evidence: `docs/3D-TRAFFIC.md`.

## C-32: traffic and C-31 navigation together (19 October 2026)

Full baseline runtime `d8aff95b7a088ea7c00c163d0f1c7d3e77d26f42`: all 91 fixed views pass. Final raised-head runtime `d59ab5bc0aba469362f2439167276eb550e383d7`: all 18 traffic views pass with the same ceilings.

| Profile | Views | Calls | Triangles | Three textures | Attachment bytes | Phaser bytes, mipmap estimate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| loaded-low | 39 | 56 | 2,432 | 2 | 3,557,376 | 3,068,096 |
| loaded-high | 24 | 106 | 235,629 | 3 | 11,239,424 | 7,290,779 |
| accessible-low | 14 | 56 | 2,432 | 2 | 3,557,376 | 2,955,606 |
| fallback-low | 14 | 53 | 2,090 | 2 | 3,557,376 | 2,768,107 |

Final raised-head traffic views:

| Profile | Views | Calls | Triangles | Three textures | Attachment bytes | Phaser bytes, mipmap estimate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| loaded-low | 6 | 56 | 2,412 | 2 | 3,557,376 | 2,779,755 |
| loaded-high | 6 | 81 | 138,234 | 3 | 11,239,424 | 7,216,411 |
| accessible-low | 3 | 56 | 2,412 | 2 | 3,557,376 | 2,902,272 |
| fallback-low | 3 | 53 | 2,090 | 2 | 3,557,376 | 2,722,635 |

Both CPU sweeps cover 264,000 views: loaded **62 calls / 2,410 triangles**, fallback **57 / 2,088**. The lower Low decoration allowance retains both navigation obstructions and bounds the new actors. No asset, image, texture or render pass is added; all ceilings are unchanged. Raw reports, screenshots, hashes and checklist: `docs/review/set-9/c32.md`. Cloud FPS is not Intel acceptance; O-1 remains.

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


## C-33: richer-stop progress (19 October 2026)

Not ready for merge: live locker assignment needs Claude's policy, and the remaining
browser commands need working automatic approval review. No ceiling is raised. Physical
controls/furniture share existing palette batches; no new model, image, target or pass.
Low marked days trade the former 260-triangle town-decoration allowance for 120; High
keeps its detail. Existing requirements and older checkpoints retain their flow.

Final runtime `b1d01d6` passes 264,000 native-plan CPU views each with loaded assets and
procedural fallback: **59 calls / 2,398 triangles** and **56 / 2,120**. Both include all
stops, extra cargo, open cargo, camera/cab, four reflections, rear, weather, actors and
signs/navigation. The explicitly standard-service locker fixtures are measured separately.

The following **28 focused WebGL views** passed at earlier scene revision `18d8658`,
before the furniture-overlap polish. They are not the complete 101-view gate.

| Profile | Views | Calls | Triangles | Three textures | Attachment bytes | Phaser bytes, mipmap estimate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| loaded-low | 7 | 48 | 1,830 | 2 | 3,557,376 | 2,916,688 |
| loaded-high | 7 | 70 | 218,543 | 3 | 11,239,424 | 7,885,104 |
| accessible-low | 7 | 48 | 1,830 | 2 | 3,557,376 | 3,254,560 |
| fallback-low | 7 | 41 | 1,654 | 2 | 3,557,376 | 2,859,344 |

All profiles used running sound, physical controls and live mirror/rear passes; fallback
really failed model loads. Final fixed-view and High workflow acceptance is outstanding.
Evidence, source scopes and commands: `docs/review/set-9/c33.md`. Cloud SwiftShader is
resource evidence; native Intel 60 fps remains O-1.

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

## C-35 current-pilot progress (21 October 2026)

C-35 retains pilot `5adcd5b`, including merged C-33. Product runtime `e4245b2`
(the later `b52e708` changes only the locker-launch test bootstrap) passes both
complete combined CPU sweeps with walkaround, authorized richer stops, damage,
traffic, navigation, lighting/weather, extra cargo, camera motion and reflections.
Each covers **285,600 views**: loaded **60 calls / 2,443 triangles**, procedural
fallback **59 / 2,181**. The target proxies are on non-rendered layer 1; the wheel
follows its actual imported bounds without body suspension. Only walkaround days
reuse the roof patch on its visible upper edge. No instance/pass/target is added.

The first native English larger-text Low workflow passes **321 checks** and peaks
at **3,610,619 estimated Phaser bytes**, with all seven physical areas before and
after the trip, strict native checkpoints and 12 readable guide pages. All 55 plain
Node suites and 171 required/affected cases pass. [Raw results, captures, exact
scopes and hashes](review/set-9/c35-current/manifest.json). Full Low/High and the
expanded **179-view fpbench gate are still running**, so these are progress figures,
not a completed rendered acceptance. The original ceilings stay unchanged; cloud
SwiftShader does not certify native Intel 60 fps. O-1 remains the owner check.

The subsequent High surface correction is measured at runtime `501fb82`, retaining
pilot `0b43851`. Both repeated combined CPU sweeps pass **285,600 views each**:
loaded **60 calls / 2,443 triangles**, fallback **59 / 2,181**. The corrected High
English native workflow passes **321 checks**, seven pre/post surfaces and all 12
guide pages. [Failure and corrected captures, raw sweeps and exact source](review/set-9/c35-surfaces/manifest.json).
The rest of the native matrix and 179-view rendered gate remain in progress.

The corrected complete native matrix now passes **1,926 checks in six workflows**:
four Low English/Tamil normal/larger and two High English normal/Tamil larger.
All seven physical areas before and after, all 12 guide pages, remapped controls,
critical missing reports and exact checkpoints pass. Low Phaser peaks are
**2,533,062 / 3,144,939 / 3,354,528 / 3,880,838 bytes** respectively. High Tamil
larger peaks at **14,054,235 bytes**, below its unchanged 16 MiB ceiling. Browser
page/layout regressions and the 179-view rendered resource gate are still running.

The first final rendered profile passes **all 61 loaded-Low views**: **54 calls /
2,396 triangles**, two Three textures, **3,557,376 attachment bytes** and
**2,778,774 Phaser bytes**. Its source has the same product runtime `501fb82`;
`5e0f9a4` changes only the damage browser's translated expectations. This is one
profile, not the completed 179-view gate; High, accessibility and fallback continue.
[Raw completed Low report and partial gate metadata](review/set-9/c35-surfaces/manifest.json).

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
