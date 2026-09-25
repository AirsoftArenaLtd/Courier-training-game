# QA Report — FedEx: On The Route

A module-by-module quality pass over the whole simulator: every scenario play-tested and code-reviewed, every
defect fixed at its source, and a repeatable test suite left in the repo so the result can be re-checked on
every change. The driving model was also rebuilt from scratch.

**Status:** complete, 23 September 2026. Every scenario, the route day and the hub were play-tested and reviewed,
every defect found is fixed, and the final run of the suite on the finished build is clean: 28 of 28 (see
Verification). What was not covered, and one thing worth doing next (frame rate on integrated graphics), is at the end.

**Second pass:** 24 September 2026. A wider review by nine testers found 186 more issues. All of them are now
marked fixed or decided, including the owner's two examples (walking out of the van, and prompts that needed a
wiggle). On the owner's laptop's Intel UHD graphics every scenario now runs at 131–145 fps (it was 45–72), against a target
of 60.
See [Second pass](#second-pass-24-september-2026).

---

## How this was tested

`node test/qa.js` (see [`test/README.md`](../test/README.md)) drives the real game in headless Edge and runs four
passes per scenario:

| Pass | What it checks |
| --- | --- |
| **boot** | the scenario loads, its intro dismisses, the expected scene is live, nothing throws, frame rate above the floor |
| **layout** | walks the live display list: UI outside the 1280×720 canvas, text wider than its wrap box, hit areas the player can never reach |
| **play** | twelve seconds of randomised but plausible mouse and keyboard input: nothing throws, the scene survives |
| **golden** | a scripted playthrough (`test/paths/<id>.js`) played with the real mouse and keys. It must finish the scenario, report a result that scores every category the scenario declares, and (where the path plays perfectly) earn full marks |

The golden paths do not reach into the game to set state: they click what a trainee would click, by what it
says on screen. The Road Hazards path drives the van with a test autopilot that presses the same keys a trainee
does, so it exercises the real vehicle model, the traffic rules and every hazard.

Four *flows* run alongside the scenarios, for what no single scenario covers:

| Flow | What it does |
| --- | --- |
| **route-day** | a whole day as a brand-new courier, from name entry to the debrief and day 2, with a page reload and Resume half way and pause-menu restarts of a drive and a stop. A careful day must earn full marks |
| **route-legs** | every leg of the first ten route days (50 legs), in each day's weather, driven by the autopilot: every stop the generator produces must be reached with no violation and parked neatly |
| **town-traffic** | four towns left to run for minutes at a time with no player, checking every frame that no two cars overlap, none leaves the road or takes the wrong lane, none is stuck, nobody is left standing in a lane, and the two streets of a traffic light are never both let through |
| **hub-briefs** | every scenario's brief, opened from the hub: it must fit on screen with nothing running together |

---

## Scenario status

| Scenario | Golden path | Status | Main findings (fixed unless noted) |
| --- | --- | --- | --- |
| m1-pretrip · Pre-Trip Walkaround | ✅ all 21 items, tests enforced, full marks | fixed | full marks were unreachable; light switch hard to click; report overflowed and called a truck held back for 16 good parts a "GOOD WALKAROUND"; the cab view ran off the left edge; see M1 below |
| m1-route · Route Planner | ✅ 3 rounds on the best plan, full marks | fixed | waiting and the school zone were penalised twice; restarting during FAST kept the 3× clock; map tooltips covered the pin they described; see M1 below |
| m1-driving · Road Hazards | ✅ all 6 hazards, 0 violations, full marks | fixed | driving model rebuilt (below); red light judged at the wrong point on the van; car door drawn opening into the parked car; hazard timers counted frames, not seconds; intro card drawn twice; par was a number in the code that a careful drive could no longer make, so full marks were unreachable |
| m2-sort · Sort Belt | ✅ whole shift by keys and mouse, full marks | fixed | bins from the previous wave stayed on the floor, drawn over the new layout; a dangerous-goods or heavy piece riding off the end was not counted as mishandled |
| m2-lift · Lift Right | ✅ every lift, textbook form, no Back Health lost, full marks | fixed | the recommended solo lift of the 40 lb case (and the recommended team lift of the flat-pack) strained your back however well you did it; a box placed by reaching hung in mid-air |
| m2-labels · Label Check | ✅ 9 packages, all six sides, keys and mouse, full marks | fixed | ran at 70 fps (see Performance); a call made without turning the box was not scored as blind unless a hidden mark was missed, contradicting the rule on screen; a raw mark id ("class9_li") on the verdict card |
| m3-missing · Where's My Package?! | ✅ recommended answers → good ending, full marks | fixed | a shortcut answer out-scored the recommended one; the street shot cut the van logo to "Ex" and pushed the house number off the edge |
| m3-signature · Signature Required | ✅ recommended answers → good ending, full marks | fixed | a caller "on the phone" walked on stage as a person; the mood meter read "PRIYA (ON THE PHONE)'S MOOD" |
| m3-twostops · Two Stops, Two Styles | ✅ recommended answers → good ending, full marks | fixed | after the change of scene the conversation kept animating the destroyed courier |
| m4-address · Wrong Address | ✅ recommended answers → good ending, full marks | fixed | **full marks were unreachable**: the recommended answer earned less efficiency than a shortcut; the house read 214 while the script said 412, and never became 421 Maple Ct |
| m4-damaged · Damaged on Arrival | ✅ recommended answers → good ending, full marks | clean | shared conversation fixes only |
| m4-storm · Storm Warning | ✅ recommended answers → good ending, full marks | fixed | crashed on a choice (`disableInteractive` of undefined); dispatch and a customer "on the phone" walked up in the storm as people |
| m5-pod · Proof of Delivery | ✅ 3 stops (photo POD, signature, reception), full marks | fixed | in the van, E always searched the shelves, even with the package in hand; see M5 and M8 below |
| m5-exceptions · Exception Calls | ✅ 3 stops (NA with tag, BC with tag, RF), full marks, on both GPUs | fixed | E at the door could check the address instead of attaching the door tag (found at a low frame rate); shared stop fixes |
| m5-adult · Adult Signature & ID | ✅ 3 stops (verified, under 21, expired ID), full marks, on both GPUs | fixed | the ID check spilled off the handheld's screen onto its keypad; the ID exception code had no working number key; the door-tag fix above |
| m6-load · Load for the Route | ✅ full marks | fixed | see M6 below |
| m6-find · Find It Fast | ✅ all rounds | fixed | unplayable: hovering any package erased the address you were hunting for; see M6 below |
| m7-business · Business Pickup | ✅ full marks | fixed | see M7 below |
| m7-intl · International Docs | ✅ full marks | fixed | see M7 below |
| m7-dg · Declare It or Refuse It | ✅ full marks | fixed | see M7 below |
| m8-steps · Watch Your Step | ✅ 3 stops on ice, wet steps and clutter, walked carefully, full marks | fixed | shared stop fixes |
| m8-dog · Dog Encounter | ✅ 3 stops (owner at the gate, charging dog, fearful dog), full marks | fixed | **full marks were unreachable**: backing away from a charging dog (the recommended play) cost the "made a real attempt at the door" point; a dog secured at one stop silenced dogs at later stops |
| m8-heat · Heat Wave | ✅ 3 stops, drinking and cooling off, full marks | clean | the sun's glare bleeding off the top edge was flagged as off-canvas UI; it is light, not UI, and the audit now treats it that way |
| m8-incident · After a Fender-Bender | ✅ recommended answers → good ending, full marks | fixed | dispatch on the radio walked on stage as a person |
| Route day (brief → pre-trip → load → drive → stops → debrief) | ✅ a whole day as a new courier, with a reload and Resume half way, full marks | fixed | route stops posed as a practice scenario (wrong title, safety hidden from their reports); Restart turned a route stop into a practice set; notes the stop could not honour; the day was not reproducible; see Route day below |
| Hub, results, pause, title | ✅ every scenario's brief opened from the hub (`hub-briefs`); the route day and the restart checks | fixed | ENTER on a scenario's brief started the route day instead; three briefs ran their controls under the star ratings; Restart and Quit fixes (see Cross-cutting and Hub below) |
| The town, and every route leg of days 1–10 (`route-legs`) | ✅ 50 legs in the day's weather, driven and parked neatly, no violations; the layout checked on 40 days' towns | fixed | the station stood in 2nd St on top of two addresses; big buildings ran into their neighbours and onto sidewalks; houses drawn larger than their collision boxes; see The town below |
| The town's traffic, left to run with no player (`town-traffic`) | ✅ 8 towns × 5 min after the fixes: no overlaps, nothing off the road or on the wrong side, nobody stuck | fixed | **all four approaches of a light went green together**; cars drove through one another at stop signs and across left turns; two that met head-on blocked a junction for the rest of the day; a pedestrian who was hit stood in the lane; no two drives of a day were alike; see The town's own traffic below |

---

## Verification

The plan's five checks:

1. **The suite on the final build.** `node test/qa.js --shots`, 23 September: **28 of 28 clean**. All 24 scenarios
   passed every pass (boot, layout, random play, golden path) and so did the four flows, in 45 minutes on the laptop's
   RTX 2050, with every scenario at 127–144 fps against the 100 fps floor (144 is the display's refresh rate).
2. **A whole route day**, played by the `route-day` flow in that run: name entry, the hub, the briefing, the pre-trip,
   the load, five legs and five stops, the debrief and day 2, with a reload and Resume half way and pause-menu
   restarts of a drive and a stop. A careful day has to earn full marks, and does.
3. **Content validation.** Every scenario and flow runs with `?dev=1`, which validates all the content and the town
   layout at start-up, and the suite fails on any content warning, so a clean run is a clean validation.
4. **Syntax.** `node --check` passes on all 97 source, data and test files.
5. **Driving against the plan's targets**, measured on the model (see Driving). The Road Hazards golden path drives
   the whole drill on it, with every hazard and no violations.

The before and after screenshots of every screen that changed are at the end of this report.

### On integrated graphics

One full run landed on the laptop's Intel UHD integrated GPU: the laptop has two, and Windows handed the headless
browser the integrated one that day. It was worth having. Everything ran at a third to a half of its usual frame rate:

| Scenarios | Frame rate (Intel UHD) | On the RTX 2050 |
| --- | --- | --- |
| Pre-trip, Route Planner, Road Hazards | 54–62 fps | 141–144 fps |
| Sort Belt, Lift Right, Label Check | 53–69 fps | 129–144 fps |
| Conversations (M3, M4, the fender-bender) | 44–50 fps | 127–144 fps |
| Doorstep stops (M5, M8) | 41–51 fps | 132–144 fps |
| Loading, Find It Fast | 70–71 fps | 133–141 fps |
| Pickups (M7) | 75–76 fps | 135–143 fps |

At that frame rate every golden path still passed, bar two: both stop sets with door tags failed at their first one,
because E at the door chose the address check. That was a real bug hidden by a fast GPU (see M5 and M8); it is fixed
and both sets pass on the integrated GPU. The frame-rate floor, set for the discrete GPU, failed throughout; what that
means for trainees on integrated graphics is under the limits at the end.

The suite now asks for the high-performance GPU, so its floor always measures the same hardware, and every run
starts by printing the GPU it ran on. `QA_GPU=default` leaves the choice to the OS, which reproduces this run.

---

## Cross-cutting fixes

### Performance: rounded shapes were re-triangulated every frame

Label Check ran at 70 fps and the loading scenes at about 110 on a machine where everything else ran at the
144 Hz refresh cap; on Intel integrated graphics Label Check measured 57 fps. Profiling with the frame cap removed
showed the cost was entirely in Phaser `Graphics` objects: Phaser 3.80's WebGL renderer turns every arc into about
100 freshly allocated points **on every frame**, whatever its size, so one rounded rectangle is 400+ points to
build and triangulate per frame. A roller conveyor of 16 rollers was 1,700 path commands.

Fixed once, at the source (`src/core/textures.js`): arcs are emitted as a polyline fine enough to stay within
0.2 px of the true curve, so a small corner is four segments instead of a hundred and a large circle keeps forty.
Nothing that draws changes, and the shapes are visually identical. Uncapped frame rates, before → after:

| Scene | Before | After |
| --- | --- | --- |
| Label Check | 88 fps | 472 fps |
| Load for the Route | 145 fps | 718 fps |
| Find It Fast | 163 fps | 707 fps |
| Route Planner | 207 fps | 607 fps |
| Lift Right | 356 fps | 665 fps |
| Damaged on Arrival | 284 fps | 448 fps |

Those gains were measured on the discrete GPU. On the integrated GPU, Label Check now boots at 69 fps (see
Verification): what limits it there is filling the screen with its layers of art, a different cost from this one.

### Performance: every scenario redrew its clock on every frame

Phaser skips `setText` when the string has not changed, but `setColor` always re-rasterises the text and uploads
a new texture. The shared HUD clock (`setTimer`) sets its colour (white, or red when time is short) on every call,
and scenarios call it from their frame loop, so every scenario redrew its timer 60–144 times a second. An
unchanged colour is now a no-op, again fixed once at the source (`src/core/textures.js`).

### Keyboard shortcuts pressed buttons hidden behind a modal

Buttons with a keyboard shortcut kept listening while a modal covered them. On the hub, pressing ENTER on a
scenario's brief ("Start") also pressed "Start the route ▶" behind it, and the route won: the trainee landed in the
morning briefing of a route day, with a route saved as in progress, instead of the scenario they chose (reproduced,
then fixed). While a modal is open only its own buttons now answer their keys; this is enforced once, in the shared
button helper, for every screen.

### Pause menu: Restart and Quit

- **Restart lost the scene's context.** It restarted every scene with only its scenario id. A route-day stop has
  none, so it fell back to the first stop scenario: pressing Restart mid-route turned the stop into the Proof of
  Delivery practice set. The drive lost its route and start position, and stop 2 of a practice set restarted at
  stop 1. Restart now starts the scene exactly as it was started.
- A restarted attempt could keep the abandoned attempt's checks: score logs rebuilt from saved data shared the saved
  list and wrote straight into it. They now start from a copy.
- **The engine kept humming after Quit.** The drive's engine loop was only stopped by parking or finishing the drill,
  so quitting the drive from the pause menu left it running on the hub and every screen after. It now goes quiet
  while paused and stops whenever the drive ends.
- Restarting or quitting in the middle of a conversation left the conversation's frame listener attached to the
  scene, one more per restart (measured: 6 → 8 after two restarts; now stays at 6).
- Checked and clean: keyboard shortcuts do not multiply across restarts (the engine clears them), and ESC in a
  close-up closes it without also opening the pause menu.

### Crashes

- **Storm Warning (m4-storm):** choosing an answer could throw `Cannot read properties of undefined (reading
  'disableInteractive')`. The conversation engine reached into each choice card's children by index
  (`c.list[3]`); cards now keep a direct reference to their hit area. The fade after an answer also cleared the
  whole choice layer, so skipping ahead could put the next set of choices up and then wipe them mid-fade; it now
  removes only the cards that were answered.
- **Find It Fast (m6-find):** after the first hover the round timer was a destroyed Text that was still written
  every frame (a GPU texture allocated per frame, and a crash on some paths).
- **Package labels:** `OTR.labelArt.key` hashed the whole package object, which throws `Converting circular
  structure to JSON` as soon as a scene hangs a sprite or shelf slot off a package. It now hashes only the fields
  the label draws.

---

## Driving: rebuilt on a real vehicle model

The old model was on rails: no lateral physics at all (the van went exactly where it pointed), 0→top speed in
about 2 s, braking at 3.5 g that stopped the van in a third of its own length, and a tightest turn radius of
165 px on a 210 px road, so **no junction could be turned without mounting the lawn or crossing into the oncoming
lane**, which then fired the wrong-side penalty. Speed read in mph at one scale and distance in metres at another.

It is now a documented two-axle model (`src/core/vehicle.js`) tuned entirely from data (`data/vehicle.js`, real
units), at one world scale of 20 px = 1 m:

- **Tyres and grip:** slip angles on both axles through a saturating grip curve shared with braking and driving
  force (the friction circle); weight moves forward under braking and back under power; yaw inertia. The van
  understeers when you turn in too fast, slides on wet roads and can spin on snow. Grip depends on the surface
  under each axle (road, sidewalk, lawn) and on the weather.
- **Steering:** the keys turn a steering wheel at the pace of a driver's hands and it self-centres as you roll, so
  a keyboard can make small corrections. Full lock turns the van in about 6 m.
- **Gearbox:** reverse the way it works in the cab: stop, lift off, hold the brake. The HUD says so the moment you
  are stopped on the brake ("Lift off S, then hold S to reverse"), with a large D / R badge, reverse lamps and a
  beeper.
- **Collisions:** the van is an oriented box (it was a 44 px circle on a 161 px van) against buildings, traffic
  and hazards, with impulse, scraping along walls, and a damage scale: a touch, a scuff you are told about, a
  logged collision, a serious collision, each reported with the impact speed.
- **Camera:** framerate-independent follow with a look-ahead along the van's real direction of travel; gentle
  zoom.
- **Input:** held keys come from the page itself, so the van no longer coasts after the pause menu; `L`, `TAB` and
  `ESC` are real keys, so holding L no longer strobes the headlights.
- **Rules:** re-based on the new scale. The limiter is 35 mph against a 25 mph limit (flooring it used to be an
  automatic ticket). Wrong-side driving is checked on vertical streets too. Parking needs the van stopped,
  alongside the kerb on the house's side, and straight, and facing the traffic or parking far from the kerb is
  scored and explained. Wheels over the kerb are a violation. Red lights and stop signs are judged when the
  **front bumper crosses the stop line**, as the law does. They used to be judged when the middle of the van
  entered the junction, so pulling away on amber could be ticketed as running the red.

Measured on the model (headless bench, `data/vehicle.js` defaults):

| Target (plan) | Measured |
| --- | --- |
| 0 → 25 mph ≈ 8 s | 8.2 s over 46 m |
| 25 mph → 0 ≈ 2.5 s over ~14 m | 2.4 s, 13.8 m dry · 14.0 m in rain · 22.9 m on snow |
| a long coast | 25 → 21 mph after 5 s off the pedals |
| holds on the brake | 0 px of creep in 5 s |
| full-lock turn | 5.4 m (centre of gravity), 6.0 m (rear axle) |
| frame-rate independent | 0 → 25 mph in 8.20 / 8.18 / 8.18 s at 30 / 60 / 240 fps |
| recoverable slide on wet | full-lock step at 25 mph in rain: slides past the grip limit, straightens up on release |
| real loss of control on snow | the same input on snow spins the van (40° slip angle after release) |

The Road Hazards golden path drives the whole drill on this model with the test autopilot: six checkpoints,
left and right turns, stop signs and signals, all six hazards, parking at each checkpoint. It finishes in 328 s
(par 360) with every hazard passed, **no violations** and full marks, which also shows that every kind of
junction can be taken from lane to lane without touching the kerb.

Reverse was also checked on the real keys in real time, from the on-screen prompt alone and nothing else: roll,
stop on the brake, read "Lift off S, then hold S to reverse", lift off, hold S — "Selecting R…", the R badge, and
the van backs. Backing without getting out to look logs the violation once; after `G` the same manoeuvre logs
nothing. `W` brakes in reverse, and the same prompt in reverse ("Lift off W, then hold W for drive") takes you
back to D.

---

## Module notes

### M1 · Pre-Trip Walkaround

- **Full marks could never be earned.** A "did you actually test it" check counted the horn, belt and brake only
  if a flag was set that nothing ever set, so a flawless walkaround topped out below full safety marks. The UI
  already refuses a verdict until the test is done, so the check could not be failed either; it is gone, and the
  safety score is now purely what you caught against what you condemned.
- **The light switch was hard to hit:** its click zone was placed for a cab drawn 15% larger than the one on
  screen, so clicking the middle of the switch missed. It is now placed from the geometry actually drawn.
- **The sign-off report overflowed** its panel when many items were flagged (up to 21 rows in a 560 px panel), and
  it headed a walkaround that condemned 16 good parts "GOOD WALKAROUND" in green. Rows now come in order of what
  matters (missed defects with their consequence, then good parts condemned, then catches), anything that does
  not fit is summed up in one line, and the header has a third verdict: "TRUCK HELD BACK FOR PARTS THAT WERE FINE".
- The intro promised "walk to it and press E", which the scene never supported, and said the cab was entered
  from the driver side (the button works from any side). Both lines now describe what the scene does.
- A measured tyre lost its gauge reading if you closed the close-up and came back; hover labels could be left
  stranded on screen when the hotspots were rebuilt; the courier stood in front of the tyre you were inspecting.
- The cab view was drawn 1,012 px wide around x = 470, so its left edge (with the windscreen pillar) ran 36 px off
  the canvas while a strip of street showed on the right. It is now sized and centred to fit whole between the left
  edge and the checklist panel; its hotspots and the light switch follow it, since they are placed from the geometry
  drawn.

### M1 · Route Planner

- The solver was checked round by round: every round's best plan is feasible, meets every commitment, and needs
  no waiting and no crawl through the school zone, so full marks are earnable. The golden path proves it by
  clicking that plan in through the manifest.
- **Waiting at a pickup and driving the active school zone were penalised twice:** once as minutes in the route
  efficiency, and again as a separate penalty. Harmless with today's rounds, but a trainer who wrote a round whose
  best plan has to wait would have made full marks impossible. The separate penalty now applies only when the
  best plan avoided it.
- **Restarting from the pause menu during FAST ▶▶** carried the 3× clock into the new run (the scene object is
  reused on restart), and a stale tween reference stopped the DISPATCH button pulsing.
- Map tooltips were centred on the point just above the pin, so they always covered the top of the pin they
  described, and at the top edge of the map they were pushed down over it entirely. They now sit above the pin,
  or below it when there is no room.
- Content robustness: a round name without "·" crashed the round stamp, and a three-line round brief would have
  run under the first manifest card.

### M2 · Package Handling

- **Lift Right punished the right answer.** For the 40 lb paper case the size-up card teaches "a compact 40 lb case
  is manageable solo — form is everything", but the spine model put a box carried perfectly upright at 0.82 on the
  gauge (DANGER), so a flawless lift drained about 25 Back Health and could never earn full marks; the recommended
  team lift of the flat-pack also sat over the line. The model treated a box held against your body as if you were
  still reaching for it. The held lever arm is now short: carried upright the case sits at 0.38 (SAFE), while
  carrying it with a bent back still pegs the gauge at DANGER and costs 16 Back Health in under a second (both
  checked on the real keys).
- Placing a box by reaching instead of stepping across left the box hanging in the air where your hands had been.
- **Label Check scored blind calls by a different rule from the one it teaches.** The intro says deciding before
  you have seen all six sides is a blind call, and the HUD counts "N sides still unchecked", but the scoring only
  counted a call as blind when a side carrying a mark went unseen: an unmarked box called from its front scored as
  a careful inspection, and the end-of-run line "all six sides checked on N" overstated it. Blind now means any
  side unseen, everywhere. The leaking-battery package showed its raw mark id, "class9_li", on the verdict card;
  it now reads "Class 9 · Lithium Batteries", and content validation flags any mark with no name to show.
  Turning the box while the guide was open moved its side index without showing the side.
- **Sort Belt:** bins the next wave does not use stayed on the floor, so from wave 4 the old PRIORITY bin sat
  under EXCEPTIONS and in wave 5 the DG cage sat under HEAVY. They now leave the floor when the rules change. A
  dangerous-goods or heavy piece that rode off the end of the belt was not counted against specials handled
  (only damaged ones were).

### M3, M4 and the fender-bender · Conversations

- **Every conversation graph was audited statically** (links, reachability, dead ends, grades against points) and
  then played through on its recommended answers. All seven reach their good ending and earn full marks.
- **The recommended answer was out-scored in two scenarios.** In Wrong Address and Where's My Package?! a shortcut
  ("hand it over and head out", "here's the support number") was paid in efficiency that the recommended answer
  did not earn, and in Wrong Address that shortcut sits on the best path, so a trainee who chose every
  recommended answer could not get full marks. The shortcuts no longer earn points for skipping the step their own
  feedback criticises, and content validation now fails any scenario where a non-recommended answer out-scores the
  recommended one in a scored category.
- **People on the phone or radio walked on stage.** Dispatch, and customers "on the phone", appeared as full-body
  characters who walked up and stood beside the courier (in a thunderstorm, in one case). They are now calls: the
  courier puts the handheld to their ear, nobody walks on, and the call ends when the line does.
- **Wrong Address showed the wrong address.** The house read 214 while the script said "number 412 is right there",
  and never changed when the courier drove on to 421 Maple Court, "where the mailbox says RIVERA". Settings can now
  carry an address, so the stage shows 412 Maple Ave and then 421 Maple Ct with RIVERA on the mailbox.
- A change of scene mid-conversation rebuilt the courier, but the conversation engine kept animating, and pointing
  at, the destroyed one.
- The street shot cut the van's logo to "Ex" at the left edge and ran the house's porch and number off the right.
  It is reframed: the van shows its open cab door with the courier in it, and the porch, the door, the mailbox and
  the house number are all in shot.

### M5 and M8 · Doorstep stops

All eighteen stops are played end to end by a shared golden path on the real controls: packages pulled from the
shelves with the mouse, scanned in the van, three points of contact on the way down, SHIFT over anything slippery
or cluttered, the door or reception, every conversation on its recommended line, then the right delivery (type,
spot and a framed photo, the signer's real name, the right ID call) or the right exception code with a door tag,
and three points of contact back up. Water and AC in the heat. Every set earns full marks.

- **In the van, E always searched the shelves.** The shelves and the van door were the same spot, so with the
  package in hand E still opened the shelves; climbing out needed an unexplained shuffle to the right. E now offers
  the shelves until the stop's packages are in hand and the door after that, and a step towards either one
  switches to it.
- **Full marks were unreachable at the charging dog.** The recommended play is to back away and record "unsafe
  to deliver" without going back, but every exception was also scored on "made a real attempt at the door".
  Exception codes can now say that no attempt is expected (unsafe to deliver does).
- **The ID check spilled off the handheld.** The photo ID was squeezed onto the handheld's screen, which pushed the
  last answer and Back off the screen and onto the keypad. The customer now holds their ID up beside the handheld,
  full size and legible, and the handheld keeps the decision.
- **Two exception codes had no working key.** The handheld numbers its options 1–8, but only keys 1–6 did
  anything, so "7 DM" and "8 ID" (the code both adult-signature exceptions need) could only be clicked.
- **The first answer looked like the recommended one.** The handheld draws its first option as the primary
  button, which on a shuffled decision (the ID call, the printed name, where to leave it, the exception code) quietly
  highlights one answer. Decision lists are now plain.
- The stop report stopped at 13 rows, whatever they said and however tall they were; a long stop could hide a failed
  check or run into the button. Now everything fits in order, or failures come first and the rest is summed up.
- When the customer was out of reach, the handheld said "There's nobody with you… knock or ring first"; it now says
  who to walk up to. A dog secured at one stop silenced any patrolling dog at later stops (the scene is reused and
  the flag carried over).
- **E at the door could check the address instead of attaching the door tag.** The tag's spot was 10 px from the
  address check's and 10 px from the bell's, and the address check stays on offer until it is used, so which of the
  three E did came down to where the courier happened to stop. At 144 fps the courier stops within about 2 px of
  where you let go; at 45 fps it moves 5 px a frame. It surfaced when a run landed on the laptop's integrated GPU
  (see Verification): both sets with door tags failed there, at their first one. With a printed tag in hand, E now prefers
  the tag, the same way the van already prefers the shelves or the door. Both sets pass on the integrated GPU.

### Route day

A new flow test (`route-day`) plays a whole day as a brand-new courier: name entry, the hub, "Start the route", the
morning briefing, the pre-trip and the load (their own golden paths), five legs of driving with the test autopilot
and five doorstep stops with the stop driver, the debrief, and back to the hub on day 2. Half way through it reloads
the page and carries on from "Resume route"; it restarts a drive and a stop from the pause menu and checks both stay
in the route. A careful day earns full marks in every category.

- **Route stops posed as a practice scenario.** With no scenario of their own, route stops borrowed the first
  scenario that uses the stop scene (Proof of Delivery): the HUD read "SCANNER & EXCEPTIONS", and their stop
  reports were scored and shown on that scenario's categories only, so every safety check (climbing down, hazards,
  the heat) was hidden from a route stop's report even though the day's debrief scores safety.
- **The day was not reproducible.** The stops were picked (and the houses painted) with unseeded random numbers, so
  the same day number gave a different day every time it was started. It is now drawn entirely from the day's seed.
- **Delivery notes the stop could not honour.** Generated stops could carry "Please leave behind the planter" at a
  house with no planter (and then marked the doormat down), "Side door please" with no side door, and "Leave with
  neighbour if out" with no neighbour. A planter note now brings a planter and a spot behind it; notes nothing at
  the stop can satisfy are gone.
- Business stops named their receptionist "Reception", so the printed name to record was the word "Reception";
  receptionists now have names. Adult-signature route stops now score the ID check, as the practice set does.
- **Debrief:** "What to work on" ran off its panel and the canvas on a rough day, and the panel always ran under the
  corner of "Back to the station". It now fits, sums up what does not, and ends above the button; a check scored 0
  is marked ✗ rather than ~.
- **Briefing:** the courier stood behind the manifest board (only their head showed), and the fifth stop sat on the
  board's bottom edge.

### The town (route days and Road Hazards)

- **The station stood in the road, on top of two addresses.** The station building was drawn wider than its block:
  it covered 2nd St's sidewalk and ran into the southbound lane, and its collision box reached further still (40 px
  into the lane), so a van driving south on 2nd St in its own lane hit an invisible wall and stuck. Found by driving
  ten route days: day 10's third leg crashed there. Underneath it, 104 and 112 Harbor St were generated as normal
  addresses, hidden, and the route could send a trainee to them. The station now fits its block with a verge on
  every side, its collision box is the building drawn, and nothing is built under it. The Route Planner map draws
  it at the same footprint. The other addresses keep their ids, so a route saved mid-day still resumes; one saved
  with a stop at a removed address is set aside, and the hub offers a fresh route, instead of crashing the drive.
- **Buildings ran into each other and onto the sidewalks.** A business or apartment block takes two plots, but it
  stood centred on the first of them, so it ran 31–59 px into the house on the plot before, and an apartment block
  on a block's first plot covered 24 px of the cross street's sidewalk. It happened somewhere in town on most days
  (on day 1: 404 Maple Ave under 408, and 304 Harbor St and 205 Birch Ln on the sidewalk). Big buildings now stand
  across the middle of their two plots.
- **The houses drawn were not the houses the van could hit.** Houses come in four sizes and shops in two, but
  collisions (and the Route Planner map) used one size per kind: the widest house was 23 px wider than its box and
  wider than its plot, so neighbours overlapped on screen, and the van could clip a roof it never touched. Building
  sizes are now defined once, so what is drawn is what the van collides with, and the widest were trimmed to fit
  their plots.
- **Content validation checks the town.** `?dev=1` (and so every run of the suite) now builds the town for 40 days'
  seeds and fails if any building reaches a sidewalk, a road or another building (10 ms). It flags the old layout
  on day 1. The suite also now fails on a failed content check: content warnings used to go by unnoticed, since it
  only failed on errors.
- **Every generated stop can be reached and parked neatly, in the day's weather.** The autopilot drove every leg of
  days 1–10 (50 legs, in rain, storm, heat and snow as the days fall) on the real vehicle model, legally: every stop
  was reached with no violation and parked alongside the kerb on the house's side, facing the way the traffic goes,
  and within 8° of parallel (the neat limit). The tightest are stops just past a right turn, with about 12 m of
  kerb to straighten up in. The autopilot's own pull-in was too loose to use that room (its first route day parked
  one stop at 8.2° and lost a safety point for it); it now steers for the kerb line itself. This is now the
  `route-legs` check.

### The town's own traffic

The route flows clear the traffic so a leg is repeatable and the drill scripts its hazards, so nothing was
watching the cars and people simply living in the town — which is most of what a trainee sees out of the
windscreen. Leaving four towns to run with no player, and checking every frame, found this:

- **All four approaches of a traffic light went green together.** Each junction had one light state that every
  approach was painted with, so a signal never held anyone back: the cross street was shown the same green, and
  cars drove through one another in the middle of the junction. The two streets now run on opposite phases of an
  18-second cycle — green, amber, then a moment of all-red before the cross street is let through — and a driver
  asks for the light on their own approach. Over five minutes the two streets get an even share of the green
  (48/52, the rest amber and all-red). Both the van's own red-light judgement and the test autopilot read their
  own approach too; the check fails on the old behaviour, at the first frame.
- **Cars had no right of way at a junction, so they drove through each other.** Two cars that arrived at a
  four-way stop together both pulled out, and a left turn crossed the oncoming lane without looking. Worse, two
  that met in the middle each stopped for the other and neither ever moved again: one measured pair sat nose to
  nose for the remaining six minutes of the run, with the rest of the street queued behind them. A junction is now
  claimed by the car crossing it — one at a time at a stop sign; at a light, a queue rolls through together but
  cross traffic and an opposing left turn still hold you — and it is released when the car is clear of the box,
  with a timeout so a car shoved by the van can never hold the town up.
- **A left turn pulled out in front of traffic it could see.** The gap it looked for was a fixed 340 px, which a
  car at the speed limit covers in under two seconds — less than the turn takes. A left turn now waits for a gap
  measured in time (about three seconds), and treats a car that has already stopped as not coming, which is what
  lets two drivers facing each other both waiting to turn left get on with it.
- **A car following the lane could not see one crossing in front of it.** It watched a 44 px strip straight ahead,
  but a car mid-turn lies across the road rather than along it, so it fell outside that strip until it was too
  late to brake. A turning car is now watched for from much further to the side.
- **Someone hit by the van was left standing in a traffic lane** until, about twelve seconds later, they teleported
  back to the kerb to start their next crossing. They now carry on to the kerb, as a person would, and a cooldown
  stops one pass being scored twice. People also start on the painted crosswalk instead of jumping to the far
  kerb the first time they cross.
- **Two cars could start the drive parked inside one another**, since they were scattered at random with no check.
  A new car now looks for a stretch with room.
- **No two drives of the same day were alike.** The cars' starting places and speeds, which way each turns at each
  junction, and when people cross all came from `Math.random()`, so a route day could not be replayed and a
  problem in the traffic could not be reproduced. They now come from one seeded stream drawn from the day's own
  seed, so the same day drives the same twice — which is how the fixes above were tracked down.

After the fixes, eight towns were run for five minutes each (40 minutes of traffic) with nothing found: no
overlaps, nothing off the road, in a building or on the wrong side, nobody standing in a lane, and the longest
any car waited was 13.6 s — a red light plus the queue in front of it. Four of those towns are now the
`town-traffic` check in the suite.

### Hub

- **Three scenario briefs could not be read.** The brief was a fixed 540 px tall, and with a three-line description
  and five or six things to practise, the controls line ran under the star ratings: Sort Belt, Road Hazards and
  After a Fender-Bender (Lift Right was 5 px from it). The brief now grows to fit what it says. A new check,
  `hub-briefs`, opens every scenario's brief from the hub as a trainee does and fails if any of it runs together or
  off screen; it was confirmed to fail on the old layout, on exactly those three.
- **A full practice day left Start doing nothing.** `scenariosPerDay` (`data/config.js`) is 99, so this cannot happen
  with the shipped settings, but at a lower limit, reloading on the day summary brought you back to a hub where the
  brief's Start button silently did nothing. It now reads "Day full: bank it ▶" and opens the day summary. An unused
  "day log" panel, the only other way in, was removed.
- The Road Hazards brief said "S brake / hold to reverse". Reversing takes a stop, lifting off, then holding S, as
  the drive's own HUD says; the brief now says so too.

### M6 · Loading the Truck

- **Find It Fast was unplayable.** `showLabel` emptied the side panel *before* checking which mode it was in, and
  hovering is how you read the shelves, so the first hover erased the address you were hunting for, its
  consignee and the round timer. The target never advanced and the run could never end.
- A correct pick did not close the round, so clicking the target again skipped rounds and inflated the score, and
  a click on anything else in the next 0.7 s counted as a wrong pick on a round already won. The end of the run
  could also be scored twice.
- The panel read "STOP 5 OF 5" on round 4 and "STOP 6 OF 5" on round 5 (it printed the address's stop number
  over the round count).
- Wrong picks were counted across the whole run, so one bad round could zero every other round's accuracy.
- The misload lesson — the thing the scenario exists to teach — was discarded whenever the misload was found
  quickly.
- **Load for the Route:** the 12-package cart overflowed its panel and rows 4–6 rendered *on top of* the weight
  bar, the strap button and "Close up & roll out", and stole their clicks. The placement feedback and the scoring
  used different rules, a package in the dangerous-goods bay was penalised twice, and dumping everything on the
  floor passed the section check.
- Shelf captions were painted underneath the packages; they now sit on the shelf rail. Addresses on the package
  labels shrink to fit instead of clipping mid-word ("5 Harbor Vi").

### M7 · Pickups & Paperwork

- **The count exercise could not be failed.** In all three sets the manifest matched the pieces on the counter,
  so two of the three answers were marked correct — while the scenario card promised "a manifest that does not
  quite match the counter". The business pickup now has a real discrepancy to catch.
- Pieces could be inspected and decided again and again, each time scoring again; the paperwork check could be
  resubmitted the same way.
- The dangerous-goods set logged to a category it does not declare, which moved the score without moving the stars.
- Refusing a piece that should have been accepted gave no feedback about why.
- The international set ended "0 pieces accepted" and then played the signature flow for a pickup that picked
  nothing up.
- Layout: the courier stood on top of the first piece, the shipper stood half behind the side panel, both people
  drew over the counter front, and the side panel ran off the canvas.
- **The shipper's conversation was drawn over the manifest panel.** Its answers and caption box take the right-hand
  side of the screen, where the panel sits, so the answer cards covered the lower half of the panel with its border
  showing between them. The panel now steps aside while the shipper is talking and fades back in for the count.
  With it out of the way, the lobby behind turned out to stop 30 px short of the right-hand edge (a dark strip the
  panel had mostly hidden); it now reaches the edge.

---

## Before and after

The befores (`docs/progress/`) were taken on 17–18 September, before this pass. The afters (`docs/qa/`) are the same
moments in the finished build, played rather than posed: the deeper ones are captured while a scenario's own golden
path plays it on the real controls, and the route-day ones come from the `route-day` flow's day as a new courier.
Where a moment is not reproducible exactly (a random stop, a timer), the after shows the same screen at the nearest
equivalent point.

| | Before | After | What changed |
| --- | --- | --- | --- |
| 01 | <img src="progress/01-station-hub.png" width="360"> | <img src="qa/01-station-hub.png" width="360"> | The hub itself was sound. The fixes are behind it: ENTER on a brief no longer starts the route day, and three briefs no longer run under their star ratings (see Hub). |
| 02 | <img src="progress/02-street-van.png" width="360"> | <img src="qa/02-street-van.png" width="360"> | Shared street art, unchanged. |
| 03 | <img src="progress/03-doorstep.png" width="360"> | <img src="qa/03-doorstep.png" width="360"> | At the door. Stops now score, report and caption as the scenario they belong to; the attempt-at-the-door rule respects exceptions that expect none. |
| 04 | <img src="progress/04-cargo-shelves.png" width="360"> | <img src="qa/04-cargo-shelves.png" width="360"> | The cargo shelves. E in the van now offers the shelves or the door depending on what you hold. |
| 05 | <img src="progress/05-photo-pod.png" width="360"> | <img src="qa/05-photo-pod.png" width="360"> | Photo POD, unchanged on screen; the handheld's decision lists no longer highlight their first answer as if it were the right one. |
| 06 | <img src="progress/06-conversation.png" width="360"> | <img src="qa/06-conversation.png" width="360"> | Conversations. The street shot used to cut the van's logo to "Ex" and push the house number off the edge; the van, the courier in the open cab and the house number are now all in frame. |
| 07 | <img src="progress/07-dog-porch.png" width="360"> | <img src="qa/07-dog-porch.png" width="360"> | Dog Encounter. Backing away from a charging dog, the recommended play, no longer costs the attempt point, and a dog secured at one stop no longer silences the next. |
| 08 | <img src="progress/08-heat.png" width="360"> | <img src="qa/08-heat.png" width="360"> | Heat Wave: the warning signs after standing in the sun without water. |
| 09 | <img src="progress/09-loading.png" width="360"> | <img src="qa/09-loading.png" width="360"> | Load for the Route. The 12-package cart now fits its panel instead of drawing over, and stealing clicks from, the weight bar and both buttons; addresses shrink to fit their labels ("5 Harbor Vi" → "5 Harbor View"). |
| 10 | <img src="progress/10-pickup.png" width="360"> | <img src="qa/10-pickup.png" width="360"> | Declare It or Refuse It. The shipper's answers used to be drawn over the manifest panel; the panel now steps aside while the shipper talks. |
| 11 | <img src="progress/11-stop-report.png" width="360"> | <img src="qa/11-stop-report.png" width="360"> | Stop report. It used to stop at 13 rows whatever they said; everything now fits, or failures come first and the rest is summed up. |
| 12 | <img src="progress/12-conversation-storm.png" width="360"> | <img src="qa/12-conversation-storm.png" width="360"> | Storm Warning, which used to crash on a choice (`disableInteractive` of undefined). The street is reframed as in 06. |
| 13 | <img src="progress/13-morning-briefing.png" width="360"> | <img src="qa/13-morning-briefing.png" width="360"> | Morning briefing. The courier stood behind the manifest board (only their head showed) and the fifth stop sat on the board's edge. |
| 14 | <img src="progress/14-town-driving.png" width="360"> | <img src="qa/14-town-driving.png" width="360"> | Driving. The HUD rode the zoomed world camera, so it floated in a shrunken box; it is now fixed to the screen, with the new D/R gear badge under the speed limit. The van runs on the new vehicle model. |
| 15 | <img src="progress/15-town-overview.png" width="360"> | <img src="qa/15-town-overview.png" width="360"> | The town, zoomed out. The HUD was drawn in the world (the box mid-town); the station now fits its block instead of standing in 2nd St, and big buildings no longer run into their neighbours. |
| 16 | <img src="progress/16-day-debrief.png" width="360"> | <img src="qa/16-day-debrief.png" width="360"> | Debrief. "What to work on" repeated the same line and ran under "Back to the station"; it now fits and ends above the button. The after is the `route-day` flow's careful day, which earns full marks. |
| 17 | <img src="progress/17-title-street.png" width="360"> | <img src="qa/17-title-street.png" width="360"> | Title screen, with a saved profile. |
| 18 | <img src="progress/18-pretrip-closeup.png" width="360"> | <img src="qa/18-pretrip-closeup.png" width="360"> | Pre-trip close-up. The tread gauge keeps its reading if you close the close-up and come back; full marks can now be earned. |
| 19 | <img src="progress/19-road-hazards.png" width="360"> | <img src="qa/19-road-hazards.png" width="360"> | Road Hazards at the same moment of the drill. Before: 39 mph four seconds after pulling away, already ticketed for speeding. After: a loaded step van's 1 mph at three seconds, on the way to 25 mph in about 8 s. |
| 20 | <img src="progress/20-sort-scan.png" width="360"> | <img src="qa/20-sort-scan.png" width="360"> | Sort Belt. Bins from earlier waves no longer stay on the floor under the new layout. |
| 21 | <img src="progress/21-lift-posture.png" width="360"> | <img src="qa/21-lift-posture.png" width="360"> | Lift Right, carrying. The spine gauge read HEAVY for a box carried properly and drained Back Health; carried upright it now reads SAFE, while a bent back still pegs it at DANGER. |
| 22 | <img src="progress/22-fender-bender.png" width="360"> | <img src="qa/22-fender-bender.png" width="360"> | After a Fender-Bender, reframed as in 06; dispatch on the radio no longer walks on stage. |
| 23 | <img src="progress/23-pretrip-walkaround.png" width="360"> | <img src="qa/23-pretrip-walkaround.png" width="360"> | The walkaround as it opens, on the driver side. The courier is now placed in the widest gap between the side's items; before, they stood right beside the fuel cap's. |
| 24 | <img src="progress/24-route-planner.png" width="360"> | <img src="qa/24-route-planner.png" width="360"> | Route Planner. The station was drawn over 2nd St, and map tooltips covered the pin they described (208 Birch Ln, before). |
| 25 | <img src="progress/25-label-check.png" width="360"> | <img src="qa/25-label-check.png" width="360"> | Label Check, now at the display's frame rate instead of 70 fps, and scored by the blind-call rule it teaches. |
| 26 | — | <img src="qa/26-pretrip-cab.png" width="360"> | The pre-trip cab view, recentred in this pass so it no longer runs off the left edge. |

---

## Second pass (24 September 2026)

After the first pass the owner raised two problems from their own play: the courier could walk out of the van, and
door prompts often didn't show until you wiggled back and forth. A second, wider review followed. Nine testers each
took one area, played it the way a trainee would, and filed findings in [`docs/review/`](review/). The owner asked
for good performance on integrated graphics and no UI glitches. The fixes were done in the work packages of
[`docs/review/FIX-PLAN.md`](review/FIX-PLAN.md) (WP0–WP9), in order; its Log records what each package changed and
which tests it ran.

### What the testers found

186 findings: 1 blocker, 47 major, 77 minor, 33 design questions and 28 polish.

| Review | Area | Findings | Blocker / major |
| --- | --- | --- | --- |
| [perf](review/perf.md) | Frame rate on the Intel UHD GPU | 3 | 1 |
| [stops-m5](review/stops-m5.md) | Doorstep stops: POD, exceptions, adult signature | 23 | 7 |
| [stops-m8](review/stops-m8.md) | Safety stops: steps, dog, heat | 21 | 11 |
| [driving](review/driving.md) | Road Hazards and the town drive | 14 | 5 |
| [routeday](review/routeday.md) | The route day end to end | 21 | 7 |
| [dialogue](review/dialogue.md) | The seven conversations and the briefing | 31 | 9 |
| [warehouse](review/warehouse.md) | Sort, lift, labels, loading, find | 23 | 4 |
| [pretrip-route-pickups](review/pretrip-route-pickups.md) | Pre-trip, route planner, pickups | 27 | 4 |
| [shell](review/shell.md) | Title, hub, menus, results, saving | 23 | 0 |

The findings fell into a few themes:
- **Prompts and staging:** prompts that only appeared at one exact spot, E doing something other than the prompt
  said, and characters standing where the story said they weren't.
- **Results that didn't match the play:** a run with a safety mistake still marked flawless, endings that forgot a
  mistake, and a recommended answer that was nearly always the longest.
- **Mouse only:** controls with no keyboard way to use them.
- **Performance:** frame rates on the Intel GPU well below the display's refresh rate.

Every finding now ends with a **Status** line: *fixed*, *fixed (decision)* where the fix needed a design call (26 of
them), or what was deliberately left alone and why.

### The owner's two examples

- **Walking out of the van.** In the van the courier stays in the cab doorway. Holding D or clicking outside does
  not walk them out. The only way in or out is E, with the step-down question, and a hint says so.
- **Prompts that need a wiggle.** The cause was that a prompt only appeared once the courier stood still, inside a
  narrow window that was sometimes on the other side of the door (the bell and the house number). Now each E spot
  sits on the thing itself, and its prompt shows the moment E would use it, while still walking.

Both were re-checked by hand on the finished build (pictures 01 and 02 below).

### What changed

The FIX-PLAN Log has the detail per package. In short:
- **WP0, performance:**
  - Shapes are baked once instead of re-triangulated every frame.
  - The three atmosphere overlays are one.
  - Conversation backdrops and stop skylines are baked into single textures.
  - Multisampling is off and the renderer uses a single-texture shader, the two settings the performance tester
    measured on the Intel GPU.
  - Phaser is served from the repo.
- **WP1, honest results:**
  - A critical mistake caps its category at one star, and a category nothing tested earns none.
  - Takeaways are ranked, critical mistakes first.
  - The headline never says FLAWLESS over a lost safety point.
- **WP2–WP3, stops and driving:** prompts, van confinement and hazards as described above. The driving changes:
  - Reverse is on its own key.
  - The stop line is clear of the crosswalk.
  - The parking bay is honest.
  - Pedestrians only cross when it is safe.
- **WP4, route day:**
  - Mixed stop types in one fixed town.
  - A load report before rolling out.
  - A seeded pre-trip in the day's weather.
  - Restarts and reloads that keep the day's record.
  - A debrief kept with the day.
  - Route-day stars count toward the rank.
- **WP5, conversations:**
  - The timers scale with the reading, and ↑ reads earlier lines.
  - The chosen answer stays on screen.
  - Staging matches the narration.
  - Endings remember every mistake.
  - m8-incident is rewritten in US English.
  - Answers are rewritten so that length gives nothing away. The recommended answer is now the longest in 11 of 44
    decisions and the shortest in 13; content validation checks this.
- **WP6, warehouse:**
  - Keys act on the package just scanned, and each bin keeps its number for the whole shift.
  - Lifts need the carry and the turn, and reach is scored.
  - Every game works by mouse and by keyboard.
  - Pausing ends a drag cleanly.
- **WP7, pre-trip, planner and pickups:**
  - Close-ups describe what is there without giving the verdict, and the latches have a pull test.
  - The sides of the truck and its lamps are the right way round, and the tire defects are real.
  - The planner's result card compares like with like.
  - A short count gets a recount.
  - Paperwork comes first in the international pickup.
  - A and R accept and refuse.
- **WP8, shell:**
  - A keyboard focus ring, and key hints on the buttons.
  - Restart and Quit ask first, and the pause menu has a Controls card.
  - The game pauses on focus loss.
  - Settings has a volume control.
  - A notice when progress cannot be saved.
  - A NEXT scenario for new hires.
  - Text of at least 13 px.
  - US English throughout.

Found while testing the fixes (in the WP8 log):
- **Heat stop:** the water and the AC could not be reached from inside the van. They are now one spot at the back
  of the doorway that asks which one you want.
- **Pre-trip:** the under-truck checkpoint sat under the "Climb into the cab" button.
- **Pause menu:** ESC on the van's shelves opened the pause menu.

Found by the owner playing a route day on 25 September, and fixed:
- **The van's contents changed at every stop.** Each stop filled the shelves with its own package and two made-up
  look-alikes. Now the van holds the day's load: every piece still on board, on the shelf it was loaded onto.
  Delivered pieces are gone, and one that couldn't be delivered rides on.
- **"Talk to reception" did nothing at a route-day business,** because those stops have no scripted conversation.
  Now the receptionist greets you, and the delivery is recorded on the handheld.
- **Stop messages were hard to read over busy backdrops,** such as the lobby's name sign. They now have a dark
  backing.
- **Messages vanished before they could be read** (the receptionist's two-line instruction was up for 2.2 s). Every
  message and pop-up now stays up for a second plus about a second per 18 characters.
- **The pre-trip marked a correct Pass wrong on two items whose close-ups didn't show the fault:**
  - The brake now plays out when pressed. A good pedal stops firm at the first mark; a failing one keeps creeping
    toward the floor past the marks. Pass and Flag unlock once it has settled.
  - The perished wiper rubber now visibly hangs off the blade.
  - On review of all 21 close-ups, two more were too subtle. The rear tire's sidewall gouge is now a real gash (and
    every tire shows its sidewall, so the band itself is no longer a giveaway). The greasy film is now on the bottom
    step, as the defect says; it was drawn faintly on the top one.
  - The report card is sized to its rows.

Then, on review, three items that had been listed as decided against, or left partly done, were fixed as well:
- **Sitting in the van cooled the courier without the AC.** In the heat stop, the parked van now only stops the
  courier heating up. The AC is what brings the temperature down, and a hint points to it.
- **Labels on the smallest loading-shelf boxes were too small to read.** Every box label is now two lines: the
  number and unit over the street, in larger type.
- **Two conversations mentioned things the stage didn't show.**
  - In Damaged on Arrival, the courier now lifts a visibly crushed, dripping box, and the recommended answer is to
    set it down. Before, the courier stood holding the leaking box while the right answer said not to touch it.
  - In Two Stops, the three boxes are carried in as a stack, not on an unseen hand truck.

The automated route-day test now fails if "Talk to reception" does nothing, or if the van shelves don't hold the
load that is still on board.

### What the testers didn't get to

Each review ended with a list of things its tester didn't have time to try (the "Revisit" section of each file in
[`docs/review/`](review/)). On 25 September every item was played or read through.

**Fixed:**
- **Driving penalties:**
  - The seatbelt and headlights cost points once per stretch; they used to repeat every 5 seconds, so one slip
    could cost 24 points in a leg.
  - Braking hard enough to stop short of a pedestrian is no longer marked as failing to yield.
  - The handheld at a red light counts as used at the wheel, as the lesson says.
  - Reverse is strong enough to back the van off a lawn.
- **Route day:**
  - A defect correctly flagged in the pre-trip is shown as fixed by the shop before the first leg (8 minutes on the
    clock, no penalty). It used to be never mentioned again.
  - On about half the signature stops at homes, a household member answers and signs, so the printed name has to
    be theirs. Before, the only wrong choice was "Occupant".
- **Doorstep stops:**
  - The van shelves work with the arrow keys and ENTER, with a clear outline on the picked box.
  - No "E" prompt is drawn underneath an open card.
  - The door-tag question no longer argues for the tag.
  - A stop's brief no longer says in advance that nobody will be home.
  - The brief card is as tall as its text.
  - A clinic lobby's name sign is no longer covered by the heat meters.
- **Warehouse games:**
  - Lift Right:
    - The size-up card no longer covers the courier.
    - A box lowered over the pallet rests on its boards instead of sinking into them.
    - The courier pushes the hand truck, where it used to roll on its own.
  - Label Check:
    - The guide closes instantly, so the next SPACE isn't lost.
    - The verdict keeps its highlight when a station is hovered.
    - The top and base markers show ▲ / ▼, matching their keys.
  - Load for the Route: the middle shelf is signed "UNDER 35 LB", matching its rule.
  - Load for the Route and Find It Fast show their counts on the results card.
- **Pre-trip, pickups and planner:**
  - The pre-trip clock stops at sign-off.
  - The pickup checklist no longer shows behind the intro card.
  - The customs invoice has an HS tariff code, currency and gross-weight line.
  - A reminder at the bottom of the screen no longer covers a card's buttons.
  - The route planner's no-deadline pieces are Express Saver, not Ground mixed into an Express loop.
- **Menus:**
  - A click right after closing a card with ESC now reaches the screen behind it; the card's fading backdrop used to
    swallow it.
  - Test links no longer promise career stars they don't save.

**Checked and already right:**
- The Sort Belt shift only ends on a clear belt.
- ESC does nothing on a stop's report card.
- The page has no missing-file errors on load.
- A practice scenario can't touch a route day in progress.
- Traffic stops short of a van stopped at an angle across its lane.
- Backing into a building stops the van and logs a collision.
- The water, car-door and ball hazards are judged on speed and inputs as intended.
- Heat carries over between stops, the awning counts as shade, and a lobby cools you.
- The dog stop's "it's friendly, go on in" branch plays out with the dog, the gate and the owner.
- Where's My Package?! plays to its end on the worst answers.
- The conversation feedback card comes up in about 0.4 s in real time. The delay the tester saw was the turn-based
  play tool.
- Snow and storm route days render and drive properly.
- At a 1366×650 laptop viewport the hub is shown at 90%, and its smallest text is about 12 px on screen.

**Not checkable here:** sound (the cloud browser has no audio), and frame rate on a real 60 Hz 1080p screen, night
scenes and snow. The owner's Intel run covers the frame rate at the start of each scenario, where it measured
131–145 fps.

### Frame rate on integrated graphics

The before column is the performance tester's Intel UHD baseline ([perf.md](review/perf.md), as the game shipped
then). The middle column is their A/B on the same laptop with multisampling off and the single-texture shader:
the two renderer settings the build now uses (`src/main.js`). The shipped build also has the baked shapes, the
merged overlays and the baked backdrops, which that A/B did not have. The last column was measured on the owner's
laptop on 25 September 2026: `QA_GPU=default` and `QA_FPS_FLOOR=60` with `node test/qa.js --pass boot`, on the Intel
UHD Graphics (ANGLE/D3D11). It passed 28 of 28. Every scenario runs at 131–145 fps, against the target of 60. The
headless browser's frame cadence tops out at about 144 there, so most scenes are at that ceiling. The requirement
for integrated graphics is met.

| Scene | Before (Intel, as shipped) | Renderer settings only (Intel, measured A/B) | Shipped build (Intel) |
| --- | --- | --- | --- |
| Conversation (m3-missing) | 48.8 | 65.4–68.5 | 144 |
| Conversation, storm (m4-storm) | 46.1 | 66.1 | 144 |
| Doorstep stop (m5-pod) | 48–55 | 76.5 | 143 |
| Heat stop (m8-heat) | 45.0 | 58–64 | 133 |
| Pre-trip (m1-pretrip) | 56.9 | 83.6 | 144 |
| Driving drill (m1-driving) | 65.6 | 100.7 | 145 |
| Route planner (m1-route) | 68.4 | 104.5 | 144 |
| Sort / lift / labels | 72.4 / 69.0 / 67.4 | 111.9 / 99.2 / 100.7 | 144 / 145 / 145 |
| Hub | 50.0 | 89.4 | not in the boot pass |
| Loading (m6-load) | 70.9 | 96.0 | 131 |
| Every other scenario | | | 138–145 |

For a relative check that runs anywhere, the same scenes were measured in the cloud under software WebGL
(SwiftShader, far slower than any real GPU) before and after WP0: conversation 8 → 26 fps, doorstep stop 8 → 21,
labels 13 → 30, business pickup 14 → 33.

### Tests

- **Final suite:** the full suite (`node test/qa.js --shots`) on the finished build: **28 of 28 clean** (24 scenarios and four flows, every golden path finishing with full marks).
  - It ran under software rendering, so the frame-rate floor was switched off (`QA_FPS_FLOOR=0`).
  - The boot pass on the owner's laptop, on the Intel graphics (see above), is 28 of 28 at a 60 fps floor. A run on
    the laptop's gaming GPU was not needed: trainees use office computers.
- **Content validation:** `index.html?dev=1` is clean.
- **Syntax:** `node --check` passes on all 97 source files.
- **Golden-path changes:** the scripted playthroughs were updated where the UI changed:
  - the new pause-menu confirm;
  - the new keys in Sort Belt and Lift Right;
  - the water and AC spot in the heat stop;
  - a courier who coasts past a spot at a low frame rate now steps back to it.

  No assertion was weakened. The hub-briefs check now measures a button by its own size, not its shadow margin.

### Decided against, or left for later

- **Several named profiles per browser, and a printable training record** (SHELL-14). One profile per browser
  remains. New Profile says whose progress it erases and asks first, and a failed save is now visible.
- **Which vehicle the couriers drive.** The pre-trip now has a hydraulic-brake step van's oil pressure gauge. This
  is one entry in `data/m1_pretrip.js` and is worth confirming.

### Before and after

The befores are the testers' screenshots, and the afters are the finished build at the same moment.

| | Before | After | What changed |
| --- | --- | --- | --- |
| 01 | <img src="qa2/01-van-exit-before.png" width="360"> | <img src="qa2/01-van-exit-after.png" width="360"> | The owner's first example. Holding D in the van used to walk the courier out through the cab, in mid-air over the sidewalk. Now they stay in the doorway, and the hint says E climbs out. |
| 02 | <img src="qa2/02-door-prompt-before.png" width="360"> | <img src="qa2/02-door-prompt-after.png" width="360"> | The owner's second example. Standing at the bell and the house number showed no prompt, because their E spots were on the other side of the door. Now "Ring the doorbell" shows while the courier is still walking up. |
| 03 | <img src="qa2/03-pretrip-closeup-before.png" width="360"> | <img src="qa2/03-pretrip-closeup-after.png" width="360"> | Pre-trip close-up. The test button sat under Pass and Flag, so a second press could land on a verdict. Now the picture, the test (T) and the verdicts (P / F) are stacked apart. |
| 04 | <img src="qa2/04-hub-first-visit-before.png" width="360"> | <img src="qa2/04-hub-first-visit-after.png" width="360"> | A new hire's first hub. There is now a NEXT scenario, and ENTER opens it instead of the route day. The stat tiles have labels, the day badge is a flat label, the minimum text size is 13 px, and the Safety card uses the same type as the others. |
| 05 | <img src="qa2/05-brief-best-line-before.png" width="360"> | <img src="qa2/05-brief-best-line-after.png" width="360"> | Scenario brief. The best-score line was printed over the blurb. Now it is in the header, and the categories are in one order (Safety · Efficiency · Service). |
| 06 | <img src="qa2/06-pause-menu-before.png" width="360"> | <img src="qa2/06-pause-menu-after.png" width="360"> | The pause menu. It gained a Controls card, confirmations on Restart and Quit, key hints (ESC, C, R, Q), and "Quit to the station" for the screen the hub is. |

---

## What this pass does not cover

Every defect found has been fixed; nothing is left open in the table above. These are the limits of what was
checked, for whoever takes it further:

- **Browsers and devices.** Tested in Chromium (Edge, headless, GPU-accelerated) at 1280×720 with a mouse and
  keyboard. Firefox, Safari, touch screens and gamepads were not tested. Frame rates were measured on this laptop's
  two GPUs (see Verification), not on other hardware.
- **Frame rate on integrated graphics** was measured but not tuned in the first pass. The second pass tuned it:
  131–145 fps on the Intel UHD (see Second pass). The first-pass note below is kept for the record. On this laptop's Intel UHD the scenarios run at
  41–76 fps: everything plays correctly, but below the suite's 100 fps floor, which is set for the discrete GPU. There
  is no one defect behind it (the per-frame waste found earlier is fixed). Each scene is layered 2D art: sky, far
  hills, the house, its front, props and three full-screen atmosphere overlays (tint, darkness, vignette), about seven
  screens' worth of pixels a frame, and removing any one layer only buys 1–3 ms. If trainees will be on integrated
  graphics, the next step is to compose the static layers of a scene once, into a single texture, rather than
  drawing each one every frame.
- **Sound** is generated in the browser. The suite checks that nothing errors, not what it sounds like.
- **Wrong answers.** The golden paths play the recommended line. Wrong answers are covered by the content checks
  (every conversation's links, endings, grades and points; the recommended answer never out-scores), by twelve
  seconds of random play per scenario, and by targeted counter-tests where a fix needed one (a bent-back lift
  still strains, the old brief and town layouts fail their checks). Not every wrong branch is played through
  on screen.
- **Route days** are checked leg by leg for days 1–10 and played end to end on day 1. The town's layout is checked
  on 40 days' towns at every start-up with `?dev=1` (it was checked on 200 during this pass). The route flows clear
  the traffic so a leg is repeatable; the traffic itself is checked separately by `town-traffic`, which runs four
  towns with no player and tests the invariants every frame, and by the Road Hazards drill, which drives the whole
  town with traffic and hazards live. What is not covered there is the interaction of a *player* driving badly with
  dense traffic — that is left to the random-play pass.
- **Training content** was checked for consistency with itself (what a card promises, what the scoring rewards,
  what the scene can show), not against FedEx's official procedures. As the README says, it is illustrative.
