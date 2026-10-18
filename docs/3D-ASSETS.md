# Local 3D asset pipeline (C-19)

The first-person scene loads a scene-owned asset bank after Three.js and before constructing the world. It reads
`assets/3d/manifest.json`, displays a progress bar with the sentence "Your workday is loading.", and continues with
the procedural model if a file is missing, corrupt, unsupported or over budget. Loading has a six-second deadline.
Scene shutdown aborts pending requests and releases late decoder results. A failed asset does not change scores,
save data, physical access or the workday's controls.

The policy is Claude's `docs/ASSETS.md`; the loader is `src/core/fpassets.js`. The vendored loader matches the existing
Three.js r158 exactly and shares that global runtime. Its MIT licence and source hashes are in `lib/three.LICENSE`
and `lib/GLTFLoader.SOURCE.md`. There is no second Three.js copy or remote decoder.

## Manifest and formats

```json
{
  "version": 1,
  "files": [
    {
      "path": "kenney-city-starter/models/garage-low.glb",
      "bytes": 2716,
      "pack": "kenney-city-starter",
      "quality": "low",
      "use": "town-garage"
    }
  ]
}
```

`use` is the consumer's stable asset key. Low selects `low`, then `both`; it never downloads High. High selects
`high`, then `both`, then Low if its preferred file fails. Duplicate paths/variants and non-local paths are rejected.
The actual streamed byte count must match the manifest. The bank enforces the policy's 40 MiB total, 15 MiB Low,
3 MiB model and 2 MiB texture limits before loading and while reading responses, with two downloads at a time.

Models must be self-contained GLB 2.0: embedded buffers and embedded PNG/JPEG images. External image/buffer URIs,
including a relative sidecar, are rejected before parsing; embed them when importing an owner-supplied pack. PNG/JPEG
dimensions are limited to 1024 on Low and 2048 on High. Compression requiring an unbundled decoder falls back.
Accessor/buffer ranges and decoded sizes are checked before allocation. The scene bank reserves at most 16 MiB
of decoded payload on Low or 64 MiB on High, including standalone images/audio; these CPU bounds do not replace
the rendering gate. Standalone manifest images are available in `bank.textures`, and audio bytes in `bank.audio`.
Current starter models use no image maps, so no additional GPU texture is uploaded.

## Using and releasing a model

`bank.add(parent, use, placements)` creates static instance batches, one per source primitive. Each placement
specifies `{ x, y, z, w, h, d, yaw }` in the parent's coordinates; y/yaw default to zero. The source bounds are
normalized to the existing footprint, preserving node transforms. Repeated placements share geometry/materials.
There are at most 512 placements per call and 32 primitives per model. Skinned, internally instanced or multi-material
meshes require their later task's adapter; the static helper retains the procedural fallback for them.

`bank.cull(group, x, z, radius)` compacts visible instances using preallocated matrices. The original bounding sphere
remains a safe bound for every subset. The world updates these batches with its existing scenery-distance cadence.
The two starter placements replace only non-delivery visual boxes; generated lot solids, customer facades, labels
and interaction targets stay in place. Missing templates return null, and the same code draws its original boxes.

Rebuilding the world disposes its instance buffers while retaining bank-owned geometry/materials for reuse. Scene
shutdown releases the bank once. Its parsed data, textures and telemetry never enter a mission snapshot. C-22/C-27/C-28
can extend the owned adapter as their models and animation arrive.

## Starter pack and review

Kenney's official GitHub starter assets are reachable; the full pack sites remain blocked as recorded in A-20/O-3.
`assets/3d/kenney-city-starter/SOURCE.md` records the pinned upstream revision, model/palette hashes, the author's
explicit CC0 declaration and the reproducible conversion. The two shipped files total 17,052 bytes. High retains
196 source triangles; Low uses a 16-triangle closed shell with the source flat roof. Palette colours are baked as
linear vertex colours, avoiding an image map. Two non-delivery buildings demonstrate repeated instancing; the
full town asset pass remains C-27. Original procedural buildings remain available throughout.

Tests and screenshots/clip are in `docs/review/set-7/c19.md`. The new loading sentence needs Claude's translation
pass; English and Tamil normal/larger layouts currently verify its English fallback. `docs/PERF.md` records actual
Low/High costs. Native Intel 60 fps acceptance remains the owner's O-1 check; SwiftShader cannot establish it.

## Recovered fallback diagnostics (B-44)

`assetBank.stats.loaded` counts usable selected assets, `failed` counts jobs with no usable candidate,
and `fallbacks` counts selected assets recovered through a later candidate (normally High to Low).
A missing High van with a usable Low van therefore reports `loaded: 14, failed: 0, fallbacks: 1`; a
fully missing set reports `loaded: 0, failed: 14, fallbacks: 0`. Existing per-request error paths and
reasons remain available. No rendering, selection, score, save or player-facing text changes.

Healthy `test/fpquality.js` profiles require an explicit zero fallback count, so recovered failures
and older reports without that field cannot silently pass as healthy. Actual all-model-missing
profiles still require zero loaded and at least 14 terminal failures. `test/fpassetsbrowser.js`
includes `high-fallback` (only the High delivery van gets HTTP 404), alongside the normal loaded
and all-missing cases. Claude’s owned SCORM launch check can inspect the same field.
