# Mini Characters 1.0

Author: Kenney. Licence: CC0.
Source: https://kenney.nl/assets/mini-characters
Uploaded by the owner on 17 October 2026 in commit `6061a244faafe821da11feb3b041129f60f72b12`; prepared on 22 October 2026.
Original author licence retained byte for byte.

High only. Adult meshes retain source positions, normals, indices, joints, weights and inverse bind matrices. Palette colours are sampled offline into linear RGB vertices; UVs/images and all clips except idle/walk are removed. The two clips are renamed Idle_Neutral/Walk. No runtime image, bone texture or external fetch. The bench is the unchanged source GLB.

Reproduce with `python3 test/tools/prepare-ambient.py MINI_ZIP FURNITURE_ZIP OUTPUT_3D`.

Source `Models/GLB format/character-male-a.glb` SHA-256: `77572792bfe2773b715b8cd8e18644b52b3e1f155fe10450254b50f9c364382a`.
Output `models/character-male-a-high.glb`: 95708 bytes; SHA-256: `017e00b7fd307a55a226411efde8e7102f633389f2c46b0648a4950869ff3b1f`.

Source `Models/GLB format/character-female-a.glb` SHA-256: `8cfcff43460da8b421f2a7fdfb43ec177321cad2746db9497cbf128d5806e2a8`.
Output `models/character-female-a-high.glb`: 115660 bytes; SHA-256: `feafdcaec5be4bcfd7e384b29780c5fbc738f5bfd67f8ec8639fa66316f78b15`.
