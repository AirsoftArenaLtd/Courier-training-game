/*
 * Test autopilot for the town drive. Injected into the page by the QA suite; never loaded by the game.
 *
 * It drives with the same inputs a trainee has (the held-key map TownDriveScene reads), so it exercises the real
 * vehicle model: it plans a legal route along the street grid (no U-turns, always on the right-hand side),
 * follows the lane with pure pursuit, stops at every stop line, waits for green, halts for drill hazards and
 * pulls in to the kerb at the stop.
 *
 *   const bot = QA_AUTODRIVE.create(scene);
 *   bot.goTo(lot)            plan to a lot's parking spot
 *   bot.tick(dt)             call once per frame (the suite hooks the scene's update event)
 *   bot.status               'driving' | 'arrived' | 'failed: …'
 */
window.QA_AUTODRIVE = (function () {
  const HEAD = { E: [1, 0], W: [-1, 0], S: [0, 1], N: [0, -1] };
  const RIGHT = { E: 'S', S: 'W', W: 'N', N: 'E' };
  const LEFT = { E: 'N', N: 'W', W: 'S', S: 'E' };

  function create(scene) {
    const T = scene.T, R = OTR.townArt.ROAD / 2, P = scene.P, V = OTR.vehicle;
    const bot = { scene, status: 'idle', pts: [], i: 0, marks: [], goalIdx: -1, waitT: 0, log: [] };
    // the pull-in: aim up to this far past the spot (px), Stanley gain (1/s) and closing-angle cap (rad), crawl
    // speed (mph). Checked over every leg of days 1-7: all 35 parked neatly, the worst 6° off the kerb line.
    const PULL = { aim: 135, k: 3.2, cap: 0.35, mph: 4 };
    const keys = { KeyW: false, KeyS: false, KeyA: false, KeyD: false };
    const press = () => { Object.keys(keys).forEach(k => { scene.held[k] = keys[k]; }); };

    const laneLine = (h, c, r) => {
      // the lane centre for heading h on street column c / row r: returns { x } or { y }
      if (h === 'E' || h === 'W') return { y: T.laneY(r, h === 'E' ? 1 : -1) };
      return { x: T.laneX(c, h === 'S' ? 1 : -1) };
    };

    function startState() {
      const v = scene.van, c = Math.cos(v.heading), s = Math.sin(v.heading);
      const h = Math.abs(c) >= Math.abs(s) ? (c > 0 ? 'E' : 'W') : (s > 0 ? 'S' : 'N');
      const [dx, dy] = HEAD[h];
      let col = null, row = null;
      if (dy === 0) {
        row = T.nearestStreetH(v.y);
        T.vx.forEach((x, j) => { const a = (x - v.x) * dx; if (a > 60 && (col === null || a < (T.vx[col] - v.x) * dx)) col = j; });
      } else {
        col = T.nearestStreetV(v.x);
        T.hy.forEach((y, i) => { const a = (y - v.y) * dy; if (a > 60 && (row === null || a < (T.hy[row] - v.y) * dy)) row = i; });
      }
      return { h, c: col, r: row };
    }

    /** Breadth-first search over (intersection, heading) for the fewest intersections to the goal segment. */
    function search(st, goal) {
      const key = (c, r, h) => `${c},${r},${h}`;
      const q = [{ c: st.c, r: st.r, hin: st.h, prev: null }];
      const seen = new Set([key(st.c, st.r, st.h)]);
      while (q.length) {
        const n = q.shift();
        for (const hout of [n.hin, RIGHT[n.hin], LEFT[n.hin]]) {
          const [dx, dy] = HEAD[hout];
          if (n.r === goal.r && hout === goal.h) {
            const ahead = (goal.x - T.vx[n.c]) * dx;
            const nc = n.c + dx;
            const beforeNext = nc < 0 || nc >= T.vx.length || (T.vx[nc] - goal.x) * dx > 0;
            if (ahead > 200 && beforeNext) {
              const chain = [];
              let m = n, out = hout;
              while (m) { chain.unshift({ c: m.c, r: m.r, hin: m.hin, hout: out }); out = m.hin; m = m.prev; }
              return chain;
            }
          }
          const nc = n.c + dx, nr = n.r + dy;
          if (nc < 0 || nc >= T.vx.length || nr < 0 || nr >= T.hy.length) continue;
          const k = key(nc, nr, hout);
          if (seen.has(k)) continue;
          seen.add(k);
          q.push({ c: nc, r: nr, hin: hout, prev: n });
        }
      }
      return null;
    }

    /** Quarter-circle turn points through intersection (c, r) from heading h0 to h1. */
    function arc(c, r, hin, hout) {
      const h0 = HEAD[hin], h1 = HEAD[hout];
      const ix = T.vx[c], iy = T.hy[r];
      let C, rad;
      if (hout === RIGHT[hin]) {
        // a step van swings a little wide on a right turn so its rear wheels clear the kerb corner
        rad = 132;
        const K = { x: ix + (-h0[0] + h1[0]) * R, y: iy + (-h0[1] + h1[1]) * R };
        C = { x: K.x + (-h0[0] + h1[0]) * 66, y: K.y + (-h0[1] + h1[1]) * 66 };
      } else {
        rad = 175;
        const li = laneLine(hin, c, r), lo = laneLine(hout, c, r);
        const Q = { x: li.x !== undefined ? li.x : lo.x, y: li.y !== undefined ? li.y : lo.y };
        const E = { x: Q.x - h0[0] * rad, y: Q.y - h0[1] * rad };
        C = { x: E.x + h1[0] * rad, y: E.y + h1[1] * rad };
      }
      const out = [];
      for (let k = 0; k <= 12; k++) {
        const th = (k / 12) * Math.PI / 2, s = Math.sin(th), co = Math.cos(th);
        out.push({ x: C.x + rad * (s * h0[0] - co * h1[0]), y: C.y + rad * (s * h0[1] - co * h1[1]), turn: true });
      }
      return out;
    }

    function build(st, chain, goal) {
      const v = scene.van, raw = [];
      const [sdx, sdy] = HEAD[st.h];
      const l0 = laneLine(st.h, st.c, st.r);
      // join the lane before the first stop line, never beyond it (a stop can be parked close to a junction)
      const back0 = R + OTR.townArt.STOP_LINE + scene.van.g.nose * P + 8;
      const toLine = chain.length
        ? (sdx ? (T.vx[chain[0].c] - sdx * back0 - v.x) * sdx : (T.hy[chain[0].r] - sdy * back0 - v.y) * sdy)
        : 1e9;
      const join = Math.max(0, Math.min(140, toLine * 0.5));
      raw.push({ x: v.x, y: v.y });
      if (join > 12) raw.push({ x: l0.x !== undefined ? l0.x : v.x + sdx * join, y: l0.y !== undefined ? l0.y : v.y + sdy * join });
      const stops = [];
      chain.forEach(n => {
        const ix = T.vx[n.c], iy = T.hy[n.r];
        const [dx, dy] = HEAD[n.hin];
        const li = laneLine(n.hin, n.c, n.r);
        // where the centre of gravity is when the front bumper is at the stop line
        const back = R + OTR.townArt.STOP_LINE + scene.van.g.nose * P + 8;
        const sp = { x: li.x !== undefined ? li.x : ix - dx * back, y: li.y !== undefined ? li.y : iy - dy * back, stopAt: n };
        raw.push(sp);
        if (n.hin === n.hout) {
          const lo = laneLine(n.hout, n.c, n.r);
          raw.push({ x: lo.x !== undefined ? lo.x : ix + dx * (R + 60), y: lo.y !== undefined ? lo.y : iy + dy * (R + 60) });
        } else {
          arc(n.c, n.r, n.hin, n.hout).forEach(p => raw.push(p));
          const [ox, oy] = HEAD[n.hout];
          const lo = laneLine(n.hout, n.c, n.r);
          raw.push({ x: lo.x !== undefined ? lo.x : ix + ox * (R + 150), y: lo.y !== undefined ? lo.y : iy + oy * (R + 150) });
        }
      });
      const [gx] = HEAD[goal.h];
      const gl = T.laneY(goal.r, gx);
      // Pull in to the kerb from wherever the last junction actually lets you out: an S from the lane to the kerb
      // line, then a straight run-in so the van stops parallel to the kerb (it is scored). A stop just past a
      // junction leaves little room, so start the S as soon as a turn is done and aim further along the zone
      // (parking allows 150 px either side of the spot). Never put an approach point behind the exit, which would
      // make the path double back on itself.
      const S = 120, RUN = 160;
      let E = raw[raw.length - 1];
      const last = chain[chain.length - 1];
      if (last && last.hin !== last.hout && (goal.x - E.x) * gx + 120 < S + RUN) { raw.pop(); E = raw[raw.length - 1]; }
      const room0 = (goal.x - E.x) * gx;
      const gxAim = goal.x + gx * Math.min(PULL.aim, Math.max(0, S + RUN - room0));
      const room = (gxAim - E.x) * gx;
      // hold the lane until the pull-in starts; from there the kerb line itself is steered for (see tick)
      if (room > S + RUN + 200) raw.push({ x: gxAim - gx * (S + RUN), y: gl, fin: true });
      else E.fin = true;
      raw.push({ x: gxAim - gx * Math.min(RUN, room * 0.55), y: goal.y });
      raw.push({ x: gxAim, y: goal.y, goal: true });
      raw.push({ x: gxAim + gx * 200, y: goal.y });

      // resample every 8 px, carrying the markers across
      const pts = [];
      for (let k = 0; k < raw.length - 1; k++) {
        const a = raw[k], b = raw[k + 1];
        const d = Math.hypot(b.x - a.x, b.y - a.y);
        const n = Math.max(1, Math.round(d / 8));
        for (let j = 0; j < n; j++) {
          const t = j / n;
          const p = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, turn: a.turn && b.turn };
          if (j === 0 && a.stopAt) p.stopAt = a.stopAt;
          if (j === 0 && a.goal) p.goal = true;
          if (j === 0 && a.fin) p.fin = true;
          pts.push(p);
        }
      }
      pts.push(raw[raw.length - 1]);
      // speed limit per point: turns at a walking-plus pace, the school zone slow, otherwise just under the limit,
      // and a crawl for the last stretch into the kerb
      const gi = pts.findIndex(p => p.goal), fi = pts.findIndex(p => p.fin);
      pts.forEach((p, k) => {
        const lim = T.limitAt(p.x, p.y);
        const pulling = gi >= 0 && k <= gi && ((fi >= 0 && k >= fi) || (gi - k) * 8 < 260);
        p.vmax = (p.turn ? 7 : pulling ? Math.min(7, PULL.mph) : Math.min(21, lim - 2)) / V.MPH;
      });
      bot.pts = pts;
      bot.i = 0;
      // `horiz` is the street the van arrives on: the two streets of a junction run on opposite light phases
      bot.marks = pts.map((p, k) => (p.stopAt ? k : -1)).filter(k => k >= 0).map(k => ({
        idx: k, it: T.interAt(pts[k].stopAt.c, pts[k].stopAt.r), horiz: pts[k].stopAt.hin === 'E' || pts[k].stopAt.hin === 'W', cleared: false
      }));
      bot.goalIdx = pts.findIndex(p => p.goal);
      bot.fin = { y: goal.y, th: gx > 0 ? 0 : Math.PI, from: pts.findIndex(p => p.fin) };
    }

    bot.goTo = (lot) => {
      const st = startState();
      const goal = { r: lot.row, x: lot.park.x, y: lot.park.y, h: lot.side > 0 ? 'E' : 'W' };
      if (st.c === null || st.r === null) { bot.status = 'failed: no intersection ahead'; return bot; }
      // already on the right street, heading the right way, with the stop before the next junction?
      const v = scene.van;
      if (st.h === goal.h && (st.h === 'E' || st.h === 'W') && T.nearestStreetH(v.y) === goal.r) {
        const dx = HEAD[st.h][0];
        if ((goal.x - v.x) * dx > 260 && (T.vx[st.c] - goal.x) * dx > 0) { build(st, [], goal); bot.status = 'driving'; return bot; }
      }
      const chain = search(st, goal);
      if (!chain) { bot.status = 'failed: no route'; return bot; }
      build(st, chain, goal);
      bot.status = 'driving';
      return bot;
    };

    const along = (from, to) => {
      let d = 0;
      for (let k = from; k < to && k < bot.pts.length - 1; k++) d += Math.hypot(bot.pts[k + 1].x - bot.pts[k].x, bot.pts[k + 1].y - bot.pts[k].y);
      return d;
    };

    bot.tick = (dt) => {
      Object.keys(keys).forEach(k => { keys[k] = false; });
      // arrived: keep a foot on the brake until P is pressed (an automatic creeps forward otherwise)
      if (bot.status === 'arrived' && !scene.parked && !scene.leaving) { keys.KeyS = true; press(); return; }
      if (bot.status !== 'driving' || scene.parked || scene.leaving) { press(); return; }
      const v = scene.van, g = v.g;
      // progress along the path
      let best = bot.i, bd = 1e9;
      for (let k = bot.i; k < Math.min(bot.pts.length, bot.i + 40); k++) {
        const d = Math.hypot(bot.pts[k].x - v.x, bot.pts[k].y - v.y);
        if (d < bd) { bd = d; best = k; }
      }
      bot.i = best;
      if (bd > 220) { bot.status = 'failed: left the path'; press(); return; }

      // steering: pure pursuit from the rear axle
      const spd = Math.abs(v.u) * P;
      const Ld = 70 + spd * 0.45;
      let j = bot.i, acc = 0;
      while (j < bot.pts.length - 1 && acc < Ld) { acc += Math.hypot(bot.pts[j + 1].x - bot.pts[j].x, bot.pts[j + 1].y - bot.pts[j].y); j++; }
      const tgt = bot.pts[j];
      const rear = V.point(v, -g.b, 0);
      const ang = Math.atan2(tgt.y - rear.y, tgt.x - rear.x) - v.heading;
      const alpha = Math.atan2(Math.sin(ang), Math.cos(ang));
      const dist = Math.max(20, Math.hypot(tgt.x - rear.x, tgt.y - rear.y));
      const delta = Math.atan(2 * Math.sin(alpha) * g.L * P / dist);
      let swWant = OTR.util.clamp(delta / (OTR_DATA.vehicle.van.maxSteer * Math.PI / 180), -1, 1);
      // the pull-in: once on the stop's street and pointing along it, steer for the kerb line itself (Stanley:
      // cancel the heading error, close the gap at a limited angle), so the van settles parallel to the kerb in
      // the few metres a stop just past a junction leaves. Pure pursuit takes several lookaheads to settle.
      const F = bot.fin;
      if (F && F.from >= 0 && bot.i >= F.from) {
        const psi = Math.atan2(Math.sin(v.heading - F.th), Math.cos(v.heading - F.th));
        if (Math.abs(psi) < 0.6) {
          const e = (V.point(v, g.a, 0).y - F.y) * Math.cos(F.th);      // front axle, + = right of the line
          const close = OTR.util.clamp(Math.atan(PULL.k * e / (spd + 20)), -PULL.cap, PULL.cap);
          swWant = OTR.util.clamp((-psi - close) / (OTR_DATA.vehicle.van.maxSteer * Math.PI / 180), -1, 1);
        }
      }
      if (v.sw < swWant - 0.04) keys.KeyD = true;
      else if (v.sw > swWant + 0.04) keys.KeyA = true;

      // speed: the tightest of the path ahead, the next stop line, hazards and the stop itself
      const A = 2.2 * P;                                  // comfortable braking, px/s²
      let vt = 1e9;
      let d = 0;
      for (let k = bot.i; k < Math.min(bot.pts.length - 1, bot.i + 90); k++) {
        vt = Math.min(vt, Math.sqrt(Math.pow(bot.pts[k].vmax * P, 2) + 2 * A * d));
        d += Math.hypot(bot.pts[k + 1].x - bot.pts[k].x, bot.pts[k + 1].y - bot.pts[k].y);
      }
      for (const m of bot.marks) {
        if (m.cleared) continue;
        // signed: negative once the van has rolled past the marker
        const dm = m.idx >= bot.i ? along(bot.i, m.idx) : -along(m.idx, bot.i);
        if (dm < -70) { m.cleared = true; continue; }
        const light = m.it && m.it.light;
        const sig = light ? scene.lightFor(m.it, m.horiz) : null;
        let mustStop = light ? sig !== 'green' : true;
        // amber: stop if you comfortably can, otherwise you are committed — go through
        if (light && sig === 'amber' && !m.stopping && spd > 5 * P) {
          // only a van carrying real speed is committed; one crawling at the line just stays put
          const need = (spd * spd) / (2 * Math.max(1, dm - 24));
          if (need > 3.2 * P) { m.cleared = true; continue; }
        }
        if (light && mustStop) m.stopping = true;
        if (light && sig === 'green') m.stopping = false;
        // green: keep watching the light until the front bumper is over the line (the CG is 8 px short of the
        // line at the marker), so a change to amber on the way in is still handled
        if (!mustStop) { if (dm < -12) m.cleared = true; continue; }
        vt = Math.min(vt, Math.sqrt(2 * A * Math.max(0, dm - 24)));
        // one continuous stop: two short ones (stopping short, then creeping up) used to add up to a "stop"
        if (!V.stopped(v)) bot.waitT = 0;
        if (dm < 44 && V.stopped(v)) {
          bot.waitT += dt;
          if (!light && bot.waitT > 0.9) { m.cleared = true; bot.waitT = 0; }   // the game counts a stop after 0.5 s still
        }
        break;
      }
      const hz = (scene.hazards || []).filter(h => h.kind !== 'phone' && h.kind !== 'water');
      if (hz.length) vt = 0;
      if ((scene.hazards || []).some(h => h.kind === 'water')) vt = Math.min(vt, 9 / V.MPH * P);
      if (bot.goalIdx >= 0) {
        const dg = along(bot.i, bot.goalIdx);
        vt = Math.min(vt, Math.sqrt(2 * A * Math.max(0, dg - 12)));
        // keep the brake down through the arrival: lifting off at a standstill for even a frame arms the gearbox,
        // and the brake held again after that selects reverse (as it does for a trainee)
        if (dg < 34 && V.stopped(v)) { bot.status = 'arrived'; keys.KeyS = true; press(); return; }
      }
      if (scene.goalBusy) vt = 0;
      if (v.gear < 0) { bot.status = 'failed: ended up in reverse'; press(); return; }

      if (vt < 2) keys.KeyS = true;
      else if (spd < vt - 6) keys.KeyW = true;
      else if (spd > vt + 14) keys.KeyS = true;
      press();
    };
    return bot;
  }
  return { create };
})();
