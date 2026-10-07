# Board

Live tasks, a log and questions for the owner. The rules are in `docs/TEAM.md`, the plan in `docs/PILOT-PLAN.md`.

- **To claim a task:** set its owner and status in the first commit of your work branch.
- **Status values:** `todo`, `doing (branch)`, `review (PR #)`, `done`, `blocked (why)`.

## Tasks

### Milestone 2: one complete stop in 3D

| Id | Owner | Task | Status |
| --- | --- | --- | --- |
| C-1 | Codex | Report through `OTR.workday.report()` wherever `fpMission` calls `log()` (`docs/WORKDAY-EVENTS.md` has the matching types). Keep the in-world log for the HUD. | todo |
| C-2 | Codex | **Morning brief at dispatch in 3D.** The trainee reads the day's brief (from the existing shift generator, `OTR.shift`, and `data/shift_briefs.js`), then the manifest. Report `brief.read`. | todo |
| C-3 | Codex | **One short 3D drive leg** from the depot to one stop, on the existing town layout where possible (`OTR.town`). Report the driving types. Speed limits in mph, US road rules, as the 2D game. | todo |
| C-4 | Codex | **One complete stop:** park, retrieve the package, scan it at the door, a delivery outcome. Then return to the depot and scan returns in. | todo |
| C-5 | Codex | **Frame budget:** the 3D workday on the low graphics setting, measured by `test/fpbench.js`. Write down the budget (draw calls, triangles, texture memory) the owner's laptop must hold 60 fps within. | todo |
| A-1 | Claude | **Neutral default theme and a company theme file.** Remove the FedEx-style purple and orange (about 240 hard-coded colours) in favour of named theme colours a company can change in one file. | todo |
| A-2 | Claude | **Translate the 3D prototype's text** (about 520 strings, `docs/FIRST-PERSON-STRINGS.md`) into all 11 languages. Add it to the catalogue so `test/i18n.js` covers it. | todo |
| A-3 | Claude | **Workday flow:** the hub starts the 3D workday. `OTR.workday.begin()` feeds the results screen, the debrief, the drive review and the record. | todo |
| A-4 | Claude | **QA for the 3D workday:** a scenario in `test/qa.js` that plays the stop like a trainee, plus the layout audit for the 3D HUD and handheld. | todo |

### Later milestones

These are listed in `docs/PILOT-PLAN.md` and get broken into tasks here when milestone 2 is done.

## Questions for the owner

Questions marked `needs-owner` on GitHub are listed here too. Work on the rest carries on while they wait.

1. **Your test laptop:** which laptop (model, or at least its graphics chip) should the 60 fps floor be measured on?
2. **The pilot company:**
   - What does it need for logging in? Its own accounts, or names typed in?
   - Does it need results sent to its training system (an LMS such as Cornerstone, Workday or SAP SuccessFactors)?
   - Are there data rules we must meet?

## Log

Newest first. Date, who, what (and what the other agent needs to know).

- **7 October 2026, Claude:** setup.
  - The `pilot` branch is `main` plus `codex-first-person`, with "open the prototype by default" reverted. The
    prototype still opens with `?lab=firstperson`.
  - Added `docs/TEAM.md`, `docs/PILOT-PLAN.md`, this board, `AGENTS.md` and `CLAUDE.md`.
  - Added the event contract: `src/core/workday.js`, `data/workday_events.js` and `test/workday.js`, described in
    `docs/WORKDAY-EVENTS.md`.
  - Tests on `pilot`: the prototype's 62 and the event contract's 5 pass; academy, enterprise, routeday and driving
    pass.
  - `test/i18n.js` passes only because the catalogue has not been regenerated yet. Regenerating it adds about 520
    untranslated strings, mostly the prototype's (task A-2).
- **7 October 2026, Codex (earlier, from `docs/FIRST-PERSON-PLAN.md`):** connected first-person prototype: depot,
  scanner, physical cargo, missions, a short drive, three stops.
