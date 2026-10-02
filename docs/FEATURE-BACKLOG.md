# Feature backlog

Features to add to the existing modules (not new modules). The owner and Claude iterate on this list; order within
a group is rough priority. Size: S = a day or less, M = a few days, L = a week or more.

**Status, 2 Oct 2026:** everything below is built except where the Status column says otherwise. Each line says
where to find it in the game.

## Batch 1 (agreed, 26 Sep 2026): build these first

| # | Feature | What it is | Status |
| --- | --- | --- | --- |
| 1 | Assessment mode | Practice stays as it is. Assessment: hints off, one attempt per scenario, a pass mark per category, and any critical error is a fail. | Built. Each brief has Practice / Assessment buttons; the trainer sets attempts and pass marks. |
| 2 | Trainee record | A page a supervisor can print or save as PDF: every module, score, date, attempts, and each mistake with its lesson. | Built. Hub → "My record ›"; Print / PDF. Trainers open any trainee's record from Trainer settings (server). |
| 3 | Drive review map | After a drive or route day, the town map with a pin at every violation (what, how fast); click a pin for the lesson. | Built. Results / Shift debrief → Drive map. |
| 4 | Dispatch interruptions | Mid-route handheld messages: added stop, redelivery, pickup request. Reading one while moving is the handheld violation, so you pull over first. | Built (signature added, safe-place change). P at the curb reads it; TAB while moving is a violation. |
| 5 | Backing with G.O.A.L. | Reversing asks for Get Out And Look first: walk round, see what's behind, then back slowly with a mirror view. | Built, with the rear camera while reversing. |
| 6 | Key remapping and larger text | For office keyboards and accessibility. | Built. Settings → Accessibility. |
| 7 | "Why did I lose points?" | Every results line links to the moment it happened (the map pin, or the stop). | Built for driving ("map ›" links); stop lines name the stop. |
| 8 | Route-day variety | Each run draws different dogs, notes, hazards and weather, so repeat plays aren't memorized. | Built. |

## More ideas

### Training and assessment
| # | Feature | What it is | Status |
| --- | --- | --- | --- |
| 9 | Trainer settings | A supervisor PIN to set pass marks, lock practice mode, and reset a trainee. | Built. Settings → Trainer. With the training server the PIN and rules are shared by every PC. |
| 10 | Several trainee profiles | More than one trainee per computer, with a profile picker (was SHELL-14). | Replaced (owner, 26 Sep): one trainee per sign-in. The company login (server header, SCORM LMS or `?user=`) picks the trainee; progress is saved on the server or LMS. See README "Running it at a company". |
| 11 | Refresher mode | After a gap (e.g. 30 days), a short mixed quiz of the trainee's past mistakes. | Built. Hub → Practice tools → Quizzes (a badge shows when one is due). |
| 12 | Mistake drills | "Practice what you got wrong": replays only the scenarios or stops where points were lost. | Built. Hub → Practice tools → Mistake drill. |
| 13 | Quick-check quizzes | 3–5 questions after each module on its key lessons, scored into the record. | Built: 5 per module, 80% to pass. |
| 14 | Certificate | A printable certificate when every module is passed in assessment mode. | Built. My record → Certificate. |

### Driving
| # | Feature | What it is | Status |
| --- | --- | --- | --- |
| 15 | Mirrors and blind spots | Mirror insets while driving; changing lanes or pulling out without a mirror check is a violation. | Built. M checks the mirrors; pulling out without it is a violation. |
| 16 | Hazard perception clips | Short drives where the trainee clicks the moment they spot a developing hazard; scored on timing. | Built: Module 1 "Spot the Hazard", five clips. |
| 17 | Following distance | A tailgating violation behind traffic, with a "4-second" readout. | Built. |
| 18 | Parking brake and wheel chock | At every stop: park, brake, wheels to the curb on a hill; skipping it is a violation. | Parking brake built (SPACE before P). The town is flat, so no hill or chock step. |
| 19 | School buses and emergency vehicles | Stopping for a school bus's stop arm; pulling over for sirens. | Ambulance built on route days. The school bus stop arm already existed in the hazard drill. |
| 20 | Fuel and end-of-day | Low fuel warning, a post-trip inspection, and turning in the scanner. | Built: the post-trip after the last stop (fuel, the van, returns and docking the scanner). |

### Doorstep and customers
| # | Feature | What it is | Status |
| --- | --- | --- | --- |
| 21 | Difficult customers | Angry, confused or non-English-speaking customers, with de-escalation choices. | Built: Module 3 "Tricky Doorsteps"; also drawn into route days. |
| 22 | Apartment and gated access | Buzzer codes, lockers, a leasing office. | Buzzers and the leasing office already existed. Lockers not built. |
| 23 | Wrong-address recovery | Discovering a misdelivery after leaving, then fixing it properly. | Built: Module 4 "Put It Right". |
| 24 | Security and theft | A stranger asking for a neighbor's package; a porch-pirate risk spot. | Built: the "neighbor" at Tricky Doorsteps. |
| 25 | Heavy and two-person packages | Hand-truck use and team-lift rules on the doorstep, not only in the warehouse. | Built: a 68 lb box at Tricky Doorsteps and on route days. |

### Wellbeing and safety
| # | Feature | What it is | Status |
| --- | --- | --- | --- |
| 26 | Breaks and hydration | A day with timed rest and water breaks; skipping them builds fatigue that slows reactions. | Built. K at the curb takes a break; fatigue slows the steering. |
| 27 | Incident reporting | After any crash, slip or dog bite in a route day, filling in the real incident report. | Built: first question of the post-trip. |
| 28 | Cold-weather gear | Choosing boots, gloves and layers before a snow day; the wrong gear raises slip risk. | Built: asked after the briefing on rain, snow and heat days. |

### Presentation and comfort
| # | Feature | What it is | Status |
| --- | --- | --- | --- |
| 29 | Color-blind safe palette | Violations, lights and grades readable without relying on red/green. | Built: a color filter, Settings → Accessibility. |
| 30 | Narrated tutorial | An optional voice-over for the first playthrough of each module. | Built as "Read cards aloud" (the computer's voice reads briefs, instructions and results). |
| 31 | Pause-anywhere save | Leave mid-route and resume at the same stop. | Built, including mid-drive (resumes where the van was). |
| 32 | Progress dashboard | On the hub: modules passed, weakest category, time trained. | Built as the record's summary tiles. |
