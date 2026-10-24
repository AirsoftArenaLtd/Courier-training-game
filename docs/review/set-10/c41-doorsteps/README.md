# C-41 Tricky Doorsteps — 24 October 2026

The existing `m3-doorsteps` scenario now has a physical three-stop adapter in the isolated 3D runner.
It keeps the authored angry customer, language barrier and signature-neighbor conversations, parcel data,
stop pars and the actual `StopScene.evaluate` and `TalkController` implementations. A shared local ScoreLog
holds both the conversation and stop checks. Module runs never report into the workday event stream.

The trainee leaves the parked cab, opens the cargo doors, reads and scans an actual parcel, chooses how to
move the heavy parcel, walks to the door, speaks to the customer, and records a signature or exception.
The hand truck follows the trainee. House steps lift the camera and carried objects onto their real treads.
The door leaf opens, the customer stands clear of the bell, and the address stays attached to the wall.
Delivery photos grade the projected package, doorstep, person and number in the actual camera frame.
A printed exception tag must be attached at the physical door, and undelivered parcels return to the van.

The common dialogue pager keeps long replies at full size. Delivery methods, exception codes and shuffled
signer names use separate full-size pages. The original handheld captures signatures. Every target has a
remappable keyboard route; larger text, colour-blind cues and reduced motion remain available. Assessment
runs suppress answer findings, and pause/handheld menus freeze the clocks. The original per-stop pars
remain 150/130/150 seconds. The overall nine-hundred-second runner deadline abandons an incomplete set
without inventing a partial result.

Bundled resident and town-house models load locally with procedural fallbacks. Low lettering reuses the
owned glyph geometry. High lettering samples the existing browser font into fixed-capacity plane geometry;
it adds no GPU texture, font file or render pass. There is no new downloaded pack or generated image.
Provenance is recorded in `docs/ASSETS.md`.

This is an existing-id slice of C-41, stacked on pushed C-38 at
`b860fa180e3a4631d351eba765314e2b87ff52dd`. Runtime was committed at `b17f462b`; the frozen validation
candidate is `f80f76c4bb3cf8f76f2b4064fe0c2f25f0e6c465`. The unapplied `registry-doorsteps.patch`
proposes only `m3-doorsteps.scene3d`, and passes `git apply --check`. Shared registry/default/2D/scoring/save/
Settings/i18n source stays untouched. The three optional protocol ids wait for Claude's posted
safety/efficiency category-contract answer. A-30, translations, combined current-pilot acceptance and
Intel measurement O-1 remain separate work; this folder does not claim those acceptances.

## Reproduction

Serve this checkout on HTTP port 8383. Run one browser at a time.

```sh
node test/fpcustomerstop.js
node test/fpcustomerstopscenario.js
node test/fpcustomerstopworld.js
node test/fpcustomerstopgeometry.js
QA_BASE=http://127.0.0.1:8383 QA_BROWSER=/usr/bin/chromium QA_FPS_FLOOR=0 QA_TAG=c41-stop-resource-f80f76c4 node test/tools/fp-customerstop-quality.js
QA_BASE=http://127.0.0.1:8383 QA_BROWSER=/usr/bin/chromium QA_TAG=c41-stop-native-f80f76c4 node test/fpcustomerstopbrowser.js
QA_BASE=http://127.0.0.1:8383 QA_BROWSER=/usr/bin/chromium QA_TAG=c41-stop-photo-f80f76c4 QA_VARIANT=photo QA_CASE=low-en-large node test/fpcustomerstopbrowser.js
```

The model cases compare 672 stop-evaluator combinations and every authored dialogue reply with the real
2D implementation. They also compare physical state transitions, signature/exception callbacks, good and
critical result scales, terminal guards, clock behavior and workday isolation. The CPU renderer sweep
covers 8,850 Low views with loaded models and 8,850 with fallback, including real cab/reverse reflection
passes. It peaks at 34 calls / 1,852 triangles loaded and 37 / 1,674 fallback, excluding compositor cost,
GPU memory and frame rate.

The eleven static poses per graphics profile cover cab, automatic reverse camera, cargo, hand truck,
customer, longest reply, real signature widget, door tag, photo framing, stop report and longest cab finding.
These fixtures are render/resource evidence and deliberately freeze scenario clocks; they are not gameplay
or score evidence. The separate native protocol uses real keys, voluntary mission walking, target rays,
reply/name pages, signature widget completion and physical door-tag attachment. Only existing-id
registration and a real suspended workday are fixtures. It never fixtures positions, nodes, timers,
signature completion, score or verdict. Native results also check durable records and suspended-workday
isolation after reload.

All 77 checks classified as Node by the repository inventory pass at the frozen candidate, including workday, save size, mission, world,
asset provenance and the current translation catalogue. All 26 JavaScript files changed since the C-38 base
pass syntax checking. Exact raw logs and their per-file hashes are retained in `raw-node-logs.tar.gz` and
`raw-node-index.json`. `source-equivalence.json` verifies the frozen bytes of the runtime and shared references.

All 44 graphics views pass the original ceilings:

| Profile | Draw calls | Triangles | Three textures | Attachment bytes | Phaser estimate bytes |
| --- | ---: | ---: | ---: | ---: | ---: |
| Loaded Low | 37 | 1,654 | 2 | 3,557,376 | 2,055,110 |
| Loaded High | 46 | 19,440 | 4 | 11,239,424 | 5,514,022 |
| Larger/colour/reduced Low | 37 | 1,654 | 2 | 3,557,376 | 2,214,272 |
| Missing assets Low | 40 | 1,476 | 2 | 3,557,376 | 2,055,110 |

All eight full keyboard journeys now pass on Low/High at normal/larger text in English/Tamil: **10,715 checks**. Clean paths preserve 6,400 points; the two larger-Tamil assessments preserve the authored neighbor critical, 5,800 points, service 29/35 and a failed verdict. All durable records and suspended-workday reloads pass. The separate restricted-photo assessment also passes **1,331 checks**, keeping 5,400 points, service 5/6, two criticals and a failed verdict. Its settled result capture shows the expected 7 / 9 stars. The High larger-Tamil old-dialogue regression also passes 896 checks, including the real two-site walk, durable reloads and a settled 9 / 9 result. All four required repository browser suites (academy, enterprise, routeday, driving) pass sequentially. The shared inventory’s Node group contains one browser wrapper (scorm-launch-2004); the 77-entry count is 76 pure Node suites plus that passing SCORM browser check.

Visual inspection caught premature result captures: the source protocol takes them during the result
animations. Those original result PNGs are retained as diagnostic transition poses, not final visual
acceptance. The test-only `fp-result-capture` helper now waits for the real star counter, transition and
rank-up card, using Space to dismiss a real card when present. Its first integration exposed a hidden-focus-ring wait in the test helper; the corrected helper now passes the repeated restricted-photo journey. The original failure and explanation remain in `capture-helper-debug/`. Old-dialogue integration continues. The boxed Tamil glyphs are now independently reproduced with a read-only probe attached to the same
review browser: the existing stack selects NotoSans-Bold; a Tamil-first prefix selects NotoSansTamil-Bold
and renders the sample correctly, with byte-identical pixels to explicit Noto Sans Tamil. The corrected
sample is 10.23% wider. A concrete unapplied shared-factory patch and full pixel/coverage proof are in
[font-diagnostic/](font-diagnostic/README.md) for Claude. This direct proof supersedes the queued duplicate
Tamil doorstep repeat; the photo and old-dialogue jobs still validate settled capture timing. No theme, font or translation source
has been edited, and no all-language readability acceptance is claimed.

Native validation is being collected against the frozen candidate. Final reports, screenshots and exact raw logs
will be indexed in `manifest.json`; pending jobs must not be treated as passed. Cloud software-renderer
FPS cannot certify the owner's Intel 60 FPS requirement. New English sentences still await translation;
English/Tamil layout checks do not claim all new sentences are already translated.

Both High English journeys have also completed with their original clean 6,400-point results and durable records. The remaining High Tamil cases and subsequent browser regressions remain active; no full eight-layout or task acceptance is claimed.

The existing four-id source scope has now finished its scheduled checks: **12,942 native checks across ten journeys**, 44 resource views, 17,700 CPU geometry views, 76 pure Node suites plus the inventory’s SCORM browser, and four required repository browser regressions. Whole C-41 remains blocked on the optional safety/efficiency contract and confirmed shared Tamil font/A-31 work. No registry/default/current-pilot/Intel acceptance is implied.
