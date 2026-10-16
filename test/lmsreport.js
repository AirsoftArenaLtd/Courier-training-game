/*
 * The 3D workday as the LMS sees it (SCORM 1.2 and 2004): a full day that reports every type in the catalogue fits the
 * 4096 characters of suspend data and scores the same after a reload; the course is complete only once a workday is
 * finished, passed only when a day met the academy's pass marks; the score counts the workday's best stars; and a
 * company that turns it off (OTR_DATA.config.lmsWorkday: false), or a visit with ?workday3d=0, gets the old report.
 * No browser.
 *   node test/lmsreport.js
 */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm');
const LMS_LIMIT = 4096;

const context = { console: { warn() {} }, URLSearchParams };
context.window = context; vm.createContext(context);
vm.runInContext(`window.OTR = { util: { clamp01: v => Math.max(0, Math.min(1, v)) }, registry: { get: () => null, all: () => [{}, {}] },
  registerScene() {}, flow: {} }; window.Phaser = { Scene: class {} }; window.location = { search: '' };
  window.addEventListener = () => {};`, context);
for (const f of ['data/theme.js', 'data/config.js', 'data/workday_events.js', 'src/core/scorelog.js', 'src/core/scoring.js',
  'src/core/save.js', 'src/scenes/DriveReviewScene.js', 'src/core/workday.js'])
  vm.runInContext(fs.readFileSync(__dirname + '/../' + f, 'utf8'), context);
const { OTR } = context, W = OTR.workday, SAVE = OTR.save, EV = context.OTR_DATA.workdayEvents;
const CATS = OTR.scoring.CATS;

// the academy, as the LMS report reads it: two modules, both passed, the shipped pass marks
let academy = { complete: true, passedAll: true };
OTR.academy = { summary: () => ({ total: 2, passed: 2, attempted: 2, ...academy }), get: () => ({ passStars: { safety: 2, efficiency: 2, service: 2 } }) };

const lms = { store: {}, refused: 0, longest: 0, reports: [] };
const scorm = (v2004) => ({
  v2004,
  get: (k) => lms.store[k] || '',
  set: (k, v) => { v = String(v); lms.longest = Math.max(lms.longest, v.length); if (!v2004 && k === 'cmi.suspend_data' && v.length > LMS_LIMIT) { lms.refused++; return false; } lms.store[k] = v; return true; },
  commit: () => true, finish() {},
  report(o) { lms.reports.push(o); }
});
const fresh = (v2004) => {
  OTR.identity = { mode: 'scorm', scorm: scorm(v2004) }; SAVE.ephemeral = false;
  lms.store = {}; lms.refused = 0; lms.longest = 0; lms.reports = [];
  SAVE.data = SAVE.defaults(); SAVE.data.profile = { name: 'Sam Rivera', id: 'lms042', createdAt: 1 };
  SAVE.totals = () => ({ all: 12 });                       // twelve of the modules' eighteen stars
  context.OTR_DATA.config.lmsWorkday = true; context.window.location = { search: '' };
  W.detach();
};
const reload = () => { W.detach(); SAVE.data = null; SAVE.load(); };
const last = () => lms.reports[lms.reports.length - 1];

// a day: every type in the catalogue reported at each of the five stops, right (good) or wrong / as a mistake (bad)
const day = (good) => {
  const list = [];
  Object.keys(EV).forEach((t, i) => {
    const e = EV[t];
    for (let s = 1; s <= 5; s++) {
      const stop = e.phase === 'stop' ? s : undefined;
      if (e.kind === 'check') list.push([t, { key: i * 10 + s, stop, ok: good, where: { x: i, z: -s, mph: 12 } }]);
      else if (!good && e.kind === 'penalty') list.push([t, { key: i * 10 + s, stop, where: { x: i, z: -s, mph: 31 } }]);
      else if (good && e.kind === 'bonus') list.push([t, { key: i * 10 + s, stop }]);
    }
  });
  return list;
};
const play = (list) => list.forEach(([t, d]) => W.report(t, d));
const finishDay = (good) => { W.start(null); play(day(good)); const rec = W.finish(null, {}); SAVE.write(); return rec; };

test('a full five-stop day that reports every type fits SCORM 1.2 and scores the same after a reload', () => {
  fresh(false);
  W.start(null);
  const list = day(false);
  assert.ok(['load.count', 'drive.school-bus', 'stop.dog', 'stop.age-check'].every(t => EV[t]), 'the catalogue has the full-day types');
  play(list);
  const live = W.log.score();
  assert.equal(lms.refused, 0, 'the LMS never refused a save');
  assert.ok(lms.longest <= SAVE.SCORM12_LIMIT, `every save within the limit (longest ${lms.longest})`);
  reload();
  assert.ok(W.active(), 'a reload still has the workday in progress');
  W.resume(null);
  assert.equal(W.log.score(), live, 'the reloaded score is the same');
  play(list);
  assert.equal(W.log.score(), live, 'a replay of the whole day counts nothing twice');
});

test('the course is not complete until a workday is finished', () => {
  fresh(false);
  SAVE.write();
  assert.equal(last().complete, false, 'modules all passed, no workday yet: incomplete');
  assert.equal(last().passed, false);
});

test('a good day completes and passes the course; the score counts its stars', () => {
  fresh(false);
  const rec = finishDay(true);
  const need = { safety: 2, efficiency: 2, service: 2 };
  assert.ok(CATS.every(c => rec.stars[c] >= need[c]), 'the good day met the pass marks: ' + JSON.stringify(rec.stars));
  const r = last();
  assert.equal(r.complete, true); assert.equal(r.passed, true);
  const stars = CATS.reduce((a, c) => a + rec.stars[c], 0);
  assert.ok(Math.abs(r.score - (12 + stars) / (3 * 9) * 100) < 1e-9, 'the score is out of the modules plus the workday');
});

test('a bad day completes the course but does not pass it; a later good day does', () => {
  fresh(false);
  const bad = finishDay(false);
  assert.ok(CATS.some(c => bad.stars[c] < 2), 'the bad day missed a pass mark: ' + JSON.stringify(bad.stars));
  assert.equal(last().complete, true); assert.equal(last().passed, false);
  const good = finishDay(true);
  assert.ok(CATS.every(c => good.stars[c] >= 2));
  assert.equal(last().complete, true); assert.equal(last().passed, true, 'the best day counts');
});

test('modules not passed keep the course unpassed even after a good day', () => {
  fresh(false);
  academy = { complete: true, passedAll: false };
  try { finishDay(true); assert.equal(last().complete, true); assert.equal(last().passed, false); }
  finally { academy = { complete: true, passedAll: true }; }
});

test('SCORM 2004 gets the same completion and success', () => {
  fresh(true);
  assert.equal(OTR.identity.scorm.v2004, true);
  finishDay(true);
  assert.equal(last().complete, true); assert.equal(last().passed, true);
});

test('lmsWorkday: false, or ?workday3d=0, reports as before the workday', () => {
  fresh(false);
  context.OTR_DATA.config.lmsWorkday = false;
  SAVE.write();
  assert.equal(last().complete, true, 'modules done is enough');
  assert.equal(last().passed, true);
  assert.ok(Math.abs(last().score - 12 / 18 * 100) < 1e-9, 'the score is the modules only');
  fresh(false);
  context.window.location = { search: '?workday3d=0' };
  SAVE.write();
  assert.equal(last().complete, true); assert.ok(Math.abs(last().score - 12 / 18 * 100) < 1e-9);
});
