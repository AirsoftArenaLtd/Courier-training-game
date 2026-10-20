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

// a day of the milestone 7 to 9 work package (A-27): five legs with mirrors, signals, gear changes, signs, lights and the
// route checked all the way, a few mistakes, damage and the post-trip report, five stops with the new stop types
const packageDay = () => {
  const list = [['brief.read'], ['inspect.tires'], ['inspect.lights'], ['inspect.damage', { key: 'rear' }]];
  for (let s = 1; s <= 5; s++) list.push(['scan.load', { key: 'p' + s }], ['load.shelf', { key: 'p' + s }]);
  list.push(['load.secured'], ['load.count']);
  const at = (i) => ({ x: 3.17 * i, z: -11.3 * i, mph: 18.4, t: 40 * i });
  let i = 0;
  for (let leg = 1; leg <= 5; leg++) {
    for (let k = 0; k < 6; k++) list.push(['drive.mirrors', { key: `${leg}.${k}`, where: at(++i) }], ['drive.signal', { key: `${leg}.${k}`, where: at(++i) }]);
    list.push(['drive.gear', { key: `${leg}.d`, where: at(++i) }], ['drive.gear', { key: `${leg}.r`, where: at(++i) }]);
    ['drive.sign-stop', 'drive.sign-giveway', 'drive.sign-speed', 'drive.sign-school'].forEach((ty, n) => list.push([ty, { key: `${leg}.${n}`, where: at(++i) }]));
    list.push(['drive.lights', { key: leg, where: at(++i) }], ['drive.route', { key: leg, ok: leg !== 3, where: at(++i) }], ['drive.following', { key: leg, where: at(++i) }]);
    list.push(['drive.backing', { key: leg, ok: leg !== 4, where: at(++i) }]);
    list.push(['scan.stop', { key: 'p' + leg, stop: leg }], ['deliver.outcome', { key: leg, stop: leg }], [['stop.intercom', 'stop.reception', 'stop.locker', 'stop.reattempt', 'stop.dog'][leg - 1], { key: leg, stop: leg }]);
  }
  list.push(['drive.signal', { key: 'x1', ok: false, where: at(++i) }], ['drive.sign-stop', { key: 'x2', ok: false, where: at(++i) }]);
  list.push(['van.damage-scuff', { key: 'left:post', where: at(++i) }], ['drive.clearance', { key: 'bridge1', where: at(++i) }], ['load.shift', { key: 'corner2', where: at(++i) }]);
  list.push(['trip.damage-report', { key: 'left' }], ['return.scanned', { key: 'p5' }]);
  return list;
};

test('A-27: a full day of the cab, sign, route, night and damage events keeps every report and every pin on a normal save', () => {
  asScorm(false);
  heavy({ runs: 2, scenarios: 4 });
  W.start(null);
  const list = packageDay();
  play(list);
  const live = summary(W.log), pinsLive = OTR.drive.pins(W.log).length;
  assert.equal(lms.refused, 0, 'the LMS never refused a save');
  assert.ok(list.length > 140, `a busy day: ${list.length} reports`);
  assert.equal(stage(stored()), 'packed', 'the day is packed, not summarised: stops and drive-review pins are kept');
  reload(); W.resume(null);
  assert.equal(W.log.score(), live.score, 'the reloaded score is the same');
  assert.equal(OTR.drive.pins(W.log).length, pinsLive, 'every mistake keeps its pin on the drive review');
  assert.ok(pinsLive >= 6, `pins for the mistakes and penalties (${pinsLive})`);
  play(list);                                                     // the 3D world replays: nothing counts twice
  assert.equal(W.log.score(), live.score);
});

// B-52: the worst milestone 8 day: the A-27 day plus everything C-30 to C-32 can report in one day, with C-32's own keys
// (each signal approach, give-way approach and the school crossing report at most once a day): three signals met on red
// from two sides (one run through), both give-way approaches, a cyclist on every leg, the crossing, a wrong turn on every
// leg, and the one-way, road-works and no-entry signs, with the critical ones failed
const milestone8Day = () => {
  const list = packageDay(), at = (i) => ({ x: 2.71 * i, z: -9.4 * i, mph: 21.3, t: 30 * i });
  let i = 200;
  [[1, 2], [2, 1], [3, 3]].forEach(([row, col]) => ['n', 'e'].forEach(ap => list.push(['drive.red-light', { key: `signal:${row}:${col}:${ap}`, ok: !(row === 2 && ap === 'e'), where: at(++i) }])));
  ['e', 'w'].forEach(ap => list.push(['drive.sign-giveway', { key: `yield:14:${ap}`, ok: ap === 'e', where: at(++i) }]));
  for (let leg = 0; leg < 5; leg++) list.push(['drive.cyclist', { key: 'cyclist:' + leg, ok: leg !== 2, where: at(++i) }], ['drive.route', { key: 'leg' + leg, ok: leg !== 4, where: at(++i) }]);
  list.push(['drive.hazard-early', { key: 'school-crossing', ok: false, where: at(++i) }], ['drive.pedestrian', { key: 'school-crossing', where: at(++i) }]);
  list.push(['drive.sign-oneway', { key: 'oneway:3', where: at(++i) }], ['drive.sign-roadworks', { key: 'roadworks:2', ok: true, where: at(++i) }], ['drive.sign-noentry', { key: 'noentry:2', where: at(++i) }]);
  return list;
};

test('B-52: the worst milestone 8 day stays within SCORM 1.2, keeps its score, and names each critical type for the LMS', () => {
  asScorm(false);
  heavy({ runs: 2, scenarios: 4 });
  W.start(null);
  const list = milestone8Day();
  play(list);
  const live = summary(W.log), pinsLive = OTR.drive.pins(W.log).length;
  assert.equal(lms.refused, 0, 'the LMS never refused a save');
  assert.ok(lms.longest <= SAVE.SCORM12_LIMIT, `every save within the limit (longest ${lms.longest} of ${SAVE.SCORM12_LIMIT})`);
  assert.ok(list.length > 165, `a very busy day: ${list.length} reports`);
  // packed at 3,901 of 4,096 characters when written (B-52): the drive-map pins survive a reload; a summary would lose them
  assert.equal(stage(stored()), 'packed', 'the day is packed, not summarised');
  reload(); W.resume(null);
  assert.equal(W.log.score(), live.score, 'the reloaded score is the same');
  assert.equal(OTR.drive.pins(W.log).length, pinsLive, 'every mistake keeps its pin');
  play(list);                                                     // the 3D world replays: nothing counts twice
  assert.equal(W.log.score(), live.score);
  // finished: the record names each critical mistake by type, in the order of its labels (B-22), and so does xAPI
  const rec = W.finish(null, { stops: [1, 2, 3, 4, 5].map(stop => ({ stop, delivered: stop !== 3 })) });
  ['drive.red-light', 'drive.pedestrian', 'drive.sign-noentry'].forEach(t => assert.ok(rec.criticalTypes.includes(t), t + ' is on the record as critical'));
  assert.ok(rec.stars.safety <= 1, 'the critical mistakes cap safety at one star');
  const xapi = require('../server/xapi.js').statementsFor({ id: 'lms042', name: 'Sam Rivera' }, rec, 'https://training.example', { safety: 2, efficiency: 2, service: 2 });
  const mistakes = xapi[0].result.extensions[Object.keys(xapi[0].result.extensions).find(k => k.endsWith('criticalMistakes'))];
  assert.equal(JSON.stringify(mistakes.map(x => x.type).sort()), JSON.stringify([...rec.criticalTypes].sort()), 'xAPI names every critical mistake by type');
  assert.equal(xapi[0].result.success, false, 'not a pass with safety capped');
  const state = W.lmsState();
  assert.ok(state.finished && state.stars.safety >= rec.stars.safety, 'the LMS sees the day finished');
  // the debrief has a line for every milestone 8 type the day reported
  const lines = W.sections(rec).sections.flatMap(s => s.lines).map(l => l.label);
  ['drive.red-light', 'drive.sign-giveway', 'drive.cyclist', 'drive.hazard-early', 'drive.route', 'drive.pedestrian', 'drive.sign-noentry'].forEach(t => {
    const E = context.OTR_DATA.workdayEvents[t];
    assert.ok(lines.includes(E.fail || E.label) || lines.includes(E.label), 'the debrief has a line for ' + t);
  });
});

test('B-16: a day with a mirror check on every turn (C-23 keys) stays packed, keeps its score and its pins', () => {
  asScorm(false);
  heavy({ runs: 2, scenarios: 4 });
  W.start(null);
  // C-23 reports drive.mirrors at every turn or lane change, keyed turn:<leg>:<n>: twenty a leg, a few missed
  const list = packageDay().filter(([t]) => t !== 'drive.mirrors');
  let i = 0;
  for (let leg = 1; leg <= 5; leg++) for (let n = 1; n <= 20; n++) {
    i++; list.push(['drive.mirrors', { key: `turn:${leg}:${n}`, ok: i % 23 !== 0, where: { x: 1.91 * i, z: -7.7 * i, mph: 14.2, t: 25 * i } }]);
  }
  play(list);
  const live = summary(W.log), pinsLive = OTR.drive.pins(W.log).length;
  assert.equal(lms.refused, 0, 'the LMS never refused a save');
  assert.ok(lms.longest <= SAVE.SCORM12_LIMIT, `every save within the limit (longest ${lms.longest})`);
  assert.equal(stage(stored()), 'packed', 'the day is packed, not summarised');
  reload(); W.resume(null);
  assert.equal(W.log.score(), live.score, 'the reloaded score is the same');
  assert.equal(OTR.drive.pins(W.log).length, pinsLive, 'every missed mirror check keeps its pin');
  play(list);                                                     // every key came back exactly: nothing counts twice
  assert.equal(W.log.score(), live.score);
});

test('B-16: runs of numbered keys pack once and come back exactly, in order', () => {
  const cases = [
    ['turn:1:1', 'turn:1:2', 'turn:1:3', 'turn:2:1', 'turn:2:2', 'turn:2:3', 'turn:2:4'],
    ['a1', 'a2', 'b', 'a3', 'a4', 'a5', 7, 8, 9, 'x07', 'x08', 'x09', 'x9', 'x10', 'x11', '1.0', '1.1', '1.2', 'n5', 'n4', 'n3'],
    []
  ];
  cases.forEach(keys => {
    const packed = SAVE.packRuns(keys);
    assert.equal(JSON.stringify(SAVE.unpackRuns(JSON.parse(JSON.stringify(packed)))), JSON.stringify(keys));
  });
  assert.equal(JSON.stringify(SAVE.packRuns(cases[0])), '[["turn:1:",1,3],["turn:2:",1,4]]');
  assert.equal(JSON.stringify(SAVE.unpackRuns([['p', 3, 1], [5, 1, 2], 'k'])), '["k"]', 'a damaged range is dropped, not expanded');
});

test('A-27: on a heavy save the same day keeps its score; a whole course of stars and assessments is never lost', () => {
  asScorm(false);
  heavy();
  W.start(null);
  play(packageDay());
  const live = summary(W.log);
  assert.equal(lms.refused, 0);
  reload(); W.resume(null);
  assert.equal(W.log.score(), live.score, 'the score survives (the day may be summarised)');
  // a trainee who has passed the whole course: 27 scenarios played and assessed, with their lessons
  const ids = []; for (let m = 1; m <= 8; m++) for (let s = 0; s < 4; s++) ids.push(`m${m}-scenario${s}`);
  const d = SAVE.defaults(); d.profile = { name: 'Sam Rivera', id: 'lms042', createdAt: 1 }; d.day = 30; d.assess = {};
  ids.forEach((id, i) => {
    d.scenarios[id] = { plays: 4, bestScore: 870, bestStars: { safety: 3, efficiency: 2, service: 3 }, lastPlayed: 29333333 * 60000 + i * 60000 };   // times are kept to the minute
    d.assess[id] = { attempts: 1, passed: true, at: 29333333 * 60000 + i * 60000, stars: { safety: 3, efficiency: 2, service: 3 }, score: 870, criticals: [], lessons: ['Scan every package as you load it.'], pending: false };
  });
  const packed = SAVE.fit(JSON.stringify(d), SAVE.SCORM12_LIMIT), back = SAVE.unpackCareer(JSON.parse(packed));
  assert.ok(JSON.stringify(d).length > 2 * SAVE.SCORM12_LIMIT, 'as plain JSON the course is far over the limit');
  assert.ok(packed.length <= SAVE.SCORM12_LIMIT);
  assert.equal(JSON.stringify(back.scenarios), JSON.stringify(d.scenarios), 'every scenario record comes back exactly');
  const verdict = (a) => JSON.stringify(Object.fromEntries(Object.entries(a).map(([k, r]) => [k, { attempts: r.attempts, passed: r.passed, at: r.at, stars: r.stars, score: r.score, criticals: r.criticals.length }])));
  assert.equal(verdict(back.assess), verdict(d.assess), 'every assessment keeps its attempts, verdict, time, stars, score and critical count');
  // with room to spare (a shorter career), the lesson texts stay too
  const few = JSON.parse(JSON.stringify(d)); Object.keys(few.assess).slice(12).forEach(k => { delete few.assess[k]; delete few.scenarios[k]; });
  const back2 = SAVE.unpackCareer(JSON.parse(SAVE.fit(JSON.stringify(few), SAVE.SCORM12_LIMIT)));
  assert.equal(JSON.stringify(back2.assess), JSON.stringify(few.assess), 'a shorter career comes back exactly, lessons and all');
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

test('B-36: a month of workdays (aids, criticals, pins and the town) stays within the limit and keeps the course', () => {
  asScorm(false);
  heavy();
  // what the course is scored on (times are kept to the minute when the save is packed)
  const marks = (d) => JSON.stringify([Object.entries(d.scenarios).map(([k, v]) => [k, v.plays, v.bestScore, v.bestStars]),
    Object.entries(d.assess).map(([k, v]) => [k, v.passed])]);
  const course = marks(SAVE.data);
  // the trainer's aids, so every day records which help was on (B-21)
  OTR.academy = { summary: () => null, get: () => ({}), workdayRules: (day) => ({ hints: day < 3, satnav: day < 5, mirrors: day < 8, rear: true, night: day % 2 === 0 }) };
  const leave = W.leave; W.leave = () => {};                        // no screens in a Node test
  let rec;
  try {
    for (let day = 1; day <= 25; day++) {
      W.start(null);
      const list = longDay(30, 12);
      list.push(['drive.sign-stop', { key: 'run' + day, ok: false, where: { x: day, z: -day, mph: 12 } }]);
      play(list);
      rec = W.finish({ model: { routePlan: { townSeed: 1000 + day } } }, { stops: [] });
      assert.equal(lms.refused, 0, `day ${day}: the LMS never refused a save`);
      assert.ok(lms.longest <= SAVE.SCORM12_LIMIT, `day ${day}: every save within the limit (longest ${lms.longest})`);
    }
  } finally { W.leave = leave; delete OTR.academy; }
  assert.ok(rec.aids, 'the day recorded its aids');
  reload();
  const S = SAVE.data, last = S.workday.last;
  assert.equal(S.route.days, 35, 'every workday counted (10 before, 25 now)');
  assert.equal(marks(S), course, 'the course\'s stars and assessments are never lost');
  assert.ok(S.history.filter(h => h.id === 'workday').length >= 1, 'the Workdays table still has its latest days');
  // the route history went first to make room; the LMS must still see the workday finished and passed
  OTR.academy = { get: () => ({ passStars: { safety: 0, efficiency: 1, service: 1 } }) };
  try {
    const st = W.lmsState();
    assert.ok(st.finished, 'the LMS still sees a finished workday');
    assert.ok(st.passed, 'and a passed one');
    assert.ok(st.stars.efficiency >= 2, 'with its best stars');
  } finally { delete OTR.academy; }
  assert.equal(last.score, rec.score, 'the last workday keeps its score');
  assert.equal(last.townSeed, 1025, 'and its town, for the drive map');
  assert.ok(S.workday.first && S.workday.first.at, 'the first day is kept for the before-and-after report');
});
