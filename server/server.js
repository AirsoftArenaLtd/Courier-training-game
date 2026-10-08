#!/usr/bin/env node
/*
 * On The Route: company training server. Plain Node (18+), no packages to install.
 *
 *   node server/server.js                      serves the game on http://localhost:8080
 *   OTR_PORT=9000 OTR_TRAINER_PIN=4821 node server/server.js
 *
 * It serves the game and keeps each trainee's progress in its own file, so whoever signs in to any company PC
 * picks up where they left off. Who the trainee is comes from, in order:
 *   1. a header set by the company's sign-in in front of this server (IIS/Windows authentication, an SSO proxy, a
 *      load balancer): OTR_USER_HEADER, default "x-remote-user". A display name can come from OTR_NAME_HEADER
 *      (default "x-remote-name") or from server/trainees.json ({ "jdoe": "Jane Doe", ... }).
 *   2. ?user=<id> on the launch link (a portal or intranet page that already knows who is signed in). Turn this off
 *      with OTR_ALLOW_QUERY_USER=0 once a sign-in header is in place, so nobody can open someone else's progress.
 *   3. an employee ID and password typed on the game's sign-in screen, when accounts are on (OTR_ACCOUNTS=1, or a
 *      server/data/accounts.json exists). A trainer creates the accounts; see docs/SIGN-IN.md. ?user= links are then
 *      off unless OTR_ALLOW_QUERY_USER=1 is set, so nobody can skip the password.
 * With none of these, the game falls back to saving in the browser.
 *
 * Settings (environment variables, or the same names in server/config.json):
 *   OTR_PORT (8080) · OTR_HOST (0.0.0.0) · OTR_DATA_DIR (server/data) · OTR_USER_HEADER · OTR_NAME_HEADER
 *   OTR_ALLOW_QUERY_USER (1, or 0 with accounts on) · OTR_TRAINER_PIN (none: trainer tools are off until one is set)
 *   OTR_ACCOUNTS (on when accounts.json exists; 1 on, 0 off) · OTR_SESSION_HOURS (10) · OTR_SESSION_IDLE_MINUTES (120)
 *   OTR_LOCK_AFTER (5) · OTR_LOCK_MINUTES (15) · OTR_COOKIE_SECURE (auto: on over HTTPS; 1 always)
 *
 * API (JSON):
 *   GET  api/whoami                 { id, name, trainerPinSet } or { id: null }; with accounts on also accounts: true,
 *                                   session: true (signed in by password) or mustChange: true (must choose a password)
 *   With accounts on (JSON bodies, Content-Type: application/json):
 *   POST api/signin                 body { id, password }: sets the session cookie; { ok, mustChange }
 *   POST api/password               body { password, current }: a new password (current not needed after a temporary one)
 *   POST api/signout                ends the session
 *   GET  api/progress               { progress } for the signed-in trainee
 *   PUT  api/progress (POST too)    body { progress }
 *   GET  api/settings               the academy settings (pass marks, required mode): everyone reads them
 *   Trainer only, with header X-Trainer-Pin:
 *   POST api/trainer/check          { ok }
 *   PUT  api/settings               body: settings
 *   GET  api/trainees               [{ id, name, savedAt, summary }]
 *   GET  api/trainees/<id>          { id, progress }
 *   DELETE api/trainees/<id>        resets that trainee (their old file is kept as <id>.json.<time>.bak)
 *   POST api/trainees/<id>/allow    one more attempt at every assessment they have not passed
 *   With accounts on, trainer only:
 *   GET  api/accounts               [{ id, name, mustChange, locked, createdAt, changedAt }]
 *   POST api/accounts               body { id, name }: { id, name, tempPassword } (shown once, never stored)
 *   POST api/accounts/<id>/reset    { tempPassword }: unlocks the account and signs it out everywhere
 *   DELETE api/accounts/<id>        removes the sign-in (progress stays)
 */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const auth = require('./auth.js');

const ROOT = path.resolve(__dirname, '..');
let fileCfg = {};
try { fileCfg = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8')); } catch (e) { /* optional */ }
const cfg = (k, d) => (process.env[k] !== undefined ? process.env[k] : fileCfg[k] !== undefined ? fileCfg[k] : d);

const PORT = Number(cfg('OTR_PORT', 8080));
const HOST = cfg('OTR_HOST', '0.0.0.0');
const DATA = path.resolve(ROOT, cfg('OTR_DATA_DIR', 'server/data'));
const USER_HEADER = String(cfg('OTR_USER_HEADER', 'x-remote-user')).toLowerCase();
const NAME_HEADER = String(cfg('OTR_NAME_HEADER', 'x-remote-name')).toLowerCase();
const PIN = cfg('OTR_TRAINER_PIN', '') ? String(cfg('OTR_TRAINER_PIN', '')) : '';
const PROGRESS = path.join(DATA, 'progress');
fs.mkdirSync(PROGRESS, { recursive: true });
// employee ID and password sign-in (server/auth.js): off unless asked for, so an existing install behaves as before
const ACCOUNTS_FILE = path.join(DATA, 'accounts.json');
const ACC_FLAG = String(cfg('OTR_ACCOUNTS', ''));
const accounts = ACC_FLAG === '1' || (ACC_FLAG !== '0' && fs.existsSync(ACCOUNTS_FILE)) ? auth.createAuth({
  file: ACCOUNTS_FILE,
  sessionMs: Number(cfg('OTR_SESSION_HOURS', 10)) * 3600 * 1000,
  idleMs: Number(cfg('OTR_SESSION_IDLE_MINUTES', 120)) * 60 * 1000,
  lockAfter: Number(cfg('OTR_LOCK_AFTER', 5)),
  lockMs: Number(cfg('OTR_LOCK_MINUTES', 15)) * 60 * 1000
}) : null;
// with passwords on, a ?user= link would skip them: off unless IT turns it back on
const QUERY_FLAG = String(cfg('OTR_ALLOW_QUERY_USER', ''));
const ALLOW_QUERY = QUERY_FLAG === '' ? !accounts : QUERY_FLAG !== '0';
const COOKIE_SECURE = String(cfg('OTR_COOKIE_SECURE', ''));
const secureReq = (req) => COOKIE_SECURE === '1' || (COOKIE_SECURE !== '0' && (!!req.socket.encrypted || req.headers['x-forwarded-proto'] === 'https'));

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.xml': 'application/xml', '.woff2': 'font/woff2' };
// never served: the server itself, its data (everyone's progress) and the repository's own files
const PRIVATE = [/^\/server(\/|$)/, /^\/\.git(\/|$)/, /^\/test(\/|$)/, /^\/docs(\/|$)/];

function roster() {
  try { return JSON.parse(fs.readFileSync(path.join(__dirname, 'trainees.json'), 'utf8')); } catch (e) { return {}; }
}

/** The signed-in trainee for a request, or null. Windows sign-ins ("CORP\\jdoe") keep only the account name. */
function whoIs(req, url) {
  let id = req.headers[USER_HEADER];
  if (!id && accounts) {
    const s = accounts.session(auth.sidFrom(req));
    if (s && !s.mustChange) return { id: s.id, name: s.name || roster()[s.id] || s.id, session: true };
  }
  if (!id && ALLOW_QUERY) id = url.searchParams.get('user');
  if (!id) return null;
  id = String(id).trim().replace(/^.*\\/, '').slice(0, 120);
  if (!id) return null;
  const name = req.headers[NAME_HEADER] || roster()[id] || null;
  return { id, name: name ? String(name).slice(0, 80) : id };
}

const fileFor = (id) => path.join(PROGRESS, id.replace(/[^\w.@-]/g, '_') + '.json');
const readJSON = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return d; } };
function writeJSON(f, obj) {
  const tmp = f + '.' + process.pid + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(obj));
  fs.renameSync(tmp, f);            // atomic: a crash mid-write never leaves half a save
}

const send = (res, code, obj, headers) => {
  res.writeHead(code, Object.assign({ 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, headers || {}));
  res.end(JSON.stringify(obj));
};

function body(req, limit) {
  return new Promise((resolve, reject) => {
    let n = 0; const chunks = [];
    req.on('data', c => { n += c.length; if (n > limit) { reject(new Error('too large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}

// five wrong PINs from one address locks the trainer tools for that address for five minutes
const pinFails = new Map();
function trainerOk(req) {
  if (!PIN) return { ok: false, code: 403, error: 'No trainer PIN is set on the server (OTR_TRAINER_PIN).' };
  const ip = req.socket.remoteAddress;
  const f = pinFails.get(ip);
  if (f && f.n >= 5 && Date.now() - f.t < 5 * 60 * 1000) return { ok: false, code: 429, error: 'Too many wrong PINs. Try again in five minutes.' };
  const given = String(req.headers['x-trainer-pin'] || '');
  const a = crypto.createHash('sha256').update(given).digest(), b = crypto.createHash('sha256').update(PIN).digest();
  if (crypto.timingSafeEqual(a, b)) { pinFails.delete(ip); return { ok: true }; }
  pinFails.set(ip, { n: (f && Date.now() - f.t < 5 * 60 * 1000 ? f.n : 0) + 1, t: Date.now() });
  return { ok: false, code: 401, error: 'Wrong PIN.' };
}

/** A one-line summary of a save for the trainer's list. */
function summary(p) {
  const sc = (p && p.scenarios) || {};
  const assess = (p && p.assess) || {};
  const passed = Object.keys(assess).filter(k => assess[k] && assess[k].passed).length;
  return { played: Object.keys(sc).length, assessed: Object.keys(assess).length, passed, routeDays: (p && p.route && p.route.days) || 0 };
}

async function api(req, res, url) {
  const route = url.pathname.replace(/^\/api\//, '');
  const who = whoIs(req, url);
  try {
    if (route === 'whoami') {
      const out = who ? Object.assign({ trainerPinSet: !!PIN }, who) : { id: null, trainerPinSet: !!PIN };
      if (accounts) {
        out.accounts = true;
        const s = !who && accounts.session(auth.sidFrom(req));
        if (s && s.mustChange) out.mustChange = true;
      }
      return send(res, 200, out);
    }
    if (accounts && (route === 'signin' || route === 'password' || route === 'signout')) return signInApi(req, res, route);
    if (accounts && (route === 'accounts' || route.startsWith('accounts/'))) {
      const t = trainerOk(req); if (!t.ok) return send(res, t.code, { error: t.error });
      return accountsApi(req, res, route);
    }
    if (route === 'progress') {
      if (!who) return send(res, 401, { error: 'Not signed in.' });
      const f = fileFor(who.id);
      if (req.method === 'GET') return send(res, 200, { id: who.id, progress: readJSON(f, null) });
      if (req.method === 'PUT' || req.method === 'POST') {
        const b = await body(req, 4 * 1024 * 1024);
        if (!b || typeof b.progress !== 'object') return send(res, 400, { error: 'Expected { progress }.' });
        const old = readJSON(f, null);
        // a stale tab must not overwrite newer progress from another PC
        if (old && (old.savedAt || 0) > (b.progress.savedAt || 0)) return send(res, 409, { error: 'A newer save exists.', savedAt: old.savedAt });
        writeJSON(f, b.progress);
        return send(res, 200, { ok: true });
      }
    }
    if (route === 'settings') {
      const f = path.join(DATA, 'settings.json');
      if (req.method === 'GET') return send(res, 200, readJSON(f, {}));
      if (req.method === 'PUT') {
        const t = trainerOk(req); if (!t.ok) return send(res, t.code, { error: t.error });
        const b = await body(req, 64 * 1024);
        writeJSON(f, b);
        return send(res, 200, { ok: true });
      }
    }
    if (route === 'trainer/check') {
      const t = trainerOk(req);
      return send(res, t.ok ? 200 : t.code, t.ok ? { ok: true } : { error: t.error });
    }
    if (route === 'trainees' || route.startsWith('trainees/')) {
      const t = trainerOk(req); if (!t.ok) return send(res, t.code, { error: t.error });
      const names = roster();
      if (route === 'trainees') {
        const list = fs.readdirSync(PROGRESS).filter(n => n.endsWith('.json')).map(n => {
          const p = readJSON(path.join(PROGRESS, n), {});
          const id = (p.profile && p.profile.id) || n.replace(/\.json$/, '');
          return { id, name: (p.profile && p.profile.name) || names[id] || id, savedAt: p.savedAt || null, summary: summary(p) };
        });
        // with accounts on, everyone who can sign in is listed, trained yet or not
        if (accounts) {
          const seen = new Set(list.map(t => t.id));
          list.forEach(t => { t.account = accounts.has(t.id); });
          accounts.list().forEach(a => { if (!seen.has(a.id)) list.push({ id: a.id, name: a.name || names[a.id] || a.id, savedAt: null, summary: summary(null), account: true }); });
        }
        return send(res, 200, list.sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0)));
      }
      let id = decodeURIComponent(route.slice('trainees/'.length));
      if (id.endsWith('/allow') && req.method === 'POST') {
        id = id.slice(0, -'/allow'.length);
        const f2 = fileFor(id), p = readJSON(f2, null);
        if (!p) return send(res, 404, { error: 'No progress for that trainee.' });
        let n = 0;
        Object.keys(p.assess || {}).forEach(k => { const r = p.assess[k]; if (r && !r.passed) { r.allowed = (r.allowed || 0) + 1; n++; } });
        p.savedAt = Date.now();
        writeJSON(f2, p);
        return send(res, 200, { ok: true, allowed: n });
      }
      const f = fileFor(id);
      if (req.method === 'GET') return send(res, 200, { id, progress: readJSON(f, null) });
      if (req.method === 'DELETE') {
        if (fs.existsSync(f)) fs.renameSync(f, f + '.' + Date.now() + '.bak');
        return send(res, 200, { ok: true });
      }
    }
    return send(res, 404, { error: 'No such API.' });
  } catch (e) {
    return send(res, 400, { error: String(e.message || e) });
  }
}

/** Sign-in, a new password, sign-out. A JSON body only: a form on another site cannot post one. */
async function signInApi(req, res, route) {
  const secure = secureReq(req);
  if (req.method !== 'POST') return send(res, 405, { error: 'Use POST.' });
  if (route === 'signout') {
    accounts.signOut(auth.sidFrom(req));
    return send(res, 200, { ok: true }, { 'Set-Cookie': auth.clearCookie(secure) });
  }
  if (!/^application\/json\b/i.test(req.headers['content-type'] || '')) return send(res, 415, { error: 'Expected a JSON body.' });
  const b = await body(req, 4096);
  const r = route === 'signin'
    ? await accounts.signIn(b.id, b.password, req.socket.remoteAddress)
    : await accounts.changePassword(auth.sidFrom(req), b.password, b.current);
  if (!r.ok) {
    const h = r.reason === 'expired' ? { 'Set-Cookie': auth.clearCookie(secure) } : {};
    return send(res, r.status, { error: r.error, reason: r.reason }, h);
  }
  return send(res, 200, { ok: true, mustChange: !!r.mustChange }, { 'Set-Cookie': auth.cookie(r.sid, secure) });
}

/** A trainer's accounts: list, create, reset a password, remove. */
async function accountsApi(req, res, route) {
  const reply = (r) => send(res, r.ok ? 200 : r.status, r.ok ? r : { error: r.error, reason: r.reason });
  if (route === 'accounts') {
    if (req.method === 'GET') return send(res, 200, accounts.list());
    if (req.method === 'POST') { const b = await body(req, 4096); return reply(await accounts.createAccount(b.id, b.name)); }
  } else {
    let id = decodeURIComponent(route.slice('accounts/'.length));
    if (id.endsWith('/reset') && req.method === 'POST') return reply(await accounts.resetPassword(id.slice(0, -'/reset'.length)));
    if (req.method === 'DELETE') return reply(accounts.removeAccount(id));
  }
  return send(res, 404, { error: 'No such API.' });
}

function serveFile(req, res, url) {
  let p = decodeURIComponent(url.pathname);
  if (p.endsWith('/')) p += 'index.html';
  if (PRIVATE.some(r => r.test(p))) { res.writeHead(404); return res.end('Not found'); }
  const f = path.join(ROOT, path.normalize(p));
  if (!f.startsWith(ROOT + path.sep)) { res.writeHead(403); return res.end('Forbidden'); }
  // the data folder (progress, accounts) is never served, wherever OTR_DATA_DIR puts it
  if (f === DATA || f.startsWith(DATA + path.sep)) { res.writeHead(404); return res.end('Not found'); }
  fs.stat(f, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    fs.createReadStream(f).pipe(res);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname.startsWith('/api/')) return api(req, res, url);
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
  serveFile(req, res, url);
});

if (require.main === module) {
  server.listen(PORT, HOST, () => {
    console.log(`On The Route training server: http://localhost:${PORT}/`);
    console.log(`  trainee from: ${USER_HEADER} header${ALLOW_QUERY ? ' or ?user= on the link' : ' only'} · progress in ${DATA}`);
    console.log(`  trainer tools: ${PIN ? 'on (PIN set)' : 'off (set OTR_TRAINER_PIN)'}`);
    if (accounts) console.log(`  sign-in: employee ID and password (${accounts.size} account${accounts.size === 1 ? '' : 's'}; docs/SIGN-IN.md)`);
  });
}
module.exports = { server, accounts };
