# Corporate pilot plan

**Goal:** a pilot-ready version for a large courier company by the new year (sooner if possible).

**Shape:**
- The hub dashboard and the training modules stay as they are, with small visual tweaks so they sit well next to
  the 3D.
- The workday becomes 3D, as one continuous flow:
  1. **Morning brief at dispatch:** walk in, get the weather, hazards and route notes.
  2. **Manifest:** the day's stops and anything special (signature, heavy, age-restricted).
  3. **Load-out scan:** find and scan every package. A mis-sort or a missed package is caught here, or turns up later.
  4. **Load the van:** shelves in stop order.
  5. **Drive:** cab view, scored on the same rules the 2D game teaches (following distance, mirrors, G.O.A.L.
     backing, school buses, sirens).
  6. **Deliver:** park safely, find the package in the back, walk to the door. Customers, dogs, signatures, wrong
     addresses, proof of delivery.
  7. **End of day:** returns, the debrief, the record.
- Everything is scored through `OTR.workday.report()` (`docs/WORKDAY-EVENTS.md`) into the existing results, records
  and trainer reports.
- The game ships with neutral colours. A company's name, logo and colours come from a theme file it fills in.

How the team works is in `docs/TEAM.md`. Tasks are on `docs/COORDINATION.md`.

## Milestones

| # | Milestone | Done when |
| --- | --- | --- |
| 1 | **Setup** | Rules, board, event contract and the `pilot` branch with the prototype merged in (not opening by default). Done 7 October 2026. |
| 2 | **One complete stop in 3D** | Brief → scan one package → load it → a short drive → deliver it → scored on the existing results screen and saved to the record. **The owner measures it on their laptop** (60 fps floor on integrated graphics). Target: end of October. |
| 3 | **A full workday** | Every step at full length. The hub's "Start the route" runs the 3D workday. The existing route-day variety (weather, hazards, dispatch interruptions, difficult customers) carries over. Target: end of November. |
| 4 | **Corporate requirements** | Company theme file. Runs offline and behind firewalls. Reports to company training systems (SCORM/xAPI, building on `imsmanifest.xml`). Trainee data handled as the pilot company requires. Accessibility (keyboard, larger text, colour-blind palette) in 3D too. A before-and-after trainer report to show the pilot worked. Target: mid-December. |
| 5 | **Ready for the pilot** | All 12 languages, with nothing left in English. The full QA suite is clean. Tested on real target laptops. A short pilot guide for the trainer. Target: before the new year. |

If milestone 2 does not run well on integrated graphics, the plan is simplified then (fewer objects, simpler
lighting, shorter view distance), not in December.

## Out of scope for the pilot

- A Steam / consumer version.
- Multiplayer.
- New training modules beyond the workday.
