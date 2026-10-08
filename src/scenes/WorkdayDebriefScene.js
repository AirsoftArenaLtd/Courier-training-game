/*
 * The 3D workday's debrief: the day's stars, then every line of the score log phase by phase and stop by stop (the
 * brief, the pre-trip, loading, driving, each stop, the end of the day), with the lesson under each mistake and a link
 * to where a driving mistake happened on the drive review. Built from the last finished workday
 * (OTR.save.data.workday.last, see src/core/workday.js), so the hub can open it again.
 * data: { page } (the page to open on, when coming back from the drive review)
 */
class WorkdayDebriefScene extends Phaser.Scene {
  constructor() { super('WorkdayDebriefScene'); }

  init(data) { this.d = data || {}; }

  create() {
    const rec = OTR.workday.saved().last;
    if (!rec) { this.scene.start('HubScene'); return; }
    this.rec = rec;
    const W = OTR.W, H = OTR.H, cats = OTR.scoring.CATS;
    OTR.fx.enter(this);
    this.add.image(W / 2, H / 2, OTR.tex.bg(this, 'record_bg', [[0, '#102d4e'], [1, OTR_DATA.theme.css('nightDeep')]]));
    OTR.tex.shape(this, (g) => { g.fillStyle(OTR_DATA.theme.primaryDeep, 0.9); g.fillRect(0, 0, W, 64); g.fillStyle(OTR_DATA.theme.accent, 1); g.fillRect(0, 64, W, 3); });
    const head = OTR.txt(this, 24, 32, 'WORKDAY DEBRIEF', 24, '#ffffff', { ox: 0, weight: '900' });
    OTR.txt(this, 24 + head.width + 16, 33, `Day ${rec.day} · ${OTR.record.date(rec.at)}`, 17, '#FFC83D', { ox: 0, weight: '900', fit: W - head.width - 80 });

    // ---- the day's stars, as the results screen gave them (frozen when the day finished)
    const untested = rec.untested || [];
    const tw = 300, gap = 12, ty = 86, th = 58;
    cats.forEach((cat, i) => {
      const def = OTR_DATA.config.categories[cat], x = 30 + i * (tw + gap);
      OTR.tex.shape(this, (g) => { g.fillStyle(0x000000, 0.25); g.fillRoundedRect(x, ty, tw, th, 12); g.lineStyle(2, OTR_DATA.theme.mid, 1); g.strokeRoundedRect(x, ty, tw, th, 12); });
      this.add.image(x + 22, ty + th / 2, def.icon).setDisplaySize(20, 20).setTint(def.color);
      OTR.txt(this, x + 40, ty + th / 2, def.label, 16, '#ffffff', { ox: 0, weight: '900', fit: 110 });
      if (untested.indexOf(cat) >= 0) OTR.txt(this, x + tw - 14, ty + th / 2, 'not tested', 14, OTR_DATA.theme.css('tint'), { ox: 1, bold: false, fit: 140 });
      else {
        OTR.ui.stars(this, x + 200, ty + th / 2, (rec.stars || {})[cat] || 0, { size: 24 });
        OTR.txt(this, x + tw - 14, ty + th / 2, `${Math.round(((rec.ratios || {})[cat] || 0) * 100)}%`, 14, OTR.color.css(def.color), { ox: 1, weight: '900' });
      }
    });
    const sx = 30 + 3 * (tw + gap), sw = W - 30 - sx;
    const got = cats.reduce((n, c) => n + ((rec.stars || {})[c] || 0), 0);
    OTR.txt(this, sx + sw / 2, ty + 18, `${got} / ${cats.length * 3} ★`, 20, '#FFC83D', { weight: '900', fit: sw - 10 });
    const line = OTR.workday.summaryLine(rec);
    OTR.txt(this, sx + sw / 2, ty + 42, line || (rec.criticals && rec.criticals.length ? 'Critical mistake' : ''), 13, rec.criticals && rec.criticals.length && !line ? '#FF9AA6' : OTR_DATA.theme.css('tint'), { bold: false, fit: sw - 10 });

    // ---- the lines, phase by phase and stop by stop
    const S = OTR.workday.sections(rec);
    this.S = S;
    this.buildSections(S);

    // ---- buttons
    this.focusables = [];
    const pins = S.pins.length;
    this.focusables.push(OTR.ui.button(this, W - 470, 684, pins ? `Drive review (${pins}) ›` : 'Drive review ›', () => this.openReview(), { w: 250, h: 50, skin: pins ? 'purple' : 'ghost', fontSize: 16 }));
    this.focusables.push(OTR.ui.button(this, W - 180, 684, 'Back to the station ▶', () => OTR.fx.transition(this, 'HubScene'), { w: 300, h: 54, skin: 'orange', fontSize: 18, key: 'ENTER', hint: '⏎', keyAfter: 600 }));
    this.prev = this.next = this.pageText = null;            // (the scene object is reused: nothing from last time)
    if (this.pages > 1) {
      this.prev = OTR.ui.button(this, 60, 684, '‹', () => this.showPage(this.page - 1), { w: 56, h: 46, skin: 'ghost', fontSize: 22 });
      this.next = OTR.ui.button(this, 260, 684, '›', () => this.showPage(this.page + 1), { w: 56, h: 46, skin: 'ghost', fontSize: 22 });
      this.pageText = OTR.txt(this, 160, 684, '', 15, '#ffffff', { weight: '900', fit: 130 });
      this.focusables.unshift(this.prev, this.next);
    }
    this.showPage(Math.min(this.pages - 1, Math.max(0, this.d.page || 0)));
    OTR.ui.focus(this, this.focusables, { start: this.focusables.length - 1 });
  }

  /** Section titles: the phase's name, or the stop's number (and address, when the 3D world gave it). */
  title(sec) {
    const names = { brief: 'Morning brief', pretrip: 'Pre-trip inspection', load: 'Loading the van', drive: 'Driving', stop: 'At the stops', end: 'End of the day' };
    if (names[sec.group]) return names[sec.group];
    const m = /^stop(-?\d+)$/.exec(sec.group);
    if (!m) return sec.group;
    return sec.stop && sec.stop.address ? `Stop ${m[1]}: ${sec.stop.address}` : `Stop ${m[1]}`;
  }

  /**
   * Every row (a section's title, or a line with its lesson) is measured, then laid down two columns to a page; a
   * title never ends a column. Rows on other pages are hidden, so nothing is shrunk or cut to fit.
   */
  buildSections(S) {
    const cols = [30, 650], cw = 600, top = 160, bottom = 650;
    cols.forEach(x => OTR.tex.shape(this, (g) => {
      g.fillStyle(OTR_DATA.theme.night, 0.82); g.fillRoundedRect(x, top, cw, bottom - top, 16);
      g.lineStyle(2, OTR_DATA.theme.mid, 0.8); g.strokeRoundedRect(x, top, cw, bottom - top, 16);
    }));
    const rows = [];
    S.sections.forEach(sec => {
      const t = OTR.txt(this, 0, 0, this.title(sec), 15, OTR_DATA.theme.css('accentLight'), { ox: 0, oy: 0, weight: '900', wrap: cw - 48 });
      rows.push({ objs: [t], h: t.height + 8, head: true, place: (x, y) => t.setPosition(x + 22, y) });
      sec.lines.forEach(l => {
        const bad = l.mark === 'bad', link = bad && l.pin >= 0;
        const wrap = cw - (link ? 120 : 64);
        const mark = l.mark === 'good' ? '✓' : l.mark === 'bonus' ? '+' : '✗';
        const col = l.mark === 'good' ? '#8BF0C6' : l.mark === 'bonus' ? '#FFC83D' : l.critical ? '#FF9AA6' : OTR_DATA.theme.css('paperTint');
        const t = OTR.txt(this, 0, 0, `${mark} ${l.label}${l.n > 1 ? `  (×${l.n})` : ''}${l.critical ? '  · CRITICAL' : ''}`, 15, col, { ox: 0, oy: 0, weight: bad ? '900' : '700', wrap });
        const objs = [t];
        let h = t.height + 6;
        const ls = bad && l.lesson ? OTR.txt(this, 0, 0, l.lesson, 13, OTR_DATA.theme.css('tint'), { ox: 0, oy: 0, bold: false, wrap }) : null;
        if (ls) { objs.push(ls); h += ls.height + 6; }
        let lk = null;
        if (link) {
          lk = OTR.txt(this, 0, 0, 'map ›', 13, '#FFC83D', { ox: 1, oy: 0, weight: '900', fit: 70 });
          lk.setInteractive({ useHandCursor: true }).on('pointerup', () => this.openReview(l.pin));
          objs.push(lk);
        }
        rows.push({ objs, h: h + 2, place: (x, y) => { t.setPosition(x + 30, y); if (ls) ls.setPosition(x + 44, y + t.height + 3); if (lk) lk.setPosition(x + cw - 20, y + 2); } });
      });
    });
    if (!rows.length) {
      const t = OTR.txt(this, 0, 0, 'Nothing was recorded on this workday.', 16, OTR_DATA.theme.css('tint'), { ox: 0, oy: 0, bold: false, wrap: cw - 48 });
      rows.push({ objs: [t], h: t.height, place: (x, y) => t.setPosition(x + 22, y) });
    }
    // lay them down
    let page = 0, col = 0, y = top + 16;
    const limit = bottom - 12;
    rows.forEach((r, i) => {
      const need = r.h + (r.head && rows[i + 1] && !rows[i + 1].head ? rows[i + 1].h : 0);
      if (y + need > limit && y > top + 16) {
        col++; y = top + 16;
        if (col > 1) { col = 0; page++; }
      }
      r.page = page;
      r.place(cols[col], y);
      y += r.h + (r.head ? 0 : 2);
      if (!r.head && rows[i + 1] && rows[i + 1].head) y += 10;      // a gap before the next section
    });
    this.rows = rows;
    this.pages = page + 1;
  }

  showPage(n) {
    this.page = Math.max(0, Math.min(this.pages - 1, n));
    this.rows.forEach(r => r.objs.forEach(o => { o.setVisible(r.page === this.page); if (o.input) o.input.enabled = r.page === this.page; }));
    if (this.pageText) {
      this.pageText.setText(`Page ${this.page + 1} of ${this.pages}`);
      this.prev.setEnabled(this.page > 0);
      this.next.setEnabled(this.page < this.pages - 1);
    }
  }

  openReview(pin) {
    const rec = this.rec;
    OTR.fx.transition(this, 'DriveReviewScene', OTR.workday.reviewData(rec, OTR.workday.replay(rec.events).log, {
      select: pin, back: 'WorkdayDebriefScene', backData: { page: this.page }
    }));
  }
}
OTR.registerScene(WorkdayDebriefScene);
