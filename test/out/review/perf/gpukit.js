/*
 * gpukit: GPU timing with EXT_disjoint_timer_query (inject after perfkit).
 *   __gk.frame(ms)        -> GPU ms of Phaser's WebGL work per frame (clear .. last flush), averaged, plus rAF fps
 *   __gk.objects(frames)  -> GPU ms per top-level display object (each object flushed on its own), biggest first
 */
(() => {
  if (window.__gk) return 'gpukit already loaded';
  const g = OTR.game, r = g.renderer, gl = r.gl;
  const tq = gl.getExtension('EXT_disjoint_timer_query');
  if (!tq) return 'no EXT_disjoint_timer_query';
  const pending = [];     // { q, cb }
  const poll = () => {
    const disjoint = gl.getParameter(tq.GPU_DISJOINT_EXT);
    for (let i = pending.length - 1; i >= 0; i--) {
      const p = pending[i];
      if (tq.getQueryObjectEXT(p.q, tq.QUERY_RESULT_AVAILABLE_EXT)) {
        if (!disjoint) p.cb(tq.getQueryObjectEXT(p.q, tq.QUERY_RESULT_EXT) / 1e6);
        tq.deleteQueryEXT(p.q);
        pending.splice(i, 1);
      }
    }
  };
  let active = null;
  const begin = () => { const q = tq.createQueryEXT(); tq.beginQueryEXT(tq.TIME_ELAPSED_EXT, q); active = q; return q; };
  const end = (cb) => { tq.endQueryEXT(tq.TIME_ELAPSED_EXT); pending.push({ q: active, cb }); active = null; };
  const flushAll = () => { const p = r.pipelines.current; if (p && p.vertexCount > 0) p.flush(); };

  const F = { on: false, times: [] };
  const oPre = r.preRender;
  r.preRender = function () { if (F.on && !active) begin(); return oPre.apply(this, arguments); };
  g.events.on('postrender', () => {
    if (F.on && active) { flushAll(); end(ms => F.times.push(ms)); }
    poll();
  });

  const r2 = (x) => Math.round(x * 100) / 100;
  const pct = (arr, p) => { if (!arr.length) return 0; const a = arr.slice().sort((x, y) => x - y); return a[Math.min(a.length - 1, Math.floor(p * a.length))]; };
  const wait = (ms) => new Promise(res => setTimeout(res, ms));

  window.__gk = {
    async frame(ms) {
      ms = ms || 3000;
      await wait(300);
      F.times = []; F.on = true;
      let n = 0; const t0 = performance.now();
      await new Promise(res => { const tick = () => { n++; if (performance.now() - t0 < ms) requestAnimationFrame(tick); else res(); }; requestAnimationFrame(tick); });
      F.on = false;
      await wait(300);
      const t = F.times;
      return { fps: Math.round(n * 10000 / (performance.now() - 300 - t0)) / 10, gpuMs: r2(t.reduce((a, b) => a + b, 0) / (t.length || 1)), p50: r2(pct(t, 0.5)), p95: r2(pct(t, 0.95)), samples: t.length };
    },
    async objects(frames, opts) {
      opts = opts || {};
      frames = frames || 30;
      const rows = new Map();
      const wrapped = [];
      const label = (sc, o, i) => `${sc.sys.settings.key}#${i} ${o.type}${o.name ? ':' + o.name : ''} d${o.depth} ${o.texture && o.texture.key !== '__DEFAULT' ? o.texture.key : ''} blend${o.blendMode} a${(+o.alpha).toFixed(2)}${o.list ? ' kids' + o.list.length : ''}`;
      OTR.game.scene.getScenes(true).forEach(sc => {
        sc.children.list.forEach((o, i) => {
          if (!o.renderWebGL) return;
          const key = label(sc, o, i);
          let b = null; try { b = o.getBounds(); } catch (e) { }
          const row = { key, ms: 0, n: 0, area: b ? +(Math.min(b.width, 1280) * Math.min(b.height, 720) / 921600).toFixed(2) : null };
          rows.set(o, row);
          const orig = o.renderWebGL;
          o.renderWebGL = function (renderer, src, camera, parent) {
            if (!G.on || active) return orig.apply(this, arguments);
            flushAll(); begin();
            const res = orig.apply(this, arguments);
            flushAll();
            end(ms => { row.ms += ms; row.n++; });
            return res;
          };
          wrapped.push(o);
        });
      });
      const G = { on: true };
      let count = 0;
      await new Promise(res => { const tick = () => { if (++count < frames) requestAnimationFrame(tick); else res(); }; requestAnimationFrame(tick); });
      G.on = false;
      await wait(400);
      wrapped.forEach(o => { delete o.renderWebGL; });
      const out = [...rows.values()].filter(x => x.n > 0).map(x => ({ key: x.key, area: x.area, gpuMs: r2(x.ms / x.n) }));
      out.sort((a, b) => b.gpuMs - a.gpuMs);
      const total = r2(out.reduce((s, x) => s + x.gpuMs, 0));
      return { total, rows: out.slice(0, opts.top || 40) };
    }
  };
  return 'gpukit loaded';
})()
