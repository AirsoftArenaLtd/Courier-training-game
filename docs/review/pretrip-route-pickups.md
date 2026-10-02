# Review: pretrip-route-pickups

Tester area: **m1-pretrip** (Pre-Trip Walkaround), **m1-route** (Route Planner), **m7-business**, **m7-intl**,
**m7-dg** (Pickups & Paperwork). Played with `test/tools/playd.js` on port 9306; screenshots in
`test/out/review/pretrip-route-pickups/`.

## Findings


### PRP-1: Pre-trip: no keyboard way to walk round the truck or get in the cab
- **Severity:** minor
- **Where:** m1-pretrip, every exterior view
- **Repro:** start m1-pretrip, dismiss the intro, press ArrowRight, ArrowLeft, A, D, Tab, Enter. Nothing changes (view label stays "DRIVER SIDE").
- **Expected:** the ◀ ▶ arrows drawn at the screen edges answer the arrow keys (and A/D, as in the walkable scenes); the cab button answers a key (C or Enter). **Actual:** mouse only. Inside a close-up the verdict buttons do have keys (P, F) and ESC closes it, so the scene is half keyboard-driven, which makes the missing keys feel like a bug.
- **Evidence:** /texts after each key: `◀ Front      DRIVER SIDE      Rear ▶` unchanged.
- **Suspected cause:** `src/scenes/m1/PreTripScene.js:56-60`, `viewButton()` binds only `pointerup`; no keyboard handlers in the scene.
- **Suggested fix:** bind ArrowLeft/ArrowRight/A/D to `turn(∓1)` (ignored while `_openModals > 0` or in the cab), C to `toggleCab()`, and show the key hints on the buttons like the P / F hints.
- **Status:** fixed — A / D and the arrow keys walk round the truck (hints under the ◀ ▶ buttons), C climbs in and out
  (on the button), L works the cab's lights switch, T runs a close-up's test and P / F judge it (the hints are on the
  buttons); ignored while a close-up is open.

### PRP-2: Pre-trip close-up: the instruction and the reading are pale orange on white, barely legible
- **Severity:** minor
- **Where:** m1-pretrip, every close-up that needs a test (tires, lamps, horn, belt, brake)
- **Repro:** open any tire close-up; read "Drag the tread gauge onto the tread to measure it." then drag the gauge and read "Gauge reads 9/32" — plenty of tread left."
- **Expected:** the one line telling the trainee what to do (and the measured result) is the most readable thing in the box. **Actual:** 15 px regular weight `#FFB27A` on the modal's near-white background, contrast about 1.7:1 (WCAG asks 4.5:1). On a typical office monitor it all but disappears; the lamp line "Switch the lights on in the cab before you judge a lamp." is the only explanation of why Pass/Flag are greyed out.
- **Evidence:** `test/out/review/pretrip-route-pickups/p07-note-crop.png`, `p05-tire.png`
- **Suspected cause:** `PreTripScene.js:240` (`OTR.txt(..., 15, '#FFB27A', ...)`).
- **Suggested fix:** a dark orange such as `#B34700` (or the modal's body purple `#250849`), bold, 16 px.
- **Status:** fixed — the close-up's instruction and reading are 16 px bold dark orange (#8A3A00) on the white modal,
  not pale orange.

### PRP-3: Pre-trip cab close-ups: the test button (horn / belt / brake) is half covered by Pass and Flag
- **Severity:** minor
- **Where:** m1-pretrip, IN THE CAB, close-ups of Horn, Seat belt, Service brake
- **Repro:** Climb into the cab, click the horn ring (455,350). Look at the bottom of the box.
- **Expected:** "Press the horn" sits clear above the verdict row. **Actual:** the purple test button (box y 174–218) and the Pass / Flag defect buttons (box y 202–254) overlap by 16 px; the bottom of "Press the horn" is cut off by them, and the lower third of the test button is really the Pass or Flag button. Once the test is done, a second click low on "Press the horn" (a trainee pressing it again to listen) lands on Pass or Flag and judges the item.
- **Evidence:** `test/out/review/pretrip-route-pickups/p14-horn-btn-overlap.png`, `p13-horn-pressed.png`
- **Suspected cause:** `PreTripScene.js:244` (`actionBtn` at y 196, h 44) against `PreTripScene.js:293-294` (verdict buttons at `h/2 - 52` = 228, h 52).
- **Suggested fix:** move the test button up to about y 150 and the note (y 150) up into the gap under the picture, or shrink the picture; the P / F key hints could also be drawn on the verdict buttons, which have keys nobody is told about.
- **Status:** fixed — the picture, the note and the test button are stacked clear of the Pass / Flag row (picture
  480×305 higher up, note at +118, test button at +164, verdict row from +204), so nothing overlaps and a second press
  on the test button cannot land on a verdict.

### PRP-4: Pre-trip: both side views are drawn mirror-image, and the front view's "driver side" headlight is on the curb side
- **Severity:** minor (teaches left/right wrong on a checklist that is all about sides)
- **Where:** m1-pretrip, DRIVER SIDE, CURB SIDE and FRONT views
- **Repro:** start m1-pretrip. DRIVER SIDE: the cab is drawn on the right of the screen, but the header says `◀ Front … Rear ▶` and ◀ does take you to the front. CURB SIDE: the cab is on the left, header `◀ Rear … Front ▶`. FRONT: the ring labelled "Headlight, driver side" is the lamp on the viewer's left, and "Turn signal, curb side" is on the viewer's right.
- **Expected:** standing at the driver (left) side of a left-hand-drive truck and facing it, the cab is on your left; facing the front of the truck, the driver's headlight is on your right. **Actual:** the side pictures are swapped relative to the walking direction, and on the front view the two lamps carry the wrong side's names. The windshield star crack, which the data says is "in the driver's line of sight", is correctly drawn on the viewer's right, i.e. on the other side from the "driver side" headlight, so the front view contradicts itself.
- **Evidence:** `p02-driver.png` (cab right, "◀ Front"), `p20-curb.png` (cab left, "Front ▶"), `p18-front.png` (headlight ring left, crack right)
- **Suspected cause:** `src/core/truckart.js:41` (`headlight_l: [0.24, …]`, `signal_r: [0.86, …]`) and the side-view painters, which draw the cab at the right for `driver`; the rear view (`taillight_l: [0.16, …]`, `◀ Driver side`) is correct.
- **Suggested fix:** flip the driver and curb side textures (and their spot x's: `x → 1 − x`), and on the front view swap the l/r spot positions (headlight_l to 0.76, signal_r to 0.14).
- **Status:** fixed — standing at the driver side the cab is on your left, at the curb side on your right, and on the
  front view the driver's headlight and signal are on the viewer's right (the windshield crack in the driver's line of
  sight now agrees); all hotspots moved with them, the entry steps are drawn under the cab door on the curb side, and
  the side views sit clear of the ◀ ▶ buttons.

### PRP-5: Pre-trip close-ups write some defects out in words, so those items test reading, not looking
- **Severity:** design
- **Where:** m1-pretrip, close-ups of Driver mirror, Curb-side door latch, Cargo door
- **Repro:** play until the mirror or a door latch is one of the random defects (`OTR.game.scene.getScene('PreTripScene').defects`), open its close-up.
- **Expected:** the data file promises "the CLOSE-UP shows the condition … nothing gives the answer away up front" (`data/m1_pretrip.js:4-5`). **Actual:** a bad mirror has the caption "you can see the sky and your own door"; a bad door latch has a red slash, a red tint and the caption "latch does not seat". Every other defect (reflector, steps, windshield, wipers, fuel cap…) has to be spotted, and a good door latch shows a plain door, so these two give the answer away and make the rest inconsistent. The door-latch lesson ("Test every latch by pulling on it, not by looking at it") also describes a test the close-up does not have: unlike the horn/belt/brake there is no "Pull the latch" button.
- **Evidence:** `src/core/truckart.js:452-455` (mirror caption), `:574-580` (door: slash, tint, caption); `p22-latch.png` (good latch for comparison).
- **Suggested fix:** drop the captions and the red marks; for the doors add a `needs: 'press'` test ("Pull on the latch") whose result shows the door holding or swinging open, which is what the lesson teaches.
- **Status:** fixed (decision) — close-ups show what there is to see and say nothing about the verdict: no caption on
  a knocked mirror (it shows sky and the truck's own door), no red slash, tint or caption on a latch, no red marks on
  a frayed belt, no "TAG MISSING" (the tie is empty), no "the case is empty", a neutral pedal marker. Both door
  latches get a pull test ("Pull on the latch"): a bad one lets the door swing open under the pull, a good one holds.

### PRP-6: Pre-trip efficiency rewards rushing: pass everything in 35 s and get three efficiency stars
- **Severity:** major (scoring rewards the wrong behaviour)
- **Where:** m1-pretrip, results
- **Repro:** start m1-pretrip, click through all 21 items passing almost everything (P key) as fast as possible, sign off. I caught 1 of 4 defects and wrongly flagged 2, in 35 s.
- **Expected:** a walkaround that rolled out three defects is not "walked in good time"; the lesson on screen is "Look properly, then decide." **Actual:** Safety 0 stars, **Efficiency 3 stars**, score 200 and "+3 new career stars", all from speed. A trainee who learns the pattern gets stars for skipping the inspection.
- **Evidence:** `p28-results2.png`; report `p26-report.png` ("1 caught · 3 missed · 2 wrongly flagged").
- **Suspected cause:** `PreTripScene.js:320` scores time on its own (`elapsed <= par ? 3 : …`).
- **Suggested fix:** scale the efficiency check by the safety ratio (or give no time credit when anything was missed), and/or add a minimum sensible time per item so clicking straight through earns nothing.
- **Status:** fixed — the walkaround's time check goes through `OTR.scoring.gateTime(time, accuracy)`, accuracy =
  caught / (defects + wrongly flagged): below 50 % the time earns nothing, above it the time ratio is capped by the
  accuracy. The 35-second pass-everything run (1 of 4 caught, 2 false flags) now gets 0 efficiency stars, and missing
  a defect is also a critical safety mistake (see PRP-23).

### PRP-7: Pre-trip tires: one painter and one reading for three different tire defects, and the limit is never taught
- **Severity:** minor (content)
- **Where:** m1-pretrip, tire close-ups and the tread gauge
- **Repro:** read `data/m1_pretrip.js` tire items and `src/core/truckart.js:348-394`; gauge any tire.
- **Expected:** what the close-up and gauge show matches the defect the report then describes, and the trainee learns the numbers. **Actual:**
  - All three tires share `close_tire`: a bad one is simply shallow tread (depth 6 vs 22) reading **2/32"**. The report then says the rear tire was "Worn to the wear bars **with a gouge in the sidewall**" and the curb-side front was "Badly worn **on one edge** — the alignment is out"; neither a gouge nor one-edge wear is ever drawn. The lesson "Sidewall damage is a defect even when the tread looks fine" cannot be practised, and "measure across the whole width" cannot either, because one drop anywhere on the picture gives the reading.
  - The gauge answers the question for you: the note says "at or under the limit. This tyre is out of service." or "plenty of tread left", and the readout box is red or green. The limits (4/32" on a steer tire, 2/32" elsewhere, US FMCSA 393.75) are never stated, so the trainee learns nothing they could use on a real gauge. For a steer tire, 2/32" is not "at" the limit but half of it.
  - Spelling: "tyre" in the gauge note (`PreTripScene.js:207`) and "kerb" in the curb-side tire lesson, in otherwise US English (tire, curb).
- **Suggested fix:** show only the number (and a wear-bar picture); state the limits once in the intro or on the gauge; paint the sidewall gouge and one-edge wear variants; make the reading depend on where the gauge is dropped for the uneven-wear tire. Fix "tyre"/"kerb".
- **Status:** fixed — the three tire defects are drawn as themselves: tread worn to the bars all over (front, 3/32"),
  a sidewall gouge with good tread (rear, the gauge reads 7/32"), and one edge worn (curb-side front: 1/32" on the
  inner half, 7/32" on the outer; the reading depends on where the gauge is dropped, and it can be dropped again). The
  gauge shows only the number in neutral colors; the limits (4/32" on a steer tire, 2/32" on the others) are stated in
  the intro and on every tire note. "tyre" and "kerb" are gone.

### PRP-8: Route Planner: two late First Overnights still end on "GREAT WORK!", confetti and 2/3 service stars
- **Severity:** design (scoring is too soft on the one thing the scenario teaches)
- **Where:** m1-route, results screen
- **Repro:** round 1 sequence Ground, Ground, Standard, Priority, First (First Overnight late), Dispatch anyway; round 2 do the pickup first and the First Overnight second (late); round 3 play the best order. Finish.
- **Expected:** the intro and every result card say "Commitments come first"; a day where the First Overnight (the 8:30 money-back commitment) was late twice should not be celebrated. **Actual:** "GREAT WORK!", confetti, Service 2 stars, Efficiency 2 stars, "+4 new career stars", score 4609. Service is a weighted ratio (First 3, Priority 2, Standard 1, pickup 3) summed over all three rounds, so two missed First Overnights only cost 6 of 30 points (80 %).
- **Evidence:** `r17-results.png`; round cards `r10-round1-result.png`, `r13-round2-result.png`.
- **Suspected cause:** `RoutePlannerScene.js:816-823` (weights from `data/m1_routes.js` services) and the shared headline rule `src/scenes/ResultsScene.js:36` (≥ 66 % of stars is "GREAT WORK!").
- **Suggested fix:** cap Service at 1 star when any First Overnight or pickup is missed (or weight First/pickups much higher), and let the scene pass a headline so a missed commitment never reads "GREAT WORK!".
- **Status:** fixed — a late First Overnight and a missed pickup are logged `critical`
  (`RoutePlannerScene.roundDone`): Service is capped at 1★, the headline is "CRITICAL MISTAKE" on a red header, no
  confetti, and the commitment lesson heads the takeaways marked "Critical:".

### PRP-9: Route Planner round card compares your driving time with the best plan's total time
- **Severity:** minor
- **Where:** m1-route, round result card
- **Repro:** round 2, pickup first (you wait 60 min). The card reads "Your loop 9.5 mi · 71 min driving", "Best plan 8.2 mi · 62 min", "Route efficiency 38%".
- **Expected:** like for like. **Actual:** "Best plan" shows `opt.cost` (driving + waiting + school-zone delay) while "Your loop" shows `ev.drive` only, so 71 vs 62 min looks like a 13 % gap but is scored as 38 %. Only a trainee who spots the separate "Waiting on shippers 60 min" row can work out why.
- **Evidence:** `r13-round2-result.png`
- **Suspected cause:** `RoutePlannerScene.js:836-837`.
- **Suggested fix:** show the same measure on both rows, e.g. "Your day 130 min (71 driving + 60 waiting)" against "Best plan 62 min".
- **Status:** fixed — the result card compares like with like: "Your day 9.5 mi · 130 min (71 driving + 60 waiting)"
  against "Best plan 8.2 mi · 62 min", both the whole day (driving, waiting and the school zone).

### PRP-10: Route Planner content nits (typo, lesson that describes a different model, one name at four addresses)
- **Severity:** polish
- **Where:** m1-route intro, result lessons, manifest cards
- **Details:**
  - Intro line 2: "FIRST OVERNIGHT is **a** 8:30 commitment" → "an 8:30" (`data/m1_routes.js`, intro.lines[1]).
  - Lesson `early`: "Arriving before a pickup is ready is a wasted trip. Build the window into the order instead of **driving back**." The planner never drives back: it parks you at the dock until the window opens (card shows "WAIT", ETA snaps to 9:15). Reword to "…you sit at the dock doing nothing".
  - Round 3 manifest: "Priya Nair" is the customer at 304 Birch Ln, 105 Oak St, 212 Harbor St **and** the 308 Maple Ave call-in pickup; in round 1 "Ray Ruiz" is at both 205 Oak St and 313 Birch Ln. Names come from `lot.person.name` (`RoutePlannerScene.js:243`), and the town's name pool is small. Trainees read these cards to tell stops apart.
  - Round 2: the Priority pin at 113 Birch Ln sits on the "SCHOOL ZONE" map label and hides most of it (`r11-round2.png`).
- **Status:** fixed — "an 8:30 commitment"; the early-pickup lesson says you "sit at the dock doing nothing"; a round
  never shows one name at two addresses (duplicates take a spare name); the school zone's label is written inside its
  band, so a pin beside the street no longer covers it.

### PRP-11: Pickups: a miscount is rewarded as a perfect reconciliation, and the shipper answers a number you never said
- **Severity:** major (teaches that raising any mismatch is right even when your own count is wrong)
- **Where:** m7-business (also m7-intl / m7-dg by the same code), "Piece count" choice
- **Repro:** m7-business; after the talk, click only 4 of the 6 boxes; Confirm the count; choose "Tell Priya you count 4, not 7, and ask them to check before you sign."
- **Expected:** the shipper recounts and the numbers are reconciled: either she points out there are six on the counter (your count was short) or the choice is scored below full. **Actual:** it scores 2/2 for "Reconciled the piece count", and the modal says *"Oh — the seventh was cancelled this morning. Sorry! I'll correct the manifest to six."* in reply to a courier who said four. The panel then reads "Manifest: 6 pieces (corrected from 7)" and "You've counted: 4 pieces" side by side, and nothing ever makes the trainee resolve the gap; they go on to inspect and sign for six. The only cost is the separate 1-point "Counted every piece waiting (4 of 6)". In m7-intl (manifest 2 = pieces 2, no `recount`), counting 1 and raising it also scores 2/2 and nothing at all happens.
- **Evidence:** `b07-count-choices.png`, `b08-recount.png`, panel texts after OK: `Manifest: 6 pieces (corrected from 7)` / `You've counted: 4 pieces`.
- **Suspected cause:** `src/scenes/m7/PickupScene.js:237-245` (the choices are built from counted vs manifest only; `raise` is always worth 2) and `:269-271` (the recount text is fixed).
- **Suggested fix:** score "raise" at 2 only when `k === n` (you counted everything); when `k < n` let the shipper reply "I count six on the counter — can you check again?" and send the trainee back to counting (or score it 1 with that note). Also: a counted piece cannot be un-counted, so the only possible miscount is a short one.
- **Status:** fixed — raising a short count gets the shipper's recount ("I make it 6 here, not 4. Have another look?")
  and the counting reopens; the count and the reconciliation are scored once, when the count is final (a short count
  raised first earns the reconciliation but not "counted every piece"), and the recount text is only ever shown after
  the right number was said. The same holds in m7-intl.

### PRP-12: Pickup inspection spells out every verdict in words, so "inspect" is just reading
- **Severity:** design (major for training value)
- **Where:** m7-business / m7-intl / m7-dg, INSPECT THIS PIECE modal, and the counter art
- **Repro:** m7-business, count, confirm, click each box.
- **Expected:** the trainee looks at the label and the box and decides. **Actual:** the right-hand note states the finding for every piece: good pieces say "Packaging is sound, the label is complete and readable."; bad ones say "The box is crushed along one edge and re-taped.", "There is no shipping label on this piece.", "Scale reads 164 lb." In m7-dg the declared box says "Hazard label and declaration are attached and match the contents." and the undeclared one "The shipper says the contents are hazardous, but there are no hazard marks or declaration." Even before inspection the counter art prints **NO LABEL** in red on the unlabelled box and shows **164 LB** on a red tag. The only judgement left is picking a reason, and the note usually names that too.
- **Evidence:** `b10-inspect.png` (good piece note), `b14-overweight.png`, `b05-pieces.png` (NO LABEL / red 164 LB on the counter), `PickupScene.js:278-294`.
- **Suggested fix:** draw the condition (crush, tape, missing label, scale readout) and drop the verdict sentences; keep neutral facts only ("Scale: 164 lb", "Contents list: lithium battery packs ×20"), and never print a "this is fine" line. Put the reasons' own descriptions (`reasons[].desc`, currently unused) on the refusal buttons instead.
- **Status:** fixed (decision) — the inspection lists the same neutral facts for every piece (Box, Label, Scale,
  Hazard marks, and Papers where there are any) and never a verdict (no "packaging is sound", no "declaration matches
  the contents"); the counter art no longer prints NO LABEL in red or a red weight tag; the refusal reasons show their
  descriptions under each button.

### PRP-13: Pickup takeaways are the first two mistakes in time order, so the conversation and the count crowd out the inspection
- **Severity:** minor (the three-takeaway limit from `warehouse.md` applies here too; this is about which three)
- **Where:** m7-business results (same code in m7-intl, m7-dg; the pre-trip and route planner pick the same way)
- **Repro:** m7-business: answer "Sure, no problem.", count 4 of 6, raise it, accept the crushed box, refuse a good box, refuse the 164 lb box as "Packaging", finish.
- **Expected:** the takeaways name the costly mistakes (accepting a crushed box that "will not survive the network", refusing a good one, the wrong refusal reason). **Actual:** all three are about counting: "Count and inspect at the counter…", "Count every piece yourself…", "Count the pieces against the manifest before you sign anything." (the third is a fixed keyLesson that repeats the second). Nothing about the three wrong inspection calls.
- **Evidence:** `b19-results.png`
- **Suspected cause:** `src/core/scorelog.js:63-70` returns lessons in log order and `PickupScene.js:462-463` keeps the first two, then pads with keyLessons.
- **Suggested fix:** rank lessons by points lost (a wrong accept/refuse is worth 2, the talk and the count less), one per kind, and skip a keyLesson that restates one already shown.
- **Status:** fixed — takeaways are ranked by `ScoreLog.takeaways()`: critical first, then by points lost, one per
  distinct lesson with its count, so the wrong accept/refuse calls (2 points each) come before the count (1) and the
  conversation. The scenario's key lessons now follow the ranked mistakes instead of filling in after the first two.

### PRP-14: Pickups (like the pre-trip, PRP-6) give time stars regardless of the calls made
- **Severity:** minor
- **Where:** m7-business results
- **Repro:** the sloppy run in PRP-13 took 26 s: Efficiency 2 of 3 stars, "+3 new career stars".
- **Suspected cause:** `PickupScene.js:457-459`, time check independent of correctness.
- **Suggested fix:** same as PRP-6: only credit speed when the calls were right.
- **Status:** fixed — the pickup's time check is gated by the share of right accept/refuse calls
  (`OTR.scoring.gateTime`), and a gated miss says why ("Speed only counts when the calls are right").

### PRP-15: International invoice: wrong flags are scored but never shown, and the "Sale" line is arguable
- **Severity:** minor
- **Where:** m7-intl, COMMERCIAL INVOICE and its result box
- **Repro:** m7-intl, count, sign, Check the paperwork; flag Description, Unit value, **Reason for export**, Shipper signature (miss Country of manufacture); Submit findings.
- **Expected:** the result names both the missed line and the line you flagged that was fine. **Actual:** "3 of 4 problems found / You missed: • Country of manufacture…". Nothing says "Reason for export: Sale" was correct, yet it silently cost a point (`hits - falsePos`, `PickupScene.js:405`). The false-flag lesson is only used when nothing was missed (`:406`).
- **Content:** the invoice says Description "Samples" and Reason for export "Sale". Samples are normally declared as "Sample" / not for resale, so a careful trainee has a fair case for flagging "Sale", and gets marked down for it with no explanation. Either make the reason "Sale" unambiguous (e.g. describe paid goods and keep "Samples" as the only vague line) or make "Reason for export" one of the problems with a `why`.
- **Also:** the instruction says "**Tap** every line", on a mouse-and-keyboard trainer; the invoice can only be opened once ("Paperwork checked ✓" is disabled), so it cannot be re-read while deciding the pieces; and after the count the toast says "Now inspect each piece" although the intro says to find every invoice problem *before* accepting, so the pieces can be accepted or refused ("Paperwork incomplete") before the invoice has been opened.
- **Evidence:** `i05-invoice-flagged.png`, `i06-invoice-result.png`
- **Suggested fix:** list wrong flags in the result ("• Reason for export was fine: …"); "Click"; let the invoice reopen read-only; in m7-intl lock the pieces until the paperwork is submitted (or point the toast at "Check the paperwork" first).
- **Status:** fixed — the invoice result lists the lines flagged but fine as well as the missed ones; the instruction
  says "Click"; the invoice opens again read-only (with your findings marked) after submitting; in m7-intl the pieces
  wait until the paperwork is checked ("Check the paperwork first: the invoice decides what happens to these pieces").
  "Reason for export: Sale" against "Description: Samples" is now one of the problems, with its why (the two have to
  agree).

### PRP-16: m7-intl: accepting one of the two pieces on a failed invoice still ends "GREAT WORK!", +5 stars
- **Severity:** design
- **Where:** m7-intl results
- **Repro:** as PRP-15, then Accept piece 1 and refuse piece 2 as "Paperwork incomplete"; finish.
- **Expected:** you just sent a customs shipment you had found faulty to the border and split a two-piece shipment; that is the failure the scenario exists to prevent. **Actual:** the wrong accept costs 2 service points of 14; the results read "GREAT WORK!", score 1200, "+5 new career stars". Same root as PRP-8: one critical wrong call is diluted by many small checks.
- **Suggested fix:** treat accepting a piece whose invoice you rejected (or any undeclared DG accept in m7-dg) as a cap on the Service/Safety stars, and let the scene override the headline.
- **Status:** fixed — accepting a piece whose right answer is a refusal for paperwork (DOC) or undeclared dangerous
  goods (DG) is a critical mistake (`PickupScene.decide`): its category is capped at 1★ and the results say "CRITICAL
  MISTAKE".

### PRP-17: m7-dg: "that grey one is just a litre of solvent" points at the properly declared box, not the solvent
- **Severity:** major (the dialogue steers the trainee to refuse the legal DG box and accept the undeclared one)
- **Where:** m7-dg, shipper line d1, then the counter
- **Repro:** m7-dg; Gail says "Oh, and that grey one is just a litre of solvent for our sister lab." Look at the four boxes on the counter.
- **Expected:** the solvent box (g2, 19 Foundry Rd) is the grey one. **Actual:** g2 is ordinary brown cardboard like g1 and g4; the only pale grey box is **g3 (4 Science Park), the correctly marked and declared Class 3 shipment**, which the trainee should accept. A trainee who acts on what they were told refuses the good DG box and may accept the solvent, which is exactly backwards for this scenario.
- **Evidence:** `test/out/review/pretrip-route-pickups/g04-pieces.png` (g2 brown "19 Foundry Rd", g3 pale with the flame diamond); `src/scenes/m7/PickupScene.js:93` (`color: p.declared ? 0xD8C9A8 : 0xC99A62`: only declared boxes get the pale colour).
- **Suggested fix:** give pieces an optional `color` in `data/m7_pickups.js` and make g2 grey (and g3 a different shade), or change the line to name the box ("the one for Foundry Road").
- **Status:** fixed — pieces can have their own color: the solvent (19 Foundry Rd) is the gray box and the declared
  Class 3 box is pale cream; Gail's line names it too ("the gray one for Foundry Road"). "litre" is "liter".

### PRP-18: m7-dg / m7-business talk: an illegal answer is only "NOT QUITE", and the shipper's next line assumes you said the right thing
- **Severity:** minor (content)
- **Where:** m7-dg node d1 → d2; m7-business node p1 → p2
- **Repro:** m7-dg, answer "A litre is nothing. I'll put it at the back." The feedback card header is **"✗ NOT QUITE"** over "Undeclared flammable liquid in a hot truck is exactly how vehicle fires start, and it's illegal." Gail then says, annoyed, "All right, all right. Take a look at the rest." as if you had refused. Same in m7-business: after "Sure, no problem." (take them unchecked) Priya replies "Fair enough. Shout if anything's wrong." and the counting starts anyway.
- **Expected:** a grade label that matches the stakes ("✗ UNSAFE" / "WRONG" for a safety-critical bad answer), and a follow-up line that fits each answer. **Actual:** one shared `next` node for good and bad answers, and the mildest wrong label for an illegal act.
- **Suspected cause:** `data/m7_pickups.js` talk nodes (all choices `next: 'p2'` / `'d2'`); grade label from the shared talk engine.
- **Suggested fix:** give the bad choices their own next node (Gail: "Great, thanks!" then the courier is stopped by a supervisor line, or a line that sets up the refusal anyway), and add a stronger label for `grade: 'bad'` with negative safety effects.
- **Status:** fixed — each wrong answer gets its own follow-up: taking the business pieces unchecked gets "Great,
  thanks!" and a line that the handheld will not close a pickup without a count; agreeing to carry the solvent gets
  "Saves me the paperwork" and a line that it still has to be refused at the counter (and the answer is critical). A
  wrong answer that costs safety or is critical is headed "✗ UNSAFE", not "NOT QUITE", in every conversation.

### PRP-19: Pickup feedback toasts stack on top of each other and over the inspect box; a wrong refusal reads like praise
- **Severity:** minor
- **Where:** m7-dg / m7-business, after a wrong Accept or Refuse
- **Repro:** m7-dg: count, sign for 4; Accept the Foundry Rd solvent box (wrong) and straight away open the Science Park box and Refuse it (wrong). Then open the next box.
- **Expected:** one readable message at a time, clear of the modal. **Actual:** the second toast ("✗ Properly marked and declared dangerous goods, packed for transport.") is drawn on top of the first, still-visible two-line toast ("✗ The shipper described flammable solvent… cannot be accepted."), so both are half legible; both sit over the "INSPECT THIS PIECE" heading of the next box (toasts depth 6000, modal 5000). The wrong-refusal toast is just the piece's `why` behind a ✗, so "✗ Good condition and a complete label." / "✗ Properly marked and declared…" reads like praise; it never says "you refused a piece that was fine".
- **Evidence:** `g07-lithium.png` (stacked toasts), `b10-inspect.png` (toast over the modal), `PickupScene.js:355`.
- **Suggested fix:** queue toasts (or replace the current one) and place them below the HUD but above the modal's top edge, e.g. y ≥ 660 or inside the panel; prefix wrong refusals with "That piece was fine: …" and wrong accepts with "Should have been refused: …".
- **Status:** fixed — toasts are one at a time everywhere (a new one replaces the one on screen), and the pickup's
  appear at the bottom of the screen, below the modals; a wrong call says which way it was wrong ("That piece was
  fine: …" / "Should have been refused: …").

### PRP-20: Route Planner: the school zone's hours are never shown, nor which legs it slowed
- **Severity:** minor
- **Where:** m1-route, map and intro, all rounds
- **Repro:** read the intro ("the school zone costs you time while it is active"), look at the map band labelled "SCHOOL ZONE", hover it (nothing), sequence a plan that crosses it at 8:10 and dispatch.
- **Expected:** the trainee is told when the zone is active (the data says 8:00–8:45, `data/m1_routes.js` `schoolWindow`) and sees on the plan which leg paid the 4-minute delay. **Actual:** the hours appear nowhere; a slowed leg is drawn like any other; the result card has no school row; the only mention is the "Drove the school zone while it was active" log line, and only when the best plan avoided it. The lesson "work around it and come back later" cannot be applied without knowing when "later" is.
- **Suspected cause:** `RoutePlannerScene.js:99-110` draws only the label; `leg().slowed` (`:372`) is never shown.
- **Suggested fix:** label the band "SCHOOL ZONE 8:00–8:45", tint slowed legs amber with a "+4 min" tag, and add a row to the result card when it cost time.
- **Status:** fixed — the band reads "SCHOOL ZONE 8:00–8:45" (from the data), legs slowed by it are drawn amber with a
  "+4 min" tag on the map, and the result card has a "School zone +N min (N legs while it was active)" row.

### PRP-21: Route Planner: Clear wipes the whole plan with no confirm, and Undo cannot bring it back
- **Severity:** minor
- **Where:** m1-route, plan panel buttons
- **Repro:** sequence three stops, click Clear, click Undo (or press Backspace). `order` stays `[]`.
- **Expected:** Undo reverts the last action, including a Clear (or Clear asks first); Undo and Clear are greyed out when nothing is sequenced. **Actual:** Clear sits right next to Undo, is instant, and is not undoable; both buttons stay lit on an empty plan. On the 8-stop round 3 a slip costs the whole sequence.
- **Suspected cause:** `RoutePlannerScene.js:600` `undo()` only pops `order`.
- **Suggested fix:** push the previous order onto an undo stack on Clear; disable both buttons when `order` is empty.
- **Status:** fixed — Undo also undoes a Clear (the cleared plan comes back), both are grayed out when there is
  nothing to undo or clear, and the buffer is emptied at each new round.

### PRP-22: Pickups are half keyboard-driven: count choices and reasons have number keys, Accept / Refuse / OK have none
- **Severity:** minor
- **Where:** m7-business / m7-intl / m7-dg: INSPECT THIS PIECE, "You raised the count", invoice result, "Why are you refusing it?"
- **Repro:** in m7-business raise the count, press Enter on "You raised the count": nothing (the OK must be clicked). Open a piece: no key accepts or refuses it. Click Refuse…: the five reasons answer 1–5 but, unlike the count choices ("1.  Sign for…"), show no numbers, so nobody knows.
- **Expected:** one convention: Enter/Space for the single OK, A / R (or 1 / 2) for Accept / Refuse, and key hints on every keyed button, as the pre-trip shows for nothing either (PRP-1) and the route planner does for DISPATCH (Enter) and Undo (Backspace).
- **Suspected cause:** `PickupScene.js:271` and `:412` (OK buttons without `key`), `:320-322` (Accept/Refuse without `key`), `:328` (reason buttons keyed but unlabelled).
- **Suggested fix:** add `key: ['ENTER','SPACE']` to the OK buttons, keys to Accept/Refuse, and prefix the reasons with "1." … "5.". The reasons' own `desc` lines (unused) would fit under each label.
- **Status:** fixed — A accepts and R refuses (on the buttons), the refusal reasons are numbered 1-5 with their
  descriptions, and every OK in the pickups (recount, invoice result) answers ENTER / SPACE.

### PRP-23: Pre-trip: flagging all 21 items scores "GREAT WORK!" with confetti; the false-flag penalty is capped at 3
- **Severity:** major (the degenerate strategy wins)
- **Where:** m1-pretrip, scoring and results
- **Repro:** m1-pretrip: lights on, then open every item, do its test and press F; Sign off. Report: "TRUCK HELD BACK FOR PARTS THAT WERE FINE · 5 caught · 0 missed · 16 wrongly flagged". Finish.
- **Expected:** condemning 16 good parts (the truck never leaves the yard) is a fail; the intro warns "Flagging good parts costs you too". **Actual:** "GREAT WORK!", confetti, Safety 1 star, Efficiency 3 stars (40 s), score 500, "+4 new career stars". The safety check gives 5/5 for catching every defect and the penalty is `Math.min(3, falseFlags.length)`, so 16 false flags cost the same as 3. Flag-everything therefore beats an honest walkaround that misses one defect on stars per minute.
- **Evidence:** `p31-report-allflag.png`, `p32-results-allflag.png`
- **Suspected cause:** `PreTripScene.js:317-318` (penalty capped at 3) and `:320` (time stars regardless, PRP-6).
- **Suggested fix:** score precision as well as recall, e.g. safety = caught / (defects + falseFlags), or one point off per false flag without a cap; give no efficiency credit when the verdict banner is not "GOOD WALKAROUND"; never show the "GREAT WORK!" headline over a report that says the truck was held back or rolled out with defects.
- **Status:** fixed — every good part flagged costs a safety point with no cap (16 flags cost 16, not 3), the time
  check is gated by accuracy (PRP-6), rolling out with a missed defect is critical, and a report of a truck held back
  for good parts caps the headline at "GOOD EFFORT" (`headlineCap`). The all-flag run now scores 0★ safety, 0★
  efficiency, "KEEP PRACTICING".

### PRP-24: Pre-trip content: brake close-up says "holding" while the pedal sinks; signals checked with the headlight switch; air gauge on a step van
- **Severity:** minor (content, for a subject-matter check)
- **Where:** m1-pretrip close-ups and item list (`data/m1_pretrip.js`, `src/core/truckart.js`)
- **Details:**
  - **Service brake:** when the pedal is bad, the close-up drops it further and turns the travel marker red, but the caption still reads **"holding"** (`truckart.js:507-518`); the defect in the report is "The pedal sinks slowly under steady pressure". The red/green marker also gives the verdict away (cf. PRP-5). Caption should say "sinking…" (or nothing) and the marker should be neutral.
  - **Turn signal, curb side:** it is unlocked by the cab "LIGHTS" switch and its "ok" text is "Amber, bright, **flashing evenly**". Headlight switches do not flash turn signals; a real walkaround switches on the hazard flashers (or works the stalk). Add a hazards switch beside LIGHTS, or say "lights and hazards on" in the intro and toast.
  - **Air pressure gauge:** the cab item, its defect ("warning lamp lit") and consequence ("brakes may not release, or may not hold") describe air brakes. Most parcel step vans run hydraulic brakes; worth confirming with the customer which vehicle their couriers drive, and otherwise use a brake-warning / oil-pressure / temperature gauge. The close-up also shows no warning lamp, only the needle.
  - **Door latches:** no test (see PRP-5), although the lesson says to pull on them.
- **Status:** fixed — the brake close-up says "steady pressure" while it is pressed (never "holding") with a neutral
  marker; the cab switch is "LIGHTS + HAZARDS" (the flashers are what work the turn signals), and the intro, toast and
  lesson say so; the air gauge is now the oil pressure gauge a hydraulic-brake step van has, with its warning lamp lit
  when it reads low. (Which vehicle the owner's couriers drive is worth confirming; the item is one entry in
  `data/m1_pretrip.js`.)

### PRP-25: Route Planner dispatch warning says "deliveryies"
- **Severity:** polish
- **Where:** m1-route, "Dispatch anyway?" confirm, whenever two or more commitments would be late
- **Repro:** round 3, sequence the three Priority stops last (Ground, Ground, Standard, both pickups, then the Priorities), press Enter.
- **Actual:** "Your plan says 3 time-committed **deliveryies** would run late. …"
- **Evidence:** `r18-deliveryies.png`
- **Suspected cause:** `RoutePlannerScene.js:719`: `` `delivery${ev.late > 1 ? 'ies' : ''}` ``.
- **Suggested fix:** `` ev.late > 1 ? 'deliveries' : 'delivery' ``.
- **Status:** fixed — "3 time-committed deliveries would run late".

### PRP-26: Pickup counter: the pieces to count are a strip at the bottom edge, under a wall of identical parcels
- **Severity:** polish / design
- **Where:** m7-business / m7-intl / m7-dg, counting step
- **Repro:** after the talk, read "Click each piece waiting for pickup to count it", look at the scene.
- **Expected:** it is obvious which parcels are "waiting for you". **Actual:** the back wall is three shelves of brown and white parcels drawn just like the pickup pieces, the shipper's own stock; the real pieces stand in a row whose bottoms touch the screen edge (y 714 of 720), partly behind the counter front. Clicking a shelf parcel does nothing and says nothing, so a trainee who starts counting the shelves gets no hint. (Minor, since the manifest panel keeps its own count, but "count what is actually waiting for you" is the exercise.)
- **Evidence:** `b04-counter.png`, `i02-counter.png`
- **Suggested fix:** put the pieces on the counter top (or a marked "OUTGOING" cage) with a floor line, thin out or grey the shelf stock, and toast "That is the shop's stock — count what is on the counter" on a shelf click.
- **Status:** fixed — the pieces wait in a taped "OUTGOING — COUNT THESE" area on the floor, raised clear of the
  bottom edge, and a click on the shop's shelves says "That is the shop's own stock. Count what is waiting in the
  OUTGOING area."

### PRP-27: m7-dg: refusing everything scores "GREAT WORK!", and the takeaways become descriptions of good boxes
- **Severity:** minor (scoring / feedback)
- **Where:** m7-dg results (the takeaway text issue applies to every pickup)
- **Repro:** m7-dg, good answer in the talk, count and sign for 4, then Refuse all four as "Undeclared dangerous goods"; Finish (receipt: "PICKUP EXCEPTION · 4 refused — the shipper keeps them until they are fixed"), Done.
- **Expected:** turning away a plain box of lab consumables and a correctly marked, declared Class 3 shipment is a service failure, and the takeaways say so ("A declared, marked DG shipment with its paperwork should be accepted"). **Actual:** "GREAT WORK!", score 1300, "+4 new career stars" (Safety is full, since the refusals of the two undeclared pieces are the only safety checks). Takeaways 1 and 2 are "Plain lab consumables, properly labelled." and "Properly marked and declared dangerous goods, packed for transport.", which are the pieces' `why` lines, not lessons; out of context they read like praise. The receipt also says the shipper keeps the refused boxes "until they are fixed", though two of them had nothing wrong.
- **Evidence:** `g10-results-refuseall.png`, `g09-exception.png`
- **Suspected cause:** `PickupScene.js:348` logs `lesson: right ? null : p.why` for every piece, including `accept: true` pieces whose `why` explains why they were fine.
- **Suggested fix:** give accept-pieces a separate `lesson` ("Properly declared and marked dangerous goods are accepted; refusing them fails the customer.") or prefix automatically ("This one was fine: …"); weigh wrong refusals of declared DG into Safety or cap the headline as in PRP-16.
- **Status:** fixed — refusing a correctly declared dangerous-goods shipment is critical (Service capped at 1★,
  "CRITICAL MISTAKE"). A wrongly refused good piece now teaches "This one was fine to ship (…). Refusing a good piece
  fails the customer." instead of the piece's description, and the exception receipt no longer says the refused boxes
  are kept "until they are fixed".

## Revisit

- Every scene boot logs one to five `Failed to load resource: 404` errors in `/log` (not traced; probably shared, not this area).
- Pre-trip: turning the cab lights **off** again after the lamps have been passed leaves the verdicts standing; not checked whether the exterior art then shows them dark.
- Pre-trip: a judged item can be reopened and re-judged (rings stay clickable). Seems intended; not checked that the checklist and report always follow the last verdict.
- Pre-trip: the timer keeps running under the sign-off report (display only, efficiency is already logged).
- Route Planner: clicking pins during the round-start pop-in and the round banner not tried.
- Route Planner: products: Ground stops mixed with First/Priority/Standard Overnight on one courier's loop, and "Standard Overnight by 3:00pm". Worth a subject-matter check against the customer's own service commitments.
- Route Planner: closure detours were not checked against the map by eye (round 2 `['h',1,2]`, round 3 two closures).
- Pickups: the intro card is drawn over the manifest panel, which already shows "Confirm the count" before the talk has happened (cosmetic).
- Pickups: the commercial invoice has no currency, total value, weight or HS code lines; fine for a first lesson, thin for a customs one.
- Horn close-up relies on sound for a working horn plus a small wave graphic; audio was not audible in the headless browser, so the sound side is unverified.
- All play was turn-based; nothing was judged in real time (feel, animation speed of the route van at 1x).

## Summary

Played m1-pretrip (well, badly, flag-everything, restart from pause in the cab), m1-route (all three rounds badly and optimally, undo/clear/pull-out, FAST, restart during FAST, dispatch warnings), m7-business (miscount, wrong accepts and refusals, restart during the signature), m7-intl (invoice with a miss and a false flag, split decision) and m7-dg (bad talk answer, wrong calls both ways, refuse-everything exception path). No blockers or soft-locks found: restarts, ESC on close-ups and modals, and the gating of verdicts behind tests all work. The problems are in what the scenes teach and reward.

The ten that matter most:

1. **PRP-17** (major): m7-dg: "that grey one is the solvent", but the only grey box is the properly declared Class 3 shipment. The dialogue points the trainee at the wrong box.
2. **PRP-23** (major): pre-trip: flagging all 21 items earns "GREAT WORK!" and confetti; the false-flag penalty is capped at 3.
3. **PRP-11** (major): pickups: an under-count is scored as a perfect reconciliation, and the shipper answers "I'll correct it to six" to a courier who said four.
4. **PRP-6** (major): pre-trip efficiency gives 3 stars for passing everything in 35 s with 3 of 4 defects missed (same in pickups, PRP-14).
5. **PRP-12** (design): pickup inspection states every verdict in words (and the counter art prints NO LABEL / a red 164 LB), so inspecting is just reading.
6. **PRP-5** (design): pre-trip mirror and door-latch close-ups caption the defect; the door has no pull test although the lesson says to pull it.
7. **PRP-8 / PRP-16 / PRP-27** (design): one critical wrong call (late First Overnights, a customs piece shipped on a bad invoice, refusing declared DG) is diluted into "GREAT WORK!" by many small checks.
8. **PRP-4** (minor): pre-trip side views are mirror images of where the arrows take you, and the front view's "driver side" headlight is on the curb side.
9. **PRP-13** (minor): takeaways are the first two mistakes in time order, so the talk and the count crowd out the inspection mistakes (the three-takeaway limit from warehouse.md applies here too).
10. **PRP-3 / PRP-2** (minor): cab test buttons half hidden under Pass/Flag; close-up instructions in pale orange on white.

Also worth fixing: PRP-15 (invoice false flags never shown; "Sale" vs "Samples"), PRP-19 (stacked toasts), PRP-20 (school zone hours never shown), PRP-25 ("deliveryies"), PRP-7 / PRP-24 (tire and brake content).

Not covered: these scenes inside a route day from the hub (covered by routeday.md), real-time feel, audio, closure detour correctness by eye, and a full golden run of m7-intl/m7-dg (the QA suite covers those).
