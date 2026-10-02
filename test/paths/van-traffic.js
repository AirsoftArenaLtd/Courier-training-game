/*
 * The town's traffic around the van. The van is put where a trainee leaves it, careless or not, and traffic is
 * sent at it: cars behind it in its lane, cars coming the other way, cross traffic and cars turning through a
 * junction it is stuck in. The game is stepped frame by frame. A car may never drive into the van, and the van
 * may never be shoved: every frame where a car's box touches the van's is a contact, and it is a failure unless
 * the van itself drove into a car that was standing still or could not have stopped.
 *
 * It found cars driving into the van and pushing it along: they only looked for it in a narrow strip straight
 * ahead, a car mid-turn did not look along its arc at all, and nothing stopped a car that missed it from moving
 * into it anyway.
 */
const SECONDS = Number(process.env.QA_VANTRAFFIC_SEC || 40);

module.exports = async (page, ctx) => {
  if (!(await ctx.until('!!(window.OTR && OTR.game && OTR.game.isBooted && OTR.shift)', 20000))) throw new Error('the game never booted');
  await ctx.eval(`(() => {
    OTR.game.loop.sleep();
    window.__t = performance.now();
    window.__step = (n) => { for (let k = 0; k < n; k++) { window.__t += 1000 / 60; OTR.game.step(window.__t, 1000 / 60); } };
  })()`);

  // where the van is left, and how (all on town seed 3's streets; positions are relative to a junction)
  const cases = [
    { id: 'stopped in its lane mid-block', at: 'mid', lane: 1, heading: 0 },
    { id: 'stopped across the lane at 40°', at: 'mid', lane: 1, heading: 0.7 },
    { id: 'stopped across both lanes', at: 'mid', lane: 0, heading: Math.PI / 2 },
    { id: 'stalled in the middle of a junction', at: 'box', lane: 0, heading: 0.35 },
    { id: 'nose over the stop line', at: 'line', lane: 1, heading: 0 },
    { id: 'stopped in the oncoming lane', at: 'mid', lane: -1, heading: 0 },
    { id: 'parked at the curb', at: 'mid', lane: 1.8, heading: 0 },
    { id: 'creeping across a junction', at: 'creep', lane: 1, heading: 0 }
  ];
  const bad = [], report = [];
  for (const k of cases) {
    const out = await ctx.eval(`(() => {
      const mgr = OTR.game.scene;
      mgr.getScenes(true).forEach(s => mgr.stop(s.sys.settings.key));
      __step(2);
      mgr.start('TownDriveScene', { seed: 3, weather: 'clear', tod: 'midday', route: [] });
      __step(3);
      const s = mgr.getScene('TownDriveScene'), T = s.T, R = OTR.townArt.ROAD / 2, P = s.P, V = OTR.vehicle, v = s.van;
      s.buckled = true; s.pullOut.pending = false;
      s.peds.forEach(p => { p.t = 1e9; p.crossing = false; });
      const K = ${JSON.stringify(k)};
      // a junction with streets on all four sides
      const it = T.inters.find(i => i.col > 0 && i.row > 0 && i.col < T.vx.length - 1 && i.row < T.hy.length - 1 && !i.light) || T.inters[5];
      const laneOff = K.lane * R / 2;                       // + is the eastbound lane (south half)
      let x, y;
      if (K.at === 'mid') { x = it.x - T.spec.cell / 2; y = it.y + laneOff; }
      else if (K.at === 'box') { x = it.x; y = it.y; }
      else if (K.at === 'line') { x = it.x - R - 20 - v.g.nose * P; y = it.y + laneOff; }
      else { x = it.x - R - 140; y = it.y + laneOff; }
      // place the van so its body centre is at (x, y)
      v.heading = K.heading; v.u = 0; v.lat = 0; v.r = 0;
      const bc = V.bodyCentre(v); v.x += x - bc.x; v.y += y - bc.y;
      const start = { x: v.x, y: v.y };
      // traffic sent at it: from behind in its lane, head-on, from both cross streets, and some turning
      const cars = s.cars;
      const put = (c, h, dir, row, col, dist, plan) => {
        c.h = h; c.dir = dir; c.row = row; c.col = col; c.turn = null; c.holding = null; c.wait = 0; c.off = 0; c.cleared = null; c.speed = c.maxSpeed * 0.8;
        if (h) { c.y = T.laneY(row, dir); c.x = it.x - dir * dist; c.heading = dir > 0 ? 0 : Math.PI; }
        else { c.x = T.laneX(col, dir); c.y = it.y - dir * dist; c.heading = dir > 0 ? Math.PI / 2 : -Math.PI / 2; }
        if (plan) { c.planFor = it; c.plan = plan; }
      };
      put(cars[0], true, 1, it.row, it.col, T.spec.cell / 2 + 420);           // behind the van, eastbound
      put(cars[1], true, 1, it.row, it.col, T.spec.cell / 2 + 640);
      put(cars[2], true, -1, it.row, it.col, 520);                             // westbound, head-on side
      put(cars[3], false, 1, it.row, it.col, 420, 'left');                     // southbound, turning left (east)
      put(cars[4], false, -1, it.row, it.col, 460, 'right');                   // northbound, turning right (east)
      put(cars[5], false, 1, it.row, it.col, 760);                             // southbound straight
      put(cars[6], false, -1, it.row, it.col, 800, 'left');                    // northbound, turning left (west)
      put(cars[7], true, -1, it.row, it.col, 900, 'left');                     // westbound, turning left (south)
      cars.forEach(c => c.img.setPosition(c.x, c.y));
      // the van: held on the brake, or creeping at walking pace straight across
      s.held = K.at === 'creep' ? {} : { KeyS: true };
      const corners = (o) => { const f = { x: Math.cos(o.h), y: Math.sin(o.h) }, rt = { x: -f.y, y: f.x };
        return [[1, 1], [1, -1], [-1, -1], [-1, 1]].map(([a, b]) => ({ x: o.x + f.x * o.hl * a + rt.x * o.hw * b, y: o.y + f.y * o.hl * a + rt.y * o.hw * b })); };
      const overlap = (A, B) => {
        const pa = corners(A), pb = corners(B);
        const axes = [A.h, A.h + Math.PI / 2, B.h, B.h + Math.PI / 2].map(t => ({ x: Math.cos(t), y: Math.sin(t) }));
        return axes.every(n => { const pr = (ps) => ps.map(p => p.x * n.x + p.y * n.y); const a = pr(pa), b = pr(pb);
          return Math.max(...a) > Math.min(...b) + 0.5 && Math.max(...b) > Math.min(...a) + 0.5; });
      };
      const contacts = [];
      let pushed = 0, creepT = 0;
      const frames = ${SECONDS} * 60;
      for (let f = 0; f < frames; f++) {
        if (K.at === 'creep') {
          // walking pace across the junction and on, then stop on the far side
          const pastX = it.x + R + 260;
          if (V.bodyCentre(v).x < pastX) { s.held = v.u > 1.4 ? { KeyS: true } : {}; } else s.held = { KeyS: true };
        }
        const before = { x: v.x, y: v.y };
        __step(1);
        const vb = V.bodyCentre(v), van = { x: vb.x, y: vb.y, h: v.heading, hl: v.g.hl * P, hw: v.g.hw * P };
        s.cars.forEach((c, i) => {
          if (!overlap(van, { x: c.x, y: c.y, h: c.heading, hl: c.hl, hw: c.hw })) return;
          contacts.push({ car: i, t: +(f / 60).toFixed(2), carSpeed: Math.round(c.speed), vanMph: +V.mph(v).toFixed(1), turning: !!c.turn });
        });
        // a van held on the brake should not move at all
        if (K.at !== 'creep') pushed = Math.max(pushed, Math.hypot(v.x - start.x, v.y - start.y));
      }
      // contacts the cars caused: any where the car was moving (the van creeping at walking pace across is in plain sight)
      const byCar = contacts.filter(c => c.carSpeed > 8);
      return { contacts: contacts.length, byCar: byCar.length, first: byCar.slice(0, 3), pushedPx: Math.round(pushed),
        stuck: s.cars.filter(c => c.speed < 1).length };
    })()`);
    report.push(`${k.id}: ${out.byCar} car-caused contact frames, van shoved ${out.pushedPx} px`);
    if (out.byCar) bad.push(`${k.id}: a car drove into the van (${out.byCar} frames; first ${JSON.stringify(out.first)})`);
    if (out.pushedPx > 3) bad.push(`${k.id}: the van, held on the brake, was shoved ${out.pushedPx} px`);
  }
  report.forEach(r => console.log('        ' + r));
  if (bad.length) throw new Error(`${bad.length} problem(s): ${bad.join(' | ')}`);
};
