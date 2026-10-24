# C-40 physical label station

C-40 remains **doing** on `codex/c40-package-handling`, stacked on pushed C-38. This is the label-inspection slice.
Physical sorting, lifting, team/equipment workflows and optional `m2-heavy` remain. The sorting/lifting kernels and
conveyor renderer are separately source-scoped in `../c40-models-progress/` and `../c40-sort-world-progress/`; none is
loaded by the game yet.

The owned `package-label-station` definition uses existing `m2-labels` content, categories, local ScoreLog and the
original 3,150-point maximum. The unchanged registry still starts 2D by default. `registry-labels.patch` proposes only
the `scene3d` field for Claude/A-30, with no default, threshold, save-field or completion-rule change.

A trainee operates a real inspection table from its front, turning a cardboard parcel to expose the front, back,
left, right, top and base. Shipping barcode, handling/hazard symbols and leak/crush marks are coloured geometry on
those faces. A side is credited only when its whole face fits on screen, is within 2.65 metres, faces the camera and
has five unobstructed sightlines. Merely selecting a face does not count. Walking collides with furniture and depot
walls. Seven native P/E targets cover the parcel and six numbered stations. Paged handheld rotations/readings, neutral
assessment acknowledgement, practice-only guide, remapping, narration and reduced-motion behavior use the existing
runner. Turning away from the front operator position now opens a neutral accessible acknowledgement instead of an
assessment-hidden message. Passive inspection from other positions can still observe an actually visible face.

Two visible meshes contain bounded station geometry and one replaceable parcel geometry. Old parcel buffers are
disposed on replacement. There is no image map, font texture, added reflection pass or outside asset. Provenance is
recorded in `docs/ASSETS.md`.

Validation is explicitly split by source:

- **Eight layouts / 4,680 native checks at `028d5637`:** Low/High, English/Tamil, normal/larger; normal practice runs
  all nine packages to 3,150 points and three stars, larger assessment inspects/places one then abandons. Real keys,
  all six physical faces, body/choice/Back separation, readable fonts, paused clocks, local completion and exact
  suspended saved-day/checkpoint/report preservation pass. Raw report, eight captures and log: `native-028d5637/`.
- **Two targeted assessment layouts / 89 checks at `f23192aa`:** remapped O/U focus/action, away/behind-table neutral
  feedback, blind-correct and wrong stations, live near-expiry timeout, once-only grading and actual assessment quit
  preserve the real saved workday. Low Tamil larger and High English normal pass with no page errors. Report, captures
  and before-fix reproduction: `boundary-f23192aa/`. This is not another eight-layout run at the new source.
- **All 74 then-available Node suites at `7a99e89a`:** `node-7a99e89a/`. After the control fix, all nine affected
  label/runner/world/mission/workday/i18n/save suites pass at `f23192aa`: `node-f23192aa/`. New sentences remain English
  fallback until Claude translates; current-catalogue i18n passing is not a new-string translation claim.
- **24 corrected resource views at `f23192aa`:** six poses in each of the existing four profiles pass the unchanged
  `fpbench` and `fpquality.checkReport` budgets. Canonical queue identity/index, visible physical face, seven targets,
  active runner, allowed standing position and unchanged checkpoint/events/workday are checked. The sixth pose checks
  unavailable-input feedback. Reports/logs/captures: `resource-f23192aa/`. This is a focused module gate, not a fresh
  complete default workday gate.

| Profile | Views | Calls | Triangles | Three textures | Attachment bytes | Phaser estimate bytes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| loaded-low | 6 | 33 | 1,925 | 2 | 3,557,376 | 1,949,232 |
| loaded-high | 6 | 34 | 11,691 | 4 | 11,239,424 | 5,293,840 |
| accessible-low | 6 | 33 | 1,925 | 2 | 3,557,376 | 2,097,867 |
| fallback-low | 6 | 38 | 1,817 | 2 | 3,557,376 | 1,949,232 |

`runtime-bridge.json` records exact hashes and the changed front-position/acknowledgement adapter. Grading model,
world geometry and generic runner remain identical to the eight-layout source. Original 20 resource views passed
but left the fixture index at -1, yielding a package-zero handheld title; they are retained in
`resource-028d5637-diagnostic/` and superseded by the canonical 24-view retake. The final handheld correctly says
“Inspect package 7 of 9.” for its staged tier-three item.

Earlier rejected setup diagnostics include the first table outside the depot wall, a missing test profile, an empty
journal normalised by the hub, and an initial targeted test polling before `OTR.game` existed. The latter was corrected
with guarded readiness before its meaningful before-fix reproduction. None is counted as acceptance. The final native
fixtures start and pause an actual saved day before entering the module.

These are checks of the pushed C-38 stack, not a merge with current pilot. All six original m2 data/scene files and
ScoreLog match fetched pilot `90844ac5` byte for byte. Current-pilot combined acceptance and the rest of C-40 remain
necessary before the task is review-ready. No resource ceiling changed. Cloud SwiftShader cannot certify Intel
60 fps; existing O-1 remains the owner's real-laptop measurement.
