(async () => {
  const a = await __pk.measure(window.__mms || 4000);
  const g = await __gk.frame(2500);
  return { fps: a.fps, p50: a.ms.p50, p95: a.ms.p95, max: a.ms.max, over33: a.long.over33, over50: a.long.over50, cpuUpd: a.cpu.update, cpuRen: a.cpu.render, updMax: a.cpu.updMax, draws: a.perFrame.draws, flush: a.perFrame.flush, blend: a.perFrame.blend, texUp: a.perFrame.texUp, texUpMP: a.perFrame.texUpMP, textUpd: a.perFrame.textUpd, canvasRefresh: a.perFrame.canvasRefresh, gcDrops: a.heapMB && a.heapMB.gcDrops, textWho: a.textWho.slice(0, 3), refreshWho: a.refreshWho.slice(0, 3), gpuMs: g.gpuMs, scenes: a.scenes.join(',') };
})()
