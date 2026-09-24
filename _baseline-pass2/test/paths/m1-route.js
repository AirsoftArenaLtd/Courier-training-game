/*
 * Route Planner: every round sequenced in the best order the solver can find, by clicking the manifest cards,
 * then dispatched and driven. On the way it checks that clicking a sequenced stop pulls it back out and that
 * BACKSPACE undoes. Driving the best plan in every round has to earn full marks.
 */
const { wait, clickText } = require('./lib/ui');
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

module.exports = async (page, ctx) => {
  const S = `OTR.game.scene.getScene('RoutePlannerScene')`;
  await wait(1200);
  await page.keyboard.press('Enter');
  const rounds = await ctx.eval(`${S}.content.rounds.length`);

  for (let r = 0; r < rounds; r++) {
    if (!(await ctx.until(`${S}.state === 'plan' && ${S}.roundIndex === ${r}`, 8000))) throw new Error(`round ${r + 1} never became plannable`);
    await wait(900);                                         // pins pop in
    const plan = await ctx.eval(`(() => { const s = ${S}; return s.optimal.order.map(i => s.stops[i - 1].address); })()`);
    const card = (addr) => clickText(page, 'RoutePlannerScene', new RegExp('^' + esc(addr) + '$'));

    if (r === 0) {
      // sequence one, pull it back out by clicking it again, sequence it, then undo with BACKSPACE
      await card(plan[0]);
      await card(plan[0]);
      if (await ctx.eval(`${S}.order.length`) !== 0) throw new Error('clicking a sequenced stop did not pull it back out');
      await card(plan[0]);
      await page.keyboard.press('Backspace');
      await wait(150);
      if (await ctx.eval(`${S}.order.length`) !== 0) throw new Error('BACKSPACE did not undo the last stop');
    }
    for (const addr of plan) await card(addr);
    if (!(await ctx.eval(`${S}.dispatchBtn.enabled`))) throw new Error('DISPATCH stayed disabled with the whole manifest sequenced');
    if (r === rounds - 1) await ctx.snap('planned');
    await clickText(page, 'RoutePlannerScene', /^DISPATCH$/);
    await wait(500);
    if (await ctx.eval(`(${S}._openModals || 0) > 0`)) throw new Error('the best plan was challenged as late at dispatch');
    await clickText(page, 'RoutePlannerScene', /^FAST/);
    if (!(await ctx.until(`${S}.state === 'result' && (${S}._openModals || 0) > 0`, 60000))) throw new Error(`round ${r + 1} never finished driving`);
    await wait(700);
    if (r === 0) await ctx.snap('round-result');
    await clickText(page, 'RoutePlannerScene', /^(Next Round|Finish)/);
  }
  await ctx.until('!!window.__qaResult', 8000);
  const res = await ctx.eval('window.__qaResult && window.__qaResult.result.ratios');
  const short = Object.keys(res || {}).filter(k => res[k] < 1);
  if (short.length) throw new Error('the best plan in every round did not score full marks: ' + JSON.stringify(res));
};
