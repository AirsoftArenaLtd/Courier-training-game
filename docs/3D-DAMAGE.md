# Damage and load (C-34, in progress)

`codex/c34-damage-load` starts independently from pilot `370fd59`, after merged C-28.
The 20 October fetch still finds that pilot and no new Codex inbox item. The branch
now loads three new owned modules and enables damage-marked campaigns from day four.
**C-34 stays doing until its full resource and final browser checks pass.** Claude
opens/reviews/merges the PR; no protected branch is pushed or merged here.

## What changes

Seven zones (front, rear, left, right, roof, wheel, mirror) have separate arrays for
deterministic starting wear and player-caused damage. Starting wear never generates
a player penalty. First-three-day and unmarked checkpoints keep their old behavior;
trainer damage-off disables all new damage, clearance and load-shift reports.

Static impacts use the contacting corner's speed along the surface normal, including
rotational side contact. Ordinary traffic uses incoming speed. Touches below 0.35 m/s
cause no damage; 0.35–2.5 gives a scuff, 2.5–6 a dent, and 6 or more major damage.
A contact episode has a serial and a seven-zone mask. Holding into a wall or restoring
mid-contact cannot generate another event; separating and hitting again gets a new
key such as `front:solid-2`. On explicitly marked days, located damage replaces the
generic contact grade for that impact. Old unmarked days keep their generic reports.
Damage-off keeps old ordinary contact behavior and adds no clearance penalty through
that generic path.

Two bounded clearance structures (bridge and overhang) stand away from delivery curbs,
roadworks and parked obstructions. Their posts are ordinary walking/driving solids;
the overhead beam stops a tall van while pedestrians and smaller traffic can pass
under it. The street graph excludes both low edges and retains a safe alternate route
to every delivery curb. Opposite-facing whole-sentence signs, a pre-departure height
reminder, dash navigation and the existing caption/narration route explain the hazard.
A stopped approach or observed approach followed by a safe detour reports success;
a strike reports failure plus located roof damage, once each. Moving off after a
safe stop is a new decision: a later strike uses the bounded `clearance-N-strike`
key, so it cannot be swallowed by deduplication of the successful `clearance-N` key.
A failed approach cannot later earn a success, and repeated strike frames do not grade again. Approach/report bits
survive a checkpoint. Damage-off still leaves visible structures and navigation
around them, but causes no damage or clearance reports.

Actual hard cornering/braking shifts cargo once per leg. Unsecured cargo shifts more
and at a lower threshold. Its bounded display offset changes neither parcel identity
nor shelf ownership. Impacts do not also count as hard-braking load shifts. The model
has eight leg bits, two clearance slots and small integer offsets, with no growing
impact array. The current stress damage state is 216 characters.

## Rendering and accessibility

One texture-free Lambert palette batch holds seven located scuff/dent patches and
both structures: at most 15 instances, three triangles each. Dent facets bend inward;
severity also changes geometry, rather than relying on colour alone. The same bounded
batch works with loaded local van assets and their procedural fallback. Main cab views
hide exterior patches; live mirror passes show them and restore all main matrices,
colours, shape attributes and visibility afterward. Cargo display offsets follow the
van's rotation. Material/geometry disposal follows the world lifecycle.

Screenshot review caught two attachment errors in the initial complete resource run:
the wheel patch used the procedural wheel position with an imported van, and rear
wear stayed in the doorway when cargo opened. Both are corrected at `b1acfc5`.
The tire patch uses the actual imported wheel bounds and its unsprung transform;
rear wear follows the imported door hinge. The fallback hides rear wear with its
removed door. Five real-asset/fallback regressions pass. No instances, vertices,
materials, textures or passes are added by the correction.

The three new index tags are `fpdamage.js`, `fpdamageflow.js`, `fpdamageworld.js`.
Only new day-four-and-later plans gain `damage: 1`; old plans and first days do not.
Trainer rules are cached through the existing launch/resume/Settings return path,
never queried per frame. Whole English notices use the existing HUD and narration;
the height reminder uses the existing keyboard panel and larger-text route. Warning
captions keep their font size, stay in the viewport and reserve their actual bounds
against other labels and road-sign readings. New English awaits Claude's translations.
The exact projected-label script-font correction already on C-32/C-33 is carried
here; affected Tamil captures pass at both sizes on Low and High, with the selected
script font asserted. New English still falls back to English until Claude translates it.

## Scoring, checkpoints and C-35

Only approved `van.damage-scuff`, `van.damage-dent`, `van.damage-major`,
`drive.clearance` and `load.shift` are reported, through
`OTR.workday.report(type, { key, stop, ok, where })`. Stops are one-based and places
come from the actual van. No client points or shared scoring/save/Settings/i18n edits.

Owned checkpoints validate the version, bounded fields, baseline seed/day, masks and
arrays; restore emits no reports. Cached geometry/scratch state is rebuilt separately.
C-35 can read `baseline` for pre-trip obligations and `added` for new post-trip zones;
the visible level is their maximum. It must respect `damage.enabled` and report only
through the already-approved inspection/report contract. C-34 does not implement the
C-35 report menus or grade a missing report prematurely.

## Evidence, 20 October 2026

The final integrated regression run passes **256 cases**, followed by five separate
real-asset placement regressions. The earlier 95-case pass also covers navigation,
road signs and the compact display. All 11 route tests pass with each loaded/fallback
geometry sweep: **285,600 complete-frame views each**, including full cargo, every
cab control, all mirrors/reverse, weather, lighting, all seven damaged zones and both
clearance approaches. Loaded peaks: **64 calls / 2,474 triangles**; fallback: **58 /
2,105**. These are CPU geometry checks, not a WebGL memory or native FPS claim.

Thirty interrupted five-stop model journeys reproduce uninterrupted state/reports at
all 3,817 checkpoints, and 100 further shuffled seeded days finish. All 240 SCORM
round trips preserve score/criticals, peaking at 3,974/4,000 characters. Travel and the
impact wall/speed are explicit fixtures; the motor, reports and checkpoint readers are
real. A separate 50-event damage stress case uses 2,103 characters, preserves event
identities, raw awarded total (-98) and 13 criticals. Both SCORM package formats pass
all three packaging checks. Existing-catalogue i18n, syntax and whitespace pass.

The Low and High browser matrices each pass 80 keyboard/layout/narration checks
across English and Tamil at normal/larger sizes. After carrying the already-authored
C-32/C-33 script-font fix, affected Tamil reruns each pass 40 more checks. A separate
real keyboard stop-then-strike workflow passes 26 checks: D and parking-brake controls,
actual acceleration into the beam, roof damage and the later failed clearance report,
then valid restore. Its 24.12-second capture shows the drive without a model-time jump.
Eight further browser checks confirm the reverse-facing clearance warning is visible
and narrated, the reverse camera stays live, a safe halt adds no damage and restore
remains valid. The approach position is an explicit fixture; scene ticks and UI are real.
The initial **105-view, four-profile** resource gate passes at `e818dcd`, before the
attachment correction. Both corrected geometry sweeps pass at `b1acfc5`; the corrected full WebGL gate is
running. The initial resource run is intermediate evidence only. Low stays at 64 calls, 2,500 triangles, two textures and unchanged 4 MiB memory
ceilings. Native Intel 60 fps remains the existing O-1 owner check; cloud SwiftShader
only checks resources. The relevant inherited workday golden paths and review readiness follow the resource gate.

[Physical-stage logs, source/evidence hashes and remaining checks](review/set-9/c34-physical/manifest.json).
Earlier controller/adapter evidence remains under [c34-progress](review/set-9/c34-progress/manifest.json)
and [c34-adapter](review/set-9/c34-adapter/manifest.json), with its own source revisions.
`Invalid damage parameters` and `Invalid damage version` are internal errors, not UI.

[Final browser reports, captures and hashes](review/set-9/c34-final/manifest.json).
[Corrected Tamil larger-text warning/gauge](review/set-9/c34-final/c34-low-font-ta-large-clearance.png),
[High Tamil warning/gauge](review/set-9/c34-final/c34-high-font-ta-large-clearance.png),
[keyboard strike capture](review/set-9/c34-final/c34-clearance-strike-review.webm).
The clip is a lossless stream remux of the test capture, adding duration/seek metadata.

## Current-pilot integration (20 October)

The branch now retains pilot `986e3fa`, including merged C-32 traffic, its translations
and Claude’s B-55 save compaction. This content was applied on the work branch; no
protected branch or pull request was merged. All shared scoring/save/i18n content
is byte-identical to that pilot. The final combined gate contains 127 views: the
91 traffic/navigation views plus nine damage views in every profile. The interrupted
pre-integration 109-view attempt is incomplete and is not acceptance evidence.

Both combined 285,600-view geometry sweeps pass: loaded **64 calls / 2,449 triangles**,
missing-model fallback **59 / 2,121**. Thirty-five isolated Node suites pass **488 cases**,
including actual-model attachment, damage, signals, mission/world, HUD and saves.
The isolated processes matter for real glTF tests, whose loader globals belong to
their own VM realm. An exploratory shared-process run is diagnostic, superseded
by these isolated passes. Both packages and the current translation catalogue pass.
The first combined 130-day restore/soak passes 3,277 checkpoints and all 240 SCORM
checks at 3,800/4,000 characters; the expanded cab/reverse/lighting variant is running.

The live caption now includes C-32’s cyclist/school warning after the higher-priority
driving warning, without requiring the handheld. The sound regression waits for
ducking, restarted nodes and caption availability (45 checks pass). The cargo
workflow waits for actual launch/return transitions and chooses the displayed
practice choice. The two physical-sign placement findings are acknowledged for
C-33, which is unblocked by the approved one-parcel locker policy.
