# Your open decisions: one page (owner)

Each question below is on the board (`docs/COORDINATION.md`, "Questions for the owner") with its number. None blocks
the work: each has a default in use, which can be changed later in one place. Below each is what the team recommends
and why, so a one-word answer is enough ("yes", "keep the default", or your choice).

| # | The question | Default in use | We recommend | Why |
| --- | --- | --- | --- | --- |
| 1 | Does the pilot company need results in its LMS, and are there data rules? | Built for the general case: SCORM 1.2 and 2004, xAPI, a training server, data export | Ask the company when it is confirmed | Nothing to build until we know its LMS and rules; the general case covers the usual ones |
| 2 | Does the five-stop 3D workday hold 60 fps on your Intel laptop at Low? | Unknown: the QA machine has no graphics card | Run `docs/FRAME-BUDGET.md`'s benchmark once on that laptop (about 10 minutes), after B-164 and C-49 land | It is the one number only your laptop can give; it decides whether Low needs more cuts |
| 3 | The LMS sees the course complete once a 3D workday is finished, passed once the best day met the pass marks | As stated (`lmsWorkday: true`) | Keep the default | The workday is the pilot's point; modules alone would let a trainee pass without driving |
| 6 | A trainee who stops mid-day and continues on another PC starts that day again | The game asks first; the day stays on the PC it began on | Keep it for the pilot; carry the place in town over only if trainees really switch PCs | Shared training PCs are usually one per trainee per session; the course progress itself always travels |
| 7 | Package the pilot as SCORM 2004, with 1.2 still available | 2004 built by default, 1.2 with a flag | Keep the default | 2004 has room to spare; since B-160 and B-168, 1.2 also keeps a normal heavy day's pins, so either works |
| 8 | PCs without a graphics driver: draw less there to reach 25 fps in the 2D scenes? | No change | Try `?gfx=lite` on one such PC (about +5 fps, flatter colours); turn it on there automatically if it looks acceptable | It changes nothing on a PC with a graphics driver |
| 10 | Driving at night without headlights: points, a star, or critical? | Points only (2 safety points a leg) | Make it cost a star (worth 6 points), not critical | It is a real safety failure that should show in the stars, but less grave than a red light, which is critical |
| 11 | Do the 13 new 3D-only scenarios count towards the certificate? | Recorded but optional | Keep them optional for the pilot | A PC without working 3D could never finish the course; the scenarios still show on the trainee's record |

Question 4 (quick-start languages) is overtaken: the quick start and the pilot guide's trainer sections are in all 11
languages. Questions 5 and 9 were withdrawn.

To answer: reply with the numbers, for example "3 yes, 7 yes, 10 a star, 11 optional". The team changes the line and
marks the question answered on the board.
