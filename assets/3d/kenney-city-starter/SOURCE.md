# City Builder starter assets

Author: **Kenney**. Pack: **Starter Kit City Builder**, art licensed **CC0** in the author's README.
Downloaded 17 October 2026 from https://github.com/KenneyNL/starter-kit-city-builder,
revision `4535092b740b378b700efd9df9e27a631815b84a`.

`LICENSE.txt` reproduces the README's licence section verbatim. Its MIT terms concern the starter's software;
the final sentence explicitly dedicates the included models, sprites and sound effects to CC0. No starter code
or fonts are bundled here. The original City Kit packs are still requested from the owner under O-3.

Inputs from that revision:

- `models/building-garage.glb`, SHA-256 `7373b558fc9b1e27e60b60ca1ce53000af7e132d7304eeb6d49b47528a3b6806`.
- `models/Textures/colormap.png`, SHA-256 `106cf02e0d6dccded6d9f90c2ae6a51eb94c6301645fea159e834c44ed4708a3`.

`test/tools/prepare-garage.py` produces the two shipped, self-contained GLBs. High retains all 196 source triangles,
sampling the source palette at each vertex and baking linear RGB colours instead of shipping a texture. Low is
a closed 16-triangle silhouette derived from that footprint/roof, with colours sampled from the same source.
Both use one material, no image maps, no external buffers and no compression decoder. This keeps the existing
two-target Low gate and a bounded repeated-prop example. Every placement fits the existing solid lot footprint;
delivery doors, labels and the full town art pass remain in their own tasks.

```sh
python3 test/tools/prepare-garage.py /path/to/building-garage.glb /path/to/colormap.png assets/3d/kenney-city-starter/models
node test/assets.js
```
