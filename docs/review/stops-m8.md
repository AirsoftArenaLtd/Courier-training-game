# Review: stops-m8 (Safety & Wellness doorstep stops)

Tester area: `m8-steps` (Watch Your Step), `m8-dog` (Dog Encounter), `m8-heat` (Heat Wave), all in
`src/scenes/stops/StopScene.js` on the walkable stage (`src/core/stage.js`). Content: `data/m8_stops.js`.
Played with `test/tools/playd.js` on port 9302; screenshots in `test/out/review/stops-m8/`.

## Findings

### STOPS-M8-1: SHIFT only has to be held for the first frame of a hazard; you can then run the rest of it and still be graded "Walked carefully"
- **Severity:** major
- **Where:** m8-steps, every hazard (ice, wet, steps, hose, toys, crack); also m5 sets that use hazards
- **Repro:** sf1 (120 Frost Ln), carrying the package, stand just left of the icy steps (x≈1300). Hold SHIFT+D until
  the courier crosses x=1308 (the steps zone edge), release SHIFT, keep holding D: the courier runs up the icy
  steps at full speed (230 px/s) and onto the porch. `S.hazards.steps.state` = `careful`, and the report scores
  "Walked carefully over the steps" 2/2.
- **Expected:** careful walking has to last for the whole hazard; letting go of SHIFT on ice (or on wet steps) while
  still on it is the moment you slip.   **Actual:** the hazard is judged once, on the frame you enter its zone.
- **Evidence:** `/eval` after the run: `steps:careful`; `test/out/review/stops-m8/s1-steps-run.png` (on the porch
  0.9 s after releasing SHIFT).
- **Suspected cause:** `src/core/stage.js:369-374`: zones call `onEnter(me, careful)` once on entry, there is no
  per-frame check while `inside`; `StopScene.addHazard` (`StopScene.js:134-139`) only uses that entry value.
- **Suggested fix:** add an `onInside(dt, careful)` per-frame hook and trigger the slip if the courier moves at walk
  speed at any point inside a slippery zone (maybe after a short grace of 100-150 ms so a late SHIFT press is
  forgiven).
- **Status:** fixed — hazards are judged on every frame inside them (`stage` zones got `onInside`), not only on the
  first: more than 0.12 s of walking at full speed on ice or wet steps, or on clutter with a package in hand, is the
  slip (the grace forgives a SHIFT pressed a moment late). Traced frame by frame: two fast frames on the ice gave the
  incident.

### STOPS-M8-2: The "icy steps" and "wet steps" hazards are invisible: the steps look dry, and nothing marks where the hazard starts
- **Severity:** major
- **Where:** m8-steps sf1 (ice), sf2 (wet); the `stepHazard` hazard
- **Repro:** sf1, walk to the porch steps and crop them (`/shot?clip=300,480,400,200`).
- **Expected:** frost/ice glaze or a wet sheen on the treads, like the ice patches on the path.   **Actual:** plain
  dry grey treads; the ice patch drawn at the foot of the steps is a different hazard ("the frozen path"). The
  steps hazard has no image at all (`addHazard(..., null, ...)`), so the only warning is the brief.
- **Evidence:** `test/out/review/stops-m8/s1-steps-crop.png`
- **Suspected cause:** `StopScene.js:104` passes `img = null` for `stepHazard`.
- **Suggested fix:** draw an ice/wet overlay on the treads (the lot already knows `stepsX0`/`porchX0`), and consider
  a small "slippery" tint on every hazard zone so the trainee can see where SHIFT is needed.
- **Status:** fixed — icy or wet steps get a glaze on every tread (`StopScene.stepGlaze`: pale ice with a glint, or a
  dark wet sheen), drawn from the stage's step surfaces.

### STOPS-M8-3: The hazard zones do not match the drawn ice; you slip well inside the patch, and the zone is narrower than the art
- **Severity:** minor
- **Where:** m8-steps sf1 (both ice patches), also the puddle and crack
- **Repro:** sf1, run right from the van without SHIFT: the slip fires at x=1011, while the icy sidewalk art
  (`art.w: 180`, centred at 1060) starts at ≈970. The zone is x±50 (100 px) for every prop hazard whatever its
  art width (ice 180/150, puddle 150, crack 120).
- **Expected:** the slip zone covers the drawn patch.   **Actual:** 40 px of drawn ice at each end is safe to run on;
  a trainee who presses SHIFT "when I reach the ice" is already fine, one who releases it on the last visible
  40 px is also fine, so the rule the art teaches is not the rule the game checks.
- **Evidence:** `test/out/review/stops-m8/s1-slip-1.png`; zones dump: `[[1010,1110],[1240,1340],[1308,1430]]`
- **Suspected cause:** `StopScene.js:131`: `zx0 = x - 50, zx1 = x + 50` ignores `p.art.w`.
- **Suggested fix:** use `x ± art.w / 2` when the prop has a width.
- **Status:** fixed — a hazard's zone is its drawn width (`art.w`, else the image's width) instead of a fixed 100 px:
  the icy sidewalk is now 970-1150 and the frozen path 1215-1365.

### STOPS-M8-4: Soft-lock: choosing a drop spot on the handheld auto-walks the courier across the icy steps at full speed, they slip, and the stage stays locked for good
- **Severity:** blocker
- **Where:** m8-steps sf1 (and any stop with a hazard between the courier and the chosen spot: sf2's wet steps, the
  sf3 entry tiles)
- **Repro (two variants, both reproduced):**
  1. Careful run: SHIFT-walk from the van to the foot of the steps (x≈1293; both ice patches `careful`), TAB →
     Deliver… → Left at location (photo) → **On the doormat** (the right answer). The courier auto-walks up the
     steps at 230 px/s, "You slipped on the steps!", and stops at x=1310 still holding the box.
  2. From the porch, pick **At the bottom of the icy steps**: the courier auto-walks down the steps, slips, stops at
     x=1429.
  In both, `stage.locked` stays 1 forever: A/D, E and the mouse do nothing, no photo camera opens, `S.spot` is set but
  `S.carrying` still holds the package. TAB still opens the handheld, but only ESC → Restart gets out.
- **Expected:** a scripted walk never triggers a hazard (or walks carefully), and if it does, the placement still
  finishes.   **Actual:** the stop is dead, and the careful trainee also gets "Slipped or tripped on the steps" and
  the fall-risk penalty for a walk they did not control.
- **Evidence:** `test/out/review/stops-m8/s1-badspot2.png`, `s1-doormat-softlock.png`; `/eval`:
  `{"x":1310.4,"locked":1,"hz":["ice_walk:careful","ice_path:careful","steps:incident"],"carrying":["p1"]}`
- **Suspected cause:** `StopScene.placePackage` (`StopScene.js:1311-1330`) calls `stage.lock()` then
  `walkPlayerTo(x - 50, cb)` without `careful`; the hazard zone fires `hazardIncident`, whose `stage.lock()` calls
  `me.stop()` (`stage.js:227`, `rig.js:324`), which drops the move target and with it the `onArrive` callback, so
  placePackage's own `unlock()` never runs.
- **Suggested fix:** pass `{ careful: true }` for every scripted walk (placePackage, hand-off walks, `approach`,
  `backAway`), skip hazard checks while the stage is locked by a script, and make `hazardIncident` resume an
  interrupted `walkTo` (or never call `me.stop()` during a scripted move).
- **Status:** fixed — a walk the game makes (placing a package at a chosen spot, a scripted move in a conversation)
  runs with the stage locked, and hazards are not judged while it is locked, so it can never slip or leave the stage
  locked; the placement walk also goes at careful speed. Checked with the play tool: from the foot of the icy steps,
  "On the doormat" walks up, sets the box down, steps back and opens the camera; the steps stay unjudged.

### STOPS-M8-5: m8-steps and m8-heat report only safety and efficiency, so every service mistake there is scored but never shown and never costs a star
- **Severity:** major
- **Where:** m8-steps and m8-heat stop reports and module results (`data/modules.js:306, 328`: `categories:
  ['safety','efficiency']`). (m8-dog uses `['safety','service']`, so its service lines do show; its *efficiency*
  lines, e.g. the scan, are hidden instead.)
- **Repro:** sf1 careful run, deliver on the doormat without ringing. The report shows 8 lines, 3★/3★. The log for the
  stop holds 14 lines, including `service 0/1 Knocked or rang before leaving the package`, the spot grade and the
  photo grade, none of which appear (`/eval s.log.items`). The same filter hides the service-scored choices the
  content relies on: sf1 "At the bottom of the icy steps" (a *safety* note, graded as service), ht1 "On the sunny
  steps" ("Direct sun can cook what's inside"), misdeliveries and wrong outcomes.
- **Expected:** a choice the content marks as bad costs something visible in the module that teaches it.
  **Actual:** only the conversation's instant feedback text; the report, stars and result ignore it.
- **Evidence:** report `test/out/review/stops-m8/s1-report.png` vs. the 14 logged items; `cats: ["safety","efficiency"]`.
- **Suspected cause:** `StopScene.js:24` (`this.cats = scenario.categories`), the M8 scenario definitions; the spot and
  talk effects are logged under `service`.
- **Suggested fix:** either show all three categories in M8, or re-home the safety-relevant checks (a package left
  on the steps is a trip hazard) under `safety`.
- **Status:** fixed — every stop scenario (m5-pod, m5-exceptions, m5-adult, m8-steps, m8-dog, m8-heat) now declares
  all three categories, since a stop always scores all three (cab climb and hazards: safety; scan and time:
  efficiency; the delivery: service), as the route day already showed. Nothing a stop scores is hidden any more.

### STOPS-M8-6: Sam's "good" answer has the courier say "I moved the hose and toys off the path" even when they tripped over both and moved nothing
- **Severity:** minor (content)
- **Where:** m8-steps sf2 (64 Brook Rd), Sam's conversation, node `s1`
- **Repro:** run from the van to the door carrying the box without SHIFT (trip on the hose, trip on the toys, slip on
  the wet steps; all three `incident`), ring, and at "Sorry about the mess on the walk" the choices are "Just sign
  here", "Yeah, I nearly broke my neck out there", and **"No worries! I moved the hose and toys off the path…"**,
  graded good (+1 safety, +1 service) with "A friendly heads-up about a hazard helps the next person".
- **Expected:** the answer matches what the trainee did: "I moved them" only when both are `cleared`; otherwise
  "Heads-up: the hose and toys are on the path and the steps are slick" as the good answer.
  **Actual:** the right answer is a false statement, and it earns safety points on a stop with three falls.
- **Evidence:** `test/out/review/stops-m8/s2-choices.png`
- **Suggested fix:** split the node with an `if` on the hazards' state, or reword the good choice so it is true either
  way ("Heads-up: there's a hose and toys on the path, and the steps are slick in this rain").
- **Status:** fixed — Sam's good answer is true whatever the trainee did: "No worries! Heads-up: the hose and toys are
  easy to trip on, and the steps are slick in this rain."

### STOPS-M8-7: Tripping over the toys (or hose) and then moving them afterwards erases the trip: "Cleared the hazard" 2/2 and no fall-risk penalty
- **Severity:** major (scoring rewards the wrong behaviour)
- **Where:** m8-steps sf2, clearable hazards (hose, toys)
- **Repro:** carry the box from the van to the door without SHIFT (trip on the hose and the toys), hand it to Sam,
  then walk back empty-handed and press E at "Move the toys aside". Report: `safety 2/2 Cleared the hazard (the toys
  on the path)`; the hose (not cleared) keeps `0/2 Slipped or tripped` and `-1 Incident: fall risk`.
- **Expected:** a trip stays a trip (clearing afterwards can earn a smaller "tidied up for the next person" credit).
  **Actual:** `H.state = 'cleared'` overwrites `'incident'`, and `evaluate` only looks at the final state, so the
  penalty disappears.
- **Evidence:** `/eval` log items for sf2 (above), hazards `hose:incident, toys:cleared, steps:incident`.
- **Suspected cause:** `StopScene.js:145` (`when: H.state !== 'cleared'`) and `:150` (`H.state = 'cleared'`) do not
  check for `'incident'`; `:1481-1490` scores the last state only.
- **Suggested fix:** keep an `H.incident` flag separate from the cleared state, and score both.
- **Status:** fixed — a slip or trip is kept in `H.incident` and scored whatever happens afterwards, so clearing the
  toys after tripping on them no longer wipes the fall from the report.

### STOPS-M8-8: "Clear trip hazards with E before you carry a package over them" cannot be done with the package in hand, is never explained, and following it costs an "Extra trip" penalty
- **Severity:** design (major for the lesson)
- **Where:** m8-steps sf2; intro card line 3
- **Repro:** follow the objectives in order (pull the package, scan, climb out) and walk to the hose carrying the box:
  no prompt at all (`nearest: null` at x=1069, on the hose's E spot); the prompt only exists with empty hands
  (`when: … S.carrying.length === 0`). To clear it "before you carry a package over it" the trainee must climb out
  empty-handed, clear, climb back in (logged as `vanTrips++` → `-1 efficiency Extra trip back into the truck`,
  `StopScene.js:756, 1570`), then do the stop. Walking over the hose carefully with SHIFT scores the same 2/2 as
  clearing it, so there is no reason to clear anything.
- **Expected:** a carrying courier can still move the hose with a foot / set the box down briefly, or at least sees a
  prompt "Put the package down to move the hose"; clearing scores better than stepping over clutter.
  **Actual:** silent no-prompt, penalty for doing it the way the intro says, no benefit.
- **Evidence:** `test/out/review/stops-m8/s2-hose-carrying.png`; `/stage` at x=1069 with the box: `nearest null`.
  The hose's E spot is at its left end (x=1070, range 60), while the hose art runs 1065-1215, so walking back from
  the house you stand on the hose at x=1134 with no prompt either.
- **Suggested fix:** allow clearing while carrying (short "set down, move hose, pick up" animation), centre the E
  spot on the art, score "stepped carefully over clutter while carrying" at 1/2 and "cleared it" at 2/2, and do not
  count a van trip made before the package was pulled as "extra".
- **Status:** fixed (decision) — the hose and toys can be moved with a package in hand (the courier sets it down,
  moves them, picks it up); their E spot is the middle of the clutter with a window as wide as the art; clearing
  scores 2/2 and stepping carefully over clutter 1/2 ("…but left it on the path"), so following the intro pays; a trip
  back into the van before any package was pulled is not counted as an extra trip. The golden path now clears them.

### STOPS-M8-9: Five falls in one set still ends on "GREAT WORK!", and a hidden service lesson shows up in the Key Takeaways
- **Severity:** minor (variant of STOPS-M5-20's missing critical-failure cap, new for M8)
- **Where:** m8-steps results screen
- **Repro:** sf1 careful (restarted), sf2 run without SHIFT (hose trip, toys trip, wet-steps slip), sf3 run without
  SHIFT (crack trip, entry-tile slip). Result: header "GREAT WORK!", Safety 1★, Efficiency 2★, score 5900. Key
  Takeaways: the slip lesson, **"Always attempt contact first. Many customers would rather receive the package in
  person."** (from the hidden `service 0/1 Knocked or rang`, see STOPS-M8-5), and the SHIFT lesson.
- **Expected:** a slips-and-falls module with five falls says so ("Needs work" / "Five falls on the route"), and the
  takeaways only come from categories the module shows.   **Actual:** praise, plus a lesson about something the
  report never mentioned.
- **Evidence:** `test/out/review/stops-m8/m8steps-result.png`, `s3-report.png`
- **Suggested fix:** pick the header from the weakest shown category (1★ safety → not "GREAT WORK!"), and filter the
  takeaways by `scenario.categories`.
- **Status:** fixed (headline and takeaways; falls as criticals are WP2b) — "GREAT WORK!" now needs every category at
  2★ or more, so 1★ safety can never read as praise, and the takeaways only come from the scenario's categories, which
  now include every category a stop scores (STOPS-M8-5).

### STOPS-M8-10: The fence is drawn behind the dog and the gate in front of the courier, so the "dog behind the fence" looks loose on the sidewalk and the courier looks inside the yard
- **Severity:** major (the picture contradicts the situation being taught)
- **Where:** m8-dog dg1 (22 Maple Ave), the whole front fence
- **Repro:** walk from the van to the gate. Depths: fence segments 8, dog 25, courier 30, gate 32.
- **Expected:** a front fence between the sidewalk and the yard: the courier on the sidewalk in front of the pickets,
  Biscuit inside, behind them.   **Actual:** Biscuit (inside the yard, x≈1339) is drawn over the pickets, as if
  loose on the sidewalk next to the courier; the courier, still outside, has the closed gate drawn over their legs,
  as if already standing in the gateway.
- **Evidence:** `test/out/review/stops-m8/d1-gate.png`, `d1-gate-crop.png`
- **Suspected cause:** `StopScene.buildFence` (`StopScene.js:282-284`): fence depth 8 and gate depth 32 bracket the
  actors (dog 25 from `buildDog`, courier 30).
- **Suggested fix:** put the fence and the closed gate between the yard actors and the sidewalk actors (dog below
  the fence while inside the yard, courier above it while outside), e.g. fence and gate at 27 with the dog at 25 and
  the courier at 30; swap the dog above the fence only once it is out of the gate.
- **Status:** fixed — the fence and the closed gate are drawn between the yard (dog 25, owner 24) and the sidewalk
  (courier 30), at 27; once through the gate the courier goes behind the fence (26). Checked: Biscuit shows through
  the pickets, the courier stands in front of them.

### STOPS-M8-11: Walking into the closed gate spawns a new "The gate is closed." toast every frame (57 stacked copies after 2.6 s)
- **Severity:** minor
- **Where:** m8-dog dg1; any stage with a gate barrier
- **Repro:** from the van, hold D until the courier is stopped by the gate (x=1132) and keep holding.
  `/texts?match=closed` lists 57 identical `The gate is closed.` objects at 546,93.
- **Expected:** one toast, refreshed while you push.   **Actual:** one per frame while D is held; they stack
  (thicker, darker text) and all fade at once. With a longer push this is hundreds of text objects.
- **Evidence:** `/texts` excerpt above; `test/out/review/stops-m8/d1-gate.png` (toast top centre).
- **Suspected cause:** `stage.js:348` calls `onBlocked()` every frame the move target is clamped;
  `StopScene.js:288` calls `this.say(...)` each time with no debounce.
- **Suggested fix:** debounce `onBlocked` (fire on the first blocked frame only, reset when the courier moves
  away), or make `say()` replace an identical visible toast.
- **Status:** fixed — walking into something that stops the courier says so at most once every 2.5 s
  (`StopScene.blocked`), and a message replaces the one on screen instead of stacking (STOPS-M5-17).

### STOPS-M8-12: The dialogue panel covers the dog the trainee is asked to read
- **Severity:** major (dg3's whole lesson is reading the dog)
- **Where:** m8-dog dg1 gate situation (seen); dg3 porch situation (see STOPS-M8-15 for the check there)
- **Repro:** dg1, E at "Open the gate". Narration: "Biscuit bounds along the fence, barking and bouncing"; then the
  choices, one of which is "It's wagging its tail. It's friendly, so go on in."
- **Expected:** the dog is framed above the dialogue so the trainee can see the tail and posture being described.
  **Actual:** the camera frames the courier at the left third and the dog sits right behind the dialogue panel at the
  bottom; only an ear and the tail tip show through the dimmed strip. The whole decision is made from the text.
- **Evidence:** `test/out/review/stops-m8/d1-sit1.png`, `d1-sit2.png`
- **Suggested fix:** in dog situations use `act: 'focus', 'dog'` and raise the camera / shrink the panel so the dog
  (and the owner) are fully visible above it, or move the dog up-stage for the question.
- **Status:** fixed — in a stop with a dog, conversations use the talk engine's new top layout (panel under the HUD,
  choices below it, the feedback card below both), and the camera frames the courier and the dog together. Checked on
  dg1: the dog stays visible below the choices.

### STOPS-M8-13: The printed-name check treats "Mrs. Chen" as the real name and marks "Lin Chen" (the addressee, and plausibly the same woman) wrong
- **Severity:** minor (content; hidden in M8 by STOPS-M8-5, visible wherever these stops are reused)
- **Where:** m8-dog dg1 (and dg3: "Mr. Alvarez" for "Luis Alvarez")
- **Repro:** dg1, after the owner secures Biscuit: TAB → Deliver… → Handed to recipient. PRINTED NAME: "Who signed?
  Record the printed name of the person who actually signed": Mrs. Chen / Occupant / Lin Chen. Pick Lin Chen:
  `service 0/2 Recorded the signer's real printed name`.
- **Expected:** a signer prints a real name; the owner of 22 Maple Ave coming out for a package to Lin Chen is most
  likely Lin Chen.   **Actual:** the "right" printed name is a title plus surname nobody would print, and the only
  full name offered is graded wrong.
- **Evidence:** `test/out/review/stops-m8/d1-sign.png`; log line above.
- **Suggested fix:** give the owners full names (e.g. "May Chen" as a different family member, or make her Lin Chen
  and accept that), and show the printed name on the signature pad so there is something to read.
- **Status:** fixed — the owners have their own full names as members of the family (May Chen at Lin Chen's address,
  Tomas Alvarez at Luis Alvarez's), so the printed-name check asks for a real name and the addressee is a plausible
  wrong one.

### STOPS-M8-14: dg2 "sprint" branch: the chase and the bite happen off-camera, the dog ends up standing on the courier, and "Try again" makes it charge out into the road behind the truck, where it stays
- **Severity:** major
- **Where:** m8-dog dg2 (48 Pine St), charge situation, the wrong answers
- **Repro:** walk from the van until the charge fires (x≈1118). Pick "Turn and sprint back to the truck": the courier
  runs to x=660 and the dog to 740, but the camera stays locked where the talk began (`focus.x` 1189, scrollX 770),
  so "Teeth catch your trouser leg…" plays over an empty house front. Pick "Stare it down" (lunge, still off-screen),
  then "back away slowly toward the truck" (you are already at the truck): `backAway` walks the dog 80 px towards
  you, onto the courier (dog 660, courier 660). At "The package still needs a decision" pick "Try again. It's
  probably calmed down.": `dogCharge` picks its side from `d.x > me.x` (equal → -1), so the dog "charges" away from
  the house to x≈380, in the road at the van's front wheel, drawn over the van, and stays there growling for the
  rest of the stop (`dogBusy` never clears). The narration says "It charges the moment you step on the lawn" but the
  courier never left the truck.
- **Expected:** the camera follows the courier and the dog in every branch; the dog stays between the courier and
  the house; "Try again" walks the courier back onto the lawn and the dog charges from the yard.
  **Actual:** as above.
- **Evidence:** `test/out/review/stops-m8/d2-chase-4.png`, `d2-c2.png` (no courier or dog in shot),
  `d2-again-4.png`, `d2-curb.png` (dog in the road in front of the van).
- **Suspected cause:** `StopScene.js:404-410` (`dogCharge` side from dog vs courier, target `me.x ± dist`),
  `:424-429` (`dogChase` leaves the focus point), `:441-447` (`backAway` moves the dog 80 px left regardless of
  where the courier is); `c_again` in `data/m8_stops.js` has no `approach` before the charge.
- **Suggested fix:** clear or follow the camera focus in `dogChase`/`backAway`; have `c_again` do
  `approach` to the lawn first; make `dogCharge` always come from the house side (`side = +1` towards the lot) and
  never target a point behind the van; reset `dogBusy` and send the dog back to patrol the yard after the talk.
- **Status:** fixed — the chase and backing away release the camera so it follows the courier; the dog always charges
  from the house side and, when the courier backs away, follows only as far as 150 px from them (it used to end up on
  the courier); "Try again" first walks the courier onto the lawn, then the dog charges; after the talk the dog walks
  back to its yard.

### STOPS-M8-15: After the dog has charged, you can walk straight back to the door and ring the bell; the dog does nothing
- **Severity:** major (undoes the lesson "once a dog has shown aggression, don't go back in")
- **Where:** m8-dog dg2
- **Repro:** any branch of the charge situation (seen after the sprint branch; the good branch ends the same way,
  the trigger is `once`). When it ends the stage unlocks with the package still in hand. Hold D from the van to the
  door (x=1678) and press E at "Ring the doorbell": `knocks: 1`, no dog reaction, no situation, no penalty. Then
  TAB → UN, walk back past the dog, climb in: "Recorded the right exception (UN) 3/3".
- **Expected:** the dog stays in the yard, and walking back onto the lawn restarts the charge (or ends the stop with
  a penalty); the report notes "went back to the door after an aggressive dog".
  **Actual:** the one-shot trigger has fired, the dog is parked (in the road, see STOPS-M8-14, or on the lawn), and
  the yard is safe to walk.
- **Evidence:** `/eval` after ringing: `{"knocks":1,"talk":false,"dogx":380}`; dg2 log has no line for it.
- **Suspected cause:** `addTrigger` (`StopScene.js:331-345`) is one-shot; nothing re-arms it; `dogBusy` stays true
  so the patrol/bark loops are off.
- **Suggested fix:** after the talk, return the dog to the yard (`patrol`), re-arm a trigger ("It charges again")
  while no outcome is recorded, and log a safety penalty for re-entering.
- **Status:** fixed — the charge trigger re-arms (`rearm` in the stop data): going back onto the lawn before the stop
  has an outcome sets the dog off again, backs the courier to the truck, and logs "Went back towards a dog that had
  already charged" as a critical safety mistake.

### STOPS-M8-16: The dg2 report lists the same check up to four times, with scores like "-3/1" and "-2/2"
- **Severity:** minor
- **Where:** m8-dog dg2 report, any conversation that loops back to a question
- **Repro:** dg2: sprint → stare → back away → "Try again" → "Drop the package at the curb". Report: "Got clear of the
  dog safely" -2/3 and 3/3; "Decided what to do about the delivery" -2/2, 0/1, 0/2 and -3/1 (safety and service
  lines interleaved, each with the same label); "Reacted to a charging dog" -3/3.
- **Expected:** one line per question (e.g. the first answer, or "took two tries"), scores between 0 and max, and
  the penalty shown as its own line.   **Actual:** duplicated labels and negative fractions that read as bugs.
- **Evidence:** `test/out/review/stops-m8/d2-report.png`
- **Suggested fix:** merge repeat answers to the same `check` into one line, clamp `got` to 0..max and log the
  negative part as a separate penalty line ("Ran from the dog").
- **Status:** fixed — the talk engine logs one line per question and category: answering the same question again keeps
  the worse answer and says "(2 tries)", and a harmful answer is 0/max plus its own penalty line ("…: the answer made
  it worse"), never "-3/1". The total is the same as before.

### STOPS-M8-17: dg3 (Pepper): the body-language question hides Pepper, the owner and the courier behind the choices, and "Walk right up" has Pepper snap at a courier 650 px away
- **Severity:** major (the one stop about reading a dog shows no dog)
- **Where:** m8-dog dg3 (7 Birch Ln), porch situation
- **Repro:** walk from the van; the owner comes out at x≈1109 (trigger `stepsX0-170`). At "Pepper is pressed against
  the door: tail tucked, ears pinned back…": camera scrollX 529, courier at screen x≈580, owner ≈1156, Pepper
  ≈1236: all three sit behind the choice buttons (crop at the right edge shows Pepper only as a shape through the
  panel). Pick "Walk right up. The owner says she's friendly.": the courier does not move (x stays 1109), Pepper
  lunges in place on the porch behind the railing, and the courier flinches with a red flash on the sidewalk.
  Feedback: "A scared dog that feels cornered on its own porch may snap."
- **Expected:** the dog is framed and visible (large enough to see the tucked tail), and a "walk right up" choice
  walks the courier up the steps before the snap.   **Actual:** the trainee answers a body-language question from
  text alone, then watches a bite from 650 px.
- **Evidence:** `test/out/review/stops-m8/d3-q1.png`, `d3-q1-right.png`, `d3-snap-1.png`
- **Suggested fix:** focus the camera on the porch for this talk (`act: 'focus', 'dog'`), move the choice panel so
  it does not cover the porch, and add `act: 'approach'` (to the steps) before `dogLunge` in both wrong answers
  (the "Crouch down and hold out a hand" answer has the same problem). Also, after the talk the hint "Hand over the
  package: Deliver on your handheld (TAB)" sends the trainee to the handheld while still 576 px away, which then
  answers "TOO FAR AWAY"; say "Walk up to Mr. Alvarez" first.
- **Status:** fixed — dg3 uses the top layout with the camera on the courier and Pepper; both wrong answers walk the
  courier up to the porch before Pepper snaps (a new `p_lunge` step) and are critical; the quiz's right answer no
  longer repeats the narrator's words; the hint says "Walk up to Tomas Alvarez, then Deliver…".

### STOPS-M8-18: Collapsing from heat stroke does not end the shift: the next stop starts at body heat 81, the warning fires in the van at once, and later overheating gets no warning before a second collapse
- **Severity:** major
- **Where:** m8-heat, carry-over between stops (`StopScene.js:1655`) and the one-shot warning (`:541-546`)
- **Repro:** ht1: never drink, ring at 1400 Sunset Blvd and stand on the porch. At temp 72 the heat-signs talk fires;
  pick "Push through". ~24 s later temp 96: "You collapsed… A neighbour … called 911". See stop report → Next stop.
  ht2 opens with `temp 81, hyd 38` (collapse values −15 / +10), and as soon as the brief closes "Your head is pounding
  and the sidewalk feels like it's tilting" plays while the courier sits in the van. Pick "Stop now…" (rest + drink,
  works: temp 31, hyd 83). Then carry the 45 lb box out and stand in the sun: temp 45 → 58 → 71 → 84 → 96 over 75 s
  with **no warning at all** (`warned` is already true for this stop) and a second collapse.
- **Expected:** a collapse and a 911 call end the set (or the day) with a clear result; each stop starts from a
  recovered state; the warning re-arms once the trainee has cooled down, so every overheat gets a warning first.
  **Actual:** back to work after an ambulance call, a pre-failed heat check on the next stop (`maxTemp` 81 → "Kept
  body heat out of the danger zone" can be at most 1/2 however well stop 2 is played), and a silent collapse.
- **Evidence:** `test/out/review/stops-m8/h-warn.png`, `h-collapse.png`, `h2-start.png`, `h2-collapse2.png`;
  `/eval` at ht2 start: `{"hyd":37.9,"temp":81.0,"maxTemp":0,"warned":false}` then `warned:true, talk:true`.
- **Suspected cause:** `carry.heat` (`:1655`) only nudges the collapse values; `h.warned` is never reset; `maxTemp`
  is seeded from the carried-in temp.
- **Suggested fix:** after `heatCollapse` end the set with a dedicated result; otherwise start each stop from a
  sane state (temp ≤ 50) and seed `maxTemp` after the in-van recovery; reset `warned` when temp drops below ~55 and
  hydration is back above ~50.
- **Status:** fixed — a collapse is a critical safety failure; the next stop starts recovered (after a collapse as if
  treated and rested, hydration 80, body heat 35; otherwise never above 50 body heat), and the heat warning re-arms
  once body heat is under 55 and hydration over 50, so every overheat is warned before a collapse.

### STOPS-M8-19: A stop that ends in collapse scores "Finished the stop in good time" 3/3 (three efficiency stars) and half marks for climbing back in
- **Severity:** minor
- **Where:** m8-heat collapse report
- **Repro:** as STOPS-M8-18, ht1 collapse → "See stop report": header "1400 Sunset Blvd · NOT COMPLETED", efficiency
  3★: `Finished the stop in good time (73s, par 170s) 3/3`, `Scanned the package… 1/1`, `Pulled only the right
  package 1/1`; safety includes `Climbed back into the cab safely 1/2` although the courier never got back in.
  (No delivery or exception line is shown: that is a service check, hidden in this module, STOPS-M8-5.)
- **Expected:** an unfinished stop gets no "good time" credit and no credit for a climb that never happened.
- **Evidence:** `test/out/review/stops-m8/h-collapse-report.png`
- **Suspected cause:** `evaluate` scores time and `enterSafe === null → 1` regardless of `S.outcome`/`collapsed`.
- **Suggested fix:** skip the time and climb-in checks when the stop has no outcome (or the courier collapsed), and
  add a visible "Didn't finish the stop" line in the module's own categories.
- **Status:** fixed — a stop without an outcome or ended by a collapse gets no "finished in good time" check and no
  credit for a climb back in that never happened; the unfinished outcome shows as "Recorded a delivery or exception
  0/4" now that service is shown (STOPS-M8-5).

### STOPS-M8-20: The heat model ignores the shade the scene draws and tells the trainee about: the porch roof, the patio umbrella and "the shade by the door" do nothing; only the trees count
- **Severity:** design
- **Where:** m8-heat ht1 (1400 Sunset Blvd), also ht2
- **Repro:** ht1, stand at the door under the porch roof (x≈1926): temp climbs at the full in-sun rate (+0.9/s while
  carrying, 39 → 72 in about 35 s). The orange patio umbrella (`porchX1+140`) is decoration. The drop-spot choice
  says **"In the shade by the door"** is the good spot for a heat-sensitive package, while the courier standing at
  that same door is treated as in full sun. Shade is only the two tree zones (`shadeZones` ±150 px around
  `props[].shade`), and nothing on screen marks them; the intro says "rest in the shade under trees" but the
  meters have no threshold marks (warning at 72, collapse at 96) and no numbers.
- **Expected:** anything that is drawn as shade cools you (porch roof, umbrella, the clinic awning), shade zones are
  visible (a darker ground patch or a small icon when you are in one), and the meters mark the danger band.
  **Actual:** the trainee has to guess; the door that is "in the shade" for the package heats the courier.
- **Evidence:** `test/out/review/stops-m8/h-warn.png` (warning fires under the porch roof); `shadeZones: [[1170,1470]]`
- **Suspected cause:** `StopScene.js:102-103` (only `p.shade` props), `inShade()` at `:517`.
- **Suggested fix:** add porch and umbrella shade zones (and the business awning), tint the ground in shade, and
  draw tick marks at 72/96 on the BODY HEAT bar and at 28 on HYDRATION.
- **Status:** fixed (decision) — shade is what the scene draws: trees, the patio umbrella (±70 px), the porch roof
  over the door and a shop's awning; tree and umbrella shade shows as a dark patch on the ground and the heat meter
  says IN SHADE; the meters mark the danger points (hydration 28, body heat 72, collapse 96 in red). "In the shade by
  the door" now matches the model.

### STOPS-M8-21: Smaller rough edges seen once in passing
- **Severity:** polish / minor
- **Where / what:**
  - dg1: "You give a short tap on the horn **from the truck** and wait at the gate": the courier never leaves the
    gate, 540 px from the truck (`test/out/review/stops-m8/d1-honk.png`).
  - dg1: the hint toast "Hand the package over the gate: Deliver on your handheld (TAB)." runs into the objectives
    panel (`d1-after3.png`); same family as STOPS-M5-7. The owner and Biscuit are drawn over the courier at the gate.
  - dg1: after the owner has taken Biscuit in, "Open the gate" is still offered; harmless, but the hand-off happens
    over a shut gate either way.
  - dg3 quiz: the right answer repeats the narrator's description word for word ("tail tucked, ears pinned back"),
    so it tests reading, not dog body language.
  - sf1/sf2: slipping while carrying sets `S.droppedPackage = true`, which nothing reads: no drop animation, no
    damage check, no report line (`StopScene.js:176`).
  - m8-heat: the water and AC spots are at the back of the cab (x 530 / 490), where the courier is drawn standing on
    the outside of the van's cargo box (`h-van-back.png`); variant of STOPS-M5-1. Standing in the van also cools you
    at 2.2/s without using the AC, so "Cool off in the AC" is barely needed.
  - "Jump up in one move while carrying things" is offered when the courier is carrying nothing.
- **Status:** fixed — the gate narration no longer taps the horn "from the truck" (the courier calls out and waits at
  the gate); "Open the gate" is gone once the owner is out; stop messages wrap at 520 px so they stay clear of the
  objectives panel and the heat meters; the dg3 quiz is fixed (STOPS-M8-17); a fall while carrying is now a critical
  report line ("Fell on … carrying a package"); "Jump up in one move" only mentions carrying when something is
  carried. Not changed: standing in the van still cools the courier without the AC (a design choice; the AC cools
  faster).

## Revisit

- dg2 careful branch (freeze → back away → UN) was not replayed after the sprint branch; check the camera and the
  dog's final position there too (STOPS-M8-14/15 are from the sprint branch).
- dg1 "It's friendly, so go on in" (`openGate` + `dogJump`) and the gate afterwards: not played.
- ht3 (Sunnyvale Clinic lobby, AC indoors) not played; check the business awning as shade and interior cooling.
- sf2 with a fully careful run (exit empty-handed, clear hose and toys, back in, deliver): the extra-trip penalty was
  confirmed on sf3 (`vanTrips 1 → -1 efficiency`), not on sf2 itself.
- In the van at x≈535 with the package in hand, E opened the shelves again instead of "Climb out" (seen once).
- ESC on a stop report seemed to act as "Next stop" (Restart then restarted the *next* stop). Seen once; check.
- Mouse clicks on the gate, hose and toys were not tried (keyboard only).

## Summary

The ten findings that matter most, in order:

1. **STOPS-M8-4** (blocker): picking a drop spot (even the right one, "On the doormat", from the foot of the steps)
   auto-walks the courier over the icy steps at full speed; they slip, the scripted walk's callback is lost and the
   stage stays locked for good. Reproduced twice.
2. **STOPS-M8-1** (major): SHIFT is only checked on the frame you enter a hazard; tap it at the edge and run the
   icy steps at full speed for "Walked carefully" 2/2.
3. **STOPS-M8-18** (major): after a heat collapse and a 911 call the set just continues; the next stop starts at
   body heat 81 with the warning firing in the van, and a later overheat collapses with no warning at all.
4. **STOPS-M8-12 / -17** (major): in every dog situation the dialogue and choice panels cover the dog (and in dg3
   the owner and courier too); dg3's body-language question is answered from text alone.
5. **STOPS-M8-14** (major): dg2's sprint branch plays off-camera, the dog ends up on the courier and "Try again"
   sends it charging into the road behind the truck, where it stays.
6. **STOPS-M8-15** (major): after the charge, the trainee can walk back to the door and ring with no reaction.
7. **STOPS-M8-10** (major): fence depth is inverted: the dog inside the yard is drawn in front of the pickets,
   the courier on the sidewalk behind the gate.
8. **STOPS-M8-7** (major): tripping on the toys and moving them afterwards replaces the trip with "Cleared the
   hazard" 2/2 and removes the penalty.
9. **STOPS-M8-5** (major): m8-steps and m8-heat hide the service category, so the bad drop spots ("bottom of the
   icy steps", "sunny steps"), missed knocks and wrong outcomes cost nothing visible; takeaways still leak them
   (STOPS-M8-9: five falls end on "GREAT WORK!").
10. **STOPS-M8-8 / -2 / -20** (design): hazards and shade are not readable: clearing the hose cannot be done with the
    package in hand and costs an extra-trip penalty; icy/wet steps look dry; porch roof and umbrella give no shade
    while "the shade by the door" is the right drop spot.

Also recorded: hazard zones narrower than the ice art (3), Sam's false "I moved the hose" answer (6), the "gate is
closed" toast spam (11), printed-name "Mrs. Chen" (13), duplicate/negative report lines (16), collapse scored as
"good time" (19), and small rough edges (21).

Not covered: ht3 (clinic), the dg1 "go on in" branch, the dg2 careful branch replay, mouse-only play of the yard
interactions, and real-time feel of SHIFT walking (all testing was turn-based).
