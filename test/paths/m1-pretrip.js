/*
 * Pre-Trip Walkaround: lights on in the cab, then every item on every side of the truck, each one tested the way
 * the close-up asks (horn pressed, belt pulled, brake held, tread gauged) and called correctly. Checks on the
 * way that a verdict is refused until the test is done. A perfect walkaround has to earn full marks.
 */
const { wait, clickText } = require('./lib/ui');

module.exports = async (page, ctx) => {
  const S = `OTR.game.scene.getScene('PreTripScene')`;
  await wait(1200);
  await page.keyboard.press('Enter');
  await wait(900);

  // the rings on screen right now, by item
  const spots = () => ctx.eval(`${S}.spotLayer.list.filter(o => o.name && o.name.startsWith('spot:') && o.input && o.input.enabled)
    .map(o => ({ id: o.name.slice(5), x: o.x, y: o.y }))`);
  const marked = (id) => ctx.eval(`!!${S}.marks['${id}']`);

  const inspectAll = async () => {
    for (const s of await spots()) {
      if (await marked(s.id)) continue;
      const item = await ctx.eval(`(() => { const it = ${S}.content.items.find(i => i.id === '${s.id}'); return { needs: it.needs || null, kind: it.kind, bad: !!${S}.defects[it.id] }; })()`);
      await page.mouse.click(s.x, s.y);
      await wait(450);
      if (!(await ctx.eval(`(${S}._openModals || 0) > 0`))) throw new Error(`clicking ${s.id} did not open its close-up`);
      if (item.needs === 'press' || item.needs === 'gauge') {
        if (await ctx.eval(`${S}._judge.pass.enabled || ${S}._judge.flag.enabled`)) throw new Error(`${s.id} could be judged before it was tested`);
      }
      if (item.needs === 'press') {
        await clickText(page, 'PreTripScene', /^(Press the horn|Press and hold the brake|Pull the belt out|Pull on the latch)( \(T\))?$/);
      } else if (item.needs === 'gauge') {
        // drag the tread gauge from its tray onto the tyre
        const g = await ctx.eval(`(() => { const m = ${S}.children.list.filter(o => o.depth === 5000).pop(); const box = m.list[1];
          const img = box.list.find(o => o.type === 'Image' && o.input && o.input.draggable); return { x: box.x + img.x, y: box.y + img.y, bx: box.x, by: box.y }; })()`);
        await page.mouse.move(g.x, g.y);
        await page.mouse.down();
        await page.mouse.move(g.bx - 40, g.by - 20, { steps: 12 });
        await page.mouse.up();
        await wait(300);
      }
      await wait(150);
      // (the brake's press plays out for a few seconds before it can be judged: a failing pedal creeps down)
      if (!(await ctx.until(`${S}._judge.pass.enabled`, 5000))) throw new Error(`${s.id} still cannot be judged after its test`);
      await clickText(page, 'PreTripScene', item.bad ? /^Flag defect/ : /^Pass/);
      await wait(450);
      if (!(await marked(s.id))) throw new Error(`the verdict on ${s.id} was not recorded`);
    }
  };

  // lamps cannot be judged in the dark: into the cab, lights on, and the cab's own items while there
  await clickText(page, 'PreTripScene', /^Climb into the cab/);
  await wait(400);
  const sw = await ctx.eval(`${S}._cabZone ? { x: ${S}._cabZone.x, y: ${S}._cabZone.y } : null`);
  if (!sw) throw new Error('no light switch in the cab');
  await page.mouse.click(sw.x, sw.y);
  await wait(300);
  if (!(await ctx.eval(`${S}.lights`))) throw new Error('clicking the light switch did not turn the lights on');
  await inspectAll();
  await clickText(page, 'PreTripScene', /^Climb back out/);
  await wait(400);

  // all the way round the truck
  for (let i = 0; i < 4; i++) {
    await inspectAll();
    const arrow = await ctx.eval(`({ x: ${S}.rightArrow.x, y: ${S}.rightArrow.y })`);
    await page.mouse.click(arrow.x, arrow.y);
    await wait(400);
  }
  const left = await ctx.eval(`${S}.content.items.filter(it => !${S}.marks[it.id]).map(it => it.id)`);
  if (left.length) throw new Error('items never reached: ' + left.join(', '));

  await clickText(page, 'PreTripScene', /^Sign off/);
  await wait(900);
  await ctx.snap('report');
  await clickText(page, 'PreTripScene', /^Finish/);
  await ctx.until('!!window.__qaResult', 8000);
  const r = await ctx.eval('window.__qaResult && window.__qaResult.result.ratios');
  const short = Object.keys(r || {}).filter(k => r[k] < 1);
  if (short.length) throw new Error('a perfect walkaround did not score full marks: ' + JSON.stringify(r));
};
