# Walkaround and damage report (C-35)

Doing on `codex/c35-walkaround`, from pilot `da7bd3f` after merged C-34 and A-19.
The first slice is a bounded pure model; physical targets, scene/checkpoint adapters,
handheld reports, B-78 guidance and browser/resource evidence remain to be built.
Nothing new is loaded by the game yet.

The pre-trip records existing `damage.baseline`; it never blames that wear on the
trainee. The post-trip records player-caused `damage.added` by zone and a plain
condition description. Missing existing wear is assessed at departure; missing new
zones are assessed at finish, after the existing return guards. A report of damage
in a zone with no wear uses the approved false-report penalty. Reports use only
`inspect.damage`, `trip.damage-report` and `trip.damage-false`, short zone keys and
no unused map places. The shared workday contract owns points and critical flags.

The model must retain inspection/record state across checkpoints without replaying
reports, keep every collection bounded to seven zones, and respect trainer damage-off.
New scene integration must opt in only for new later-day plans, preserving old saves
and gentle first days. Physical controls need real visible targets, remapped keys,
narration, larger text, colour and reduced-motion support. Reuse the current rendering
and one active prompt rather than adding seven persistent text canvases.

C-33 is not a dependency of the board row. Its own acceptance and shared-QA request
remain on `codex/c33-richer-stops`; this branch starts from pilot. B-78 guidance will
cover the road, navigation, signals/cyclist/crossing, van height/load and actual
walkaround/report controls. Richer-stop wording will follow the available feature.
