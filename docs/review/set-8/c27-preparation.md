# C-27 source preparation, not the finished town

17 October 2026. C-27 is **in progress** on `codex/c27-town-assets` from pilot `7c19f9f`.

The contact sheet `c27-preparation.png` shows the converted owner-supplied CC0 models, each in a
separate static studio view. It is an asset inspection, not an in-game scene or a frame-budget result.
The browser renders every model with one primitive, zero image textures and no GL error.
`c27-prepared-validation.json` records the real loader, dimensions and source-detail geometry.

| Model | Source-detail triangles | Converted bytes |
| --- | ---: | ---: |
| town-house | 1,156 | 83,704 |
| town-house-wide | 1,180 | 84,312 |
| town-tree | 42 | 5,120 |
| town-fence | 88 | 7,268 |
| town-shop | 1,248 | 83,572 |
| town-road | 44 | 3,764 |
| town-streetlight | 92 | 7,148 |
| town-parked-car | 2,026 | 155,372 |

The eight source-detail exports total 430,260 bytes; they are temporary outputs, not shipped assets.
Their Low variants and runtime instanced replacements are still pending. No game source/manifest,
layout, scoring, save, Settings or translations changed in this slice. Five conversion unit tests,
eight real-loader/normalised-placement checks, byte-identical repeated conversion and the existing
three asset-policy tests pass. The game frame budget remains unchanged; `test/fpbench.js` will gate
runtime integration. Source provenance and reproduction commands: `docs/3D-TOWN-ASSETS.md`.
