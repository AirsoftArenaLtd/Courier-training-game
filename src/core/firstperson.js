/* First-person prototype state and collision rules. Metres, seconds; no renderer dependencies. */
window.OTR = window.OTR || {};
OTR.fp = {
  clamp(x, a, b) { return Math.max(a, Math.min(b, x)); },
  approach(x, to, amount) { return x < to ? Math.min(to, x + amount) : Math.max(to, x - amount); },
  local(v, x, z) {
    return { x: v.x + Math.cos(v.yaw) * x - Math.sin(v.yaw) * z,
      z: v.z + Math.sin(v.yaw) * x + Math.cos(v.yaw) * z };
  },
  circleBox(x, z, r, b) {
    const dx = x - this.clamp(x, b.x - b.w / 2, b.x + b.w / 2);
    const dz = z - this.clamp(z, b.z - b.d / 2, b.z + b.d / 2);
    return dx * dx + dz * dz < r * r;
  },
  vanBox(v, b) {
    const dx = b.x - v.x, dz = b.z - v.z, c = Math.cos(v.yaw), s = Math.sin(v.yaw);
    return Math.abs(dx) < Math.abs(c) * 1.08 + Math.abs(s) * 2.7 + b.w / 2 &&
      Math.abs(dz) < Math.abs(s) * 1.08 + Math.abs(c) * 2.7 + b.d / 2 &&
      Math.abs(dx * c + dz * s) < 1.08 + Math.abs(c) * b.w / 2 + Math.abs(s) * b.d / 2 &&
      Math.abs(-dx * s + dz * c) < 2.7 + Math.abs(s) * b.w / 2 + Math.abs(c) * b.d / 2;
  },
  driveAssist(m) {
    // Launch/resume caches A-21's approved trainer result. The standalone motor retains its original fallback.
    if (Number.isFinite(m.driveAssist)) return this.clamp(m.driveAssist, 0, 1);
    const day = m.routePlan ? m.routePlan.day : m.briefing ? m.briefing.day : 1;
    return this.clamp(1 - (day - 1) / 4, 0, 1);
  },
  applyDriveRules(m) {
    if(!m||!OTR.academy||!OTR.academy.workdayRules)return;
    const day=m.routePlan?m.routePlan.day:m.briefing?m.briefing.day:1,rules=OTR.academy.workdayRules(day);
    m.workdayRules={...rules};
    if(rules.assists==='full')m.driveAssist=1;else if(rules.assists==='light')m.driveAssist=.5;else if(rules.assists==='off')m.driveAssist=0;
  },
  payload(m) {
    if (!m.parcels) return m.package === 'loaded' ? 5 : 0;
    let kg = 0;
    for (const p of m.parcels) if (p.location.startsWith('slot')) {
      // Full-route labels use pounds; the original three-parcel lesson uses kilograms.
      kg += this.clamp((Number(p.weight) || 0) * (m.routePlan ? 0.45359237 : 1), 0, 500);
    }
    return kg;
  },
  suspension(m, dt, acceleration = 0, lateral = 0) {
    const d = m.motion || (m.motion = { acceleration:0, lateral:0, pitch:0, roll:0, payload:0, mass:2400,
      frontLoad:0, rearLoad:0, rpm:800, assist:1, contact:false });
    d.payload = this.payload(m); d.mass = 2400 + d.payload; d.assist = this.driveAssist(m);
    d.acceleration = this.clamp(acceleration, -12, 12); d.lateral = lateral;
    const cg = 0.8 + Math.min(0.2, d.payload / 1500), transfer = this.clamp(d.acceleration * cg / (9.81 * 3.3), -0.3, 0.3);
    d.frontLoad = d.mass * 9.81 * (0.5 - transfer); d.rearLoad = d.mass * 9.81 * (0.5 + transfer);
    const blend = 1 - Math.exp(-dt * 7);
    d.pitch += (this.clamp(d.acceleration * 0.006, -0.035, 0.025) - d.pitch) * blend;
    d.roll += (this.clamp(lateral * 0.005 * (1 + d.payload / 2400), -0.025, 0.025) - d.roll) * blend;
    d.rpm = 800 + Math.min(2600, Math.abs(m.van.speed) * 190);
    return d;
  },
  drive(m, input, dt) {
    if (!(dt > 0)) return;
    const v = m.van, speed = v.speed, assist = this.driveAssist(m), mass = 2400 + this.payload(m);
    const grip = this.clamp(Number(m.traction) || 1, 0.2, 1), abs = Math.abs(speed);
    if (v.hand || v.gear === 2 || input.back) {
      const braking = v.hand ? 19200 : 13500 + assist * 1000;
      v.speed = this.approach(speed, 0, braking / mass * grip * dt);
    } else if (input.forward && v.gear !== 0) {
      const force = v.gear * 6200 / (1 + abs * abs * 0.016), drag = Math.sign(speed) * (500 + 8 * abs * abs);
      v.speed = this.clamp(speed + (force - drag) / mass * dt, -(1.7 + (1 - assist) * 0.4), 12 - assist * 4);
    } else if (v.gear < 0) {
      v.speed = this.approach(speed, -(0.45 - assist * 0.1), 0.6 * 2400 / mass * dt);
    } else {
      v.speed = this.approach(speed, 0, (500 + 8 * abs * abs) / mass * dt);
    }
    const oldSteer = v.steer;
    const limit = Math.min(0.58 / (1 + (mass - 2400) / 4000), Math.atan((4.8 - assist) * grip * 3.3 / Math.max(1, abs * abs)));
    const target = (Number(!!input.right) - Number(!!input.left)) * limit;
    v.steer = this.approach(v.steer, target, (target ? 1.05 + assist * 0.35 : 1.5 + assist) * dt);
    const distance = (speed + v.speed) * 0.5 * dt, turn = distance * Math.tan((oldSteer + v.steer) * 0.5) / 3.3;
    const yaw = v.yaw + turn, mid = v.yaw + turn * 0.5, rear = 1.7;
    // The stored position stays the body centre. Integrate the rear axle, then recover the body centre.
    const next = m._motorPose || (m._motorPose = { x:0, z:0, yaw:0 });
    next.x = v.x + Math.sin(mid) * distance + (Math.sin(yaw) - Math.sin(v.yaw)) * rear;
    next.z = v.z - Math.cos(mid) * distance - (Math.cos(yaw) - Math.cos(v.yaw)) * rear;
    next.yaw = Math.atan2(Math.sin(yaw), Math.cos(yaw));
    const b = m.bounds, c = Math.cos(yaw), s = Math.sin(yaw); let outside = false;
    for (let i = -1; i <= 1; i += 2) for (let j = -1; j <= 1; j += 2) {
      const x = next.x + c * i * 1.08 - s * j * 2.7, z = next.z + s * i * 1.08 + c * j * 2.7;
      if (x < b.x0 || x > b.x1 || z < b.z0 || z > b.z1) outside = true;
    }
    let contact = outside || !!(m.driveAllowed && !m.driveAllowed(next));
    if (!contact) for (const solid of m.solids) if (this.vanBox(next, solid)) { contact = true; break; }
    if (contact) v.speed = 0;
    else { v.x = next.x; v.z = next.z; v.yaw = next.yaw; }
    const d = this.suspension(m, dt, (v.speed - speed) / dt, contact ? 0 : turn / dt * (speed + v.speed) * 0.5);
    d.contact = contact; d.rpm += input.forward && !input.back && !v.hand && (v.gear===1||v.gear===-1) ? 400 : 0;
  },
  create() {
    const F = this;
    const m = {
      mode: 'walk', paused: true, complete: false, scanned: false, package: 'table', everLoaded: false,
      player: { x: -5, z: 3.5, yaw: -0.65, pitch: 0 },
      van: { x: 0, z: 3, yaw: 0, speed: 0, steer: 0, gear: 1, hand: true, belt: false, look: 0 },
      bounds: { x0: -14, x1: 14, z0: -48, z1: 12 },
      solids: [
        { x: -12, z: 3, w: 0.3, d: 14, h: 3.6 },
        { x: -7, z: 10, w: 10, d: 0.3, h: 3.6 },
        { x: -7, z: -4, w: 10, d: 0.3, h: 3.6 },
        { x: -2, z: 7.5, w: 0.3, d: 5, h: 3.6 },
        { x: -2, z: -2.5, w: 0.3, d: 3, h: 3.6 },
        { x: -8, z: 0, w: 2, d: 1, h: 0.9 },
        { x: 9.5, z: -35, w: 7, d: 7, h: 4 }
      ],
      point(id) {
        if (id === 'package') return { x: -8, y: 1.15, z: 0 };
        if (id === 'driver') return Object.assign({ y: 1.5 }, F.local(this.van, -1.15, -1.65));
        if (id === 'cargo') return Object.assign({ y: 1.3 }, F.local(this.van, 0, 2.8));
        return { x: 5.95, y: 1.4, z: -35 };
      },
      blocked(x, z, radius) {
        const b = this.bounds, r = radius || 0.32;
        if (x - r < b.x0 || x + r > b.x1 || z - r < b.z0 || z + r > b.z1) return true;
        if (this.solids.some(o => F.circleBox(x, z, r, o))) return true;
        const v = this.van, dx = x - v.x, dz = z - v.z, c = Math.cos(v.yaw), s = Math.sin(v.yaw);
        return F.circleBox(dx * c + dz * s, -dx * s + dz * c, r, { x: 0, z: 0, w: 2.16, d: 5.4 });
      },
      parkedAtDelivery() {
        const v = this.van;
        return Math.abs(v.x - 3.1) < 1.15 && Math.abs(v.z + 35) < 3 &&
          Math.cos(v.yaw) > 0.85 && Math.abs(v.speed) < 0.15 && v.hand;
      },
      near(id) {
        const p = this.point(id);
        return Math.hypot(p.x - this.player.x, p.z - this.player.z) < 3;
      },
      inspect(id) {
        if (this.mode !== 'walk' || (this.package !== 'held' && !(id === 'package' && this.package === 'table' && this.near(id)))) return false;
        this.mode = 'inspect'; this.inspectYaw = 0; return true;
      },
      use(id) {
        if (this.mode === 'inspect') {
          if (Math.cos(this.inspectYaw) < 0.8) return false;
          this.scanned = true; return true;
        }
        if (this.mode === 'cab') return this.exit();
        if (this.mode !== 'walk' || !this.near(id)) return false;
        if (id === 'package' && this.package === 'table') {
          if (!this.scanned) return this.inspect(id);
          this.package = 'held'; return true;
        }
        if (id === 'cargo' && Math.abs(this.van.speed) < 0.15 && this.van.hand) {
          if (this.package === 'held' && this.scanned) { this.package = 'loaded'; this.everLoaded = true; return true; }
          if (this.package === 'loaded') { this.package = 'held'; return true; }
        }
        if (id === 'driver' && this.package !== 'held') {
          this.mode = 'cab'; this.van.look = 0; this.player.pitch = 0; return true;
        }
        if (id === 'customer' && this.package === 'held' && this.everLoaded && this.parkedAtDelivery()) {
          this.package = 'delivered'; this.complete = true; return true;
        }
        return false;
      },
      exit() {
        if (Math.abs(this.van.speed) >= 0.15 || !this.van.hand) return false;
        for (const x of [-1.8, 1.8]) {
          const p = F.local(this.van, x, -1.65);
          if (!this.blocked(p.x, p.z)) {
            Object.assign(this.player, p, { yaw: this.van.yaw, pitch: 0 });
            this.mode = 'walk'; return true;
          }
        }
        return false;
      },
      shiftGear() {
        return this.selectGear(this.van.gear===1?-1:1);
      },
      selectGear(gear) {
        if(this.mode!=='cab'||![2,-1,0,1].includes(gear))return false;
        const v=this.van;if(v.gear===gear)return true;
        if(Math.abs(v.speed)>=.15){
          if(v.gear*gear===-1&&Math.abs(v.speed)*2.23694>2&&OTR.fpCab)OTR.fpCab.gearReport(this,false);
          return false;
        }
        v.gear=gear;v.speed=0;if(OTR.fpCab)OTR.fpCab.gearReport(this,true);if(this.touch)this.touch();return true;
      },
      objective() {
        if (this.complete) return 'Delivery complete — press N to restart';
        if (!this.scanned) return 'Inspect and scan the package on the table';
        if (this.package === 'table') return 'Pick up the scanned package';
        if (this.package === 'held') return this.everLoaded && this.parkedAtDelivery() ? 'Take the package to the front door' : 'Load the package through the rear of the van';
        return this.parkedAtDelivery() ? 'Exit and retrieve the package from the rear' : 'Drive to the orange delivery bay and park';
      },
      step(input, seconds) {
        if (this.paused) return;
        const dt = F.clamp(seconds, 0, 0.05), n = Math.max(1, Math.ceil(dt / 0.0125));
        for (let i = 0; i < n; i++) this.tick(input, dt / n);
      },
      tick(input, dt) {
        if (this.mode === 'inspect') {
          this.inspectYaw += (input.right - input.left) * dt * 1.8; return;
        }
        if (this.mode === 'walk') {
          if (this.motion) F.suspension(this, dt);
          let f = input.forward - input.back, r = input.right - input.left;
          const length = Math.hypot(f, r);
          if (length > 1) { f /= length; r /= length; }
          const p = this.player, speed = input.careful ? 1 : 2.5;
          const dx = (Math.sin(p.yaw) * f + Math.cos(p.yaw) * r) * speed * dt;
          const dz = (-Math.cos(p.yaw) * f + Math.sin(p.yaw) * r) * speed * dt;
          if (!this.blocked(p.x + dx, p.z)) p.x += dx;
          if (!this.blocked(p.x, p.z + dz)) p.z += dz;
          return;
        }
        F.drive(this, input, dt);
      }
    };
    return m;
  }
};
