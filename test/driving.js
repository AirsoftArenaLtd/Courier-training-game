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
    // until the van is well past the line, however slowly the headless clock runs
    for (let n = 0; n < 12; n++) {
      await cruise(1, 3000, { heading: 0, y: sign.y + 52 });
      if (await ev((sign) => OTR.game.scene.getScene('TownDriveScene').van.x > sign.x, sign)) break;
    }
    st = await state();
    check(st.v.rolling === 1, 'rolling through a stop sign at 2 mph is caught');
    await fresh();
    // stopped with the bumper 40 px behind the line
    await ev((sign) => { const s = OTR.game.scene.getScene('TownDriveScene'), v = s.van; s.pullOut.pending = false; v.heading = 0; v.x = sign.x - 105 - v.g.nose * s.P - 58 - 40; v.y = sign.y + 52; v.u = 0; }, sign);
    await cruise(0, 3500, { heading: 0, y: sign.y + 52 });
    const green = await ev(() => { const s = OTR.game.scene.getScene('TownDriveScene'); return { stopped: s.approach && s.approach.stopped, hint: s._hint }; });
    check(green.stopped && /look both ways/.test(green.hint || ''), `a stop behind the line turns the sign green: ${JSON.stringify(green)}`);

    /* ---- the indicators: Q left, E right, the same key cancels; turns and pull-outs are judged on them */
    await fresh();
    await p.keyboard.press('KeyE'); await wait(150);
    const sig1 = await ev(() => OTR.game.scene.getScene('TownDriveScene').signal);
    await p.keyboard.press('KeyE'); await wait(150);
    const sig2 = await ev(() => OTR.game.scene.getScene('TownDriveScene').signal);
    await p.keyboard.press('KeyQ'); await wait(400);
    const sig3 = await ev(() => { const s = OTR.game.scene.getScene('TownDriveScene'); return { sig: s.signal, lamps: s.blinkLamps.length === 2 }; });
    check(sig1 === 'right' && sig2 === null && sig3.sig === 'left' && sig3.lamps, `E signals right, E again cancels, Q signals left (${sig1}, ${sig2}, ${sig3.sig})`);
    // pulling out with the left indicator and the mirrors: both ticks
    await p.keyboard.press('KeyM'); await wait(150);
    await cruise(3, 1500, { heading: 0 });
    st = await state();
    check(!st.v.signal && st.items.includes('Signaled before pulling out'), 'pulling out with the left indicator on is a tick');
    await fresh();
    await p.keyboard.press('KeyM'); await wait(150);
    await cruise(3, 1500, { heading: 0 });
    st = await state();
    check(st.v.signal === 1, 'pulling out without signaling is a violation');
    // a turn at a junction: judged as the van leaves it, against the indicator it went in with
    const turns = await ev(() => {
      const s = OTR.game.scene.getScene('TownDriveScene'), v = s.van, out = [];
      const judge = (h0, h1, sig, sigFor) => { const n0 = s.violations.signal || 0; v.heading = h1; s.judgeSignal({ heading0: h0, sig, sigFor }); s.lastViolationAt.signal = -99; return (s.violations.signal || 0) - n0; };
      out.push(judge(0, Math.PI / 2, null, 0));        // right, no signal
      out.push(judge(0, Math.PI / 2, 'right', 2));     // right, signalled
      out.push(judge(0, -Math.PI / 2, 'right', 2));    // left, wrong indicator
      out.push(judge(0, Math.PI / 2, 'right', 0.3));   // right, too late
      out.push(judge(0, 0.1, null, 0));                // straight on: nothing needed
      return out;
    });
    check(JSON.stringify(turns) === '[1,0,1,1,0]', `turns: unsignalled, wrong side or late are violations; signalled or straight on are not (${turns})`);

    /* ---- pulled over means the right-hand curb: the left-hand one (the wrong side) doesn't count */
    await fresh();
    const curbs = await ev(() => {
      const s = OTR.game.scene.getScene('TownDriveScene'), v = s.van, R = OTR.townArt.ROAD / 2, P = s.P;
      const line = s.T.hy[1]; v.heading = 0; v.u = 0;
      const at = (y) => { const bc = OTR.vehicle.bodyCentre(v); v.y += y - bc.y; return OTR.driveAids.axis(s).gap; };
      return { right: at(line + R - v.g.hw * P - 10), left: at(line - R + v.g.hw * P + 10) };
    });
    check(curbs.right < 1 && curbs.left > 50, `the right-hand curb counts as pulled over, the left-hand one doesn't (${JSON.stringify(curbs)})`);

    /* ---- traffic keeps to a school zone's limit */
    await fresh();
    const school = await ev(() => new Promise(res => {
      const s = OTR.game.scene.getScene('TownDriveScene'), T = s.T, z = T.spec.schoolZone;
      if (!z) { res(null); return; }
      const c = s.cars[0];
      c.h = true; c.dir = 1; c.row = z.row; c.turn = null; c.off = 0; c.wait = 0; c.holding = null;
      c.x = (T.vx[z.from] + T.vx[z.from + 1]) / 2 - 150; c.y = T.laneY(z.row, 1); c.heading = 0; c.speed = 100; c.maxSpeed = 215;
      s.cars.slice(1).forEach(o => { o.x = -9999; o.y = -9999; o.speed = 0; o.wait = 99; });
      let top = 0;
      const f = () => { if (T.inSchoolZone(c.x, c.y)) top = Math.max(top, c.speed); };
      s.events.on('postupdate', f);
      setTimeout(() => { s.events.off('postupdate', f); res({ topMph: top / s.P * OTR.vehicle.MPH, limit: T.spec.schoolLimit }); }, 6000);
    }));
    check(!school || school.topMph <= school.limit + 0.5, `traffic keeps to the school zone's limit (${school && school.topMph.toFixed(1)} in a ${school && school.limit})`);

    /* ---- a four-way stop: the van got there first, so the car waits while it goes */
    await fresh();
    const fourWay = await ev(() => {
      const s = OTR.game.scene.getScene('TownDriveScene'), T = s.T, it = T.inters.find(i => i.stop && i.col > 0 && i.row > 0), R = OTR.townArt.ROAD / 2;
      const c = s.cars[0];
      s.approach = { it, dir: 'W', stopped: true, stoppedAt: 1, entered: false };
      c.cleared = it; c.stoppedAt = 5;                  // the car stopped at its own line after the van
      const v = s.van; v.u = 2;                          // the van pulling away into the junction
      const before = s.vanHasJunction(it, c);
      c.stoppedAt = 0.5;                                 // had the car stopped first, it goes first
      const after = s.vanHasJunction(it, c);
      return { vanFirst: before, carFirst: after };
    });
    check(fourWay.vanFirst === true && fourWay.carFirst === false, `four-way stop: first to stop goes first, the van included (${JSON.stringify(fourWay)})`);

    /* ---- the following-distance readout */
    await fresh();
    await ev(() => {
      const s = OTR.game.scene.getScene('TownDriveScene'), v = s.van;
      s.pullOut.pending = false; v.heading = 0;
      s.stepCars = () => {};
      const img = s.add.image(0, 0, OTR.art.carTop(s, 0x3DA5FF)).setDepth(28).setScale(0.7, 0.88);
      const car = { img, x: 0, y: 0, heading: 0, speed: 0, hl: 47.5, hw: 19.5, fake: true };
      s.cars.length = 0; s.cars.push(car);
      s.events.on('postupdate', () => { const bc = OTR.vehicle.bodyCentre(v); car.x = bc.x + v.g.hl * s.P + 47.5 + 300; car.y = bc.y; img.setPosition(car.x, car.y); });
    });
    await cruise(9, 3000, { heading: 0 });
    const gapShown = await ev(() => { const s = OTR.game.scene.getScene('TownDriveScene'); return { on: s.gapPill.visible, text: s.gapText.text }; });
    check(gapShown.on && /^\d+\.\d s behind$/.test(gapShown.text), `the following distance shows beside the speedometer ("${gapShown.text}")`);

    /* ---- trees are solid */
    await fresh();
    const tree = await ev(() => new Promise(res => {
      const s = OTR.game.scene.getScene('TownDriveScene'), v = s.van, P = s.P;
      const t = s.blockers.find(b => b.what === 'a tree');
      s.pullOut.pending = false; v.heading = 0; v.u = 0;
      const bc = OTR.vehicle.bodyCentre(v); v.x += (t.x - 140) - bc.x; v.y += (t.y + t.h / 2) - bc.y;
      const f = () => { v.u = Math.max(v.u, 3); v.lat = 0; v.r = 0; v.heading = 0; };
      s.events.on('postupdate', f);
      setTimeout(() => {
        s.events.off('postupdate', f);
        const front = OTR.vehicle.point(v, v.g.nose, 0).x;
        res({ front: Math.round(front), trunk: t.x, hit: s.log.items.some(i => /a tree/.test(i.label)) || (s.violations.crash || 0) > 0 });
      }, 5000);
    }));
    check(tree.front <= tree.trunk + 2, `driving into a tree stops at its trunk (front ${tree.front}, trunk ${tree.trunk})`);

    check(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.join(' / ') : ''));
  } catch (e) {
    check(false, 'script error: ' + (e && e.stack || e));
  } finally {
    await browser.close();
  }
  console.log(fails.length ? `\n${fails.length} failed` : '\nall driving checks passed');
  process.exit(fails.length ? 1 : 0);
})();
