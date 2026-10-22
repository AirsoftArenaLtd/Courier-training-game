#!/usr/bin/env node
/*
 * B-176: the trainer's quick start says "one page". This prints each docs/QUICK-START*.md to A4 in headless Chromium
 * (12 mm margins, 9 pt text) and counts the pages, writing the sheet a trainer prints to docs/print/. Exits 1 when any
 * language takes more than one page.
 *   node test/tools/onepage.js            (QA_BROWSER=/path/to/chrome to choose the browser)
 *   node test/tools/onepage.js --check    writes nothing; also fails when a sheet in docs/print/ is out of date
 * The Indic pages are measured with this PC's fonts: without Noto or Nirmala UI installed the fit is approximate.
 * The Markdown the quick starts use is small (headings, bold, code, lists, tables, a quote), so it is converted here.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const pp = require(path.join(__dirname, '..', 'node_modules', 'puppeteer-core'));
const DOCS = path.join(__dirname, '..', '..', 'docs');
const CHECK = process.argv.includes('--check');
const BROWSER = process.env.QA_BROWSER || ['/opt/pw-browsers/chromium', '/usr/bin/chromium'].find(p => fs.existsSync(p));

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const inline = (s) => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
const html = (md, title) => {
  const out = [], lines = md.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (!l.trim()) continue;
    if (/^#+ /.test(l)) { const n = /^#+/.exec(l)[0].length; out.push(`<h${n}>${inline(l.slice(n + 1))}</h${n}>`); continue; }
    if (/^> /.test(l)) { out.push(`<blockquote>${inline(l.slice(2))}</blockquote>`); continue; }
    if (/^\|/.test(l)) {
      const rows = [];
      while (i < lines.length && /^\|/.test(lines[i])) { if (!/^\|[\s|:-]+\|$/.test(lines[i])) rows.push(lines[i].split('|').slice(1, -1).map(c => inline(c.trim()))); i++; }
      i--;
      out.push('<table>' + rows.map((r, k) => '<tr>' + r.map(c => k ? `<td>${c}</td>` : `<th>${c}</th>`).join('') + '</tr>').join('') + '</table>');
      continue;
    }
    if (/^(- |\d+\. )/.test(l)) {
      const ol = /^\d/.test(l), items = [];
      while (i < lines.length && (/^(- |\d+\. )/.test(lines[i]) || /^ {2,}\S/.test(lines[i]))) {
        if (/^ {2,}\S/.test(lines[i])) items[items.length - 1] += ' ' + lines[i].trim(); else items.push(lines[i].replace(/^(- |\d+\. )/, ''));
        i++;
      }
      i--;
      out.push(`<${ol ? 'ol' : 'ul'}>` + items.map(t => `<li>${inline(t)}</li>`).join('') + `</${ol ? 'ol' : 'ul'}>`);
      continue;
    }
    let para = l;
    while (i + 1 < lines.length && lines[i + 1].trim() && !/^(#|>|\||- |\d+\. )/.test(lines[i + 1])) para += ' ' + lines[++i].trim();
    out.push(`<p>${inline(para)}</p>`);
  }
  return `<!doctype html><meta charset="utf-8"><title>${title}</title><style>
    @page { size: A4; margin: 12mm; }
    body { font: 8.5pt/1.25 "Noto Sans", "Noto Sans Tamil", "Noto Sans Devanagari", "Noto Sans Bengali", "Noto Sans Gujarati",
      "Noto Sans Kannada", "Noto Sans Malayalam", "Noto Sans Gurmukhi", "Noto Sans Telugu", "Nirmala UI", sans-serif; margin: 0; max-width: 186mm; }
    h1 { font-size: 12pt; margin: 0 0 4pt; } p, ul, ol, table, blockquote { margin: 0 0 4pt; } ul, ol { padding-left: 14pt; }
    table { border-collapse: collapse; width: 100%; } td, th { border: 0.5pt solid #999; padding: 1.5pt 4pt; text-align: left; vertical-align: top; }
    blockquote { margin-left: 0; padding-left: 6pt; border-left: 2pt solid #999; color: #444; } code { font-size: 8pt; }
  </style>${out.join('\n')}`;
};

(async () => {
  if (!BROWSER) { console.error('no Chromium found: set QA_BROWSER'); process.exit(2); }
  const files = fs.readdirSync(DOCS).filter(f => /^QUICK-START(\.[a-z]{2})?\.md$/.test(f)).sort();
  const PRINT = path.join(DOCS, 'print');
  fs.mkdirSync(PRINT, { recursive: true });
  const b = await pp.launch({ executablePath: BROWSER, headless: true, args: ['--no-sandbox'] });
  const over = [];
  try {
    const p = await b.newPage();
    for (const f of files) {
      const page = html(fs.readFileSync(path.join(DOCS, f), 'utf8'), f.replace(/\.md$/, ''));
      // the sheet a trainer prints (B-176): docs/print/QUICK-START[.lang].html, one A4 page from any browser
      const sheet = path.join(PRINT, f.replace(/\.md$/, '.html'));
      if (!CHECK) fs.writeFileSync(sheet, page + '\n');
      else if (!fs.existsSync(sheet) || fs.readFileSync(sheet, 'utf8') !== page + '\n') { console.log(`OLD  ${f.padEnd(20)} docs/print/ is out of date: run node test/tools/onepage.js`); over.push(f); }
      await p.setContent(page, { waitUntil: 'load' });
      const pdf = Buffer.from(await p.pdf({ preferCSSPageSize: true, printBackground: false }));
      const pages = Number((/\/Count (\d+)/.exec(pdf.toString('latin1')) || [])[1]) || 0;
      console.log(`${pages === 1 ? 'ok  ' : 'OVER'} ${f.padEnd(20)} ${pages} page${pages === 1 ? '' : 's'}`);
      if (pages !== 1) over.push(f);
    }
  } finally { await b.close(); }
  console.log(over.length ? `\n${over.length} quick start(s) take more than one A4 page: ${over.join(', ')}` : `\nall ${files.length} quick starts fit one A4 page (docs/print/)`);
  process.exit(over.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
