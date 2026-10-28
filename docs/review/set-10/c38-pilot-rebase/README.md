# C-38 current-pilot handoff

Rebased onto `pilot` `3678fba3` after C-52 merged. Runtime candidate `66f2cda5` preserves B-178 fonts, B-180/B-185 native timing, B-138 signals, B-2 keyboard/gamepad input, B-3 display-loss recovery and current assets/counts. Prior tip: `codex/c38-before-pilot-oct28`. The index keeps replay and scenario scenes; the benchmark keeps C-52's brace fix. Pilot board entries were preserved, with this fresh handoff replacing historical statuses. Historic reports/patches retain their original bytes and source scopes.

All **18 focused CPU suites**, changed-JS syntax and authored source whitespace checks pass. Historic raw logs retain their whitespace. Current native lifecycle/results/isolation checks pass **231 assertions across eight English/Tamil normal/larger views**, repeated entry, abandonment and 2D failure transfer. All **24 resource views** pass the original four-profile caps, independently checked again.

| Profile | Calls / triangles / Three textures / attachment bytes / Phaser estimate |
| --- | --- |
| loaded-low | 32 / 870 / 2 / 3557376 / 1597840 |
| loaded-high | 47 / 32707 / 4 / 11239424 / 4923856 |
| accessible-low | 32 / 870 / 2 / 3557376 / 1969664 |
| fallback-low | 36 / 716 / 2 / 3557376 / 1597840 |

`verification.json` rehashes 555 inputs, four host fonts and 42 artifacts, and records cleanup. The original-size High larger Tamil cab was inspected: Tamil glyphs render, three mirrors remain visible and the lowered hood retains the forward view. New C38 goal text retains its pending translation handoff.

The native runner's test-only definition exercises the shell. A-30's shared per-module launcher remains Claude's work; the prepared API/flow patch and text inventory are in `docs/review/set-10/c38-runner-api/`. This does not certify A-30/A-31 or Intel FPS; O-1 remains. C-39 and C-40 are rebased/pushed with CPU passes and fresh browser/resource checks running/queued. C-41 to C-46 follow in dependency order. C-42 closure is accepted at its frozen source; final blocked-drive validation is queued.
