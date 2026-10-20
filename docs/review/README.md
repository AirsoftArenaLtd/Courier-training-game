# Review material

- `<lang>-safety.csv`: the safety wording in each language, for native speakers (A-14). Lines new or changed since the
  last sheet the reviewers saw are marked `new` and listed first (B-53: 104 per language on 20 October: the signs, sat nav,
  traffic and drive-map lines of milestone 8). Regenerate with `node test/tools/review-sheet.js`; once the corrected sheets
  come back and are applied, run it with `--reviewed` to clear the marks for the next round.
- `set-<n>/`: one folder per milestone. `views/` holds the same fixed views every time (`node test/tools/review-set.js <n>`,
  board task A-23), so a milestone can be compared with the one before by opening the same file in both. Each task adds its
  own evidence next to it (screenshots, a short clip, the test results). `CHECKLIST.md` is the owner's five-minute review.
- `set-6/views/`: the baseline before the milestone 7 to 10 work package (17 October 2026).
