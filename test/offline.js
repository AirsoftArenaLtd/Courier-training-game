#!/usr/bin/env node
/*
 * The game with no internet: every request to anything but the training server is blocked (and the browser's name
 * lookups fail), then a new courier signs in, reaches the hub, starts the 3D workday and gets to the Dispatch brief.
 * Nothing the game needs may come from outside (scripts, fonts, images, sounds, data), no request may fail, and no
 * page error may appear. The list of outside requests the page tried is printed if there are any.
 *
 *   QA_BROWSER=/path/to/chrome node test/offline.js
 *
 * (docs/IT-NOTES.md lists what a company's network has to allow: only the training server itself.)
 */
'use strict';
const path = require('path');
const fs = require('fs');
const os = require('os');

const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'otr-offline-'));
process.env.OTR_DATA_DIR = DATA;
process.env.OTR_TRAINER_PIN = '4821';
const { server } = require('../server/server.js');
let puppeteer;
try { puppeteer = require('puppeteer-core'); } catch (e) { console.error('puppeteer-core is missing. Run:  cd test && npm install'); process.exit(2); }
const BROWSER = process.env.QA_BROWSER || '/opt/pw-browsers/chromium';

const fails = [];
const check = (ok, what) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) fails.push(what); };
const wait = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const origin = `http://127.0.0.1:${port}`;
  const browser = await puppeteer.launch({
    executablePath: BROWSER, headless: 'new',
    args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1']
  });
  try {
    const p = await browser.newPage();
    await p.setViewport({ width: 1280, height: 720 });
    const outside = [], failed = [], errors = [];
    await p.setRequestInterception(true);
    p.on('request', (req) => {
      const u = req.url();
      if (u.startsWith(origin) || u.startsWith('data:') || u.startsWith('blob:') || u.startsWith('about:')) req.continue();
      else { outside.push(u); req.abort(); }
    });
    p.on('requestfailed', (req) => { if (req.url().startsWith(origin)) failed.push(req.url() + ' ' + (req.failure() || {}).errorText); });
    p.on('response', (res) => { if (res.url().startsWith(origin) && res.status() >= 400) failed.push(res.url() + ' ' + res.status()); });
    p.on('pageerror', (e) => errors.push(e.message));

    await p.goto(`${origin}/?user=offline.test&workday3d=1`);
    const reach = async (fn, ms, what) => {
      const t0 = Date.now();
      while (Date.now() - t0 < ms) { if (await p.evaluate(fn).catch(() => false)) return true; await wait(200); }
      check(false, what); return false;
    };
    if (await reach(() => window.OTR && OTR.game && OTR.game.scene.isActive('TitleScene'), 30000, 'the title screen opens with no internet')) {
      check(true, 'the title screen opens with no internet');
      await wait(600);
      await p.evaluate(() => OTR.fx.transition(OTR.game.scene.getScene('TitleScene'), 'HubScene'));
      if (await reach(() => OTR.game.scene.isActive('HubScene') && !OTR.game.scene.getScene('HubScene').sys.isTransitioning(), 20000, 'the hub opens')) {
        check(true, 'the hub opens');
        await wait(600);
        await p.evaluate(() => OTR.workday.start(OTR.game.scene.getScene('HubScene')));
        const in3d = await reach(() => { const s = OTR.game.scene.getScene('FirstPersonScene'); return OTR.game.scene.isActive('FirstPersonScene') && !s.loading && !!s.model; }, 90000, 'the 3D workday opens');
        if (in3d) {
          check(true, 'the 3D workday opens');
          const gl = await p.evaluate(() => { const s = OTR.game.scene.getScene('FirstPersonScene'); return !!(s.view && s.view.camera); });
          check(gl, 'the 3D view is running');
          const brief = await p.evaluate(() => !!OTR.game.scene.getScene('FirstPersonScene').model.briefing);
          check(brief, 'the day has its Dispatch brief');
          // the 3D models come from the game folder too (docs/ASSETS.md): every listed file loaded, none failed
          const bank = await p.evaluate(() => { const s = OTR.game.scene.getScene('FirstPersonScene'); return s.assetBank ? JSON.parse(JSON.stringify(s.assetBank.stats)) : null; });
          check(bank && bank.loaded > 0 && bank.failed === 0 && !bank.errors.length, `the 3D models load from the game folder with no internet (${JSON.stringify(bank)})`);
        }
      }
    }
    await wait(500);
    check(outside.length === 0, `no request left the training server${outside.length ? ': ' + [...new Set(outside)].slice(0, 6).join(', ') : ''}`);
    check(failed.length === 0, `no request to the training server failed${failed.length ? ': ' + failed.slice(0, 6).join(', ') : ''}`);
    check(errors.length === 0, `no page errors${errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''}`);
  } finally {
    await browser.close();
    server.close();
    fs.rmSync(DATA, { recursive: true, force: true });
  }
  console.log(fails.length ? `\n${fails.length} check(s) failed` : '\nall offline checks passed');
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
