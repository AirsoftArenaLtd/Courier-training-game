/*
 * Morning stand-up at the station: weather, the manifest, and the safety topic of the day.
 * Ends by sending the courier to the pre-trip walkaround.
 */
class ShiftBriefScene extends Phaser.Scene {
  constructor() { super('ShiftBriefScene'); }

  create() {
    const st = OTR.shift.state;
    if (!st) { this.scene.start('HubScene'); return; }
    OTR.fx.enter(this);
    this.st = st;
    this._ended = false;              // the scene object is reused from day to day

    const I = OTR.scenery.interior(this, { kind: 'lobby', sign: 'DISPATCH', accent: 0x4D148C, w: 1600, counterX: 1040 });
    const offX = 760 - I.layout.counterX, top = OTR.H - I.layout.h;
    this.add.image(offX, top, I.key).setOrigin(0, 0).setDepth(-10);
    this.add.image(offX, top, I.frontKey).setOrigin(0, 0).setDepth(27);
    const counterX = offX + I.layout.counterX;

    this.dispatcher = OTR.rig.person(this, counterX + 190, OTR.H - 6, { skin: 0xC98E6B, hair: 0x3A2418, hairStyle: 'short', shirt: 0x4D148C, uniform: true, sleeves: 'long' }, { scale: 0.78, facing: -1, depth: 29 });
    // at the counter, clear of the manifest board (at counterX - 360 the courier stood behind it)
    this.me = OTR.rig.person(this, counterX - 170, OTR.H - 4, OTR.hub.playerSpec, { scale: 0.8, facing: 1, depth: 30 });

    this.buildBoard();
    this.atmos = OTR.atmos.apply(this, { tod: 'morning', weather: 'clear', depth: 700, vignette: true });

    // ESC and the corner button pause like everywhere else, with a way back to the station (the briefing is saved
    // as the day's first part, so the hub offers to resume it)
    OTR.onKey(this, 'keydown-ESC', () => this.openPause());
    OTR.pauseOnBlur(this, () => this.openPause());

    const brief = OTR_DATA.briefs[(st.day - 1) % OTR_DATA.briefs.length];
    this.time.delayedCall(700, () => this.runBrief(brief));
  }

  buildBoard() {
    const st = this.st;
    const W = OTR.W;
    OTR.tex.shape(this, (g) => {
      g.fillStyle(0x16062B, 0.9); g.fillRect(0, 0, W, 60);
      g.fillStyle(0xFF6600, 1); g.fillRect(0, 60, W, 3);
    }).setDepth(40);
    OTR.ui.iconButton(this, 32, 30, 'ic_pause', () => this.openPause(), { size: 40, skin: 'dark' }).setDepth(41);
    OTR.txt(this, 64, 30, `DAY ${st.day} · MORNING BRIEFING`, 22, '#ffffff', { ox: 0, weight: '900' }).setDepth(41);
    OTR.txt(this, W - 24, 30, OTR.shift.clockStr(), 20, '#FFC83D', { ox: 1, weight: '900' }).setDepth(41);

    // manifest board on the left
    const bx = 250, by = 330;
    this.add.image(bx, by, OTR.tex.panel(this, 400, 420, { top: 0x2A0F4F, bottom: 0x1A0733, border: 0x6A45A0, radius: 18 })).setDepth(40);
    const lines = [
      ['ROUTE', `${st.route.length} stops`],
      ['WEATHER', { clear: 'Clear', cloudy: 'Overcast', rain: 'Rain', storm: 'Storms', snow: 'Snow and ice', heat: 'Extreme heat (102°F)' }[st.weather] || st.weather],
      ['START', OTR.shift.clockStr()],
      ['TRUCK', 'P-1000, bay 3']
    ];
    OTR.txt(this, bx, by - 175, 'TODAY\'S MANIFEST', 17, '#FF9447', { weight: '900' }).setDepth(41);
    lines.forEach(([k, v], i) => {
      OTR.txt(this, bx - 160, by - 124 + i * 42, k, 12, '#C9B3F0', { ox: 0 }).setDepth(41);
      OTR.txt(this, bx - 160, by - 104 + i * 42, v, 18, '#ffffff', { ox: 0, weight: '900' }).setDepth(41);
    });
    // the stop list keeps clear of the board's bottom edge (the fifth stop used to sit on it)
    const y = by + 58;
    OTR.txt(this, bx - 160, y, 'STOPS', 12, '#C9B3F0', { ox: 0 }).setDepth(41);
    st.route.forEach((r, i) => {
      const s = r.stop.packages[0];
      OTR.txt(this, bx - 160, y + 23 + i * 23, `${i + 1}. ${s.number} ${s.street}`, 15, '#F3ECFF', { ox: 0, bold: false }).setDepth(41);
    });
  }

  // the briefing has nothing to restart: Resume, or back to the station
  restartOptions() { return []; }

  openPause() {
    if (this.scene.isPaused() || this._ended) return;
    if (this.input.keyboard) this.input.keyboard.resetKeys();
    this.scene.launch('PauseScene', { parent: this.sys.settings.key, title: 'Morning briefing' });
    this.scene.bringToTop('PauseScene');
    this.scene.pause();
  }

  runBrief(brief) {
    this.talkCtl = OTR.talk.run(this, brief.talk, {
      cast: { dispatch: { name: 'Dispatch', color: 0x4D148C, rig: this.dispatcher } },
      courier: { rig: this.me, name: OTR.save.data.profile ? OTR.save.displayName() : 'You' },
      log: OTR.ScoreLog.from(this.st.log), cats: OTR.scoring.CATS, feedback: 'immediate',
      // the answers sit right of the manifest board (x 50-450), not over its stop list
      depth: 3000, choiceX: 855, choiceWidth: 760,
      onEnd: (node, ctl) => {
        this.st.log = ctl.o.log.toJSON();
        OTR.save.write();
        this._ended = true;
        this.time.delayedCall(400, () => OTR.shift.setPhase(this, 'pretrip'));
      }
    });
  }
}
OTR.registerScene(ShiftBriefScene);
