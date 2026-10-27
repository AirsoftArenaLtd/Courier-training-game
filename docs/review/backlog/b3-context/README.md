# B-3: recover the shared WebGL context

Ready for review on `codex/b3-context-recovery`, based on pilot `b27954c4`.
Product source: `1d0b4234`. The current pilot's B-164 cab/nav clearance and
B-178 script-font changes are retained.

A real WebGL context loss now freezes the scene, mission, timers and tweens,
clears held input and shows an accessible DOM fallback with the existing
translated Paused and Reload labels. Restoration waits for Phaser and Three,
refills the mirror atlas, refreshes High shadows and restores the existing menu
or handheld state. Driving resumes through the existing Pause/Continue panel.
Late loaders cannot replace a restarted scene's asset bank. An already paused
scene stays paused. Shutdown releases the overlay and listeners.

The final input guards keep key capture from saving unseen bindings and allow
native Tab/Enter to reach Reload while the graphics context is unavailable.
No new score event, save field, translation, persistent texture or render pass
was added. `index.html` loads one new classic helper, `fpcontext.js`; prototype
entry remains opt-in.

## Validation and source scopes

[verification.json](verification.json) is produced by running the adjacent `verify-evidence.py` from this worktree. It verifies all sources and
artifacts in eleven retained phases against current or archived exact bytes.
Some raw plans retain the original baseline's `source` label; their detailed
`scope`, hashes and the verification summary identify the actual build.

- **251 CPU checks** pass across fourteen relevant suites. The eight final
  context cases and twelve accessibility cases replace their pre-fix versions.
  The catalogue delta is empty and all eleven translation checks pass.
- On current pilot, the pre-keyboard recovery matrix passes **352 checks**:
  Low/High, English/Tamil, normal/larger text. The final keyboard phase passes
  **196 checks**, including fresh full Low English and larger High Tamil recovery
  and real Enter-triggered navigation through Reload. These are **548 scoped
  assertions**, not one all-source run. The two intervening input-guard changes
  are archived; rendering inputs are unchanged.
- Current-pilot standard `fpbench` / `fpquality` checks pass **12 views** across
  loaded Low, loaded High, accessible Low and missing-model Low. Actual sound,
  reflection pixels and original ceilings are enforced. Final recovery checks
  separately retain 8 resource samples and prove all three mirror tiles refill
  and their counters advance.
- Forced loss covers delayed initial loading, moving cab, menu identity and
  selection, handheld, held scanner/mouse rearming, repeated loss and scene
  restart with an obsolete loader. Mission/event hashes, clock and tween values
  remain fixed during each loss. Screenshots were inspected at original size;
  translated Tamil labels render without missing glyphs. Existing untranslated
  body text is visible in the restored Pause panel; no new text was introduced.
- Every validator releases its browser, loopback-only server and browser lease.
  Cloud SwiftShader cannot certify the owner's Intel 60 fps requirement (O-1).

## Retained failure and historical evidence

**The unchanged full High lighting test still fails.** It samples black both
with headlights off and on at pixel `(650,403)`. This exact failure is reproduced
on unchanged old pilot `90844ac5` and unchanged current pilot `b27954c4` under
`lighting-baseline/`. It is an inherited test/visible-ground-probe issue requiring
separate review; a passing full High lighting gate is not claimed. The original
test and threshold are unchanged. Two exploratory test fixtures were discarded;
their raw failures remain under `recovery/lighting-attempt-*`. The raw failing
`current-pilot/keyboard-before.log` retains two producer-written whitespace-only
lines; they are preserved as evidence, not authored source.

The original baseline (`before-*`) records three expected failures: in a 1.2 s
loss interval the old mission advances 1.2314 s, the van moves 2.976 m and a gear
key adds an observation. `first-recovery/` records the early 10 passing checks.
`recovery/` records the fuller old-pilot matrix (352), cab (200), mirrors (180),
Low lighting (51), High **layout-only** (28) and 12 resource views. These historical
results are not relabeled as current-pilot evidence. Failed scanner-fixture and
missing-protocol-env attempts are also retained with their corrected successors.
`pre-pilot/` and `current-pilot/before-keyboard-fix/` preserve exact changed inputs.

Claude can review B-3 while C-39 continues on its existing C-38 stack. The newly
confirmed junction/night `drive.route` efficiency and school completion policy
are accepted; no owner decision or merge wait is needed.
