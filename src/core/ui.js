/* Reusable UI widgets. */
window.OTR = window.OTR || {};

OTR.ui = {
  /** True when obj sits (at any depth) inside the container root. */
  isInside(obj, root) {
    for (let p = obj; p; p = p.parentContainer) if (p === root) return true;
    return false;
  },

  /** Gradient button. o: w, h, skin, fontSize, icon, iconSize, sound, key (Phaser key name) */
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
    const t = OTR.txt(scene, tx, 1, label || '', o.fontSize || 22, skinDef.text, { shadow: skin !== 'ghost', align: 'center', wrap: w - 20 });
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
    if (o.key && scene.input.keyboard) {
      const keys = Array.isArray(o.key) ? o.key : [o.key];
      // o.keyAfter: the key only answers after this many ms (a key held or mashed through the part before must not
      // dismiss a card nobody has read yet); a click always works
      const armAt = o.keyAfter ? Date.now() + o.keyAfter : 0;
      const handler = OTR.dedupe(() => {
        if (!(c.active && c.visible && c.enabled && scene.input.enabled)) return;
        if (armAt && Date.now() < armAt) return;
        // While a modal is open only its own buttons answer their keys. (ENTER on a scenario's brief used to
        // press the hub's "Start the route" behind it as well, and the route day won.)
        const stack = scene._modalStack || [];
        const top = stack.length ? stack[stack.length - 1] : null;
        if (top && top.active && !OTR.ui.isInside(c, top)) return;
        press();
      });
      keys.forEach(k => scene.input.keyboard.on('keydown-' + k, handler));
      c.once('destroy', () => keys.forEach(k => scene.input.keyboard && scene.input.keyboard.off('keydown-' + k, handler)));
    }
    return c;
  },

  /** Round icon-only button. */
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

  /** Modal dialog. o: title, body, w, h, buttons:[{label, skin, onClick, key}], build(container, api), escClose */
  modal(scene, o) {
    const w = o.w || 620, h = o.h || 360;
    const depth = o.depth || 5000;
    const root = scene.add.container(0, 0).setDepth(depth).setScrollFactor(0);
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
        scene.tweens.add({ targets: box, scale: 0.85, alpha: 0, duration: 160, ease: 'Cubic.in' });
        scene.tweens.add({ targets: dim, alpha: 0, duration: 180, onComplete: () => { root.destroy(); if (cb) cb(); } });
      }
    };
    if (o.build) o.build(box, api, w, h);
    const btns = o.buttons || [];
    const bw = Math.min(240, (w - 60) / Math.max(1, btns.length) - 16);
    btns.forEach((bd, i) => {
      const bx = (i - (btns.length - 1) / 2) * (bw + 20);
      const b = OTR.ui.button(scene, bx, h / 2 - 50, bd.label, () => {
        if (bd.keepOpen) { bd.onClick && bd.onClick(api); return; }
        api.close(() => bd.onClick && bd.onClick(api));
      }, { w: bw, h: 54, skin: bd.skin || 'orange', key: bd.key, keyAfter: bd.keyAfter, fontSize: 20 });
      box.add(b);
    });
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
    return OTR.ui.modal(scene, {
      title, body, w: o.w || 560, h: o.h || 300, escClose: true,
      buttons: [
        { label: o.no || 'Cancel', skin: 'ghost' },
        { label: o.yes || 'Confirm', skin: o.danger ? 'red' : 'orange', onClick: onYes, key: o.key, keyAfter: o.key ? 300 : 0 }
      ]
    });
  },

  /**
   * A message that slides in and out. One at a time per scene: a new one replaces the one on screen (they used to
   * stack, both half legible). o.y below mid-screen slides it up from the bottom edge instead of down from the top.
   */
  toast(scene, text, o) {
    o = o || {};
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

  /** Little keyboard key-cap label. */
  keyCap(scene, x, y, label, o) {
    o = o || {};
    const c = scene.add.container(x, y);
    const t = OTR.txt(scene, 0, -1, label, o.size || 14, o.color || '#4D148C', { weight: '900' });
    const w = Math.max(24, t.width + 12), h = (o.size || 14) + 12;
    const g = OTR.tex.shape(scene, (g) => {
      g.fillStyle(0x000000, 0.25); g.fillRoundedRect(-w / 2, -h / 2 + 3, w, h, 6);
      g.fillStyle(o.bg || 0xFFFFFF, 1); g.fillRoundedRect(-w / 2, -h / 2, w, h, 6);
    });
    c.add([g, t]);
    return c;
  },

  /** Modal text entry for the courier name (keyboard-driven, no DOM). o: title, initial, confirm, onDone(name), onCancel */
  nameEntry(scene, o) {
    o = o || {};
    let value = (o.initial || '').slice(0, 16);
    let field, caret;
    const MAX = 16;
    const modal = OTR.ui.modal(scene, {
      title: o.title || 'What\'s your name, courier?',
      w: 620, h: 340,
      build(box) {
        const fg = OTR.tex.shape(scene, (fg) => {
          fg.fillStyle(0x4D148C, 0.08); fg.fillRoundedRect(-230, -40, 460, 70, 14);
          fg.lineStyle(3, 0xFF6600, 1); fg.strokeRoundedRect(-230, -40, 460, 70, 14);
        });
        field = OTR.txt(scene, 0, -5, value, 34, '#250849', { weight: '900' });
        caret = scene.add.rectangle(0, -5, 4, 38, 0xFF6600);
        const hint = OTR.txt(scene, 0, 56, 'Type your name · Enter to confirm', 15, '#7A6A90', { bold: false });
        box.add([fg, field, caret, hint]);
        scene.tweens.add({ targets: caret, alpha: 0, duration: 450, yoyo: true, repeat: -1 });
      },
      buttons: [
        { label: 'Cancel', skin: 'ghost', onClick: () => { cleanup(); if (o.onCancel) o.onCancel(); } },
        { label: o.confirm || 'Let\'s Roll!', skin: 'orange', keepOpen: true, onClick: () => submit() }
      ]
    });
    const refresh = () => {
      field.setText(value || ' ');
      caret.x = value ? field.width / 2 + 6 : 0;
    };
    const submit = () => {
      const name = value.trim();
      if (!name) {
        OTR.audio.play('fail');
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
      if (e.key.length === 1 && /[A-Za-z0-9 .'\-]/.test(e.key) && value.length < MAX) {
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
    return modal;
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
