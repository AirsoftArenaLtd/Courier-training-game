/* Deterministic traffic controls. Distances are metres; speeds are metres per second. */
window.OTR = window.OTR || {};
OTR.fpTraffic = {
  cycle: 54,
  phases: Object.freeze([
    Object.freeze({ end: 16, ns: 'green', ew: 'red', walk: false }),
    Object.freeze({ end: 19, ns: 'amber', ew: 'red', walk: false }),
    Object.freeze({ end: 21, ns: 'red', ew: 'red', walk: false }),
    Object.freeze({ end: 37, ns: 'red', ew: 'green', walk: false }),
    Object.freeze({ end: 40, ns: 'red', ew: 'amber', walk: false }),
    Object.freeze({ end: 42, ns: 'red', ew: 'red', walk: false }),
    Object.freeze({ end: 52, ns: 'red', ew: 'red', walk: true }),
    Object.freeze({ end: 54, ns: 'red', ew: 'red', walk: false })
  ]),
  signal(elapsed, offset = 0) {
    // No hidden timer: loading the same simulation time restores exactly the same signal.
    if (!Number.isFinite(elapsed) || elapsed < 0 || !Number.isFinite(offset)) return this.phases[7];
    const t = ((elapsed % this.cycle + offset % this.cycle) % this.cycle + this.cycle) % this.cycle;
    for (const phase of this.phases) if (t < phase.end) return phase;
    return this.phases[7];
  },
  aspect(phase, yaw) {
    if (!phase || !Number.isFinite(yaw)) return 'red';
    return Math.abs(Math.cos(yaw)) >= Math.abs(Math.sin(yaw)) ? phase.ns : phase.ew;
  },
  mayCross(phase, clear) {
    // A walk phase does not let a new pedestrian enter an already occupied crossing.
    return !!(phase && phase.walk && phase.ns === 'red' && phase.ew === 'red' && clear === true);
  },
  stoppingSpeed(distance, limit, braking = 2.5, clearance = 1.5) {
    if (!Number.isFinite(distance) || !Number.isFinite(limit) || limit < 0 ||
      !Number.isFinite(braking) || braking <= 0 || !Number.isFinite(clearance) || clearance < 0) return 0;
    return Math.min(limit, Math.sqrt(2 * braking * Math.max(0, distance - clearance)));
  },
  clearance(actor, other) {
    if (!Number.isFinite(actor.x) || !Number.isFinite(actor.z) || !Number.isFinite(actor.yaw) ||
      !Number.isFinite(other.x) || !Number.isFinite(other.z)) return 0;
    const yaw = Number.isFinite(other.yaw) ? other.yaw : 0;
    const width = other.w === undefined ? 1.8 : other.w, length = other.d === undefined ? 4.5 : other.d;
    const ownWidth = actor.w === undefined ? 1.8 : actor.w, ownLength = actor.d === undefined ? 4.5 : actor.d;
    if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(length) || length <= 0 ||
      !Number.isFinite(ownWidth) || ownWidth <= 0 || !Number.isFinite(ownLength) || ownLength <= 0) return 0;
    const dx = other.x - actor.x, dz = other.z - actor.z, sin = Math.sin(actor.yaw), cos = Math.cos(actor.yaw);
    const along = dx * sin - dz * cos, across = dx * cos + dz * sin;
    const angle = actor.yaw - yaw;
    const halfAlong = (Math.abs(Math.sin(angle)) * width + Math.abs(Math.cos(angle)) * length) / 2;
    const halfAcross = (Math.abs(Math.cos(angle)) * width + Math.abs(Math.sin(angle)) * length) / 2;
    if (along + halfAlong < -ownLength / 2 || Math.abs(across) > ownWidth / 2 + halfAcross + .25) return Infinity;
    return Math.max(0, along - halfAlong - ownLength / 2);
  },
  targetSpeed(actor, others, limit) {
    if (!Number.isFinite(limit) || limit < 0) return 0;
    let target = limit;
    for (const other of others) {
      if (other === actor) continue;
      const gap = this.clearance(actor, other);
      if (gap === Infinity) continue;
      // Keep the same three-second minimum taught by the workday's following check.
      target = Math.min(target, Math.max(0, gap - 1.5) / 3, this.stoppingSpeed(gap, limit));
    }
    return target;
  },
  speed(current, target, seconds) {
    if (!Number.isFinite(current) || !Number.isFinite(target) || !Number.isFinite(seconds) || seconds < 0) return 0;
    current = Math.max(0, current); target = Math.max(0, target);
    return current < target ? Math.min(target, current + 1.1 * seconds) : Math.max(target, current - 2.8 * seconds);
  }
};
