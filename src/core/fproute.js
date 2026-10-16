/* The generated shift projected onto a bounded 3D street grid. No renderer or scoring. */
window.OTR = window.OTR || {};
OTR.fpRoute = {
  SCALE: 0.05,
  plan(day, variant) {
    const shift = OTR.shift.generate(day, variant);
    return { day, variant, townSeed: shift.seed, weather: shift.weather, clockMin: shift.clockMin,
      dispatch: shift.dispatch, route: shift.route };
  },
  apply(m, plan) {
    if (!plan || !Number.isSafeInteger(plan.day) || plan.day < 1 || !Number.isSafeInteger(plan.townSeed) ||
      !Array.isArray(plan.route) || plan.route.length !== 5) throw Error('Invalid route plan');
    const T = OTR.town.build(plan.townSeed), scale = this.SCALE;
    const project = (x, y) => ({ x: (y - T.hy[0]) * scale, z: 8 - (x - T.depot.x) * scale });
    const lots = T.lots.map(l => {
      const p = project(l.x, l.y), size = OTR.town.size(l);
      return { id: l.id, x: p.x, z: p.z, w: size[1] * scale, d: size[0] * scale, h: l.kind === 'apartment' ? 7 : 4.2, side: l.side };
    });
    const ids = new Set();
    m.routePlan = OTR.fpMission.clone(plan);
    m.stops = plan.route.map((entry, i) => {
      const lot = T.lotById(entry.lotId), source = entry.stop, pkg = source && source.packages && source.packages[0];
      if (!lot || ids.has(lot.id) || !pkg || `${pkg.number} ${pkg.street}` !== `${lot.number} ${lot.street}`) throw Error('Invalid route stop');
      ids.add(lot.id);
      const b = lots.find(b => b.id === lot.id), p = project(lot.park.x, lot.park.y);
      return { id: i, lotId: lot.id, x: b.x - lot.side * (b.w / 2 + 0.08), z: b.z,
        side: lot.side, park: { x: p.x, z: p.z, yaw: lot.side > 0 ? 0 : Math.PI },
        address: `${pkg.number} ${pkg.street}`, service: pkg.service !== 'standard' && !source.answer ? 'signature' : source.answer ? 'handover' : 'safeplace',
        contacted: false, resolved: false };
    });
    m.town = { lots, xs: T.hy.map(y => project(T.depot.x, y).x), zs: T.vx.map(x => project(x, T.hy[0]).z),
      road: T.road * scale, limit: T.spec.speedLimit, schoolLimit: T.spec.schoolLimit,
      school: { x: project(T.vx[0], T.hy[T.spec.schoolZone.row]).x,
        z0: project(T.vx[T.spec.schoolZone.to], T.hy[0]).z, z1: project(T.vx[T.spec.schoolZone.from], T.hy[0]).z } };
    m.bounds = { x0: -17, x1: (T.H - T.hy[0]) * scale, z0: 8 - (T.W - T.depot.x) * scale, z1: 8 + T.depot.x * scale };
    // Keep the depot's interactions together, on the station side of its street.
    m.solids = m.solids.slice(0, 4).map((b,i) => Object.assign({}, b, { x: -b.x },i===3?{d:11}:{}));
    m.solids.push(...lots, { x: 13.8, z: 11, w: 2, d: 1.2, h: 1 }, { x: 13.8, z: 5, w: 1.8, d: 1.6, h: 0.96 });
    m.player.x = 9;m.van.x=2.84;
    m.briefing = { day: plan.day, weather: plan.weather, clockMin: plan.clockMin };
    m.traffic = [{ x: 1.7, z: m.town.zs[0], yaw: 0, speed: 4 }, { x: -1.7, z: m.town.zs[m.town.zs.length - 1], yaw: Math.PI, speed: 3.7 }];
    m.crossing.z = (m.town.zs[0] + m.town.zs[1]) / 2;
    if(OTR.fpLater)OTR.fpLater.layout(m);
    m.junctions = [];
    m.town.xs.forEach(x => m.town.zs.forEach(z => m.junctions.push({ x, z, stopped: false, passed: false })));
  },
  onStreet(m, x, z) {
    const half = m.town.road / 2 + 0.3;
    for(const cx of m.town.xs)if(Math.abs(x-cx)<=half)return true;
    for(const cz of m.town.zs)if(Math.abs(z-cz)<=half)return true;
    return false;
  },
  limit(m) {
    const s = m.town.school, v = m.van;
    return Math.abs(v.x - s.x) <= m.town.road / 2 && v.z >= s.z0 && v.z <= s.z1 ? m.town.schoolLimit : m.town.limit;
  },
  tick(m, old) {
    const v = m.van, F = OTR.fp, half = m.town.road / 2;
    let nearX,nearZ;
    for(const x of m.town.xs)if(Math.abs(x-v.x)<=half){nearX=x;break;}
    for(const z of m.town.zs)if(Math.abs(z-v.z)<=half){nearZ=z;break;}
    if (Math.abs(v.speed) > this.limit(m) / 2.2369362921) m.log('speed:' + m.leg, 'driving', 'needs', 'Exceeded the posted speed limit.');
    if (Math.abs(v.speed) > 1 && !(nearX !== undefined && nearZ !== undefined)) {
      const wrong = nearX !== undefined ? (v.x - nearX) * Math.cos(v.yaw) < -0.4 : nearZ !== undefined && (v.z - nearZ) * Math.sin(v.yaw) < -0.4;
      if (wrong) m.log('lane:' + m.leg, 'driving', 'needs', 'Traveled on the wrong side of the road.');
    }
    const sx=Math.sin(v.yaw)*2.7,sz=Math.cos(v.yaw)*2.7;
    const fx=v.x+sx,fz=v.z-sz,px=old.x+sx,pz=old.z-sz;
    for (let i = 0; i < m.junctions.length; i++) {
      const j = m.junctions[i], dx = fx - j.x, dz = fz - j.z;
      const along = Math.abs(Math.cos(v.yaw)) > 0.7 ? dz : dx;
      const across = Math.abs(Math.cos(v.yaw)) > 0.7 ? dx : dz;
      const distance = Math.abs(along);
      if (Math.abs(across) > half || distance > half + 6) { j.stopped = false; j.passed = false; continue; }
      if (distance >= half + 0.2 && distance < half + 5 && Math.abs(v.speed) < 0.1) j.stopped = true;
      const wasOutside = Math.abs(px - j.x) > half || Math.abs(pz - j.z) > half;
      if (!j.passed && wasOutside && Math.abs(dx) <= half && Math.abs(dz) <= half) {
        j.passed = true;
        // Approach identifies a separate stop obligation when revisiting an intersection.
        const approach = Math.abs(Math.cos(v.yaw)) > 0.7 ? (Math.cos(v.yaw) > 0 ? 'n' : 's') : (Math.sin(v.yaw) > 0 ? 'e' : 'w');
        m.log(`junction:${i}:${approach}:${m.leg}`, 'driving', j.stopped ? 'good' : 'needs', j.stopped ? 'Stopped before the junction line.' : 'Passed the junction stop line without stopping.');
      }
    }
  }
};
