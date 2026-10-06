# First-person courier conversion

Branch: `codex-first-person`, starting from published main at `b41026191ca3af0341af3603142271fcefe0b368`.

The target is a complete first-person courier game. Every playable module takes place in a consistent 3D environment with shared movement, interactions and art direction. The existing start and module-selection screens can remain familiar. Module selection launches missions in this world.

## Publication and ownership

- Commit focused changes to this branch. Publishing to main requires new, explicit user permission. Earlier permission to publish the graphics work does not apply to this conversion.
- Preserve Claude's protected translation, record, language-picker, font and QA files. Ask before a required edit to any of them.
- Keep conversion notes here rather than in shared QA documentation.
- Generated pictures and art assets require the user's manual review before graphic testing or integration. Start with simple placeholder geometry; establish the visual direction and asset review process before producing finished artwork.

## First milestone: depot foundation

Build a small, opt-in development scene with a depot floor, inspection space, one package and a van. It is the first step toward converting every module, not a substitute for that conversion.

The first review should answer whether moving, looking and interacting feel comfortable:

1. Walk and look with predictable movement and adjustable sensitivity. Avoid forced camera bob or shake.
2. Collide reliably with walls and objects; stop movement and clear held inputs on pause or focus loss.
3. Aim at a nearby object to interact. Use a shared range/visibility check so objects cannot be used through walls.
4. Inspect and rotate a package, then return cleanly to walking. Keep labels readable.
5. Enter and exit the van with clear walking and cab control contexts, checking that the exit position is clear.

Implementation files: `src/core/firstperson.js` for movement and interaction, `src/core/world3d.js` for the rendering lifecycle, and `src/scenes/FirstPersonScene.js` for the prototype. Classic script registrations in `index.html` and an opt-in launch through `src/scenes/LabScene.js` connect them. The initial planning commit contained documentation; the prototype implementation and its review instructions are recorded below.

## Second milestone: one complete courier task

Connect the systems in a single playable mission: inspect the van, scan and load one package, enter the cab, drive a short route, park, retrieve the package, walk to a customer and complete delivery.

Tune driving controls during this milestone. Reuse useful parts of the existing cab and vehicle model, while making steering, centring, braking, visibility and low-speed manoeuvring predictable. Mirrors and signals should support observing traffic and choosing safe gaps. Assessment should record observable decisions and actions; a camera glance does not prove that a trainee noticed a hazard.

## Module conversion map

| Existing module | Shared first-person setting and actions |
| --- | --- |
| Route & Driving | Depot walkaround, handheld route planning, cab driving, developing hazards |
| Package Handling | Sorting belt, scanning, package inspection, lifting choices and equipment |
| Customer Interaction | Houses and businesses, conversations and package handovers |
| Problem Solving | Address checks, recovery, damage inspection, dispatch contact and weather decisions |
| Scanner & Exceptions | Handheld use, delivery photos, signatures, ID checks and exception records |
| Loading the Truck | Cargo area, shelves, load order, securing freight and finding packages |
| Pickups & Paperwork | Business pickup counter, piece counts, inspection and document checks |
| Safety & Wellness | Delivery paths, slippery surfaces, dogs, heat management and incident response |

Reuse depot, van, town and customer locations across missions. Documents and handheld tasks use readable close-up interactions within the mission. Retain applicable content, translations and progress data; adapt scenario completion and assessment triggers as modules move to the shared interaction system.

## Runtime and performance

- Preserve local `file://` operation, bundled dependencies, classic scripts and `window.OTR` / `window.OTR_DATA` registration. No ES modules, fetch-based asset loading, CDN or build step.
- Start with the bundled three.js r158 and existing Phaser interface. Phaser has no depth buffer; 3D rendering needs its own target with depth and careful restoration of the shared GL state.
- Keep resources owned and disposable by the scene, including render targets. Handle restart, resize and failed loading cleanly.
- Use simple geometry, restrained texture sizes and baked lighting. Low quality must retain all essential training interactions while reducing rendering cost.
- Test on representative integrated-GPU hardware before expanding the environment. Record average and worst 1% frame times, download size and startup cost. Cloud SwiftShader results do not certify laptop performance.
- Rendering runs on the trainee's laptop; company hosting delivers static game files and existing account/progress services. A shared multiplayer simulation or cloud-rendered video stream is outside the proposed scope.

## Validation approach

Use ports 8300 and above. Keep protected repository tests unchanged and stop owned processes by PID. Run checks appropriate to each implementation milestone, then the existing regression suite before proposing a release. Request manual approval for new artwork before graphic testing. List new on-screen strings here and render them through `OTR.txt`; look up source strings with `OTR.i18n.src`.

The planning commit changes documentation only. It does not add a playable first-person scene, generate assets or require a game QA rerun. The graphics revision's ambulance assertion and intermittent Drive Map navigation test remain recorded in `docs/GRAPHICS-NOTES.md`; this plan does not resolve them.


## First prototype: implemented for manual review

Entry point: **`first-person.html`**. Extract the branch checkout or ZIP before opening this file in a browser. It redirects to `index.html?lab=firstperson`. The usual `index.html` menu continues to open the existing training game; module conversion is still future work. `first-person.html?gfx=low` selects the cheaper render target and omits decorative meshes. `?sensitivity=0.001` halves the default mouse sensitivity; the accepted range is 0.0005–0.006.

This prototype includes a depot, a package-inspection table, a van, a short road and a house with a marked delivery bay. All world objects are simple procedural placeholder geometry. No generated pictures, replacement art, models from a CDN or new binary assets are included.

### Play the task

1. Click the game canvas to start and capture the mouse. If capture is unavailable, hold the left mouse button and drag to look. Esc pauses/releases capture; click or Enter resumes. Movement stops on focus loss.
2. WASD or arrow keys walk. Look at the package on the depot table, move close and press E to inspect it. A/D rotates the inspected package; E scans its label when it faces you. F returns to walking.
3. Aim at the scanned package and press E to carry it. Walk to the purple rear door of the van and press E to load it.
4. Aim at the blue driver's door on the left side and press E to enter. Space releases/toggles the parking brake. B toggles the belt. W accelerates, S brakes, A/D steers. R selects Drive/Reverse at a standstill. Mouse look in the cab is limited to the sides; steering recentres when released.
5. Drive along the road to the orange bay beside the house. Park facing along the road, centred in the bay, stop and set the parking brake with Space. Press E to exit; the prototype checks for a clear side.
6. Walk to the rear door, press E to retrieve the package, then approach the house's front door and press E to deliver. N restarts the prototype.

The task is a demonstration of connected first-person systems. It has no career scoring or persistence, traffic, customer conversation, mirror rendering, detailed cargo interior or completed inspection/handling assessment. Belt state is displayed but is not graded. The simple vehicle controller is prototype tuning, not a replacement of the current game-wide vehicle model. Future modules need their own objectives and assessments using these shared systems.

### Validation and review boundary

- `node test/firstperson.js`: exit 0, **18/18 checks passed**. Checks cover pause, walking speed and wall sliding, rotated vehicle collision, frame-rate consistency, centring, braking, gear selection, safe exits, inspection, task order, delivery parking and actual three.js CPU raycasting for wall occlusion/range/hidden objects. No pixels or graphical assets are rendered by this test. The bundled three.js prints its existing classic-build deprecation notice; it is not a failed test and ES modules are not introduced.
- `node --check` passes for both new core scripts, FirstPersonScene, LabScene and the new test.
- All 92 script paths in `index.html` exist. Launcher JavaScript syntax and prototype script ordering pass static checks.
- `git diff --check` passes. All protected files match the branch's main base exactly.
- **Browser graphics QA, the full regression suite, Hindi layout checks and performance benchmarks have not run for this prototype.** Per the user's requirement to review graphics before testing them, this is a branch build for manual review. Approval is needed before browser graphics checks. Source/CPU checks do not establish WebGL rendering, HUD fit, file-launch compatibility, frame rate or restart/context behaviour.

### New displayed strings for translation

All new text is rendered through `OTR.txt`; translation files and the font line are untouched. The lab also reuses its existing `LAB: {which}` development label. Exact new source strings follow (the inspection instruction contains a newline). Numerical cab status is composed from the template and components at the end.

```text
FIRST-PERSON PROTOTYPE
The first-person prototype could not start
WebGL is required. Reload to try again.
Loading…
Click to start
Walk around the depot, scan and load the package, then deliver it to the house.
Click for mouse look · Esc pauses · Drag to look if mouse capture is unavailable
214 Maple Ave
Check the label before loading.
E scan · A/D rotate · F return
Delivery complete — press N to restart
Inspect and scan the package on the table
Pick up the scanned package
Take the package to the front door
Load the package through the rear of the van
Exit and retrieve the package from the rear
Drive to the orange delivery bay and park
Stop and set the parking brake before exiting
Rotate the package so the label faces you
Stop before changing gear
W accelerate · S brake · A/D steer · Space parking brake · R gear · B belt · E exit
A/D rotate · E scan · F return
WASD or arrows walk · E interact · F inspect carried package · N restart
Carrying package
Release the parking brake with Space before moving
Follow the road to the orange bay beside the house
Package scanned — F to return
Turn the label towards you, then press E to scan
E pick up package · F inspect
E inspect package
Load the package before entering the cab
E enter van
E load package
E retrieve package
E deliver package
Delivery destination
{mph} mph  ·  {gear}  ·  {parkingBrake}  ·  {belt}
D
R
Parking brake on
Parking brake off
Belt on
Belt off
```
