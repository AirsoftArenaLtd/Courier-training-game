# C-52 road visibility correction

The C-52 instrument face intersected the normal seated-eye ray to the road 23 m ahead. The new Node regression fails before the correction, with `cab-instrument-face` as the obstructing mesh. Lowering the common face 4 cm preserves its size, shader, hood and physical controls; all 14 cab cases pass afterward. The existing road point and lighting threshold are unchanged.

The review candidate starts at pushed B-181 `75f2fbd0`, based on current pilot `9105e301`. The original C-52 visual/test patch applies cleanly, without a merge. Its four rendering implementations match the owned branch, while the current pilot's newer B-138 control/hint prefix in `fpcab.js` is retained. Current B-2/B-3 Scene/index guards and the original lighting browser test are byte-for-byte preserved. Exact patch, candidate source and comparisons are retained here.

Both lighting suites pass: 51 Low and 45 High checks. At the original (650,403) road sample, the RGB sum increases by 21.72 at Low and 20.38 at High when the native headlight key is used, exceeding the unchanged +12 threshold. Device design passes 96 checks across eight views; physical cab controls pass 200. Both normal and larger strict layouts pass all 1,176 cab views in twelve languages. All forty focused resource views pass serially under the browser lease with the original sound, reflection, missing-model and budget protocols. The verifier checks 660 frozen inputs per attempt and 95 artifact hashes; all owned servers exit and the lease is released. Original-size Low/High road and larger Tamil cab/handheld captures were inspected; see `visual-review.json`.

B-181 is independently pushed for review. It combines the desk/bench folder and credit without changing model bytes, counts or graphics; this candidate includes that branch. Source hashes and raw artifacts belong to their recorded scope. Earlier C-52 acceptance remains historical. No protected push, branch merge, road-test relocation, timing shortcut or resource-ceiling change. Cloud frame rates do not certify Intel 60 fps (O-1).

The initial resource child could not parse current pilot's `test/fpbench.js`: B-1's `QA_HUB_ONLY` wrapper was missing its closing brace. Its byte-identical baseline is archived in attempt-1. The repair retains that intended wrapper, every fixture/sample and all thresholds. Attempt-2 reruns only resources; the verifier proves all other frozen inputs match attempt-1, so the successful native/language results are at identical runtime scope. `benchmark-repair.json` records both hashes.

| Profile | Calls | Triangles | Three textures | Attachment bytes | Phaser estimate bytes |
| --- | ---: | ---: | ---: | ---: | ---: |
| loaded-low | 53 | 1858 | 2 | 3557376 | 2074422 |
| loaded-high | 76 | 122843 | 4 | 11239424 | 6830182 |
| accessible-low | 53 | 1858 | 2 | 3557376 | 2528230 |
| fallback-low | 47 | 1654 | 2 | 3557376 | 2074422 |

The refreshed pilot `feadbd5a` adds documentation/review images only after the tested runtime base; TEAM and the event contract are unchanged. This is focused correction evidence; the earlier 224-view C-52 acceptance stays at its historical source scope. The inherited bright lower-cab headlight pool remains visible and is not a new finished-art claim.
