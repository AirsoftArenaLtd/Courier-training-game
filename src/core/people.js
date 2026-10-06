/*
 * People in the town (TownDriveScene): seen from above with shoulders, a head, swinging arms and walking feet, in a
 * mix of clothes, skin tones and hair. Some cross at the junctions (TownDriveScene.stepPeds, which judges the van's
 * yielding); these walk the sidewalks round the blocks: strollers who stop to look at things, joggers, dog walkers,
 * and children near the school. In the rain most carry umbrellas.
 *
 * They keep to the sidewalk, and wait when the van is on it ahead of them. Driving into one is hitting a pedestrian,
 * on the sidewalk as at a crossing.
 *
 *   const crowd = OTR.people.install(scene)    then crowd.update(dt) every frame
 *   OTR.people.look(scene, i, opts)            a texture set for one person: { key(frame), umbrella, scale }
 *   OTR.people.pose(img, look, t, moving)       show the walking frame for time t
 */
window.OTR = window.OTR || {};

OTR.people = {
  SHIRTS: [0x3D6FB8, 0xC8443B, 0x3E8A5C, 0xE0B040, 0x6A4C9C, 0x2F3A4C, 0xD9D4C8, 0xE07A3A, 0x2A8A9A, 0x8A5A3A],
  SKIN: [0xF1C9A5, 0xE0AC84, 0xC68B5E, 0x9A6440, 0x6E4528],
  HAIR: [0x2A2018, 0x5A3A22, 0xB08A50, 0x1A1A1A, 0x8C8C8C, 0xA0442A],
  UMBRELLAS: [0x2F3A4C, 0xC8243B, 0x3DA5FF, 0xE8A33D, 0x2BC48A, 0x6A4C9C],

  /** Three frames of a person walking towards +x (left foot forward, both together, right foot forward). */
  frames(scene, shirt, skin, hair, legs) {
    const high = OTR.gfx ? OTR.gfx.high() : true;
    // Keep the palette at indices 1..4 for cab.js; the quality suffix prevents a cached high frame leaking to low.
    const base = `pp_${shirt}_${skin}_${hair}_${legs}` + (high ? '_detail' : '');
    [0, 1, 2].forEach(f => OTR.tex.make(scene, base + '_' + f, 28 * 2, 28 * 2, (ctx) => {
      const cv = OTR.cv, cx = 14, cy = 14, st = [-1, 0, 1][f];
      ctx.scale(2, 2);                                  // drawn at twice the size it shows, for a sharp close-up
      cv.shadow(ctx, 4, 2, 0.35);
      // feet: one ahead and one behind as they stride
      ctx.fillStyle = OTR.color.css(legs);
      [[-1, st], [1, -st]].forEach(([side, a]) => {
        ctx.beginPath(); ctx.ellipse(cx + a * 5, cy + side * 3.2, 3.2, 2.2, 0, 0, Math.PI * 2); ctx.fill();
      });
      if (high) {
        // Detail stays in the original layer order: shoes under the body and head, hands under the shoulders.
        cv.noShadow(ctx);
        [[-1, st], [1, -st]].forEach(([side, a]) => {
          ctx.fillStyle = '#24252C';
          ctx.beginPath(); ctx.ellipse(cx + a * 5 + 0.9, cy + side * 3.2, 2.2, 1.5, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = 'rgba(220,219,226,0.35)';
          ctx.fillRect(cx + a * 5 + 0.2, cy + side * 3.2 - 0.8, 1.6, 0.5);
        });
        cv.shadow(ctx, 4, 2, 0.35);
      }
      // arms swing against the legs
      ctx.fillStyle = OTR.color.css(OTR.color.shade(shirt, -0.15));
      [[-1, -st], [1, st]].forEach(([side, a]) => {
        ctx.beginPath(); ctx.ellipse(cx + a * 3, cy + side * 6.4, 2.6, 2, 0, 0, Math.PI * 2); ctx.fill();
      });
      if (high) {
        cv.noShadow(ctx);
        [[-1, -st], [1, st]].forEach(([side, a]) => {
          ctx.fillStyle = OTR.color.css(OTR.color.shade(shirt, 0.12));
          ctx.beginPath(); ctx.ellipse(cx + a * 3 + 0.8, cy + side * 6.4, 0.7, 1.2, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = OTR.color.css(skin);
          ctx.beginPath(); ctx.ellipse(cx + a * 3 + 1.6, cy + side * 6.4, 0.9, 1, 0, 0, Math.PI * 2); ctx.fill();
        });
        cv.shadow(ctx, 4, 2, 0.35);
      }
      // shoulders
      ctx.fillStyle = cv.lin(ctx, cx, cy - 6, cx, cy + 6, [[0, OTR.color.css(OTR.color.shade(shirt, 0.15))], [1, OTR.color.css(OTR.color.shade(shirt, -0.12))]]);
      ctx.beginPath(); ctx.ellipse(cx, cy, 4.4, 6.6, 0, 0, Math.PI * 2); ctx.fill();
      cv.noShadow(ctx);
      if (high) {
        // All detail is baked into the original 56x56 canvas. Walking phases, scale and sprite count are unchanged.
        ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 0.6;
        ctx.beginPath(); ctx.moveTo(cx - 3, cy - 3.6); ctx.quadraticCurveTo(cx - 4.2, cy, cx - 3, cy + 3.6); ctx.stroke();
      }
      // head: the face forward, the hair over the back of it
      ctx.fillStyle = OTR.color.css(skin); ctx.beginPath(); ctx.arc(cx + 0.8, cy, 3.6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = OTR.color.css(hair); ctx.beginPath(); ctx.arc(cx - 0.4, cy, 3.5, Math.PI * 0.55, Math.PI * 1.45); ctx.fill();
      ctx.beginPath(); ctx.arc(cx - 0.2, cy, 3.1, 0, Math.PI * 2); ctx.globalAlpha = 0.55; ctx.fill(); ctx.globalAlpha = 1;
    }));
    return base;
  },

  umbrellaTex(scene, color) {
    return OTR.tex.make(scene, 'pp_umb_' + color, 60, 60, (ctx) => {
      const cv = OTR.cv;
      ctx.scale(2, 2);
      cv.shadow(ctx, 5, 3, 0.35);
      ctx.fillStyle = OTR.color.css(color); ctx.beginPath(); ctx.arc(15, 15, 12, 0, Math.PI * 2); ctx.fill();
      cv.noShadow(ctx);
      // its ribs and panels, lit from the top-left
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4;
        ctx.fillStyle = i % 2 ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)';
        ctx.beginPath(); ctx.moveTo(15, 15); ctx.arc(15, 15, 12, a, a + Math.PI / 4); ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle = '#DDD'; ctx.beginPath(); ctx.arc(15, 15, 1.5, 0, Math.PI * 2); ctx.fill();
    });
  },

  dogTex(scene, color, f) {
    return OTR.tex.make(scene, `pp_dog_${color}_${f}`, 52, 32, (ctx) => {
      const cv = OTR.cv, st = [-1, 0, 1][f];
      ctx.scale(2, 2);
      cv.shadow(ctx, 3, 2, 0.35);
      ctx.fillStyle = OTR.color.css(OTR.color.shade(color, -0.25));
      [[-1, st], [1, -st]].forEach(([side, a]) => { ctx.fillRect(15 + a * 2.5, 8 + side * 3.5 - 1, 2.4, 2.4); ctx.fillRect(7 - a * 2.5, 8 + side * 3.5 - 1, 2.4, 2.4); });
      ctx.fillStyle = OTR.color.css(color);
      ctx.beginPath(); ctx.ellipse(11, 8, 7, 3.6, 0, 0, Math.PI * 2); ctx.fill();
      cv.noShadow(ctx);
      ctx.beginPath(); ctx.arc(19.5, 8, 3.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = OTR.color.css(OTR.color.shade(color, -0.3)); ctx.beginPath(); ctx.ellipse(20, 5.4, 1.4, 1, 0, 0, Math.PI * 2); ctx.ellipse(20, 10.6, 1.4, 1, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = OTR.color.css(color); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(4.5, 8); ctx.lineTo(1.5, 7 + st); ctx.stroke();
    });
  },

  /** A person's look, picked from n: clothes, skin, hair; an umbrella in the rain. */
  look(scene, n, o) {
    o = o || {};
    const P = OTR.people, pick = (a, k) => a[(n * k + 3) % a.length];
    const shirt = o.shirt || pick(P.SHIRTS, 7), skin = pick(P.SKIN, 3), hair = pick(P.HAIR, 5);
    const legs = o.legs || [0x2F3546, 0x3A4A66, 0x4A4038, 0x23262E][n % 4];
    const base = P.frames(scene, shirt, skin, hair, legs);
    const L = { base, key: (f) => base + '_' + f, scale: (o.scale || 1) * 0.5 };   // (the textures are drawn at 2x)
    if (o.umbrella) L.umbrella = P.umbrellaTex(scene, pick(P.UMBRELLAS, 11));
    return L;
  },

  /** Show the frame for walking time t (a stride every 0.5 s at a walk), or standing still. */
  pose(img, look, t, moving) {
    const f = moving ? [0, 1, 2, 1][Math.floor(t * 8) % 4] : 1;
    const k = look.key(f);
    if (img.texture.key !== k) img.setTexture(k);
  },

  install(scene) {
    const s = scene, T = s.T, A = OTR.townArt, P = OTR.people;
    const R = A.ROAD / 2, mid = R + A.WALK / 2;                   // a sidewalk's centre line, from its street's
    const rc = A.CORNER - A.WALK / 2, cc = R + A.CORNER;           // round each corner: radius, and its centre's offset
    const rng = OTR.scenery.rng('people' + T.seed);
    const wet = s.weather === 'rain' || s.weather === 'storm';
    const blocks = [];
    for (let c = 0; c < T.vx.length - 1; c++) for (let r = 0; r < T.hy.length - 1; r++) blocks.push({ c, r });

    /** The loop of sidewalk round a block: a rectangle with its corners rounded to the kerb. */
    const loopOf = (b) => {
      const x0 = T.vx[b.c] + mid, x1 = T.vx[b.c + 1] - mid, y0 = T.hy[b.r] + mid, y1 = T.hy[b.r + 1] - mid;
      const sx = (x1 - x0) - 2 * rc, sy = (y1 - y0) - 2 * rc, arc = Math.PI * rc / 2;
      return { x0, x1, y0, y1, sx, sy, arc, len: 2 * sx + 2 * sy + 4 * arc,
        // centres of the four corner arcs (the kerb's own corner centres)
        cs: [[T.vx[b.c] + cc, T.hy[b.r] + cc], [T.vx[b.c + 1] - cc, T.hy[b.r] + cc], [T.vx[b.c + 1] - cc, T.hy[b.r + 1] - cc], [T.vx[b.c] + cc, T.hy[b.r + 1] - cc]] };
    };
    /** Where a walker at distance d round the loop is, and which way it faces (clockwise). */
    const at = (L, d) => {
      d = ((d % L.len) + L.len) % L.len;
      const segs = [
        ['line', L.cs[0][0], L.y0, 1, 0, L.sx], ['arc', 1, -Math.PI / 2], ['line', L.x1, L.cs[1][1], 0, 1, L.sy], ['arc', 2, 0],
        ['line', L.cs[2][0], L.y1, -1, 0, L.sx], ['arc', 3, Math.PI / 2], ['line', L.x0, L.cs[3][1], 0, -1, L.sy], ['arc', 0, Math.PI]
      ];
      for (let i = 0; i < segs.length; i++) {
        const g = segs[i];
        const len = g[0] === 'line' ? g[5] : L.arc;
        if (d <= len) {
          if (g[0] === 'line') return { x: g[1] + g[3] * d, y: g[2] + g[4] * d, h: Math.atan2(g[4], g[3]) };
          const a = g[2] + d / rc, c = L.cs[g[1]];
          return { x: c[0] + Math.cos(a) * rc, y: c[1] + Math.sin(a) * rc, h: a + Math.PI / 2 };
        }
        d -= len;
      }
      return { x: L.x0, y: L.y0, h: 0 };
    };

    const crowd = { walkers: [], leash: s.add.graphics().setDepth(25.5), t: 0 };
    const add = (kind, b, n) => {
      const L = loopOf(b);
      const child = kind === 'child', jog = kind === 'jogger';
      const look = P.look(s, n, { scale: child ? 0.72 : 1, umbrella: wet && !jog && rng() < 0.7, shirt: jog ? [0xFF5C8A, 0x2BC48A, 0xFFC83D][n % 3] : null });
      const w = {
        kind, L, look, d: rng() * L.len, dir: rng() < 0.5 ? 1 : -1, t: rng() * 3,
        speed: (jog ? 3.1 : child ? 1.1 : 1.0 + rng() * 0.5) * s.P,              // m/s in world px
        pause: 0, nextPause: 4 + rng() * 14, hitCool: 0,
        img: s.add.image(0, 0, look.key(1)).setDepth(26).setScale(look.scale)
      };
      if (look.umbrella) w.umb = s.add.image(0, 0, look.umbrella).setDepth(26.2).setScale(look.scale);
      if (kind === 'dog') {
        const col = [0x9A6A3A, 0x2A2420, 0xD8C8A8, 0x6A6A6A][n % 4];
        w.dogKeys = [0, 1, 2].map(f => P.dogTex(s, col, f));
        w.dog = s.add.image(0, 0, w.dogKeys[1]).setDepth(25.8).setScale(0.5);
      }
      crowd.walkers.push(w);
    };
    // about one person per block, some blocks busier; joggers and dog walkers among them; children on the school's
    // street
    blocks.forEach((b, i) => {
      add('walker', b, i * 3);
      if (rng() < 0.45) add(rng() < 0.4 ? 'dog' : 'walker', b, i * 3 + 1);
      if (rng() < 0.18) add('jogger', b, i * 3 + 2);
    });
    const z = T.spec.schoolZone;
    if (z) blocks.filter(b => (b.r === z.row || b.r === z.row - 1) && b.c >= z.from && b.c < z.to).forEach((b, i) => { add('child', b, 40 + i); add('child', b, 50 + i); });

    crowd.update = function (dt) {
      this.t += dt;
      const V = OTR.vehicle, van = s.van, mph = V.mph(van);
      const cam = s.cameras.main.worldView;
      const g = this.leash; g.clear();
      this.walkers.forEach(w => {
        if (w.hitCool > 0) w.hitCool -= dt;
        // the van on the sidewalk just ahead: wait for it (and step out of its way if it is coming at them)
        const p = at(w.L, w.d), ahead = at(w.L, w.d + w.dir * 50);
        const r = s.relToVan(ahead.x, ahead.y), here = s.relToVan(p.x, p.y);
        const blocked = Math.abs(r.fd) < r.hl + 20 && Math.abs(r.lat) < r.hw + 18;
        let moving = false;
        if (w.pause > 0) w.pause -= dt;
        else if (!blocked) {
          w.d += w.dir * w.speed * dt; moving = true;
          w.nextPause -= dt;
          if (w.nextPause <= 0 && w.kind !== 'jogger') { w.pause = 1.5 + Math.random() * 4; w.nextPause = 6 + Math.random() * 16; if (Math.random() < 0.25) w.dir *= -1; }
        }
        w.t += moving ? dt * (w.kind === 'jogger' ? 1.6 : 1) : 0;
        const q = at(w.L, w.d), face = q.h + (w.dir < 0 ? Math.PI : 0);
        // off screen: just move along (no drawing to set up)
        const seen = q.x > cam.x - 60 && q.x < cam.right + 60 && q.y > cam.y - 60 && q.y < cam.bottom + 60;
        w.img.setVisible(seen); if (w.umb) w.umb.setVisible(seen); if (w.dog) w.dog.setVisible(seen);
        if (seen) {
          w.img.setPosition(q.x, q.y).setRotation(face);
          OTR.people.pose(w.img, w.look, w.t, moving);
          if (w.umb) w.umb.setPosition(q.x + Math.cos(face) * 2, q.y + Math.sin(face) * 2);
          if (w.dog) {
            const dq = at(w.L, w.d - w.dir * 26), sideX = -Math.sin(face) * 9, sideY = Math.cos(face) * 9;
            const dx = dq.x + sideX + Math.cos(face) * 34, dy = dq.y + sideY + Math.sin(face) * 34;   // trotting just ahead, to one side
            w.dog.setPosition(dx, dy).setRotation(face).setTexture(w.dogKeys[moving ? [0, 1, 2, 1][Math.floor(w.t * 12) % 4] : 1]);
            g.lineStyle(1.2, 0x2A2A2A, 0.8); g.lineBetween(q.x + sideX * 0.6, q.y + sideY * 0.6, dx - Math.cos(face) * 6, dy - Math.sin(face) * 6);
          }
        }
        // the van into a person on the sidewalk
        if (w.hitCool <= 0 && mph > 0.5 && Math.abs(here.fd) < here.hl + 6 && Math.abs(here.lat) < here.hw + 6) {
          w.hitCool = 6; w.pause = 3;
          s.violation('hitped', 'You hit a pedestrian', 'safety', 5, 'The sidewalk is theirs. A van that mounts the kerb puts people in danger: stay on the road, and if you must, walk speed and a lookout.');
          s.pedIncident();
        }
      });
    };
    return crowd;
  }
};
