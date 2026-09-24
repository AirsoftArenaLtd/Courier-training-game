# Human-style review: brief for every tester

This is the shared brief for the second review of **FedEx: On The Route**, a courier-training simulator (Phaser 3,
1280×720, runs in a browser). It will be used by trainees at an enterprise customer, **on typical company computers**
(integrated graphics, mouse and keyboard). A first QA pass (see `docs/QA-REPORT.md`) fixed the big defects and left
an automated suite (`test/qa.js`) that passes. The suite plays each scenario along its *ideal* path. It does not
play like a person, so it misses small things a person hits at once. The owner's words:

> "there are a lot of very small, easy to miss issues. When showing up to a house it allows you to walk right out
> of the vehicle without stepping out of the vehicle, so you end up on a different level. Sometimes the prompts for
> actions like step out of the vehicle, search the shelves, or inspect house number don't show up properly and you
> almost have to wiggle in place to get them to show up. Play around with it, review it like a human: if some
> feature is stupid or something doesn't look right, flag it, move on, then revisit it later."

**Your job is to find those things, not to fix them.** Play your area the way a trainee would, and then the way a
careless, curious or impatient trainee would. Look at every screen. Record every defect, rough edge, confusing
moment and bad design decision you find, with enough detail that someone else can fix it without re-finding it.

## Rules

- **Do not edit any file in the project** except your own findings file, `docs/review/<your area>.md`, and your
  screenshots under `test/out/review/<your area>/`. Fixing happens later, all together.
- Use only **your own port** for the play tool (given in your task). Do not run `test/qa.js` (it takes port 8123
  and a long time) and do not stop other people's processes.
- **Write findings as you go** (append to your file after each one or two), so nothing is lost if you are cut off.
- Confirm a finding happens more than once before recording it as a bug; if you saw it once and could not repeat
  it, record it anyway, marked *seen once*.
- When you are done, stop your play tool (`/quit`).

## The play tool

`test/tools/playd.js` keeps one game session open in a headless browser and takes commands over HTTP. Read the
comment at the top of the file for the full list. Start it in the background (Bash tool, `run_in_background`):

```
node test/tools/playd.js --port <your port> --out test/out/review/<your area>
```

then wait until `curl -s localhost:<port>/state` answers. Typical use:

```
curl -s "localhost:<port>/open?url=index.html%3Fscenario%3Dm5-pod%26dev%3D1"   # boot one scenario
curl -s "localhost:<port>/press?key=Enter"                                    # dismiss a card
curl -s "localhost:<port>/hold?key=KeyD&ms=400"                               # walk right for 0.4 s
curl -s "localhost:<port>/press?key=KeyE"                                     # interact
curl -s "localhost:<port>/clicktext?re=Take%20this%20package"                 # click a button by its text
curl -s "localhost:<port>/shot?name=van-1"                                    # screenshot; then Read the PNG
curl -s "localhost:<port>/stage"                                              # walkable scenes: where the courier is,
                                                                              # what E would do, whether its prompt shows
curl -s "localhost:<port>/texts"                                              # every visible text with screen boxes
curl -s -X POST --data "OTR.game.scene.getScenes(true).map(s=>s.sys.settings.key)" localhost:<port>/eval
curl -s "localhost:<port>/log"                                                # warnings and errors since last call
```

- It is **turn-based** by default: the game is frozen between your commands and only runs while one is acting, so
  thinking time never costs you. `/run?ms=1500` lets it play on. Switch to real time with `/mode?turn=0` when you
  want to judge feel, animation or timing (and back with `/mode?turn=1`).
- **Look at the screenshots** (open the PNG with the Read tool). Most of what matters here is visual. `/burst`
  takes several shots in a row, for animations, transitions and flicker.
- `/stage` is how you check prompts precisely: `nearest` is what E would do right now; `prompt` is the prompt
  actually on screen (label, alpha, position). A `nearest` with no visible prompt, a prompt for something else, or
  a prompt that is off screen or under the HUD, is a finding.
- `/eval` can read anything in the game (`OTR` is the global namespace; the active scene is
  `OTR.game.scene.getScenes(true)`). Use it to understand what you see, **not to set up state a trainee could not
  reach**. Drive the game with keys and the mouse.

### Work economically

The first round of testers ran out of budget before they got far, mostly on full-size screenshots and one command
per step. So:

- **Screenshots are half size (640×360) by default**, which is enough to judge layout. When you need to read small
  text or check a detail, crop that region at full size (`&clip=x,y,w,h`, in 1280×720 screen coordinates) rather
  than taking `&full=1`. Look at a screenshot when the question is visual; when it is a fact (what does it say,
  where is the courier, is the prompt up), ask `/stage` or `/texts?match=<regex>` instead.
- **Batch commands.** Put several curls in one Bash call (for example: hold a key, then `/stage`, then `/shot`), then
  look at the image. Every tool call re-sends everything so far, so fewer, fuller calls go much further.
- **Read code narrowly:** Grep for what you need and Read line ranges, not whole files.
- **Budget:** aim to cover your whole area in about 150 tool calls. Go breadth first (every scenario in your area,
  once, noting what looks wrong), then spend what is left on depth where the problems are.
- **If your findings file already has entries** (you are resuming an interrupted review), carry on from where it
  stops; do not redo what it already records.

URLs: `index.html?dev=1` is the real game from the title screen (new profile, hub, route days).
`index.html?scenario=<id>&dev=1` boots one scenario directly. `index.html?lab=street|town|rig` are art labs.
Scenario ids: m1-pretrip, m1-route, m1-driving, m2-sort, m2-lift, m2-labels, m3-missing, m3-signature,
m3-twostops, m4-address, m4-damaged, m4-storm, m5-pod, m5-exceptions, m5-adult, m6-load, m6-find, m7-business,
m7-intl, m7-dg, m8-steps, m8-dog, m8-heat, m8-incident. ESC opens the pause menu.

Where things are: scenes in `src/scenes/` (stops: `stops/StopScene.js`; conversations: `shared/DialogueScene.js`;
town driving: `shift/TownDriveScene.js`; the drill: `m1/DrivingScene.js`), shared engine in `src/core/` (the walkable
stage and its prompts: `stage.js`; characters: `rig.js`; UI helpers: `ui.js`; the van model: `vehicle.js`), content
in `data/`. The golden paths in `test/paths/<id>.js` (and `test/paths/lib/`) show how each scenario is driven and
are the quickest way to learn a scene's controls.

## What to look for

Play every scenario in your area **at least twice**: once properly, once badly (wrong answers, wrong packages,
wandering off, spamming keys, clicking during animations, pausing mid-action, restarting from the pause menu).

- **Movement and position:** walking somewhere you should not be able to (out of a vehicle, through a wall, off a
  porch into the air, behind scenery); standing at the wrong height; sliding, jittering, teleporting; the camera
  losing the courier or framing things badly; getting stuck.
- **Prompts and interactions:** a prompt that is missing, flickers, shows the wrong action, appears only after a
  wiggle, sits off screen or behind the HUD, or overlaps another; E doing something other than the prompt says;
  ranges that are too tight (you must stand on one exact pixel) or too loose (E fires from across the yard); two
  interactions fighting over one spot; clicking an object doing something different from pressing E beside it.
- **Sequence breaks and soft-locks:** being able to do steps out of order in a way that makes no sense, or not being
  able to do something that should obviously be allowed; getting stuck with no way forward except restarting.
- **Visual defects:** text clipped, overlapping, off screen, too small to read, or low contrast; wrong z-order
  (things drawn in front of what should cover them); objects floating or sinking; popping; mismatched art; stale
  UI left on screen after it should be gone.
- **Feedback and scoring:** feedback that is wrong, unclear, contradicts the rule on screen, or does not say what
  you did wrong; scoring that punishes the right answer or rewards a wrong one; results that do not match the play.
- **Content:** training that is inaccurate or inconsistent (names, addresses, numbers that change between screens),
  typos, instructions that describe controls the scene does not have (or miss ones it does).
- **Controls:** keyboard and mouse should both work where a trainee would expect them; keys that work in one scene
  and not in a similar one; held keys that misbehave after a pause or a modal.
- **Design:** anything tedious, confusing, pointless or annoying ("stupid" is a valid finding). Say why and what
  would be better.
- **Performance hitches:** stutters, long pauses, anything that feels slow.

Wiggle near every interaction: approach from both sides, stop short, overshoot, stop exactly on it, tap left and
right, walk away and back. Try every interaction with the mouse as well as E.

## How to record a finding

Append to `docs/review/<your area>.md`:

```
### <AREA>-<n>: <one-line title>
- **Severity:** blocker | major | minor | polish | design
- **Where:** scenario / screen / step
- **Repro:** exact steps (playd commands are fine)
- **Expected:** …   **Actual:** …
- **Evidence:** screenshot path(s); /stage or /texts excerpts
- **Suspected cause:** file:line, if you looked (optional but valuable)
- **Suggested fix:** …
```

Severity guide: *blocker* stops a trainee finishing or corrupts progress; *major* is plainly broken or teaches the
wrong thing; *minor* is wrong but easy to live with; *polish* is cosmetic; *design* is a judgment about how it
should work.

Keep a short **Revisit** list at the bottom for things you flagged in passing and meant to come back to, and
finish the file with a **Summary**: the ten findings that matter most, in order, and what you did not get to.
