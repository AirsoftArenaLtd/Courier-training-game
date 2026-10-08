#!/usr/bin/env node
/*
 * Employee ID and password sign-in (server/auth.js, and its API in server/server.js), in Node with no browser.
 *
 *   node test/auth.js
 *
 * - the logic, on a fake clock: hashing, the temporary password and the first-sign-in change, lockout per ID (the same
 *   for IDs that do not exist), the per-address throttle, session expiry, a trainer's reset and removal, the file;
 * - the API, on a server started with accounts on: the cookie's flags, what a half-signed-in session can do, progress
 *   under the password session, the trainer's endpoints, and that the header sign-in still works;
 * - a server with accounts off answers exactly as before (no sign-in API, ?user= links work).
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');
const auth = require('../server/auth.js');

let fails = 0;
const check = (ok, what) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) fails++; };
const FAST = { N: 1024, r: 8, p: 1, keylen: 64 };       // quick hashes where the cost is not what is tested
const MIN = 60 * 1000;

function clock() { let t = 1.7e12; const f = () => t; f.add = (ms) => { t += ms; }; return f; }

async function unit() {
  console.log('\nhashing');
  const h1 = await auth.hashPassword('correct horse');
  const h2 = await auth.hashPassword('correct horse');
  check(h1.alg === 'scrypt' && h1.N === 16384 && h1.salt !== h2.salt && h1.key !== h2.key, 'scrypt with its own random salt each time');
  check(!JSON.stringify(h1).includes('correct horse'), 'the hash record holds no plaintext');
  check(await auth.verifyPassword('correct horse', h1) && !(await auth.verifyPassword('correct hors', h1)) && !(await auth.verifyPassword('', h1)), 'verify: right yes, wrong and empty no');
  check(!(await auth.verifyPassword(null, h1)) && !(await auth.verifyPassword('x', null)), 'verify: nothing to compare is a no');
  check(auth.normalizeId('  E1234 ') === 'e1234' && auth.normalizeId('jane.doe@corp') === 'jane.doe@corp' && auth.normalizeId('__proto__') === '' &&
    auth.normalizeId('a b') === '' && auth.normalizeId('') === '' && auth.normalizeId({}) === '' && auth.normalizeId('x'.repeat(65)) === '', 'employee IDs: trimmed, any case, a safe set of characters');
  const c = auth.cookie('abc', false);
  check(/HttpOnly/.test(c) && /SameSite=Strict/.test(c) && /Path=\//.test(c) && !/Max-Age|Expires/.test(c) && !/Secure/.test(c) && /Secure/.test(auth.cookie('abc', true)), 'cookie: HttpOnly, SameSite=Strict, ends with the browser, Secure over HTTPS');
  check(auth.sidFrom({ headers: { cookie: 'a=1; otr_sid=' + 'x'.repeat(43) + '; b=2' } }) === 'x'.repeat(43) && auth.sidFrom({ headers: { cookie: 'otr_sid=bad id' } }) === null, 'the session id is read from the cookie, and only a well-formed one');

  console.log('\nfirst sign-in');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'otr-auth-'));
  const file = path.join(dir, 'accounts.json');
  const now = clock();
  let A = auth.createAuth({ file, now, scrypt: FAST });
  const made = await A.createAccount(' E1001 ', 'Jane Doe');
  check(made.ok && made.id === 'e1001' && /^[a-hjkmnp-z2-9]{10}$/.test(made.tempPassword), `a trainer creates an account with a temporary password (${made.tempPassword})`);
  check((await A.createAccount('e1001', 'Again')).reason === 'exists' && (await A.createAccount('bad id!', 'X')).reason === 'id', 'no duplicate or malformed IDs');
  const raw = fs.readFileSync(file, 'utf8');
  check(!raw.includes(made.tempPassword) && /"mustChange": true/.test(raw), 'the accounts file holds the hash, never the password');
  if (process.platform !== 'win32') check((fs.statSync(file).mode & 0o077) === 0, 'the accounts file is readable by the server\'s user only');
  let r = await A.signIn('E1001', made.tempPassword, 'ip1');
  check(r.ok && r.mustChange && r.sid && A.session(r.sid).mustChange, 'the temporary password signs in to a session that must choose a password');
  const tempSid = r.sid;
  check((await A.changePassword(tempSid, 'short')).reason === 'short', 'a new password under 8 characters is refused');
  check((await A.changePassword(tempSid, made.tempPassword)).reason === 'same', 'the temporary password cannot be kept');
  check((await A.changePassword(tempSid, 'x'.repeat(auth.MAX_LEN + 1))).reason === 'long', 'a very long password is refused');
  r = await A.changePassword(tempSid, 'my own pass 1');
  check(r.ok && r.sid && r.sid !== tempSid && A.session(tempSid) === null && A.session(r.sid).mustChange === false, 'a new password: a fresh session id, the old one ends');
  check((await A.signIn('e1001', made.tempPassword, 'ip1')).reason === 'bad', 'the temporary password works only once');
  r = await A.signIn('e1001', 'my own pass 1', 'ip1');
  check(r.ok && !r.mustChange, 'their own password signs straight in');
  const own = r.sid;
  check((await A.changePassword(own, 'another pass 2', 'wrong one')).reason === 'bad', 'changing a password later needs the current one');
  check((await A.changePassword(own, 'my own pass 1', 'my own pass 1')).reason === 'same', '... and a different new one');
  r = await A.changePassword(own, 'another pass 2', 'my own pass 1');
  check(r.ok && A.session(own) === null, '... and signs out the old session');

  console.log('\nlockout');
  const known = [], unknown = [];
  for (let i = 0; i < 5; i++) known.push((await A.signIn('e1001', 'wrong ' + i, 'ip-' + i)).reason);
  for (let i = 0; i < 5; i++) unknown.push((await A.signIn('e9999', 'wrong ' + i, 'ip-u' + i)).reason);
  check(known.join() === 'bad,bad,bad,bad,locked', `five wrong passwords lock the ID (${known.join()})`);
  check(unknown.join() === known.join(), 'an ID that does not exist answers exactly the same');
  const m1 = await A.signIn('e1001', 'x', 'ip9'), m2 = await A.signIn('e9999', 'x', 'ip9');
  check(m1.error === m2.error && m1.status === m2.status, 'the same message and status either way: ' + m1.error);
  check((await A.signIn('e1001', 'another pass 2', 'ip-new')).reason === 'locked', 'the right password does not open a locked ID');
  check(A.list().find(a => a.id === 'e1001').locked, 'the trainer sees it locked');
  now.add(14 * MIN);
  check((await A.signIn('e1001', 'another pass 2', 'ip-new')).reason === 'locked', 'still locked after 14 minutes');
  now.add(2 * MIN);
  check((await A.signIn('e1001', 'another pass 2', 'ip-new')).ok, 'open again after 15 minutes');

  console.log('\nper-address throttle');
  const seq = [];
  for (let i = 0; i < 11; i++) seq.push((await A.signIn('someone' + i, 'wrong', 'ip-busy')).reason);
  check(seq.slice(0, 10).every(x => x === 'bad') && seq[10] === 'throttled', 'ten wrong tries from one address, then it waits');
  check((await A.signIn('e1001', 'another pass 2', 'ip-busy')).reason === 'throttled' && (await A.signIn('e1001', 'another pass 2', 'ip-other')).ok, 'only that address waits');
  now.add(MIN + 1);
  check((await A.signIn('e1001', 'another pass 2', 'ip-busy')).ok, 'a minute later it is let through');

  console.log('\nsession expiry');
  let s = (await A.signIn('e1001', 'another pass 2', 'ip1')).sid;
  now.add(119 * MIN);
  check(!!A.session(s), 'a session used within two hours stays');
  now.add(121 * MIN);
  check(A.session(s) === null, 'two hours unused ends it');
  s = (await A.signIn('e1001', 'another pass 2', 'ip1')).sid;
  for (let i = 0; i < 11; i++) { now.add(59 * MIN); A.session(s); }
  check(A.session(s) === null, 'ten hours ends it, however busy');
  const made2 = await A.createAccount('e1002', 'Sam Lee');
  s = (await A.signIn('e1002', made2.tempPassword, 'ip1')).sid;
  now.add(16 * MIN);
  check(A.session(s) === null && (await A.changePassword(s, 'new password 3')).reason === 'expired', 'a temporary-password session lasts 15 minutes');
  check(A.session('not-a-session') === null && A.session(undefined) === null, 'an unknown session id is nobody');

  console.log('\ntrainer reset and removal');
  for (let i = 0; i < 5; i++) await A.signIn('e1001', 'wrong', 'ip-r' + i);
  check((await A.signIn('e1001', 'another pass 2', 'ipx')).reason === 'locked', 'e1001 locked before the reset');
  const before = (await A.signIn('e1002', made2.tempPassword, 'ip1')).sid;
  const reset = await A.resetPassword('E1001');
  check(reset.ok && reset.tempPassword && reset.tempPassword !== made.tempPassword, 'a reset gives a new temporary password');
  check((await A.signIn('e1001', 'another pass 2', 'ipx')).reason === 'bad', 'the old password stops working');
  r = await A.signIn('e1001', reset.tempPassword, 'ipx');
  check(r.ok && r.mustChange, 'the reset unlocks the ID, and they must choose a password again');
  const e1001sid = (await A.changePassword(r.sid, 'fresh pass 4')).sid;
  check(!!A.session(e1001sid), 'chosen');
  await A.resetPassword('e1001');
  check(A.session(e1001sid) === null, 'a reset signs the account out everywhere');
  check(!!A.session(before), 'other accounts stay signed in');
  check((await A.resetPassword('nobody')).reason === 'missing', 'resetting an ID with no account says so (to the trainer)');
  check(A.removeAccount('e1002').ok && A.session(before) === null && (await A.signIn('e1002', made2.tempPassword, 'ip1')).reason === 'bad', 'removing an account ends its sessions and sign-in');

  console.log('\nthe file');
  const B = auth.createAuth({ file, now, scrypt: FAST });
  check(B.has('e1001') && !B.has('e1002') && B.list()[0].mustChange === true, 'accounts survive a restart; sessions do not');
  fs.writeFileSync(file, '{ broken');
  let threw = false;
  try { auth.createAuth({ file }); } catch (e) { threw = true; }
  check(threw, 'a damaged accounts file stops the server instead of starting with nobody');
  fs.rmSync(dir, { recursive: true, force: true });

  console.log('\ntiming');
  const T = auth.createAuth({});
  const acct = await T.createAccount('e5000', 'Timed');
  await T.signIn('warmup', 'x', 'w');
  const time = async (id, n) => { const out = []; for (let i = 0; i < n; i++) { const t0 = process.hrtime.bigint(); await T.signIn(id, 'wrong password', 'ip-t' + id + i); out.push(Number(process.hrtime.bigint() - t0) / 1e6); } return out.sort((a, b) => a - b)[Math.floor(n / 2)]; };
  const tk = await time('e5000', 3), tu = await time('e5001', 3);
  check(tu > tk / 3 && tu < tk * 3, `an unknown ID takes about as long as a wrong password (${tu.toFixed(1)} ms vs ${tk.toFixed(1)} ms)`);
  check(acct.ok, 'timing account made');
}

/* ------------------------------------------------------------------ the API */
function request(base, method, p, o) {
  o = o || {};
  return new Promise((resolve, reject) => {
    const headers = Object.assign({}, o.headers || {});
    let data = null;
    if (o.json !== undefined) { data = JSON.stringify(o.json); headers['Content-Type'] = headers['Content-Type'] || 'application/json'; }
    if (o.cookie) headers.Cookie = o.cookie;
    const req = http.request(base + p, { method, headers }, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => { let j = null; try { j = JSON.parse(d); } catch (e) { /* not JSON */ } resolve({ code: res.statusCode, body: j, raw: d, cookie: res.headers['set-cookie'] && res.headers['set-cookie'][0] }); });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}
const sidOf = (setCookie) => (/otr_sid=([^;]*)/.exec(setCookie || '') || [])[1];

/** A server in its own process, so its settings (read when it starts) are its own. */
function startServer(env) {
  return new Promise((resolve, reject) => {
    const code = "const {server}=require(" + JSON.stringify(path.resolve(__dirname, '../server/server.js')) + ");server.listen(0,'127.0.0.1',()=>console.log('PORT '+server.address().port));";
    const child = spawn(process.execPath, ['-e', code], { env: Object.assign({}, process.env, env), stdio: ['ignore', 'pipe', 'inherit'] });
    let out = '';
    child.stdout.on('data', d => { out += d; const m = /PORT (\d+)/.exec(out); if (m) resolve({ child, base: `http://127.0.0.1:${m[1]}/` }); });
    child.on('exit', c => reject(new Error('server exited ' + c)));
  });
}

async function api() {
  console.log('\nAPI with accounts on');
  const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'otr-auth-api-'));
  const { child, base } = await startServer({ OTR_DATA_DIR: DATA, OTR_ACCOUNTS: '1', OTR_TRAINER_PIN: '4821', OTR_ALLOW_QUERY_USER: '' });
  const PIN = { 'x-trainer-pin': '4821' };
  try {
    let r = await request(base, 'GET', 'api/whoami');
    check(r.body.id === null && r.body.accounts === true && !r.body.mustChange, 'whoami: nobody yet, and the server asks for a sign-in');
    r = await request(base, 'GET', 'api/whoami?user=jdoe');
    check(r.body.id === null, '?user= links do not skip the password');
    r = await request(base, 'GET', 'api/whoami', { headers: { 'x-remote-user': 'CORP\\jdoe' } });
    check(r.body.id === 'jdoe', 'a company sign-in header still names the trainee');

    check((await request(base, 'POST', 'api/accounts', { json: { id: 'e2001', name: 'Ana Ruiz' } })).code === 401, 'creating an account needs the trainer PIN');
    r = await request(base, 'POST', 'api/accounts', { json: { id: 'E2001', name: 'Ana Ruiz' }, headers: PIN });
    const temp = r.body.tempPassword;
    check(r.code === 200 && r.body.id === 'e2001' && temp, 'a trainer creates an account');
    r = await request(base, 'GET', 'api/trainees', { headers: PIN });
    check(r.code === 200 && r.body.some(t => t.id === 'e2001' && t.account && t.name === 'Ana Ruiz'), 'the new account is in the trainee list before any training');

    r = await request(base, 'POST', 'api/signin', { json: { id: 'e2001', password: temp }, headers: { 'Content-Type': 'text/plain' } });
    check(r.code === 415, 'sign-in takes a JSON body only (no cross-site form posts)');
    const bad1 = await request(base, 'POST', 'api/signin', { json: { id: 'e2001', password: 'nope' } });
    const bad2 = await request(base, 'POST', 'api/signin', { json: { id: 'e2999', password: 'nope' } });
    check(bad1.code === 401 && bad2.code === 401 && bad1.body.error === bad2.body.error && !bad1.cookie, 'wrong password and unknown ID: the same 401, no cookie');

    r = await request(base, 'POST', 'api/signin', { json: { id: ' E2001', password: temp } });
    const c1 = r.cookie;
    check(r.code === 200 && r.body.mustChange && /HttpOnly/.test(c1) && /SameSite=Strict/.test(c1) && !/Max-Age/.test(c1) && !/Secure/.test(c1), 'the temporary password: an HttpOnly, SameSite=Strict session cookie (no Secure over plain HTTP)');
    check(!r.raw.includes(sidOf(c1)), 'the session id is only in the cookie, never in the body');
    const ck1 = 'otr_sid=' + sidOf(c1);
    r = await request(base, 'GET', 'api/whoami', { cookie: ck1 });
    check(r.body.id === null && r.body.mustChange === true, 'whoami: must choose a password first');
    check((await request(base, 'GET', 'api/progress', { cookie: ck1 })).code === 401, 'no progress until a password is chosen');
    r = await request(base, 'POST', 'api/password', { json: { password: temp }, cookie: ck1 });
    check(r.code === 400 && r.body.reason === 'same', 'the temporary password cannot be kept');
    r = await request(base, 'POST', 'api/password', { json: { password: 'seven77' }, cookie: ck1 });
    check(r.code === 400 && r.body.reason === 'short', 'nor one under 8 characters');
    r = await request(base, 'POST', 'api/password', { json: { password: 'ana chooses this' }, cookie: ck1 });
    const ck2 = 'otr_sid=' + sidOf(r.cookie);
    check(r.code === 200 && ck2 !== ck1 && /HttpOnly/.test(r.cookie), 'a new password: a new session cookie');
    check((await request(base, 'GET', 'api/whoami', { cookie: ck1 })).body.mustChange !== true, 'the temporary session is over');
    r = await request(base, 'GET', 'api/whoami', { cookie: ck2 });
    check(r.body.id === 'e2001' && r.body.name === 'Ana Ruiz' && r.body.session === true, 'whoami: signed in by password, with the name the trainer gave');
    r = await request(base, 'PUT', 'api/progress', { json: { progress: { savedAt: 5, day: 3 } }, cookie: ck2 });
    check(r.code === 200 && JSON.parse(fs.readFileSync(path.join(DATA, 'progress', 'e2001.json'), 'utf8')).day === 3, 'progress saves under the employee ID');
    check((await request(base, 'GET', 'api/progress', { cookie: ck2 })).body.progress.day === 3, 'and comes back');

    r = await request(base, 'GET', 'api/accounts', { headers: PIN });
    check(r.code === 200 && r.body.length === 1 && !JSON.stringify(r.body).match(/hash|salt|key/), 'the trainer\'s account list carries no hashes');
    r = await request(base, 'POST', 'api/accounts/e2001/reset', { headers: PIN });
    check(r.code === 200 && r.body.tempPassword, 'a trainer resets the password');
    check((await request(base, 'GET', 'api/progress', { cookie: ck2 })).code === 401, 'which signs the trainee out');
    r = await request(base, 'POST', 'api/signin', { json: { id: 'e2001', password: r.body.tempPassword } });
    check(r.code === 200 && r.body.mustChange, 'and they choose a password again');
    const ck3 = 'otr_sid=' + sidOf(r.cookie);
    await request(base, 'POST', 'api/password', { json: { password: 'ana again 2026' }, cookie: ck3 });
    r = await request(base, 'POST', 'api/signin', { json: { id: 'e2001', password: 'ana again 2026' } });
    const ck4 = 'otr_sid=' + sidOf(r.cookie);
    r = await request(base, 'POST', 'api/signout', { cookie: ck4 });
    check(r.code === 200 && /Max-Age=0/.test(r.cookie) && (await request(base, 'GET', 'api/progress', { cookie: ck4 })).code === 401, 'signing out ends the session and clears the cookie');

    const lock = [];
    for (let i = 0; i < 6; i++) lock.push((await request(base, 'POST', 'api/signin', { json: { id: 'e2001', password: 'wrong' + i } })).code);
    check(lock.join() === '401,401,401,401,429,429', `five wrong tries lock the ID (${lock.join()})`);
    check((await request(base, 'POST', 'api/signin', { json: { id: 'e2001', password: 'ana again 2026' } })).code === 429, 'the right password waits too');
    check((await request(base, 'GET', 'server/data/accounts.json')).code === 404, 'the accounts file is never served');
    check(!fs.readFileSync(path.join(DATA, 'accounts.json'), 'utf8').includes('ana again 2026'), 'no password on disk');
    r = await request(base, 'DELETE', 'api/accounts/e2001', { headers: PIN });
    check(r.code === 200 && fs.existsSync(path.join(DATA, 'progress', 'e2001.json')), 'removing an account keeps the progress');
  } finally {
    child.kill();
    fs.rmSync(DATA, { recursive: true, force: true });
  }

  console.log('\nAPI with accounts off');
  const DATA2 = fs.mkdtempSync(path.join(os.tmpdir(), 'otr-auth-off-'));
  const off = await startServer({ OTR_DATA_DIR: DATA2, OTR_ACCOUNTS: '', OTR_TRAINER_PIN: '', OTR_ALLOW_QUERY_USER: '' });
  try {
    let r = await request(off.base, 'GET', 'api/whoami');
    check(r.body.id === null && !('accounts' in r.body) && !('mustChange' in r.body), 'whoami as before');
    r = await request(off.base, 'GET', 'api/whoami?user=jdoe');
    check(r.body.id === 'jdoe' && !('session' in r.body), '?user= links work as before');
    check((await request(off.base, 'POST', 'api/signin', { json: { id: 'a', password: 'b' } })).code === 404 &&
      (await request(off.base, 'GET', 'api/accounts')).code === 404, 'no sign-in API');
    check(!fs.existsSync(path.join(DATA2, 'accounts.json')), 'no accounts file is made');
  } finally {
    off.child.kill();
    fs.rmSync(DATA2, { recursive: true, force: true });
  }
}

(async () => {
  try { await unit(); await api(); } catch (e) { check(false, 'script error: ' + (e && e.stack || e)); }
  console.log(fails ? `\n${fails} failed` : '\nall sign-in checks passed');
  process.exit(fails ? 1 : 0);
})();
