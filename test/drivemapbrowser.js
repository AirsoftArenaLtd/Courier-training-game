#!/usr/bin/env node
/*
 * B-47: the 3D workday's drive map with every kind of milestone 8 mistake on it (road signs, a red light, a wrong
 * turn, a cyclist, damage, a low bridge, a shifted load), in English and Tamil, at normal and larger text. Checks each
 * pin's shape, that the legend has one line per shape used, in the trainee's language, and that the legend, the
 * caption and the map stay inside the map's column without overlapping. Runs the suite's layout audit too, and saves
 * screenshots to test/out/drivemap-<lang>[-large].png.
 *
 *   QA_BROWSER=/path/to/chrome node test/drivemapbrowser.js        (QA_LANGS=en,ta by default)
 */
'use strict';
const fs = require('fs');
const path = require('path');
const pp = require('puppeteer-core');
const BROWSER = process.env.QA_BROWSER || '/opt/pw-browsers/chromium';
const LANGS = (process.env.QA_LANGS || 'en,ta').split(',').map(s => s.trim()).filter(Boolean);
const OUT = path.join(__dirname, 'out');
fs.mkdirSync(OUT, { recursive: true });
const QA = fs.readFileSync(path.join(__dirname, 'qa.js'), 'utf8');
const AUDIT = QA.slice(QA.indexOf('function auditLayout()'), QA.indexOf('\n}\n', QA.indexOf('function auditLayout()')) + 2);
const wait = (ms) => new Promise(r => setTimeout(r, ms));
let checks = 0;
const fails = [];
const check = (ok, what) => { checks++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) fails.push(what); };

(async () => {
  const browser = await pp.launch({ executablePath: BROWSER, headless: 'new', args: ['--no-sandbox', '--allow-file-access-from-files', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    for (const lang of LANGS) for (const large of [false, true]) {
      const tag = `${lang}${large ? ' large' : ''}`;
      const p = await browser.newPage();
      await p.setViewport({ width: 1280, height: 720 });
      const errors = [];
      p.on('pageerror', e => errors.push(e.message));
      const url = 'file://' + path.resolve(__dirname, '..', 'index.html') + `?user=drivemap&name=Sam%20Lee&lang=${lang}&dev=1`;
      const until = async (src, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await p.evaluate(src).catch(() => false)) return true; await wait(150); } return false; };
      await p.goto(url);
      if (!(await until(`OTR.game.scene.isActive('TitleScene')`, 20000))) throw new Error(`${tag}: the title never opened`);
      await p.evaluate((large) => { const A = OTR.a11y.settings(); A.large = large; OTR.a11y.save(); }, large);
      // a workday with one of each mistake, the way the 3D world reports them
      await p.evaluate(() => {
        const W = OTR.workday, at = (i) => ({ x: 9 * (i % 4) - 12, z: -11 * Math.floor(i / 4) + 6, mph: 10 + i, t: 25 * i });
        W.start(null);
        ['drive.sign-stop', 'drive.sign-giveway', 'drive.sign-speed', 'drive.sign-school'].forEach((t, i) => W.report(t, { key: 'k' + i, ok: false, where: at(i) }));
        W.report('drive.red-light', { key: 'sig1:n', ok: false, where: at(4) });
        W.report('drive.route', { key: 'leg2', stop: 2, ok: false, where: at(5) });
        W.report('drive.cyclist', { key: 'c1', ok: false, where: at(6) });
        W.report('drive.clearance', { key: 'b1', ok: false, where: at(7) });
        W.report('van.damage-dent', { key: 'left:post', where: at(8) });
        W.report('load.shift', { key: 'c1', where: at(9) });
        const rec = W.finish(null, { stops: [{ stop: 1, delivered: true, x: 20, z: -20 }, { stop: 2, delivered: false, x: -20, z: -30 }], depot: { x: 0, z: 10 } });
        const m = OTR.game.scene;
        m.getScenes(true).forEach(s => m.stop(s.sys.settings.key));
        m.start('DriveReviewScene', W.reviewData(rec, W.replay(rec.events).log, { back: 'HubScene' }));
      });
      if (!(await until(`OTR.game.scene.isActive('DriveReviewScene')`, 15000))) throw new Error(`${tag}: the drive map never opened`);
      await wait(1400);
      const r = await p.evaluate(() => {
        const s = OTR.game.scene.getScene('DriveReviewScene'), src = (o) => OTR.i18n.src(o);
        const texts = s.children.list.filter(o => o.type === 'Text' && o.visible);
        const legend = OTR.drive.MARKS.map(([m, words]) => {
          const t = texts.find(o => src(o) === words);
          return { m, words, shown: t ? t.text : null, b: t ? (({ x, y, right, bottom }) => ({ x, y, right, bottom }))(t.getBounds()) : null };
        });
        const cap = texts.find(o => /numbered pins/.test(src(o)));
        return { marks: s.pins.map(p => p.mark || '-'), legend, cap: cap && (({ x, y, right, bottom }) => ({ x, y, right, bottom }))(cap.getBounds()),
          pins: s.pinObjs.map(c => ({ x: c.x, y: c.y })), lang: OTR.i18n.lang, large: !!OTR.a11y.settings().large };
      });
      check(r.lang === lang && r.large === large, `${tag}: the page runs in ${lang}${large ? ' with larger text' : ''}`);
      check(r.marks.join(',') === 'sign,sign,sign,sign,sign,route,-,clearance,damage,load', `${tag}: pin shapes ${r.marks.join(',')}`);
      for (const l of r.legend) {
        check(!!l.b, `${tag}: a legend line for ${l.m} ("${l.shown}")`);
        if (!l.b) continue;
        if (lang !== 'en') check(l.shown !== l.words, `${tag}: the ${l.m} line is translated`);
        check(l.b.x >= 24 && l.b.right <= 844 && l.b.bottom <= 716, `${tag}: the ${l.m} line stays in the map's column (${Math.round(l.b.x)}–${Math.round(l.b.right)}, bottom ${Math.round(l.b.bottom)})`);
        check(!r.cap || r.cap.bottom <= l.b.y + 1, `${tag}: the caption ends above the ${l.m} line`);
      }
      const boxes = r.legend.filter(l => l.b).map(l => l.b);
      const overlap = boxes.some((a, i) => boxes.some((b, j) => j > i && a.x < b.right && b.x < a.right && a.y < b.bottom && b.y < a.bottom));
      check(!overlap, `${tag}: no two legend lines overlap`);
      check(r.cap && r.pins.every(c => c.x > 24 && c.x < 844 && c.y > 84 && c.y < r.cap.y), `${tag}: every pin is on the map, above the caption`);
      await p.screenshot({ path: path.join(OUT, `drivemap-${lang}${large ? '-large' : ''}.png`) });
      const found = await p.evaluate(`(${AUDIT})()`).catch(e => [{ kind: 'audit-failed', detail: e.message }]);
      found.slice(0, 8).forEach(f => console.log(`        [${f.kind}] ${f.scene || ''} ${f.what || ''} — ${f.detail || ''}`));
      check(!found.length, `${tag}: the layout audit finds nothing`);
      check(!errors.length, `${tag}: no page errors ${errors.slice(0, 2).join(' | ')}`);
      await p.close();
    }
  } finally { await browser.close(); }
  console.log(fails.length ? `\n${fails.length} of ${checks} drive map checks failed` : `\n${checks} drive map checks passed`);
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
