# Later 3D workdays

Only newly generated campaigns from day two use this profile. Day one, cargo practice and existing checkpoints retain their original route, weather and requirements. Addresses, tracking numbers and the five-stop route remain the shared generator's. The owned adapter clones a new plan and marks it with version 1.

| Workday | Weather | Minutes between stop targets | Window width | ID requirement |
| --- | --- | ---: | ---: | --- |
| 2 | Fog | 7 | 4 minutes | At least one present recipient |
| 3 | Rain | 6 | 3 minutes | Up to two present recipients |
| 4 onward | Ice, then repeat fog/rain/ice | 5 | 2 minutes | Up to two present recipients |

Every later-day package requires a signature or adult signature, including the generated absent recipient's package. An absent signer requires retention and a scanned depot return. Dispatch's existing update remains a signature instruction, so it cannot contradict the stricter label with a safe-place instruction. Existing photo ID, signature, wrong-label, customer, dog and delivery events still apply.

At Dispatch after the brief, choose **View the workday plan**. It is also available under **Route-day updates** on the parked handheld. The overview explains the conditions and road closure; the stop pages show windows and recorded arrival times. The clock starts at the existing departure action and uses active mission time; preparation and paused menus do not consume it. The first target is 3–7 minutes after departure on day two, 3–6 on day three, and 3–5 thereafter. Later stop targets are spaced by the table's interval.

Windows are practice planning cues and do not change points, block a delivery or reward speeding. A missed window tells the courier to continue safely. A graded deadline event is a question for Claude before any scoring-contract change. Arrival/departure times are saved with the route-day state and validated against the mission and resolved stops. Restoring emits no reports.

Fog shortens the actual Three.js visibility range to 6–28 metres and asks for no more than 12 mph with a five-second gap. Rain retains the existing wet-road behaviour. Ice uses 0.35 braking grip and asks for no more than 8 mph with a six-second gap. Weather reports retain the existing per-leg `drive.weather` type and speed/gap details. The shared contract's example list and the hub forecast need Claude's wording/integration pass for fog and ice; this branch changes no shared shift generator or score rules.

One street segment closes away from parking points. A solid barrier blocks the full carriageway in both directions; the rectangular street grid retains an alternate path to every stop. The route map marks it with an outlined bar, and the physical barrier has a whole-sentence label from each approach. Collision uses the existing obstacle-contact report. High uses a rail and legs. Low uses a two-piece block/cap and twelve later-day rain particles to keep the original graphics ceilings; other saved days retain eighteen. No new image, render target or pass is added.

## Checks

- `node test/fplater.js`: first-day/old-save identity, deterministic requirements and weather, absent recipients, 100 closure layouts and connected detours, real barrier contacts, actual fog/grip, braking distance behaviour, clock persistence, malformed saves and unchanged window scores.
- `QA_LATER=1 node test/fproute.js`: 3,000 complete-frame Low geometry checks across 30 days, ten variants, all five stops, empty/loaded extra cargo, bus, siren and mirror.
- `QA_LATER=1 node test/fpresume.js`: 30 uninterrupted/restored comparisons (3,250 checkpoints), 100 shuffled complete days, 240 SCORM round trips (peak 3,596 characters), no failing seeds. Travel positions are fixtures.
- `QA_DAY=4 node test/fpaccessbrowser.js`: 171 real-key checks through planning, loading, ID/signatures, all stops, retained returns and finish, plus remaps and reload.
- `QA_TAG=c18 QA_PAGES=laterplan,laterwindow,laterroute,latermanifest QA_FONT=noto QA_LANGS=en,ta,hi,bn,mr,te,gu,kn,ml,pa,es,fr node test/fpaccesslayout.js`: 96 layouts, both text sizes and the corrected canvas-memory gate. New sentences use current-catalogue English fallback pending Claude's translation pass.
- `QA_TAG=c18-road QA_PAGES=laterroad QA_LANGS=en,ta QA_FONT=noto node test/fpaccesslayout.js`: four additional world-caption layouts, with full-size wrapped text.
- `test/fpbench.js` includes later-day fog from both directions, mirrors, rain, ice, planning and a loaded stress view. `QA_SOUND=1`, `QA_A11Y=large,colour,reduced` and `QA_GFX=low` exercise sound and accessible rendering. Cloud SwiftShader resource counts do not establish native Intel 60 fps.
