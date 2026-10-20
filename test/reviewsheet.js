#!/usr/bin/env node
/*
 * B-81: the native reviewers' sheets (docs/review/<lang>-safety.csv) read the way a spreadsheet reads them. Each one is
 * parsed with a strict CSV reader (quoted cells, doubled quotes, CRLF, a UTF-8 byte order mark so Excel keeps the
 * letters) and must have the same seven columns on every row. The first row under the headings is the how-to in English
 * and in the sheet's language (docs/review/HOW-TO-REVIEW.md, whose column names must match the sheet's). Within each
 * priority the "new" rows come first. Then the tool is run again into a scratch folder from the sheets as they are: the
 * output must be the same, the how-to row must not count as a line, and a corrected cell the reviewer typed must not
 * break the next run.
 *
 *   node test/reviewsheet.js
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..');
const DIR = path.join(ROOT, 'docs', 'review');
const LANGS = ['es', 'fr', 'hi', 'bn', 'mr', 'te', 'ta', 'gu', 'kn', 'ml', 'pa'];
let checks = 0;
const fails = [];
const check = (ok, what) => { checks++; if (!ok) { fails.push(what); console.log('FAIL ' + what); } };

/** RFC 4180, strictly: anything a spreadsheet would read differently throws. */
function parse(text) {
  const rows = []; let row = [], cell = '', i = 0, quoted = false, was = false;
  while (i < text.length) {
    const c = text[i];
    if (quoted) {
      if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i += 2; continue; } quoted = false; i++; continue; }
      cell += c; i++; continue;
    }
    if (c === '"') { if (cell || was) throw new Error(`a quote inside an unquoted cell, row ${rows.length + 1}`); quoted = true; was = true; i++; continue; }
    if (c === ',') { row.push(cell); cell = ''; was = false; i++; continue; }
    if (c === '\r') { if (text[i + 1] !== '\n') throw new Error(`a bare CR, row ${rows.length + 1}`); i++; continue; }
    if (c === '\n') { if (text[i - 1] !== '\r') throw new Error(`a row ending in a bare LF, row ${rows.length + 1}`); row.push(cell); rows.push(row); row = []; cell = ''; was = false; i++; continue; }
    if (was) throw new Error(`text after a closing quote, row ${rows.length + 1}`);
    cell += c; i++;
  }
  if (quoted) throw new Error('a quote never closed');
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

const doc = fs.readFileSync(path.join(DIR, 'HOW-TO-REVIEW.md'), 'utf8');
const sheets = {};
for (const lang of LANGS) {
  const file = path.join(DIR, `${lang}-safety.csv`);
  const raw = fs.readFileSync(file, 'utf8');
  check(raw.charCodeAt(0) === 0xFEFF, `${lang}: starts with the UTF-8 mark, so Excel keeps the letters`);
  check(/\r\n$/.test(raw), `${lang}: ends in CRLF`);
  let rows;
  try { rows = parse(raw.slice(1)); } catch (e) { check(false, `${lang}: reads as CSV (${e.message})`); continue; }
  sheets[lang] = raw;
  const head = rows[0];
  check(rows.every(r => r.length === 7), `${lang}: seven columns on every row (${[...new Set(rows.map(r => r.length))].join(', ')})`);
  check(head[0] === 'Priority (1 = safety)' && head[2] === 'English' && /\(machine translation\)$/.test(head[3]) && head[6] === 'Kind', `${lang}: the headings`);
  [head[0], head[1], 'Corrected translation', 'Comment', 'Kind'].forEach(h => check(doc.includes(h), `${lang}: HOW-TO-REVIEW.md explains the column "${h}"`));
  const how = rows[1];
  check(how && how[6] === 'how to review' && /^How to review:/.test(how[2]), `${lang}: the first row is the how-to`);
  check(how && how[3] && how[3] !== how[2] && !/^How to review/.test(how[3]) && /HOW-TO-REVIEW\.md$/.test(how[3]), `${lang}: the how-to is in the sheet's language`);
  check(how && /CSV UTF-8/.test(how[2]) && /CSV UTF-8/.test(how[3]), `${lang}: the how-to says to save as CSV UTF-8`);
  const body = rows.slice(2);
  check(body.length > 100 && body.every(r => /^[12]$/.test(r[0]) && r[2] && r[3] && !r[4] && !r[5]), `${lang}: ${body.length} lines, each with a priority, the English and a translation, and empty answer cells`);
  let order = true;
  for (let k = 1; k < body.length; k++) {
    const a = body[k - 1], b = body[k];
    if (a[0] === b[0] && a[1] !== 'new' && b[1] === 'new') order = false;
    if (Number(a[0]) > Number(b[0])) order = false;
  }
  check(order, `${lang}: safety first, and the "new" lines first within each priority`);
}

// the tool again, from the sheets as they are (one with a reviewer's correction typed in), into a scratch folder
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'otr-sheets-'));
try {
  for (const [lang, raw] of Object.entries(sheets)) fs.writeFileSync(path.join(tmp, `${lang}-safety.csv`), raw);
  const ta = fs.readFileSync(path.join(tmp, 'ta-safety.csv'), 'utf8').split('\r\n');
  ta[3] = ta[3].replace(/,"","","text"$/, ',"ஒரு திருத்தம், ""மேற்கோளுடன்""","comment, with a comma","text"');
  check(ta[3].includes('திருத்தம்'), 'ta: a correction typed into the scratch copy');
  fs.writeFileSync(path.join(tmp, 'ta-safety.csv'), ta.join('\r\n'));
  execFileSync(process.execPath, [path.join(ROOT, 'test', 'tools', 'review-sheet.js')], { env: Object.assign({}, process.env, { REVIEW_OUT: tmp }), stdio: 'pipe' });
  for (const [lang, raw] of Object.entries(sheets)) {
    const again = fs.readFileSync(path.join(tmp, `${lang}-safety.csv`), 'utf8');
    check(again === raw, `${lang}: running the tool again gives the same sheet (the how-to row is not counted as a line)`);
  }
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }

console.log(fails.length ? `\n${fails.length} of ${checks} review sheet checks failed` : `${checks} review sheet checks passed`);
process.exit(fails.length ? 1 : 0);
