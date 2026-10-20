/*
 * The before-and-after report (server/report.js, src/core/pilotreport.js, GET api/report/before-after): each trainee's
 * first and latest workday side by side and how the group moved; old saves without a stored first day; one-day trainees
 * kept out of the group averages; the page to print; the training server's route needs the trainer PIN. No browser.
 *   node test/report.js
 */
'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('fs'), os = require('os'), path = require('path'), vm = require('vm');
const R = require('../server/report.js');

const MARKS = { safety: 2, efficiency: 2, service: 2 };
const run = (at, s, e, v, crit, score) => ({ id: 'workday', kind: 'workday', at, score: score || 100 * (s + e + v), stars: { safety: s, efficiency: e, service: v }, criticals: crit ? ['Passed a school bus'] : [] });
const trainee = (id, name, hist, extra) => ({ id, name, progress: Object.assign({ history: hist }, extra || {}) });

const list = [
  trainee('a1', 'Ana', [run(1000, 1, 1, 2, true, 300), run(2000, 2, 2, 2, false, 500), run(3000, 3, 2, 3, false, 700)]),
  trainee('b2', 'Ben', [run(1500, 2, 2, 2, false, 500), run(2500, 1, 2, 2, true, 400)]),                  // got worse
  trainee('c3', 'Cy', [run(1200, 2, 2, 3, false, 650)]),                                                    // one day only
  trainee('d4', 'Di', [run(1100, 1, 1, 1, true, 200), run(2100, 1, 1, 1, true, 200)]),                       // unchanged
  { id: 'e5', name: 'Eve', progress: { history: [] } },                                                      // no workday: not in the report
  trainee('f6', 'Flo', [run(5000, 3, 3, 3, false, 900)], { workday: { first: { at: 100, score: 250, stars: { safety: 1, efficiency: 1, service: 1 }, criticals: 1 }, last: null } })  // record has moved on: the stored first day counts
];

test('first and latest day for each trainee who finished a workday', () => {
  const out = R.beforeAfter(list, MARKS);
  assert.deepEqual(out.trainees.map(t => t.id), ['a1', 'b2', 'c3', 'd4', 'f6'], 'no Eve; sorted by name');
  const a = out.trainees[0];
  assert.equal(a.days, 3); assert.equal(a.first.total, 4); assert.equal(a.latest.total, 8); assert.equal(a.change, 4);
  assert.equal(a.first.criticals, 1); assert.equal(a.latest.criticals, 0);
  assert.equal(a.firstPassed, false); assert.equal(a.latestPassed, true);
  const b = out.trainees[1];
  assert.equal(b.change, -1); assert.equal(b.firstPassed, true); assert.equal(b.latestPassed, false);
  assert.equal(out.trainees[2].change, null, 'one day: nothing to compare');
  assert.equal(out.trainees[2].days, 1);
  const f = out.trainees[4];
  assert.equal(f.first.score, 250, 'the stored first day, not the oldest run still on the record'); assert.equal(f.days, 2);
  assert.equal(f.change, 9 - 3);
});

test('the group: only trainees with two or more days, and how many moved which way', () => {
  const g = R.beforeAfter(list, MARKS).group;
  assert.equal(g.trainees, 5); assert.equal(g.withChange, 4); assert.equal(g.oneDayOnly, 1);
  assert.equal(g.improved, 2); assert.equal(g.worse, 1); assert.equal(g.same, 1);
  // first days of Ana, Ben, Di, Flo: stars safety 1,2,1,1 → 1.25; latest 3,1,1,3 → 2
  assert.equal(g.first.stars.safety, 1.25); assert.equal(g.latest.stars.safety, 2);
  assert.equal(g.first.score, Math.round((300 + 500 + 200 + 250) / 4 * 100) / 100);
  assert.equal(g.latest.score, Math.round((700 + 400 + 200 + 900) / 4 * 100) / 100);
  assert.equal(g.first.criticals, 0.75); assert.equal(g.latest.criticals, 0.5);
  assert.equal(g.first.passedPercent, 25);                                                  // only Ben met every mark on day one
  assert.equal(g.latest.passedPercent, 50);                                                 // Ana and Flo now do
});

test('pass marks come from the trainer\'s settings; with none, two stars', () => {
  assert.equal(R.beforeAfter(list, { safety: 3, efficiency: 3, service: 3 }).group.latest.passedPercent, 25);
  assert.deepEqual(R.beforeAfter(list, null).passMarks, MARKS);
});

test('nothing to compare yet', () => {
  assert.equal(R.beforeAfter([], MARKS).group.first, null);
  const one = R.beforeAfter([list[2]], MARKS);
  assert.equal(one.group.withChange, 0); assert.equal(one.group.first, null);
  // a save with only the last workday (no record of runs) still counts as a day
  const lastOnly = R.beforeAfter([{ id: 'z', name: 'Zed', progress: { workday: { last: { at: 9, score: 1, stars: { safety: 2, efficiency: 2, service: 2 }, criticals: [] } } } }], MARKS);
  assert.equal(lastOnly.trainees.length, 1); assert.equal(lastOnly.trainees[0].days, 1);
});

// the page to print, built in the game's own code
const context = { console, URLSearchParams, Date };
context.window = context; vm.createContext(context);
vm.runInContext('window.OTR = {}; window.document = {};', context);
for (const f of ['data/theme.js', 'data/config.js', 'src/core/record.js', 'src/core/pilotreport.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), context);

test('the page to print: the group, each trainee, and no markup from a name', () => {
  const data = R.beforeAfter(list.concat([trainee('x9', '<b>Mal</b> & "Co"', [run(1, 1, 1, 1), run(2, 2, 2, 2)])]), MARKS);
  const html = context.OTR.pilotReport.html(JSON.parse(JSON.stringify(data)));
  assert.match(html, /^<!DOCTYPE html>/);
  assert.match(html, /Before and after: the training pilot/);
  assert.match(html, /The group, first workday to latest/);
  ['Ana', 'Ben', 'Cy', 'Di', 'Flo'].forEach(n => assert.ok(html.includes(n), n));
  assert.ok(html.includes('One workday so far'));
  assert.ok(html.includes('+4 stars'), 'Ana\'s change');
  assert.ok(html.includes('-1 stars'), 'Ben\'s change');
  assert.equal(html.includes('<b>Mal</b>'), false, 'a trainee name cannot add markup');
  assert.ok(html.includes('&lt;b&gt;Mal&lt;/b&gt;'));
  assert.ok(html.includes('★★★ ★★☆ ★★★'), 'Ana\'s latest stars');
  // an empty group says so
  const empty = context.OTR.pilotReport.html(JSON.parse(JSON.stringify(R.beforeAfter([], MARKS))));
  assert.ok(empty.includes('Nobody has finished a workday yet.') && empty.includes('nothing to compare'));
});

test('B-54: road habits per day, for trainees whose first and latest days both had traffic', () => {
  const road = (r, a) => Object.assign(r, { road: a });
  const L = [
    trainee('r1', 'Ria', [road(run(1000, 1, 2, 2), [2, 1, 1, 1]), road(run(2000, 2, 2, 2), [0, 1, 0, 0])]),
    trainee('r2', 'Raj', [road(run(1000, 1, 2, 2), [1, 3, 0, 1]), road(run(2000, 2, 2, 2), [1, 0, 0, 0])]),
    trainee('r3', 'Rob', [run(1000, 1, 2, 2), road(run(2000, 2, 2, 2), [5, 5, 5, 5])]),                       // first day before traffic: left out
    trainee('r4', 'Rae', [run(5000, 3, 3, 3)], { workday: { first: { at: 100, score: 250, stars: { safety: 1, efficiency: 1, service: 1 }, criticals: 1, road: [3, 3, 3, 3] }, last: null } })   // latest has no traffic
  ];
  const out = R.beforeAfter(L, MARKS);
  assert.equal(JSON.stringify(R.ROAD), JSON.stringify(['red-light', 'route', 'giveway', 'cyclist']));
  assert.equal(out.group.road.trainees, 2, 'only Ria and Raj had traffic on both days');
  assert.equal(JSON.stringify(out.group.road.first), JSON.stringify([1.5, 2, 0.5, 1]));
  assert.equal(JSON.stringify(out.group.road.latest), JSON.stringify([0.5, 0.5, 0, 0]));
  const page = context.OTR.pilotReport.html(JSON.parse(JSON.stringify(out)));
  ['Road habits: mistakes per day', 'Red lights driven through', 'Wrong turns', 'Did not give way', 'Turned across a cyclist', 'From the 2 trainees'].forEach(s => assert.ok(page.includes(s), s));
  // a group with no traffic days has no road table
  assert.ok(!context.OTR.pilotReport.html(JSON.parse(JSON.stringify(R.beforeAfter(list, MARKS)))).includes('Road habits'));
});

test('the training server: the report needs the trainer PIN and reads the progress files', async () => {
  const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'otr-report-'));
  process.env.OTR_DATA_DIR = DATA; process.env.OTR_TRAINER_PIN = '4821'; process.env.OTR_ALLOW_QUERY_USER = '1';
  const { server } = require('../server/server.js');
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}/api/`;
  try {
    for (const t of list.slice(0, 2)) {
      const r = await fetch(base + `progress?user=${t.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ progress: Object.assign({ savedAt: 1, profile: { name: t.name, id: t.id } }, t.progress) }) });
      assert.equal(r.status, 200);
    }
    let r = await fetch(base + 'report/before-after');
    assert.ok([401, 403].includes(r.status), 'no PIN: ' + r.status);
    r = await fetch(base + 'report/before-after', { headers: { 'X-Trainer-Pin': '4821' } });
    assert.equal(r.status, 200);
    const out = await r.json();
    assert.deepEqual(out.trainees.map(t => t.name), ['Ana', 'Ben']);
    assert.equal(out.group.withChange, 2);
  } finally { server.close(); fs.rmSync(DATA, { recursive: true, force: true }); }
});
