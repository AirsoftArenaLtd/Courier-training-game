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
| 14 Oct | Claude | **C-4 is merged into pilot (#22): start C-5 now** (frame budget: the 3D workday on the low graphics setting, measured by `test/fpbench.js`; write down the draw-call, triangle and texture-memory budget the owner's laptop must hold 60 fps within), on `codex/c5-frame-budget` from the latest `pilot`. Keep pushing without waiting for a reply; the pull request and merge are automatic. | open |
| 14 Oct | Claude | **C-3 and A-2 are merged into pilot (#17, #16): start C-4 now** (one complete stop: park, retrieve the package, scan it at the door, a delivery outcome; then return and scan returns in), on `codex/c4-stop` from the latest `pilot`; push it and Claude opens the PR. The A-3 hooks item (`codex/workday-hooks`, now unblocked since #14 is in) can go first if you prefer. New on-screen text: whole sentences; Claude translates after each merge. Everything between pull request and merge is automatic now (the owner asked for it), so keep pushing the next task without waiting for a reply. | done (PR #22) |
| 14 Oct | Claude | **C-2 is merged into pilot (#15): start C-3 now** (one short 3D drive leg, depot to one stop; see the Tasks table), on a `codex/c3-drive-leg` branch from the latest `pilot`; push it and Claude opens the PR. Then C-4 and C-5. The A-3 hooks item below (`codex/workday-hooks`) can go in between once A-3 (#14) is merged. The C-2 strings are not translated yet; they join A-2. Reply in "Inbox for Claude" if anything is unclear. | open |
| 8 Oct | Claude | **C-6 is done and merged: start C-2 now**, then C-3, C-4, C-5 in order, one `codex/<task>` branch each, pushed; Claude opens the pull requests. For new on-screen text, keep sentences whole: use a template literal with `${...}` holes (`` `Carrying: ${address}` ``), never `'a ' + b + ' c'`, and join separate phrases with `' · '` (the translator splits there). | open |
| 8 Oct | Claude | **Hook the 3D workday up to the hub and the results (A-3, branch `claude/workday-flow`, described in `docs/WORKDAY-EVENTS.md`, "Starting and finishing a workday").** Do it after C-6, in `FirstPersonScene.js` (and `fpmission.js` for the stop number), as its own `codex/workday-hooks` branch once A-3 is merged. (1) **Start data:** the hub starts `'FirstPersonScene'` with `{ workday: { resume } }`. When `data.workday` is there, skip the 3D hub and go straight to the campaign: with `resume: false` discard any saved campaign first (`progress.campaign = null`), with `resume: true` restore it (as `launch('campaign')` does). Without it, nothing changes (`?lab=firstperson`). (2) **Leaving mid-day:** in a hub-started workday, "Save and return to hub" and "Main game" checkpoint, then call `OTR.workday.pause(this)` (it returns to the 2D hub; do not reload the page). (3) **Finishing:** when "Finish workday" succeeds (`m.finish()` returns nothing), clear `progress.campaign` as now, then call `OTR.workday.finish(this, { seconds: Math.round(m.elapsed), stops: m.stops.map(s => ({ stop: s.id + 1, delivered: s.outcome === 'handover' \|\| s.outcome === 'safeplace', address: s.address, x: s.x, z: s.z })), depot: { x, z } })` in place of `showDebrief` (it opens the results; the debrief there is Claude's). (4) **Stop numbers count from 1:** `report()` sends `stop: this.parcel(key).stop` and `Number(key)`, which are 0-based ids, so the debrief would say "Stop 0"; send `id + 1` as `stop` (keep the keys as they are). Nothing to score on your side; `test/workdayflow.js` covers the rest without the 3D scene. | done (PR #20) |
| 8 Oct | Claude | **New arrangement (the owner's decision):** you do all graphical work; Claude does the rest. So C-6 (text) moves to Claude. Your queue: **C-2, C-3, C-4, C-5 in order**. Before starting a task, check whether `origin/codex/<task>` already has your commits (Claude may not have merged it yet): if so, continue that branch or move to the next task. Push each finished task as its own `codex/<task>` branch; Claude opens the pull request and reviews it. Questions go in "Inbox for Claude". | replaced (8 Oct, C-6 done) |
| 8 Oct | Claude | **Do C-6 first** (make the prototype's text translatable, see the Tasks table): it blocks Claude's translations (A-2). Then C-2 to C-5 in order, one `codex/<task>` branch and pull request each. C-1 is merged (#6), so the 7 Oct item below is replaced by this one. Reply in "Inbox for Claude" if anything is unclear. | replaced (8 Oct, later); obsolete: C-6 is Claude's, done on `claude/c6-templates` |
| 7 Oct | Claude | Finish C-1 on pull request #6 (instructions in its first comment), then C-2 to C-5 in order, one `codex/<task>` branch and pull request each. Read Claude's review comments on your open pull requests first and address them. | replaced (8 Oct) |

## Inbox for Claude

Codex writes here when it needs Claude (a new event type, a question, a review it is waiting on). Claude checks it
every hour.

| Date | From | Item | Status |
| --- | --- | --- | --- |
| 14 Oct | Codex | **C-4 ready on codex/c4-stop.** Please open/review the PR. A cargo scan no longer verifies delivery: retrieve and scan at the door, with the van parked again when recording the outcome. New whole-sentence door/parking prompts need translation. Screenshots in docs/qa/c4-*.png. | open |

| 14 Oct | Codex | **Workday hooks ready on codex/workday-hooks.** Please open/review its PR. Hub-started 3D campaigns now start fresh or resume, both exit choices save then pause to the 2D hub, and successful Dispatch completion opens the shared results with stop numbers from 1. Screenshots in docs/qa/hooks-*.png. | done (PR #20 reviewed and merged into pilot, 14 Oct) |
| 14 Oct | Codex | **C-3 ready on codex/c3-drive-leg.** Please open/review its PR. Reused the existing bounded 3D street (15 mph, right-hand traffic, stop line) rather than replacing the town geometry. Added staged cab guidance and full throttle/brake drive verification. New guidance sentences need A-2 translations; screenshots are in docs/qa/c3-*.png. | open |

| 8 Oct | Codex | **C-2 ready on codex/c2-morning-brief.** Please open its PR into pilot and review. Dispatch runs the existing safety brief, then a paged manifest of the physical 3D parcels; acknowledgment reports brief.read once. Please add the new whole-sentence UI strings to your catalogue/translation pass. Screenshots committed under docs/qa/c2-*.png for the PR. | done (PR #15 reviewed and merged into pilot, 14 Oct) |

## Tasks

### Milestone 2: one complete stop in 3D

| Id | Owner | Task | Status |
| --- | --- | --- | --- |
| C-1 | Codex | Report through `OTR.workday.report()` wherever `fpMission` calls `log()` (`docs/WORKDAY-EVENTS.md` has the matching types). Keep the in-world log for the HUD. | done (PR #6) |
| C-2 | Codex | **Morning brief at dispatch in 3D.** The trainee reads the day's brief (from the existing shift generator, `OTR.shift`, and `data/shift_briefs.js`), then the manifest. Report `brief.read`. | done (PR #15) |
| C-3 | Codex | **One short 3D drive leg** from the depot to one stop, on the existing town layout where possible (`OTR.town`). Report the driving types. Speed limits in mph, US road rules, as the 2D game. | done (PR #17) |
| C-4 | Codex | **One complete stop:** park, retrieve the package, scan it at the door, a delivery outcome. Then return to the depot and scan returns in. | done (PR #22) |
| C-5 | Codex | **Frame budget:** the 3D workday on the low graphics setting, measured by `test/fpbench.js`. Write down the budget (draw calls, triangles, texture memory) the owner's laptop must hold 60 fps within. | todo |
| C-6 | Claude | **Make the prototype's text translatable.** Replace strings built by joining pieces (`'Scanned the parcel at ' + addr + ' before delivery.'`, shelf names, cab read-out, debrief sentences; about 35 places in `fpmission.js`, `fphandheld.js`) with whole sentences with `{name}` holes, shown through `OTR.i18n.t(template, { name: value })` (see `src/core/i18n.js`). Then A-2 can translate them. | done (PR #13) |
| A-1 | Claude | **Neutral default theme and a company theme file.** Remove the FedEx-style purple and orange (about 240 hard-coded colours) in favour of named theme colours a company can change in one file. | done (PR #7) |
| A-2 | Claude | **Translate the 3D prototype's text** (about 520 strings, `docs/FIRST-PERSON-STRINGS.md`) into all 11 languages. Add it to the catalogue so `test/i18n.js` covers it. | done (PR #16) |
| A-3 | Claude | **Workday flow:** the hub starts the 3D workday. `OTR.workday.begin()` feeds the results screen, the debrief, the drive review and the record. | review (PR #14) |
| A-4 | Claude | **QA for the 3D workday:** a scenario in `test/qa.js` that plays the stop like a trainee, plus the layout audit for the 3D HUD and handheld. | doing (branch claude/a4-qa; C-4 #22 and the hooks #20 are in) |
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
- **14 October 2026, Claude:** merged C-4 (#22) into `pilot` after running `fpmission`, `workday` and `fpworld` on the merged tree; its three new sentences are translated in all 11 languages. All of milestone 2's 3D pieces except C-5 are in; A-4 (QA of the whole stop) is under way on `claude/a4-qa`.
- **14 October 2026, Codex:** C-4 ready on codex/c4-stop. Tightened existing stop verification to require proximity to the actual door, rather than the previous 18 m radius that accepted cargo-shelf scans. Recording rechecks van proximity and parking brake, so a previous scan cannot authorize an outcome after the van is unsecured. Added doorstep guidance. Existing handover, safe-place, signature exception, retained-parcel return scan and report contract stay in place; no scoring or saved format changes.
  - Passed 102 Node checks (firstperson, fpmission, fphandheld, fpworld, workday, savesize), 67 full physical browser checks including rejected cargo scans, three actual doorstep scans/outcomes, checkpoint reload and retained-parcel return scanning; 28 focused English/Tamil normal/larger HUD checks. Audit found C-3's newly translated Tamil departure instruction scaled below 17 px; objective text now wraps at full size instead. Syntax/current-catalogue i18n/diff checks pass. New prompts still need Claude's translation pass. Screenshots inspected and committed under docs/qa/c4-*.png.
  - Low graphics benchmark retained at test/out/fp-review/bench-c4-low.json; software rendering cannot establish the Intel laptop's 60 fps floor. No geometry, textures or render passes added. Physical browser fixtures skip repetitive walking and move the van between later stops/depot; the first leg uses real driving inputs.

- **14 October 2026, Claude:** merged the workday hooks (#20) into `pilot` after running `fpmission`, `workday`, `fpworld` and `i18n` on the merged tree. The hub's Start workday now reaches the 3D campaign and back to the results. Codex: C-4 is the last piece before A-4.
- **14 October 2026, Codex:** A-3 hooks ready on codex/workday-hooks. Fresh hub workdays discard the prior prototype campaign; resume restores it. Both Save and return to hub and Main game checkpoint before workday.pause without a page reload. Successful finish clears the checkpoint and calls workday.finish with elapsed time, numbered stop outcomes/coordinates and depot coordinates. Standalone prototype/practice keep their existing flow. Report stop numbers now start from 1 while event keys remain stable.
  - Passed 101 Node tests (firstperson, fpmission, fphandheld, fpworld, workday, savesize), syntax/diff checks and current-catalogue i18n. 16 real-browser lifecycle checks passed across English/Tamil, normal/larger text: stale campaign discarded, position/time/reports resume, both exit routes and shared results with checkpoint cleared. Completion uses a finished mission fixture; the physical delivery sequence is covered separately by fpbrowser. Screenshots inspected and committed under docs/qa/hooks-*.png. No new text, geometry, render passes or scoring. Existing pause-menu English fallback remains in Tamil; please include those pre-existing sentences/button labels in your translation follow-up.

- **14 October 2026, Claude:** #15, #14, #17, #16 and #18 are merged into `pilot` (C-2, A-3, C-3, A-2 and the C-3 translations). From now on the hourly check-in merges a reviewed pull request without waiting (the owner's decision); `main` still needs the owner. Codex: next are C-4 and `codex/workday-hooks`; A-4 (QA of the whole stop) starts when both are in.
- **14 October 2026, Codex:** C-3 ready on codex/c3-drive-leg. The existing prototype already provides the short depot-to-214 Maple Ave leg and driving contract reports; retained that layout to keep the checkpoint coordinates and render budget stable. Cab guidance now covers belt, gap/mirror/signal checks, northbound right lane and 15 mph, the junction stop line, pulling over and safe exit. Parked guidance requires the right curb and northbound alignment. No new geometry, textures, render passes, scoring or saved fields.
  - Passed 99 Node tests (including savesize), 58 trainee browser checks, and 24 focused driving HUD checks (English/Tamil, normal/larger text). Existing violation tests cover speed, wrong side, sidewalk, stop line, handheld, hazards and contact; the new physical-input run stops before the line and parks at the first address without driving penalties. Syntax, current-catalogue i18n and diff checks pass; new sentences use English fallback pending A-2.
  - Low-graphics prototype benchmark: six samples, no page errors/context loss; software averages 32.49–42.15 fps (test/out/fp-review/bench-c3-low.json), not Intel hardware evidence. Existing 60 fps owner question remains. Screenshots committed under docs/qa/c3-*.png. A-3 hooks remain dependent on #14 merging.

- **14 October 2026, Claude:** A-2 in review on `claude/a2-translations2`. Catalogue regenerated (3566 strings, 293 templates) and the 286 strings and 48 templates that were missing are translated in all 11 languages (machine drafts, like the rest; `test/i18n.js` passes). That includes the C-2 brief/manifest text and A-3's workday screens. Codex: new on-screen text from C-3 on will show up as missing in `test/i18n.js` after the next catalogue run; keep sentences whole and I will translate them.
- **14 October 2026, Claude:** merged C-2 (#15) into `pilot` after reading it and running `fpmission`, `workday` and `i18n` on the merged tree. A-3 (#14) has `pilot` merged in and passes `workdayflow`; it merges next. Codex: C-3 is yours (inbox). A-2 starts once #14 is in, so the catalogue is regenerated once for both.
- **8 October 2026, Codex:** C-2 ready for Claude to open/review on `codex/c2-morning-brief`.
  - Added Dispatch's existing safety talk graph, readable answer pages and three manifest pages (the physical prototype parcels, not unrelated generated stops). Brief day/weather/start time comes from `OTR.shift.generate`; state survives checkpoints. New campaigns require acknowledgment before cab entry; cargo practice and already-departed old saves keep working. Only the final manifest acknowledgment reports `brief.read`, once, through the contract. No scoring or translation files changed; new strings need Claude's catalogue pass.
  - Passed 80 Node checks, 56 complete first-person browser checks and 280 focused Dispatch checks covering all safety graph nodes/answers/feedback in English/Tamil at normal/larger text, low graphics. Changed JS syntax and diff checks pass. Fixed the browser audit loader's CRLF handling for Windows.
  - Existing `test/i18n.js` passes against the current catalogue; this does not establish translation coverage for the new strings. Focused screenshots: `test/out/fp-review/c2-*.png`; English brief and larger Tamil manifest committed in `docs/qa/c2-*.png` for attachment to the PR.
  - `test/fpbench.js` low graphics, prototype-only: six samples, no page errors/context loss (`test/out/fp-review/bench-c2-low.json`). Software-rendered averages 35.26–70.70 fps are not the Intel laptop's hardware measurement; the existing owner question about the 60 fps floor remains. No geometry, textures or render passes added; the per-frame objective uses a precomputed brief key.

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
  "{0} attempts", "{0} days", "{0} refused", "{0} stops"), for A-2. Codex: C-2 can start. The catalogue is
  regenerated in A-2, together with the translations, so `test/i18n.js` keeps passing on `pilot` meanwhile.

- **8 October 2026, Claude:** the owner's decision: Codex does all graphical work and runs hourly from the Codex
  desktop app; Claude does the rest. C-6 moved to Claude (it unblocks A-2); for it, Claude changes only the text in `fpmission.js` and
  `fphandheld.js`, before Codex starts C-2. Claude opens pull requests for Codex's
  pushed `codex/*` branches (`docs/TEAM.md`).
- **8 October 2026, Claude:** A-3 (workday flow) in review on `claude/workday-flow`. The hub offers "Start
  workday" (3D) with the 2D route day as a link under it, behind `OTR_DATA.config.workday3d` (off; `?workday3d=1`
  for one visit). `OTR.workday.start/resume/pause/abandon/finish` save the day's reports as they come, so a reload
  keeps the score; `finish` opens the results, a new per-stop debrief (`WorkdayDebriefScene`) and the drive review on
  a plan of the 3D streets, and saves the day as a route day and a "Workday" run on the record. Contract:
  `docs/WORKDAY-EVENTS.md`, "Starting and finishing a workday". For Codex: an Inbox item lists the hooks for
  `FirstPersonScene.js` (start data, `pause`, `finish`, stop numbers from 1). Tests: `test/workday.js` (14),
  `test/workdayflow.js` (normal, larger text, Tamil) and the existing suites pass. 23 new strings and 7 templates
  are untranslated (A-2).

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
