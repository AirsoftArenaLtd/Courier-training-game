# Town graphics improvements

Graphics branch: `codex-graphics`, based on `main` at `bda95d92011814274c1dea5addf5e2d6d594ac8e`.

## Changes

- **Roof/wall seams:** centre the painted roof box, rather than its padded texture, on the building footprint. Account for mirrored art and the depot's different origin. Bake an opaque backing underneath transparent roof edges into a cached high-quality texture. Reuse projected corners and draw facade quads with direct triangles to avoid rebuilding and tessellating paths every frame. Collision footprints stay unchanged; low keeps its original flat roofs.
- **Lighting and rain:** soften the cached lamp falloff and headlight edges. On high, replace uniform oval puddles with irregular waterlines and broken sky reflections in the existing texture size. Low retains the original puddle pixels under a separate cache key. Texture dimensions, light-map resolution, light counts and `stamp()` rendering stay unchanged. No added frame-time effects.
- **Cab:** slope the existing car glasshouse into a windscreen/rear window without adding vertices or meshes; reuse car geometry. Match pedestrians' skin, hair and trouser colours to the top-down view using cached vertex colours. Low keeps the original simple shapes. Release the cab's own three.js geometry/materials/textures on shutdown, leaving Phaser's shared GL context intact, so a restarted drive builds a fresh view.

No new on-screen strings. No changes to rules, scoring, input handling, translation files, shared tests, the font line, the language picker, README, or the shared QA report. Classic scripts, local assets and the existing shared GL render target remain in use. Anti-aliasing and top-down mirrors remain prototype limitations; this change does not add expensive post-processing or extra render passes.

## Validation

Installation succeeded with `cd test && npm install --package-lock=false --cache /workspace/.cache/courier-npm --no-audit --no-fund`. The tracked dependency manifest and lockfile are unchanged. All five changed JavaScript files pass `node --check`; `git diff --check` is clean.

| Check | Result |
| --- | --- |
| Original `QA_BROWSER=/usr/bin/chromium node town3d.js` | Exit 1: first disk navigation blocked by managed Chromium (`net::ERR_BLOCKED_BY_ADMINISTRATOR`); application assertions did not execute. |
| Original `QA_BROWSER=/usr/bin/chromium node driving.js` | Exit 1: same disk-navigation policy block. |
| Original `QA_BROWSER=/usr/bin/chromium node art.js` | Exit 1: packing/background-removal assertion passed, then disk navigation was blocked; remaining game assertions did not execute. The test restored the original art files and pack. |
| Original `QA_LANG=hi QA_BROWSER=/usr/bin/chromium node town3d.js` | Exit 1: same disk-navigation policy block. |
| HTTP-adapted `node art.js` | Exit 0; 5 assertions passed. |
| HTTP-adapted `node town3d.js` | Exit 0; 18 assertions passed. |
| HTTP-adapted `node driving.js` | Exit 1; **18/19 passed**. Failed: “pulled in and stopped for the ambulance: right”. |
| HTTP-adapted original-graphics `node driving.js` | Exit 1; **18/19 passed**, with that same ambulance failure. |
| HTTP-adapted `QA_LANG=hi node town3d.js` | Exit 0; 18 assertions passed with the Hindi fixture below. |
| HTTP-adapted `QA_LANG=hi node a11y-screens.js` | Exit 0; all 14 screens clean with large text and the colour filter, using that Hindi fixture. |
| Additional visual/geometry checks | Exit 0; all 63 roof boxes aligned, painted footprint corners opaque; 11 rendered views captured with zero page errors. |
| Cab restart pixel check | Exit 0; cab rebuilds after scene restart, sky pixel `[116, 170, 215]`, shared GL context remains active, zero page errors. |
| `QA_FPS_FLOOR=0 QA_PORT=8300 node qa.js` | Exit 1; **33/36 scenarios clean**. Golden-path failures: `m8-steps` (“the framed photo was graded null”), `route-day` (“pulled 0 of 1 packages”), and `drive-review` (DriveReviewScene did not open after its scripted click). |
| Original-graphics `node qa.js --only m8-steps,route-day,drive-review` (same QA port and FPS floor) | Exit 1; **2/3 clean**. `m8-steps` and `drive-review` passed; `route-day` reproduces “pulled 0 of 1 packages”. |
| Candidate `node qa.js --only m8-steps,drive-review` (same QA port and FPS floor) | Exit 0; **2/2 clean**. Icy steps passed all three stops; Drive Map opened, showed the mistake/lesson, and returned to Results. |

All browser commands set `QA_BROWSER=/usr/bin/chromium`. HTTP-adapted commands additionally set `NODE_OPTIONS=--require=/workspace/.courier-cloud/graphics/http-tests.cjs`. Original-graphics comparisons add `QA_GRAPHICS_BASELINE=1`, which serves read-only copies of the five original core graphics scripts. These helper files live outside the checkout. The full QA and candidate recheck use the repository's unmodified HTTP runner on port 8300; the original-graphics QA comparison adds only that script interception.

The full QA run includes 50 successful route legs over ten days (worst parking angle 6.9°), traffic across four towns, 35 van-traffic placements with no car-caused contact, and 150 seconds of drive fuzzing in each of three towns. The FPS floor is deliberately disabled for this software renderer; a clean scenario is not a hardware performance certification.

The original-graphics fixtures match `main` at the base SHA above. At the failing ambulance test's check immediately before pulling in, the original drive was already judged: `emergency: 1`, ambulance time `1.6093 s`, distance `23.5 px`, `judged: true`. Its fixed 2.5-second real-time wait can let the ambulance pass before the script pulls over. No driving-rule or test change is included.

The package-pickup failure also occurs with the original graphics. The photo and Drive Map failures passed isolated reruns on both baseline and candidate, so those checks are intermittent here. The full run's three failures remain recorded above; passing isolated reruns does not turn that full run into a clean pass.

An initial baseline-driving attempt exited 1 before application assertions with `net::ERR_EMPTY_RESPONSE`: the static server's logging connection had dropped with the tool transport. Restarting that owned server by its PID and redirecting its logs restored HTTP 200; the complete baseline result above is the rerun. The full QA process survived the transport interruption and saved its complete 36-case report.

This cloud machine uses Chromium 151 and SwiftShader, not an integrated GPU. Benchmark comparisons use `index.html?bench=1` at 1280×720, with only one browser test running during each measurement. Benchmarks also sample the cab for 4.5 seconds after warm-up. Raw reports and visual evidence are generated under ignored `test/out/graphics/`.

The following are exact readings from the saved baseline and final runs. Each pair is average FPS / worst 1% FPS. The supplemental cab sample was **60/60 before and after on both quality settings**. The runs in the table completed without page errors. An initial external benchmark helper timed out while waiting for the completed report; changing that helper to guarded polling resolved it, and the baseline was rerun. No game or repository test change was needed.

| Screen | High before → after (avg / 1%) | Low before → after (avg / 1%) |
| --- | --- | --- |
| Title screen | 31/22 → 31/26 | 30/24 → 29/24 |
| Hub | 23/21 → 23/21 | 21/19 → 23/19 |
| Town drive (traffic, driving) | 28/20 → 29/22 | 29/21 → 28/21 |
| Town drive in rain at dusk | 14/13 → 14/12 | 25/20 → 23/20 |
| Town drive at night (lights) | 13/11 → 14/12 | 24/19 → 24/19 |
| Road Hazards | 27/21 → 25/19 | 26/20 → 30/22 |
| Doorstep stop | 23/20 → 23/20 | 24/20 → 25/22 |
| Icy steps stop | 24/21 → 24/20 | 24/21 → 25/22 |
| Conversation | 37/29 → 36/29 | 37/33 → 37/29 |
| Sort belt | 52/44 → 54/49 | 51/45 → 54/45 |
| Pre-trip walkaround | 32/27 → 33/29 | 31/27 → 31/27 |
| Loading the truck | 46/34 → 45/38 | 45/37 → 42/35 |

Repeated cloud runs varied even on unchanged screens: baseline low daytime/dusk/night readings were 29/21, 25/20, 24/19 and then 28/21, 24/20, 23/19. Final high town readings were 28/22, 14/13, 14/13 in one run and 29/22, 14/12, 14/12 in another. The final low fallback was rechecked after restoring the original puddle artwork; its daytime/dusk/night readings are the ones in the table. These mixed software-rendering readings do **not** certify the strict no-regression requirement. Run `index.html?bench=1` on a target integrated-GPU laptop before accepting the performance gate.

Managed Chromium blocks `file://` navigation. The requested original commands were run and are reported separately from HTTP-adapted checks. An external test-only adapter maps this checkout's `file://` URLs to the same files served by a plain static server on port 8302; this preserves browser-local progress rather than enabling the company server API. It does not modify the game, repository tests, assertions, or browser policy. HTTP checks do not establish disk-launch compatibility. Benchmarks and visual captures use the development server on port 8301.

At the first-pass base, `main` contained English and Spanish. That pass's Hindi integration used a read-only snapshot of Claude's `src/core/i18n.js` and `data/i18n/hi.js` from `qa-pass2-fixes` at `707eea9a2b802fc3ae29873f108d4d382e9a23af`, supplied to the browser by the external test adapter. Neither those protected files nor that branch were edited. The adapter verified `OTR.i18n.lang === 'hi'`, so an English fallback could not masquerade as a Hindi pass. The newer checks below use the translations now published on `main` directly.


## Second pass: implemented and committed

At the user's request, the four prepared source changes are applied and committed, then work stops. Existing car, tree and roof artwork is retained; the generated replacement proposals are not used. No art-pack rebuild or new on-screen strings are needed. Claude's protected files, game rules, scoring and input handling remain untouched.

- **Road/pavement:** bake restrained tyre wear, a resurfacing patch, sidewalk slab variation and curb highlights into the existing texture dimensions. Paint markings and curb geometry keep their original placement. High and low use separate cache keys; low retains the original drawing.
- **Windows:** use stable per-building warmth and brightness, shared between the projected town and cab. Cache projected glass colours when lighting changes and reuse the cab's existing emissive maps. Window quad and mesh counts are unchanged; low retains its existing rendering.
- **Top-down pedestrians:** bake shoe, cuff, hand and clothing details into the existing three 56x56 walking textures. Preserve the palette indices read by the cab, animation timing and sprite count. Low uses the original drawing and cache keys.
- **Cab dashboard:** add narrow static dashboard/pillar highlights to the existing graphics object on high. No additional sprite or overlay texture is introduced, and the previous cab car/person improvements remain in place.

All four final JavaScript files pass `node --check`; `git diff --check` passes. Two previously authorised review-render runs exited 0, with no page errors in either current or proposed capture. Those renders used the prepared code through external request interception and are not QA or performance results. Image delivery in the chat did not work, and the user asked to stop that review process and commit the prepared work.

The preview work stopped and its owned server was stopped by PID. The user subsequently requested a quick QA check and explicitly authorised pushing to `main`, superseding the earlier restriction on publishing there.

## Quick QA before publication

Merged published `main` at `f4b6bec46d837a8ff02d36a2feb012604a75bc2f` into `codex-graphics` without conflicts (merge `db462242e1fb0f508fb12d81c4abd13c87fb96d0`). Claude's protected source, dictionaries, tests, README and shared QA report match that main revision exactly. All six core graphics scripts pass `node --check`, and `git diff --check` passes. The art test restored the tracked assets and art pack; no generated replacement artwork is included.

| Check | Exact result |
| --- | --- |
| `node art.js` | Exit 0; **5/5 assertions passed**. |
| `node town3d.js` | Exit 0; **18/18 passed**, including high/low, weather, lighting, pedestrians and cab; zero page errors. |
| `QA_LANG=hi node town3d.js` | Exit 0; **18/18 passed** using the actual merged Hindi dictionary; zero page errors. The adapter waits for `OTR.i18n.lang === 'hi'`. |
| `node driving.js` | Exit 1; **18/19 passed**. Failed: “pulled in and stopped for the ambulance: right”; zero page errors. |
| Original-main core graphics, `node driving.js` | Exit 1; **18/19 passed**, with the same ambulance failure; zero page errors. |
| `QA_FPS_FLOOR=0 QA_PORT=8300 node qa.js --only m1-driving,drive-review` | Exit 1; **1/2 scenarios clean**. `m1-driving` passed boot, layout, play and its six-stop golden route, including all six hazards (reported FPS 29). `drive-review` completed the route but its scripted mouse click did not open DriveReviewScene from Results. |
| Original-main graphics, `QA_FPS_FLOOR=0 QA_PORT=8300 node qa.js --only drive-review` | Exit 0; **1/1 scenario clean**, including map, seatbelt lesson and Back. This reproduces the earlier intermittent pattern; it does not erase the candidate run's failure. |
| Candidate cab restart/pixel check | Exit 0; fresh cab after restart, sky pixel `[116, 170, 215]`, shared context not lost, zero page errors. |
| Candidate direct Results → Drive Map → Back check | Exit 0; mouse click opened the map, one seatbelt pin and its lesson displayed, Escape returned to Results; zero page errors. This focused check uses a prepared score log and the real completion flow, rather than repeating the full driving route. |

All repository test commands ran from `test`, with `QA_BROWSER=/usr/bin/chromium` and `NODE_OPTIONS=--require=/workspace/.courier-cloud/graphics/pass2/quick-http.cjs`. The external adapter maps blocked `file://` test URLs to the same checkout on a plain static server at port 8302, leaving repository tests and assertions unchanged. Main comparisons additionally use `QA_PASS2_BASELINE=1` to serve read-only graphics snapshots from the main SHA above; the map comparison also restores its original TownDriveScene script. No translation fixture is substituted in this pass. Logs and exit codes are saved under ignored `test/out/graphics/pass2-quick/`.

The first direct-navigation helper attempt timed out before reaching its assertions because it did not dismiss the scenario's intro card. Matching the repository runner's Enter step resolved that helper setup issue; its complete result is recorded above. An initial HTTP readiness probe also raced server startup; the server subsequently returned HTTP 200 for the complete tests.

This is targeted quick QA, not a rerun of all 36 scenarios or the benchmark suite. The ambulance assertion remains reproducible on main. Drive Map navigation works in the direct candidate check, but its full scripted failure remains reported. No new persistent gameplay or rendering failure was reproduced. This cloud browser uses SwiftShader with the FPS floor disabled; neither these checks nor the older benchmark readings certify second-pass performance on an integrated-GPU laptop or `file://` launch compatibility.
