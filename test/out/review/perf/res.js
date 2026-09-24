/*
 * res: prototype a lower internal render resolution. The drawing buffer becomes W*f x H*f, the projection stays
 * 1280x720 (so the whole game is drawn scaled down), and the canvas keeps its CSS size (the browser upscales).
 *   __res(0.75)  -> 960x540;  __res(1) -> back to native.
 */
(() => {
  window.__res = function (f) {
    const g = OTR.game, r = g.renderer, W = OTR.W, H = OTR.H;
    const w = Math.round(W * f), h = Math.round(H * f);
    if (!r.__resOrig) r.__resOrig = r.resetProjectionMatrix;
    r.resetProjectionMatrix = function () { return this.setProjectionMatrix(W, H); };
    const css = [g.canvas.style.width, g.canvas.style.height];
    g.canvas.width = w; g.canvas.height = h;
    r.resize(w, h);
    g.canvas.style.width = css[0]; g.canvas.style.height = css[1];
    r.projectionWidth = 0; r.resetProjectionMatrix();
    return { buffer: [g.canvas.width, g.canvas.height], css, glBuffer: [r.gl.drawingBufferWidth, r.gl.drawingBufferHeight] };
  };
  return 'res loaded';
})()
