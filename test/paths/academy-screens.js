/*
 * The academy's own screens, played the way a trainer and a trainee use them on one PC (a browser-only install):
 *   - Settings → Trainer: choose a PIN (twice), raise the safety pass mark and the attempts, save; a wrong PIN is
 *     refused next time and the right one opens the tools again
 *   - Settings → Access: turn on larger text, move "Check mirrors" to N (pressing N then reaches the game as M),
 *     reset the controls
 *   - Quizzes: take the Customer Interaction quiz, answering each question right, and pass it
 *   - a scenario brief → Assessment ▶ → its rules → play it on the recommended answers → ASSESSMENT PASSED
 *   - My record: the assessment and the quiz are on it, all three tabs, and Print / PDF builds the document
 * Larger text stays on from the Access step, so every screen after it is played and audited with it.
 */
const { wait, clickText, runTalk } = require('./lib/ui');

const PIN = '2468';

/** Click a button on the same row as a label (the nearest one to its right that says `btn`). */
async function clickBeside(page, sceneKey, label, btn) {
  const pt = await page.evaluate((key, ls, bs) => {
    const s = OTR.game.scene.getScene(key), L = new RegExp(ls), B = new RegExp(bs);
    const texts = [];
    const walk = (o) => { if (!o || o.visible === false) return; if (o.type === 'Text') texts.push(o); (o.list || []).forEach(walk); };
    s.children.list.forEach(walk);
    const l = texts.find(t => L.test(t.text));
    if (!l) return null;
    const lb = l.getBounds();
    const cands = texts.filter(t => B.test(t.text)).map(t => t.getBounds()).filter(b => b.centerX > lb.right && Math.abs(b.centerY - lb.centerY) < 30);
    cands.sort((a, b) => a.centerX - b.centerX);
    return cands[0] ? { x: cands[0].centerX, y: cands[0].centerY } : null;
  }, sceneKey, label.source, btn.source);
  if (!pt) throw new Error(`no ${btn} beside ${label}`);
  await page.mouse.click(pt.x, pt.y);
  await wait(250);
}

/** Click an icon button by its texture. */
async function clickIcon(page, sceneKey, tex) {
  const pt = await page.evaluate((key, tex) => {
    const s = OTR.game.scene.getScene(key);
    let hit = null;
    const walk = (o) => { if (!o || hit) return; if (o.texture && o.texture.key === tex && o.visible !== false) { const b = o.getBounds(); hit = { x: b.centerX, y: b.centerY }; } (o.list || []).forEach(walk); };
    s.children.list.forEach(walk);
    return hit;
  }, sceneKey, tex);
  if (!pt) throw new Error(`no ${tex} icon on ${sceneKey}`);
  await page.mouse.click(pt.x, pt.y);
  await wait(300);
}

module.exports = async (page, ctx) => {
  const active = async (key, ms) => {
    if (await ctx.until(`OTR.game.scene.isActive(${JSON.stringify(key)})`, ms || 15000)) { await wait(700); return; }
    // say what is on screen instead
    const seen = await ctx.eval(`(() => { const out = []; OTR.game.scene.getScenes(true).forEach(s => { const walk = (o) => { if (!o || o.visible === false) return; if (o.type === 'Text' && o.text) out.push(o.text); (o.list || []).forEach(walk); }; s.children.list.forEach(walk); out.unshift('[' + s.sys.settings.key + ']'); }); return out.slice(0, 30).join(' | '); })()`).catch(() => '?');
    throw new Error(`${key} never opened; on screen: ${seen}`);
  };
  const typeEnter = async (s) => { await page.keyboard.type(s); await wait(150); await page.keyboard.press('Enter'); await wait(700); };
  /** Wait for a box with this title on the hub, then type into it. */
  const typeInto = async (title, s) => {
    if (!(await ctx.until(`(() => { const h = OTR.game.scene.getScene('HubScene'); const st = h._modalStack || []; if (!st.length) return false;
      let hit = false; const walk = (o) => { if (!o || hit) return; if (o.type === 'Text' && o.text === ${JSON.stringify(title)}) hit = true; (o.list || []).forEach(walk); }; walk(st[st.length - 1]); return hit; })()`, 8000))) throw new Error(`no "${title}" box`);
    await wait(500);
    await typeEnter(s);
  };

  // a new trainee
  await page.evaluate(() => localStorage.clear());
  await ctx.reload();
  await page.keyboard.press('Enter');                                   // Start Training
  await wait(900);
  await typeEnter('Sam Rivera');
  await active('HubScene');

  /* ---- Trainer: choose a PIN, change the rules, save */
  await clickIcon(page, 'HubScene', 'ic_gear');
  await clickText(page, 'HubScene', /^Trainer$/);
  await typeInto('Choose a trainer PIN', PIN);
  await typeInto('Type it again', PIN);
  await active('TrainerScene');
  await ctx.audit('trainer');
  await clickBeside(page, 'TrainerScene', /^Safety$/, /^\+$/);           // 2 → 3 stars
  await clickBeside(page, 'TrainerScene', /^(1|no limit)$/, /^\+$/);    // attempts 1 → 2 (the stepper is under its label)
  await clickText(page, 'TrainerScene', /^Save rules$/);
  if (!(await ctx.until(`OTR.game.scene.getScene('TrainerScene').saveNote.text === 'Saved'`, 5000))) throw new Error('the rules never saved');
  const rules = await ctx.eval('OTR.academy.get()');
  if (rules.passStars.safety !== 3 || rules.attempts !== 2) throw new Error('the saved rules are not what was set: ' + JSON.stringify(rules));
  await page.keyboard.press('Escape');                                  // Done
  await active('HubScene');
  // the PIN now guards the tools: a wrong one is refused, the right one opens them
  await clickIcon(page, 'HubScene', 'ic_gear');
  await clickText(page, 'HubScene', /^Trainer$/);
  await typeInto('Trainer PIN', '1111');
  if (await ctx.eval(`OTR.game.scene.isActive('TrainerScene')`)) throw new Error('a wrong PIN opened the trainer tools');
  await typeInto('Trainer PIN (try again)', PIN);                       // a wrong PIN asks again
  await active('TrainerScene');
  await page.keyboard.press('Escape');
  await active('HubScene');

  /* ---- Access: larger text on, move a key, reset */
  await clickIcon(page, 'HubScene', 'ic_gear');
  await clickText(page, 'HubScene', /^Access$/);
  await active('AccessScene');
  await clickBeside(page, 'AccessScene', /^Larger text$/, /^Off$/);
  await active('AccessScene');                                          // it restarts at the new size
  if (!(await ctx.eval('OTR.a11y.large'))) throw new Error('Larger text did not turn on');
  await clickBeside(page, 'AccessScene', /^Check mirrors$/, /^Change$/);
  await page.keyboard.press('KeyN');
  await wait(400);
  const keyShown = await ctx.eval(`OTR.game.scene.getScene('AccessScene').keyTexts.KeyM.text`);
  if (keyShown !== 'N') throw new Error(`Check mirrors shows "${keyShown}" after pressing N`);
  // pressing N now reaches the game as its mirrors key
  await page.evaluate(() => { window.__codes = []; window.addEventListener('keydown', e => window.__codes.push(e.code)); });
  await page.keyboard.press('KeyN');
  await wait(200);
  const codes = await ctx.eval('window.__codes');
  if (codes.indexOf('KeyM') < 0) throw new Error('N did not reach the game as M: ' + JSON.stringify(codes));
  await ctx.audit('access (larger text)');
  await clickText(page, 'AccessScene', /^Reset controls$/);
  if ((await ctx.eval(`OTR.game.scene.getScene('AccessScene').keyTexts.KeyM.text`)) !== 'M') throw new Error('Reset controls did not put M back');
  await page.keyboard.press('Escape');                                  // Done
  await active('HubScene');

  /* ---- a quiz, answered right */
  await clickText(page, 'HubScene', /^Quizzes/);
  await active('QuizScene');
  await clickBeside(page, 'QuizScene', /^Customer Interaction$/, /^Start/);
  await active('QuizScene');
  const mid = await ctx.eval(`OTR.game.scene.getScene('QuizScene').mod.id`);
  for (let i = 0; i < 5; i++) {
    await wait(400);
    // the right answer for the question on screen, from the quiz's own data
    const right = await page.evaluate((mid) => {
      const s = OTR.game.scene.getScene('QuizScene'), q = s.qs[s.i];
      const src = OTR_DATA.quizzes[mid].find(x => x.q === q.q);
      return src.options[src.answer];
    }, mid);
    await clickText(page, 'QuizScene', new RegExp('^' + right.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'));
    await wait(700);
    if (i === 0) await ctx.audit('quiz answered');
    await page.keyboard.press('Enter');                                 // Next question / See my score
  }
  await wait(900);
  await ctx.audit('quiz result');
  const quiz = await ctx.eval(`OTR.save.data.quiz[${JSON.stringify(mid)}]`);
  if (!quiz || quiz.best !== 100 || !quiz.passedAt) throw new Error('the quiz was not recorded as passed: ' + JSON.stringify(quiz));
  await page.keyboard.press('Enter');                                   // All quizzes
  await active('QuizScene');
  await page.keyboard.press('Escape');                                  // Back
  await active('HubScene');

  /* ---- an assessment from its brief */
  await clickText(page, 'HubScene', /^Damaged on Arrival$/);
  await wait(600);
  await clickText(page, 'HubScene', /^Assessment ▶$/);
  await wait(900);
  await ctx.audit('assessment rules');
  await clickText(page, 'HubScene', /^Start ▶$/);
  await active('DialogueScene', 20000);
  const open = await ctx.eval(`(OTR.save.data.assess || {})['m4-damaged']`);
  if (!open || !open.pending) throw new Error('starting the assessment did not open an attempt: ' + JSON.stringify(open));
  const S = `OTR.game.scene.getScene('DialogueScene')`;
  await page.keyboard.press('Enter');                                   // the intro card
  if (!(await ctx.until(`!!${S}.ctl`, 8000))) throw new Error('the conversation never started');
  await runTalk(page, `${S}.ctl`, { timeout: 150000 });
  await wait(1300);
  await clickText(page, 'DialogueScene', /^See Results/);
  await active('ResultsScene');
  await wait(800);
  if (!(await ctx.until(`OTR.game.scene.getScene('ResultsScene').children.list.some(o => o.list && o.list.some(t => t.type === 'Text' && t.text === 'ASSESSMENT PASSED'))`, 4000))) throw new Error('the results do not say ASSESSMENT PASSED');
  await ctx.audit('assessment results');
  const rec = await ctx.eval(`OTR.save.data.assess['m4-damaged']`);
  if (!rec || !rec.passed) throw new Error('the assessment is not recorded as passed: ' + JSON.stringify(rec));
  await wait(1500);                                                     // the buttons unlock after the stars land
  await page.keyboard.press('Enter');                                   // To the station
  await active('HubScene');

  /* ---- the record: both on it, three tabs, print */
  await clickText(page, 'HubScene', /^My record/);
  await active('RecordScene');
  await ctx.audit('record: modules');
  const modules = await ctx.eval(`OTR.game.scene.getScene('RecordScene').body.list.filter(o => o.type === 'Text').map(t => t.text)`);
  if (modules.indexOf('✓ Passed') < 0) throw new Error('the record does not show the passed assessment');
  if (!modules.some(t => /^Quiz: best 100%, passed/.test(t))) throw new Error('the record does not show the quiz: ' + modules.filter(t => /Quiz/.test(t)).join(' | '));
  await page.keyboard.press('Digit2'); await wait(500); await ctx.audit('record: what to work on');
  await page.keyboard.press('Digit3'); await wait(500); await ctx.audit('record: recent runs');
  const recent = await ctx.eval(`OTR.game.scene.getScene('RecordScene').body.list.filter(o => o.type === 'Text').map(t => t.text)`);
  if (recent.indexOf('Assessment') < 0) throw new Error('recent runs do not list the assessment');
  await clickText(page, 'RecordScene', /^Print \/ PDF$/);
  await wait(800);
  const doc = await page.evaluate(() => { const f = [...document.querySelectorAll('iframe')].pop(); return f && f.contentDocument ? f.contentDocument.body.innerText : ''; });
  if (!/Training record: Sam Rivera/.test(doc) || !/Damaged on Arrival/.test(doc)) throw new Error('Print / PDF did not build the record document');
  await page.keyboard.press('Escape');                                  // Back
  await active('HubScene');
};
