/*
 * What narration says in the 3D cab (board task B-27): records every utterance the game hands to the browser's speech
 * instead of speaking it, while stepping through the cab controls with P, selecting R and reversing.
 *   QA_BASE=http://127.0.0.1:8302 node test/tools/narration-probe.js     (QA_BROWSER for the browser)
 * B-27 found it says nothing at all in the cab; B-30 (Codex) fixes that, and this probe shows the result.
 */
const pp = require('puppeteer-core');
const wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await pp.launch({ executablePath: process.env.QA_BROWSER || '/usr/bin/chromium', headless: true, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage(); await p.setViewport({ width: 1280, height: 720 });
  // record every utterance instead of speaking it
  await p.evaluateOnNewDocument(() => {
    window.__said = []; const t0 = Date.now();
    window.speechSynthesis = { speaking: false, pending: false, cancel() {}, pause() {}, resume() {}, getVoices: () => [], speak(u) { window.__said.push(((Date.now() - t0) / 1000).toFixed(1) + 's ' + u.text); } };
    window.SpeechSynthesisUtterance = function (text) { this.text = text; };
  });
  await p.goto((process.env.QA_BASE || 'http://127.0.0.1:8302') + '/first-person.html?gfx=low');
  await p.waitForFunction(() => window.OTR && OTR.game && OTR.game.scene.isActive('FirstPersonScene') && !OTR.game.scene.getScene('FirstPersonScene').loading, { timeout: 60000 });
  await p.evaluate(() => { OTR.a11y.settings().narrate = true; const s = OTR.game.scene.getScene('FirstPersonScene'); s.closePanel(); s.progress.sequence = 9; s.progress.campaign = null; s.progress.welcomed = true; s.launch('campaign'); });
  await p.waitForFunction(() => !OTR.game.scene.getScene('FirstPersonScene').transitioning, { timeout: 60000 });
  await p.evaluate(() => { const s = OTR.game.scene.getScene('FirstPersonScene'), m = s.model; s.closePanel(); m.mode = 'cab'; m.phase = 'route'; m.departed = true; m.secured = true; m.events[m.briefKey] = true; Object.assign(m.van, { speed: 0, hand: true, belt: true, gear: 1, look: 0 }); s.sync(); s.keyboardMode = true; window.__said.length = 0; });
  const mark = async (label) => p.evaluate((l) => window.__said.push('--- ' + l), label);
  await mark('step through cab controls with P (6 presses)');
  for (let i = 0; i < 6; i++) { await p.keyboard.press('KeyP'); await wait(500); }
  await mark('look forward, select R with the R key');
  await p.keyboard.press('KeyV'); await wait(300); await p.keyboard.press('KeyR'); await wait(1500);
  await mark('release brake, reverse 4 s towards whatever is behind');
  await p.keyboard.press('Space'); await p.keyboard.down('KeyW'); await wait(4000); await p.keyboard.up('KeyW');
  await p.keyboard.down('KeyS'); await wait(1500); await p.keyboard.up('KeyS'); await p.keyboard.press('Space'); await wait(800);
  const out = await p.evaluate(() => ({ said: window.__said, hint: OTR.game.scene.getScene('FirstPersonScene').hint.text }));
  console.log(out.said.join('\n')); console.log('on-screen hint at the end:', out.hint);
  await b.close();
})();
