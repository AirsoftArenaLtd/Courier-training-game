# Sorting and lifting model progress

These two owned models are not loaded by `index.html` and have no physical lesson adapters yet. C-40 remains doing.

Sorting keeps the original five-wave rules, active-bin precedence, stable bin numbers, scan/blind behavior, combo
thresholds, clamped points, jams, missed specials, ratios and lesson order. Its five tests include 7,040 direct calls to
the existing `SortingScene` scorer, including `BaseScenarioScene.addScore`, plus final result comparisons and a complete
idle conveyor run. At most 16 parcels are retained. A wave cannot change its bins while a parcel remains on the belt.

Lifting keeps the original weight/posture/lever equations, helper relief, integrated strain and health, assessment
choices, grip and whole-load pallet geometry, drops/twists, per-lift points and result scale. Its five tests include
2,880 calls to the existing `LiftingScene.solvePosture`, all 13 original assessment choices, 30 posture/result scoring
comparisons and a playable five-load safe sequence worth 1,000 points. The kernel retains the original coordinate
units; a future 3D adapter must map physical positions and posture onto them. It does not claim that a browser scene,
human/team animation, equipment workflow or optional `m2-heavy` scenario is implemented.

The original two data files and two 2D scenes match fetched pilot `90844ac5` byte for byte. Raw test output, exact source
hashes, commands and exits are in `source.json` and the adjacent logs. Neither model reports into workday or saves.
No new render resource or frame-rate measurement is claimed here. The separate label station is being validated at
its own frozen source, and its results must not be attributed to these unwired models.
