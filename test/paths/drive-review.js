/*
 * The drive review, reached the way a trainee reaches it: Road Hazards from its brief in the hub, driven by the test
 * autopilot without the seatbelt (the one mistake), then Results → "Drive map". The map must pin where the mistake
 * happened, the list must name it, clicking it must show its lesson, and Back must return to the same results.
 */
const path = require('path');
const { wait, clickText } = require('./lib/ui');

module.exports = async (page, ctx) => {
  const active = async (key, ms) => { if (!(await ctx.until(`OTR.game.scene.isActive(${JSON.stringify(key)})`, ms || 15000))) throw new Error(`${key} never opened`); await wait(700); };

  await page.evaluate(() => localStorage.clear());
  await ctx.reload();
  await page.keyboard.press('Enter');                                   // Start Training
  await wait(900);
  await page.keyboard.type('Jo Park');
  await page.keyboard.press('Enter');
  await active('HubScene');

  // Road Hazards, practice
  await clickText(page, 'HubScene', /^Road Hazards$/);
  await wait(600);
  await clickText(page, 'HubScene', /^Practice$/);
  await active('DrivingScene', 20000);
  await wait(800);
  await page.keyboard.press('Enter');                                   // "Roll out"
  await wait(700);
  await page.addScriptTag({ path: path.join(__dirname, 'lib', 'autodrive.browser.js') });
  await page.evaluate(() => {
    const s = OTR.game.scene.getScene('DrivingScene');
    s.cars.forEach(c => c.img.destroy()); s.cars.length = 0;
    s.peds.forEach(p => { p.t = 1e9; p.crossing = false; });
    // no B: driving unbuckled is the mistake this run makes
    const bot = QA_AUTODRIVE.create(s);
    window.__bot = bot;
    let target = null;
    s.events.on('update', (t, d) => {
      if (s.finished) return;
      if (s.lightsWanted && !s.lights) s.lights = true;
      const stop = s.activeStop;
      if (stop && stop !== target && !s.parked) { target = stop; bot.goTo(stop.lot); }
      bot.tick(Math.min(d, 50) / 1000);
      if (bot.status === 'arrived') { bot.status = 'parking'; s.held.Space = true; s.tryPark(); s.held.Space = false; }
    });
  });
  if (!(await ctx.until(`OTR.game.scene.isActive('ResultsScene') || (window.__bot && /^failed/.test(window.__bot.status))`, 480000))) throw new Error('the drive never finished');
  if (await ctx.eval(`/^failed/.test(window.__bot.status)`)) throw new Error('the autopilot ' + (await ctx.eval('window.__bot.status')));
  await active('ResultsScene');
  await wait(1200);

  // Results → Drive map
  const pinsExpected = await ctx.eval(`OTR.drive.pins(OTR.game.scene.getScene('ResultsScene').d.result.log).length`);
  if (!pinsExpected) throw new Error('driving unbuckled left no pin on the drive');
  await clickText(page, 'ResultsScene', /^Drive map/);
  await active('DriveReviewScene');
  await ctx.audit('drive map');
  const list = await ctx.eval(`OTR.game.scene.getScene('DriveReviewScene').children.list.filter(o => o.type === 'Text').map(t => t.text)`);
  const beltRow = list.find(t => /belt|buckle/i.test(t));
  if (!beltRow) throw new Error('the list does not name the seatbelt mistake: ' + list.slice(0, 12).join(' | '));
  // the lesson for the mistake clicked
  await clickText(page, 'DriveReviewScene', new RegExp('^' + beltRow.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'));
  await wait(500);
  const after = await ctx.eval(`OTR.game.scene.getScene('DriveReviewScene').children.list.filter(o => o.type === 'Text').map(t => t.text)`);
  if (!after.some(t => /belt/i.test(t) && t !== beltRow && t.length > 30)) throw new Error('clicking the mistake did not show its lesson');
  await ctx.audit('drive map: a pin opened');
  // Back to the same results, without the celebration again
  await page.keyboard.press('Escape');
  await active('ResultsScene');
  if (!(await ctx.eval(`!!OTR.game.scene.getScene('ResultsScene').d.again`))) throw new Error('Back did not return to the same results');
};
