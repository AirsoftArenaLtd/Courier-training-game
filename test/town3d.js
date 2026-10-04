#!/usr/bin/env node
/*
 * Phase 2 graphics in the town drive (index.html?lab=town), checked by script:
 *   - the fake-3D town (src/core/b3d.js): walls are drawn, roofs lean away from the middle of the screen, nothing
 *     moves on the low graphics setting
 *   - the light map (src/core/lighting.js): only after dark; the van's headlights light the road ahead of it
 *   - weather on the ground (src/core/wx.js): puddles and wet roads in rain, snow on the lawns, fog round the screen
 *   - people on the sidewalks (src/core/people.js): they move, they stay on the sidewalk, and driving into one is a
 *     violation
 *   - the cab view (src/core/cab.js): V opens it (three.js loads and draws), V again goes back
 *   - no page errors anywhere
 *
 *   QA_BROWSER=/path/to/chrome node test/town3d.js
 */
'use strict';
const path = require('path');
let puppeteer;
try { puppeteer = require('puppeteer-core'); } catch (e) { console.error('puppeteer-core is missing. Run:  cd test && npm install'); process.exit(2); }
const BROWSER = process.env.QA_BROWSER || '/opt/pw-browsers/chromium';
const BASE = 'file://' + path.resolve(__dirname, '..', 'index.html') + '?lab=town&dev=1';

const fails = [];
const check = (ok, what) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) fails.push(what); };
const wait = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({ executablePath: BROWSER, headless: 'new', args: ['--no-sandbox', '--allow-file-access-from-files', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await browser.newPage();
  await p.setViewport({ width: 1280, height: 720 });
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  const ev = (f, ...a) => p.evaluate(f, ...a);
  const open = async (q) => {
    await p.goto(BASE + (q || ''));
    await p.waitForFunction(() => window.OTR && OTR.game && OTR.game.scene.isActive('TownDriveScene'), { timeout: 30000 });
    await wait(1200);
  };
  try {
    // ---- the 3D town
    await open('');
    const city = await ev(() => {
      const s = OTR.game.scene.getScene('TownDriveScene'), C = s.city, cam = s.cameras.main.worldView;
      // the building furthest from the middle of the screen, among those drawn
      const seen = C.items.filter(b => b.img.visible);
      const far = seen.sort((a, b) => Math.hypot(b.ax - cam.centerX, b.ay - cam.centerY) - Math.hypot(a.ax - cam.centerX, a.ay - cam.centerY))[0];
      const out = far ? ((far.img.x - far.ax) * (far.ax - cam.centerX) + (far.img.y - far.ay) * (far.ay - cam.centerY)) : 0;
      return { items: C.items.length, trees: C.trees.length, walls: C.walls.commandBuffer.length, shadows: C.shadows.commandBuffer.length, out, seen: seen.length };
    });
    check(city.items > 20 && city.trees > 5, `the buildings and trees are in the 3D town (${city.items} buildings, ${city.trees} trees)`);
    check(city.walls > 100 && city.shadows > 100, `walls and ground shadows are drawn (${city.walls} / ${city.shadows} drawing commands)`);
    check(city.out > 0, 'a roof away from the middle of the screen leans further out, as a tall thing seen from above does');
    await open('&gfx=low');
    const low = await ev(() => { const C = OTR.game.scene.getScene('TownDriveScene').city; return { moved: C.items.filter(b => b.img.x !== b.ax || b.img.y !== b.ay).length, walls: C.walls.commandBuffer.length }; });
    // (a Graphics object always holds a few style commands of its own)
    check(low.moved === 0 && low.walls < 20, `low graphics: the roofs stay put and no walls are drawn (${JSON.stringify(low)})`);
    const lowNight = await (async () => { await open('&gfx=low&tod=night'); return ev(() => !!OTR.game.scene.getScene('TownDriveScene').lighting); })();
    check(!lowNight, 'low graphics: no light map at night (the flat darkening instead)');

    // ---- lighting
    await open('&tod=midday');
    check(await ev(() => !OTR.game.scene.getScene('TownDriveScene').lighting), 'no light map by day');
    await open('&tod=night');
    const beam = await ev(() => new Promise(res => {
      const s = OTR.game.scene.getScene('TownDriveScene'), L = s.lighting, V = OTR.vehicle, v = s.van;
      // the light map's brightness at a point 8 m ahead of the van
      const ahead = V.point(v, v.g.nose + 8, 0);
      const at = () => new Promise(r2 => L.rt.snapshotPixel(Math.round((ahead.x - L.vx) * L.z), Math.round((ahead.y - L.vy) * L.z), c => r2(c.r + c.g + c.b)));
      s.lights = false; s.drawLights();
      at().then(off => { s.lights = true; s.drawLights(); at().then(on => res({ ok: !!L, off, on, dark: L.dark })); });
    }));
    check(beam.ok && beam.dark > 0.4, `a light map at night (darkness ${beam.dark && beam.dark.toFixed(2)})`);
    check(beam.on > beam.off + 60, `the headlights light the road ahead (${beam.off} → ${beam.on})`);

    // ---- weather on the ground
    await open('&weather=rain');
    const rain = await ev(() => { const s = OTR.game.scene.getScene('TownDriveScene'); return { puddles: s.children.list.filter(o => o.texture && o.texture.key === 'wx_puddle').length, tint: s.roadTiles[0].tintTopLeft, ripples: s.wx.ripples.length }; });
    check(rain.puddles > 10 && rain.tint !== 0xFFFFFF && rain.ripples > 0, `rain: puddles, wet roads and ripples (${JSON.stringify(rain)})`);
    await open('&weather=snow');
    const snow = await ev(() => { const s = OTR.game.scene.getScene('TownDriveScene'); const t = s.lawnTiles[0]; return { lawn: (t.displayTexture || t.texture).key, covers: s.city.items.filter(b => b.cover).length }; });
    check(snow.lawn === 'td_lawn_snow' && snow.covers > 10, `snow: on the lawns and the roofs (${JSON.stringify(snow)})`);
    await open('&weather=fog');
    check(await ev(() => { const s = OTR.game.scene.getScene('TownDriveScene'); return !!(s.wx.fogImg && s.wx.fogImg.visible); }), 'fog closes in round the screen');

    // ---- people
    await open('');
    const ppl = await ev(() => new Promise(res => {
      const s = OTR.game.scene.getScene('TownDriveScene'), W = s.crowd.walkers;
      const start = W.map(w => w.d);
      let off = 0, samples = 0;
      const t0 = performance.now();
      const tick = () => {
        // the walkers' own positions, on screen or not (the drawn ones are where they are)
        W.forEach(w => { if (!w.img.visible) return; samples++; if (s.surfaceAt(w.img.x, w.img.y) !== 'sidewalk') off++; });
        if (performance.now() - t0 < 3000) requestAnimationFrame(tick);
        else res({ n: W.length, moved: W.filter((w, i) => w.d !== start[i]).length, off, samples, kinds: [...new Set(W.map(w => w.kind))].sort().join(',') });
      };
      tick();
    }));
    check(ppl.n >= 15 && ppl.moved >= ppl.n / 2, `people walk the sidewalks (${ppl.moved} of ${ppl.n} moved; ${ppl.kinds})`);
    check(ppl.off === 0, `and stay on them (${ppl.off} of ${ppl.samples} samples off the sidewalk)`);
    const hit = await ev(() => new Promise(res => {
      const s = OTR.game.scene.getScene('TownDriveScene'), w = s.crowd.walkers.find(x => x.kind !== 'jogger');
      // the van put on the sidewalk, rolling at a walker
      w.pause = 99;
      const V = OTR.vehicle, v = s.van;
      v.x = w.img.x; v.y = w.img.y; v.heading = w.img.rotation + Math.PI;
      const bc = V.bodyCentre(v); v.x += w.img.x - bc.x; v.y += w.img.y - bc.y;
      v.u = 1.5;
      setTimeout(() => res({ hit: !!(s.violations && s.violations.hitped), modal: !!s.incidentOpen }), 600);
    }));
    check(hit.hit && hit.modal, `driving into someone on the sidewalk is hitting a pedestrian (${JSON.stringify(hit)})`);

    // ---- the cab view
    await open('');
    await p.keyboard.press('KeyV');
    await p.waitForFunction(() => { const s = OTR.game.scene.getScene('TownDriveScene'); return s.cab && s.cab.on; }, { timeout: 30000 }).catch(() => {});
    await wait(800);
    const cab = await ev(() => { const s = OTR.game.scene.getScene('TownDriveScene'); return { on: !!(s.cab && s.cab.on), three: !!window.THREE, main: s.cameras.main.visible, cars: s.cab ? s.cab.cars.length : 0 }; });
    check(cab.on && cab.three && !cab.main, `V opens the cab view: three.js loads and draws it, the view from above is off (${JSON.stringify(cab)})`);
    // what the screen shows: sky at the top of the windscreen, not the top-down town
    const px = await ev(() => new Promise(res => OTR.game.renderer.snapshotPixel(300, 200, c => res([c.r, c.g, c.b]))));   // left of the messages, above the horizon
    check(px[2] > px[0] && px[2] > 150, `the windscreen shows the sky (${px})`);
    await p.keyboard.press('KeyV');
    await wait(400);
    check(await ev(() => { const s = OTR.game.scene.getScene('TownDriveScene'); return !s.cab.on && s.cameras.main.visible; }), 'V again goes back to the view from above');
  } catch (e) {
    check(false, 'script error: ' + (e && e.stack || e));
  }
  check(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  await browser.close();
  console.log(fails.length ? `\n${fails.length} failed` : '\nall town 3D checks passed');
  process.exit(fails.length ? 1 : 0);
})();
