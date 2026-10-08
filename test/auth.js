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
 * - a burst of simultaneous sign-ins: counted before any hashing, and only a few password checks at once;
 * - which files are served: only the game's own, whatever the case, encoding or Windows spelling of a private path;
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

  console.log('\nsimultaneous sign-ins');
  {
    let runs = 0, now2 = 0, most = 0;
    const verify = async (pw, h) => { runs++; now2++; most = Math.max(most, now2); try { return await auth.verifyPassword(pw, h); } finally { now2--; } };
    const C = auth.createAuth({ now: clock(), scrypt: FAST, verify });
    const acc = await C.createAccount('e7000', 'Burst');
    const first = await C.changePassword((await C.signIn('e7000', acc.tempPassword, 'setup')).sid, 'burst pass 1');
    check(first.ok, 'account ready');
    runs = 0; most = 0;
    const one = await Promise.all(Array.from({ length: 200 }, (_, i) => C.signIn('burst' + i, 'wrong', 'ip-burst')));
    const tally = (rs) => rs.reduce((m, r) => { m[r.reason] = (m[r.reason] || 0) + 1; return m; }, {});
    check(runs <= 10 && one.every(r => !r.ok), `200 at once from one address: ${runs} password checks, the rest turned away (${JSON.stringify(tally(one))})`);
    check(most <= C.config.maxHashing, `at most ${C.config.maxHashing} checks at a time (${most})`);
    check((await C.signIn('e7000', 'burst pass 1', 'ip-burst')).reason === 'throttled', 'that address then waits');
    runs = 0; most = 0;
    const many = await Promise.all(Array.from({ length: 200 }, (_, i) => C.signIn('spread' + i, 'wrong', 'ip-spread-' + i)));
    const cap = C.config.maxHashing + C.config.maxQueue;
    check(runs <= cap && many.filter(r => r.reason === 'busy').length >= 200 - cap && most <= C.config.maxHashing,
      `200 at once from 200 addresses: ${runs} password checks (at most ${cap}), at most ${most} at a time, the rest told the server is busy`);
    const busy = many.find(r => r.reason === 'busy');
    check(busy && busy.status === 503 && busy.error === auth.MESSAGES.busy, 'busy: 503, "' + (busy && busy.error) + '"');
    check(!!(await C.signIn('e7000', 'burst pass 1', 'ip-another')).ok, 'afterwards a trainee from another address signs in fine');
    check(!!(await C.signIn('e7000', 'burst pass 1', 'ip-spread-7')).ok, '... and so does one whose address was turned away as busy (it was not held against it)');
    runs = 0;
    const same = await Promise.all(Array.from({ length: 40 }, (_, i) => C.signIn('e7000', 'wrong ' + i, 'ip-one-id-' + i)));
    check(runs <= C.config.lockAfter && (await C.signIn('e7000', 'burst pass 1', 'ip-late')).reason === 'locked',
      `40 at once at one ID from 40 addresses: ${runs} password checks, then the ID is locked (${JSON.stringify(tally(same))})`);
    const ghost = await Promise.all(Array.from({ length: 40 }, (_, i) => C.signIn('e7999', 'wrong ' + i, 'ip-ghost-' + i)));
    check(JSON.stringify(tally(ghost)) === JSON.stringify(tally(same)), 'an ID that does not exist answers a burst the same way');
  }

  console.log('\nsimultaneous password changes and trainer hashing');
  {
    let checks = 0, hashes = 0, at = 0, most = 0;
    const busyNow = async (f) => { at++; most = Math.max(most, at); try { return await f(); } finally { at--; } };
    const verify = (pw, h) => { checks++; return busyNow(() => auth.verifyPassword(pw, h)); };
    const hash = (pw, prm) => { hashes++; return busyNow(() => auth.hashPassword(pw, prm)); };
    const D = auth.createAuth({ now: clock(), scrypt: FAST, verify, hash });
    const cap = D.config.maxHashing + D.config.maxQueue;
    const tally = (rs) => rs.reduce((m, r) => { m[r.reason || 'ok'] = (m[r.reason || 'ok'] || 0) + 1; return m; }, {});
    const reset = () => { checks = 0; hashes = 0; most = 0; };

    // the temporary-password session: no current password needed, so the cheapest to flood
    const acc = await D.createAccount('e8000', 'Flood');
    const tmpSid = (await D.signIn('e8000', acc.tempPassword, 'ip-f')).sid;
    reset();
    let rs = await Promise.all(Array.from({ length: 100 }, (_, i) => D.changePassword(tmpSid, 'flood pass ' + i)));
    let won = rs.filter(r => r.ok);
    check(checks + hashes <= cap && most <= D.config.maxHashing, `100 changes at once on a temporary session: ${checks} checks + ${hashes} hashes (at most ${cap}), at most ${most} at a time`);
    check(won.length === 1 && rs.filter(r => r.reason === 'pending').length === 99, `exactly one succeeds, the rest are told one is under way (${JSON.stringify(tally(rs))})`);
    const pend = rs.find(r => r.reason === 'pending');
    check(pend && pend.status === 409 && pend.error === auth.MESSAGES.pending, 'pending: 409, "' + (pend && pend.error) + '"');
    const winPw = 'flood pass ' + rs.indexOf(won[0]);
    check(D.session(tmpSid) === null && !!D.session(won[0].sid) && (await D.signIn('e8000', winPw, 'ip-f2')).ok, 'the one new password works, and the temporary session is over');

    // a signed-in session (current password needed), several sessions of one account at once
    const s1 = (await D.signIn('e8000', winPw, 'ip-g1')).sid, s2 = (await D.signIn('e8000', winPw, 'ip-g2')).sid;
    reset();
    rs = await Promise.all(Array.from({ length: 100 }, (_, i) => D.changePassword(i % 2 ? s1 : s2, 'second pass ' + i, winPw)));
    won = rs.filter(r => r.ok);
    check(checks + hashes <= cap && most <= D.config.maxHashing && won.length === 1,
      `100 changes at once from two sessions of one account: ${checks} checks + ${hashes} hashes, exactly one succeeds (${JSON.stringify(tally(rs))})`);
    check(D.session(s1) === null && D.session(s2) === null && !!D.session(won[0].sid), 'and every other session of the account ends');
    const pw2 = 'second pass ' + rs.indexOf(won[0]);

    // guessing the current password with a stolen session: the account's lock, a burst or one at a time
    const s3 = won[0].sid;
    reset();
    rs = await Promise.all(Array.from({ length: 100 }, (_, i) => D.changePassword(s3, 'stolen pass 1', 'guess ' + i)));
    check(checks <= 2 && hashes === 0 && !rs.some(r => r.ok), `100 guesses at once with one session: ${checks} checks, no hashes (${JSON.stringify(tally(rs))})`);
    const seq = [];
    for (let i = 0; i < 6; i++) seq.push((await D.changePassword(s3, 'stolen pass 1', 'guess again ' + i)).reason);
    check(seq.slice(-2).join() === 'locked,locked' && seq.filter(x => x === 'bad').length <= 4, `wrong current passwords lock the account like wrong sign-ins (${seq.join()})`);
    check((await D.changePassword(s3, 'stolen pass 1', pw2)).reason === 'locked' && (await D.signIn('e8000', pw2, 'ip-h')).reason === 'locked', 'then even the right one waits, here and at sign-in');

    // a trainer making or resetting many accounts at once
    reset();
    rs = await Promise.all(Array.from({ length: 100 }, (_, i) => D.createAccount('bulk' + i, 'Bulk ' + i)));
    check(hashes <= cap && most <= D.config.maxHashing && rs.filter(r => r.ok).length + rs.filter(r => r.reason === 'busy').length === 100 && rs.some(r => r.reason === 'busy'),
      `100 new accounts at once: ${hashes} hashes (at most ${cap}), at most ${most} at a time, the rest busy (${JSON.stringify(tally(rs))})`);
    const made = rs.filter(r => r.ok).map(r => r.id);
    check(made.every(id => D.has(id)) && !rs.some(r => !r.ok && D.has('bulk' + rs.indexOf(r))), 'only the accounts that were hashed exist');
    reset();
    rs = await Promise.all(Array.from({ length: 100 }, (_, i) => D.resetPassword(made[i % made.length])));
    check(hashes <= Math.min(cap, made.length) && most <= D.config.maxHashing && rs.every(r => r.ok || r.reason === 'busy' || r.reason === 'inprogress'),
      `100 resets at once of ${made.length} accounts: ${hashes} hashes (one per account at most), at most ${most} at a time (${JSON.stringify(tally(rs))})`);
    const perId = {};
    rs.filter(r => r.ok).forEach(r => { perId[r.id] = (perId[r.id] || []).concat(r.tempPassword); });
    let resetsWork = true;
    for (const id of Object.keys(perId)) resetsWork = resetsWork && perId[id].length === 1 && !!(await D.signIn(id, perId[id][0], 'ip-rs-' + id)).ok;
    check(Object.keys(perId).length > 0 && resetsWork, `at most one reset per account succeeds, and the password it returned is the one that works (${Object.keys(perId).length} accounts)`);
    reset();
    rs = await Promise.all(Array.from({ length: 60 }, (_, i) => D.createAccount('bulk2-' + i)));
    const busy = rs.find(r => r.reason === 'busy');
    check(busy && busy.status === 503 && busy.error === auth.MESSAGES.busy, 'a trainer turned away is told the server is busy (503)');

    // and once things are quiet, everything works one at a time
    const rr = await D.resetPassword('e8000');
    const t1 = await D.signIn('e8000', rr.tempPassword, 'ip-q');
    const c1 = await D.changePassword(t1.sid, 'quiet pass 1');
    const c2 = await D.changePassword(c1.sid, 'quiet pass 2', 'quiet pass 1');
    check(rr.ok && t1.ok && t1.mustChange && c1.ok && c2.ok && (await D.signIn('e8000', 'quiet pass 2', 'ip-q')).ok, 'afterwards a reset, the first-sign-in change and a normal change all work');

    // many accounts changing at once share the same ration as sign-in; a reset meanwhile wins
    const crowd = [];
    for (let i = 0; i < 40; i++) {
      const m = await D.createAccount('crowd' + i, 'Crowd ' + i);
      crowd.push((await D.signIn('crowd' + i, m.tempPassword, 'ip-c' + i)).sid);
    }
    reset();
    rs = await Promise.all(crowd.map((sid, i) => D.changePassword(sid, 'crowd pass ' + i)));
    check(checks + hashes <= 2 * cap && most <= D.config.maxHashing && rs.some(r => r.reason === 'busy') && rs.every(r => r.ok || r.reason === 'busy'),
      `40 accounts changing at once: ${checks} checks + ${hashes} hashes in at most ${cap} turns, at most ${most} at a time (${JSON.stringify(tally(rs))})`);
    const left = crowd.findIndex((sid, i) => rs[i].reason === 'busy');
    const mid = D.changePassword(crowd[left], 'crowd pass late');
    const rr2 = await D.resetPassword('crowd' + left);
    const midR = await mid;
    check(rr2.ok && midR.reason === 'expired' && (await D.signIn('crowd' + left, rr2.tempPassword, 'ip-cl')).ok, 'a reset while a change is being checked: the change is refused, the reset stands');
  }

  await races();
  await stale();

  console.log('\ntiming');
  const T = auth.createAuth({});
  const acct = await T.createAccount('e5000', 'Timed');
  await T.signIn('warmup', 'x', 'w');
  const time = async (id, n) => { const out = []; for (let i = 0; i < n; i++) { const t0 = process.hrtime.bigint(); await T.signIn(id, 'wrong password', 'ip-t' + id + i); out.push(Number(process.hrtime.bigint() - t0) / 1e6); } return out.sort((a, b) => a - b)[Math.floor(n / 2)]; };
  const tk = await time('e5000', 3), tu = await time('e5001', 3);
  check(tu > tk / 3 && tu < tk * 3, `an unknown ID takes about as long as a wrong password (${tu.toFixed(1)} ms vs ${tk.toFixed(1)} ms)`);
  check(acct.ok, 'timing account made');
}

/*
 * A password check or hash that can be held part-way: holdNext() traps the next call only (later ones run as usual);
 * its `in` resolves once the call is held, release() lets it go on. throwNext() makes the next call fail.
 */
function holdable(real) {
  const traps = [];
  const f = async (...a) => {
    const t = traps.shift();
    if (t) { t.entered(); await t.gate; if (t.boom) throw new Error('test: hash failed'); }
    return real(...a);
  };
  f.holdNext = () => { const t = {}; t.gate = new Promise(r => { t.release = r; }); t.in = new Promise(r => { t.entered = r; }); traps.push(t); return t; };
  f.throwNext = () => { const t = f.holdNext(); t.boom = true; t.release(); return t; };
  f.calls = 0;
  return f;
}

async function races() {
  console.log('\nraces: every commit after an await re-checks the account version');
  const verify = holdable((pw, h) => { verify.calls++; return auth.verifyPassword(pw, h); });
  const hash = holdable((pw, prm) => { hash.calls++; return auth.hashPassword(pw, prm); });
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'otr-race-'));
  const file = path.join(dir, 'accounts.json');
  const R = auth.createAuth({ file, now: clock(), scrypt: FAST, verify, hash });
  let n = 0;
  const ip = () => 'ip-race-' + (n++);
  /** A fresh account with its own password chosen; returns that password. */
  async function ready(id) {
    const m = await R.createAccount(id, id);
    const c = await R.changePassword((await R.signIn(id, m.tempPassword, ip())).sid, id + ' own pass');
    if (!c.ok) throw new Error('setup ' + id);
    return id + ' own pass';
  }
  const sessionsOf = async (id, pw) => { const r = await R.signIn(id, pw, ip()); return r; };

  // sign-in held in its password check, then a reset: the old password must not yield a session
  let pw = await ready('r1');
  let t = verify.holdNext();
  let si = R.signIn('r1', pw, ip());
  await t.in;
  const rr = await R.resetPassword('r1');
  t.release();
  let res = await si;
  check(rr.ok && !res.ok && !res.sid, `sign-in checked while a reset lands: no session for the old password (${res.reason})`);
  check((await sessionsOf('r1', rr.tempPassword)).ok && !(await sessionsOf('r1', pw)).ok, '... the reset password works and the old one does not');

  // ... then a password change from another session
  pw = await ready('r2');
  const other = (await R.signIn('r2', pw, ip())).sid;
  t = verify.holdNext();
  si = R.signIn('r2', pw, ip());
  await t.in;
  const ch = await R.changePassword(other, 'r2 newer pass', pw);
  t.release();
  res = await si;
  check(ch.ok && !res.ok && !res.sid, `sign-in checked while the password changes: no session for the old password (${res.reason})`);

  // ... then the account is removed, and removed and made again
  pw = await ready('r3');
  t = verify.holdNext();
  si = R.signIn('r3', pw, ip());
  await t.in;
  R.removeAccount('r3');
  t.release();
  res = await si;
  check(!res.ok && !res.sid, `sign-in checked while the account is removed: no session (${res.reason})`);
  pw = await ready('r4');
  t = verify.holdNext();
  si = R.signIn('r4', pw, ip());
  await t.in;
  R.removeAccount('r4');
  const again = await R.createAccount('r4', 'Again');
  t.release();
  res = await si;
  check(again.ok && !res.ok && !res.sid, `... or removed and made again under the same ID: the old password gets no session (${res.reason})`);

  // two resets at once: exactly one succeeds, without a second hash, and the password it returns is the stored one
  pw = await ready('r5');
  hash.calls = 0;
  t = hash.holdNext();
  const ra = R.resetPassword('r5');
  await t.in;
  const rb = await R.resetPassword('r5');
  t.release();
  const raR = await ra;
  check(raR.ok && !rb.ok && rb.reason === 'inprogress' && rb.status === 409 && !rb.tempPassword && hash.calls === 1,
    `two resets at once: one succeeds, the other is told one is under way (409) with no hashing (${hash.calls} hash)`);
  check((await sessionsOf('r5', raR.tempPassword)).ok, '... and the password the successful one returned is the one that works');

  // a reset hashing while the account changes under it does not report success
  pw = await ready('r6');
  const s6 = (await R.signIn('r6', pw, ip())).sid;
  t = hash.holdNext();
  const rc = R.resetPassword('r6');
  await t.in;
  const c6 = await R.changePassword(s6, 'r6 newer pass', pw);
  t.release();
  const rcR = await rc;
  check(c6.ok && !rcR.ok && !rcR.tempPassword && rcR.reason === 'inprogress' && (await sessionsOf('r6', 'r6 newer pass')).ok,
    `a reset overtaken by a password change: the reset reports no success and the change stands (${rcR.reason})`);
  pw = await ready('r7');
  t = hash.holdNext();
  const rd = R.resetPassword('r7');
  await t.in;
  R.removeAccount('r7');
  t.release();
  const rdR = await rd;
  check(!rdR.ok && rdR.reason === 'missing' && !R.has('r7'), 'a reset overtaken by a removal: missing, and the account is not brought back');

  // a password change held, then the account is removed, or removed and made again
  pw = await ready('r8');
  let s8 = (await R.signIn('r8', pw, ip())).sid;
  t = verify.holdNext();
  let cg = R.changePassword(s8, 'r8 newer pass', pw);
  await t.in;
  R.removeAccount('r8');
  t.release();
  res = await cg;
  check(!res.ok && res.reason === 'expired' && !R.has('r8'), `a change overtaken by a removal: expired, the account stays gone (${res.reason})`);
  pw = await ready('r9');
  s8 = (await R.signIn('r9', pw, ip())).sid;
  t = verify.holdNext();
  cg = R.changePassword(s8, 'r9 newer pass', pw);
  await t.in;
  R.removeAccount('r9');
  const made9 = await R.createAccount('r9', 'Again');
  t.release();
  res = await cg;
  check(!res.ok && res.reason === 'expired' && (await sessionsOf('r9', made9.tempPassword)).ok && !(await sessionsOf('r9', 'r9 newer pass')).ok,
    `... or removed and made again: the change does not land on the new account (${res.reason})`);

  // a change whose current password is wrong, overtaken by a reset: not counted as a guess
  pw = await ready('r10');
  const s10 = (await R.signIn('r10', pw, ip())).sid;
  t = verify.holdNext();
  cg = R.changePassword(s10, 'r10 newer pass', 'not it');
  await t.in;
  await R.resetPassword('r10');
  t.release();
  res = await cg;
  check(res.reason === 'expired', `a change overtaken by a reset: expired (${res.reason})`);

  // the same ID created twice at once: one account, one hash
  hash.calls = 0;
  t = hash.holdNext();
  const ca = R.createAccount('r11', 'One');
  await t.in;
  const cb = await R.createAccount('r11', 'Two');
  t.release();
  const caR = await ca;
  check(caR.ok && !cb.ok && cb.reason === 'inprogress' && hash.calls === 1 && R.list().find(a => a.id === 'r11').name === 'One' &&
    (await sessionsOf('r11', caR.tempPassword)).ok, `the same ID created twice at once: one succeeds, the other is turned away (${cb.reason}) with no hashing`);
  check((await R.createAccount('r11', 'Three')).reason === 'exists', '... and afterwards it exists');

  // errors part-way give back every turn and count
  pw = await ready('r12');
  for (let i = 0; i < R.config.maxHashing + R.config.maxQueue + 2; i++) {
    verify.throwNext();
    let threw = false;
    try { await R.signIn('r12', 'x' + i, ip()); } catch (e) { threw = true; }
    if (!threw) { check(false, 'a failing check should throw'); break; }
  }
  check((await sessionsOf('r12', pw)).ok, 'sign-ins whose check fails with an error give back their turn and in-flight count (the next sign-in works)');
  const s12 = (await R.signIn('r12', pw, ip())).sid;
  hash.throwNext();
  let threw = false;
  try { await R.changePassword(s12, 'r12 newer pass', pw); } catch (e) { threw = true; }
  res = await R.changePassword(s12, 'r12 newer pass', pw);
  check(threw && res.ok, `a change whose hash fails with an error frees the account for the next change (${res.reason || 'ok'})`);
  hash.throwNext();
  threw = false;
  try { await R.resetPassword('r12'); } catch (e) { threw = true; }
  check(threw && (await R.resetPassword('r12')).ok, '... and so does a reset');
  hash.throwNext();
  threw = false;
  try { await R.createAccount('r13'); } catch (e) { threw = true; }
  check(threw && (await R.createAccount('r13')).ok, '... and a new account');

  // the accounts file: written whole, a failed write changes nothing
  const left = fs.readdirSync(dir).filter(f => f !== 'accounts.json');
  const disk = JSON.parse(fs.readFileSync(file, 'utf8'));
  check(!left.length && Object.keys(disk.accounts).sort().join() === R.list().map(a => a.id).join(), `the file matches memory, no temporary files left (${left.join() || 'none'})`);
  const pw15 = await ready('r15');
  const s13 = (await R.signIn('r15', pw15, ip())).sid;
  const tmp = file + '.' + process.pid + '.tmp';
  fs.mkdirSync(tmp);                                      // the temporary file cannot be written
  const beforeTxt = fs.readFileSync(file, 'utf8');
  const quiet = console.error; console.error = () => {};
  let fr, fc, fx, fz;
  try {
    fr = await R.resetPassword('r15');
    fc = await R.createAccount('r14');
    fx = R.removeAccount('r15');
    fz = await R.changePassword(s13, 'r15 newest pass', pw15);
  } finally { console.error = quiet; fs.rmdirSync(tmp); }
  check([fr, fc, fx, fz].every(r => !r.ok && r.reason === 'storage' && r.status === 500 && !r.tempPassword) && fs.readFileSync(file, 'utf8') === beforeTxt,
    'a write that fails: the reset, creation, removal and change all report it and the file is untouched');
  check(R.has('r15') && !R.has('r14') && !!R.session(s13) && (await sessionsOf('r15', pw15)).ok, '... and nothing changed in memory either (the session and password stand)');
  const burst = await Promise.all(Array.from({ length: 12 }, (_, i) => R.createAccount('burstfile' + i)));
  const disk2 = JSON.parse(fs.readFileSync(file, 'utf8'));
  check(burst.filter(r => r.ok).every(r => disk2.accounts[r.id]) && Object.keys(disk2.accounts).length === R.size, 'many writes at once: the file always parses and holds every account');
  fs.rmSync(dir, { recursive: true, force: true });
}

/*
 * Wrong passwords checked against an account version that is gone (a reset or a password change landed while they
 * were in flight) are 'stale': the usual answer, still counted against the address, never against the new version.
 */
async function stale() {
  console.log('\nstale guesses: a reset or change is never locked by wrong passwords made before it');
  const verify = holdable((pw, h) => auth.verifyPassword(pw, h));
  const S = auth.createAuth({ now: clock(), scrypt: FAST, verify, maxHashing: 8 });
  let n = 0;
  const ip = () => 'ip-stale-' + (n++);
  const locked = (id) => S.list().find(a => a.id === id).locked;
  /** k wrong sign-ins for id, each held inside its password check; resolves once all are held. */
  async function hold(id, k, from) {
    const traps = Array.from({ length: k }, () => verify.holdNext());
    const tries = traps.map((_, i) => S.signIn(id, 'wrong guess ' + i, from ? from() : ip()));
    await Promise.all(traps.map(t => t.in));
    return { tries, release: async () => { traps.forEach(t => t.release()); return Promise.all(tries); } };
  }
  async function ready(id) {
    const m = await S.createAccount(id, id);
    const c = await S.changePassword((await S.signIn(id, m.tempPassword, ip())).sid, id + ' own pass');
    if (!c.ok) throw new Error('setup ' + id);
    return id + ' own pass';
  }

  // a trainer's reset while five wrong passwords are being checked
  const pw1 = await ready('st1');
  const h1 = await hold('st1', 5, () => 'ip-st1');
  check((await S.signIn('st1', pw1, ip())).reason === 'locked', 'five wrong passwords in flight: the account counts as locked meanwhile');
  const rr = await S.resetPassword('st1');
  const during = await S.signIn('st1', rr.tempPassword, ip());
  check(rr.ok && during.ok, `the reset's temporary password signs in while the old guesses are still in flight (${during.reason || 'ok'})`);
  const r1 = await h1.release();
  check(r1.every(r => !r.ok && r.reason === 'bad' && r.status === 401 && r.error === auth.MESSAGES.bad),
    `the old guesses get the usual answer, nothing more (${[...new Set(r1.map(r => r.reason))].join()})`);
  check(!locked('st1'), '... and they do not lock the reset account');
  const after = await S.signIn('st1', rr.tempPassword, ip());
  check(after.ok && after.mustChange, `the fresh temporary password signs in after they finish (${after.reason || 'ok'})`);
  // the address still counts every try: 5 stale + 5 more = its 10, then it is throttled
  const more = [];
  for (let i = 0; i < 5; i++) more.push(await S.signIn('st-ghost', 'nope ' + i, 'ip-st1'));
  const eleventh = await S.signIn('st-ghost2', 'nope', 'ip-st1');
  check(more.every(r => r.reason !== 'throttled') && eleventh.reason === 'throttled', `stale guesses still count against their address (the 11th try: ${eleventh.reason})`);

  // the trainee chooses their own password (a temporary-password session) while five wrong ones are in flight
  const m2 = await S.createAccount('st2', 'Two');
  const sid2 = (await S.signIn('st2', m2.tempPassword, ip())).sid;
  const h2 = await hold('st2', 5);
  const c2 = await S.changePassword(sid2, 'st2 own pass');
  const r2 = await h2.release();
  check(c2.ok && r2.every(r => r.reason === 'bad') && !locked('st2'), `a trainee's new password while five guesses are in flight: not locked when they finish (${c2.reason || 'ok'})`);
  check((await S.signIn('st2', 'st2 own pass', ip())).ok, '... and the new password signs in');

  // ... and a change that needs the current password, with four in flight (a fifth would lock it meanwhile)
  const pw3 = await ready('st3');
  const sid3 = (await S.signIn('st3', pw3, ip())).sid;
  const h3 = await hold('st3', 4);
  const c3 = await S.changePassword(sid3, 'st3 newer pass', pw3);
  await h3.release();
  for (let i = 0; i < 4; i++) await S.signIn('st3', 'later wrong ' + i, ip());
  check(c3.ok && !locked('st3'), `a change with four guesses in flight: those four do not count with four later ones (${c3.reason || 'ok'})`);
  check((await S.signIn('st3', 'st3 newer pass', ip())).ok, '... and the new password signs in');

  // a password change with a wrong current password, overtaken by a reset: not charged to the reset account
  const pw4 = await ready('st4');
  const sid4 = (await S.signIn('st4', pw4, ip())).sid;
  const t4 = verify.holdNext();
  const c4 = S.changePassword(sid4, 'st4 newer pass', 'not the current one');
  await t4.in;
  const rr4 = await S.resetPassword('st4');
  t4.release();
  const c4r = await c4;
  for (let i = 0; i < 4; i++) await S.signIn('st4', 'later wrong ' + i, ip());
  check(c4r.reason === 'expired' && !locked('st4') && (await S.signIn('st4', rr4.tempPassword, ip())).ok,
    `a wrong current password checked while a reset lands: expired, and not counted (${c4r.reason})`);

  // without any reset, wrong passwords lock as before
  const pw5 = await ready('st5');
  const h5 = await hold('st5', 5);
  const r5 = await h5.release();
  check(locked('st5') && r5.some(r => r.reason === 'locked') && (await S.signIn('st5', pw5, ip())).reason === 'locked', 'with no reset, five wrong passwords at once still lock the account');
}

/* ------------------------------------------------------------------ the API */
function request(base, method, p, o) {
  o = o || {};
  return new Promise((resolve, reject) => {
    const headers = Object.assign({}, o.headers || {});
    let data = null;
    if (o.json !== undefined) { data = JSON.stringify(o.json); headers['Content-Type'] = headers['Content-Type'] || 'application/json'; }
    if (o.raw !== undefined) data = o.raw;
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
    r = await request(base, 'POST', 'api/signin', { raw: '{bad json', headers: { 'Content-Type': 'application/json' } });
    const alive = await request(base, 'GET', 'api/whoami');
    check(r.code === 400 && alive.code === 200, 'a malformed sign-in body is answered 400 and the server keeps running');
    r = await request(base, 'POST', 'api/accounts', { raw: '{bad json', headers: Object.assign({ 'Content-Type': 'application/json' }, PIN) });
    check(r.code === 400 && (await request(base, 'GET', 'api/whoami')).code === 200, '... and a malformed trainer body too');
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
    const burst = await Promise.all(Array.from({ length: 30 }, () => request(base, 'POST', 'api/password', { json: { password: 'ana again 2026' }, cookie: ck3 })));
    const codes = burst.map(x => x.code);
    check(codes.filter(c => c === 200).length === 1 && codes.every(c => c === 200 || c === 409 || c === 401),
      `30 password changes at once over HTTP: exactly one saved, the rest 409 or 401 (${codes.filter(c => c === 200).length}/${codes.filter(c => c === 409).length}/${codes.filter(c => c === 401).length})`);
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

/* ------------------------------------------------------------------ which files are served */
/** A GET with the path sent exactly as written (no URL tidying on the way). */
function rawGet(base, p) {
  const u = new URL(base);
  return new Promise((resolve, reject) => {
    const req = http.request({ host: u.hostname, port: u.port, path: p, method: 'GET' }, res => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => resolve({ code: res.statusCode, raw: d }));
    });
    req.on('error', reject);
    req.end();
  });
}

const PRIVATE_PATHS = (dataRel) => {
  const d = dataRel, D = dataRel.toUpperCase(), up = (s) => s.replace(/[a-z]/g, (c, i) => (i % 2 ? c.toUpperCase() : c));
  const e = (s) => s.replace(/[a-z]/g, c => '%' + c.charCodeAt(0).toString(16));
  return [
    `/${d}/accounts.json`, `/${D}/ACCOUNTS.JSON`, `/${up(d)}/Accounts.json`, `/${d}/accounts.json.`, `/${d}/accounts.json%20`,
    `/${d}/accounts.json::$DATA`, `/${d}/accounts.json%3A%3A%24DATA`, `/${e(d)}/${e('accounts.json')}`, `/${d.replace(/\//g, '%2F')}%2Faccounts.json`,
    `/${d.replace(/\//g, '\\')}\\accounts.json`, `/${d.replace(/\//g, '%5C')}%5Caccounts.json`, `/${d.replace(/\//g, '%255C')}%255Caccounts.json`,
    `/${d.replace(/\//g, '%252F')}%252Faccounts.json`, `/src/..%2F..%2F${d}/accounts.json`, `/src/%2e%2e/${d}/accounts.json`,
    `/src/%252e%252e/${d}/accounts.json`, `/src/%2E%2E%5C${d}/accounts.json`, `/${d}/`, `/${D}/`,
    '/server/server.js', '/SERVER/SERVER.JS', '/Server/auth.js', '/server./auth.js', '/server%20/auth.js', '/SERVER~1/auth.js', '/server%7E1/auth.js',
    '/%73erver/auth.js', '/%2573erver/auth.js', '/server%5Cauth.js', '/server\\auth.js', '/src/../server/auth.js', '/src/%2e%2e/server/auth.js',
    '/src%2F..%2Fserver%2Fauth.js', '/.git/config', '/.GIT/config', '/%2egit/config', '/test/auth.js', '/TEST/auth.js', '/docs/SIGN-IN.md',
    '/DOCS/sign-in.md', '/README.md', '/CLAUDE.md', '/server/config.json', '/src/core/signin.js.', '/con', '/src/nul.js', '/src/core/%00signin.js',
    '/%E0%A4%A', '/data/../server/auth.js'
  ];
};

async function files() {
  console.log('\nwhich files are served');
  const ROOT = path.resolve(__dirname, '..');
  // the data folder inside a folder the game is served from: the hardest place to keep it private
  const dataRel = 'data/otr-authtest-' + process.pid;
  const DATA = path.join(ROOT, dataRel);
  const prevData = process.env.OTR_DATA_DIR, prevAcc = process.env.OTR_ACCOUNTS;
  process.env.OTR_DATA_DIR = dataRel; process.env.OTR_ACCOUNTS = '0';
  const { publicFile } = require('../server/server.js');
  if (prevData === undefined) delete process.env.OTR_DATA_DIR; else process.env.OTR_DATA_DIR = prevData;
  if (prevAcc === undefined) delete process.env.OTR_ACCOUNTS; else process.env.OTR_ACCOUNTS = prevAcc;
  try {
    const leaks = PRIVATE_PATHS(dataRel).concat(PRIVATE_PATHS('server/data')).filter(p => publicFile(p) !== null);
    check(!leaks.length, 'no case, encoding, backslash, short-name or trailing-dot spelling of a private path is a servable file' + (leaks.length ? ': ' + leaks.join(' ') : ''));
    const game = ['/', '/index.html', '/first-person.html', '/imsmanifest.xml', '/css/style.css', '/src/core/signin.js', '/data/i18n/'];
    check(game.every(p => publicFile(p) !== null), 'the game\'s own files are still served');

    const { child, base } = await startServer({ OTR_DATA_DIR: dataRel, OTR_ACCOUNTS: '1', OTR_TRAINER_PIN: '4821' });
    try {
      const made = await request(base, 'POST', 'api/accounts', { json: { id: 'e3001', name: 'Kept Safe' }, headers: { 'x-trainer-pin': '4821' } });
      check(made.code === 200 && fs.existsSync(path.join(DATA, 'accounts.json')), 'an accounts file inside the served data folder');
      const secret = /"salt"|"hash"|scrypt|createAuth|require\(|\[core\]/;
      const bad = [];
      for (const p of PRIVATE_PATHS(dataRel).concat(PRIVATE_PATHS('server/data'))) {
        const r = await rawGet(base, p);
        if (r.code === 200 || secret.test(r.raw)) bad.push(p + ' ' + r.code);
      }
      check(!bad.length, `none of ${PRIVATE_PATHS(dataRel).length * 2} private-path spellings is served over HTTP` + (bad.length ? ': ' + bad.join(', ') : ''));
      const ok = await rawGet(base, '/css/style.css'), home = await rawGet(base, '/');
      check(ok.code === 200 && home.code === 200 && /<html/i.test(home.raw), 'the game and its files still load');
      if (process.platform !== 'win32') {
        const link = path.join(ROOT, 'src', 'otr-authtest-link-' + process.pid + '.json');
        try {
          fs.symlinkSync(path.join(DATA, 'accounts.json'), link);
          const r = await rawGet(base, '/src/' + path.basename(link));
          check(r.code === 404 && !secret.test(r.raw), 'a link from a served folder to the accounts file is not followed');
        } finally { try { fs.unlinkSync(link); } catch (e) { /* gone */ } }
      }
    } finally { child.kill(); }
  } finally {
    fs.rmSync(DATA, { recursive: true, force: true });
  }
}

(async () => {
  try { await unit(); await api(); await files(); } catch (e) { check(false, 'script error: ' + (e && e.stack || e)); }
  console.log(fails ? `\n${fails} failed` : '\nall sign-in checks passed');
  process.exit(fails ? 1 : 0);
})();
