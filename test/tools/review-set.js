#!/usr/bin/env node
/*
 * The owner's review set (board task A-23): the same fixed views of the 3D workday, captured the same way at every
 * milestone, so the owner can compare before and after in a few minutes instead of playing a whole day.
 *
 *   QA_BROWSER=/path/to/chrome QA_BASE=http://127.0.0.1:8302 node test/tools/review-set.js <set-number>
 *
 *   node test/tools/review-set.js <set-number> --compare   only (re)writes compare.md from the views already captured
 *   QA_LANG=ta QA_LARGE=1 ...                              as a Tamil trainee with larger text sees it (B-38), into
 *                                                          views-ta-large/ (no compare.md: that is for the English set)
 *
 * Writes docs/review/set-<n>/views/<view>-<low|high>.jpg and docs/review/set-<n>/views/index.md, and compare.md (B-35):
 * each view from the previous set next to this one, so before and after are on one page. The views use the first
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
const LANG = process.env.QA_LANG || '', LARGE = process.env.QA_LARGE === '1';
const OUT = path.join(__dirname, '..', '..', 'docs', 'review', 'set-' + SET, 'views' + (LANG ? '-' + LANG : '') + (LARGE ? '-large' : ''));
const wait = (ms) => new Promise(r => setTimeout(r, ms));

/** compare.md: each view of the newest earlier set that has views, beside this set's, at Low and at High. */
function writeCompare() {
  const root = path.dirname(path.dirname(OUT));
  const prev = fs.readdirSync(root).map(d => /^set-(\d+)$/.exec(d)).filter(m => m && +m[1] < +SET && fs.existsSync(path.join(root, m[0], 'views')))
    .map(m => +m[1]).sort((a, b) => b - a)[0];
  if (prev === undefined) return;
  const before = path.join(root, 'set-' + prev, 'views'), have = (dir, f) => fs.existsSync(path.join(dir, f));
  const cell = (dir, rel, id, gfx, set) => have(dir, `${id}-${gfx}.jpg`) ? `![${id} ${gfx}, set ${set}](${rel}${id}-${gfx}.jpg)` : 'not in this set';
  const lines = [`# Review set ${SET} beside set ${prev}`, '', `The same fixed views (see \`index.md\`), set ${prev} on the left and set ${SET} on the right. A view`,
    'a set did not have says so.', ''];
  for (const gfx of ['low', 'high']) {
    lines.push(`## ${gfx === 'low' ? 'Low' : 'High'} graphics`, '', `| View | Set ${prev} | Set ${SET} |`, '| --- | --- | --- |');
    VIEWS.forEach(([id]) => { if (have(before, `${id}-${gfx}.jpg`) || have(OUT, `${id}-${gfx}.jpg`))
      lines.push(`| ${id} | ${cell(before, `../../set-${prev}/views/`, id, gfx, prev)} | ${cell(OUT, '', id, gfx, SET)} |`); });
    lines.push('');
  }
  fs.writeFileSync(path.join(OUT, 'compare.md'), lines.join('\n'));
  console.log(`wrote compare.md (set ${prev} beside set ${SET})`);
}

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
    // from the front path, part-way to where the van parks and a step to the side, looking back at the door: the house
    // front and whoever answers are in view, and the camera is never inside the van or a wall (B-37)
    const m = s.model, st = m.stops[0], pt = (m.point && m.point('door0')) || st; m.mode = 'walk';
    const to = st.park || { x: pt.x - (st.side || 1) * 8, z: pt.z }, dx = to.x - pt.x, dz = to.z - pt.z, d = Math.hypot(dx, dz) || 1;
    const along = Math.min(6, d * 0.6), px = pt.x + dx / d * along - dz / d * 2.5, pz = pt.z + dz / d * along + dx / d * 2.5;
    Object.assign(m.player, { x: px, z: pz, yaw: Math.atan2(pt.x - px, -(pt.z - pz)), pitch: 0.05 }); s.sync(); return true;
  }],
  ['satnav', 'The sat nav with the route', (s) => {
    // C-31: the dash screen, on the route to the first stop (as C-31's own fixed view in test/fpbench.js)
    const m = s.model; if (!OTR.fpNav || !OTR.fpNav.enabled(m) || !OTR.fpHud || !OTR.fpHud.navigation) return false;
    m.phase = 'route'; m.departed = m.secured = true; m.paused = false; m.mode = 'cab';
    const z = m.town && m.town.zs ? m.town.zs[1] + 22 : -20;
    Object.assign(m.van, { z, yaw: 0, speed: 0, gear: 1, hand: true, belt: true, look: 0 }); m.player.pitch = 0;
    OTR.fpNav.configure(m); s.sync(); s.refresh(); if (s.hud) s.hud.navAt = -1000; OTR.fpHud.navigation(s); return true;
  }],
  ['signs', 'Approaching the first junction: its signs and street names', (s) => {
    // C-30: the junction signs, from the cab as you come up to the first junction
    const m = s.model; if (!OTR.fpSigns || !m.junctions || !m.junctions.length) return false;
    const j = m.junctions[0]; m.mode = 'cab'; m.player.pitch = 0;
    Object.assign(m.van, { x: j.x + 2.5, z: j.z + 17, yaw: 0, speed: 0, look: 0, hand: true }); s.sync(); return true;
  }],
  ['night', 'Driving at night with headlights', (s) => {
    const m = s.model; if (!OTR.fpLighting || !m.routePlan) return false;          // C-25: time of day from the route plan
    m.routePlan.timeOfDay = 'night'; m.mode = 'cab'; m.van.gear = 1; m.van.look = 0; m.player.pitch = 0; m.van.headlights = true; s.sync(); return true;
  }],
  ['rain', 'Rain on the windscreen with the wipers on', (s) => {
    const m = s.model; if (!OTR.fpWeather || !m.routePlan) return false;           // C-26: weather you can see
    m.routePlan.timeOfDay = 'midday'; m.routePlan.weather = 'rain'; if (m.routeDay) m.routeDay.weather = 'rain';
    m.mode = 'cab'; m.van.headlights = false; m.van.wipers = true; m.van.look = 0; m.player.pitch = 0; s.sync(); return true;
  }],
  ['damage', 'The walk-round damage report', (s) => { if (!s.damageReport) return false; s.damageReport(); return true; }],
  // C-32 (B-50): traffic needs a later day, so these build day 4 (seed 7) as C-32's own gate does, and come last
  ['redlight', 'A red traffic light from the cab, stopped before the line', (s) => {
    const m = window.__trafficDay && window.__trafficDay(s); if (!m) return false;
    const j = OTR.fpTraffic.layout(m).find(j => j.kind === 'signal'); if (!j) return false;
    m.elapsed = (23 - j.offset + 54) % 54;                                       // red for this approach
    Object.assign(m.van, { x: j.x + 1.7, z: j.z + m.town.road / 2 + 13, yaw: 0 }); return window.__trafficShow(s);
  }],
  ['giveway', 'The give-way junction from the cab', (s) => {
    const m = window.__trafficDay && window.__trafficDay(s); if (!m) return false;
    const j = OTR.fpTraffic.layout(m).find(j => j.kind === 'giveway'); if (!j) return false;
    // its give-way signs face the side road (east and west approaches): come from the east, heading west
    // (looking a little right, so the sat nav screen does not hide the sign)
    Object.assign(m.van, { x: j.x + m.town.road / 2 + 16, z: j.z - 1.7, yaw: -Math.PI / 2 }); window.__trafficShow(s); m.van.look = 0.3; s.sync(); return true;
  }],
  ['cyclist', 'The cyclist on the right, in the right mirror', (s) => {
    const m = window.__trafficDay && window.__trafficDay(s); if (!m) return false;
    Object.assign(m.van, { x: 2.84, z: -18, yaw: 0 }); m.elapsed = 10;
    const c = m.trafficControl.cyclist, at = OTR.fp.local(m.van, 2, 1.2);
    Object.assign(c, { state: 'beside', x: at.x, z: at.z, yaw: m.van.yaw, leg: m.leg, at: 10 });
    const sp = OTR.fpMirrors.specs[1], dx = sp.x + 0.45, dy = sp.y - 2.05, dz = sp.z + 1.85;    // as the left-mirror view
    window.__trafficShow(s); m.van.look = Math.atan2(dx, -dz); m.player.pitch = -Math.asin(dy / Math.hypot(dx, dy, dz)); s.sync(); return true;
  }],
  // C-34 (B-76): damage and low clearances, on the same day with damage on
  ['lowbridge', 'A low bridge ahead, from the cab', (s) => {
    const m = window.__trafficDay && OTR.fpDamageFlow && window.__trafficDay(s, true); if (!m || !m._damageClearances || !m._damageClearances.length) return false;
    const b = m._damageClearances[0]; Object.assign(m.van, { x: b.x + 1.7, z: b.z + 18, yaw: 0 }); return window.__trafficShow(s);
  }],
  ['dent', 'Damage on the van: a dent on the left and a scuff at the front, seen from outside', (s) => {
    const m = window.__trafficDay && OTR.fpDamageFlow && window.__trafficDay(s, true); if (!m || !m.damage) return false;
    const z = OTR.fpDamage.zones; m.damage.added[z.indexOf('left')] = 2; m.damage.added[z.indexOf('front')] = 1;
    Object.assign(m.van, { x: 2.84, z: -18, yaw: 0 }); m.mode = 'walk';
    Object.assign(m.player, { x: m.van.x - 4.5, z: m.van.z - 2.5, yaw: Math.atan2(4.5, -2.5), pitch: -0.12 });
    s.rebuildWorld(); return window.__trafficShow(s);
  }],
  ['vanheight', 'The van height before departure (at Dispatch)', (s) => {
    const m = window.__trafficDay && OTR.fpDamageFlow && window.__trafficDay(s, true); if (!m || !m.damage) return false;
    m.mode = 'walk'; const desk = m.point('dispatch'); Object.assign(m.player, { x: desk.x - 1.7, z: desk.z }); s.sync();
    s.showManifest(m.stops.length - 1, true); const i = s.panel ? s.panel.choices.findIndex(c => c.label === 'Begin preparation') : -1;
    if (i < 0) return false; s.choose(i); return true;
  }],
  ['school', 'Children on the school crossing, from the cab', (s) => {
    const m = window.__trafficDay && window.__trafficDay(s); if (!m) return false;
    const h = m.crossing; h.state = 'crossing'; h.x = m.town.school.x - 2;
    Object.assign(m.van, { x: m.town.school.x + 1.7, z: h.z + 8, yaw: 0 }); return window.__trafficShow(s);
  }]
];

/* The C-32 views' day, set up in the page (a view's setup is sent as source, so it cannot share a helper). */
const TRAFFIC_DAY = () => {
  if (!window.OTR.fpTraffic) return;
  window.__trafficDay = (s, damage) => {
    s.closePanel(); if (s.handheld) s.handheld.close();
    let plan = OTR.fpTraffic.prepare(OTR.fpNav.prepare(OTR.fpSigns.prepare(OTR.fpLater.prepare(OTR.fpRoute.plan(4, 7)))));
    if (damage && OTR.fpDamageFlow) plan = OTR.fpDamageFlow.prepare(plan);                 // C-34 (B-76): damage from day 4
    const m = OTR.fpMission.create('campaign', 7, plan);
    OTR.fpDay.configure(m); OTR.fpDriving.configure(m); OTR.fpDoors.configure(m); OTR.fpLoadout.configure(m, 'extra');
    m.phase = 'route'; m.departed = m.secured = m.repaired = true; m.paused = false; m.events[m.briefKey] = true; m.step = () => {};   // held still
    for (const p of m.parcels) p.location = 'slot' + (p.anomaly ? 5 : p.stop);
    m.mode = 'cab'; Object.assign(m.van, { speed: 0, hand: true, belt: true, gear: 1, look: 0 }); m.player.pitch = 0;
    s.model = m; s.area = 'route'; s.rebuildWorld();
    return m;
  };
  // after a view has placed the van and the actors: move the solid actors with them and draw
  window.__trafficShow = (s) => { const m = s.model; OTR.fpDriving.syncActors(m); OTR.fpTraffic.syncSolids(m); s.sync(); s.refresh(); return true; };
};

if (process.argv.includes('--compare')) { writeCompare(); process.exit(0); }

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
      await p.goto(BASE + '/first-person.html?gfx=' + gfx + (LANG ? '&lang=' + LANG : ''));
      await p.waitForFunction(() => window.OTR && OTR.game && OTR.game.scene.isActive('FirstPersonScene') && !OTR.game.scene.getScene('FirstPersonScene').loading, { timeout: 60000 });
      if (LANG) await p.waitForFunction((l) => OTR.i18n.lang === l, { timeout: 30000 }, LANG);
      if (LARGE) {
        // larger text applies as the scene builds its screen: restart it with the setting on (as test/fplangsbrowser.js)
        await p.evaluate(() => { const s = OTR.game.scene.getScene('FirstPersonScene'); window.__token = s.loadingToken; OTR.a11y.settings().large = true; s.scene.restart(); });
        await p.waitForFunction(() => { const s = OTR.game.scene.getScene('FirstPersonScene'); return !s.loading && s.loadingToken !== window.__token; }, { timeout: 60000 });
      }
      await p.evaluate(() => { const s = OTR.game.scene.getScene('FirstPersonScene'); s.closePanel(); s.launch('campaign'); });
      await p.waitForFunction(() => { const s = OTR.game.scene.getScene('FirstPersonScene'); return s.model && !s.transitioning; }, { timeout: 60000 });
      // each view starts from the day as it was launched: a view's weather, time or lights must not leak into the next
      await p.evaluate(() => { const m = OTR.game.scene.getScene('FirstPersonScene').model, r = m.routePlan || {};
        window.__dayAsLaunched = { weather: r.weather, timeOfDay: r.timeOfDay, dayWeather: m.routeDay && m.routeDay.weather }; });
      await p.evaluate(TRAFFIC_DAY);
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
  const as = LANG || LARGE ? ` (${[LANG && 'language ' + LANG, LARGE && 'larger text'].filter(Boolean).join(', ')})` : '';
  const md = [`# Review set ${SET}: fixed views${as}`, '', `Captured ${new Date().toISOString().slice(0, 10)} from \`first-person.html\` on the first campaign day,`,
    'Low and High graphics, by `node test/tools/review-set.js ' + SET + '`. The same views are taken at every milestone: open',
    'the same file in the previous set to compare. These are software-rendered (no graphics card), so they show the look,',
    'not the frame rate.', '', '| View | What to look at | Low | High |', '| --- | --- | --- | --- |',
    ...ids.map(id => { const lo = rows.find(r => r.id === id && r.gfx === 'low'), hi = rows.find(r => r.id === id && r.gfx === 'high');
      const cell = (r) => r.file ? `![${id} ${r.gfx}](${r.file})` : (r.note || '');
      return `| ${id} | ${lo.what} | ${cell(lo)} | ${cell(hi)} |`; }),
    '', errors.length ? 'Page errors while capturing: ' + errors.join(' / ') : 'No page errors while capturing.', ''].join('\n');
  fs.writeFileSync(path.join(OUT, 'index.md'), md);
  if (!LANG && !LARGE) writeCompare();
  console.log('wrote ' + path.relative(process.cwd(), OUT));
  process.exit(errors.length ? 1 : 0);
})();
