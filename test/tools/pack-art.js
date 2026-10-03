#!/usr/bin/env node
/*
 * Pack the real images in assets/img/ into assets/art-pack.js (see src/core/assets.js).
 *
 * For each image named in OTR.assets.KEYS (or its "_real" alternative), in a headless browser:
 *   - a solid background is removed if the image came without transparency (flood-filled in from the edges, so a
 *     white van on a white background keeps its white roof)
 *   - the empty margin is trimmed
 *   - it is scaled to twice the size the game draws it at, and stored as WebP
 * Files that match no name are listed and skipped. Nothing in the game changes until this is run.
 *
 *   node test/tools/pack-art.js            (QA_BROWSER=/path/to/chrome if it is not the default)
 */
'use strict';
const fs = require('fs');
const path = require('path');
const puppeteer = require(path.join(__dirname, '..', 'node_modules', 'puppeteer-core'));
const ROOT = path.resolve(__dirname, '..', '..');
const DIR = path.join(ROOT, 'assets', 'img');
const OUT = path.join(ROOT, 'assets', 'art-pack.js');

global.window = { OTR: {}, location: { search: '' } };
global.OTR = window.OTR;
require(path.join(ROOT, 'src', 'core', 'assets.js'));
const KEYS = window.OTR.assets.KEYS;

(async () => {
  const files = fs.existsSync(DIR) ? fs.readdirSync(DIR).filter(f => /\.(png|webp|jpe?g)$/i.test(f)) : [];
  const jobs = [], skipped = [];
  files.forEach(f => {
    const name = f.replace(/\.(png|webp|jpe?g)$/i, '');
    const spec = KEYS[name.replace(/_real$/, '')];
    if (!spec) { skipped.push(f); return; }
    const mime = /\.png$/i.test(f) ? 'image/png' : /\.webp$/i.test(f) ? 'image/webp' : 'image/jpeg';
    jobs.push({ name, w: spec.box[2] * 2, h: spec.box[3] * 2, aspect: spec.aspect || spec.box[2] / spec.box[3], src: `data:${mime};base64,` + fs.readFileSync(path.join(DIR, f)).toString('base64') });
  });
  if (!jobs.length) { console.log('No images to pack in assets/img/.'); }
  const b = await puppeteer.launch({ executablePath: process.env.QA_BROWSER || '/opt/pw-browsers/chromium', headless: 'new', args: ['--no-sandbox'] });
  const p = await b.newPage();
  const pack = {}, report = [];
  for (const j of jobs) {
    const r = await p.evaluate(async (j) => {
      const img = new Image(); img.src = j.src; await img.decode();
      const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
      const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0);
      const W = c.width, H = c.height, d = x.getImageData(0, 0, W, H), px = d.data;
      // a solid background: the four corners opaque and alike. Remove whatever is connected to the edges and close
      // to that colour.
      const at = (i) => [px[i], px[i + 1], px[i + 2], px[i + 3]];
      const corners = [0, (W - 1) * 4, (H - 1) * W * 4, ((H - 1) * W + W - 1) * 4].map(at);
      const near = (a, b2, t) => Math.abs(a[0] - b2[0]) + Math.abs(a[1] - b2[1]) + Math.abs(a[2] - b2[2]) < t;
      let keyed = false;
      if (corners.every(c2 => c2[3] > 250) && corners.every(c2 => near(c2, corners[0], 30))) {
        keyed = true;
        const bg = corners[0], seen = new Uint8Array(W * H), stack = [];
        for (let i = 0; i < W; i++) { stack.push(i, (H - 1) * W + i); }
        for (let i = 0; i < H; i++) { stack.push(i * W, i * W + W - 1); }
        while (stack.length) {
          const k = stack.pop();
          if (seen[k]) continue;
          seen[k] = 1;
          if (!near(at(k * 4), bg, 40)) continue;
          px[k * 4 + 3] = 0;
          const xx = k % W, yy = (k - xx) / W;
          if (xx > 0) stack.push(k - 1); if (xx < W - 1) stack.push(k + 1);
          if (yy > 0) stack.push(k - W); if (yy < H - 1) stack.push(k + W);
        }
        x.putImageData(d, 0, 0);
      }
      // trim to what is visible
      let x0 = W, y0 = H, x1 = -1, y1 = -1;
      for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < W; xx++) {
        if (px[(yy * W + xx) * 4 + 3] > 8) { if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (yy < y0) y0 = yy; if (yy > y1) y1 = yy; }
      }
      if (x1 < 0) return { error: 'the image is empty' };
      const o = document.createElement('canvas'); o.width = j.w; o.height = j.h;
      const ox = o.getContext('2d'); ox.imageSmoothingQuality = 'high';
      ox.drawImage(c, x0, y0, x1 - x0 + 1, y1 - y0 + 1, 0, 0, j.w, j.h);
      // against the shape it shows on screen (a vehicle's box is squeezed to its real size afterwards)
      const aspectIn = (x1 - x0 + 1) / (y1 - y0 + 1), aspectOut = j.aspect;
      return { data: o.toDataURL('image/webp', 0.9), keyed, from: `${W}x${H}`, trimmed: `${x1 - x0 + 1}x${y1 - y0 + 1}`, stretch: +(aspectOut / aspectIn).toFixed(2) };
    }, j);
    if (r.error) { report.push(`${j.name}: ${r.error}`); continue; }
    pack[j.name] = r.data;
    const warn = Math.abs(r.stretch - 1) > 0.15 ? `  ⚠ stretched ${r.stretch}× to fit: the shape is off, worth regenerating` : '';
    report.push(`${j.name}: ${r.from} → trimmed ${r.trimmed} → ${j.w}x${j.h}${r.keyed ? ' (background removed)' : ''}, ${Math.round(r.data.length / 1024)} KB${warn}`);
  }
  await b.close();
  const body = '/* Packed images (written by test/tools/pack-art.js from assets/img/; see src/core/assets.js). */\nwindow.OTR_ART = {\n' +
    Object.keys(pack).sort().map(k => `  ${JSON.stringify(k)}: ${JSON.stringify(pack[k])}`).join(',\n') + '\n};\n';
  fs.writeFileSync(OUT, body);
  report.forEach(l => console.log(l));
  if (skipped.length) console.log('Skipped (no such image name): ' + skipped.join(', '));
  console.log(`assets/art-pack.js: ${Object.keys(pack).length} image(s), ${Math.round(fs.statSync(OUT).size / 1024)} KB`);
})();
