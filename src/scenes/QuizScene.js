/*
 * Knowledge checks (data/quizzes.js). Without a module: the list of quizzes, each with its best score and whether a
 * refresher is due. With one: an optional refresher card (the trainee's own recurring mistakes in that module), five
 * questions with shuffled answers and the reason after each, then the score (pass at quizzes.passPct).
 * data: { module?: id }
 */
class QuizScene extends Phaser.Scene {
  constructor() { super('QuizScene'); }

  init(data) { this.d = data || {}; }

  create() {
    const W = OTR.W, H = OTR.H;
    OTR.fx.enter(this);
    this.add.image(W / 2, H / 2, OTR.tex.bg(this, 'quiz_bg', [[0, '#2A0C52'], [1, '#12041F']]));
    OTR.tex.shape(this, (g) => { g.fillStyle(0x16062B, 0.9); g.fillRect(0, 0, W, 64); g.fillStyle(0xFF6600, 1); g.fillRect(0, 64, W, 3); });
    this.focusables = [];
    if (this.d.module) this.startQuiz(this.d.module);
    else this.menu();
  }

  header(title, back) {
    OTR.txt(this, 24, 32, title, 24, '#ffffff', { ox: 0, weight: '900' });
    this.focusables.push(OTR.ui.button(this, OTR.W - 90, 32, 'Back', back, { w: 150, h: 44, skin: 'ghost', fontSize: 18, key: 'ESC', hint: 'ESC' }));
  }

  /* ------------------------------------------------------------------ the list */
  menu() {
    const W = OTR.W;
    this.header('KNOWLEDGE QUIZZES', () => OTR.fx.transition(this, 'HubScene'));
    const mods = OTR.registry.modules();
    const due = mods.filter(m => OTR.quiz.due(m.id)).length;
    OTR.txt(this, W / 2, 94, due ? `${due} refresher${due === 1 ? '' : 's'} due: a module you passed a while ago, to keep it fresh`
      : 'Five questions a module. Pass at ' + OTR_DATA.quizzes.passPct + '%.', 16, due ? '#FFC83D' : '#E6DAF7', { bold: !!due });
    mods.forEach((m, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const x = 40 + col * 610, y = 124 + row * 128, w = 590, h = 116;
      this.add.image(x + w / 2, y + h / 2, OTR.tex.panel(this, w, h, { top: 0xFFFFFF, bottom: 0xF1EAFB, border: 0xC9B3F0, radius: 16 }));
      OTR.tex.shape(this, (g) => { g.fillStyle(m.color, 1); g.fillRoundedRect(x, y, 12, h, { tl: 16, bl: 16, tr: 0, br: 0 }); });
      this.add.image(x + 44, y + 36, m.icon).setDisplaySize(28, 28).setTint(m.color);
      OTR.txt(this, x + 70, y + 36, m.title, 20, '#250849', { ox: 0, weight: '900' });
      const q = OTR.quiz.rec(m.id), isDue = OTR.quiz.due(m.id);
      const status = isDue ? 'Refresher due' : q ? `Best ${q.best}%${q.passedAt ? ' · passed ' + OTR.record.date(q.passedAt) : ''}` : 'Not taken yet';
      OTR.txt(this, x + 70, y + 72, status, 15, isDue ? '#B26A00' : q && q.passedAt ? '#1E7E55' : '#7A6A90', { ox: 0, weight: isDue || (q && q.passedAt) ? '900' : 'normal' });
      this.focusables.push(OTR.ui.button(this, x + w - 90, y + h / 2, isDue ? 'Refresh ▶' : q ? 'Again ▶' : 'Start ▶', () => OTR.fx.transition(this, 'QuizScene', { module: m.id }),
        { w: 140, h: 48, skin: isDue ? 'orange' : 'purple', fontSize: 17 }));
    });
    const tips = OTR_DATA.config.dispatcherTips;
    OTR.txt(this, W / 2, 666, tips[Math.floor(Math.random() * tips.length)], 15, '#C9B3F0', { bold: false });
    OTR.ui.focus(this, this.focusables, { start: 1 });
  }

  /* ------------------------------------------------------------------ one quiz */
  startQuiz(mid) {
    const m = OTR.registry.modules().find(x => x.id === mid);
    this.mod = m;
    this.header(`QUIZ · ${m.title.toUpperCase()}`, () => OTR.ui.confirm(this, 'Leave the quiz?', 'This quiz isn\'t scored until you finish it.', () => OTR.fx.transition(this, 'QuizScene', {}), { yes: 'Leave' }));
    const qs = OTR_DATA.quizzes[mid] || [];
    // shuffled questions, and shuffled answers so the right one is never in the same place
    this.qs = OTR.util.shuffle(qs.slice()).map(q => {
      const order = OTR.util.shuffle(q.options.map((_, i) => i));
      return { q: q.q, options: order.map(i => q.options[i]), answer: order.indexOf(q.answer), why: q.why };
    });
    this.i = 0; this.right = 0;
    this.refresher = OTR.quiz.due(mid);
    this.body = this.add.container(0, 0);
    const mine = OTR.quiz.myMistakes(mid);
    if (this.refresher && mine.length) this.refresherCard(mine);
    else this.ask();
  }

  refresherCard(mine) {
    const W = OTR.W;
    this.body.add(this.add.image(W / 2, 390, OTR.tex.panel(this, 900, 480, { top: 0xFFFFFF, bottom: 0xF1EAFB, border: 0xC9B3F0, radius: 22 })));
    this.body.add(OTR.txt(this, W / 2, 200, 'REFRESHER', 16, '#FF6600', { weight: '900' }));
    this.body.add(OTR.txt(this, W / 2, 236, 'Before the questions: the mistakes you made most in this module', 20, '#250849', { weight: '900' }));
    let y = 280;
    mine.slice(0, 3).forEach((l, i) => {
      const t = OTR.txt(this, W / 2 - 380, y, l.text, 18, '#3A2A50', { ox: 0, oy: 0, bold: false, wrap: 740, lineSpacing: 3 });
      this.body.add(OTR.txt(this, W / 2 - 410, y, `${i + 1}.`, 18, '#4D148C', { ox: 0, oy: 0, weight: '900' }));
      this.body.add(t);
      y += t.height + 18;
    });
    const go = OTR.ui.button(this, W / 2, 580, 'Start the questions ▶', () => { this.body.removeAll(true); this.ask(); }, { w: 320, h: 56, skin: 'orange', key: 'ENTER', hint: '⏎' });
    this.body.add(go);
  }

  ask() {
    const W = OTR.W, q = this.qs[this.i];
    this.body.removeAll(true);
    this.answered = false;
    this.body.add(OTR.txt(this, W / 2, 98, `Question ${this.i + 1} of ${this.qs.length}`, 15, '#C9B3F0', { weight: '900' }));
    this.body.add(this.add.image(W / 2, 176, OTR.tex.panel(this, 1000, 120, { top: 0xFFFFFF, bottom: 0xF1EAFB, border: 0xC9B3F0, radius: 18 })));
    const qt = OTR.txt(this, W / 2, 176, q.q, 22, '#250849', { weight: '900', align: 'center', wrap: 940, lineSpacing: 4 });
    if (qt.height > 100) qt.setScale(100 / qt.height);
    this.body.add(qt);
    this.opts = q.options.map((o, k) => {
      const y = 290 + k * 76;
      const b = OTR.ui.button(this, W / 2, y, o, () => this.answer(k), { w: 900, h: 64, skin: 'ghost', fontSize: 18, key: ['ONE', 'TWO', 'THREE', 'FOUR'][k], hint: String(k + 1) });
      this.body.add(b);
      return b;
    });
    this.ring = OTR.ui.focus(this, this.opts.concat(this.focusables), { start: 0 });
  }

  answer(k) {
    if (this.answered) return;
    this.answered = true;
    const W = OTR.W, q = this.qs[this.i], ok = k === q.answer;
    if (ok) this.right++;
    OTR.audio.play(ok ? 'good' : 'fail');
    this.opts.forEach((b, j) => {
      if (j === q.answer) b.setSkin('green');
      else if (j === k) b.setSkin('red');
      b.setEnabled(false);
      b.setAlpha(j === q.answer || j === k ? 1 : 0.45);
    });
    const y = 290 + this.opts.length * 76 + 6;
    const why = OTR.txt(this, W / 2, y, (ok ? 'Right. ' : 'Not quite. ') + q.why, 17, ok ? '#8BF0C6' : '#FFB3BF', { align: 'center', wrap: 960, bold: false, lineSpacing: 3, oy: 0 });
    this.body.add(why);
    const last = this.i === this.qs.length - 1;
    const next = OTR.ui.button(this, W / 2, Math.min(OTR.H - 40, y + why.height + 40), last ? 'See my score ▶' : 'Next question ▶', () => { this.i++; if (last) this.finish(); else this.ask(); },
      { w: 300, h: 54, skin: 'orange', key: 'ENTER', hint: '⏎', keyAfter: 400 });
    this.body.add(next);
    this.ring = OTR.ui.focus(this, [next].concat(this.focusables), { start: 0 });
  }

  finish() {
    const W = OTR.W, n = this.qs.length, pct = Math.round(this.right / n * 100);
    const passed = pct >= OTR_DATA.quizzes.passPct;
    OTR.quiz.recordResult(this.mod.id, pct, this.refresher);
    this.body.removeAll(true);
    this.body.add(this.add.image(W / 2, 380, OTR.tex.panel(this, 760, 440, { top: 0xFFFFFF, bottom: 0xF1EAFB, border: passed ? 0x2BC48A : 0xF0435A, radius: 24 })));
    this.body.add(OTR.txt(this, W / 2, 210, passed ? (this.refresher ? 'REFRESHER PASSED' : 'QUIZ PASSED') : 'NOT PASSED YET', 18, passed ? '#1E9E6B' : '#C8243B', { weight: '900' }));
    this.body.add(OTR.txt(this, W / 2, 290, `${this.right} / ${n}`, 72, '#250849', { weight: '900' }));
    this.body.add(OTR.txt(this, W / 2, 360, `${pct}%  ·  ${OTR_DATA.quizzes.passPct}% to pass`, 20, '#7A6A90', { bold: false }));
    this.body.add(OTR.txt(this, W / 2, 410, passed ? 'Saved to your training record.' : 'Read the reasons again, then have another go. Saved to your record.', 16, '#3A2A50', { bold: false }));
    if (passed) { OTR.audio.play('fanfare'); OTR.fx.confetti(this, W / 2, OTR.H + 20, { count: 80 }); }
    const again = OTR.ui.button(this, W / 2 - 170, 520, 'Try again', () => OTR.fx.transition(this, 'QuizScene', { module: this.mod.id }), { w: 260, h: 56, skin: 'ghost', key: 'R', hint: 'R' });
    const done = OTR.ui.button(this, W / 2 + 170, 520, 'All quizzes ▶', () => OTR.fx.transition(this, 'QuizScene', {}), { w: 260, h: 56, skin: 'orange', key: 'ENTER', hint: '⏎', keyAfter: 500 });
    this.body.add([again, done]);
    this.ring = OTR.ui.focus(this, [again, done].concat(this.focusables), { start: 1 });
  }
}
OTR.registerScene(QuizScene);

/* Quiz results, refreshers and the trainee's own mistakes by module. */
OTR.quiz = {
  rec(mid) { const q = OTR.save.data.quiz; return (q && q[mid]) || null; },

  recordResult(mid, pct, refresher) {
    const d = OTR.save.data;
    d.quiz = d.quiz || {};
    const r = d.quiz[mid] || { best: 0, runs: 0 };
    r.best = Math.max(r.best, pct); r.last = pct; r.runs++; r.at = Date.now();
    if (pct >= OTR_DATA.quizzes.passPct) { r.passedAt = Date.now(); if (refresher) r.refreshedAt = Date.now(); }
    d.quiz[mid] = r;
    OTR.save.write();
  },

  /**
   * A refresher is due once a module has been proven (its quiz passed, or an assessment in it passed) and nothing in
   * it has been passed again for the academy's refresher interval.
   */
  due(mid) {
    const days = OTR.academy.get().refresherDays || 30;
    const m = OTR.registry.modules().find(x => x.id === mid);
    if (!m) return false;
    const q = this.rec(mid);
    const stamps = [(q && q.passedAt) || 0].concat(m.scenarios.map(sc => { const a = OTR.academy.record(sc.id); return a && a.passed ? a.at || 0 : 0; }));
    const last = Math.max(...stamps);
    return last > 0 && Date.now() - last > days * 86400000;
  },

  dueCount() { return OTR.registry.modules().filter(m => this.due(m.id)).length; },

  /** The lessons that came up most in this module's runs. */
  myMistakes(mid) {
    const m = OTR.registry.modules().find(x => x.id === mid);
    const ids = m ? m.scenarios.map(s => s.id) : [];
    const counts = {};
    (OTR.save.data.history || []).filter(h => ids.indexOf(h.id) >= 0).forEach(h => (h.lessons || []).forEach(t => { counts[t] = (counts[t] || 0) + 1; }));
    return Object.keys(counts).map(t => ({ text: t, n: counts[t] })).sort((a, b) => b.n - a.n);
  }
};
