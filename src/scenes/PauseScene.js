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

    // Restart starts the scene again exactly as it was started (a route-day stop stays that stop, the drive keeps its
    // route). A scene can offer more than one restart, each saying what it restarts (stop 2 of a practice set:
    // "Restart this stop" and "Restart the set").
    const restarts = parent.restartOptions ? parent.restartOptions() : [{ label: 'Restart', data: parent.initData || { scenarioId: parent.scenarioId } }];
    const rows = 2 + restarts.length;
    const ph = 250 + rows * 72;              // ends a little below the mute button, however many rows
    const top = -ph / 2;
    const box = this.add.container(OTR.W / 2, OTR.H / 2);
    box.add(OTR.ui.panel(this, 0, 0, 440, ph, { top: 0xFFFFFF, bottom: 0xF1EAFB, border: 0xC9B3F0, radius: 24 }));
    box.add(OTR.txt(this, 0, top + 52, 'PAUSED', 40, '#4D148C', { weight: '900' }));
    box.add(OTR.txt(this, 0, top + 92, this.title, 18, '#7A6A90', { bold: false }));

    const resume = () => {
      this.scene.resume(this.parentKey);
      this.scene.stop();
    };
    let y = top + 164;
    box.add(OTR.ui.button(this, 0, y, 'Resume', resume, { w: 300, h: 58, skin: 'orange', key: 'ESC' }));
    restarts.forEach(r => {
      y += 72;
      box.add(OTR.ui.button(this, 0, y, r.label, () => {
        this.scene.stop();
        parent.scene.restart(typeof r.data === 'function' ? r.data() : r.data);
      }, { w: 300, h: 58, skin: 'purple', fontSize: r.label.length > 12 ? 20 : undefined }));
    });
    y += 72;
    box.add(OTR.ui.button(this, 0, y, 'Quit to the station', () => {
      this.scene.resume(this.parentKey);
      this.scene.stop();
      OTR.fx.transition(parent, 'HubScene');
    }, { w: 300, h: 58, skin: 'ghost', fontSize: 20 }));
    box.add(OTR.ui.muteButton(this, 0, y + 80));

    box.setScale(0.85).setAlpha(0);
    this.tweens.add({ targets: box, scale: 1, alpha: 1, duration: 240, ease: 'Back.out' });
    OTR.audio.play('pop');
  }
}
OTR.registerScene(PauseScene);
