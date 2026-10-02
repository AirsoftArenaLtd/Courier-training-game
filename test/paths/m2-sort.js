/*
 * Sort Belt: the whole shift. Every package is scanned before it is sent and sent to the right bin — most with
 * the number keys (each bin's own number, the same all shift), every fourth one dragged there with the mouse —
 * every jam is cleared and every rule card read.
 * At each wave it checks that the bins on the floor are exactly that wave's bins. A clean shift has to earn full
 * marks.
 */
const { wait } = require('./lib/ui');

module.exports = async (page, ctx) => {
  const S = `OTR.game.scene.getScene('SortingScene')`;
  await wait(1200);
  await page.keyboard.press('Enter');
  let sent = 0, dragged = 0, wave = -1, waveAt = 0, checked = -1;
  const t0 = Date.now();
  while (Date.now() - t0 < 300000) {
    const st = await ctx.eval(`(() => { const s = ${S}; const f = s.keyTarget();
      return { state: s.state, wave: s.waveIndex, modals: s._openModals || 0, jammed: !!s.jammed, finished: !!s.finished,
        front: f ? { scanned: f.scanned, x: f.img.x, y: f.img.y, bin: s.correctBin(f) } : null,
        active: s.activeBins.slice(), bx: s.activeBins.map(id => s.bins[id].x), keys: s.activeBins.map(id => s.binKeys[id]),
        shown: Object.values(s.bins).filter(b => b.c.visible && b.c.y > 400 && b.c.y < 700).map(b => b.id) }; })()`);
    if (st.finished || st.state === 'done') break;
    if (st.modals > 0) { await wait(250); await page.keyboard.press('Enter'); await wait(400); continue; }
    if (st.state !== 'play') { await wait(100); continue; }
    if (st.wave !== wave) { wave = st.wave; waveAt = Date.now(); }
    if (checked !== wave && Date.now() - waveAt > 1500) {
      checked = wave;
      const extra = st.shown.filter(id => st.active.indexOf(id) < 0);
      const absent = st.active.filter(id => st.shown.indexOf(id) < 0);
      if (extra.length || absent.length) throw new Error(`wave ${wave + 1}: bins on the floor ${st.shown.join(',')} but the wave uses ${st.active.join(',')}`);
      if (wave === 3) await ctx.snap('wave4');
    }
    if (st.jammed) { await page.keyboard.press('Space'); await wait(120); continue; }
    if (!st.front) { await wait(80); continue; }
    if (!st.front.scanned) { await page.keyboard.press('Space'); await wait(90); continue; }
    const idx = st.active.indexOf(st.front.bin);
    if (idx < 0) throw new Error(`package bound for ${st.front.bin}, which is not on the floor`);
    if (sent % 4 === 3) {
      await page.mouse.move(st.front.x, st.front.y);
      await page.mouse.down();
      await page.mouse.move(st.bx[idx], 540, { steps: 6 });
      await page.mouse.up();
      dragged++;
    } else {
      await page.keyboard.press('Digit' + st.keys[idx]);
    }
    sent++;
    await wait(90);
  }
  if (!(await ctx.until('!!window.__qaResult', 10000))) throw new Error('the shift never finished');
  const stats = await ctx.eval(`${S}.stats`);
  console.log('        sort:', JSON.stringify({ sent, dragged, correct: stats.correct, wrong: stats.wrong, missed: stats.missed, blind: stats.blind, specials: `${stats.excCorrect}/${stats.excTotal}`, jams: `${stats.jamsCleared}/${stats.jams}` }));
  if (dragged < 3) throw new Error('the mouse drag path was hardly exercised');
  const r = await ctx.eval('window.__qaResult && window.__qaResult.result.ratios');
  const short = Object.keys(r || {}).filter(k => r[k] < 1);
  if (short.length) throw new Error('a clean shift did not score full marks: ' + JSON.stringify(r));
};
