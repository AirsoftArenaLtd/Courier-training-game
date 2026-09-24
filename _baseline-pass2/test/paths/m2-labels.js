/*
 * Label Check: every package turned through all six sides on the real keys (D D D, W, S), then put on the right
 * handling station — by number key, or every third one dragged onto its station with the mouse — and each
 * verdict card read. A careful, correct inspection of every package has to earn full marks.
 */
const { wait } = require('./lib/ui');

module.exports = async (page, ctx) => {
  const S = `OTR.game.scene.getScene('LabelScene')`;
  await wait(1200);
  await page.keyboard.press('Enter');
  if (!(await ctx.until(`${S}.phase === 'run' && ${S}.queue && ${S}.queue.length > 0`, 6000))) throw new Error('the run never started');
  const ids = await ctx.eval(`Object.keys(${S}.content.stations)`);
  const n = await ctx.eval(`${S}.queue.length`);
  for (let i = 0; i < n; i++) {
    if (!(await ctx.until(`${S}.answering && ${S}.itemIndex === ${i}`, 12000))) throw new Error(`package ${i + 1} never arrived`);
    for (const k of ['KeyD', 'KeyD', 'KeyD', 'KeyW', 'KeyS']) { await page.keyboard.press(k); await wait(80); }
    const seen = await ctx.eval(`Object.keys(${S}.seen).length`);
    if (seen !== 6) throw new Error(`package ${i + 1}: only ${seen} of 6 sides registered as seen`);
    const it = await ctx.eval(`({ answer: ${S}.item.answer, li: JSON.stringify(${S}.item.marks || {}).indexOf('class9_li') >= 0 })`);
    if (i % 3 === 2) {
      const from = await ctx.eval(`({ x: ${S}.boxImg.x, y: ${S}.boxImg.y })`);
      const to = await ctx.eval(`(() => { const r = ${S}.bays['${it.answer}'].rect; return { x: r.centerX, y: r.centerY }; })()`);
      await page.mouse.move(from.x, from.y);
      await page.mouse.down();
      await page.mouse.move(to.x, to.y, { steps: 10 });
      await page.mouse.up();
    } else {
      await page.keyboard.press('Digit' + (ids.indexOf(it.answer) + 1));
    }
    await wait(900);                                          // box flies to the station, verdict card up
    if (await ctx.eval(`${S}.answering`)) throw new Error(`package ${i + 1}: the call was not taken`);
    if (it.li) await ctx.snap('verdict-lithium');
    if (i === 0) await ctx.snap('verdict');
    await page.keyboard.press('Space');
  }
  await ctx.until('!!window.__qaResult', 8000);
  const st = await ctx.eval(`${S}.stats`);
  if (st.blind) throw new Error(`${st.blind} careful inspection(s) were logged as blind calls`);
  const r = await ctx.eval('window.__qaResult && window.__qaResult.result.ratios');
  const short = Object.keys(r || {}).filter(k => r[k] < 1);
  if (short.length) throw new Error('a careful, correct run did not score full marks: ' + JSON.stringify(r));
};
