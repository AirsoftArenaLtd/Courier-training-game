/*
 * Top-down town art (TownDriveScene): road tiles, intersections, buildings, trees, cars and map icons.
 * Everything is a small reusable texture so the town can be built from sprites instead of one huge canvas.
 */
window.OTR = window.OTR || {};

OTR.townArt = {
  ROAD: 210,      // asphalt width (two lanes wide enough for a step van to pass a car)
  WALK: 30,       // sidewalk strip on each side
  ROOF_TINTS: [0xB8848C, 0x8CA3B8, 0xB8A98C, 0x9AB88C, 0x8EA1B6, 0xD0C0A8],   // house roofs on the map, by lot index
  CORNER: 80,     // kerb radius at junction corners, px (4 m)
  STOP_LINE: 58,  // stop line, px out from the junction box: just clear of the crosswalk (R+1 to R+47). It was at
                  // 18, in the middle of the stripes, so "stop at the line" parked the nose on the crossing.
  // building sizes before OTR.town.SCALE, by variant; OTR.town.size() reads these, so what is drawn is what the van
  // collides with. The widest house used to be wider than its plot, and neighbours overlapped.
  BUILDINGS: {
    house: [[190, 150], [210, 150], [180, 175], [220, 170]],
    biz: [[320, 220], [260, 250]],
    apt: [370, 220]
  },

  /** Horizontal road tile: asphalt + centre line + sidewalks. Height = ROAD + 2*WALK. */
  roadH(scene) {
    const R = OTR.townArt.ROAD, W = OTR.townArt.WALK;
    const high = OTR.gfx ? OTR.gfx.high() : true;
    return OTR.tex.make(scene, high ? 'td_road_h_detail' : 'td_road_h', 256, R + W * 2, (ctx, w, h) => {
      const cv = OTR.cv;
      ctx.fillStyle = cv.lin(ctx, 0, W, 0, W + R, [[0, '#4E4B58'], [0.5, '#56535F'], [1, '#46434F']]);
      ctx.fillRect(0, W, w, R);
      for (let i = 0; i < 220; i++) { ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.04})`; ctx.fillRect(Math.random() * w, W + Math.random() * R, 2, 2); }
      // sidewalks
      ctx.fillStyle = '#C3C0CB'; ctx.fillRect(0, 0, w, W); ctx.fillRect(0, W + R, w, W);
      ctx.strokeStyle = 'rgba(90,80,100,0.25)'; ctx.lineWidth = 2;
      for (let x = 0; x < w; x += 64) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, W); ctx.moveTo(x, W + R); ctx.lineTo(x, W + R + W); ctx.stroke(); }
      // kerbs
      ctx.fillStyle = '#9C99A6'; ctx.fillRect(0, W - 4, w, 4); ctx.fillRect(0, W + R, w, 4);
      if (high) OTR.townArt.roadDetail(ctx, w, R, W);
      // centre line
      ctx.fillStyle = '#F5D547';
      for (let x = 10; x < w; x += 90) ctx.fillRect(x, W + R / 2 - 4, 50, 5);
      // edge lines
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.fillRect(0, W + 10, w, 3); ctx.fillRect(0, W + R - 13, w, 3);
    });
  },

  roadV(scene) {
    const R = OTR.townArt.ROAD, W = OTR.townArt.WALK;
    const high = OTR.gfx ? OTR.gfx.high() : true;
    return OTR.tex.make(scene, high ? 'td_road_v_detail' : 'td_road_v', R + W * 2, 256, (ctx, w, h) => {
      const cv = OTR.cv;
      ctx.fillStyle = cv.lin(ctx, W, 0, W + R, 0, [[0, '#4E4B58'], [0.5, '#56535F'], [1, '#46434F']]);
      ctx.fillRect(W, 0, R, h);
      for (let i = 0; i < 220; i++) { ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.04})`; ctx.fillRect(W + Math.random() * R, Math.random() * h, 2, 2); }
      ctx.fillStyle = '#C3C0CB'; ctx.fillRect(0, 0, W, h); ctx.fillRect(W + R, 0, W, h);
      ctx.strokeStyle = 'rgba(90,80,100,0.25)'; ctx.lineWidth = 2;
      for (let y = 0; y < h; y += 64) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.moveTo(W + R, y); ctx.lineTo(W + R + W, y); ctx.stroke(); }
      ctx.fillStyle = '#9C99A6'; ctx.fillRect(W - 4, 0, 4, h); ctx.fillRect(W + R, 0, 4, h);
      if (high) {
        ctx.save(); ctx.transform(0, 1, 1, 0, 0, 0);
        OTR.townArt.roadDetail(ctx, h, R, W);
        ctx.restore();
      }
      ctx.fillStyle = '#F5D547';
      for (let y = 10; y < h; y += 90) ctx.fillRect(W + R / 2 - 4, y, 5, 50);
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.fillRect(W + 10, 0, 3, h); ctx.fillRect(W + R - 13, 0, 3, h);
    });
  },

  /** Baked surface detail only. Both orientations keep the same markings, dimensions and TileSprite count. */
  roadDetail(ctx, length, R, W) {
    ctx.save();
    // Gentle continuous wheel wear. Full-length bands meet at tile edges; no cracks or fake driving hazards.
    ctx.fillStyle = 'rgba(20,18,28,0.055)';
    [W + R * 0.25, W + R * 0.75].forEach(y => {
      ctx.fillRect(0, y - 18, length, 6); ctx.fillRect(0, y + 12, length, 6);
    });
    // A quiet resurfaced patch, well inside a lane. The centre/edge paint is drawn afterwards.
    OTR.cv.rr(ctx, 38, W + 27, 57, 17, 3);
    ctx.fillStyle = 'rgba(25,23,32,0.075)'; ctx.fill();
    ctx.strokeStyle = 'rgba(190,184,199,0.06)'; ctx.lineWidth = 1; ctx.stroke();
    // Slight slab variation and bevels remain inside the original sidewalk and kerb geometry.
    for (let x = 0; x < length; x += 64) {
      ctx.fillStyle = x % 128 ? 'rgba(255,255,255,0.035)' : 'rgba(70,65,80,0.025)';
      ctx.fillRect(x + 2, 2, 60, W - 8); ctx.fillRect(x + 2, W + R + 6, 60, W - 8);
      ctx.fillStyle = 'rgba(255,255,255,0.14)';
      ctx.fillRect(x + 2, 1, 60, 1); ctx.fillRect(x + 2, W + R + 5, 60, 1);
      ctx.fillStyle = 'rgba(65,60,78,0.18)';
      ctx.fillRect(x, W - 4, 1, 4); ctx.fillRect(x, W + R, 1, 4);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.fillRect(0, W - 5, length, 1); ctx.fillRect(0, W + R + 4, length, 1);
    ctx.restore();
  },

  /** Intersection square (asphalt only) with a drain and scuff marks. */
  cross(scene) {
    const R = OTR.townArt.ROAD, W = OTR.townArt.WALK;
    const s = R + W * 2;
    return OTR.tex.make(scene, 'td_cross', s, s, (ctx, w, h) => {
      ctx.fillStyle = '#514E5A'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#C3C0CB';
      [[0, 0], [w - W, 0], [0, h - W], [w - W, h - W]].forEach(([x, y]) => { ctx.fillRect(x, y, W, W); });
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fillRect(W - 4, W - 4, 4, 4);
      for (let i = 0; i < 120; i++) { ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.03})`; ctx.fillRect(Math.random() * w, Math.random() * h, 3, 3); }
      ctx.fillStyle = '#3A3742'; ctx.fillRect(w / 2 - 14, h - W - 22, 28, 14);
    });
  },

  /**
   * The kerb's rounded corners, laid over the junction square and the ends of the road tiles: asphalt out to a
   * CORNER-radius kerb, the sidewalk following it round. TownDriveScene.surfaceAt() uses the same shape, so the
   * kerb the van bumps over is the one drawn. (The corners were square, and a step van's rear wheel cut them on
   * every right turn.)
   */
  corner(scene, snow) {
    const A = OTR.townArt, h = A.ROAD / 2, W = A.WALK, rc = A.CORNER, c = h + rc;
    return OTR.tex.make(scene, snow ? 'td_corner_snow' : 'td_corner', c * 2, c * 2, (ctx, w) => {
      [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(([sx, sy]) => {
        // the circle's centre sits out on the lawn diagonal
        const ox = c + sx * c, oy = c + sy * c;
        ctx.save();
        ctx.beginPath(); ctx.rect(Math.min(c + sx * h, ox), Math.min(c + sy * h, oy), rc, rc); ctx.clip();
        ctx.fillStyle = '#C3C0CB'; ctx.fillRect(0, 0, w, w);
        // the corner of the lawn (snow-covered on a snow day, to match OTR.wx's lawn)
        ctx.fillStyle = snow ? '#ECF0F7' : '#6FA85A'; ctx.beginPath(); ctx.arc(ox, oy, rc - W, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = snow ? 'rgba(170,185,210,0.15)' : 'rgba(40,90,30,0.25)'; ctx.beginPath(); ctx.arc(ox, oy, rc - W, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        ctx.save();
        ctx.beginPath(); ctx.rect(Math.min(c + sx * h, ox), Math.min(c + sy * h, oy), rc, rc); ctx.clip();
        // asphalt outside the kerb circle, then the kerb stone on the circle
        ctx.beginPath(); ctx.rect(0, 0, w, w); ctx.arc(ox, oy, rc, 0, Math.PI * 2, true);
        ctx.fillStyle = '#514E5A'; ctx.fill('evenodd');
        ctx.strokeStyle = '#9C99A6'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(ox, oy, rc + 2, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      });
    });
  },

  /** Crosswalk stripes, horizontal band (drawn rotated for the other direction). */
  crosswalk(scene) {
    const R = OTR.townArt.ROAD;
    return OTR.tex.make(scene, 'td_crosswalk', R, 46, (ctx, w, h) => {
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      for (let x = 6; x < w - 6; x += 22) ctx.fillRect(x, 4, 13, h - 8);
    });
  },

  stopLine(scene) {
    return OTR.tex.make(scene, 'td_stopline', OTR.townArt.ROAD / 2, 10, (ctx, w, h) => {
      ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(0, 0, w, h);
    });
  },

  lawn(scene) {
    return OTR.tex.make(scene, 'td_lawn', 128, 128, (ctx, w, h) => {
      const cv = OTR.cv;
      ctx.fillStyle = cv.lin(ctx, 0, 0, w, h, [[0, '#6FA85A'], [1, '#5C9450']]);
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 260; i++) {
        ctx.fillStyle = Math.random() < 0.5 ? 'rgba(40,90,30,0.22)' : 'rgba(170,220,120,0.18)';
        ctx.fillRect(Math.random() * w, Math.random() * h, 3, 3);
      }
    });
  },

  /** Top-down house roof. variant 0-3, colour tinted by the caller. */
  house(scene, variant) {
    const B = OTR.townArt.BUILDINGS.house;
    const [w0, h0] = B[variant % B.length];
    return OTR.tex.make(scene, `td_house_${variant}`, w0 + 30, h0 + 30, (ctx, w, h) => {
      const cv = OTR.cv;
      cv.shadow(ctx, 18, 8, 0.4);
      cv.rr(ctx, 14, 10, w0, h0, 6);
      ctx.fillStyle = '#9A8F9E'; ctx.fill();
      cv.noShadow(ctx);
      // roof planes
      ctx.fillStyle = cv.lin(ctx, 14, 10, 14 + w0, 10 + h0, [[0, '#FFFFFF'], [1, '#C8C4D0']]);
      ctx.fillRect(14, 10, w0, h0);
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.beginPath(); ctx.moveTo(14, 10); ctx.lineTo(14 + w0, 10); ctx.lineTo(14 + w0 - 26, 10 + h0 / 2); ctx.lineTo(14 + 26, 10 + h0 / 2); ctx.closePath(); ctx.fill();
      // ridge
      ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(14 + 26, 10 + h0 / 2 - 3, w0 - 52, 6);
      // shingle lines
      ctx.strokeStyle = 'rgba(0,0,0,0.10)'; ctx.lineWidth = 2;
      for (let y = 10; y < 10 + h0; y += 14) { ctx.beginPath(); ctx.moveTo(14, y); ctx.lineTo(14 + w0, y); ctx.stroke(); }
      // chimney
      ctx.fillStyle = '#8A5A48'; ctx.fillRect(14 + w0 - 46, 10 + 18, 24, 22);
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(14 + w0 - 46, 10 + 34, 24, 6);
    });
  },

  biz(scene, variant) {
    const B = OTR.townArt.BUILDINGS.biz;
    const [w0, h0] = B[variant % B.length];
    return OTR.tex.make(scene, `td_biz_${variant}`, w0 + 30, h0 + 30, (ctx, w, h) => {
      const cv = OTR.cv;
      cv.shadow(ctx, 20, 8, 0.4);
      cv.rr(ctx, 14, 10, w0, h0, 4);
      ctx.fillStyle = '#b4bbc3'; ctx.fill();
      cv.noShadow(ctx);
      ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(20, 16, w0 - 12, h0 - 12);
      // roof units
      ctx.fillStyle = '#8E8898';
      [[40, 40], [110, 60], [190, 36]].forEach(([x, y]) => { if (x < w0 - 50) { ctx.fillRect(14 + x, 10 + y, 46, 34); ctx.fillStyle = '#6E6878'; ctx.fillRect(14 + x + 6, 10 + y + 6, 34, 22); ctx.fillStyle = '#8E8898'; } });
      ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 3;
      ctx.strokeRect(20, 16, w0 - 12, h0 - 12);
    });
  },

  apt(scene) {
    const [w0, h0] = OTR.townArt.BUILDINGS.apt;
    return OTR.tex.make(scene, 'td_apt', w0 + 30, h0 + 30, (ctx, w, h) => {
      const cv = OTR.cv;
      cv.shadow(ctx, 22, 10, 0.45);
      cv.rr(ctx, 14, 10, w0, h0, 6);
      ctx.fillStyle = '#A2717A'; ctx.fill();
      cv.noShadow(ctx);
      ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fillRect(30, 26, 340, 190);
      ctx.fillStyle = '#8E8898';
      for (let i = 0; i < 4; i++) ctx.fillRect(60 + i * 80, 60, 50, 40);
      ctx.fillStyle = '#6E6878'; ctx.fillRect(150, 150, 100, 50);
    });
  },

  depot(scene) {
    // the sign band is painted over a real roof image too, so the name always sits exactly in it
    const band = (ctx) => {
      ctx.fillStyle = OTR_DATA.theme.css('primary'); ctx.fillRect(16, 12, 660, 70);
      ctx.fillStyle = OTR_DATA.theme.css('accent'); ctx.fillRect(16, 82, 660, 12);
      sign(ctx);
    };
    const sign = (ctx) => {
      ctx.fillStyle = '#ffffff'; ctx.font = '900 46px "Segoe UI", Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(OTR_DATA.config.brand ? OTR_DATA.config.brand.toUpperCase() + ' STATION' : 'DELIVERY STATION', 346, 50);
    };
    return OTR.tex.make(scene, 'td_depot', 700, 420, (ctx, w, h) => {
      const cv = OTR.cv;
      cv.shadow(ctx, 26, 10, 0.45);
      cv.rr(ctx, 16, 12, 660, 380, 8);
      ctx.fillStyle = '#c6ccd3'; ctx.fill();
      cv.noShadow(ctx);
      band(ctx);
      ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(40, 110, 610, 260);
      // dock doors
      ctx.fillStyle = '#8E8898';
      for (let i = 0; i < 5; i++) ctx.fillRect(70 + i * 120, 330, 90, 56);
      ctx.fillStyle = '#6E6878';
      for (let i = 0; i < 5; i++) ctx.fillRect(74 + i * 120, 336, 82, 8);
    }, { decorate: band });
  },

  /** A street lamp from above: the post's foot, and the arm reaching over the road to the lamp head. */
  lamp(scene) {
    return OTR.tex.make(scene, 'td_lamp', 40, 20, (ctx) => {
      const cv = OTR.cv;
      cv.shadow(ctx, 3, 2, 0.4);
      ctx.fillStyle = '#3A3D44'; ctx.beginPath(); ctx.arc(7, 10, 4.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(7, 8.8, 22, 2.4);
      cv.rr(ctx, 25, 6, 13, 8, 3); ctx.fillStyle = '#52565F'; ctx.fill();
      cv.noShadow(ctx);
      cv.rr(ctx, 28, 8, 8, 4, 2); ctx.fillStyle = '#EDE6D0'; ctx.fill();
    });
  },

  tree(scene, variant) {
    const r = [46, 58, 38][variant % 3];
    return OTR.tex.make(scene, `td_tree_${variant}`, r * 2 + 24, r * 2 + 24, (ctx, w, h) => {
      const cv = OTR.cv;
      const cx = w / 2, cy = h / 2;
      cv.shadow(ctx, 14, 8, 0.35);
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = cv.rad(ctx, cx - r * 0.3, cy - r * 0.3, 2, r * 1.2, [[0, '#57A24A'], [1, '#2F6B38']]);
      ctx.fill();
      cv.noShadow(ctx);
      for (let i = 0; i < 7; i++) {
        const a = i / 7 * Math.PI * 2, rr = r * 0.55;
        ctx.beginPath(); ctx.arc(cx + Math.cos(a) * rr * 0.7, cy + Math.sin(a) * rr * 0.7, rr * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${0.05 + (i % 2) * 0.05})`; ctx.fill();
      }
    });
  },

  driveway(scene) {
    return OTR.tex.make(scene, 'td_driveway', 90, 120, (ctx, w, h) => {
      ctx.fillStyle = '#C0BDC8'; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(80,70,90,0.25)'; ctx.lineWidth = 2;
      for (let y = 30; y < h; y += 30) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    });
  },

  /** Stop marker painted in the kerb lane where the courier should pull in (a van's length, a van's width). */
  /** The marked stop zone, len px long: exactly where parking is accepted (TownDriveScene.parkBay). */
  stopZone(scene, len) {
    len = Math.round(len || 196);
    return OTR.tex.make(scene, 'td_stopzone_' + len, len, 74, (ctx, w, h) => {
      const cv = OTR.cv;
      cv.rr(ctx, 4, 4, w - 8, h - 8, 10);
      ctx.fillStyle = 'rgba(255,200,61,0.20)'; ctx.fill();
      ctx.setLineDash([12, 8]); ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(255,200,61,0.9)'; ctx.stroke();
      ctx.setLineDash([]);
    });
  },

  signTex(scene, kind) {
    return OTR.tex.make(scene, `td_sign_${kind}`, 46, 46, (ctx, w, h) => {
      const cv = OTR.cv;
      cv.shadow(ctx, 8, 4, 0.4);
      if (kind === 'stop') {
        ctx.beginPath();
        for (let i = 0; i < 8; i++) { const a = Math.PI / 8 + i * Math.PI / 4; const p = i ? 'lineTo' : 'moveTo'; ctx[p](23 + Math.cos(a) * 19, 23 + Math.sin(a) * 19); }
        ctx.closePath(); ctx.fillStyle = '#C8243B'; ctx.fill();
        cv.noShadow(ctx);
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.font = '900 13px "Segoe UI", Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('STOP', 23, 24);
      } else if (kind === 'school') {
        ctx.beginPath(); ctx.moveTo(23, 4); ctx.lineTo(42, 23); ctx.lineTo(23, 42); ctx.lineTo(4, 23); ctx.closePath();
        ctx.fillStyle = '#F5D547'; ctx.fill();
        cv.noShadow(ctx);
        ctx.fillStyle = OTR_DATA.theme.css('ink'); ctx.font = '900 11px "Segoe UI", Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('SCH', 23, 20); ctx.fillText('15', 23, 32);
      } else {
        cv.rr(ctx, 8, 4, 30, 38, 3); ctx.fillStyle = '#fff'; ctx.fill();
        cv.noShadow(ctx);
        ctx.strokeStyle = OTR_DATA.theme.css('ink'); ctx.lineWidth = 2; ctx.strokeRect(8, 4, 30, 38);
        ctx.fillStyle = OTR_DATA.theme.css('ink'); ctx.font = '900 9px "Segoe UI", Arial'; ctx.textAlign = 'center';
        ctx.fillText('SPEED', 23, 16); ctx.font = '900 16px "Segoe UI", Arial'; ctx.fillText(String(kind), 23, 32);
      }
    });
  },

  trafficLight(scene, state) {
    return OTR.tex.make(scene, `td_light_${state}`, 30, 66, (ctx, w, h) => {
      const cv = OTR.cv;
      cv.shadow(ctx, 10, 4, 0.5);
      cv.rr(ctx, 3, 3, 24, 60, 6); ctx.fillStyle = '#292d32'; ctx.fill();
      cv.noShadow(ctx);
      const cols = [['red', '#E8304A'], ['amber', '#FFB020'], ['green', '#2BC48A']];
      cols.forEach(([name, col], i) => {
        ctx.beginPath(); ctx.arc(15, 15 + i * 18, 7, 0, Math.PI * 2);
        ctx.fillStyle = state === name ? col : 'rgba(255,255,255,0.10)';
        ctx.fill();
        if (state === name) {
          ctx.fillStyle = OTR.color.css(Phaser.Display.Color.HexStringToColor(col).color, 0.35);
          ctx.beginPath(); ctx.arc(15, 15 + i * 18, 12, 0, Math.PI * 2); ctx.fill();
        }
      });
    });
  },

  pedTop(scene, color) {
    return OTR.tex.make(scene, `td_ped_${color}`, 30, 30, (ctx, w, h) => {
      const cv = OTR.cv;
      cv.shadow(ctx, 8, 3, 0.4);
      ctx.beginPath(); ctx.arc(15, 15, 9, 0, Math.PI * 2);
      ctx.fillStyle = OTR.color.css(color); ctx.fill();
      cv.noShadow(ctx);
      ctx.beginPath(); ctx.arc(15, 15, 5.5, 0, Math.PI * 2);
      ctx.fillStyle = '#E8B48F'; ctx.fill();
    });
  },

  /** School bus seen from above. `arm` swings the stop paddle out of the left flank. A real bus image (one, without
   *  the arm) stands in for the body of both; the paddle and the lit warning lights are drawn on top of it. */
  busTop(scene, arm) {
    const cv = OTR.cv;
    // stop paddle on an arm, out of the driver's side just behind the driver
    const paddle = (ctx) => {
      ctx.fillStyle = '#4A4654'; ctx.fillRect(6, 66, 22, 8);
      ctx.beginPath(); ctx.arc(10, 70, 13, 0, Math.PI * 2);
      ctx.fillStyle = '#E8304A'; ctx.fill();
      ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#FFFFFF'; ctx.font = '900 7px "Segoe UI", Arial'; ctx.textAlign = 'center';
      ctx.fillText('STOP', 10, 73);
    };
    // the red warning lights at both ends, flashing (lit) while the arm is out
    const reds = (ctx, w, h, lit, glowOnly) => [14, h - 18].forEach(y => [36, w - 22].forEach(x => {
      if (!glowOnly) { ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fillStyle = lit ? '#FF2A42' : '#7A3038'; ctx.fill(); }
      if (lit) {
        ctx.fillStyle = 'rgba(255,42,66,0.35)'; ctx.beginPath(); ctx.arc(x, y, 11, 0, Math.PI * 2); ctx.fill();
        if (glowOnly) { ctx.fillStyle = 'rgba(255,90,100,0.9)'; ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2); ctx.fill(); }
      }
    }));
    const decorate = arm ? (ctx, w, h) => { paddle(ctx); reds(ctx, w, h, true, true); } : null;
    return OTR.tex.make(scene, 'td_bus_' + (arm ? 1 : 0), 96, 250, (ctx, w, h) => {
      if (arm) paddle(ctx);
      cv.shadow(ctx, 12, 5, 0.4);
      cv.rr(ctx, 26, 10, w - 36, h - 20, 10);
      ctx.fillStyle = cv.lin(ctx, 26, 0, w - 10, 0, [[0, '#D8A317'], [0.45, '#FFD24A'], [1, '#C89410']]);
      ctx.fill();
      cv.noShadow(ctx);
      ctx.fillStyle = '#1D1B22';
      ctx.fillRect(26, 34, w - 36, 5); ctx.fillRect(26, h - 46, w - 36, 5);
      cv.rr(ctx, 34, 16, w - 52, 16, 4); ctx.fillStyle = '#2A4A68'; ctx.fill();   // windscreen
      for (let i = 0; i < 5; i++) {                                               // side windows
        cv.rr(ctx, 28, 48 + i * 32, 8, 24, 3); ctx.fillStyle = '#31536F'; ctx.fill();
        cv.rr(ctx, w - 18, 48 + i * 32, 8, 24, 3); ctx.fill();
      }
      reds(ctx, w, h, arm, false);
    }, { decorate });
  },

  ballTop(scene) {
    return OTR.tex.make(scene, 'td_ball', 30, 30, (ctx) => {
      const cv = OTR.cv;
      cv.shadow(ctx, 8, 3, 0.45);
      ctx.beginPath(); ctx.arc(15, 15, 11, 0, Math.PI * 2);
      ctx.fillStyle = cv.rad(ctx, 11, 11, 1, 14, [[0, '#FF9A6A'], [1, '#D8342A']]); ctx.fill();
      cv.noShadow(ctx);
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(15, 15, 7, 0.6, 3.2); ctx.stroke();
    });
  },

  /** Standing water across the carriageway. */
  puddle(scene, w, h) {
    return OTR.tex.make(scene, `td_pud_${w}_${h}`, w, h, (ctx) => {
      const cv = OTR.cv;
      const R = OTR.scenery.rng('pud' + w + h);
      ctx.fillStyle = 'rgba(40,62,88,0.55)';
      cv.rr(ctx, 4, 4, w - 8, h - 8, Math.min(w, h) / 3); ctx.fill();
      ctx.fillStyle = 'rgba(120,170,220,0.22)';
      for (let i = 0; i < 14; i++) {
        const rx = 10 + R() * (w - 40), ry = 10 + R() * (h - 26);
        cv.rr(ctx, rx, ry, 18 + R() * 26, 4, 2); ctx.fill();
      }
      ctx.strokeStyle = 'rgba(150,200,240,0.28)'; ctx.lineWidth = 2;
      cv.rr(ctx, 4, 4, w - 8, h - 8, Math.min(w, h) / 3); ctx.stroke();
    });
  }
};
