# Fix plan: second pass (human-style review)

Instructions for whoever does the fixing (a future session of me, or a fixing agent). Nine testers played every part
of the game like trainees and wrote **186 findings** into `docs/review/<area>.md`: 1 blocker, 47 major, 77 minor,
33 design, 28 polish. This plan assigns every one of them to a work package, settles the design questions up front
so nobody has to guess, and says how to verify. The owner's goal: the game runs on **typical company computers
(integrated graphics)** and has **no small, easy-to-miss issues**.

A snapshot of the project before any of these fixes was kept in `_baseline-pass2/` at the project root. It was
deleted in WP9; the WP9 Log entry names the last commit that has it. `HANDOFF.md` at the root
has the state of play and the notes for working in a cloud session.

## How to work

- **One work package at a time, in order.** WP1 builds mechanisms that later packages use.
- Before fixing a finding, **read it in full** in its review file (repro, evidence, suspected cause, suggested fix).
  The suggested fix is a starting point, not an order; the decisions below override it where they differ.
- Fix at the source. Where several findings share a cause, fix the cause once (shared helpers in `src/core/`).
- Match the surrounding code: naming, comment density, idiom. Edit JS with the Edit/Write tools, never through shell
  heredocs (they eat `\'` escapes), and run `node --check` on every file you touch.
- **Mark every finding** in its review file by adding a line under it:
  `- **Status:** fixed — <what changed, where>` or `- **Status:** not changed — <why>` (a design call you decided
  against, with the reason). No finding in your package may be left without a status.
- **Verify as you go** with the play tool (`test/tools/playd.js`, see `docs/review/BRIEF.md`): reproduce the finding
  first, fix, then check it is gone, and look at the screen. Half-size screenshots and crops; batch commands.
- **After each package:** run `node test/qa.js --only <the scenarios you touched>` (and the flows if you touched the
  route day, the town or the stop scene: `route-day,route-legs,town-traffic`). A golden path that fails because
  behaviour **intentionally** changed is updated to the new behaviour, keeping its intent (plays like a careful
  trainee, through the real controls, and a careful run earns full marks). Never weaken an assertion to get green.
- Append a short entry to the **Log** at the bottom of this file: what was done, what was not, tests run, anything
  the next package must know.
- Budget: a package should take one working session. If a package runs long, finish and mark what you have, log
  what is left, and stop cleanly.

## WP1 mechanism: honest results (build this first)

Many findings across all areas share three causes: `ResultsScene.js:36` picks the headline from the star count
alone, so one critical mistake still reads "GREAT WORK!"; `ScoreLog.lessons()` returns lessons in time order and
scenes cut them at 2–3; and `ScoreLog.ratio()` returns 1 for a category nothing tested. Build, in
`src/core/scorelog.js`, `src/core/flow.js`, `src/scenes/ResultsScene.js` (and the route-day debrief in WP4):

1. **Critical mistakes.** `check()`/`penalty()` accept `{ critical: true }`. `log.criticals(group)` lists the
   critical failures. A result carries `criticals`. A critical failure **caps its category at 1 star**, the headline
   becomes a clear failure headline (for example "SAFETY-CRITICAL MISTAKE" / "CRITICAL MISTAKE"), there is no
   confetti, and the critical items come first in the takeaways, marked. Each area package tags its own critical
   mistakes (the ones listed under "criticals" below are the minimum).
2. **Ranked takeaways.** `log.takeaways(group)` (or rework `lessons()`): one entry per distinct lesson, ranked
   critical first, then by points lost; repeated mistakes counted ("× 6"). The results screen shows as many as fit
   (at least four) and a "+ N more" line when there are more; the stats line is never dropped. Scenes stop slicing
   lessons themselves.
3. **Untested categories.** A category with nothing checked and no penalty in this run is *untested*: it earns no
   stars and the results screen says "not tested this run" instead of showing stars.
4. **Headline honesty.** "FLAWLESS!" only with no mistakes at all; no praise headline over criticals; rename
   "SHIFT LOGGED" for practice runs (SHELL-16).
5. **Time is not a free star.** A helper that gates a time/efficiency ratio by the accuracy of the calls made
   (rushing through with wrong calls must not earn time stars). Apply it in the pre-trip and pickups (PRP-6,
   PRP-14); WP2b applies it to collapsed stops (STOPS-M8-19).
6. **Declared categories.** Every category a scenario scores is declared and shown (STOPS-M8-5, DIALOGUE-10): either
   declare it in `data/modules.js` or stop scoring it there. Prefer declaring it when the scenario really teaches
   it (drop-spot choices are service).

## Work packages

### WP0 — Performance on integrated graphics
Findings: PERF-1, PERF-2, PERF-3. Plan and measurements: `docs/review/perf.md` (follow its ranked plan).
- `src/core/textures.js`: `getContext('2d', { willReadFrequently: true })` (removes the 50–95 ms freezes).
- `src/main.js`: `render: { antialiasGL: false, maxTextures: 1 }` (the measured best on the Intel GPU).
- Draw static Graphics shapes into textures once (PERF-2); this also restores smooth edges lost with MSAA off.
- Merge the three atmosphere overlays in `src/core/atmos.js` into one image; bake static backgrounds (conversation
  sets, stop sky + far hills, the warehouse dim layer); trim transparent margins of big layers (pickup front).
- PERF-3: load Phaser from `lib/` first (no CDN dependency on corporate networks); add a favicon.
- Verify on the Intel GPU (`QA_GPU=default node test/qa.js --pass boot`, and the play tool with `--gpu default`):
  target ≥ 60 fps in every scene, ideally ≥ 100. Check visually that nothing changed except edge smoothness (take
  before/after shots of a conversation, a stop, the hub, the drive). Record the before/after fps table in the Log.

### WP1 — Honest results and scoring (the mechanism above)
Findings: WAREHOUSE-4, WAREHOUSE-6, WAREHOUSE-7, PRP-6, PRP-8, PRP-13, PRP-14, PRP-16, PRP-23, PRP-27, DIALOGUE-1,
DIALOGUE-10, STOPS-M5-20, STOPS-M8-5, STOPS-M8-9, SHELL-8, SHELL-9, SHELL-16, SHELL-21.
Criticals to tag in this package: releasing an adult-signature package to someone under 21 or without valid ID
(STOPS-M5-20); a late First Overnight (PRP-8); accepting a piece on a failed invoice (PRP-16); refusing a correctly
declared DG piece / accepting an undeclared one (PRP-27); flagging good parts in bulk must cost in proportion
(PRP-23: remove the cap of 3 or scale it).

### WP2a — The walkable stage and doorstep stops (Module 5 findings)
Findings: STOPS-M5-1 to STOPS-M5-19, STOPS-M5-21, STOPS-M5-22, STOPS-M5-23. Files: `src/core/stage.js`,
`src/scenes/stops/StopScene.js`, stop data.
- STOPS-M5-1: confine the courier to the van floor while in the van (both ends), including click-to-walk; walking
  into the door says "Press E to climb out".
- STOPS-M5-16 / STOPS-M5-22 (the owner's "wiggle" complaint): stand points on the thing itself (bell, number,
  door); **show the E prompt while walking** as soon as an interaction is in range (do not hide it while moving);
  windows centred on the thing and wide enough that stopping "at" it always works; no dead gaps between
  neighbouring interactions.
- STOPS-M5-4: the van prompt must not reveal whether the right package was pulled.
- STOPS-M5-8: remove the "(as the note asks)" hint from the spot choice.
- STOPS-M5-10: guard `startTalk()` against a second open.
- STOPS-M5-23: the pause menu of a practice stop set offers "Restart this stop" and "Restart the set", clearly
  labelled.
- Tag criticals where a stop outcome is plainly wrong (STOPS-M5-19: leaving a package at a closed business).

### WP2b — Safety stops (Module 8 findings)
Findings: STOPS-M8-1 to STOPS-M8-4, STOPS-M8-6 to STOPS-M8-8, STOPS-M8-10 to STOPS-M8-21.
- STOPS-M8-4 (blocker) first: no auto-walk may cross a hazard at full speed; nothing may leave the stage locked.
- STOPS-M8-1: careful walking is judged over the whole hazard, not its first frame.
- STOPS-M8-2 / STOPS-M8-3: hazards visible (ice sheen, wet steps) and zones matching the art.
- STOPS-M8-8 (decision): a trip hazard can be cleared with the package in hand (the courier sets it down in the
  same action); following the intro's advice costs nothing.
- STOPS-M8-18 / STOPS-M8-19: a heat collapse ends the stop properly (and the set treats it as a critical safety
  failure); the next stop does not start overheated; the warning can fire again after recovery; no time stars for a
  collapsed stop (WP1 helper).
- STOPS-M8-20 (decision): drawn shade is real shade (porch roof, umbrella); the drop-spot answers match the model.
- Tag criticals: heat collapse; approaching a dog the lesson says to avoid; falls while carrying on a hazard.

### WP3 — Driving
Findings: DRIVING-1 to DRIVING-14, ROUTEDAY-7, ROUTEDAY-8, ROUTEDAY-12, ROUTEDAY-16, ROUTEDAY-19, SHELL-23.
Files: `src/core/vehicle.js`, `data/vehicle.js`, `src/scenes/shift/TownDriveScene.js`, `src/scenes/m1/DrivingScene.js`,
`test/paths/lib/autodrive.browser.js`.
- DRIVING-1 first: the brake must never select reverse by accident (reverse needs a deliberate hold from standstill
  as documented; a re-press of S shortly after stopping stays in D). Update the autopilot if it relied on the old
  timing.
- DRIVING-2: no creep defeats P; teach SPACE (park brake) in the drill intro and the HUD prompt.
- DRIVING-6 / DRIVING-7 (decision): drill hazards are placed on the planned route between checkpoints, on straight
  road away from junctions, and cannot pass while the van waits; reorder checkpoints so each leg starts facing the
  next bay (a loop, not a zigzag).
- DRIVING-11 / DRIVING-3: pedestrians only start crossing when the van could stop for them; "failed to yield" only
  for someone in the van's path; traffic that hits a stopped van is not the trainee's collision.
- DRIVING-8: the drill results list every hazard passed or failed (plus WP1's ranked takeaways).
- ROUTEDAY-7 / DRIVING-10: parking requires the van inside the marked bay, off the sidewalk and crosswalk, near the
  kerb, and the rule is explained on screen the first time.
- ROUTEDAY-16: hitting a pedestrian is a critical safety failure (WP1), not a -5 line.
- ROUTEDAY-19: when headlights are required, a prompt says so before any penalty.
- DRIVING-14: act on the handling notes that describe defects; record the rest as decisions.
- Must keep `m1-driving`, `route-legs` and `town-traffic` green.

### WP4 — The route day
Findings: ROUTEDAY-1 to ROUTEDAY-6, ROUTEDAY-9, ROUTEDAY-10, ROUTEDAY-11, ROUTEDAY-13, ROUTEDAY-14, ROUTEDAY-15,
ROUTEDAY-17, ROUTEDAY-18, ROUTEDAY-20, ROUTEDAY-21, SHELL-5, SHELL-10. Files: `src/core/shift.js`, the shift scenes
(briefing, debrief), the route generator, save/resume.
- ROUTEDAY-5: the load holds exactly the day's pieces.
- ROUTEDAY-9: Restart must not wipe a leg's violations (restart from the leg's start state, penalties kept, or the
  restart itself logged).
- ROUTEDAY-10: reloading inside a stop resumes that stop.
- ROUTEDAY-13: the generator never pairs a leave-behind note with a signature or adult package; tag leaving a
  signature package unattended as critical.
- ROUTEDAY-14 / ROUTEDAY-15: the debrief uses WP1's ranked takeaways with counts, always shows "Went well" when
  something did, and the dispatcher's closing line matches the day (no praise after a critical mistake).
- ROUTEDAY-4 (decision): missed pre-trip defects matter: listed in the debrief as "rolled out with", scored, and one
  proportionate in-day consequence where cheap.
- ROUTEDAY-17 (decision): a day mixes stop types (signature, business/reception, apartment, exception with door tag,
  a dog note, leave-at-door with varied spots) and house models, at most two of a kind, all from the day's seed.
- ROUTEDAY-18 (decision): the town (layout, addresses, residents) is fixed per career, not rebuilt each day; only the
  day's stops, weather and traffic vary. Keep saved mid-day routes loadable; keep `route-legs` covering ten days.
- ROUTEDAY-20 (decision): route days count toward the courier rank.
- SHELL-5: the briefing gets a pause menu with a way back to the hub; starting a route day from the hub asks first.
- SHELL-10 (decision): remove the unreachable practice "day" summary path and its dead UI (or make it reachable
  after a route day if it adds something the debrief does not); document the choice.

### WP5a — Conversations: engine and staging
Findings: DIALOGUE-2, 3, 5, 6, 7, 8, 16, 17, 20, 22, 25, 26, 27, 28, 30, 31. Files: `src/core/talk.js`,
`src/scenes/shared/DialogueScene.js`, settings data.
- DIALOGUE-20 first: the click catcher must not sit over the HUD; the pause button works.
- DIALOGUE-22: the feedback card shows the answer chosen.
- DIALOGUE-26 (decision): a timed decision's clock scales with the text to read (at least ~4 s plus reading time at
  about 20 characters per second), and the trainee is warned that a timed decision is coming.
- DIALOGUE-31: debounce advancing (a double-tap cannot skip an unread line) and allow re-reading the last line.
- DIALOGUE-6 / DIALOGUE-17 (decision): stage what the narration says where the art helpers allow (box in hand, the
  second car in the fender-bender, the storm on a street); record what was not possible.
- DIALOGUE-28: mood effects on a line go to that line's speaker.

### WP5b — Conversations: content and endings
Findings: DIALOGUE-4, 9, 11, 12, 13, 14, 15, 18, 19, 21, 23, 24, 29. Files: conversation data in `data/`.
- Endings must respect the flags set for the mistakes (DIALOGUE-9, 12, 14, 15, 23, 24): a bitten courier, an opened
  chemical box, a false report, a forged signature, a moved van, a guessed address can never reach a "textbook"
  ending; tag them critical (WP1).
- DIALOGUE-21 (decision): rewrite answers so length does not predict the right one (the recommended answer is the
  longest in no more than about a third of decisions), keeping every answer's meaning and grading.
- DIALOGUE-13: the best answer never triggers an anger bubble or a mood drop.
- DIALOGUE-19: US English throughout (WP8 does the rest of the game).
- Content validation (`?dev=1`) must stay clean; add checks where a new rule can be checked automatically (for
  example, "the recommended answer is not always the longest").

### WP6 — Warehouse games
Findings: WAREHOUSE-1, 2, 3, 5, 8 to 23. Files: `src/scenes/m2/*.js`, `src/scenes/m6/LoadingScene.js`, data.
- WAREHOUSE-1: keys act on the scanned package (the glow moves to it).
- WAREHOUSE-2: a wave ends only after its belt is clear (or leftovers are judged by their own wave's bins).
- WAREHOUSE-8 / WAREHOUSE-21 (decision): lifts start upright, gauge SAFE, the courier off the pallet so the carry and
  pivot are required.
- WAREHOUSE-17 (decision): no stop badges in Find It Fast.
- WAREHOUSE-20 (decision): a bin keeps its key for the whole shift.
- WAREHOUSE-22 (decision): every game's core actions work by mouse and by keyboard, and its intro lists both.
- WAREHOUSE-23: pausing cancels a drag cleanly.

### WP7 — Pre-trip, Route Planner, Pickups
Findings: PRP-1 to PRP-5, PRP-7, PRP-9 to PRP-12, PRP-15, PRP-17 to PRP-22, PRP-24 to PRP-26.
- PRP-17 first: the shipper's line points at the right box (fix the colours or the line).
- PRP-11: a miscount is never scored as a reconciliation; the shipper answers what the trainee said.
- PRP-5 / PRP-12 (decision): close-ups and inspections show what there is to see and describe it neutrally; they do
  not state the verdict. The door latch gets a pull test.
- PRP-4: side views not mirrored; the headlights on the right sides.
- PRP-1 / PRP-22: keyboard paths for walking round the truck and for Accept / Refuse / OK.

### WP8 — Title, hub, menus, saving
Findings: SHELL-1 to SHELL-4, SHELL-6, SHELL-7, SHELL-11 to SHELL-15, SHELL-17 to SHELL-20, SHELL-22.
- SHELL-6: Restart and Quit ask for confirmation; the pause menu names screens the hub uses.
- SHELL-12 (decision): the pause menu gets "Controls" (the current scene's controls); Settings gets volume, and the
  unused `hints` flag gets a switch or is removed.
- SHELL-14 (decision): "New Profile" warns that it replaces the current profile's progress and asks first; a failed
  save shows a visible warning. (Several profiles per browser is out of scope; note it.)
- SHELL-18 (decision): a brand-new trainee is pointed at a first scenario ("Start here"), and ENTER on the hub does
  not start the full route day for someone who has played nothing.
- SHELL-20: scenarios pause when the window loses focus or the tab is hidden.
- SHELL-15: one US-English pass over every player-facing string in the game (see also DIALOGUE-19).

### WP9 — Verification and report
- Full `node test/qa.js --shots` on the RTX (default) and `QA_GPU=default node test/qa.js --pass boot` on the Intel
  GPU; both clean (lower `QA_FPS_FLOOR` to 60 for the Intel run if WP0 lands there, and say so).
- A short human re-check with the play tool of the owner's two examples (walking out of the van; prompts that need
  a wiggle) and of every blocker and major finding.
- `node --check` on every file; `index.html?dev=1` content validation clean.
- `docs/QA-REPORT.md`: a "Second pass" section (what the testers found, what changed, the Intel fps table before
  and after, anything decided against), and before/after screenshots for the visible fixes.

## Log

(Each package appends: date, package, what was done, tests run, notes for the next package.)

- **2026-09-24, WP0 (partial, local session, cut off by usage limits).**
  - **Done:**
    - PERF-1 (`willReadFrequently`, marked).
    - The renderer config in `src/main.js`.
    - PERF-2 helpers (`OTR.tex.shape`, `OTR.tex.liveShape` in `src/core/textures.js`) and conversions in fx, rig,
      scanner, stage, talk, ui, HubScene, PreTripScene, RoutePlannerScene, LabelScene (maybe partly),
      TownDriveScene (partly) and DrivingScene.
  - **Left:**
    - the remaining conversions (StopScene, LiftingScene, SortingScene, PickupScene, LoadingScene, ResultsScene,
      shift scenes, DaySummary, BaseScenarioScene…);
    - merging the atmosphere overlays;
    - baking backgrounds and trimming layers;
    - PERF-3;
    - Status lines for PERF-2 and PERF-3;
    - the full suite.
  - **Tests:** spot check only; m1-pretrip, m2-labels and m3-missing pass every pass on the RTX. Details in
    `HANDOFF.md`.

- **2026-09-24, WP0 (finished, cloud session).**
  - **Done:** the remaining conversions to baked shapes (every scene; live shapes only where a drawing changes, and
    those redraw only when their value changes); the atmosphere grade merged into one MULTIPLY overlay plus one ADD
    lift for dark scenes; conversation backdrops baked into one texture (`Stage.bakeBackdrop`) and the stops' far
    layers into one parallax strip (`Stage.skyline`); transparent margins trimmed from large textures; Phaser served
    from `lib/` (no CDN) and an inline favicon. PERF-2 and PERF-3 marked.
  - **Measured** (software WebGL in the cloud, SwiftShader, which is slower than any real GPU): conversation 8→26 fps,
    doorstep stop 8→21, labels 13→30, business stop 14→33. **The Intel table in `perf.md` still has to be measured on
    the owner's laptop**; nothing here stands in for it.
  - **Tests:** the full suite ran once after WP0; its failures were the stop prompts (pre-existing, fixed in WP2a) and a
    late redraw of a destroyed shape in conversations (fixed: `liveShape` skips a destroyed image).
  - **Next:** the test tools now start Chromium with SwiftShader on Linux (`QA_BROWSER=/opt/pw-browsers/chromium`).

- **2026-09-24, WP1.**
  - **Done:** the honest-results mechanism as specified (`ScoreLog` critical items, `tested`, `criticals`, ranked
    `takeaways` with counts; `OTR.flow.complete` caps critical categories at 1★ and gives untested categories 0★;
    `OTR.scoring.headline` / `gateTime`; results screen rebuilt: stars per category, untested rows, red header on a
    critical mistake, at least four takeaways with "+ N more", labelled career bar). Every scene passes its log; the
    scenarios declare the categories they score. All WP1 findings marked.
  - **Tests:** the golden paths of every scenario pass on the merged code (m1-pretrip, m1-route, m1-driving, m2-sort,
    m2-lift, m3-twostops, m4-storm, m5-pod, m5-exceptions, m5-adult, m7-dg, m8-dog, m8-heat, m8-steps among them); the
    golden check now also fails on an untested category or a critical mistake.

- **2026-09-24, WP2a and WP2b (stops).**
  - **Done:** stage prompts while walking, van confinement, door interactions on their targets, shelves
    (click-select, hover preview, in-hand ghosts), the photo viewfinder and review, talk guard and spacing; hazards
    judged every frame (never during scripted walks), clearing a hazard while carrying, dog staging and re-arming,
    heat shade zones and recovery. All M5/M8 findings in these packages marked.
  - **Tests:** m5-pod, m5-exceptions, m5-adult, m8-dog, m8-heat, m8-steps, m3-twostops, m4-storm pass.
  - **Note:** `test/paths/lib/stop.js` clears "Move the … aside" hazards like a careful trainee.

- **2026-09-24, WP3 (driving).**
  - **Done:** reverse on its own key (R), P after a standstill, the stop line clear of the crosswalk
    (`OTR.townArt.STOP_LINE`), an honest parking bay (`parkBay`), drill hazards staged on the route, pedestrians who
    only cross when it is safe, a pedestrian hit as a critical stop-the-drive card, lights/school-zone prompts, HUD
    clean-ups. All WP3 findings marked.
  - **Tests:** m1-driving passes (six hazards, no violations); route-legs, town-traffic and route-day were run with
    WP4 (below), since WP4 changes the same flows.

- **2026-09-24, WP4 (route day).**
  - **Done:** mixed stop types in one fixed town (seeded per day); the load matches the route exactly and reports
    what went where; the pre-trip is seeded with the day's weather, and a missed defect holds the truck at the gate;
    Restart on a leg or a stop keeps the day's record ("Restarted stop 3"); a reload inside a stop resumes that stop;
    the debrief ranks what to work on and is kept with the day (the hub links it); route stars count toward the rank;
    the briefing has a pause menu. The day summary and the practice "day" slots are removed (SHELL-10). All
    ROUTEDAY findings marked.
  - **Tests:** route-day (9/9 stars, restart and reload records), route-legs, town-traffic pass. New checks: the hub
    asks before a route day starts; Restart names what it restarts; a reload inside stop 4 comes back to stop 4.

- **2026-09-24, WP5a and WP5b (conversations).**
  - **Done:** talk engine: the pause button works, number-pad answers, no skipped lines (350 ms guard) and ↑ / ↓ to
    read earlier lines, the chosen answer stays on screen, timers scale with the reading (at least 4 s + 1 s per
    20 characters) and show a countdown, a timeout highlights the right answer, "✗ UNSAFE" for a wrong answer that
    costs safety. Staging that matches the narration (new acts: hold, walk, prop, stage). Endings that remember every
    mistake (flags and `notes`), an honest flood report, m8-incident rewritten in US English, answers rewritten so
    the recommended one is the longest in 11 of 44 decisions and the shortest in 13. Content validation now checks
    ending effects, choice counts and the answer-length bias. All DIALOGUE findings marked.
  - **Tests:** m3-missing, m3-signature, m3-twostops, m4-address, m4-damaged, m4-storm, m8-incident pass; content
    validation clean.

- **2026-09-24, WP6 (warehouse games).**
  - **Done:** Sort Belt keys act on the scanned package, waves end on a clear belt, bins keep one number for the
    shift; Lift Right needs the carry and the turn to the pallet, reach is measured and scored, the verdict names the
    fault, an on-screen pad; Label Check turns and timeouts; Load for the Route drops by the pointer, strap only when
    the cart is empty, keyboard cursor; no stop badges in Find It Fast; pausing ends a drag cleanly. All WAREHOUSE
    findings in the package marked.
  - **Tests:** full suite on the WP6 snapshot: 26 of 28 clean. hub-briefs failed on its own measurement (a
    button's bounds include its transparent shadow margin; the check now uses the button's own size) and m8-heat on a
    real bug that WP2a left (below, fixed with WP8).
  - **Note:** m2-sort and m2-lift golden paths were updated for the new keys (`keyTarget`, `binKeys`) and the pallet's
    new place; their assertions are unchanged.

- **2026-09-24, WP7 (pre-trip, route planner, pickups).**
  - **Done:** pre-trip keys (A / D, C, L, T, P, F), legible close-ups that describe without judging, true sides and
    lamps, pull-tested latches, real tire defects with stated limits, an oil pressure gauge; route planner result
    card compares like with like, school-zone hours and slowed legs, undoable Clear; pickups recount a short count,
    neutral inspection facts, the gray box is the solvent, paperwork first in m7-intl, honest follow-ups, one toast at
    a time, A / R keys. All PRP findings in the package marked.
  - **Tests:** see WP8 (run together on the WP8 snapshot).
  - **Note:** open question for the owner: which vehicle the couriers drive (the pre-trip now has a hydraulic-brake
    step van's oil pressure gauge; one entry in `data/m1_pretrip.js`).

- **2026-09-24, WP8 (title, hub, menus, saving).**
  - **Done:** walkers pass behind the title's van; name entry takes any letter, 24 characters with a counter, and
    says why a key or an empty name is refused; pause menu confirms Restart and Quit, R / Q / C / ESC keys shown on
    the buttons, a Controls card; ESC and ‖ work on the how-to card; the game pauses when the window loses focus;
    keyboard focus ring over menus, the hub and dialogs; Settings volume and the stop checklist switch; a visible
    notice when progress cannot be saved; a NEXT scenario for new hires, and ENTER does not start a route day for
    someone who has played nothing; hub labels and 13 px minimum text; US English pass; category order, tip, fitted
    confirms, capitalized names. All SHELL findings in the package marked.
  - **Also fixed:**
    - In the heat stop, the water and the AC could not be used from inside the van. The courier cannot stand
      further back than the door − 40, and both spots were behind the shelves, which E always chose. They are now
      one "Water and AC" spot at the back of the doorway that asks which (1 / 2), and the intro says so; the stop
      helper (`test/paths/lib/stop.js`) uses it.
    - ESC on the van's shelves overlay (not an `OTR.ui.modal`) briefly opened the pause menu. Only the how-to card
      lets ESC through now.
    - The focus ring's hide path called a method a live shape does not have.
  - **Tests:** full suite on the WP8 snapshot: 24 of 28 clean. Content validation (`?dev=1`) clean.
    - m1-pretrip and route-day failed on a real bug: the "Under the truck" checkpoint sat under the "Climb into the
      cab" button. Fixed; both pass.
    - m8-heat failed because at about 12 fps the courier coasts past the shelves into the new water spot. The
      helper now steps back, as a trainee would; it passes.
    - m8-dog failed once under load and passed on its own.
  - **Note:** `test/paths/route-day.js` now confirms the pause-menu Restart (the new dialog); nothing it checks
    changed. Several profiles per browser and a printable training record are left out (SHELL-14).

- **2026-09-24, WP9 (verification and report).**
  - **Done:**
    - The owner's two examples were re-checked by hand with the play tool. In the van, holding D keeps the courier in
      the doorway. The door prompts show while walking up.
    - `node --check` passes on all 97 source files, and content validation (`?dev=1`) is clean.
    - `docs/QA-REPORT.md` has a "Second pass" section: what the testers found, what changed, the Intel fps table
      (before, and the renderer settings' A/B; the shipped build's column is to be measured on the owner's laptop),
      what was decided against, and six before/after pairs in `docs/qa2/`.
    - `HANDOFF.md` is marked finished.
  - **Tests:** final full suite (`--shots`) on the finished build (code at 4d06caf): 28 of 28 clean.
  - **Removed:** `_baseline-pass2/` (the pre-fix snapshot). The last commit that has it is 3c9feb1.
  - **On the owner's laptop, 25 September:** `QA_GPU=default` and `QA_FPS_FLOOR=60` with
    `node test/qa.js --pass boot`, on the Intel UHD Graphics. It passed 28 of 28, with every scenario at 131–145 fps.
    The lowest were m6-load at 131 and m8-heat at 133. The Intel table in the QA report is filled in. A run on the
    laptop's gaming GPU was dropped, since trainees use office computers.

- **2026-09-25, after the owner's play test.**
  - **Owner's reports, fixed:**
    - On a route day the van shelves now hold the day's load. Each piece still on board is on the shelf it was loaded
      onto. Before, each stop invented its own three packages.
    - At a route-day business, "Talk to reception" now greets you and the delivery is recorded on the handheld. It
      used to do nothing.
  - **Decided-against items fixed on review:**
    - The van no longer cools the courier without the AC.
    - Box labels are on two lines.
    - The staging now matches the narration in m4-damaged and m3-twostops.
    - Of the 26 "fixed (decision)" statuses, only DIALOGUE-6 still hid unfinished work, and that is now done.
  - **The testers' untested areas (the "Revisit" sections):** every item was played or read. What was fixed and
    what was found already right is in the QA report's "What the testers didn't get to".
  - **Tests:**
    - The route-day path fails if "Talk to reception" does nothing, or if the van shelves don't hold the load still
      on board.
    - It reads the drive's opening card.
    - The stop helper reports what kept a stop from settling.
    - Final full suite (code at 555db69): 28 of 28.
  - **Note:** m8-dog failed twice in full runs under load ("the stop never settled"), and passed every time on its
    own and in the final run. If it fails again, the new message names what held the stop.

- **2026-09-25, the owner's second play test.** Details are in the QA report's "The owner's second play test".
  - **Messages** stay up long enough to read.
  - **Pre-trip close-ups** show their faults (brake press, wiper, tire gash, step grease), so a sound
    inspection no longer reads as "missed".
  - **Stop signs:** a stop counts after half a second still behind the line, and answers green. Rolling over the
    line above 1 mph, or into the junction without stopping, is a violation. The test autopilot holds its stops
    0.9 s.
  - **Curbs:** rounded 4 m kerb corners. Climbing the kerb jolts the van, and is the violation at once.
  - **POD photos:** package and door; never a house number (plaque or mailbox) or a person.
  - **Icy steps and clutter:** a hurried step wobbles and warns before it becomes a fall.
  - **Tests:** the stop helper frames photos below the house number and waits up to 30 s for a stop to settle (m8-dog
    at 14 fps under load needed more than 15 s). It also frames the photo clear of the courier. The test autopilot's
    stop is now one continuous wait: it used to add two short stops together, which the stricter stop sign
    rightly refused.
  - **Final full suite (code at 3e5248e):** 28 of 28.

- **2026-10-02, the feature backlog and the rebrand.** Details are in the QA report's "Third pass".
  - **Built:** every item in `docs/FEATURE-BACKLOG.md` except package lockers and a hill/wheel-chock step (the town
    is flat). Several trainee profiles per PC was replaced by company sign-in with saved progress, as the owner asked.
  - **Fixed:** Put It Right's recommended answers were always the longest.
  - **Rebrand:** the FedEx name and FedEx service names are gone; `brand` in `data/config.js` is empty.
  - **Tests:** four feature tests (`enterprise`, `academy`, `driving`, `routeday`). The doorstep path knocks before a
    no-answer exception after a conversation; the driving test's stop-sign roll waits for the van to pass the line;
    `QA_ROUTE_FROM` splits `route-legs`.
  - **Final runs:** the feature build (33f405d): all 27 scenarios, the four flows (route legs in three parts) and the
    four feature tests, clean. The rebrand (efc7731): the targeted checks and screenshots, clean. Both merged to `main`.
