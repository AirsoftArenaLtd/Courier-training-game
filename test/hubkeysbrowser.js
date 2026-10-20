#!/usr/bin/env node
/*
 * B-77: the hub and the record from the keyboard alone, as B-62 and B-72 do for the trainer's dialogs and the 3D menus.
 * In the hub, Tab reaches every control the screen offers (the module rows, the workday, the quizzes, the record link,
 * the language, sound and settings buttons) and comes round again; Enter on the globe opens the language menu and
 * Escape closes it; Enter on the gear opens Settings and Escape closes it; Enter on "My record ›" opens the record. In
 * the record, 1, 2 and 3 switch the tabs, Tab reaches Print / PDF and Back, and Escape goes back to the hub. No mouse.
 *
 *   QA_BROWSER=/path/to/chrome node test/hubkeysbrowser.js            (QA_LANGS=en,ta by default)
 */
'use strict';
const path = require('path');
const pp = require('puppeteer-core');
const BROWSER = process.env.QA_BROWSER || '/opt/pw-browsers/chromium';
const LANGS = (process.env.QA_LANGS || 'en,ta').split(',').map(s => s.trim()).filter(Boolean);
const wait = (ms) => new Promise(r => setTimeout(r, ms));
let checks = 0;
const fails = [];
const check = (ok, what) => { checks++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) fails.push(what); };

(async () => {
  const b = await pp.launch({ executablePath: BROWSER, headless: 'new', args: ['--no-sandbox', '--allow-file-access-from-files'] });
  const errors = [];
  try {
    for (const lang of LANGS) {
      const p = await b.newPage();
      await p.setViewport({ width: 1280, height: 720 });
      p.on('pageerror', e => errors.push(`${lang}: ${e.message}`));
      await p.goto('file://' + path.resolve(__dirname, '..', 'index.html') + `?user=keys&name=Sam%20Lee&lang=${lang}&dev=1`);
      const until = async (src, ms) => { const t0 = Date.now(); while (Date.now() - t0 < (ms || 15000)) { if (await p.evaluate(src).catch(() => false)) return true; await wait(150); } return false; };
      await until(`OTR.game.scene.isActive('TitleScene')`, 20000);
      const key = async (k, n) => { for (let i = 0; i < (n || 1); i++) { await p.keyboard.press(k); await wait(160); } };
      const start = async (k) => { await p.evaluate((k) => { const m = OTR.game.scene; m.getScenes(true).forEach(s => m.stop(s.sys.settings.key)); m.start(k, {}); }, k); await until(`OTR.game.scene.isActive('${k}')`); await wait(1000); };
      // where the screen's own focus ring is: its index in the screen's focusables, or -1
      const at = (k) => p.evaluate((k) => { const s = OTR.game.scene.getScene(k), f = s._focusOn, c = f && f.current && f.current(); return c ? s.focusables.indexOf(c) : -1; }, k);
      const modals = (k) => p.evaluate((k) => (OTR.game.scene.getScene(k)._modalStack || []).filter(m => m.active).length, k);
      const tabTo = async (k, find) => { const want = await p.evaluate(find); for (let i = 0; i < 40; i++) { await key('Tab'); if (await at(k) === want) return true; } return false; };

      await start('HubScene');
      const n = await p.evaluate(() => OTR.game.scene.getScene('HubScene').focusables.filter(f => f.visible !== false && f.active).length);
      const seen = new Set();
      for (let i = 0; i < n + 2; i++) { await key('Tab'); seen.add(await at('HubScene')); }
      seen.delete(-1);
      check(seen.size === n, `${lang}: Tab reaches all ${n} hub controls (${seen.size})`);
      // the globe: the language menu, closed again with Escape
      check(await tabTo('HubScene', `(() => { const s = OTR.game.scene.getScene('HubScene'); return s.focusables.findIndex(f => f.icon && f.icon.texture && f.icon.texture.key === 'ic_globe'); })()`), `${lang}: Tab reaches the language button`);
      await key('Enter'); await wait(400);
      check(await modals('HubScene') === 1, `${lang}: Enter opens the language menu`);
      await key('Escape'); await wait(400);
      check(await modals('HubScene') === 0, `${lang}: Escape closes the language menu`);
      check(await tabTo('HubScene', `(() => { const s = OTR.game.scene.getScene('HubScene'); return s.focusables.findIndex(f => f.icon && f.icon.texture && f.icon.texture.key === 'ic_gear'); })()`), `${lang}: Tab reaches the settings button`);
      await key('Enter'); await wait(400);
      check(await modals('HubScene') === 1, `${lang}: Enter opens Settings`);
      await key('Escape'); await wait(400);
      check(await modals('HubScene') === 0, `${lang}: Escape closes Settings`);
      // the record
      check(await tabTo('HubScene', `(() => { const s = OTR.game.scene.getScene('HubScene'); return s.focusables.findIndex(f => f.type === 'Text' && OTR.i18n.src(f) === 'My record ›'); })()`), `${lang}: Tab reaches "My record ›"`);
      await key('Enter');
      check(await until(`OTR.game.scene.isActive('RecordScene')`, 8000), `${lang}: Enter opens the record`);
      await wait(900);
      // the chosen tab is the one drawn differently from the other two
      for (const [k, id] of [['Digit2', 'lessons'], ['Digit3', 'recent'], ['Digit1', 'modules']]) {
        await key(k); await wait(300);
        check(await p.evaluate((id) => { const s = OTR.game.scene.getScene('RecordScene'); const keys = (s.tabs || []).map(t => t.bg.texture.key), on = (s.tabs || []).filter(t => keys.filter(k => k === t.bg.texture.key).length === 1); return on.length === 1 && on[0].tabId === id; }, id), `${lang}: ${k.slice(5)} switches the record to ${id}`);
      }
      const labels = await p.evaluate(() => { const s = OTR.game.scene.getScene('RecordScene'); return s.focusables.map(f => f.label ? OTR.i18n.src(f.label) : ''); });
      for (const want of ['Print / PDF', 'Back']) {
        const i = labels.indexOf(want);
        check(i >= 0 && await tabTo('RecordScene', String(i)), `${lang}: Tab reaches "${want}" in the record`);
      }
      await key('Escape');
      check(await until(`OTR.game.scene.isActive('HubScene')`, 8000), `${lang}: Escape goes back from the record to the hub`);
      await p.close();
    }
    check(!errors.length, 'no page errors ' + errors.slice(0, 2).join(' | '));
  } finally { await b.close(); }
  console.log(fails.length ? `\n${fails.length} of ${checks} keyboard checks failed` : `\n${checks} hub and record keyboard checks passed`);
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
