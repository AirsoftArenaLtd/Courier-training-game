# C-51 visual evidence

This sheet shows the people and yard detail on `codex/c51-visible-people`, stacked on C-50. It describes branch evidence, not a newly published owner preview. C-51 remains in progress while the complete 224-view resource gate runs.

The native captures use C-51 runtime `32623203` with the current-pilot B-164/C-49/C-50 stack. The later corrections change test fixtures only: the High town test now counts the new bench group, and the resource fixture now performs real departure setup and preserves generated weather. The manifests retain the separate candidate and fixture versions.

| View | What to inspect | Native capture |
| --- | --- | --- |
| High, on foot | The supplied adult has the archive's palette and an idle/walk pose, placed clear of the house and public path. | [Front yard](c51-native-progress/c51-final-people-high-yard.png) |
| High, in the cab | A person is visible outside the cab during a normal route view. The fixture positions the van beside the selected yard; it does not prove that every route presents a person at this angle. | [Cab view](c51-native-progress/c51-final-people-high-ordinary-cab.png) |
| High, at night | The same yard/cab placement under the existing night lighting, with headlights on. | [Night cab](c51-native-progress/c51-final-people-high-night-cab.png) |
| Low | The inexpensive silhouette keeps the laptop budget and requests neither new model pack. | [Low yard](c51-native-progress/c51-final-people-low-yard.png) |
| Missing High adults | Failed character downloads retain a procedural person. | [Fallback yard](c51-native-progress/c51-final-people-missing-high-yard.png) |
| Tamil, larger text, colour-blind mode and reduced motion | Existing accessible status text and a stationary ambient person remain visible. | [Accessible cab](c51-native-progress/c51-final-people-accessible-low-ordinary-cab.png) |
| High bench | The supplied bench is grounded in a private yard, clear of the house and approach, with its source wood material. | [Bench](c51-native-progress/c27-high-town-bench.png) |

The native people test passes 30 checks with no page or WebGL errors. Hiding only the people changes 29,403 High yard pixels, 13,592 Low pixels, 39,639 missing-model High pixels and 17,194 accessible Low pixels, without changing mission snapshots or reports. These counts are visibility probes for the fixed yard captures; the cab and night images are separate visual evidence. The corrected High town test passes 65 checks, including 1,470 changed bench pixels. Original residents, courier, safety encounters and asset recovery have separate passing checks.

The placement audit covers 60 generated routes. People are within the selection range of all 180 Low driving legs and 178 of 180 High legs, with at least one covered leg per route. That is potential range, not unobstructed pixel proof for every route. Bodies and short walking paths fit inside existing unused-lot solids, clear of source and procedural bounds; depot and delivery lots are excluded. Low may suppress optional people when collision-bearing cars consume the remaining decoration budget.

The complete Low profile has passed all 72 rendered resource views at 53 draw calls, 2,402 triangles, two Three textures, 3,557,376 attachment bytes and 2,623,766 Phaser estimated bytes. The 17 added resource views pass across all four profiles. High and the remaining complete profiles are still running at the time this sheet was written. Ceilings have not changed. Cloud SwiftShader frame rates cannot certify the owner's Intel 60 fps; O-1 remains.

Evidence and exact source scope:

- [Native people, asset and bench manifest](c51-native-progress/manifest.json).
- [Loaded and missing-model geometry sweeps](c51-geometry-progress/manifest.json).
- [The 17 added resource views and raw reports](c51-focused-progress/manifest.json).
- [Supplied-pack usage audit](../../3D-ASSET-USAGE.md).

One visible follow-up remains outside C-51: some address plates are unsupported ahead of the building. The Claude inbox records the exact inherited placement and asks for a facade mount or supported private-yard sign. C-50 attaches their lettering to faces; C-51 does not claim to fix their mounting. C-52 owns the remaining cab and handheld appearance.
