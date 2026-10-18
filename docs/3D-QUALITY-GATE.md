# The integrated 3D review gate

C-29, extended for C-30 signs on 18 October 2026. Run `node test/fpquality.js` against a locally served checkout (`QA_BASE`),
with Chromium (`QA_BROWSER`) and Puppeteer installed. One browser runs at a time. `QA_PROFILES`
can select profile names, separated by commas, in run order; it defaults to all four.

| Profile | Quality | Fixed views | Purpose |
| --- | --- | ---: | --- |
| `loaded-low` | Low | 28 | Junction/number/one-way/loaded-peak signs, all mirrors, cab, scanning, five-stop workflow views, later traffic/reverse, night/weather, town and actors. |
| `loaded-high` | High | 13 | Signs and source-detail town/actors, every mirror, cab, loaded cargo and night reverse. |
| `accessible-low` | Low | 8 | Signs, larger text, colour filtering and reduced motion in cab, scanning, weather, cargo and reverse. |
| `fallback-low` | Low | 8 | Signs and actual HTTP 404 responses for every GLB, with the procedural cab/town/actors still rendered. |

The exact named fixtures/seeds live in `test/fpbench.js`; the versioned profile lists live in
`test/fpquality.js`. They cover C-22 through C-30 and C-47 without changing gameplay. The same
default company theme and running audio/captions are used in every profile. The gate checks
the accessibility flags and audio state as well as the model fixture and rendered resources. The
generated town, physical targets, scores, saved state and trainer rules are retained. Run
`node test/fphudbrowser.js` for the interactive English/Tamil normal/larger layouts and
`node test/fpqualitygate.js` for fault-injection tests of the aggregate checker.

| Whole-frame resource ceiling at 1280×720 | Low, unchanged | High, C-29 review ceiling |
| --- | ---: | ---: |
| Three draw calls | 64 | 128 |
| Three triangles, all sampled passes | 2,500 | 300,000 |
| Three textures | 2 | 4 |
| Allocated attachment bytes | 4 MiB | 16 MiB |
| Phaser textures, full-mipmap estimate | 4 MiB | 16 MiB |

High's ceilings bound its source-detail meshes and shadow/target work separately. They are not a
native frame-rate claim. Low's original limits are not raised. Missing views, zero/empty renders,
context loss, browser errors, a mismatched actual quality and incorrect asset fixtures fail the gate.
Every selected mirror view must also show a red marker changing to blue in its real reflection.
Markers are removed and disposed before resource samples and screenshots, retaining normal views.
At least 14 models must load with no failures for healthy profiles. Fallback must load zero and
fail at least the 14 selected models, so a misconfigured interception cannot pass as fallback proof.

`test/fpbench.js` also supports `QA_FALLBACK=1` directly. Only model requests get a 404; scripts,
manifest, licences and fonts remain available. It combines with the existing theme interception.
Ordinary benchmark runs retain their previous request behavior. Each profile’s log streams measurements while it runs, so long resource checks can be inspected.
Every child report is regenerated;
the aggregate command cannot read an old report after a failed child.

The new High screenshots exposed opaque mirror housings in front of their reflective planes.
C-29 moves those High housings 17 mm farther back; their full thickness now stays behind the
surface. Low geometry, targets, gaze/scoring, reflection scheduling and render resources retain
their behavior. A geometry regression test reproduces the former 4.5 mm front-face obstruction;
the rendered marker probes prevent a flat housing from passing on resource counters alone.

Reports and PNGs are saved under `test/out/fp-review/`, with a `c29-<profile>` prefix; the summary
is `c29-quality.json`. `QA_TAG` changes that prefix. The summary records the checked Git revision,
the profile's view list and accessibility/fallback settings, each peak and the child exit status.
The raw benchmark report retains renderer identity, frame times and individual views. At handoff,
the fixed review set and final figures are copied into `docs/review/set-8/c29.md` and `docs/PERF.md`.

Cloud SwiftShader cannot establish the owner's Intel 60 fps floor (O-1). On the real laptop, use
`QA_NATIVE_GPU=1 QA_FPS_FLOOR=60 QA_PROFILES=loaded-low,accessible-low,fallback-low` and retain
the actual renderer identity and raw report. The owner also plays the real workday; fixture frames
are not a substitute for the driving/interaction checks. The broader C-47 browser results remain
in `docs/review/set-8/c47.md`; C-28 retains the loaded/fallback 264,000-view CPU sweeps.
