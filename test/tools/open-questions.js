#!/usr/bin/env node
/*
 * B-136: the reviewers' open questions on one page. docs/review/questions.json holds the team's questions for each
 * language (B-100, B-106, B-116); this writes docs/review/OPEN-QUESTIONS.md from it, one section per language, each
 * question with its line, for the owner to send with that language's sheet. `--check` fails if the page is out of date
 * (test/reviewsheet.js runs it).
 *
 *   node test/tools/open-questions.js            (writes the page)
 *   node test/tools/open-questions.js --check
 */
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const NAMES = { bn: 'Bengali', es: 'Spanish', fr: 'French', gu: 'Gujarati', hi: 'Hindi', kn: 'Kannada', ml: 'Malayalam', mr: 'Marathi', pa: 'Punjabi', ta: 'Tamil', te: 'Telugu' };
const Q = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'review', 'questions.json'), 'utf8'));
const langs = Object.keys(Q).filter(l => Object.keys(Q[l]).length).sort((a, b) => (NAMES[a] || a).localeCompare(NAMES[b] || b));
const total = langs.reduce((n, l) => n + Object.keys(Q[l]).length, 0);
const out = ['# Open questions for the translation reviewers', '',
  `Made by \`node test/tools/open-questions.js\` from \`docs/review/questions.json\`; do not edit by hand. ${total} questions in ${langs.length} languages.`, '',
  'Each question is also in the Comment column of that language\'s sheet (`docs/review/<language>-safety.csv`), on its line,',
  'and those lines come first. Send this page with the sheet, so the reviewer knows what we most want to hear about.', ''];
for (const l of langs) {
  out.push(`## ${NAMES[l] || l} (${l}-safety.csv)`, '');
  Object.entries(Q[l]).forEach(([en, q], i) => {
    const ask = q.replace(/^Question from the team:\s*/, '');
    out.push(`${i + 1}. **The line:** "${en}"`, `   ${ask.charAt(0).toUpperCase() + ask.slice(1)}`, '');
  });
}
const text = out.join('\n');
const file = path.join(ROOT, 'docs', 'review', 'OPEN-QUESTIONS.md');
if (process.argv.includes('--check')) {
  const now = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  if (now !== text) { console.log('docs/review/OPEN-QUESTIONS.md is out of date: run node test/tools/open-questions.js'); process.exit(1); }
  console.log(`open questions page is current (${total} questions)`);
} else { fs.writeFileSync(file, text); console.log(`docs/review/OPEN-QUESTIONS.md: ${total} questions in ${langs.length} languages`); }
