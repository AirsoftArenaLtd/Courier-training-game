#!/usr/bin/env node
/*
 * The translations (data/i18n/<lang>.js), checked without a browser:
 *
 *   - the file loads, and every template's holes are ones its English has ({n} and {n:plural|singular} only)
 *   - nothing the game shows is missing (against data/i18n/catalogue.json, which test/tools/i18n-extract.js writes)
 *   - the quiz and conversation rules hold in the translation too: the right answer can't be found by its length
 *     (src/core/validate.js, run on the translated text), since a translation can make the right one the longest
 *   - a sample of composed messages comes out whole (plural choices, nested pieces)
 *
 *   node test/i18n.js            every language in src/core/i18n.js's LANGS
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

global.window = globalThis;
window.OTR = {}; global.OTR = window.OTR;
global.document = { documentElement: {} };
global.Phaser = { GameObjects: { Text: { prototype: { setText() {} } } } };
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
(html.match(/data\/[a-z0-9_]+\.js/g) || []).forEach(f => { eval(fs.readFileSync(path.join(ROOT, f), 'utf8')); });
['src/core/i18n.js', 'src/core/validate.js'].forEach(f => eval(fs.readFileSync(path.join(ROOT, f), 'utf8')));
const cat = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'i18n', 'catalogue.json'), 'utf8'));

let fails = 0;
const check = (ok, what) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) fails++; };

// a few composed messages, and what they must come out as
const SAMPLES = {
  es: [
    ['2 delivered · 1 exception', '2 entregados · 1 excepción'],
    ['2 delivered · 3 exceptions', '2 entregados · 3 excepciones'],
    ['Not passed (3 attempts, left part-way)', 'No aprobada (3 intentos, abandonada a mitad)'],
    ['Assessment: not passed · 1 attempt left', 'Evaluación: no aprobada · queda 1 intento'],
    ['Signaled the left turn too late', 'Puso la señal demasiado tarde para el giro a la izquierda'],
    ['+ 1 more check, all passed', '+ 1 comprobación más, aprobada'],
    ['12 mph · 1:23 into the drive · CRITICAL', '12 mph · a los 1:23 de manejo · CRÍTICO'],
    ['Whoa, the icy path is slippery! Hold SHIFT: short, careful steps.', '¡Uy, el camino helado resbala! Mantén MAYÚS: pasos cortos y con cuidado.']
  ]
};

Object.keys(OTR.i18n.LANGS).filter(l => l !== 'en').forEach(lang => {
  console.log(`\n${lang} (${OTR.i18n.LANGS[lang]})`);
  window.OTR_I18N = {};
  try { eval(fs.readFileSync(path.join(ROOT, 'data', 'i18n', lang + '.js'), 'utf8')); } catch (e) { check(false, `data/i18n/${lang}.js loads: ${e.message}`); return; }
  const L = window.OTR_I18N[lang];
  check(!!(L && L.strings && L.templates), `data/i18n/${lang}.js loads`);
  OTR.i18n.use(lang);

  const badHoles = L.templates.filter(([en, tr]) => {
    const have = new Set((en.match(/\{\d+\}/g) || []).map(h => h.slice(1, -1)));
    const used = [...tr.matchAll(/\{(\d+)(?::[^|}]*\|[^}]*)?\}/g)].map(m => m[1]);
    return !used.length && have.size || used.some(n => !have.has(n)) || /\{[^}]*$/.test(tr.replace(/\{\d+(?::[^|}]*\|[^}]*)?\}/g, ''));
  });
  check(!badHoles.length, `templates use only their own holes${badHoles.length ? ': ' + badHoles.slice(0, 5).map(t => JSON.stringify(t[0])).join(', ') : ''}`);

  // the catalogue: what is still English (text kept as it is, such as names and codes, is listed in the file itself)
  const have = new Set(Object.keys(L.strings)), haveT = new Set(L.templates.map(t => t[0].trim()));
  const kept = new Set(L.keep || []);
  const words = (s) => /[a-z]{3,}\s+[a-z]{3,}/.test(s);
  const missing = cat.strings.filter(s => !have.has(s) && !have.has(s.trim()) && !kept.has(s) && words(s) && !/^\[|^\(debug/.test(s));
  const missingT = cat.templates.filter(t => !haveT.has(t.trim()));
  check(!missing.length && !missingT.length, `every sentence in the catalogue is translated${missing.length + missingT.length ? ` (${missing.length} strings, ${missingT.length} templates missing, e.g. ${JSON.stringify(missing.concat(missingT).slice(0, 3))})` : ''}`);

  // the quizzes, translated, against the same rules as the English
  const T = (s) => OTR.i18n.tr(s);
  const Q = {};
  Object.keys(OTR_DATA.quizzes).forEach(m => { if (Array.isArray(OTR_DATA.quizzes[m])) Q[m] = OTR_DATA.quizzes[m].map(q => Object.assign({}, q, { options: q.options.map(T) })); });
  const qe = OTR.validate.quizzes(Q);
  check(!qe.length, `quiz answers can't be told by their length${qe.length ? ':\n        ' + qe.join('\n        ') : ''}`);
  const untranslated = Object.values(OTR_DATA.quizzes).filter(Array.isArray).flat().map(q => q.options).flat().filter(o => /[a-z]{3,} [a-z]{3,}/.test(o) && T(o) === o);
  check(!untranslated.length, `every quiz option is translated${untranslated.length ? ': ' + untranslated.slice(0, 3).join(' / ') : ''}`);

  // the conversations: the recommended answer must not be the longest (or shortest) too often
  const de = [];
  OTR_DATA.modules.forEach(m => (m.scenarios || []).forEach(sc => {
    if (sc.scene !== 'DialogueScene') return;
    const dlg = sc.dataKey.split('.').reduce((o, k) => (o == null ? undefined : o[k]), OTR_DATA);
    if (!dlg) return;
    const nodes = {};
    Object.keys(dlg.nodes).forEach(n => { const N = dlg.nodes[n]; nodes[n] = Object.assign({}, N, N.choices ? { choices: N.choices.map(c => Object.assign({}, c, { text: T(c.text) })) } : {}); });
    OTR.validate.dialogue(sc.id, Object.assign({}, dlg, { nodes })).filter(e => /longest|shortest/.test(e)).forEach(e => de.push(e));
  }));
  check(!de.length, `conversation answers can't be told by their length${de.length ? ':\n        ' + de.join('\n        ') : ''}`);

  (SAMPLES[lang] || []).forEach(([en, want]) => { const got = OTR.i18n.tr(en); check(got === want, `"${en}"${got === want ? '' : ` → "${got}", expected "${want}"`}`); });
});

console.log(fails ? `\n${fails} check(s) failed` : '\nall translation checks passed');
process.exit(fails ? 1 : 0);
