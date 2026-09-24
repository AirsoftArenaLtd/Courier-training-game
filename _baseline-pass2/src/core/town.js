/*
 * Town model: turns OTR_DATA.town into a world of streets, intersections, buildings, addresses and a
 * lane graph the AI traffic drives on. Pure data — no Phaser objects here.
 *
 *   const T = OTR.town.build();
 *   T.lots, T.inters, T.vx, T.hy, T.W, T.H, T.laneY(rowIndex, dir), T.nearestIntersection(x, y)
 */
window.OTR = window.OTR || {};

OTR.town = {
  build(seed) {
    const S = OTR_DATA.town;
    const R = OTR.scenery.rng('town' + (seed || 1));
    const road = OTR.townArt.ROAD;
    const vx = S.streetsV.map((_, j) => S.margin + j * S.cell);
    const hy = S.streetsH.map((_, i) => S.margin + i * S.cell);
    const W = vx[vx.length - 1] + S.margin;
    const H = hy[hy.length - 1] + S.margin;

    const inters = [];
    hy.forEach((y, row) => vx.forEach((x, col) => {
      const light = (S.lights || []).some(([c, r]) => c === col && r === row);
      inters.push({ col, row, x, y, light, stop: !light, phase: (col + row) % 2 });
    }));

    // ---- buildings and addresses along each block edge
    const all = [];
    const halfRoad = road / 2 + OTR.townArt.WALK;
    let bizI = 0, personI = 0;
    const addLot = (o) => { all.push(Object.assign({ id: 'lot' + all.length }, o)); };
    hy.forEach((y, row) => {
      vx.forEach((x, col) => {
        if (col >= vx.length - 1) return;
        const x0 = x + halfRoad + 40, x1 = vx[col + 1] - halfRoad - 40;
        const n = S.housesPerEdge;
        const skip = { '-1': 0, '1': 0 };
        for (let k = 0; k < n; k++) {
          const t = (k + 0.5) / n;
          const bx = x0 + (x1 - x0) * t;
          [-1, 1].forEach(side => {
            if (row === 0 && side < 0) return;           // nothing above the top street
            if (row === hy.length - 1 && side > 0) return;
            if (skip[side] > 0) { skip[side]--; return; }
            const by = y + side * (halfRoad + 150);
            const kind = k < n - 1 && R() < 0.18 ? 'business' : (k < n - 1 && R() < 0.1 ? 'apartment' : 'house');
            if (kind !== 'house') skip[side] = 1;        // big buildings take two plots
            // ...and stand across the middle of the two. Centred on their own plot, they ran into the house on the
            // plot before (a business by 31 px, an apartment block by 59) and, on a block's first plot, an
            // apartment block covered 24 px of the cross street's sidewalk.
            const lx = kind === 'house' ? bx : x0 + (x1 - x0) * (k + 1) / n;
            const number = (col + 1) * 100 + (k + 1) * S.numberStep + (side < 0 ? 1 : 0);
            const street = S.streetsH[row];
            const person = S.people[personI++ % S.people.length];
            const biz = S.businesses[bizI % S.businesses.length];
            if (kind === 'business') bizI++;
            addLot({
              x: lx, y: by, side, row, col,
              curb: { x: lx, y: y + side * (road / 2 + 34) },
              // where the van stops: in the kerb lane, tucked in to the kerb on the house's side
              park: { x: lx, y: y + side * (road / 2 - 34) },
              number: String(number), street, kind,
              name: kind === 'business' ? biz.name : person.name,
              accent: biz.accent,
              person,
              variant: Math.floor(R() * 4)
            });
          });
        }
      });
    });

    // The station stands in the block south of its street, clear of the sidewalks, and nothing else is built
    // there. It used to be drawn wider than the block, over 2nd St's sidewalk and into the road (with a collision
    // box further out still), on top of two addresses the route could send you to.
    const bx0 = vx[S.depot.col] + halfRoad + 10, bx1 = vx[S.depot.col + 1] - halfRoad - 10;
    const dw = Math.min(520, bx1 - bx0), dh = 290;
    const dx = Math.max(bx0 + dw / 2, Math.min(bx1 - dw / 2, vx[S.depot.col] + halfRoad + 360));
    const depot = {
      x: dx, y: hy[S.depot.row] + halfRoad + 220, w: dw, h: dh,
      curb: { x: dx, y: hy[S.depot.row] + road / 2 + 34 },
      number: '1', street: S.streetsH[S.depot.row], name: (OTR_DATA.config.brand || '') + ' Station'
    };
    // lots keep the ids they were made with, so a saved route still finds its stops
    const lots = all.filter(l => {
      const [w, h] = OTR.town.size(l);
      return l.x + w / 2 <= depot.x - dw / 2 || l.x - w / 2 >= depot.x + dw / 2 || l.y + h / 2 <= depot.y - dh / 2 || l.y - h / 2 >= depot.y + dh / 2;
    });

    const T = {
      spec: S, W, H, vx, hy, road, inters, lots, depot, seed: seed || 1,
      /** Centre line y of the lane on street `row` going east (+1) or west (-1). */
      laneY(row, dir) { return hy[row] + dir * (road / 4); },
      laneX(col, dir) { return vx[col] + (dir > 0 ? -1 : 1) * (road / 4); },
      interAt(col, row) { return inters.find(i => i.col === col && i.row === row); },
      nearestStreetH(y) {
        let best = 0;
        hy.forEach((v, i) => { if (Math.abs(v - y) < Math.abs(hy[best] - y)) best = i; });
        return best;
      },
      nearestStreetV(x) {
        let best = 0;
        vx.forEach((v, j) => { if (Math.abs(v - x) < Math.abs(vx[best] - x)) best = j; });
        return best;
      },
      onRoad(x, y) {
        const half = road / 2;
        const h = hy.some(v => Math.abs(v - y) <= half);
        const v = vx.some(u => Math.abs(u - x) <= half);
        return h || v;
      },
      inSchoolZone(x, y) {
        const z = S.schoolZone;
        if (!z) return false;
        return Math.abs(hy[z.row] - y) <= road / 2 + 40 && x >= vx[z.from] && x <= vx[z.to];
      },
      limitAt(x, y) { return T.inSchoolZone(x, y) ? S.schoolLimit : S.speedLimit; },
      lotById(id) { return lots.find(l => l.id === id); }
    };
    return T;
  },

  /** Footprint of a building in world pixels: exactly the building drawn for its kind and variant. */
  SCALE: 0.78,
  size(l) {
    const k = OTR.town.SCALE, B = OTR.townArt.BUILDINGS, v = l.variant || 0;
    const base = l.kind === 'apartment' ? B.apt : l.kind === 'business' ? B.biz[v % B.biz.length] : B.house[v % B.house.length];
    return [base[0] * k, base[1] * k];
  },

  /** Axis-aligned rectangles the van must not drive through (buildings). */
  blockers(T) {
    const out = [];
    T.lots.forEach(l => {
      const size = OTR.town.size(l);
      out.push({ x: l.x - size[0] / 2, y: l.y - size[1] / 2, w: size[0], h: size[1] });
    });
    out.push({ x: T.depot.x - T.depot.w / 2, y: T.depot.y - T.depot.h / 2, w: T.depot.w, h: T.depot.h });
    return out;
  }
};
