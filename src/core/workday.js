/*
 * The 3D workday's report to the rest of the game, and its start and finish.
 *
 * The 3D world (depot, van, street, doorstep) says what the trainee did, as an event type listed in
 * data/workday_events.js. This turns each report into a score-log line, so the results screen, the debrief, the
 * trainee's record, trainer reports and translations work as they do for every other scenario. The 3D world never
 * awards points or writes feedback text itself: the catalogue does, and a trainer-facing change to scoring is a change
 * to that one data file.
 *
 * Reports (called by the 3D world):
 *   OTR.workday.report(type, d)     d: { key, ok, stop, where }
 *     key     what this report is about (a parcel id, a leg number): a type is counted once per key
 *     ok      for a check: false when the trainee got it wrong (left out: right)
 *     stop    the stop number it belongs to, counting from 1, for per-stop reports (left out: the event's phase)
 *     where   { x, z, mph } where it happened, for the drive review
 *
 * A workday's life (docs/WORKDAY-EVENTS.md, "Starting and finishing a workday"):
 *   OTR.workday.start(scene)        the hub: a new workday, saved as it goes; opens the 3D scene
 *   OTR.workday.resume(scene)       the hub: the saved workday again, with its score so far
 *   OTR.workday.pause(scene)        the 3D world: the trainee leaves mid-day; it stays saved, unscored
 *   OTR.workday.finish(scene, s)    the 3D world: the day is done; scores it, saves it to the record, shows results
 *   OTR.workday.abandon(scene)      the hub: the saved workday is discarded, unscored
 *
 * Lower level (tests, the prototype opened on its own with ?lab=firstperson):
 *   OTR.workday.begin(log)          send reports to this ScoreLog (a new one if none is given), unsaved; returns it
 *   OTR.workday.restore(saved)      replay a saved { events } into a new log (unknown types are skipped)
 *   OTR.workday.events              every accepted report, in order
 *
 * Saved in the trainee's progress (OTR.save.data.workday):
 *   current   the workday in progress: { id, day, startedAt, seconds, events } (the events rebuild its score)
 *   last      the last finished workday, for the debrief: its frozen stars and score, and its events
 */
window.OTR = window.OTR || {};

OTR.workday = {
  SCENE: 'FirstPersonScene',        // the scene the hub starts (src/main.js registers every scene by its key)
  PHASES: ['brief', 'pretrip', 'load', 'drive', 'stop', 'end'],
  log: null,
  events: [],
  seen: new Set(),
  current: null,                    // the saved workday reports are kept in (null: reports are not saved)

  /** Is the 3D workday offered at the hub? ?workday3d=1 or 0 for one visit, else OTR_DATA.config.workday3d. */
  offered() {
    const q = new URLSearchParams(window.location.search).get('workday3d');
    if (q === '1' || q === '0') return q === '1';
    return !!(window.OTR_DATA && OTR_DATA.config && OTR_DATA.config.workday3d);
  },

  /** The trainee's saved workdays: { current, last }. */
  saved() {
    const S = OTR.save && OTR.save.data;
    if (!S) return { current: null, last: null };
    if (!S.workday || typeof S.workday !== 'object') S.workday = { current: null, last: null };
    return S.workday;
  },

  /** Is there a saved workday in progress? */
  active() {
    const c = this.saved().current;
    return !!(c && Array.isArray(c.events));
  },

  begin(log) {
    this.log = log || new OTR.ScoreLog();
    this.events = [];
    this.seen = new Set();
    if (this.current) { this.current.events = this.events; this.persist(); }
    return this.log;
  },

  report(type, d) {
    if (!this.log) this.begin();
    const it = this.apply(this, type, d);
    if (it && this.current && !this.replaying) this.persist();
    return it;
  },

  /** One report into a { log, events, seen }: the score-log line, or null (unknown type, or a repeat). */
  apply(into, type, d) {
    d = d || {};
    const E = window.OTR_DATA && OTR_DATA.workdayEvents && OTR_DATA.workdayEvents[type];
    if (!E) { console.warn('[OTR] unknown workday event: ' + type); return null; }
    const key = type + '|' + (d.key === undefined || d.key === null ? '' : d.key);
    if (into.seen.has(key)) return null;
    into.seen.add(key);
    const ok = d.ok !== false;
    const stop = d.stop === undefined || d.stop === null ? null : d.stop;
    const ev = { type, key: d.key === undefined ? null : d.key, ok, stop };
    const saved = this.place(d.where);                          // the save keeps a smaller copy of the place
    if (saved) ev.where = saved;
    into.events.push(ev);
    const o = {
      lesson: E.lesson || null,
      critical: !!E.critical,
      where: d.where || null,
      group: stop === null ? E.phase : 'stop' + stop
    };
    if (E.kind === 'penalty') return into.log.penalty(E.cat, E.pts, E.label, Object.assign(o, { severity: E.severity || 'minor' }));
    if (E.kind === 'bonus') return into.log.bonus(E.cat, E.pts, E.label, o);
    return into.log.check(E.cat, ok ? E.max : 0, E.max, ok ? E.label : (E.fail || E.label), o);
  },

  /** A report's place, kept small for the save: metres to a decimetre, speed to the whole mph. */
  place(w) {
    if (!w || typeof w !== 'object') return null;
    const out = {};
    Object.keys(w).forEach(k => {
      const v = w[k];
      if (typeof v !== 'number' || !Number.isFinite(v)) { if (v !== undefined) out[k] = v; return; }
      out[k] = k === 'mph' ? Math.round(v) : k === 'x' || k === 'y' || k === 'z' ? Math.round(v * 10) / 10 : v;
    });
    return out;
  },

  /** Saved events → { log, events } of a new ScoreLog. Types the catalogue no longer has are skipped, not fatal. */
  replay(list) {
    const into = { log: new OTR.ScoreLog(), events: [], seen: new Set() };
    (Array.isArray(list) ? list : []).forEach(e => {
      if (!e || typeof e.type !== 'string') return;
      this.apply(into, e.type, { key: e.key === null ? undefined : e.key, ok: e.ok, stop: e.stop, where: e.where });
    });
    return into;
  },

  /** Carry on from a saved workday's events: the score so far is rebuilt, and repeats of them are still dropped. */
  restore(saved) {
    const r = this.replay(saved && saved.events);
    this.log = r.log; this.events = r.events; this.seen = r.seen;
    if (this.current) this.current.events = this.events;
    return this.log;
  },

  persist() { if (OTR.save && OTR.save.data) OTR.save.write(); },

  /** Seconds played since start or resume, added to the workday's own count. */
  clock() {
    const c = this.current;
    if (!c) return 0;
    if (this.since) { c.seconds = (c.seconds || 0) + Math.max(0, Math.round((Date.now() - this.since) / 1000)); this.since = Date.now(); }
    return c.seconds || 0;
  },

  /** Let go of the live workday (it stays saved). */
  detach() {
    this.current = null; this.log = null; this.events = []; this.seen = new Set(); this.since = null;
  },

  /* ---------------------------------------------------------------- the hub's side */

  /** A new workday, saved as it goes, then the 3D scene with { workday: { resume: false } }. */
  start(scene) {
    const W = this.saved();
    this.current = W.current = { id: Date.now().toString(36), day: OTR.save.data.day || 1, startedAt: Date.now(), seconds: 0, events: [] };
    this.since = Date.now();
    this.begin();
    this.enter(scene, false);
    return this.current;
  },

  /**
   * The saved workday, with its score so far, then the 3D scene with { workday: { resume: true } }. If the 3D world
   * has no saved place to carry on from (its own save was cleared, or this is another computer), the day starts
   * again from the morning: its reports so far would not match the new run, so they are dropped too.
   */
  resume(scene) {
    const cur = this.saved().current;
    if (!cur) return false;
    this.current = cur;
    this.since = Date.now();
    let resume = true;
    try { resume = !(OTR.fpStore && !OTR.fpStore.read().campaign); } catch (e) { resume = true; }
    if (resume) this.restore(cur); else this.begin();
    this.enter(scene, resume);
    return true;
  },

  enter(scene, resume) {
    if (!scene) return;
    if (!scene.scene.manager.keys[this.SCENE]) { OTR.ui.toast(scene, 'The 3D workday isn\'t available yet.'); return; }
    OTR.flow.startedAt = Date.now();
    OTR.fx.transition(scene, this.SCENE, { workday: { resume: !!resume, id: this.current && this.current.id } });
  },

  /** The trainee leaves mid-day (from the 3D world): saved, unscored, and offered again at the hub. */
  pause(scene) {
    if (this.current) { this.clock(); this.persist(); }
    this.detach();
    if (scene) this.leave(scene, 'HubScene');
  },

  /**
   * Out of the 3D scene. It does not open with OTR.fx.enter, which clears the flag a transition leaves set, so the
   * second workday of a session would otherwise never leave it.
   */
  leave(scene, key, data) {
    scene._leaving = false;
    OTR.fx.transition(scene, key, data);
  },

  /** The saved workday is thrown away, unscored. */
  abandon(scene) {
    this.saved().current = null;
    this.persist();
    this.detach();
    if (scene) OTR.fx.transition(scene, 'HubScene');
  },

  /* ---------------------------------------------------------------- finishing */

  /**
   * The day is over (from the 3D world). summary (every field optional; the score comes from the reports):
   *   seconds   how long the day took in the 3D world (else the time measured here)
   *   stops     [{ stop, delivered, address, x, z }]: each stop, delivered or not, and where it is (the drive review)
   *   depot     { x, z }: where the depot is, for the drive review
   * Scores the day, saves it to the record and opens the results screen. Returns the saved record.
   */
  finish(scene, summary) {
    if (!this.log) { if (this.active()) { this.current = this.saved().current; this.restore(this.current); } else this.begin(); }
    const rec = this.score(this.log, summary, this.current);
    // frozen: the record keeps its own copy, and a report that arrives after this starts an unsaved log of its own
    this.detach();
    const out = this.keep(rec);
    if (scene) this.leave(scene, 'ResultsScene', this.resultsData(rec, out));
    return rec;
  },

  /** The day's score, the way every scenario is scored: from the log, with criticals capping their category. */
  score(log, summary, cur) {
    summary = summary || {};
    const cats = OTR.scoring.CATS;
    const ratios = log.ratios(cats);
    const criticals = log.criticals(undefined, cats);
    const untested = cats.filter(c => !log.tested(c));
    const stars = {};
    cats.forEach(c => {
      stars[c] = untested.indexOf(c) >= 0 ? 0 : OTR.scoring.stars(ratios[c]);
      if (criticals.some(it => it.cat === c)) stars[c] = Math.min(1, stars[c]);
    });
    const stops = (Array.isArray(summary.stops) ? summary.stops : []).filter(s => s && s.stop !== undefined).map(s => {
      const o = { stop: s.stop, delivered: !!s.delivered };
      if (typeof s.address === 'string') o.address = s.address;
      if (Number.isFinite(s.x) && Number.isFinite(s.z)) { o.x = s.x; o.z = s.z; }
      return o;
    });
    const seconds = Number.isFinite(summary.seconds) && summary.seconds >= 0 ? Math.round(summary.seconds) : (cur ? this.clock() : 0);
    const rec = {
      id: cur ? cur.id : Date.now().toString(36),
      day: cur ? cur.day : (OTR.save && OTR.save.data && OTR.save.data.day) || 1,
      at: Date.now(), seconds: Math.min(4 * 3600, seconds),
      stars, ratios, untested, score: log.score(),
      criticals: criticals.map(it => it.label),
      lessons: log.takeaways(undefined, cats).slice(0, 5).map(t => t.text),
      stops, delivered: stops.filter(s => s.delivered).length,
      events: (cur ? cur.events : this.events).slice()
    };
    if (summary.depot && Number.isFinite(summary.depot.x) && Number.isFinite(summary.depot.z)) rec.depot = { x: summary.depot.x, z: summary.depot.z };
    return rec;
  },

  /**
   * Into the trainee's progress: a route day (the day count, the best stars and the career they feed), a scored run
   * on the record (recent runs, what to work on, critical mistakes), and the debrief to open again. Returns what the
   * results screen says about the career.
   */
  keep(rec) {
    const S = OTR.save.data;
    const before = OTR.save.totals().all, rankBefore = OTR.save.rankInfo(before).index;
    S.route = S.route || { days: 0, best: { safety: 0, efficiency: 0, service: 0 }, history: [] };
    S.route.best = S.route.best || { safety: 0, efficiency: 0, service: 0 };
    S.route.history = S.route.history || [];
    const prevBest = Object.assign({}, S.route.best), firstPlay = !this.saved().last;
    S.route.days = (S.route.days || 0) + 1;
    OTR.scoring.CATS.forEach(c => { S.route.best[c] = Math.max(S.route.best[c] || 0, rec.stars[c]); });
    S.route.history.push({ kind: 'workday', day: rec.day, at: rec.at, stars: rec.stars, ratios: rec.ratios, delivered: rec.delivered, minutes: Math.round(rec.seconds / 60) });
    S.route.history = S.route.history.slice(-10);
    const h = S.history = S.history || [];
    h.push({ id: 'workday', kind: 'workday', at: rec.at, assess: false, score: rec.score, stars: rec.stars, dur: rec.seconds, criticals: rec.criticals, lessons: rec.lessons });
    if (h.length > 400) h.splice(0, h.length - 400);
    const W = this.saved();
    W.last = rec;
    W.current = null;
    OTR.save.endDay();                                           // writes the save
    const after = OTR.save.totals().all;
    return { prevBest, firstPlay, careerBefore: before, careerAfter: after, starsGained: after - before, rankBefore, rankAfter: OTR.save.rankInfo(after).index, newBestScore: false };
  },

  /** What the results screen is given: the day as a scenario of its own, with the debrief as the next step. */
  resultsData(rec, career) {
    const cats = OTR.scoring.CATS;
    const r = this.replay(rec.events);
    const log = r.log;
    const takeaways = log.takeaways(undefined, cats);
    if (!log.items.length) takeaways.push({ text: 'Nothing was recorded on this workday.', n: 1 });
    const verdict = { untested: rec.untested || [], criticals: log.criticals(undefined, cats).map(it => ({ cat: it.cat, label: it.label })), takeaways, mistakes: log.mistakes(undefined, cats).length };
    return {
      scenarioId: 'workday',
      scenario: { id: 'workday', title: 'Your workday', categories: cats.slice() },
      result: { score: rec.score, ratios: rec.ratios, log, summary: this.summaryLine(rec) },
      stars: rec.stars, rec: career, verdict,
      review: this.reviewData(rec, log, { back: 'ResultsScene' }),
      next: { label: 'Debrief ▶', scene: 'WorkdayDebriefScene', data: {} }
    };
  },

  /** "2 of 3 stops delivered · 24 min" (empty when the 3D world said nothing about stops or time). */
  summaryLine(rec) {
    const parts = [];
    if (rec.stops && rec.stops.length) parts.push(`${rec.delivered} of ${rec.stops.length} stops delivered`);
    if (rec.seconds >= 30) parts.push(`${Math.round(rec.seconds / 60)} min`);
    return parts.join(' · ');
  },

  /** The drive review's data for a finished workday: its pins on a plan of the 3D streets. */
  reviewData(rec, log, o) {
    const pins = OTR.drive.pins(log);
    return Object.assign({ pins, plan: { depot: rec.depot || null, stops: rec.stops || [] }, title: `Workday · day ${rec.day}` }, o || {});
  },

  /**
   * The debrief, phase by phase and stop by stop: each section's lines, a repeated line counted once ("× 3"), with
   * the lesson under a mistake and, for a driving mistake, which drive-review pin shows where it happened.
   */
  sections(rec) {
    const r = this.replay(rec && rec.events);
    const pins = OTR.drive.pins(r.log);
    let pin = 0;
    const groups = new Map();
    r.log.items.forEach(it => {
      const bad = it.kind === 'penalty' || (it.kind === 'check' && it.got < it.max);
      const pinned = bad && it.where ? pin++ : -1;
      if (!groups.has(it.group)) groups.set(it.group, []);
      const lines = groups.get(it.group);
      const mark = it.kind === 'bonus' ? 'bonus' : bad ? 'bad' : 'good';
      let l = lines.find(x => x.label === it.label && x.mark === mark);
      if (!l) { l = { label: it.label, lesson: bad ? it.lesson : null, cat: it.cat, mark, critical: false, n: 0, pin: -1 }; lines.push(l); }
      l.n++;
      l.critical = l.critical || !!it.critical;
      if (l.pin < 0 && pinned >= 0) l.pin = pinned;
    });
    const stopInfo = {};
    ((rec && rec.stops) || []).forEach(s => { stopInfo['stop' + s.stop] = s; });
    const rank = (g) => {
      const m = /^stop(-?\d+)$/.exec(g);
      if (m) return 4 + (Number(m[1]) + 1000) / 100000;            // the stops, in order, after driving
      const i = this.PHASES.indexOf(g);
      return i < 0 ? 9 : i === 5 ? 6 : i;                          // end of day after the stops
    };
    const out = [...groups.keys()].sort((a, b) => rank(a) - rank(b)).map(g => {
      const lines = groups.get(g);
      // mistakes first (critical first), then bonuses, then what went right
      const order = { bad: 0, bonus: 1, good: 2 };
      lines.sort((a, b) => (order[a.mark] - order[b.mark]) || (b.critical - a.critical));
      return { group: g, stop: stopInfo[g] || null, lines };
    });
    return { sections: out, pins, unknown: ((rec && rec.events) || []).length - r.events.length };
  }
};
