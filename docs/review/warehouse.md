# Human-style review: warehouse (package-handling minigames)

Tester area: **warehouse** — m2-sort (Sort Belt), m2-lift (Lift Right), m2-labels (Label Check), m6-load (Load for
the Route), m6-find (Find It Fast). Played with `test/tools/playd.js` on port 9305; screenshots in
`test/out/review/warehouse/`. Viewport 1280×720, headless Edge.

## Findings

### WAREHOUSE-1: Sort Belt number keys send the front package, not the one you just scanned
- **Severity:** major
- **Where:** m2-sort, any wave, two or more packages on the belt
- **Repro:** start m2-sort; when two packages are on the belt, click the *rear* one to scan it (it shows e.g.
  `R3`), then press its bin key (`3`).
- **Expected:** the package you scanned goes to bin 3 (the intro says "press 1-5 to send the scanned package at the
  front", and clicking a package is the taught way to scan it, so a trainee reads "the package I scanned").
  **Actual:** the *front* package — unscanned, a different route — is thrown into bin 3: `-50`, `✗ ROUTE 2`, streak
  reset, and it is also logged as a blind sort. The package you scanned stays on the belt. Reproduced twice
  (stats after the second try: correct 2, wrong 2, blind 2). Nothing on screen explains why the "right" key was
  wrong; the float text names the front package's route, which the trainee never saw.
- **Evidence:** `test/out/review/warehouse/sort-06-scan-rear.png`, `sort-07-rear-then-key.png`
- **Suspected cause:** `src/scenes/m2/SortingScene.js:215-222` — the 1-5 handlers always use `frontPackage()`;
  scanning by click (`scanPackage`) does not make that package the keyboard's target.
- **Suggested fix:** make the keys act on the most recently scanned package that is still on the belt (fall back to
  the front one), and move the gold "front" glow to that package so the target is visible. At minimum reword the
  intro to "the keys always send the package at the FRONT of the belt (the glowing one)".

### WAREHOUSE-2: Packages left on the belt at a wave change are judged by the next wave's bins (a DG piece "belongs" in Route 3)
- **Severity:** major
- **Where:** m2-sort, every wave change, most visibly wave 4 → 5 (DG cage removed) and wave 3 → 4 (Priority bin removed)
- **Repro:** play wave 4 and stop sorting for its last ~5 s so hazard-diamond packages are still on the belt when the
  "New Rule · Heavy pieces" card appears. Dismiss it, scan a leftover DG package (tag `R3 · nn LB`), send it to
  EXCEPTIONS (the nearest thing to "segregated").
- **Expected:** a leftover piece keeps the rule it was spawned under (or the belt is cleared / the old bins stay until
  it is empty). **Actual:** the wave ends on the clock with 4-6 packages still on the belt; they ride into the next
  wave and `correctBin()` re-judges them against the new bins. With no DG cage on the floor a hazard-diamond package
  is "correct" in **Route 3**; sending it to Exceptions gives `-50`, `✗ ROUTE 3`, and a toast that says *"Hazard
  diamond! Dangerous goods ride in the DG cage."* (there is no DG cage on screen), and it is logged as a DG error,
  so the end-of-shift lesson tells the trainee off about DG. Same for a priority piece carried into wave 4 (no
  Priority bin: route bin is "right"). Seen on both wave changes I idled through (wave 1 → 2 carried 6 pieces,
  wave 4 → 5 carried 2 DG pieces).
- **Evidence:** `sort-15-wave5-card.png` (belt still loaded under the rule card), `sort-17-dg-to-exc.png` (the
  contradictory toast), eval after the change: `{"dg":true,"bin":"R3"}` ×2.
- **Suspected cause:** `SortingScene.js:608-610` starts the next wave on `waveTime` alone; `correctBin()` (417-423)
  only honours DG/HVY/PRI when that bin is in `activeBins`.
- **Suggested fix:** stop spawning a few seconds before the wave ends and start the next wave only once the belt is
  empty (the rule card then lands on a clean belt), or keep the previous wave's bins until the carried pieces are
  gone. Never teach "hazmat → route bin".

### WAREHOUSE-3: Dropping a dragged package on the belt past its end (or near the OVERFLOW sign) is an instant "missed"
- **Severity:** minor
- **Where:** m2-sort, any wave
- **Repro:** drag the front package and let go on the belt to the right of the last bin (e.g. screen x≈1215, y≈235,
  just under the OVERFLOW sign) — i.e. a drop that misses every bin.
- **Expected:** a drop outside any bin puts the package back where it was picked up (the normal "missed the bin"
  behaviour). **Actual:** the package is put back on the belt at the drop x; past `BELT_END` it is immediately
  counted as ridden off the end: `-30`, streak reset, missed +1, even if it was scanned. Seen twice (earlier tester's
  `sort-09-drop-right-edge.png` and my `sort-10-drop-past-end.png`). The same code lets a trainee drag a package
  *backwards* up the belt to buy time, or drop it on top of another package so the two overlap (seen when a held
  package was released during the wave-2 rule card: `sort-13-held-through-wave-end.png`).
- **Suspected cause:** `SortingScene.js:209-211` tweens only `y` back to the belt; `x` stays where the pointer was.
- **Suggested fix:** remember the pickup x (or the x the belt would have carried it to) and tween back to that.

### WAREHOUSE-4: Sort Belt results say "FLAWLESS!" above three takeaways about mistakes, and the stats line vanishes
- **Severity:** minor
- **Where:** m2-sort results screen
- **Repro:** play the shift with a few faults: let ~9 packages ride off the end in wave 1, let one jam time out, make
  one DG mistake (e.g. WAREHOUSE-2), sort the rest correctly (final stats: correct 95, wrong 1, missed 9, jams 3
  cleared 2).
- **Expected:** the headline matches the play, and the trainee sees how they did (`Sorted x of y · scanned … · best
  streak … · specials …`). **Actual:** 3★ efficiency + 3★ safety → header **"FLAWLESS!"**, directly above
  *"Dangerous goods ride in the DG cage…"*, *"A package that rides off the end becomes a late delivery"* and
  *"Clear a jam the moment it happens"*. Nine missed packages and an unclear jam are not flawless. The summary line
  with the counts is pushed after the lessons and `lessons.slice(0, 3)` cuts it whenever there are 3+ lessons, so
  the trainee who made the most kinds of mistake is the one who never sees the numbers.
- **Evidence:** `sort-20-results.png`
- **Suspected cause:** `ResultsScene.js:36` (`got === max ? 'FLAWLESS!'`), star thresholds forgive ~10% misses;
  `SortingScene.js:552-553` (stats line is the 4th+ item, then `slice(0, 3)`).
- **Suggested fix:** only say "Flawless" when there were no faults at all (no wrong, missed, blind or timed-out
  jams); otherwise "Great work!". Put the stats line first (or in its own slot) so it always shows.
- **Status:** fixed — the results headline comes from `OTR.scoring.headline()` (WP1): "FLAWLESS!" only when the run
  made no mistakes at all (Sort Belt passes its fault count: wrong, missed, blind scans and jams left uncleared), and
  "GREAT WORK!" needs every category at 2★ or more. The stats line is a `summary` with its own row on the results
  card, so no lesson can push it off.

### WAREHOUSE-5: Lift Right praises "Clean lift — your back barely noticed" on a dropped box and on a reach-and-twist
- **Severity:** major (teaches the wrong thing at the exact moment of the mistake)
- **Where:** m2-lift, any lift done yourself, at the let-go
- **Repro:** (a) carry the box to the pallet standing upright and press SPACE without lowering it (box > 26 px above
  the pallet) → *"Dropped it!"*; (b) on lift 5 grip the box and press SPACE again straight away, away from the
  pallet → *"You reached and twisted!"*, `-12 Back`, the box falls on the floor.
- **Expected:** the verdict matches the fault. **Actual:** both times the green *"Clean lift — your back barely
  noticed."* is stamped in the same place, on top of the red fault text, so the two overlap and the green one wins.
  Seen on both faults (lift 1 drop, lift 5 twist).
- **Evidence:** `lift-08-placed.png` ("Clean lift —" overprinted with "Dropped it!"), `lift-20-twist.png`
- **Suspected cause:** `LiftingScene.js:506-513` — `finishPosture()` picks the praise from `this.strain` alone; the
  drop / twist quality passed in (0.35 / 0.2) is ignored for the message, and both texts use y≈250.
- **Suggested fix:** choose the verdict from the final quality `q` (and the mistake just made); never show "Clean
  lift" after `dropBox()` or the twist branch; offset or replace the fault text rather than stacking.

### WAREHOUSE-6: Lift Right's in-game score is thrown away at the end (752 on the HUD → 2406 on the results)
- **Severity:** minor
- **Where:** m2-lift, HUD SCORE vs results screen
- **Repro:** play all five lifts; watch the HUD score (it adds `100 + Back Health` per lift: 200, 384, 568, 752…),
  then read the results.
- **Expected:** the number on the results is the number you were building. **Actual:** `endScenario()` overwrites it
  with `health × 20 + technique × 2000` (here 2406). The two numbers have nothing to do with each other, so the HUD
  score during play is meaningless. The results also never show the final Back Health, which is the game's whole
  point (the "Back Health 52/100 · technique …%" line is cut, see WAREHOUSE-7).
- **Evidence:** eval before the results: `score:752`; `lift-21-results.png` shows 2406.
- **Suspected cause:** `LiftingScene.js:550` vs `:571`.
- **Suggested fix:** one formula; show the HUD score that the results will use, or drop the HUD score and show
  Back Health prominently on the results.
- **Status:** fixed — `LiftingScene.endScenario()` no longer replaces the score the HUD built lift by lift, and the
  results card shows stars earned out of stars possible instead of a bare score (SHELL-16). Back Health and technique
  are the run's `summary` line on the results card.

### WAREHOUSE-7: Results takeaways are cut at three, so later mistakes and the stats line silently disappear
- **Severity:** minor
- **Where:** m2-sort and m2-lift results (same pattern `lessons.slice(0, 3)`; check the others)
- **Repro:** Lift Right: make four different mistakes (drop on lift 1, "yank it" on lift 2, "climb the shelving" on
  lift 5 and then let go away from the pallet). Sort Belt: see WAREHOUSE-4.
- **Expected:** every mistake the trainee made is named, and the stats line (Sort: sorted/scanned/streak; Lift: Back
  Health and technique %) always shows. **Actual:** only the first three lessons appear. Lift: the twist (the most
  recent, most dangerous one) is not mentioned, and neither is the Back Health 52/100 line. The panel has room for a
  fourth line (`lift-21-results.png`: a third of the box is empty).
- **Evidence:** `lift-21-results.png` (mistakes were `drop, yank, climb, twist`), `sort-20-results.png`
- **Suspected cause:** `LiftingScene.js:568-574`, `SortingScene.js:552-553`.
- **Suggested fix:** give the stats line its own row on the results card; show up to four lessons, or order them by
  severity (a twist/heavy/DG mistake before "keep a steady rhythm").
- **Status:** fixed — no scene slices its lessons any more. The results card lists the takeaways ranked (critical
  first, then by points lost; Lift Right orders its own by danger: climb, heavy, twist, overhead, drop …), with
  repeats counted ("× 6"), at least four (smaller type if needed) and "+ N more to work on" for the rest; the stats
  line has its own row (`summary`).

### WAREHOUSE-8: Lift Right: the "carry it to the pallet and pivot" half of the lesson can be skipped entirely
- **Severity:** design
- **Where:** m2-lift, every solo lift (lift 1 and 2) and the team lift
- **Repro:** lift 1, "Lift it myself". Tap D once (≈30 px), hold S until "Grip it — SPACE", SPACE, hold W, hold S,
  SPACE. Never press A, never turn round.
- **Expected:** the prompt says the box "needs to go on the pallet **behind you**", the intro and lessons are about
  stepping round to face where the load goes ("reaching and twisting under a load is how discs go"), so the lift
  should need a carry and a turn. **Actual:** the courier starts standing *on* the pallet (x 560; pallet 420-660)
  and the box sits at its right-hand edge, so lifting it up and putting it straight back down lands it "on the
  pallet": full marks, no mistakes, *"Clean lift"*. The box moves about 40 px. The `turn` step listed in
  `data/m2_lifting.js` never happens. On the team lift the long box ended up half off the pallet, the left half
  hanging in the air at pallet height, and that also scored 1.0.
- **Evidence:** `lift-23-set-facing-away.png`, `lift-24-placed-facing-away.png` (qualities `[1,1]`, mistakes `[]`);
  `lift-16-team-placed.png` (box x 428, width 190, pallet from 420)
- **Suspected cause:** `LiftingScene.js:132` (start x 560, box at ~700), `PALLET_X 540`; the "over the pallet" test
  (`:454`, `:489`) uses the courier's x, not the box's footprint.
- **Suggested fix:** put the pallet genuinely behind the courier (e.g. x 300) so a carry and a turn are required,
  and test that the *box* lands inside the pallet's footprint.

### WAREHOUSE-9: Lift Right: distance from the load is never scored, so the "get close" lesson is unreachable
- **Severity:** major (a safety lesson the scene claims to teach but does not)
- **Where:** m2-lift, the pick-up
- **Repro:** lift 1, step in only until the hands are ~48 px from the box (the most the grip allows), bend the knees
  to "Grip it — SPACE", lift and place normally.
- **Expected:** the intro says the back hinges over "whatever your knees **and your distance** leave it"; the
  lesson list has `far: 'Get close to the load before lifting…'`. Reaching out should cost something.
  **Actual:** strain 0, mistakes `[]`, quality 1, "Clean lift". Distance only decides whether SPACE works (under
  52 px) and changes the gauge before you grip (when nothing drains). The `far` mistake can never be recorded:
  it is only checked while carrying, when `gap` is forced to 0.
- **Evidence:** eval after the lift: `{"strain":0,"m":[],"q":[1,1]}` with grip gap 48.
- **Suspected cause:** `LiftingScene.js:362-367` (gap = 0 while holding), `:372` (stoop needed ignores the gap),
  `:397` (the only place `far` is pushed).
- **Suggested fix:** record the gap at the grip (`this.gripGap`) and feed it into the carried lever arm and the
  mistakes (`far` when > ~20 px); tighten the grip range or make the courier's arms visibly over-reach.

### WAREHOUSE-10: Label Check: turning the package quickly leaves it squashed (half width or half height) until the next turn
- **Severity:** minor (it is the face you are meant to be reading)
- **Where:** m2-labels, any package
- **Repro:** press two face keys within ~100 ms of each other — `W` then `S`, or `D` `D` (a normal quick double tap;
  the golden path does the same at 80 ms). Wait a second.
- **Expected:** the box ends at full size showing the new face. **Actual:** it stays squashed: after `W S` scaleY
  0.45 (the base shown as a flat slab), after `D D` scaleX 0.47 (a tall narrow box). Any mark on that face is
  squashed with it. Reproduced three times (first seen as a "flat base" in the careful run).
- **Evidence:** `label-13-base-face.png`, `label-15-fast-WS.png`, `label-16-fast-DD.png`; eval `{"sx":0.47,"sy":1}`
- **Suspected cause:** `LabelScene.js:242-250` — a new turn tween starts while the previous yoyo tween is still
  running; `setScale(1)` is called but the old tween keeps writing the same property and they finish out of step.
- **Suggested fix:** `this._turnTween.stop()` (or `tweens.killTweensOf(this.boxImg)`) before `setScale(1)`, and set
  the texture immediately when interrupting.

### WAREHOUSE-11: Label Check: a timed-out package is logged as a "blind call" and flies onto the right station
- **Severity:** minor
- **Where:** m2-labels, the per-package clock reaching 0:00
- **Repro:** let a package sit untouched for 22 s.
- **Expected:** "Too slow" and a missed package. **Actual:** the box animates onto the *correct* station (it looks
  as if it was placed right), the card says **TOO SLOW** *and* "Blind call — you never looked at the right side,
  the back…", and it is counted in `stats.blind` and gets the blind-call safety penalty on top of the wrong
  answer. The results then report "3 blind calls" for a run in which the trainee made two.
- **Evidence:** `label-07-timeout.png` (box flying to Fragile), `label-08-timeout-card.png`; stats after:
  `blind 2, slow 1` with one real blind call.
- **Suspected cause:** `LabelScene.js:370-385` (blind computed for `stationId === null`), `:400` (target defaults
  to the answer's bay).
- **Suggested fix:** skip the blind penalty/line when `stationId` is null; send a timed-out box off the far end of
  the roller (or leave it) rather than onto the right station.

### WAREHOUSE-12: Label Check: a package dropped while the guide is open is left parked on top of a station
- **Severity:** minor
- **Where:** m2-labels, drag + `G`
- **Repro:** press on the package and drag it over the BELT station; keep the mouse held, press `G`, release, then
  press `G` again to close the guide. (Driven with synthetic mouse events, because playd runs commands one after
  another; my first attempt with `/drag` + `/press` only proved that ordering, and its screenshot
  `label-09-drop-with-guide-open.png` is not evidence of this bug.)
- **Expected:** opening the guide cancels the drag and puts the package back on the roller. **Actual:** `answer()`
  correctly refuses the drop while the guide is open, but `dragend` then does nothing else: the package stays
  shrunk (scale 0.55) on top of the BELT card, hiding its label, with the roller empty and the clock running again
  once the guide closes. It looks as if it has been placed; it has not (`total 0`, `answering true`).
- **Evidence:** `label-18-drop-under-guide-closed.png`; eval after release `{"answering":true,"guideOpen":true,
  "total":0,"bx":948,"by":174,"sc":0.55}`
- **Suspected cause:** `LabelScene.js:168-176` — the "return to the roller" tween only runs when no bay is under the
  box; `answer()` (`:353`) returns early on `guideOpen`.
- **Suggested fix:** in `dragend`, if `answer()` did not resolve, tween the box back to `BOX`; or cancel the drag in
  `toggleGuide()`.

### WAREHOUSE-13: Label Check content: "This Way Up" arrows printed on the TOP face
- **Severity:** polish (content)
- **Where:** m2-labels, tier-1 item `{ front: ['thisWayUp'], top: ['thisWayUp'] }`
- **Repro:** get that package, press `W`.
- **Expected:** orientation arrows sit on the vertical sides — the game's own guide says "usually on two opposite
  sides". **Actual:** a pair of up-arrows is printed flat on the top of the box, pointing at the back wall; the
  verdict lists "This Way Up — on the top". It also shows that the TOP and BASE views are drawn exactly like a
  side (the box standing on the rollers), so only the caption says which face you are looking at.
- **Evidence:** `label-17-top-arrows.png`, `label-05-blind-call.png`
- **Suggested fix:** move the second arrow mark to the back (or a side); draw the top/base views from above/below
  (no rollers, a flap seam) so they read as a different face.

### WAREHOUSE-14: Load for the Route: nudging a shelved package (or dropping it on its own / a full slot) throws it back in the cart
- **Severity:** minor (annoying, and costs time on a timed, par-scored task)
- **Where:** m6-load, any placed package
- **Repro:** drag l1 onto A-top-0. Now press on it and let go 10 px away, still inside its own slot
  (`/drag?x1=108&y1=171&x2=118&y2=176`). Separately, drag a cart package onto a slot that is already full.
- **Expected:** a tiny drag or a drop back where it was leaves it where it was; a drop on an occupied slot either
  swaps or bounces back with a word of explanation. **Actual:** the drop test only accepts *empty* slots, and a
  package's own slot is not empty, so the nudged package is removed from the shelf and appended to the **end** of
  the cart; the whole cart then re-flows, so every other package's position (and stop badge) moves under the
  mouse. A drop on a full slot silently pops the package back to the cart with no message. The drop also tests the
  package *centre*, not the pointer, so a package grabbed by its edge can land in the neighbouring slot.
- **Evidence:** eval before/after the nudge: `placed:"l1@A-top-0"` → `placed:""`, cart `…,l12,l1`
- **Suspected cause:** `LoadingScene.js:206-217` (`!s.pkg` excludes the package's own slot; the else-branch
  un-shelves it).
- **Suggested fix:** treat `s.pkg === p` as a valid target (no-op); on an occupied slot bounce back to where the
  package came from (its old slot, or its old cart position) and float "That space is taken"; use the pointer
  position for the hit test.

### WAREHOUSE-15: Load for the Route: the rule-break message for column A is cut off the left edge of the screen
- **Severity:** minor
- **Where:** m6-load, any wrong drop into section A (x ≈ 44-318)
- **Repro:** drag the 52 lb Northwind package (l5) onto A-top-0.
- **Expected:** the whole message is readable. **Actual:** the two-line float text is centred on the slot and is
  ~410 px wide, so it starts at x = -96: *"…heavy that high — bottom shelf or floor"*; the start of each line
  (the weight, "Stop 5 belongs…") is off screen. Seen for l3 (41 lb) and l5 (52 lb).
- **Evidence:** `load-03-heavy-top.png`, `load-04-float-clipped.png`; `/texts`: `-96,109 409x51 … 52 lb is too
  heavy that high — bottom shelf or floor / Stop 5 belongs in section B`
- **Suspected cause:** `LoadingScene.js:240` (`floatText` at the slot centre, not clamped).
- **Suggested fix:** clamp the float text's x to `[w/2 + 10, 912 - w/2]` like the hover card, or show the problems
  in the side panel.

### WAREHOUSE-16: Load for the Route: "Strap the floor load" works before anything is loaded and is still credited
- **Severity:** minor (teaches a box-ticking habit)
- **Where:** m6-load, side panel button
- **Repro:** press "Strap the floor load" as soon as the intro closes; then load everything (or leave the floor
  empty) and roll out.
- **Expected:** straps go on after the floor load is in (the intro says "Then strap the floor load before you
  roll"); strapping an empty floor should not count, or loading the floor after strapping should undo it.
  **Actual:** the button is enabled from the start, draws the straps across an empty floor, then stays "Load
  strapped ✓" whatever is added afterwards; the results give full strap marks ("Strapped the floor load before
  driving"). In my run the straps crossed an empty floor, and with a 52 lb box on the top shelf the headline
  was still "GREAT WORK!".
- **Evidence:** `load-03-heavy-top.png` (straps across empty floor bays), `load-06-results.png`
- **Suspected cause:** `LoadingScene.js:105` (button always enabled), `:286-298`, `:310`.
- **Suggested fix:** enable the strap button only when the cart is empty (or the floor bays are filled); un-strap if
  a floor bay changes afterwards.

### WAREHOUSE-17: Find It Fast: the orange stop badge on every package answers rounds 2 and 3 without reading an address
- **Severity:** design (defeats the scenario's stated lesson)
- **Where:** m6-find, rounds 2 (stop 2, 58 Oak St) and 3 (stop 3, 900 Market St)
- **Repro:** read "FIND THIS ADDRESS · STOP 2" on the panel, click the only package with a **2** badge.
- **Expected:** the intro says "Read the whole address. Near-matches (216 vs 214, Birch Ln vs Birch Ct) are how
  misdeliveries happen", so each round should need the address. **Actual:** every package wears a big orange
  stop-number badge, and the panel names the stop. Round 2 has one "2" in the truck, round 3 one "3", so both are
  solved by matching a digit; the "900 vs 9000 Market St" near-match is moot because 9000 is badged 9. Only the
  rounds where two packages share a stop (1, 4, 5) test reading at all.
- **Evidence:** `find-01-round1.png` (badges), round 2 solved by clicking the "2" at (398, 439) without hovering.
- **Suggested fix:** drop the stop from the round prompt (give the address only, as a real stop list does), or
  hide the badges in find mode, or give every near-match decoy the *same* stop number as its target.

### WAREHOUSE-18: Shelf and cart labels are too small to read, so every package has to be hovered
- **Severity:** minor (design)
- **Where:** m6-load cart, m6-find shelves
- **Repro:** look at the shelf packages at 1280×720 without hovering (`find-02-label-crop.png` is a 1:1 crop).
- **Expected:** a trainee can tell "214 Birch Ln" from "214 Birch Ct" and "#3B" from "#3D" at a glance, or the game
  says plainly "hover to read the label". **Actual:** the on-box labels are ~6 px glyphs; "Ct"/"Ln" and "3B"/"3D"
  are indistinguishable, and on small boxes the street runs to the label's edge. The only way to read is the hover
  card, which works well, but the intro never mentions hovering (the 25 s "Stuck?" hint is the first mention) and
  the Load intro does not mention it at all. On a laptop screen scaled below 1280×720 it will be worse.
- **Evidence:** `find-02-label-crop.png`, `find-03-label-zoom.png`, `find-04-label-zoom2.png` (3× zoom);
  `load-01-start.png` (cart)
- **Suggested fix:** add "Hover a package to read its full label" to both intros; draw the street and unit larger
  (drop the weight chip on small boxes, abbreviate nothing).

### WAREHOUSE-19: Find It Fast: the "stuck" hints call a correctly loaded package a misload and point to the wrong place
- **Severity:** minor
- **Where:** m6-find, round 3 (900 Market St, which sits in a floor bay) and round 4 (5 Harbor View #3B, correctly in
  section B)
- **Repro:** on round 3 wait 25 s, then 45 s.
- **Expected:** hints that match where the package is. **Actual:** at 25 s *"Stuck? Stop 3 should be in section A —
  unless it was misloaded"* (it is in the floor bay, correctly: bulky freight goes on the floor), at 45 s *"There
  it is. A misloaded package costs this much time at every stop."* although it was not misloaded. The 45 s line is
  fixed text for every round. Related content gap: the Find key lesson says "When you find a misload, move it to
  the right section straight away", but packages cannot be moved in find mode.
- **Evidence:** `find-06-45s-hint.png`; `/texts` at 26 s and 46 s (quoted above)
- **Suspected cause:** `LoadingScene.js:409-423` (no check of `p.slotRef` against the stop's section); keyLessons
  in `data/m6_loading.js:62-66`.
- **Suggested fix:** compute "misloaded" as `pickPackage()` does and word the hints from it; say "floor bay" when
  the package is on the floor; reword the key lesson to "…report it / move it at the end of the round", or let a
  found misload be dragged.

### WAREHOUSE-20: Sort Belt: the bins change key numbers between waves (Exceptions is 5, then 4)
- **Severity:** design
- **Where:** m2-sort, wave 3 → wave 4
- **Repro:** play wave 3 using the keys (EXCEPTIONS is bin **5**, PRIORITY 4), then go into wave 4.
- **Expected:** a bin keeps its key once learned; new bins take new keys. **Actual:** wave 3 is
  R1 R2 R3 PRI EXC (Exceptions = 5); wave 4 is R1 R2 R3 EXC DG (Exceptions = **4**, 5 is now the DG cage); wave 5 is
  R1 R2 R3 EXC HVY (5 is now Heavy). A trainee who has just sent a dozen damaged boxes with 5 sends the next one into
  the DG cage (or the heavy chute), under a faster belt, straight after a rule card that talks about something else.
  The rule card does not mention that the keys moved.
- **Evidence:** `sort-22-jam.png` (wave 3, EXCEPTIONS keycap 5), `sort-17-dg-to-exc.png` (wave 5, EXCEPTIONS
  keycap 4)
- **Suspected cause:** `data/m2_sorting.js` `waves[].bins` order; `SortingScene.layoutBins()`.
- **Suggested fix:** give every bin a fixed key for the whole shift (R1-R3 = 1-3, EXC = 4, then PRI/DG/HVY = 5), or
  keep Exceptions last in every wave; say "keys have changed" on the rule card if they must move.

### WAREHOUSE-21: Lift Right: every lift opens with the courier bent double and the gauge at DANGER before any key is pressed
- **Severity:** design (minor)
- **Where:** m2-lift, the start of every self-lift (approach phase)
- **Repro:** choose "Lift it myself" and dismiss the coaching card; do nothing.
- **Expected:** the courier stands upright beside the box and the gauge reads SAFE until they do something. **Actual:**
  the courier is folded at the waist reaching for a box 80 px away (`stoop: 1`), the SPINE LOAD gauge is full red
  **DANGER**, and the prompt is "Step in closer — A / D". Nothing is being lifted and no Back Health drains (drain
  only counts once the box is gripped), so the first thing the gauge teaches is that it can be ignored. For the
  40 lb case I got the green "Grip it — SPACE" at a 51 px gap with stoop 0.15; by the gauge formula (`:383-384`)
  that pose reads 1.26, i.e. DANGER, at the same moment (not screenshotted).
- **Evidence:** `lift-04-approach.png`, `lift-12-team-approach.png`
- **Suspected cause:** `LiftingScene.js:370-384` — the solver bends the back to reach the grip point whenever the
  load is out of reach; the gauge shows `load` in the approach phase.
- **Suggested fix:** in the approach phase only bend towards the box once it is within reach, show the gauge greyed
  ("not lifting") until the grip, and make the green grip prompt depend on the gauge being under the line.

### WAREHOUSE-22: The five warehouse games disagree about mouse and keyboard
- **Severity:** design
- **Where:** all five
- **Detail:** Sort Belt and Label Check support both (click/drag and number keys). Lift Right's lift is keyboard
  only (no mouse way to step, bend or grip; the size-up choices take clicks or 1-3). Load for the Route and Find It
  Fast are mouse only: no key does anything (no keyboard selection of a package or slot, no key for "Strap" or
  "Close up & roll out"). A trainee who has just been told "press 1-6" in Label Check gets no response from keys
  in Load. Not wrong in itself, but nothing on screen says which input a game expects.
- **Suggested fix:** state the controls on each intro card consistently ("Mouse: … · Keys: …"), and add at least
  Enter for the Load panel's buttons.

### WAREHOUSE-23: Pausing mid-drag glues the package to the cursor after Resume
- **Severity:** minor (recoverable, but baffling, and the belt keeps running)
- **Where:** m2-sort and m6-load (both checked; Label Check uses the same Phaser drag and is very likely the same)
- **Repro:** (synthetic mouse events via `/eval`, since playd serialises commands) press on the front package and
  drag it over a bin, press `Esc`, let go of the mouse while the pause menu is up, click **Resume**.
- **Expected:** the drag ends when the button is released (package back on the belt, or sorted into the bin under
  it). **Actual:** after Resume the package is still `dragging`: it floats at 1.15× over the ROUTE 2 bin with the
  bin glowing, then follows the mouse around with **no button held**, while the belt carries on and new packages
  arrive behind it. It is not the "front" package any more, so the number keys skip it. Only the next click drops
  it (wherever the pointer happens to be, a bin included).
- **Evidence:** `sort-23-pause-mid-drag.png` (package hanging over the green bin after Resume),
  `sort-24-stuck-drag-after-move.png`; eval after Resume and a mouse move: `[301,380,true,1.15]`. m6-load, same
  steps with cart package l1: after Resume and a plain mouse move to (700, 600) the package is at (700, 600),
  `dragging: "l1"`.
- **Suspected cause:** the pointer-up arrives while the scene (and its InputPlugin) is paused, so Phaser never
  delivers `dragend`; nothing cancels drags on pause (`SortingScene.setupInput`, `PauseScene`).
- **Suggested fix:** on pause (or on `this.events.on('pause')`) end any drag in progress — for Sort, return the
  package to the belt; for Label/Load, return it to where it came from — and reset the pointer's drag state
  (`this.input.setDragState(pointer, 0)`).

## Revisit

- **Sort Belt, end of shift:** `endShift()` fades out whatever is still on the belt ("BELT CLEAR!") without counting
  it as missed (`SortingScene.js:524-529`), so the last ~5 s of packages are free to ignore. Code-read only; not
  played through deliberately.
- **Sort Belt jams:** only saw one jam time out (−40, toast); did not get a clean look at pressing a bin key during
  a jam (it sorts the jammed package and counts the jam as cleared — `sortPackage()` → `clearJam(true)`), or at
  dragging other packages while the belt is stopped.
- **Lift Right polish:** the size-up card covers the courier's head and shoulders (`lift-02-sizeup.png`); when
  squatting over the pallet the box sinks ~18 px into it (`lift-10-squat-over-pallet.png`); the hand truck plays
  with the courier standing beside it, not holding it (`lift-17-handtruck.png`).
- **Lift Right input:** on lift 1 a held `S` (lower with the knees) registered almost nothing and the box was
  "dropped"; the next held `D` moved 29 px instead of 80. Probably playd's turn-based key timing, not the game —
  not recorded as a finding. Worth a real-time retest.
- **Label Check:** after closing the guide, the first `Space` did not dismiss the verdict card; the second did.
  Seen once. Also, hovering the station cards during a verdict clears the highlight on the correct station
  (`pointerout → paint(false)`, `LabelScene.js:83`); the face dots say `U` for the base while the keys say "S base".
- **Load for the Route content:** the middle shelf is signed "UP TO 35 LB" but 35 lb is already "too heavy that
  high"; the "floor bays are for heavy or bulky freight" rule is enforced but never stated in the intro (the bay is
  only labelled FLOOR / BULK).
- **Console:** every scenario boot logs `Failed to load resource: 404` (one or two). Did not identify the file.
- **Stats lines:** Label Check puts its "6/9 placed right · 3 blind calls…" line on the results (good); Load and
  Find show no counts at all (no "11/12 placed right", no "2 wrong picks, 65 s"). Fold into WAREHOUSE-7.

## Summary

Ten findings that matter most, in order:

1. **WAREHOUSE-2** (major) — Sort Belt carries packages across wave changes and re-judges them against the new
   bins, so a hazard-diamond package is "correct" in Route 3 and the trainee is scolded for segregating it.
2. **WAREHOUSE-5** (major) — Lift Right stamps "Clean lift — your back barely noticed" over "Dropped it!" and
   "You reached and twisted!".
3. **WAREHOUSE-9** (major) — Lift Right never scores how far you reach for the load; the `far` lesson can never
   fire, although the intro says distance matters.
4. **WAREHOUSE-1** (major, earlier tester) — Sort Belt number keys send the front package, not the scanned one.
5. **WAREHOUSE-8** (design) — Lift Right's pallet starts under the courier's feet, so lifting and setting the box
   straight back down scores full marks; the carry and the pivot are never needed.
6. **WAREHOUSE-17** (design) — Find It Fast's stop badges answer rounds 2 and 3 without reading an address,
   defeating the near-match lesson.
7. **WAREHOUSE-23** (minor) — pausing mid-drag glues the package to the cursor after Resume (Sort, Load).
8. **WAREHOUSE-20** (design) — Sort Belt moves Exceptions from key 5 to key 4 (and 5 becomes DG, then Heavy)
   between waves.
9. **WAREHOUSE-4 / WAREHOUSE-7** (minor) — results say "FLAWLESS!" above a list of mistakes; lessons are cut at
   three, dropping later mistakes and the stats line (Sort, Lift).
10. **WAREHOUSE-10 / 14 / 16** (minor) — Label Check's box stays squashed after a quick double turn; Load throws a
    nudged package back into the cart; the floor load can be "strapped" before anything is loaded and still earns
    full marks.

Also recorded: WAREHOUSE-3 (drop past the belt end = miss), 6 (Lift score replaced at the end), 11 (Label timeout
counted as blind and flown to the right station), 12 (package parked on a station when dropped under the guide),
13 ("This Way Up" on the top face), 15 (Load message off-screen left), 18 (shelf/cart labels ~6 px, hover never
mentioned), 19 (Find hints call a correct load a misload), 21 (Lift gauge at DANGER before any input), 22 (mouse vs
keyboard differs per game).

Not covered: a real-time (non turn-based) feel pass on the Lift controls and the Sort belt speed in waves 4-5; jams
in depth; Label Check's click-a-station-to-place path (works, undocumented) under stress; the route-day versions of
these games (only the standalone scenarios were played; the route-day load issues are ROUTEDAY-5).
