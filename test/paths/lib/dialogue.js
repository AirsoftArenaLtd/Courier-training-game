/*
 * Golden path shared by the conversation scenarios (Modules 3 and 4, and the fender-bender): the whole
 * conversation played on the keyboard, always taking the recommended answer. It has to reach the good ending and
 * earn full marks in every category the scenario is scored on.
 */
const { wait, clickText, runTalk } = require('./ui');

module.exports = async (page, ctx) => {
  const S = `OTR.game.scene.getScene('DialogueScene')`;
  if (!(await ctx.until(`!!${S}.ctl`, 6000))) throw new Error('the conversation never started');
  await runTalk(page, `${S}.ctl`, { timeout: 150000 });
  await wait(1300);                                          // the outcome card, and its button unlocking
  await ctx.snap('outcome');
  await clickText(page, 'DialogueScene', /^See Results/);
  if (!(await ctx.until('!!window.__qaResult', 8000))) throw new Error('the outcome never went through to results');
  const r = await ctx.eval('window.__qaResult.result');
  if (r.stats.outcome !== 'good') throw new Error(`the recommended answers reached the "${r.stats.outcome}" ending`);
  const short = Object.keys(r.ratios || {}).filter(k => r.ratios[k] < 1);
  if (short.length) throw new Error('the recommended answers did not score full marks: ' + JSON.stringify(r.ratios));
};
