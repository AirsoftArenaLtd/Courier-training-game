/*
 * The hub's scenario briefs, every one: a new courier opens each scenario from the Training Academy, the way a
 * trainee does, and each brief must fit on screen with its text clear of the star ratings and the buttons, and pass
 * the layout audit. (At a fixed height, three briefs ran their controls line under the star ratings.)
 */
const { wait, clickText } = require('./lib/ui');

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

module.exports = async (page, ctx) => {
  await page.evaluate(() => localStorage.clear());
  await ctx.reload();
  await page.keyboard.press('Enter');                          // Start Training
  await wait(900);
  await page.keyboard.type('QA Courier');
  await page.keyboard.press('Enter');
  if (!(await ctx.until(`OTR.game.scene.getScenes(true).some(s => s.sys.settings.key === 'HubScene')`, 15000))) throw new Error('never reached the hub');
  await wait(900);

  const list = await ctx.eval('OTR.registry.all().map(s => ({ id: s.id, title: s.title }))');
  const bad = [];
  for (const sc of list) {
    await clickText(page, 'HubScene', new RegExp('^' + escape(sc.title) + '$'));
    if (!(await ctx.until(`(OTR.game.scene.getScene('HubScene')._modalStack || []).length > 0`, 3000))) { bad.push(`${sc.id}: clicking "${sc.title}" opened no brief`); continue; }
    await wait(450);                                           // the brief's opening animation
    const m = await ctx.eval(`(() => {
      const hub = OTR.game.scene.getScene('HubScene'), sc = OTR.registry.get(${JSON.stringify(sc.id)});
      const root = hub._modalStack[hub._modalStack.length - 1];
      const all = [];
      const walk = (o) => { if (!o) return; all.push(o); (o.list || []).forEach(walk); };
      walk(root);
      const b = (o) => o.getBounds();
      const texts = all.filter(o => o.type === 'Text');
      const ctl = texts.find(t => t.text === sc.controls);
      const learn = texts.filter(t => sc.learn.indexOf(t.text) >= 0);
      const chips = all.filter(o => o.type === 'Container' && o.list && o.list.some(k => k.type === 'Text' && /^(safety|efficiency|service)$/i.test(k.text)));
      const btns = all.filter(o => o.type === 'Container' && o.list && o.list.some(k => k.type === 'Text' && /^(Back|Start|Play Again|Day full)/.test(k.text)));
      const panel = root.list[1] && root.list[1].list && root.list[1].list[0];
      const pb = panel && b(panel);
      return {
        ctlBottom: ctl ? b(ctl).bottom : null,
        lastLearn: learn.length ? Math.max(...learn.map(t => b(t).bottom)) : null,
        chipTop: chips.length ? Math.min(...chips.map(c => b(c).top)) : null,
        chipBottom: chips.length ? Math.max(...chips.map(c => b(c).bottom)) : null,
        btnTop: btns.length ? Math.min(...btns.map(c => b(c).top)) : null,
        panel: pb ? { top: pb.top, bottom: pb.bottom } : null
      };
    })()`);
    if (m.ctlBottom === null || m.chipTop === null || m.btnTop === null) bad.push(`${sc.id}: the brief is missing its controls, ratings or buttons`);
    else {
      if (m.ctlBottom > m.chipTop - 6) bad.push(`${sc.id}: the controls line runs into the star ratings (${Math.round(m.ctlBottom)} vs ${Math.round(m.chipTop)})`);
      if (m.chipBottom > m.btnTop - 6) bad.push(`${sc.id}: the star ratings run into the buttons`);
      if (m.lastLearn !== null && m.lastLearn > m.chipTop) bad.push(`${sc.id}: the practice list runs into the star ratings`);
    }
    if (m.panel && (m.panel.top < 0 || m.panel.bottom > 720)) bad.push(`${sc.id}: the brief is taller than the screen`);
    await ctx.audit('brief ' + sc.id);
    await page.keyboard.press('Escape');
    await ctx.until(`(OTR.game.scene.getScene('HubScene')._modalStack || []).length === 0`, 3000);
    await wait(250);
  }
  await ctx.snap('hub');
  if (bad.length) throw new Error(bad.join(' | '));
};
