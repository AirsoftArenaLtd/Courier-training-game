# C-41 conversation model progress

The whole task remains doing on `codex/c41-customer-interaction`, stacked on pushed
C-38 at `b860fa18`. Runtime `9b30ca7c` adds an **unloaded model**, with no registry,
default, 2D, scoring, save, Settings or i18n change. There is no new rendered scene
yet, and no resource/FPS or screenshot acceptance is claimed for this slice.

The model walks the three original m3 dialogue graphs and calls the existing
`TalkController.applyEffects` implementation for local ScoreLog checks. The result
retains the original outcome bonus, ratios, lessons and score scale. Authored
choices, visibility conditions, moods, flags, timed-decision allowance, worse
repeat checks and signature/dog criticals stay intact. Reading and paused clocks
are guarded. Assessment exposes no per-answer feedback. Terminal or broken loops
cannot create another completed result. Nothing is written to a course/workday.

Six new cases pass, including **730 reachable logical endings and 9,192
state/result comparisons** against the actual 2D TalkController transitions and
`DialogueScene.complete`, including 12 timed-decision branches. Only rendering,
staging callbacks and animation waits are stubbed for those comparisons; the
actual score implementation and result code run unchanged. Dataset bytes remain
unchanged. All **70 available Node suites** pass at the same source, including
fpmission, fpworld, workday, savesize and the current i18n catalogue.

Reproduce with `node test/fpcustomertalk.js`; the full inventory and exact raw logs
are retained. The raw archive index lists each unmodified log's SHA-256. The
readable focused log trims line-end whitespace.

Next: the physical dialogue adapter/customer actors, the existing tricky-doorstep
set, intercom/reception/locker scenarios, A-30 registry proposals, native controls,
layout/resource measurements and screenshots. New optional ids retain B-135 and
the existing A-30 completion policy. C-40's final lifting evidence is on its own
branch, `docs/review/set-10/c40-lift-bay/manifest.json`; remaining optional-heavy
policy stays with Claude. C-42 through C-46 remain queued. Automation stays enabled.
