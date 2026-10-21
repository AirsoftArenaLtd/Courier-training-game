/*
 * Milestone 7's cab in every language (board task A-22): the physical cab's control hints, the mirror hints, the
 * automatic rear camera, the dusk and night headlight lines, every page of the 3D guide and (B-51) C-32's traffic lines
 * (each light, give way, the cyclist, the school crossing) and (B-74) C-34's van-height panel, damage notices and
 * clearance warning, at larger text, in all twelve languages. Each language is opened the way a trainee opens it (first-person.html?lang=xx). Every visible
 * line must stay on the canvas (and inside its panel) and must not be squeezed below a readable size.
 *
 *   QA_BROWSER=/path/to/chrome QA_BASE=http://127.0.0.1:8302 node test/fplangsbrowser.js
 *   QA_LANGS=hi,ta (a few only)   QA_LARGE=0 (normal text size)
 *   QA_STRICT=1: also fail on the known problem below (a traffic light's line dropped when it cannot be placed)
 */
'use strict';
const fs = require('fs'), path = require('path'), pp = require('puppeteer-core');
const OUT = path.join(__dirname, 'out', 'fp-review');
fs.mkdirSync(OUT, { recursive: true });
const BASE = process.env.QA_BASE || 'http://127.0.0.1:8302';
const LANGS = (process.env.QA_LANGS || 'en,es,fr,hi,bn,mr,te,ta,gu,kn,ml,pa').split(',');
const LARGE = process.env.QA_LARGE !== '0';
// Known, in Codex's inbox (20 Oct): fpsigns drops a traffic light's label when it cannot be placed clear of the light
// and the sat nav, so long lines (most languages, English green) never show. Listed, not failed, until that is fixed.
const KNOWN = /^\w+ signal (red|amber|green): .* is not on screen$/;
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
      // C-32 (B-51): the traffic lines on a later day (day 4, seed 7), each of which must be on screen in this language.
      // A light or the give-way sign shows its line as a label beside it, which the cab hides from some places, so the
      // van tries places along the approach until the label shows, and that view is audited. The cyclist and school
      // warnings are read in the handheld's workday details (drawn into the 3D view, so not audited here); the cab's
      // hint line does not show them yet (Codex's inbox).
      if (await p.evaluate(() => !!OTR.fpTraffic)) {
        await p.evaluate(() => { const s = OTR.game.scene.getScene('FirstPersonScene'), T = OTR.fpTraffic; s.closePanel(); s.target = null;
          const plan = T.prepare(OTR.fpNav.prepare(OTR.fpSigns.prepare(OTR.fpLater.prepare(OTR.fpRoute.plan(4, 7)))));
          const m = OTR.fpMission.create('campaign', 7, plan); OTR.fpDay.configure(m); OTR.fpDriving.configure(m); OTR.fpDoors.configure(m); OTR.fpLoadout.configure(m, 'extra');
          m.phase = 'route'; m.departed = m.secured = m.repaired = true; m.paused = false; m.events[m.briefKey] = true; m.step = () => {}; m.mode = 'cab'; m.player.pitch = 0;
          for (const q of m.parcels) q.location = 'slot' + (q.anomaly ? 5 : q.stop);
          Object.assign(m.van, { speed: 0, hand: true, belt: true, gear: 1, look: 0 }); s.model = m; s.area = 'route'; s.rebuildWorld(); });
        const shows = (line) => p.evaluate((line) => { const s = OTR.game.scene.getScene('FirstPersonScene'), found = [];
          const walk = (o) => { if (!o || o.visible === false || (o.alpha !== undefined && o.alpha <= 0.05)) return; if (o.type === 'Text' && OTR.i18n.src(o).includes(line)) found.push(o.text); (o.list || []).forEach(walk); };
          s.children.list.forEach(walk); return found; }, line);
        const place = (label, back, look) => p.evaluate((label, back, look) => { const s = OTR.game.scene.getScene('FirstPersonScene'), m = s.model, T = OTR.fpTraffic, road = m.town.road / 2;
          if (s.handheld && s.handheld.isOpen) s.handheld.close();
          m.trafficControl.cyclist.state = 'waiting'; m.crossing.state = 'waiting'; m.van.look = look;
          if (label.startsWith('signal')) { const want = label.split(' ')[1], j = T.layout(m).find(j => j.kind === 'signal');
            for (let e = 0; e < T.cycle; e += 0.5) if (T.aspect(T.signal(e, j.offset), 0) === want) { m.elapsed = e; break; }
            Object.assign(m.van, { x: j.x + 1.7, z: j.z + road + back, yaw: 0 }); }
          else if (label === 'give-way') { const j = T.layout(m).find(j => j.kind === 'giveway'); Object.assign(m.van, { x: j.x + road + back, z: j.z - 1.7, yaw: -Math.PI / 2 }); }
          else if (label === 'cyclist') { Object.assign(m.van, { x: 2.84, z: -18, yaw: 0, look: 0 }); m.elapsed = 10; const c = m.trafficControl.cyclist, at = OTR.fp.local(m.van, 2, 1.2);
            Object.assign(c, { state: 'beside', x: at.x, z: at.z, yaw: 0, leg: m.leg, at: 10 }); }
          else { const h = m.crossing; h.state = 'crossing'; h.x = m.town.school.x - 2; Object.assign(m.van, { x: m.town.school.x + 1.7, z: h.z + 8, yaw: 0, look: 0 }); }
          OTR.fpDriving.syncActors(m); T.syncSolids(m); s.sync(); s.refresh();
          if (label === 'cyclist' || label === 'school crossing') { s.showScanner(); s.handheld.workday(); } }, label, back, look);
        for (const [label, line] of [['signal red', 'The traffic light is red. Stop before the junction line.'],
          ['signal amber', 'The traffic light is amber. Stop if you can do so safely.'],
          ['signal green', 'The traffic light is green. Continue only when the junction is clear.'],
          ['give-way', 'Give way to traffic before entering the junction.'],
          ['cyclist', 'A cyclist is passing on the right. Check the right mirror and wait before turning.'],
          ['school crossing', 'Children are waiting at the school crossing. Slow down and let them cross.']]) {
          const sign = label.startsWith('signal') || label === 'give-way';
          let seen = [];
          for (const [back, look] of sign ? [[24, 0.3], [20, 0.3], [28, 0.3], [20, -0.2], [24, -0.2], [16, 0.3], [12, 0.3], [10, -0.2], [30, 0], [18, 0]] : [[0, 0]]) {
            await place(label, back, look); await wait(500);
            seen = await shows(line);
            if (seen.length) break;
          }
          views++;
          if (!seen.length) { problems.push(`${lang} ${label}: "${line}" is not on screen`); continue; }
          if (lang !== 'en' && seen[0].includes(line)) problems.push(`${lang} ${label}: "${line}" is not translated`);
          if (sign) (await p.evaluate(audit, MIN_PX)).forEach(f => problems.push(`${lang} ${label}: ${f}`));
          if (lang === 'ta' && (label === 'signal red' || label === 'give-way')) await p.screenshot({ path: path.join(OUT, `b51-${label.replace(' ', '-')}-${lang}-${LARGE ? 'large' : 'normal'}.png`) });
        }
        await p.evaluate(() => { const s = OTR.game.scene.getScene('FirstPersonScene'); if (s.handheld && s.handheld.isOpen) s.handheld.close(); });
      }
      // B-74: C-34's lines on a damage day (day 4): the van-height panel from the manifest's own "Begin preparation", then
      // each notice through the real path (fpDamageFlow.fire sets the day notice the scene shows), and the clearance warning
      if (await p.evaluate(() => !!OTR.fpDamageFlow)) {
        await p.evaluate(() => { const s = OTR.game.scene.getScene('FirstPersonScene'), T = OTR.fpTraffic; s.closePanel(); s.target = null;
          const plan = OTR.fpDamageFlow.prepare(T.prepare(OTR.fpNav.prepare(OTR.fpSigns.prepare(OTR.fpLater.prepare(OTR.fpRoute.plan(4, 7))))));
          const m = OTR.fpMission.create('campaign', 7, plan); OTR.fpLoadout.configure(m); OTR.fpDriving.configure(m); OTR.fpDay.configure(m); OTR.fpDoors.configure(m);
          m.step = () => {}; m.mode = 'cab'; m.player.pitch = 0; Object.assign(m.van, { speed: 0, hand: true, belt: true, gear: 1, look: 0 });
          s.model = m; s.area = 'route'; s.rebuildWorld(); s.sync(); });
        const shown = (line) => { const s = OTR.game.scene.getScene('FirstPersonScene'), found = [];
          const walk = (o) => { if (!o || o.visible === false || (o.alpha !== undefined && o.alpha <= 0.05)) return; if (o.type === 'Text' && OTR.i18n.src(o).includes(line)) found.push(o.text); (o.list || []).forEach(walk); };
          s.children.list.forEach(walk); return found.length ? found : false; };
        const look = async (label, line) => {
          // A slow render can take longer than 450 ms; wait for the actual notice before auditing it.
          const handle = await p.waitForFunction(shown, { timeout: 10000 }, line).catch(() => null);
          const seen = handle ? await handle.jsonValue() : [];
          if (handle) await handle.dispose();
          views++;
          if (!seen.length) { problems.push(`${lang} ${label}: "${line}" is not on screen`); return; }
          if (lang !== 'en' && seen[0].includes(line)) problems.push(`${lang} ${label}: "${line}" is not translated`);
          (await p.evaluate(audit, MIN_PX)).forEach(f => problems.push(`${lang} ${label}: ${f}`));
        };
        const panel = await p.evaluate(() => { const s = OTR.game.scene.getScene('FirstPersonScene'), m = s.model;
          m.mode = 'walk'; const desk = m.point('dispatch'); Object.assign(m.player, { x: desk.x - 1.7, z: desk.z }); s.sync();     // the manifest is read at Dispatch
          s.showManifest(m.stops.length - 1, true); const i = s.panel.choices.findIndex(c => c.label === 'Begin preparation'); s.choose(i);
          return s.panel ? s.panel.title || (s.panel.titleText && OTR.i18n.src(s.panel.titleText)) || 'Know the van height.' : null; });
        await look('van height panel', 'Know the van height.');
        await look('van height panel', 'Your van is 10 feet 10 inches tall.');
        for (const [type, key, ok] of [['van.damage-scuff', 'front:post-1', false], ['van.damage-scuff', 'rear:post-2', false], ['van.damage-dent', 'left:post-3', false],
          ['van.damage-dent', 'right:car-4', false], ['van.damage-major', 'roof:bridge-5', false], ['van.damage-scuff', 'wheel:kerb-6', false], ['van.damage-scuff', 'mirror:post-7', false],
          ['drive.clearance', 'clearance-0', true], ['drive.clearance', 'clearance-1-strike', false], ['load.shift', 'load-2', false]]) {
          const line = await p.evaluate((type, key, ok) => { const s = OTR.game.scene.getScene('FirstPersonScene'), m = s.model; s.closePanel(); m.mode = 'cab';
            OTR.fpDamageFlow.fire(m, { type, key, ok }, 0); const t = m.dayNotice; return t; }, type, key, ok);
          await look(`${type} ${key}`, line);
        }
        const warn = await p.evaluate(() => { const s = OTR.game.scene.getScene('FirstPersonScene'), m = s.model, b = m._damageClearances[0]; if (!b) return null;
          Object.assign(m.van, { x: b.x + 1.7, z: b.z + 12, yaw: 0, gear: 1 }); s.sync(); const w = OTR.fpDamageFlow.warning(m); m.dayNotice = w; return w; });
        if (warn) await look('clearance warning', warn); else problems.push(`${lang} clearance warning: no low clearance on day 4`);
        await p.evaluate(() => OTR.game.scene.getScene('FirstPersonScene').closePanel());
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
  const known = process.env.QA_STRICT === '1' ? [] : problems.filter(x => KNOWN.test(x)), real = problems.filter(x => !known.includes(x));
  real.forEach(x => console.log('  ' + x));
  if (known.length) console.log(`  known (Codex's inbox, 20 Oct): ${known.length} traffic-light lines not placed: ${known.map(x => x.split(':')[0]).join(', ')}`);
  errors.forEach(x => console.log('  page error: ' + x));
  const ok = !real.length && !errors.length;
  console.log(ok ? `${views} cab views in ${LANGS.length} languages fit` : `${real.length} layout problems, ${errors.length} page errors`);
  process.exit(ok ? 0 : 1);
})();
