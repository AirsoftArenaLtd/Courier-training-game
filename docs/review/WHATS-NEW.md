# What is new since your visual review (21 October), as of 22 October

One page for the owner: what changed in `pilot` between your High preview (21 October) and now, and the quickest way to
see each part. Every link below opens the 3D workday from the hub on a review profile of its own, so your own progress
is not touched (add it after `index.html` in the address, then press Start workday).

## To try (about 15 minutes)

| What | Try it | Checklist item |
| --- | --- | --- |
| **Dispatch radio call** (C-36): a call about twenty metres into the first drive; read it parked on the handheld | `?dev=1&workday3d=1&user=review-radio&route=10&day=4` (a priority call) or `route=11&day=5` (a check-in) | 20 to 22 |
| **Night driving** (C-36): every third day from day 6 runs after dark; headlights with L | `?dev=1&workday3d=1&user=review-night&route=9&day=6` | 23, 24 |
| **Replay of the last mistake** (C-37): from the results or the drive map after a 3D workday with a mistake | the night link above, and move off without the headlights | 30 |
| **Walk round the van** (C-35), before the first drive and after the return | `?dev=1&workday3d=1&user=review-van&route=10&day=4` | 16 to 19 |
| **Low graphics, lite** (B-126, your question 8): Low without the colour grade and heat haze, for PCs without a graphics driver | any 2D module with `&gfx=lite` added, for example `?scenario=m8-heat&dev=1&gfx=lite`; pictures in `set-9/b126/` | |
| **The cab you see from the seat** (C-48, merged 22 Oct): both mirrors visible from the normal seat, a complete cab | `?dev=1&workday3d=1&user=review-cab&route=10&day=4` | set 10: 1 |
| **Signals** (B-138, merged 22 Oct): Q left, C right, on for three seconds before moving off (backwards too) or turning | the cab link above: pull away once without and once with | set 9: 31; set 10: 4 |
| **A pin for cab habits** (B-166): a missed signal, mirror check, seatbelt or headlights is a plus on the drive map | finish the cab-link day with a missed signal, then Results, Drive map | set 10: 4 |

The checklists are `set-9/CHECKLIST.md` (items 1 to 31) and, for your second visual review, `set-10/CHECKLIST.md`.

## Being done now (from your review)

- **The sat nav covers the gear selector** since C-48's wider seat view, and covers some road signs as you approach them
  (B-164, Codex, under way). Until it lands, `pilot` is not ready for a real laptop; the release-candidate run will be
  repeated then.
- **Real materials, sign lettering, people, the GUI** (C-49 to C-52): C-49 and C-50 are under way with Codex; set 10's
  checklist is ready for each.

## Fixed or made sure, without anything new to see

- **Release-candidate run after C-48 (A-28):** 139 of 141 checks pass: every logic test, every 3D flow, and 49 of 51
  browser suites; the two that fail are B-164's. `READINESS.md` has the figures.
- **Saving in an LMS (SCORM 1.2):** a day with 30 missed signals still keeps all its drive-map pins (B-160); a trainee
  far into the course now keeps the day's pins too, losing only their oldest past runs from the record (B-168). The score
  is never at risk.
- **For trainers, in all 11 languages:** the one-page quick start (B-148, B-151) and the trainer's sections of the pilot
  guide (B-170, B-173), each with the game's own word for every button, checked automatically against the game
  (B-149, B-155, B-172). The reviewers are asked to read them too (B-156).
- **One word for one thing:** lines that named a key term another way went from 100 to 47 for the first 10 terms, and 3
  more terms are checked now (69 lines in all, B-150 to B-162); the rest are questions for the native reviewers. The two indicator controls now match (B-169).
- **Safer reviews:** a branch that changes the 3D world now runs every 3D browser test before it can be merged (B-171);
  no test compares on-screen text with English any more (B-159).

## Waiting for your answer

Open questions 2 to 4, 6, 7, 8 (lite graphics), 10 (no headlights at night: points or a star?) and 11 (do the new
3D-only scenarios count for the certificate?) are on the board, `docs/COORDINATION.md`, "Questions for the owner". Each
has a default in use until you answer.

For the translation reviewers: `OPEN-QUESTIONS.md` (35 questions in 11 languages) goes with each language's sheet, with
`HOW-TO-REVIEW.md` and their language's quick start.
