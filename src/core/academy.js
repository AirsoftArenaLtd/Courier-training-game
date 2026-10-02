/*
 * The academy's rules and assessments.
 *
 *   OTR.academy.settings          { mode, passStars, attempts, refresherDays } (data/config.js, then the trainer's)
 *   OTR.academy.load()            Promise: the server's settings (server mode) or this PC's
 *   OTR.academy.checkPin(pin)     Promise<true | error text>
 *   OTR.academy.saveSettings(s)   Promise<true | error text> (needs the PIN checked first)
 *   OTR.academy.coaching()        false while an assessment runs: live hints, checklists and per-answer feedback hide
 *
 * An assessment is one attempt at a scenario with no coaching, judged against the pass mark: every category the run
 * tested at passStars or better, and no critical mistake. Starting one uses the attempt (quitting does not give it
 * back). Results live in save.data.assess[id] = { attempts, passed, at, stars, score, criticals, lessons, allowed }.
 */
window.OTR = window.OTR || {};

OTR.academy = {
  settings: null,
  pin: null,                 // the PIN typed this session, once it checked out (server calls send it)
  assessing: null,           // the scenario id being assessed right now

  defaults() {
    const d = (OTR_DATA.config && OTR_DATA.config.academy) || {};
    return {
      mode: d.mode || 'both',
      passStars: Object.assign({ safety: 2, efficiency: 2, service: 2 }, d.passStars || {}),
      attempts: d.attempts !== undefined ? d.attempts : 1,
      refresherDays: d.refresherDays || 30
    };
  },

  merge(s) {
    const d = this.defaults();
    if (!s || typeof s !== 'object') return d;
    if (['both', 'practice', 'assessment'].indexOf(s.mode) >= 0) d.mode = s.mode;
    if (s.passStars) OTR.scoring.CATS.forEach(c => { const n = Number(s.passStars[c]); if (n >= 1 && n <= 3) d.passStars[c] = n; });
    if (Number.isFinite(Number(s.attempts)) && s.attempts >= 0) d.attempts = Math.round(s.attempts);
    if (Number(s.refresherDays) > 0) d.refresherDays = Math.round(s.refresherDays);
    return d;
  },

  local() {
    try { return JSON.parse(window.localStorage.getItem('otr_academy') || 'null'); } catch (e) { return null; }
  },

  load() {
    const I = OTR.identity || {};
    this.settings = this.merge(this.local());
    if (I.mode !== 'server') return Promise.resolve(this.settings);
    return I.fetchJSON('api/settings', 4000).then(s => { this.settings = this.merge(s); return this.settings; }).catch(() => this.settings);
  },

  /** Is there a PIN to check against at all? (A browser-only install may not have one yet.) */
  pinSet() {
    const I = OTR.identity || {};
    if (I.mode === 'server') return !!I.trainerPinSet;
    const l = this.local();
    return !!((OTR_DATA.config.academy && OTR_DATA.config.academy.trainerPin) || (l && l.pinHash));
  },

  hash(s) {
    // a browser-only install keeps no secret worth more than this: it only stops a trainee changing the rules
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return h.toString(16);
  },

  checkPin(pin) {
    const I = OTR.identity || {};
    if (I.mode === 'server') {
      return fetch('api/trainer/check', { method: 'POST', headers: { 'X-Trainer-Pin': pin }, credentials: 'same-origin' })
        .then(r => r.json().then(b => { if (r.ok) { this.pin = pin; return true; } return b.error || 'Wrong PIN.'; }))
        .catch(() => 'The training server isn\'t answering.');
    }
    const cfgPin = OTR_DATA.config.academy && OTR_DATA.config.academy.trainerPin;
    const l = this.local() || {};
    const ok = cfgPin ? String(pin) === String(cfgPin) : l.pinHash ? this.hash(pin) === l.pinHash : false;
    if (ok) this.pin = pin;
    return Promise.resolve(ok ? true : 'Wrong PIN.');
  },

  /** A browser-only install with no PIN yet: the first trainer sets one. */
  setLocalPin(pin) {
    const l = this.local() || {};
    l.pinHash = this.hash(pin);
    try { window.localStorage.setItem('otr_academy', JSON.stringify(l)); } catch (e) { return false; }
    this.pin = pin;
    return true;
  },

  saveSettings(s) {
    const I = OTR.identity || {};
    const next = this.merge(s);
    if (I.mode === 'server') {
      return fetch('api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Trainer-Pin': this.pin || '' }, credentials: 'same-origin', body: JSON.stringify(next) })
        .then(r => r.json().then(b => { if (r.ok) { this.settings = next; return true; } return b.error || 'Not saved.'; }))
        .catch(() => 'The training server isn\'t answering.');
    }
    const l = this.local() || {};
    Object.assign(l, next);
    try { window.localStorage.setItem('otr_academy', JSON.stringify(l)); } catch (e) { return Promise.resolve('This browser won\'t store settings.'); }
    this.settings = next;
    return Promise.resolve(true);
  },

  /** Trainer calls on the server, with the PIN. */
  trainerApi(pathname, method) {
    return fetch('api/' + pathname, { method: method || 'GET', headers: { 'X-Trainer-Pin': this.pin || '' }, credentials: 'same-origin' })
      .then(r => r.json().then(b => { if (!r.ok) throw new Error(b.error || 'HTTP ' + r.status); return b; }));
  },

  get() { return this.settings || (this.settings = this.defaults()); },
  practiceAllowed() { return this.get().mode !== 'assessment'; },
  assessmentAllowed() { return this.get().mode !== 'practice'; },
  coaching() { return !this.assessing; },

  /* ------------------------------------------------------------------ assessments */
  record(id) { const a = OTR.save.data.assess; return (a && a[id]) || null; },

  /** Attempts left at a scenario's assessment (Infinity with no limit; 0 once passed: nothing left to prove). */
  attemptsLeft(id) {
    const r = this.record(id);
    if (r && r.passed) return 0;
    const lim = this.get().attempts;
    if (!lim) return Infinity;
    return Math.max(0, lim + ((r && r.allowed) || 0) - ((r && r.attempts) || 0));
  },

  status(id) {
    const r = this.record(id);
    if (!r || !r.attempts) return 'none';
    if (r.passed) return 'passed';
    return this.attemptsLeft(id) > 0 ? 'retake' : 'failed';
  },

  /** Start an assessment: the attempt is used now, so quitting half-way does not give it back. */
  begin(id) {
    const d = OTR.save.data;
    d.assess = d.assess || {};
    const r = d.assess[id] || { attempts: 0, passed: false };
    r.attempts += 1;
    r.startedAt = Date.now();
    r.pending = true;             // cleared when the run is scored; still set = abandoned
    d.assess[id] = r;
    this.assessing = id;
    OTR.save.write();
  },

  /** The verdict for a scored run: { passed, short: [cat], criticals }. */
  judge(sc, stars, verdict) {
    const pass = this.get().passStars;
    const tested = sc.categories.filter(c => (verdict.untested || []).indexOf(c) < 0);
    const short = tested.filter(c => (stars[c] || 0) < (pass[c] || 2));
    const criticals = verdict.criticals || [];
    return { passed: !short.length && !criticals.length && tested.length > 0, short, criticals, need: pass };
  },

  finish(sc, stars, score, verdict) {
    const d = OTR.save.data;
    const r = (d.assess && d.assess[sc.id]) || { attempts: 1 };
    const j = this.judge(sc, stars, verdict);
    Object.assign(r, {
      passed: r.passed || j.passed, pending: false, at: Date.now(), stars, score,
      criticals: (verdict.criticals || []).map(c => c.label),
      lessons: (verdict.takeaways || []).slice(0, 6).map(t => t.text)
    });
    d.assess = d.assess || {};
    d.assess[sc.id] = r;
    this.assessing = null;
    OTR.save.write();
    return j;
  },

  /** An assessment left part-way (quit, or the tab closed): the attempt stays used and counts as not passed. */
  abandon() {
    const id = this.assessing;
    if (!id) return;
    const r = this.record(id);
    if (r && r.pending) { r.pending = false; r.abandoned = true; r.at = Date.now(); OTR.save.write(); }
    this.assessing = null;
  },

  /** For the hub, the record and the LMS. */
  summary() {
    const all = OTR.registry.all();
    const passed = all.filter(sc => this.status(sc.id) === 'passed').length;
    const attempted = all.filter(sc => this.status(sc.id) !== 'none').length;
    return { total: all.length, passed, attempted, complete: attempted === all.length || passed === all.length, passedAll: passed === all.length };
  }
};
