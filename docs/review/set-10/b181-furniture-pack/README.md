# B-181: one Furniture Kit folder and credit

Both Furniture Kit models now use `assets/3d/kenney-furniture-kit/`. The bench keeps its original model id, use, High-only selection, filename and bytes. The desk and original author licence are byte-for-byte unchanged. The duplicate folder and credit are removed; source notes retain both models' provenance. Manifest entries stay at 37; pack credits change from 15 to 14. Model counts remain 14 at Low and 18 at High.

The authorised credits generator rewrote `data/credits.js` and the ASSETS credits table. The ambient importer now writes its bench to the canonical folder and preserves the desk's source section. Reproduction from the actual two owner archives confirms unchanged desk bytes/source, the shipped bench hash, no old folder, and stable manifest/source on a second run.

All 21 existing cases pass across `assets`, `credits`, `fpassets` and `fpambientassets`; generated credits check, JS syntax and Python syntax pass. The first credits check was denied a nested Node spawn by the sandbox; its failed log is retained separately, followed by a successful run with execution/network access enabled. No rendered geometry, material, texture, model count or behaviour changed, so no new frame-rate claim is made. C-52's current-pilot validation candidate will include this pushed branch.

This branch starts at pilot `9105e301`. Only this `codex/` branch is pushed; no branch merge, protected push, raw archive shipment or automation change.
