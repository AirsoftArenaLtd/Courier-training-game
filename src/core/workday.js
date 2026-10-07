/*
 * The 3D workday's report to the rest of the game.
 *
 * The 3D world (depot, van, street, doorstep) says what the trainee did, as an event type listed in
 * data/workday_events.js. This turns each report into a score-log line, so the results screen, the debrief, the
 * trainee's record, trainer reports and translations work as they do for every other scenario. The 3D world never
 * awards points or writes feedback text itself: the catalogue does, and a trainer-facing change to scoring is a change
 * to that one data file.
 *
 *   OTR.workday.begin(log)          send reports to this ScoreLog (a new one if none is given); returns it
 *   OTR.workday.report(type, d)     d: { key, ok, stop, where }
 *     key     what this report is about (a parcel id, a leg number): a type is counted once per key
 *     ok      for a check: false when the trainee got it wrong (left out: right)
 *     stop    the stop number it belongs to, for per-stop reports (left out: the event's phase)
 *     where   { x, z, mph } where it happened, for the drive review
 *   OTR.workday.events              every accepted report, in order (for tests and the debrief)
 *
 * The contract is written up in docs/WORKDAY-EVENTS.md.
 */
window.OTR = window.OTR || {};

OTR.workday = {
  log: null,
  events: [],
  seen: new Set(),

  begin(log) {
    this.log = log || new OTR.ScoreLog();
    this.events = [];
    this.seen = new Set();
    return this.log;
  },

  report(type, d) {
    d = d || {};
    const E = window.OTR_DATA && OTR_DATA.workdayEvents && OTR_DATA.workdayEvents[type];
    if (!E) { console.warn('[OTR] unknown workday event: ' + type); return null; }
    const key = type + '|' + (d.key === undefined ? '' : d.key);
    if (this.seen.has(key)) return null;
    this.seen.add(key);
    if (!this.log) this.begin();
    const ok = d.ok !== false;
    this.events.push({ type, key: d.key === undefined ? null : d.key, ok, stop: d.stop === undefined ? null : d.stop });
    const o = {
      lesson: E.lesson || null,
      critical: !!E.critical,
      where: d.where || null,
      group: d.stop === undefined ? E.phase : 'stop' + d.stop
    };
    if (E.kind === 'penalty') return this.log.penalty(E.cat, E.pts, E.label, Object.assign(o, { severity: E.severity || 'minor' }));
    if (E.kind === 'bonus') return this.log.bonus(E.cat, E.pts, E.label, o);
    return this.log.check(E.cat, ok ? E.max : 0, E.max, ok ? E.label : (E.fail || E.label), o);
  }
};
