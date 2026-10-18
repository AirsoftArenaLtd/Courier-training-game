# Generated street signs (C-30, in progress)

18 October 2026. Branch `codex/c30-signs` now continues on current pilot `a0084ae`, with
C-27/C-28/C-47/C-29 merged and Claude’s fixes/translations retained. The prior stacked tip
is preserved on the local `codex/c30-before-pilot-20261018` backup branch. Fetch pilot explicitly
with `git fetch origin pilot:refs/remotes/origin/pilot`; its tracking ref is also now in the
checkout’s default fetch configuration.

`src/core/fpsigns.js` currently derives the street-name plates, all existing junction stop
approaches, house-number positions, speed limits and school-zone endpoints from the same town
seed/projection as the route. The product now loads the bounded renderer and keyboard reader. Scoring integration remains
pending the Claude-inbox clarification; this task is still doing.

The catalogue adds no checkpoint field and emits no score. Its six Node tests check unchanged
mission snapshots; both street names at every rotated junction; right-side approach placement
before the existing stop lines; and exact delivered numbers/facade positions across 90 generated
routes. The source town's three light junctions currently keep the 3D grid's existing stop rule;
working traffic signals belong to C-32.

Rendering and access:

- One two-triangle plane describes the sign board and post; shader cutouts distinguish stop,
  give-way, speed, school, works, one-way and no-entry signs without image textures. Instances
  join the existing route-plane batch, with five per view on Low and 24 on High. Low adds at
  most 20 submitted triangles across a main/reflection frame and no draw call or target.
- A five-Text Phaser pool shows whole-sentence sign information; it wraps at normal/larger size,
  avoids captions, other labels, the sat-nav screen and physical mirrors/rear camera, and hides
  immediately for panels. J cycles visible readings without opening a device while driving;
  the control remaps through the existing Accessibility key map and appears in the guide.
- One-way/no-entry restrictions begin on day three on a peripheral cross-street segment with
  no delivery facade; day one keeps the existing two-way grid. Existing roadworks are signed
  from both approaches.
- Queued speech now retains its target, current gear or displayed-notice context. A hint whose
  context has gone away or expired is dropped before speech; rear urgency and other readers
  retain their existing behavior.

Remaining implementation work:

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
