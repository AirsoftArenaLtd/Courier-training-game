/*
 * Trainee data on the training server (docs/DATA.md): a trainer can download everything held about one trainee and can
 * erase all of it (progress, every backup, the sign-in); only a trainer with the PIN can; the audit log records the
 * action and the id, never the data; old backups of reset trainees are purged after OTR_BACKUP_DAYS. No browser.
 *   node test/data.js
 */
'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('fs'), os = require('os'), path = require('path');

const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'otr-data-'));
process.env.OTR_DATA_DIR = DATA; process.env.OTR_TRAINER_PIN = '4821'; process.env.OTR_ACCOUNTS = '1'; process.env.OTR_BACKUP_DAYS = '30';
process.env.OTR_ALLOW_QUERY_USER = '1';
const { server, purgeBackups } = require('../server/server.js');
let base;
test.before(async () => { await new Promise((r) => server.listen(0, '127.0.0.1', r)); base = `http://127.0.0.1:${server.address().port}/api/`; });
test.after(() => { server.close(); fs.rmSync(DATA, { recursive: true, force: true }); });

const PIN = { 'X-Trainer-Pin': '4821' };
const call = async (p, method, body, headers) => {
  const r = await fetch(base + p, { method: method || 'GET', headers: Object.assign(body !== undefined ? { 'Content-Type': 'application/json' } : {}, headers || {}), body: body !== undefined ? JSON.stringify(body) : undefined });
  let j = null; try { j = await r.json(); } catch (e) { /* none */ }
  return { status: r.status, body: j, headers: r.headers };
};
const progressDir = () => path.join(DATA, 'progress');
const files = () => fs.readdirSync(progressDir());

test('a trainee with progress, a backup and an account', async () => {
  let r = await call('accounts', 'POST', { id: 'emp7', name: 'Pat Lee' }, PIN);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  r = await call('progress?user=emp7', 'PUT', { progress: { savedAt: 1, profile: { name: 'Pat Lee', id: 'emp7' }, day: 3, workday: { last: { id: 'a', day: 2, stars: { safety: 3 } } } } });
  // (with accounts on a ?user= link is allowed here only because OTR_ALLOW_QUERY_USER=1)
  assert.equal(r.status, 200, JSON.stringify(r.body));
  // a reset keeps the old file as a backup
  r = await call('trainees/emp7', 'DELETE', undefined, PIN);
  assert.equal(r.status, 200);
  assert.ok(files().some(n => n.endsWith('.bak')), 'a backup exists');
  r = await call('progress?user=emp7', 'PUT', { progress: { savedAt: 2, profile: { name: 'Pat Lee', id: 'emp7' }, day: 1 } });
  assert.equal(r.status, 200);
  assert.ok(files().includes('emp7.json'));
});

test('export and erase need the trainer PIN', async () => {
  for (const [p, m] of [['trainees/emp7/export', 'GET'], ['trainees/emp7/erase', 'POST']]) {
    let r = await call(p, m);
    assert.ok([401, 403].includes(r.status), `${m} ${p} without a PIN: ${r.status}`);
    r = await call(p, m, undefined, { 'X-Trainer-Pin': '0000' });
    assert.equal(r.status, 401, 'wrong PIN');
  }
  assert.ok(files().includes('emp7.json'), 'nothing was touched');
});

test('export: everything held about the trainee, no password material', async () => {
  const r = await call('trainees/emp7/export', 'GET', undefined, PIN);
  assert.equal(r.status, 200);
  assert.match(r.headers.get('content-disposition') || '', /attachment; filename="trainee-emp7\.json"/);
  assert.equal(r.body.id, 'emp7'); assert.equal(r.body.name, 'Pat Lee');
  assert.equal(r.body.progress.day, 1);
  assert.equal(r.body.account.id, 'emp7');
  assert.ok(r.body.backups.length >= 1, 'the backup is listed');
  const text = JSON.stringify(r.body);
  // the account's stored password material must not be in it, whatever the field is called
  const stored = JSON.parse(fs.readFileSync(path.join(DATA, 'accounts.json'), 'utf8'));
  const rec = stored.accounts ? stored.accounts.emp7 : stored.emp7;
  const secrets = Object.values((rec && rec.hash) || {}).filter(v => typeof v === 'string' && v.length >= 16);
  assert.ok(secrets.length >= 1, 'found the stored hash to look for');
  secrets.forEach(v => assert.equal(text.includes(v), false, 'a stored password value is in the export'));
  assert.deepEqual(Object.keys(r.body.account).sort(), ['changedAt', 'createdAt', 'id', 'locked', 'mustChange', 'name']);
  assert.equal((await call('trainees/nobody/export', 'GET', undefined, PIN)).status, 404);
});

test('erase: progress, backups and the sign-in all go; the audit log keeps the id and time only', async () => {
  const r = await call('trainees/emp7/erase', 'POST', undefined, PIN);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.account, true);
  assert.ok(r.body.removed >= 2, 'the file and its backup');
  assert.equal(files().filter(n => n.startsWith('emp7.json')).length, 0, 'no emp7 file or backup left');
  const acc = (await call('accounts', 'GET', undefined, PIN)).body;
  assert.equal(acc.some(a => a.id === 'emp7'), false, 'the sign-in is gone');
  assert.equal((await call('trainees/emp7/export', 'GET', undefined, PIN)).status, 404, 'nothing left to export');
  const lines = fs.readFileSync(path.join(DATA, 'audit.log'), 'utf8').trim().split('\n').map(l => JSON.parse(l));
  const e = lines.find(l => l.action === 'erase');
  assert.ok(e && e.trainee === 'emp7' && /^\d{4}-\d\d-\d\dT/.test(e.at));
  assert.deepEqual(Object.keys(e).sort(), ['action', 'at', 'trainee']);
  assert.ok(lines.some(l => l.action === 'export'), 'the export was logged too');
  assert.equal(fs.readFileSync(path.join(DATA, 'audit.log'), 'utf8').includes('Pat Lee'), false, 'no name or data in the log');
});

test('B-66: a milestone 8 workday is in the download whole (aids, critical types, road habits, the town, places) and erasing removes it', async () => {
  const day = { id: 'w8', day: 4, at: 1760900000000, seconds: 1500, score: 1900, stars: { safety: 1, efficiency: 2, service: 3 },
    criticals: ['Drove through a red traffic light'], criticalTypes: ['drive.red-light'], aids: 'flfon', road: [1, 2, 0, 1], townSeed: 7,
    lessons: ['Red means stop behind the line and wait for green.'], stops: [{ stop: 1, delivered: true, address: '204 Harbor St', x: 12, z: -30 }],
    events: [{ type: 'drive.red-light', key: 'signal:1:2:n', ok: false, stop: 1, where: { x: 12.5, z: -40.2, mph: 21, t: 300 } }] };
  let r = await call('progress?user=emp8', 'PUT', { progress: { savedAt: 3, profile: { name: 'Ana Ruiz', id: 'emp8' }, day: 5,
    workday: { last: day, first: { at: 1760800000000, score: 900, stars: { safety: 1, efficiency: 1, service: 1 }, criticals: 1, road: [2, 1, 1, 1] } },
    history: [{ id: 'workday', kind: 'workday', at: day.at, score: day.score, stars: day.stars, criticals: day.criticals, aids: day.aids, road: day.road }] } });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  r = await call('trainees/emp8/export', 'GET', undefined, PIN);
  assert.equal(r.status, 200);
  const last = r.body.progress.workday.last;
  for (const k of ['aids', 'criticalTypes', 'road', 'townSeed', 'stops', 'events']) assert.equal(JSON.stringify(last[k]), JSON.stringify(day[k]), 'the download has ' + k);
  assert.equal(JSON.stringify(r.body.progress.workday.first.road), '[2,1,1,1]', 'and the first day\'s road habits');
  assert.equal(JSON.stringify(r.body.progress.history[0].road), '[1,2,0,1]', 'and the record of runs');
  r = await call('trainees/emp8/erase', 'POST', undefined, PIN);
  assert.equal(r.status, 200);
  assert.equal(files().filter(n => n.startsWith('emp8.json')).length, 0, 'nothing of it left on disk');
  assert.equal((await call('trainees/emp8/export', 'GET', undefined, PIN)).status, 404);
});

test('old backups are purged after OTR_BACKUP_DAYS; recent ones and progress stay', () => {
  const old = path.join(progressDir(), 'zed.json.1.bak'), recent = path.join(progressDir(), 'zed.json.2.bak'), live = path.join(progressDir(), 'zed.json');
  fs.writeFileSync(old, '{}'); fs.writeFileSync(recent, '{}'); fs.writeFileSync(live, '{}');
  const t = (Date.now() - 31 * 86400000) / 1000;
  fs.utimesSync(old, t, t); fs.utimesSync(live, t, t);
  assert.equal(purgeBackups(), 1);
  assert.equal(fs.existsSync(old), false); assert.equal(fs.existsSync(recent), true); assert.equal(fs.existsSync(live), true, 'live progress is never purged');
});
