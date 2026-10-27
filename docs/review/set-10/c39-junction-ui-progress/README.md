# C-39 junction UI and review follow-ups

Doing on `codex/c39-route-driving`, retaining its existing C-38 stack.
The junction paint correction is `2ec63d01`; the preceding UI implementation is
`18a92fc0`. Source `cceb27a2` adds the school-only paint/direction gate and separate browser protocol allowance. This is not a complete C-39 handoff: night driving and shared A-30
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

The `final/` validator completed the strict English Low journey with **169 native checks**. High Tamil larger retained **110 partial checks**, then failed at the red-signal wait (`Waiting failed`, elapsed 9.9334 simulation seconds; the old harness did not retain the underlying cause). All frozen inputs and artifacts were verified, and its browser/server/lease were released. The resource jobs following that failure did not run. Source snapshots under `final/source-before-next/` reconstruct the later school predicate and browser-only configuration changes.

The active validator is now `next/status.json`, source `cceb27a2`: **32 requested resource views first**, then the High native retry. It records `error.cause` and supplies a 1,200-second Puppeteer connection allowance alongside the existing 900-second wait; the real game delta, 0.05-second cap, signal timing, observations and verdicts are unchanged. Original `fpquality` limits, actual control/paint rays, unchanged workday/checkpoint state and 20 device visits remain required. No passing result is claimed for unfinished jobs. All browsers use the workspace lease and a loopback-only server, with exact source/artifact hashes and cleanup recorded. Cloud FPS cannot certify Intel 60 fps (O-1).

The school-only paint/direction fix is now integrated: ten school cases and fourteen unchanged junction cases pass. Its native acceptance remains separate. The night module is an unloaded component/UI draft in `../c39-night-core/` with seven passing real-controller cases; registration, native layout/inspection/drive/results and graphics measurements remain.

The native test discloses stopped pose fixtures after an actual junction encounter
and at least 12 m of real travel, to skip the remaining journey to just behind the
bay. Acceleration, braking, parking and completion then use native keys; no
encounter, travel counter, score, timer or result is injected. Test-only optional
registry/content directly starts the production adapter; it does not certify the
pending shared launcher. `QA_FONT=noto` is an explicit installed-font review pin
on this older stack, not a shared font change.

C-50's correction is complete and pushed at `63cd7cc6`: all 1,176 strict language, 144 layout/occlusion and 16 resource views pass on its complete current-pilot candidate. Its browser lease is released; C-39 has continued immediately. Historical deferral files and failed native runs remain separately scoped. New module text awaits Claude's catalogue/translation review when the full scenario is handed over.
