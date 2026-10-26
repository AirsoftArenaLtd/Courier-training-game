# C45 local High shadow correction — 26 October 2026

C45 stays **doing**. The [High shadow diagnosis](../c45-high-shadow-diagnostic/README.md) preserves the rejected c75808cc visual result and isolated before/after probes. The broad bands came from projecting the existing 512×512 map over a 90m area around this small room.

The owned lighting adapter now accepts a bounded High shadow span. Only pickup scenes request **20m**, and their texel snap uses **20/512m**; ordinary workday and Low retain **90/512m**. The same shadow map size/count, update frequency and render hook remain. Room/counter shadow reception stays enabled; the uploaded High character remains. No texture/pass/budget increase, shared input/scoring/save/Settings/theme/i18n/default change or new on-screen text.

All **13 lighting tests** pass, including the new actual-world/real-light case for room coverage, matching texel snap, unchanged 512px map, Low behavior and restoring ordinary 90m coverage on rebuild. Pickup status text also caches by the existing action version, avoiding a fresh decision-key array/string on each frame while keeping the same displayed sentences. Existing model/workflow/native/resource checks validate the behavior.

All **97/97 pure Node suites pass freshly**, including **23 pickup-focused cases** and the additional counter lighting scope/rebuild case. The **6,048-pose CPU Low** gate remains loaded **31/1746**, fallback **37/1592**, under original ceilings. All seven changed JS files pass syntax. Exact application, suite and log hashes match. The status cache keeps the same displayed sentences.

The **three actual-current-app High preflight poses pass** original limits: **33 calls / 33,772 triangles / 4 Three textures / 11,239,424 attachment bytes / 4,748,560 Phaser estimate bytes**. All three captures were inspected: uploaded shipper, actual cart labels, mounted lettering and fitting receipt remain; broad shadow bands are removed while real room/parcel shadows stay. `preflight/`, `preflight-protocol/` and `visual-preflight.json` preserve the exact subset/dirty-source scope. These images are not full clean-source/native acceptance.

After that successful preflight, the test-only fpbench proof now also requires actual High 20m projection, unchanged 512×512 map and enabled counter shadow reception/casting; Low must keep those flags off. Original resource ceilings are unchanged. `fpqualitygate` was rerun once for this protocol change and its exact row/log hashes updated. Other passing suites were not repeated for documentation.

The new clean-source **40-job** sequence is next. Earlier c75808cc Low/High numerical reports stay in their historical scope, with High visuals explicitly rejected. New full profiles, native journeys/negative/abandonment/repository results and visual reviews must complete before C45 becomes review-ready. Shared Tamil font/translation/A30/A31/current-pilot/default rollout and owner Intel O1 remain separate.
