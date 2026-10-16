'use strict';
/*
 * The before-and-after report for a group of trainees: for each trainee who has finished a workday, their first day and
 * their latest day side by side, and for the group, how the averages moved (docs/DATA.md says what is read). Pure: it
 * takes the progress files the server holds and returns plain data; the trainer's screen turns that into the page to
 * print (src/core/pilotreport.js).
 *
 *   beforeAfter([{ id, name, progress }], passMarks) -> { generated, passMarks, trainees: [...], group: {...} }
 */
const CATS = ['safety', 'efficiency', 'service'];

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/** One finished day, reduced to what the report compares. */
function pick(d) {
  const stars = {}; CATS.forEach(c => { stars[c] = num(d.stars && d.stars[c]); });
  const crit = Array.isArray(d.criticals) ? d.criticals.length : num(d.criticals);
  return { at: num(d.at), score: num(d.score), stars, total: CATS.reduce((a, c) => a + stars[c], 0), criticals: crit };
}

/** A trainee's finished workdays, oldest first: from the record of runs, else the saved first and last day. */
function daysOf(p) {
  const out = [];
  const hist = (p && Array.isArray(p.history)) ? p.history.filter(h => h && h.id === 'workday' && h.stars) : [];
  hist.forEach(h => out.push(pick(h)));
  const w = p && p.workday;
  if (w && w.first && w.first.stars && !out.length) out.push(pick(w.first));
  if (w && w.last && w.last.stars && (!out.length || out[out.length - 1].at < num(w.last.at))) out.push(pick(w.last));
  return out.sort((a, b) => a.at - b.at);
}

const passes = (d, marks) => CATS.every(c => d.stars[c] >= num(marks && marks[c]));
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const r2 = (v) => Math.round(v * 100) / 100;

function beforeAfter(list, passMarks) {
  const marks = {}; CATS.forEach(c => { marks[c] = num(passMarks && passMarks[c]) || 2; });
  const trainees = [];
  (list || []).forEach(t => {
    const days = daysOf(t.progress);
    if (!days.length) return;
    // the saved first day wins over the oldest run still in the record (the record keeps only the latest runs)
    const firstSaved = t.progress && t.progress.workday && t.progress.workday.first && t.progress.workday.first.stars ? pick(t.progress.workday.first) : null;
    const first = firstSaved && firstSaved.at <= days[0].at ? firstSaved : days[0];
    const latest = days[days.length - 1];
    const n = Math.max(days.length, firstSaved && firstSaved.at < days[0].at ? days.length + 1 : days.length);
    trainees.push({
      id: String(t.id), name: t.name || String(t.id), days: n, first, latest,
      change: n > 1 ? latest.total - first.total : null,
      firstPassed: passes(first, marks), latestPassed: passes(latest, marks)
    });
  });
  trainees.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));

  const multi = trainees.filter(t => t.days > 1);
  const avg = (sel, key) => r2(mean(multi.map(t => sel(t)[key])));
  const group = {
    trainees: trainees.length, withChange: multi.length, oneDayOnly: trainees.length - multi.length,
    first: null, latest: null, improved: 0, same: 0, worse: 0
  };
  if (multi.length) {
    const side = (sel) => {
      const o = { score: avg(sel, 'score'), criticals: avg(sel, 'criticals'), stars: {}, passedPercent: Math.round(multi.filter(t => passes(sel(t), marks)).length / multi.length * 100) };
      CATS.forEach(c => { o.stars[c] = r2(mean(multi.map(t => sel(t).stars[c]))); });
      return o;
    };
    group.first = side(t => t.first); group.latest = side(t => t.latest);
    multi.forEach(t => { if (t.change > 0) group.improved++; else if (t.change < 0) group.worse++; else group.same++; });
  }
  return { generated: new Date().toISOString(), passMarks: marks, trainees, group };
}

module.exports = { beforeAfter, daysOf, CATS };
