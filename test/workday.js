/* The 3D workday's report contract (src/core/workday.js, data/workday_events.js). No browser needed. */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm');
const context = { console: { warn() {} } }; context.window = context; vm.createContext(context);
for (const f of ['data/workday_events.js', 'src/core/scorelog.js', 'src/core/workday.js'])
  vm.runInContext(fs.readFileSync(__dirname + '/../' + f, 'utf8'), context);
const { OTR, OTR_DATA } = context, W = OTR.workday, E = OTR_DATA.workdayEvents;

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
  assert.equal(p.group, 'drive'); assert.deepEqual(p.where, { x: 4, z: -50, mph: 14 });
  assert.equal(b.kind, 'bonus'); assert.equal(b.group, 'stop1');
});

test('an unknown type is refused, not scored', () => {
  const log = W.begin();
  assert.equal(W.report('drive.made-up'), null);
  assert.equal(log.items.length, 0);
});
