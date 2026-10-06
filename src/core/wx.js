/*
 * Weather on the ground (TownDriveScene). OTR.atmos does the sky's part on the screen (falling rain and snow, the
 * gloom, lightning); this puts it in the world, where it changes what the road looks like:
 *
 *   rain, storm   wet, darker roads; puddles; ripples where the rain lands; spray thrown up behind moving wheels
 *   snow          snow on the lawns, roofs and trees; slush banked along the kerbs
 *   storm         trees swaying in the wind
 *   fog           a bank that closes in round the van: you can see about 15 m clearly, and little past 40
 *
 *   const wx = OTR.wx.install(scene, weather)   then wx.update(dt) every frame, after the camera
 *
 * On the low graphics setting only the cheap parts stay (wet roads, snow cover, fog); no ripples or spray.
 */
window.OTR = window.OTR || {};

OTR.wx = {
  rippleTex(scene) {
    return OTR.tex.make(scene, 'wx_ripple', 32, 32, (ctx) => {
      ctx.strokeStyle = 'rgba(220,232,245,0.9)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(16, 16, 13, 0, Math.PI * 2); ctx.stroke();
    });
  },
  puddleTex(scene) {
    const high = OTR.gfx.high();
    return OTR.tex.make(scene, high ? 'wx_puddle' : 'wx_puddle_low', 128, 64, (ctx, w, h) => {
      ctx.save(); ctx.translate(w / 2, h / 2); ctx.scale(1, 0.5);
      ctx.fillStyle = OTR.cv.rad(ctx, 0, 0, 10, 62, [[0, 'rgba(40,52,70,0.55)'], [0.8, 'rgba(48,60,80,0.45)'], [1, 'rgba(60,72,92,0)']]);
      // An uneven waterline and broken sky reflections, baked into the same small sprite. No extra reflection
      // layers, stamps, or per-frame animation: rain remains cheap and the low setting keeps its simple road tint.
      ctx.beginPath();
      if (high) {
        ctx.moveTo(-60, 0);
        ctx.bezierCurveTo(-60, -28, -35, -45, -8, -43);
        ctx.bezierCurveTo(12, -61, 47, -39, 56, -16);
        ctx.bezierCurveTo(69, 6, 38, 46, 10, 43);
        ctx.bezierCurveTo(-18, 56, -57, 35, -60, 0);
      } else ctx.arc(0, 0, 62, 0, Math.PI * 2);
      ctx.fill();
      // the sky's sheen on the water, up and to the left
      if (high) {
        ctx.fillStyle = 'rgba(190,205,225,0.2)';
        ctx.beginPath(); ctx.ellipse(-12, -17, 32, 9, -0.22, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(222,231,241,0.23)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-39, -11); ctx.quadraticCurveTo(-18, -19, 11, -12); ctx.stroke();
        ctx.strokeStyle = 'rgba(170,189,209,0.15)';
        ctx.beginPath(); ctx.moveTo(-13, 14); ctx.quadraticCurveTo(12, 7, 30, 11); ctx.stroke();
      } else {
        ctx.fillStyle = 'rgba(190,205,225,0.22)';
        ctx.beginPath(); ctx.ellipse(-14, -16, 30, 12, -0.3, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    });
  },
  /** Fog: clear round the middle of the screen, thick at its edges. */
  fogTex(scene) {
    return OTR.tex.make(scene, 'wx_fog', 640, 360, (ctx, w, h) => {
      ctx.fillStyle = OTR.cv.rad(ctx, w / 2, h / 2, h * 0.16, w * 0.62, [[0, 'rgba(206,212,220,0)'], [0.35, 'rgba(206,212,220,0.55)'], [0.7, 'rgba(206,212,220,0.88)'], [1, 'rgba(206,212,220,0.96)']]);
      ctx.fillRect(0, 0, w, h);
    });
  },
  wispTex(scene) {
    return OTR.tex.make(scene, 'wx_wisp', 256, 128, (ctx, w, h) => {
      ctx.save(); ctx.translate(w / 2, h / 2); ctx.scale(2, 1);
      ctx.fillStyle = OTR.cv.rad(ctx, 0, 0, 0, 62, [[0, 'rgba(225,230,236,0.6)'], [1, 'rgba(225,230,236,0)']]);
      ctx.beginPath(); ctx.arc(0, 0, 62, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    });
  },
  snowLawnTex(scene) {
    return OTR.tex.make(scene, 'td_lawn_snow', 128, 128, (ctx, w, h) => {
      ctx.fillStyle = OTR.cv.lin(ctx, 0, 0, w, h, [[0, '#F4F7FC'], [1, '#E2E8F2']]);
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 220; i++) {
        ctx.fillStyle = Math.random() < 0.5 ? 'rgba(170,185,210,0.18)' : 'rgba(255,255,255,0.6)';
        ctx.fillRect(Math.random() * w, Math.random() * h, 3, 3);
      }
      // a few blades of grass poking through
      for (let i = 0; i < 26; i++) { ctx.fillStyle = 'rgba(90,130,80,0.35)'; ctx.fillRect(Math.random() * w, Math.random() * h, 2, 3); }
    });
  },

  install(scene, weather) {
    const s = scene, high = OTR.gfx.high(), T = s.T, A = OTR.townArt, R = A.ROAD / 2;
    const wet = weather === 'rain' || weather === 'storm';
    const W = {
      weather, wet, ripples: [], wisps: [], sway: [], t: 0, spray: null,
      update(dt) {
        this.t += dt;
        const cam = s.cameras.main, v = cam.worldView;
        if (this.ripples.length) {
          // rain landing: rings spawn somewhere on screen and spread as they fade
          this.ripples.forEach(r => {
            r.t += dt / r.life;
            if (r.t >= 1) { r.t = 0; r.life = 0.35 + Math.random() * 0.3; r.img.setPosition(v.x + Math.random() * v.width, v.y + Math.random() * v.height); }
            r.img.setScale(0.2 + r.t * 0.7).setAlpha((1 - r.t) * 0.55);
          });
        }
        if (this.spray) {
          // spray off the wheels, in proportion to speed: the van's and every car's near the screen
          const V = OTR.vehicle, van = s.van, g = van.g, mph = V.mph(van);
          if (mph > 8) {
            const n = mph > 25 ? 2 : 1;
            [-1, 1].forEach(sd => { const p = V.point(van, -g.b - 0.4, sd * (g.hw - 0.2)); this.spray.emitParticleAt(p.x, p.y, n); });
          }
          s.cars.forEach(c => {
            if (c.speed < 120 || c.x < v.x - 100 || c.x > v.right + 100 || c.y < v.y - 100 || c.y > v.bottom + 100) return;
            if (Math.random() < 0.5) this.spray.emitParticleAt(c.x - Math.cos(c.heading) * c.hl * 0.7, c.y - Math.sin(c.heading) * c.hl * 0.7, 1);
          });
        }
        this.wisps.forEach(w => {
          w.img.x += w.vx * dt;
          if (w.img.x > v.right + 300) w.img.x = v.x - 300;
          if (w.img.x < v.x - 300) w.img.x = v.right + 300;
          if (w.img.y < v.y - 200 || w.img.y > v.bottom + 200) w.img.y = v.y + Math.random() * v.height;
        });
        if (this.sway.length) {
          const a = Math.sin(this.t * 1.7);
          this.sway.forEach((img, i) => img.setRotation((a + Math.sin(this.t * 2.3 + i)) * 0.025));
        }
      }
    };

    if (wet) {
      // wet asphalt is darker and a little blue; standing water collects along the kerbs
      const tint = weather === 'storm' ? 0xA9B0BE : 0xBFC5D2;
      (s.roadTiles || []).forEach(t => t.setTint(tint));
      const puddle = OTR.wx.puddleTex(s);
      const RND = OTR.scenery.rng('puddles' + T.seed);
      for (let i = 0; i < 46; i++) {
        const horiz = RND() < 0.5;
        const line = horiz ? T.hy[Math.floor(RND() * T.hy.length)] : T.vx[Math.floor(RND() * T.vx.length)];
        const along = 120 + RND() * ((horiz ? T.W : T.H) - 240);
        const off = (RND() < 0.5 ? -1 : 1) * (R - 22 - RND() * 40);     // near a kerb, where water lies
        const x = horiz ? along : line + off, y = horiz ? line + off : along;
        if (T.inters.some(it => Math.abs(it.x - x) < R + 40 && Math.abs(it.y - y) < R + 40)) continue;
        s.add.image(x, y, puddle).setDepth(-85).setScale(0.7 + RND() * 0.9, 0.6 + RND() * 0.6).setAngle(horiz ? 0 : 90);
      }
      if (high) {
        OTR.wx.rippleTex(s);
        for (let i = 0; i < (weather === 'storm' ? 40 : 24); i++) {
          W.ripples.push({ img: s.add.image(0, 0, 'wx_ripple').setDepth(-84.5).setAlpha(0), t: Math.random(), life: 0.4 });
        }
        OTR.atmos.flakeTex(s);
        W.spray = s.add.particles(0, 0, 'p_flake', {
          emitting: false, lifespan: 520, speed: { min: 10, max: 50 }, scale: { start: 0.9, end: 2.6 },
          alpha: { start: 0.32, end: 0 }, tint: 0xDCE4EE
        }).setDepth(27);
      }
    }

    if (weather === 'snow') {
      (s.lawnTiles || []).forEach(t => t.setTexture(OTR.wx.snowLawnTex(s)));
      // slush banked along both kerbs of every street
      const slush = OTR.tex.make(s, 'wx_slush', 64, 32, (ctx, w, h) => {
        ctx.fillStyle = OTR.cv.lin(ctx, 0, 0, 0, h, [[0, 'rgba(235,240,248,0.6)'], [1, 'rgba(235,240,248,0)']]);
        ctx.fillRect(0, 0, w, h);
      });
      // (block by block: it stops where the kerb turns the corner, so none lies across a junction)
      const gap = R + A.CORNER;
      const runs = (cuts, len) => { const out = []; let a = 0; cuts.forEach(c => { if (c - gap > a) out.push([a, c - gap]); a = c + gap; }); if (len > a) out.push([a, len]); return out; };
      T.hy.forEach(y => runs(T.vx, T.W).forEach(([a, b]) => [-1, 1].forEach(sd =>
        s.add.tileSprite(a, y + sd * (R - 8), b - a, 22, slush).setOrigin(0, 0.5).setDepth(-86.5).setFlipY(sd < 0))));
      T.vx.forEach(x => runs(T.hy, T.H).forEach(([a, b]) => [-1, 1].forEach(sd =>
        s.add.tileSprite(x + sd * (R - 8), a, 22, b - a, slush).setOrigin(0.5, 0).setDepth(-86.5).setFlipX(sd < 0))));
      // snow lying on the roofs and in the trees: a white copy of each over it
      if (s.city) s.city.addSnow();
    }

    if (weather === 'storm' && s.city) W.sway = s.city.trees.map(t => t.img);

    if (weather === 'fog') {
      W.fogImg = s.add.image(OTR.W / 2, OTR.H / 2, OTR.wx.fogTex(s)).setScrollFactor(0).setDisplaySize(OTR.W, OTR.H).setDepth(698);
      if (high) {
        OTR.wx.wispTex(s);
        const v = s.cameras.main.worldView;
        for (let i = 0; i < 7; i++) {
          W.wisps.push({ img: s.add.image(v.x + Math.random() * 1600, v.y + Math.random() * 900, 'wx_wisp').setDepth(60).setScale(3 + Math.random() * 2, 2 + Math.random()), vx: 14 + Math.random() * 18 });
        }
      }
    }
    return W;
  }
};
