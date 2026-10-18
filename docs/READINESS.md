# Pilot readiness

One page for the owner: what is checked, what is only a draft, what only real laptops and real people can tell us,
and the decision that is yours. Checked on `pilot` at the end of milestone 6 (16 October 2026, after C-18 and A-17).

## Verdict

`pilot` is ready for the owner to try on real laptops. Nothing automated is failing. The remaining risks need people,
not code: the frame rate on the company's machines, native-speaker review of the translations, and the company's own
rules for data and the learning system. Merging `pilot` into `main` is the owner's decision (below).

## What is checked, and the result

| Check | How | Result |
| --- | --- | --- |
| Browser scenarios | `node test/qa.js`, 39 scenarios: every training module, the route day, the hub, the academy screens, the certificate, drive review, and three complete 3D workdays (one fresh, two on chosen seeds that cover wrong label, valid and invalid ID, difficult customer, dog, signature, hazards, ice) | **39 of 39 clean** |
| Logic tests | `node --test` on 33 test files (scoring, workday events, resume, SCORM and xAPI, sign-in, trainee data export and erase, before-and-after report, i18n, 3D route, doorsteps, later days, sound, accessibility, theme) | **237 passed, 0 failed** |
| Offline | `test/offline.js` blocks every request except the training server and plays title, hub, 3D start and the Dispatch brief | passes |
| Languages | Every sentence has a translation in all 11 languages. Layout: the 3D screens in 12 languages at normal and larger text (216 layouts, C-15), and the browser scenarios in English for all 39, plus Tamil at larger text for 37 of them (one overflow found and fixed; the rest not rerun after a machine restart). A full pass in each other language was not run | translations complete; full-scenario layout pass done in English and mostly Tamil only |
| Resume | 30 seeds saved and restored at 3,000+ checkpoints give the same day as an uninterrupted one; 100 shuffled days finish | passes (`test/fpresume.js`) |
| LMS | SCORM 1.2 and 2004 with a stand-in LMS: complete needs a finished workday, passed needs the pass marks | passes |
| LMS packages | `node test/scorm-launch.js` and `node test/scorm-launch.js --2004` build each package, unpack it and launch it in a frame with that version's API, as an LMS does: the learner and saved progress are read, every 3D model loads at Low and High from the zip (none falls back), nothing is missing and nothing comes from outside (B-40, B-42) | passes, 208 files each |
| Rendering cost | Low graphics 42 draw calls at the busiest view (down from 50), High 52 (down from 69); frozen-frame comparisons match | passes (`docs/PERF.md`) |

The QA machine renders in software (no graphics card), so its frame rates (10 to 30) say nothing about real laptops.

## What is only a draft

- **Translations.** All 11 languages (Spanish, French, Hindi, Bengali, Marathi, Telugu, Tamil, Gujarati, Kannada,
  Malayalam, Punjabi) are machine drafts. The safety wording is in `docs/review/<language>-safety.csv`, one line per
  sentence, ready for a native speaker to correct. Nothing was reviewed by a person yet.
- **Sound** is generated in the browser. It is quiet, optional, and every sound has a text caption. Nobody has
  judged it on real speakers.
- **The pilot guide** (`docs/PILOT-GUIDE.md`) has blank contact lines for the company to fill.

## What only real laptops and real people can tell us

1. **Frame rate (O-1, O-2).** The 60 fps target has to be measured on the company's real machines with
   `docs/FRAME-BUDGET.md`. Codex measured an average of 144 fps on your Intel laptop in C-5, before milestones 4 to 6
   added accessibility, theme, sound and later days. Run it again.
2. **A whole day by a new courier.** The first-time guide and the later days were built from the rules and tested by
   scripts. A real first-time trainee will find the unclear parts.
3. **Native review** of the translations above.

## Decisions for the owner

1. **Merge `pilot` into `main`?** Only you approve this. Suggested order: finish O-1/O-2 on one real laptop first.
2. **Question 3, the LMS:** the course now counts as complete only after a finished 3D workday, and as passed when the
   best workday met the pass marks. Right for the pilot? To go back to modules only, set `lmsWorkday: false` in
   `data/config.js`.
3. **Question 1, the pilot company:** does it need results in its learning system, and are there data rules? Until then
   everything is built for the general case; `docs/DATA.md` says exactly what is stored and how to export or erase it.
4. **Who approves `main`** after this one.

## Known limits

- The saved workday must stay small for SCORM 1.2 (4,096 characters). The largest test day used 3,596; do not add
  per-day data to it without running `test/fpresume.js`.
- Medium graphics does not exist: there are Low and High only.
- Two frame-rate figures in `docs/PERF.md` from C-16 undercount text memory; the corrected counter arrived with C-17 and
  is the one to trust.
- One scenario (`route-day`, photo framing) failed once under heavy machine load and passed on every rerun.
