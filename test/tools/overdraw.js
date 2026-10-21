#!/usr/bin/env node
/*
 * B-87: how much each scene draws. For each scenario, after the intro, every visible object's on-screen area (clipped to
 * the 1280 x 720 view) is added up, in screens, and the largest are listed. On a PC without a graphics driver (a software
 * renderer such as SwiftShader) the frame rate of a 2D scene follows this number: about 9 ms a frame for each full screen.
 *
 *   node test/tools/overdraw.js m5-pod,m8-heat          (QA_BROWSER=/path/to/chrome)
 */
'use strict';
const path = require('path'), http = require('http'), fs = require('fs');
const pp = require('puppeteer-core');
const ROOT = path.resolve(__dirname, '..', '..'), PORT = Number(process.env.QA_PORT || 8362);
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': { '.js': 'text/javascript', '.html': 'text/html', '.json': 'application/json', '.png': 'image/png' }[path.extname(f)] || 'application/octet-stream' }); r.end(b); }); }).listen(PORT);
(async () => {
  const b = await pp.launch({ executablePath: process.env.QA_BROWSER || '/opt/pw-browsers/chromium', headless: 'new', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  for (const id of (process.argv[2] || 'm5-pod').split(',')) {
    const p = await b.newPage(); await p.setViewport({ width: 1280, height: 720 });
    await p.goto(`http://localhost:${PORT}/index.html?scenario=${id}&dev=1`); await wait(1700); await p.keyboard.press('Enter'); await wait(3000);
    const r = await p.evaluate(() => {
      const out = []; const W = OTR.W, H = OTR.H;
      for (const s of OTR.game.scene.getScenes(true)) {
        const cam = s.cameras.main;
        const walk = (o, px, py) => {
          if (!o.visible || o.alpha === 0) return;
          if (o.list) { o.list.forEach(c => walk(c, px + o.x * 1, py + o.y * 1)); if (o.type === 'Container') return; }
          let bb; try { bb = o.getBounds(); } catch (e) { return; }
          const sx = o.scrollFactorX === 0 ? 0 : cam.scrollX, sy = o.scrollFactorY === 0 ? 0 : cam.scrollY;
          const x0 = Math.max(0, bb.x - sx), y0 = Math.max(0, bb.y - sy), x1 = Math.min(W, bb.right - sx), y1 = Math.min(H, bb.bottom - sy);
          const a = Math.max(0, x1 - x0) * Math.max(0, y1 - y0);
          if (a > 0) out.push({ scene: s.sys.settings.key, type: o.type, key: (o.texture && o.texture.key || '').slice(0, 40), a, depth: o.depth, blend: o.blendMode });
        };
        s.children.list.forEach(o => walk(o, 0, 0));
      }
      return out;
    });
    const tot = r.reduce((n, o) => n + o.a, 0) / (1280 * 720);
    console.log(`\n${id}: ${tot.toFixed(2)} screens drawn, ${r.length} objects`);
    r.sort((a, b) => b.a - a.a).slice(0, 14).forEach(o => console.log(`  ${(o.a / (1280 * 720)).toFixed(2)}  ${o.scene} ${o.type} ${o.key} d${o.depth} b${o.blend}`));
    await p.close();
  }
  await b.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
