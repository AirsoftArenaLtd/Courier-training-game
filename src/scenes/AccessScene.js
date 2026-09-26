/*
 * Settings → Accessibility: larger text, the colour-blind filter, narration, and the controls (press Change, then
 * the new key). Saved with the trainee's progress, so they follow them to any PC.
 */
class AccessScene extends Phaser.Scene {
  constructor() { super('AccessScene'); }

  create() {
    const W = OTR.W, H = OTR.H;
    OTR.fx.enter(this);
    this.add.image(W / 2, H / 2, OTR.tex.bg(this, 'access_bg', [[0, '#2A0C52'], [1, '#12041F']]));
    OTR.tex.shape(this, (g) => { g.fillStyle(0x16062B, 0.9); g.fillRect(0, 0, W, 64); g.fillStyle(0xFF6600, 1); g.fillRect(0, 64, W, 3); });
    OTR.txt(this, 24, 32, 'ACCESSIBILITY', 24, '#ffffff', { ox: 0, weight: '900' });
    this.focusables = [OTR.ui.button(this, W - 90, 32, 'Done', () => { OTR.a11y.capturing = false; OTR.fx.transition(this, 'HubScene'); }, { w: 150, h: 44, skin: 'ghost', fontSize: 18, key: 'ESC', hint: 'ESC' })];
    const A = OTR.a11y.settings();

    // --- display and sound
    const x = 34, top = 90, w = 430, h = 604;
    this.add.image(x + w / 2, top + h / 2, OTR.tex.panel(this, w, h, { top: 0xFFFFFF, bottom: 0xF1EAFB, border: 0xC9B3F0, radius: 20 }));
    OTR.txt(this, x + 26, top + 32, 'SEEING AND HEARING', 15, '#FF6600', { ox: 0, weight: '900' });
    const toggle = (y, key, title, desc, after) => {
      OTR.txt(this, x + 26, y, title, 18, '#250849', { ox: 0, weight: '900' });
      OTR.txt(this, x + 26, y + 26, desc, 14, '#5A4A70', { ox: 0, oy: 0, bold: false, wrap: w - 170 });
      const b = OTR.ui.button(this, x + w - 72, y + 14, A[key] ? 'On' : 'Off', () => {
        A[key] = !A[key]; OTR.a11y.save();
        b.setLabel(A[key] ? 'On' : 'Off'); b.setSkin(A[key] ? 'green' : 'ghost');
        if (after) after(A[key]);
      }, { w: 100, h: 44, skin: A[key] ? 'green' : 'ghost', fontSize: 17 });
      this.focusables.push(b);
    };
    toggle(top + 84, 'large', 'Larger text', 'Small print across the academy gets bigger. Takes effect on the next screen.', () => this.scene.restart());
    toggle(top + 214, 'colour', 'Color-blind filter', 'Shifts reds and greens apart (pass and fail, lights, map pins) for red-green color blindness.', () => OTR.a11y.applyColour(this));
    toggle(top + 344, 'narrate', 'Read cards aloud', 'Briefs, instructions and results are read out by the computer\'s voice.', (on) => { if (on) OTR.a11y.say('Cards will be read aloud.'); else OTR.a11y.hush(); });
    OTR.txt(this, x + 26, top + 486, 'Sound volume and the route-day checklist\nare in Settings.', 14, '#7A6A90', { ox: 0, oy: 0, bold: false });

    // --- controls
    const cx = 484, cw = 762;
    this.add.image(cx + cw / 2, top + h / 2, OTR.tex.panel(this, cw, h, { top: 0xFFFFFF, bottom: 0xF1EAFB, border: 0xC9B3F0, radius: 20 }));
    OTR.txt(this, cx + 26, top + 32, 'CONTROLS', 15, '#FF6600', { ox: 0, weight: '900' });
    this.status = OTR.txt(this, cx + cw - 26, top + 32, '', 14, '#B26A00', { ox: 1, weight: '900' });
    this.keyTexts = {};
    OTR.a11y.ACTIONS.forEach((a, i) => {
      const per = Math.ceil(OTR.a11y.ACTIONS.length / 2);
      const col = i < per ? 0 : 1, row = i % per;
      const rx = cx + 26 + col * 370, ry = top + 76 + row * 56;
      OTR.txt(this, rx, ry, a.label, 15, '#250849', { ox: 0, weight: '900' });
      this.keyTexts[a.code] = OTR.txt(this, rx + 190, ry, '', 16, '#4D148C', { ox: 0.5, weight: '900' });
      const b = OTR.ui.button(this, rx + 290, ry, 'Change', () => this.rebind(a), { w: 110, h: 40, skin: 'ghost', fontSize: 15 });
      this.focusables.push(b);
    });
    this.focusables.push(OTR.ui.button(this, cx + cw / 2, top + h - 44, 'Reset controls', () => { A.keys = {}; OTR.a11y.save(); this.refresh(); OTR.audio.play('pop'); }, { w: 240, h: 48, skin: 'purple', fontSize: 17 }));
    OTR.txt(this, cx + cw / 2, top + h - 96, 'Arrow keys still steer and walk; ENTER and ESC always work.', 14, '#7A6A90', { bold: false });
    this.refresh();
    OTR.ui.focus(this, this.focusables, { start: 0 });
  }

  refresh() {
    OTR.a11y.ACTIONS.forEach(a => {
      const k = OTR.a11y.physical(a.code);
      this.keyTexts[a.code].setText(OTR.a11y.label(k)).setColor(k !== a.code ? '#B26A00' : '#4D148C');
    });
  }

  /** The next key pressed becomes this action's key (ESC cancels). A key already used by another action swaps. */
  rebind(a) {
    const A = OTR.a11y.settings();
    this.status.setText(`Press the new key for: ${a.label}  (ESC cancels)`);
    OTR.a11y.capturing = true;
    const onKey = (e) => {
      e.preventDefault(); e.stopImmediatePropagation();
      window.removeEventListener('keydown', onKey, true);
      OTR.a11y.capturing = false;
      if (e.code === 'Escape' || e.code === 'Enter') { this.status.setText(''); return; }
      const keys = A.keys;
      // whichever action had this key takes the key this action is giving up
      const old = OTR.a11y.physical(a.code);
      OTR.a11y.ACTIONS.forEach(b => { if (b.code !== a.code && OTR.a11y.physical(b.code) === e.code) keys[b.code] = old; });
      keys[a.code] = e.code;
      Object.keys(keys).forEach(k => { if (keys[k] === k) delete keys[k]; });
      OTR.a11y.save();
      OTR.audio.play('pop');
      this.status.setText(`${a.label}: ${OTR.a11y.label(e.code)}`);
      this.refresh();
    };
    window.addEventListener('keydown', onKey, true);
    this.events.once('shutdown', () => { window.removeEventListener('keydown', onKey, true); OTR.a11y.capturing = false; });
  }
}
OTR.registerScene(AccessScene);
