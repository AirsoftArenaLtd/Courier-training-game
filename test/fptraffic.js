/* Traffic safety decisions, independent of rendering and scoring. */
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm');
const c = {}; c.window = c; vm.createContext(c);
vm.runInContext(fs.readFileSync(__dirname + '/../src/core/fptraffic.js', 'utf8'), c);
const T = c.OTR.fpTraffic;
const actor = (x = 0, z = 0, yaw = 0) => ({ x, z, yaw, w: 1.8, d: 4.5 });

test('signals have separate amber and all-red clearance intervals before changing priority', () => {
  const expected = [
    [0, 'green', 'red', false], [15.999, 'green', 'red', false],
    [16, 'amber', 'red', false], [19, 'red', 'red', false],
    [21, 'red', 'green', false], [37, 'red', 'amber', false],
    [40, 'red', 'red', false], [42, 'red', 'red', true],
    [52, 'red', 'red', false], [54, 'green', 'red', false]
  ];
  for (const [at, ns, ew, walk] of expected) {
    const p = T.signal(at); assert.equal(p.ns, ns, 'north/south at ' + at);
    assert.equal(p.ew, ew, 'east/west at ' + at); assert.equal(p.walk, walk);
  }
});
test('neither an opposing green nor a simultaneous walk permission occurs across a day', () => {
  for (let ms = 0; ms < 86400000; ms += 73) {
    const p = T.signal(ms / 1000, 13);
    assert.ok(p.ns === 'red' || p.ew === 'red');
    if (p.walk) { assert.equal(p.ns, 'red'); assert.equal(p.ew, 'red'); }
  }
});
test('signal offsets and checkpoints reproduce the same phase without accumulated timer drift', () => {
  for (const offset of [-108, -53, 0, 13, 53, 108]) {
    for (const elapsed of [0, 15.5, 16, 19, 21, 42, 52, 5399.25]) {
      const saved = JSON.parse(JSON.stringify({ elapsed, offset }));
      assert.equal(T.signal(saved.elapsed, saved.offset), T.signal(elapsed, offset));
      assert.equal(T.signal(elapsed + T.cycle * 100, offset), T.signal(elapsed, offset));
    }
  }
  for (const bad of [NaN, Infinity, -1]) {
    const p = T.signal(bad); assert.equal(p.ns, 'red'); assert.equal(p.ew, 'red'); assert.equal(p.walk, false);
  }
  assert.equal(T.signal(1, NaN).ns, 'red');
});
test('both directions on each street read the matching axis', () => {
  for (const yaw of [0, Math.PI, -Math.PI, Math.PI * 2]) assert.equal(T.aspect(T.signal(0), yaw), 'green');
  for (const yaw of [Math.PI / 2, -Math.PI / 2]) assert.equal(T.aspect(T.signal(0), yaw), 'red');
  assert.equal(T.aspect(T.signal(21), Math.PI / 2), 'green'); assert.equal(T.aspect(null, 0), 'red');
  assert.equal(T.aspect(T.signal(0), NaN), 'red');
});
test('a pedestrian starts only with a walk phase and a physically clear crossing', () => {
  for (const at of [0, 16, 19, 21, 37, 40, 52]) assert.equal(T.mayCross(T.signal(at), true), false);
  assert.equal(T.mayCross(T.signal(42), true), true); assert.equal(T.mayCross(T.signal(42), false), false);
  assert.equal(T.mayCross({ ns: 'green', ew: 'red', walk: true }, true), false);
});
test('stopping envelope retains a buffer and reduces speed smoothly toward the line', () => {
  assert.equal(T.stoppingSpeed(100, 6), 6); assert.equal(T.stoppingSpeed(1.5, 6), 0);
  assert.equal(T.stoppingSpeed(-2, 6), 0); assert.equal(T.stoppingSpeed(6.5, 20), 5);
  let last = 0;
  for (let distance = 0; distance < 100; distance += .1) {
    const speed = T.stoppingSpeed(distance, 8); assert.ok(speed >= last && speed <= 8); last = speed;
  }
  for (const args of [[NaN, 6], [10, Infinity], [10, 6, 0], [10, 6, 2.5, -1]]) assert.equal(T.stoppingSpeed(...args), 0);
});
test('clearance subtracts the actual vehicle bodies on all four headings', () => {
  for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const a = actor(5, 7, yaw), b = actor(5 + Math.sin(yaw) * 10, 7 - Math.cos(yaw) * 10, yaw);
    assert.ok(Math.abs(T.clearance(a, b) - 5.5) < 1e-10);
    b.d = 5.4; assert.ok(Math.abs(T.clearance(a, b) - 5.05) < 1e-10);
  }
});
test('adjacent lanes and vehicles completely behind are ignored, but overlapping bodies stop traffic', () => {
  const a = actor(); assert.equal(T.clearance(a, actor(3.4, -10, Math.PI)), Infinity);
  assert.equal(T.clearance(a, actor(0, 10)), Infinity); assert.equal(T.clearance(a, actor(0, 2)), 0);
  assert.equal(T.targetSpeed(a, [a, actor(0, 2)], 6), 0);
});
test('cross traffic and a walker use their projected footprint, rather than only their centres', () => {
  const a = actor(); assert.equal(T.clearance(a, actor(2.5, -8, Math.PI / 2)), 4.85);
  assert.ok(Math.abs(T.clearance(a, { x: 0, z: -4, w: .6, d: .6 }) - 1.45) < 1e-10);
  assert.equal(T.clearance(a, { x: NaN, z: -4 }), 0);
});
test('following target respects body clearance and the taught three-second time gap', () => {
  const a = actor(); assert.equal(T.targetSpeed(a, [], 8), 8);
  assert.equal(T.targetSpeed(a, [actor(0, -18)], 8), 4);
  assert.equal(T.targetSpeed(a, [actor(0, -18), actor(0, -9)], 8), 1);
  assert.equal(T.targetSpeed(a, [actor(0, -4)], 8), 0);
  assert.equal(T.targetSpeed(a, [actor(3.4, -4)], 8), 8);
});
test('bounded acceleration and braking converge without overshoot or negative motion', () => {
  assert.equal(T.speed(0, 6, .5), .55); assert.equal(T.speed(6, 0, .5), 4.6);
  assert.equal(T.speed(5.99, 6, .5), 6); assert.equal(T.speed(.01, 0, .5), 0);
  assert.equal(T.speed(0, 6, NaN), 0); assert.equal(T.speed(6, 0, -1), 0);
  let speed = 0; for (let i = 0; i < 1000; i++) speed = T.speed(speed, 6, .0125); assert.equal(speed, 6);
  for (let i = 0; i < 1000; i++) speed = T.speed(speed, 0, .0125); assert.equal(speed, 0);
});
test('controller calls keep shared descriptors bounded and do not mutate input vehicles', () => {
  const a = Object.freeze(actor()), b = Object.freeze(actor(0, -14));
  const before = JSON.stringify([a, b]);
  for (let i = 0; i < 10000; i++) {
    assert.ok(T.phases.includes(T.signal(i / 60))); T.targetSpeed(a, [a, b], 8);
  }
  assert.equal(JSON.stringify([a, b]), before); assert.equal(T.phases.length, 8);
  assert.ok(Object.isFrozen(T.phases)); assert.ok(T.phases.every(Object.isFrozen));
});
