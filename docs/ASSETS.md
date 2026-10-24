# Asset files

The owner allowed bundled asset files on 17 October 2026: models, textures and sounds made by others, so the 3D world can
look like a real town and a real van. The game must still work offline, fit an LMS package, and be safe for a company to
use. These rules make that true. `node test/assets.js` checks them.

## What may come in

- **Licence: CC0 only** (public domain): Kenney, Quaternius, Poly Haven, ambientCG and similar. No attribution-only
  (CC-BY), no share-alike, no "free for personal use", no AI-generated packs of unknown origin. When a pack's licence
  is not CC0, leave it out.
- **Every pack keeps its licence file**: `assets/<pack>/LICENSE.txt` (or `License.txt`) as the author shipped it, plus
  `assets/<pack>/SOURCE.md` with the pack's name, author, web page and the date it was downloaded.
- **Formats:** models as glTF binary (`.glb`); textures as `.jpg` (colour) or `.png` (alpha, normal maps), at most
  1024 × 1024 for the Low setting and 2048 × 2048 for High; sounds as `.ogg` or `.mp3`. No `.fbx`, `.obj` or `.blend`
  in the game folder (convert them first).
- **Nothing from the internet at run time.** Every file is in the repository and loaded from the same folder as the game.

## Where it goes

```
assets/
  img/, art-pack.js      the 2D top-down art (owner-made, its own pipeline: src/core/assets.js); not covered here
  3d/
    manifest.json        every file the game may load: path, size in bytes, pack, Low/High, what it is for
    kenney-car-kit/      one folder per pack, named <author>-<pack>
      LICENSE.txt
      SOURCE.md
      models/...
    polyhaven-asphalt/
  _incoming/             raw downloads waiting to be converted (never loaded, never shipped)
```

Only files listed in `assets/3d/manifest.json` are loaded; anything else under `assets/3d/` (except the licence and
source files) fails the test. `_incoming/` is left out of the LMS package and the offline check.

## Size budget

| Budget | Limit |
| --- | --- |
| All shipped asset files together | 40 MB |
| Files the Low setting loads | 15 MB |
| One model | 3 MB |
| One texture | 2 MB |

The LMS package (SCORM zip) must stay under 100 MB including everything else. Large town pieces are instanced and share
textures (an atlas per pack where the pack has one). The frame budget in `docs/FRAME-BUDGET.md` and `docs/PERF.md` still
applies; `test/fpbench.js` is the gate.

## How the game loads them (board task C-19)

The 3D world reads `assets/3d/manifest.json`, preloads what the current graphics setting needs with a progress bar, and
falls back to the old generated model when a file is missing or fails to load, so a broken or missing file never stops a
workday. Codex owns the loader; Claude owns this policy, the manifest test and the packaging.

## Getting the packs

From the cloud sessions, `kenney.nl`, `quaternius.com` and `polyhaven.com` are blocked; GitHub raw files and the npm
registry work, so Kenney's starter-kit repositories on GitHub can be used for some buildings, roads and a car. The full
packs (board item O-3) are downloaded by the owner and dropped in `assets/_incoming/`; Codex converts and places them.

## Project-made artwork

Art made for the game by the team (Codex or Claude), procedurally in code or with a tool, is the project's own and
ships under the game's licence. It needs no outside licence file, but each file is recorded here so its origin is
clear. Never trace, copy or use a third-party image as its source.

| File | What it is | Made by, and how | Date |
| --- | --- | --- | --- |
| `src/core/fplessonbays.js` | Original active driving-drill and school finish-bay road markings; project-owned, shipped under the game’s licence. No image texture or baked text. | Codex; four shared cube instances with palette paint, fitted to the project town’s graded bay bounds and reused at each stop; no reference image. | 23 October 2026 |
| `src/core/fpdrivinglessonworld.js` | Original small school bus, double-sided physical stop arm, crossing and analytic water cue; project-owned, shipped under the game’s licence. No image texture. | Codex; fixed cube/plane instances, original C-50 glyph data and an analytic shader; reuses the locally licensed hazard-pool car/person and their procedural fallbacks. No reference image. | 23 October 2026 |
| `src/core/fphazardlessonworld.js` | Original bounded hazard cues and physical stop-sign glyph instances; project-owned, shipped under the game’s licence. No image texture. | Codex; shared cube/sphere geometry, original C-50 glyph data, palette materials and procedural fallback figures; locally bundled licensed car/resident models where available. No reference image. | 23 October 2026 |
| `src/core/fproutelessonui.js` | Original mounted sat-nav vector map and accessible reading frame; project-owned, shipped under the game’s licence. No image texture or raster text. | Codex; Phaser vector commands over the existing project town graph and closure data, no reference image. | 23 October 2026 |
| `src/core/fppretripui.js` | One reusable 520×330 inspection canvas, geometric component close-ups and a tread-gauge tool; project-owned, shipped under the game’s licence. Text is separate Phaser text. | Codex; existing project `truckart.js` geometric painters with raster text suppressed, plus original Canvas drawing commands for the gauge, no reference image. | 23 October 2026 |
| `src/core/fppretripworld.js` | Bounded cab safety equipment for the pre-trip exercise; project-owned, shipped under the game’s licence. No image texture. | Codex; five shared cube instances and palette colours, no reference image. | 23 October 2026 |
| `src/core/fppackagesortworld.js` | Original conveyor, routing console, numbered destinations, jam-reset post and fixed parcel pool; project-owned, shipped under the game's licence. Unwired component; three instanced batches and no image texture. | Codex; hand-authored cube and face geometry with the existing 5×7 routing numerals, no reference image, external artwork or font file. | 24 October 2026 |
| `src/core/fppackageliftworld.js` | Original pallet, shelf/platform, hand truck, hands and analog gauge; procedural coworker fallback. Project-owned, shipped under the game's licence. Two bounded instance batches and no image texture; the normal coworker reuses the already-credited local worker rig. | Codex; hand-authored cube/face geometry, no reference image, external artwork or font file. | 24 October 2026 |
| `src/core/fppackagesortworld.js` | Original conveyor, routing console, numbered destinations, jam-reset post and fixed parcel pool; project-owned, shipped under the game's licence. Physical sorting component; three instanced batches and no image texture. | Codex; hand-authored cube and face geometry with the existing 5×7 routing numerals, no reference image, external artwork or font file. | 24 October 2026 |
| `src/core/fppackagelabelworld.js` | Original six-sided cardboard parcel, shipping barcode, handling and hazard symbols, visible leak/crush marks, inspection table and numbered handling stations; project-owned, shipped under the game's licence. Two bounded geometry meshes and no image texture. | Codex; hand-authored coloured triangles, polygons and strips, using the project's existing 5×7 numeral glyphs and the same symbolic vocabulary as its 2D label scene. No reference image, downloaded artwork or font file. | 23 October 2026 |
| `src/core/fpcustomerworld.js` | Physical conversation counter, phone, parcel, dog and fallback facades/people; reuses the existing locally bundled town buildings and resident rigs when available. | Codex; procedural Three.js instances and the existing licensed asset pipeline, no new image map or pass. | 24 October 2026 | Project-owned, shipped under the game’s licence; reused packs retain their existing licences. |
| `src/core/fpmountedwords.js`, C-42 additions in `src/core/fpcustomerworld.js` | Original mounted address/suffix/mailbox lettering, cab phone, gate, isolation tray and parcels; project-owned, shipped under the game's licence. Reused house/resident packs retain their licences. | Codex; bounded Three.js geometry pools, existing project glyph rows on Low and browser Noto Sans / Arial row-strip geometry on High, no new image or font file. | 24 October 2026 |
| `src/core/fpcustomerworld.js` | Physical conversation counter, phone, parcel, dog and fallback facades/people; project-owned under the game’s licence. Reused town buildings and resident rigs retain their existing licences. | Codex; procedural Three.js instances and the existing licensed asset pipeline, no new image map or pass. | 24 October 2026 |
| `src/core/fpcustomerprotocolworld.js` | Mounted intercom panel/buttons, reception counter and locker cabinet/doors/parcel; project-owned under the game’s licence. The existing doorstep house and resident assets retain their licences. | Codex; procedural instances in the existing three doorstep batches, runtime lettering, no new image map or render pass. | 28 October 2026 |
| `src/core/fpcustomerstopworld.js` | Original hand truck, parcels, tread geometry, moving door leaf/frame and mounted address lettering; project-owned under the game’s licence. Reuses locally bundled town-house and resident rigs under their existing licences. | Codex; fixed Three.js instance pools. Low uses the existing project glyph rows; High converts existing browser-rendered Noto Sans / Arial text into bounded row-strip geometry, with no image texture, added font file or render pass. | 24 October 2026 |
| `src/core/fpcab.js` | Original analytic instrument dials, ticks, seven-segment numerals, needle and backlighting; project-owned, shipped under the game's licence. No image texture. | Codex; hand-authored GLSL distance functions and palette, no reference image or added font file. | 22 October 2026 |
| `src/core/fpbranding.js`, `src/core/fphud.js` | Original rugged device case, vector choice surfaces and navigation display treatment; project-owned, shipped under the game's licence. Low uses no case canvas; High reuses the existing bounded canvas. | Codex; hand-authored Canvas/Phaser drawing commands, no reference image. | 22 October 2026 |
| `src/core/fpsignlettering.js` | Original Low 5×7 sign glyphs and procedural face layout; project-owned, shipped under the game's licence. High draws whole legends at runtime with the browser's existing text renderer. | Codex; hand-authored binary glyph rows and shader layout, no reference image or added font file. | 22 October 2026 |
| `docs/review/set-10/materials/cab-plastic-original.png` | Cab material source draft; project-owned, shipped under the game's licence. Not loaded at runtime. | Codex; `image_gen.imagegen`, written brief only, no reference images, opaque background, requested 1024 square / returned 1254 square. Prompt and SHA-256 in the adjacent JSON. | 21 October 2026 |

## Credits

The packs the game ships, with thanks (the game lists them on the title screen under Credits).

<!-- credits: generated by node test/tools/credits.js -->

| Pack | Author | Licence | Source |
| --- | --- | --- | --- |
| City Builder starter assets (`kenney-city-starter`) | Kenney | CC0 | https://github.com/KenneyNL/starter-kit-city-builder |
| City Kit Suburban 2.0 (`kenney-city-suburban`) | Kenney | CC0 | https://kenney.nl/assets/city-kit-suburban |
| City Kit Commercial 2.1 (`kenney-city-commercial`) | Kenney | CC0 | https://kenney.nl/assets/city-kit-commercial |
| City Kit Roads (`kenney-city-roads`) | Kenney | CC0 | https://kenney.nl/assets/city-kit-roads |
| Car Kit 3.1 (`kenney-car-kit`) | Kenney | CC0 | https://kenney.nl/assets/car-kit |
| Ultimate Modular Men (`quaternius-modular-men`) | Quaternius | CC0 | https://quaternius.com/ |
| Ultimate Modular Women (`quaternius-modular-women`) | Quaternius | CC0 | https://quaternius.com/ |
| Asphalt Pit Lane (`polyhaven-asphalt-pit-lane`) | Poly Haven contributors | CC0 | https://polyhaven.com/a/asphalt_pit_lane |
| Concrete Pavement (`polyhaven-concrete-pavement`) | Poly Haven contributors | CC0 | https://polyhaven.com/a/concrete_pavement |
| Grass Ground (`polyhaven-grass-ground`) | Poly Haven contributors | CC0 | https://polyhaven.com/a/grass_ground |
| Plastered Wall (`polyhaven-plastered-wall`) | Poly Haven contributors | CC0 | https://polyhaven.com/a/plastered_wall |
| Red Brick 03 (`polyhaven-red-brick-03`) | Poly Haven contributors | CC0 | https://polyhaven.com/a/red_brick_03 |
| Furniture Kit 2.0 (`kenney-furniture-kit`) | Kenney | CC0 | https://kenney.nl/assets/furniture-kit |
| Mini Characters 1.0 (`kenney-mini-characters`) | Kenney | CC0 | https://kenney.nl/assets/mini-characters |

<!-- /credits -->
