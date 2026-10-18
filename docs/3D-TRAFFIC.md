# Traffic and pedestrian behaviour

C-32 is in progress on `codex/c32-traffic`, from pilot `42aba78` (C-30 merged).
The first implementation is the pure controller in `src/core/fptraffic.js`. It is not
loaded by `index.html` yet. The existing game, checkpoints and reports are unchanged.

The signal cycle has separate north/south and east/west green and amber phases, all-red
clearance between movements, and an exclusive pedestrian phase. A pedestrian may start
only with walk permission and a clear crossing. Signal state depends on simulation time
and a fixed junction offset, so pauses and restored checkpoints need no extra light timer.
Phase descriptors are shared and frozen; the hot controller methods allocate no objects.

Vehicle clearance projects actual oriented body dimensions along the approaching lane.
Traffic in an adjacent lane or completely behind is ignored; cross traffic, an overlapping
body, a pedestrian and a longer vehicle retain their own footprint. Target speed obeys a
three-second following gap and a braking envelope with a 1.5-metre stationary buffer.
Acceleration and braking approach that target gradually. The scene integration must also
cap displacement and test the swept movement, especially after an abrupt obstacle appears.
These target calculations alone do not establish collision safety.

Twelve controller tests cover signal boundaries, a day of sampled phases with no conflicting
permissions, offsets and checkpoint equivalence, all four headings, pedestrian clearance,
braking, projected bodies, following and acceleration. Required mission/world/workday,
route/sign/driving, save-size and current-catalogue suites pass too. Evidence is in
`docs/review/set-9/c32/initial-node.json` and the adjacent logs.

Next: integrate bounded traffic motion and junction priority; add physical signals and
crossings; add the blind-spot cyclist and school children; retain the old-day rules and gentle
first day; then test actual controls, narration, saves and Low/High/fallback rendering. The
red-light reporting question is in the Claude inbox. No new event type has been invented.

No rendered resource figure is claimed for the unintegrated controller. The inherited C-30
baseline is 63 calls / 2,492 triangles in its full loaded Low sweep, with the unchanged
64-call / 2,500-triangle ceiling. Scene integration must recover geometry before adding it,
and pass `test/fpbench.js` and the full quality gate before C-32 is ready. Screenshots and
the final frame figures follow that integration. Native Intel 60 fps remains the owner's O-1.
