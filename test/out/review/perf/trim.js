/* trim: make the __BASE frame of a canvas texture draw only its non-transparent bounding box (a trimmed frame, as
 * atlases do), so images keep their size/origin/position but the transparent margin is no longer filled. */
(() => {
  window.__trim = function (re) {
    const tm = OTR.game.textures, out = [];
    tm.getTextureKeys().filter(k => new RegExp(re).test(k)).forEach(k => {
      const t = tm.get(k), src = t.getSourceImage(), W = src.width, H = src.height;
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(src, 0, 0);
      const d = x.getImageData(0, 0, W, H).data;
      let x0 = W, y0 = H, x1 = -1, y1 = -1;
      for (let i = 3; i < d.length; i += 4) if (d[i] > 0) { const p = i >> 2, px = p % W, py = (p / W) | 0; if (px < x0) x0 = px; if (px > x1) x1 = px; if (py < y0) y0 = py; if (py > y1) y1 = py; }
      if (x1 < 0) return;
      const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
      const f = t.get();
      f.setSize(bw, bh, x0, y0);
      f.setTrim(W, H, x0, y0, bw, bh);
      out.push(k + ' ' + W + 'x' + H + ' -> ' + bw + 'x' + bh + '@' + x0 + ',' + y0);
    });
    // refresh game objects that cached their frame size
    OTR.game.scene.getScenes(true).forEach(s => s.children.list.forEach(o => { if (o.frame && o.type === 'Image' && new RegExp(re).test(o.texture.key)) { const ox = o.originX, oy = o.originY; o.setFrame(o.frame.name); o.setOrigin(ox, oy); } }));
    return out;
  };
  return 'trim loaded';
})()
