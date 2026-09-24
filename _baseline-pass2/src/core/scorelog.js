/*
 * ScoreLog: an itemised record of checks for a scenario, stop or whole shift.
 *   log.check('safety', 2, 2, 'Used three points of contact', { lesson })   // got, max
 *   log.penalty('safety', 3, 'Slipped on ice while carrying', { lesson })   // reduces earned only
 *   log.ratio('safety') -> 0..1
 * Items keep their group (e.g. the stop id) so reports can be split per stop.
 */
window.OTR = window.OTR || {};

OTR.ScoreLog = class {
  constructor(group) {
    this.items = [];
    this.group = group || null;
  }

  setGroup(g) { this.group = g; return this; }

  check(cat, got, max, label, o) {
    o = o || {};
    const it = { cat, got, max, label, good: got >= max, partial: got > 0 && got < max, lesson: o.lesson || null, feedback: o.feedback || null, group: o.group || this.group, kind: 'check', at: Date.now() };
    this.items.push(it);
    return it;
  }

  penalty(cat, pts, label, o) {
    o = o || {};
    const it = { cat, got: -Math.abs(pts), max: 0, label, good: false, lesson: o.lesson || null, feedback: o.feedback || null, group: o.group || this.group, kind: 'penalty', severity: o.severity || 'minor', at: Date.now() };
    this.items.push(it);
    return it;
  }

  bonus(cat, pts, label, o) {
    o = o || {};
    const it = { cat, got: pts, max: 0, label, good: true, group: o.group || this.group, kind: 'bonus', at: Date.now() };
    this.items.push(it);
    return it;
  }

  filter(fn) { return this.items.filter(fn); }

  totals(cat, group) {
    let got = 0, max = 0;
    this.items.forEach(it => {
      if (cat && it.cat !== cat) return;
      if (group !== undefined && it.group !== group) return;
      got += it.got; max += it.max;
    });
    return { got, max };
  }

  ratio(cat, group) {
    const t = this.totals(cat, group);
    if (t.max <= 0) return t.got < 0 ? 0 : 1;
    return OTR.util.clamp01(t.got / t.max);
  }

  ratios(cats, group) {
    const r = {};
    cats.forEach(c => { r[c] = this.ratio(c, group); });
    return r;
  }

  lessons(limit, group) {
    const out = [];
    this.items.forEach(it => {
      if (group !== undefined && it.group !== group) return;
      if (!it.good && it.lesson && out.indexOf(it.lesson) < 0) out.push(it.lesson);
    });
    return limit ? out.slice(0, limit) : out;
  }

  score(group) {
    let s = 0;
    this.items.forEach(it => { if (group === undefined || it.group === group) s += it.got * 100; });
    return Math.max(0, Math.round(s));
  }

  toJSON() { return { items: this.items }; }
  /** A new log starting from a saved one. It copies the list, so a restarted attempt never writes into the saved day. */
  static from(obj) { const l = new OTR.ScoreLog(); l.items = ((obj && obj.items) || []).slice(); return l; }
};
