/*
 * Pre-trip inspection art: the five walkaround views of the truck, and the parametric close-ups.
 *
 * Close-ups take a `bad` flag and a seed, so a defect looks different every run and can't be memorised.
 * Nothing in the art spells out the verdict — the trainee has to look.
 */
window.OTR = window.OTR || {};

OTR.truckArt = {
  /* ================================================================ wide views */
  VIEWS: {
    driver: { w: 1180, h: 470 },
    passenger: { w: 1180, h: 470 },
    front: { w: 720, h: 520 },
    rear: { w: 700, h: 520 },
    cab: { w: 1100, h: 560 }
  },

  /** Wide view. state: { lights: bool, defects: {itemId: true} } */
  view(scene, id, state) {
    state = state || {};
    const D = state.defects || {};
    const key = `tv_${id}_${state.lights ? 1 : 0}_${Object.keys(D).sort().join('-')}`;
    const V = OTR.truckArt.VIEWS[id];
    OTR.tex.make(scene, key, V.w, V.h, (ctx) => OTR.truckArt['draw_' + id](ctx, V.w, V.h, state));
    return { key, w: V.w, h: V.h, spots: OTR.truckArt.spots(id) };
  },

  /** Hotspot positions inside each view texture (fractions of width/height). */
  spots(id) {
    return {
      // Standing at the driver (left) side facing the truck, the cab is on your left; at the curb side, on your
      // right. Facing the front, the driver's lamps are on your right. (Both sides and the front lamps used to be
      // drawn the other way round.)
      // (the leak ring sits on the drip line, clear of the "Climb into the cab" button under the truck)
      driver: {
        tire_front: [0.20, 0.80], tire_rear: [0.78, 0.80], fuel_cap: [0.60, 0.62],
        mirror_l: [0.045, 0.24], marker_side: [0.45, 0.34], leak: [0.50, 0.835], body_panel: [0.70, 0.45]
      },
      passenger: {
        tire_front_p: [0.80, 0.80], tire_rear_p: [0.22, 0.80], steps: [0.695, 0.72],
        mirror_r: [0.955, 0.24], door_latch: [0.64, 0.52], reflector_side: [0.40, 0.62]
      },
      front: {
        headlight_l: [0.76, 0.63], headlight_r: [0.24, 0.63], signal_l: [0.86, 0.72], signal_r: [0.14, 0.72],
        windshield: [0.5, 0.30], wipers: [0.5, 0.45], bumper: [0.5, 0.86], plate_front: [0.5, 0.78]
      },
      rear: {
        taillight_l: [0.16, 0.62], taillight_r: [0.84, 0.62], rear_door: [0.5, 0.42],
        mudflap: [0.24, 0.90], reflector_rear: [0.72, 0.86], plate_rear: [0.5, 0.74]
      },
      cab: {
        horn: [0.46, 0.46], seatbelt: [0.78, 0.55], brake_pedal: [0.30, 0.86], park_brake: [0.62, 0.70],
        gauges: [0.46, 0.30], extinguisher: [0.14, 0.62], first_aid: [0.14, 0.40], triangles: [0.87, 0.85],
        light_switch: [0.20, 0.30]
      }
    }[id] || {};
  },

  bodyGradient(ctx, x, y, w, h) {
    return OTR.cv.lin(ctx, 0, y, 0, y + h, [[0, '#FFFFFF'], [0.65, '#EDEAF3'], [1, '#C9C5D4']]);
  },

  draw_driver(ctx, w, h, s) { OTR.truckArt.sideView(ctx, w, h, s, true, false); },
  draw_passenger(ctx, w, h, s) { OTR.truckArt.sideView(ctx, w, h, s, false, true); },

  /** mirrored: the cab on the left (the driver side seen from outside); curb: the side with the entry steps */
  sideView(ctx, w, h, s, mirrored, curb) {
    const cv = OTR.cv, D = s.defects || {};
    ctx.save();
    if (mirrored) { ctx.translate(w, 0); ctx.scale(-1, 1); }
    // shadow
    cv.ellipse(ctx, w * 0.5, h - 16, w * 0.46, 18); ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fill();
    // cargo body
    cv.rr(ctx, 30, 40, w * 0.62, h - 150, 16);
    ctx.fillStyle = OTR.truckArt.bodyGradient(ctx, 30, 40, w * 0.62, h - 150); ctx.fill();
    // cab
    ctx.beginPath();
    ctx.moveTo(w * 0.64, 60); ctx.lineTo(w * 0.80, 60);
    ctx.quadraticCurveTo(w * 0.84, 62, w * 0.87, 110);
    ctx.lineTo(w * 0.95, h - 150); ctx.quadraticCurveTo(w * 0.96, h - 120, w * 0.96, h - 108);
    ctx.lineTo(w * 0.64, h - 108); ctx.closePath();
    ctx.fillStyle = OTR.truckArt.bodyGradient(ctx, 0, 60, 0, h - 108); ctx.fill();
    // windows
    ctx.beginPath(); ctx.moveTo(w * 0.79, 76); ctx.lineTo(w * 0.86, 78); ctx.lineTo(w * 0.92, h * 0.46); ctx.lineTo(w * 0.79, h * 0.46); ctx.closePath();
    ctx.fillStyle = cv.lin(ctx, 0, 76, 0, h * 0.46, [[0, '#A8D6F2'], [1, '#2E5578']]); ctx.fill();
    // cab door + window
    cv.rr(ctx, w * 0.645, 70, w * 0.13, h - 190, 6); ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = cv.lin(ctx, 0, 84, 0, h * 0.42, [[0, '#A8D6F2'], [1, '#3C6A92']]);
    cv.rr(ctx, w * 0.655, 84, w * 0.11, h * 0.30, 4); ctx.fill();
    // brand band
    ctx.fillStyle = '#4D148C'; ctx.fillRect(30, h * 0.60, w * 0.93, 34);
    ctx.fillStyle = '#FF6600'; ctx.fillRect(30, h * 0.60 + 34, w * 0.93, 10);
    // lettering is painted the right way round even on the mirrored side
    ctx.save();
    if (mirrored) { ctx.translate(w, 0); ctx.scale(-1, 1); }
    const brand = OTR_DATA.config.brand;
    ctx.fillStyle = brand ? '#4D148C' : '#FF6600'; ctx.font = `900 ${Math.round(h * (brand ? 0.16 : 0.1))}px "Segoe UI", Arial`;
    ctx.textAlign = mirrored ? 'right' : 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillText(brand || OTR_DATA.config.title.toUpperCase(), mirrored ? w - 80 : 80, h * 0.48);
    ctx.restore();
    // body panel damage
    if (D.body_panel) {
      ctx.save();
      ctx.beginPath(); ctx.ellipse(w * 0.30, h * 0.45, 70, 44, 0.2, 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = 'rgba(120,110,140,0.55)'; ctx.fillRect(w * 0.2, h * 0.3, 200, 180);
      ctx.strokeStyle = 'rgba(70,60,90,0.8)'; ctx.lineWidth = 4;
      for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(w * 0.24 + i * 12, h * 0.36); ctx.lineTo(w * 0.27 + i * 14, h * 0.55); ctx.stroke(); }
      ctx.restore();
    }
    // wheels
    const wheels = [[w * 0.22, h - 108], [w * 0.80, h - 108]];
    wheels.forEach(([wx, wy], i) => {
      const flat = (i === 1 && D.tire_front) || (i === 0 && D.tire_rear);
      const r = 74, squash = flat ? 0.88 : 1;
      ctx.save(); ctx.translate(wx, wy + (1 - squash) * r); ctx.scale(1, squash);
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fillStyle = '#232028'; ctx.fill();
      ctx.beginPath(); ctx.arc(0, 0, r * 0.52, 0, Math.PI * 2);
      ctx.fillStyle = cv.rad(ctx, -8, -8, 4, r * 0.55, [[0, '#F0F0F6'], [1, '#8A8A99']]); ctx.fill();
      for (let k = 0; k < 6; k++) {
        const a = k * Math.PI / 3;
        ctx.beginPath(); ctx.arc(Math.cos(a) * r * 0.34, Math.sin(a) * r * 0.34, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#5A5866'; ctx.fill();
      }
      ctx.restore();
    });
    // fuel cap
    ctx.beginPath(); ctx.arc(w * 0.40, h * 0.62, 20, 0, Math.PI * 2);
    ctx.fillStyle = D.fuel_cap ? '#2A2830' : '#9A98A6'; ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 3; ctx.stroke();
    if (D.fuel_cap) { ctx.fillStyle = '#6A6878'; ctx.beginPath(); ctx.arc(w * 0.40 + 34, h * 0.62 + 22, 16, 0, Math.PI * 2); ctx.fill(); }
    // side marker lamp
    cv.rr(ctx, w * 0.55 - 16, h * 0.34 - 8, 32, 16, 4);
    ctx.fillStyle = D.marker_side ? '#7A6A3A' : (s.lights ? '#FFD86A' : '#E8C45A'); ctx.fill();
    // mirror
    ctx.fillStyle = '#2A2830'; ctx.fillRect(w * 0.94, 70, 10, 90);
    ctx.save();
    if (D.mirror_l || D.mirror_r) ctx.translate(0, 26);
    cv.rr(ctx, w * 0.93, 60, 34, 60, 6); ctx.fillStyle = '#3A3844'; ctx.fill();
    cv.rr(ctx, w * 0.935, 66, 24, 48, 4);
    ctx.fillStyle = (D.mirror_l || D.mirror_r) ? '#6A6878' : cv.lin(ctx, 0, 66, 0, 114, [[0, '#DCEBF5'], [1, '#93AFC2']]); ctx.fill();
    ctx.restore();
    // entry steps (curb side), under the cab door
    if (curb) {
      ctx.fillStyle = D.steps ? '#5A4A3A' : '#3A3844';
      cv.rr(ctx, w * 0.66, h - 132, 96, 14, 4); ctx.fill();
      cv.rr(ctx, w * 0.68, h - 96, 80, 14, 4); ctx.fill();
      if (D.steps) { ctx.fillStyle = 'rgba(120,80,40,0.6)'; ctx.fillRect(w * 0.66, h - 132, 96, 8); }
    }
    // leak under the truck
    if (D.leak) {
      cv.ellipse(ctx, w * 0.50, h - 26, 76, 16);
      ctx.fillStyle = 'rgba(30,25,20,0.75)'; ctx.fill();
      cv.ellipse(ctx, w * 0.50, h - 26, 40, 8);
      ctx.fillStyle = 'rgba(80,60,20,0.8)'; ctx.fill();
      ctx.fillStyle = 'rgba(40,32,20,0.9)';
      ctx.fillRect(w * 0.50 - 3, h - 74, 6, 34);
    }
    ctx.restore();
  },

  draw_front(ctx, w, h, s) {
    const cv = OTR.cv, D = s.defects || {};
    cv.ellipse(ctx, w / 2, h - 12, w * 0.44, 14); ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fill();
    // cab body
    cv.rr(ctx, 60, 40, w - 120, h - 90, 18);
    ctx.fillStyle = OTR.truckArt.bodyGradient(ctx, 60, 40, w - 120, h - 90); ctx.fill();
    // windshield
    cv.rr(ctx, 96, 70, w - 192, h * 0.30, 10);
    ctx.fillStyle = cv.lin(ctx, 0, 70, 0, 70 + h * 0.3, [[0, '#BFE2F7'], [1, '#4E7FA6']]); ctx.fill();
    if (D.windshield) {
      ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = 3;
      const sx = w * 0.62, sy = 70 + h * 0.12;
      ctx.beginPath();
      for (let i = 0; i < 7; i++) { const a = i * Math.PI * 2 / 7; ctx.moveTo(sx, sy); ctx.lineTo(sx + Math.cos(a) * (18 + i * 5), sy + Math.sin(a) * (14 + i * 4)); }
      ctx.stroke();
      ctx.beginPath(); ctx.arc(sx, sy, 7, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fill();
    }
    // wipers
    ctx.strokeStyle = D.wipers ? '#7A6A5A' : '#2A2830'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    [[w * 0.36, 1], [w * 0.64, -1]].forEach(([bx, dir]) => {
      ctx.beginPath(); ctx.moveTo(bx, 70 + h * 0.28); ctx.lineTo(bx + dir * 70, 70 + h * 0.10); ctx.stroke();
      if (D.wipers) { ctx.strokeStyle = 'rgba(160,120,90,0.9)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(bx + dir * 30, 70 + h * 0.20); ctx.lineTo(bx + dir * 62, 70 + h * 0.115); ctx.stroke(); ctx.strokeStyle = '#2A2830'; ctx.lineWidth = 6; }
    });
    // grille
    ctx.fillStyle = '#3A3844'; cv.rr(ctx, w * 0.30, h * 0.52, w * 0.40, h * 0.14, 8); ctx.fill();
    ctx.fillStyle = '#55525F';
    for (let i = 0; i < 4; i++) ctx.fillRect(w * 0.31, h * 0.54 + i * (h * 0.028), w * 0.38, h * 0.014);
    // headlights
    [[w * 0.76, 'headlight_l'], [w * 0.24, 'headlight_r']].forEach(([x, id]) => {
      cv.rr(ctx, x - 52, h * 0.56, 104, 52, 10);
      const on = s.lights && !D[id];
      ctx.fillStyle = on ? cv.rad(ctx, x, h * 0.58, 4, 60, [[0, '#FFFBE6'], [1, '#FFD86A']]) : (D[id] ? '#5A5866' : '#D8D8E0');
      ctx.fill();
      ctx.strokeStyle = '#2A2830'; ctx.lineWidth = 4; ctx.stroke();
      if (on) { ctx.fillStyle = 'rgba(255,240,180,0.35)'; ctx.beginPath(); ctx.arc(x, h * 0.58, 76, 0, Math.PI * 2); ctx.fill(); }
      if (D[id]) { ctx.strokeStyle = 'rgba(40,40,50,0.6)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - 30, h * 0.60); ctx.lineTo(x + 26, h * 0.62); ctx.stroke(); }
    });
    // turn signals
    [[w * 0.86, 'signal_l'], [w * 0.14, 'signal_r']].forEach(([x, id]) => {
      cv.rr(ctx, x - 26, h * 0.66, 52, 30, 6);
      ctx.fillStyle = D[id] ? '#6A6060' : (s.lights ? '#FFA030' : '#E8A33D'); ctx.fill();
      ctx.strokeStyle = '#2A2830'; ctx.lineWidth = 3; ctx.stroke();
    });
    // bumper + plate
    ctx.fillStyle = D.bumper ? '#6A6878' : '#4A4852';
    cv.rr(ctx, 40, h * 0.80, w - 80, 46, 8); ctx.fill();
    if (D.bumper) {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath(); ctx.moveTo(w * 0.60, h * 0.80); ctx.lineTo(w * 0.70, h * 0.80 + 46); ctx.lineTo(w * 0.78, h * 0.80); ctx.closePath(); ctx.fill();
    }
    cv.rr(ctx, w / 2 - 60, h * 0.735, 120, 46, 4);
    ctx.fillStyle = D.plate_front ? '#9A98A6' : '#F4F4F8'; ctx.fill();
    ctx.strokeStyle = '#2A2830'; ctx.lineWidth = 2; ctx.stroke();
    if (!D.plate_front) {
      ctx.fillStyle = '#1D1030'; ctx.font = '900 22px "Segoe UI", Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('7C4 812', w / 2, h * 0.758);
    }
    // mirrors
    ctx.fillStyle = '#2A2830';
    [[30, 1], [w - 30, -1]].forEach(([x]) => { cv.rr(ctx, x - 14, 90, 28, 70, 6); ctx.fill(); });
  },

  draw_rear(ctx, w, h, s) {
    const cv = OTR.cv, D = s.defects || {};
    cv.ellipse(ctx, w / 2, h - 12, w * 0.44, 14); ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fill();
    cv.rr(ctx, 50, 30, w - 100, h - 80, 14);
    ctx.fillStyle = OTR.truckArt.bodyGradient(ctx, 50, 30, w - 100, h - 80); ctx.fill();
    // roll-up door
    ctx.fillStyle = '#DAD6E2';
    for (let y = 60; y < h * 0.70; y += 34) { ctx.fillStyle = (y / 34) % 2 === 0 ? '#E4E1EC' : '#D2CEDC'; ctx.fillRect(70, y, w - 140, 30); }
    if (D.rear_door) {
      ctx.strokeStyle = '#C8243B'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(w / 2 - 40, h * 0.66); ctx.lineTo(w / 2 + 40, h * 0.66); ctx.stroke();
      ctx.fillStyle = 'rgba(200,36,59,0.25)'; ctx.fillRect(70, h * 0.62, w - 140, 40);
    }
    // latch
    cv.rr(ctx, w / 2 - 26, h * 0.70, 52, 22, 5); ctx.fillStyle = '#5A5866'; ctx.fill();
    // tail lights
    [[w * 0.16, 'taillight_l'], [w * 0.84, 'taillight_r']].forEach(([x, id]) => {
      cv.rr(ctx, x - 30, h * 0.55, 60, 74, 8);
      ctx.fillStyle = D[id] ? '#6A5A5A' : (s.lights ? '#FF4A5A' : '#C8243B'); ctx.fill();
      ctx.strokeStyle = '#2A2830'; ctx.lineWidth = 4; ctx.stroke();
      if (!D[id] && s.lights) { ctx.fillStyle = 'rgba(255,60,80,0.3)'; ctx.beginPath(); ctx.arc(x, h * 0.62, 56, 0, Math.PI * 2); ctx.fill(); }
      if (D[id]) { ctx.strokeStyle = 'rgba(30,30,40,0.7)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x - 18, h * 0.58); ctx.lineTo(x + 16, h * 0.68); ctx.stroke(); }
    });
    // plate
    cv.rr(ctx, w / 2 - 62, h * 0.71, 124, 46, 4);
    ctx.fillStyle = '#F4F4F8'; ctx.fill();
    ctx.fillStyle = '#1D1030'; ctx.font = '900 22px "Segoe UI", Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('7C4 812', w / 2, h * 0.733);
    // mud flap + reflectors
    ctx.fillStyle = D.mudflap ? '#4A4852' : '#2A2830';
    if (!D.mudflap) cv.rr(ctx, w * 0.16, h * 0.84, 90, 70, 4), ctx.fill();
    else { ctx.fillStyle = '#2A2830'; ctx.beginPath(); ctx.moveTo(w * 0.16, h * 0.84); ctx.lineTo(w * 0.16 + 90, h * 0.84); ctx.lineTo(w * 0.16 + 70, h * 0.90); ctx.lineTo(w * 0.16 + 20, h * 0.88); ctx.closePath(); ctx.fill(); }
    cv.rr(ctx, w * 0.66, h * 0.83, 80, 22, 4);
    ctx.fillStyle = D.reflector_rear ? '#7A5A5A' : '#FF4A3A'; ctx.fill();
    if (D.reflector_rear) { ctx.fillStyle = 'rgba(60,50,50,0.7)'; ctx.fillRect(w * 0.66, h * 0.83, 44, 22); }
    // bumper
    ctx.fillStyle = '#4A4852'; cv.rr(ctx, 40, h * 0.90, w - 80, 34, 6); ctx.fill();
  },

  draw_cab(ctx, w, h, s) {
    const cv = OTR.cv, D = s.defects || {};
    // interior shell
    ctx.fillStyle = cv.lin(ctx, 0, 0, 0, h, [[0, '#4A4656'], [1, '#2A2830']]);
    ctx.fillRect(0, 0, w, h);
    // windshield
    cv.rr(ctx, 60, 20, w - 120, h * 0.28, 14);
    ctx.fillStyle = cv.lin(ctx, 0, 20, 0, h * 0.3, [[0, '#BFE2F7'], [1, '#6E9CBF']]); ctx.fill();
    // dash
    ctx.fillStyle = '#3A3844'; cv.rr(ctx, 30, h * 0.34, w - 60, h * 0.30, 16); ctx.fill();
    // gauges
    const gx = w * 0.46, gy = h * 0.30 + 40;
    cv.rr(ctx, gx - 120, gy - 34, 240, 96, 12); ctx.fillStyle = '#1C1A24'; ctx.fill();
    [[-70, 'FUEL'], [0, 'AIR'], [70, 'TEMP']].forEach(([dx, label], i) => {
      ctx.beginPath(); ctx.arc(gx + dx, gy + 8, 30, 0, Math.PI * 2);
      ctx.fillStyle = '#2A2833'; ctx.fill();
      ctx.strokeStyle = '#5A5866'; ctx.lineWidth = 2; ctx.stroke();
      // needle: the air gauge reads low when the brakes are the defect
      const low = (i === 1 && D.gauges);
      const ang = Math.PI * (low ? 0.85 : 0.35 + i * 0.1);
      ctx.strokeStyle = low ? '#FF4A5A' : '#8BF0C6'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(gx + dx, gy + 8); ctx.lineTo(gx + dx + Math.cos(Math.PI + ang) * 22, gy + 8 + Math.sin(Math.PI + ang) * 22); ctx.stroke();
      ctx.fillStyle = '#9A94AA'; ctx.font = '800 10px "Segoe UI", Arial'; ctx.textAlign = 'center';
      ctx.fillText(label, gx + dx, gy + 52);
    });
    if (D.gauges) {
      ctx.fillStyle = '#FF4A5A'; ctx.beginPath(); ctx.arc(gx + 104, gy - 14, 10, 0, Math.PI * 2); ctx.fill();
    }
    // steering wheel + horn
    ctx.strokeStyle = '#1C1A24'; ctx.lineWidth = 18;
    ctx.beginPath(); ctx.arc(w * 0.46, h * 0.52, 92, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#2A2833'; ctx.beginPath(); ctx.arc(w * 0.46, h * 0.52, 34, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = D.horn ? '#5A5866' : '#6A6878'; ctx.beginPath(); ctx.arc(w * 0.46, h * 0.52, 22, 0, Math.PI * 2); ctx.fill();
    // seat + belt
    cv.rr(ctx, w * 0.70, h * 0.42, 190, h * 0.44, 18); ctx.fillStyle = '#39353F'; ctx.fill();
    ctx.strokeStyle = D.seatbelt ? '#8A7A5A' : '#1C1A24'; ctx.lineWidth = 14; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(w * 0.72, h * 0.44); ctx.lineTo(w * 0.83, h * 0.72); ctx.stroke();
    if (D.seatbelt) {
      ctx.strokeStyle = 'rgba(200,60,60,0.8)'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(w * 0.77, h * 0.56); ctx.lineTo(w * 0.80, h * 0.60); ctx.stroke();
    }
    // pedals
    ctx.fillStyle = '#1C1A24';
    cv.rr(ctx, w * 0.26, h * 0.82, 70, 44, 6); ctx.fill();
    cv.rr(ctx, w * 0.36, h * 0.84, 56, 38, 6); ctx.fill();
    ctx.fillStyle = '#5A5866'; ctx.font = '800 11px "Segoe UI", Arial'; ctx.textAlign = 'center';
    ctx.fillText('BRAKE', w * 0.26 + 35, h * 0.82 + 26);
    // parking brake
    cv.rr(ctx, w * 0.60, h * 0.64, 40, 78, 10); ctx.fillStyle = D.park_brake ? '#6A5A5A' : '#F0C040'; ctx.fill();
    ctx.fillStyle = '#1C1A24'; ctx.font = '900 10px "Segoe UI", Arial';
    ctx.fillText('PARK', w * 0.60 + 20, h * 0.64 + 42);
    // light switch
    cv.rr(ctx, w * 0.17, h * 0.26, 64, 40, 8); ctx.fillStyle = s.lights ? '#8BF0C6' : '#4A4656'; ctx.fill();
    ctx.fillStyle = s.lights ? '#14301F' : '#9A94AA'; ctx.font = '900 12px "Segoe UI", Arial';
    ctx.fillText(s.lights ? 'LIGHTS ON' : 'LIGHTS', w * 0.17 + 32, h * 0.26 + 17);
    ctx.font = '800 10px "Segoe UI", Arial';
    ctx.fillText('+ HAZARDS', w * 0.17 + 32, h * 0.26 + 31);          // the flashers work the turn signals
    // extinguisher / first aid / triangles
    cv.rr(ctx, w * 0.11, h * 0.54, 44, 100, 10); ctx.fillStyle = D.extinguisher ? '#6A4A4A' : '#D8304A'; ctx.fill();
    if (D.extinguisher) { ctx.fillStyle = '#9A94AA'; ctx.fillRect(w * 0.11, h * 0.54, 44, 22); }
    cv.rr(ctx, w * 0.10, h * 0.32, 58, 44, 8); ctx.fillStyle = D.first_aid ? '#5A5866' : '#F4F4F8'; ctx.fill();
    if (!D.first_aid) {
      ctx.fillStyle = '#C8243B'; ctx.fillRect(w * 0.10 + 24, h * 0.32 + 10, 10, 24); ctx.fillRect(w * 0.10 + 17, h * 0.32 + 17, 24, 10);
    }
    ctx.fillStyle = D.triangles ? '#5A5866' : '#F0A030';
    [0, 1, 2].forEach(i => {
      if (D.triangles && i > 0) return;
      ctx.beginPath();
      const tx = w * 0.84 + i * 22, ty = h * 0.84;
      ctx.moveTo(tx, ty - 26); ctx.lineTo(tx + 22, ty + 10); ctx.lineTo(tx - 22, ty + 10); ctx.closePath(); ctx.fill();
    });
  },

  /* ================================================================ close-ups */
  /** kind-specific close-up. o: { bad, seed, lights, pressed } */
  closeup(scene, kind, o) {
    o = o || {};
    const key = `tc_${kind}_${o.bad ? 1 : 0}_${o.seed || 0}_${o.lights ? 1 : 0}_${o.pressed ? 1 : 0}_${o.gauged ? 1 : 0}_${o.variant || ''}_${o.reading || ''}_${o.drop !== undefined ? Math.round(o.drop) : ''}`;
    const W = 520, H = 330;
    return OTR.tex.make(scene, key, W, H, (ctx) => {
      const cv = OTR.cv;
      const R = OTR.scenery.rng(key);
      ctx.fillStyle = cv.lin(ctx, 0, 0, 0, H, [[0, '#4A4656'], [1, '#2A2830']]);
      ctx.fillRect(0, 0, W, H);
      const fn = OTR.truckArt['close_' + kind];
      if (fn) fn(ctx, W, H, o, R);
      else { ctx.fillStyle = '#9A94AA'; ctx.font = '900 20px "Segoe UI"'; ctx.textAlign = 'center'; ctx.fillText(kind, W / 2, H / 2); }
      // vignette so the eye goes to the middle
      ctx.fillStyle = cv.rad(ctx, W / 2, H / 2, H * 0.34, W * 0.62, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.5)']]);
      ctx.fillRect(0, 0, W, H);
    });
  },

  close_tire(ctx, W, H, o, R) {
    const cv = OTR.cv;
    // rubber face, lit from the upper left so the grooves read as depth
    ctx.fillStyle = cv.lin(ctx, 0, 20, 0, H - 20, [[0, '#55505E'], [0.5, '#3E3A48'], [1, '#2A2730']]);
    ctx.fillRect(30, 24, W - 60, H - 48);
    const blocks = 5, span = (W - 90) / blocks;
    for (let i = 0; i < blocks; i++) {
      const bx = 45 + i * span;
      ctx.fillStyle = cv.lin(ctx, bx, 0, bx + span * 0.7, 0, [[0, '#6A6474'], [1, '#4A4654']]);
      cv.rr(ctx, bx, 40, span * 0.66, H - 80, 6); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.10)';
      cv.rr(ctx, bx + 4, 44, span * 0.58, 12, 4); ctx.fill();
      // groove depth: worn all over (variant 'worn'), worn down one edge only ('edge': the left blocks), or deep
      const shallow = o.bad && (o.variant === 'worn' || (o.variant === 'edge' && i < 2));
      const depth = shallow ? 6 : o.bad && o.variant === 'edge' && i === 2 ? 14 : 22;
      ctx.fillStyle = '#100F16';
      ctx.fillRect(bx + span * 0.66, 40, span * 0.3, H - 80);
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fillRect(bx + span * 0.66, 40, span * 0.3, depth);
      if (shallow) {
        // wear bars flush with the tread in the worn grooves
        ctx.fillStyle = '#7A7484';
        cv.rr(ctx, bx + span * 0.66, H / 2 - 14, span * 0.3, 28, 3); ctx.fill();
      }
    }
    // the sidewall along the top of the picture, on every tire (only the faulty one used to have it, and its gouge
    // was a few pixels across)
    ctx.fillStyle = '#35313D'; ctx.fillRect(30, 6, W - 60, 32);
    ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(30, 6, W - 60, 5);
    if (o.bad && o.variant === 'gouge') {
      // a gash through the sidewall with the cords showing in it; the tread itself is fine
      ctx.fillStyle = '#0E0C12';
      ctx.beginPath(); ctx.moveTo(140, 22); ctx.lineTo(175, 10); ctx.lineTo(215, 16); ctx.lineTo(260, 8); ctx.lineTo(300, 20);
      ctx.lineTo(262, 32); ctx.lineTo(214, 28); ctx.lineTo(172, 34); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(210,200,170,0.75)'; ctx.lineWidth = 2;
      for (let k = 0; k < 7; k++) { const x = 165 + k * 18; ctx.beginPath(); ctx.moveTo(x, 15 + (k % 2) * 3); ctx.lineTo(x + 8, 29 - (k % 2) * 2); ctx.stroke(); }
    }
    if (o.gauged && o.reading) {
      // the gauge reports a number, nothing more: the trainee knows the limit (it used to say "out of service")
      const bw = 150, bx = W - bw - 26;
      ctx.fillStyle = 'rgba(12,10,18,0.82)';
      cv.rr(ctx, bx, 26, bw, 58, 10); ctx.fill();
      ctx.strokeStyle = '#9A94AA'; ctx.lineWidth = 2; ctx.stroke();
      ctx.textAlign = 'center';
      ctx.fillStyle = '#9A8AB0'; ctx.font = '700 11px "Segoe UI", Arial';
      ctx.fillText('TREAD DEPTH', bx + bw / 2, 45);
      ctx.fillStyle = '#FFFFFF'; ctx.font = '900 26px "Segoe UI", Arial';
      ctx.fillText(`${o.reading}/32"`, bx + bw / 2, 73);
    }
    void R;
  },

  close_light(ctx, W, H, o) {
    const cv = OTR.cv;
    const on = o.lights && !o.bad;
    cv.rr(ctx, 90, 70, W - 180, H - 140, 16);
    ctx.fillStyle = on ? cv.rad(ctx, W / 2, H / 2, 10, 200, [[0, '#FFFDF0'], [0.5, '#FFE08A'], [1, '#E8A33D']]) : (o.lights ? '#4A4650' : '#C8C6D2');
    ctx.fill();
    ctx.strokeStyle = '#1C1A24'; ctx.lineWidth = 8; ctx.stroke();
    // lens detail
    ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 2;
    for (let x = 110; x < W - 110; x += 22) { ctx.beginPath(); ctx.moveTo(x, 80); ctx.lineTo(x, H - 80); ctx.stroke(); }
    if (o.bad) {
      // a dead lamp: dark, with a hairline crack and moisture inside
      ctx.strokeStyle = 'rgba(20,20,26,0.8)'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(140, 110); ctx.lineTo(220, 160); ctx.lineTo(190, 210); ctx.stroke();
      ctx.fillStyle = 'rgba(120,140,160,0.35)';
      ctx.beginPath(); ctx.ellipse(W / 2 + 40, H - 110, 70, 24, 0, 0, Math.PI * 2); ctx.fill();
    }
    if (!o.lights) {
      ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.font = '800 15px "Segoe UI", Arial'; ctx.textAlign = 'center';
      ctx.fillText('lamps are switched off', W / 2, H - 34);
    }
  },

  close_leak(ctx, W, H, o, R) {
    const cv = OTR.cv;
    // ground under the truck
    ctx.fillStyle = '#55525F'; ctx.fillRect(0, H * 0.45, W, H * 0.55);
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(0, 0, W, H * 0.45);
    // chassis rail
    ctx.fillStyle = '#2A2830'; ctx.fillRect(60, H * 0.18, W - 120, 46);
    ctx.fillStyle = '#3A3844'; ctx.fillRect(60, H * 0.18, W - 120, 10);
    if (o.bad) {
      const dx = 160 + R() * 180;
      ctx.fillStyle = 'rgba(40,32,20,0.95)';
      ctx.fillRect(dx - 4, H * 0.24, 8, H * 0.28);
      [0, 1, 2].forEach(i => { cv.ellipse(ctx, dx, H * 0.55 + i * 8, 4 - i, 7 - i); ctx.fill(); });
      cv.ellipse(ctx, dx + 10, H * 0.78, 90, 26);
      ctx.fillStyle = 'rgba(30,24,14,0.85)'; ctx.fill();
      cv.ellipse(ctx, dx + 4, H * 0.78, 46, 13);
      ctx.fillStyle = 'rgba(90,66,20,0.9)'; ctx.fill();
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      for (let i = 0; i < 40; i++) ctx.fillRect(R() * W, H * 0.5 + R() * H * 0.45, 3, 3);
    }
  },

  close_mirror(ctx, W, H, o) {
    const cv = OTR.cv;
    ctx.save();
    if (o.bad) { ctx.translate(W / 2, H / 2); ctx.rotate(0.22); ctx.translate(-W / 2, -H / 2); }
    cv.rr(ctx, 130, 50, W - 260, H - 100, 14); ctx.fillStyle = '#3A3844'; ctx.fill();
    cv.rr(ctx, 146, 66, W - 292, H - 132, 10);
    ctx.fillStyle = cv.lin(ctx, 0, 66, 0, H - 66, [[0, '#DCEBF5'], [1, '#8FAFC2']]); ctx.fill();
    // what the mirror shows: the side of the truck and the road behind
    ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillRect(150, 90, 40, H - 180);
    ctx.fillStyle = 'rgba(80,110,90,0.5)'; ctx.fillRect(190, H - 150, W - 340, 60);
    ctx.restore();
    // (no caption: a knocked mirror shows sky and the truck's own door, and that has to be seen, not read)
    if (o.bad) {
      ctx.fillStyle = 'rgba(190,220,245,0.9)'; ctx.fillRect(150, 70, W - 300, 70);         // sky
      ctx.fillStyle = 'rgba(230,230,238,0.95)'; ctx.fillRect(W - 230, 140, 70, H - 220);    // your own door
    }
  },

  close_glass(ctx, W, H, o, R) {
    const cv = OTR.cv;
    ctx.fillStyle = cv.lin(ctx, 0, 0, 0, H, [[0, '#BFE2F7'], [1, '#7FA8C8']]);
    ctx.fillRect(30, 30, W - 60, H - 60);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath(); ctx.moveTo(60, 30); ctx.lineTo(160, 30); ctx.lineTo(60, H - 30); ctx.closePath(); ctx.fill();
    if (o.bad) {
      const cx = 160 + R() * 180, cy = 90 + R() * 120;
      ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = 3;
      for (let i = 0; i < 9; i++) {
        const a = i * Math.PI * 2 / 9;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * (30 + i * 7), cy + Math.sin(a) * (24 + i * 6)); ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(cx, cy, 9, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.fill();
    }
  },

  close_wiper(ctx, W, H, o) {
    // the windshield, the blade's metal frame, and its rubber edge along the glass
    ctx.fillStyle = '#7FA8C8'; ctx.fillRect(0, H * 0.45, W, H * 0.55);
    const x0 = 70, y0 = H * 0.78, x1 = W - 70, y1 = H * 0.50;
    const at = (t) => ({ x: x0 + (x1 - x0) * t, y: y0 + (y1 - y0) * t });
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#3A3844'; ctx.lineWidth = 14;
    ctx.beginPath(); ctx.moveTo(x0, y0 - 12); ctx.lineTo(x1, y1 - 12); ctx.stroke();
    ctx.strokeStyle = '#141218'; ctx.lineWidth = 8;
    if (!o.bad) {
      // one clean, even rubber edge the whole length
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    } else {
      // perished rubber: the edge has split away from the blade in the middle and hangs off it in a cracked,
      // curling strip, with a bare gap on the frame (it was a thin brown line, too faint to see)
      const a = at(0.3), b = at(0.62);
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(a.x, a.y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(x1, y1); ctx.stroke();
      ctx.strokeStyle = '#1E1B22'; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.bezierCurveTo(a.x + 40, a.y + 44, b.x - 70, b.y + 70, b.x - 20, b.y + 48); ctx.stroke();
      ctx.strokeStyle = '#9A94A8'; ctx.lineWidth = 2;
      for (let i = 1; i < 8; i++) {
        const t = i / 8, px = a.x + (b.x - 20 - a.x) * t, py = a.y + (b.y + 48 - a.y) * t + Math.sin(t * Math.PI) * 34;
        ctx.beginPath(); ctx.moveTo(px - 3, py - 5); ctx.lineTo(px + 3, py + 5); ctx.stroke();
      }
    }
  },

  close_belt(ctx, W, H, o) {
    ctx.fillStyle = '#39353F'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = o.bad ? '#8A7A5A' : '#1C1A24'; ctx.lineWidth = 46; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(80, 60); ctx.lineTo(W - 90, H - 70); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(80, 60); ctx.lineTo(W - 90, H - 70); ctx.stroke();
    if (o.bad) {
      // frayed webbing: loose threads the colour of the belt, no red marks
      ctx.strokeStyle = '#B8A888'; ctx.lineWidth = 3;
      const mx = W / 2, my = H / 2;
      for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.moveTo(mx - 34 + i * 11, my - 22 + (i % 2) * 6); ctx.lineTo(mx - 26 + i * 11 + (i % 3) * 4, my + 30); ctx.stroke(); }
    }
    // buckle
    const cv = OTR.cv;
    cv.rr(ctx, W - 150, H - 120, 80, 50, 8); ctx.fillStyle = '#5A5866'; ctx.fill();
  },

  close_pedal(ctx, W, H, o) {
    const cv = OTR.cv;
    ctx.fillStyle = '#2A2830'; ctx.fillRect(0, 0, W, H);
    // o.drop is the pedal's travel as the press plays out: a good pedal stops firm at the first mark and stays there,
    // a failing one keeps creeping down past it while the pressure is held (it used to jump to a lower spot with
    // nothing to compare it to, so "sinks slowly" could not be seen)
    const drop = o.drop !== undefined ? o.drop : o.pressed ? (o.bad ? 96 : 34) : 0;
    cv.rr(ctx, 150, 90 + drop, 150, 120, 12); ctx.fillStyle = '#1C1A24'; ctx.fill();
    ctx.fillStyle = '#3A3844';
    for (let y = 0; y < 5; y++) ctx.fillRect(160, 100 + drop + y * 22, 130, 8);
    // travel scale down the side
    ctx.strokeStyle = '#5A5866'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(340, 90); ctx.lineTo(340, 240); ctx.stroke();
    for (let i = 0; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(334, 90 + i * 50); ctx.lineTo(352, 90 + i * 50); ctx.stroke(); }
    // the travel marker is one neutral colour, and the caption says what you are doing, not what it means (it
    // said "holding" while the pedal sank)
    ctx.fillStyle = '#E8E4F0';
    ctx.beginPath(); ctx.arc(340, 96 + drop, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#9A94AA'; ctx.font = '800 13px "Segoe UI", Arial'; ctx.textAlign = 'left';
    ctx.fillText(o.pressed ? 'steady pressure' : 'press and hold', 366, 100 + drop);
  },

  close_extinguisher(ctx, W, H, o) {
    const cv = OTR.cv;
    cv.rr(ctx, 190, 50, 130, 230, 18); ctx.fillStyle = o.bad ? '#6A4A4A' : '#D8304A'; ctx.fill();
    cv.rr(ctx, 215, 26, 80, 34, 8); ctx.fillStyle = '#5A5866'; ctx.fill();
    // pressure gauge: needle in the green, or in the red when it is flat
    ctx.beginPath(); ctx.arc(255, 120, 40, 0, Math.PI * 2); ctx.fillStyle = '#F4F4F8'; ctx.fill();
    ctx.strokeStyle = '#2A2830'; ctx.lineWidth = 4; ctx.stroke();
    ctx.fillStyle = '#2BC48A'; ctx.beginPath(); ctx.arc(255, 120, 36, Math.PI * 1.15, Math.PI * 1.55); ctx.lineTo(255, 120); ctx.fill();
    ctx.fillStyle = '#E8304A'; ctx.beginPath(); ctx.arc(255, 120, 36, Math.PI * 1.6, Math.PI * 1.95); ctx.lineTo(255, 120); ctx.fill();
    const ang = o.bad ? Math.PI * 1.78 : Math.PI * 1.34;
    ctx.strokeStyle = '#1D1030'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(255, 120); ctx.lineTo(255 + Math.cos(ang) * 32, 120 + Math.sin(ang) * 32); ctx.stroke();
    // inspection tag: there, or just the empty tie where it should hang
    ctx.strokeStyle = '#9A94AA'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(318, 150); ctx.lineTo(340, 160); ctx.stroke();
    if (!o.bad) {
      cv.rr(ctx, 330, 150, 90, 60, 6); ctx.fillStyle = '#FFF4C0'; ctx.fill();
      ctx.fillStyle = '#3A2A50'; ctx.font = '800 11px "Segoe UI", Arial'; ctx.textAlign = 'center';
      ctx.fillText('INSPECTED', 375, 176);
      ctx.fillText('THIS YEAR', 375, 192);
    }
  },

  close_kit(ctx, W, H, o) {
    const cv = OTR.cv;
    cv.rr(ctx, 140, 70, 240, 180, 14); ctx.fillStyle = '#F4F4F8'; ctx.fill();
    ctx.fillStyle = '#C8243B';
    ctx.fillRect(248, 110, 24, 100); ctx.fillRect(210, 148, 100, 24);
    if (o.bad) {
      // the open case, empty inside
      ctx.fillStyle = 'rgba(40,40,52,0.9)'; cv.rr(ctx, 160, 150, 200, 96, 8); ctx.fill();
    } else {
      ctx.fillStyle = '#E8E4F0';
      [0, 1, 2].forEach(i => cv.rr(ctx, 170 + i * 66, 170, 54, 60, 6), ctx.fill());
      ctx.fillStyle = '#C9C5D4';
      [0, 1, 2].forEach(i => { cv.rr(ctx, 170 + i * 66, 170, 54, 60, 6); ctx.fill(); });
    }
  },

  close_triangles(ctx, W, H, o) {
    ctx.fillStyle = '#39353F'; ctx.fillRect(0, 0, W, H);
    const n = o.bad ? 1 : 3;
    for (let i = 0; i < n; i++) {
      const tx = W / 2 + (i - (n - 1) / 2) * 130, ty = H / 2 + 40;
      ctx.fillStyle = '#F0A030';
      ctx.beginPath(); ctx.moveTo(tx, ty - 80); ctx.lineTo(tx + 62, ty + 34); ctx.lineTo(tx - 62, ty + 34); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#FF4A3A';
      ctx.beginPath(); ctx.moveTo(tx, ty - 50); ctx.lineTo(tx + 38, ty + 18); ctx.lineTo(tx - 38, ty + 18); ctx.closePath(); ctx.fill();
    }
  },

  close_door(ctx, W, H, o) {
    const cv = OTR.cv;
    ctx.fillStyle = '#D2CEDC'; ctx.fillRect(40, 30, W - 80, H - 60);
    for (let y = 40; y < H - 60; y += 34) { ctx.fillStyle = (y / 34) % 2 === 0 ? '#E4E1EC' : '#CFCBDA'; ctx.fillRect(50, y, W - 100, 28); }
    cv.rr(ctx, W / 2 - 60, H - 130, 120, 46, 8); ctx.fillStyle = '#5A5866'; ctx.fill();
    // The latch looks the same either way; the pull test shows it (PRP-5): a bad latch lets the door swing open
    // under a pull, a good one holds.
    if (o.pressed && o.bad) {
      ctx.fillStyle = '#16141C'; ctx.fillRect(W - 110, 30, 70, H - 60);                     // the gap as it swings
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(W - 130, 30, 20, H - 60);
    }
    if (o.pressed) {
      ctx.fillStyle = '#E8E4F0'; ctx.font = '800 13px "Segoe UI", Arial'; ctx.textAlign = 'center';
      ctx.fillText('you pull hard on the handle', W / 2, 24);
    }
  },

  close_steps(ctx, W, H, o) {
    const cv = OTR.cv;
    ctx.fillStyle = '#39353F'; ctx.fillRect(0, 0, W, H);
    [0, 1].forEach(i => {
      cv.rr(ctx, 120 + i * 30, 110 + i * 90, 260, 40, 6);
      ctx.fillStyle = '#4A4652'; ctx.fill();
      ctx.fillStyle = '#6A6878';
      for (let k = 0; k < 8; k++) ctx.fillRect(134 + i * 30 + k * 30, 120 + i * 90, 14, 6);
    });
    if (o.bad) {
      // a greasy film on the BOTTOM step, as the defect says (it was a faint tint on the top one): a dark glossy
      // smear over the grip studs, with a shine on it and a drip over the edge
      const bx = 150, by = 200;
      ctx.fillStyle = 'rgba(40,30,20,0.72)';
      ctx.beginPath(); ctx.ellipse(bx + 130, by + 16, 120, 17, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(40,30,20,0.72)';
      ctx.beginPath(); ctx.moveTo(bx + 150, by + 38); ctx.quadraticCurveTo(bx + 158, by + 62, bx + 152, by + 70); ctx.quadraticCurveTo(bx + 146, by + 62, bx + 150, by + 38); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(bx + 40, by + 12); ctx.quadraticCurveTo(bx + 130, by + 4, bx + 220, by + 14); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(bx + 70, by + 24); ctx.quadraticCurveTo(bx + 140, by + 20, bx + 190, by + 26); ctx.stroke();
    }
  },

  close_reflector(ctx, W, H, o) {
    const cv = OTR.cv;
    ctx.fillStyle = '#2A2830'; ctx.fillRect(0, 0, W, H);
    cv.rr(ctx, 120, 120, 280, 80, 8);
    ctx.fillStyle = o.bad ? '#6A5A5A' : '#FF4A3A'; ctx.fill();
    if (!o.bad) {
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      for (let x = 130; x < 390; x += 26) { ctx.beginPath(); ctx.moveTo(x, 126); ctx.lineTo(x + 14, 126); ctx.lineTo(x, 192); ctx.closePath(); ctx.fill(); }
    } else {
      ctx.fillStyle = 'rgba(90,80,80,0.9)'; ctx.fillRect(120, 120, 150, 80);
      ctx.strokeStyle = 'rgba(30,30,36,0.9)'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(150, 130); ctx.lineTo(240, 190); ctx.stroke();
    }
  },

  close_fuel(ctx, W, H, o) {
    const cv = OTR.cv;
    ctx.fillStyle = '#4A4652'; ctx.fillRect(0, 0, W, H);
    ctx.beginPath(); ctx.arc(W / 2, H / 2, 90, 0, Math.PI * 2);
    ctx.fillStyle = '#2A2830'; ctx.fill();
    if (o.bad) {
      ctx.beginPath(); ctx.arc(W / 2 + 130, H / 2 + 60, 46, 0, Math.PI * 2);
      ctx.fillStyle = '#8A8898'; ctx.fill();
      ctx.fillStyle = 'rgba(180,160,90,0.35)';
      ctx.beginPath(); ctx.ellipse(W / 2, H / 2 + 110, 120, 26, 0, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.beginPath(); ctx.arc(W / 2, H / 2, 66, 0, Math.PI * 2);
      ctx.fillStyle = cv.rad(ctx, W / 2 - 20, H / 2 - 20, 4, 70, [[0, '#C9C5D4'], [1, '#7A7888']]); ctx.fill();
      ctx.strokeStyle = '#3A3844'; ctx.lineWidth = 6; ctx.stroke();
    }
  },

  close_gauge(ctx, W, H, o) {
    const cv = OTR.cv;
    ctx.fillStyle = '#1C1A24'; ctx.fillRect(0, 0, W, H);
    ctx.beginPath(); ctx.arc(W / 2, H / 2, 110, 0, Math.PI * 2);
    ctx.fillStyle = '#2A2833'; ctx.fill();
    ctx.strokeStyle = '#5A5866'; ctx.lineWidth = 5; ctx.stroke();
    // scale
    for (let i = 0; i <= 10; i++) {
      const a = Math.PI * 0.75 + (i / 10) * Math.PI * 1.5;
      ctx.strokeStyle = i >= 7 ? '#2BC48A' : i <= 2 ? '#E8304A' : '#9A94AA';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(W / 2 + Math.cos(a) * 92, H / 2 + Math.sin(a) * 92);
      ctx.lineTo(W / 2 + Math.cos(a) * 106, H / 2 + Math.sin(a) * 106);
      ctx.stroke();
    }
    // a step van's oil pressure gauge (hydraulic brakes, so no air gauge), with its warning lamp beside it
    const val = o.bad ? 0.18 : 0.62;
    const a = Math.PI * 0.75 + val * Math.PI * 1.5;
    ctx.strokeStyle = '#F4F0F8'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(W / 2, H / 2); ctx.lineTo(W / 2 + Math.cos(a) * 84, H / 2 + Math.sin(a) * 84); ctx.stroke();
    ctx.fillStyle = '#9A94AA'; ctx.font = '800 14px "Segoe UI", Arial'; ctx.textAlign = 'center';
    ctx.fillText('OIL PRESSURE', W / 2, H / 2 + 70);
    ctx.beginPath(); ctx.arc(W / 2 + 170, H / 2 - 60, 18, 0, Math.PI * 2);
    ctx.fillStyle = o.bad ? '#FFB020' : '#3A3844'; ctx.fill();
    ctx.fillStyle = o.bad ? '#3A2A10' : '#5A5866'; ctx.font = '900 13px "Segoe UI", Arial';
    ctx.fillText('OIL', W / 2 + 170, H / 2 - 55);
    void cv;
  },

  close_horn(ctx, W, H, o) {
    const cv = OTR.cv;
    ctx.fillStyle = '#2A2830'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#1C1A24'; ctx.lineWidth = 26;
    ctx.beginPath(); ctx.arc(W / 2, H / 2, 120, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#3A3844'; ctx.beginPath(); ctx.arc(W / 2, H / 2, 62, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = o.pressed ? '#8A8898' : '#6A6878';
    ctx.beginPath(); ctx.arc(W / 2, H / 2, 44, 0, Math.PI * 2); ctx.fill();
    if (o.pressed) {
      if (o.bad) {
        ctx.fillStyle = '#9A94AA'; ctx.font = '800 15px "Segoe UI", Arial'; ctx.textAlign = 'center';
        ctx.fillText('(nothing)', W / 2, H / 2 + 100);
      } else {
        ctx.strokeStyle = 'rgba(255,200,61,0.8)'; ctx.lineWidth = 5;
        [70, 92, 114].forEach((r, i) => { ctx.beginPath(); ctx.arc(W / 2, H / 2, r + 40, -0.6 + i * 0.05, 0.6 - i * 0.05); ctx.stroke(); });
      }
    }
    void cv;
  },

  close_park(ctx, W, H, o) {
    const cv = OTR.cv;
    ctx.fillStyle = '#39353F'; ctx.fillRect(0, 0, W, H);
    cv.rr(ctx, W / 2 - 40, 80, 80, 170, 14);
    ctx.fillStyle = o.bad ? '#6A5A5A' : '#F0C040'; ctx.fill();
    ctx.fillStyle = '#1C1A24'; ctx.font = '900 16px "Segoe UI", Arial'; ctx.textAlign = 'center';
    ctx.fillText('PARK', W / 2, 180);
    if (o.bad) {
      ctx.strokeStyle = '#C8243B'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(W / 2 - 60, 100); ctx.lineTo(W / 2 + 60, 230); ctx.stroke();
      ctx.fillStyle = '#FFFFFF'; ctx.font = '800 14px "Segoe UI", Arial';
      ctx.fillText('the knob springs back out', W / 2, 285);
    }
  },

  /** Tread-depth gauge the trainee drags onto a tire. */
  gauge(scene) {
    return OTR.tex.make(scene, 'tread_gauge', 90, 210, (ctx, w, h) => {
      const cv = OTR.cv;
      cv.rr(ctx, 26, 0, 38, 150, 6); ctx.fillStyle = '#E8E4F0'; ctx.fill();
      ctx.strokeStyle = '#3A3844'; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = '#3A3844';
      for (let i = 0; i <= 8; i++) {
        ctx.fillRect(28, 16 + i * 15, i % 2 === 0 ? 20 : 12, 3);
      }
      ctx.fillStyle = '#8A8898'; cv.rr(ctx, 40, 140, 10, 66, 3); ctx.fill();
      ctx.fillStyle = '#5A5866'; cv.rr(ctx, 18, 196, 54, 14, 4); ctx.fill();
    });
  }
};
