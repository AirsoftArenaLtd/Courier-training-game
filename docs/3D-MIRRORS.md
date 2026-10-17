# Physical mirrors

C-23, 17 October 2026. The left, right and interior mirrors are attached to the van in both cab and walking views.
Their images come from three rear-facing cameras observing the current world. The interior mirror reflects the
actual cab and bulkhead; it cannot see through the solid van. C-24 supplies the rear camera for reversing.

Look with the mouse or remapped arrow keys. The existing target-selection key (P by default) can aim at each
mirror as well as the cab controls. Looking within 12 degrees of a mirror's centre for 0.4 continuous simulated
seconds completes its check. No action key or mirror shortcut is required. The former M shortcut and model
`mirror()` method cannot award evidence. A hint names the mirror and says whether its check is current.

The approved `drive.mirrors` report happens at the manoeuvre, rather than every time the driver looks:

- Moving off requires a left mirror check in the preceding four simulated seconds.
- Turning or changing lanes requires the matching side mirror. The check must precede steering into the
  manoeuvre; looking after starting does not retroactively pass it. Reversing reverses the corresponding side.
- A turn reaches the reporting threshold at 0.06 radians of heading change or 0.6 metres of lateral travel.
  Recentering or stopping rearms it. Stable resumed keys prevent duplicate reports.

Optional `van.mirrors` stores `[leftTime, rightTime, interiorTime, dwellingIndex, dwellSeconds]`. Optional
`driving.mirrorTurn` stores `[side, startYaw, startX, startZ, startTime, priorCheck, reported, sequence]`.
Owned mission/driving validators reject invalid data. Old checkpoints remain valid; their old button timestamp
cannot substitute for gaze evidence. Simulated time freezes during pause. Deliberately opening a menu cancels
partial dwell; a browser lifecycle pause, checkpoint reload and resume dialog preserve it. Completed checks
remain subject to the four-second simulated-time limit. No shared save format or scoring implementation changes.

The three reflection images occupy one atlas: Low is 384 by 144 pixels, High is 768 by 288. Side mirrors use
96 by 144 pixels each on Low; the interior uses 192 by 72. High doubles those dimensions. Images are horizontally
flipped and sampled inside half-texel margins. The unused upper-right quarter remains available for C-24.

At most one reflection pass runs in a rendered frame, including initial tile warm-up. Round-robin scheduling
allows 30 aggregate updates per second on Low and 90 on High, bounded by rendering speed. At 60 fps this gives
about 10 updates per second per mirror on Low and 20 on High. They continue updating while walking or paused.
Side cameras see 40 metres on Low and 75 on High; interior cameras see 12 and 24 metres respectively.

Reflection passes hide the mirror faces to avoid sampling an attached render target. They show the van exterior,
and show the dashboard for the interior camera. Fixed town instances are culled individually against the
reflection camera with preallocated scratch buffers, then main-view matrices, colours, counts and visibility are
restored exactly. The normal world render and its single final composite follow the reflection. The existing
colour filter therefore reaches the physical reflections once. No new image texture or render target is added.

Low has 16 physical mirror triangles and batches its wheel hub with the spokes to save one draw call without
changing the shape. High has solid mirror housings. Both retain raycast proxies and the same keyboard route.
Mirrors follow the van's sprung body, independently of head movement; reduced motion still suppresses cosmetic
camera movement without suppressing live observations. GPU resources are disposed on world replacement.

Tests and review evidence are indexed in `docs/review/set-7/c23.md`; measured resource figures and commands are
in `docs/PERF.md`.
