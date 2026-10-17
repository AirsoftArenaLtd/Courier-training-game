#!/usr/bin/env node
/*
 * The LMS package: a SCORM 1.2 zip with only what the game needs at run time (imsmanifest.xml at the top).
 *
 *   node test/tools/package-scorm.js [out.zip]          (default dist/on-the-route-scorm12.zip)
 *   node test/tools/package-scorm.js --2004 [out.zip]   SCORM 2004 (default dist/on-the-route-scorm2004.zip): the same
 *                                                       files with data/lms/imsmanifest-2004.xml as the manifest
 *
 * In: imsmanifest.xml, index.html, first-person.html, css/, lib/, src/, data/ (without the translators' sources and the
 * catalogue), assets/ (without assets/_incoming/). Out: docs, tests, the training server, agent notes. Fails when a file
 * a page loads is missing from the zip, or the zip is over the 100 MB budget in docs/ASSETS.md. `zip` must be installed.
 * test/package.js checks it.
 */
'use strict';
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const PAGES = ['index.html', 'first-person.html'];
const TOP = ['imsmanifest.xml', ...PAGES];
const DIRS = ['css', 'lib', 'src', 'data', 'assets'];
const SKIP = [/^data\/lms\//, /^data\/i18n\/src\//, /^data\/i18n\/catalogue\.json$/, /^data\/i18n\/missing-[^/]*\.json$/, /^data\/i18n\/not-text\.json$/,
  /^assets\/_incoming\//, /(^|\/)\.DS_Store$/, /(^|\/)Thumbs\.db$/];
const BUDGET = 100 * 1024 * 1024;

const walk = (d) => fs.readdirSync(path.join(ROOT, d), { withFileTypes: true }).flatMap(e => {
  const p = d + '/' + e.name;
  return e.isDirectory() ? walk(p) : [p];
});

/** The files that go in the package, as paths relative to the game folder. */
function files() {
  return TOP.concat(...DIRS.map(walk)).filter(p => !SKIP.some(re => re.test(p))).sort();
}

/** Every script, stylesheet and image a page names, which must all be in the package. */
function referenced() {
  const out = new Set();
  PAGES.forEach(page => {
    const html = fs.readFileSync(path.join(ROOT, page), 'utf8');
    for (const m of html.matchAll(/(?:src|href)="([^"#?]+)/g)) if (!/^(https?:|data:|mailto:)/.test(m[1])) out.add(m[1].replace(/^\.\//, ''));
  });
  return [...out];
}

function build(out, v2004) {
  const list = files().filter(p => !(v2004 && p === 'imsmanifest.xml')), have = new Set(list.concat('imsmanifest.xml'));
  const missing = referenced().filter(p => !have.has(p));
  if (missing.length) throw new Error('a page loads files that are not packaged: ' + missing.join(', '));
  fs.mkdirSync(path.dirname(out), { recursive: true });
  if (fs.existsSync(out)) fs.unlinkSync(out);
  // zip reads the names from stdin, so the list can be as long as it needs to be
  execFileSync('zip', ['-q', '-X', '-9', out, '-@'], { cwd: ROOT, input: list.join('\n') });
  if (v2004) {
    // the 2004 manifest goes in at the top under the name every LMS looks for
    const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'otr-2004-'));
    fs.copyFileSync(path.join(ROOT, 'data', 'lms', 'imsmanifest-2004.xml'), path.join(tmp, 'imsmanifest.xml'));
    execFileSync('zip', ['-q', '-X', '-9', '-j', out, path.join(tmp, 'imsmanifest.xml')]);
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  const bytes = fs.statSync(out).size;
  if (bytes > BUDGET) throw new Error(`the package is ${(bytes / 1048576).toFixed(1)} MB, over the 100 MB budget`);
  return { out, files: list.length + (v2004 ? 1 : 0), bytes };
}

module.exports = { files, referenced, build, BUDGET };

if (require.main === module) {
  const args = process.argv.slice(2), v2004 = args.includes('--2004'), named = args.find(a => a !== '--2004');
  const out = path.resolve(named || path.join(ROOT, 'dist', v2004 ? 'on-the-route-scorm2004.zip' : 'on-the-route-scorm12.zip'));
  const r = build(out, v2004);
  console.log(`${path.relative(process.cwd(), r.out)}: ${r.files} files, ${(r.bytes / 1048576).toFixed(1)} MB`);
}
