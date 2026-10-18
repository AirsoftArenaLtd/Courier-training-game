/* Deterministic traffic controls. Distances are metres; speeds are metres per second. */
window.OTR = window.OTR || {};
OTR.fpTraffic = {
  prepare(plan) { const out = OTR.fpMission.clone(plan); out.traffic = 1; return out; },
  enabled(m) { return !!(m && m.kind === 'campaign' && m.town && m.routePlan && m.routePlan.traffic === 1); },
  layout(m) {
    if (!this.layouts) this.layouts = new WeakMap();
    let layout = this.layouts.get(m); if (layout) return layout;
    const advanced = m.routePlan.day >= 3, lights = OTR_DATA.town.lights;
    layout = m.junctions.map((j, index) => {
      const row = Math.floor(index / m.town.zs.length), col = index % m.town.zs.length;
      return { ...j, index, id: `signal:${row}:${col}`, offset: (row + col) % 2 * 27,
        kind: advanced && lights.some(p => p[0] === col && p[1] === row) ? 'signal' :
          advanced && row === 3 && col === 2 ? 'giveway' : 'stop' };
    });
    this.layouts.set(m, layout); return layout;
  },
  configure(m) {
    if (!this.enabled(m)) return;
    m.trafficControl = { cyclist: { state: 'waiting', x: 0, z: 0, yaw: 0, at: 0, leg: -1,
      checked: false, wait: 0, originYaw: 0, rideSpeed: 0, stopWait: 0, junction: -1 } };
    for (const j of m.junctions) { j.redSeen = false; j.redStopped = false; j.approach = ''; }
    if (m.routePlan.day >= 3) {
      Object.assign(m.traffic[0], { x: m.town.xs[1] + 1.7, z: m.bounds.z1 - 3, yaw: 0 });
      Object.assign(m.traffic[1], { x: m.bounds.x0 + 3, z: m.town.zs[1] + 1.7, yaw: Math.PI / 2 });
      Object.assign(m.crossing, { x: m.town.school.x - m.town.road / 2 - 1.2,
        z: (m.town.school.z0 + m.town.school.z1) / 2, state: 'waiting', clock: 0, early: false });
    }
    for (const car of m.traffic) Object.assign(car, { cruise: car.speed, speed: m.routePlan.day>=3?0:car.speed, wait: 0, junction: -1 });
    this.attach(m);
  },
  attach(m) {
    if (!m._trafficSolids) {
      m._trafficSolids = { cyclist: { x: 1e6, z: 1e6, w: .65, d: 1.9, h: 1.7 },
        children: { x: 1e6, z: 1e6, w: .7, d: 1.5, h: 1.3 } };
      m.solids.push(m._trafficSolids.cyclist, m._trafficSolids.children);
      m._trafficBodies = { van: { x: 0, z: 0, yaw: 0, w: 2.16, d: 5.4 },
        player: { x: 1e6, z: 1e6, yaw: 0, w: .55, d: .55 },
        cyclist: { x: 0, z: 0, yaw: 0, w: .65, d: 1.9, cyclist: true, cruise: 3.2 }, next: { x: 0, z: 0, yaw: 0 } };
      m._trafficBodies.people = [m._trafficBodies.van, m._trafficBodies.player];
    }
    this.syncSolids(m);
  },
  valid(m, control, raw) {
    const c = control && control.cyclist, finite = n => Number.isFinite(n);
    if (!c || !['waiting', 'beside', 'clear', 'done'].includes(c.state) ||
      ![c.x, c.z, c.yaw, c.at, c.wait, c.originYaw].every(finite) || c.at < 0 || c.at > raw.elapsed ||
      c.wait < 0 || c.wait > 100 || !Number.isInteger(c.leg) || c.leg < -1 || c.leg > raw.leg || typeof c.checked !== 'boolean' ||
      !finite(c.rideSpeed)||c.rideSpeed<0||c.rideSpeed>3.2||!finite(c.stopWait)||c.stopWait<0||c.stopWait>2||!Number.isInteger(c.junction)||c.junction< -1||c.junction>=m.junctions.length) return false;
    if (Math.abs(c.x) > 1000 || Math.abs(c.z) > 1000) return false;
    if(m.routePlan.day>=3){const h=raw.crossing,school=m.town.school,half=m.town.road/2;if(!h||h.z!==m.crossing.z||h.x<school.x-half-1.2||h.x>school.x+half+1.25||h.clock<0)return false;}
    if (!Array.isArray(raw.junctions) || raw.junctions.some(j => typeof j.redSeen !== 'boolean' ||
      typeof j.redStopped !== 'boolean' || !['', 'n', 'e', 's', 'w'].includes(j.approach))) return false;
    return raw.traffic.every(car => car.x>=m.bounds.x0&&car.x<=m.bounds.x1&&car.z>=m.bounds.z0&&car.z<=m.bounds.z1&&finite(car.cruise) && car.cruise > 0 && car.cruise <= 12 && car.speed >= 0 && car.speed <= car.cruise &&
      finite(car.wait) && car.wait >= 0 && car.wait <= 2 && Number.isInteger(car.junction) && car.junction >= -1 && car.junction < m.junctions.length);
  },
  syncSolids(m) {
    const c = m.trafficControl.cyclist, b = m._trafficSolids.cyclist, h = m.crossing, kids = m._trafficSolids.children;
    const riding = c.state === 'beside' || c.state === 'clear';
    b.x = riding ? c.x : 1e6; b.z = riding ? c.z : 1e6;
    const vertical = Math.abs(Math.cos(c.yaw)) > .7; b.w = vertical ? .65 : 1.9; b.d = vertical ? 1.9 : .65;
    kids.x = m.routePlan.day >= 3 ? h.x : 1e6;
    kids.z = m.routePlan.day >= 3 ? h.z + .4 : 1e6;
  },
  emit(m, type, key, ok, text) {
    const id = `driver:${type}:${key}`; if (m.events[id]) return;
    m.log(id, 'driving', ok ? 'good' : 'needs', text);
    if (OTR.workday) OTR.workday.report(type, { key, stop: m.phase === 'route' ? m.activeStop + 1 : undefined,
      ok, where: { x: m.van.x, z: m.van.z, mph: Math.abs(m.van.speed) * 2.2369362921 } });
  },
  approach(yaw) { return Math.abs(Math.cos(yaw)) > .7 ? (Math.cos(yaw) > 0 ? 'n' : 's') : (Math.sin(yaw) > 0 ? 'e' : 'w'); },
  conflicts(m, junction, yaw, ignore) {
    const half = m.town.road / 2;
    for (const car of m.traffic) {
      if (car === ignore) continue;
      const dx = Math.abs(car.x - junction.x), dz = Math.abs(car.z - junction.z);
      if (dx < half + 2.3 && dz < half + 2.3) return true;
      const cross = Math.abs(Math.sin(car.yaw - yaw)) > .5;
      const toward = (junction.x - car.x) * Math.sin(car.yaw) - (junction.z - car.z) * Math.cos(car.yaw);
      if (cross && car.speed > .2 && toward > 0 && toward < half + 4 + car.speed * 3 && Math.min(dx, dz) < 2.5) return true;
    }
    return false;
  },
  observeJunction(m, j, index, old) {
    const control = this.layout(m)[index]; if (control.kind === 'stop') return false;
    const v = m.van, half = m.town.road / 2, s = Math.sin(v.yaw), c = Math.cos(v.yaw);
    if (v.gear === -1 || v.speed < -.1) return true;
    const along = (control.x - v.x) * s - (control.z - v.z) * c - 2.7;
    const before = (control.x - old.x) * s - (control.z - old.z) * c - 2.7;
    const across = (v.x - control.x) * c + (v.z - control.z) * s, approach = this.approach(v.yaw);
    if (Math.abs(across) > half || along > half + 25 || along < -half - 6) {
      j.redSeen = false; j.redStopped = false; j.approach = ''; return true;
    }
    if (j.approach !== approach) { j.redSeen = false; j.redStopped = false; j.approach = approach; }
    const enters = before > half + .25 && along <= half + .25 && along < before;
    if (control.kind === 'signal') {
      const aspect = this.aspect(this.signal(m.elapsed, control.offset), v.yaw);
      if (aspect === 'red' && along >= half + .25) j.redSeen = true;
      if (j.redSeen && along >= half + .25 && along < half + 6 && Math.abs(v.speed) < .1) j.redStopped = true;
      if (enters && aspect === 'red') this.emit(m, 'drive.red-light', control.id + ':' + approach, false, 'Entered a junction while its traffic light was red.');
      else if (enters && aspect === 'green' && j.redSeen && j.redStopped) this.emit(m, 'drive.red-light', control.id + ':' + approach, true, 'Stopped behind the line and waited for the traffic light to turn green.');
    } else if (enters && (approach === 'e' || approach === 'w')) {
      const clear = !this.conflicts(m, control, v.yaw);
      this.emit(m, 'drive.sign-giveway', `yield:${index}:${approach}`, clear,
        clear ? 'Gave way to traffic before entering the junction.' : 'Entered the junction without giving way to approaching traffic.');
    }
    return true;
  },
  carStep(m, car, dt) {
    const b = m._trafficBodies, v = m.van; b.van.x = v.x; b.van.z = v.z; b.van.yaw = v.yaw;
    b.player.x = m.mode === 'walk' ? m.player.x : 1e6; b.player.z = m.mode === 'walk' ? m.player.z : 1e6;
    const ignore=car.cyclist?m._trafficSolids.cyclist:null;
    let target = Math.min(this.targetSpeed(car, m.solids, car.cruise,ignore), this.targetSpeed(car, m.traffic, car.cruise),
      this.targetSpeed(car, b.people, car.cruise));
    const half = m.town.road / 2, s = Math.sin(car.yaw), c = Math.cos(car.yaw);
    for (const j of this.layout(m)) {
      const across = (car.x - j.x) * c + (car.z - j.z) * s;
      const ahead = (j.x - car.x) * s - (j.z - car.z) * c;
      const front=(car.d||4.5)/2;
      if (Math.abs(across) > half || ahead < half + front-.05 || ahead > half + 24) continue;
      const distance = ahead - half - front - .25;
      if (car.junction !== j.index) { car.wait = 0; car.junction = j.index; }
      if (distance <= 1.7 && car.speed < .12) car.wait = Math.min(2, car.wait + dt);
      const aspect = j.kind === 'signal' ? this.aspect(this.signal(m.elapsed, j.offset), car.yaw) : null;
      const mustWait = aspect === 'red' || aspect === 'amber' || j.kind === 'stop' && car.wait < 1 ||
        (j.kind === 'signal' || j.kind === 'giveway' || car.wait >= 1) && this.conflicts(m, j, car.yaw, car);
      if (mustWait) target = Math.min(target, this.stoppingSpeed(distance, car.cruise));
    }
    const h = m.crossing;
    if (m.routePlan.day >= 3 && h.state !== 'waiting' && h.state !== 'resolved' && Math.abs(car.x - m.town.school.x) < half) {
      const distance = (h.z - car.z) * -Math.cos(car.yaw) - 3.5;
      if (distance >= 0 && distance < 25) target = Math.min(target, this.stoppingSpeed(distance, car.cruise));
    }
    const speed = this.speed(car.speed, target, dt); let distance = (car.speed + speed) * .5 * dt;
    let gap = Math.min(this.clearance(car, b.van), this.clearance(car, b.player));
    for (const body of m.solids) if(body!==ignore)gap = Math.min(gap, this.clearance(car, body));
    for (const body of m.traffic) if (body !== car) gap = Math.min(gap, this.clearance(car, body));
    if (distance > Math.max(0, gap - .2)) { distance = Math.max(0, gap - .2); car.speed = 0; } else car.speed = speed;
    car.x += s * distance; car.z -= c * distance;
    const bounds = m.bounds, outside = car.x < bounds.x0 + 2.5 || car.x > bounds.x1 - 2.5 || car.z < bounds.z0 + 2.5 || car.z > bounds.z1 - 2.5;
    if(!car.cyclist&&outside){car.x=Math.max(bounds.x0+2.4,Math.min(bounds.x1-2.4,car.x));car.z=Math.max(bounds.z0+2.4,Math.min(bounds.z1-2.4,car.z));car.speed=0;}
    if (!car.cyclist&&outside && Math.hypot(car.x - v.x, car.z - v.z) > 40 && (m.mode!=='walk'||Math.hypot(car.x - m.player.x, car.z - m.player.z) > 40)) {
      const x = car.x, z = car.z;
      if (s > .7) car.x = bounds.x0 + 3; else if (s < -.7) car.x = bounds.x1 - 3;
      else car.z = c > 0 ? bounds.z1 - 3 : bounds.z0 + 3;
      if (Math.hypot(car.x-v.x,car.z-v.z)<=40||m.mode==='walk'&&Math.hypot(car.x-m.player.x,car.z-m.player.z)<=40||this.targetSpeed(car, m.traffic, car.cruise) < .1 || this.clearance(car, b.van) < 5 || this.clearance(car, b.player) < 5) { car.x = x; car.z = z; }
      else { car.speed = 0; car.wait = 0; car.junction = -1; }
    }
  },
  crossingClear(m) {
    const h = m.crossing, road = m.town.school.x;
    for (const car of m.traffic) {
      if (Math.abs(car.x - road) > 3) continue;
      const ahead = (h.z - car.z) * -Math.cos(car.yaw);
      if (ahead > -3 && ahead < Math.max(5, car.speed * 4 + 3)) return false;
    }
    const v = m.van, distance = Math.abs(v.z - h.z);
    return Math.abs(v.x - road) > m.town.road / 2 + 2 ||
      distance > Math.max(7, Math.abs(v.speed) * 4 + 3) || Math.abs(v.speed) < .1 && distance > 4;
  },
  overlap(a, b) {
    return Math.abs(a.x-b.x)<(a.w+b.w)/2&&Math.abs(a.z-b.z)<(a.d+b.d)/2;
  },
  blocksDrivingActor(m, box) {
    return this.overlap(box,m._trafficSolids.children)||this.overlap(box,m._trafficSolids.cyclist);
  },
  crossingStep(m, dt) {
    if (m.routePlan.day < 3) return;
    const h = m.crossing, v = m.van, school = m.town.school;
    if (h.state === 'resolved') return;
    if (h.state === 'waiting' && m.departed && Math.abs(v.x - school.x) < m.town.road && Math.abs(v.z - h.z) < 32) { h.state = 'developing'; m.touch(); }
    if (h.state === 'waiting') return;
    h.clock += dt;
    if (Math.abs(v.z - h.z) > 7 && Math.abs(v.speed) < 3) h.early = true;
    if (h.state === 'developing' && h.clock >= 2 && this.crossingClear(m)) { h.state = 'crossing'; m.touch(); }
    if (h.state !== 'crossing') return;
    const next = m._trafficBodies.next; next.x = h.x + .95 * dt; next.z = h.z + .4; next.w = .7; next.d = 1.5;
    // Check the proposed step, so children never walk into a stopped or moving van.
    let blocked=OTR.fp.vanBox(v,next)||(m.mode==='walk'&&OTR.fp.circleBox(m.player.x,m.player.z,.3,next));
    if(!blocked)for(const solid of m.solids)if(solid!==m._trafficSolids.children&&this.overlap(next,solid)){blocked=true;break;}
    if(!blocked)for(const car of m.traffic){const vertical=Math.abs(Math.cos(car.yaw))>.7,w=vertical?1.8:3.6,d=vertical?3.6:1.8;
      if(Math.abs(next.x-car.x)<(next.w+w)/2&&Math.abs(next.z-car.z)<(next.d+d)/2){blocked=true;break;}}
    if(!blocked)h.x=next.x;
    if (h.x >= school.x + m.town.road / 2 + 1.2) {
      h.state = 'resolved'; m.touch();
      this.emit(m, 'drive.pedestrian', 'school-crossing', true, 'Waited for the children to finish crossing the road.');
    }
  },
  cyclistStep(m, dt) {
    const c = m.trafficControl.cyclist, v = m.van;
    if (m.routePlan.day < 4 || !m.departed || !['route', 'return'].includes(m.phase)) return;
    if (c.leg !== m.leg && m.mode === 'cab' && Math.abs(v.speed) < 3) {
      const next=m._trafficBodies.next,sin=Math.sin(v.yaw),cos=Math.cos(v.yaw);
      next.x=v.x+cos*2-sin*2.5;next.z=v.z+sin*2+cos*2.5;next.w=.7;next.d=1.9;
      let clear=OTR.fpRoute.onStreet(m,next.x,next.z);
      if(clear)for(const solid of m.solids)if(solid!==m._trafficSolids.cyclist&&this.overlap(next,solid)){clear=false;break;}
      if (clear) {
        c.state = 'beside'; c.x = next.x; c.z = next.z; c.yaw = v.yaw; c.at = m.elapsed; c.leg = m.leg;
        c.checked = false; c.wait = 0; c.originYaw = v.yaw;c.rideSpeed=3.2;c.stopWait=0;c.junction=-1; m.touch();
      }
    }
    if (c.state !== 'beside' && c.state !== 'clear') return;
    if (OTR.fpMirrors && OTR.fpMirrors.recent(m, 1) && v.mirrors[1] >= c.at) c.checked = true;
    if (Math.abs(v.speed) < .1) c.wait = Math.min(100, c.wait + dt);
    const body = m._trafficBodies.cyclist, van = m._trafficBodies.van;
    body.x = c.x; body.z = c.z; body.yaw = c.yaw;body.speed=c.rideSpeed;body.wait=c.stopWait;body.junction=c.junction;
    this.carStep(m,body,dt);c.x=body.x;c.z=body.z;c.rideSpeed=body.speed;c.stopWait=body.wait;c.junction=body.junction;
    const ahead = (c.x - v.x) * Math.sin(c.yaw) - (c.z - v.z) * Math.cos(c.yaw);
    if (c.state === 'beside' && ahead > 7) { c.state = 'clear'; m.touch(); }
    if (Math.hypot(c.x - v.x, c.z - v.z) > 38 ||
      c.x < m.bounds.x0 + 1 || c.x > m.bounds.x1 - 1 || c.z < m.bounds.z0 + 1 || c.z > m.bounds.z1 - 1) { c.state = 'done'; m.touch(); }
  },
  before(m, dt) {
    this.crossingStep(m, dt); this.cyclistStep(m, dt); this.syncSolids(m);
    for (const car of m.traffic) this.carStep(m, car, dt);
  },
  contact(m, role) {
    return !!(m.motion && m.motion.contact && m._motorPose && OTR.fp.vanBox(m._motorPose, m._trafficSolids[role]));
  },
  handlesContact(m, role) {
    if (!this.contact(m, role)) return false;
    // A later impact is a new contact, after the crossing or turn was completed safely.
    if (role === 'children') return m.crossing.state !== 'resolved';
    const id = 'driver:drive.cyclist:cyclist:' + m.trafficControl.cyclist.leg;
    for (const line of m.logs) if (line.id === id) return line.outcome !== 'good';
    return true;
  },
  after(m) {
    const c = m.trafficControl.cyclist, v = m.van;
    if (this.contact(m, 'children')) {
      m._rearContact = true;
      this.emit(m, 'drive.pedestrian', 'school-crossing', false, 'Moved into the school crossing before the children were clear.');
    }
    if (c.state !== 'beside' && c.state !== 'clear') return;
    const turn = Math.atan2(Math.sin(v.yaw - c.originYaw), Math.cos(v.yaw - c.originYaw));
    if (this.contact(m, 'cyclist') || turn > .06 && Math.abs(v.speed) > .2) {
      const safe = !this.contact(m, 'cyclist') && c.state === 'clear' && c.checked && c.wait >= .6;
      this.emit(m, 'drive.cyclist', 'cyclist:' + c.leg, safe, safe ?
        'Checked the right mirror and waited for the cyclist before turning.' : 'Turned across the cyclist without checking and waiting for a clear gap.');
      if (!safe) m._rearContact = true;
    }
  },
  hint(m) {
    if (!this.enabled(m)) return '';
    if (m.trafficControl.cyclist.state === 'beside') return 'A cyclist is passing on the right. Check the right mirror and wait before turning.';
    if (m.routePlan.day >= 3 && ['developing', 'crossing'].includes(m.crossing.state) && Math.abs(m.van.x - m.town.school.x) < 8 && Math.abs(m.van.z - m.crossing.z) < 32)
      return 'Children are waiting at the school crossing. Slow down and let them cross.';
    return '';
  },
  signalText(aspect) {
    if (aspect === 'green') return 'The traffic light is green. Continue only when the junction is clear.';
    if (aspect === 'amber') return 'The traffic light is amber. Stop if you can do so safely.';
    return 'The traffic light is red. Stop before the junction line.';
  },
  art(m, add) {
    if (!this.enabled(m)) return null;
    const T = THREE, object = new T.Object3D(), entries = [];
    for (let i = 0; i < 4; i++) {
      const entry = { matrix: new T.Matrix4(), color: new T.Color(0xffffff), hex: 0xffffff,
        flat: true, bounded: true, visible: false, shape: i < 2 ? 13 : 14,
        sphere: new T.Sphere(new T.Vector3(), 1.35) };
      entries.push(entry); add(entry);
    }
    return { entries, sync(model) {
      const cyclist = model.trafficControl.cyclist, riding = !OTR.gfx.high()&&(cyclist.state === 'beside' || cyclist.state === 'clear');
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i]; entry.visible = riding;
        if (!riding) continue;
        object.position.set(cyclist.x, .9, cyclist.z);
        object.rotation.set(Math.PI / 2, -cyclist.yaw + (i < 2 ? Math.PI / 2 : 0) + i % 2 * Math.PI, 0, 'YXZ');
        object.scale.set(i < 2 ? 2 : .6, 1, 1.8); object.updateMatrix();
        entry.matrix.copy(object.matrix); entry.sphere.center.copy(object.position);
      }
    } };
  },
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
  targetSpeed(actor, others, limit, ignore) {
    if (!Number.isFinite(limit) || limit < 0) return 0;
    let target = limit;
    for (const other of others) {
      if (other === actor || other === ignore) continue;
      const range = Math.max(limit * 3, limit * limit / 5) + 8 + Math.max(other.w || 1.8, other.d || 4.5) / 2;
      if ((other.x - actor.x) ** 2 + (other.z - actor.z) ** 2 > range * range) continue;
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
