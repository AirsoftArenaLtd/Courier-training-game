#!/usr/bin/env node
/*
 * B-56: the printed pages with milestone 8 mistakes on them, in each language: the trainee's record (Print / PDF), the
 * certificate and the trainer's before-and-after report. Each is rendered as the print dialog would (A4, print media)
 * and saved as a PDF to test/out/print-<lang>-<page>.pdf; nothing may run past its cell or the page, the milestone 8
 * lines must be there in the trainee's language, and the font stack must name a font for the Indian scripts.
 *
 *   QA_BROWSER=/path/to/chrome node test/printbrowser.js          (QA_LANGS=en,ta by default)
 */
'use strict';
const fs = require('fs');
const path = require('path');
const pp = require('puppeteer-core');
const R = require('../server/report.js');
const BROWSER = process.env.QA_BROWSER || '/opt/pw-browsers/chromium';
const LANGS = (process.env.QA_LANGS || 'en,ta').split(',').map(s => s.trim()).filter(Boolean);
const OUT = path.join(__dirname, 'out');
fs.mkdirSync(OUT, { recursive: true });
const wait = (ms) => new Promise(r => setTimeout(r, ms));
let checks = 0;
const fails = [];
const check = (ok, what) => { checks++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) fails.push(what); };

// a group for the before-and-after report: first days before traffic for some, road habits for others
const run = (at, s, road, crit) => ({ id: 'workday', kind: 'workday', at, score: 300 * s, stars: { safety: s, efficiency: s, service: s }, criticals: crit || [], road });
const GROUP = R.beforeAfter(Array.from({ length: 12 }, (_, i) => ({ id: 'e10' + i, name: ['Alexandria Montgomery-Whitfield', 'Pat Okafor', 'Sam Rivera'][i % 3] + ' ' + i,
  progress: { history: [run(1000, 1, [2, 1, 1, i % 2], ['Drove through a red traffic light']), run(2000, 2 + (i % 2), [0, 1, 0, 0])] } })), { safety: 2, efficiency: 2, service: 2 });

(async () => {
  const b = await pp.launch({ executablePath: BROWSER, headless: 'new', args: ['--no-sandbox', '--allow-file-access-from-files'] });
  try {
    for (const lang of LANGS) {
      const p = await b.newPage();
      const errors = [];
      p.on('pageerror', e => errors.push(e.message));
      await p.goto('file://' + path.resolve(__dirname, '..', 'index.html') + `?user=print&name=Alexandria%20Montgomery-Whitfield&lang=${lang}&dev=1`);
      const t0 = Date.now(); while (Date.now() - t0 < 20000 && !(await p.evaluate(() => !!(window.OTR && OTR.game && OTR.save && OTR.save.data && OTR.record)).catch(() => false))) await wait(150);
      // a trainee who has played two workdays with milestone 8 mistakes, and passed every assessment (for the certificate)
      const pages = await p.evaluate((group) => {
        const W = OTR.workday, at = (i) => ({ x: i, z: -i, mph: 18, t: 30 * i });
        for (const bad of [true, false]) {
          W.start(null);
          W.report('drive.red-light', { key: 'signal:1:2:n', ok: !bad, where: at(1) });
          W.report('drive.route', { key: 'leg1', ok: !bad, where: at(2) });
          W.report('drive.cyclist', { key: 'cyclist:0', ok: !bad, where: at(3) });
          if (bad) { W.report('drive.pedestrian', { key: 'school-crossing', where: at(4) }); W.report('drive.sign-noentry', { key: 'noentry:edge', where: at(5) }); }
          W.keep(W.finish(null, { stops: [{ stop: 1, delivered: true }] }));
        }
        const S = OTR.save.data;
        OTR.registry.all().forEach(m => (m.scenarios || []).forEach(sc => { S.assess[sc.id] = { attempts: 1, passed: true, at: Date.now(), stars: { safety: 3, efficiency: 3, service: 3 }, score: 900, criticals: [], lessons: [], pending: false }; }));
        const Rec = OTR.record.build(S);
        return { record: OTR.record.html(Rec, 'Alexandria Montgomery-Whitfield', 'e1042'), certificate: OTR.record.certificateHtml(Rec, 'Alexandria Montgomery-Whitfield', 'e1042'),
          report: OTR.pilotReport.html(group), want: [OTR_DATA.workdayEvents['drive.red-light'].fail, OTR_DATA.workdayEvents['drive.pedestrian'].label, 'Red lights driven through'].map(s => [s, OTR.i18n.t(s)]) };
      }, JSON.parse(JSON.stringify(GROUP)));
      check(!errors.length, `${lang}: the record and the report build with no page errors ${errors.slice(0, 2).join(' | ')}`);
      for (const name of ['record', 'certificate', 'report']) {
        const doc = await b.newPage();
        await doc.setContent(pages[name], { waitUntil: 'load' });
        await doc.emulateMediaType('print');
        // A4's printable width in CSS pixels: portrait at 14 mm margins; the certificate is landscape with no margin
        const land = name === 'certificate';
        await doc.setViewport(land ? { width: 1123, height: 794 } : { width: 718, height: 1000 });
        const r = await doc.evaluate(() => ({
          over: [...document.querySelectorAll('td,th,li,p,h1,h2,div')].filter(e => e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflow !== 'visible' || e.getBoundingClientRect().right > document.documentElement.clientWidth + 1).map(e => e.tagName + ': ' + e.textContent.trim().slice(0, 40)),
          wide: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
          font: getComputedStyle(document.body).fontFamily, text: document.body.innerText
        }));
        await doc.pdf({ path: path.join(OUT, `print-${lang}-${name}.pdf`), format: 'A4', landscape: land, printBackground: true });
        check(!r.wide && !r.over.length, `${lang} ${name}: nothing runs past the page or its cell ${r.over.slice(0, 3).join(' | ')}`);
        check(/Nirmala UI/.test(r.font), `${lang} ${name}: the font stack names a font for the Indian scripts`);
        if (name === 'record') pages.want.slice(0, 2).forEach(([en, tr]) => check(r.text.includes(tr) && (lang === 'en' || tr !== en), `${lang} record: "${en}" is on it${lang === 'en' ? '' : ', translated'}`));
        if (name === 'report') { const [en, tr] = pages.want[2]; check(r.text.includes(tr) && (lang === 'en' || tr !== en), `${lang} report: the road habits table, in the trainee's language`); }
        await doc.close();
      }
      await p.close();
    }
  } finally { await b.close(); }
  console.log(fails.length ? `\n${fails.length} of ${checks} print checks failed` : `\n${checks} print checks passed`);
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
