/*
 * Drive review: the town map with a numbered pin wherever a driving mistake happened (from the score log's `where`),
 * and the list beside it. Picking a pin or a row shows what happened, how fast, when, and the lesson.
 * data: { pins: [{ label, cat, lesson, critical, mark?, where: { x, y, mph, t, seed } }], seed, stops?: [{ lotId, outcome }],
 *         title, select: the pin to open on, back: scene key, backData }
 * The 3D workday's streets are not the 2D town: it passes plan: { depot: { x, z }, stops: [{ stop, delivered, x, z }] }
 * and pins at { x, z, mph } (metres), drawn on a plan fitted around them.
 */
class DriveReviewScene extends Phaser.Scene {
  constructor() { super('DriveReviewScene'); }

  init(data) { this.d = data || {}; }

  create() {
    const W = OTR.W, H = OTR.H, d = this.d;
    OTR.fx.enter(this);
    this.add.image(W / 2, H / 2, OTR.tex.bg(this, 'review_bg', [[0, '#0c1f34'], [1, '#050d17']]));
    OTR.tex.shape(this, (g) => { g.fillStyle(OTR_DATA.theme.primaryDeep, 0.9); g.fillRect(0, 0, W, 64); g.fillStyle(OTR_DATA.theme.accent, 1); g.fillRect(0, 64, W, 3); });
    const head = OTR.txt(this, 24, 32, 'DRIVE REVIEW', 24, '#ffffff', { ox: 0, weight: '900' });
    OTR.txt(this, 24 + head.width + 16, 33, d.title || '', 17, '#FFC83D', { ox: 0, weight: '900' });
    this.focusables = [OTR.ui.button(this, W - 90, 32, 'Back', () => OTR.fx.transition(this, d.back || 'HubScene', d.backData || {}), { w: 150, h: 44, skin: 'ghost', fontSize: 18, key: 'ESC', hint: 'ESC' })];

    this.pins = (d.pins || []).filter(p => p.where && (!d.plan || (Number.isFinite(p.where.x) && Number.isFinite(p.where.z))));
    if (d.plan) this.drawPlan(d.plan);
    else {
      this.T = OTR.town.build(d.seed || (this.pins[0] && this.pins[0].where.seed) || 1);
      this.drawMap();
    }
    this.drawList();
    const picked = d.select >= 0 && d.select < this.pins.length;
    if (this.pins.length) this.select(picked ? d.select : 0);
    // the keyboard: the arrows or TAB move between Back and the pins (the list's rows, then the map's pins past the
    // list), ENTER shows a pin's details, ESC goes back. Opened on a pin, the ring starts on it.
    const pinFocus = this.pins.map((p, i) => {
      const it = (this.rows && this.rows[i]) || this.pinObjs[i];
      it.press = () => this.select(i);
      return it;
    });
    this.focusables = this.focusables.concat(pinFocus);
    OTR.ui.focus(this, this.focusables, { start: picked ? 1 + d.select : 0 });
  }

  drawMap() {
    const T = this.T, A = OTR.townArt;
    const aw = 820, ax = 24, ay = 84;
    const ah = Math.min(596, this.drawFoot(ax, aw, 'Small red dots: stop signs · yellow: traffic lights · numbered pins: where each mistake happened') - 14 - ay);
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
      g.fillStyle(OTR_DATA.theme.primary, 1); g.fillRect(dp.x - T.depot.w * s / 2, dp.y - T.depot.h * s / 2, T.depot.w * s, T.depot.h * s);
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
    this.placePins(p => P(p.where.x, p.where.y));
  }

  /**
   * The 3D workday's plan: the depot, the stops and the pins, in metres (x east, z south), fitted to the map area with
   * a 10 m grid. Nothing else is known about its streets here, so the plan draws only what was reported.
   */
  drawPlan(plan) {
    const aw = 820, ax = 24, ay = 84, streets = this.planStreets(plan);
    const ah = Math.min(572, this.drawFoot(ax, aw, streets ? 'Grey: the streets · square: the depot · circles: your stops (green delivered) · numbered pins: where each mistake happened'
      : 'Square: the depot · circles: your stops (green delivered) · numbered pins: where each mistake happened') - 20 - ay);
    const pts = [];
    if (plan.depot) pts.push(plan.depot);
    (plan.stops || []).forEach(s => { if (Number.isFinite(s.x) && Number.isFinite(s.z)) pts.push(s); });
    this.pins.forEach(p => { if (Number.isFinite(p.where.x) && Number.isFinite(p.where.z)) pts.push(p.where); });
    let x0 = Math.min(...pts.map(q => q.x)), x1 = Math.max(...pts.map(q => q.x));
    let z0 = Math.min(...pts.map(q => q.z)), z1 = Math.max(...pts.map(q => q.z));
    if (!pts.length) { x0 = z0 = -20; x1 = z1 = 20; }
    // at least 40 m each way, and 12 m of margin, so a single point is not the whole map
    const grow = (a, b) => { const m = Math.max(0, 40 - (b - a)) / 2 + 12; return [a - m, b + m]; };
    [x0, x1] = grow(x0, x1); [z0, z1] = grow(z0, z1);
    const s = Math.min(aw / (x1 - x0), ah / (z1 - z0));
    const mw = (x1 - x0) * s, mh = (z1 - z0) * s, mx = ax + (aw - mw) / 2, my = ay + (ah - mh) / 2;
    const P = (x, z) => ({ x: mx + (x - x0) * s, y: my + (z - z0) * s });
    OTR.tex.shape(this, (g) => {
      g.fillStyle(0x2E4A2A, 1); g.fillRoundedRect(mx - 8, my - 8, mw + 16, mh + 16, 12);
      // the day's streets, where the record knows its town (B-29), cut to the map
      if (streets) {
        g.fillStyle(0x4E4B58, 1);
        const half = streets.road / 2;
        streets.xs.forEach(x => { if (x + half > x0 && x - half < x1) { const a = P(Math.max(x0, x - half), z0), b = P(Math.min(x1, x + half), z1); g.fillRect(a.x, a.y, b.x - a.x, b.y - a.y); } });
        streets.zs.forEach(z => { if (z + half > z0 && z - half < z1) { const a = P(x0, Math.max(z0, z - half)), b = P(x1, Math.min(z1, z + half)); g.fillRect(a.x, a.y, b.x - a.x, b.y - a.y); } });
      }
      g.lineStyle(1, 0xffffff, 0.08);
      for (let x = Math.ceil(x0 / 10) * 10; x <= x1; x += 10) g.lineBetween(P(x, z0).x, my, P(x, z0).x, my + mh);
      for (let z = Math.ceil(z0 / 10) * 10; z <= z1; z += 10) g.lineBetween(mx, P(x0, z).y, mx + mw, P(x0, z).y);
      if (plan.depot) { const d = P(plan.depot.x, plan.depot.z); g.fillStyle(OTR_DATA.theme.primary, 1); g.fillRect(d.x - 9, d.y - 9, 18, 18); g.lineStyle(2, 0xffffff, 0.9); g.strokeRect(d.x - 9, d.y - 9, 18, 18); }
      (plan.stops || []).forEach(st => {
        if (!Number.isFinite(st.x) || !Number.isFinite(st.z)) return;
        const q = P(st.x, st.z);
        g.fillStyle(st.delivered ? 0x2BC48A : 0xFFB020, 1); g.fillCircle(q.x, q.y, 11);
      });
    });
    (plan.stops || []).forEach(st => {
      if (!Number.isFinite(st.x) || !Number.isFinite(st.z)) return;
      const q = P(st.x, st.z);
      OTR.txt(this, q.x, q.y, String(st.stop), 11, OTR_DATA.theme.css('primaryDeep'), { weight: '900' });
    });
    this.placePins(p => P(p.where.x, p.where.z));
    if (streets) this.nameStreets(streets, P, [x0, x1, z0, z1], pts.map(q => P(q.x, q.z)));
  }

  /**
   * Each street's name along its band on the map (B-31), the names the trainee sees in the town. A name goes where it
   * covers no stop, pin or the depot (near either end first, then the middle), and is left out when nowhere fits.
   */
  nameStreets(streets, P, [x0, x1, z0, z1], taken) {
    const labels = [];
    const clear = (b) => taken.every(q => q.x < b.x - 16 || q.x > b.right + 16 || q.y < b.y - 16 || q.y > b.bottom + 16) &&
      labels.every(o => b.right < o.x - 4 || b.x > o.right + 4 || b.bottom < o.y - 4 || b.y > o.bottom + 4);
    const place = (name, along, at, upright) => {
      const t = OTR.txt(this, 0, 0, name, 12, '#D9D4E6', { weight: '700' }).setOrigin(0.5).setAlpha(0.9);
      if (upright) t.setAngle(-90);
      for (const f of [0.12, 0.88, 0.5, 0.3, 0.7]) {
        const q = at(along[0] + (along[1] - along[0]) * f);
        t.setPosition(q.x, q.y);
        const b = t.getBounds(), e = P(x0, z0), g = P(x1, z1);
        if (b.x >= e.x && b.right <= g.x && b.y >= e.y && b.bottom <= g.y && clear(b)) { labels.push(b); return; }
      }
      t.destroy();
    };
    streets.xs.forEach((x, i) => { if (x > x0 && x < x1 && streets.xNames[i]) place(streets.xNames[i], [z0, z1], (z) => P(x, z), true); });
    streets.zs.forEach((z, i) => { if (z > z0 && z < z1 && streets.zNames[i]) place(streets.zNames[i], [x0, x1], (x) => P(x, z), false); });
  }

  /**
   * The 3D workday's streets from its town seed, in the 3D world's metres (the same projection as OTR.fpRoute.apply:
   * x = (y - first street) * scale, z = 8 - (x - depot) * scale), or null when the record has no town.
   */
  planStreets(plan) {
    if (!plan || !Number.isSafeInteger(plan.townSeed) || !OTR.town || !OTR.town.build) return null;
    const T = OTR.town.build(plan.townSeed), scale = (OTR.fpRoute && OTR.fpRoute.SCALE) || 0.05;
    const S = T.spec || OTR_DATA.town || {};
    return { xs: T.hy.map(y => (y - T.hy[0]) * scale), zs: T.vx.map(x => 8 - (x - T.depot.x) * scale), road: T.road * scale,
      xNames: S.streetsH || [], zNames: S.streetsV || [] };
  }

  placePins(at) {
    this.pinObjs = this.pins.map((p, i) => {
      const q = at(p);
      // mistakes are red (critical) or orange, whatever their category's own colour
      const col = p.critical ? 0xE8304A : OTR_DATA.theme.accent;
      const c = this.add.container(q.x, q.y).setDepth(10);
      const ring = this.add.circle(0, 0, 18, 0xffffff, 0).setStrokeStyle(3, 0xffffff, 1).setVisible(false);
      c.add([ring, this.marker(p.mark, 0, 0, 1, col), OTR.txt(this, 0, 0, String(i + 1), 11, '#ffffff', { weight: '900' })]);
      c.ring = ring;
      c.setSize(26, 26).setInteractive({ useHandCursor: true }).on('pointerup', () => this.select(i));
      return c;
    });
  }

  /**
   * A pin's shape, by its kind of mistake (B-15, B-47): a diamond for a road sign or traffic light, a star for damage to the
   * van, a triangle for a low bridge or clearance, a hexagon for a shifted load, an arrow for a wrong turn (the square is
   * the depot), a circle for anything else. `k` scales it (the legend).
   */
  marker(mark, x, y, k, col) {
    const edge = OTR_DATA.theme.primaryDeep, r = 11 * k;
    let m;
    if (mark === 'sign') m = this.add.rectangle(x, y, r * 1.7, r * 1.7, col).setAngle(45);
    else if (mark === 'damage') m = this.add.star(x, y, 6, r * 0.75, r * 1.35, col);
    else if (mark === 'clearance') m = this.add.triangle(x, y, 0, r * 2.3, r * 1.3, 0, r * 2.6, r * 2.3, col).setOrigin(0.5, 0.62);
    else if (mark === 'route') m = this.add.polygon(x, y, [-1, -0.45, 0.15, -0.45, 0.15, -1, 1, 0, 0.15, 1, 0.15, 0.45, -1, 0.45].map(v => (v + 1) * r * 1.15), col);
    else if (mark === 'load') m = this.add.polygon(x, y, [0, -1, 0.87, -0.5, 0.87, 0.5, 0, 1, -0.87, 0.5, -0.87, -0.5].map(v => (v + 1) * r * 1.3), col);   // points from 0: Phaser centres a polygon on its bounds
    else m = this.add.circle(x, y, r, col);
    return m.setStrokeStyle(2 * Math.max(k, 0.6), edge, 1);
  }

  /**
   * The lines under the map naming each marker on it, from x, y down; returns the objects and the height they take
   * (nothing when every pin is a plain one), so the map can be fitted above them.
   */
  drawMarkLegend(x, y, w) {
    const used = OTR.drive.MARKS.filter(([m]) => this.pins.some(p => p.mark === m)), objs = [], y0 = y;
    if (!used.length) return { objs, h: 0 };
    let cx = x;
    used.forEach(([m, words]) => {
      const t = OTR.txt(this, 0, y, words, 12, OTR_DATA.theme.css('tint'), { ox: 0, bold: false });
      if (cx > x && cx + 22 + t.width > x + w) { cx = x; y += 22; t.y = y; }      // wrap onto a new line (larger text)
      objs.push(this.marker(m, cx + 8, y, 0.62, OTR_DATA.theme.accent), t);
      t.x = cx + 20;
      cx += 20 + t.width + 22;
    });
    return { objs, h: y - y0 + 22 };
  }

  /**
   * The caption, then the marker legend, at the foot of the screen; returns the top of the caption, so the map ends
   * above it whatever the language and text size.
   */
  drawFoot(x, w, caption) {
    const cap = OTR.txt(this, x, 0, caption, 12, OTR_DATA.theme.css('tint'), { ox: 0, oy: 0, bold: false, wrap: w });
    const leg = this.drawMarkLegend(x, 0, w), bottom = OTR.H - 12;
    leg.objs.forEach(o => { o.y += bottom - leg.h + 11; });
    cap.y = bottom - leg.h - (leg.h ? 4 : 0) - cap.height;
    return cap.y;
  }

  drawList() {
    const x = 866, top = 84, w = 390, h = 610;
    this.add.image(x + w / 2, top + h / 2, OTR.tex.panel(this, w, h, { top: 0xFFFFFF, bottom: OTR_DATA.theme.paper, border: OTR_DATA.theme.tint, radius: 16 }));
    OTR.txt(this, x + 20, top + 24, this.pins.length ? `${this.pins.length} MISTAKE${this.pins.length === 1 ? '' : 'S'} ON THE ROAD` : 'NO DRIVING MISTAKES', 14, this.pins.length ? '#C8243B' : '#1E7E55', { ox: 0, weight: '900' });
    if (!this.pins.length) {
      OTR.txt(this, x + 20, top + 60, 'A clean drive: every sign, light and hazard handled.', 15, OTR_DATA.theme.css('inkSoft'), { ox: 0, oy: 0, bold: false, wrap: w - 40 });
      return;
    }
    const perPage = 9;
    this.rows = [];
    this.pins.slice(0, perPage).forEach((p, i) => {
      const y = top + 58 + i * 38;
      const hit = this.add.rectangle(x + w / 2, y, w - 24, 34, OTR_DATA.theme.primary, 0.001).setInteractive({ useHandCursor: true });
      hit.on('pointerup', () => this.select(i));
      this.add.circle(x + 30, y, 10, p.critical ? 0xE8304A : OTR_DATA.theme.accent);
      OTR.txt(this, x + 30, y, String(i + 1), 11, '#ffffff', { weight: '900' });
      const t = OTR.txt(this, x + 50, y, p.label, 14, p.critical ? '#B3122E' : OTR_DATA.theme.css('primaryDark'), { ox: 0, weight: '900' });
      if (t.width > w - 130) t.setScale((w - 130) / t.width);
      OTR.txt(this, x + w - 20, y, OTR.drive.when(p.where), 12, OTR_DATA.theme.css('muted'), { ox: 1 });
      this.rows.push(hit);
    });
    if (this.pins.length > perPage) OTR.txt(this, x + 20, top + 58 + perPage * 38, `+ ${this.pins.length - perPage} more on the map`, 13, OTR_DATA.theme.css('muted'), { ox: 0 });
    // what was picked
    const dy = top + 420;
    OTR.tex.shape(this, (g) => { g.fillStyle(OTR_DATA.theme.primary, 0.07); g.fillRoundedRect(x + 14, dy, w - 28, h - (dy - top) - 14, 12); });
    this.detailHead = OTR.txt(this, x + 30, dy + 16, '', 15, OTR_DATA.theme.css('primaryDark'), { ox: 0, oy: 0, weight: '900', wrap: w - 60 });
    this.detailMeta = OTR.txt(this, x + 30, dy + 40, '', 13, OTR_DATA.theme.css('muted'), { ox: 0, oy: 0, wrap: w - 60 });
    this.detailBody = OTR.txt(this, x + 30, dy + 64, '', 14, OTR_DATA.theme.css('inkSoft'), { ox: 0, oy: 0, bold: false, wrap: w - 60, lineSpacing: 2 });
  }

  select(i) {
    const p = this.pins[i];
    if (!p) return;
    this.pinObjs.forEach((c, j) => { c.ring.setVisible(j === i); c.setScale(j === i ? 1.25 : 1); c.setDepth(j === i ? 20 : 10); });
    this.tweens.killTweensOf(this.pinObjs[i].ring);
    this.pinObjs[i].ring.setScale(1).setAlpha(1);
    this.tweens.add({ targets: this.pinObjs[i].ring, scale: 1.5, alpha: 0.2, duration: 700, yoyo: true, repeat: -1 });
    if (!this.detailHead) return;
    this.detailHead.setText(`${i + 1}. ${OTR.i18n.tr(p.label)}`)              // the label alone is the translated sentence.setColor(p.critical ? '#B3122E' : OTR_DATA.theme.css('primaryDark'));
    const when = OTR.drive.when(p.where);
    this.detailMeta.setText([Number.isFinite(p.where.mph) ? Math.round(p.where.mph) + ' mph' : '', when ? `${when} into the drive` : '', p.critical ? 'CRITICAL' : ''].filter(Boolean).join(' · '));
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
      .map(it => {
        const pin = { label: it.label, cat: it.cat, lesson: it.lesson, critical: !!it.critical, where: it.where }, mark = OTR.drive.mark(it.type);
        if (mark) pin.mark = mark;
        return pin;
      });
  },
  /** The marker a kind of mistake gets on the map (B-15), or null for the plain round pin. */
  mark(type) {
    if (typeof type !== 'string') return null;
    if (/^drive\.sign-/.test(type) || type === 'drive.red-light') return 'sign';   // a traffic light is a road sign on the map (C-32)
    if (/^van\.damage-/.test(type)) return 'damage';
    if (type === 'drive.clearance') return 'clearance';
    if (type === 'load.shift') return 'load';
    if (type === 'drive.route') return 'route';                                     // a wrong turn the sat nav rerouted (C-31)
    return null;
  },
  /** The legend's words for each marker, in the order the legend lists them. */
  MARKS: [['sign', 'road sign or traffic light'], ['damage', 'damage to the van'], ['clearance', 'low bridge or clearance'], ['load', 'load shifted'],
    ['route', 'wrong turn']],
  when(w) {
    if (!w || w.t === undefined) return '';
    const m = Math.floor(w.t / 60), s = w.t % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }
};
