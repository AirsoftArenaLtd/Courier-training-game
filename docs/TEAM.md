# How the team works

Three of us build the corporate pilot of **On The Route**:

- **The owner** decides and tests on real laptops.
- **Codex** builds the 3D world.
- **Claude** builds everything around the 3D world and checks quality.

Codex and Claude work without the owner passing messages between them. This file is the rules. `AGENTS.md` (read by
Codex) and `CLAUDE.md` (read by Claude) point here. The plan is `docs/PILOT-PLAN.md`, and the live board (tasks, log
and questions) is `docs/COORDINATION.md`.

## The product, and the two rules that come before everything else

A courier-training simulator sold to large courier companies. It runs in a browser on **typical company laptops:
integrated graphics, mouse and keyboard**. The pilot must be ready by the new year, sooner if possible.

1. **Performance on integrated graphics.**
   - 60 fps on the owner's Intel laptop is the floor.
   - Every 3D change keeps the graphics-quality setting working and is measured (`test/fpbench.js`, the bench screen).
   - The cloud machines have no GPU, so their frame rates mean nothing. Say so, and leave the real measurement to the
     owner (raise a `needs-owner` question).
2. **No UI glitches, "100%".**
   - Prompts appear reliably.
   - Nothing overlaps, clips, runs out of its box or is shrunk too small to read, in any of the 12 languages.
   - You can never walk or drive where you should not be.
   - Test like a trainee would play, not only the happy path.

## Who owns what

| Owner | Area |
| --- | --- |
| **Codex** | **All graphical work** (the owner's decision, 8 October): the 3D world and everything visual in it: `src/core/firstperson.js`, `fp*.js`, `world3d.js`, `src/scenes/FirstPersonScene.js`, 3D art, models, lighting, animation, `test/fp*.js`, `test/firstperson.js`. Depot, morning-brief room, scanning, loading the van, 3D driving, walking to the door, people, dogs and weather in 3D. New visual work anywhere in the game (art, icons, screen layouts' look) goes to Codex too. |
| **Claude** | Everything around it: `src/core/workday.js` and `data/workday_events.js` (scoring), the hub and training modules, results and debrief, records, trainer tools, company themes, translations (`data/i18n/`), corporate requirements (training systems, offline use, data handling, accessibility), the QA tools (`test/qa.js`, `test/a11y-screens.js`, `test/i18n.js`) and merging into `pilot`. |
| **Shared** | `index.html`, `README.md`, `docs/COORDINATION.md`. Small edits are fine; say what you changed in the log. |

To change a file the other agent owns, ask on the board or in a pull request comment. Do not edit it yourself.

**The two halves meet at one call:** `OTR.workday.report(type, detail)`, described in `docs/WORKDAY-EVENTS.md`. The 3D
world reports what the trainee did. It never scores.

## Branches and merging

- `main`: what trainees get. **Only the owner approves a merge to `main`.** Claude then merges with `--no-ff`,
  checks the merged tree is exactly the tested `pilot` commit, and pushes.
- `pilot`: everything agreed so far, for the owner to test. Never push to it directly, and never force-push it.
- Work branches: `codex/<topic>` and `claude/<topic>`, from the latest `pilot`. One topic per branch, kept small
  enough to review in one sitting.
- **Every change goes into `pilot` through a pull request, reviewed by the other agent.**
  - Claude approves with a comment that starts **"Approved"**.
  - Codex reviews through its GitHub reviewer (comment `@codex review`). A review that finds no major issues (its
    "Didn't find any major issues" comment or a 👍) is its approval. If it leaves findings, the author addresses them
    and asks again.
  - Claude merges approved pull requests into `pilot`, its own and Codex's.
  - Codex runs from the Codex desktop app on the owner's laptop and may only push a `codex/<task>` branch. On each
    check-in, Claude opens a pull request into `pilot` for any pushed `codex/*` branch that has commits and no pull
    request yet, reviews it, and replies in Codex's inbox (merged into `pilot` straight away so Codex sees it).
  - After three rounds of review comments without agreement, label it `needs-owner` and stop arguing.
- Never commit a change that makes the game open the prototype by default (`?lab=firstperson` is how it opens).
- `qa-pass2-fixes` is a historical branch. Do not delete it.

## Talking to each other (no relay through the owner)

- **The pull request is where you talk.** Its description says what changed, why, and how it was tested, including
  what could not be tested here.
- **To hand Codex work**, Claude:
  1. makes a `codex/<task>` branch from `pilot`, with one commit marking the task `doing` on the board;
  2. opens a pull request into `pilot`;
  3. comments on it mentioning **@codex** with a clear, self-contained request ("implement task C-n as described on
     the board; push your commits to this pull request").
  Codex updates that pull request, and its follow-ups ("@codex address that feedback") go in the same thread.
- **Codex's inbox:** Codex checks "Inbox for Codex" on `docs/COORDINATION.md` (on `pilot`) on a schedule. Every task
  or reply Claude hands Codex also goes there (merged into `pilot` straight away), as well as in the pull request.
  Codex answers in "Inbox for Claude" or in the pull request.
- **Claude checks the board and every open pull request every hour**, and picks up anything addressed to it.
  Mentioning **@claude** makes it easy to find.
- **The board, `docs/COORDINATION.md`:**
  - Claim a task by setting its owner and status in your work branch's first commit.
  - Add a dated log line when you finish something the other needs to know.
- **When you need the owner**, add the `needs-owner` label to the pull request or issue, ask one clear question in a
  comment, and add it to "Questions for the owner" on the board. Stop work on that thread only, and carry on with
  anything else.
- **Never ask the owner to pass a message.**

## Using the right model (efficiency without losing quality)

The owner pays for every session. Match the model to the job, and do not spend a session on nothing.

**Claude**
- The scheduled check-in runs on a mid-tier model (Sonnet).
- It hands work up to Opus or down to Haiku with a subagent (the Agent tool's `model`), with a self-contained
  prompt.

| Tier | Use it for |
| --- | --- |
| **Haiku** (cheapest) | Checking for new activity, updating the board, running test suites and reporting the result, mechanical edits (moving strings into the catalogue, renames, formatting). |
| **Sonnet** (default) | Most coding, reviewing ordinary pull requests, writing QA scenarios, translations, docs. |
| **Opus** (most capable) | Design and interface changes (`docs/WORKDAY-EVENTS.md`, the save format), scoring design, hard bugs, performance work, reviewing large or risky pull requests (the 3D engine, save data, sign-in and passwords), a final read of safety wording in translations. |

**Codex**
- Use the lowest reasoning effort that does the job well:
  - low for small fixes and doc updates;
  - medium as the default;
  - high only for 3D architecture, performance and hard bugs.
- The owner sets Codex's model in its own settings.

**Both**
- If there is nothing new since the last board log entry (no new commits, pull requests or comments), stop at once.
- Run the browser test suites only for what a change touches. A docs-only change needs no browser test.
- Keep pull requests small. A small review is cheap. A 2,000-line review is expensive and misses things.
- Escalating to a stronger model is right when the job needs it. Quality comes first, and the tiers are the
  default, not a ceiling.

## Before opening a pull request

- `node --check` on every changed JS file.
- The unit tests for what you touched:
  - `test/workday.js`, `test/savesize.js` and `test/fp*.js`, which run in Node with no browser;
  - `test/academy.js`, `test/enterprise.js`, `test/routeday.js` and `test/driving.js`, which need Chromium.
- `test/i18n.js` once the strings in your change are in the catalogue (`node test/tools/i18n-extract.js`).
- New on-screen text goes through `OTR.txt` / a Phaser Text (it is translated as it is shown) and is plain US English.
  Pages that are not Phaser Text use `OTR.i18n.t()`.
- For a screen change, the layout audit (`test/a11y-screens.js`, `test/qa.js --only ...`) at normal and larger text,
  in English and one Indian language (`QA_LANG=ta`, the longest).
- Screenshots of anything visual, attached to the pull request.
- Chromium here is `/opt/pw-browsers/chromium` (`QA_BROWSER=...`, `QA_FPS_FLOOR=0` without a GPU).

## Other rules

- No company names, logos or colours in the repository (no FedEx, UPS, Amazon...). A company's branding is a theme
  file it fills in (board task A-1).
- Commit messages: a plain English summary line, and a body when the why is not obvious. No model names in code,
  commits or documents.
- Kill processes by PID, never by name.
- Do not delete branches, tags or anything another agent made.
