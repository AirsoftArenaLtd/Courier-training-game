# B-126: `?gfx=lite`, to try for owner question 8

Each pair is the same moment at Low (left as the game is now) and with `?gfx=lite` added to the address, on a software
renderer (no graphics driver):

| Scene | Low | Lite | Frame rate, Low → lite |
| --- | --- | --- | --- |
| Heat wave (m8-heat) | [low](m8-heat-low.png) | [lite](m8-heat-lite.png) | 14 → 22 fps |
| Proof of delivery (m5-pod) | [low](m5-pod-low.png) | [lite](m5-pod-lite.png) | 19 → 23 fps |

Also measured: m5-exceptions 19 → 22, m8-dog 19 → 23 fps (median of three 2-second samples each).

Lite leaves out the warm colour grade and the vignette in daylight, and the heat's haze and glare. Night and storms keep
their darkness. The game still plays the same; it looks flatter.
