/*
 * Spot the Hazard: five clips. The golden path presses SPACE just after each hazard's first clue (the earliest a
 * trainee could fairly react) and must score 5 / 5 on every clip. On the way it checks the rules that make it a test:
 * a press before the clue alone scores nothing, and pressing over and over scores nothing.
 */
module.exports = async (page, ctx) => {
  const S = `OTR.game.scene.getScene('HazardScene')`;
  await ctx.wait(1200);
  await page.keyboard.press('Enter');                                // "First clip"
  const n = await ctx.eval(`${S}.content.clips.length`);
  for (let i = 0; i < n; i++) {
    if (!(await ctx.until(`${S}.clipIndex === ${i} && ${S}.run && !${S}.run.done`, 15000))) throw new Error(`clip ${i + 1} never started`);
    if (i === 0) await ctx.snap('clip1');
    const at = await ctx.eval(`${S}.clip.at`);
    // react a moment after the clue
    if (!(await ctx.until(`${S}.run.t >= ${at + 0.25}`, 60000))) throw new Error(`clip ${i + 1}: its clue never came`);
    if (i === 0) await ctx.snap('clue');
    await page.keyboard.press('Space');
    if (!(await ctx.until(`${S}.run.done`, 60000))) throw new Error(`clip ${i + 1} never finished`);
    const r = await ctx.eval(`${S}.results[${i}]`);
    if (r.pts !== 5) throw new Error(`clip ${i + 1} (${r.id}) scored ${r.pts}/5 for a press just after the clue`);
    await ctx.wait(800);
    await page.keyboard.press('Enter');                              // next clip / see my score
  }
  // the rules, checked on the scoring itself
  const rules = await ctx.eval(`(() => {
    const s = ${S}, C = s.content, clip = C.clips[0], score = (f) => s.points(f, clip).pts;
    return { early: score([clip.at - 1]), spam: score([1, 2, 3, 4, 5, 6, 7, 8]), late: score([clip.at + C.window + 1]), slow: score([clip.at + 3.2]) };
  })()`);
  if (rules.early !== 0 || rules.spam !== 0 || rules.late !== 0 || rules.slow !== 2) throw new Error('hazard scoring rules: ' + JSON.stringify(rules));
};
