class HubScene extends Phaser.Scene {
  constructor() { super('HubScene'); }

  create() {
    const W = OTR.W, H = OTR.H;
    const save = OTR.save;
    if (!save.hasProfile()) { this.scene.start('TitleScene'); return; }
    OTR.fx.enter(this);

    this.add.image(W / 2, H / 2, OTR.tex.bg(this, 'hub_bg', [[0, '#2A0C52'], [1, '#12041F']], (ctx, w, h) => {
      ctx.strokeStyle = 'rgba(255,255,255,0.035)';
      ctx.lineWidth = 18;
      for (let x = -h; x < w; x += 70) { ctx.beginPath(); ctx.moveTo(x, h); ctx.lineTo(x + h, 0); ctx.stroke(); }
    }));

    // what a trainee should play next: the first scenario not passed yet, in the order the academy lists them
    // (a brand-new hire starts at the top; SHELL-18)
    this.fresh = !Object.keys(OTR.save.data.scenarios).length && !(OTR.save.data.route && OTR.save.data.route.days);
    this.nextUp = OTR.registry.all().find(sc => !this.passed(sc)) || null;
    this.focusables = [];

    this.buildHeader();
    this.buildProfile();
    this.buildModules();
    this.buildRoute();
    this.buildTip();
    OTR.ui.saveWarning(this, 968, 32);

    // For someone who has played nothing, ENTER opens the recommended first scenario, not the half-hour route day.
    if (this.fresh && this.nextUp) {
      OTR.onKey(this, 'keydown-ENTER', () => {
        if ((this._modalStack || []).some(m => m.active) || (this._focusOn && this._focusOn.showing())) return;
        this.openBrief(this.nextUp, OTR.registry.moduleOf(this.nextUp.id));
      });
    }
    // the arrow keys and TAB walk the hub (SHELL-11); the ring starts on the recommended scenario
    const start = this.focusables.findIndex(f => f.sc && this.nextUp && f.sc.id === this.nextUp.id);
    OTR.ui.focus(this, this.focusables, { start: start >= 0 ? start : 0 });
  }

  /** Passed: at least one star in every category it scores (a zero-star attempt is played, not done). */
  passed(sc) {
    const rec = OTR.save.data.scenarios[sc.id];
    const best = rec && rec.bestStars;
    return !!best && sc.categories.every(c => (best[c] || 0) >= 1);
  }

  /* ---------------------------------------------------------------- header */
  buildHeader() {
    const W = OTR.W;
    OTR.tex.shape(this, (g) => {
      g.fillStyle(0x16062B, 0.9); g.fillRect(0, 0, W, 64);
      g.fillStyle(0xFF6600, 1); g.fillRect(0, 64, W, 3);
    });
    const brand = OTR.txt(this, 24, 32, OTR_DATA.config.brand, 28, '#ffffff', { ox: 0, weight: '900' });
    OTR.txt(this, 24 + brand.width + 10, 33, OTR_DATA.config.title.toUpperCase(), 20, '#FF6600', { ox: 0, weight: '900' });

    // a label, not a button: flat and outlined (it used to wear the orange button's gradient; SHELL-17)
    const dayBadge = this.add.container(W / 2, 32);
    dayBadge.add(OTR.tex.shape(this, (g) => { g.lineStyle(2, 0xFF9447, 1); g.strokeRoundedRect(-120, -19, 240, 38, 19); }));
    dayBadge.add(OTR.txt(this, 0, 1, `DAY ${OTR.save.data.day}  ·  STATION`, 18, '#FFC8A0', { weight: '900' }));

    this.focusables.push(OTR.ui.muteButton(this, W - 90, 32));
    this.focusables.push(OTR.ui.iconButton(this, W - 36, 32, 'ic_gear', () => this.openSettings(), { size: 46 }));
  }

  /* ---------------------------------------------------------------- profile card */
  buildProfile() {
    const save = OTR.save;
    const x = 152, top = 84, w = 272, h = 318;
    this.add.image(x, top + h / 2, OTR.tex.panel(this, w, h, { top: 0x3A1870, bottom: 0x240A48, border: 0x6A45A0, radius: 20 }));

    OTR.tex.shape(this, (ring) => {
      ring.fillStyle(0xFF6600, 1); ring.fillCircle(x, top + 52, 42);
      ring.fillStyle(0xF3ECFF, 1); ring.fillCircle(x, top + 52, 37);
    });
    const avatar = this.add.image(x, top + 64, OTR.art.portrait(this, 'player', OTR.hub.playerSpec, 'happy')).setScale(0.23);
    const maskShape = this.make.graphics({ add: false });
    maskShape.fillStyle(0xffffff); maskShape.fillCircle(x, top + 52, 37);
    avatar.setMask(maskShape.createGeometryMask());
    this.tweens.add({ targets: avatar, y: avatar.y - 3, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    const nm = OTR.txt(this, x, top + 110, save.displayName(), 21, '#ffffff', { weight: '900' });
    if (nm.width > 244) nm.setScale(244 / nm.width);                  // a 24-character name stays on the card

    const info = save.rankInfo();
    const badge = this.add.container(x, top + 138);
    const rt = OTR.txt(this, 12, 0, info.rank.name.toUpperCase(), 13, '#ffffff', { weight: '900' });
    const bw = rt.width + 44;
    const rg = OTR.tex.shape(this, (rg) => { rg.fillStyle(info.rank.color, 1); rg.fillRoundedRect(-bw / 2, -13, bw, 26, 13); });
    badge.add([rg, this.add.image(-bw / 2 + 17, 0, 'ic_badge').setDisplaySize(16, 16), rt]);

    OTR.txt(this, x - 110, top + 164, 'COURIER RANK', 13, '#C9B3F0', { ox: 0 });
    // the bar fills with progress through this rank, so the numbers count the same stars (SHELL-9)
    OTR.txt(this, x + 110, top + 166, info.next ? `${info.total - info.rank.stars} / ${info.next.stars - info.rank.stars} ★` : `${info.total} ★ MAX`, 13, '#FFC83D', { ox: 1 });
    const bar = OTR.ui.bar(this, x - 110, top + 184, 220, 11, { color: 0xFF6600, bgAlpha: 0.35 });
    bar.setValue(info.progress, true, 900);
    OTR.txt(this, x, top + 202, info.next ? `Next: ${info.next.name}` : 'Top rank reached!', 13, '#E6DAF7', { bold: false });

    // category totals, each named (the icons alone left a new hire guessing; SHELL-17)
    const totals = save.totals();
    Object.keys(OTR_DATA.config.categories).forEach((cat, i) => {
      const def = OTR_DATA.config.categories[cat];
      const cx = x - 84 + i * 84;
      OTR.tex.shape(this, (g) => { g.fillStyle(0x000000, 0.22); g.fillRoundedRect(cx - 40, top + 220, 80, 52, 10); });
      this.add.image(cx - 14, top + 236, def.icon).setDisplaySize(16, 16).setTint(def.color);
      OTR.txt(this, cx + 2, top + 236, `${totals[cat]}`, 18, OTR.color.css(def.color), { ox: 0, weight: '900' });
      OTR.txt(this, cx, top + 259, def.label, 13, '#E6DAF7', { bold: false });
    });

    // the stars, and the way to the trainee record
    const passed = OTR.registry.all().filter(sc => this.passed(sc)).length;
    OTR.txt(this, x - 110, top + 294, `${totals.all}/${OTR.registry.maxStars()} ★ · ${passed}/${OTR.registry.all().length} played`, 13, '#FFC83D', { ox: 0, weight: '900' });
    const link = OTR.txt(this, x + 110, top + 294, 'My record ›', 13, '#8BF0C6', { ox: 1, weight: '900' });
    const ul = OTR.tex.shape(this, (g) => { g.fillStyle(0x8BF0C6, 0.9); g.fillRect(x + 110 - link.width, top + 303, link.width, 2); });
    link.press = () => OTR.fx.transition(this, 'RecordScene', {});
    link.setInteractive({ useHandCursor: true }).on('pointerup', link.press);
    link.on('pointerover', () => ul.setAlpha(0.4)).on('pointerout', () => ul.setAlpha(1));
    this.focusables.push(link);
  }

  /* ---------------------------------------------------------------- today's route */
  buildRoute() {
    const save = OTR.save;
    const x = 152, top = 412, w = 272, h = 196;
    const st = OTR.shift && OTR.shift.state;
    const live = OTR.shift && OTR.shift.active();
    this.add.image(x, top + h / 2, OTR.tex.panel(this, w, h, { top: live ? 0xFF8A3D : 0x4D148C, bottom: live ? 0xC85000 : 0x2A0F4F, border: 0xFFB27A, radius: 20 }));
    OTR.txt(this, x, top + 26, live ? 'ROUTE IN PROGRESS' : 'TODAY\'S ROUTE', 15, '#ffffff', { weight: '900' });

    const weather = OTR.shift ? OTR.shift.weatherFor(save.data.day) : 'clear';
    const wLabel = { clear: 'Clear', cloudy: 'Overcast', rain: 'Rain', storm: 'Storms', snow: 'Snow and ice', heat: 'Extreme heat' }[weather] || weather;
    if (live) {
      const doneN = st.route.filter(r => r.done).length;
      const phase = { brief: 'morning briefing', pretrip: 'pre-trip walkaround', load: 'loading the truck', route: `stop ${doneN + 1} of ${st.route.length}`, debrief: 'debrief' }[st.phase] || st.phase;
      OTR.txt(this, x, top + 52, `Day ${st.day} · ${phase}`, 14, '#FFE3C8', { bold: false, align: 'center', wrap: 240 });
      OTR.txt(this, x, top + 76, `${st.stats.delivered} delivered · ${st.stats.exceptions} exception${st.stats.exceptions === 1 ? '' : 's'}`, 13, '#FFF1E0', { bold: false });
      // purple on the orange card, so the main action stands out from it (SHELL-17)
      this.focusables.push(OTR.ui.button(this, x, top + 118, 'Resume route ▶', () => OTR.shift.resume(this), { w: 240, h: 48, skin: 'purple', fontSize: 18, key: 'ENTER', hint: '⏎' }));
      const ab = OTR.txt(this, x, top + 166, 'Abandon this route', 14, '#ffffff', { weight: '900' });
      const ul = OTR.tex.shape(this, (g) => { g.fillStyle(0xffffff, 0.9); g.fillRect(x - ab.width / 2, top + 176, ab.width, 2); });
      ab.press = () => OTR.ui.confirm(this, 'Abandon the route?', 'The day so far is discarded and you can start again from the morning briefing.', () => { OTR.shift.abort(); this.scene.restart(); }, { yes: 'Abandon', danger: true });
      ab.setInteractive({ useHandCursor: true }).on('pointerup', ab.press);
      ab.on('pointerover', () => ul.setAlpha(0.5)).on('pointerout', () => ul.setAlpha(1));
      this.focusables.push(ab);
    } else {
      OTR.txt(this, x, top + 54, `Day ${save.data.day}  ·  5 stops`, 17, '#ffffff', { weight: '900' });
      OTR.txt(this, x, top + 76, wLabel, 14, '#FFE3C8', { bold: false });
      // one line: the Start button sits right under it
      OTR.txt(this, x, top + 95, 'Brief → pre-trip → load → the stops', 13, '#E6DAF7', { bold: false });
      // a route day is a long session: say so before it starts (a stray Enter used to drop you into the briefing)
      // (ENTER is not its key for someone who has played nothing yet: see create)
      this.focusables.push(OTR.ui.button(this, x, top + 132, 'Start the route ▶', () => OTR.ui.confirm(this, `Start day ${save.data.day}'s route?`,
        'Briefing, pre-trip, loading, then five stops: about half an hour. The day is saved as you go, and ESC pauses.',
        () => OTR.shift.start(this), { yes: 'Start ▶', key: 'ENTER', hint: '⏎' }), { w: 240, h: 50, skin: 'orange', fontSize: 18, key: this.fresh ? undefined : 'ENTER', hint: this.fresh ? undefined : '⏎' }));
      const r = save.data.route || { days: 0, best: { safety: 0, efficiency: 0, service: 0 } };
      const best = (r.best.safety || 0) + (r.best.efficiency || 0) + (r.best.service || 0);
      OTR.txt(this, x, top + 166, r.days ? `${r.days} route day${r.days === 1 ? '' : 's'} logged · best ${best}/9 ★` : 'No route days logged yet', 13, '#FFD5C0', { bold: false }).setY(top + 170);
      if (r.last) {
        const link = OTR.txt(this, x, top + 187, `Day ${r.last.day}'s debrief ›`, 13, '#FFC83D', { weight: '900' });
        link.press = () => OTR.fx.transition(this, 'ShiftDebriefScene', { review: true });
        link.setInteractive({ useHandCursor: true }).on('pointerup', link.press);
        this.focusables.push(link);
      }
    }
  }

  /* ---------------------------------------------------------------- academy board */
  buildModules() {
    const mods = OTR.registry.modules();
    const X0 = 308, Y0 = 112, gap = 12;
    const cols = 3;
    const pw = Math.floor((OTR.W - X0 - 20 - gap * (cols - 1)) / cols);
    const ph = 190;
    OTR.txt(this, X0, 92, 'TRAINING ACADEMY', 15, '#FF9447', { ox: 0, weight: '900' });
    const A = OTR.academy, as = A.assessmentAllowed() ? A.summary() : null;
    const right = this.fresh ? 'New here? Start with the scenario marked NEXT'
      : as ? `Assessments passed: ${as.passed} / ${as.total}${A.practiceAllowed() ? '  ·  practise any time' : ''}` : 'Practice any module, any time';
    OTR.txt(this, OTR.W - 20, 92, right, 14, this.fresh ? '#FFC83D' : as ? '#8BF0C6' : '#C9B3F0', { ox: 1, bold: !!this.fresh || !!as });

    mods.forEach((m, i) => {
      const px = X0 + (i % cols) * (pw + gap);
      const py = Y0 + Math.floor(i / cols) * (ph + gap);
      const panel = this.add.container(px + pw / 2, py + ph / 2);
      panel.add(OTR.ui.panel(this, 0, 0, pw, ph, { top: 0xFFFFFF, bottom: 0xEEE6FA, radius: 16 }));
      panel.add(OTR.tex.shape(this, (hg) => {
        hg.fillStyle(m.color, 1);
        hg.fillRoundedRect(-pw / 2, -ph / 2, pw, 44, { tl: 16, tr: 16, bl: 0, br: 0 });
        hg.fillStyle(0x000000, 0.12);
        hg.fillRect(-pw / 2, -ph / 2 + 41, pw, 3);
        hg.fillStyle(0xFFFFFF, 0.25);
        hg.fillCircle(-pw / 2 + 26, -ph / 2 + 22, 15);
      }));
      panel.add(this.add.image(-pw / 2 + 26, -ph / 2 + 22, m.icon).setDisplaySize(20, 20));
      const t = OTR.txt(this, -pw / 2 + 48, -ph / 2 + 15, m.title, 16, '#ffffff', { ox: 0, weight: '900', shadow: true });
      if (t.width > pw - 70) t.setScale((pw - 70) / t.width);
      panel.add(t);
      panel.add(OTR.txt(this, -pw / 2 + 48, -ph / 2 + 32, m.subtitle || '', 13, 'rgba(255,255,255,0.9)', { ox: 0, bold: false }));

      // module star total
      const best = m.scenarios.reduce((n, sc) => n + OTR.save.starSum(OTR.save.bestStars(sc.id)), 0);
      const max = m.scenarios.reduce((n, sc) => n + sc.categories.length * 3, 0);
      panel.add(this.add.image(pw / 2 - 52, -ph / 2 + 22, 'star_gold').setDisplaySize(16, 16));
      panel.add(OTR.txt(this, pw / 2 - 40, -ph / 2 + 22, `${best}/${max}`, 13, '#ffffff', { ox: 0, weight: '900' }));

      // modules with four scenarios (Safety & Wellness) start their rows higher and space them closer, in the same
      // type as every other card (they used to shrink it; SHELL-19)
      const n = m.scenarios.length;
      const pitch = n > 3 ? 35 : 44;
      const rowH = n > 3 ? 33 : 40;
      const first = n > 3 ? 64 : 68;
      m.scenarios.forEach((sc, j) => {
        const row = this.scenarioRow(sc, m, 0, -ph / 2 + first + j * pitch, pw - 20, rowH);
        panel.add(row);
        this.focusables.push(row);
      });

      panel.setAlpha(0).setScale(0.95);
      this.tweens.add({ targets: panel, alpha: 1, scale: 1, delay: 60 + i * 50, duration: 300, ease: 'Back.out' });
    });
  }

  scenarioRow(sc, mod, x, y, w, height) {
    const save = OTR.save;
    const h = height || 40;
    const ico = h > 34 ? 28 : 25;
    const next = this.nextUp && this.nextUp.id === sc.id;
    const c = this.add.container(x, y);
    const g = OTR.tex.liveShape(this);
    const rec = save.record(sc.id);
    const draw = (hover) => g.redraw((g) => {
      g.fillStyle(hover ? OTR.color.shade(mod.color, 0.84) : next ? 0xFFF1E6 : 0xF6F1FD, 1);
      g.fillRoundedRect(-w / 2, -h / 2, w, h, 10);
      g.lineStyle(next ? 3 : 2, hover ? mod.color : next ? 0xFF6600 : 0xE0D4F2, 1);
      g.strokeRoundedRect(-w / 2, -h / 2, w, h, 10);
    });
    draw(false);
    c.add(g);
    c.add(OTR.tex.shape(this, (ib) => { ib.fillStyle(mod.color, 1); ib.fillRoundedRect(-w / 2 + 6, -ico / 2, ico, ico, 8); }));
    c.add(this.add.image(-w / 2 + 6 + ico / 2, 0, sc.icon || mod.icon).setDisplaySize(ico - 12, ico - 12));
    const title = OTR.txt(this, -w / 2 + 42, 0, sc.title, 14, '#250849', { ox: 0, weight: '900' });
    const maxTitleW = w - 42 - 86;
    if (title.width > maxTitleW) title.setScale(maxTitleW / title.width);
    c.add(title);

    const got = save.starSum(save.bestStars(sc.id));
    const max = sc.categories.length * 3;
    // NEXT marks the recommended scenario (SHELL-18); NEW the ones not played yet
    if (next || !rec) {
      c.add(OTR.tex.shape(this, (ng) => { ng.fillStyle(next ? 0x4D148C : 0xFF6600, 1); ng.fillRoundedRect(w / 2 - 78, -10, 48, 20, 10); }));
      c.add(OTR.txt(this, w / 2 - 54, 0, next ? 'NEXT' : 'NEW', 13, '#ffffff', { weight: '900' }));
    } else {
      c.add(this.add.image(w / 2 - 70, 0, 'star_gold').setDisplaySize(15, 15));
      c.add(OTR.txt(this, w / 2 - 59, 0, `${got}/${max}`, 13, got === max ? '#1E9E6B' : '#7A6A90', { ox: 0, weight: '900' }));
    }
    // the assessment, once taken: a green tick when passed, a red cross when it can't be retaken
    const ast = OTR.academy.assessmentAllowed() ? OTR.academy.status(sc.id) : 'none';
    if (ast === 'passed' || ast === 'failed' || ast === 'retake') {
      const col = ast === 'passed' ? 0x1E9E6B : ast === 'failed' ? 0xC8243B : 0xB26A00;
      c.add(OTR.tex.shape(this, (bg) => { bg.fillStyle(col, 1); bg.fillCircle(w / 2 - 94, 0, 9); }));
      c.add(OTR.txt(this, w / 2 - 94, 0, ast === 'passed' ? '✓' : ast === 'failed' ? '✕' : '!', 12, '#ffffff', { weight: '900' }));
      if (title.width > maxTitleW - 22) title.setScale((maxTitleW - 22) / (title.width / title.scaleX));
    }
    c.add(this.add.image(w / 2 - 15, 0, 'ic_arrow').setDisplaySize(13, 13).setTint(mod.color));

    const hit = this.add.rectangle(0, 0, w, h, 0xffffff, 0.001).setInteractive({ useHandCursor: true });
    c.add(hit);
    hit.on('pointerover', () => { draw(true); OTR.audio.play('hover'); this.tweens.add({ targets: c, x: x + 3, duration: 100 }); });
    hit.on('pointerout', () => { draw(false); this.tweens.add({ targets: c, x, duration: 100 }); });
    c.press = () => { OTR.audio.play('click'); this.openBrief(sc, mod); };
    hit.on('pointerup', c.press);
    c.setSize(w, h);
    c.sc = sc;
    return c;
  }

  openBrief(sc, mod) {
    const save = OTR.save;
    const rec = save.record(sc.id);
    // The brief grows to fit what it says. At a fixed 540 px, a three-line blurb with six things to practise ran
    // the controls line under the star ratings (Sort Belt, Road Hazards, After a Fender-Bender).
    const measure = (str, size, opts) => { const t = OTR.txt(this, 0, 0, str, size, '#000', opts); const th = t.height; t.destroy(); return th; };
    const body = 122 + measure(sc.blurb, 18, { ox: 0, oy: 0, bold: false, wrap: 640, lineSpacing: 3 }) + 18 + 24 +
      sc.learn.length * 26 + 8 + 22 + measure(sc.controls, 15, { ox: 0, oy: 0, bold: false, wrap: 640 });
    // practice and the assessment, as the academy allows; the assessment's standing in the header
    const A = OTR.academy, ast = A.status(sc.id), left = A.attemptsLeft(sc.id);
    const aStat = !A.assessmentAllowed() ? null : ast === 'passed' ? 'Assessment: passed ✓'
      : ast === 'failed' ? 'Assessment: not passed · ask your trainer for another attempt'
        : ast === 'retake' ? `Assessment: not passed · ${left === Infinity ? 'retake any time' : left + ' attempt' + (left === 1 ? '' : 's') + ' left'}` : 'Assessment: not taken';
    const buttons = [{ label: 'Back', skin: 'ghost' }];
    const canAssess = A.assessmentAllowed() && left > 0;
    if (A.practiceAllowed()) buttons.push({ label: rec ? 'Practice again' : 'Practice', skin: canAssess ? 'purple' : 'orange', key: canAssess ? undefined : 'ENTER', hint: canAssess ? undefined : '⏎', onClick: () => OTR.flow.startScenario(this, sc.id) });
    if (canAssess) buttons.push({ label: ast === 'retake' ? 'Retake test ▶' : 'Assessment ▶', skin: 'orange', key: 'ENTER', hint: '⏎', onClick: () => this.time.delayedCall(250, () => this.confirmAssessment(sc)) });
    OTR.ui.modal(this, {
      w: 720, h: Math.min(700, Math.max(540, body + 150)), escClose: true,
      build: (box, api, w, h) => {
        box.add(OTR.tex.shape(this, (hg) => { hg.fillStyle(mod.color, 1); hg.fillRoundedRect(-w / 2, -h / 2, w, 96, { tl: 22, tr: 22, bl: 0, br: 0 }); }));
        box.add(this.add.image(-w / 2 + 56, -h / 2 + 48, sc.icon || mod.icon).setDisplaySize(44, 44));
        box.add(OTR.txt(this, -w / 2 + 96, -h / 2 + 30, mod.title.toUpperCase(), 13, 'rgba(255,255,255,0.85)', { ox: 0 }));
        box.add(OTR.txt(this, -w / 2 + 96, -h / 2 + 58, sc.title, 32, '#ffffff', { ox: 0, weight: '900', shadow: true }));

        let y = -h / 2 + 122;
        const blurb = OTR.txt(this, -w / 2 + 40, y, sc.blurb, 18, '#3A2A50', { ox: 0, oy: 0, bold: false, wrap: w - 80, lineSpacing: 3 });
        box.add(blurb);
        y += blurb.height + 18;
        box.add(OTR.txt(this, -w / 2 + 40, y, 'YOU\'LL PRACTICE', 13, '#FF6600', { ox: 0, oy: 0 }));
        y += 24;
        sc.learn.forEach(l => {
          box.add(this.add.image(-w / 2 + 50, y + 10, 'ic_check').setDisplaySize(14, 14).setTint(0x2BC48A));
          box.add(OTR.txt(this, -w / 2 + 66, y, l, 16, '#3A2A50', { ox: 0, oy: 0, bold: false }));
          y += 26;
        });
        y += 8;
        box.add(OTR.txt(this, -w / 2 + 40, y, 'CONTROLS', 13, '#FF6600', { ox: 0, oy: 0 }));
        box.add(OTR.txt(this, -w / 2 + 40, y + 22, sc.controls, 15, '#5A4A70', { ox: 0, oy: 0, bold: false, wrap: w - 80 }));

        const catY = h / 2 - 118;
        const n = sc.categories.length;
        OTR.scoring.ordered(sc.categories).forEach((cat, i) => {
          const cx = (i - (n - 1) / 2) * 230;
          const chip = OTR.ui.chip(this, cx - 50, catY, cat, { size: 14 });
          const st = OTR.ui.stars(this, cx + 70, catY, save.bestStars(sc.id)[cat] || 0, { size: 26, dark: true });
          box.add([chip, st]);
        });
        // in the header, clear of the blurb (it used to be printed on its first line; SHELL-13)
        if (rec) box.add(OTR.txt(this, w / 2 - 28, -h / 2 + 30, `Best ${OTR.save.starSum(save.bestStars(sc.id))} / ${n * 3} ★ · played ${rec.plays}×`, 14, '#ffffff', { ox: 1, weight: '900', shadow: true }));
        if (aStat) box.add(OTR.txt(this, w / 2 - 28, -h / 2 + 64, aStat, 14, '#ffffff', { ox: 1, weight: '900', shadow: true }));
      },
      buttons
    });
  }

  /** The PIN (or, on a browser-only install with none yet, choosing one), then the trainer tools. */
  trainerLogin(retry) {
    const A = OTR.academy;
    if (A.pin) { OTR.fx.transition(this, 'TrainerScene'); return; }
    if (!A.pinSet()) {
      if (OTR.identity.mode === 'server') {
        OTR.ui.modal(this, { title: 'Trainer tools are off', w: 600, h: 300, escClose: true,
          body: 'This training server has no trainer PIN. IT turns the tools on by starting the server with OTR_TRAINER_PIN set (see the README).',
          buttons: [{ label: 'OK', skin: 'orange', key: ['ENTER', 'SPACE'], hint: '⏎' }] });
        return;
      }
      OTR.ui.nameEntry(this, { title: 'Choose a trainer PIN', pin: true, confirm: 'Next', hint: 'Only trainers should know it · 4 to 8 digits',
        onDone: (pin) => this.time.delayedCall(200, () => OTR.ui.nameEntry(this, { title: 'Type it again', pin: true, confirm: 'Set PIN',
          onDone: (again) => {
            if (again !== pin) { OTR.ui.toast(this, 'The two PINs didn\'t match. Try again.', 0xF0435A); return; }
            A.setLocalPin(pin);
            OTR.fx.transition(this, 'TrainerScene');
          } })) });
      return;
    }
    OTR.ui.nameEntry(this, { title: retry ? 'Trainer PIN (try again)' : 'Trainer PIN', pin: true, confirm: 'Open', hint: retry || undefined,
      onDone: (pin) => A.checkPin(pin).then(res => {
        if (res === true) { OTR.fx.transition(this, 'TrainerScene'); return; }
        OTR.audio.play('fail');
        this.time.delayedCall(200, () => this.trainerLogin(res));
      }) });
  }

  /** The assessment's rules, then the attempt. */
  confirmAssessment(sc) {
    const A = OTR.academy, need = A.get().passStars, left = A.attemptsLeft(sc.id);
    const cats = OTR.scoring.ordered(sc.categories).map(c => `${need[c]}★ ${OTR_DATA.config.categories[c].label}`).join(' · ');
    OTR.ui.confirm(this, `Assessment: ${sc.title}`,
      `No hints and no restarting. To pass: ${cats}, and no critical mistakes. ` +
      (left === Infinity ? 'Quitting part-way counts as not passed.' : `Starting uses ${left === 1 ? 'your only attempt' : `one of your ${left} attempts`}, and quitting part-way counts as not passed.`),
      () => OTR.flow.startScenario(this, sc.id, { assess: true }), { yes: 'Start ▶', key: 'ENTER', hint: '⏎' });
  }

  /* ---------------------------------------------------------------- dispatch radio */
  buildTip() {
    const x = 152, tipY = 664, w = 272;
    this.add.image(x, tipY, OTR.tex.panel(this, w, 96, { top: 0x3A1870, bottom: 0x240A48, border: 0x6A45A0, radius: 16 }));
    this.add.image(x - 104, tipY - 30, 'ic_chat').setDisplaySize(18, 18).setTint(0xFF6600);
    OTR.txt(this, x - 88, tipY - 30, 'DISPATCH RADIO', 13, '#FF9447', { ox: 0 });
    const tips = OTR_DATA.config.dispatcherTips;
    let ti = Math.floor(Math.random() * tips.length);
    const tip = OTR.txt(this, x, tipY + 14, tips[ti], 13, '#F3ECFF', { bold: false, align: 'center', wrap: 236, lineSpacing: 2 });
    this.time.addEvent({
      delay: 7000, loop: true, callback: () => {
        this.tweens.add({
          targets: tip, alpha: 0, duration: 250, onComplete: () => {
            ti = (ti + 1) % tips.length;
            tip.setText(tips[ti]);
            this.tweens.add({ targets: tip, alpha: 1, duration: 250 });
          }
        });
      }
    });
  }

  /* ---------------------------------------------------------------- settings */
  openSettings() {
    // volume and the route-day checklist, besides the profile (SHELL-12)
    OTR.ui.modal(this, {
      title: 'Settings', w: 540, h: OTR.identity.locked ? 520 : 600, escClose: true,
      build: (box, api, w, h) => {
        const top = -h / 2;
        // trainer tools, behind the PIN, in the corner away from a trainee's own settings
        box.add(OTR.ui.button(this, w / 2 - 78, top + 42, 'Trainer', () => api.close(() => this.trainerLogin()), { w: 120, h: 38, skin: 'ghost', fontSize: 15, icon: 'ic_badge', iconSize: 16 }));
        box.add(OTR.txt(this, -w / 2 + 40, top + 100, 'SOUND VOLUME', 13, '#FF6600', { ox: 0 }));
        const bar = OTR.ui.bar(this, -160, top + 136, 250, 14, { color: 0xFF6600, bg: 0x4D148C, bgAlpha: 0.15 });
        const pct = OTR.txt(this, 158, top + 136, '', 16, '#4D148C', { ox: 0, weight: '900' });
        const show = () => {
          bar.setValue(OTR.audio.volume);
          pct.setText(OTR.audio.muted ? 'muted' : `${Math.round(OTR.audio.volume * 100)}%`);
        };
        const setVol = (v) => {
          v = Math.round(Math.max(0, Math.min(1, v)) * 20) / 20;
          OTR.audio.init();
          OTR.audio.setVolume(v);
          OTR.save.setVolume(v);
          show();
          OTR.audio.play('pop');
        };
        const hit = this.add.rectangle(-35, top + 136, 270, 30, 0xffffff, 0.001).setInteractive({ useHandCursor: true });
        hit.on('pointerdown', (p) => setVol((p.x - (OTR.W / 2 - 160)) / 250));
        box.add([bar, pct, hit]);
        box.add(OTR.ui.button(this, -200, top + 136, '−', () => setVol(OTR.audio.volume - 0.1), { w: 44, h: 40, skin: 'ghost', fontSize: 24, sound: 'none' }));
        box.add(OTR.ui.button(this, 120, top + 136, '+', () => setVol(OTR.audio.volume + 0.1), { w: 44, h: 40, skin: 'ghost', fontSize: 24, sound: 'none' }));
        show();

        box.add(OTR.txt(this, -w / 2 + 40, top + 188, 'ROUTE DAYS', 13, '#FF6600', { ox: 0 }));
        const label = () => `Stop checklist: ${OTR.save.data.settings.hints ? 'shown' : 'hidden'}`;
        const tog = OTR.ui.button(this, 0, top + 224, label(), () => {
          OTR.save.setHints(!OTR.save.data.settings.hints);
          tog.setLabel(label());
        }, { w: 320, h: 48, skin: 'purple', fontSize: 18 });
        box.add(tog);

        // signed in by the company or the LMS: the name is the sign-in's, and only a trainer resets progress
        const locked = OTR.identity.locked;
        if (locked) box.add(OTR.txt(this, 0, 20, `Signed in as ${OTR.save.displayName()}.\nA trainer can reset your progress.`, 16, '#4D148C', { bold: false, align: 'center' }));
        if (!locked) box.add(OTR.ui.button(this, 0, 20, 'Rename Courier', () => {
          api.close(() => OTR.ui.nameEntry(this, {
            title: 'New courier name', initial: OTR.save.data.profile.name, confirm: 'Save',
            onDone: (name) => { OTR.save.rename(name); this.scene.restart(); }
          }));
        }, { w: 300, h: 56, skin: 'purple' }));
        box.add(OTR.ui.button(this, 0, 90, 'Back to Title', () => OTR.fx.transition(this, 'TitleScene'), { w: 300, h: 56, skin: 'ghost' }));
        if (!locked) box.add(OTR.ui.button(this, 0, 160, 'Reset All Progress', () => {
          OTR.ui.confirm(this, 'Reset all progress?', 'This permanently deletes your profile, rank, stars and shift history.', () => {
            OTR.save.reset();
            OTR.fx.transition(this, 'TitleScene');
          }, { yes: 'Reset Everything', danger: true });
        }, { w: 300, h: 56, skin: 'red' }));
      },
      buttons: [{ label: 'Close', skin: 'orange', key: 'ENTER', hint: '⏎' }]
    });
  }
}
OTR.registerScene(HubScene);

OTR.hub = {
  playerSpec: { kind: 'person', skin: 0xC98E6B, hair: 0x2E2018, hairStyle: 'cap', shirt: 0x4D148C, uniform: true, capColor: 0x4D148C }
};
