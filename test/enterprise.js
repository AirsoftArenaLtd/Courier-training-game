#!/usr/bin/env node
/*
 * Enterprise sign-in and progress storage (src/core/identity.js, src/core/save.js, server/server.js).
 *
 *   QA_BROWSER=/path/to/chrome node test/enterprise.js
 *
 * Starts the training server on a spare port with a throwaway data folder, then checks in a real browser:
 *   - server mode: the sign-in header and the ?user= link each name a trainee, the title shows them signed in with
 *     no name entry, progress reaches the server and comes back on another "PC" (a fresh browser profile), and two
 *     trainees never see each other's progress;
 *   - trainer API: the PIN guards the trainee list;
 *   - SCORM 1.2 and 2004: a fake LMS API in the parent frame names the learner and keeps suspend data;
 *   - local mode (file://): unchanged, and ?user= keeps two trainees apart on one browser.
 */
'use strict';
const path = require('path');
const fs = require('fs');
const os = require('os');
const http = require('http');

const ROOT = path.resolve(__dirname, '..');
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'otr-ent-'));
process.env.OTR_DATA_DIR = DATA;
process.env.OTR_TRAINER_PIN = '4821';
process.env.OTR_USER_HEADER = 'x-remote-user';
const { server } = require('../server/server.js');

let puppeteer;
try { puppeteer = require('puppeteer-core'); } catch (e) { console.error('puppeteer-core is missing. Run:  cd test && npm install'); process.exit(2); }
const BROWSER = process.env.QA_BROWSER || '/opt/pw-browsers/chromium';

const fails = [];
const check = (ok, what) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) fails.push(what); };
const wait = (ms) => new Promise(r => setTimeout(r, ms));

async function page(browser, url, o) {
  o = o || {};
  const ctx = await browser.createBrowserContext();           // a fresh profile: another PC
  const p = await ctx.newPage();
  await p.setViewport({ width: 1280, height: 720 });
  if (o.header) await p.setExtraHTTPHeaders({ 'x-remote-user': o.header });
  await p.goto(url);
  await p.waitForFunction(() => window.OTR && OTR.game && OTR.game.scene.isActive('TitleScene'), { timeout: 30000 });
  await wait(800);
  return { p, ctx };
}
const texts = (p) => p.evaluate(() => {
  const s = OTR.game.scene.getScene('TitleScene'); const out = [];
  const walk = (o) => { if (o.type === 'Text' && o.visible) out.push(o.text); (o.list || []).forEach(walk); };
  s.children.list.forEach(walk); return out.join(' | ');
});
// a finished scenario, as the game records it
const play = (p) => p.evaluate(() => { OTR.save.recordResult('m2-sort', { score: 900, stars: { safety: 3, efficiency: 2, service: 3 } }); OTR.save.flush(false); });

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port, base = `http://127.0.0.1:${port}/`;
  const browser = await puppeteer.launch({ executablePath: BROWSER, headless: 'new', args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    /* ---- server mode, signed in by header */
    let { p, ctx } = await page(browser, base, { header: 'CORP\\jdoe' });
    let who = await p.evaluate(() => ({ mode: OTR.identity.mode, id: OTR.identity.id, locked: OTR.identity.locked, profile: OTR.save.data.profile }));
    check(who.mode === 'server' && who.id === 'jdoe' && who.locked, `header sign-in: ${JSON.stringify(who)}`);
    let t = await texts(p);
    check(/Continue as jdoe/i.test(t) && /Signed in/.test(t) && !/New Profile|Start Training/i.test(t), 'title: signed in, no name entry and no New Profile: ' + t.slice(0, 300));
    await play(p); await wait(700);
    const f = path.join(DATA, 'progress', 'jdoe.json');
    check(fs.existsSync(f) && JSON.parse(fs.readFileSync(f, 'utf8')).scenarios['m2-sort'], 'progress reached the server');
    await ctx.close();
    ({ p, ctx } = await page(browser, base, { header: 'jdoe' }));
    let rec = await p.evaluate(() => OTR.save.record('m2-sort'));
    check(rec && rec.bestStars.safety === 3, 'progress comes back on another PC');
    await ctx.close();

    /* ---- a second trainee, by the launch link */
    ({ p, ctx } = await page(browser, base + '?user=akim'));
    who = await p.evaluate(() => ({ mode: OTR.identity.mode, id: OTR.identity.id }));
    rec = await p.evaluate(() => OTR.save.record('m2-sort'));
    check(who.mode === 'server' && who.id === 'akim' && !rec, 'link sign-in: a second trainee starts clean');
    await p.evaluate(() => { OTR.save.data.day = 7; OTR.save.write(); OTR.save.flush(false); }); await wait(500);
    await ctx.close();
    const a = JSON.parse(fs.readFileSync(path.join(DATA, 'progress', 'akim.json'), 'utf8'));
    const j = JSON.parse(fs.readFileSync(f, 'utf8'));
    check(a.day === 7 && j.day !== 7, 'two trainees keep separate progress');

    /* ---- trainer API */
    const get = (u, h) => new Promise(r => http.get(base + u, { headers: h || {} }, res => { let d = ''; res.on('data', c => d += c); res.on('end', () => r({ code: res.statusCode, body: d })); }));
    check((await get('api/trainees')).code === 401, 'trainee list refused without the PIN');
    const list = await get('api/trainees', { 'x-trainer-pin': '4821' });
    check(list.code === 200 && /jdoe/.test(list.body) && /akim/.test(list.body), 'trainee list with the PIN');
    check((await get('server/server.js')).code === 404 && (await get('api/progress')).code === 401, 'server files private; progress needs a sign-in');

    /* ---- SCORM 1.2 and 2004, with a fake LMS in the parent frame */
    for (const v2004 of [false, true]) {
      const ctx2 = await browser.createBrowserContext();
      const p2 = await ctx2.newPage();
      await p2.setViewport({ width: 1280, height: 720 });
      await p2.goto(base + 'css/style.css');                      // any page on the origin
      await p2.evaluate((v2004, src) => {
        const store = { 'cmi.core.student_id': 'lms042', 'cmi.core.student_name': 'Rivera, Sam', 'cmi.learner_id': 'lms042', 'cmi.learner_name': 'Rivera, Sam', 'cmi.suspend_data': '' };
        window.__lms = store;
        const api = v2004
          ? { Initialize: () => 'true', GetValue: (k) => store[k] || '', SetValue: (k, v) => { store[k] = v; return 'true'; }, Commit: () => 'true', Terminate: () => 'true' }
          : { LMSInitialize: () => 'true', LMSGetValue: (k) => store[k] || '', LMSSetValue: (k, v) => { store[k] = v; return 'true'; }, LMSCommit: () => 'true', LMSFinish: () => 'true' };
        if (v2004) window.API_1484_11 = api; else window.API = api;
        document.body.innerHTML = `<iframe id="sco" src="${src}" style="width:1280px;height:720px;border:0"></iframe>`;
      }, v2004, '/index.html');
      await wait(500);
      const frame = () => p2.frames().find(fr => /index\.html$/.test(fr.url()));
      await p2.waitForFunction(() => { const fr = document.getElementById('sco'); return fr && fr.contentWindow.OTR && fr.contentWindow.OTR.game && fr.contentWindow.OTR.game.scene.isActive('TitleScene'); }, { timeout: 30000 });
      const fr = frame();
      who = await fr.evaluate(() => ({ mode: OTR.identity.mode, id: OTR.identity.id, name: OTR.identity.name }));
      check(who.mode === 'scorm' && who.id === 'lms042' && who.name === 'Sam Rivera', `SCORM ${v2004 ? '2004' : '1.2'} learner: ${JSON.stringify(who)}`);
      await fr.evaluate(() => OTR.save.recordResult('m2-sort', { score: 900, stars: { safety: 3, efficiency: 2, service: 3 } }));
      const sd = await p2.evaluate(() => window.__lms['cmi.suspend_data']);
      const st = await p2.evaluate((v) => v ? window.__lms['cmi.completion_status'] : window.__lms['cmi.core.lesson_status'], v2004);
      check(/m2-sort/.test(sd) && st === 'incomplete', `SCORM ${v2004 ? '2004' : '1.2'} keeps suspend data and reports status (${st})`);
      await ctx2.close();
    }

    /* ---- local mode: from disk, ?user= keeps trainees apart */
    const fileUrl = 'file://' + path.join(ROOT, 'index.html');
    const ctx3 = await browser.createBrowserContext();
    const p3 = await ctx3.newPage();
    await p3.goto(fileUrl + '?user=pat');
    await p3.waitForFunction(() => window.OTR && OTR.game && OTR.game.scene.isActive('TitleScene'), { timeout: 30000 });
    who = await p3.evaluate(() => ({ mode: OTR.identity.mode, id: OTR.identity.id, key: OTR.save.localKey() }));
    check(who.mode === 'local' && who.key === 'otr_save_v1_pat', `local with ?user=: ${JSON.stringify(who)}`);
    await p3.evaluate(() => OTR.save.recordResult('m2-sort', { score: 1, stars: { safety: 1, efficiency: 1, service: 1 } }));
    await p3.goto(fileUrl + '?user=lee');
    await p3.waitForFunction(() => window.OTR && OTR.game && OTR.game.scene.isActive('TitleScene'), { timeout: 30000 });
    check(!(await p3.evaluate(() => OTR.save.record('m2-sort'))), 'local: a second ?user= on the same browser starts clean');
    await p3.goto(fileUrl);
    await p3.waitForFunction(() => window.OTR && OTR.game && OTR.game.scene.isActive('TitleScene'), { timeout: 30000 });
    who = await p3.evaluate(() => ({ mode: OTR.identity.mode, key: OTR.save.localKey(), locked: OTR.identity.locked }));
    check(who.mode === 'local' && who.key === 'otr_save_v1' && !who.locked, 'local without a user: the original save, as before');
    await ctx3.close();
  } catch (e) {
    check(false, 'script error: ' + (e && e.stack || e));
  } finally {
    await browser.close();
    server.close();
    fs.rmSync(DATA, { recursive: true, force: true });
  }
  console.log(fails.length ? `\n${fails.length} failed` : '\nall enterprise checks passed');
  process.exit(fails.length ? 1 : 0);
})();
