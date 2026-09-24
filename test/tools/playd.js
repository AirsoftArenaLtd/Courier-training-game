#!/usr/bin/env node
/*
 * playd: play the game by hand from the command line.
 *
 * Starts the game in a headless browser and keeps it open, then takes commands over HTTP, so a tester (a person or
 * an agent) can play the way a trainee does: hold a key, click, look at a screenshot, decide what to do next.
 *
 *   node test/tools/playd.js --port 9301 [--out test/out/review/me] [--gpu default] [--headful] [--realtime]
 *
 * By default it is TURN-BASED: the game is frozen between commands and only runs while a command is acting (a key
 * held for 300 ms runs the game for those 300 ms, plus a short settle). So it does not matter how long you think
 * between moves; timers, heat and traffic only move when you do. `/run?ms=2000` just lets the game play for 2 s.
 * `--realtime` (or /mode?turn=0) keeps it running all the time, as a trainee sees it.
 *
 * Every command is a GET (except /eval, which is a POST of a JS expression) and answers JSON. With curl:
 *   curl -s "localhost:9301/open?url=index.html%3Fscenario%3Dm5-pod%26dev%3D1"
 *   curl -s "localhost:9301/hold?key=KeyD&ms=400"          hold D for 400 ms (walk right)
 *   curl -s "localhost:9301/press?key=KeyE"                press E
 *   curl -s "localhost:9301/click?x=640&y=360"             click at screen x, y (the canvas is 1280 x 720)
 *   curl -s "localhost:9301/clicktext?re=Let's%20go"       click the top-most visible text matching a regex
 *   curl -s "localhost:9301/shot?name=van-exit"            screenshot -> <out>/van-exit.png (open it to look). Half
 *                                                          size (640 x 360) by default; &full=1 for 1280 x 720, or
 *                                                          &clip=x,y,w,h to crop a region at full size (small text)
 *   curl -s "localhost:9301/burst?name=walk&n=6&every=120" 6 screenshots 120 ms apart while the game runs
 *   curl -s "localhost:9301/texts"                         every visible text on screen, one line each with its
 *                                                          screen box; &match=<regex> to filter, &scene=<key>
 *   curl -s "localhost:9301/stage"                         the walkable stage: courier, nearest E, the prompt shown
 *                                                          (&full=1 adds the scene's whole state)
 *   curl -s "localhost:9301/state"                         active scenes and their basic flags
 *   curl -s -X POST --data "OTR.game.scene.getScenes(true).map(s => s.sys.settings.key)" localhost:9301/eval
 *   curl -s "localhost:9301/log"                           console warnings/errors and page errors since last /log
 *   curl -s "localhost:9301/quit"
 *
 * Other commands: /down?key= /up?key= (hold across commands), /type?keys=KeyA,KeyA,Space, /move?x=&y= (hover),
 * /drag?x1=&y1=&x2=&y2=&ms=, /run?ms=, /mode?turn=0|1, /reload. Key names are KeyboardEvent codes: KeyA, KeyD, KeyE,
 * KeyW, KeyS, Space, Enter, Escape, Tab, ShiftLeft, Digit1, ArrowLeft...
 * Every action takes &after=<ms> (how long the game keeps running after the input, default 250).
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const ROOT = path.resolve(__dirname, '..', '..');
const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
const CTL = Number(arg('--port', 9301));
const GAME = CTL + 100;
const OUT = path.resolve(ROOT, arg('--out', `test/out/review/${CTL}`));
const GPU = arg('--gpu', 'fast');
const HEADFUL = argv.includes('--headful');
let turnBased = !argv.includes('--realtime');

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = (ms) => new Promise(r => setTimeout(r, ms));

/* ------------------------------------------------------------ the game, served */
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav' };
const gameServer = http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
  const file = path.join(ROOT, rel);
  if (!file.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(buf);
  });
});

let browser, page;
let logBuf = [];

/* ------------------------------------------------------------ in-page helpers */
const HELPERS = `(() => {
  if (window.__pd) return;
  const vis = (o) => { for (let p = o; p; p = p.parentContainer) { if (p.visible === false || (p.alpha !== undefined && p.alpha <= 0.02)) return false; } return true; };
  const alphaOf = (o) => { let a = 1; for (let p = o; p; p = p.parentContainer) a *= (p.alpha === undefined ? 1 : p.alpha); return +a.toFixed(2); };
  const topOf = (o) => { let p = o; while (p.parentContainer) p = p.parentContainer; return p; };
  const toScreen = (scene, o, wx, wy) => {
    const cam = scene.cameras.main, top = topOf(o);
    const sfx = top.scrollFactorX === undefined ? 1 : top.scrollFactorX, sfy = top.scrollFactorY === undefined ? 1 : top.scrollFactorY;
    const z = cam.zoom || 1, hw = cam.width / 2, hh = cam.height / 2;
    return { x: (wx - cam.scrollX * sfx - hw) * z + hw + cam.x, y: (wy - cam.scrollY * sfy - hh) * z + hh + cam.y };
  };
  const depthOf = (o) => { let d = 0; for (let p = o; p; p = p.parentContainer) d = Math.max(d, p.depth || 0); return d; };
  window.__pd = {
    texts() {
      const out = [];
      OTR.game.scene.getScenes(true).forEach(s => {
        const walk = (o) => {
          if (!o || !vis(o)) return;
          if (o.type === 'Text' && String(o.text).trim()) {
            let b; try { b = o.getBounds(); } catch (e) { return; }
            const a = toScreen(s, o, b.x, b.y), c = toScreen(s, o, b.right, b.bottom);
            out.push({ scene: s.sys.settings.key, text: String(o.text).replace(/\\n/g, ' / ').slice(0, 160), x: Math.round(a.x), y: Math.round(a.y), w: Math.round(c.x - a.x), h: Math.round(c.y - a.y), depth: depthOf(o), alpha: alphaOf(o) });
          }
          (o.list || []).forEach(walk);
        };
        s.children.list.forEach(walk);
      });
      return out.sort((p, q) => (p.y - q.y) || (p.x - q.x));
    },
    find(src, flags, scene) {
      const rx = new RegExp(src, flags || '');
      const hits = __pd.texts().filter(t => rx.test(t.text) && (!scene || t.scene === scene) && t.alpha >= 0.3 && t.w > 0);
      hits.sort((p, q) => q.depth - p.depth);
      return hits[0] || null;
    },
    stage() {
      const s = OTR.game.scene.getScenes(true).filter(x => x.stage && x.stage.me).pop();
      if (!s) return null;
      const st = s.stage, me = st.me, it = st.locked === 0 ? st.nearest() : null;
      const pr = st.prompt;
      let prompt = null;
      if (pr) {
        const b = pr.getBounds(), p0 = toScreen(s, pr, b.x, b.y);
        prompt = { for: st.promptFor ? st.promptFor.label : null, active: pr.active, visible: pr.visible, alpha: +pr.alpha.toFixed(2), scale: +pr.scale.toFixed(2), x: Math.round(p0.x), y: Math.round(p0.y), w: Math.round(b.width), h: Math.round(b.height) };
      }
      const usable = st.inter.filter(i => st.usable(i)).map(i => { const tx = i.standX !== undefined ? i.standX : i.x; return { label: i.label, standX: Math.round(tx), dist: Math.round(Math.abs(me.x - tx)), range: i.range, prefer: !!(i.prefer && i.prefer()) }; }).sort((a, b) => a.dist - b.dist);
      const S = s.S ? Object.fromEntries(Object.entries(s.S).filter(([k, v]) => v === null || ['number', 'boolean', 'string'].includes(typeof v) || Array.isArray(v)).map(([k, v]) => [k, Array.isArray(v) ? v.slice(0, 8) : v])) : undefined;
      return { scene: s.sys.settings.key, me: { x: Math.round(me.x), y: Math.round(me.y), groundY: Math.round(st.groundAt(me.x)), moving: !!me.moving, once: me.once ? (me.once.name || true) : null, facing: me.facing, anim: me.anim }, camX: Math.round(st.cam.scrollX), region: st.region, locked: st.locked, modals: s._openModals || 0, talk: !!s.talkCtl, nearest: it ? it.label : null, prompt, usableNearby: usable.slice(0, 6), inVan: s.S ? s.S.inVan : undefined, inInterior: s.inInterior, S };
    },
    state() {
      return { url: location.href, loopRunning: !!(OTR.game.loop && OTR.game.loop.running), scenes: OTR.game.scene.getScenes(true).map(s => ({ key: s.sys.settings.key, running: s.running, finished: s.finished, modals: s._openModals || 0, paused: s.sys.isPaused() })), result: window.__qaResult ? window.__qaResult.result : null };
    }
  };
})()`;

async function inject() { await page.evaluate(HELPERS).catch(() => {}); }

/* ------------------------------------------------------------ turn-based running */
const sleepLoop = () => page.evaluate(() => { if (window.OTR && OTR.game && OTR.game.loop) OTR.game.loop.sleep(); }).catch(() => {});
const wakeLoop = () => page.evaluate(() => { if (window.OTR && OTR.game && OTR.game.loop) OTR.game.loop.wake(); }).catch(() => {});
async function acting(fn, after) {
  if (turnBased) await wakeLoop();
  try { await fn(); await wait(after === undefined ? 250 : after); } finally { if (turnBased) await sleepLoop(); }
}

async function openUrl(url, ms) {
  await wakeLoop();
  await page.goto(`http://127.0.0.1:${GAME}/${url.replace(/^\/+/, '')}`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.OTR && OTR.game && OTR.game.isBooted, { timeout: 30000 });
  await inject();
  await wait(ms === undefined ? 2500 : ms);
  if (turnBased) await sleepLoop();
}

async function summary() {
  const st = await page.evaluate(() => {
    const s = window.__pd ? __pd.state() : null;
    const g = window.__pd ? __pd.stage() : null;
    return { scenes: s ? s.scenes.map(x => x.key + (x.modals ? `(modals ${x.modals})` : '')).join(', ') : null, stage: g ? { me: g.me, nearest: g.nearest, prompt: g.prompt ? `${g.prompt.for} alpha ${g.prompt.alpha}` : null, inVan: g.inVan, locked: g.locked, modals: g.modals } : undefined };
  }).catch(e => ({ error: e.message }));
  return st;
}

/* ------------------------------------------------------------ commands */
const num = (q, k, d) => (q.has(k) ? Number(q.get(k)) : d);
/* Screenshots are half size (640 x 360) unless &full=1, which keeps them cheap to look at. &clip=x,y,w,h crops a
   region of the 1280 x 720 screen at full size, for reading small text. */
function clipOf(q) {
  if (q.has('clip')) {
    const [x, y, w, h] = q.get('clip').split(',').map(Number);
    return { x, y, width: w, height: h, scale: num(q, 'scale', 1) };
  }
  return { x: 0, y: 0, width: 1280, height: 720, scale: q.has('full') ? 1 : num(q, 'scale', 0.5) };
}
const COMMANDS = {
  async open(q) { await openUrl(q.get('url') || 'index.html?dev=1', num(q, 'ms', 2500)); return summary(); },
  async reload(q) { await wakeLoop(); await page.reload({ waitUntil: 'load' }); await page.waitForFunction(() => window.OTR && OTR.game && OTR.game.isBooted, { timeout: 30000 }); await inject(); await wait(num(q, 'ms', 2500)); if (turnBased) await sleepLoop(); return summary(); },
  async hold(q) { const k = q.get('key'); await acting(async () => { await page.keyboard.down(k); await wait(num(q, 'ms', 300)); await page.keyboard.up(k); }, num(q, 'after', 250)); return summary(); },
  async press(q) { await acting(() => page.keyboard.press(q.get('key')), num(q, 'after', 300)); return summary(); },
  async type(q) { await acting(async () => { for (const k of (q.get('keys') || '').split(',').filter(Boolean)) { await page.keyboard.press(k); await wait(num(q, 'gap', 120)); } }, num(q, 'after', 300)); return summary(); },
  async down(q) { await acting(() => page.keyboard.down(q.get('key')), num(q, 'after', 50)); return summary(); },
  async up(q) { await acting(() => page.keyboard.up(q.get('key')), num(q, 'after', 150)); return summary(); },
  async click(q) { await acting(() => page.mouse.click(num(q, 'x'), num(q, 'y')), num(q, 'after', 300)); return summary(); },
  async move(q) { await acting(() => page.mouse.move(num(q, 'x'), num(q, 'y'), { steps: num(q, 'steps', 6) }), num(q, 'after', 200)); return summary(); },
  async drag(q) {
    await acting(async () => {
      await page.mouse.move(num(q, 'x1'), num(q, 'y1')); await page.mouse.down(); await wait(80);
      await page.mouse.move(num(q, 'x2'), num(q, 'y2'), { steps: num(q, 'steps', 12) }); await wait(num(q, 'ms', 80)); await page.mouse.up();
    }, num(q, 'after', 300));
    return summary();
  },
  async clicktext(q) {
    await inject();
    const hit = await page.evaluate((src, flags, scene) => __pd.find(src, flags, scene), q.get('re'), q.get('flags') || 'i', q.get('scene') || null);
    if (!hit) return { ok: false, error: `nothing visible on screen matches /${q.get('re')}/` };
    await acting(() => page.mouse.click(hit.x + hit.w / 2, hit.y + hit.h / 2), num(q, 'after', 300));
    return Object.assign({ clicked: hit }, await summary());
  },
  async run(q) { await acting(() => wait(num(q, 'ms', 1000)), 0); return summary(); },
  async shot(q) {
    fs.mkdirSync(OUT, { recursive: true });
    const name = (q.get('name') || `shot-${Date.now()}`).replace(/[^\w.-]+/g, '_');
    if (q.has('ms')) await acting(() => wait(num(q, 'ms', 0)), 0);
    const file = path.join(OUT, name.endsWith('.png') ? name : name + '.png');
    await page.screenshot({ path: file, clip: clipOf(q) });
    return Object.assign({ file }, await summary());
  },
  async burst(q) {
    fs.mkdirSync(OUT, { recursive: true });
    const name = (q.get('name') || `burst-${Date.now()}`).replace(/[^\w.-]+/g, '_');
    const n = num(q, 'n', 6), every = num(q, 'every', 150), files = [], clip = clipOf(q);
    await acting(async () => {
      for (let i = 1; i <= n; i++) { const f = path.join(OUT, `${name}-${i}.png`); await page.screenshot({ path: f, clip }); files.push(f); await wait(every); }
    }, 0);
    return { files };
  },
  async texts(q) {
    await inject();
    const all = await page.evaluate(() => __pd.texts());
    const rx = q.has('match') ? new RegExp(q.get('match'), 'i') : null;
    return all.filter(t => (!rx || rx.test(t.text)) && (!q.has('scene') || t.scene === q.get('scene')))
      .map(t => `${t.x},${t.y} ${t.w}x${t.h} d${t.depth}${t.alpha < 1 ? ' a' + t.alpha : ''}${q.has('scene') ? '' : ' [' + t.scene + ']'}: ${t.text}`);
  },
  async stage(q) {
    await inject();
    const s = await page.evaluate(() => __pd.stage());
    if (s && !q.has('full')) delete s.S;             // the scene's whole state only on request (&full=1)
    return s;
  },
  async state() { await inject(); return page.evaluate(() => __pd.state()); },
  async log() { const out = logBuf; logBuf = []; return out; },
  async mode(q) { turnBased = q.get('turn') !== '0'; if (turnBased) await sleepLoop(); else await wakeLoop(); return { turnBased }; },
  async quit() { setTimeout(async () => { await browser.close().catch(() => {}); process.exit(0); }, 100); return { bye: true }; }
};

let queue = Promise.resolve();
const control = http.createServer((req, res) => {
  const u = new URL(req.url, `http://localhost:${CTL}`);
  const name = u.pathname.replace(/^\/+/, '');
  let body = '';
  req.on('data', c => { body += c; });
  req.on('end', () => {
    queue = queue.then(async () => {
      let out;
      try {
        if (name === 'eval') {
          if (turnBased && u.searchParams.get('wake') === '1') await wakeLoop();
          const expr = body || u.searchParams.get('js') || 'null';
          out = { ok: true, value: await page.evaluate(`(async () => { return (${expr}); })()`) };
          if (turnBased && u.searchParams.get('wake') === '1') await sleepLoop();
        } else if (COMMANDS[name]) {
          const r = await COMMANDS[name](u.searchParams);
          out = (r && r.ok === false) ? r : { ok: true, result: r };
        } else {
          out = { ok: false, error: `unknown command ${name}; try open, hold, press, click, clicktext, shot, burst, texts, stage, state, eval, log, run, quit` };
        }
      } catch (e) {
        out = { ok: false, error: e.message };
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(out) + '\n');
    });
  });
});

(async () => {
  const puppeteer = require(path.join(ROOT, 'test', 'node_modules', 'puppeteer-core'));
  await new Promise(r => gameServer.listen(GAME, '127.0.0.1', r));
  // QA_BROWSER names any Chrome/Chromium/Edge binary (Linux and cloud machines have none of the Windows paths)
  const exe = [process.env.QA_BROWSER, EDGE, CHROME, '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find(p => p && fs.existsSync(p));
  if (!exe) throw new Error('No Edge or Chrome found. Set QA_BROWSER to a Chrome/Chromium binary.');
  browser = await puppeteer.launch({
    executablePath: exe,
    headless: HEADFUL ? false : 'new',
    args: ['--autoplay-policy=no-user-gesture-required', '--ignore-gpu-blocklist', '--enable-gpu', '--window-size=1280,780']
      .concat(process.platform === 'win32' ? ['--use-angle=d3d11'] : ['--no-sandbox'])
      .concat(GPU === 'default' ? [] : ['--force_high_performance_gpu'])
  });
  page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  page.on('console', m => { if (['error', 'warning', 'warn'].includes(m.type())) logBuf.push(`[console.${m.type()}] ${m.text()}`); });
  page.on('pageerror', e => logBuf.push(`[pageerror] ${e.message}`));
  await openUrl(arg('--url', 'index.html?dev=1'), 2500);
  control.listen(CTL, '127.0.0.1', () => console.log(`playd ready: control http://localhost:${CTL}  game http://127.0.0.1:${GAME}  shots ${OUT}  ${turnBased ? 'turn-based' : 'real time'}`));
})().catch(e => { console.error(e); process.exit(1); });
