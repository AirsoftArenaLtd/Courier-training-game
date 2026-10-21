# Dispatch radio and night driving (C-36)

Doing on `codex/c36-radio-night`, from pilot `74cd60a`. C-25 is merged. C-35 is a
separate review branch; this task does not require its walkaround implementation.
Acceptance is running; the following describes the current implementation.

New workdays from day four opt into `radio: 1`. Even days bring the third delivery
forward; odd days add a separate parked dispatch check-in at a non-delivery lot.
The check-in does not add a parcel or alter the five loaded delivery identities.
Its curb is clear of solids and reachable in both directions around the town's
closures, one-way roads and low clearances. Every third later day uses the existing
night preset, subject to the trainer's night rule. First three days and old saves
are unchanged.

One call arrives after twenty metres of actual driving. Its caption persists while
muted and until it is resolved. Incoming calls use the existing cab narration queue
once per loaded mission, even when sound effects are muted; the optional quiet procedural tone pattern uses the
existing master volume and narration ducking. Park with the brake set, open the
handheld, then choose "Read the dispatch radio message." Read and accept or decline
with the existing remapped number/arrow/Enter controls. Reading or accepting is not
credit. A priority call completes at the requested delivery before another one.
The additional check-in completes with the handheld confirmation while parked
within six metres of the specified public curb. A diamond marks that waypoint on
the dash and handheld maps. Its street and house number use the existing signs.

Accepting reanchors the real sat-nav route and clears the old route grace period.
The original stops and outcomes keep their requirements. An ignored or declined
call reports a wrong response; skipping the additional check-in never prevents
finishing the workday. If deliveries finish first, the check-in remains the next
navigation destination before the depot. The module emits only `dispatch.update`,
key `r0`, `radio: true`, and a one-based stop only for a priority delivery. No unused
map place is attached. Scores and lessons stay in the shared contract.

Night uses the existing headlights, fog and windscreen shader. Low's clear-night
range is 30 metres with lights off and 48 with lights on; High's lit range is 65.
Fog and storm ranges remain shorter. Oncoming glare reuses the windscreen, has no
new texture or render pass, and is suppressed for reduced motion. Leaving restores
the original fog. This is cloud resource evidence, not Intel FPS acceptance.

A moving van in night, dusk, fog or a storm needs headlights. `drive.lights` reports
once per driven leg (key `model.leg`): a failure immediately, with its place; a
success at leg end, with no unused place. Turning lights back on cannot erase a
failed leg. A persistent headlight warning appears before movement in daytime fog
or storms as well as night and dusk. Existing physical and keyboard controls remain unchanged.

The radio state has six fixed fields, under 130 JSON characters. Night tracking has
four fixed fields. Strict mission checkpoints keep both without replaying reports.
Tests cover each response step, real mission delivery completion, forty fully
configured extra-stop layouts, trainer-off and older plans. UI, frame-budget,
inherited journey and save evidence remain in progress.

## Shared save gate and QA integration

The read-only [heavy-day probe](review/set-9/c36-progress/c36-save-probe.cjs) extends
Claude's B-98 fixture with reports emitted by these actual modules: one `r0` radio
response plus the additional leg-zero light check (the existing fixture has legs
one through five). Successful light checks retain all pins at 3,993/4,000 or
3,995/4,000 characters. A failed light check with its actual location triggers the
summary fallback and loses 29 pins on reload, although score is exact. This was the original
merge gate requested from Claude; no shared save implementation or test was edited.
[Raw four-case results](review/set-9/c36-progress/c36-save-probe.json).

Claude's shared helper should read and accept the optional call with real keys
once it arrives. For a priority call, the next delivery is index two; then continue
the remaining original IDs. For a check-in, drive to `fpRadio.descriptor(m).park`,
set the brake and confirm through the handheld before returning to normal stops.
Assert one `dispatch.update` keyed `r0`; an unread finish must be false. Night days
need the real headlight control before movement and a `drive.lights` check at leg
end. Native owned tests cover these new choices while the inherited helper awaits
this extension. Claude owns shared QA and translations.

## Combined checkpoint journeys

A read-only adapter of the existing owned seeded journey enables marked radio and
night plans, reads and accepts each call, confirms the extra check-in or visits the
priority delivery first, and uses the actual headlight control when needed. Thirty
days resume identically through 3,723 checkpoints; one hundred seeded days finish,
and 240 SCORM score round trips peak at 3,868/4,000 characters. All three cases pass.
[Adapter, original source hash, fixture limits and raw results](review/set-9/c36-journeys/manifest.json).
This does not replace the separate heavy-day save/pin merge gate above.

## Current-pilot integration, 21 October 2026

Pilot `54d7a63` is combined at `d44c7e6`, including C-35 and B-103. The four-case
probe now removes B-103's two existing fixture reports before emitting each variant
through the actual modules. All retain their exact score and all 28 or 29 pins on
reload, packed at 3,929–3,995 characters. B-103 resolves the failed-light pin loss;
successful-light variants still leave only five to seven characters, reported to
Claude. [Probe and initial combined checks](review/set-9/c36-merge/).

The original frozen 183 resource views all passed. The merged 207-view gate and
shared journeys are being repeated. The prior shared batch passed seven of nine,
with two Results-to-debrief timeouts. Initial merged tests exposed test bootstraps
missing the radio modules and an invalid native fixture that bypassed walkaround
departure. Those fixtures are corrected; production validation remains strict.
