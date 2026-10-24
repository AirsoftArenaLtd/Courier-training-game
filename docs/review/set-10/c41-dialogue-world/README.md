# C-41 physical dialogue slice — 24 October 2026

The three existing customer conversations now run at physical customer, door, reception and phone targets in the
isolated 3D runner. Missing-package and signature conversations use the house; two stops uses a reception and a
separate house connected by a walkable sidewalk. Bundled resident rigs and town buildings are used when available,
with procedural fallbacks. The original graphs, TalkController score effects, categories, score scale, criticals,
flags and conditional endings remain authoritative. The new transcript contains only statements actually heard,
replies actually chosen and practice feedback; assessments contain no trainer feedback.

Each reply has its own full-size page. Reviewing replies, the question or earlier statements keeps the original
decision deadline running; pause and handheld menus freeze it. The overall scenario also pauses in those menus.
Escape, remappable target/action keys, digit choices, larger text, colour-blind mode and reduced motion remain
available. Site changes close the conversation and require voluntary walking. Scripted courier stage directions
do not teleport or force the first-person camera. NPC and dog staging has fixed buffers and bounded waypoints.

This is a completed slice of **C-41, which remains doing**. Tricky Doorsteps, new optional intercom/reception/locker
protocols, A-30 shared registry/completion work, translations and combined current-pilot acceptance remain. The
unapplied `registry-dialogue.patch` proposes only the three existing `scene3d` fields. Default routing and the 2D
fallback have not been edited. There are no new workday event types or module calls to `OTR.workday.report`.

The branch is stacked on pushed C-38 at `b860fa180e3a4631d351eba765314e2b87ff52dd`; the frozen executable source for
this evidence is `075acd92d0cb870fdf71824486914368239851b5`. It does not incorporate later pilot-only fixes or the
separate C-39/C-40 branches. This folder does not claim combined current-pilot or default-switch acceptance.
The earlier pure-model evidence remains separately scoped in `../c41-progress/`.

Run one browser at a time, serving this checkout on HTTP port 8383:

```sh
node --test test/fpcustomertalk.js test/fpcustomerscenario.js test/fpcustomerworld.js test/fpcustomergeometry.js test/fpscenario.js
QA_BASE=http://127.0.0.1:8383 QA_BROWSER=/usr/bin/chromium QA_TAG=c41-customer-native-075acd92-v3 node test/fpcustomerbrowser.js
QA_BASE=http://127.0.0.1:8383 QA_BROWSER=/usr/bin/chromium QA_FPS_FLOOR=0 QA_TAG=c41-customer-resource-075acd92 node test/tools/fp-customer-quality.js
```

The resource matrix invokes the existing `test/fpbench.js` and unchanged quality ceilings. Its eight static poses
per profile deliberately freeze the decision clock; they are render/resource evidence, not native gameplay or
grading evidence. `customerProof` records actual local assets versus failed fetches and course/workday isolation.
The separate native protocol uses actual remapped keys, all reply pages, actual mission walking, real results and
durable workday/assessment records. It never fixtures positions, nodes, decision timers, scores or verdicts.

| Profile | Views | Draw calls | Triangles | Three textures | Attachment bytes | Phaser estimate bytes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Loaded Low | 8 | 37 | 1,258 | 2 | 3,557,376 | 1,488,272 |
| Loaded High | 8 | 40 | 26,010 | 4 | 11,239,424 | 4,485,136 |
| Larger/colour/reduced Low | 8 | 37 | 1,258 | 2 | 3,557,376 | 1,777,643 |
| Missing assets Low | 8 | 39 | 946 | 2 | 3,557,376 | 1,488,272 |

All original ceilings pass. An additional CPU sweep covers 3,360 Low views with models and 3,360 with fallback:
four dialogue poses, seven customer/sidewalk positions, 24 headings and five pitches. Main plus the most costly
actual mirror pass peaks at 34 calls / 1,252 triangles loaded and 37 / 946 fallback. It excludes the compositor and
does not measure GPU memory or frame rate. Cloud software-renderer FPS cannot certify the Intel 60 FPS gate; O-1
remains the existing owner measurement.

All **7,081 native checks in ten journeys pass**. The eight Low/High × English/Tamil × normal/larger layouts
are supplemented by Tamil/larger two-stop assessments at both qualities. All reply pages keep full-size text inside
the panel without overlap. Remapped O/U targets/actions, controls, factual handheld pages and clock pauses pass.
The trainee actually walks between the two stops. Good dialogue results remain 1,800 / 1,800 / 2,500 points; both
larger signature runs choose an authored critical reply and retain the original 900 points, ratios .625/.4, two
critical findings and failed assessment. All ten results and assessment attempts survive reload while the real
suspended workday journal and checkpoint remain unchanged. No page errors occur. Native screenshots retain the
1280 × 720 viewport.

The 72-suite repository run at the frozen source is indexed in `results.json`; exact raw TAP and its inventory are
retained in `raw-node-logs.tar.gz` with per-file hashes. The later geometry test adds one separately recorded pass, for 73 passing available Node suites. The four required
browser regressions (`academy`, `enterprise`, `routeday`, `driving`) also pass, run sequentially. Their exact raw logs
are indexed in `raw-browser-logs.tar.gz` and `browser-results.json`.
The six model cases still cover 730 reachable logical endings, 9,192 state/result comparisons and 12 timed branches
against real 2D transitions/results. Focused logs, raw resource reports and all 32 captures are included here.

`diagnostic-native-attempts.tar.gz` preserves two failed test-harness attempts: the first treated the Results
transition as a new walking stage; the second read an absent assessment table in a practice profile. Both reached
the original good ending. Only test code changed to wait for the completed session and read the optional table.
These attempts are not acceptance evidence. `manifest.json` records the final native result and its exact protocol
hash separately from the frozen executable source. The added native/geometry protocols and corrected unapplied
registry patch are committed at `782ea0cb1879d0f335011c7d0bfb992bd6f2f753`; executable files remain byte-identical
to the frozen runtime, as checked in `source-equivalence.json`. New English sentences await Claude's translations; the native
English/Tamil layout scope is not a claim that every new sentence is already translated in all 12 languages.
