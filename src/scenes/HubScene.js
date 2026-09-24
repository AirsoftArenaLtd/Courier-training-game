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

    this.buildHeader();
    this.buildProfile();
    this.buildModules();
    this.buildRoute();
    this.buildTip();
  }

  /* ---------------------------------------------------------------- header */
  buildHeader() {
    const W = OTR.W;
    const g = this.add.graphics();
    g.fillStyle(0x16062B, 0.9); g.fillRect(0, 0, W, 64);
    g.fillStyle(0xFF6600, 1); g.fillRect(0, 64, W, 3);
    const brand = OTR.txt(this, 24, 32, OTR_DATA.config.brand, 28, '#ffffff', { ox: 0, weight: '900' });
    OTR.txt(this, 24 + brand.width + 10, 33, OTR_DATA.config.title.toUpperCase(), 20, '#FF6600', { ox: 0, weight: '900' });

    const dayBadge = this.add.container(W / 2, 32);
    dayBadge.add(OTR.ui.panel(this, 0, 0, 250, 44, { top: 0xFF8A3D, bottom: 0xE65100, border: 0xFFB27A, borderWidth: 2, radius: 22, shadow: 0.3, sheen: true }));
    dayBadge.add(OTR.txt(this, 0, 1, `DAY ${OTR.save.data.day}  ·  STATION`, 19, '#ffffff', { weight: '900' }));

    OTR.ui.muteButton(this, W - 90, 32);
    OTR.ui.iconButton(this, W - 36, 32, 'ic_gear', () => this.openSettings(), { size: 46 });
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

    OTR.txt(this, x, top + 110, save.data.profile.name, 21, '#ffffff', { weight: '900' });

    const info = save.rankInfo();
    const badge = this.add.container(x, top + 138);
    const rt = OTR.txt(this, 12, 0, info.rank.name.toUpperCase(), 13, '#ffffff', { weight: '900' });
    const bw = rt.width + 44;
    const rg = OTR.tex.shape(this, (rg) => { rg.fillStyle(info.rank.color, 1); rg.fillRoundedRect(-bw / 2, -13, bw, 26, 13); });
    badge.add([rg, this.add.image(-bw / 2 + 17, 0, 'ic_badge').setDisplaySize(16, 16), rt]);

    OTR.txt(this, x - 110, top + 166, 'COURIER RANK', 11, '#C9B3F0', { ox: 0 });
    OTR.txt(this, x + 110, top + 166, info.next ? `${info.total} / ${info.next.stars} ★` : `${info.total} ★ MAX`, 11, '#FFC83D', { ox: 1 });
    const bar = OTR.ui.bar(this, x - 110, top + 184, 220, 11, { color: 0xFF6600, bgAlpha: 0.35 });
    bar.setValue(info.progress, true, 900);
    OTR.txt(this, x, top + 202, info.next ? `Next: ${info.next.name}` : 'Top rank reached!', 12, '#E6DAF7', { bold: false });

    // compact category totals
    const totals = save.totals();
    Object.keys(OTR_DATA.config.categories).forEach((cat, i) => {
      const def = OTR_DATA.config.categories[cat];
      const cx = x - 84 + i * 84;
      OTR.tex.shape(this, (g) => { g.fillStyle(0x000000, 0.22); g.fillRoundedRect(cx - 38, top + 222, 76, 46, 10); });
      this.add.image(cx, top + 238, def.icon).setDisplaySize(16, 16).setTint(def.color);
      OTR.txt(this, cx, top + 258, `${totals[cat]}`, 18, OTR.color.css(def.color), { weight: '900' });
    });

    const played = Object.keys(save.data.scenarios).filter(id => OTR.registry.get(id)).length;
    OTR.txt(this, x, top + 292, `${totals.all} / ${OTR.registry.maxStars()} ★  ·  ${played}/${OTR.registry.all().length} scenarios`, 12, '#FFC83D', { weight: '900' });
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
      OTR.ui.button(this, x, top + 118, 'Resume route ▶', () => OTR.shift.resume(this), { w: 220, h: 48, skin: 'orange', fontSize: 18, key: 'ENTER' });
      const ab = OTR.txt(this, x, top + 166, 'Abandon this route', 12, '#FFD5C0', { bold: false });
      ab.setInteractive({ useHandCursor: true }).on('pointerup', () => {
        OTR.ui.confirm(this, 'Abandon the route?', 'The day so far is discarded and you can start again from the morning briefing.', () => { OTR.shift.abort(); this.scene.restart(); }, { yes: 'Abandon', danger: true });
      });
    } else {
      OTR.txt(this, x, top + 54, `Day ${save.data.day}  ·  5 stops`, 17, '#ffffff', { weight: '900' });
      OTR.txt(this, x, top + 76, wLabel, 14, '#FFE3C8', { bold: false });
      OTR.txt(this, x, top + 98, 'Brief → pre-trip → load → drive → deliver', 12, '#E6DAF7', { bold: false, align: 'center', wrap: 240 });
      OTR.ui.button(this, x, top + 136, 'Start the route ▶', () => OTR.shift.start(this), { w: 220, h: 50, skin: 'orange', fontSize: 18, key: 'ENTER' });
      const r = save.data.route || { days: 0, best: { safety: 0, efficiency: 0, service: 0 } };
      const best = (r.best.safety || 0) + (r.best.efficiency || 0) + (r.best.service || 0);
      OTR.txt(this, x, top + 172, r.days ? `${r.days} route day${r.days === 1 ? '' : 's'} logged · best ${best}/9 ★` : 'No route days logged yet', 12, '#FFD5C0', { bold: false });
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
    OTR.txt(this, OTR.W - 20, 92, 'Practise any module, any time', 14, '#C9B3F0', { ox: 1, bold: false });

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
      panel.add(OTR.txt(this, -pw / 2 + 48, -ph / 2 + 33, m.subtitle || '', 11, 'rgba(255,255,255,0.85)', { ox: 0, bold: false }));

      // module star total
      const best = m.scenarios.reduce((n, sc) => n + OTR.save.starSum(OTR.save.bestStars(sc.id)), 0);
      const max = m.scenarios.reduce((n, sc) => n + sc.categories.length * 3, 0);
      panel.add(this.add.image(pw / 2 - 52, -ph / 2 + 22, 'star_gold').setDisplaySize(16, 16));
      panel.add(OTR.txt(this, pw / 2 - 40, -ph / 2 + 22, `${best}/${max}`, 13, '#ffffff', { ox: 0, weight: '900' }));

      // modules with four scenarios (Safety & Wellness) tighten their rows so none is left off the card
      const n = m.scenarios.length;
      const pitch = n > 3 ? 35 : 44;
      const rowH = n > 3 ? 32 : 40;
      m.scenarios.forEach((sc, j) => {
        panel.add(this.scenarioRow(sc, m, 0, -ph / 2 + 68 + j * pitch, pw - 20, rowH));
      });

      panel.setAlpha(0).setScale(0.95);
      this.tweens.add({ targets: panel, alpha: 1, scale: 1, delay: 60 + i * 50, duration: 300, ease: 'Back.out' });
    });
  }

  scenarioRow(sc, mod, x, y, w, height) {
    const save = OTR.save;
    const h = height || 40;
    const ico = h > 34 ? 28 : 24;
    const c = this.add.container(x, y);
    const g = OTR.tex.liveShape(this);
    const rec = save.record(sc.id);
    const draw = (hover) => g.redraw((g) => {
      g.fillStyle(hover ? OTR.color.shade(mod.color, 0.84) : 0xF6F1FD, 1);
      g.fillRoundedRect(-w / 2, -h / 2, w, h, 10);
      g.lineStyle(2, hover ? mod.color : 0xE0D4F2, 1);
      g.strokeRoundedRect(-w / 2, -h / 2, w, h, 10);
    });
    draw(false);
    c.add(g);
    c.add(OTR.tex.shape(this, (ib) => { ib.fillStyle(mod.color, 1); ib.fillRoundedRect(-w / 2 + 6, -ico / 2, ico, ico, 8); }));
    c.add(this.add.image(-w / 2 + 6 + ico / 2, 0, sc.icon || mod.icon).setDisplaySize(ico - 12, ico - 12));
    const title = OTR.txt(this, -w / 2 + 42, 0, sc.title, h > 34 ? 14 : 13, '#250849', { ox: 0, weight: '900' });
    const maxTitleW = w - 42 - 78;
    if (title.width > maxTitleW) title.setScale(maxTitleW / title.width);
    c.add(title);

    const got = save.starSum(save.bestStars(sc.id));
    const max = sc.categories.length * 3;
    if (!rec) {
      c.add(OTR.tex.shape(this, (ng) => { ng.fillStyle(0xFF6600, 1); ng.fillRoundedRect(w / 2 - 74, -9, 34, 18, 9); }));
      c.add(OTR.txt(this, w / 2 - 57, 0, 'NEW', 10, '#ffffff', { weight: '900' }));
    } else {
      c.add(this.add.image(w / 2 - 66, 0, 'star_gold').setDisplaySize(15, 15));
      c.add(OTR.txt(this, w / 2 - 55, 0, `${got}/${max}`, 12, got === max ? '#1E9E6B' : '#7A6A90', { ox: 0, weight: '900' }));
    }
    c.add(this.add.image(w / 2 - 18, 0, 'ic_arrow').setDisplaySize(14, 14).setTint(mod.color));

    const hit = this.add.rectangle(0, 0, w, h, 0xffffff, 0.001).setInteractive({ useHandCursor: true });
    c.add(hit);
    hit.on('pointerover', () => { draw(true); OTR.audio.play('hover'); this.tweens.add({ targets: c, x: x + 3, duration: 100 }); });
    hit.on('pointerout', () => { draw(false); this.tweens.add({ targets: c, x, duration: 100 }); });
    hit.on('pointerup', () => { OTR.audio.play('click'); this.openBrief(sc, mod); });
    return c;
  }

  openBrief(sc, mod) {
    const save = OTR.save;
    const canPlay = save.canPlay(sc.id);
    const rec = save.record(sc.id);
    // The brief grows to fit what it says. At a fixed 540 px, a three-line blurb with six things to practise ran
    // the controls line under the star ratings (Sort Belt, Road Hazards, After a Fender-Bender).
    const measure = (str, size, opts) => { const t = OTR.txt(this, 0, 0, str, size, '#000', opts); const th = t.height; t.destroy(); return th; };
    const body = 122 + measure(sc.blurb, 18, { ox: 0, oy: 0, bold: false, wrap: 640, lineSpacing: 3 }) + 18 + 24 +
      sc.learn.length * 26 + 8 + 22 + measure(sc.controls, 15, { ox: 0, oy: 0, bold: false, wrap: 640 });
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
        box.add(OTR.txt(this, -w / 2 + 40, y, 'YOU\'LL PRACTISE', 13, '#FF6600', { ox: 0, oy: 0 }));
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
        sc.categories.forEach((cat, i) => {
          const cx = (i - (n - 1) / 2) * 230;
          const chip = OTR.ui.chip(this, cx - 50, catY, cat, { size: 14 });
          const st = OTR.ui.stars(this, cx + 70, catY, save.bestStars(sc.id)[cat] || 0, { size: 26, dark: true });
          box.add([chip, st]);
        });
        if (rec) box.add(OTR.txt(this, w / 2 - 30, -h / 2 + 118, `Best score ${rec.bestScore} · played ${rec.plays}×`, 13, '#7A6A90', { ox: 1, oy: 0, bold: false }));
      },
      buttons: [
        { label: 'Back', skin: 'ghost' },
        {
          // a full practice day (scenariosPerDay in data/config.js) is banked on the day summary before anything
          // new is played; this button used to do nothing at all when the day was full
          label: !canPlay ? 'Day full: bank it ▶' : rec ? 'Play Again' : 'Start',
          skin: 'orange',
          key: 'ENTER',
          onClick: () => {
            if (canPlay) OTR.flow.startScenario(this, sc.id);
            else OTR.fx.transition(this, 'DaySummaryScene');
          }
        }
      ]
    });
  }

  /* ---------------------------------------------------------------- dispatch radio */
  buildTip() {
    const x = 152, tipY = 664, w = 272;
    this.add.image(x, tipY, OTR.tex.panel(this, w, 96, { top: 0x3A1870, bottom: 0x240A48, border: 0x6A45A0, radius: 16 }));
    this.add.image(x - 104, tipY - 30, 'ic_chat').setDisplaySize(18, 18).setTint(0xFF6600);
    OTR.txt(this, x - 88, tipY - 30, 'DISPATCH RADIO', 11, '#FF9447', { ox: 0 });
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
    OTR.ui.modal(this, {
      title: 'Settings', w: 520, h: 420, escClose: true,
      build: (box, api) => {
        box.add(OTR.ui.button(this, 0, -70, 'Rename Courier', () => {
          api.close(() => OTR.ui.nameEntry(this, {
            title: 'New courier name', initial: OTR.save.data.profile.name, confirm: 'Save',
            onDone: (name) => { OTR.save.rename(name); this.scene.restart(); }
          }));
        }, { w: 300, h: 56, skin: 'purple' }));
        box.add(OTR.ui.button(this, 0, 4, 'Back to Title', () => OTR.fx.transition(this, 'TitleScene'), { w: 300, h: 56, skin: 'ghost' }));
        box.add(OTR.ui.button(this, 0, 78, 'Reset All Progress', () => {
          OTR.ui.confirm(this, 'Reset all progress?', 'This permanently deletes your profile, rank, stars and shift history.', () => {
            OTR.save.reset();
            OTR.fx.transition(this, 'TitleScene');
          }, { yes: 'Reset Everything', danger: true, h: 320 });
        }, { w: 300, h: 56, skin: 'red' }));
      },
      buttons: [{ label: 'Close', skin: 'orange' }]
    });
  }
}
OTR.registerScene(HubScene);

OTR.hub = {
  playerSpec: { kind: 'person', skin: 0xC98E6B, hair: 0x2E2018, hairStyle: 'cap', shirt: 0x4D148C, uniform: true, capColor: 0x4D148C }
};
