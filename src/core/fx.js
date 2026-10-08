/* Juice: particles, shakes, floating text, transitions. */
window.OTR = window.OTR || {};

OTR.fx = {
  burst(scene, x, y, o) {
    o = o || {};
    const life = o.lifespan || 650;
    const em = scene.add.particles(0, 0, o.texture || 'p_dot', {
      speed: { min: o.speedMin || 80, max: o.speedMax || 320 },
      angle: o.angle || { min: 0, max: 360 },
      lifespan: { min: life * 0.6, max: life },
      scale: { start: o.scale || 1.1, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: o.tint !== undefined ? o.tint : 0xFFFFFF,
      gravityY: o.gravity || 0,
      rotate: o.rotate ? { min: 0, max: 360 } : 0,
      blendMode: o.blend || 'ADD',
      emitting: false
    });
    em.setDepth(o.depth || 900);
    em.explode(o.count || 18, x, y);
    scene.time.delayedCall(life + 200, () => em.destroy());
    return em;
  },

  sparkle(scene, x, y, tint) {
    OTR.fx.burst(scene, x, y, { texture: 'p_star', count: 10, tint: tint || 0xFFE27A, speedMin: 60, speedMax: 220, scale: 0.9, rotate: true, lifespan: 700 });
    OTR.fx.burst(scene, x, y, { texture: 'p_glow', count: 1, speedMin: 0, speedMax: 1, scale: 2.2, tint: tint || 0xFFE27A, lifespan: 380 });
  },

  confetti(scene, x, y, o) {
    o = o || {};
    const em = scene.add.particles(0, 0, 'p_rect', {
      speed: { min: 250, max: 650 },
      angle: o.angle || { min: 220, max: 320 },
      lifespan: { min: 1400, max: 2400 },
      scale: { min: 0.7, max: 1.3 },
      gravityY: 700,
      rotate: { start: 0, end: 720 },
      alpha: { start: 1, end: 0.2 },
      tint: [OTR_DATA.theme.accent, OTR_DATA.theme.primary, 0xFFC83D, 0x2BC48A, 0x3DA5FF, 0xFF5C8A, 0xFFFFFF],
      emitting: false
    });
    em.setDepth(o.depth || 950);
    em.explode(o.count || 90, x, y);
    scene.time.delayedCall(2600, () => em.destroy());
  },

  shake(scene, dur, intensity) {
    scene.cameras.main.shake(dur || 180, intensity || 0.008);
  },

  flash(scene, color, alpha, dur) {
    const r = scene.add.rectangle(OTR.W / 2, OTR.H / 2, OTR.W, OTR.H, color === undefined ? 0xFFFFFF : color, alpha || 0.35).setDepth(990).setScrollFactor(0);
    scene.tweens.add({ targets: r, alpha: 0, duration: dur || 280, onComplete: () => r.destroy() });
  },

  floatText(scene, x, y, text, color, o) {
    o = o || {};
    const t = OTR.txt(scene, x, y, text, o.size || 28, color || '#ffffff', { stroke: OTR_DATA.theme.css('ink'), strokeW: 6, weight: '900' });
    t.setDepth(o.depth || 960).setScale(0.4);
    scene.tweens.add({ targets: t, scale: 1, duration: 180, ease: 'Back.out' });
    scene.tweens.add({
      targets: t, y: y - (o.rise || 70), alpha: 0, delay: o.hold || 350, duration: 700, ease: 'Cubic.in',
      onComplete: () => t.destroy()
    });
    return t;
  },

  pop(scene, target, s) {
    const base = target._baseScale || target.scaleX || 1;
    target._baseScale = base;
    scene.tweens.add({ targets: target, scaleX: base * (s || 1.2), scaleY: base * (s || 1.2), duration: 90, yoyo: true, ease: 'Quad.out' });
  },

  ring(scene, x, y, color, radius) {
    const g = OTR.tex.shape(scene, (g) => { g.lineStyle(6, color || 0xFFFFFF, 1); g.strokeCircle(0, 0, radius || 40); }).setDepth(940);
    g.setPosition(x, y).setScale(0.3);
    scene.tweens.add({ targets: g, scale: 1.4, alpha: 0, duration: 450, ease: 'Cubic.out', onComplete: () => g.destroy() });
  },

  stamp(scene, x, y, text, color, o) {
    o = o || {};
    const c = scene.add.container(x, y).setDepth(o.depth || 970).setScrollFactor(o.world ? 1 : 0);
    const col = color || 0x2BC48A;
    const t = OTR.txt(scene, 0, 0, text, o.size || 40, OTR.color.css(col), { weight: '900' });
    const pad = 18;
    const g = OTR.tex.shape(scene, (g) => {
      g.lineStyle(6, col, 1);
      g.strokeRoundedRect(-t.width / 2 - pad, -t.height / 2 - pad / 2, t.width + pad * 2, t.height + pad, 10);
    });
    c.add([g, t]);
    c.setAngle(o.angle === undefined ? -8 : o.angle).setScale(2.4).setAlpha(0);
    scene.tweens.add({
      targets: c, scale: 1, alpha: 1, duration: 200, ease: 'Back.out',
      onComplete: () => { OTR.audio.play('stamp'); OTR.fx.shake(scene, 90, 0.004); }
    });
    if (!o.keep) {
      scene.tweens.add({ targets: c, alpha: 0, delay: o.hold || 900, duration: 300, onComplete: () => c.destroy() });
    }
    return c;
  },

  /** Stylised wipe transition to another scene. */
  transition(scene, key, data) {
    if (scene._leaving) return;
    scene._leaving = true;
    OTR.audio.play('whoosh');
    const c = scene.add.container(0, 0).setDepth(10000).setScrollFactor(0);
    const r1 = scene.add.rectangle(0, 0, OTR.W + 200, OTR.H, OTR_DATA.theme.primary).setOrigin(0, 0);
    const r2 = scene.add.rectangle(OTR.W + 200, 0, 40, OTR.H, OTR_DATA.theme.accent).setOrigin(0, 0);
    c.add([r1, r2]);
    c.x = -(OTR.W + 260);
    scene.input.enabled = false;
    scene.tweens.add({
      targets: c, x: -60, duration: 320, ease: 'Cubic.in',
      onComplete: () => {
        scene.input.enabled = true;
        scene.scene.start(key, data || {});
      }
    });
  },

  enter(scene) {
    scene._leaving = false;
    if (OTR.a11y) OTR.a11y.applyColour(scene);
    const c = scene.add.container(-60, 0).setDepth(10000).setScrollFactor(0);
    const r1 = scene.add.rectangle(0, 0, OTR.W + 200, OTR.H, OTR_DATA.theme.primary).setOrigin(0, 0);
    const r2 = scene.add.rectangle(OTR.W + 200, 0, 40, OTR.H, OTR_DATA.theme.accent).setOrigin(0, 0);
    c.add([r1, r2]);
    scene.tweens.add({ targets: c, x: OTR.W + 60, duration: 380, ease: 'Cubic.out', delay: 40, onComplete: () => c.destroy() });
  }
};
