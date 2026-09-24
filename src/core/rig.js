/*
 * Animated full-body characters assembled from painted part textures.
 *
 *   const r = OTR.rig.person(scene, x, groundY, spec, { scale: 0.8, facing: 1 });
 *   r.walkTo(900, () => r.play('knock'));
 *   r.setExpression('happy'); r.talk(true); r.hold('box'); r.emote('!');
 *
 *   const d = OTR.rig.dog(scene, x, groundY, { fur, patch, collar }, { mood: 'friendly' });
 *   d.setMood('aggressive'); d.play('bark');
 *
 * Person specs are the same as portrait specs (skin, hair, hairStyle, shirt, uniform, glasses, ...)
 * plus optional body fields: pants, shoes, shorts, sleeves ('short'|'long'), vest, jacket.
 * Coordinates: the container origin is on the ground between the feet; characters face +x at facing 1.
 */
window.OTR = window.OTR || {};

OTR.rig = {
  RES: 2,
  HEAD_K: 0.36,

  hash(obj) {
    const s = JSON.stringify(obj || {});
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0).toString(36);
  },

  /** Canvas texture drawn in rig units at RES scale. */
  make(scene, key, w, h, fn) {
    const R = OTR.rig.RES;
    return OTR.tex.make(scene, key, w * R, h * R, (ctx) => { ctx.scale(R, R); fn(ctx); });
  },

  person(scene, x, y, spec, o) { return new OTR.PersonRig(scene, x, y, spec || {}, o || {}); },
  dog(scene, x, y, spec, o) { return new OTR.DogRig(scene, x, y, spec || {}, o || {}); },

  shadowTex(scene) {
    return OTR.tex.make(scene, 'rig_shadow', 120, 28, (ctx) => {
      ctx.save();
      ctx.scale(1, 28 / 120);
      ctx.fillStyle = OTR.cv.rad(ctx, 60, 60, 0, 60, [[0, 'rgba(0,0,0,0.42)'], [0.6, 'rgba(0,0,0,0.22)'], [1, 'rgba(0,0,0,0)']]);
      ctx.fillRect(0, 0, 120, 120);
      ctx.restore();
    });
  },

  /* ------------------------------------------------------------------ held items */
  itemTex(scene, kind) {
    const cv = OTR.cv;
    switch (kind) {
      case 'box':
        return OTR.rig.make(scene, 'rig_item_box', 70, 60, (ctx) => {
          OTR.draw.box(ctx, { fw: 52, fh: 38, d: 14, x: 4, y: 14, color: 0xC99A62 });
          ctx.fillStyle = '#fff'; ctx.fillRect(12, 34, 22, 12);
          ctx.fillStyle = '#4D148C'; ctx.fillRect(12, 34, 22, 3);
        });
      case 'bigbox':
        return OTR.rig.make(scene, 'rig_item_bigbox', 96, 84, (ctx) => {
          OTR.draw.box(ctx, { fw: 72, fh: 56, d: 20, x: 4, y: 20, color: 0xB88A55 });
          ctx.fillStyle = '#fff'; ctx.fillRect(14, 48, 30, 16);
        });
      case 'envelope':
        return OTR.rig.make(scene, 'rig_item_env', 44, 32, (ctx) => {
          cv.rr(ctx, 2, 4, 40, 26, 3); ctx.fillStyle = '#F4F1FA'; ctx.fill();
          ctx.fillStyle = '#4D148C'; ctx.fillRect(2, 4, 40, 6);
          ctx.fillStyle = '#FF6600'; ctx.fillRect(2, 10, 40, 2);
        });
      case 'scanner':
        return OTR.rig.make(scene, 'rig_item_scanner', 30, 40, (ctx) => {
          cv.rr(ctx, 4, 2, 22, 36, 5); ctx.fillStyle = '#2B2B36'; ctx.fill();
          cv.rr(ctx, 7, 6, 16, 14, 2); ctx.fillStyle = '#7FD4FF'; ctx.fill();
          ctx.fillStyle = '#FF6600'; ctx.fillRect(7, 24, 16, 4);
          ctx.fillStyle = '#555'; for (let i = 0; i < 3; i++) ctx.fillRect(8 + i * 5, 31, 3, 3);
        });
      case 'bottle':
        return OTR.rig.make(scene, 'rig_item_bottle', 16, 40, (ctx) => {
          cv.rr(ctx, 3, 8, 10, 30, 4); ctx.fillStyle = 'rgba(140,210,255,0.9)'; ctx.fill();
          cv.rr(ctx, 5, 2, 6, 8, 2); ctx.fillStyle = '#3DA5FF'; ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(5, 12, 2, 20);
        });
      case 'phone':
        return OTR.rig.make(scene, 'rig_item_phone', 16, 26, (ctx) => {
          cv.rr(ctx, 2, 2, 12, 22, 3); ctx.fillStyle = '#1D1D24'; ctx.fill();
          cv.rr(ctx, 4, 5, 8, 14, 1); ctx.fillStyle = '#8FD3FF'; ctx.fill();
        });
      case 'doortag':
        return OTR.rig.make(scene, 'rig_item_tag', 24, 36, (ctx) => {
          cv.rr(ctx, 2, 2, 20, 32, 3); ctx.fillStyle = '#FFFFFF'; ctx.fill();
          ctx.fillStyle = '#FF6600'; ctx.fillRect(2, 2, 20, 8);
          ctx.fillStyle = '#4D148C'; ctx.fillRect(5, 14, 14, 2); ctx.fillRect(5, 19, 10, 2); ctx.fillRect(5, 24, 12, 2);
        });
      case 'clipboard':
        return OTR.rig.make(scene, 'rig_item_clip', 32, 42, (ctx) => {
          cv.rr(ctx, 2, 4, 28, 36, 3); ctx.fillStyle = '#A8703E'; ctx.fill();
          cv.rr(ctx, 5, 8, 22, 29, 2); ctx.fillStyle = '#fff'; ctx.fill();
          cv.rr(ctx, 10, 1, 12, 7, 2); ctx.fillStyle = '#9AA0B4'; ctx.fill();
        });
      default:
        return null;
    }
  },

  /* ------------------------------------------------------------------ math */
  rad(deg) { return deg * Math.PI / 180; },
  /** Point L along a limb hanging at forward-angle a (deg, 0 = straight down). */
  down(L, a) {
    const r = a * Math.PI / 180;
    return { x: L * Math.sin(r), y: L * Math.cos(r) };
  },
  /** Point L along an up-pointing segment leaning forward by a degrees. */
  up(L, a) {
    const r = a * Math.PI / 180;
    return { x: L * Math.sin(r), y: -L * Math.cos(r) };
  },
  /** Rotate a local offset (x, y) by lean degrees (clockwise on screen). */
  rot(x, y, a) {
    const r = a * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
    return { x: x * c - y * s, y: x * s + y * c };
  },
  /** 2-bone leg IK: hip dropped by `drop`, ankle at forward offset fx. Returns forward angles. */
  legIK(drop, fx) {
    const L1 = 50, L2 = 46;
    const dy = 96 - drop, dx = fx;
    let D = Math.sqrt(dx * dx + dy * dy);
    D = Math.min(D, L1 + L2 - 0.01);
    const cosK = (L1 * L1 + L2 * L2 - D * D) / (2 * L1 * L2);
    const bend = Math.PI - Math.acos(OTR.util.clamp(cosK, -1, 1));
    const a0 = Math.atan2(dx, dy);
    const cosA = (L1 * L1 + D * D - L2 * L2) / (2 * L1 * D);
    const A = Math.acos(OTR.util.clamp(cosA, -1, 1));
    const thigh = (a0 + A) * 180 / Math.PI;
    return { t: thigh, s: bend * 180 / Math.PI };
  }
};

/* ==================================================================== person part painters */
OTR.rigArt = {
  bodyColors(spec) {
    return {
      skin: spec.skin || 0xE8B48F,
      shirt: spec.shirt !== undefined ? spec.shirt : 0x5B7DB1,
      pants: spec.pants !== undefined ? spec.pants : (spec.uniform ? 0x2C2A3C : 0x3E4C6E),
      shoes: spec.shoes !== undefined ? spec.shoes : 0x2A2A32,
      sleeves: spec.jacket ? 'long' : (spec.sleeves || 'short'),
      top: spec.jacket !== undefined && spec.jacket !== false ? spec.jacket : (spec.shirt !== undefined ? spec.shirt : 0x5B7DB1)
    };
  },

  torso(ctx, spec) {
    const cv = OTR.cv;
    const C = OTR.rigArt.bodyColors(spec);
    const top = C.top;
    // neck
    cv.rr(ctx, 29, 2, 14, 24, 6); ctx.fillStyle = cv.c(OTR.color.shade(C.skin, -0.2)); ctx.fill();
    // shirt / jacket body
    ctx.beginPath();
    ctx.moveTo(18, 98); ctx.lineTo(15, 42);
    ctx.quadraticCurveTo(13, 19, 30, 17); ctx.lineTo(44, 17);
    ctx.quadraticCurveTo(60, 19, 58, 42); ctx.lineTo(55, 98); ctx.closePath();
    ctx.fillStyle = cv.lin(ctx, 13, 0, 60, 0, [[0, OTR.color.shade(top, -0.25)], [0.62, OTR.color.shade(top, 0.08)], [1, OTR.color.shade(top, -0.06)]]);
    ctx.fill();
    // fabric fold shading
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    ctx.beginPath(); ctx.moveTo(22, 60); ctx.quadraticCurveTo(34, 70, 30, 96); ctx.lineTo(20, 96); ctx.closePath(); ctx.fill();

    if (spec.jacket) {
      ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(46, 22); ctx.lineTo(48, 86); ctx.stroke();
      ctx.fillStyle = cv.c(OTR.color.shade(top, -0.3));
      cv.rr(ctx, 26, 14, 26, 8, 4); ctx.fill();
    } else if (spec.uniform) {
      // orange V collar and name patch
      ctx.beginPath(); ctx.moveTo(33, 17); ctx.lineTo(43, 34); ctx.lineTo(53, 17); ctx.lineTo(49, 16); ctx.lineTo(43, 27); ctx.lineTo(37, 16); ctx.closePath();
      ctx.fillStyle = '#FF6600'; ctx.fill();
      cv.rr(ctx, 44, 40, 11, 6, 1.5); ctx.fillStyle = '#fff'; ctx.fill();
      ctx.fillStyle = '#FF6600'; ctx.fillRect(45, 41.5, 4, 3);
      // shoulder stripe
      ctx.fillStyle = 'rgba(255,102,0,0.9)'; ctx.fillRect(15, 40, 43, 2);
    } else if (spec.collar) {
      ctx.strokeStyle = cv.c(OTR.color.shade(top, 0.45)); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(33, 17); ctx.lineTo(43, 30); ctx.lineTo(53, 17); ctx.stroke();
    } else {
      ctx.strokeStyle = cv.c(OTR.color.shade(top, -0.35)); ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(40, 16, 9, 0.2 * Math.PI, 0.85 * Math.PI); ctx.stroke();
    }
    if (spec.tie) {
      ctx.beginPath(); ctx.moveTo(41, 22); ctx.lineTo(46, 22); ctx.lineTo(48, 58); ctx.lineTo(44, 64); ctx.lineTo(40, 58); ctx.closePath();
      ctx.fillStyle = cv.c(spec.tie); ctx.fill();
    }
    if (spec.lanyard) {
      ctx.strokeStyle = cv.c(spec.lanyard); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(34, 18); ctx.lineTo(44, 50); ctx.lineTo(52, 18); ctx.stroke();
      cv.rr(ctx, 39, 48, 11, 14, 2); ctx.fillStyle = '#fff'; ctx.fill();
    }
    if (spec.vest) {
      const vc = spec.vest === true ? 0xC6F03A : spec.vest;
      ctx.save();
      ctx.beginPath(); ctx.moveTo(18, 90); ctx.lineTo(16, 42); ctx.quadraticCurveTo(15, 22, 30, 19); ctx.lineTo(36, 19); ctx.lineTo(40, 90); ctx.closePath();
      ctx.moveTo(46, 90); ctx.lineTo(48, 19); ctx.lineTo(44, 19); ctx.quadraticCurveTo(58, 22, 57, 42); ctx.lineTo(55, 90); ctx.closePath();
      ctx.fillStyle = cv.c(vc); ctx.fill();
      ctx.clip();
      ctx.fillStyle = 'rgba(230,235,240,0.95)'; ctx.fillRect(10, 58, 60, 4); ctx.fillRect(10, 72, 60, 4);
      ctx.restore();
    }
    // belt + hips
    cv.rr(ctx, 17, 84, 39, 18, 7); ctx.fillStyle = cv.c(C.pants); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(17, 84, 39, 4);
    ctx.fillStyle = '#B9A36A'; ctx.fillRect(46, 84, 5, 4);
  },

  thigh(ctx, spec) {
    const cv = OTR.cv;
    const C = OTR.rigArt.bodyColors(spec);
    if (spec.shorts) {
      cv.rr(ctx, 6, 22, 18, 42, 9); ctx.fillStyle = cv.lin(ctx, 6, 0, 24, 0, [[0, OTR.color.shade(C.skin, -0.2)], [1, OTR.color.shade(C.skin, 0.05)]]); ctx.fill();
      cv.rr(ctx, 4, 0, 22, 36, 10); ctx.fillStyle = cv.lin(ctx, 4, 0, 26, 0, [[0, OTR.color.shade(C.pants, -0.2)], [1, OTR.color.shade(C.pants, 0.12)]]); ctx.fill();
    } else {
      cv.rr(ctx, 4, 0, 22, 64, 11);
      ctx.fillStyle = cv.lin(ctx, 4, 0, 26, 0, [[0, OTR.color.shade(C.pants, -0.22)], [0.7, OTR.color.shade(C.pants, 0.12)], [1, OTR.color.shade(C.pants, 0)]]);
      ctx.fill();
    }
  },

  shin(ctx, spec) {
    const cv = OTR.cv;
    const C = OTR.rigArt.bodyColors(spec);
    const leg = spec.shorts ? C.skin : C.pants;
    cv.rr(ctx, 6, 0, 18, 56, 9);
    ctx.fillStyle = cv.lin(ctx, 6, 0, 24, 0, [[0, OTR.color.shade(leg, -0.22)], [0.7, OTR.color.shade(leg, 0.1)], [1, leg]]);
    ctx.fill();
    if (spec.shorts) { cv.rr(ctx, 6, 40, 18, 12, 3); ctx.fillStyle = '#F4F4F8'; ctx.fill(); }
    // shoe
    ctx.beginPath();
    ctx.moveTo(5, 50); ctx.lineTo(24, 50); ctx.quadraticCurveTo(40, 52, 41, 62); ctx.lineTo(41, 64); ctx.lineTo(5, 64); ctx.closePath();
    ctx.fillStyle = cv.lin(ctx, 0, 50, 0, 64, [[0, OTR.color.shade(C.shoes, 0.25)], [1, OTR.color.shade(C.shoes, -0.2)]]);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(5, 62, 36, 2);
  },

  upperArm(ctx, spec) {
    const cv = OTR.cv;
    const C = OTR.rigArt.bodyColors(spec);
    if (C.sleeves === 'long') {
      cv.rr(ctx, 4, 0, 18, 52, 9); ctx.fillStyle = cv.lin(ctx, 4, 0, 22, 0, [[0, OTR.color.shade(C.top, -0.25)], [1, OTR.color.shade(C.top, 0.05)]]); ctx.fill();
    } else {
      cv.rr(ctx, 5, 12, 16, 42, 8); ctx.fillStyle = cv.lin(ctx, 5, 0, 21, 0, [[0, OTR.color.shade(C.skin, -0.2)], [1, OTR.color.shade(C.skin, 0.06)]]); ctx.fill();
      cv.rr(ctx, 3, 0, 20, 24, 9); ctx.fillStyle = cv.lin(ctx, 3, 0, 23, 0, [[0, OTR.color.shade(C.top, -0.25)], [1, OTR.color.shade(C.top, 0.08)]]); ctx.fill();
      if (spec.uniform) { ctx.fillStyle = '#FF6600'; ctx.fillRect(3, 20, 20, 3); }
    }
  },

  forearm(ctx, spec) {
    const cv = OTR.cv;
    const C = OTR.rigArt.bodyColors(spec);
    if (C.sleeves === 'long') {
      cv.rr(ctx, 5, 0, 16, 38, 8); ctx.fillStyle = cv.lin(ctx, 5, 0, 21, 0, [[0, OTR.color.shade(C.top, -0.25)], [1, OTR.color.shade(C.top, 0.05)]]); ctx.fill();
      ctx.fillStyle = cv.c(OTR.color.shade(C.top, -0.35)); ctx.fillRect(5, 33, 16, 4);
    } else {
      cv.rr(ctx, 5, 0, 16, 42, 8); ctx.fillStyle = cv.lin(ctx, 5, 0, 21, 0, [[0, OTR.color.shade(C.skin, -0.2)], [1, OTR.color.shade(C.skin, 0.06)]]); ctx.fill();
    }
    cv.ellipse(ctx, 13, 48, 8.5, 9.5); ctx.fillStyle = cv.c(OTR.color.shade(C.skin, 0.04)); ctx.fill();
    cv.ellipse(ctx, 19, 44, 3.5, 5, -0.5); ctx.fillStyle = cv.c(OTR.color.shade(C.skin, -0.08)); ctx.fill();
  }
};

/* ==================================================================== base rig */
OTR.BaseRig = class {
  constructor(scene, x, y, o) {
    this.scene = scene;
    this.baseScale = o.scale || 1;
    this.facing = o.facing || 1;
    this.c = scene.add.container(x, y);
    this.c.rig = this;
    this.t = Math.random() * 10;
    this.phase = 0;
    this.anim = 'idle';
    this.once = null;
    this.pose = null;
    this.moveTarget = null;
    this.speed = o.speed || 170;
    this.moving = false;
    this.applyScale();
    this._upd = (time, delta) => this.update(delta);
    scene.events.on('update', this._upd);
    this.c.once('destroy', () => scene.events.off('update', this._upd));
    if (o.depth !== undefined) this.c.setDepth(o.depth);
  }

  get x() { return this.c.x; }
  set x(v) { this.c.x = v; }
  get y() { return this.c.y; }
  set y(v) { this.c.y = v; }

  applyScale() { this.c.setScale(this.baseScale * this.facing, this.baseScale); }
  setScale(s) { this.baseScale = s; this.applyScale(); return this; }
  setFacing(f) { this.facing = f < 0 ? -1 : 1; this.applyScale(); return this; }
  face(x) { if (Math.abs(x - this.c.x) > 2) this.setFacing(x > this.c.x ? 1 : -1); return this; }
  setDepth(d) { this.c.setDepth(d); return this; }
  setVisible(v) { this.c.setVisible(v); return this; }
  setAlpha(a) { this.c.setAlpha(a); return this; }
  destroy() { if (this.c && this.c.active) this.c.destroy(); }

  play(name) {
    if (this.anims()[name]) { this.anim = name; this.once = null; }
    return this;
  }

  /** One-shot keyframed animation, then returns to `then` (default: previous loop). */
  playOnce(name, onDone, then) {
    const def = this.onces()[name];
    if (!def) { if (onDone) onDone(); return this; }
    this.once = { def, t: 0, onDone, then: then || this.anim, fired: {} };
    return this;
  }

  /** Walk to x at speed, then call onArrive. o: { speed, anim, keepFacing } */
  walkTo(x, onArrive, o) {
    o = o || {};
    this.moveTarget = { x, onArrive, speed: o.speed || this.speed, anim: o.anim, keepFacing: o.keepFacing, prev: o.then || 'idle' };
    if (!o.keepFacing) this.face(x);
    return this;
  }

  stop() { this.moveTarget = null; this.moving = false; return this; }

  update(delta) {
    if (!this.c.active) return;
    const dt = Math.min(delta, 100) / 1000;
    this.t += dt;
    this.moving = false;
    if (this.moveTarget) {
      const m = this.moveTarget;
      const dx = m.x - this.c.x;
      const step = m.speed * dt;
      if (Math.abs(dx) <= step) {
        this.c.x = m.x;
        this.moveTarget = null;
        this.onArriveAnim(m);
        if (m.onArrive) m.onArrive(this);
      } else {
        this.c.x += Math.sign(dx) * step;
        this.moving = true;
        this.phase += step * this.strideRate();
      }
    }
    let target;
    if (this.once) {
      const o = this.once;
      o.t += dt;
      const k = Math.min(1, o.t / o.def.dur);
      target = this.keyframes(o.def, k);
      if (o.def.events) o.def.events.forEach((ev, i) => { if (!o.fired[i] && k >= ev.at) { o.fired[i] = true; ev.fn(this); } });
      if (k >= 1) {
        const cb = o.onDone;
        this.anim = o.then;
        this.once = null;
        if (cb) cb(this);
      }
    } else {
      target = this.anims()[this.currentAnimName()](this.t, this);
    }
    const full = Object.assign(this.restPose(), target);
    if (!this.pose) this.pose = full;
    else {
      const k = this.once ? 1 - Math.exp(-dt * 30) : 1 - Math.exp(-dt * 16);
      Object.keys(full).forEach(key => { this.pose[key] += (full[key] - this.pose[key]) * k; });
    }
    this.applyPose(this.pose, dt);
  }

  keyframes(def, k) {
    const kf = def.keys;
    let i = 0;
    while (i < kf.length - 2 && k > kf[i + 1].at) i++;
    const a = kf[i], b = kf[i + 1] || a;
    const span = Math.max(1e-6, b.at - a.at);
    let u = OTR.util.clamp01((k - a.at) / span);
    u = u * u * (3 - 2 * u);
    const out = {};
    const keys = new Set(Object.keys(a.pose).concat(Object.keys(b.pose)));
    const rest = this.restPose();
    keys.forEach(key => {
      const va = a.pose[key] !== undefined ? a.pose[key] : rest[key];
      const vb = b.pose[key] !== undefined ? b.pose[key] : rest[key];
      out[key] = va + (vb - va) * u;
    });
    return out;
  }

  /** Little speech/emote bubble above the head. */
  emote(text, o) {
    o = o || {};
    const s = this.scene;
    const h = this.headHeight ? this.headHeight() : 280;
    const c = s.add.container(this.c.x, this.c.y - h * this.baseScale - 10).setDepth((this.c.depth || 0) + 1);
    const t = OTR.txt(s, 0, -2, text, o.size || 26, o.color || '#250849', { weight: '900' });
    const w = Math.max(44, t.width + 22), hh = t.height + 14;
    const g = OTR.tex.shape(s, (g) => {
      g.fillStyle(0x000000, 0.2); g.fillRoundedRect(-w / 2, -hh / 2 + 3, w, hh, 14);
      g.fillStyle(o.bg !== undefined ? o.bg : 0xFFFFFF, 1); g.fillRoundedRect(-w / 2, -hh / 2, w, hh, 14);
      g.fillTriangle(-7, hh / 2 - 1, 7, hh / 2 - 1, 0, hh / 2 + 9);
    });
    c.add([g, t]);
    c.setScale(0.2);
    s.tweens.add({ targets: c, scale: 1, duration: 220, ease: 'Back.out' });
    s.tweens.add({ targets: c, y: c.y - 16, alpha: 0, delay: o.hold || 1100, duration: 350, onComplete: () => c.destroy() });
    return c;
  }
};

/* ==================================================================== person */
OTR.PersonRig = class extends OTR.BaseRig {
  constructor(scene, x, y, spec, o) {
    super(scene, x, y, o);
    this.spec = spec;
    this.h = OTR.rig.hash(spec);
    this.expr = o.expr || 'neutral';
    this.talking = false;
    this.mouthOpen = null;
    this.blinkT = 2 + Math.random() * 3;
    this.blinking = 0;
    this.item = null;
    this.itemKind = null;
    this.build();
    if (o.anim) this.play(o.anim);
  }

  headHeight() { return 300; }

  tex(part) {
    const s = this.scene, spec = this.spec, key = `rg_${this.h}_${part}`;
    const A = OTR.rigArt;
    switch (part) {
      case 'torso': return OTR.rig.make(s, key, 72, 104, (ctx) => A.torso(ctx, spec));
      case 'thigh': return OTR.rig.make(s, key, 30, 68, (ctx) => A.thigh(ctx, spec));
      case 'shin': return OTR.rig.make(s, key, 46, 68, (ctx) => A.shin(ctx, spec));
      case 'upper': return OTR.rig.make(s, key, 26, 56, (ctx) => A.upperArm(ctx, spec));
      case 'fore': return OTR.rig.make(s, key, 26, 60, (ctx) => A.forearm(ctx, spec));
      default: return null;
    }
  }

  /** Head layers in portrait coordinates (region x 60..300, y 40..320). */
  headTex(layer, a, b) {
    const s = this.scene, spec = this.spec, R = OTR.rig.RES, k = OTR.rig.HEAD_K * R;
    const W = 240, H = layer === 'hairBack' ? 340 : 280;
    const key = `rg_${this.h}_h_${layer}_${a || ''}_${b || ''}`;
    return OTR.tex.make(s, key, Math.ceil(W * k), Math.ceil(H * k), (ctx) => {
      ctx.scale(k, k);
      ctx.translate(-60, -40);
      const D = OTR.draw;
      if (layer === 'hairBack') D.hairBack(ctx, spec);
      else if (layer === 'base') D.headBase(ctx, spec);
      else if (layer === 'face') {
        ctx.save();
        OTR.cv.ellipse(ctx, 180, 200, 78, 92); ctx.clip();
        ctx.translate(6, 0);
        D.faceMid(ctx, spec, a);
        ctx.restore();
        ctx.save(); ctx.translate(6, 0); D.faceEyes(ctx, spec, a, b === 'blink'); ctx.restore();
        D.faceAccents(ctx, spec, a);
      } else if (layer === 'mouth') {
        ctx.translate(6, 0);
        D.faceMouth(ctx, spec, a, b);
      }
    });
  }

  build() {
    const s = this.scene, inv = 1 / OTR.rig.RES;
    const img = (key, ox, oy) => s.add.image(0, 0, key).setOrigin(ox, oy).setScale(inv);
    const back = 0xB9B3C6;
    this.shadow = s.add.image(0, 0, OTR.rig.shadowTex(s)).setScale(0.75, 0.9);
    const hbH = 340;
    this.hairBack = img(this.headTex('hairBack'), 0.5, (286 - 40) / hbH);
    this.bUpper = img(this.tex('upper'), 13 / 26, 8 / 56).setTint(back);
    this.bFore = img(this.tex('fore'), 13 / 26, 8 / 60).setTint(back);
    this.bThigh = img(this.tex('thigh'), 15 / 30, 8 / 68).setTint(back);
    this.bShin = img(this.tex('shin'), 15 / 46, 8 / 68).setTint(back);
    this.fThigh = img(this.tex('thigh'), 15 / 30, 8 / 68);
    this.fShin = img(this.tex('shin'), 15 / 46, 8 / 68);
    this.torso = img(this.tex('torso'), 36 / 72, 98 / 104);
    this.head = s.add.container(0, 0);
    const hy = (286 - 40) / 280;
    this.headBase = img(this.headTex('base'), 0.5, hy);
    this.faceImg = img(this.headTex('face', this.expr, 'open'), 0.5, hy);
    this.mouthImg = img(this.headTex('mouth', this.expr), 0.5, hy);
    this.head.add([this.headBase, this.faceImg, this.mouthImg]);
    this.itemImg = s.add.image(0, 0, '__DEFAULT').setVisible(false);
    this.fUpper = img(this.tex('upper'), 13 / 26, 8 / 56);
    this.fFore = img(this.tex('fore'), 13 / 26, 8 / 60);
    this.c.add([this.shadow, this.hairBack, this.bUpper, this.bFore, this.bThigh, this.bShin, this.fThigh, this.fShin,
      this.torso, this.head, this.itemImg, this.fUpper, this.fFore]);
  }

  setExpression(expr) {
    if (!expr || expr === this.expr) return this;
    this.expr = expr;
    this.refreshFace();
    return this;
  }

  refreshFace() {
    this.faceImg.setTexture(this.headTex('face', this.expr, this.blinking > 0 ? 'blink' : 'open'));
    this.mouthImg.setTexture(this.headTex('mouth', this.expr, this.mouthOpen || undefined));
  }

  talk(on) {
    this.talking = !!on;
    this.talkT = 0;
    if (!on && this.mouthOpen) { this.mouthOpen = null; this.refreshFace(); }
    return this;
  }

  /** Hold an item: 'box' | 'bigbox' | 'envelope' | 'scanner' | 'bottle' | 'phone' | 'doortag' | 'clipboard' | null */
  hold(kind) {
    this.itemKind = kind || null;
    if (!kind) { this.itemImg.setVisible(false); return this; }
    this.itemImg.setTexture(OTR.rig.itemTex(this.scene, kind)).setScale(1 / OTR.rig.RES).setVisible(true);
    return this;
  }

  strideRate() { return (Math.PI * 2) / 118; }

  currentAnimName() {
    if (this.moving) {
      if (this.moveTarget && this.moveTarget.anim) return this.moveTarget.anim;
      return this.itemKind === 'box' || this.itemKind === 'bigbox' ? 'carryWalk' : 'walk';
    }
    if ((this.itemKind === 'box' || this.itemKind === 'bigbox') && this.anim === 'idle') return 'carry';
    return this.anim;
  }

  onArriveAnim(m) {
    if (this.anim === 'walk' || this.anim === 'carryWalk') this.anim = m.prev || 'idle';
  }

  restPose() {
    return { hipY: 0, lean: 0, head: 0, fT: 0, fS: 4, bT: 0, bS: 4, fU: 2, fF: 8, bU: -2, bF: 8, bob: 0, breathe: 0, itemX: 0, itemY: 0 };
  }

  anims() { return OTR.PersonRig.ANIMS; }
  onces() { return OTR.PersonRig.ONCES; }

  applyPose(P, dt) {
    const R = OTR.rig;
    // blink + talk
    this.blinkT -= dt;
    if (this.blinking > 0) {
      this.blinking -= dt;
      if (this.blinking <= 0) this.refreshFace();
    } else if (this.blinkT <= 0) {
      this.blinking = 0.12;
      this.blinkT = 2 + Math.random() * 3.5;
      this.refreshFace();
    }
    if (this.talking) {
      this.talkT = (this.talkT || 0) - dt;
      if (this.talkT <= 0) {
        this.talkT = 0.07 + Math.random() * 0.08;
        const r = Math.random();
        this.mouthOpen = r < 0.35 ? null : r < 0.8 ? 'open' : 'wide';
        this.refreshFace();
      }
    }

    const hip = { x: 0, y: -100 + P.hipY - P.bob };
    const lean = P.lean;
    this.torso.setPosition(hip.x, hip.y).setRotation(R.rad(lean));
    this.torso.scaleY = (1 / R.RES) * (1 + P.breathe * 0.012);

    const neckOff = R.rot(1, -90, lean);
    const neck = { x: hip.x + neckOff.x, y: hip.y + neckOff.y };
    this.head.setPosition(neck.x, neck.y).setRotation(R.rad(lean + P.head));
    this.hairBack.setPosition(neck.x, neck.y).setRotation(R.rad(lean + P.head * 0.6));

    // legs (back leg sits slightly behind)
    const leg = (thigh, shin, tA, sBend, dx) => {
      const hx = hip.x + dx, hy = hip.y;
      thigh.setPosition(hx, hy).setRotation(-R.rad(tA));
      const k = R.down(50, tA);
      const shinA = tA - sBend;
      shin.setPosition(hx + k.x, hy + k.y).setRotation(-R.rad(shinA));
    };
    leg(this.bThigh, this.bShin, P.bT, P.bS, -4);
    leg(this.fThigh, this.fShin, P.fT, P.fS, 3);

    // arms (angles relative to torso lean)
    const shOff = R.rot(3, -73, lean);
    const sh = { x: hip.x + shOff.x, y: hip.y + shOff.y };
    const arm = (upper, fore, uA, fBend, dx) => {
      const a = lean + uA;
      upper.setPosition(sh.x + dx, sh.y).setRotation(-R.rad(a));
      const e = R.down(38, a);
      const fa = a + fBend;
      fore.setPosition(sh.x + dx + e.x, sh.y + e.y).setRotation(-R.rad(fa));
      const hnd = R.down(40, fa);
      return { x: sh.x + dx + e.x + hnd.x, y: sh.y + e.y + hnd.y, a: fa };
    };
    const bHand = arm(this.bUpper, this.bFore, P.bU, P.bF, -6);
    const fHand = arm(this.fUpper, this.fFore, P.fU, P.fF, 2);
    this.handF = fHand; this.handB = bHand;

    if (this.itemKind) {
      const k = this.itemKind;
      if (k === 'box' || k === 'bigbox') {
        const mx = (fHand.x + bHand.x) / 2, my = (fHand.y + bHand.y) / 2;
        this.itemImg.setPosition(mx - 6 + P.itemX, my - (k === 'bigbox' ? 20 : 14) + P.itemY).setRotation(R.rad(lean * 0.3));
      } else {
        const off = R.down(6, fHand.a);
        this.itemImg.setPosition(fHand.x + off.x + P.itemX, fHand.y + off.y - 4 + P.itemY).setRotation(-R.rad(fHand.a) * 0.25);
      }
    }
    this.shadow.setPosition(hip.x + (P.fT + P.bT) * 0.1, 0).setScale(0.75 + P.hipY * 0.002, 0.9);
  }
};

(function () {
  const S = Math.sin, Cc = Math.cos, max = Math.max, abs = Math.abs;
  const walkLegs = (p, amp) => {
    const s = S(p), c = Cc(p);
    return {
      fT: amp * s, fS: 5 + 44 * Math.pow(max(0, c), 1.6),
      bT: -amp * s, bS: 5 + 44 * Math.pow(max(0, -c), 1.6),
      hipY: (1 - abs(c)) * 4, bob: 0
    };
  };
  const ik = (drop, ff, fb) => {
    const f = OTR.rig.legIK(drop, ff), b = OTR.rig.legIK(drop, fb);
    return { hipY: drop, fT: f.t, fS: f.s, bT: b.t, bS: b.s };
  };

  OTR.PersonRig.ANIMS = {
    idle: (t) => { const b = S(t * 2.1); return { lean: 1 + b * 0.5, head: b * 1.2, fU: 3 + b * 1.5, bU: -3 - b, breathe: b }; },
    walk: (t, r) => Object.assign(walkLegs(r.phase, 26), {
      lean: 5, head: -2 + S(r.phase * 2),
      fU: -22 * S(r.phase), fF: 16 + 14 * max(0, -S(r.phase)),
      bU: 22 * S(r.phase), bF: 16 + 14 * max(0, S(r.phase))
    }),
    carryWalk: (t, r) => Object.assign(walkLegs(r.phase, 20), { lean: -2, head: 0, fU: 24, fF: 78, bU: 20, bF: 84 }),
    carry: (t) => { const b = S(t * 2.1); return { lean: -2 + b * 0.4, fU: 24, fF: 78, bU: 20, bF: 84, breathe: b }; },
    knock: (t) => ({ lean: 4, head: -2, fU: 78, fF: 62 + 28 * max(0, S(t * 15)), bU: -2, bF: 10 }),
    ring: () => ({ lean: 3, fU: 72, fF: 18, bU: -2, bF: 10 }),
    wave: (t) => ({ lean: 0, head: -3, fU: 158, fF: -8 + 26 * S(t * 9), bU: -4, bF: 8 }),
    point: () => ({ lean: 2, fU: 86, fF: 2, bU: -3, bF: 10 }),
    talk: (t) => ({ lean: 2 + S(t * 1.3), head: S(t * 2.3) * 3, fU: 16 + 12 * S(t * 2.6), fF: 58 + 22 * S(t * 3.3), bU: 6 + 4 * S(t * 2.1 + 1), bF: 26 + 12 * S(t * 2.9 + 1) }),
    phone: (t) => ({ lean: 1, head: 6 + S(t) * 2, fU: 24, fF: 148, bU: -4, bF: 10 }),
    scan: (t) => ({ lean: 5, head: 14, fU: 44, fF: 58 + 3 * S(t * 3), bU: 28, bF: 60 }),
    sign: (t) => ({ lean: 6, head: 16, fU: 38, fF: 64 + 6 * S(t * 13), bU: 34, bF: 62 }),
    drink: (t) => ({ lean: -5, head: -16, fU: 62, fF: 116 + 3 * S(t * 4), bU: -4, bF: 8 }),
    crouch: () => Object.assign(ik(40, 16, -10), { lean: 24, head: -18, fU: 16, fF: 10, bU: 12, bF: 12 }),
    crouchHold: () => Object.assign(ik(40, 16, -10), { lean: 24, head: -18, fU: 38, fF: 36, bU: 34, bF: 40 }),
    stoop: () => ({ lean: 74, head: -46, fT: -4, fS: 2, bT: 4, bS: 2, fU: -60, fF: 4, bU: -64, bF: 4, hipY: 0 }),
    shrug: (t) => ({ lean: -1, head: 6 * S(t * 2), fU: 8, fF: 84, bU: 4, bF: 84, bob: 2 + 2 * max(0, S(t * 3)) }),
    handsHips: (t) => ({ lean: -3, head: -4 + S(t * 1.5), fU: -22, fF: 112, bU: -24, bF: 112 }),
    celebrate: (t) => ({ lean: -4, head: -8, fU: 168, fF: 6, bU: 162, bF: 10, bob: abs(S(t * 8)) * 14 }),
    hurt: (t) => ({ lean: 16 + S(t * 3), head: 10, fU: 12, fF: 18, bU: -46, bF: 96 }),
    think: (t) => ({ lean: 1, head: 8 + S(t) * 2, fU: 30, fF: 132, bU: 14, bF: 72 }),
    cower: (t) => ({ lean: -12, head: 10, fU: 62, fF: 104 + 4 * S(t * 12), bU: 56, bF: 110, hipY: 8, fS: 18, bS: 18, fT: 10, bT: -4 }),
    brace: () => ({ lean: 4, head: 2, fU: 36, fF: 20, bU: 30, bF: 24, fT: 10, bT: -10, fS: 8, bS: 8 }),
    stand: () => ({ lean: 0, head: 0, fU: 0, fF: 4, bU: 0, bF: 4 }),
    sit: (t) => ({ hipY: 48, lean: -2 + S(t * 2) * 0.5, fT: 88, fS: 88, bT: 84, bS: 84, fU: 34, fF: 40, bU: 30, bF: 44 }),
    tired: (t) => ({ lean: 10 + S(t * 1.2) * 2, head: 14, fU: 0, fF: 4, bU: 0, bF: 4, hipY: 3 }),
    fanFace: (t) => ({ lean: 2, head: -6, fU: 110, fF: 60 + 30 * S(t * 12), bU: 0, bF: 6 })
  };

  const standK = { hipY: 0, lean: 0, fT: 0, fS: 4, bT: 0, bS: 4 };
  const crouchK = Object.assign(ik(40, 16, -10), { lean: 24, head: -18, fU: 38, fF: 36, bU: 34, bF: 40 });
  OTR.PersonRig.ONCES = {
    lift: { dur: 1.4, keys: [
      { at: 0, pose: Object.assign({}, crouchK) },
      { at: 0.25, pose: Object.assign({}, crouchK) },
      { at: 1, pose: Object.assign({}, standK, { lean: -2, fU: 24, fF: 78, bU: 20, bF: 84 }) }
    ] },
    setDown: { dur: 1.2, keys: [
      { at: 0, pose: Object.assign({}, standK, { lean: -2, fU: 24, fF: 78, bU: 20, bF: 84 }) },
      { at: 0.7, pose: Object.assign({}, crouchK) },
      { at: 1, pose: Object.assign({}, crouchK) }
    ] },
    badLift: { dur: 1.3, keys: [
      { at: 0, pose: { lean: 74, head: -46, fU: -60, fF: 4, bU: -64, bF: 4, fS: 2, bS: 2 } },
      { at: 0.3, pose: { lean: 74, head: -46, fU: -60, fF: 4, bU: -64, bF: 4, fS: 2, bS: 2 } },
      { at: 0.75, pose: { lean: 20, head: 10, fU: 30, fF: 40, bU: -40, bF: 90, fS: 2, bS: 2 } },
      { at: 1, pose: { lean: 16, head: 10, fU: 12, fF: 18, bU: -46, bF: 96 } }
    ] },
    slip: { dur: 1.6, keys: [
      { at: 0, pose: Object.assign({}, standK) },
      { at: 0.12, pose: { lean: -30, head: 12, fT: 48, fS: 4, bT: 10, bS: 10, fU: 120, fF: 20, bU: 100, bF: 30, hipY: 6 } },
      { at: 0.3, pose: { lean: -62, head: 20, fT: 70, fS: 6, bT: 50, bS: 30, fU: 140, fF: 10, bU: 120, bF: 20, hipY: 54 } },
      { at: 0.7, pose: { lean: -58, head: 16, fT: 64, fS: 20, bT: 50, bS: 40, fU: 40, fF: 20, bU: 30, bF: 20, hipY: 58 } },
      { at: 1, pose: Object.assign({}, standK, { lean: 8, head: 6, fU: 10, fF: 10, bU: -30, bF: 80 }) }
    ] },
    stumble: { dur: 0.8, keys: [
      { at: 0, pose: Object.assign({}, standK) },
      { at: 0.3, pose: { lean: 28, head: -10, fT: 30, fS: 20, bT: -20, bS: 10, fU: 70, fF: 20, bU: 60, bF: 20, hipY: 10 } },
      { at: 1, pose: Object.assign({}, standK) }
    ] },
    stepDown: { dur: 0.9, keys: [
      { at: 0, pose: { hipY: -40, fT: 30, fS: 50, bT: 0, bS: 4, fU: 120, fF: 20, lean: 2 } },
      { at: 0.6, pose: { hipY: -10, fT: 10, fS: 10, bT: -20, bS: 40, fU: 110, fF: 30, lean: 4 } },
      { at: 1, pose: Object.assign({}, standK) }
    ] },
    climbUp: { dur: 0.9, keys: [
      { at: 0, pose: Object.assign({}, standK) },
      { at: 0.4, pose: { hipY: 10, fT: 36, fS: 60, bT: -6, bS: 10, fU: 130, fF: 20, lean: 6 } },
      { at: 1, pose: { hipY: 0, fT: 4, fS: 6, bT: -4, bS: 20, fU: 110, fF: 30, lean: 2 } }
    ] },
    jumpDown: { dur: 0.7, keys: [
      { at: 0, pose: { hipY: -40, lean: 10, fT: 30, fS: 40, bT: 20, bS: 40, fU: 60, bU: 50 } },
      { at: 0.4, pose: { hipY: -60, lean: 0, fT: 20, fS: 20, bT: 10, bS: 20, fU: 140, bU: 130 } },
      { at: 0.7, pose: Object.assign(ik(34, 14, -12), { lean: 22, fU: 40, bU: 30 }) },
      { at: 1, pose: Object.assign({}, standK, { lean: 6 }) }
    ] },
    nod: { dur: 0.6, keys: [{ at: 0, pose: { head: 0 } }, { at: 0.35, pose: { head: 14 } }, { at: 0.7, pose: { head: -2 } }, { at: 1, pose: { head: 0 } }] },
    handOver: { dur: 1.1, keys: [
      { at: 0, pose: { lean: 0, fU: 24, fF: 78, bU: 20, bF: 84 } },
      { at: 0.5, pose: { lean: 8, fU: 74, fF: 20, bU: 70, bF: 24 } },
      { at: 1, pose: { lean: 0, fU: 2, fF: 8, bU: -2, bF: 8 } }
    ] },
    receive: { dur: 1.1, keys: [
      { at: 0, pose: { lean: 0, fU: 2, fF: 8, bU: -2, bF: 8 } },
      { at: 0.45, pose: { lean: 6, fU: 70, fF: 22, bU: 66, bF: 26 } },
      { at: 1, pose: { lean: -2, fU: 24, fF: 78, bU: 20, bF: 84 } }
    ] },
    flinch: { dur: 0.6, keys: [
      { at: 0, pose: {} },
      { at: 0.2, pose: { lean: -14, head: 12, fU: 70, fF: 100, bU: 60, bF: 110, hipY: 6 } },
      { at: 1, pose: {} }
    ] }
  };
})();

/* ==================================================================== dog */
OTR.dogArt = {
  body(ctx, spec, hackles) {
    const cv = OTR.cv;
    const fur = spec.fur || 0xC98B4F, patch = spec.patch || 0xF3E3CC;
    // rump + chest + barrel
    ctx.fillStyle = cv.lin(ctx, 0, 14, 0, 76, [[0, OTR.color.shade(fur, 0.12)], [1, OTR.color.shade(fur, -0.28)]]);
    cv.ellipse(ctx, 40, 44, 28, 26); ctx.fill();
    cv.ellipse(ctx, 118, 46, 26, 28); ctx.fill();
    cv.rr(ctx, 36, 22, 90, 46, 22); ctx.fill();
    // belly patch
    ctx.fillStyle = cv.c(patch);
    cv.ellipse(ctx, 104, 62, 30, 10); ctx.fill();
    cv.ellipse(ctx, 132, 52, 10, 20, 0.3); ctx.fill();
    if (spec.spots) {
      ctx.fillStyle = cv.c(spec.spots);
      [[62, 36, 12], [92, 30, 9], [44, 50, 8]].forEach(([x, y, r]) => { cv.ellipse(ctx, x, y, r, r * 0.8); ctx.fill(); });
    }
    if (hackles) {
      ctx.fillStyle = cv.c(OTR.color.shade(fur, -0.35));
      ctx.beginPath();
      ctx.moveTo(52, 22);
      for (let i = 0; i < 9; i++) {
        const x = 52 + i * 8;
        ctx.lineTo(x + 4, 10 + (i % 2) * 3); ctx.lineTo(x + 8, 22);
      }
      ctx.closePath(); ctx.fill();
    }
  },

  leg(ctx, spec, back) {
    const cv = OTR.cv;
    const fur = spec.fur || 0xC98B4F;
    ctx.fillStyle = cv.lin(ctx, 0, 0, 20, 0, [[0, OTR.color.shade(fur, -0.25)], [1, OTR.color.shade(fur, 0.05)]]);
    if (back) {
      ctx.beginPath(); ctx.moveTo(1, 0); ctx.lineTo(21, 0); ctx.lineTo(16, 30); ctx.lineTo(14, 48); ctx.lineTo(6, 48); ctx.lineTo(4, 26); ctx.closePath(); ctx.fill();
    } else {
      cv.rr(ctx, 4, 0, 13, 50, 6); ctx.fill();
    }
    cv.ellipse(ctx, 13, 50, 9, 5.5); ctx.fillStyle = cv.c(OTR.color.shade(spec.patch || 0xF3E3CC, -0.05)); ctx.fill();
  },

  tail(ctx, spec) {
    const cv = OTR.cv;
    const fur = spec.fur || 0xC98B4F;
    ctx.beginPath();
    ctx.moveTo(0, 5); ctx.quadraticCurveTo(30, 0, 56, 6); ctx.quadraticCurveTo(30, 10, 0, 13); ctx.closePath();
    ctx.fillStyle = cv.lin(ctx, 0, 0, 0, 14, [[0, OTR.color.shade(fur, 0.1)], [1, OTR.color.shade(fur, -0.25)]]);
    ctx.fill();
  },

  /** Head facing +x. mouth: closed | pant | bark | growl. ears: relaxed | up | back */
  head(ctx, spec, mouth, ears) {
    const cv = OTR.cv;
    const fur = spec.fur || 0xC98B4F, patch = spec.patch || 0xF3E3CC;
    const ink = '#1E1414';
    // neck
    ctx.beginPath(); ctx.moveTo(6, 84); ctx.lineTo(18, 44); ctx.lineTo(46, 46); ctx.lineTo(40, 88); ctx.closePath();
    ctx.fillStyle = cv.c(OTR.color.shade(fur, -0.1)); ctx.fill();
    // collar
    ctx.save(); ctx.translate(26, 66); ctx.rotate(-0.25);
    cv.rr(ctx, -20, -5, 40, 10, 5); ctx.fillStyle = cv.c(spec.collar || 0xE8304A); ctx.fill();
    ctx.beginPath(); ctx.arc(8, 8, 4, 0, Math.PI * 2); ctx.fillStyle = '#FFD24A'; ctx.fill();
    ctx.restore();
    // far ear
    if (ears === 'relaxed') {
      ctx.fillStyle = cv.c(OTR.color.shade(fur, -0.45));
      ctx.beginPath(); ctx.moveTo(38, 22); ctx.quadraticCurveTo(26, 30, 30, 52); ctx.quadraticCurveTo(40, 44, 44, 26); ctx.closePath(); ctx.fill();
    }
    // lower jaw (opens for bark / pant)
    const jawOpen = mouth === 'bark' ? 0.55 : mouth === 'pant' ? 0.25 : mouth === 'growl' ? 0.08 : 0;
    ctx.save();
    ctx.translate(58, 50); ctx.rotate(jawOpen);
    cv.rr(ctx, -4, -6, 36, 13, 6); ctx.fillStyle = cv.c(OTR.color.shade(patch, -0.08)); ctx.fill();
    if (jawOpen > 0.05) {
      cv.rr(ctx, 0, -7, 28, 5, 2); ctx.fillStyle = '#7A2530'; ctx.fill();
    }
    if (mouth === 'pant') {
      ctx.beginPath(); ctx.moveTo(8, -2); ctx.quadraticCurveTo(14, 26, 24, 16); ctx.quadraticCurveTo(26, 4, 20, -2); ctx.closePath();
      ctx.fillStyle = '#F07A8A'; ctx.fill();
    }
    ctx.restore();
    if (mouth === 'bark') {
      ctx.beginPath(); ctx.moveTo(60, 50); ctx.lineTo(90, 50); ctx.lineTo(86, 64); ctx.lineTo(62, 58); ctx.closePath();
      ctx.fillStyle = '#5A1E2C'; ctx.fill();
    }
    // skull
    cv.ellipse(ctx, 44, 38, 26, 23);
    ctx.fillStyle = cv.rad(ctx, 40, 28, 4, 34, [[0, OTR.color.shade(fur, 0.18)], [1, OTR.color.shade(fur, -0.12)]]);
    ctx.fill();
    // snout
    cv.rr(ctx, 50, 32, 42, 20, 10); ctx.fillStyle = cv.c(patch); ctx.fill();
    if (mouth === 'growl') {
      // curled lip + teeth
      ctx.fillStyle = '#7A2530';
      cv.rr(ctx, 60, 46, 30, 8, 3); ctx.fill();
      ctx.fillStyle = '#fff';
      for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(62 + i * 6, 46); ctx.lineTo(65 + i * 6, 53); ctx.lineTo(68 + i * 6, 46); ctx.closePath(); ctx.fill(); }
      ctx.strokeStyle = 'rgba(60,20,20,0.5)'; ctx.lineWidth = 1.5;
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(62 + i * 7, 36); ctx.quadraticCurveTo(65 + i * 7, 32, 68 + i * 7, 36); ctx.stroke(); }
    }
    // nose
    cv.ellipse(ctx, 90, 38, 6, 5); ctx.fillStyle = ink; ctx.fill();
    ctx.beginPath(); ctx.arc(88, 36, 1.6, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fill();
    // eye + brow
    const eyeY = 30;
    if (mouth === 'growl') {
      ctx.beginPath(); ctx.moveTo(46, eyeY - 2); ctx.lineTo(58, eyeY + 2); ctx.lineTo(46, eyeY + 4); ctx.closePath(); ctx.fillStyle = ink; ctx.fill();
      ctx.strokeStyle = ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(42, eyeY - 10); ctx.lineTo(60, eyeY - 3); ctx.stroke();
    } else {
      cv.ellipse(ctx, 53, eyeY, 5, 5.5); ctx.fillStyle = ink; ctx.fill();
      ctx.beginPath(); ctx.arc(55, eyeY - 2, 1.8, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill();
      if (ears === 'back') { ctx.strokeStyle = ink; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(46, eyeY - 10); ctx.lineTo(58, eyeY - 12); ctx.stroke(); }
    }
    // near ear
    ctx.fillStyle = cv.c(OTR.color.shade(fur, -0.3));
    ctx.beginPath();
    if (ears === 'up') { ctx.moveTo(26, 22); ctx.lineTo(28, -8); ctx.lineTo(46, 16); }
    else if (ears === 'back') { ctx.moveTo(34, 22); ctx.lineTo(6, 20); ctx.lineTo(26, 34); }
    else { ctx.moveTo(30, 16); ctx.quadraticCurveTo(12, 24, 18, 56); ctx.quadraticCurveTo(30, 50, 40, 22); }
    ctx.closePath(); ctx.fill();
  }
};

OTR.DogRig = class extends OTR.BaseRig {
  constructor(scene, x, y, spec, o) {
    super(scene, x, y, Object.assign({ speed: 220 }, o));
    this.spec = spec;
    this.h = OTR.rig.hash(spec);
    this.barkT = 0;
    this.mouthFlash = 0;
    this.build();
    this.setMood(o.mood || 'friendly');
  }

  headHeight() { return 140; }

  tex(part, a, b) {
    const s = this.scene, spec = this.spec, key = `dg_${this.h}_${part}_${a || ''}_${b || ''}`;
    const D = OTR.dogArt;
    switch (part) {
      case 'body': return OTR.rig.make(s, key, 160, 80, (ctx) => D.body(ctx, spec, a));
      case 'legF': return OTR.rig.make(s, key, 24, 58, (ctx) => D.leg(ctx, spec, false));
      case 'legB': return OTR.rig.make(s, key, 24, 58, (ctx) => D.leg(ctx, spec, true));
      case 'tail': return OTR.rig.make(s, key, 60, 16, (ctx) => D.tail(ctx, spec));
      case 'head': return OTR.rig.make(s, key, 100, 92, (ctx) => D.head(ctx, spec, a, b));
      default: return null;
    }
  }

  build() {
    const s = this.scene, inv = 1 / OTR.rig.RES;
    const img = (key, ox, oy) => s.add.image(0, 0, key).setOrigin(ox, oy).setScale(inv);
    const back = 0xA9A2B6;
    this.shadow = s.add.image(0, 0, OTR.rig.shadowTex(s)).setScale(1.2, 0.9);
    this.legs = {
      bb: img(this.tex('legB'), 12 / 24, 4 / 58).setTint(back),
      fb: img(this.tex('legF'), 12 / 24, 4 / 58).setTint(back)
    };
    this.tail = img(this.tex('tail'), 2 / 60, 8 / 16);
    this.body = img(this.tex('body', false), 80 / 160, 44 / 80);
    this.legs.bf = img(this.tex('legB'), 12 / 24, 4 / 58);
    this.legs.ff = img(this.tex('legF'), 12 / 24, 4 / 58);
    this.headImg = img(this.tex('head', 'closed', 'relaxed'), 20 / 100, 64 / 92);
    this.c.add([this.shadow, this.legs.bb, this.legs.fb, this.tail, this.body, this.legs.bf, this.legs.ff, this.headImg]);
  }

  /** friendly | alert | aggressive | fearful | playful */
  setMood(m) {
    this.mood = m;
    const M = {
      friendly: { mouth: 'pant', ears: 'relaxed', hackles: false, anim: 'wag' },
      playful: { mouth: 'pant', ears: 'up', hackles: false, anim: 'play' },
      alert: { mouth: 'closed', ears: 'up', hackles: false, anim: 'alert' },
      aggressive: { mouth: 'growl', ears: 'up', hackles: true, anim: 'growl' },
      fearful: { mouth: 'closed', ears: 'back', hackles: false, anim: 'cower' }
    }[m] || { mouth: 'closed', ears: 'relaxed', hackles: false, anim: 'idle' };
    this.moodDef = M;
    this.body.setTexture(this.tex('body', M.hackles));
    this.refreshHead();
    this.play(M.anim);
    return this;
  }

  refreshHead() {
    const mouth = this.mouthFlash > 0 ? 'bark' : this.moodDef.mouth;
    this.headImg.setTexture(this.tex('head', mouth, this.moodDef.ears));
  }

  bark(n) {
    n = n || 1;
    for (let i = 0; i < n; i++) {
      this.scene.time.delayedCall(i * 380, () => {
        if (!this.c.active) return;
        this.mouthFlash = 0.18;
        this.refreshHead();
        this.jolt = 1;
        OTR.audio.play('bark');
      });
    }
    return this;
  }

  strideRate() { return (Math.PI * 2) / 90; }
  currentAnimName() { return this.moving ? (this.moveTarget && this.moveTarget.anim) || 'trot' : this.anim; }
  onArriveAnim() {}

  restPose() {
    return { bodyY: 0, pitch: 0, head: 0, headY: 0, tail: 20, legFF: 0, legFB: 0, legBF: 0, legBB: 0, rear: 0, x: 0 };
  }
  anims() { return OTR.DogRig.ANIMS; }
  onces() { return OTR.DogRig.ONCES; }

  applyPose(P, dt) {
    const R = OTR.rig;
    if (this.mouthFlash > 0) { this.mouthFlash -= dt; if (this.mouthFlash <= 0) this.refreshHead(); }
    this.jolt = Math.max(0, (this.jolt || 0) - dt * 6);
    const jx = this.jolt * 6;
    const bodyY = -60 + P.bodyY;
    const pitch = P.pitch;
    this.body.setPosition(P.x + jx, bodyY).setRotation(R.rad(pitch));
    const at = (lx, ly) => { const p = R.rot(lx, ly, pitch); return { x: P.x + jx + p.x, y: bodyY + p.y }; };
    const shoulder = at(36, 6), hipP = at(-38, 4 + P.rear);
    const setLeg = (img, base, a, dx) => img.setPosition(base.x + dx, base.y).setRotation(-R.rad(a));
    setLeg(this.legs.ff, shoulder, P.legFF, 4);
    setLeg(this.legs.fb, shoulder, P.legFB, -4);
    setLeg(this.legs.bf, hipP, P.legBF, 2);
    setLeg(this.legs.bb, hipP, P.legBB, -6);
    const neck = at(44, -14);
    this.headImg.setPosition(neck.x, neck.y + P.headY).setRotation(R.rad(pitch + P.head));
    const tb = at(-60, -12);
    this.tail.setPosition(tb.x, tb.y).setRotation(Math.PI + R.rad(P.tail + pitch));
    this.shadow.setPosition(P.x, 0);
  }
};

(function () {
  const S = Math.sin, Cc = Math.cos, abs = Math.abs;
  const trot = (p, amp) => ({ legFF: amp * S(p), legBB: amp * S(p), legFB: -amp * S(p), legBF: -amp * S(p), bodyY: -abs(Cc(p)) * 3 });
  OTR.DogRig.ANIMS = {
    idle: (t) => ({ bodyY: S(t * 3) * 0.8, tail: 15 + S(t * 2) * 5, head: S(t * 0.9) * 3 }),
    wag: (t) => ({ bodyY: S(t * 6) * 1.2, pitch: S(t * 8) * 1.5, tail: 28 + S(t * 18) * 26, head: -4 + S(t * 1.3) * 4 }),
    play: (t) => ({ bodyY: 14, pitch: -14 + S(t * 5) * 2, rear: -16, head: 8, tail: 40 + S(t * 20) * 25, legFF: 40, legFB: 34, legBF: -6, legBB: -10 }),
    alert: (t) => ({ bodyY: -3, pitch: -3, head: -8, tail: 52 + S(t * 3) * 2 }),
    growl: (t) => ({ bodyY: 8 + S(t * 30) * 0.6, pitch: 6, head: 14, headY: 6, tail: 60 + S(t * 25) * 3, legFF: -12, legFB: -8, legBF: 8, legBB: 12, x: 6 }),
    cower: (t) => ({ bodyY: 14 + S(t * 9) * 0.8, pitch: 8, head: 22, headY: 10, tail: -62, legFF: 10, legFB: 6, legBF: -14, legBB: -18, rear: 6, x: -4 }),
    trot: (t, r) => Object.assign(trot(r.phase, 26), { tail: 30 + S(r.phase * 2) * 10, head: -4 }),
    sit: (t) => ({ bodyY: 10, pitch: -26, rear: 18, legBF: 70, legBB: 66, legFF: -8, legFB: -6, tail: -10, head: -14 + S(t) * 2 }),
    sniff: (t) => ({ pitch: 10, head: 36 + S(t * 9) * 4, headY: 8, tail: 20 + S(t * 6) * 8 })
  };
  OTR.DogRig.ONCES = {
    lunge: { dur: 0.7, keys: [
      { at: 0, pose: { bodyY: 8, pitch: 6, head: 14, x: 0, tail: 60 } },
      { at: 0.35, pose: { bodyY: -6, pitch: -8, head: -6, x: 60, tail: 64, legFF: 40, legFB: 30, legBF: -30, legBB: -24 } },
      { at: 1, pose: { bodyY: 8, pitch: 6, head: 14, x: 6, tail: 60 } }
    ], events: [{ at: 0.3, fn: (r) => r.bark(1) }] },
    jumpUp: { dur: 0.9, keys: [
      { at: 0, pose: {} },
      { at: 0.4, pose: { bodyY: -26, pitch: -40, x: 20, legFF: 50, legFB: 44, head: -20, tail: 50 } },
      { at: 1, pose: {} }
    ] }
  };
})();
