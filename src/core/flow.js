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
    return OTR.registry.all().reduce((n, s) => n + s.categories.length * 3, 0);
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

  /** result: { score, ratios: {cat: 0-1}, lessons: [], stats: {}, thresholds? } */
  complete(scene, id, result) {
    if (OTR.shift && OTR.shift.intercept && OTR.shift.intercept(scene, id, result)) return;
    const sc = OTR.registry.get(id);
    const content = OTR.registry.content(sc) || {};
    const thresholds = result.thresholds || content.starThresholds || OTR_DATA.config.starThresholds;
    const stars = {};
    sc.categories.forEach(cat => {
      const r = OTR.util.clamp01((result.ratios && result.ratios[cat]) || 0);
      stars[cat] = OTR.scoring.stars(r, thresholds);
    });
    const rec = OTR.save.recordResult(id, { score: Math.round(result.score || 0), stars });
    OTR.fx.transition(scene, 'ResultsScene', { scenarioId: id, result, stars, rec });
  },

  toHub(scene) {
    if (OTR.save.todayFull() && !OTR.flow.testId) OTR.fx.transition(scene, 'DaySummaryScene');
    else OTR.fx.transition(scene, 'HubScene');
  }
};
