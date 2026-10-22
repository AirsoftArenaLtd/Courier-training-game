# The 3D scenario runner

**Latest native evidence, 22 October:** runtime `dcbe8520` / candidate `1b672d67` passes 191 native checks, including real saved-workday isolation, assessment abandonment, repeated completion, remapped inputs and actual 2D fallback. Thirteen current model/world cases pass. Corrected screenshots and exact repository source scopes: `review/set-10/c38-native-progress/manifest.json`. Remaining cab/signal/narration/resource acceptance is running; C-38 is still doing.

C-38 implements the runner in `src/core/fpscenario.js` and `src/scenes/FirstPersonScenarioScene.js`, stacked on C-52. The governing contract remains `3D-MODULES.md` on the current pilot, including B-135's per-module rules. C-39 to C-46 supply the actual exercises. This change registers no production exercise, changes no course data and enables no 3D default.

## Entry and presentation

An existing scenario keeps its id, categories, content key, brief and thresholds. Its optional `scene3d` is a key registered with `OTR.fpScenario.register(key, definition)`. `default3d` is still owned by the later QA/default switch.

`OTR.fpScenario.resolve(scenario, { choice, webgl })` returns `{ scene, presentation, data }`. `choice` is `auto`, `3d` or `2d`; the caller supplies actual WebGL availability. Auto uses 3D only when the definition is registered and `default3d` is true, or no 2D fallback exists. A 2D choice, unavailable runtime or unregistered 3D definition uses the existing 2D scene when one exists. Otherwise it returns `presentation: 'unavailable'` with no scene. A-30 owns the trainer setting and the academy's completion treatment of unavailable 3D-only entries.

The 3D scene key is `FirstPersonScenarioScene`; its data is `{ scenarioId }`. The normal host starts an assessment through `OTR.academy.begin(id)` exactly once before entering, as today. The runner reads `OTR.academy.assessing` and finishes with `OTR.flow.complete(scene, id, result)`. A proposed shared flow selection hook is in `review/set-10/c38-runner-api/flow-selection.patch`, for Claude to implement or authorize in A-30. Shared flow, scoring, saves, Settings and translations have not been authored here.

## Definition and state

Required fields are `piece`, `goal`, `seconds` and `result(run, reason)`. Pieces are `depot`, `street`, `doorstep` and `cab`. The goal is one concise whole English sentence, at most 160 source characters. It stays complete in the brief, pause menu and handheld; an unusually tall cab translation is moved out of the live panel instead of being shrunk over a mirror.

Optional callbacks are `setup(run, model)`, `report(run, type, detail)`, `update(run, scene, dt)`, `interact(run, scene, targetId)` and `handheld(run, scene)`. An interaction callback returns true when it handled the target. Otherwise the existing physical inputs act. A custom `model(run)` factory must return a fresh model, never an active or saved model object; construction is report-free, and the local sink is bound before `setup` runs.

Each run owns its model, `OTR.ScoreLog`, report-key set, clock and phase. Definitions hold no mutable run progress. The clock begins after the brief and uses the same maximum 0.05-second physics step as the world. It stops during loading, pause, transitions and handheld use. `scene.finishScenario()` completes normally; expiry calls the adapter with `reason: 'timeout'`. The adapter supplies the existing exercise's scoring scale and policies, including what timeout means. The runner validates the result and adds elapsed seconds without inventing scoring weights.

The default pieces use compact ground/street bounds and the existing van, facade, parcel, cab, mirror and device resources. Walking and driving retain physical boundary checks. No asset pack, raster image, Three texture or additional render pass is introduced. Two bounded Phaser texts show goal and time and are included in the texture estimate.

## Reporting, assessment and persistence

Owned world reporters call `OTR.fpMission.emit(model, type, detail)`. Normal workdays delegate unchanged to `OTR.workday.report`. A module model's in-memory sink sends observations only to its definition's adapter, deduplicated by type and key. The adapter selects the checks the exercise actually tests; new exercises use the workday catalogue's wording and criticals where the contract requires them. The runner does not add or rename event types, translate events into points, or write course records itself. A bounded event set fails over to the existing 2D scene on overflow instead of growing indefinitely.

Modules do not write workday checkpoints, finish workdays, replace the saved day or attach the workday replay recorder. Result recording stays in `OTR.flow.complete`. A quit calls `OTR.academy.abandon()` for the active assessment, keeping its attempt used. A loading failure transfers the same id and assessment attempt to the existing 2D scene. A-30 checks capability before beginning 3D-only assessments.

`OTR.fpScenario.coaching(run)` follows the academy. Assessments hide generic answer feedback, driving reminders and step hints. Physical control state, target selection, mirrors, sensor information and sensory sound captions remain accessible. Signal narration omits the three-second coaching rule during assessment. Later exercise adapters must use this coaching flag for their own pages and feedback.

Phaser reuses scene instances. Module entry resets the old transition flag and input debounce so a second run can still finish or quit. A native repeated-play check covers that path.

## Validation

The first 13 model/world cases pass. The earlier 180-check native exploration and six-view Low resource run are source scoped under `review/set-10/c38-progress/`; their assessment captures precede the caption correction and are excluded from final acceptance. The extended saved-workday fixture initially reached the title screen because it had no profile; it now creates a real test profile before starting and pausing an actual workday, and the focused 11-check isolation/fallback run passes.

Final acceptance is running against a current-pilot candidate. It includes repository checks, native normal/larger English/Tamil input/results/assessment/repeated-play/saved-day/fallback paths, existing cab/signal/narration suites and 24 focused `fpbench` views through `QA_MODULES_ONLY=1 node test/fpquality.js`. The focused scope covers all four pieces, reverse camera and handheld in loaded Low/High, accessible Low and missing-model Low. The default 224-view workday gate and every resource ceiling remain unchanged; C-52's completed baseline keeps its original source scope. SwiftShader FPS does not certify the owner's Intel 60 fps floor; O-1 remains.
