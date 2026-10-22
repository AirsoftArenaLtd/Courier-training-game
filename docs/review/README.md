# Review material

- `WHATS-NEW.md`: for the owner, what changed since the last visual review and the quickest way to see each part.

- `<lang>-safety.csv`: the safety wording in each language, for native speakers (A-14). `HOW-TO-REVIEW.md` is what to send them with it (B-81), and each sheet's first row says the same in short, in its language. Lines new or changed since the
  last sheet the reviewers saw are marked `new` and listed first (B-53: 104 per language on 20 October: the signs, sat nav,
  traffic and drive-map lines of milestone 8). Regenerate with `node test/tools/review-sheet.js`; once the corrected sheets
  come back and are applied, run it with `--reviewed` to clear the marks for the next round.
- `docs/QUICK-START.<lang>.md`: the trainer's quick start in all eleven languages: `ta`, `hi` (B-63) and `bn`, `es`, `fr`,
  `gu`, `kn`, `ml`, `mr`, `pa`, `te` (B-151), with the game's own words for every button, for a native reader to check
  alongside the sheets.
- `docs/PILOT-GUIDE.ta.md`, `docs/PILOT-GUIDE.hi.md`: the trainer sections of the pilot guide in Tamil and Hindi (B-170),
  for native readers to check alongside the sheets.
- `set-<n>/`: one folder per milestone. `views/` holds the same fixed views every time (`node test/tools/review-set.js <n>`,
  board task A-23), so a milestone can be compared with the one before by opening the same file in both. Each task adds its
  own evidence next to it (screenshots, a short clip, the test results). `CHECKLIST.md` is the owner's five-minute review.
- `set-10/CHECKLIST.md`: the owner's second visual review (B-167): five minutes on B-164 and C-49 to C-52, each item ticked
  "merged" as its task lands.
- `set-6/views/`: the baseline before the milestone 7 to 10 work package (17 October 2026).
