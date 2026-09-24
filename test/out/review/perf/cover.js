(() => {
  const tm = OTR.game.textures; const out = [];
  tm.getTextureKeys().forEach(k => {
    const src = tm.get(k).getSourceImage();
    if (!src || !src.getContext || src.width * src.height < 60000 || /^(panel_|rg_|btn|ic_)/.test(k)) return;
    const c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
    const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(src, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height).data; const W = c.width;
    let n = 0, x0 = W, y0 = c.height, x1 = 0, y1 = 0;
    for (let i = 3; i < d.length; i += 4) { if (d[i] > 0) { n++; const p = i >> 2, px = p % W, py = (p / W) | 0; if (px < x0) x0 = px; if (px > x1) x1 = px; if (py < y0) y0 = py; if (py > y1) y1 = py; } }
    out.push(k.slice(0, 20) + ' ' + W + 'x' + c.height + ' vis ' + (n / (d.length / 4)).toFixed(2) + ' bbox ' + (((x1 - x0 + 1) * (y1 - y0 + 1)) / (d.length / 4)).toFixed(2) + ' [' + [x0, y0, x1, y1] + ']');
  });
  return out;
})()
