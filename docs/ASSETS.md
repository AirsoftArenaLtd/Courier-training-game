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
