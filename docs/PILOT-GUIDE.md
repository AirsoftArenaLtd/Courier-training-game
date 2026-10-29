# Trainer's guide to the pilot

For the person running the training: how to get ready, how to run a first session, how to read the results, and
what to do when something goes wrong (one printable page: `docs/QUICK-START.md`). Plain words; the technical detail is in the other documents it points to. What changed in each milestone: `docs/CHANGES.md`.
The trainer sections of this guide are also in the game's other 11 languages, each as `docs/PILOT-GUIDE.<lang>.md` (`ta`,
`hi`, `bn`, `es`, `fr`, `gu`, `kn`, `ml`, `mr`, `pa`, `te`), as machine drafts awaiting native review; this English page
is the reference.

**What trainees do.** They sign in, practise and are assessed on the training modules (sorting, lifting, driving,
loading, stops), and play a **workday**: a full courier day in 3D. They read the morning brief at Dispatch, check the
load against the manifest, load the van, check it, drive, deliver five stops (dogs, signatures, ID checks, wrong
addresses, weather, messages from Dispatch), return what they could not deliver and finish at Dispatch. Safety, efficiency
and service are scored from 0 to 3 stars each. The first day is gentle and a short guide (opened again with **H**)
explains the controls. Later days ask more: a signature on every parcel, photo ID checks, fog, rain and ice on a set
schedule, and a street closed by road works with a detour. Planning windows on later days are a guide only and never
score points. The day ends with a results screen, a debrief that shows what went well and
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
**3D workday aids…** (next to Save rules) sets the help in the 3D workday: driving assists, the sat nav, whether
trainees must also get out and look before reversing into a tight space (optional by default: the rear camera does that
job; "Required" applies to the tight-driveway practice), night and dusk runs, and van damage with its damage reports.
"Fade by day" (the default) gives full help on a trainee's first workday, less on the next two and little from the
fourth. Press **Save rules** afterwards.

**4. Company look.** Your IT or the game's maintainer fills in the company name, colours and logo in `data/theme.js`
(and `brand` in `data/config.js`). The van, depot sign, handheld and uniform in 3D then use them.

**5. Language and comfort.** Each trainee can pick their language, larger text, a colour-blind setting, key
remapping, reduced motion and narration in **Settings → Accessibility**. Sound (engine, indicators, doors, scans, rain)
has a volume and a mute (the speaker button or the pause menu); every sound also has a text caption, and sound pauses while
narration speaks, so no one needs to hear it to play. If a PC struggles with the 3D, set
**Settings → Graphics → Low**. Translations are machine drafts until native speakers have reviewed them
(`docs/review/`); tell trainees to report wording that looks wrong.

**6. Gamepad.** A standard gamepad also works in the 3D world: press one of its buttons, then let go of every control.
**Esc → Controls and guidance → Gamepad controls** shows what each button does and lets a trainee give any action a
different button or change the stick sensitivity; their choices are saved with their progress. The keyboard and mouse
keep working.

**7. Modules in 3D.** Some training modules can also be played in the 3D world: Route & Driving so far, more as they are
finished. **Settings → Trainer → 3D workday aids… → Modules in 3D…** chooses for each module **Where ready** (the 3D
version once it has passed its checks, otherwise 2D; the default), **3D** or **2D**; press **Save rules** afterwards. A
PC without 3D graphics always plays 2D. Stars, records and the certificate are the same either way.

## A first session (about an hour)

| Time | What | Notes |
| --- | --- | --- |
| 10 min | Welcome. Explain the day: the point is to learn safe habits, not to be fast. | Say that mistakes are the lesson, and the record is for training, as agreed with the company. |
| 5 min | Sign in; check the language, text size and keys. | Show **Settings → Accessibility**. |
| 30 min | Each trainee plays a **workday**. | This is an estimate: the first day is slower, a later one faster. Do not rush them; the day saves as they go. They can leave from the pause menu and resume later. To keep their stops so far they resume on the same PC: where they were in the 3D town is kept on that PC only (their course progress, stars and record are kept by the server or the LMS whatever the PC). On another PC the game asks before starting the day again from the morning. |
| 15 min | Debrief together. | Use **Results → Debrief** and the **drive map** (a pin at every driving mistake; its shape shows the kind: a diamond for a road sign or a red light, a star for damage to the van, a triangle for a low bridge, a hexagon for a shifted load, an arrow for a wrong turn). Ask: what was the hardest stop, and what would you do differently? |

**The cab, before they drive.** The 3D van's cab works like a real one, and it is worth one minute of showing:

- **Mirrors** are always on and always live. There is no mirror button: a trainee checks a mirror by *looking at it*
  for a moment. The left mirror must be checked just before moving off, and the mirror on the side they are turning
  or changing lanes to just before they steer (a check counts for about four seconds). Each one is marked on the
  results, and a missed check is a pin on the drive map.
- **Signals** (B-138): Q for left, C for right, or the stalk by the wheel. The indicator must be on the right way for
  at least three seconds before the van moves off after a stop (backwards too) and before a turn; then the mirror check.
  A missing or late signal is a pin on the drive map. The indicator does not cancel itself: press the key again.
- **Gears** are the P-R-N-D selector by the wheel: look at it and press the action key (E), or press R to switch
  between Drive and Reverse. The van must be stopped to change gear.
- **Reversing:** selecting R switches on the rear camera screen on the dashboard by itself. Its guidelines bend with
  the steering, and coloured distance marks, sensor bars, a written distance and quiet beeps warn of anything behind.
  Trainees do not need to get out and look; they should reverse at walking speed and keep watching. Contact, or more
  than 5 mph in reverse, is marked on the results. **Choose a reversing space** in the 3D menu (H) offers an alley, a
  loading dock and a tight driveway to practise on their own, without affecting the workday.
- **The sat nav** on the dashboard shows the route, the next turn, how far and the street. A missed turn reroutes, and
  the trainee has 30 seconds to rejoin before it counts as leaving the route. **3D workday aids…** sets it to the full
  map, the route line only, or off.
- **Road signs** stand where they would in a town: street names at corners, house numbers, stop and give-way signs,
  speed limits, school zones, one-way and no-entry streets, road works and traffic lights. **J** reads the sign in view
  aloud (for trainees using narration). Each sign is one check: stopping fully, giving way, keeping to the limit,
  stopping at a red light (driving through a red light or into a no-entry street is critical).
- **The rest is where it is in a van:** parking brake (Space or the lever), belt (B or the buckle), indicators (Q and C
  or the stalk), headlights (L) and wipers (K). P turns the view to each control in turn and says what it does, so a
  trainee who cannot use a mouse can do all of it from the keyboard.

**What the day looks like.** The town, the van and the people are 3D models now (free CC0 models; their makers are
thanked under **Credits** on the title screen). Each workday has a time and weather of its own, so tell trainees what to
expect:

- **Time of day:** morning, midday, dusk or night. At dusk and at night the cab tells the trainee to switch the
  headlights on before moving (L, or the light switch). Night runs can be turned off in **3D workday aids…**.
- **Weather:** rain on the windscreen (the wipers clear it: K, or the stalk), fog that hides distance, snow and ice.
  The weather changes what the trainee sees and how far ahead they can look, not the rules: drive to the conditions.
- **People:** residents come to the door and the courier is animated; nothing about them is scored.

**From the third workday** the stops get richer. Many have a **parcel locker** (open the right compartment, scan, put
the parcel in, close it, photograph the closed door), some an **apartment intercom** (the right flat's button, say who
you are, wait for the buzz; a gate stays shut until it is unlocked), and a few a **business reception** (confirm the
address, take the person's name and signature). When nobody is in for a parcel that needs a signature, the trainee
records a **failed delivery**: a card, the reason, a slot the next afternoon, and the parcel goes back to Returns.

**From the fourth workday** the day asks more of the trainee:

- **Walk round the van.** Before the first drive, the trainee walks round the parked van and records the condition of
  seven areas (front, rear, both sides, the roof edge, the rear left wheel and the left mirror): P selects an area's
  mark, E inspects it, and the handheld lists what can be seen. Wear that was already there is never blamed on them.
  Back at the depot, they walk round again before **Finish workday** and record any new damage where it is.
- **Damage and low clearances.** Clipping a post, a parked car or a bollard marks the van where it was hit: a scuff, a
  dent or major damage (major is critical). Low bridges and overhangs are signed with the van's height; the right
  answer is to stop or take another street. **Damage the trainee caused and did not record after the trip is a
  critical mistake**, because the next driver inherits it. Recording damage that is not there costs points too.
- **The dispatch radio.** About twenty metres into the first drive, Dispatch calls once. The caption says so; the
  trainee stops, sets the parking brake and reads it on the handheld (it waits until they are parked). On even days it
  brings one delivery forward, on odd days it asks for a check-in at a parked spot on the way. Following it counts in
  service; declining or ignoring it is a missed update, but never stops them finishing the day.
- **Night.** Every third day from the sixth runs after dark. The cab warns before the van moves without headlights,
  and each leg driven without them in the dark counts against safety. Oncoming headlights give a little glare, which
  reduced motion removes (**Esc → Settings → Accessibility → Turn reduced motion on** in the 3D world, or the PC's own
  reduced-motion setting).

Night runs and van damage (with its walk-round reports) can each be turned off in **3D workday aids…**, for example
for a first session with a group that has never driven a van.

If a PC is slow with all of this, **Settings → Graphics → Low** draws less and keeps the same day.

Practice modules and assessments can come before or after the workday. A good order is: one practice session on
the modules the company cares about most, then the workday, then the assessments.

## Reading the results

**On a trainee's screen**
- **Results:** stars in safety, efficiency and service, and the score.
- **Debrief:** every stop, with what was done right or wrong and why. Critical mistakes (for example passing a school bus
  with its lights flashing, or handing an age-restricted parcel to someone without checking ID) cap a category at one
  star however well the rest went.
- **Drive map:** a pin where each driving mistake happened, with the lesson.
- **Replay the last mistake** (on the results and the drive map, after a 3D workday): the last few seconds before the
  latest mistake, from the driver's seat, with play, pause and half-second steps. It is kept only in the browser's memory,
  so it is gone once the tab is closed or another workday starts, and nothing of it is saved or scored.
- **My record ›:** every module, the dates and the lessons that keep coming back. **Print / PDF** gives the page to file.

**For you** (**Settings → Trainer**, trainee list on the right)
- Open a trainee to see their record. **Allow retakes** gives one more attempt at every assessment they have not passed.
  **Reset** starts their progress again (the old file is kept as a backup for 30 days).
- **Before and after** prints a page for the whole group: each trainee's first workday next to their latest, and how the
  group's average score, stars, critical errors and share meeting every pass mark moved. From the third workday, with
  traffic, it also shows road habits per day: red lights driven through, wrong turns, not giving way and turning across a cyclist. Use it at the end of the
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
| A gamepad does nothing | With the 3D world open, press one of its buttons, then let go of every control. Only gamepads the browser reports as standard work; the keyboard and mouse always do. **Gamepad controls → Restore default gamepad controls** undoes a remapping. |
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
