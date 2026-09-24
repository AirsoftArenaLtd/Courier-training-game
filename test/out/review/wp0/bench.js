/*
 * bench: uncapped frame cost. The headless browser caps rAF at ~125 fps, and on this Intel GPU (AC power) every
 * scene now sits at that cap, so fps cannot show a difference. This pauses the game loop and renders the current
 * frame n times back to back, each followed by a 1-pixel readPixels (forces the GPU to finish the frame and, with
 * MSAA on, to resolve the multisampled buffer, as presenting does). ms per frame is GPU + CPU render cost, uncapped.
 *   __bench(60)  -> { ms, fpsEq, runs }
 */
(() => {
  window.__bench = async function (n) {
    n = n || 60;
    const g = OTR.game, r = g.renderer, gl = r.gl, px = new Uint8Array(4);
    const one = () => { r.preRender(); g.scene.render(r); r.postRender(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); };
    const wasRunning = g.loop.running;
    if (wasRunning) g.loop.sleep();
    try {
      for (let i = 0; i < 20; i++) one();
      const runs = [];
      for (let b = 0; b < 7; b++) {
        const t0 = performance.now();
        for (let i = 0; i < n; i++) one();
        runs.push((performance.now() - t0) / n);
        await new Promise(res => setTimeout(res, 0));
      }
      runs.sort((a, b) => a - b);
      const med = runs[3];
      return { ms: +med.toFixed(2), fpsEq: Math.round(1000 / med), runs: runs.map(t => +t.toFixed(2)) };
    } finally {
      if (wasRunning) g.loop.wake();
    }
  };
  return 'bench loaded';
})()
