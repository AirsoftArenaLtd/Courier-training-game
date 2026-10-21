#!/usr/bin/env node
/*
 * B-115: C-36's radio message and night warning in every language with larger text (Codex checked English and Tamil).
 * For each language, with larger text on: the owner's day-4 review link (B-105, route 10: a priority call) and the
 * radio message read on the handheld, parked, where every line must sit inside the device's screen; then the day-6 link
 * (route 9, at night) in the cab with the headlights off, where the warning caption must show in full on the canvas.
 *
 *   QA_BROWSER=/path/to/chrome node test/radionightbrowser.js        (QA_LANGS=en,bn,... to choose; all 12 by default)
 */
'use strict';
const path = require('path');
const pp = require('puppeteer-core');
const BROWSER = process.env.QA_BROWSER || '/opt/pw-browsers/chromium';
const LANGS = (process.env.QA_LANGS || 'en,bn,es,fr,gu,hi,kn,ml,mr,pa,ta,te').split(',').map(s => s.trim()).filter(Boolean);
const PAGE = process.env.QA_BASE ? process.env.QA_BASE.replace(/\/+$/, '') + '/index.html' : 'file://' + path.resolve(__dirname, '..', 'index.html');
const wait = (ms) => new Promise(r => setTimeout(r, ms));
let checks = 0;
const fails = [];
const check = (ok, what) => { checks++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) fails.push(what); };

(async () => {
  const b = await pp.launch({ executablePath: BROWSER, headless: true, args: ['--no-sandbox', '--allow-file-access-from-files', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const errors = [];
  // the 3D day from the hub, as the owner's link starts it, with larger text and low graphics set in the save
  const day = async (lang, route, dayN) => {
    const p = await b.newPage();
    await p.setViewport({ width: 1280, height: 720 });
    p.on('pageerror', e => errors.push(`${lang} day ${dayN}: ${e.message}`));
    await p.evaluateOnNewDocument(() => {
      const O = window.OTR = window.OTR || {}; let save;
      Object.defineProperty(O, 'save', { configurable: true, get: () => save, set: (v) => { save = v; const load = v.load;
        v.load = function () { const r = load.apply(this, arguments); this.data.settings.a11y = Object.assign({ keys: {}, large: false, colour: false, narrate: false }, this.data.settings.a11y, { large: true }); this.data.settings.gfx = 'low'; return r; }; } });
    });
    await p.goto(PAGE + `?dev=1&workday3d=1&user=review-${lang}-${dayN}&name=Owner&route=${route}&day=${dayN}&lang=${lang}`);
    const until = async (src, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await p.evaluate(src).catch(() => false)) return true; await wait(250); } return false; };
    await until(`OTR.game.scene.isActive('HubScene') || OTR.game.scene.isActive('TitleScene')`, 30000);
    if (await p.evaluate(`OTR.game.scene.isActive('TitleScene')`)) await p.evaluate(() => { const m = OTR.game.scene; m.getScenes(true).forEach(s => m.stop(s.sys.settings.key)); m.start('HubScene'); });
    await until(`OTR.game.scene.isActive('HubScene')`, 10000); await wait(800);
    await p.evaluate(() => { const s = OTR.game.scene.getScene('HubScene'); const f = s.focusables.find(o => o.label && /Start workday/.test(OTR.i18n.src(o.label))); if (f) f.press(); });
    await wait(800);
    await p.evaluate(() => { const st = OTR.game.scene.getScene('HubScene')._modalStack || []; const top = st[st.length - 1]; const walk = (c) => { for (const o of c.list || []) { if (o.press && o.label && /^Start/.test(OTR.i18n.src(o.label))) { o.press(); return true; } if (walk(o)) return true; } return false; }; if (top) walk(top); });
    const ok = await until(`!!(OTR.game.scene.isActive('FirstPersonScene') && OTR.game.scene.getScene('FirstPersonScene').model)`, 120000);
    return { p, until, ok };
  };
  try {
    for (const lang of LANGS) {
      // ---- the radio message on the handheld (day 4: a priority call), parked in the cab
      {
        const { p, ok } = await day(lang, 10, 4);
        check(ok, `${lang}: the day-4 link starts the 3D day`);
        if (ok) {
          // the day may still be opening (the first panel, the van settling): try again until the handheld shows it
          let r;
          for (let n = 0; n < 10; n++) {
            r = await p.evaluate(() => {
              const s = OTR.game.scene.getScene('FirstPersonScene'), m = s.model;
              s.closePanel && s.closePanel();
              Object.assign(m, { mode: 'cab', phase: 'route', departed: true }); Object.assign(m.van, { speed: 0, hand: true });
              m.radio.sent = true; m.radio.travel = 20;
              OTR.fpRadioUI.open(s);
              return { open: s.handheld.isOpen, title: s.handheld.device.current && s.handheld.device.current.title, large: OTR.fpAccess.settings().large, lang: OTR.i18n.lang, parked: m.parked(), notice: s.notice };
            });
            if (r.open && r.title === 'The dispatch radio.') break;
            await wait(700);
          }
          check(r.open && r.title === 'The dispatch radio.' && r.large && r.lang === lang, `${lang}: the radio message opens on the handheld with larger text (${JSON.stringify(r)})`);
          await wait(1200);                                       // the device slides up
          const bad = await p.evaluate(() => {
            const hh = OTR.game.scene.getScene('FirstPersonScene').handheld.device, out = [];
            hh.screen.list.filter(o => o.type === 'Text' && o.visible).forEach(o => { const b = o.getBounds();
              if (b.bottom > hh.root.y + hh.sy + hh.sh + 2 || b.right > hh.root.x + hh.sx + hh.sw + 2 || b.x < hh.root.x + hh.sx - 2) out.push(OTR.i18n.src(o).slice(0, 50)); });
            return out;
          });
          check(!bad.length, `${lang}: every line of the radio message fits the handheld's screen${bad.length ? ': ' + bad.join(' | ') : ''}`);
          if (bad.length) await p.screenshot({ path: path.join(__dirname, 'out', `b115-radio-${lang}.png`) }).catch(() => {});
        }
        await p.close();
      }
      // ---- the night warning (day 6), in the cab with the headlights off
      {
        const { p, until, ok } = await day(lang, 9, 6);
        check(ok, `${lang}: the day-6 link starts the 3D day`);
        if (ok) {
          await p.evaluate(() => { const s = OTR.game.scene.getScene('FirstPersonScene'), m = s.model; s.closePanel && s.closePanel(); Object.assign(m, { mode: 'cab', phase: 'route', departed: true }); Object.assign(m.van, { speed: 0, hand: true, headlights: false }); });
          const shown = await until(`(() => { const s = OTR.game.scene.getScene('FirstPersonScene'); return s.soundCue.visible && /headlights/.test(OTR.i18n.src(s.soundCue) || ''); })()`, 15000);
          const c = await p.evaluate(() => { const s = OTR.game.scene.getScene('FirstPersonScene'), t = s.soundCue, b = t.getBounds(); return { src: OTR.i18n.src(t), text: t.text, x: b.x, y: b.y, r: b.right, bt: b.bottom, back: s.headerBack.displayWidth }; });
          check(shown, `${lang}: the night warning shows in the cab with the headlights off (${c.src})`);
          check(c.x >= 0 && c.y >= 0 && c.r <= 1280 && c.bt <= 720 && c.r - c.x <= c.back, `${lang}: the warning fits on the canvas and on its backing (${JSON.stringify({ x: Math.round(c.x), r: Math.round(c.r), bottom: Math.round(c.bt), back: Math.round(c.back) })})`);
          if (!shown) await p.screenshot({ path: path.join(__dirname, 'out', `b115-night-${lang}.png`) }).catch(() => {});
        }
        await p.close();
      }
    }
    check(!errors.length, 'no page errors ' + errors.slice(0, 2).join(' | '));
  } finally { await b.close(); }
  console.log(fails.length ? `\n${fails.length} of ${checks} radio and night checks failed` : `\n${checks} radio and night checks passed`);
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
