#!/usr/bin/env node
/*
 * The image pipeline (src/core/assets.js, test/tools/pack-art.js): images in assets/img/ are packed, and the game draws
 * them in place of the drawn art, at the drawn art's size; ?art=drawn ignores them; a white background is removed.
 * It sets any real images aside, packs two temporary ones, checks the game, and puts assets/img/ and
 * assets/art-pack.js back as they were.
 *
 *   QA_BROWSER=/path/to/chrome node test/art.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const puppeteer = require('puppeteer-core');
const ROOT = path.resolve(__dirname, '..');
const IMG = path.join(ROOT, 'assets', 'img'), PACK = path.join(ROOT, 'assets', 'art-pack.js');
const BROWSER = process.env.QA_BROWSER || '/opt/pw-browsers/chromium';
const fails = [];
const check = (ok, what) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) fails.push(what); };
const wait = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  const packBefore = fs.readFileSync(PACK, 'utf8');
  const made = [];
  // the real images go aside while the test images stand in for them (a real van_top.webp would win over the test's .png)
  const ASIDE = fs.mkdtempSync(path.join(ROOT, 'assets', '.img-aside-'));
  const real = fs.readdirSync(IMG).filter(f => /\.(png|webp|jpe?g)$/i.test(f));
  real.forEach(f => fs.renameSync(path.join(IMG, f), path.join(ASIDE, f)));
  const b = await puppeteer.launch({ executablePath: BROWSER, headless: 'new', args: ['--no-sandbox', '--allow-file-access-from-files', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    const p = await b.newPage();
    await p.setViewport({ width: 1280, height: 720 });
    // two images: a "van" on a white background (as ChatGPT sometimes returns), a "car" on transparency
    const mk = (bg, body) => p.evaluate((bg, body) => {
      const c = document.createElement('canvas'); c.width = 500; c.height = 1000; const x = c.getContext('2d');
      if (bg) { x.fillStyle = bg; x.fillRect(0, 0, 500, 1000); }
      x.fillStyle = body; x.fillRect(100, 100, 300, 610);
      return c.toDataURL('image/png').split(',')[1];
    }, bg, body);
    for (const [name, bg, body] of [['van_top', '#ffffff', '#00ff00'], ['car_top_red', null, '#0000ff']]) {
      const f = path.join(IMG, name + '.png');
      fs.writeFileSync(f, Buffer.from(await mk(bg, body), 'base64'));
      made.push(f);
    }
    const out = execFileSync('node', [path.join(ROOT, 'test', 'tools', 'pack-art.js')], { encoding: 'utf8', env: Object.assign({}, process.env, { QA_BROWSER: BROWSER }) });
    check(/van_top: .*\(background removed\)/.test(out) && /car_top_red: /.test(out), 'the pack tool packs both and removes the white background');

    const sample = (q) => p.goto('file://' + path.join(ROOT, 'index.html') + '?lab=town&dev=1' + q)
      .then(() => p.waitForFunction(() => window.OTR && OTR.game && OTR.game.scene.isActive('TownDriveScene'), { timeout: 30000 }))
      .then(() => wait(800))
      .then(() => p.evaluate(() => {
        const px = (key, x, y) => { const src = OTR.game.textures.get(key).getSourceImage(); const c = src.getContext ? src : null; if (!c) return null; const d = c.getContext('2d').getImageData(x, y, 1, 1).data; return [d[0], d[1], d[2], d[3]]; };
        return { van: px('van_top', 37, 70), vanCorner: px('van_top', 7, 9), car: px('car_top_' + 0xC8243B, 32, 58), size: [OTR.game.textures.get('van_top').source[0].width, OTR.game.textures.get('van_top').source[0].height] };
      }));
    const on = await sample('');
    check(on.van && on.van[1] > 200 && on.van[0] < 60 && on.car && on.car[2] > 200, `the game draws the images in place of the drawn van and car (${JSON.stringify(on)})`);
    check(on.vanCorner && on.vanCorner[3] < 250 || (on.vanCorner && on.vanCorner[1] > 200), 'the image fills the drawn art\'s box');
    check(on.size[0] === 74 && on.size[1] === 140, 'the van texture keeps its size, so its sprite keeps its scale');
    const off = await sample('&art=drawn');
    check(off.van && !(off.van[1] > 200 && off.van[0] < 60), '?art=drawn ignores the images');
  } catch (e) {
    check(false, 'script error: ' + (e && e.stack || e));
  } finally {
    made.forEach(f => fs.unlinkSync(f));
    real.forEach(f => fs.renameSync(path.join(ASIDE, f), path.join(IMG, f)));
    fs.rmdirSync(ASIDE);
    fs.writeFileSync(PACK, packBefore);
    await b.close();
  }
  console.log(fails.length ? `\n${fails.length} failed` : '\nall art pipeline checks passed');
  process.exit(fails.length ? 1 : 0);
})();
