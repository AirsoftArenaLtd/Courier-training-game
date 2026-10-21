#!/usr/bin/env node
/*
 * B-102: one word for one thing. For each term in data/i18n/glossary.json, each language's word is its translation of the
 * term on its own (the button or heading the game shows, for example "Handheld"); every line that uses the term in
 * English should use that word (by its stem, so endings may change) in the translation. Some lines may say it another
 * way on purpose, so the test holds each language to the count it had when the glossary was written (`baseline`): it
 * fails only when a language uses another word in more lines than before, and lists the lines either way.
 *
 *   node test/glossary.js            (--write sets the baseline to today's counts)
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const G = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'i18n', 'glossary.json'), 'utf8'));
const cat = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'i18n', 'catalogue.json'), 'utf8')).strings;
const LANGS = ['bn', 'es', 'fr', 'gu', 'hi', 'kn', 'ml', 'mr', 'pa', 'ta', 'te'];
const stem = (w) => {
  w = w.toLowerCase().replace(/[.。!:]+$/, '').trim();
  const cps = [...w];
  return cps.length > 5 ? cps.slice(0, cps.length - (/[a-z]/.test(w) ? 1 : 2)).join('') : w;
};
const out = {}; let fails = 0;
for (const lang of LANGS) {
  global.window = {}; eval(fs.readFileSync(path.join(ROOT, 'data', 'i18n', lang + '.js'), 'utf8'));
  const L = window.OTR_I18N[lang].strings;
  out[lang] = {};
  for (const [term, single] of Object.entries(G.terms)) {
    const word = stem(L[single] || '');
    if (!word) continue;
    const re = new RegExp('\\b' + term.replace(/ /g, '\\s+') + 's?\\b', 'i');
    const miss = cat.filter(s => s !== single && re.test(s) && L[s] && !L[s].toLowerCase().includes(word));
    out[lang][term] = miss.length;
    const base = ((G.baseline || {})[lang] || {})[term];
    if (process.argv.includes('--list')) miss.forEach(s => console.log(`  ${lang} ${term} (${word}): ${s.slice(0, 70)} → ${L[s].slice(0, 70)}`));
    if (base !== undefined && miss.length > base) { fails++; console.log(`FAIL ${lang}: "${term}" is not "${L[single]}" in ${miss.length} lines (was ${base}); new: ${miss.slice(0, 3).map(s => JSON.stringify(s.slice(0, 50))).join(', ')}`); }
  }
}
if (process.argv.includes('--write')) { G.baseline = out; fs.writeFileSync(path.join(ROOT, 'data', 'i18n', 'glossary.json'), JSON.stringify(G, null, 1) + '\n'); }
const total = Object.values(out).reduce((n, o) => n + Object.values(o).reduce((a, b) => a + b, 0), 0);
console.log(fails ? `\n${fails} glossary check(s) failed` : `glossary: ${Object.keys(G.terms).length} terms in ${LANGS.length} languages, ${total} lines use another word (none more than the baseline)`);
process.exit(fails ? 1 : 0);
