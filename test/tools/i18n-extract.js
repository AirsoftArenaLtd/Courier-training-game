#!/usr/bin/env node
/*
 * The catalogue of text to translate (src/core/i18n.js): every string a player can be shown.
 *
 *   - the game's data (data/*.js): every string in OTR_DATA with words in it
 *   - the code (src/**): string literals that read as text, and template literals as templates ("Stop ${i} of ${n}"
 *     becomes "Stop {0} of {1}")
 *
 * Writes data/i18n/catalogue.json: { strings: [...], templates: [...] }, and with a language code, lists what that
 * language's file does not have yet:
 *
 *   node test/tools/i18n-extract.js            the catalogue
 *   node test/tools/i18n-extract.js es         ... and what es.js is missing (data/i18n/missing-es.json)
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(ROOT, 'data', 'i18n');

// ---- the data
global.window = globalThis;
window.OTR = {}; global.OTR = window.OTR;
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
(html.match(/data\/[a-z0-9_]+\.js/g) || []).forEach(f => { eval(fs.readFileSync(path.join(ROOT, f), 'utf8')); });
const textish = (s) => /[A-Za-z]{2,}/.test(s) && (/[a-z]{2,}[^a-z]+[a-z]{2,}/i.test(s) || /^[A-Z][a-z]+[.!?]?$/.test(s) || /^[A-Z]{3,}[A-Z !?.]*$/.test(s));
const strings = new Map();          // text → where it came from
const add = (s, from) => { if (!strings.has(s)) strings.set(s, from); };
const skipKey = new Set(['id', 'key', 'scene', 'icon', 'tex', 'texture', 'type', 'kind', 'sfx', 'sound', 'anim', 'font', 'color', 'colour', 'skin']);
const walk = (o, from, key) => {
  if (typeof o === 'string') { if (!skipKey.has(key) && textish(o)) add(o, from); return; }
  if (Array.isArray(o)) { o.forEach(v => walk(v, from, key)); return; }
  if (o && typeof o === 'object') Object.keys(o).forEach(k => walk(o[k], from, k));
};
Object.keys(window.OTR_DATA || {}).forEach(k => walk(window.OTR_DATA[k], 'data:' + k));

// ---- the code
const templates = new Map();
const files = [];
const scan = (d) => fs.readdirSync(d).forEach(f => { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) scan(p); else if (f.endsWith('.js')) files.push(p); });
scan(path.join(ROOT, 'src'));
// the content checker's messages are for whoever edits the data, in the console: not shown to players
const devOnly = new Set(['src/core/validate.js']);
files.splice(0, files.length, ...files.filter(f => !devOnly.has(path.relative(ROOT, f))));
const notText = (s) =>
  /^(keydown|keyup|pointer|ic_|td_|pp_|lt_|wx_|p_|car_top|van_top|atm_|bg_)/.test(s) || /^[#.]?[a-z0-9_-]+$/.test(s) ||
  /\b(rgba?|px|Segoe|Arial|sans-serif|function|return|const)\b/.test(s) || /^https?:|\.(js|png|webp|json)$/.test(s) || /[{};=<>]/.test(s);
// a small scanner: skips comments and regular expressions, reads '...', "..." and `...`; the code inside a template's
// ${} is scanned too, for the words it chooses between ("Signaled the ${late ? 'left' : 'right'} turn")
// one escape sequence at src[j] (a backslash): the character it stands for and how many source characters it spans
const unescape = (src, j) => {
  const n = src[j + 1];
  if (n === 'n') return ['\n', 2];
  if (n === 'u' && /^[0-9a-fA-F]{4}$/.test(src.substr(j + 2, 4))) return [String.fromCharCode(parseInt(src.substr(j + 2, 4), 16)), 6];
  if (n === 'x' && /^[0-9a-fA-F]{2}$/.test(src.substr(j + 2, 2))) return [String.fromCharCode(parseInt(src.substr(j + 2, 2), 16)), 4];
  return [n, 2];
};

const scanCode = (src, rel) => {
  let i = 0, prev = '';
  while (i < src.length) {
    const c = src[i], n = src[i + 1];
    if (c === '/' && n === '/') { i = src.indexOf('\n', i); if (i < 0) break; continue; }
    if (c === '/' && n === '*') { i = src.indexOf('*/', i + 2); if (i < 0) break; i += 2; continue; }
    // a regular expression starts where a value is expected: after ( , = : [ ! & | ? { } ; or return
    if (c === '/' && (/[(,=:[!&|?{};]/.test(prev) || prev === '' || /\breturn\s*$/.test(src.slice(Math.max(0, i - 8), i)))) {
      let j = i + 1, cls = false;
      while (j < src.length && src[j] !== '\n' && (cls || src[j] !== '/')) { if (src[j] === '\\') j++; else if (src[j] === '[') cls = true; else if (src[j] === ']') cls = false; j++; }
      i = j + 1; prev = 'x'; continue;
    }
    if (!/\s/.test(c)) prev = c;
    if (c === '\'' || c === '"') {
      let j = i + 1, s = '';
      while (j < src.length && src[j] !== c) { if (src[j] === '\\') { const [ch, len] = unescape(src, j); s += ch; j += len; } else s += src[j++]; }
      // a sentence with {0} holes for printed pages (OTR.record.F) is text, not code
      if (textish(s) && !notText(s.replace(/\{\d+\}/g, ' '))) add(s, rel);
      i = j + 1; prev = 'x'; continue;
    }
    if (c === '`') {
      let j = i + 1, s = '', holes = 0;
      while (j < src.length && src[j] !== '`') {
        if (src[j] === '\\') { const [ch, len] = unescape(src, j); s += ch; j += len; continue; }
        if (src[j] === '$' && src[j + 1] === '{') {
          // the hole's code runs to its matching }, past any strings and templates inside it
          let depth = 1, k = j + 2, q = null;
          while (k < src.length && depth) {
            const ch = src[k];
            if (q) { if (ch === '\\') k++; else if (ch === q) q = null; }
            else if (ch === '\'' || ch === '"' || ch === '`') q = ch;
            else if (ch === '{') depth++;
            else if (ch === '}') depth--;
            k++;
          }
          scanCode(src.slice(j + 2, k - 1), rel);
          j = k; s += `{${holes++}}`; continue;
        }
        s += src[j++];
      }
      const plain = s.replace(/\{\d+\}/g, ' ');
      if (textish(plain) && !/<|\bstyle\b|;\s*$/.test(s) && !notText(plain.trim() || 'x')) {
        if (holes) { if (!templates.has(s)) templates.set(s, rel); } else add(s, rel);
      }
      i = j + 1; prev = 'x'; continue;
    }
    i++;
  }
};
files.forEach(file => scanCode(fs.readFileSync(file, 'utf8'), path.relative(ROOT, file)));

fs.mkdirSync(OUT, { recursive: true });
// in the order they were found: a conversation's lines stay together, for whoever translates them
const cat = { strings: [...strings.keys()], templates: [...templates.keys()] };
fs.writeFileSync(path.join(OUT, 'catalogue.json'), JSON.stringify(cat, null, 1));
const words = cat.strings.concat(cat.templates).join(' ').split(/\s+/).length;
console.log(`catalogue: ${cat.strings.length} strings, ${cat.templates.length} templates, about ${words} words`);

const lang = process.argv[2];
if (lang) {
  window.OTR_I18N = {};
  eval(fs.readFileSync(path.join(OUT, lang + '.js'), 'utf8'));
  const L = window.OTR_I18N[lang] || {}, have = L.strings || {}, haveT = new Set((L.templates || []).map(t => t[0].trim()));
  // a string with spaces round it is translated by its trimmed self
  const miss = { strings: cat.strings.filter(s => !(s in have) && !(s.trim() in have)), templates: cat.templates.filter(t => !haveT.has(t.trim())) };
  fs.writeFileSync(path.join(OUT, `missing-${lang}.json`), JSON.stringify(miss, null, 1));
  console.log(`${lang}: ${Object.keys(have).length} strings and ${haveT.size} templates translated; missing ${miss.strings.length} strings, ${miss.templates.length} templates`);
}
