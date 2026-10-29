/*
 * A-30: 3D scenarios count in the module records exactly as their 2D scenes do (docs/3D-MODULES.md). Which version
 * plays follows the trainer's per-module choice, the scenario's default and WebGL; optional scenarios and 3D-only ones
 * a PC cannot run are left out of "every module passed". No browser.
 *   node test/scenario3d.js
 */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm');
const ROOT = __dirname + '/../';

const context = { console: { log() {}, warn() {} }, URLSearchParams };
context.window = context; vm.createContext(context);
vm.runInContext(`window.Phaser = { Scene: class {} }; window.location = { search: '' };
  window.localStorage = { getItem: () => null, setItem() {}, removeItem() {} }; window.addEventListener = () => {};`, context);
const html = fs.readFileSync(ROOT + 'index.html', 'utf8');
const data = [...html.matchAll(/<script src="(data\/[^"]+\.js)"/g)].map(m => m[1]);
for (const f of data.concat(['src/core/theme.js', 'src/core/scorelog.js', 'src/core/scoring.js', 'src/core/save.js',
  'src/core/academy.js', 'src/core/flow.js', 'src/core/fpscenario.js']))
  vm.runInContext(fs.readFileSync(ROOT + f, 'utf8'), context);
vm.runInContext(`OTR.registerScene = () => {};
  OTR.transitions = []; OTR.toasts = [];
  OTR.fx = { transition: (scene, key, data) => OTR.transitions.push({ key, data }) };
  OTR.ui = { toast: (scene, text) => OTR.toasts.push(text) };`, context);
const { OTR } = context, plain = (o) => JSON.parse(JSON.stringify(o));

// the scenarios as they were in 2D before any 3D version (B-135): a 3D version keeps these ids and categories
const BEFORE = { 'm1-pretrip': 1, 'm1-route': 1, 'm1-driving': 1, 'm1-spot': 1, 'm2-sort': 1, 'm2-lift': 1, 'm2-labels': 1,
  'm3-missing': 1, 'm3-signature': 1, 'm3-twostops': 1, 'm3-doorsteps': 1, 'm4-address': 1, 'm4-recover': 1, 'm4-damaged': 1,
  'm4-storm': 1, 'm5-pod': 1, 'm5-exceptions': 1, 'm5-adult': 1, 'm6-load': 1, 'm6-find': 1, 'm7-business': 1, 'm7-intl': 1,
  'm7-dg': 1, 'm8-steps': 1, 'm8-dog': 1, 'm8-heat': 1, 'm8-incident': 1 };

const fresh = (presentation) => {
  OTR.save.data = OTR.save.defaults(); OTR.save.ephemeral = true; OTR.identity = { mode: 'local' };
  OTR.academy.settings = OTR.academy.merge({ presentation: presentation || {} }); OTR.academy.assessing = null;
  OTR.transitions.length = 0; OTR.toasts.length = 0; OTR.game = null;
};
const scene = (keys) => ({ scene: { manager: { keys: Object.fromEntries((keys || []).map(k => [k, {}])) } } });
const sceneKeys = () => OTR.registry.all().map(s => s.scene).filter(Boolean).concat('FirstPersonScenarioScene');

test('every scenario with a 3D version keeps its 2D id, categories and star thresholds', () => {
  assert.deepEqual(plain(OTR.registry.all().filter(s => !s.scene).map(s => s.id)), ['m1-junctions', 'm1-school', 'm1-night'], 'C-39\'s 3D-only scenarios');
  const all = OTR.registry.all();
  for (const id of Object.keys(BEFORE)) assert.ok(OTR.registry.get(id), `${id} is still a scenario`);
  for (const sc of all.filter(s => s.scene3d)) {
    assert.ok(sc.categories.length && sc.categories.every(c => OTR.scoring.CATS.includes(c)), `${sc.id} tests known categories`);
    if (BEFORE[sc.id]) assert.ok(sc.scene, `${sc.id} keeps its 2D scene as the fallback`);
    else assert.equal(sc.optional, true, `${sc.id} is new and 3D-only, so it is optional until owner question 11 is answered`);
  }
});

test('the trainer\'s choice is kept per module, and anything else reads as "3D where ready"', () => {
  fresh({ m1: '3d', m2: '2d', m3: 'sideways', nope: '3d' });
  assert.deepEqual(plain(OTR.academy.get().presentation), { m1: '3d', m2: '2d' });
  assert.equal(OTR.academy.presentationOf('m1-pretrip'), '3d');
  assert.equal(OTR.academy.presentationOf('m2-sort'), '2d');
  assert.equal(OTR.academy.presentationOf('m3-missing'), 'auto');
  fresh();
  assert.deepEqual(plain(OTR.academy.get().presentation), {});
  assert.equal(OTR.academy.presentationOf('m1-pretrip'), 'auto');
});

test('a scenario starts its 2D scene unless a 3D version is chosen or ready, and the PC can run it', () => {
  const sc = OTR.registry.get('m1-pretrip'), saved = { ...sc };
  try {
    fresh(); OTR.flow.startScenario(scene(sceneKeys()), 'm1-pretrip');
    assert.equal(OTR.transitions.pop().key, sc.scene, 'no 3D version yet: the 2D scene');
    sc.scene3d = 'a30-test'; OTR.fpScenario.definitions.set('a30-test', {});
    OTR.game = { renderer: { gl: {} } };
    OTR.flow.startScenario(scene(sceneKeys()), 'm1-pretrip');
    assert.equal(OTR.transitions.pop().key, sc.scene, '"3D where ready" keeps 2D until default3d is set (A-31)');
    sc.default3d = true;
    OTR.flow.startScenario(scene(sceneKeys()), 'm1-pretrip');
    assert.deepEqual(plain(OTR.transitions.pop()), { key: 'FirstPersonScenarioScene', data: { scenarioId: 'm1-pretrip' } }, 'ready: 3D');
    fresh({ m1: '2d' }); OTR.game = { renderer: { gl: {} } };
    OTR.flow.startScenario(scene(sceneKeys()), 'm1-pretrip');
    assert.equal(OTR.transitions.pop().key, sc.scene, 'the trainer chose 2D for the module');
    fresh({ m1: '3d' });
    OTR.flow.startScenario(scene(sceneKeys()), 'm1-pretrip');
    assert.equal(OTR.transitions.pop().key, sc.scene, 'no WebGL: the 2D scene, whatever the choice');
  } finally {
    for (const k of Object.keys(sc)) if (!(k in saved)) delete sc[k];
    Object.assign(sc, saved); OTR.fpScenario.definitions.delete('a30-test');
  }
});

test('a 3D-only scenario on a PC without WebGL says so, and is left out of "every module passed"', () => {
  const m = OTR.registry.modules().find(x => x.id === 'm1');
  const only = { id: 'm1-a30only', title: 'A-30 only', categories: ['safety'], scene3d: 'a30-only' };
  m.scenarios.push(only); OTR.fpScenario.definitions.set('a30-only', {});
  try {
    fresh(); OTR.flow.startScenario(scene(sceneKeys()), 'm1-a30only');
    assert.equal(OTR.transitions.length, 0, 'nothing starts');
    assert.deepEqual(plain(OTR.toasts), ['This scenario needs 3D graphics.']);
    const all = OTR.registry.all().filter(s => !s.optional).length;   // the optional 3D-only scenarios never count
    assert.equal(OTR.registry.counted().length, all - 1 - OTR.registry.all().filter(s => !s.optional && !s.scene && s !== only).length, 'without WebGL it does not count');
    assert.equal(OTR.registry.counted(true).length, all, 'with WebGL (and in the trainer\'s view) it counts');
    only.optional = true;
    assert.equal(OTR.registry.counted(true).length, all - 1, 'an optional scenario never counts');
  } finally {
    m.scenarios.pop(); OTR.fpScenario.definitions.delete('a30-only');
  }
});

test('passing every counted scenario completes the course, with optional ones left unplayed', () => {
  const m = OTR.registry.modules().find(x => x.id === 'm1');
  m.scenarios.push({ id: 'm1-a30opt', title: 'A-30 optional', categories: ['safety'], scene3d: 'a30-opt', optional: true });
  try {
    fresh();
    const assess = OTR.save.data.assess = OTR.save.data.assess || {};
    for (const sc of OTR.registry.counted()) assess[sc.id] = { passed: true, attempts: 1, at: 1 };
    const s = OTR.academy.summary();
    assert.equal(s.total, OTR.registry.all().filter(x => !x.optional).length);
    assert.equal(s.passedAll, true, 'the optional scenario does not hold the course back');
  } finally { m.scenarios.pop(); }
});

test('a 3D result and a 2D result of the same scenario land in the same record', () => {
  fresh();
  const sc = OTR.registry.get('m2-lift'), ratios = Object.fromEntries(sc.categories.map(c => [c, 0.8]));
  OTR.flow.complete(scene(), 'm2-lift', { score: 400, ratios, stats: {} });                         // the 2D scene
  OTR.flow.complete(scene(), 'm2-lift', { score: 650, ratios, stats: { seconds: 90 }, log: new OTR.ScoreLog() }); // the runner
  const rec = OTR.save.data.scenarios['m2-lift'];
  assert.equal(rec.plays, 2, 'both runs are plays of one scenario');
  assert.equal(rec.bestScore, 650, 'and their scores compare on the same scale');
  assert.equal(Object.keys(OTR.save.data.scenarios).length, 1, 'no second record for the 3D version');
  assert.equal(OTR.transitions.filter(t => t.key === 'ResultsScene').length, 2, 'both show the same results screen');
});

test('the hub lists a 3D-only scenario only once A-31\'s QA sets its default3d', () => {
  const m = OTR.registry.modules().find(x => x.id === 'm1'), night = OTR.registry.get('m1-night');
  assert.deepEqual(plain(OTR.registry.listed(m).map(s => s.id)), ['m1-pretrip', 'm1-route', 'm1-driving', 'm1-spot']);
  night.default3d = true;
  try { assert.ok(OTR.registry.listed(m).some(s => s.id === 'm1-night'), 'listed once QA sets default3d'); }
  finally { delete night.default3d; }
});
