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
      // a workday in progress that SCORM 1.2's size limit packed or summarised (see fit) has its reports back
      if (d.workday && typeof d.workday === 'object' && d.workday.current) d.workday.current = this.unpackDay(d.workday.current);
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
      // SCORM 1.2 holds 4096 characters of suspend data (2004 holds 64000: it is sent as it is)
      const out = I.scorm.v2004 ? json : this.fit(json, this.SCORM12_LIMIT);
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

  SCORM12_LIMIT: 4000,      // under SCORM 1.2's 4096 characters of cmi.suspend_data, with room to spare

  /**
   * The save as JSON of at most `limit` characters (SCORM 1.2's suspend data). Each step below is tried in order, and
   * the first result that fits is kept, so a save that already fits is sent as it is:
   *   1. the oldest route-history entries go, one by one
   *   2. the last finished workday's lines (its stars and score stay; its debrief then lists nothing)
   *   3. the workday in progress is packed: its reports as short tuples (nothing is lost but extra place detail)
   *   4. the trainee record keeps its 10 most recent runs
   *   5. the workday in progress keeps only what its score needs: per report type, the keys counted right and wrong
   *      (its stops and drive-review places are lost; flagged `summarised`)
   *   6. the trainee record is emptied, then the last workday's stop list and the 2D route day's last day
   *   7. keys of step 5 go, each kept as a count so the score stays whole (flagged `truncated`: a report of a dropped
   *      key that the 3D world sends again would count twice)
   *   8. only the career: profile, day, settings, best stars, academy results, the workday's summary; then less
   * The JSON is never cut: a reload reads every stage back (see unpackDay). Local and server saves are not limited.
   */
  fit(json, limit) {
    if (json.length <= limit) return json;
    let d = JSON.parse(json), out = json;
    const size = () => (out = JSON.stringify(d)).length;
    const over = () => size() > limit;
    const W = () => (d.workday && typeof d.workday === 'object' ? d.workday : null);
    const cur = () => { const w = W(); return w && w.current && typeof w.current === 'object' ? w.current : null; };
    // drop from the front of a list until it fits (about as many as the excess needs each time, so it stays quick)
    const shed = (list, keep) => {
      while (list && list.length > (keep || 0) && over()) {
        const each = Math.max(1, JSON.stringify(list).length / list.length);
        list.splice(0, Math.min(list.length - (keep || 0), Math.max(1, Math.floor((out.length - limit) / each))));
      }
    };
    const steps = [
      () => shed(d.route && d.route.history),
      () => { const w = W(); if (w && w.last && Array.isArray(w.last.events)) w.last.events = []; },
      () => { if (cur()) d.workday.current = this.packDay(cur()); },
      () => shed(Array.isArray(d.history) ? d.history : null, 10),
      () => { if (cur()) d.workday.current = this.summariseDay(cur()); },
      () => {
        shed(Array.isArray(d.history) ? d.history : null);
        const w = W();
        if (over() && w && w.last) { delete w.last.stops; delete w.last.lessons; }
        if (over() && d.route) delete d.route.last;
      },
      () => { if (cur()) this.trimSummary(cur(), () => size() - limit); },
      () => {
        const c = cur(), last = W() && W().last;
        const keep = { version: d.version, profile: d.profile, day: d.day, settings: d.settings, scenarios: d.scenarios,
          route: { days: (d.route && d.route.days) || 0, best: d.route && d.route.best }, assess: d.assess, quiz: d.quiz,
          workday: { current: c || null, last: last ? { day: last.day, at: last.at, stars: last.stars, ratios: last.ratios, score: last.score, untested: last.untested, events: [] } : null },
          savedAt: d.savedAt, truncated: true };
        d = keep;
        if (over()) { if (d.settings) delete d.settings.a11y; delete d.quiz; }
        if (over()) d.workday.last = null;
        if (over()) d = { version: d.version, profile: d.profile, day: d.day, route: d.route, workday: { current: c ? this.trimSummary(c, () => Infinity) : null, last: null }, savedAt: d.savedAt, truncated: true };
        if (over()) d = { version: d.version, profile: d.profile && { name: String(d.profile.name).slice(0, 40), id: d.profile.id }, day: d.day, truncated: true };
        if (over()) d = { version: d.version, day: d.day, truncated: true };
      }
    ];
    for (const step of steps) {
      step();
      if (!over()) return out;
    }
    return out.length <= limit ? out : '{"version":1,"truncated":true}';   // (cannot happen: step 8 ends this small)
  },

  /**
   * A workday in progress with its reports packed: { ..., packed: { t: [type names], e: [[t, key, ok, stop, x, z,
   * mph, t]] } } (ok 1 or 0; trailing nulls left off; a place only when it has x and z). unpackDay reverses it.
   */
  packDay(c) {
    if (!Array.isArray(c.events)) return c;
    const out = Object.assign({}, c), types = [], e = [];
    delete out.events;
    const num = (v, r) => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v * r) / r : null);
    c.events.forEach(ev => {
      if (!ev || typeof ev.type !== 'string') return;
      let ti = types.indexOf(ev.type);
      if (ti < 0) { ti = types.length; types.push(ev.type); }
      const w = ev.where && num(ev.where.x, 10) !== null && num(ev.where.z, 10) !== null ? ev.where : null;
      const row = [ti, ev.key === undefined ? null : ev.key, ev.ok === false ? 0 : 1, ev.stop === undefined ? null : ev.stop,
        w ? num(w.x, 10) : null, w ? num(w.z, 10) : null, w ? num(w.mph, 1) : null, w ? num(w.t, 1) : null];
      while (row.length > 3 && row[row.length - 1] === null) row.pop();
      e.push(row);
    });
    out.packed = { t: types, e };
    return out;
  },

  /**
   * Only what the score needs: { ..., summary: [[type, keys right, keys wrong, more right, more wrong]], summarised }
   * ("more": reports whose keys were dropped by trimSummary, still counted). Accepts a full or a packed workday.
   */
  summariseDay(c) {
    const full = this.unpackDay(c), out = Object.assign({}, full), by = new Map();
    delete out.events;
    (Array.isArray(full.events) ? full.events : []).forEach(ev => {
      if (!ev || typeof ev.type !== 'string') return;
      if (!by.has(ev.type)) by.set(ev.type, [ev.type, [], [], 0, 0]);
      const r = by.get(ev.type), lost = typeof ev.key === 'string' && ev.key.indexOf(this.LOST) === 0;
      if (lost) r[ev.ok === false ? 4 : 3]++;
      else r[ev.ok === false ? 2 : 1].push(ev.key === undefined ? null : ev.key);
    });
    out.summary = [...by.values()].map(r => { while (r.length > 3 && !r[r.length - 1]) r.pop(); return r; });
    out.summarised = true;
    return out;
  },

  /** Drop summary keys (keeping each as a count) until `excess()` is no longer above 0; flags the workday `truncated`. */
  trimSummary(c, excess) {
    if (!Array.isArray(c.summary)) return c;
    let ex = excess();
    while (ex > 0) {
      // the type with the most keys gives up as many as the excess needs
      let best = null, n = 0;
      c.summary.forEach(r => { const k = (r[1] || []).length + (r[2] || []).length; if (k > n) { n = k; best = r; } });
      if (!best) break;
      let freed = 0;
      while (freed < ex && ((best[1] || []).length || (best[2] || []).length)) {
        const wrong = (best[2] || []).length >= (best[1] || []).length;
        const k = (wrong ? best[2] : best[1]).pop();
        while (best.length < 5) best.push(best.length < 3 ? [] : 0);
        best[wrong ? 4 : 3]++;
        freed += JSON.stringify(k).length + 1;
      }
      c.truncated = true;
      if (excess() === Infinity) continue;
      ex = excess();
    }
    return c;
  },

  LOST: '~lost~',           // the key a report kept only as a count is given back, so it cannot match a real one

  /** A saved workday in progress, packed or summarised by fit(), back to { ..., events } as the workday keeps it. */
  unpackDay(c) {
    if (!c || typeof c !== 'object' || Array.isArray(c.events)) return c;
    const out = Object.assign({}, c), events = [];
    if (c.packed && Array.isArray(c.packed.e)) {
      const types = Array.isArray(c.packed.t) ? c.packed.t : [];
      c.packed.e.forEach(r => {
        if (!Array.isArray(r) || typeof types[r[0]] !== 'string') return;
        const ev = { type: types[r[0]], key: r[1] === undefined ? null : r[1], ok: r[2] !== 0, stop: r[3] === undefined ? null : r[3] };
        if (Number.isFinite(r[4]) && Number.isFinite(r[5])) {
          ev.where = { x: r[4], z: r[5] };
          if (Number.isFinite(r[6])) ev.where.mph = r[6];
          if (Number.isFinite(r[7])) ev.where.t = r[7];
        }
        events.push(ev);
      });
    } else if (Array.isArray(c.summary)) {
      c.summary.forEach(r => {
        if (!Array.isArray(r) || typeof r[0] !== 'string') return;
        (r[1] || []).forEach(k => events.push({ type: r[0], key: k, ok: true, stop: null }));
        (r[2] || []).forEach(k => events.push({ type: r[0], key: k, ok: false, stop: null }));
        let n = 0;
        for (let i = 0; i < (r[3] || 0); i++) events.push({ type: r[0], key: this.LOST + n++, ok: true, stop: null });
        for (let i = 0; i < (r[4] || 0); i++) events.push({ type: r[0], key: this.LOST + n++, ok: false, stop: null });
      });
    } else return c;
    delete out.packed; delete out.summary;
    out.events = events;
    return out;
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
