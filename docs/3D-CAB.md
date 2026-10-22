# Physical cab controls (C-22)

**B-164 navigation clearance (22 October 2026, final checks pending):** the mounted sat nav is lower on the passenger side of the dash, clear of the PRND positions at C-48’s intended 76-degree cab FOV. The navigation face, reading anchor, live reverse-camera screen and keyboard target share that mount. First-day guidance wraps at its existing text size in the space beside the visible navigation or reverse screen, including side glances. Control IDs, dynamics, reports and saved fields are preserved. The browser matrix now requires visible displays and clear signs, selector labels/targets, mirrors and first-day guidance; it cannot pass by hiding the screen. The weather test expects the intended 76-degree stationary cab framing. Final source-scoped verification is pending; superseded diagnostics are retained separately.

Look at a cab control and press the action key. The same raycast, distance and visibility rules apply as for parcels
and doors. The existing target-selection key turns the view to each control in order and announces its whole-sentence
instruction. Arrow-key and mouse look remain available. The cab door handle exits only after stopping and setting
the parking brake; pressing the action key while looking through the windscreen retains the existing exit shortcut.

The procedural cab has an open windscreen, pillars, door trim, a passenger backrest, a dashboard, steering wheel,
working speed/RPM dials and a physical PRND selector. It is the local fallback while the owner's O-3 full packs and
the C-28 exterior/character pass are pending. No unlicensed asset or runtime download is introduced.

| Physical control | Existing or new keyboard route | Behaviour |
| --- | --- | --- |
| P, R, N, D selector positions | Target selection then action; R retains its Drive/Reverse toggle | P holds the drivetrain; N coasts without engine force or creep; D/R use C-20's existing motor. |
| Parking brake lever | Space | Sets/releases the brake in either direction. |
| Seatbelt buckle | B | Fastens/releases the belt; existing belt scoring is unchanged. |
| Indicator stalk, lower/upper positions | Q/C | Selects left/right; selecting the same direction cancels it. |
| Headlight switch | L | Saves the switch state; real light cones and night rules are C-25/C-36. |
| Wiper stalk | K | Saves the switch state; windscreen/weather animation is C-26. |
| Cab door handle | Action key while aimed at it | Uses the existing parked-exit check. |

All keys use the saved shared key map. The owned controls list offers remapping for L/K as well. Target instructions
and gauges are Phaser text, go through translation and narration, wrap at larger sizes, and remain readable with the
colour filter. Lever position, dial angle and written state supplement colour. Reduced motion removes C-21's cosmetic
movement, while functional switch positions, wheel rotation and instrument readings remain live.

## Motor, reports and checkpoints

The existing numeric `van.gear` now accepts 2 (P), -1 (R), 0 (N), 1 (D); old +/-1 checkpoints still load unchanged.
Both keyboard and physical selection call the same stopped-only interlock (below 0.15 m/s). Re-selecting the same
gear is a no-op. An opposite-direction request above 2 mph reports `drive.gear` with `ok: false`, while leaving the
motor in its current gear; successful actual changes report `ok: true`. Rejected Park/Neutral/slow requests emit no
check. Reports apply only to the campaign; cargo practice keeps its suspended campaign untouched. Every report includes a persistent unique shift key, a 1-based stop and the actual location/speed.

The owned mission snapshot already copies `van`: optional `headlights`, `wipers` and `shifts` properties therefore
round-trip without changing the shared save implementation or mission version. Booleans and the nonnegative safe
integer shift counter are validated on restore. The counter preserves report-key identity across resume. The
extended `QA_CAB=1` resume soak checkpoints all six new saved-control actions, preserving final state, event places,
score and stars. Its 240 SCORM score round trips peak at 3,944 of 4,000 characters.

## Rendering and checks

The dashboard remains anchored to the van using C-21's matrix. Boxes and coloured panels are instanced; the two
gauges share one shader quad without image maps. Low uses a 16-sided ring rim and flat trim/seat surfaces; High uses
the existing tube rim and solid trim with additional seat/console pieces. Picking uses non-rendering layer-one
proxies. Geometry and private materials are released through the existing world lifecycle. The cab adds no texture,
render target or pass, and the controls do not allocate frame-by-frame arrays.

`test/fpcab.js` covers all actions, P/N force and hold, Drive/Reverse parity, unsafe attempts, checkpoint validation,
unique resumed scoring keys, raycasts in both presets, keyboard reachability and live gauges. `test/fpcabbrowser.js`
uses actual target-selection/action/shortcut keys in English and Tamil at normal/larger text, then reloads a real
saved Park/headlight/wiper state. New English prompts await Claude's translation; those layouts verify the fallback.

`QA_CAB=1 QA_CAMERA=1 QA_LATER=1 node test/fproute.js` checks 45,000 views: 30 days, ten variants, five stops,
empty/loaded, four driving poses and all eleven cab targets. Repeat with `QA_ASSETS=1` for the loaded glTF path.
Both retain the original Low ceiling. Resource figures and benchmark commands are in `docs/PERF.md`; screenshots,
a short clip and raw reports are indexed in `docs/review/set-7/c22.md`. Native Intel FPS remains the owner's O-1 check.
