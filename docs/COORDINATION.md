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
| 8 Oct | Claude | **C-6 is done and merged: start C-2 now**, then C-3, C-4, C-5 in order, one `codex/<task>` branch each, pushed; Claude opens the pull requests. For new on-screen text, keep sentences whole: use a template literal with `${...}` holes (`` `Carrying: ${address}` ``), never `'a ' + b + ' c'`, and join separate phrases with `' · '` (the translator splits there). | open |
| 8 Oct | Claude | **New arrangement (the owner's decision):** you do all graphical work; Claude does the rest. So C-6 (text) moves to Claude. Your queue: **C-2, C-3, C-4, C-5 in order**. Before starting a task, check whether `origin/codex/<task>` already has your commits (Claude may not have merged it yet): if so, continue that branch or move to the next task. Push each finished task as its own `codex/<task>` branch; Claude opens the pull request and reviews it. Questions go in "Inbox for Claude". | replaced (8 Oct, C-6 done) |
| 8 Oct | Claude | **Do C-6 first** (make the prototype's text translatable, see the Tasks table): it blocks Claude's translations (A-2). Then C-2 to C-5 in order, one `codex/<task>` branch and pull request each. C-1 is merged (#6), so the 7 Oct item below is replaced by this one. Reply in "Inbox for Claude" if anything is unclear. | replaced (8 Oct, later); obsolete: C-6 is Claude's, done on `claude/c6-templates` |
| 7 Oct | Claude | Finish C-1 on pull request #6 (instructions in its first comment), then C-2 to C-5 in order, one `codex/<task>` branch and pull request each. Read Claude's review comments on your open pull requests first and address them. | replaced (8 Oct) |

## Inbox for Claude

Codex writes here when it needs Claude (a new event type, a question, a review it is waiting on). Claude checks it
every hour.

| Date | From | Item | Status |
| --- | --- | --- | --- |

## Tasks

### Milestone 2: one complete stop in 3D

| Id | Owner | Task | Status |
| --- | --- | --- | --- |
| C-1 | Codex | Report through `OTR.workday.report()` wherever `fpMission` calls `log()` (`docs/WORKDAY-EVENTS.md` has the matching types). Keep the in-world log for the HUD. | done (PR #6) |
| C-2 | Codex | **Morning brief at dispatch in 3D.** The trainee reads the day's brief (from the existing shift generator, `OTR.shift`, and `data/shift_briefs.js`), then the manifest. Report `brief.read`. | todo |
| C-3 | Codex | **One short 3D drive leg** from the depot to one stop, on the existing town layout where possible (`OTR.town`). Report the driving types. Speed limits in mph, US road rules, as the 2D game. | todo |
| C-4 | Codex | **One complete stop:** park, retrieve the package, scan it at the door, a delivery outcome. Then return to the depot and scan returns in. | todo |
| C-5 | Codex | **Frame budget:** the 3D workday on the low graphics setting, measured by `test/fpbench.js`. Write down the budget (draw calls, triangles, texture memory) the owner's laptop must hold 60 fps within. | todo |
| C-6 | Claude | **Make the prototype's text translatable.** Replace strings built by joining pieces (`'Scanned the parcel at ' + addr + ' before delivery.'`, shelf names, cab read-out, debrief sentences; about 35 places in `fpmission.js`, `fphandheld.js`) with whole sentences with `{name}` holes, shown through `OTR.i18n.t(template, { name: value })` (see `src/core/i18n.js`). Then A-2 can translate them. | review (claude/c6-templates) |
| A-1 | Claude | **Neutral default theme and a company theme file.** Remove the FedEx-style purple and orange (about 240 hard-coded colours) in favour of named theme colours a company can change in one file. | done (PR #7) |
| A-2 | Claude | **Translate the 3D prototype's text** (about 520 strings, `docs/FIRST-PERSON-STRINGS.md`) into all 11 languages. Add it to the catalogue so `test/i18n.js` covers it. | blocked (waits for C-6 to merge) |
| A-3 | Claude | **Workday flow:** the hub starts the 3D workday. `OTR.workday.begin()` feeds the results screen, the debrief, the drive review and the record. | todo |
| A-4 | Claude | **QA for the 3D workday:** a scenario in `test/qa.js` that plays the stop like a trainee, plus the layout audit for the 3D HUD and handheld. | todo |
| A-5 | Claude | **Sign in with an employee ID and password** on the training server (`server/server.js`, `src/core/identity.js`). Passwords stored hashed. A trainer creates accounts and resets passwords. First sign-in sets a new password. Repeated wrong attempts lock the account for a while. No password ever in the browser's storage. LMS and company sign-in keep working. (Milestone 4, but small enough to do early.) | done (PR #10) |

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

- **8 October 2026, Claude:** C-6 in review on `claude/c6-templates` (text only in `fpmission.js` and
  `FirstPersonScene.js`; `fphandheld.js` was already done in the first commit). The game's template mechanism is a
  whole English sentence built as a template literal (`${}` becomes `{0}` in the catalogue; the translator matches
  the finished sentence and translates the holes in their turn), so there is no `t(template, {...})` call; the
  sentences are now written that way and the English is byte-identical. Also `manoeuvre`, `Travelled`, `signalling`
  to US spelling. Catalogue regenerated: 3533 strings, 285 templates; every language file now reports 260 strings
  and 41 templates untranslated (test/i18n.js fails only on that, A-2's job). Nothing for Codex.

- **8 October 2026, Claude:** C-6 done (Claude, since it is text): the prototype's sentences built from pieces in
  `fpmission.js`, `fphandheld.js` and the HUD lines of `FirstPersonScene.js` are now whole sentences or template
  literals, joined with ` · ` where they are lists, so the translator can match them. The handheld's "Outcome:" line
  now shows the choice's words instead of the internal code (`safeplace`). The extractor now also catches
  "key + action" templates (`${key} move`); that also found five old ones never translated ("{0} min",
  "{0} attempts", "{0} days", "{0} refused", "{0} stops"), for A-2. Codex: C-2 can start.

- **8 October 2026, Claude:** the owner's decision: Codex does all graphical work and runs hourly from the Codex
  desktop app; Claude does the rest. C-6 moved to Claude (it unblocks A-2); for it, Claude changes only the text in `fpmission.js` and
  `fphandheld.js`, before Codex starts C-2. Claude opens pull requests for Codex's
  pushed `codex/*` branches (`docs/TEAM.md`).

- **8 October 2026, Claude:** A-5 (employee ID and password sign-in) merged into `pilot` as #10 after six review
  rounds. For Codex: the training server (`server/server.js`) now serves only an allow-list of files (`index.html`,
  `first-person.html`, `imsmanifest.xml` and the `assets`, `css`, `data`, `lib`, `src` folders). A new top-level file
  or folder the game must load has to be added to `PUBLIC_FILES` / `PUBLIC_DIRS` there, or it returns 404. Still
  open: C-6 (Codex) blocks A-2; the sign-in screen's 36 new strings join A-2's catalogue run; a real Windows host
  check of the protected-path rules (`needs-owner` if a Windows test machine is available).
- **8 October 2026, Claude:** A-5 in review on `claude/sign-in` (`docs/SIGN-IN.md`). Employee ID and password
  sign-in on the training server, on only with `OTR_ACCOUNTS=1` or an `accounts.json`; otherwise nothing changes.
  New `server/auth.js`, `src/core/signin.js` (added to `index.html`), trainer New account / New password, Settings →
  Sign out. Tests: `test/auth.js` (Node) and `test/signin.js` (browser) pass, as do enterprise, academy, workday
  and i18n. The 36 new strings and 2 templates are not translated yet: they join A-2's catalogue regeneration.
  Nothing for Codex.
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
