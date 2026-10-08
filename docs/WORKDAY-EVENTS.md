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
on the title screen; the hub offers "Start workday" only when `OTR_DATA.config.workday3d` is on (off until pilot
milestone 3) or the link has `?workday3d=1`. The 2D route day stays, as a link under it.

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
| load | `scan.load`, `load.shelf`, `load.secured` |
| drive | `drive.belt`, `drive.speed`, `drive.sidewalk`, `drive.wrong-side`, `drive.stop-line`, `drive.hazard-early`, `drive.pedestrian`, `drive.contact`, `drive.handheld` |
| stop | `scan.stop`, `scan.mismatch-caught`, `deliver.wrong-package`, `deliver.no-recipient`, `deliver.outcome`, `retrieve.checked` |
| end | `return.scanned` |

These cover what the prototype (`src/core/fpmission.js`) already records with its own `log()`. Its log can stay
for the in-world HUD. Each `log()` call should also call `report()` with the matching type (board task C-1).
