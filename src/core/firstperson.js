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
        if (this.mode !== 'cab' || Math.abs(this.van.speed) >= 0.15) return false;
        this.van.gear *= -1; this.van.speed = 0; return true;
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
          let f = input.forward - input.back, r = input.right - input.left;
          const length = Math.hypot(f, r);
          if (length > 1) { f /= length; r /= length; }
          const p = this.player, speed = 2.5;
          const dx = (Math.sin(p.yaw) * f + Math.cos(p.yaw) * r) * speed * dt;
          const dz = (-Math.cos(p.yaw) * f + Math.sin(p.yaw) * r) * speed * dt;
          if (!this.blocked(p.x + dx, p.z)) p.x += dx;
          if (!this.blocked(p.x, p.z + dz)) p.z += dz;
          return;
        }
        const v = this.van;
        if (v.hand || input.back) v.speed = F.approach(v.speed, 0, (v.hand ? 8 : 5) * dt);
        else if (input.forward) v.speed = F.clamp(v.speed + v.gear * 2.4 * dt, -2.5, 8);
        else v.speed = F.approach(v.speed, 0, 0.7 * dt);
        const angle = (input.right - input.left) * (0.48 - 0.15 * Math.min(1, Math.abs(v.speed) / 8));
        v.steer += (angle - v.steer) * (1 - Math.exp(-dt * 9));
        const next = Object.assign({}, v);
        next.yaw += v.speed * Math.tan(v.steer) / 3.2 * dt;
        next.x += Math.sin(next.yaw) * v.speed * dt;
        next.z -= Math.cos(next.yaw) * v.speed * dt;
        const b = this.bounds;
        const outside = [F.local(next, -1.08, -2.7), F.local(next, 1.08, -2.7), F.local(next, -1.08, 2.7), F.local(next, 1.08, 2.7)]
          .some(p => p.x < b.x0 || p.x > b.x1 || p.z < b.z0 || p.z > b.z1);
        if (outside || this.solids.some(o => F.vanBox(next, o))) { v.speed = 0; return; }
        v.x = next.x; v.z = next.z; v.yaw = Math.atan2(Math.sin(next.yaw), Math.cos(next.yaw));
      }
    };
    return m;
  }
};
