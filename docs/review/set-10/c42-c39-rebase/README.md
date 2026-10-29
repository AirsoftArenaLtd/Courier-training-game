# C42 current C39/A30 review handoff

Ready on `codex/c42-problem-solving`, retaining the current C39/A30 runtime via the pushed module stack. Exact validation sources: `b4e87e42`. Latest fetched pilot `29f421fd` changes documentation and QA runner/flows only since runtime base `ee328d18`; no runtime/data/asset difference. Historical acceptance directories remain tied to their original commits.

**33 focused CPU suites, 2,433 native assertions in 6 explicitly scoped jobs, and 40 original-profile resource views pass.** Rehashed 903 inputs, 4 host fonts and 124 artifacts. Original caps and all inherited lesson/module hooks retained. Owned controllers/browser/server PIDs have exited or are reaped zombies, and leases released. `verification.json`, `verification-config.json` and `verify.py` reproduce the source/artifact, outcome, registry, resource and cleanup checks.

The six native journeys cover safe Low/High blocked drive, wrong-booking failed assessment, the closure with all seven gates and whole-van legal parking, missed-stop recovery and storm. Existing static/travel fixture scopes remain exactly those in the raw reports; no blanket full-route claim. Optional closure/blocked registry entries, A31 translations and Intel O1 remain separate.

| Native journey | Checks | Score / scope | Assessment |
| --- | ---: | --- | --- |
| c42-c39-blocked-low | 241 | 200 | not an assessment |
| c42-c39-blocked-high-ta | 245 | 200 | passed |
| c42-c39-blocked-bad-high-ta | 257 | 0 | authored failure |
| c42-c39-closure-low | 122 | 400 | not an assessment |
| c42-c39-recovery-low | 773 | 1900 | not an assessment |
| c42-c39-storm-high-ta | 795 | 2000 | passed |

| Resource profile | Views | Calls | Triangles | Textures | Attachment bytes | Phaser bytes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| c42-c39-blocked-loaded-low | 8 | 45 | 1530 | 2 | 3557376 | 1958368 |
| c42-c39-blocked-loaded-high | 8 | 77 | 99056 | 4 | 11239424 | 5330096 |
| c42-c39-blocked-accessible-low | 8 | 45 | 1530 | 2 | 3557376 | 2209584 |
| c42-c39-blocked-fallback-low | 8 | 41 | 1268 | 2 | 3557376 | 1958368 |
| c42-c39-closure-loaded-low | 2 | 40 | 1102 | 2 | 3557376 | 1403371 |
| c42-c39-closure-loaded-high | 2 | 67 | 135950 | 4 | 11239424 | 4145531 |
| c42-c39-closure-accessible-low | 2 | 40 | 1102 | 2 | 3557376 | 1474224 |
| c42-c39-closure-fallback-low | 2 | 39 | 906 | 2 | 3557376 | 1403371 |

Original-size visual review is recorded per artifact in `verification.json`; new untranslated copy remains A31 work. Cloud resource counts do not establish Intel laptop FPS; existing O1 remains.
