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
