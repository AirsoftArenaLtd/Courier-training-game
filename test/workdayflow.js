#!/usr/bin/env node
/*
 * The 3D workday's flow, without the 3D world: the hub starts a workday, a stand-in scene sends the reports the 3D
 * world would (OTR.workday.report) and finishes the day (OTR.workday.finish), and the results, the debrief, the drive
 * review and the record must show it with the right totals, with no page errors and nothing overflowing (the suite's
 * layout audit, from test/qa.js).
 *
 *   QA_BROWSER=/path/to/chrome QA_FPS_FLOOR=0 node test/workdayflow.js
 *   QA_A11Y=large ...          with larger text (QA_A11Y=large,colour for both settings)
 *   QA_LANG=ta ...             in another language (screenshots test/out/workday-ta-<name>.png)
 *
 * Days played: a good day; a bad day with many mistakes, left half way and resumed after a reload; an empty day; one
 * abandoned; then a saved day holding an event type the catalogue no longer has. Runs against the training server
 * (throwaway data folder), so the trainer's view of the record is checked too.
 */
'use strict';
const path = require('path');
const fs = require('fs');
const os = require('os');

const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'otr-wday-'));
process.env.OTR_DATA_DIR = DATA;
process.env.OTR_TRAINER_PIN = '4821';
const { server } = require('../server/server.js');
let puppeteer;
try { puppeteer = require('puppeteer-core'); } catch (e) { console.error('puppeteer-core is missing. Run:  cd test && npm install'); process.exit(2); }
const BROWSER = process.env.QA_BROWSER || '/opt/pw-browsers/chromium';
const LANG = process.env.QA_LANG || '';
const ON = (process.env.QA_A11Y || '').split(',').filter(Boolean);
const OUT = path.join(__dirname, 'out');
fs.mkdirSync(OUT, { recursive: true });
const QA = fs.readFileSync(path.join(__dirname, 'qa.js'), 'utf8');
const AUDIT = QA.slice(QA.indexOf('function auditLayout()'), QA.indexOf('\n}\n', QA.indexOf('function auditLayout()')) + 2);
const TAG = [LANG, ...ON].filter(Boolean).join('-');

const fails = [];
const check = (ok, what) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) fails.push(what); };
const wait = (ms) => new Promise(r => setTimeout(r, ms));

/* In the page: helpers the steps below use. */
function helpers() {
  // visible text of a scene, as the English it was written in
  window.__texts = (key) => {
    const out = [];
    const walk = (o) => { if (!o || o.visible === false) return; if (o.type === 'Text') out.push(OTR.i18n.src(o)); (o.list || []).forEach(walk); };
    OTR.game.scene.getScene(key).children.list.forEach(walk);
    return out;
  };
  // press a button or link by its English label
  window.__press = (key, label) => {
    let hit = null;
    const walk = (o) => {
      if (hit || !o || o.visible === false) return;
      if (o.press && o.label && OTR.i18n.src(o.label) === label) hit = o;
      else if (o.press && o.type === 'Text' && OTR.i18n.src(o) === label) hit = o;
      (o.list || []).forEach(walk);
    };
    OTR.game.scene.getScene(key).children.list.forEach(walk);
    if (!hit) return false;
    if (hit.enabled === false) return 'disabled';       // (the results screen holds its buttons while it counts up)
    hit.press();
    return true;
  };
  // a stand-in for the 3D scene: it only records how the hub started it
  class WorkdayStubScene extends Phaser.Scene {
    constructor() { super('WorkdayStubScene'); }
    init(d) { window.__started = d; }
    create() { this.add.rectangle(640, 360, 1280, 720, 0x223344); }
  }
  if (!OTR.game.scene.keys.WorkdayStubScene) OTR.game.scene.add('WorkdayStubScene', WorkdayStubScene, false);
  window.__realScene = OTR.workday.SCENE;
  OTR.workday.SCENE = 'WorkdayStubScene';
  window.__report = (list) => list.forEach(([t, d]) => OTR.workday.report(t, d));
  // what the reports should score, worked out here from the catalogue (not by the game's own code)
  window.__expect = (list) => {
    const E = OTR_DATA.workdayEvents, seen = new Set(), cats = {}, crit = new Set();
    let score = 0;
    list.forEach(([t, d]) => {
      d = d || {};
      const k = t + '|' + (d.key === undefined ? '' : d.key);
      if (seen.has(k) || !E[t]) return;
      seen.add(k);
      const e = E[t], c = cats[e.cat] = cats[e.cat] || { got: 0, max: 0, tested: false };
      if (e.kind === 'check') { const g = d.ok === false ? 0 : e.max; c.got += g; c.max += e.max; c.tested = true; score += g * 100; if (d.ok === false && e.critical) crit.add(e.cat); }
      else if (e.kind === 'penalty') { c.got -= e.pts; c.tested = true; score -= e.pts * 100; if (e.critical) crit.add(e.cat); }
      else { c.got += e.pts; score += e.pts * 100; }
    });
    const stars = {};
    ['safety', 'efficiency', 'service'].forEach(cat => {
      const c = cats[cat];
      if (!c || !c.tested) { stars[cat] = 0; return; }
      const r = c.max <= 0 ? (c.got < 0 ? 0 : 1) : Math.max(0, Math.min(1, c.got / c.max));
      let s = OTR_DATA.config.starThresholds.filter(t => r >= t - 1e-6).length;
      if (crit.has(cat)) s = Math.min(1, s);
      stars[cat] = s;
    });
    const ratios = {};
    ['safety', 'efficiency', 'service'].forEach(cat => { const c = cats[cat]; ratios[cat] = !c ? 1 : c.max <= 0 ? (c.got < 0 ? 0 : 1) : Math.round(Math.max(0, Math.min(1, c.got / c.max)) * 1000) / 1000; });
    return { score: Math.max(0, score), stars, ratios };
  };
  window.__ratios = (r) => { const o = {}; Object.keys(r).forEach(k => { o[k] = Math.round(r[k] * 1000) / 1000; }); return o; };
}

const GOOD = [
  ['brief.read'], ['inspect.tires'], ['inspect.lights'],
  ['scan.load', { key: 'p1' }], ['scan.load', { key: 'p2' }], ['scan.load', { key: 'p3' }],
  ['load.shelf', { key: 'p1' }], ['load.shelf', { key: 'p2' }], ['load.shelf', { key: 'p3' }], ['load.secured', { key: 1 }],
  ['drive.stop-line', { key: 1, where: { x: 1.2, z: -24.6, mph: 2.1 } }], ['drive.hazard-early', { key: 1, where: { x: 2, z: -60, mph: 14.3 } }],
  ['retrieve.checked', { key: 'p1' }], ['scan.stop', { key: 'p1', stop: 1 }], ['deliver.outcome', { key: 1, stop: 1 }],
  ['retrieve.checked', { key: 'p2' }], ['scan.stop', { key: 'p2', stop: 2 }], ['deliver.outcome', { key: 2, stop: 2 }],
  ['retrieve.checked', { key: 'p3' }], ['scan.stop', { key: 'p3', stop: 3 }], ['deliver.outcome', { key: 3, stop: 3 }],
  ['return.scanned', { key: 'none' }]
];
// the bad day, before and after a reload
const BAD1 = [
  ['brief.read', { ok: false }], ['inspect.tires', { ok: false }], ['inspect.lights'], ['depart.uninspected', { key: 'tires' }],
  ['scan.load', { key: 'p1' }], ['scan.load', { key: 'p2', ok: false }], ['scan.load', { key: 'p3' }],
  ['load.shelf', { key: 'p1', ok: false }], ['load.shelf', { key: 'p2' }], ['load.shelf', { key: 'p3', ok: false }], ['load.secured', { key: 1, ok: false }],
  ['drive.belt', { key: 1 }], ['drive.speed', { key: 1, where: { x: 1.4, z: -18.2, mph: 31.7 } }], ['drive.sidewalk', { key: 1, where: { x: 6.1, z: -33, mph: 12 } }]
];
const BAD2 = [
  ['drive.pedestrian', { key: 1, where: { x: 3.3, z: -48.9, mph: 17.2 } }], ['drive.stop-line', { key: 1, ok: false, where: { x: 1, z: -25, mph: 11 } }],
  ['drive.hazard-early', { key: 1, ok: false, where: { x: 2.5, z: -70, mph: 22 } }], ['drive.contact', { key: 2, where: { x: 9.5, z: -101, mph: 6 } }],
  ['drive.speed', { key: 2, where: { x: 1.1, z: -88, mph: 34 } }], ['drive.handheld', { key: 2 }],
  ['retrieve.checked', { key: 'p1', ok: false }], ['scan.stop', { key: 'p1', stop: 1, ok: false }], ['deliver.outcome', { key: 1, stop: 1 }],
  ['scan.mismatch-caught', { key: 'p3:2', stop: 2 }], ['deliver.wrong-package', { key: 'p3:2', stop: 2 }], ['scan.stop', { key: 'p2', stop: 2 }],
  ['deliver.no-recipient', { key: 2, stop: 2 }], ['deliver.outcome', { key: 2, stop: 2, ok: false }],
  ['scan.stop', { key: 'p3', stop: 3 }], ['deliver.outcome', { key: 3, stop: 3, ok: false }],
  ['return.scanned', { key: 'p3', ok: false }]
];
const STOPS = [{ stop: 1, delivered: true, address: '214 Maple Ave', x: 10, z: -42 }, { stop: 2, delivered: true, address: '18 Birch Lane', x: 10, z: -72 }, { stop: 3, delivered: false, address: '7 Birch Lane', x: 10, z: -105 }];

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}/`;
  const url = (flag) => base + '?user=sam.lee' + (flag ? '&workday3d=1' : '') + (LANG ? `&lang=${LANG}&dev=1` : '');
  const browser = await puppeteer.launch({ executablePath: BROWSER, headless: 'new', args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await browser.newPage();
  await p.setViewport({ width: 1280, height: 720 });
  const errors = [];
  p.on('pageerror', e => errors.push(process.env.QA_STACK ? e.stack : e.message));
  const ev = (f, ...a) => p.evaluate(f, ...a);
  const until = async (fn, ms, arg) => { const t0 = Date.now(); while (Date.now() - t0 < (ms || 15000)) { if (await ev(fn, arg).catch(() => false)) return true; await wait(150); } return false; };
  const sceneIs = async (k) => { const ok = await until((k) => OTR.game.scene.isActive(k) && !OTR.game.scene.getScene(k).sys.isTransitioning(), 20000, k); if (!ok) throw new Error(k + ' never opened'); await wait(400); };
  const texts = (k) => ev((k) => window.__texts(k), k);
  const press = async (k, label) => {
    const t0 = Date.now();
    let ok = false;
    while (Date.now() - t0 < 10000 && (ok = await ev((k, l) => window.__press(k, l), k, label)) === 'disabled') await wait(200);
    if (ok !== true) throw new Error(`no "${label}" on ${k}${ok ? ' (disabled)' : ''}`);
  };
  const shot = async (name) => {
    await wait(1300);
    await p.screenshot({ path: path.join(OUT, `workday-${TAG ? TAG + '-' : ''}${name}.png`) });
    const found = await p.evaluate(`(${AUDIT})()`).catch(e => [{ kind: 'audit-failed', detail: e.message }]);
    check(!found.length, `layout: ${name}`);
    found.slice(0, 8).forEach(f => console.log(`        [${f.kind}] ${f.scene || ''} ${f.what || ''} — ${f.detail || ''}`));
  };
  const S = () => ev(() => JSON.parse(JSON.stringify(OTR.save.data)));
  const boot = async (flag) => {
    await p.goto(url(flag));
    await until(() => window.OTR && OTR.game && OTR.game.scene.isActive('TitleScene'), 30000);
    await wait(600);
    await ev((on) => { if (on.length) { const A = OTR.a11y.settings(); on.forEach(k => { A[k] = true; }); OTR.a11y.save(); } }, ON);
    await ev(helpers);
    await ev(() => OTR.fx.transition(OTR.game.scene.getScene('TitleScene'), 'HubScene'));
    await sceneIs('HubScene');
  };
  const startDay = async () => {
    await press('HubScene', 'Start workday ▶');
    await wait(500);
    await press('HubScene', 'Start ▶');
    await sceneIs('WorkdayStubScene');
  };
  const finish = (summary) => ev((s) => OTR.workday.finish(OTR.game.scene.getScene('WorkdayStubScene'), s), summary);

  try {
    /* ---- off by default: the hub is as it was */
    await boot(false);
    let t = await texts('HubScene');
    check(t.includes('Start the route ▶') && !t.includes('Start workday ▶'), 'flag off: the hub offers the 2D route only');
    check(await ev(() => window.__realScene === 'FirstPersonScene' && !!OTR.game.scene.keys.FirstPersonScene), 'the workday starts the scene registered as FirstPersonScene');

    /* ---- a good day */
    await boot(true);
    t = await texts('HubScene');
    check(t.includes('Start workday ▶') && t.includes('2D route day ›'), 'flag on: Start workday, with the 2D route day below');
    await shot('hub-offer');
    await press('HubScene', 'Start workday ▶');
    await shot('hub-start-confirm');
    await press('HubScene', 'Start ▶');
    await sceneIs('WorkdayStubScene');
    check(await ev(() => window.__started && window.__started.workday && window.__started.workday.resume === false), 'the 3D scene is started with { workday: { resume: false } }');
    await ev((r) => window.__report(r), GOOD);
    const goodExp = await ev((r) => window.__expect(r), GOOD);
    await finish({ seconds: 1380, stops: STOPS.map(s => Object.assign({}, s, { delivered: true })), depot: { x: -12, z: 8 } });
    await sceneIs('ResultsScene'); await wait(2600);
    let s = await S();
    check(s.workday.last && s.workday.last.score === goodExp.score && JSON.stringify(s.workday.last.stars) === JSON.stringify(goodExp.stars), `good day scored ${s.workday.last && s.workday.last.score} (expected ${goodExp.score}), stars ${JSON.stringify(s.workday.last && s.workday.last.stars)}`);
    check(s.route.days === 1 && s.history.length === 1 && s.history[0].id === 'workday' && !s.workday.current, 'good day saved: a route day, a run on the record, nothing in progress');
    t = await texts('ResultsScene');
    check(t.includes('Your workday') && t.includes('9 / 9') && t.includes('FLAWLESS!') && t.includes('3 of 3 stops delivered · 23 min'), 'results: title, 9 / 9 stars, FLAWLESS!, the day in numbers');
    await shot('results-good');
    await press('ResultsScene', 'Drive map');
    await sceneIs('DriveReviewScene');
    check((await texts('DriveReviewScene')).includes('NO DRIVING MISTAKES'), 'drive review: a clean drive');
    await shot('review-good');
    await press('DriveReviewScene', 'Back');
    await sceneIs('ResultsScene'); await wait(2400);
    await press('ResultsScene', 'Debrief ▶');
    await sceneIs('WorkdayDebriefScene');
    t = await texts('WorkdayDebriefScene');
    check(['Morning brief', 'Pre-trip inspection', 'Loading the van', 'Driving', 'Stop 1: 214 Maple Ave', 'End of the day'].every(x => t.includes(x)), 'debrief: every phase and stop has its section');
    const goodLines = await ev(() => OTR.game.scene.getScene('WorkdayDebriefScene').rows.filter(r => !r.head).length);
    check(goodLines === 16, `debrief: one line per kind of check per section (${goodLines})`);
    await shot('debrief-good');
    await press('WorkdayDebriefScene', 'Back to the station ▶');
    await sceneIs('HubScene');
    t = await texts('HubScene');
    check(t.includes('Day 1\'s workday debrief ›') && t.some(x => /^Day 2 /.test(x)), 'hub: the last workday\'s debrief, and the next day');
    await shot('hub-after');

    /* ---- a bad day, left half way and resumed after a reload */
    await startDay();
    await ev((r) => window.__report(r), BAD1);
    await ev(() => OTR.workday.pause(OTR.game.scene.getScene('WorkdayStubScene')));
    await sceneIs('HubScene');
    t = await texts('HubScene');
    check(t.includes('WORKDAY IN PROGRESS') && t.includes('Resume workday ▶') && t.includes('Abandon this workday'), 'paused: the hub offers Resume and Abandon');
    await shot('hub-in-progress');
    await ev(() => OTR.save.flush());
    await wait(500);
    // the 3D world's own save of where it was (the stand-in has none of its own)
    await ev(() => OTR.fpStore.write(Object.assign(OTR.fpStore.empty(), { campaign: OTR.fpMission.create('campaign', 1).snapshot() })));
    await boot(true);
    check((await texts('HubScene')).includes('Resume workday ▶'), 'after a reload the hub still offers Resume');
    await press('HubScene', 'Resume workday ▶');
    await sceneIs('WorkdayStubScene');
    check(await ev(() => window.__started.workday.resume === true && OTR.workday.log.items.length === 14), 'resumed with { resume: true } and the score so far');
    await ev((r) => window.__report(r), BAD1.slice(0, 5));          // the 3D world replays some: not counted twice
    await ev((r) => window.__report(r), BAD2);
    const badExp = await ev((r) => window.__expect(r), BAD1.concat(BAD2));
    await finish({ seconds: 2100, stops: STOPS, depot: { x: -12, z: 8 } });
    await sceneIs('ResultsScene'); await wait(2600);
    s = await S();
    check(s.workday.last.score === badExp.score && JSON.stringify(s.workday.last.stars) === JSON.stringify(badExp.stars), `bad day scored ${s.workday.last.score} (expected ${badExp.score}), stars ${JSON.stringify(s.workday.last.stars)} (expected ${JSON.stringify(badExp.stars)})`);
    const badRatios = await ev((r) => window.__ratios(r), s.workday.last.ratios);
    check(JSON.stringify(badRatios) === JSON.stringify(badExp.ratios), `bad day ratios ${JSON.stringify(badRatios)} (expected ${JSON.stringify(badExp.ratios)})`);
    check(s.workday.last.stars.safety <= 1 && s.workday.last.criticals.length === 2, 'a critical mistake caps safety at one star and is on the record');
    t = await texts('ResultsScene');
    check(t.includes('SAFETY-CRITICAL MISTAKE') && t.includes('Drive map (7)') && t.includes('2 of 3 stops delivered · 35 min'), 'results: critical headline, seven pins, two of three delivered');
    await shot('results-bad');
    await press('ResultsScene', 'Drive map (7)');
    await sceneIs('DriveReviewScene');
    t = await texts('DriveReviewScene');
    check(t.includes('7 MISTAKES ON THE ROAD') && t.some(x => /^1\. /.test(x)), 'drive review: seven mistakes, the first selected');
    check(await ev(() => { const d = OTR.game.scene.getScene('DriveReviewScene'); return d.pinObjs.every(c => c.x > 24 && c.x < 844 && c.y > 84 && c.y < 656); }), 'drive review: every pin on the plan');
    await ev(() => OTR.game.scene.getScene('DriveReviewScene').select(4));
    t = await texts('DriveReviewScene');
    check(t.some(x => /^22 mph/.test(x)), 'drive review: a pin says how fast');
    await shot('review-bad');
    await press('DriveReviewScene', 'Back');
    await sceneIs('ResultsScene'); await wait(2400);
    await press('ResultsScene', 'Debrief ▶');
    await sceneIs('WorkdayDebriefScene');
    const pages = await ev(() => OTR.game.scene.getScene('WorkdayDebriefScene').pages);
    await shot('debrief-bad-1');
    for (let i = 1; i < pages; i++) { await press('WorkdayDebriefScene', '›'); await shot(`debrief-bad-${i + 1}`); }
    const all = await ev(() => { const d = OTR.game.scene.getScene('WorkdayDebriefScene'); return d.rows.map(r => OTR.i18n.src(r.objs[0])); });
    check(all.some(x => /Conflict with a pedestrian .*CRITICAL/.test(x)) && all.some(x => /Exceeded the speed limit {2}\(×2\)/.test(x)) && all.includes('Stop 3: 7 Birch Lane'),
      `debrief: the critical line, the repeated speeding counted once (×2), every stop (${pages} page${pages > 1 ? 's' : ''})`);
    // a driving line's map link opens the review on its pin, and Back returns to the same page
    const pin = await ev(() => { const d = OTR.game.scene.getScene('WorkdayDebriefScene'); const l = d.S.sections.find(x => x.group === 'drive').lines.find(x => x.pin >= 0); d.openReview(l.pin); return l.pin; });
    await sceneIs('DriveReviewScene');
    check(await ev((n) => OTR.game.scene.getScene('DriveReviewScene').pinObjs[n].ring.visible, pin), 'map link opens the review on that pin');
    await press('DriveReviewScene', 'Back');
    await sceneIs('WorkdayDebriefScene');
    await press('WorkdayDebriefScene', 'Back to the station ▶');
    await sceneIs('HubScene');

    /* ---- an empty day */
    await startDay();
    await finish();
    await sceneIs('ResultsScene'); await wait(2600);
    t = await texts('ResultsScene');
    check(t.includes('NOTHING TESTED THIS RUN') && t.includes('0 / 0') && t.includes('Nothing was recorded on this workday.'), 'empty day: nothing tested, no stars, and it says so');
    await shot('results-empty');
    await press('ResultsScene', 'Debrief ▶');
    await sceneIs('WorkdayDebriefScene');
    check((await texts('WorkdayDebriefScene')).includes('Nothing was recorded on this workday.'), 'empty day: the debrief says nothing was recorded');
    await shot('debrief-empty');
    await press('WorkdayDebriefScene', 'Drive review ›');
    await sceneIs('DriveReviewScene');
    await shot('review-empty');
    await press('DriveReviewScene', 'Back');
    await sceneIs('WorkdayDebriefScene');
    await press('WorkdayDebriefScene', 'Back to the station ▶');
    await sceneIs('HubScene');

    /* ---- abandoned: not scored */
    await startDay();
    await ev(() => { OTR.workday.report('brief.read'); OTR.workday.report('drive.speed', { key: 1 }); OTR.workday.pause(OTR.game.scene.getScene('WorkdayStubScene')); });
    await sceneIs('HubScene');
    await press('HubScene', 'Abandon this workday');
    await shot('hub-abandon-confirm');
    await press('HubScene', 'Abandon');
    await sceneIs('HubScene'); await wait(400);
    s = await S();
    t = await texts('HubScene');
    check(!s.workday.current && s.route.days === 3 && s.history.length === 3 && t.includes('Start workday ▶'), 'abandoned: nothing in progress, not scored, Start workday again');

    /* ---- the record, the trainee's and the trainer's */
    await ev(() => OTR.fx.transition(OTR.game.scene.getScene('HubScene'), 'RecordScene', {}));
    await sceneIs('RecordScene');
    check((await ev(() => OTR.game.scene.getScene('RecordScene').R.routeDays)) === 3, 'record: three route days');
    await shot('record-modules');
    await p.keyboard.press('Digit2');
    t = await texts('RecordScene');
    check(t.some(x => / · Workday$/.test(x)) && t.includes('Conflict with a pedestrian'), 'record: the workday\'s critical mistake, named');
    await shot('record-lessons');
    await p.keyboard.press('Digit3');
    t = await texts('RecordScene');
    check(t.filter(x => x === 'Workday').length >= 6, 'record: three workday runs in recent runs');
    await shot('record-recent');
    await ev(() => OTR.save.flush()); await wait(500);
    check(await ev(() => OTR.academy.checkPin('4821')) === true, 'trainer PIN');
    await ev(() => OTR.game.scene.getScene('RecordScene').scene.start('RecordScene', { traineeId: 'sam.lee', name: 'Sam Lee', back: 'HubScene' }));
    await until(() => { const r = OTR.game.scene.getScene('RecordScene'); return r.R && r.d.traineeId; }, 10000);
    check(await ev(() => OTR.game.scene.getScene('RecordScene').R.routeDays === 3 && OTR.game.scene.getScene('RecordScene').R.recent.filter(h => h.id === 'workday').length === 3), 'trainer view: the workdays on the record from the server');
    const html = await ev(() => OTR.record.html(OTR.game.scene.getScene('RecordScene').R, 'Sam Lee', 'sam.lee'));
    check(/Workday: Conflict with a pedestrian/.test(html), 'printed record names the workday');

    /* ---- a saved day with an event type the catalogue no longer has, and a run the registry no longer lists */
    await ev(() => {
      const W = OTR.save.data.workday;
      W.last.events.push({ type: 'drive.retired-type', key: 1, ok: false, stop: null }, { type: 'stop.unknown', key: 'x', ok: true, stop: 9 });
      OTR.save.data.history.push({ id: 'm9-retired', at: Date.now(), assess: false, stars: { safety: 1 }, lessons: ['Old lesson'], criticals: [] });
      OTR.save.write();
    });
    await ev(() => OTR.save.flush()); await wait(500);
    await boot(true);
    await press('HubScene', 'Day 3\'s workday debrief ›');
    await sceneIs('WorkdayDebriefScene');
    await shot('debrief-unknown-type');
    await ev(() => OTR.fx.transition(OTR.game.scene.getScene('WorkdayDebriefScene'), 'RecordScene', {}));
    await sceneIs('RecordScene');
    await p.keyboard.press('Digit3'); await wait(600);
    check((await texts('RecordScene')).includes('m9-retired'), 'record: a run the registry no longer lists shows by its id');

    if (LANG) {
      const missing = await ev(() => [...OTR.i18n.missing.keys()]);
      console.log(`\nnot translated in ${LANG} (${missing.length}), for A-2`);
    }
    check(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.join(' / ') : ''));
  } catch (e) {
    check(false, 'script error: ' + (e && e.stack || e) + (errors.length ? '\n  page errors: ' + errors.join(' / ') : ''));
  } finally {
    await browser.close();
    server.close();
    fs.rmSync(DATA, { recursive: true, force: true });
  }
  console.log(fails.length ? `\n${fails.length} failed` : `\nall workday flow checks passed${TAG ? ' (' + TAG + ')' : ''}`);
  process.exit(fails.length ? 1 : 0);
})();
