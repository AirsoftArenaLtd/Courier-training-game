# Memory replay of the last mistake (C-37)

Doing on `codex/c37-replay`, combined with pilot `c9e02e87`, independently after merged C-32.
The recorder, playback clock, detached renderer and accessible controls are loaded
by the game. Conditional results and map hooks are implemented under Claude’s
21 October approval. Frozen acceptance at `73a01da` passes 245 native checks, 214 shared map checks,
the drive-review journey and all 179 resource views. Current-pilot acceptance is
being repeated after C-36, its translations and B-114 merged. The row stays doing
until that combined gate completes; no Intel frame-rate result is claimed.

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

Fixed recording buffers total 201,376 bytes. A published frame array is at most
100,688 bytes; a context snapshot is capped at 131,072 UTF-16 code units. Only the
most recent clip survives in memory. Nothing enters checkpoints, course records,
SCORM, xAPI or local storage. A finished record's ID and day must match; another
workday and a browser reload do not inherit its clip. Snapshot failure or a newer
unrecordable mistake fails closed instead of presenting a stale mistake.

The playback clock starts paused. Reduced motion keeps it paused and permits
manual stepping; enabling reduced motion during playback pauses immediately.
Hiding pauses playback, and late frames cannot skip large parts of the interval.
The scene uses the existing colour filter, larger text, remapping and
narration. It disposes the old 3D pipeline before allocating its own. Unreferenced generated
results/map canvases are released while borrowed textures and loaded assets survive.

All **113 required cases pass**, including 22 recorder/clock cases and five real
mission/checkpoint/CPU-world/adapter cases. Playback applies 200 poses without
changing the source mission, checkpoint, camera or score. Actual calendar record
day is kept separately from route difficulty. Trainer night-off, driving assists
and suspension state restore on the detached model. Current catalogue and syntax
checks pass; browser pixels, layouts and resource figures remain in progress.

The two approved shared hooks append the conditional owned button to each existing
focus ring. Without a matching clip, neither screen changes its controls. Shared
`reviewData` already passes the finished record’s exact stops array. The owned
adapter retains that array’s identity to match the recording: another day or a
reloaded/identical-looking record has a different array and cannot borrow its clip.
No runtime field in shared workday code or change to scoring/save formats is needed.
The clip is cleared on the next recorded workday, and a tab reload clears memory.

The native browser test uses fixture travel/time and completed deliveries, then
actual Dispatch finish, results/map focus rings and the detached playback scene.
It checks reduced motion, remapped controls, narration while muted, source/save
immutability and the same Low/High rendering ceilings. This acceptance is still
running. Claude’s requested `test/drivemapbrowser.js` and drive-review journey are
also required before review. New sentences await Claude’s translation pass.

## Completed frozen acceptance and current pilot

The complete frozen `73a01da` run passes **245 native assertions**: 140 across
English/Tamil normal/larger Low, 35 on a later-day Tamil larger Low route, and 70
High English/Tamil larger. Both actual entry routes, remapped controls, paused
manual steps, reduced motion, muted narration, source/save immutability, selected
map pin / Results return state and release of detached references on exit pass.
Low native page memory peaks at **1,584,187 bytes**, High at **5,100,219 bytes**.
The 214-check shared map suite and drive-review journey pass; all 179 complete
resource views pass the original ceilings. [Exact reports, captures and source](review/set-9/c37-accepted/manifest.json).

Pilot `c9e02e87` is now retained at merge `6040d70d`. It includes C-36, its
translated radio/night interface, all test follow-ups and B-114 numeric save codes.
All 113 required Node cases and the current catalogue pass on that merge. The
native later-day fixture declines an existing radio call through its actual
model before binding the recorder, so a later contact is the newest mistake and
workday finish cannot create an unrelated unread-call failure. No production
obligation is bypassed. Native/shared checks and the expanded **207-view** gate
are repeating at `5627336f`; scoring, save, Settings and i18n sources are unchanged
relative to pilot. New replay sentences await Claude’s extraction/translation.
