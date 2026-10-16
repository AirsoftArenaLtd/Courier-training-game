'use strict';
/*
 * xAPI statements for a company's learning record store (LRS), sent by the training server.
 *
 * Off unless OTR_XAPI_ENDPOINT is set. When a trainee's progress arrives with a newly finished workday, the server turns
 * it into statements (the day as a whole, then one per stop) and posts them to <endpoint>/statements. The browser
 * never holds the store's address or credentials, and the game never waits for the store:
 *
 *   - statements go into an outbox file (<data>/xapi-outbox.json) first, so a restart or an outage loses nothing;
 *   - they are sent in the background with a short timeout, and retried every minute and after the next save;
 *   - each statement has an id worked out from the trainee, the day and the part, so a retry or a resend cannot
 *     make a duplicate (an LRS answering 409 "already have it" counts as sent);
 *   - nothing here throws into the request that triggered it.
 *
 * Settings (environment or server/config.json, like the rest): OTR_XAPI_ENDPOINT (e.g. https://lrs.example.com/xapi/),
 * OTR_XAPI_AUTH (the whole Authorization header value, e.g. "Basic dXNlcjpwYXNz"), OTR_XAPI_HOMEPAGE (the account
 * homepage that names trainees, default the endpoint's origin). Only the trainee's employee ID and display name are
 * sent (see docs/DATA.md).
 *
 * Needs an outgoing connection from the training server to the LRS: the only one the server ever makes
 * (docs/IT-NOTES.md).
 */
const http = require('http');
const https = require('https');
const crypto = require('crypto');
const fs = require('fs');

const VERBS = { completed: { id: 'http://adlnet.gov/expapi/verbs/completed', display: { 'en-US': 'completed' } } };
const SIMULATION = 'http://adlnet.gov/expapi/activities/simulation';
const EXT = 'https://ontheroute.example/xapi/extensions/';        // names only; not a web address anyone fetches
const MAX_QUEUE = 5000, BATCH = 25, TIMEOUT_MS = 5000, RETRY_MS = 60 * 1000;

/** A stable UUID (version 5 style) from text, so the same part of the same day always has the same statement id. */
function uuid(text) {
  const h = crypto.createHash('sha1').update(text).digest();
  h[6] = (h[6] & 0x0f) | 0x50; h[8] = (h[8] & 0x3f) | 0x80;
  const x = h.subarray(0, 16).toString('hex');
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20, 32)}`;
}

/** ISO 8601 duration from seconds: 125 → PT2M5S. */
function duration(sec) {
  sec = Math.max(0, Math.round(Number(sec) || 0));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return 'PT' + (h ? h + 'H' : '') + (m || h ? m + 'M' : '') + s + 'S';
}

/**
 * The statements for one finished workday record (progress.workday.last). `passMarks` is { safety, efficiency, service }
 * stars needed. Pure: no clock, no network.
 */
function statementsFor(trainee, rec, homepage, passMarks) {
  const cats = ['safety', 'efficiency', 'service'];
  const stars = rec.stars || {};
  const got = cats.reduce((a, c) => a + (Number(stars[c]) || 0), 0);
  const passed = cats.every(c => (Number(stars[c]) || 0) >= ((passMarks && passMarks[c]) || 0));
  const actor = { objectType: 'Agent', name: trainee.name || trainee.id, account: { homePage: homepage, name: String(trainee.id) } };
  const day = `${homepage}/activities/workday/${encodeURIComponent(rec.id)}`;
  const at = new Date(rec.at || Date.now()).toISOString();
  const out = [{
    id: uuid(`${trainee.id}|${rec.id}|day`), actor, verb: VERBS.completed, timestamp: at,
    object: { objectType: 'Activity', id: day, definition: { type: SIMULATION, name: { 'en-US': `On The Route workday ${rec.day || ''}`.trim() }, description: { 'en-US': 'A full 3D courier workday: morning brief, load-out, drive, deliveries and returns.' } } },
    result: {
      score: { raw: got, min: 0, max: 9, scaled: Math.round(got / 9 * 1000) / 1000 },
      completion: true, success: passed, duration: duration(rec.seconds),
      extensions: { [EXT + 'stars']: { safety: stars.safety || 0, efficiency: stars.efficiency || 0, service: stars.service || 0 },
        [EXT + 'criticalErrors']: (rec.criticals || []).length, [EXT + 'delivered']: rec.delivered || 0, [EXT + 'points']: rec.score || 0 }
    }
  }];
  (rec.stops || []).forEach(s => {
    out.push({
      id: uuid(`${trainee.id}|${rec.id}|stop${s.stop}`), actor, verb: VERBS.completed, timestamp: at,
      object: { objectType: 'Activity', id: `${day}/stop/${s.stop}`, definition: { type: SIMULATION, name: { 'en-US': `Stop ${s.stop}` } } },
      result: { completion: true, success: !!s.delivered },
      context: { contextActivities: { parent: [{ objectType: 'Activity', id: day }] } }
    });
  });
  return out;
}

/** The forwarder. With no endpoint it is a stand-in that does nothing. */
function create(o) {
  o = o || {};
  const endpoint = String(o.endpoint || '').replace(/\/+$/, '');
  if (!endpoint) return { enabled: false, onProgress() {}, flush() { return Promise.resolve(); }, pending: () => 0, stop() {} };
  let homepage = String(o.homepage || '').replace(/\/+$/, '');
  if (!homepage) { try { homepage = new URL(endpoint).origin; } catch (e) { homepage = 'https://ontheroute.example'; } }
  const file = o.outbox || null;
  const log = o.log || (() => {});
  let queue = [];
  try { if (file) { const q = JSON.parse(fs.readFileSync(file, 'utf8')); if (Array.isArray(q)) queue = q; } } catch (e) { /* none yet */ }
  let sending = null, timer = null;

  const save = () => { if (file) { try { fs.writeFileSync(file + '.tmp', JSON.stringify(queue)); fs.renameSync(file + '.tmp', file); } catch (e) { log('xapi: could not write the outbox: ' + e.message); } } };

  const post = (statements) => new Promise((resolve) => {
    let url;
    try { url = new URL(endpoint + '/statements'); } catch (e) { return resolve({ ok: false, why: 'bad endpoint' }); }
    const body = JSON.stringify(statements);
    const lib = url.protocol === 'https:' ? https : http;
    const headers = { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body), 'X-Experience-API-Version': '1.0.3' };
    if (o.auth) headers.Authorization = o.auth;
    let done = false;
    const finish = (r) => { if (!done) { done = true; resolve(r); } };
    const req = lib.request(url, { method: 'POST', headers, timeout: TIMEOUT_MS }, (res) => {
      res.resume();
      res.on('end', () => finish({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode }));
      res.on('error', () => finish({ ok: false, why: 'read' }));
    });
    req.on('timeout', () => { req.destroy(); finish({ ok: false, why: 'timeout' }); });
    req.on('error', (e) => finish({ ok: false, why: e.code || e.message }));
    req.end(body);
  });

  /** Send what is waiting, a batch at a time; stops at the first failure and leaves the rest queued. */
  const run = async () => {
    try {
      while (queue.length) {
        const batch = queue.slice(0, BATCH);
        const r = await post(batch);
        if (r.ok) { queue = queue.slice(batch.length); save(); continue; }
        if (r.status === 409) {                     // some already stored: send one by one so the rest still go
          let all = true;
          for (const st of batch) { const one = await post([st]); if (one.ok || one.status === 409) { queue = queue.filter(q => q.id !== st.id); } else all = false; }
          save(); if (all) continue;
        }
        log(`xapi: the store did not take the statements (${r.status || r.why}); will retry`);
        break;
      }
    } catch (e) { log('xapi: ' + e.message); }
  };
  const flush = () => {
    if (sending) return sending;
    const p = run();                                // (run never rejects; it is cleared only once it has finished)
    sending = p;
    p.then(() => { if (sending === p) sending = null; });
    return p;
  };

  const schedule = () => {
    if (timer) return;
    timer = setInterval(() => { if (queue.length) flush(); }, o.retryMs || RETRY_MS);
    if (timer.unref) timer.unref();
  };

  const self = {
    enabled: true, statementsFor,
    pending: () => queue.length,
    /** Called when a trainee's progress is saved: queue statements for a workday finished since the last save. */
    onProgress(trainee, before, after) {
      try {
        const rec = after && after.workday && after.workday.last;
        if (!rec || !rec.id) return;
        const prev = before && before.workday && before.workday.last;
        if (prev && prev.id === rec.id && prev.at === rec.at) return;
        const have = new Set(queue.map(q => q.id));
        statementsFor(trainee, rec, homepage, (o.passMarks && o.passMarks()) || { safety: 2, efficiency: 2, service: 2 })
          .filter(s => !have.has(s.id)).forEach(s => queue.push(s));
        if (queue.length > MAX_QUEUE) queue = queue.slice(-MAX_QUEUE);
        save(); schedule(); flush();
      } catch (e) { log('xapi: ' + e.message); }
    },
    flush,
    stop() { if (timer) clearInterval(timer); timer = null; }
  };
  if (queue.length) { schedule(); flush(); }
  return self;
}

module.exports = { create, statementsFor, uuid, duration };
