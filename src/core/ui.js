/* Reusable UI widgets. */
window.OTR = window.OTR || {};

OTR.ui = {
  /** True when obj sits (at any depth) inside the container root. */
  isInside(obj, root) {
    for (let p = obj; p; p = p.parentContainer) if (p === root) return true;
    return false;
  },

  /**
   * Gradient button. o: w, h, skin, fontSize, icon, iconSize, sound, key (Phaser key name), hint (a key cap drawn on
   * the button's right end, naming the key that presses it: 'R', '⏎', 'ESC')
   */
  button(scene, x, y, label, onClick, o) {
    o = o || {};
    const w = o.w || 240, h = o.h || 58;
    const skin = o.skin || 'orange';
    const M = OTR.tex.M;
    const c = scene.add.container(x, y);
    const bg = scene.add.image(0, 0, OTR.tex.button(scene, w, h, skin)).setScrollFactor(0);
    bg.setInteractive({ hitArea: new Phaser.Geom.Rectangle(M, M, w, h), hitAreaCallback: Phaser.Geom.Rectangle.Contains, useHandCursor: true });
    c.add(bg);
    const skinDef = OTR.tex.buttonSkins[skin] || OTR.tex.buttonSkins.orange;
    let tx = 0;
    if (o.icon) {
      const is = o.iconSize || Math.round(h * 0.45);
      const ic = scene.add.image(label ? -w / 2 + 16 + is / 2 : 0, 0, o.icon).setDisplaySize(is, is);
      ic.setTint(Phaser.Display.Color.HexStringToColor(skinDef.text).color);
      c.add(ic);
      c.icon = ic;
      tx = label ? 14 : 0;
    }
    let capW = 0;
    if (o.hint && label) {
      const cap = OTR.ui.keyCap(scene, 0, 0, o.hint, { size: 12, bg: skin === 'ghost' ? 0xEFE7FA : 0xFFFFFF });
      capW = cap.capW;
      cap.x = w / 2 - 12 - capW / 2;
      c.add(cap);
      c.hintCap = cap;
      tx -= (capW + 8) / 2;                     // the label is centred in what the cap leaves
    }
    // with a key cap the label stays on one line and shrinks a little if it has to (wrapped, it ran under the cap)
    const t = OTR.txt(scene, tx, 1, label || '', o.fontSize || 22, skinDef.text, { shadow: skin !== 'ghost', align: 'center', wrap: capW ? undefined : w - 20 });
    if (capW && t.width > w - 28 - capW - 8) t.setScale((w - 28 - capW - 8) / t.width);
    c.add(t);
    c.label = t;
    c.bg = bg;
    c.enabled = true;
    c.setSize(w, h);

    const press = () => {
      if (!c.active || !c.enabled || !c.visible) return;
      OTR.audio.play(o.sound || 'click');
      scene.tweens.add({ targets: c, scale: 0.92, duration: 60, yoyo: true });
      if (onClick) onClick(c);
    };
    bg.on('pointerover', () => {
      if (!c.enabled) return;
      scene.tweens.add({ targets: c, scale: 1.05, duration: 120, ease: 'Back.out' });
      OTR.audio.play('hover');
    });
    bg.on('pointerout', () => { c._down = false; scene.tweens.add({ targets: c, scale: 1, duration: 120 }); });
    bg.on('pointerdown', () => { if (c.enabled) c._down = true; });
    bg.on('pointerup', () => {
      if (!c._down) return;
      c._down = false;
      press();
    });
    c.press = press;
    c.setEnabled = (en) => {
      c.enabled = en;
      c.setAlpha(en ? 1 : 0.45);
      if (en) bg.setInteractive(); else bg.disableInteractive();
      return c;
    };
    c.setLabel = (s) => { t.setText(s); return c; };
    // a toggle's look (a selected option wears another skin)
    c.setSkin = (sk) => {
      const def = OTR.tex.buttonSkins[sk] || OTR.tex.buttonSkins.orange;
      bg.setTexture(OTR.tex.button(scene, w, h, sk));
      t.setColor(def.text);
      if (sk === 'ghost') t.setShadow(0, 0, 'rgba(0,0,0,0)', 0);
      else t.setShadow(0, 2, 'rgba(0,0,0,0.4)', 6, false, true);
      return c;
    };
    if (o.key && scene.input.keyboard) {
      const keys = Array.isArray(o.key) ? o.key : [o.key];
      // o.keyAfter: the key only answers after this many ms (a key held or mashed through the part before must not
      // dismiss a card nobody has read yet); a click always works
      const armAt = o.keyAfter ? Date.now() + o.keyAfter : 0;
      const handler = OTR.dedupe((e, k) => {
        if (!(c.active && c.visible && c.enabled && scene.input.enabled)) return;
        if (armAt && Date.now() < armAt) return;
        // with the focus ring showing, ENTER and SPACE press what it is on (OTR.ui.focus), not this button
        if ((k === 'ENTER' || k === 'SPACE') && scene._focusOn && scene._focusOn.showing()) return;
        // While a modal is open only its own buttons answer their keys. (ENTER on a scenario's brief used to
        // press the hub's "Start the route" behind it as well, and the route day won.)
        const stack = scene._modalStack || [];
        const top = stack.length ? stack[stack.length - 1] : null;
        if (top && top.active && !OTR.ui.isInside(c, top)) return;
        press();
      });
      const fns = keys.map(k => { const f = (e) => handler(e, k); scene.input.keyboard.on('keydown-' + k, f); return [k, f]; });
      c.once('destroy', () => fns.forEach(([k, f]) => scene.input.keyboard && scene.input.keyboard.off('keydown-' + k, f)));
    }
    return c;
  },

  /** Round icon-only button. */
  /** The language picker: each language in its own name; choosing one restarts the game in it (src/core/i18n.js). */
  languages(scene) {
    const L = OTR.i18n.LANGS, codes = Object.keys(L);
    OTR.ui.modal(scene, {
      // two columns: a dozen languages in one would run off the screen
      title: 'Language', w: 700, h: 170 + Math.ceil(codes.length / 2) * 64, escClose: true,
      build: (box, api, w, h) => {
        const items = codes.map((c, i) => {
          const on = c === OTR.i18n.lang;
          const b = OTR.ui.button(scene, (i % 2 ? 1 : -1) * 160, -h / 2 + 108 + Math.floor(i / 2) * 64, (on ? '✓  ' : '') + L[c], () => { if (on) api.close(); else OTR.i18n.set(c); },
            { w: 300, h: 52, skin: on ? 'purple' : 'ghost', fontSize: 22 });
          b.list.forEach(o => { if (o.type === 'Text') o.noTranslate = true; });      // a language's name is never translated
          box.add(b);
          return b;
        });
        // the names were set before noTranslate: set them again as they are
        items.forEach((b, i) => b.list.forEach(o => { if (o.type === 'Text') o.setText((codes[i] === OTR.i18n.lang ? '✓  ' : '') + L[codes[i]]); }));
      },
      buttons: [{ label: 'Close', skin: 'orange', key: 'ENTER', hint: '⏎' }]
    });
  },

  iconButton(scene, x, y, icon, onClick, o) {
    o = o || {};
    const size = o.size || 48;
    const b = OTR.ui.button(scene, x, y, '', onClick, Object.assign({ w: size, h: size, skin: o.skin || 'dark', icon, iconSize: Math.round(size * 0.5) }, o));
    return b;
  },

  panel(scene, x, y, w, h, o) {
    return scene.add.image(x, y, OTR.tex.panel(scene, w, h, o));
  },

  /** Row of stars. setCount(n, animate) pops them in. */
  stars(scene, x, y, count, o) {
    o = o || {};
    const size = o.size || 28;
    const gap = o.gap !== undefined ? o.gap : size * 0.1;
    const max = o.max || 3;
    const c = scene.add.container(x, y);
    const emptyKey = o.dark ? 'star_empty_dark' : 'star_empty';
    const imgs = [];
    const total = max * size + (max - 1) * gap;
    for (let i = 0; i < max; i++) {
      const sx = -total / 2 + size / 2 + i * (size + gap);
      const e = scene.add.image(sx, 0, emptyKey).setDisplaySize(size, size);
      const f = scene.add.image(sx, 0, 'star_gold').setDisplaySize(size, size).setVisible(i < count);
      c.add([e, f]);
      imgs.push(f);
    }
    c.width = total;
    c.setCount = (n, animate, delayStep) => {
      imgs.forEach((f, i) => {
        if (!animate) { f.setVisible(i < n); return; }
        f.setVisible(false);
        if (i < n) {
          scene.time.delayedCall((delayStep || 260) * i, () => {
            f.setVisible(true);
            const s = f.scaleX;
            f.setScale(s * 2.4).setAlpha(0);
            scene.tweens.add({ targets: f, scaleX: s, scaleY: s, alpha: 1, duration: 260, ease: 'Back.out' });
            OTR.audio.play('star', i);
            const m = c.getWorldTransformMatrix();
            OTR.fx.sparkle(scene, m.tx + f.x * m.a, m.ty + f.y * m.d);
          });
        }
      });
    };
    return c;
  },

  /** Horizontal bar anchored at its left edge. */
  bar(scene, x, y, w, h, o) {
    o = o || {};
    const c = scene.add.container(x, y);
    const g = OTR.tex.liveShape(scene);
    c.add(g);
    const state = { v: o.value || 0 };
    let shown = null;
    const draw = () => {
      // repaint only when the fill moves a pixel (meters are set several times a second)
      const px = Math.round(OTR.util.clamp01(state.v) * w * 2);
      if (px === shown) return;
      shown = px;
      paint();
    };
    const paint = () => g.redraw((g) => {
      const v = OTR.util.clamp01(state.v);
      g.fillStyle(o.bg !== undefined ? o.bg : 0x000000, o.bgAlpha !== undefined ? o.bgAlpha : 0.3);
      g.fillRoundedRect(0, -h / 2, w, h, h / 2);
      const fw = w * v;
      if (fw > 1) {
        const col = typeof o.color === 'function' ? o.color(v) : (o.color || 0xFF6600);
        g.fillStyle(col, 1);
        g.fillRoundedRect(0, -h / 2, Math.max(fw, Math.min(h, w)), h, Math.min(h / 2, fw / 2));
        g.fillStyle(0xFFFFFF, 0.25);
        g.fillRoundedRect(3, -h / 2 + 2, Math.max(0, Math.max(fw, h) - 6), h * 0.35, Math.min(h * 0.17, fw / 2));
      }
      if (o.border) {
        g.lineStyle(2, o.border, 0.6);
        g.strokeRoundedRect(0, -h / 2, w, h, h / 2);
      }
    });
    draw();
    c.value = () => state.v;
    c.setValue = (v, animate, dur, ease) => {
      if (c._tw) c._tw.stop();
      if (!animate) { state.v = v; draw(); return c; }
      c._tw = scene.tweens.add({ targets: state, v, duration: dur || 600, ease: ease || 'Cubic.out', onUpdate: draw });
      return c;
    };
    return c;
  },

  /** Small pill: icon + label for a star category. */
  chip(scene, x, y, cat, o) {
    o = o || {};
    const def = OTR_DATA.config.categories[cat];
    const c = scene.add.container(x, y);
    const label = o.label === false ? '' : def.label;
    const t = OTR.txt(scene, 0, 0, label, o.size || 14, '#ffffff', { ox: 0 });
    const w = (label ? t.width + 12 : 0) + (o.size || 14) + 20;
    const h = (o.size || 14) + 12;
    const g = OTR.tex.shape(scene, (g) => { g.fillStyle(def.color, 1); g.fillRoundedRect(-w / 2, -h / 2, w, h, h / 2); });
    const ic = scene.add.image(-w / 2 + 10 + (o.size || 14) / 2, 0, def.icon).setDisplaySize(o.size || 14, o.size || 14);
    t.setPosition(ic.x + (o.size || 14) / 2 + 6, 0);
    c.add([g, ic, t]);
    c.width = w;
    return c;
  },

  /** Category icon with a star row. */
  catStars(scene, x, y, cat, n, o) {
    o = o || {};
    const def = OTR_DATA.config.categories[cat];
    const size = o.size || 18;
    const c = scene.add.container(x, y);
    const ic = scene.add.image(0, 0, def.icon).setDisplaySize(size, size).setTint(def.color);
    const s = OTR.ui.stars(scene, size / 2 + 6 + (size * 3 + size * 0.2) / 2, 0, n, { size, dark: o.dark });
    c.add([ic, s]);
    c.starsRow = s;
    return c;
  },

  /**
   * Modal dialog. o: title, body, w, h, buttons:[{label, skin, onClick, key, hint}], build(container, api), escClose,
   * focus (false: no arrow-key focus ring over its buttons, for a modal that takes typing)
   */
  modal(scene, o) {
    const w = o.w || 620, h = o.h || 360;
    const depth = o.depth || 5000;
    const root = scene.add.container(0, 0).setDepth(depth).setScrollFactor(0);
    // a message still on screen is over now (a bottom one covered the invoice's Submit button)
    if (scene._toast && scene._toast.active) scene._toast.destroy();
    scene._openModals = (scene._openModals || 0) + 1;
    // the stack of open modals, so keyboard shortcuts go to the one on top (see button())
    scene._modalStack = (scene._modalStack || []).filter(m => m.active);
    scene._modalStack.push(root);
    root.once('destroy', () => {
      scene._openModals = Math.max(0, (scene._openModals || 1) - 1);
      scene._modalStack = (scene._modalStack || []).filter(m => m !== root);
    });
    const dim = scene.add.rectangle(OTR.W / 2, OTR.H / 2, OTR.W, OTR.H, 0x0B0418, 0.65).setScrollFactor(0).setInteractive();
    root.add(dim);
    const box = scene.add.container(OTR.W / 2, OTR.H / 2);
    root.add(box);
    box.add(OTR.ui.panel(scene, 0, 0, w, h, { top: 0xFFFFFF, bottom: 0xF1EAFB, border: 0xC9B3F0, radius: 22 }));
    let y = -h / 2 + 44;
    if (o.title) {
      const t = OTR.txt(scene, 0, y, o.title, o.titleSize || 32, '#4D148C', { weight: '900', align: 'center', wrap: w - 60 });
      box.add(t);
      y += t.height / 2 + 26;
    }
    if (o.body) {
      const b = OTR.txt(scene, 0, y, o.body, o.bodySize || 19, '#3A2A50', { bold: false, align: 'center', wrap: w - 80, oy: 0, lineSpacing: 4 });
      box.add(b);
    }
    let closed = false;
    const api = {
      root, box,
      close(cb) {
        if (closed) return;
        closed = true;
        // clicks go through at once: the fading dim used to swallow a click on the screen behind (a hub card clicked
        // right after ESC on a brief did nothing)
        dim.disableInteractive();
        scene.tweens.add({ targets: box, scale: 0.85, alpha: 0, duration: 160, ease: 'Cubic.in' });
        scene.tweens.add({ targets: dim, alpha: 0, duration: 180, onComplete: () => { root.destroy(); if (cb) cb(); } });
      }
    };
    if (o.build) o.build(box, api, w, h);
    // read aloud (Accessibility → narration): every line on the card, top to bottom, before its buttons
    if (OTR.a11y && OTR.a11y.settings().narrate) {
      const lines = [];
      const walk = (ct) => ct.list.forEach(ch => { if (ch.type === 'Text' && ch.visible && ch.text && !ch.parentContainer.press) lines.push({ y: ch.y, t: ch.text }); else if (ch.list && !ch.press) walk(ch); });
      walk(box);
      OTR.a11y.say(lines.sort((a, b) => a.y - b.y).map(l => l.t).join('. '));
      root.once('destroy', () => OTR.a11y.hush());
    }
    const btns = o.buttons || [];
    const bw = Math.min(240, (w - 60) / Math.max(1, btns.length) - 16);
    btns.forEach((bd, i) => {
      const bx = (i - (btns.length - 1) / 2) * (bw + 20);
      const b = OTR.ui.button(scene, bx, h / 2 - 50, bd.label, () => {
        if (bd.keepOpen) { bd.onClick && bd.onClick(api); return; }
        api.close(() => bd.onClick && bd.onClick(api));
      }, { w: bw, h: 54, skin: bd.skin || 'orange', key: bd.key, keyAfter: bd.keyAfter, fontSize: 20, hint: bd.hint });
      box.add(b);
    });
    // every button in the modal (its own and any the build added) can be reached with the arrow keys; the ring starts
    // on the last of its own buttons, the main action
    if (o.focus !== false) {
      const found = [];
      const walk = (ct) => ct.list.forEach(ch => { if (ch.press && ch.bg) found.push(ch); else if (ch.list) walk(ch); });
      walk(box);
      if (found.length) api.focus = OTR.ui.focus(scene, found, { owner: root, start: found.length - 1 });
    }
    if (o.escClose) {
      const esc = () => api.close(o.onEsc);
      scene.input.keyboard.once('keydown-ESC', esc);
      root.once('destroy', () => scene.input.keyboard && scene.input.keyboard.off('keydown-ESC', esc));
    }
    box.setScale(0.8).setAlpha(0);
    dim.setAlpha(0);
    scene.tweens.add({ targets: box, scale: 1, alpha: 1, duration: 260, ease: 'Back.out' });
    scene.tweens.add({ targets: dim, alpha: 0.65, duration: 200 });
    OTR.audio.play('pop');
    return api;
  },

  confirm(scene, title, body, onYes, o) {
    o = o || {};
    const w = o.w || 560;
    let h = o.h;
    if (!h) {
      // as tall as its text: title, body, then the buttons (a fixed 300 left a gap over two-line bodies, SHELL-22)
      const measure = (str, size, opts) => { const t = OTR.txt(scene, 0, 0, str, size, '#000', opts); const th = t.height; t.destroy(); return th; };
      const th = measure(title, 32, { weight: '900', align: 'center', wrap: w - 60 });
      const bh = body ? measure(body, 19, { bold: false, align: 'center', wrap: w - 80, lineSpacing: 4 }) : 0;
      h = Math.max(220, Math.round(44 + th / 2 + 26 + bh + 30 + 77));
    }
    return OTR.ui.modal(scene, {
      title, body, w, h, escClose: true,
      buttons: [
        { label: o.no || 'Cancel', skin: 'ghost' },
        { label: o.yes || 'Confirm', skin: o.danger ? 'red' : 'orange', onClick: onYes, key: o.key, keyAfter: o.key ? 300 : 0, hint: o.hint }
      ]
    });
  },

  /**
   * A message that slides in and out. One at a time per scene: a new one replaces the one on screen (they used to
   * stack, both half legible). o.y below mid-screen slides it up from the bottom edge instead of down from the top.
   */
  toast(scene, text, o) {
    o = o || {};
    // never shorter than it takes to read
    o = Object.assign({}, o, { hold: Math.max(o.hold || 2200, OTR.ui.readTime(text)) });
    if (scene._toast && scene._toast.active) scene._toast.destroy();
    const low = (o.y || 0) > OTR.H / 2;
    const c = scene.add.container(OTR.W / 2, low ? OTR.H + 50 : -50).setDepth(o.depth || 6000).setScrollFactor(0);
    scene._toast = c;
    const t = OTR.txt(scene, 0, 0, text, o.size || 20, '#ffffff', { align: 'center', wrap: 760 });
    const w = Math.max(260, t.width + 50), h = t.height + 26;
    const g = OTR.tex.shape(scene, (g) => {
      g.fillStyle(o.color || 0x250849, 0.95);
      g.fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
      g.lineStyle(2, o.border || 0xFF6600, 1);
      g.strokeRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    });
    c.add([g, t]);
    scene.tweens.add({ targets: c, y: o.y || 96, duration: 300, ease: 'Back.out' });
    scene.tweens.add({ targets: c, y: low ? OTR.H + 60 : -60, delay: o.hold || 2200, duration: 260, ease: 'Cubic.in', onComplete: () => c.destroy() });
    return c;
  },

  /** How long a message stays up: a second, plus about a second for every 18 characters (2.2 s at the least). */
  readTime(text) {
    return Math.min(9000, Math.max(2200, 1000 + String(text || '').length * 55));
  },

  /** Little keyboard key-cap label. */
  keyCap(scene, x, y, label, o) {
    o = o || {};
    const c = scene.add.container(x, y);
    const t = OTR.txt(scene, 0, -1, label, o.size || 14, o.color || '#4D148C', { weight: '900' });
    const w = Math.max(24, t.width + 12), h = (o.size || 14) + 12;
    c.capW = w;
    const g = OTR.tex.shape(scene, (g) => {
      g.fillStyle(0x000000, 0.25); g.fillRoundedRect(-w / 2, -h / 2 + 3, w, h, 6);
      g.fillStyle(o.bg || 0xFFFFFF, 1); g.fillRoundedRect(-w / 2, -h / 2, w, h, 6);
    });
    c.add([g, t]);
    return c;
  },

  /**
   * Modal text entry for the courier name (keyboard-driven, no DOM). o: title, initial, confirm, onDone(name), onCancel
   * Any letter in any language is accepted (José, Zoë, Siobhán), up to 24 characters with a counter; a refused key or
   * an empty name says why on the hint line (they used to be silently ignored).
   */
  /** o: { title, initial, confirm, onDone, onCancel, pin: true (4-8 digits, shown as dots), hint } */
  nameEntry(scene, o) {
    o = o || {};
    const MAX = o.pin ? 8 : 24;
    const HINT = o.hint || (o.pin ? 'Type the PIN (4 to 8 digits) · Enter to confirm' : 'Type your name · Enter to confirm');
    let value = (o.initial || '').slice(0, MAX);
    let field, caret, hint, count, confirmBtn;
    const modal = OTR.ui.modal(scene, {
      title: o.title || 'What\'s your name, courier?',
      w: 620, h: 340, focus: false,
      build(box) {
        const fg = OTR.tex.shape(scene, (fg) => {
          fg.fillStyle(0x4D148C, 0.08); fg.fillRoundedRect(-230, -40, 460, 70, 14);
          fg.lineStyle(3, 0xFF6600, 1); fg.strokeRoundedRect(-230, -40, 460, 70, 14);
        });
        field = OTR.txt(scene, 0, -5, value, 34, '#250849', { weight: '900' });
        caret = scene.add.rectangle(0, -5, 4, 38, 0xFF6600);
        hint = OTR.txt(scene, 0, 56, HINT, 15, '#7A6A90', { bold: false });
        count = OTR.txt(scene, 222, 14, '', 12, '#9A8AB0', { ox: 1, weight: '800' });
        box.add([fg, field, caret, hint, count]);
        scene.tweens.add({ targets: caret, alpha: 0, duration: 450, yoyo: true, repeat: -1 });
      },
      buttons: [
        { label: 'Cancel', skin: 'ghost', onClick: () => { cleanup(); if (o.onCancel) o.onCancel(); } },
        { label: o.confirm || 'Let\'s Roll!', skin: 'orange', keepOpen: true, onClick: () => submit() }
      ]
    });
    confirmBtn = modal.box.list.filter(c => c.label && OTR.i18n.src(c.label) === (o.confirm || 'Let\'s Roll!'))[0];
    let hintTimer = null;
    const say = (msg) => {
      hint.setText(msg).setColor('#C8243B');
      if (hintTimer) hintTimer.remove();
      hintTimer = scene.time.delayedCall(1800, () => hint.setText(HINT).setColor('#7A6A90'));
    };
    const refresh = () => {
      field.setText(o.pin ? '•'.repeat(value.length) || ' ' : value || ' ');
      field.setScale(Math.min(1, 440 / Math.max(1, field.width)));          // a long name still fits the field
      caret.x = value ? field.displayWidth / 2 + 6 : 0;
      count.setText(`${value.length} / ${MAX}`);
      if (confirmBtn) confirmBtn.setEnabled(!!value.trim());
    };
    const submit = () => {
      const name = value.trim();
      if (!name || (o.pin && name.length < 4)) {
        OTR.audio.play('fail');
        say(o.pin ? 'At least 4 digits' : 'Type your name first');
        scene.tweens.add({ targets: modal.box, x: modal.box.x + 10, duration: 40, yoyo: true, repeat: 3 });
        return;
      }
      cleanup();
      modal.close(() => o.onDone && o.onDone(name));
    };
    const onKey = OTR.dedupe((e) => {
      if (e.key === 'Enter') { submit(); return; }
      if (e.key === 'Backspace') { value = value.slice(0, -1); OTR.audio.play('type'); refresh(); return; }
      if (e.key === 'Escape') { cleanup(); modal.close(o.onCancel); return; }
      if (e.key.length === 1 || /^\p{L}\p{M}*$/u.test(e.key)) {
        if (o.pin && !/^\d$/.test(e.key)) { say('Digits only'); return; }
        if (!/^[\p{L}\p{M}\p{N} .'\-]+$/u.test(e.key)) { say('Letters, numbers, spaces and . \' - only'); return; }
        if (value.length >= MAX) { say(`That is the most it takes: ${MAX} characters`); return; }
        if (e.key === ' ' && (!value || value.endsWith(' '))) return;
        value += e.key;
        OTR.audio.play('type');
        refresh();
      }
    });
    const cleanup = () => scene.input.keyboard.off('keydown', onKey);
    scene.input.keyboard.on('keydown', onKey);
    modal.root.once('destroy', cleanup);
    refresh();
    modal.say = say;
    return modal;
  },

  /**
   * Keyboard focus over a set of controls (SHELL-11). The arrow keys (and TAB / SHIFT+TAB on the menu screens) move a
   * ring between them, ENTER or SPACE presses the one it is on. Nothing shows until one of those keys is pressed, so
   * the keys a screen already answers work as before; a mouse click hides the ring again.
   * items: ui.buttons or anything with press() (and a size, or bounds); o.owner: the modal root it belongs to (its
   * keys then work only while that modal is on top; without one, only while no modal is open); o.start: the index
   * the ring appears on; o.tab: false to leave TAB alone (a scenario uses it for the handheld).
   */
  focus(scene, items, o) {
    o = o || {};
    const owner = o.owner || null;
    const tab = o.tab !== undefined ? o.tab : !scene.setupBase;
    let cur = -1, shown = false, drawn = '';
    const ring = OTR.tex.liveShape(scene).setScrollFactor(0).setVisible(false);   // nothing until it is drawn
    if (owner) owner.add(ring); else ring.setDepth(o.depth || 4900);
    const onTop = () => {
      const st = (scene._modalStack || []).filter(m => m.active);
      return (st.length ? st[st.length - 1] : null) === owner;
    };
    const seen = (it) => {
      for (let p = it; p; p = p.parentContainer) if (!p.active || !p.visible || p.alpha < 0.05) return false;
      return it.enabled !== false && (!it.input || it.input.enabled !== false);
    };
    const box = (it) => {
      if (it.list && it.width) {
        const m = it.getWorldTransformMatrix();
        const sx = Math.hypot(m.a, m.b), sy = Math.hypot(m.c, m.d);
        return { x: m.tx, y: m.ty, w: it.width * sx, h: it.height * sy };
      }
      const b = it.getBounds();
      return { x: b.centerX, y: b.centerY, w: b.width, h: b.height };
    };
    const draw = () => {
      const it = items[cur];
      if (!shown || !it || !seen(it)) { if (drawn) { ring.setVisible(false); drawn = ''; } return; }
      const b = box(it);
      const key = [b.x, b.y, b.w, b.h].map(Math.round).join();
      if (key === drawn) return;
      drawn = key;
      ring.setVisible(true).redraw((g) => {
        const w = b.w + 12, h = b.h + 12, r = Math.min(18, h / 2);
        g.lineStyle(6, 0x250849, 0.55); g.strokeRoundedRect(b.x - w / 2, b.y - h / 2, w, h, r);
        g.lineStyle(3, 0xFFC83D, 1); g.strokeRoundedRect(b.x - w / 2, b.y - h / 2, w, h, r);
      });
    };
    const usable = () => items.map((it, i) => i).filter(i => seen(items[i]));
    const first = () => {
      const u = usable();
      return u.includes(o.start) ? o.start : (u.length ? u[0] : -1);
    };
    const step = (dx, dy) => {
      const u = usable();
      if (!u.length) return;
      if (!shown || !u.includes(cur)) { cur = first(); return; }
      const a = box(items[cur]);
      let best = -1, score = Infinity;
      u.forEach(i => {
        if (i === cur) return;
        const b = box(items[i]);
        const along = (b.x - a.x) * dx + (b.y - a.y) * dy;
        const across = Math.abs((b.x - a.x) * dy) + Math.abs((b.y - a.y) * dx);
        if (along < 4) return;
        const sc = along + across * 2.5;
        if (sc < score) { score = sc; best = i; }
      });
      if (best >= 0) cur = best;
    };
    const cycle = (d) => {
      const u = usable();
      if (!u.length) return;
      if (!shown || !u.includes(cur)) { cur = first(); return; }
      cur = u[(u.indexOf(cur) + d + u.length) % u.length];
    };
    const api = {
      showing: () => shown && onTop() && !!items[cur] && seen(items[cur]),
      hide() { shown = false; draw(); },
      set(i) { cur = i; }
    };
    const onKey = OTR.dedupe((e) => {
      if (!ring.active || !scene.input.enabled || !onTop()) return;
      const k = e.key;
      const nav = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[k];
      if (nav) step(nav[0], nav[1]);
      else if (k === 'Tab' && tab) { if (e.preventDefault) e.preventDefault(); cycle(e.shiftKey ? -1 : 1); }
      else if ((k === 'Enter' || k === ' ') && api.showing()) { items[cur].press(); return; }
      else return;
      if (cur < 0) return;
      shown = true;
      scene._focusOn = api;
      OTR.audio.play('hover');
      draw();
    });
    const onPointer = () => { if (shown) api.hide(); };
    scene.input.keyboard.on('keydown', onKey);
    scene.input.on('pointerdown', onPointer);
    scene.events.on('update', draw);
    const off = () => {
      if (scene.input.keyboard) scene.input.keyboard.off('keydown', onKey);
      scene.input.off('pointerdown', onPointer);
      scene.events.off('update', draw);
      if (scene._focusOn === api) scene._focusOn = null;
    };
    ring.once('destroy', off);
    scene.events.once('shutdown', () => { off(); });
    // a modal's ring hands back to the screen's: the screen's own ring is what ENTER answers again
    if (owner) owner.once('destroy', () => { if (scene._focusOn === api) scene._focusOn = scene._screenFocus || null; });
    else scene._screenFocus = api;
    return api;
  },

  /** A notice, where progress is shown, that the browser is not keeping it (SHELL-14). Nothing when saving works. */
  saveWarning(scene, x, y) {
    if (!OTR.save.failed) return null;
    const c = scene.add.container(x, y).setDepth(900).setScrollFactor(0);
    const remote = OTR.identity && OTR.identity.mode !== 'local';
    const t = OTR.txt(scene, 0, 0, remote ? '⚠ Can\'t reach the training server: saving on this PC for now' : '⚠ Progress can\'t be saved in this window', 13, '#ffffff', { weight: '900' });
    const w = t.width + 28, h = 28;
    c.add([OTR.tex.shape(scene, (g) => { g.fillStyle(0xC8243B, 0.95); g.fillRoundedRect(-w / 2, -h / 2, w, h, h / 2); }), t]);
    const hit = scene.add.rectangle(0, 0, w, h, 0xffffff, 0.001).setInteractive({ useHandCursor: true });
    c.add(hit);
    hit.on('pointerup', () => OTR.ui.modal(scene, {
      title: remote ? 'The training server isn\'t answering' : 'Progress isn\'t being saved', w: 600, h: 330, escClose: true,
      body: remote ? 'Your progress is being kept on this PC and goes to the training server the next time it answers. ' +
        'If this keeps happening, tell your trainer or IT: the server may be down or blocked.' : 'The browser is refusing to store anything for this page (a private window, blocked site data or a full ' +
        'disk). You can keep training, but your rank and stars last only until this tab is closed. Use a normal ' +
        'window, or ask IT to allow site data for this page.',
      buttons: [{ label: 'OK', skin: 'orange', key: ['ENTER', 'SPACE'] }]
    }));
    return c;
  },

  /** Mute toggle button (top-right by default). */
  muteButton(scene, x, y) {
    const b = OTR.ui.iconButton(scene, x, y, OTR.audio.muted ? 'ic_mute' : 'ic_sound', () => {
      const m = !OTR.audio.muted;
      OTR.audio.init();
      OTR.audio.setMuted(m);
      OTR.save.setMuted(m);
      b.icon.setTexture(m ? 'ic_mute' : 'ic_sound');
      if (!m) OTR.audio.play('pop');
    }, { size: 46, sound: 'click' });
    return b;
  }
};
