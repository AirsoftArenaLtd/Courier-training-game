/*
 * Every leg of the first ten route days, driven by the test autopilot. This is a check on the town and the route
 * generator more than a playthrough: can every stop they produce be reached legally and parked neatly?
 *
 * Each leg starts where the last one parked, in that day's town and weather (rain, storm and snow have less grip),
 * with traffic cleared (the drill covers traffic). The game is stepped frame by frame at 60 fps, much faster than
 * real time. The belt goes on with B, the headlights with L when the weather calls for them, and the van is parked
 * with P, as a trainee does. Every stop must be reached with no violation and parked neatly: alongside the
 * kerb on the house's side, facing the way the traffic goes, within 8° of parallel.
 *
 * It found the station building standing in 2nd St, where a van in its own lane hit an invisible wall.
 */
const path = require('path');

const DAYS = Number(process.env.QA_ROUTE_DAYS || 10);

module.exports = async (page, ctx) => {
  if (!(await ctx.until('!!(window.OTR && OTR.game && OTR.game.isBooted && OTR.shift)', 20000))) throw new Error('the game never booted');
  await page.addScriptTag({ path: path.join(__dirname, 'lib', 'autodrive.browser.js') });
  await ctx.eval(`(() => {
    OTR.game.loop.sleep();
    window.__t = performance.now();
    window.__step = (n) => { for (let k = 0; k < n; k++) { window.__t += 1000 / 60; OTR.game.step(window.__t, 1000 / 60); } };
  })()`);

  const bad = [];
  let legs = 0, worst = 0;
  for (let day = 1; day <= DAYS; day++) {
    // the day's own town (one per career now) and the route day's first start, at the west end of the station's block
    const { route, weather, seed, first } = await ctx.eval(`(() => { const st = OTR.shift.generate(${day}); const T = OTR.town.build(st.seed);
      return { route: st.route.map(r => r.lotId), weather: st.weather, seed: st.seed,
        first: { x: Math.min(T.depot.curb.x, T.vx[T.spec.depot.col] + OTR.townArt.ROAD / 2 + 150), y: T.laneY(0, 1), heading: 0 } }; })()`);
    let start = first;
    for (let i = 0; i < route.length; i++) {
      const leg = await ctx.eval(`(() => {
        const mgr = OTR.game.scene;
        mgr.getScenes(true).forEach(s => mgr.stop(s.sys.settings.key));
        __step(2);
        mgr.start('TownDriveScene', { seed: ${seed}, weather: '${weather}', tod: 'morning', start: ${JSON.stringify(start)},
          route: ${JSON.stringify(route.slice(i))}.map((lotId, k) => ({ lotId, index: ${i + 1} + k })) });
        __step(3);
        const s = mgr.getScene('TownDriveScene');
        s.cars.forEach(c => c.img.destroy()); s.cars.length = 0;
        s.peds.forEach(p => { p.t = 1e9; p.crossing = false; });
        window.__why = []; window.__toasts = [];
        const t0 = s.toast.bind(s);
        s.toast = (msg, ...rest) => { window.__toasts.push(msg); return t0(msg, ...rest); };
        const v0 = s.violation.bind(s);
        s.violation = (key, ...rest) => { window.__why.push(key); return v0(key, ...rest); };
        window.__bot = QA_AUTODRIVE.create(s).goTo(s.activeStop.lot);
        // the scene object is reused for every leg and keeps its listeners: drop the last leg's autopilot first
        if (window.__botHook) s.events.off('update', window.__botHook);
        window.__botHook = (t, d) => { if (!s.parked && !s.leaving) window.__bot.tick(Math.min(d, 50) / 1000); };
        s.events.on('update', window.__botHook);
        const l = s.activeStop.lot;
        return l.number + ' ' + l.street;
      })()`);
      await page.keyboard.press('KeyB');
      if (await ctx.eval(`OTR.game.scene.getScene('TownDriveScene').lightsWanted`)) await page.keyboard.press('KeyL');
      await ctx.eval('__step(2)');
      let status = 'driving';
      for (let n = 0; n < 100 && status === 'driving'; n++) status = await ctx.eval('(__step(240), window.__bot.status)');
      const where = `day ${day} (${weather}) leg ${i + 1} (${leg})`;
      if (status !== 'arrived') { bad.push(`${where}: autopilot ${status}, violations ${JSON.stringify(await ctx.eval('window.__why'))}`); break; }
      await ctx.eval('__step(10)');                          // settle on the brake
      await page.keyboard.press('KeyP');
      const res = await ctx.eval(`(() => {
        __step(3);
        const s = OTR.game.scene.getScene('TownDriveScene');
        const park = s.log.items.filter(it => /^Parked at /.test(it.label)).pop();
        const belt = s.log.items.filter(it => it.label === 'Drove buckled up').pop();
        return { park: park && { label: park.label, got: park.got, max: park.max }, belt: belt && belt.got === belt.max,
          why: window.__why, said: window.__toasts.slice(-2), skew: Math.abs(Math.sin(s.van.heading)), pose: { x: s.van.x, y: s.van.y, heading: s.van.heading } };
      })()`);
      legs++;
      worst = Math.max(worst, res.skew);
      if (!res.park) bad.push(`${where}: P did not park the van (${res.said.join(' / ')})`);
      else if (res.park.got < res.park.max) bad.push(`${where}: ${res.park.label} ${res.park.got}/${res.park.max}`);
      if (res.why.length) bad.push(`${where}: violations ${res.why.join(', ')}`);
      if (res.park && !res.belt) bad.push(`${where}: B did not buckle up`);
      start = res.pose;
    }
  }
  console.log(`        route legs: ${legs} legs over ${DAYS} days, worst parking ${(Math.asin(Math.min(1, worst)) * 180 / Math.PI).toFixed(1)}° off the kerb line`);
  if (bad.length) throw new Error(`${bad.length} leg(s) failed: ${bad.slice(0, 6).join(' | ')}`);
};
