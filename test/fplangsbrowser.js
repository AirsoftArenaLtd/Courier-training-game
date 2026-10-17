/*
 * Milestone 7's cab in every language (board task A-22): the physical cab's control hints, the mirror hints, the
 * automatic rear camera, the dusk and night headlight lines and every page of the 3D guide, at larger text, in all
 * twelve languages. Each language is opened the way a trainee opens it (first-person.html?lang=xx). Every visible
 * line must stay on the canvas (and inside its panel) and must not be squeezed below a readable size.
 *
 *   QA_BROWSER=/path/to/chrome QA_BASE=http://127.0.0.1:8302 node test/fplangsbrowser.js
 *   QA_LANGS=hi,ta (a few only)   QA_LARGE=0 (normal text size)
 */
'use strict';
const fs = require('fs'), path = require('path'), pp = require('puppeteer-core');
const OUT = path.join(__dirname, 'out', 'fp-review');
fs.mkdirSync(OUT, { recursive: true });
const BASE = process.env.QA_BASE || 'http://127.0.0.1:8302';
const LANGS = (process.env.QA_LANGS || 'en,es,fr,hi,bn,mr,te,ta,gu,kn,ml,pa').split(',');
const LARGE = process.env.QA_LARGE !== '0';
const MIN_PX = 12;                                     // the smallest text the game draws on purpose is 12 px
const wait = (ms) => new Promise(r => setTimeout(r, ms));

// what is on screen, checked in the page: text off the canvas, outside the open panel, or squeezed
function audit(MIN_PX) {
  const s = OTR.game.scene.getScene('FirstPersonScene'), out = [];
  const panel = s.panel && s.panel.root, pb = panel && panel.getBounds ? panel.getBounds() : null;
  const visit = (o, inPanel) => {
    if (!o || o.visible === false || (o.alpha !== undefined && o.alpha <= 0.05)) return;
    if (o.type === 'Text' && (o.text || '').trim()) {
      const b = o.getBounds(), px = parseFloat(o.style.fontSize) * Math.min(o.scaleX, o.scaleY);
      const src = OTR.i18n.src(o);
      if (b.x < -2 || b.y < -2 || b.right > 1282 || b.bottom > 722) out.push(`off the canvas: "${src}"`);
      else if (inPanel && pb && (b.right > pb.right + 2 || b.bottom > pb.bottom + 2)) out.push(`outside its panel: "${src}"`);
      if (px < MIN_PX) out.push(`squeezed to ${px.toFixed(1)} px: "${src}"`);
    }
    (o.list || []).forEach(k => visit(k, inPanel || o === panel));
  };
  (panel ? [panel] : s.children.list).forEach(o => visit(o, o === panel));
  return out;
}

(async () => {
  const b = await pp.launch({ executablePath: process.env.QA_BROWSER || '/usr/bin/chromium', headless: true,
    args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const problems = [], errors = [];
  let views = 0;
  try {
    for (const lang of LANGS) {
      const p = await b.newPage();
      await p.setViewport({ width: 1280, height: 720 });
      p.on('pageerror', e => errors.push(`${lang}: ${e.message}`));
      await p.goto(`${BASE}/first-person.html?gfx=low&lang=${lang}`);
      const ready = () => p.waitForFunction(() => window.OTR && OTR.game && OTR.game.scene.isActive('FirstPersonScene') && !OTR.game.scene.getScene('FirstPersonScene').loading, { timeout: 60000 });
      await ready();
      await p.waitForFunction((l) => OTR.i18n.lang === l, { timeout: 30000 }, lang);
      // larger text, then a loaded van on the route with the trainee in the cab
      await p.evaluate((large) => { const s = OTR.game.scene.getScene('FirstPersonScene'); window.langToken = s.loadingToken; Object.assign(OTR.a11y.settings(), { large }); s.scene.restart(); }, LARGE);
      await p.waitForFunction(() => { const s = OTR.game.scene.getScene('FirstPersonScene'); return !s.loading && s.loadingToken !== window.langToken; }, { timeout: 60000 });
      await p.evaluate(() => { const s = OTR.game.scene.getScene('FirstPersonScene'); s.capture = () => {}; s.keyboardMode = true; s.closePanel(); s.progress.sequence = 9; s.progress.campaign = null; s.progress.welcomed = true; s.launch('campaign'); });
      await p.waitForFunction(() => !OTR.game.scene.getScene('FirstPersonScene').transitioning, { timeout: 60000 });
      const cab = () => p.evaluate(() => {
        const s = OTR.game.scene.getScene('FirstPersonScene'), m = s.model;
        s.closePanel(); m.mode = 'cab'; m.phase = 'route'; m.departed = true; m.secured = true; m.events[m.briefKey] = true; m.paused = false;
        Object.assign(m.van, { speed: 0, hand: true, belt: true, gear: 1, look: 0 }); m.player.pitch = 0; s.sync();
      });
      const check = async (label, setup) => {
        await p.evaluate(setup);
        await wait(250);
        const found = await p.evaluate(audit, MIN_PX);
        views++;
        found.forEach(f => problems.push(`${lang} ${label}: ${f}`));
      };
      await cab();
      // every cab control, mirror and the rear screen the trainee can aim at, with its hint
      const ids = await p.evaluate(() => [...new Set(OTR.game.scene.getScene('FirstPersonScene').art.interactions.map(o => o.userData.interaction).filter(id => /^(cab-|mirror-|rear)/.test(id)))]);
      for (const id of ids) await check(id, new Function(`const s=OTR.game.scene.getScene('FirstPersonScene');s.target=${JSON.stringify(id)};s.refresh();`));
      // reverse: the camera switches on by itself
      await check('reverse', () => { const s = OTR.game.scene.getScene('FirstPersonScene'); s.target = null; s.model.van.gear = -1; s.sync(); s.refresh(); });
      // dusk and night, headlights off then on
      for (const time of ['dusk', 'night']) for (const lights of [false, true]) {
        await check(`${time} lights ${lights ? 'on' : 'off'}`, new Function(`const s=OTR.game.scene.getScene('FirstPersonScene'),m=s.model;s.target=null;m.van.gear=1;
          if(m.routePlan)m.routePlan.timeOfDay=${JSON.stringify(time)};m.van.headlights=${lights};s.sync();s.refresh();`));
      }
      // the guide: its menu and every page of the workday steps
      await check('guide', () => { const s = OTR.game.scene.getScene('FirstPersonScene'); OTR.fpGuide.open(s, () => s.closePanel()); });
      for (let page = 0; page < 20; page++) {
        const shown = await p.evaluate((n) => { const s = OTR.game.scene.getScene('FirstPersonScene'); try { OTR.fpGuide.steps(s, n, () => s.closePanel()); return true; } catch (e) { return false; } }, page);
        if (!shown) break;
        await wait(250);
        (await p.evaluate(audit, MIN_PX)).forEach(f => problems.push(`${lang} guide page ${page + 1}: ${f}`));
        views++;
      }
      if (lang === 'en' || lang === 'ta' || lang === 'ml') {
        await p.evaluate(() => { const s = OTR.game.scene.getScene('FirstPersonScene'); s.closePanel(); s.model.van.gear = -1; s.sync(); s.refresh(); });
        await wait(400);
        await p.screenshot({ path: path.join(OUT, `a22-reverse-${lang}-${LARGE ? 'large' : 'normal'}.png`) });
      }
      await p.close();
      console.log(`${lang}: ${ids.length} cab targets, ${problems.filter(x => x.startsWith(lang + ' ')).length} problems`);
    }
  } finally { await b.close(); }
  problems.forEach(x => console.log('  ' + x));
  errors.forEach(x => console.log('  page error: ' + x));
  const ok = !problems.length && !errors.length;
  console.log(ok ? `${views} cab views in ${LANGS.length} languages fit` : `${problems.length} layout problems, ${errors.length} page errors`);
  process.exit(ok ? 0 : 1);
})();
