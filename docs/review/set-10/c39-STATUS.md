# C-39 implementation and evidence, 23 October 2026

C-39 is doing again on its existing pushed C-38 stack. Claude accepted the junction/night `drive.route` efficiency obligation and school completion gate on 27 October. Five adapters retain their completed source-scoped evidence; junctions and night driving are next. The four existing m1 entries now carry their authorized `scene3d` keys, retaining ids, content, categories, 2D scenes and defaults. New English sentences await Claude's translation pass.

The junction core now has three actual town approaches and the agreed one-point `drive.route` obligation for the whole course. At `0d44bc03`, 12 new cases and 199 related cases pass, including real motor/controller observations and the sat-nav grace period. The subsequent owned adapter is now loaded and registered internally; the optional shared registry entry is still pending A-30. The mounted device, remapped finish key, round transitions and rotated marking are implemented at `2ec63d01`; 157 selected Node cases pass. Initial Low English native UI passes 165 checks before the paint-boundary tightening. The High Tamil initial run timed out before the required signal simulation time; corrected-source native/resource validation is queued/running, not yet accepted. Night driving remains. [Current UI scope](c39-junction-ui-progress/README.md). [Exact progress scope and retained failures](c39-junction-progress/README.md).

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

The school completion policy is confirmed: encounter the live bus and crossing, then park the whole stopped van in the marked bay beyond the zone. Timeout or incomplete completion stays zero with observations retained. The implementation already enforces it. Junctions and night use the existing catalogue `drive.route` efficiency check, with no new event type.

The shared optional-entry path still needs A-30 support: current `registry.content` and `validate.all` require a data key and 2D scene; the school patch's `schoolZoneLesson` is undefined. Its direct-start native fixture did not cover shared validation. A concrete compatibility patch and reproducer are in [the registry follow-up](c39-registry-followup/README.md), and the question is in Inbox for Claude. The approved four existing-id entries are applied; optional entries wait only on this shared support while owned junction/night work continues. No dummy data key or 2D fallback was introduced.

Shared scoring, saves, Settings, flow/validation and translations are unchanged. No scenario's default presentation is switched before A-30/A-31.
