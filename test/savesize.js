/*
 * SCORM 1.2's 4096 characters of suspend data (src/core/save.js, fit): a long workday on top of a heavy save must
 * always be stored within the limit, reload to the same score, and not count a replayed report twice. No browser.
 *   node test/savesize.js
 */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm');
const LMS_LIMIT = 4096;                                          // what a SCORM 1.2 LMS accepts in cmi.suspend_data

const context = { console: { warn() {} }, URLSearchParams };
context.window = context; vm.createContext(context);
vm.runInContext(`window.OTR = { util: { clamp01: v => Math.max(0, Math.min(1, v)) }, registry: { get: () => null, all: () => [] },
  registerScene() {}, flow: {} }; window.Phaser = { Scene: class {} }; window.location = { search: '' };
  window.addEventListener = () => {};`, context);
for (const f of ['data/theme.js', 'data/config.js', 'data/workday_events.js', 'src/core/scorelog.js', 'src/core/scoring.js',
  'src/core/save.js', 'src/scenes/DriveReviewScene.js', 'src/core/workday.js'])
  vm.runInContext(fs.readFileSync(__dirname + '/../' + f, 'utf8'), context);
const { OTR } = context, W = OTR.workday, SAVE = OTR.save;

// a SCORM 1.2 LMS that refuses (and records) anything over its limit, as a strict one does
const lms = { store: {}, refused: 0, longest: 0 };
const scorm = (v2004) => ({
  v2004,
  get: (k) => lms.store[k] || '',
  set: (k, v) => { v = String(v); lms.longest = Math.max(lms.longest, v.length); if (!v2004 && k === 'cmi.suspend_data' && v.length > LMS_LIMIT) { lms.refused++; return false; } lms.store[k] = v; return true; },
  commit: () => true, report() {}, finish() {}
});
const asScorm = (v2004) => { OTR.identity = { mode: 'scorm', scorm: scorm(v2004) }; SAVE.ephemeral = false; lms.store = {}; lms.refused = 0; lms.longest = 0; };
const stored = () => JSON.parse(lms.store['cmi.suspend_data']);
const reload = () => { W.detach(); SAVE.data = null; SAVE.load(); };

// a trainee well into the course: many scored runs, ten route days, a finished workday with its debrief
const heavy = (o) => {
  o = o || {};
  const d = SAVE.defaults();
  d.profile = { name: 'Sam Rivera', id: 'lms042', createdAt: 1 };
  d.day = 12;
  for (let i = 0; i < (o.scenarios ?? 14); i++) d.scenarios['m' + i + '-scenario-with-a-long-id'] = { plays: 3, bestScore: 900, bestStars: { safety: 3, efficiency: 2, service: 3 }, lastPlayed: 1760000000000 + i };
  for (let i = 0; i < 10; i++) d.route.history.push({ kind: 'workday', day: i + 1, at: 1760000000000 + i, stars: { safety: 2, efficiency: 3, service: 1 }, ratios: { safety: 0.71, efficiency: 0.93, service: 0.5 }, delivered: 3, minutes: 24 });
  d.route.days = 10; d.route.best = { safety: 3, efficiency: 3, service: 2 };
  d.history = [];
  for (let i = 0; i < (o.runs ?? 40); i++) d.history.push({ id: 'm2-sort', at: 1760000000000 + i, assess: false, score: 700, stars: { safety: 2, efficiency: 2, service: 3 }, dur: 300, criticals: [], lessons: ['Load in stop order so each package is where you expect it.', 'Scan every package as you load it.'] });
  d.assess = { 'm2-sort': { passed: true, at: 1760000000000 } };
  const ev = [];
  for (let i = 0; i < 40; i++) ev.push({ type: 'drive.speed', key: 'old' + i, ok: true, stop: null, where: { x: i, z: -i, mph: 30 } });
  d.workday = { current: null, last: { id: 'x', day: 11, at: 1760000000000, stars: { safety: 1, efficiency: 2, service: 3 }, ratios: { safety: 0.2, efficiency: 0.8, service: 1 }, score: 1200, untested: [], criticals: [], lessons: [], stops: [], delivered: 3, events: ev } };
  SAVE.data = d;
  W.detach();
};

// a long, bad day: n driving mistakes with their places, and every stop's reports
const longDay = (n, stops) => {
  const list = [['brief.read'], ['inspect.tires', { ok: false }], ['inspect.lights']];
  for (let s = 1; s <= (stops || 12); s++) {
    list.push(['scan.load', { key: 'p' + s }], ['load.shelf', { key: 'p' + s, ok: s % 3 !== 0 }]);
    list.push(['scan.stop', { key: 'p' + s, stop: s }], ['deliver.outcome', { key: s, stop: s, ok: s % 4 !== 0 }]);
  }
  for (let i = 0; i < n; i++) {
    list.push(['drive.speed', { key: i, where: { x: 1.234 * i, z: -3.21 * i, mph: 31.6, t: 60 + i } }]);
    if (i % 2) list.push(['drive.stop-line', { key: i, ok: i % 4 !== 1, where: { x: 2 * i, z: -i, mph: 9.2 } }]);
  }
  return list;
};
const play = (list) => list.forEach(([t, d]) => W.report(t, d));
const summary = (log) => ({ score: log.score(), ratios: JSON.stringify(log.ratios(OTR.scoring.CATS)), crit: log.criticals().length, items: log.items.length });

// play a day on a heavy save, check every write stayed in the limit, reload and check the score, replay and check again
// (quick: the day's reports are saved once at the end, not after each one; the last test checks each one)
const roundTrip = (heavyOpts, n, stops, quick) => {
  asScorm(false);
  heavy(heavyOpts);
  W.start(null);
  const list = longDay(n, stops);
  if (quick) { const p = W.persist; W.persist = () => {}; try { play(list); } finally { W.persist = p; } W.persist(); } else play(list);
  const live = summary(W.log);
  assert.equal(lms.refused, 0, 'the LMS never refused a save');
  assert.ok(lms.longest <= SAVE.SCORM12_LIMIT, `every save within the limit (longest ${lms.longest})`);
  const saved = stored();
  reload();
  assert.ok(W.active(), 'a reload still has the workday in progress');
  W.resume(null);
  assert.equal(W.log.score(), live.score, 'the reloaded score is the same');
  assert.equal(JSON.stringify(W.log.ratios(OTR.scoring.CATS)), live.ratios, 'the reloaded ratios are the same');
  assert.equal(W.log.items.length, live.items, 'every report counted once');
  return { saved, live, list };
};
const stage = (s) => {
  const c = s.workday && s.workday.current;
  if (!c) return 'none';
  return c.truncated ? 'truncated' : c.summary ? 'summary' : c.packed ? 'packed' : 'full';
};

test('a small save goes to the LMS as it is', () => {
  asScorm(false);
  heavy({ runs: 0, scenarios: 2 });
  SAVE.data.workday.last.events = [];
  W.start(null); play(longDay(2, 2));
  const s = stored();
  assert.equal(stage(s), 'full'); assert.equal(s.route.history.length, 10);
});

test('step 1 and 2: old route history and the last workday\'s lines go first', () => {
  const { saved } = roundTrip({ runs: 0, scenarios: 6 }, 4, 3);
  assert.equal(stage(saved), 'full', 'the day in progress is untouched');
  assert.ok(saved.route.history.length < 10, 'route history trimmed');
});

test('step 3: a long day is packed, and comes back whole, places and all', () => {
  const { saved, live } = roundTrip({ runs: 2, scenarios: 4 }, 40, 6);
  assert.equal(stage(saved), 'packed');
  assert.equal(saved.history.length, 2, 'the trainee record is kept');
  const pins = OTR.drive.pins(W.log);
  assert.equal(pins.length, 40 + 10, 'every driving mistake still has its pin');
  assert.deepEqual({ ...pins[1].where }, { x: 1.2, z: -3.2, mph: 32, t: 61 });
  // the 3D world replays what it had reported: nothing counts twice
  play(longDay(40, 6));
  assert.equal(W.log.score(), live.score); assert.equal(W.log.items.length, live.items);
  // finished: the debrief has its stops
  const rec = W.finish(null, {});
  assert.equal(rec.score, live.score);
  assert.ok(W.sections(rec).sections.some(x => x.group === 'stop6'));
});

test('step 4 and 5: a very long day on a heavy save keeps its score only, and says so', () => {
  const { saved, live } = roundTrip({ runs: 60, scenarios: 2 }, 60, 6);
  assert.equal(stage(saved), 'summary');
  assert.equal(saved.history.length, 10, 'the record keeps its ten latest runs before the day loses detail');
  assert.ok(W.current.summarised, 'flagged, for the hub to say so');
  play(longDay(60, 6));
  assert.equal(W.log.score(), live.score, 'a replay of the whole day counts nothing twice');
  // a second reload from a summarised save is still right
  W.persist(); reload(); W.resume(null);
  assert.equal(W.log.score(), live.score);
});

test('step 7: a day too long even for the summary keeps its total, flagged truncated', () => {
  const { saved, live, list } = roundTrip({ runs: 60, scenarios: 14 }, 900, 12, true);
  assert.equal(stage(saved), 'truncated');
  assert.ok(W.current.truncated);
  assert.equal(W.log.score(), live.score);
  // the reports whose keys the save kept are not counted again when the 3D world sends them again
  const kept = new Set();
  saved.workday.current.summary.forEach(r => [...(r[1] || []), ...(r[2] || [])].forEach(k => kept.add(r[0] + '|' + k)));
  assert.ok(kept.size > 100, 'most keys kept (' + kept.size + ')');
  play(list.filter(([t, d]) => kept.has(t + '|' + ((d && d.key) ?? ''))));
  assert.equal(W.log.score(), live.score);
  // a new report still counts once, and a reload after it keeps the new total
  W.report('drive.belt', { key: 1 });
  const now = W.log.score();
  assert.ok(lms.longest <= SAVE.SCORM12_LIMIT && lms.refused === 0);
  reload(); W.resume(null);
  assert.equal(W.log.score(), now);
  const rec = W.finish(null, {});
  assert.equal(rec.score, now);
  assert.ok(stored().workday.last && stored().workday.last.score === now, 'the finished day is saved');
});

test('step 8: a save too big for anything else still reaches the LMS within the limit', () => {
  const { saved, live } = roundTrip({ runs: 400, scenarios: 120 }, 900, 12, true);
  assert.equal(saved.truncated, true);
  assert.equal(saved.profile.id, 'lms042');
  assert.equal(W.log.score(), live.score);
});

test('every write of a long day stays within the limit, from the first report to the last', () => {
  asScorm(false);
  heavy({ runs: 10, scenarios: 2 });
  W.start(null);
  const stages = new Set();
  longDay(1200, 12).forEach(([t, d]) => {
    W.report(t, d);
    const raw = lms.store['cmi.suspend_data'];
    assert.ok(raw.length <= SAVE.SCORM12_LIMIT);
    stages.add(stage(JSON.parse(raw)));
  });
  assert.equal(lms.refused, 0);
  assert.ok(['full', 'packed', 'summary', 'truncated'].every(x => stages.has(x)), 'the day went down the whole ladder: ' + [...stages]);
});

test('SCORM 2004 and local saves are not cut', () => {
  asScorm(true);
  heavy({ runs: 60 });
  W.start(null); play(longDay(160, 12));
  const s = stored();
  assert.equal(stage(s), 'full'); assert.equal(s.history.length, 60);
  assert.ok(lms.store['cmi.suspend_data'].length > LMS_LIMIT);
  const box = {};
  context.localStorage = { getItem: (k) => box[k] || null, setItem: (k, v) => { box[k] = v; }, removeItem: (k) => { delete box[k]; } };
  OTR.identity = { mode: 'local' };
  SAVE.write();
  const local = JSON.parse(box[SAVE.KEY]);
  assert.equal(stage(local), 'full'); assert.equal(local.history.length, 60); assert.equal(local.workday.last.events.length, 40);
  delete context.localStorage;
});
