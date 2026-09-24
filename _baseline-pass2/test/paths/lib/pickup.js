/*
 * Golden path shared by the three pickup scenarios: the best answer in the conversation, count every piece
 * with the mouse, reconcile the count correctly, inspect and decide every piece with the right reason, find
 * every paperwork problem, finish and sign. A perfect run must score full marks in every category.
 */
const { wait, clickText, runTalk } = require('./ui');
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

module.exports = async (page, ctx) => {
  const S = `OTR.game.scene.getScene('PickupScene')`;
  await wait(1200);
  await page.keyboard.press('Enter');
  await wait(900);
  await runTalk(page, `${S}.talkCtl`);
  await wait(600);

  const pieces = await ctx.eval(`${S}.pieces.map(p => { const i = ${S}.pieceImgs[p.id]; return { id: p.id, x: i.x, y: i.y - i.displayHeight / 2, accept: p.accept, reason: p.reason }; })`);
  for (const p of pieces) { await page.mouse.click(p.x, p.y); await wait(150); }
  const shown = await ctx.eval(`${S}.panel.list.filter(o => o.type === 'Text').map(o => o.text).join(' | ')`);
  if (new RegExp(`of ${pieces.length}\\b`).test(shown)) throw new Error('the panel gives away how many pieces there are: ' + shown);

  await clickText(page, 'PickupScene', /^Confirm the count$/);
  await wait(600);
  const best = await ctx.eval(`(() => { const c = ${S}.countChoices; let bi = 0; c.forEach((o, i) => { if (o.got > c[bi].got) bi = i; }); return bi; })()`);
  await page.keyboard.press('Digit' + (best + 1));
  await wait(800);
  if (await ctx.eval(`(${S}._openModals || 0) > 0`)) { await clickText(page, 'PickupScene', /^OK$/); await wait(500); }

  const reasons = await ctx.eval('OTR_DATA.pickups.reasons.map(r => r.id)');
  for (const p of pieces) {
    await page.mouse.click(p.x, p.y);
    await wait(650);
    if (p.accept) await clickText(page, 'PickupScene', /^Accept$/);
    else {
      await clickText(page, 'PickupScene', /^Refuse/);
      await wait(650);
      await page.keyboard.press('Digit' + (reasons.indexOf(p.reason) + 1));
    }
    await wait(700);
  }
  // a second click on a decided piece must not open it again
  await page.mouse.click(pieces[0].x, pieces[0].y);
  await wait(400);
  if (await ctx.eval(`(${S}._openModals || 0) > 0`)) throw new Error('a decided piece could be inspected (and re-scored) again');

  const docs = await ctx.eval(`${S}.content.docs ? ${S}.content.docs.fields.map(f => ({ label: f.label, bad: !!f.bad })) : null`);
  if (docs) {
    await clickText(page, 'PickupScene', /^Check the paperwork$/);
    await wait(650);
    for (const f of docs) if (f.bad) await clickText(page, 'PickupScene', new RegExp('^' + esc(f.label) + '$'));
    await clickText(page, 'PickupScene', /^Submit findings$/);
    await wait(700);
    await clickText(page, 'PickupScene', /^OK$/);
    await wait(500);
  }
  await clickText(page, 'PickupScene', /Finish the pickup/);
  await wait(2400);                                      // the signature draws itself
  await clickText(page, 'PickupScene', /Done$/);
  await ctx.until('!!window.__qaResult', 8000);
  const r = await ctx.eval('window.__qaResult && window.__qaResult.result.ratios');
  const short = Object.keys(r || {}).filter(k => r[k] < 1);
  if (short.length) throw new Error('a perfect pickup did not score full marks: ' + JSON.stringify(r));
};
