# Traffic and pedestrian behaviour

C-32 adds a versioned traffic plan to new campaign days. The first two days keep their
existing cars, crossing and decoration. From day three there are three signal-controlled
junctions, one give-way junction and a school crossing with two children. From day four a
cyclist can pass on the right during each leg. Old checkpoints without `traffic: 1` keep
their previous rules. The merged C-31 navigation plan and obstructions remain enabled.

## Junctions and cars

Physical signals replace the relevant stop signs, using the existing shared sign batch.
The red, amber and green lamps occupy distinct vertical positions; current full-sentence
labels, the remappable sign-reading key (J by default) and narration provide an accessible
route. No mirror or traffic-light button is added. Lamps remain visible at night.

The 54-second signal cycle separates north/south and east/west green and amber phases,
with all-red clearance and a reserved pedestrian interval. It depends only on simulation
time and a fixed junction offset. Pause and checkpoint restoration preserve the exact
phase. Frozen phase descriptors and attached scratch bodies avoid hot-loop allocations.
The school zebra is separate from the signal junctions: it uses a clear gap rather than
waiting on a distant signal's pedestrian phase.

Two bounded cars accelerate and brake gradually. Oriented body clearance, a three-second
following gap, a stopping envelope and a displacement cap keep them behind traffic,
solids, the trainee and pedestrians. Cars stop for red/amber, wait at stop signs, and check
cross traffic before proceeding. The give-way's east/west approaches yield to north/south
traffic. Road-end recycling waits until both ends are distant from the trainee; a car
cannot reappear beside the van or a walking trainee. East/west collision bodies retain
the cars' full length.

A signal approach that meets red reports only `drive.red-light`, keyed by signal id and
approach: false when entering on red, true when stopped behind the line until green.
Green-only approaches report nothing. The same junction never also reports
`drive.stop-line` or `drive.sign-stop`. Give-way reports `drive.sign-giveway` on entering
its minor approach. Existing stop-sign obligations remain unchanged elsewhere. Reports
use `OTR.workday.report(type, { key, stop, ok, where })`; the 3D controller never scores.

## Children and the cyclist

Children wait by the school crossing, begin only after a clear traffic gap, and remain
solid while waiting, crossing and standing on the far curb. Each proposed walking step
checks the van and walking trainee. Cars yield to the crossing. A motor conflict reports
one failed `drive.pedestrian`; finishing the crossing reports its successful obligation
only if that key has no prior report. The same conflict does not add a generic contact
penalty. First-day adult crossing behaviour is unchanged.

The bicycle appears behind and to the right when the van is moving slowly on a street.
Its collision body and controlled motion respect traffic, signals, people and solid
obstructions. A real look at the right mirror after its appearance and a stationary wait
are required before a right turn across its path. Straight driving produces no cyclist
grade. A cut-in/contact or a checked and clear right turn reports `drive.cyclist` once per
leg. A cyclist held at red stays visible for the whole wait; it leaves only beyond range
or at the world's boundary. Context hints use whole sentences and remain narrated.

High uses a small procedural 3D bicycle, a rider from the existing local CC0 worker model,
and two scaled instances of the existing rigged pedestrian. Their draw and animation
counts are bounded, with reduced-motion support and owned disposal. Low uses two small
procedural children and four crossed bicycle/rider profile surfaces in an existing batch.
No new asset file, image, texture, target or rendering pass is added. Missing High models
use procedural bodies. Later Low town decoration allows 180 triangles rather than 260;
new navigation obstructions keep selection priority. The first two days keep their former
allowance.

## Checkpoints and review

The owned mission checkpoint stores traffic version, cruise/stop state, observed red
approaches and cyclist position, speed, mirror check and waiting state. Validation rejects
malformed versions, timestamps, bodies outside the world and invalid school-crossing
positions. Restoring emits nothing; per-obligation keys prevent duplicate grading. C-31's
navigation fields and validators are retained alongside traffic.

`test/fptraffic.js` covers signal boundaries and conflicting permissions, physical braking,
following, red-light/give-way deduplication, actual motor and walking collisions, crossing
steps, cyclist mirror/wait/turn rules, long red waits, bounded recycling and exact restores.
`test/fpactors.js` verifies both children's animated vertices stay inside their culling
bound. `test/fptrafficbrowser.js` uses real remapped sign reading, narration, actual driving,
checkpoint restoration and English/Tamil large-text layouts at Low and High.

Final evidence, resource figures, screenshots and the owner's review checklist are in
`docs/review/set-9/c32.md`. The Low ceilings remain 64 calls, 2,500 triangles, two textures,
4 MiB attachments and 4 MiB estimated Phaser textures. Cloud SwiftShader figures establish
resource use, not native Intel 60 fps; that acceptance measurement remains O-1.
