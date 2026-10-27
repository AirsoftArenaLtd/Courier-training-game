# C-39 junction UI and review follow-ups

Doing on `codex/c39-route-driving`, retaining its existing C-38 stack.
The corrected runtime is `2ec63d01`; the preceding UI implementation is
`18a92fc0`. This is not a complete C-39 handoff: night driving and shared A-30
optional-entry support remain.

The mounted route device and remappable checkpoint key use the same encounter,
travel and whole-van parking gate. Advancing an approach retains the scenario
clock and local log, clears held input, rebuilds the next physical approach and
pauses before it begins. The third approach ends through the existing results
path. Reverse camera, mirrors and cab switches remain usable. Four existing
marking instances now support both bay orientations without a new texture.
Shared `index.html` loads two owned helpers; no default presentation changes.

Component checks exposed the general drill parking rule's looser lateral and
end tolerances. The junction finish now requires the whole body inside all four
painted lines, facing with traffic. Fourteen core, four adapter, three marking
and 22 protocol cases pass, plus 114 related cases: **157 selected Node cases**.
The shared marking renderer's original school/drill paths remain covered.

## Native evidence and its exact scope

The initial frozen plan at `native-plan.json` records the UI before the strict
paint-edge correction. English Low normal passes **165 native checks**, including
all three actual control encounters, real mirror/signal checks, native movement,
braking, round changes, both device and keyboard finish actions and isolated
saved results (1,500 points, three stars in both categories). Its four screenshots
were inspected at original size; the device text and options fit.

The larger Tamil High run is retained as a **wall-time timeout**, not a passing
journey: after 180 wall seconds waiting at the red signal, the simulation had
advanced only 9.9832 seconds; the configured signal turns green at 27 simulation
seconds. It produced no page error, and all frozen inputs stayed unchanged.
No timer or verdict was edited to pass it. Final source gives that native wait
900 wall seconds and retains the original real delta and 0.05-second cap.

`paint-edge-before.log` separately retains the failing lateral-edge regression.
`core-after-paint.log` records the corrected 14-case result. Initial native
inputs that differ now are reconstructible from `18a92fc0`; the final plan binds
the stricter source and the added device-overlap checks.

The final validator has been requeued under `final/status.json` behind the C-50 review correction: English Low
normal and larger Tamil High native journeys, then **32 requested resource views**
across loaded Low/High, accessible Low and missing-model Low. It enforces original
`fpquality` limits, actual control/paint rays, no injected course observations,
unchanged workday/checkpoint state and 20 device visits. No passing result is
claimed for jobs not yet completed. All browsers use the workspace lease and a
loopback-only server; the validator records cleanup and exact source/artifact
hashes. Cloud FPS cannot certify Intel 60 fps (O-1).

The native test discloses stopped pose fixtures after an actual junction encounter
and at least 12 m of real travel, to skip the remaining journey to just behind the
bay. Acceleration, braking, parking and completion then use native keys; no
encounter, travel counter, score, timer or result is injected. Test-only optional
registry/content directly starts the production adapter; it does not certify the
pending shared launcher. `QA_FONT=noto` is an explicit installed-font review pin
on this older stack, not a shared font change.

C-50's new review regression takes the browser lease first, because it blocks
C-51/C-52. Its correction is on its own original branch, with a current-pilot
candidate; C-39's committed source is frozen independently. The earlier deferral happened before a browser/server started, and its plan/status remain under `deferred-c50/`; the validator is now requeued behind C-50's complete-source checks. New text awaits
Claude's catalogue/translation review when the full scenario is handed over.
