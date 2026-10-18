# The 3D workday's report contract

The 3D workday (depot, van, street, doorstep) and the rest of the game (results, debrief, records, trainer reports,
translations) meet at one call:

```js
OTR.workday.report('scan.stop', { key: parcel.id, stop: 2 });
OTR.workday.report('drive.stop-line', { key: 'junction-1', ok: false, where: { x, z, mph } });
```

- **The 3D world says what happened, and nothing else.** It never awards points or writes feedback text. It names
  an event type, and the scoring, the line the trainee reads and the lesson all come from
  `data/workday_events.js`.
- **A type counts once per `key`.** Use the parcel id, the stop number or the drive leg, whichever makes "the same
  thing again" mean the same mistake. Reporting every frame is harmless, because repeats are dropped.
- **`ok: false`** marks a check the trainee got wrong. A penalty or bonus type does not use it.
- **`stop`** files the line under that stop in the debrief. Without it, the line goes under the event's phase.
- **`where`** (`{ x, z, mph }`) pins a driving mistake to the drive review map.
- **`stop`** counts from 1, as the trainee sees the stops ("Stop 1" in the debrief).
- **`OTR.workday.begin(log)`** starts a workday and sends its reports to a `ScoreLog` (the same class every other
  scenario uses). Claude's side calls it (through `start`, below). The 3D world calls `report`, and `pause` and
  `finish` at the ends of a day.

Owned by: **Codex** calls `report` from the 3D world; **Claude** owns `src/core/workday.js`,
`data/workday_events.js` and everything that reads the score log.

## Starting and finishing a workday

The hub owns the start, the 3D world says when the day ends, and everything after it (results, debrief, drive
review, record) is Claude's. The 3D world makes two calls besides `report`, and reads one value when it starts.

**1. The hub starts it.** At the hub, "Start workday" calls `OTR.workday.start(hubScene)`: a new workday saved as it
goes (`OTR.save.data.workday.current`), a fresh score log (`begin`), then the scene registered as
`'FirstPersonScene'` with:

```js
{ workday: { resume: false, id } }    // a new day: start a new campaign, discarding any saved one
{ workday: { resume: true,  id } }    // "Resume workday": carry on from the campaign the 3D world saved
```

With this data the scene goes straight to the workday (its campaign), not to its own 3D hub. Without it (opened
with `?lab=firstperson`), it behaves as it does today and its reports go to an unsaved log. The game still opens
on the title screen; the hub offers "Start workday" while `OTR_DATA.config.workday3d` is on (on since the full-length
route, 15 October 2026) and the link does not have `?workday3d=0`. The 2D route day stays, as a link under it.

**2. The trainee leaves mid-day: `OTR.workday.pause(scene)`.** From the 3D pause menu's "Save and return to hub"
and "Main game" (after the 3D world has saved its own checkpoint). The day is kept, not scored, and the hub offers
"Resume workday" and "Abandon this workday" (`OTR.workday.abandon()`, which throws it away unscored).

**3. The day is done: `OTR.workday.finish(scene, summary)`.** When "Finish workday" at Dispatch succeeds, in place
of the 3D world's own debrief. It scores the day from the reports, saves it, and opens the results screen.
`summary` is optional and only describes the day; the score never comes from it:

| Field | What | Used for |
| --- | --- | --- |
| `seconds` | how long the day took in the 3D world (`model.elapsed`) | the record's training time, the results line |
| `stops` | `[{ stop, delivered, address, x, z }]`: each stop, numbered from 1, whether the package was delivered (false for a retained one), its address and where it is | the debrief's stop headings, "2 of 3 stops delivered", the drive review |
| `depot` | `{ x, z }`: where the depot is | the drive review |

`x` and `z` are the 3D world's metres, as in `where`. The drive review draws a plan fitted around the depot, the
stops and the pins; north is up (smaller `z`).

**What happens to the score.**
- Every accepted report is saved with the day as it arrives (its type, key, `ok`, `stop` and `where`), so a reload
  or a closed tab keeps the score. "Resume workday" rebuilds the log from them. The 3D world may report again what
  it reported before the reload: repeats of a type and key are still dropped.
- If the 3D world has no campaign to carry on from (`OTR.fpStore.read().campaign` is empty: its storage was cleared,
  or another computer), the resume starts the day again from the morning, with an empty log, and passes
  `resume: false`.
- `finish` freezes the day: the stars and score are kept as they were, and a report after it goes to a new, unsaved
  log. The day counts as a route day (the hub's day moves on, and its best stars join the route's), is a run on the
  record ("Workday": recent runs, what to work on, critical mistakes, the trainer's view and the printed record), and
  stays as the last workday's debrief, which the hub can open again.
- A SCORM 1.2 LMS keeps only 4096 characters of progress (`cmi.suspend_data`; the game aims for 4000). When the save
  is bigger, `OTR.save.fit` makes it smaller in a fixed order, and stops at the first step that fits: the oldest
  route history; the last workday's lines; the day in progress packed into short tuples (nothing lost but extra place
  detail); the trainee record cut to its ten latest runs; the day in progress cut to what its score needs (per type,
  the keys counted right and wrong: its stops and drive-review places go, and it is marked `summarised`); the rest of
  the record; keys kept only as counts (marked `truncated`: the total stays right, but a report of a dropped key sent
  again would count twice); last, only the career. The JSON is never cut and never over the limit, a reload reads
  every step back to a day with the same score, and the hub says "Score kept; some details too big to save" when a
  day lost detail. SCORM 2004, local and server saves are not limited. `node test/savesize.js` checks every step.
- The saved lines are event types. The debrief and drive review look up each type's line and lesson in
  `data/workday_events.js` when they are shown, and skip a type the catalogue no longer has.

**The screens.** Results (stars by category, the takeaways, "Drive map") → Debrief (every line, phase by phase and
stop by stop, the lesson under each mistake, a map link on each driving mistake) → Back to the station. By
keyboard: TAB (or the arrows) moves the focus ring through the page's map links and buttons, ENTER opens the drive
review on that link's pin; in the drive review the arrows or TAB move between Back and the pins, ENTER shows a pin's
details and ESC goes back, to the same page with the ring on the same link. They are
tested without the 3D world by `test/workdayflow.js`, which plays a good day, a bad day resumed after a reload, an
empty day and an abandoned one through the hub.

## Adding an event type

1. Add it to `data/workday_events.js` in the same pull request that first reports it: kind, category, phase, the
   trainee's line (`label`, plus `fail` for a check) and a `lesson`. Write in US English, the game's language, in
   short plain sentences a new driver understands.
2. `node test/workday.js` checks every entry is complete.
3. The other agent reviews the wording and the points. Claude adds the translations (11 languages) before the
   pilot branch is merged to main.

Do not rename or delete a type that has shipped: saved records refer to it. Mark it unused instead.

## Types so far

| Phase | Types |
| --- | --- |
| brief | `brief.read` |
| pretrip | `inspect.tires`, `inspect.lights`, `depart.uninspected` |
| load | `scan.load`, `load.shelf`, `load.secured`, `load.count`, `load.missort-caught`, `load.missort-missed`, `load.extra-caught`, `load.missing-found`, `load.found-later` (the last files under the stop where it turned up) |
| drive | `drive.belt`, `drive.speed`, `drive.sidewalk`, `drive.wrong-side`, `drive.stop-line`, `drive.hazard-early`, `drive.pedestrian`, `drive.contact`, `drive.handheld`, `drive.following`, `drive.mirrors`, `drive.backing`, `drive.school-bus`, `drive.school-bus-pass`, `drive.siren`, `drive.weather`, `dispatch.update` |
| stop | `scan.stop`, `scan.mismatch-caught`, `deliver.wrong-package`, `deliver.no-recipient`, `deliver.outcome`, `retrieve.checked`, `stop.dog`, `stop.wrong-address`, `stop.age-check`, `stop.difficult`, `stop.hazard` |
| end | `return.scanned` |

These cover what the prototype (`src/core/fpmission.js`) already records with its own `log()`. Its log can stay
for the in-world HUD. Each `log()` call should also call `report()` with the matching type (board task C-1).

### Added for the full day (board task A-6)

The 3D world reports these from the milestone 3 tasks (C-7 to C-11). `ok: false` marks a wrong check; a penalty or
bonus is reported when it happens. Use the key that makes "the same thing again" the same mistake (`parcel.id`, the
stop number, the drive leg or the hazard's id).

| Type | Report it when |
| --- | --- |
| `load.count` | the trainee confirms the load against the manifest (`ok: false` if the count was not checked or was wrong) |
| `load.missort-caught` / `load.missort-missed` | a package for another route is on the shelf: caught while scanning, or loaded anyway |
| `load.extra-caught` | a package not on the manifest is found and set aside |
| `load.missing-found` | a package is missing: reported to dispatch before leaving (`ok: false` if the trainee rolled out without saying) |
| `load.found-later` | a package missed at load-out turns up at a stop (pass `stop`) |
| `drive.following` | a gap check while following traffic (`ok: false` under three seconds); key by the leg |
| `drive.mirrors` | each time the van pulls out from the curb |
| `drive.backing` | each reversing manoeuvre; `ok: false` if the trainee did not get out and look (G.O.A.L.) |
| `drive.school-bus` / `drive.school-bus-pass` | a school bus with flashing lights: stopped for it, or drove past it |
| `drive.siren` | an emergency vehicle behind: pulled over to the right, or did not |
| `drive.weather` | once per leg in rain, storm, snow, heat, fog or ice: speed and gap suited the conditions |
| `dispatch.update` | a dispatch message arrived on the handheld: acted on correctly, or missed |
| `stop.dog` | a dog at the stop: handled safely, or approached |
| `stop.wrong-address` | a label whose address does not match the door: caught, or delivered anyway |
| `stop.age-check` | an age-restricted package: photo ID checked (critical: a skipped check caps service at one star) |
| `stop.difficult` | a difficult customer: handled calmly, or escalated |
| `stop.hazard` | the trainee slipped or tripped at the door |

The points are a first draft, tuned once a whole day can be played.

### Added for the cab, signs, navigation, night and damage (board task A-19, milestones 7 to 9)

Draft contract for the milestone 7 to 9 work package. The 3D world reports these with `OTR.workday.report(type, details)`.
Claude adds them to `data/workday_events.js` (points, categories, critical flags) in A-19 before the Codex tasks that
use them are merged; until then an unknown type is ignored by scoring. `ok: false` is the mistake; use the key that
makes "the same thing again" the same mistake.

Changed meaning (existing types):

| Type | New rule |
| --- | --- |
| `drive.mirrors` | Reported when the van moves off, changes lane or turns. `ok: true` when the player **looked at** the matching physical mirror (the mirror was in view for about 0.4 s) in the 4 seconds before the move. No key press. Key by the manoeuvre. |
| `drive.backing` | Each reversing manoeuvre. `ok: false` on contact while reversing, or reversing faster than 5 mph. The rear camera comes on by itself in reverse, so getting out to look is no longer required (`details.cameraSeconds` says how long it was on screen). |

New types:

| Type | Report it when |
| --- | --- |
| `drive.gear` | the player changes gear at the physical shifter; `ok: false` when changing between D and R while the van moves faster than 2 mph (key by the gear change) |
| `drive.backing-walkaround` | only in scenarios the trainer marks as walk-around required: the player got out and looked before reversing (`ok: false` if not) |
| `drive.signal` | a signal before a turn or lane change (`ok: false` if missing or less than 3 seconds) |
| `drive.sign-stop`, `drive.sign-giveway`, `drive.sign-speed`, `drive.sign-school`, `drive.sign-roadworks` | a road sign applies; one check each (`ok: false` for not stopping, not giving way, exceeding the limit, not slowing in a school zone, ignoring the diversion); key by the sign's id |
| `drive.sign-stop` and `drive.stop-line` | one stop, one report. A junction with a stop sign reports `drive.sign-stop` (keyed by the sign's id) and **not** `drive.stop-line`; `drive.stop-line` stays for a stop line without a sign. Never both for the same stop: the trainee would lose the points twice and see the mistake twice in the debrief. Days and checkpoints saved before signs keep their `drive.stop-line` reports; the replay reads both types as before. |
| `drive.sign-oneway`, `drive.sign-noentry` | driving into a one-way street against the flow, or into a no-entry street; these are penalties (report them only when it happens); no-entry is critical |
| `drive.route` | the player leaves the planned route (wrong turn); one report per leg, `ok: false`. Efficiency only. A reroute followed within 30 s clears it. |
| `drive.lights` | once per leg in dusk, night, fog or heavy rain: headlights on (`ok: false` if off while moving) |
| `drive.cyclist` | a cyclist beside or behind the van when turning: checked the mirror and gave way (`ok: false` if cut in front or hit) |
| `drive.clearance` | a low bridge, overhang or tall-van clearance: `ok: false` for a strike, `ok: true` for stopping or detouring |
| `load.shift` | hard cornering or braking shifted the load (`ok: false`); packages not secured shift more |
| `van.damage-scuff`, `van.damage-dent`, `van.damage-major` | the van takes damage; a penalty by severity (major is critical). Key by `<zone>:<cause>` with the zone one of front, rear, left, right, roof, wheel, mirror. The three severities are separate types because the save keeps only the type and the key. |
| `inspect.damage` | at the pre-trip walkaround: existing damage found and recorded (`ok: true`), or missed. Existing damage is the day's start state and is never blamed on the player. |
| `trip.damage-report` | at the post trip, one check per damage zone the player caused (key = the zone): `ok: true` when recorded with the right zone and a plain description; `ok: false` when not recorded. **Unreported damage the player caused is a critical mistake** (the check is critical, like the school bus; the lesson says why). |
| `trip.damage-false` | a penalty when the player reports damage in a zone that has none (key = the zone) |
| `stop.intercom` | an apartment or gated site with an intercom: right button, right wording, waited for the buzz |
| `stop.reception` | a business: left at reception with a name and a signature, or handed to the right person |
| `stop.locker` | a locker drop: right compartment, scan, photo of the closed door |
| `stop.reattempt` | a failed delivery: card left, retention recorded, and the next attempt booked |
| `dispatch.update` | already exists; now also radio calls (`details.radio: true`) that change the route or add a stop |

Rules for these: nothing is reported twice for the same key; a critical mistake is flagged in the type's definition, not by
the world; the save stays small (`docs/READINESS.md`: 3,596 of 4,096 characters today), so new types carry only the
details above. A-27 owns the save budget.
