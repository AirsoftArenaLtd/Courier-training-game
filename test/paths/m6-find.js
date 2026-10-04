/*
 * Find It Fast: work all five rounds, hovering a decoy first each time.
 * The hover is the point — it used to wipe the round prompt off the panel.
 */
module.exports = async (page, ctx) => {
  await ctx.wait(1200);
  await page.keyboard.press('Enter');
  await ctx.wait(1400);

  const S = `OTR.game.scene.getScene('LoadingScene')`;
  const rounds = await ctx.eval(`${S}.content.rounds.length`);

  for (let i = 0; i < rounds; i++) {
    const ready = await ctx.until(`${S}.round && ${S}.roundTimerText && ${S}.roundTimerText.active`, 8000);
    if (!ready) throw new Error(`round ${i + 1} never started`);

    // hover a package that is NOT the target, the way a player scanning the shelves would
    const decoy = await ctx.eval(`(() => {
      const s = ${S};
      const id = Object.keys(s.sprites).find(k => k !== s.round.pkg && s.sprites[k].visible);
      const sp = s.sprites[id];
      return JSON.stringify({ id, x: Math.round(sp.x), y: Math.round(sp.y) });
    })()`);
    const d = JSON.parse(decoy);
    await page.mouse.move(d.x, d.y);
    await ctx.wait(220);

    // the prompt must survive the hover
    const promptAlive = await ctx.eval(`(() => {
      const s = ${S};
      const texts = s.panelBody.list.filter(o => o.type === 'Text').map(o => (o.srcText ?? o.text));
      return texts.some(t => /FIND THIS ADDRESS/.test(t)) && texts.length >= 4;
    })()`);
    if (!promptAlive) throw new Error(`round ${i + 1}: hovering a package wiped the round prompt`);

    // the address on the panel must be the address of the target package
    const matches = await ctx.eval(`(() => {
      const s = ${S};
      const p = s.pkgs.find(x => x.id === s.round.pkg);
      const want = p.number + ' ' + p.street;
      return s.panelBody.list.some(o => o.type === 'Text' && (o.srcText ?? o.text) === want);
    })()`);
    if (!matches) throw new Error(`round ${i + 1}: the panel is not showing the target address`);

    const target = JSON.parse(await ctx.eval(`(() => {
      const s = ${S};
      const sp = s.sprites[s.round.pkg];
      return JSON.stringify({ x: Math.round(sp.x), y: Math.round(sp.y) });
    })()`));
    await page.mouse.move(target.x, target.y);
    await ctx.wait(120);
    await page.mouse.down(); await ctx.wait(60); await page.mouse.up();
    await ctx.wait(900);
  }

  // clicking a finished round's package again must not score twice
  const before = await ctx.eval(`${S}.roundIndex`);
  await page.mouse.down(); await ctx.wait(50); await page.mouse.up();
  await ctx.wait(400);
  const after = await ctx.eval(`${S}.roundIndex`);
  if (after > before + 1) throw new Error('a second click on a finished round advanced the run again');

  const done = await ctx.until(`!!window.__qaResult`, 12000);
  if (!done) throw new Error('the run never completed');
  await ctx.snap('complete');
};
