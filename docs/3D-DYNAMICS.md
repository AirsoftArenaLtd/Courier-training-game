# Vehicle dynamics (C-20)

The owned first-person motor now integrates the rear axle and converts it back to the saved body-centre position.
The wheelbase is 3.3 metres, matching the existing wheel positions. Steering in reverse moves the nose outwards
before the rear tracks into the turn. Keyboard steering ramps towards a speed-sensitive limit and centres when
released. The van cannot rotate at rest, and the whole footprint still obeys street, solid and world-boundary checks.

Engine force falls with speed; rolling and aerodynamic drag replace constant coasting deceleration. The empty van
weighs 2,400 kg. Only parcels actually on cargo shelves add mass. Generated route labels use pounds, converted to
kilograms; the original three-parcel lesson retains its kilogram weights. Added mass reduces acceleration and
steering lock and increases stopping distance. Existing weather traction reduces both braking and steering authority.

Reverse creeps at 0.35 m/s on the first day, rising to 0.45 m/s after the aids fade. Pressing the accelerator increases
reverse speed up to 1.7–2.1 m/s (3.8–4.7 mph). The service brake and parking brake override the accelerator, stop in
either direction and hold zero until released. The existing stopped-only keyboard gear change remains available.

Assistance defaults to 1, 0.75, 0.5, 0.25 and 0 on days one through five. Full assistance retains the first-day 8 m/s
forward ceiling, limits high-speed steering and strengthens braking and steering centring. Later days gradually
allow 12 m/s. `OTR.fp.driveAssist(model)` accepts an optional transient `model.driveAssist` override in 0–1. Claude's
A-21 owns the saved trainer setting; its approved API still needs connecting in the owned launch/resume adapter.
No shared Settings, scoring definitions, translations or save implementation were changed for C-20.

`model.motion` exposes acceleration, lateral acceleration, payload, mass, front/rear axle loads, RPM, assistance,
contact, pitch and roll. Weight transfer follows acceleration and load height. The sprung body pitches and rolls
gently while the tyres stay on the ground. Reduced motion removes these cosmetic rotations without changing the
motor. C-21 can consume this telemetry for camera and sound work. Neither the telemetry nor the reused collision
scratch pose is saved; existing speed, steering, gear and parcel state reproduce subsequent motion exactly.

## Review and verification

The evidence and a short recorded manoeuvre are in `docs/review/set-7/`. Start from the depot on day one, fasten the
belt and release the parking brake. Stop with S, press R, then release S to try the reverse creep. Hold D and W
briefly to see the reverse arc, then brake. Stop before pressing R again to drive forward. Accelerate, release W
to feel the coast, and brake again. On a later day compare the same manoeuvre with a heavier load. Reduced motion
should keep the handling identical while removing body movement.

`test/fpdriving.js` checks creep, brake priority, axle geometry, payload, speed/grip steering limits, assistance,
weight transfer, settling, 30/60/120 FPS consistency, stalled/zero frames and an exact mid-reverse save/restore.
`test/fpworld.js` checks the body/tyre split and reduced motion in both presets. The grid-corner test now turns in
when the front axle reaches the junction; it retains its collision and street assertions.

`test/fpdynamicsbrowser.js` drives with real keyboard events and records telemetry and screenshots. With
`QA_CLIP=1` it also writes a WebM using Puppeteer's screencast and ffmpeg. Its starting route and loaded parcels are
fixtures; no keys or future movement are simulated by the test. The external suspension screenshot uses a fixed
observer and a maximum braking/cornering pose. It is an inspection view, not a new player camera.

`test/fpbench.js` adds `laterstressbrake`, the existing loaded day-18 mirror stress fixture with body pitch/roll.
Resource results and reproducible commands are recorded in `docs/PERF.md`. SwiftShader frame rates cannot establish
the owner's Intel 60 fps floor; the existing O-1 native laptop check remains open.
