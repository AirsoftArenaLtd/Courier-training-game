#!/usr/bin/env node
/*
 * B-163: the figures for docs/READINESS.md's "What is checked" table, from the last release-candidate run
 * (`node test/run-all.js --rc`, B-157, which writes test/out/rc.md), so the page is refreshed from one run, not by hand.
 *   node test/tools/readiness.js [test/out/rc.md]
 */
'use strict';
const fs = require('fs');
const path = require('path');
const file = path.resolve(process.argv[2] || path.join(__dirname, '..', 'out', 'rc.md'));
if (!fs.existsSync(file)) { console.error(`${path.relative(process.cwd(), file)} not found: run node test/run-all.js --rc first`); process.exit(2); }
const md = fs.readFileSync(file, 'utf8');
const when = (/^(\d{4}-\d\d-\d\d \d\d:\d\d) UTC, commit `([0-9a-f]+)`/m.exec(md) || []).slice(1);
// one table row per check: | `name` | pass / pass, passed when rerun alone (...) / **FAIL** why | time |
const rows = [...md.matchAll(/^\| `([^`]+)` \| (.*?) \| (\d+) s \|$/gm)].map(m => ({ name: m[1], result: m[2], s: Number(m[3]) }));
if (!rows.length) { console.error('no checks found in ' + file); process.exit(2); }
const browser = (n) => /browser\.js$/.test(n) || ['a11y-screens.js', 'fpaccesslayout.js'].includes(n);
const groups = { 'Node suites': rows.filter(r => !r.name.startsWith('flow ') && !browser(r.name)), 'Browser suites': rows.filter(r => browser(r.name)), '3D flows at Low': rows.filter(r => r.name.startsWith('flow ')) };
const passed = (r) => r.result.startsWith('pass');
console.log(`Release-candidate run of ${when[0] || '(no date)'} UTC on \`${when[1] || '?'}\` (${path.relative(process.cwd(), file)}):\n`);
for (const [g, list] of Object.entries(groups)) {
  if (!list.length) { console.log(`- ${g}: not run`); continue; }
  const rerun = list.filter(r => /rerun alone/.test(r.result)), bad = list.filter(r => !passed(r));
  console.log(`- ${g}: **${list.length - bad.length} of ${list.length}**` + (rerun.length ? ` (${rerun.length} passed only when rerun alone: ${rerun.map(r => r.name).join(', ')})` : '') +
    (bad.length ? `; failing: ${bad.map(r => r.name.replace(/^flow /, '')).join(', ')}` : ''));
}
const bad = rows.filter(r => !passed(r));
console.log(`\n${bad.length ? `Not ready: ${bad.length} check(s) fail.` : 'Every check passes.'} Copy these into docs/READINESS.md's table with the date and commit.`);
process.exit(0);
