class ResultsScene extends Phaser.Scene {
  constructor() { super('ResultsScene'); }

  init(data) {
    this.d = data;
  }

  create() {
    const W = OTR.W, H = OTR.H;
    const { scenarioId, result, stars, rec } = this.d;
    // the verdict comes from OTR.flow.complete; a caller that has none gets a plain one
    const verdict = this.d.verdict || { untested: [], criticals: [], takeaways: (result.lessons || []).filter(Boolean).map(text => ({ text, n: 1 })), mistakes: 0 };
    const sc = OTR.registry.get(scenarioId);
    const mod = OTR.registry.moduleOf(scenarioId);
    OTR.fx.enter(this);

    this.add.image(W / 2, H / 2, OTR.tex.bg(this, 'results_bg', [[0, '#3A1270'], [1, '#12041F']]));
    const rays = this.add.image(W / 2, 250, OTR.tex.make(this, 'rays', 900, 900, (ctx) => {
      ctx.translate(450, 450);
      for (let i = 0; i < 16; i++) {
        ctx.rotate(Math.PI / 8);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-40, -450); ctx.lineTo(40, -450); ctx.closePath();
        ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fill();
      }
    }));
    this.tweens.add({ targets: rays, angle: 360, duration: 40000, repeat: -1 });

    // only categories this run tested count toward the verdict
    const cats = sc.categories;
    const tested = cats.filter(c => verdict.untested.indexOf(c) < 0);
    const got = tested.reduce((n, c) => n + (stars[c] || 0), 0);
    const max = tested.length * 3;
    const head = OTR.scoring.headline({ stars, cats, untested: verdict.untested, criticals: verdict.criticals, mistakes: verdict.mistakes, cap: result.headlineCap });
    const px = W / 2, py = H / 2 + 4;
    const pw = 820, ph = 668;
    const panel = this.add.container(px, py);
    panel.add(OTR.ui.panel(this, 0, 0, pw, ph, { top: 0xFFFFFF, bottom: 0xF1EAFB, border: 0xC9B3F0, radius: 26 }));
    // a critical mistake turns the header red: nothing about this screen may read as praise
    panel.add(OTR.tex.shape(this, (hg) => {
      hg.fillStyle(head.critical ? 0xC8243B : mod.color, 1);
      hg.fillRoundedRect(-pw / 2, -ph / 2, pw, 104, { tl: 26, tr: 26, bl: 0, br: 0 });
    }));
    panel.add(OTR.txt(this, 0, -ph / 2 + 34, head.text, 16, 'rgba(255,255,255,0.9)', { weight: '900' }));
    panel.add(OTR.txt(this, 0, -ph / 2 + 68, sc.title, 34, '#ffffff', { weight: '900', shadow: true }));
    panel.setScale(0.9).setAlpha(0);
    this.tweens.add({ targets: panel, scale: 1, alpha: 1, duration: 380, ease: 'Back.out' });

    // stars earned out of the stars this run could earn (a bare score had no scale and differed per scenario)
    const starsLabel = OTR.txt(this, -pw / 2 + 60, -ph / 2 + 150, 'STARS', 14, '#9A8AB0', { ox: 0 });
    const starsText = OTR.txt(this, -pw / 2 + 60, -ph / 2 + 188, `0 / ${max}`, 48, '#250849', { ox: 0, weight: '900' });
    panel.add([starsLabel, starsText]);
    const counter = { v: 0 };
    this.tweens.add({
      targets: counter, v: got, delay: 350, duration: 700, ease: 'Cubic.out',
      onUpdate: () => { starsText.setText(`${Math.round(counter.v)} / ${max}`); if (Math.random() < 0.3) OTR.audio.play('tick'); }
    });

    // stars per category
    let delay = 900;
    const catX = 90;
    const rowH = cats.length > 2 ? 48 : 66;              // three categories leave the takeaways less room
    cats.forEach((cat, i) => {
      const y = -ph / 2 + 150 + i * rowH;
      const chip = OTR.ui.chip(this, catX - 20, y + 18, cat, { size: 16 });
      chip.x = catX - 60 + chip.width / 2 - 40;
      panel.add(chip);
      if (verdict.untested.indexOf(cat) >= 0) {
        panel.add(OTR.txt(this, catX + 170, y + 18, 'not tested this run', 17, '#9A8AB0', { bold: false }));
        return;
      }
      const row = OTR.ui.stars(this, catX + 170, y + 18, 0, { size: rowH > 60 ? 44 : 34, dark: true });
      panel.add(row);
      const n = stars[cat];
      this.time.delayedCall(delay, () => row.setCount(n, true, 240));
      const prev = rec.prevBest[cat] || 0;
      if (!rec.firstPlay && n > prev) {
        this.time.delayedCall(delay + n * 240 + 100, () => {
          const up = OTR.txt(this, catX + 270, y + 18, '▲ BEST', 13, '#1E9E6B', { weight: '900' });
          panel.add(up);
          OTR.fx.pop(this, up, 1.4);
        });
      }
      delay += Math.max(1, n) * 240 + 250;
    });

    // takeaways: critical first, ranked, counted; as many as fit and a line for the rest
    const cy = ph / 2 - 124;
    const ly = -ph / 2 + 150 + Math.max(2, cats.length) * rowH + 26;
    const boxBottom = cy - 24;
    panel.add(OTR.tex.shape(this, (lg) => {
      lg.fillStyle(0x4D148C, 0.06);
      lg.fillRoundedRect(-pw / 2 + 40, ly - 10, pw - 80, boxBottom - (ly - 10), 16);
    }));
    panel.add(this.add.image(-pw / 2 + 70, ly + 16, 'ic_book').setDisplaySize(24, 24).setTint(0xFF6600));
    panel.add(OTR.txt(this, -pw / 2 + 92, ly + 16, 'KEY TAKEAWAYS', 15, '#FF6600', { ox: 0, weight: '900' }));
    let yy = ly + 40;
    if (result.summary) {
      // the run's numbers get their own line, so they never lose their place to a lesson
      const s = OTR.txt(this, -pw / 2 + 72, yy, result.summary, 14, '#7A6A90', { ox: 0, oy: 0, bold: false, wrap: pw - 150 });
      panel.add(s);
      yy += s.height + 8;
    }
    const list = verdict.takeaways.slice();
    if (!list.length) list.push({ text: head.text === 'FLAWLESS!' ? 'A clean run: nothing to fix.' : 'Solid run. Replay to chase all the stars.', n: 1 });
    this.layoutTakeaways(panel, list, -pw / 2 + 72, yy, pw - 160, boxBottom - 8);

    // career line: the bar is progress within the current rank, and says so
    const info = OTR.save.rankInfo(rec.careerAfter);
    panel.add(OTR.txt(this, -pw / 2 + 50, cy, `CAREER  ${rec.careerAfter} ★  ·  ${OTR.save.rankLabel(info)}`, 15, '#4D148C', { ox: 0, weight: '900' }));
    const gainText = rec.starsGained > 0 ? `+${rec.starsGained} new career star${rec.starsGained === 1 ? '' : 's'}` : (OTR.flow.testId ? 'Test mode — progress not saved' : 'Beat your best stars to grow your rank');
    panel.add(OTR.txt(this, pw / 2 - 50, cy, gainText, 15, rec.starsGained > 0 ? '#1E9E6B' : '#9A8AB0', { ox: 1, weight: rec.starsGained > 0 ? 'bold' : 'normal' }));
    const bar = OTR.ui.bar(this, -pw / 2 + 50, cy + 26, pw - 100, 12, { color: 0xFF6600, bgAlpha: 0.12 });
    panel.add(bar);
    bar.setValue(OTR.save.rankInfo(rec.careerBefore).index === info.index ? OTR.save.rankInfo(rec.careerBefore).progress : 0);
    this.time.delayedCall(delay, () => bar.setValue(info.progress, true, 800));

    // buttons
    const dayDone = rec.dayComplete && !OTR.flow.testId;
    const retry = OTR.ui.button(this, -150, ph / 2 - 46, 'Retry', () => OTR.flow.startScenario(this, scenarioId), { w: 220, h: 56, skin: 'ghost', key: 'R' });
    const next = OTR.ui.button(this, 130, ph / 2 - 46, dayDone ? 'End of Day ▶' : 'Shift Board ▶', () => OTR.flow.toHub(this), { w: 280, h: 56, skin: 'orange', key: 'ENTER' });
    panel.add([retry, next]);
    [retry, next].forEach(b => b.setEnabled(false));
    this.time.delayedCall(Math.min(delay, 2200), () => [retry, next].forEach(b => b.setEnabled(true)));

    // celebrations, only for a run that earned them
    this.time.delayedCall(delay + 150, () => {
      if (head.celebrate === 'big') {
        OTR.fx.confetti(this, W / 2, H + 20, { count: 140 });
        OTR.audio.play('fanfare');
      } else if (head.celebrate === 'small') {
        OTR.fx.confetti(this, W / 2, H + 20, { count: 60 });
      }
      // stamped under the star count, clear of the category rows and their "▲ BEST" tags
      if (!rec.firstPlay && got > OTR.save.starSum(rec.prevBest)) {
        OTR.fx.stamp(this, px - pw / 2 + 150, py - ph / 2 + 250, 'NEW BEST', 0xFF6600, { size: 26, angle: -8, keep: true, depth: 20 });
      }
      if (rec.rankAfter > rec.rankBefore) this.rankUp(OTR_DATA.config.ranks[rec.rankAfter]);
    });
  }

  /**
   * Takeaway rows from y down to bottom: a critical one says so in red, a repeated one counts its repeats. At least
   * four are shown (smaller type if needed); the rest are summed up in one "+ N more" line.
   */
  layoutTakeaways(panel, list, x, y, wrap, bottom) {
    const want = Math.min(4, list.length);
    const build = (size) => {
      const rows = [];
      let yy = y;
      for (let i = 0; i < list.length; i++) {
        const t = list[i];
        const rest = list.length - i - 1;
        const label = (t.critical ? 'Critical: ' : '') + t.text + (t.n > 1 ? `  (× ${t.n})` : '');
        const txt = OTR.txt(this, x + 18, yy, label, size, t.critical ? '#B3122E' : '#3A2A50', { ox: 0, oy: 0, bold: !!t.critical, wrap, lineSpacing: 2 });
        // keep room for the "+ N more" line unless this is the last row
        if (yy + txt.height > bottom - (rest ? size + 6 : 0)) { txt.destroy(); break; }
        rows.push({ txt, y: yy, critical: t.critical });
        yy += txt.height + (size > 15 ? 10 : 7);
      }
      return { rows, yy };
    };
    let out = build(16);
    for (const size of [14, 13]) {
      if (out.rows.length >= want) break;
      out.rows.forEach(r => r.txt.destroy());
      out = build(size);
    }
    out.rows.forEach((r, i) => {
      const dot = this.add.circle(x, r.y + 9, 5, r.critical ? 0xE8304A : 0x4D148C);
      panel.add([dot, r.txt]);
      dot.setAlpha(0); r.txt.setAlpha(0);
      this.tweens.add({ targets: [dot, r.txt], alpha: 1, delay: 700 + i * 160, duration: 300 });
    });
    const more = list.length - out.rows.length;
    if (more > 0) panel.add(OTR.txt(this, x + 18, out.yy, `+ ${more} more to work on`, 14, '#7A6A90', { ox: 0, oy: 0, weight: '900' }));
  }

  rankUp(rank) {
    OTR.audio.play('rankup');
    OTR.fx.confetti(this, OTR.W * 0.25, OTR.H + 20, { count: 90, angle: { min: 260, max: 320 } });
    OTR.fx.confetti(this, OTR.W * 0.75, OTR.H + 20, { count: 90, angle: { min: 220, max: 280 } });
    OTR.ui.modal(this, {
      w: 520, h: 330, depth: 7000,
      build: (box) => {
        box.add(this.add.image(0, -70, 'ic_badge').setDisplaySize(90, 90).setTint(rank.color));
        box.add(OTR.txt(this, 0, 10, 'RANK UP!', 40, '#FF6600', { weight: '900' }));
        box.add(OTR.txt(this, 0, 56, `You're now ${rank.name}`, 24, '#250849', { weight: 'bold' }));
      },
      buttons: [{ label: 'Nice!', skin: 'orange', key: 'SPACE' }]
    });
  }
}
OTR.registerScene(ResultsScene);
