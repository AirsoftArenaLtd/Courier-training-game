/*
 * Save / progress persistence. Where it goes depends on OTR.identity.mode (see identity.js):
 *   'local'  - this browser's localStorage (one key per ?user= when the launch link names one)
 *   'server' - the company server's api/progress for the signed-in trainee, with a local copy in case the network
 *              drops (the newer of the two wins at the next start)
 *   'scorm'  - the LMS's suspend data for the learner
 * Career stars = sum over scenarios of the best stars earned in each category.
 */
window.OTR = window.OTR || {};

OTR.save = {
  KEY: 'otr_save_v1',
  data: null,
  ephemeral: false, // test mode: never writes to storage
  failed: false,    // the browser refused to store progress (private window, blocked site data, full quota)

  defaults() {
    return {
      version: 1,
      profile: null,
      day: 1,
      scenarios: {},
      settings: { muted: false, hints: true, volume: 0.55 },
      shift: null,
      route: { days: 0, best: { safety: 0, efficiency: 0, service: 0 }, history: [] }
    };
  },

  /** The localStorage key: one per trainee when the launch link or the sign-in names them. */
  localKey() {
    const id = OTR.identity && OTR.identity.id;
    return id ? this.KEY + '_' + String(id).replace(/[^\w.@-]/g, '_') : this.KEY;
  },

  readLocal() {
    try { const raw = window.localStorage.getItem(this.localKey()); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
  },

  /**
   * Before the game boots: fetch the signed-in trainee's progress from the server (the rest of the save API stays
   * synchronous). Resolves either way; a failed fetch leaves the local copy to fall back on.
   */
  preload() {
    const I = OTR.identity;
    if (!I || I.mode !== 'server') return Promise.resolve();
    return I.fetchJSON(this.apiUrl(), 5000)
      .then(d => { this.remote = d && typeof d === 'object' && d.progress ? d.progress : null; this.remoteOk = true; })
      .catch(() => { this.remote = null; this.remoteOk = false; });
  },

  apiUrl() {
    const u = new URLSearchParams(window.location.search).get('user');
    return 'api/progress' + (u ? '?user=' + encodeURIComponent(u) : '');
  },

  load() {
    const I = OTR.identity || {};
    let parsed = null;
    if (I.mode === 'scorm') {
      try { const raw = I.scorm.get('cmi.suspend_data'); if (raw) parsed = JSON.parse(raw); } catch (e) { parsed = null; }
    } else if (I.mode === 'server') {
      // the newer of the server's copy and this PC's backup (written when a save could not reach the server)
      const local = this.readLocal();
      parsed = this.remote || null;
      if (local && (!parsed || (local.savedAt || 0) > (parsed.savedAt || 0))) parsed = local;
    } else {
      parsed = this.readLocal();
    }
    const d = this.defaults();
    if (parsed && typeof parsed === 'object') {
      d.profile = parsed.profile && typeof parsed.profile.name === 'string' ? parsed.profile : null;
      d.day = Number.isFinite(parsed.day) && parsed.day > 0 ? parsed.day : 1;
      if (parsed.scenarios && typeof parsed.scenarios === 'object') d.scenarios = parsed.scenarios;
      if (parsed.settings) {
        d.settings.muted = !!parsed.settings.muted;
        if (parsed.settings.hints !== undefined) d.settings.hints = !!parsed.settings.hints;
        if (Number.isFinite(parsed.settings.volume)) d.settings.volume = Math.max(0, Math.min(1, parsed.settings.volume));
        if (parsed.settings.a11y && typeof parsed.settings.a11y === 'object') d.settings.a11y = Object.assign({ keys: {} }, parsed.settings.a11y);
        if (parsed.settings.gfx === 'low' || parsed.settings.gfx === 'high') d.settings.gfx = parsed.settings.gfx;
      }
      if (parsed.shift && typeof parsed.shift === 'object') d.shift = parsed.shift;
      if (parsed.route && typeof parsed.route === 'object') d.route = Object.assign(d.route, parsed.route);
      Object.keys(parsed).forEach(k => { if (!(k in d)) d[k] = parsed[k]; });   // anything newer features keep
    }
    // signed in through the company or the LMS: the profile is that person, with no name to type
    if (I.locked && I.name) {
      if (!d.profile || d.profile.id !== I.id) d.profile = { name: I.name, id: I.id, createdAt: Date.now() };
      else d.profile.name = I.name;
    }
    // an assessment still open from last time was left (the tab closed): the attempt stays used, not passed
    Object.keys(d.assess || {}).forEach(k => { const r = d.assess[k]; if (r && r.pending) { r.pending = false; r.abandoned = true; } });
    this.data = d;
    if (I.mode === 'server' && this.remoteOk === false) this.failed = true;
    // find out now whether anything can be kept: a trainee must hear it before a day's work is lost, not after (SHELL-14)
    if (!this.ephemeral && I.mode === 'local') {
      try {
        window.localStorage.setItem(this.KEY + '_probe', '1');
        window.localStorage.removeItem(this.KEY + '_probe');
      } catch (e) { this.failed = true; }
    }
    if (!this.ephemeral && !this._unloadHooked) {
      this._unloadHooked = true;
      // the last save of a session reaches the server even as the tab closes; the LMS session is closed properly
      window.addEventListener('pagehide', () => this.flush(true));
    }
    return d;
  },

  write() {
    if (this.ephemeral || !this.data) return;
    const I = OTR.identity || {};
    this.data.savedAt = Date.now();
    const json = JSON.stringify(this.data);
    if (I.mode === 'scorm') {
      // SCORM 1.2 holds 4096 characters of suspend data: drop the oldest route history until it fits
      let out = json;
      if (!I.scorm.v2004) {
        const d = JSON.parse(json);
        while (out.length > 4000 && d.route && d.route.history && d.route.history.length) { d.route.history.shift(); out = JSON.stringify(d); }
      }
      this.failed = !(I.scorm.set('cmi.suspend_data', out) && I.scorm.commit());
      this.reportLms();
      return;
    }
    try {
      window.localStorage.setItem(this.localKey(), json);
      if (I.mode === 'local') this.failed = false;
    } catch (e) { if (I.mode === 'local') this.failed = true; /* progress lasts for this session only, and the title and hub say so */ }
    if (I.mode === 'server') {
      clearTimeout(this._putT);
      this._putT = setTimeout(() => this.flush(false), 600);
    }
  },

  /** Send the save to the server now (beacon: as the page closes). Returns the request, for whoever waits on it. */
  flush(beacon) {
    const I = OTR.identity || {};
    if (this.ephemeral || !this.data) return;
    if (I.mode === 'scorm') { if (beacon) I.scorm.finish(); return; }
    if (I.mode !== 'server') return;
    clearTimeout(this._putT);
    const body = JSON.stringify({ progress: this.data });
    if (beacon && navigator.sendBeacon) { navigator.sendBeacon(this.apiUrl(), new Blob([body], { type: 'application/json' })); return; }
    return fetch(this.apiUrl(), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body })
      .then(r => { this.failed = !r.ok; })
      .catch(() => { this.failed = true; });
  },

  /** The LMS's view of progress: complete once every module is passed in assessment, scored by stars earned. */
  reportLms() {
    const I = OTR.identity || {};
    if (I.mode !== 'scorm' || !OTR.registry) return;
    const all = OTR.registry.all ? OTR.registry.all() : [];
    const max = all.length * 9 || 1;
    const rep = OTR.academy ? OTR.academy.summary() : null;
    I.scorm.report({ score: this.totals().all / max * 100, complete: !!(rep && rep.complete), passed: !!(rep && rep.passedAll) });
  },

  /** The name as it is shown: each word starts with a capital ("lee k" → "Lee K"); the stored name is as typed. */
  displayName() {
    const n = this.data && this.data.profile ? this.data.profile.name : '';
    return n.replace(/(^|[\s\-'])(\p{Ll})/gu, (m, a, b) => a + b.toUpperCase());
  },

  hasProfile() {
    return !!(this.data && this.data.profile);
  },

  createProfile(name) {
    const settings = this.data ? this.data.settings : null;
    this.data = this.defaults();
    if (settings) Object.assign(this.data.settings, settings);
    this.data.profile = { name: name, createdAt: Date.now() };
    this.write();
  },

  rename(name) {
    if (!this.data.profile) return;
    this.data.profile.name = name;
    this.write();
  },

  reset() {
    try { window.localStorage.removeItem(this.localKey()); } catch (e) { /* ignore */ }
    const settings = this.data ? this.data.settings : null;
    const profile = OTR.identity && OTR.identity.locked && this.data ? this.data.profile : null;
    this.data = this.defaults();
    if (settings) Object.assign(this.data.settings, settings);
    if (profile) this.data.profile = { name: profile.name, id: profile.id, createdAt: Date.now() };
    this.write();
  },

  setMuted(m) {
    this.data.settings.muted = !!m;
    this.write();
  },

  setVolume(v) {
    this.data.settings.volume = Math.max(0, Math.min(1, v));
    this.write();
  },

  setHints(on) {
    this.data.settings.hints = !!on;
    this.write();
  },

  /** Graphics level: 'high' or 'low' (src/core/gfx.js). */
  setGfx(level) {
    this.data.settings.gfx = level === 'low' ? 'low' : 'high';
    this.write();
  },

  record(id) {
    return this.data.scenarios[id] || null;
  },

  bestStars(id) {
    const r = this.record(id);
    return r ? r.bestStars : { safety: 0, efficiency: 0, service: 0 };
  },

  starSum(stars) {
    if (!stars) return 0;
    return (stars.safety || 0) + (stars.efficiency || 0) + (stars.service || 0);
  },

  totals() {
    const t = { safety: 0, efficiency: 0, service: 0, all: 0 };
    Object.keys(this.data.scenarios).forEach(id => {
      if (!OTR.registry.get(id)) return;
      const b = this.data.scenarios[id].bestStars || {};
      t.safety += b.safety || 0;
      t.efficiency += b.efficiency || 0;
      t.service += b.service || 0;
    });
    // the best route day counts toward the rank as well (the route day is what the academy is for)
    const rb = (this.data.route && this.data.route.best) || {};
    t.safety += rb.safety || 0;
    t.efficiency += rb.efficiency || 0;
    t.service += rb.service || 0;
    t.all = t.safety + t.efficiency + t.service;
    return t;
  },

  rankInfo(total) {
    if (total === undefined) total = this.totals().all;
    const ranks = OTR_DATA.config.ranks;
    let index = 0;
    ranks.forEach((r, i) => { if (total >= r.stars) index = i; });
    const rank = ranks[index];
    const next = ranks[index + 1] || null;
    const progress = next ? (total - rank.stars) / (next.stars - rank.stars) : 1;
    return { index, rank, next, progress: OTR.util.clamp01(progress), total };
  },

  /** What a rank bar filled with rankInfo().progress measures: "4 / 20 ★ to Courier" (the stars of this band). */
  rankLabel(info) {
    if (!info.next) return `${info.rank.name}: top rank`;
    return `${info.total - info.rank.stars} / ${info.next.stars - info.rank.stars} ★ to ${info.next.name}`;
  },

  /**
   * Record a finished scenario. result: { score, stars: {cat: n} }
   * Returns a summary used by the results screen.
   */
  recordResult(id, result) {
    const before = this.totals().all;
    const rankBefore = this.rankInfo(before).index;

    const rec = this.data.scenarios[id] || { plays: 0, bestScore: 0, bestStars: { safety: 0, efficiency: 0, service: 0 } };
    const prevBest = Object.assign({}, rec.bestStars);
    const prevScore = rec.bestScore;
    rec.plays += 1;
    rec.lastPlayed = Date.now();
    rec.bestScore = Math.max(rec.bestScore, result.score || 0);
    Object.keys(result.stars).forEach(cat => {
      rec.bestStars[cat] = Math.max(rec.bestStars[cat] || 0, result.stars[cat]);
    });
    this.data.scenarios[id] = rec;

    this.write();
    const after = this.totals().all;
    return {
      newBestScore: (result.score || 0) > prevScore && rec.plays > 1,
      firstPlay: rec.plays === 1,
      prevBest,
      careerBefore: before,
      careerAfter: after,
      starsGained: after - before,
      rankBefore,
      rankAfter: this.rankInfo(after).index
    };
  },

  /**
   * Every scored run, for the trainee record: when, practice or assessment, the stars, and what went wrong. Kept to
   * the last 400 runs.
   */
  logAttempt(id, o) {
    if (this.ephemeral || !this.data) return;
    const h = this.data.history = this.data.history || [];
    h.push({
      id, at: Date.now(), assess: !!o.assess, score: o.score, stars: o.stars,
      dur: OTR.flow.startedAt ? Math.min(3 * 3600, Math.round((Date.now() - OTR.flow.startedAt) / 1000)) : 0,
      criticals: ((o.verdict && o.verdict.criticals) || []).map(c => c.label),
      lessons: ((o.verdict && o.verdict.takeaways) || []).slice(0, 5).map(t => t.text)
    });
    if (h.length > 400) h.splice(0, h.length - 400);
    this.write();
  },

  /**
   * A route day is finished: the career moves on to the next day. (Practice has no "day": the practice day summary
   * could never be reached and was removed, and the route's own history is kept in data.route.)
   */
  endDay() {
    this.data.day += 1;
    this.write();
  }
};
