/*
 * Texture factory. Everything is painted with Canvas2D (real gradients, glows, soft shadows)
 * and registered as a Phaser canvas texture. Textures are cached by key.
 */
window.OTR = window.OTR || {};

OTR.cv = {
  /**
   * Draws text that always fits the width it is given, shrinking the type rather than clipping the
   * words. Addresses and customer names vary in length, so anything drawn from content uses this.
   * Returns the size it settled on.
   */
  fitText(ctx, text, x, y, maxW, size, o) {
    o = o || {};
    const weight = o.weight || '900';
    const family = o.family || '"Segoe UI", Arial';
    const min = o.min || 8;
    let s = size;
    const set = () => { ctx.font = `${weight} ${s}px ${family}`; };
    set();
    while (s > min && ctx.measureText(text).width > maxW) { s -= 0.5; set(); }
    ctx.fillText(text, x, y);
    return s;
  },

  rr(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  },
  lin(ctx, x0, y0, x1, y1, stops) {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    stops.forEach(s => g.addColorStop(s[0], typeof s[1] === 'number' ? OTR.color.css(s[1]) : s[1]));
    return g;
  },
  rad(ctx, x, y, r0, r1, stops) {
    const g = ctx.createRadialGradient(x, y, r0, x, y, r1);
    stops.forEach(s => g.addColorStop(s[0], typeof s[1] === 'number' ? OTR.color.css(s[1]) : s[1]));
    return g;
  },
  c(num, a) { return OTR.color.css(num, a); },
  star(ctx, cx, cy, outer, inner, points) {
    points = points || 5;
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? outer : inner;
      const a = -Math.PI / 2 + (i * Math.PI) / points;
      const px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
  },
  ellipse(ctx, cx, cy, rx, ry, rot) {
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, rot || 0, 0, Math.PI * 2);
  },
  shadow(ctx, blur, oy, alpha, color) {
    ctx.shadowColor = color || `rgba(0,0,0,${alpha === undefined ? 0.35 : alpha})`;
    ctx.shadowBlur = blur;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = oy || 0;
  },
  noShadow(ctx) {
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }
};

OTR.tex = {
  /**
   * Create (once) a canvas texture of w x h painted by fn(ctx, w, h). Returns the key.
   * o.trim: the texture's frame is cut to the painted pixels, as a texture atlas does. Objects using it keep their
   * full w x h size, origin and position, but the GPU no longer fills the transparent margin (a big overlay layer
   * that is mostly empty costs as much as a full one otherwise). Not for TileSprites.
   */
  make(scene, key, w, h, fn, o) {
    const tm = scene.textures;
    if (tm.exists(key)) return key;
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.ceil(w));
    canvas.height = Math.max(1, Math.ceil(h));
    // willReadFrequently keeps the canvas on the CPU. A GPU-backed canvas makes the upload to WebGL wait for a
    // read-back behind every frame already queued: 50-95 ms per texture on integrated graphics, a visible freeze
    // each time a face, mouth or package is first drawn. The pixels are the same either way.
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    fn(ctx, canvas.width, canvas.height);
    const tex = tm.addCanvas(key, canvas);
    if (o && o.trim && tex) OTR.tex.trim(tex, ctx);
    return key;
  },

  /** Cut a canvas texture's frame to the bounding box of its visible pixels (see make's o.trim). */
  trim(tex, ctx) {
    const W = ctx.canvas.width, H = ctx.canvas.height;
    const px = ctx.getImageData(0, 0, W, H).data;
    let x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (let y = 0; y < H; y++) {
      const row = y * W * 4;
      for (let x = 0; x < W; x++) {
        if (px[row + x * 4 + 3] === 0) continue;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        y1 = y;
      }
    }
    if (x1 < 0) { x0 = 0; y0 = 0; x1 = 0; y1 = 0; }       // nothing painted: keep one pixel
    const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
    if (bw * bh > W * H * 0.85) return;                  // hardly any margin: not worth it
    const f = tex.get();
    f.setSize(bw, bh, x0, y0);
    f.setTrim(W, H, x0, y0, bw, bh);
  },

  /* ------------------------------------------------------------ vector shapes as textures */
  /**
   * The game renders without multisampling (see main.js), so a Phaser Graphics has hard, stair-stepped edges on
   * curves and slopes, and it is re-tessellated every frame. A shape that does not change is drawn once instead,
   * through Phaser's own canvas renderer into an antialiased canvas texture (shared by identical shapes), and shown
   * as an Image:
   *   const g = OTR.tex.shape(scene, (g) => { g.fillStyle(0xFF6600, 1); g.fillRoundedRect(-40, -12, 80, 24, 12); });
   * The Image's position is the shape's local (0, 0), so it goes wherever the Graphics went (into a container, with
   * setDepth, setScrollFactor, tweens). A shape that changes now and then is a liveShape() that redraws on change.
   */
  shape(scene, draw, x, y) {
    const g = scene.make.graphics({ add: false });
    draw(g);
    const b = OTR.tex.shapeBounds(g.commandBuffer);
    let img;
    if (!b) {
      // commands the canvas renderer cannot reproduce (gradient fills): keep a plain Graphics
      img = scene.add.graphics().setPosition(x || 0, y || 0);
      img.commandBuffer = g.commandBuffer.slice();
    } else {
      const key = `gfx_${OTR.rig.hash(g.commandBuffer)}_${g.commandBuffer.length}_${b.w}x${b.h}`;
      OTR.tex.make(scene, key, b.w, b.h, (ctx) => OTR.tex.paintShape(scene, g, ctx, -b.x, -b.y));
      img = scene.add.image(x || 0, y || 0, key).setOrigin(-b.x / b.w, -b.y / b.h);
    }
    g.destroy();
    return img;
  },

  /**
   * A shape that changes now and then (a gauge, a badge that changes colour, a hint sized to its text): an Image
   * with its own canvas texture, repainted only when img.redraw((g) => { ... }) is called with the new drawing.
   */
  liveShape(scene, x, y) {
    const g = scene.make.graphics({ add: false });
    const id = OTR.tex._liveId = (OTR.tex._liveId || 0) + 1;
    const img = scene.add.image(x || 0, y || 0, '__DEFAULT');
    let tex = null, ctx = null, cw = 0, ch = 0, n = 0;
    img.redraw = (draw) => {
      g.clear();
      draw(g);
      const b = OTR.tex.shapeBounds(g.commandBuffer) || { x: 0, y: 0, w: 1, h: 1 };
      if (!tex || b.w > cw || b.h > ch) {
        const old = tex;
        cw = Math.max(cw, b.w); ch = Math.max(ch, b.h);
        const canvas = document.createElement('canvas');
        canvas.width = cw; canvas.height = ch;
        ctx = canvas.getContext('2d', { willReadFrequently: true });
        tex = scene.textures.addCanvas(`gfxlive_${id}_${++n}`, canvas);
        img.setTexture(tex.key);
        if (old) scene.textures.remove(old);
      }
      ctx.clearRect(0, 0, cw, ch);
      OTR.tex.paintShape(scene, g, ctx, -b.x, -b.y);
      tex.refresh();
      img.setOrigin(-b.x / cw, -b.y / ch);
      return img;
    };
    img.once('destroy', () => {
      g.destroy();
      if (tex && scene.textures.exists(tex.key)) scene.textures.remove(tex);
      tex = null;
    });
    return img;
  },

  /** Paint a Graphics' commands into a 2D context with its local (0, 0) at (ox, oy). */
  paintShape(scene, g, ctx, ox, oy) {
    const cam = Phaser.GameObjects.Graphics.TargetCamera;
    cam.setScene(scene, false);       // not a scene camera: leaves the scene manager's viewport count alone
    cam.setViewport(0, 0, ctx.canvas.width, ctx.canvas.height);
    cam.scrollX = -ox;
    cam.scrollY = -oy;
    ctx.miterLimit = 2;               // sharp corners bevel, as Phaser's own strokes do; right angles stay square
    g.renderCanvas(scene.sys.game.renderer, g, cam, null, ctx, false);
    cam.renderList.length = 0;        // renderCanvas lists what it drew on the camera; this one never clears itself
  },

  /**
   * Local bounding box of a Graphics command buffer, padded for line width and antialiasing, in whole pixels:
   * { x, y, w, h }. Null if it uses a command the canvas renderer draws differently (gradients, transforms).
   */
  shapeBounds(buf) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, lw = 0;
    const pt = (x, y) => { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; };
    for (let i = 0; i < buf.length;) {
      switch (buf[i]) {
        case 0: pt(buf[i + 1] - buf[i + 3], buf[i + 2] - buf[i + 3]); pt(buf[i + 1] + buf[i + 3], buf[i + 2] + buf[i + 3]); i += 8; break;   // arc: its whole circle
        case 1: case 2: case 8: case 9: i += 1; break;                                   // begin/close/fill/stroke path
        case 3: pt(buf[i + 1], buf[i + 2]); pt(buf[i + 1] + buf[i + 3], buf[i + 2] + buf[i + 4]); i += 5; break;           // fill rect
        case 4: case 5: pt(buf[i + 1], buf[i + 2]); i += 3; break;                       // line to, move to
        case 6: lw = Math.max(lw, buf[i + 1]); i += 4; break;                           // line style
        case 7: i += 3; break;                                                           // fill style
        case 10: case 11: pt(buf[i + 1], buf[i + 2]); pt(buf[i + 3], buf[i + 4]); pt(buf[i + 5], buf[i + 6]); i += 7; break; // triangles
        default: return null;
      }
    }
    if (x0 === Infinity) return { x: 0, y: 0, w: 1, h: 1 };
    const pad = Math.ceil(lw) + 2;    // a stroke reaches lw / 2 past its path, a beveled miter at most lw
    const x = Math.floor(x0) - pad, y = Math.floor(y0) - pad;
    return { x, y, w: Math.ceil(x1) + pad - x, h: Math.ceil(y1) + pad - y };
  },

  /** Rounded panel with gradient, border and soft drop shadow. Canvas has margin M around the panel. */
  M: 24,
  panel(scene, w, h, opts) {
    opts = opts || {};
    const top = opts.top !== undefined ? opts.top : 0xFFFFFF;
    const bottom = opts.bottom !== undefined ? opts.bottom : 0xEDE7F6;
    const r = opts.radius !== undefined ? opts.radius : 18;
    const border = opts.border !== undefined ? opts.border : null;
    const bw = opts.borderWidth || 3;
    const sh = opts.shadow === false ? 0 : (opts.shadow || 0.35);
    const glow = opts.glow || null;
    const key = `panel_${w}x${h}_${top}_${bottom}_${r}_${border}_${bw}_${sh}_${glow}_${opts.sheen ? 1 : 0}`;
    const M = OTR.tex.M;
    return OTR.tex.make(scene, key, w + M * 2, h + M * 2, (ctx) => {
      const cv = OTR.cv;
      if (glow !== null) {
        cv.shadow(ctx, 22, 0, 0, cv.c(glow, 0.8));
      } else if (sh) {
        cv.shadow(ctx, 18, 6, sh);
      }
      cv.rr(ctx, M, M, w, h, r);
      ctx.fillStyle = cv.lin(ctx, 0, M, 0, M + h, [[0, top], [1, bottom]]);
      ctx.fill();
      cv.noShadow(ctx);
      if (opts.sheen) {
        ctx.save();
        cv.rr(ctx, M, M, w, h, r);
        ctx.clip();
        ctx.fillStyle = cv.lin(ctx, 0, M, 0, M + h * 0.5, [[0, 'rgba(255,255,255,0.28)'], [1, 'rgba(255,255,255,0)']]);
        ctx.fillRect(M, M, w, h * 0.5);
        ctx.restore();
      }
      if (border !== null) {
        cv.rr(ctx, M + bw / 2, M + bw / 2, w - bw, h - bw, Math.max(0, r - bw / 2));
        ctx.lineWidth = bw;
        ctx.strokeStyle = cv.c(border);
        ctx.stroke();
      }
    });
  },

  /** Full-screen vertical gradient background. */
  bg(scene, key, stops, extra) {
    return OTR.tex.make(scene, key, OTR.W, OTR.H, (ctx, w, h) => {
      ctx.fillStyle = OTR.cv.lin(ctx, 0, 0, 0, h, stops);
      ctx.fillRect(0, 0, w, h);
      if (extra) extra(ctx, w, h);
    });
  },

  /** Generate the shared texture set used across scenes. */
  boot(scene) {
    const cv = OTR.cv;
    const T = OTR.tex;

    // --- particles ---
    T.make(scene, 'p_dot', 16, 16, (ctx) => {
      ctx.fillStyle = cv.rad(ctx, 8, 8, 0, 8, [[0, 'rgba(255,255,255,1)'], [0.5, 'rgba(255,255,255,0.8)'], [1, 'rgba(255,255,255,0)']]);
      ctx.fillRect(0, 0, 16, 16);
    });
    T.make(scene, 'p_glow', 64, 64, (ctx) => {
      ctx.fillStyle = cv.rad(ctx, 32, 32, 0, 32, [[0, 'rgba(255,255,255,0.9)'], [0.4, 'rgba(255,255,255,0.35)'], [1, 'rgba(255,255,255,0)']]);
      ctx.fillRect(0, 0, 64, 64);
    });
    T.make(scene, 'p_star', 24, 24, (ctx) => {
      cv.star(ctx, 12, 12, 11, 4.5);
      ctx.fillStyle = '#fff';
      ctx.fill();
    });
    T.make(scene, 'p_rect', 12, 7, (ctx) => {
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, 12, 7);
    });
    T.make(scene, 'p_drop', 3, 26, (ctx) => {
      ctx.fillStyle = cv.lin(ctx, 0, 0, 0, 26, [[0, 'rgba(255,255,255,0)'], [1, 'rgba(220,235,255,0.85)']]);
      ctx.fillRect(0, 0, 3, 26);
    });
    T.make(scene, 'p_smoke', 40, 40, (ctx) => {
      ctx.fillStyle = cv.rad(ctx, 20, 20, 0, 20, [[0, 'rgba(255,255,255,0.6)'], [1, 'rgba(255,255,255,0)']]);
      ctx.fillRect(0, 0, 40, 40);
    });
    T.make(scene, 'px', 4, 4, (ctx) => { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 4, 4); });

    // --- stars ---
    T.make(scene, 'star_gold', 72, 72, (ctx) => {
      cv.shadow(ctx, 10, 3, 0.35);
      cv.star(ctx, 36, 36, 30, 13);
      ctx.fillStyle = cv.lin(ctx, 0, 6, 0, 66, [[0, '#FFF1A8'], [0.45, '#FFC83D'], [1, '#FF8A00']]);
      ctx.fill();
      cv.noShadow(ctx);
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#C45A00';
      ctx.stroke();
      cv.star(ctx, 36, 33, 16, 7);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fill();
    });
    T.make(scene, 'star_empty', 72, 72, (ctx) => {
      cv.star(ctx, 36, 36, 30, 13);
      ctx.fillStyle = 'rgba(20,8,40,0.35)';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.stroke();
    });
    T.make(scene, 'star_empty_dark', 72, 72, (ctx) => {
      cv.star(ctx, 36, 36, 30, 13);
      ctx.fillStyle = 'rgba(40,20,70,0.12)';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(60,30,100,0.35)';
      ctx.stroke();
    });

    OTR.tex.icons(scene);
    OTR.tex.buttons(scene);
  },

  /** Pre-built button skins. */
  buttonSkins: {
    orange: { top: 0xFF8A3D, bottom: 0xE65100, border: 0xFFB27A, text: '#ffffff' },
    purple: { top: 0x7B3FC4, bottom: 0x4D148C, border: 0xA57EE0, text: '#ffffff' },
    green:  { top: 0x3DDC9C, bottom: 0x1E9E6B, border: 0x8BF0C6, text: '#ffffff' },
    red:    { top: 0xFF6B7F, bottom: 0xC8243B, border: 0xFFA5B1, text: '#ffffff' },
    blue:   { top: 0x66BBFF, bottom: 0x1F7AD6, border: 0xA8D8FF, text: '#ffffff' },
    ghost:  { top: 0xFFFFFF, bottom: 0xEDE7F6, border: 0xC9B3F0, text: '#4D148C' },
    dark:   { top: 0x3A1D63, bottom: 0x250849, border: 0x6A45A0, text: '#ffffff' }
  },
  button(scene, w, h, skin) {
    const s = OTR.tex.buttonSkins[skin] || OTR.tex.buttonSkins.orange;
    return OTR.tex.panel(scene, w, h, { top: s.top, bottom: s.bottom, border: s.border, borderWidth: 2, radius: Math.min(16, h / 2), shadow: 0.3, sheen: true });
  },
  buttons() { /* skins are generated lazily per size */ },

  /** White, tintable 64x64 icons. */
  icons(scene) {
    const cv = OTR.cv;
    const I = (key, fn) => OTR.tex.make(scene, key, 64, 64, (ctx) => {
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#fff';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      fn(ctx);
    });

    I('ic_shield', (ctx) => {
      ctx.beginPath();
      ctx.moveTo(32, 4); ctx.lineTo(56, 13); ctx.lineTo(56, 30);
      ctx.bezierCurveTo(56, 46, 45, 55, 32, 61);
      ctx.bezierCurveTo(19, 55, 8, 46, 8, 30);
      ctx.lineTo(8, 13); ctx.closePath(); ctx.fill();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(20, 32); ctx.lineTo(29, 41); ctx.lineTo(45, 23); ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
    });
    I('ic_bolt', (ctx) => {
      ctx.beginPath();
      ctx.moveTo(38, 2); ctx.lineTo(12, 36); ctx.lineTo(29, 36); ctx.lineTo(24, 62);
      ctx.lineTo(52, 26); ctx.lineTo(35, 26); ctx.closePath(); ctx.fill();
    });
    I('ic_heart', (ctx) => {
      ctx.beginPath();
      ctx.moveTo(32, 58);
      ctx.bezierCurveTo(4, 40, 2, 20, 16, 11);
      ctx.bezierCurveTo(24, 6, 30, 10, 32, 17);
      ctx.bezierCurveTo(34, 10, 40, 6, 48, 11);
      ctx.bezierCurveTo(62, 20, 60, 40, 32, 58);
      ctx.fill();
    });
    I('ic_star', (ctx) => { cv.star(ctx, 32, 33, 28, 12); ctx.fill(); });
    I('ic_van', (ctx) => {
      cv.rr(ctx, 4, 16, 38, 30, 4); ctx.fill();
      ctx.beginPath(); ctx.moveTo(42, 22); ctx.lineTo(52, 22); ctx.lineTo(60, 34); ctx.lineTo(60, 46); ctx.lineTo(42, 46); ctx.closePath(); ctx.fill();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath(); ctx.moveTo(45, 26); ctx.lineTo(51, 26); ctx.lineTo(56, 34); ctx.lineTo(45, 34); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.arc(16, 47, 9, 0, Math.PI * 2); ctx.arc(48, 47, 9, 0, Math.PI * 2); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      ctx.beginPath(); ctx.arc(16, 47, 6, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(48, 47, 6, 0, Math.PI * 2); ctx.fill();
    });
    I('ic_box', (ctx) => {
      ctx.beginPath(); ctx.moveTo(32, 6); ctx.lineTo(58, 18); ctx.lineTo(58, 46); ctx.lineTo(32, 58); ctx.lineTo(6, 46); ctx.lineTo(6, 18); ctx.closePath(); ctx.fill();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(6, 18); ctx.lineTo(32, 30); ctx.lineTo(58, 18); ctx.moveTo(32, 30); ctx.lineTo(32, 58); ctx.stroke();
      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(19, 12); ctx.lineTo(45, 24); ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
    });
    I('ic_chat', (ctx) => {
      cv.rr(ctx, 4, 8, 44, 32, 10); ctx.fill();
      ctx.beginPath(); ctx.moveTo(14, 38); ctx.lineTo(12, 50); ctx.lineTo(26, 38); ctx.fill();
      ctx.globalAlpha = 0.75;
      cv.rr(ctx, 26, 26, 34, 26, 9); ctx.fill();
      ctx.beginPath(); ctx.moveTo(50, 50); ctx.lineTo(54, 60); ctx.lineTo(42, 50); ctx.fill();
      ctx.globalAlpha = 1;
    });
    I('ic_bulb', (ctx) => {
      ctx.beginPath(); ctx.arc(32, 26, 19, Math.PI * 0.8, Math.PI * 2.2); ctx.lineTo(40, 46); ctx.lineTo(24, 46); ctx.closePath(); ctx.fill();
      cv.rr(ctx, 23, 49, 18, 5, 2); ctx.fill();
      cv.rr(ctx, 25, 56, 14, 5, 2); ctx.fill();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(27, 44); ctx.lineTo(27, 32); ctx.lineTo(32, 28); ctx.lineTo(37, 32); ctx.lineTo(37, 44); ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
    });
    I('ic_clipboard', (ctx) => {
      cv.rr(ctx, 10, 8, 44, 54, 6); ctx.fill();
      ctx.globalCompositeOperation = 'destination-out';
      cv.rr(ctx, 16, 16, 32, 40, 3); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      cv.rr(ctx, 22, 3, 20, 10, 4); ctx.fill();
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(21, 28); ctx.lineTo(25, 32); ctx.lineTo(31, 24); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(35, 28); ctx.lineTo(43, 28); ctx.moveTo(21, 44); ctx.lineTo(43, 44); ctx.stroke();
    });
    I('ic_map', (ctx) => {
      ctx.beginPath(); ctx.moveTo(4, 12); ctx.lineTo(22, 6); ctx.lineTo(42, 12); ctx.lineTo(60, 6); ctx.lineTo(60, 52); ctx.lineTo(42, 58); ctx.lineTo(22, 52); ctx.lineTo(4, 58); ctx.closePath(); ctx.fill();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(22, 6); ctx.lineTo(22, 52); ctx.moveTo(42, 12); ctx.lineTo(42, 58); ctx.stroke();
      ctx.setLineDash([4, 4]); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(10, 46); ctx.lineTo(30, 30); ctx.lineTo(52, 22); ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalCompositeOperation = 'source-over';
    });
    I('ic_wheel', (ctx) => {
      ctx.lineWidth = 7;
      ctx.beginPath(); ctx.arc(32, 32, 24, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(32, 32, 7, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(10, 30); ctx.lineTo(54, 30); ctx.moveTo(32, 32); ctx.lineTo(32, 55); ctx.stroke();
    });
    I('ic_belt', (ctx) => {
      cv.rr(ctx, 14, 6, 22, 20, 3); ctx.fill();
      cv.rr(ctx, 34, 14, 18, 14, 3); ctx.fill();
      cv.rr(ctx, 4, 32, 56, 12, 6); ctx.fill();
      ctx.globalCompositeOperation = 'destination-out';
      for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(12 + i * 13.3, 38, 3, 0, Math.PI * 2); ctx.fill(); }
      ctx.globalCompositeOperation = 'source-over';
      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(10, 56); ctx.lineTo(52, 56); ctx.lineTo(44, 50); ctx.moveTo(52, 56); ctx.lineTo(44, 62); ctx.stroke();
    });
    I('ic_lift', (ctx) => {
      cv.rr(ctx, 12, 30, 40, 30, 4); ctx.fill();
      ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(32, 24); ctx.lineTo(32, 4); ctx.moveTo(22, 13); ctx.lineTo(32, 3); ctx.lineTo(42, 13); ctx.stroke();
    });
    I('ic_diamond', (ctx) => {
      ctx.beginPath(); ctx.moveTo(32, 2); ctx.lineTo(62, 32); ctx.lineTo(32, 62); ctx.lineTo(2, 32); ctx.closePath(); ctx.fill();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(32, 9); ctx.lineTo(55, 32); ctx.lineTo(32, 55); ctx.lineTo(9, 32); ctx.closePath(); ctx.stroke();
      ctx.font = 'bold 22px Segoe UI, Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('!', 32, 34);
      ctx.globalCompositeOperation = 'source-over';
    });
    I('ic_pen', (ctx) => {
      ctx.save(); ctx.translate(32, 32); ctx.rotate(-Math.PI / 4);
      cv.rr(ctx, -7, -28, 14, 40, 3); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-7, 14); ctx.lineTo(7, 14); ctx.lineTo(0, 26); ctx.closePath(); ctx.fill();
      ctx.restore();
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(6, 58); ctx.bezierCurveTo(14, 48, 18, 62, 26, 54); ctx.stroke();
    });
    I('ic_paw', (ctx) => {
      cv.ellipse(ctx, 32, 42, 15, 13); ctx.fill();
      cv.ellipse(ctx, 14, 26, 6, 8, -0.3); ctx.fill();
      cv.ellipse(ctx, 25, 14, 6, 8, -0.1); ctx.fill();
      cv.ellipse(ctx, 39, 14, 6, 8, 0.1); ctx.fill();
      cv.ellipse(ctx, 50, 26, 6, 8, 0.3); ctx.fill();
    });
    I('ic_pin', (ctx) => {
      ctx.beginPath(); ctx.arc(32, 24, 19, Math.PI, 0); ctx.bezierCurveTo(51, 38, 38, 48, 32, 60); ctx.bezierCurveTo(26, 48, 13, 38, 13, 24); ctx.fill();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath(); ctx.arc(32, 24, 7, 0, Math.PI * 2); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    });
    I('ic_broken', (ctx) => {
      ctx.beginPath(); ctx.moveTo(6, 16); ctx.lineTo(28, 16); ctx.lineTo(22, 30); ctx.lineTo(32, 36); ctx.lineTo(26, 58); ctx.lineTo(6, 58); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(34, 12); ctx.lineTo(58, 16); ctx.lineTo(58, 58); ctx.lineTo(32, 58); ctx.lineTo(38, 38); ctx.lineTo(28, 30); ctx.closePath(); ctx.fill();
    });
    I('ic_cloud', (ctx) => {
      ctx.beginPath();
      ctx.arc(20, 30, 12, Math.PI * 0.5, Math.PI * 1.5);
      ctx.arc(32, 20, 14, Math.PI, Math.PI * 1.9);
      ctx.arc(46, 30, 12, Math.PI * 1.5, Math.PI * 0.5);
      ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(34, 40); ctx.lineTo(26, 52); ctx.lineTo(33, 52); ctx.lineTo(28, 63); ctx.lineTo(42, 47); ctx.lineTo(35, 47); ctx.lineTo(40, 40); ctx.closePath(); ctx.fill();
    });
    I('ic_sound', (ctx) => {
      ctx.beginPath(); ctx.moveTo(6, 24); ctx.lineTo(18, 24); ctx.lineTo(32, 10); ctx.lineTo(32, 54); ctx.lineTo(18, 40); ctx.lineTo(6, 40); ctx.closePath(); ctx.fill();
      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(34, 32, 12, -0.9, 0.9); ctx.stroke();
      ctx.beginPath(); ctx.arc(34, 32, 22, -0.9, 0.9); ctx.stroke();
    });
    I('ic_mute', (ctx) => {
      ctx.beginPath(); ctx.moveTo(6, 24); ctx.lineTo(18, 24); ctx.lineTo(32, 10); ctx.lineTo(32, 54); ctx.lineTo(18, 40); ctx.lineTo(6, 40); ctx.closePath(); ctx.fill();
      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(40, 22); ctx.lineTo(58, 42); ctx.moveTo(58, 22); ctx.lineTo(40, 42); ctx.stroke();
    });
    I('ic_gear', (ctx) => {
      ctx.beginPath();
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        const r = i % 2 === 0 ? 28 : 21;
        const a2 = a + Math.PI / 16;
        ctx.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r);
        ctx.lineTo(32 + Math.cos(a2) * r, 32 + Math.sin(a2) * r);
      }
      ctx.closePath(); ctx.fill();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath(); ctx.arc(32, 32, 9, 0, Math.PI * 2); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    });
    I('ic_check', (ctx) => {
      ctx.lineWidth = 10;
      ctx.beginPath(); ctx.moveTo(10, 34); ctx.lineTo(26, 50); ctx.lineTo(55, 16); ctx.stroke();
    });
    I('ic_cross', (ctx) => {
      ctx.lineWidth = 10;
      ctx.beginPath(); ctx.moveTo(14, 14); ctx.lineTo(50, 50); ctx.moveTo(50, 14); ctx.lineTo(14, 50); ctx.stroke();
    });
    I('ic_flag', (ctx) => {
      cv.rr(ctx, 10, 4, 6, 58, 3); ctx.fill();
      ctx.beginPath(); ctx.moveTo(16, 8); ctx.bezierCurveTo(30, 2, 38, 16, 56, 8); ctx.lineTo(56, 34); ctx.bezierCurveTo(38, 42, 30, 28, 16, 34); ctx.closePath(); ctx.fill();
    });
    I('ic_clock', (ctx) => {
      ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(32, 32, 25, 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(32, 16); ctx.lineTo(32, 33); ctx.lineTo(44, 40); ctx.stroke();
    });
    I('ic_pause', (ctx) => {
      cv.rr(ctx, 14, 10, 12, 44, 4); ctx.fill();
      cv.rr(ctx, 38, 10, 12, 44, 4); ctx.fill();
    });
    I('ic_home', (ctx) => {
      ctx.beginPath(); ctx.moveTo(32, 6); ctx.lineTo(60, 30); ctx.lineTo(52, 30); ctx.lineTo(52, 58); ctx.lineTo(12, 58); ctx.lineTo(12, 30); ctx.lineTo(4, 30); ctx.closePath(); ctx.fill();
      ctx.globalCompositeOperation = 'destination-out';
      cv.rr(ctx, 26, 38, 12, 20, 2); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    });
    I('ic_book', (ctx) => {
      ctx.beginPath(); ctx.moveTo(32, 14); ctx.bezierCurveTo(22, 6, 10, 8, 4, 12); ctx.lineTo(4, 56); ctx.bezierCurveTo(12, 52, 22, 52, 32, 58); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(34, 14); ctx.bezierCurveTo(42, 6, 54, 8, 60, 12); ctx.lineTo(60, 56); ctx.bezierCurveTo(52, 52, 42, 52, 34, 58); ctx.closePath(); ctx.fill();
    });
    I('ic_arrow', (ctx) => {
      ctx.beginPath(); ctx.moveTo(8, 26); ctx.lineTo(36, 26); ctx.lineTo(36, 10); ctx.lineTo(60, 32); ctx.lineTo(36, 54); ctx.lineTo(36, 38); ctx.lineTo(8, 38); ctx.closePath(); ctx.fill();
    });
    I('ic_undo', (ctx) => {
      ctx.lineWidth = 7;
      ctx.beginPath(); ctx.arc(34, 36, 18, Math.PI * 1.1, Math.PI * 0.6, false); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(4, 26); ctx.lineTo(20, 12); ctx.lineTo(24, 32); ctx.closePath(); ctx.fill();
    });
    I('ic_trash', (ctx) => {
      cv.rr(ctx, 8, 12, 48, 7, 3); ctx.fill();
      cv.rr(ctx, 24, 5, 16, 8, 3); ctx.fill();
      ctx.beginPath(); ctx.moveTo(13, 22); ctx.lineTo(51, 22); ctx.lineTo(47, 60); ctx.lineTo(17, 60); ctx.closePath(); ctx.fill();
    });
    I('ic_badge', (ctx) => {
      ctx.beginPath(); ctx.moveTo(18, 36); ctx.lineTo(10, 62); ctx.lineTo(22, 56); ctx.lineTo(28, 64); ctx.lineTo(32, 42); ctx.fill();
      ctx.beginPath(); ctx.moveTo(46, 36); ctx.lineTo(54, 62); ctx.lineTo(42, 56); ctx.lineTo(36, 64); ctx.lineTo(32, 42); ctx.fill();
      ctx.beginPath(); ctx.arc(32, 26, 22, 0, Math.PI * 2); ctx.fill();
      ctx.globalCompositeOperation = 'destination-out';
      cv.star(ctx, 32, 27, 13, 6); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    });
    I('ic_user', (ctx) => {
      ctx.beginPath(); ctx.arc(32, 20, 13, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(6, 60); ctx.bezierCurveTo(8, 38, 56, 38, 58, 60); ctx.closePath(); ctx.fill();
    });
  }
};

/*
 * Phaser 3.80's WebGL renderer turns every Graphics arc into about 100 new points on every frame, whatever its
 * size, so one rounded rectangle is 400+ points to allocate and triangulate per frame. Scenes draw dozens of
 * them (panels, pills, meters, rollers), and it was costing Label Check nearly half its frame rate. Arcs are
 * emitted instead as a polyline fine enough to stay within 0.2 px of the true curve: a small corner becomes four
 * segments, a large circle keeps forty. Both renderers draw the same shape, and nothing calling arc() changes.
 */
(function patchGraphicsArc() {
  const G = window.Phaser && Phaser.GameObjects && Phaser.GameObjects.Graphics;
  if (!G || G.prototype.arcExact) return;
  const TAU = Math.PI * 2;
  G.prototype.arcExact = G.prototype.arc;
  G.prototype.arc = function (x, y, radius, startAngle, endAngle, anticlockwise, overshoot) {
    // the sweep, normalised exactly as Phaser's own renderers do it
    let sweep = endAngle - startAngle;
    if (anticlockwise) {
      if (sweep < -TAU) sweep = -TAU;
      else if (sweep > 0) sweep = sweep % TAU - TAU;
    } else if (sweep > TAU) sweep = TAU;
    else if (sweep < 0) sweep = TAU + sweep % TAU;
    sweep *= 1 + (overshoot || 0);
    // a chord of angle a sits r·a²/8 inside the arc: keep that under 0.2 px
    const step = Math.sqrt(1.6 / Math.max(0.5, radius));
    const n = Math.max(2, Math.min(100, Math.ceil(Math.abs(sweep) / step)));
    for (let i = 0; i <= n; i++) {
      const a = startAngle + sweep * (i / n);
      this.lineTo(x + Math.cos(a) * radius, y + Math.sin(a) * radius);
    }
    return this;
  };
})();

/*
 * Text.setText skips a string that has not changed, but TextStyle.setColor always re-rasterises the text and
 * uploads a new texture. HUD clocks call setColor(warn ? red : white) every frame, so every scenario was redrawing
 * its timer 60-144 times a second. An unchanged colour is now a no-op.
 */
(function patchTextColor() {
  const TS = window.Phaser && Phaser.GameObjects && Phaser.GameObjects.TextStyle;
  if (!TS || TS.prototype.setColorAlways) return;
  TS.prototype.setColorAlways = TS.prototype.setColor;
  TS.prototype.setColor = function (color) {
    if (color === this.color) return this.parent;
    return this.setColorAlways(color);
  };
})();
