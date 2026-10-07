# First-person courier conversion

Branch: `codex-first-person`, starting from published main at `b41026191ca3af0341af3603142271fcefe0b368`.

The target is a complete first-person courier game. Every playable module takes place in a consistent 3D environment with shared movement, interactions and art direction. Full work days are the main game, forming a courier campaign. Individual modules offer focused practice and assessment in the same world and style. Retain the existing sign-in/start scaffold and useful interface controls; the user proposes a walkable 3D hub for selecting modules and starting the day.

## Current connected prototype — October 7, 2026

This branch now implements the next small playable slice: **hub → depot preparation and physical loading → three delivery stops → returns → debrief → hub**, plus an isolated cargo practice activity. The former one-parcel demo is historical; use the instructions in this section for the current build. This remains a prototype for manual review, not a replacement for the released course or a completed 30–45 minute campaign day. The smaller slice targets roughly 10–15 minutes; actual play duration has not been measured.

### Open and play

Download the `codex-first-person` branch ZIP, extract it completely, then open **`first-person.html`** in a desktop browser. It redirects to `index.html?lab=firstperson`; the regular `index.html` still opens the existing game. For low quality, open `first-person.html?gfx=low`, or use H → Settings → Low graphics. No installation, build, CDN or web server is required by the game. Local-file launch still needs browser verification for this revision.

1. Read the short introduction, enter the hub, then walk to **Workday** and press E, or press H and choose Start workday. Cargo practice and the last debrief have their own stations and menu choices. Activities fade through black.
2. At the depot, inspect the tyres on the driver's side and the lamps at the front. Choose whether each is serviceable or needs repair. This slice includes one visible defect; an accepted repair is immediate.
3. Approach the three parcels on the table. **F** opens a readable label close-up; **A/D** rotates it, **Space** equips the scanner and **Esc** returns. **E** picks up the physical parcel. **Tab** opens the existing handheld device: choose **Scan package**, aim at the barcode and hold **Space or the left mouse button** briefly. A carried parcel is raised in front of you for scanning. Tab puts the device away. Route and Stop details show addresses, requirements and recorded shelf positions.
4. Open the purple rear cargo doors with E. Carry each parcel inside, aim at one of six shelf pads and press E to place it. Placement is remembered. To put a carried parcel back on its depot table position, stand near that position, look at the table and press E. Aim at the gold restraint near the rear floor and press E to secure the load, step outside, then close the doors.
5. Enter through the blue driver's door. **B** fastens the belt; **M** briefly shows a live left mirror. **Q/C** toggle left/right signals. **Space** toggles the parking brake. **W/S** accelerate/brake, **A/D** steer, **R** selects drive/reverse at a standstill. Steering centres when released; the view follows the vehicle. Mouse look checks the sides; **V** looks forward again.
6. Keep right, observe the 15 mph sign, stop before the first junction line and respond to traffic and the pedestrian crossing. Three addresses are on the right as you drive north. Park beside the road, stop, set the parking brake and press E to exit. Open the cargo doors, locate the actual parcel on its shelf and scan it again at this stop. You can scan a visible shelf label or pick up the parcel first. Depot scans alone cannot complete a delivery. The device warns about a parcel for a different selected stop.
7. At each door, attempt contact and choose **Record on handheld**. Record an outcome matching the shipment requirements: handover, authorised porch-box release, or a recipient-absent exception for the signature parcel. Wrong choices remain possible and are recorded. The similar addresses are deliberate. A retained parcel must be carried back and placed in the van before driving again.
8. Use the turning area at the far end to return south to the depot. Carry retained parcels to **Returns**, press E to equip the scanner and scan the carried barcode to check it back in. Check in at **Dispatch** to finish and read the paged debrief, then return to the hub.

Cargo practice shares the same parcels, shelves, scanner and restraint. Load all three, retrieve the requested parcel, replace it, secure the load and finish at Dispatch. Vehicle entry is blocked in this activity. It has its own checkpoint so practice does not overwrite a suspended workday.

**General controls:** WASD/arrow keys move; mouse looks; E/Enter or a click interacts. If mouse capture is unavailable, hold the left mouse button and drag. H/Esc opens the menu; panels accept clicks, number keys or arrows + Enter. Esc backs out. Focus loss pauses movement. Existing key remaps apply to existing mapped actions; the new F/C/H/V shortcuts are not yet in the main game's remapping editor. Mouse sensitivity can be adjusted in the prototype Settings for the current visit, or set in the URL with `?sensitivity=0.001`.

### Included systems and limits

- Scanner functionality pass after the first manual review: the prototype now reuses `OTR.Handheld` from the existing game, through `src/core/fphandheld.js`. It includes route/stop pages, live barcode aiming and scan feedback, delivery decisions, physical return scans and a parking interlock. Trigger clicks cannot activate a device button behind pointer lock. Menus pause the world; aiming allows walking and looking. Cancellation, focus loss and device closure clear held inputs. Existing saves retain cargo/loading scans; unfinished stops need a new delivery scan. No generated assets or edits to the shared scanner are included.
- Remaining delivery work is substantial: separate physical handover/porch placement from recording, photo/signature/ID proof, richer recipient conversations, door tags and exception codes, realistic door animations and handling, and fuller inspection/vehicle routines. This pass improves the scanner portion of the routine; it does not claim feature parity with the old StopScene or a complete courier simulation.
- Three stable parcel identities with six selectable shelf positions, scanning, carrying, rearrangement, wrong-parcel recovery and physical exception returns. Handheld shelf information comes from the recorded placement. The label close-up is readable Phaser text alongside a rotatable box, not a new image asset.
- A small deterministic service rotation gives each workday one handover, one authorised release and one absent-signature case. The full adaptive encounter/exposure system, responsibility progression, other modules and trainer-controlled assessments remain planned work.
- Two traffic vehicles, a contextual crossing, a stop line, speed/lane checks, belt/load feedback and a left mirror looking at the actual route. Mirror + signal + traffic gap influence pullout feedback. These are prototype heuristics, not validated assessment criteria. Other mirrors, full incident response, detailed handling, proof of delivery, varied pedestrians/weather and realistic vehicle physics remain future work. Traffic/pedestrian contact stops the van and records feedback; it does not yet end a shift.
- Automatic local checkpoints every three active seconds and at actions, pauses, hub transitions and page exit. Cargo, mission choices, actors and event IDs restore; repeated events are deduplicated. Pausing/menus/hub time do not advance the shift. Invalid saves are rejected without crashing. A storage failure appears in the footer.
- Saves use the existing local key with a separate `_firstperson_v2` suffix. They are browser-local prototype state, not LMS/company-cloud progress or official assessment records. `lab=firstperson` retains the existing lab bypass of sign-in. Sign-in/profile migration, official grades and trainer integration must be designed before release. Keep the extracted folder in the same location/browser when resuming; local-file storage behaviour varies by browser.
- Geometry is deliberately simple; no generated/replacement graphics or new binary art. Static details are instanced by material. Low quality reduces main rendering resolution, removes decorative trees and uses a smaller mirror target. Only one mirror renders, and only while requested. No dynamic shadows/postprocessing. Performance has **not** been measured.
- All new words go through `OTR.txt`; the English source inventory is in [FIRST-PERSON-STRINGS.md](FIRST-PERSON-STRINGS.md). Translation files, the language picker and font are unchanged. Existing Language and Main game entries remain available. Complete translation and layout verification are pending.

### Changed files and checks

`src/core/fpmission.js` contains mission/checkpoint logic; `src/core/fpworld.js` contains the shared hub/depot/town geometry and barcode raycasts; `src/core/fphandheld.js` adapts the existing device to first-person tasks; `src/core/world3d.js` owns the main and mirror targets on Phaser's GL context; `src/scenes/FirstPersonScene.js` connects input, menus, tools and transitions. `index.html` adds classic scripts. Original `firstperson.js` motion helpers and its tests remain unchanged. The shared renderer retains its own depth targets and disposes owned resources without losing Phaser's context.

Renderer-free checks for this revision:

| Command/check | Result |
| --- | --- |
| `node test/firstperson.js` | 18/18 passed, exit 0; legacy movement/collision checks |
| `node test/fpmission.js` | 23/23 passed, exit 0; mission outcomes, fresh delivery scans, save migration, invalid saves, traffic, practice boundaries |
| `node test/fpworld.js` | 13/13 passed, exit 0; real Three.js CPU raycasts, barcode face/range/occlusion, carried identity, low-quality scanning, cargo reachability, mirrors, save/transition isolation |
| `node test/fphandheld.js` | 8/8 passed, exit 0; scanner workflow with a stubbed device renderer: continuous trigger/cancellation, wrong-stop alerts, parking interlock, delivery/return recording, pause and practice scope |
| Combined `node --test test/firstperson.js test/fpmission.js test/fpworld.js test/fphandheld.js` | 62 passed, 0 failed, 0 skipped |
| `node --check` on the seven new/changed JavaScript files in the scanner pass | 7/7 passed |
| Script paths/order, protected files, `git diff --check` | All 95 script paths exist; load order passes; protected files unchanged from branch base; no whitespace errors |

During development, the first scanner-pass run returned 28/31 passed and three failures: two old delivery tests omitted the newly required arrival scan, and one expected the removed generic handheld panel. Those tests were updated to exercise the new workflow and the barcode geometry; the final suite above passes. No failing test is being left unresolved.

The bundled Three.js classic build emits its existing deprecation notice during CPU tests. ES modules have not been introduced. Dependency setup: `cd test && npm install` initially failed (exit 1) because the default npm cache was unwritable. Retrying `npm install --cache /tmp/otr-npm-cache` succeeded (exit 0). No dependency/lockfile changes are included.

**Not run:** browser playthrough, `QA_FPS_FLOOR=0 QA_PORT=8300 node qa.js`, `town3d.js`, `art.js`, `driving.js`, Hindi layout checks and high/low benchmarks (average plus worst 1%). The user requested manual review before graphic testing. This branch is ready for that review; source/CPU checks do not certify rendering, HUD fit, browser launch, shared-context lifetime or integrated-GPU performance. After approval, run those checks using ports 8300+, plus the connected prototype's file-launch/resume/transition paths. Stop any owned long-running process by PID. Do not merge to main without explicit permission.

## Campaign and focused modules: product direction

The following sections retain the agreed broader product direction. The current slice implements only the subset described above.

| Mode | Player experience | Available activities |
| --- | --- | --- |
| Campaign work day | A connected shift, from depot preparation through the route and return | Relevant depot duties, inspection, planning, loading, driving, deliveries, pickups, breaks, exceptions and close-out |
| Individual module practice | A focused situation with coaching and repeatable attempts | Actions and equipment relevant to that lesson, in a bounded training area |
| Individual module assessment | The same first-person task, subject to existing trainer rules | Lesson-relevant actions; instructional hints and answer feedback follow assessment settings |

### Campaign day

Use the existing shift phases as the backbone: briefing → depot duties/pre-trip → planning/loading → driving and stops → return/post-trip → debrief. Sorting can appear as an appropriate depot duty rather than being mandatory at the start of every day. Deliveries, pickups and exceptions share the same scanner, package, customer and vehicle systems.

Keep the town's addresses and residents consistent across days. Vary manifests, service requirements, customer circumstances, traffic, weather and dispatch updates. Good preparation should affect the route: load organisation affects finding packages, correct scanning reveals requirements, and route planning affects commitments. Pauses/settings and instruction-reading time must be considered separately from assessed task efficiency.

The user selected **30–45 minutes of real play per complete work day**, including depot preparation and the route. Save/resume should allow that day to be completed over shorter sessions. The game clock represents a longer working shift; the target is not eight hours of real play.

The user selected **option 3: changing work days from the beginning**. Each day selects a mix from scenario templates we have built and approved, including the first day. There is no fixed opening week or prescribed Day 1/Day 2 route. The town's addresses and residents stay consistent while jobs, customers' circumstances and conditions vary.

Introduce responsibilities gradually through the eligible scenario pool rather than a fixed sequence of authored days. Beginner days draw from simpler handling, preparation and standard-delivery situations. Later pools can introduce signatures, business pickups, document checks, shipment acceptance/refusal, adverse conditions and mixed independent work. Exact eligibility rules remain to be designed alongside assessment and trainer policy.

Proposed safeguards for day selection:

- Choose compatible scenarios with prerequisites and feasible routes, commitments and durations. Balance the full shift toward the agreed 30–45 minute target; parcel count alone is not a useful duration measure.
- Track skills encountered and assessment outcomes so essential training does not depend on chance. Weight future eligible jobs toward skills that need practice or have not yet appeared. Agree progression thresholds before implementing them.
- Introduce unfamiliar equipment and tasks with contextual practice coaching, while respecting the existing assessment-mode restrictions on hints and answer feedback.
- Save the selected manifest, scenario versions, seed and logical progress so resuming a day preserves its jobs and relevant world state. Make reported situations reproducible for debugging.

Variation means selection from content we have built and approved. Campaign unlocks and course completion policy still need an explicit design decision before replacing the current course completion behaviour.

### Adaptive encounter selection

The user supports continuously adjusting encounter chances: lower the chance of types encountered frequently and raise the chance of underrepresented types. This balances variety within the scenarios the player is ready to attempt. It is a content-selection system, not an instruction-generation system.

Track encounter exposure separately from skill evidence. A business pickup is an encounter type that can exercise several skills, such as checking documents, inspecting a shipment and deciding whether to accept it. Merely arriving at that pickup does not demonstrate those skills. Record which situations actually occurred and which observable actions were tested, including whether coaching was used. Persist stable event identifiers so reloading a checkpoint does not duplicate exposure or successful evidence.

Proposed selection rules, pending tuning:

1. Filter templates by prerequisites, trainer policy, world compatibility and feasible time/route constraints.
2. Give each eligible encounter a base weight. Reduce it for frequent recent exposure, increase it when underrepresented or overdue, and allow a bounded increase when a relevant skill needs practice. Use recent history as well as lifetime counts so yesterday's repeated situation has a visible effect without permanently suppressing it.
3. Apply repeat limits and a minimum selection weight for eligible optional encounters. Reserve coverage opportunities for required skills that have been absent too long; probability adjustments alone cannot guarantee coverage.
4. Recalculate weights after each selection while assembling a day, preventing one generated manifest from filling with the same type. Cap the number of unfamiliar or demanding situations in a single beginner shift.
5. Save the completed manifest and scenario choices when the day starts. Subsequent skill/exposure changes affect future days; they must not silently replace a customer's job halfway through the current day. Deliberate authored dispatch updates can still occur as part of the saved scenario.

For example, if recent days contain many signature deliveries and few eligible business pickups, signatures become less likely and pickups more likely. If signature handling is still weak, its practice need can temper that reduction. Offer focused signature practice as well, so reinforcement does not dominate every campaign route. Exact weights, history-window length, coverage intervals and repeat limits need playtesting and trainer review.

Mandatory routines such as pre-trip checks, seatbelt use and safe parking remain mandatory when relevant. Encounter balancing applies to optional jobs/events; frequent performance never makes a safety requirement disappear. Versioned templates, seeds and manifests should make generated days reproducible for QA. Store compact counts and bounded recent history within existing local/company/LMS save limits.

### Progression proposal

The user requested a deeper progression design. The following is a proposal, not an agreed set of thresholds or a change to official certification.

Track three distinct kinds of progress:

- **Exposure:** situations actually encountered, used to balance day variety and curriculum coverage.
- **Skill readiness:** evidence of correct observable decisions/actions, independence from coaching, variety of contexts and current practice needs. Used to propose eligible campaign responsibilities.
- **Career and assessment progress:** retain existing stars/ranks, Safety/Efficiency/Service results and trainer-controlled formal assessments. A campaign skill estimate must not automatically consume a module assessment attempt or award an official pass.

Increase responsibility in broad stages rather than by completing a fixed number of days:

| Proposed stage (design terminology) | Eligible work and responsibility |
| --- | --- |
| Beginner | A changing mix of simpler parcel handling, preparation and standard deliveries; contextual coaching in practice |
| Routine route | Broader customer interactions, signatures and proof of delivery once prerequisite skills are demonstrated |
| Expanded duties | Business pickups, shipment checks, acceptance/refusal and delivery exceptions; more dependencies and decisions |
| Independent mixed work | Combined responsibilities, commitments and adverse conditions, with less practice coaching as competence develops |

The stages are responsibility groupings, not new on-screen rank names. Preserve the existing career ranks; visual rank alone must not unlock a job whose prerequisite skills are missing. Basic road hazards and required safety routines apply at every stage; advanced work adds complexity, not permission to ignore safety earlier.

Proposed advancement requires several successful independent demonstrations across appropriate variations, with trainer-defined pass criteria and no unresolved critical prerequisite failure. A focused module can prepare the player for an unfamiliar job; approved evidence rules should decide how module and campaign results contribute to readiness. Exact counts, recency rules, skill prerequisites and advancement thresholds remain open. Do not promote solely for encountering jobs, playing many days or repeating a single easy success.

Provide progress after each day: demonstrated strengths, specific skills needing practice and the responsibility the player is working toward. Offer the matching isolated module from that debrief. Ordinary mistakes should have understandable task consequences and feed practice recommendations. A serious prerequisite failure can hold back the affected responsibility and prompt targeted remediation; an isolated weak result should not automatically erase established competence or reset the whole career. Historical mistakes and assessment results remain recorded.

Trainer controls should eventually be able to assign a difficulty/eligible scenario set, target particular skills and allow appropriate reassessment, while retaining existing practice/assessment modes, pass marks, hints policy and attempt limits. These campaign-specific controls are proposed additions. Official course completion remains tied to existing module assessment rules until the user agrees an alternative and its LMS/trainer integration is reviewed.

### First-person central hub proposal

The user proposes a brief introduction on first sign-in, followed by a central hub showing the modules and an option to start the work day. The player walks to a destination, points at it and confirms; the screen fades to black and then reveals the selected activity. This is the working navigation direction, with layout, exact input bindings and transition timing still to be reviewed.

Use a compact depot training area as the hub. The same movement, aiming and interaction conventions should apply here and inside modules:

- A dispatch desk or route board starts a new day or resumes the saved active day.
- Clearly recognisable stations lead to each individual module. Reuse existing module names and icons; show training/assessment availability and progress through readable shared interface elements.
- A training board presents existing career/assessment progress, skill coverage, recommended practice and the next responsibility being worked toward.
- Settings, trainer access, language selection, records and exit remain easy to reach through the existing interface as well as suitable hub entry points. Menu access should not require a walk across the room.

The first-visit introduction should explain the overall work-day/module choice and teach moving, looking and activating one station. Keep it brief, skippable and replayable. Store its completion per trainee profile; signing in again should normally enter the hub directly. Introductory guidance follows narration, text-size and language settings. Keep all required training in the appropriate lessons rather than making this welcome sequence a certification gate.

For selection, highlight the nearby visible station and present one clear action prompt, with remappable activation and deliberate keyboard/click support. Avoid distant activation through walls, tiny physical text and labels competing with progress displays. Provide a compact keyboard/menu route to the same destinations for accessibility and quick repeated use; gameplay destinations remain the same first-person scenes. Module practice should be easy to revisit, subject to existing trainer restrictions, while assessments retain their attempt/pass policies.

Use a short, configurable fade-out → destination setup → fade-in transition. Offer reduced/instant transitions. Disable movement and repeated activation during the change, release or recapture the pointer as appropriate, clear held inputs and guard against double-starting scenes or assessment attempts. Respect existing assessment-at-start semantics. Start/resume the destination's gameplay clock only when its controls are ready; hub time and scene-transition time are not assessed work efficiency.

Selecting the campaign with an active saved day should offer its resume path. Starting another day or leaving an assessment must follow explicit existing save/attempt rules; a hub transition must not silently discard a shift or refund an assessment attempt. Return to the hub after a day/module debrief, with the result saved and the relevant station or progress display updated.

The hub is a small scene with inexpensive lighting and low-graphics support. Render the active scene only and follow the existing shared-GL ownership/disposal rules during scene changes. Keep labels as translatable Phaser text through `OTR.txt`, retain readable overlays and the protected language/font code, and record any new source strings when implemented. This planning change creates no new on-screen text or art assets.

### Module isolation

A module uses the same 3D tools and behaviours as the campaign, with a mission-specific starting state, permitted activities and completion conditions. For example, sorting practice puts the player at the depot belt with parcels, a scanner, bins and lesson-relevant equipment. Vehicle entry/driving and other jobs are unavailable. Use natural boundaries such as a training bay and closed exits, and enforce unavailable activities in the shared action handler rather than merely hiding prompts.

Keep relevant wrong decisions possible. The player can mis-sort a parcel and receive feedback or an assessment result; unrelated driving is blocked. Similarly, an inspection module can allow a defect to be missed, and a customer module can allow a poor response. Practice coaching and assessment grading are separate from these scope boundaries.

Share each skill's assessment events between modules and campaign days. Preserve the meaning of Safety, Efficiency and Service. Efficiency should reward sensible organisation and correct processes; safe decisions remain important when a commitment is at risk. A day debrief should identify weak skills and link to the matching focused practice module. Completing later practice does not erase the earlier day's recorded mistakes.

### Physical cargo: agreed direction and implementation details

The user agreed that parcels should be physically retrieved from the loaded van to give preparation and handling practical training value. Loading and retrieval must share persistent parcel identities and placements. The existing shift system already preserves loading placement as `loadMap`; use that behaviour as a reference when adapting it to 3D.

The user accepted the physical-retrieval, delivery-loop and shared-control direction in the discussion following this section's introduction. The gameplay direction below is agreed; specific data structures, scoring thresholds and additional later handling features remain implementation proposals.

- Represent each parcel with a stable ID, readable tracking/address label, size/weight, handling requirements, service requirements and current location. Its depot, carried, cargo, customer-site, handed-over and return states refer to the same item. Save parcel placements and any later rearrangement; reopening the cargo area or resuming a day must not reset the load.
- Give the van recognisable shelf/floor zones. Players choose a zone and accessible position while loading, considering stop grouping, weight, fragile items, orientation, securing the load and access routes. Shelves and parcel sizes should make organisation understandable without fine mouse positioning.
- Use snapped placement and simple collision/occupancy rules initially. Invalid geometry such as placing a parcel through a wall is blocked. Relevant poor handling or load choices can remain possible and be assessed. Use explicit supported outcomes for unsecured or unsuitable placements rather than an expensive loose-body physics simulation.
- At a stop, the player opens the cargo area, finds the physical parcel, reads its label or scans it, and carries it out. Similar-looking parcels can require checking identity. Poor organisation creates extra searching, moving obstructing items or revisiting the van; do not add an arbitrary delay solely to punish a low loading score.
- The scanner can show the manifest, shipment requirements and recorded loading zone. That zone comes from the player's recorded placement; it is not automatic live tracking of any parcel that has been moved. Scanning a physically selected label verifies the item and can give ordinary device warnings when it does not match the active stop.
- Allow selecting a wrong parcel, noticing the mismatch, putting it back and retrieving the right one. Device information and normal operational warnings remain available in assessment; extra instructional hints follow trainer settings. A wrong delivery attempt can have a scenario-supported rejection or misdelivery outcome and must not count as a correct delivery.
- Recognise self-correction while retaining relevant recorded mistakes. Looking at or collecting a wrong box alone need not be treated as a completed misdelivery. Record the decision stage and actual outcome so harmless inspection is distinguishable from an incorrect handover or completion record.
- Start with one carried parcel and straightforward place/return actions. Later lessons can introduce multi-piece jobs, trolleys and assistance decisions. Evaluate equipment choice and handling actions supported by the simulation; keyboard movement cannot establish the trainee's actual lifting posture or physical fitness.
- Keep labels readable through close-up inspection and accessible overlays. Assistance should make information usable without selecting the answer for the player. Low graphics retains the same parcel identities, labels, layout and task outcomes.

This records the agreed gameplay direction and proposed implementation details. It does not yet add a cargo interior, multiple parcels or persistence to the current one-parcel prototype.

### Agreed delivery interaction direction

The user agreed to the delivery sequence and training focus below. Reuse it for campaign and isolated lessons. Preparation covers the actual day's manifest and vehicle; later stop decisions depend on that preparation. Use existing approved procedure content and review company/trainer-specific rules before defining new scored requirements.

| Step | Player action | Training evidence and supported mistakes |
| --- | --- | --- |
| Prepare and load | Review the manifest, complete applicable pre-trip tasks, inspect/scan parcels and choose cargo placements | Recognise requirements/defects, organise access and secure the load; distinguish a missed issue from merely opening an inspection view |
| Drive to the stop | Choose a route, use the belt/signals/mirrors and respond to traffic and hazards | Actual speed, spacing, yielding and gap decisions in context; a mirror-view button alone does not prove hazard recognition |
| Park and secure | Choose a suitable stopping position, secure the vehicle and check the exit route | Avoid obstruction and unsafe exposure; keep relevant bad choices assessable rather than offering only a single glowing correct bay |
| Retrieve | Open cargo, identify the physical parcel, verify the shipment and select appropriate handling equipment | Correct identity/requirements, load accessibility and recovery from a wrong selection; save changes made to cargo |
| Approach | Check the address/unit and choose a safe path to the delivery point | Address verification, obstacles, animals and carrying decisions; do not award success for reaching any nearby door |
| Resolve delivery | Attempt contact and follow the shipment's recipient/signature/authorised-release requirements, or choose the appropriate exception | Correct handover, safe release or properly handled unsuccessful delivery; a justified exception can be successful task performance |
| Record the outcome | Use the handheld for proof, recipient details, a photo/signature where required, or an exception and further instructions | Accuracy of the record and evidence, not a mandatory drawing/typing minigame for every stop; requirements come from the actual shipment |
| Return and depart | Return retained parcels to cargo, secure doors/load and safely rejoin traffic | Keep undelivered items accounted for and assess the departure in its real traffic context |

Select authored variants within that shared sequence: an ordinary handover, an authorised safe-place delivery, recipient absent when release is prohibited, or a path obstructed by a hazard. Campaign eligibility and coverage rules determine which variants appear. Keep the environment continuous between parking, walking and the doorstep; hub/module transitions do not turn each stop back into an unrelated scene or task system.

Distinguish operational alerts from teaching feedback. In practice, prompts can explain what to check. In assessment, the scanner still displays the shipment's genuine instructions and validation messages while coaching follows existing trainer restrictions. Preserve supported wrong actions and truthful task state; delivering the wrong physical parcel must never complete the correct job by proximity alone. Apply configured grading to observable actions/outcomes and avoid repeated penalties for the same unresolved event.

### Agreed shared control direction

The user agreed to more intuitive driving and consistent first-person interactions with the behaviours below. Exact keys, sensitivity and handling values need usability review; these are planning decisions, not implemented changes:

| Context | Proposed controls and behaviour |
| --- | --- |
| Walking and hub | WASD/arrows move, mouse looks, one remappable primary action activates the visible nearby target; support deliberate click activation |
| Parcel handling | Primary action picks up/places the selected parcel; a separate inspect action offers a readable close-up and rotation; show the current action clearly |
| Handheld | One shortcut raises/lowers it; large clickable/keyboard-operable controls handle scanning, shipment details and outcomes; no need to hit a tiny barcode precisely |
| Driving | W accelerates, S brakes, A/D steer with predictable speed-sensitive response and centring; reverse uses an explicit gear selection while stopped rather than braking automatically becoming reverse |
| Cab observation and equipment | Camera position/orientation follows the vehicle; mouse look changes head direction without steering, with an easy return to forward view; mirrors, belt, signals and parking brake have clear remappable shortcuts and suitable clickable controls |
| Pause/accessibility | Escape opens the existing pause/settings path, releases the pointer and clears held controls; avoid forced head bob/shake and provide text-size, sensitivity, key-remapping and reduced-transition support |

Keep one action vocabulary across hub, depot, van and customer locations. Context changes must not silently make an everyday interaction key signal a turn or discard the held parcel. Ordinary animations can be brief; avoid manual finger/hand positioning and reward the underlying decision/process rather than fine mouse accuracy. Only attach a posture or observation score to evidence the simulation actually measures.

### Driving and road hazards: discussion draft

The next planning discussion concerns the driving environment, meaningful observation/response, hazard selection and consequences. This draft does not implement driving changes or establish new pass thresholds.

Use a comfortable first-person van view with the camera anchored to the vehicle and independently controlled head direction. Keep useful dashboard information legible, allow an easy forward-view reset and avoid forced camera shake/bob. Driving should be manageable with digital keys: smooth acceleration/braking, predictable steering/centring, controllable low-speed positioning and an explicit stopped gear change. Retain the sense of vehicle size, braking distance and corner clearance. Review/adapt the existing vehicle model and scenario content before introducing a replacement physics system.

Create a small connected depot/residential road area first. Use readable signs, crossings, junctions, parked cars, a few moving vehicles and several plausible delivery stopping positions. Ordinary driving provides the background between occasional developing hazards. Avoid presenting a surprise at every corner or requiring a single marked parking bay to establish a valid stop. The active road convention and configured training procedures determine the rules; changing the interface language does not change them.

| Situation | Useful cue and decision | Observable evidence |
| --- | --- | --- |
| Pull away from the curb | A vehicle approaches from behind; use the relevant mirror, signal and wait for a gap | Check/action order, actual gap and whether departure forces another vehicle to brake or causes a conflict; recent mirror activation alone is insufficient |
| Junction or crossing | Signs, signals and visible traffic/pedestrians establish priority | Approach speed, stopping position where required, yielding and a suitable gap before entering |
| Pedestrian developing hazard | A person approaches a crossing, or a ball provides advance warning before a child follows | Early speed reduction, stopping/yielding and clearance at the conflict point |
| Parked-car hazard | Occupant/reverse lights indicate a possible opening door or vehicle movement | Approach speed, safe clearance and appropriate waiting rather than an unsafe swerve into another lane |
| Lead vehicle slows | Brake lights or a queue develop ahead | Maintained following gap, braking margin and avoidance of a rear-end conflict |
| Dispatch/handheld interruption | An operational message arrives while driving | Whether device interaction is deferred until a suitable parked state; safety decisions remain possible without reading the message immediately |
| Parking and backing | Limited visibility, obstructed space or a safer forward approach | Choice of location, securing the vehicle, physical get-out-and-look when required, a controlled manoeuvre and response to actual obstacles; one observation shortcut is not proof of a clear area |
| Advanced conditions | Weather/visibility changes, an emergency vehicle, a stopped school bus or a closure | Appropriate adaptation and application of the approved scenario's rules; only introduce added complexity through eligible templates |

For mirrors, show perspective views of actual nearby world traffic from suitable cab/mirror positions. A glance should reveal information useful for a manoeuvre. Start with a readable on-demand mirror view and inexpensive geometry; persistent multiple mirror renders are a later option contingent on performance. Low graphics must retain useful mirror observations, readable hazard cues and equivalent scenario behaviour. Reduce resolution/decorative cost and inactive-view rendering, not the information required for the task. A rear camera can assist a supported vehicle but does not automatically establish that physical area checks were performed.

Proposed hazard construction and selection rules:

- Each template includes prerequisites, road placement, advance cues, actor behaviour, acceptable responses, outcome criteria and a stable encounter ID. Reuse the existing road-hazard scenarios where suitable, adapting them to the first-person world.
- Trigger development when the player approaches an appropriate location. Validate available sight distance and stopping/clearance options at expected lawful speeds; avoid a spawn directly into the player's unavoidable collision path. Account for current obstructions and other events before arming a template.
- Limit overlapping hazards and give beginners longer, clearer development. Increase complexity through combinations, visibility and decisions as skills develop; do not rely on impossibly short reaction windows. Necessary cues remain understandable without audio or expensive weather effects.
- Select eligible optional hazards using the adaptive exposure/skill system and guarantee curriculum opportunities when due. Normal signals, right-of-way, seatbelt requirements and safe parking still apply throughout the route.
- Count an encounter when the situation actually develops for the player. If a legitimate alternate route avoids an optional event, record it as untested rather than awarding a pass. Future appropriate days or an isolated driving module can provide missing evidence.
- Save an armed/developing/resolved event's relevant logical state and actors. Pause/focus loss stops the simulation, and resume neither re-rolls the event nor duplicates exposure, penalties or successful evidence.

Assessment should connect observation opportunities, vehicle behaviour and actual outcome. An early safe response and a late emergency stop can both avoid impact while demonstrating different anticipation. Looking in a mirror does not prove attention, and holding the brake while already stationary does not establish hazard recognition. Apply contextual criteria with tolerances; record successful responses, recoveries, untested skills and failures separately. Do not repeatedly penalise the same continuing event. Time spent yielding safely, reading instructions while parked, pausing or transitioning scenes must not create pressure to break safety rules for efficiency marks.

Keep normal scanner/device feedback available, while practice coaching and assessment hints obey trainer rules. Relevant unsafe decisions such as an unbelted departure or interacting with the handheld while moving can be recorded; do not silently auto-correct them. Basic physical bounds and reliable input handling still apply. Minor contact can lead to securing the vehicle, inspection/reporting and a scenario-appropriate recovery. A serious collision should enter an incident-response sequence with the critical result retained; whether that ends the campaign shift or allows a suitable continuation is an open user choice. Exact incident procedure content and critical/pass rules must use approved existing material or be reviewed before implementation.

Proposed prototype scope: a small daytime route, ordinary junction/sign rules, moving traffic that makes mirror/gap checks meaningful, and one eligible developing pedestrian/crossing event. Review safe parking and departure at delivery stops. Use targeted fixtures to compare early yielding, a late stop, unsafe pull-out and saved-event resume. Expand door-opening, reverse-out, following-distance, weather, emergency-vehicle, school-bus and backing scenarios after the basic vehicle/view/assessment behaviour is credible and measured. The isolated driving lesson uses the same world actors and vehicle behaviour, constrained to its relevant route and objectives.

### Next connected review milestone

Extend the existing one-parcel demonstrator into a proposed 10–15-minute review slice: hub → briefing → preparation/loading → a few stops → return → debrief → hub. The eventual campaign day target remains 30–45 minutes. This is a proposed next milestone, not an implemented or certified shift.

Use a small approved scenario pool to produce different short manifests from the outset. Include several physical parcels, persistent cargo placement and at least two eligible delivery outcomes; targeted QA fixtures can exercise a wrong selection/recovery and a correctly handled exception. Use a small local driving area with simple traffic/hazard evidence, rather than an entire finished town. Demonstrate one isolated loading/retrieval lesson using the same parcels, shelves, scanner and action handlers. Sorting remains the planned first broader module conversion after this cargo-focused review.

The review should establish whether loading choices affect retrieval, wrong selections are recoverable, handheld information is readable, driving/parking are comfortable, relevant mistakes and justified exceptions are recorded correctly, and save/resume preserves parcels/jobs. Then tune the day mix and progression evidence against actual play. New graphics still require manual review before graphic testing/integration; no assets are generated by this planning update.

### Existing scaffold to preserve

- Start/module navigation, profiles, career ranks, stars, results and trainee records.
- Trainer access and settings, practice/assessment policy, pass marks, attempts and allowed retakes.
- Refresher quizzes and existing dialogue, shipment, scenario and lesson content where applicable.
- Save/resume and work-day history. Checkpoint compact logical state (job IDs, stage, inventory and relevant world changes), not whole 3D scenes. Keep existing progress compatible and respect the LMS's suspend-data limits.
- Local/browser use, company sign-in and stored trainee progress, and SCORM/LMS integration. Keep the current official completion rules until a campaign/course completion design is agreed.
- Language selection and the translation infrastructure. Author new gameplay in English first, reuse existing dialogue/content and translations, then schedule a translation pass when the English flows stabilise. Keep new source strings recorded and all user-facing text compatible with `OTR.txt` and `OTR.i18n.src`.
- Audio, graphics settings and accessibility facilities: text size, colour support, narration and key remapping. Adapt them to first-person interaction rather than dropping them during conversion.

### Shared gameplay foundation

Keep one first-person movement/interaction system, one vehicle system, common package/scanner tools and common customer/dialogue interactions. Campaign and module definitions select objectives, starting state, available actions, coaching and completion. Scenarios should not grow separate copies of movement, sorting or delivery code.

Retain Phaser's useful menu/interface scaffold and the bundled three.js world renderer. The current prototype proves a small interaction sequence; it is not yet the full mission framework, training assessment adapter or campaign save system. Work should next establish mission scope and content-driven interactions, then connect one day and one isolated module to the existing scaffold.

Before release integration, incorporate published main updates into the prototype branch and recheck compatibility with trainer/platform fixes. Main publication still requires the user's explicit permission.

### Visual handoff and development order

Plan a common visual brief before finished asset production: professional stylised realism, consistent proportions/materials/lighting, readable labels and handheld screens, and a target integrated-GPU performance budget. This suggested visual direction remains subject to user review. Review a representative depot area, van and parcel as the reference set, then apply the approved style across the town, interiors, equipment and characters. High-definition images can supply textures and references; reusable 3D meshes and collision shapes are also needed.

The user intends to switch to Astra after the plan is ready. Prepare that model's handoff with the agreed visual brief, shared-world requirements, asset review process, local-loading constraints and measured performance targets. No model switch or asset generation is performed by this planning update.

Proposed build order:

1. Define the beginner scenario pool, assessment/completion policy and common controls. Campaign structure is agreed: varied days from the beginning, targeting 30–45 minutes per work day.
2. Turn the prototype into a reusable mission framework, including module scope enforcement, readable shared tools and a placeholder hub with reliable scene transitions.
3. Build a small beginner scenario pool that can produce different 10–15-minute demonstration shifts, first reviewing physical loading/retrieval and one isolated cargo lesson with shared systems. Then convert sorting with the same depot, parcels, scanner and interactions. Full campaign days retain the 30–45-minute target.
4. Connect trainer rules, records, save/resume, the first-visit introduction and hub/menu entry points; validate old progress and completion compatibility.
5. Establish and approve the visual reference set, then expand the environment and convert the remaining modules with shared systems.
6. Expand campaign variation and difficulty, then complete regression, hardware performance and translation passes.

This is a proposed iteration order. The initial demonstration day/module pair and first visual reference set should be reviewed before the whole curriculum is converted.

## Publication and ownership

- Commit focused changes to this branch. Publishing to main requires new, explicit user permission. Earlier permission to publish the graphics work does not apply to this conversion.
- Preserve Claude's protected translation, record, language-picker, font and QA files. Ask before a required edit to any of them.
- Keep conversion notes here rather than in shared QA documentation.
- Generated pictures and art assets require the user's manual review before graphic testing or integration. Start with simple placeholder geometry; establish the visual direction and asset review process before producing finished artwork.

## First milestone: depot foundation

Build a small, opt-in development scene with a depot floor, inspection space, one package and a van. It is the first step toward converting every module, not a substitute for that conversion.

The first review should answer whether moving, looking and interacting feel comfortable:

1. Walk and look with predictable movement and adjustable sensitivity. Avoid forced camera bob or shake.
2. Collide reliably with walls and objects; stop movement and clear held inputs on pause or focus loss.
3. Aim at a nearby object to interact. Use a shared range/visibility check so objects cannot be used through walls.
4. Inspect and rotate a package, then return cleanly to walking. Keep labels readable.
5. Enter and exit the van with clear walking and cab control contexts, checking that the exit position is clear.

Implementation files: `src/core/firstperson.js` for movement and interaction, `src/core/world3d.js` for the rendering lifecycle, and `src/scenes/FirstPersonScene.js` for the prototype. Classic script registrations in `index.html` and an opt-in launch through `src/scenes/LabScene.js` connect them. The initial planning commit contained documentation; the prototype implementation and its review instructions are recorded below.

## Second milestone: one complete courier task

Connect the systems in a single playable mission: inspect the van, scan and load one package, enter the cab, drive a short route, park, retrieve the package, walk to a customer and complete delivery.

Tune driving controls during this milestone. Reuse useful parts of the existing cab and vehicle model, while making steering, centring, braking, visibility and low-speed manoeuvring predictable. Mirrors and signals should support observing traffic and choosing safe gaps. Assessment should record observable decisions and actions; a camera glance does not prove that a trainee noticed a hazard.

## Module conversion map

| Existing module | Shared first-person setting and actions |
| --- | --- |
| Route & Driving | Depot walkaround, handheld route planning, cab driving, developing hazards |
| Package Handling | Sorting belt, scanning, package inspection, lifting choices and equipment |
| Customer Interaction | Houses and businesses, conversations and package handovers |
| Problem Solving | Address checks, recovery, damage inspection, dispatch contact and weather decisions |
| Scanner & Exceptions | Handheld use, delivery photos, signatures, ID checks and exception records |
| Loading the Truck | Cargo area, shelves, load order, securing freight and finding packages |
| Pickups & Paperwork | Business pickup counter, piece counts, inspection and document checks |
| Safety & Wellness | Delivery paths, slippery surfaces, dogs, heat management and incident response |

Reuse depot, van, town and customer locations across missions. Documents and handheld tasks use readable close-up interactions within the mission. Retain applicable content, translations and progress data; adapt scenario completion and assessment triggers as modules move to the shared interaction system.

## Runtime and performance

- Preserve local `file://` operation, bundled dependencies, classic scripts and `window.OTR` / `window.OTR_DATA` registration. No ES modules, fetch-based asset loading, CDN or build step.
- Start with the bundled three.js r158 and existing Phaser interface. Phaser has no depth buffer; 3D rendering needs its own target with depth and careful restoration of the shared GL state.
- Keep resources owned and disposable by the scene, including render targets. Handle restart, resize and failed loading cleanly.
- Use simple geometry, restrained texture sizes and baked lighting. Low quality must retain all essential training interactions while reducing rendering cost.
- Test on representative integrated-GPU hardware before expanding the environment. Record average and worst 1% frame times, download size and startup cost. Cloud SwiftShader results do not certify laptop performance.
- Rendering runs on the trainee's laptop; company hosting delivers static game files and existing account/progress services. A shared multiplayer simulation or cloud-rendered video stream is outside the proposed scope.

## Validation approach

Use ports 8300 and above. Keep protected repository tests unchanged and stop owned processes by PID. Run checks appropriate to each implementation milestone, then the existing regression suite before proposing a release. Request manual approval for new artwork before graphic testing. List new on-screen strings here and render them through `OTR.txt`; look up source strings with `OTR.i18n.src`.

The planning commit changes documentation only. It does not add a playable first-person scene, generate assets or require a game QA rerun. The graphics revision's ambulance assertion and intermittent Drive Map navigation test remain recorded in `docs/GRAPHICS-NOTES.md`; this plan does not resolve them.


## Historical first prototype (superseded by the connected slice above)

Entry point: **`first-person.html`**. Extract the branch checkout or ZIP before opening this file in a browser. It redirects to `index.html?lab=firstperson`. The usual `index.html` menu continues to open the existing training game; module conversion is still future work. `first-person.html?gfx=low` selects the cheaper render target and omits decorative meshes. `?sensitivity=0.001` halves the default mouse sensitivity; the accepted range is 0.0005–0.006.

This prototype includes a depot, a package-inspection table, a van, a short road and a house with a marked delivery bay. All world objects are simple procedural placeholder geometry. No generated pictures, replacement art, models from a CDN or new binary assets are included.

### Play the task

1. Click the game canvas to start and capture the mouse. If capture is unavailable, hold the left mouse button and drag to look. Esc pauses/releases capture; click or Enter resumes. Movement stops on focus loss.
2. WASD or arrow keys walk. Look at the package on the depot table, move close and press E to inspect it. A/D rotates the inspected package; E scans its label when it faces you. F returns to walking.
3. Aim at the scanned package and press E to carry it. Walk to the purple rear door of the van and press E to load it.
4. Aim at the blue driver's door on the left side and press E to enter. Space releases/toggles the parking brake. B toggles the belt. W accelerates, S brakes, A/D steers. R selects Drive/Reverse at a standstill. Mouse look in the cab is limited to the sides; steering recentres when released.
5. Drive along the road to the orange bay beside the house. Park facing along the road, centred in the bay, stop and set the parking brake with Space. Press E to exit; the prototype checks for a clear side.
6. Walk to the rear door, press E to retrieve the package, then approach the house's front door and press E to deliver. N restarts the prototype.

The task is a demonstration of connected first-person systems. It has no career scoring or persistence, traffic, customer conversation, mirror rendering, detailed cargo interior or completed inspection/handling assessment. Belt state is displayed but is not graded. The simple vehicle controller is prototype tuning, not a replacement of the current game-wide vehicle model. Future modules need their own objectives and assessments using these shared systems.

### Validation and review boundary

- `node test/firstperson.js`: exit 0, **18/18 checks passed**. Checks cover pause, walking speed and wall sliding, rotated vehicle collision, frame-rate consistency, centring, braking, gear selection, safe exits, inspection, task order, delivery parking and actual three.js CPU raycasting for wall occlusion/range/hidden objects. No pixels or graphical assets are rendered by this test. The bundled three.js prints its existing classic-build deprecation notice; it is not a failed test and ES modules are not introduced.
- `node --check` passes for both new core scripts, FirstPersonScene, LabScene and the new test.
- All 92 script paths in `index.html` exist. Launcher JavaScript syntax and prototype script ordering pass static checks.
- `git diff --check` passes. All protected files match the branch's main base exactly.
- **Browser graphics QA, the full regression suite, Hindi layout checks and performance benchmarks have not run for this prototype.** Per the user's requirement to review graphics before testing them, this is a branch build for manual review. Approval is needed before browser graphics checks. Source/CPU checks do not establish WebGL rendering, HUD fit, file-launch compatibility, frame rate or restart/context behaviour.

### New displayed strings for translation

All new text is rendered through `OTR.txt`; translation files and the font line are untouched. The lab also reuses its existing `LAB: {which}` development label. Exact new source strings follow (the inspection instruction contains a newline). Numerical cab status is composed from the template and components at the end.

```text
FIRST-PERSON PROTOTYPE
The first-person prototype could not start
WebGL is required. Reload to try again.
Loading…
Click to start
Walk around the depot, scan and load the package, then deliver it to the house.
Click for mouse look · Esc pauses · Drag to look if mouse capture is unavailable
214 Maple Ave
Check the label before loading.
E scan · A/D rotate · F return
Delivery complete — press N to restart
Inspect and scan the package on the table
Pick up the scanned package
Take the package to the front door
Load the package through the rear of the van
Exit and retrieve the package from the rear
Drive to the orange delivery bay and park
Stop and set the parking brake before exiting
Rotate the package so the label faces you
Stop before changing gear
W accelerate · S brake · A/D steer · Space parking brake · R gear · B belt · E exit
A/D rotate · E scan · F return
WASD or arrows walk · E interact · F inspect carried package · N restart
Carrying package
Release the parking brake with Space before moving
Follow the road to the orange bay beside the house
Package scanned — F to return
Turn the label towards you, then press E to scan
E pick up package · F inspect
E inspect package
Load the package before entering the cab
E enter van
E load package
E retrieve package
E deliver package
Delivery destination
{mph} mph  ·  {gear}  ·  {parkingBrake}  ·  {belt}
D
R
Parking brake on
Parking brake off
Belt on
Belt off
```
