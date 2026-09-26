#!/usr/bin/env node
/*
 * Academy rules, assessments, trainer tools and the trainee record (src/core/academy.js, src/core/record.js,
 * TrainerScene, RecordScene).
 *
 *   QA_BROWSER=/path/to/chrome node test/academy.js
 *
 * Runs against the training server with a throwaway data folder and a trainer PIN, signed in by the launch link.
 * Scenario runs are finished with OTR.debug.finishNow (the scoring path every scenario uses), so this checks the
 * academy's rules, not the scenarios' own play (test/qa.js covers those).
 */
'use strict';
const path = require('path');
const fs = require('fs');
const os = require('os');

const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'otr-acad-'));
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
  const base = `http://127.0.0.1:${server.address().port}/`;
  const browser = await puppeteer.launch({ executablePath: BROWSER, headless: 'new', args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await browser.newPage();
  await p.setViewport({ width: 1280, height: 720 });
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  const ev = (f, ...a) => p.evaluate(f, ...a);
  const active = () => ev(() => OTR.game.scene.getScenes(true).map(s => s.sys.settings.key).filter(k => k !== 'PauseScene'));
  const until = async (fn, ms, arg) => { const t0 = Date.now(); while (Date.now() - t0 < (ms || 15000)) { if (await ev(fn, arg)) return true; await wait(150); } return false; };
  const sceneIs = (k) => until((k) => OTR.game.scene.isActive(k) && !OTR.game.scene.getScene(k).sys.isTransitioning(), 20000, k);
  const hub = () => ev(() => OTR.game.scene.getScene('HubScene'));

  try {
    await p.goto(base + '?user=sam.lee');
    await until(() => window.OTR && OTR.game && OTR.game.scene.isActive('TitleScene'), 30000);
    await wait(800);
    await ev(() => OTR.fx.transition(OTR.game.scene.getScene('TitleScene'), 'HubScene'));
    await sceneIs('HubScene');

    /* ---- a passing assessment */
    await ev(() => OTR.flow.startScenario(OTR.game.scene.getScene('HubScene'), 'm2-sort', { assess: true }));
    await until(() => OTR.game.scene.isActive('SortingScene'), 20000);
    await wait(1500);
    check(await ev(() => OTR.academy.assessing === 'm2-sort' && !OTR.academy.coaching()), 'assessment running: coaching off');
    // the pause menu offers no restart
    await ev(() => { const s = OTR.game.scene.getScene('SortingScene'); s.scene.launch('PauseScene', { parent: 'SortingScene', title: 'Sort Belt' }); s.scene.pause(); });
    await until(() => OTR.game.scene.isActive('PauseScene'), 5000); await wait(500);
    const pauseTexts = await ev(() => { const out = []; const walk = (o) => { if (o.type === 'Text' && o.visible) out.push(o.text); (o.list || []).forEach(walk); }; OTR.game.scene.getScene('PauseScene').children.list.forEach(walk); return out.join('|'); });
    check(!/Restart/.test(pauseTexts) && /Assessment/.test(pauseTexts), 'pause menu in an assessment: no restart, says Assessment');
    await ev(() => { OTR.game.scene.getScene('PauseScene').scene.stop(); OTR.game.scene.resume('SortingScene'); });
    await wait(300);
    await ev(() => OTR.debug.finishNow(1));
    await sceneIs('ResultsScene'); await wait(1200);
    let r = await ev(() => { const s = OTR.game.scene.getScene('ResultsScene'); return { a: s.d.assessment, rec: OTR.academy.record('m2-sort'), left: OTR.academy.attemptsLeft('m2-sort') }; });
    check(r.a && r.a.passed && r.rec.passed && r.rec.attempts === 1 && r.left === 0, `full marks pass: ${JSON.stringify(r.a && { passed: r.a.passed, short: r.a.short })}`);

    /* ---- a failing one (below the pass mark), then the attempt limit */
    await ev(() => OTR.flow.startScenario(OTR.game.scene.getScene('ResultsScene'), 'm2-lift', { assess: true }));
    await until(() => OTR.game.scene.isActive('LiftingScene'), 20000); await wait(1500);
    await ev(() => OTR.debug.finishNow(0.5));
    await sceneIs('ResultsScene'); await wait(1200);
    r = await ev(() => ({ a: OTR.game.scene.getScene('ResultsScene').d.assessment, left: OTR.academy.attemptsLeft('m2-lift'), st: OTR.academy.status('m2-lift') }));
    check(r.a && !r.a.passed && r.a.short.length > 0 && r.left === 0 && r.st === 'failed', `half marks fail, no attempts left: ${JSON.stringify(r)}`);
    const resTexts = await ev(() => { const out = []; const walk = (o) => { if (o.type === 'Text' && o.visible) out.push(o.text); (o.list || []).forEach(walk); }; OTR.game.scene.getScene('ResultsScene').children.list.forEach(walk); return out.join('|'); });
    check(/ASSESSMENT NOT PASSED/.test(resTexts) && /Needed/.test(resTexts) && /Practice it/.test(resTexts) && !/Retake/.test(resTexts), 'results say not passed, why, and offer practice (no retake)');

    /* ---- a critical mistake fails whatever the stars */
    const crit = await ev(() => OTR.academy.judge(OTR.registry.get('m5-pod'), { safety: 3, efficiency: 3, service: 3 }, { untested: [], criticals: [{ cat: 'service', label: 'x' }] }));
    check(!crit.passed, 'a critical mistake fails an assessment');

    /* ---- quitting uses the attempt */
    await ev(() => OTR.flow.startScenario(OTR.game.scene.getScene('ResultsScene'), 'm2-labels', { assess: true }));
    await until(() => OTR.game.scene.isActive('LabelScene'), 20000); await wait(1200);
    await ev(() => { OTR.academy.abandon(); OTR.fx.transition(OTR.game.scene.getScene('LabelScene'), 'HubScene'); });
    await sceneIs('HubScene');
    r = await ev(() => ({ rec: OTR.academy.record('m2-labels'), st: OTR.academy.status('m2-labels') }));
    check(r.rec && r.rec.abandoned && !r.rec.passed && r.st === 'failed', `quitting counts as not passed: ${JSON.stringify(r)}`);

    /* ---- practice afterwards is ordinary: coaching back, not an assessment */
    await ev(() => OTR.flow.startScenario(OTR.game.scene.getScene('HubScene'), 'm2-lift'));
    await until(() => OTR.game.scene.isActive('LiftingScene'), 20000); await wait(800);
    check(await ev(() => OTR.academy.assessing === null && OTR.academy.coaching()), 'practice run: coaching on');
    await ev(() => OTR.debug.finishNow(1));
    await sceneIs('ResultsScene'); await wait(600);
    check(await ev(() => !OTR.game.scene.getScene('ResultsScene').d.assessment && OTR.academy.status('m2-lift') === 'failed'), 'practice does not change the assessment');
    await wait(900);   // the save reaches the server

    /* ---- a quiz, answered right, lands in the record */
    await ev(() => OTR.fx.transition(OTR.game.scene.getScene('ResultsScene'), 'QuizScene', { module: 'm2' }));
    await sceneIs('QuizScene'); await wait(800);
    for (let i = 0; i < 5; i++) {
      await ev(() => { const s = OTR.game.scene.getScene('QuizScene'); s.opts[s.qs[s.i].answer].press(); });
      await wait(700);
      await ev(() => { const s = OTR.game.scene.getScene('QuizScene'); const i = s.i, last = i === s.qs.length - 1; s.i++; if (last) s.finish(); else s.ask(); });
      await wait(300);
    }
    const qz = await ev(() => OTR.save.data.quiz && OTR.save.data.quiz.m2);
    check(qz && qz.best === 100 && qz.passedAt, `quiz passed and recorded: ${JSON.stringify(qz)}`);
    const shuffled = await ev(() => { const s = OTR.game.scene.getScene('QuizScene'); return s.qs.map(q => q.answer).join(''); });
    check(!/^1+$/.test(shuffled), `answers are shuffled (right answers at ${shuffled})`);
    // a module passed 60 days ago is due for a refresher
    check(await ev(() => { const fresh = OTR.quiz.due('m2');     // the Sort Belt assessment passed minutes ago keeps m2 fresh
      OTR.save.data.quiz.m2.passedAt = Date.now() - 60 * 86400000; OTR.save.data.assess['m2-sort'].at = Date.now() - 50 * 86400000;
      return !fresh && OTR.quiz.due('m2') && !OTR.quiz.due('m7'); }), 'refresher due after the interval, only where something was passed');

    /* ---- the mistake drill picks the weakest played scenarios, and the results screen offers the next */
    const q = await ev(() => { OTR.save.data.scenarios['m2-sort'].bestStars = { safety: 1, efficiency: 1 }; OTR.save.data.scenarios['m2-lift'].bestStars = { safety: 3, efficiency: 2 }; return OTR.drill.queue(); });
    check(q[0] === 'm2-sort' && q.indexOf('m2-lift') > 0, `drill queue, weakest first: ${q.join(', ')}`);
    await ev(() => OTR.drill.start(OTR.game.scene.getScene('QuizScene')));
    await until(() => OTR.game.scene.isActive('SortingScene'), 20000); await wait(1200);
    await ev(() => OTR.debug.finishNow(0.7));
    await sceneIs('ResultsScene'); await wait(1500);
    const nb = await ev(() => { const out = []; const walk = (o) => { if (o.type === 'Text' && o.visible) out.push(o.text); (o.list || []).forEach(walk); }; OTR.game.scene.getScene('ResultsScene').children.list.forEach(walk); return out.join('|'); });
    check(/Next drill \(2 of \d\)/.test(nb), 'results offer the next drill');
    await ev(() => { OTR.drill.active = null; });

    /* ---- trainer: rules, retakes */
    const api = (url, method, body) => ev((url, method, body) => fetch(url, { method, headers: { 'X-Trainer-Pin': '4821', 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }).then(r => r.json().then(b => ({ code: r.status, b }))), url, method, body);
    check((await ev(() => OTR.academy.checkPin('0000'))) !== true && (await ev(() => OTR.academy.checkPin('4821'))) === true, 'PIN checked by the server');
    const saved = await ev(() => OTR.academy.saveSettings({ mode: 'assessment', passStars: { safety: 3, efficiency: 1, service: 2 }, attempts: 2, refresherDays: 45 }));
    const onServer = JSON.parse(fs.readFileSync(path.join(DATA, 'settings.json'), 'utf8'));
    check(saved === true && onServer.mode === 'assessment' && onServer.passStars.safety === 3 && onServer.attempts === 2, 'trainer rules saved on the server');
    check(await ev(() => !OTR.academy.practiceAllowed() && OTR.academy.attemptsLeft('m2-lift') === 1), 'attempts rule applies at once (2 allowed, 1 used)');
    const allow = await api('api/trainees/sam.lee/allow', 'POST');
    check(allow.code === 200 && allow.b.allowed >= 2, `trainer allows retakes: ${JSON.stringify(allow.b)}`);

    /* ---- screens: trainer tools and the record render without errors */
    await ev(() => OTR.fx.transition(OTR.game.scene.getScene('ResultsScene'), 'TrainerScene'));
    await sceneIs('TrainerScene'); await wait(1500);
    const tr = await ev(() => { const out = []; const walk = (o) => { if (o.type === 'Text' && o.visible) out.push(o.text); (o.list || []).forEach(walk); }; OTR.game.scene.getScene('TrainerScene').children.list.forEach(walk); return out.join('|'); });
    check(/Sam Lee/.test(tr) && /Assessment only/.test(tr), 'trainer tools list the trainee and the rules');
    await ev(() => OTR.game.scene.getScene('TrainerScene').openRecord('sam.lee', 'Sam Lee'));
    await sceneIs('RecordScene'); await wait(1500);
    const rec = await ev(() => { const s = OTR.game.scene.getScene('RecordScene'); return s.R && { passed: s.R.passed, runs: s.R.runs }; });
    check(rec && rec.passed === 1 && rec.runs >= 3, `record from the server: ${JSON.stringify(rec)}`);
    const html = await ev(() => OTR.record.html(OTR.game.scene.getScene('RecordScene').R, 'Sam Lee', 'sam.lee'));
    check(/Training record: Sam Lee/.test(html) && /Passed/.test(html) && /Not passed/.test(html) && /Trainer signature/.test(html), 'printable record');
    check(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.join(' / ') : ''));
  } catch (e) {
    check(false, 'script error: ' + (e && e.stack || e));
  } finally {
    await browser.close();
    server.close();
    fs.rmSync(DATA, { recursive: true, force: true });
  }
  console.log(fails.length ? `\n${fails.length} failed` : '\nall academy checks passed');
  process.exit(fails.length ? 1 : 0);
})();
