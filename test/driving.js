#!/usr/bin/env node
/*
 * The driving rules added with the drive aids (src/scenes/shift/driveAids.js) and the stop-sign rules, checked in the
 * town lab (index.html?lab=town) with the van placed and driven by script:
 *   - pulling away without the mirrors (M) is a violation; with them it is a tick
 *   - parking with and without the parking brake
 *   - following too closely
 *   - the ambulance on a route day: still driving as it passes is a violation; pulled in and stopped is right
 *   - stop signs: a slow roll through is caught, a proper stop turns the sign green
 *
 *   QA_BROWSER=/path/to/chrome node test/driving.js
 */
'use strict';
const path = require('path');
let puppeteer;
try { puppeteer = require('puppeteer-core'); } catch (e) { console.error('puppeteer-core is missing. Run:  cd test && npm install'); process.exit(2); }
const BROWSER = process.env.QA_BROWSER || '/opt/pw-browsers/chromium';
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html') + '?lab=town&dev=1';

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
  const fresh = async () => {
    await p.goto(URL);
    await p.waitForFunction(() => window.OTR && OTR.game && OTR.game.scene.isActive('TownDriveScene'), { timeout: 30000 });
    await wait(1200);
    await ev(() => { const s = OTR.game.scene.getScene('TownDriveScene'); s.buckled = true; s.lights = true; s.cars.forEach(c => c.img.destroy()); s.cars.length = 0; s.peds.forEach(q => { q.t = 1e9; q.crossing = false; }); });
  };
  /** Drive by setting the van's speed each frame (m/s) along a fixed heading, for ms of real time. */
  const cruise = (mps, ms, o) => ev((mps, ms, o) => new Promise(res => {
    const s = OTR.game.scene.getScene('TownDriveScene'), v = s.van;
    const f = () => { v.u = mps; v.lat = 0; v.r = 0; if (o && o.heading !== undefined) v.heading = o.heading; if (o && o.y !== undefined) v.y = o.y; };
    s.events.on('postupdate', f);
    setTimeout(() => { s.events.off('postupdate', f); res(); }, ms);
  }), mps, ms, o || null);
  const state = () => ev(() => { const s = OTR.game.scene.getScene('TownDriveScene'); return { v: s.violations, items: s.log.items.map(i => i.label) }; });

  try {
    /* ---- mirrors before pulling out */
    await fresh();
    await cruise(3, 1500, { heading: 0 });
    let st = await state();
    check(st.v.mirror === 1, 'pulling away without the mirrors is a violation');
    await fresh();
    await p.keyboard.press('KeyM'); await wait(200);
    const insets = await ev(() => OTR.game.scene.getScene('TownDriveScene').insetCams.left.visible);
    await cruise(3, 1500, { heading: 0 });
    st = await state();
    check(!st.v.mirror && st.items.includes('Checked the mirrors before pulling out') && insets, 'M shows the mirrors, and pulling away after it is a tick');

    /* ---- parking brake: park at the first stop's bay, with and without SPACE */
    for (const brake of [false, true]) {
      await fresh();
      const r = await ev((brake) => {
        const s = OTR.game.scene.getScene('TownDriveScene'), v = s.van, lot = s.activeStop.lot, street = s.T.hy[lot.row];
        // parked in the kerb lane, alongside, facing with the traffic, the body centre on the bay
        const heading = lot.side > 0 ? 0 : Math.PI;
        v.heading = heading; v.u = 0; v.lat = 0; v.r = 0;
        const off = OTR.vehicle.bodyCentre(v); v.x += lot.park.x - off.x; v.y += (street + lot.side * (OTR.townArt.ROAD / 2 - v.g.hw * s.P - 8)) - off.y;
        s.pullOut.pending = false;
        if (brake) s.spaceAt = s.elapsed;
        s.tryPark();
        const it = s.log.items.find(i => i.label === 'Set the parking brake before leaving the seat');
        return { parkedOrDone: !!it, got: it && it.got };
      }, brake);
      check(r.parkedOrDone && r.got === (brake ? 1 : 0), `parking ${brake ? 'with' : 'without'} the parking brake scores ${brake ? 1 : 0}`);
    }

    /* ---- following distance: a car 10 m ahead, both at 20 mph, for 5 s */
    await fresh();
    await ev(() => {
      const s = OTR.game.scene.getScene('TownDriveScene'), v = s.van;
      s.pullOut.pending = false; v.heading = 0;
      s.stepCars = () => {};                   // a scripted car ahead: the traffic AI stays out of it
      const img = s.add.image(0, 0, OTR.art.carTop(s, 0x3DA5FF)).setDepth(28).setScale(0.7, 0.88);
      const bc = OTR.vehicle.bodyCentre(v);
      const car = { img, x: bc.x + v.g.hl * s.P + 47.5 + 180, y: bc.y, heading: 0, speed: 0, hl: 47.5, hw: 19.5, fake: true };
      s.cars.push(car);
      s.events.on('postupdate', () => { car.x = OTR.vehicle.bodyCentre(v).x + v.g.hl * s.P + 47.5 + 180; car.y = OTR.vehicle.bodyCentre(v).y; img.setPosition(car.x, car.y); });
    });
    await cruise(9, 14000, { heading: 0 });          // headless game time runs at about a third of real time
    st = await state();
    check(st.v.tailgate >= 1, 'following 9 m behind at 20 mph is tailgating');

    /* ---- the ambulance (route day): keep driving, then pull over */
    for (const pull of [false, true]) {
      await fresh();
      await ev(() => {
        const s = OTR.game.scene.getScene('TownDriveScene');
        OTR.save.data.shift = { route: [{ done: true }, { done: false }], emergencyDone: false };
        s.shiftMode = true; s.pullOut.pending = false; s.elapsed = 20;
        s.van.heading = 0; s.van.x = 1485;          // just past a junction: a straight block ahead
      });
      const y0 = await ev(() => OTR.game.scene.getScene('TownDriveScene').van.y);
      await cruise(7, 2500, { heading: 0, y: y0 });
      const spawned = await ev(() => !!OTR.game.scene.getScene('TownDriveScene').ambulance);
      if (pull) {
        // pull in to the right-hand curb and stop
        await ev(() => { const s = OTR.game.scene.getScene('TownDriveScene'), v = s.van, R = OTR.townArt.ROAD / 2; const line = s.T.hy.reduce((b, l) => (Math.abs(l - v.y) < Math.abs(b - v.y) ? l : b), s.T.hy[0]); v.y = line + (R - v.g.hw * s.P - 12); v.u = 0; });
        await cruise(0, 12000, { heading: 0 });
      } else {
        await cruise(7, 9000, { heading: 0, y: y0 });
      }
      st = await state();
      if (pull) check(spawned && !st.v.emergency && st.items.includes('Pulled over and stopped for an emergency vehicle'), 'pulled in and stopped for the ambulance: right');
      else check(spawned && st.v.emergency === 1, 'still driving as the ambulance passes: a violation');
    }

    /* ---- stop signs: a slow roll is caught; a stop behind the line turns green */
    await fresh();
    const sign = await ev(() => { const s = OTR.game.scene.getScene('TownDriveScene'); const it = s.T.inters.find(i => i.stop && i.x > 1000); return { x: it.x, y: it.y }; });
    // van.x such that the front bumper is 100 px short of the stop line (findApproach measures from v.x plus the nose)
    await ev((sign) => { const s = OTR.game.scene.getScene('TownDriveScene'), v = s.van; s.pullOut.pending = false; v.heading = 0; v.x = sign.x - 105 - v.g.nose * s.P - 58 - 100; v.y = sign.y + 52; }, sign);
    await cruise(1, 9000, { heading: 0, y: sign.y + 52 });
    st = await state();
    check(st.v.rolling === 1, 'rolling through a stop sign at 2 mph is caught');
    await fresh();
    // stopped with the bumper 40 px behind the line
    await ev((sign) => { const s = OTR.game.scene.getScene('TownDriveScene'), v = s.van; s.pullOut.pending = false; v.heading = 0; v.x = sign.x - 105 - v.g.nose * s.P - 58 - 40; v.y = sign.y + 52; v.u = 0; }, sign);
    await cruise(0, 3500, { heading: 0, y: sign.y + 52 });
    const green = await ev(() => { const s = OTR.game.scene.getScene('TownDriveScene'); return { stopped: s.approach && s.approach.stopped, hint: s._hint }; });
    check(green.stopped && /look both ways/.test(green.hint || ''), `a stop behind the line turns the sign green: ${JSON.stringify(green)}`);

    check(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.join(' / ') : ''));
  } catch (e) {
    check(false, 'script error: ' + (e && e.stack || e));
  } finally {
    await browser.close();
  }
  console.log(fails.length ? `\n${fails.length} failed` : '\nall driving checks passed');
  process.exit(fails.length ? 1 : 0);
})();
