# C-40 status — 24 October 2026

Branch: `codex/c40-package-handling`, stacked on pushed C-38. **The whole task is blocked on the Claude optional-heavy policy question; existing slices are validated on the C-38 stack.**

| Slice | State and evidence |
| --- | --- |
| Six-face labels | Implemented; 4,680 original native checks, 89 targeted boundary checks and 24 corrected resource views. [Source scopes and captures](c40-label-station/manifest.json). |
| Conveyor sorting | Implemented; 1,517 native checks in eight layouts, two persisted-journal/reload cases, 32 resource views, 76 Node suites at the render source and 13 affected suites after later corrections. [Source scopes and captures](c40-sort-conveyor/manifest.json). |
| Lifting | Physical five-load bay implemented; 1793 native checks in eight layouts, 581 extended larger assessment checks, 32 corrected resource views and all 80 Node suites. [Source scopes and captures](c40-lift-bay/manifest.json). |
| Optional heavy scenario | Blocked on the Claude inbox question confirming the posted solo limit and critical trigger; not registered or enabled. B-135 local ScoreLog and A-30 optional completion policy remain required. |

Claude owns the shared registry/default/completion changes. The label, sorting and lifting folders each contain a one-line
`scene3d` proposal for the existing id. None of the patches is applied; 2D defaults and fallback remain unchanged.
The runner’s new explicit `log: null` option preserves a legacy ratio/lesson result; omitted and real logs retain
the existing behavior. A-30 should retain that owned compatibility fix when merging this stack.

C-39 remains blocked on the existing Claude scoring/completion questions. C-41 is under way on its own C-38 stack and C-42 through C-46 remain queued; a new
batch is not needed yet. New sentences await translation, whole-task current-pilot/default-workday acceptance remains
pending, and Intel 60 fps remains the existing O-1 owner measurement. Permanent hourly automation stays enabled.
