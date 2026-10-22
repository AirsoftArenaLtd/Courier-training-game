# Pilot readiness

One page for the owner: what is checked, what is only a draft, what only real laptops and real people can tell us,
and the decisions that are yours. Checked on `pilot` on 22 October 2026 after C-48 (the owner's cab review), with A-28's
release-candidate run (`node test/run-all.js --rc`, `d880fe8`, 07:34 UTC).

## Verdict

`pilot` is ready for the owner to try on real laptops once B-164 is fixed: since C-48's wider seat view, the sat nav
covers the gear selector and some sign heads (two browser suites fail; everything else passes). The risks that remain
need people, not code: the frame rate on the company's machines, native-speaker review of the translations, and the
company's own rules for data and the learning system. Merging `pilot` into `main` is the owner's decision (below).

## What is checked, and the result

To refresh: `node test/run-all.js --rc` (every suite and the 15 flows, B-157), then `node test/tools/readiness.js`
prints this table's figures from that run (B-163).

| Check | How | Result |
| --- | --- | --- |
| The 3D workday, played as a trainee | 15 shared flows (`node test/qa.js --only workday-3d,...`): a first day, later days with lockers, intercoms, reception, failed deliveries, the walk round the van, damage reported and unreported, night with and without headlights, a wrong turn, the radio call followed, checked in and declined, the replay of the last mistake. Each careful day must have **no** wrong report except the one a variant sets out to make (B-127 to B-131) | **15 of 15 clean** at Low (release-candidate run, 22 Oct 07:34, `d880fe8`, after C-48) |
| Random play | `test/fpfuzzbrowser.js`: five seeds of random keys on a later day, the day's save checked every 25 keys (A-28) | passes, about 1,240 keys |
| Logic tests | `node test/run-all.js`: 75 Node suites (scoring, saves, resume, SCORM and xAPI, sign-in, data export, reports, i18n, the 3D route, stops, damage, radio, replay, the quick starts) | **75 of 75** (22 Oct 07:34) |
| Browser suites | `node test/run-all.js --browser`: 51 suites (every module by keyboard, the cab, mirrors, signs, traffic, doorsteps, sound, accessibility) | **49 of 51** (22 Oct 07:34): `fpsignlayoutbrowser` and `fpweatherbrowser` fail since C-48 (the wider seat view; B-164, Codex), both pass on the pilot before it |
| Languages | Every sentence in all 11 languages; every number kept in all 43,895 translated lines (`test/i18nnumbers.js`); the cab and its traffic lines in 12 languages at larger text (588 views, `test/fplangsbrowser.js`); the radio message and night warning in 12 languages at larger text (`test/radionightbrowser.js`); one word for each key term (`test/glossary.js`) | all pass |
| Low graphics | Each milestone 9 feature readable at Low as at High (`test/lowparitybrowser.js`, pictures in `review/set-9/low-high/`) | passes |
| Resume | 30 seeds restored at 3,000+ checkpoints give the same day; the day's save restores at every point of the random play | passes (`test/fpresume.js`, A-28) |
| LMS | SCORM 1.2 and 2004 with a stand-in LMS; both packages built, unpacked and launched in a frame as an LMS does (`test/scorm-launch.js`, `test/scorm-launch-2004.js`) | passes, 222 files (11.6 MB) each |
| Save size | The heaviest day (C-36's radio and night, C-35's walkaround, C-34's damage) under SCORM 1.2's 4,000 characters: 484 to spare since B-160 (save v3); with 30 missed signals (B-138's worst case) 3,980, still packed with all 59 drive-map pins. A trainee 20 runs in on that day keeps every pin; the record keeps its newest runs and drops the oldest (B-168). With 30 missed signals on top, that trainee's day loses its pins but never its score. Under SCORM 2004: 26,701 of 64,000 | passes (`test/savesize.js`) |
| Rendering cost | Low 54 draw calls / 2,396 triangles at the busiest view; High 107 / 235,893 (C-36's 207-view gate); 2D scenes on a PC without a graphics driver 12 to 18 fps (B-87), 22 to 23 with `?gfx=lite` (B-126) | within the budgets in `docs/FRAME-BUDGET.md` |

The QA machine renders in software (no graphics card), so its frame rates say nothing about real laptops.

## What is only a draft

- **Translations.** All 11 languages are machine drafts, checked by tests and by the team (B-106, B-141, B-142), but not
  by a native speaker. The sheets are in `docs/review/<language>-safety.csv`, with 25 questions for the reviewers in
  `docs/review/OPEN-QUESTIONS.md`.
- **The look** of the cab, materials, signs, people and GUI: the owner's visual review of 21 October is being worked
  through (C-48 to C-52, `review/set-9/CHECKLIST.md` items 25 to 29).
- **Sound** is generated in the browser, quiet and optional, and every sound has a caption.
- **The pilot guide** (`docs/PILOT-GUIDE.md`) has blank contact lines for the company to fill.

## What only real laptops and real people can tell us

1. **Frame rate (O-1).** The 60 fps target has to be measured on the company's real machines with
   `docs/FRAME-BUDGET.md`, again after C-48 and C-49 (the new cab and materials cost the most).
2. **A whole day by a new courier.** The later days were built from the rules and played by scripts; a real
   first-time trainee will find the unclear parts.
3. **Native review** of the translations.

## Decisions for the owner

1. **Merge `pilot` into `main`?** Only you approve this. Suggested order: B-164 fixed and the release-candidate run green, then O-1 on one real laptop.
2. **The open questions** on the board (`docs/COORDINATION.md`, "Questions for the owner"): 2 to 4, 6, 7, 8 (`?gfx=lite`
   for PCs without a graphics driver), 10 (no headlights at night: points or a star) and 11 (do the new 3D-only
   scenarios count for the certificate). Each has a default in use until you answer.

## Known limits

- Since C-48's wider seat view, the sat nav panel covers the gear selector's P, R and N positions and, in some sign approaches, the sign head (`fpsignlayoutbrowser`, 240 views); Codex fixes it as B-164.

- Signalling is in the scoring rules but the 3D world does not report it yet (B-138, Codex).
- Medium graphics does not exist: there are Low, High and the trial `?gfx=lite`.
- A replay of the last mistake lives only in the browser's memory: it is gone when the tab closes.
- Under machine load, a few browser suites can time out while the page is still starting (`fpdoorsbrowser`,
  `fpbrowser`); each passes when rerun alone.
