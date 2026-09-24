/*
 * Save / progress persistence (localStorage).
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

  load() {
    let parsed = null;
    try {
      const raw = window.localStorage.getItem(this.KEY);
      if (raw) parsed = JSON.parse(raw);
    } catch (e) {
      parsed = null;
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
      }
      if (parsed.shift && typeof parsed.shift === 'object') d.shift = parsed.shift;
      if (parsed.route && typeof parsed.route === 'object') d.route = Object.assign(d.route, parsed.route);
    }
    this.data = d;
    // find out now whether anything can be kept: a trainee must hear it before a day's work is lost, not after (SHELL-14)
    if (!this.ephemeral) {
      try {
        window.localStorage.setItem(this.KEY + '_probe', '1');
        window.localStorage.removeItem(this.KEY + '_probe');
      } catch (e) { this.failed = true; }
    }
    return d;
  },

  write() {
    if (this.ephemeral || !this.data) return;
    try {
      window.localStorage.setItem(this.KEY, JSON.stringify(this.data));
      this.failed = false;
    } catch (e) { this.failed = true; /* progress lasts for this session only, and the title and hub say so */ }
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
    try { window.localStorage.removeItem(this.KEY); } catch (e) { /* ignore */ }
    const settings = this.data ? this.data.settings : null;
    this.data = this.defaults();
    if (settings) Object.assign(this.data.settings, settings);
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
   * A route day is finished: the career moves on to the next day. (Practice has no "day": the practice day summary
   * could never be reached and was removed, and the route's own history is kept in data.route.)
   */
  endDay() {
    this.data.day += 1;
    this.write();
  }
};
