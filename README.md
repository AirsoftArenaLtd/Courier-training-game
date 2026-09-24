# FedEx: On The Route — Courier Training Simulator

A browser training simulator: a **station hub** with 8 training modules (24 scenarios) and a **connected route day**
where you brief, inspect, load, drive a town and work each stop with a handheld scanner.

Built with Phaser 3. No build step, no backend, no asset files — every character, building and sound is generated
in code — and progress is saved in `localStorage`.

> Training simulation built on general, publicly available safety and customer-service guidance. It is **not** a
> substitute for official procedures, policies, or hands-on training. Exception codes, refusal reasons and
> document rules in the game are illustrative: use your station's official lists.

## Running it

- **Easiest:** double-click `index.html` (it works straight from disk).
- **Or serve it:** `python -m http.server 8080` in this folder, then open http://localhost:8080.
- **Offline:** the page loads Phaser from the jsdelivr CDN, falling back to the local copy in `lib/phaser.min.js`.

Desktop browser recommended. Sound is generated in-browser. Use the speaker button (or the pause menu) to mute.

## The two ways to play

### 1. Today's Route (the connected day)

From the hub, **Start the route**. One day runs:

| Phase | What happens |
| --- | --- |
| Morning briefing | Weather, the manifest, and a safety topic check with the dispatcher |
| Pre-trip | The walkaround inspection (Module 1) |
| Load the truck | Shelve the day's packages in stop order (Module 6) |
| Drive | Top-down driving through Maple Grove: traffic, signs, lights, pedestrians, speed limits |
| Each stop | Park, work the doorstep: find the package, scan, walk up, knock, deliver or except |
| Debrief | Route map, day stars, what went well and what to work on |

The route is generated from the day number, so every day has a different set of stops, addresses, customers and
weather. A half-finished day is saved: the hub offers **Resume route**.

### 2. Training Academy (practice any module)

| Module | Scenarios |
| --- | --- |
| Route & Driving | Pre-Trip Walkaround · Route Planner · Road Hazards |
| Package Handling | Sort Belt · Lift Right · Label Check |
| Customer Interaction | Where's My Package?! · Signature Required · Two Stops, Two Styles |
| Problem Solving | Wrong Address · Damaged on Arrival · Storm Warning |
| Scanner & Exceptions | Proof of Delivery · Exception Calls · Adult Signature & ID |
| Loading the Truck | Load for the Route · Find It Fast |
| Pickups & Paperwork | Business Pickup · International Docs · Declare It or Refuse It |
| Safety & Wellness | Watch Your Step · Dog Encounter · Heat Wave · After a Fender-Bender |

The five older minigames were rebuilt on the newer engines:

- **Pre-Trip Walkaround** — five views around the truck, hotspots, a close-up inspector with tests that gate the
  Pass/Flag call, and a sign-off report whose missed defects roll out with the truck.
- **Route Planner** — the day's manifest against the real Maple Grove map. Driving time is measured along the
  street network, so closures mean detours; service commitments, pickup windows and the school zone all bite, and
  the plan is scored against the best possible loop.
- **Road Hazards** — a hazard drill driven on the town engine (six checkpoints, with a ball and a child, an
  opening car door, standing water, a crossing and a school bus, judged on the speed and clearance you had).
- **Sort Belt** — each package's destination is hidden behind a scan, with DG and heavy-freight rules and jams.
- **Lift Right** — timing meters replaced with continuous posture control.
- **Label Check** — an inspection station: turn the package through all six sides, read what is actually on it,
  and put it on the right handling station. Deciding before you have looked is logged as a blind call.

## Controls

**Doorstep stops (walkable):** `A`/`D` or arrow keys to walk (or click the ground) · hold `SHIFT` to walk carefully
on ice, wet steps and cluttered paths · `E` to interact · `TAB` for the handheld · `ESC` to pause.

**The handheld:** scan packages, read stop details, record a delivery (signature, photo POD, hand-off), record an
exception code, and print door tags. Number keys pick menu options.

**Driving:** `W`/`↑` throttle · `S`/`↓` brake, then hold at a standstill for reverse (lift off the brake first) ·
`A`/`D` steer · `SPACE` handbrake · `B` seatbelt · `L` headlights · `G` get out and look (before backing) ·
`P` park at the stop zone. Rules watch speed, stop signs and lights, right of way, wrong-side driving, the belt,
headlights in rain or dark, backing without G.O.A.L., and using the handheld while moving.

**Sort belt:** click a package (or `SPACE` for the one at the front) to scan it — the scan is what tells you the
bin — then drag it into a bin or press `1`-`5`. `SPACE` also clears a jam.

**Lifting:** `A`/`D` step · `S` bend your knees · `W` straighten up · `SPACE` grip and release. Your knees and your
distance from the load decide how far your spine has to hinge, and the SPINE LOAD gauge shows the result live.

**Label check:** `A`/`D` turn the package · `W` top · `S` base (or click the six face dots) · drag it onto a
handling station, or press `1`-`6` · `G` opens the label guide.

**Route planner:** click stops — on the map or the manifest — in the order you mean to drive them; click one again
to pull it back out. `BACKSPACE` undoes, `ENTER` dispatches.

**Loading:** drag packages from the cart onto the shelves.

## How progression works

- **Stars:** each scenario awards 0–3 stars per category (Safety, Efficiency, Service) from a 0–1 performance ratio
  (thresholds in `data/config.js`). Career stars are your *best* per scenario, and set your Courier Rank.
- **Stop reports:** every doorstep stop ends with an itemised report — each check, what it was worth, and the lesson
  behind anything you missed.
- **Route days** are recorded separately (best stars per category, last 10 days) and advance the day counter.
- **Reset:** the hub's settings (gear icon) has *Reset All Progress*.

## Project layout

```
index.html              script tags (load order matters: data → core → scenes → main)
data/                   ALL content (edit these)
  config.js             branding, palette, categories, ranks, star thresholds, dispatcher tips
  modules.js            module + scenario registry shown on the hub
  town.js               the town: streets, blocks, depot, residents, businesses
  scanner.js            handheld delivery types and exception codes
  shift_briefs.js       morning safety briefings
  m1_*.js m2_*.js       pre-trip, routes, road hazards, sorting, lifting, labels
  m3_dialogues.js m4_dialogues.js m8_incident.js
  m5_stops.js m8_stops.js   walkable doorstep stop sets
  m6_loading.js m7_pickups.js
src/core/
  theme, textures, draw     colour/text helpers, canvas texture factory, vector painters
  rig.js                    animated full-body people and dogs (walk, carry, knock, sign, slip, bark…)
  scenery.js                houses, storefronts, lobbies, the van, props, cargo interior
  townart.js  town.js       top-down road/building art and the town model
  stage.js                  walkable side-view stage: ground profile, camera, interactions
  atmos.js                  time of day, weather, ambience
  talk.js                   conversation/situation engine (shuffled choices, flags, scene actions)
  scanner.js                the handheld device UI + package label art
  scorelog.js               itemised per-check scoring
  shift.js                  the route day: generation, phases, persistence
  audio, save, scoring, validate, fx, ui, flow
src/scenes/
  Boot, Title, Hub, Results, Pause, BaseScenarioScene
  m1/ m2/                 module 1 and 2 minigames (DrivingScene extends the town drive engine)
  shared/DialogueScene.js
  stops/StopScene.js      walkable doorstep deliveries
  m6/LoadingScene.js  m7/PickupScene.js
  shift/                  TownDriveScene, ShiftBriefScene, ShiftDebriefScene
```

Everything uses classic `<script>` tags attaching to `window.OTR` / `window.OTR_DATA`. There are no ES modules and
no `fetch`, which is why it runs from `file://`.

## Test & dev URLs

| URL | What it does |
| --- | --- |
| `index.html?scenario=m5-pod` | Boots straight into one scenario using a throwaway profile. Nothing is saved. |
| `index.html?dev=1` | Validates all content on boot (warnings in the console) and enables `OTR.debug`. |
| `index.html?lab=rig` | Art lab: character rigs and animations. |
| `index.html?lab=street` | Art lab: a doorstep scene (`&tod=evening&weather=rain` to try conditions). |
| `index.html?lab=town` | Art lab: free driving in the town with four random stops. |

Scenario ids: `m1-pretrip`, `m1-route`, `m1-driving`, `m2-sort`, `m2-lift`, `m2-labels`, `m3-missing`,
`m3-signature`, `m3-twostops`, `m4-address`, `m4-damaged`, `m4-storm`, `m5-pod`, `m5-exceptions`, `m5-adult`,
`m6-load`, `m6-find`, `m7-business`, `m7-intl`, `m7-dg`, `m8-steps`, `m8-dog`, `m8-heat`, `m8-incident`.

Console helpers (with `?dev=1`): `OTR.debug.start('m5-pod')`, `OTR.debug.finishNow(0.9)`, `OTR.debug.validate()`.

## Automated QA

`node test/qa.js` plays every scenario, and a whole route day, in a headless browser with the real mouse and keys,
and fails on any crash, layout fault or playthrough that does not finish and score the way it should. See
[`test/README.md`](test/README.md) for how to run it and add to it, and [`docs/QA-REPORT.md`](docs/QA-REPORT.md) for
what the last full pass found and fixed.

## Editing content

Everything a trainer normally changes lives in `data/`. Each file's header comment documents its fields.

- **Doorstep stops** (`m5_stops.js`, `m8_stops.js`): the address and building, the packages and near-miss decoys,
  who answers the door, hazards on the path, dogs, what the correct outcome is, and the conversation graphs.
- **Conversations** (`talk.js` format): choices are shuffled, can set flags, can be conditional, can run scene
  actions (a dog charging, an owner coming out) and are scored per category.
- **The handheld** (`scanner.js`): delivery types and exception codes.
- **The town** (`town.js`): streets, block density, speed limits, traffic lights, school zone, residents.
- **Briefings** (`shift_briefs.js`): the safety topic rotation.
- **Road hazards** (`m1_driving.js`): which hazard fires at which checkpoint, the lesson behind each one, and the
  par time a careful drive should make.
- **The sort belt** (`m2_sorting.js`): the bins, the wave rules and the chance of each package kind.
- **Pre-trip** (`m1_pretrip.js`): the walkaround items, which view they are on, what the defect is and what it costs.
- **Route planner** (`m1_routes.js`): the service commitments and their cut-off times, and each round's stop mix,
  pickup windows, road closures and start time. Addresses come from the town, so a round is a seed plus a manifest.
- **Label check** (`m2_labels.js`): the handling stations and their precedence, and each package's marks — per
  face — its damage and the coaching line behind it.

After editing, open `index.html?dev=1` and check the console for validation warnings.
