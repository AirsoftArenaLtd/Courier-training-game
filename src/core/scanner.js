/*
 * The courier's handheld device (TAB). A generic screen builder the scenes drive:
 *
 *   const hh = new OTR.Handheld(scene, { depth: 2600, onOpen, onClose, clock: () => '9:41 AM' });
 *   hh.show({ title: 'SCAN', lines: ['Aim at the label…'], options: [{ label: 'Deliver', onPick }], back: () => ... });
 *   hh.show({ title: 'SIGNATURE', widget: { type: 'signature', signer: 'Rosa', onDone } });
 *   hh.close();
 *
 * Also exports OTR.labelArt for drawing package labels (shelves, scan screens, inspections).
 */
window.OTR = window.OTR || {};

/* ==================================================================== package labels */
OTR.labelArt = {
  SERVICE: {
    standard: { text: 'GROUND', color: 0x3DA5FF },
    priority: { text: 'PRIORITY', color: 0xE8304A },
    signature: { text: 'SIGNATURE REQUIRED', color: 0xFF6600 },
    adult: { text: 'ADULT SIG 21+', color: 0x7B3FC4 },
    hazmat: { text: 'DANGEROUS GOODS', color: 0x1D1030 }
  },

  /** pkg: { to, number, street, unit, city, service, weight, pieces, piece, tracking, marks: [] } */
  draw(ctx, pkg, x, y, w, h) {
    const cv = OTR.cv;
    const k = w / 300;
    cv.rr(ctx, x, y, w, h, 6 * k); ctx.fillStyle = '#FFFFFF'; ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1.5 * k; ctx.stroke();
    const svc = OTR.labelArt.SERVICE[pkg.service || 'standard'] || OTR.labelArt.SERVICE.standard;
    ctx.fillStyle = cv.c(svc.color); ctx.fillRect(x, y, w, 30 * k);
    ctx.fillStyle = '#fff'; ctx.font = `900 ${15 * k}px "Segoe UI", Arial`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(svc.text, x + 10 * k, y + 15 * k);
    ctx.textAlign = 'right';
    ctx.fillText(`${pkg.piece || 1} of ${pkg.pieces || 1}`, x + w - 10 * k, y + 15 * k);
    ctx.textAlign = 'left'; ctx.fillStyle = '#6A5A80'; ctx.font = `800 ${11 * k}px "Segoe UI", Arial`;
    ctx.fillText('SHIP TO:', x + 10 * k, y + 46 * k);
    ctx.fillStyle = '#1D1030'; ctx.font = `900 ${19 * k}px "Segoe UI", Arial`;
    ctx.fillText(String(pkg.to || '').toUpperCase(), x + 10 * k, y + 68 * k);
    ctx.font = `800 ${17 * k}px "Segoe UI", Arial`;
    ctx.fillText(`${pkg.number || ''} ${String(pkg.street || '').toUpperCase()}${pkg.unit ? '  UNIT ' + pkg.unit : ''}`, x + 10 * k, y + 92 * k);
    ctx.font = `700 ${14 * k}px "Segoe UI", Arial`; ctx.fillStyle = '#3A2A50';
    ctx.fillText(pkg.city || 'MAPLE GROVE', x + 10 * k, y + 112 * k);
    // barcode
    let bx = x + 10 * k;
    const seed = String(pkg.tracking || pkg.to || 'x');
    for (let i = 0; bx < x + w * 0.66; i++) {
      const lw = ((seed.charCodeAt(i % seed.length) + i * 7) % 3 + 1) * 1.4 * k;
      ctx.fillStyle = '#1D1030'; ctx.fillRect(bx, y + 124 * k, lw, 30 * k);
      bx += lw + 1.6 * k;
    }
    ctx.font = `700 ${11 * k}px "Consolas", monospace`; ctx.fillStyle = '#1D1030';
    ctx.fillText(pkg.tracking || '', x + 10 * k, y + 165 * k);
    ctx.textAlign = 'right'; ctx.font = `900 ${16 * k}px "Segoe UI", Arial`;
    ctx.fillText(`${pkg.weight || 5} LB`, x + w - 10 * k, y + 140 * k);
    // marks
    (pkg.marks || []).slice(0, 3).forEach((m, i) => {
      OTR.draw.mark(ctx, m, x + w - 26 * k - i * 44 * k, y + 60 * k, 18 * k);
    });
    if (pkg.note) {
      ctx.textAlign = 'left'; ctx.font = `italic 700 ${11 * k}px "Segoe UI", Arial`; ctx.fillStyle = '#6A3FB0';
      ctx.fillText('NOTE: ' + pkg.note, x + 10 * k, y + 186 * k);
    }
  },

  key(scene, pkg, w, h) {
    // hash only the package's own fields: scenes hang live references off packages (a shelf slot that points
    // back at its package, a sprite), and those are both circular and nothing to do with what the label shows
    const plain = {};
    Object.keys(pkg).forEach(k => { const v = pkg[k]; if (v === null || typeof v !== 'object' || Array.isArray(v)) plain[k] = v; });
    const key = `lbl_${OTR.rig.hash(plain)}_${w}x${h}`;
    return OTR.tex.make(scene, key, w, h, (ctx) => OTR.labelArt.draw(ctx, pkg, 0, 0, w, h));
  },

  idCard(scene, person) {
    const key = `idcard_${OTR.rig.hash(person)}`;
    OTR.art.portrait(scene, 'id_' + OTR.rig.hash(person.spec), person.spec, 'neutral');
    return OTR.tex.make(scene, key, 340, 210, (ctx, w, h) => {
      const cv = OTR.cv;
      cv.rr(ctx, 2, 2, w - 4, h - 4, 14);
      ctx.fillStyle = cv.lin(ctx, 0, 0, w, h, [[0, '#E6F2FA'], [1, '#C4DCEB']]); ctx.fill();
      ctx.strokeStyle = '#6E94B0'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#2E5A7A'; ctx.fillRect(2, 14, w - 4, 30);
      ctx.fillStyle = '#fff'; ctx.font = '900 15px "Segoe UI"'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText('STATE OF ' + (person.state || 'COLUMBIA'), 14, 29);
      ctx.textAlign = 'right'; ctx.fillText('DRIVER LICENSE', w - 14, 29);
      const tex = scene.textures.get('pt_id_' + OTR.rig.hash(person.spec) + '_neutral').getSourceImage();
      ctx.fillStyle = '#fff'; ctx.fillRect(14, 54, 96, 118);
      ctx.drawImage(tex, 40, 40, 280, 340, 14, 54, 96, 118);
      ctx.textAlign = 'left'; ctx.fillStyle = '#1D1030';
      const row = (label, val, y) => {
        ctx.font = '800 10px "Segoe UI"'; ctx.fillStyle = '#6A7A90'; ctx.fillText(label, 124, y);
        ctx.font = '900 15px "Segoe UI"'; ctx.fillStyle = '#1D1030'; ctx.fillText(val, 124, y + 16);
      };
      row('NAME', String(person.name).toUpperCase(), 62);
      row('DATE OF BIRTH', person.dob, 102);
      row('EXPIRES', person.exp || '08/14/2029', 142);
      ctx.font = '900 12px "Segoe UI"'; ctx.fillStyle = '#C8243B'; ctx.textAlign = 'right';
      ctx.fillText('ID ' + (person.idNo || 'D1234-5678'), w - 14, h - 16);
    });
  }
};

/* ==================================================================== handheld */
OTR.Handheld = class {
  constructor(scene, o) {
    this.scene = scene;
    this.o = o || {};
    this.depth = this.o.depth || 2600;
    this.isOpen = false;
    this.closedAt = -1e9;
    this.W = 380; this.H = 640;
    this.X = OTR.W - 220; this.Yopen = OTR.H / 2 + 20; this.Yclosed = OTR.H + 360;
    this.build();
    this.keyHandlers = [];
    scene.input.keyboard.addCapture('TAB');
    const on = (name, fn) => this.keyHandlers.push([name, OTR.onKey(scene, name, fn)]);
    on('keydown-TAB', (e) => {
      if (e && e.preventDefault) e.preventDefault();
      if (this.o.canToggle && !this.o.canToggle()) return;
      // the device often puts itself away after the last step; the TAB a trainee presses to put it away as well
      // must not bring it straight back up
      if (!this.isOpen && this.scene.time.now - this.closedAt < 700) return;
      this.toggle();
    });
    // every numbered option answers its number key (the exception list runs to eight; 7 and 8 used to do nothing)
    ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'].forEach((k, i) => on('keydown-' + k, () => { if (this.isOpen && this.optionBtns && this.optionBtns[i]) this.optionBtns[i].press(); }));
    on('keydown-BACKSPACE', () => { if (this.isOpen && this.current && this.current.back) this.current.back(); });
    scene.events.once('shutdown', () => this.keyHandlers.forEach(([n, h]) => scene.input.keyboard && scene.input.keyboard.off(n, h)));
  }

  deviceTex() {
    return OTR.tex.make(this.scene, 'handheld_body', this.W + 40, this.H + 40, (ctx) => {
      const cv = OTR.cv, W = this.W, H = this.H;
      cv.shadow(ctx, 24, 10, 0.5);
      cv.rr(ctx, 20, 20, W, H, 44);
      ctx.fillStyle = cv.lin(ctx, 20, 0, 20 + W, 0, [[0, '#2A2733'], [0.5, '#3E3A4A'], [1, '#24212C']]); ctx.fill();
      cv.noShadow(ctx);
      // grip bumpers
      ctx.fillStyle = '#FF6600';
      cv.rr(ctx, 20, 70, 12, 160, 6); ctx.fill();
      cv.rr(ctx, 8 + W, 70, 12, 160, 6); ctx.fill();
      // scan window at top
      cv.rr(ctx, 20 + W / 2 - 60, 30, 120, 18, 9); ctx.fillStyle = '#8A1A20'; ctx.fill();
      ctx.fillStyle = 'rgba(255,90,90,0.5)'; ctx.fillRect(20 + W / 2 - 50, 36, 100, 6);
      // screen bezel
      cv.rr(ctx, 44, 64, W - 48, 470, 16); ctx.fillStyle = '#111016'; ctx.fill();
      // keypad
      for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) {
        cv.rr(ctx, 60 + c * 80, 550 + r * 44, 64, 34, 10);
        ctx.fillStyle = r === 0 && c === 0 ? '#FF6600' : '#4A4656'; ctx.fill();
      }
      ctx.fillStyle = '#9A94AA'; ctx.font = '900 12px "Segoe UI"'; ctx.textAlign = 'center';
      ctx.fillText(OTR_DATA.config.brand ? OTR_DATA.config.brand.toUpperCase() + ' HANDHELD' : 'HANDHELD', 20 + W / 2, 648);
    });
  }

  build() {
    const s = this.scene;
    this.root = s.add.container(this.X, this.Yclosed).setDepth(this.depth).setScrollFactor(0);
    this.body = s.add.image(0, 0, this.deviceTex());
    this.root.add(this.body);
    this.screen = s.add.container(0, 0);
    this.root.add(this.screen);
    // screen rect in device-local coords
    this.sx = -this.W / 2 + 32; this.sy = -this.H / 2 + 52; this.sw = this.W - 64; this.sh = 452;
    this.root.setVisible(false);

    // collapsed tab button
    this.tab = s.add.container(OTR.W - 92, OTR.H - 40).setDepth(this.depth - 1).setScrollFactor(0);
    const tg = OTR.tex.shape(s, (tg) => {
      tg.fillStyle(0x16062B, 0.92); tg.fillRoundedRect(-80, -26, 160, 52, 16);
      tg.lineStyle(2, 0xFF6600, 1); tg.strokeRoundedRect(-80, -26, 160, 52, 16);
    });
    const ti = s.add.image(-48, 0, OTR.rig.itemTex(s, 'scanner')).setScale(0.62);
    const tt = OTR.txt(s, 12, -8, 'HANDHELD', 14, '#ffffff', { weight: '900' });
    const cap = OTR.ui.keyCap(s, 12, 12, 'TAB', { size: 11 });
    this.badge = OTR.tex.shape(s, (g) => { g.fillStyle(0xE8304A, 1); g.fillCircle(0, 0, 11); }, 70, -22).setVisible(false);
    this.badgeText = OTR.txt(s, 70, -22, '!', 13, '#ffffff', { weight: '900' }).setVisible(false);
    const hit = s.add.zone(0, 0, 160, 52).setInteractive({ useHandCursor: true }).setScrollFactor(0);
    hit.on('pointerup', () => { if (this.o.canToggle && !this.o.canToggle()) return; OTR.audio.play('click'); this.toggle(); });
    this.tab.add([tg, ti, tt, cap, this.badge, this.badgeText, hit]);
  }

  setBadge(on) {
    this.badge.setVisible(!!on); this.badgeText.setVisible(!!on);
    if (on) this.scene.tweens.add({ targets: this.badge, scale: 1.3, duration: 300, yoyo: true, repeat: 2 });
  }

  setTabVisible(v) { this.tab.setVisible(v); }

  toggle() { if (this.isOpen) this.close(); else this.open(); }

  open(def) {
    if (def) this.show(def);
    else if (!this.current && this.o.home) this.o.home(this);
    else if (this.o.home) this.o.home(this);
    if (this.isOpen) return;
    this.isOpen = true;
    this.root.setVisible(true);
    OTR.audio.play('swoosh_up');
    this.scene.tweens.killTweensOf(this.root);
    this.scene.tweens.add({ targets: this.root, y: this.Yopen, duration: 280, ease: 'Back.out' });
    this.tab.setVisible(false);
    if (this.o.onOpen) this.o.onOpen();
  }

  close(cb) {
    if (!this.isOpen) { if (cb) cb(); return; }
    this.isOpen = false;
    this.closedAt = this.scene.time.now;
    OTR.audio.play('back');
    this.scene.tweens.killTweensOf(this.root);
    this.scene.tweens.add({
      targets: this.root, y: this.Yclosed, duration: 220, ease: 'Cubic.in',
      onComplete: () => { this.root.setVisible(false); if (cb) cb(); }
    });
    this.tab.setVisible(this.o.tabVisible ? this.o.tabVisible() : true);
    if (this.o.onClose) this.o.onClose();
  }

  /* ------------------------------------------------------------ screens */
  clear() {
    this.screen.removeAll(true);
    this.optionBtns = [];
  }

  /**
   * def: { title, color, lines: [str | {text, color, size, bold}], image: {key, w, h}, card: fn(container, x, y, w),
   *        options: [{ label, sub, color, onPick, disabled, icon }], back: fn, widget: {...}, footer }
   */
  show(def) {
    const s = this.scene;
    this.current = def;
    this.clear();
    const x0 = this.sx, y0 = this.sy, w = this.sw, h = this.sh;
    const g = OTR.tex.shape(s, (g) => {
      g.fillStyle(0xF4F1FA, 1); g.fillRoundedRect(x0, y0, w, h, 10);
      g.fillStyle(def.color !== undefined ? def.color : 0x4D148C, 1); g.fillRoundedRect(x0, y0, w, 44, { tl: 10, tr: 10, bl: 0, br: 0 });
    });
    this.screen.add(g);
    this.screen.add(OTR.txt(s, x0 + 14, y0 + 22, def.title || '', 16, '#ffffff', { ox: 0, weight: '900' }));
    const clock = this.o.clock ? this.o.clock() : '';
    this.screen.add(OTR.txt(s, x0 + w - 14, y0 + 22, clock, 13, 'rgba(255,255,255,0.85)', { ox: 1, weight: '800' }));
    let y = y0 + 58;
    if (def.back) {
      const b = OTR.txt(s, x0 + w - 14, y0 + h - 16, '⌫ Back', 13, '#7A6A90', { ox: 1, weight: '800' });
      b.setInteractive({ useHandCursor: true }).setScrollFactor(0);
      b.on('pointerup', () => { OTR.audio.play('back'); def.back(); });
      this.screen.add(b);
    }
    if (def.image) {
      const im = s.add.image(x0 + w / 2, y + def.image.h / 2, def.image.key).setDisplaySize(def.image.w, def.image.h);
      this.screen.add(im);
      y += def.image.h + 10;
    }
    if (def.card) { y = def.card(this.screen, x0 + 10, y, w - 20) + 8; }
    (def.lines || []).forEach(ln => {
      const L = typeof ln === 'string' ? { text: ln } : ln;
      const t = OTR.txt(s, x0 + 14, y, L.text, L.size || 15, L.color || '#2A1A40', { ox: 0, oy: 0, bold: !!L.bold, weight: L.bold ? '900' : 'normal', wrap: w - 28, lineSpacing: 2 });
      this.screen.add(t);
      y += t.height + 6;
    });
    if (def.widget) y = this.widget(def.widget, x0, y, w, h) + 6;
    const opts = def.options || [];
    const bh = opts.length > 4 ? 40 : 46;
    let oy = Math.max(y + 4, y0 + h - 30 - opts.length * (bh + 6));
    opts.forEach((op, i) => {
      const btn = OTR.ui.button(s, x0 + w / 2, oy + bh / 2, `${i + 1}  ${op.label}`, () => { if (!op.disabled) op.onPick && op.onPick(); }, { w: w - 20, h: bh, skin: op.skin || (i === 0 && !op.skin ? 'purple' : 'ghost'), fontSize: 15 });
      btn.bg.setScrollFactor(0);
      if (op.disabled) btn.setEnabled(false);
      this.screen.add(btn);
      this.optionBtns.push(btn);
      oy += bh + 6;
    });
    if (def.footer) this.screen.add(OTR.txt(s, x0 + 14, y0 + h - 16, def.footer, 12, '#9A8AB0', { ox: 0, bold: false }));
    return this;
  }

  widget(wd, x0, y, w, h) {
    const s = this.scene;
    if (wd.type === 'signature') {
      const ph = 150;
      const pad = OTR.tex.shape(s, (pad) => {
        pad.fillStyle(0xFFFFFF, 1); pad.fillRoundedRect(x0 + 10, y, w - 20, ph, 8);
        pad.lineStyle(2, 0xC9B3F0, 1); pad.strokeRoundedRect(x0 + 10, y, w - 20, ph, 8);
        pad.lineStyle(1, 0x9A8AB0, 1); pad.lineBetween(x0 + 30, y + ph - 34, x0 + w - 30, y + ph - 34);
      });
      this.screen.add(pad);
      this.screen.add(OTR.txt(s, x0 + 30, y + ph - 20, '✕  sign above', 11, '#9A8AB0', { ox: 0, bold: false }));
      const ink = OTR.tex.liveShape(s);
      this.screen.add(ink);
      // animated scribble
      const pts = [];
      const bx = x0 + 40, by = y + ph - 52, span = w - 90;
      for (let i = 0; i <= 60; i++) {
        const t = i / 60;
        pts.push({ x: bx + t * span, y: by - 18 * Math.sin(t * 22) * (0.5 + 0.5 * Math.sin(t * 5)) - 10 * Math.sin(t * 3) });
      }
      let k = 1;
      const ev = s.time.addEvent({
        delay: 22, repeat: pts.length - 2, callback: () => {
          const upTo = k;
          ink.redraw((g) => {
            g.lineStyle(3, 0x1D1030, 1);
            for (let j = 1; j <= upTo; j++) g.lineBetween(pts[j - 1].x, pts[j - 1].y, pts[j].x, pts[j].y);
          });
          k++;
          if (k >= pts.length && wd.onDone) wd.onDone();
        }
      });
      this.screen.once('destroy', () => ev.remove());
      return y + ph;
    }
    if (wd.type === 'stopcard') {
      const st = wd.stop;
      const card = OTR.tex.shape(s, (card) => {
        card.fillStyle(0xFFFFFF, 1); card.fillRoundedRect(x0 + 10, y, w - 20, 140, 10);
        card.lineStyle(2, 0xE0D4F2, 1); card.strokeRoundedRect(x0 + 10, y, w - 20, 140, 10);
      });
      this.screen.add(card);
      this.screen.add(OTR.txt(s, x0 + 24, y + 12, `STOP ${st.index || ''}`, 12, '#FF6600', { ox: 0, oy: 0, weight: '900' }));
      this.screen.add(OTR.txt(s, x0 + 24, y + 30, `${st.number} ${st.street}${st.unit ? ' #' + st.unit : ''}`, 19, '#1D1030', { ox: 0, oy: 0, weight: '900' }));
      this.screen.add(OTR.txt(s, x0 + 24, y + 58, st.to || '', 15, '#3A2A50', { ox: 0, oy: 0, bold: false }));
      let fx = x0 + 24;
      (wd.flags || []).forEach(f => {
        const t = OTR.txt(s, 0, 0, f.text, 11, '#ffffff', { weight: '900' });
        const fw = t.width + 16;
        const fg = OTR.tex.shape(s, (fg) => { fg.fillStyle(f.color, 1); fg.fillRoundedRect(fx, y + 84, fw, 22, 11); });
        t.setPosition(fx + fw / 2, y + 95);
        this.screen.add([fg, t]);
        fx += fw + 6;
      });
      if (st.note) this.screen.add(OTR.txt(s, x0 + 24, y + 116, '✎ ' + st.note, 12, '#6A5A80', { ox: 0, oy: 0, italic: true, bold: false, wrap: w - 50 }));
      return y + 146;
    }
    return y;
  }

  destroy() {
    if (this.root) this.root.destroy();
    if (this.tab) this.tab.destroy();
  }
};
