# Low-graphics 3D workday budget

**C-39 current-pilot rebase (28 October 2026):** runtime `a5c6cf64` passes 24 focused CPU suites, 2,750 selected native assertions and 92 static resource views. Peak calls / triangles: junction Low **44 / 1256**, High **55 / 87825** (accessible Low 44 / 1266); school Low **40 / 1178**, High **74 / 161417**; night Low **42 / 1236**, High **55 / 79455**. All four profiles retain original texture/attachment/Phaser caps. Frozen 800 inputs, four fonts and 177 artifacts plus cleanup verified. Native shortcut declarations and full profile tables are in `docs/review/set-10/c39-pilot-rebase/README.md` and `verification.json`; old reports retain their source scope. Intel FPS remains O-1.
**C-38 rebase, 28 October 2026:** on pilot `3678fba3`, runtime `66f2cda5` passes 18 focused CPU suites, 231 native assertions/eight English/Tamil normal/larger layouts and 24 resource views. Peaks (calls / triangles / Three textures / attachment bytes / Phaser estimate): Low **32 / 870 / 2 / 3557376 / 1597840**, High **47 / 32707 / 4 / 11239424 / 4923856**, accessible Low **32 / 870 / 2 / 3557376 / 1969664**, fallback Low **36 / 716 / 2 / 3557376 / 1597840**. Original caps remain; 555 inputs, four fonts and 42 artifacts verified, including cleanup. Exact scope: `docs/review/set-10/c38-pilot-rebase/README.md` and `verification.json`. Earlier reports retain their original scope; Intel FPS remains O-1.

**C-52 road visibility review correction (28 October 2026):** lowering the common instrument face 4 cm restores the existing 23 m road pixel; native lighting sum differences are +21.72 Low and +20.38 High against the unchanged +12 test. On pilot `9105e301` plus pushed B-181 and the C-52 visual patch, all **40 focused resource views**, **392 native checks** and **1,176 strict normal/larger language views** pass. Peaks (calls / triangles / Three textures / attachment bytes / Phaser estimate): loaded Low **53 / 1858 / 2 / 3557376 / 2074422**, High **76 / 122843 / 4 / 11239424 / 6830182**, accessible Low **53 / 1858 / 2 / 3557376 / 2528230**, fallback Low **47 / 1654 / 2 / 3557376 / 2074422**. Original ceilings, fixtures and road sample remain. The inherited benchmark hub-only wrapper closing brace is repaired; native/language runtime is identical across the two attempts. Exact sources, failures, captures, manual review and cleanup: `docs/review/set-10/c52-road-followup/README.md` and `verification.json`. Earlier broad results retain their original scope; cloud FPS does not certify Intel 60 fps (O-1).

**C-39 school four-profile gate (23 October 2026):** all 32 school resource/visibility views pass the unchanged limits. The game tree is `ec9aaeae`; QA-only revision `b7dc5de8` strengthens the High child target to an actual posed upper-body triangle. All 85 non-browser suites pass at that QA revision. Four Low English/Tamil normal/larger native runs pass 394 checks, including the two larger-text assessments; High native runs, painted-driving checks and the retained runner continue. Evidence: `docs/review/set-10/c39-school-progress/validated-b7dc5de8/manifest.json`. C-39 remains doing. These are resource counts, not Intel-laptop FPS; O-1 remains.

**C-39 painted-driving resource gate (23 October 2026):** all 72 focused views pass across four original profiles on frozen candidate `b7dc5de8` (game tree `ec9aaeae`), with no ceiling changes. The 85 non-browser suites share that candidate. Raw reports, independent revalidation and screenshots: `docs/review/set-10/c39-driving-progress/painted-b7dc5de8/manifest.json`. The first current High larger-text native attempt stopped after 132 checks and three reverse bays; it is diagnostic only. Test-only bounded live-game waits and error-cause capture are being rerun. Five older native modes/936 checks retain their separate `bf3cbb8b` source scope. Whole C-39 stays doing; this is not Intel-laptop FPS proof (O-1).

**C-39 painted-driving resource gate (23 October 2026):** all 72 focused views pass across four original profiles on frozen candidate `b7dc5de8` (game tree `ec9aaeae`), with no ceiling changes. The 85 non-browser suites share that candidate. Raw reports, independent revalidation and screenshots: `docs/review/set-10/c39-driving-progress/painted-b7dc5de8/manifest.json`. The first current High larger-text native attempt stopped after 132 checks and three reverse bays; it is diagnostic only. The retained generic runner passes all 231 checks; test-only bounded live-game waits and error-cause capture are being rerun in the three remaining High driving configurations. Five older native modes/936 checks retain their separate `bf3cbb8b` source scope. Whole C-39 stays doing; this is not Intel-laptop FPS proof (O-1).

**C-39 readable night inspection and strict school finish (28 October 2026):** on the existing C-38 stack, all **407 native checks** pass (night 105 Low + 105 High larger; strict school parking 104 Low + 93 High larger), with unchanged time steps and native encounter/control gates. Four inspection-only resource profiles pass original protocol and ceilings: Low **36 / 914 / 2 / 3557376 / 1372294**, High **45 / 51992 / 3 / 9142272 / 4020550**, accessible Low **36 / 914 / 2 / 3557376 / 1450139**, missing-model Low **38 / 630 / 2 / 3557376 / 1372294** (calls / triangles / Three textures / attachment bytes / Phaser estimate). All 696 frozen inputs and 26 artifacts verified, cleanup complete, selected High captures inspected. Earlier 28 night resource views retain their attempt-2 scope. Evidence: `docs/review/set-10/c39-night-integration/final-verification.json`. Shared optional A-30 launcher/translation and post-C-52 rebase are separate; no current-pilot or Intel FPS certification.

**C-39 drill bus paint correction (23 October 2026):** screenshot review caught a black procedural bus caused by an enabled vertex-colour input absent from its geometry. The existing per-instance yellow/blue paint now renders correctly. All 85 Node suites and eight fresh bus-only fpbench views pass at candidate `85b248bf`. Loaded Low: **45 calls / 1,670 triangles / 2 Three textures / 3,557,376 attachment bytes / 1,541,152 Phaser estimate bytes**; High: **85 / 167,167 / 4 / 11,239,424 / 4,696,880**; accessible Low: **45 / 1,670 / 2 / 3,557,376 / 1,659,952**; fallback Low: **46 / 1,620 / 2 / 3,557,376 / 1,541,152**. No geometry, texture, pass or ceiling changes. This is a targeted eight-view sweep, not a fresh 72-view matrix or a performance improvement over that larger scope. Matched before/after views and exact source: `docs/review/set-10/c39-driving-progress/bus-colour-correction/manifest.json`. Native/previous full-resource evidence keeps its recorded source scope; cloud FPS is not Intel-laptop proof (O-1).

**C-39 painted-driving resource gate (23 October 2026):** all 72 focused views pass across four original profiles on frozen candidate `b7dc5de8` (game tree `ec9aaeae`), with no ceiling changes. The 85 non-browser suites share that candidate. Raw reports, independent revalidation and screenshots: `docs/review/set-10/c39-driving-progress/painted-b7dc5de8/manifest.json`. The first current High larger-text native attempt stopped after 132 checks and three reverse bays; it is diagnostic only. The retained generic runner passes all 231 checks, and all three corrected High driving cases pass 554 native checks. Together with the separately scoped five earlier cases/936 checks, all eight configurations are covered; this is not a single-revision matrix. Five older native modes/936 checks retain their separate `bf3cbb8b` source scope. Whole C-39 stays doing; this is not Intel-laptop FPS proof (O-1).

| Driving profile | Views | Calls | Triangles | Three textures | Attachment bytes | Phaser estimate bytes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| loaded-low | 18 | 45 | 1670 | 2 | 3557376 | 2105926 |
| loaded-high | 18 | 86 | 185244 | 4 | 11239424 | 5921222 |
| accessible-low | 18 | 45 | 1670 | 2 | 3557376 | 2285670 |
| fallback-low | 18 | 46 | 1620 | 2 | 3557376 | 2105926 |

**C-39 school four-profile gate (23 October 2026):** all 32 school resource/visibility views pass the unchanged limits. The game tree is `ec9aaeae`; QA-only revision `b7dc5de8` strengthens the High child target to an actual posed upper-body triangle. All 85 non-browser suites pass at that QA revision. All eight Low/High English/Tamil normal/larger native runs pass 788 checks, including all four larger-text assessments. All 72 painted-driving resource views and 231 retained generic runner checks also pass; all three current High driving native cases also pass 554 checks. Evidence: `docs/review/set-10/c39-school-progress/validated-b7dc5de8/manifest.json`. C-39 remains doing. These are resource counts, not Intel-laptop FPS; O-1 remains.

| School profile | Views | Calls | Triangles | Three textures | Attachment bytes | Phaser estimate bytes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| loaded-low | 8 | 40 | 1178 | 2 | 3557376 | 1857051 |
| loaded-high | 8 | 69 | 161008 | 4 | 11239424 | 5281648 |
| accessible-low | 8 | 40 | 1178 | 2 | 3557376 | 2012576 |
| fallback-low | 8 | 41 | 1124 | 2 | 3557376 | 1857051 |

**C-39 school Low slice (23 October 2026):** current-pilot candidate `ec9aaeae` passes all eight loaded-Low resource/visibility views at **40 calls / 1,178 triangles / 2 Three textures / 3,557,376 attachment bytes / 1,857,051 Phaser estimate bytes**, with unchanged ceilings and all 85 non-browser suites passing. Raw reports, source and screenshots: `docs/review/set-10/c39-school-progress/validated-ec9aaeae/manifest.json`. The stronger sign proof requires six clear text-line rays; the bus lamp must actually be lit. Other profiles, native assessment/records, painted-driving checks and C-39 completion remain pending. This is not Intel-laptop FPS (O-1).

**C-39 school and painted-bay hooks (23 October 2026, validation pending):** one reused four-instance road marking adds 48 CPU-counted triangles and no texture or render pass only in the module scenarios. Twenty local suites pass, including geometry correspondence and the unchanged ceilings/proof guard. No new renderer peaks are claimed: school and painted-driving views still need the fpbench/fpquality gate. An older frozen driving baseline completed five native configurations/936 checks before a local-server interruption; it predates these hooks. Evidence and operational approval-review block: `docs/review/set-10/c39-school-progress/manifest.json` and `c39-driving-progress/interrupted-23-oct/manifest.json`. O-1 remains; cloud FPS is not Intel-laptop proof.

**C-39 hazard perception (23 October 2026):** all 60 focused views pass at `58f40e25`. loaded-low **39 / 2124 / 2 / 3557376 / 1675563**; loaded-high **52 / 23165 / 4 / 11239424 / 5234523**; accessible-low **39 / 2124 / 2 / 3557376 / 1862646**; fallback-low **41 / 2172 / 2 / 3557376 / 1675563** (calls / triangles / Three textures / attachment bytes / Phaser estimate bytes). 1431 native checks across eight layouts plus spam and 231 retained runner checks pass; nine current targeted suites and keyboard menus pass. The 87-suite repository baseline is separately scoped to `4b0e7b03`, before the observation-eye correction. Strict cue sightlines, isolated workday/checkpoints, true fallbacks and all ceilings are unchanged. Evidence: `docs/review/set-10/c39-hazard-acceptance/manifest.json`. This is a module slice, not C-39 completion or a fresh full-workday/Intel FPS pass; O-1 remains.

**C-39 route-planning progress (23 October 2026; task still doing):** all 24 focused registered-module resource views pass at candidate `a7be9d9a`. loaded-low **28 / 642 / 2 / 3557376 / 1742086**; loaded-high **42 / 6006 / 4 / 11239424 / 5499718**; accessible-low **28 / 642 / 2 / 3557376 / 1948064**; fallback-low **32 / 716 / 2 / 3557376 / 1742086** (calls / triangles / Three textures / attachment bytes / Phaser estimate bytes). The default workday gate and ceilings stay unchanged. The vector map is cached between edits and uses no new image/Three texture or pass. Native good/bad same-id results, assessment and layout cases pass. Evidence: `docs/review/set-10/c39-route-acceptance/manifest.json`. This does not accept the remaining C-39 adapters or certify native Intel FPS (O-1).

**C-39 pre-trip progress (23 October 2026; whole task still doing):** all 32 focused registered-module resource views pass at candidate `c244a076`. loaded-low **33 / 894 / 2 / 3557376 / 2737760**; loaded-high **46 / 13299 / 4 / 11239424 / 5702064**; accessible-low **33 / 894 / 2 / 3557376 / 2856758**; fallback-low **40 / 836 / 2 / 3557376 / 2737760** (calls / triangles / Three textures / attachment bytes / Phaser estimate bytes). Ceilings stay unchanged. All repository checks are covered by the 82 passing broad suites and the corrected current shared English-assertion guard; native pre-trip and retained-runner checks pass. One inspection canvas is reused and released; no new Three texture/pass/asset. Source, commands, raw reports and screenshots: `docs/review/set-10/c39-pretrip-progress/manifest.json`. This is not acceptance of the remaining C-39 adapters, a fresh 224-view workday gate or native Intel FPS (O-1).
**C-40 optional heavy handling (28 October 2026):** the separate physical adapter enforces the confirmed 50 lb/23 kg posted limit; gripping at floor height is allowed, actual unsupported upward movement is critical. Ten core + three physical-world adapter + 43 related cases and **593 native checks / 35 layouts** pass. All **24 focused resource views** pass original sound/reflection/asset/ceiling protocol: Low **35 / 1160 / 2 / 3557376 / 1857515**, High **37 / 16290 / 4 / 11239424 / 5624326**, accessible Low **35 / 1160 / 2 / 3557376 / 2130390**, missing-model Low **41 / 1004 / 2 / 3557376 / 1857515** (calls / triangles / Three textures / attachment bytes / Phaser estimate). Native 556 inputs/17 artifacts and resource 558 inputs/28 artifacts verified; runtime bytes match and owned servers/lease clean up. Exact scopes/captures: `docs/review/set-10/c40-heavy-policy/README.md`. Explicit resource poses are separate from actual native controls. Existing five-load and other m2 evidence remain historical; shared optional A-30/translation and post-C-52 rebase are separate. No Intel FPS certification.

**C-40 lifting bay (24 October 2026; existing slice validated, whole task blocked on the optional-heavy contract):** all 32 corrected resource views pass at `4401c375`. loaded-low **35 / 1160 / 2 / 3557376 / 1928998**; loaded-high **37 / 16326 / 4 / 11239424 / 6247814**; accessible-low **35 / 1160 / 2 / 3557376 / 2400731**; fallback-low **41 / 992 / 2 / 3557376 / 1928998** (calls / triangles / Three textures / attachment bytes / Phaser estimate bytes). Original ceilings stay unchanged. Eight native layouts pass 1793 checks at `11872d72`; two further Tamil larger/reduced-motion assessment cases pass 581 checks after the stale-needle/cached-camera correction, handling four loads and gripping/stepping down the shelf load before actual abandonment. All stores and suspended workdays survive reload. All 80 available Node suites pass at the corrected source, plus pilot B-159 read-only. A 4,800-view CPU sweep of real Low models/fallback peaks at 35 / 1,216 and 41 / 1,080; this is geometry evidence, not GPU memory or Intel FPS. Source bridge, exact logs and screenshots: `docs/review/set-10/c40-lift-bay/manifest.json`. Kernel, grading, 2D fallback and defaults are unchanged. Optional-heavy policy, A-30 registration/translations, combined current-pilot/default-workday acceptance and existing Intel measurement O-1 remain pending.

**C-40 conveyor slice (24 October 2026; whole task still doing):** all 32 focused resource views pass at `5d59c553`, using sixteen parcels and physical controls/readings under the original ceilings. loaded-low **38 / 2234 / 2 / 3557376 / 1908998**; loaded-high **39 / 12192 / 4 / 11239424 / 6167814**; accessible-low **37 / 2234 / 2 / 3557376 / 2044320**; fallback-low **44 / 2126 / 2 / 3557376 / 1908998** (calls / triangles / Three textures / attachment bytes / Phaser estimate bytes). The first unculled probe failed at 3,992 triangles and is retained as diagnostic. Exact per-instance culling and mirror-buffer restoration now pass. Eight final native layouts / 1,517 checks at `3402c571` add actual staged sorting, remapping, assessment/save preservation, a legacy-result handoff correction and stable visible P focus. The later CPU/control/result delta adds no renderable object, texture or pass; the 32-view gate retains its original source scope. Reports, source bridge and screenshots: `docs/review/set-10/c40-sort-conveyor/manifest.json`. Full C-40/current-pilot/default-workday acceptance and Intel measurement O-1 remain pending. New sentences await translation.

**C-40 label-station slice (24 October 2026; whole task still doing):** all 24 focused physical-station resource views pass at `f23192aa`. loaded-low **33 / 1925 / 2 / 3557376 / 1949232**; loaded-high **34 / 11691 / 4 / 11239424 / 5293840**; accessible-low **33 / 1925 / 2 / 3557376 / 2097867**; fallback-low **38 / 1817 / 2 / 3557376 / 1949232** (calls / triangles / Three textures / attachment bytes / Phaser estimate bytes). Original ceilings and default workday gate are unchanged. Eight native layouts / 4,680 checks retain runtime `028d5637`; two targeted assessment layouts / 89 checks validate the later front-position feedback and remapped controls. The former package-zero resource fixture is retained as diagnostic and superseded by this canonical 24-view retake. Source bridge, raw reports and screenshots: `docs/review/set-10/c40-label-station/manifest.json`. This validates a slice on the pushed C-38 stack; physical sorting/lifting, combined current-pilot and whole-task acceptance remain pending. New sentences await translation. Intel FPS remains O-1.
**C-41 optional protocols (28 October 2026; owned scope ready for review):** runtime `69817c13` on the pushed C-38/C-41 stack passes all **32** focused resource views. Loaded Low **28 / 1146 / 2 / 3557376 / 2063622**; High **43 / 28936 / 4 / 11239424 / 5500646**; accessible Low **28 / 1146 / 2 / 3557376 / 2187072**; missing-model Low **31 / 942 / 2 / 3557376 / 2063622** (calls / triangles / Three textures / attachments / Phaser estimate bytes). Mounted intercom controls, a staffed counter and moving lockers reuse the three original doorstep batches with no new texture/pass. The 194 component cases and 1,435 native checks across seven journeys/76 layouts pass, including the corrected-but-still-failed assessment and durable suspended-workday isolation. Independent verification covers 560 unique runtime/test inputs, four host font files, 61 artifacts and cleanup; exact scope: `docs/review/set-10/c41-protocol-policy/README.md`. New translations, shared A-30 optional routing, combined current-pilot/rebase/font layouts and Intel O-1 remain separate. Original ceilings are unchanged; cloud FPS is not an Intel measurement.

**C-42 physical problem-solving progress (24 October 2026; not acceptance):** 23,760 Low CPU views across all four authored graphs, six cab/cargo/sidewalk/customer poses, twelve headings and three pitches pass the unchanged geometry ceilings. Loaded peak **37 calls / 2,392 triangles**; fallback **38 / 2,044**, including the most costly actual mirror pass. Four existing-id logical/physical suites pass; mounted lettering has fixed geometry pools and adds no image texture. This CPU check excludes weather shader/compositor cost and GPU memory. Rendered `fpbench`, native keys/layouts/screenshots and combined current-pilot acceptance are pending; no FPS claim. Raw scope/logs: `docs/review/set-10/c42-problem-progress/`. Existing Intel O-1 remains.

**C-42 physical problem-solving progress (24 October 2026; not acceptance):** Corrected frozen runtime `fa1a5579` passes 23,760 Low CPU views across all four authored graphs, six cab/cargo/sidewalk/customer poses, twelve headings and three pitches pass the unchanged geometry ceilings. Loaded peak **37 calls / 2,392 triangles**; fallback **38 / 2,044**, including the most costly actual mirror pass. Four existing-id logical/physical suites pass; mounted lettering has fixed geometry pools and adds no image texture. This CPU check excludes weather shader/compositor cost and GPU memory. Rendered `fpbench`, native keys/layouts/screenshots and combined current-pilot acceptance are pending; no FPS claim. Raw corrected scope/logs: `docs/review/set-10/c42-problem-validation/`; the earlier candidate remains in `c42-problem-progress/`. Existing Intel O-1 remains.


**25 October 2026 — C42 existing-id browser evidence completed.** All 32 good native layouts plus critical/timeout/legacy/repository checks are collected without rerunning passed tests. Resource figures below are unchanged: 48 views under original limits; Low 39/2086, accessible 39/2086, fallback 41/1926, High 56/35352 (calls/triangles). Exact reports and 22-job continuation: `review/set-10/c42-entry-alignment/completed-continuation-20261025/`. Shared optional-id/font/A31 and Intel O1 gates remain open.

**C-42 final existing-id resource gate (24 October 2026; native continuation active):** unchanged runtime `836a101a`, corrected resource protocol `c2998888`, passes all **48** views in the four original profiles. Loaded Low **39 / 2086 / 2 / 3557376 / 1939083**; High **56 / 35352 / 4 / 11239424 / 5252955**; accessible Low **39 / 2086 / 2 / 3557376 / 2106224**; fallback Low **41 / 1926 / 2 / 3557376 / 1939083** (calls / triangles / Three textures / attachment bytes / Phaser estimate bytes). The original ceilings are unchanged. Seventeen durable native journeys passed before the recessed second-door approach needed a test-route correction; remaining journeys/follow-ups run under protocol `27c4e863`. Resources, raw reports and captures: `docs/review/set-10/c42-entry-alignment/runtime-836a101a-c2998888/`. This is no complete native-matrix, readable-Tamil, current-pilot/default or Intel FPS acceptance. Shared optional-policy/font blocks remain.

**26 October 2026 — C45 pickup counter candidate; full browser gate pending.** The **6,048-pose CPU Low sweep** passes at loaded **31 calls / 1,746 triangles** and fallback **37 / 1,592**. The earlier three-view Low rendered preflight passes **25 / 1,514 / 2 Three textures / 3,557,376 attachment bytes / 1,554,128 Phaser estimate bytes** under original ceilings. That subset predates the final text wording and is explicitly diagnostic. The current-app dirty native business preflight passes **837 checks / 26 captures**, original **2,300 points / six stars**, durable reload and suspended-workday isolation; four captures were visually inspected. The full clean-source 60-view rendered gate, 24 good native journeys, three harmful and three abandonment cases, and six repository browser jobs remain pending. Shared Tamil font/translation/A30/A31/default/current-pilot and owner Intel O1 stay separate. Exact raw reports, source hashes, Node logs and captures: `review/set-10/c45-initial-validation/`. No new texture or render pass is added; Low uses bounded geometry and one viewed printed label, while High uses the existing uploaded resident model.

**25 October 2026, 19:15 UTC — C44 all corrected-source resource profiles pass (41056a12).** All **56** views retain original ceilings and prove actual f10 gaze/ink; representative unit/strap captures and larger English native screens were visually checked. Exact peaks:

| Profile | Calls | Triangles | Three textures | Attachment bytes | Phaser estimate bytes |
| --- | ---: | ---: | ---: | ---: | ---: |
| loaded-low | 41 | 2290 | 2 | 3557376 | 1931760 |
| loaded-high | 77 | 56200 | 4 | 11239424 | 5223664 |
| accessible-low | 41 | 2290 | 2 | 3557376 | 2101056 |
| fallback-low | 45 | 2124 | 2 | 3557376 | 1931760 |

**26 October 2026, 00:21 UTC — C44 ready for Claude review.** **30/30 jobs pass** at application/protocol **41056a12**: all **16 good native journeys / 8484 checks / 400 captures**, plus two harmful journeys and two abandoned assessments, making **9953 native checks / 466 captures**. All eight good larger-text assessments pass once and survive reload. Unsafe loading keeps original **1200 points, safety 0 / efficiency 2**, and wrong-package finding keeps **622, efficiency 2 / service 0**; both assessments fail durably. Abandonment consumes one attempt, stays unpassed and records no completed play. All native results independently match the original 2D callbacks and preserve the suspended workday. All **56** resource views retain the original ceilings and actual viewed-label proof. SCORM2004, legacy modules (**231 checks**), academy, enterprise, route day and driving pass. Existing fresh **92-suite / 5664 actual-gaze CPU-pose** gate remains unchanged and was not repeated for docs-only collection. Final raw status/ledger, outcomes and newly inspected screenshots are in `review/set-10/c44-low-label-validation/`. **Ready for Claude review; the registry/default proposal remains unapplied.** Shared Tamil font/translation/A31, combined-pilot/A30/default rollout and owner Intel O1 remain separate.

**25 October 2026 — C44 viewed Low label, current 41056a12.** Actual ray/keyboard selected unit parcel f10 while nearest-distance ink printed f6. Low now prioritizes the real gaze target within the same one-label pool, with carried parcels first; no new texture/pass/raycast or per-frame allocation. Fresh **92/92 Node suites**, fourteen integration cases and the strengthened **5664-pose actual-gaze CPU** gate pass: **39/2370 loaded; 43/2204 fallback**, unchanged ceilings. Native/static gates require viewed ink and f10's actual unit face. Earlier e834ad69 **14 jobs / 5206 native checks / 56 resource views** retain their original scope; the numerical Low resource pass did not prove the viewed face was printed. All **14 corrected loaded-Low resource views pass** at **41 calls / 2290 triangles / 2 Three textures / 3557376 attachment bytes / 1931760 Phaser estimate bytes**, with actual f10 gaze/ink proof and three representative captures visually checked. **1/30** current jobs is accepted; High resources are active. No full-profile/native/FPS/whole-task claim yet. Exact evidence: `review/set-10/c44-low-label-correction/README.md`. C44 stays doing; shared language/default/current-pilot and Intel O1 remain separate.

**25 October 2026, 17:25 UTC — C44 High native loading passes.** At unchanged app `e834ad69` / protocol `ad2f294c`, **802 checks** verify twelve placements/restraints, the original **2100 points / six stars**, **169.156 game seconds** within the unchanged 210-second par, durable reload and workday isolation. Combined High normal English find/load: **1036 checks / 50 captures / 2 of 30 jobs**. Fourteen representative load images were inspected. Rendered loaded-Low resources are active; no current full resource result or Intel FPS claim. Existing 91-suite / 5664-view CPU figures and scoped High preflight remain unchanged and were not rerun for this evidence-only update. Evidence: `review/set-10/c44-native-validation/visual-review-high-en-normal-load.json`. C44 stays doing; original ceilings and shared language/default/Intel gates remain.

**25 October 2026 — C44 test navigation correction.** App `e834ad69` and all rendering bytes are unchanged. Test-only `ad2f294c` replaces the tight waypoint/turn loop with real forward/back/strafe navigation robust to batched frames; three actual-motor/model/collision/ray regressions pass. The interrupted ten-placement / 643-check load is archived and excluded. The completed prior High find (234 checks) remains in its original protocol scope; a 29-job continuation is active, combined **1/30** accepted. Existing 91-suite, 5,664-view CPU figures and scoped earlier High preflight retain their original scope; no new resource or FPS measurement is claimed. Evidence: `review/set-10/c44-native-walk-correction/README.md`. C44 stays doing; original ceilings and shared/Intel gates remain.

**25 October 2026, 15:18 UTC — C44 first final-source High native pass.** At unchanged `e834ad69`, the real-key English normal-text find journey passes **234 checks**, original **1591 points / six stars**, all five requests, durable reload and workday isolation. All **13 screenshots** were visually checked. High loading continues; **1/30** final-source jobs is accepted, and full resources/native/visual acceptance remains pending. Existing fresh **91-suite** and **5,664-view CPU** results plus the scoped earlier three-view High preflight retain their exact scope and figures; no new resource/FPS measurement or rerun is claimed. Evidence: `review/set-10/c44-native-validation/visual-review-high-en-normal-find.json`. C44 stays doing; original ceilings and shared/Intel gates remain unchanged.


**25 October 2026 — C44 keyboard focus, current application e834ad69.** The final top-parcel centre ray hit a rack lip in the first High native run. Cargo proxies now focus on their real label face, still requiring the actual unobscured ray; other controls retain their original focus. Fresh **91/91** Node suites pass, including 13 integration cases and five aisle poses at Low/High; all ten changed JS files pass syntax. No visual geometry change since the scoped c317 preflight; Low CPU remains **39/2370 loaded / 43/2204 fallback** across 5,664 views. The 197-check partial High native attempt is archived and excluded. Fresh full current-source browser validation is active at `c44-e834ad69-fit`; whole C44 stays doing. Original resource limits, shared A31/default and existing Intel O1 gates remain.


**25 October 2026 — C44 fitted cargo, final application b1930984.** All **91 pure Node suites** pass freshly. The **5,664-view** Low CPU geometry gate stays within original limits at **39 calls / 2,370 triangles loaded** and **43 / 2,204 fallback**. Ink now clears its actual backing, all original positions/collision fit the imported floor/doorway/roof, supported restraints wrap floor parcels, and only the module gate/owned bench geometry adapts. A three-view High static preflight at c317 (before equivalent allocation cleanup) passes **75 calls / 53,692 triangles / 4 textures / 11,239,424 attachment bytes / 4,712,123 Phaser bytes**, with actual readable labels/floor load visually checked. This is a scoped preflight, not the final 56-view gate. The fresh final-source 30-job browser sequence is active; earlier fc710227 figures remain historical. Exact evidence: `review/set-10/c44-high-fit-correction/`. No new texture/pass/budget increase; Intel O1 and shared language/default gates remain separate.


**25 October 2026 — C44 static cargo capture correction.** The initial 14-view loaded-Low run passed numerically at 41 calls / 2,280 triangles / 2 textures / 3,557,376 attachment bytes / 1,931,760 Phaser bytes. **These are now superseded diagnostics:** screenshot review found that pausing the static fixture had frozen the imported door closed in intended open-cargo views. Test-only `b7be6bde` settles that actor and requires actual door opening in resource/native proof. All 11 integration tests (including Low/High real-door geometry/clock regression), five syntax checks and the English-text audit pass; unchanged app `fc710227` keeps its original 90-suite / 5,664-view baseline. The strengthened first native journey passes **234 checks**. All **14 corrected loaded-Low views now pass** at **41/2280/2/3557376/1931760**, with actual door proof and open-cargo/strapped screenshots visually checked. High/accessibility/fallback and remaining native/repository checks are active; full C44 remains doing. Exact archive/evidence: `review/set-10/c44-static-door-correction/` and `review/set-10/c44-native-validation/`. Original limits and Intel O1 gate are unchanged.

**C-44 physical cargo progress (25 October 2026; runtime `fc710227`):** **5,664** integrated Low CPU views pass at loaded **39 calls / 2,370 triangles** and fallback **43 / 2,204**, main plus the most costly retained mirror, under the unchanged 64 / 2,500 limits. Low faced shelves/flat label surfaces and main-view-only tiny address ink keep the complete physical parcels, 21 positions and restraints bounded; hidden cargo is culled and mirror buffers restore exactly. No image map or pass is added by the fit-out. All **90 pure Node suites** pass. This is not a rendered texture/attachment or Intel FPS claim: the 56-view fpbench gate and browser checks are queued behind C42. C44 stays doing, with native gameplay/layout/screenshots and shared rollout acceptance pending. Evidence: `docs/review/set-10/c44-physical-progress/README.md`. O1 remains.

**C-43 final source-scoped gate (25 October 2026; app `8d5fb383`):** all **56** resource views pass unchanged ceilings: loaded Low **37 calls / 1674 triangles / 2 Three textures / 3557376 attachment bytes / 2974406 Phaser estimate**, accessible Low **37/1674/2/3557376/3221627**, fallback Low **40/1344/2/3557376/2950742**, loaded High **42/29614/4/11239424/6091174**. The 18,684-view Low CPU sweep passes at 34/2186 loaded and 37/2046 fallback, excluding compositor/GPU cost. All 36 browser jobs, 24 good journeys and harmful-ID/legacy/repository checks pass. No extra Three texture/pass or saved photo; previews are bounded transient canvases. Review evidence: `docs/review/set-10/c43-photo-correction/README.md`. Shared font/translation/current-pilot/A31 and owner Intel O1 remain separate; cloud FPS is not hardware acceptance.

**C-43 final loaded-Low profile (24 October 2026; runtime `8d5fb383`):** all **14** resource views pass at **37 calls / 1,674 triangles / 2 Three textures / 3,557,376 attachment bytes / 2,974,406 Phaser estimate bytes**, under the original limits. This includes actual photo preview, ID fields, reception, closed-business signs, handheld and cab/reverse views. SCORM2004 passes. The remaining profiles and native matrix are still running, with no whole-task/Tamil/current-pilot/Intel claim. Raw reports and captures: `docs/review/set-10/c43-photo-correction/loaded-low-8d5fb383/`.

**C-43 actual photo preview (24 October 2026; final runtime `8d5fb383`):** all 86 pure Node suites pass freshly. Focused Low/High image preflights at `6f96d641` pass unchanged budgets: Low **27 / 912 / 2 / 3557376 / 2050144**; High **31 / 12960 / 4 / 11239424 / 5697040** (calls / triangles / Three textures / attachment bytes / Phaser estimate bytes). They show actual framebuffer images, with one transient thumbnail capped at 320×180 Low / 640×360 High; the final source adds a tested readback timeout. No extra Three texture/pass or saved image. These two views are preflight evidence, not the complete 56-pose/native matrix. The final matrix is active with persistent per-case journals. The 18,684-view CPU geometry peaks remain 34/2186 loaded and 37/2046 fallback. Captures and source scopes: `docs/review/set-10/c43-photo-correction/`. Tamil/current-pilot/A31 and Intel O1 remain separate.


**C-43 scanner physical progress (24 October 2026; runtime `0adf5acc`, browser gate queued):** all nine authored stops retain their original local-log results. The **18,684-view CPU Low geometry sweep** passes at loaded **34 calls / 2,186 triangles** and fallback **37 / 2,046**, main plus the most costly actual mirror, under the unchanged 64/2,500 ceilings. It covers cab forward/reverse and four parcel/person/photo stages, seven positions, twelve headings and three pitches per stop. No new Three texture or render pass is introduced; Phaser ID portrait/text memory remains for the actual fpbench gate. This is no rendered-resource, native-layout, readable-Tamil, current-pilot/default or Intel FPS acceptance. Exact source and reports: `docs/review/set-10/c43-progress/`. The 56-pose rendered gate and native/repository checks wait for the sole active C-42 browser to finish.


**C-42 fitted entrance/parcel progress (24 October 2026; full browser gate active):** frozen runtime `836a101a` passes all 80 pure Node suites and the enlarged **27,720-view** Low CPU sweep: loaded **37 calls / 2,394 triangles**, fallback **38 / 2,284**, main plus the most costly actual mirror. Entrances fit the real house, plaques fit the wall, and parcel cues use bounded geometry without a new texture/pass. This CPU check excludes weather shader/compositor cost, GPU memory and FPS. Earlier fa1a5579 resource figures passed numerical ceilings but are superseded diagnostics after visual inspection; final rendered/native checks are running on the corrected source. Exact scopes/raw logs/captures: `docs/review/set-10/c42-entry-alignment/`. No native Intel FPS claim; O-1 remains.

**C-41 physical Tricky Doorsteps (24 October 2026; native validation under way):** all 44 focused resource views pass on frozen candidate `f80f76c4`, runtime `b17f462b`, stacked on pushed C-38. Loaded Low **37 / 1654 / 2 / 3557376 / 2055110**; loaded High **46 / 19440 / 4 / 11239424 / 5514022**; accessible Low **37 / 1654 / 2 / 3557376 / 2214272**; missing-assets Low **40 / 1476 / 2 / 3557376 / 2055110** (calls / triangles / Three textures / attachment bytes / Phaser estimate bytes). The eleven poses per profile include long replies, real signature widgets and cab report/findings, with no ceiling change. A separate 17,700-view Low CPU sweep peaks at **34 / 1852** loaded and **37 / 1674** fallback, including the most costly real mirror/rear pass but excluding compositor cost. Local residents/houses, opening doors, real treads, parcel/hand-truck targets, photo framing and wall-mounted lettering remain bounded; High font geometry adds no GPU texture. Raw reports and captures: `docs/review/set-10/c41-doorsteps/`. Native journeys, optional-protocol policy, translations, combined current-pilot acceptance and Intel O-1 are still pending. Cloud FPS is not an Intel measurement.

**C-41 physical dialogue slice (24 October 2026; whole task doing):** all 32 focused resource views pass on frozen runtime `075acd92`, stacked on pushed C-38. Loaded Low **37 / 1258 / 2 / 3557376 / 1488272**; loaded High **40 / 26010 / 4 / 11239424 / 4485136**; accessible Low **37 / 1258 / 2 / 3557376 / 1777643**; missing-assets Low **39 / 946 / 2 / 3557376 / 1488272** (calls / triangles / Three textures / attachment bytes / Phaser estimate bytes). The original ceilings are unchanged. A separate 6,720-view Low CPU customer/sidewalk sweep peaks at 34 / 1,252 loaded and 37 / 946 fallback, excluding the compositor. These are the three existing dialogue adapters, with actual local resident/building models and procedural fallback. Native journeys, exact source scopes and captures are indexed in `docs/review/set-10/c41-dialogue-world/manifest.json`; whole C-41, current-pilot integration, translations and default switching remain pending. Cloud FPS does not certify Intel 60 FPS (O-1).

**C-38 focused module gate (22 October 2026):** all 24 rendered set-piece views pass on candidate `a195d5a3`. loaded-low **32 / 870 / 2 / 3557376 / 1597840**; loaded-high **47 / 32611 / 4 / 11239424 / 4923856**; accessible-low **32 / 870 / 2 / 3557376 / 1969664**; fallback-low **36 / 716 / 2 / 3557376 / 1597840** (calls / triangles / Three textures / attachment bytes / Phaser estimate bytes). Original ceilings are unchanged. Depot, street, doorstep, cab, live reverse camera and handheld are measured in the actual runner, with native workday/checkpoint isolation. Repository, native practice/assessment/results/fallback, cab, signal and narration checks pass. Exact source, commands, reports and screenshots: `docs/review/set-10/c38-acceptance/manifest.json`. C-52’s 224-view workday baseline retains its original source scope. Intel FPS remains O-1.

**C-38 exploratory module progress (22 October 2026; final acceptance pending):** six native loaded Low set-piece views pass at candidate `7ad9f3bf`, peaking at **32 calls / 870 triangles / two Three textures / 3,557,376 attachment bytes / 1,602,768 Phaser estimate bytes** under the original ceilings. This source predates the assessment-caption and repeated-scene entry corrections. Its raw report was independently revalidated; it is not the final 24-view module gate, a fresh 224-view workday pass or native Intel FPS evidence. Final current-pilot checks run separately. Reports, screenshots and exact scopes: `docs/review/set-10/c38-progress/manifest.json`. O-1 remains.

**C-52 cab and device appearance (22 October 2026):** all 224 resource views pass on candidate `7dcbd2b6`, carrying current pilot and the pushed B-164/C-49/C-50/C-51 stack. loaded-low **53 / 2402 / 2 / 3557376 / 2623766**; loaded-high **113 / 240133 / 4 / 11239424 / 7947600**; accessible-low **53 / 2402 / 2 / 3557376 / 2946992**; fallback-low **53 / 2168 / 2 / 3557376 / 2371462** (calls / triangles / Three textures / attachment bytes / Phaser estimated bytes). Ceilings are unchanged. Native instrument/device checks, normal/larger layouts in all 12 languages on Low and English/Tamil on High, controls, delivery layouts, narration, theme cleanup, sign/selector clearance and both geometry sweeps pass. Exact source scopes, reports and screenshots: `docs/review/set-10/c52-acceptance/manifest.json`. Cloud FPS does not certify Intel 60 fps (O-1).

**C-52 partial resource progress (22 October 2026; not final acceptance):** candidate `7dcbd2b6`, runtime/fixture `f5d4ab68`, passes the first 130 of 224 rendered views: loaded Low **53 calls / 2,402 triangles / two Three textures / 3,557,376 attachment bytes / 2,623,766 Phaser estimate bytes**, and loaded High **113 / 240,133 / four / 11,239,424 / 7,947,600**. The original ceilings stay unchanged. Both raw reports were independently revalidated. The accessible and missing-model profiles continue separately. High sign clearance passes all 240 approaches and 192 first-day poses; both 285,600-view geometry sweeps pass at 60/2,436 loaded and 59/2,196 fallback. Reports, logs and exact source hashes: `docs/review/set-10/c52-resource-progress/manifest.json`. These resource/geometry results do not certify native Intel FPS (O-1).

**C-51 visible people (22 October 2026):** all 224 current-pilot resource views pass on candidate `055415cf`, carrying B-164/C-49/C-50 and owned runtime `32623203`. loaded-low **53 / 2402 / 2 / 3557376 / 2623766**; loaded-high **113 / 240133 / 4 / 11239424 / 7947600**; accessible-low **53 / 2402 / 2 / 3557376 / 2946992**; fallback-low **53 / 2168 / 2 / 3557376 / 2371462** (calls / triangles / Three textures / attachment bytes / Phaser estimate bytes). Ceilings are unchanged. Two High uploaded adults and up to four benches use no additional texture; Low adds a bounded silhouette only after collision-bearing cars have their original budget priority. All final repository, source-equivalence, native people/asset/actor/town and loaded/fallback geometry checks pass. Exact commands, figures, hashes and screenshots: `docs/review/set-10/c51-acceptance/manifest.json`. Cloud FPS cannot certify Intel 60 fps; O-1 remains.

**C-51 geometry progress (22 October 2026; full rendered gate pending):** corrected runtime `32623203` passes 285,600 loaded and 285,600 missing-model Low CPU views on current-pilot candidate `281bb8b5`, peaking at **60 calls / 2,436 triangles** and **59 / 2,196**. The original 64 / 2,500 ceilings stay unchanged. Test-only fixture `bf37a0cb` retains generated weather and uses the real departure adapters; all 10 world tests include the exact nine actual benchmark setups and their resume checks. The 17 new resource views and complete 224-view rendered gate run separately on candidate `055415cf`; no final render/memory peak or native Intel FPS is claimed here. Evidence: `docs/review/set-10/c51-geometry-progress/manifest.json`.

**C-51 progress (22 October 2026, not acceptance):** two uploaded adult rigs and the unchanged Furniture Kit bench add 222,124 High-only download bytes, with palette RGB baked into vertices and no new image texture. Low requests none of these files. The corrected selector funds collision-bearing parked cars before reserving optional people. Final current-pilot acceptance is running; no final peak is claimed here and the Low/High ceilings stay unchanged. Nine world integration checks, six rig checks, six pure controller checks, 15 resource-contract guards and exact source-equivalence/reproduction pass. Evidence: `docs/review/set-10/c51-progress/manifest.json`. Intel FPS remains O-1.

**C-50 physical sign lettering (22 October 2026):** all 207 current-pilot resource views pass on base `573b0f4d` plus owned runtime `6ff88c94` / fixture `4cd7a344`, carrying B-164 and C-49. loaded-low **53 / 2402 / 2 / 3557376 / 2623766**; loaded-high **107 / 235915 / 4 / 11239424 / 7947600**; accessible-low **53 / 2402 / 2 / 3557376 / 2946992**; fallback-low **53 / 2156 / 2 / 3557376 / 2371462** (calls / triangles / Three textures / attachment bytes / Phaser estimate bytes). Unchanged ceilings. The 157 ink, 83 reading and 50 High town checks, plus 504 language and text size views, pass. The 78 repository suites include one unchanged isolated route-day rerun after 77/78 in the batch. Exact source, raw reports and screenshots: `docs/review/set-10/c50-acceptance/manifest.json`. Cloud FPS does not certify Intel 60 fps; O-1 remains.

**C-49 progress (22 October 2026, not acceptance):** 120 native checks pass for actual uploaded surface pixels, missing-image/Low behavior, High model fallback and exact culling. The High atlas owns **8,388,608 base RGBA bytes** (at most **11,184,811** with mipmaps) and one additional Three texture; Low requests none of the five JPEGs and creates no atlas. Existing Low/High ceilings stay unchanged. Full combined resource measurements are still running and no final peak is claimed here. Frozen source, screenshots, reports and the shared credits blocker: `docs/review/set-10/c49-progress/manifest.json`. Intel FPS remains O-1.

**C-49 current-pilot integration (22 October 2026):** Detached `573b0f4d` plus owned runtime `eb3794a1` and B-164 `f264fa2e` passes twenty focused combined-fixture resource views: low **53 / 2384 / 2 / 3557376 / 2489328**; high **96 / 181071 / 4 / 11239424 / 8734192**; accessible **53 / 2384 / 2 / 3557376 / 3014144**; fallback **53 / 2126 / 2 / 3557376 / 2373408** (calls / triangles / Three textures / attachment bytes / Phaser estimate bytes). Unchanged ceilings. All 77 repository suites and 120 native material/asset/town checks pass. The older full 207-view gate remains at its original source; it is not relabelled as this candidate. Exact source, raw reports and screenshots: `docs/review/set-10/c49-current-pilot/manifest.json`. Cloud FPS does not certify Intel 60 fps; O-1 remains.

**C-49 resource gate (22 October 2026, core follow-up still pending):** all **207 fixed views** pass. Loaded Low: **53 calls / 2,402 triangles / two textures / 3,557,376 attachments / 2,740,246 estimated Phaser bytes**. High: **107 / 235,915 / four / 11,239,424 / 9,087,536**. Accessible Low: **53 / 2,402 / two / 3,557,376 / 3,159,904**. Missing-model Low: **53 / 2,156 / two / 3,557,376 / 2,625,142**. The High atlas adds 8 MiB base RGBA (at most 11,184,811 bytes with mipmaps), separate from attachments and Phaser textures. Low requests none of the five JPEGs. Claude’s generated credits are included as `0cd3e187`; both credits guards and i18n pass. The latest-pilot core candidate needs its new High fallback assertion updated from 14 to 19 loaded resources. This is resource evidence, not final task acceptance or native Intel FPS proof. Frozen source, screenshots and raw reports: `docs/review/set-10/c49-resource-gate/manifest.json`.

**B-164 cab clearance (22 October 2026):** Frozen runtime `f264fa2e` passes twenty focused combined-fixture resource views: low **53 / 2384 / 2 / 3557376 / 2511728**; high **96 / 181071 / 3 / 11239424 / 8834544**; accessible **53 / 2384 / 2 / 3557376 / 2987488**; fallback **53 / 2126 / 2 / 3557376 / 2511728** (calls / triangles / Three textures / attachment bytes / Phaser estimate bytes). Unchanged ceilings. All 76 repository suites, twelve-language 240 approaches plus 192 first-day views, EN/TA High 40 plus 32 views, weather both qualities and related native controls pass. Exact source, raw reports and screenshots: `docs/review/set-10/b164-acceptance/manifest.json`. Cloud FPS does not certify Intel 60 fps; O-1 remains.

**B-138 signal checks (22 October 2026):** four focused resource views on runtime `1ece49b1` / native fixture `c597b837` pass. Low **40 / 1322 / 2 / 3557376 / 2003403**; High **74 / 92618 / 3 / 11239424 / 5530395** (calls / triangles / Three textures / attachments / Phaser estimate bytes), with unchanged ceilings and no rendering change. 102 native control checks and all 75 task-branch repository suites pass. The B-160 follow-up closes the separate SCORM blocker on current pilot; exact stress evidence is recorded in `docs/review/set-10/b138-current-pilot/manifest.json`. Evidence: `docs/review/set-10/b138-acceptance/manifest.json`; Intel FPS remains O-1.

**C-48 front inspection correction (22 October 2026):** source `4158b3a7` passes all 70 task-branch repository suites, 12 geometry cases and 668 native High/accessible Low inspection checks. Six focused resource views peak at Low **44 / 1570 / 2 / 3557376 / 2600726** and High **70 / 103283 / 3 / 11239424 / 6925520** (calls / triangles / Three textures / attachment bytes / Phaser estimate bytes). The one-time body-surface fit adds no rendered resource or per-frame work. The earlier 207-view gate retains its original source scope. Raw evidence: `docs/review/set-10/c48-marker-correction/manifest.json`. Native Intel FPS remains O-1.

**C-48 cab acceptance (21 October 2026):** 207 complete fixed resource views pass unchanged ceilings. Loaded Low and accessible Low peak at **53 calls / 2,402 triangles / two textures / 3,557,376 attachment bytes**, with estimated Phaser maxima **2,740,246 / 3,123,238 bytes**. Missing-model fallback: **53 / 2,156 / two / 3,557,376 / 2,638,592**. High: **107 / 235,915 / three / 11,239,424 / 9,087,536**. Wider cab/mirror framing, lamp target separation and aligned mirror wear add no image map or reflection pass. Raw evidence and source scopes: `docs/review/set-10/c48-accepted/manifest.json`. Native Intel FPS remains O-1.
**C-37 current-pilot replay acceptance (21 October 2026):** all 207 resource views pass. Loaded Low peaks at **54 calls / 2,396 triangles / two textures / 3,557,376 attachment bytes / 2,778,774 estimated Phaser bytes**; loaded High **107 / 235,893 / three / 11,239,424 / 8,902,512**. Accessible Low and true missing-model fallback pass unchanged ceilings. Replay also passes 245 native checks and all 72 repository suites. Exact source hashes, all raw reports and captures: `docs/review/set-9/c37-current-accepted/manifest.json`. Native Intel FPS remains O-1.

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


C-50 notice correction, 27 October: the complete candidate on pilot `f2e439ef` passes 16 focused resource views at the original ceilings. No render pass, geometry, attachment or asset was added by the notice fix. Loaded Low peaks at 56 calls / 2,400 triangles; loaded High at 79 / 121,672. Exact texture/memory figures and separate historical scopes are in [the follow-up evidence](review/set-10/c50-notice-followup/README.md). This does not certify the Intel 60 fps floor.

## C-36 completed combined gate (21 October 2026)

All **207 resource views** and **nine shared Low journeys** pass at `27558ea`.
This includes the corrected real-departure radio fixtures, C-35 walkaround,
live mirrors, richer stops, radio/night, sound, assets and missing-model fallback.

| Profile | Views | Calls | Triangles | Three textures | Attachment bytes | Phaser bytes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| loaded-low | 68 | 54 | 2,396 | 2 | 3,557,376 | 2,778,774 |
| loaded-high | 53 | 107 | 235,893 | 3 | 11,239,424 | 8,902,512 |
| accessible-low | 43 | 54 | 2,396 | 2 | 3,557,376 | 3,084,640 |
| fallback-low | 43 | 53 | 2,150 | 2 | 3,557,376 | 2,592,336 |

[All reports, captures, controller/source hashes and shared logs](review/set-9/c36-accepted/manifest.json).
Claude has merged C-36, the test-fixture correction, translations and the legacy
2D driving game-time fix. The B-114 four-case probe on pilot `c9e02e87` retains
all pins and exact scores with **437–449 characters spare**, above the new 300-character
guard. Existing native Low/High checks pass 55 each. Original ceilings remain
unchanged; cloud SwiftShader does not certify Intel 60 fps (O-1).

## C-37 initial native replay view (21 October 2026)

The actual Dispatch finish -> Results/map -> detached replay path passes **33 checks**
in English larger-text Low at `79fdbd9`. Remapped focus/Enter, manual reduced-motion
steps, playback/pause, hidden-window pause, narration while muted, old-record
rejection and exact source/localStorage immutability pass. No score report is emitted.
The initial paused view uses **33 calls / 1,046 triangles / two Three textures /
3,557,376 attachment bytes / 1,402,939 estimated Phaser bytes**; fourteen unreferenced
UI canvases are released while borrowed assets remain protected.

[Raw report, captures, source and scope](review/set-9/c37-native/manifest.json).
This is an initial view, not the complete resource gate. Final source `52d8365`
adds proper Results/map return data; all 113 required cases pass. The expanded
native matrix, drive-map acceptance, drive-review flow and full fpbench quality
gate are running. All original ceilings remain unchanged. Cloud SwiftShader
cannot certify Intel 60 fps (O-1).

## C-37 completed frozen gate, current-pilot repeat (21 October 2026)

All **179 resource views** pass at product `73a01da`. Complete native replay
coverage passes **245 checks**, including source/localStorage immutability and
world/reference release. Low native page memory peaks at **1,584,187 bytes**,
High at **5,100,219**. The shared map passes 214 checks and drive-review passes.

| Profile | Views | Calls | Triangles | Three textures | Attachment bytes | Phaser bytes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| loaded-low | 61 | 54 | 2,396 | 2 | 3,557,376 | 2,778,774 |
| loaded-high | 46 | 107 | 235,893 | 3 | 11,239,424 | 8,902,512 |
| accessible-low | 36 | 54 | 2,396 | 2 | 3,557,376 | 3,067,056 |
| fallback-low | 36 | 53 | 2,150 | 2 | 3,557,376 | 2,592,336 |

[Exact captures, reports, source hashes and scopes](review/set-9/c37-accepted/manifest.json).
Pilot `c9e02e87` is now combined at `6040d70d`, retaining C-36 and B-114. All 113
required cases and the current catalogue pass. The native/shared repeat and
expanded 207-view gate are running on `5627336f`; no result is claimed for that
combined gate yet. No ceiling changed. Native Intel 60 fps remains O-1.
