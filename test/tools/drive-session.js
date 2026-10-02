#!/usr/bin/env node
/*
 * A recorded drive, for reviewing the driving by eye: Road Hazards (or a route-day leg) with the town's traffic live,
 * driven by the test autopilot, a screenshot every few seconds of game time and a log of what happened (violations,
 * car contacts with the van, cars stuck, the autopilot's own status). Not a pass/fail test: it is what a reviewer
 * watches.
 *
 *   QA_BROWSER=/path/to/chrome node test/tools/drive-session.js <outDir> [m1-driving|leg] [seconds] [everySec]
 */
'use strict';
const path = require('path');
const fs = require('fs');
const puppeteer = require(path.join(__dirname, '..', 'node_modules', 'puppeteer-core'));
const OUT = process.argv[2] || '.';
const KIND = process.argv[3] || 'm1-driving';
const SECONDS = Number(process.argv[4] || 240);
const EVERY = Number(process.argv[5] || 8);
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const b = await puppeteer.launch({ executablePath: process.env.QA_BROWSER || '/opt/pw-browsers/chromium', headless: 'new', args: ['--no-sandbox', '--allow-file-access-from-files', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage();
  await p.setViewport({ width: 1280, height: 720 });
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  const url = 'file://' + path.resolve(__dirname, '..', '..', 'index.html') + (KIND === 'm1-driving' ? '?scenario=m1-driving&dev=1' : '?lab=town&dev=1');
  await p.goto(url);
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  const t0 = Date.now();
  while (!(await p.evaluate(() => window.OTR && OTR.game && OTR.game.scene.getScenes(true).some(s => /Driv/.test(s.sys.settings.key)))) && Date.now() - t0 < 30000) await wait(200);
  await wait(1500);
  await p.keyboard.press('Enter');
  await wait(800);
  await p.addScriptTag({ path: path.join(__dirname, '..', 'paths', 'lib', 'autodrive.browser.js') });
  await p.evaluate(() => {
    OTR.game.loop.sleep();
    window.__t = performance.now();
    window.__step = (n) => { for (let k = 0; k < n; k++) { window.__t += 1000 / 60; OTR.game.step(window.__t, 1000 / 60); } };
    // logic only, no drawing: the scenes' own update (and their tweens and timers), much faster under a software renderer
    window.__stepFast = (n) => { const sc = OTR.game.scene.getScenes(true).find(x => /Driv/.test(x.sys.settings.key)); for (let k = 0; k < n; k++) { window.__t += 1000 / 60; sc.sys.step(window.__t, 1000 / 60); } };
    const s = OTR.game.scene.getScenes(true).find(x => /Driv/.test(x.sys.settings.key));
    window.__S = s;
    s.buckled = true;
    s.peds.forEach(q => { q.t = 1e9; q.crossing = false; });
    const bot = QA_AUTODRIVE.create(s);
    window.__bot = bot;
    window.__log = [];
    const v0 = s.violation.bind(s);
    s.violation = (key, label, ...r) => { window.__log.push({ t: +s.elapsed.toFixed(1), what: 'violation', key, label }); return v0(key, label, ...r); };
    let target = null;
    s.events.on('update', (t, d) => {
      if (s.finished) return;
      if (s.lightsWanted && !s.lights) s.lights = true;
      const stop = s.activeStop;
      if (stop && stop !== target && !s.parked) { target = stop; bot.goTo(stop.lot); window.__log.push({ t: +s.elapsed.toFixed(1), what: 'heading for', to: stop.lot.number + ' ' + stop.lot.street }); }
      bot.tick(Math.min(d, 50) / 1000);
      if (bot.status === 'arrived') { bot.status = 'parking'; s.held.Space = true; s.tryPark(); s.held.Space = false; }
    });
  });
  const frames = SECONDS * 60;
  let shot = 0;
  for (let f = 0; f < frames; f += 60) {
    const st = await p.evaluate(() => {
      const s = window.__S, V = OTR.vehicle, v = s.van, P = s.P;
      let touchFrames = 0;
      for (let k = 0; k < 60; k++) {
        try { __stepFast(1); } catch (e) { return { error: e.stack }; }
        const ob = V.obbOf(v);
        s.cars.forEach((c, i) => {
          if (!V.sat(ob, { c: { x: c.x, y: c.y }, f: { x: Math.cos(c.heading), y: Math.sin(c.heading) }, rt: { x: -Math.sin(c.heading), y: Math.cos(c.heading) }, hl: c.hl, hw: c.hw })) return;
          touchFrames++;
          if (!c.__logged || s.elapsed - c.__logged > 3) { c.__logged = s.elapsed; window.__log.push({ t: +s.elapsed.toFixed(1), what: 'car touching the van', n: `car ${i} at ${Math.round(c.speed)} px/s${c.turn ? ' mid-turn' : ''}, van ${V.mph(v).toFixed(1)} mph, car off ${Math.round(c.off || 0)}` }); }
        });
      }
      const vb = V.obbOf(v);
      const touching = s.cars.filter(c => !!V.sat(vb, { c: { x: c.x, y: c.y }, f: { x: Math.cos(c.heading), y: Math.sin(c.heading) }, rt: { x: -Math.sin(c.heading), y: Math.cos(c.heading) }, hl: c.hl, hw: c.hw })).length;
      const stuck = s.cars.filter(c => c.speed < 1).length;
      return { t: +s.elapsed.toFixed(0), mph: +V.mph(v).toFixed(1), bot: window.__bot.status, touching, stuck, finished: !!s.finished };
    });
    if (st.error) { console.log('ERROR in the game:', st.error); break; }
    if ((f / 60) % EVERY === 0) { await p.evaluate(() => __step(1)); await p.screenshot({ path: path.join(OUT, `drive-${String(shot++).padStart(3, '0')}-t${st.t}.png`) }); }
    if (st.finished || /^failed/.test(st.bot)) { console.log('end:', JSON.stringify(st)); break; }
  }
  const log = await p.evaluate(() => window.__log);
  fs.writeFileSync(path.join(OUT, 'drive-log.json'), JSON.stringify({ log, errors: errs }, null, 1));
  console.log(log.map(l => `${l.t}s ${l.what} ${l.label || l.to || l.n || ''}`).join('\n'));
  console.log('page errors:', errs.length ? errs.join(' / ') : 'none');
  await b.close();
})();
