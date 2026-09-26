/* Scenario registry + game flow between hub, scenarios and results. */
window.OTR = window.OTR || {};

OTR.scenes = [];
OTR.registerScene = function (cls) { OTR.scenes.push(cls); };

OTR.registry = {
  modules() { return OTR_DATA.modules; },
  all() {
    const out = [];
    OTR_DATA.modules.forEach(m => m.scenarios.forEach(s => out.push(s)));
    return out;
  },
  get(id) {
    return OTR.registry.all().find(s => s.id === id) || null;
  },
  moduleOf(id) {
    return OTR_DATA.modules.find(m => m.scenarios.some(s => s.id === id)) || null;
  },
  content(sc) {
    return OTR.util.getPath(OTR_DATA, sc.dataKey);
  },
  maxStars() {
    // every scenario's categories, plus the best route day's three
    return OTR.registry.all().reduce((n, s) => n + s.categories.length * 3, 0) + OTR.scoring.CATS.length * 3;
  }
};

OTR.flow = {
  testId: null,
  dev: false,

  /** o: { assess: true } starts an assessment attempt (see OTR.academy); anything else is practice. */
  startScenario(scene, id, o) {
    const sc = OTR.registry.get(id);
    if (!sc) return;
    if (!scene.scene.manager.keys[sc.scene]) {
      OTR.ui.toast(scene, 'This scenario isn\'t available yet.');
      return;
    }
    if (OTR.drill.active && OTR.drill.active.ids[OTR.drill.active.i] !== id) OTR.drill.active = null;
    if (o && o.assess) OTR.drill.active = null;
    OTR.flow.startedAt = Date.now();                // for the record's "time training"
    if (o && o.assess && !OTR.flow.testId) OTR.academy.begin(id);
    else OTR.academy.assessing = null;
    OTR.fx.transition(scene, sc.scene, { scenarioId: id });
  },

  /**
   * result: { score, ratios: {cat: 0-1}, log?, group?, lessons?: [], summary?, stats: {}, thresholds? }
   * With a ScoreLog (log, and group if it holds more than this run) the verdict is worked out here, the same way for
   * every scenario: a category nothing tested earns no stars, a critical mistake caps its category at one star, and
   * the takeaways are ranked (critical first). A scene without a log passes its own lessons (most important first),
   * and may pass mistakes (a count) and untested (categories).
   */
  complete(scene, id, result) {
    if (OTR.shift && OTR.shift.intercept && OTR.shift.intercept(scene, id, result)) return;
    const sc = OTR.registry.get(id);
    const content = OTR.registry.content(sc) || {};
    const thresholds = result.thresholds || content.starThresholds || OTR_DATA.config.starThresholds;
    const cats = sc.categories;
    const log = result.log ? (result.log instanceof OTR.ScoreLog ? result.log : OTR.ScoreLog.from(result.log)) : null;
    const group = result.group;
    const untested = result.untested || (log ? cats.filter(c => !log.tested(c, group)) : []);
    const criticals = result.criticals || (log ? log.criticals(group, cats) : []);
    const stars = {};
    cats.forEach(cat => {
      const r = OTR.util.clamp01((result.ratios && result.ratios[cat]) || 0);
      stars[cat] = untested.indexOf(cat) >= 0 ? 0 : OTR.scoring.stars(r, thresholds);
      if (criticals.some(it => it.cat === cat)) stars[cat] = Math.min(1, stars[cat]);
    });
    let takeaways = log ? log.takeaways(group, cats) : [];
    // the scene's own lessons (a text, or { text, n, critical }): its whole list without a log, and after the log's
    // (praise or key points) with one
    (result.lessons || []).filter(Boolean).forEach(l => {
      const t = typeof l === 'string' ? { text: l } : l;
      if (!takeaways.some(o => o.text === t.text)) takeaways.push({ text: t.text, critical: !!t.critical, n: t.n || 1, note: !!log });
    });
    const mistakes = result.mistakes !== undefined ? result.mistakes : log ? log.mistakes(group, cats).length : takeaways.length;
    const verdict = { untested, criticals: criticals.map(it => ({ cat: it.cat, label: it.label })), takeaways, mistakes };
    const rec = OTR.save.recordResult(id, { score: Math.round(result.score || 0), stars });
    OTR.save.logAttempt(id, { assess: OTR.academy.assessing === id, score: Math.round(result.score || 0), stars, verdict });
    const assessment = OTR.academy.assessing === id ? OTR.academy.finish(sc, stars, Math.round(result.score || 0), verdict) : null;
    OTR.flow.last = { id, stars, verdict };
    OTR.fx.transition(scene, 'ResultsScene', { scenarioId: id, result, stars, rec, verdict, assessment });
  },

  toHub(scene) { OTR.fx.transition(scene, 'HubScene'); }
};

/*
 * "Drill my mistakes": the scenarios where the trainee has lost the most, played back to back (practice runs).
 * OTR.drill.queue() says what would be drilled; start() plays the first; the results screen offers the next.
 */
OTR.drill = {
  active: null,                // { ids: [..], i }

  /** Played scenarios short of full marks, most stars missing first (a critical mistake last time counts extra). */
  queue(max) {
    const d = OTR.save.data, last = {};
    (d.history || []).forEach(h => { last[h.id] = h; });
    return OTR.registry.all().map(sc => {
      const r = d.scenarios[sc.id];
      if (!r) return null;
      const lost = sc.categories.reduce((n, c) => n + 3 - ((r.bestStars && r.bestStars[c]) || 0), 0) + (last[sc.id] && last[sc.id].criticals && last[sc.id].criticals.length ? 3 : 0);
      return lost > 0 ? { id: sc.id, lost } : null;
    }).filter(Boolean).sort((a, b) => b.lost - a.lost).slice(0, max || 5).map(x => x.id);
  },

  start(scene) {
    const ids = this.queue();
    if (!ids.length) return false;
    this.active = { ids, i: 0 };
    OTR.flow.startScenario(scene, ids[0]);
    return true;
  },

  /** On the results screen: the next drill after this scenario, or null (and the drill ends after the last). */
  next(id) {
    const a = this.active;
    if (!a || a.ids[a.i] !== id) return null;
    return a.i + 1 < a.ids.length ? { id: a.ids[a.i + 1], n: a.i + 2, of: a.ids.length } : { id: null, n: a.ids.length, of: a.ids.length };
  },

  advance(scene) {
    const a = this.active;
    a.i++;
    if (a.i >= a.ids.length) { this.active = null; OTR.fx.transition(scene, 'HubScene'); return; }
    OTR.flow.startScenario(scene, a.ids[a.i]);
  }
};
