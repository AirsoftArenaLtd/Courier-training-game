/*
 * Atmosphere: time-of-day grading, weather particles, lightning, heat shimmer, vignette and ambient loops.
 *   const atm = OTR.atmos.apply(scene, { tod: 'afternoon', weather: 'rain', depth: 700 });
 *   atm.setWeather('storm'); atm.destroy();
 */
window.OTR = window.OTR || {};

OTR.atmos = {
  vignetteTex(scene) {
    return OTR.tex.make(scene, 'atm_vignette', 640, 360, (ctx, w, h) => {
      ctx.fillStyle = OTR.cv.rad(ctx, w / 2, h / 2, h * 0.35, w * 0.62, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.55)']]);
      ctx.fillRect(0, 0, w, h);
    });
  },

  flakeTex(scene) {
    return OTR.tex.make(scene, 'p_flake', 10, 10, (ctx) => {
      ctx.fillStyle = OTR.cv.rad(ctx, 5, 5, 0, 5, [[0, 'rgba(255,255,255,1)'], [1, 'rgba(255,255,255,0)']]);
      ctx.fillRect(0, 0, 10, 10);
    });
  },

  apply(scene, o) {
    o = o || {};
    const A = {
      scene, tod: o.tod || 'midday', weather: o.weather || 'clear', depth: o.depth || 700, objs: [], timers: [],
      destroy() { this.clear(); },
      clear() {
        this.objs.forEach(ob => ob && ob.destroy && ob.destroy());
        this.timers.forEach(t => t && t.remove && t.remove());
        this.objs = []; this.timers = [];
        OTR.audio.stopLoop('rain');
        OTR.audio.stopLoop('wind');
      },
      setWeather(w) { this.weather = w; this.build(); },
      setTod(t) { this.tod = t; this.build(); },
      build() {
        this.clear();
        const s = this.scene, d = this.depth;
        const T = OTR.scenery.TOD[this.tod] || OTR.scenery.TOD.midday;
        const fix = (ob) => { ob.setScrollFactor(0); this.objs.push(ob); return ob; };
        // grading: multiply tint + darkness
        if (T.tint !== 0xFFFFFF) fix(s.add.rectangle(OTR.W / 2, OTR.H / 2, OTR.W, OTR.H, T.tint, 1).setBlendMode(Phaser.BlendModes.MULTIPLY).setDepth(d).setAlpha(0.55));
        const dark = T.dark + ({ rain: 0.12, storm: 0.28, cloudy: 0.05, snow: 0.02 }[this.weather] || 0);
        if (dark > 0) fix(s.add.rectangle(OTR.W / 2, OTR.H / 2, OTR.W, OTR.H, 0x0A0A24, dark).setDepth(d + 1));
        if (this.weather === 'heat') {
          fix(s.add.rectangle(OTR.W / 2, OTR.H / 2, OTR.W, OTR.H, 0xFFB050, 0.12).setBlendMode(Phaser.BlendModes.ADD).setDepth(d + 1));
          const glare = fix(s.add.image(OTR.W * 0.8, 60, 'p_glow').setScale(14).setTint(0xFFF0B0).setAlpha(0.35).setBlendMode(Phaser.BlendModes.ADD).setDepth(d + 2));
          s.tweens.add({ targets: glare, alpha: 0.2, scale: 13, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
          // shimmer bands
          for (let i = 0; i < 3; i++) {
            const band = fix(s.add.rectangle(OTR.W / 2, 560 + i * 40, OTR.W, 16, 0xFFFFFF, 0.05).setDepth(d + 2));
            s.tweens.add({ targets: band, y: band.y - 20, alpha: 0.0, duration: 1400 + i * 300, repeat: -1, ease: 'Sine.inOut' });
          }
        }
        if (this.weather === 'rain' || this.weather === 'storm') {
          const heavy = this.weather === 'storm';
          fix(s.add.particles(0, 0, 'p_drop', {
            x: { min: -200, max: OTR.W + 200 }, y: -40,
            speedY: { min: 1000, max: 1300 }, speedX: heavy ? -300 : -120,
            lifespan: 850, quantity: heavy ? 6 : 3, frequency: 16, alpha: { start: 0.65, end: 0.25 }, rotate: heavy ? 14 : 6,
            scaleY: { min: 0.8, max: 1.3 }
          }).setDepth(d + 3));
          OTR.audio.loop('rain', { vol: heavy ? 0.16 : 0.09 });
          if (heavy) {
            this.timers.push(s.time.addEvent({
              delay: 6500, loop: true, callback: () => {
                if (Math.random() < 0.7) { OTR.fx.flash(s, 0xDDE8FF, 0.5, 350); s.time.delayedCall(420, () => OTR.audio.play('thunder')); }
              }
            }));
            OTR.audio.loop('wind', { vol: 0.06 });
          }
        }
        if (this.weather === 'snow') {
          OTR.atmos.flakeTex(s);
          fix(s.add.particles(0, 0, 'p_flake', {
            x: { min: -100, max: OTR.W + 100 }, y: -20,
            speedY: { min: 60, max: 140 }, speedX: { min: -40, max: 20 },
            lifespan: 9000, quantity: 1, frequency: 45, scale: { min: 0.4, max: 1.1 }, alpha: { start: 0.9, end: 0.6 }
          }).setDepth(d + 3));
          OTR.audio.loop('wind', { vol: 0.04 });
        }
        if (o.vignette !== false) fix(s.add.image(OTR.W / 2, OTR.H / 2, OTR.atmos.vignetteTex(s)).setDisplaySize(OTR.W, OTR.H).setDepth(d + 4).setAlpha(this.tod === 'night' ? 1 : 0.7));
      }
    };
    A.build();
    scene.events.once('shutdown', () => A.clear());
    return A;
  }
};
