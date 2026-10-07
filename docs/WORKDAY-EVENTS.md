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
- **`OTR.workday.begin(log)`** starts a workday and sends its reports to a `ScoreLog` (the same class every other
  scenario uses). Claude's side calls it. The 3D world only calls `report`.

Owned by: **Codex** calls `report` from the 3D world; **Claude** owns `src/core/workday.js`,
`data/workday_events.js` and everything that reads the score log.

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
