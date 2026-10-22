# How to review a translation sheet

Thank you for checking the game in your language. The translations were made by a machine. You are the person who can
tell us whether a driver would understand them, and whether any of them could teach something unsafe.

## What you get

One file, for example `ta-safety.csv` for Tamil. It opens in Excel, Google Sheets or LibreOffice. Each row is one line
of text from the game. The first row under the headings repeats these steps in your language.

| Column | What it means | What you do |
| --- | --- | --- |
| Priority (1 = safety) | 1 is safety wording: speeds, mirrors, crossings, lifting, ID checks, damage. A mistake here could teach the wrong thing. | Nothing. Spend the most care on these. |
| New since the last sheet | `new` means the line was added or changed since the last sheet. These rows come first. | If you have reviewed a sheet before, you can stop after the `new` rows. |
| English | The line as the game says it in English. | Read it. |
| (your language) (machine translation) | What the game shows now. | Read it next to the English. |
| Corrected translation | Empty. | Write a better translation here **only** if the current one is wrong. Leave it blank if it is right. |
| Comment | Empty. | Anything else: a doubt, a word drivers say differently, "too long". |
| Kind | `text` is a whole line. "sentence with {0} {1} filled in by the game" means the game puts a number or a name where `{0}` is. | Keep every `{0}`, `{1}` in your correction, in the place that reads right. |

## What to check

1. **Meaning.** Does it say the same as the English? Above all for safety rows: "stop", "wait", "never", "before" and
   numbers must be exactly right.
2. **Safety wording.** Would a new driver do the right thing after reading it? Say if a word is too soft ("may" for
   "must") or too strong.
3. **Tone.** Plain, friendly, as a good trainer speaks to a new driver. Not formal or legal language, and not slang.
4. **Length.** The text appears on buttons and small cards. If your correction is much longer than the machine
   translation, say so in the Comment, or find a shorter way.
5. **Words to keep in English.** Key names (Tab, Enter, Space, Backspace) stay in English: they are what is printed on
   the keyboard.

You do not need to check every row. Safety rows (priority 1) and `new` rows matter most.

Some rows already have a Comment that starts with "Question from the team:". These are the rows we are least sure of,
and they come first. Answer in the same cell, after the question, and correct the translation if it needs it.

## How to send it back

1. Do not add, delete or move rows or columns, and do not change the English column. We match your corrections to the
   game by the English.
2. Save it as **CSV UTF-8**:
   - Excel: File → Save As → "CSV UTF-8 (Comma delimited)". The plain "CSV" choice loses non-English letters.
   - Google Sheets: File → Download → Comma-separated values.
   - LibreOffice: keep the format, with character set "Unicode (UTF-8)".
3. Keep the file name, for example `ta-safety.csv`, and send it back to the person who sent it to you.

We put your corrections into the game. The next sheet you get marks only what changed since then as `new`.

## For the team

- Make the sheets with `node test/tools/review-sheet.js`.
- Apply a sheet that comes back with `node test/tools/review-sheet.js --apply <file.csv>`. Add `--dry-run` first to see
  what it would change. It matches each correction by the English. It refuses a correction that loses a `{0}`, and it
  refuses a whole file saved without UTF-8. It prints the reviewer's comments and any English the game no longer has.
- Questions for the reviewers go in `docs/review/questions.json` (language, then the English line). The tool writes
  them into the Comment cells and puts those rows first, and `--apply` prints the reviewer's answer after each one.
- `docs/review/OPEN-QUESTIONS.md` lists every question by language, to send with the sheets. After changing
  `questions.json`, run `node test/tools/open-questions.js` to rewrite it (`test/reviewsheet.js` fails until you do).
- Once every sheet is applied, run the tool with `--reviewed` to clear the `new` marks and the questions.
- The first row (Kind "how to review") is these steps in short. The tool never counts it as a line. `test/reviewsheet.js`
  checks that each sheet reads cleanly as a spreadsheet and starts with this row in its language.
