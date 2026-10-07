# First-person scanner browser checks — October 7, 2026

Tested application revision: `ab7b56ddc319e7afadcc1d397ed94d219673f0a1`, on `codex-first-person`. Comparison revision: `2920d9d`, the connected prototype immediately before the scanner changes. Browser testing was explicitly approved by the user. No new artwork or translation changes are included in this QA pass.

## Functional results

| Check | Result |
| --- | --- |
| `node --test test/firstperson.js test/fpmission.js test/fpworld.js test/fphandheld.js` | 62 passed, 0 failed, 0 skipped |
| `node test/fpbrowser.js` | Exit 0; English/high: 55 checks passed |
| `QA_GFX=low node test/fpbrowser.js` | Exit 0; English/low: 55 checks passed |
| `QA_LANG=hi node test/fpbrowser.js` | Exit 0; Hindi/high: 56 checks passed |
| Local lifecycle probe (`test/out/fp-review/lifecycle.cjs`) | Exit 0; 8/8 checks passed: three scene restarts, scanner cancellation/pause on synthetic window blur, stationary player/clock while paused, resume, resize and error/context checks |
| `QA_FPS_FLOOR=0 QA_PORT=8300 node qa.js` (from `test`) | **Exit 1; 35/36 scenarios clean.** Route-day failed: “the framed photo was graded private.” |
| Previous prototype: `QA_FPS_FLOOR=0 QA_PORT=8304 node qa.js --only route-day` | Exit 0; 1/1 scenario clean |
| HTTP-adapted `node town3d.js` | Exit 0; 18/18 checks passed, no page errors |
| HTTP-adapted `node art.js` | Exit 0; 5/5 assertions passed; original assets restored |
| HTTP-adapted `node driving.js` | **Exit 1; 18/19 checks passed.** Failed: “pulled in and stopped for the ambulance: right”; no page errors |
| HTTP-adapted `QA_LANG=hi node a11y-screens.js` | Exit 0; 14/14 screens clean with large text and colour filter; no page errors; 19 untranslated source entries reported |

The three prototype runs cover real key input, barcode raycasts and continuous-trigger scans, all three parcel pickups and shelf placements, cargo doors/restraints, tyre/light checks, cab entry, belt/mirror use, the handheld interlock while driving, delivery scans and outcomes at three stops, checkpoint reload, a physical parcel return scan, Dispatch/debrief and isolated cargo practice. They drive the first road leg with throttle/brake keys. Position fixtures skip repetitive walking and subsequent road legs; these are scripted integration checks, not a complete manual drive of the route.

All three runs recorded zero page errors and zero layout-audit findings. Captures include the handheld, inspection panels, contact/outcome screens, receipts, debrief and settings at 1280×720; settings are also captured at 960×540. Hindi settings and delivery screenshots were visually inspected: Devanagari glyphs render and the inspected text fits. New prototype wording remains English as planned; this is not a claim that the prototype is fully translated. The separate accessibility run also inspected the existing course screens with Hindi, large text and the colour filter.

The legacy photo failure remains unresolved. Its scenario passed on the previous prototype, and its test and StopScene code are unchanged by the scanner pass. Earlier graphics QA also recorded intermittent photo failures; a passing isolated comparison does not make the current full run a pass. The ambulance assertion was already reproduced against main in [GRAPHICS-NOTES.md](GRAPHICS-NOTES.md); its fixed real-time wait can allow the emergency vehicle to pass before the scripted pull-over. This pass does not change driving rules, privacy grading or protected tests to suppress either failure.

## Environment and reproduction

Chromium: `/usr/bin/chromium`, version **151.0.7922.173** on Debian 13. GPU: ANGLE Vulkan **SwiftShader Device (Subzero)**, a software renderer. FPS-floor enforcement was deliberately disabled for the existing full QA command, as requested. Neither its success counts nor these software-rendered timings certify performance on an integrated-GPU laptop.

Managed Chromium blocks `file://` with `net::ERR_BLOCKED_BY_ADMINISTRATOR`. The first direct art test exited 1 at navigation after its packing assertion passed. Browser policy was left unchanged. Tests then used an ordinary loopback HTTP server serving the same checkout on port 8302; the previous revision was served on 8305. **Direct disk launch remains unverified for this revision.** The game still uses bundled classic scripts and has no new server, fetch or build dependency.

The legacy file-URL tests ran with `QA_BROWSER=/usr/bin/chromium` and the existing local test transport adapter:

```sh
NODE_OPTIONS=--require=/workspace/.courier-cloud/graphics/pass2/quick-http.cjs node town3d.js
NODE_OPTIONS=--require=/workspace/.courier-cloud/graphics/pass2/quick-http.cjs node art.js
NODE_OPTIONS=--require=/workspace/.courier-cloud/graphics/pass2/quick-http.cjs node driving.js
QA_LANG=hi NODE_OPTIONS=--require=/workspace/.courier-cloud/graphics/pass2/quick-http.cjs node a11y-screens.js
```

The adapter substitutes the local HTTP transport and waits for Hindi selection where requested. `QA_PASS2_BASELINE` was unset: no application scripts or assertions were replaced. Run art separately because it temporarily rebuilds/moves packed assets. All services used ports 8300 or above.

The new browser runners accept `QA_BASE` (default `http://127.0.0.1:8302`), `QA_BROWSER`, and `QA_GFX`. `fpbrowser.js` also accepts `QA_LANG`. Start a static server for the selected checkout before running them. Logs, screenshots and machine-readable results are written under ignored `test/out/fp-review/`.

## Performance measurements

`test/fpbench.js` runs the unchanged `index.html?bench=1` suite, then samples the first-person hub, depot, cab, requested mirror and device for ten seconds each after a 1.5-second warm-up. The new scanner also has a barcode-aim sample. Prototype measurements use raw `performance.now()` intervals between game frames; worst 1% means FPS from the mean duration of the slowest 1% of sampled frames. The built-in benchmark retains its existing Phaser-delta calculation. Those two measurement methods should not be mixed.

Baseline and current builds run sequentially in separate clean browsers at 1280×720, with no other test browser running. `QA_TAG=baseline`/`current` labels the output; `QA_BASE` selects the checkout. The older “handheld” is a generic panel, so that row measures different interfaces rather than the same visual workload.

All four full benchmark runs completed with exit 0, 12/12 built-in screens, no page errors and no lost WebGL context. No FPS acceptance threshold is imposed by the runner.

Each cell is **average / worst 1% FPS**.

### First-person raw frame intervals

| View | Previous high | Current high | Previous low | Current low |
| --- | ---: | ---: | ---: | ---: |
| hub | 42.09 / 16.50 | 37.69 / 13.68 | 47.90 / 17.23 | 49.58 / 16.63 |
| depot | 35.27 / 15.79 | 28.48 / 11.16 | 43.67 / 16.94 | 43.96 / 17.24 |
| cab | 34.10 / 14.15 | 32.93 / 12.91 | 46.17 / 18.44 | 44.94 / 13.74 |
| mirror | 32.30 / 14.62 | 30.89 / 15.20 | 39.77 / 13.63 | 41.33 / 18.57 |
| handheld | 25.28 / 11.09 | 29.77 / 11.10 | 29.00 / 12.51 | 37.73 / 15.24 |
| barcodeAim | Not available | 26.80 / 12.13 | Not available | 37.09 / 15.12 |

These are stationary view samples with the mission updating where applicable; they do not measure a complete driven route. Ten-second samples are sensitive to individual stalls. The current low-quality cab sample included one 135.1 ms frame. High-quality averages and tail timings varied enough to warrant a second pair of prototype runs.

### Existing built-in benchmark

| Screen | Previous high | Current high | Previous low | Current low |
| --- | ---: | ---: | ---: | ---: |
| Title screen | 34 / 30 | 34 / 29 | 30 / 26 | 33 / 29 |
| Hub | 24 / 18 | 24 / 20 | 23 / 20 | 24 / 21 |
| Town drive (traffic, driving) | 32 / 24 | 28 / 20 | 28 / 22 | 25 / 15 |
| Town drive in rain at dusk | 14 / 12 | 14 / 13 | 19 / 14 | 22 / 18 |
| Town drive at night (lights) | 14 / 12 | 15 / 12 | 23 / 18 | 24 / 19 |
| Road Hazards | 32 / 22 | 32 / 26 | 26 / 21 | 29 / 23 |
| Doorstep stop | 25 / 19 | 27 / 23 | 22 / 20 | 20 / 13 |
| Icy steps stop | 21 / 17 | 25 / 21 | 24 / 20 | 23 / 20 |
| Conversation | 41 / 30 | 42 / 37 | 37 / 27 | 41 / 33 |
| Sort belt | 60 / 60 | 60 / 60 | 52 / 43 | 58 / 50 |
| Pre-trip walkaround | 35 / 29 | 37 / 32 | 32 / 23 | 34 / 30 |
| Loading the truck | 55 / 46 | 53 / 43 | 50 / 42 | 53 / 40 |

### Repeated prototype measurements

A second pair was run with `QA_PROTOTYPE_ONLY=1`, reversing the baseline/current order within each quality setting. All four repeat runs exited 0 with zero page errors and no lost context. Each cell remains average / worst 1% FPS.

| View | Previous high | Current high | Previous low | Current low |
| --- | ---: | ---: | ---: | ---: |
| hub | 40.46 / 17.69 | 36.17 / 14.79 | 48.50 / 21.01 | 46.96 / 20.20 |
| depot | 32.39 / 13.68 | 32.66 / 14.55 | 42.88 / 18.63 | 42.86 / 18.08 |
| cab | 33.60 / 13.48 | 32.45 / 8.33 | 45.48 / 19.28 | 44.35 / 18.75 |
| mirror | 30.63 / 13.47 | 30.67 / 14.17 | 42.96 / 18.58 | 40.57 / 16.35 |
| handheld | 24.50 / 12.00 | 30.46 / 13.82 | 27.07 / 11.84 | 39.69 / 13.69 |
| barcodeAim | Not available | 27.87 / 12.80 | Not available | 37.36 / 14.03 |

**Performance is not cleared.** The high-quality hub averaged approximately 10.5% slower in both comparisons. Other averages overlap more closely, but tail timings remain uneven: the current high-quality cab repeat had a 254.7 ms maximum frame and 8.33 FPS worst 1%. The low-quality cab repeat improved to 44.35 FPS average / 18.75 worst 1%, with a 58.5 ms maximum, compared with 44.94 / 13.74 and 135.1 ms in its first sample. These readings do not establish a regression-free frame budget.

Low quality reduced the current prototype’s rendering cost in both runs. The high-quality hub difference and long frame stalls need profiling and repeat testing on a representative integrated-GPU laptop before accepting performance. The unchanged course benchmark also varied across runs; software-rendered cloud measurements alone cannot identify the cause of each difference.

## Review status

The prototype workflow, inspected Hindi layouts and restart/focus-loss/resize checks passed. The legacy full-suite photo assertion, existing ambulance assertion, performance clearance and direct file launch remain open. This QA pass adds reusable browser/benchmark runners and documentation; it makes no application, artwork, translation or protected-test changes. Nothing is merged into main.

## GitHub Pages test-branch default launch

`index.html` on `codex-first-person` now selects `lab=firstperson` when no explicit launch mode is supplied. It preserves the project path, existing parameters and URL fragment without a second page load. `?main=1` opens the original game, and the prototype's Main game option supplies that override. Explicit `lab`, `scenario` and `bench` options retain their existing routing. Legacy tests that intentionally begin at the original title screen need the `main=1` launch override on this test branch; protected test files were left unchanged.

Targeted browser verification: **exit 0, 13/13 checks passed, zero page errors**, using an HTTP project subdirectory to match GitHub Pages routing. Checks covered the site root, direct index, low graphics/Hindi/user/fragment preservation, reload, the Main game link, direct `main=1`, town lab, a loading scenario, benchmark startup, the explicit first-person launcher and graphics-settings reload. The local probe and results are in ignored `test/out/pages-launch/`.

This verifies the launch change locally; GitHub Pages publication is performed by the user. The full gameplay suite and FPS benchmarks were not repeated for this entry-point change. The earlier failures and performance limitations above remain open.
