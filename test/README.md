# QA suite

Automated checks for On The Route. They drive the real game in a headless browser, the way a trainee
would, and fail loudly when something breaks. Nothing in `test/` ships with the game.

## Running it

```
cd test
npm install            # once: installs puppeteer-core (it uses the Edge or Chrome already on the machine)
cd ..
node test/qa.js        # every pass, every scenario and flow (about 45 minutes)
```

The suite serves the project itself on port 8123, so nothing else needs to be running. The exit code is non-zero if
anything failed, so it can gate a release.

**Every other suite, one command:** `node test/run-all.js` runs every Node suite in `test/` (it lists the folder, so a
new suite is included without editing anything); `--browser` adds the browser suites. It serves the game itself on a
free port (`QA_BASE`), finds the installed Chromium (`QA_BROWSER`), runs suites that open a page one at a time, and
prints one pass/fail table; logs go to `test/out/run-all/`. Name words to run some of them: `node test/run-all.js fpnav`.
`node test/run-all.js --review <branch>` merges a branch into pilot in a scratch worktree and runs the review's first
steps (every Node suite, the text to translate, the five workday flows at Low).
`node test/run-all.js --list` prints every suite with how it runs and what it covers; `--readme` rewrites the table
at the end of this file ("Every suite"), so run it when you add a suite.

The 3D model checks include `node test/fpdoors.js`: generated doorstep requirements, signatures, photo-ID decisions, wrong-address exceptions, physical gates/residents, customer responses, path hazards and optional checkpoints. With the game served on `QA_BASE` (default `http://127.0.0.1:8302`), `node test/fpdoorsbrowser.js` exercises real gate raycasts, signature completion/cancellation, ID panels, handheld outcomes and Shift walking in English/Tamil at both text sizes. `test/fproutebrowser.js` completes the five-stop route with those required checks before each delivery. These position fixtures skip the long walks and drives. The doorstep suite also writes `test/out/fp-review/c9-seeded-ui.json`: 16 seeded runs in English and larger Tamil use real keyboard choices, a physical doorstep barcode scan/contact, all five photo-ID variants, wrong-label retention, a customer handover and E to clear a movable path hazard. Fixture setup supplies the held parcel and skips travel; the UI actions and reports are exercised normally. Layout checks include body/choice overlap and exclude transparent button-art padding.

| Option | Effect |
| --- | --- |
| `--only m6-find,m7-dg` | just those scenarios |
| `--pass boot,layout` | just those passes (`boot`, `layout`, `play`, `golden`) |
| `--shots` | also save screenshots to `test/out/` (boot, after random play, and any the golden path takes) |
| `--headful` | show the browser while it runs |
| `QA_PORT=8125` | serve on another port (to run two suites side by side) |
| `QA_FPS_FLOOR=100` | the frame rate a scene must hold (default 100) |
| `QA_LANG=es` | play everything in that language: the layout audit then checks the translated text fits its boxes, and the golden paths find buttons by their English (see below) |
| `QA_GPU=default` | let the OS pick the GPU. By default the suite asks for the high-performance one, so on a laptop with two GPUs the floor always measures the same hardware (Windows may otherwise hand the browser either, from one day to the next). The first line of every run names the GPU it measured on. With `default` on a laptop it is usually the integrated GPU, which is the way to see what a trainee's laptop gets; expect the floor to fail there (see the QA report) |

## The passes

| Pass | What it checks |
| --- | --- |
| **boot** | the scenario loads, its intro dismisses, the expected scene is live, nothing throws, and the frame rate is above the floor |
| **layout** | walks the live display list: UI outside the 1280×720 canvas, text wider than its wrap box, hit areas the player can never reach |
| **play** | twelve seconds of randomised but plausible mouse and keyboard input (fixed seed, so it repeats): nothing throws and the scene survives |
| **golden** | a scripted playthrough, `test/paths/<id>.js`. It must finish the scenario and report a result that scores every category the scenario declares. Each path also asserts what a perfect run should earn (usually full marks) |

Any uncaught page error or `console.error` during a scenario fails it, and so does a warning the game raises for
broken content: a failed content check (`[OTR data]`, which includes the town layout), or a conversation or stop
pointing at something that does not exist (`[talk]`, `[stop]`).

### Flows

Four entries are *flows* rather than scenarios: they start on the title screen (`index.html?dev=1`) and only run
the golden pass, auditing the layout at the moments they care about.

- **`route-day`** plays a whole day as a new courier: name entry, the hub, the morning briefing, the pre-trip and
  the load (by their own golden paths), five legs of driving with the test autopilot and five doorstep stops, the
  debrief. It checks what only a route day has: Restart from the pause menu keeps the day's route and the route
  stop; a reload half way resumes the day from the hub's "Resume route"; a careful day earns full marks; the day
  rolls over. It prints anything that scored short of full marks, and takes about twenty minutes on its own.
- **`route-legs`** drives every leg of the first ten route days (`QA_ROUTE_DAYS` to change it) with the autopilot,
  stepping the game frame by frame so it takes about three minutes. Every stop the route generator produces must be
  reached with no violation and parked neatly. It is the check for changes to the town, the generator or the van.
- **`town-traffic`** leaves four towns (`QA_TRAFFIC_SEEDS`) running for four minutes each (`QA_TRAFFIC_MIN`) with no
  player, stepped frame by frame so it takes about two minutes, and checks every frame that no two cars overlap,
  none leaves the asphalt, drives into a building or takes the wrong lane, none stands still for more than half a
  minute, nobody is left standing in a traffic lane, and the two streets of a traffic light are never both let
  through and each gets a real share of the green. It is the check for changes to the traffic model.
- The 2D flows (route-day, route-legs, hub-briefs and so on) start with `?workday3d=0`, because the hub now offers the 3D workday first (the 2D route day is the link under it).
- **`workday-3d`** (started with `?workday3d=1`) plays the full-length 3D workday from the hub as a new courier: "Start workday", the morning brief at Dispatch, loading the van with the real pickup, scanner and shelf interactions for all five parcels, the pre-trip, the start of the first leg on throttle and brake through a junction stop line, then parking and, at each of the five stops, the doorstep situation of that day (a loose dog and the gate, the photo ID, the signature, a difficult customer, a wrong label, each handled through the real panels and handheld menus) and the delivery outcome it calls for (position fixtures, taken from the generated route in the model, skip the walking and the long drives between tasks), the Returns scan when the day has a retained parcel, "Finish workday", then the results screen, the debrief and the record. The layout audit runs at each screen, including the 3D prototype's own text and the handheld's screen. Run it also with `QA_LANG=ta` (or `hi`, `ml`) and `QA_A11Y=large,colour` to check translated and large text. It takes a few minutes in software rendering.
- **`hub-briefs`** opens every scenario's brief from the hub, as a trainee does, and fails if its text runs into the
  star ratings or the buttons, or it does not fit on screen.
- **`academy-screens`** plays the academy's own screens with the mouse and keys: a trainer chooses a PIN, changes the
  rules and saves (a wrong PIN is refused next time); the trainee turns on larger text, moves a key and checks it
  reaches the game, passes a quiz, passes an assessment from its brief, and finds both on the record (three tabs,
  Print / PDF).
- **`drive-review`** drives Road Hazards from the hub without the seatbelt, then opens Results → Drive map: the pin,
  the named mistake, its lesson, and Back to the same results.
- **`certificate`** sets up a trainee with 26 of 27 assessments passed (and the 27th left part-way): no certificate.
  They pass the last one through its brief, and the record then offers the certificate, which must name them, say
  27 of 27 and the date.
- **`van-traffic`** puts the van where trainees leave it (stopped in a lane, across one, in a junction, over a stop
  line, on the wrong side, at the curb, and 24 random spots and angles) and sends traffic at it, stepping frame by
  frame: no car may drive into the van, a braked van may not be shoved, and a car stuck behind a van in its lane goes
  round it.
- **`drive-fuzz`** drives badly on purpose: seeded random input on every key, minutes at a time, in three towns with
  traffic. Nothing may throw, the van stays finite and on the map, no car drives into it, no car is stuck for good.

The long town flows (`route-legs`, `town-traffic`, `van-traffic`, `drive-fuzz`) step the drive's own logic without
drawing every frame, so they run many times faster on a machine without a GPU.

`node test/art.js` checks the image pipeline (packing, the game drawing images in place of its drawn art, `?art=drawn`).

`node test/town3d.js` checks the town's Phase 2 graphics: the fake-3D buildings (and that the low graphics setting
leaves them flat), the light map after dark and the headlights, weather on the ground, people on the sidewalks (and
that driving into one is caught), and the cab view (V).

`test/tools/drive-session.js <outDir>` records a Road Hazards drive with the traffic live (screenshots and a log of
violations and contacts), for reviewing the driving by eye.

## Golden paths

`test/paths/<scenario id>.js` exports `async (page, ctx) => {}`. It plays the scenario with the real mouse and keys
and throws if anything is wrong. `ctx` gives it:

| | |
| --- | --- |
| `ctx.wait(ms)` | pause |
| `ctx.eval(expr)` | evaluate an expression in the page |
| `ctx.until(expr, ms)` | poll an expression until it is truthy (returns false on timeout) |
| `ctx.snap(name)` | save `test/out/<id>-<name>.png` |
| `ctx.audit(label)` | run the layout audit on whatever is on screen now (flows use it at each stage) |
| `ctx.reload()` | reload the page, keeping the saved profile, and carry on recording the result |

Shared helpers live in `test/paths/lib/`:

| File | For |
| --- | --- |
| `ui.js` | `clickText` (click whatever says something, top-most first) and `runTalk` (play a conversation on its recommended answers with the keyboard) |
| `dialogue.js` | the whole conversation scenarios (Modules 3 and 4, the fender-bender) |
| `stop.js` | the doorstep stop sets (Modules 5 and 8): shelves, handheld, hazards, doors, photo POD, exceptions, heat. `driver(page, ctx)` plays single stops for the route day |
| `pickup.js` | the three pickup scenarios (Module 7) |
| `autodrive.browser.js` | a test autopilot injected into the page for the driving drill and the route day. It presses the same keys a trainee does, so it exercises the real vehicle model and every traffic rule: it plans a legal route, stops at every line, waits for green, and pulls in parallel to the kerb |

Golden paths read the game's own data to know the right answer (which package, which exception code), but they
never set game state: every action goes through the same input a trainee uses. A path reads a label's words as
`(o.srcText ?? o.text)`: `srcText` is the English the game set, so the same path plays in any language.

## Playing by hand: `tools/playd.js`

The suite plays the ideal path. To play the way a person does (and find what a person finds), `tools/playd.js`
keeps one game open in a headless browser and takes commands over HTTP: hold a key, click, drag, take a screenshot
and look at it, read every text on screen, ask the walkable stage what E would do and which prompt is showing.

```
node test/tools/playd.js --port 9301 --out test/out/review/me
curl -s "localhost:9301/open?url=index.html%3Fscenario%3Dm5-pod%26dev%3D1"
curl -s "localhost:9301/hold?key=KeyD&ms=400"
curl -s "localhost:9301/shot?name=after-walk"
curl -s "localhost:9301/stage"
```

It is turn-based unless started with `--realtime`: the game only runs while a command acts, so a tester can think
between moves without timers running on. The comment at the top of the file lists every command. It was built for
the second, human-style review; the brief its testers followed is `docs/review/BRIEF.md`.

## Adding a scenario

1. Register it in `data/modules.js` as usual.
2. Add it to `SCENARIOS` in `test/qa.js` with the scene key it should boot into.
3. Write `test/paths/<id>.js` (or point it at a shared helper in `lib/`).
4. `node test/qa.js --only <id> --shots` and look at the screenshots.

Content validation runs separately from the suite: open `index.html?dev=1` and check the console, or call
`OTR.debug.validate()`.

## Every suite

Written by `node test/run-all.js --readme`.

<!-- suites -->
| Suite | How `run-all` runs it | What it covers |
| --- | --- | --- |
| `a11y-screens.js` | browser (--browser) | The screens no scenario reaches, with larger text and the color filter on (Settings → Accessibility): results after a drive with mistakes, the drive map, the… |
| `academy.js` | opens a page | Academy rules, assessments, trainer tools and the trainee record (src/core/academy.js, src/core/record.js, TrainerScene, RecordScene). |
| `aids.js` | Node | The trainer's 3D workday aids (board task A-21, src/core/academy.js): defaults, what a saved setting may hold, and what the 3D world gets for each workday nu… |
| `art.js` | opens a page | The image pipeline (src/core/assets.js, test/tools/pack-art.js): images in assets/img/ are packed, and the game draws them in place of the drawn art, at the … |
| `assets.js` | Node | The 3D asset rules in docs/ASSETS.md (assets/3d/; the 2D art in assets/img has its own pipeline): every shipped file is listed in assets/3d/manifest.json wit… |
| `auth.js` | Node | Employee ID and password sign-in (server/auth.js, and its API in server/server.js), in Node with no browser. |
| `credits.js` | Node | The asset credits (board task B-28): data/credits.js and docs/ASSETS.md list every pack in assets/3d/manifest.json with its author, a CC0 licence and where i… |
| `data.js` | Node | Trainee data on the training server (docs/DATA.md): a trainer can download everything held about one trainee and can erase all of it (progress, every backup,… |
| `devdaybrowser.js` | browser (--browser) | The owner's review links. |
| `drivemapbrowser.js` | browser (--browser) | The 3D workday's drive map with every kind of milestone 8 mistake on it (road signs, a red light, a wrong turn, a cyclist, damage, a low bridge, a shifted lo… |
| `driving.js` | opens a page | The driving rules added with the drive aids (src/scenes/shift/driveAids.js) and the stop-sign rules, checked in the town lab (index.html?lab=town) with the v… |
| `englishtext.js` | Node | No browser check compares on-screen text with English. |
| `enterprise.js` | opens a page | Enterprise sign-in and progress storage (src/core/identity.js, src/core/save.js, server/server.js). |
| `firstperson.js` | Node | Renderer-free prototype checks. |
| `fpaccess.js` | Node | Keyboard aim, physical target selection and persisted comfort preferences. |
| `fpaccessbrowser.js` | browser (--browser) | Keyboard-only route. |
| `fpaccesslayout.js` | browser (--browser) | 3D layouts: QA_LANGS accepts language codes; QA_FONT=noto selects installed script-specific review fonts. |
| `fpactors.js` | Node | Real rigs, ordinary animated geometry, physical targets, fallback and state ownership. |
| `fpactorsbrowser.js` | browser (--browser) | Rendered actor/door proof and real-key interaction. |
| `fpambient.js` | Node | Ambient presentation cannot occupy trainee paths or change the mission. |
| `fpambientassets.js` | Node | Uploaded ambient rigs retain their source palette, independent poses and strict fallback guards. |
| `fpambientbrowser.js` | browser (--browser) | Native people pixels, source/fallback choices and accessible ordinary-route presentation. |
| `fpambientworld.js` | Node | Ambient people use actual town bounds and preserve physical access, reflection state and source ownership. |
| `fpassets.js` | Node | (first test) the real vendored loader selects Low and High and parses the bundled CC0 variants |
| `fpassetsbrowser.js` | browser (--browser) | Actual local loader, rendered variants, failure recovery, restart ownership and loading layouts. |
| `fpbench.js` | own command | Unmodified ?bench=1 plus raw-frame samples of the first-person prototype. |
| `fpbranding.js` | Node | Theme values, world materials and moving/facing company labels without a GPU. |
| `fpbrandingbrowser.js` | browser (--browser) | Two complete company skins, one bounded local logo, and real screen pixels. |
| `fpbriefbrowser.js` | browser (--browser) | Dispatch-only layout and workflow audit; uses the actual game, at both text sizes. |
| `fpbrowser.js` | browser (--browser) | Browser integration: real keys/scans/raycasts; position fixtures skip repetitive walking between tasks. |
| `fpcab.js` | Node | Physical cab, safe drivetrain selection, scoring identity and legacy checkpoint compatibility. |
| `fpcabbrowser.js` | browser (--browser) | Real keyboard target selection and action keys, including larger/Tamil layouts and a saved-control reload. |
| `fpcamera.js` | Node | (first test) the driver sits behind the controls with a wider cab lens without touching saved mission state |
| `fpcamerabrowser.js` | browser (--browser) | Real-key camera feel, physical dashboard anchoring, accessibility and approved trainer rules on resume. |
| `fpcontext.js` | Node | Lifecycle tests use the actual mission state and owned scene input handlers; browser coverage forces real GL loss. |
| `fpcontextbrowser.js` | browser (--browser) | Forced shared-context loss while real keyboard input drives the actual motor. |
| `fpcontextkeyboardbrowser.js` | browser (--browser) | A real remapping prompt must freeze, and native Enter must still activate the fallback Reload button. |
| `fpcontextrecoverybrowser.js` | browser (--browser) | Actual GL loss through loading, moving cab, menus, scanning and restart. |
| `fpdamage.js` | Node | Damage state, approved report vocabulary and future checkpoint contract. |
| `fpdamageassets.js` | Node | Damage placement against the shipped van meshes, including their unsprung wheels. |
| `fpdamagebrowser.js` | browser (--browser) | Real scene launch, keyboard height reminder, motor contact, reports and recovery. |
| `fpdamageflow.js` | Node | Actual motor contacts, original days, owned mission restore and trainer rules. |
| `fpdamagereversebrowser.js` | browser (--browser) | Reverse-facing clearance caption/narration and live camera; the approach pose is a fixture. |
| `fpdamageworld.js` | Node | Located geometry, real mission state and mirror-buffer restoration without WebGL. |
| `fpday.js` | Node | Day-specific physics, dispatch actions and compatibility without a browser. |
| `fpdaybrowser.js` | browser (--browser) | Weather rendering and the actual safe handheld/updated-delivery workflow. |
| `fpdoors.js` | Node | Real doorstep requirements, choices, physical barriers and optional checkpoints. |
| `fpdoorsbrowser.js` | browser (--browser) | Doorstep UI, real raycasts, signature completion/cancellation and safe outcomes. |
| `fpdrivebrowser.js` | browser (--browser) | Driving HUD: actual Phaser layout, English/Tamil and both accessibility text sizes. |
| `fpdriving.js` | Node | Live driving observations, hazard outcomes and checkpoint continuity. |
| `fpdrivingbrowser.js` | browser (--browser) | Real hazard meshes, walk/cab interactions and readable safety prompts. |
| `fpdynamicsbrowser.js` | browser (--browser) | Real keyboard driving, a recorded manoeuvre, and rendered suspension. |
| `fpfurniturebrowser.js` | browser (--browser) | Actual uploaded desk pixels and original station actions. |
| `fpfuzzbrowser.js` | browser (--browser) | A 3D fuzz run. |
| `fpgamepad.js` | Node | Fake-pad lifecycle and analogue input checks; this slice is not yet scene-loaded. |
| `fpgamepadaffinity.js` | Node | A connected driver's controller must keep ownership when a lower-index device appears during a menu. |
| `fpgamepadaffinitybrowser.js` | browser (--browser) | Real menus with two fake browser Gamepads: connected driver ownership must survive context changes. |
| `fpgamepadbrowser.js` | browser (--browser) | Actual scene/motor/cab/menu integration through a fake browser Gamepad API. |
| `fpgamepadcapture.js` | Node | (first test) entry held inputs cannot bind; an unassigned button binds only on complete release |
| `fpgamepadmenubrowser.js` | browser (--browser) | Focused menu resource samples. |
| `fpgamepadprefs.js` | Node | Persistent user choices, bounded overrides and reset without touching keyboard settings or pad identity. |
| `fpgamepadremapbrowser.js` | browser (--browser) | Real controls-screen navigation and raw Gamepad API gestures. |
| `fpgamepadscene.js` | Node | Scene-local fake-pad integration, original cab/action guards and real motor checks. |
| `fpguide.js` | Node | First-time guidance state, saved migrations and hints that do not change the mission. |
| `fpguidebrowser.js` | browser (--browser) | Real keys through first-morning help, every guide page, blocked actions and a reload. |
| `fphandheld.js` | Node | Handheld/controller workflow tests. |
| `fphandheldbrowser.js` | browser (--browser) | Translated delivery choices and the independent Back control must remain usable. |
| `fphooksbrowser.js` | browser (--browser) | Real 3D scene lifecycle through the shared workday API; completion uses a finished mission fixture. |
| `fphud.js` | Node | Display lifetime and destinations must never become mission or scoring state. |
| `fphudbrowser.js` | browser (--browser) | Compact live display, real keyboard controls, and translated/larger layouts. |
| `fphudcomparebrowser.js` | own command | Capture the same live, stationary fixture before/after C-47. |
| `fpkeysbrowser.js` | browser (--browser) | The 3D workday's menus from the keyboard alone, as B-62 does for the trainer's dialogs. |
| `fplangsbrowser.js` | browser (--browser) | Milestone 7's cab in every language (board task A-22): the physical cab's control hints, the mirror hints, the automatic rear camera, the dusk and night head… |
| `fplater.js` | Node | Later-day difficulty, physical detours, practice windows and save compatibility without WebGL. |
| `fplighting.js` | Node | Lighting follows the saved clock, respects trainer rules, keeps controls live and never changes scoring. |
| `fplightingbrowser.js` | browser (--browser) | Real GL pixels, physical headlight shortcut, four saved presets and accessible captions. |
| `fploadout.js` | Node | (first test) seeded discrepancies are stable, optional on old saves and excluded from cargo practice |
| `fploadoutbrowser.js` | browser (--browser) | Physical unlisted-package scan and Dispatch load-check UI, both text sizes and languages. |
| `fpmaterials.js` | Node | Uploaded surface sources: High selects them, Low never requests them, failures stay local. |
| `fpmaterialsbrowser.js` | browser (--browser) | Native decoded surface pixels on actual roads, lawns, paths and facades; review camera poses are fixtures. |
| `fpmirrors.js` | Node | Gaze evidence, manoeuvre keys, checkpoint continuity and the bounded reflection scheduler. |
| `fpmirrorsbrowser.js` | browser (--browser) | Live reflected geometry, gaze-only reporting, keyboard access and saved dwell in the real shared GL context. |
| `fpmission.js` | Node | Mission/restore checks run without a browser, canvas or generated artwork. |
| `fpnarration.js` | Node | Cab speech scheduling, ownership and distance bands, with a deterministic speech clock. |
| `fpnarrationbrowser.js` | browser (--browser) | Real P/actions/gaze and a four-second reverse, based on Claude's cab probe. |
| `fpnav.js` | Node | Road paths use real generated towns, restrictions and checkpoint versions, without a renderer. |
| `fpnavbrowser.js` | browser (--browser) | Physical dash navigation, trainer aids and real remapped camera/control keys. |
| `fpnightworld.js` | Node | Night visibility and glare use the existing fog and windscreen; reset and reduced-motion paths stay bounded. |
| `fpperf.js` | Node | Rendering batches keep physical occlusion and update their static buffers only when needed. |
| `fpperfbrowser.js` | own command | Compare frozen frames with an untouched pilot served at QA_BEFORE_BASE. |
| `fpquality.js` | own command | Fixed milestone-eight review gate. |
| `fpqualitygate.js` | Node | Guard against mislabeled/stale fixtures and false quality passes. |
| `fpradio.js` | Node | Dispatch route changes, additional check-in stops and honest checkpoint/report boundaries. |
| `fpradiobrowser.js` | browser (--browser) | Native remapped handheld responses, sat-nav changes, captions and night controls. |
| `fprear.js` | Node | Rear-camera contract, real obstacle sensing, practice isolation and bounded rendering. |
| `fprearbrowser.js` | browser (--browser) | Real keys through reversing practice, live rear pixels, saved manoeuvres and accessible layouts. |
| `fpreplay.js` | Node | Ten-second memory clips: real report definitions, timing, interpolation, isolation and bounded storage. |
| `fpreplaybrowser.js` | browser (--browser) | Actual workday finish -> results/map -> detached replay, remapped keyboard, accessibility and resource guards. |
| `fpreplayworld.js` | Node | Detached replay with the real mission checkpoint and CPU world; no WebGL pixels or frame-rate claim. |
| `fpresume.js` | Node | Seeded model journeys. |
| `fproute.js` | Node | Full-route identity, save compatibility and physical access, without WebGL. |
| `fproutebrowser.js` | browser (--browser) | Generated workday: physical raycasts/scans at all five stops; fixtures skip long walks/drives. |
| `fpsignal.js` | Node | Real physical indicator, maneuver, report and checkpoint integration; no score calculation here. |
| `fpsignalbrowser.js` | browser (--browser) | Real remapped cab stalk, game-time lead, driving keys and checkpoint reload; travel poses are fixtures. |
| `fpsignlayoutbrowser.js` | browser (--browser) | Real sign-label placement and straight-ahead cab sight lines, in native languages and text sizes. |
| `fpsignlettering.js` | Node | Physical face contents, exact address packing, bounded atlas ownership and the retained explicit reading. |
| `fpsignletteringbrowser.js` | browser (--browser) | Actual face pixels on all lettered signs, with the material pack present and absent. |
| `fpsigns.js` | Node | Sign data must agree with generated routes and the 3D stop obligations. |
| `fpsignsbrowser.js` | browser (--browser) | Rendered sign geometry, bounded text, real reading keys and modal visibility. |
| `fpsound.js` | Node | Sound is bounded, quiet before interaction, optional, captioned and independent from scoring. |
| `fpsoundbrowser.js` | browser (--browser) | Real AudioContext output, narration ducking, Settings keys and repeated scene cleanup. |
| `fpstopbrowser.js` | browser (--browser) | Physical richer-stop targets, real remapped keys, scanner/signature and readable layouts. |
| `fpstopflow.js` | Node | Generated-stop integration: real mission guards, retained parcels, reports and restores. |
| `fpstoplocker.js` | Node | Live locker authorisation: real scene plans, unchanged non-locker obligations, delivery and restore. |
| `fpstops.js` | Node | Richer delivery choices, including unsafe order, recovery and mid-stop resumes. |
| `fpstopscene.js` | Node | CPU world checks for physical richer-stop props, occlusion, custody and reflection buffers. |
| `fptown.js` | Node | Town asset placement, fallback, physical access and reflection ownership without WebGL. |
| `fptownbrowser.js` | browser (--browser) | Rendered town templates, fallback comparison, original mission identity and clean WebGL. |
| `fptraffic.js` | Node | Traffic safety decisions, independent of rendering and scoring. |
| `fptrafficbrowser.js` | browser (--browser) | Physical signal readings, real keys, narration, and bounded road actors. |
| `fpwalkaround.js` | Node | Existing/new damage records, honest reporting, phase boundaries and exact bounded restores. |
| `fpwalkaroundbrowser.js` | browser (--browser) | Real remapped keyboard targets, handheld descriptions, checkpoints and report boundaries. |
| `fpwalkaroundflow.js` | Node | Real mission phases, physical proximity, contract reports and strict walkaround checkpoints. |
| `fpwalkaroundworld.js` | Node | Physical walkaround proxies follow Low, High and missing-model van surfaces. |
| `fpweather.js` | Node | (first test) wipers clear the glass through the saved physical control without changing scoring or mission time |
| `fpweatherbrowser.js` | browser (--browser) | Real wiper input, visible rain clearing, a physical pane and no extra reflection pass. |
| `fpworld.js` | Node | CPU geometry and scene-state checks. |
| `glossary.js` | Node | One word for one thing. |
| `hubkeysbrowser.js` | browser (--browser) | The hub and the record from the keyboard alone, as B-62 and B-72 do for the trainer's dialogs and the 3D menus. |
| `i18n.js` | Node | The translations (data/i18n/<lang>.js), checked without a browser: - the file loads, and every template's holes are ones its English has ({n} and {n:plural\|s… |
| `i18nnumbers.js` | Node | Every number in an English line is in its translation, in every language: a speed, a distance, an age or a time that changes in translation teaches the wrong… |
| `lmsreport.js` | Node | The 3D workday as the LMS sees it (SCORM 1.2 and 2004): a full day that reports every type in the catalogue fits the 4096 characters of suspend data and scor… |
| `lowparitybrowser.js` | browser (--browser) | Low-graphics parity for milestone 9. |
| `offline.js` | opens a page | The game with no internet: every request to anything but the training server is blocked (and the browser's name lookups fail), then a new courier signs in, r… |
| `oldsave.js` | Node | A save from before milestones 7 and 8 still works (B-41): no town seed, no aids code, no criticals by type, no `route.passed`, workday records as they were. |
| `onepagebrowser.js` | browser (--browser) | The trainer's quick start fits one A4 page in every language, and docs/print/ has the current sheets (test/tools/onepage.js --check). |
| `package.js` | Node | The LMS package (test/tools/package-scorm.js): only run-time files, the manifest at the top, every file a page loads, no tests, docs, server or raw downloads… |
| `pickupkeysbrowser.js` | browser (--browser) | The three pickups of module 7 with the keyboard alone. |
| `pretripkeysbrowser.js` | browser (--browser) | The pre-trip walkaround (module 1) with the keyboard alone. |
| `printbrowser.js` | browser (--browser) | The printed pages with milestone 8 mistakes on them, in each language: the trainee's record (Print / PDF), the certificate and the trainer's before-and-after… |
| `qa.js` | own command | QA suite for On The Route. |
| `quickstart.js` | Node | The trainer's quick start names the game's own keys. |
| `radionightbrowser.js` | browser (--browser) | C-36's radio message and night warning in every language with larger text (Codex checked English and Tamil). |
| `report.js` | Node | The before-and-after report (server/report.js, src/core/pilotreport.js, GET api/report/before-after): each trainee's first and latest workday side by side an… |
| `reviewsheet.js` | Node | The native reviewers' sheets (docs/review/<lang>-safety.csv) read the way a spreadsheet reads them. |
| `routeday.js` | opens a page | Route-day features around the stops (src/core/shift.js, driveAids, TownDriveScene, PostTripScene): - the bad-weather gear question after the briefing, and wh… |
| `routekeysbrowser.js` | browser (--browser) | The route planner (module 1) and Find It Fast (module 6) with the keyboard alone, as B-79 does for the pre-trip. |
| `savesize.js` | Node | SCORM 1.2's 4096 characters of suspend data (src/core/save.js, fit): a long workday on top of a heavy save must always be stored within the limit, reload to … |
| `scorm-launch-2004.js` | opens a page | The SCORM 2004 package, the pilot's default, launched in its own LMS frame on every run: test/scorm-launch.js with --2004 (the 1.2 package is test/scorm-laun… |
| `scorm-launch.js` | opens a page | The LMS package launched as an LMS launches it (board task B-40): the SCORM 1.2 zip from test/tools/package-scorm.js, unpacked and opened inside a player pag… |
| `signin.js` | opens a page | The sign-in screen (src/core/signin.js) on a training server with employee accounts, in a real browser. |
| `town3d.js` | opens a page | Phase 2 graphics in the town drive (index.html?lab=town), checked by script: - the fake-3D town (src/core/b3d.js): walls are drawn, roofs lean away from the … |
| `trainerkeysbrowser.js` | browser (--browser) | The trainer's dialogs from the keyboard alone. |
| `workday.js` | Node | The 3D workday's report contract (src/core/workday.js, data/workday_events.js). |
| `workdayflow.js` | opens a page | The 3D workday's flow, without the 3D world: the hub starts a workday, a stand-in scene sends the reports the 3D world would (OTR.workday.report) and finishe… |
| `xapi.js` | Node | XAPI for a company's learning record store (server/xapi.js): a finished workday becomes statements (the day, then each stop) posted by the training server; t… |
<!-- /suites -->
