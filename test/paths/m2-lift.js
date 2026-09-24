/*
 * Lift Right: every load sized up with the recommended choice, then lifted with textbook technique on the real
 * keys — step in to the load, bend the knees until the back is straight, grip, stand fully upright, walk it to the
 * pallet, lower it with the knees, let go. Good technique on the right choice must cost no Back Health at all and
 * earn full marks.
 */
const { wait, clickText } = require('./lib/ui');
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

module.exports = async (page, ctx) => {
  const S = `OTR.game.scene.getScene('LiftingScene')`;
  const st = () => ctx.eval(`(() => { const s = ${S}; const P = s.pose, L = s.lift; if (!L) return null;
    const g = s.gripPoint(); const hands = P.x + P.dir * (20 + L.w / 2);
    return { i: s.liftIndex, phase: s.phase, on: s.postureOn, x: P.x, squat: P.squat, stoop: P.stoop, hold: P.hold,
      gap: g.x - hands, canGrip: !!s.canGrip, over: Math.abs(P.x - s.PALLET_X), palletGap: s.PALLET_TOP - s.heldBox().bottom,
      health: s.health, peak: s.peakLoad || 0 }; })()`);
  const hold = async (key, until, ms) => {
    await page.keyboard.down(key);
    const t0 = Date.now();
    try {
      while (Date.now() - t0 < (ms || 4000)) { if (until(await st())) return true; await wait(16); }
      return false;
    } finally { await page.keyboard.up(key); }
  };

  await wait(1200);
  await page.keyboard.press('Enter');
  const lifts = await ctx.eval(`${S}.content.lifts.length`);
  for (let i = 0; i < lifts; i++) {
    if (!(await ctx.until(`${S}.liftIndex === ${i}`, 12000))) throw new Error(`lift ${i + 1} never came up`);
    const good = await ctx.eval(`${S}.lift.options.find(o => o.grade === 'good')`);
    await wait(1100);                                         // the box drops in, then the size-up card
    await clickText(page, 'LiftingScene', new RegExp('^\\d\\.\\s+' + esc(good.text) + '$'));
    await wait(700);
    await page.keyboard.press('Space');                       // the coaching card
    if (good.effect === 'equipment') {
      if (!(await ctx.until(`${S}.liftIndex !== ${i}`, 9000))) throw new Error('the hand truck never finished');
      continue;
    }
    if (!(await ctx.until(`${S}.postureOn && ${S}.phase === 'approach'`, 6000))) throw new Error(`lift ${i + 1}: never got to the lift`);
    await wait(good.effect === 'stool' ? 500 : 100);
    // step in until the hands are at the load
    let s = await st();
    if (Math.abs(s.gap) > 6) await hold(s.gap > 0 ? 'KeyD' : 'KeyA', q => Math.abs(q.gap) <= 6);
    // knees, not back
    s = await st();
    if (s.stoop > 0.03 || !s.canGrip) await hold('KeyS', q => q.canGrip && q.stoop <= 0.03);
    s = await st();
    if (!s.canGrip || s.stoop > 0.05) throw new Error(`lift ${i + 1}: could not get a straight-backed grip (stoop ${s.stoop.toFixed(2)})`);
    await page.keyboard.press('Space');
    await wait(250);
    // stand all the way up, then walk it to the pallet
    await hold('KeyW', q => q.squat <= 0.001);
    await hold('KeyA', q => q.over <= 12, 6000);
    // lower it with the knees and let go
    await hold('KeyS', q => q.palletGap <= 6, 4000);
    await page.keyboard.press('Space');
    await wait(300);
    s = await st();
    if (s.peak > 0.5) throw new Error(`lift ${i + 1}: textbook technique still put the spine over the line (peak ${s.peak.toFixed(2)})`);
    if (s.health < 100) throw new Error(`lift ${i + 1}: textbook technique cost Back Health (${s.health.toFixed(1)})`);
    if (!(await ctx.until(`${S}.liftIndex !== ${i}`, 6000))) throw new Error(`lift ${i + 1} never finished`);
  }
  await ctx.until('!!window.__qaResult', 8000);
  const r = await ctx.eval('window.__qaResult && window.__qaResult.result.ratios');
  const short = Object.keys(r || {}).filter(k => r[k] < 1);
  if (short.length) throw new Error('textbook lifting did not score full marks: ' + JSON.stringify(r));
};
