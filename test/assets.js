/*
 * The 3D asset rules in docs/ASSETS.md (assets/3d/; the 2D art in assets/img has its own pipeline): every shipped file is listed in assets/3d/manifest.json with its real size, every pack
 * keeps its licence (CC0) and source note, formats and sizes stay inside the budget. Passes trivially until the first pack
 * arrives. No browser.
 *   node test/assets.js
 */
'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('fs'), path = require('path');

const ROOT = path.join(__dirname, '..'), DIR = path.join(ROOT, 'assets', '3d');
const MB = 1024 * 1024;
const BUDGET = { all: 40 * MB, low: 15 * MB, model: 3 * MB, texture: 2 * MB };
const KINDS = { '.glb': 'model', '.jpg': 'texture', '.jpeg': 'texture', '.png': 'texture', '.ogg': 'sound', '.mp3': 'sound' };
const PACK_FILES = /^(LICENSE|License|license)(\.txt|\.md)?$|^SOURCE\.md$/;

const walk = (d) => fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }).flatMap(e => {
  const p = path.join(d, e.name);
  return e.isDirectory() ? (e.name === '_incoming' ? [] : walk(p)) : [p];
}) : [];
const rel = (p) => path.relative(DIR, p).split(path.sep).join('/');
const manifest = () => {
  const f = path.join(DIR, 'manifest.json');
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : { files: [] };
};

test('every shipped file is in the manifest with its real size, and every manifest entry exists', () => {
  const m = manifest(), listed = new Map((m.files || []).map(f => [f.path, f]));
  const shipped = walk(DIR).map(rel).filter(p => p !== 'manifest.json' && !PACK_FILES.test(path.basename(p)) && !p.startsWith('README'));
  shipped.forEach(p => assert.ok(listed.has(p), `${p} is shipped but not in assets/3d/manifest.json`));
  listed.forEach((f, p) => {
    const full = path.join(DIR, p);
    assert.ok(fs.existsSync(full), `${p} is in the manifest but missing`);
    assert.equal(f.bytes, fs.statSync(full).size, `${p}: the manifest size is out of date`);
    assert.ok(f.pack && f.use, `${p}: says which pack it comes from and what it is for`);
    assert.ok(['low', 'high', 'both'].includes(f.quality || 'both'), `${p}: quality is low, high or both`);
  });
});

test('every pack keeps a CC0 licence and a source note', () => {
  const packs = new Set((manifest().files || []).map(f => f.path.split('/')[0]));
  packs.forEach(pack => {
    const dir = path.join(DIR, pack), files = fs.existsSync(dir) ? fs.readdirSync(dir) : [];
    const lic = files.find(f => /^licen[cs]e/i.test(f));
    assert.ok(lic, `${pack}: a licence file`);
    const text = fs.readFileSync(path.join(dir, lic), 'utf8');
    assert.match(text, /CC0|Creative Commons Zero|public domain/i, `${pack}: the licence is CC0`);
    assert.ok(files.includes('SOURCE.md'), `${pack}: SOURCE.md says where it came from`);
  });
});

test('formats and sizes stay inside the budget', () => {
  const files = manifest().files || [];
  let all = 0, low = 0;
  files.forEach(f => {
    const kind = KINDS[path.extname(f.path).toLowerCase()];
    assert.ok(kind, `${f.path}: allowed formats are .glb, .jpg, .png, .ogg and .mp3`);
    all += f.bytes;
    if ((f.quality || 'both') !== 'high') low += f.bytes;
    if (kind === 'model') assert.ok(f.bytes <= BUDGET.model, `${f.path}: a model is at most 3 MB`);
    if (kind === 'texture') assert.ok(f.bytes <= BUDGET.texture, `${f.path}: a texture is at most 2 MB`);
  });
  assert.ok(all <= BUDGET.all, `all assets ${(all / MB).toFixed(1)} MB, budget 40 MB`);
  assert.ok(low <= BUDGET.low, `Low-setting assets ${(low / MB).toFixed(1)} MB, budget 15 MB`);
});
