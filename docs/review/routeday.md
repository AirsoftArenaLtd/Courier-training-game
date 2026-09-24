# Route day, end to end: human-style review

Tester area: **routeday** (a whole route day start to finish, then later days). Play tool on port 9308,
screenshots in `test/out/review/routeday/`. Findings are appended as they are found.

Path played: `index.html?dev=1` → new profile → hub → "Start the route" → morning briefing → pre-trip → loading →
drive each leg → each doorstep stop → debrief → next day. Focus: the seams between parts, what carries over or
resets, the generated stops (notes, addresses, packages, manifest, map, house), time and weather continuity, HUD and
objectives, pause / restart / quit in each part, reloading mid-day, and whether the debrief matches the play.

## Findings

Day 1 as played (seed = day 1, weather "cloudy" / "Overcast"): 412 Birch Ln (Sam Okafor, not home), 104 Maple Ave
(Marcus Bell, not home), 405 Maple Ave (Ray Ruiz, not home), 304 Maple Ave (Helen Ortiz, not home), 313 Maple Ave
(Tomas Vela, home, ADULT SIGNATURE, note "Please leave behind the planter").

### ROUTEDAY-1: Morning briefing says "Good." after a wrong answer, and logs the check as -1/2
- **Severity:** minor
- **Where:** route day → morning briefing (ShiftBriefScene), day 1 topic "Three points of contact"
- **Repro:** new profile → Start the route → Enter through the first line → pick 3 ("Holding the door frame while you
  step down").
- **Expected:** a neutral or corrective close.   **Actual:** the NOT QUITE card is followed by Dispatch's fixed line
  "Good. Go do your walkaround." The day log then holds `safety -1/2 Morning safety check` (a negative score in a
  check line).
- **Evidence:** /texts after the choice; `OTR.save.data.shift.log.items[0]`.
- **Suspected cause:** `data/shift_briefs.js:23` (`b2` is the only next node for all three choices; same shape in the
  other briefs).
- **Suggested fix:** branch the close on the grade ("Good." / "Remember that out there."), and score a wrong answer
  0/2 rather than -1/2.

### ROUTEDAY-2: Keys pressed to get through the briefing fall through and dismiss the pre-trip's intro card
- **Severity:** minor
- **Where:** briefing → pre-trip seam
- **Repro:** at the end of the briefing, press Enter a few times (as people do to skip text). The briefing ends 400 ms
  after its last line and the pre-trip opens; the next Enter dismisses its "how to" card before it can be read.
- **Expected:** the first card of a new part ignores input for a moment (or needs a click on its button).
  **Actual:** my 4 extra Enters left the pre-trip already running (timer 0:06) with no intro ever seen. Reproduced on
  day 2 (5 Enters after the answer: pre-trip at 0:02, no card). When the briefing is left by clicking, the load's intro
  card does show, so it is only keyboard users who lose it.
- **Evidence:** `test/out/review/routeday/04-pretrip-intro.png`, `63-day2-pretrip.png` (timer running, no card).
- **Suggested fix:** swallow key input for ~600 ms after each phase transition, or require the intro card's button.

### ROUTEDAY-3: The pre-trip ignores the day's weather and time (always a clear sunny morning)
- **Severity:** polish (minor on rain / snow / storm days)
- **Where:** pre-trip phase of a route day
- **Repro:** day 1 is "Overcast" on the briefing, hub card and drive; the pre-trip shows blue sky and the sun.
- **Expected:** the walkaround in the day's weather (rain on day 2, snow on day 4...). **Actual:** always clear:
  day 2 is "Rain" on the hub, the drive and the stop (rain falling), but the pre-trip between them is sunny.
- **Evidence:** `04-pretrip-intro.png`, `63-day2-pretrip.png` vs `65-day2-drive.png` / `66-day2-stop1.png`;
  `src/scenes/m1/PreTripScene.js:45` and `:53` hard-code
  `tod: 'morning', weather: 'clear'`.
- **Suggested fix:** in shift mode take `OTR.shift.state.weather` for the stage and atmos.

### ROUTEDAY-4: Defects missed in the pre-trip are saved as "rolling out with you" but nothing ever uses them
- **Severity:** design
- **Where:** pre-trip → rest of the day
- **Repro:** in the pre-trip pass the defective "Cargo door" (the report says THIS TRUCK ROLLED OUT WITH DEFECTS).
  Drive and deliver the day.
- **Expected:** a consequence somewhere (dispatch stops you at the gate, the cargo door rattles open on the first
  turn, the debrief names the defect). **Actual:** only the pre-trip line (3/4) in the log; the truck drives all day
  with an unlatched cargo door and nothing else mentions it.
- **Evidence:** `src/scenes/m1/PreTripScene.js:325-327` writes `OTR.shift.state.truck.defects`; a grep of `src/` finds
  no reader. The pre-trip's defects are also rolled with `Math.random` (`PreTripScene.js:29-32`), not the day's
  seed, so "days are seeded" does not hold for this part.
- **Suggested fix:** read `truck.defects` in the drive or the debrief ("You rolled out with: cargo door latch").

### ROUTEDAY-5: The load manifest has five extra pieces for addresses that are not on the route; they are never delivered
- **Severity:** major (content that contradicts itself)
- **Where:** loading phase → stops → debrief
- **Repro:** day 1 load: "Day 1. 10 pieces for 5 stops." The cart holds s1-s5 (the route) plus x1-x5:
  `x1 stop1 Sam Okafor 414 Birch Ln`, `x2 stop2 Marcus Bell 106 Maple Ave`, `x3 stop3 Ray Ruiz 407 Maple Ave`,
  `x4 stop4 Helen Ortiz 306 Maple Ave`, `x5 stop5 Tomas Vela 315 Maple Ave`.
- **Expected:** every piece loaded belongs to a stop on the route, and every piece is delivered or accounted for.
  **Actual:** each extra is the same customer at the house two doors up, tagged with that stop's number, so the
  trainee is told to load "414 Birch Ln" as a stop-1 piece. At the stop the very same label is the wrong-address
  decoy on the van shelf (the stop's `decoys[0]`), and the five extras simply vanish: nothing asks for them, the
  debrief never counts them. The intro also explains section C "stops 7-9" on a 5-stop day. Worse, at stop 3 the
  scanner rejects the very piece the load assigned to stop 3: "✗ WRONG STOP: this one goes to 407 Maple Ave". The
  labels disagree too: x1 "414 Birch Ln" weighs 4 lb in the load and 5 LB on the stop shelf, x2 "106 Maple Ave" 11 lb
  vs 5 LB; and stop 4's piece is FRAGILE in the load but its label at the stop has no fragile mark
  (`loadingContent` invents `fragile` and the extras' weights; the stop keeps its own).
- **Evidence:** `src/core/shift.js:199-203` (extras built from `r.stop.decoys[0]`, `stop: Math.min(9, i + 1)`).
- **Suggested fix:** make the extras real second pieces for the same address (delivered at that stop), or give them
  their own stop numbers that are clearly another route, and do not reuse the loaded labels as wrong-address decoys.

### ROUTEDAY-6: "Close up & roll out" goes straight to the drive: no load report, and the load does not carry to the stops
- **Severity:** minor / design
- **Where:** loading → drive seam
- **Repro:** load with a mistake (I put the stop-5 piece on section A's top shelf: "top shelf is for light packages"
  and "Stop 5 belongs in section B", which also pushed a stop-1 piece into section B). Strap, roll out.
- **Expected:** a short report like the pre-trip's ("2 pieces out of place"), since this is where the lesson is.
  **Actual:** the town map appears at once; the log quietly holds `efficiency 3/4 Truck loaded in stop order`,
  `safety 2/3 Load secured safely`, seen only at the end of the day. Nothing about the load reaches the stops either:
  the van shelves at each stop are the stop's fixed package plus decoys, whatever was loaded where
  (`packagesLoaded` is declared in `src/core/shift.js:70` and never written).
- **Suggested fix:** show the load report card before rolling out; optionally have each stop's shelves reflect the
  load (a piece in the wrong section is harder to find).

### ROUTEDAY-7: P parks the van up on the sidewalk, outside the marked zone and across the crosswalk
- **Severity:** major (teaches the wrong thing; the zone the toast talks about is not enforced)
- **Where:** drive leg 1 (driven by hand), arriving at 412 Birch Ln
- **Repro:** overshoot the dashed zone and run up onto the sidewalk past it (I drifted right). Edge forward until the
  body centre is no more than ~130 px from the street centre, stop, press P.
- **Expected:** "Not at the stop yet — pull in to the kerb inside the marked zone". **Actual:** accepted:
  `Parked at 412 Birch Ln (at an angle)` 1/2 and the stop starts; the van sits entirely on the sidewalk, to the right
  of the zone and over the crosswalk. Had it been straight it would have scored 2/2 "neat" (the kerb gap is negative).
- **Evidence:** `test/out/review/routeday/17-park-sidewalk.png`; body centre (3824, 2345), street y 2220, lot park x
  3753.
- **Suspected cause:** `src/scenes/shift/TownDriveScene.js:1053` accepts `|bc.y - street| <= ROAD/2 + 40` (40 px past
  the kerb) and `along <= 150`, wider than the drawn zone; `gapM` can go negative and still count as "neat" (`:1067`).
- **Suggested fix:** require all four wheels on the road and the body inside the drawn zone; treat a negative gap as
  "on the kerb".
- **Status:** fixed — see DRIVING-10: a van on the sidewalk, outside the drawn zone or over a crosswalk is refused
  with a message saying what to fix, and a negative kerb gap can no longer count as neat.

### ROUTEDAY-8: The drive HUD counts stops against the stops left: "STOP 2 OF 4", "STOP 3 OF 3"...
- **Severity:** minor (confusing on every leg after the first)
- **Where:** town drive, legs 2-5 (top-left HUD)
- **Repro:** finish stop 1 and press "Next stop". The drive HUD reads `STOP 2 OF 4`; the stop scene and the hub say
  "Stop 2 of 5".
- **Expected:** "STOP 2 OF 5". **Actual:** the total is the number of stops *remaining*, so it shrinks as the index
  grows (leg 3 "3 OF 3", leg 4 "4 OF 2", leg 5 "5 OF 1").
- **Evidence:** /texts `123,46 61x13 d800 [TownDriveScene]: STOP 2 OF 4`; `36-leg2-start.png`.
- **Suspected cause:** `src/scenes/shift/TownDriveScene.js:1132` uses `this.route.length`, and `OTR.shift.toDrive`
  (`src/core/shift.js:227`) passes only the stops not yet done.
- **Suggested fix:** pass the day's total (`st.route.length`) to the scene and use it in `stopLabelFor`.
- **Status:** fixed — the shift passes the day's total to the drive, which reads "STOP 2 OF 5".

### ROUTEDAY-9: Pause → Restart on a drive leg silently wipes that leg's violations (a free do-over)
- **Severity:** major (assessment integrity)
- **Where:** town drive, any leg, pause menu
- **Repro:** leg 2: drive off the kerb, through the stop sign, without the belt (log: `-2 Drove over the kerb`, `-2
  Rolled through a stop sign`, `-3 Driving without your seatbelt`). ESC → Restart.
- **Expected:** either Restart is not offered mid-day, or it keeps what happened (or at least the debrief says "leg 2
  restarted"). **Actual:** the van is put back where the leg began and the three penalties are gone (log back to 29
  items, none of them); the clock does not move either. Any bad leg can be erased this way, as many times as wanted.
  The same holds for Restart in a stop (it re-creates the stop from scratch).
- **Suspected cause:** Restart re-runs `OTR.shift.toDrive`, which rebuilds the scene from `st.log` saved at the last
  arrival (`src/core/shift.js:220-231`).
- **Suggested fix:** in a route day, have Restart keep the log (or log a "restarted leg" line), or rename it "Retry
  from last stop" and show it in the debrief.

### ROUTEDAY-10: Reloading during a stop sends you back to the drive, the van creeps out of the zone, and re-parking scores twice
- **Severity:** major
- **Where:** stop 2 (104 Maple Ave) → reload → title → Continue → hub "Resume route"
- **Repro:** park at stop 2 (autopilot), dismiss the stop brief, `/reload`, Enter, Resume route.
- **Expected:** back in the stop (or at least parked at it). **Actual:** the drive opens with the van where it parked,
  in Drive, brakes off; it creeps forward, and P then says "Not at the stop yet" (body centre 178 px along, limit
  150). After reversing and pressing P again, the stop opens, but the day log now holds `2/2 Parked at 104 Maple Ave`
  and `1/1 Drove buckled up` **twice**, and the clock moved again (9:37 → 9:44 AM for no driving).
- **Evidence:** `OTR.save.data.shift.log.items` after the re-park; `40-resumed-at-stop2.png`.
- **Suspected cause:** the stop is not a saved phase (`OTR.shift.go` → `toDrive` for phase `route`); `arriveStop`
  (`src/core/shift.js:245-265`) adds to the clock and the park lines each time.
- **Suggested fix:** save "at stop N" when the stop opens and resume straight into it; or start a resumed drive with
  the park brake on and skip the duplicate park/belt lines for a stop already arrived at.

### ROUTEDAY-11: The house at the stop is not the house on the map
- **Severity:** polish
- **Where:** every stop
- **Repro:** day 1 stop 1, 412 Birch Ln (lot53): on the town map its roof is green (`17-park-sidewalk.png`); at the
  stop it is a cream two-storey house with a slate roof (`29-door.png`).
- **Expected:** the same colours in both views. **Actual:** the map tints roofs by lot index
  (`TownDriveScene.js:134`, `roofTints[i % n]`), the stop picks wall/roof/door from the day's random numbers
  (`src/core/shift.js:105`). Also every house on the route is the same two-storey model in new paint, which adds to the
  sameness of the day (see ROUTEDAY-16).
- **Suggested fix:** derive the stop's `roof` from the lot's tint (and its storeys/width from `lot.variant`).

### ROUTEDAY-12: Clocks disagree: the drive clock stands still while driving, the handheld lags the HUD
- **Severity:** minor
- **Where:** drive HUD, stop HUD, handheld
- **Repro:** drive leg 1 for a couple of minutes: the HUD clock reads 8:56 AM from start to finish, then jumps to
  9:11 at the stop. At stop 1 the HUD read 9:18 AM while the handheld (opened a moment earlier) read 9:17 AM.
- **Expected:** one clock, moving. **Actual:** the drive only adds time on arrival (`6 + elapsed/12` minutes,
  `shift.js:249`); the handheld text is set when it opens.
- **Suggested fix:** tick the drive clock from `st.clockMin + elapsed/12`; refresh the handheld clock each second.
- **Status:** fixed — the drive clock runs while driving (`st.clockMin + elapsed / 12`, the rate the arrival adds on),
  and the handheld's clock refreshes every second while it is up.

### ROUTEDAY-13: The generator puts "Please leave behind the planter" on an ADULT SIGNATURE package, and the stop rewards following it
- **Severity:** major (route-day variant of STOPS-M5-19/-20: here the content itself sets the trap)
- **Where:** day 1 stop 5, 313 Maple Ave (Tomas Vela, home)
- **Repro:** at stop 5 read the label: `ADULT SIG 21+` and `NOTE: Please leave behind the planter`; the scan says
  "Adult signature: check a valid photo ID, 21 or older." and "Customer note: Please leave behind the planter". Without
  ringing, handheld → Deliver → Left at location: the list offers "Behind the planter (as the note asks)". Pick it.
- **Expected:** the generator never pairs a leave-it note with a signature service; the handheld refuses "Left at
  location" for a signature package (or the stop fails it outright). **Actual:** the stop ends "313 Maple Ave ·
  DELIVERED"; the report gives `Left it in a sensible spot: behind the planter (as the note asks)` **2/2 ✓** next to
  `Left a signature-required package unattended -3` and `Signature-required package handed to a person 0/2`; the day
  counts it as delivered ("5 delivered · 0 exceptions") and the debrief never mentions it (ROUTEDAY-14).
- **Evidence:** `55-stop5-label.png`, stop 5 report /texts.
- **Suspected cause:** `src/core/shift.js:95` rolls the note independently of `service`; `:117` (`planterSpot`) and
  `:130` build the planter spot for any house with that note.
- **Suggested fix:** only roll notes for `service === 'standard'` (or add a signature-specific note like "Ring twice,
  I work from home"); grade a left signature package as a failed stop.

### ROUTEDAY-14: The debrief's "What to work on" hides most of the day's mistakes and never shows "Went well" on a rough day
- **Severity:** major (the debrief does not match the play)
- **Where:** ShiftDebriefScene after day 1
- **Repro:** play a day with many kinds of mistakes (mine: wrong briefing answer, a missed pre-trip defect, a misload,
  6× over the kerb, 3× through a stop sign, a red light, 3× wrong side, 4× failed to yield, a hit pedestrian, a
  bottom-of-steps drop, an unusable POD photo, 2× no knock, one unscanned exit, an adult-signature package left
  behind a planter).
- **Expected:** the worst items first (weighted by how often they happened), service mistakes as well as driving
  ones, a "+ N more" line, and something that went well. **Actual:** exactly five items: hit a pedestrian, ran a red
  light, **Morning safety check**, failed to yield (×4), wrong side (×3). Nothing about the kerb (×6, -12 in total),
  the stop signs, the adult-signature package, the load or the pre-trip; no "+ N more" line; no "Went well" (three
  perfect stops go uncredited).
- **Evidence:** `59-debrief.png`.
- **Suspected cause:** `src/scenes/shift/ShiftDebriefScene.js:74` keeps the gap of the *first* occurrence only
  (repeats do not add up); `:80` sorts by that gap and slices to 5 *before* the "+ N more" logic at `:111`, so that
  line can never appear; ties keep log order, so morning and driving items always beat stop items; `:115` shows "Went
  well" only if there is room left.
- **Suggested fix:** sum the gap over repeats, keep the full sorted list for the "+ N more" count, reserve at least
  one row per category, and always show one "went well" line.

### ROUTEDAY-15: Dispatcher tells a trainee who hit a pedestrian and ran a red light "Good hustle... you'll be unstoppable"
- **Severity:** minor (tone that contradicts the lesson)
- **Where:** debrief footer, day 1
- **Repro:** finish a day with Safety 0% (0 stars), Efficiency 3 stars, Service 2 stars.
- **Expected:** a safety-first message whenever safety is low or a critical event happened. **Actual:** "Good hustle.
  Review those takeaways and you'll be unstoppable." (5 stars in total picks the "good" bucket).
- **Suspected cause:** `ShiftDebriefScene.js:126-129` sums stars across categories.
- **Suggested fix:** pick the "rough" note when safety has 0-1 stars or there is a critical line (hit pedestrian,
  red light, signature left), whatever the total.

### ROUTEDAY-16: Hitting a pedestrian is a -5 line and the route carries on
- **Severity:** major (design; the incident module exists but the route day never uses it)
- **Where:** town drive, leg 4 (seen once, with the autopilot driving through traffic; the rule is in the code)
- **Repro:** hit a crossing pedestrian at any speed over 0.5 mph.
- **Expected:** the drive stops and the trainee has to handle it (stop, check, call it in: the m8-incident flow), and
  the day is marked. **Actual:** a toast, `-5 You hit a pedestrian`, the pedestrian "carries on to the kerb", and the
  trainee drives on to deliver; the day ends with 2 stars in two categories and "Good hustle".
- **Evidence:** leg 4 log `-5/0 You hit a pedestrian`; `src/scenes/shift/TownDriveScene.js:851-855`.
- **Suggested fix:** end the leg into an incident stop (m8-incident) or at least a mandatory "what do you do now"
  card, and cap the day's safety result.
- **Status:** fixed — hitting a pedestrian is a critical safety failure (the day's safety is capped at one star) and
  stops the drive with a card that says what to do (hazards on, check on them without moving them, call 911 and
  dispatch, stay at the scene) before the trainee can drive on.

### ROUTEDAY-17: A route day is five near-identical stops
- **Severity:** design
- **Where:** day 1 as generated
- **Repro:** day 1: four of five stops are "standard delivery, nobody home, leave on the doormat" at the same
  two-storey house (cream walls and a green door at stops 1, 3 and 5), each with the same three-box shelf (the right
  box, the same name two doors up, the same number on "St"), the same climb-down and climb-in questions, the same
  walk, ring, "No answer.", handheld, photo. Stop 5 is the only one with a person (and see ROUTEDAY-13).
- **Expected:** a day that mixes situations from the modules (a business, an apartment, a signature with nobody home,
  a damaged box, a dog, a customer at the door). **Actual:** by stop 3 it is a routine of key presses; the only
  variety is the driving.
- **Suspected cause:** `src/core/shift.js:81-84` (18 % signature, 6 % adult, 55 % home; apartments dropped half the
  time; notes 25 %); nothing guarantees a mix.
- **Suggested fix:** pick the day's stop types from a list with a guaranteed mix (at least one person at the door,
  one exception, one business or apartment), and vary the house model.

### ROUTEDAY-18: The town rebuilds itself every day: addresses, building types and residents all move
- **Severity:** design (minor content inconsistency)
- **Where:** day 1 → day 2
- **Repro:** day 1 stop 2 is 104 Maple Ave, Marcus Bell's house; stop 4 is 304 Maple Ave, Helen Ortiz. Day 2's
  route has "104 Maple Ave: Helen Ortiz". The same lot (lot11) is "105 Maple Ave, Marcus Bell, business" on day 2;
  lot53 goes from "412 Birch Ln, Sam Okafor, house" to "205 Oak St, Sam Okafor, business".
- **Expected:** one town the courier learns, with the same people at the same addresses (the day changes the
  route, weather and parcels). **Actual:** only 8 of 62 lots keep their address between day 1 and day 2
  (`OTR.town.build(day)` is seeded by the day number: `src/core/shift.js:45`, `:23`).
- **Suggested fix:** build the town from a fixed seed (per profile) and seed only the day's route and events by day.

### ROUTEDAY-19: Rain day: headlights are required and penalised every 5 s, but nothing asks for them
- **Severity:** minor
- **Where:** day 2 (rain), leg 1
- **Repro:** start the day-2 drive. You get "Buckle up: press B" but no word about lights; the briefing (backing) does
  not mention the rain either. Drive off without pressing L.
- **Expected:** a "Rain: lights on (L)" prompt like the belt's, before any penalty. **Actual:** `-2 Driving without
  headlights` after 5 s above 3 mph, and again every 5 s (two in my first 10 s).
- **Evidence:** leg log; `src/scenes/shift/TownDriveScene.js:49` and `:919-924`.
- **Suggested fix:** show the lights hint at the start of a leg whenever `lightsWanted`, and give one warning before
  the first penalty.
- **Status:** fixed — when headlights are needed the drive says so at the start ("Bad weather: headlights on (L)"),
  and driving without them gets one warning before the first penalty.

### ROUTEDAY-20: Route days do not count toward the courier rank
- **Severity:** design
- **Where:** hub after day 1
- **Repro:** finish a route day (mine: 5 stars) and go back to the station.
- **Expected:** the day's stars move the profile's rank (the route day is the main thing the game is for).
  **Actual:** profile still "NEW HIRE", "0 / 14 ★", "0 / 144 ★ · 0/24 scenarios"; the route card only says "1 route
  day logged · best 5/9 ★". The pre-trip and load done inside the day do not tick those modules either (still NEW).
- **Suspected cause:** `src/core/save.js:105-128` totals only `scenarios[id].bestStars`.
- **Suggested fix:** add the best route day (or route-day stars) to the rank total, or show a separate route rank.

### ROUTEDAY-21: Small seams and labels
- **Severity:** polish
- **Where:** various
- The last stop's report button says **"Back to route ▶"** and opens the debrief (earlier stops say "Next stop ▶");
  "Finish the day ▶" would say what happens.
- The pause menu says **"Quit to Shift Board"**; the hub calls itself "STATION" ("DAY 1 · STATION", "Back to the
  station ▶"). Pick one name.
- The leg always starts 15 m before a four-way stop at the station exit, while the trainee is reading "Buckle up:
  press B". I rolled it on both days; a first leg that begins with the van at the stop line (or a longer run-up)
  would be fairer.
- The day is closed and saved (day 2, route history written) the moment the debrief opens, so a reload on the debrief
  loses it with no way back to read it; the hub has no "last day's debrief" link.

## Revisit

- **Reversing off the kerb/lawn** barely moves (0.3 mph for 6 s of S, leg 1 day 1, rear wheels on the grass):
  forward was the only way out, over the kerb again (another -2). A van nosed into a lawn could be close to stuck.
  Seen once; for the driving tester.
- **Seatbelt is a toggle:** a second B press unbuckles; "Driving without your seatbelt" -3 then repeats about every
  8 s (8 times, -24, in one day-2 leg: my harness pressed B twice). One mistake, huge repeated penalty.
- **"Failed to yield to a pedestrian"** is a box test (crossing ped within ~110 px ahead / 90 px aside at > 6 mph,
  `TownDriveScene.js:846-849`). It fired 4× on day 1, once while I was braking to a stop short of the crosswalk.
  Worth a look by the driving tester.
- **A flagged pre-trip defect on the day it matters:** day 2 (rain, lights required) the pre-trip had a dead driver
  headlight; I flagged it and the day rolled on in the same truck with no word about a swap or repair (ROUTEDAY-4).
- **Quit to Shift Board from inside a stop** should behave like the reload in ROUTEDAY-10 (same `go()` path); not
  played through.
- The session log had a `[console.error] Failed to load resource` (a 404 somewhere during the day; not traced,
  possibly just a favicon). No page errors.
- Not played: starting academy modules from the hub while a route is in progress; days 3-7 (heat carry-over, snow,
  storm); a whole stop in a business or apartment inside a route day (only day 2 stop 1's brief, a dental office with
  a garden hose and a residential mailbox by the door); the day in real time (everything here was turn-based).

## Summary

Played: a new profile, the whole of day 1 (briefing, pre-trip, load, five legs, two driven by hand including both
parkings, five stops, debrief) with deliberate mistakes in every part, pause/Restart and Quit on a drive, Restart in
a stop, reloads on the drive and inside a stop, then day 2 up to its first stop.

The ten findings that matter most, in order:

1. **ROUTEDAY-5** (major): the load adds five pieces for neighbouring addresses tagged to route stops; they are never
   delivered, the stop's scanner calls them "WRONG STOP", and their weights and fragile marks differ between load and
   stop.
2. **ROUTEDAY-14** (major): the debrief's "What to work on" is capped at five items by the first occurrence's gap;
   repeats do not add up, "+ N more" can never appear, service mistakes are crowded out, "Went well" disappears on a
   rough day. It does not match what happened.
3. **ROUTEDAY-13** (major): an ADULT SIGNATURE package carries "Please leave behind the planter"; leaving it there
   unattended scores the spot 2/2 and counts as delivered.
4. **ROUTEDAY-10** (major): reloading (or quitting) inside a stop resumes on the drive; the van creeps out of the zone
   and re-parking logs the park and belt credits twice and moves the clock again.
5. **ROUTEDAY-9** (major): pause → Restart on a leg (or in a stop) silently erases that leg's violations.
6. **ROUTEDAY-7** (major): P accepts the van up on the sidewalk, outside the zone and over the crosswalk.
7. **ROUTEDAY-16** (major): hitting a pedestrian is a -5 line and the route just continues.
8. **ROUTEDAY-17** (design): the day is five near-identical stops (four "nobody home, doormat" at the same house).
9. **ROUTEDAY-8** (minor): the drive HUD counts "STOP 2 OF 4" ... "STOP 5 OF 1".
10. **ROUTEDAY-2** (minor): Enter presses from the briefing fall through and skip the pre-trip's intro (twice).

Also recorded: the "Good." after a wrong briefing answer and the -1/2 score (1), pre-trip always sunny (3), missed
pre-trip defects never used and not seeded (4), no load report and the load not reaching the stops (6), the stop
house not matching the map (11), the clocks (12), "Good hustle" after 0 % safety (15), a town that reshuffles its
addresses and residents every day (18), rain-day headlights penalised with no prompt (19), route days not counting
toward the rank (20), and small labels and seams (21).

Not covered: see the end of the Revisit list (days 3-7, heat/snow carry-over, business and apartment stops inside a
route, academy modules mid-route, real-time feel).

