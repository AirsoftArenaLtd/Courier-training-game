/*
 * A save from before milestones 7 and 8 still works (B-41): no town seed, no aids code, no criticals by type, no
 * `route.passed`, workday records as they were. It loads from the LMS, keeps its standing, reviews its old day,
 * prints, and plays a new day on top. No browser.
 *   node test/oldsave.js
 */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm');

const context = { console: { warn() {} }, URLSearchParams };
context.window = context; vm.createContext(context);
vm.runInContext(`window.OTR = { util: { clamp01: v => Math.max(0, Math.min(1, v)) }, registry: { get: () => null, all: () => [], modules: () => [] },
  registerScene() {}, flow: {} }; window.Phaser = { Scene: class {} }; window.location = { search: '' };
  window.addEventListener = () => {};`, context);
for (const f of ['data/theme.js', 'data/config.js', 'data/workday_events.js', 'src/core/scorelog.js', 'src/core/scoring.js',
  'src/core/save.js', 'src/scenes/DriveReviewScene.js', 'src/core/workday.js', 'src/core/record.js'])
  vm.runInContext(fs.readFileSync(__dirname + '/../' + f, 'utf8'), context);
const { OTR } = context, W = OTR.workday, SAVE = OTR.save;
const plain = (o) => JSON.parse(JSON.stringify(o));

// an LMS that holds the save as it was written before milestone 7
const lms = { store: {}, reports: [] };
OTR.identity = { mode: 'scorm', scorm: { v2004: false, get: (k) => lms.store[k] || '', set: (k, v) => { lms.store[k] = String(v); return true; },
  commit: () => true, report: (r) => lms.reports.push(r), finish() {} } };
OTR.academy = { summary: () => ({ complete: true, passedAll: true }), get: () => ({ passStars: { safety: 1, efficiency: 1, service: 1 } }) };

const T0 = 1760000000000, stars = { safety: 2, efficiency: 2, service: 3 };
const OLD = {
  version: 3, profile: { name: 'Sam Rivera', id: 'lms042', createdAt: T0 }, day: 6, savedAt: T0 + 9,
  settings: { muted: false, volume: 0.8 },
  scenarios: { 'm1-driving': { plays: 2, bestScore: 800, bestStars: stars, lastPlayed: T0 } },
  assess: { 'm1-driving': { passed: true, at: T0 } },
  history: [
    { id: 'm1-driving', at: T0, assess: true, score: 800, stars, dur: 300, criticals: [], lessons: [] },
    { id: 'workday', kind: 'workday', at: T0 + 1, assess: false, score: 2100, stars, dur: 1500, criticals: ['Rolled through a stop sign'], lessons: ['A full stop behind the line, then look both ways before you go.'] }
  ],
  route: { days: 1, best: stars, history: [{ kind: 'workday', day: 5, at: T0 + 1, stars, ratios: { safety: 0.7, efficiency: 0.8, service: 1 }, delivered: 3, minutes: 25 }] },
  workday: {
    current: null,
    last: { id: 'w1', day: 5, at: T0 + 1, seconds: 1500, stars, ratios: { safety: 0.7, efficiency: 0.8, service: 1 }, score: 2100,
      untested: [], criticals: ['Rolled through a stop sign'], lessons: ['A full stop behind the line, then look both ways before you go.'],
      depot: { x: 4, z: 8 }, stops: [{ stop: 1, delivered: true, x: 20, z: -30 }, { stop: 2, delivered: false, x: 60, z: -30 }], delivered: 1,
      events: [{ type: 'drive.stop-line', key: 'j1', ok: false, stop: null, where: { x: 30, z: -30, mph: 9 } }, { type: 'drive.speed', key: 's1', ok: true, stop: null }] }
  }
};
const loadOld = () => { lms.store = { 'cmi.suspend_data': JSON.stringify(OLD) }; W.detach(); SAVE.data = null; SAVE.load(); };

test('an old save loads with its standing, and the LMS still sees its workday finished and passed', () => {
  loadOld();
  const S = SAVE.data;
  assert.equal(S.profile.name, 'Sam Rivera');
  assert.equal(S.route.days, 1);
  assert.equal(S.route.passed, undefined, 'the old save has no passed flag');
  const st = W.lmsState();
  assert.ok(st.finished, 'finished, from the old route history');
  assert.ok(st.passed, 'passed, from the old day\'s stars');
  assert.equal(JSON.stringify(st.stars), JSON.stringify(stars));
});

test('the old day reviews: its pins come from its events, and the map has no town to draw', () => {
  loadOld();
  const last = SAVE.data.workday.last, data = W.reviewData(last, { items: [] });
  assert.equal(data.plan.townSeed, undefined);
  assert.equal(vm.runInContext('DriveReviewScene.prototype.planStreets', context)(data.plan), null, 'no streets without a seed');
  assert.equal(data.plan.stops.length, 2);
  const debrief = W.sections(last);
  assert.ok(debrief && debrief.sections, 'the debrief builds');
  assert.equal(debrief.pins.length, 1, 'the old stop-line mistake is a pin on the map');
});

test('the old record prints its workdays without a help column value or critical types', () => {
  loadOld();
  const R = OTR.record.build(SAVE.data);
  assert.equal(R.workdays.length, 1);
  const html = OTR.record.html(R, 'Sam Rivera', 'lms042');
  assert.match(html, /Workdays/);
  assert.doesNotMatch(html, /undefined|NaN/, 'nothing undefined printed for the fields the old day lacks');
});

test('a new day on top of the old save adds to it and keeps everything it had', () => {
  loadOld();
  const leave = W.leave; W.leave = () => {};
  let rec;
  try {
    W.start(null);
    W.report('brief.read'); W.report('drive.sign-stop', { key: 'sign1', ok: true, where: { x: 1, z: 2, mph: 0 } });
    rec = W.finish({ model: { routePlan: { townSeed: 7 } } }, { stops: [] });
  } finally { W.leave = leave; }
  const S = SAVE.data;
  assert.equal(S.route.days, 2);
  assert.equal(rec.townSeed, 7);
  assert.ok(W.lmsState().passed, 'still passed: the old day met the marks, whatever today\'s stars');
  assert.equal(S.history.filter(h => h.id === 'workday').length, 2, 'the old workday is still on record');
  assert.equal(JSON.stringify(plain(S.assess['m1-driving']).passed), 'true');
  // and it all comes back from the LMS
  W.detach(); SAVE.data = null; SAVE.load();
  assert.equal(SAVE.data.route.days, 2);
  assert.equal(OTR.record.build(SAVE.data).workdays.length, 2);
  assert.ok(lms.reports.length > 0 && lms.reports[lms.reports.length - 1].complete, 'the LMS was told the course is complete');
});
