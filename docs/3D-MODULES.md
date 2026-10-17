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
