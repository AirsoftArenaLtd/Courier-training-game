# Walkaround and damage report (C-35)

Doing on `codex/c35-walkaround`, retaining pilot `de6f989` after merged C-33, C-34 and A-19.
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

C-33 is merged and retained. B-78 guidance covers the road, navigation, signals,
cyclist, crossing, van height, load and the actual walkaround/report controls.
The richer-stop page follows the available feature.

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

## Current-pilot integration and shared QA

C-33 is merged (PR #182). C-35 now retains pilot `de6f989`, including its locker
policy, translations, handheld cleanup and shared workflow changes. The walkaround
and authorized locker plan coexist in the real launch regression. New native
walkaround fixtures use returned exception parcels for the completed-route setup;
they do not fabricate completed intercom or locker protocols. Travel, completed
exceptions/returns and contact locations remain fixtures, not a full driven day.

The wheel target follows the imported rear-left wheel's actual bounds and remains
unsprung; procedural fallback keeps its original wheel position. A walkaround day's
roof patch uses the upper edge, visible from the ground, with the same existing
instance. Older damage days retain their top patch. The browser now raycasts the
rendered layer as well as the interaction proxy, failing a detached target. The
corrected English larger-text probe passes 318 checks, including all seven surfaces
before and after the trip. Subsequent edits shorten headings into whole sentences;
current-pilot acceptance is still running. Both original failures and corrected
captures are retained. The first batch also exposed an overly strict test-only
font threshold: existing normal panel buttons are 18 px; body text stays 19 px or
larger. The corrected audit checks these readable sizes separately from bounds.

Claude owns `test/paths/workday-3d.js`; no shared QA implementation is edited.
Please add this optional sequence to the helper, preserving its existing paths:

1. If `OTR.fpWalkaroundFlow.phase(m)` is `pretrip`, inspect the van before the first
   acceleration, after returning any held parcel and closing cargo. If it is
   `posttrip`, inspect after returning the van and scanning retained parcels, before
   choosing Finish workday at Dispatch. Trainer damage-off and old plans skip it.
2. For front, rear, left, right, roof, wheel and mirror, use the visible interaction
   `wear-<zone>`. Its actual mesh is in `s.art.walkaroundTargets`; the imported wheel
   has a different position from the fallback. Stand outside the matching face,
   within 2.1 m horizontally, aim at the visible mesh, use remapped P to select and
   E to inspect. Roof inspection remains on the ground. Rear requires closed cargo.
3. The handheld opens **Inspect the van.** Its body names the area and gives the
   observed condition. Choose that condition; **See more descriptions.** opens the
   dent/major choices. **It is recorded.** confirms the stored description.
   **Put away the handheld.** returns to walking. Repeat for every area. Escape
   retains a keyboard path back to the record viewer.
4. Records/checkpoints alone emit no inspection or trip checks. First departure
   emits one `inspect.damage` for each positive baseline zone. Finish emits one
   `trip.damage-report` for each positive caused zone. Require the exact zone key,
   `ok: true`, no stop and no map place. No damage penalties arise from baseline.
   Repeated finish/restore must not repeat reports. A separately wrong clear-zone
   post-trip description emits `trip.damage-false` once; an omitted caused zone is
   critical at finish. Owned model/browser tests cover both decisions.

The early heavy-save probe is read-only reuse of Claude's existing fixtures. A
permanent shared guard for its 21 native descriptors is requested in the inbox.
The current source has 171 required/affected Node cases passing. Final combined
Low/High, 179-view resource, loaded/fallback sweeps and all nine shared flows remain
the acceptance gate. New C-35/B-78 sentences await Claude's translation pass.

## Closed-page memory correction

Source `023719f` releases closed handheld page objects and unreferenced generated
button panels, retaining any other scene's reference. The original Tamil larger-text
Low sequence exceeded 4 MiB at 4,365,312 estimated bytes. The corrected sequence
passes 321 checks and all 12 guide pages at a peak of 3,880,838 bytes, with unchanged
fonts, backing dimensions, button sizes and resource ceilings. Sixty-five affected
Node cases pass. [Failure, inventory, corrected captures and exact scope](review/set-9/c35-memory/manifest.json). Final full acceptance is still running.

## Imported High surfaces and current pilot

Pilot `0b43851` is retained, including Claude's B-93 save/debrief coverage and B-94
review runner. The High workflow found a rear proxy 0.298 m ahead of the source
door. A CPU regression then caught its narrower upper wall and wheel arches behind
the procedural pick shell. The rear and roof now follow actual source geometry;
the existing cargo handle remains selectable. Only a guarded visible wear target
can pass the legacy pick shell, with no additional raycast or change to collision
bounds. All 79 affected cases and 161 final required cases (including B-93), 24
changed-JS syntax checks and the current catalogue pass. The corrected native
matrix, geometry sweeps, browser/resource and shared-flow gates are running.
[Failure, captures and exact evidence scope](review/set-9/c35-surfaces/manifest.json).
