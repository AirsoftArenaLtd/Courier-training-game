# C-38 implementation progress and diagnostics

The runner is implemented on `codex/c38-scenario-runner`, stacked on pushed C-52. Final acceptance remains pending. The API and shared host proposal are in `../../../3D-SCENARIO-RUNNER.md` and `../c38-runner-api/`.

Current runtime `dcbe8520` passes 13 model/world checks. Earlier native exploration passed 180 input/layout/results/fallback checks across both presets, English/Tamil and normal/larger text. Its fixture was not committed at launch, and visual review found a seatbelt coaching reminder in its assessment captures. Those captures and counts are exploratory diagnostics, excluded from final acceptance. The current code suppresses assessment reminders and signal timing coaching while retaining physical state and sensory cues.

The first six-view loaded Low module resource profile, candidate `7ad9f3bf`, passes at 32 calls / 870 triangles / two Three textures / 3,557,376 attachment bytes / 1,602,768 Phaser estimate bytes. The archived raw report was independently revalidated, including correct set-piece identities and checkpoint/report isolation. This source predates the final caption and lifecycle corrections. It is not the final 24-view gate or an Intel FPS measurement.

The extended saved-day fixture initially timed out at the title screen because it had no profile. It now creates a real profile, starts and pauses an actual workday, then abandons a module assessment while preserving the saved campaign, workday and reports. Eleven focused isolation/fallback checks pass at `56e3f56c`. The failed fixture report, screenshots and log remain under `diagnostics/`.

Source review also found Phaser's persistent transition flag on a reused scene. Current entry resets that flag and input debounce, with a native second-completion regression. The broad repository run remains at `56e3f56c`; its source guard intentionally stops before later jobs, and the temporary resumer applies only the two-field entry fix and its native regression before continuing. Exact scopes remain recorded. The default workday reporters, graphics and all other runtime files are unchanged by this final correction.

No shared flow/scoring/save/Settings/i18n source or course data was authored. New UI text is handed to Claude with the proposed A-30 hook. No course is enabled by default, and this test adapter does not claim a production exercise. No protected branch push, merge, deployment or permanent automation change was made.
