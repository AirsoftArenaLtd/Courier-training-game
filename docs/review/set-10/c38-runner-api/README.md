# Shared host hook for C-38 / A-30

The runner and chooser are implemented and exercised through the actual scene, results screen and academy in native tests. No production exercise is enabled. A-30 owns the trainer's choice, registry changes, completion counts and shared flow source.

`flow-selection.patch` is a reviewable proposal against the current `src/core/flow.js`. It selects the scene before an assessment attempt is begun and leaves its identity and result path unchanged. `o.presentation` is an optional explicit choice; A-30 can feed the trainer's per-module preference into that choice. Without it, `auto` preserves the current 2D default until a registered scenario has passed QA and gained `default3d`.

Please implement the shared hook as part of A-30, or authorize this contained change. The ownership rule in TEAM says to ask before editing the other agent's files; the patch has not been applied to shared source. Runner validation continues independently.

New UI sentences and templates are listed in `new-text.json` for the translation pass. Scenario goals and briefs belong to C-39 to C-46 and are not added to course data by C-38.
