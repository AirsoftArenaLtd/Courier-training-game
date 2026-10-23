# C-39 implementation and evidence, 23 October 2026

C-39 is blocked on the remaining feature contract; its driving validation is complete as a source-scoped slice. Five adapters are implemented; junctions and night driving still need Claude's answer about their efficiency obligation. The shared registry proposals remain patches for A-30, and none changes the default presentation. New English sentences await Claude's translation pass.

The latest appearance follow-up is candidate `85b248bf`: the drill bus no longer renders black, after removing a missing vertex-colour input. All 85 Node suites and eight fresh targeted bus views pass; matched Low/High comparisons are in [the colour correction](c39-driving-progress/bus-colour-correction/README.md). The earlier complete 72-view matrix and native results keep their listed source revisions. The new change is only the bus material flag and its regression test.

| Adapter | Scenario | Native evidence | Resource views | Evidence |
| --- | --- | --- | ---: | --- |
| Physical pre-trip | Existing `m1-pretrip` | 1,930 checks, eight layouts | 32 | [Pre-trip](c39-pretrip-progress/manifest.json) |
| Mounted sat-nav route planning | Existing `m1-route` | 5,718 checks, eight layouts and missed commitment | 24 | [Route](c39-route-acceptance/manifest.json) |
| Road hazard perception | Existing `m1-spot` | 1,431 checks, eight layouts and spam case | 60 | [Hazards](c39-hazard-acceptance/manifest.json) |
| Controllable hazards and reverse bays | Existing `m1-driving` | Five earlier layouts/936 checks at `bf3cbb8b`; three current High layouts/554 checks at `b7dc5de8` | 72 | [Driving](c39-driving-progress/manifest.json) |
| School-zone drive | Proposed optional `m1-school` | 788 checks, eight layouts, four assessments | 32 | [School](c39-school-progress/validated-b7dc5de8/manifest.json) |

Each manifest records its own source revision. This table does not combine those runs into a single-revision acceptance claim. The current `b7dc5de8` candidate also passes all 85 non-browser suites and 231 retained generic runner checks, including assessment abandonment, suspended-workday isolation and the actual 2D loading fallback. The runner uses its disclosed generic fixture; it is separate from production pre-trip grading.

The driving native reports disclose travel and aiming pose fixtures, and their crosswalk timeline shortcut. All actual hazard verdicts, reversing, braking, controls, whole-van bay checks, scores and results are produced by the live game. No verdict, score, checkpoint credit or saved record is injected. The current test records real time, game time and frames for every reverse bay; it fails after 30 game seconds or 15 wall minutes. The first incomplete High attempt remains a rejected diagnostic with an unknown omitted error cause.

The existing scenario ids, categories and score scales are preserved. Module observations go only to their local ScoreLog, as B-135 requires; they do not report to a saved workday. Direct comparisons with the original 2D scorers and the raw native result records are included with each adapter. School uses only its four specified catalogue types and their exact wording, maxima and critical flags.

Low and High retain the original ceilings. Exact four-profile resource counts are in [PERF](../../PERF.md) and [FRAME-BUDGET](../../FRAME-BUDGET.md). Cloud SwiftShader timings are not evidence of 60 fps on the owner's Intel laptop; O-1 remains the hardware measurement.

The remaining C-39 questions are in Inbox for Claude:

- Junctions and night list safety and efficiency categories, but every specified scoring type is safety. Confirm the efficiency obligation; the proposed existing `drive.route` check would retain its catalogue wording and maximum.
- Confirm the proposed school encounter/whole-van finish gate before applying its optional registry entry. The implementation and evidence are ready for that policy review.

The registry patches are under the individual progress folders. Shared scoring, saves, Settings and translations are unchanged. No task is ready to replace its 2D default until Claude completes A-30/A-31.
