/*
 * ScoreLog: an itemised record of checks for a scenario, stop or whole shift.
 *   log.check('safety', 2, 2, 'Used three points of contact', { lesson })   // got, max
 *   log.penalty('safety', 3, 'Slipped on ice while carrying', { lesson })   // reduces earned only
 *   log.ratio('safety') -> 0..1
 * Items keep their group (e.g. the stop id) so reports can be split per stop.
 * { critical: true } marks a mistake that must never be averaged away (releasing an adult-signature package to a
 * minor, a late First Overnight): it caps its category at one star and heads the takeaways (see OTR.flow.complete).
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
    const it = { cat, got, max, label, good: got >= max, partial: got > 0 && got < max, lesson: o.lesson || null, feedback: o.feedback || null, group: o.group || this.group, kind: 'check', critical: !!o.critical && got < max, at: Date.now() };
    this.items.push(it);
    return it;
  }

  penalty(cat, pts, label, o) {
    o = o || {};
    const it = { cat, got: -Math.abs(pts), max: 0, label, good: false, lesson: o.lesson || null, feedback: o.feedback || null, group: o.group || this.group, kind: 'penalty', severity: o.severity || 'minor', critical: !!o.critical, at: Date.now() };
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

  /** Items of a group (undefined: every group), limited to some categories if cats is given. */
  scoped(group, cats) {
    return this.items.filter(it => (group === undefined || it.group === group) && (!cats || cats.indexOf(it.cat) >= 0));
  }

  /** Did this run test the category at all? One nothing tested earns no stars (ratio() alone would say 1). */
  tested(cat, group) {
    return this.scoped(group, [cat]).some(it => it.kind === 'check' || it.kind === 'penalty');
  }

  criticals(group, cats) { return this.scoped(group, cats).filter(it => it.critical); }

  /** Every check short of full marks and every penalty. */
  mistakes(group, cats) {
    return this.scoped(group, cats).filter(it => (it.kind === 'check' && it.got < it.max) || it.kind === 'penalty');
  }

  /**
   * What to tell the trainee: one entry per distinct lesson, { text, critical, lost, n }, critical mistakes first,
   * then by the points they cost, then in the order they happened. n counts repeats ("× 6").
   */
  takeaways(group, cats) {
    const out = [];
    this.mistakes(group, cats).forEach(it => {
      const text = it.lesson || (it.critical ? it.label : null);
      if (!text) return;
      let t = out.find(o => o.text === text);
      if (!t) { t = { text, critical: false, lost: 0, n: 0, order: out.length }; out.push(t); }
      t.n++;
      t.lost += it.kind === 'penalty' ? -it.got : it.max - it.got;
      t.critical = t.critical || !!it.critical;
    });
    return out.sort((a, b) => (b.critical - a.critical) || (b.lost - a.lost) || (a.order - b.order));
  }

  /** The takeaways' texts, most important first. */
  lessons(limit, group) {
    const out = this.takeaways(group).map(t => t.text);
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
