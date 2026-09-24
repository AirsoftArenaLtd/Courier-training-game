/*
 * Module 2 · Label Check — the inspection station.
 *
 * One package at a time on the roller. Turn it (four sides, top and base), read what is actually on it,
 * then drag it onto the handling station it belongs on. Marks sit on specific faces, so a call made
 * before you have turned it is a blind call — and it is logged as one even when it happens to be right.
 */
class LabelScene extends BaseScenarioScene {
  constructor() { super('LabelScene'); }

  create() {
    const C = this.content;
    this.setupBase();
    this.log = new OTR.ScoreLog();
    this.phase = 'intro';
    this.stats = { correct: 0, total: 0, blind: 0, speed: [], wrong: [], slow: 0 };
    this.SIDES = ['front', 'right', 'back', 'left'];
    this.FACE_NAMES = { front: 'FRONT', right: 'RIGHT SIDE', back: 'BACK', left: 'LEFT SIDE', top: 'TOP', base: 'BASE' };
    this.BOX = { x: 424, y: 348 };

    this.add.image(OTR.W / 2, OTR.H / 2, OTR.art.setting(this, 'warehouse', { color: 0x12041F, alpha: 0.55 }));
    this.hud({ timer: true });

    this.buildStation();
    this.buildBays();
    this.buildControls();
    this.setupInput();

    this.introCard(C.intro.title, C.intro.lines, () => this.startRun(), { h: 470 });
  }

  /* ---------------------------------------------------------- the station */
  buildStation() {
    OTR.tex.shape(this, (g) => {
      // rollers
      g.fillStyle(0x2A2634, 1); g.fillRect(70, 470, 700, 16);
      for (let x = 84; x < 764; x += 44) {
        g.fillStyle(0x9A96AE, 1); g.fillRoundedRect(x, 452, 32, 20, 9);
        g.fillStyle(0x5E5A72, 1); g.fillRoundedRect(x + 4, 456, 24, 6, 3);
      }
      g.fillStyle(0x3A3348, 1);
      [120, 400, 700].forEach(x => g.fillRect(x, 486, 18, 90));
    }).setDepth(1);
    // back wall shelf line (its own shape: one texture spanning both would be mostly empty, filled for nothing)
    OTR.tex.shape(this, (g) => { g.fillStyle(0x1A0F2E, 0.5); g.fillRect(16, 68, 816, 3); }).setDepth(1);

    this.progressText = OTR.txt(this, 30, 86, '', 15, '#E6DAF7', { ox: 0, weight: '900', stroke: '#1D1030', strokeW: 4 }).setDepth(810);
    this.faceLabel = OTR.txt(this, this.BOX.x, 118, '', 19, '#FFC83D', { weight: '900', stroke: '#1D1030', strokeW: 5 }).setDepth(30);
    this.blindWarn = OTR.txt(this, this.BOX.x, 146, '', 13, '#FF9447', { weight: '900', stroke: '#1D1030', strokeW: 4 }).setDepth(30);

    this.timerBar = OTR.ui.bar(this, 172, 96, 460, 12, { color: (v) => OTR.color.lerp(0xF0435A, 0x2BC48A, v), bgAlpha: 0.5, value: 1 }).setDepth(20).setVisible(false);
    this.boxImg = this.add.image(-320, this.BOX.y, 'p_dot').setDepth(20).setVisible(false);
  }

  /** The six handling stations, two columns down the right. */
  buildBays() {
    const C = this.content;
    const ids = Object.keys(C.stations);
    this.bays = {};
    const W = 200, H = 196, X0 = 848, Y0 = 76, GX = 8, GY = 8;
    ids.forEach((id, i) => {
      const st = C.stations[id];
      const col = i % 2, row = Math.floor(i / 2);
      const x = X0 + col * (W + GX), y = Y0 + row * (H + GY);
      const c = this.add.container(x + W / 2, y + H / 2).setDepth(5);
      const g = OTR.tex.liveShape(this);
      const paint = (hot) => g.redraw((g) => {
        g.fillStyle(hot ? 0x2A1546 : 0x180A2E, 0.94);
        g.fillRoundedRect(-W / 2, -H / 2, W, H, 14);
        g.lineStyle(hot ? 3 : 2, hot ? 0xFFC83D : st.color, hot ? 1 : 0.85);
        g.strokeRoundedRect(-W / 2, -H / 2, W, H, 14);
        g.fillStyle(st.color, 1);
        g.fillRoundedRect(-W / 2, -H / 2, W, 6, 3);
      });
      paint(false);
      const icon = this.add.image(0, -22, this.bayIcon(id)).setScale(0.86);
      const lab = OTR.txt(this, 0, 52, st.label, 15, '#ffffff', { weight: '900', wrap: W - 24 });
      const sub = OTR.txt(this, 0, 74, st.sub, 11, '#C9B3F0', { bold: false, wrap: W - 24 });
      const cap = OTR.ui.keyCap(this, -W / 2 + 22, -H / 2 + 26, String(i + 1), { bg: 0x4D148C, color: '#ffffff', size: 14 });
      const hit = this.add.rectangle(0, 0, W, H, 0xffffff, 0.001).setInteractive({ useHandCursor: true });
      hit.on('pointerover', () => { if (this.answering) paint(true); });
      hit.on('pointerout', () => paint(false));
      hit.on('pointerup', () => this.answer(id));
      c.add([g, icon, lab, sub, cap, hit]);
      this.bays[id] = { c, paint, rect: new Phaser.Geom.Rectangle(x, y, W, H), id };
    });
  }

  bayIcon(id) {
    const map = { fragile: 'fragile', dry: 'keepDry', upright: 'thisWayUp' };
    if (map[id]) return OTR.art.mark(this, map[id], 34);
    return OTR.tex.make(this, 'lbl_bay_' + id, 92, 78, (ctx, w, h) => {
      const cv = OTR.cv;
      if (id === 'belt') {
        ctx.fillStyle = '#4E4A60'; cv.rr(ctx, 6, 48, 80, 12, 6); ctx.fill();
        ctx.fillStyle = '#9A96AE';
        for (let x = 12; x < 82; x += 16) { cv.rr(ctx, x, 44, 12, 8, 4); ctx.fill(); }
        OTR.draw.box(ctx, { fw: 40, fh: 30, d: 12, x: 24, y: 12, color: 0xC99A62, tape: false });
      } else if (id === 'hazmat') {
        ctx.strokeStyle = '#9A96AE'; ctx.lineWidth = 3;
        for (let x = 10; x <= 82; x += 18) { ctx.beginPath(); ctx.moveTo(x, 8); ctx.lineTo(x, 70); ctx.stroke(); }
        for (let y = 10; y <= 70; y += 20) { ctx.beginPath(); ctx.moveTo(10, y); ctx.lineTo(82, y); ctx.stroke(); }
        OTR.draw.mark(ctx, 'class3', 46, 40, 24);
      } else {
        // isolate: cordoned-off warning triangle
        ctx.fillStyle = '#FFC83D';
        ctx.beginPath(); ctx.moveTo(46, 12); ctx.lineTo(80, 62); ctx.lineTo(12, 62); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#1D1030'; ctx.lineWidth = 3; ctx.stroke();
        ctx.fillStyle = '#1D1030'; ctx.font = '900 30px "Segoe UI", Arial';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('!', 46, 46);
      }
    });
  }

  buildControls() {
    const C = this.content;
    this.leftBtn = OTR.ui.iconButton(this, 118, this.BOX.y, 'ic_arrow', () => this.turn(-1), { size: 54, skin: 'dark' }).setDepth(25);
    this.rightBtn = OTR.ui.iconButton(this, 730, this.BOX.y, 'ic_arrow', () => this.turn(1), { size: 54, skin: 'dark' }).setDepth(25);
    if (this.leftBtn.icon) this.leftBtn.icon.setFlipX(true);

    // face tracker: six dots that double as direct face selectors
    this.dots = {};
    const order = ['front', 'right', 'back', 'left', 'top', 'base'];
    const letters = { front: 'F', right: 'R', back: 'B', left: 'L', top: 'T', base: 'U' };
    order.forEach((face, i) => {
      const x = this.BOX.x - 5 * 34 / 2 + i * 34 + 8, y = 542;
      const c = this.add.container(x, y).setDepth(25);
      const g = OTR.tex.liveShape(this);
      const t = OTR.txt(this, 0, 0, letters[face], 13, '#ffffff', { weight: '900' });
      const hit = this.add.circle(0, 0, 15, 0xffffff, 0.001).setInteractive({ useHandCursor: true });
      hit.on('pointerup', () => this.showFace(face));
      c.add([g, t, hit]);
      this.dots[face] = { c, g, t };
    });
    OTR.txt(this, this.BOX.x, 574, 'A / D turn it  ·  W top  ·  S base', 12, '#9A8AB0', { bold: false }).setDepth(25);
    OTR.txt(this, this.BOX.x, 596, 'drag the package onto a station, or press 1-6', 12, '#9A8AB0', { bold: false }).setDepth(25);

    this.guideBtn = OTR.ui.button(this, 740, 110, 'Guide (G)', () => this.toggleGuide(), { w: 160, h: 40, skin: 'purple', fontSize: 15, icon: 'ic_book' }).setDepth(810);
  }

  setupInput() {
    OTR.onKey(this, 'keydown-A', () => this.turn(-1));
    OTR.onKey(this, 'keydown-LEFT', () => this.turn(-1));
    OTR.onKey(this, 'keydown-D', () => this.turn(1));
    OTR.onKey(this, 'keydown-RIGHT', () => this.turn(1));
    OTR.onKey(this, 'keydown-W', () => this.showFace(this.face === 'top' ? this.SIDES[this.sideIndex] : 'top'));
    OTR.onKey(this, 'keydown-UP', () => this.showFace(this.face === 'top' ? this.SIDES[this.sideIndex] : 'top'));
    OTR.onKey(this, 'keydown-S', () => this.showFace(this.face === 'base' ? this.SIDES[this.sideIndex] : 'base'));
    OTR.onKey(this, 'keydown-DOWN', () => this.showFace(this.face === 'base' ? this.SIDES[this.sideIndex] : 'base'));
    OTR.onKey(this, 'keydown-G', () => this.toggleGuide());
    const ids = Object.keys(this.content.stations);
    ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX'].forEach((k, i) => OTR.onKey(this, 'keydown-' + k, () => this.answer(ids[i])));

    this.input.on('dragstart', (p, obj) => {
      if (obj !== this.boxImg || !this.answering) return;
      this.dragging = true;
      this.boxImg.setDepth(60);
      // shrink while carried so the station you are aiming at stays visible
      this.tweens.add({ targets: this.boxImg, scale: 0.55, duration: 140, ease: 'Quad.out' });
    });
    this.input.on('drag', (p, obj, x, y) => {
      if (obj !== this.boxImg || !this.dragging) return;
      this.boxImg.setPosition(x, y);
      Object.keys(this.bays).forEach(id => this.bays[id].paint(this.bayAt(x, y) === id));
    });
    this.input.on('dragend', (p, obj) => {
      if (obj !== this.boxImg || !this.dragging) return;
      this.dragging = false;
      this.boxImg.setDepth(20);
      const id = this.bayAt(this.boxImg.x, this.boxImg.y);
      Object.keys(this.bays).forEach(b => this.bays[b].paint(false));
      if (id) this.answer(id);
      // not taken (no station under it, or the guide was open): back on the roller, full size (it used to stay
      // parked on the station, shrunk, looking placed)
      if (this.answering) this.tweens.add({ targets: this.boxImg, x: this.BOX.x, y: this.BOX.y, scale: 1, duration: 240, ease: 'Back.out' });
    });
  }

  /** Pause: a box being dragged goes back on the roller. */
  cancelDrag() {
    if (!this.dragging) return;
    this.dragging = false;
    this.boxImg.setDepth(20);
    Object.keys(this.bays).forEach(b => this.bays[b].paint(false));
    this.tweens.add({ targets: this.boxImg, x: this.BOX.x, y: this.BOX.y, scale: 1, duration: 240, ease: 'Back.out' });
  }

  bayAt(x, y) {
    return Object.keys(this.bays).find(id => Phaser.Geom.Rectangle.Contains(this.bays[id].rect, x, y)) || null;
  }

  /* -------------------------------------------------------------- the run */
  startRun() {
    const C = this.content;
    const byTier = (t) => OTR.util.shuffle(C.items.filter(i => i.tier === t));
    const per = Math.max(1, Math.round(C.itemsPerRun / 3));
    this.queue = byTier(1).slice(0, per).concat(byTier(2).slice(0, per), byTier(3).slice(0, C.itemsPerRun - per * 2));
    this.itemIndex = -1;
    this.phase = 'run';
    this.nextItem();
  }

  nextItem() {
    const C = this.content;
    this.itemIndex++;
    if (this.itemIndex >= this.queue.length) { this.endRun(); return; }
    this.item = this.queue[this.itemIndex];
    this.seen = { front: true };
    this.sideIndex = 0;
    this.face = 'front';
    this.itemTime = 0;
    this.progressText.setText(`PACKAGE ${this.itemIndex + 1} / ${this.queue.length}`);

    this.boxImg.setTexture(this.faceTexture(this.item, 'front', this.itemIndex));
    this.boxImg.setPosition(-320, this.BOX.y).setVisible(true).setScale(1).setAngle(0).setAlpha(1);
    this.paintDots();
    this.faceLabel.setText('');
    this.blindWarn.setText('');
    OTR.audio.play('whoosh');
    this.tweens.add({
      targets: this.boxImg, x: this.BOX.x, duration: 480, ease: 'Back.out',
      onComplete: () => {
        OTR.audio.play('thud');
        this.answering = true;
        this.timerBar.setValue(1).setVisible(true);
        this.boxImg.setInteractive({ useHandCursor: true, draggable: true });
        this.input.setDraggable(this.boxImg);
        this.showFace('front', true);
      }
    });
  }

  /* --------------------------------------------------------------- faces */
  turn(dir) {
    if (!this.answering || this.guideOpen) return;
    if (this.face === 'top' || this.face === 'base') { this.showFace(this.SIDES[this.sideIndex]); return; }
    this.sideIndex = (this.sideIndex + dir + 4) % 4;
    this.showFace(this.SIDES[this.sideIndex], false, dir);
  }

  showFace(face, quiet, dir) {
    if (!this.answering || this.guideOpen) return;
    if (this.SIDES.indexOf(face) >= 0) this.sideIndex = this.SIDES.indexOf(face);
    const same = face === this.face;
    this.face = face;
    this.seen[face] = true;
    const key = this.faceTexture(this.item, face, this.itemIndex);
    const vertical = face === 'top' || face === 'base';
    if (same && !quiet) { this.boxImg.setTexture(key); }
    else if (quiet) { this.boxImg.setTexture(key); }
    else {
      if (!this._turnTween || !this._turnTween.isPlaying()) OTR.audio.play('click_dud');
      // a quick second turn stops the first one (both used to write the scale and leave the box squashed)
      else this._turnTween.stop();
      this.boxImg.setScale(1);
      this._turnTween = this.tweens.add({
        targets: this.boxImg,
        scaleX: vertical ? 1 : 0.14, scaleY: vertical ? 0.14 : 1,
        duration: 110, yoyo: true, ease: 'Sine.inOut',
        onYoyo: () => this.boxImg.setTexture(key)
      });
    }
    this.faceLabel.setText(this.FACE_NAMES[face]);
    this.paintDots();
  }

  paintDots() {
    Object.keys(this.dots).forEach(face => {
      const d = this.dots[face];
      const seen = !!(this.seen && this.seen[face]);
      const cur = this.face === face;
      d.g.redraw((g) => {
        g.fillStyle(cur ? 0xFF6600 : seen ? 0x2BC48A : 0x2A1546, 1);
        g.fillCircle(0, 0, 14);
        g.lineStyle(2, cur ? 0xFFC83D : seen ? 0x2BC48A : 0x4A2A70, 1);
        g.strokeCircle(0, 0, 14);
      });
      d.t.setColor(seen || cur ? '#ffffff' : '#9A8AB0');
    });
  }

  /** One drawn face of the package, including whatever marks and damage sit on it. */
  faceTexture(item, face, idx) {
    const marks = (item.marks && item.marks[face]) || [];
    const dmg = item.damage && item.damage.face === face ? item.damage.kind : null;
    const key = `lbl_${idx}_${face}_${marks.join('-')}_${dmg || ''}`;
    return OTR.tex.make(this, key, 360, 320, (ctx, w, h) => {
      const cv = OTR.cv;
      const fw = 272, fh = 216, d = 26;
      const x = 34, y = 56;
      const color = 0xC99A62;
      // shadow
      cv.ellipse(ctx, x + fw / 2 + d / 2, y + fh + 16, fw / 2, 16);
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fill();
      // depth edges
      ctx.beginPath(); ctx.moveTo(x + fw, y); ctx.lineTo(x + fw + d, y - d * 0.55); ctx.lineTo(x + fw + d, y + fh - d * 0.55); ctx.lineTo(x + fw, y + fh); ctx.closePath();
      ctx.fillStyle = cv.c(OTR.color.shade(color, -0.32)); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + d, y - d * 0.55); ctx.lineTo(x + fw + d, y - d * 0.55); ctx.lineTo(x + fw, y); ctx.closePath();
      ctx.fillStyle = cv.c(OTR.color.shade(color, 0.2)); ctx.fill();
      // the face itself
      ctx.fillStyle = cv.lin(ctx, 0, y, 0, y + fh, [[0, OTR.color.shade(color, 0.06)], [1, OTR.color.shade(color, -0.12)]]);
      ctx.fillRect(x, y, fw, fh);
      ctx.strokeStyle = 'rgba(70,40,10,0.35)'; ctx.lineWidth = 2; ctx.strokeRect(x, y, fw, fh);
      // corrugation grain
      ctx.strokeStyle = 'rgba(120,80,30,0.10)'; ctx.lineWidth = 1;
      for (let i = 1; i < 14; i++) { ctx.beginPath(); ctx.moveTo(x + 4, y + i * (fh / 14)); ctx.lineTo(x + fw - 4, y + i * (fh / 14)); ctx.stroke(); }
      // tape: a seam down the middle on the sides, a cross on top and base
      ctx.fillStyle = 'rgba(255,240,200,0.32)';
      if (face === 'top' || face === 'base') {
        ctx.fillRect(x + fw / 2 - 13, y, 26, fh);
        if (face === 'base') { ctx.fillRect(x, y + fh / 2 - 13, fw, 26); }
      } else {
        ctx.fillRect(x + fw / 2 - 13, y, 26, fh * 0.3);
      }
      if (face === 'base') {
        ctx.strokeStyle = 'rgba(70,40,10,0.5)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x, y + fh / 2); ctx.lineTo(x + fw, y + fh / 2); ctx.stroke();
      }
      // shipping label on the front
      if (face === 'front') {
        OTR.labelArt.draw(ctx, {
          to: 'M. BELL', number: '214', street: 'Maple Ave', city: 'MAPLE GROVE',
          service: 'standard', weight: 8, pieces: 1, piece: 1, tracking: '7742 9016 ' + (3100 + idx * 7)
        }, x + 16, y + fh - 104, 150, 92);
      }
      // marks
      const spots = marks.length === 1 ? [[x + fw / 2 + 40, y + fh / 2 - 20]]
        : marks.length === 2 ? [[x + fw * 0.34, y + fh * 0.34], [x + fw * 0.68, y + fh * 0.62]]
          : [[x + fw * 0.3, y + fh * 0.3], [x + fw * 0.68, y + fh * 0.3], [x + fw * 0.5, y + fh * 0.68]];
      marks.forEach((m, i) => OTR.draw.mark(ctx, m, spots[i][0], spots[i][1], 42));
      // damage
      if (dmg === 'leak') {
        ctx.save();
        ctx.beginPath(); ctx.rect(x, y, fw, fh); ctx.clip();
        ctx.fillStyle = 'rgba(18,44,80,0.62)';
        ctx.beginPath();
        ctx.moveTo(x + fw * 0.18, y + fh);
        ctx.bezierCurveTo(x + fw * 0.08, y + fh * 0.5, x + fw * 0.5, y + fh * 0.36, x + fw * 0.62, y + fh * 0.66);
        ctx.bezierCurveTo(x + fw * 0.72, y + fh * 0.88, x + fw * 0.86, y + fh, x + fw * 0.86, y + fh);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(40,110,190,0.5)';
        ctx.beginPath(); ctx.ellipse(x + fw * 0.44, y + fh * 0.72, fw * 0.2, fh * 0.1, 0.2, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        cv.ellipse(ctx, x + fw / 2, y + fh + 18, fw * 0.34, 12);
        ctx.fillStyle = 'rgba(40,110,190,0.8)'; ctx.fill();
      } else if (dmg === 'crushed') {
        ctx.fillStyle = 'rgba(40,20,5,0.4)';
        ctx.beginPath();
        ctx.moveTo(x + fw * 0.24, y + fh * 0.16); ctx.lineTo(x + fw * 0.62, y + fh * 0.34);
        ctx.lineTo(x + fw * 0.8, y + fh * 0.14); ctx.lineTo(x + fw * 0.66, y + fh * 0.66);
        ctx.lineTo(x + fw * 0.34, y + fh * 0.5); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(50,22,5,0.85)'; ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x + fw * 0.28, y + fh * 0.1); ctx.lineTo(x + fw * 0.4, y + fh * 0.44); ctx.lineTo(x + fw * 0.24, y + fh * 0.7); ctx.lineTo(x + fw * 0.34, y + fh * 0.92);
        ctx.moveTo(x + fw * 0.62, y + fh * 0.2); ctx.lineTo(x + fw * 0.76, y + fh * 0.52); ctx.lineTo(x + fw * 0.68, y + fh * 0.8);
        ctx.stroke();
        ctx.fillStyle = 'rgba(20,10,4,0.55)';
        ctx.beginPath(); ctx.moveTo(x + fw * 0.44, y + fh * 0.38); ctx.lineTo(x + fw * 0.58, y + fh * 0.46); ctx.lineTo(x + fw * 0.5, y + fh * 0.6); ctx.closePath(); ctx.fill();
      }
    });
  }

  /* -------------------------------------------------------------- answers */
  answer(stationId) {
    if (!this.answering || this.guideOpen || !this.content.stations[stationId]) return;
    this.resolve(stationId);
  }

  resolve(stationId) {
    const C = this.content, item = this.item;
    this.answering = false;
    this.dragging = false;
    this.timerBar.setVisible(false);
    this.blindWarn.setText('');
    this.boxImg.disableInteractive();
    this.stats.total++;

    const ok = stationId === item.answer;
    // a blind call is deciding before all six sides have been seen, as the intro and the "sides still unchecked"
    // warning say (it used to count only sides that happened to carry a mark, so an unmarked box called from its
    // front scored as a careful inspection)
    const unseen = Object.keys(this.FACE_NAMES).filter(f => !this.seen[f]);
    // (a timed-out box was never called at all, so it is not a blind call)
    const blind = !!stationId && unseen.length > 0;
    const t = this.itemTime;
    const speed = ok ? OTR.util.clamp01(1 - (t - 4) / (C.timePerItem - 4)) : 0;
    this.stats.speed.push(speed);
    if (!stationId) this.stats.slow++;

    this.log.check('safety', ok ? 2 : 0, 2,
      `${C.stations[item.answer].label} · ${this.marksSummary(item) || 'no marks'}`,
      { lesson: ok ? null : this.lessonFor(item) });
    this.log.check('efficiency', ok ? Math.max(1, Math.round(speed * 3)) : 0, 3,
      `Read package ${this.itemIndex + 1} in ${Math.round(t)}s`, { lesson: null });
    if (blind) {
      this.stats.blind++;
      this.log.penalty('safety', 1, `Called it without checking ${this.faceList(unseen)}`, { lesson: C.lessons.sixSides });
    }

    if (ok) {
      this.stats.correct++;
      const pts = 200 + Math.round(speed * 150) - (blind ? 100 : 0);
      this.addScore(pts);
      OTR.audio.play(blind ? 'coin' : 'success');
      if (!blind) OTR.fx.burst(this, this.BOX.x, this.BOX.y, { tint: 0x2BC48A, count: 22 });
    } else {
      this.stats.wrong.push(item);
      OTR.audio.play('fail');
      OTR.fx.shake(this, 200, 0.008);
    }

    // send the box to the station it was put on, then judge it; a timed-out one rolls off the far end of the
    // roller (it used to fly onto the right station, as if it had been placed there)
    const target = stationId ? this.bays[stationId].c : { x: OTR.W + 220, y: this.BOX.y };
    this.tweens.add({
      targets: this.boxImg, x: target.x, y: target.y, scale: stationId ? 0.42 : 1, duration: stationId ? 320 : 520, ease: 'Cubic.in',
      onComplete: () => { this.boxImg.setVisible(false); }
    });
    this.bays[item.answer].paint(true);
    this.time.delayedCall(340, () => this.verdict(stationId, ok, blind, unseen));
  }

  marksSummary(item) {
    const bits = [];
    Object.keys(item.marks || {}).forEach(f => (item.marks[f] || []).forEach(m => bits.push(`${this.markName(m)} (${this.FACE_NAMES[f].toLowerCase()})`)));
    if (item.damage) bits.push(`${item.damage.kind} (${this.FACE_NAMES[item.damage.face].toLowerCase()})`);
    return bits.join(', ');
  }

  markName(id) {
    const C = this.content;
    const g = C.guide.find(x => x.mark === id);
    return g ? g.name : (C.markNames && C.markNames[id]) || id;
  }

  /** ['right', 'back', 'base'] → "the right side, the back and the base" */
  faceList(faces) {
    const names = faces.map(f => 'the ' + this.FACE_NAMES[f].toLowerCase());
    return names.length > 1 ? names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1] : names[0] || '';
  }

  lessonFor(item) {
    const C = this.content;
    if (item.answer === 'isolate') return C.lessons.damage;
    if (item.answer === 'hazmat') return C.lessons.hazmat;
    if (item.answer === 'upright') return C.lessons.orientation;
    return C.lessons.sixSides;
  }

  /** The coaching card: what was on the package, where it was, and where it belonged. */
  verdict(stationId, ok, blind, unseen) {
    const C = this.content, item = this.item;
    const w = 800, h = 320;
    const col = ok ? (blind ? 0xFFB020 : 0x2BC48A) : 0xF0435A;
    const c = this.add.container(this.BOX.x, 320).setDepth(70);
    c.add(OTR.ui.panel(this, 0, 0, w, h, { top: 0xFFFFFF, bottom: 0xF6F1FD, border: col, borderWidth: 4, radius: 18 }));
    const head = !stationId ? 'TOO SLOW' : ok ? (blind ? 'RIGHT — BUT BLIND' : 'CORRECT') : 'WRONG STATION';
    c.add(OTR.txt(this, -w / 2 + 28, -h / 2 + 24, head, 17, OTR.color.css(col), { ox: 0, weight: '900' }));
    c.add(OTR.txt(this, w / 2 - 28, -h / 2 + 24, `BELONGS ON: ${C.stations[item.answer].label}`, 15, '#250849', { ox: 1, weight: '900' }));

    // what was actually on it
    const found = [];
    Object.keys(item.marks || {}).forEach(f => (item.marks[f] || []).forEach(m => found.push({ mark: m, face: f })));
    if (item.damage) found.push({ damage: item.damage.kind, face: item.damage.face });
    const y0 = -h / 2 + 96;
    if (!found.length) {
      c.add(OTR.txt(this, -w / 2 + 28, y0 - 14, 'No handling marks on any of the six sides.', 16, '#5A4A70', { ox: 0, oy: 0, bold: false }));
    }
    found.slice(0, 4).forEach((f, i) => {
      const x = -w / 2 + 108 + i * 172;
      if (f.mark) c.add(this.add.image(x, y0, OTR.art.mark(this, f.mark, 26)).setScale(0.9));
      else {
        const g = OTR.tex.shape(this, (g) => { g.fillStyle(f.damage === 'leak' ? 0x2E6EB4 : 0x8A5A2A, 1); g.fillCircle(x, y0, 22); });
        c.add([g, OTR.txt(this, x, y0, f.damage === 'leak' ? '💧' : '✗', 20, '#ffffff', { weight: '900' })]);
      }
      c.add(OTR.txt(this, x, y0 + 36, f.mark ? this.markName(f.mark) : f.damage.toUpperCase(), 12, '#250849', { weight: '900', wrap: 156 }));
      c.add(OTR.txt(this, x, y0 + 56, 'on the ' + this.FACE_NAMES[f.face].toLowerCase(), 11, this.seen[f.face] ? '#5A4A70' : '#C8243B', { bold: false }));
    });

    const body = OTR.txt(this, -w / 2 + 28, y0 + 92, item.explain, 16, '#3A2A50', { ox: 0, oy: 0, bold: false, wrap: w - 56, lineSpacing: 3 });
    c.add(body);
    if (blind) c.add(OTR.txt(this, -w / 2 + 28, y0 + 92 + body.height + 8, `Blind call — you never looked at ${this.faceList(unseen)}.`, 14, '#B07000', { ox: 0, oy: 0, weight: '900', wrap: w - 56 }));
    c.add(OTR.txt(this, w / 2 - 28, h / 2 - 22, 'click / SPACE ▶', 12, '#9A8AB0', { ox: 1 }));

    c.setAlpha(0).setY(300);
    this.tweens.add({ targets: c, alpha: 1, y: 320, duration: 200 });

    let done = false;
    const go = () => {
      if (done) return;
      done = true;
      this.input.off('pointerdown', clickGo);
      this.input.keyboard.off('keydown-SPACE', go);
      this.input.keyboard.off('keydown-ENTER', go);
      if (auto) auto.remove();
      this.bays[item.answer].paint(false);
      this.tweens.add({ targets: c, alpha: 0, duration: 150, onComplete: () => c.destroy() });
      this.time.delayedCall(180, () => this.nextItem());
    };
    const clickGo = () => go();
    const auto = this.time.delayedCall(ok && !blind ? 4000 : 9000, go);
    this.time.delayedCall(400, () => {
      if (done) return;
      this.input.on('pointerdown', clickGo);
      this.input.keyboard.on('keydown-SPACE', go);
      this.input.keyboard.on('keydown-ENTER', go);
    });
  }

  /* --------------------------------------------------------------- finish */
  endRun() {
    const C = this.content, s = this.stats;
    this.phase = 'done';
    this.progressText.setText('');
    this.faceLabel.setText('');
    OTR.fx.stamp(this, this.BOX.x, 300, 'INSPECTION COMPLETE', 0xFF6600, { size: 40, hold: 1400 });
    OTR.audio.play('fanfare');

    const ratios = this.log.ratios(['safety', 'efficiency']);
    const summary = `${s.correct}/${s.total} placed right · ${s.blind} blind call${s.blind === 1 ? '' : 's'} · all six sides checked on ${s.total - s.blind} of ${s.total}`;
    this.finish({ ratios, log: this.log, lessons: this.log.mistakes().length ? [] : [C.lessons.perfect], summary, stats: s }, 1600);
  }

  /* ---------------------------------------------------------------- guide */
  toggleGuide() {
    if (this.phase === 'done' || this.finished) return;
    if (this.guideOpen) { this.guideModal.close(); return; }
    const C = this.content;
    this.guideOpen = true;
    OTR.audio.play('pop');
    this.guideModal = OTR.ui.modal(this, {
      title: 'Label Guide', w: 1120, h: 660, depth: 6000,
      build: (box, api, w, h) => {
        const cols = 3;
        C.guide.forEach((g, i) => {
          const col = i % cols, row = Math.floor(i / cols);
          const x = -w / 2 + 56 + col * 348, y = -h / 2 + 118 + row * 128;
          box.add(this.add.image(x + 28, y, OTR.art.mark(this, g.mark, 38)).setScale(0.92));
          const name = OTR.txt(this, x + 82, y - 34, g.name, 15, '#250849', { ox: 0, oy: 0, weight: '900', wrap: 240 });
          box.add(name);
          box.add(OTR.txt(this, x + 82, name.y + name.height + 2, g.meaning, 13, '#5A4A70', { ox: 0, oy: 0, bold: false, wrap: 240, lineSpacing: 2 }));
        });
        const y = -h / 2 + 118 + Math.ceil(C.guide.length / cols) * 128 - 20;
        box.add(OTR.txt(this, 0, y, 'MORE THAN ONE MARK? THE MOST RESTRICTIVE ONE DECIDES', 14, '#FF6600', { weight: '900' }));
        const chain = C.precedence.map(id => C.stations[id].label).join('   >   ');
        box.add(OTR.txt(this, 0, y + 28, chain, 15, '#250849', { weight: '900', wrap: w - 100 }));
      },
      buttons: [{ label: 'Close (G)', skin: 'orange', onClick: () => {} }]
    });
    this.guideModal.root.once('destroy', () => { this.guideOpen = false; });
  }

  /* ----------------------------------------------------------------- loop */
  update(time, delta) {
    if (this.phase !== 'run' || !this.answering || this.guideOpen) return;
    const C = this.content;
    const dt = Math.min(0.05, delta / 1000);
    this.itemTime += dt;
    const left = C.timePerItem - this.itemTime;
    this.timerBar.setValue(OTR.util.clamp01(left / C.timePerItem));
    this.setTimer(Math.max(0, left), left <= 5);
    if (left <= 4 && Math.floor(left * 2) !== this._lastTick) { this._lastTick = Math.floor(left * 2); OTR.audio.play('tick'); }
    const unchecked = Object.keys(this.FACE_NAMES).filter(f => !this.seen[f]).length;
    this.blindWarn.setText(unchecked ? `${unchecked} side${unchecked === 1 ? '' : 's'} still unchecked` : '');
    if (left <= 0) this.resolve(null);
  }
}
OTR.registerScene(LabelScene);
