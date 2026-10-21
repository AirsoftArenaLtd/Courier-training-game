#!/usr/bin/env node
/*
 * B-84: the three pickups of module 7 with the keyboard alone. Before B-84 their pieces could only be clicked (to count
 * them and to inspect them), and so could the lines of the customs invoice. Here: Enter on the brief, the shipper's
 * conversation with the number keys and Space, then Tab to every piece and Enter to count it (the ring shows its label,
 * as hovering does), Tab to "Confirm the count" and the number of the right answer; on the invoice (m7-intl) the arrows
 * reach every line and Enter marks the bad ones, then Submit; Tab to each piece and Enter to inspect it, A or R and the
 * reason's number; Tab to "Finish the pickup" and Enter, and 1 for the handheld's Done. Every count and call must be right.
 *
 *   QA_BROWSER=/path/to/chrome node test/pickupkeysbrowser.js         (QA_LANGS=en,ta by default)
 */
'use strict';
const path = require('path');
const pp = require('puppeteer-core');
const BROWSER = process.env.QA_BROWSER || '/opt/pw-browsers/chromium';
const LANGS = (process.env.QA_LANGS || 'en,ta').split(',').map(s => s.trim()).filter(Boolean);
const IDS = (process.env.QA_ONLY || 'm7-business,m7-intl,m7-dg').split(',');
const wait = (ms) => new Promise(r => setTimeout(r, ms));
let checks = 0;
const fails = [];
const check = (ok, what) => { checks++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) fails.push(what); };
const DIGITS = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5'];

(async () => {
  const b = await pp.launch({ executablePath: BROWSER, headless: 'new', args: ['--no-sandbox', '--allow-file-access-from-files'] });
  const errors = [];
  try {
    for (const lang of LANGS) for (const id of IDS) {
      const tag = `${lang} ${id}`;
      const p = await b.newPage();
      await p.setViewport({ width: 1280, height: 720 });
      p.on('pageerror', e => errors.push(`${tag}: ${e.message}`));
      await p.goto('file://' + path.resolve(__dirname, '..', 'index.html') + `?scenario=${id}&dev=1&user=keys&name=Sam%20Lee&lang=${lang}`);
      const S = `OTR.game.scene.getScene('PickupScene')`;
      const ev = (src) => p.evaluate(src);
      const until = async (src, ms) => { const t0 = Date.now(); while (Date.now() - t0 < (ms || 15000)) { if (await ev(src).catch(() => false)) return true; await wait(120); } return false; };
      const key = async (k) => { await p.keyboard.press(k); await wait(170); };
      const modals = () => ev(`(${S}._modalStack || []).filter(m => m.active).length`);
      // the scene's own ring: the piece it is on (its id) or the button's English label
      const at = () => ev(`(() => { const c = ${S}.keyFocus.current(); return !c ? null : c.piece ? c.piece.id : OTR.i18n.src(c.label || c); })()`);
      const tabTo = async (want) => { for (let i = 0; i < 20; i++) { await key('Tab'); const a = await at(); if (want instanceof RegExp ? want.test(a) : a === want) return true; } return false; };
      try {
        check(await until(`OTR.game.scene.isActive('PickupScene')`, 30000), `${tag}: the pickup opens`);
        await wait(1200); await key('Enter');
        check(await until(`${S}.running`, 8000), `${tag}: Enter on the brief starts it`);
        // the shipper's conversation: the first answer, or Space to read on
        for (let i = 0; i < 60 && await ev(`!!${S}.talkCtl || !${S}.panel.visible`); i++) { await key('Digit1'); await key('Space'); await wait(200); }
        check(await until(`!${S}.talkCtl && ${S}.panel.visible`, 8000), `${tag}: the conversation is done from the keyboard`);
        const pieces = await ev(`${S}.pieces.map(p => ({ id: p.id, accept: p.accept, reason: p.reason || null }))`);
        // count every piece
        for (const pc of pieces) {
          if (!(await tabTo(pc.id))) throw new Error(`Tab never reached piece ${pc.id}`);
          if (pc === pieces[0]) check(await ev(`!!${S}.hoverCard || ${S}.pieces[0].issues && ${S}.pieces[0].issues.includes('no_label')`), `${tag}: the ring on a piece shows its label`);
          await key('Enter');
        }
        check(await ev(`Object.keys(${S}.counted).length === ${pieces.length}`), `${tag}: every piece counted from the keyboard`);
        check(await tabTo('Confirm the count'), `${tag}: Tab reaches "Confirm the count"`);
        await key('Enter');
        if (!(await until(`${S}.countChoices && (${S}._modalStack || []).some(m => m.active)`, 4000))) throw new Error('the count question never opened');
        const right = await ev(`${S}.countChoices.findIndex(o => o.got === 2)`);
        await key(DIGITS[right]); await wait(500);
        for (let i = 0; i < 3 && await modals(); i++) { await key('Enter'); await wait(400); }   // the recount, if raised
        check(await until(`${S}.countAnswered`, 4000), `${tag}: the count reconciled with the number keys`);
        // the invoice
        if (await ev(`!!${S}.content.docs`)) {
          check(await tabTo(/^Check the paperwork/), `${tag}: Tab reaches "Check the paperwork"`);
          await key('Enter'); await wait(600);
          const bad = await ev(`${S}.content.docs.fields.map(f => !!f.bad)`);
          // the modal's ring starts on Submit; up through every line, marking the bad ones
          const ring = `(() => { const f = ${S}._focusOn, c = f && f.current && f.current(); return c && c.line !== undefined ? c.line : null; })()`;
          const seenRows = new Set();
          for (let i = 0; i < bad.length + 3; i++) {
            await key('ArrowUp');
            const y = await ev(ring);
            if (y === null || seenRows.has(y)) continue;
            seenRows.add(y);
          }
          check(seenRows.size === bad.length, `${tag}: the arrows reach all ${bad.length} invoice lines (${seenRows.size})`);
          // now the ring is on the top line: down through them, Enter on each bad one
          for (let i = 0; i < bad.length; i++) {
            if (bad[i]) await key('Enter');
            await key('ArrowDown');
          }
          check(JSON.stringify(await ev(`${S}.content.docs.fields.map((f, i) => !!${S}.docFlags[i])`)) === JSON.stringify(bad), `${tag}: Enter marks exactly the bad lines`);
          // Submit is below the last line; the ring is on it after the last ArrowDown
          await key('Enter'); await wait(600);
          check(await until(`${S}.docDone`, 4000), `${tag}: the findings submitted from the keyboard`);
          for (let i = 0; i < 3 && await modals(); i++) { await key('Enter'); await wait(400); }
        }
        // inspect and decide every piece
        const reasons = await ev(`OTR_DATA.pickups.reasons.map(r => r.id)`);
        for (const pc of pieces) {
          if (!(await tabTo(pc.id))) throw new Error(`Tab never reached piece ${pc.id} to inspect it`);
          await key('Enter');
          if (!(await until(`(${S}._modalStack || []).some(m => m.active)`, 3000))) throw new Error(`Enter did not inspect ${pc.id}`);
          await wait(400);
          if (pc.accept) await key('KeyA');
          else { await key('KeyR'); await wait(500); await key(DIGITS[Math.max(0, reasons.indexOf(pc.reason))]); }
          if (!(await until(`!!${S}.decided['${pc.id}'] && !(${S}._modalStack || []).some(m => m.active)`, 4000))) throw new Error(`no call recorded on ${pc.id}`);
        }
        const wrong = await ev(`${S}.pieces.filter(p => ${S}.decided[p.id].accept !== p.accept || (!p.accept && ${S}.decided[p.id].reason !== p.reason)).map(p => p.id)`);
        check(!wrong.length, `${tag}: every piece accepted or refused right, with the right reason${wrong.length ? ': ' + wrong.join(', ') : ''}`);
        check(await tabTo(/^Finish the pickup/), `${tag}: Tab reaches "Finish the pickup"`);
        await key('Enter'); await wait(2200);
        for (let i = 0; i < 4 && !(await ev(`OTR.game.scene.isActive('ResultsScene')`)); i++) { await key('Digit1'); await wait(900); }      // the handheld's options answer their numbers
        check(await until(`OTR.game.scene.isActive('ResultsScene')`, 10000), `${tag}: the handheld's Done finishes the pickup`);
      } catch (e) { check(false, `${tag}: ${e.message}`); }
      await p.close();
    }
    check(!errors.length, 'no page errors ' + errors.slice(0, 2).join(' | '));
  } finally { await b.close(); }
  console.log(fails.length ? `\n${fails.length} of ${checks} pickup keyboard checks failed` : `\n${checks} pickup keyboard checks passed`);
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
