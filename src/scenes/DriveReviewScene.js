/*
 * Drive review: the town map with a numbered pin wherever a driving mistake happened (from the score log's `where`),
 * and the list beside it. Picking a pin or a row shows what happened, how fast, when, and the lesson.
 * data: { pins: [{ label, cat, lesson, critical, where: { x, y, mph, t, seed } }], seed, stops?: [{ lotId, outcome }],
 *         title, back: scene key, backData }
 */
class DriveReviewScene extends Phaser.Scene {
  constructor() { super('DriveReviewScene'); }

  init(data) { this.d = data || {}; }

  create() {
    const W = OTR.W, H = OTR.H, d = this.d;
    OTR.fx.enter(this);
    this.add.image(W / 2, H / 2, OTR.tex.bg(this, 'review_bg', [[0, '#1A0A36'], [1, '#0B0418']]));
    OTR.tex.shape(this, (g) => { g.fillStyle(0x16062B, 0.9); g.fillRect(0, 0, W, 64); g.fillStyle(0xFF6600, 1); g.fillRect(0, 64, W, 3); });
    const head = OTR.txt(this, 24, 32, 'DRIVE REVIEW', 24, '#ffffff', { ox: 0, weight: '900' });
    OTR.txt(this, 24 + head.width + 16, 33, d.title || '', 17, '#FFC83D', { ox: 0, weight: '900' });
    this.focusables = [OTR.ui.button(this, W - 90, 32, 'Back', () => OTR.fx.transition(this, d.back || 'HubScene', d.backData || {}), { w: 150, h: 44, skin: 'ghost', fontSize: 18, key: 'ESC', hint: 'ESC' })];

    this.pins = (d.pins || []).filter(p => p.where);
    this.T = OTR.town.build(d.seed || (this.pins[0] && this.pins[0].where.seed) || 1);
    this.drawMap();
    this.drawList();
    if (this.pins.length) this.select(d.select >= 0 && d.select < this.pins.length ? d.select : 0);
    OTR.ui.focus(this, this.focusables, { start: 0 });
  }

  drawMap() {
    const T = this.T, A = OTR.townArt;
    const aw = 820, ah = 596, ax = 24, ay = 84;
    const s = Math.min(aw / T.W, ah / T.H);
    const mw = T.W * s, mh = T.H * s, mx = ax + (aw - mw) / 2, my = ay + (ah - mh) / 2;
    this.map = { s, mx, my };
    const P = (x, y) => ({ x: mx + x * s, y: my + y * s });
    OTR.tex.shape(this, (g) => {
      g.fillStyle(0x2E4A2A, 1); g.fillRoundedRect(mx - 8, my - 8, mw + 16, mh + 16, 12);
      // streets, sidewalk-wide then asphalt
      const full = (A.ROAD + A.WALK * 2) * s, road = A.ROAD * s;
      g.fillStyle(0x9A97A6, 1);
      T.hy.forEach(y => g.fillRect(mx, my + y * s - full / 2, mw, full));
      T.vx.forEach(x => g.fillRect(mx + x * s - full / 2, my, full, mh));
      g.fillStyle(0x4E4B58, 1);
      T.hy.forEach(y => g.fillRect(mx, my + y * s - road / 2, mw, road));
      T.vx.forEach(x => g.fillRect(mx + x * s - road / 2, my, road, mh));
      // buildings
      g.fillStyle(0xC9B8A6, 0.85);
      T.lots.forEach(l => { const [bw, bh] = OTR.town.size(l); const p = P(l.x, l.y); g.fillRect(p.x - bw * s / 2, p.y - bh * s / 2, bw * s, bh * s); });
      const dp = P(T.depot.x, T.depot.y);
      g.fillStyle(0x4D148C, 1); g.fillRect(dp.x - T.depot.w * s / 2, dp.y - T.depot.h * s / 2, T.depot.w * s, T.depot.h * s);
      // junction controls: a red dot for a stop sign, a yellow one for lights
      T.inters.forEach(it => { const p = P(it.x, it.y); g.fillStyle(it.stop ? 0xE8304A : 0xFFC83D, 0.9); g.fillCircle(p.x, p.y, 3); });
      // the day's stops, when there are any
      (this.d.stops || []).forEach(r => {
        const lot = T.lotById && T.lotById(r.lotId);
        if (!lot) return;
        const p = P(lot.curb.x, lot.curb.y);
        g.fillStyle(r.outcome === 'delivered' ? 0x2BC48A : 0xFFB020, 1); g.fillCircle(p.x, p.y, 5);
      });
    });
    OTR.txt(this, mx, Math.min(OTR.H - 10, my + mh + 16), 'Small red dots: stop signs · yellow: traffic lights · numbered pins: where each mistake happened', 12, '#C9B3F0', { ox: 0, bold: false });

    this.pinObjs = this.pins.map((p, i) => {
      const q = P(p.where.x, p.where.y);
      // mistakes are red (critical) or orange, whatever their category's own colour
      const col = p.critical ? 0xE8304A : 0xFF6600;
      const c = this.add.container(q.x, q.y).setDepth(10);
      const ring = this.add.circle(0, 0, 18, 0xffffff, 0).setStrokeStyle(3, 0xffffff, 1).setVisible(false);
      c.add([ring, this.add.circle(0, 0, 11, col).setStrokeStyle(2, 0x16062B, 1), OTR.txt(this, 0, 0, String(i + 1), 11, '#ffffff', { weight: '900' })]);
      c.ring = ring;
      c.setSize(26, 26).setInteractive({ useHandCursor: true }).on('pointerup', () => this.select(i));
      return c;
    });
  }

  drawList() {
    const x = 866, top = 84, w = 390, h = 610;
    this.add.image(x + w / 2, top + h / 2, OTR.tex.panel(this, w, h, { top: 0xFFFFFF, bottom: 0xF1EAFB, border: 0xC9B3F0, radius: 16 }));
    OTR.txt(this, x + 20, top + 24, this.pins.length ? `${this.pins.length} MISTAKE${this.pins.length === 1 ? '' : 'S'} ON THE ROAD` : 'NO DRIVING MISTAKES', 14, this.pins.length ? '#C8243B' : '#1E7E55', { ox: 0, weight: '900' });
    if (!this.pins.length) {
      OTR.txt(this, x + 20, top + 60, 'A clean drive: every sign, light and hazard handled.', 15, '#3A2A50', { ox: 0, oy: 0, bold: false, wrap: w - 40 });
      return;
    }
    const perPage = 9;
    this.rows = [];
    this.pins.slice(0, perPage).forEach((p, i) => {
      const y = top + 58 + i * 38;
      const hit = this.add.rectangle(x + w / 2, y, w - 24, 34, 0x4D148C, 0.001).setInteractive({ useHandCursor: true });
      hit.on('pointerup', () => this.select(i));
      this.add.circle(x + 30, y, 10, p.critical ? 0xE8304A : 0xFF6600);
      OTR.txt(this, x + 30, y, String(i + 1), 11, '#ffffff', { weight: '900' });
      const t = OTR.txt(this, x + 50, y, p.label, 14, p.critical ? '#B3122E' : '#250849', { ox: 0, weight: '900' });
      if (t.width > w - 130) t.setScale((w - 130) / t.width);
      OTR.txt(this, x + w - 20, y, OTR.drive.when(p.where), 12, '#7A6A90', { ox: 1 });
      this.rows.push(hit);
    });
    if (this.pins.length > perPage) OTR.txt(this, x + 20, top + 58 + perPage * 38, `+ ${this.pins.length - perPage} more on the map`, 13, '#7A6A90', { ox: 0 });
    // what was picked
    const dy = top + 420;
    OTR.tex.shape(this, (g) => { g.fillStyle(0x4D148C, 0.07); g.fillRoundedRect(x + 14, dy, w - 28, h - (dy - top) - 14, 12); });
    this.detailHead = OTR.txt(this, x + 30, dy + 16, '', 15, '#250849', { ox: 0, oy: 0, weight: '900', wrap: w - 60 });
    this.detailMeta = OTR.txt(this, x + 30, dy + 40, '', 13, '#7A6A90', { ox: 0, oy: 0, wrap: w - 60 });
    this.detailBody = OTR.txt(this, x + 30, dy + 64, '', 14, '#3A2A50', { ox: 0, oy: 0, bold: false, wrap: w - 60, lineSpacing: 2 });
  }

  select(i) {
    const p = this.pins[i];
    if (!p) return;
    this.pinObjs.forEach((c, j) => { c.ring.setVisible(j === i); c.setScale(j === i ? 1.25 : 1); c.setDepth(j === i ? 20 : 10); });
    this.tweens.killTweensOf(this.pinObjs[i].ring);
    this.pinObjs[i].ring.setScale(1).setAlpha(1);
    this.tweens.add({ targets: this.pinObjs[i].ring, scale: 1.5, alpha: 0.2, duration: 700, yoyo: true, repeat: -1 });
    if (!this.detailHead) return;
    this.detailHead.setText(`${i + 1}. ${p.label}`).setColor(p.critical ? '#B3122E' : '#250849');
    this.detailMeta.setText(`${p.where.mph !== undefined ? p.where.mph + ' mph · ' : ''}${OTR.drive.when(p.where)} into the drive${p.critical ? ' · CRITICAL' : ''}`);
    this.detailMeta.y = this.detailHead.y + this.detailHead.height + 4;
    this.detailBody.setText(p.lesson || '');
    this.detailBody.y = this.detailMeta.y + this.detailMeta.height + 8;
    OTR.audio.play('tick');
  }
}
OTR.registerScene(DriveReviewScene);

/* Pins from a score log, and how the review names a moment. */
OTR.drive = {
  /** The pinned mistakes of a log (items, or a saved { items }), oldest first. */
  pins(log) {
    const items = (log && (log.items || log)) || [];
    return items.filter(it => it.where && (it.kind === 'penalty' || (it.kind === 'check' && it.got < it.max)))
      .map(it => ({ label: it.label, cat: it.cat, lesson: it.lesson, critical: !!it.critical, where: it.where }));
  },
  when(w) {
    if (!w || w.t === undefined) return '';
    const m = Math.floor(w.t / 60), s = w.t % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }
};
