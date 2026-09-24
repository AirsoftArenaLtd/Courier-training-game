/*
 * imgtool (in-page, via playd /eval): contact sheets and pixel diffs of screenshots served by playd's game server.
 *   __img.sheet(['test/out/review/wp0/a.png', ...], cols, cellW)  -> PNG data URL, labelled cells
 *   __img.diff(a, b, opts)  -> { mean, p99, max, over8, over24, box, url } (url: amplified diff image, opts.amp)
 */
(() => {
  const load = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('load ' + src)); i.src = '/' + src + '?t=' + Date.now(); });
  window.__img = {
    async sheet(srcs, cols, cellW) {
      cols = cols || 3; cellW = cellW || 426;
      const imgs = await Promise.all(srcs.map(load));
      const cellH = Math.round(cellW * imgs[0].height / imgs[0].width);
      const rows = Math.ceil(imgs.length / cols);
      const c = document.createElement('canvas'); c.width = cols * cellW; c.height = rows * (cellH + 16);
      const x = c.getContext('2d');
      x.fillStyle = '#222'; x.fillRect(0, 0, c.width, c.height);
      imgs.forEach((im, i) => {
        const cx = (i % cols) * cellW, cy = Math.floor(i / cols) * (cellH + 16);
        x.drawImage(im, cx, cy + 16, cellW, cellH);
        x.fillStyle = '#fff'; x.font = '12px Arial'; x.fillText(srcs[i].split('/').pop(), cx + 4, cy + 12);
      });
      return c.toDataURL('image/png');
    },
    async diff(a, b, opts) {
      opts = opts || {};
      const [A, B] = await Promise.all([load(a), load(b)]);
      const w = A.width, h = A.height;
      const grab = (im) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(im, 0, 0, w, h); return x.getImageData(0, 0, w, h); };
      const da = grab(A), db = grab(B);
      const out = new ImageData(w, h), d = [];
      let x0 = w, y0 = h, x1 = -1, y1 = -1, over8 = 0, over24 = 0, sum = 0;
      const amp = opts.amp || 4;
      for (let i = 0; i < da.data.length; i += 4) {
        const m = Math.max(Math.abs(da.data[i] - db.data[i]), Math.abs(da.data[i + 1] - db.data[i + 1]), Math.abs(da.data[i + 2] - db.data[i + 2]));
        d.push(m); sum += m;
        if (m > 8) { over8++; const p = i >> 2, px = p % w, py = (p / w) | 0; if (px < x0) x0 = px; if (px > x1) x1 = px; if (py < y0) y0 = py; if (py > y1) y1 = py; }
        if (m > 24) over24++;
        const v = Math.min(255, m * amp);
        out.data[i] = v; out.data[i + 1] = v; out.data[i + 2] = v; out.data[i + 3] = 255;
      }
      d.sort((p, q) => p - q);
      const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').putImageData(out, 0, 0);
      const n = d.length;
      return { mean: +(sum / n).toFixed(2), p99: d[Math.floor(n * 0.99)], max: d[n - 1], over8: +(100 * over8 / n).toFixed(2) + '%', over24: +(100 * over24 / n).toFixed(2) + '%', box: x1 < 0 ? null : [x0, y0, x1 - x0 + 1, y1 - y0 + 1], url: opts.image ? c.toDataURL('image/png') : null };
    }
  };
  return 'imgtool loaded';
})()
