/*
 * A-31: a module's 3D scenarios, opened the way a trainee opens them. With the trainer's rule set to 3D for the module
 * (A-30), each scenario starts from the hub through OTR.flow.startScenario, its brief is read page by page with Enter,
 * the scenario begins, Escape pauses it and "Return to the station." brings the trainee back to the hub without a
 * record. Every brief page, the running scenario and the pause panel pass the layout audit, so run it in Tamil with
 * larger text too (QA_LANG=ta QA_A11Y=large). With the rule at 2D the same scenario opens its 2D scene.
 * Codex's *lessonbrowser.js suites play each scenario through; this checks the way in, the text and the way out.
 *   QA_MODULES3D=m1 (the default) or m1,m2 ...
 */
const { wait } = require('./lib/ui');

module.exports = async (page, ctx) => {
  const must = (ok, why) => { if (!ok) throw new Error(why); };
  const FP = `OTR.game.scene.getScene('FirstPersonScenarioScene')`;
  const toHub = async (why) => must(await ctx.until(`OTR.game.scene.isActive('HubScene') && !OTR.game.scene.getScene('HubScene').sys.isTransitioning()`, 60000), why);

  await page.evaluate(() => localStorage.clear());
  await ctx.reload();
  await page.keyboard.press('Enter');                          // Start Training
  await wait(900);
  await page.keyboard.type('QA Courier');
  await page.keyboard.press('Enter');
  await toHub('never reached the hub');
  await wait(900);

  const mods = (process.env.QA_MODULES3D || 'm1').split(',');
  const list = await ctx.eval(`OTR.registry.modules().filter(m => ${JSON.stringify(mods)}.includes(m.id))
    .flatMap(m => m.scenarios.filter(s => s.scene3d).map(s => ({ id: s.id, module: m.id, scene: s.scene || null })))`);
  must(list.length, `no 3D scenario in ${mods.join(', ')}`);
  const rule = (module, choice) => ctx.eval(`(() => { const p = OTR.academy.get().presentation; p[${JSON.stringify(module)}] = ${JSON.stringify(choice)}; })()`);

  for (const sc of list) {
    await rule(sc.module, '3d');
    await ctx.eval(`OTR.flow.startScenario(OTR.game.scene.getScene('HubScene'), ${JSON.stringify(sc.id)})`);
    if (!(await ctx.until(`OTR.game.scene.isActive('FirstPersonScenarioScene') && ${FP}.scenarioSession && ${FP}.scenarioSession.id === ${JSON.stringify(sc.id)} && !!${FP}.panel`, 120000)))
      throw new Error(`${sc.id}: the 3D scenario never showed its brief; on screen ` + await ctx.eval(`JSON.stringify({ active: OTR.game.scene.getScenes(true).map(s => s.sys.settings.key), rule: OTR.academy.presentationOf(${JSON.stringify(sc.id)}), gl: OTR.registry.can3d() })`));
    // the brief: every page audited, Enter for the next page and, on the last, to begin
    let pages = 0;
    for (; pages < 8; pages++) {
      await wait(500);
      await ctx.audit(`${sc.id} brief page ${pages + 1}`);
      if (pages === 0) await ctx.snap(`${sc.id}-brief`);
      await page.keyboard.press('Enter');
      if (await ctx.until(`${FP}.scenarioSession.phase === 'active'`, 1500)) break;
    }
    must(await ctx.until(`${FP}.scenarioSession.phase === 'active' && !${FP}.panel`, 10000), `${sc.id}: Enter never began the scenario after ${pages + 1} brief pages`);
    await wait(1500);
    await ctx.audit(`${sc.id} playing`);
    await ctx.snap(`${sc.id}-playing`);
    // pause, then back to the station: an abandoned practice run leaves no record
    await page.keyboard.press('Escape');
    must(await ctx.until(`!!${FP}.panel`, 10000), `${sc.id}: Escape did not pause`);
    await wait(400);
    await ctx.audit(`${sc.id} paused`);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await toHub(`${sc.id}: "Return to the station." did not reach the hub`);
    must(!(await ctx.eval(`!!OTR.save.data.scenarios[${JSON.stringify(sc.id)}]`)), `${sc.id}: leaving a practice run left a record`);
    await wait(600);

    // the same scenario with the rule at 2D: its 2D scene, or "needs 3D" for a 3D-only one
    if (sc.scene) {
      await rule(sc.module, '2d');
      await ctx.eval(`OTR.flow.startScenario(OTR.game.scene.getScene('HubScene'), ${JSON.stringify(sc.id)})`);
      must(await ctx.until(`OTR.game.scene.isActive(${JSON.stringify(sc.scene)})`, 60000), `${sc.id}: with the rule at 2D, ${sc.scene} never opened`);
      await wait(800);
      await ctx.eval(`OTR.flow.toHub(OTR.game.scene.getScene(${JSON.stringify(sc.scene)}))`);
      await toHub(`${sc.id}: never came back from ${sc.scene}`);
      await wait(600);
    }
  }
  await rule(list[0].module, 'auto');
};
