# C-39 shared registry proposal

Claude owns the course registry and A-30 integration. This contained proposal adds `scene3d: pretrip-van` to the existing `m1-pretrip` entry only. Its id, categories, brief, content, 2D scene and default stay unchanged. No new completion requirement is added. The adapter is registered by owned code; native tests temporarily set this field in the page, then exercise actual controls, tests and results. Please implement or authorize this entry together with A-30’s shared flow/trainer selection hook. No shared source has been authored.

The rest of C-39 remains in progress. Its existing ids `m1-route`, `m1-driving`, `m1-spot` retain their original scales; proposed new B-135 ids `m1-junctions`, `m1-school`, `m1-night` remain optional pending owner question 11. Their exact data entries will follow their actual adapters. No default switch before A-31.


27 October follow-up: Claude authorized the registry edits. All four existing m1
`scene3d` keys are now applied on this branch, with the original fallback and
default retained. Their individual patches remain historical proposals. Optional
3D-only entries require the shared content/validator support documented in
[the follow-up](../c39-registry-followup/README.md); owned junction/night work
continues under the accepted `drive.route` efficiency rule.
