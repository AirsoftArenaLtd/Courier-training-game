# Human-style review: shell

Area: everything around the scenarios: title screen, profile and name entry, Continue, the hub (module cards,
scenario briefs, stars, rank, stats tiles, dispatch radio, sound and settings, Start/Resume route), the pause menu
from several kinds of scene, results screens, the day summary and route debrief, saving and reloading, progression,
keyboard navigation and overall visual consistency.

Tester: shell agent, play tool on port 9307, screenshots in `test/out/review/shell/`.

## Findings

### SHELL-1: Title screen: the woman and her dog walk over the top of the van
- **Severity:** polish (but it is the first screen every trainee sees)
- **Where:** TitleScene, any time the left-walking pedestrian passes x 760-1040
- **Repro:** open `index.html?dev=1`, let the title run ~20 s until the woman with the dog walks past the parked van.
- **Expected:** people on the pavement pass *behind* the van (the van is on the road, nearer the camera).
  **Actual:** the woman and the dog are drawn in front of the van; their feet (pavement line y 566) are level with the
  van's roof (top y 516), so they appear to stroll across the van's roof and windscreen. The courier walking the other
  way does the same when he reaches the van.
- **Evidence:** `test/out/review/shell/04-title-walker-over-van.png`
- **Suspected cause:** `src/scenes/TitleScene.js:54` van depth -20, `:67` courier depth -10, `:74-76` woman and dog
  depth -9, so both walkers sort above the van.
- **Suggested fix:** put the walkers below the van (for example van -8, walkers -12/-11), or move the van to the far
  kerb. Related polish: the pavement tile scrolls at 26 px/s (`:163`) but the houses standing on it at 13 px/s
  (`:166`), so the houses visibly slide along the pavement slabs and the walkers' feet slide relative to the ground.
- **Status:** fixed — the van is drawn in front of the people on the sidewalk (van −8, its exhaust −9, the walkers −11
  and −12), so they pass behind it; the houses now drift at the sidewalk's 26 px/s, so nothing slides along the slabs.

### SHELL-2: Name entry rejects accented letters, so many trainees cannot type their own name
- **Severity:** minor (design: respect for trainees' names at an enterprise customer)
- **Where:** Title > Start Training > "What's your name, courier?" (and Settings > Rename Courier)
- **Repro:** type `Jos`, then press `é` (any accented or non-Latin letter: é ñ ü ø å ç, or an emoji).
  (I sent the keydown events with `/eval` `window.dispatchEvent(new KeyboardEvent('keydown',{key:'é'}))`, which is
  exactly what a Spanish, French or Nordic keyboard layout produces.)
- **Expected:** `José`, `Zoë`, `Núñez`, `Björn`, `Siobhán` can be typed.
  **Actual:** the key is silently ignored; the field stays `Jos`. There is no message saying which characters are
  allowed. `! @ _ ,` are also silently dropped.
- **Evidence:** `test/out/review/shell/08-name-accents-rejected.png`
- **Suspected cause:** `src/core/ui.js:343` whitelist `/[A-Za-z0-9 .'\-]/`.
- **Suggested fix:** accept any printable letter, e.g. `/^[\p{L}\p{M}\p{N} .'\-]$/u`, and still block emoji and
  control keys. If a character must be refused, flash the hint line ("Letters, spaces, . ' - only").
- **Status:** fixed — any letter in any script is accepted, with its accents (`/^[\p{L}\p{M}\p{N} .'\-]+$/u`: José,
  Zoë, Núñez, Björn, Siobhán); a refused key (emoji, ! @ _ ,) turns the hint line red for a moment: "Letters, numbers,
  spaces and . ' - only".

### SHELL-3: Names are silently cut at 16 characters; a 16-character name then overflows the hub profile card
- **Severity:** minor
- **Where:** name entry; Hub profile card; Title "Continue as ..." button
- **Repro:** at the name prompt type `Mary-Kate O'Brien` (17 characters). The field stops at `Mary-Kate O'Brie`,
  with no counter or message. Then (stress case) create a profile named with 16 capital W's and look at the hub.
- **Expected:** a visible limit (counter such as `16/16`, or the field flashing when full) and a name that always fits
  the profile card (scale it down or ellipsize).
  **Actual:** the last letter of a real name is dropped silently; on the hub a wide 16-character name runs off both
  sides of the profile card, from x 0 to x 305, into the Training Academy column.
- **Evidence:** `test/out/review/shell/07-name-long-truncated.png`, `test/out/review/shell/10-hub-first-16W.png`
- **Suspected cause:** `src/core/ui.js:306` `MAX = 16` with no feedback; `src/scenes/HubScene.js:55` draws the name
  at 21 px with no fit.
- **Suggested fix:** raise the limit to about 24 and show a counter; in the hub, `setScale(Math.min(1, 240 / t.width))`
  on the name text (the module titles already do this at `HubScene.js:142`).
- **Status:** fixed — the limit is 24 characters with a counter in the field ("17 / 24"), and a key past it says so on
  the hint line; the name in the field, on the hub's profile card and on the title's "Continue as …" button is scaled
  down to fit when it is wide.

### SHELL-4: Empty-name submit gives almost no feedback
- **Severity:** polish
- **Where:** name entry, pressing Enter or "Let's Roll!" with nothing typed
- **Repro:** Start Training, press Enter immediately.
- **Expected:** a clear message ("Type your name first").  **Actual:** a 10 px, 0.3 s wiggle of the dialog plus the
  "fail" sound; with sound off (typical on an office PC) it looks as if the button is broken. The screenshots taken
  during the wiggle show no visible change at all.
- **Evidence:** `test/out/review/shell/06-name-empty-shake-2.png`
- **Suspected cause:** `src/core/ui.js:331-334`.
- **Suggested fix:** also turn the hint line red with "Type your name first", and disable "Let's Roll!" while empty.
- **Status:** fixed — "Let's Roll!" is grayed out while the field is empty, and ENTER on an empty field turns the hint
  line red: "Type your name first" (with the wiggle and the sound as before).

### SHELL-5: The morning briefing has no pause menu and no way back to the hub
- **Severity:** minor
- **Where:** Hub > Start the route > ShiftBriefScene (DAY 1 · MORNING BRIEFING)
- **Repro:** start a route day, press ESC (or look for a pause or back button) during the dispatcher's talk or the
  three-points-of-contact question.
- **Expected:** ESC opens the same pause menu as every other scene (Resume / Restart / Quit to Shift Board / sound),
  so a trainee who clicked "Start the route" by mistake, or is called away, can get out.
  **Actual:** ESC does nothing, there is no on-screen pause or mute button; the only ways out are to finish the
  briefing (a spoken intro plus a quiz) or reload the page. The debrief (ShiftDebriefScene) likewise has no pause, but
  it has its own "Back to the station" button, so that one is fine.
- **Evidence:** `test/out/review/shell/18-m3-start.png`, `test/out/review/shell/20-brief-q.png` (no pause/mute control)
- **Suspected cause:** `src/scenes/shift/ShiftBriefScene.js` extends `Phaser.Scene` and never binds ESC; only
  `BaseScenarioScene.js:24` and `TownDriveScene.js:469` open `PauseScene`.
- **Suggested fix:** bind ESC to `PauseScene` here too (title "Morning briefing"), and add the corner pause/mute
  buttons the other scenes have.
- **Status:** fixed — the morning briefing has the corner pause button and ESC, with Resume and "Quit to the station"
  (the briefing stays saved as the day's first part, so the hub offers to resume it); "Start the route" on the hub
  asks first ("Start day 1's route?" with how long it takes).

### SHELL-6: Pause menu: "Restart" and "Quit" throw the run away with no confirmation, and "Shift Board" is a screen that does not exist
- **Severity:** minor
- **Where:** PauseScene, from any scenario (seen in m3-missing, m3-signature, m2-sort)
- **Repro:** start m3-signature from the hub, answer three questions, ESC, click "Quit to Shift Board" (or "Restart").
- **Expected:** a one-line "Leave this scenario? Your progress in it is lost." confirm (the hub already has one for
  "Abandon this route"), and the button named after the screen it goes to.
  **Actual:** one click discards the run immediately, and Restart sits directly under Resume, where a mis-click or a
  slip of the mouse lands. The hub is titled "TRAINING ACADEMY" / "DAY 1 · STATION" and nothing on it says "Shift
  Board", yet the pause menu ("Quit to Shift Board"), the results screen ("Shift Board ▶") and the day summary
  ("Head back to the Shift Board") all use that name (also noted in ROUTEDAY-21). Only ESC has a keyboard shortcut (Resume); Restart, Quit and the
  sound toggle are mouse-only, and none of the buttons shows its key.
- **Evidence:** `test/out/review/shell/22-pause-dialogue.png`, `test/out/review/shell/23-pause-crop.png`
- **Suspected cause:** `src/scenes/PauseScene.js:24-35`; `ResultsScene.js:108`; `DaySummaryScene.js:40`.
- **Suggested fix:** confirm Restart and Quit with `OTR.ui.confirm`; rename to "Quit to Station" / "Back to the Station"
  (the name the hub and the route debrief use), or title the hub "Shift Board"; add R / Q shortcuts and show key hints.
- **Status:** fixed — Restart and Quit each ask first ("Restart this stop?" / "Quit to the station?", saying what is
  lost; on a route day that the day is kept and the station offers to resume it); R restarts, Q quits, C shows the
  controls and ESC resumes, and every button shows its key. The screen is called "the station" everywhere (WP4).

### SHELL-7: The how-to-play card is a dead end: ESC and the pause button do nothing until you press Start
- **Severity:** minor
- **Where:** every scenario's intro card (BaseScenarioScene.introCard), e.g. m2-sort "Sort Belt"
- **Repro:** from the hub open a scenario (or boot `?scenario=m2-sort&dev=1`); on the intro card press ESC, then click
  the ‖ pause button in the top-left corner.
- **Expected:** ESC or ‖ opens the pause menu (or the card has a "Back" button) so a trainee who opened the wrong
  scenario can leave. **Actual:** nothing happens (state stays `SortingScene(modals 1)`); the only way on is "Start!",
  which starts the clock (2:34 in m2-sort), then ESC → Quit.
- **Evidence:** `test/out/review/shell/27-m2sort-esc-on-intro.png`
- **Suspected cause:** `BaseScenarioScene.js:73` `openPause()` returns while `_openModals > 0`, and the modal's
  full-screen interactive dim swallows the click on ‖.
- **Suggested fix:** give the intro card a "Back to Station" secondary button, or let ESC on it open the pause menu.
- **Status:** fixed — ESC and the corner ‖ button open the pause menu on a scenario's how-to card as well (the card's
  dim no longer swallows the click), so a trainee who opened the wrong scenario can quit from there; Resume brings the
  card back.

### SHELL-8: Results: the "NEW BEST" stamp lands on top of the first category's stars and its "▲ BEST" tag
- **Severity:** polish (happens on every improved replay, the moment a trainee is meant to feel good)
- **Where:** ResultsScene after a replay that beats the previous best (m3-missing: 1+1 stars, then 3+3)
- **Repro:** play Where's My Package?! once with weak answers, then Play Again with the best answers; wait for the
  stars to fill.
- **Expected:** the stamp in free space (the empty area right of SCORE, or across the header).
  **Actual:** the rotated orange "NEW BEST" stamp is drawn over the Service row: it hides most of the three stars
  and the green "▲ BEST" label beside them, and stays there (`keep: true`).
- **Evidence:** `test/out/review/shell/38-results-newbest.png`, `test/out/review/shell/39-results-newbest-crop.png`
- **Suspected cause:** `src/scenes/ResultsScene.js:124` stamps at `(px + 290, py - ph/2 + 170)`, which is the first
  category row (`y = -ph/2 + 150 + 18`, stars at `catX + 170`, "▲ BEST" at `catX + 270`).
- **Suggested fix:** stamp at about `(px - 100, py - ph/2 + 190)` (right of the score), or on the header band.
- **Status:** fixed — the "NEW BEST" stamp sits under the star total on the left of the card, clear of the category
  rows and their "▲ BEST" tags.

### SHELL-9: Hub rank bar disagrees with its own label after the first rank-up ("18 / 34 ★" but the bar is 20 % full)
- **Severity:** minor (progression is the thing a trainee watches)
- **Where:** Hub profile card, COURIER RANK row, any rank above New Hire
- **Repro:** earn 18 career stars (m3-missing, m3-signature, m3-twostops with the best answers; the third one gives
  "RANK UP! You're now Rookie"), return to the hub.
- **Expected:** a label and a bar that tell the same story: either "4 / 20 ★ to Courier" with a 20 % bar, or
  "18 / 34 ★" with a 53 % bar. **Actual:** the label says `18 / 34 ★` (career total / next threshold) but the bar
  shows progress *within* the Rookie band, (18-14)/(34-14) = 20 %. At New Hire the two agree only because that band
  starts at 0 (6 / 14 showed 43 %). The results screen's career bar has the same within-band fill but no numbers at
  all ("CAREER 18 ★" over an unlabelled bar), so there it is unclear what the bar measures.
- **Evidence:** `test/out/review/shell/43-hub-rank-bar.png`, `test/out/review/shell/41-rankup.png`
- **Suspected cause:** `src/scenes/HubScene.js:66` prints `info.total / info.next.stars`, while `:68` fills
  `info.progress` from `src/core/save.js:126` (band-relative). `ResultsScene.js:98-104` likewise.
- **Suggested fix:** label the band: `${total - rank.stars} / ${next.stars - rank.stars} ★ to ${next.name}` (hub and
  results), or fill the bar with `total / next.stars`.
- **Status:** fixed — the hub's rank row now counts the stars of the current band ("4 / 20 ★") like its bar, and the
  results card labels its career bar ("CAREER 18 ★ · 4 / 20 ★ to Courier", `OTR.save.rankLabel`).

### SHELL-10: The day summary can never be reached (dead screen), and the "day" only moves on after a route day
- **Severity:** design (flagging so nobody spends time polishing a screen trainees never see)
- **Where:** DaySummaryScene; `ResultsScene` "End of Day ▶"; hub brief "Day full: bank it ▶"
- **Repro:** read `data/config.js:49` `scenariosPerDay: 99`; `save.todayFull()` needs 99 *different* scenarios in
  `today.completed` (one slot per scenario id, `save.js:170-179`), and there are 24.
- **Actual:** the clipboard-style day summary with the dispatcher's note and "Start Day 2 ▶", the results screen's
  "End of Day ▶" label and the brief's "Day full: bank it ▶" are all unreachable. The hub's "DAY n" and the title's
  "Day n · Rookie · 18 ★" only advance when a route day is finished (`shift.js:333` calls `save.endDay()`), so a
  trainee who only practises stays on "DAY 1" for ever; when a route day does end, `endDay()` writes that day's
  *practice* stars into `history` under the route day's number, mixing the two logs.
- **Suggested fix:** either delete DaySummaryScene and the "day full" branches, or decide what a practice "day" is
  (e.g. one calendar day) and reach the summary from the hub. Keep route-day and practice history separate.
- **Status:** fixed (decision) — removed: the practice "day" had no meaning (99 scenarios a day), so DaySummaryScene,
  the results screen's "End of Day ▶", the hub brief's "Day full: bank it ▶" and the save's per-day slots are gone.
  The day counter is the route day: it moves on when a route day ends, and the route keeps its own history
  (`save.data.route`); practice results are no longer written into a day history under the route day's number.

### SHELL-11: Menus are mouse-only apart from a hidden Enter/ESC, and no button shows its key
- **Severity:** minor (keyboard-heavy trainees, and anyone with a trackpad on a laptop)
- **Where:** Title, Hub, scenario brief, Settings, Pause, Results, Rank-up
- **Repro:** try to reach and start a scenario, open Settings, or leave the pause menu without the mouse.
- **Actual:** there is no focus, Tab or arrow-key navigation anywhere. What works is invisible: Enter = the orange
  button (Title "Continue", Hub "Start the route"/"Resume route", brief "Start", results "Shift Board"), R = results
  "Retry", ESC = close brief/settings or pause/resume. The hub's 24 scenario cards, Settings, the sound toggle, "New
  Profile", "Abandon this route", pause "Restart"/"Quit" cannot be reached by keyboard. The rank-up card answers
  **Space only** ("Nice!"): Enter, which the trainee has used on every other card, does nothing
  (`ResultsScene.js:139`). A stray Enter on the hub starts a whole route day (brief, pre-trip, load...) with no
  confirmation and, per SHELL-5, no way back out of the briefing.
- **Evidence:** state after Enter on the rank-up card: `ResultsScene modals:1`; after Space: `modals:0`.
- **Suggested fix:** add arrow/Tab focus with a visible ring to `OTR.ui.button` groups (title menu, pause menu, modal
  buttons, the hub grid); show small key chips on buttons that have keys ("Retry R", "Shift Board ⏎", "Resume ESC");
  give the rank-up card `key: ['ENTER', 'SPACE']`.
- **Status:** fixed — the title menu, the hub (scenario rows, route card, links, sound and settings), the pause menu,
  the results screen and every dialog can be worked from the keyboard: the arrow keys (and TAB / SHIFT+TAB outside the
  scenarios) move a gold focus ring, ENTER or SPACE presses what it is on; the ring appears only once one of those
  keys is pressed, so the existing keys are unchanged. Buttons with a key show it as a small key cap (⏎, ESC, R, Q,
  C). The rank-up card answers ENTER as well as SPACE.

### SHELL-12: No way to look up the controls once a scenario has started, and Settings has nothing to set
- **Severity:** design
- **Where:** PauseScene; Hub > ⚙ Settings
- **Repro:** start m5-pod, dismiss the cards, forget which key opens the handheld or walks carefully; press ESC.
- **Expected:** the pause menu repeats the scenario's controls line (the brief already has it: `sc.controls`) and the
  objective; Settings holds the options a trainee on a shared office PC needs.
  **Actual:** the pause menu has only Resume / Restart / Quit / a sound icon; the controls are shown once, on the brief
  and the intro card, and nowhere after. Settings holds Rename, Back to Title and Reset All Progress. There is no
  volume (only all-or-nothing mute, `audio.js:11` fixes volume at 0.55), and the save has a `settings.hints` flag that
  `StopScene.js:651` honours (hide the objective checklist on route days) but no screen can change, so it is always on.
- **Evidence:** `test/out/review/shell/23-pause-crop.png`, `test/out/review/shell/11-hub-settings.png`
- **Suggested fix:** add a "Controls" block (or button) to the pause menu built from `sc.controls`; add a volume
  slider and the hints toggle to Settings, or remove the unused flag.
- **Status:** fixed (decision) — the pause menu has "Controls" (C), which lists the scenario's controls one per line
  (a route-day stop shows those of the scenario it is played in); the controls lines were brought up to date with the
  keys WP6 and WP7 added. Settings has a sound volume (− / + or click the bar, saved) and the route-day stop checklist
  switch (`settings.hints`, "Stop checklist: shown / hidden").

### SHELL-13: Scenario brief: "Best score … · played N×" is printed on top of the blurb's first line
- **Severity:** polish (every brief of a scenario you have already played)
- **Where:** Hub > any played scenario card > brief (seen on Where's My Package?!, Signature Required, Two Stops)
- **Repro:** finish any scenario, go back to the hub, click its card.
- **Expected:** the best-score line in its own space (under the title in the coloured header, or above the stars).
  **Actual:** the grey 13 px line is drawn at y = top+118, right-aligned, and the 18 px blurb starts at y = top+122
  and runs the full width, so the two collide: "Best score 2500 · played 1×" sits over "dog. Adjust your".
  Checked all 24 briefs with a script: only the played ones overlap; nothing else collides or leaves the screen.
- **Evidence:** `test/out/review/shell/45-brief-bestscore-overlap.png` (texts: `809,207 163x15 Best score 2500 ·
  played 1×` and `318,211 603x43 First a busy office reception…`)
- **Suspected cause:** `src/scenes/HubScene.js:257` (`-h / 2 + 118`) vs `:232` (blurb at `-h / 2 + 122`).
- **Suggested fix:** move it into the header band (white, 13 px, right side at `-h / 2 + 30`) or next to the star rows.
- **Status:** fixed — "Best 5 / 6 ★ · played 2×" is in the brief's colored header, on the right, in white; nothing is
  printed over the blurb.

### SHELL-14: One profile per browser, and progress can silently fail to save
- **Severity:** design (enterprise use: shared training-room PCs, locked-down browsers)
- **Where:** Title "New Profile"; `src/core/save.js`
- **Repro:** (a) profile "sam" with 18 ★; a second trainee on the same PC clicks New Profile: the only option is
  "This erases sam's rank, stars and progress. This can't be undone." → Erase & Start. (b) Read `save.js:55-60`:
  if `localStorage.setItem` throws (InPrivate/Incognito windows with storage blocked, a storage-clearing policy, a full
  quota), the error is swallowed with the comment "progress lasts for this session only".
- **Expected:** several named profiles to choose from on the title (or at least "Switch courier" that keeps the
  other one), and a visible notice when progress cannot be saved ("Progress won't be saved in this window").
  **Actual:** one save slot per browser profile; a trainee who closes a private window, or whose browser clears site
  data at logoff (common on shared corporate machines), comes back to "Start Training" with everything gone and no
  warning beforehand. There is also no way to show a supervisor what was completed (no summary/export/print).
- **Evidence:** `test/out/review/shell/49-newprofile-name.png` (the erase confirm)
- **Suggested fix:** store `profiles: {name: data}` and list them on the title; test storage once at boot and show a
  small banner if it fails; add a printable "training record" (scenarios, stars, dates) on the hub.
- **Status:** fixed (decision) — storage is tested when the game loads and on every save; when it fails, the title and
  the hub show a red "⚠ Progress can't be saved in this window" notice, which opens an explanation (private window,
  blocked site data or a full disk; progress lasts until the tab is closed). "New Profile" already says whose progress
  it erases and asks first. Not changed: one profile per browser; several named profiles (and a printable training
  record) are out of scope for this pass.

### SHELL-15: British and American spelling mixed on the shell screens and in lessons ("Curb-side tires take the kerb hits")
- **Severity:** polish (the rest of the game is US: "8:20 AM", "mph", "Maple Ave", "sidewalk", "windshield")
- **Where:** hub, brief, results; lessons and handheld labels
- **Examples on screen:**
  - Hub "Practise any module, any time" (`HubScene.js:126`), brief "YOU'LL PRACTISE" (`:235`), results headline
    "KEEP PRACTISING" (`ResultsScene.js:36`).
  - Pre-trip lesson: **"Curb-side tires take the kerb hits."**, both spellings in one sentence (`data/m1_pretrip.js:64`).
  - Driving lessons: "Give parked cars a **metre**" (with speeds in mph), "The **tyres** found the road again"
    (`data/m1_driving.js:61`, `:68`).
  - Handheld outcome "Left with **neighbour**" (`data/scanner.js:17`, key `neighbor`); brief "a helpful **neighbour**"
    (`data/modules.js:119`); `neighbor` is used 13 times elsewhere in data.
  - (m8-incident's British English is already DIALOGUE-19.)
- **Suggested fix:** pick US English (FedEx, US addresses, mph) and run a pass: practice, practicing, curb, tires,
  "about three feet", neighbor.
- **Status:** fixed — US English in every player-facing string: practice / practicing (hub, brief, results), curb
  (driving lessons and the town drive's parking prompts), "about three feet", tires, neighbor (handheld, heat lesson),
  canceled, labeled, liter, recognizing, ground / sidewalk for pavement, a package pickup. Code comments and
  identifiers were left alone.

### SHELL-16: Results screen: a score with no scale, a "SHIFT LOGGED" headline on practice runs, and unlabelled career bar
- **Severity:** polish / design
- **Where:** ResultsScene after any academy scenario
- **Repro:** play Where's My Package?! three times (weak, best, worst answers): scores 1400, 1800, 200; later Two
  Stops, Two Styles scores 2500 for the same 6/6 stars.
- **Actual:**
  - SCORE is a bare number counted up in 48 px type, with no maximum, no par, and a different range in every
    scenario (1800 and 2500 are both a perfect run). The brief repeats it ("Best score 1800 · played 3×"). It is the
    biggest number on the screen and tells the trainee nothing; the stars carry the real verdict.
  - The headline for a middling practice run (1-2 stars per category) is "SHIFT LOGGED", although no shift was
    involved; the other headlines are verdicts ("FLAWLESS!", "GREAT WORK!", "KEEP PRACTISING").
  - "CAREER 6 ★" sits over an orange bar with no end label; it is the progress to the next rank (see SHELL-9) but
    nothing says so or names the next rank.
  - Retry (R) and Shift Board (Enter) have keys, but neither button shows them (SHELL-11).
- **Evidence:** `test/out/review/shell/24-m3-outcome.png`, `38-results-newbest.png`, `40-results-worst.png`
- **Suspected cause:** `src/scenes/ResultsScene.js:36` (headline), `:43-50` (score), `:96-104` (career line).
- **Suggested fix:** show score as "1800 / 1800" or a percentage, or drop it in favour of stars; use "GOOD EFFORT" (or
  similar) for the middle band; label the bar "6 / 14 ★ to Rookie".
- **Status:** fixed — the results card shows stars earned out of stars possible ("4 / 6") instead of a bare score, the
  middle headline is "GOOD EFFORT" ("KEEP PRACTICING" below it, US spelling), the career bar is labelled (SHELL-9),
  and the scenario brief says "Best 4 / 6 ★ · played 3×". Key hints on the buttons are SHELL-11 (WP8).

### SHELL-17: Hub polish: unlabelled stat tiles, a "DAY 1 · STATION" pill that looks like a button, orange-on-orange route card
- **Severity:** polish
- **Where:** Hub, left column and header
- **Actual:**
  - The three stat tiles under the rank bar show only a green shield, a blue bolt and a pink heart over numbers
    (`6 3 9`). Nothing says Safety / Efficiency / Service, and there is no hover tooltip; a new hire has to guess
    (the words only appear as chips inside briefs and results). `HubScene.js:72-80`.
  - The header's "DAY 1 · STATION" is drawn with the same orange gradient, sheen, border and shadow as the orange
    buttons ("Start the route ▶"), so it reads as a button; clicking it does nothing. `HubScene.js:32-34`.
  - With a route in progress the card turns orange, and "Resume route ▶" is an orange button on it: the main action
    loses its contrast. "Abandon this route" under it is 12 px peach (#FFD5C0) on orange, hard to read and not
    obviously a link. `HubScene.js:92-106`.
  - The Safety & Wellness card squeezes four rows into the height the others use for three (row pitch 35 px vs 44 px),
    so it looks denser than its neighbours, and its last row sits 14 px from the screen's bottom edge.
- **Evidence:** `test/out/review/shell/16-hub-left.png`, `21-hub-route-in-progress.png`, `15-hub-bottom.png`,
  `14-hub-fresh.png`
- **Suggested fix:** add 10 px labels under the tile numbers (SAFETY / EFFICIENCY / SERVICE); make the day badge a
  flat outlined label; use a white or purple "Resume route" button on the orange card and a white underlined
  "Abandon this route"; let the module grid grow a row for a four-scenario module or give every card room for four.
- **Status:** fixed — the stat tiles are labeled Safety, Efficiency, Service under their numbers; the "DAY 1 ·
  STATION" pill is a flat outlined label, not a button; on the orange route-in-progress card "Resume route ▶" is
  purple and "Abandon this route" is white, bold and underlined (and reachable by keyboard). The four-row Safety &
  Wellness card is SHELL-19.

### SHELL-18: First run: no guidance on where to start, and the default action for a brand-new hire is the full route day
- **Severity:** design
- **Where:** Title "Start Training" → name → Hub (first visit)
- **Repro:** fresh profile (`localStorage.clear()`), type a name, Enter.
- **Actual:** the hub opens with 24 scenario cards all tagged NEW, in eight modules, and a large orange "Start the
  route ▶" (the Enter key's target) that launches the whole day (briefing, pre-trip, load, five stops). Nothing says
  what a route day is compared with the academy, which order the modules are meant in, or where a new hire should
  begin; the only hint is the card text "Brief → pre-trip → load → drive → deliver". Nothing is locked or recommended,
  so a trainee who presses Enter again once the hub appears (as they did to confirm their name) is in the route
  day's briefing, with no way out (SHELL-5).
- **Evidence:** `test/out/review/shell/14-hub-fresh.png`
- **Suggested fix:** a one-time welcome card on the first hub visit ("Start with Module 1: Pre-Trip Walkaround; the
  route day puts it all together"), a "Recommended next" highlight on one card, and either gate the route day behind a
  few academy scenarios or label it "Full day (about N min)". Make Enter on the first visit open the recommended
  scenario's brief rather than the route day.
- **Status:** fixed (decision) — the scenario to play next (the first one not passed, in academy order) is outlined in
  orange with a NEXT badge; for someone who has played nothing the academy header says "New here? Start with the
  scenario marked NEXT", ENTER on the hub opens that scenario's brief instead of the route day (the route day's button
  loses its ENTER key until something has been played), and the keyboard focus starts on it. The route day still asks
  before it starts (WP4).

### SHELL-19: Much of the hub's secondary text is 10-12 px, and the Safety & Wellness card uses smaller row text than the others
- **Severity:** polish (legibility on typical office laptops)
- **Where:** Hub
- **Measured** (effective font size in the 1280×720 canvas, from the scene's Text objects): module subtitles ("Get there
  safely", "Sort it, lift it, label it"…) 11 px; COURIER RANK and "0 / 14 ★" 11 px; DISPATCH RADIO 11 px; "NEW"
  badges 10 px; "Next: Rookie", "0 / 144 ★ · 0/24 scenarios", "Brief → pre-trip → load → drive → deliver", "No route
  days logged yet" 12 px; the title's disclaimer 12 px. The game is scaled with `Phaser.Scale.FIT`
  (`src/main.js:14`), so on a common 1366×768 laptop with the browser's toolbars (viewport about 1366×650) everything
  is drawn at ~0.9×, i.e. 9-11 px on screen, in pale lilac on dark purple.
  The four rows of the Safety & Wellness card ("Watch Your Step", "Dog Encounter", "Heat Wave", "After a
  Fender-Bender") are 13 px where every other card's rows are 16 px: the one card is visibly in a smaller font.
- **Evidence:** `test/out/review/shell/15-hub-bottom.png` (row sizes side by side), `16-hub-left.png`
- **Suggested fix:** 13 px minimum for anything a trainee must read; make the Safety card taller (or the grid 4 rows
  where needed) instead of shrinking its rows (see SHELL-17).
- **Status:** fixed — the hub's secondary text is at least 13 px (module subtitles, COURIER RANK and its count, Next
  rank, the stars / passed line, the route card lines, DISPATCH RADIO, the NEW and NEXT badges, the star counts on the
  rows) and so is the title's disclaimer; the Safety & Wellness rows use the same 14 px titles as every other card
  (the rows start higher to fit four).

### SHELL-20: Nothing pauses the game when the trainee switches to another window
- **Severity:** design (office PCs: Teams/Outlook pop-ups mid-scenario)
- **Where:** every timed scene (Sort Belt's 2:34 clock, heat, the route-day clock, conversations' timed decisions)
- **Repro (code):** there is no `blur` / `visibilitychange` handler anywhere in `src/` (grep). Phaser stops its loop
  only when the tab is *hidden*; when the window merely loses focus (the trainee clicks into a chat window beside the
  browser, or a notification takes focus) the game keeps running, timers keep counting, and the scene is not paused.
- **Expected:** focus loss opens the pause menu (the same `openPause()` ESC uses), so the trainee comes back to
  "PAUSED" rather than to an expired timer or an auto-picked answer.
- **Suggested fix:** in `BaseScenarioScene` and `TownDriveScene`, `this.game.events.on('blur', () => this.openPause())`
  (and remove it on shutdown). *Verified by reading the code, not by play: the headless tool always has focus.*
- **Status:** fixed — a scenario, the town drive and the morning briefing open the pause menu when the window loses
  focus or the tab is hidden (Phaser's `blur` and `hidden` events, released when the scene shuts down), so the trainee
  comes back to PAUSED, not to an expired timer.

### SHELL-21: "1/24 scenarios" counts a failed attempt as done
- **Severity:** minor (progress a supervisor might read as completion)
- **Where:** Hub profile card, the line under the stat tiles
- **Repro:** fresh profile; play Where's My Package?! choosing the first answer every time (score 200, 0 ★ in both
  categories, "KEEP PRACTISING"); back to the hub.
- **Expected:** a count of scenarios *passed* (for example at least one star in every category), or a label that says
  what it counts. **Actual:** `0 / 144 ★ · 1/24 scenarios`: the zero-star run counts the same as a flawless one; the
  card shows a gold `★ 0/6` in place of NEW.
- **Evidence:** `test/out/review/shell/54-hub-zero-star-card.png`; save record
  `m3-missing: {plays:1, bestScore:200, bestStars:{efficiency:0, service:0}}`
- **Suspected cause:** `src/scenes/HubScene.js:82` counts every id in `save.data.scenarios`.
- **Suggested fix:** count scenarios with `starSum(bestStars) > 0` (or ≥ 1 star per category) and label it
  "1/24 passed"; keep "played" separately if wanted.
- **Status:** fixed — the hub counts scenarios *passed* (at least one star in every category they score): "3/24
  passed".

### SHELL-22: Small consistency points across the shell screens
- **Severity:** polish
- **Category order changes from scenario to scenario.** The hub tiles always read Safety · Efficiency · Service, but
  briefs and results list a scenario's categories in data order: Efficiency before Safety in Sort Belt, Service before
  Safety in Signature Required, Two Stops, Adult Signature, Service before Efficiency in Where's My Package?!, Proof of
  Delivery, Exception Calls, Business Pickup, International Docs, Wrong Address; Efficiency before Service in Route
  Planner and Find It Fast. So the star row the trainee compares between runs sits in a different place per scenario
  (e.g. `test/out/review/shell/brief-Sort-Belt.png`). Fix: sort `sc.categories` by the config order when drawing
  (`HubScene.js:250`, `ResultsScene.js:54`).
- **Dispatch-radio tip "A 3-second walkaround beats a 3-hour insurance call."** (`data/config.js:55`) undercuts the
  Pre-Trip Walkaround scenario, which is a 21-point check; "A 3-minute walkaround…" keeps the joke and the lesson.
- **Confirm dialogs** ("Abandon the route?", "Start a new profile?") leave a ~60 px empty band between the two-line
  body and the buttons (`test/out/review/shell/48-abandon-dialog.png`); size them to the text.
- **Names are shown exactly as typed** ("sam", "lee k" on the title and hub). Consider capitalising the first letter
  for display.
- **No favicon:** the browser requests `/favicon.ico`, gets a 404 (the "Failed to load resource … 404" in the console
  on every load, `/log`), and the tab shows the generic page icon next to "FedEx: On The Route — Courier Training".
  Add a small icon and `<link rel="icon">` in `index.html`.
- **Status:** fixed — briefs and results list a scenario's categories in one order (Safety · Efficiency · Service,
  `OTR.scoring.ordered`); the tip is "A 3-minute walkaround…"; confirm dialogs are as tall as their text; names are
  shown with capitals ("lee k" → "Lee K", stored as typed); the favicon was added in WP0.

### SHELL-23: The drive HUD gives distances in metres next to a speedometer in MPH; its pause card does not name the scenario
- **Severity:** polish (units: minor for US trainees)
- **Where:** Road Hazards (m1-driving) and the route-day drive: HUD top-left and the pause menu
- **Repro:** Hub > Road Hazards > Start, drive a little, ESC.
- **Actual:** the HUD reads "CHECKPOINT 1 OF 6 · 204 Harbor St · **31 m**" while the speedometer and speed-limit sign
  are in MPH (US English elsewhere, see SHELL-15). The pause card's subtitle is the fixed "On the road", where every
  other scene's pause card names the scenario ("Where's My Package?!", "Proof of Delivery", "Pre-Trip Walkaround").
- **Evidence:** `test/out/review/shell/55-pause-driving.png`
- **Suspected cause:** `src/scenes/shift/TownDriveScene.js:1117` (`${d} m`), `:498` (`title: 'On the road'`).
- **Suggested fix:** show feet (or "0.1 mi" beyond ~500 ft); pass `this.scenario ? this.scenario.title : 'On the
  road'` as the pause title.
- **Status:** fixed — the drive HUD gives the distance in feet (miles beyond 1,000 ft), and so do the kerb-gap
  messages and report lines; the pause card names the scenario ("Road Hazards").

## Revisit

- **Seen twice, could not reproduce on demand:** a click on a hub element shortly after closing a brief with ESC
  was ignored (once on the "Where's My Package?!" card, once on "Abandon this route"). The first time, the Enter
  pressed next (meant for the brief's Start) went to the hub's "Start the route" and launched the route day's briefing
  (`test/out/review/shell/18-m3-start.png`). Seven later attempts (turn-based and real time, fresh and old profiles)
  all worked, so this may be a play-tool timing artefact; worth one manual try on a real browser. If real, together
  with SHELL-5 it traps a trainee in a route day they never asked for.
- Reload mid-route-day checked at the briefing and pre-trip phases: the phase survives and restarts from its
  beginning (briefing answers are only saved when the briefing ends, so nothing double-counts). Reload in a stop or
  on the drive is ROUTEDAY-10; pause on the town drive is ROUTEDAY-9. I paused the drill only (SHELL-23).
- Known issues seen in passing, not re-recorded: results keep three takeaways and show "FLAWLESS!" over mistakes;
  route days do not count toward rank.
- ESC checks that behaved: ESC toggles pause cleanly (open / resume, fast double press); ESC closes the stop's shelf
  close-up without pausing; with the handheld open, ESC opens the pause over it (the shelf close-up closes instead:
  slightly inconsistent, left as is); a key held through a pause does not stick; spamming Enter/ESC during the
  hub-to-scenario transition, R+Enter together on results, and ESC during the Quit transition all behaved.
- Progression checked and correct: per-scenario x/6, module x/18, hub total, the three category tiles, the title's
  "Day 1 · Rookie · 18 ★", rank-up card at 14 ★, best stars kept after a worse replay, "Best score … played 3×".
- Not checked: rendering at a real 1366×768 browser viewport (SHELL-19 is by calculation); sound levels and the
  hover sound when sweeping across the hub; the route debrief and a finished route day's hub card (route-day area);
  what DaySummaryScene looks like (unreachable, SHELL-10).

## Summary

Ten that matter most, in order:

1. **SHELL-5** (minor): the morning briefing has no pause and no exit; one Enter on the hub commits a trainee to a
   route day (see SHELL-18, SHELL-11).
2. **SHELL-9** (minor): the rank bar contradicts its own label after the first rank-up ("18 / 34 ★", bar 20 % full).
3. **SHELL-6** (minor): pause Restart/Quit discard a run with no confirmation; "Shift Board" names a screen that
   does not exist.
4. **SHELL-14** (design): one profile per browser, New Profile erases the other trainee, and a failed save is silent.
5. **SHELL-18** (design): no first-run guidance; the default action for a new hire is the whole route day.
6. **SHELL-2 / SHELL-3** (minor, earlier session): accented names rejected; names silently cut at 16 and then
   overflowing the hub card.
7. **SHELL-11** (minor): no keyboard navigation of menus; keys that exist are invisible; the rank-up card is Space-only.
8. **SHELL-21** (minor): a zero-star attempt counts toward "n/24 scenarios".
9. **SHELL-7** (minor): the how-to-play card is a dead end (ESC and ‖ do nothing until Start).
10. **SHELL-12** (design): no way to see the controls after the brief; Settings has nothing to set (no volume, the
    saved `hints` flag has no switch).

Also worth doing: SHELL-20 (no auto-pause when the window loses focus), SHELL-13 (best-score line over the brief's
blurb), SHELL-8 (NEW BEST stamp over the stars), SHELL-16 (unscaled score, "SHIFT LOGGED"), SHELL-15 (US/UK spelling,
"Curb-side tires take the kerb hits"), SHELL-17/19/22/23 (hub polish, small text, consistency, metres vs MPH),
SHELL-10 (dead day summary), SHELL-1/4 (earlier session).

Not reached: see the last point of the Revisit list.
