# City Kit Suburban 2.0

Author: Kenney. Licence: CC0.
Source: https://kenney.nl/assets/city-kit-suburban
Downloaded by the owner on 17 October 2026; supplied on `owner/o3-assets`.
Incoming archive: `kenney_city-kit-suburban_20.zip`. SHA-256: `5869c35cf30b1c87bdb2d197b6d325eebadd2ef08ea27f04797e8e08d77a9a39`.
Palette SHA-256: `9b5de86078c25ef02351a80d35ff3c978693a1044565b73eedd9ae9b5b80665d`.

Converted with `python3 test/tools/prepare-town.py INCOMING OUTPUT` (Pillow required).
Static node transforms are baked, palette sRGB becomes linear vertex colour,
source winding yields flat normals, and identical vertices are deduplicated.
No external URI, image, decoder or additional GPU texture is retained.
Low exports use closed silhouette LODs with the source bounds and palette; trees/roads retain their small source mesh.

| Source model / quality | Source SHA-256 | Converted triangles | Bytes | Output SHA-256 |
| --- | --- | ---: | ---: | --- |
| building-type-a / low | `49f32e20b9dcd24b1c8f6d6488807b8c8cb684cbb595bfb0bb36ad903e470faa` | 36 | 3848 | `4bd027206e912023b47ce523aacdc30bcf2f4e4796f990244d5bfd5929ef9863` |
| building-type-a / high | `49f32e20b9dcd24b1c8f6d6488807b8c8cb684cbb595bfb0bb36ad903e470faa` | 1156 | 83704 | `9eb259150050a74e5fb0420294ee0bd00637ff142ac634a06a79c4c65ab5fbef` |
| building-type-c / low | `86a69f30f1a09461283e158514945ae5cc9d56357b0ddc83a9a3f0eecd113591` | 36 | 3848 | `eda197edfabafb0d8545b60fc460294e651a97a6a0f1c17d4ceecec3ad3881ef` |
| building-type-c / high | `86a69f30f1a09461283e158514945ae5cc9d56357b0ddc83a9a3f0eecd113591` | 1180 | 84312 | `a294e1cc7b9cda3aff56fc9b73166b8e684816ddae560e0807bec8858236bb5f` |
| tree-small / low | `5f63359e5f392609d7617cc98070855ca1ffd4f4b4bc3978a5ff56ece88a58d6` | 42 | 5120 | `038af752a76db95d0de967a71be243a737499d46944bffe5b8667d643307d862` |
| tree-small / high | `5f63359e5f392609d7617cc98070855ca1ffd4f4b4bc3978a5ff56ece88a58d6` | 42 | 5120 | `038af752a76db95d0de967a71be243a737499d46944bffe5b8667d643307d862` |
| fence / low | `073bd2000ac51879516d49f835d5156dac4d5038085380b1232858fc3f562d02` | 12 | 1904 | `c0ba6f11487e8f9ff15d0203e373a24e1d8340482b02ea70a55d140a04fac1b2` |
| fence / high | `073bd2000ac51879516d49f835d5156dac4d5038085380b1232858fc3f562d02` | 88 | 7268 | `3f6ec2eb487c5a3ca06b722945712ee10b351ce6b194b033533a677391f38d9a` |
