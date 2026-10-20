#!/usr/bin/env node
/*
 * B-79: the pre-trip walkaround (module 1) with the keyboard alone. Into the cab with C, lights on with L, then on every
 * side of the truck (D walks round): Tab to each marked item, Enter to look at it, T to test it (the horn, the brake,
 * the belt, a door), G to put the tread gauge on the tyre, then P to pass it or F to flag the defect; Tab to Sign off
 * and Enter, and Enter on the report. Every item must be reached and judged right, and the scenario must finish with
 * full marks. Before B-79 the items could only be opened with the mouse, and the gauge only dragged.
 *
 *   QA_BROWSER=/path/to/chrome node test/pretripkeysbrowser.js         (QA_LANGS=en,ta by default)
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
      await p.goto('file://' + path.resolve(__dirname, '..', 'index.html') + `?scenario=m1-pretrip&dev=1&user=keys&name=Sam%20Lee&lang=${lang}`);
      const S = `OTR.game.scene.getScene('PreTripScene')`;
      const ev = (src) => p.evaluate(src);
      const until = async (src, ms) => { const t0 = Date.now(); while (Date.now() - t0 < (ms || 15000)) { if (await ev(src).catch(() => false)) return true; await wait(120); } return false; };
      const key = async (k) => { await p.keyboard.press(k); await wait(180); };
      check(await until(`OTR.game.scene.isActive('PreTripScene')`, 30000), `${lang}: the pre-trip opens`);
      await wait(1200); await key('Enter'); await wait(900);                     // the brief
      check(await until(`${S}.running`, 8000), `${lang}: the walkaround starts from the keyboard`);

      // everything on this side: Tab to each unmarked item, Enter, test it, judge it
      const side = async () => {
        for (let guard = 0; guard < 12; guard++) {
          const left = await ev(`${S}.keyStops().filter(id => id !== 'sign' && !${S}.marks[id])`);
          if (!left.length) return;
          const want = left[0];
          for (let i = 0; i < 12 && await ev(`${S}.keyAt`) !== want; i++) await key('Tab');
          if (await ev(`${S}.keyAt`) !== want) throw new Error(`Tab never reached ${want}`);
          await key('Enter');
          if (!(await until(`(${S}._openModals || 0) > 0`, 3000))) throw new Error(`Enter did not open ${want}`);
          const item = await ev(`(() => { const it = ${S}.content.items.find(i => i.id === '${want}'); return { needs: it.needs || null, bad: !!${S}.defects[it.id] }; })()`);
          if (item.needs === 'press') await key('KeyT');
          if (item.needs === 'gauge') { await wait(500); await key('KeyG'); }
          if (!(await until(`${S}._judge.pass.enabled`, 6000))) throw new Error(`${want} could not be judged after its test`);
          await key(item.bad ? 'KeyF' : 'KeyP');
          if (!(await until(`!!${S}.marks['${want}'] && !(${S}._openModals > 0)`, 4000))) throw new Error(`the verdict on ${want} was not recorded`);
        }
      };
      try {
        await key('KeyC'); await wait(400);
        await key('KeyL'); await wait(300);
        check(await ev(`${S}.lights`), `${lang}: C and L: in the cab with the lights on`);
        await side();
        await key('KeyC'); await wait(400);
        for (let i = 0; i < 4; i++) { await side(); await key('KeyD'); await wait(400); }
        const left = await ev(`${S}.content.items.filter(it => !${S}.marks[it.id]).map(it => it.id)`);
        check(!left.length, `${lang}: every item reached and judged from the keyboard${left.length ? ': missing ' + left.join(', ') : ''}`);
        const wrong = await ev(`${S}.content.items.filter(it => (${S}.marks[it.id] === 'flag') !== !!${S}.defects[it.id]).map(it => it.id)`);
        check(!wrong.length, `${lang}: every verdict right${wrong.length ? ': ' + wrong.join(', ') : ''}`);
        for (let i = 0; i < 20 && await ev(`${S}.keyAt`) !== 'sign'; i++) await key('Tab');
        check(await ev(`${S}.keyAt`) === 'sign', `${lang}: Tab reaches Sign off`);
        await key('Enter'); await wait(900);
        check(await ev(`(${S}._openModals || 0) > 0`), `${lang}: Enter signs off and shows the report`);
        await key('Enter');
        check(await until(`OTR.game.scene.isActive('ResultsScene')`, 10000), `${lang}: Enter on the report finishes the scenario`);
        const stars = await ev(`(() => { const r = OTR.game.scene.getScene('ResultsScene'); const d = r.d || {}; return d.result ? JSON.stringify(d.result.stars || d.stars) : JSON.stringify(d.stars || null); })()`);
        console.log(`  ${lang}: stars ${stars}`);
        check(/"safety":3/.test(stars) || /3,3,3/.test(stars), `${lang}: a perfect walkaround from the keyboard earns full marks (${stars})`);
      } catch (e) { check(false, `${lang}: ${e.message}`); }
      await p.close();
    }
    check(!errors.length, 'no page errors ' + errors.slice(0, 2).join(' | '));
  } finally { await b.close(); }
  console.log(fails.length ? `\n${fails.length} of ${checks} pre-trip keyboard checks failed` : `\n${checks} pre-trip keyboard checks passed`);
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
