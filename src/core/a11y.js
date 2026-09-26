/*
 * Accessibility and comfort settings (Settings → Accessibility), kept with the trainee's save:
 *   keys     remapped controls: the game still hears its own keys, so every scene works unchanged. A capture-phase
 *            listener swaps a remapped key's events for the key the game expects.
 *   large    larger small text (every OTR.txt under 19 px gets a little bigger)
 *   colour   a colour-blind filter on every camera: red/green differences moved into blue (daltonised, for the
 *            commonest red-green deficiency), so pass/fail, lights and pins read apart
 *   narrate  cards read aloud (the browser's own speech)
 */
window.OTR = window.OTR || {};

OTR.a11y = {
  /** The controls a trainee can move: the game's own key for each. */
  ACTIONS: [
    { code: 'KeyW', label: 'Accelerate / straighten up' },
    { code: 'KeyS', label: 'Brake / reverse / bend knees' },
    { code: 'KeyA', label: 'Steer or walk left' },
    { code: 'KeyD', label: 'Steer or walk right' },
    { code: 'KeyE', label: 'Interact' },
    { code: 'Tab', label: 'Handheld' },
    { code: 'ShiftLeft', label: 'Walk carefully' },
    { code: 'Space', label: 'Parking brake / scan / grip' },
    { code: 'KeyM', label: 'Check mirrors' },
    { code: 'KeyB', label: 'Seatbelt' },
    { code: 'KeyL', label: 'Headlights' },
    { code: 'KeyG', label: 'Get out and look' },
    { code: 'KeyP', label: 'Park' },
    { code: 'KeyR', label: 'Reverse gear' }
  ],

  settings() {
    const s = OTR.save.data && OTR.save.data.settings;
    if (!s) return { keys: {}, large: false, colour: false, narrate: false };
    s.a11y = s.a11y || { keys: {}, large: false, colour: false, narrate: false };
    return s.a11y;
  },
  save() { OTR.save.write(); },

  get large() { return !!(OTR.save.data && OTR.save.data.settings && OTR.save.data.settings.a11y && OTR.save.data.settings.a11y.large); },

  /* ------------------------------------------------------------------ keys */
  keyCodeOf(code) {
    if (/^Key[A-Z]$/.test(code)) return code.charCodeAt(3);
    if (/^Digit\d$/.test(code)) return 48 + Number(code[5]);
    return { Space: 32, Tab: 9, ShiftLeft: 16, ShiftRight: 16, Enter: 13, Escape: 27, ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40, ControlLeft: 17, AltLeft: 18 }[code] || 0;
  },
  keyOf(code) {
    if (/^Key[A-Z]$/.test(code)) return code[3].toLowerCase();
    if (/^Digit\d$/.test(code)) return code[5];
    return { Space: ' ', Tab: 'Tab', ShiftLeft: 'Shift', ShiftRight: 'Shift', Enter: 'Enter', Escape: 'Escape', ArrowLeft: 'ArrowLeft', ArrowUp: 'ArrowUp', ArrowRight: 'ArrowRight', ArrowDown: 'ArrowDown' }[code] || code;
  },
  label(code) {
    if (/^Key[A-Z]$/.test(code)) return code[3];
    if (/^Digit\d$/.test(code)) return code[5];
    return { Space: 'SPACE', Tab: 'TAB', ShiftLeft: 'SHIFT', ShiftRight: 'R-SHIFT', ArrowLeft: '←', ArrowUp: '↑', ArrowRight: '→', ArrowDown: '↓', ControlLeft: 'CTRL', AltLeft: 'ALT', Semicolon: ';', Quote: '\'', Comma: ',', Period: '.', Slash: '/' }[code] || code;
  },
  /** The key a trainee presses for a game key (its own key unless remapped). */
  physical(code) { return this.settings().keys[code] || code; },

  /** Install once at boot: remapped keys are handed on as the game's own. */
  installKeys() {
    if (this._keysOn) return;
    this._keysOn = true;
    const swap = (e) => {
      if (e.__otr || this.capturing) return;
      const keys = this.settings().keys;
      // the physical key pressed → the game key it stands for
      let game = null;
      Object.keys(keys).forEach(g => { if (keys[g] === e.code) game = g; });
      // a game key whose own physical key now means something else is ignored (so it can't double up)
      const own = keys[e.code] && keys[e.code] !== e.code && !game;
      if (!game && !own) return;
      e.stopImmediatePropagation(); e.preventDefault();
      if (!game) return;
      const ev = new KeyboardEvent(e.type, { code: game, key: this.keyOf(game), bubbles: true, cancelable: true, repeat: e.repeat, shiftKey: e.shiftKey });
      Object.defineProperty(ev, 'keyCode', { get: () => this.keyCodeOf(game) });
      Object.defineProperty(ev, 'which', { get: () => this.keyCodeOf(game) });
      ev.__otr = true;
      window.dispatchEvent(ev);
    };
    window.addEventListener('keydown', swap, true);
    window.addEventListener('keyup', swap, true);
  },

  /* ------------------------------------------------------------------ text, colour, voice */
  /** OTR.txt's size, larger for small text when asked. */
  size(n) {
    if (!this.large) return n;
    return n <= 13 ? n + 3 : n <= 15 ? n + 2 : n <= 18 ? n + 1 : n;
  },

  /** Every camera of a scene gets the colour filter (WebGL only). */
  applyColour(scene) {
    const on = this.settings().colour;
    if (!scene.cameras || !scene.sys.game.renderer || scene.sys.game.renderer.type !== Phaser.WEBGL) return;
    scene.cameras.cameras.forEach(cam => {
      if (!cam.postFX) return;
      if (cam._otrCb) { cam.postFX.remove(cam._otrCb); cam._otrCb = null; }
      if (!on) return;
      const cm = cam.postFX.addColorMatrix();
      cm.set([1, 0, 0, 0, 0, -0.4375, 1.4375, 0, 0, 0, 0.2625, -0.5625, 1.3, 0, 0, 0, 0, 0, 1, 0]);
      cam._otrCb = cm;
    });
  },

  say(text) {
    if (!this.settings().narrate || !window.speechSynthesis || !text) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(String(text).replace(/[★☆✓✕▶⏎›•]/g, ' '));
      u.rate = 1; u.volume = Math.max(0.2, (OTR.audio && OTR.audio.volume) || 0.6);
      window.speechSynthesis.speak(u);
    } catch (e) { /* no voice on this machine */ }
  },
  hush() { try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (e) { /* ignore */ } }
};
