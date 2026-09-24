# QA suite

Automated checks for FedEx: On The Route. They drive the real game in a headless browser, the way a trainee
would, and fail loudly when something breaks. Nothing in `test/` ships with the game.

## Running it

```
cd test
npm install            # once: installs puppeteer-core (it uses the Edge or Chrome already on the machine)
cd ..
node test/qa.js        # every pass, every scenario and flow (about 45 minutes)
```

The suite serves the project itself on port 8123, so nothing else needs to be running. The exit code is non-zero if
anything failed, so it can gate a release.

| Option | Effect |
| --- | --- |
| `--only m6-find,m7-dg` | just those scenarios |
| `--pass boot,layout` | just those passes (`boot`, `layout`, `play`, `golden`) |
| `--shots` | also save screenshots to `test/out/` (boot, after random play, and any the golden path takes) |
| `--headful` | show the browser while it runs |
| `QA_PORT=8125` | serve on another port (to run two suites side by side) |
| `QA_FPS_FLOOR=100` | the frame rate a scene must hold (default 100) |
| `QA_GPU=default` | let the OS pick the GPU. By default the suite asks for the high-performance one, so on a laptop with two GPUs the floor always measures the same hardware (Windows may otherwise hand the browser either, from one day to the next). The first line of every run names the GPU it measured on. With `default` on a laptop it is usually the integrated GPU, which is the way to see what a trainee's laptop gets; expect the floor to fail there (see the QA report) |

## The passes

| Pass | What it checks |
| --- | --- |
| **boot** | the scenario loads, its intro dismisses, the expected scene is live, nothing throws, and the frame rate is above the floor |
| **layout** | walks the live display list: UI outside the 1280×720 canvas, text wider than its wrap box, hit areas the player can never reach |
| **play** | twelve seconds of randomised but plausible mouse and keyboard input (fixed seed, so it repeats): nothing throws and the scene survives |
| **golden** | a scripted playthrough, `test/paths/<id>.js`. It must finish the scenario and report a result that scores every category the scenario declares. Each path also asserts what a perfect run should earn (usually full marks) |

Any uncaught page error or `console.error` during a scenario fails it, and so does a warning the game raises for
broken content: a failed content check (`[OTR data]`, which includes the town layout), or a conversation or stop
pointing at something that does not exist (`[talk]`, `[stop]`).

### Flows

Four entries are *flows* rather than scenarios: they start on the title screen (`index.html?dev=1`) and only run
the golden pass, auditing the layout at the moments they care about.

- **`route-day`** plays a whole day as a new courier: name entry, the hub, the morning briefing, the pre-trip and
  the load (by their own golden paths), five legs of driving with the test autopilot and five doorstep stops, the
  debrief. It checks what only a route day has: Restart from the pause menu keeps the day's route and the route
  stop; a reload half way resumes the day from the hub's "Resume route"; a careful day earns full marks; the day
  rolls over. It prints anything that scored short of full marks, and takes about twenty minutes on its own.
- **`route-legs`** drives every leg of the first ten route days (`QA_ROUTE_DAYS` to change it) with the autopilot,
  stepping the game frame by frame so it takes about three minutes. Every stop the route generator produces must be
  reached with no violation and parked neatly. It is the check for changes to the town, the generator or the van.
- **`town-traffic`** leaves four towns (`QA_TRAFFIC_SEEDS`) running for four minutes each (`QA_TRAFFIC_MIN`) with no
  player, stepped frame by frame so it takes about two minutes, and checks every frame that no two cars overlap,
  none leaves the asphalt, drives into a building or takes the wrong lane, none stands still for more than half a
  minute, nobody is left standing in a traffic lane, and the two streets of a traffic light are never both let
  through and each gets a real share of the green. It is the check for changes to the traffic model.
- **`hub-briefs`** opens every scenario's brief from the hub, as a trainee does, and fails if its text runs into the
  star ratings or the buttons, or it does not fit on screen.

## Golden paths

`test/paths/<scenario id>.js` exports `async (page, ctx) => {}`. It plays the scenario with the real mouse and keys
and throws if anything is wrong. `ctx` gives it:

| | |
| --- | --- |
| `ctx.wait(ms)` | pause |
| `ctx.eval(expr)` | evaluate an expression in the page |
| `ctx.until(expr, ms)` | poll an expression until it is truthy (returns false on timeout) |
| `ctx.snap(name)` | save `test/out/<id>-<name>.png` |
| `ctx.audit(label)` | run the layout audit on whatever is on screen now (flows use it at each stage) |
| `ctx.reload()` | reload the page, keeping the saved profile, and carry on recording the result |

Shared helpers live in `test/paths/lib/`:

| File | For |
| --- | --- |
| `ui.js` | `clickText` (click whatever says something, top-most first) and `runTalk` (play a conversation on its recommended answers with the keyboard) |
| `dialogue.js` | the whole conversation scenarios (Modules 3 and 4, the fender-bender) |
| `stop.js` | the doorstep stop sets (Modules 5 and 8): shelves, handheld, hazards, doors, photo POD, exceptions, heat. `driver(page, ctx)` plays single stops for the route day |
| `pickup.js` | the three pickup scenarios (Module 7) |
| `autodrive.browser.js` | a test autopilot injected into the page for the driving drill and the route day. It presses the same keys a trainee does, so it exercises the real vehicle model and every traffic rule: it plans a legal route, stops at every line, waits for green, and pulls in parallel to the kerb |

Golden paths read the game's own data to know the right answer (which package, which exception code), but they
never set game state: every action goes through the same input a trainee uses.

## Playing by hand: `tools/playd.js`

The suite plays the ideal path. To play the way a person does (and find what a person finds), `tools/playd.js`
keeps one game open in a headless browser and takes commands over HTTP: hold a key, click, drag, take a screenshot
and look at it, read every text on screen, ask the walkable stage what E would do and which prompt is showing.

```
node test/tools/playd.js --port 9301 --out test/out/review/me
curl -s "localhost:9301/open?url=index.html%3Fscenario%3Dm5-pod%26dev%3D1"
curl -s "localhost:9301/hold?key=KeyD&ms=400"
curl -s "localhost:9301/shot?name=after-walk"
curl -s "localhost:9301/stage"
```

It is turn-based unless started with `--realtime`: the game only runs while a command acts, so a tester can think
between moves without timers running on. The comment at the top of the file lists every command. It was built for
the second, human-style review; the brief its testers followed is `docs/review/BRIEF.md`.

## Adding a scenario

1. Register it in `data/modules.js` as usual.
2. Add it to `SCENARIOS` in `test/qa.js` with the scene key it should boot into.
3. Write `test/paths/<id>.js` (or point it at a shared helper in `lib/`).
4. `node test/qa.js --only <id> --shots` and look at the screenshots.

Content validation runs separately from the suite: open `index.html?dev=1` and check the console, or call
`OTR.debug.validate()`.
