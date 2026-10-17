# Milestone 7 review evidence

## C-20: vehicle dynamics

Built from pilot `1a6408b` on `codex/c20-dynamics`, 17 October 2026. This is C-20's evidence; Claude's A-23 assembles
the full milestone checklist as the remaining tasks land.

| File | Evidence |
| --- | --- |
| `c20-manoeuvre.webm` | A 13-second real-key manoeuvre: stop, select reverse, release the brake to creep, accelerate and steer, stop, select drive, accelerate and brake. |
| `c20-reverse.png` | The first-day loaded van reversing at the assisted speed cap. |
| `c20-brake-dive.png` | The sprung body at a braking/cornering pose, with tyres level. This uses a fixed test observer and a maximum-pose fixture. |
| `c20-accessible-cab.png` | The same run with larger text, the colour filter and reduced motion; no pointer lock. |
| `c20-dynamics.json` | The 27 browser assertions and actual van/force/axle-load telemetry from real key events. |
| `c20-verification.json` | The 19 passing Node suites, 3,000-view geometry sweep, 30 resume comparisons, 100 shuffled days and 240 SCORM round trips. |
| `c20-accessibility.json` | The full 145-check keyboard day, remaps, narration, reload, reduced motion and colour filtering without AudioContext. |
| `c20-low.json`, `c20-low-reduced.json`, `c20-high.json` | Six Low viewpoints plus focused reduced-motion Low and High gates. |
| `c20-low-stress-brake.png` | The loaded day-18 mirror stress fixture under brake dive and roll. |

Try reverse creep and a short turn, then brake and compare a forward start. The rear axle should track the turn
while the nose swings out. Release the accelerator to feel the van coast. Compare a loaded van and an empty one,
then enable reduced motion: handling should stay the same while body movement stops. Keep the existing brake
pressed when selecting gear, and release it to move.

Travel, seed and loaded cargo are starting fixtures. Gear, throttle, steering and braking in the clip use real
keyboard events. The camera remains the existing player camera; the external screenshot is an inspection fixture.
The old mirror/G.O.A.L. prompts and score rules remain pending A-19/C-23/C-24. Physical controls, always-live mirrors
and the automatic rear camera belong to those follow-up tasks.

Reproduce from the served checkout on port 8302:

```sh
node test/fpdriving.js
QA_LATER=1 node test/fproute.js
QA_LATER=1 node test/fpresume.js
QA_CLIP=1 node test/fpdynamicsbrowser.js
QA_BROWSER=/usr/bin/chromium QA_NO_AUDIO=1 node test/fpaccessbrowser.js
```

The browser script writes to `test/out/fp-review/`. Its optional recording needs ffmpeg. The committed WebM is
remuxed with `ffmpeg -i input.webm -c copy output.webm` to finalize duration and seeking, without changing frames.
See `docs/3D-DYNAMICS.md` for the model and trainer hook, and `docs/PERF.md` for the graphics gate and commands.
Native Intel frame-rate acceptance remains O-1; software FPS cannot certify it.
