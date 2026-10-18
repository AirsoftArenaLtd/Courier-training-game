/* Derived sign locations. No renderer, saved fields or scoring calls. */
window.OTR = window.OTR || {};
OTR.fpSigns = {
  catalog(m) {
    if (!m || !m.town || !m.routePlan) return null;
    const source = OTR.town.build(m.routePlan.townSeed), scale = OTR.fpRoute.SCALE;
    const project = (x, y) => ({ x: (y - source.hy[0]) * scale, z: 8 - (x - source.depot.x) * scale });
    const streets = [], stops = [], numbers = [], half = m.town.road / 2;
    for (let row = 0; row < m.town.xs.length; row++) for (let col = 0; col < m.town.zs.length; col++) {
      const x = m.town.xs[row], z = m.town.zs[col], junction = row * m.town.zs.length + col;
      // The 3D grid already requires a stop on every approach, including source-town lights.
      // C-32 introduces functioning signals; decorative lights must not change that obligation.
      for (const [approach, yaw] of [['n', 0], ['e', Math.PI / 2], ['s', Math.PI], ['w', -Math.PI / 2]]) {
        const fx = Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = Math.sin(yaw);
        stops.push({ id: `stop:${row}:${col}:${approach}`, kind: 'stop', junction, approach, yaw,
          x: x - fx * (half + 1) + rx * (half + .7), z: z - fz * (half + 1) + rz * (half + .7),
          line: { x: x - fx * (half + .25), z: z - fz * (half + .25) } });
      }
      streets.push({ id: `street:${row}:${col}:x`, kind: 'street', axis: 'x', name: source.spec.streetsH[row], x: x + half + .7, z: z + half + .7 });
      streets.push({ id: `street:${row}:${col}:z`, kind: 'street', axis: 'z', name: source.spec.streetsV[col], x: x + half + .7, z: z + half + .7 });
    }
    for (const lot of source.lots) {
      const b = m.town.lots.find(b => b.id === lot.id);
      if (!b) continue;
      numbers.push({ id: `number:${lot.id}`, kind: 'number', lotId: lot.id, number: lot.number,
        street: lot.street, x: b.x - lot.side * (b.w / 2 + .08), z: b.z, side: lot.side });
    }
    const school = source.spec.schoolZone;
    return { streets, stops, numbers, limit: m.town.limit, schoolLimit: m.town.schoolLimit,
      school: { from: project(source.vx[school.from], source.hy[school.row]), to: project(source.vx[school.to], source.hy[school.row]) } };
  }
};
