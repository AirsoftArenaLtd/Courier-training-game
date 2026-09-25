/*
 * Side-view world art for walkable scenes (doorsteps, lobbies, docks): skies, distant layers, ground strips,
 * generated house / apartment / storefront facades, the delivery van and props.
 * Everything is Canvas2D, cached by a key derived from the spec.
 *
 * Coordinate conventions
 *   Facade textures have their bottom edge on the lawn line. layout values are texture-local
 *   (x from the left edge, y from the TOP of the texture) so a scene adds (lotX, GROUND - tex height).
 */
window.OTR = window.OTR || {};

OTR.scenery = {
  GROUND: 640,
  STEP_H: 22,
  STEP_W: 34,

  rng(seed) {
    let a = (typeof seed === 'string' ? OTR.rig.hash(seed).split('').reduce((n, ch) => n * 31 + ch.charCodeAt(0), 7) : seed) >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  },

  /* ================================================================= time of day & weather */
  TOD: {
    morning:   { top: 0x78BDEB, bottom: 0xFFE2BC, far: 0x9DB7CC, sun: [0.16, 0.5], sunCol: 0xFFE9B0, tint: 0xFFF3E0, dark: 0.0 },
    midday:    { top: 0x4A9FE8, bottom: 0xCFEBFF, far: 0x9ABCD4, sun: [0.72, 0.12], sunCol: 0xFFFFFF, tint: 0xFFFFFF, dark: 0.0 },
    afternoon: { top: 0x5B93D2, bottom: 0xFFD7A6, far: 0xA3A6BE, sun: [0.82, 0.38], sunCol: 0xFFE0A0, tint: 0xFFEBD0, dark: 0.06 },
    evening:   { top: 0x3B2D70, bottom: 0xFF8E5E, far: 0x6E5480, sun: [0.86, 0.7], sunCol: 0xFFB070, tint: 0xFFB590, dark: 0.26 },
    night:     { top: 0x0C1030, bottom: 0x2B2E5E, far: 0x24284E, sun: null, sunCol: 0xDDE6FF, tint: 0x7080C0, dark: 0.55 }
  },

  skyColors(tod, weather) {
    const T = OTR.scenery.TOD[tod] || OTR.scenery.TOD.midday;
    const L = OTR.color.lerp;
    let top = T.top, bottom = T.bottom, far = T.far;
    if (weather === 'cloudy') { top = L(top, 0x8A95A8, 0.45); bottom = L(bottom, 0xC9CED8, 0.45); far = L(far, 0x9AA2B0, 0.4); }
    if (weather === 'rain') { top = L(top, 0x5E6878, 0.7); bottom = L(bottom, 0x9AA4B2, 0.7); far = L(far, 0x6E7888, 0.6); }
    if (weather === 'storm') { top = L(top, 0x2C3140, 0.8); bottom = L(bottom, 0x5A6272, 0.8); far = L(far, 0x3E4454, 0.7); }
    if (weather === 'snow') { top = L(top, 0xB8C4D4, 0.6); bottom = L(bottom, 0xEEF2F8, 0.6); far = L(far, 0xC4CEDA, 0.5); }
    if (weather === 'heat') { top = L(top, 0x7FB4E0, 0.3); bottom = L(bottom, 0xFFF0C0, 0.55); far = L(far, 0xC8C0B0, 0.4); }
    return { top, bottom, far };
  },

  /** width: wider than the screen for a sky that scrolls (Stage.skyline); the sun and clouds spread over it */
  sky(scene, tod, weather, width) {
    const key = `sky_${tod}_${weather}` + (width && width !== OTR.W ? `_${width}` : '');
    const T = OTR.scenery.TOD[tod] || OTR.scenery.TOD.midday;
    const C = OTR.scenery.skyColors(tod, weather);
    return OTR.tex.make(scene, key, width || OTR.W, OTR.H, (ctx, w, h) => {
      const cv = OTR.cv;
      ctx.fillStyle = cv.lin(ctx, 0, 0, 0, h * 0.8, [[0, C.top], [1, C.bottom]]);
      ctx.fillRect(0, 0, w, h);
      const R = OTR.scenery.rng(key);
      if (tod === 'night') {
        for (let i = 0; i < 120; i++) {
          ctx.fillStyle = `rgba(255,255,255,${0.2 + R() * 0.6})`;
          ctx.beginPath(); ctx.arc(R() * w, R() * h * 0.5, R() * 1.4 + 0.3, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = cv.rad(ctx, w * 0.8, h * 0.16, 0, 70, [[0, 'rgba(240,245,255,0.95)'], [0.3, 'rgba(220,230,255,0.4)'], [1, 'rgba(200,210,255,0)']]);
        ctx.fillRect(w * 0.8 - 70, h * 0.16 - 70, 140, 140);
      } else if (T.sun && weather !== 'storm' && weather !== 'rain') {
        const sx = T.sun[0] * w, sy = T.sun[1] * h;
        const r = weather === 'heat' ? 260 : 180;
        ctx.fillStyle = cv.rad(ctx, sx, sy, 0, r, [[0, cv.c(T.sunCol, 1)], [0.12, cv.c(T.sunCol, 0.85)], [0.35, cv.c(T.sunCol, 0.25)], [1, cv.c(T.sunCol, 0)]]);
        ctx.fillRect(sx - r, sy - r, r * 2, r * 2);
      }
      // clouds
      const n = { clear: 4, heat: 2, cloudy: 10, rain: 14, storm: 16, snow: 12 }[weather] || 5;
      const cloudCol = weather === 'storm' ? [70, 76, 92] : weather === 'rain' ? [140, 148, 160] : tod === 'evening' ? [255, 190, 170] : tod === 'night' ? [60, 66, 100] : [255, 255, 255];
      for (let i = 0; i < n; i++) {
        const cx = R() * w, cy = 30 + R() * h * (weather === 'storm' || weather === 'rain' ? 0.35 : 0.3);
        const s = 40 + R() * 70;
        const a = weather === 'storm' ? 0.9 : weather === 'rain' ? 0.75 : 0.55;
        for (let j = 0; j < 6; j++) {
          const bx = cx + (j - 2.5) * s * 0.55, by = cy + Math.sin(j * 1.7) * s * 0.18;
          ctx.fillStyle = cv.rad(ctx, bx, by, 0, s * 0.7, [[0, `rgba(${cloudCol},${a})`], [0.6, `rgba(${cloudCol},${a * 0.6})`], [1, `rgba(${cloudCol},0)`]]);
          ctx.fillRect(bx - s, by - s, s * 2, s * 2);
        }
      }
      if (weather === 'heat') {
        ctx.fillStyle = cv.lin(ctx, 0, h * 0.4, 0, h, [[0, 'rgba(255,230,160,0)'], [1, 'rgba(255,220,140,0.35)']]);
        ctx.fillRect(0, 0, w, h);
      }
    });
  },

  /** Distant tree line + rooftops, meant for a tileSprite with a low scroll factor. */
  far(scene, tod, weather, seed) {
    const key = `far_${tod}_${weather}_${seed || 0}`;
    const C = OTR.scenery.skyColors(tod, weather);
    return OTR.tex.make(scene, key, 1600, 420, (ctx, w, h) => {
      const cv = OTR.cv, R = OTR.scenery.rng(key);
      const far = C.far, near = OTR.color.shade(C.far, -0.22);
      // hills
      ctx.fillStyle = cv.c(OTR.color.lerp(far, C.bottom, 0.35));
      ctx.beginPath(); ctx.moveTo(0, h);
      for (let x = 0; x <= w; x += 40) ctx.lineTo(x, 200 + Math.sin(x / 210) * 26 + Math.sin(x / 67) * 8);
      ctx.lineTo(w, h); ctx.closePath(); ctx.fill();
      // rooftops
      let x = -20;
      while (x < w) {
        const bw = 90 + R() * 120, bh = 60 + R() * 70, by = 300 - bh;
        ctx.fillStyle = cv.c(OTR.color.shade(far, -0.1 - R() * 0.08));
        ctx.fillRect(x, by, bw, h - by);
        ctx.beginPath(); ctx.moveTo(x - 8, by); ctx.lineTo(x + bw / 2, by - 30 - R() * 20); ctx.lineTo(x + bw + 8, by); ctx.closePath(); ctx.fill();
        if (tod === 'evening' || tod === 'night') {
          ctx.fillStyle = 'rgba(255,214,130,0.75)';
          for (let k = 0; k < 3; k++) if (R() < 0.6) ctx.fillRect(x + 14 + k * 26, by + 18, 10, 12);
        }
        x += bw + 10 + R() * 60;
      }
      // tree canopy blobs
      for (let i = 0; i < 70; i++) {
        const tx = R() * w, ty = 270 + R() * 60, r = 22 + R() * 34;
        ctx.fillStyle = cv.c(OTR.color.lerp(near, 0x2F5A3A, weather === 'snow' ? 0.1 : 0.35));
        ctx.beginPath(); ctx.arc(tx, ty, r, 0, Math.PI * 2); ctx.fill();
        if (weather === 'snow') { ctx.fillStyle = 'rgba(245,250,255,0.7)'; ctx.beginPath(); ctx.arc(tx - r * 0.2, ty - r * 0.45, r * 0.6, Math.PI, 0); ctx.fill(); }
      }
      ctx.fillStyle = cv.c(OTR.color.shade(near, -0.1));
      ctx.fillRect(0, 330, w, h - 330);
    });
  },

  /* ================================================================= ground strip */
  /**
   * segments: [{ x0, x1, type: road|curb|sidewalk|lawn|driveway|path|tile|wood|concrete|dock }]
   * Texture spans world y GROUND-60 .. 720 (height 140). o: { weather }
   */
  ground(scene, key, width, segments, o) {
    o = o || {};
    const G = OTR.scenery.GROUND, top = G - 60, H = OTR.H - top;
    OTR.tex.make(scene, key, width, H, (ctx, w, h) => {
      const cv = OTR.cv, R = OTR.scenery.rng(key);
      const wy = 60; // walk line inside the texture
      const snow = o.weather === 'snow', wet = o.weather === 'rain' || o.weather === 'storm';
      segments.forEach(sg => {
        const x0 = sg.x0, sw = sg.x1 - sg.x0;
        switch (sg.type) {
          case 'road': {
            ctx.fillStyle = cv.lin(ctx, 0, 0, 0, h, [[0, '#55535E'], [1, '#3A3942']]);
            ctx.fillRect(x0, 0, sw, h);
            for (let i = 0; i < sw / 6; i++) { ctx.fillStyle = `rgba(255,255,255,${R() * 0.05})`; ctx.fillRect(x0 + R() * sw, R() * h, 2, 2); }
            ctx.fillStyle = 'rgba(245,213,71,0.85)';
            for (let x = x0 + 20; x < sg.x1 - 60; x += 140) ctx.fillRect(x, h - 22, 70, 6);
            if (wet) {
              ctx.fillStyle = 'rgba(200,220,255,0.12)';
              for (let i = 0; i < sw / 120; i++) cv.ellipse(ctx, x0 + R() * sw, 30 + R() * (h - 40), 40 + R() * 60, 5 + R() * 5), ctx.fill();
            }
            break;
          }
          case 'curb':
            ctx.fillStyle = '#9C9AA6'; ctx.fillRect(x0, 0, sw, h);
            ctx.fillStyle = '#C8C6D0'; ctx.fillRect(x0, 0, sw, 8);
            break;
          case 'sidewalk':
          case 'concrete':
          case 'driveway': {
            ctx.fillStyle = cv.lin(ctx, 0, 0, 0, h, [[0, '#CFCCD4'], [1, '#B3B0BA']]);
            ctx.fillRect(x0, 0, sw, h);
            ctx.strokeStyle = 'rgba(80,70,90,0.22)'; ctx.lineWidth = 2;
            const step = sg.type === 'driveway' ? 160 : 90;
            for (let x = x0 + step; x < sg.x1; x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x - 30, h); ctx.stroke(); }
            ctx.beginPath(); ctx.moveTo(x0, wy + 26); ctx.lineTo(sg.x1, wy + 26); ctx.stroke();
            break;
          }
          case 'lawn': {
            ctx.fillStyle = cv.lin(ctx, 0, 0, 0, h, [[0, snow ? '#E8EEF6' : '#6FA85A'], [1, snow ? '#C8D2E0' : '#4E8540']]);
            ctx.fillRect(x0, 0, sw, h);
            if (!snow) {
              for (let i = 0; i < sw / 3; i++) {
                const gx = x0 + R() * sw, gy = R() * h;
                ctx.strokeStyle = R() < 0.5 ? 'rgba(40,90,30,0.35)' : 'rgba(170,220,120,0.3)';
                ctx.lineWidth = 1.5;
                ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + (R() - 0.5) * 4, gy - 5 - R() * 6); ctx.stroke();
              }
            }
            break;
          }
          case 'path': {
            // lawn base, stone pavers along the walk line
            ctx.fillStyle = cv.lin(ctx, 0, 0, 0, h, [[0, snow ? '#E8EEF6' : '#6FA85A'], [1, snow ? '#C8D2E0' : '#4E8540']]);
            ctx.fillRect(x0, 0, sw, h);
            for (let x = x0 + 4; x < sg.x1 - 10; x += 58) {
              cv.rr(ctx, x, wy - 12, 50, 40, 8);
              ctx.fillStyle = snow ? '#D6DCE6' : '#B9AFA2'; ctx.fill();
              ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(x + 2, wy + 22, 46, 5);
            }
            break;
          }
          case 'tile': {
            ctx.fillStyle = '#D9D4DE'; ctx.fillRect(x0, 0, sw, h);
            ctx.strokeStyle = 'rgba(90,80,110,0.2)'; ctx.lineWidth = 2;
            for (let x = x0; x < sg.x1; x += 70) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x - 40, h); ctx.stroke(); }
            for (let y = 20; y < h; y += 36) { ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(sg.x1, y); ctx.stroke(); }
            ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fillRect(x0, 0, sw, 10);
            break;
          }
          case 'wood': {
            ctx.fillStyle = cv.lin(ctx, 0, 0, 0, h, [[0, '#A77B52'], [1, '#7A5638']]); ctx.fillRect(x0, 0, sw, h);
            ctx.strokeStyle = 'rgba(0,0,0,0.14)'; ctx.lineWidth = 2;
            for (let y = 14; y < h; y += 22) { ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(sg.x1, y); ctx.stroke(); }
            break;
          }
          case 'dock': {
            ctx.fillStyle = cv.lin(ctx, 0, 0, 0, h, [[0, '#7E7B86'], [1, '#5C5A64']]); ctx.fillRect(x0, 0, sw, h);
            ctx.fillStyle = '#F2C230';
            for (let x = x0; x < sg.x1; x += 60) { ctx.beginPath(); ctx.moveTo(x, h - 14); ctx.lineTo(x + 30, h - 14); ctx.lineTo(x + 18, h); ctx.lineTo(x - 12, h); ctx.closePath(); ctx.fill(); }
            break;
          }
        }
      });
      if (wet) {
        ctx.fillStyle = cv.lin(ctx, 0, 0, 0, h, [[0, 'rgba(160,190,230,0.12)'], [1, 'rgba(160,190,230,0.02)']]);
        ctx.fillRect(0, 0, w, h);
      }
      // soft contact shadow at the back edge
      ctx.fillStyle = cv.lin(ctx, 0, 0, 0, 24, [[0, 'rgba(0,0,0,0.22)'], [1, 'rgba(0,0,0,0)']]);
      ctx.fillRect(0, 0, w, 24);
    });
    return key;
  },

  /* ================================================================= helpers for facades */
  siding(ctx, x, y, w, h, color, kind, R) {
    const cv = OTR.cv, S = OTR.color.shade;
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.fillStyle = cv.lin(ctx, x, 0, x + w, 0, [[0, S(color, -0.06)], [0.5, S(color, 0.04)], [1, S(color, -0.08)]]);
    ctx.fillRect(x, y, w, h);
    if (kind === 'brick') {
      const bh = 16, bw = 44;
      for (let row = 0, yy = y; yy < y + h; row++, yy += bh) {
        for (let xx = x - (row % 2) * bw / 2; xx < x + w; xx += bw) {
          ctx.fillStyle = cv.c(S(color, (R() - 0.5) * 0.16));
          ctx.fillRect(xx + 1.5, yy + 1.5, bw - 3, bh - 3);
        }
      }
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fillRect(x, y, w, h);
    } else if (kind === 'stucco') {
      for (let i = 0; i < w * h / 90; i++) {
        ctx.fillStyle = R() < 0.5 ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.08)';
        ctx.fillRect(x + R() * w, y + R() * h, 2, 2);
      }
    } else if (kind === 'shingle') {
      for (let yy = y, row = 0; yy < y + h; yy += 20, row++) {
        for (let xx = x - (row % 2) * 12; xx < x + w; xx += 24) {
          ctx.fillStyle = cv.c(S(color, (R() - 0.5) * 0.12));
          cv.rr(ctx, xx + 1, yy, 22, 22, 3); ctx.fill();
        }
        ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(x, yy + 18, w, 2);
      }
    } else {
      // lap siding
      for (let yy = y + 2; yy < y + h; yy += 18) {
        ctx.fillStyle = 'rgba(0,0,0,0.10)'; ctx.fillRect(x, yy + 13, w, 3);
        ctx.fillStyle = 'rgba(255,255,255,0.10)'; ctx.fillRect(x, yy, w, 2);
      }
    }
    ctx.restore();
  },

  window(ctx, x, y, w, h, o) {
    o = o || {};
    const cv = OTR.cv, S = OTR.color.shade;
    const trim = o.trim !== undefined ? o.trim : 0xFFFFFF;
    const night = o.lit;
    // shutters
    if (o.shutters !== undefined && o.shutters !== null) {
      [x - w * 0.36 - 6, x + w + 6].forEach(sx => {
        cv.rr(ctx, sx, y, w * 0.36, h, 3); ctx.fillStyle = cv.c(o.shutters); ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        for (let yy = y + 8; yy < y + h - 4; yy += 10) ctx.fillRect(sx + 4, yy, w * 0.36 - 8, 3);
      });
    }
    cv.shadow(ctx, 8, 3, 0.25);
    cv.rr(ctx, x - 8, y - 8, w + 16, h + 16, 4); ctx.fillStyle = cv.c(trim); ctx.fill();
    cv.noShadow(ctx);
    ctx.fillStyle = night ? cv.lin(ctx, x, y, x, y + h, [[0, '#FFE7A8'], [1, '#F5B860']]) : cv.lin(ctx, x, y, x + w, y + h, [[0, '#D6F0FF'], [0.45, '#7FB6DA'], [1, '#3F6F96']]);
    ctx.fillRect(x, y, w, h);
    // curtains
    if (o.curtain !== false) {
      const cc = o.curtain || 0xF2E6F7;
      ctx.fillStyle = cv.c(cc, 0.9);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w * 0.26, y); ctx.quadraticCurveTo(x + w * 0.12, y + h * 0.5, x + w * 0.2, y + h); ctx.lineTo(x, y + h); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x + w, y); ctx.lineTo(x + w * 0.74, y); ctx.quadraticCurveTo(x + w * 0.88, y + h * 0.5, x + w * 0.8, y + h); ctx.lineTo(x + w, y + h); ctx.closePath(); ctx.fill();
    }
    // reflection
    if (!night) {
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath(); ctx.moveTo(x + w * 0.3, y); ctx.lineTo(x + w * 0.45, y); ctx.lineTo(x + w * 0.15, y + h); ctx.lineTo(x, y + h); ctx.closePath(); ctx.fill();
    }
    // muntins + sill
    ctx.fillStyle = cv.c(trim);
    ctx.fillRect(x + w / 2 - 3, y, 6, h);
    ctx.fillRect(x, y + h / 2 - 3, w, 6);
    cv.rr(ctx, x - 14, y + h + 6, w + 28, 10, 3); ctx.fillStyle = cv.c(S(trim, -0.08)); ctx.fill();
    if (o.box) {
      cv.rr(ctx, x - 6, y + h + 16, w + 12, 22, 4); ctx.fillStyle = '#8B5A3A'; ctx.fill();
      const cols = ['#E8506A', '#FFC83D', '#FF8AB0', '#C86BE0'];
      for (let i = 0; i < 7; i++) { ctx.fillStyle = cols[i % 4]; ctx.beginPath(); ctx.arc(x + (i + 0.5) * w / 7, y + h + 14, 7, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = '#3E8B4A';
      for (let i = 0; i < 8; i++) { ctx.beginPath(); ctx.arc(x + i * w / 7, y + h + 18, 6, 0, Math.PI * 2); ctx.fill(); }
    }
  },

  bush(ctx, x, y, w, h, color, R, o) {
    o = o || {};
    const cv = OTR.cv, S = OTR.color.shade;
    const n = Math.max(4, Math.round(w / 22));
    for (let i = 0; i < n; i++) {
      const bx = x + (i + 0.5) * w / n + (R() - 0.5) * 10, by = y - h * 0.4 - R() * h * 0.3, r = h * (0.35 + R() * 0.25);
      ctx.fillStyle = cv.rad(ctx, bx - r * 0.3, by - r * 0.4, 1, r * 1.2, [[0, S(color, 0.2)], [1, S(color, -0.25)]]);
      ctx.beginPath(); ctx.arc(bx, by, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = cv.c(S(color, -0.3)); ctx.fillRect(x + 4, y - h * 0.25, w - 8, h * 0.25);
    if (o.flowers) {
      for (let i = 0; i < w / 10; i++) { ctx.fillStyle = OTR.util.pick(o.flowers); ctx.beginPath(); ctx.arc(x + R() * w, y - R() * h * 0.9, 3, 0, Math.PI * 2); ctx.fill(); }
    }
    if (o.snow) { ctx.fillStyle = 'rgba(248,250,255,0.9)'; for (let i = 0; i < n; i++) { ctx.beginPath(); ctx.arc(x + (i + 0.5) * w / n, y - h * 0.75, h * 0.28, Math.PI, 0); ctx.fill(); } }
  },

  numberPlaque(ctx, x, y, text, o) {
    o = o || {};
    const cv = OTR.cv;
    const size = o.size || 26;
    ctx.font = `900 ${size}px "Segoe UI", Arial`;
    const tw = ctx.measureText(text).width;
    const w = tw + 22, h = size + 14;
    cv.shadow(ctx, 6, 2, 0.3);
    cv.rr(ctx, x - w / 2, y - h / 2, w, h, 5); ctx.fillStyle = o.bg || '#2A2438'; ctx.fill();
    cv.noShadow(ctx);
    ctx.strokeStyle = o.border || '#D8B45A'; ctx.lineWidth = 2; cv.rr(ctx, x - w / 2 + 3, y - h / 2 + 3, w - 6, h - 6, 3); ctx.stroke();
    ctx.fillStyle = o.color || '#F4E3B0'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y + 1);
  },

  /* ================================================================= house */
  houseDefaults: {
    w: 1000, stories: 2, wall: 0xE9DCC3, trim: 0xFFFFFF, roof: 0x4F4458, door: 0x2F6B5A, siding: 'lap',
    number: '214', steps: 3, porchX: 300, porchW: 440, doorAt: 0.62, shutters: null, chimney: true,
    railing: true, light: true, bell: true, bushes: 0x3E8B4A, flowers: true, wreath: false, curtain: 0xF6EEDC,
    numberOn: 'wall', mailbox: false, garage: false, lit: false, snow: false
  },

  houseLayout(spec) {
    const s = Object.assign({}, OTR.scenery.houseDefaults, spec);
    const H = 700, SH = OTR.scenery.STEP_H, SW = OTR.scenery.STEP_W;
    const ph = s.steps * SH;
    const floorY = H - ph;
    const doorX = s.porchX + s.porchW * s.doorAt;
    return {
      s, w: s.w, h: H, floorY, porchX0: s.porchX, porchX1: s.porchX + s.porchW,
      stepsX0: s.porchX - s.steps * SW, stepsX1: s.porchX,
      doorX, doorW: 108, doorH: 228, doorTop: floorY - 228,
      bellX: doorX - 80, bellY: floorY - 124,
      numberX: s.numberOn === 'column' ? s.porchX + s.porchW - 22 : doorX + 78, numberY: s.numberOn === 'column' ? floorY - 170 : floorY - 168,
      lightX: doorX - 92, lightY: floorY - 176,
      mailboxX: doorX - 150, mailboxY: floorY - 120,
      wallTop: floorY - (s.stories === 2 ? 520 : 290)
    };
  },

  /** Returns { key, frontKey, doorKey, doorOpenKey, layout } */
  house(scene, spec) {
    const L = OTR.scenery.houseLayout(spec);
    const s = L.s;
    const id = OTR.rig.hash(s);
    const key = `house_${id}`, frontKey = `housef_${id}`;
    const cv = OTR.cv, S = OTR.color.shade, SC = OTR.scenery;
    const H = L.h, W = s.w;

    OTR.tex.make(scene, key, W, H, (ctx) => {
      const R = SC.rng(key);
      const wallTop = L.wallTop, floorY = L.floorY;
      // chimney
      if (s.chimney) {
        const chX = W * 0.72;
        SC.siding(ctx, chX, wallTop - 190, 70, 190, 0x9A5A48, 'brick', R);
        ctx.fillStyle = '#6E3F32'; ctx.fillRect(chX - 6, wallTop - 196, 82, 14);
      }
      // roof
      const roofH = s.stories === 2 ? 150 : 170;
      ctx.beginPath();
      ctx.moveTo(-10, wallTop + 6); ctx.lineTo(W * 0.2, wallTop - roofH); ctx.lineTo(W * 0.8, wallTop - roofH); ctx.lineTo(W + 10, wallTop + 6); ctx.closePath();
      ctx.fillStyle = cv.lin(ctx, 0, wallTop - roofH, 0, wallTop, [[0, S(s.roof, 0.12)], [1, S(s.roof, -0.18)]]);
      ctx.fill();
      ctx.save(); ctx.clip();
      for (let y = wallTop - roofH + 10; y < wallTop + 6; y += 16) {
        ctx.fillStyle = 'rgba(0,0,0,0.16)'; ctx.fillRect(0, y, W, 2);
        for (let x = (y / 16 % 2) * 20; x < W; x += 40) { ctx.fillStyle = 'rgba(0,0,0,0.08)'; ctx.fillRect(x, y, 2, 16); }
      }
      if (s.snow) { ctx.fillStyle = 'rgba(248,250,255,0.95)'; ctx.fillRect(0, wallTop - roofH, W, 26); }
      ctx.restore();
      // gutter
      cv.rr(ctx, -14, wallTop, W + 28, 14, 4); ctx.fillStyle = cv.c(S(s.trim, -0.12)); ctx.fill();
      // walls
      SC.siding(ctx, 20, wallTop + 14, W - 40, floorY - wallTop - 14, s.wall, s.siding, R);
      ctx.fillStyle = cv.c(s.trim); ctx.fillRect(20, wallTop + 14, 12, floorY - wallTop - 14); ctx.fillRect(W - 32, wallTop + 14, 12, floorY - wallTop - 14);
      // floor band between stories
      if (s.stories === 2) { ctx.fillStyle = cv.c(S(s.trim, -0.05)); ctx.fillRect(20, floorY - 262, W - 40, 10); }
      // foundation
      ctx.fillStyle = cv.lin(ctx, 0, floorY, 0, H, [[0, '#9A96A0'], [1, '#77737E']]);
      ctx.fillRect(20, floorY, W - 40, H - floorY);
      ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 2;
      for (let x = 40; x < W - 30; x += 70) { ctx.beginPath(); ctx.moveTo(x, floorY); ctx.lineTo(x, H); ctx.stroke(); }

      // windows
      const winW = 120, winH = 140;
      const ground = [];
      const leftSpace = L.stepsX0 - 60;
      for (let x = 70; x + winW < leftSpace; x += winW + 110) ground.push(x);
      for (let x = L.porchX1 + 70; x + winW < W - 60; x += winW + 110) ground.push(x);
      if (L.doorX - L.porchX0 > 250) ground.push(L.porchX0 + 60);
      ground.forEach(x => SC.window(ctx, x, floorY - 190, winW, winH, { trim: s.trim, shutters: s.shutters, curtain: s.curtain, box: R() < 0.5 && s.flowers, lit: s.lit }));
      if (s.stories === 2) {
        const n = Math.max(2, Math.floor((W - 120) / 240));
        for (let i = 0; i < n; i++) {
          const x = 60 + (i + 0.5) * (W - 120) / n - winW / 2;
          SC.window(ctx, x, floorY - 440, winW, 130, { trim: s.trim, shutters: s.shutters, curtain: s.curtain, lit: s.lit && R() < 0.6 });
        }
      }
      // garage
      if (s.garage) {
        const gx = W - 330, gw = 280, gh = 210;
        ctx.fillStyle = cv.c(s.trim); ctx.fillRect(gx - 10, H - gh - 10, gw + 20, gh + 10);
        ctx.fillStyle = cv.lin(ctx, 0, H - gh, 0, H, [[0, '#F0EEF4'], [1, '#C9C6D2']]); ctx.fillRect(gx, H - gh, gw, gh);
        ctx.fillStyle = 'rgba(0,0,0,0.12)';
        for (let y = H - gh + 44; y < H; y += 46) ctx.fillRect(gx, y, gw, 3);
      }

      // porch deck + back wall shade
      ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(L.porchX0, floorY - 300, s.porchW, 300);
      // door frame + transom
      const dx = L.doorX - L.doorW / 2;
      cv.shadow(ctx, 12, 4, 0.3);
      ctx.fillStyle = cv.c(s.trim); ctx.fillRect(dx - 14, L.doorTop - 52, L.doorW + 28, L.doorH + 52);
      cv.noShadow(ctx);
      ctx.fillStyle = cv.lin(ctx, 0, L.doorTop - 44, 0, L.doorTop - 8, [[0, '#CFE9F9'], [1, '#6E9CBF']]);
      ctx.fillRect(dx, L.doorTop - 44, L.doorW, 34);
      // door (dark recess; the door leaf is a separate sprite)
      ctx.fillStyle = '#1B1622'; ctx.fillRect(dx, L.doorTop, L.doorW, L.doorH);
      // porch light
      if (s.light) {
        cv.rr(ctx, L.lightX - 12, L.lightY - 26, 24, 44, 6); ctx.fillStyle = '#2A2432'; ctx.fill();
        cv.rr(ctx, L.lightX - 8, L.lightY - 20, 16, 30, 4); ctx.fillStyle = s.lit ? '#FFE9A8' : '#F4EED8'; ctx.fill();
        if (s.lit) { ctx.fillStyle = cv.rad(ctx, L.lightX, L.lightY, 0, 90, [[0, 'rgba(255,230,160,0.55)'], [1, 'rgba(255,230,160,0)']]); ctx.fillRect(L.lightX - 90, L.lightY - 90, 180, 180); }
      }
      if (s.bell) {
        cv.rr(ctx, L.bellX - 9, L.bellY - 14, 18, 28, 4); ctx.fillStyle = '#3A3444'; ctx.fill();
        ctx.beginPath(); ctx.arc(L.bellX, L.bellY, 5, 0, Math.PI * 2); ctx.fillStyle = '#FFD86A'; ctx.fill();
      }
      if (s.mailbox) {
        cv.rr(ctx, L.mailboxX - 26, L.mailboxY - 30, 52, 60, 6); ctx.fillStyle = '#2A2A30'; ctx.fill();
        ctx.fillStyle = '#4A4A52'; ctx.fillRect(L.mailboxX - 20, L.mailboxY - 12, 40, 5);
      }
      if (s.numberOn !== 'column' && s.number) SC.numberPlaque(ctx, L.numberX, L.numberY, String(s.number));
      // steps
      for (let k = 0; k < s.steps; k++) {
        const x0 = L.porchX0 - (s.steps - k) * OTR.scenery.STEP_W;
        const top = H - (k + 1) * OTR.scenery.STEP_H;
        ctx.fillStyle = cv.lin(ctx, 0, top, 0, H, [[0, '#B8AFA4'], [1, '#8C8479']]);
        ctx.fillRect(x0, top, OTR.scenery.STEP_W * (s.steps - k) + 4, H - top);
        ctx.fillStyle = s.snow ? '#F4F8FF' : '#D6CEC2'; ctx.fillRect(x0 - 4, top, OTR.scenery.STEP_W + 4, 6);
      }
      // porch floor slab
      ctx.fillStyle = cv.lin(ctx, 0, floorY, 0, floorY + 20, [[0, '#B79270'], [1, '#86684E']]);
      ctx.fillRect(L.porchX0, floorY, s.porchW, 18);
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(L.porchX0, floorY + 18, s.porchW, H - floorY - 18);
      // lattice under porch
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 3;
      ctx.save(); ctx.beginPath(); ctx.rect(L.porchX0, floorY + 18, s.porchW, H - floorY - 18); ctx.clip();
      for (let x = L.porchX0 - 80; x < L.porchX1 + 80; x += 22) {
        ctx.beginPath(); ctx.moveTo(x, floorY + 18); ctx.lineTo(x + 80, H); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x + 80, floorY + 18); ctx.lineTo(x, H); ctx.stroke();
      }
      ctx.restore();
      // doormat
      cv.rr(ctx, L.doorX - 60, floorY - 6, 120, 10, 3); ctx.fillStyle = '#8C3A34'; ctx.fill();
      // foundation bushes
      if (s.bushes) {
        const fl = s.flowers ? ['#FF7A9A', '#FFD34D', '#FFFFFF', '#C07AF0'] : null;
        SC.bush(ctx, 40, H, Math.max(60, L.stepsX0 - 70), 70, s.bushes, R, { flowers: fl, snow: s.snow });
        if (L.porchX1 + 40 < W - 60) SC.bush(ctx, L.porchX1 + 20, H, W - L.porchX1 - 60, 64, S(s.bushes, 0.08), R, { flowers: fl, snow: s.snow });
      }
    });

    // front layer: porch roof, columns, railings and the stair handrail (drawn over characters)
    OTR.tex.make(scene, frontKey, W, H, (ctx) => {
      const floorY = L.floorY;
      const colTop = floorY - 300;
      // porch roof
      ctx.fillStyle = cv.lin(ctx, 0, colTop - 46, 0, colTop, [[0, S(s.roof, 0.1)], [1, S(s.roof, -0.2)]]);
      ctx.beginPath(); ctx.moveTo(L.porchX0 - 30, colTop); ctx.lineTo(L.porchX0 - 6, colTop - 46); ctx.lineTo(L.porchX1 + 6, colTop - 46); ctx.lineTo(L.porchX1 + 30, colTop); ctx.closePath(); ctx.fill();
      if (s.snow) { ctx.fillStyle = 'rgba(248,250,255,0.95)'; ctx.fillRect(L.porchX0 - 6, colTop - 50, s.porchW + 12, 12); }
      ctx.fillStyle = cv.c(s.trim); ctx.fillRect(L.porchX0 - 30, colTop, s.porchW + 60, 16);
      // columns
      const cols = s.porchW > 380 ? [L.porchX0 + 8, (L.porchX0 + L.porchX1) / 2 - 12, L.porchX1 - 32] : [L.porchX0 + 8, L.porchX1 - 32];
      cols.forEach(cx => {
        ctx.fillStyle = cv.lin(ctx, cx, 0, cx + 24, 0, [[0, S(s.trim, -0.15)], [0.5, s.trim], [1, S(s.trim, -0.1)]]);
        ctx.fillRect(cx, colTop + 16, 24, floorY - colTop - 16);
        ctx.fillStyle = cv.c(S(s.trim, -0.1)); ctx.fillRect(cx - 5, floorY - 14, 34, 14); ctx.fillRect(cx - 4, colTop + 16, 32, 10);
      });
      if (s.numberOn === 'column' && s.number) SC.numberPlaque(ctx, L.numberX, L.numberY, String(s.number), { size: 22 });
      // front railing (leaves the stair opening on the left)
      if (s.railing) {
        const rx0 = L.porchX0 + 32, rx1 = L.porchX1 - 8;
        ctx.fillStyle = cv.c(s.trim);
        ctx.fillRect(rx0, floorY - 78, rx1 - rx0, 8);
        ctx.fillRect(rx0, floorY - 16, rx1 - rx0, 6);
        for (let x = rx0 + 10; x < rx1; x += 26) ctx.fillRect(x, floorY - 72, 7, 58);
        // stair handrail
        const top0 = OTR.scenery.GROUND; // unused, keeps the intent clear
        const hx0 = L.stepsX0 - 4, hy0 = H - 74, hx1 = L.porchX0 + 12, hy1 = floorY - 74;
        ctx.strokeStyle = cv.c(S(s.trim, -0.05)); ctx.lineWidth = 7; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(hx0, hy0); ctx.lineTo(hx1, hy1); ctx.stroke();
        ctx.lineWidth = 6;
        ctx.beginPath(); ctx.moveTo(hx0, hy0); ctx.lineTo(hx0, H - 4); ctx.stroke();
        void top0;
      }
    }, { trim: true });

    const doorKey = `door_${OTR.rig.hash([s.door, s.wreath])}`;
    OTR.tex.make(scene, doorKey, 108, 228, (ctx, w, h) => {
      ctx.fillStyle = cv.lin(ctx, 0, 0, w, 0, [[0, S(s.door, -0.2)], [0.5, S(s.door, 0.08)], [1, S(s.door, -0.12)]]);
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 3;
      cv.rr(ctx, 14, 16, w - 28, 80, 4); ctx.stroke();
      cv.rr(ctx, 14, 112, w - 28, 96, 4); ctx.stroke();
      ctx.beginPath(); ctx.arc(w - 18, 118, 6, 0, Math.PI * 2); ctx.fillStyle = '#E8C45A'; ctx.fill();
      ctx.fillStyle = '#B99A4A'; ctx.fillRect(w / 2 - 14, 150, 28, 6);
      if (s.wreath) {
        ctx.lineWidth = 12; ctx.strokeStyle = '#2E7A46'; ctx.beginPath(); ctx.arc(w / 2, 60, 26, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = '#D8304A'; ctx.beginPath(); ctx.arc(w / 2, 86, 6, 0, Math.PI * 2); ctx.fill();
      }
    });
    const doorOpenKey = 'door_open_generic';
    OTR.tex.make(scene, doorOpenKey, 108, 228, (ctx, w, h) => {
      ctx.fillStyle = cv.lin(ctx, 0, 0, 0, h, [[0, '#4A3E36'], [1, '#2A221E']]); ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = cv.rad(ctx, w / 2, 40, 2, 120, [[0, 'rgba(255,220,160,0.55)'], [1, 'rgba(255,220,160,0)']]); ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(0, h - 30, w, 30);
      // door leaf swung inward, seen edge-on
      ctx.fillStyle = cv.c(S(s.door, -0.25)); ctx.fillRect(w - 18, 0, 18, h);
    });

    return { key, frontKey, doorKey, doorOpenKey, layout: L };
  },

  /* ================================================================= apartment / storefront */
  buildingDefaults: {
    style: 'apartment', w: 1100, wall: 0xA65A48, siding: 'brick', trim: 0xEDE6DA, door: 0x3A4658,
    number: '1200', name: 'MAPLE COURT', awning: 0x2F6B5A, hours: '9AM – 5PM', open: true, lit: false, snow: false
  },

  buildingLayout(spec) {
    const s = Object.assign({}, OTR.scenery.buildingDefaults, spec);
    const H = 700, steps = s.steps !== undefined ? s.steps : 1;
    const floorY = H - steps * OTR.scenery.STEP_H;
    const doorX = s.doorX || s.w * 0.5;
    return {
      s, w: s.w, h: H, floorY, steps, doorX, doorW: 150, doorH: 236, doorTop: floorY - 236,
      stepsX0: doorX - 170 - steps * OTR.scenery.STEP_W, stepsX1: doorX - 170,
      porchX0: doorX - 170, porchX1: doorX + 170,
      panelX: doorX + 118, panelY: floorY - 140,
      numberX: doorX, numberY: s.style === 'business' ? floorY - 330 : floorY - 300,   // a shop's number sits above its awning
      signX: doorX + 250, signY: floorY - 150
    };
  },

  building(scene, spec) {
    const L = OTR.scenery.buildingLayout(spec);
    const s = L.s, id = OTR.rig.hash(s);
    const key = `bldg_${id}`, frontKey = `bldgf_${id}`;
    const cv = OTR.cv, S = OTR.color.shade, SC = OTR.scenery;
    const W = s.w, H = L.h;
    OTR.tex.make(scene, key, W, H, (ctx) => {
      const R = SC.rng(key);
      SC.siding(ctx, 0, 0, W, L.floorY, s.wall, s.siding, R);
      // parapet
      ctx.fillStyle = cv.c(S(s.trim, -0.1)); ctx.fillRect(0, 0, W, 18);
      if (s.style === 'business') {
        // storefront band
        ctx.fillStyle = cv.c(s.trim); ctx.fillRect(0, L.floorY - 330, W, 24);
        const winY = L.floorY - 280, winH = 220;
        [[40, L.doorX - L.doorW / 2 - 60], [L.doorX + L.doorW / 2 + 60, W - 40]].forEach(([x0, x1]) => {
          ctx.fillStyle = '#2F2A38'; ctx.fillRect(x0 - 8, winY - 8, x1 - x0 + 16, winH + 16);
          ctx.fillStyle = s.lit ? cv.lin(ctx, 0, winY, 0, winY + winH, [[0, '#FFE8B0'], [1, '#E0A868']]) : cv.lin(ctx, x0, winY, x1, winY + winH, [[0, '#CDEBFA'], [0.5, '#6C9CC0'], [1, '#34597A']]);
          ctx.fillRect(x0, winY, x1 - x0, winH);
          // shelves / displays inside
          ctx.fillStyle = 'rgba(40,30,50,0.35)';
          for (let x = x0 + 30; x < x1 - 60; x += 120) { ctx.fillRect(x, winY + 110, 70, 110); ctx.fillStyle = OTR.util.pick(['rgba(255,120,80,0.6)', 'rgba(80,160,255,0.55)', 'rgba(255,210,80,0.6)']); ctx.fillRect(x + 8, winY + 120, 24, 30); ctx.fillStyle = 'rgba(40,30,50,0.35)'; }
          ctx.fillStyle = 'rgba(255,255,255,0.28)';
          ctx.beginPath(); ctx.moveTo(x0 + 40, winY); ctx.lineTo(x0 + 110, winY); ctx.lineTo(x0 + 30, winY + winH); ctx.lineTo(x0, winY + winH); ctx.lineTo(x0, winY + 40); ctx.closePath(); ctx.fill();
        });
        // sign board
        cv.shadow(ctx, 10, 4, 0.3);
        cv.rr(ctx, W * 0.5 - 260, L.floorY - 430, 520, 80, 8); ctx.fillStyle = cv.c(s.awning); ctx.fill();
        cv.noShadow(ctx);
        ctx.fillStyle = '#FFFFFF'; ctx.font = '900 42px "Segoe UI", Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(s.name, W * 0.5, L.floorY - 388);
        // upper windows
        for (let x = 80; x < W - 160; x += 200) SC.window(ctx, x, 60, 110, 120, { trim: s.trim, curtain: false, lit: s.lit && R() < 0.5 });
      } else {
        for (let fl = 0; fl < 3; fl++) {
          for (let x = 70; x < W - 150; x += 190) {
            if (fl === 2 && Math.abs(x + 55 - L.doorX) < 220) continue;
            const y = 50 + fl * 190;
            SC.window(ctx, x, y, 110, 120, { trim: s.trim, curtain: R() < 0.7 ? OTR.util.pick([0xF2E6F7, 0xDDEBFF, 0xFFF1D6]) : false, lit: s.lit && R() < 0.5, box: R() < 0.2 });
            if (R() < 0.25) { cv.rr(ctx, x + 26, y + 92, 58, 36, 3); ctx.fillStyle = '#C9C6D0'; ctx.fill(); ctx.fillStyle = 'rgba(0,0,0,0.3)'; for (let k = 0; k < 4; k++) ctx.fillRect(x + 32, y + 98 + k * 7, 46, 2); }
          }
        }
        // canopy + number
        SC.numberPlaque(ctx, L.numberX, L.numberY - 70, `${s.number}  ${s.name}`, { size: 26, bg: '#1F2A36', border: '#C9B37A' });
      }
      // entry
      const dx = L.doorX - L.doorW / 2;
      ctx.fillStyle = cv.c(s.trim); ctx.fillRect(dx - 16, L.doorTop - 20, L.doorW + 32, L.doorH + 20);
      ctx.fillStyle = '#1B1622'; ctx.fillRect(dx, L.doorTop, L.doorW, L.doorH);
      // buzzer / intercom panel
      if (s.style !== 'business') {
        cv.rr(ctx, L.panelX - 22, L.panelY - 44, 44, 88, 5); ctx.fillStyle = '#B8B6C0'; ctx.fill();
        ctx.fillStyle = '#2A2A34'; ctx.fillRect(L.panelX - 14, L.panelY - 36, 28, 16);
        for (let r = 0; r < 4; r++) for (let c = 0; c < 2; c++) { ctx.beginPath(); ctx.arc(L.panelX - 8 + c * 16, L.panelY - 6 + r * 13, 4, 0, Math.PI * 2); ctx.fillStyle = '#5A5866'; ctx.fill(); }
      } else {
        // hours placard next to the door
        cv.rr(ctx, L.doorX + L.doorW / 2 + 22, L.floorY - 190, 70, 90, 4); ctx.fillStyle = '#FFFFFF'; ctx.fill();
        ctx.fillStyle = '#2A2438'; ctx.font = '900 12px "Segoe UI", Arial'; ctx.textAlign = 'center';
        ctx.fillText('HOURS', L.doorX + L.doorW / 2 + 57, L.floorY - 170);
        ctx.font = '700 10px "Segoe UI", Arial';
        String(s.hours).split('\n').forEach((ln, i) => ctx.fillText(ln, L.doorX + L.doorW / 2 + 57, L.floorY - 150 + i * 14));
        ctx.fillStyle = s.open ? '#2BC48A' : '#E8304A'; ctx.font = '900 12px "Segoe UI", Arial';
        ctx.fillText(s.open ? 'OPEN' : 'CLOSED', L.doorX + L.doorW / 2 + 57, L.floorY - 112);
        SC.numberPlaque(ctx, L.numberX, L.numberY, String(s.number), { size: 22 });
      }
      // steps
      for (let k = 0; k < L.steps; k++) {
        const x0 = L.stepsX1 - (L.steps - k) * OTR.scenery.STEP_W, top = H - (k + 1) * OTR.scenery.STEP_H;
        ctx.fillStyle = '#B2AEB8'; ctx.fillRect(x0, top, (L.steps - k) * OTR.scenery.STEP_W + (L.porchX1 - L.porchX0) + 40, H - top);
        ctx.fillStyle = s.snow ? '#F4F8FF' : '#D2CED8'; ctx.fillRect(x0 - 4, top, OTR.scenery.STEP_W + 4, 5);
      }
      ctx.fillStyle = '#C6C2CC'; ctx.fillRect(L.porchX0, L.floorY, L.porchX1 - L.porchX0 + 40, 10);
    });
    OTR.tex.make(scene, frontKey, W, H, (ctx) => {
      if (s.style === 'business') {
        // striped awning over the door
        const ax0 = L.doorX - 190, ax1 = L.doorX + 190, ay = L.doorTop - 60;
        for (let x = ax0, i = 0; x < ax1; x += 38, i++) {
          ctx.fillStyle = i % 2 ? '#FFFFFF' : cv.c(s.awning);
          ctx.beginPath(); ctx.moveTo(x, ay); ctx.lineTo(x + 38, ay); ctx.lineTo(x + 46, ay + 60); ctx.lineTo(x - 8, ay + 60); ctx.closePath(); ctx.fill();
        }
        ctx.fillStyle = cv.c(S(s.awning, -0.3)); ctx.fillRect(ax0 - 8, ay + 56, ax1 - ax0 + 16, 10);
      } else {
        const cy = L.doorTop - 40;
        ctx.fillStyle = cv.c(S(s.trim, -0.35)); ctx.fillRect(L.doorX - 200, cy, 400, 26);
        ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(L.doorX - 200, cy + 26, 400, 8);
        ctx.strokeStyle = '#3A3444'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(L.doorX - 180, cy); ctx.lineTo(L.doorX - 150, cy - 90); ctx.moveTo(L.doorX + 180, cy); ctx.lineTo(L.doorX + 150, cy - 90); ctx.stroke();
      }
    }, { trim: true });
    const doorKey = `gdoor_${OTR.rig.hash([s.door, s.style, s.open])}`;
    OTR.tex.make(scene, doorKey, 150, 236, (ctx, w, h) => {
      [[0, w / 2 - 2], [w / 2 + 2, w]].forEach(([x0, x1]) => {
        ctx.fillStyle = cv.c(s.door); ctx.fillRect(x0, 0, x1 - x0, h);
        ctx.fillStyle = s.lit ? 'rgba(255,230,170,0.85)' : 'rgba(170,210,235,0.85)'; ctx.fillRect(x0 + 10, 12, x1 - x0 - 20, h - 50);
        ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(x0 + 16, 16, 8, h - 60);
        ctx.fillStyle = '#C8C8D0'; ctx.fillRect(x0 === 0 ? x1 - 16 : x0 + 8, 100, 8, 50);
      });
      if (s.style === 'business' && !s.open) {
        cv.rr(ctx, 20, 60, 110, 34, 4); ctx.fillStyle = '#FFFFFF'; ctx.fill();
        ctx.fillStyle = '#E8304A'; ctx.font = '900 20px "Segoe UI", Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('CLOSED', 75, 78);
      }
    });
    return { key, frontKey, doorKey, doorOpenKey: doorKey, layout: L };
  },

  /* ================================================================= interiors */
  /** Lobby / reception / pickup counter. spec: { kind: 'lobby'|'counter', wall, sign, w } */
  interior(scene, spec) {
    const s = Object.assign({ kind: 'lobby', wall: 0xE7E2EE, accent: 0x3DA5FF, sign: 'BRIGHTLINE', w: 1600, counterX: 1050, lit: true }, spec);
    const id = OTR.rig.hash(s);
    const key = `int_${id}`, frontKey = `intf_${id}`;
    const H = 700, W = s.w;
    const cv = OTR.cv, S = OTR.color.shade, SC = OTR.scenery;
    const layout = { w: W, h: H, floorY: H, counterX: s.counterX, counterTop: H - 104, entryX: 120, elevatorX: 520 };
    OTR.tex.make(scene, key, W, H, (ctx) => {
      const R = SC.rng(key);
      ctx.fillStyle = cv.lin(ctx, 0, 0, 0, H, [[0, S(s.wall, 0.05)], [1, S(s.wall, -0.12)]]); ctx.fillRect(0, 0, W, H);
      // wainscot
      ctx.fillStyle = cv.c(S(s.wall, -0.2)); ctx.fillRect(0, H - 180, W, 180);
      ctx.fillStyle = cv.c(S(s.wall, -0.3)); ctx.fillRect(0, H - 184, W, 8);
      // ceiling lights
      for (let x = 160; x < W; x += 320) {
        ctx.fillStyle = '#FFFFFF'; cv.rr(ctx, x - 60, 10, 120, 12, 6); ctx.fill();
        ctx.fillStyle = cv.lin(ctx, 0, 22, 0, 260, [[0, 'rgba(255,250,230,0.35)'], [1, 'rgba(255,250,230,0)']]);
        ctx.beginPath(); ctx.moveTo(x - 60, 22); ctx.lineTo(x + 60, 22); ctx.lineTo(x + 160, 300); ctx.lineTo(x - 160, 300); ctx.closePath(); ctx.fill();
      }
      // entry glass door frame on the left
      ctx.fillStyle = '#3A3444'; ctx.fillRect(40, H - 300, 170, 300);
      ctx.fillStyle = 'rgba(170,215,240,0.7)'; ctx.fillRect(52, H - 288, 146, 288);
      ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(70, H - 280, 12, 270);
      // elevator
      ctx.fillStyle = '#9E9AA8'; ctx.fillRect(layout.elevatorX - 90, H - 330, 180, 330);
      ctx.fillStyle = cv.lin(ctx, layout.elevatorX - 80, 0, layout.elevatorX + 80, 0, [[0, '#C9C7D2'], [0.5, '#EEEDF3'], [1, '#B8B6C2']]);
      ctx.fillRect(layout.elevatorX - 78, H - 318, 76, 318); ctx.fillRect(layout.elevatorX + 2, H - 318, 76, 318);
      cv.rr(ctx, layout.elevatorX + 96, H - 190, 18, 40, 4); ctx.fillStyle = '#3A3444'; ctx.fill();
      // wall sign
      if (s.sign) {
        // over the counter, but whole in the view from the entrance (the camera starts at the lobby's left edge)
        const sx = Math.min(s.counterX, OTR.W - 290);
        ctx.fillStyle = cv.c(s.accent); cv.rr(ctx, sx - 250, 120, 500, 90, 10); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = '900 48px "Segoe UI", Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(s.sign, sx, 166);
      }
      // plants + chairs
      [[820, 1], [W - 120, 1]].forEach(([px]) => {
        cv.rr(ctx, px - 30, H - 90, 60, 90, 8); ctx.fillStyle = '#E0DCE6'; ctx.fill();
        SC.bush(ctx, px - 60, H - 80, 120, 150, 0x3E8B4A, R);
      });
      if (s.kind === 'counter') {
        // back shelving with parcels
        ctx.fillStyle = '#8A8494'; ctx.fillRect(s.counterX - 300, H - 460, 600, 300);
        for (let r = 0; r < 3; r++) {
          ctx.fillStyle = '#6E6878'; ctx.fillRect(s.counterX - 300, H - 460 + r * 100 + 90, 600, 8);
          for (let x = s.counterX - 290; x < s.counterX + 280; x += 60 + R() * 30) {
            const bw = 40 + R() * 30, bh = 40 + R() * 40;
            OTR.draw.box(ctx, { fw: bw, fh: bh, d: 10, x, y: H - 460 + r * 100 + 90 - bh, color: OTR.util.pick([0xC99A62, 0xB88A55, 0xD8B080, 0xF2F0F4]) });
          }
        }
      }
    });
    OTR.tex.make(scene, frontKey, W, H, (ctx) => {
      const cx = s.counterX, top = layout.counterTop;
      cv.shadow(ctx, 16, 6, 0.3);
      ctx.fillStyle = cv.lin(ctx, 0, top, 0, H, [[0, '#5B4A6E'], [1, '#3A2E48']]);
      ctx.fillRect(cx - 230, top + 14, 460, H - top - 14);
      cv.noShadow(ctx);
      ctx.fillStyle = cv.lin(ctx, 0, top, 0, top + 18, [[0, '#F4F0F8'], [1, '#C9C3D2']]);
      ctx.fillRect(cx - 250, top, 500, 18);
      ctx.fillStyle = cv.c(s.accent); ctx.fillRect(cx - 230, top + 44, 460, 8);
      if (s.kind === 'counter') {
        ctx.fillStyle = '#2A2432'; cv.rr(ctx, cx + 120, top - 70, 90, 70, 6); ctx.fill();
        ctx.fillStyle = '#7FD4FF'; ctx.fillRect(cx + 128, top - 62, 74, 48);
      } else {
        ctx.fillStyle = '#2A2432'; cv.rr(ctx, cx - 180, top - 64, 100, 64, 5); ctx.fill();
        ctx.fillStyle = '#8FD3FF'; ctx.fillRect(cx - 172, top - 56, 84, 44);
        ctx.fillStyle = '#FFFFFF'; cv.rr(ctx, cx + 90, top - 22, 60, 22, 3); ctx.fill();
      }
    }, { trim: true });
    return { key, frontKey, layout };
  },

  /* ================================================================= delivery van (side) */
  vanLayout() {
    return { w: 620, h: 340, floorY: 262, stepY: 296, doorX0: 440, doorX1: 520, handleX: 432, cargoDoorX: 36, hazards: [[600, 250], [18, 250]] };
  },

  /** state: 'closed' | 'open' */
  van(scene, state) {
    const key = `van_side_big_${state || 'closed'}`;
    const L = OTR.scenery.vanLayout();
    OTR.tex.make(scene, key, L.w, L.h, (ctx, w, h) => {
      const cv = OTR.cv;
      const brand = OTR_DATA.config.brand || '';
      // ground shadow
      cv.ellipse(ctx, w * 0.5, h - 6, w * 0.47, 12); ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fill();
      // cargo box
      ctx.fillStyle = cv.lin(ctx, 0, 14, 0, 290, [[0, '#FFFFFF'], [0.7, '#ECE9F2'], [1, '#C9C5D4']]);
      cv.rr(ctx, 14, 14, 420, 280, 14); ctx.fill();
      // roof cap + rear door seam
      ctx.fillStyle = '#DAD6E2'; cv.rr(ctx, 14, 14, 420, 16, 8); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(40, 30); ctx.lineTo(40, 286); ctx.stroke();
      // cab
      ctx.beginPath();
      ctx.moveTo(430, 30); ctx.lineTo(540, 30); ctx.quadraticCurveTo(560, 32, 572, 70);
      ctx.lineTo(606, 196); ctx.quadraticCurveTo(612, 214, 612, 234); ctx.lineTo(612, 290); ctx.lineTo(430, 290); ctx.closePath();
      ctx.fillStyle = cv.lin(ctx, 0, 30, 0, 290, [[0, '#FFFFFF'], [0.7, '#ECE9F2'], [1, '#C9C5D4']]); ctx.fill();
      // windshield
      ctx.beginPath(); ctx.moveTo(532, 44); ctx.lineTo(558, 48); ctx.lineTo(596, 190); ctx.lineTo(532, 190); ctx.closePath();
      ctx.fillStyle = cv.lin(ctx, 532, 44, 596, 190, [[0, '#9FD0F0'], [0.5, '#2E5578'], [1, '#1A3048']]); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.beginPath(); ctx.moveTo(542, 52); ctx.lineTo(552, 54); ctx.lineTo(548, 150); ctx.lineTo(538, 150); ctx.closePath(); ctx.fill();
      // brand band
      ctx.fillStyle = '#4D148C'; ctx.fillRect(14, 196, 598, 30);
      ctx.fillStyle = '#FF6600'; ctx.fillRect(14, 226, 598, 8);
      ctx.fillStyle = '#4D148C'; ctx.font = '900 64px "Segoe UI", Arial'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.fillText(brand, 90, 150);
      const bw = ctx.measureText(brand).width;
      ctx.fillStyle = '#FF6600'; ctx.font = '900 30px "Segoe UI", Arial';
      ctx.fillText('ON THE ROUTE', 94 + bw * 0.02, 184);
      // cab doorway
      const d0 = L.doorX0, d1 = L.doorX1;
      if (state === 'open') {
        ctx.fillStyle = cv.lin(ctx, 0, 44, 0, 290, [[0, '#2C2834'], [1, '#18151E']]);
        ctx.fillRect(d0, 44, d1 - d0, 246);
        // seat + wheel silhouette
        ctx.fillStyle = '#3E3A48'; cv.rr(ctx, d1 - 44, 150, 40, 90, 8); ctx.fill();
        ctx.strokeStyle = '#4A4656'; ctx.lineWidth = 7; ctx.beginPath(); ctx.ellipse(d1 - 8, 140, 10, 26, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(d0, 44, 10, 246);
      } else {
        ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 3;
        cv.rr(ctx, d0, 44, d1 - d0, 246, 4); ctx.stroke();
        ctx.fillStyle = cv.lin(ctx, 0, 60, 0, 180, [[0, '#8FC4E6'], [1, '#2F5678']]); cv.rr(ctx, d0 + 10, 60, d1 - d0 - 20, 110, 4); ctx.fill();
        ctx.fillStyle = '#9A98A6'; ctx.fillRect(d1 - 24, 196, 16, 6);
      }
      // grab handle
      ctx.strokeStyle = cv.lin(ctx, 0, 90, 0, 250, [[0, '#F4F4FA'], [1, '#8A8898']]); ctx.lineWidth = 8; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(L.handleX, 96); ctx.lineTo(L.handleX, 250); ctx.stroke();
      // step
      ctx.fillStyle = '#2A2830'; ctx.fillRect(d0 - 6, L.stepY - 6, d1 - d0 + 12, 14);
      ctx.fillStyle = '#6A6878'; for (let x = d0; x < d1; x += 10) ctx.fillRect(x, L.stepY - 4, 5, 3);
      // bumper, lights
      cv.rr(ctx, 588, 272, 32, 22, 5); ctx.fillStyle = '#4A4852'; ctx.fill();
      cv.rr(ctx, 596, 214, 16, 26, 4); ctx.fillStyle = '#FFF2B0'; ctx.fill();
      cv.rr(ctx, 14, 200, 10, 30, 3); ctx.fillStyle = '#E8304A'; ctx.fill();
      // mirror
      ctx.fillStyle = '#2A2830'; cv.rr(ctx, 600, 60, 14, 50, 4); ctx.fill();
      // wheels
      [[130, 292], [520, 292]].forEach(([wx, wy]) => {
        ctx.beginPath(); ctx.arc(wx, wy, 50, Math.PI, 0); ctx.fillStyle = '#2A2830'; ctx.fill();
        ctx.beginPath(); ctx.arc(wx, wy, 40, 0, Math.PI * 2); ctx.fillStyle = '#1C1B22'; ctx.fill();
        ctx.beginPath(); ctx.arc(wx, wy, 22, 0, Math.PI * 2); ctx.fillStyle = cv.rad(ctx, wx - 5, wy - 5, 2, 22, [[0, '#F0F0F6'], [1, '#8A8898']]); ctx.fill();
        for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; ctx.beginPath(); ctx.arc(wx + Math.cos(a) * 13, wy + Math.sin(a) * 13, 2.5, 0, Math.PI * 2); ctx.fillStyle = '#6A6878'; ctx.fill(); }
      });
    });
    return { key, layout: L };
  },

  /* ================================================================= cargo interior (loading) */
  /** Full-screen shelving view used by the loading scenes. */
  cargo(scene, o) {
    o = o || {};
    const key = `cargo_bay_${o.mode || 'load'}`;
    return OTR.tex.make(scene, key, OTR.W, OTR.H, (ctx, w, h) => {
      const cv = OTR.cv, S = OTR.color.shade;
      const R = OTR.scenery.rng(key);
      // walls
      ctx.fillStyle = cv.lin(ctx, 0, 0, 0, h, [[0, '#55525F'], [0.5, '#413E4B'], [1, '#2C2A35']]);
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      for (let x = 0; x < w; x += 46) ctx.fillRect(x, 0, 3, h);
      // ceiling lights
      for (let x = 160; x < 980; x += 320) {
        cv.rr(ctx, x - 70, 62, 140, 12, 6); ctx.fillStyle = '#F4F1E0'; ctx.fill();
        ctx.fillStyle = cv.lin(ctx, 0, 74, 0, 300, [[0, 'rgba(255,250,225,0.22)'], [1, 'rgba(255,250,225,0)']]);
        ctx.beginPath(); ctx.moveTo(x - 70, 74); ctx.lineTo(x + 70, 74); ctx.lineTo(x + 170, 320); ctx.lineTo(x - 170, 320); ctx.closePath(); ctx.fill();
      }
      // shelf rails
      const rows = [230, 364, 498];
      rows.forEach(y => {
        ctx.fillStyle = cv.lin(ctx, 0, y, 0, y + 16, [[0, '#C9C6D2'], [1, '#7E7B88']]);
        ctx.fillRect(28, y, 880, 14);
        ctx.fillStyle = '#FF6600'; ctx.fillRect(28, y + 14, 880, 4);
        ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(28, y + 18, 880, 10);
      });
      // uprights + section labels
      const x0 = 34, x1 = 902, colW = (x1 - x0) / 3;
      ['A · STOPS 1-3', 'B · STOPS 4-6', 'C · STOPS 7-9'].forEach((lab, i) => {
        const cx = x0 + i * colW;
        ctx.fillStyle = 'rgba(255,255,255,0.10)';
        ctx.fillRect(cx - 6, 92, 5, 420);
        cv.rr(ctx, cx + 8, 84, colW - 26, 24, 10);
        ctx.fillStyle = i === 0 ? '#2BC48A' : i === 1 ? '#3DA5FF' : '#C86BE0'; ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = '900 14px "Segoe UI", Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(lab, cx + 8 + (colW - 26) / 2, 96);
      });
      ctx.fillStyle = 'rgba(255,255,255,0.10)'; ctx.fillRect(x1, 92, 5, 420);
      // Shelf ratings ride on the rail under each shelf, like a real shelf-edge label — inside the bay
      // they would sit behind the packages.
      ctx.save();
      ctx.font = '900 11px "Segoe UI", Arial'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(30,20,45,0.75)';
      [['TOP SHELF · LIGHT ONLY, UNDER 15 LB', 230], ['MIDDLE SHELF · UNDER 35 LB', 364], ['BOTTOM SHELF · HEAVY OK', 498]]
        .forEach(([lab, y]) => ctx.fillText(lab, 898, y + 7));
      ctx.restore();
      // floor
      ctx.fillStyle = cv.lin(ctx, 0, 512, 0, h, [[0, '#4A4754'], [1, '#33313C']]);
      ctx.fillRect(0, 512, w, h - 512);
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      for (let x = 10; x < w; x += 28) for (let y = 520; y < h; y += 28) { ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill(); }
      // hazmat floor zone
      const hz = x0 + 520;
      ctx.save();
      ctx.beginPath(); ctx.rect(hz, 520, 220, 150); ctx.clip();
      ctx.fillStyle = '#3A2410'; ctx.fillRect(hz, 520, 220, 150);
      ctx.fillStyle = 'rgba(232,163,61,0.55)';
      for (let i = -6; i < 16; i++) { ctx.save(); ctx.translate(hz + i * 28, 520); ctx.rotate(0.5); ctx.fillRect(0, -40, 12, 260); ctx.restore(); }
      ctx.restore();
      OTR.draw.mark(ctx, 'class3', hz + 186, 556, 22);
      ctx.fillStyle = '#FFD86A'; ctx.font = '900 13px "Segoe UI", Arial'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText('DANGEROUS GOODS', hz + 12, 542);
      // bulk bays labels
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillText('FLOOR / BULK', x0 + 22, 542);
      // rear door frame on the right
      ctx.fillStyle = '#26242E'; ctx.fillRect(922, 0, w - 922, h);
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(922, 0, 14, h);
      ctx.fillStyle = cv.c(S(0xE9E6F0, -0.1));
      for (let y = 40; y < h; y += 40) { ctx.fillStyle = y % 80 === 0 ? '#3A3744' : '#454250'; ctx.fillRect(944, y, w - 960, 34); }
      ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(944, 0, w - 960, h);
      void R;
    });
  },

  /* ================================================================= props */
  /** Returns texture key for a prop. Origin convention: bottom-centre on the ground. */
  prop(scene, type, o) {
    o = o || {};
    const cv = OTR.cv, S = OTR.color.shade;
    const key = `prop_${type}_${OTR.rig.hash(o)}`;
    const P = (w, h, fn) => OTR.tex.make(scene, key, w, h, (ctx) => fn(ctx, w, h));
    switch (type) {
      // A name, when given, is a plate on top of the box, big enough to read and high enough to clear the caption box
      // (it used to be 11 px on the post, down where the caption box starts).
      case 'mailbox': return P(o.name ? 96 : 70, o.name ? 186 : 150, (ctx, w, h) => {
        const t = o.name ? 36 : 0, cx = w / 2;
        ctx.fillStyle = '#5A4A3A'; ctx.fillRect(cx - 5, 50 + t, 10, h - 50 - t);
        cv.rr(ctx, cx - 29, 20 + t, 58, 36, 16); ctx.fillStyle = cv.c(o.color || 0x2F3A4A); ctx.fill();
        ctx.fillStyle = '#E8304A'; ctx.fillRect(cx + 17, 8 + t, 5, 22); ctx.fillRect(cx + 17, 8 + t, 14, 8);
        if (o.number) { ctx.fillStyle = '#fff'; ctx.font = '900 13px "Segoe UI"'; ctx.textAlign = 'center'; ctx.fillText(o.number, cx - 4, 44 + t); }
        if (o.name) {
          cv.rr(ctx, 2, 2, w - 4, 28, 5); ctx.fillStyle = '#F4F0E6'; ctx.fill();
          ctx.strokeStyle = '#6A5A48'; ctx.lineWidth = 2; ctx.stroke();
          ctx.fillStyle = '#2A2A30'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          cv.fitText(ctx, o.name, cx, 17, w - 14, 17);
          ctx.fillStyle = '#6A5A48'; ctx.fillRect(cx - 2, 30, 4, t - 10 + 20);
        }
      });
      case 'planter': return P(90, 110, (ctx, w, h) => {
        cv.rr(ctx, 15, 56, 60, 54, 8); ctx.fillStyle = cv.c(o.color || 0xC8683E); ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fillRect(15, 56, 60, 8);
        OTR.scenery.bush(ctx, 5, 64, 80, 70, 0x3E9B55, OTR.scenery.rng(key), { flowers: ['#FF7A9A', '#FFD34D'] });
      });
      case 'hose': return P(150, 40, (ctx, w, h) => {
        ctx.strokeStyle = '#2E8A4A'; ctx.lineWidth = 6; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(0, 30); ctx.bezierCurveTo(30, 10, 60, 40, 90, 24); ctx.bezierCurveTo(110, 14, 130, 36, 150, 22); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 2; ctx.stroke();
      });
      case 'skateboard': return P(90, 30, (ctx) => {
        cv.rr(ctx, 4, 8, 82, 10, 5); ctx.fillStyle = '#E8504A'; ctx.fill();
        [18, 72].forEach(x => { ctx.beginPath(); ctx.arc(x, 22, 6, 0, Math.PI * 2); ctx.fillStyle = '#FFE08A'; ctx.fill(); });
      });
      case 'toys': return P(90, 44, (ctx) => {
        ctx.beginPath(); ctx.arc(20, 30, 13, 0, Math.PI * 2); ctx.fillStyle = '#3DA5FF'; ctx.fill();
        ctx.fillStyle = '#fff'; ctx.fillRect(8, 28, 24, 4);
        cv.rr(ctx, 42, 20, 40, 18, 4); ctx.fillStyle = '#FFC83D'; ctx.fill();
        [50, 74].forEach(x => { ctx.beginPath(); ctx.arc(x, 38, 5, 0, Math.PI * 2); ctx.fillStyle = '#333'; ctx.fill(); });
      });
      case 'ice': return P(o.w || 140, 24, (ctx, w, h) => {
        cv.ellipse(ctx, w / 2, h / 2, w / 2 - 2, h / 2 - 2);
        ctx.fillStyle = cv.lin(ctx, 0, 0, w, 0, [[0, 'rgba(200,235,255,0.55)'], [0.5, 'rgba(240,250,255,0.9)'], [1, 'rgba(190,225,250,0.55)']]); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(w * 0.3, h * 0.4); ctx.lineTo(w * 0.5, h * 0.35); ctx.moveTo(w * 0.6, h * 0.6); ctx.lineTo(w * 0.8, h * 0.5); ctx.stroke();
      });
      case 'puddle': return P(o.w || 160, 26, (ctx, w, h) => {
        cv.ellipse(ctx, w / 2, h / 2, w / 2 - 2, h / 2 - 2);
        ctx.fillStyle = 'rgba(90,120,160,0.55)'; ctx.fill();
        ctx.fillStyle = 'rgba(220,235,255,0.5)'; cv.ellipse(ctx, w * 0.4, h * 0.4, w * 0.2, 3); ctx.fill();
      });
      case 'sign': return P(120, 170, (ctx, w, h) => {
        ctx.fillStyle = '#6A5038'; ctx.fillRect(w / 2 - 5, 70, 10, h - 70);
        cv.shadow(ctx, 6, 3, 0.3);
        cv.rr(ctx, 6, 6, w - 12, 76, 6); ctx.fillStyle = o.bg || '#FFD34D'; ctx.fill();
        cv.noShadow(ctx);
        ctx.strokeStyle = '#1E1414'; ctx.lineWidth = 3; cv.rr(ctx, 11, 11, w - 22, 66, 4); ctx.stroke();
        ctx.fillStyle = o.color || '#1E1414'; ctx.font = '900 15px "Segoe UI"'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        String(o.text || 'BEWARE\nOF DOG').split('\n').forEach((ln, i, arr) => ctx.fillText(ln, w / 2, 44 + (i - (arr.length - 1) / 2) * 18));
      });
      case 'fence': return P(o.w || 300, 120, (ctx, w, h) => {
        const col = o.color || 0xFFFFFF;
        ctx.fillStyle = cv.c(S(col, -0.1)); ctx.fillRect(0, 44, w, 10); ctx.fillRect(0, 88, w, 10);
        for (let x = 4; x < w; x += 26) {
          ctx.fillStyle = cv.c(col);
          ctx.beginPath(); ctx.moveTo(x, h); ctx.lineTo(x, 16); ctx.lineTo(x + 8, 4); ctx.lineTo(x + 16, 16); ctx.lineTo(x + 16, h); ctx.closePath(); ctx.fill();
          ctx.fillStyle = 'rgba(0,0,0,0.08)'; ctx.fillRect(x + 12, 16, 4, h - 16);
        }
      });
      case 'gate': return P(90, 130, (ctx, w, h) => {
        const col = o.color || 0xFFFFFF;
        ctx.fillStyle = cv.c(S(col, -0.2)); ctx.fillRect(0, 0, 12, h); ctx.fillRect(w - 12, 0, 12, h);
        if (o.open) {
          ctx.fillStyle = cv.c(col); ctx.fillRect(w - 26, 14, 14, h - 14);
        } else {
          ctx.fillStyle = cv.c(col);
          for (let x = 16; x < w - 16; x += 18) ctx.fillRect(x, 20, 11, h - 20);
          ctx.fillRect(12, 50, w - 24, 8); ctx.fillRect(12, 96, w - 24, 8);
          ctx.fillStyle = '#6A6878'; ctx.fillRect(w - 26, 70, 12, 10);
        }
      });
      // a parked sedan seen from the side, its front on the left; dent: a creased front wing (the fender-bender)
      case 'sedan': return P(340, 130, (ctx, w, h) => {
        const col = o.color || 0x9AA4B4;
        // body
        ctx.beginPath();
        ctx.moveTo(14, 104); ctx.lineTo(8, 78); ctx.quadraticCurveTo(10, 62, 40, 58);
        ctx.lineTo(96, 54); ctx.lineTo(132, 22); ctx.quadraticCurveTo(140, 16, 156, 16);
        ctx.lineTo(236, 16); ctx.quadraticCurveTo(250, 16, 260, 26); ctx.lineTo(290, 54);
        ctx.lineTo(318, 58); ctx.quadraticCurveTo(334, 62, 334, 80); ctx.lineTo(330, 104); ctx.closePath();
        ctx.fillStyle = cv.lin(ctx, 0, 16, 0, 104, [[0, cv.c(S(col, 0.15))], [1, cv.c(S(col, -0.2))]]); ctx.fill();
        // windows
        ctx.fillStyle = '#2A3446';
        ctx.beginPath(); ctx.moveTo(108, 54); ctx.lineTo(138, 26); ctx.lineTo(188, 26); ctx.lineTo(188, 54); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(196, 54); ctx.lineTo(196, 26); ctx.lineTo(238, 26); ctx.lineTo(268, 54); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(140, 30, 30, 5);
        // door seams, handles, lights
        ctx.strokeStyle = cv.c(S(col, -0.35)); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(192, 56); ctx.lineTo(192, 100); ctx.moveTo(110, 58); ctx.lineTo(114, 100); ctx.stroke();
        ctx.fillStyle = cv.c(S(col, -0.4)); ctx.fillRect(160, 66, 16, 4); ctx.fillRect(238, 66, 16, 4);
        ctx.fillStyle = '#FFF4C8'; ctx.fillRect(10, 66, 14, 8);
        ctx.fillStyle = '#D8323A'; ctx.fillRect(324, 66, 8, 10);
        ctx.fillStyle = '#2A2A30'; ctx.fillRect(8, 92, 326, 10);
        if (o.dent) {
          // front wing folded in: a dark crease, bent panel lines and flakes of paint
          ctx.fillStyle = 'rgba(20,20,30,0.45)';
          ctx.beginPath(); ctx.moveTo(22, 60); ctx.lineTo(44, 70); ctx.lineTo(34, 80); ctx.lineTo(58, 90); ctx.lineTo(40, 98); ctx.lineTo(18, 90); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(24, 62); ctx.lineTo(46, 71); ctx.lineTo(36, 81); ctx.lineTo(60, 90); ctx.stroke();
          ctx.fillStyle = cv.c(S(col, 0.4)); ctx.fillRect(62, 84, 4, 3); ctx.fillRect(54, 94, 3, 3);
        }
        // wheels
        [[74, 104], [268, 104]].forEach(([x, y]) => {
          ctx.beginPath(); ctx.arc(x, y, 24, 0, Math.PI * 2); ctx.fillStyle = '#1C1C22'; ctx.fill();
          ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI * 2); ctx.fillStyle = '#A8AEB8'; ctx.fill();
        });
      });
      case 'doghouse': return P(130, 120, (ctx, w, h) => {
        ctx.fillStyle = '#B5763E'; ctx.fillRect(12, 46, w - 24, h - 46);
        ctx.beginPath(); ctx.moveTo(0, 52); ctx.lineTo(w / 2, 4); ctx.lineTo(w, 52); ctx.closePath(); ctx.fillStyle = '#8C3A34'; ctx.fill();
        ctx.beginPath(); ctx.arc(w / 2, h - 30, 26, Math.PI, 0); ctx.lineTo(w / 2 + 26, h); ctx.lineTo(w / 2 - 26, h); ctx.closePath(); ctx.fillStyle = '#2A1E18'; ctx.fill();
      });
      case 'bowl': return P(50, 22, (ctx) => {
        ctx.beginPath(); ctx.moveTo(4, 6); ctx.lineTo(46, 6); ctx.lineTo(40, 20); ctx.lineTo(10, 20); ctx.closePath(); ctx.fillStyle = '#E8304A'; ctx.fill();
        ctx.fillStyle = '#8FD3FF'; ctx.fillRect(8, 6, 34, 4);
      });
      case 'bin': return P(70, 110, (ctx, w, h) => {
        const col = o.color || 0x2E6BC4;
        cv.rr(ctx, 8, 18, 54, 88, 6); ctx.fillStyle = cv.lin(ctx, 8, 0, 62, 0, [[0, S(col, -0.2)], [1, S(col, 0.1)]]); ctx.fill();
        cv.rr(ctx, 4, 10, 62, 12, 4); ctx.fillStyle = cv.c(S(col, -0.3)); ctx.fill();
        [18, 52].forEach(x => { ctx.beginPath(); ctx.arc(x, 104, 6, 0, Math.PI * 2); ctx.fillStyle = '#222'; ctx.fill(); });
      });
      case 'tree': return P(320, 520, (ctx, w, h) => {
        const R = OTR.scenery.rng(key);
        ctx.fillStyle = cv.lin(ctx, w / 2 - 20, 0, w / 2 + 20, 0, [[0, '#4A3426'], [1, '#6E4E36']]);
        ctx.beginPath(); ctx.moveTo(w / 2 - 22, h); ctx.lineTo(w / 2 - 12, 220); ctx.lineTo(w / 2 + 12, 220); ctx.lineTo(w / 2 + 24, h); ctx.closePath(); ctx.fill();
        const leaf = o.snow ? 0x7A8E80 : (o.autumn ? 0xD8742A : 0x3E8B4A);
        for (let i = 0; i < 26; i++) {
          const bx = w / 2 + (R() - 0.5) * 240, by = 60 + R() * 200, r = 40 + R() * 40;
          ctx.fillStyle = cv.rad(ctx, bx - r * 0.3, by - r * 0.3, 2, r * 1.2, [[0, S(leaf, 0.2)], [1, S(leaf, -0.3)]]);
          ctx.beginPath(); ctx.arc(bx, by, r, 0, Math.PI * 2); ctx.fill();
        }
        if (o.snow) { ctx.fillStyle = 'rgba(248,250,255,0.85)'; for (let i = 0; i < 8; i++) { ctx.beginPath(); ctx.arc(w / 2 + (R() - 0.5) * 200, 70 + R() * 140, 30, Math.PI, 0); ctx.fill(); } }
      });
      case 'hydrant': return P(40, 70, (ctx) => {
        cv.rr(ctx, 10, 18, 20, 48, 5); ctx.fillStyle = '#D8304A'; ctx.fill();
        cv.rr(ctx, 4, 30, 32, 10, 4); ctx.fill();
        ctx.beginPath(); ctx.arc(20, 18, 11, Math.PI, 0); ctx.fill();
        ctx.fillStyle = '#E8E8F0'; ctx.fillRect(16, 4, 8, 6);
      });
      case 'streetsign': return P(200, 300, (ctx, w, h) => {
        ctx.fillStyle = '#6E7080'; ctx.fillRect(w / 2 - 5, 30, 10, h - 30);
        cv.rr(ctx, 6, 30, w - 12, 36, 5); ctx.fillStyle = '#1E7A4A'; ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; cv.rr(ctx, 10, 34, w - 20, 28, 3); ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.font = '900 18px "Segoe UI"'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(o.text || 'MAPLE AVE', w / 2, 49);
      });
      case 'lamp': return P(60, 380, (ctx, w, h) => {
        ctx.fillStyle = '#34323E'; ctx.fillRect(w / 2 - 5, 40, 10, h - 40);
        cv.rr(ctx, w / 2 - 20, 10, 40, 36, 8); ctx.fillStyle = '#34323E'; ctx.fill();
        ctx.fillStyle = o.lit ? '#FFE9A8' : '#D8D4C8'; ctx.fillRect(w / 2 - 14, 34, 28, 10);
      });
      case 'lockbox': return P(80, 90, (ctx, w, h) => {
        cv.rr(ctx, 6, 14, 68, 74, 6); ctx.fillStyle = cv.lin(ctx, 0, 14, 0, 88, [[0, '#5A6272'], [1, '#3A404C']]); ctx.fill();
        ctx.fillStyle = '#2A2E38'; ctx.fillRect(14, 26, 52, 8);
        ctx.fillStyle = '#FFC83D'; ctx.font = '900 10px "Segoe UI"'; ctx.textAlign = 'center'; ctx.fillText('PARCELS', w / 2, 56);
      });
      case 'cone': return P(50, 70, (ctx) => {
        ctx.beginPath(); ctx.moveTo(25, 4); ctx.lineTo(42, 62); ctx.lineTo(8, 62); ctx.closePath(); ctx.fillStyle = '#FF7A1A'; ctx.fill();
        ctx.fillStyle = '#fff'; ctx.fillRect(15, 30, 20, 8);
        ctx.fillStyle = '#E0600A'; ctx.fillRect(2, 60, 46, 8);
      });
      case 'wetfloor': return P(60, 90, (ctx) => {
        ctx.beginPath(); ctx.moveTo(30, 4); ctx.lineTo(54, 86); ctx.lineTo(6, 86); ctx.closePath(); ctx.fillStyle = '#FFD34D'; ctx.fill();
        ctx.fillStyle = '#1E1414'; ctx.font = '900 10px "Segoe UI"'; ctx.textAlign = 'center'; ctx.fillText('WET', 30, 56); ctx.fillText('FLOOR', 30, 70);
      });
      case 'crack': return P(o.w || 90, 16, (ctx, w) => {
        ctx.strokeStyle = 'rgba(40,30,30,0.7)'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(0, 8); ctx.lineTo(w * 0.3, 4); ctx.lineTo(w * 0.5, 12); ctx.lineTo(w * 0.8, 5); ctx.lineTo(w, 9); ctx.stroke();
        ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(w * 0.35, 7, w * 0.3, 6);
      });
      case 'package': return P(90, 80, (ctx) => {
        OTR.draw.box(ctx, { fw: 60, fh: 44, d: 16, x: 6, y: 26, color: o.color || 0xC99A62, damage: o.damage });
        ctx.fillStyle = '#fff'; ctx.fillRect(14, 44, 26, 14); ctx.fillStyle = '#4D148C'; ctx.fillRect(14, 44, 26, 3);
      });
      case 'doortag': return P(24, 40, (ctx) => {
        cv.rr(ctx, 2, 2, 20, 36, 3); ctx.fillStyle = '#FFFFFF'; ctx.fill();
        ctx.fillStyle = '#FF6600'; ctx.fillRect(2, 2, 20, 9);
        ctx.fillStyle = '#4D148C'; ctx.fillRect(5, 16, 14, 2); ctx.fillRect(5, 21, 10, 2); ctx.fillRect(5, 26, 12, 2);
      });
      case 'bench': return P(160, 70, (ctx, w, h) => {
        ctx.fillStyle = '#7A5638'; ctx.fillRect(4, 14, w - 8, 10); ctx.fillRect(4, 34, w - 8, 10);
        ctx.fillStyle = '#34323E'; ctx.fillRect(14, 20, 8, h - 20); ctx.fillRect(w - 22, 20, 8, h - 20);
      });
      case 'umbrella': return P(220, 260, (ctx, w, h) => {
        ctx.fillStyle = '#5A5866'; ctx.fillRect(w / 2 - 3, 60, 6, h - 60);
        ctx.beginPath(); ctx.moveTo(0, 80); ctx.quadraticCurveTo(w / 2, -10, w, 80); ctx.closePath();
        ctx.fillStyle = cv.c(o.color || 0x2BC48A); ctx.fill();
      });
      default:
        return P(40, 40, (ctx) => { ctx.fillStyle = '#f0f'; ctx.fillRect(0, 0, 40, 40); });
    }
  }
};
