#!/usr/bin/env node
/*
 * B-72: the 3D workday's menus from the keyboard alone, as B-62 does for the trainer's dialogs. At the hub, H opens the
 * menu; Tab and the arrows reach every choice (and wrap); Enter on "Choose a reversing space." opens the list of spaces,
 * its Back goes back; Enter on Settings opens it, its Back goes back; Escape closes the menu. Then Enter on "Start workday"
 * starts the day, and on the route Escape opens the pause menu, which Tab goes round and Escape closes. No mouse.
 *
 *   QA_BROWSER=/path/to/chrome QA_BASE=http://127.0.0.1:8302 node test/fpkeysbrowser.js     (QA_LANGS=en,ta by default)
 */
'use strict';
const pp = require('puppeteer-core');
const BASE = process.env.QA_BASE || 'http://127.0.0.1:8302';
const LANGS = (process.env.QA_LANGS || 'en,ta').split(',').map(s => s.trim()).filter(Boolean);
const wait = (ms) => new Promise(r => setTimeout(r, ms));
let checks = 0;
const fails = [];
const check = (ok, what) => { checks++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) fails.push(what); };

(async () => {
  const b = await pp.launch({ executablePath: process.env.QA_BROWSER || '/opt/pw-browsers/chromium', headless: true,
    args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const errors = [];
  try {
    for (const lang of LANGS) {
      const p = await b.newPage();
      await p.setViewport({ width: 1280, height: 720 });
      p.on('pageerror', e => errors.push(`${lang}: ${e.message}`));
      await p.evaluateOnNewDocument(() => localStorage.clear());
      await p.goto(`${BASE}/first-person.html?gfx=low&lang=${lang}`);
      const ready = () => p.waitForFunction(() => { const s = window.OTR && OTR.game && OTR.game.scene.getScene('FirstPersonScene');
        return s && OTR.game.scene.isActive('FirstPersonScene') && !s.loading && !s.transitioning; }, { timeout: 120000 });
      await ready();
      const key = async (k, n) => { for (let i = 0; i < (n || 1); i++) { await p.keyboard.press(k); await wait(160); } };
      // the open panel, as the English of its choices and where the keyboard is
      const panel = () => p.evaluate(() => { const s = OTR.game.scene.getScene('FirstPersonScene');
        return s.panel ? { labels: s.panel.choices.map(c => c.label), index: s.panel.index } : null; });
      const go = async (re) => { const pn = await panel(); if (!pn) return false;
        for (let i = 0; i < pn.labels.length; i++) { const now = await panel(); if (re.test(now.labels[now.index])) return true; await key('Tab'); } return false; };
      // close whatever the welcome left open, so H opens the hub's own menu
      for (let i = 0; i < 4 && await panel(); i++) await key('Escape');
      const tag = lang;

      await key('KeyH');
      let pn = await panel();
      check(!!pn && pn.labels.includes('Choose a reversing space.') && pn.labels.some(l => /workday/.test(l)), `${tag}: H opens the hub menu`);
      if (pn) {
        const seen = new Set([pn.index]);
        for (let i = 0; i < pn.labels.length; i++) { await key('Tab'); seen.add((await panel()).index); }
        check(seen.size === pn.labels.length && (await panel()).index === pn.index, `${tag}: Tab reaches all ${pn.labels.length} choices of the hub menu and comes round again`);
        await key('ArrowDown'); const down = (await panel()).index; await key('ArrowUp');
        check(down === (pn.index + 1) % pn.labels.length && (await panel()).index === pn.index, `${tag}: the arrows move down and back up`);
        check(await go(/^Choose a reversing space/) && (await key('Enter'), await wait(300), true), `${tag}: the keyboard reaches "Choose a reversing space."`);
        pn = await panel();
        const spaces = await p.evaluate(() => OTR.fpRear.names.length);
        check(!!pn && pn.labels.length >= spaces, `${tag}: Enter opens the ${spaces} reversing spaces`);
        await key('Escape');
        check((await panel() || { labels: [] }).labels.includes('Choose a reversing space.'), `${tag}: Escape in the reversing spaces goes back to the hub menu`);
        check(await go(/^Choose a reversing space/) && (await key('Enter'), true), `${tag}: the keyboard reopens the reversing spaces`);
        check(await go(/^Back$/) && (await key('Enter'), await wait(300), true), `${tag}: the keyboard reaches Back in the reversing spaces`);
        pn = await panel();
        check(!!pn && pn.labels.includes('Choose a reversing space.'), `${tag}: Back goes back to the hub menu`);
        check(await go(/^Settings$/) && (await key('Enter'), await wait(300), true), `${tag}: the keyboard reaches Settings`);
        pn = await panel();
        check(!!pn && !pn.labels.includes('Choose a reversing space.') && pn.labels.length > 1, `${tag}: Enter opens Settings (${pn ? pn.labels.length : 0} choices)`);
        if (pn) {
          const seen2 = new Set([pn.index]);
          for (let i = 0; i < pn.labels.length; i++) { await key('Tab'); seen2.add((await panel()).index); }
          check(seen2.size === pn.labels.length, `${tag}: Tab reaches every choice in Settings`);
        }
        await key('Escape');
        check((await panel() || { labels: [] }).labels.includes('Choose a reversing space.'), `${tag}: Escape in Settings goes back to the hub menu`);
        check(await go(/^Settings$/) && (await key('Enter'), true), `${tag}: the keyboard reopens Settings`);
        check(await go(/^Back$/) && (await key('Enter'), await wait(300), true) && (await panel() || { labels: [] }).labels.includes('Choose a reversing space.'), `${tag}: Back in Settings goes back to the hub menu`);
        for (let i = 0; i < 3 && await panel(); i++) await key('Escape');
        check(!(await panel()), `${tag}: Escape closes the menus`);
      }

      // the workday: started from the menu, then the pause menu on the route
      await key('KeyH');
      check(await go(/workday/i), `${tag}: the keyboard reaches the workday choice`);
      await key('Enter');
      await ready(); await wait(800);
      for (let i = 0; i < 6 && await panel(); i++) { await key('Escape'); }        // the brief and the welcome, from the keyboard
      await key('Escape'); await wait(300);
      pn = await panel();
      check(!!pn && pn.labels.includes('Save and return to hub') && pn.labels.includes('Handheld'), `${tag}: Escape on the route opens the pause menu`);
      if (pn) {
        const seen3 = new Set([pn.index]);
        for (let i = 0; i < pn.labels.length; i++) { await key('Tab'); seen3.add((await panel()).index); }
        check(seen3.size === pn.labels.length, `${tag}: Tab reaches all ${pn.labels.length} choices of the pause menu`);
        await key('Escape');
        check(!(await panel()), `${tag}: Escape closes the pause menu`);
      }
      await p.close();
    }
    check(!errors.length, 'no page errors ' + errors.slice(0, 2).join(' | '));
  } finally { await b.close(); }
  console.log(fails.length ? `\n${fails.length} of ${checks} keyboard checks failed` : `\n${checks} 3D keyboard checks passed`);
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
