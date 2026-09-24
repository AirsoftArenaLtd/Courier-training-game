# Review: stops-m5 (Module 5 doorstep stops)

Scope: `m5-pod` (Proof of Delivery), `m5-exceptions` (Exception Calls), `m5-adult` (Adult Signature & ID), all in
`src/scenes/stops/StopScene.js` on the walkable stage `src/core/stage.js`. Played with `test/tools/playd.js` on port
9301; screenshots in `test/out/review/stops-m5/`.

Coordinates below are world x unless marked "screen". The van sits at world x 110; the camera starts at scrollX 0, so
in the van world x = screen x.

## Findings

### STOPS-M5-1: In the van, A/D walk the courier straight out of the van (front and back) at floor height, into mid-air
- **Severity:** major
- **Where:** every M5 stop, in the van at the start of the stop (and after climbing back in)
- **Repro:** boot `m5-pod`, Enter, Enter (the courier stands in the cab doorway at x 584). `/hold?key=KeyD&ms=500`:
  the courier walks out through the cab to x 701, standing in front of the windshield. Keep holding D: x 1046 over
  the sidewalk (feet at y 580, ground is 640), x 1623 on the porch (through the porch railing), x 2500 past the house
  on the neighbour's lawn. Hold A instead: the courier walks along the van's side (drawn ON TOP of the "FedEx ON THE
  ROUTE" livery, not inside the van) and out of the back of the van to x 40, floating over the road lane.
- **Expected:** the van interior confines the courier (the only ways out are the E "Climb out of the van" card, or the
  shelves). **Actual:** nothing confines them. The van's body spans x 110-730 and its door x 550-630, but the stage has
  no barrier there (`stage.barriers.length` is 0 on pod1); the walkable region is the whole street, x 40-2500.
- **Knock-on effects:** while walked out, `S.inVan` stays true and the courier keeps `followGround = false`, so
  (1) they never step down: they hover at the van floor height (y 580) over the road, sidewalk and lawn, and slide
  across steps; (2) every outside interaction is disabled (`when: !S.inVan`), so at the door there is no "Ring the
  doorbell" and no "Check the address number": the trainee is on the porch and nothing happens, which reads exactly
  like the owner's "prompts don't show up"; (3) "Climb out of the van" is offered again only within 90 px of x 594, so
  the way out is to walk back into the van and press E.
- **Evidence:** `pod-03-walkout-right.png` (in front of the windshield), `pod-04-midair-sidewalk.png` (y 580 vs
  ground 640), `pod-05-midair-porch.png` (on the porch, no prompt), `pod-06-far-right.png` (past the house),
  `pod-07-van-back-left.png` (drawn over the van's side panel), `pod-08-van-rear-out.png` (behind the van in the road).
- **Suspected cause:** `StopScene.buildWorld()` (StopScene.js:113-118) puts the courier at `van.floorY` with
  `followGround = false` and never restricts movement; `stage.update()` (stage.js:340-355) walks anywhere inside
  `region` (0..outsideW) and only `barrier()`s stop it, and the only barrier in the scene is the yard gate
  (StopScene.js:287). The courier (depth 30) is always drawn over the van (depth -6).
- **Suggested fix:** while `S.inVan`, clamp walking to the cab/cargo floor (for example `setRegion`-style limits or two
  barriers at about x 140 and x 630 active only while `S.inVan`), and on `onBlocked` at the door say "Press E to
  climb out". Either hide the courier behind the van body while inside, or show the cargo area as a cut-away so the
  courier is not drawn on the livery.
- **Also by mouse (resumed review):** clicking the ground or the house while in the van does the same: `/click?x=1000&y=600`
  walks the courier out to x 1004 at y 580 (floor height), `inVan` still true, no prompts. A mouse user clicking
  towards the house is the most natural way to hit this. Outside the van (after a proper climb-down) the courier can
  also walk left along the road side of the van, over the rear wheel and the livery, into the traffic lane
  (`m5b-35-outside-van-left.png`).
- **Status:** fixed — while in the van the courier is held in the cab doorway by two barriers (door ±40 px; the
  shelves, water and AC are all in reach), by keys and by click alike, and walking into the door says "Press E to
  climb out of the van." Outside, a third barrier stops them walking back along the van's road side into the traffic
  lane (`StopScene.buildWorld`, `blocked()`). Checked with the play tool: D stops at x 600, A at 550, a click on the
  house stays in the van.

### STOPS-M5-2: Cargo shelves: hovering selects, so moving the mouse to "Take this package" across another box takes that box instead
- **Severity:** major (the wrong pull is counted against the trainee, `S.wrongPulls++`)
- **Where:** every stop, cargo shelves overlay
- **Repro:** m5-pod stop 1, E (Search the shelves). Click the box on B1 (label panel shows it). Move the mouse to the
  right-hand panel along a path that crosses the B4 box (`/move?x=735&y=400`, then `/move?x=1000&y=560`), click
  "Take this package". "Carrying:" now lists **216 Birch Ln** (B4), not the B1 box that was clicked.
- **Expected:** a click selects and the selection sticks; hover only previews (or the preview snaps back to the
  clicked box on pointer-out). **Actual:** `pointerover` calls `select(p)` (StopScene.js:883), so the last box the
  pointer crossed is the one taken. The Take button is 300-900 px away from the boxes, so crossing another box on the
  way is easy (row B has boxes at B1 and B4, directly between B1 and the button).
- **Evidence:** `m5b-09-carrysel.png` (carrying 214, 216 and 41 Birch Ln after "taking" only B1 and C2 plus the
  earlier envelope).
- **Suggested fix:** keep a `clicked` selection separate from the hover preview; the button acts on the clicked
  box; on pointer-out restore the clicked box's label. Or put a "Take" button on the box itself.
- **Status:** fixed — hovering a box only previews its label (and the preview returns to the picked box on
  pointer-out); a click picks it, and "Take this package" acts on the picked box. Checked: click the right box, hover
  a wrong one, Take: the right one is carried.

### STOPS-M5-3: Cargo shelves: no visible way to put back a package you already carry, and with two or more you cannot choose which
- **Severity:** minor
- **Where:** cargo shelves overlay, reopened while carrying something
- **Repro:** take a wrong box, Done, reopen the shelves (E). Taken boxes vanish from the shelf; the panel says
  "Carrying: 41 Birch Ln" and the button reads "Take this package", greyed out. The only way back is to click the
  green "Carrying:" line, which has a hand cursor but looks like plain text (no hint anywhere). With several held
  ("Carrying: 214 Birch Ln, 216 Birch Ln, 41 Birch Ln") that click always selects the last of them in shelf order
  (`held[held.length - 1]`, StopScene.js:900), so to drop the first one you must first put back every later one,
  including the right package.
- **Expected:** carried packages listed as separate clickable chips (or shown ghosted in their shelf slot) each with
  its own "Put it back". **Actual:** as above. Lines 891-895 build invisible 1-px texts for "held list clickable",
  which is dead code left from an unfinished version of this.
- **Evidence:** `m5b-08-righttaken.png`, `m5b-09-carrysel.png`
- **Suggested fix:** draw carried packages ghosted in their slot (click = select = Put it back), or make each
  address in the Carrying line its own button; remove the dead loop.
- **Status:** fixed — a carried package stays in its shelf slot, ghosted and tagged "IN HAND"; clicking it picks it
  and the button reads "Put it back", so any one of several can go back. The Carrying line says so; the dead
  invisible-text loop and the click-the-carrying-line trick are gone.

### STOPS-M5-4: The E prompt in the van gives away whether you pulled the right package before you scan it
- **Severity:** design
- **Where:** van, after closing the shelves
- **Repro:** pull a wrong package, Done: the prompt says "Search the shelves". Pull exactly the right one(s), Done:
  the prompt flips to "Climb out of the van". `prefer()` for both uses `packagesInHand()`, which is true only for
  exactly the right set (StopScene.js:190, 196, 927).
- **Expected:** the check is the scan (and the label read). **Actual:** the prompt text is a free correctness oracle,
  so a trainee can skip reading labels and just watch which prompt comes up.
- **Suggested fix:** prefer "Climb out" whenever anything is carried (or once a scan has been done), not only when
  the set is correct.
- **Status:** fixed — E prefers the shelves while nothing is carried and the door once anything is, right or wrong;
  only the scan and the label tell whether it is the right package.

### STOPS-M5-5: The POD photo is a picture of the courier: they stand in front of the package and the house number, and it still grades "clearly in the shot"
- **Severity:** major (the core lesson of m5-pod is what a good POD photo shows)
- **Where:** m5-pod stop 1 (214 Birch Ln), Deliver… > Left at location (photo) > Behind the planter > photo camera
- **Repro:** play to the photo camera. The courier walks to the planter (x 1794) and stays there, facing the street,
  for the whole photo. Frame package + door (click 560,496): the preview on the handheld is the courier's torso and
  head, the "214" plaque hidden behind their head and the box half hidden behind their legs and the porch railing.
  The handheld says "Package and location are both clearly in the shot."
- **Expected:** the courier steps back (or is hidden) for the photo, and the package reads clearly; a photo in which
  the package is mostly covered is not "good". **Actual:** grading is pure bounding-box overlap
  (StopScene.js:1378-1382: package bounds, door point or number point inside the frame), with no test for what is in
  front. Also, the box "behind the planter" is drawn in front of and beside the planter, in full view of the street.
- **Evidence:** `m5b-18-photo.png` (camera up, courier in the frame), `m5b-19-photo-crop.png`, `m5b-21-goodphoto.png`
  (the accepted "good" photo)
- **Suggested fix:** walk the courier back to the path (or fade them out) before the camera opens; draw the package
  behind the planter (lower depth, partly covered by the pot) so "behind the planter" looks like it; count the
  package as in only if its visible part is in frame.
- **Status:** fixed — after setting the package down the courier steps back towards the street (out of the 380 px
  frame) before the camera comes up, and a package left "behind the planter" is drawn behind the pot (depth under the
  prop, 24 px in from it), partly hidden, instead of in front of it.

### STOPS-M5-6: A failed POD photo still offers "Use this photo" as the highlighted first choice, on a green success header
- **Severity:** minor
- **Where:** photo review on the handheld after a bad or "ok" photo
- **Repro:** in the photo camera click on the tree (1100,300). The handheld: green "PHOTO POD" header, red "The package
  isn't fully in the frame.", then **1 Use this photo** (solid purple, the primary button) and 2 Retake (ghost).
- **Expected:** after a bad photo Retake is the primary choice (key 1) and the header is amber/red; "Use this photo"
  is still possible but reads as the risky choice. **Actual:** the same layout as a good photo (StopScene.js:1407-1414).
- **Evidence:** `m5b-20-badphoto.png`
- **Suggested fix:** colour the header by grade and swap button order/skins when grade is not good.
- **Status:** fixed — the photo review header is green, amber or red by grade, and after an "ok" or bad photo Retake
  is the first, primary option (key 1) with "Use this photo" second.

### STOPS-M5-7: The photo instructions run into the objectives panel
- **Severity:** polish
- **Where:** photo camera, every left-at-door stop
- **Repro:** open the photo camera. "PHOTO PROOF: frame the package AND the door or house number, then click" is
  centred at y 75 and spans screen x 254-1027; the objectives panel (x 20-350, y 72-240) is still drawn, so the
  heading starts on top of the panel's right third.
- **Evidence:** `m5b-19b-hdr.png`
- **Suggested fix:** hide the objectives panel in photo mode (the whole screen is the viewfinder), or move the
  instruction to the bottom.
- **Status:** fixed — the objectives panel is hidden while the camera is up and comes back after the shot. The
  viewfinder's dark bands are now four plain rectangles and a pre-drawn frame, moved with the pointer.

### STOPS-M5-8: The spot choice labels the right answer "(as the note asks)"
- **Severity:** design
- **Where:** m5-pod stop 1, Deliver… > Left at location (photo) > "LEAVE WHERE?"
- **Repro:** the options are "Behind the planter (as the note asks)", "On the doormat", "At the bottom of the steps"
  (data/m5_stops.js:59).
- **Expected:** the trainee has to have read the customer note (on the label, the handheld and the brief). **Actual:**
  the answer is spelled out in the button; the stop report then praises "Left it in a sensible spot: behind the
  planter (as the note asks)".
- **Suggested fix:** label it "Behind the planter"; keep "as the note asks" for the report line.
- **Status:** fixed — the spot reads "Behind the planter"; the report line still says "behind the planter, as the note
  asks" (`report` on the spot in `data/m5_stops.js`).

### STOPS-M5-9: In m5-pod and m5-exceptions the unsafe climb answers are asked every stop but never reported
- **Severity:** minor
- **Where:** "How do you climb down?" / "How do you climb in?" cards; stop report
- **Repro:** m5-pod stop 1, climb back in with "2. Jump up in one move while carrying things". The only feedback is a
  thud and a camera shake; the stop report lists nine lines and none is about climbing. The checks are logged
  (StopScene.js:1479-1480, category `safety`), but m5-pod and m5-exceptions report only `service` and `efficiency`
  (data/modules.js:191, 202), so they are filtered out.
- **Expected:** a question the trainee must answer has visible consequences. **Actual:** the wrong answer is silent
  in two of the three M5 scenarios (m5-adult does include `safety`).
- **Suggested fix:** show safety lines in every stop report (they may simply not count towards the module's stars),
  or give immediate feedback on the card ("Jumping down is how couriers get hurt").
- **Note:** the two options are shuffled per stop, so a trainee who learnt "press 1" on stop 1 jumps down on stop 3
  without knowing it (it happened to me: stop 3's log has `safety 0/2 Climbed down from the cab with three points
  of contact`, and the report never mentions it; `m5b-45-report3.png`).
- **Status:** fixed — every stop scenario now shows the safety category (WP1, STOPS-M8-5), so the climb checks are in
  the report and the stars, and an unsafe climb says why at once ("Jumping down is how couriers hurt knees and
  ankles…").

### STOPS-M5-10: Pressing E on "Talk" while the resident is coming to the door starts a second, hidden copy of the conversation, and both copies are scored
- **Severity:** major (silently scores an answer the trainee never picked; happens to anyone who presses E the moment
  the door opens)
- **Where:** every stop where the resident answers and talks (m5-pod stop 2 Marcus, m5-exceptions stop 3 Alma,
  m5-adult Helen/Tyler/…); any stop with `answer.talk`
- **Repro:** m5-pod stop 2 (58 Oak St). Ring (E at x 1611), `/run?ms=4000`: the door opens and the prompt shows
  **"Talk"**. Press E. `/stage` says `locked: 2`; `/texts` lists every line twice ("Marcus Bell" ×2, "Morning! Oh
  nice…" ×2). At the choice, two choice stacks are drawn on top of each other in different shuffled orders (text
  of one shows through the other). Press 3: the visible stack's 3 is the good answer ("GOOD CALL"), the hidden
  stack's 3 is "Not my rules, man." The log gets both: `service -2/2 Explained the signature requirement` and
  `service 2/2 Explained the signature requirement`.
- **Expected:** one conversation. **Actual:** `answerDoor()` sets `S.answered = true` at once and schedules
  `startTalk()` 900 ms later (StopScene.js:981, 990); in that window the "Talk" interaction is usable (its `when`
  is `S.answered && resident && !S.talked`, StopScene.js:262), so E starts a talk and then the timer starts another.
  `startTalk()` has no guard against `this.talkCtl` already running (StopScene.js:1035-1040).
- **Evidence:** `m5b-29-choices.png` (two stacks overlapping), `m5b-30-feedback.png`; log excerpt above. The stop 2
  report then lists "Explained the signature requirement" twice, one ✗ ("Explain requirements in a helpful way, not
  a dismissive one.") and one ✓, and the module results screen's KEY TAKEAWAYS lectures "Explain requirements in a
  helpful way, not a dismissive one." to a trainee who chose the good answer.
- **Reproduced a second time** on m5-exceptions stop 3 (77 Willow Way, Alma): ring, poll `/run?ms=400` until the
  prompt says "Talk", press E: `locked: 2`, the two copies type out of step. Clicking the visible good answer ("No
  problem. I'll record that you've refused it…") with the mouse registered on the hidden stack instead:
  `service -2/2 Handled a refused package`; that copy ended and the other one sat waiting at its choice
  (`m5b-57-alma-stuck.png`); answering it added `service 2/2 Handled a refused package`. So with the mouse the
  trainee's own pick can be lost entirely.
- **Suggested fix:** `if (this.talkCtl || this.S.talked) return;` at the top of `startTalk()`, and set `S.talked`
  (or a `talkPending` flag checked by the Talk `when`) when the auto-talk is scheduled.
- **Status:** fixed — `startTalk()` returns if a conversation is running or already happened, and while the resident
  is about to start talking (`talkPending`) there is no "Talk" prompt. Checked: E pressed every 150 ms through the
  door opening gives one conversation (one lock, one speaker).

### STOPS-M5-11: At a business the building number is hidden behind the awning, but the address check says "ON THE BUILDING 900"
- **Severity:** minor (the check teaches "compare the number on the building", and there is no number to see)
- **Where:** m5-pod stop 3 (Brightline, 900 Market St); likely every `business` lot with an awning (m5-exceptions
  stop 2 Northwind Dental too, not re-checked)
- **Repro:** walk to the Brightline door. No "900" anywhere on the facade (sign, awning, door, hours card, windows).
  `lot.numberX/numberY` put the number at screen (743, 318), which is the top edge of the striped awning, so the
  awning covers it. E "Check the address number": the card shows ON THE BUILDING **900** / ON THE LABEL 900,
  "Numbers match."; the prompt itself sits on the "BRIGHTLINE" sign.
- **Evidence:** `m5b-40-biznum2.png` (facade without prompt), `m5b-38-biznum.png`, `m5b-39-checknum.png`
- **Suggested fix:** draw the number on the glass door or above the awning (and set numberY to match), check its
  depth against the awning.
- **Status:** fixed — a shop's number plaque is drawn above its awning (`buildingLayout` numberY for `business`),
  where the address check's prompt and click spot now are too. Checked on 900 Market St.

### STOPS-M5-12: The handheld closes itself after the last step, so the trainee's TAB to close it opens it again
- **Severity:** minor
- **Where:** after "Use this photo" (left at door) and after picking the printed name (hand-off / reception)
- **Repro:** finish a delivery on the handheld, then press TAB as you would to put it away: the handheld slides back
  up on the home screen ("STOP RECORDED"), and a second TAB is needed. Seen on stop 1 and stop 2 of m5-pod.
- **Expected:** one consistent rule: either the device stays up until TAB/Close, or it closes with a clear
  animation and ignores a TAB in the next ~500 ms. **Actual:** `hh.close()` in the final `onPick`
  (StopScene.js:1412 and the printed-name handler), so TAB toggles it open.
- **Evidence:** `m5b-22-afterpod.png`, `m5b-34-afterhandoff.png`
- **Suggested fix:** leave it open on the "STOP RECORDED" screen (the trainee closes it), or swallow TAB briefly
  after an auto-close.
- **Status:** fixed — the handheld ignores a TAB that would reopen it within 0.7 s of closing itself
  (`Handheld.closedAt`), so the TAB a trainee presses to put it away does not bring it back.

### STOPS-M5-13: Door ping-pong: going in lands you on "Go back outside", coming out lands you on "Go inside"
- **Severity:** minor
- **Where:** business stops (m5-pod stop 3, m5-exceptions stop 2)
- **Repro:** E "Go inside": in the lobby the courier is placed at entryX + 70, 10 px from the "Go back outside" stand
  point, so that prompt is up at once and a second E (a double tap, or E pressed during the fade) walks straight
  back out. Coming out puts the courier at doorX - 60, 20 px from the "Go inside" stand point, same again. "Go
  inside" and "Check the address number" also stay offered after the delivery is recorded.
- **Evidence:** `m5b-41-lobby.png`, `/stage` after exiting: `nearest: "Go inside"`, x 1610.
- **Suggested fix:** place the courier a step past the door (out of range of the reverse interaction), and hide
  "Go inside"/"Check the address number" once the stop has an outcome.
- **Status:** fixed — going in puts the courier 200 px into the lobby and coming out 150 px from the door, both out of
  range of the reverse interaction, and "Go inside" / "Try the door" / the address check are gone once the stop has an
  outcome. Checked: a double E at the door stays inside.

### STOPS-M5-14: Stop report shows one conversation answer as two identical lines
- **Severity:** polish
- **Where:** m5-pod stop 3 report (and any talk choice whose effects touch two categories)
- **Repro:** at Brightline answer "Perfect, thanks. I'll have you sign…". The report's first two lines are both
  "Handled a business hand-off" (1/1 with the efficiency icon, 2/2 with the service icon).
- **Evidence:** `m5b-45-report3.png`
- **Suggested fix:** merge per-choice items into one line with both icons, or suffix the category.
- **Status:** fixed — when two report lines share a label (one answer scored in two categories) each names its
  category: "Handled a business hand-off (efficiency)" / "(service)".

### STOPS-M5-15: Small z-order/overlap defects at the door and the reception counter
- **Severity:** polish
- **Where:** m5-pod stop 2 door, stop 3 lobby
- **Repro / Actual:** (1) at 58 Oak St the courier stops 67 px from Marcus, so the package and the courier's arm
  overlap Marcus's body and a porch post cuts between them (`m5b-26-overlap.png`); (2) the receptionist's shoes
  poke out below the front of the reception counter (`m5b-43-counter.png`); (3) on entering the lobby the
  "BRIGHTLINE" sign is cut by the right edge of the screen (`m5b-41-lobby.png`).
- **Suggested fix:** stand point for a hand-off about 110 px from the resident; hide the receptionist's legs behind
  the counter (depth or crop); frame the lobby so the sign is whole.
- **Status:** fixed — (1) the resident answers from the doorway (door + 20) and a conversation walks the courier to
  110 px from them first, so they no longer overlap; (2) the receptionist stands 20 px higher, feet behind the counter
  front; (3) the lobby sign is kept inside the view from the entrance. Checked with screenshots of all three.

### STOPS-M5-16: Standing at the doorbell and the house number shows no prompt at all: their E spots are on the other side of the door
- **Severity:** major (this is a direct cause of the owner's "prompts don't show until you wiggle", for "Check the
  address number" and "Ring the doorbell", at every house)
- **Where:** every `house` lot (all M5 houses: 214 Birch Ln, 58 Oak St, 311 Cedar Ave, 77 Willow Way, 18 Aspen Ct,
  402 Spruce St, 9 Linden Pl)
- **Repro:** m5-exceptions stop 1 (311 Cedar Ave, door x 1700). The doorbell button and the "311" plaque are both
  drawn at doorX + 78 = x 1778, right of the door. Click the doorbell (or walk to it): the courier stops at x 1778,
  right in front of the bell and the number, and **no prompt shows**. `/stage`: `nearest: null`, usableNearby
  "Check the address number" standX 1640 dist 138 range 80; "Ring the doorbell" standX 1620 dist 158 range 70.
  The prompts only exist in a window left of the door (ring 1550-1690, number 1560-1720), and the "Ring the
  doorbell" bubble is drawn at doorX - 70, over empty wall on the far side of the door from the bell.
- **Why it feels like "wiggle":** walking up from the van the ring prompt comes on 150 px before the door; a trainee
  who walks on to the bell (where it obviously is) walks out of both windows and loses the prompt; stepping back a
  little brings it back. With a mouse, clicking the bell or the number always lands in the dead spot. Clicking the
  door itself lands on x 1700, where only "Check the address number" is in range (dist 60), so E checks the number
  instead of ringing.
- **Expected:** stand in front of the bell (or the door) and E rings; stand in front of the number and E checks it.
- **Evidence:** `m5b-48-atbell.png` (courier covering bell and number, no prompt); `/stage` excerpt above. The
  door-click case reproduced on m5-adult stop 2 (402 Spruce St): clicking the door put the courier at x 1705 with
  the prompt "Check the address number". The ring animation also presses the left door jamb, 150 px from the bell
  art (`m5b-49-ring-2.png`).
- **Suggested fix:** in StopScene.js:222-258 put the ring interaction at `x: L.bellX, standX: L.bellX` for houses
  (as the apartment branch already does with `L.bellX`), and "Check the address number" at `standX: L.numberX`
  (drop the `Math.min(L.numberX, L.doorX - 60)`); or move the bell and number art to the left of the door. Give
  the door itself a hotspot (clicking it = ring/knock). Draw each prompt above the thing it acts on.
- **Status:** fixed — the doorbell is drawn left of the door (under the lamp) and the ring interaction is centred on
  it; the address check is centred on the number (right of the door). Both are clickable where they are drawn, and
  clicking the door rings. Walking from the van the prompt reads "Ring the doorbell" from x 1566 to 1688 and "Check
  the address number" from 1708 to 1857: no dead spot, and each prompt floats above its own target.

### STOPS-M5-17: Two toasts drawn on top of each other after attaching a door tag
- **Severity:** minor (unreadable)
- **Where:** m5-exceptions stop 1 (and any door-tag stop), right after E "Attach the door tag"
- **Repro:** Record NA > Print door tag (toast "Door tag DT625762 printed. Attach it to the door.") and within its
  lifetime E "Attach the door tag" (toast "Door tag left on the door."). Both are drawn at y 93, centred, at the
  same depth: the screen reads "Door tag D1Door tag left on the door. to the door."
- **Evidence:** `m5b-52-tagged.png`; `/texts` lists both at y 93.
- **Suggested fix:** `say()` should replace (destroy) the current toast, or stack toasts vertically.
- **Status:** fixed — `say()` replaces the message on screen instead of stacking a second one on top of it.

### STOPS-M5-18: After the outcome is recorded, the door still offers "Ring the doorbell" (and "Check the address number")
- **Severity:** minor
- **Where:** m5-exceptions stop 1 after Record NA and attaching the tag; m5-pod stop 1 after the photo POD
- **Repro:** record the exception and attach the tag: the prompt over the courier becomes "Ring the doorbell"
  (`m5b-52-tagged.png`). The ring `when` only tests `!S.answered && !waitingDoor && !S.done`
  (StopScene.js:257), not whether the stop already has an outcome.
- **Expected:** once the stop is recorded, the door offers nothing (the objective list already says "Put the package
  back in the van"), so the next prompt the trainee sees is the van's. **Actual:** they can ring again after leaving
  a door tag, which a real customer would find odd, and it is not scored either way.
- **Suggested fix:** add `&& !this.S.outcome` to the ring/knock/buzz and address-check `when`s.
- **Status:** fixed — ring/knock/buzz and the address check are only offered until the stop has an outcome (and the
  address check not while waiting for the door, so an impatient E does not open it).

### STOPS-M5-19: Leaving a package outside a closed business still scores two service stars, "Delivered the correct package ✓" and "Knocked or rang ✓"
- **Severity:** major (a wrong outcome is mostly rewarded)
- **Where:** m5-exceptions stop 2 (Northwind Dental, CLOSED, expected BC + door tag)
- **Repro:** try the door ("Locked. The sign says CLOSED."), then Handheld > Deliver… > Left at location (photo) >
  On the doormat, photo, Use this photo. Report header "1200 Harbor St · DELIVERED", service ★★☆: ✓ Delivered the
  correct package 3/3, ✓ Took a clear proof-of-delivery photo 2/2, ✓ Knocked or rang before leaving the package 1/1
  (only the door was tried), ✗ Didn't deliver when the rules said not to 0/3. Nothing about the missing BC
  exception or door tag.
- **Expected:** leaving a package at a closed business fails the stop's main service check and the ticks that only
  make sense for a correct delivery are not awarded. **Actual:** the only penalty is one 0/3 line; 7 of 10 service
  points are kept. The handheld also offers "On the doormat" at a business with no hesitation (fine as a trap, but
  then the scoring must bite).
- **Evidence:** `m5b-55-report-ex2-bad.png`; log excerpt: `service 3/3 Delivered the correct package`,
  `service 0/3 Didn't deliver when the rules said not to`, `service 2/2 Took a clear proof-of-delivery photo`,
  `service 1/1 Knocked or rang before leaving the package`.
- **Suggested fix:** when the expected outcome is an exception, a delivery should zero "delivered the correct
  package"/photo/knock lines (or replace them with one heavy "Left a package that should have come back" line), and
  cap the stop at one star.
- **Status:** fixed — a delivery where the rules said not to deliver earns none of the right-delivery ticks (right
  package, scans, spot, photo, knock, printed name); its "Delivered when the rules said not to" check is critical, so
  the stop and the module show Service at most 1★ and the results say "CRITICAL MISTAKE".

### STOPS-M5-20: Releasing an adult-signature package to a 20-year-old still ends the module on "GREAT WORK!" with two service stars
- **Severity:** major (teaches that the one unforgivable mistake in the module costs a star)
- **Where:** m5-adult stop 2 (402 Spruce St, Tyler Brooks, born 11/03/2005, today 09/17/2026) and the results screen
- **Repro:** at the ID check pick "Verified: 21 or older", sign, record "Tyler Brooks". Stop report: service ☆☆☆, but
  ✓ Delivered the correct package 3/3, ✓ Recorded the signer's real printed name 2/2, and two negative lines shown as
  "-3/2" and "-2". Stops 1 and 3 played correctly. Results: **"GREAT WORK!"**, score 5100, Service ★★☆.
- **Expected:** releasing a restricted package without valid ID (and leaving a package at a closed business,
  STOPS-M5-19) is a critical failure: the stop fails, the module cannot show "GREAT WORK!" or more than one star,
  and the takeaway leads with it. **Actual:** it averages out; the takeaways do mention it (good).
- **Evidence:** `m5b-61-report-ad2-bad.png`, `m5b-64-adult-results.png`
- **Suggested fix:** a `critical` flag on log items (illegal release, package left after a failed attempt) that caps
  the stop and the scenario rating; also show negative lines as "-3" rather than "-3/2".
- **Status:** fixed — releasing a signature or adult-signature package against the rules, and leaving one unattended,
  are `critical` penalties: the stop report caps the category at 1★ and marks the line "CRITICAL ·" in red, and the
  module result says "CRITICAL MISTAKE" with Service at most 1★ and the lesson first. Penalty lines already print as
  "-2"; the "-3/2" seen was not reproduced.

### STOPS-M5-21: The ID card covers the person holding it, so "compare the photo" is impossible
- **Severity:** minor
- **Where:** m5-adult, every "CHECK PHOTO ID" screen
- **Repro:** Deliver… > Handed to recipient on an adult stop. The handheld says "Helen Ortiz is holding up their
  ID. Compare the photo, the name, the date of birth and the expiry date." The ID card overlay spans screen x
  362-756, y 180-478; the resident's head is at x 602-673, y 378-440, underneath it. Every ID photo is a generic
  portrait anyway, so the "photo" part of the check can never fail. "their ID" is also odd for a named woman.
- **Evidence:** `m5b-58-idcheck.png`, `m5b-59-idcrop.png`, `m5b-63-grace-id.png`
- **Suggested fix:** place the card to the left of the pair (x 60-450) so both faces stay visible, and use the
  resident's own rig face in the ID photo (one stop could then be a real photo mismatch).
- **Status:** fixed — the ID card is shown left of the courier and the customer (centre 250, 400), so both faces stay
  in view; the handheld now says "<name> holds up a photo ID. Compare the photo with the face in front of you…". The
  ID photo already used the resident's own face (`OTR.art.portrait` from their spec), so it can be compared.

### STOPS-M5-22: Prompts are invisible while walking, and the E windows are narrow and off-centre, so trainees stop in dead spots
- **Severity:** design (the general part of the owner's "wiggle" complaint; STOPS-M5-1 and STOPS-M5-16 are the two
  concrete bugs)
- **Where:** stage.js:366-368 (`if (it && !this.me.moving) this.showPrompt(it)`), every walkable stop
- **Repro:** hold D from the van to the house: no prompt appears on the way, not even while passing through the
  ring window (140 px wide = 0.6 s at walking speed). A trainee sees nothing until they stop, and if they stop
  past the window (at the bell, the number, the door) they see nothing then either. Stepping back in 30 px taps
  finds it (`hold?key=KeyD&ms=120` steps: x 1533 none, 1563 Ring, 1618 Ring, 1647 Check number, 1733 none).
  E does work while walking (useNearest ignores `moving`), so the rule only hides information. Also, while
  waiting for the door the prompt becomes "Check the address number" (ring is disabled), so an impatient E opens
  the address card instead of knocking again.
- **Checked and ruled out** (all showed the prompt at once, in turn-based and real-time mode): right after the stop
  starts; after closing the shelves (Esc and the Done button); after closing the handheld (TAB and "4 Close" by
  mouse); after climbing down and up; after the address-check card; after a conversation; after pause/resume with a
  key held and released during the pause; after click-to-walk; with SHIFT held. The prompt is never placed under the
  HUD bar or the objectives panel in M5 (all M5 prompts sit at screen y 254-377, x ≥ 476).
- **Suggested fix:** show the prompt while moving (perhaps at 60 % alpha) and pop it to full on stop; centre each
  window on the thing it acts on (STOPS-M5-16); make ranges at least ±90 px.
- **Status:** fixed — the stage shows the E prompt whenever E would do something, walking or standing
  (`stage.update`), and the door interactions are centred on their targets with 80 px windows that meet without gaps
  (STOPS-M5-16). Clicking something that cannot be used right now walks there like a ground click.

### STOPS-M5-23: "Restart" in the pause menu restarts only the current stop
- **Severity:** design
- **Where:** pause menu in any M5 stop after stop 1
- **Repro:** m5-exceptions stop 3, ESC > Restart: the scene reloads at "Stop 3 of 3 · 77 Willow Way" with the clock
  back to 5:56 PM; the log keeps stops 1 and 2 (`groups: {ex1: 9, ex2: 10}`). Under the heading "Exception Calls" the
  button reads as "restart the scenario".
- **Suggested fix:** label it "Restart this stop" and add "Restart scenario", or make Restart go back to stop 1.
- **Status:** fixed — the pause menu takes its restart choices from the scene: past stop 1 of a practice set it offers
  "Restart this stop" and "Restart the set"; stop 1 says "Restart the set" and a route-day stop "Restart this stop".
  The route-day golden path matches the new label.

## Revisit

- Cargo shelves are mouse-only (no arrow keys / number keys to pick a box; only Esc = Done). A keyboard-only trainee
  cannot pull a package. Not tested further.
- The printed-name choice is always the resident's name vs "Occupant" (plus the addressee at reception/ad2); very
  easy. Consider a realistic mismatch (the resident gives a nickname, a family member signs).
- The door-tag question "Print a door tag so the customer knows you tried, and what happens next?" answers itself.
- "Helen Ortiz is holding up their ID": pronoun; "Tracking says the customer is often at work" (ex1 brief) gives away
  NA before the attempt.
- Game time runs slower than real time in the headless tool (a 1.4 s animation took ~2.4 s of `/run`); worth a
  check on a low-end laptop that the rig's `Math.min(delta, 100)` cap does not make the courier crawl at < 10 fps.
- Apartments and yard gates: none of the M5 stops has an apartment or a gate, so buzzers, the gate barrier and
  `onBlocked` were not exercised here (they are in M8 stops).
- m5-exceptions stop 3 (RF) was recorded but not finished after the Restart test; the RF report and the
  m5-exceptions results screen were not seen.
- The `_openModals`-only cards (climb card, address check) leave the stage unlocked, so the prompt for the next
  interaction is created underneath the card. Harmless in M5 (always hidden behind the card), but a smaller card
  would show an "E …" bubble that E does not act on.

## Summary

The ten findings that matter most, in order:

1. **STOPS-M5-10** (major): pressing E on "Talk" during the 900 ms before the auto-talk starts a second hidden copy
   of the conversation; both copies are scored, with the mouse the trainee's pick can land on the hidden copy.
   Reproduced on two stops.
2. **STOPS-M5-16** (major): at every house the doorbell and the house number are drawn right of the door but their
   E windows are left of it; standing at (or clicking) the bell/number shows no prompt, clicking the door gives the
   wrong one. A direct cause of the owner's "wiggle to get the prompt".
3. **STOPS-M5-1** (major, earlier tester, extended): walking (keys or mouse) straight out of the van at floor height,
   with every outside prompt disabled. The other direct cause of "prompts don't show".
4. **STOPS-M5-20** (major): releasing an adult-signature package to a 20-year-old still ends on "GREAT WORK!" with
   two stars; no critical-failure cap.
5. **STOPS-M5-19** (major): leaving a package at a closed business keeps 7/10 service points and ticks "Delivered the
   correct package" and "Knocked or rang".
6. **STOPS-M5-5** (major): the POD photo is of the courier covering the package and the number, graded "clearly in
   the shot"; the box "behind the planter" is in full view.
7. **STOPS-M5-2** (major): shelves select on hover, so the box the pointer crosses on the way to "Take" is taken and
   counted as a wrong pull.
8. **STOPS-M5-22** (design): prompts hidden while walking plus narrow, off-centre windows; list of prompt conditions
   checked and ruled out.
9. **STOPS-M5-9** (minor): the unsafe climb answers are shuffled per stop, logged, and never shown in m5-pod /
   m5-exceptions reports.
10. **STOPS-M5-11** (minor): business building numbers are hidden behind the awning while the address check reports
    them "ON THE BUILDING".

Also recorded: shelves put-back UX (3), the prompt as a correctness oracle (4), bad-photo defaults (6), photo header
over the objectives (7), "(as the note asks)" giveaway (8), the handheld auto-close/TAB reopen (12), door ping-pong
(13), duplicate report lines (14), small overlaps (15), stacked toasts (17), ring still offered after the outcome
(18), the ID card covering faces (21), and "Restart" restarting only the stop (23).

Not done: the m5-exceptions RF stop to its report and the scenario results; keyboard-only play of the shelves;
wrong exception codes (e.g. NA at a closed business, BC at a house) and skipping the door tag where one is required;
pausing during the photo camera and during the climb animations; performance on a real low-end machine.
