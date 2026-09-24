(async () => {
  let last = performance.memory.usedJSHeapSize, grow = 0, gcs = 0; const t0 = performance.now();
  await new Promise(res => { const f = () => { const h = performance.memory.usedJSHeapSize; if (h >= last) grow += h - last; else gcs++; last = h; if (performance.now() - t0 < 3000) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
  return { allocMBperSec: +(grow / 1048576 / 3).toFixed(2), gcs, scenes: OTR.game.scene.getScenes(true).map(s => s.sys.settings.key).join(',') };
})()
