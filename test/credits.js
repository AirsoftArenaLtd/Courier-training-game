/*
 * The asset credits (board task B-28): data/credits.js and docs/ASSETS.md list every pack in assets/3d/manifest.json
 * with its author, a CC0 licence and where it came from, and are up to date. No browser.
 *   node test/credits.js
 */
'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), { execFileSync } = require('child_process'), path = require('path');
const C = require('./tools/credits.js');

test('every shipped pack is credited with its author, a CC0 licence and its source', () => {
  const list = C.packs();
  assert.ok(list.length > 0);
  list.forEach(c => {
    assert.ok(c.author, c.pack + ': an author');
    assert.match(c.licence, /CC0/, c.pack + ': CC0');
    assert.match(c.url, /^https:\/\//, c.pack + ': where it came from');
  });
});

test('data/credits.js and docs/ASSETS.md are up to date (node test/tools/credits.js)', () => {
  execFileSync(process.execPath, [path.join(__dirname, 'tools', 'credits.js'), '--check'], { stdio: 'pipe' });
});
