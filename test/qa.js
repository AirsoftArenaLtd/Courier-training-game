#!/usr/bin/env node
/*
 * QA suite for On The Route.
 *
 *   node test/qa.js                     every pass, every scenario
 *   node test/qa.js --only m6-find      one scenario (repeatable, comma separated)
 *   node test/qa.js --pass boot,layout  just those passes
 *   node test/qa.js --shots             also write screenshots to test/out/
 *   node test/qa.js --headful           watch it run
 *
 * Passes
 *   boot    loads the scenario, dismisses the intro, checks the expected scene is live and nothing threw
 *   layout  audits the live display list for off-canvas UI, text overflowing its wrap box and dead hit areas
 *   play    randomised but plausible input for a few seconds, checking nothing throws and the scene survives
 *   golden  runs test/paths/<id>.js (a scripted playthrough) and checks the scenario completes and scores
 *
 * It serves the project itself, so nothing needs to be running first. Exit code is non-zero if anything failed.
 * It runs on the high-performance GPU and prints which one; QA_GPU=default lets the OS choose instead.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(__dirname, 'out');
const PORT = Number(process.env.QA_PORT || 8123);

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const LINUX_BROWSERS = ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser'];

const SCENARIOS = [
  { id: 'm1-pretrip', scene: 'PreTripScene' },
  { id: 'm1-route', scene: 'RoutePlannerScene' },
  { id: 'm1-driving', scene: 'DrivingScene' },
  { id: 'm1-spot', scene: 'HazardScene' },
  { id: 'm2-sort', scene: 'SortingScene' },
  { id: 'm2-lift', scene: 'LiftingScene' },
  { id: 'm2-labels', scene: 'LabelScene' },
  { id: 'm3-missing', scene: 'DialogueScene' },
  { id: 'm3-signature', scene: 'DialogueScene' },
  { id: 'm3-twostops', scene: 'DialogueScene' },
  { id: 'm3-doorsteps', scene: 'StopScene' },
  { id: 'm4-address', scene: 'DialogueScene' },
  { id: 'm4-recover', scene: 'DialogueScene' },
  { id: 'm4-damaged', scene: 'DialogueScene' },
  { id: 'm4-storm', scene: 'DialogueScene' },
  { id: 'm5-pod', scene: 'StopScene' },
  { id: 'm5-exceptions', scene: 'StopScene' },
  { id: 'm5-adult', scene: 'StopScene' },
  { id: 'm6-load', scene: 'LoadingScene' },
  { id: 'm6-find', scene: 'LoadingScene' },
  { id: 'm7-business', scene: 'PickupScene' },
  { id: 'm7-intl', scene: 'PickupScene' },
  { id: 'm7-dg', scene: 'PickupScene' },
  { id: 'm8-steps', scene: 'StopScene' },
  { id: 'm8-dog', scene: 'StopScene' },
  { id: 'm8-heat', scene: 'StopScene' },
  { id: 'm8-incident', scene: 'DialogueScene' },
  // flows start from the title screen with a fresh profile rather than from one scenario; they only run the
  // golden pass, and their path audits the layout at the moments it cares about
  { id: 'route-day', scene: 'HubScene', flow: 'index.html?dev=1' },
  { id: 'route-legs', scene: 'TownDriveScene', flow: 'index.html?dev=1' },
  { id: 'town-traffic', scene: 'TownDriveScene', flow: 'index.html?dev=1' },
  { id: 'hub-briefs', scene: 'HubScene', flow: 'index.html?dev=1' },
  { id: 'academy-screens', scene: 'HubScene', flow: 'index.html?dev=1' },
  { id: 'drive-review', scene: 'HubScene', flow: 'index.html?dev=1' },
  { id: 'certificate', scene: 'HubScene', flow: 'index.html?dev=1' },
  { id: 'van-traffic', scene: 'TownDriveScene', flow: 'index.html?dev=1' },
  { id: 'drive-fuzz', scene: 'TownDriveScene', flow: 'index.html?dev=1' }
];

const FPS_FLOOR = Number(process.env.QA_FPS_FLOOR || 100);
const A11Y = (process.env.QA_A11Y || '').split(',').filter(Boolean);   // e.g. large,colour (Settings → Accessibility)
// QA_LANG=es plays every pass in that language (the layout audit then checks the translated text fits)
const LANG_Q = process.env.QA_LANG ? `&lang=${process.env.QA_LANG}` : '';
// On a laptop with two GPUs, Windows may hand a headless browser either one from day to day, and the frame rate
// differs threefold between them. The suite asks for the high-performance GPU so the floor always measures the same
// hardware; QA_GPU=default leaves the choice to the OS (on most laptops, the integrated GPU a trainee may have).
const GPU = (process.env.QA_GPU || 'fast').toLowerCase();
const wait = (ms) => new Promise(r => setTimeout(r, ms));

/* ------------------------------------------------------------------ args */
const argv = process.argv.slice(2);
const argVal = (name) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : null;
};
const only = (argVal('--only') || '').split(',').filter(Boolean);
const passes = (argVal('--pass') || 'boot,layout,play,golden').split(',').filter(Boolean);
const shots = argv.includes('--shots');
const headful = argv.includes('--headful');

/* ---------------------------------------------------------------- server */
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json' };
function serve() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
      const file = path.join(ROOT, rel);
      if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404); res.end('not found'); return;
      }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(PORT, () => resolve(server));
  });
}

/* ------------------------------------------------------- layout auditing */
/* Runs inside the page. Returns a list of layout complaints. */
function auditLayout() {
  const W = 1280, H = 720, TOL = 4;
  const out = [];
  const scenes = OTR.game.scene.getScenes(true);
  const seen = new Set();

  const describe = (o) => {
    const t = o.type || 'Object';
    const txt = o.text !== undefined ? JSON.stringify(String(o.text).slice(0, 40)) : '';
    return `${t}${o.name ? '#' + o.name : ''}${txt ? ' ' + txt : ''}`;
  };

  const walk = (obj, scene, depth) => {
    if (!obj || seen.has(obj) || depth > 12) return;
    seen.add(obj);
    if (obj.visible === false || (obj.alpha !== undefined && obj.alpha <= 0.05)) return;

    // Things that are meant to bleed past the edges: backdrops, scrims, weather, scrolling tiles, and light
    // (additive glows such as the sun's glare in a heat wave).
    const bleeds = obj.type === 'ParticleEmitter' || obj.type === 'TileSprite' || obj.type === 'Graphics' ||
      obj.blendMode === Phaser.BlendModes.ADD;
    let covers = false;
    if (!bleeds && typeof obj.getBounds === 'function' && obj.type !== 'Container') {
      try {
        const bb = obj.getBounds();
        covers = bb.width >= W * 0.9 && bb.height >= H * 0.9;
      } catch (e) { covers = false; }
    }
    const skipBounds = bleeds || covers;

    // Text that renders wider than the wrap box it was given
    if (obj.type === 'Text' && obj.style && obj.style.wordWrapWidth) {
      if (obj.width > obj.style.wordWrapWidth + 2) {
        out.push({ kind: 'text-overflow', scene: scene.sys.settings.key, what: describe(obj), detail: `width ${Math.round(obj.width)} > wrap ${Math.round(obj.style.wordWrapWidth)}` });
      }
    }

    // UI that is pinned to the camera (scrollFactor 0) must sit inside the canvas
    const pinned = obj.scrollFactorX === 0 && obj.scrollFactorY === 0;
    if (pinned && !skipBounds && typeof obj.getBounds === 'function' && obj.type !== 'Container') {
      let b = null;
      try { b = obj.getBounds(); } catch (e) { b = null; }
      // panel and button textures carry a transparent shadow margin (OTR.tex.M); only the inked part counts
      const key = obj.texture && obj.texture.key;
      const tol = TOL + (key && /^(panel|btn)_/.test(key) ? 24 : 0);
      if (b && b.width > 0 && b.height > 0 && b.width < 4000 && b.height < 4000) {
        const off = [];
        if (b.x < -tol) off.push(`left ${Math.round(b.x)}`);
        if (b.y < -tol) off.push(`top ${Math.round(b.y)}`);
        if (b.right > W + tol) off.push(`right ${Math.round(b.right)}`);
        if (b.bottom > H + tol) off.push(`bottom ${Math.round(b.bottom)}`);
        if (off.length) {
          out.push({ kind: 'off-canvas', scene: scene.sys.settings.key, what: describe(obj), detail: `${off.join(', ')} (box ${Math.round(b.width)}x${Math.round(b.height)} at ${Math.round(b.x)},${Math.round(b.y)}${obj.texture && obj.texture.key ? ' tex=' + obj.texture.key : ''})` });
        }
      }
    }

    // Interactive objects the player can never reach
    if (obj.input && obj.input.enabled && !skipBounds && typeof obj.getBounds === 'function' && pinned) {
      let b = null;
      try { b = obj.getBounds(); } catch (e) { b = null; }
      if (b && (b.right < 0 || b.bottom < 0 || b.x > W || b.y > H)) {
        out.push({ kind: 'unreachable-hit', scene: scene.sys.settings.key, what: describe(obj), detail: `bounds ${Math.round(b.x)},${Math.round(b.y)}` });
      }
    }

    // panels and buttons, and the text drawn on them, for the check below
    const key = obj.texture && obj.texture.key;
    if (obj.type === 'Image' && key && /^(panel|btn)_/.test(key)) boxes.push({ obj, scene });
    if (obj.type === 'Text' && String(obj.text).trim()) {
      texts.push({ obj, scene });
      // shrunk to fit its box (the fit option) so far that it can no longer be read: the words need to be shorter
      const sc = Math.min(Math.abs(obj.scaleX), Math.abs(obj.scaleY)), px = parseFloat(obj.style && obj.style.fontSize) || 0;
      if (sc < 0.999 && px && px * sc < 9.5) out.push({ kind: 'text-squeezed', scene: scene.sys.settings.key, what: describe(obj), detail: `${px}px shrunk to ${(px * sc).toFixed(1)}px` });
    }

    const kids = obj.list || (obj.getChildren ? obj.getChildren() : null);
    if (kids) kids.forEach(k => walk(k, scene, depth + 1));
  };
  const boxes = [], texts = [];

  scenes.forEach(s => (s.children && s.children.list ? s.children.list : []).forEach(o => walk(o, s, 0)));

  // One-line text that runs out of the panel or button it sits on (a long word in a fixed box). The box is the
  // smallest one in the same container under the text's middle; its texture carries a transparent shadow margin (OTR.tex.M) that is not
  // part of the panel.
  const M = (OTR.tex && OTR.tex.M) || 24;
  const inner = (o) => { const b = o.getBounds(), mx = M * Math.abs(o.scaleX || 1), my = M * Math.abs(o.scaleY || 1); return { x: b.x + mx, y: b.y + my, right: b.right - mx, bottom: b.bottom - my }; };
  texts.forEach(({ obj, scene }) => {
    let t; try { t = obj.getBounds(); } catch (e) { return; }
    if (!t || t.width <= 0) return;
    const cx = t.x + t.width / 2, cy = t.y + t.height / 2;
    let best = null, area = Infinity;
    boxes.forEach(({ obj: p, scene: ps }) => {
      if (ps !== scene || (p.parentContainer || null) !== (obj.parentContainer || null)) return;   // its own layer, not a modal over it
      let b; try { b = inner(p); } catch (e) { return; }
      if (cx < b.x || cx > b.right || cy < b.y || cy > b.bottom) return;
      const a = (b.right - b.x) * (b.bottom - b.y);
      if (a > 0 && a < area) { area = a; best = b; }
    });
    if (!best) return;
    const over = Math.max(best.x - t.x, t.right - best.right);
    if (over > TOL) out.push({ kind: 'text-outside-box', scene: scene.sys.settings.key, what: describe(obj), detail: `${Math.round(over)}px past its box (text ${Math.round(t.x)}–${Math.round(t.right)}, box ${Math.round(best.x)}–${Math.round(best.right)})` });
  });
  return out;
}

/* Scenario result bookkeeping shared by every pass. */
function newRow(id) {
  return { id, boot: null, layout: [], play: null, golden: null, fps: 0, errors: [] };
}

async function newPage(browser, row) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  page.on('pageerror', e => row.errors.push('[pageerror] ' + String(e.message || e).split('\n')[0].slice(0, 180)));
  // QA_A11Y=large,colour: every run with those accessibility settings on, set in the save as it loads
  if (A11Y.length) {
    await page.evaluateOnNewDocument((on) => {
      const O = window.OTR = window.OTR || {};
      let save;
      Object.defineProperty(O, 'save', { configurable: true, get: () => save, set: (v) => {
        save = v;
        const load = v.load;
        v.load = function () {
          const r = load.apply(this, arguments);
          this.data.settings.a11y = Object.assign({ keys: {}, large: false, colour: false, narrate: false }, this.data.settings.a11y);
          on.forEach(k => { this.data.settings.a11y[k] = true; });
          return r;
        };
      } });
    }, A11Y);
  }
  // errors, and the warnings the game raises for broken content: a failed content check ([OTR data]), a
  // conversation or stop pointing at a node, act or situation that does not exist, an unknown scenario id
  const FAULT = /^\[(OTR data|talk|stop)\]|Unknown scenario/;
  page.on('console', m => {
    const type = m.type(), text = m.text();
    if (type === 'error') row.errors.push('[console] ' + text.slice(0, 180));
    else if ((type === 'warn' || type === 'warning') && FAULT.test(text)) row.errors.push('[content] ' + text.slice(0, 180));
  });
  return page;
}

const realErrors = (list) => [...new Set(list)].filter(e => !/404|Tracking Prevention|favicon|net::ERR/.test(e));

async function openScenario(page, id) {
  await page.goto(`http://localhost:${PORT}/index.html?scenario=${id}&dev=1${LANG_Q}`, { waitUntil: 'load' });
  await wait(1700);
  await page.keyboard.press('Enter');   // intro card
  await wait(1100);
}

async function liveScene(page, measureFps) {
  const st = await page.evaluate(() => {
    const s = OTR.game.scene.getScenes(true).filter(x => x.sys.settings.key !== 'PauseScene').pop();
    return { key: s ? s.sys.settings.key : null, finished: !!(s && s.finished) };
  }).catch(e => ({ key: 'EVAL-FAIL: ' + e.message, finished: false }));
  st.fps = 0;
  if (measureFps) {
    st.fps = await page.evaluate(() => new Promise(res => {
      let n = 0;
      const t0 = performance.now();
      const tick = () => {
        n++;
        const dt = performance.now() - t0;
        if (dt < 1000) requestAnimationFrame(tick); else res(Math.round(n * 1000 / dt));
      };
      requestAnimationFrame(tick);
    })).catch(() => 0);
  }
  return st;
}

/* ----------------------------------------------------------------- passes */
async function passBoot(page, sc, row) {
  await openScenario(page, sc.id);
  await wait(700);                     // let the scene settle before judging frame rate
  const st = await liveScene(page, true);
  row.fps = st.fps;
  if (st.key !== sc.scene && st.key !== 'ResultsScene') {
    row.boot = `expected ${sc.scene}, got ${st.key}`;
  } else if (st.fps < FPS_FLOOR) {
    row.boot = `fps ${st.fps} below floor ${FPS_FLOOR}`;
  } else {
    row.boot = 'ok';
  }
  if (shots) await page.screenshot({ path: path.join(OUT, `${sc.id}-boot.png`) });
}

async function passLayout(page, sc, row) {
  const found = await page.evaluate(`(${auditLayout.toString()})()`).catch(e => [{ kind: 'audit-failed', detail: e.message }]);
  row.layout = found;
}

const PLAY_KEYS = ['KeyA', 'KeyD', 'KeyW', 'KeyS', 'Space', 'KeyE', 'Tab', 'KeyG', 'KeyB', 'KeyL', 'KeyP',
  'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Enter'];

async function passPlay(page, sc, row, seconds) {
  let seed = 20260918;
  const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  const t0 = Date.now();
  while (Date.now() - t0 < (seconds || 12) * 1000) {
    if (rnd() < 0.55) {
      await page.mouse.move(40 + Math.floor(rnd() * 1200), 90 + Math.floor(rnd() * 600));
      await page.mouse.down(); await wait(40); await page.mouse.up();
    } else {
      const k = PLAY_KEYS[Math.floor(rnd() * PLAY_KEYS.length)];
      await page.keyboard.down(k); await wait(110 + Math.floor(rnd() * 380)); await page.keyboard.up(k);
    }
    await wait(50);
  }
  const st = await liveScene(page, true);
  row.play = st.key ? 'ok' : 'scene lost';
  if (st.fps && st.fps < row.fps) row.fps = st.fps;
  if (shots) await page.screenshot({ path: path.join(OUT, `${sc.id}-play.png`) });
}

async function passGolden(page, sc, row) {
  const file = path.join(__dirname, 'paths', sc.id + '.js');
  if (!fs.existsSync(file)) { row.golden = 'no script'; return; }
  const script = require(file);
  const ctx = {
    wait,
    snap: (name) => page.screenshot({ path: path.join(OUT, `${sc.id}-${name}.png`) }),
    scene: (expr) => page.evaluate(`(() => { const s = OTR.game.scene.getScene('${sc.scene}'); return ${expr}; })()`),
    eval: (expr) => page.evaluate(expr),
    until: async (expr, ms) => {
      const t0 = Date.now();
      while (Date.now() - t0 < (ms || 30000)) {
        if (await page.evaluate(expr).catch(() => false)) return true;
        await wait(200);
      }
      return false;
    },
    /** Reload the page (the save survives) and hook the result recorder again. */
    reload: async () => {
      await page.reload({ waitUntil: 'load' });
      await wait(1500);
      await page.evaluate(HOOK);
    },
    /** Audit the layout of whatever is on screen now; problems are reported against this scenario. */
    audit: async (label) => {
      const found = await page.evaluate(`(${auditLayout.toString()})()`).catch(e => [{ kind: 'audit-failed', detail: e.message }]);
      found.forEach(f => row.layout.push(Object.assign({}, f, { what: `(${label}) ${f.what || ''}` })));
      return found;
    }
  };
  try {
    await script(page, ctx);
  } catch (e) {
    row.golden = 'script error: ' + e.message;
    return;
  }
  if (sc.flow) { row.golden = 'ok'; return; }
  // the scenario must have reported a result, and that result must score every category it declares
  const verdict = await page.evaluate(`(() => {
    const r = window.__qaResult;
    if (!r) return 'never completed';
    const sc = OTR.registry.get(${JSON.stringify(sc.id)});
    const missing = sc.categories.filter(c => !(r.result.ratios && typeof r.result.ratios[c] === 'number'));
    if (missing.length) return 'ratios missing for ' + missing.join(',');
    const bad = Object.keys(r.result.ratios).filter(c => !(r.result.ratios[c] >= 0 && r.result.ratios[c] <= 1));
    if (bad.length) return 'ratio out of range: ' + bad.join(',');
    const stars = Object.keys(r.stars).filter(c => !(r.stars[c] >= 0 && r.stars[c] <= 3));
    if (stars.length) return 'stars out of range: ' + stars.join(',');
    // a careful run tests every category it declares and makes no critical mistake
    if (r.verdict && r.verdict.untested.length) return 'categories never tested: ' + r.verdict.untested.join(',');
    if (r.verdict && r.verdict.criticals.length) return 'critical mistake: ' + r.verdict.criticals.map(c => c.label).join('; ');
    return 'ok';
  })()`).catch(e => 'verdict failed: ' + e.message);
  row.golden = verdict;
}

/* The golden pass needs to see the result the scenario reported, so record it as it goes past. */
const HOOK = `(() => {
  const orig = OTR.flow.complete.bind(OTR.flow);
  OTR.flow.complete = (scene, id, result) => {
    OTR.flow.last = null;
    const out = orig(scene, id, result);
    // the stars and verdict the results screen shows (critical caps, untested categories); a route-day phase that
    // the shift takes over never reaches them, so fall back to the plain ratios there
    const last = OTR.flow.last && OTR.flow.last.id === id ? OTR.flow.last : null;
    const sc = OTR.registry.get(id) || { categories: [] };
    const stars = last ? last.stars : {};
    if (!last) sc.categories.forEach(c => { stars[c] = OTR.scoring.stars(OTR.util.clamp01((result.ratios && result.ratios[c]) || 0)); });
    window.__qaResult = { id, result, stars, verdict: last ? last.verdict : null };
    return out;
  };
})()`;

/* ------------------------------------------------------------------ main */
(async () => {
  let puppeteer;
  try {
    puppeteer = require('puppeteer-core');
  } catch (e) {
    console.error('puppeteer-core is missing. Run:  cd test && npm install');
    process.exit(2);
  }
  // QA_BROWSER names any Chrome/Chromium/Edge binary (Linux and cloud machines have none of the Windows paths)
  const exe = [process.env.QA_BROWSER, EDGE, CHROME, ...LINUX_BROWSERS].find(p => p && fs.existsSync(p));
  if (!exe) { console.error('No Edge or Chrome found for headless testing. Set QA_BROWSER to a Chrome/Chromium binary.'); process.exit(2); }

  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
  const server = await serve();
  const browser = await puppeteer.launch({
    executablePath: exe,
    headless: headful ? false : 'new',
    // d3d11 is the fast GPU path on Windows; elsewhere SwiftShader gives software WebGL (without it a machine with no
    // GPU has no WebGL at all and Phaser silently falls back to its Canvas renderer, which is not what ships)
    args: ['--autoplay-policy=no-user-gesture-required', '--ignore-gpu-blocklist', '--enable-gpu', '--window-size=1280,780']
      .concat(process.platform === 'win32' ? ['--use-angle=d3d11'] : ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
      .concat(GPU === 'default' ? [] : ['--force_high_performance_gpu'])
  });
  // say which GPU the frame rates below were measured on
  const probe = await browser.newPage();
  const gpuName = await probe.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl');
    if (!gl) return 'no WebGL';
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
  }).catch(e => 'unknown (' + e.message + ')');
  await probe.close();
  console.log(`GPU: ${gpuName}${GPU === 'default' ? '  (QA_GPU=default: the OS\'s choice)' : ''}\n`);

  const list = SCENARIOS.filter(s => !only.length || only.includes(s.id));
  const rows = [];
  for (const sc of list) {
    const row = newRow(sc.id);
    const page = await newPage(browser, row);
    try {
      if (!sc.flow && (passes.includes('boot') || passes.includes('layout') || passes.includes('play'))) {
        await passBoot(page, sc, row);
        if (passes.includes('layout')) await passLayout(page, sc, row);
        if (passes.includes('play')) await passPlay(page, sc, row, 12);
      }
      if (passes.includes('golden')) {
        const file = path.join(__dirname, 'paths', sc.id + '.js');
        if (fs.existsSync(file)) {
          await page.goto(`http://localhost:${PORT}/${sc.flow || `index.html?scenario=${sc.id}&dev=1`}${LANG_Q}`, { waitUntil: 'load' });
          await wait(1500);
          await page.evaluate(HOOK);
          await passGolden(page, sc, row);
        } else {
          row.golden = 'no script';
        }
      }
    } catch (e) {
      row.errors.push('[harness] ' + e.message);
    }
    // a page that has died takes its close with it; that is a failure of this scenario, not of the run, and the
    // scenarios after it still have to be tested
    await page.close().catch(e => row.errors.push('[harness] the page did not survive: ' + e.message));
    row.errors = realErrors(row.errors);
    rows.push(row);
    report(row);
  }

  console.log('\n================ summary ================');
  const bad = rows.filter(r => r.errors.length || (r.boot && r.boot !== 'ok') || r.layout.length ||
    (r.golden && r.golden !== 'ok' && r.golden !== 'no script'));
  rows.forEach(r => {
    const flags = [];
    if (r.errors.length) flags.push(`${r.errors.length} error(s)`);
    if (r.boot && r.boot !== 'ok') flags.push('boot');
    if (r.layout.length) flags.push(`${r.layout.length} layout`);
    if (r.golden && r.golden !== 'ok' && r.golden !== 'no script') flags.push('golden');
    console.log(`  ${flags.length ? 'FAIL' : 'pass'}  ${r.id.padEnd(14)} fps=${String(r.fps).padStart(3)}  ${flags.join(' · ') || (r.golden === 'no script' ? '(no golden path yet)' : '')}`);
  });
  console.log(`\n${rows.length - bad.length}/${rows.length} scenarios clean`);

  await browser.close();
  server.close();
  process.exit(bad.length ? 1 : 0);
})();

function report(r) {
  const flags = [];
  if (r.errors.length) flags.push('ERRORS');
  if (r.boot && r.boot !== 'ok') flags.push('BOOT');
  if (r.layout.length) flags.push('LAYOUT');
  if (r.golden && r.golden !== 'ok' && r.golden !== 'no script') flags.push('GOLDEN');
  console.log(`${flags.length ? 'FAIL' : 'ok  '} ${r.id.padEnd(14)} fps=${String(r.fps).padStart(3)} boot=${r.boot} golden=${r.golden}`);
  r.errors.slice(0, 4).forEach(e => console.log('        ' + e));
  r.layout.slice(0, 8).forEach(l => console.log(`        [${l.kind}] ${l.scene || ''} ${l.what || ''} — ${l.detail || ''}`));
}
