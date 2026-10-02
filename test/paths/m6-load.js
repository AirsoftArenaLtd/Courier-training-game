/*
 * Load for the Route: drag every package, with the real mouse, into a slot that breaks no rule (heaviest
 * first), check the hover card appears, strap the floor, roll out. A correct load has to earn full marks.
 */
module.exports = async (page, ctx) => {
  await ctx.wait(1200);
  await page.keyboard.press('Enter');
  await ctx.wait(900);
  const S = `OTR.game.scene.getScene('LoadingScene')`;

  // hovering a cart package lifts its label where it can be read
  const first = await ctx.eval(`(() => { const s = ${S}; const p = s.cart[0]; const i = s.sprites[p.id]; return { x: i.x, y: i.y }; })()`);
  await page.mouse.move(first.x, first.y);
  await ctx.wait(250);
  const card = await ctx.eval(`(() => { const s = ${S}; return !!(s.card && s.card.active && s.card.x + 132 <= 912); })()`);
  if (!card) throw new Error('hovering a package did not show its label card beside it');

  const plan = await ctx.eval(`(() => {
    const s = ${S};
    const used = new Set(), out = [];
    s.pkgs.slice().sort((a, b) => b.weight - a.weight).forEach(p => {
      const slot = s.slots.find(sl => !used.has(sl.id) && !s.problemsFor(p, sl).length);
      if (!slot) return;
      used.add(slot.id);
      out.push({ id: p.id, slot: slot.id, tx: slot.x + slot.w / 2, ty: slot.y + slot.h / 2 });
    });
    return out;
  })()`);
  const count = await ctx.eval(`${S}.pkgs.length`);
  if (plan.length !== count) throw new Error(`could not find a legal slot for every package: ${plan.length} of ${count}`);
  for (const step of plan) {
    const from = await ctx.eval(`(() => { const i = ${S}.sprites['${step.id}']; return { x: i.x, y: i.y }; })()`);
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move((from.x + step.tx) / 2, (from.y + step.ty) / 2, { steps: 4 });
    await page.mouse.move(step.tx, step.ty, { steps: 4 });
    await page.mouse.up();
    await ctx.wait(120);
    const where = await ctx.eval(`(() => { const p = ${S}.pkgs.find(x => x.id === '${step.id}'); return p.slotRef ? p.slotRef.id : null; })()`);
    if (where !== step.slot) throw new Error(`${step.id} landed in ${where}, not ${step.slot}`);
  }
  const btn = await ctx.eval(`(() => { const s = ${S}; return { strap: { x: s.strapBtn.x, y: s.strapBtn.y }, done: { x: s.doneBtn.x, y: s.doneBtn.y }, empty: s.cart.length === 0 }; })()`);
  if (!btn.empty) throw new Error('cart not empty after loading');
  await page.mouse.click(btn.strap.x, btn.strap.y);
  await ctx.wait(300);
  await page.mouse.click(btn.done.x, btn.done.y);
  await ctx.wait(700);
  await page.keyboard.press('Enter');                             // the load report card
  await ctx.until('!!window.__qaResult', 8000);
  const r = await ctx.eval('window.__qaResult && window.__qaResult.result.ratios');
  const short = Object.keys(r || {}).filter(k => r[k] < 1);
  if (short.length) throw new Error('a correct load did not score full marks: ' + JSON.stringify(r));
};
