/*
 * reboot: destroy the running Phaser.Game and start a new one with the game's own config (src/main.js) merged with
 * window.__cfg (e.g. { render: { antialias: true, antialiasGL: false } }). The same ?scenario= boots again.
 * Kits (__pk, __gk) must be re-injected afterwards.
 */
(async () => {
  const over = window.__cfg || {};
  const old = OTR.game;
  old.destroy(true);
  await new Promise(r => setTimeout(r, 400));
  delete window.__pk; delete window.__gk;
  const base = {
    type: Phaser.AUTO, parent: 'game', width: OTR.W, height: OTR.H, backgroundColor: '#16062b',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    render: { antialias: true }, disableContextMenu: true, scene: OTR.scenes
  };
  const cfg = Object.assign({}, base, over, { render: Object.assign({}, base.render, over.render || {}), scale: Object.assign({}, base.scale, over.scale || {}) });
  OTR.game = new Phaser.Game(cfg);
  await new Promise(r => { const t = setInterval(() => { if (OTR.game.isBooted) { clearInterval(t); r(); } }, 50); });
  await new Promise(r => setTimeout(r, 3000));
  const gl = OTR.game.renderer.gl;
  return { booted: true, scenes: OTR.game.scene.getScenes(true).map(s => s.sys.settings.key), attrs: gl ? gl.getContextAttributes() : null, canvas: [OTR.game.canvas.width, OTR.game.canvas.height, OTR.game.canvas.style.width, OTR.game.canvas.style.height] };
})()
