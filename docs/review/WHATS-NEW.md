# What is new since your visual review (21 October), as of 28 October

One page for the owner: what changed in `pilot` between your High preview (21 October) and now, and the quickest way to
see each part. Every link below opens the 3D workday from the hub on a review profile of its own, so your own progress
is not touched (add it after `index.html` in the address, then press Start workday).

## New since 22 October (about 10 minutes)

Your second visual review (`set-10/CHECKLIST.md`) can now be done in full, items 1 to 15.

| What | Try it | Checklist item |
| --- | --- | --- |
| **The sat nav clear of the gear selector and signs** (B-164, merged 27 Oct) | `?dev=1&workday3d=1&user=review-cab&route=10&day=4` | set 10: 2, 3 |
| **Real surfaces on High** (C-49): asphalt, pavement, grass, plaster and brick | `?dev=1&workday3d=1&user=review-look&route=1&day=3&gfx=high`, then the same with `&gfx=low` | set 10: 5 to 7 |
| **Lettering on the signs themselves** (C-50); J still reads the sign aloud in your language | `?dev=1&workday3d=1&user=review-signs&route=1&day=3` | set 10: 8 to 10 |
| **People you notice** (C-51): at doorsteps, at reception and along the streets on High | `?dev=1&workday3d=1&user=review-people&route=5&day=4&gfx=high` | set 10: 11, 12 |
| **The owner's desk model** at the depot on High (B-1, from your packs) | any link above with `&gfx=high`, at the depot | |
| **The cab and handheld look like real devices** (C-52, merged 28 Oct); the road just ahead is clear of the instruments | the cab link above; Tab at a stop for the handheld | set 10: 13 to 15 |
| **Drive with a gamepad** (B-2): plug in a standard controller and press a button; remapping is in **Esc → Controls and guidance → Gamepad controls** and is now remembered (B-183) | the cab link above | |
| **A lost 3D display** (B-3): close the laptop lid mid-drive and open it again; the day waits and carries on | any 3D link | |

The release-candidate run on the evening of 28 October, with all of the above, passes all 167 checks
(`docs/READINESS.md`), so `pilot` is ready to try on one real laptop (O-1).

## Earlier: to try from 22 October (about 15 minutes)

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

- **The 3D versions of the modules** (C-38 to C-46: route and driving, packages, customers, problems, the scanner,
  loading, pickups, safety): Codex is moving them onto today's `pilot` now that C-52 is in; I review them in order and
  they come to you as a set.

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
