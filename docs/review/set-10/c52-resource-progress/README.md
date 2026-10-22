# C-52 resource progress

C-52 remains doing. These are the first two completed rendered profiles on frozen current-pilot candidate `7dcbd2b6`, with owned runtime and fixture `f5d4ab68`. They cover 130 of the required 224 views. The larger-text/colour-blind/reduced-motion and missing-model profiles are still running; this evidence does not establish final acceptance.

| Completed profile | Views | Draw calls | Triangles | Three textures | Attachment bytes | Phaser estimate bytes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Loaded Low | 72 | 53 | 2,402 | 2 | 3,557,376 | 2,623,766 |
| Loaded High | 58 | 113 | 240,133 | 4 | 11,239,424 | 7,947,600 |

Both profiles pass their original budgets. `independent-verification.json` records a second check of the archived raw reports through `require('./test/fpquality').checkReport`, including exact view coverage, native fixtures, live mirrors, assets, context health and resource ceilings.

The completed High sign-clearance run passes all 240 approaches and 192 first-day display poses in all 12 languages at normal/larger sizes, with no failures or page errors. Low's matching clearance evidence is in `../c52-native-progress/`.

The loaded and missing-model CPU sweeps each cover 285,600 views. Their peaks are 60 calls / 2,436 triangles and 59 / 2,196, under the unchanged 64-call / 2,500-triangle ceiling. These sweeps measure geometry, not native GPU frame time.

The raw profile logs and reports, geometry reports and logs, High clearance report and log, source hashes and independent verification are archived here. The complete final gate will have its own manifest. Cloud SwiftShader frame rates do not establish the owner's Intel 60 fps floor; O-1 remains. No preview deployment, protected-branch push, Git merge or automation change was made.
