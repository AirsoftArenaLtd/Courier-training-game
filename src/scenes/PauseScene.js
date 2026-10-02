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
    // an assessment is one attempt: no restarting it
    const assessing = !!OTR.academy.assessing;
    const restarts = assessing ? [] : parent.restartOptions ? parent.restartOptions() : [{ label: 'Restart', data: parent.initData || { scenarioId: parent.scenarioId } }];
    // the scenario's controls, to look up mid-run (SHELL-12): the scene's own, its scenario's, or those of the
    // practice scenario played in the same scene (a route-day stop)
    const sameScene = OTR.registry.all().find(s => s.scene === this.parentKey);
    const controls = parent.pauseControls || (parent.scenario && parent.scenario.controls) || (sameScene && sameScene.controls) || null;
    const rows = 2 + restarts.length + (controls ? 1 : 0);
    const ph = 222 + rows * 72;              // ends a little below the mute button, however many rows
    const top = -ph / 2;
    const box = this.add.container(OTR.W / 2, OTR.H / 2);
    box.add(OTR.ui.panel(this, 0, 0, 440, ph, { top: 0xFFFFFF, bottom: 0xF1EAFB, border: 0xC9B3F0, radius: 24 }));
    box.add(OTR.txt(this, 0, top + 52, 'PAUSED', 40, '#4D148C', { weight: '900' }));
    box.add(OTR.txt(this, 0, top + 92, (assessing ? 'Assessment · ' : '') + this.title, 18, assessing ? '#B26A00' : '#7A6A90', { bold: assessing }));

    const resume = () => {
      this.scene.resume(this.parentKey);
      this.scene.stop();
    };
    // Restart and Quit throw the run away, so they ask first; each has its key, shown on the button (SHELL-6, SHELL-11)
    const confirmThen = (title, body, yes, go) => OTR.ui.confirm(this, title, body, go, { yes, danger: true, key: 'ENTER', hint: '⏎' });
    const items = [];
    let y = top + 164;
    items.push(OTR.ui.button(this, 0, y, 'Resume', resume, { w: 300, h: 58, skin: 'orange', key: 'ESC', hint: 'ESC' }));
    if (controls) {
      y += 72;
      items.push(OTR.ui.button(this, 0, y, 'Controls', () => {
        // one control a line, the card as tall as the list
        const lines = controls.split(' · ').join('\n');
        const t = OTR.txt(this, 0, 0, lines, 19, '#000', { bold: false, align: 'center', wrap: 560, lineSpacing: 4 });
        const h = Math.min(OTR.H - 40, 44 + 22 + 26 + t.height + 30 + 77);
        t.destroy();
        OTR.ui.modal(this, {
          title: 'Controls', body: lines, w: 640, h, escClose: true,
          buttons: [{ label: 'Back', skin: 'orange', key: ['ENTER', 'SPACE'], hint: '⏎' }]
        });
      }, { w: 300, h: 58, skin: 'purple', fontSize: 20, key: 'C', hint: 'C' }));
    }
    restarts.forEach((r, i) => {
      y += 72;
      items.push(OTR.ui.button(this, 0, y, r.label, () => confirmThen(`${r.label}?`,
        'Everything since it started is lost and it begins again from the start.', 'Restart', () => {
          this.scene.stop();
          parent.scene.restart(typeof r.data === 'function' ? r.data() : r.data);
        }), { w: 300, h: 58, skin: 'purple', fontSize: r.label.length > 12 ? 20 : undefined, key: i === 0 ? 'R' : undefined, hint: i === 0 ? 'R' : undefined }));
    });
    y += 72;
    // a route day is saved as it goes, so leaving it loses nothing but the part in progress
    const quitBody = assessing ? 'This is an assessment: quitting uses your attempt, and it counts as not passed.'
      : parent.shiftMode || this.parentKey === 'ShiftBriefScene' || this.parentKey === 'TownDriveScene'
        ? 'The route day is kept: the station offers to resume it. The part you are in starts again.'
        : 'This run is not scored, and what you have done in it is lost.';
    items.push(OTR.ui.button(this, 0, y, 'Quit to the station', () => confirmThen('Quit to the station?', quitBody, 'Quit', () => {
      this.scene.resume(this.parentKey);
      this.scene.stop();
      OTR.academy.abandon();
      OTR.fx.transition(parent, 'HubScene');
    }), { w: 300, h: 58, skin: 'ghost', fontSize: 20, key: 'Q', hint: 'Q' }));
    items.push(OTR.ui.muteButton(this, 0, y + 80));
    box.add(items);
    OTR.ui.focus(this, items, { start: 0 });

    box.setScale(0.85).setAlpha(0);
    this.tweens.add({ targets: box, scale: 1, alpha: 1, duration: 240, ease: 'Back.out' });
    OTR.audio.play('pop');
  }
}
OTR.registerScene(PauseScene);
