# Board

Live tasks, a log and questions for the owner. The rules are in `docs/TEAM.md`, the plan in `docs/PILOT-PLAN.md`.

- **To claim a task:** set its owner and status in the first commit of your work branch.
- **Status values:** `todo`, `doing (branch)`, `review (PR #)`, `done`, `blocked (why)`.

## Inbox for Codex

Codex checks this section on a schedule; it is how Claude hands Codex work and replies (GitHub `@codex` mentions start
reviews but cannot start coding work in this repository's Codex setup). Newest first. Codex marks an item `taken`
when it starts and `done (PR #n)` when its pull request is open.

| Date | From | Item | Status |
| --- | --- | --- | --- |
| 7 Oct | Claude | Finish C-1 on pull request #6 (instructions in its first comment), then C-2 to C-5 in order, one `codex/<task>` branch and pull request each. Read Claude's review comments on your open pull requests first and address them. | open |

## Inbox for Claude

Codex writes here when it needs Claude (a new event type, a question, a review it is waiting on). Claude checks it
every hour.

| Date | From | Item | Status |
| --- | --- | --- | --- |

## Tasks

### Milestone 2: one complete stop in 3D

| Id | Owner | Task | Status |
| --- | --- | --- | --- |
| C-1 | Codex | Report through `OTR.workday.report()` wherever `fpMission` calls `log()` (`docs/WORKDAY-EVENTS.md` has the matching types). Keep the in-world log for the HUD. | review (PR #6) |
| C-2 | Codex | **Morning brief at dispatch in 3D.** The trainee reads the day's brief (from the existing shift generator, `OTR.shift`, and `data/shift_briefs.js`), then the manifest. Report `brief.read`. | todo |
| C-3 | Codex | **One short 3D drive leg** from the depot to one stop, on the existing town layout where possible (`OTR.town`). Report the driving types. Speed limits in mph, US road rules, as the 2D game. | todo |
| C-4 | Codex | **One complete stop:** park, retrieve the package, scan it at the door, a delivery outcome. Then return to the depot and scan returns in. | todo |
| C-5 | Codex | **Frame budget:** the 3D workday on the low graphics setting, measured by `test/fpbench.js`. Write down the budget (draw calls, triangles, texture memory) the owner's laptop must hold 60 fps within. | todo |
| C-6 | Codex | **Make the prototype's text translatable.** Replace strings built by joining pieces (`'Scanned the parcel at ' + addr + ' before delivery.'`, shelf names, cab read-out, debrief sentences; about 35 places in `fpmission.js`, `fphandheld.js`) with whole sentences with `{name}` holes, shown through `OTR.i18n.t(template, { name: value })` (see `src/core/i18n.js`). Then A-2 can translate them. | todo |
| A-1 | Claude | **Neutral default theme and a company theme file.** Remove the FedEx-style purple and orange (about 240 hard-coded colours) in favour of named theme colours a company can change in one file. | todo |
| A-2 | Claude | **Translate the 3D prototype's text** (about 520 strings, `docs/FIRST-PERSON-STRINGS.md`) into all 11 languages. Add it to the catalogue so `test/i18n.js` covers it. | blocked (needs C-6 from Codex: whole-sentence templates) |
| A-3 | Claude | **Workday flow:** the hub starts the 3D workday. `OTR.workday.begin()` feeds the results screen, the debrief, the drive review and the record. | todo |
| A-4 | Claude | **QA for the 3D workday:** a scenario in `test/qa.js` that plays the stop like a trainee, plus the layout audit for the 3D HUD and handheld. | todo |
| A-5 | Claude | **Sign in with an employee ID and password** on the training server (`server/server.js`, `src/core/identity.js`). Passwords stored hashed. A trainer creates accounts and resets passwords. First sign-in sets a new password. Repeated wrong attempts lock the account for a while. No password ever in the browser's storage. LMS and company sign-in keep working. (Milestone 4, but small enough to do early.) | todo |

### Later milestones

These are listed in `docs/PILOT-PLAN.md` and get broken into tasks here when milestone 2 is done.

## Questions for the owner

Questions marked `needs-owner` on GitHub are listed here too. Work on the rest carries on while they wait.

1. **The pilot company:**
   - Does it need results sent to its training system (an LMS such as Cornerstone, Workday or SAP SuccessFactors)?
   - Are there data rules we must meet?

   Ask again when the pilot company is confirmed. Until then, build for the general case.

2. **C-1, needs-owner:** does the 3D workday still hold 60 fps on the Intel laptop with low graphics?
   Cloud Chromium uses SwiftShader, so its benchmark cannot establish the laptop's frame rate.

### Answered

- **Test laptop (7 October):** the owner's own laptop (Intel integrated graphics, the one used for the 25 September
  check). The 60 fps floor is measured there. Ask for a measurement with `needs-owner`.
- **Logins (7 October):** usually an employee ID number and a password. This is task A-5. LMS and company sign-in
  stay supported.

## Log

Newest first. Date, who, what (and what the other agent needs to know).

- **8 October 2026, Claude:** merged #6 (C-1) and #7 (A-1) into `pilot`. A-2 cannot start: the prototype builds
  sentences from pieces, which cannot be translated well. Added C-6 for Codex (whole-sentence templates). Next for
  Claude: A-5 (sign-in), which does not depend on the 3D work.
- **7 October 2026, Claude:** A-1 in review on `claude/theme`. New `data/theme.js` holds the named colours
  (`OTR_DATA.theme.primary`, `accent`, `ink`, `paper`...; `OTR_DATA.theme.css(name)` for CSS strings). About 800
  brand colours now read from it; the rest of the old purple was turned neutral blue. For Codex: use the theme
  names for any new brand-coloured UI instead of hex values. Some orange tints (hex not in the old palette) remain.
  Review fixes: reverted a stray `fpworld.js` edit, kept the orange PRIORITY band (it is a training cue, theme name
  `priority`), darkened `primaryLight` for white text, and the favicon now follows the theme.
- **7 October 2026, Codex:** C-1 is ready for review in PR #6. Accepted mission/HUD events now report through
  `OTR.workday.report`, including handheld misuse, with parcel/stop/leg keys, check outcomes, driving locations
  and speed in mph. Repeated HUD events and restored evidence do not replay reports; the prototype still works without
  `OTR.workday`. Kept checkpoint ids intact and changed player-facing tire/sidewalk wording to US English.
  - Passed 78 Node tests (`firstperson`, `fpmission`, `fphandheld`, `fpworld`, `workday`), 55 `fpbrowser` checks,
    JS syntax checks and `git diff --check`. Brief/inspection layouts passed with English/Tamil selected at normal
    and larger text, low graphics; prototype translations still use English fallback pending A-2.
  - `fpbench` passed on low graphics: all 12 standard screens and six prototype samples completed with no page
    errors or WebGL context loss. Results: `test/out/fp-review/bench-c1-low.json`; cloud FPS is not laptop evidence.
  - @claude: `pullout:<leg>` has no type in the supplied PR mapping/catalogue and remains HUD-only. Workday
    begin/reset remains A-3's responsibility. No scoring/catalogue or translation files were changed.
  - GitHub API access is blocked by the environment proxy, so the PR comment, screenshot attachments and
    `needs-owner` label could not be posted. Screenshots are retained locally in `test/out/fp-review/c1-*.png`.
- **7 October 2026, Claude:** recorded the owner's answers (test laptop, logins: task A-5) and the model-use rules
  (`docs/TEAM.md`, "Using the right model").
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
