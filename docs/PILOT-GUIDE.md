# Trainer's guide to the pilot

For the person running the training: how to get ready, how to run a first session, how to read the results, and
what to do when something goes wrong. Plain words; the technical detail is in the other documents it points to.

**What trainees do.** They sign in, practise and are assessed on the training modules (sorting, lifting, driving,
loading, stops), and play a **workday**: a full courier day in 3D. They read the morning brief at Dispatch, check the
load against the manifest, load the van, check it, drive, deliver five stops (dogs, signatures, ID checks, wrong
addresses, weather, messages from Dispatch), return what they could not deliver and finish at Dispatch. Safety, efficiency
and service are scored from 0 to 3 stars each. The day ends with a results screen, a debrief that shows what went well and
what to fix, and a record you can print.

## Before the first session

**1. IT sets up the server** (one time, `docs/IT-NOTES.md`)
- The training server runs with `node server/server.js` and needs one address and port that the training PCs can reach.
  It needs no internet.
- IT sets your **trainer PIN** (`OTR_TRAINER_PIN`). Without it the trainer tools stay off.
- Training PCs need a current Chrome, Edge or Firefox with hardware graphics (WebGL) on. Check one PC before the
  first session: open the game and start a workday.

**2. Accounts.** If trainees sign in with an employee ID and password: in the game open **Settings → Trainer**, enter
your PIN, press **New account**, type the employee ID and the name, and give the trainee the temporary password shown
(it is shown once). On the first sign-in the trainee chooses their own password. Forgotten password: **Manage → New
password**. If the company already signs trainees in (an LMS or the company login), there is nothing to do here
(`docs/SIGN-IN.md`).

**3. Your rules** (**Settings → Trainer**, left side, **Academy rules**). Choose what trainees can do (practice and
assessment, or only one of them), the **pass mark** (stars needed in each category), how many **assessment attempts**
each scenario allows, and when a **refresher quiz** is due. These apply to everyone on the server.

**4. Company look.** Your IT or the game's maintainer fills in the company name, colours and logo in `data/theme.js`
(and `brand` in `data/config.js`). The van, depot sign, handheld and uniform in 3D then use them.

**5. Language and comfort.** Each trainee can pick their language, larger text, a colour-blind setting, key
remapping, reduced motion and narration in **Settings → Accessibility**. If a PC struggles with the 3D, set
**Settings → Graphics → Low**. Translations are machine drafts until native speakers have reviewed them
(`docs/review/`); tell trainees to report wording that looks wrong.

## A first session (about an hour)

| Time | What | Notes |
| --- | --- | --- |
| 10 min | Welcome. Explain the day: the point is to learn safe habits, not to be fast. | Say that mistakes are the lesson, and the record is for training, as agreed with the company. |
| 5 min | Sign in; check the language, text size and keys. | Show **Settings → Accessibility**. |
| 30 min | Each trainee plays a **workday**. | This is an estimate: the first day is slower, a later one faster. Do not rush them; the day saves as they go. They can leave from the pause menu and resume later. |
| 15 min | Debrief together. | Use **Results → Debrief** and the **drive map** (a pin at every driving mistake). Ask: what was the hardest stop, and what would you do differently? |

Practice modules and assessments can come before or after the workday. A good order is: one practice session on
the modules the company cares about most, then the workday, then the assessments.

## Reading the results

**On a trainee's screen**
- **Results:** stars in safety, efficiency and service, and the score.
- **Debrief:** every stop, with what was done right or wrong and why. Critical mistakes (for example passing a school bus
  with its lights flashing, or handing an age-restricted parcel to someone without checking ID) cap a category at one
  star however well the rest went.
- **Drive map:** a pin where each driving mistake happened, with the lesson.
- **My record ›:** every module, the dates and the lessons that keep coming back. **Print / PDF** gives the page to file.

**For you** (**Settings → Trainer**, trainee list on the right)
- Open a trainee to see their record. **Allow retakes** gives one more attempt at every assessment they have not passed.
  **Reset** starts their progress again (the old file is kept as a backup for 30 days).
- **Before and after** prints a page for the whole group: each trainee's first workday next to their latest, and how the
  group's average score, stars, critical errors and share meeting every pass mark moved. Use it at the end of the
  pilot to show whether training worked. It needs at least two workdays from each trainee you want to compare.
- A trainee's **certificate** is available from their record once every module is passed in assessment.
- **Their data** lets you download everything held about one trainee or erase it (`docs/DATA.md`). Erase only when
  the company's data rules say so; it cannot be undone.

**If the company uses an LMS:** the course shows as complete once every module is passed in assessment and a workday
is finished, and passed once the best workday met your pass marks.

## When something goes wrong

| What you see | What to do |
| --- | --- |
| A trainee cannot sign in | Check the employee ID (case does not matter). Five wrong tries lock it for 15 minutes; **Manage → New password** unlocks it at once. |
| The game does not start, or "WebGL is required" | Graphics acceleration is off or blocked. Open `chrome://gpu` (Edge: `edge://gpu`) and look for "WebGL: Hardware accelerated". Ask IT to turn it on; try **Settings → Graphics → Low**. |
| The 3D is slow or jerky | **Settings → Graphics → Low**, close other windows and tabs, and plug the laptop in. Tell the game's maintainer the PC model: the pilot measures real PCs. |
| Progress seems lost | On the training server it is kept per employee ID: check they signed in with the same ID. In browser-only mode progress lives in that browser and clears with its site data. |
| The text looks wrong in a language | Write down the screen and the text; the native-review sheets in `docs/review/` are where corrections go. |
| A trainee wants their data removed | **Settings → Trainer → the trainee → Their data**. |
| The server is down | Trainees can keep playing: progress is kept on their PC and sent when the server answers. Ask IT to restart `node server/server.js`; nothing is lost. |

## Who to contact

Fill these in for the pilot:

- The company's training lead: ______________________
- IT for the training server and the PCs: ______________________
- The game's maintainer (bugs, wording, the company theme): ______________________

When you report a problem, say the trainee's employee ID (not their password), what they were doing, the time, and the
screen. A screenshot helps.
