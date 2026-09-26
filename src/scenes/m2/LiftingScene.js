class LiftingScene extends BaseScenarioScene {
  constructor() { super('LiftingScene'); }

  create() {
    const C = this.content;
    this.setupBase();
    this.G = 600;
    this.PALLET_TOP = this.G - 18;
    this.health = 100;
    this.qualities = [];
    this.mistakes = [];
    this.liftIndex = -1;
    this.backGlow = 0;

    this.add.image(OTR.W / 2, OTR.H / 2, OTR.art.setting(this, 'warehouse', { color: 0x12041F, alpha: 0.35 }));
    OTR.tex.shape(this, (floor) => {
      floor.fillStyle(0x000000, 0.25); floor.fillRect(0, this.G, OTR.W, OTR.H - this.G);
      floor.fillStyle(0xFFC83D, 0.9); floor.fillRect(0, this.G, OTR.W, 4);
    });

    // Pallet (left), behind the courier: the load has to be carried to it and turned with the feet. (The courier
    // used to start standing on it, so lifting the box and putting it straight back down counted as a clean lift.)
    this.PALLET_X0 = 180; this.PALLET_X1 = 420;
    OTR.tex.shape(this, (pal) => {
      pal.fillStyle(0x9B7348, 1); pal.fillRect(180, this.PALLET_TOP, 240, 7);
      pal.fillStyle(0x7A5634, 1); [184, 290, 400].forEach(x => pal.fillRect(x, this.PALLET_TOP + 7, 16, 11));
      pal.fillStyle(0x9B7348, 1); pal.fillRect(180, this.G - 3, 240, 3);
    }).setDepth(3);

    // shelving (right)
    this.shelf = OTR.tex.shape(this, (shelf) => {
      shelf.fillStyle(0x2B6CB0, 1);
      shelf.fillRect(660, this.G - 330, 12, 330); shelf.fillRect(860, this.G - 330, 12, 330);
      shelf.fillStyle(0xFF8A00, 1);
      shelf.fillRect(650, this.G - 200, 232, 10); shelf.fillRect(650, this.G - 330, 232, 10);
    }).setDepth(2).setVisible(false);

    this.PALLET_X = 300;
    this.phase = null;
    this.postureOn = false;
    this.pose = { x: 640, dir: 1, squat: 0, stoop: 0, hold: false, reach: 0, twist: 0, elevate: 0 };
    this.gBack = this.add.graphics().setDepth(5);
    this.boxImg = this.add.image(-500, -500, '__DEFAULT').setDepth(6);
    this.gFront = this.add.graphics().setDepth(7);
    this.glow = this.add.image(0, 0, 'p_glow').setTint(0xFF2A2A).setBlendMode('ADD').setScale(1.6).setAlpha(0).setDepth(8);

    this.hud({});
    this.buildHealth();
    this.liftText = OTR.txt(this, OTR.W - 24, 84, '', 16, '#E6DAF7', { ox: 1, weight: '900', stroke: '#1D1030', strokeW: 4 }).setDepth(810);
    this.banner = this.add.container(640, 150).setDepth(60).setVisible(false);

    this.setupInput();
    this.introCard(C.intro.title, C.intro.lines, () => this.nextLift(), { h: 460 });
  }

  /* ------------------------------------------------------------ UI */
  buildHealth() {
    const c = this.add.container(170, 100).setDepth(810);
    c.add(OTR.ui.panel(this, 0, 0, 300, 58, { top: 0x2A0F4F, bottom: 0x1A0733, border: 0x6A45A0, borderWidth: 2, radius: 14, shadow: 0.3 }));
    this.heart = this.add.image(-122, 0, 'ic_heart').setDisplaySize(28, 28).setTint(0xFF5C8A);
    c.add(this.heart);
    c.add(OTR.txt(this, -98, -12, 'BACK HEALTH', 12, '#C9B3F0', { ox: 0 }));
    this.healthBar = OTR.ui.bar(this, -98, 11, 190, 12, { color: (v) => OTR.color.lerp(0xF0435A, 0x2BC48A, v), bgAlpha: 0.4, value: 1 });
    this.healthText = OTR.txt(this, 128, 0, '100', 20, '#ffffff', { ox: 1, weight: '900' });
    c.add([this.healthBar, this.healthText]);
  }

  hurt(amount, label, mistake) {
    if (amount > 0) {
      this.health = Math.max(0, this.health - amount);
      this.healthBar.setValue(this.health / 100, true, 400);
      this.healthText.setText(String(Math.round(this.health)));
      OTR.fx.pop(this, this.heart, 1.5);
      const b = this.backPos();
      OTR.fx.floatText(this, b.x, b.y - 60, `-${amount} Back`, '#FF6B7F', { size: 24 });
      this.backGlow = 1;
      OTR.audio.play('strain');
      OTR.fx.shake(this, 220, 0.009);
    }
    if (label) OTR.fx.floatText(this, 640, 250, label, '#FF6B7F', { size: 30, hold: 600 });
    if (mistake && this.mistakes.indexOf(mistake) < 0) this.mistakes.push(mistake);
  }

  praise(label) {
    OTR.audio.play('success');
    OTR.fx.floatText(this, 640, 250, label, '#5CF0B0', { size: 30, hold: 400 });
    const b = this.backPos();
    OTR.fx.sparkle(this, b.x, b.y - 40, 0x2BC48A);
  }

  /* ------------------------------------------------------------ input */
  setupInput() {
    this.pkeys = this.input.keyboard.addKeys({
      up: 'UP', down: 'DOWN', left: 'LEFT', right: 'RIGHT', w: 'W', a: 'A', s: 'S', d: 'D'
    });
    OTR.onKey(this, 'keydown-SPACE', () => { if (!this.scene.isPaused()) this.postureAction(); });
    this.input.on('pointerdown', (p, over) => { if (!over || !over.length) this.postureAction(); });
  }

  /* ------------------------------------------------------------ geometry */
  hip(P) {
    const legs = 124;
    const h = legs * (1 - 0.48 * P.squat);
    return { x: P.x - P.dir * P.squat * 26, y: this.G - P.elevate - h };
  }

  lean(P) {
    return Phaser.Math.DegToRad(6 + 24 * P.squat + 72 * P.stoop);
  }

  backPos() {
    const P = this.pose;
    const hp = this.hip(P);
    const a = this.lean(P);
    return { x: hp.x + P.dir * Math.sin(a) * 22, y: hp.y - Math.cos(a) * 22 };
  }

  heldBox() {
    const P = this.pose, L = this.lift;
    const hp = this.hip(P);
    const x = hp.x + P.dir * (20 + L.w / 2);
    let bottom = hp.y + 22 + P.squat * 62 + P.stoop * 48;
    if (P.elevate === 0) bottom = Math.min(bottom, this.G);
    // over the pallet it rests on the pallet's boards, not 18 px into them (squatting lower pushed it through)
    if (P.hold && x + L.w / 2 > 180 && x - L.w / 2 < 420) bottom = Math.min(bottom, this.PALLET_TOP);
    return { x, bottom };
  }

  /* ------------------------------------------------------------ lifts */
  nextLift() {
    const C = this.content;
    this.liftIndex++;
    if (this.liftIndex >= C.lifts.length) { this.endScenario(); return; }
    const L = C.lifts[this.liftIndex];
    this.lift = L;
    this.helper = false;
    Object.assign(this.pose, { x: L.high ? 640 : 560, dir: 1, squat: 0, stoop: 0, hold: false, reach: 0, twist: 0, elevate: 0 });
    this.liftText.setText(`LIFT ${this.liftIndex + 1} / ${C.lifts.length}`);
    this.shelf.setVisible(!!L.high);

    const d = Math.round(L.w * 0.25);
    const key = OTR.tex.make(this, `lift_box_${L.id}`, L.w + d + 16, L.h + d * 0.6 + 30, (ctx) => {
      OTR.draw.box(ctx, { fw: L.w, fh: L.h, d, x: 6, y: d * 0.6 + 8, color: L.color });
      if (L.weight >= 60) {
        ctx.fillStyle = '#F0435A'; ctx.fillRect(6 + L.w * 0.15, d * 0.6 + 8 + L.h * 0.35, L.w * 0.7, L.h * 0.3);
        ctx.fillStyle = '#fff'; ctx.font = `900 ${Math.round(L.h * 0.2)}px "Segoe UI", Arial`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('HEAVY', 6 + L.w / 2, d * 0.6 + 8 + L.h * 0.5);
      }
    });
    const tex = this.textures.get(key).getSourceImage();
    this.boxImg.setTexture(key).setOrigin((6 + L.w / 2) / tex.width, (d * 0.6 + 8 + L.h) / tex.height);
    this.boxState = { mode: 'static', x: 640 + 20 + L.w / 2, bottom: L.high ? this.G - 200 : this.G };
    this.boxImg.setPosition(this.boxState.x, -100);
    this.tweens.add({ targets: this.boxImg, y: this.boxState.bottom, duration: 500, ease: 'Bounce.out', onComplete: () => OTR.audio.play('thud') });

    // weight tag
    if (this.tag) this.tag.destroy();
    this.tag = this.add.container(this.boxState.x, this.boxState.bottom - L.h - 60).setDepth(9);
    const tg = OTR.tex.shape(this, (tg) => { tg.fillStyle(L.weight >= 60 ? 0xF0435A : 0x250849, 0.95); tg.fillRoundedRect(-52, -18, 104, 36, 18); });
    this.tag.add([tg, OTR.txt(this, 0, 0, `${L.weight} lb`, 18, '#ffffff', { weight: '900' })]);
    this.tag.setAlpha(0);
    this.tweens.add({ targets: this.tag, alpha: 1, delay: 400, duration: 200 });

    this.time.delayedCall(700, () => this.assess());
  }

  assess() {
    const L = this.lift;
    const n = L.options.length;
    // Held up at the top of the view, as tall as its text, and clear of the courier's head (it covered the head and
    // shoulders) and of the back-health panel on the left.
    const prompt = OTR.txt(this, 0, 0, L.prompt, 19, '#250849', { bold: true, wrap: 580, align: 'center' });
    const firstY = 50 + prompt.height + 44;
    const h = firstY + (n - 1) * 60 + 28 + 18;
    const c = this.add.container(640, 66 + h / 2).setDepth(70);
    c.add(OTR.ui.panel(this, 0, 0, 640, h, { top: 0xFFFFFF, bottom: 0xF1EAFB, border: 0xC9B3F0, radius: 22 }));
    c.add(OTR.txt(this, 0, -h / 2 + 28, `SIZE UP THE LOAD · ${L.name.toUpperCase()}`, 15, '#FF6600', { weight: '900' }));
    prompt.setPosition(0, -h / 2 + 50 + prompt.height / 2);
    c.add(prompt);
    const opts = OTR.util.shuffle(L.options);
    const buttons = [];
    const pick = (o) => {
      if (c._done) return;
      c._done = true;
      this.tweens.add({ targets: c, alpha: 0, scale: 0.9, duration: 160, onComplete: () => c.destroy() });
      this.resolveAssess(o);
    };
    opts.forEach((o, i) => {
      const b = OTR.ui.button(this, 0, -h / 2 + firstY + i * 60, `${i + 1}.  ${o.text}`, () => pick(o), { w: 600, h: 52, skin: 'ghost', fontSize: 18, key: ['ONE', 'TWO', 'THREE'][i] });
      c.add(b);
      buttons.push(b);
    });
    c.setScale(0.85).setAlpha(0);
    this.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 240, ease: 'Back.out' });
    OTR.audio.play('pop');
  }

  resolveAssess(o) {
    const q = o.grade === 'good' ? 1 : o.grade === 'ok' ? 0.6 : 0.15;
    this.qualities.push(q);
    const col = o.grade === 'good' ? 0x2BC48A : o.grade === 'ok' ? 0xFFB020 : 0xF0435A;
    this.coach(o.grade === 'good' ? 'Good call' : o.grade === 'ok' ? 'Okay, but…' : 'Bad idea', o.feedback, col, () => {
      if (o.effect === 'strain') {
        this.strainAnim(Math.abs(o.health || 15), o.mistake, () => this.applyEffect(o.then || 'normal'));
      } else {
        if (o.grade === 'good') OTR.audio.play('good');
        this.applyEffect(o.effect);
      }
    });
  }

  coach(head, text, col, next) {
    if (!OTR.academy.coaching()) { next(); return; }   // an assessment: the verdict comes on the results screen
    const w = 760;
    const body = OTR.txt(this, 0, 0, text, 19, '#3A2A50', { bold: false, wrap: w - 70, lineSpacing: 3 });
    const h = body.height + 90;
    const c = this.add.container(640, 250).setDepth(70);
    c.add(OTR.ui.panel(this, 0, 0, w, h, { top: 0xFFFFFF, bottom: 0xF6F1FD, border: col, borderWidth: 4, radius: 18 }));
    c.add(OTR.txt(this, -w / 2 + 30, -h / 2 + 28, head.toUpperCase(), 18, OTR.color.css(col), { ox: 0, weight: '900' }));
    c.add(OTR.txt(this, w / 2 - 24, -h / 2 + 28, 'click / SPACE ▶', 13, '#9A8AB0', { ox: 1 }));
    body.setOrigin(0, 0).setPosition(-w / 2 + 30, -h / 2 + 50);
    c.add(body);
    c.setAlpha(0);
    this.tweens.add({ targets: c, alpha: 1, duration: 180 });
    if (col === 0xF0435A) OTR.audio.play('fail');
    let done = false;
    const go = () => {
      if (done) return;
      done = true;
      this.input.off('pointerdown', onClick);
      this.input.keyboard.off('keydown-SPACE', go);
      this.input.keyboard.off('keydown-ENTER', go);
      this.tweens.add({ targets: c, alpha: 0, duration: 150, onComplete: () => c.destroy() });
      next();
    };
    const onClick = (p, over) => { if (!over || !over.length) go(); };
    this.time.delayedCall(300, () => {
      if (done) return;
      this.input.on('pointerdown', onClick);
      this.input.keyboard.on('keydown-SPACE', go);
      this.input.keyboard.on('keydown-ENTER', go);
    });
  }

  applyEffect(effect) {
    const L = this.lift;
    if (effect === 'equipment') { this.handTruckAnim(); return; }
    if (effect === 'helper') this.helper = true;
    if (effect === 'stool') {
      this.stool = OTR.tex.shape(this, (stool) => {
        stool.fillStyle(0xFF8A00, 1);
        stool.fillRect(-36, -60, 72, 10);
        stool.fillStyle(0x444450, 1);
        stool.fillRect(-30, -50, 8, 50); stool.fillRect(22, -50, 8, 50);
        stool.fillRect(-26, -26, 52, 6);
      }, this.pose.x, this.G).setDepth(4);
      this.stool.setAlpha(0);
      this.tweens.add({ targets: this.stool, alpha: 1, duration: 200 });
      this.tweens.add({ targets: this.pose, elevate: 60, delay: 250, duration: 400, ease: 'Quad.out', onComplete: () => this.startPosture() });
      return;
    }
    void L;
    this.startPosture();
  }

  strainAnim(amount, mistake, next) {
    const P = this.pose;
    this.tweens.add({
      targets: P, stoop: 0.8, reach: 1, duration: 300, ease: 'Quad.out',
      onComplete: () => {
        this.hurt(amount, 'OUCH!', mistake);
        this.tweens.add({ targets: P, stoop: 0, reach: 0, delay: 500, duration: 400, onComplete: next });
      }
    });
  }

  handTruckAnim() {
    const L = this.lift;
    const key = OTR.tex.make(this, 'handtruck', 80, 160, (ctx) => {
      ctx.strokeStyle = '#D23A3A'; ctx.lineWidth = 7; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(20, 10); ctx.lineTo(20, 140); ctx.lineTo(70, 140); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(8, 10); ctx.lineTo(32, 10); ctx.stroke();
      ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(22, 144, 14, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#999'; ctx.beginPath(); ctx.arc(22, 144, 5, 0, Math.PI * 2); ctx.fill();
    });
    const truck = this.add.image(OTR.W + 60, this.G - 80, key).setDepth(7).setFlipX(true);
    // the courier walks behind it with a hand on the handle (it used to roll in and out on its own while they watched)
    const P = this.pose;
    const follow = () => { P.x = truck.x + 46; P.dir = -1; };
    P.x = OTR.W + 106; P.dir = -1;
    if (this.tag) this.tweens.add({ targets: this.tag, alpha: 0, duration: 200 });
    OTR.audio.play('drive');
    this.tweens.add({
      targets: truck, x: this.boxState.x + L.w / 2 + 10, duration: 700, ease: 'Cubic.out', onUpdate: follow,
      onComplete: () => {
        OTR.audio.play('thud');
        const target = this.PALLET_X;
        this.tweens.add({ targets: [truck], x: target - L.w / 2 - 20 + L.w + 30, duration: 1100, ease: 'Sine.inOut', delay: 200, onUpdate: follow });
        this.tweens.add({
          targets: this.boxState, x: target, delay: 200, duration: 1100, ease: 'Sine.inOut',
          onComplete: () => {
            this.boxState.bottom = this.PALLET_TOP;
            OTR.audio.play('thud');
            // tipped back and wheeled away: the courier takes it out of the frame with them
            truck.setFlipX(false);
            this.tweens.add({ targets: truck, x: OTR.W + 80, duration: 700, ease: 'Cubic.in', onUpdate: () => { if (this.lift === L) { P.x = truck.x - 46; P.dir = 1; } }, onComplete: () => truck.destroy() });
            this.qualities.push(1);
            this.praise('Zero strain!');
            this.time.delayedCall(900, () => this.finishLift());
          }
        });
        this.tweens.add({ targets: this.boxState, bottom: this.G - 6, delay: 200, duration: 200 });
      }
    });
  }

  /* ================================================================ the lift itself
   * One continuous control instead of a row of timing meters:
   *   A / D   step closer to or further from the load (and walk it to the pallet)
   *   S / W   bend and straighten your knees
   *   SPACE   grip the load, and let it go again
   * The spine does whatever the knees and the distance leave it to do, which is the whole lesson:
   * stand back and stay upright and your back has to hinge over the load to reach it.
   */
  startPosture() {
    const L = this.lift;
    this.phase = 'approach';
    this.strain = 0;          // integrated overload, seconds x severity
    this.peakLoad = 0;
    this.gripT = 0;
    this.gripGap = 0;
    this.pose.reach = 0;
    this.showCoach('');
    this.buildPostureHud();
    this.postureOn = true;
    if (this.tag) this.tweens.add({ targets: this.tag, alpha: 0, duration: 250 });
    if (L.high) this.phase = 'approach';
  }

  buildPostureHud() {
    if (this.postureHud) this.postureHud.destroy();
    const c = this.add.container(1108, 330).setDepth(60);
    c.add(OTR.ui.panel(this, 0, 0, 200, 300, { top: 0x2A0F4F, bottom: 0x1A0733, border: 0x6A45A0, borderWidth: 2, radius: 18, shadow: 0.3 }));
    c.add(OTR.txt(this, 0, -122, 'SPINE LOAD', 14, '#FFC83D', { weight: '900' }));
    this.loadG = this.add.graphics();
    c.add(this.loadG);
    this.loadNum = OTR.txt(this, 0, 104, '', 15, '#ffffff', { weight: '900' });
    c.add(this.loadNum);
    this.postureHud = c;
    this.buildPad();
    this.phaseText = OTR.txt(this, 640, 128, '', 20, '#FFC83D', { weight: '900', stroke: '#1D1030', strokeW: 5 }).setDepth(60);
    this.coachText = OTR.txt(this, 640, 160, '', 18, '#ffffff', { weight: '900', stroke: '#1D1030', strokeW: 5 }).setDepth(60);
  }

  /**
   * The mouse can do the whole lift too: hold ◀ ▶ to step, ▼ to bend the knees, ▲ to straighten, and click GRIP
   * (the same as SPACE). It sits under the gauge.
   */
  buildPad() {
    if (this.pad) this.pad.destroy();
    this.vkeys = {};
    const c = this.pad = this.add.container(1108, 560).setDepth(61);
    const hold = (x, y, label, key) => {
      const b = OTR.ui.button(this, x, y, label, null, { w: 56, h: 48, skin: 'dark', fontSize: 20 });
      const on = () => { this.vkeys[key] = true; }, off = () => { this.vkeys[key] = false; };
      b.bg.on('pointerdown', on); b.bg.on('pointerup', off); b.bg.on('pointerout', off);
      c.add(b);
    };
    hold(-62, -28, '▲', 'up');
    hold(-62, 28, '▼', 'down');
    hold(-2, 0, '◀', 'left');
    hold(58, 0, '▶', 'right');
    c.add(OTR.ui.button(this, 0, 74, 'GRIP / LET GO', () => this.postureAction(), { w: 176, h: 40, skin: 'orange', fontSize: 14 }));
  }

  clearPostureHud() {
    this.postureOn = false;
    if (this.pad) { this.pad.destroy(); this.pad = null; }
    this.vkeys = {};
    if (this.postureHud) { this.postureHud.destroy(); this.postureHud = null; }
    if (this.phaseText) { this.phaseText.destroy(); this.phaseText = null; }
    if (this.coachText) { this.coachText.destroy(); this.coachText = null; }
    this.loadG = null;
  }

  showCoach(text, color) {
    if (!this.coachText) return;
    if (!OTR.academy.coaching()) text = '';            // an assessment: no live coaching
    this.coachText.setText(text || '').setColor(color || '#ffffff');
  }

  /** Where the hands have to get to for this load. */
  gripPoint() {
    const L = this.lift;
    const b = this.boxState;
    const bx = b.mode === 'held' ? this.heldBox().x : b.x;
    const bb = b.mode === 'held' ? this.heldBox().bottom : b.bottom;
    return { x: bx, bottom: bb, y: bb - L.h * 0.55 };
  }

  /** Knees and distance decide how far the back has to hinge; nothing else does. */
  solvePosture(dt) {
    const P = this.pose, L = this.lift;
    let needed, gap, reachable;
    if (P.hold) {
      // carrying: the back straightens in step with the knees, from whatever it was at the grip
      const ratio = this.gripSquat > 0.02 ? OTR.util.clamp01(P.squat / this.gripSquat) : 0;
      needed = (this.gripStoop || 0) * ratio;
      gap = 0;
      reachable = true;
    } else {
      const g = this.gripPoint();
      const hipY = this.G - P.elevate - 124 * (1 - 0.48 * P.squat);
      // the held-box formula in reverse: whatever the knees do not cover, the back has to
      needed = (g.bottom - hipY - 22 - P.squat * 62) / 48;
      const hands = P.x + P.dir * (20 + L.w / 2);
      gap = Math.abs(g.x - hands);
      reachable = needed <= 1.02 && gap < 52;
      // out of reach the courier just stands there: no folding over towards a box across the floor
      if (gap >= 52) needed = 0;
    }
    if (!isFinite(needed)) needed = 0;
    P.stoop = OTR.util.clamp(needed, 0, 1);
    P.reach = P.hold || gap >= 52 ? 0 : OTR.util.clamp(gap / 44, 0, 1);     // (arms down until it is in reach)
    // Lever arm of the load about the spine, in centimetres-ish. Held against the body it is short: carried
    // upright, a compact 40 lb case sits under the line, as the assessment teaches. Carry it with a bent back
    // and the stoop term pushes it well past; picking it up is judged on reach and stoop instead.
    // (a load picked up at arm's length stays further from the spine: the gap at the grip counts while carrying)
    const lever = (P.hold ? 14 + L.w * 0.12 + (this.gripGap || 0) * 0.6 : 22 + gap * 0.9) + P.stoop * 92;
    const load = OTR.util.clamp01(L.weight * lever / 2600 / (this.helper ? 1.9 : 1));
    if (this.phase === 'carry' || this.phase === 'set') {
      this.peakLoad = Math.max(this.peakLoad, load);
      if (load > 0.5) {
        this.strain += (load - 0.5) * dt;
        this.health = Math.max(0, this.health - (load - 0.5) * 26 * dt);
        this.healthBar.setValue(this.health / 100);
        this.healthText.setText(String(Math.round(this.health)));
        this.backGlow = Math.max(this.backGlow, (load - 0.5) * 1.6);
        if (load > 0.8) {
          this.strainSfx = (this.strainSfx || 0) - dt;
          if (this.strainSfx <= 0) { this.strainSfx = 0.9; OTR.audio.play('strain'); }
          if (this.mistakes.indexOf('stoop') < 0 && P.stoop > 0.45) this.mistakes.push('stoop');
          if (this.mistakes.indexOf('far') < 0 && (this.gripGap || 0) > 20) this.mistakes.push('far');
        }
      }
    }
    return { load, gap, needed, reachable };
  }

  drawLoadGauge(load) {
    const g = this.loadG;
    if (!g) return;
    const h = 190, w = 54, top = -96;
    if (load === null) {                           // nothing within reach yet: not lifting
      if (g.shown === 'idle') return;
      g.shown = 'idle';
      g.clear();
      g.fillStyle(0x000000, 0.3); g.fillRoundedRect(-w / 2, top, w, h, 10);
      g.lineStyle(3, 0xFFFFFF, 0.35);
      g.lineBetween(-w / 2 - 8, top + h * 0.5, w / 2 + 8, top + h * 0.5);
      this.loadNum.setText('NOT LIFTING').setColor('#9A8AB0');
      return;
    }
    const v = OTR.util.clamp01(load);
    if (g.shown === Math.round(v * h)) return;      // redraw only when the bar moves a pixel
    g.shown = Math.round(v * h);
    g.clear();
    g.fillStyle(0x000000, 0.45); g.fillRoundedRect(-w / 2, top, w, h, 10);
    g.fillStyle(0x2BC48A, 0.22); g.fillRect(-w / 2, top + h * 0.5, w, h * 0.5);
    const col = v > 0.8 ? 0xF0435A : v > 0.5 ? 0xFFB020 : 0x2BC48A;
    g.fillStyle(col, 1);
    g.fillRoundedRect(-w / 2, top + h * (1 - v), w, h * v, 8);
    g.lineStyle(3, 0xFFFFFF, 0.8);
    g.lineBetween(-w / 2 - 8, top + h * 0.5, w / 2 + 8, top + h * 0.5);   // the line you keep it under
    this.loadNum.setText(v > 0.8 ? 'DANGER' : v > 0.5 ? 'HEAVY' : 'SAFE')
      .setColor(v > 0.8 ? '#FF6B7F' : v > 0.5 ? '#FFC83D' : '#8BF0C6');
  }

  stepPosture(dt, time) {
    const P = this.pose, L = this.lift, K = this.pkeys;
    if (!this.postureOn) return;
    const speed = 150 * dt;
    const bendRate = 1.5 * dt / (L.speed || 1);

    const V = this.vkeys || {};
    if (K.left.isDown || K.a.isDown || V.left) { P.x -= speed; if (this.phase !== 'approach') P.dir = -1; }
    if (K.right.isDown || K.d.isDown || V.right) { P.x += speed; if (this.phase !== 'approach') P.dir = 1; }
    P.x = OTR.util.clamp(P.x, P.hold ? 160 : 420, 900);
    if (K.down.isDown || K.s.isDown || V.down) P.squat = Math.min(1, P.squat + bendRate);
    if (K.up.isDown || K.w.isDown || V.up) P.squat = Math.max(0, P.squat - bendRate);

    const st = this.solvePosture(dt);
    // Before the grip the gauge only reads once the load is within reach (it used to open every lift at DANGER
    // with nothing lifted); greyed out, NOT LIFTING, until then.
    this.drawLoadGauge(this.phase === 'approach' && st.gap >= 52 ? null : st.load);

    if (this.phase === 'approach') {
      this.phaseText.setText('PICK IT UP');
      if (!st.reachable && st.gap > 52) this.showCoach('Step in close to the load — A / D', '#FFC83D');
      else if (!st.reachable) this.showCoach('Bend your knees — hold S', '#FFC83D');
      else if (st.gap > 20) this.showCoach('Closer — the load belongs against your body', '#FFC83D');
      else if (P.stoop > 0.42 || st.load > 0.5) this.showCoach('That is your back doing the work. Bend the knees.', '#FF9A9A');
      else this.showCoach('Grip it — SPACE', '#8BF0C6');
      this.canGrip = st.reachable;
      P.hold = false;
    } else if (this.phase === 'carry') {
      this.phaseText.setText('CARRY IT TO THE PALLET');
      const dx = this.PALLET_X - this.heldBox().x;
      if (st.load > 0.62) this.showCoach('Keep it close and stand up — hold W', '#FF9A9A');
      // near the middle of the pallet before lowering: bending the knees moves the box a little, and it has to
      // stay on
      else if (!this.boxOverPallet() || Math.abs(dx) > 40) this.showCoach(dx < 0 ? 'Walk it to the pallet — A (turn with your feet)' : 'Walk it to the middle of the pallet — D', '#FFC83D');
      else { this.showCoach('Lower it with your knees — hold S, then SPACE', '#8BF0C6'); this.phase = 'set'; }
    } else if (this.phase === 'set') {
      this.phaseText.setText('SET IT DOWN');
      const hb = this.heldBox();
      const gapToPallet = this.PALLET_TOP - hb.bottom;
      if (!this.boxOverPallet()) { this.phase = 'carry'; return; }
      if (gapToPallet > 26) this.showCoach('Lower it with your knees — hold S', '#FFC83D');
      else this.showCoach('Let go — SPACE', '#8BF0C6');
    }
  }

  /** SPACE: pick the load up, or put it down. */
  postureAction() {
    if (!this.postureOn) return;
    const P = this.pose, L = this.lift;
    if (this.phase === 'approach') {
      if (!this.canGrip) {
        OTR.audio.play('click_dud');
        OTR.fx.floatText(this, P.x, this.G - 200, 'Can\'t reach it from there', '#FFC83D', { size: 20 });
        return;
      }
      P.hold = true;
      // how far the hands were from the load: over about 20 px is a reach, and it costs (the "get close" lesson
      // could never be failed before)
      this.gripGap = Math.abs(this.gripPoint().x - (P.x + P.dir * (20 + L.w / 2)));
      if (this.gripGap > 20) this.hurt(0, 'Too far from the load — step in first', 'far');
      this.gripStoop = P.stoop;
      this.gripSquat = Math.max(P.squat, 0.02);
      OTR.audio.play('pop');
      const from = { x: this.boxState.x, bottom: this.boxState.bottom };
      this.boxState = { mode: 'blend', t: 0, from };
      this.tweens.add({ targets: this.boxState, t: 1, duration: 200, onComplete: () => { this.boxState = { mode: 'held' }; } });
      this.phase = 'carry';
      if (P.stoop > 0.45) this.hurt(0, 'Back bent under the load!', 'stoop');
      else OTR.fx.sparkle(this, P.x, this.G - 150, 0x2BC48A);
      if (this.stool) this.tweens.add({ targets: this.stool, alpha: 0, duration: 200 });
      if (L.high) this.tweens.add({ targets: P, elevate: 0, duration: 450, ease: 'Quad.inOut' });
      return;
    }
    if (this.phase === 'carry' || this.phase === 'set') {
      const hb = this.heldBox();
      const gap = this.PALLET_TOP - hb.bottom;
      if (!this.boxOverPallet()) {
        // reaching out to place it instead of stepping across: that is the twist. The box leaves your hands
        // wherever they are (it used to hang in the air where you had held it).
        this.hurt(12, 'You reached and twisted!', 'twist');
        const onPallet = hb.x > this.PALLET_X0 && hb.x < this.PALLET_X1;
        this.boxState = { mode: 'static', x: hb.x, bottom: hb.bottom };
        this.tweens.add({ targets: this.boxState, bottom: onPallet ? this.PALLET_TOP : this.G, duration: 260, ease: 'Quad.in', onComplete: () => OTR.audio.play('thud') });
        this.finishPosture(0.2, true);
        return;
      }
      if (gap > 26) this.dropBox(gap); else this.placeBox((gap <= 8 ? 1 : 0.85) * (this.gripGap > 20 ? 0.6 : 1));
      return;
    }
  }

  /** The whole box on the pallet (a little overhang allowed), not just the courier standing near it. */
  boxOverPallet() {
    const hb = this.heldBox(), half = this.lift.w / 2, slack = this.lift.w * 0.1;
    return hb.x - half >= this.PALLET_X0 - slack && hb.x + half <= this.PALLET_X1 + slack;
  }

  /**
   * Score what the body actually did, then move on. fault: a drop or a twist has already said what went wrong, so
   * no verdict goes over it ("Clean lift" used to be stamped on top of "Dropped it!").
   */
  finishPosture(quality, fault) {
    if (!this.postureOn) return;
    const strainQ = OTR.util.clamp01(1 - this.strain / 2.2);
    const q = quality !== undefined ? Math.min(quality, strainQ) : strainQ;
    this.qualities.push(q);
    if (fault) { /* the fault's own message stands */ }
    else if (q >= 0.95 && this.strain < 0.25) this.praise('Clean lift — your back barely noticed.');
    else if (this.gripGap > 20 && this.strain < 1) OTR.fx.floatText(this, 640, 250, 'Placed — but lifted at arm\'s length', '#FFC83D', { size: 26 });
    else if (this.strain < 1) OTR.fx.floatText(this, 640, 250, 'A bit of strain there', '#FFC83D', { size: 26 });
    else OTR.fx.floatText(this, 640, 250, 'That one hurt', '#FF6B7F', { size: 28 });
    this.clearPostureHud();
    this.pose.hold = false;
    this.tweens.add({ targets: this.pose, squat: 0, stoop: 0, reach: 0, duration: 400, ease: 'Quad.out' });
    this.time.delayedCall(700, () => this.finishLift());
  }

  placeBox(q) {
    const hb = this.heldBox();
    this.boxState = { mode: 'static', x: hb.x, bottom: hb.bottom };
    this.pose.hold = false;
    this.tweens.add({ targets: this.boxState, bottom: this.PALLET_TOP, duration: 140 });
    OTR.audio.play('thud');
    this.finishPosture(q);
  }

  dropBox(gap) {
    const hb = this.heldBox();
    this.boxState = { mode: 'static', x: hb.x, bottom: hb.bottom };
    this.pose.hold = false;
    if (this.mistakes.indexOf('drop') < 0) this.mistakes.push('drop');
    this.tweens.add({
      targets: this.boxState, bottom: this.PALLET_TOP, duration: Math.min(400, 120 + gap * 2), ease: 'Quad.in',
      onComplete: () => {
        OTR.audio.play('thud');
        OTR.fx.shake(this, 200, 0.012);
        OTR.fx.burst(this, this.boxState.x, this.PALLET_TOP, { texture: 'p_smoke', tint: 0xD9CFE8, count: 16, blend: 'NORMAL' });
        OTR.fx.floatText(this, 640, 250, 'Dropped it!', '#FF6B7F', { size: 30 });
      }
    });
    this.finishPosture(0.35, true);
  }

  finishLift() {
    this.clearPostureHud();
    this.banner.setVisible(false);
    OTR.audio.play('coin');
    this.addScore(Math.round(100 + this.health), 640, 300);
    this.time.delayedCall(700, () => {
      this.tweens.add({
        targets: this.boxImg, alpha: 0, duration: 300,
        onComplete: () => {
          this.boxImg.setAlpha(1);
          if (this.stool) { this.stool.destroy(); this.stool = null; }
          this.nextLift();
        }
      });
    });
  }

  endScenario() {
    this.banner.setVisible(false);
    const C = this.content;
    const avg = this.qualities.length ? this.qualities.reduce((a, b) => a + b, 0) / this.qualities.length : 0;
    const safety = this.health / 100;
    // most dangerous first: a fall, a heavy or twisted lift before form faults
    const order = ['climb', 'heavy', 'twist', 'overhead', 'drop', 'yank', 'awkward', 'jerk', 'stoop', 'far', 'brace'];
    const rank = (m) => { const i = order.indexOf(m); return i < 0 ? order.length : i; };
    const lessons = this.mistakes.slice().sort((a, b) => rank(a) - rank(b)).map(m => C.lessons[m]).filter(Boolean);
    if (!lessons.length) lessons.push(C.lessons.perfect);
    // the score is the one the HUD built lift by lift (it used to be replaced here by an unrelated formula)
    OTR.fx.stamp(this, 640, 300, this.health >= 90 ? 'BACK SAVED!' : 'SHIFT DONE', this.health >= 90 ? 0x2BC48A : 0xFFB020, { size: 52, hold: 1400 });
    if (this.health >= 90) OTR.audio.play('fanfare');
    this.finish({
      ratios: { safety, efficiency: Math.pow(avg, 1.6) }, lessons, mistakes: this.mistakes.length,
      summary: `Back Health ${Math.round(this.health)}/100 · technique ${Math.round(avg * 100)}%`,
      stats: { health: this.health, avg }
    }, 1800);
  }

  /* ------------------------------------------------------------ drawing */
  limb(g, pts, width, color) {
    g.lineStyle(width, color, 1);
    for (let i = 0; i < pts.length - 1; i++) g.lineBetween(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
    g.fillStyle(color, 1);
    pts.forEach(p => g.fillCircle(p.x, p.y, width / 2));
  }

  drawWorker(gB, gF, P, handTarget) {
    const d = P.dir;
    const G = this.G - P.elevate;
    const thigh = 62, shin = 62, torso = 80;
    const hp = this.hip(P);
    const ax = P.x, ay = G;
    const dx = hp.x - ax, dy = hp.y - ay;
    const dist = Math.min(Math.hypot(dx, dy), thigh + shin - 0.01);
    const a = Math.atan2(dy, dx);
    const k = Math.acos(OTR.util.clamp((shin * shin + dist * dist - thigh * thigh) / (2 * shin * dist), -1, 1));
    const ka = a + d * k;
    const knee = { x: ax + Math.cos(ka) * shin, y: ay + Math.sin(ka) * shin };
    const lean = this.lean(P);
    const sh = { x: hp.x + d * Math.sin(lean) * torso, y: hp.y - Math.cos(lean) * torso };
    const head = { x: hp.x + d * Math.sin(lean) * (torso + 26), y: hp.y - Math.cos(lean) * (torso + 26) };

    const pants = 0x2B2F4A, shoe = 0x15151C, skin = 0xC98E6B;
    const shirt = OTR.color.lerp(0x4D148C, 0xE8304A, P.twist);

    // far leg & shoe
    const off = -d * 7;
    this.limb(gB, [{ x: ax + off, y: ay }, { x: knee.x + off, y: knee.y }, { x: hp.x + off, y: hp.y }], 20, OTR.color.shade(pants, -0.3));
    gB.fillStyle(shoe, 1); gB.fillRoundedRect(ax + off - (d > 0 ? 8 : 22), ay - 8, 30, 10, 4);

    // hands
    let hand;
    if (handTarget) hand = handTarget;
    else if (P.reach > 0 && this.boxState && this.boxState.mode === 'static') {
      const bx = this.boxState.x - d * (this.lift.w / 2 - 6);
      const by = this.boxState.bottom - this.lift.h * 0.5;
      const rest = { x: sh.x + d * (10 + P.stoop * 24), y: sh.y + 64 };
      hand = { x: OTR.util.lerp(rest.x, bx, P.reach), y: OTR.util.lerp(rest.y, by, P.reach) };
    } else {
      hand = { x: sh.x + d * (10 + P.stoop * 24), y: sh.y + 64 };
    }
    const elbow = { x: (sh.x + hand.x) / 2 - d * 8, y: (sh.y + hand.y) / 2 + 10 };

    // far arm
    this.limb(gB, [{ x: sh.x - d * 4, y: sh.y + 4 }, { x: elbow.x - d * 4, y: elbow.y }, { x: hand.x - d * 2, y: hand.y }], 14, OTR.color.shade(shirt, -0.35));

    // torso
    this.limb(gB, [{ x: hp.x, y: hp.y }, { x: sh.x, y: sh.y }], 34, shirt);
    gB.fillStyle(0xFF6600, 1);
    gB.fillCircle(sh.x, sh.y, 8);
    // head & cap
    gB.fillStyle(skin, 1); gB.fillCircle(head.x, head.y, 19);
    gB.fillStyle(0x4D148C, 1);
    gB.slice(head.x, head.y - 2, 20, Phaser.Math.DegToRad(180), Phaser.Math.DegToRad(360), false);
    gB.fillPath();
    gB.fillRect(head.x + (d > 0 ? 4 : -26), head.y - 6, 22, 6);
    gB.fillStyle(0x1D1030, 1); gB.fillCircle(head.x + d * 9, head.y + 2, 2.6);

    // near leg & shoe
    this.limb(gF, [{ x: ax, y: ay }, { x: knee.x, y: knee.y }, { x: hp.x, y: hp.y }], 22, pants);
    gF.fillStyle(shoe, 1); gF.fillRoundedRect(ax - (d > 0 ? 8 : 22), ay - 9, 32, 11, 4);
    // near arm
    this.limb(gF, [{ x: sh.x, y: sh.y + 2 }, { x: elbow.x, y: elbow.y }, { x: hand.x, y: hand.y }], 15, shirt);
    gF.fillStyle(skin, 1); gF.fillCircle(hand.x, hand.y, 8);
  }

  drawScene() {
    const P = this.pose;
    this.gBack.clear();
    this.gFront.clear();
    if (!this.lift) { this.drawWorker(this.gBack, this.gFront, P); return; }
    const L = this.lift;

    // box position
    let bx, bb;
    if (this.boxState.mode === 'held') {
      const hb = this.heldBox(); bx = hb.x; bb = hb.bottom;
    } else if (this.boxState.mode === 'blend') {
      const hb = this.heldBox(); const t = this.boxState.t;
      bx = OTR.util.lerp(this.boxState.from.x, hb.x, t); bb = OTR.util.lerp(this.boxState.from.bottom, hb.bottom, t);
    } else {
      bx = this.boxState.x; bb = this.boxState.bottom;
    }
    if (!this.tweens.isTweening(this.boxImg)) this.boxImg.setPosition(bx, bb);

    let handT = null;
    if (P.hold) handT = { x: bx - P.dir * (L.w / 2 - 8), y: bb - L.h * 0.55 };
    this.drawWorker(this.gBack, this.gFront, P, handT);

    if (this.helper) {
      const HP = { x: bx + P.dir * (L.w / 2 + 44), dir: -P.dir, squat: P.squat, stoop: 0, hold: P.hold, reach: P.reach, twist: 0, elevate: 0 };
      HP.x += P.dir * HP.squat * 26;
      const hand = P.hold || P.reach > 0.5 ? { x: bx + P.dir * (L.w / 2 - 8), y: bb - L.h * 0.55 } : null;
      this.drawWorker(this.gBack, this.gBack, HP, hand);
    }

    const b = this.backPos();
    this.glow.setPosition(b.x, b.y).setAlpha(this.backGlow * 0.9);
  }

  update(time, delta) {
    const dt = Math.min(0.05, delta / 1000);
    this.backGlow = Math.max(0, this.backGlow - dt * 0.8);
    if (this.postureOn) this.stepPosture(dt, time);
    this.drawScene();
  }
}
OTR.registerScene(LiftingScene);
