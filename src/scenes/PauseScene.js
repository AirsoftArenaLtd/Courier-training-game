class PauseScene extends Phaser.Scene {
  constructor() { super('PauseScene'); }

  init(data) {
    this.parentKey = data.parent;
    this.title = data.title || 'Paused';
  }

  create() {
    const parent = this.scene.get(this.parentKey);
    const dim = this.add.rectangle(OTR.W / 2, OTR.H / 2, OTR.W, OTR.H, 0x0B0418, 0).setInteractive();
    this.tweens.add({ targets: dim, fillAlpha: 0.7, duration: 200 });

    const box = this.add.container(OTR.W / 2, OTR.H / 2);
    box.add(OTR.ui.panel(this, 0, 0, 440, 440, { top: 0xFFFFFF, bottom: 0xF1EAFB, border: 0xC9B3F0, radius: 24 }));
    box.add(OTR.txt(this, 0, -168, 'PAUSED', 40, '#4D148C', { weight: '900' }));
    box.add(OTR.txt(this, 0, -128, this.title, 18, '#7A6A90', { bold: false }));

    const resume = () => {
      this.scene.resume(this.parentKey);
      this.scene.stop();
    };
    box.add(OTR.ui.button(this, 0, -56, 'Resume', resume, { w: 280, h: 58, skin: 'orange', key: 'ESC' }));
    box.add(OTR.ui.button(this, 0, 16, 'Restart', () => {
      this.scene.stop();
      // start it again exactly as it was started: a route-day stop stays that stop (it used to become the first
      // practice stop set), the drive keeps its route, and stop 2 of a set restarts stop 2
      parent.scene.restart(parent.initData || { scenarioId: parent.scenarioId });
    }, { w: 280, h: 58, skin: 'purple' }));
    box.add(OTR.ui.button(this, 0, 88, 'Quit to Shift Board', () => {
      this.scene.resume(this.parentKey);
      this.scene.stop();
      OTR.fx.transition(parent, 'HubScene');
    }, { w: 280, h: 58, skin: 'ghost', fontSize: 20 }));
    box.add(OTR.ui.muteButton(this, 0, 168));

    box.setScale(0.85).setAlpha(0);
    this.tweens.add({ targets: box, scale: 1, alpha: 1, duration: 240, ease: 'Back.out' });
    OTR.audio.play('pop');
  }
}
OTR.registerScene(PauseScene);
