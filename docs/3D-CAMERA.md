# Camera and feel (C-21)

`OTR.fpCamera.create()` allocates one rig and one numeric pose per built world. `update()` reuses both. The adapter
publishes the pose as transient `model.cameraMotion`; neither it nor C-20's `model.motion` enters the mission save.
No scoring types, control bindings or on-screen sentences are added.

The cab follows the van heading with exponential lag (rate 9), then looks into the turn from signed speed and
steering. Reverse therefore looks into its actual arc. Look-ahead is bounded to 0.085 radians. Keyboard/pointer
head look remains immediate. Speed widens the 68-degree FOV by at most two degrees on Low or four on High.
First-day assistance reduces optional camera movement to 55%; light assistance uses 77.5%. Physical suspension
remains C-20's pitch/roll. The approved Academy rule is cached on launch/resume, not queried each frame.

Head inertia is limited to 30 mm sideways and 25 mm longitudinally. Walking bob is at most 6 mm and sideways sway
3 mm. Road micro-bumps, nine-metre joints and wheel crossings of the generated street edge add bounded heave;
the kerb impulse starts at at most 25 mm and decays exponentially. The level depot apron is excluded. These are
cosmetic: street/solid tests, traction, contact reports and scores still come from the mission motor.

Reduced motion immediately restores exactly 68 degrees and removes optional movement and cosmetic body rotation.
Barcode aiming, parcel inspection and walking interaction targets suppress head movement and restore 68 degrees;
walking inside the cargo bay preserves the existing 2.15-metre eye height. Duplicate syncs and paused model time
do not advance the rig. A new model, mode, reversed clock, teleport or precision/reduced setting resets it.
`art.resetCamera()` also resets the rig for fixed QA observers.

The dashboard remains owned by the camera for existing disposal, but its reused matrix anchors it to the van.
Turning the driver's head therefore reveals the cab rather than carrying the dashboard along. No new scene,
render pass, texture, target or geometry is added. The Low steering wheel uses 5 radial by 16 tubular segments
(160 triangles), from 6 by 18 (216); High keeps 6 by 18. This reserves room for the moving camera's wider view.

The sound adapter reads finite RPM and `cameraMotion.roadImpact`, reusing the engine oscillator/filter among the
existing six voices at its existing 100 ms cadence. Speed remains the fallback without telemetry. Sound levels,
independent controls and captions remain available; invalid telemetry cannot reach an AudioParam.

`test/fpcamera.js` covers forward/reverse, wrapped angles, bounds, kerbs, precision, reduced motion, pause,
teleports, frame-rate consistency and the actual Academy API. `test/fpworld.js` checks dashboard anchoring and an
exact projection reset even after a fractional FOV change. `test/fpcamerabrowser.js` drives/turns/brakes/looks
with real keys, then reloads a real checkpoint with an Academy override. With `QA_CLIP=1` it records a WebM.
Fixtures only position/load the van and choose the route; screenshots and data are in `docs/review/set-7/c21.md`.

The geometry gate is `QA_CAMERA=1 QA_LATER=1 node test/fproute.js`: 30 days, ten variants, five stops, empty/loaded,
and steady/left/right/braking views (12,000 total). The rendered gate adds loaded stress turns and reverse to
`test/fpbench.js`. Resource figures are in `docs/PERF.md`; native Intel FPS remains the owner's O-1 check.
