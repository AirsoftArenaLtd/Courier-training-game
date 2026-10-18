# City Kit Roads

Author: Kenney. Licence: CC0.
Source: https://kenney.nl/assets/city-kit-roads
Downloaded by the owner on 17 October 2026; supplied on `owner/o3-assets`.
Incoming archive: `kenney_city-kit-roads.zip`. SHA-256: `374a4552115cbd11b4ec5c930ee31a533562dc78a09af249a655d03f7ea3b959`.
Palette SHA-256: `a48e2962661ae44368ffddf3054f80ed8491d082b757dcc3011184cd9a98b185`.

Converted with `python3 test/tools/prepare-town.py INCOMING OUTPUT` (Pillow required).
Static node transforms are baked, palette sRGB becomes linear vertex colour,
source winding yields flat normals, and identical vertices are deduplicated.
No external URI, image, decoder or additional GPU texture is retained.
Low exports use closed silhouette LODs with the source bounds and palette; trees/roads retain their small source mesh.

| Source model / quality | Source SHA-256 | Converted triangles | Bytes | Output SHA-256 |
| --- | --- | ---: | ---: | --- |
| road-straight / low | `f8f744fb6fc96dedd5ad1f763b550166f2624a3757bf36b4b39969d2e7cacac5` | 44 | 3764 | `49004c6d7de685000cf02ff9b54b5b6bdaed13a2003eaf2f8d9e466794935d82` |
| road-straight / high | `f8f744fb6fc96dedd5ad1f763b550166f2624a3757bf36b4b39969d2e7cacac5` | 44 | 3764 | `49004c6d7de685000cf02ff9b54b5b6bdaed13a2003eaf2f8d9e466794935d82` |
| light-curved / low | `154dcce9d58ec2cd165e26c91a89c97bdd2838cf06d255099b3570df84f82ec6` | 24 | 2700 | `08383b6a338ce383ee2d1934af798b99d806f89578ff6a274e363eb80e4b61ab` |
| light-curved / high | `154dcce9d58ec2cd165e26c91a89c97bdd2838cf06d255099b3570df84f82ec6` | 92 | 7148 | `ec3b5e0f20ac30fe9dd363a6374e0a0018ca6abc731e7647005bdf7a2e246332` |
