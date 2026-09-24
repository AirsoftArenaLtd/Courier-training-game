// A/B for PERF-1: put back the old OTR.tex.make (a default, GPU-backed 2D context) in the running page.
(() => {
  OTR.tex.make = function (scene, key, w, h, fn) {
    const tm = scene.textures;
    if (tm.exists(key)) return key;
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.ceil(w));
    canvas.height = Math.max(1, Math.ceil(h));
    const ctx = canvas.getContext('2d');
    fn(ctx, canvas.width, canvas.height);
    tm.addCanvas(key, canvas);
    return key;
  };
  return 'old tex.make installed';
})()
