#!/usr/bin/env node
/*
 * B-105: the owner's review links. index.html?dev=1&workday3d=1&user=review-<name>&route=10&day=4 starts the 3D workday
 * from the hub on route 10, counted as day 4, on that review profile only; the same link for an ordinary profile changes
 * nothing. B-117: the checklist's day-5 (route 11, a check-in radio call) and day-6 (route 9, night) links open those days.
 * B-174: set 10's links: route 1 on day 3 at High (traffic) and route 5 on day 4 (a business reception).
 *
 *   QA_BROWSER=/path/to/chrome node test/devdaybrowser.js
 */
'use strict';
const path = require('path');
const pp = require('puppeteer-core');
const BROWSER = process.env.QA_BROWSER || '/opt/pw-browsers/chromium';
const wait = (ms) => new Promise(r => setTimeout(r, ms));
let checks = 0;
const fails = [];
const check = (ok, what) => { checks++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) fails.push(what); };

(async () => {
  const b = await pp.launch({ executablePath: BROWSER, headless: true, args: ['--no-sandbox', '--allow-file-access-from-files', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const errors = [];
  try {
    const open = async (user, route = 10, day = 4, extra = '') => {
      const p = await b.newPage();
      await p.setViewport({ width: 1280, height: 720 });
      p.on('pageerror', e => errors.push(e.message));
      await p.goto('file://' + path.resolve(__dirname, '..', 'index.html') + `?dev=1&workday3d=1&user=${user}&name=Owner&route=${route}&day=${day}${extra}`);
      const until = async (src, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await p.evaluate(src).catch(() => false)) return true; await wait(200); } return false; };
      return { p, until };
    };
    // a review profile: the hub sets route 10, day 4
    {
      const { p, until } = await open('review-day4');
      check(await until(`OTR.game.scene.isActive('HubScene') || OTR.game.scene.isActive('TitleScene')`, 30000), 'the game opens');
      if (await p.evaluate(`OTR.game.scene.isActive('TitleScene')`)) { await p.evaluate(() => { const m = OTR.game.scene; m.getScenes(true).forEach(s => m.stop(s.sys.settings.key)); m.start('HubScene'); }); }
      await until(`OTR.game.scene.isActive('HubScene')`, 10000); await wait(800);
      const st = await p.evaluate(() => ({ dev: OTR.workday.devDay(), seq: OTR.fpStore.read().sequence, days: OTR.save.data.route && OTR.save.data.route.days }));
      check(st.dev && st.dev.route === 10 && st.dev.day === 4, 'the review link is read: route 10, day 4');
      check(st.seq === 9 && st.days === 3, `the next workday is route 10 on day 4 (sequence ${st.seq}, days ${st.days})`);
      // start it from the hub as the owner would
      await p.evaluate(() => { const s = OTR.game.scene.getScene('HubScene'); const f = s.focusables.find(o => o.label && /Start workday/.test(OTR.i18n.src(o.label))); if (f) f.press(); });
      await wait(800);
      await p.evaluate(() => { const st = OTR.game.scene.getScene('HubScene')._modalStack || []; const top = st[st.length - 1]; const walk = (c) => { for (const o of c.list || []) { if (o.press && o.label && /^Start/.test(OTR.i18n.src(o.label))) { o.press(); return true; } if (walk(o)) return true; } return false; }; if (top) walk(top); });
      check(await until(`!!(OTR.game.scene.isActive('FirstPersonScene') && OTR.game.scene.getScene('FirstPersonScene').model)`, 120000), 'Start workday opens the 3D day');
      const m = await p.evaluate(() => { const m = OTR.game.scene.getScene('FirstPersonScene').model; return { seed: m.seed, day: m.routePlan && m.routePlan.day }; });
      check(m.seed === 10 && m.day === 4, `it is route 10 on day 4 (seed ${m.seed}, day ${m.day})`);
      await p.close();
    }
    // B-117: the checklist's other two links (B-107): day 5 brings a check-in radio call, day 6 runs at night
    for (const [route, day, want, extra] of [[11, 5, 'checkin'], [9, 6, 'night'], [1, 3, 'traffic', '&gfx=high'], [5, 4, 'reception']]) {
      const { p, until } = await open('review-' + want, route, day, extra || '');
      await until(`OTR.game.scene.isActive('HubScene') || OTR.game.scene.isActive('TitleScene')`, 30000);
      if (await p.evaluate(`OTR.game.scene.isActive('TitleScene')`)) { await p.evaluate(() => { const m = OTR.game.scene; m.getScenes(true).forEach(s => m.stop(s.sys.settings.key)); m.start('HubScene'); }); }
      await until(`OTR.game.scene.isActive('HubScene')`, 10000); await wait(800);
      await p.evaluate(() => { const s = OTR.game.scene.getScene('HubScene'); const f = s.focusables.find(o => o.label && /Start workday/.test(OTR.i18n.src(o.label))); if (f) f.press(); });
      await wait(800);
      await p.evaluate(() => { const st = OTR.game.scene.getScene('HubScene')._modalStack || []; const top = st[st.length - 1]; const walk = (c) => { for (const o of c.list || []) { if (o.press && o.label && /^Start/.test(OTR.i18n.src(o.label))) { o.press(); return true; } if (walk(o)) return true; } return false; }; if (top) walk(top); });
      check(await until(`!!(OTR.game.scene.isActive('FirstPersonScene') && OTR.game.scene.getScene('FirstPersonScene').model)`, 120000), `the day-${day} link starts the 3D day`);
      const m = await p.evaluate(() => { const m = OTR.game.scene.getScene('FirstPersonScene').model, d = OTR.fpRadio && OTR.fpRadio.descriptor(m);
        return { seed: m.seed, day: m.routePlan && m.routePlan.day, call: d && d.kind, time: OTR.fpLighting.time(m), lights: !!m.nightDrive && OTR.fpNight.required(m),
          traffic: !!(OTR.fpTraffic && OTR.fpTraffic.enabled(m)), gfx: OTR.gfx.level(), kinds: (m._deliverySpecs || []).map(a => (a.protocol && a.protocol.kind) || '-').join(',') }; });
      check(m.seed === route && m.day === day, `it is route ${route} on day ${day} (seed ${m.seed}, day ${m.day})`);
      if (want === 'checkin') check(m.call === 'checkin', `day ${day} brings a check-in radio call, as the checklist says (${m.call})`);
      else if (want === 'night') check(m.time === 'night' && m.lights, `day ${day} runs at night with the headlights required, as the checklist says (${m.time}, ${m.lights})`);
      else if (want === 'traffic') check(m.traffic && m.gfx === 'high', `set 10's materials link: day ${day} has traffic, at High graphics (${m.traffic}, ${m.gfx})`);
      else check(m.kinds.split(',').includes('reception'), `set 10's people link: day ${day} has a business reception (stops: ${m.kinds})`);
      await p.close();
    }
    // an ordinary profile: the same link changes nothing
    {
      const { p, until } = await open('sam');
      await until(`OTR.game.scene.isActive('HubScene') || OTR.game.scene.isActive('TitleScene')`, 30000); await wait(800);
      const st = await p.evaluate(() => ({ dev: OTR.workday.devDay(), seq: OTR.fpStore.read().sequence, days: (OTR.save.data.route || {}).days || 0 }));
      check(!st.dev && st.seq === 0 && st.days === 0, `an ordinary profile is left as it was (sequence ${st.seq}, days ${st.days})`);
      await p.close();
    }
    check(!errors.length, 'no page errors ' + errors.slice(0, 2).join(' | '));
  } finally { await b.close(); }
  console.log(fails.length ? `\n${fails.length} of ${checks} review-link checks failed` : `\n${checks} review-link checks passed`);
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
