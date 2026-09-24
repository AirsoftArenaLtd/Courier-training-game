/* boot: reboot the game (config from main.js + window.__cfg) and time it: game start -> scenario scene running,
 * texture generation (tex.make) time, and the long frames during the first 5 s. window.__wrf = true patches every
 * 2D canvas context to willReadFrequently (CPU-backed) before the new game starts. */
(async () => {
  const over = window.__cfg || {};
  if (window.__wrf && !HTMLCanvasElement.prototype.getContext.__wrf) {
    const og = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, attrs) {
      if (type === '2d' && window.__wrf) attrs = Object.assign({ willReadFrequently: true }, attrs || {});
      return og.call(this, type, attrs);
    };
    HTMLCanvasElement.prototype.getContext.__wrf = true;
  }
  OTR.game.destroy(true);
  await new Promise(r => setTimeout(r, 500));
  delete window.__pk; delete window.__gk;
  if (window.__hk) window.__hk.log = [];
  const base = { type: Phaser.AUTO, parent: 'game', width: OTR.W, height: OTR.H, backgroundColor: '#16062b', scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }, render: { antialias: true }, disableContextMenu: true, scene: OTR.scenes };
  const cfg = Object.assign({}, base, over, { render: Object.assign({}, base.render, over.render || {}) });
  const gaps = []; let last = performance.now(); let on = true;
  const tick = () => { const n = performance.now(); gaps.push(n - last); last = n; if (on) requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  const t0 = performance.now();
  OTR.game = new Phaser.Game(cfg);
  const want = OTR.registry.get(OTR.flow.testId).scene;
  let tRun = null;
  while (performance.now() - t0 < 15000) {
    const s = OTR.game.scene && OTR.game.scene.getScene(want);
    if (s && s.sys.settings.status === Phaser.Scenes.RUNNING && tRun === null) tRun = performance.now() - t0;
    if (tRun !== null && performance.now() - t0 > tRun + 4000) break;
    await new Promise(r => setTimeout(r, 20));
  }
  on = false;
  const H = window.__hk || { log: [] };
  const long = gaps.filter(g => g > 50).map(g => Math.round(g));
  return { wrf: !!window.__wrf, sceneRunningMs: Math.round(tRun), texMade: H.log.length, texMakeMs: Math.round(H.log.reduce((s, l) => s + l.ms, 0)), slowest: H.log.slice().sort((a, b) => b.ms - a.ms).slice(0, 4).map(l => l.what + ' ' + Math.round(l.ms)), longFrames: long.slice(0, 12), longSum: long.reduce((a, b) => a + b, 0) };
})()
