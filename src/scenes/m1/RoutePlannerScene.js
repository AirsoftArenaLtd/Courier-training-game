/*
 * Module 1 · Route Planner
 *
 * Dispatch terminal: the day's manifest against the real Maple Grove map (the same town the route day
 * drives). Driving time is measured along the street network with Dijkstra, so closures really do mean
 * detours, and the school zone really does cost you minutes while it is active.
 *
 * Plan  -> click stops in order (map pin or manifest card); click a sequenced stop to pull it back out.
 * Dispatch -> the van drives your plan on the map with the clock running, stamping each stop.
 */
class RoutePlannerScene extends BaseScenarioScene {
  constructor() { super('RoutePlannerScene'); }

  create() {
    const C = this.content;
    this.setupBase();
    // Phaser reuses the scene object on a restart from the pause menu: drop anything the last run left behind
    // (a restart during FAST used to carry the 3x clock into the new run)
    this._fast = false; this._pulse = null; this.fastBtn = null;
    this.tweens.timeScale = 1; this.time.timeScale = 1;
    this.log = new OTR.ScoreLog();
    this.roundIndex = -1;
    this.results = [];
    this.state = 'intro';
    this.order = [];

    this.MAP = { x: 16, y: 68, w: 796, h: 635 };
    this.PANEL = { x: 824, y: 68, w: 440, h: 635 };

    this.add.image(OTR.W / 2, OTR.H / 2, OTR.tex.bg(this, 'route_bg', [[0, '#1E0B3C'], [1, '#12041F']]));
    this.hud({ timer: true });
    this.timerText.setFontSize(21);

    this.T = OTR.town.build(1);
    this.k = Math.min(this.MAP.w / this.T.W, this.MAP.h / this.T.H);
    this.mx = this.MAP.x + (this.MAP.w - this.T.W * this.k) / 2;
    this.my = this.MAP.y + (this.MAP.h - this.T.H * this.k) / 2;
    this.minPerPx = C.minutesPerBlock / OTR_DATA.town.cell;
    this.milesPerPx = C.milesPerBlock / OTR_DATA.town.cell;

    this.buildMap();
    this.buildPanel();

    this.introCard(C.intro.title, C.intro.lines, () => this.nextRound(), { h: 470 });
  }

  /* ------------------------------------------------------------------ map */
  sx(wx) { return this.mx + wx * this.k; }
  sy(wy) { return this.my + wy * this.k; }

  buildMap() {
    const T = this.T, k = this.k;
    const mw = Math.ceil(T.W * k), mh = Math.ceil(T.H * k);
    const key = OTR.tex.make(this, 'rp_map', mw, mh, (ctx, w, h) => {
      const cv = OTR.cv, road = T.road, walk = OTR.townArt.WALK;
      const S = (v) => v * k;
      ctx.fillStyle = cv.lin(ctx, 0, 0, 0, h, [[0, '#74BE74'], [1, '#4F9A5C']]);
      ctx.fillRect(0, 0, w, h);

      // block interiors, a touch lighter than the verge
      ctx.fillStyle = '#84C983';
      for (let r = 0; r < T.hy.length - 1; r++) {
        for (let c = 0; c < T.vx.length - 1; c++) {
          const x0 = S(T.vx[c] + road / 2), y0 = S(T.hy[r] + road / 2);
          ctx.fillRect(x0, y0, S(T.vx[c + 1] - T.vx[c] - road), S(T.hy[r + 1] - T.hy[r] - road));
        }
      }

      // sidewalks, then asphalt
      ctx.fillStyle = '#B9B4C6';
      T.hy.forEach(y => ctx.fillRect(0, S(y - road / 2 - walk), w, S(road + walk * 2)));
      T.vx.forEach(x => ctx.fillRect(S(x - road / 2 - walk), 0, S(road + walk * 2), h));
      ctx.fillStyle = '#4A4D57';
      T.hy.forEach(y => ctx.fillRect(0, S(y - road / 2), w, S(road)));
      T.vx.forEach(x => ctx.fillRect(S(x - road / 2), 0, S(road), h));

      // lane dashes
      ctx.strokeStyle = 'rgba(255,224,120,0.75)'; ctx.lineWidth = Math.max(1, S(10)); ctx.setLineDash([S(70), S(60)]);
      T.hy.forEach(y => { ctx.beginPath(); ctx.moveTo(0, S(y)); ctx.lineTo(w, S(y)); ctx.stroke(); });
      T.vx.forEach(x => { ctx.beginPath(); ctx.moveTo(S(x), 0); ctx.lineTo(S(x), h); ctx.stroke(); });
      ctx.setLineDash([]);

      // buildings
      T.lots.forEach(l => {
        const size = OTR.town.size(l);
        const bw = S(size[0]), bh = S(size[1]);
        const x = S(l.x) - bw / 2, y = S(l.y) - bh / 2;
        ctx.fillStyle = 'rgba(0,0,0,0.22)';
        cv.rr(ctx, x + 1.5, y + 2, bw, bh, 2); ctx.fill();
        const roof = l.kind === 'business' ? cv.c(l.accent || 0x3DA5FF)
          : l.kind === 'apartment' ? '#7B7490'
            : ['#C0584A', '#5A6C8C', '#8C6A48', '#A0553F'][l.variant % 4];
        ctx.fillStyle = roof;
        cv.rr(ctx, x, y, bw, bh, 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.22)';
        ctx.fillRect(x, y, bw, Math.max(1, bh * 0.34));
      });

      // school zone band
      const z = OTR_DATA.town.schoolZone;
      if (z) {
        const x0 = S(T.vx[z.from]), x1 = S(T.vx[z.to]), y = S(T.hy[z.row]);
        ctx.fillStyle = 'rgba(255,200,61,0.30)';
        ctx.fillRect(x0, y - S(road / 2), x1 - x0, S(road));
        ctx.strokeStyle = 'rgba(255,200,61,0.9)'; ctx.lineWidth = 1.5;
        ctx.strokeRect(x0, y - S(road / 2), x1 - x0, S(road));
        const sw = this.content.schoolWindow;
        const hm = (m) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
        ctx.fillStyle = '#FFE9AE'; ctx.font = '900 10px "Segoe UI", Arial';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(sw ? `SCHOOL ZONE ${hm(sw[0])}–${hm(sw[1])}` : 'SCHOOL ZONE', (x0 + x1) / 2, y);
      }

      // depot
      const d = T.depot;
      const dw = S(d.w), dh = S(d.h);
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; cv.rr(ctx, S(d.x) - dw / 2 + 2, S(d.y) - dh / 2 + 3, dw, dh, 3); ctx.fill();
      ctx.fillStyle = '#4D148C'; cv.rr(ctx, S(d.x) - dw / 2, S(d.y) - dh / 2, dw, dh, 3); ctx.fill();
      ctx.fillStyle = '#FF6600'; ctx.fillRect(S(d.x) - dw / 2, S(d.y) + dh / 2 - S(60), dw, S(60));
      ctx.fillStyle = '#FFFFFF'; ctx.font = '900 9px "Segoe UI", Arial';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('STATION', S(d.x), S(d.y) - S(40));

      // street names
      ctx.fillStyle = '#F2EEFA'; ctx.font = '800 10px "Segoe UI", Arial';
      ctx.shadowColor = 'rgba(0,0,0,0.65)'; ctx.shadowBlur = 3;
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      OTR_DATA.town.streetsH.forEach((name, r) => ctx.fillText(name, 6, S(T.hy[r])));
      OTR_DATA.town.streetsV.forEach((name, c) => {
        ctx.save(); ctx.translate(S(T.vx[c]), 8); ctx.rotate(-Math.PI / 2);
        ctx.textAlign = 'right'; ctx.fillText(name, 0, 0); ctx.restore();
      });
      ctx.shadowBlur = 0;
    });

    OTR.tex.shape(this, (frame) => {
      frame.fillStyle(0x0E0620, 0.85);
      frame.fillRoundedRect(this.MAP.x, this.MAP.y, this.MAP.w, this.MAP.h, 16);
      frame.lineStyle(2, 0x6A45A0, 0.9);
      frame.strokeRoundedRect(this.MAP.x, this.MAP.y, this.MAP.w, this.MAP.h, 16);
    }).setDepth(0);
    this.add.image(this.mx, this.my, key).setOrigin(0, 0).setDepth(1);

    this.closureLayer = this.add.container(0, 0).setDepth(3);
    this.pathG = OTR.tex.liveShape(this).setDepth(4);
    this.pinLayer = this.add.container(0, 0).setDepth(6);
    this.van = this.add.image(0, 0, OTR.art.vanTop(this)).setDepth(8).setScale(0.34).setVisible(false);
    this.tip = this.add.container(0, 0).setDepth(40).setVisible(false);
  }

  /* --------------------------------------------------------------- panel */
  buildPanel() {
    const P = this.PANEL;
    OTR.tex.shape(this, (g) => {
      g.fillStyle(0x0E0620, 0.85); g.fillRoundedRect(P.x, P.y, P.w, P.h, 16);
      g.lineStyle(2, 0x6A45A0, 0.9); g.strokeRoundedRect(P.x, P.y, P.w, P.h, 16);
    }).setDepth(0);
    this.roundTitle = OTR.txt(this, P.x + 18, P.y + 16, '', 17, '#ffffff', { ox: 0, oy: 0, weight: '900' }).setDepth(2);
    this.roundBrief = OTR.txt(this, P.x + 18, P.y + 40, '', 12, '#C9B3F0', { ox: 0, oy: 0, bold: false, wrap: P.w - 36, lineSpacing: 2 }).setDepth(2);
    this.cardLayer = this.add.container(0, 0).setDepth(2);

    // totals and controls live under the manifest
    const sy = P.y + 484;
    OTR.tex.shape(this, (div) => { div.lineStyle(1, 0x4A2A70, 1); div.lineBetween(P.x + 18, sy - 12, P.x + P.w - 18, sy - 12); }).setDepth(1);
    this.readouts = [];
    [['SEQUENCED', 0, 0], ['MILES', 1, 0], ['BACK AT STATION', 0, 1], ['COMMITMENTS', 1, 1]].forEach(([lab, cx, cy]) => {
      const x = P.x + 22 + cx * 214, y = sy + cy * 46;
      OTR.txt(this, x, y, lab, 10, '#9A8AB0', { ox: 0, weight: '900' }).setDepth(2);
      this.readouts.push(OTR.txt(this, x, y + 24, '—', 21, '#ffffff', { ox: 0, weight: '900' }).setDepth(2));
    });
    this.warnText = OTR.txt(this, P.x + 22, P.y + 438, '', 12, '#FFB020', { ox: 0, oy: 0, weight: '900', wrap: P.w - 44, lineSpacing: 2 }).setDepth(3);

    this.undoBtn = OTR.ui.button(this, P.x + 74, P.y + P.h - 34, 'Undo', () => this.undo(), { w: 104, h: 44, skin: 'ghost', icon: 'ic_undo', fontSize: 15, key: 'BACKSPACE' }).setDepth(2);
    this.clearBtn = OTR.ui.button(this, P.x + 186, P.y + P.h - 34, 'Clear', () => this.clearRoute(), { w: 104, h: 44, skin: 'ghost', icon: 'ic_trash', fontSize: 15 }).setDepth(2);
    this.dispatchBtn = OTR.ui.button(this, P.x + 336, P.y + P.h - 34, 'DISPATCH', () => this.confirmDispatch(), { w: 176, h: 50, skin: 'orange', fontSize: 18, key: 'ENTER' }).setDepth(2);
    this.dispatchBtn.setEnabled(false);
  }

  /* --------------------------------------------------------------- rounds */
  nextRound() {
    const C = this.content;
    this.roundIndex++;
    if (this.roundIndex >= C.rounds.length) { this.endScenario(); return; }
    this.round = C.rounds[this.roundIndex];
    this.startMin = this.round.startMin !== undefined ? this.round.startMin : C.startMin;
    this.order = [];
    this.cleared = null;
    this.state = 'plan';

    this.buildStops();
    this.buildGraph();
    this.computeMatrices();
    this.optimal = this.solveOptimal();

    this.roundTitle.setText(this.round.name);
    this.roundBrief.setText(this.round.brief);             // before the cards: they start below it
    this.drawClosures();
    this.drawPins();
    this.buildCards();
    this.pathG.redraw(() => {});
    this.van.setVisible(false);
    this.dispatchBtn.setLabel('DISPATCH');
    this.refresh();
    const label = this.round.name.split('·');                  // "Round 2 · The Pickup Window" → THE PICKUP WINDOW
    OTR.fx.stamp(this, this.MAP.x + this.MAP.w / 2, 360, (label[1] || label[0]).trim().toUpperCase(), 0xFF6600, { size: 40, hold: 800 });
  }

  /** Picks the addresses this round's stops land on, spread across the map. */
  buildStops() {
    const C = this.content, T = this.T, R = this.round;
    const rnd = OTR.scenery.rng(R.seed);
    const shuffled = (list) => {
      const a = list.slice();
      for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
      return a;
    };
    const closedAt = (l) => (R.closures || []).some(cl => cl[0] === 'h' && cl[1] === l.row && cl[2] === l.col);
    const homes = shuffled(T.lots.filter(l => l.kind !== 'business' && !closedAt(l)));
    const shops = shuffled(T.lots.filter(l => l.kind === 'business' && !closedAt(l)));
    const taken = [];
    const far = (l, gap) => taken.every(t => Math.hypot(t.x - l.x, t.y - l.y) > gap) &&
      Math.hypot(T.depot.x - l.x, T.depot.y - l.y) > 700;
    const grab = (pool) => {
      for (let gap = 1100; gap >= 300; gap -= 200) {
        const hit = pool.find(l => taken.indexOf(l) < 0 && far(l, gap));
        if (hit) { taken.push(hit); return hit; }
      }
      const any = pool.find(l => taken.indexOf(l) < 0);
      taken.push(any);
      return any;
    };

    this.stops = R.stops.map((spec, i) => {
      const pickup = spec.kind === 'pickup';
      const lot = grab(pickup ? shops.concat(homes) : homes);
      const svcId = pickup ? 'pickup' : spec.service;
      const svc = C.services[svcId];
      return {
        i: i + 1, lot, spec, pickup,
        svcId, svc,
        by: pickup ? null : svc.by,
        ready: pickup ? spec.ready : null,
        close: pickup ? spec.close : null,
        note: spec.note || null,
        serviceMin: pickup ? C.pickupMinutes : C.serviceMinutes,
        address: `${lot.number} ${lot.street}`,
        who: lot.kind === 'business' ? lot.name : lot.person.name
      };
    });
    // one name per address in a round (the town's small pool put the same person at four houses)
    const spare = ['Alex Chen', 'Dana Brooks', 'Luis Ortega', 'Mia Park', 'Omar Haddad', 'Ruth Levy', 'Sam Patel', 'Tessa Moore', 'Victor Reyes', 'Wendy Cole'];
    const used = [];
    this.stops.forEach(s => {
      if (used.indexOf(s.who) >= 0) s.who = spare.find(n => used.indexOf(n) < 0 && !this.stops.some(o => o.who === n)) || s.who;
      used.push(s.who);
    });
  }

  /* ---------------------------------------------------------------- graph */
  /** Nodes: every intersection, plus one access point per stop (and the station) on its street. */
  buildGraph() {
    const T = this.T, R = this.round;
    const nodes = [], index = {};
    const add = (id, x, y) => { index[id] = nodes.length; nodes.push({ id, x, y }); return index[id]; };
    T.inters.forEach(it => add(`i${it.col},${it.row}`, it.x, it.y));

    // access points sit on the centre line of the street the address is on
    const access = [];
    const addAccess = (id, x, row) => {
      let col = 0;
      T.vx.forEach((v, j) => { if (x >= v && j < T.vx.length - 1) col = j; });
      const n = add(id, x, T.hy[row]);
      access.push({ n, x, row, col });
      return n;
    };
    this.nodeOf = [];
    this.nodeOf[0] = addAccess('depot', T.depot.x, OTR_DATA.town.depot.row);
    this.stops.forEach(s => { this.nodeOf[s.i] = addAccess('s' + s.i, s.lot.x, s.lot.row); });

    const adj = nodes.map(() => []);
    const link = (a, b, school) => {
      const d = Math.hypot(nodes[a].x - nodes[b].x, nodes[a].y - nodes[b].y);
      adj[a].push({ n: b, d, school }); adj[b].push({ n: a, d, school });
    };
    const closed = (kind, line, gap) => (R.closures || []).some(c => c[0] === kind && c[1] === line && c[2] === gap);
    const z = OTR_DATA.town.schoolZone;

    // horizontal streets: chain intersection - access points - intersection along each block
    T.hy.forEach((y, row) => {
      for (let col = 0; col < T.vx.length - 1; col++) {
        const on = access.filter(a => a.row === row && a.col === col).sort((a, b) => a.x - b.x);
        const chain = [index[`i${col},${row}`]].concat(on.map(a => a.n), [index[`i${col + 1},${row}`]]);
        const mid = (T.vx[col] + T.vx[col + 1]) / 2;
        const shut = closed('h', row, col);
        const school = !!z && z.row === row && col >= z.from && col < z.to;
        for (let i = 0; i < chain.length - 1; i++) {
          const ax = nodes[chain[i]].x, bx = nodes[chain[i + 1]].x;
          if (shut && ax <= mid && bx >= mid) continue;      // the barrier sits mid-block
          link(chain[i], chain[i + 1], school);
        }
      }
    });
    // vertical streets: plain intersection to intersection
    T.vx.forEach((x, col) => {
      for (let row = 0; row < T.hy.length - 1; row++) {
        if (closed('v', col, row)) continue;
        link(index[`i${col},${row}`], index[`i${col},${row + 1}`], false);
      }
    });

    this.nodes = nodes; this.adj = adj;
  }

  dijkstra(src, avoidSchool) {
    const n = this.nodes.length;
    const dist = new Array(n).fill(Infinity), prev = new Array(n).fill(-1), seen = new Array(n).fill(false);
    dist[src] = 0;
    for (let it = 0; it < n; it++) {
      let u = -1, bd = Infinity;
      for (let i = 0; i < n; i++) if (!seen[i] && dist[i] < bd) { bd = dist[i]; u = i; }
      if (u < 0) break;
      seen[u] = true;
      this.adj[u].forEach(e => {
        if (avoidSchool && e.school) return;
        if (dist[u] + e.d < dist[e.n]) { dist[e.n] = dist[u] + e.d; prev[e.n] = u; }
      });
    }
    return { dist, prev };
  }

  computeMatrices() {
    const m = this.stops.length + 1;
    this.D = []; this.P = []; this.DS = []; this.PS = []; this.school = [];
    for (let a = 0; a < m; a++) {
      const open = this.dijkstra(this.nodeOf[a], false);
      const avoid = this.dijkstra(this.nodeOf[a], true);
      this.D[a] = []; this.P[a] = []; this.DS[a] = []; this.PS[a] = []; this.school[a] = [];
      for (let b = 0; b < m; b++) {
        this.D[a][b] = open.dist[this.nodeOf[b]];
        this.DS[a][b] = avoid.dist[this.nodeOf[b]];
        this.P[a][b] = this.trace(open.prev, this.nodeOf[a], this.nodeOf[b]);
        this.PS[a][b] = isFinite(this.DS[a][b]) ? this.trace(avoid.prev, this.nodeOf[a], this.nodeOf[b]) : null;
        this.school[a][b] = this.pathUsesSchool(this.P[a][b]);
      }
    }
  }

  trace(prev, from, to) {
    const out = [to];
    let cur = to;
    let guard = 0;
    while (cur !== from && guard++ < 200) {
      cur = prev[cur];
      if (cur < 0) return [from, to];
      out.unshift(cur);
    }
    return out;
  }

  pathUsesSchool(path) {
    for (let i = 0; i < path.length - 1; i++) {
      const e = this.adj[path[i]].find(x => x.n === path[i + 1]);
      if (e && e.school) return true;
    }
    return false;
  }

  inSchoolWindow(t) {
    const w = this.content.schoolWindow;
    return !!w && t >= w[0] && t <= w[1];
  }

  /** Minutes and the path for a leg leaving `a` at clock `t` — the zone detour is priced in. */
  leg(a, b, t) {
    const C = this.content;
    const open = this.D[a][b] * this.minPerPx + (this.school[a][b] && this.inSchoolWindow(t) ? C.schoolDelay : 0);
    const avoid = this.DS[a][b] * this.minPerPx;
    const useAvoid = isFinite(avoid) && avoid < open;
    return {
      minutes: useAvoid ? avoid : open,
      dist: useAvoid ? this.DS[a][b] : this.D[a][b],
      path: useAvoid ? this.PS[a][b] : this.P[a][b],
      slowed: !useAvoid && this.school[a][b] && this.inSchoolWindow(t)
    };
  }

  /* ------------------------------------------------------------- planning */
  /** Walks a sequence of stop numbers and reports what the day would look like. */
  evaluate(order, full) {
    const C = this.content;
    let t = this.startMin, at = 0, dist = 0, drive = 0, wait = 0;
    const legs = [], arrive = {}, flags = {};
    let late = 0, missed = 0, early = 0, met = 0, commitments = 0, weightMet = 0, weightAll = 0;
    order.forEach(i => {
      const s = this.stops[i - 1];
      const L = this.leg(at, i, t);
      t += L.minutes; drive += L.minutes; dist += L.dist;
      let w = 0;
      if (s.pickup && t < s.ready) { w = s.ready - t; t = s.ready; wait += w; early++; }
      arrive[i] = t;
      const f = { wait: w, slowed: L.slowed };
      if (s.pickup) {
        commitments++; weightAll += s.svc.weight;
        if (t > s.close) { missed++; f.bad = 'missed'; } else { met++; weightMet += s.svc.weight; f.ok = true; }
        if (w > 0) f.waited = Math.round(w);
      } else if (s.by) {
        commitments++; weightAll += s.svc.weight;
        if (t > s.by) { late++; f.bad = 'late'; } else { met++; weightMet += s.svc.weight; f.ok = true; }
      }
      flags[i] = f;
      legs.push({ from: at, to: i, path: L.path, minutes: L.minutes, depart: t - L.minutes - w, arrive: t, wait: w, slowed: L.slowed });
      t += s.serviceMin;
      at = i;
    });
    let home = null;
    if (full && order.length === this.stops.length) {
      const L = this.leg(at, 0, t);
      t += L.minutes; drive += L.minutes; dist += L.dist;
      home = { from: at, to: 0, path: L.path, minutes: L.minutes, depart: t - L.minutes, arrive: t };
      legs.push(home);
    }
    return {
      legs, arrive, flags, finish: t, dist, drive, wait, cost: drive + wait,
      late, missed, early, met, commitments,
      service: weightAll ? weightMet / weightAll : 1
    };
  }

  /** Best feasible loop: branch and bound over the orderings (n <= 8, so this stays quick). */
  solveOptimal() {
    const n = this.stops.length;
    const used = new Array(n + 1).fill(false);
    const seq = [];
    let best = null;
    const search = (strict) => {
      best = null;
      const rec = (at, t, cost) => {
        if (best && cost >= best.cost) return;
        if (seq.length === n) {
          const back = this.leg(at, 0, t);
          const c = cost + back.minutes;
          if (!best || c < best.cost) best = { cost: c, order: seq.slice() };
          return;
        }
        for (let i = 1; i <= n; i++) {
          if (used[i]) continue;
          const s = this.stops[i - 1];
          const L = this.leg(at, i, t);
          let nt = t + L.minutes, w = 0;
          if (s.pickup && nt < s.ready) { w = s.ready - nt; nt = s.ready; }
          if (strict && s.pickup && nt > s.close) continue;
          if (strict && s.by && nt > s.by) continue;
          used[i] = true; seq.push(i);
          rec(i, nt + s.serviceMin, cost + L.minutes + w);
          seq.pop(); used[i] = false;
        }
      };
      rec(0, this.startMin, 0);
      return best;
    };
    const strict = search(true);
    const out = strict || search(false);
    const ev = this.evaluate(out.order, true);
    return { order: out.order, cost: ev.cost, dist: ev.dist, finish: ev.finish, feasible: !!strict };
  }

  /* ----------------------------------------------------------------- pins */
  drawClosures() {
    this.closureLayer.removeAll(true);
    const T = this.T;
    (this.round.closures || []).forEach(c => {
      let x, y, horiz;
      if (c[0] === 'h') { x = (T.vx[c[2]] + T.vx[c[2] + 1]) / 2; y = T.hy[c[1]]; horiz = true; }
      else { x = T.vx[c[1]]; y = (T.hy[c[2]] + T.hy[c[2] + 1]) / 2; horiz = false; }
      const px = this.sx(x), py = this.sy(y), half = this.T.road * this.k / 2;
      const g = OTR.tex.shape(this, (g) => {
        g.fillStyle(0xF0435A, 0.85);
        if (horiz) g.fillRect(px - 3, py - half, 6, half * 2); else g.fillRect(px - half, py - 3, half * 2, 6);
        g.fillStyle(0xFFC83D, 1);
        for (let i = -1; i <= 1; i++) {
          if (horiz) g.fillRect(px - 3, py + i * 7 - 2, 6, 4); else g.fillRect(px + i * 7 - 2, py - 3, 4, 6);
        }
      });
      const c2 = this.add.container(px, py - 12);
      const t = OTR.txt(this, 0, 0, 'CLOSED', 9, '#FFD9DF', { weight: '900', stroke: '#3A0A14', strokeW: 3 });
      c2.add(t);
      this.closureLayer.add([g, c2]);
    });
  }

  drawPins() {
    this.pinLayer.removeAll(true);
    this.pins = {};
    this.stops.forEach(s => {
      const x = this.sx(s.lot.x), y = this.sy(s.lot.curb.y);
      const c = this.add.container(x, y);
      const g = OTR.tex.liveShape(this);
      const label = OTR.txt(this, 0, -19, '', 13, '#ffffff', { weight: '900' });
      const badge = OTR.txt(this, 0, 6, '', 11, '#ffffff', { weight: '900', stroke: '#1D1030', strokeW: 3 });
      // sequenced pins are solid, unsequenced ones are hollow — readable whatever the service colour is
      const draw = (seq) => g.redraw((g) => {
        g.fillStyle(0x000000, 0.35); g.fillEllipse(0, 2, 18, 7);
        g.fillStyle(seq ? 0x2BC48A : 0x1A0733, 1);
        g.fillCircle(0, -19, 14);
        g.fillTriangle(-9, -10, 9, -10, 0, 2);
        g.lineStyle(seq ? 2.5 : 3.5, seq ? 0xFFFFFF : s.svc.color, 1); g.strokeCircle(0, -19, 14);
        if (!seq) { g.fillStyle(s.svc.color, 1); g.fillCircle(0, -19, 5); }
      });
      draw(false);
      const hit = this.add.circle(0, -14, 20, 0xffffff, 0.001).setInteractive({ useHandCursor: true });
      hit.on('pointerover', () => { this.hoverStop(s.i, true); });
      hit.on('pointerout', () => this.hoverStop(s.i, false));
      hit.on('pointerup', () => this.toggleStop(s.i));
      c.add([g, label, badge, hit]);
      this.pinLayer.add(c);
      c.setScale(0);
      this.tweens.add({ targets: c, scale: 1, delay: 120 + s.i * 60, duration: 280, ease: 'Back.out' });
      this.pins[s.i] = { c, draw, label, badge };
    });
  }

  hoverStop(i, on) {
    const pin = this.pins[i], card = this.cards[i];
    if (!pin) return;
    this.tweens.add({ targets: pin.c, scale: on ? 1.25 : 1, duration: 110 });
    if (card) card.hl.setVisible(on);
    if (!on) { this.tip.setVisible(false); return; }
    const s = this.stops[i - 1];
    this.showTip(pin.c.x, pin.c.y - 42, s);
  }

  showTip(x, y, s) {
    this.tip.removeAll(true);
    const lines = [
      `${s.address} · ${s.who}`,
      s.pickup ? `Pickup window ${this.clock(s.ready)} – ${this.clock(s.close)}` :
        s.by ? `${s.svc.label} · commit ${this.clock(s.by)}` : `${s.svc.label} · no time commitment`
    ];
    if (s.note) lines.push(s.note);
    const t = OTR.txt(this, 0, 0, lines.join('\n'), 12, '#F4ECFF', { bold: false, lineSpacing: 3 });
    const w = t.width + 22, h = t.height + 16;
    const g = OTR.tex.shape(this, (g) => {
      g.fillStyle(0x1A0733, 0.96); g.fillRoundedRect(-w / 2, -h / 2, w, h, 8);
      g.lineStyle(1.5, s.svc.color, 1); g.strokeRoundedRect(-w / 2, -h / 2, w, h, 8);
    });
    this.tip.add([g, t]);
    const cx = OTR.util.clamp(x, this.MAP.x + w / 2 + 6, this.MAP.x + this.MAP.w - w / 2 - 6);
    // `y` is just above the (hovered, enlarged) pin head. Sit above it when there is room, otherwise below the
    // pin and its LATE/WAIT badge: never on top of the pin it describes.
    const above = y - h / 2;
    const cy = above - h / 2 >= this.MAP.y + 6 ? above : y + 58 + h / 2;
    this.tip.setPosition(cx, cy).setVisible(true);
  }

  /* ---------------------------------------------------------------- cards */
  buildCards() {
    this.cardLayer.removeAll(true);
    this.cards = {};
    const P = this.PANEL;
    // the manifest fills the space between the round brief and the warning line, however long the brief runs
    const top = Math.max(P.y + 74, this.roundBrief.y + this.roundBrief.height + 8);
    const room = P.y + 432 - top;
    const ch = Math.min(60, Math.floor(room / this.stops.length));
    this.stops.forEach((s, idx) => {
      const y = top + idx * ch + ch / 2;
      const c = this.add.container(P.x + P.w / 2, y);
      const w = P.w - 24, h = ch - 6;
      const g = OTR.tex.liveShape(this).redraw((g) => {
        g.fillStyle(0x1A0733, 0.9); g.fillRoundedRect(-w / 2, -h / 2, w, h, 9);
        g.lineStyle(1.5, 0x4A2A70, 1); g.strokeRoundedRect(-w / 2, -h / 2, w, h, 9);
      });
      const hl = OTR.tex.shape(this, (hl) => { hl.lineStyle(2, 0xFFC83D, 1); hl.strokeRoundedRect(-w / 2, -h / 2, w, h, 9); }).setVisible(false);
      const seq = OTR.tex.liveShape(this);
      const seqText = OTR.txt(this, -w / 2 + 22, 0, '', 15, '#ffffff', { weight: '900' });
      const line1 = OTR.txt(this, -w / 2 + 46, -11, s.address, 15, '#ffffff', { ox: 0, weight: '900' });
      const chip = OTR.tex.shape(this, (chip) => { chip.fillStyle(s.svc.color, 1); chip.fillRoundedRect(-w / 2 + 46, 3, 62, 15, 4); });
      const chipText = OTR.txt(this, -w / 2 + 77, 11, s.svc.short, 9, '#ffffff', { weight: '900' });
      const line2 = OTR.txt(this, -w / 2 + 114, 11, this.commitText(s), 11, '#C9B3F0', { ox: 0, bold: false });
      const eta = OTR.txt(this, w / 2 - 14, 0, '', 15, '#9A8AB0', { ox: 1, weight: '900' });
      const hit = this.add.rectangle(0, 0, w, h, 0xffffff, 0.001).setInteractive({ useHandCursor: true });
      hit.on('pointerover', () => this.hoverStop(s.i, true));
      hit.on('pointerout', () => this.hoverStop(s.i, false));
      hit.on('pointerup', () => this.toggleStop(s.i));
      c.add([g, hl, seq, seqText, line1, chip, chipText, line2, eta, hit]);
      this.cardLayer.add(c);
      this.cards[s.i] = { c, g, hl, seq, seqText, eta, w, h };
    });
  }

  commitText(s) {
    if (s.pickup) return `${this.clock(s.ready)}–${this.clock(s.close)} · ${s.who}`;
    if (s.by) return `by ${this.clock(s.by)} · ${s.who}`;
    return s.who;
  }

  /* ------------------------------------------------------------ sequencing */
  toggleStop(i) {
    if (this.state !== 'plan') return;
    const at = this.order.indexOf(i);
    if (at >= 0) {
      this.order.splice(at, 1);
      OTR.audio.play('back');
    } else {
      this.order.push(i);
      OTR.fx.pop(this, this.pins[i].c, 1.35);
      OTR.audio.play('combo', this.order.length);
    }
    this.refresh();
  }

  /** Undo the last step, including a Clear (which used to wipe the whole plan for good). */
  undo() {
    if (this.state !== 'plan') return;
    if (this.cleared && !this.order.length) { this.order = this.cleared; this.cleared = null; }
    else if (this.order.length) this.order.pop();
    else return;
    OTR.audio.play('back');
    this.refresh();
  }

  clearRoute() {
    if (this.state !== 'plan' || !this.order.length) return;
    this.cleared = this.order.slice();
    this.order = [];
    OTR.audio.play('back');
    this.refresh();
  }

  /** Recomputes the plan and repaints everything that depends on it. */
  refresh() {
    const C = this.content;
    const complete = this.order.length === this.stops.length;
    const ev = this.evaluate(this.order, complete);
    this.plan = ev;

    this.stops.forEach(s => {
      const pos = this.order.indexOf(s.i);
      const seq = pos >= 0;
      const pin = this.pins[s.i], card = this.cards[s.i];
      pin.draw(seq);
      pin.label.setText(seq ? String(pos + 1) : '');
      const f = ev.flags[s.i];
      pin.badge.setText(f && f.bad ? (f.bad === 'late' ? 'LATE' : 'MISSED') : f && f.waited ? 'WAIT' : '');
      pin.badge.setColor(f && f.bad ? '#FF6B7F' : '#FFC83D');

      card.seq.redraw((g) => {
        g.fillStyle(seq ? 0x2BC48A : 0x2A1546, 1);
        g.fillCircle(-card.w / 2 + 22, 0, 13);
      });
      card.seqText.setText(seq ? String(pos + 1) : '·');
      card.g.redraw((g) => {
        g.fillStyle(seq ? 0x241046 : 0x1A0733, 0.92);
        g.fillRoundedRect(-card.w / 2, -card.h / 2, card.w, card.h, 9);
        g.lineStyle(1.5, seq ? 0x2BC48A : 0x4A2A70, 1);
        g.strokeRoundedRect(-card.w / 2, -card.h / 2, card.w, card.h, 9);
      });
      if (seq) {
        const eta = ev.arrive[s.i];
        card.eta.setText(this.clock(eta));
        card.eta.setColor(f.bad ? '#FF6B7F' : f.waited ? '#FFC83D' : f.ok ? '#5CF0B0' : '#E6DAF7');
      } else {
        card.eta.setText('—');
        card.eta.setColor('#6A5A80');
      }
    });

    this.drawPath(ev);
    if (this.order.length) this.cleared = null;           // a new plan: the old one is gone
    if (this.undoBtn) this.undoBtn.setEnabled(this.order.length > 0 || !!this.cleared);
    if (this.clearBtn) this.clearBtn.setEnabled(this.order.length > 0);

    this.readouts[0].setText(`${this.order.length} / ${this.stops.length}`);
    this.readouts[1].setText(`${(ev.dist * this.milesPerPx).toFixed(1)} mi`);
    this.readouts[2].setText(complete ? this.clock(ev.finish) : '—');
    this.readouts[3].setText(`${ev.met} / ${ev.commitments}`);
    this.readouts[3].setColor(ev.late || ev.missed ? '#FF6B7F' : '#ffffff');
    this.timerText.setText(this.clock(this.startMin));

    const warn = [];
    if (ev.late) warn.push(`${ev.late} commitment${ev.late > 1 ? 's' : ''} missed`);
    if (ev.missed) warn.push(`${ev.missed} pickup${ev.missed > 1 ? 's' : ''} after the dock closes`);
    if (ev.early) warn.push(`${Math.round(ev.wait)} min waiting for a shipper`);
    this.warnText.setText(warn.length ? '⚠ ' + warn.join(' · ') : '');

    this.dispatchBtn.setEnabled(complete && this.state === 'plan');
    if (complete && !this._pulse) {
      this._pulse = this.tweens.add({ targets: this.dispatchBtn, scale: 1.05, duration: 480, yoyo: true, repeat: -1 });
    } else if (!complete && this._pulse) {
      this._pulse.stop(); this._pulse = null; this.dispatchBtn.setScale(1);
    }
  }

  drawPath(ev) {
    if (this.slowTags) this.slowTags.destroy();
    this.slowTags = this.add.container(0, 0).setDepth(6);
    ev.legs.filter(L => L.slowed).forEach(L => {
      const mid = this.nodes[L.path[Math.floor(L.path.length / 2)]];
      this.slowTags.add(OTR.txt(this, this.sx(mid.x), this.sy(mid.y) - 14, `+${this.content.schoolDelay} min`, 12, '#FFC83D', { weight: '900', stroke: '#16062B', strokeW: 4 }));
    });
    this.pathG.redraw((g) => {
      if (!ev.legs.length) return;
      const pts = [];
      ev.legs.forEach(L => L.path.forEach((n, i) => {
        if (i === 0 && pts.length) return;
        pts.push(this.nodes[n]);
      }));
      const line = (width, color, alpha, oy) => {
        g.lineStyle(width, color, alpha);
        g.beginPath();
        pts.forEach((p, i) => {
          const x = this.sx(p.x), y = this.sy(p.y) + oy;
          if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
        });
        g.strokePath();
      };
      line(7, 0x190833, 0.55, 2);
      line(4, 0xFF6600, 1, 0);
      // legs the school zone slowed, in amber (which leg paid the delay used to be invisible)
      g.lineStyle(4, 0xFFC83D, 1);
      ev.legs.filter(L => L.slowed).forEach(L => {
        g.beginPath();
        L.path.forEach((n, i) => { const p = this.nodes[n]; if (i === 0) g.moveTo(this.sx(p.x), this.sy(p.y)); else g.lineTo(this.sx(p.x), this.sy(p.y)); });
        g.strokePath();
      });
      // spur from the street centre line out to each sequenced pin, so the route reads as one thread
      g.lineStyle(3, 0xFF6600, 0.95);
      this.order.forEach(i => {
        const lot = this.stops[i - 1].lot;
        g.lineBetween(this.sx(lot.x), this.sy(this.T.hy[lot.row]), this.sx(lot.x), this.sy(lot.curb.y));
      });
      g.fillStyle(0xFFE0C0, 1);
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1];
        const ax = this.sx(a.x), ay = this.sy(a.y), bx = this.sx(b.x), by = this.sy(b.y);
        if (Math.hypot(bx - ax, by - ay) < 26) continue;
        const mx = (ax + bx) / 2, my = (ay + by) / 2, ang = Math.atan2(by - ay, bx - ax);
        g.fillTriangle(
          mx + Math.cos(ang) * 6, my + Math.sin(ang) * 6,
          mx + Math.cos(ang + 2.5) * 6, my + Math.sin(ang + 2.5) * 6,
          mx + Math.cos(ang - 2.5) * 6, my + Math.sin(ang - 2.5) * 6
        );
      }
    });
  }

  /* ------------------------------------------------------------- dispatch */
  confirmDispatch() {
    if (this.state !== 'plan' || this.order.length !== this.stops.length) return;
    const ev = this.plan;
    if (ev.late || ev.missed) {
      const what = [];
      if (ev.late) what.push(`${ev.late} time-committed ${ev.late > 1 ? 'deliveries' : 'delivery'} would run late`);
      if (ev.missed) what.push(`${ev.missed} pickup${ev.missed > 1 ? 's' : ''} would be missed`);
      OTR.ui.confirm(this, 'Dispatch anyway?',
        `Your plan says ${what.join(' and ')}. Dispatch would rather you resequenced now than called the customer later.`,
        () => this.dispatch(), { yes: 'Dispatch anyway', no: 'Let me fix it' });
      return;
    }
    this.dispatch();
  }

  dispatch() {
    if (this.state !== 'plan') return;
    this.state = 'driving';
    if (this._pulse) { this._pulse.stop(); this._pulse = null; this.dispatchBtn.setScale(1); }
    this.dispatchBtn.setEnabled(false).setVisible(false);
    this.undoBtn.setEnabled(false);
    this.clearBtn.setEnabled(false);
    this.tip.setVisible(false);
    const ev = this.evaluate(this.order, true);
    this.plan = ev;
    this.fastBtn = OTR.ui.button(this, this.PANEL.x + 336, this.PANEL.y + this.PANEL.h - 34, 'FAST ▶▶', () => this.toggleFast(), { w: 176, h: 50, skin: 'purple', fontSize: 18 }).setDepth(3);
    OTR.audio.play('drive');

    const start = this.nodes[this.nodeOf[0]];
    this.van.setPosition(this.sx(start.x), this.sy(start.y)).setVisible(true).setAngle(0);
    this.clockObj = { v: this.startMin };
    this.timerText.setText(this.clock(this.startMin));

    let legIndex = 0;
    const runLeg = () => {
      if (legIndex >= ev.legs.length) { this.time.delayedCall(500, () => this.roundDone(ev)); return; }
      const L = ev.legs[legIndex++];
      const pts = L.path.map(n => this.nodes[n]);
      let seg = 0;
      this.tweens.add({ targets: this.clockObj, v: L.arrive, duration: this.legDuration(pts), ease: 'Linear', onUpdate: () => this.timerText.setText(this.clock(this.clockObj.v)) });
      const stepSeg = () => {
        seg++;
        if (seg >= pts.length) { this.arriveAt(L, runLeg); return; }
        const a = pts[seg - 1], b = pts[seg];
        const ax = this.sx(a.x), ay = this.sy(a.y), bx = this.sx(b.x), by = this.sy(b.y);
        const d = Math.hypot(bx - ax, by - ay);
        this.van.setAngle(Phaser.Math.RadToDeg(Math.atan2(by - ay, bx - ax)) + 90);
        this.tweens.add({ targets: this.van, x: bx, y: by, duration: Math.max(60, d / 0.36), ease: 'Linear', onComplete: stepSeg });
      };
      stepSeg();
    };
    runLeg();
  }

  legDuration(pts) {
    let d = 0;
    for (let i = 1; i < pts.length; i++) d += Math.hypot(this.sx(pts[i].x) - this.sx(pts[i - 1].x), this.sy(pts[i].y) - this.sy(pts[i - 1].y));
    return Math.max(120, d / 0.36);
  }

  toggleFast() {
    this._fast = !this._fast;
    this.tweens.timeScale = this._fast ? 3 : 1;
    this.time.timeScale = this._fast ? 3 : 1;
    if (this.fastBtn) this.fastBtn.setLabel(this._fast ? 'FAST ▶▶▶' : 'FAST ▶▶');
  }

  arriveAt(L, next) {
    if (L.to === 0) { this.time.delayedCall(200, next); return; }
    const s = this.stops[L.to - 1];
    const f = this.plan.flags[L.to];
    const pin = this.pins[L.to];
    this.timerText.setText(this.clock(L.arrive));
    const bad = !!f.bad;
    const text = f.bad === 'late' ? 'LATE' : f.bad === 'missed' ? 'DOCK CLOSED' : f.waited ? `WAITED ${f.waited}m` : s.pickup || s.by ? 'ON TIME' : 'DELIVERED';
    OTR.fx.floatText(this, pin.c.x, pin.c.y - 34, text, bad ? '#FF6B7F' : f.waited ? '#FFC83D' : '#5CF0B0', { size: 15 });
    OTR.fx.burst(this, pin.c.x, pin.c.y - 16, { tint: bad ? 0xF0435A : 0x2BC48A, count: 12 });
    OTR.audio.play(bad ? 'buzz' : 'coin');
    if (!bad) this.addScore(s.by || s.pickup ? 220 : 120);
    const card = this.cards[L.to];
    card.eta.setText(this.clock(L.arrive));
    card.eta.setColor(bad ? '#FF6B7F' : f.waited ? '#FFC83D' : '#5CF0B0');
    this.time.delayedCall(360, next);
  }

  /* --------------------------------------------------------------- result */
  roundDone(ev) {
    this.state = 'result';
    const C = this.content, opt = this.optimal;
    const eff = Math.pow(OTR.util.clamp01(opt.cost / Math.max(1, ev.cost)), 1.3);
    // waiting and the school zone already cost minutes in `eff`; they are only called out on their own when the
    // best plan managed without them, so an optimal plan that has to wait is never marked down for it
    const best = this.evaluate(opt.order, true);
    const avoidableWait = ev.wait > best.wait + 0.5;
    const avoidableSchool = ev.legs.some(L => L.slowed) && !best.legs.some(L => L.slowed);
    this.results.push({ eff, ev, opt });
    const group = 'r' + (this.roundIndex + 1);
    this.log.setGroup(group);

    this.stops.forEach(s => {
      const f = ev.flags[s.i];
      if (s.pickup) {
        // a missed pickup or a late Early AM is the failure this scenario exists to prevent: never averaged
        this.log.check('service', f.bad ? 0 : s.svc.weight, s.svc.weight,
          `${s.address} · pickup ${this.clock(s.ready)}–${this.clock(s.close)}`,
          { lesson: f.bad ? C.lessons.missed : null, critical: true });
        if (f.waited && avoidableWait) this.log.penalty('efficiency', 1, `Waited ${f.waited} min at ${s.address}`, { lesson: C.lessons.early });
      } else if (s.by) {
        this.log.check('service', f.bad ? 0 : s.svc.weight, s.svc.weight,
          `${s.address} · ${s.svc.short} by ${this.clock(s.by)}`,
          { lesson: f.bad ? C.lessons.commit : null, critical: s.svcId === 'first' });
      }
    });
    const effPts = Math.round(eff * 10);
    this.log.check('efficiency', effPts, 10, `Loop length vs the best plan (${(ev.dist * this.milesPerPx).toFixed(1)} mi vs ${(opt.dist * this.milesPerPx).toFixed(1)} mi)`,
      { lesson: eff < 0.9 ? ((this.round.closures || []).length ? C.lessons.closure : C.lessons.long) : null });
    if (avoidableSchool) this.log.penalty('efficiency', 1, 'Drove the school zone while it was active', { lesson: C.lessons.school });

    const perfect = !ev.late && !ev.missed && !avoidableWait && eff >= 0.995;
    if (perfect) { OTR.audio.play('fanfare'); OTR.fx.confetti(this, OTR.W / 2, 700, { count: 80 }); }
    this.addScore(Math.round(eff * 600));

    const rows = [
      // the same measure on both rows: the whole day (driving, waiting and the school zone), not driving against
      // the best plan's total
      ['Your day', `${(ev.dist * this.milesPerPx).toFixed(1)} mi · ${Math.round(ev.cost)} min${ev.wait > 0 ? ` (${Math.round(ev.drive)} driving + ${Math.round(ev.wait)} waiting)` : ''}`],
      ['Best plan', `${(opt.dist * this.milesPerPx).toFixed(1)} mi · ${Math.round(opt.cost)} min`],
      ['Route efficiency', `${Math.round(eff * 100)}%`],
      ['Back at the station', this.clock(ev.finish)]
    ];
    if (ev.commitments) rows.push(['Commitments met', `${ev.met} / ${ev.commitments}`]);
    if (ev.wait > 0) rows.push(['Waiting on shippers', `${Math.round(ev.wait)} min`]);
    const slowLegs = ev.legs.filter(L => L.slowed).length;
    if (slowLegs) rows.push(['School zone', `+${slowLegs * C.schoolDelay} min (${slowLegs} leg${slowLegs > 1 ? 's' : ''} while it was active)`]);

    const notes = [];
    if (ev.late) notes.push(C.lessons.commit);
    if (ev.missed) notes.push(C.lessons.missed);
    if (!ev.late && !ev.missed && avoidableWait) notes.push(C.lessons.early);
    if (!notes.length && eff < 0.9) notes.push((this.round.closures || []).length ? C.lessons.closure : C.lessons.long);
    if (!notes.length) notes.push(C.lessons.perfect);

    OTR.ui.modal(this, {
      title: perfect ? 'Optimal Plan!' : (ev.late || ev.missed) ? 'Commitment Missed' : 'Route Complete',
      w: 720, h: 440 + Math.max(0, rows.length - 5) * 34,             // taller when the day had more to report
      build: (box, api, w, h) => {
        const top = -h / 2 + 98;
        rows.forEach((r, i) => {
          box.add(OTR.txt(this, -w / 2 + 56, top + i * 34, r[0], 17, '#5A4A70', { ox: 0, bold: false }));
          box.add(OTR.txt(this, w / 2 - 56, top + i * 34, r[1], 18, i === 2 ? '#FF6600' : '#250849', { ox: 1, weight: '900' }));
        });
        const y = top + rows.length * 34 + 16;
        box.add(OTR.txt(this, -w / 2 + 56, y, notes[0], 15, '#3A2A50', { ox: 0, oy: 0, bold: false, wrap: w - 112, lineSpacing: 3 }));
      },
      buttons: [{
        label: this.roundIndex + 1 < this.content.rounds.length ? 'Next Round ▶' : 'Finish ▶',
        skin: 'orange', key: ['ENTER', 'SPACE'],
        onClick: () => {
          if (this._fast) this.toggleFast();
          this.van.setVisible(false);
          this.undoBtn.setEnabled(true);
          this.clearBtn.setEnabled(true);
          this.dispatchBtn.setVisible(true);
          if (this.fastBtn) { this.fastBtn.destroy(); this.fastBtn = null; }
          this.nextRound();
        }
      }]
    });
  }

  endScenario() {
    const C = this.content;
    const ratios = this.log.ratios(['efficiency', 'service']);
    const miles = this.results.reduce((a, r) => a + r.ev.dist, 0) * this.milesPerPx;
    const best = this.results.reduce((a, r) => a + r.opt.dist, 0) * this.milesPerPx;
    const met = this.results.reduce((a, r) => a + r.ev.met, 0);
    const all = this.results.reduce((a, r) => a + r.ev.commitments, 0);
    this.finish({
      ratios, log: this.log, lessons: this.log.mistakes().length ? [] : [C.lessons.perfect],
      summary: `${miles.toFixed(1)} mi planned against a best possible ${best.toFixed(1)} mi · ${met}/${all} commitments met`,
      stats: { rounds: this.results.map(r => ({ eff: r.eff, met: r.ev.met, of: r.ev.commitments })) }
    }, 300);
  }

  clock(min) {
    const m = Math.round(min);
    const h = Math.floor(m / 60), mm = m % 60;
    const ampm = h >= 12 ? 'pm' : 'am';
    const hh = h % 12 === 0 ? 12 : h % 12;
    return `${hh}:${String(mm).padStart(2, '0')}${ampm}`;
  }
}
OTR.registerScene(RoutePlannerScene);
