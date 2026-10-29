# C-39 night module and school finish gate

The night module uses the real inspection, walking, physical cab controls, headlights, lead traffic, braking and whole-van parking. Its bounded observations report only the agreed existing types; the module-local score log does not write a workday record. The school module now checks that the whole stopped van is inside the painted finish bay and faces with traffic, in addition to the live bus/crossing encounters. These are additions on the existing C-38 stack; the shared optional launcher and translations are separate dependencies.

Attempt-4 is complete: **407 native checks** (105 High/Tamil larger night, 105 Low/English night, 104 Low/English strict school parking and 93 High/Tamil larger school parking) and **four affected inspection resource views** pass. All 696 frozen inputs and 26 artifacts are verified, resource reports independently rechecked against the original protocol/ceilings, cleanup complete. `final-verification.json` records the exact source scope and `final-visual-review.json` records the manually inspected High captures. The only runtime delta from attempt-2 is the module-only inspection `accessibleText` option in `FirstPersonScene.js` (`21a32dae`); workday inspection behavior remains at its prior scope. New module text still requires the shared translation pass. This validates the owned adapters on the existing C-38 stack; it does not certify the shared optional launcher or a rebased current-pilot candidate.

Earlier source scopes are retained:

- Attempt-1 stopped when the native walking fixture assumed an incorrect starting van x coordinate and intersected the body. The initial diagnosis of van movement was corrected: stationary core checks show no movement. The test now derives walking targets from the actual van position; the motor/spawn was unchanged.
- Attempt-2 passed 105 Low/English native checks: real inspection/repair, walking, cab entry, 36.114 m of actual travel with following/night observations, real braking and parking, and the existing 700-point/three-star module result. All 28 original-protocol resource views also passed. High/Tamil larger stopped at the inherited 19 px inspection body; no school native job ran. Its exact frozen inputs, artifacts and cleanup are verified in `attempt-2/verification.json`.
- Attempt-3 was interrupted by its exact owned child PID to prioritize B-183's shorter real-storage regression. Its initial High night output is not acceptance; retained artifact/source hashes and cleanup are verified. The identical runtime was requeued as attempt-4, after B-183, with no simultaneous browser validation.

The benchmark uses running sound, real reflection proof, loaded and explicitly missing model files, and the original ceilings. The earlier 28-view peaks below stay at attempt-2's source scope; attempt-4 only rechecks the four affected inspection views after the text change.

| Profile | Calls | Triangles | Three textures | Attachment bytes | Phaser estimate bytes |
| --- | ---: | ---: | ---: | ---: | ---: |
| Loaded Low | 42 | 1236 | 2 | 3557376 | 1850603 |
| Loaded High | 55 | 79455 | 3 | 9142272 | 4899323 |
| Accessible Low | 42 | 1236 | 2 | 3557376 | 1978512 |
| Missing-model Low | 41 | 958 | 2 | 3557376 | 1850603 |

Native validation declares its initial scenario descriptor, aiming, and stopped pre-bay placement; these do not certify the shared optional launcher or the skipped travel segment. Driving encounters, inspection choices, physical controls and graded finish remain actual input. QA_FONT=noto pins the review font only. Original game-time step, scoring criteria and source freezes are retained. No Intel frame-rate certification, merge, protected push or permanent automation change.

The prepared optional school/junction/night metadata is in `../c39-registry-followup/optional-entries.json`. It drops the browser-only fake content keys and is ready for A-30’s shared optional registry/launcher support. The compatible existing m1 keys are already applied. C-52 is still unmerged at the last fetch, so the requested published-stack rebase remains after that merge. C-40 continues independently with the now-confirmed heavy policy.

Current inspection-only peaks (calls / triangles / Three textures / attachment bytes / Phaser estimate):

- night-budget-loaded-low: 36 / 914 / 2 / 3557376 / 1372294.
- night-budget-loaded-high: 45 / 51992 / 3 / 9142272 / 4020550.
- night-budget-accessible-low: 36 / 914 / 2 / 3557376 / 1450139.
- night-budget-fallback-low: 38 / 630 / 2 / 3557376 / 1372294.
