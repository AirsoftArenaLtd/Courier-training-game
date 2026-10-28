# Training modules in 3D (milestone 10)

How a 3D scenario plugs into the academy, so a trainee's stars, assessments, certificate and LMS result mean the same
whether they played a module in 3D or in the 2D fallback. Written by Claude before C-38 (Backlog B-12); Codex builds the
runner and the scenes against it, and Claude's A-30 checks it.

## The rule: same ids, same result, different scene

- A 3D scenario **replaces the scene, never the scenario**. It keeps the `id` in `data/modules.js` (`m1-pretrip`,
  `m2-sort`, ...), its `categories`, its `starThresholds` and its brief text. Records are keyed by that id
  (`save.data.scenarios[id]`, `save.data.assess[id]`), so nothing in the save, the record, the certificate, the
  before-and-after report, xAPI or the LMS changes.
- New 3D-only scenarios (the "new" items in C-39 to C-46) get **new ids in the same module**, added to
  `data/modules.js` with a `scene3d` and **no** 2D `scene`. They count towards the module like any other scenario.
  Adding them changes what "every module passed" means, so each new id goes onto the board for Claude first (A-30 adds
  it to the academy's rules and the LMS completion).

## The data entry

Each scenario in `data/modules.js` gains optional fields:

| Field | Meaning |
| --- | --- |
| `scene3d` | the 3D runner's set-piece key (C-38), for example `'pretrip-van'` |
| `scene` | the 2D scene, kept as the fallback; absent for 3D-only scenarios |
| `default3d` | `true` once the 3D version has passed QA (A-31); until then the 2D scene stays the default |

Which version plays: the trainer's per-module choice (A-30: Settings → Trainer, "3D or 2D" per module, default "3D where
ready"), then `default3d`, then whether the PC can run 3D (`OTR.gfx` / WebGL). A 3D-only scenario on a PC without WebGL
is shown as "needs 3D" and does not block the module (it is left out of that trainee's completion count, and the record
says why).

Built (A-30): `OTR.flow.startScenario` asks `OTR.fpScenario.resolve` with `OTR.academy.presentationOf(id)` (the rule
`presentation: { m1: 'auto' | '3d' | '2d', ... }`, missing means `'auto'`) and `OTR.registry.can3d()`. Completion, the
hub's count and the LMS use `OTR.registry.counted()`: every scenario but the `optional` ones and, on a PC without WebGL,
the 3D-only ones (the trainer's view counts those). `test/scenario3d.js` checks it.

## Finishing a 3D scenario

The 3D runner ends a scenario exactly as a 2D scene does: `OTR.flow.complete(scene, scenarioId, result)` with

```
result = {
  score,                     // 0 and up, as the 2D scene of the same id scores (keep the same scale so best scores compare)
  ratios: { safety, efficiency, service },   // 0..1 for each category the scenario tests
  log,                       // an OTR.ScoreLog (preferred): checks, penalties and bonuses with their lessons and criticals
  lessons,                   // or the scene's own lesson texts when it keeps no log
  untested,                  // categories this run could not test (they score 0 stars and do not fail an assessment)
  stats                      // free-form numbers for the results screen
}
```

Using a `ScoreLog` gives the results screen its takeaways, critical mistakes (a critical caps its category at one star)
and the assessment verdict for free. Lesson and label texts are whole English sentences (Claude translates them).

## Assessment

`OTR.academy.assessing === id` during an assessment run; the 3D runner must then hide coaching (live hints, checklists,
answer feedback) exactly as `OTR.academy.coaching()` says, and quitting counts as an attempt (`OTR.academy.abandon()`).
The pass rule does not change: every tested category at the trainer's pass mark and no critical mistake.

## Checks

- A-30: a Node test that every scenario with `scene3d` keeps its id, categories and thresholds, and that a 3D result and
  a 2D result of the same id land in the same record.
- A-31: a QA flow per 3D scenario (`test/paths/`), played with real keys, in English and Tamil at larger text, before
  `default3d` is set.

## Per module (B-135, for C-39 to C-46)

The existing scenarios keep their ids and categories and only gain `scene3d`. The new 3D-only scenarios below are the
ids Codex should add (with `scene3d` and no `scene`). Each scores through an `OTR.ScoreLog`. Where it tests what the
3D workday already reports, it uses the **same label, lesson and critical** as that report type in
`data/workday_events.js`, so a mistake reads the same in a module and in a workday. The workday's report types are not
sent from a module run: the module's ScoreLog is its record.

| Module (task) | Existing ids, now in 3D | New 3D-only ids (title, categories) | What the new ones score (the workday's wording where it exists) |
| --- | --- | --- | --- |
| m1 Route & Driving (C-39) | m1-pretrip, m1-route, m1-driving, m1-spot | `m1-junctions` Junctions and Lights [safety, efficiency]; `m1-school` School Zone [safety]; `m1-night` Night Run [safety, efficiency] | junctions: `drive.sign-stop`, `drive.sign-giveway`, `drive.red-light` (critical), `drive.signal`, `drive.mirrors`. School: `drive.sign-school`, `drive.school-bus` and `drive.school-bus-pass` (critical), `drive.pedestrian` (critical). Night: `inspect.lights`, `drive.lights`, `drive.following` |
| m2 Package Handling (C-40) | m2-sort, m2-lift, m2-labels | `m2-heavy` Heavy and Awkward [safety, efficiency] | the lift checks of m2-lift (bend the knees, load close, no twisting), plus asking for a team lift or a trolley over the weight limit; lifting over the limit alone is critical |
| m3 Customer Interaction (C-41) | m3-missing, m3-signature, m3-twostops, m3-doorsteps | `m3-intercom` Apartment Intercom, `m3-reception` Business Reception, `m3-locker` Parcel Locker [service, safety, efficiency] | `stop.intercom`, `stop.reception`, `stop.locker` (complete and right), `scan.stop`, `deliver.outcome`; a signature parcel left without one is critical, as in m3-signature |
| m4 Problem Solving (C-42) | m4-address, m4-recover, m4-damaged, m4-storm | `m4-closure` Road Closed [safety, efficiency]; `m4-blocked` Blocked Drive [safety, service] | closure: `drive.route` (follow the reroute), `drive.contact` with the closure; blocked: park legally (`drive.sidewalk`), `stop.hazard`, a safe exception if the door cannot be reached |
| m5 Scanner & Exceptions (C-43) | m5-pod, m5-exceptions, m5-adult | none | as the 2D scenes: the photo, the exception codes and the ID check (`stop.age-check`; a parcel handed over without a valid ID is critical) on the real handheld |
| m6 Loading the Truck (C-44) | m6-load, m6-find | none | as the 2D scenes, with `load.shelf`, `load.secured` and `load.count` wording for loading by stop order and weight |
| m7 Pickups & Paperwork (C-45) | m7-business, m7-intl, m7-dg | none | as the 2D scenes, at a real counter; accepting undeclared dangerous goods stays critical |
| m8 Safety & Wellness (C-46) | m8-steps, m8-dog, m8-heat, m8-incident | `m8-ice` Slips on Ice [safety]; `m8-reverse` Reversing Near-Miss [safety]; `m8-fatigue` Tired at the Wheel [safety, efficiency] | ice: walking speed and footing on ice (`drive.weather` wording for the drive to it); reverse: `drive.backing`, `drive.backing-walkaround`, `drive.mirrors`; a contact while reversing is critical (`drive.contact`). Fatigue: taking the break when it is due, as the route day's break check |

**New scenarios and completion.** The 13 new ids are recorded like any scenario (stars, attempts, the record, xAPI).
Whether they also count towards "every module passed" (the certificate and the LMS completion) is owner question 11.
Until it is answered they are **optional**: A-30 adds them with `optional: true`, which the academy's completion rule
skips. It is one flag per scenario to change.

**New text.** Every scenario title, brief, label and lesson is a whole English sentence (Claude translates them at
review), and a label that matches a workday report uses that report's text exactly, so it is translated once.
