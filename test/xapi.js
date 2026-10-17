/*
 * xAPI for a company's learning record store (server/xapi.js): a finished workday becomes statements (the day, then each
 * stop) posted by the training server; the store being down or slow never holds up a save; nothing is sent twice; and it
 * is off unless an endpoint is set. No browser.
 *   node test/xapi.js
 */
'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), http = require('http'), fs = require('fs'), os = require('os'), path = require('path');

const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'otr-xapi-'));
const LRS_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'otr-xapi-lrs-'));

// a stand-in LRS: records what it is sent; can be told to fail
const lrs = { got: [], headers: [], mode: 'ok', stored: new Set(), server: null, port: 0 };
lrs.server = http.createServer((req, res) => {
  let b = ''; req.on('data', (c) => { b += c; });
  req.on('end', () => {
    if (lrs.mode === 'down') { req.socket.destroy(); return; }
    if (lrs.mode === 'error') { res.writeHead(500); res.end('boom'); return; }
    const list = JSON.parse(b);
    if (list.some((s) => lrs.stored.has(s.id))) { res.writeHead(409); res.end('{"error":"duplicate"}'); return; }
    list.forEach((s) => { lrs.stored.add(s.id); lrs.got.push(s); });
    lrs.headers.push({ url: req.url, auth: req.headers.authorization, version: req.headers['x-experience-api-version'], type: req.headers['content-type'] });
    res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(list.map((s) => s.id)));
  });
});
const until = async (fn, ms = 4000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (fn()) return true; await new Promise((r) => setTimeout(r, 25)); } return false; };

const day = (o) => Object.assign({
  id: 'k3j2h', day: 4, at: Date.UTC(2026, 9, 16, 12, 0, 0), seconds: 1500, score: 640,
  stars: { safety: 3, efficiency: 2, service: 2 }, criticals: [], delivered: 4,
  stops: [1, 2, 3, 4, 5].map((n) => ({ stop: n, delivered: n !== 4 }))
}, o || {});
const trainee = { id: 'emp042', name: 'Sam Rivera' };

test.before(async () => { await new Promise((r) => lrs.server.listen(0, '127.0.0.1', r)); lrs.port = lrs.server.address().port; });
test.after(() => { lrs.server.close(); fs.rmSync(DATA, { recursive: true, force: true }); fs.rmSync(LRS_DIR, { recursive: true, force: true }); });

const X = require('../server/xapi.js');
const endpoint = () => `http://127.0.0.1:${lrs.port}/xapi/`;
const reset = () => { lrs.got = []; lrs.headers = []; lrs.mode = 'ok'; lrs.stored = new Set(); };

test('without an endpoint it is off and does nothing', async () => {
  const x = X.create({});
  assert.equal(x.enabled, false);
  x.onProgress(trainee, null, { workday: { last: day() } });
  await x.flush();
  assert.equal(x.pending(), 0);
});

test('the statements for a finished day: one for the day, one per stop, well formed', () => {
  const list = X.statementsFor(trainee, day(), 'https://lrs.example.com', { safety: 2, efficiency: 2, service: 2 });
  assert.equal(list.length, 6);
  const [d, ...stops] = list;
  assert.match(d.id, /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.deepEqual(d.actor, { objectType: 'Agent', name: 'Sam Rivera', account: { homePage: 'https://lrs.example.com', name: 'emp042' } });
  assert.equal(d.verb.id, 'http://adlnet.gov/expapi/verbs/completed');
  assert.equal(d.object.id, 'https://lrs.example.com/activities/workday/k3j2h');
  assert.equal(d.timestamp, '2026-10-16T12:00:00.000Z');
  assert.deepEqual(d.result.score, { raw: 7, min: 0, max: 9, scaled: 0.778 });
  assert.equal(d.result.completion, true); assert.equal(d.result.success, true);
  assert.equal(d.result.duration, 'PT25M0S');
  assert.equal(stops.length, 5);
  assert.equal(stops[3].result.success, false, 'the undelivered stop');
  assert.equal(stops[0].object.id, 'https://lrs.example.com/activities/workday/k3j2h/stop/1');
  assert.equal(stops[0].context.contextActivities.parent[0].id, d.object.id);
  assert.equal(new Set(list.map((s) => s.id)).size, 6, 'every id different');
  // the same day always gives the same ids (a resend is a no-op for the store)
  assert.deepEqual(list.map((s) => s.id), X.statementsFor(trainee, day(), 'https://lrs.example.com', {}).map((s) => s.id));
});

test('success follows the pass marks, and durations are ISO 8601', () => {
  const marks = { safety: 2, efficiency: 2, service: 2 };
  const miss = X.statementsFor(trainee, day({ stars: { safety: 1, efficiency: 3, service: 3 } }), 'https://h', marks)[0];
  assert.equal(miss.result.success, false); assert.equal(miss.result.completion, true);
  assert.equal(X.statementsFor(trainee, day({ stars: { safety: 3, efficiency: 3, service: 3 } }), 'https://h', { safety: 3, efficiency: 3, service: 3 })[0].result.success, true);
  assert.equal(X.duration(0), 'PT0S'); assert.equal(X.duration(125), 'PT2M5S'); assert.equal(X.duration(3725), 'PT1H2M5S'); assert.equal(X.duration(3600), 'PT1H0M0S');
});

test('B-22: the day statement names its critical mistakes, type and label; older days without types still send', () => {
  const ext = (rec) => X.statementsFor(trainee, rec, 'https://h', {})[0].result.extensions;
  const k = 'https://ontheroute.example/xapi/extensions/';
  const rec = day({ criticals: ['Did not report damage you caused to the van', 'Drove into a no-entry street'], criticalTypes: ['trip.damage-report', 'drive.sign-noentry'] });
  assert.equal(ext(rec)[k + 'criticalErrors'], 2);
  assert.deepEqual(ext(rec)[k + 'criticalMistakes'], [
    { type: 'trip.damage-report', label: 'Did not report damage you caused to the van' },
    { type: 'drive.sign-noentry', label: 'Drove into a no-entry street' }]);
  assert.deepEqual(ext(day({ criticals: ['Crashed'] }))[k + 'criticalMistakes'], [{ type: null, label: 'Crashed' }], 'a day saved before types');
  assert.deepEqual(ext(day())[k + 'criticalMistakes'], [], 'a clean day');
  // the statement id does not change: a day already sent is not sent again because of the new extension
  assert.equal(X.statementsFor(trainee, rec, 'https://h', {})[0].id, X.statementsFor(trainee, day(), 'https://h', {})[0].id);
});

test('a finished day is posted once, with the right headers, and never twice', async () => {
  reset();
  const x = X.create({ endpoint: endpoint(), auth: 'Basic dXNlcjpwYXNz', outbox: path.join(DATA, 'o1.json') });
  const before = { workday: { last: null } }, after = { workday: { last: day() } };
  x.onProgress(trainee, before, after);
  assert.ok(await until(() => lrs.got.length === 6), 'six statements arrived: ' + lrs.got.length);
  assert.equal(lrs.headers[0].url, '/xapi/statements');
  assert.equal(lrs.headers[0].auth, 'Basic dXNlcjpwYXNz');
  assert.equal(lrs.headers[0].version, '1.0.3');
  assert.match(lrs.headers[0].type, /application\/json/);
  assert.equal(x.pending(), 0);
  // the same save again (a reload, another PC), and a save with no new day: nothing more is sent
  x.onProgress(trainee, after, { workday: { last: day() } });
  x.onProgress(trainee, after, { workday: { last: day() }, other: 1 });
  await x.flush(); await new Promise((r) => setTimeout(r, 150));
  assert.equal(lrs.got.length, 6);
  // a second day goes too
  x.onProgress(trainee, after, { workday: { last: day({ id: 'zz9', at: Date.UTC(2026, 9, 17), day: 5 }) } });
  assert.ok(await until(() => lrs.got.length === 12), 'second day: ' + lrs.got.length + ' pending ' + x.pending());
  x.stop();
});

test('the store being down never blocks, nothing is lost, and the statements go when it is back', async () => {
  reset(); lrs.mode = 'down';
  const outbox = path.join(DATA, 'o2.json');
  const x = X.create({ endpoint: endpoint(), outbox, retryMs: 80 });
  const t0 = Date.now();
  x.onProgress(trainee, null, { workday: { last: day() } });
  assert.ok(Date.now() - t0 < 50, 'the call returns at once');
  await new Promise((r) => setTimeout(r, 200));
  assert.equal(x.pending(), 6, 'still waiting');
  assert.equal(JSON.parse(fs.readFileSync(outbox, 'utf8')).length, 6, 'kept on disk');
  // a server restart: a new forwarder picks the outbox up
  x.stop();
  lrs.mode = 'error';
  const y = X.create({ endpoint: endpoint(), outbox, retryMs: 80 });
  await new Promise((r) => setTimeout(r, 250));
  assert.equal(y.pending(), 6, 'a 500 from the store keeps them too');
  lrs.mode = 'ok';
  assert.ok(await until(() => lrs.got.length === 6 && y.pending() === 0), 'sent once the store is back');
  assert.equal(JSON.parse(fs.readFileSync(outbox, 'utf8')).length, 0);
  y.stop();
});

test('statements the store already has (409) count as sent, and the others still go', async () => {
  reset();
  const x = X.create({ endpoint: endpoint(), outbox: path.join(DATA, 'o3.json') });
  const all = X.statementsFor(trainee, day(), 'http://127.0.0.1:' + lrs.port, { safety: 2, efficiency: 2, service: 2 });
  lrs.stored.add(all[2].id);                                // the store has one of them already
  x.onProgress(trainee, null, { workday: { last: day() } });
  assert.ok(await until(() => lrs.got.length === 5 && x.pending() === 0), 'five new ones stored, none left waiting: ' + lrs.got.length + '/' + x.pending());
  x.stop();
});

test('through the training server: saving progress with a finished day reaches the store', async () => {
  reset();
  process.env.OTR_DATA_DIR = DATA; process.env.OTR_XAPI_ENDPOINT = endpoint(); process.env.OTR_XAPI_AUTH = 'Basic c2VjcmV0';
  const { server } = require('../server/server.js');
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const put = (progress) => fetch(`${base}/api/progress?user=emp042`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ progress }) });
    let r = await put({ savedAt: 1, profile: { name: 'Sam Rivera' }, workday: { current: null, last: null } });
    assert.equal(r.status, 200); await new Promise((q) => setTimeout(q, 150));
    assert.equal(lrs.got.length, 0, 'nothing to send before a day is finished');
    r = await put({ savedAt: 2, profile: { name: 'Sam Rivera' }, workday: { current: null, last: day() } });
    assert.equal(r.status, 200);
    assert.ok(await until(() => lrs.got.length === 6), 'the finished day arrived: ' + lrs.got.length);
    assert.equal(lrs.headers[0].auth, 'Basic c2VjcmV0');
    assert.equal(lrs.got[0].actor.account.name, 'emp042');
    // no password or personal data beyond the id and the display name
    assert.equal(JSON.stringify(lrs.got).includes('password'), false);
    r = await put({ savedAt: 3, profile: { name: 'Sam Rivera' }, workday: { current: null, last: day() } });
    await new Promise((q) => setTimeout(q, 200));
    assert.equal(lrs.got.length, 6, 'a repeat save sends nothing');
  } finally { server.close(); }
});
