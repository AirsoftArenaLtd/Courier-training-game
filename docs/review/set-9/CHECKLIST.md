# Milestone 8 review, traffic: five minutes (owner)

Set 9 adds traffic that behaves (C-32): traffic lights, a give-way junction, a cyclist passing on the right and children
at the school crossing. These come from the third workday on; the first two days are unchanged. Compare
`docs/review/set-8/views/` (before) with `docs/review/set-9/views/` (after). Open `index.md` there for the same views at
Low and High plus four new traffic views (`redlight`, `giveway`, `cyclist`, `school`). `compare.md` puts set 8 and set 9
side by side, and `views-ta-large/` has the same views in Tamil with larger text. Codex's own evidence for C-32 is
`c32.md`. Then play for five minutes with the steps below. Write one line per item: fine, or what feels wrong.

**Before you start:** `git pull` the `pilot` branch, serve the folder, open `index.html` and start a workday. Traffic
starts on day 3, so finish two days first (or use a trainee who already has).

**Or jump straight to the day an item needs (B-105).** Add these to the address you open, so it reads `index.html?…`. Each
uses its own review profile (a name that starts with `review`), so your own progress is not touched; press Start workday
at the hub:

| Items | Add to the address | What that day has |
| --- | --- | --- |
| 1 to 6 (traffic) | `?dev=1&workday3d=1&user=review-traffic&route=1&day=3` | traffic lights, give-way, the cyclist, the school |
| 7 to 10, 16 to 19 (damage, walkaround) | `?dev=1&workday3d=1&user=review-van&route=10&day=4` | the van's height, the walkaround before and after |
| 11, 12, 14 (intercom, gate, locker) | `?dev=1&workday3d=1&user=review-stops&route=10&day=4` | a locker and an intercom behind a gate |
| 13 (reception) | `?dev=1&workday3d=1&user=review-reception&route=5&day=4` | a locker and a business reception |
| 15 (failed delivery) | either day-4 link above | a signature parcel with nobody home |
| 20, 21 (radio: priority call) | `?dev=1&workday3d=1&user=review-radio&route=10&day=4` | dispatch brings a delivery forward (even days) |
| 22 (radio: check-in) | `?dev=1&workday3d=1&user=review-checkin&route=11&day=5` | dispatch asks for a parked check-in (odd days) |
| 23, 24 (night) | `?dev=1&workday3d=1&user=review-night&route=9&day=6` | a night run (every third day from day 6) |

| # | Try this | It should feel like |
| --- | --- | --- |
| 1 | Drive up to a traffic light on red (view `redlight`) and wait for green | The light is easy to see from the driver's seat; stopping behind the line and waiting is enough. Driving through on red is a critical mistake, shown as a diamond on the drive map |
| 2 | Come to the give-way junction from the side road (view `giveway`) | You can see the give-way sign and the traffic you must wait for. Say if the sat nav screen hides the sign when you look straight ahead (the view looks a little right to show it) |
| 3 | Before turning right, look at the right mirror when a cyclist is passing (view `cyclist`) | The cyclist is clear in the mirror; waiting for them to pass is the safe choice and is what the score asks for |
| 4 | Drive past the school while children are crossing (view `school`) | The children are easy to see; slowing early and stopping for them feels natural |
| 5 | Miss a turn the sat nav gives you and look at the drive map at the end | The wrong turn is an arrow pin on the map, with "wrong turn" in the legend |
| 6 | Switch to Tamil with larger text and drive past a traffic light and the school (`views-ta-large/`) | The warnings in the cab still fit and are readable |

**Damage and low clearances (C-34, from the fourth workday).** Views `lowbridge`, `dent` and `vanheight` (also in Tamil with
larger text in `views-ta-large/`).

| # | Try this | It should feel like |
| --- | --- | --- |
| 7 | At Dispatch on day 4, finish the manifest (view `vanheight`) | A short reminder of the van's height before you set off |
| 8 | Drive towards a low bridge (view `lowbridge`) | Clear warning in time to turn off. Say if it is too much: the same line is on the notice bar, beside the bridge and on the sat nav screen at once |
| 9 | Clip a post or a parked car, then walk round the van (view `dent`) | The damage is where you hit, and you can see it from outside. Say if a light scuff is too faint at Low |
| 10 | Corner hard with the load not secured | The load shifts and the debrief says so; a secured load stays put |

**Richer stops (C-33, from the third workday).** Most days from day 3 on have a parcel locker, and many an apartment
intercom; a business reception is rarer, so if your day has none, the next day may. A label at the site says what
it is ("Use the intercom here." and so on); walk up, press P until it is selected, then E. Codex's pictures are in
[`c33.md`](c33.md): the [Tamil intercom](c33-release/c33-stops-high-final-ta-large-intercom.png), the
[reception](c33-release/c33-stops-high-final-ta-large-reception-resident.png), the
[open locker](c33-release/c33-native-clip-en-normal-locker-open.png) and a
[21-second locker clip](c33-release/c33-native-clip-review.webm).

| # | Try this | It should feel like |
| --- | --- | --- |
| 11 | At an apartment block, use the intercom: choose the button for the parcel's flat, say who you are, wait, then unlock | Clear which button is the right one; the short wait for the buzz feels real, not stuck. Say if you could not tell what to do next |
| 12 | At a gated entry, try to walk in before the gate is unlocked, then after | The gate stays shut until unlocked; walking through afterwards is easy |
| 13 | At a business, speak at reception: confirm the address, record the person by name, take their signature, hand over | Polite and quick, like a real front desk. Say if the person behind the desk is hard to see |
| 14 | At a parcel locker (the morning brief names the stop): open the right compartment, scan, put the parcel in, close, photograph | Each step is obvious and in a natural order; the photo of the closed door makes sense as proof |
| 15 | When nobody is in for a parcel that needs a signature, record a failed delivery: card, reason, tomorrow afternoon | The card and the booking feel like what a courier does; the parcel stays in the van for Returns |

Switch to Tamil with larger text for one of these: the panels' sentences should still fit and read well.

**Walk round the van (C-35, from the fourth workday).** Before the first drive the guide asks you to walk round the
parked van with empty hands; after the day, back at the depot, you walk round it again before Finish workday. Each of
seven areas (front, rear, both sides, roof edge, rear left wheel, left mirror) has a mark you select with P and inspect
with E; the handheld shows what you see and you choose the matching description. Codex's pictures: the
[wheel before the trip](c35-cargo/c35-cargo-native-high-en-en-normal-pre-wheel.png), the
[roof after it](c35-cargo/c35-cargo-native-high-en-en-normal-post-roof.png), and the
[Tamil record and guide](c35-cargo/c35-cargo-native-low-ta-ta-large-post-record.png)
([guide page](c35-cargo/c35-cargo-native-low-ta-ta-large-guide-report.png)).

| # | Try this | It should feel like |
| --- | --- | --- |
| 16 | On day 4 or later, walk round the van before driving and inspect all seven areas | Each mark is easy to find and select; the description that matches what you see is clear. Say if an area is hard to reach or the wheel and roof marks are confusing |
| 17 | Lightly clip a post on the route, then at the depot walk round and record the new damage where it is | The post-trip check finds the scrape where you hit; recording it feels honest and quick |
| 18 | Do the same but leave the scrape out of the post-trip record | The results show it as a critical mistake and say why: hidden damage is not passed on to the next driver |
| 19 | Switch to Tamil with larger text and open the walkaround record on the handheld | The area names and descriptions fit and read well |

**Dispatch radio and night driving (C-36, from the fourth workday).** About twenty metres into the first drive,
dispatch calls on the radio. The caption says so; stop, set the parking brake and read it on the handheld. On even days
it brings one delivery forward; on odd days it asks you to check in at a parked spot on the way. Every third day from
day 6 runs after dark. Codex's pictures: the [Tamil radio message](c36-cues/c36-cues-low-ta-ta-large-day5-message.png),
the [night view](c36-cues/c36-cues-low-ta-ta-large-night.png) and the [oncoming glare](c36-cues/c36-cues-high-en-oncoming-glare.png).

| # | Try this | It should feel like |
| --- | --- | --- |
| 20 | When the radio call comes in, try to read it while driving, then stop and read it | It asks you to stop first; reading it parked is easy, and the call does not interrupt anything dangerous |
| 21 | Accept the priority update and deliver that parcel next | The handheld makes the new order clear; the results credit you for it. Declining or ignoring it should not stop you finishing the day |
| 22 | On the check-in day, accept, drive to the spot, park and confirm arrival | The spot is easy to find with the sat nav, and confirming feels like a real check-in |
| 23 | On the night day, try to drive off with the headlights off, then switch them on (L, or the switch in the cab) | A clear warning before you move; with the lights on you can see the road ahead. Moving off without them shows in the results |
| 24 | Drive towards an oncoming car at night, then switch on reduced motion in Settings | A little glare on the windscreen, not blinding; it goes with reduced motion |

Switch to Tamil with larger text for the radio message and the night warning: they should still fit and read well.

**Owner's visual review, 21 October (High preview, relayed by Codex).** What you said, and where each is being done:

- Driving feels substantially better, and the houses work.
- The cab looks incomplete, and the side mirrors are not apparent from the driving view: **C-48** (doing).
- Some surfaces look missing or flat; the uploaded Poly Haven materials are not used yet: **C-49**.
- Signs need real lettering on their faces, not floating text: **C-50**.
- People and street detail were not apparent: **C-51**.
- The GUI (cab instruments and handheld) needs a visual pass: **C-52**.

| # | When it lands, try this | It should feel like |
| --- | --- | --- |
| 25 | (C-48) Sit in the cab at the start of a workday and look ahead | Both side mirrors are in view and show the road behind; the cab looks finished around you |
| 26 | (C-49) Drive down a street and stop at a house | Road, pavement, grass, plaster and brick look like real materials, at High; Low still runs smoothly |
| 27 | (C-50) Drive up to a stop sign and a street-name sign | You can read the sign itself, as on a real street; J still reads it aloud |
| 28 | (C-51) Do a delivery on a busy street | People are visible on the pavements and at the doors |
| 29 | (C-52) Open the handheld and look at the dashboard | They look like a real device and real instruments; Tamil with larger text still fits |
| 30 | (C-37, merged) Finish a workday with a mistake (for example drive off at night without headlights: `route=9&day=6`), then press "Replay the last mistake." on the results | The few seconds before the mistake play from the driver's seat; pause and the half-second steps work from the keyboard; it is clear what went wrong |

Anything else you notice (looks, sound, confusion, frame rate on your laptop) goes at the bottom.
