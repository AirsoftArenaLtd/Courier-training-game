/*
 * End of the route: the day's map with every stop, what went well and what didn't, and the day's stars.
 */
class ShiftDebriefScene extends Phaser.Scene {
  constructor() { super('ShiftDebriefScene'); }

  create() {
    const st = OTR.shift.state;
    if (!st) { this.scene.start('HubScene'); return; }
    OTR.fx.enter(this);
    const W = OTR.W, H = OTR.H;
    this.add.image(W / 2, H / 2, OTR.tex.bg(this, 'debrief_bg', [[0, '#1A0A36'], [0.55, '#5A2A7A'], [1, '#FF8A4D']]));

    const log = OTR.ScoreLog.from(st.log);
    const cats = OTR.scoring.CATS;
    const ratios = log.ratios(cats);
    const rec = OTR.shift.finish(this);

    // ---- header
    OTR.txt(this, W / 2, 46, `DAY ${rec.day} COMPLETE`, 38, '#ffffff', { weight: '900', shadow: true });
    OTR.txt(this, W / 2, 80, `${rec.delivered} delivered · ${rec.exceptions} exception${rec.exceptions === 1 ? '' : 's'} · ${Math.floor(rec.minutes / 60)}h ${rec.minutes % 60}m on the road`, 18, '#FFE3C8', { bold: false });

    // ---- route map
    const T = OTR.town.build(st.seed);
    const mw = 440, mh = 330, mx = 60, my = 120;
    const sx = mw / T.W, sy = mh / T.H;
    OTR.tex.shape(this, (g) => {
      g.fillStyle(0x0E0620, 0.8); g.fillRoundedRect(mx - 10, my - 10, mw + 20, mh + 20, 14);
      g.lineStyle(2, 0x6A45A0, 0.8); g.strokeRoundedRect(mx - 10, my - 10, mw + 20, mh + 20, 14);
      g.lineStyle(3, 0x4A4658, 1);
      T.hy.forEach(y => g.lineBetween(mx, my + y * sy, mx + mw, my + y * sy));
      T.vx.forEach(x => g.lineBetween(mx + x * sx, my, mx + x * sx, my + mh));
      g.fillStyle(0x4D148C, 1); g.fillRect(mx + T.depot.x * sx - 6, my + T.depot.y * sy - 5, 12, 10);
      // route line
      g.lineStyle(3, 0xFF6600, 0.9);
      let px = mx + T.depot.x * sx, py = my + T.depot.y * sy;
      st.route.forEach(r => {
        const lot = T.lotById(r.lotId);
        const x = mx + lot.curb.x * sx, y = my + lot.curb.y * sy;
        g.lineBetween(px, py, x, y);
        px = x; py = y;
      });
      g.lineBetween(px, py, mx + T.depot.x * sx, my + T.depot.y * sy);
      st.route.forEach(r => {
        const lot = T.lotById(r.lotId);
        const ok = r.result && r.result.outcome === 'delivered';
        g.fillStyle(ok ? 0x2BC48A : 0xFFB020, 1);
        g.fillCircle(mx + lot.curb.x * sx, my + lot.curb.y * sy, 7);
      });
    });
    st.route.forEach((r, i) => {
      const lot = T.lotById(r.lotId);
      OTR.txt(this, mx + lot.curb.x * sx, my + lot.curb.y * sy, String(i + 1), 11, '#16062B', { weight: '900' });
    });
    OTR.txt(this, mx, my + mh + 26, `${OTR_DATA.town.name} · ${rec.weather === 'heat' ? 'heat advisory' : rec.weather}`, 14, '#C9B3F0', { ox: 0, bold: false });

    // ---- stars
    const sxx = 620, syy = 150;
    cats.forEach((cat, i) => {
      const def = OTR_DATA.config.categories[cat];
      const y = syy + i * 62;
      this.add.image(sxx, y, def.icon).setDisplaySize(26, 26).setTint(def.color);
      OTR.txt(this, sxx + 22, y, def.label, 19, '#ffffff', { ox: 0, weight: '900' });
      const row = OTR.ui.stars(this, sxx + 230, y, 0, { size: 34 });
      this.time.delayedCall(500 + i * 400, () => row.setCount(rec.stars[cat], true, 220));
      const pct = Math.round(ratios[cat] * 100);
      OTR.txt(this, sxx + 360, y, `${pct}%`, 18, OTR.color.css(def.color), { ox: 0, weight: '900' });
    });

    // ---- what went well / what to work on
    const items = log.items;
    const groupBy = (list) => {
      const out = [];
      list.forEach(it => {
        const hit = out.find(o => o.label === it.label);
        if (hit) { hit.n++; hit.lesson = hit.lesson || it.lesson; }
        else out.push({ label: it.label, lesson: it.lesson, cat: it.cat, kind: it.kind, got: it.got, gap: it.got - it.max, n: 1 });
      });
      return out;
    };
    const good = groupBy(items.filter(it => it.kind === 'check' && it.good)).slice(0, 4);
    const bad = items.filter(it => (it.kind === 'penalty') || (it.kind === 'check' && !it.good));
    const worst = groupBy(bad).sort((a, b) => a.gap - b.gap).slice(0, 5);
    const panel = this.add.container(0, 0);
    // the panel ends above the "Back to the station" button (it used to run under the button's corner)
    const py2 = 318, ph2 = 322;
    panel.add(OTR.tex.shape(this, (pg) => {
      pg.fillStyle(0x0E0620, 0.82); pg.fillRoundedRect(560, py2, 660, ph2, 16);
      pg.lineStyle(2, 0x6A45A0, 0.8); pg.strokeRoundedRect(560, py2, 660, ph2, 16);
    }));
    panel.add(OTR.txt(this, 584, py2 + 24, 'WHAT TO WORK ON', 14, '#FF9447', { ox: 0, weight: '900' }));
    // Everything stays inside the panel: rows that do not fit are summed up in one line, and "went well" only
    // appears if there is room left. (On a rough day the list used to run off the panel and the canvas.)
    const bottom = py2 + ph2 - 14;
    let y = py2 + 50;
    if (!worst.length) {
      panel.add(OTR.txt(this, 584, y, 'Nothing flagged. That was a clean day.', 17, '#8BF0C6', { ox: 0, oy: 0, bold: false }));
      y += 30;
    }
    let shownN = 0;
    for (const it of worst) {
      const mark = it.kind === 'penalty' || it.got <= 0 ? '✗' : '~';     // ~ only for part marks
      const t = OTR.txt(this, 598, y, `${mark} ${it.label}${it.n > 1 ? `  (×${it.n})` : ''}`, 16, '#F4ECFF', { ox: 0, oy: 0, weight: '900', wrap: 600 });
      const l = it.lesson ? OTR.txt(this, 598, y + t.height + 2, it.lesson, 13, '#C9B3F0', { ox: 0, oy: 0, bold: false, wrap: 600 }) : null;
      const need = t.height + 2 + (l ? l.height + 8 : 6);
      if (y + need > bottom - (shownN < worst.length - 1 ? 22 : 0)) { t.destroy(); if (l) l.destroy(); break; }
      const def = OTR_DATA.config.categories[it.cat] || { color: 0xF0435A, icon: 'ic_flag' };
      panel.add(this.add.image(578, y + 9, def.icon).setDisplaySize(15, 15).setTint(def.color));
      panel.add(t);
      if (l) panel.add(l);
      y += need;
      shownN++;
    }
    if (shownN < worst.length) {
      panel.add(OTR.txt(this, 598, y, `+ ${worst.length - shownN} more to work on`, 13, '#C9B3F0', { ox: 0, oy: 0, bold: false }));
      y += 22;
    }
    if (good.length && y + 52 < bottom) {
      panel.add(OTR.txt(this, 584, y + 6, 'WENT WELL', 14, '#8BF0C6', { ox: 0, weight: '900' }));
      y += 30;
      good.slice(0, 3).forEach(it => {
        if (y + 20 > bottom) return;
        panel.add(OTR.txt(this, 598, y, `✓ ${it.label}${it.n > 1 ? `  (×${it.n})` : ''}`, 14, '#8BF0C6', { ox: 0, oy: 0, bold: false, wrap: 600 }));
        y += 22;
      });
    }

    // ---- dispatcher line + button
    const total = cats.reduce((n, c) => n + rec.stars[c], 0);
    const note = total >= 8 ? OTR.util.pick(OTR_DATA.config.dayNotes.great)
      : total >= 5 ? OTR.util.pick(OTR_DATA.config.dayNotes.good)
        : OTR.util.pick(OTR_DATA.config.dayNotes.rough);
    OTR.txt(this, 60, 700, note, 16, '#FFE3C8', { ox: 0, bold: false, wrap: 760 });
    OTR.ui.button(this, W - 180, 686, 'Back to the station ▶', () => OTR.fx.transition(this, 'HubScene'), { w: 300, h: 54, skin: 'orange', fontSize: 19, key: ['ENTER', 'SPACE'] });

    this.time.delayedCall(1800, () => {
      if (total >= 8) { OTR.fx.confetti(this, W / 2, H + 20, { count: 120 }); OTR.audio.play('fanfare'); }
      else OTR.audio.play('success');
    });
  }
}
OTR.registerScene(ShiftDebriefScene);
