# Sat nav (C-31, in progress)

18 October 2026. `codex/c31-satnav` is stacked on pushed C-30 `37d8a33`; latest pilot is
`11e0dc8`. B-44’s independent diagnostics fix is ready on its own branch (`4e1796d`).

The first implementation is `src/core/fpnav.js`, a pure street-graph/path layer. It connects
street centres and projected start/destination points, finds deterministic shortest paths,
respects the actual road closure with van clearance, and reads C-30’s one-way metadata rather
than defining another traffic rule. Older checkpoints retain their two-way peripheral street.
Off-road/out-of-town targets are rejected. Planning changes no mission/checkpoint state.

Seven Node cases pass, including 375 generated delivery-curb paths across 75 days/seeds,
legal detours in both directions, directed/legacy streets, exact straight distances,
determinism, invalid destinations and zero-distance paths. The module is not loaded by the
product yet; the task remains doing. The completed C-30/B-44 resource gates remain separate.

Remaining work:

- Connect the existing physical dash screen to the planned route, next turn, distance and
  street names. Read A-21’s full/line/off aid; preserve the automatic reverse-screen takeover.
- Reroute missed turns. Keep a pending mistake through the contract’s 30-second recovery
  window before committing one `drive.route` report per leg, so recovery needs no shared
  scoring mutation. Preserve pending state through owned checkpoint validation.
- Add the visible blocked-drive/double-parked scenarios using bounded existing props. Low’s
  conservative loaded sweep already peaks at 2,492/2,500 triangles; recover or reuse geometry
  before adding any mesh. Keep collision targets and every delivery reachable.
- Keep whole-sentence instructions, keyboard/narration, larger text, colour filtering and
  reduced motion. The first day stays gentle; older days/saves keep their scoring guarantees.
- Run the affected browser/layout, resume/SCORM and frame-budget gates, and retain screenshots,
  a clip, source hashes and the owner checklist before marking the task review.

## Implemented integration (validation in progress)

The existing physical navigation mount now shows a clipped vector map at a useful local
scale, its route line, and full-aid turn/distance/street sentences. Line aid keeps the route
and destination; off hides it. P (or its remap) selects the screen and narration reads its
current instruction. Reverse always gives the physical screen back to the rear camera.

New plans have `navigation: 1`. Their compact, owned `navigation` checkpoint contains the
route origin, progress and at most one pending wrong turn; no graph/path array is saved.
The simulation clock gives 30 seconds to follow eight metres of the reroute (or reach the
destination). A recovered error emits nothing. Only an expired error emits `drive.route`,
keyed by the captured drive leg with its original stop and position. Off aid does not grade
an invisible planned route; changing aid to off cancels a pending error. Old checkpoints
have visual help but no new obligation or obstacles. Reverse and paused menus do not
create wrong turns. Reroute projection polls at most every 150 ms; paths are cached outside
the checkpoint and rebuilt only on destination/origin changes.

Day four introduces two reused parked-car placements: a blocked private approach (the
public curb and doorway remain accessible) and a double-parked street car. Both are actual
solids. The route graph diverts around the latter and the existing road works; one-way
rules come from C-30. Two car choices receive selection priority; Low's decorative model
allowance falls from 290 to 260 triangles on these days. No model, texture or pass is added.
Day one has neither obstruction. Asset failure keeps solid procedural cars.

Fifteen navigation cases pass, including 30 seeded obstruction layouts and restore, plus
ten town/asset cases. The initial actual-key browser pass has 81 assertions across English
and Tamil at both text sizes, remapped selection, all aids, reverse takeover and visible
solids. The map was subsequently enlarged/zoomed for legibility and is being recaptured.
The 130-day resume/soak passes with versioned navigation, signs, cab and rear camera.
Full cargo sweeps and the expanded 73-view rendered gate remain to run before review.
