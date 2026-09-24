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

  startScenario(scene, id) {
    const sc = OTR.registry.get(id);
    if (!sc) return;
    if (!scene.scene.manager.keys[sc.scene]) {
      OTR.ui.toast(scene, 'This scenario isn\'t available yet.');
      return;
    }
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
    OTR.flow.last = { id, stars, verdict };
    OTR.fx.transition(scene, 'ResultsScene', { scenarioId: id, result, stars, rec, verdict });
  },

  toHub(scene) { OTR.fx.transition(scene, 'HubScene'); }
};
