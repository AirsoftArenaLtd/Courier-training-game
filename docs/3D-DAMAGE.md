# Damage and load (C-34)

Ready on `codex/c34-damage-load`, rebased onto pilot `3fdfc22`, including merged
C-32, Claude's translations and B-68 packing unchanged. Claude opens, reviews,
translates and merges the PR. Codex has not pushed a protected branch or merged a PR.

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

## Acceptance evidence

The pilot/C-32 and damage combination passes **285,600 complete-frame views per
CPU sweep**: loaded **64 calls / 2,449 triangles**, missing-model fallback **59 /
2,121**. Sweeps include full cargo, seven damaged zones, active traffic, cab
controls, mirrors/reverse, weather and lighting across 30 days and ten variants.
The worst loaded geometry is day 21, variant 10, stop 1, loaded cargo exterior,
right reflection. Damage/clearances share one bounded texture-free batch, at most
15 instances / 45 triangles per pass. Tire wear uses the actual imported wheel;
rear wear follows the cargo door. No texture, target, pass or ceiling is added.

All **127 rendered resource views** pass the strict four-profile gate:

| Profile | Views | Calls | Triangles | Three textures | Attachment bytes | Phaser bytes, mipmap estimate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| loaded-low | 48 | 56 | 2,412 | 2 | 3,557,376 | 3,379,819 |
| loaded-high | 33 | 107 | 235,653 | 3 | 11,239,424 | 8,571,952 |
| accessible-low | 23 | 56 | 2,412 | 2 | 3,557,376 | 3,442,016 |
| fallback-low | 23 | 53 | 2,090 | 2 | 3,557,376 | 3,104,582 |

Rendering/assets/HUD are frozen at `fee4d72`. The final pure adapter correction
at `2faa074` uses perpendicular-traffic bounds and omits unused successful-check
coordinates. Its actual-motor regression, affected 150-case batch and final
61-case adapter/workday/save batch pass. No rendering input, checkpoint field or
score type changes. The source is then rebased onto pilot `3fdfc22` at `b23d903`:
owned 3D code is byte-identical to `2faa074`; the additional changes are Claude's
B-68 packer, translations, corporate reports/trainer tools and review tools.
Source hashes, both delta patches and exact validation scopes are archived.

The final **58-suite repository set passes: 53 directly, five over local HTTP**
through the archived environment transport adapter. Chromium policy blocks those
legacy suites' file URLs; actual file-protocol launch is untested here. Assertions
and shared tests are unchanged. The full five-flow Low workday review set passes
on `b23d903`: workday-3d, workday-3d-b, workday-3d-c, workday-aids and drive-review.
Both SCORM package formats and current-catalogue i18n pass on this integration.

Earlier focused verification passes 35 isolated Node suites / 490 cases, Low/High
English/Tamil normal/larger damage matrices / 80 checks each, delayed reverse
warnings / 14 each, cargo practice / 68 and sound / 45. The expanded 130-day
cab/reverse/lighting resume/soak passes again on `b23d903`: **3,817 checkpoints,
240 SCORM round trips, 3,974/4,000 characters, no failures**. B-68's separate
worst-day damage/report fixture retains at least 300 characters of room.

Screenshots, raw reports, source/evidence hashes and the five-minute checklist:
[C-34 review](review/set-9/c34.md). New text is 14 player-facing sentences plus
two internal validation messages for Claude; the shared catalogue is unchanged.
Earlier progress archives retain their sources. Cloud SwiftShader FPS cannot
establish the native Intel 60 fps floor; the existing O-1 owner check remains.

Reproduce the sweeps with `QA_DAMAGE=1 QA_TRAFFIC=1 QA_NAV=1 QA_SIGNS=1 QA_LATER=1
QA_CAMERA=1 QA_CAB=1 QA_MIRRORS=1 QA_REAR=1 QA_LIGHTING=1 QA_WEATHER=1 QA_CARGO=1
QA_ASSETS=1 QA_TAG=c34-pilot-loaded node --test --test-isolation=none test/fproute.js`;
repeat with `QA_ASSETS=0 QA_TAG=c34-pilot-fallback`. The rendered gate is
`QA_BASE=http://127.0.0.1:8341 QA_TAG=c34-pilot node test/fpquality.js`.

Correct clearance checks retain short keys without an unused map place; strikes
retain the actual position and incoming speed. The final 50-report actual-adapter stress
case preserves every identity, raw award (-98) and 13 criticals in 1,980 SCORM
characters; its fixed-size owned damage state occupies 216 characters.

[Final manifest, reports and source/evidence hashes](review/set-9/c34-release/manifest.json).
The earlier [controller](review/set-9/c34-progress/manifest.json),
[adapter](review/set-9/c34-adapter/manifest.json),
[physical](review/set-9/c34-physical/manifest.json) and
[keyboard/layout](review/set-9/c34-final/manifest.json) archives retain their own
revision scopes. The 24.12-second keyboard stop/strike clip is from `e818dcd`;
it uses actual gear, brake and accelerator keys against the physical beam.
No final-source video is claimed. The interrupted 109-view pre-integration run
is incomplete and is not counted as a pass.

C-35 adds pre/post-trip report menus; C-34 does not grade missing reports early.
C-33 resumes with the approved original-standard-parcel locker rule. The traffic
warning now reaches the cab; traffic-label wrapping/placement, sign sight lines
and checking the inherited Tamil rear-caption font are recorded as C-33 follow-ups.
New whole English sentences await Claude's translation. `Invalid damage parameters`
and `Invalid damage version` are internal errors. No shared scoring/save/Settings/
i18n source was authored here; retained shared source is identical to `3fdfc22`.
