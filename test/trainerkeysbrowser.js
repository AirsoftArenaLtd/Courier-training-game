#!/usr/bin/env node
/*
 * B-62: the trainer's dialogs from the keyboard alone. On the trainer screen, Tab reaches "3D workday aids…" and Enter
 * opens it; in the dialog Tab reaches every choice and Done, Enter picks one, and Escape closes it. New account takes
 * the employee ID and then the name from the keyboard; Escape leaves it. The temporary-password card closes with Enter
 * and with Escape. No mouse is used. The page is told it is on a training server with accounts (no server is needed:
 * the trainee list just fails to load).
 *
 *   QA_BROWSER=/path/to/chrome node test/trainerkeysbrowser.js         (QA_LANG=ta to run it in another language)
 */
'use strict';
const path = require('path');
const pp = require('puppeteer-core');
const BROWSER = process.env.QA_BROWSER || '/opt/pw-browsers/chromium';
const LANG = process.env.QA_LANG || '';
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html') + '?user=keys&name=Sam%20Lee' + (LANG ? `&lang=${LANG}&dev=1` : '');
const wait = (ms) => new Promise(r => setTimeout(r, ms));
let checks = 0;
const fails = [];
const check = (ok, what) => { checks++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) fails.push(what); };

(async () => {
  const b = await pp.launch({ executablePath: BROWSER, headless: 'new', args: ['--no-sandbox', '--allow-file-access-from-files', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const errors = [];
  try {
    const p = await b.newPage();
    await p.setViewport({ width: 1280, height: 720 });
    p.on('pageerror', e => errors.push(e.message));
    const ev = (f, ...a) => p.evaluate(f, ...a);
    const until = async (src, ms) => { const t0 = Date.now(); while (Date.now() - t0 < (ms || 15000)) { if (await p.evaluate(src).catch(() => false)) return true; await wait(150); } return false; };
    const key = async (k, n) => { for (let i = 0; i < (n || 1); i++) { await p.keyboard.press(k); await wait(120); } };
    // the English of what the focus ring is on (a button's label), or null
    const ring = () => ev(() => { const s = OTR.game.scene.getScene('TrainerScene'), f = s._focusOn, c = f && f.current && f.current(); return c && c.label ? OTR.i18n.src(c.label) : null; });
    const modals = () => ev(() => (OTR.game.scene.getScene('TrainerScene')._modalStack || []).filter(m => m.active).length);
    // Tab until the ring is on a control whose English matches; true if it got there
    const tabTo = async (re, max) => { for (let i = 0; i < (max || 40); i++) { await key('Tab'); const at = await ring(); if (at && re.test(at)) return true; } return false; };
    await p.goto(URL);
    if (!(await until(`OTR.game.scene.isActive('TitleScene')`, 20000))) throw new Error('the title never opened');
    const trainer = async () => {
      await ev(() => { OTR.identity.mode = 'server'; OTR.identity.accounts = true; const m = OTR.game.scene; m.getScenes(true).forEach(s => m.stop(s.sys.settings.key)); m.start('TrainerScene', {}); });
      if (!(await until(`OTR.game.scene.isActive('TrainerScene')`, 15000))) throw new Error('the trainer screen never opened');
      await wait(900);
    };
    await trainer();

    // 3D workday aids: open, every control reachable, pick "Off" for the sat nav, Done, then Escape on a second opening
    check(await tabTo(/^3D workday aids/), 'Tab reaches "3D workday aids…" on the trainer screen');
    await key('Enter'); await wait(500);
    check(await modals() === 1, 'Enter opens the aids dialog');
    const seen = new Set();
    for (let i = 0; i < 20; i++) { await key('Tab'); const at = await ring(); if (at) seen.add(at + '#' + i); }
    const labels = new Set([...seen].map(x => x.split('#')[0]));
    ['Fade by day', 'Full', 'Light', 'Off', 'Turn by turn', 'Route line', 'Optional', 'Required', 'On', 'Done'].forEach(l => check(labels.has(l), `Tab reaches "${l}" in the aids dialog`));
    // the sat nav's "Off" is the 8th control in reading order (four assists, then Fade by day, Turn by turn, Route line, Off)
    let picked = false;
    for (let i = 0; i < 20 && !picked; i++) {
      await key('Tab');
      const ok = await ev(() => { const s = OTR.game.scene.getScene('TrainerScene'), c = s._focusOn && s._focusOn.current(); return !!(c && c.key === 'satnav' && c.val === 'off'); });
      if (ok) { await key('Enter'); picked = true; }
    }
    check(picked && await ev(() => OTR.game.scene.getScene('TrainerScene').draft.workday.satnav === 'off'), 'Enter on the sat nav\'s "Off" sets it in the rules being edited');
    check(await tabTo(/^Done$/) && (await key('Enter'), await wait(500), await modals()) === 0, 'Done closes the dialog from the keyboard');
    await tabTo(/^3D workday aids/); await key('Enter'); await wait(500);
    await key('Escape'); await wait(500);
    check(await modals() === 0, 'Escape closes the aids dialog');

    // New account: employee ID, then the name, all typed; Escape leaves the second step
    check(await tabTo(/^New account$/), 'Tab reaches "New account"');
    await key('Enter'); await wait(500);
    check(await modals() === 1, 'Enter opens the employee ID entry');
    await p.keyboard.type('e2077'); await key('Enter'); await wait(700);
    const second = await ev(() => { const st = (OTR.game.scene.getScene('TrainerScene')._modalStack || []).filter(m => m.active); return st.length === 1; });
    check(second, 'Enter on the ID moves on to the name');
    await p.keyboard.type('Pat Okafor'); await wait(200);
    await key('Escape'); await wait(500);
    check(await modals() === 0, 'Escape leaves the name step without creating anything');

    // the temporary password: Enter closes it; Escape closes it too
    for (const k of ['Enter', 'Escape']) {
      await ev(() => OTR.game.scene.getScene('TrainerScene').showTemp({ id: 'e2077', name: 'Pat Okafor', tempPassword: 'cedar-lantern-31' }));
      await wait(500);
      await key(k); await wait(500);
      check(await modals() === 0, `${k} closes the temporary-password card`);
    }
    check(!errors.length, 'no page errors ' + errors.slice(0, 2).join(' | '));
  } finally { await b.close(); }
  console.log(fails.length ? `\n${fails.length} of ${checks} keyboard checks failed` : `\n${checks} trainer keyboard checks passed`);
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
