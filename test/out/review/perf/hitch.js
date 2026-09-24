(() => {
  window.__hk = window.__hk || { log: [] };
  const H = window.__hk;
  if (!OTR.tex.make.__hk) {
    const om = OTR.tex.make;
    OTR.tex.make = function (scene, key, w, h, fn) {
      const t = performance.now(); const had = scene.textures.exists(key);
      const r = om.apply(this, arguments);
      if (!had) H.log.push({ at: t, what: 'tex.make ' + key + ' ' + Math.ceil(w) + 'x' + Math.ceil(h), ms: +(performance.now() - t).toFixed(2) });
      return r;
    };
    OTR.tex.make.__hk = true;
  }
  H.frames = async (ms, thr) => {
    H.log = [];
    const a = await __pk.measure(ms || 4000, { frames: true, warm: 0 });
    const long = a.frames.filter(f => f.upd > (thr || 12) || f.ren > (thr || 12)).map(f => ({ at: Math.round(f.at), upd: +f.upd.toFixed(1), ren: +f.ren.toFixed(1), texUp: f.texUp, texUpMP: +f.texUpMP.toFixed(2), textUpd: f.textUpd, made: H.log.filter(l => l.at >= f.at && l.at <= f.at + f.step).map(l => l.what + ' ' + l.ms + 'ms').slice(0, 6) }));
    return { fps: a.fps, long, madeTotal: H.log.length, madeMs: +H.log.reduce((s, l) => s + l.ms, 0).toFixed(1) };
  };
  return 'hitch loaded';
})()
