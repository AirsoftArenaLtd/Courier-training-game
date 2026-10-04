#!/usr/bin/env node
/*
 * Route-day features around the stops (src/core/shift.js, driveAids, TownDriveScene, PostTripScene):
 *   - the bad-weather gear question after the briefing, and what it saves
 *   - the dispatch message: sent on the drive to its stop, buzzing, TAB at the wheel is a violation, P at the curb
 *     reads it (and the stop really changed)
 *   - a break (K at the curb): the clock moves on, it is on the record
 *   - an incident today puts an incident report into the post-trip
 *   - a quit mid-leg resumes where the van was, not at the stop it left
 * Each part sets the day up by script and then plays the real scenes with the real keys.
 *
 *   QA_BROWSER=/path/to/chrome node test/routeday.js
 */
'use strict';
const path = require('path');
const { runTalk } = require('./paths/lib/ui');
let puppeteer;
try { puppeteer = require('puppeteer-core'); } catch (e) { console.error('puppeteer-core is missing. Run:  cd test && npm install'); process.exit(2); }
const BROWSER = process.env.QA_BROWSER || '/opt/pw-browsers/chromium';
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html') + '?user=routeday&name=Route%20Tester';

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
  // (an expression that throws, because the game has not booted yet, is "not yet")
  const until = async (src, ms) => { const t0 = Date.now(); while (Date.now() - t0 < (ms || 15000)) { if (await p.evaluate(src).catch(() => false)) return true; await wait(150); } return false; };
  const boot = async () => {
    await p.goto(URL);
    await until('window.OTR && OTR.game && OTR.game.scene.isActive("TitleScene")', 30000);
    await wait(600);
  };

  try {
    await boot();
    await ev(() => { localStorage.clear(); });
    await boot();

    /* ---- a snow day: the gear question after the briefing */
    await ev(() => { OTR.save.data.day = 4; OTR.save.write(); OTR.shift.start(OTR.game.scene.getScene('TitleScene')); });
    check(await until('OTR.game.scene.isActive("ShiftBriefScene") && !!OTR.game.scene.getScene("ShiftBriefScene").talkCtl', 15000), 'the briefing started');
    check(await ev(() => OTR.shift.state.weather === 'snow'), 'day 4 is a snow day');
    await runTalk(p, `OTR.game.scene.getScene('ShiftBriefScene').talkCtl`, { timeout: 150000 });
    await wait(1500);
    // (the helper follows the scene's talk into the gear question, so it may be answered already)
    if (await ev(() => OTR.game.scene.isActive('ShiftBriefScene') && !OTR.game.scene.getScene('ShiftBriefScene')._ended)) {
      await runTalk(p, `OTR.game.scene.getScene('ShiftBriefScene').talkCtl`, { timeout: 60000 });
    }
    check(await until('OTR.shift.state && OTR.shift.state.log.items.some(i => i.label === "Dressed for the weather")', 8000), 'a snow day asks what you are wearing');
    check(await until('OTR.shift.state && OTR.shift.state.gear === "good"', 8000), 'the right gear is saved with the day');
    await until('OTR.game.scene.isActive("PreTripScene")', 15000);

    /* ---- the dispatch message: straight to the route (skipping pre-trip and loading) */
    const D = await ev(() => { const st = OTR.shift.state; st.phase = 'route'; st.truck = { defects: [], missed: [] }; OTR.shift.save(); return st.dispatch; });
    check(D && D.stop >= 0 && !D.sent, `a dispatch message is planned for stop ${D && D.stop + 1} (${D && D.kind})`);
    // make its stop the first one, so it fires on the first leg
    await ev(() => { const st = OTR.shift.state; const r = st.route.splice(st.dispatch.stop, 1)[0]; st.route.unshift(r); st.route.forEach((x, i) => { x.index = i + 1; }); st.dispatch.stop = 0; OTR.shift.save(); OTR.shift.go(OTR.game.scene.getScenes(true)[0]); });
    check(await until('OTR.game.scene.isActive("TownDriveScene")', 15000), 'the drive opened');
    await wait(800);
    await ev(() => { const s = OTR.game.scene.getScene('TownDriveScene'); s.buckled = true; s.lights = true; s.noEvents = true; s.cars.forEach(c => c.img.destroy()); s.cars.length = 0; s.elapsed = 13; });
    check(await until('OTR.shift.state.dispatch.sent', 10000), 'the message arrives on the drive to its stop');
    const changed = await ev(() => { const st = OTR.shift.state, stop = st.route[0].stop; return st.dispatch.kind === 'signature' ? stop.packages[0].service === 'signature' && stop.expected.outcome === 'exception' : stop.expected.spot === 'planter' && stop.props.some(x => x.id === 'planter'); });
    check(changed, 'the stop itself changed (service or the planter)');
    // TAB while moving
    await ev(() => new Promise(res => { const s = OTR.game.scene.getScene('TownDriveScene'), v = s.van; const f = () => { v.u = 5; }; s.events.on('postupdate', f); setTimeout(() => { s.events.off('postupdate', f); res(); }, 900); }));
    await ev(() => { OTR.game.scene.getScene('TownDriveScene').van.u = 5; });
    await p.keyboard.press('Tab');
    await wait(300);
    check(await ev(() => (OTR.game.scene.getScene('TownDriveScene').violations.handheld || 0) >= 1), 'TAB at the wheel with a message waiting is a violation');
    // pull in to the curb, stop, P
    await ev(() => { const s = OTR.game.scene.getScene('TownDriveScene'), v = s.van, R = OTR.townArt.ROAD / 2; v.u = 0; v.lat = 0; v.r = 0;
      const c = Math.cos(v.heading); const horiz = Math.abs(c) > 0.7; if (horiz) { v.heading = c > 0 ? 0 : Math.PI; const line = s.T.hy.reduce((b, l) => (Math.abs(l - v.y) < Math.abs(b - v.y) ? l : b), s.T.hy[0]); v.y = line + (c > 0 ? 1 : -1) * (R - v.g.hw * s.P - 10); }
      else { const sn = Math.sin(v.heading); v.heading = sn > 0 ? Math.PI / 2 : -Math.PI / 2; const line = s.T.vx.reduce((b, l) => (Math.abs(l - v.x) < Math.abs(b - v.x) ? l : b), s.T.vx[0]); v.x = line - (sn > 0 ? 1 : -1) * (R - v.g.hw * s.P - 10); } });
    await wait(600);
    await p.keyboard.press('KeyP');
    await wait(700);
    check(await ev(() => OTR.shift.state.dispatch.read === 'pulled over'), 'P at the curb reads the message');
    await wait(700);
    await p.keyboard.press('Enter');
    await until('!OTR.game.scene.getScene("TownDriveScene").incidentOpen', 4000);

    /* ---- a break: the clock says one is due; K at the curb takes it */
    await ev(() => { const st = OTR.shift.state; st.clockMin = 8 * 60 + 20 + 160; OTR.shift.save(); });
    await wait(800);
    check(await ev(() => { const s = OTR.game.scene.getScene('TownDriveScene'); return !!(s.breakBadge && s.breakBadge.visible); }), 'a break is due after 2.5 hours');
    const before = await ev(() => OTR.shift.state.clockMin);
    await p.keyboard.press('KeyK');
    await wait(700);
    const br = await ev(() => ({ breaks: OTR.shift.state.breaks, clock: OTR.shift.state.clockMin, logged: OTR.game.scene.getScene('TownDriveScene').log.items.some(i => i.label === 'Took a rest break on the route') }));
    check(br.breaks === 1 && br.clock === before + 10 && br.logged, `K at the curb: a ten-minute break, on the record (${JSON.stringify(br)})`);
    await p.keyboard.press('Enter'); await wait(600);

    /* ---- mid-leg resume: drive on, the position is saved; reload and the drive carries on from there */
    await ev(() => new Promise(res => { const s = OTR.game.scene.getScene('TownDriveScene'), v = s.van; const f = () => { v.u = 6; }; s.events.on('postupdate', f); setTimeout(() => { s.events.off('postupdate', f); v.u = 0; res(); }, 7000); }));
    await ev(() => { const s = OTR.game.scene.getScene('TownDriveScene'); s._legSavedAt = -99; });
    await wait(800);
    const saved = await ev(() => ({ x: OTR.shift.state.van && OTR.shift.state.van.x, mid: OTR.shift.state.midLeg }));
    await boot();
    await ev(() => OTR.shift.resume(OTR.game.scene.getScene('TitleScene')));
    await until('OTR.game.scene.isActive("TownDriveScene")', 15000);
    await wait(900);
    const back = await ev(() => ({ x: OTR.game.scene.getScene('TownDriveScene').van.x, pending: OTR.game.scene.getScene('TownDriveScene').pullOut.pending }));
    check(saved.mid && Math.abs(back.x - saved.x) < 2 && !back.pending, `a quit mid-leg resumes where the van was (${JSON.stringify({ saved, back })})`);

    /* ---- an incident puts an incident report in the post-trip */
    await ev(() => { const st = OTR.shift.state; st.route.forEach(r => { r.done = true; }); st.log.items.push({ cat: 'safety', got: -3, max: 0, label: 'Hit another vehicle', kind: 'penalty', where: { x: 0, y: 0, key: 'crash' } }); st.phase = 'posttrip'; OTR.shift.save(); OTR.shift.go(OTR.game.scene.getScene('TownDriveScene')); });
    check(await until('OTR.game.scene.isActive("PostTripScene")', 15000), 'the post-trip opened');
    await wait(800);
    const qs = await ev(() => OTR.game.scene.getScene('PostTripScene').qs.map(q => q.topic));
    check(qs[0] === 'INCIDENT REPORT' && qs.length === 4, `the post-trip starts with the incident report (${qs.join(', ')})`);

    check(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.join(' / ') : ''));
  } catch (e) {
    check(false, 'script error: ' + (e && e.stack || e));
  } finally {
    await browser.close();
  }
  console.log(fails.length ? `\n${fails.length} failed` : '\nall route-day checks passed');
  process.exit(fails.length ? 1 : 0);
})();
