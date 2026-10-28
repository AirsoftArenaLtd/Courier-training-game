# Bounded native driving waits — validation in progress

The current native test retains every original verdict and layout assertion. Its protocol timeout now exceeds the individual wait limits. Each reverse approach must reach the same physical target within 30 live game seconds and 15 wall minutes; a stuck vehicle still fails. Actual game seconds, frame counts and wall duration are recorded for every completed bay. Nested Puppeteer causes and actual target/renderer state are retained on failure.

The old High run is separately rejected under diagnostics/high-reverse-wait-b7dc5de8. No cause or corrected acceptance is asserted before the rerun completes. The retained runner runs first, followed sequentially by the three remaining High configurations against the frozen b7dc5de8 candidate.

The retained generic runner now passes all 231 checks across eight layouts, repeated-entry, suspended-workday/abandonment and actual 2D-fallback cases. Its fixture and exact source scope are in runner/source.json. Three corrected High driving configurations remain in progress.

All three corrected High cases now pass 554 checks and 18 actual hazards/reverse parks. Together with the separately scoped five earlier modes/936 checks, all eight configurations are covered. coverage.json states singleRevisionMatrix=false and runtime-bridge.json records the unchanged driving/runner sources. No gameplay or resource limit changed during this test correction. The complete sequential validation state is in commands-completed.json.
