/*
 * Shared base for every playable scenario: HUD bar, pause handling, finish() contract.
 * Subclasses call this.setupBase() at the top of create().
 */
class BaseScenarioScene extends Phaser.Scene {
  init(data) {
    data = data || {};
    this.initData = data;                          // what the pause menu's Restart starts the scene with again
    const fallback = OTR.registry.all().find(s => s.scene === this.sys.settings.key);
    // A route-day stop is not a practice scenario: it must not borrow the first one that uses the same scene (it
    // used to become m5-pod, taking that module's title and hiding every safety check from its stop reports).
    this.scenarioId = data.scenarioId || (data.shift ? null : fallback && fallback.id);
    this.scenario = OTR.registry.get(this.scenarioId);
    this.content = data.content || (this.scenario ? OTR.registry.content(this.scenario) : null);
    this.shiftMode = !!data.shift;
    this.finished = false;
    this._leaving = false;
    this._openModals = 0;
    this.score = 0;
  }

  setupBase() {
    OTR.fx.enter(this);
    OTR.onKey(this, 'keydown-ESC', () => this.openPause());
  }

  /** Top HUD bar. o: { score: bool, timer: bool, title } */
  hud(o) {
    o = o || {};
    const bar = this.add.container(0, 0).setDepth(800).setScrollFactor(0);
    bar.add(OTR.tex.shape(this, (g) => {
      g.fillStyle(0x16062B, 0.82);
      g.fillRect(0, 0, OTR.W, 56);
      g.fillStyle(0xFF6600, 1);
      g.fillRect(0, 56, OTR.W, 3);
    }));
    bar.add(OTR.ui.iconButton(this, 32, 28, 'ic_pause', () => this.openPause(), { size: 40, skin: 'dark' }));
    const mod = OTR.registry.moduleOf(this.scenarioId);
    bar.add(OTR.txt(this, 64, 19, (mod ? mod.title.toUpperCase() : this.shiftMode ? 'TODAY\'S ROUTE' : ''), 12, '#C9B3F0', { ox: 0 }));
    bar.add(OTR.txt(this, 64, 38, o.title || (this.scenario ? this.scenario.title : ''), 20, '#ffffff', { ox: 0, weight: '900' }));
    if (o.score !== false) {
      bar.add(OTR.txt(this, OTR.W - 24, 17, 'SCORE', 12, '#C9B3F0', { ox: 1 }));
      this.scoreText = OTR.txt(this, OTR.W - 24, 38, '0', 24, '#FFC83D', { ox: 1, weight: '900' });
      bar.add(this.scoreText);
    }
    if (o.timer) {
      this.timerText = OTR.txt(this, OTR.W / 2, 28, '0:00', 26, '#ffffff', { weight: '900' });
      bar.add(OTR.ui.panel(this, OTR.W / 2, 28, 120, 40, { top: 0x2A0F4F, bottom: 0x1A0733, border: 0x7B3FC4, borderWidth: 2, radius: 12, shadow: false }));
      bar.add(this.timerText);
    }
    this.hudBar = bar;
    return bar;
  }

  addScore(n, x, y) {
    this.score = Math.max(0, this.score + n);
    if (this.scoreText) {
      this.scoreText.setText(String(Math.round(this.score)));
      OTR.fx.pop(this, this.scoreText, 1.25);
    }
    if (x !== undefined) {
      OTR.fx.floatText(this, x, y, (n >= 0 ? '+' : '') + n, n >= 0 ? '#FFC83D' : '#FF6B7F', { size: 26 });
    }
  }

  setTimer(sec, warn) {
    if (!this.timerText) return;
    this.timerText.setText(OTR.util.formatTime(sec));
    this.timerText.setColor(warn ? '#FF6B7F' : '#ffffff');
  }

  openPause() {
    if (this.finished || this._leaving || this.scene.isPaused() || this._openModals > 0) return;
    if (this.input.keyboard) this.input.keyboard.resetKeys();
    // A drag in progress ends here: the button is released while the scene is paused, Phaser never hears it, and
    // the package used to stay glued to the cursor after Resume. Each game puts it back (cancelDrag).
    if (this.cancelDrag) this.cancelDrag();
    this.input.manager.pointers.forEach(ptr => { if (ptr) this.input.setDragState(ptr, 0); });
    this.scene.launch('PauseScene', { parent: this.sys.settings.key, title: this.scenario ? this.scenario.title : this.shiftMode ? 'Today\'s route' : '' });
    this.scene.bringToTop('PauseScene');
    this.scene.pause();
  }

  /** Intro card with how-to-play; calls onStart when dismissed. */
  introCard(title, lines, onStart, o) {
    o = o || {};
    const modal = OTR.ui.modal(this, {
      title,
      w: o.w || 700, h: o.h || 420,
      build: (box, api, w, h) => {
        let y = -h / 2 + 100;
        lines.forEach((line) => {
          const dot = this.add.image(-w / 2 + 60, y + 12, 'ic_arrow').setDisplaySize(20, 20).setTint(0xFF6600);
          const t = OTR.txt(this, -w / 2 + 82, y, line, 19, '#3A2A50', { ox: 0, oy: 0, bold: false, wrap: w - 140, lineSpacing: 3 });
          box.add([dot, t]);
          y += t.height + 14;
        });
      },
      // the card is the first thing a new part shows: Enter presses still arriving from the part before (people mash
      // through the text) are ignored for a moment, or the how-to is gone before it is read
      buttons: [{ label: o.button || 'Start!', skin: 'orange', key: ['ENTER', 'SPACE'], keyAfter: 600, onClick: onStart }]
    });
    return modal;
  }

  /** Finish the scenario: result = { score, ratios, lessons, stats } */
  finish(result, delay) {
    if (this.finished) return;
    this.finished = true;
    result.score = result.score !== undefined ? result.score : this.score;
    this.time.delayedCall(delay === undefined ? 700 : delay, () => OTR.flow.complete(this, this.scenarioId, result));
  }
}
