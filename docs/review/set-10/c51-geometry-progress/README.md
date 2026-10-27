# C-51 geometry and benchmark-fixture progress

C-51 remains doing while the complete resource gate runs. The corrected runtime `32623203` passes both 285,600-view CPU geometry sweeps on current-pilot candidate `281bb8b5`: loaded Low 60 calls / 2,436 triangles, actual missing-model Low 59 / 2,196. The ceilings remain 64 / 2,500. These are conservative geometry counts, not GPU frame-rate measurements.

Fixture `bf37a0cb`, candidate `055415cf`, changes tests only: the new ambient benchmark setup calls the real later/walkaround departure adapters and retains generated weather. A new regression in the existing world suite exercises the exact page-evaluation function used by fpbench with real mission/world adapters, checks all nine Low/High setups can restore and have a selected person, and requires the generated weather and departure fields. All 10 world tests and the translated-assertion guard pass. The earlier gate was deliberately interrupted before this correction; its incomplete captures are excluded from final acceptance.

The resumed runner checks all 17 new resource views first, then the unchanged complete gate expanded to 224 views. No full resource pass or Intel 60 fps is claimed here. Both source versions and all earlier native results keep their recorded scope.
