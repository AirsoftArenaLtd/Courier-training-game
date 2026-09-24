/*
 * Save / progress persistence (localStorage).
 * Career stars = sum over scenarios of the best stars earned in each category.
 */
window.OTR = window.OTR || {};

OTR.save = {
  KEY: 'otr_save_v1',
  data: null,
  ephemeral: false, // test mode: never writes to storage

  defaults() {
    return {
      version: 1,
      profile: null,
      day: 1,
      today: { completed: [], startTotal: 0 },
      scenarios: {},
      settings: { muted: false, hints: true },
      history: [],
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
      if (parsed.today && Array.isArray(parsed.today.completed)) {
        d.today.completed = parsed.today.completed.filter(s => s && typeof s.id === 'string');
        d.today.startTotal = Number(parsed.today.startTotal) || 0;
      }
      if (parsed.scenarios && typeof parsed.scenarios === 'object') d.scenarios = parsed.scenarios;
      if (parsed.settings) {
        d.settings.muted = !!parsed.settings.muted;
        if (parsed.settings.hints !== undefined) d.settings.hints = !!parsed.settings.hints;
      }
      if (Array.isArray(parsed.history)) d.history = parsed.history.slice(-10);
      if (parsed.shift && typeof parsed.shift === 'object') d.shift = parsed.shift;
      if (parsed.route && typeof parsed.route === 'object') d.route = Object.assign(d.route, parsed.route);
    }
    this.data = d;
    return d;
  },

  write() {
    if (this.ephemeral || !this.data) return;
    try {
      window.localStorage.setItem(this.KEY, JSON.stringify(this.data));
    } catch (e) { /* storage unavailable — progress lasts for this session only */ }
  },

  hasProfile() {
    return !!(this.data && this.data.profile);
  },

  createProfile(name) {
    const muted = this.data ? this.data.settings.muted : false;
    this.data = this.defaults();
    this.data.settings.muted = muted;
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
    const muted = this.data ? this.data.settings.muted : false;
    this.data = this.defaults();
    this.data.settings.muted = muted;
    this.write();
  },

  setMuted(m) {
    this.data.settings.muted = !!m;
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

  perDay() {
    return OTR_DATA.config.scenariosPerDay || 3;
  },

  todayFull() {
    return this.data.today.completed.length >= this.perDay();
  },

  inToday(id) {
    return this.data.today.completed.some(s => s.id === id);
  },

  canPlay(id) {
    return !this.todayFull() || this.inToday(id);
  },

  /**
   * Record a finished scenario. result: { score, stars: {cat: n} }
   * Returns a summary used by the results screen.
   */
  recordResult(id, result) {
    const before = this.totals().all;
    const rankBefore = this.rankInfo(before).index;
    if (this.data.today.completed.length === 0) this.data.today.startTotal = before;

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

    // Today's clipboard: one slot per scenario; replays keep the better result.
    const slot = { id, stars: Object.assign({}, result.stars), score: result.score || 0 };
    const existing = this.data.today.completed.findIndex(s => s.id === id);
    let slotted = false;
    if (existing >= 0) {
      if (this.starSum(slot.stars) >= this.starSum(this.data.today.completed[existing].stars)) {
        this.data.today.completed[existing] = slot;
      }
      slotted = true;
    } else if (!this.todayFull()) {
      this.data.today.completed.push(slot);
      slotted = true;
    }

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
      rankAfter: this.rankInfo(after).index,
      slotted,
      dayComplete: this.todayFull()
    };
  },

  todayStars() {
    const t = { safety: 0, efficiency: 0, service: 0, all: 0 };
    this.data.today.completed.forEach(s => {
      t.safety += s.stars.safety || 0;
      t.efficiency += s.stars.efficiency || 0;
      t.service += s.stars.service || 0;
    });
    t.all = t.safety + t.efficiency + t.service;
    return t;
  },

  endDay() {
    const stars = this.todayStars();
    this.data.history.push({
      day: this.data.day,
      stars: stars.all,
      scenarios: this.data.today.completed.map(s => s.id),
      at: Date.now()
    });
    this.data.history = this.data.history.slice(-10);
    this.data.day += 1;
    this.data.today = { completed: [], startTotal: this.totals().all };
    this.write();
  }
};
