/*
 * The route day end to end, as a brand-new courier: name entry, the hub, "Start the route", the morning briefing
 * on its recommended answers, the pre-trip walkaround and the load (their own golden paths), then five legs of
 * driving with the test autopilot (belt and lights on the real keys, P to park) and five doorstep stops with the stop
 * driver, the debrief, and back to the hub on day 2.
 *
 * On the way it checks the things that only exist in a route day:
 *   - after the second stop it reloads the page and carries on from the hub's "Resume route", as a trainee coming
 *     back to a half-finished day would;
 *   - pause-menu Restart on a drive keeps the day's route, and on a stop keeps that route stop (it used to become
 *     the first practice stop set); either way the restart is on the day's record;
 *   - reloading inside stop 4 reopens stop 4 (not the drive to it), without parking or moving the clock twice;
 *   - the layout is audited on the briefing, the drive and the debrief.
 * Traffic and pedestrians are cleared for each leg so the run is repeatable; the drill (m1-driving) covers them.
 */
const path = require('path');
const { wait, clickText, runTalk } = require('./lib/ui');
const pretrip = require('./m1-pretrip');
const load = require('./m6-load');
const { driver } = require('./lib/stop');

module.exports = async (page, ctx) => {
  const live = () => ctx.eval(`OTR.game.scene.getScenes(true).map(s => s.sys.settings.key).filter(k => k !== 'PauseScene').pop()`);
  const waitScene = async (key, ms) => {
    if (!(await ctx.until(`OTR.game.scene.getScenes(true).some(s => s.sys.settings.key === '${key}')`, ms || 15000))) {
      throw new Error(`expected ${key}, still in ${await live()}`);
    }
    await wait(600);
  };
  const pauseRestart = async (sceneKey) => {
    await page.keyboard.press('Escape');
    await waitScene('PauseScene', 4000);
    await clickText(page, 'PauseScene', /^Restart this (stop|leg)$/);   // each says what it restarts
    await wait(500);
    await clickText(page, 'PauseScene', /^Restart$/);                   // and asks first
    await wait(1500);
  };

  // ---- a new courier
  await page.evaluate(() => localStorage.clear());
  await ctx.reload();
  await page.keyboard.press('Enter');                          // Start Training
  await wait(900);
  await page.keyboard.type('QA Courier');
  await page.keyboard.press('Enter');
  await waitScene('HubScene');
  const day = await ctx.eval('OTR.save.data.day');

  // ---- start the route and sit through the briefing
  await clickText(page, 'HubScene', /^Start the route/);
  await wait(500);
  await clickText(page, 'HubScene', /^Start ▶$/);             // the hub asks first
  await waitScene('ShiftBriefScene');
  await ctx.until(`!!OTR.game.scene.getScene('ShiftBriefScene').talkCtl`, 6000);
  await wait(800);
  await ctx.audit('briefing');
  await ctx.snap('briefing');
  await runTalk(page, `OTR.game.scene.getScene('ShiftBriefScene').talkCtl`, { timeout: 150000 });

  // ---- pre-trip and loading, played by their own golden paths
  await waitScene('PreTripScene');
  await ctx.eval('window.__qaResult = null');
  await pretrip(page, ctx);
  await waitScene('LoadingScene');
  await ctx.eval('window.__qaResult = null');
  await load(page, ctx);

  // ---- five legs: drive, park, work the stop
  const D = driver(page, ctx);
  // keep a copy of the day's log as the debrief closes the day, to report anything short of full marks
  const stashLog = () => ctx.eval(`(() => { if (OTR.shift.__qaStash) return; OTR.shift.__qaStash = true; const f = OTR.shift.finish.bind(OTR.shift);
    OTR.shift.finish = (scene) => { window.__dayLog = JSON.parse(JSON.stringify(OTR.shift.state.log)); return f(scene); }; })()`);
  let injected = false;
  for (let leg = 1; leg <= 5; leg++) {
    await waitScene('TownDriveScene', 20000);
    // a card the drive opens with (the defects the pre-trip flagged, fixed by the shop) is read and rolled out of
    if (await ctx.eval(`!!OTR.game.scene.getScene('TownDriveScene').incidentOpen`)) {
      if (leg === 1 && !(await ctx.eval(`/Flagged, and fixed|Held at the gate/.test(OTR.game.scene.getScene('TownDriveScene').children.list.filter(o => o.depth === 5000).map(r => (r.list || []).map(b => (b.list || []).map(t => t.text || '').join(' ')).join(' ')).join(' '))`))) throw new Error('the drive opened with an unexpected card');
      await wait(700);
      await page.keyboard.press('Enter');
      await ctx.until(`!OTR.game.scene.getScene('TownDriveScene').incidentOpen`, 3000);
      await wait(300);
    }
    if (leg === 2) {
      // Restart from the pause menu must keep the day's route (four stops left) and stay in the route day
      await pauseRestart('TownDriveScene');
      await waitScene('TownDriveScene');
      const kept = await ctx.eval(`(() => { const s = OTR.game.scene.getScene('TownDriveScene'); return { shift: s.shiftMode, left: s.route.length }; })()`);
      if (!kept.shift || kept.left !== 4) throw new Error('restarting the drive lost the route: ' + JSON.stringify(kept));
      if (!(await ctx.eval(`OTR.shift.state.log.items.some(it => /^Restarted the drive to stop 2/.test(it.label))`))) throw new Error('the drive restart is not on the day\'s record');
    }
    if (!injected) { await page.addScriptTag({ path: path.join(__dirname, 'lib', 'autodrive.browser.js') }); injected = true; }
    await ctx.eval(`(() => {
      const s = OTR.game.scene.getScene('TownDriveScene');
      s.cars.forEach(c => c.img.destroy()); s.cars.length = 0;
      s.peds.forEach(p => { p.t = 1e9; p.crossing = false; });
      const bot = QA_AUTODRIVE.create(s);
      window.__bot = bot; window.__leg = { why: [] };
      const v0 = s.violation.bind(s);
      s.violation = (key, ...rest) => {
        const last = window.__leg.why.filter(w => w.key === key).pop();
        if (!last || s.elapsed - last.t > 5) {
          const v = s.van, V = OTR.vehicle, g = v.g;
          const wheels = [V.point(v, g.a, -(g.hw - 0.3)), V.point(v, g.a, g.hw - 0.3), V.point(v, -g.b, -(g.hw - 0.3)), V.point(v, -g.b, g.hw - 0.3)]
            .map(w => s.surfaceAt(w.x, w.y));
          window.__leg.why.push({ key, t: +s.elapsed.toFixed(1), mph: +V.mph(v).toFixed(1), x: Math.round(v.x), y: Math.round(v.y),
            hdg: Math.round(v.heading * 57.3), wheels, i: window.__bot.i, pt: window.__bot.pts[window.__bot.i], sw: +v.sw.toFixed(2) });
        }
        return v0(key, ...rest);
      };
      bot.goTo(s.activeStop.lot);
      // the scene object is reused for every leg and keeps its listeners: drop the last leg's autopilot first
      if (window.__botHook) s.events.off('update', window.__botHook);
      window.__botHook = (t, d) => { if (!s.parked && !s.leaving) bot.tick(Math.min(d, 50) / 1000); };
      s.events.on('update', window.__botHook);
    })()`);
    await page.keyboard.press('KeyB');                         // belt on
    if (await ctx.eval(`OTR.game.scene.getScene('TownDriveScene').lightsWanted`)) await page.keyboard.press('KeyL');
    if (leg === 1) { await wait(1500); await ctx.audit('drive'); await ctx.snap('drive'); }
    if (!(await ctx.until(`window.__bot.status === 'arrived' || /^failed/.test(window.__bot.status) || window.__leg.why.length > 0`, 240000))) throw new Error(`leg ${leg}: the autopilot never arrived`);
    if (await ctx.eval('window.__leg.why.length > 0')) { await wait(300); await ctx.snap(`violation-${leg}`); }
    const bot = await ctx.eval('window.__bot.status');
    if (/^failed/.test(bot)) { await ctx.snap(`stuck-${leg}`); throw new Error(`leg ${leg}: autopilot ${bot}`); }
    await page.keyboard.press('KeyP');                         // park at the stop
    const why = await ctx.eval('window.__leg.why');
    if (why.length) throw new Error(`leg ${leg}: a clean drive logged ${JSON.stringify(why)}`);

    await waitScene('StopScene', 15000);
    if (leg === 3) {
      // Restart from the pause menu must keep this route stop
      await page.keyboard.press('Enter');                      // the dispatcher's brief
      await wait(800);
      await pauseRestart('StopScene');
      await waitScene('StopScene');
      const st = await ctx.eval(`(() => { const s = OTR.game.scene.getScene('StopScene'); return { shift: s.shiftMode, id: s.def.id, idx: s.shiftStop && s.shiftStop.index }; })()`);
      if (!st.shift || st.idx !== 3) throw new Error('restarting a route stop turned it into ' + JSON.stringify(st));
      if (!(await ctx.eval(`OTR.game.scene.getScene('StopScene').log.items.some(it => it.label === 'Restarted stop 3')`))) throw new Error('the stop restart is not on the day\'s record');
    }
    if (leg === 4) {
      // reload inside the stop: the hub resumes into this stop, with the arrival logged once
      const before = await ctx.eval(`({ clock: OTR.shift.state.clockMin, parks: OTR.shift.state.log.items.filter(it => /^Parked at/.test(it.label)).length })`);
      await ctx.reload();
      injected = false;
      await page.keyboard.press('Enter');                      // Continue as QA Courier
      await waitScene('HubScene');
      await clickText(page, 'HubScene', /^Resume route/);
      await waitScene('StopScene', 15000);
      const back = await ctx.eval(`(() => { const s = OTR.game.scene.getScene('StopScene'); return { idx: s.shiftStop && s.shiftStop.index, clock: OTR.shift.state.clockMin,
        parks: OTR.shift.state.log.items.filter(it => /^Parked at/.test(it.label)).length }; })()`);
      if (back.idx !== 4 || back.clock !== before.clock || back.parks !== before.parks) throw new Error('reloading inside stop 4 did not resume it: ' + JSON.stringify({ before, back }));
    }
    await stashLog();
    await D.playStop(leg - 1);

    if (leg === 2) {
      // come back to a half-finished day
      await waitScene('TownDriveScene', 20000);
      await ctx.reload();
      injected = false;
      await page.keyboard.press('Enter');                      // Continue as QA Courier
      await waitScene('HubScene');
      await ctx.snap('resume');
      await clickText(page, 'HubScene', /^Resume route/);
    }
  }

  // ---- the debrief
  await waitScene('ShiftDebriefScene', 20000);
  await wait(2500);
  await ctx.audit('debrief');
  await ctx.snap('debrief');
  const rec = await ctx.eval('OTR.save.data.route && OTR.save.data.route.history.slice(-1)[0]');
  const short = await ctx.eval(`(window.__dayLog ? window.__dayLog.items : []).filter(it => it.got < it.max || it.kind === 'penalty').map(it => it.cat + ' ' + it.got + '/' + it.max + ' ' + it.label)`);
  console.log('        route day: ' + JSON.stringify({ stars: rec.stars, ratios: rec.ratios, delivered: rec.delivered, exceptions: rec.exceptions, short, stops: D.log }));
  if (rec.delivered + rec.exceptions !== 5) throw new Error('the debrief did not count five stops: ' + JSON.stringify(rec));
  const low = Object.keys(rec.ratios).filter(c => rec.ratios[c] < 0.95);
  if (low.length) throw new Error('a careful day scored low in ' + low.join(', ') + ': ' + JSON.stringify(rec.ratios));
  await clickText(page, 'ShiftDebriefScene', /^Back to the station/);
  await waitScene('HubScene');
  const after = await ctx.eval('({ day: OTR.save.data.day, live: OTR.shift.active(), days: OTR.save.data.route.days })');
  if (after.day !== day + 1 || after.live || after.days !== 1) throw new Error('the day did not roll over: ' + JSON.stringify(after));
};
