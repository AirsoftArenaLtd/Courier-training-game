# Car Kit 3.1

Author: Kenney. Licence: CC0.
Source: https://kenney.nl/assets/car-kit
Downloaded by the owner on 17 October 2026; supplied on `owner/o3-assets`.
Incoming archive: `kenney_car-kit.zip`. SHA-256: `fac7dacac5c7874348cf19729af3ef205f3d366493edaf0a827d93f4fdf3d0c4`.
Palette SHA-256: `f3622a03a20c6696065cae9cbe391351be873508af190c2ebd1d420c055787a5`.

Converted with `python3 test/tools/prepare-town.py INCOMING OUTPUT` (Pillow required).
Static node transforms are baked, palette sRGB becomes linear vertex colour,
source winding yields flat normals, and identical vertices are deduplicated.
No external URI, image, decoder or additional GPU texture is retained.
Low exports use closed silhouette LODs with the source bounds and palette; trees/roads retain their small source mesh.

| Source model / quality | Source SHA-256 | Converted triangles | Bytes | Output SHA-256 |
| --- | --- | ---: | ---: | --- |
| sedan / low | `b532ea7d2c59f7f6b22b138cf1955218a2c1898f1cea932af4d3fd563c3959b7` | 32 | 3468 | `cc508ac3bfd3a5b015bea0c9107fc492f223baa0afacdc3cea934039ea82e7df` |
| sedan / high | `b532ea7d2c59f7f6b22b138cf1955218a2c1898f1cea932af4d3fd563c3959b7` | 2026 | 155372 | `c6dcb3cf617030f60db42b553530040705a568f955a040879f9b95a25e6d6512` |

## C-28 van

# C-28 converted kenney-car-kit

Author: Kenney. Licence: CC0.
Source: https://kenney.nl/assets/car-kit
Downloaded by the owner on 17 October 2026; supplied on `owner/o3-assets`. Original author licence retained byte for byte.

The van retains semantic door and wheel parts with baked palette colours. Workers use Worker; residents use Casual (women) and Casual_2 (men). Character Low keeps the source rig and four workday clips with an 88-triangle silhouette. High keeps source geometry. The game CPU-poses one ordinary mesh per visible actor; no bone texture.

Source model van-exterior SHA-256: `426a3e3a2c242c05c889b1445ba02ef95b2c8b7cd6f597e1275ef736a826014b`.

`models/delivery-low.glb`: 18448 bytes, SHA-256 `fe973e6d97c43f6784cf2bc202d25c6c938755a3cb580156e3da5ad53a5dcf11`.

`models/delivery-high.glb`: 195040 bytes, SHA-256 `8acc2bb4d084c286a45f01d08163d076cc6f89920fa6db35883210cf8544bcd3`.
