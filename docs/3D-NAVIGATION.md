# Physical sat nav and route realism

C-31, 18 October 2026. `codex/c31-satnav` is stacked on C-30 `2746244` and retains the merged
B-44 asset diagnostics. The runtime adapter is `src/core/fpnav.js`; the existing physical
screen's layout is in `fphud.js`. Shared scoring/save/Settings/i18n files stay unchanged.

The deterministic street graph connects the actual town's junctions, van and destination
curb. It respects the existing road closure with van clearance, C-30's one-way segment, and
the double-parked car. Route paths are cached in a WeakMap, simplified for display, and
rebuilt only after a miss, destination change, leaving reverse, or re-enabling navigation.
Projection polls every 150 ms. No graph/path array enters a checkpoint.

The physical dash mount shows a clipped local vector map and route. Full aid gives the next
turn, its distance in feet and the real street name; line aid keeps the route/destination;
off hides navigation. The existing P target selection (including remaps) and narration read
the screen. Reverse always gives it to the rear camera; looking forward in drive restores
navigation. Larger text keeps its font size and wrapping. Vectors use shapes and luminance
as well as colour; reduced motion needs no animation.

New plans have `navigation: 1`. Their compact owned state retains the destination context,
origin, progress, aid, polling timestamp, reverse transition and at most one pending mistake.
The simulation clock gives 30 seconds to follow eight metres of the reroute (or arrive).
Recovery emits nothing. Only expiry emits `drive.route`, once per captured leg, with its
original stop/place. Off aid does not grade an invisible path and cancels pending errors.
Menus pause the clock. Reverse does not create a wrong turn. Validation rejects malformed
state; restoration emits no reports and retains the same grace deadline. Older plans get
visual help without new grades or obstacles.

Day four adds a blocked private approach at a stop without a dog gate and a double-parked
car on a street with no delivery curb nearby. They replace existing decorative car choices
and share their local model/fallback batches; their actual collision solids remain when
models fail. Selection prioritises those two cars and Low's optional town allowance falls
from 290 to 260 triangles. No model, texture or pass is added. All curb bays, doors and a
continuous walking approach remain reachable. Day one has neither obstruction.

Reproduce the interactive views with `node test/fpnavbrowser.js` (`QA_GFX=high` for High),
the control clip with `QA_CLIP_ONLY=1`, and the 73-view resource gate with
`QA_TAG=c31 node test/fpquality.js`. Serve the checkout and set `QA_BASE`, `QA_BROWSER` and
Puppeteer as usual. New sentences await Claude's translation pass.

Evidence, final figures, source hashes and the owner's checklist: `docs/review/set-8/c31.md`.
