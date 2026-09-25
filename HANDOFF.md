# Handoff: FedEx: On The Route, QA pass 2 (for the next session)

> **Update, 24 September 2026 (cloud session): pass 2 is finished.** WP0–WP9 are done. Every finding in
> `docs/review/` has a Status line, and the FIX-PLAN Log has an entry for each package. The results are written up
> in the "Second pass" section of `docs/QA-REPORT.md`. The work is on the branch `qa-pass2-fixes`. `_baseline-pass2/`
> was deleted; the last commit that still has it is named in the WP9 Log entry. The Intel check was run on the owner's laptop on
> 25 September (`QA_GPU=default`, 60 fps floor): 28 of 28, every scenario at 131–145 fps. Nothing is left open.
> The rest of this file is the plan as it was handed over.

Written 2026-09-24 at the end of a local session, for a cloud session to continue. Read this, then
`docs/review/FIX-PLAN.md` (the working instructions), then start at **Next steps**.

## The task

A courier-training simulator (Phaser 3.80, WebGL, 1280×720, plain JS, no build step) for trainees at an enterprise
customer. The owner's requirements, in their words where it matters:

- It will run on **typical company computers** (integrated graphics, mouse and keyboard), so it must perform there.
- It "needs to be 100% no UI glitches". After the first QA pass they said there are still "a lot of very small, easy
  to miss issues", for example: "when showing up to a house it allows you to walk right out of the vehicle without
  stepping out of the vehicle so you end up on a different level", and "sometimes the prompts for actions like step
  out of the vehicle, search the shelves, or inspect house number don't show up properly and you almost have to
  wiggle in place to get them to show up".
- Their instruction: have testers play every part of the game like a human, flag anything broken or "stupid",
  compile instructions for the future, then **fix all of it**.

## What has been done

**Pass 1 (complete, 18–23 Sept).** A full QA pass and a driving rework: every scenario fixed, a vehicle model,
the town and its traffic reworked. The automated suite `test/qa.js` was left in the repo and passed 28/28. Everything
is written up in `docs/QA-REPORT.md` (with a before/after gallery in `docs/progress/` and `docs/qa/`).

**Pass 2, review (complete).** Nine testers (agents), run **one at a time** at the owner's request, played every
area like a trainee with a new play tool and wrote **186 findings** into `docs/review/<area>.md`:
stops-m5 (23), stops-m8 (21), routeday (21), driving (14), warehouse (23), pretrip-route-pickups (27),
dialogue (31), shell (23), perf (3 findings plus a measured, ranked performance plan). Severity: 1 blocker,
47 major, 77 minor, 33 design, 28 polish. Screenshots of the evidence are in `test/out/review/<area>/` (92 MB).
The tester brief is `docs/review/BRIEF.md`.

**Pass 2, fix plan (complete).** `docs/review/FIX-PLAN.md` assigns every finding to a work package (WP0–WP9), decides
every design question up front, and says how to work and verify. **It is the instruction set; follow it.**

**Pass 2, fixing (just started).** WP0 (performance) is partly done; nothing else has been touched.
State of WP0 at handoff:

| Step (from `docs/review/perf.md`) | State |
| --- | --- |
| PERF-1: `willReadFrequently` in `src/core/textures.js` (the 50–95 ms freezes) | **done**, marked in perf.md |
| Renderer config in `src/main.js` (`antialiasGL: false, maxTextures: 1`) | **done** (it also added `powerPreference: 'high-performance'`, which the perf review found has no effect; harmless) |
| PERF-2: static Graphics drawn into textures once | **in progress**. Helpers `OTR.tex.shape()` / `OTR.tex.liveShape()` added to `src/core/textures.js`. Converted: fx, rig, scanner, stage, talk, ui, HubScene, PreTripScene, RoutePlannerScene, LabelScene (possibly partly), TownDriveScene (partly), DrivingScene. Not yet: StopScene (10 `add.graphics`), LiftingScene (8), SortingScene (7), PickupScene (4), LoadingScene (3), ResultsScene, ShiftDebrief/Brief, DaySummary, BaseScenarioScene and the rest. Not marked. |
| Merge the three atmosphere overlays (`src/core/atmos.js`) | not started |
| Bake static backgrounds; trim big transparent layers | not started |
| PERF-3: load Phaser from `lib/` first; add a favicon | not started |
| Tests after WP0 | only a spot check: m1-pretrip, m2-labels, m3-missing pass (boot, layout, play, golden). **The full suite has not been run since WP0 began.** |

All 97 JS files pass `node --check`. The files WP0 changed so far, compared with the pre-fix snapshot:
`src/main.js`, `src/core/{fx,rig,scanner,stage,talk,textures,ui}.js`,
`src/scenes/{HubScene,m1/DrivingScene,m1/PreTripScene,m1/RoutePlannerScene,m2/LabelScene,shift/TownDriveScene}.js`.

## Key decisions

- **One agent at a time.** Running nine at once burned about 1.2M tokens and hit the usage limit before anyone got
  far. Sequential testers each used about 230–280k tokens and finished their areas.
- **Testers and fixers work economically:** half-size screenshots, crops for detail, batched commands, narrow code
  reads (see "Work economically" in `docs/review/BRIEF.md`).
- **Write progress to disk as you go.** Every cutoff so far lost only what was not yet written. Fixers mark each
  finding with a `- **Status:** fixed — …` or `- **Status:** not changed — <reason>` line in its review file, and
  append to the Log at the end of FIX-PLAN.md after each package.
- **Honest results are built once (WP1)** and then used everywhere: a `critical` flag on ScoreLog items caps that
  category at 1 star and replaces the praise headline; takeaways are ranked, counted and not silently cut to three;
  untested categories earn no stars; time stars are gated on accuracy. Many findings across all areas collapse into
  this. Details in FIX-PLAN.md, "WP1 mechanism".
- **Design calls already made** (so nobody re-litigates them), among them:
  - Show E prompts while walking, with interaction spots on the thing itself.
  - The town is fixed per career, not rebuilt daily.
  - Route days count toward rank.
  - No stop badges in Find It Fast.
  - Bins keep their keys all shift.
  - Lifts start upright.
  - Close-ups and inspections describe without giving the verdict.
  - Answer length must not predict the right answer.
  - Timed decisions scale with reading length.
  - "New Profile" warns before replacing progress.
  - Scenarios pause on window blur.
  - US English everywhere.

  All the calls are in FIX-PLAN.md under their work packages.
- **Performance target:** at least 60 fps on the Intel UHD integrated GPU in every scene (ideally 100+). Measured
  baseline on Intel before WP0: conversations ~49 fps, stops ~48–55, hub 50, town 65, warehouse 67–72, pickup 74.
  The perf review's in-page prototypes reached 105–129 fps with the full plan.
- **The suite pins the discrete GPU** (`--force_high_performance_gpu`) so its 100 fps floor is comparable run to
  run; `QA_GPU=default` measures on the OS's choice (the Intel GPU on this laptop).

## Tools

- `node test/qa.js [--only ids] [--pass boot,layout,play,golden] [--shots]` is the automated suite (about 45 minutes
  in full). See `test/README.md`. Golden paths are in `test/paths/`.
- `node test/tools/playd.js --port <p> --out test/out/review/<name>` is the play tool. It keeps one game open in a
  headless browser and takes HTTP commands (hold/press keys, click, drag, screenshot, `/stage`, `/texts`, `/eval`).
  It is turn-based by default. The usage notes are at the top of the file.
- `_baseline-pass2/` (project root) is a copy of `src`, `data`, `lib`, `css`, `test` and `index.html` from **before
  pass-2 fixing began**. `diff -ru _baseline-pass2/src src` shows everything pass 2 has changed. Delete this folder
  when pass 2 is finished.

## Moving to a cloud session: what changes

- **This folder is not a git repository.** Bring the whole folder, including `docs/review/`. The evidence
  screenshots in `test/out/review/` (92 MB) are useful but optional; `test/node_modules/` (45 MB) should be
  reinstalled rather than copied.
- **Browser:** `test/qa.js` and `test/tools/playd.js` look for Edge/Chrome at their Windows paths, then at common
  Linux paths (`/usr/bin/google-chrome`, `/usr/bin/chromium`, …), or wherever `QA_BROWSER` points. On Linux they add
  `--no-sandbox` and skip the Windows-only `--use-angle=d3d11`. Setup:
  `cd test && npm install`, then provide a browser (for example `npx @puppeteer/browsers install chrome@stable` and
  set `QA_BROWSER` to the path it prints, or install Chromium from the system package manager).
- **No GPU in the cloud** (almost certainly): WebGL falls back to software rendering, maybe 10–30 fps. So:
  - Run the suite with `QA_FPS_FLOOR=0`: the boot pass's frame-rate check is meaningless there.
  - Expect timing-sensitive golden paths to behave differently at a low frame rate. That is how pass 2 found the
    door-tag bug. A failure that appears only at a low frame rate may be a real bug, so investigate it rather than
    dismiss it.
  - **Performance cannot be measured in the cloud.** Implement WP0 there by following `docs/review/perf.md` (its
    measurements are real), but the Intel-GPU verification (`QA_GPU=default node test/qa.js --pass boot`, and the
    fps table) has to be done on the owner's Windows laptop at the end. Say so in the report.
- **Not available in the cloud:** the old session scratchpads, including the gallery script that made
  `docs/qa/*.png` (it lived in a local temp folder). If new before/after shots are needed, take them with
  `playd.js` (`/shot`).
- **Paths:** docs and findings quote Windows paths (`C:\Users\...`). They are all relative to the project root;
  read them as such.

## Gotchas learned the hard way

- **Edit JS with the Edit/Write tools, never through shell heredocs**: a Python heredoc silently ate the backslash
  in `\'` twice and broke the file. Run `node --check` on every file touched.
- Phaser `setColor` re-rasterises text even when unchanged (patched once in `src/core/textures.js`); avoid per-frame
  `setText`/`setColor` in `update()`.
- Two interactions within a few pixels of each other flip with the frame rate (the door tag vs the address check,
  fixed with `prefer()` in StopScene). The stage's `nearest()` has a `prefer()` bonus for exactly this.
- Do not measure frame rates with two headless browsers running; they contend for the GPU.
- The full suite is long; use `--only` while iterating and run it in full at the end of each package.

## Next steps

1. **Finish WP0** (`docs/review/FIX-PLAN.md` → WP0, `docs/review/perf.md` → ranked plan):
   - finish the PERF-2 conversions listed above;
   - merge the atmosphere overlays;
   - bake the static backgrounds and trim the big transparent layers;
   - PERF-3.

   Then check visually that nothing changed except what should (compare against `docs/qa/*.png`). Run the suite
   (`QA_FPS_FLOOR=0` in the cloud), mark PERF-2 and PERF-3, and write the WP0 Log entry, leaving the Intel fps
   table to be measured on the laptop.
2. **WP1**: honest results mechanism, then **WP2a, WP2b, WP3, WP4, WP5a, WP5b, WP6, WP7, WP8**, in that order,
   one at a time, each ending with its tests, Status lines and a Log entry. Every finding must end with a Status.
3. **WP9**: the full suite; the owner's two examples re-checked by hand with the play tool; `node --check`
   everything; content validation clean (`index.html?dev=1`); a "Second pass" section in `docs/QA-REPORT.md`.
4. **On the owner's laptop afterwards:** `QA_GPU=default node test/qa.js --pass boot` for the Intel fps table
   (target ≥ 60 everywhere), and a full `node test/qa.js` on the RTX. Put the numbers in the report.
5. Delete `_baseline-pass2/` once everything is verified.
