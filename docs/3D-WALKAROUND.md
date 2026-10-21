# Walkaround and damage report (C-35)

Doing on `codex/c35-walkaround`, from pilot `da7bd3f` after merged C-34 and A-19.
The physical targets, mission/checkpoint adapter, handheld records and B-78 guidance
are integrated. Final Low/High, inherited browser, resource and shared QA acceptance
are running; the task remains doing. Three owned modules are loaded by shared index.

The pre-trip records existing `damage.baseline`; it never blames that wear on the
trainee. The post-trip records player-caused `damage.added` by zone and a plain
condition description. Missing existing wear is assessed at departure; missing new
zones are assessed at finish, after the existing return guards. A report of damage
in a zone with no wear uses the approved false-report penalty. Reports use only
`inspect.damage`, `trip.damage-report` and `trip.damage-false`, short zone keys and
no unused map places. The shared workday contract owns points and critical flags.

The model must retain inspection/record state across checkpoints without replaying
reports, keep every collection bounded to seven zones, and respect trainer damage-off.
New scene integration must opt in only for new later-day plans, preserving old saves
and gentle first days. Physical controls need real visible targets, remapped keys,
narration, larger text, colour and reduced-motion support. Reuse the current rendering
and one active prompt rather than adding seven persistent text canvases.

C-33 is not a dependency of the board row. Its own acceptance and shared-QA request
remain on `codex/c33-richer-stops`; this branch starts from pilot. B-78 guidance will
cover the road, navigation, signals/cyclist/crossing, van height/load and actual
walkaround/report controls. Richer-stop wording will follow the available feature.

## Pure-model evidence (21 October)

Source `5a8ce69`: all 18 model tests and the 134-case required/affected batch pass,
including 200 seeded checkpoint sequences and 5,000 repeated actions with bounded
state. Current-catalogue i18n, both new JavaScript syntax checks and whitespace pass.
[Raw logs, exact scope and hashes](review/set-9/c35-progress/manifest.json).
This is model evidence only; scene, physical controls, full saves and rendering
acceptance remain in progress.

## Integrated acceptance in progress (21 October)

Runtime `09ce477` opts new day-four-and-later plans in, preserving old checkpoints
and first days. Seven real visible targets use the existing remapped P/E route.
The rear requires closed cargo, and the roof-edge target is reachable from the
ground. The handheld uses bounded short pages at readable sizes, with narration
and a keyboard route. Inspections do not report; departure and guarded finish
report once per required zone, through the approved contract. Restores preserve
observations, descriptions and false-report identities without replaying events.
The per-frame proxy check uses scalar coordinates, without allocating point objects.

All 168 integrated Node cases, 14 final adapter cases, 17 JS syntax checks and the
current catalogue pass. Thirty resumed days preserve 4,588 checkpoints; the 100-day
soak and 240 SCORM score round trips pass (3,990/4,000). A separate heavy-day probe
adds 21 actual descriptors, retains all 193 scoring items and exact score/ratios/
criticals after reload at 3,879 characters, with no LMS refusal. Claude is asked to
add the permanent shared heavy-day guard.

The first English larger-text Low workflow passes 302 actual-key/layout/checkpoint
checks, all seven areas before and after the trip and all 11 help pages, with no
page error and 3,279,686 estimated Phaser bytes. This precedes the equivalent
allocation-free hot-path cleanup. Final frozen Low/High runs and the expanded
151-view resource gate are running. [Logs, screenshots, scope and hashes](review/set-9/c35-integration/manifest.json). No new Intel FPS claim.
