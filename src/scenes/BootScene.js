class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }

  create() {
    OTR.tex.boot(this);
    OTR.save.load();
    OTR.audio.muted = OTR.save.data.settings.muted;
    OTR.audio.volume = OTR.save.data.settings.volume;

    if (OTR.flow.dev) {
      const errors = OTR.validate.all(OTR_DATA, Object.keys(this.scene.manager.keys));
      if (errors.length) errors.forEach(e => console.warn('[OTR data]', e));
      else console.log('[OTR data] content validated OK');
    }

    const lab = new URLSearchParams(window.location.search).get('lab');
    if (lab) { OTR.save.ephemeral = true; this.scene.start('LabScene', { which: lab }); return; }

    const testId = OTR.flow.testId;
    const sc = testId && OTR.registry.get(testId);
    if (sc && this.scene.manager.keys[sc.scene]) {
      // Standalone scenario test: throwaway profile, nothing is persisted.
      OTR.save.ephemeral = true;
      if (!OTR.save.hasProfile()) OTR.save.data.profile = { name: 'Tester', createdAt: Date.now() };
      this.scene.start(sc.scene, { scenarioId: testId });
      return;
    }
    if (testId) console.warn('[OTR] Unknown scenario for ?scenario=' + testId);
    this.scene.start('TitleScene');
  }
}
OTR.registerScene(BootScene);
