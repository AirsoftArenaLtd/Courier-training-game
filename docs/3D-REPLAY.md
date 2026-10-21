# Memory replay of the last mistake (C-37)

Doing on `codex/c37-replay`, from pilot `74cd60a`, independently after merged C-32.
The recorder and playback clock are implemented and tested. They are not loaded
by the game yet. Renderer, controls, entry hooks and browser/resource evidence
remain in progress; no finished replay or new frame-rate result is claimed.

The recorder samples actual simulation time at most twenty times per second into
fixed typed buffers. It retains ten seconds plus a boundary sample. An off-cadence
mistake copies a final endpoint without shortening the next recording. Shorter
recordings keep their actual interval. Pauses do not manufacture duplicate frames;
hiding, rewinds, large gaps and teleports clear continuous history. A later genuine
wrong check or penalty replaces the frozen last mistake; successes, bonuses and
restored historical reports do not. Catalogued labels and lessons remain shared.
The module only observes reports: it never calls report, steps a mission or saves.

Recorded poses include the van and its controls, the actual rendered camera, two
traffic cars, the crossing, cyclist, bus and emergency vehicle. Cargo-open and
repair flags retain their visible state. Numeric values interpolate, angles use
the short rotation, and discrete controls change at the recorded sample. Playback
writes to an isolated restored model and camera. Inventory and on-screen handheld
pages are not a video recording; the UI will explain the van/camera scope.

Fixed recording buffers total 194,880 bytes. A published frame array is at most
97,440 bytes; a context snapshot is capped at 131,072 UTF-16 code units. Only the
most recent clip survives in memory. Nothing enters checkpoints, course records,
SCORM, xAPI or local storage. A finished record's ID and day must match; another
workday and a browser reload do not inherit its clip. Snapshot failure or a newer
unrecordable mistake fails closed instead of presenting a stale mistake.

The playback clock starts paused. Reduced motion keeps it paused and permits
manual stepping; enabling reduced motion during playback pauses immediately.
Hiding pauses playback, and late frames cannot skip large parts of the interval.
The planned scene uses the existing colour filter, larger text, remapping and
narration. It must dispose the old 3D pipeline before allocating its own.

The initial 21 focused tests and a real mission/checkpoint/CPU-world integration
pass. The latter replays 200 positions without changing the source mission,
checkpoint, camera or score, then disposes both worlds. The required mission,
world and workday batch passes 108 cases. Current catalogue checks and syntax pass.
These are model/CPU checks, not browser pixels or an Intel performance claim.

Claude has the shared integration request in the board inbox. The entry helper
needs the finished workday ID in runtime review data, with no saved format change,
to distinguish another record even if its route and mistakes happen to match.
No shared results, drive-map, scoring, save, Settings or i18n file is changed.
