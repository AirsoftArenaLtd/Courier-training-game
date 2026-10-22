#!/usr/bin/env node
/*
 * A-28: a 3D fuzz run. A later-day workday (the owner's review link, route 10 day 4: richer stops, the walkaround, the
 * radio, damage) is played with random keys from the game's own key set for a while, from a seeded random sequence, at
 * Low. Every few seconds: no page error, the 3D scene still running (or a panel or the handheld open, which the next keys
 * close), the frame clock moving, and the day's snapshot restoring (OTR.fpMission.restore), so a random key can never
 * leave a day that cannot be resumed. QA_FUZZ_SEEDS=1,2,3 and QA_FUZZ_SECONDS=90 choose the runs.
 *
 *   QA_BROWSER=/path/to/chrome node test/fpfuzzbrowser.js
 */
'use strict';
const path = require('path');
const pp = require('puppeteer-core');
const BROWSER = process.env.QA_BROWSER || '/opt/pw-browsers/chromium';
const PAGE = process.env.QA_BASE ? process.env.QA_BASE.replace(/\/+$/, '') + '/index.html' : 'file://' + path.resolve(__dirname, '..', 'index.html');
const SEEDS = (process.env.QA_FUZZ_SEEDS || '1,2,3').split(',').map(Number);
const SECONDS = Number(process.env.QA_FUZZ_SECONDS || 90);
const KEYS = ['KeyW', 'KeyS', 'KeyA', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyE', 'KeyF', 'KeyG', 'KeyP', 'KeyJ', 'KeyL',
  'KeyK', 'KeyR', 'KeyB', 'KeyQ', 'KeyC', 'KeyH', 'KeyV', 'Tab', 'Space', 'Escape', 'Enter', 'Backspace', 'Digit1', 'Digit2', 'Digit3', 'Digit4'];
const wait = (ms) => new Promise(r => setTimeout(r, ms));
let checks = 0;
const fails = [];
const check = (ok, what) => { checks++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) fails.push(what); };
const rng = (seed) => () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };

(async () => {
  const b = await pp.launch({ executablePath: BROWSER, headless: true, args: ['--no-sandbox', '--allow-file-access-from-files', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    for (const seed of SEEDS) {
      const p = await b.newPage(), errors = [];
      await p.setViewport({ width: 1280, height: 720 });
      p.on('pageerror', e => errors.push(String(e.message || e).split('\n')[0].slice(0, 160)));
      await p.goto(PAGE + `?dev=1&workday3d=1&gfx=low&user=review-fuzz-${seed}&name=Owner&route=10&day=4`);
      const until = async (src, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await p.evaluate(src).catch(() => false)) return true; await wait(250); } return false; };
      await until(`OTR.game.scene.isActive('HubScene') || OTR.game.scene.isActive('TitleScene')`, 30000);
      if (await p.evaluate(`OTR.game.scene.isActive('TitleScene')`)) await p.evaluate(() => { const m = OTR.game.scene; m.getScenes(true).forEach(s => m.stop(s.sys.settings.key)); m.start('HubScene'); });
      await until(`OTR.game.scene.isActive('HubScene')`, 10000); await wait(800);
      await p.evaluate(() => { const s = OTR.game.scene.getScene('HubScene'); const f = s.focusables.find(o => o.label && /Start workday/.test(OTR.i18n.src(o.label))); if (f) f.press(); });
      await wait(800);
      await p.evaluate(() => { const st = OTR.game.scene.getScene('HubScene')._modalStack || []; const top = st[st.length - 1]; const walk = (c) => { for (const o of c.list || []) { if (o.press && o.label && /^Start/.test(OTR.i18n.src(o.label))) { o.press(); return true; } if (walk(o)) return true; } return false; }; if (top) walk(top); });
      const started = await until(`!!(OTR.game.scene.isActive('FirstPersonScene') && OTR.game.scene.getScene('FirstPersonScene').model)`, 120000);
      check(started, `seed ${seed}: the 3D day starts`);
      if (!started) { await p.close(); continue; }
      const r = rng(seed), end = Date.now() + SECONDS * 1000;
      let presses = 0, probes = 0, stuck = 0, lastClock = -1;
      while (Date.now() < end) {
        const k = KEYS[Math.floor(r() * KEYS.length)], hold = r() < 0.25 ? 300 + Math.floor(r() * 900) : 60;
        await p.keyboard.down(k); await wait(hold); await p.keyboard.up(k); presses++;
        if (presses % 25 === 0) {
          probes++;
          const st = await p.evaluate(() => { const s = OTR.game.scene.getScene('FirstPersonScene'), m = s && s.model;
            const active = OTR.game.scene.getScenes(true).map(x => x.sys.settings.key);
            let restores = null; try { restores = m ? !!OTR.fpMission.restore(m.snapshot()) : null; } catch (e) { restores = 'error: ' + e.message; }
            return { active, fp: OTR.game.scene.isActive('FirstPersonScene'), clock: OTR.game.loop.frame, restores, phase: m && m.phase }; }).catch(e => ({ error: e.message }));
          if (st.error) { check(false, `seed ${seed}: the page answered after ${presses} keys (${st.error})`); break; }
          if (st.clock === lastClock) stuck++; lastClock = st.clock;
          // the day may finish into the results (a random Finish workday); that is a way out, not a fault
          if (!st.fp && !st.active.some(k => /Results|Debrief|DriveReview|Hub|Pause/.test(k))) check(false, `seed ${seed}: after ${presses} keys no expected scene is active: ${st.active.join(', ')}`);
          if (st.fp && st.restores !== true) check(false, `seed ${seed}: after ${presses} keys the day's snapshot does not restore (${st.restores}, phase ${st.phase})`);
          if (!st.fp) break;
        }
      }
      check(!errors.length, `seed ${seed}: ${presses} random keys with no page error${errors.length ? ': ' + errors.slice(0, 2).join(' | ') : ''}`);
      check(stuck === 0, `seed ${seed}: the frame clock kept moving at all ${probes} checks`);
      await p.close();
    }
  } finally { await b.close(); }
  console.log(fails.length ? `\n${fails.length} of ${checks} 3D fuzz checks failed` : `\n${checks} 3D fuzz checks passed`);
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
