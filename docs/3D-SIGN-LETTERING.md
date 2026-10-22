# Physical sign lettering

C-50 is ready for review on `codex/c50-physical-signs`, stacked on C-49 and carrying the accepted B-164 correction. Complete current-pilot evidence is in `docs/review/set-10/c50-acceptance/manifest.json`.

Street names, house numbers, STOP/YIELD, speed limits, school and closure legends, and the one-way legend are drawn inside the existing physical sign faces. Stop/street boards and regulatory signs have face borders. Their existing positions, shape cutouts, collision behavior and grading remain the same.

High rasterizes complete words at scene build, measures their actual font width and fits each line to its board without stretching the letters. It uses only C-49’s three spare 512-square cells. The five surface image tiles stay intact, and no fifth GPU texture is added. If every material image is missing, one scene-owned 2048×512 font atlas supplies the lettering instead. The browser uses its existing text renderer; no new font file is shipped.

Low uses original 5×7 bit glyphs for Latin capital letters and digits. Up to nine characters per row are packed three at a time in 18-bit values; two rows remain bounded per face. Constant vector components and constant glyph leaves work in the shared WebGL 1 context. No font image, canvas or additional GPU texture is allocated at Low. The project-made artwork table records this code’s provenance.

Two per-instance word attributes travel with the existing sign batches through main-view culling and all reflection passes. Exact main-view buffers are restored afterward. The lettering adds no triangle, draw, attachment or render pass. Build-time font drawing is bounded; compaction reuses its buffers. Owned materials and a fallback font atlas are disposed with the scene, while a borrowed material atlas stays with C-49’s owner.

Ordinary driving no longer shows the automatic floating sign paragraphs or address labels where physical numbered boards exist. The existing J reading key, including its remapped route, still selects a complete translated sentence in the fixed readable hint and narration. This retains larger text, colour filtering and reduced motion. Street names and local road legends stay on their physical boards; their meaning is available through the existing translated reading. Legacy practice-area labels are outside this change.

`test/fpsignlettering.js` covers all current town names and number/legend packing, Low glyph data, atlas ownership and existing shader hooks. `test/fptown.js` checks exact restoration of both word buffers with all four reflection passes. Native ink checks require a real centre-ray hit on each sign shape, compare on/off lettering pixels and require the off control image to stay exactly still, with identical mission snapshots and reports. They cover all eight lettered kinds at Low, High and with all five images returning 404. The remapped reading key and narration checks use translated assertions.

All 207 current-pilot resource views pass, together with157 native ink checks, 83 translated/remapped reading checks, 50 High town checks and 504 native layout views. The repository batch was 77/78; its sole route-dayclothing failure passes an unchanged isolated rerun, with both logs retained. A separate actual-Canvas capacity audit combines the vocabulary from400 towns into 42 unique words on four of eight rows while preserving all five material cells byte-for-byte.

No new scoring type, save field or shared setting is introduced. Earlier fixture diagnostics stay separately scoped. Source hashes, exact commands, profile figures and screenshots are retained in the final manifest. Cloud FPS cannot establish the owner’s Intel 60 fps floor.
