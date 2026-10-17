#!/usr/bin/env node
/*
 * Sheets for native-speaker review of the machine translations (data/i18n/<lang>.js): one CSV per language that opens in
 * Excel or Google Sheets, with the English, the current translation, and empty columns for the reviewer's correction
 * and comment. The safety wording comes first (speeds, distances, school buses, sirens, heat, dogs, ID and age checks,
 * seatbelts, backing, hazards, lifting, signatures); `--all` adds every other line.
 *
 *   node test/tools/review-sheet.js                 safety sheets for all languages  → docs/review/<lang>-safety.csv
 *   node test/tools/review-sheet.js es ta --all     the full sheets for these languages → docs/review/<lang>-all.csv
 *
 * A translation is applied by editing data/i18n/<lang>.js (or sending the corrected sheet back).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(ROOT, 'docs', 'review');
const LANGS = { es: 'Spanish', fr: 'French', hi: 'Hindi', bn: 'Bengali', mr: 'Marathi', te: 'Telugu', ta: 'Tamil', gu: 'Gujarati', kn: 'Kannada', ml: 'Malayalam', pa: 'Punjabi' };

const args = process.argv.slice(2);
const all = args.includes('--all');
const langs = args.filter(a => !a.startsWith('--'));
const want = langs.length ? langs : Object.keys(LANGS);

const cat = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'i18n', 'catalogue.json'), 'utf8'));
const notText = new Set(JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'i18n', 'not-text.json'), 'utf8')));

// words that make a line safety wording: a wrong translation here could teach the wrong thing
const SAFETY = new RegExp('\\b(' + [
  'mph', 'speed(ing)?', 'speed limit', 'following (distance|gap)', 'tailgat\\w*', 'seconds? (behind|gap)', 'stop sign', 'stop line', 'red light', 'junction',
  'school bus', 'sirens?', 'emergency vehicle', 'ambulance', 'pedestrians?', 'crossing', 'yield', 'mirrors?', 'blind spot', 'seat ?belt',
  'revers(e|ing)', 'backing', 'G\\.O\\.A\\.L\\.?', 'heat', 'water break', 'shade', 'storm', 'snow', 'icy', 'ice', 'slippery', 'visibility',
  'dog', 'gate', 'photo ID', 'age check', 'age-restricted', 'adult', 'hazards?', 'trip', 'lift(ing)?', 'heavy', 'injur\\w*',
  'secure[ds]?', 'restraint', 'straps?', 'strapped', 'unsecured', 'hazmat', 'flammable', 'wrong side', 'sidewalk', 'parking brake', 'wheel chock',
  'critical', 'crash', 'collision', 'contact with traffic', 'unattended', 'handheld while',
  // the cab, signs, night and damage (milestones 7 to 9)
  'damage', 'dent(ed)?', 'scuff(ed)?', 'no-entry', 'one-way', 'give way', 'school zone', 'road works', 'diversion', 'cyclists?',
  'headlights?', 'dusk', 'night', 'fog', 'low bridge', 'clearance', 'overhang', 'rear camera', 'signal(led|ling)?', 'gear', 'load shift(ed)?'
].join('|') + ')\\b', 'i');

const q = (s) => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';
const clean = (s) => String(s).replace(/^\s+|\s+$/g, '');
fs.mkdirSync(OUT, { recursive: true });

for (const lang of want) {
  if (!LANGS[lang]) { console.error('unknown language ' + lang); process.exit(2); }
  global.window = {}; eval(fs.readFileSync(path.join(ROOT, 'data', 'i18n', lang + '.js'), 'utf8'));
  const L = window.OTR_I18N[lang];
  const rows = [];
  cat.strings.forEach(s => {
    const tr = L.strings[s] || L.strings[s.trim()];
    if (!tr || notText.has(s) || tr === s) return;
    const safety = SAFETY.test(s);
    if (safety || all) rows.push([safety ? 1 : 2, clean(s), clean(tr), 'text']);
  });
  L.templates.forEach(([s, tr]) => { const safety = SAFETY.test(s); if (tr !== s && (safety || all)) rows.push([safety ? 1 : 2, clean(s), clean(tr), 'sentence with {0} {1} filled in by the game']); });
  rows.sort((a, b) => a[0] - b[0] || (a[1] < b[1] ? -1 : 1));
  const head = ['Priority (1 = safety)', 'English', `${LANGS[lang]} (machine translation)`, 'Corrected translation (leave blank if correct)', 'Comment', 'Kind'];
  const body = rows.map(r => [r[0], r[1], r[2], '', '', r[3]].map(q).join(','));
  const file = path.join(OUT, `${lang}-${all ? 'all' : 'safety'}.csv`);
  fs.writeFileSync(file, '﻿' + [head.map(q).join(','), ...body].join('\r\n') + '\r\n');
  console.log(`${lang}: ${rows.filter(r => r[0] === 1).length} safety lines${all ? `, ${rows.length} in all` : ''} → ${path.relative(ROOT, file)}`);
}
