# Owner visual review and asset audit, 21 October 2026

The owner played the private High preview from `codex/c37-replay` at `6a0d5c5d`. Driving felt substantially better and the houses worked visually. The cab felt incomplete, the side mirrors were not apparent, surfaces looked missing or flat, sign readings floated instead of looking like real signs, the GUI felt basic, and people/detail were not apparent.

## What is actually used

The real browser loaded all **14 High models**, with **zero failures and zero fallbacks**, from the current manifest. Its seven packs contain the Kenney starter garage; Suburban houses, trees and fences; a Commercial building; Roads road and streetlight; Car Kit parked car and delivery van; and Modular Men/Women workers and residents. The matching Low variants are shipped too. They are locally bundled. Palette colours were baked into the exported meshes. No image texture is shipped by the 3D manifest.

## What has not been integrated

All five owner-uploaded Poly Haven material packs are still on `origin/owner/o3-assets` in `assets/_incoming/`: asphalt pit lane, concrete pavement, grass ground, plastered wall and red brick. Furniture Kit and Mini Characters are also unplaced. The raw archives are available here; this is unfinished integration, not a current download or permission problem. The backlog row that groups the packs obscures that distinction and should be split when the integration is completed.

The performance-first work implemented mechanics, fallbacks and the Low rendering ceiling before finishing the materials and presentation. This explains the gap; it does not meet the owner's High visual expectation. C-49 now explicitly owns the texture integration; C-50 physical sign lettering; C-51 actor visibility/detail; and C-52 the device/instrument GUI visual pass. Original project artwork can fill gaps after its provenance wording is settled with Claude. No third-party licence or CC0 claim will be invented.

## Cab correction under test (C-48)

A matched 1280 by 720 High capture proved both side mirror centres were outside the default camera frustum (`x = -1.427` and `3.095` in normalized device coordinates). All assets had loaded. The revised seated eye and forward mirror brackets put all three complete faces inside the normal view, with a bounded wider cab lens. Walking retains its original lens. The dashboard stays anchored to the van, and the cab gains a complete roof lining/floor, passenger door panel, recessed vents, visors and lit High materials. Looking, continuous dwell and the matching manoeuvre checks remain required; visibility alone grants no check.

This is one cab correction. It does not claim that the whole art pass is complete. The owner's currently published preview remains the earlier frozen snapshot until a new build is explicitly deployed.
