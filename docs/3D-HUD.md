# Compact workday display

C-47, 18 October 2026. `codex/c47-less-screen` is stacked on pushed C-28 `5c8279b`,
over B-30 and pilot `951ef36`. The layout lives in owned `src/core/fphud.js`.

The live scene has no persistent title, objective, cargo counter or full-width footer. The van's
existing physical speed/RPM gauges, shifter, belt and switches supply their own state. The existing
dashboard screen mount shows a small vector overview of the generated streets, depot, stops and van,
with the current destination in a whole sentence. It follows the physical screen, leaves view when
looking away, and gives way to the automatic live rear camera in reverse. P can select the same screen
and read its current content through B-30's bounded narration. The trainer's `satnav: off` hides the
overview. This is destination context; turn-by-turn routing remains C-31, after C-30's street signs.

The handheld's home keeps its existing choices at the same key numbers and adds **Read the workday
details.** at the end. That page keeps the complete former objective, loaded cargo count and carried
address. Existing Stop details still provides the service requirements and recorded shelf. It remains
impossible to open the handheld before parking safely; every option also works by keyboard and speech.

A contextual prompt occupies only the width its wrapped text needs, up to 620 px (760 at larger text).
It fades after 7–16 seconds of reading time, using the translated length. A changed target/action or
closing a panel restores it. P can reselect a target after expiry. Reduced motion removes interpolation.
Actual warnings and scan guidance stay visible. First-day key help remains readable at the bottom;
later days keep the keys in Controls and guidance. The actual saved route day controls this on resume.

Audible captions remain available in a bounded top-left card. Safety observations, dispatch/break
warnings, required practice walk-arounds, unfastened belts and unavailable storage remain visible
independently of the selected control. Quiet time-of-day captions fade; night headlight warnings stay.
Panels/handheld pages suppress world overlays. Four shifter positions now say when already selected,
and selecting the same gear still adds no scoring event.

The display never writes mission fields, save format, aids, scoring, shared Settings or i18n. Its fixed
objects are two graphics/rectangle helpers, one destination text and one container; existing HUD Text
objects are reused. The map draws at most once per 90 ms with bounded generated streets/stops. There
are no new Three textures, meshes, render targets or passes. Unchanged text does not regenerate its
canvas every frame. The existing colour filter covers the map, whose van triangle, depot square and
destination ring also distinguish the symbols by shape.

`test/fphud.js` checks timing, later-day help, trainer rules, warnings and screen content.
`test/fphudbrowser.js` uses real keys for P, shifter/actions, mirror gaze, reverse and the handheld in
English/Tamil, normal/larger text, colour filtering and reduced motion. Named fixtures supply travel,
expiry and hazards. Its coverage figure is the sum of active overlay background/text rectangles over
1280×720, a conservative screen-area measure rather than pixel opacity. Review evidence and resource
figures will be indexed in `docs/review/set-8/c47.md` and `docs/PERF.md` at handoff.
