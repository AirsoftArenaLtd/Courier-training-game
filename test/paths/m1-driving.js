/*
 * Road Hazards: drive all six checkpoints with the test autopilot, on the real controls and vehicle model.
 * Traffic and pedestrians are cleared so the run is repeatable; the drill's own hazards all still fire, and
 * the autopilot handles them the way a careful driver would (it stops, or crawls through standing water).
 * A clean run should score full marks for every hazard and no violations.
 */
const path = require('path');

module.exports = async (page, ctx) => {
  await ctx.wait(1400);
  await page.keyboard.press('Enter');                      // "Roll out"
  await ctx.wait(700);
  await page.addScriptTag({ path: path.join(__dirname, 'lib', 'autodrive.browser.js') });
  await page.evaluate(() => {
    const s = OTR.game.scene.getScene('DrivingScene');
    s.cars.forEach(c => c.img.destroy());
    s.cars.length = 0;
    s.peds.forEach(p => { p.t = 1e9; p.crossing = false; });
    s.buckled = true;
    const bot = QA_AUTODRIVE.create(s);
    window.__bot = bot;
    window.__drive = { legs: [], why: [] };
    // if anything is ever logged, keep the context so the report says exactly where and why
    const logViolation = s.violation.bind(s);
    s.violation = (key, ...rest) => {
      const a = s.approach;
      window.__drive.why.push({
        key, t: +s.elapsed.toFixed(1), mph: +OTR.vehicle.mph(s.van).toFixed(1),
        van: { x: Math.round(s.van.x), y: Math.round(s.van.y), hdg: Math.round(s.van.heading * 57.3) },
        approach: a ? { x: a.it.x, y: a.it.y, dir: a.dir, light: a.it.light, state: s.lightFor(a.it, a.dir === 'W' || a.dir === 'E'), stopped: a.stopped } : null,
        marks: bot.marks.filter(m => m.it).map(m => ({ x: m.it.x, y: m.it.y, cleared: m.cleared, idx: m.idx })), i: bot.i
      });
      return logViolation(key, ...rest);
    };
    let target = null;
    s.events.on('update', (t, d) => {
      if (s.finished) return;
      if (s.lightsWanted && !s.lights) s.lights = true;
      const stop = s.activeStop;
      if (stop && stop !== target && !s.parked) {
        target = stop;
        bot.goTo(stop.lot);
        window.__drive.legs.push({ to: `${stop.lot.number} ${stop.lot.street}`, status: bot.status, t: Math.round(s.elapsed) });
      }
      bot.tick(Math.min(d, 50) / 1000);
      if (bot.status === 'arrived') { bot.status = 'parking'; s.tryPark(); }
    });
  });
  const done = await ctx.until(`!!window.__qaResult || (window.__bot && /^failed/.test(window.__bot.status))`, 420000);
  const info = await page.evaluate(() => {
    const s = OTR.game.scene.getScene('DrivingScene');
    return {
      bot: window.__bot.status, legs: window.__drive.legs, why: window.__drive.why, elapsed: Math.round(s.elapsed),
      violations: s.violations, results: s.results,
      van: { x: Math.round(s.van.x), y: Math.round(s.van.y), heading: +(s.van.heading * 57.3).toFixed(0) }
    };
  });
  console.log('        drive:', JSON.stringify(info));
  if (!done || /^failed/.test(info.bot)) {
    await ctx.snap('stuck');
    throw new Error(`autopilot ${info.bot} at ${JSON.stringify(info.van)}`);
  }
  const bad = Object.keys(info.violations || {});
  if (bad.length) throw new Error('clean drive logged violations: ' + bad.join(', '));
  const failed = (info.results || []).filter(r => !r.ok).map(r => r.id);
  if (failed.length) throw new Error('careful driving failed hazards: ' + failed.join(', '));
  // a clean drive that waits out every sign, light and hazard has to be able to earn full marks: the par is
  // what a careful driver takes, not what a hurried one does
  const ratios = await ctx.eval('window.__qaResult && window.__qaResult.result.ratios');
  const short = Object.keys(ratios || {}).filter(k => ratios[k] < 1);
  if (short.length) throw new Error(`a careful, clean drive did not score full marks: ${JSON.stringify(ratios)} in ${info.elapsed}s`);
};
