/*
 * Vector art painters (Canvas2D). OTR.draw.* paint into a ctx; OTR.art.* wrap them as cached textures.
 */
window.OTR = window.OTR || {};

OTR.draw = {
  /* ------------------------------------------------------------------ people */
  person(ctx, spec, expr) {
    const cv = OTR.cv;
    const skin = spec.skin || 0xE8B48F;
    const hair = spec.hair !== undefined ? spec.hair : 0x3B2A20;
    const shirt = spec.shirt || 0x5B7DB1;
    const style = spec.hairStyle || 'short';

    OTR.draw.hairBack(ctx, spec);

    // torso
    cv.shadow(ctx, 20, 8, 0.3);
    ctx.beginPath();
    ctx.moveTo(18, 440);
    ctx.bezierCurveTo(22, 372, 70, 336, 130, 326);
    ctx.lineTo(230, 326);
    ctx.bezierCurveTo(290, 336, 338, 372, 342, 440);
    ctx.closePath();
    ctx.fillStyle = cv.lin(ctx, 0, 326, 0, 440, [[0, OTR.color.shade(shirt, 0.15)], [1, OTR.color.shade(shirt, -0.25)]]);
    ctx.fill();
    cv.noShadow(ctx);

    // neck
    cv.rr(ctx, 150, 262, 60, 78, 20);
    ctx.fillStyle = cv.c(OTR.color.shade(skin, -0.18));
    ctx.fill();

    // collar
    if (spec.uniform) {
      ctx.beginPath();
      ctx.moveTo(138, 326); ctx.lineTo(180, 382); ctx.lineTo(222, 326); ctx.lineTo(206, 322); ctx.lineTo(180, 356); ctx.lineTo(154, 322);
      ctx.closePath();
      ctx.fillStyle = cv.c(OTR_DATA.theme.accent);
      ctx.fill();
      cv.rr(ctx, 230, 372, 50, 16, 4);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      cv.rr(ctx, 234, 376, 18, 8, 2);
      ctx.fillStyle = cv.c(OTR_DATA.theme.accent);
      ctx.fill();
    } else if (spec.collar) {
      ctx.beginPath();
      ctx.moveTo(140, 326); ctx.lineTo(180, 370); ctx.lineTo(220, 326);
      ctx.lineWidth = 8; ctx.strokeStyle = cv.c(OTR.color.shade(shirt, 0.45)); ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(180, 322, 34, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.lineWidth = 6; ctx.strokeStyle = cv.c(OTR.color.shade(shirt, -0.3)); ctx.stroke();
    }
    if (spec.tie) {
      ctx.beginPath(); ctx.moveTo(172, 340); ctx.lineTo(188, 340); ctx.lineTo(194, 420); ctx.lineTo(180, 440); ctx.lineTo(166, 420); ctx.closePath();
      ctx.fillStyle = cv.c(spec.tie); ctx.fill();
    }
    if (spec.lanyard) {
      ctx.beginPath(); ctx.moveTo(150, 330); ctx.lineTo(180, 410); ctx.lineTo(210, 330);
      ctx.lineWidth = 5; ctx.strokeStyle = cv.c(spec.lanyard); ctx.stroke();
      cv.rr(ctx, 166, 404, 28, 34, 4); ctx.fillStyle = '#fff'; ctx.fill();
    }

    OTR.draw.headBase(ctx, spec);
    OTR.draw.face(ctx, spec, expr);
  },

  /** Long hair / ponytail that sits behind the head and shoulders (portrait coordinates). */
  hairBack(ctx, spec) {
    const cv = OTR.cv;
    const hair = spec.hair !== undefined ? spec.hair : 0x3B2A20;
    const style = spec.hairStyle || 'short';
    if (style === 'long') {
      cv.rr(ctx, 86, 120, 188, 250, 80);
      ctx.fillStyle = cv.lin(ctx, 0, 120, 0, 370, [[0, OTR.color.shade(hair, 0.1)], [1, OTR.color.shade(hair, -0.3)]]);
      ctx.fill();
    }
    if (style === 'ponytail') {
      cv.ellipse(ctx, 272, 210, 30, 70, 0.35);
      ctx.fillStyle = cv.c(OTR.color.shade(hair, -0.15));
      ctx.fill();
    }
  },

  /** Ears, head shape, beard and hair/cap — no facial features (portrait coordinates, head centre 180,200). */
  headBase(ctx, spec) {
    const cv = OTR.cv;
    const skin = spec.skin || 0xE8B48F;
    const hair = spec.hair !== undefined ? spec.hair : 0x3B2A20;
    const style = spec.hairStyle || 'short';
    const cx = 180;

    // ears
    [[103, 1], [257, -1]].forEach(([ex]) => {
      cv.ellipse(ctx, ex, 212, 15, 22);
      ctx.fillStyle = cv.c(OTR.color.shade(skin, -0.08));
      ctx.fill();
    });
    if (spec.earrings) {
      [103, 257].forEach(ex => { ctx.beginPath(); ctx.arc(ex, 238, 6, 0, Math.PI * 2); ctx.fillStyle = cv.c(spec.earrings); ctx.fill(); });
    }

    // head
    cv.ellipse(ctx, cx, 200, 78, 92);
    ctx.fillStyle = cv.rad(ctx, 150, 160, 10, 130, [[0, OTR.color.shade(skin, 0.18)], [1, OTR.color.shade(skin, -0.1)]]);
    ctx.fill();

    // beard
    if (spec.beard) {
      ctx.beginPath();
      ctx.moveTo(104, 200);
      ctx.bezierCurveTo(108, 270, 140, 296, 180, 296);
      ctx.bezierCurveTo(220, 296, 252, 270, 256, 200);
      ctx.bezierCurveTo(246, 240, 226, 244, 180, 244);
      ctx.bezierCurveTo(134, 244, 114, 240, 104, 200);
      ctx.fillStyle = cv.c(hair);
      ctx.fill();
    }

    // hair on top
    ctx.fillStyle = cv.lin(ctx, 0, 100, 0, 220, [[0, OTR.color.shade(hair, 0.15)], [1, OTR.color.shade(hair, -0.2)]]);
    if (style === 'short' || style === 'long' || style === 'bun' || style === 'ponytail') {
      ctx.beginPath();
      ctx.moveTo(100, 206);
      ctx.bezierCurveTo(88, 120, 150, 92, 190, 100);
      ctx.bezierCurveTo(250, 106, 272, 150, 260, 206);
      ctx.bezierCurveTo(246, 160, 214, 148, 196, 140);
      ctx.bezierCurveTo(170, 162, 130, 158, 100, 206);
      ctx.fill();
      if (style === 'bun') { ctx.beginPath(); ctx.arc(180, 98, 34, 0, Math.PI * 2); ctx.fill(); }
    } else if (style === 'curly') {
      const pts = [[104, 180], [110, 146], [128, 120], [154, 104], [184, 100], [212, 106], [238, 124], [254, 150], [258, 182], [140, 132], [180, 126], [220, 138]];
      pts.forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 26, 0, Math.PI * 2); ctx.fill(); });
    } else if (style === 'buzz') {
      ctx.globalAlpha = 0.55;
      ctx.beginPath();
      ctx.moveTo(102, 196); ctx.bezierCurveTo(96, 120, 150, 106, 180, 106);
      ctx.bezierCurveTo(210, 106, 264, 120, 258, 196);
      ctx.bezierCurveTo(240, 150, 120, 150, 102, 196);
      ctx.fill();
      ctx.globalAlpha = 1;
    } else if (style === 'bald') {
      cv.ellipse(ctx, 150, 140, 22, 12, -0.4);
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fill();
      ctx.fillStyle = cv.c(hair);
      [[104, 208], [256, 208]].forEach(([x]) => { cv.ellipse(ctx, x, 190, 10, 26); ctx.fill(); });
    } else if (style === 'cap') {
      const capC = spec.capColor || OTR_DATA.theme.primary;
      ctx.fillStyle = cv.c(hair);
      [[110, 0], [250, 0]].forEach(([x]) => { cv.ellipse(ctx, x, 182, 7, 14); ctx.fill(); });
      ctx.beginPath();
      ctx.moveTo(98, 170);
      ctx.bezierCurveTo(96, 96, 264, 96, 262, 170);
      ctx.closePath();
      ctx.fillStyle = cv.lin(ctx, 0, 100, 0, 170, [[0, OTR.color.shade(capC, 0.25)], [1, OTR.color.shade(capC, -0.1)]]);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(92, 168); ctx.bezierCurveTo(140, 150, 220, 150, 290, 172); ctx.bezierCurveTo(240, 190, 140, 186, 92, 176);
      ctx.closePath();
      ctx.fillStyle = cv.c(OTR.color.shade(capC, -0.3));
      ctx.fill();
      cv.rr(ctx, 160, 122, 40, 18, 5);
      ctx.fillStyle = cv.c(OTR_DATA.theme.accent);
      ctx.fill();
    }
  },

  face(ctx, spec, expr) {
    OTR.draw.faceEyes(ctx, spec, expr);
    OTR.draw.faceMid(ctx, spec, expr);
    OTR.draw.faceMouth(ctx, spec, expr);
    OTR.draw.faceAccents(ctx, spec, expr);
  },

  /** Eyes, brows and glasses. blink: draw closed eyes. */
  faceEyes(ctx, spec, expr, blink) {
    const cv = OTR.cv;
    const ink = '#2A1A22';
    const skin = spec.skin || 0xE8B48F;
    const browC = cv.c(OTR.color.shade(spec.hair !== undefined ? spec.hair : 0x3B2A20, -0.2));
    const eyeY = 206;

    // eyes
    const eyeW = expr === 'shocked' ? 11 : 8;
    const eyeH = expr === 'shocked' ? 13 : (expr === 'happy' ? 3 : 10);
    [148, 212].forEach(ex => {
      if (blink) {
        ctx.beginPath();
        ctx.moveTo(ex - 10, eyeY + 2); ctx.quadraticCurveTo(ex, eyeY + 7, ex + 10, eyeY + 2);
        ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.strokeStyle = ink; ctx.stroke();
      } else if (expr === 'happy') {
        ctx.beginPath();
        ctx.arc(ex, eyeY + 4, 10, Math.PI * 1.1, Math.PI * 1.9);
        ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.strokeStyle = ink; ctx.stroke();
      } else {
        if (expr === 'shocked') {
          cv.ellipse(ctx, ex, eyeY, 16, 17); ctx.fillStyle = '#fff'; ctx.fill();
        }
        cv.ellipse(ctx, ex, eyeY, eyeW, eyeH); ctx.fillStyle = ink; ctx.fill();
        ctx.beginPath(); ctx.arc(ex + 3, eyeY - 3, 2.6, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill();
        if (expr === 'annoyed') {
          ctx.fillStyle = cv.c(OTR.color.shade(skin, 0.05));
          ctx.fillRect(ex - 14, eyeY - 16, 28, 12);
        }
      }
    });

    // brows
    ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.strokeStyle = browC;
    const brow = (x1, y1, x2, y2) => { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };
    switch (expr) {
      case 'angry': brow(128, 170, 166, 186); brow(232, 170, 194, 186); break;
      case 'annoyed': brow(128, 180, 166, 184); brow(232, 176, 194, 182); break;
      case 'worried': brow(128, 184, 164, 170); brow(232, 184, 196, 170); break;
      case 'shocked': brow(128, 166, 166, 160); brow(232, 166, 194, 160); break;
      case 'happy': brow(128, 174, 166, 170); brow(232, 174, 194, 170); break;
      default: brow(130, 180, 166, 178); brow(230, 180, 194, 178);
    }

    // glasses
    if (spec.glasses) {
      ctx.lineWidth = 4; ctx.strokeStyle = cv.c(spec.glasses === true ? 0x222222 : spec.glasses);
      cv.rr(ctx, 120, 188, 56, 40, 12); ctx.stroke();
      cv.rr(ctx, 184, 188, 56, 40, 12); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(176, 204); ctx.lineTo(184, 204); ctx.stroke();
    }
  },

  /** Nose, blush / anger flush and mustache. */
  faceMid(ctx, spec, expr) {
    const cv = OTR.cv;
    const skin = spec.skin || 0xE8B48F;

    // nose
    ctx.beginPath();
    ctx.moveTo(182, 214); ctx.quadraticCurveTo(194, 236, 178, 238);
    ctx.lineWidth = 4; ctx.strokeStyle = cv.c(OTR.color.shade(skin, -0.25)); ctx.stroke();

    // blush
    if (expr === 'happy' || expr === 'neutral') {
      ctx.fillStyle = 'rgba(255,110,120,' + (expr === 'happy' ? 0.28 : 0.12) + ')';
      cv.ellipse(ctx, 128, 238, 16, 9); ctx.fill();
      cv.ellipse(ctx, 232, 238, 16, 9); ctx.fill();
    }
    if (expr === 'angry') {
      ctx.fillStyle = 'rgba(230,40,40,0.18)';
      cv.ellipse(ctx, 180, 200, 76, 90); ctx.fill();
    }

    // mustache
    if (spec.mustache) {
      ctx.beginPath();
      ctx.moveTo(150, 254); ctx.bezierCurveTo(160, 238, 176, 244, 180, 250); ctx.bezierCurveTo(184, 244, 200, 238, 210, 254); ctx.bezierCurveTo(196, 252, 186, 256, 180, 256); ctx.bezierCurveTo(174, 256, 164, 252, 150, 254);
      ctx.fillStyle = cv.c(spec.hair !== undefined ? spec.hair : 0x3B2A20); ctx.fill();
    }
  },

  /** Mouth for an expression. open: 'open' | 'wide' draws a talking mouth instead. */
  faceMouth(ctx, spec, expr, open) {
    const cv = OTR.cv;
    const ink = '#2A1A22';
    ctx.lineWidth = 5; ctx.strokeStyle = ink; ctx.lineCap = 'round';
    const my = 264;
    if (open) {
      const rw = open === 'wide' ? 17 : 13, rh = open === 'wide' ? 15 : 9;
      cv.ellipse(ctx, 180, my + 3, rw, rh); ctx.fillStyle = '#5A1E2C'; ctx.fill();
      ctx.save(); ctx.clip(); ctx.fillStyle = '#E86A7A'; cv.ellipse(ctx, 180, my + 3 + rh, rw * 0.7, rh * 0.6); ctx.fill(); ctx.restore();
      return;
    }
    switch (expr) {
      case 'happy':
        ctx.beginPath(); ctx.moveTo(152, my - 6); ctx.quadraticCurveTo(180, my + 30, 208, my - 6); ctx.closePath();
        ctx.fillStyle = '#5A1E2C'; ctx.fill();
        ctx.save(); ctx.clip(); ctx.fillStyle = '#fff'; ctx.fillRect(150, my - 8, 60, 9); ctx.restore();
        break;
      case 'angry':
        ctx.beginPath(); ctx.moveTo(154, my + 12); ctx.quadraticCurveTo(180, my - 12, 206, my + 12); ctx.closePath();
        ctx.fillStyle = '#5A1E2C'; ctx.fill();
        ctx.save(); ctx.clip(); ctx.fillStyle = '#fff'; ctx.fillRect(150, my - 4, 60, 8); ctx.restore();
        break;
      case 'annoyed':
        ctx.beginPath(); ctx.moveTo(158, my + 4); ctx.lineTo(202, my - 2); ctx.stroke();
        break;
      case 'worried':
        ctx.beginPath(); ctx.moveTo(156, my + 4); ctx.quadraticCurveTo(168, my - 4, 180, my + 3); ctx.quadraticCurveTo(192, my + 10, 204, my + 1); ctx.stroke();
        break;
      case 'shocked':
        cv.ellipse(ctx, 180, my + 4, 14, 18); ctx.fillStyle = '#5A1E2C'; ctx.fill();
        break;
      default:
        ctx.beginPath(); ctx.moveTo(160, my); ctx.quadraticCurveTo(180, my + 10, 200, my); ctx.stroke();
    }
  },

  /** Anger marks / sweat drop drawn outside the head outline. */
  faceAccents(ctx, spec, expr) {
    // cartoon accents
    if (expr === 'angry') {
      ctx.strokeStyle = '#E8304A'; ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(264, 112); ctx.lineTo(276, 124); ctx.moveTo(290, 112); ctx.lineTo(278, 124);
      ctx.moveTo(264, 142); ctx.lineTo(276, 130); ctx.moveTo(290, 142); ctx.lineTo(278, 130);
      ctx.stroke();
    }
    if (expr === 'worried' || expr === 'shocked') {
      ctx.beginPath();
      ctx.moveTo(262, 150); ctx.quadraticCurveTo(276, 172, 270, 180); ctx.quadraticCurveTo(256, 184, 256, 170); ctx.closePath();
      ctx.fillStyle = 'rgba(140,210,255,0.9)'; ctx.fill();
    }
  },

  /* ------------------------------------------------------------------ dog */
  dog(ctx, spec, expr) {
    const cv = OTR.cv;
    const fur = spec.fur || 0xC98B4F;
    const patch = spec.patch || 0xF3E3CC;
    const ink = '#1E1414';

    // body
    cv.shadow(ctx, 20, 8, 0.3);
    ctx.beginPath();
    ctx.moveTo(40, 440); ctx.bezierCurveTo(50, 350, 110, 320, 180, 320); ctx.bezierCurveTo(250, 320, 310, 350, 320, 440); ctx.closePath();
    ctx.fillStyle = cv.lin(ctx, 0, 320, 0, 440, [[0, OTR.color.shade(fur, 0.05)], [1, OTR.color.shade(fur, -0.3)]]);
    ctx.fill();
    cv.noShadow(ctx);
    ctx.beginPath();
    ctx.moveTo(130, 440); ctx.bezierCurveTo(130, 380, 150, 350, 180, 350); ctx.bezierCurveTo(210, 350, 230, 380, 230, 440); ctx.closePath();
    ctx.fillStyle = cv.c(patch); ctx.fill();

    // ears
    const earsUp = expr === 'alert';
    const earsBack = expr === 'growl';
    ctx.fillStyle = cv.c(OTR.color.shade(fur, -0.3));
    [-1, 1].forEach(side => {
      ctx.beginPath();
      if (earsUp) {
        ctx.moveTo(180 + side * 40, 170); ctx.lineTo(180 + side * 96, 70); ctx.lineTo(180 + side * 100, 190);
      } else if (earsBack) {
        ctx.moveTo(180 + side * 50, 170); ctx.lineTo(180 + side * 128, 130); ctx.lineTo(180 + side * 96, 206);
      } else {
        ctx.moveTo(180 + side * 50, 160); ctx.bezierCurveTo(180 + side * 130, 150, 180 + side * 140, 250, 180 + side * 110, 290); ctx.bezierCurveTo(180 + side * 90, 260, 180 + side * 80, 220, 180 + side * 70, 200);
      }
      ctx.closePath(); ctx.fill();
    });

    // collar
    cv.rr(ctx, 110, 300, 140, 26, 12);
    ctx.fillStyle = cv.c(spec.collar || 0xE8304A); ctx.fill();
    ctx.beginPath(); ctx.arc(180, 336, 13, 0, Math.PI * 2); ctx.fillStyle = cv.c(0xFFC83D); ctx.fill();

    // head
    cv.ellipse(ctx, 180, 215, 92, 90);
    ctx.fillStyle = cv.rad(ctx, 150, 170, 10, 130, [[0, OTR.color.shade(fur, 0.2)], [1, OTR.color.shade(fur, -0.1)]]);
    ctx.fill();
    // face patch & snout
    cv.ellipse(ctx, 180, 268, 58, 44); ctx.fillStyle = cv.c(patch); ctx.fill();
    cv.ellipse(ctx, 180, 185, 18, 50); ctx.fill();

    // eyes
    [140, 220].forEach(ex => {
      if (expr === 'happy') {
        ctx.beginPath(); ctx.arc(ex, 212, 11, Math.PI * 1.1, Math.PI * 1.9); ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.strokeStyle = ink; ctx.stroke();
      } else {
        cv.ellipse(ctx, ex, 206, 12, 13); ctx.fillStyle = ink; ctx.fill();
        ctx.beginPath(); ctx.arc(ex + 4, 202, 3.5, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill();
      }
    });
    if (expr === 'growl') {
      ctx.lineWidth = 8; ctx.strokeStyle = cv.c(OTR.color.shade(fur, -0.45)); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(118, 178); ctx.lineTo(158, 194); ctx.moveTo(242, 178); ctx.lineTo(202, 194); ctx.stroke();
    }

    // nose
    cv.ellipse(ctx, 180, 246, 22, 15); ctx.fillStyle = ink; ctx.fill();
    cv.ellipse(ctx, 174, 241, 7, 4); ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fill();

    // mouth
    ctx.lineWidth = 5; ctx.strokeStyle = ink; ctx.lineCap = 'round';
    if (expr === 'growl') {
      ctx.beginPath(); ctx.moveTo(136, 286); ctx.quadraticCurveTo(180, 262, 224, 286); ctx.quadraticCurveTo(180, 304, 136, 286);
      ctx.fillStyle = '#5A1E2C'; ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff';
      for (let i = 0; i < 6; i++) {
        const tx = 146 + i * 14;
        ctx.beginPath(); ctx.moveTo(tx, 280 - (i === 0 || i === 5 ? 0 : 3)); ctx.lineTo(tx + 7, 294); ctx.lineTo(tx + 14, 280 - (i === 0 || i === 5 ? 0 : 3)); ctx.fill();
      }
    } else if (expr === 'happy') {
      ctx.beginPath(); ctx.moveTo(180, 262); ctx.lineTo(180, 276); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(146, 272); ctx.quadraticCurveTo(162, 294, 180, 276); ctx.quadraticCurveTo(198, 294, 214, 272); ctx.stroke();
      cv.rr(ctx, 166, 282, 28, 40, 14); ctx.fillStyle = '#FF7A9A'; ctx.fill();
      ctx.beginPath(); ctx.moveTo(180, 290); ctx.lineTo(180, 314); ctx.lineWidth = 3; ctx.strokeStyle = '#D84C6E'; ctx.stroke();
    } else {
      ctx.beginPath(); ctx.moveTo(180, 262); ctx.lineTo(180, 278); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(152, 278); ctx.quadraticCurveTo(166, 290, 180, 278); ctx.quadraticCurveTo(194, 290, 208, 278); ctx.stroke();
    }

    if (expr === 'growl') {
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 4;
      [[40, 120], [300, 110], [30, 250]].forEach(([x, y]) => {
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 20, y - 12); ctx.moveTo(x, y + 14); ctx.lineTo(x + 24, y + 12); ctx.stroke();
      });
    }
  },

  /* ------------------------------------------------------------------ vehicles */
  vanSide(ctx, w, h, o) {
    o = o || {};
    const cv = OTR.cv;
    const body = o.body || 0xF2F5F8;
    // shadow
    cv.ellipse(ctx, w * 0.5, h - 12, w * 0.46, 10); ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fill();
    // cargo body
    cv.rr(ctx, 8, 14, w * 0.7, h - 52, 10);
    ctx.fillStyle = cv.lin(ctx, 0, 14, 0, h - 38, [[0, OTR.color.shade(body, 0.05)], [1, OTR.color.shade(body, -0.14)]]);
    ctx.fill();
    // cab
    ctx.beginPath();
    ctx.moveTo(w * 0.7 + 4, 34); ctx.lineTo(w * 0.86, 34); ctx.lineTo(w - 8, h * 0.52); ctx.lineTo(w - 8, h - 42);
    ctx.quadraticCurveTo(w - 8, h - 38, w - 14, h - 38); ctx.lineTo(w * 0.7 + 4, h - 38); ctx.closePath();
    ctx.fill();
    // windshield
    ctx.beginPath();
    ctx.moveTo(w * 0.74, 44); ctx.lineTo(w * 0.85, 44); ctx.lineTo(w - 20, h * 0.5); ctx.lineTo(w * 0.74, h * 0.5); ctx.closePath();
    ctx.fillStyle = cv.lin(ctx, w * 0.74, 44, w - 20, h * 0.5, [[0, '#6FA8DC'], [0.5, '#24476E'], [1, '#18304D']]);
    ctx.fill();
    ctx.beginPath(); ctx.moveTo(w * 0.77, 50); ctx.lineTo(w * 0.8, 50); ctx.lineTo(w * 0.76, h * 0.46); ctx.lineTo(w * 0.745, h * 0.46); ctx.closePath();
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fill();
    // stripes
    ctx.fillStyle = cv.c(OTR_DATA.theme.primary);
    ctx.fillRect(8, h * 0.52, w - 16, 16);
    ctx.fillStyle = cv.c(OTR_DATA.theme.accent);
    ctx.fillRect(8, h * 0.52 + 16, w - 16, 6);
    // box emblem
    ctx.save();
    ctx.translate(w * 0.3, h * 0.3);
    ctx.fillStyle = cv.c(OTR_DATA.theme.primary);
    ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(22, -8); ctx.lineTo(22, 14); ctx.lineTo(0, 24); ctx.lineTo(-22, 14); ctx.lineTo(-22, -8); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = cv.c(OTR_DATA.theme.accent); ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-22, -8); ctx.lineTo(0, 2); ctx.lineTo(22, -8); ctx.moveTo(0, 2); ctx.lineTo(0, 24); ctx.stroke();
    ctx.restore();
    // door line & handle
    ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(w * 0.7 + 4, 36); ctx.lineTo(w * 0.7 + 4, h - 40); ctx.stroke();
    // lights
    cv.rr(ctx, w - 16, h * 0.56, 8, 14, 3); ctx.fillStyle = '#FFE58A'; ctx.fill();
    cv.rr(ctx, 8, h * 0.3, 6, 16, 2); ctx.fillStyle = '#E8304A'; ctx.fill();
    // bumper
    cv.rr(ctx, w * 0.74, h - 44, w * 0.26 - 4, 8, 3); ctx.fillStyle = '#555'; ctx.fill();
    // wheels
    [w * 0.2, w * 0.8].forEach(wx => {
      ctx.beginPath(); ctx.arc(wx, h - 34, 24, 0, Math.PI * 2); ctx.fillStyle = '#1E1E24'; ctx.fill();
      ctx.beginPath(); ctx.arc(wx, h - 34, 12, 0, Math.PI * 2); ctx.fillStyle = cv.rad(ctx, wx - 3, h - 37, 1, 12, [[0, '#E8E8F0'], [1, '#8A8A99']]); ctx.fill();
    });
  },

  vanTop(ctx, w, h) {
    const cv = OTR.cv;
    cv.shadow(ctx, 10, 4, 0.4);
    cv.rr(ctx, 6, 8, w - 12, h - 14, 12);
    ctx.fillStyle = cv.lin(ctx, 6, 0, w - 6, 0, [[0, '#d9dfe5'], [0.5, '#FFFFFF'], [1, '#d9dfe5']]);
    ctx.fill();
    cv.noShadow(ctx);
    // windshield (front = top)
    cv.rr(ctx, 12, 18, w - 24, 20, 6);
    ctx.fillStyle = cv.lin(ctx, 0, 18, 0, 38, [[0, '#6FA8DC'], [1, '#1D3A5C']]); ctx.fill();
    // roof stripes
    ctx.fillStyle = cv.c(OTR_DATA.theme.primary); ctx.fillRect(w * 0.5 - 7, 44, 14, h - 56);
    ctx.fillStyle = cv.c(OTR_DATA.theme.accent); ctx.fillRect(w * 0.5 + 7, 44, 4, h - 56);
    // mirrors
    ctx.fillStyle = '#333'; cv.rr(ctx, 0, 32, 8, 10, 2); ctx.fill(); cv.rr(ctx, w - 8, 32, 8, 10, 2); ctx.fill();
    // lights
    ctx.fillStyle = '#FFF4B0'; cv.rr(ctx, 10, 8, 12, 5, 2); ctx.fill(); cv.rr(ctx, w - 22, 8, 12, 5, 2); ctx.fill();
    ctx.fillStyle = '#E8304A'; cv.rr(ctx, 10, h - 9, 12, 4, 2); ctx.fill(); cv.rr(ctx, w - 22, h - 9, 12, 4, 2); ctx.fill();
  },

  carTop(ctx, w, h, color) {
    const cv = OTR.cv;
    cv.shadow(ctx, 8, 4, 0.35);
    cv.rr(ctx, 4, 4, w - 8, h - 8, 14);
    ctx.fillStyle = cv.lin(ctx, 4, 0, w - 4, 0, [[0, OTR.color.shade(color, -0.2)], [0.5, OTR.color.shade(color, 0.2)], [1, OTR.color.shade(color, -0.2)]]);
    ctx.fill();
    cv.noShadow(ctx);
    cv.rr(ctx, 10, h * 0.22, w - 20, h * 0.18, 6); ctx.fillStyle = '#233A55'; ctx.fill();
    cv.rr(ctx, 10, h * 0.68, w - 20, h * 0.12, 5); ctx.fill();
    cv.rr(ctx, 12, h * 0.42, w - 24, h * 0.24, 6); ctx.fillStyle = cv.c(OTR.color.shade(color, 0.1)); ctx.fill();
  },

  /* ------------------------------------------------------------------ packages & marks */
  box(ctx, o) {
    // o: fw, fh (front face), depth, color, x, y (front face top-left)
    const cv = OTR.cv;
    const { fw, fh, d } = o;
    const x = o.x, y = o.y;
    const color = o.color !== undefined ? o.color : 0xC99A62;
    const crushed = o.damage === 'crushed' || o.damage === 'leak';
    // shadow
    cv.ellipse(ctx, x + fw / 2 + d / 2, y + fh + 4, fw / 2 + d / 2, 8);
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fill();
    // side
    ctx.beginPath(); ctx.moveTo(x + fw, y); ctx.lineTo(x + fw + d, y - d * 0.6); ctx.lineTo(x + fw + d, y + fh - d * 0.6); ctx.lineTo(x + fw, y + fh); ctx.closePath();
    ctx.fillStyle = cv.c(OTR.color.shade(color, -0.28)); ctx.fill();
    // top
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + d, y - d * 0.6); ctx.lineTo(x + fw + d, y - d * 0.6); ctx.lineTo(x + fw, y);
    if (crushed) { ctx.lineTo(x + fw * 0.6, y + fh * 0.12); ctx.lineTo(x + fw * 0.35, y + 2); }
    ctx.closePath();
    ctx.fillStyle = cv.c(OTR.color.shade(color, 0.18)); ctx.fill();
    // front
    ctx.beginPath(); ctx.moveTo(x, y);
    if (crushed) { ctx.lineTo(x + fw * 0.35, y + 2); ctx.lineTo(x + fw * 0.6, y + fh * 0.12); }
    ctx.lineTo(x + fw, y); ctx.lineTo(x + fw, y + fh); ctx.lineTo(x, y + fh); ctx.closePath();
    ctx.fillStyle = cv.lin(ctx, 0, y, 0, y + fh, [[0, OTR.color.shade(color, 0.04)], [1, OTR.color.shade(color, -0.1)]]);
    ctx.fill();
    // tape
    if (o.tape !== false && !o.pak) {
      ctx.fillStyle = 'rgba(255,240,200,0.35)';
      ctx.beginPath(); ctx.moveTo(x + d * 0.5 + fw * 0.45, y - d * 0.3); ctx.lineTo(x + d * 0.5 + fw * 0.55, y - d * 0.3); ctx.lineTo(x + fw * 0.55, y); ctx.lineTo(x + fw * 0.45, y); ctx.closePath(); ctx.fill();
      ctx.fillRect(x + fw * 0.45, y, fw * 0.1, fh * 0.22);
    }
    if (crushed) {
      // caved-in dent shading
      ctx.fillStyle = 'rgba(40,20,5,0.35)';
      ctx.beginPath(); ctx.moveTo(x + fw * 0.3, y + 1); ctx.lineTo(x + fw * 0.6, y + fh * 0.2); ctx.lineTo(x + fw * 0.72, y + 1); ctx.lineTo(x + fw * 0.58, y + fh * 0.45); ctx.lineTo(x + fw * 0.38, y + fh * 0.3); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(50,22,5,0.8)'; ctx.lineWidth = Math.max(2, fw * 0.03);
      ctx.beginPath();
      ctx.moveTo(x + fw * 0.35, y + 2); ctx.lineTo(x + fw * 0.45, y + fh * 0.38); ctx.lineTo(x + fw * 0.28, y + fh * 0.62); ctx.lineTo(x + fw * 0.36, y + fh * 0.85);
      ctx.moveTo(x + fw * 0.6, y + fh * 0.12); ctx.lineTo(x + fw * 0.74, y + fh * 0.44); ctx.lineTo(x + fw * 0.66, y + fh * 0.7);
      ctx.moveTo(x + fw, y + fh * 0.18); ctx.lineTo(x + fw * 0.84, y + fh * 0.32);
      ctx.moveTo(x, y + fh * 0.3); ctx.lineTo(x + fw * 0.14, y + fh * 0.42);
      ctx.stroke();
      // torn flap
      ctx.fillStyle = cv.c(OTR.color.shade(color, 0.3));
      ctx.beginPath(); ctx.moveTo(x + fw * 0.72, y); ctx.lineTo(x + fw * 0.95, y - d * 0.55); ctx.lineTo(x + fw * 0.98, y - d * 0.15); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(50,22,5,0.6)'; ctx.lineWidth = 1.5; ctx.stroke();
    }
    if (o.damage === 'leak') {
      ctx.fillStyle = 'rgba(20,50,90,0.7)';
      ctx.beginPath(); ctx.moveTo(x + fw * 0.05, y + fh); ctx.bezierCurveTo(x + fw * 0.02, y + fh * 0.45, x + fw * 0.55, y + fh * 0.35, x + fw * 0.65, y + fh * 0.7); ctx.bezierCurveTo(x + fw * 0.75, y + fh * 0.9, x + fw * 0.9, y + fh, x + fw * 0.9, y + fh); ctx.closePath(); ctx.fill();
      cv.ellipse(ctx, x + fw * 0.45, y + fh + 7, fw * 0.5, 8); ctx.fillStyle = 'rgba(40,110,190,0.75)'; ctx.fill();
      ctx.fillStyle = 'rgba(120,190,255,0.95)';
      [[0.3, 12], [0.55, 18], [0.7, 10]].forEach(([fx, dy]) => { cv.ellipse(ctx, x + fw * fx, y + fh + dy, 3.5, 5); ctx.fill(); });
    }
  },

  shippingLabel(ctx, x, y, w, h, o) {
    o = o || {};
    const cv = OTR.cv;
    cv.rr(ctx, x, y, w, h, 3); ctx.fillStyle = '#FFFFFF'; ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 1; ctx.stroke();
    if (o.stripe !== undefined) { ctx.fillStyle = cv.c(o.stripe); ctx.fillRect(x, y, w, Math.max(4, h * 0.16)); }
    if (o.code) {
      ctx.fillStyle = OTR_DATA.theme.css('ink');
      ctx.font = `900 ${Math.round(h * 0.62)}px "Segoe UI", Arial`;
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(o.code, x + w * 0.05, y + h * 0.58);
    }
    // barcode
    const bx = o.code ? x + w * 0.62 : x + w * 0.1, bw = o.code ? w * 0.32 : w * 0.8;
    ctx.fillStyle = OTR_DATA.theme.css('ink');
    let px = bx;
    let i = 0;
    while (px < bx + bw) {
      const lw = (i * 7 % 3) + 1;
      ctx.fillRect(px, y + h * 0.3, lw * (w / 90), h * 0.5);
      px += (lw + 1.5) * (w / 90);
      i++;
    }
    if (!o.code) {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(x + w * 0.1, y + h * 0.84, w * 0.5, 2);
    }
  },

  /** Handling / hazard marks centred on (cx, cy); s = half-size. */
  mark(ctx, type, cx, cy, s) {
    const cv = OTR.cv;
    const diamond = (fillTop, fillBottom, border) => {
      ctx.save();
      ctx.beginPath(); ctx.moveTo(cx, cy - s); ctx.lineTo(cx + s, cy); ctx.lineTo(cx, cy + s); ctx.lineTo(cx - s, cy); ctx.closePath();
      ctx.fillStyle = fillTop; ctx.fill();
      if (fillBottom) {
        ctx.save(); ctx.clip(); ctx.fillStyle = fillBottom; ctx.fillRect(cx - s, cy, s * 2, s); ctx.restore();
      }
      ctx.lineWidth = Math.max(1, s * 0.03); ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.stroke();
      const i = s * 0.88;
      ctx.beginPath(); ctx.moveTo(cx, cy - i); ctx.lineTo(cx + i, cy); ctx.lineTo(cx, cy + i); ctx.lineTo(cx - i, cy); ctx.closePath();
      ctx.lineWidth = Math.max(1, s * 0.035); ctx.strokeStyle = border || '#1a1a1a'; ctx.stroke();
      ctx.restore();
    };
    const num = (t, color, yOff) => {
      ctx.fillStyle = color || '#111';
      ctx.font = `900 ${Math.round(s * 0.36)}px "Segoe UI", Arial`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(t, cx, cy + s * (yOff || 0.62));
    };
    const flame = (fx, fy, fs, color) => {
      ctx.beginPath();
      ctx.moveTo(fx, fy + fs * 0.5);
      ctx.bezierCurveTo(fx - fs * 0.55, fy + fs * 0.45, fx - fs * 0.45, fy - fs * 0.1, fx - fs * 0.1, fy - fs * 0.55);
      ctx.bezierCurveTo(fx - fs * 0.05, fy - fs * 0.15, fx + fs * 0.15, fy - fs * 0.2, fx + fs * 0.12, fy - fs * 0.5);
      ctx.bezierCurveTo(fx + fs * 0.5, fy - fs * 0.15, fx + fs * 0.55, fy + fs * 0.4, fx, fy + fs * 0.5);
      ctx.fillStyle = color || '#111'; ctx.fill();
    };

    switch (type) {
      case 'class3':
        diamond('#E3262E');
        flame(cx, cy - s * 0.3, s * 0.55, '#111');
        num('3');
        break;
      case 'class2':
        diamond('#1E9E4A');
        cv.rr(ctx, cx - s * 0.12, cy - s * 0.55, s * 0.24, s * 0.55, s * 0.1); ctx.fillStyle = '#fff'; ctx.fill();
        num('2', '#fff');
        break;
      case 'class5':
        diamond('#FFD21F');
        ctx.beginPath(); ctx.arc(cx, cy - s * 0.1, s * 0.18, 0, Math.PI * 2); ctx.lineWidth = s * 0.07; ctx.strokeStyle = '#111'; ctx.stroke();
        flame(cx, cy - s * 0.42, s * 0.36, '#111');
        num('5.1');
        break;
      case 'class8':
        diamond('#FFFFFF', '#111111');
        ctx.fillStyle = '#111';
        [[-0.28, -0.42], [0.12, -0.42]].forEach(([dx, dy]) => {
          cv.rr(ctx, cx + s * dx, cy + s * dy, s * 0.14, s * 0.3, s * 0.03); ctx.fill();
          cv.ellipse(ctx, cx + s * (dx + 0.07), cy + s * (dy + 0.38), s * 0.04, s * 0.06); ctx.fill();
        });
        ctx.fillRect(cx - s * 0.35, cy - s * 0.02, s * 0.7, s * 0.05);
        num('8', '#fff');
        break;
      case 'class9':
        diamond('#FFFFFF');
        ctx.save();
        ctx.beginPath(); ctx.moveTo(cx, cy - s * 0.88); ctx.lineTo(cx + s * 0.88, cy); ctx.lineTo(cx - s * 0.88, cy); ctx.closePath(); ctx.clip();
        ctx.fillStyle = '#111';
        for (let i = -3; i <= 3; i++) ctx.fillRect(cx + i * s * 0.14 - s * 0.035, cy - s, s * 0.07, s);
        ctx.restore();
        num('9', '#111', 0.55);
        ctx.fillRect(cx - s * 0.14, cy + s * 0.76, s * 0.28, s * 0.04);
        break;
      case 'class9_li':
        diamond('#FFFFFF');
        ctx.save();
        ctx.beginPath(); ctx.moveTo(cx, cy - s * 0.88); ctx.lineTo(cx + s * 0.88, cy); ctx.lineTo(cx - s * 0.88, cy); ctx.closePath(); ctx.clip();
        ctx.fillStyle = '#111';
        for (let i = -3; i <= 3; i++) ctx.fillRect(cx + i * s * 0.14 - s * 0.035, cy - s, s * 0.07, s);
        ctx.restore();
        ctx.fillStyle = '#111';
        cv.rr(ctx, cx - s * 0.36, cy + s * 0.08, s * 0.26, s * 0.14, s * 0.02); ctx.fill();
        cv.rr(ctx, cx + s * 0.1, cy + s * 0.08, s * 0.26, s * 0.14, s * 0.02); ctx.fill();
        num('9', '#111', 0.6);
        break;
      case 'lithium': {
        const w = s * 2, h = s * 1.4;
        const x = cx - s, y = cy - h / 2;
        ctx.fillStyle = '#fff'; ctx.fillRect(x, y, w, h);
        ctx.save();
        ctx.beginPath(); ctx.rect(x, y, w, h); ctx.rect(x + s * 0.14, y + s * 0.14, w - s * 0.28, h - s * 0.28); ctx.clip('evenodd');
        ctx.fillStyle = '#E3262E';
        for (let i = -10; i < 20; i++) {
          ctx.beginPath(); ctx.moveTo(x + i * s * 0.16, y); ctx.lineTo(x + i * s * 0.16 + s * 0.08, y); ctx.lineTo(x + i * s * 0.16 + s * 0.08 + h, y + h); ctx.lineTo(x + i * s * 0.16 + h, y + h); ctx.closePath(); ctx.fill();
        }
        ctx.restore();
        ctx.fillStyle = '#111';
        cv.rr(ctx, cx - s * 0.42, cy - s * 0.2, s * 0.62, s * 0.34, s * 0.04); ctx.fill();
        ctx.fillRect(cx + s * 0.2, cy - s * 0.1, s * 0.07, s * 0.14);
        ctx.fillStyle = '#FFD21F';
        ctx.beginPath(); ctx.moveTo(cx - s * 0.05, cy - s * 0.17); ctx.lineTo(cx - s * 0.18, cy); ctx.lineTo(cx - s * 0.08, cy); ctx.lineTo(cx - s * 0.13, cy + s * 0.11); ctx.lineTo(cx + s * 0.04, cy - s * 0.05); ctx.lineTo(cx - s * 0.06, cy - s * 0.05); ctx.closePath(); ctx.fill();
        ctx.font = `900 ${Math.round(s * 0.2)}px "Segoe UI", Arial`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('LI-ION', cx + s * 0.44, cy - s * 0.02);
        break;
      }
      case 'fragile': {
        const w = s * 1.6, h = s * 1.8;
        const x = cx - w / 2, y = cy - h / 2;
        cv.rr(ctx, x, y, w, h, s * 0.08); ctx.fillStyle = '#fff'; ctx.fill();
        ctx.lineWidth = s * 0.05; ctx.strokeStyle = '#D2202F'; ctx.stroke();
        ctx.fillStyle = '#D2202F';
        ctx.beginPath(); ctx.moveTo(cx - s * 0.38, y + s * 0.2); ctx.lineTo(cx + s * 0.38, y + s * 0.2); ctx.lineTo(cx + s * 0.3, cy - s * 0.15); ctx.quadraticCurveTo(cx, cy + s * 0.05, cx - s * 0.3, cy - s * 0.15); ctx.closePath(); ctx.fill();
        ctx.fillRect(cx - s * 0.05, cy - s * 0.1, s * 0.1, s * 0.42);
        ctx.fillRect(cx - s * 0.3, cy + s * 0.3, s * 0.6, s * 0.08);
        ctx.strokeStyle = '#fff'; ctx.lineWidth = s * 0.06;
        ctx.beginPath(); ctx.moveTo(cx - s * 0.1, y + s * 0.18); ctx.lineTo(cx + s * 0.05, y + s * 0.36); ctx.lineTo(cx - s * 0.05, y + s * 0.5); ctx.stroke();
        ctx.fillStyle = '#D2202F';
        ctx.font = `900 ${Math.round(s * 0.3)}px "Segoe UI", Arial`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('FRAGILE', cx, y + h - s * 0.24);
        break;
      }
      case 'thisWayUp': {
        const w = s * 1.6, h = s * 1.8;
        const x = cx - w / 2, y = cy - h / 2;
        cv.rr(ctx, x, y, w, h, s * 0.08); ctx.fillStyle = '#fff'; ctx.fill();
        ctx.lineWidth = s * 0.04; ctx.strokeStyle = '#111'; ctx.stroke();
        ctx.fillStyle = '#111';
        [-0.32, 0.32].forEach(dx => {
          const ax = cx + s * dx;
          ctx.beginPath(); ctx.moveTo(ax, y + s * 0.18); ctx.lineTo(ax + s * 0.26, y + s * 0.62); ctx.lineTo(ax + s * 0.09, y + s * 0.62); ctx.lineTo(ax + s * 0.09, y + h - s * 0.5); ctx.lineTo(ax - s * 0.09, y + h - s * 0.5); ctx.lineTo(ax - s * 0.09, y + s * 0.62); ctx.lineTo(ax - s * 0.26, y + s * 0.62); ctx.closePath(); ctx.fill();
        });
        ctx.fillRect(x + s * 0.2, y + h - s * 0.36, w - s * 0.4, s * 0.12);
        break;
      }
      case 'keepDry': {
        const w = s * 1.6, h = s * 1.8;
        const x = cx - w / 2, y = cy - h / 2;
        cv.rr(ctx, x, y, w, h, s * 0.08); ctx.fillStyle = '#fff'; ctx.fill();
        ctx.lineWidth = s * 0.04; ctx.strokeStyle = '#111'; ctx.stroke();
        ctx.fillStyle = '#111';
        ctx.beginPath(); ctx.arc(cx, cy, s * 0.55, Math.PI, 0); ctx.closePath(); ctx.fill();
        ctx.lineWidth = s * 0.08; ctx.strokeStyle = '#111';
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, cy + s * 0.55); ctx.arc(cx - s * 0.12, cy + s * 0.55, s * 0.12, 0, Math.PI); ctx.stroke();
        [[-0.45, -0.75], [0, -0.85], [0.45, -0.75]].forEach(([dx, dy]) => {
          cv.ellipse(ctx, cx + s * dx, cy + s * dy, s * 0.05, s * 0.1); ctx.fill();
        });
        break;
      }
      default:
        break;
    }
  },

  /* ------------------------------------------------------------------ backgrounds (1280x720) */
  sky(ctx, w, h, top, bottom) {
    ctx.fillStyle = OTR.cv.lin(ctx, 0, 0, 0, h, [[0, top], [1, bottom]]);
    ctx.fillRect(0, 0, w, h);
  },

  house(ctx, x, y, w, h, wall, roof, door) {
    const cv = OTR.cv;
    ctx.fillStyle = cv.c(wall); ctx.fillRect(x, y, w, h);
    ctx.fillStyle = cv.c(roof);
    ctx.beginPath(); ctx.moveTo(x - 20, y + 4); ctx.lineTo(x + w / 2, y - h * 0.45); ctx.lineTo(x + w + 20, y + 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = cv.c(door || 0x6B3E26);
    ctx.fillRect(x + w * 0.42, y + h * 0.45, w * 0.16, h * 0.55);
    ctx.fillStyle = '#BFE3FF';
    ctx.fillRect(x + w * 0.12, y + h * 0.3, w * 0.18, h * 0.22);
    ctx.fillRect(x + w * 0.7, y + h * 0.3, w * 0.18, h * 0.22);
  },

  setting(ctx, w, h, name) {
    const cv = OTR.cv;
    const D = OTR.draw;
    switch (name) {
      case 'porch':
      case 'porch_dog': {
        D.sky(ctx, w, h, '#8FD3FF', '#D9F1FF');
        // siding
        ctx.fillStyle = cv.lin(ctx, 0, 0, 0, 560, [[0, '#F2E6D0'], [1, '#DCC9A8']]);
        ctx.fillRect(0, 0, w, 560);
        ctx.strokeStyle = 'rgba(120,90,50,0.15)'; ctx.lineWidth = 2;
        for (let y = 20; y < 560; y += 34) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
        // door
        cv.shadow(ctx, 20, 8, 0.3);
        cv.rr(ctx, 520, 110, 240, 450, 8);
        ctx.fillStyle = cv.lin(ctx, 0, 110, 0, 560, [[0, '#2F6B5A'], [1, '#1F4A3E']]); ctx.fill();
        cv.noShadow(ctx);
        ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 4;
        cv.rr(ctx, 550, 140, 180, 170, 6); ctx.stroke();
        cv.rr(ctx, 550, 340, 180, 190, 6); ctx.stroke();
        ctx.beginPath(); ctx.arc(725, 340, 10, 0, Math.PI * 2); ctx.fillStyle = '#E8C45A'; ctx.fill();
        // windows
        [[120, 160], [960, 160]].forEach(([x, y]) => {
          cv.rr(ctx, x, y, 200, 180, 6); ctx.fillStyle = cv.lin(ctx, x, y, x + 200, y + 180, [[0, '#CFEFFF'], [1, '#7FB9DD']]); ctx.fill();
          ctx.lineWidth = 10; ctx.strokeStyle = '#FFFFFF'; ctx.stroke();
          ctx.beginPath(); ctx.moveTo(x + 100, y); ctx.lineTo(x + 100, y + 180); ctx.moveTo(x, y + 90); ctx.lineTo(x + 200, y + 90); ctx.lineWidth = 6; ctx.stroke();
        });
        // porch floor
        ctx.fillStyle = cv.lin(ctx, 0, 560, 0, h, [[0, '#9B7650'], [1, '#6E5036']]);
        ctx.fillRect(0, 560, w, h - 560);
        ctx.strokeStyle = 'rgba(0,0,0,0.15)';
        for (let x = 0; x < w; x += 90) { ctx.beginPath(); ctx.moveTo(x, 560); ctx.lineTo(x - 60, h); ctx.stroke(); }
        // mat & plant
        cv.rr(ctx, 540, 580, 200, 40, 6); ctx.fillStyle = '#A0463C'; ctx.fill();
        cv.rr(ctx, 380, 470, 70, 90, 10); ctx.fillStyle = '#C8683E'; ctx.fill();
        ctx.fillStyle = '#3E9B55';
        [[415, 440, 40], [390, 460, 28], [440, 455, 30]].forEach(([x, y, r]) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); });
        if (name === 'porch_dog') {
          cv.rr(ctx, 860, 430, 20, 150, 4); ctx.fillStyle = '#FFFFFF'; ctx.fill();
          cv.rr(ctx, 1260, 430, 20, 150, 4); ctx.fill();
          for (let x = 880; x < 1260; x += 36) { cv.rr(ctx, x, 460, 16, 120, 3); ctx.fill(); }
          ctx.fillRect(860, 480, 420, 12); ctx.fillRect(860, 540, 420, 12);
        }
        break;
      }
      case 'office': {
        D.sky(ctx, w, h, '#EEF1F7', '#D5DBE8');
        // wall panels
        for (let x = 0; x < w; x += 160) {
          ctx.fillStyle = x % 320 === 0 ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.03)';
          ctx.fillRect(x, 0, 160, 520);
        }
        // big window
        cv.rr(ctx, 80, 70, 420, 330, 6);
        ctx.fillStyle = cv.lin(ctx, 80, 70, 500, 400, [[0, '#BFE6FF'], [1, '#6FA8DC']]); ctx.fill();
        ctx.fillStyle = 'rgba(40,70,110,0.5)';
        [[110, 250, 60, 150], [190, 200, 70, 200], [280, 270, 50, 130], [350, 180, 80, 220], [440, 240, 50, 160]].forEach(([x, y, bw, bh]) => ctx.fillRect(x, y, bw, bh));
        ctx.lineWidth = 12; ctx.strokeStyle = '#8C94A6'; cv.rr(ctx, 80, 70, 420, 330, 6); ctx.stroke();
        // company sign
        cv.rr(ctx, 700, 90, 420, 110, 12); ctx.fillStyle = '#2B3A55'; ctx.fill();
        ctx.fillStyle = '#FFFFFF'; ctx.font = '900 44px "Segoe UI", Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('BRIGHTLINE', 910, 136);
        ctx.font = '600 20px "Segoe UI", Arial'; ctx.fillStyle = '#9FC3FF';
        ctx.fillText('D E S I G N   S T U D I O', 910, 176);
        // floor
        ctx.fillStyle = cv.lin(ctx, 0, 520, 0, h, [[0, '#B9BFCC'], [1, '#8A91A1']]);
        ctx.fillRect(0, 520, w, h - 520);
        // desk
        cv.shadow(ctx, 30, 10, 0.3);
        cv.rr(ctx, 620, 420, 620, 260, 16);
        ctx.fillStyle = cv.lin(ctx, 0, 420, 0, 680, [[0, '#FFFFFF'], [1, '#D8DCE6']]); ctx.fill();
        cv.noShadow(ctx);
        ctx.fillStyle = '#4D5B78'; ctx.fillRect(620, 420, 620, 22);
        // plant
        cv.rr(ctx, 90, 470, 80, 110, 10); ctx.fillStyle = '#EDEDED'; ctx.fill();
        ctx.fillStyle = '#3E9B55';
        [[130, 430, 50], [100, 450, 34], [160, 445, 36]].forEach(([x, y, r]) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); });
        break;
      }
      case 'street':
      case 'storm': {
        const storm = name === 'storm';
        D.sky(ctx, w, h, storm ? '#2A3040' : '#7EC8F8', storm ? '#4A5468' : '#D4EEFF');
        if (!storm) {
          ctx.fillStyle = 'rgba(255,255,255,0.8)';
          [[200, 110], [760, 80], [1080, 140]].forEach(([x, y]) => {
            [[0, 0, 36], [34, -10, 44], [74, 0, 34]].forEach(([dx, dy, r]) => { ctx.beginPath(); ctx.arc(x + dx, y + dy, r, 0, Math.PI * 2); ctx.fill(); });
          });
        } else {
          ctx.fillStyle = 'rgba(30,34,46,0.7)';
          [[160, 90], [560, 60], [980, 110], [1240, 70]].forEach(([x, y]) => {
            [[0, 0, 60], [60, -18, 74], [130, 0, 58]].forEach(([dx, dy, r]) => { ctx.beginPath(); ctx.arc(x + dx, y + dy, r, 0, Math.PI * 2); ctx.fill(); });
          });
        }
        const tint = storm ? 0.45 : 0;
        const houseCol = (c) => storm ? OTR.color.shade(c, -tint) : c;
        D.house(ctx, 60, 300, 300, 200, houseCol(0xF3D9B1), houseCol(0x9C4A3A));
        D.house(ctx, 470, 280, 340, 220, houseCol(0xC9DCEB), houseCol(0x44546E), houseCol(0x2F6B5A));
        D.house(ctx, 930, 310, 290, 190, houseCol(0xE4EBF3), houseCol(0x4D6989));
        // lawn & road
        ctx.fillStyle = storm ? '#2F5238' : '#6CC06E'; ctx.fillRect(0, 500, w, 60);
        ctx.fillStyle = storm ? '#8A8F9A' : '#D8D8DE'; ctx.fillRect(0, 548, w, 24);
        ctx.fillStyle = storm ? '#2E3138' : '#4A4D57'; ctx.fillRect(0, 572, w, h - 572);
        ctx.fillStyle = storm ? '#B8A040' : '#F5D547';
        for (let x = 20; x < w; x += 120) ctx.fillRect(x, 660, 70, 8);
        if (storm) {
          ctx.fillStyle = 'rgba(120,150,190,0.25)';
          cv.ellipse(ctx, 700, 610, 360, 26); ctx.fill();
          cv.ellipse(ctx, 200, 640, 160, 14); ctx.fill();
          ctx.fillStyle = 'rgba(20,30,50,0.25)'; ctx.fillRect(0, 0, w, h);
        }
        break;
      }
      case 'depot':
      case 'warehouse': {
        D.sky(ctx, w, h, '#36424f', '#232b35');
        // back wall panels
        for (let x = 0; x < w; x += 200) {
          ctx.fillStyle = cv.lin(ctx, x, 0, x + 200, 0, [[0, '#465261'], [1, '#3a4654']]);
          ctx.fillRect(x, 0, 196, 470);
        }
        // high windows
        for (let x = 60; x < w; x += 200) {
          cv.rr(ctx, x, 40, 120, 60, 4);
          ctx.fillStyle = cv.lin(ctx, 0, 40, 0, 100, [[0, 'rgba(180,220,255,0.55)'], [1, 'rgba(120,160,220,0.25)']]); ctx.fill();
        }
        // shelving
        ctx.fillStyle = '#2B6CB0';
        [180, 300, 420].forEach(y => ctx.fillRect(40, y, 480, 10));
        ctx.fillStyle = '#FF8A00';
        [40, 280, 510].forEach(x => ctx.fillRect(x, 160, 12, 310));
        const boxC = [0xC99A62, 0xB88752, 0xD9AC72];
        for (let r = 0; r < 3; r++) for (let i = 0; i < 6; i++) {
          if ((i * 7 + r * 3) % 5 === 0) continue;
          const bw = 50 + ((i + r) % 3) * 8, bh = 40 + ((i * r) % 3) * 10;
          ctx.fillStyle = cv.c(boxC[(i + r) % 3]);
          ctx.fillRect(60 + i * 76, 180 + r * 120 - bh, bw, bh);
        }
        // roll-up doors
        [700, 980].forEach(x => {
          ctx.fillStyle = '#57626f'; ctx.fillRect(x, 150, 220, 320);
          ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 3;
          for (let y = 160; y < 470; y += 20) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 220, y); ctx.stroke(); }
          ctx.fillStyle = '#FFC83D'; ctx.fillRect(x - 10, 140, 240, 10);
        });
        // floor
        ctx.fillStyle = cv.lin(ctx, 0, 470, 0, h, [[0, '#6C6A78'], [1, '#48465A']]);
        ctx.fillRect(0, 470, w, h - 470);
        ctx.fillStyle = 'rgba(255,200,61,0.8)';
        for (let x = 0; x < w; x += 60) {
          ctx.beginPath(); ctx.moveTo(x, 486); ctx.lineTo(x + 30, 486); ctx.lineTo(x + 20, 496); ctx.lineTo(x - 10, 496); ctx.closePath(); ctx.fill();
        }
        if (name === 'depot') {
          ctx.fillStyle = 'rgba(255,255,255,0.05)';
          cv.ellipse(ctx, 640, 600, 500, 60); ctx.fill();
        }
        break;
      }
      case 'lot': {
        D.sky(ctx, w, h, '#FF9F6B', '#FFE0B8');
        ctx.fillStyle = 'rgba(255,240,200,0.9)';
        ctx.beginPath(); ctx.arc(1080, 210, 70, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#4c5d70';
        for (let i = 0; i < 18; i++) {
          const bw = 50 + (i * 37) % 60, bh = 80 + (i * 53) % 160;
          ctx.fillRect(i * 74 - 10, 380 - bh, bw, bh + 20);
        }
        ctx.fillStyle = '#687a8e';
        ctx.fillRect(0, 360, w, 40);
        ctx.fillStyle = cv.lin(ctx, 0, 400, 0, h, [[0, '#6E6C7C'], [1, '#45434F']]);
        ctx.fillRect(0, 400, w, h - 400);
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        for (let x = 40; x < w; x += 260) {
          ctx.beginPath(); ctx.moveTo(x, 690); ctx.lineTo(x + 40, 430); ctx.lineTo(x + 50, 430); ctx.lineTo(x + 12, 690); ctx.closePath(); ctx.fill();
        }
        break;
      }
      default:
        D.sky(ctx, w, h, OTR_DATA.theme.css('primary'), OTR_DATA.theme.css('primaryDeep'));
    }
  }
};

/* Texture wrappers */
OTR.art = {
  portrait(scene, id, spec, expr) {
    const key = `pt_${id}_${expr}`;
    return OTR.tex.make(scene, key, 360, 440, (ctx) => {
      if (spec.kind === 'dog') OTR.draw.dog(ctx, spec, expr);
      else OTR.draw.person(ctx, spec, expr);
    });
  },
  vanSide(scene) {
    return OTR.tex.make(scene, 'van_side', 320, 180, (ctx, w, h) => OTR.draw.vanSide(ctx, w, h));
  },
  vanTop(scene) {
    return OTR.tex.make(scene, 'van_top', 74, 140, (ctx, w, h) => OTR.draw.vanTop(ctx, w, h));
  },
  carTop(scene, color) {
    return OTR.tex.make(scene, 'car_top_' + color, 64, 116, (ctx, w, h) => OTR.draw.carTop(ctx, w, h, color));
  },
  /** The ambulance from above (drawn as a white car until there is an image of one). */
  ambulanceTop(scene) {
    return OTR.tex.make(scene, 'ambulance_top', 64, 116, (ctx, w, h) => OTR.draw.carTop(ctx, w, h, 0xF4F4F8));
  },
  /** A full-screen backdrop. dim: { color, alpha } paints a darkening over it once, instead of a full-screen
   *  rectangle drawn over it every frame. */
  setting(scene, name, dim) {
    const key = 'bg_' + name + (dim ? `_dim${dim.color.toString(16)}_${dim.alpha}` : '');
    return OTR.tex.make(scene, key, OTR.W, OTR.H, (ctx, w, h) => {
      OTR.draw.setting(ctx, w, h, name);
      if (dim) { ctx.fillStyle = OTR.cv.c(dim.color, dim.alpha); ctx.fillRect(0, 0, w, h); }
    });
  },
  mark(scene, type, size) {
    size = size || 48;
    return OTR.tex.make(scene, `mk_${type}_${size}`, size * 2 + 4, size * 2 + 4, (ctx) => OTR.draw.mark(ctx, type, size + 2, size + 2, size));
  },
  /**
   * Package texture.
   * o: { size: 's'|'m'|'l', route, routeColor, priority, damage, marks: [] , color }
   */
  pkg(scene, o) {
    const dims = { s: [76, 58], m: [96, 72], l: [118, 88] }[o.size || 'm'];
    const d = Math.round(dims[0] * 0.3);
    const key = `pkg_${o.size}_${o.route}_${o.priority ? 1 : 0}_${o.damage || 'none'}_${(o.marks || []).join('-')}_${o.color || 0}`;
    const W = dims[0] + d + 16, H = dims[1] + d + 30;
    return OTR.tex.make(scene, key, W, H, (ctx) => {
      const x = 6, y = d * 0.6 + 8;
      OTR.draw.box(ctx, { fw: dims[0], fh: dims[1], d, x, y, color: o.color || 0xC99A62, damage: o.damage });
      if (o.route) {
        OTR.draw.shippingLabel(ctx, x + dims[0] * 0.1, y + dims[1] * 0.32, dims[0] * 0.8, dims[1] * 0.44, { code: 'R' + o.route, stripe: o.routeColor });
      }
      if (o.priority) {
        ctx.save();
        ctx.beginPath(); ctx.rect(x, y, dims[0], dims[1]); ctx.clip();
        ctx.translate(x + 24, y + 22); ctx.rotate(-Math.PI / 4);
        ctx.fillStyle = OTR_DATA.theme.css('priority'); ctx.fillRect(-60, -10, 120, 20);
        ctx.fillStyle = '#fff'; ctx.font = '900 10px "Segoe UI", Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('PRIORITY', 0, 1);
        ctx.restore();
      }
      (o.marks || []).forEach((m, i) => {
        OTR.draw.mark(ctx, m, x + dims[0] * 0.82 - i * 22, y + dims[1] * 0.2, 11);
      });
    });
  }
};
