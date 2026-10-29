# C-39 junction core, 27 October 2026

Doing on `codex/c39-route-driving`, retaining the existing pushed C-38 stack.
Fetched pilot remains `b27954c4`; its 27 October answers are accepted in the board.
This slice's final source is `0d44bc03`.

`fpjunctionlesson.js` builds three separate physical approaches over the existing
seeded town: a stop sign, a red signal and a give-way junction with priority
traffic. Each round begins in a declared parked position; progression creates
the next round only after the current whole-van parking gate. The red round's
initial signal offset is set before rendering; the actual traffic phase and the
observation use that same layout. No timer or verdict is edited during a drive.

Only the five agreed safety types and `drive.route` can enter the local log.
Labels, lessons, weights and critical flags come from the existing catalogue.
Each approach grades its control, mirror and signal obligations once. A failed
mirror/signal observation dominates later positive pull-outs, so repeated starts
cannot dilute it. **One efficiency check for the whole course** retains the
existing `drive.route` maximum of one; an earlier route failure survives later
rounds. No type, shared score formula, save field or workday report was added.

The finish requires the actual stopped van with its parking brake set, inside
the full physical bay and facing with traffic, after the intended control was
encountered and travel observed. Missing or unrelated control keys cannot unlock
it. Timeout retains observations and missing obligations, with zero score and
ratios. Observation storage is bounded; overflow cannot finish. Round restarts
cannot discard an unresolved approach.

## Evidence and limits

The final **12 new Node cases pass**, together with **199 related cases** across
ten unchanged suites: **211 selected cases**. Syntax checks pass on both new
files. [manifest.json](manifest.json) records exact source and artifact hashes.
The suite is auto-discovered by `run-all`; its generated README table is updated.

The physical tests drive the real motor with pure-model controls, gaze and
indicator timing, and wait on actual visible traffic phases/priority traffic.
They produce safe observations at all three controls, a real red-light failure
and a real unresolved sat-nav deviation after its grace period. Pausing freezes
that period and travel. Separate declared pose/observation fixtures test grading,
round progression, completion, score maxima and wrong-way/partial parking; these
are not described as native UI or uninterrupted full-course journeys.

The first run (8/10) exposed a vertical-bay wrong-direction acceptance inherited
from the general drill's partial-credit parking rule. This new course's finish
gate now rejects it. Its other failure was a test expecting a successful red
check to be a critical mistake; ScoreLog correctly marks only a failed check.
Both original sources and the failing log are retained under `attempt-01/`.
The intermediate 10/10 run at `6f74c998` used a route check per approach; that
provisional aggregation is superseded by the final one-point course obligation.
Raw producer whitespace is preserved in the failing log.

Fresh extraction with and without only the new helper finds seven strings and
no templates: four internal error messages and three new address/parking/finish
texts. The output went to `/tmp`; shared catalogues/dictionaries are unchanged.
The existing-catalogue i18n check passes; this is not translation acceptance for
the new helper or the earlier C-39 text.

**This core is not loaded or registered in `index.html` yet.** No new UI, rendered
bay, browser layout, resource ceiling or Intel FPS result is claimed. Next is the
owned three-round adapter, including a correctly rotated bay marking, native
English/Tamil normal/larger journeys and the unchanged resource protocol; night
comes after that integration. The shared optional registry/launcher proposal is
already in Claude's Inbox and remains an A-30 dependency. No default presentation,
shared flow/validation file, protected branch or automation was changed here.
