class TitleScene extends Phaser.Scene {
  constructor() { super('TitleScene'); }

  create() {
    const cfg = OTR_DATA.config;
    const W = OTR.W, H = OTR.H;
    OTR.fx.enter(this);

    this.WALK = 566;           // pavement line the people stand on
    this.ROAD = 664;           // where the van's wheels sit

    // --- sky, hills and the town in the distance ---
    this.add.image(W / 2, H / 2, OTR.scenery.sky(this, 'evening', 'clear')).setDepth(-100);
    const sun = this.add.image(W * 0.72, 300, 'p_glow').setScale(7).setTint(0xFFC27A).setAlpha(0.5).setDepth(-99);
    this.tweens.add({ targets: sun, alpha: 0.32, scale: 6.4, duration: 2800, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.far = this.add.tileSprite(W / 2, 400, W, 420, OTR.scenery.far(this, 'evening', 'clear', 4)).setDepth(-98).setAlpha(0.95);

    // --- the street: houses, pavement, kerb, road ---
    this.houses = [];
    const specs = [
      { w: 820, wall: 0xE3CDA6, roof: 0x7A5240, steps: 3, number: '204', porchX: 250, porchW: 360, lit: true },
      { w: 760, wall: 0xBFD2E0, roof: 0x4A5A68, steps: 2, number: '206', porchX: 220, porchW: 340, stories: 1, shutters: 0x3A5A78 },
      { w: 900, wall: 0xD9C7AC, roof: 0x8A6A4A, steps: 4, stories: 2, number: '208', porchX: 290, porchW: 400, lit: true, mailbox: true },
      { w: 800, wall: 0xBDCBDA, roof: 0x4C5968, steps: 2, number: '210', porchX: 240, porchW: 360, flowers: true }
    ];
    let hx = -120;
    specs.forEach((spec, i) => {
      const built = OTR.scenery.house(this, spec);
      const img = this.add.image(hx, this.WALK + 4, built.key).setOrigin(0.5, 1).setScale(0.34).setDepth(-60).setTint(0xBCC8D5);
      img.x = hx + img.displayWidth / 2;
      hx = img.x + img.displayWidth / 2 + 24;
      this.houses.push(img);
      void i;
    });
    this.houseSpan = hx + 120;

    const roadKey = OTR.tex.make(this, 'title_street', 256, 160, (ctx, w, h) => {
      const cv = OTR.cv;
      ctx.fillStyle = cv.lin(ctx, 0, 0, 0, 30, [[0, '#CFCCD4'], [1, '#B3B0BA']]);
      ctx.fillRect(0, 0, w, 30);                                  // pavement
      ctx.strokeStyle = 'rgba(80,70,90,0.22)'; ctx.lineWidth = 2;
      for (let x = 0; x < w; x += 90) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 30); ctx.stroke(); }
      ctx.fillStyle = '#9C9AA6'; ctx.fillRect(0, 30, w, 14);       // kerb
      ctx.fillStyle = '#C8C6D0'; ctx.fillRect(0, 30, w, 5);
      ctx.fillStyle = cv.lin(ctx, 0, 44, 0, h, [[0, '#55535E'], [1, '#33323B']]);
      ctx.fillRect(0, 44, w, h - 44);                              // road
      ctx.fillStyle = 'rgba(245,213,71,0.85)';
      ctx.fillRect(20, h - 44, 96, 7);
      for (let i = 0; i < 90; i++) { ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.05})`; ctx.fillRect(Math.random() * w, 44 + Math.random() * (h - 44), 2, 2); }
    });
    this.street = this.add.tileSprite(W / 2, this.WALK + 80, W, 160, roadKey).setDepth(-50);

    // --- the van rolling through ---
    this.van = this.add.image(W * 0.70, this.ROAD + 10, OTR.scenery.van(this, 'closed').key).setOrigin(0.5, 1).setScale(0.46).setDepth(-8);     // on the road, nearer than the sidewalk
    this.tweens.add({ targets: this.van, y: this.van.y - 2, duration: 190, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.exhaust = this.add.particles(0, 0, 'p_smoke', {
      follow: this.van, followOffset: { x: -132, y: -14 },
      speedX: { min: -150, max: -70 }, speedY: { min: -26, max: 4 },
      lifespan: 700, scale: { start: 0.35, end: 1.3 }, alpha: { start: 0.32, end: 0 },
      frequency: 95, tint: 0xD0DBE7
    }).setDepth(-9);

    // --- people on the pavement ---
    this.courier = OTR.rig.person(this, -80, this.WALK, {
      skin: 0xC98D62, hair: 0x2A1E18, hairStyle: 'short', shirt: OTR_DATA.theme.primary, uniform: true, cap: true, pants: 0x36424F
    }, { scale: 0.52, facing: 1 });
    this.courier.c.setDepth(-12);        // people on the sidewalk pass behind the van (they used to walk over its roof)
    this.courier.hold('box');
    this.loopWalk(this.courier, 1);

    this.local = OTR.rig.person(this, W + 80, this.WALK, {
      skin: 0xE8C9A8, hair: 0xB8663C, hairStyle: 'long', shirt: 0x2E7D5B, pants: 0x4A4658
    }, { scale: 0.5, facing: -1 });
    this.local.c.setDepth(-11);
    this.dog = OTR.rig.dog(this, W + 140, this.WALK, { fur: 0xC8A06A, patch: 0xE8D8B8, collar: 0xF0435A }, { mood: 'friendly' });
    this.dog.c.setDepth(-11).setScale(0.44);
    this.loopWalk(this.local, -1, this.dog);

    // packages drifting past, kept from the old screen
    this.time.addEvent({
      delay: 1600, loop: true, callback: () => {
        const b = this.add.image(-60, 150 + Math.random() * 140, OTR.art.pkg(this, { size: OTR.util.pick(['s', 'm']), route: 1 + Math.floor(Math.random() * 3), routeColor: OTR.util.pick([0x3DA5FF, 0x2BC48A, 0xFF5C8A]) }));
        b.setAlpha(0.28).setScale(0.55).setDepth(-70);
        this.tweens.add({ targets: b, x: W + 80, angle: 360, duration: 7000 + Math.random() * 3000, onComplete: () => b.destroy() });
      }
    });

    // --- title ---
    const titleY = 132;
    // a soft scrim so the title always has something to sit on, whatever is moving behind it
    const scrimKey = OTR.tex.make(this, 'title_scrim', 8, 470, (ctx, w, h) => {
      ctx.fillStyle = OTR.cv.lin(ctx, 0, 0, 0, h, [[0, 'rgba(22,6,43,0.62)'], [0.55, 'rgba(22,6,43,0.42)'], [1, 'rgba(22,6,43,0)']]);
      ctx.fillRect(0, 0, w, h);
    });
    this.add.image(W / 2, 0, scrimKey).setOrigin(0.5, 0).setDisplaySize(W, 470).setDepth(-5);
    // with a company name: the name large and the title under it; without one, the title takes the space
    const brand = cfg.brand ? OTR.txt(this, W / 2, titleY - 30, cfg.brand, 96, '#ffffff', { weight: '900', stroke: OTR_DATA.theme.css('primaryDark'), strokeW: 10, shadow: true }) : null;
    const route = cfg.brand ? OTR.txt(this, W / 2, titleY + 58, cfg.title.toUpperCase(), 58, OTR_DATA.theme.css('accent'), { weight: '900', stroke: OTR_DATA.theme.css('primaryDark'), strokeW: 10, shadow: true })
      : OTR.txt(this, W / 2, titleY + 24, cfg.title.toUpperCase(), 92, OTR_DATA.theme.css('accent'), { weight: '900', stroke: OTR_DATA.theme.css('primaryDark'), strokeW: 12, shadow: true });
    const sub = OTR.txt(this, W / 2, titleY + 116, cfg.subtitle, 22, '#eaf3fe', { bold: false, shadow: true });
    [brand, route, sub].filter(Boolean).forEach((t, i) => {
      t.setAlpha(0).setScale(0.6);
      this.tweens.add({ targets: t, alpha: 1, scale: 1, delay: 150 + i * 140, duration: 500, ease: 'Back.out' });
    });
    this.tweens.add({ targets: route, angle: { from: -1.5, to: 1.5 }, duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    // --- menu ---
    this.mute = OTR.ui.muteButton(this, W - 40, 40);
    this.langBtn = OTR.ui.iconButton(this, W - 96, 40, 'ic_globe', () => OTR.ui.languages(this), { size: 46 });
    this.menu = this.add.container(W / 2, 372);
    this.buildMenu();

    OTR.ui.saveWarning(this, W / 2, 26);
    OTR.txt(this, W / 2, H - 14, cfg.disclaimer, 13, 'rgba(255,255,255,0.75)', { bold: false, align: 'center', wrap: 1100 }).setDepth(5);
  }

  /** Walk a rig across the screen, then put it back on the far side and do it again. */
  loopWalk(rig, dir, follower) {
    const W = OTR.W;
    const target = dir > 0 ? W + 90 : -90;
    rig.walkTo(target, () => {
      rig.x = dir > 0 ? -90 : W + 90;
      if (follower) follower.x = rig.x - dir * 60;
      this.time.delayedCall(200, () => this.loopWalk(rig, dir, follower));
    }, { speed: 46 + Math.random() * 14 });
    if (follower) follower.play('trot');
  }

  buildMenu() {
    this.menu.removeAll(true);
    const save = OTR.save;
    const items = [];
    if (save.hasProfile()) {
      const name = save.displayName();
      items.push(OTR.ui.button(this, 0, 0, `Continue as ${name}`, () => OTR.fx.transition(this, 'HubScene'), { w: 400, h: 64, skin: 'orange', fontSize: 24, key: 'ENTER', hint: '⏎' }));
      const info = save.rankInfo();
      items.push(OTR.txt(this, 0, 50, `Day ${save.data.day} · ${info.rank.name} · ${info.total} ★`, 18, '#FFE3C8', { shadow: true, stroke: OTR_DATA.theme.css('primaryDark'), strokeW: 5 }));
      if (OTR.identity.locked) {
        // signed in by the company or the LMS: this person's own progress, and nothing to replace
        items.push(OTR.txt(this, 0, 96, `Signed in${OTR.identity.id && OTR.identity.id !== name ? ' as ' + OTR.identity.id : ''} · progress saved to ${OTR.identity.mode === 'scorm' ? 'your learning system' : 'the training server'}`, 16, '#cbdbee', { shadow: true, bold: false, stroke: OTR_DATA.theme.css('primaryDark'), strokeW: 4 }));
      } else {
        items.push(OTR.ui.button(this, 0, 110, 'New Profile', () => {
          // one profile per browser (several named profiles are out of scope for now), so this says what it replaces
          OTR.ui.confirm(this, 'Start a new profile?', `This erases ${name}'s rank, stars and progress. This can't be undone.`, () => this.askName(), { yes: 'Erase & Start', danger: true });
        }, { w: 260, h: 50, skin: 'ghost', fontSize: 20 }));
      }
    } else {
      items.push(OTR.ui.button(this, 0, 20, 'Start Training', () => this.askName(), { w: 360, h: 68, skin: 'orange', fontSize: 26, key: 'ENTER', hint: '⏎' }));
      items.push(OTR.txt(this, 0, 80, 'Your first shift starts now. Grab your scanner.', 18, '#FFE3C8', { shadow: true, bold: false, stroke: OTR_DATA.theme.css('primaryDark'), strokeW: 5 }));
    }
    items.forEach((it, i) => {
      it.setAlpha(0);
      it.y += 20;
      this.tweens.add({ targets: it, alpha: 1, y: it.y - 20, delay: 550 + i * 90, duration: 380, ease: 'Cubic.out' });
    });
    this.menu.add(items);
    // the arrow keys and TAB move between the menu's buttons (SHELL-11)
    this.menuFocus = OTR.ui.focus(this, items.filter(it => it.press).concat(this.langBtn ? [this.langBtn] : [], this.mute ? [this.mute] : []), { start: 0 });
  }

  askName() {
    OTR.ui.nameEntry(this, {
      onDone: (name) => {
        OTR.save.createProfile(name);
        OTR.audio.play('fanfare');
        OTR.fx.confetti(this, OTR.W / 2, OTR.H + 20, { count: 120 });
        this.time.delayedCall(500, () => OTR.fx.transition(this, 'HubScene'));
      }
    });
  }

  update(time, delta) {
    const dt = delta / 1000;
    this.far.tilePositionX += 6 * dt;
    this.street.tilePositionX += 26 * dt;
    // the houses drift with the street so the whole block reads as one place
    this.houses.forEach(h => {
      h.x -= 26 * dt;                                    // the same speed as the sidewalk they stand on
      if (h.x + h.displayWidth / 2 < -40) h.x += this.houseSpan;
    });
    if (this.dog && this.local) {
      this.dog.x += ((this.local.x + 62) - this.dog.x) * Math.min(1, dt * 3);
      this.dog.y = this.local.y;
    }
  }
}
OTR.registerScene(TitleScene);
