/*
 * The before-and-after report for a group of trainees: each trainee's first finished workday next to their latest, and how
 * the group moved, as a page to print or save as PDF (a company shows it to say the pilot worked). The numbers come from
 * the training server (GET api/report/before-after, server/report.js); this turns them into the document, in the
 * trainer's language, with the company's colours.
 *
 *   OTR.pilotReport.html(data)     the document for what the server returned
 *   OTR.pilotReport.print(data)    through the browser's print dialog
 *   OTR.pilotReport.csv(data)      the same numbers as a spreadsheet (download(data) saves it)
 */
window.OTR = window.OTR || {};

OTR.pilotReport = {
  html(data) {
    const R = OTR.record, E = R.esc, T = R.T, F = R.F, cfg = OTR_DATA.config, th = OTR_DATA.theme;
    const cats = ['safety', 'efficiency', 'service'], lab = (c) => cfg.categories[c].label;
    const g = data.group || {}, rows = data.trainees || [];
    const sign = (v) => (v > 0 ? '+' : '') + (Math.round(v * 100) / 100);
    const stars = (o) => cats.map(c => '★'.repeat(o.stars[c] || 0) + '☆'.repeat(3 - (o.stars[c] || 0))).join(' ');
    const cls = (v, lowerIsBetter) => (v === 0 ? '' : (lowerIsBetter ? v < 0 : v > 0) ? 'up' : 'down');
    const line = (name, a, b, lowerIsBetter, unit) => {
      const d = Math.round((b - a) * 100) / 100;
      return `<tr><td>${name}</td><td>${E(a)}${unit || ''}</td><td>${E(b)}${unit || ''}</td><td class="${cls(d, lowerIsBetter)}">${sign(d)}${unit || ''}</td></tr>`;
    };
    // road habits (B-54): mistakes per day, for the trainees whose first and latest days both had traffic
    const roadNames = { 'red-light': T('Red lights driven through'), route: T('Wrong turns'), giveway: T('Did not give way'), cyclist: T('Turned across a cyclist') };
    const road = g.road ? `<h2>${T('Road habits: mistakes per day')}</h2><table class="grp"><thead><tr><th></th><th>${T('First workday')}</th><th>${T('Latest workday')}</th><th>${T('Change')}</th></tr></thead><tbody>
        ${g.road.kinds.map((k, i) => line(roadNames[k] || E(k), g.road.first[i], g.road.latest[i], true)).join('')}
      </tbody></table><p class="note">${F('From the {0} trainees whose first and latest workdays both had traffic.', g.road.trainees)}</p>` : '';
    const groupTable = g.first && g.latest ? `<table class="grp"><thead><tr><th></th><th>${T('First workday')}</th><th>${T('Latest workday')}</th><th>${T('Change')}</th></tr></thead><tbody>
        ${line(T('Score'), g.first.score, g.latest.score)}
        ${cats.map(c => line(`${E(lab(c))} ★`, g.first.stars[c], g.latest.stars[c])).join('')}
        ${line(T('Critical errors per day'), g.first.criticals, g.latest.criticals, true)}
        ${line(T('Met every pass mark'), g.first.passedPercent, g.latest.passedPercent, false, '%')}
      </tbody></table>${road}` : `<p>${T('No trainee has finished two workdays yet, so there is nothing to compare.')}</p>`;
    const list = rows.length ? `<table class="who"><thead><tr><th>${T('Trainee')}</th><th>${T('Workdays')}</th><th>${T('First workday')}</th><th>${T('Latest workday')}</th><th>${T('Change')}</th></tr></thead><tbody>
        ${rows.map(t => `<tr><td>${E(t.name)}<span class="id"> ${E(t.id)}</span></td><td>${t.days}</td>
          <td class="stars">${E(stars(t.first))}</td><td class="stars">${E(stars(t.latest))}</td>
          <td class="${t.change === null ? '' : cls(t.change)}">${t.change === null ? T('One workday so far') : F('{0} stars', sign(t.change))}</td></tr>`).join('')}
      </tbody></table>` : `<p>${T('Nobody has finished a workday yet.')}</p>`;
    return `<!DOCTYPE html><html lang="${E(OTR.i18n ? OTR.i18n.lang : 'en')}"><head><meta charset="utf-8"><title>${T('Before and after: the training pilot')}</title><style>
      @page { size: A4; margin: 14mm; }
      body { font: 11pt/1.4 "Segoe UI", "Nirmala UI", "Noto Sans", Arial, sans-serif; color: #121f2e; margin: 0; }
      header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid ${th.css('accent')}; padding-bottom: 8px; margin-bottom: 14px; }
      h1 { font-size: 20pt; margin: 0; color: ${th.css('primary')}; } h2 { font-size: 13pt; color: ${th.css('primary')}; margin: 18px 0 6px; }
      .brand { font-weight: 900; color: ${th.css('primary')}; } .brand b { color: ${th.css('accent')}; } .meta { text-align: right; font-size: 10pt; color: #555; }
      .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 6px; }
      .summary div { border: 1px solid #cedbe9; border-radius: 6px; padding: 6px 8px; } .summary b { display: block; font-size: 15pt; color: ${th.css('primary')}; }
      table { width: 100%; border-collapse: collapse; font-size: 10pt; } td, th { padding: 4px 6px; border-bottom: 1px solid #eee; text-align: left; }
      thead th { font-size: 9pt; color: #555; border-bottom: 1px solid #aab; } .stars { letter-spacing: 1px; color: #C98A00; white-space: nowrap; }
      .id { color: #888; font-size: 9pt; } .up { color: #1E7E55; font-weight: 700; } .down { color: #B3122E; font-weight: 700; }
      footer { margin-top: 18px; font-size: 8pt; color: #666; } .note { font-size: 9pt; color: #555; margin: 4px 0 0; }
    </style></head><body>
      <header><div><div class="brand">${cfg.brand ? E(cfg.brand) + ' ' : ''}<b>${E(cfg.title)}</b></div><h1>${T('Before and after: the training pilot')}</h1></div>
        <div class="meta">${F('Printed {0}', E(R.date(Date.now())))}</div></header>
      <div class="summary">
        <div><b>${g.trainees || 0}</b>${T('trainees who finished a workday')}</div>
        <div><b>${g.withChange || 0}</b>${T('with two or more workdays')}</div>
        <div><b>${g.improved || 0}</b>${T('improved')}</div>
        <div><b>${(g.same || 0) + (g.worse || 0)}</b>${T('unchanged or lower')}</div>
      </div>
      <h2>${T('The group, first workday to latest')}</h2>${groupTable}
      <h2>${T('Each trainee')}</h2>${list}
      <footer>${T('Each trainee\'s first and latest finished workday. Stars are 0 to 3 in safety, efficiency and service. The group figures use trainees with two or more workdays. A pass mark is met when every category reaches the stars the trainer set.')}</footer>
    </body></html>`;
  },
  print(data) { OTR.record.printHtml(OTR.pilotReport.html(data)); },

  /**
   * The same numbers as a spreadsheet (B-65): one row per trainee, columns named in English so a company's sheets keep
   * working whatever language the trainer uses (docs/DATA.md lists them). The road columns are empty for a day without
   * traffic. A cell that a spreadsheet would read as a formula (=, +, -, @) starts with an apostrophe, so it stays text.
   */
  CSV_COLUMNS: ['employee_id', 'name', 'workdays',
    ...['first', 'latest'].flatMap(s => [`${s}_date`, `${s}_score`, `${s}_safety_stars`, `${s}_efficiency_stars`, `${s}_service_stars`, `${s}_critical_errors`,
      `${s}_met_pass_marks`, `${s}_red_lights`, `${s}_wrong_turns`, `${s}_did_not_give_way`, `${s}_cyclist`]), 'change_in_stars'],
  csv(data) {
    const cell = (v) => {
      let s = v === null || v === undefined ? '' : String(v);
      if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
      return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const day = (d) => (d && d.at ? new Date(d.at).toISOString().slice(0, 10) : '');
    const side = (d, passed) => [day(d), d.score, d.stars.safety, d.stars.efficiency, d.stars.service, d.criticals, passed ? 'yes' : 'no',
      ...(Array.isArray(d.road) ? d.road : [null, null, null, null])];
    const rows = (data.trainees || []).map(t => [t.id, t.name, t.days, ...side(t.first, t.firstPassed), ...side(t.latest, t.latestPassed), t.change === null ? '' : t.change]);
    return '\uFEFF' + [this.CSV_COLUMNS, ...rows].map(r => r.map(cell).join(',')).join('\r\n') + '\r\n';
  },
  /** Hand the spreadsheet to the browser as a file to save. */
  download(data) {
    const url = URL.createObjectURL(new Blob([OTR.pilotReport.csv(data)], { type: 'text/csv' }));
    const a = document.createElement('a'); a.href = url; a.download = `before-and-after-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
};
