# Review: dialogue (conversation scenarios)

Tester area: the seven conversation scenarios that run in `src/scenes/shared/DialogueScene.js` on the talk engine
`src/core/talk.js`: m3-missing, m3-signature, m3-twostops, m4-address, m4-damaged, m4-storm, m8-incident.
Content: `data/m3_dialogues.js`, `data/m4_dialogues.js`, `data/m8_incident.js`; scenario cards in `data/modules.js`.
Play tool on port 9303; screenshots in `test/out/review/dialogue/`.

## Findings


### DIALOGUE-1: A category the conversation never tested scores three stars (walk away from Dana after two answers: Efficiency ★★★)
- **Severity:** major
- **Where:** m3-missing results (applies to every conversation scenario whose short, bad branches skip a category)
- **Repro:** boot m3-missing; answer "Ma'am, I need you to calm down." then "If you're going to yell at me, I'm leaving." (the worst answers). Outcome "Walked Away / INCIDENT"; See Results.
- **Expected:** Efficiency shows no stars, a dash or "not assessed"; at the least not full marks on the worst possible run.   **Actual:** score 0, Service ☆☆☆, **Efficiency ★★★**, "+3 new career stars". Neither choice on that branch has an efficiency effect, so the category has no checks at all.
- **Evidence:** `test/out/review/dialogue/missing-bad-results.png`
- **Suspected cause:** `src/core/scorelog.js:51-54` `ratio()` returns 1 when a category has no checks (`t.max <= 0` and no penalty). Ending a conversation early leaves whole categories unchecked.
- **Suggested fix:** when a category has no checks, either score it from the outcome (bad ending = 0) or show it as not assessed and exclude it from career stars. Alternatively give each ending an explicit per-category score (the end nodes already carry `effects`, which are ignored, see DIALOGUE-4).
- **Status:** fixed — a category the run never tested (no check and no penalty in it) earns no stars and the results
  card says "not tested this run" (`ScoreLog.tested`, `OTR.flow.complete`); only tested categories count toward the
  headline and the star total.

### DIALOGUE-2: Number-pad keys do not pick answers
- **Severity:** polish
- **Where:** every conversation (talk engine)
- **Repro:** m3-missing, at the first choice press Numpad1.
- **Expected:** picks answer 1, like Digit1 (the card says "1-4 to choose").   **Actual:** nothing happens. Only the top-row digits are bound.
- **Suspected cause:** `src/core/talk.js:87` binds only `ONE..FOUR`.
- **Suggested fix:** also bind `NUMPAD_ONE..NUMPAD_FOUR`.

### DIALOGUE-3: The feedback card clips the mood meter, and the pointer arrow sits on top of the ♥/💢 reaction bubble
- **Severity:** polish
- **Where:** m3-missing (any scenario with a mood meter), every graded answer
- **Repro:** m3-missing, answer the first question. The "GOOD CALL / NOT QUITE" card (x 260-1020, top y 110) overlaps the bottom-right corner of "DANA'S MOOD" (x 30-350, y 65-119). At the same moment the orange speaker arrow above Dana's head is drawn over the heart / anger bubble she pops.
- **Evidence:** `test/out/review/dialogue/missing-2.png`, `missing-bad1.png`
- **Suspected cause:** `src/core/talk.js:398` coach card at y 110; `DialogueScene.js:138` meter at (190, 92). Pointer at depth 2999 vs the emote in the rig.
- **Suggested fix:** move the coach card down ~20 px (or the meter up); hide the speaker pointer while an emote is showing, or lift the emote above it.

### DIALOGUE-4: Effects on an ending node are silently dropped (m3-missing "Mystery Solved" promises +1 service)
- **Severity:** minor
- **Where:** talk engine, every scenario; the only data that uses it today is m3-missing `end_great` (`data/m3_dialogues.js:195`, `effects: { service: 1 }`)
- **Repro:** play m3-missing on the recommended answers: score is 1800 = 13 choice points ×100 + 500 good-ending bonus. The ending's +1 service (100 points) never lands.
- **Expected:** end-node `effects` apply (the format comment at `data/m3_dialogues.js:8` documents `effects?` on end nodes).   **Actual:** ignored.
- **Suspected cause:** `src/core/talk.js:140` `goto()` calls `finish(n)` for `type: 'end'` before `afterAct` would apply `n.effects`.
- **Suggested fix:** apply `n.effects` before `finish(n)` (as a bonus line), or remove the field from the data and the format comment. If DIALOGUE-1 is fixed by scoring endings, this is the natural place to do it.

### DIALOGUE-5: m3-signature: the helpful neighbour steps out of the recipient's own front door, and a porch post cuts through his face
- **Severity:** minor
- **Where:** m3-signature, node n2 ("Hola! They're both at work until six…")
- **Repro:** boot m3-signature, answer the first question. Mr. Alvarez fades in at the green door of No. 214, the house where "nobody answers", and stands with the porch column across his face for the rest of the scenario (including the phone call).
- **Expected:** the neighbour walks over from next door / the side of the frame and stands clear of the porch posts.   **Actual:** he appears in the recipient's doorway, so a trainee reads him as someone from the household, which undercuts the lesson ("recipient only" means no neighbour).
- **Evidence:** `test/out/review/dialogue/sig-1.png`, `sig-1crop.png` (full-size crop)
- **Suspected cause:** `DialogueScene.js:73-75` puts `spotOther` at `house.doorX - 26` for every porch scene, and `ensureRig()` (line 116) fades the rig in at `spotOther + 120`, i.e. in the doorway; the porch post is drawn in front of actors.
- **Suggested fix:** give the cast an entry side (`enter: 'left'|'right'|'door'`) and a stand spot, and for m3-signature bring Alvarez in from the right onto the path/lawn; keep actors clear of the porch posts or draw posts behind actors.

### DIALOGUE-6: The stage never acts out what the narration says (no box in hand, no side door, no planter)
- **Severity:** design
- **Where:** m3-missing, m3-signature (and see the other scenarios below)
- **Repro:** m3-missing opens with "You're pulling a box from the truck", and one answer is "Here — just take this one I'm holding", but the courier stands empty-handed in the van door. "You walk around the house together. Behind a recycling bin by the side door: a box with Dana's name on it" — nobody moves and no box appears; Dana is still by the kerb when she says "Oh my gosh. It's HERE." m3-signature: the package with the "bright sticker" is never in the courier's hands; Priya asks to leave it "behind the big planter" and the narration says "You tuck it behind the planter" — there is no planter on the porch.
  Also: m3-twostops "Three boxes on your hand truck" (no hand truck, no boxes); m4-address "Knock, and politely confirm the recipient's name" (the courier never leaves the van door; Jo walks over to the van); m4-damaged "You roll up the cargo door… a wet stain is spreading" (no box, no stain, courier in the cab door); m4-storm "the yard is ankle-deep in water… the back gate is padlocked" (dry lawn, no gate). Even where the engine could do it, it is not asked to: m3-missing `n5_brush` "Dana storms off" has no `hide`, so she stays standing there, calm, through the narration; m4-damaged `n3_bad` walks Mr. Bennett off *before* the line about the liquid dripping over his hands. See also DIALOGUE-8 and DIALOGUE-17.
- **Expected:** the courier carries the package the scene is about; key actions (walking to the side door, finding the box, setting the box down) are shown, even briefly.   **Actual:** a static two-shot with text; the stage contradicts the text.
- **Evidence:** `missing-1.png`, `missing-4.png`, `sig-1.png`, `sig-2.png`
- **Suggested fix:** `hold('box')` on the courier where the text says so; simple acts for "walk to X" and "prop appears" (the talk engine already supports acts); add a planter prop to the porch setting, or change the text to something on stage (the bench / the mat).

### DIALOGUE-7: m3-twostops office: the receptionist is sunk behind the counter, only her eyes show, and the caption box covers the rest
- **Severity:** major
- **Where:** m3-twostops, whole first stop (Brightline lobby, nodes n1-n3); the same `interior` layout is used by the `depot` and `warehouse` settings
- **Repro:** boot m3-twostops, press Space once. Morgan walks in behind the reception counter at x 610 with her feet at y 714 (the bottom edge of the screen), while the courier stands at y 640. Her head top is at ~474, the counter top at ~540, the caption box starts at 566: all you see of the person you are talking to is her hair and eyes peeking over the counter, and her shoes below the caption box. The orange "who is talking" arrow points at the top of her head.
- **Expected:** the receptionist visible from the waist up behind the counter, face clear of the counter, caption box and choice cards.   **Actual:** effectively invisible for the whole stop; any expression change is lost.
- **Evidence:** `test/out/review/dialogue/two-1.png`, `two-1crop.png` (full-size crop); `/eval` → `{x:610, y:714, spotOther:610, otherY:714, head:300, scale:0.8, me:[250,640]}`
- **Suspected cause:** `src/scenes/shared/DialogueScene.js:58-60` interior: `spotOther = I.counterX + 50` and `otherY = OTR.H - 6` (714), 74 px lower than the courier's floor; the counter is drawn in front of actors.
- **Suggested fix:** stand the receptionist on the same floor line as the courier (or raise her so her shoulders clear the counter), and move her left of the choice column (the cards start at x 624).

### DIALOGUE-8: m3-twostops dog stop: the picture contradicts the safety lesson (courier stands on the porch beside the snarling dog the whole time; "He's inside now" with the dog still there)
- **Severity:** major
- **Where:** m3-twostops, second stop (nodes n4-n8, setting `porch_dog`)
- **Repro:** play m3-twostops to "Stop 2 of 2: … You're halfway up the path when…". The new stage puts the courier on the porch at the front door (x 247) and Biscuit fades in on the porch 180 px away (x 431), behind the railing. Then, whatever you choose: "(You're back outside the gate with it shut behind you. The dog paces along the fence…)" — nobody moved; "Stay outside the gate at a safe distance" — the courier is still at the door within reach of the dog; Mrs. Chen appears in the doorway right over the dog; "He's inside now" — the dog is still standing on the porch next to her. Choosing "back away slowly toward the gate" moves nobody either.
- **Expected:** the courier starts on the path, backs out through the gate (the foreground fence) when told to, the dog paces behind the fence, and Biscuit is walked indoors (a `hide`) when Mrs. Chen says so.   **Actual:** a static two-shot of courier and dog side by side at the front door for the whole safety lesson; the dog itself is mostly hidden behind the porch railing and the caption box (same family as STOPS-M8-12, but this is the conversation scene, not the doorstep stop).
- **Evidence:** `test/out/review/dialogue/two-dog.png`, `two-dogcrop.png` (full size), `two-calm.png`, `two-chen.png`, `two-n8.png`; `/eval` → `{dog:[430.6,574], me:[246.6,574]}`
- **Suspected cause:** `DialogueScene.js:73-75` house setting: `spotCourier = doorX - 210`, `spotOther = doorX - 26` (both on the porch); no act moves the courier; `n8` has no `hide: 'biscuit'`.
- **Suggested fix:** for `porch_dog`, start the courier on the path in front of the fence; add a `move`/`retreat` act on the "back away" choice and on `n6_calm` so the courier ends behind the gate; have the dog pace on the lawn in front of the porch (clear of the railing and the caption box); `hide: 'biscuit'` on `n8`/`n8_tossed`.

### DIALOGUE-9: m3-twostops: get bitten, yell at the owner, and the ending says "You stayed safe"; the takeaways never mention the dog
- **Severity:** major
- **Where:** m3-twostops, endings and results
- **Repro:** answer badly throughout: "Stack the boxes…", "Sign here.", "Sure! I'll wander up…", "Turn and sprint for the truck!" (box dented), "Try again. Dogs usually calm down…" (narration: "Teeth catch your leg… needs cleaning, a report, and a call to your supervisor"), then "Your dog is a menace!". 
- **Expected:** a bad outcome that names the bite and the damaged box; takeaways about not running and not re-entering the yard; and somewhere a chance (or a statement) that you report the bite and get first aid.   **Actual:** outcome **PARTIAL — "Rattled: You stayed safe, but the confrontation soured a customer…"**. Key takeaways are the two business-etiquette lessons plus a business key lesson; "Never run from an aggressive dog" and "Never re-enter a yard with a loose, aggressive dog" are dropped (the three-takeaways-in-time-order problem already known from warehouse.md applies here). After the bite the recommended answer is "I'm okay, thanks! Could you bring him inside while I bring this to the door?" and is graded ✓ GOOD CALL: finish the delivery, no report, no first aid. The dented box from the chase is never mentioned again (only the tossed-box branch gets a damage conversation).
- **Evidence:** run log above; outcome texts from `/texts` (`Rattled`, `PARTIAL`).
- **Suspected cause:** `data/m3_dialogues.js:628-631` `n8_sour` → `end_sour` ignores the `bitten`/`dented` flags (only `end_pick` checks them); `n7_owner` has no bitten-aware choice.
- **Suggested fix:** route `n8_sour` (and every ending) through a flags check so `bitten` always ends on `end_rough`/a dedicated "Dog bite" ending; add a `bitten`-only choice at `n7_owner` ("I've been bitten — I need to step away, clean this and call my manager") graded good; add a `dented` line at `n8` to disclose the damage.

### DIALOGUE-10: Efficiency is scored but never shown in four conversation scenarios, so "ok" answers look pointless and some costs are invisible
- **Severity:** minor
- **Where:** m3-twostops, m4-damaged, m4-storm, m8-incident (all report only Safety and Service, `data/modules.js`)
- **Repro:** m3-twostops: "Sure! I'll wander up and find the corner office." costs efficiency −2 (the whole reason it is only "OKAY, BUT…": "roaming a secure building eats route time") — the results screen has no efficiency row, so on the visible categories the choice costs one safety point. "Sign here." (+1 efficiency) and "Hand over the package and hurry" (+1 efficiency) earn nothing visible. m8-incident has ten choices with efficiency effects (`data/m8_incident.js:49, 88, 94, 143, 163, 169, 175, 199, 205, 211`), m4-damaged one (`m4_dialogues.js:290`), m4-storm two (`457, 475`).
- **Expected:** every scored effect shows up somewhere the trainee can see it.   **Actual:** `DialogueScene.run()` hands the talk engine all categories (`cats: OTR.scoring.CATS`, `DialogueScene.js:171`), the log records efficiency checks, and the results show only the scenario's `categories`. Same family as STOPS-M8-5 (m8-steps / m8-heat), different scene.
- **Suggested fix:** either add `efficiency` to these scenarios' `categories`, or drop the efficiency effects from their data (and write the "ok" feedback so it does not promise a trade-off the scoring does not show).
- **Status:** fixed — efficiency is declared (and shown) where the conversation teaches it: m3-twostops and
  m8-incident now score safety, service and efficiency. m4-damaged and m4-storm had one and two "+1 efficiency"
  effects on middling answers; those are removed (their feedback never promised a time saving).

### DIALOGUE-11: m3-twostops text inconsistencies: "Not Documented" after you documented it; "back outside the gate" after freezing or crouching; narration under the dog's name
- **Severity:** minor
- **Where:** m3-twostops, second stop
- **Repro / Actual:**
  1. Toss the box over the fence, then the recommended answers: "I'm sorry about that. Open it while I'm here… **There's a dog note going on this address too.**" (✓ "The dog note protects the next courier.") → ending **"Delivered, Not Documented — Noting the dog hazard would have protected the next driver on this route."** (`end_ok` is shared with the "hurry to the next stop" branch, `data/m3_dialogues.js:615` → `641-643`).
  2. Let the DECIDE! timer run out ("Freezing up happens!") or pick "Crouch down and hold out your hand": the next line is "(You're back outside the gate with it shut behind you…)" — you never retreated; nothing happened between charging dog and closed gate (`n5` timeout and crouch both → `n6_calm`).
  3. `n6_calm` is narration in brackets but is spoken under the orange "Biscuit" name tag with the pointer on the dog (`speaker: 'biscuit'`, line 520).
  4. Freezing costs 1 safety point of 3 and still ends "Two Stops, Nailed" / "GREAT WORK!" (known results-screen family).
- **Expected:** endings that match what was said; a bridging line ("You manage to back out through the gate…") after the timeout/crouch; narration styled as narration.
- **Suggested fix:** give `n8_tossed`'s good choice its own ending (e.g. "Honest Recovery", mixed); add a short `n5b` narration for the timeout/crouch branches; set `speaker: 'narrator'` on `n6_calm` (keep `effects.mood` with `moodTarget: 'biscuit'`).

### DIALOGUE-12: m4-damaged: open the leaking chemical box, get it on your hand, and the ending says "The dangerous part was handled well"
- **Severity:** major
- **Where:** m4-damaged, ending `end_ok`
- **Repro:** boot m4-damaged; "Pick it up and open it to see what's leaking." (narration: "The liquid stings your hand… That still goes in an exposure report"); then the recommended answers ("Good afternoon! I'm sorry…", "I understand the frustration…"); then "Skip the paperwork — it's already been reported once."
- **Expected:** an ending that remembers the exposure (the `exposed` flag is set for exactly this; `end_pick` sends the good branch to "Handled Well — After the Burn").   **Actual:** **PARTIAL — "Safe, But Sloppy: The dangerous part was handled well, but thin documentation will slow down Mr. Bennett's replacement."** The same happens after "Wipe it off with a rag… and deliver it".
- **Evidence:** outcome text via `/texts` (run above).
- **Suspected cause:** `data/m4_dialogues.js:286-292`: only the "Document the damage" choice goes through `end_pick`; "Skip the paperwork" goes straight to `end_ok`, which ignores `exposed`. `end_deflect` ("The package was kept safely off the doorstep") also ignores it.
- **Suggested fix:** route every ending through a check of `exposed` (as DIALOGUE-9 for `bitten`), e.g. `end_pick_ok: { if: '!exposed', then: 'end_ok', else: 'end_exposed' }`, and give end_exposed a variant that also mentions the skipped paperwork.

### DIALOGUE-13: The best answer can pop an anger bubble and drop the mood meter next to "✓ GOOD CALL"
- **Severity:** design
- **Where:** m4-damaged n2 (honest explanation, `mood: -1`); any choice graded good with a negative mood effect
- **Repro:** m4-damaged, at "Is that my cleaning supplies order?" choose "Good afternoon! I'm sorry — your package was damaged…". The green "✓ GOOD CALL" card appears while a red 💢 bubble pops over Mr. Bennett and his meter drops a notch.
- **Expected:** the trainee can tell "right answer, customer still disappointed" at a glance.   **Actual:** the only animated reaction on screen is the anger bubble, which reads as "you made him angry". The feedback text does explain it ("He's disappointed — that's normal"), but the bubble contradicts the header.
- **Evidence:** `test/out/review/dialogue/dmg-honest.png`
- **Suspected cause:** `src/core/talk.js:374` emotes 💢 for any negative mood change regardless of grade.
- **Suggested fix:** on a good-graded choice with negative mood, use a neutral "disappointed" emote (e.g. "…" or a sweat drop) instead of 💢, or no emote.

### DIALOGUE-14: m4-storm: after the truck drowns in the underpass, the story carries on as if you drove to the stop, the ✓ answer to dispatch is a false report, and "Okay. Bye." ends "Safe and Sound"
- **Severity:** major
- **Where:** m4-storm, the `flooded` branch (n2_flood → n3 → n4 → n5 → n6 → endings)
- **Repro:** boot m4-storm (let the DECIDE! timer run out or answer anything), then "It looks shallow, and the truck sits high. Go for it." Narration: "the engine sputters and dies… You climb out into thigh-deep water… The truck is going nowhere until a tow gets here, and everything on board is soaked." Then:
  1. Dispatch: "Everyone okay out there?" The recommended answer is **"I'm safe. Heads up: the Pine Street underpass is flooded — I rerouted."** → ✓ GOOD CALL. You did not reroute; you are standing next to a flooded truck. There is no answer that reports the truth ("I drove into it, the truck's stalled, I need a tow").
  2. "You reach the stop." (with a dead truck) → "Wait **in the truck** until the lightning moves off" ✓ (the truck is in the underpass).
  3. "Okay. Bye." to Ms. Okoye → **PARTIAL "Safe and Sound: Everyone stayed safe and the package is protected."** — the package is soaked and the truck is awaiting a tow. Likewise "Wedge it against the gate" / "Leave it on the front step" → "Soggy Delivery: You stayed safe…". Only the fully recommended ending (`end_pick`) checks `flooded`.
- **Expected:** the flooded branch either ends there (a bad ending about the tow and the soaked freight, after an honest call to dispatch) or continues coherently (dispatch sends help, the stop is reassigned), and every ending respects `flooded`.   **Actual:** the trainee is rewarded for a false "I rerouted" report, which is the opposite of what a real incident call needs.
- **Suspected cause:** `data/m4_dialogues.js:392-414` (n2_flood → shared n3), `474-478` and `456-459` (endings that skip `end_pick`).
- **Suggested fix:** give the flooded branch its own dispatch node (good: "I drove into the underpass, the truck stalled, I'm out and safe on high ground, I need a tow"; bad: "All good!"), and end it with `end_towed`; or at least make n3's good text conditional (`if: '!flooded'`) and add a flooded version, and route `end_ok`/`end_soaked` through the `flooded` check.

### DIALOGUE-15: m8-incident: take no photographs, send the witness away, write a two-line report, and the outcome is "Handled By The Book … documented, witnessed and written up honestly" (RESOLVED, confetti)
- **Severity:** major
- **Where:** m8-incident, `end_pick` / endings
- **Repro:** boot m8-incident; recommended answers up to the dispatch call; then "None — he has photographed it and dispatch has the report.", "No need, thanks — it's all reported already.", "Keep it to two lines. The less said, the better."
- **Expected:** "Reported, With Loose Ends" (mixed), which even names "the thin report, the missing photographs".   **Actual:** **RESOLVED — "Handled By The Book: Secured, checked, reported, documented, witnessed and written up honestly — in twenty-five minutes. The claim closed without a dispute…"** with confetti and fanfare. (The results screen then says "SHIFT LOGGED", so the outcome card and results disagree.)
- The reverse also happens: `end_mixed` is reached only through `admitted` or `shaded`, yet its text always lists "the admission, the thin report, the missing photographs", so a trainee who admitted fault but photographed everything and wrote a full report is told about photographs and a report they did not skip. And `end_bad` ("a cash deal with no record, or a scene you left… there is nothing on your side of the file") is shown even when, after the cash offer or after walking back, you reported to dispatch, photographed everything, took the witness and wrote an honest report.
- **Evidence:** outcome text via `/texts` (run above); `test/out/review/dialogue/inc-lazy-end.png`
- **Suspected cause:** `data/m8_incident.js:268-281`: the "None" photographs, "No need" witness and "two lines" report choices set no flags, so `end_pick` cannot see them; the ending texts are fixed lists.
- **Suggested fix:** set flags on those choices (`nophotos`, `nowitness`, `thin`) and include them in `end_pick`; build the mixed/bad ending text from the flags that are actually set (or have one ending per main failure); make `end_bad` distinguish "left the scene" from "took cash" and not claim an empty file when the trainee documented everything.

### DIALOGUE-16: A second visitor walks onto exactly the same spot as the first, hiding them (Ray vanishes behind Mrs. Whitfield; Mrs. Chen stands on the dog)
- **Severity:** minor
- **Where:** m8-incident n9-n10; m3-twostops n7-n8 (any scene where two cast members are on stage)
- **Repro:** m8-incident, recommended answers to "Photographs, then." and past it: Mrs. Whitfield fades in and walks to x 470, the exact spot where Ray Delgado is standing, at the same depth. Ray disappears behind her for the rest of the scenario, although she is talking about him and he is still there. m3-twostops: Mrs. Chen appears on the same spot as Biscuit, so the dog is drawn across her legs.
- **Expected:** each character has their own mark (e.g. the second visitor stops 120-150 px further right, or the first steps aside).   **Actual:** `/eval` → `[["ray",470,640,25,1],["neighbour",470,640,25,1]]`.
- **Evidence:** `test/out/review/dialogue/inc-neighbour.png`, `inc-overlap.png` (full-size crop), `two-chen.png`
- **Suspected cause:** `src/scenes/shared/DialogueScene.js:107-129` `ensureRig()` always walks the new rig to `this.spotOther`, whoever is already there.
- **Suggested fix:** keep a list of occupied marks and give each new rig the next free one (spotOther, spotOther + 140, …, all left of the choice column at x 624), or let the data give a `spot` per cast member.

### DIALOGUE-17: m8-incident and m4-storm are staged at a parked van by a house: no sedan, no driveway, no damage; the driving decisions are asked over a parked scene
- **Severity:** design
- **Where:** m8-incident (whole scenario), m4-storm n0-n2
- **Repro:** m8-incident: "You were backing out of a narrow driveway… A parked sedan. Its front wing is folded, your bumper is scuffed." The stage is the standard `street` set: the van parked at the kerb with the courier in its open cab door, no second car, no driveway, no damage. Ray "climbs out" of a car that is not there; you "photograph both vehicles"; the van is "sitting three metres from where it made contact". m4-storm opens with "Rain hammers the windshield" and asks whether to speed up, stop in the travel lane or pull off — while the picture shows the van already parked at a house with the courier standing in the door.
- **Expected:** the collision scenario shows the collision: the van half out of a driveway, the sedan with a crumpled fender, the courier getting out. The storm's driving questions are asked from the cab (or the stage starts on the road and the van parks after the flood decision).   **Actual:** a generic doorstep backdrop that contradicts the text.
- **Evidence:** `test/out/review/dialogue/inc-ray.png`, `storm-0.png`
- **Suggested fix:** add a `collision` setting (driveway + parked sedan prop with a damage decal, van angled out) and a `cab`/`road` setting for the storm's first two decisions; switch to the doorstep with `setting:` once the van reaches the stop (the engine already supports setting changes, as in m4-address).

### DIALOGUE-18: m8-incident continuity: dispatch answers a text you sent your supervisor, asks you to report what you already reported, and opens a claim for the cash deal nobody reported
- **Severity:** minor
- **Where:** m8-incident, n2 → n6 → n7 → n8_moved → n10
- **Repro / Actual:** (played: "barely a scuff", "Call dispatch", "half of this is on you", "Take the deal", "Send a text", "None", "Only if…", "parked illegally")
  1. "Send a text to your supervisor and carry on with the route." → next line, **Dispatch**: "Understood. Nobody hurt — good. Get me photographs…" as if you had called and reported "nobody hurt" (`n6` → shared `n7`).
  2. At n2 "Call dispatch and describe the damage." is offered (graded ok); two nodes later n6 says "dispatch is one press away" and asks again whether to report — as if the first call never happened.
  3. "Take the deal. Two hundred is cheaper than the paperwork." ("we both drive away. Nobody needs to know") and a few lines later dispatch says "Claim's open."; the ending then says "a cash deal with no record".
  4. `n8_moved`: "the two people who watched you move it" — when you moved it (n1) "The street is quiet. Nobody has come out yet."
  5. Driving three houses down in `n1_left` moves the van too, but only the "pull forward" choice sets `moved`, so the "you moved the van" line never appears on the leaving-the-scene path.
  6. Narration in quotes under a speaker tag: n3 "The door opens and a man climbs out… "I'm fine…"" is shown as Ray speaking.
- **Expected:** each branch's later lines agree with what the trainee chose.
- **Suggested fix:** split n7 into "called" and "texted" versions (for the text: dispatch rings you back, "Your supervisor forwarded your text — you call this in, you don't text it"); set a `reported` flag at n2's dispatch choice and skip/reword n6; for `cash`, have Ray pocket the money and the claim still arrive ("Ray's insurer calls anyway"); drop "two people who watched" or make it conditional; set `moved` in `n1_left`; make n3 narration then a Ray line.

### DIALOGUE-19: m8-incident is written in British English inside a US-English game ("wing", "kerb", "tyre", "metre", "I was sat in it", "clock off")
- **Severity:** polish
- **Where:** m8-incident text and key lessons (`data/m8_incident.js`), title "After a Fender-Bender"
- **Repro:** play m8-incident. "Its front **wing** is folded", "creased into the **tyre**", "a **metre** high", "three **metres**", "A cash settlement on the **kerb**", "**neighbour**", "I was **sat** in it", "before you **clock off**", "dear". Every other conversation is US English (neighbor, windshield, ZIP, Maple Avenue, truck), and the title itself says "Fender-Bender".
- **Expected:** one dialect, the customer's (US).   **Actual:** mixed; US trainees will trip on "wing" in particular (it means fender).
- Also: the m3-signature scenario card says "a helpful **neighbour** has ideas" (`data/modules.js:119`) while the scenario itself says "neighbor" nine times; m8-incident's card reads "Click a reply or press 1-3" while the six other conversation cards say "Mouse or 1-4 to choose · click / SPACE to advance" (m8's omits how to advance).
- **Suggested fix:** fender, curb, tire, feet ("ten feet"), neighbor, "I was sitting in it", "before you clock out". The results header "KEEP PRACTISING" is the same issue (shell area). Use one controls line for all seven.

### DIALOGUE-20: The on-screen pause button does nothing in conversations; clicking it skips the line instead
- **Severity:** major
- **Where:** all seven conversation scenarios (DialogueScene), whole conversation
- **Repro:** boot m3-missing; while the first narration line is up, click the ‖ pause button at the top left (`/click?x=30&y=28`). The game does not pause; the conversation advances to Dana's line. With the choices up, clicking it again does nothing at all (`/state`: DialogueScene not paused, no PauseScene). ESC still works.
- **Expected:** the pause menu opens, as in every other scenario.   **Actual:** the talk engine's full-screen click catcher (depth 3000) sits above the HUD (depth 800) and takes the click; a trainee who reaches for the button skips text they have not read.
- **Suspected cause:** `src/core/talk.js:92-93` (`catcher` zone covering the whole screen, `pointerup` → `advance()`), root container at `depth 3000`; the HUD's pause icon button is at `src/scenes/BaseScenarioScene.js:37`.
- **Suggested fix:** leave the HUD strip out of the catcher (e.g. make it `OTR.W × (OTR.H − 60)` starting below the bar), or raise the HUD above the talk root, or have the catcher ignore pointers over the HUD bar.

### DIALOGUE-21: The recommended answer is the longest answer at 41 of 42 decisions, so "pick the longest" passes every conversation
- **Severity:** design (it undermines the assessment, so treat it as high priority)
- **Where:** all seven scenarios' data (`data/m3_dialogues.js`, `data/m4_dialogues.js`, `data/m8_incident.js`)
- **Repro:** count, for every node with choices, whether a `grade: 'good'` choice is the longest text: 41 of 42 (the only exception is m4-address `n2_412`). The bad answers are short and blunt ("Nope. Can't do that.", "Rules are rules. Bye.", "Sign here.", "Okay. Bye.", "Turn and sprint for the truck!"); the good ones are long, polite and hedged, and often contain the lesson's own keywords ("follow your company's procedure", "through your normal process"). Shuffling the order does not help.
- **Expected:** a trainee has to understand the situation to choose well.   **Actual:** a trainee who reads nothing and picks the longest card gets "FLAWLESS!" on most scenarios.
- **Suggested fix:** rewrite so lengths overlap: give some wrong answers plausible, reasoned wording ("I'll take it up myself — the CEO's office is on my way and it saves them a trip"), trim the good answers to the action, and add at least one "sounds professional but wrong" option per scenario (e.g. an articulate phone-OK for the signature, a polite neighbour hand-off). A quick check in the build (`OTR.talk` validation) could warn when the good answer is always the longest.

### DIALOGUE-22: After you answer, your answer disappears: the feedback card does not say what you chose and the courier never says it
- **Severity:** design
- **Where:** talk engine, every graded choice
- **Repro:** pick any answer. The chosen card pulses, all cards fade out within ~0.5 s, and the "✓ GOOD CALL / ✗ NOT QUITE" card appears; the caption box still shows the *other* person's previous line. Nothing on screen shows the words you picked, and the courier's own name tag never appears in any conversation.
- **Expected:** the trainee can read the feedback against their answer ("You said: …"), especially on "NOT QUITE" where the feedback explains why that exact wording was wrong; the conversation reads as a dialogue.   **Actual:** the answer is gone before the feedback is read; after a few decisions trainees cannot tell which answer a "NOT QUITE" was about. (The results' takeaways then do not quote it either.)
- **Evidence:** `test/out/review/dialogue/missing-2.png`, `missing-bad1.png`
- **Suspected cause:** `src/core/talk.js:315-343` (`resolve` fades all cards, `coach` shows only `ch.feedback`).
- **Suggested fix:** show the chosen answer in the caption box under the courier's name while the feedback card is up (the engine already has `courier.name`), or quote it at the top of the feedback card.

### DIALOGUE-23: m3-signature: forge the customer's signature, then answer well, and the outcome is "Secure & Satisfied … Textbook." (RESOLVED, confetti)
- **Severity:** major
- **Where:** m3-signature, `n1b` and `end_great`
- **Repro:** boot m3-signature; "Scribble the signature yourself to save everyone a trip." (or "Leave it tucked against the door"); the narration takes it back for you ("…the bright SIGNATURE REQUIRED sticker catches your eye… You pick it back up."); then the recommended answers.
- **Expected:** the ending acknowledges the near-miss (the data even sets a `slipped` flag for it); a forged signature is the scenario's single worst act.   **Actual:** **RESOLVED — "Secure & Satisfied: The package is safe, the requirement was honored… Textbook."**, confetti and fanfare; results "SHIFT LOGGED", 2 stars. `slipped` is set at `data/m3_dialogues.js:270` and read nowhere. Also, the trainee never sees a consequence of either bad first answer: the narration silently undoes it. The "setting it down" wording does not fit the forged-signature choice either.
- **Evidence:** outcome text via `/texts` (run above).
- **Suggested fix:** `end_pick: { if: '!slipped', then: 'end_great', else: 'end_slipped' }` with a mixed ending ("You caught yourself — but a forged signature is a falsified record; it would have been your name on it"); give the two bad first answers separate follow-up lines.

### DIALOGUE-24: More "perfect" endings after a real mistake: m4-address (you guessed 412) and m8-incident (you moved the van)
- **Severity:** minor
- **Where:** m4-address `end_great`; m8-incident `end_pick`
- **Repro / Actual:**
  - m4-address: "Deliver it to 412 Maple Ave. The digits were probably swapped." → Sam: "Oh, this isn't mine" → "Thanks for checking!" → recommended answers → **RESOLVED "Right Package, Right Door: You verified instead of guessing…"**. You guessed; the stranger caught it. (Played and confirmed.)
  - m8-incident: "Pull forward out of the way first" sets `moved` (and the narration later puts it in the report), but `end_pick` only checks `left/cash/admitted/shaded`, so the rest on the recommended answers ends **RESOLVED "Handled By The Book: Secured, checked, reported…"**, results "GREAT WORK!", score 3500 (played and confirmed; `data/m8_incident.js:58, 268`), right after the narration "It goes in the report."
- **Expected:** the ending reflects the mistake the scenario itself called out (a mixed ending, or an ending sentence that names it).
- **Suggested fix:** set a `guessed` flag on the 412 choice and route `n4`'s good answer through `end_pick: { if: '!guessed', … }` with a "Caught in Time" mixed ending; add `moved` to m8's `end_pick` (mixed). Together with DIALOGUE-9, -12, -14, -15 and -23 this is one pattern: flags that are set for exactly this reason and then ignored by some endings. A data check that every ending reachable after a flag is set either reads it or is flag-neutral would catch them all.

### DIALOGUE-25: Phone calls are never hung up, and the mood meter follows someone who is not in the scene
- **Severity:** polish
- **Where:** m8-incident n7 → end; m3-signature n3_call → end; m3-signature meter
- **Repro:** m8-incident: once Dispatch calls (n7) the courier keeps the handheld to their ear for the rest of the scenario, including the photographs and the whole conversation with Mrs. Whitfield (`inc-neighbour.png`). m3-signature (recommended path): Priya's call is never ended, so the courier "fills out the delivery notice" with the phone at their ear. m3-signature shows "PRIYA'S MOOD" from the first line, before anyone has mentioned Priya, while the person actually on stage for the first half (Mr. Alvarez, whose mood the answers change, e.g. "Nope. Can't do that." −2) has no meter.
- **Expected:** the courier lowers the phone when the call ends (a `hide` on the next narration/visitor line, as m4-address and m4-storm do); the meter appears when its person joins, or tracks whoever is being spoken to.
- **Suggested fix:** add `hide: 'dispatch'` to m8 `n8`/`n8_moved` and re-`show` it at `n10`; `hide: 'priya'` on m3-signature `n4_good`'s choices; build the mood meter on the first `show` of `moodMeter`'s cast member (or allow `moodMeter` per node).

### DIALOGUE-26: Timed decisions: 7 seconds to read ~250 characters, with no warning that a clock is coming
- **Severity:** design
- **Where:** m3-twostops n5 (dog, 7 s), m4-storm n0 (storm, 9 s)
- **Repro:** reach the dog charge in m3-twostops. The DECIDE! bar appears together with three answers totalling about 250 characters (the right one alone is 130); the scenario card and nothing before it say that some decisions are timed. At a normal reading speed (~15-20 characters/s) reading all three takes 12-17 s, so a careful trainee times out and is told "Freezing up happens!". Because the right answer is also the longest (DIALOGUE-21), a skimmer beats the timer and a reader does not.
- **Expected:** a pressure moment that tests the decision, not reading speed.   **Actual:** it rewards not reading. On timeout the cards just fade, the feedback does not show which card was right, and the timer bar keeps its full width in yellow-red with no seconds shown (the tick sound is the only count).
- **Evidence:** `test/out/review/dialogue/two-dog.png`, `two-timer-half.png`, `two-timeout.png`, `storm-0.png`; the timer pauses correctly with ESC (checked: 8137 ms left → 8122 ms after 3 s paused).
- **Suggested fix:** keep the timed answers to a few words each ("Stop. Back away slowly, box in front.", "Run for the truck!", "Crouch and offer a hand."), give 10-12 s, mention timed decisions in the scenario card's controls line, and on timeout highlight the right card for a moment.

### DIALOGUE-27: m3-twostops office: the lobby ends 100 px short of the screen, showing sky and houses through a cut-off plant; Morgan's exit walk is a long slide along the bottom edge
- **Severity:** polish
- **Where:** m3-twostops, Brightline lobby (setting `office`), n1-n4
- **Repro:** boot m3-twostops and look at the right edge: the lobby wall stops at x ≈ 1180 and the outdoor backdrop (blue sky, rooftops, bushes) fills x 1180-1280 with no window frame; the potted plant is sliced by the seam. When the stop ends (`n4`: `hide` then `setting`), the caption box disappears and Morgan walks 220 px to the right along the very bottom of the screen for ~1.7 s (her feet are at y 714, well below the courier's floor line, see DIALOGUE-7) before the fade to the next stop.
- **Expected:** the interior fills the frame (or the gap is a framed window/door); the receptionist either stays at her desk or steps out of view quickly.
- **Evidence:** `test/out/review/dialogue/office-edge.png` (full-size crop), `two-fade-6.png`
- **Suspected cause:** `DialogueScene.js:56` `st.interior(-420, { w: 1600 … })` covers x -420…1180 only; `acts.hide` (`DialogueScene.js:258`) always walks the rig 220 px at speed 150.
- **Suggested fix:** make the interior at least `OTR.W + 420` wide (or start it at -320); drop the `hide` on `n4` (the fade covers it) or make the hide a fade in place for characters behind a counter.

### DIALOGUE-28: Mood changes written on a line (not a choice) go to the first cast member: the dog never calms down, Mrs. Chen never warms up, the receptionist does
- **Severity:** minor
- **Where:** talk engine; visible in m3-twostops (n6_calm, n8)
- **Repro:** m3-twostops on the recommended answers. `n6_calm` ("The dog paces along the fence… not charging any more", `effects: { mood: 1 }`, speaker biscuit) and `n8` ("He's inside now… he's all bark", `effects: { mood: 1 }`, speaker chen). `/eval` at n6_calm: `{"morgan":3,"biscuit":-2,"chen":-1}`, dog `aggressive`; at n8: `{"morgan":3,"biscuit":-2,"chen":1}`, Chen `neutral`, dog still `aggressive`. Both +1s went to Morgan, who left the story at the first stop. On stage the dog keeps snarling, teeth bared, next to Mrs. Chen while she says he is inside and all bark.
- **Expected:** a line's mood effect applies to that line's speaker (as a choice's does).   **Actual:** first cast member.
- **Evidence:** `test/out/review/dialogue/two-n8-dog.png` (full-size crop: snarling dog at "He's inside now")
- **Suspected cause:** `src/core/talk.js:143` calls `applyEffects(n.effects, …, null)` with no node, so line 369 falls back to `Object.keys(this.cast)[0]`. Only multi-cast scenarios are hit (m3-missing, m4-damaged and m8-incident's node effects happen to target the first cast member).
- **Suggested fix:** in `goto()`, default the mood target to the line's speaker (`Object.assign({ moodTarget: this.cast[n.speaker] ? n.speaker : undefined }, n.effects)`). Do not simply pass `n` as the node: both lines also carry choices, so `applyEffects` would then log the line's effects as a scored check. Also `hide: 'biscuit'` at n8 (DIALOGUE-8).

### DIALOGUE-29: m4-storm content: the ✓ answer takes dispatch's call while (apparently) driving, and the scenario gives two different "water that floats a vehicle" depths
- **Severity:** minor
- **Where:** m4-storm n3 and the flood feedback/ending
- **Repro / Actual:**
  1. n3 comes straight after "Turn around and find another route" — you are driving in a storm. Dispatch rings; the ✓ answer is to talk ("I'm safe. Heads up…"); "Ignore the call. You'll catch up later." is graded "OKAY, BUT…", with feedback that itself says "Never handle the phone while moving — but once you're safely parked, checking in helps". The text never says you have parked, so the graded-best answer is taking a call while driving through a storm.
  2. n2 feedback: "Moving water just **a foot or so** deep can float many vehicles"; `end_towed`: "**Six inches** of moving water is enough to float a vehicle". The usual US guidance (NWS "Turn Around Don't Drown") is: 6 in can stall a car and make you lose control, 12 in floats many cars, 2 ft sweeps away SUVs and trucks. Pick one wording and use it in both places.
- **Expected:** the good answer models pulling over first ("I pull into the gas station, then call back: I'm safe, Pine Street underpass is flooded"), and the numbers agree.
- **Suggested fix:** add "Once you're parked safely:" to n3's narration (or make the good answer "Let it ring, pull over at the next safe spot, then call back and report the flooded underpass"); change `end_towed` to "Six inches of moving water can stall you and a foot can float many vehicles".

### DIALOGUE-30: m4-address: the "RIVERA" name on the mailbox, the clue for the last decision, is about 9 px tall and sits on the caption box's edge
- **Severity:** polish
- **Where:** m4-address n3_ct ("the mailbox says RIVERA, and the label says J. OKAFOR")
- **Repro:** reach Maple Court. The mailbox plate "421" is readable; the name tag under it is tiny white-on-grey text at y ≈ 560, touching the top of the caption box (566).
- **Evidence:** `test/out/review/dialogue/addr-mailbox.png` (full-size crop), `addr-421.png`
- **Suggested fix:** larger name plate on the mailbox prop when a `mailbox` name is given, and keep it above y 540; or show the label/mailbox close-up as a small inset when the narration points at it.

### DIALOGUE-31: A quick double-tap of Space (or a double-click) skips a whole line, and there is no way to read it again
- **Severity:** design
- **Where:** talk engine, every conversation
- **Repro:** m3-missing, as the opening narration starts typing press Space twice quickly (or `/type?keys=Space,Space,…`): the first press completes the line, the second advances at once, and the scene is on Dana's line with the narration never read. The same happens to any line followed by another line (e.g. m4-storm's flood narration, m8's dispatch instructions). There is no log/backlog, and the answer cards do not repeat the question, so a skipped line is gone for good (DIALOGUE-20's pause-button click does the same).
- **Expected:** a completed line stays up for a moment before it can be advanced, or a "previous line" / history is available.   **Actual:** skip-by-accident is easy, and the lines skipped are often the ones that carry the facts the next decision depends on ("the mailbox says RIVERA…", "Do not move the van until I call you back").
- **Suggested fix:** ignore advance input for ~300 ms after `finishTyping()`; optionally a small "history" button (or Up arrow) that shows the last few lines.

### Results screens (known issues, applying here too)
- The known results-screen problems from warehouse.md / pretrip-route-pickups.md apply unchanged to the conversation scenarios: only three takeaways, chosen in time order (m3-twostops: the dog-bite lessons are pushed out by business-etiquette ones, DIALOGUE-9), and "GREAT WORK!"/"FLAWLESS!" headers over runs with mistakes (m3-twostops after a DECIDE! timeout). The conversation-specific twist is that the *outcome card* can contradict the results screen: "RESOLVED / Handled By The Book" followed by "SHIFT LOGGED" (DIALOGUE-15).

## Revisit

- **Feedback card timing in turn-based play.** Four times (after "Perfect! Sign right here.", "I'll leave it at your designated receiving point…", "Could you just hang onto it?", "Stay outside the gate…") the ✓/✗ card was not yet up 700 ms of game time after the pick, and once the controller was still `resolving` 1 s after the pick (`two-trans-1.png`). The card always came up in the end. Probably the play tool's stepping around a slow frame, not the game, but worth one look in real time (`/mode?turn=0`) for a stall after those picks.
- **Console 404** on every boot of a conversation scenario (`[console.error] Failed to load resource … 404`); `performance` resource entries show no 404, so probably the favicon. For the shell/perf tester.
- **"Test mode — progress not saved"** appears on 0-star runs while "+N new career stars" appears on good runs in the same `?scenario=` session (`src/scenes/ResultsScene.js:98`). Dev-only, shell area.
- **Scenario cards from the real hub** (the "controls" line, blurbs) were read in `data/modules.js` but not seen on screen; I booted every scenario with `?scenario=`.
- **Sound** (typewriter ticks, DECIDE! ticks, thunder, bark) not judged: headless.
- **`depot` / `warehouse` settings** exist in `DialogueScene.settingSpec` but none of my seven scenarios uses them; they share the `interior` layout of DIALOGUE-7 and DIALOGUE-27 and would show the same problems.
- **m3-missing side branches** ("Wasn't me", "porch pirates", "take this one I'm holding") were reviewed from the data and the first choice screens only, not played to the end on screen.

## Summary

Played all seven scenarios on the recommended answers (all reach the good ending and full marks), on the worst answers, and on several mixed branches in each (bite, tossed box, exposure, flood, cash deal, moved van, forged signature, guessed address), with timeouts, pauses, Restart from the pause menu, Retry from results, number keys, numpad, mouse picks, key-spam and double-clicks. The talk engine is solid mechanically: no soft-locks, no double answers, the DECIDE! timer pauses with ESC, Restart and Retry come back clean, and keys pressed while paused are ignored. The problems are in what the endings and the stage tell the trainee.

The ten that matter most, in order:

1. **DIALOGUE-14** m4-storm: after driving into the flood, the ✓ answer to dispatch is "I rerouted" (a false report), the story carries on as if the truck still ran, and "Okay. Bye." ends "Safe and Sound".
2. **DIALOGUE-15** m8-incident: no photographs, no witness, a two-line report → "Handled By The Book … documented, witnessed and written up honestly", confetti; the mixed and bad endings name mistakes the trainee did not make.
3. **DIALOGUE-9** m3-twostops: bitten by the dog → "You stayed safe"; the ✓ reply after a bite is to carry on delivering; dog lessons dropped from the takeaways.
4. **DIALOGUE-21** the recommended answer is the longest one at 41 of 42 decisions: "pick the longest" passes, so the scores do not measure understanding.
5. **DIALOGUE-12 / -23 / -24** the same pattern: flags set for exactly this (`exposed`, `slipped`, `moved`, a guessed address) are ignored by some endings, so opening a leaking chemical box, forging a signature, moving the van or guessing the address can still end "Textbook" / "handled well".
6. **DIALOGUE-20** the on-screen pause button does nothing in any conversation, and clicking it skips the current line.
7. **DIALOGUE-8** the dog stop shows the courier on the porch beside the snarling dog throughout, while the text says you are safely behind the gate and the dog is inside.
8. **DIALOGUE-7** the office receptionist is sunk behind the counter and under the caption box; only her eyes show for the whole first stop.
9. **DIALOGUE-1** a category a short branch never tested gets three stars (walk away from Dana: Efficiency ★★★).
10. **DIALOGUE-10 / -17** efficiency is scored but hidden in four scenarios; and m8-incident / m4-storm are staged at a parked van by a house (no sedan, no driveway, driving questions over a parked scene).

Also worth fixing soon: DIALOGUE-16 (second visitor hides the first), DIALOGUE-18 (m8 continuity), DIALOGUE-22 (your answer vanishes before the feedback), DIALOGUE-26 (timed choices test reading speed), DIALOGUE-28 (line-level mood changes go to the wrong character).

Not covered: the scenario cards as reached from the hub, audio, the unused `depot`/`warehouse` settings, and a real-time check of the feedback-card timing (see Revisit).
