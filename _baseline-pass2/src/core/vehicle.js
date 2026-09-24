/*
 * Vehicle dynamics for the town drive (TownDriveScene and the Road Hazards drill).
 *
 * A planar two-axle ("bicycle") model: the van's velocity is free to point somewhere other than where the van
 * is facing, each axle makes a tyre force from its slip angle through a saturating grip curve shared with the
 * braking and driving force (the friction circle), weight moves forward under braking and back under power,
 * and the body has yaw inertia, so it settles into a turn rather than snapping to it. At walking pace, where
 * slip angles mean nothing, it blends into plain rolling kinematics so parking stays precise.
 *
 *   const v = OTR.vehicle.create(x, y, heading)     x/y in world pixels, heading in radians (0 = east)
 *   const ev = OTR.vehicle.step(v, input, dt, world)  input { throttle, brake, steer: -1|0|1, hand }
 *   const hits = OTR.vehicle.collide(v, boxes, others)
 *
 *   world  { mu(x, y) → peak tyre grip at a point, rolling(x, y) → extra rolling resistance there }
 *   boxes  axis-aligned rectangles { x, y, w, h } in pixels (buildings, the map edge, parked hazards)
 *   others moving bodies { x, y, heading, hl, hw (px), vel {x, y} (m/s), mass, ref }
 *
 * Tuning is in data/vehicle.js. Inside, everything is metres and seconds; the state keeps x/y in pixels
 * because every scene draws in pixels, and `v.speed` mirrors the forward speed in px/s for the same reason.
 */
window.OTR = window.OTR || {};

OTR.vehicle = {
  G: 9.81,
  MPH: 2.23694,           // m/s → mph
  STEP: 1 / 240,          // physics substep, so the handling is the same at 30 Hz and 240 Hz

  get T() { return OTR_DATA.vehicle; },
  get P() { return OTR_DATA.vehicle.pxPerMetre; },

  /** Geometry from the spec, in metres. `centre` is how far the body's middle sits ahead of the CG. */
  geom() {
    const S = this.T.van;
    const a = S.cgToFront, b = S.wheelbase - a;
    const nose = S.frontOverhang + a;
    return { a, b, L: S.wheelbase, nose, tail: S.length - nose, centre: nose - S.length / 2, hl: S.length / 2, hw: S.width / 2 };
  },

  create(x, y, heading) {
    return {
      x, y, heading: heading || 0,
      u: 0, lat: 0, r: 0,             // forward and rightward velocity (m/s, van frame) and yaw rate (rad/s)
      sw: 0, delta: 0,                // steering wheel (-1..1 of full lock) and the road-wheel angle it gives
      throttle: 0, brake: 0,          // pedal positions 0..1
      gear: 1, shiftHold: 0, canShift: false, heldStill: 0,
      ax: 0,                          // smoothed longitudinal acceleration (the van pitching), for weight transfer
      slide: 0, spin: false, locked: false,
      speed: 0,                       // forward speed in px/s, signed
      g: this.geom()
    };
  },

  approach(x, target, maxStep) {
    return x < target ? Math.min(target, x + maxStep) : Math.max(target, x - maxStep);
  },

  mph(v) { return Math.abs(v.u) * this.MPH; },
  /** Speed over the ground, including any sideways slide (m/s). */
  groundSpeed(v) { return Math.hypot(v.u, v.lat); },
  stopped(v) { return Math.abs(v.u) < 0.25 && Math.abs(v.lat) < 0.3; },
  fwd(v) { return { x: Math.cos(v.heading), y: Math.sin(v.heading) }; },
  right(v) { return { x: -Math.sin(v.heading), y: Math.cos(v.heading) }; },
  /** Velocity over the ground in world axes (m/s). */
  velocity(v) {
    const c = Math.cos(v.heading), s = Math.sin(v.heading);
    return { x: v.u * c - v.lat * s, y: v.u * s + v.lat * c };
  },
  /** A point on the van, given in metres ahead of the centre of gravity and metres to the right, in world px. */
  point(v, fwdM, rightM) {
    const P = this.P, c = Math.cos(v.heading), s = Math.sin(v.heading);
    return { x: v.x + (c * fwdM - s * (rightM || 0)) * P, y: v.y + (s * fwdM + c * (rightM || 0)) * P };
  },
  /** Middle of the body, where the sprite is drawn. */
  bodyCentre(v) { return this.point(v, v.g.centre, 0); },

  /* ------------------------------------------------------------------ gearbox */
  /**
   * Automatic box, Drive and Reverse. Changing direction works the way it does in the cab: stop, lift your
   * foot, then press and hold the pedal for the new direction (S for reverse, W to go back to drive). Sitting
   * on the brake at a junction therefore never selects reverse by itself.
   */
  gearbox(v, inp, dt) {
    const stopped = this.stopped(v);
    const other = v.gear > 0 ? inp.brake : inp.throttle;   // the pedal that would change direction
    const mine = v.gear > 0 ? inp.throttle : inp.brake;
    v.heldStill = stopped && other ? v.heldStill + dt : 0;
    if (!stopped || mine) v.canShift = false;          // moving, or asking to go the current way: no change
    else if (!other) v.canShift = true;
    if (stopped && other && !mine && v.canShift) {
      v.shiftHold += dt;
      if (v.shiftHold >= 0.3) {
        v.gear = -v.gear;
        v.shiftHold = 0; v.canShift = false; v.heldStill = 0;
        v.u = 0; v.lat = 0; v.r = 0;
        return true;
      }
    } else v.shiftHold = 0;
    return false;
  },

  /** A line for the HUD about changing direction, or null. */
  gearPrompt(v) {
    if (v.shiftHold > 0) return v.gear > 0 ? 'Selecting R…' : 'Selecting D…';
    if (v.heldStill > 0.9 && !v.canShift) return v.gear > 0 ? 'Lift off S, then hold S to reverse' : 'Lift off W, then hold W for drive';
    return null;
  },

  /* ------------------------------------------------------------------ one frame */
  step(v, inp, dt, world) {
    const S = this.T.van, U = OTR.util;
    const ev = { shifted: this.gearbox(v, inp, dt) };

    // The keys are on/off; the pedals travel. In reverse, S drives and W brakes.
    const driveKey = v.gear > 0 ? inp.throttle : inp.brake;
    const brakeKey = v.gear > 0 ? inp.brake : inp.throttle;
    const wantT = driveKey && !brakeKey && v.shiftHold === 0 ? 1 : 0;
    const wantB = brakeKey ? 1 : 0;
    v.throttle = this.approach(v.throttle, wantT, (wantT > v.throttle ? S.pedalApply : S.pedalRelease) * dt);
    v.brake = this.approach(v.brake, wantB, (wantB > v.brake ? S.pedalApply * 1.4 : S.pedalRelease) * dt);

    // The keys turn a steering wheel at the pace of a driver's hands; let go and it self-centres as you roll.
    const mph = this.mph(v);
    if (inp.steer) {
      let rate = U.lerp(S.steerRate, S.steerRateAtSpeed, U.clamp01(mph / 30));
      if (v.sw * inp.steer < 0) rate = Math.max(rate, S.counterRate);
      v.sw = this.approach(v.sw, inp.steer, rate * dt);
    } else {
      v.sw = this.approach(v.sw, 0, S.centreRate * U.clamp(Math.abs(v.u) / 4, 0.12, 1) * dt);
    }
    const want = v.sw * S.maxSteer * Math.PI / 180;
    v.delta += (want - v.delta) * (1 - Math.exp(-dt / 0.05));

    const n = Math.max(1, Math.ceil(dt / this.STEP - 1e-6));
    const h = dt / n;
    for (let i = 0; i < n; i++) this.integrate(v, inp, h, world);
    v.heading = Math.atan2(Math.sin(v.heading), Math.cos(v.heading));
    v.speed = v.u * this.P;
    return ev;
  },

  /** Pacejka-style lateral force: slope `stiff` at zero slip, peak `peak`, easing off past it. */
  tyre(alpha, stiff, peak) {
    if (peak <= 1) return 0;
    const C = this.T.van.tyreShape;
    const B = stiff / (C * peak);
    return peak * Math.sin(C * Math.atan(B * alpha));
  },

  integrate(v, inp, h, world) {
    const S = this.T.van, P = this.P, G = this.G, U = OTR.util;
    const { a, b, L } = v.g;
    const m = S.mass, Iz = S.yawInertia * m * a * b;
    const c = Math.cos(v.heading), s = Math.sin(v.heading);

    // grip and rolling drag under each axle
    const fx = v.x + c * a * P, fy = v.y + s * a * P;
    const rx = v.x - c * b * P, ry = v.y - s * b * P;
    const muF = world ? world.mu(fx, fy) : 0.85, muR = world ? world.mu(rx, ry) : 0.85;
    const rollF = S.rolling + (world && world.rolling ? world.rolling(fx, fy) : 0);
    const rollR = S.rolling + (world && world.rolling ? world.rolling(rx, ry) : 0);

    // axle loads: braking throws weight onto the front tyres, power onto the rear
    const pitch = m * v.ax * S.cgHeight / L;
    const Fzf = Math.max(0.2 * m * G * b / L, m * G * b / L - pitch);
    const Fzr = Math.max(0.2 * m * G * a / L, m * G * a / L + pitch);
    const limF = muF * Fzf, limR = muR * Fzr;

    // what each tyre is doing, in its own frame
    const cd = Math.cos(v.delta), sd = Math.sin(v.delta);
    const vfy = v.lat + a * v.r;
    const ufw = v.u * cd + vfy * sd, vfw = -v.u * sd + vfy * cd;
    const urw = v.u, vrw = v.lat - b * v.r;
    const sgn = (x) => U.clamp(x / 0.12, -1, 1);   // brakes and rolling drag fade out at rest instead of chattering

    // engine and transmission: full throttle, or idle creep / engine braking, blended by the pedal
    const dir = v.gear;
    const along = v.u * dir;
    const gov = (dir > 0 ? S.governor : S.reverseGovernor) / this.MPH;
    const full = Math.min(dir > 0 ? S.driveForce : S.reverseForce, S.drivePower / Math.max(along, 0.5)) * U.clamp01((gov - along) / 0.5);
    const idle = along < S.creepSpeed
      ? S.creepForce * U.clamp01((S.creepSpeed - along) / S.creepSpeed)
      : -S.engineBrake * U.clamp01((along - S.creepSpeed) / 2);
    const drive = dir * (v.throttle * full + (1 - v.throttle) * idle);

    // longitudinal tyre forces. ABS holds the service brakes just short of lock; the driven wheels can spin.
    const brakeF = v.brake * S.brakeDecel * m;
    let FxF = -brakeF * S.brakeFront * sgn(ufw) - rollF * Fzf * sgn(ufw);
    let FxR = drive - brakeF * (1 - S.brakeFront) * sgn(urw) - rollR * Fzr * sgn(urw);
    FxF = U.clamp(FxF, -0.95 * limF, 0.95 * limF);
    v.spin = Math.abs(FxR) > limR && v.throttle > 0.5;
    FxR = U.clamp(FxR, -limR, limR);

    // lateral tyre forces from slip angle, limited by whatever grip braking or driving has left
    const aF = Math.atan2(vfw, Math.abs(ufw) + 0.05);
    const aR = Math.atan2(vrw, Math.abs(urw) + 0.05);
    const FyF = -this.tyre(aF, S.cornerFront * Fzf, Math.sqrt(Math.max(0, limF * limF - FxF * FxF)));
    let FyR = -this.tyre(aR, S.cornerRear * Fzr, Math.sqrt(Math.max(0, limR * limR - FxR * FxR)));

    // the parking brake locks the rear wheels: they just slide, against however the axle is moving
    const rearSlip = Math.hypot(urw, vrw);
    v.locked = !!inp.hand && rearSlip > 0.4;
    if (inp.hand) {
      const k = S.handbrake * limR * U.clamp01(rearSlip / 0.12);
      FxR = rearSlip > 1e-4 ? -k * urw / rearSlip : 0;
      FyR = rearSlip > 1e-4 ? -k * vrw / rearSlip : 0;
    }

    // how far past the peak of the grip curve either axle is (1 = at the limit)
    const peakAt = Math.tan(Math.PI / (2 * S.tyreShape));
    const bF = S.cornerFront * Fzf / (S.tyreShape * Math.max(1, limF)), bR = S.cornerRear * Fzr / (S.tyreShape * Math.max(1, limR));
    v.slideF = Math.abs(bF * aF) / peakAt;
    v.slideR = v.locked ? 2 : Math.abs(bR * aR) / peakAt;
    v.slide = Math.max(v.slideF, v.slideR);

    const drag = 0.6 * S.dragArea * v.u * Math.abs(v.u);
    const Fx = FxF * cd - FyF * sd + FxR - drag;
    const Fy = FxF * sd + FyF * cd + FyR;
    const Mz = a * (FxF * sd + FyF * cd) - b * FyR;

    v.u += (Fx / m + v.lat * v.r) * h;
    v.lat += (Fy / m - v.u * v.r) * h;
    v.r += (Mz / Iz) * h;
    v.ax += (Fx / m - v.ax) * (1 - Math.exp(-h / 0.12));

    // walking pace: slip angles are meaningless, so ease into rolling without slip
    const sp = Math.hypot(v.u, v.lat);
    const w = U.clamp01((sp - 0.5) / 2.5);
    if (w < 1) {
      const rK = v.u * Math.tan(v.delta) / L;
      const k = (1 - w) * Math.min(1, h * 40);
      v.r += (rK - v.r) * k;
      v.lat += (rK * b - v.lat) * k;
    }

    // held on the brake at a standstill
    if ((v.brake > 0.2 || inp.hand) && Math.abs(v.u) < 0.06 && Math.abs(v.lat) < 0.06) { v.u = 0; v.lat = 0; v.r = 0; }

    v.x += (v.u * c - v.lat * s) * h * P;
    v.y += (v.u * s + v.lat * c) * h * P;
    v.heading += v.r * h;
  },

  /* ------------------------------------------------------------------ collisions */
  /** An oriented box as { c, f, rt, hl, hw } (pixels). */
  obbOf(v) {
    const P = this.P;
    return { c: this.bodyCentre(v), f: this.fwd(v), rt: this.right(v), hl: v.g.hl * P, hw: v.g.hw * P };
  },
  boxAsObb(b) {
    return { c: { x: b.x + b.w / 2, y: b.y + b.h / 2 }, f: { x: 1, y: 0 }, rt: { x: 0, y: 1 }, hl: b.w / 2, hw: b.h / 2 };
  },
  corners(o) {
    const out = [];
    [[1, 1], [1, -1], [-1, -1], [-1, 1]].forEach(([i, j]) => out.push({
      x: o.c.x + o.f.x * o.hl * i + o.rt.x * o.hw * j,
      y: o.c.y + o.f.y * o.hl * i + o.rt.y * o.hw * j
    }));
    return out;
  },
  /** The point (or the middle of the edge) of `pts` furthest along `dir`. */
  support(pts, dx, dy) {
    let best = -Infinity;
    pts.forEach(p => { best = Math.max(best, p.x * dx + p.y * dy); });
    const hits = pts.filter(p => p.x * dx + p.y * dy > best - 0.75);
    return { x: hits.reduce((n, p) => n + p.x, 0) / hits.length, y: hits.reduce((n, p) => n + p.y, 0) / hits.length };
  },

  /**
   * Separating-axis test between the van (A) and another box (B). Returns the push that takes the van out,
   * { nx, ny (from B towards the van), depth (px), point (contact, px) }, or null when they do not touch.
   */
  sat(A, B) {
    const dx = B.c.x - A.c.x, dy = B.c.y - A.c.y;
    const axes = [[A.f, 'A'], [A.rt, 'A'], [B.f, 'B'], [B.rt, 'B']];
    let best = null;
    for (let i = 0; i < 4; i++) {
      const n = axes[i][0];
      const ra = A.hl * Math.abs(A.f.x * n.x + A.f.y * n.y) + A.hw * Math.abs(A.rt.x * n.x + A.rt.y * n.y);
      const rb = B.hl * Math.abs(B.f.x * n.x + B.f.y * n.y) + B.hw * Math.abs(B.rt.x * n.x + B.rt.y * n.y);
      const dist = dx * n.x + dy * n.y;
      const o = ra + rb - Math.abs(dist);
      if (o <= 0) return null;
      if (!best || o < best.depth) best = { depth: o, nx: dist > 0 ? -n.x : n.x, ny: dist > 0 ? -n.y : n.y, owner: axes[i][1] };
    }
    // On one of B's faces, a corner of the van is what went in; on one of the van's faces, a corner of B did.
    best.point = best.owner === 'B'
      ? this.support(this.corners(A), -best.nx, -best.ny)
      : this.support(this.corners(B), best.nx, best.ny);
    return best;
  },

  /** Push the van out of the contact and apply the impulse. Returns the closing speed (m/s) it absorbed. */
  resolve(v, hit, other) {
    const S = this.T.van, I = this.T.impact, P = this.P;
    const m = S.mass, Iz = S.yawInertia * m * v.g.a * v.g.b;
    const share = other ? other.mass / (other.mass + m) : 1;
    v.x += hit.nx * (hit.depth + 0.15) * share;
    v.y += hit.ny * (hit.depth + 0.15) * share;
    if (other) { other.x -= hit.nx * hit.depth * (1 - share); other.y -= hit.ny * hit.depth * (1 - share); }

    const rx = (hit.point.x - v.x) / P, ry = (hit.point.y - v.y) / P;
    const V = this.velocity(v);
    const ov = other ? other.vel : { x: 0, y: 0 };
    const relx = V.x - v.r * ry - ov.x, rely = V.y + v.r * rx - ov.y;
    const vn = relx * hit.nx + rely * hit.ny;
    if (vn >= 0) return 0;                                   // already moving apart
    const invM = 1 / m, invI = 1 / Iz, invO = other ? 1 / other.mass : 0;
    const rn = rx * hit.ny - ry * hit.nx;
    const j = -(1 + I.restitution) * vn / (invM + rn * rn * invI + invO);
    const tx = -hit.ny, ty = hit.nx;
    const rt = rx * ty - ry * tx;
    const jt = OTR.util.clamp(-(relx * tx + rely * ty) / (invM + rt * rt * invI + invO), -I.scrape * j, I.scrape * j);
    const Jx = hit.nx * j + tx * jt, Jy = hit.ny * j + ty * jt;
    V.x += Jx * invM; V.y += Jy * invM;
    v.r += (rx * Jy - ry * Jx) * invI;
    const f = this.fwd(v), R = this.right(v);
    v.u = V.x * f.x + V.y * f.y;
    v.lat = V.x * R.x + V.y * R.y;
    v.speed = v.u * P;
    if (other) { other.vel.x -= Jx * invO; other.vel.y -= Jy * invO; }
    return -vn;
  },

  /**
   * Resolve the van against static boxes and moving bodies. A few passes, so a corner wedged between two
   * buildings comes out cleanly. Returns the impacts: [{ kind: 'box' | 'body', speed (m/s), x, y, ref }].
   */
  collide(v, boxes, others) {
    const out = [];
    const reach = (v.g.hl + 1) * this.P;
    for (let pass = 0; pass < 3; pass++) {
      let touched = false;
      const A = this.obbOf(v);
      (boxes || []).forEach(b => {
        if (A.c.x + reach < b.x || A.c.x - reach > b.x + b.w || A.c.y + reach < b.y || A.c.y - reach > b.y + b.h) return;
        const hit = this.sat(this.obbOf(v), this.boxAsObb(b));
        if (!hit) return;
        touched = true;
        const sp = this.resolve(v, hit, null);
        if (pass === 0 && sp > 0) out.push({ kind: 'box', speed: sp, x: hit.point.x, y: hit.point.y, ref: b });
      });
      (others || []).forEach(o => {
        if (Math.abs(o.x - A.c.x) > reach + o.hl || Math.abs(o.y - A.c.y) > reach + o.hl) return;
        const B = { c: { x: o.x, y: o.y }, f: { x: Math.cos(o.heading), y: Math.sin(o.heading) }, rt: { x: -Math.sin(o.heading), y: Math.cos(o.heading) }, hl: o.hl, hw: o.hw };
        const hit = this.sat(this.obbOf(v), B);
        if (!hit) return;
        touched = true;
        const sp = this.resolve(v, hit, o);
        if (pass === 0 && sp > 0) out.push({ kind: 'body', speed: sp, x: hit.point.x, y: hit.point.y, ref: o.ref });
      });
      if (!touched) break;
    }
    return out;
  }
};
