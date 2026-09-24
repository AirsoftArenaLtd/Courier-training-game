/*
 * Shared helpers for golden paths: find things on screen the way a trainee would (by what they say) and click
 * them with the real mouse, and play a conversation through by its best answers.
 */
const wait = (ms) => new Promise(r => setTimeout(r, ms));

/** Screen centre of the top-most visible Text in a scene matching `re`, or null. */
async function findText(page, sceneKey, re) {
  return page.evaluate((key, src, flags) => {
    const rx = new RegExp(src, flags);
    const s = OTR.game.scene.getScene(key);
    let best = null, bestDepth = -Infinity;
    const walk = (o, depth) => {
      if (!o || o.visible === false || (o.alpha !== undefined && o.alpha < 0.3)) return;
      const d = Math.max(depth, o.depth || 0);
      if (o.type === 'Text' && rx.test(o.text)) {
        const b = o.getBounds();
        if (b.width > 0 && d >= bestDepth) { bestDepth = d; best = { x: b.centerX, y: b.centerY, text: o.text }; }
      }
      (o.list || []).forEach(k => walk(k, d));
    };
    s.children.list.forEach(o => walk(o, o.depth || 0));
    return best;
  }, sceneKey, re.source, re.flags);
}

async function clickText(page, sceneKey, re, timeout) {
  const t0 = Date.now();
  let pt = null;
  while (!pt && Date.now() - t0 < (timeout || 4000)) {
    pt = await findText(page, sceneKey, re);
    if (!pt) await wait(120);
  }
  if (!pt) throw new Error(`nothing on screen says ${re}`);
  await page.mouse.click(pt.x, pt.y);
  await wait(160);
  return pt;
}

/**
 * Play a conversation to its end, always taking the best-graded answer. `ctl` is an expression for the talk
 * controller. Uses the keyboard, as a trainee could: SPACE to advance, 1-4 to answer.
 */
async function runTalk(page, ctl, opts) {
  opts = opts || {};
  const t0 = Date.now();
  const rank = { good: 3, ok: 2, bad: 1 };
  while (Date.now() - t0 < (opts.timeout || 60000)) {
    const st = await page.evaluate(`(() => { const c = ${ctl}; if (!c || c.done) return null;
      return { mode: c.mode, choices: c.mode === 'choices' ? c.choiceList.map(x => x.grade) : null }; })()`);
    if (!st) return;
    if (st.mode === 'choices') {
      let bi = 0;
      st.choices.forEach((g, i) => { if ((rank[g] || 0) > (rank[st.choices[bi]] || 0)) bi = i; });
      await wait(250);
      await page.keyboard.press('Digit' + (bi + 1));
      await wait(600);
    } else if (st.mode === 'acting' || st.mode === 'resolving') {
      await wait(200);
    } else {
      await page.keyboard.press('Space');
      await wait(260);
    }
  }
  throw new Error('conversation did not finish');
}

module.exports = { wait, findText, clickText, runTalk };
