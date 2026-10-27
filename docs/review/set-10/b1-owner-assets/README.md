# Owner asset placement and inventory

B-1 is ready for review on `codex/b1-owner-assets`, stacked on pushed C49 `8d2b096a`. The branch adds the owner's actual Furniture Kit desk to the three existing prototype depot stations on High. It also accounts for every O-3 archive and records where its selected content is used. Pilot and the existing owner preview do not automatically contain this unmerged work.

| Owner uploads | Current consumer | Scope |
| --- | --- | --- |
| Kenney Suburban, Commercial and Roads | `fptown.js` | Houses, shops, trees, fences, streetlights and roads; existing bounded Low/High variants |
| Kenney Car Kit | `fptown.js`, `fpactors.js` | Parked sedan and semantic van body/door/wheel parts |
| Quaternius Men and Women | `fpactors.js` | Rigged workers and residents with four workday clips |
| Five Poly Haven materials | `fpmaterials.js` | C49's bounded High atlas for asphalt, pavement, grass, plaster and brick |
| Kenney Furniture Kit | `fpworld.js` | New High station desks; original Low and missing-file counters remain |
| Kenney Mini Characters | Deferred | Twelve rigged bodies with two skins and 32 clips each, plus 14 aids/accessories; a concrete interaction and its body/clip adapter need separate performance and visibility evidence. Current workday roles use the validated Quaternius actors. |

The inventory verifies **13 raw archives, 12 used owner packs and one deferred pack**. The pre-existing official Kenney starter pack is separate, making 13 shipped packs and 34 manifest files in total. Assets total **8,994,730 bytes**, with **824,208 Low-selected bytes**, inside the unchanged 40 MiB / 15 MiB policy. Original author licences match the owner archives byte for byte. Poly Haven archives contain no licence file; their existing source notes retain the explicit CC0 declaration and full legal-text provenance. Quaternius source-model hashes match the exact archived GLTF files. All shipped GLB files are self-contained.

`inventory.json` includes archive, licence, model and output hashes, consumer paths, geometry counts and texture dimensions. Reproduce it after `git archive origin/owner/o3-assets assets/_incoming` into a temporary directory:

```sh
python3 test/tools/audit-owner-assets.py /tmp/otr-b1-incoming/assets/_incoming /tmp/b1-inventory.json
```

Raw archives remain outside the worktree and package. Only the selected 15,048-byte desk GLB is added, unchanged from the Furniture Kit archive, with its original licence and a source note. Its three primitives instance the three stations, preserving the exact original full counter occluders, signs and actions. Low never requests it; missing files keep the original counters. The group is hidden on driving routes, uses no image maps, adds no render pass or per-frame array, and disposes its private instances while retaining bank-owned source geometry. Credits were generated with the previously authorised shared `test/tools/credits.js` step.

**Validation:** 116 affected/required CPU cases pass, plus the three asset-policy checks at import and the current-catalogue translation check. Two new geometry tests cover actual fitted geometry, stable buffers, station rays, exact counter occluders, model ownership/disposal, Low exclusion and missing-file fallback. Updated asset-count assertions account for the extra High model: 15 models / 20 loaded assets, while Low remains 14. Browser checks pass **85 pixel/ray/key-action assertions across English/Tamil × normal/larger**, plus **50 actual loading/fallback/layout assertions**. Imported desk pixels change 87,056–119,941 pixels per station capture when the real mesh is hidden. The actual interaction key opens the original debrief panel; its text stays within the screen in all four layouts.

Five focused `test/fpbench.js` hub views pass the unchanged resource ceilings:

| Profile | Calls | Triangles | Three textures | Attachments, bytes | Phaser estimate, bytes |
| --- | ---: | ---: | ---: | ---: | ---: |
| Loaded High | 9 | 694 | 1 | 7,815,168 | 4,389,030 |
| All-model-missing High, original counter comparison | 6 | 136 | 1 | 7,815,168 | 4,389,030 |
| Loaded Low | 6 | 136 | 1 | 3,557,376 | 1,464,246 |
| Accessible Low | 6 | 136 | 1 | 3,557,376 | 1,537,568 |
| All-model-missing Low | 6 | 136 | 1 | 3,557,376 | 1,464,246 |

These are five hub samples, not a new full route gate. The High difference is exactly three draws and 558 triangles: three 198-triangle desks replace three 12-triangle counter bodies. The renderer, Low route geometry, existing station collision/action code and source interaction text stay unchanged. C49's earlier route proof retains its exact source scope. Cloud rendering does not establish the owner's Intel 60 fps floor or shared pilot/default acceptance.

Seven serial browser jobs verify all **535 frozen inputs**, with exact report/capture hashes in `browser-status.json` and `high-fallback-result.json`. Both owned servers and the browser lease are released. `verification.json` contains the accepted totals and budgets; `visual-review.json` hashes five images inspected at original resolution. The first restricted credits runner's child-spawn error is retained separately; the allowed-context retry passes both checks. No application change was made for it.

[High desks](artifacts/b1-desk-loaded-high-high-hub.png) · [Original counters / High fallback](artifacts/b1-desk-fallback-high-high-hub.png) · [Larger Tamil station](artifacts/b1-desk-native-ta-large-hub-practice.png) · [Larger Tamil original debrief](artifacts/b1-desk-native-ta-large-debrief.png).
