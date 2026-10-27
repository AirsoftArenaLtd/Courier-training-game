# B-3: recover the shared WebGL context

Branch: `codex/b3-context-recovery`, independently from pilot `90844ac5`. Status: doing; forced-loss reproduction queued under the shared browser lease. No recovery implementation or passing acceptance is claimed yet.

The browser fixture starts one declared, parked campaign cab, then holds the real accelerate key until the original motor moves the van. It forces the actual `WEBGL_lose_context` extension, snapshots the loss event, waits 1.2 real seconds, tries the real gear key while lost, and restores through the extension. The regression compares simulation time, van/player state, cargo and source observations at loss and restoration; it retains the restored frame and raw errors. It changes no position, mission state, events, scoring or timers after setup.

`before-plan.json` freezes the exact 517 baseline/test inputs. `validate-before.py` expects a completed failing baseline, binds its private server to `127.0.0.1:8400`, and releases its browser, server and lease. An unexpected script error is not accepted as evidence of the product defect.

Initial source inspection: Phaser already restores its own GL resources and Three installs its renderer handlers. The owned scene has no context-loss simulation/input guard, and the physical mirror tile flags and static shadow-update state survive renderer restoration. These are hypotheses to check against the native evidence before changing production code. Recovery must retain the current in-memory workday, ScoreLog and cargo, clear stale held input, refill reflection tiles and rebuild static shadows without changing Low/High ceilings. Loading, menus, repeated loss and shutdown need explicit coverage in the implementation slice.

B-2 continues its independent owned UI/runtime validation; its durable settings writer and translation delta stay with Claude. No merge, protected-branch push, owner relay or automation change is needed.
