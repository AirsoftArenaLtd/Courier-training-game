# B4 required-loader overlap

Doing on `codex/b4-loader-overlap`, stacked on pushed B4 candidate `96f1fe66`. After validating and selecting the manifest, the existing singleton local glTF script starts while model bytes arrive. Workers retain their original loader await/retry and every decode, validation, timeout, abort and ownership guard. Low/High asset selection, artwork and the paired first-frame protocol are unchanged. Invalid/image-only manifests do not start a model-loader request.

Five focused CPU suites and both changed-JS syntax checks pass. The actual asset suite passes all 14 cases, including four new ordering/retry/cancellation/image-only regressions; three expected pre-change failures are retained in `before.log`. The [source audit](source-audit.json) proves every other runtime/data/asset/protocol byte matches the parent. This is scheduling work during preload, with no per-frame change or new asset.

A fresh serialized gate waits for the actual parent candidate to complete, then runs the original asset failure/layout/restart browser suite, identical Low/High native cold/resume probes, Low context recovery and 16 original-profile resource views. Existing baseline/candidate worktrees remain frozen. **No measured startup improvement, resource acceptance or Intel O1 claim is made before this new cohort completes.**

29 Oct: the first controller stopped before any job because its parent resource wrapper omitted the required mirror-pixel probe. Preserved `parent-failed-unstarted`. This branch now has the same test-only probe flag correction as parent `5f79a675`; it waits for the corrected parent `candidate/resources-ready` gate. Native timing, runtime/asset loader change and limits remain frozen.
