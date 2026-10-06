// node shot.js <lang> <out.png> [picker]: the title screen (or the language picker) in a language
const puppeteer = require('/home/user/wp1/test/node_modules/puppeteer-core');
(async () => {
  const [lang, out, what] = process.argv.slice(2);
  const b = await puppeteer.launch({ executablePath: '/opt/pw-browsers/chromium', headless: 'new', args: ['--no-sandbox', '--allow-file-access-from-files', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage(); await p.setViewport({ width: 1280, height: 720 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///home/user/wp1/index.html?user=shot&name=Asha%20Rao&lang=' + lang);
  const t0 = Date.now(); while (Date.now() - t0 < 20000) { if (await p.evaluate('OTR.game.scene.isActive("TitleScene")').catch(() => false)) break; await new Promise(r => setTimeout(r, 200)); }
  await new Promise(r => setTimeout(r, 1500));
  if (what === 'picker') { await p.evaluate(() => OTR.ui.languages(OTR.game.scene.getScene('TitleScene'))); await new Promise(r => setTimeout(r, 900)); }
  if (what && what !== 'picker') { await p.evaluate((k) => { const m = OTR.game.scene; m.getScenes(true).forEach(s => m.stop(s.sys.settings.key)); m.start(k); }, what); await new Promise(r => setTimeout(r, 2000)); }
  await p.screenshot({ path: out });
  console.log('lang', await p.evaluate('OTR.i18n.lang'), errs.length ? 'ERRORS ' + errs.join(' / ') : 'no errors');
  await b.close();
})();
