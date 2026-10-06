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

Suggested new files: `src/core/firstperson.js` for movement and interaction, `src/core/world3d.js` for the rendering lifecycle, and `src/scenes/FirstPersonScene.js` for the prototype. Add classic script registrations in `index.html` and an opt-in launch through `src/scenes/LabScene.js`. These are planned files; the initial planning commit does not implement them.

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
