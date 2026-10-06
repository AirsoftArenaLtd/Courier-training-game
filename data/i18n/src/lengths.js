// node lengths.js <lang>: the quiz questions and conversation decisions where, in that language, the right answer can be
// picked out by its length (see src/core/validate.js). Each line: grade, length, MAX/min, the translation, then the English.
global.window = globalThis; window.OTR = {}; global.OTR = window.OTR; global.document = { documentElement: {} };
global.Phaser = { GameObjects: { Text: { prototype: { setText() {} } } } };
const fs = require('fs'), path = require('path'), ROOT = path.resolve(__dirname, '..', '..', '..');
const html = fs.readFileSync(ROOT + '/index.html', 'utf8');
(html.match(/data\/[a-z0-9_]+\.js/g) || []).forEach(f => eval(fs.readFileSync(path.join(ROOT, f), 'utf8')));
eval(fs.readFileSync(ROOT + '/src/core/i18n.js', 'utf8'));
const lang = process.argv[2];
eval(fs.readFileSync(`${ROOT}/data/i18n/${lang}.js`, 'utf8')); OTR.i18n.use(lang);
const T = (s) => OTR.i18n.tr(s);
const show = (rows) => {
  const L = rows.map(r => T(r.text).length), mx = Math.max(...L), mn = Math.min(...L);
  rows.forEach((r, i) => console.log(`   ${(r.good ? 'GOOD' : '    ')} ${String(L[i]).padStart(3)}${L[i] === mx ? ' MAX' : L[i] === mn ? ' min' : '    '}  ${T(r.text)}\n${' '.repeat(16)}${r.text}`));
};
const only = process.argv[3];
if (!only || only === 'quiz') {
  console.log('## QUIZZES (right answer longest, or an option over twice another)');
  Object.keys(OTR_DATA.quizzes).forEach(m => {
    if (!Array.isArray(OTR_DATA.quizzes[m])) return;
    OTR_DATA.quizzes[m].forEach((q, i) => {
      const L = q.options.map(o => T(o).length), mx = Math.max(...L), mn = Math.min(...L);
      if (L[q.answer] === mx || mx > mn * 2) { console.log(` quiz ${m} q${i + 1}`); show(q.options.map((o, k) => ({ text: o, good: k === q.answer }))); }
    });
  });
}
if (!only || only !== 'quiz') {
  console.log('## CONVERSATIONS');
  OTR_DATA.modules.forEach(m => (m.scenarios || []).forEach(sc => {
    if (sc.scene !== 'DialogueScene' || (only && only !== sc.id)) return;
    const dlg = sc.dataKey.split('.').reduce((o, k) => o && o[k], OTR_DATA);
    let n = 0, lo = 0, sh = 0; const out = [];
    Object.keys(dlg.nodes).forEach(id => {
      const ch = dlg.nodes[id].choices; if (!ch || !ch.some(c => c.grade === 'good')) return;
      n++; const L = ch.map(c => T(c.text).length), mx = Math.max(...L), mn = Math.min(...L);
      const isL = ch.some((c, i) => c.grade === 'good' && L[i] === mx), isS = ch.some((c, i) => c.grade === 'good' && L[i] === mn);
      if (isL) lo++; if (isS) sh++;
      out.push(() => { console.log(`  node ${id}${isL ? '  [good is longest]' : ''}${isS ? '  [good is shortest]' : ''}`); show(ch.map(c => ({ text: c.text, good: c.grade === 'good' }))); });
    });
    if (n >= 3 && (lo * 2 > n || sh * 2 > n)) { console.log(`### ${sc.id}: longest ${lo}/${n}, shortest ${sh}/${n}`); out.forEach(f => f()); }
  }));
}
