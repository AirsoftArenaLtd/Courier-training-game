/*
 * End of the route: the day's map with every stop, what went well and what didn't, and the day's stars.
 * Opened with { review: true } it shows the last finished day again (from the hub).
 */
class ShiftDebriefScene extends Phaser.Scene {
  constructor() { super('ShiftDebriefScene'); }

  init(data) { this.review = !!(data && data.review); }

  create() {
    // The day is closed and saved when its debrief first opens; the debrief itself is kept with it
    // (OTR.save.data.route.last), so a reload here, or the hub's "Last day's debrief", shows the same page again.
    const st = OTR.shift.state;
    const live = st && st.phase === 'debrief' && !this.review;
    const rec = live ? OTR.shift.finish(this) : OTR.save.data.route && OTR.save.data.route.last;
    if (!rec) { this.scene.start('HubScene'); return; }
    this.rec = rec;
    OTR.fx.enter(this);
    const W = OTR.W, H = OTR.H;
    const cats = OTR.scoring.CATS;
    this.add.image(W / 2, H / 2, OTR.tex.bg(this, 'debrief_bg', [[0, '#0c1f34'], [0.55, '#2e5076'], [1, '#FF8A4D']]));

    // ---- header
    OTR.txt(this, W / 2, 46, `DAY ${rec.day} COMPLETE`, 38, '#ffffff', { weight: '900', shadow: true });
    OTR.txt(this, W / 2, 80, `${rec.delivered} delivered · ${rec.exceptions} exception${rec.exceptions === 1 ? '' : 's'} · ${Math.floor(rec.minutes / 60)}h ${rec.minutes % 60}m on the road`, 18, '#FFE3C8', { bold: false });

    this.buildMap(rec);

    // ---- stars (critical mistakes cap their category, as in every scenario)
    const sxx = 620, syy = 150;
    cats.forEach((cat, i) => {
      const def = OTR_DATA.config.categories[cat];
      const y = syy + i * 62;
      this.add.image(sxx, y, def.icon).setDisplaySize(26, 26).setTint(def.color);
      OTR.txt(this, sxx + 22, y, def.label, 19, '#ffffff', { ox: 0, weight: '900' });
      const row = OTR.ui.stars(this, sxx + 230, y, 0, { size: 34 });
      if (live) this.time.delayedCall(500 + i * 400, () => row.setCount(rec.stars[cat], true, 220));
      else row.setCount(rec.stars[cat]);
      OTR.txt(this, sxx + 360, y, `${Math.round(rec.ratios[cat] * 100)}%`, 18, OTR.color.css(def.color), { ox: 0, weight: '900' });
    });

    this.buildLists(rec);

    // ---- dispatcher line + button
    OTR.txt(this, 60, 684, rec.note || '', 16, '#FFE3C8', { ox: 0, bold: false, wrap: 820 });
    OTR.ui.button(this, W - 180, 686, 'Back to the station ▶', () => OTR.fx.transition(this, 'HubScene'), { w: 300, h: 54, skin: 'orange', fontSize: 19, key: ['ENTER', 'SPACE'], keyAfter: 600 });

    if (live) {
      const total = cats.reduce((n, c) => n + rec.stars[c], 0);
      this.time.delayedCall(1800, () => {
        if (total >= 8 && !rec.criticals) { OTR.fx.confetti(this, W / 2, H + 20, { count: 120 }); OTR.audio.play('fanfare'); }
        else OTR.audio.play('success');
      });
    }
  }

  /** The day's route on the town map, each stop green (delivered) or amber, and what the truck rolled out with. */
  buildMap(rec) {
    const T = OTR.town.build(rec.seed || 1);
    const mw = 440, mh = 330, mx = 60, my = 120;
    const sx = mw / T.W, sy = mh / T.H;
    const stops = (rec.stops || []).filter(r => T.lotById(r.lotId));
    OTR.tex.shape(this, (g) => {
      g.fillStyle(OTR_DATA.theme.night, 0.8); g.fillRoundedRect(mx - 10, my - 10, mw + 20, mh + 20, 14);
      g.lineStyle(2, OTR_DATA.theme.mid, 0.8); g.strokeRoundedRect(mx - 10, my - 10, mw + 20, mh + 20, 14);
      g.lineStyle(3, 0x4A4658, 1);
      T.hy.forEach(y => g.lineBetween(mx, my + y * sy, mx + mw, my + y * sy));
      T.vx.forEach(x => g.lineBetween(mx + x * sx, my, mx + x * sx, my + mh));
      g.fillStyle(OTR_DATA.theme.primary, 1); g.fillRect(mx + T.depot.x * sx - 6, my + T.depot.y * sy - 5, 12, 10);
      g.lineStyle(3, OTR_DATA.theme.accent, 0.9);
      let px = mx + T.depot.x * sx, py = my + T.depot.y * sy;
      stops.forEach(r => {
        const lot = T.lotById(r.lotId);
        const x = mx + lot.curb.x * sx, y = my + lot.curb.y * sy;
        g.lineBetween(px, py, x, y);
        px = x; py = y;
      });
      g.lineBetween(px, py, mx + T.depot.x * sx, my + T.depot.y * sy);
      stops.forEach(r => {
        const lot = T.lotById(r.lotId);
        g.fillStyle(r.outcome === 'delivered' ? 0x2BC48A : 0xFFB020, 1);
        g.fillCircle(mx + lot.curb.x * sx, my + lot.curb.y * sy, 7);
      });
    });
    stops.forEach((r, i) => {
      const lot = T.lotById(r.lotId);
      OTR.txt(this, mx + lot.curb.x * sx, my + lot.curb.y * sy, String(i + 1), 11, OTR_DATA.theme.css('primaryDeep'), { weight: '900' });
    });
    // driving mistakes, as red crosses, and the way to the full review
    const pins = rec.pins || [];
    if (pins.length) {
      OTR.tex.shape(this, (g) => {
        g.lineStyle(3, 0xFF3355, 1);
        pins.forEach(p => { const x = mx + p.where.x * sx, y = my + p.where.y * sy; g.lineBetween(x - 4, y - 4, x + 4, y + 4); g.lineBetween(x - 4, y + 4, x + 4, y - 4); });
      });
    }
    const rv = OTR.ui.button(this, mx + mw - 92, my + mh + 26, pins.length ? `Drive review (${pins.length}) ›` : 'Drive review ›', () => this.openReview(), { w: 184, h: 34, skin: pins.length ? 'purple' : 'ghost', fontSize: 14 });
    this.reviewBtn = rv;
    OTR.txt(this, mx, my + mh + 26, `${OTR_DATA.town.name} · ${{ clear: 'Clear', cloudy: 'Overcast', rain: 'Rain', storm: 'Storms', snow: 'Snow and ice', heat: 'Heat advisory' }[rec.weather] || rec.weather}`, 14, OTR_DATA.theme.css('tint'), { ox: 0, bold: false });
    // defects the pre-trip missed (they held the truck at the gate)
    const out = rec.rolledOut || [];
    if (out.length) {
      let y = my + mh + 54;
      OTR.txt(this, mx, y, 'ROLLED OUT WITH', 13, '#FF7A8A', { ox: 0, weight: '900' });
      y += 14;
      out.slice(0, 3).forEach(t => {
        const l = OTR.txt(this, mx + 10, y, '✗ ' + t, 13, OTR_DATA.theme.css('paperTint'), { ox: 0, oy: 0, bold: false, wrap: mw - 20 });
        y += l.height + 3;
      });
      if (out.length > 3) OTR.txt(this, mx + 10, y, `+ ${out.length - 3} more`, 12, OTR_DATA.theme.css('tint'), { ox: 0, oy: 0, bold: false });
    }
  }

  openReview(pin) {
    const rec = this.rec;
    OTR.fx.transition(this, 'DriveReviewScene', {
      pins: rec.pins || [], seed: rec.seed, stops: rec.stops, title: `Day ${rec.day}`, select: pin,
      back: 'ShiftDebriefScene', backData: { review: true }
    });
  }

  /**
   * What to work on (every kind of mistake, ranked: critical first, then by the points it cost over the whole day,
   * with the top one of each category moved up) and what went well, which always gets a row when anything did.
   * Rows that do not fit are counted in a "+ N more" line; nothing runs off the panel.
   */
  buildLists(rec) {
    const work = rec.work || [], well = rec.well || [];
    const x0 = 560, py = 318, pw = 660, ph = 322, bottom = py + ph - 14;
    OTR.tex.shape(this, (pg) => {
      pg.fillStyle(OTR_DATA.theme.night, 0.82); pg.fillRoundedRect(x0, py, pw, ph, 16);
      pg.lineStyle(2, OTR_DATA.theme.mid, 0.8); pg.strokeRoundedRect(x0, py, pw, ph, 16);
    });
    OTR.txt(this, x0 + 24, py + 24, 'WHAT TO WORK ON', 14, OTR_DATA.theme.css('accentLight'), { ox: 0, weight: '900' });
    // room kept for "went well": its header and at least one row
    const wellRows = Math.min(well.length, 1);
    const wellH = well.length ? 30 + wellRows * 22 : 0;
    const limit = bottom - wellH;
    let y = py + 48;
    if (!work.length) {
      OTR.txt(this, x0 + 24, y, 'Nothing flagged. That was a clean day.', 17, '#8BF0C6', { ox: 0, oy: 0, bold: false });
      y += 30;
    }
    let shown = 0;
    for (const it of work) {
      const left = work.length - shown - 1;
      // ~ for part marks, ↺ for a line that cost nothing itself (a restart: what it shows is that it happened)
      const note = !it.critical && !it.lost;
      const mark = note ? '↺' : it.partial ? '~' : '✗';
      const wrap = pw - (it.pin >= 0 && (rec.pins || []).length ? 116 : 70);
      const t = OTR.txt(this, x0 + 38, y, `${mark} ${it.label}${it.n > 1 ? `  (×${it.n})` : ''}${it.critical ? '  · CRITICAL' : ''}`, 16, it.critical ? '#FF9AA6' : note ? OTR_DATA.theme.css('tint') : OTR_DATA.theme.css('paperTint'), { ox: 0, oy: 0, weight: note ? '700' : '900', wrap });
      const l = it.lesson ? OTR.txt(this, x0 + 38, y + t.height + 2, it.lesson, 13, OTR_DATA.theme.css('tint'), { ox: 0, oy: 0, bold: false, wrap }) : null;
      const need = t.height + 2 + (l ? l.height + 8 : 6);
      if (y + need > limit - (left > 0 ? 22 : 0)) { t.destroy(); if (l) l.destroy(); break; }
      const def = OTR_DATA.config.categories[it.cat] || { color: 0xF0435A, icon: 'ic_flag' };
      this.add.image(x0 + 18, y + 9, def.icon).setDisplaySize(15, 15).setTint(def.color);
      // a driving mistake links to where it happened on the map
      if (it.pin >= 0 && (rec.pins || []).length) {
        const lk = OTR.txt(this, x0 + pw - 18, y + 9, 'map ›', 13, '#FFC83D', { ox: 1, weight: '900' });
        lk.setInteractive({ useHandCursor: true }).on('pointerup', () => this.openReview(it.pin));
      }
      y += need;
      shown++;
    }
    if (shown < work.length) {
      OTR.txt(this, x0 + 38, y, `+ ${work.length - shown} more to work on`, 13, OTR_DATA.theme.css('tint'), { ox: 0, oy: 0, bold: false });
      y += 22;
    }
    if (well.length) {
      OTR.txt(this, x0 + 24, y + 12, 'WENT WELL', 14, '#8BF0C6', { ox: 0, weight: '900' });
      y += 26;
      const room = Math.max(1, Math.floor((bottom - y) / 22));
      const rows = well.slice(0, Math.min(room, 6));
      rows.forEach((it, i) => {
        const more = i === rows.length - 1 && well.length > rows.length ? `   + ${well.length - rows.length} more` : '';
        OTR.txt(this, x0 + 38, y, `✓ ${it.label}${it.n > 1 ? `  (×${it.n})` : ''}${more}`, 14, '#8BF0C6', { ox: 0, oy: 0, bold: false, wrap: pw - 70 });
        y += 22;
      });
    }
  }
}
OTR.registerScene(ShiftDebriefScene);
