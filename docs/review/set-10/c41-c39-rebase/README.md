# C41 current C39/A30 review handoff

Ready on `codex/c41-customer-interaction`, retaining the current C39/A30 runtime via the pushed module stack. Exact validation sources: `705e7e56`. Latest fetched pilot `29f421fd` changes documentation and QA runner/flows only since runtime base `ee328d18`; no runtime/data/asset difference. Historical acceptance directories remain tied to their original commits.

**27 focused CPU suites, 5,608 native assertions in 11 explicitly scoped jobs, and 32 original-profile resource views pass.** Rehashed 867 inputs, 4 host fonts and 110 artifacts. Original caps and all inherited lesson/module hooks retained. Owned controllers/browser/server PIDs have exited or are reaped zombies, and leases released. `verification.json`, `verification-config.json` and `verify.py` reproduce the source/artifact, outcome, registry, resource and cleanup checks.

The eleven native journeys cover six good intercom/reception/locker protocols, an authored failed intercom assessment, original missing/two-stop regressions and both doorstep journeys. High doorstep deliberately retains the wrong-neighbor critical and failed assessment. Actual shipped B178 font proof is recorded in the protocol runs; the older original-id protocols do not all carry that same glyph probe. Optional protocol registry entries, A31 translations and Intel O1 remain separate.

| Native journey | Checks | Score / scope | Assessment |
| --- | ---: | --- | --- |
| c41-c39-intercom-low | 203 | 1100 | not an assessment |
| c41-c39-reception-low | 192 | 1100 | not an assessment |
| c41-c39-locker-low | 205 | 1100 | not an assessment |
| c41-c39-intercom-high | 206 | 1100 | passed |
| c41-c39-reception-high | 195 | 1100 | passed |
| c41-c39-locker-high | 208 | 1100 | passed |
| c41-c39-intercom-bad | 226 | 900 | authored failure |
| c41-c39-missing-low | 588 | 1800 | not an assessment |
| c41-c39-twostops-high-ta | 896 | 2500 | passed |
| c41-c39-doorsteps-low | 1341 | 6400 | not an assessment |
| c41-c39-doorsteps-high-ta | 1348 | 5800 | authored failure |

| Resource profile | Views | Calls | Triangles | Textures | Attachment bytes | Phaser bytes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| c41-c39-protocol-budget-loaded-low | 8 | 28 | 1146 | 2 | 3557376 | 2063622 |
| c41-c39-protocol-budget-loaded-high | 8 | 43 | 28936 | 4 | 11239424 | 5500646 |
| c41-c39-protocol-budget-accessible-low | 8 | 28 | 1146 | 2 | 3557376 | 2187072 |
| c41-c39-protocol-budget-fallback-low | 8 | 31 | 942 | 2 | 3557376 | 2063622 |

Original-size visual review is recorded per artifact in `verification.json`; new untranslated copy remains A31 work. Cloud resource counts do not establish Intel laptop FPS; existing O1 remains.
