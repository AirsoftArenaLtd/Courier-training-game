/*
 * Employee ID and password sign-in for the training server (server/server.js). Plain Node, no packages.
 * docs/SIGN-IN.md describes it for IT and trainers.
 *
 *   const auth = createAuth({ file: 'server/data/accounts.json' });
 *   await auth.createAccount('e1234', 'Jane Doe')    -> { ok, id, name, tempPassword }   (a trainer)
 *   await auth.signIn('e1234', 'temp...', ip)        -> { ok, sid, mustChange }          (the trainee)
 *   await auth.changePassword(sid, 'their own one')  -> { ok, sid }                      (a new session id)
 *   auth.session(sid)                                -> { id, name, mustChange } or null
 *
 * - Passwords are kept only as scrypt hashes with a random salt per password, and compared in constant time.
 * - A new or reset account has a temporary password that works once: it signs in to a session that can only choose
 *   a new password (at least MIN_LEN characters, not the temporary one).
 * - Wrong passwords: lockAfter in a row lock that employee ID for lockMs (a trainer's reset unlocks it), and one
 *   address gets ipFails wrong tries per ipWindowMs. An ID that does not exist is treated exactly like one that does
 *   (the same answer, the same lock, a password check of the same cost), so sign-in never tells whether an ID exists.
 * - Sessions live in memory under a random id (the cookie holds only that id); they end after sessionMs, after
 *   idleMs unused, when the password changes or is reset, and when the server restarts.
 * Results that fail carry { reason, status, error }: reason is a code the sign-in screen words for itself, error the
 * same in English for API users.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };
const MIN_LEN = 8, MAX_LEN = 128;
// temporary passwords: no letters or digits that are easily confused (0/o, 1/l/i)
const TEMP_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789', TEMP_LEN = 10;
const COOKIE = 'otr_sid';

const MESSAGES = {
  bad: 'That employee ID and password do not match.',
  locked: 'Too many wrong tries. Try again later, or ask a trainer to reset the password.',
  throttled: 'Too many wrong tries from this computer. Wait a minute, then try again.',
  short: `Use at least ${MIN_LEN} characters.`,
  long: `Use at most ${MAX_LEN} characters.`,
  same: 'Choose a new password, not the one you signed in with.',
  expired: 'Your sign-in has expired. Sign in again.',
  id: 'An employee ID is 1 to 64 letters, digits and . _ @ - (starting with a letter or digit).',
  exists: 'There is already an account with that employee ID.',
  missing: 'There is no account with that employee ID.'
};
const STATUS = { bad: 401, locked: 429, throttled: 429, short: 400, long: 400, same: 400, expired: 401, id: 400, exists: 409, missing: 404 };
const fail = (reason) => ({ ok: false, reason, status: STATUS[reason], error: MESSAGES[reason] });

/** Employee IDs are compared without case or surrounding spaces. '' when it cannot be one. */
function normalizeId(id) {
  if (typeof id !== 'string' && typeof id !== 'number') return '';
  const s = String(id).trim().toLowerCase();
  return /^[a-z0-9][a-z0-9._@-]{0,63}$/.test(s) ? s : '';
}

const tidyName = (n) => String(n == null ? '' : n).replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 80);

function scrypt(password, salt, prm) {
  return new Promise((resolve, reject) => crypto.scrypt(String(password).normalize('NFC'), salt, prm.keylen,
    { N: prm.N, r: prm.r, p: prm.p }, (e, key) => (e ? reject(e) : resolve(key))));
}

/** A salted scrypt hash of a password, with its parameters (so they can be raised later without breaking old ones). */
async function hashPassword(password, prm) {
  prm = Object.assign({}, SCRYPT, prm);
  const salt = crypto.randomBytes(16);
  const key = await scrypt(password, salt, prm);
  return { alg: 'scrypt', N: prm.N, r: prm.r, p: prm.p, keylen: prm.keylen, salt: salt.toString('base64'), key: key.toString('base64') };
}

async function verifyPassword(password, h) {
  if (!h || h.alg !== 'scrypt' || typeof password !== 'string') return false;
  const want = Buffer.from(h.key, 'base64');
  const got = await scrypt(password, Buffer.from(h.salt, 'base64'), h);
  return got.length === want.length && crypto.timingSafeEqual(got, want);
}

function tempPassword() {
  let s = '';
  for (let i = 0; i < TEMP_LEN; i++) s += TEMP_ALPHABET[crypto.randomInt(TEMP_ALPHABET.length)];
  return s;
}

/* ---- the session cookie: HttpOnly (page scripts never see it), SameSite=Strict, no Max-Age (ends with the browser) */
function sidFrom(req) {
  const h = (req && req.headers && req.headers.cookie) || '';
  const m = new RegExp('(?:^|;\\s*)' + COOKIE + '=([A-Za-z0-9_-]{20,100})(?:;|$)').exec(h);
  return m ? m[1] : null;
}
function cookie(sid, secure) {
  return `${COOKIE}=${sid}; Path=/; HttpOnly; SameSite=Strict${secure ? '; Secure' : ''}`;
}
function clearCookie(secure) {
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure ? '; Secure' : ''}`;
}

function createAuth(o) {
  o = o || {};
  const now = o.now || Date.now;
  const cfg = {
    file: o.file || null,                         // null: accounts in memory only (tests)
    lockAfter: o.lockAfter || 5,
    lockMs: o.lockMs || 15 * 60 * 1000,
    ipFails: o.ipFails || 10,
    ipWindowMs: o.ipWindowMs || 60 * 1000,
    sessionMs: o.sessionMs || 10 * 60 * 60 * 1000,
    idleMs: o.idleMs || 2 * 60 * 60 * 1000,
    changeMs: o.changeMs || 15 * 60 * 1000,      // a session that may only choose a new password
    scrypt: Object.assign({}, SCRYPT, o.scrypt)
  };
  const accounts = new Map();                    // id -> { name, hash, mustChange, createdAt, changedAt }
  const sessions = new Map();                    // sid -> { id, created, last, mustChange }
  const fails = new Map();                       // id (existing or not) -> { n, until }
  const ipFails = new Map();                     // address -> { n, start }
  // unknown IDs are checked against this, so they cost the same time as known ones
  const dummy = hashPassword(crypto.randomBytes(18).toString('base64'), cfg.scrypt);

  if (cfg.file && fs.existsSync(cfg.file)) {
    // an unreadable accounts file stops the server rather than starting with nobody (and overwriting it)
    const db = JSON.parse(fs.readFileSync(cfg.file, 'utf8'));
    Object.keys((db && db.accounts) || {}).forEach(id => { if (normalizeId(id) === id) accounts.set(id, db.accounts[id]); });
  }
  function save() {
    if (!cfg.file) return;
    const out = { version: 1, accounts: {} };
    accounts.forEach((a, id) => { out.accounts[id] = a; });
    fs.mkdirSync(path.dirname(cfg.file), { recursive: true });
    const tmp = cfg.file + '.' + process.pid + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(out, null, 1), { mode: 0o600 });
    fs.renameSync(tmp, cfg.file);
  }

  const cap = (m) => { if (m.size > 10000) [...m.keys()].slice(0, 2000).forEach(k => m.delete(k)); };
  function lockedNow(id) {
    const f = fails.get(id);
    return !!(f && f.until && f.until > now());
  }
  /** A wrong password for an ID: true when that locks it. */
  function noteFail(id) {
    const t = now();
    let f = fails.get(id);
    if (!f || (f.until && f.until <= t)) f = { n: 0, until: 0 };
    f.n++;
    if (f.n >= cfg.lockAfter) { f.until = t + cfg.lockMs; f.n = 0; }
    fails.delete(id); fails.set(id, f);         // newest last, so cap() drops the oldest
    cap(fails);
    return !!f.until;
  }
  function ipThrottled(ip) {
    const f = ipFails.get(ip);
    return !!(f && now() - f.start < cfg.ipWindowMs && f.n >= cfg.ipFails);
  }
  function noteIpFail(ip) {
    const t = now(), f = ipFails.get(ip);
    if (!f || t - f.start >= cfg.ipWindowMs) ipFails.set(ip, { n: 1, start: t }); else f.n++;
    cap(ipFails);
  }

  function newSession(id, mustChange) {
    const sid = crypto.randomBytes(32).toString('base64url');
    const t = now();
    sessions.set(sid, { id, created: t, last: t, mustChange: !!mustChange });
    return sid;
  }
  function endSessions(id) { sessions.forEach((s, sid) => { if (s.id === id) sessions.delete(sid); }); }
  function prune() {
    const t = now();
    sessions.forEach((s, sid) => { if (expired(s, t)) sessions.delete(sid); });
  }
  function expired(s, t) {
    return t - s.created > (s.mustChange ? Math.min(cfg.changeMs, cfg.sessionMs) : cfg.sessionMs) || t - s.last > cfg.idleMs || !accounts.has(s.id);
  }

  return {
    config: cfg,
    get size() { return accounts.size; },
    has(id) { return accounts.has(normalizeId(id)); },

    list() {
      return [...accounts.entries()].map(([id, a]) => ({ id, name: a.name || null, mustChange: !!a.mustChange, locked: lockedNow(id),
        createdAt: a.createdAt || null, changedAt: a.changedAt || null })).sort((a, b) => (a.id < b.id ? -1 : 1));
    },

    /** The signed-in session for a cookie's id, or null. Using it keeps it alive (up to sessionMs). */
    session(sid) {
      if (typeof sid !== 'string') return null;
      const s = sessions.get(sid);
      if (!s) return null;
      const t = now();
      if (expired(s, t)) { sessions.delete(sid); return null; }
      s.last = t;
      const a = accounts.get(s.id);
      return { id: s.id, name: a.name || null, mustChange: s.mustChange };
    },

    async signIn(rawId, password, ip) {
      ip = String(ip || '');
      if (ipThrottled(ip)) return fail('throttled');
      const id = normalizeId(rawId);
      const pw = typeof password === 'string' ? password : '';
      // nothing that could be an account: no lock to keep, but the address's count still goes up
      if (!id || !pw || pw.length > MAX_LEN) { noteIpFail(ip); return fail('bad'); }
      if (lockedNow(id)) { noteIpFail(ip); return fail('locked'); }
      const a = accounts.get(id);
      const ok = await verifyPassword(pw, a ? a.hash : await dummy);
      if (!ok || !a || accounts.get(id) !== a) {
        noteIpFail(ip);
        return fail(noteFail(id) ? 'locked' : 'bad');
      }
      fails.delete(id);
      prune();
      return { ok: true, id, sid: newSession(id, a.mustChange), mustChange: !!a.mustChange };
    },

    /**
     * Choose a new password. A session from a temporary password needs only the new one; otherwise the current
     * password too. Every other session of the account ends, and this one gets a new id (sid).
     */
    async changePassword(sid, password, current) {
      const s = this.session(sid);
      if (!s) return fail('expired');
      if (typeof password !== 'string' || password.length < MIN_LEN) return fail('short');
      if (password.length > MAX_LEN) return fail('long');
      const a = accounts.get(s.id);
      if (!s.mustChange) {
        if (lockedNow(s.id)) return fail('locked');
        if (!(await verifyPassword(typeof current === 'string' ? current : '', a.hash))) return fail(noteFail(s.id) ? 'locked' : 'bad');
      }
      if (await verifyPassword(password, a.hash)) return fail('same');
      const hash = await hashPassword(password, cfg.scrypt);
      if (accounts.get(s.id) !== a || !sessions.has(sid)) return fail('expired');     // reset or removed meanwhile
      a.hash = hash; a.mustChange = false; a.changedAt = now();
      save();
      fails.delete(s.id);
      endSessions(s.id);
      return { ok: true, sid: newSession(s.id, false) };
    },

    signOut(sid) { if (typeof sid === 'string') sessions.delete(sid); },

    /* ---- for trainers */
    async createAccount(rawId, name) {
      const id = normalizeId(rawId);
      if (!id) return fail('id');
      if (accounts.has(id)) return fail('exists');
      const temp = tempPassword();
      const hash = await hashPassword(temp, cfg.scrypt);
      if (accounts.has(id)) return fail('exists');
      const a = { name: tidyName(name) || null, hash, mustChange: true, createdAt: now(), changedAt: null };
      accounts.set(id, a);
      save();
      fails.delete(id);
      return { ok: true, id, name: a.name, tempPassword: temp };
    },

    /** A new temporary password: it unlocks the account and signs it out everywhere. */
    async resetPassword(rawId) {
      const id = normalizeId(rawId);
      const a = accounts.get(id);
      if (!a) return fail('missing');
      const temp = tempPassword();
      const hash = await hashPassword(temp, cfg.scrypt);
      if (accounts.get(id) !== a) return fail('missing');
      a.hash = hash; a.mustChange = true; a.changedAt = now();
      save();
      fails.delete(id);
      endSessions(id);
      return { ok: true, id, name: a.name || null, tempPassword: temp };
    },

    /** Removes the sign-in only; the trainee's progress stays. */
    removeAccount(rawId) {
      const id = normalizeId(rawId);
      if (!accounts.has(id)) return fail('missing');
      accounts.delete(id);
      save();
      fails.delete(id);
      endSessions(id);
      return { ok: true, id };
    }
  };
}

module.exports = { createAuth, hashPassword, verifyPassword, normalizeId, tempPassword, sidFrom, cookie, clearCookie, MESSAGES, MIN_LEN, MAX_LEN, COOKIE };
