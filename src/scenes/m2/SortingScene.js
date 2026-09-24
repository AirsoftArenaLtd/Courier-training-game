class SortingScene extends BaseScenarioScene {
  constructor() { super('SortingScene'); }

  create() {
    const W = OTR.W;
    const C = this.content;
    this.setupBase();

    this.BELT_Y = 272;
    this.BELT_END = 1172;
    this.state = 'intro';
    this.waveIndex = -1;
    this.waveTime = 0;
    this.spawnTimer = 0;
    this.beltSpeed = 0;
    this.packages = [];
    this.streak = 0;
    this.bestStreak = 0;
    this.sinceDamage = 0;
    this.jammed = null;
    this.jamTimer = 0;
    this.stats = {
      correct: 0, wrong: 0, missed: 0, excTotal: 0, excCorrect: 0,
      damageErr: 0, priorityErr: 0, routeErr: 0, dgErr: 0, heavyErr: 0,
      scanned: 0, blind: 0, jams: 0, jamsCleared: 0
    };
    this.totalTime = C.waves.reduce((n, w) => n + w.duration, 0);
    this.elapsed = 0;

    // backdrop
    this.add.image(W / 2, OTR.H / 2, OTR.art.setting(this, 'warehouse', { color: 0x12041F, alpha: 0.45 }));

    this.buildBelt();
    this.buildBins();
    this.buildScanner();
    this.hud({ timer: true });
    this.setTimer(this.totalTime);

    // combo meter
    this.comboText = OTR.txt(this, W - 24, 84, '', 22, '#FFC83D', { ox: 1, weight: '900', stroke: '#1D1030', strokeW: 5 }).setDepth(810);
    this.waveText = OTR.txt(this, 24, 84, '', 16, '#E6DAF7', { ox: 0, weight: '900', stroke: '#1D1030', strokeW: 4 }).setDepth(810);

    // front-of-belt indicator
    this.indicator = this.add.image(0, 0, 'p_glow').setTint(0xFFC83D).setBlendMode('ADD').setScale(2.4).setVisible(false).setDepth(4);
    this.tweens.add({ targets: this.indicator, alpha: 0.45, duration: 380, yoyo: true, repeat: -1 });

    this.setupInput();

    this.introCard(C.intro.title, C.intro.lines, () => this.startWave(0));
  }

  /* ------------------------------------------------------------ construction */
  buildBelt() {
    const y = this.BELT_Y;
    OTR.tex.make(this, 'belt_tile', 60, 60, (ctx, w, h) => {
      ctx.fillStyle = OTR.cv.lin(ctx, 0, 0, 0, h, [[0, '#3C3748'], [0.5, '#2A2634'], [1, '#221E2B']]);
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(0, 0, 4, h);
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(4, 0, 2, h);
    });
    OTR.tex.shape(this, (g) => {
      // legs
      g.fillStyle(0x2A2634, 1);
      for (let x = 60; x < this.BELT_END; x += 220) g.fillRect(x, y + 40, 16, 110);
    }).setDepth(1);
    this.belt = this.add.tileSprite(this.BELT_END / 2, y + 4, this.BELT_END, 60, 'belt_tile').setDepth(2);
    // rails (top at y - 32, bottom band to y + 52), drawn once
    const railKey = OTR.tex.make(this, `sort_rail_${this.BELT_END}`, this.BELT_END, 84, (ctx) => {
      ctx.fillStyle = OTR.cv.lin(ctx, 0, 0, 0, 8, [[0, 0xC9C6D6], [1, 0x7A7690]]);
      ctx.fillRect(0, 0, this.BELT_END, 8);
      ctx.fillStyle = OTR.cv.lin(ctx, 0, 66, 0, 84, [[0, 0x9A96AE], [1, 0x4E4A60]]);
      ctx.fillRect(0, 66, this.BELT_END, 18);
      ctx.fillStyle = OTR.cv.c(0xFFC83D);
      for (let x = 0; x < this.BELT_END; x += 40) ctx.fillRect(x, 70, 20, 4);
    });
    this.add.image(0, y - 32, railKey).setOrigin(0, 0).setDepth(3);
    // end chute
    OTR.tex.shape(this, (ch) => {
      ch.fillStyle(0x4E4A60, 1);
      ch.beginPath(); ch.moveTo(this.BELT_END, y - 20); ch.lineTo(OTR.W, y + 110); ch.lineTo(OTR.W, y + 170); ch.lineTo(this.BELT_END, y + 52); ch.closePath(); ch.fillPath();
    }).setDepth(1);
    const sign = this.add.container(1226, y - 90).setDepth(5);
    const sg = OTR.tex.shape(this, (sg) => { sg.fillStyle(0xF0435A, 1); sg.fillRoundedRect(-52, -18, 104, 36, 8); });
    sign.add([sg, OTR.txt(this, 0, 0, 'OVERFLOW', 14, '#ffffff', { weight: '900' })]);
  }

  /** Hand scanner parked at the near end of the belt; it swings up to whatever you scan. */
  buildScanner() {
    const key = OTR.tex.make(this, 'sort_gun', 120, 96, (ctx) => {
      const cv = OTR.cv;
      cv.shadow(ctx, 10, 4, 0.4);
      cv.rr(ctx, 14, 10, 92, 34, 8);                       // body
      ctx.fillStyle = cv.lin(ctx, 0, 10, 0, 44, [[0, '#4A4656'], [1, '#2A2730']]); ctx.fill();
      cv.noShadow(ctx);
      cv.rr(ctx, 30, 40, 30, 46, 7); ctx.fillStyle = '#3A3644'; ctx.fill();   // grip
      cv.rr(ctx, 26, 48, 10, 18, 4); ctx.fillStyle = '#FF6600'; ctx.fill();   // trigger
      cv.rr(ctx, 96, 16, 14, 22, 4); ctx.fillStyle = '#8A2030'; ctx.fill();   // window
      cv.rr(ctx, 22, 16, 44, 16, 4); ctx.fillStyle = '#6BE0A8'; ctx.fill();   // screen
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(26, 20, 34, 3); ctx.fillRect(26, 26, 22, 3);
    });
    this.gun = this.add.image(96, 646, key).setDepth(60).setScale(1.05);
    this.laser = this.add.graphics().setDepth(59);
    this.jamBanner = this.add.container(OTR.W / 2, 150).setDepth(820).setVisible(false);
    const jg = OTR.tex.shape(this, (jg) => {
      jg.fillStyle(0x7A1020, 0.95); jg.fillRoundedRect(-230, -30, 460, 60, 16);
      jg.lineStyle(3, 0xFF6B7F, 1); jg.strokeRoundedRect(-230, -30, 460, 60, 16);
    });
    this.jamText = OTR.txt(this, 0, 0, '', 20, '#ffffff', { weight: '900' });
    this.jamBanner.add([jg, this.jamText]);
  }

  buildBins() {
    const C = this.content;
    this.bins = {};
    Object.keys(C.bins).forEach((id) => {
      const def = C.bins[id];
      const key = OTR.tex.make(this, 'bin_' + id, 200, 190, (ctx) => {
        const cv = OTR.cv;
        cv.shadow(ctx, 16, 8, 0.4);
        ctx.beginPath();
        ctx.moveTo(10, 40); ctx.lineTo(190, 40); ctx.lineTo(176, 178); ctx.lineTo(24, 178); ctx.closePath();
        ctx.fillStyle = cv.lin(ctx, 0, 40, 0, 178, [[0, OTR.color.shade(def.color, 0.15)], [1, OTR.color.shade(def.color, -0.35)]]);
        ctx.fill();
        cv.noShadow(ctx);
        cv.ellipse(ctx, 100, 40, 90, 22);
        ctx.fillStyle = cv.c(OTR.color.shade(def.color, -0.55)); ctx.fill();
        ctx.lineWidth = 5; ctx.strokeStyle = cv.c(OTR.color.shade(def.color, 0.35)); ctx.stroke();
        cv.rr(ctx, 30, 84, 140, 64, 10);
        ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.fill();
      });
      const c = this.add.container(0, 560).setDepth(6);
      const img = this.add.image(0, 0, key);
      const label = OTR.txt(this, 0, def.sub ? 10 : 20, def.label, def.label.length > 8 ? 17 : 21, OTR.color.css(OTR.color.shade(def.color, -0.35)), { weight: '900' });
      c.add([img, label]);
      if (def.sub) c.add(OTR.txt(this, 0, 34, def.sub, 12, '#6A5A80', { bold: false }));
      const cap = OTR.ui.keyCap(this, 0, -84, '?');
      c.add(cap);
      const glow = this.add.image(0, -40, 'p_glow').setTint(def.color).setBlendMode('ADD').setScale(4.2, 2).setAlpha(0);
      c.addAt(glow, 0);
      c.setVisible(false);
      this.bins[id] = { id, def, c, cap, glow, active: false, x: 0 };
    });
    this.activeBins = [];
  }

  layoutBins(ids, animate) {
    const n = ids.length;
    const span = 1140;
    // bins this wave does not use leave the floor (they used to stay parked, drawn over the new layout)
    Object.values(this.bins).forEach(b => {
      if (!b.active || ids.indexOf(b.id) >= 0) return;
      b.active = false;
      this.tweens.killTweensOf(b.c);
      this.tweens.add({ targets: b.c, y: 780, duration: 420, ease: 'Cubic.in', onComplete: () => b.c.setVisible(false) });
    });
    ids.forEach((id, i) => {
      const b = this.bins[id];
      const x = 70 + (span / n) * (i + 0.5);
      b.x = x;
      b.cap.list[1].setText(String(i + 1));
      if (!b.active) {
        b.active = true;
        this.tweens.killTweensOf(b.c);
        b.c.setVisible(true);
        if (animate) {
          b.c.setPosition(x, -200);
          this.tweens.add({ targets: b.c, y: 560, duration: 650, ease: 'Bounce.out', onComplete: () => { OTR.audio.play('thud'); OTR.fx.shake(this, 120, 0.004); OTR.fx.burst(this, x, 640, { tint: b.def.color, count: 20, texture: 'p_smoke', blend: 'NORMAL' }); } });
        } else {
          b.c.setPosition(x, 560);
        }
      } else {
        this.tweens.add({ targets: b.c, x, duration: 500, ease: 'Cubic.inOut' });
      }
    });
    this.activeBins = ids.slice();
  }

  /* ------------------------------------------------------------ input */
  setupInput() {
    this.input.on('dragstart', (pointer, obj) => {
      const p = obj.pkg;
      if (!p || this.state !== 'play' || p.jammed) return;
      p.dragging = true;
      obj.setDepth(50);
      this.tweens.add({ targets: obj, scale: 1.15, duration: 100 });
      OTR.audio.play('pop');
    });
    this.input.on('drag', (pointer, obj, dx, dy) => {
      const p = obj.pkg;
      if (!p || !p.dragging) return;
      obj.x = dx; obj.y = dy;
      const over = this.binAt(pointer.x, pointer.y);
      this.activeBins.forEach(id => {
        const b = this.bins[id];
        const on = over === id;
        if (on !== !!b.hot) {
          b.hot = on;
          this.tweens.add({ targets: b.glow, alpha: on ? 0.9 : 0, duration: 120 });
          this.tweens.add({ targets: b.c, scale: on ? 1.08 : 1, duration: 120 });
        }
      });
    });
    this.input.on('dragend', (pointer, obj) => {
      const p = obj.pkg;
      if (!p || !p.dragging) return;
      p.dragging = false;
      this.clearBinHover();
      const binId = this.binAt(pointer.x, pointer.y);
      if (binId && this.state === 'play') {
        this.sortPackage(p, binId);
      } else {
        obj.setDepth(10);
        this.tweens.add({ targets: obj, y: this.BELT_Y + p.yOff, scale: 1, duration: 200, ease: 'Back.out' });
      }
    });

    ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE'].forEach((k, i) => {
      OTR.onKey(this, 'keydown-' + k, () => {
        if (this.state !== 'play') return;
        const id = this.activeBins[i];
        const p = this.frontPackage();
        if (id && p) this.sortPackage(p, id);
      });
    });

    // a click is a scan; a drag is a sort
    this.input.on('gameobjectup', (pointer, obj) => {
      const p = obj.pkg;
      if (!p || this.state !== 'play') return;
      if (Phaser.Math.Distance.Between(pointer.downX, pointer.downY, pointer.upX, pointer.upY) > 12) return;
      if (p.jammed) this.clearJam(true); else this.scanPackage(p);
    });
    OTR.onKey(this, 'keydown-SPACE', () => {
      if (this.state !== 'play') return;
      if (this.jammed) { this.clearJam(true); return; }
      const p = this.frontPackage();
      if (p) this.scanPackage(p);
    });
  }

  /** Read the label: the route and the weight only exist once you have scanned them. */
  scanPackage(p) {
    if (!p || p.done) return;
    const gx = this.gun.x, gy = this.gun.y - 30;
    this.tweens.add({ targets: this.gun, angle: Phaser.Math.Angle.Between(gx, gy, p.img.x, p.img.y) * 57.3 + 10, duration: 120, yoyo: true, hold: 120 });
    this.laser.clear();
    this.laser.lineStyle(3, 0xFF3B4E, 0.85);
    this.laser.lineBetween(gx + 40, gy, p.img.x, p.img.y + 10);
    this.time.delayedCall(140, () => this.laser.clear());
    if (p.scanned) { OTR.audio.play('click_dud'); return; }

    p.scanned = true;
    this.stats.scanned++;
    OTR.audio.play('scan');
    p.img.setTexture(this.pkgTexture(p, true));
    OTR.fx.ring(this, p.img.x, p.img.y, 0x6BE0A8, 44);
    this.showTag(p);
  }

  /** The little readout that rides above a scanned package. */
  showTag(p) {
    const C = this.content;
    const bin = C.bins[this.correctBin(p)];
    const line = p.heavy ? `${p.weight} LB · TEAM LIFT` : `R${p.route} · ${p.weight} LB`;
    const c = this.add.container(p.img.x, this.BELT_Y - 66).setDepth(40);
    const t = OTR.txt(this, 0, 0, line, 13, '#ffffff', { weight: '900' });
    const w = t.width + 22;
    const g = OTR.tex.shape(this, (g) => {
      g.fillStyle(0x16062B, 0.92); g.fillRoundedRect(-w / 2, -13, w, 26, 8);
      g.lineStyle(2, bin.color, 1); g.strokeRoundedRect(-w / 2, -13, w, 26, 8);
    });
    c.add([g, t]);
    c.setScale(0.7);
    this.tweens.add({ targets: c, scale: 1, duration: 140, ease: 'Back.out' });
    p.tag = c;
  }

  pkgTexture(p, scanned) {
    const C = this.content;
    return OTR.art.pkg(this, {
      size: p.size,
      route: scanned ? p.route : null,
      routeColor: C.routeColors[p.route],
      priority: p.priority,
      damage: p.damage,
      marks: p.marks,
      color: p.tint
    });
  }

  /* ------------------------------------------------------------ jams */
  startJam() {
    const p = this.frontPackage();
    if (!p) { this.jamTimer = 4; return; }
    this.jammed = p;
    p.jammed = true;
    this.stats.jams++;
    this.jamTimer = this.content.jam.window;
    this.tweens.add({ targets: p.img, angle: 78, duration: 180 });
    this.jamBanner.setVisible(true);
    this.jamText.setText('JAM — click the package (or SPACE) to clear it');
    OTR.audio.play('buzzer');
    OTR.fx.shake(this, 260, 0.006);
    this.jamRing = this.add.image(p.img.x, p.img.y, 'p_glow').setTint(0xFF6B7F).setBlendMode('ADD').setScale(3).setDepth(39);
    this.tweens.add({ targets: this.jamRing, alpha: 0.3, scale: 4, duration: 420, yoyo: true, repeat: -1 });
  }

  clearJam(byPlayer) {
    const p = this.jammed;
    this.jammed = null;
    this.jamBanner.setVisible(false);
    if (this.jamRing) { this.jamRing.destroy(); this.jamRing = null; }
    if (p && !p.done) {
      p.jammed = false;
      this.tweens.add({ targets: p.img, angle: 0, duration: 160 });
    }
    if (byPlayer) {
      this.stats.jamsCleared++;
      OTR.audio.play('success');
      OTR.fx.floatText(this, OTR.W / 2, 200, 'Jam cleared', '#8BF0C6', { size: 24 });
    } else {
      this.addScore(-this.content.jam.penalty, OTR.W / 2, 210);
      OTR.audio.play('fail');
      OTR.ui.toast(this, 'The belt backed up while that jam sat there.', { color: 0x7A1020, border: 0xFF6B7F, hold: 1600 });
    }
    this.scheduleJam();
  }

  scheduleJam() {
    const j = this.wave && this.wave.jamEvery;
    this.jamAt = j ? this.waveTime + j[0] + Math.random() * (j[1] - j[0]) : null;
  }

  clearBinHover() {
    Object.values(this.bins).forEach(b => {
      if (b.hot) {
        b.hot = false;
        this.tweens.add({ targets: b.glow, alpha: 0, duration: 120 });
        this.tweens.add({ targets: b.c, scale: 1, duration: 120 });
      }
    });
  }

  binAt(x, y) {
    if (y < 430) return null;
    let best = null, bestD = 1e9;
    this.activeBins.forEach(id => {
      const d = Math.abs(this.bins[id].x - x);
      if (d < 110 && d < bestD) { best = id; bestD = d; }
    });
    return best;
  }

  frontPackage() {
    let best = null;
    this.packages.forEach(p => { if (!p.dragging && !p.done && (!best || p.img.x > best.img.x)) best = p; });
    return best;
  }

  /* ------------------------------------------------------------ waves */
  startWave(i) {
    const C = this.content;
    const wave = C.waves[i];
    this.waveIndex = i;
    this.waveTime = 0;
    this.wave = wave;
    if (this.jammed) this.clearJam(true);
    this.scheduleJam();
    this.layoutBins(wave.bins, i > 0);
    this.waveText.setText(`WAVE ${i + 1} / ${C.waves.length}`);
    if (i === 0) {
      this.state = 'play';
      this.spawnTimer = 0.4;
      OTR.fx.stamp(this, OTR.W / 2, 150, 'GO!', 0x2BC48A, { size: 52, hold: 500 });
    } else {
      this.state = 'rule';
      this.time.delayedCall(i > 0 ? 700 : 0, () => {
        OTR.ui.modal(this, {
          title: wave.rule.title, body: wave.rule.text, w: 640, h: 300,
          buttons: [{ label: 'Got it — Go!', skin: 'orange', key: ['ENTER', 'SPACE'], onClick: () => { this.state = 'play'; this.spawnTimer = 0.3; } }]
        });
      });
    }
  }

  spawn() {
    const C = this.content;
    const w = this.wave;
    const r = Math.random();
    const size = r < 0.35 ? 's' : r < 0.8 ? 'm' : 'l';
    const route = 1 + Math.floor(Math.random() * 3);
    const priority = Math.random() < w.priorityChance;
    const dg = Math.random() < (w.dgChance || 0);
    const heavy = !dg && Math.random() < (w.heavyChance || 0);
    let damage = null;
    this.sinceDamage++;
    if (w.damageChance > 0 && (Math.random() < w.damageChance || this.sinceDamage >= 6)) {
      damage = Math.random() < 0.5 ? 'crushed' : 'leak';
      this.sinceDamage = 0;
    }
    const marks = dg ? [OTR.util.pick(['class3', 'class2', 'class8', 'class9_li'])] : [];
    const tint = OTR.util.pick([0xC99A62, 0xBF8D55, 0xD4A56E]);
    const p = {
      route, priority, damage, dg, heavy, marks, size: heavy ? 'l' : size, tint,
      weight: heavy ? 52 + Math.floor(Math.random() * 28) : 2 + Math.floor(Math.random() * 30),
      yOff: 0, dragging: false, done: false, scanned: false, bob: Math.random() * 6
    };
    const key = this.pkgTexture(p, false);
    const img = this.add.image(-70, 0, key).setDepth(10);
    const frame = this.textures.getFrame(key);
    p.yOff = -frame.height * 0.28;
    p.img = img;
    img.y = this.BELT_Y + p.yOff;
    img.setInteractive({ useHandCursor: true, draggable: true });
    img.pkg = p;
    this.packages.push(p);
  }

  /** Damage beats dangerous goods beats heavy beats priority beats the route code. */
  correctBin(p) {
    if (p.damage) return 'EXC';
    if (p.dg && this.activeBins.indexOf('DG') >= 0) return 'DG';
    if (p.heavy && this.activeBins.indexOf('HVY') >= 0) return 'HVY';
    if (p.priority && this.activeBins.indexOf('PRI') >= 0) return 'PRI';
    return 'R' + p.route;
  }

  sortPackage(p, binId) {
    const C = this.content;
    const pts = C.points;
    p.done = true;
    this.packages = this.packages.filter(q => q !== p);
    p.img.disableInteractive();
    const bin = this.bins[binId];
    const correct = this.correctBin(p);
    const ok = binId === correct;
    const blind = !p.scanned;
    if (blind) this.stats.blind++;
    if (p.tag) { p.tag.destroy(); p.tag = null; }
    if (p.jammed) this.clearJam(true);
    if (p.damage || p.dg || p.heavy) this.stats.excTotal++;

    this.tweens.add({
      targets: p.img, x: bin.x, y: 520, scale: 0.45, angle: Phaser.Math.Between(-30, 30), duration: 220, ease: 'Quad.in',
      onComplete: () => {
        p.img.destroy();
        this.tweens.add({ targets: bin.c, scaleY: 0.9, scaleX: 1.08, duration: 70, yoyo: true });
      }
    });

    if (ok && blind) {
      // right bin, but they never read the label: no credit for a lucky guess
      this.streak = 0;
      this.stats.correct++;
      this.addScore(pts.blind, bin.x, 470);
      OTR.audio.play('click_dud');
      OTR.fx.floatText(this, bin.x, 420, 'Scan it first', '#FFC83D', { size: 20, hold: 700 });
    } else if (ok) {
      this.streak++;
      this.bestStreak = Math.max(this.bestStreak, this.streak);
      this.stats.correct++;
      if (p.damage || p.dg || p.heavy) this.stats.excCorrect++;
      const mult = Math.min(pts.maxMultiplier, 1 + Math.floor(this.streak / pts.comboStep));
      this.addScore(pts.correct * mult, bin.x, 470);
      this.time.delayedCall(200, () => {
        OTR.fx.burst(this, bin.x, 530, { tint: bin.def.color, count: 16 });
        OTR.fx.sparkle(this, bin.x, 520, bin.def.color);
      });
      OTR.audio.play('combo', this.streak);
      if (this.streak % pts.comboStep === 0) {
        OTR.fx.floatText(this, OTR.W / 2, 190, `COMBO x${mult}!`, '#FFC83D', { size: 44, rise: 40 });
        OTR.fx.ring(this, OTR.W / 2, 190, 0xFFC83D, 80);
        OTR.audio.play('coin');
      }
    } else {
      this.streak = 0;
      this.stats.wrong++;
      if (p.damage) this.stats.damageErr++;
      else if (p.dg) this.stats.dgErr++;
      else if (p.heavy) this.stats.heavyErr++;
      else if (p.priority || binId === 'PRI') this.stats.priorityErr++;
      else this.stats.routeErr++;
      this.addScore(pts.wrong, bin.x, 470);
      OTR.audio.play('fail');
      OTR.fx.shake(this, 160, 0.006);
      const right = C.bins[correct].label;
      OTR.fx.floatText(this, bin.x, 420, `✗ ${right}`, '#FF6B7F', { size: 22, hold: 700 });
      if (p.damage) OTR.ui.toast(this, 'Damaged package! Those go to EXCEPTIONS.', { color: 0x7A1020, border: 0xFF6B7F, hold: 1600 });
      else if (p.dg) OTR.ui.toast(this, 'Hazard diamond! Dangerous goods ride in the DG cage.', { color: 0x7A5A10, border: 0xFFC83D, hold: 1600 });
      else if (p.heavy) OTR.ui.toast(this, `${p.weight} lb — that one goes down the heavy chute for a team lift.`, { color: 0x3A3644, border: 0xC9C6D6, hold: 1600 });
    }
    this.updateCombo();
  }

  missPackage(p) {
    p.done = true;
    this.packages = this.packages.filter(q => q !== p);
    p.img.disableInteractive();
    if (p.tag) { p.tag.destroy(); p.tag = null; }
    if (p.jammed) this.clearJam(true);
    this.stats.missed++;
    if (p.damage || p.dg || p.heavy) {
      // a damaged, dangerous-goods or heavy piece that rides off the end was not handled either
      this.stats.excTotal++;
      if (p.damage) this.stats.damageErr++; else if (p.dg) this.stats.dgErr++; else this.stats.heavyErr++;
    }
    this.streak = 0;
    this.updateCombo();
    this.addScore(this.content.points.missed, this.BELT_END - 20, this.BELT_Y - 70);
    this.tweens.add({
      targets: p.img, x: p.img.x + 90, y: p.img.y + 260, angle: 110, alpha: 0.2, duration: 520, ease: 'Quad.in',
      onComplete: () => p.img.destroy()
    });
    this.time.delayedCall(380, () => { OTR.audio.play('thud'); OTR.fx.shake(this, 90, 0.003); });
  }

  updateCombo() {
    const pts = this.content.points;
    const mult = Math.min(pts.maxMultiplier, 1 + Math.floor(this.streak / pts.comboStep));
    this.comboText.setText(this.streak >= 2 ? `STREAK ${this.streak}  ·  x${mult}` : '');
  }

  endShift() {
    this.state = 'done';
    this.indicator.setVisible(false);
    if (this.jammed) this.clearJam(true);
    this.packages.forEach(p => {
      p.img.disableInteractive();
      if (p.tag) { p.tag.destroy(); p.tag = null; }
      this.tweens.add({ targets: p.img, alpha: 0, y: p.img.y - 30, duration: 300, onComplete: () => p.img.destroy() });
    });
    this.packages = [];
    OTR.fx.stamp(this, OTR.W / 2, 170, 'BELT CLEAR!', 0xFF6600, { size: 52, hold: 1200 });
    OTR.audio.play('fanfare');

    const s = this.stats;
    const C = this.content;
    const resolved = s.correct + s.wrong + s.missed;
    const sorted = s.correct + s.wrong;
    const scanRate = sorted ? OTR.util.clamp01((sorted - s.blind) / sorted) : 1;
    const efficiency = resolved ? s.correct / resolved : 0;
    const handled = s.excTotal ? s.excCorrect / s.excTotal : 0.5;
    const jamRate = s.jams ? s.jamsCleared / s.jams : 1;
    const safety = handled * 0.55 + scanRate * 0.3 + jamRate * 0.15;
    const lessons = [];
    if (s.blind) lessons.push(C.lessons.scan);
    if (s.damageErr) lessons.push(C.lessons.damage);
    if (s.dgErr) lessons.push(C.lessons.dg);
    if (s.heavyErr) lessons.push(C.lessons.heavy);
    if (s.priorityErr) lessons.push(C.lessons.priority);
    if (s.routeErr) lessons.push(C.lessons.route);
    if (s.missed) lessons.push(C.lessons.missed);
    if (s.jams > s.jamsCleared) lessons.push(C.lessons.jam);
    if (!lessons.length) lessons.push(C.lessons.perfect);
    lessons.push(`Sorted ${s.correct} of ${resolved} · scanned ${sorted - s.blind} of ${sorted} · best streak ${this.bestStreak} · specials handled ${s.excCorrect}/${s.excTotal}`);
    this.finish({ ratios: { efficiency, safety }, lessons: lessons.slice(0, 3), stats: s }, 1600);
  }

  /* ------------------------------------------------------------ loop */
  update(time, delta) {
    const dt = Math.min(0.05, delta / 1000);
    const targetSpeed = this.state === 'play' && !this.jammed ? this.wave.beltSpeed : 0;
    this.beltSpeed += (targetSpeed - this.beltSpeed) * Math.min(1, dt * 6);
    this.belt.tilePositionX -= this.beltSpeed * dt;

    if (this.state !== 'play') { this.indicator.setVisible(false); return; }

    this.waveTime += dt;
    this.elapsed += dt;
    const remaining = this.totalTime - this.elapsed;
    this.setTimer(remaining, remaining < 10);

    if (this.jammed) {
      this.jamTimer -= dt;
      this.jamText.setText(`JAM — clear it (click or SPACE) · ${Math.max(0, this.jamTimer).toFixed(1)}s`);
      if (this.jamRing) this.jamRing.setPosition(this.jammed.img.x, this.jammed.img.y);
      if (this.jamTimer <= 0) this.clearJam(false);
    } else if (this.jamAt !== null && this.jamAt !== undefined && this.waveTime > this.jamAt) {
      this.startJam();
    }

    this.spawnTimer -= dt;
    if (!this.jammed && this.spawnTimer <= 0 && this.waveTime < this.wave.duration - 1) {
      this.spawn();
      this.spawnTimer = this.wave.spawnEvery * (0.8 + Math.random() * 0.4);
    }

    this.packages.slice().forEach(p => {
      if (p.dragging || p.done) { if (p.tag) p.tag.setPosition(p.img.x, p.img.y - 76); return; }
      p.img.x += this.beltSpeed * dt;
      p.img.y = this.BELT_Y + p.yOff + Math.sin(time / 90 + p.bob) * 0.8;
      if (p.tag) p.tag.setPosition(p.img.x, this.BELT_Y - 66);
      if (p.damage === 'leak') {
        p.drip = (p.drip || 0) - dt;
        if (p.drip <= 0) {
          p.drip = 0.22;
          const d = this.add.image(p.img.x + Phaser.Math.Between(-20, 20), this.BELT_Y + 20, 'p_dot').setTint(0x5AB0FF).setScale(0.7).setDepth(9);
          this.tweens.add({ targets: d, y: d.y + 34, alpha: 0, scaleY: 1.2, duration: 500, ease: 'Quad.in', onComplete: () => d.destroy() });
        }
      }
      if (p.img.x > this.BELT_END + 10) this.missPackage(p);
    });

    const front = this.frontPackage();
    if (front) {
      this.indicator.setVisible(true).setPosition(front.img.x, front.img.y);
    } else {
      this.indicator.setVisible(false);
    }

    if (this.waveTime >= this.wave.duration) {
      if (this.waveIndex + 1 < this.content.waves.length) this.startWave(this.waveIndex + 1);
      else this.endShift();
    }
  }
}
OTR.registerScene(SortingScene);
