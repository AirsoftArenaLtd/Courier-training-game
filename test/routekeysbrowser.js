#!/usr/bin/env node
/*
 * B-83: the route planner (module 1) and Find It Fast (module 6) with the keyboard alone, as B-79 does for the
 * pre-trip. Route planner: Enter on the brief, then each round planned with Tab (and the arrows) and Enter on the
 * manifest cards, in the best order; the ring on a card lights its pin; Backspace undoes the last pick and Enter puts
 * it back; Tab on to DISPATCH and Enter; Enter on the round's result. Every round must be optimal. Find It Fast: the
 * arrow keys walk the truck to the package each stop asks for and Enter pulls it, right first time. Before B-83 the
 * route planner's cards could only be clicked.
 *
 *   QA_BROWSER=/path/to/chrome node test/routekeysbrowser.js          (QA_LANGS=en,ta by default)
 */
'use strict';
const path = require('path');
const pp = require('puppeteer-core');
const BROWSER = process.env.QA_BROWSER || '/opt/pw-browsers/chromium';
const LANGS = (process.env.QA_LANGS || 'en,ta').split(',').map(s => s.trim()).filter(Boolean);
const wait = (ms) => new Promise(r => setTimeout(r, ms));
let checks = 0;
const fails = [];
const check = (ok, what) => { checks++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) fails.push(what); };

(async () => {
  const b = await pp.launch({ executablePath: BROWSER, headless: 'new', args: ['--no-sandbox', '--allow-file-access-from-files'] });
  const errors = [];
  try {
    for (const lang of LANGS) {
      const open = async (scenario) => {
        const p = await b.newPage();
        await p.setViewport({ width: 1280, height: 720 });
        p.on('pageerror', e => errors.push(`${lang} ${scenario}: ${e.message}`));
        await p.goto('file://' + path.resolve(__dirname, '..', 'index.html') + `?scenario=${scenario}&dev=1&user=keys&name=Sam%20Lee&lang=${lang}`);
        const ev = (src) => p.evaluate(src);
        const until = async (src, ms) => { const t0 = Date.now(); while (Date.now() - t0 < (ms || 15000)) { if (await ev(src).catch(() => false)) return true; await wait(120); } return false; };
        const key = async (k) => { await p.keyboard.press(k); await wait(160); };
        return { p, ev, until, key };
      };

      // ---- the route planner
      {
        const { p, ev, until, key } = await open('m1-route');
        const S = `OTR.game.scene.getScene('RoutePlannerScene')`;
        check(await until(`OTR.game.scene.isActive('RoutePlannerScene')`, 30000), `${lang}: the route planner opens`);
        await wait(1200); await key('Enter');
        check(await until(`${S}.state === 'plan' && !(${S}._modalStack || []).some(m => m.active)`, 8000), `${lang}: Enter on the brief starts the first round`);
        // where the ring is: a card's stop number, or the button's English label
        const at = () => ev(`(() => { const c = ${S}.keyFocus.current(); return !c ? null : c.stopId ? c.stopId : OTR.i18n.src(c.label || c); })()`);
        const tabTo = async (want) => { for (let i = 0; i < 16; i++) { await key('Tab'); if (await at() === want) return true; } return false; };
        try {
          const rounds = await ev(`${S}.content.rounds.length`);
          for (let r = 0; r < rounds; r++) {
            await until(`${S}.state === 'plan'`, 10000); await wait(1200);
            const best = await ev(`${S}.optimal.order`);
            for (const i of best) {
              if (!(await tabTo(i))) throw new Error(`round ${r + 1}: Tab never reached stop ${i}`);
              if (i === best[0]) check(await ev(`${S}.cards[${i}].hl.visible && ${S}.tip.visible`), `${lang}: round ${r + 1}: the ring on a card lights its stop and shows its tip`);
              await key('Enter');
              if (!(await ev(`${S}.order.includes(${i})`))) throw new Error(`round ${r + 1}: Enter did not pick stop ${i}`);
            }
            if (r === 0) {
              const last = best[best.length - 1];
              await key('Backspace');
              check(!(await ev(`${S}.order.includes(${last})`)), `${lang}: Backspace undoes the last pick`);
              await key('Enter');                                    // the ring is still on that card: picks it again
              check(await ev(`${S}.order[${S}.order.length - 1] === ${last}`), `${lang}: Enter on the card picks it again`);
              // the arrows move the ring too
              await key('ArrowDown');
              if (await at() === last) await key('ArrowUp');           // it was the bottom card
              check(typeof (await at()) === 'number' && await at() !== last, `${lang}: the arrows move the ring to another card`);
            }
            check(JSON.stringify(await ev(`${S}.order`)) === JSON.stringify(best), `${lang}: round ${r + 1} planned from the keyboard in the best order`);
            check(await tabTo('DISPATCH'), `${lang}: round ${r + 1}: Tab reaches DISPATCH`);
            await key('Enter');
            check(await until(`${S}.state !== 'plan'`, 3000), `${lang}: round ${r + 1}: Enter dispatches`);
            if (!(await until(`${S}.state === 'result' && (${S}._modalStack || []).some(m => m.active)`, 60000))) throw new Error(`round ${r + 1} never finished driving`);
            await wait(700); await key('Enter');
          }
          check(await until(`OTR.game.scene.isActive('ResultsScene')`, 15000), `${lang}: Enter on the last result finishes the planner`);
          const eff = await ev(`${S}.results.map(r => Math.round(r.eff * 100))`);
          check(eff.length === rounds && eff.every(e => e >= 99), `${lang}: every round optimal from the keyboard (${eff.join(', ')}%)`);
        } catch (e) { check(false, `${lang}: ${e.message}`); }
        await p.close();
      }

      // ---- Find It Fast
      {
        const { p, ev, until, key } = await open('m6-find');
        const S = `OTR.game.scene.getScene('LoadingScene')`;
        check(await until(`OTR.game.scene.isActive('LoadingScene')`, 30000), `${lang}: Find It Fast opens`);
        await wait(1200); await key('Enter');
        check(await until(`${S}.running && !!${S}.round`, 8000), `${lang}: Enter on the brief starts Find It Fast`);
        try {
          const rounds = await ev(`${S}.content.rounds.length`);
          for (let r = 0; r < rounds; r++) {
            if (!(await until(`${S}.running && !!${S}.round`, 8000))) break;
            // the arrow presses that reach the package asked for: a search over the scene's own moves (kbMove, tried and
            // put back), so a package the arrows cannot reach fails here; then those keys are pressed for real
            const route = await ev(`(() => { const s = ${S}, keyOf = (t) => t && t.pkg ? t.pkg.id : null, save = s.kb.at;
              const dirs = [['ArrowLeft', -1, 0], ['ArrowRight', 1, 0], ['ArrowUp', 0, -1], ['ArrowDown', 0, 1]];
              const step = (from, d) => { s.kb.at = from; s.kbMove(d[1], d[2]); return s.kb.at; };
              const start = s.kb.at || s.kbTargets()[0], seen = new Map([[keyOf(start), []]]), q = [start];
              const lead = s.kb.at ? [] : ['ArrowRight'];
              while (q.length) { const t = q.shift(), path = seen.get(keyOf(t));
                if (keyOf(t) === s.round.pkg) { s.kb.at = save; s.kbDraw(); return lead.concat(path); }
                dirs.forEach(d => { const n = step(t, d); if (n && !seen.has(keyOf(n))) { seen.set(keyOf(n), path.concat(d[0])); q.push(n); } }); }
              s.kb.at = save; s.kbDraw(); return null; })()`);
            if (!route) throw new Error(`stop ${r + 1}: the arrows cannot reach the package`);
            for (const k of route) await key(k);
            if (!(await ev(`${S}.kb.at && ${S}.kb.at.pkg && ${S}.kb.at.pkg.id === ${S}.round.pkg`))) throw new Error(`stop ${r + 1}: the arrows never reached the package`);
            await key('Enter');
            await wait(900);
          }
          check(await until(`${S}.finished || OTR.game.scene.isActive('ResultsScene')`, 15000), `${lang}: every package found from the keyboard`);
          check(await ev(`${S}.cleanRounds === ${S}.content.rounds.length && !${S}.wrongPicks`), `${lang}: Find It Fast: each one right first time`);
        } catch (e) { check(false, `${lang}: ${e.message}`); }
        await p.close();
      }
    }
    check(!errors.length, 'no page errors ' + errors.slice(0, 2).join(' | '));
  } finally { await b.close(); }
  console.log(fails.length ? `\n${fails.length} of ${checks} route and find keyboard checks failed` : `\n${checks} route and find keyboard checks passed`);
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
