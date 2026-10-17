# C-28 van and characters (in progress)

`codex/c28-van-characters` is stacked on pushed C-27 `5e4568a`. Latest pilot `61a45ca` was
fetched/read before starting. The task is **not ready for review**: runtime placement, theme/livery,
physical inspection/control integration, animation and Low detail remain pending.

The first slice prepares three CC0 source-detail models outside the game:

| Source | Prepared bytes | Triangles | Parts | Bones |
| --- | ---: | ---: | ---: | ---: |
| Kenney delivery van | 191,432 | 2,461 | 1 flattened preparation mesh | 0 |
| Quaternius male worker | 771,740 | 5,240 | 13 | 62 |
| Quaternius female worker | 871,104 | 6,112 | 12 | 62 |

The 1,834,276-byte output is temporary. No new asset has entered the game manifest. Each temporary
pack keeps the original CC0 licence bytes and source/output hashes. The van preparation bakes the
palette and original static transforms using the C-27 converter. Its source has separate `door`, four
wheel and `body` nodes: runtime conversion must preserve those semantic parts for animation rather
than treating the flattened preparation mesh as finished.

The worker converter keeps the rig, skin, mesh/morph attributes and only `Idle_Neutral`, `Walk`,
`Wave` and `Interact`. It remaps accessors/buffer views and drops unused animation data; no external
buffer URI or image survives. The original author licence is retained verbatim, including the older
pack title in the women's archive. Three synthetic conversion tests pass. The real vendored loader
parses all three prepared GLBs, verifies finite dimensions/no image maps and plays a CPU Wave pose on
both workers with changed bone transforms. This validates preparation; it does not bypass the shipped
bank's current static-only adapter or establish a runtime budget.

Next: retain animated van parts and theme/livery zones; merge/simplify character primitives and build
Low geometry/animation that keeps the two-texture and complete-frame limits. A normal GPU skeleton
can allocate a bone texture, so Low must be profiled with an approach that preserves its existing
allocation ceiling. The current 62-bone, 12/13-part source workers are High preparation, not Low models.
Keep the old procedural van/courier/residents as fallback. Preserve every physical control, accessible
shortcut, inspection/raycast target, saved state and score event. Validate the new runtime with the
existing model/browser/resume suites and `test/fpbench.js`; record final screenshots and figures.

Reproduce this source slice (Pillow and the existing test dependencies are needed):

```sh
# Extract the two owner-supplied character zips with git archive into a temporary directory.
python3 test/fpactorsprepare.py
python3 test/tools/prepare-actors.py /tmp/c27-incoming/assets/_incoming/kenney_car-kit.zip /tmp/c28-incoming/assets/_incoming /tmp/c28-prepared
node test/tools/validate-actors.js /tmp/c28-prepared
```

The current source-validation report is `docs/review/set-8/c28-prepared-validation.json`.
No production, scoring, save, Settings or i18n code changes in this slice; C-27's frame figures remain
unchanged. There is no owner blocker, and the hourly check-in remains enabled without an end date.
