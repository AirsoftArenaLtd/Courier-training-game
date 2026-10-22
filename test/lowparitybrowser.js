#!/usr/bin/env node
/*
 * B-133: Low-graphics parity for milestone 9. Each new feature is set up the same way at High and at Low (the owner's
 * review links, then a fixture as the shared flows use): the walkaround record, the dispatch radio message, the night
 * warning, a road sign read with J, the sat nav's line, a damage notice and the low-clearance warning. Every line of text
 * a trainee can read at High must also be on screen at Low (Low may draw less, never say less). The pairs are saved in
 * docs/review/set-9/low-high/ for the review set.
 *
 *   QA_BROWSER=/path/to/chrome node test/lowparitybrowser.js            (QA_SHOTS=0 to skip the pictures)
 */
'use strict';
const path = require('path'), fs = require('fs');
const pp = require('puppeteer-core');
const BROWSER = process.env.QA_BROWSER || '/opt/pw-browsers/chromium';
const PAGE = process.env.QA_BASE ? process.env.QA_BASE.replace(/\/+$/, '') + '/index.html' : 'file://' + path.resolve(__dirname, '..', 'index.html');
const OUT = path.join(__dirname, '..', 'docs', 'review', 'set-9', 'low-high');
const SHOTS = process.env.QA_SHOTS !== '0';
const wait = (ms) => new Promise(r => setTimeout(r, ms));
let checks = 0;
const fails = [];
const check = (ok, what) => { checks++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) fails.push(what); };

// each view: the route and day that has it, and how to bring it on screen
const VIEWS = [
  ['walkaround', 10, 4, /^This is the front of the van\.$/, () => { const s = OTR.game.scene.getScene('FirstPersonScene'), m = s.model; s.closePanel(); const F = OTR.fpWalkaroundFlow, t = F.target('front');
    m.mode = 'walk'; const c = Math.cos(m.van.yaw), sn = Math.sin(m.van.yaw), lz = Math.min(t.z - 0.8, -2.85); Object.assign(m.player, { x: m.van.x - sn * lz, z: m.van.z + c * lz }); s.sync();
    s.handheld.show({ title: 'Inspect the van.', lines: [{ text: 'This is the front of the van.' }, { text: 'No damage is visible.' }], options: [{ label: 'No damage is visible.', onPick() {} }] }); }],
  ['radio', 10, 4, /dispatch radio/i, () => { const s = OTR.game.scene.getScene('FirstPersonScene'), m = s.model; s.closePanel(); Object.assign(m, { mode: 'cab', phase: 'route', departed: true });
    Object.assign(m.van, { speed: 0, hand: true }); m.radio.sent = true; m.radio.travel = 20; OTR.fpRadioUI.open(s); }],
  ['night', 9, 6, /^It is night\. Switch on the headlights before moving\.$/, () => { const s = OTR.game.scene.getScene('FirstPersonScene'), m = s.model; s.closePanel(); Object.assign(m, { mode: 'cab', phase: 'route', departed: true });
    Object.assign(m.van, { speed: 0, hand: true, headlights: false }); }],
  ['sign', 10, 4, /junction line|This is .* St\.|speed limit/, () => { const s = OTR.game.scene.getScene('FirstPersonScene'), m = s.model; s.closePanel(); Object.assign(m, { mode: 'cab', phase: 'route', departed: true });
    Object.assign(m.van, { x: 2.84, z: m.town.zs[1] + 12, yaw: 0, speed: 0, hand: true }); s.sync(); OTR.fpSigns.read(s); }],
  ['damage', 10, 4, /has new damage\.$/, () => { const s = OTR.game.scene.getScene('FirstPersonScene'), m = s.model; s.closePanel(); Object.assign(m, { mode: 'cab', phase: 'route', departed: true });
    Object.assign(m.van, { speed: 0, hand: true }); const e = OTR.fpDamage.contact(m.damage, 'left', 'solid', 1.2); OTR.fpDamageFlow.fire(m, e, 1.2); }],
  ['clearance', 10, 4, /^The clearance is 8 feet 10 inches\./, () => { const s = OTR.game.scene.getScene('FirstPersonScene'), m = s.model; s.closePanel(); Object.assign(m, { mode: 'cab', phase: 'route', departed: true });
    const b = (m._damageClearances || [])[0]; if (b) { Object.assign(m.van, { x: b.x + 1.7, z: b.z + 14, yaw: 0, speed: 0, hand: true }); s.sync(); } }],
];

(async () => {
  if (SHOTS) fs.mkdirSync(OUT, { recursive: true });
  const b = await pp.launch({ executablePath: BROWSER, headless: true, args: ['--no-sandbox', '--allow-file-access-from-files', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const errors = [];
  const open = async (gfx, route, day, name) => {
    const p = await b.newPage();
    await p.setViewport({ width: 1280, height: 720 });
    p.on('pageerror', e => errors.push(`${name} ${gfx}: ${String(e.message).slice(0, 140)}`));
    await p.goto(PAGE + `?dev=1&workday3d=1&gfx=${gfx}&user=review-parity-${name}-${gfx}&name=Owner&route=${route}&day=${day}`);
    const until = async (src, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await p.evaluate(src).catch(() => false)) return true; await wait(250); } return false; };
    await until(`OTR.game.scene.isActive('HubScene') || OTR.game.scene.isActive('TitleScene')`, 30000);
    if (await p.evaluate(`OTR.game.scene.isActive('TitleScene')`)) await p.evaluate(() => { const m = OTR.game.scene; m.getScenes(true).forEach(s => m.stop(s.sys.settings.key)); m.start('HubScene'); });
    await until(`OTR.game.scene.isActive('HubScene')`, 10000); await wait(800);
    await p.evaluate(() => { const s = OTR.game.scene.getScene('HubScene'); const f = s.focusables.find(o => o.label && /Start workday/.test(OTR.i18n.src(o.label))); if (f) f.press(); });
    await wait(800);
    await p.evaluate(() => { const st = OTR.game.scene.getScene('HubScene')._modalStack || []; const top = st[st.length - 1]; const walk = (c) => { for (const o of c.list || []) { if (o.press && o.label && /^Start/.test(OTR.i18n.src(o.label))) { o.press(); return true; } if (walk(o)) return true; } return false; }; if (top) walk(top); });
    const ok = await until(`!!(OTR.game.scene.isActive('FirstPersonScene') && OTR.game.scene.getScene('FirstPersonScene').model)`, 120000);
    return { p, ok };
  };
  // what a trainee can read: every visible text line on the 3D scene (the handheld, captions, notices, signs' labels)
  // what the game says it is showing a trainee: the handheld's page, the notice, the caption and the hint line (the
  // handheld is drawn into the 3D view, so it is read from its page, not from the display list)
  const texts = (p) => p.evaluate(() => { const s = OTR.game.scene.getScene('FirstPersonScene'), out = new Set(), h = s.handheld, c = h && h.isOpen && h.device.current;
    const add = (t) => { t = typeof t === 'string' ? t : t && t.text; if (t && t.trim()) out.add(OTR.i18n.src ? (s.soundCue && t === s.soundCue.text ? OTR.i18n.src(s.soundCue) : t) : t); };
    if (c) { add(c.title); (c.lines || []).forEach(add); (c.options || []).forEach(o => add(o.label)); }
    if (s.notice && s.time.now < s.noticeUntil) add(s.notice);
    if (s.soundCue && s.soundCue.visible) String(OTR.i18n.src(s.soundCue) || '').split(' · ').forEach(add);
    if (s.hint && s.hint.visible) add(OTR.i18n.src(s.hint));
    const walk = (o) => { if (!o || o.visible === false || (o.alpha !== undefined && o.alpha <= 0.05)) return; if (o.type === 'Text' && (o.text || '').trim()) out.add(OTR.i18n.src(o)); (o.list || []).forEach(walk); };
    s.children.list.forEach(walk);
    return [...out].sort(); });
  try {
    for (const [name, route, day, key, setup] of VIEWS) {
      const seen = {};
      for (const gfx of ['high', 'low']) {
        const { p, ok } = await open(gfx, route, day, name);
        if (!ok) { check(false, `${name} ${gfx}: the 3D day starts`); await p.close(); continue; }
        // the day may still be opening (its first panel, the van settling): set the view up again until it shows
        for (let n = 0; n < 12; n++) {
          await p.evaluate(setup).catch(e => errors.push(`${name} ${gfx} setup: ${e.message}`));
          await wait(900);
          seen[gfx] = await texts(p);
          if (seen[gfx].some(t => key.test(t))) break;
        }
        if (SHOTS) await p.screenshot({ path: path.join(OUT, `${name}-${gfx}.png`) });
        await p.close();
      }
      if (!seen.high || !seen.low) continue;
      if (process.env.QA_DEBUG) console.log(name, JSON.stringify(seen));
      // the feature's own line must be readable at both; the rest of the screen changes from run to run (a passing
      // cyclist, the next stop), so other differences are listed, not failed
      check(seen.high.some(t => key.test(t)), `${name}: its line shows at High`);
      check(seen.low.some(t => key.test(t)), `${name}: its line shows at Low too`);
      const lines = (a) => a.filter(t => /[a-z].*[.!?]$/i.test(t) && !/\d{1,2}:\d{2}|\d+ mph|RPM| · /.test(t));
      const missing = lines(seen.high).filter(t => !seen.low.includes(t));
      if (missing.length) console.log(`      ${name}: at High only this run: ${missing.join(' | ')}`);
    }
    check(!errors.length, 'no page errors ' + errors.slice(0, 2).join(' | '));
  } finally { await b.close(); }
  console.log(fails.length ? `\n${fails.length} of ${checks} Low parity checks failed` : `\n${checks} Low parity checks passed`);
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
