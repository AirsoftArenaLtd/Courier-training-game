/*
 * perfkit: in-page frame profiler for the courier game (inject with playd /eval, POST the file body).
 *   __pk.measure(ms)        -> fps, frame-time percentiles, long frames, CPU update/render ms, GL counters per frame
 *   __pk.gpu(ms)            -> same, but calls gl.finish() after every render so the render phase includes GPU time
 *   __pk.renderer()         -> WebGL renderer string, context attributes
 * Counters are per rendered frame: draws (drawArrays/drawElements), flushes, blend changes, texture uploads
 * (texImage2D/texSubImage2D, with megapixels), text re-rasterisations, canvas-texture refreshes, fbo binds.
 */
(() => {
  if (window.__pk) return 'perfkit already loaded';
  const g = OTR.game, r = g.renderer, gl = r.gl;
  const C = { draws: 0, verts: 0, flush: 0, blend: 0, texUp: 0, texUpMP: 0, texSub: 0, bindTex: 0, fbo: 0, clear: 0, prog: 0, textUpd: 0, canvasRefresh: 0, bufData: 0, bufSubKB: 0, scissor: 0, stencil: 0 };
  const hook = (obj, name, pre) => {
    const orig = obj[name];
    if (!orig || orig.__pk) return;
    const f = function () { pre.apply(this, arguments); return orig.apply(this, arguments); };
    f.__pk = true; f.__orig = orig;
    obj[name] = f;
  };
  const srcPx = (a) => {
    if (a.length === 6) { const s = a[5]; return s ? (s.width || s.videoWidth || 0) * (s.height || s.videoHeight || 0) : 0; }
    if (a.length >= 9) return a[3] * a[4];
    return 0;
  };
  hook(gl, 'drawArrays', function (m, f, n) { C.draws++; C.verts += n; });
  hook(gl, 'drawElements', function (m, n) { C.draws++; C.verts += n; });
  hook(gl, 'texImage2D', function () { C.texUp++; C.texUpMP += srcPx(arguments) / 1e6; });
  hook(gl, 'texSubImage2D', function () { C.texSub++; C.texUpMP += srcPx(arguments.length === 7 ? [0, 0, 0, 0, 0, arguments[6]] : [0, 0, 0, arguments[4], arguments[5], 0, 0, 0, 0]) / 1e6; });
  hook(gl, 'bindTexture', function () { C.bindTex++; });
  hook(gl, 'bindFramebuffer', function () { C.fbo++; });
  hook(gl, 'clear', function () { C.clear++; });
  hook(gl, 'useProgram', function () { C.prog++; });
  hook(gl, 'bufferData', function () { C.bufData++; });
  hook(gl, 'bufferSubData', function (t, o, d) { C.bufSubKB += (d && d.byteLength || 0) / 1024; });
  hook(gl, 'scissor', function () { C.scissor++; });
  hook(gl, 'stencilFunc', function () { C.stencil++; });
  // blend changes that actually flush
  const sb = r.setBlendMode;
  r.setBlendMode = function (mode, force) { const ch = sb.call(this, mode, force); if (ch) C.blend++; return ch; };
  // pipeline flushes (any pipeline)
  Object.values(r.pipelines.pipelines.entries || {}).forEach(p => {
    if (p && p.flush && !p.flush.__pk) { const of = p.flush; p.flush = function () { if (this.vertexCount > 0) C.flush++; return of.apply(this, arguments); }; p.flush.__pk = true; }
  });
  // text + canvas texture refreshes
  const TP = Phaser.GameObjects.Text.prototype;
  if (!TP.updateText.__pk) { const ou = TP.updateText; TP.updateText = function () { const k = window.__pk; if (k) { k.C.textUpd++; const key = String(this.text).slice(0, 24); k.textWho[key] = (k.textWho[key] || 0) + 1; } return ou.apply(this, arguments); }; TP.updateText.__pk = true; }
  const CT = Phaser.Textures.CanvasTexture.prototype;
  if (!CT.refresh.__pk) { const orf = CT.refresh; CT.refresh = function () { const k = window.__pk; if (k) { k.C.canvasRefresh++; k.refreshWho[this.key] = (k.refreshWho[this.key] || 0) + 1; } return orf.apply(this, arguments); }; CT.refresh.__pk = true; }

  const S = { on: false, frames: [], t0: 0, tPreStep: 0, tPostStep: 0, tPreRender: 0, finish: false, snap: null };
  const snap = () => Object.assign({}, C);
  g.events.on('prestep', () => { if (!S.on) return; S.tPreStep = performance.now(); S.snap = snap(); });
  g.events.on('poststep', () => { if (!S.on) return; S.tPostStep = performance.now(); });
  g.events.on('prerender', () => { if (!S.on) return; S.tPreRender = performance.now(); });
  g.events.on('postrender', () => {
    if (!S.on || !S.snap) return;
    if (S.finish) gl.finish();
    const t = performance.now();
    const d = {};
    for (const k in C) d[k] = C[k] - S.snap[k];
    d.upd = S.tPostStep - S.tPreStep;
    d.ren = t - S.tPreRender;
    d.step = t - S.tPreStep;
    d.at = S.tPreStep;
    d.flushTex = r.textureFlush || 0;
    S.frames.push(d);
  });

  const pct = (arr, p) => { if (!arr.length) return 0; const a = arr.slice().sort((x, y) => x - y); return a[Math.min(a.length - 1, Math.floor(p * a.length))]; };
  const r1 = (x) => Math.round(x * 10) / 10;
  const r2 = (x) => Math.round(x * 100) / 100;

  window.__pk = {
    C, S, textWho: {}, refreshWho: {},
    renderer() {
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      return { renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER), attrs: gl.getContextAttributes(), maxTextures: r.maxTextures, timerQuery: !!(gl.getExtension('EXT_disjoint_timer_query')) };
    },
    /** measure for ms (after warm ms of warm-up). opts.finish: gl.finish after each render. */
    async measure(ms, opts) {
      opts = opts || {};
      ms = ms || 4000;
      const warm = opts.warm === undefined ? 400 : opts.warm;
      __pk.textWho = {}; __pk.refreshWho = {};
      await new Promise(res => setTimeout(res, warm));
      const raf = [];
      let heap0 = performance.memory ? performance.memory.usedJSHeapSize : 0, heapMax = heap0, heapDrops = 0, lastHeap = heap0;
      S.frames = []; S.finish = !!opts.finish; S.on = true;
      const t0 = performance.now();
      await new Promise(res => {
        const tick = (ts) => {
          raf.push(performance.now());
          if (performance.memory) { const h = performance.memory.usedJSHeapSize; if (h < lastHeap - 256 * 1024) heapDrops++; lastHeap = h; heapMax = Math.max(heapMax, h); }
          if (performance.now() - t0 < ms) requestAnimationFrame(tick); else res();
        };
        requestAnimationFrame(tick);
      });
      S.on = false; S.finish = false;
      const dur = raf[raf.length - 1] - raf[0];
      const iv = []; for (let i = 1; i < raf.length; i++) iv.push(raf[i] - raf[i - 1]);
      const F = S.frames, n = F.length || 1;
      const avg = (k) => r2(F.reduce((s, f) => s + f[k], 0) / n);
      const mx = (k) => r2(Math.max(0, ...F.map(f => f[k])));
      const out = {
        fps: r1((raf.length - 1) * 1000 / dur), gameFrames: F.length,
        ms: { avg: r2(dur / (raf.length - 1)), p50: r1(pct(iv, 0.5)), p95: r1(pct(iv, 0.95)), p99: r1(pct(iv, 0.99)), max: r1(Math.max(...iv)) },
        long: { over25: iv.filter(x => x > 25).length, over33: iv.filter(x => x > 33.4).length, over50: iv.filter(x => x > 50).length, over100: iv.filter(x => x > 100).length },
        cpu: { update: avg('upd'), updP95: r2(pct(F.map(f => f.upd), 0.95)), updMax: mx('upd'), render: avg('ren'), renP95: r2(pct(F.map(f => f.ren), 0.95)), renMax: mx('ren'), step: avg('step') },
        perFrame: { draws: avg('draws'), verts: avg('verts'), flush: avg('flush'), blend: avg('blend'), texUp: avg('texUp'), texSub: avg('texSub'), texUpMP: avg('texUpMP'), bindTex: avg('bindTex'), fbo: avg('fbo'), clear: avg('clear'), prog: avg('prog'), textUpd: avg('textUpd'), canvasRefresh: avg('canvasRefresh'), bufSubKB: avg('bufSubKB'), scissor: avg('scissor'), stencil: avg('stencil') },
        maxPerFrame: { draws: mx('draws'), texUp: mx('texUp'), texUpMP: mx('texUpMP'), textUpd: mx('textUpd') },
        heapMB: performance.memory ? { start: r1(heap0 / 1048576), max: r1(heapMax / 1048576), gcDrops: heapDrops } : null,
        textWho: Object.entries(__pk.textWho).sort((a, b) => b[1] - a[1]).slice(0, 6),
        refreshWho: Object.entries(__pk.refreshWho).sort((a, b) => b[1] - a[1]).slice(0, 6),
        scenes: OTR.game.scene.getScenes(true).map(s => s.sys.settings.key)
      };
      if (opts.frames) out.frames = F;
      return out;
    },
    /** display objects of every active scene, biggest first, with what they cost to draw */
    inventory() {
      const rows = [];
      OTR.game.scene.getScenes(true).forEach(sc => {
        const walk = (o, depth) => {
          if (!o) return;
          let w = 0, h = 0;
          try { const b = o.getBounds(); w = b.width; h = b.height; } catch (e) { }
          const onScreen = o.visible !== false && o.alpha > 0;
          const tex = o.texture && o.texture.key !== '__DEFAULT' ? o.texture.key : '';
          rows.push({ scene: sc.sys.settings.key, type: o.type, name: o.name || '', depth: o.depth, vis: onScreen, alpha: +(o.alpha || 0).toFixed(2), blend: o.blendMode, sf: o.scrollFactorX, w: Math.round(w), h: Math.round(h), area: +(Math.min(w, 1280) * Math.min(h, 720) / (1280 * 720)).toFixed(2), tex, kids: o.list ? o.list.length : 0 });
          if (o.list && depth < 1) o.list.forEach(k => walk(k, depth + 1));
        };
        sc.children.list.forEach(o => walk(o, 0));
      });
      return rows;
    }
  };
  return 'perfkit loaded: ' + JSON.stringify(__pk.renderer());
})()
