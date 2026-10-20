/* The 3D workday's report contract (src/core/workday.js, data/workday_events.js). No browser needed. */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm');
const context = { console: { warn() {} }, URLSearchParams };
context.window = context; vm.createContext(context);
// the save, scoring and drive-review helpers the workday's start and finish use, with what they need of a page stubbed
vm.runInContext(`window.OTR = { util: { clamp01: v => Math.max(0, Math.min(1, v)) }, registry: { get: () => null },
  registerScene() {}, flow: {} }; window.Phaser = { Scene: class {} }; window.location = { search: '' };`, context);
for (const f of ['data/theme.js', 'data/config.js', 'data/workday_events.js', 'src/core/scorelog.js', 'src/core/scoring.js',
  'src/core/save.js', 'src/scenes/DriveReviewScene.js', 'src/core/workday.js'])
  vm.runInContext(fs.readFileSync(__dirname + '/../' + f, 'utf8'), context);
const { OTR, OTR_DATA } = context, W = OTR.workday, E = OTR_DATA.workdayEvents;
OTR.save.ephemeral = true;                                       // nothing is written; the progress is in OTR.save.data
const fresh = () => { OTR.save.data = OTR.save.defaults(); OTR.save.data.profile = { name: 'T' }; W.detach(); };
// the save as a reload finds it: a copy, nothing shared with the running game
const reload = () => { OTR.save.data = JSON.parse(JSON.stringify(OTR.save.data)); W.detach(); };

test('every event type is complete', () => {
  for (const [type, e] of Object.entries(E)) {
    assert.ok(/^[a-z]+\.[a-z-]+$/.test(type), type + ': type names are phase.what');
    assert.ok(['check', 'penalty', 'bonus'].includes(e.kind), type + ': kind');
    assert.ok(['safety', 'efficiency', 'service'].includes(e.cat), type + ': cat');
    assert.ok(['brief', 'pretrip', 'load', 'drive', 'stop', 'end'].includes(e.phase), type + ': phase');
    assert.ok(e.label, type + ': label');
    if (e.kind === 'check') { assert.ok(e.max > 0 && e.fail && e.lesson, type + ': a check has max, fail and lesson'); }
    if (e.kind === 'penalty') { assert.ok(e.pts > 0 && e.lesson, type + ': a penalty has pts and lesson'); }
    if (e.kind === 'bonus') { assert.ok(e.pts > 0, type + ': a bonus has pts'); }
  }
});

test('a check scores full marks when right and none when wrong, with the matching line', () => {
  const log = W.begin();
  W.report('scan.stop', { key: 'p1', stop: 2 });
  W.report('scan.stop', { key: 'p2', stop: 3, ok: false });
  assert.equal(log.items.length, 2);
  assert.deepEqual([log.items[0].got, log.items[0].max, log.items[0].group], [2, 2, 'stop2']);
  assert.equal(log.items[1].got, 0);
  assert.equal(log.items[1].label, E['scan.stop'].fail);
  assert.equal(log.items[1].lesson, E['scan.stop'].lesson);
});

test('a type counts once per key', () => {
  const log = W.begin();
  W.report('drive.speed', { key: 1 }); W.report('drive.speed', { key: 1 }); W.report('drive.speed', { key: 2 });
  assert.equal(log.items.length, 2);
  assert.equal(W.events.length, 2);
});

test('penalties, criticals, places and phases reach the score log', () => {
  const log = W.begin();
  W.report('drive.pedestrian', { key: 0, where: { x: 4, z: -50, mph: 14 } });
  W.report('scan.mismatch-caught', { key: 'p3', stop: 1 });
  const [p, b] = log.items;
  assert.equal(p.kind, 'penalty'); assert.equal(p.got, -4); assert.equal(p.critical, true);
  assert.equal(p.group, 'drive'); assert.deepEqual({ ...p.where }, { x: 4, z: -50, mph: 14 });
  assert.equal(b.kind, 'bonus'); assert.equal(b.group, 'stop1');
});

test('an unknown type is refused, not scored', () => {
  const log = W.begin();
  assert.equal(W.report('drive.made-up'), null);
  assert.equal(log.items.length, 0);
});

/* ---- starting and finishing a workday (docs/WORKDAY-EVENTS.md, "Starting and finishing a workday") */

// a good day: every check right, three stops delivered
const goodDay = () => {
  W.report('brief.read');
  W.report('inspect.tires'); W.report('inspect.lights');
  ['p1', 'p2', 'p3'].forEach((p, i) => { W.report('scan.load', { key: p }); W.report('load.shelf', { key: p }); W.report('scan.stop', { key: p, stop: i + 1 }); W.report('deliver.outcome', { key: i + 1, stop: i + 1 }); });
  W.report('load.secured', { key: 1 });
  W.report('drive.stop-line', { key: 1, where: { x: 1, z: -24, mph: 3 } });
  W.report('return.scanned', { key: 'p9' });
};
const maxOf = (types) => types.reduce((n, t) => n + (E[t].max || 0) * 100, 0);

test('finish scores the day from its reports, saves it as a route day and on the record', () => {
  fresh();
  W.start(null);
  assert.ok(W.active(), 'a started workday is saved as in progress');
  goodDay();
  assert.equal(OTR.save.data.workday.current.events.length, 18, 'every report is saved with the workday as it comes');
  const rec = W.finish(null, { seconds: 1500, stops: [1, 2, 3].map(n => ({ stop: n, delivered: true, x: 10, z: -30 * n })), depot: { x: -12, z: 5 } });
  assert.deepEqual({ ...rec.stars }, { safety: 3, efficiency: 3, service: 3 });
  assert.equal(rec.score, maxOf(['brief.read', 'inspect.tires', 'inspect.lights', 'scan.load', 'scan.load', 'scan.load', 'load.shelf', 'load.shelf', 'load.shelf',
    'scan.stop', 'scan.stop', 'scan.stop', 'deliver.outcome', 'deliver.outcome', 'deliver.outcome', 'load.secured', 'drive.stop-line', 'return.scanned']));
  const S = OTR.save.data;
  assert.equal(S.route.days, 1); assert.equal(S.day, 2, 'the career moves on a day');
  assert.deepEqual({ ...S.route.best }, { safety: 3, efficiency: 3, service: 3 });
  assert.equal(S.history.length, 1); assert.equal(S.history[0].id, 'workday'); assert.equal(S.history[0].dur, 1500);
  assert.equal(S.workday.current, null, 'no longer in progress');
  assert.equal(S.workday.last.delivered, 3); assert.equal(S.workday.last.events.length, 18);
  assert.equal(W.summaryLine(S.workday.last), '3 of 3 stops delivered · 25 min');
  // frozen: a report that arrives after finish does not reach the saved day
  W.report('drive.speed', { key: 1 });
  assert.equal(S.workday.last.events.length, 18); assert.equal(S.workday.last.score, rec.score);
});

test('the results screen gets the day as a scenario of its own, its verdict and the debrief as the next step', () => {
  fresh(); W.start(null); goodDay();
  W.report('drive.pedestrian', { key: 2, where: { x: 3.14159, z: -50.04, mph: 14.6 } });
  const rec = W.finish(null, {});
  const d = W.resultsData(rec, { prevBest: {}, firstPlay: true });
  assert.equal(d.scenario.id, 'workday'); assert.equal(d.next.scene, 'WorkdayDebriefScene');
  assert.equal(d.verdict.criticals.length, 1); assert.equal(d.stars.safety, 1, 'a critical mistake caps its category at one star');
  assert.equal(d.review.pins.length, 1);
  assert.deepEqual({ ...d.review.pins[0].where }, { x: 3.1, z: -50, mph: 15 }, 'places are kept to a decimetre and a whole mph');
});

test('abandon discards the workday without scoring it', () => {
  fresh(); W.start(null); goodDay();
  W.abandon(null);
  const S = OTR.save.data;
  assert.equal(W.active(), false); assert.equal(S.workday.current, null);
  assert.equal(S.route.days, 0); assert.equal((S.history || []).length, 0); assert.equal(S.workday.last, null);
  assert.equal(S.day, 1);
});

test('a paused or reloaded workday resumes with its score, and replayed reports are not counted twice', () => {
  fresh(); W.start(null);
  W.report('brief.read'); W.report('inspect.tires', { ok: false }); W.report('drive.speed', { key: 1, where: { x: 2, z: -40, mph: 31 } });
  W.pause(null);
  assert.equal(W.log, null, 'paused: nothing is live');
  assert.ok(W.active(), 'still saved as in progress');
  reload();
  assert.ok(W.resume(null));
  assert.equal(W.log.items.length, 3, 'the score so far is back');
  // the 3D world replays what it had already reported (harmless), then carries on
  W.report('brief.read'); W.report('inspect.tires', { ok: false }); W.report('drive.speed', { key: 1 });
  W.report('inspect.lights');
  assert.equal(W.log.items.length, 4);
  reload();                                                      // the tab closed without a pause
  W.resume(null);
  const rec = W.finish(null);
  assert.equal(rec.events.length, 4);
  const once = () => { fresh(); W.start(null); W.report('brief.read'); W.report('inspect.tires', { ok: false }); W.report('drive.speed', { key: 1 }); W.report('inspect.lights'); return W.finish(null); };
  const straight = once();
  assert.equal(rec.score, straight.score); assert.deepEqual({ ...rec.stars }, { ...straight.stars });
});

test('a workday the 3D world cannot resume starts again from the morning', () => {
  fresh(); W.start(null); W.report('brief.read');
  W.pause(null);
  OTR.fpStore = { read: () => ({ campaign: null }) };
  try { W.resume(null); } finally { delete OTR.fpStore; }
  assert.equal(W.log.items.length, 0);
  assert.equal(OTR.save.data.workday.current.events.length, 0);
});

test('the debrief groups lines by phase, then stop by stop, and links driving mistakes to their pins', () => {
  fresh(); W.start(null);
  W.report('return.scanned', { key: 'p1' });
  W.report('scan.stop', { key: 'p2', stop: 2, ok: false });
  W.report('scan.stop', { key: 'p1', stop: 1 });
  W.report('drive.speed', { key: 1, where: { x: 1, z: -10, mph: 30 } });
  W.report('drive.speed', { key: 2, where: { x: 1, z: -60, mph: 33 } });
  W.report('brief.read');
  W.report('scan.mismatch-caught', { key: 'p3:1', stop: 1 });
  const rec = W.finish(null, { stops: [{ stop: 1, delivered: true, address: '12 Maple Ave' }] });
  const { sections, pins } = W.sections(rec);
  assert.deepEqual([...sections.map(s => s.group)], ['brief', 'drive', 'stop1', 'stop2', 'end']);
  const drive = sections[1].lines;
  assert.equal(drive.length, 1, 'a repeated mistake is one line'); assert.equal(drive[0].n, 2); assert.equal(drive[0].pin, 0);
  assert.equal(pins.length, 2);
  assert.deepEqual([...sections[2].lines.map(l => l.mark)], ['bonus', 'good']);
  assert.equal(sections[2].stop.address, '12 Maple Ave');
  assert.equal(sections[3].lines[0].label, E['scan.stop'].fail); assert.equal(sections[3].lines[0].lesson, E['scan.stop'].lesson);
});

test('an empty day scores nothing and tests nothing', () => {
  fresh(); W.start(null);
  const rec = W.finish(null);
  assert.deepEqual([...rec.untested], ['safety', 'efficiency', 'service']);
  assert.deepEqual({ ...rec.stars }, { safety: 0, efficiency: 0, service: 0 });
  assert.equal(W.sections(rec).sections.length, 0);
});

test('a saved workday with event types the catalogue no longer has still opens', () => {
  fresh(); W.start(null); W.report('brief.read');
  OTR.save.data.workday.current.events.push({ type: 'drive.retired-type', key: 1, ok: false, stop: null }, { type: 42 }, null);
  reload();
  W.resume(null);
  assert.equal(W.log.items.length, 1);
  const rec = W.finish(null);
  rec.events.push({ type: 'deliver.retired', key: 'x', ok: true, stop: 2 });
  const S = W.sections(rec);
  assert.equal(S.sections.length, 1); assert.equal(S.unknown, 1);
});

test('the lab (no workday started at the hub) still reports into an unsaved log', () => {
  fresh();
  const log = W.begin();
  W.report('brief.read');
  assert.equal(log.items.length, 1);
  assert.equal(OTR.save.data.workday, undefined, 'nothing saved');
});

test('the full-day types score: checks, penalties, bonuses, criticals and the stop they file under', () => {
  const log = W.begin();
  const fullDay = ['load.count', 'load.missort-caught', 'load.missort-missed', 'load.extra-caught', 'load.missing-found', 'load.found-later',
    'drive.following', 'drive.mirrors', 'drive.backing', 'drive.school-bus', 'drive.school-bus-pass', 'drive.siren', 'drive.weather',
    'dispatch.update', 'stop.dog', 'stop.wrong-address', 'stop.age-check', 'stop.difficult', 'stop.hazard'];
  fullDay.forEach((type, i) => { assert.ok(E[type], type + ' exists'); assert.notEqual(W.report(type, { key: i, stop: 2, ok: false }), null, type); });
  assert.equal(log.items.length, fullDay.length);
  for (const item of log.items) {
    assert.ok(item.label, 'every line has words');
    if (item.kind === 'check') assert.equal(item.got, 0, 'a wrong check scores nothing');
  }
  const crit = log.items.filter((i) => i.critical).map((i) => i.id || i.type);
  assert.ok(log.items.some((i) => i.critical), 'a critical full-day mistake reaches the log: ' + crit);
  // a right check scores its full marks
  fresh(); const good = W.begin();
  W.report('drive.following', { key: 'leg1' }); W.report('stop.age-check', { key: 'p1', stop: 1 });
  assert.equal(JSON.stringify(good.items.map((i) => [i.got, i.max])), '[[2,2],[2,2]]');
});

test('the cab, sign, night and damage events of the milestone 7 to 9 contract exist and score as written', () => {
  const need = ['drive.gear', 'drive.backing-walkaround', 'drive.signal', 'drive.sign-stop', 'drive.sign-giveway', 'drive.sign-speed',
    'drive.sign-oneway', 'drive.sign-noentry', 'drive.sign-school', 'drive.sign-roadworks', 'drive.route', 'drive.lights', 'drive.cyclist',
    'drive.clearance', 'load.shift', 'van.damage-scuff', 'van.damage-dent', 'van.damage-major', 'inspect.damage', 'trip.damage-report',
    'trip.damage-false', 'stop.intercom', 'stop.reception', 'stop.locker', 'stop.reattempt'];
  need.forEach(t => assert.ok(E[t], t + ' is in the catalogue'));
  assert.equal(E['trip.damage-report'].critical, true, 'unreported damage the player caused is critical');
  assert.equal(E['van.damage-major'].critical, true);
  assert.equal(E['drive.sign-noentry'].critical, true);
  assert.equal(E['inspect.damage'].critical, undefined, 'missing existing damage is not critical');
  assert.ok(E['van.damage-scuff'].pts < E['van.damage-dent'].pts && E['van.damage-dent'].pts < E['van.damage-major'].pts, 'penalties grow with severity');
});

test('a damage report counts once per zone, and a missing one is recorded as a wrong check', () => {
  fresh(); W.begin();
  W.report('trip.damage-report', { key: 'rear', ok: true });
  W.report('trip.damage-report', { key: 'left', ok: false });
  W.report('trip.damage-report', { key: 'left', ok: false });             // the same zone again: the same mistake
  const reports = W.events.filter(e => e.type === 'trip.damage-report');
  assert.equal(JSON.stringify(reports.map(e => [e.key, e.ok])), JSON.stringify([['rear', true], ['left', false]]));
});

test('the old mirror and reversing events keep their types (old saves replay) with the new wording', () => {
  assert.match(E['drive.mirrors'].label, /mirror/i);
  assert.match(E['drive.backing'].fail, /Reversed|hit/);
  assert.ok(!/got out/i.test(E['drive.backing'].label), 'getting out is no longer what the score asks for');
});

test('A-26: the cab, sign, night and damage events reach the debrief, the drive map and the results verdict', () => {
  fresh(); W.start(null);
  const at = (i) => ({ x: 4 * i, z: -10 * i, mph: 12 + i, t: 30 * i });
  W.report('inspect.damage', { key: 'rear' });
  W.report('drive.mirrors', { key: 'pull1', where: at(1) });
  W.report('drive.signal', { key: 't1', ok: false, where: at(2) });
  W.report('drive.sign-stop', { key: 's1', ok: false, where: at(3) });
  W.report('drive.sign-noentry', { key: 'n1', where: at(4) });
  W.report('drive.lights', { key: 1, where: at(5) });
  W.report('drive.clearance', { key: 'b1', ok: false, where: at(6) });
  W.report('van.damage-dent', { key: 'left:post', where: at(7) });
  W.report('load.shift', { key: 'c1', where: at(8) });
  W.report('stop.intercom', { key: 1, stop: 1 });
  W.report('trip.damage-report', { key: 'left', ok: false });
  const rec = W.finish(null, { stops: [{ stop: 1, delivered: true, address: '4 Elm St' }] });
  const { sections, pins } = W.sections(rec);
  const groups = sections.map(s => s.group);
  ['pretrip', 'drive', 'stop1', 'end'].forEach(g => assert.ok(groups.includes(g), 'a debrief section for ' + g));
  const lines = sections.flatMap(s => s.lines);
  [['drive.signal', 'fail'], ['drive.sign-stop', 'fail'], ['drive.sign-noentry', 'label'], ['drive.clearance', 'fail'], ['van.damage-dent', 'label'],
    ['trip.damage-report', 'fail'], ['inspect.damage', 'label'], ['stop.intercom', 'label']].forEach(([t, k]) =>
    assert.ok(lines.some(l => l.label === E[t][k]), `the debrief has the line for ${t}`));
  assert.ok(lines.filter(l => l.lesson).length >= 6, 'mistakes carry their lessons');
  // pins: wrong checks and penalties with a place (signal, stop sign, no entry, clearance, dent, load shift); not the right checks
  assert.equal(pins.length, 6, 'a pin for every placed mistake, none for the mirrors and lights done right');
  // B-15: each kind keeps its own marker on the map (the signal is a plain pin)
  assert.equal(pins.map(p => p.mark || '-').join(','), '-,sign,sign,clearance,damage,load');
  assert.equal(OTR.drive.mark('drive.red-light'), 'sign', 'a red light is a road-sign pin');
  const d = W.resultsData(rec, { prevBest: {}, firstPlay: false });
  const crit = d.verdict.criticals.map(c => c.label || c);
  assert.ok(crit.some(c => /no-entry/i.test(c)) && crit.some(c => /did not report damage/i.test(c)), 'no entry and unreported damage are critical: ' + JSON.stringify(crit));
  assert.ok(d.stars.safety <= 1, 'safety capped at one star or below');
  // B-22: the record keeps each critical mistake's type beside its label, in the same order (for the LMS)
  assert.equal(rec.criticalTypes.length, rec.criticals.length);
  rec.criticalTypes.forEach((t, i) => assert.equal(rec.criticals[i], E[t].fail || E[t].label, t));
  assert.ok(rec.criticalTypes.includes('trip.damage-report') && rec.criticalTypes.includes('drive.sign-noentry'));
});

test('B-47: milestone 8 mistakes keep their own pins and every marker has a legend line', () => {
  fresh(); W.start(null);
  const at = (i) => ({ x: 6 * i, z: -8 * i, mph: 10 + i, t: 20 * i });
  const signs = ['drive.sign-stop', 'drive.sign-giveway', 'drive.sign-speed', 'drive.sign-school', 'drive.sign-oneway', 'drive.sign-roadworks'];
  signs.forEach((t, i) => W.report(t, { key: 'k' + i, ok: false, where: at(i + 1) }));
  W.report('drive.sign-noentry', { key: 'n1', where: at(7) });
  W.report('drive.red-light', { key: 'sig1:n', ok: false, where: at(8) });
  W.report('drive.red-light', { key: 'sig2:e', ok: true, where: at(9) });         // stopped for red: no pin
  W.report('drive.route', { key: 'leg2', stop: 2, ok: false, where: at(10) });
  W.report('drive.cyclist', { key: 'c1', ok: false, where: at(11) });
  W.report('drive.pedestrian', { key: 'p1', ok: false, where: at(12) });
  const rec = W.finish(null, { stops: [{ stop: 1, delivered: true }] });
  const { pins } = W.sections(rec);
  assert.equal(pins.map(p => p.mark || '-').join(','), 'sign,sign,sign,sign,sign,sign,sign,sign,route,-,-',
    'every road sign and the red light are diamonds, a wrong turn an arrow, a cyclist or pedestrian a plain pin');
  ['drive.red-light', 'drive.route', 'drive.cyclist', 'drive.pedestrian'].forEach(t => assert.ok(E[t], t + ' is in the contract'));
  // the legend names every marker a pin can have, and nothing else
  const marks = new Set(Object.keys(E).map(t => OTR.drive.mark(t)).filter(Boolean));
  assert.equal(JSON.stringify([...marks].sort()), JSON.stringify(OTR.drive.MARKS.map(([m]) => m).sort()));
  assert.match(OTR.drive.MARKS.find(([m]) => m === 'sign')[1], /traffic light/);
});

test('B-54: a day with traffic keeps how often it ran a red light, turned wrong, did not give way or cut up a cyclist', () => {
  fresh(); W.start(null);
  const at = (i) => ({ x: i, z: -i, mph: 10, t: i });
  W.report('drive.red-light', { key: 'signal:1:2:n', ok: false, where: at(1) });
  W.report('drive.red-light', { key: 'signal:2:1:e', ok: true, where: at(2) });
  W.report('drive.route', { key: 'leg1', ok: false, where: at(3) });
  W.report('drive.route', { key: 'leg2', ok: false, where: at(4) });
  W.report('drive.cyclist', { key: 'cyclist:0', ok: true, where: at(5) });
  const rec = W.finish(null, { stops: [] });
  assert.equal(JSON.stringify(rec.road), JSON.stringify([1, 2, 0, 0]));
  W.keep(rec);
  const S = OTR.save.data, h = S.history[S.history.length - 1];
  assert.equal(JSON.stringify(h.road), JSON.stringify([1, 2, 0, 0]), 'on the record of runs');
  assert.equal(JSON.stringify(S.workday.first.road), JSON.stringify([1, 2, 0, 0]), 'and on the stored first day');
  // a day without traffic keeps no tally (it is not a clean one)
  fresh(); W.start(null); W.report('drive.signal', { key: 't1', ok: false, where: at(1) });
  assert.equal(W.finish(null, { stops: [] }).road, undefined);
});

test('B-21: the day keeps which aids were on; the results, the record and the history tell an aided day from one without', () => {
  const real = OTR.academy;
  // the trainer's rules as the academy gives them: assists full on day 1, off from day 4 (the default "fade by day")
  OTR.academy = { workdayRules: (d) => ({ assists: d === 1 ? 'full' : d <= 3 ? 'light' : 'off', satnav: d <= 3 ? 'full' : 'line', walkaround: 'optional', night: true, damage: d < 4 }) };
  try {
    fresh(); W.start(null);
    assert.equal(W.current.aids, 'ffo11', 'day 1: full assists, turn-by-turn, walk-round optional, night and damage on');
    W.report('brief.read');
    const first = W.finish(null, { stops: [] });
    assert.equal(first.aids, 'ffo11');
    assert.ok(W.aided(first.aids));
    assert.match(W.resultsData(first, { prevBest: {}, firstPlay: true }).result.summary, /full driving assists · turn-by-turn sat nav$/);
    assert.doesNotMatch(W.summaryLine(first), /assists/, 'the debrief\'s short line stays short');
    assert.equal(OTR.save.data.history.slice(-1)[0].aids, 'ffo11', 'the trainer\'s record has it');
    assert.equal(OTR.save.data.route.history.slice(-1)[0].aids, 'ffo11');

    OTR.save.data.route.days = 3;                                  // the fourth workday: the aids have faded
    W.start(null); W.report('brief.read');
    const fourth = W.finish(null, { stops: [] });
    assert.equal(fourth.aids, 'olo10');
    assert.ok(!W.aided(fourth.aids), 'no driving assists: not an aided day');
    assert.equal(JSON.stringify(W.aidsWords(fourth.aids)), '["no driving assists","sat nav route line only","no van damage"]');
  } finally { OTR.academy = real; }
  // round trip, a damaged code and a day saved before aids were kept
  assert.equal(JSON.stringify(W.aidsRules('lfr10')), '{"assists":"light","satnav":"full","walkaround":"required","night":true,"damage":false}');
  assert.equal(W.aidsCode(W.aidsRules('lfr10')), 'lfr10');
  assert.equal(W.aidsRules('xx'), null); assert.equal(W.aidsRules('zfo11'), null);
  assert.equal(W.aidsWords(undefined).length, 0); assert.equal(W.aided(undefined), false);
});

test('B-29: the day keeps its town seed so the drive review can draw its streets; days without one still review', () => {
  fresh(); W.start(null); W.report('brief.read');
  // the 3D world finishes through its scene; the record takes the seed from the scene's route plan
  const leave = W.leave; W.leave = () => {};                        // no screens in a Node test
  let rec;
  try { rec = W.finish({ model: { routePlan: { townSeed: 4242 } } }, { stops: [] }); } finally { W.leave = leave; }
  assert.equal(rec.townSeed, 4242);
  assert.equal(W.reviewData(rec, { items: [] }).plan.townSeed, 4242);
  fresh(); W.start(null); W.report('brief.read');
  const old = W.finish(null, { stops: [] });
  assert.equal(old.townSeed, undefined, 'no town, no seed');
  assert.equal(W.reviewData(old, { items: [] }).plan.townSeed, undefined);
});

test('B-31: the drive map names each street with the town\'s own names', () => {
  // the town as OTR.town.build gives it (its own art and scenery are not needed here)
  const spec = { streetsH: ['Harbor St', 'Maple Ave'], streetsV: ['1st St', '2nd St', '3rd St'] };
  const town = OTR.town;
  OTR.town = { build: () => ({ spec, hy: [100, 500], vx: [100, 500, 900], road: 80, depot: { x: 460 } }) };
  let st;
  try { st = vm.runInContext('DriveReviewScene.prototype.planStreets({ townSeed: 1 })', context); } finally { OTR.town = town; }
  assert.equal(JSON.stringify(st.xNames), JSON.stringify(spec.streetsH));
  assert.equal(JSON.stringify(st.zNames), JSON.stringify(spec.streetsV));
  assert.equal(JSON.stringify(st.xs), '[0,20]', 'each name sits on its own street');
  assert.equal(st.zs.length, 3);
});
