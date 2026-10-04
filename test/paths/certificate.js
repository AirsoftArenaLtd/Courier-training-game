/*
 * The certificate. A trainee who has passed 26 of the 27 assessments (set up by script: playing 26 scenarios through
 * would take hours) has no certificate yet; a 27th attempt that was left part-way doesn't count. They then pass the
 * last one the real way (its brief → Assessment ▶ → the conversation on its recommended answers), and only then does
 * the record offer the certificate. It must name the trainee, say 27 of 27 and the completion date, and hand the
 * keyboard back after printing.
 */
const { wait, clickText, runTalk } = require('./lib/ui');

const LAST = 'm4-damaged';

module.exports = async (page, ctx) => {
  const active = async (key, ms) => {
    if (await ctx.until(`OTR.game.scene.isActive(${JSON.stringify(key)})`, ms || 15000)) { await wait(700); return; }
    const seen = await ctx.eval(`(() => { const out = []; OTR.game.scene.getScenes(true).forEach(s => { const walk = (o) => { if (!o || o.visible === false) return; if (o.type === 'Text' && (o.srcText ?? o.text)) out.push((o.srcText ?? o.text)); (o.list || []).forEach(walk); }; s.children.list.forEach(walk); out.unshift('[' + s.sys.settings.key + ']'); }); return out.slice(0, 30).join(' | '); })()`).catch(() => '?');
    throw new Error(`${key} never opened; on screen: ${seen}`);
  };
  const recordTexts = () => ctx.eval(`(() => { const s = OTR.game.scene.getScene('RecordScene'), out = []; const walk = (o) => { if (!o || o.visible === false) return; if (o.type === 'Text') out.push((o.srcText ?? o.text)); (o.list || []).forEach(walk); }; s.children.list.forEach(walk); return out; })()`);
  const openRecord = async () => { await clickText(page, 'HubScene', /^My record/); await active('RecordScene'); return recordTexts(); };

  // a new trainee
  await page.evaluate(() => localStorage.clear());
  await ctx.reload();
  await page.keyboard.press('Enter');                                   // Start Training
  await wait(900);
  await page.keyboard.type('Morgan Lee');
  await page.keyboard.press('Enter');
  await active('HubScene');

  // 26 assessments passed, the 27th tried once and left part-way
  const total = await page.evaluate((last) => {
    const ids = OTR.registry.all().map(s => s.id), at = Date.now() - 86400000;
    OTR.save.data.assess = OTR.save.data.assess || {};
    ids.forEach(id => { OTR.save.data.assess[id] = id === last
      ? { attempts: 1, passed: false, pending: false, abandoned: true, at }
      : { attempts: 1, passed: true, pending: false, at, stars: { safety: 3, efficiency: 3, service: 3 } }; });
    OTR.save.write();
    return ids.length;
  }, LAST);
  if (total !== 27) throw new Error(`expected 27 scenarios, found ${total}`);
  // the trainer allows a second attempt at the one left part-way (one attempt each is the default)
  await page.evaluate((last) => { OTR.save.data.assess[last].allowed = 1; OTR.save.write(); }, LAST);
  await ctx.reload();
  await page.keyboard.press('Enter');                                   // Continue
  await active('HubScene');

  /* ---- 26 of 27: no certificate */
  let texts = await openRecord();
  if (texts.indexOf('26 / 27') < 0) throw new Error('the record does not say 26 / 27: ' + texts.slice(0, 20).join(' | '));
  if (texts.some(t => /^Certificate$/.test(t))) throw new Error('the certificate is offered with one assessment still to pass');
  await page.keyboard.press('Escape');
  await active('HubScene');

  /* ---- the 27th, passed the real way */
  await clickText(page, 'HubScene', /^Damaged on Arrival$/);
  await wait(600);
  await clickText(page, 'HubScene', /^(Assessment|Retake test) ▶$/);
  await wait(900);
  await clickText(page, 'HubScene', /^Start ▶$/);
  await active('DialogueScene', 20000);
  const S = `OTR.game.scene.getScene('DialogueScene')`;
  await page.keyboard.press('Enter');                                   // the intro card
  if (!(await ctx.until(`!!${S}.ctl`, 8000))) throw new Error('the conversation never started');
  await runTalk(page, `${S}.ctl`, { timeout: 150000 });
  await wait(1300);
  await clickText(page, 'DialogueScene', /^See Results/);
  await active('ResultsScene');
  if (!(await ctx.until(`OTR.game.scene.getScene('ResultsScene').children.list.some(o => o.list && o.list.some(t => t.type === 'Text' && (t.srcText ?? t.text) === 'ASSESSMENT PASSED'))`, 5000))) throw new Error('the last assessment was not passed');
  await wait(1500);
  await page.keyboard.press('Enter');                                   // To the station
  await active('HubScene');

  /* ---- 27 of 27: the certificate */
  texts = await openRecord();
  if (texts.indexOf('27 / 27') < 0) throw new Error('the record does not say 27 / 27');
  await ctx.audit('record with the certificate');
  await clickText(page, 'RecordScene', /^Certificate$/);
  await wait(900);
  const cert = await page.evaluate(() => { const f = document.getElementById('otr-print'); return f && f.contentDocument ? f.contentDocument.body.innerText : ''; });
  const today = await ctx.eval('OTR.record.date(Date.now())');
  const want = [/Certificate of Completion/, /Morgan Lee/, /\(27 of 27\)/, new RegExp('Completed ' + today.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))];
  const missing = want.filter(re => !re.test(cert));
  if (missing.length) throw new Error('the certificate is missing ' + missing.join(', ') + ': ' + cert.slice(0, 300).replace(/\s+/g, ' '));
  if (/FedEx/i.test(cert)) throw new Error('the certificate still carries the old company name');
  // the keyboard is back with the game after printing
  await page.keyboard.press('Escape');
  await active('HubScene');
};
