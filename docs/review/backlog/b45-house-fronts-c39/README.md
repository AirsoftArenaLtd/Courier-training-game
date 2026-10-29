# Delivery house fronts after C39

Ready for review on `codex/b45-house-fronts`, based on pilot `29f421fd` (runtime equal to `a7bd8b57`). High uses the existing locally licensed town-house geometry for suitable delivery lots, bounded to the nearest two within 95 m and selected on the existing 3 m movement boundary. Low, missing-role/fallback, training areas and unsuitable houses keep the original procedural art. Fixed doors, paths, numbers, collision proxies and mission state remain unchanged.

The model fits the existing lot footprint, borrows scene paint/geometry and preserves the original entrance bay. It adds no asset download, texture, target, pass, save field or per-frame object. Only `src/core/fptown.js` and `src/core/fpworld.js` differ from the pilot production sources. The implementation matches the prior candidate preserved on `codex/b45-before-c39-oct29`.

13 CPU suites pass. The inherited High town test was updated to require exactly the original nine model groups plus one facade pool and at most two selected facades. Both original Low/High pixel suites pass **173 checks** (90 Low / 83 High); Low geometry culling preserves every visible pixel. `attempt-1` preserves the earlier expected-count failure.

All **48 static views** pass the original resource profiles and ceilings. Every sample verifies bounded selected source geometry, detail visibility, unchanged mission state, and all original address/door targets. Delivery approaches require actual High source instances; other profiles require none.

| Profile | Views | Calls | Triangles | Three textures | Attachments | Phaser estimate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| loaded Low | 12 | 53 | 2402 | 2 | 3557376 | 2623766 |
| loaded High | 12 | 115 | 244765 | 4 | 11239424 | 9027110 |
| accessible Low | 12 | 53 | 2402 | 2 | 3557376 | 2990086 |
| fallback Low | 12 | 53 | 2168 | 2 | 3557376 | 2623766 |

[verification.json](verification.json) rehashes all 802 frozen inputs, four fonts, fourteen CPU logs and 76 artifacts, repeats the original resource and town pixel checks, proves the exact two-file production scope and verifies cleanup. The resource wrapper recorded metadata revision `a809fa6e`; its only difference from plan `b0c2263a` is the date-only board correction, independently checked. Repeat `python3 docs/review/backlog/b45-house-fronts-c39/verify.py` without a browser.

[visual-review.json](visual-review.json) records four original-size comparisons. High shows the imported brick facade around the original door; Low/fallback retain procedural walls. The inherited very close doorway pose crops the top of the number in both qualities; it is a resource/framing view, not address-reading acceptance. No full native route or all-language layout/FPS claim is made. Intel O1 remains separate.
