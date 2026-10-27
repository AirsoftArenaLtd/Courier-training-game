# Furniture Kit 2.0

Author: Kenney. Licence: CC0.
Source: https://kenney.nl/assets/furniture-kit
Uploaded by the owner on 17 October 2026 in commit `6061a244faafe821da11feb3b041129f60f72b12`; prepared on 22 October 2026.
Original author licence retained byte for byte.

High only. Adult meshes retain source positions, normals, indices, joints, weights and inverse bind matrices. Palette colours are sampled offline into linear RGB vertices; UVs/images and all clips except idle/walk are removed. The two clips are renamed Idle_Neutral/Walk. No runtime image, bone texture or external fetch. The bench is the unchanged source GLB.

Reproduce with `python3 test/tools/prepare-ambient.py MINI_ZIP FURNITURE_ZIP OUTPUT_3D`.

Source `Models/GLTF format/bench.glb` SHA-256: `ba05a6d23a5a5a44da016757632070e47ff7587ce10e2f6d6d52328b4cf5489b`.
Output `models/bench-high.glb`: 10756 bytes; SHA-256: `ba05a6d23a5a5a44da016757632070e47ff7587ce10e2f6d6d52328b4cf5489b`.
