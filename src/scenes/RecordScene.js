/*
 * The trainee record on screen: every module's practice and assessment standing, what keeps going wrong, and the
 * recent runs, with the printed record (and the certificate, once every assessment is passed) a click away.
 * data: { traineeId (a trainer looking at someone on the training server) | none (this trainee), name, back }
 */
class RecordScene extends Phaser.Scene {
  constructor() { super('RecordScene'); }

  init(data) { this.d = data || {}; }

  create() {
    const W = OTR.W, H = OTR.H;
    OTR.fx.enter(this);
    this.add.image(W / 2, H / 2, OTR.tex.bg(this, 'record_bg', [[0, '#2A0C52'], [1, '#12041F']]));
    OTR.tex.shape(this, (g) => { g.fillStyle(0x16062B, 0.9); g.fillRect(0, 0, W, 64); g.fillStyle(0xFF6600, 1); g.fillRect(0, 64, W, 3); });
    this.name = this.d.name || OTR.save.displayName();
    const head = OTR.txt(this, 24, 32, 'TRAINING RECORD', 24, '#ffffff', { ox: 0, weight: '900' });
    const nm = OTR.txt(this, 24 + head.width + 16, 33, this.name, 20, '#FFC83D', { ox: 0, weight: '900' });
    if (nm.width > 420) nm.setScale(420 / nm.width);
    this.focusables = [];
    const back = this.d.back || 'HubScene';
    this.focusables.push(OTR.ui.button(this, W - 90, 32, 'Back', () => OTR.fx.transition(this, back), { w: 150, h: 44, skin: 'ghost', fontSize: 18, key: 'ESC', hint: 'ESC' }));

    if (this.d.traineeId) {
      this.wait = OTR.txt(this, W / 2, H / 2, 'Loading…', 20, '#E6DAF7', { bold: false });
      OTR.academy.trainerApi(`trainees/${encodeURIComponent(this.d.traineeId)}`)
        .then(r => { this.wait.destroy(); this.show(r.progress || {}, this.d.traineeId); })
        .catch(e => this.wait.setText(String(e.message || e)).setColor('#FF8A9A'));
    } else {
      this.show(OTR.save.data, OTR.identity.id);
    }
  }

  show(progress, id) {
    const W = OTR.W;
    const R = this.R = OTR.record.build(progress);
    this.id = id;
    // print and certificate, in the header
    this.focusables.push(OTR.ui.button(this, W - 290, 32, 'Print / PDF', () => OTR.record.print(R, this.name, id), { w: 200, h: 44, skin: 'orange', fontSize: 17, icon: 'ic_book', iconSize: 18 }));
    if (R.passed === R.total) {
      this.focusables.push(OTR.ui.button(this, W - 500, 32, 'Certificate', () => OTR.record.certificate(R, this.name, id), { w: 190, h: 44, skin: 'purple', fontSize: 17, icon: 'ic_badge', iconSize: 18 }));
    }

    // summary tiles
    const tiles = [
      ['ASSESSMENTS PASSED', `${R.passed} / ${R.total}`, R.passed === R.total ? '#8BF0C6' : '#FFC83D'],
      ['SCENARIOS PRACTICED', `${R.practised} / ${R.total}`, '#ffffff'],
      ['ROUTE DAYS', String(R.routeDays), '#ffffff'],
      ['TIME TRAINING', OTR.record.duration(R.seconds), '#ffffff'],
      ['WORK ON MOST', R.weakest ? OTR_DATA.config.categories[R.weakest].label : '—', R.weakest ? OTR.color.css(OTR_DATA.config.categories[R.weakest].color) : '#ffffff']
    ];
    const tw = 232, gap = 12, x0 = (W - (tiles.length * tw + (tiles.length - 1) * gap)) / 2;
    tiles.forEach(([label, val, col], i) => {
      const cx = x0 + i * (tw + gap) + tw / 2;
      OTR.tex.shape(this, (g) => { g.fillStyle(0x000000, 0.25); g.fillRoundedRect(cx - tw / 2, 82, tw, 66, 12); g.lineStyle(2, 0x6A45A0, 1); g.strokeRoundedRect(cx - tw / 2, 82, tw, 66, 12); });
      OTR.txt(this, cx, 102, label, 12, '#C9B3F0', { weight: '900' });
      const v = OTR.txt(this, cx, 128, val, 22, col, { weight: '900' });
      if (v.width > tw - 20) v.setScale((tw - 20) / v.width);
    });

    // tabs
    this.tabs = [['modules', 'Modules'], ['lessons', 'What to work on'], ['recent', 'Recent runs']].map(([id, label], i) => {
      const b = OTR.ui.button(this, 130 + i * 210, 184, label, () => this.tab(id), { w: 200, h: 42, skin: 'ghost', fontSize: 16, key: ['ONE', 'TWO', 'THREE'][i], hint: String(i + 1) });
      b.tabId = id;
      this.focusables.push(b);
      return b;
    });
    this.body = this.add.container(0, 0);
    this.tab('modules');
    OTR.ui.focus(this, this.focusables, { start: 0 });
  }

  tab(id) {
    this.tabs.forEach(b => b.setSkin(b.tabId === id ? 'purple' : 'ghost'));
    this.body.removeAll(true);
    if (id === 'modules') this.drawModules();
    else if (id === 'lessons') this.drawLessons();
    else this.drawRecent();
  }

  card(x, y, w, h) {
    this.body.add(this.add.image(x + w / 2, y + h / 2, OTR.tex.panel(this, w, h, { top: 0xFFFFFF, bottom: 0xF1EAFB, border: 0xC9B3F0, radius: 16 })));
  }

  drawModules() {
    const R = this.R, colW = 600, top = 216, cardH = 488;
    [[0, 30], [1, 650]].forEach(([col, x]) => {
      const mods = R.modules.filter((m, i) => (i < 4 ? 0 : 1) === col);
      this.card(x, top, colW, cardH);
      // the rows share the card's height (with 27 scenarios a fixed 26 px ran the left column off the bottom)
      const rows = mods.reduce((n, m) => n + m.scenarios.length, 0);
      const pitch = Math.min(26, (cardH - 24 - mods.length * 40) / rows);
      let y = top + 22;
      mods.forEach(m => {
        this.body.add(OTR.tex.shape(this, (g) => { g.fillStyle(m.color, 1); g.fillRoundedRect(x + 14, y - 12, colW - 28, 26, 8); }));
        this.body.add(OTR.txt(this, x + 26, y + 1, m.title.toUpperCase(), 13, '#ffffff', { ox: 0, weight: '900' }));
        this.body.add(OTR.txt(this, x + colW - 26, y + 1, OTR.record.quizText(m.quiz), 12, '#ffffff', { ox: 1, bold: !!(m.quiz && m.quiz.passedAt) }));
        y += 30;
        m.scenarios.forEach(s => {
          const t = OTR.txt(this, x + 26, y, s.title, pitch < 23 ? 14 : 15, '#250849', { ox: 0, weight: '900', fit: 210 });
          const a = s.assess;
          const col2 = a && a.passed ? '#1E7E55' : a && a.attempts ? '#B3122E' : '#9A8AB0';
          const at = OTR.txt(this, x + 250, y, a && a.passed ? '✓ Passed' : a && a.attempts ? '✕ Not passed' : 'Not assessed', 14, col2, { ox: 0, weight: a && a.attempts ? '900' : 'normal' });
          const st = OTR.txt(this, x + 390, y, OTR.record.stars(s.best, OTR.scoring.ordered(s.cats)), 14, '#C98A00', { ox: 0 });
          if (st.width > 150) st.setScale(150 / st.width);
          const pl = OTR.txt(this, x + colW - 22, y, s.plays ? `${s.plays}×` : '—', 13, '#7A6A90', { ox: 1 });
          this.body.add([t, at, st, pl]);
          y += pitch;
        });
        y += 10;
      });
    });
    this.body.add(OTR.txt(this, OTR.W / 2, 712, 'Stars: best practice run in each category (Safety · Efficiency · Service) · × runs', 12, '#C9B3F0', { bold: false }));
  }

  drawLessons() {
    const R = this.R;
    this.card(30, 216, 760, 488);
    this.body.add(OTR.txt(this, 56, 244, 'MISTAKES THAT KEEP COMING BACK', 14, '#FF6600', { ox: 0, weight: '900' }));
    let y = 270;
    if (!R.lessons.length) this.body.add(OTR.txt(this, 56, y, 'Nothing yet: play a few scenarios and the record fills in.', 16, '#7A6A90', { ox: 0, oy: 0, bold: false }));
    R.lessons.forEach((l, i) => {
      if (y > 670) return;
      const t = OTR.txt(this, 86, y, l.text, 15, '#3A2A50', { ox: 0, oy: 0, bold: false, wrap: 640 });
      this.body.add(OTR.txt(this, 56, y, `${i + 1}.`, 15, '#4D148C', { ox: 0, oy: 0, weight: '900' }));
      if (l.n > 1) this.body.add(OTR.txt(this, 760, y, `${l.n}×`, 14, '#B26A00', { ox: 1, oy: 0, weight: '900' }));
      this.body.add(t);
      y += t.height + 12;
    });
    this.card(810, 216, 440, 488);
    this.body.add(OTR.txt(this, 836, 244, 'CRITICAL MISTAKES', 14, '#C8243B', { ox: 0, weight: '900' }));
    y = 270;
    if (!R.criticals.length) this.body.add(OTR.txt(this, 836, y, 'None recorded.', 16, '#1E7E55', { ox: 0, oy: 0, weight: '900' }));
    R.criticals.forEach(c => {
      if (y > 670) return;
      const sc = OTR.registry.get(c.id);
      this.body.add(OTR.txt(this, 836, y, `${OTR.record.date(c.at)} · ${sc ? sc.title : c.id}`, 12, '#7A6A90', { ox: 0, oy: 0 }));
      const t = OTR.txt(this, 836, y + 18, c.text, 14, '#B3122E', { ox: 0, oy: 0, weight: '900', wrap: 390 });
      this.body.add(t);
      y += t.height + 30;
    });
  }

  drawRecent() {
    const R = this.R;
    this.card(30, 216, 1220, 488);
    const cols = [[56, 'DATE'], [200, 'SCENARIO'], [470, 'TYPE'], [590, 'STARS'], [780, 'FIRST THING TO FIX']];
    cols.forEach(([x, l]) => this.body.add(OTR.txt(this, x, 244, l, 12, '#FF6600', { ox: 0, weight: '900' })));
    if (!R.recent.length) this.body.add(OTR.txt(this, 56, 280, 'No scored runs yet.', 16, '#7A6A90', { ox: 0, oy: 0, bold: false }));
    R.recent.slice(0, 15).forEach((h, i) => {
      const y = 276 + i * 28;
      const sc = OTR.registry.get(h.id);
      const cats = sc ? OTR.scoring.ordered(sc.categories) : OTR.scoring.CATS;
      this.body.add(OTR.txt(this, 56, y, OTR.record.date(h.at), 14, '#3A2A50', { ox: 0, bold: false }));
      const t = OTR.txt(this, 200, y, sc ? sc.title : h.id, 14, '#250849', { ox: 0, weight: '900' });
      if (t.width > 250) t.setScale(250 / t.width);
      this.body.add(t);
      this.body.add(OTR.txt(this, 470, y, h.assess ? 'Assessment' : 'Practice', 14, h.assess ? '#B26A00' : '#7A6A90', { ox: 0, weight: h.assess ? '900' : 'normal' }));
      this.body.add(OTR.txt(this, 590, y, OTR.record.stars(h.stars, cats), 14, '#C98A00', { ox: 0 }));
      const fix = (h.criticals && h.criticals[0]) || (h.lessons && h.lessons[0]) || 'Nothing: a clean run';
      const f = OTR.txt(this, 780, y, fix, 13, h.criticals && h.criticals.length ? '#B3122E' : '#3A2A50', { ox: 0, bold: false });
      // shortened in the language it is shown in (the cut text is no longer a sentence the dictionary knows)
      if (f.width > 450) { const t = f.text; f.noTranslate = true; f.setText(t.slice(0, Math.floor(t.length * 440 / f.width)) + '…'); }
      this.body.add(f);
    });
  }
}
OTR.registerScene(RecordScene);
