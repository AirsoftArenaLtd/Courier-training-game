# C-50 review correction: junction notices

The physical lettering path hid every automatic sign slot, including the translated red/amber/green light and give-way instructions. `e82091aa` hides only the paragraphs belonging to sign faces. Signal and junction-yield instructions retain their existing translated layout and occlusion guards. `8adfc54e` separates required notices from face paragraphs in the owned layout audit and checks the current translation. No new production text, score/save field, asset or render pass.

## Complete current-pilot candidate

A detached candidate starts at pilot `f2e439ef`. Six owned rendering helpers match the branch exactly. The current pilot cab (including B-138 signal timing), Scene replay/signal hooks and all index scripts are preserved; only the original C-50 address-label guard and lettering script are added. `complete-candidate-equivalence.json` and `complete-candidate-source/` record the comparison. This candidate was never merged or pushed.

The final candidate passes the unchanged pilot `fplangsbrowser` in all 12 languages at normal and larger text: **588 + 588 = 1,176 cab views**, strict mode. The four focused resource profiles pass all **16 views** (`trafficsignal`, `trafficgreen`, `signsjunction`, `signspeak`), with sound running and reflection proofs, at the original ceilings:

| Profile | Calls | Triangles | Three textures | Attachment bytes | Phaser bytes |
| --- | ---: | ---: | ---: | ---: | ---: |
| loaded Low | 56 | 2,400 | 2 | 3,557,376 | 1,815,003 |
| loaded High | 79 | 121,672 | 4 | 11,239,424 | 5,792,731 |
| accessible Low | 56 | 2,400 | 2 | 3,557,376 | 1,923,072 |
| missing-model Low | 53 | 2,066 | 2 | 3,557,376 | 1,815,003 |

Node checks: seven lettering cases (the notice regression fails before the correction), 23 sign cases, 14 quality guards, the existing catalogue check and changed-JS syntax pass. `visual-review.json` records manual inspection of the exact final Tamil larger red/yield captures: readable notices, clear mirrors/nav/selector/sign heads and no floating address paragraph.

The owned English/Tamil normal/larger Low/High occlusion audit is **queued behind the frozen C-39 native/resource run**. Do not count it as passed until `layout/status.json` is complete and `verify.py` succeeds. Both use the workspace browser lease; their servers bind only loopback and release their own processes on exit.

## Retained earlier scopes

The root phase omitted the original address-label guard. Its language/resource measurements are retained as partial evidence only; `final/` repeats on the complete candidate. The unmodified pilot layout audit in `layout-legacy-audit/` completed 72 views with eight STOP-face expectation failures and no page errors. That test expected automatic STOP paragraphs. The owned audit preserves hidden face paragraphs, requires translated signal/yield notices and verifies native J readings, clipping, sign-head/mirror/selector/nav clearance and the existing texture ceilings.

`final/test-source/fpsignlayoutbrowser.js` preserves the unchanged pilot test input of the completed final language/resource phase. The subsequent layout phase changes only that test, not any runtime, asset, shared scoring, rendering cap or the language/resource tests. Plans, statuses, raw logs, reports, captures and hashes retain each exact scope. Cloud SwiftShader does not certify Intel 60 fps; the existing O-1 measurement remains.
