# B-3: recover the shared WebGL context

Branch: `codex/b3-context-recovery`, independently from pilot `90844ac5`. Status: doing; the actual forced-loss baseline is complete and retains three expected regression failures. No recovery implementation or passing acceptance is claimed yet.

The browser fixture starts one declared, parked campaign cab, then holds the real accelerate key until the original motor moves the van. It forces the actual `WEBGL_lose_context` extension, snapshots the loss event, waits 1.2 real seconds, tries the real gear key while lost, and restores through the extension. The regression compares simulation time, van/player state, cargo and source observations at loss and restoration; it retains the restored frame and raw errors. It changes no position, mission state, events, scoring or timers after setup.

`before-plan.json` freezes the exact 517 baseline/test inputs. `validate-before.py` expects a completed failing baseline, binds its private server to `127.0.0.1:8400`, and releases its browser, server and lease. An unexpected script error is not accepted as evidence of the product defect.

Initial source inspection: Phaser already restores its own GL resources and Three installs its renderer handlers. The owned scene has no context-loss simulation/input guard, and the physical mirror tile flags and static shadow-update state survive renderer restoration. These are hypotheses to check against the native evidence before changing production code. Recovery must retain the current in-memory workday, ScoreLog and cargo, clear stale held input, refill reflection tiles and rebuild static shadows without changing Low/High ceilings. Loading, menus, repeated loss and shutdown need explicit coverage in the implementation slice.

B-2 continues its independent owned UI/runtime validation; its durable settings writer and translation delta stay with Claude. No merge, protected-branch push, owner relay or automation change is needed.

## Baseline finding

`baseline-verification.json` verifies all 517 frozen baseline/test inputs and artifacts. The actual extension and restored rendering complete with no page errors, but **three of five assertions fail on the unchanged product**: the mission keeps simulating, cab input still produces an observation, and restoration returns to a later workday moment. During the 1.2-real-second loss interval, mission time advances 1.2314 seconds and the van travels 2.9760 meters while accelerating from 1.0630 to 3.6751m/s. The gear key adds a third source observation while the screen is lost. The restored screenshot was inspected at original resolution.

This is expected-failing evidence, not a passing product test. Both raw report and server log are retained; the browser, loopback server and lease are released. B-2's owned controls/runtime slice is pushed at `6054d59f`, blocked only on Claude's shared writer/translations; this independent B-3 task is doing, with the recovery implementation next.
