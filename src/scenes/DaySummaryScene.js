class DaySummaryScene extends Phaser.Scene {
  constructor() { super('DaySummaryScene'); }

  create() {
    const W = OTR.W, H = OTR.H;
    const save = OTR.save;
    const cfg = OTR_DATA.config;
    OTR.fx.enter(this);

    this.add.image(W / 2, H / 2, OTR.tex.bg(this, 'day_bg', [[0, '#1A0A36'], [0.6, '#5A2A7A'], [1, '#FF8A4D']], (ctx, w, h) => {
      ctx.fillStyle = 'rgba(20,6,40,0.85)';
      for (let i = 0; i < 22; i++) {
        const bw = 40 + (i * 37) % 70, bh = 80 + (i * 53) % 200;
        ctx.fillRect(i * 62 - 10, h - bh, bw, bh);
      }
    }));

    const day = save.data.day;
    const slots = save.data.today.completed;
    const today = save.todayStars();
    const maxToday = slots.reduce((n, s) => n + Object.keys(s.stars).length * 3, 0);

    // clipboard
    const cx = 450, cy = 380, cw = 680, ch = 600;
    const board = this.add.container(cx, cy);
    board.add(OTR.ui.panel(this, 0, 0, cw, ch, { top: 0xC98E55, bottom: 0xA8703E, border: 0x7A4E28, radius: 22 }));
    board.add(OTR.ui.panel(this, 0, 14, cw - 40, ch - 60, { top: 0xFFFFFF, bottom: 0xF3EEE6, radius: 8, shadow: 0.2 }));
    board.add(OTR.tex.shape(this, (clip) => {
      clip.fillStyle(0x9AA0B4, 1); clip.fillRoundedRect(-80, -ch / 2 - 12, 160, 44, 10);
      clip.fillStyle(0x6E7488, 1); clip.fillRoundedRect(-50, -ch / 2 - 4, 100, 14, 7);
    }));
    board.add(OTR.txt(this, 0, -ch / 2 + 70, `END OF DAY ${day}`, 40, '#250849', { weight: '900' }));
    board.add(OTR.txt(this, 0, -ch / 2 + 108, `${save.data.profile.name}'s shift report`, 17, '#7A6A90', { bold: false }));
    board.setY(cy + 700);
    this.tweens.add({ targets: board, y: cy, duration: 600, ease: 'Back.out' });
    OTR.audio.play('whoosh');

    let delay = 700;
    if (!slots.length) {
      board.add(OTR.txt(this, 0, 0, 'No stops logged today.\nHead back to the Shift Board and pick a scenario!', 20, '#5A4A70', { align: 'center', bold: false }));
    }
    slots.forEach((slot, i) => {
      const sc = OTR.registry.get(slot.id);
      const mod = OTR.registry.moduleOf(slot.id);
      if (!sc) return;
      const y = -ch / 2 + 176 + i * 92;
      const row = this.add.container(0, y);
      row.add(OTR.tex.shape(this, (g) => {
        g.fillStyle(OTR.color.shade(mod.color, 0.86), 1); g.fillRoundedRect(-280, -38, 560, 76, 12);
        g.fillStyle(mod.color, 1); g.fillRoundedRect(-280, -38, 10, 76, { tl: 12, bl: 12, tr: 0, br: 0 });
      }));
      row.add(OTR.txt(this, -256, -14, sc.title, 20, '#250849', { ox: 0, weight: '900' }));
      row.add(OTR.txt(this, -256, 14, mod.title, 14, '#7A6A90', { ox: 0, bold: false }));
      let sx = 20;
      sc.categories.forEach(cat => {
        const cs = OTR.ui.catStars(this, sx, 0, cat, 0, { size: 22, dark: true });
        row.add(cs);
        const n = slot.stars[cat] || 0;
        this.time.delayedCall(delay + 300, () => cs.starsRow.setCount(n, true, 160));
        sx += 128;
      });
      board.add(row);
      row.setAlpha(0).setX(-40);
      this.tweens.add({ targets: row, alpha: 1, x: 0, delay, duration: 320, ease: 'Cubic.out', onStart: () => OTR.audio.play('stamp') });
      delay += 650;
    });

    // total
    const totalY = ch / 2 - 90;
    board.add(OTR.txt(this, -280, totalY, 'STARS EARNED TODAY', 16, '#9A8AB0', { ox: 0 }));
    const totalText = OTR.txt(this, 280, totalY, `0 / ${maxToday}`, 34, '#FF6600', { ox: 1, weight: '900' });
    board.add(totalText);
    board.add(this.add.image(280 - 150, totalY, 'star_gold').setDisplaySize(34, 34));
    const tc = { v: 0 };
    this.tweens.add({
      targets: tc, v: today.all, delay, duration: 800,
      onUpdate: () => { totalText.setText(`${Math.round(tc.v)} / ${maxToday}`); },
      onComplete: () => { OTR.fx.pop(this, totalText, 1.3); OTR.audio.play('coin'); }
    });
    delay += 900;

    // rank panel (right)
    const rx = 1030, ry = 300;
    const rp = this.add.container(rx, ry);
    rp.add(OTR.ui.panel(this, 0, 0, 380, 400, { top: 0x3A1870, bottom: 0x240A48, border: 0x6A45A0, radius: 22 }));
    rp.add(OTR.txt(this, 0, -166, 'COURIER RANK', 16, '#C9B3F0', { weight: '900' }));
    const before = save.rankInfo(save.data.today.startTotal || 0);
    const after = save.rankInfo();
    const badge = this.add.image(0, -94, 'ic_badge').setDisplaySize(110, 110).setTint(before.rank.color);
    const rankName = OTR.txt(this, 0, -6, before.rank.name, 34, '#ffffff', { weight: '900', shadow: true });
    rp.add([badge, rankName]);
    const bar = OTR.ui.bar(rp.scene, -150, 50, 300, 18, { color: 0xFF6600, bgAlpha: 0.35 });
    bar.setValue(before.progress);
    rp.add(bar);
    const barLabel = OTR.txt(this, 0, 82, `${before.total} ★`, 16, '#FFC83D', { weight: '900' });
    rp.add(barLabel);
    rp.setAlpha(0);
    this.tweens.add({ targets: rp, alpha: 1, delay: 400, duration: 400 });

    this.time.delayedCall(delay, () => {
      barLabel.setText(after.next ? `${after.total} / ${after.next.stars} ★ to ${after.next.name}` : `${after.total} ★ — top rank!`);
      if (after.index > before.index) {
        bar.setValue(1, true, 500);
        this.time.delayedCall(550, () => {
          badge.setTint(after.rank.color);
          rankName.setText(after.rank.name);
          OTR.fx.pop(this, badge, 1.4);
          OTR.fx.pop(this, rankName, 1.3);
          bar.setValue(0);
          bar.setValue(after.progress, true, 700);
          OTR.audio.play('rankup');
          OTR.fx.confetti(this, rx, OTR.H + 20, { count: 150 });
          OTR.fx.stamp(this, rx, ry + 140, 'PROMOTED!', 0xFF6600, { size: 36, keep: true, angle: -6 });
        });
      } else {
        bar.setValue(after.progress, true, 900);
      }
    });

    // dispatcher note
    const ratio = maxToday ? today.all / maxToday : 0;
    const bucket = ratio >= 0.8 ? 'great' : ratio >= 0.5 ? 'good' : 'rough';
    const note = OTR.util.pick(cfg.dayNotes[bucket]);
    const np = this.add.container(rx, 588);
    np.add(OTR.ui.panel(this, 0, 0, 380, 110, { top: 0xFFFFFF, bottom: 0xF1EAFB, border: 0xFF6600, radius: 16 }));
    np.add(this.add.image(-160, -30, 'ic_chat').setDisplaySize(22, 22).setTint(0xFF6600));
    np.add(OTR.txt(this, 0, 6, note, 15, '#3A2A50', { align: 'center', wrap: 330, bold: false, lineSpacing: 2 }));
    np.setAlpha(0);
    this.tweens.add({ targets: np, alpha: 1, delay: delay + 400, duration: 400 });

    const btn = OTR.ui.button(this, rx, 682, `Start Day ${day + 1} ▶`, () => {
      save.endDay();
      OTR.fx.transition(this, 'HubScene');
    }, { w: 300, h: 56, skin: 'orange', key: 'ENTER' });
    btn.setEnabled(false);
    btn.setAlpha(0);
    this.time.delayedCall(delay + 700, () => {
      btn.setEnabled(true);
      this.tweens.add({ targets: btn, alpha: 1, duration: 300 });
      if (ratio >= 0.8) OTR.audio.play('fanfare');
    });
  }
}
OTR.registerScene(DaySummaryScene);
