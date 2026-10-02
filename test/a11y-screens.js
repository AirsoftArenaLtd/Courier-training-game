#!/usr/bin/env node
/*
 * The screens no scenario reaches, with larger text and the color filter on (Settings → Accessibility): results
 * after a drive with mistakes, the drive map, the hub and its Settings, Accessibility, Trainer, the record's three
 * tabs, the quiz menu and a quiz, and the pause menu. Each is screenshotted to test/out/a11y-<name>.png and run
 * through the suite's layout audit (text overflowing its box, UI off the canvas, dead hit areas).
 *
 *   QA_BROWSER=/path/to/chrome node test/a11y-screens.js      (QA_A11Y=large to test one setting)
 */
'use strict';
const fs = require('fs');
const path = require('path');
let puppeteer;
try { puppeteer = require('puppeteer-core'); } catch (e) { console.error('puppeteer-core is missing. Run:  cd test && npm install'); process.exit(2); }
const BROWSER = process.env.QA_BROWSER || '/opt/pw-browsers/chromium';
const ON = (process.env.QA_A11Y || 'large,colour').split(',').filter(Boolean);
const OUT = path.join(__dirname, 'out');
fs.mkdirSync(OUT, { recursive: true });
// the suite's own layout audit, taken from qa.js so the two never drift apart
const QA = fs.readFileSync(path.join(__dirname, 'qa.js'), 'utf8');
const AUDIT = QA.slice(QA.indexOf('function auditLayout()'), QA.indexOf('\n}\n', QA.indexOf('function auditLayout()')) + 2);
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html') + '?user=a11y&name=Alexandria%20Montgomery-Whitfield';

const fails = [];
const wait = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({ executablePath: BROWSER, headless: 'new', args: ['--no-sandbox', '--allow-file-access-from-files', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await browser.newPage();
  await p.setViewport({ width: 1280, height: 720 });
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  const ev = (f, ...a) => p.evaluate(f, ...a);
  const until = async (src, ms) => { const t0 = Date.now(); while (Date.now() - t0 < (ms || 15000)) { if (await p.evaluate(src)) return true; await wait(150); } return false; };
  const active = (key) => until(`OTR.game.scene.isActive(${JSON.stringify(key)})`, 15000);
  const shot = async (name) => {
    await wait(1300);
    await p.screenshot({ path: path.join(OUT, `a11y-${name}.png`) });
    const found = await p.evaluate(`(${AUDIT})()`).catch(e => [{ kind: 'audit-failed', detail: e.message }]);
    console.log(`${found.length ? 'FAIL' : 'ok  '} ${name}`);
    found.slice(0, 10).forEach(f => console.log(`        [${f.kind}] ${f.scene || ''} ${f.what || ''} — ${f.detail || ''}`));
    if (found.length) fails.push(name);
  };
  const go = (key, data) => ev((key, data) => { const m = OTR.game.scene; m.getScenes(true).forEach(s => m.stop(s.sys.settings.key)); m.start(key, data || {}); }, key, data || null);

  try {
    await p.goto(URL);
    await active('TitleScene');
    await ev(() => localStorage.clear());
    await p.goto(URL);
    await active('TitleScene');
    await ev((on) => { const A = OTR.a11y.settings(); on.forEach(k => { A[k] = true; }); OTR.a11y.save(); }, ON);
    await go('TitleScene'); await active('TitleScene');
    await shot('title');

    // a drive with mistakes, ended: Results, then the drive map
    await ev(() => OTR.flow.startScenario(OTR.game.scene.getScene('TitleScene'), 'm1-driving'));
    await active('DrivingScene'); await wait(1500);
    await p.keyboard.press('Enter'); await wait(1200);
    await ev(() => {
      const s = OTR.game.scene.getScene('DrivingScene'), v = s.van;
      const at = [[0, 0], [400, 0], [900, 300]];
      ['speeding', 'redlight', 'rolling'].forEach((k, i) => { v.x += at[i][0]; v.y += at[i][1]; s.violation(k, { speeding: 'Over the limit (34 in a 25)', redlight: 'Ran a red light', rolling: 'Rolled through a stop sign' }[k], 'safety', 2, 'Watch the signs and your speed: they are there for the people you can\'t see yet.'); });
      s.endDrill();
    });
    await active('ResultsScene');
    await shot('results');
    {
      const opened = await ev(() => {
        const R = OTR.game.scene.getScene('ResultsScene'); const d = R.d; const pins = OTR.drive.pins(d.result.log);
        OTR.fx.transition(R, 'DriveReviewScene', { pins, seed: pins[0] && pins[0].where.seed, title: 'Road Hazards', back: 'ResultsScene', backData: Object.assign({}, d, { again: true }) });
        return pins.length;
      });
      await active('DriveReviewScene');
      await shot(`drive-map-${opened}-pins`);
    }

    // the hub and its settings
    await go('HubScene'); await active('HubScene');
    await shot('hub');
    await ev(() => OTR.game.scene.getScene('HubScene').openSettings());
    await shot('hub-settings');

    await go('AccessScene'); await active('AccessScene');
    await shot('access');
    await go('TrainerScene'); await active('TrainerScene');
    await shot('trainer');

    await go('RecordScene', {}); await active('RecordScene');
    await shot('record-modules');
    await p.keyboard.press('Digit2'); await shot('record-lessons');
    await p.keyboard.press('Digit3'); await shot('record-recent');

    await go('QuizScene', {}); await active('QuizScene');
    await shot('quiz-menu');
    const mid = await ev(() => OTR_DATA.modules[0].id);
    await go('QuizScene', { module: mid }); await active('QuizScene');
    await shot('quiz-question');
    await p.keyboard.press('Digit1'); await shot('quiz-answered');

    // the pause menu over a stop
    await ev(() => { const m = OTR.game.scene; m.getScenes(true).forEach(s => m.stop(s.sys.settings.key)); OTR.flow.startScenario(m.getScene('TitleScene'), 'm5-pod'); });
    await active('StopScene'); await wait(1800);
    await p.keyboard.press('Escape');
    await active('PauseScene');
    await shot('pause');

    if (errors.length) { console.log('FAIL page errors: ' + errors.join(' / ')); fails.push('errors'); }
  } catch (e) {
    console.log('FAIL script error: ' + (e && e.stack || e));
    fails.push('script');
  } finally {
    await browser.close();
  }
  console.log(fails.length ? `\n${fails.length} screen(s) with problems: ${fails.join(', ')}` : `\nall screens clean with ${ON.join(' + ')}`);
  process.exit(fails.length ? 1 : 0);
})();
