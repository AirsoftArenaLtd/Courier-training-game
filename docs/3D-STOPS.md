# Richer delivery stops (C-33, in progress)

Branch `codex/c33-richer-stops` starts from pilot `370fd59`, after merged C-28.
The action controller (`fpstops.js`), campaign adapter (`fpstopflow.js`) and physical
controls/menus (`fpstopscene.js`) now load through `index.html`. New campaigns enable
the `deliveries: 1` route marker from day three; the first two days and unmarked saves
retain their previous flow. The branch is **blocked**, with the live locker-assignment
policy and final browser validation outstanding. It is not ready for merge.

**Locker policy question, sent to Claude on 19 October:** C-18's `fpLater.prepare`
makes every later-day parcel signature/adult service and changes the dispatch update
to signature. None qualifies for a standard unattended locker. C-33 preserves those
requirements. Lockers currently appear in explicitly labelled standard-service test
routes, not in the normal all-signature schedule. Claude must choose whether to
authorise a suitable standard parcel or use a separate practice scenario before this
task is ready. No new event type or signature downgrade has been introduced.

## Requirements and model behaviour

- Intercom access needs the intended label's unit or recipient button, identifying the
  purpose as a delivery, and two simulated seconds for the buzz. There is no reaction
  deadline. Contact and delivery cannot bypass the locked entry. An unanswered entry
  permits a retained exception after eight seconds, without fabricating a buzz or an
  intercom grade. Gated sites have a collision barrier, front fence and side rails joined
  to the facade; opening the gate keeps its fixed rails solid.
- Business reception uses the actual generated person. It accepts that named recipient,
  or the named receptionist with a matching signature. Signature services still require
  the recipient's signature. Changing recipients clears the first signature. Adult ID,
  original signature, wrong-address, dog and dispatch requirements remain in `fpDoors`
  and the mission; the new protocols cannot replace those checks.
- A locker needs the assigned compartment, matching parcel scan, deposit confirmation,
  closure and a closed-door photo confirmation. Reopening invalidates the photo. The old
  porch-box delivery API cannot bypass these steps. The physical locker has a hinged
  door, barcode occlusion and a deposited parcel; the carried copy disappears. Reopening
  permits retrieval before an exception or cargo return. The photo action confirms the
  closed door without saving an image.
- Reattempt booking needs a card, the actual retention reason, and the specified future
  day and slot. The slot is planning information, not a timed or graded deadline. A
  retained exception remains possible when steps are missing, with a failed reattempt
  check; the parcel still has to return to the depot.

Incorrect deliberate actions stay recorded after recovery. The pure controller never
reports or scores. At the actual mission outcome, the adapter reports only the existing
`stop.intercom`, `stop.reception`, `stop.locker` and `stop.reattempt` contract checks with
`{ key, stop, ok, where }`. It deduplicates against owned mission events. `deliver.outcome`
continues to grade the original outcome requirements, so a failed recovered intercom
choice is not also charged as a failed delivery.

The explicit 3D route-plan marker is `deliveries: 1`, for new days three and later. Protocols
follow the actual generated lot and parcel. Locker assignment excludes adult, signature,
dog, wrong-address and dispatch-selected stops. Gated sites exclude adult, dog,
wrong-address and dispatch-selected stops and retain existing signature requirements.
The first two days and unmarked older checkpoints keep their previous progression.
Malformed or missing marked state is rejected; restore rebuilds collision barriers once
and emits no reports. No photographs, animation frames or per-day booking history enter
shared saves.

## Physical controls and access

Intercom panels, gates/fences, the reception desk and locker use existing palette
instance batches. Exact non-rendering proxies handle raycasts and occlusion. The locker
hinge updates its collider and conservative culling sphere together; mirrors restore
the main-view instance buffers exactly. There is no new asset file, texture, render
target or pass. Low trades decorative town triangles for these props; its allowance
is 120 triangles on marked days, versus the previous navigation allowance of 260.
All existing graphics ceilings remain.

The action key opens physical controls; remapped keyboard target selection reaches
the same actions. Menus keep at most four choices, use full-size accessible text and
narration, and preserve the original handheld barcode, signature, ID and customer
checks. Intercom waiting uses simulation time on the street, with a sound and caption;
there is no reaction deadline. New projected delivery sentences wrap at their readable
font size. The existing C-28 residents greet and animate after actual contact; reduced
motion keeps the established pose policy.

Reception and locker furniture replace the original porch box, preventing intersecting
props. Gated-site assignment skips C-31's blocked driveway, preserving its walking
approach; a regression covers 48 generated navigation layouts.

The small shared `index.html` edit adds three script tags. The branch also carries the
unchanged five-line script-font fallback from the pushed C-32 branch for projected
Tamil/Indic labels. No shared scoring, save, Settings or i18n implementation is edited.

## Model evidence, 19 October 2026

The current model stage passes **155 Node cases** across `fpstops` (18), `fpstopflow` (14),
`fpmission`, `fpworld`, `fpdoors`, `fproute`, `workday` and `savesize`. The separate existing
catalogue i18n check, all seven changed JavaScript syntax checks and the diff whitespace
check pass. Forty generated layouts match their actual building types and restore.
Thirty additional five-stop model journeys finish **150 stops and 759 checkpoints**;
retained parcels are placed back in cargo, retrieved, scanned at Returns and checked in
at Dispatch. Travel positions are fixtures; actions, reports and checkpoint readers are
real. Their SCORM score round trips peak at **1,876 / 4,000 characters**. The new owned
five-stop state peaks at **1,061 characters**, separate from the shared LMS save.

[Current Node output](review/set-9/c33-progress/c33-campaign-node.log),
[journeys and exact cases](review/set-9/c33-progress/c33-campaign-journeys.json),
[i18n output](review/set-9/c33-progress/c33-campaign-i18n.log),
[syntax checks](review/set-9/c33-progress/c33-campaign-syntax.json), and
[source/evidence hashes](review/set-9/c33-progress/campaign-manifest.json).
The earlier 129-case pure-protocol evidence is retained in the same folder; its
`manifest.json` identifies the earlier `df7b11e` source revision.

These retained model-stage reports identify their own earlier source revisions; they
do not stand in for the scene-stage checks. The scene regression suite has subsequently
passed **201 cases**. Another **194 cases in 15 inherited suites** pass in separate Node
processes. These include live-schedule signature/ID preservation, physical raycasts,
locker custody/occlusion, gate timing, hinge bounds and mirror-buffer restoration.
The separate existing-catalogue i18n check and all 20 changed-JS syntax checks pass.
Both SCORM packaging formats pass their three checks at the earlier scene revision.

All **24 Low browser workflows / 596 checks** pass in English/Tamil at normal/larger
text, including the native adult-ID/signature path. After furniture/access polish,
the eight affected reception/locker workflows pass another **200 checks**. Real remapped
keys, barcode holding, signatures, narration and readable text are checked. These are
explicit standard-service fixtures; the separate native case retains Later's signature
schedule. [Reports, screenshots and exact revision scopes](review/set-9/c33.md).

The final loaded and fallback CPU sweeps each pass **264,000 views**, peaking at
**59 calls / 2,398 triangles** and **56 / 2,120**. They cover native Later plans, Low
camera/cab/mirrors/rear, weather, signs/navigation, actors, extra cargo and every stop.
The seven focused rendered views in each of four profiles also pass at the earlier
pre-polish revision; these 28 views do not replace the complete 101-view gate.

## Next work before review

Resolve the live locker policy through Claude. Remaining validation is running again
without recording, with call-state diagnostics and a 180-second wall-time allowance
for the simulated intercom wait. The first five English-normal High workflows pass;
there is no complete High or 101-view acceptance claim yet.

The first recorded High attempt exceeded its 60-second intercom wait. Two diagnostic
rerun attempts, the push and fetch were then blocked by automatic review-model capacity.
After the environment restart at 06:18 UTC, normal approval review recovered: fetch
confirmed pilot `370fd59` and progress published successfully. The earlier local-only
notes describe those failed attempts; approval capacity is no longer the blocker.

Complete the running High workflows, deliberate-error/recovery
paths, complete four-profile resource gate, inherited doorstep/access/guide suites and
the two unchanged Low golden paths. Add the control clip and merged C-32 validation.
Exact commands and outstanding scope are in the review sheet. Native Intel acceptance
remains the existing O-1 owner check; cloud SwiftShader is resource evidence only.
New English text still needs Claude's extraction, translation and translated-layout pass.

Internal errors `Invalid richer-stop specification` and `Invalid delivery-stop version`
are not player-facing.

## Complete resource gate, 20 October 2026

The full 101-view gate passes in all four profiles: loaded Low 53 calls / 2,386
triangles; High 98 / 220,081; accessible Low 53 / 2,386; missing-model fallback Low
52 / 2,108. All unchanged texture and memory ceilings pass, with live mirror pixels
and no browser errors/context losses. [Reports, 101 screenshots and hashes](review/set-9/c33-complete/manifest.json).
Full High gameplay, recovery and inherited browser/golden checks remain in progress;
the live locker policy is still awaiting Claude. The task stays blocked.
