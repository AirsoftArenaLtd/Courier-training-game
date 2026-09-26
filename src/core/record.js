/*
 * The trainee record: what a supervisor signs off on. Built from a save (this trainee's, or one a trainer loads from
 * the training server) so the same code serves the in-game Record screen, the printed record and the certificate.
 *
 *   const R = OTR.record.build(progress)   modules → scenarios with practice and assessment standing, totals, lessons
 *   OTR.record.print(R, name, id)          the record as a document, through the browser's print dialog (or "Save as PDF")
 *   OTR.record.certificate(R, name, id)    the certificate, once every assessment is passed
 */
window.OTR = window.OTR || {};

OTR.record = {
  build(p) {
    p = p || {};
    const scen = p.scenarios || {}, assess = p.assess || {}, hist = p.history || [];
    const cats = OTR.scoring.CATS;
    const catTot = {}; cats.forEach(c => { catTot[c] = { got: 0, max: 0 }; });
    const quiz = p.quiz || {};
    const modules = OTR.registry.modules().map(m => ({
      id: m.id, title: m.title, color: m.color, quiz: quiz[m.id] || null,
      scenarios: m.scenarios.map(sc => {
        const r = scen[sc.id] || null, a = assess[sc.id] || null;
        const runs = hist.filter(h => h.id === sc.id);
        sc.categories.forEach(c => { catTot[c].max += 3; catTot[c].got += (r && r.bestStars && r.bestStars[c]) || 0; });
        return {
          id: sc.id, title: sc.title, cats: sc.categories,
          plays: r ? r.plays : 0, best: r ? r.bestStars : null, lastPlayed: r ? r.lastPlayed : null,
          assess: a ? { passed: !!a.passed, attempts: a.attempts || 0, at: a.at || null, abandoned: !!a.abandoned, stars: a.stars || null, criticals: a.criticals || [] } : null,
          runs: runs.length
        };
      })
    }));
    const all = [].concat(...modules.map(m => m.scenarios));
    // the lessons that keep coming back, over every scored run
    const counts = {};
    hist.forEach(h => (h.lessons || []).forEach(t => { counts[t] = (counts[t] || 0) + 1; }));
    const lessons = Object.keys(counts).map(t => ({ text: t, n: counts[t] })).sort((a, b) => b.n - a.n).slice(0, 12);
    const criticals = [];
    hist.forEach(h => (h.criticals || []).forEach(c => criticals.push({ text: c, id: h.id, at: h.at })));
    const seconds = hist.reduce((n, h) => n + (h.dur || 0), 0) + ((p.route && p.route.seconds) || 0);
    const ratio = {}; cats.forEach(c => { ratio[c] = catTot[c].max ? catTot[c].got / catTot[c].max : 0; });
    const played = cats.filter(c => catTot[c].got > 0);
    const weakest = played.length ? played.slice().sort((a, b) => ratio[a] - ratio[b])[0] : null;
    return {
      modules, all,
      total: all.length,
      passed: all.filter(s => s.assess && s.assess.passed).length,
      quizzesPassed: modules.filter(m => m.quiz && m.quiz.passedAt).length,
      assessed: all.filter(s => s.assess && s.assess.attempts).length,
      practised: all.filter(s => s.plays > 0).length,
      runs: hist.length,
      routeDays: (p.route && p.route.days) || 0,
      routeBest: (p.route && p.route.best) || null,
      seconds, ratio, weakest, lessons,
      criticals: criticals.slice(-10).reverse(),
      recent: hist.slice(-20).reverse(),
      firstAt: (p.profile && p.profile.createdAt) || (hist[0] && hist[0].at) || null,
      lastAt: p.savedAt || null
    };
  },

  date(t) { return t ? new Date(t).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—'; },
  duration(s) {
    if (!s) return 'under a minute';
    const h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60);
    return h ? `${h} h ${m} min` : `${m} min`;
  },
  stars(best, cats) { return best ? cats.map(c => '★'.repeat(best[c] || 0) + '☆'.repeat(3 - (best[c] || 0))).join(' ') : '—'; },
  esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch])); },

  quizText(q) {
    if (!q) return 'Quiz: not taken';
    return `Quiz: best ${q.best}%${q.passedAt ? ', passed ' + OTR.record.date(q.passedAt) : ''}`;
  },

  assessText(a) {
    if (!a || !a.attempts) return 'Not taken';
    if (a.passed) return `Passed ${OTR.record.date(a.at)}`;
    return `Not passed (${a.attempts} attempt${a.attempts === 1 ? '' : 's'}${a.abandoned ? ', left part-way' : ''})`;
  },

  html(R, name, id) {
    const E = OTR.record.esc, cfg = OTR_DATA.config, lab = (c) => cfg.categories[c].label;
    const rows = R.modules.map(m => `
      <tr class="mod"><th colspan="3">${E(m.title)}</th><th colspan="2" class="q">${E(OTR.record.quizText(m.quiz))}</th></tr>
      ${m.scenarios.map(s => `<tr>
        <td>${E(s.title)}</td>
        <td class="${s.assess && s.assess.passed ? 'pass' : s.assess && s.assess.attempts ? 'fail' : 'none'}">${E(OTR.record.assessText(s.assess))}</td>
        <td class="stars">${E(OTR.record.stars(s.best, OTR.scoring.ordered(s.cats)))}</td>
        <td>${s.plays}</td>
        <td>${E(OTR.record.date(s.lastPlayed))}</td>
      </tr>`).join('')}`).join('');
    const lessons = R.lessons.length ? `<ol>${R.lessons.map(l => `<li>${E(l.text)}${l.n > 1 ? ` <span class="n">(${l.n}×)</span>` : ''}</li>`).join('')}</ol>` : '<p>No recurring mistakes recorded.</p>';
    const crit = R.criticals.length ? `<ul class="crit">${R.criticals.map(c => `<li>${E(OTR.record.date(c.at))} · ${E((OTR.registry.get(c.id) || {}).title || c.id)}: ${E(c.text)}</li>`).join('')}</ul>` : '<p>None.</p>';
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Training record: ${E(name)}</title><style>
      @page { size: A4; margin: 14mm; }
      body { font: 11pt/1.4 "Segoe UI", Arial, sans-serif; color: #1b1030; margin: 0; }
      header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid #FF6600; padding-bottom: 8px; margin-bottom: 14px; }
      h1 { font-size: 20pt; margin: 0; color: #4D148C; } h2 { font-size: 13pt; color: #4D148C; margin: 18px 0 6px; }
      .brand { font-weight: 900; color: #4D148C; } .brand b { color: #FF6600; }
      .meta { text-align: right; font-size: 10pt; color: #555; }
      .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 6px; }
      .summary div { border: 1px solid #d8cdea; border-radius: 6px; padding: 6px 8px; } .summary b { display: block; font-size: 15pt; color: #4D148C; }
      table { width: 100%; border-collapse: collapse; font-size: 10pt; } td, th { padding: 3px 6px; border-bottom: 1px solid #eee; text-align: left; }
      tr.mod th { background: #f1eafb; color: #4D148C; padding-top: 6px; } tr.mod th.q { font-weight: 400; font-size: 9pt; text-align: right; } thead th { font-size: 9pt; color: #666; }
      .pass { color: #1E7E55; font-weight: 700; } .fail { color: #B3122E; font-weight: 700; } .none { color: #888; }
      .stars { letter-spacing: 1px; color: #C98A00; white-space: nowrap; } .n { color: #888; } .crit li { color: #B3122E; }
      .sign { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 30px; } .sign div { border-top: 1px solid #333; padding-top: 4px; font-size: 9pt; color: #555; }
      footer { margin-top: 18px; font-size: 8pt; color: #888; }
    </style></head><body>
      <header><div><div class="brand">${E(cfg.brand)} <b>${E(cfg.title)}</b></div><h1>Training record: ${E(name)}</h1></div>
        <div class="meta">${id ? `ID ${E(id)}<br>` : ''}Printed ${E(OTR.record.date(Date.now()))}<br>Training since ${E(OTR.record.date(R.firstAt))}</div></header>
      <div class="summary">
        <div>Assessments passed<b>${R.passed} / ${R.total}</b></div>
        <div>Scenarios practised<b>${R.practised} / ${R.total}</b></div>
        <div>Route days<b>${R.routeDays}</b></div>
        <div>Time training<b>${E(OTR.record.duration(R.seconds))}</b></div>
      </div>
      <p>Strongest to weakest (best stars earned): ${OTR.scoring.CATS.slice().sort((a, b) => R.ratio[b] - R.ratio[a]).map(c => `${E(lab(c))} ${Math.round(R.ratio[c] * 100)}%`).join(' · ')}</p>
      <h2>Modules</h2>
      <table><thead><tr><th>Scenario</th><th>Assessment</th><th>Best practice stars</th><th>Runs</th><th>Last played</th></tr></thead><tbody>${rows}</tbody></table>
      <h2>What to work on</h2>${lessons}
      <h2>Critical mistakes</h2>${crit}
      <div class="sign"><div>Trainee signature and date</div><div>Trainer signature and date</div></div>
      <footer>${E(cfg.disclaimer || '')}</footer>
    </body></html>`;
  },

  certificateHtml(R, name, id) {
    const E = OTR.record.esc, cfg = OTR_DATA.config;
    const last = Math.max(...R.all.map(s => (s.assess && s.assess.at) || 0));
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Certificate: ${E(name)}</title><style>
      @page { size: A4 landscape; margin: 0; }
      body { margin: 0; font-family: Georgia, "Times New Roman", serif; color: #1b1030; }
      .page { box-sizing: border-box; width: 297mm; height: 210mm; padding: 18mm; }
      .frame { box-sizing: border-box; height: 100%; border: 6px solid #4D148C; outline: 2px solid #FF6600; outline-offset: -14px; text-align: center; padding: 22mm 20mm; }
      .brand { font: 900 20pt "Segoe UI", Arial, sans-serif; color: #4D148C; } .brand b { color: #FF6600; }
      h1 { font-size: 34pt; margin: 14mm 0 4mm; letter-spacing: 1px; } .name { font-size: 30pt; color: #4D148C; border-bottom: 1px solid #999; display: inline-block; padding: 0 20mm 2mm; margin: 6mm 0; }
      p { font-size: 14pt; margin: 3mm 0; } .small { font-size: 10pt; color: #666; }
      .sign { display: flex; justify-content: space-around; margin-top: 18mm; } .sign div { width: 70mm; border-top: 1px solid #333; padding-top: 2mm; font-size: 10pt; color: #555; }
    </style></head><body><div class="page"><div class="frame">
      <div class="brand">${E(cfg.brand)} <b>${E(cfg.title)}</b></div>
      <h1>Certificate of Completion</h1>
      <p>This certifies that</p>
      <div class="name">${E(name)}</div>
      <p>passed the assessment in every scenario of the courier training academy (${R.total} of ${R.total}),</p>
      <p>covering route and driving safety, package handling, customer service, problem solving, scanning, loading, pickups and personal safety.</p>
      <p class="small">Completed ${E(OTR.record.date(last))}${id ? ` · Trainee ID ${E(id)}` : ''}</p>
      <div class="sign"><div>Trainer</div><div>Date</div></div>
    </div></div></body></html>`;
  },

  /** Print a document without leaving the game: a hidden frame holds it while the print dialog is up. */
  printHtml(html) {
    const old = document.getElementById('otr-print');
    if (old) old.remove();
    const f = document.createElement('iframe');
    f.id = 'otr-print';
    f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
    document.body.appendChild(f);
    const d = f.contentWindow.document;
    d.open(); d.write(html); d.close();
    setTimeout(() => { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) { /* the browser refused */ } }, 250);
  },

  print(R, name, id) { OTR.record.printHtml(OTR.record.html(R, name, id)); },
  certificate(R, name, id) { OTR.record.printHtml(OTR.record.certificateHtml(R, name, id)); }
};
