# Which supplied graphics are in use

This audit describes `codex/c51-visible-people`, carrying the pushed C-49 materials and C-50 lettering stack. It does not describe a new deployed preview or claim that these branches are merged into pilot. C-51’s complete rendered resource gate has since passed all 224 views; the final source scope, raw figures and screenshots are in `review/set-10/c51-acceptance/manifest.json`. C-52 changes device artwork without changing this asset manifest.

All **13 owner-uploaded packs** now have a bounded use in this stack. The earlier City Starter garage is a fourteenth pack from a separate source. Native loading checks record **17 High models plus five colour images**, or **14 Low models with no colour-image request**. This means selected exports from each pack, not every model in every archive.

| Pack | Quality | Runtime uses |
| --- | --- | --- |
| kenney-car-kit | High and Low | `town-parked-car`, `van-exterior` |
| kenney-city-commercial | High and Low | `town-shop` |
| kenney-city-roads | High and Low | `town-road`, `town-streetlight` |
| kenney-city-starter | High and Low | `town-garage` |
| kenney-city-suburban | High and Low | `town-fence`, `town-house`, `town-house-wide`, `town-tree` |
| kenney-furniture | High | `town-bench` |
| kenney-mini-characters | High | `ambient-adult-a`, `ambient-adult-b` |
| polyhaven-asphalt-pit-lane | High | `surface-asphalt` |
| polyhaven-concrete-pavement | High | `surface-pavement` |
| polyhaven-grass-ground | High | `surface-grass` |
| polyhaven-plastered-wall | High | `surface-plaster` |
| polyhaven-red-brick-03 | High | `surface-brick` |
| quaternius-modular-men | High and Low | `resident-men`, `worker-men` |
| quaternius-modular-women | High and Low | `resident-women`, `worker-women` |

The previous audit in `review/set-10/asset-audit.md` records the earlier review snapshot accurately: its models were loaded, while the five material packs and the two extra scene packs had not been integrated. C-49 connects the five supplied colour images. C-51 connects Mini Characters and Furniture Kit and makes people visible on ordinary routes, while retaining the existing contacted residents, courier and safety encounters.

Two of Mini Characters’ twelve adult variants are shipped with only their idle and walk clips. The supplied palette is baked into vertex colours offline; original geometry, joints, weights and retained clip samples are preserved. At most two High people are selected nearby. Low requests neither new pack and uses a cheap silhouette only after collision-bearing cars have their original budget priority. The Furniture Kit contributes its unchanged 170-triangle bench, with at most four safely placed High instances. Extra models and clips remain unshipped.

The five 1024-square supplied colour images feed one existing High atlas. Sign lettering shares spare atlas space; no fifth High texture is added. Low keeps its existing two-texture ceiling. Original procedural models remain available when files fail. Source notes and licences accompany each pack; the original Poly Haven archives had no licence file, and C-49 records the later CC0 legal-text source honestly.

The original generated cab-plastic image in `review/set-10/materials/` remains an unloaded draft. No claim is made that it appears in the game. C-52 owns the remaining instrument/device visual pass. Current native images, source equivalence and geometry evidence are in the C-51 progress manifests; complete C-51 resource acceptance has passed, while the owner’s Intel frame-rate measurement remains separate.
