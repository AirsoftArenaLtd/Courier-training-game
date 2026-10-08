#!/usr/bin/env node
/*
 * The sign-in screen (src/core/signin.js) on a training server with employee accounts, in a real browser.
 *
 *   QA_BROWSER=/path/to/chrome node test/signin.js        (screenshots in test/out/signin-*.png)
 *
 * - before the game boots, the sign-in form: labelled fields, focus on the ID, Tab order, Enter submits, errors read
 *   out (role=alert);
 * - a trainer makes an account in the trainer tools (New account), and the temporary password it shows signs in on
 *   another PC, which must then choose its own password before the game boots in server mode;
 * - nothing about the sign-in in localStorage or sessionStorage, and page scripts cannot read the session cookie;
 * - the form fits at larger text (the browser's text size doubled) and on a narrow window;
 * - Settings → Sign out, then the sign-in screen again; a trainer's New password signs the trainee out.
 * test/auth.js checks the server side in Node; test/enterprise.js the other sign-ins (header, link, SCORM, local).
 */
'use strict';
const path = require('path');
const fs = require('fs');
const os = require('os');

const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'otr-signin-'));
process.env.OTR_DATA_DIR = DATA;
process.env.OTR_TRAINER_PIN = '4821';
process.env.OTR_ACCOUNTS = '1';
const { server, accounts } = require('../server/server.js');

let puppeteer;
try { puppeteer = require('puppeteer-core'); } catch (e) { console.error('puppeteer-core is missing. Run:  cd test && npm install'); process.exit(2); }
const BROWSER = process.env.QA_BROWSER || '/opt/pw-browsers/chromium';
const OUT = path.join(__dirname, 'out');
fs.mkdirSync(OUT, { recursive: true });

const fails = [];
const check = (ok, what) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) fails.push(what); };
const wait = (ms) => new Promise(r => setTimeout(r, ms));

async function open(browser, url, vp) {
  const ctx = await browser.createBrowserContext();             // a fresh profile: another PC
  const p = await ctx.newPage();
  await p.setViewport(vp || { width: 1280, height: 720 });
  p.on('pageerror', e => check(false, 'page error: ' + e.message));
  await p.goto(url);
  return { p, ctx };
}
const formShown = (p) => p.waitForSelector('#otr-signin form', { timeout: 15000 });
const errText = (p) => p.$eval('#otr-signin-err', e => e.textContent);
const titleUp = (p) => p.waitForFunction(() => window.OTR && OTR.game && OTR.game.scene.isActive('TitleScene'), { timeout: 30000 });
const sceneTexts = (p, key) => p.evaluate((key) => {
  const s = OTR.game.scene.getScene(key); const out = [];
  const walk = (o) => { if (o.type === 'Text' && o.visible) out.push(o.text); (o.list || []).forEach(walk); };
  s.children.list.forEach(walk); return out;
}, key);
/** Nothing inside the sign-in card is wider than its box, and the card is inside the window. */
const fits = (p) => p.evaluate(() => {
  const card = document.querySelector('#otr-signin .card');
  const bad = [...card.querySelectorAll('*')].filter(e => e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflow !== 'visible' || e.getBoundingClientRect().right > card.getBoundingClientRect().right + 1)
    .map(e => e.tagName + (e.id ? '#' + e.id : ''));
  const r = card.getBoundingClientRect();
  if (r.left < 0 || r.right > window.innerWidth) bad.push('card ' + Math.round(r.left) + '..' + Math.round(r.right) + ' of ' + window.innerWidth);
  if (document.documentElement.scrollWidth > window.innerWidth) bad.push('page scrolls sideways');
  return bad;
});
const storage = (p) => p.evaluate(() => JSON.stringify(Object.assign({}, localStorage)) + JSON.stringify(Object.assign({}, sessionStorage)) + ' cookie:' + document.cookie);

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}/`;
  const browser = await puppeteer.launch({ executablePath: BROWSER, headless: 'new', args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    /* ---- the trainer, signed in by the company header, makes an account in the trainer tools */
    const tctx = await browser.createBrowserContext();
    const tp = await tctx.newPage();
    await tp.setViewport({ width: 1280, height: 720 });
    await tp.setExtraHTTPHeaders({ 'x-remote-user': 'trainer1' });
    await tp.goto(base);
    await titleUp(tp);
    check(await tp.evaluate(() => OTR.identity.mode === 'server' && OTR.identity.id === 'trainer1' && OTR.identity.accounts && !OTR.identity.session && !document.getElementById('otr-signin')),
      'a company header sign-in skips the password screen');
    await tp.evaluate(() => { OTR.academy.pin = '4821'; OTR.game.scene.getScene('TitleScene').scene.start('TrainerScene'); });
    await tp.waitForFunction(() => OTR.game.scene.isActive('TrainerScene'), { timeout: 10000 });
    await wait(1200);
    check((await sceneTexts(tp, 'TrainerScene')).includes('New account'), 'trainer tools: a New account button');
    await tp.evaluate(() => OTR.game.scene.getScene('TrainerScene').newAccount());
    await wait(500);
    await tp.keyboard.type('E3001'); await tp.keyboard.press('Enter');
    await wait(700);
    await tp.keyboard.type('Rosa Diaz'); await tp.keyboard.press('Enter');
    await tp.waitForFunction(() => { const s = OTR.game.scene.getScene('TrainerScene'); let hit = false; const walk = (o) => { if (o.type === 'Text' && o.text === 'Temporary password') hit = true; (o.list || []).forEach(walk); }; s.children.list.forEach(walk); return hit; }, { timeout: 10000 });
    await wait(500);
    await tp.screenshot({ path: path.join(OUT, 'signin-trainer-temp.png') });
    const temp = (await sceneTexts(tp, 'TrainerScene')).find(t => /^[a-hjkmnp-z2-9]{10}$/.test(t));
    check(!!temp && accounts.has('e3001'), `the trainer is shown a temporary password for e3001 (${temp})`);
    await tp.keyboard.press('Enter');
    await wait(1500);
    check((await sceneTexts(tp, 'TrainerScene')).includes('Rosa Diaz'), 'the new trainee is listed before any training');
    await tp.evaluate(() => { const s = OTR.game.scene.getScene('TrainerScene'); s.manage(s.trainees.find(t => t.id === 'e3001')); });
    await wait(700);
    await tp.screenshot({ path: path.join(OUT, 'signin-trainer-manage.png') });
    // every button label inside its button
    const cramped = await tp.evaluate(() => {
      const s = OTR.game.scene.getScene('TrainerScene'), out = [];
      const walk = (o) => { if (o.press && o.label && o.bg && o.label.text && (o.label.displayWidth > o.width - 8 || o.label.displayHeight > o.height - 4)) out.push(o.label.text); (o.list || []).forEach(walk); };
      s.children.list.forEach(walk); return out;
    });
    check((await sceneTexts(tp, 'TrainerScene')).includes('New password') && !cramped.length, `Manage offers New password for an account${cramped.length ? '; cramped: ' + cramped.join(', ') : ''}`);
    await tp.keyboard.press('Escape');
    await wait(500);

    /* ---- an email-style employee ID (_ and @, 40 characters) through the same form, at larger text */
    check(await tp.evaluate(() => !!(OTR.identity.idRule && OTR.identity.idRule.max === 64)), 'the server hands the game its employee ID rule (64 characters)');
    await tp.evaluate(() => { OTR.a11y.settings().large = true; });
    /** Every text of the open entry inside the modal, and the typed ID inside its field. */
    const entryFits = () => tp.evaluate(() => {
      const s = OTR.game.scene.getScene('TrainerScene'), root = s._modalStack[s._modalStack.length - 1], box = root.list[1], out = [];
      const L = box.x - 310, R = box.x + 310, T = box.y - 170, B = box.y + 170;
      box.list.forEach(o => { if (o.type !== 'Text' || !o.visible) return; const b = o.getBounds(); if (b.x < L || b.right > R || b.y < T || b.bottom > B) out.push(o.text); });
      const field = box.list.find(o => o.type === 'Text' && o.style.fontSize === '34px');
      const fb = field.getBounds();
      if (fb.x < box.x - 230 || fb.right > box.x + 230) out.push('field: ' + field.text);
      return { out, field: field.text, count: (box.list.find(o => o.type === 'Text' && / \/ /.test(o.text)) || {}).text };
    });
    await tp.evaluate(() => OTR.game.scene.getScene('TrainerScene').newAccount());
    await wait(500);
    const long = 'WM_m.W@Mw-'.repeat(7).slice(0, 64);                           // 64 characters, wide ones
    await tp.keyboard.type(long + 'Z');                                          // one too many
    const full = await entryFits();
    check(long.length === 64 && full.field === long && full.count === '64 / 64' && !full.out.length,
      `a 64-character ID fits the entry at larger text, and a 65th is refused (${full.count}${full.out.length ? '; outside: ' + full.out.join(', ') : ''})`);
    await tp.screenshot({ path: path.join(OUT, 'signin-trainer-long-id.png') });
    for (let i = 0; i < 64; i++) await tp.keyboard.press('Backspace');
    const email = 'Jane_Doe.van-der-berg@depotnorth.example';
    await tp.keyboard.type(email);
    const typed = await entryFits();
    check(email.length === 40 && typed.field === email && !typed.out.length, `a 40-character email-style ID with _ and @ is typed in full (${typed.field})`);
    await tp.keyboard.press('Enter');
    await wait(700);
    await tp.keyboard.type('Jane Doe'); await tp.keyboard.press('Enter');
    const idLow = email.toLowerCase();
    await tp.waitForFunction((id) => { const s = OTR.game.scene.getScene('TrainerScene'); let hit = false; const walk = (o) => { if (o.type === 'Text' && o.text === 'Temporary password') hit = true; (o.list || []).forEach(walk); }; s.children.list.forEach(walk); return hit; }, { timeout: 10000 }, idLow);
    await wait(500);
    const temp2 = (await sceneTexts(tp, 'TrainerScene')).find(t => /^[a-hjkmnp-z2-9]{10}$/.test(t));
    const tempFits = await tp.evaluate(() => {
      const s = OTR.game.scene.getScene('TrainerScene'), root = s._modalStack[s._modalStack.length - 1], box = root.list[1], out = [];
      const panel = box.list[0], w = panel.width || panel.displayWidth, h = panel.height || panel.displayHeight;
      box.list.forEach(o => { if (o.type !== 'Text' || !o.visible) return; const b = o.getBounds(); if (b.x < box.x - w / 2 || b.right > box.x + w / 2 || b.bottom > box.y + h / 2) out.push(o.text); });
      return out;
    });
    await tp.screenshot({ path: path.join(OUT, 'signin-trainer-email-temp.png') });
    check(!!temp2 && accounts.has(idLow) && !tempFits.length, `the trainer is shown a temporary password for ${idLow}${tempFits.length ? '; outside: ' + tempFits.join(' | ') : ''}`);
    await tp.keyboard.press('Enter');
    await tp.evaluate(() => { OTR.a11y.settings().large = false; });
    await wait(800);
    {
      const { p: ep, ctx: ectx } = await open(browser, base);
      await formShown(ep);
      await ep.type('#otr-id', email); await ep.type('#otr-password', temp2); await ep.keyboard.press('Enter');
      await ep.waitForSelector('#otr-again', { timeout: 10000 });
      await ep.type('#otr-password', 'jane picks one'); await ep.type('#otr-again', 'jane picks one'); await ep.keyboard.press('Enter');
      await titleUp(ep);
      const ew = await ep.evaluate(() => ({ mode: OTR.identity.mode, id: OTR.identity.id, session: OTR.identity.session }));
      check(ew.mode === 'server' && ew.id === idLow && ew.session, 'the email-style ID signs in with its temporary password and then its own ' + JSON.stringify(ew));
      await ectx.close();
    }

    /* ---- the trainee, on another PC */
    let { p, ctx } = await open(browser, base);
    await formShown(p);
    check(await p.evaluate(() => !OTR.game), 'the sign-in screen comes before the game boots');
    const a11y = await p.evaluate(() => [...document.querySelectorAll('#otr-signin input')].map(i => ({ id: i.id, label: (document.querySelector(`label[for="${i.id}"]`) || {}).textContent, auto: i.autocomplete, type: i.type })));
    check(a11y.length === 2 && a11y[0].label === 'Employee ID' && a11y[1].label === 'Password' && a11y[1].type === 'password' && a11y[0].auto === 'username' && a11y[1].auto === 'current-password',
      'labelled fields: ' + JSON.stringify(a11y));
    check(await p.evaluate(() => document.activeElement && document.activeElement.id === 'otr-id'), 'focus starts on the employee ID');
    await p.keyboard.press('Tab');
    const second = await p.evaluate(() => document.activeElement.id);
    await p.keyboard.press('Tab');
    const third = await p.evaluate(() => document.activeElement.tagName);
    check(second === 'otr-password' && third === 'BUTTON', 'Tab goes ID → password → Sign in');
    await p.screenshot({ path: path.join(OUT, 'signin-form.png') });

    await p.click('#otr-id'); await p.keyboard.press('Enter');
    check(/employee ID/.test(await errText(p)), 'Enter with nothing typed: asks for the employee ID');
    await p.type('#otr-id', 'e3001'); await p.type('#otr-password', 'not it'); await p.keyboard.press('Enter');
    await p.waitForFunction(() => /match/.test(document.getElementById('otr-signin-err').textContent), { timeout: 10000 });
    check(await p.$eval('#otr-signin-err', e => e.getAttribute('role') === 'alert'), 'a wrong password: "' + await errText(p) + '" (read out)');
    check(await p.evaluate(() => document.activeElement.id === 'otr-password' && document.getElementById('otr-password').value === ''), 'the password field is cleared and focused for another try');
    await p.type('#otr-password', temp); await p.keyboard.press('Enter');
    await p.waitForSelector('#otr-again', { timeout: 10000 });
    check(await p.evaluate(() => document.activeElement.id === 'otr-password' && document.getElementById('otr-password').autocomplete === 'new-password'), 'the temporary password: choose your own (focus on the new password)');
    await p.screenshot({ path: path.join(OUT, 'signin-change.png') });
    await p.type('#otr-password', 'seven77'); await p.type('#otr-again', 'seven77'); await p.keyboard.press('Enter');
    check(/8 characters/.test(await errText(p)), 'under 8 characters: ' + await errText(p));
    await p.$eval('#otr-password', e => { e.value = ''; }); await p.$eval('#otr-again', e => { e.value = ''; });
    await p.type('#otr-password', 'rosa picks one'); await p.type('#otr-again', 'rosa picks two'); await p.keyboard.press('Enter');
    check(/match/.test(await errText(p)), 'two different entries: ' + await errText(p));
    await p.$eval('#otr-password', e => { e.value = ''; }); await p.$eval('#otr-again', e => { e.value = ''; });
    await p.type('#otr-password', temp); await p.type('#otr-again', temp); await p.keyboard.press('Enter');
    await p.waitForFunction(() => /temporary|trainer gave/.test(document.getElementById('otr-signin-err').textContent), { timeout: 10000 });
    check(true, 'the temporary password again: ' + await errText(p));
    await p.$eval('#otr-password', e => { e.value = ''; }); await p.$eval('#otr-again', e => { e.value = ''; });
    await p.type('#otr-password', 'rosa picks one'); await p.type('#otr-again', 'rosa picks one'); await p.keyboard.press('Enter');
    await titleUp(p);
    await wait(800);
    const who = await p.evaluate(() => ({ mode: OTR.identity.mode, id: OTR.identity.id, name: OTR.identity.name, session: OTR.identity.session, form: !!document.getElementById('otr-signin') }));
    check(who.mode === 'server' && who.id === 'e3001' && who.name === 'Rosa Diaz' && who.session && !who.form, 'signed in: the game boots in server mode as the trainee ' + JSON.stringify(who));
    check((await sceneTexts(p, 'TitleScene')).some(t => /Continue as Rosa Diaz/i.test(t)), 'the title screen continues as them, with no name entry');
    const st = await storage(p);
    check(!/rosa picks|otr_sid/.test(st) && !st.includes(temp), 'no password, temporary password or session id in localStorage, sessionStorage or document.cookie');
    await p.evaluate(() => { OTR.save.recordResult('m2-sort', { score: 900, stars: { safety: 3, efficiency: 2, service: 3 } }); OTR.save.flush(false); });
    await wait(700);
    const f = path.join(DATA, 'progress', 'e3001.json');
    check(fs.existsSync(f) && JSON.parse(fs.readFileSync(f, 'utf8')).scenarios['m2-sort'], 'progress reaches the server under the employee ID');

    /* ---- Settings → Sign out */
    await p.evaluate(() => OTR.game.scene.getScene('TitleScene').scene.start('HubScene'));
    await p.waitForFunction(() => OTR.game.scene.isActive('HubScene'), { timeout: 15000 });
    await wait(1500);
    await p.evaluate(() => OTR.game.scene.getScene('HubScene').openSettings());
    await wait(800);
    await p.screenshot({ path: path.join(OUT, 'signin-settings.png') });
    check((await sceneTexts(p, 'HubScene')).includes('Sign out'), 'Settings offers Sign out');
    await p.evaluate(() => OTR.signin.signOut());
    await formShown(p);
    check(await p.evaluate(() => !OTR.game), 'after signing out, the sign-in screen again');
    await p.type('#otr-id', 'E3001'); await p.type('#otr-password', 'rosa picks one'); await p.keyboard.press('Enter');
    await titleUp(p);
    check(await p.evaluate(() => OTR.save.record('m2-sort') && OTR.save.record('m2-sort').bestStars.safety === 3), 'their own password signs straight in, with their progress');

    /* ---- the trainer gives a new password: the trainee is signed out */
    const r = await accounts.resetPassword('e3001');
    const code = await p.evaluate(() => fetch('api/progress', { credentials: 'same-origin' }).then(r => r.status));
    check(r.ok && code === 401, 'a trainer\'s New password signs the trainee out');
    await ctx.close();

    /* ---- larger text and a narrow window */
    for (const [label, vp, size] of [['larger text', { width: 1280, height: 720 }, '200%'], ['a narrow window', { width: 360, height: 640 }, '100%'], ['a narrow window, larger text', { width: 360, height: 640 }, '150%']]) {
      ({ p, ctx } = await open(browser, base, vp));
      await formShown(p);
      await p.evaluate((size) => { document.documentElement.style.fontSize = size; }, size);
      await p.type('#otr-id', 'nobody'); await p.type('#otr-password', 'wrong one'); await p.keyboard.press('Enter');
      await p.waitForFunction(() => document.getElementById('otr-signin-err').textContent, { timeout: 10000 });
      const bad = await fits(p);
      check(!bad.length, `sign-in fits with ${label}${bad.length ? ': ' + bad.join(', ') : ''}`);
      await p.screenshot({ path: path.join(OUT, `signin-${label.replace(/\W+/g, '-')}.png`), fullPage: true });
      await ctx.close();
    }

    /* ---- the change form fits at larger text too */
    const r2 = await accounts.resetPassword('e3001');
    ({ p, ctx } = await open(browser, base));
    await formShown(p);
    await p.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
    await p.type('#otr-id', 'e3001'); await p.type('#otr-password', r2.tempPassword); await p.keyboard.press('Enter');
    await p.waitForSelector('#otr-again', { timeout: 10000 });
    await p.keyboard.press('Enter');
    await wait(200);
    const bad = await fits(p);
    check(!bad.length, `the new-password form fits with larger text${bad.length ? ': ' + bad.join(', ') : ''}`);
    await ctx.close();
    await tctx.close();
  } catch (e) {
    check(false, 'script error: ' + (e && e.stack || e));
  } finally {
    await browser.close();
    server.close();
    fs.rmSync(DATA, { recursive: true, force: true });
  }
  console.log(fails.length ? `\n${fails.length} failed` : '\nall sign-in screen checks passed');
  process.exit(fails.length ? 1 : 0);
})();
