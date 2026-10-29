# B132 combined visual-pass resource budget

Ready for review on `codex/b132-high-frame-budget`. Every runtime, data, asset, entrypoint and test byte matches pilot `a7bd8b57`. Source `64212824` measures the owner's visual passes together using unchanged `fpbench`, fixtures, quality profiles, sound and live reflected-pixel probes.

All **57 static views** pass: fifteen High and fourteen each loaded Low, accessible Low and missing-model Low. Views include the cab and three mirrors, reversing at night, visible rain/storm, navigation, school/peak traffic and bounded ambient people/detail. Source assets load exactly 23 on High and 14 on Low; missing-file fallback loads zero. All three mirror probes retain actual red/blue reflected pixels in every profile.

| Profile | Views | Calls | Triangles | Three textures | Attachments | Phaser estimate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| High | 15 | 113 | 240133 | 4 | 11239424 | 7974384 |
| Low | 14 | 53 | 2402 | 2 | 3557376 | 2360416 |
| accessible Low | 14 | 53 | 2402 | 2 | 3557376 | 2943808 |
| fallback Low | 14 | 53 | 2168 | 2 | 3557376 | 2360416 |

High stays below 128 calls / 300,000 triangles and 16 MiB attachment/Phaser ceilings, so this measured scope needs no visual tradeoff. Low is close to its 2,500-triangle ceiling (98 triangles remain), so extra Low detail needs a fresh combined measurement. The [57-row ledger](LEDGER.md) preserves each view separately; peaks are not a single simultaneous reading.

- loaded-high: calls peak at trafficpeak; triangles peak at trafficpeak.
- loaded-low: calls peak at trafficpeak; triangles peak at trafficpeak.
- accessible-low: calls peak at trafficpeak; triangles peak at trafficpeak.
- fallback-low: calls peak at trafficpeak; triangles peak at trafficpeak.

[verification.json](verification.json) rehashes 801 inputs, four font files and 61 artifacts, reruns every original checker against saved reports, proves source equality to pilot and verifies owned process/lease cleanup. Repeat `python3 docs/review/backlog/b132-high-frame-budget-c39/verify.py` without launching a browser. [visual-review.json](visual-review.json) records seven original-size readings. Models, textured town fronts, people, cab and weather are visibly present; this is a resource audit, not new visual work or a full native/all-language layout test. The larger cab RPM line sits close to the selector lettering and warrants a separate cab-layout check. Existing bright bus paint in the weather stress fixture is retained.

Intel O1 remains separate: cloud software FPS cannot certify laptop 60 FPS. The previous pre-C39/unstarted plans retain their original source scope. No production change, new text, deployment or protected-branch push is included.
