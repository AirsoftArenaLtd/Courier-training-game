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
 * - A try is counted against its address and ID the moment it arrives, before the password check (a success gives
 *   it back), so a burst of simultaneous tries cannot get past the limits.
 * - Every scrypt run (sign-in, a password change, a trainer's new or reset account) takes a turn from one shared
 *   ration: at most maxHashing at once, with up to maxQueue more waiting; beyond that the request is turned away as
 *   'busy' without any hashing.
 * - One password change at a time per account (and so per session): another that arrives while one is being checked
 *   is turned away as 'pending' without hashing. A wrong current password counts towards the same lock as sign-in.
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
  busy: 'The training server is busy. Try again in a moment.',
  short: `Use at least ${MIN_LEN} characters.`,
  long: `Use at most ${MAX_LEN} characters.`,
  same: 'Choose a new password, not the one you signed in with.',
  expired: 'Your sign-in has expired. Sign in again.',
  pending: 'Your password is already being changed. Try again in a moment.',
  id: 'An employee ID is 1 to 64 letters, digits and . _ @ - (starting with a letter or digit).',
  exists: 'There is already an account with that employee ID.',
  missing: 'There is no account with that employee ID.'
};
const STATUS = { bad: 401, locked: 429, throttled: 429, busy: 503, short: 400, long: 400, same: 400, expired: 401, pending: 409, id: 400, exists: 409, missing: 404 };
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
    maxHashing: o.maxHashing || 4,                // sign-in password checks at once (Node hashes on 4 threads)
    maxQueue: o.maxQueue || 16,                   // ... and waiting for a turn; more are turned away as 'busy'
    scrypt: Object.assign({}, SCRYPT, o.scrypt)
  };
  const accounts = new Map();                    // id -> { name, hash, mustChange, createdAt, changedAt }
  const sessions = new Map();                    // sid -> { id, created, last, mustChange }
  const fails = new Map();                       // id (existing or not) -> { n, until }
  const ipFails = new Map();                     // address -> { n, start }
  const pending = new Map();                     // id -> sign-ins being checked right now
  const verify = o.verify || verifyPassword;     // tests count the password checks ...
  const hasher = o.hash || hashPassword;         // ... and the hashes
  const changing = new Set();                    // ids with a password change being checked right now
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
  /** Counts a try against an address; the returned function gives it back (a success, or turned away as busy). */
  function noteIpFail(ip) {
    const t = now();
    let f = ipFails.get(ip);
    if (!f || t - f.start >= cfg.ipWindowMs) { f = { n: 0, start: t }; ipFails.set(ip, f); }
    f.n++;
    cap(ipFails);
    return () => { if (ipFails.get(ip) === f && f.n > 0) f.n--; };
  }
  /** An ID with enough tries already being checked to lock it, if they are all wrong. */
  function lockPending(id) {
    const f = fails.get(id), t = now();
    const n = f && !(f.until && f.until <= t) ? f.n : 0;
    return n + (pending.get(id) || 0) >= cfg.lockAfter;
  }

  /* ---- every password check or hash, a few at a time: a burst queues briefly or is turned away, never piles up */
  let hashing = 0;
  const waiting = [];
  /** A turn to hash: a promise of one, or null when the queue is full. release() hands it on. */
  function acquire() {
    if (hashing < cfg.maxHashing) { hashing++; return Promise.resolve(); }
    if (waiting.length >= cfg.maxQueue) return null;
    return new Promise(resolve => waiting.push(resolve));
  }
  function release() {
    const next = waiting.shift();
    if (next) next(); else hashing--;           // the turn passes straight on, so a newcomer cannot jump in between
  }
  /** fn() run in a turn (released afterwards), or { busy: true } at once, with no hashing, when the queue is full. */
  async function rationed(fn) {
    const turn = acquire();
    if (!turn) return { busy: true };
    try { await turn; return { value: await fn() }; } finally { release(); }
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
      // counted now, before anything is awaited, so simultaneous tries all see each other
      const giveBack = noteIpFail(ip);
      const id = normalizeId(rawId);
      const pw = typeof password === 'string' ? password : '';
      // nothing that could be an account: no lock to keep, but the address's count still goes up
      if (!id || !pw || pw.length > MAX_LEN) return fail('bad');
      if (lockedNow(id) || lockPending(id)) return fail('locked');
      const turn = acquire();
      if (!turn) { giveBack(); return fail('busy'); }
      pending.set(id, (pending.get(id) || 0) + 1);
      let ok = false, a;
      try {
        await turn;
        const h = await dummy;                    // (ready long before anyone signs in)
        a = accounts.get(id);
        ok = await verify(pw, a ? a.hash : h);
      } finally {
        release();
        const n = (pending.get(id) || 1) - 1;
        if (n) pending.set(id, n); else pending.delete(id);
      }
      if (!ok || !a || accounts.get(id) !== a) return fail(noteFail(id) ? 'locked' : 'bad');
      giveBack();
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
      const id = s.id, so = sessions.get(sid), a = accounts.get(id), was = a.hash;
      // one change per account at a time, claimed before anything is awaited: a burst gets one try, the rest no hashing
      if (changing.has(id)) return fail('pending');
      const needCurrent = !so.mustChange;
      if (needCurrent && (lockedNow(id) || lockPending(id))) return fail('locked');
      changing.add(id);
      if (needCurrent) pending.set(id, (pending.get(id) || 0) + 1);
      let r;
      try {
        r = await rationed(async () => {
          if (needCurrent && !(await verify(typeof current === 'string' ? current : '', a.hash))) return 'bad';
          if (await verify(password, a.hash)) return 'same';
          return hasher(password, cfg.scrypt);
        });
      } finally {
        changing.delete(id);
        if (needCurrent) { const n = (pending.get(id) || 1) - 1; if (n) pending.set(id, n); else pending.delete(id); }
      }
      if (r.busy) return fail('busy');
      if (r.value === 'bad') return fail(noteFail(id) ? 'locked' : 'bad');
      if (r.value === 'same') return fail('same');
      // still the same account, password and session (not reset, removed, changed, signed out or expired meanwhile)
      if (accounts.get(id) !== a || a.hash !== was || sessions.get(sid) !== so || expired(so, now())) return fail('expired');
      a.hash = r.value; a.mustChange = false; a.changedAt = now();
      save();
      fails.delete(id);
      endSessions(id);
      return { ok: true, sid: newSession(id, false) };
    },

    signOut(sid) { if (typeof sid === 'string') sessions.delete(sid); },

    /* ---- for trainers */
    async createAccount(rawId, name) {
      const id = normalizeId(rawId);
      if (!id) return fail('id');
      if (accounts.has(id)) return fail('exists');
      const temp = tempPassword();
      const r = await rationed(() => hasher(temp, cfg.scrypt));
      if (r.busy) return fail('busy');
      const hash = r.value;
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
      const r = await rationed(() => hasher(temp, cfg.scrypt));
      if (r.busy) return fail('busy');
      const hash = r.value;
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
