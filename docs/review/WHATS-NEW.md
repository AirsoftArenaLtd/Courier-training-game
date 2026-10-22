# What is new since your visual review (21 October)

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

The full checklist is `set-9/CHECKLIST.md`; Low and High side by side for each new feature are in `set-9/low-high/`.

## Being done now (from your review)

- **The cab and mirrors** (C-48): Codex's work is reviewed; it waits for one fix (a walk-round mark that floats off the van
  after the headlight change), then it is merged and the pictures are taken again.
- **Real materials, sign lettering, people, the GUI** (C-49 to C-52): queued after C-48.

## Fixed or made sure, without anything new to see

- **The careful courier is now really careful in every test day.** The automatic test days now answer the radio, read
  the stop updates, inspect the lights, check mirrors before reversing, drive to the weather, and book failed deliveries
  properly; any mistake on a careful day now fails the tests (B-127 to B-131).
- **Scoring:** a parcel that was reported missing at Dispatch before departure no longer counts against the trainee when
  it turns up later, because a careful count could not have avoided it (B-131).
- **Saving in an LMS (SCORM 1.2):** the heaviest day now has about 440 characters of room instead of 71, so drive-map
  pins are no longer at risk (B-114).
- **Translations:** C-36 and C-37 text in all 11 languages; a few glossary fixes (for example the Kannada "Reception"
  label, which said "welcome"); every number in every translation is now checked automatically (B-143).
- **Signalling was never scored in 3D** (B-137): the report exists in the rules but the 3D world never sent it. It is
  with Codex (B-138).

## Waiting for your answer

Open questions 2 to 4, 6, 7, 8 (lite graphics), 10 (no headlights at night: points or a star?) and 11 (do the new
3D-only scenarios count for the certificate?) are on the board, `docs/COORDINATION.md`, "Questions for the owner". Each
has a default in use until you answer.

For the translation reviewers: `OPEN-QUESTIONS.md` (25 questions) goes with each language's sheet.
