# City Kit Commercial 2.1

Author: Kenney. Licence: CC0.
Source: https://kenney.nl/assets/city-kit-commercial
Downloaded by the owner on 17 October 2026; supplied on `owner/o3-assets`.
Incoming archive: `kenney_city-kit-commercial_2.1.zip`. SHA-256: `f8b09b081c2bb88bcc126e2dec1cb40fd0dad7e7e591b6c26aaefe96fb35276b`.
Palette SHA-256: `191bec3889aaaca5018380038fecc129ebb5c2182879a099b7b538b3fa050b5d`.

Converted with `python3 test/tools/prepare-town.py INCOMING OUTPUT` (Pillow required).
Static node transforms are baked, palette sRGB becomes linear vertex colour,
source winding yields flat normals, and identical vertices are deduplicated.
No external URI, image, decoder or additional GPU texture is retained.
Low exports use closed silhouette LODs with the source bounds and palette; trees/roads retain their small source mesh.

| Source model / quality | Source SHA-256 | Converted triangles | Bytes | Output SHA-256 |
| --- | --- | ---: | ---: | --- |
| building-a / low | `5cf220f90ee3f21e7abe38055ca409a48aa8ef1d5ffab6e2deb99e5a5e1ed5e0` | 22 | 2684 | `6590ee8585279f6a117b1156c12ab6c3e3191fd8741a334f9838340a2b860536` |
| building-a / high | `5cf220f90ee3f21e7abe38055ca409a48aa8ef1d5ffab6e2deb99e5a5e1ed5e0` | 1248 | 83572 | `42633cffd9b589968fee496cadab3f858f295de30a320478b207e6fcdfad222c` |
