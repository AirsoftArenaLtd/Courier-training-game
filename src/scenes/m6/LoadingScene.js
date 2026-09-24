/*
 * Module 6 · Loading the Truck. Two modes driven by the content (data/m6_loading.js):
 *   'load' — drag packages from the cart onto the shelves by stop section and weight
 *   'find' — the truck is pre-loaded (with misloads); find the package for each stop against the clock
 */
const C_MISLOAD = 'A package in the wrong section is a misload: it costs you time at every stop and it is how the wrong box ends up at the wrong door.';

class LoadingScene extends BaseScenarioScene {
  constructor() { super('LoadingScene'); }

  create() {
    const C = this.content;
    this.setupBase();
    this.mode = C.mode || 'load';
    this.log = new OTR.ScoreLog();
    this.cats = this.scenario ? this.scenario.categories : ['safety', 'efficiency'];
    this.elapsed = 0;
    this.running = false;
    this.strapped = false;
    this.wrongPicks = 0;
    this.roundIndex = 0;
    this.cleanRounds = 0;        // rounds where the first package picked was the right one
    this.roundClean = true;
    this.extraLessons = [];

    this.add.image(OTR.W / 2, OTR.H / 2, OTR.scenery.cargo(this, { mode: this.mode })).setDepth(-10);
    this.buildSlots();
    this.buildPanel();
    this.hud({ score: this.mode === 'find', timer: true });
    this.buildPackages();

    this.introCard(C.intro.title, C.intro.lines, () => {
      this.running = true;
      if (this.mode === 'find') this.nextRound();
    }, { h: 460 });
  }

  /* ------------------------------------------------------------------ layout */
  get geom() {
    return {
      x0: 34, x1: 902,
      cols: [
        { id: 'A', label: 'STOPS 1-3', min: 1, max: 3 },
        { id: 'B', label: 'STOPS 4-6', min: 4, max: 6 },
        { id: 'C', label: 'STOPS 7-9', min: 7, max: 9 }
      ],
      rows: [
        { id: 'top', label: 'TOP · light only', y: 112, h: 118, maxWeight: 15 },
        { id: 'mid', label: 'MIDDLE', y: 246, h: 118, maxWeight: 35 },
        { id: 'bottom', label: 'BOTTOM · heavy ok', y: 380, h: 118, maxWeight: 999 }
      ],
      floorY: 520, floorH: 150
    };
  }

  buildSlots() {
    const g = this.geom;
    this.slots = [];
    const colW = (g.x1 - g.x0) / g.cols.length;
    g.cols.forEach((col, ci) => {
      const cx = g.x0 + ci * colW;
      g.rows.forEach(row => {
        for (let k = 0; k < 2; k++) {
          this.slots.push({
            id: `${col.id}-${row.id}-${k}`, col: col.id, row: row.id,
            x: cx + 10 + k * (colW / 2), y: row.y, w: colW / 2 - 16, h: row.h,
            min: col.min, max: col.max, maxWeight: row.maxWeight, level: row.id, pkg: null
          });
        }
      });
    });
    // floor: two bulk bays + a hazmat zone
    for (let k = 0; k < 2; k++) {
      this.slots.push({ id: `floor-${k}`, col: 'floor', row: 'floor', x: g.x0 + 20 + k * 240, y: g.floorY, w: 220, h: g.floorH, maxWeight: 999, level: 'floor', pkg: null });
    }
    this.slots.push({ id: 'haz', col: 'haz', row: 'floor', x: g.x0 + 520, y: g.floorY, w: 220, h: g.floorH, maxWeight: 999, level: 'floor', hazmat: true, pkg: null });

    this.slotG = OTR.tex.liveShape(this).setDepth(1);
    this.drawSlots();
  }

  drawSlots(highlight) {
    this.slotG.redraw((g) => this.slots.forEach(s => {
      const hot = highlight && highlight.indexOf(s) >= 0;
      g.fillStyle(s.hazmat ? 0x3A2410 : 0x201B2A, hot ? 0.85 : 0.5);
      g.fillRoundedRect(s.x, s.y, s.w, s.h, 8);
      g.lineStyle(hot ? 3 : 2, hot ? 0xFFC83D : (s.hazmat ? 0xE8A33D : 0x6A6478), hot ? 1 : 0.7);
      g.strokeRoundedRect(s.x, s.y, s.w, s.h, 8);
    }));
  }

  buildPanel() {
    const px = 1090;
    this.add.image(px, 388, OTR.tex.panel(this, 340, 600, { top: 0x2A0F4F, bottom: 0x1A0733, border: 0x6A45A0, radius: 18 })).setDepth(2);
    this.panelTitle = OTR.txt(this, px, 116, this.mode === 'load' ? 'CART' : 'THIS STOP', 16, '#FF9447', { weight: '900' }).setDepth(3);
    this.panelBody = this.add.container(0, 0).setDepth(3);
    this.hintText = OTR.txt(this, px, 630, '', 13, '#FFC83D', { align: 'center', wrap: 296, bold: false, lineSpacing: 2 }).setDepth(3);

    if (this.mode === 'load') {
      // the controls own the bottom of the panel; the cart is laid out above them (see layoutCart)
      this.balanceLabel = OTR.txt(this, px - 150, 548, 'WEIGHT OVERHEAD', 12, '#C9B3F0', { ox: 0 }).setDepth(26);
      this.balanceBar = OTR.ui.bar(this, px - 150, 570, 300, 12, { color: (v) => OTR.color.lerp(0x2BC48A, 0xF0435A, v), bgAlpha: 0.4 }).setDepth(26);
      this.strapBtn = OTR.ui.button(this, px, 606, 'Strap the floor load', () => this.strapLoad(), { w: 300, h: 44, skin: 'purple', fontSize: 16 }).setDepth(26);
      this.doneBtn = OTR.ui.button(this, px, 658, 'Close up & roll out ▶', () => this.finishLoad(), { w: 300, h: 46, skin: 'orange', fontSize: 17 }).setDepth(26);
      this.doneBtn.setEnabled(false);
    }
  }

  /* ------------------------------------------------------------------ packages */
  pkgTex(p) {
    const dims = { s: [76, 56], m: [104, 74], l: [136, 96], env: [104, 26] }[p.size || 'm'];
    const key = `loadpkg_${p.id}`;
    return OTR.tex.make(this, key, dims[0] + 26, dims[1] + 34, (ctx, w, h) => {
      const cv = OTR.cv;
      if (p.size === 'env') {
        cv.rr(ctx, 4, 10, dims[0], dims[1], 3); ctx.fillStyle = '#F4F1FA'; ctx.fill();
        ctx.fillStyle = '#4D148C'; ctx.fillRect(4, 10, dims[0], 6);
      } else {
        OTR.draw.box(ctx, { fw: dims[0], fh: dims[1], d: 16, x: 4, y: 22, color: p.hazmat ? 0xD8C9A8 : 0xC99A62 });
      }
      // mini label
      const ly = p.size === 'env' ? 16 : 34;
      cv.rr(ctx, 12, ly, dims[0] * 0.66, 22, 2); ctx.fillStyle = '#fff'; ctx.fill();
      ctx.fillStyle = '#1D1030'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      cv.fitText(ctx, `${p.number} ${p.street || ''}${p.unit ? ' #' + p.unit : ''}`, 16, ly + 11, dims[0] * 0.66 - 8, 13);
      // weight tag
      const heavy = p.weight >= 35;
      cv.rr(ctx, 12, ly + 26, 48, 18, 3); ctx.fillStyle = heavy ? '#E8304A' : '#3A2A50'; ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = '900 11px "Segoe UI", Arial';
      ctx.fillText(`${p.weight} LB`, 17, ly + 35);
      if (p.fragile) OTR.draw.mark(ctx, 'fragile', dims[0] - 6, ly + 30, 15);
      if (p.hazmat) OTR.draw.mark(ctx, (p.marks && p.marks[0]) || 'class3', dims[0] - 4, ly + 28, 18);
      // stop number badge
      ctx.beginPath(); ctx.arc(dims[0] + 6, 16, 13, 0, Math.PI * 2); ctx.fillStyle = '#FF6600'; ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = '900 14px "Segoe UI", Arial'; ctx.textAlign = 'center';
      ctx.fillText(String(p.stop), dims[0] + 6, 17);
    });
  }

  buildPackages() {
    const C = this.content;
    this.pkgs = C.packages.map(p => Object.assign({}, p));
    this.sprites = {};
    this.cart = [];
    this.pkgs.forEach(p => {
      const img = this.add.image(0, 0, this.pkgTex(p)).setDepth(20).setInteractive({ useHandCursor: true, draggable: this.mode === 'load' });
      img.pkg = p;
      this.sprites[p.id] = img;
      img.on('pointerover', () => { this.showCard(p, img); img.setTint(0xFFE3C8); });
      img.on('pointerout', () => { this.hideCard(p); img.clearTint(); });
      if (this.mode === 'find') img.on('pointerup', () => this.pickPackage(p));
      if (this.mode === 'load') {
        this.input.setDraggable(img);
        img.on('dragstart', () => { this.hideCard(); img.setDepth(60); this.dragging = p; this.drawSlots(this.slots.filter(s => !s.pkg)); });
        img.on('drag', (pointer, dx, dy) => { img.x = dx; img.y = dy; });
        img.on('dragend', () => { img.setDepth(20); this.dragging = null; this.dropPackage(p, img); this.drawSlots(); });
      }
      if (p.slot) {
        const s = this.slots.find(x => x.id === p.slot);
        if (s) this.place(p, s);
      } else {
        this.cart.push(p);
      }
    });
    this.layoutCart();
  }

  layoutCart() {
    const px = 1090;
    // Fit however many packages are still in the cart into the space above the controls, rather than
    // running off the bottom of the panel and over the buttons.
    const top = 146, bottom = 528, boxW = 300;
    const n = this.cart.length;
    const cols = n > 8 ? 3 : 2;
    const rows = Math.max(1, Math.ceil(n / cols));
    const cw = boxW / cols;
    const ch = Math.min(94, (bottom - top) / rows);
    const scale = Math.min(0.62, cw / 168, ch / 134);
    this.cart.forEach((p, i) => {
      const img = this.sprites[p.id];
      const col = i % cols, row = Math.floor(i / cols);
      img.setPosition(px - boxW / 2 + cw * (col + 0.5), top + ch * (row + 0.5)).setScale(scale).setVisible(true);
    });
    if (this.mode === 'load') {
      this.panelTitle.setText(this.cart.length ? `CART · ${this.cart.length} TO LOAD` : 'CART EMPTY');
      if (this.doneBtn) this.doneBtn.setEnabled(this.cart.length === 0);
      this.updateBalance();
    }
  }

  place(p, slot) {
    if (slot.pkg && slot.pkg !== p) return false;
    if (p.slotRef) p.slotRef.pkg = null;
    p.slotRef = slot;
    slot.pkg = p;
    const img = this.sprites[p.id];
    const k = Math.min((slot.w - 16) / img.width, (slot.h - 16) / img.height, 0.92);
    img.setScale(k);
    img.setPosition(slot.x + slot.w / 2, slot.y + slot.h / 2);
    this.cart = this.cart.filter(c => c !== p);
    return true;
  }

  dropPackage(p, img) {
    const slot = this.slots.find(s => !s.pkg && img.x > s.x && img.x < s.x + s.w && img.y > s.y && img.y < s.y + s.h);
    if (slot) {
      this.place(p, slot);
      OTR.audio.play('thud');
      this.checkPlacement(p, slot);
    } else {
      if (p.slotRef) { p.slotRef.pkg = null; p.slotRef = null; }
      if (this.cart.indexOf(p) < 0) this.cart.push(p);
      OTR.audio.play('pop');
    }
    this.layoutCart();
  }

  /**
   * Every rule a placement can break. The instant feedback and the final score both use this list, so what
   * the trainee is told while loading is exactly what they are scored on.
   */
  problemsFor(p, s) {
    const out = [];
    const bulky = p.weight >= 35 || p.size === 'l';
    if (p.hazmat && !s.hazmat) out.push('Dangerous goods go in the marked floor zone');
    if (!p.hazmat && s.hazmat) out.push('That zone is for dangerous goods only');
    if (p.weight >= 35 && (s.level === 'top' || s.level === 'mid')) out.push(`${p.weight} lb is too heavy that high — bottom shelf or floor`);
    else if (p.weight >= 15 && s.level === 'top') out.push('The top shelf is for light packages, under 15 lb');
    if (p.fragile && s.level === 'floor') out.push('Fragile stays off the floor');
    if (s.col === 'floor' && !p.hazmat && !bulky) out.push('The floor bays are for heavy or bulky freight');
    if (s.min && (p.stop < s.min || p.stop > s.max)) out.push(`Stop ${p.stop} belongs in section ${p.stop <= 3 ? 'A' : p.stop <= 6 ? 'B' : 'C'}`);
    return out;
  }

  checkPlacement(p, slot) {
    const problems = this.problemsFor(p, slot);
    if (problems.length) {
      OTR.fx.floatText(this, slot.x + slot.w / 2, slot.y + 22, problems.slice(0, 2).join('\n'), '#FF9A9A', { size: 15, rise: 30, hold: 1300 });
    } else {
      OTR.fx.sparkle(this, slot.x + slot.w / 2, slot.y + slot.h / 2, 0x2BC48A);
    }
    this.updateBalance();
  }

  /** The heaviest package on the top shelf against the shelf's 15 lb rating. */
  updateBalance() {
    if (!this.balanceBar) return;
    const top = this.slots.filter(s => s.level === 'top' && s.pkg).reduce((n, s) => Math.max(n, s.pkg.weight), 0);
    this.balanceBar.setValue(OTR.util.clamp01((top - 10) / 25), true, 200);
    this.balanceLabel.setText(top ? `HEAVIEST ON THE TOP SHELF  ${top} LB  (max 14)` : 'TOP SHELF  ·  nothing heavy up high');
  }

  /**
   * Hovering a package lifts its full label up where it can be read: beside the package, on whichever side has
   * room, and never over the round prompt in the side panel.
   */
  showCard(p, img) {
    this.hideCard();
    if (this.dragging) return;
    const w = 264, h = 176;
    const half = img.displayWidth / 2;
    let x = img.x + half + 14 + w / 2;
    if (x + w / 2 > 912) x = img.x - half - 14 - w / 2;
    x = OTR.util.clamp(x, w / 2 + 10, 912 - w / 2);
    const y = OTR.util.clamp(img.y, 78 + h / 2, OTR.H - 44 - h / 2);
    const c = this.add.container(x, y).setDepth(70);
    const g = OTR.tex.shape(this, (g) => { g.fillStyle(0x0E0620, 0.55); g.fillRoundedRect(-w / 2 - 6, -h / 2 - 4, w + 12, h + 38, 10); });
    const tags = [];
    if (p.weight >= 35) tags.push('HEAVY');
    if (p.fragile) tags.push('FRAGILE');
    if (p.hazmat) tags.push('DANGEROUS GOODS');
    c.add([g, this.add.image(0, 0, OTR.labelArt.key(this, p, w, h)).setDisplaySize(w, h),
      OTR.txt(this, 0, h / 2 + 17, `STOP ${p.stop}  ·  ${p.weight} LB${tags.length ? '  ·  ' + tags.join('  ·  ') : ''}`, 13, '#FFC83D', { weight: '900' })]);
    this.card = c;
    this.cardFor = p;
  }

  hideCard(p) {
    if (p && this.cardFor !== p) return;
    if (this.card) { this.card.destroy(); this.card = null; this.cardFor = null; }
  }

  strapLoad() {
    if (this.strapped) return;
    this.strapped = true;
    OTR.audio.play('success');
    const g = this.geom;
    OTR.tex.shape(this, (s) => {
      s.lineStyle(10, 0xE8A33D, 1);
      s.lineBetween(g.x0 + 10, g.floorY + 40, g.x0 + 760, g.floorY + 40);
      s.lineBetween(g.x0 + 10, g.floorY + 104, g.x0 + 760, g.floorY + 104);
    }).setDepth(40);
    this.strapBtn.setLabel('Load strapped ✓').setEnabled(false);
    OTR.ui.toast(this, 'Floor load strapped. Nothing shifts when you brake.');
  }

  finishLoad() {
    if (this.finished) return;
    const log = this.log;
    let right = 0;
    const total = this.pkgs.length;
    this.pkgs.forEach(p => { if (p.slotRef && !this.problemsFor(p, p.slotRef).length) right++; });
    log.check('efficiency', right, total, `Packages loaded in the right place (${right}/${total})`, { lesson: 'Section by stop, heavy low, fragile off the floor, the floor bays for bulk and dangerous goods in the marked zone.' });
    // judged package by package: light parcels belong up high, it is the heavy ones that hurt
    const high = this.pkgs.filter(p => p.slotRef && ((p.weight >= 15 && p.slotRef.level === 'top') || (p.weight >= 35 && p.slotRef.level === 'mid')));
    log.check('safety', high.length === 0 ? 3 : high.length === 1 ? 1 : 0, 3, high.length ? `Heavy packages loaded high (${high.map(p => p.weight + ' lb').join(', ')})` : 'Nothing heavy loaded up high', { lesson: 'Anything above shoulder height should be light. Heavy overhead is how shoulders and heads get hurt.' });
    log.check('safety', this.strapped ? 2 : 0, 2, 'Strapped the floor load before driving', { lesson: 'Unsecured freight becomes a projectile in a hard stop. Strap or brace it.' });
    const hazSlot = this.slots.find(s => s.hazmat);
    const hazPkg = this.pkgs.find(p => p.hazmat);
    if (hazPkg) log.check('safety', hazSlot && hazSlot.pkg === hazPkg ? 2 : 0, 2, 'Dangerous goods in the marked zone', { lesson: 'Dangerous goods travel in their segregated spot, never stacked in with everything else.' });
    const par = this.content.par || 210;
    log.check('efficiency', this.elapsed <= par ? 2 : this.elapsed <= par * 1.5 ? 1 : 0, 2, `Loaded in good time (${Math.round(this.elapsed)}s, par ${par}s)`);
    this.endScenario();
  }

  /* ------------------------------------------------------------------ find mode */
  nextRound() {
    const C = this.content;
    const r = C.rounds[this.roundIndex];
    if (!r) { this.endFind(); return; }
    this.round = r;
    this.roundStart = this.elapsed;
    this.roundClean = true;
    this.roundHelp = { nudged: false, shown: false };
    const p = this.pkgs.find(x => x.id === r.pkg);
    this.roundTimerText = null;                 // the old one is about to be destroyed with the panel
    this.panelBody.removeAll(true);
    const px = 1090;
    this.panelTitle.setText(`PACKAGE ${this.roundIndex + 1} OF ${C.rounds.length}`);
    this.panelBody.add(OTR.txt(this, px, 160, `FIND THIS ADDRESS  ·  STOP ${r.stop}`, 13, '#FF9447', { weight: '900' }));
    this.panelBody.add(OTR.txt(this, px, 206, `${p.number} ${p.street}`, 26, '#ffffff', { weight: '900', align: 'center', wrap: 300 }));
    if (p.unit) this.panelBody.add(OTR.txt(this, px, 242, `Unit ${p.unit}`, 20, '#FFC83D', { weight: '900' }));
    this.panelBody.add(OTR.txt(this, px, 278, p.to, 17, '#C9B3F0', { bold: false }));
    this.panelBody.add(OTR.txt(this, px, 326, 'Click the matching package in the truck', 14, '#8FD3FF', { align: 'center', wrap: 300, bold: false }));
    this.roundTimerText = OTR.txt(this, px, 396, '0.0s', 34, '#FFC83D', { weight: '900' });
    this.panelBody.add(this.roundTimerText);
    this.hintText.setText('');
  }

  pickPackage(p) {
    if (!this.running || !this.round || this.finished) return;
    const t = this.elapsed - this.roundStart;
    if (p.id === this.round.pkg) {
      this.round = null;                        // the round is over: no double-scoring on a second click
      this.hideCard();
      if (this.roundClean) this.cleanRounds++;
      OTR.audio.play('success');
      OTR.fx.sparkle(this, this.sprites[p.id].x, this.sprites[p.id].y, 0x2BC48A);
      this.addScore(Math.max(50, Math.round(400 - t * 30)), this.sprites[p.id].x, this.sprites[p.id].y);
      const misload = p.slotRef && p.slotRef.min && (p.stop < p.slotRef.min || p.stop > p.slotRef.max);
      if (misload && this.extraLessons.indexOf(C_MISLOAD) < 0) this.extraLessons.push(C_MISLOAD);
      this.log.check('efficiency', t <= 6 ? 2 : t <= 12 ? 1 : 0, 2, `Found ${p.number} ${p.street} in ${t.toFixed(1)}s${misload ? ' (misloaded!)' : ''}`, { lesson: 'Work the shelves by section. Hunting for a package is time you do not get back.' });
      if (misload) this.hintText.setText('That one was in the wrong section — a misload costs you time at every stop.');
      this.sprites[p.id].disableInteractive().setTint(0x8BF0C6);
      this.time.delayedCall(400, () => { this.sprites[p.id].setVisible(false); if (p.slotRef) p.slotRef.pkg = null; });
      this.roundIndex++;
      this.time.delayedCall(700, () => this.nextRound());
    } else {
      OTR.audio.play('error');
      OTR.fx.shake(this, 160, 0.006);
      this.wrongPicks++;
      this.roundClean = false;
      this.addScore(-80, this.sprites[p.id].x, this.sprites[p.id].y);
      const target = this.pkgs.find(x => x.id === this.round.pkg);
      const why = p.number !== target.number ? 'different house number' : p.street !== target.street ? 'different street' : p.unit !== target.unit ? 'different unit' : 'not this stop';
      OTR.fx.floatText(this, this.sprites[p.id].x, this.sprites[p.id].y - 40, why, '#FF9A9A', { size: 16 });
      this.hintText.setText(`${p.number} ${p.street} — ${why}. Read the whole address.`);
    }
  }

  endFind() {
    if (this.finished || this._ended) return;
    this._ended = true;
    this.round = null;
    const C = this.content;
    const rounds = C.rounds.length;
    this.log.check('service', this.cleanRounds, rounds, `Pulled the right package first time (${this.cleanRounds}/${rounds})`, { lesson: 'Read number, street and unit. Near-matches are the classic misdelivery.' });
    const par = C.par || 120;
    this.log.check('efficiency', this.elapsed <= par ? 2 : this.elapsed <= par * 1.5 ? 1 : 0, 2, `Worked the truck in good time (${Math.round(this.elapsed)}s)`);
    this.endScenario();
  }

  endScenario() {
    this.hideCard();
    const ratios = this.log.ratios(this.cats);
    const lessons = this.log.lessons(2);
    this.extraLessons.forEach(l => { if (lessons.length < 3 && lessons.indexOf(l) < 0) lessons.push(l); });
    (this.content.keyLessons || []).forEach(l => { if (lessons.length < 3 && lessons.indexOf(l) < 0) lessons.push(l); });
    this.running = false;
    this.finish({ score: this.mode === 'find' ? this.score : this.log.score(), ratios, lessons, stats: { log: this.log.toJSON() } }, 600);
  }

  update(time, delta) {
    if (!this.running || this.finished) return;
    this.elapsed += delta / 1000;
    this.setTimer(this.elapsed, this.elapsed > (this.content.par || 200));
    if (this.mode === 'find' && this.round && this.roundTimerText && this.roundTimerText.active) {
      const secs = this.elapsed - this.roundStart;
      const t = `${secs.toFixed(1)}s`;
      if (t !== this.roundTimerText.text) this.roundTimerText.setText(t);
      this.helpIfStuck(secs);
    }
  }

  /** Nobody should be stuck on a round forever: a nudge at 25 s, and the package shown at 45 s (not scored clean). */
  helpIfStuck(secs) {
    const r = this.round, help = this.roundHelp;
    if (secs > 25 && !help.nudged) {
      help.nudged = true;
      const sec = r.stop <= 3 ? 'A' : r.stop <= 6 ? 'B' : 'C';
      this.hintText.setText(`Stuck? Stop ${r.stop} should be in section ${sec} — unless it was misloaded. Hover a package to read its whole label.`);
    }
    if (secs > 45 && !help.shown) {
      help.shown = true;
      this.roundClean = false;
      const img = this.sprites[r.pkg];
      this.hintText.setText('There it is. A misloaded package costs this much time at every stop.');
      if (img) this.tweens.add({ targets: img, scale: img.scale * 1.12, duration: 320, yoyo: true, repeat: 5, ease: 'Sine.inOut' });
      if (img) OTR.fx.sparkle(this, img.x, img.y, 0xFFC83D);
    }
  }
}
OTR.registerScene(LoadingScene);
