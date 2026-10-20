# Richer delivery stops (C-33, in progress)

`codex/c33-richer-stops` is rebased onto pilot `743fe0e` (20 October), retaining merged
traffic, damage, scoring/save code, current translations and shared QA. C-33 is **doing**;
its final combined resource/gameplay review and sign-label/sight-line follow-ups remain.

## Approved live locker policy

New campaigns prepare the optional `lockerStop` index before `fpLater.prepare`, starting
on day three. Exactly one eligible parcel is nominated: originally standard service,
no dog, and outside the existing dispatch target. Apartment, business and leave-at-door
sites are eligible. The later-day adapter preserves that parcel as standard; every
other signature, ID and dispatch obligation retains its previous value and position.
Days without an eligible parcel have no nomination. Old prepared plans, saved days and
the first two days retain their flow.

The actual morning brief names the locker site and the manifest names its compartment
workflow. Only the nominated parcel changes to the locker outcome. Signed or adult
parcels are never authorised. Malformed markers are rejected, and a locker checkpoint
cannot silently lose its authorisation. The policy is Claude's 20 October decision in
[the report contract](WORKDAY-EVENTS.md). No new event type is introduced.

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
`{ key, stop, ok }`, adding `where` only for failures pinned by the drive map.
It deduplicates against owned mission events. `deliver.outcome`
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
is 120 triangles on marked days without damage and 60 when damage is also present.
This reclaims space for physical training objects while retaining High detail.
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

The small shared `index.html` edit adds three script tags. The owned scene also selects the existing script-font family before measuring
briefings, cab captions and handheld text; company fonts remain the fallback. English,
Spanish and French keep their previous family. Projected labels retain C-32 font selection. No shared scoring, save, Settings or i18n implementation is edited.

## Current validation and limits

The [current evidence](review/set-9/c33.md) separates pre-damage policy validation from
the combined pilot. Native Low and High locker matrices each pass 144 checks before the
pilot rebase. Nineteen targeted suites pass 299 Node cases plus current-catalogue i18n;
the six live-locker cases now also restore merged damage state. A font regression covers
all nine Indic language mappings and unchanged English/Spanish/French styles. Fresh Low
Tamil normal/larger locker runs pass 72 checks and show correct glyphs.

The first combined loaded sweep exposed 2,510 triangles at day 21 / variant 10, open
cargo exterior. The reduced decoration allowance passes the focused 960-view regression
at 56 calls / 2,433 triangles. The full loaded sweep then passes 285,600 views at 60 calls / 2,443 triangles.
Fallback also passes 285,600 views at 59 calls / 2,181 triangles.
The updated 155-view rendered gate remains required; no ceiling is raised. Cloud FPS cannot certify the
native Intel 60 fps floor (existing O-1).

Claude has been asked in the board inbox to extend the shared workday helper for the
physical intercom, locker, reception and reattempt steps. C-33 also implements the
requested Escape-to-parent behavior in the reversing-space and Settings submenus;
all 41 English/Tamil keyboard browser checks pass. No shared scoring, save,
Settings, i18n or QA-path implementation is edited.

[Earlier model, gameplay, recovery and 101-view evidence](review/set-9/c33-history.md)
is historical and identifies its own source revisions; it does not certify this combined
pilot. The permanent hourly check-in remains enabled without an end date.
