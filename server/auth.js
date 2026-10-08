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
 * - Concurrency: every account has an in-memory version, a number from one counter that only goes up, given anew
 *   whenever the account is created, its password changed or reset, or it is removed. Anything that awaits (a turn,
 *   a password check, a hash) reads the version and the hash it checks against first, and commits only if the
 *   version is still the same afterwards (and the session, for a change, is still the same live one). A session
 *   carries the version it was issued under and is over once that changes. One reset and one creation per ID at a
 *   time ('inprogress', without hashing). A wrong password checked against a version that has since gone is
 *   'stale': it gets the usual answer but never counts towards the new version's lock (a reset or change is not locked
 *   by guesses made before it), and tries in flight count only towards the version they were made against. The accounts file is written whole to a temporary file, flushed and renamed
 *   over the old one, before memory changes: a failed write changes nothing ('storage'), a crash never leaves half.
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
  missing: 'There is no account with that employee ID.',
  inprogress: 'That account is being changed by another request right now. Try again in a moment.',
  storage: 'The accounts file could not be saved, so nothing was changed. Tell IT.'
};
const STATUS = { bad: 401, locked: 429, throttled: 429, busy: 503, short: 400, long: 400, same: 400, expired: 401, pending: 409, id: 400, exists: 409, missing: 404,
  inprogress: 409, storage: 500 };
const fail = (reason) => ({ ok: false, reason, status: STATUS[reason], error: MESSAGES[reason] });

/*
 * What an employee ID may be: the one rule. api/whoami hands it to the game (ID_RULE), so the trainer tools' New
 * account entry takes exactly these characters and length.
 */
const ID_MAX = 64, ID_FIRST = '[a-z0-9]', ID_CHARS = '[a-z0-9._@-]';
const ID_RE = new RegExp(`^${ID_FIRST}${ID_CHARS}{0,${ID_MAX - 1}}$`);
const ID_RULE = Object.freeze({ pattern: ID_RE.source, chars: ID_CHARS, max: ID_MAX });   // compared without case

/** Employee IDs are compared without case or surrounding spaces. '' when it cannot be one. */
function normalizeId(id) {
  if (typeof id !== 'string' && typeof id !== 'number') return '';
  const s = String(id).trim().toLowerCase();
  return ID_RE.test(s) ? s : '';
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
  const sessions = new Map();                    // sid -> { id, v, created, last, mustChange }
  const versions = new Map();                    // id -> its version (see the top): what every commit after an await re-checks
  let lastVersion = 0;
  const bump = (id) => { versions.set(id, ++lastVersion); };
  const fails = new Map();                       // id (existing or not) -> { n, until }
  const ipFails = new Map();                     // address -> { n, start }
  // id -> version -> wrong-password checks in flight: each is held under the version it was made against, so a reset
  // or change (a new version) leaves the old version's guesses out of the new one's lock
  const pending = new Map();
  const verify = o.verify || verifyPassword;     // tests count the password checks ...
  const hasher = o.hash || hashPassword;         // ... and the hashes
  const changing = new Set();                    // ids with a password change being checked right now
  const resetting = new Set();                   // ids with a trainer's reset being hashed right now
  const creating = new Set();                    // ids with a new account being hashed right now
  // unknown IDs are checked against this, so they cost the same time as known ones
  const dummy = hashPassword(crypto.randomBytes(18).toString('base64'), cfg.scrypt);

  if (cfg.file && fs.existsSync(cfg.file)) {
    // an unreadable accounts file stops the server rather than starting with nobody (and overwriting it)
    const db = JSON.parse(fs.readFileSync(cfg.file, 'utf8'));
    Object.keys((db && db.accounts) || {}).forEach(id => { if (normalizeId(id) === id) { accounts.set(id, db.accounts[id]); bump(id); } });
  }
  /*
   * The one way an account changes: the whole file is written with the change (a temporary file, flushed, then renamed
   * over the old one, so a crash leaves the old file or the new one, never half), and only then memory, with a new
   * version. Synchronous, so writes never interleave. A failed write throws and changes nothing.
   */
  function writeFile(file, text) {
    const tmp = file + '.' + process.pid + '.tmp';
    try {
      const fd = fs.openSync(tmp, 'w', 0o600);
      try { fs.writeSync(fd, text); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
      fs.renameSync(tmp, file);
    } catch (e) { try { fs.unlinkSync(tmp); } catch (e2) { /* never made */ } throw e; }
  }
  function commit(id, a) {
    if (cfg.file) {
      const out = { version: 1, accounts: {} };
      accounts.forEach((x, k) => { if (k !== id) out.accounts[k] = x; });
      if (a) out.accounts[id] = a;
      fs.mkdirSync(path.dirname(cfg.file), { recursive: true });
      writeFile(cfg.file, JSON.stringify(out, null, 1));
    }
    if (a) { accounts.set(id, a); bump(id); } else { accounts.delete(id); versions.delete(id); }
    fails.delete(id);
    endSessions(id);
  }
  /** commit(), or false when the file could not be written (nothing changed). */
  function tryCommit(id, a) {
    try { commit(id, a); return true; } catch (e) { console.error('accounts file not saved: ' + (e && e.message)); return false; }
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
  /** The version a try is made against: 0 for an ID with no account (versions start at 1). */
  const verOf = (id) => versions.get(id) || 0;
  /** A try in flight against the ID's current version; returns that version, for dropPending(). */
  function holdPending(id) {
    const v = verOf(id);
    let m = pending.get(id);
    if (!m) pending.set(id, m = new Map());
    m.set(v, (m.get(v) || 0) + 1);
    return v;
  }
  function dropPending(id, v) {
    const m = pending.get(id);
    if (!m) return;
    const n = (m.get(v) || 1) - 1;
    if (n) m.set(v, n); else m.delete(v);
    if (!m.size) pending.delete(id);
  }
  /** An ID with enough tries already being checked (against its current version) to lock it, if they are all wrong. */
  function lockPending(id) {
    const f = fails.get(id), t = now();
    const n = f && !(f.until && f.until <= t) ? f.n : 0;
    const m = pending.get(id);
    return n + ((m && m.get(verOf(id))) || 0) >= cfg.lockAfter;
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
    sessions.set(sid, { id, v: versions.get(id), created: t, last: t, mustChange: !!mustChange });
    return sid;
  }
  function endSessions(id) { sessions.forEach((s, sid) => { if (s.id === id) sessions.delete(sid); }); }
  function prune() {
    const t = now();
    sessions.forEach((s, sid) => { if (expired(s, t)) sessions.delete(sid); });
  }
  function expired(s, t) {
    return t - s.created > (s.mustChange ? Math.min(cfg.changeMs, cfg.sessionMs) : cfg.sessionMs) || t - s.last > cfg.idleMs || !accounts.has(s.id) || versions.get(s.id) !== s.v;
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
      const v0 = holdPending(id);
      let ok = false, a, v;
      try {
        await turn;
        const h = await dummy;                    // (ready long before anyone signs in)
        // the account, its version and the hash checked, all read at the same moment, right before the check
        a = accounts.get(id); v = verOf(id);
        ok = await verify(pw, a ? a.hash : h);
      } finally {
        // the turn and the in-flight count go back however the check ends, a thrown error included
        release();
        dropPending(id, v0);
      }
      // stale: the account was reset, changed, removed or made again since this try arrived. A password that was right
      // for the old version is not right now, and a wrong one is not held against the new version (a reset must not be
      // locked by guesses made before it); the answer is the same as for any wrong password, and the address keeps it.
      if (accounts.get(id) !== a || verOf(id) !== v || v !== v0) return fail(lockedNow(id) ? 'locked' : 'bad');
      if (!ok || !a) return fail(noteFail(id) ? 'locked' : 'bad');
      if (lockedNow(id)) return fail('locked');
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
      const id = s.id, so = sessions.get(sid), a = accounts.get(id), v = versions.get(id), was = a.hash;
      // one change per account at a time, claimed before anything is awaited: a burst gets one try, the rest no hashing
      if (changing.has(id)) return fail('pending');
      const needCurrent = !so.mustChange;
      if (needCurrent && (lockedNow(id) || lockPending(id))) return fail('locked');
      changing.add(id);
      const pv = needCurrent ? holdPending(id) : 0;
      let r;
      try {
        r = await rationed(async () => {
          // checked against the hash captured with the version, never one swapped in while this waited
          if (needCurrent && !(await verify(typeof current === 'string' ? current : '', was))) return 'bad';
          if (await verify(password, was)) return 'same';
          return hasher(password, cfg.scrypt);
        });
      } finally {
        changing.delete(id);
        if (needCurrent) dropPending(id, pv);
      }
      if (r.busy) return fail('busy');
      // still the same account version and session (not reset, removed, re-created, changed, signed out or expired);
      // a wrong current password checked against a version that has since gone is never held against the new one
      const live = accounts.get(id) === a && versions.get(id) === v && sessions.get(sid) === so && !expired(so, now());
      if (r.value === 'bad') return live ? fail(noteFail(id) ? 'locked' : 'bad') : fail('expired');
      if (!live) return fail('expired');
      if (r.value === 'same') return fail('same');
      if (needCurrent && lockedNow(id)) return fail('locked');
      if (!tryCommit(id, Object.assign({}, a, { hash: r.value, mustChange: false, changedAt: now() }))) return fail('storage');
      return { ok: true, sid: newSession(id, false) };
    },

    signOut(sid) { if (typeof sid === 'string') sessions.delete(sid); },

    /* ---- for trainers */
    async createAccount(rawId, name) {
      const id = normalizeId(rawId);
      if (!id) return fail('id');
      if (accounts.has(id)) return fail('exists');
      // one creation per ID at a time, claimed before anything is awaited: a second gets no hashing
      if (creating.has(id)) return fail('inprogress');
      creating.add(id);
      const temp = tempPassword();
      let r;
      try { r = await rationed(() => hasher(temp, cfg.scrypt)); } finally { creating.delete(id); }
      if (r.busy) return fail('busy');
      if (accounts.has(id)) return fail('exists');
      const a = { name: tidyName(name) || null, hash: r.value, mustChange: true, createdAt: now(), changedAt: null };
      if (!tryCommit(id, a)) return fail('storage');
      return { ok: true, id, name: a.name, tempPassword: temp };
    },

    /** A new temporary password: it unlocks the account and signs it out everywhere. */
    async resetPassword(rawId) {
      const id = normalizeId(rawId);
      const a = accounts.get(id), v = versions.get(id);
      if (!a) return fail('missing');
      // one reset per account at a time, claimed before anything is awaited: a second gets no hashing and no password
      if (resetting.has(id)) return fail('inprogress');
      resetting.add(id);
      const temp = tempPassword();
      let r;
      try { r = await rationed(() => hasher(temp, cfg.scrypt)); } finally { resetting.delete(id); }
      if (r.busy) return fail('busy');
      if (!accounts.has(id)) return fail('missing');
      // changed (a new password, or removed and made again) while this was hashing: this one does not count
      if (accounts.get(id) !== a || versions.get(id) !== v) return fail('inprogress');
      const next = Object.assign({}, a, { hash: r.value, mustChange: true, changedAt: now() });
      if (!tryCommit(id, next)) return fail('storage');
      return { ok: true, id, name: next.name || null, tempPassword: temp };
    },

    /** Removes the sign-in only; the trainee's progress stays. */
    removeAccount(rawId) {
      const id = normalizeId(rawId);
      if (!accounts.has(id)) return fail('missing');
      if (!tryCommit(id, null)) return fail('storage');
      return { ok: true, id };
    }
  };
}

module.exports = { createAuth, hashPassword, verifyPassword, normalizeId, ID_RULE, tempPassword, sidFrom, cookie, clearCookie, MESSAGES, MIN_LEN, MAX_LEN, COOKIE };
