#!/usr/bin/env node
/*
 * The owner's review set (board task A-23): the same fixed views of the 3D workday, captured the same way at every
 * milestone, so the owner can compare before and after in a few minutes instead of playing a whole day.
 *
 *   QA_BROWSER=/path/to/chrome QA_BASE=http://127.0.0.1:8302 node test/tools/review-set.js <set-number>
 *
 * Writes docs/review/set-<n>/views/<view>-<low|high>.jpg and docs/review/set-<n>/views/index.md. The views use the first
 * campaign day (fixed seed) and place the van and the player with the model, as test/fpbench.js does; nothing is
 * scored. A view whose feature is not built yet is skipped and listed as such, so later milestones add views without
 * changing earlier ones.
 */
'use strict';
const fs = require('fs'), path = require('path');
const pp = require(path.join(__dirname, '..', 'node_modules', 'puppeteer-core'));

const SET = process.argv[2];
if (!/^\d+$/.test(SET || '')) { console.error('usage: node test/tools/review-set.js <set-number>'); process.exit(2); }
const BASE = process.env.QA_BASE || 'http://127.0.0.1:8302';
const OUT = path.join(__dirname, '..', '..', 'docs', 'review', 'set-' + SET, 'views');
const wait = (ms) => new Promise(r => setTimeout(r, ms));

// [id, what the owner looks at, a setup run in the page (returns false when the feature does not exist yet)]
const VIEWS = [
  ['depot', 'The depot in the morning: the van, the shelves, Dispatch', (s) => { s.closePanel(); return true; }],
  ['cab', 'Sitting in the cab: the dashboard, the controls, the view ahead', (s) => { const m = s.model; m.mode = 'cab'; m.paused = false; s.sync(); return true; }],
  ['mirror', 'The left mirror from the driver\'s seat', (s) => {
    const m = s.model, M = OTR.fpMirrors; m.mode = 'cab'; m.paused = false;
    if (!M || !M.specs) { m.van.look = -0.9; s.sync(); return true; }        // before C-23: roughly where the mirror was
    // on the street (as the street view), so the mirror shows the road behind rather than the depot wall; then look
    // straight at the physical left mirror from the driver's eye, the way OTR.fpMirrors.looking() measures it
    const z = m.town && m.town.zs ? m.town.zs[1] + 22 : -20;
    Object.assign(m.van, { z, yaw: 0, speed: 0, hand: true });
    const sp = M.specs[0], dx = sp.x + 0.45, dy = sp.y - 2.05, dz = sp.z + 1.85;
    m.van.look = Math.atan2(dx, -dz); m.player.pitch = -Math.asin(dy / Math.hypot(dx, dy, dz)); s.sync(); return true;
  }],
  ['street', 'Driving along the first street towards a junction', (s) => {
    const m = s.model; m.mode = 'cab'; m.player.yaw = 0; m.player.pitch = 0;
    const z = m.town && m.town.zs ? m.town.zs[1] + 22 : -20;
    Object.assign(m.van, { x: m.van.x, z, yaw: 0, speed: 0, hand: true }); s.sync(); return true;
  }],
  ['reverse', 'Reversing: the rear camera and the guidelines', (s) => {
    const m = s.model; m.mode = 'cab';
    if (!('gear' in m.van) || !OTR.fpRear) return false;                       // C-24 adds the automatic rear camera
    m.van.gear = -1; m.player.yaw = 0; m.van.look = 0.45; m.player.pitch = -0.12; s.sync(); return true;   // looking at the dash screen
  }],
  ['stop', 'Parked at the first stop', (s) => {
    const m = s.model; m.mode = 'cab'; m.phase = 'route';
    Object.assign(m.van, m.stops[0].park || { x: 4, z: -42, yaw: 0 }, { speed: 0, hand: true }); m.player.yaw = 0; s.sync(); return true;
  }],
  ['doorstep', 'At the first door', (s) => {
    // three metres back from the door, looking at the house (the C-27 houses put the old 1.5 m view against the door)
    const m = s.model, st = m.stops[0], side = st.side || 1, pt = (m.point && m.point('door0')) || st; m.mode = 'walk';
    Object.assign(m.player, { x: pt.x - side * 3, z: pt.z, yaw: side * Math.PI / 2, pitch: 0.08 }); s.sync(); return true;
  }],
  ['satnav', 'The sat nav with the route', (s) => { if (!s.satnav) return false; s.model.mode = 'cab'; s.sync(); return true; }],
  ['night', 'Driving at night with headlights', (s) => {
    const m = s.model; if (!OTR.fpLighting || !m.routePlan) return false;          // C-25: time of day from the route plan
    m.routePlan.timeOfDay = 'night'; m.mode = 'cab'; m.van.gear = 1; m.van.look = 0; m.player.pitch = 0; m.van.headlights = true; s.sync(); return true;
  }],
  ['rain', 'Rain on the windscreen with the wipers on', (s) => {
    const m = s.model; if (!OTR.fpWeather || !m.routePlan) return false;           // C-26: weather you can see
    m.routePlan.timeOfDay = 'midday'; m.routePlan.weather = 'rain'; if (m.routeDay) m.routeDay.weather = 'rain';
    m.mode = 'cab'; m.van.headlights = false; m.van.wipers = true; m.van.look = 0; m.player.pitch = 0; s.sync(); return true;
  }],
  ['damage', 'The walk-round damage report', (s) => { if (!s.damageReport) return false; s.damageReport(); return true; }]
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await pp.launch({ executablePath: process.env.QA_BROWSER || '/usr/bin/chromium', headless: true,
    args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const rows = [], errors = [];
  try {
    for (const gfx of ['low', 'high']) {
      const p = await browser.newPage();
      await p.setViewport({ width: 1280, height: 720 });
      p.on('pageerror', e => errors.push(e.message));
      await p.goto(BASE + '/first-person.html?gfx=' + gfx);
      await p.waitForFunction(() => window.OTR && OTR.game && OTR.game.scene.isActive('FirstPersonScene') && !OTR.game.scene.getScene('FirstPersonScene').loading, { timeout: 60000 });
      await p.evaluate(() => { const s = OTR.game.scene.getScene('FirstPersonScene'); s.closePanel(); s.launch('campaign'); });
      await p.waitForFunction(() => { const s = OTR.game.scene.getScene('FirstPersonScene'); return s.model && !s.transitioning; }, { timeout: 60000 });
      // each view starts from the day as it was launched: a view's weather, time or lights must not leak into the next
      await p.evaluate(() => { const m = OTR.game.scene.getScene('FirstPersonScene').model, r = m.routePlan || {};
        window.__dayAsLaunched = { weather: r.weather, timeOfDay: r.timeOfDay, dayWeather: m.routeDay && m.routeDay.weather }; });
      for (const [id, what, setup] of VIEWS) {
        await p.evaluate(() => { const m = OTR.game.scene.getScene('FirstPersonScene').model, d = window.__dayAsLaunched;
          if (m.routePlan) { m.routePlan.weather = d.weather; m.routePlan.timeOfDay = d.timeOfDay; }
          if (m.routeDay) m.routeDay.weather = d.dayWeather;
          Object.assign(m.van, { headlights: false, wipers: false, gear: 1, look: 0 }); m.player.pitch = 0; });
        const shown = await p.evaluate((src) => { const s = OTR.game.scene.getScene('FirstPersonScene'); try { return !!(new Function('return ' + src)())(s); } catch (e) { return 'error: ' + e.message; } }, setup.toString());
        const file = `${id}-${gfx}.jpg`;
        if (shown === true) {
          await wait(1200);
          // the mirror view must be what the game itself counts as looking at the left mirror
          if (id === 'mirror' && await p.evaluate(() => !!(window.OTR.fpMirrors && OTR.fpMirrors.looking) && OTR.fpMirrors.looking(OTR.game.scene.getScene('FirstPersonScene').model) !== 0))
            errors.push('the mirror view is not aimed at the left mirror (' + gfx + ')');
          if (id === 'mirror' && await p.evaluate(() => { const v = OTR.game.scene.getScene('FirstPersonScene').view; return !!(v.mirror && v.mirror.updates) && !(v.mirror.updates[0] > 0); }))
            errors.push('the left mirror never rendered its reflection (' + gfx + ')');
          await p.screenshot({ path: path.join(OUT, file), type: 'jpeg', quality: 78 });
        }
        rows.push({ id, what, gfx, file: shown === true ? file : null, note: shown === true ? '' : shown === false ? 'not built yet' : shown });
        console.log(`${gfx} ${id}: ${shown === true ? file : shown === false ? 'not built yet' : shown}`);
      }
      await p.close();
    }
  } finally { await browser.close(); }
  const ids = [...new Set(rows.map(r => r.id))];
  const md = [`# Review set ${SET}: fixed views`, '', `Captured ${new Date().toISOString().slice(0, 10)} from \`first-person.html\` on the first campaign day,`,
    'Low and High graphics, by `node test/tools/review-set.js ' + SET + '`. The same views are taken at every milestone: open',
    'the same file in the previous set to compare. These are software-rendered (no graphics card), so they show the look,',
    'not the frame rate.', '', '| View | What to look at | Low | High |', '| --- | --- | --- | --- |',
    ...ids.map(id => { const lo = rows.find(r => r.id === id && r.gfx === 'low'), hi = rows.find(r => r.id === id && r.gfx === 'high');
      const cell = (r) => r.file ? `![${id} ${r.gfx}](${r.file})` : (r.note || '');
      return `| ${id} | ${lo.what} | ${cell(lo)} | ${cell(hi)} |`; }),
    '', errors.length ? 'Page errors while capturing: ' + errors.join(' / ') : 'No page errors while capturing.', ''].join('\n');
  fs.writeFileSync(path.join(OUT, 'index.md'), md);
  console.log('wrote ' + path.relative(process.cwd(), OUT));
  process.exit(errors.length ? 1 : 0);
})();
