/*
 * The town's own traffic, left to run without a player. The route flows clear the traffic so a leg is
 * repeatable, and the Road Hazards drill scripts its hazards, so nothing else watches the cars and people just
 * living in the town — which is what a trainee spends most of the day looking at.
 *
 * Several towns are run for minutes at a time, stepped frame by frame much faster than real time, with the van
 * parked well clear of every street (it idles forward on an automatic box, and a van left in a lane would
 * simply back the traffic up behind it). Every frame, each of these must hold:
 *
 *   - no two cars overlap, in a lane or mid-turn
 *   - no car leaves the asphalt, drives into a building, or drives on the wrong side of the road
 *   - no car stands still for more than half a minute (a light cycle plus a queue is about fifteen seconds)
 *   - nobody is left standing in a traffic lane
 *   - the two streets of a traffic light are never both let through, and each gets a real share of the green
 *
 * It found every one of those broken: all four approaches of a junction turned green together, cars drove
 * through one another at stop signs and across left turns, two that met head-on in a junction blocked it for
 * the rest of the day, and a pedestrian who was hit stayed standing in the lane until they teleported back to
 * the kerb.
 */
const SEEDS = (process.env.QA_TRAFFIC_SEEDS || '1,2,3,4').split(',').map(Number);
const MINUTES = Number(process.env.QA_TRAFFIC_MIN || 4);

module.exports = async (page, ctx) => {
  if (!(await ctx.until('!!(window.OTR && OTR.game && OTR.game.isBooted && OTR.shift)', 20000))) throw new Error('the game never booted');
  await ctx.eval(`(() => {
    OTR.game.loop.sleep();
    window.__t = performance.now();
    window.__step = (n) => { for (let k = 0; k < n; k++) { window.__t += 1000 / 60; OTR.game.step(window.__t, 1000 / 60); } };
    // the long stretches: the drive's own logic only, no drawing (the same frames, many times faster under a software
    // renderer; key presses still go through __step, which is where the game reads the keyboard)
    window.__stepFast = (n) => { const sc = OTR.game.scene.getScene('TownDriveScene'); for (let k = 0; k < n; k++) { window.__t += 1000 / 60; sc.sys.step(window.__t, 1000 / 60); } };
  })()`);

  const bad = [];
  let frames = 0, longestWait = 0, greenShare = 1;
  for (const seed of SEEDS) {
    await ctx.eval(`(() => {
      const mgr = OTR.game.scene;
      mgr.getScenes(true).forEach(s => mgr.stop(s.sys.settings.key));
      __step(2);
      mgr.start('TownDriveScene', { seed: ${seed}, weather: 'clear', tod: 'midday', route: [] });
      __step(3);
      const s = mgr.getScene('TownDriveScene');
      const T = s.T, R = OTR.townArt.ROAD / 2, WALK = OTR.townArt.WALK;

      // park the van on the first patch of ground clear of every street and building
      const park = { x: s.van.x, y: s.van.y, heading: s.van.heading };
      for (let gy = 200; gy < T.H; gy += 40) {
        for (let gx = 200; gx < T.W; gx += 40) {
          if (s.streetDist(gx, gy) < 260) continue;
          if (s.blockers.some(b => gx > b.x - 90 && gx < b.x + b.w + 90 && gy > b.y - 90 && gy < b.y + b.h + 90)) continue;
          park.x = gx; park.y = gy; gy = T.H; break;
        }
      }

      // an oriented box for a car, separating-axis tests between two of them or one and a building
      const corners = (c) => {
        const f = { x: Math.cos(c.heading), y: Math.sin(c.heading) }, rt = { x: -f.y, y: f.x };
        return [[1, 1], [1, -1], [-1, -1], [-1, 1]].map(([a, b]) => ({ x: c.x + f.x * c.hl * a + rt.x * c.hw * b, y: c.y + f.y * c.hl * a + rt.y * c.hw * b }));
      };
      const sat = (A, B) => {
        const axes = [];
        [A, B].forEach(P => { for (let i = 0; i < 4; i++) { const p = P[i], q = P[(i + 1) % 4]; axes.push({ x: -(q.y - p.y), y: q.x - p.x }); } });
        return axes.every(ax => {
          const pa = A.map(p => p.x * ax.x + p.y * ax.y), pb = B.map(p => p.x * ax.x + p.y * ax.y);
          return Math.max(...pa) > Math.min(...pb) + 0.5 && Math.max(...pb) > Math.min(...pa) + 0.5;
        });
      };
      const rectPts = (b) => [{ x: b.x, y: b.y }, { x: b.x + b.w, y: b.y }, { x: b.x + b.w, y: b.y + b.h }, { x: b.x, y: b.y + b.h }];

      const S = window.__traffic = { issues: {}, still: new Map(), maxStill: 0, frames: 0, green: {} };
      const note = (kind, key, detail) => {
        S.issues[kind] = S.issues[kind] || { n: 0, first: [] };
        const I = S.issues[kind];
        if (I['k' + key]) return;
        I['k' + key] = true; I.n++;
        if (I.first.length < 3) I.first.push(detail);
      };

      if (window.__trafficHook) s.events.off('update', window.__trafficHook);
      window.__trafficHook = () => {
        Object.assign(s.van, park); s.van.u = 0; s.van.lat = 0; s.van.r = 0; s.van.speed = 0;
        const t = s.elapsed.toFixed(1), bucket = Math.round(s.elapsed / 5);
        S.frames++;

        T.inters.forEach((it, k) => {
          if (!it.light) return;
          const go = (x) => x === 'green' || x === 'amber';
          if (go(it.lightH) && go(it.lightV)) note('both streets of a light let through at once', k, \`t=\${t} junction \${it.col},\${it.row} is \${it.lightH} across and \${it.lightV} down\`);
          S.green[k] = S.green[k] || { H: 0, V: 0 };
          if (it.lightH === 'green') S.green[k].H++;
          if (it.lightV === 'green') S.green[k].V++;
        });

        const cars = s.cars, boxes = cars.map(corners);
        for (let i = 0; i < cars.length; i++) {
          const c = cars[i];
          for (let j = i + 1; j < cars.length; j++) {
            if (Math.abs(cars[j].x - c.x) < 110 && Math.abs(cars[j].y - c.y) < 110 && sat(boxes[i], boxes[j])) {
              note('cars overlapping', i + '-' + j + '@' + bucket, \`t=\${t} cars \${i},\${j} at \${Math.round(c.x)},\${Math.round(c.y)} (\${c.turn ? 'turning' : 'in lane'} / \${cars[j].turn ? 'turning' : 'in lane'})\`);
            }
          }
          if (c.x > 0 && c.x < T.W && c.y > 0 && c.y < T.H) {
            const d = s.streetDist(c.x, c.y);
            if (d > R + 2) note('car off the road', i + '@' + bucket, \`t=\${t} car \${i} at \${Math.round(c.x)},\${Math.round(c.y)} is \${Math.round(d - R)} px past the kerb\`);
            s.blockers.forEach((b, k) => {
              if (c.x > b.x - 60 && c.x < b.x + b.w + 60 && c.y > b.y - 60 && c.y < b.y + b.h + 60 && sat(boxes[i], rectPts(b))) {
                note('car inside a building', i + '-' + k, \`t=\${t} car \${i} at \${Math.round(c.x)},\${Math.round(c.y)}\`);
              }
            });
            // on a horizontal street the eastbound lane is the southern one, and the mirror of that elsewhere
            if (!c.turn) {
              const wrong = c.h ? Math.sign(c.y - T.hy[c.row]) !== c.dir : Math.sign(c.x - T.vx[c.col]) === c.dir;
              if (wrong) note('car on the wrong side of the road', i + '@' + bucket, \`t=\${t} car \${i} at \${Math.round(c.x)},\${Math.round(c.y)}\`);
            }
          }
          const still = c.speed < 1 ? (S.still.get(i) || 0) + 1 / 60 : 0;
          S.still.set(i, still);
          if (still > S.maxStill) S.maxStill = still;
          if (still > 30) note('car stood still over half a minute', i, \`t=\${t} car \${i} at \${Math.round(c.x)},\${Math.round(c.y)}\`);
        }

        s.peds.forEach((p, i) => {
          if (!p.crossing && s.streetDist(p.x, p.y) < R - 2) note('someone left standing in the road', i + '@' + bucket, \`t=\${t} person \${i} at \${Math.round(p.x)},\${Math.round(p.y)}\`);
          const far = Math.abs(p.x - p.it.x) > R + WALK + 30 || Math.abs(p.y - p.it.y) > R + WALK + 30;
          if (far) note('someone away from their crossing', i, \`t=\${t} person \${i} at \${Math.round(p.x)},\${Math.round(p.y)}, corner \${Math.round(p.it.x)},\${Math.round(p.it.y)}\`);
        });
      };
      s.events.on('update', window.__trafficHook);
    })()`);

    // in short bursts: one long synchronous run of the game loop can leave the page looking unresponsive
    for (let done = 0; done < MINUTES * 3600; done += 600) await ctx.eval('__stepFast(600)');
    const out = await ctx.eval(`(() => {
      const S = window.__traffic, issues = {};
      Object.keys(S.issues).forEach(k => { issues[k] = { count: S.issues[k].n, first: S.issues[k].first }; });
      // the smallest share of a light cycle either street got, as a fraction of an even split
      let share = 1;
      Object.keys(S.green).forEach(k => {
        const g = S.green[k], both = g.H + g.V;
        if (both > 0) share = Math.min(share, (2 * Math.min(g.H, g.V)) / both);
      });
      return { frames: S.frames, maxStill: +S.maxStill.toFixed(1), share: +share.toFixed(2), issues };
    })()`);
    await ctx.eval(`(() => {
      const s = OTR.game.scene.getScene('TownDriveScene');
      if (s && window.__trafficHook) s.events.off('update', window.__trafficHook);
      window.__trafficHook = null; window.__traffic = null;
    })()`);
    frames += out.frames;
    longestWait = Math.max(longestWait, out.maxStill);
    greenShare = Math.min(greenShare, out.share);
    Object.keys(out.issues).forEach(k => bad.push(`town ${seed}: ${k} (${out.issues[k].count}) — ${out.issues[k].first.join(' | ')}`));
    if (out.share < 0.8) bad.push(`town ${seed}: a traffic light gave one street only ${Math.round(out.share * 50)}% of the green`);
  }

  console.log(`        town traffic: ${SEEDS.length} towns, ${Math.round(frames / 60 / 60)} minutes each way, longest a car waited ${longestWait.toFixed(1)} s, evenest green split ${Math.round(greenShare * 50)}/${100 - Math.round(greenShare * 50)}`);
  if (bad.length) throw new Error(`${bad.length} problem(s): ${bad.slice(0, 6).join(' | ')}`);
};
