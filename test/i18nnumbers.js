#!/usr/bin/env node
/*
 * B-143: every number in an English line is in its translation, in every language: a speed, a distance, an age or a
 * time that changes in translation teaches the wrong thing. Native digits count (০-৯, ०-९ and so on), and so do the
 * 24-hour clock ("2:40 PM" as 14 h 40), the decimal comma (0,5) and "3D" written out. Fails on any other missing number and lists it.
 *
 *   node test/i18nnumbers.js
 */
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const cat = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'i18n', 'catalogue.json'), 'utf8')).strings;
const DIGITS = { bn: '০১২৩৪৫৬৭৮৯', hi: '०१२३४५६७८९', mr: '०१२३४५६७८९', gu: '૦૧૨૩૪૫૬૭૮૯', pa: '੦੧੨੩੪੫੬੭੮੯', ta: '௦௧௨௩௪௫௬௭௮௯',
  te: '౦౧౨౩౪౫౬౭౮౯', kn: '೦೧೨೩೪೫೬೭೮೯', ml: '൦൧൨൩൪൫൬൭൮൯', es: '', fr: '' };
let fails = 0, lines = 0;
for (const lang of Object.keys(DIGITS)) {
  global.window = {}; eval(fs.readFileSync(path.join(ROOT, 'data', 'i18n', lang + '.js'), 'utf8'));
  const L = window.OTR_I18N[lang].strings, D = DIGITS[lang];
  const norm = (t) => (D ? t.replace(new RegExp('[' + D + ']', 'g'), (d) => D.indexOf(d)) : t).replace(/(\d)[ \u202f\u00a0](\d{3})\b/g, '$1$2').replace(/(\d),(\d)/g, '$1.$2');   // 1 000 and 0,5
  const bad = [];
  for (const en of cat) {
    const tr = L[en];
    if (!tr) continue;
    lines++;
    // the English with "3D" taken out (some languages write it out) and each time also as the 24-hour clock
    const src = en.replace(/\b3D\b/g, '');
    const want = [];
    for (const m of src.matchAll(/\b(\d{1,2})(?::(\d{2}))?\s*(AM|PM)\b/gi)) {
      const h = Number(m[1]) % 12 + (/pm/i.test(m[3]) ? 12 : 0);
      want.push([m[1], String(h)].concat(m[2] ? [m[2]] : []));
    }
    // a clock time with no AM or PM ("at 4:12") may be written on the 24-hour clock too
    const rest = src.replace(/\b(\d{1,2})(?::(\d{2}))?\s*(AM|PM)\b/gi, ' ').replace(/\b(\d{1,2}):(\d{2})\b/g, (m, h, mm) => { want.push([h, String(Number(h) + 12)], [mm]); return ' '; });
    for (const n of rest.match(/\d+(?:\.\d+)?/g) || []) want.push([n]);
    const t = norm(tr);
    const missing = want.filter((alts) => !alts.some((n) => t.includes(n))).map((a) => a[0]);
    if (missing.length) bad.push(`${missing.join(', ')}: "${en.slice(0, 70)}" → "${tr.slice(0, 70)}"`);
  }
  if (bad.length) { fails += bad.length; console.log(`FAIL ${lang}: ${bad.length} line(s) lose a number`); bad.forEach((b) => console.log('  ' + b)); }
}
console.log(fails ? `\n${fails} translated line(s) lose a number` : `numbers: every number kept in ${lines} translated lines (11 languages)`);
process.exit(fails ? 1 : 0);
