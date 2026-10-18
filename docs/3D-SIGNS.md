# Generated street signs (C-30, in progress)

18 October 2026. Branch `codex/c30-signs` is stacked on pushed C-29 `709a19a`, including
C-28/C-47 over the latest pilot `951ef36`. C-27's prerequisite is merged.

`src/core/fpsigns.js` currently derives the street-name plates, all existing junction stop
approaches, house-number positions, speed limits and school-zone endpoints from the same town
seed/projection as the route. It is not yet loaded by the product: rendering, accessible reading,
the remaining sign kinds and scoring integration are still in progress.

The catalogue adds no checkpoint field and emits no score. Its four Node tests check unchanged
mission snapshots; both street names at every rotated junction; right-side approach placement
before the existing stop lines; and exact delivered numbers/facade positions across 90 generated
routes. The source town's three light junctions currently keep the 3D grid's existing stop rule;
working traffic signals belong to C-32.

Next implementation work:

- Recover geometry headroom before adding signs. The integrated C-28 loaded CPU ceiling is
  already 63 calls / 2,480 triangles against 64 / 2,500. Use bounded instance batches and actual
  loaded/fallback sweeps; the lighter fixed screenshot profile is not the worst case.
- Keep physical signs consistent with actual obligations and road access. Add give-way, one-way,
  no-entry, school and roadworks details without obstructing delivery or making day one harsh.
- Keep text in a bounded Phaser pool, readable with larger text and colour filtering; new
  instructions are whole sentences and narration/keyboard reading remains available.
- Wire only the seven existing `drive.sign-*` contract types, with stable keys and resume tests.
  The Claude inbox asks how the new stop-sign grade should coexist with `drive.stop-line` for
  the same obligation; layout and budget work continue while that scoring question is open.
- Run the required Node checks, affected browser/layout checks and C-29 resource profiles;
  retain the screenshots/clip, frame figures and five-minute checklist before marking review.
