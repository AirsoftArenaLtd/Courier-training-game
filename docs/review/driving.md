# Driving: human-style review

Tester area: all driving. The Road Hazards drill (`m1-driving`, `src/scenes/m1/DrivingScene.js`), town driving on
route days (`src/scenes/shift/TownDriveScene.js`), the free-drive lab (`index.html?lab=town`), the van model
(`src/core/vehicle.js`, tuned by `data/vehicle.js`).

Played with `test/tools/playd.js` on port 9304, turn-based for precise checks and real time (`/mode?turn=0`) to judge
feel. Screenshots are in `test/out/review/driving/`.

## Findings

### DRIVING-1: Pressing S again just after stopping selects reverse, so "the brake" backs the van
- **Severity:** major (a trainee who taps the brake twice at a stop line or kerb finds the van rolling backwards)
- **Where:** every drive (drill, route legs, lab); `src/core/vehicle.js` gearbox. Confirmed in real time too
  (`/mode?turn=0`: brake to a stop, lift ~0.2 s, press S for 0.6 s → "R — reverse", backing at 0.7 mph).
- **Repro:** drive in D, hold S to a stop, lift S, and within about 0.7 s press and hold S again (the natural "tap it
  again to be sure" or "hold it while I press P"): `hold KeyS 600` then `down KeyS` 500 ms. Seen twice in the drill
  (at 4 and at 22 s).
- **Expected:** a second press of the brake is still the brake; reverse needs a deliberate, distinct action.
  **Actual:** after 0.3 s the gear flips to R ("Selecting R…" then toast "R — reverse", R badge) and, because S is
  the throttle in reverse, the van immediately starts backing at up to 2 mph while the trainee thinks they are
  braking. The next thing they reach for, W, is now the brake, so the van will not go forward either.
- **Evidence:** `test/out/review/driving/a10-p.png` (R badge, 2 mph backwards, "Backing: stop and get out and look
  first (G)"); state after the second press: `g:"R", mph:1.8`.
  Reproduced four times by hand (twice while trying to hold the van for P), and the test autopilot fell into it
  too: after I held SPACE at a red light and handed over, its first brake press flipped the van into R and it
  reported `failed: ended up in reverse` with a second backing violation logged.
- **Suspected cause:** `src/core/vehicle.js:86-97`: `canShift` becomes true the frame the brake is lifted while
  still "stopped" (|u| < 0.25 m/s), and the D creep takes ~0.7 s to exceed that, so any re-press held 0.3 s shifts.
- **Suggested fix:** require the pedal to be lifted for a clear moment (say 0.4 s) *and* a longer hold (0.8-1 s)
  before shifting, or give reverse its own key (R) as the prompt/badge already imply; never let S move the van
  backwards without a toast that says "S now drives backwards, W brakes".
- **Status:** fixed (decision) — reverse has its own key: R changes gear between D and R at a standstill ("Stop first,
  then R to change gear" otherwise), W is always the accelerator and S always the brake, in either gear
  (`OTR.vehicle.gearbox`). The brake can no longer select reverse however it is pressed. The plan asked for a
  deliberate hold from standstill; timing alone could not tell "hold the brake at a light" from "hold the brake to
  reverse" (a 1 s hold after a short lift would still have backed the van), so the key the finding also suggested was
  taken. The toast says "R — reverse: W backs up, S brakes. R again for drive."; the drill intro and the HUD controls
  line say it; the autopilot never shifts.

### DRIVING-2: P after stopping usually says "Come to a full stop first", because the van creeps once S is lifted
- **Severity:** minor (design; confusing, and it pushes the trainee straight into DRIVING-1)
- **Where:** every drive at a stop / checkpoint
- **Repro:** stop in the zone with S, let go of S, press P.
- **Expected:** stopped means stopped; P works, or the toast says "hold S (or SPACE) while you press P".
  **Actual:** the automatic creep (1.1 m/s) has the van moving again within a moment, so P answers "Come to a full
  stop first" although the speedometer showed 0. The natural fix a trainee reaches for (press S again and hold)
  selects reverse (DRIVING-1). Nothing on screen ties P to the brake or SPACE; the intro card does not mention SPACE
  at all.
- **Evidence:** `st` after `hold KeyS 1000` then `press KeyP`: `mph:0.3`, P refused.
- **Suspected cause:** `src/scenes/shift/TownDriveScene.js:1056` checks `V.stopped(v)` at the instant of P.
- **Suggested fix:** accept P within ~1 s of the van having been stopped (and then hold it), or make the refusal say
  "Hold S or SPACE, then P". Mention SPACE on the drill's intro card.
- **Status:** fixed — P is accepted for a moment (1 s) after the van was last at a standstill, while the automatic
  creeps; the refusal says "Come to a full stop first (hold S or SPACE, then P)"; the drill intro and the controls
  line explain SPACE ("In D the van creeps forward: hold SPACE (park brake) to wait").

### DRIVING-3: Traffic drives into the van when it is stopped across or at an angle to a lane, and the trainee is charged with the collision
- **Severity:** major (wrong feedback; also briefly traps the gearbox)
- **Where:** drill, first junction east of the depot (seen once so far; the cause is in the code)
- **Repro:** stop the van in or near a junction so it lies across a cross-street lane (I had backed into the east
  crosswalk after DRIVING-1). Wait for a car on the cross street.
- **Expected:** the car stops short of the van (it is an obstacle in its lane), or at least the collision is not the
  van driver's fault. **Actual:** a north-bound car drove into the side of the stationary van and kept pushing it;
  the log shows `-2 Collision with another vehicle at 10 mph` against the trainee. While the car leant on the van
  the van never counted as "stopped", so holding W could not select D (the gear stayed R through three presses).
- **Evidence:** `test/out/review/driving/a07-zone.png` (dark car nosed under the van at the junction); log entry
  `Collision with another vehicle at 10 mph` at 13 s with the van at 0.1 mph.
- **Suspected cause:** `src/scenes/shift/TownDriveScene.js:726-737`: cars test only the van's *body centre* within
  52 px of their line, and a stopped van whose centre is 8+ px "kerbward" is treated as parked at the kerb, so the
  car tries to squeeze past at 60 px/s whatever the van's heading. A van lying across the lane, or whose centre is
  outside 52 px but whose nose/tail is in the lane, is not seen at all.
- **Suggested fix:** test the van's oriented box (the `collide` shape) against the car's swept lane, only use the
  "ease past a parked van" branch when the van is roughly parallel to the lane, and do not charge a collision to the
  van when the van was stationary and the other vehicle was moving into it.
- **Status:** fixed — cars watch every corner and side of the van's body against their lane, not its centre alone, and
  only ease out round a van that is stopped parallel to the kerb; a vehicle driving into the van while the van is
  standing still is not charged to the trainee ("A car ran into you while you were stopped. Never stop across a
  lane.").

### DRIVING-4: "Drove buckled up ✓" is scored at park time, after a "Driving without your seatbelt" penalty
- **Severity:** minor (scoring contradicts itself)
- **Where:** drill and route legs, the check logged by P
- **Repro:** roll out without B, drive >3 mph for 3 s (penalty logged), then press B and park at the checkpoint.
- **Expected:** "Drove buckled up" 0/1 for that leg. **Actual:** the log has both `-3 Driving without your
  seatbelt` and `Drove buckled up 1/1`.
- **Suspected cause:** `src/scenes/shift/TownDriveScene.js:1073` scores `this.buckled` at the moment of parking.
- **Suggested fix:** score it as "no belt violation since the last park".
- **Status:** fixed — "Drove buckled up" on a route leg means no seatbelt violation since the last park (and is a
  safety line now, not efficiency); the drill judges the belt once, over the whole drive.

### DRIVING-5: The painted stop line is inside the crosswalk, so "full stop at the line" parks the van's nose on the crossing
- **Severity:** minor (teaches the wrong stopping position; it also puts the van where the yield rule fires)
- **Where:** every junction in the town (drill, route legs, lab)
- **Repro:** approach any stop sign or red light; stop with the bumper on the white bar the hint refers to
  ("STOP SIGN AHEAD — full stop at the line").
- **Expected:** the stop line sits *before* the crosswalk (about a metre short of it); stopping at it leaves the
  crossing clear. **Actual:** the 10 px bar is drawn at R+18 from the junction centre, but the 46 px crosswalk spans
  R+1 to R+47, so the line is in the middle of the zebra stripes and a van stopped at it covers about 1.5 m of the
  crossing. The stop sign stands at the crosswalk's outer edge, level with the far side of it.
- **Evidence:** `test/out/review/driving/b07-lineclip.png` (full-size crop: the bar runs through the stripes).
- **Suspected cause:** `src/scenes/shift/TownDriveScene.js:102-107` (crosswalk at `R + 24`, stop line at `R + 18`);
  `src/core/townart.js:75-87` for the sizes. The rules (`checkRules` `ap.dist < 18`, traffic `line = R + 18 ...`)
  use the same R+18.
- **Suggested fix:** move the stop line (and the rule and AI stopping points with it) to about `R + 58`, outside
  the crosswalk, and the sign just beyond it.
- **Status:** fixed — the stop line is drawn at `OTR.townArt.STOP_LINE` (58 px out, just clear of the crosswalk, which
  spans R+1 to R+47), with the sign or signal level with it; the stop and red-light rules, the traffic's stopping
  point and the autopilot all use the same constant.

### DRIVING-6: Drill hazards spawn wherever the van happens to point, not on the way to the checkpoint: on corners, in junctions, on streets you are not taking, and they pass by themselves
- **Severity:** major (the core of the drill: several hazards were never really met, and one was drawn on the sidewalk)
- **Where:** Road Hazards (m1-driving), hazards 2-6
- **Repro:** park at checkpoint 1, then drive east (away from checkpoint 2, which is a block south). Park at
  checkpoint 2 (205 Maple Ave), then pull away west (checkpoint 3 is behind you, across the street).
- **Expected:** each hazard is staged on the trainee's path to the next checkpoint, in a place where it makes sense
  (a parked car at a kerb mid-block, a ball between parked cars), and it is judged when the trainee meets it.
  **Actual:**
  - A hazard arms the moment the van is 260-900 px *in a straight line* from the next checkpoint and doing 6 mph,
    and spawns 300-560 px straight ahead of the van, whichever way it faces. Both times it spawned on a road I was
    using to drive *away* from the checkpoint.
  - The "car door" hazard's parked car appeared on the sidewalk corner of a junction, under a traffic signal (the
    signal is drawn on top of it), with its door swinging into the crosswalk; the "DOOR!" warning fired while I
    was stopped at the red light behind it.
  - "A ball bounces out between the parked cars": there are no parked cars; the ball and child came out at a
    junction crosswalk while I was waiting at the stop sign, and I never noticed them.
  - Both hazards scored full marks (`ball ok`, `door ok`, +4 and +3) because I happened to be stopped at a stop
    sign / red light when they ran, or they expired while I waited (`hz.minMph < 9` → "You slowed right down for it").
  - The same on the later legs: the standing water was laid across a stop-sign junction; the "distracted
    pedestrian" hazard painted a second, skewed zebra crossing *inside* a junction box
    (`test/out/review/driving/c15-xwalk.png`); the school bus appeared parked in the middle of a signalled junction,
    straddling its crosswalk, in the oncoming lane (`c18-bus.png`, `c19-busclip.png`).
- **Evidence:** `test/out/review/driving/c03-door.png`, `c04-doorclip.png` (parked car on the corner under the
  signal); `results: [{phone ok},{ball ok},{door ok}]` with no hazard ever in my lane.
- **Suspected cause:** `src/scenes/m1/DrivingScene.js:173-194` (`armHazards`: straight-line distance, `this.ahead(dist)`
  with only `T.onRoad` as a check), `:138-141` (expiry passes if the van was ever under 9 mph), `spawn_door`
  `:311-313` (kerb offset from a point that can be in a junction).
- **Suggested fix:** stage each hazard on a mid-block point of the planned route to the checkpoint (the lane the
  van will use, at least ~150 px from any junction), arm it when the van enters that block heading the right way,
  and judge it only on the approach to it (an expiry while stopped elsewhere should not count as a pass). Fix the
  ball's warning text or add the parked cars it mentions.
- **Status:** fixed (decision) — a drill hazard arms only while the van drives along the checkpoint's street towards
  it, clear of the junctions, and spawns in its lane on straight road at least R+150 px from any junction and before
  the bay, at a distance the van can stop in (200 px plus 1.25 s of travel). A hazard that expires before the van has
  come near it is not judged: it comes up again further on. The ball's warning no longer mentions parked cars that are
  not there.

### DRIVING-7: The drill's checkpoints zigzag across one street, so every leg starts facing the wrong way
- **Severity:** design (makes the drill a series of turn-arounds and sets up DRIVING-6)
- **Where:** Road Hazards, checkpoints 2-6 (seed 7)
- **Repro:** play the drill; after each P, look at where the next pin is.
- **Expected:** a loop that carries on in the direction you are going, with turns at junctions.
  **Actual:** the route is 204 Harbor St (south kerb, eastbound) → 205 Maple Ave (north kerb, westbound) → 212 Maple
  (south, eastbound, 370 px east) → 305 Maple (north, westbound) → 312 Maple (south) → 313 Birch Ln (north). After
  each park the next bay is across the street and behind you. The legal way (what the autopilot does) is round the
  block, 1-1.5 km for a checkpoint 20-30 m away; what a trainee actually does is a U-turn, which the van cannot make
  in a 10.5 m street (6 m radius), so it becomes a three-point turn with backing (a -3 violation unless they know to
  press G first) and a kerb strike. Nothing tells the trainee which way the bay faces or that driving round the block
  is expected, and the par (360 s) assumes the long way.
- **Evidence:** route dump `[["204 Harbor St",1586,491,"S"],["205 Maple Ave",1586,1249,"N"],["212 Maple Ave",1953,1391,"S"],["305 Maple Ave",2486,1249,"N"],["312 Maple Ave",2853,1391,"S"],["313 Birch Ln",2853,2149,"N"]]`;
  my three-point turn at 305 Maple: `test/out/review/driving/c09-uturn.png`, `c11-goal.png`.
- **Suspected cause:** `src/scenes/m1/DrivingScene.js:46-64` (`pickRoute`: nearest lot by straight-line distance,
  either side of the street).
- **Suggested fix:** pick checkpoints on the kerb on the right-hand side of the direction of travel (lot.side matching
  the heading the van will arrive with), a block or two apart, forming a loop; show an arrow on the minimap for
  the direction to approach from.
- **Status:** fixed (decision) — the drill's six checkpoints are a clockwise loop: east along the station's street on
  its right-hand (south) kerb, one block apart, then west along the next street on its north kerb; each is the plot
  furthest along its block, so every leg starts facing the next bay with a clear stretch after its junction, and the
  corners are right turns. The minimap shows an arrow at the active stop for the way to face.

### DRIVING-8: The drill's results screen does not say which hazards you passed, and its takeaways skip the worst mistakes
- **Severity:** major (the drill's lesson is lost at the end)
- **Where:** Road Hazards → ResultsScene
- **Repro:** finish the drill after (in this order) a rolling stop, a kerb strike, wrong side, a red light, a
  pedestrian hit, backing without G.O.A.L. and a failed "distracted pedestrian".
- **Expected:** the six hazards listed pass/fail with their one-line lesson, and the takeaways led by the most
  serious error (hitting a pedestrian, the red light). **Actual:** "SCORE 0", Safety 0 stars, Efficiency 3 stars,
  "+3 new career stars", and three takeaways that are simply the first three lessons in time order (rolling stop,
  kerb, wrong side). The pedestrian hit, the red light, the backing and the failed crossing hazard are not mentioned.
  The hazard results only ever appeared as a 2-second line at the bottom of the screen while driving.
  "Drove buckled up" is logged seven times (once per park and once at the end), each scored on the belt state at
  that moment (see DRIVING-4).
- **Evidence:** `test/out/review/driving/c25-results.png`; result checks dump (26 check rows, `Distracted pedestrian 0/4`).
- **Suspected cause:** `src/scenes/m1/DrivingScene.js:546-548` (`failed ... .slice(0, 3)` in log order);
  `src/scenes/ResultsScene.js:82`.
- **Suggested fix:** sort lessons by severity/points lost; add a six-row hazard card (pass/fail, what you did) to the
  results; log the belt once.
- **Status:** fixed — the results card lists all six hazards passed or failed ("Hazards: ✓ Your handheld buzzes · ✗
  Car door …") and uses WP1's ranked takeaways, so a pedestrian hit or a red light leads; the belt is logged once.

### DRIVING-9: The last leg's warning "The flag is behind you now" is wrong: there is no flag and the checkpoint is a block away
- **Severity:** minor (content)
- **Where:** Road Hazards, on parking at checkpoint 5
- **Repro:** park at 312 Maple Ave.
- **Expected:** a warning that fits: the last checkpoint is 313 Birch Ln, one block south, reached forwards.
  **Actual:** toast "The flag is behind you now. If you have to back up, get out and look first." The marker is an
  orange pin (not a flag), it is 38 m away round a corner, and nothing on this leg needs backing. It reads as a
  leftover from a staged "back up to the last stop" exercise that the route no longer sets up.
- **Evidence:** `test/out/review/driving/c17-cp5.png`.
- **Suspected cause:** `data/m1_driving.js` `backing.warn`, shown by `src/scenes/m1/DrivingScene.js:510`.
- **Suggested fix:** either stage the last checkpoint so it really needs a short reverse (and judge G.O.A.L. there),
  or change the text to a general reminder.
- **Status:** fixed — the last leg's warning is a general reminder: "Last leg. If you ever have to back up, stop and
  get out and look first (G)."

### DRIVING-10: Parking accepts the van out in the traffic lane, 2.5 m from the kerb, beside the centre line; what "parked" means is never explained
- **Severity:** minor (variant of ROUTEDAY-7, the other direction)
- **Where:** drill checkpoints (and route stops: same `tryPark`)
- **Repro:** stop with the van's body centre ~30 px on the house's side of the centre line (the van's outer side is
  on the centre line), a few degrees off straight, in or next to the zone; hold SPACE, P.
- **Expected:** "Pull in to the kerb" (the toast's own words), as for a van on the wrong half. **Actual:** accepted
  with 1/2: `Parked at 313 Birch Ln (2.5 m from the kerb)` and the drill ends. At checkpoint 1 a van whose tail was
  in the junction crosswalk was accepted the same way (`1.4 m from the kerb`). Beyond "pull in to the kerb, stop,
  then P" nothing says what earns 2/2 (within 1.2 m, parallel within ~8°, facing with traffic), and the 1/2 lines
  are only visible in the results log.
- **Evidence:** `test/out/review/driving/c24-final.png` (van angled across the lane, next to the centre line) and the
  results dump.
- **Suspected cause:** `src/scenes/shift/TownDriveScene.js:1060` (`fromCentre < 20` is the only inner limit, 1 m from
  the centre line).
- **Suggested fix:** require `gapM < ~1.5 m` and all four wheels inside the drawn bay; say "Pull in closer to the
  kerb (2.5 m out)" instead of accepting; put a one-line "neat park = close, straight, with traffic" on the intro.
- **Status:** fixed — P requires the van on the road (no corner past the kerb: "You're up on the kerb…"), within 1.5 m
  of the kerb ("Pull in closer to the kerb (8 ft out)"), straight, and wholly inside the marked zone, which is now
  drawn exactly where parking is accepted and never reaches a crosswalk (`TownDriveScene.parkBay`); the intro card
  says what a neat park is.

### DRIVING-11: Pedestrians step off the kerb on a timer with no regard for the van or the lights, and "Failed to yield" fires for people who are not in the van's path
- **Severity:** major (unavoidable and false penalties on the most serious rule; route days share it)
- **Where:** every drive; `stepPeds`
- **Repro:** (a) drive east from the drill's start through the first stop-sign junction at ~15 mph: `-3 Failed to
  yield to a pedestrian` although the only pedestrian was on the *cross street's* crosswalk, 77 px to the side of the
  van, walking the same way (ped at (1212,549), van body y 446-498). Reproduced in the lab: pulling away from the
  start towards the first junction logged `yield` for a pedestrian on the same cross-street crosswalk (1354,549),
  lat 76 px, never in the van's lane (`d09-yield2.png`). (b) In the
  lab, driving straight in my own lane at the limit, and during autopilot legs of the drill, people walked out in
  front of the van: two `You hit a pedestrian` and six `Failed to yield` in two drives.
- **Expected:** people wait at the kerb when a vehicle is too close to stop (and cross with the walk phase at
  signals); the yield rule only fires for a person in, or about to enter, the van's swept path.
  **Actual:** a pedestrian starts crossing the moment its timer runs out (`p.t <= 0`), whatever is coming; at
  25 mph the van needs ~14 m to stop and the walker reaches the lane in ~1.6 s, so some hits cannot be avoided.
  The yield test is a box around the van, `|fd| < hl + 110` and `|lat| < hw + 90` (about 8.8 m by 5.8 m), so a person
  beside the van, behind its front axle, or on the far crosswalk of the cross street counts, and it fires on a green
  light for someone crossing against it.
- **Evidence:** drill log `-3 Failed to yield to a pedestrian` at 6 s (`test/out/review/driving/a04-runstop.png`,
  the pedestrian is the dot at the lower-left crosswalk); `c06-yield.png` (second case, pedestrian crossing against
  my green); lab `viol: {"yield":3, "hitped":1}` after one straight run.
- **Suspected cause:** `src/scenes/shift/TownDriveScene.js:838` (crossing starts unconditionally) and `:846-850` (the
  yield box). AI cars already wait for crossing pedestrians; the pedestrians never wait for anything.
- **Suggested fix:** only start a crossing when no vehicle (van included) is within its stopping distance of that
  crosswalk, and tie crossings to the walk phase at lights; make the yield test "pedestrian inside the crosswalk the
  van is entering, ahead of the front axle, at > 3 mph".
- **Status:** fixed — pedestrians step off only when it is safe: at lights while the street they cross has a red, and
  never in front of a van too close to stop (1 s reaction, 5 m/s² braking); "Failed to yield" only counts someone in
  the van's own path just ahead of it, moving forward at more than 3 mph.

### DRIVING-12: Small HUD and art issues on the drive
- **Severity:** polish
- **Where:** all drives
- **Items:**
  - The controls line (13 px, 70 % white, no backing) sits straight on the map and is hard to read over sidewalks,
    crosswalks and the white van (`test/out/review/driving/d08-hud.png`). The drill intro card does not mention
    SPACE (park brake) at all, and nothing mentions that TAB is the handheld (it is the drill's first trap, fine,
    but the route-day controls line never lists it either).
  - The minimap panel is translucent: stop signs, crosswalk stripes and roofs show through it and make it noisy
    (`b04-minimap.png`). It shows the next checkpoint as a dot but not which kerb or which way to face (see DRIVING-7).
  - G.O.A.L. shows the same thing twice at once: toast "G.O.A.L. — walking round the van to look…" and hint
    "G.O.A.L. — looking all round the van…" (`c11-goal.png`); nothing is drawn (no courier walking round).
  - Signs and signal posts are not obstacles: the van drives through them and the sign is drawn on top of the van
    (`b12-rturn2.png`, turning right too early at a stop sign).
  - After a stop that crossed the line, the red toast "Rolled through a stop sign" and the green hint "Stopped —
    clear to go" (and a green-tinted sign) show together.
  - The school bus art is squashed to 55 % of its width and reads as a thin yellow tube (`c19-busclip.png`).
- **Status:** fixed — the controls line sits on a dark strip in full white and lists R and TAB; the minimap panel is
  opaque; G.O.A.L. shows one message (the hint), not a toast as well; after a rolling stop no green "Stopped — clear
  to go" appears beside the red toast; the school bus is drawn at its real width (the body was scaled to 1.65 m). Not
  changed: signs and signal posts are not solid; they stand on the sidewalk, and driving onto it is already a kerb
  violation.

### DRIVING-13: School zone: its signs are tiny, on the driver's left and 10 m inside the zone, and nothing announces it
- **Severity:** minor
- **Where:** the school zone (lab: Birch Ln between the first two avenues; `T.spec.schoolZone`)
- **Repro:** drive into the zone from either end and watch the HUD.
- **Expected:** a clear sign on the right-hand kerb before the zone starts, and a hint "School zone — 15 mph" as for
  stop signs and lights. **Actual:** the limit plate on the HUD silently changes 25 → 15 the moment the van's centre
  passes the junction centre. The two "SCH 15" diamonds are ~26 px (`test/out/review/driving/d11-schoolsign.png`),
  and each is 200 px *inside* the zone on the far (left-hand) side for the traffic entering at that end
  (`d10-school.png`). The tolerance is the same +5 mph as elsewhere, so 20 mph in a 15 is never flagged
  (I drove 22 mph through it before anything was said).
- **Suspected cause:** `src/scenes/shift/TownDriveScene.js:118-121` (sign positions: `vx[from] + 200, y - R - 62` and
  `vx[to] - 200, y + R + 62`), `:911` (`mph > limit + 5`), `src/core/town.js:111-115`.
- **Suggested fix:** put a full-size sign on each entry's right-hand kerb before the junction, add an approach hint,
  and use a +2 mph tolerance in school zones.
- **Status:** fixed — a school zone is announced ahead ("SCHOOL ZONE AHEAD — 15 mph"), its signs are full size on the
  right-hand kerb of each way in, before the junction where it starts, and the tolerance in it is 2 mph (5 elsewhere).

### DRIVING-14: Handling notes (design, measured by hand)
- **Severity:** design
- **Where:** the van model, all drives
- **Observations:**
  - Acceleration is realistic and slow (0 → 6 mph in 1.6 s, 0 → 25 in ~8 s); it feels heavy but fair, and the
    look-ahead camera shows ~36 m ahead at 28 mph (`d02-fast.png`). Braking is good (13 mph → 0 in ~1.5 s).
  - Steering taps do very little: a 350-450 ms tap at 10-15 mph turns the van 4-8° and the wheel is back at centre
    ~0.2 s after release (centreRate 2.2/s), so a lane change or a kerb-side correction takes several deliberate
    holds, and I repeatedly ended up straddling the centre line after a turn (`b13`/`b14`, the wrong-side ticket).
    Winding the wheel at a standstill and then pressing W unwinds it as soon as the van rolls; you must hold W and
    A/D together (natural enough, but worth one line on the intro card).
  - A right turn taken at full lock from the stop line clips the corner kerb with the rear wheels (a -2 kerb
    violation): correct physics and a good lesson, but the trainee is told "Swing wider" only after the fact; the
    drill never says that a step van must pull forward before turning.
  - Full lock at 33 mph washes the front out (understeer) into the corner and a house (`d03-spin-4.png`); it never
    spins on a dry road, which is right.
  - In D with no pedal the van creeps at ~2.5 mph. In real time a trainee reading a toast at a stop sign rolls over
    the line (that is how I got my first "Rolled through a stop sign"). Realistic, but not mentioned anywhere; with
    DRIVING-1 the only safe way to hold still is SPACE, which the intro card does not mention.
- **Suggested fix:** slightly slower self-centring for small wheel angles (so taps hold a little), and a controls
  card line: "hold A/D with W to turn · the van creeps in D: hold SPACE to wait · pull forward before right turns".
- **Status:** fixed (decision) — small wheel angles self-centre at half speed, so a short tap holds a little; the
  intro card now says to hold A/D with W to turn, that the van creeps in D (hold SPACE to wait) and to pull forward
  before a right turn. The rest (acceleration, braking, understeer at full lock, no spin on dry roads) is realistic
  and stays.

## Revisit

- DRIVING-3 (traffic into a stationary van) was seen once. A second attempt in the lab (van stopped at 45° across
  an eastbound lane for 30 s) drew no traffic. Stage it on a busier street, and also try a car coming up behind a
  van that has stopped at an angle.
- Water hazard judged at speed: I reached it at 14.9 mph (passed as "already slow enough"). Try hitting it at
  25 mph and braking or steering hard, to check that grip really drops and that the fail matches the physics.
- Rain and snow handling on real keys (full lock at 25 mph in the rain; snow is not reachable from the lab or the
  drill); the lab has no weather switch.
- Door hazard: drive into the opening door and past it at speed (only the expiry pass was seen); ball hazard met
  head-on at 25 mph.
- Backing into a car or a building (the reverse governor is 6 mph); the camera's look-ahead in reverse.
- Route-day town driving: I played the drill and the lab only. The shared rules and HUD are covered above, but the
  route-day specific parts (stop hand-off, "STOP n OF m", the rain-day headlight prompt, ROUTEDAY-7/9/10/16) were
  left to the route-day review.
- TAB (handheld) while moving in a route leg, and while stopped at a red light (the lesson says "not at red
  lights", but the rule only fires above 2 mph).
- The 404s in the page log on the lab (three resources not found at load); not investigated.

## Summary

Played: Road Hazards twice (a careless start without the belt, rolling stop signs, a red light, wrong side, kerb
strikes, a three-point turn with and without G.O.A.L., reverse by accident, all six hazards, crooked and far-out
parking, the results), turn-based for precision and in real time for the gearbox and creep; the free-drive lab
(top speed, speeding, full lock at 33 mph, a house, pause with a held key, the school zone). The test autopilot
drove three drill legs and two lab legs between my manual sections.

The ten findings that matter most, in order:

1. **DRIVING-1** (major): pressing S again just after a stop selects reverse, so the "brake" backs the van; hit four
   times by hand, in real time, and by the autopilot.
2. **DRIVING-6** (major): drill hazards spawn wherever the van points once it is near the checkpoint: a parked car
   on a sidewalk corner under a signal, a school bus and a zebra crossing inside junctions, hazards on streets you are
   driving away on, and they pass by themselves while you wait at a stop sign.
3. **DRIVING-11** (major): pedestrians step out whatever is coming, and "Failed to yield" fires for a person on the
   cross street's crosswalk beside the van (twice, same geometry).
4. **DRIVING-3** (major, seen once): traffic squeezes into a van stopped at an angle and the trainee is charged
   with the collision; while the car leans on the van the gear cannot be changed.
5. **DRIVING-8** (major): the drill results do not list the hazards and the takeaways are the first three mistakes
   in time order (a pedestrian hit and a red light were left out); "+3 career stars" on a score of 0.
6. **DRIVING-7** (design): the checkpoints zigzag across one street, so every leg starts facing away from the next
   bay and the natural move is a U-turn the van cannot make.
7. **DRIVING-5** (minor): the stop line is painted inside the crosswalk, so stopping "at the line" blocks the
   crossing.
8. **DRIVING-2** (minor): P after stopping fails ("Come to a full stop first") because of the creep, and the natural
   fix leads into DRIVING-1; SPACE is never taught.
9. **DRIVING-10** (minor): parking accepts a van 2.5 m out, beside the centre line (the inward twin of ROUTEDAY-7).
10. **DRIVING-13** (minor): the school zone is announced only by the HUD digit changing; its signs are tiny, on the
    left and inside the zone.

Also recorded: the belt check scored at park time (4), the "flag is behind you" text (9), HUD and art polish:
the controls line, translucent minimap, doubled G.O.A.L. message, signs you drive through, the squashed bus (12),
and handling notes with measured numbers (14).

Not covered: see the Revisit list (the route-day drive itself, rain/snow handling at speed, the water, door and ball
hazards met at speed, backing into objects).
