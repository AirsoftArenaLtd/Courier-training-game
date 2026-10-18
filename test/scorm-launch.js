/*
 * The LMS package launched as an LMS launches it (board task B-40): the SCORM 1.2 zip from
 * test/tools/package-scorm.js, unpacked and opened inside a player page that gives the game a SCORM 1.2 API, as an
 * LMS's frame does. The game must find the LMS and read the learner and the saved progress; the 3D workday must load
 * every model at Low and High from the package; nothing may be missing from the zip, and nothing may come from outside.
 *
 *   QA_BROWSER=/path/to/chrome node test/scorm-launch.js [dist/on-the-route-scorm12.zip]   (builds it when not given)
 */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), http = require('http'), cp = require('child_process');
const zlib = require('zlib');
const pp = require('puppeteer-core');
const ROOT = path.join(__dirname, '..');
const wait = (ms) => new Promise(r => setTimeout(r, ms));

// the zip's entries, unpacked with Node alone (stored or deflated, as the packager writes them)
function unzip(file, dir) {
  const buf = fs.readFileSync(file);
  let eocd = buf.length - 22; while (eocd > 0 && buf.readUInt32LE(eocd) !== 0x06054b50) eocd--;
  let at = buf.readUInt32LE(eocd + 16);
  const count = buf.readUInt16LE(eocd + 10);
  for (let i = 0; i < count; i++) {
    const method = buf.readUInt16LE(at + 10), size = buf.readUInt32LE(at + 20), nlen = buf.readUInt16LE(at + 28);
    const xlen = buf.readUInt16LE(at + 30), clen = buf.readUInt16LE(at + 32), local = buf.readUInt32LE(at + 42);
    const name = buf.toString('utf8', at + 46, at + 46 + nlen);
    at += 46 + nlen + xlen + clen;
    if (name.endsWith('/')) continue;
    const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const data = buf.subarray(start, start + size);
    const out = path.join(dir, name);
    if (!out.startsWith(dir + path.sep)) throw new Error('a zip entry outside the package: ' + name);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, method === 8 ? zlib.inflateRawSync(data) : data);
  }
  return count;
}

// a page standing in for the LMS: the SCORM 1.2 API on the parent window, the package in a frame
const PLAYER = `<!doctype html><meta charset="utf-8"><title>SCORM 1.2 test player</title><script>
window.calls = []; window.store = {};
window.API = { LMSInitialize: () => { calls.push('init'); return 'true'; }, LMSFinish: () => 'true',
  LMSGetValue: (k) => { calls.push('get ' + k); return store[k] || ({ 'cmi.core.student_name': 'Rivera, Sam', 'cmi.core.student_id': 'lms042' }[k] || ''); },
  LMSSetValue: (k, v) => { store[k] = String(v); return 'true'; }, LMSCommit: () => 'true',
  LMSGetLastError: () => '0', LMSGetErrorString: () => '', LMSGetDiagnostic: () => '' };
</script><iframe id="sco" style="width:1280px;height:720px;border:0"></iframe>
<script>document.getElementById('sco').src = new URLSearchParams(location.search).get('sco');</script>`;

(async () => {
  let zip = process.argv[2];
  if (!zip) { zip = path.join(ROOT, 'dist', 'on-the-route-scorm12.zip'); cp.execFileSync(process.execPath, [path.join(ROOT, 'test', 'tools', 'package-scorm.js'), zip], { stdio: 'inherit' }); }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'otr-scorm-'));
  const files = unzip(zip, dir);
  fs.writeFileSync(path.join(dir, '__player.html'), PLAYER);
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
    '.glb': 'model/gltf-binary', '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.woff2': 'font/woff2', '.xml': 'text/xml', '.svg': 'image/svg+xml' };
  const server = http.createServer((req, res) => {
    const f = path.join(dir, decodeURIComponent(req.url.split('?')[0]));
    if (!f.startsWith(dir) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}/`;
  const b = await pp.launch({ executablePath: process.env.QA_BROWSER || '/usr/bin/chromium', headless: true, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const problems = [], missing = new Set(), outside = new Set();
  try {
    const p = await b.newPage(); await p.setViewport({ width: 1300, height: 760 });
    p.on('response', r => { if (r.status() >= 400 && !/favicon\.ico$/.test(r.url())) missing.add(r.url().replace(base, '')); });
    p.on('request', r => { const u = r.url(); if (!u.startsWith(base) && !/^(data|blob):/.test(u)) outside.add(u); });
    p.on('pageerror', e => problems.push('page error: ' + e.message));
    const frame = async () => { for (let i = 0; i < 100; i++) { const f = p.frames().find(f => f !== p.mainFrame()); if (f) return f; await wait(100); } throw new Error('no frame'); };
    await p.goto(base + '__player.html?sco=index.html');
    let f = await frame();
    await f.waitForFunction(() => window.OTR && OTR.game && OTR.identity && OTR.game.scene.getScenes(true).length > 0, { timeout: 60000 });
    await wait(1500);
    const who = await f.evaluate(() => ({ mode: OTR.identity.mode, name: OTR.identity.name }));
    const calls = await p.evaluate(() => window.calls);
    if (who.mode !== 'scorm') problems.push('the game did not find the LMS (mode ' + who.mode + ')');
    if (!calls.includes('init') || !calls.includes('get cmi.suspend_data')) problems.push('the game did not start the LMS session or read the saved progress');
    console.log(`hub: ${who.mode}, learner "${who.name}", ${calls.length} LMS calls`);
    for (const gfx of ['low', 'high']) {
      await p.goto(base + '__player.html?sco=' + encodeURIComponent('first-person.html?gfx=' + gfx));
      f = await frame();
      await f.waitForFunction(() => window.OTR && OTR.game && OTR.game.scene.isActive('FirstPersonScene') && !OTR.game.scene.getScene('FirstPersonScene').loading, { timeout: 120000 });
      const st = await f.evaluate(() => { const k = OTR.game.scene.getScene('FirstPersonScene').assetBank; return k ? { loaded: k.stats.loaded, failed: k.stats.failed, fallbacks: k.stats.fallbacks } : null; });
      // a model that fell back to another (B-44) is missing from the package too
      if (!st || st.failed || !st.loaded || st.fallbacks !== 0) problems.push(`${gfx}: models ${JSON.stringify(st)}`);
      console.log(`${gfx}: ${st ? st.loaded : 0} models loaded, ${st ? st.failed : '?'} failed, ${st ? st.fallbacks : '?'} fell back`);
    }
  } finally { await b.close(); server.close(); fs.rmSync(dir, { recursive: true, force: true }); }
  missing.forEach(u => problems.push('not in the package: ' + u));
  outside.forEach(u => problems.push('from outside the package: ' + u));
  problems.forEach(x => console.log('  ' + x));
  console.log(problems.length ? `${problems.length} problems` : `the package (${files} files) launches in a SCORM 1.2 frame with everything it needs`);
  process.exit(problems.length ? 1 : 0);
})();
