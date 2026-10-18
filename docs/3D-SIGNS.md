# Generated street signs

C-30, 18 October 2026. `codex/c30-signs` derives street names, every existing junction stop
approach, facade numbers, posted speed, school warnings and later road closures from the same
seeded town projection as the mission. Day three introduces an eastbound peripheral one-way
segment without delivery facades. Day one retains the gentle two-way grid.

Each sign is a two-triangle plane with analytic board/post cutouts. All signs share the existing
route-plane instance batch. Low submits at most five signs per view, hence at most 20 additional
triangles over a main/reflection frame, without another draw call, texture, target or pass. High
allows 24. Instance shape, matrix and colour buffers are restored after reflection passes. Posts
remain outside driving lanes and neighbouring regulatory signs have separate positions.

Five reusable Phaser labels provide whole-sentence readings at 18 px or 22 px with larger text.
They avoid captions, neighbouring labels, navigation and the projected physical mirrors/rear
screen, and hide immediately for panels. J cycles visible readings without opening a device
while driving. It uses the existing remappable keyboard and narration routes. Colour filtering
and reduced motion keep the same information. New English sentences/templates await Claude’s
normal extraction/translation after review.

Only new campaigns receive the optional `routePlan.signs: 1` marker. Older checkpoints retain
legacy report types and their two-way peripheral street. No shared save/scoring file changes are
needed. Invalid marker versions fail owned route validation. Sign runtime data is derived and
cached outside snapshots; observation/deduplication flags use existing mission events.

Claude’s 18 October contract answer requires one report per obligation. Signed junctions keep
the original stop detection/HUD log but report `drive.sign-stop`, keyed by the sign id, instead
of `drive.stop-line`. Posted speed and school checks similarly replace legacy `drive.speed`.
Speed failures report immediately; positive speed/school checks wait until a valid day finish,
so later speeding cannot hide behind an earlier successful leg. Give-way checks the initial
loading-bay departure against nearby traffic. One-way/no-entry checks observe actual movement;
entering the prohibited end reports no-entry alone, without a second wrong-way/wrong-side charge.
Both eastbound lanes remain legal. Roadworks checks accept crossing the closure on another
street after seeing its approach, or reject contact with the barrier. All seven sign types use
`OTR.workday.report(type, { key, stop, ok, where })`; the world computes no points.

The queued-narration follow-up from B-30 is included: stale targets, hidden prompts, expired
notices and superseded gear hints are dropped before speaking. Urgent rear warnings and other
readers retain their existing lanes.

Validation and review evidence: `docs/review/set-8/c30.md`. The extended fixed quality gate
includes junction, number, one-way and loaded-peak sign views across Low, High, accessibility
and real missing-model profiles. Cloud SwiftShader measurements verify resource bounds only;
native Intel 60 fps remains the owner’s O-1 measurement.
