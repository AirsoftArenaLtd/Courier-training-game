/*
 * The LMS package (test/tools/package-scorm.js): only run-time files, the manifest at the top, every file a page loads,
 * no tests, docs, server or raw downloads, inside the size budget. No browser.
 *   node test/package.js
 */
'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('fs'), os = require('os'), path = require('path');
const { execFileSync } = require('child_process');
const P = require('./tools/package-scorm.js');

test('the package holds the run-time files and nothing else', () => {
  const list = P.files();
  ['imsmanifest.xml', 'index.html', 'first-person.html', 'lib/three.min.js', 'src/core/save.js', 'data/workday_events.js', 'data/i18n/ta.js']
    .forEach(f => assert.ok(list.includes(f), f + ' is packaged'));
  const bad = list.filter(f => /^(test|docs|server)\//.test(f) || /node_modules|^assets\/_incoming\/|^data\/i18n\/src\/|catalogue\.json$|^(AGENTS|CLAUDE|HANDOFF|README)\.md$/.test(f));
  assert.deepEqual(bad, [], 'no tests, docs, server, agent notes or translators\' sources');
  const missing = P.referenced().filter(f => !list.includes(f));
  assert.deepEqual(missing, [], 'every file a page loads is packaged');
  // every 3D asset pack that ships keeps its licence
  list.filter(f => /^assets\/3d\/[^/]+\//.test(f)).map(f => f.split('/')[2]).filter((v, i, a) => a.indexOf(v) === i)
    .forEach(pack => assert.ok(list.some(f => new RegExp(`^assets/3d/${pack}/licen[cs]e`, 'i').test(f)), pack + ' ships its licence'));
});

test('the zip builds with the manifest at the top and stays inside the budget', { skip: !fs.existsSync('/usr/bin/zip') && 'zip is not installed' }, () => {
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'otr-pkg-')), 'pkg.zip');
  const r = P.build(out);
  assert.ok(r.bytes < P.BUDGET);
  const names = execFileSync('unzip', ['-Z1', out]).toString().trim().split('\n');
  assert.ok(names.includes('imsmanifest.xml'), 'imsmanifest.xml at the top of the zip');
  assert.equal(names.length, r.files);
  fs.rmSync(path.dirname(out), { recursive: true, force: true });
});

test('the SCORM 2004 package has the 2004 manifest at the top and the same game files', { skip: !fs.existsSync('/usr/bin/zip') && 'zip is not installed' }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'otr-pkg-')), out = path.join(dir, 'pkg2004.zip');
  const r = P.build(out, true);
  const names = execFileSync('unzip', ['-Z1', out]).toString().trim().split('\n');
  assert.equal(names.length, r.files);
  assert.equal(names.filter(n => n === 'imsmanifest.xml').length, 1, 'one manifest, at the top');
  const manifest = execFileSync('unzip', ['-p', out, 'imsmanifest.xml']).toString();
  assert.match(manifest, /2004 4th Edition/); assert.match(manifest, /adlcp:scormType="sco"/);
  assert.ok(!names.some(n => n.startsWith('data/lms/')), 'the manifest source is not shipped twice');
  ['index.html', 'first-person.html', 'src/core/identity.js'].forEach(f => assert.ok(names.includes(f), f));
  fs.rmSync(dir, { recursive: true, force: true });
});
