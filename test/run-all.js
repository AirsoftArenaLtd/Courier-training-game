#!/usr/bin/env node
/*
 * B-49: every test suite from one command, so none goes unrun. Lists test/*.js itself (a new suite is picked up
 * without editing this file), serves the game on a free local port for the browser suites (QA_BASE), finds the
 * installed Chromium (QA_BROWSER), and prints one pass/fail table with the time each took.
 *
 *   node test/run-all.js                 the Node suites: plain ones four at a time, then those that open a page one by one
 *   node test/run-all.js --browser       those, then every browser suite (one at a time: they measure frame time)
 *   node test/run-all.js fpnav workday   only the suites whose file name contains one of these words
 *   QA_JOBS=1 ... / QA_TIMEOUT=900 ...   suites at a time for the Node group / seconds before a suite is stopped
 *
 * Not run here: the scenario flows (`node test/qa.js`) and the 3D quality gate (`node test/fpquality.js`), which take
 * 10–20 minutes each and are run per milestone and for every Codex review; fpbench.js, which fpquality runs; and the
 * before/after comparisons fphudcomparebrowser.js and fpperfbrowser.js, which need QA_BEFORE_BASE.
 * Logs: test/out/run-all/<suite>.log.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(__dirname, 'out', 'run-all');
fs.mkdirSync(OUT, { recursive: true });
const args = process.argv.slice(2);
const withBrowser = args.includes('--browser');
const only = args.filter(a => !a.startsWith('--'));
// also not here: the before/after comparisons, which need a second server with the older build (QA_BEFORE_BASE)
const NOT_HERE = new Set(['run-all.js', 'qa.js', 'fpquality.js', 'fpbench.js', 'fphudcomparebrowser.js', 'fpperfbrowser.js']);
// browser suites: the *browser.js ones, plus the others that open pages
const BROWSER = new Set(['a11y-screens.js', 'fpaccesslayout.js']);
const isBrowser = (f) => /browser\.js$/.test(f) || BROWSER.has(f);
const JOBS = Math.max(1, Number(process.env.QA_JOBS) || 4);
const TIMEOUT = (Number(process.env.QA_TIMEOUT) || 900) * 1000;

const findBrowser = () => [process.env.QA_BROWSER, '/opt/pw-browsers/chromium', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable'].find(p => p && fs.existsSync(p));

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.bin': 'application/octet-stream',
  '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.woff2': 'font/woff2', '.ktx2': 'image/ktx2', '.webp': 'image/webp' };
/** The game's files on 127.0.0.1 at a free port, as `python3 -m http.server` would serve them. */
const serve = () => new Promise((resolve) => {
  const server = http.createServer((req, res) => {
    let rel = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (rel.endsWith('/')) rel += 'index.html';
    const file = path.join(ROOT, path.normalize(rel));
    if (!file.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    fs.readFile(file, (err, body) => {
      if (err) { res.writeHead(404).end(); return; }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream' });
      res.end(body);
    });
  });
  server.listen(0, '127.0.0.1', () => resolve(server));
});

const run = (file, env) => new Promise((resolve) => {
  const t0 = Date.now(), log = fs.createWriteStream(path.join(OUT, file.replace(/\.js$/, '.log')));
  const child = spawn(process.execPath, [path.join(__dirname, file)], { cwd: ROOT, env });
  child.stdout.pipe(log, { end: false }); child.stderr.pipe(log, { end: false });
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; child.kill('SIGKILL'); }, TIMEOUT);
  child.on('close', (code) => {
    clearTimeout(timer); log.end();
    resolve({ file, ok: code === 0 && !timedOut, why: timedOut ? 'timed out' : code === 0 ? '' : `exit ${code}`, s: (Date.now() - t0) / 1000 });
  });
});

/** Runs the files `jobs` at a time, printing each result as it finishes. */
const pool = async (files, jobs, env, results) => {
  const queue = files.slice();
  const worker = async () => {
    while (queue.length) {
      const r = await run(queue.shift(), env);
      console.log(`${r.ok ? 'ok  ' : 'FAIL'} ${r.file.padEnd(26)} ${r.s.toFixed(0).padStart(4)} s ${r.why}`);
      results.push(r);
    }
  };
  await Promise.all(Array.from({ length: Math.min(jobs, files.length) }, worker));
};

(async () => {
  const all = fs.readdirSync(__dirname).filter(f => f.endsWith('.js') && !NOT_HERE.has(f)).sort()
    .filter(f => !only.length || only.some(w => f.includes(w)));
  const nodeFiles = all.filter(f => !isBrowser(f)), browserFiles = all.filter(isBrowser);
  // a suite that opens a page times what it sees, so it runs alone (driving.js failed four at a time)
  const opensPage = (f) => /puppeteer/.test(fs.readFileSync(path.join(__dirname, f), 'utf8'));
  const results = [], env = Object.assign({}, process.env);
  const exe = findBrowser();
  if (exe) env.QA_BROWSER = exe;
  const server = await serve();
  env.QA_BASE = `http://127.0.0.1:${server.address().port}`;
  console.log(`${nodeFiles.length} Node suites${withBrowser ? `, then ${browserFiles.length} browser suites` : ` (${browserFiles.length} browser suites skipped: --browser)`}; ` +
    `game at ${env.QA_BASE}; browser ${exe || 'not found'}; logs in test/out/run-all/\n`);
  await pool(nodeFiles.filter(f => !opensPage(f)), JOBS, env, results);
  await pool(nodeFiles.filter(opensPage), 1, env, results);
  if (withBrowser) {
    if (!exe) console.log('No Chromium found: set QA_BROWSER. Browser suites not run.');
    else await pool(browserFiles, 1, env, results);
  }
  server.close();
  const bad = results.filter(r => !r.ok);
  console.log(`\n${results.length - bad.length} of ${results.length} suites passed` + (bad.length ? `; failed: ${bad.map(r => r.file).join(', ')} (see test/out/run-all/)` : ''));
  process.exit(bad.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
