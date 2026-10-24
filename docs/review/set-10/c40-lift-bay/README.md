# Physical lifting bay

This is the existing `m2-lift` lesson on the pushed C-38 stack. The shared registry
proposal is deliberately unapplied. This does not switch the default presentation.

The original five loads, thirteen decisions, strain and posture calculations,
score scale, ratios and lessons remain in the parity-tested lifting kernel. The bay
adds knee-height eye movement, actual grip and pallet placement, an explicit foot
pivot, a coworker call-button interlock, a step platform and a hand truck that must
be taken, pushed to the pallet and explicitly unloaded. The uploaded worker rig is
reused locally; the missing-model path retains procedural geometry. No asset pack,
texture or render pass is added.

The existing ratio-based result explicitly passes `log: null`; it neither creates
an empty replacement ScoreLog nor sends reports to the suspended workday. An
incomplete timeout abandons the attempt without inventing scores for untouched
loads. Practice explains the health result; assessment acknowledges a recorded
decision without answer feedback. Gauge readings remain factual.

## Source and evidence scope

The corrected runtime is `4401c37567f9ab3f74bb3b17ef7ef43c682a1607`. All 32 final resource views
and all 80 Node suites use that source. The original 32-view/79-suite source is
`0088d942`; its captures exposed the generic walking footer and are retained with
that qualification. The footer correction is `2633b332`.

Native protocol `11872d72` passes all eight EN/TA, Low/High and normal/larger
layouts (1793 checks). Each normal-text practice completes all five loads at
1,000 points with three stars in both categories. Each larger assessment handles
two loads and actually abandons, consuming one attempt. Two further Tamil
larger/reduced-motion cases at the corrected runtime pass 581 checks: four
loads including team/truck actions, fifth shelf grip and step-down, then actual
abandonment before delivery. No incomplete module result is invented. All cases
preserve and reload the actual persisted suspended workday and checkpoint.

After the eight-layout protocol, runtime changes only clear the physical needle
outside a reachable posture, align cached camera diagnostics with the already
physical eye height, and remove a temporary per-step array. The original kernel,
inputs, options, results and save isolation are unchanged. Before-fix failures,
initial logs and the harmless first launcher EPERM are retained separately.

The final Low CPU sweep uses real local GLBs and missing-model fallback, across
4,800 load/stage/direction poses with actual mirror culling. It is geometry-only;
fpbench measures the real rendered memory. Cloud rates cannot certify Intel FPS.

Reproduce from the source revision, with a local server on port 8382:

```sh
QA_BASE=http://127.0.0.1:8382 QA_BROWSER=/usr/bin/chromium node test/fppackageliftbrowser.js
QA_BASE=http://127.0.0.1:8382 QA_BROWSER=/usr/bin/chromium QA_FPS_FLOOR=0 node test/tools/fp-package-lift-quality.js
node test/fppackageliftgeometry.js
```

The recorded expanded native command adds `QA_LANGS=ta QA_SIZES=large`; the first
protocol is reproduced from its own revision. The tests route existing `m2-lift`
to the adapter only within each browser page. Original schema/default data is
never rewritten. Raw `.log.gz` files and `raw-node-logs.tar.gz` archives preserve exact bytes; readable logs trim
line-end whitespace. `manifest.json` records the actual commands' source scopes.

`registry-lift.patch` proposes only `scene3d: 'package-lift-bay'` for existing
`m2-lift`, preserving the id, categories, content, 2D fallback and default. Claude
owns that shared change under A-30.

The optional `m2-heavy` remains pending the Claude inbox question about its posted
solo limit and critical trigger. Whole-task current-pilot/default-workday
acceptance and existing Intel measurement O-1 are also outstanding. Current
catalogue checks do not translate the new English sentences.
