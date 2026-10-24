# C-40 physical conveyor slice

C-40 remains **doing** on `codex/c40-package-handling`, stacked on pushed C-38. Label inspection and this sorting
slice are implemented and separately validated. Physical lifting, team/equipment workflows and optional `m2-heavy`
still follow. No registry/default/completion/shared save/scoring/Settings/i18n or original 2D source is changed.
`registry-sort.patch` proposes only `scene3d: package-sort-belt` for existing `m2-sort`; Claude/A-30 owns that edit.

The five original sorting waves run on a physical conveyor. P/E (including remaps) selects and scans a real nearby
parcel. Its paged handheld gives route, weight and handling facts without giving the answer. The trainee operates
numbered routing keys, which keep the original stable numbers and destinations. Scanned selection remains until
routing or leaving the belt. Blind, wrong and missed parcels, damage/DG/heavy/priority precedence, combos, jams and
all original score/ratio/lesson rules are preserved. Wave cards wait for the previous belt to clear. The physical
jam-reset post operates once the belt has stopped. Assessment uses neutral decision acknowledgement. Both clocks
pause while readings or panels are open. All new text is whole English sentences through Phaser/OTR.txt.

A pending P-selected moving parcel stays actionable only while onscreen, within 2.65 metres and unobstructed.
Manual look/movement and mouse mode release that pending focus. The camera does not follow it; reduced motion adds
no tracking. Mouse interactions retain precise ray targeting. The guard cannot scan through furniture or across the
depot. Routing still acts on the actually scanned package, like the original 2D assessment.

The renderer uses three instanced batches and fixed sixteen-parcel buffers/proxies. Printed routing numerals,
shipping barcodes, bands and marks use face geometry. No image map, font texture, external asset, extra reflection
pass or unbounded object list is added. All batches use the renderer's normal per-instance main/mirror culling and
restore the exact main matrices/colours/counts after a reflection. Instance colour buffers exist before restore
storage is reserved. Furniture collision data is checked against the actual depot.

The legacy sorting scene finishes with ratios and lessons rather than a ScoreLog. The owned runner now honours an
explicit `log: null` for that existing result path; omitted logs still default to the session log, and real logs are
unchanged. The sorting adapter opts into this legacy path. A test using the actual shared flow reproduces zero stars
before the correction and matches the original record, stars and verdict afterward. No shared flow/scoring/save
source was edited.

Validation, with exact source scopes:

- **76 available Node suites at `5d59c553`:** 68 passed initially; eight listen/process-launch EPERM errors passed
  unchanged with the needed local-server/process permissions. Initial logs and reruns remain together in
  `node-5d59c553/`. The original kernel retains 7,040 direct comparisons with the actual 2D sorting scorer.
- **13 affected suites at `3402c571`:** runner, sort model/world/controller, label model/world/controller, access,
  mission/world, workday, i18n and save-size pass after the result and moving-focus corrections. Logs are in
  `node-3402c571/`. Controller cases include actual ray inputs, blind/wrong/stale/double actions, all five full model
  waves, real shared-flow equivalence, exact reflection restore, and moving-focus distance/visibility/occlusion guards.
- **Eight native layouts / 1,517 checks at `3402c571`:** Low/High × English/Tamil × normal/larger, with remapped
  O/U focus/action. Practice handles five staged parcels (one per wave), including a real stopped-belt jam reset,
  and records 600 points, three stars in both categories and no untested category. Larger assessment handles two
  staged waves then actually abandons; one attempt is recorded. Every mode preserves the exact suspended workday state, checkpoint and reports. Label/body/choice/Back separation, readable unshrunk text, controls/rule cards and
  paused clocks pass. Parcel positions and wave-end times are explicit fixtures; this is not a natural full-duration
  conveyor run. The full timing and original scoring comparisons are in the Node tests. Raw report, screenshots and
  log: `native-3402c571/`.
- **32 frozen resource views at `5d59c553`:** eight poses in each original quality profile use sixteen physical
  parcels, selected label/marks, console, jam, rule and control pages. The unchanged fpbench/checkReport ceilings,
  asset profiles, real targets, canonical selected item, collision clearance and workday isolation pass. Raw reports
  were independently revalidated. Exact captures and logs: `resource-5d59c553/`.

| Profile | Views | Calls | Triangles | Three textures | Attachment bytes | Phaser estimate bytes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| loaded-low | 8 | 38 | 2,234 | 2 | 3,557,376 | 1,908,998 |
| loaded-high | 8 | 39 | 12,192 | 4 | 11,239,424 | 6,167,814 |
| accessible-low | 8 | 37 | 2,234 | 2 | 3,557,376 | 2,044,320 |
| fallback-low | 8 | 44 | 2,126 | 2 | 3,557,376 | 1,908,998 |

`source.json` and `runtime-bridge.json` distinguish the resource and final native sources. The later changes affect
result handoff and P focus, adding CPU-only ray/vector helpers; batch generation, culling, geometry, assets, camera,
resource poses and budget checker are unchanged. The 32 views keep their frozen scope; this is not another full
matrix at the later source. Rejected probes, the zero-star reproduction, initial native result-accessor mistake and
moving-target failure are retained in `diagnostics/`, with their own source notes.

These checks cover the pushed C-38 stack, not a merge with current pilot `90844ac5`. The full default workday gate
and current-pilot combined acceptance remain necessary before all of C-40 is ready. New strings remain English
fallback until Claude translates them. Current-catalogue language checks are not a new-string translation claim.
Cloud SwiftShader cannot certify Intel 60 fps; existing owner measurement O-1 remains. No ceiling changed.

The eight-layout fixture uses the lab’s ephemeral course store. Two additional checks at test protocol `ca733bc6` enable real local storage before starting a day, record a real report while that day is active, and compare its stored journal before/after the module. They then call the shared save reload and verify the journal, checkpoint and practice/assessment record again. **393 checks pass** across Low Tamil larger assessment abandonment and High English normal practice. Runtime files remain identical to `3402c571`. Reports/captures/logs: `durable-ca733bc6/`.
