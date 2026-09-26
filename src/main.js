/* Boot the game. URL options: ?scenario=<id> to test one scenario, ?dev=1 for validation + debug helpers. */
(function () {
  const params = new URLSearchParams(window.location.search);
  OTR.flow.testId = params.get('scenario');
  OTR.flow.dev = params.has('dev');

  // who is training decides whose progress loads: sign-in (LMS, company server or launch link) first, then boot
  OTR.identity.resolve().then(() => Promise.all([OTR.save.preload(), OTR.academy.load()])).then(boot, boot);
  function boot() {
    if (OTR.game) return;
    OTR.game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: 'game',
      width: OTR.W,
      height: OTR.H,
      backgroundColor: '#16062b',
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
      },
      // Tuned for integrated graphics, where every scene is limited by pixels filled, not by the CPU:
      // antialiasGL off drops the 4x multisampled back buffer (smooth texture filtering stays on, and shapes that need
      // smooth edges are drawn into canvas textures); maxTextures 1 swaps the 16-way texture shader, slow per pixel on
      // Intel, for a single-texture one. powerPreference asks for the faster GPU where the browser lets a page choose.
      render: { antialias: true, antialiasGL: false, maxTextures: 1, powerPreference: 'high-performance' },
      disableContextMenu: true,
      scene: OTR.scenes
    });
  }

  // Browsers only allow audio after a user gesture.
  const unlock = () => OTR.audio.init();
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);

  // Debug helpers (console): OTR.debug.start('m2-sort'), OTR.debug.finishNow(0.95)
  OTR.debug = {
    activeScene() {
      return OTR.game.scene.getScenes(true).filter(s => s.sys.settings.key !== 'PauseScene').pop();
    },
    start(id) {
      const s = OTR.debug.activeScene();
      if (s) OTR.flow.startScenario(s, id);
    },
    finishNow(ratio) {
      const s = OTR.debug.activeScene();
      if (!s || !s.scenario) return 'No scenario running';
      const r = ratio === undefined ? 1 : ratio;
      const ratios = {};
      s.scenario.categories.forEach(c => { ratios[c] = r; });
      s.finish({ score: Math.round(1000 * r), ratios, lessons: ['(debug finish)'] }, 0);
      return 'ok';
    },
    validate() {
      return OTR.validate.all(OTR_DATA, Object.keys(OTR.game.scene.keys));
    }
  };
})();
