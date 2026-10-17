# Rear camera and reversing practice

C-24, 17 October 2026. Selecting R powers the physical dash screen automatically; selecting P, N or D switches
its image off. Looking at the screen is optional. Mouse and remapped arrows work, and the existing target key
(P by default) can select the screen. The action key only explains the screen; it cannot turn the camera on or
award evidence. All four physical gear positions retain the stopped-only interlock.

The image comes from a rear-mounted camera looking down behind the bumper. Projected guidelines follow
constant-lock reverse arcs from the actual steering angle and 3.3-metre wheelbase. Red, amber and green distance
marks bend with that path. Three sensor-bar sectors form the distance band at the bottom. Their bar counts,
the numeric distance sentence and the stop instruction provide cues without colour or sound. No flashing is used.

The six-metre sensor footprint covers the van's width, using three overlapping strips behind the bumper.
It checks world collision rectangles, traffic and the active crossing pedestrian. The footprint is conservatively
expanded sideways for angled vans. Beeps are quiet, increasingly frequent below three metres, and respect the
existing master volume, mute, pause and narration. Text remains available when muted. The camera sees current
rendered geometry; sensor bars are an aid rather than a substitute for watching it.

The new Reverse safely page explains the physical shifter, automatic image, keyboard selection and optional
walk-around. The existing G path check still requires the parked van, an empty-handed driver behind it and a
look down the path. A trainer-required check applies to the tight-drive scenario only; alley, dock and ordinary
workday reversing remain optional. Required scenarios show that instruction before starting. The A-21 rules are
cached on launch/resume in transient `workdayRules`; they are never queried in the frame loop or saved in a mission.

Approved reports:

- `drive.backing` is reported once per manoeuvre. Contact or speed above 5 mph reports failure immediately.
  A safe result waits until the van stops with its parking brake set, leaves R, or the driver exits. Braking to a
  pause in R keeps the same manoeuvre; setting the parking brake while rolling cannot create repeated reports.
- `cameraSeconds` records simulated time with the physical screen visible, including the stationary R preview.
  Head turns away, hidden interface, walking and pause cannot add viewing time. It is metadata, not a score here.
- `drive.backing-walkaround` is emitted only for a trainer-required tight scenario, with the path-check result
  captured before moving. The camera itself never requires getting out. A check expires after 60 seconds or
  after moving two metres/changing heading, and is consumed by the manoeuvre.

`driving.backing` is an optional `[cameraSeconds, requiredWalkaround, checkedWalkaround]` array. It and existing
reverse flags/counters are validated by owned restore code. Unfinished manoeuvres resume with the same report
key; existing saved reports cannot be rescored. Forward/neutral/park clears the temporary array. No shared save,
scoring, Settings or translation source was edited.

Choose a reversing space from the pause menu to practise in an alley, at a dock or in a tight driveway. The spaces
have real collision walls, a marked bay and a stop/parking-brake completion condition. Their `parking` mission
kind, deterministic seed and compact completion flag use a separate prototype checkpoint. Workday and cargo
checkpoints remain intact, and practice cannot report to the active workday or finish its record. A new selection
starts that space again; an unfinished practice can be resumed.

The screen reuses the upper-right quarter of C-23's atlas: 192 × 72 pixels on Low, 384 × 144 on High. There are
still two Three.js textures and at most one reflection update per frame. In reverse the rear image alternates
with round-robin mirror updates. At 60 fps, Low permits about 15 rear updates/second and five per mirror; High
permits about 30 rear updates/second and ten per mirror. Outside reverse C-23's mirror schedule remains. Every
reflection pass hides the screen and mirror surfaces to avoid sampling the attached atlas. Attachment allocation
is unchanged: 3,557,376 bytes Low / 9,142,272 High at 1280 × 720. The shader and static housing add no image assets.

Tests cover live reflected pixels, physical/keyboard controls, steering arcs, overlapping sensors, collision and
overspeed grading, brake completion, saved manoeuvres, practice isolation, narration/mute and resource limits.
Claude's C-23 test-race follow-up is included: a restart requires a non-null new loading token, fixtures retain
their model identity, and input waits use game/frame state. Review files are indexed in `docs/review/set-7/c24.md`;
resource figures and commands are in `docs/PERF.md`. Native Intel FPS remains the owner's O-1 check.
