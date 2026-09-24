/*
 * The shift: one full day on the route, generated from the day number and stitched together from the
 * existing scenes. Phases: brief → pretrip → load → route (drive ⇄ stop) → debrief.
 *
 *   OTR.shift.start(scene)      begin (or restart) today's route
 *   OTR.shift.resume(scene)     continue a saved route
 *   OTR.shift.active()          is there a route in progress?
 *
 * State lives in OTR.save.data.shift so a half-finished day survives a refresh.
 */
window.OTR = window.OTR || {};

OTR.shift = {
  PHASES: ['brief', 'pretrip', 'load', 'route', 'debrief'],

  get state() { return OTR.save.data && OTR.save.data.shift; },
  active() {
    const st = this.state;
    if (!(st && st.phase && st.phase !== 'done')) return false;
    // a route saved before the town changed under it (an address it stops at is no longer built) cannot be
    // resumed: the drive would have nowhere to park. Set it aside once, and the hub offers a fresh route.
    if (this._checked !== st) {
      const T = OTR.town.build(st.seed);
      if ((st.route || []).some(r => !T.lotById(r.lotId))) {
        console.warn('[OTR] the saved route stops at an address the town no longer has; starting over');
        OTR.save.data.shift = null;
        this.save();
        return false;
      }
      this._checked = st;
    }
    return true;
  },
  save() { OTR.save.write(); },

  /* ================================================================ generation */
  rng(seed) { return OTR.scenery.rng('shift' + seed); },

  weatherFor(day) {
    return ['clear', 'cloudy', 'rain', 'heat', 'snow', 'clear', 'storm'][day % 7];
  },

  generate(day) {
    const R = this.rng(day);
    const T = OTR.town.build(day);
    const weather = this.weatherFor(day);
    const tod = 'morning';
    const nStops = 5;
    // pick spread-out lots, never two on the same block edge. Everything here draws on the day's seeded random
    // numbers, so a day is the same day every time it is started (it used to reshuffle with Math.random).
    const pool = T.lots.filter(l => l.kind !== 'apartment' || R() < 0.5);
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    const chosen = [];
    pool.forEach(l => {
      if (chosen.length >= nStops) return;
      if (chosen.some(c => Math.abs(c.x - l.x) < 500 && Math.abs(c.y - l.y) < 500)) return;
      chosen.push(l);
    });
    const route = chosen.map((lot, i) => ({
      lotId: lot.id, index: i + 1, done: false,
      stop: OTR.shift.stopFromLot(lot, i, R, weather, day)
    }));
    return {
      day, seed: day, phase: 'brief', weather, tod,
      clockMin: 8 * 60 + 20,
      route, stopIndex: 0,
      van: null,
      log: { items: [] },
      truck: { defects: [], pretripScore: null },
      packagesLoaded: null,
      heat: weather === 'heat' ? { hyd: 78, temp: 42 } : null,
      stats: { delivered: 0, exceptions: 0, incidents: 0 }
    };
  },

  /** Build a StopScene stop definition from a town lot. */
  stopFromLot(lot, i, R, weather, day) {
    const kind = lot.kind === 'business' ? 'business' : lot.kind === 'apartment' ? 'apartment' : 'house';
    const person = lot.person || { name: 'Resident', spec: {} };
    const pick = (list) => list[Math.floor(R() * list.length)];
    const roll = R();
    const service = roll < 0.18 ? 'signature' : roll < 0.24 ? 'adult' : 'standard';
    const homeRoll = R();
    const home = kind === 'business' ? true : homeRoll < 0.55;
    const tracking = `78${day}${String(1000 + i * 37).slice(0, 4)} ${String(2000 + i * 91).slice(0, 4)}`;
    const pkg = {
      id: 'p1', to: kind === 'business' ? lot.name : person.name,
      number: lot.number, street: lot.street, service,
      weight: 2 + Math.round(R() * 38), size: R() < 0.2 ? 'l' : R() < 0.35 ? 's' : 'm',
      tracking
    };
    // only notes the stop can honour: the planter note brings a planter to leave it behind (below). ("Side door
    // please" and "Leave with neighbour if out" used to appear with no side door and no neighbour to find.)
    const ring = 'Ring the bell, please don\'t knock: baby sleeping';
    if (R() < 0.25) pkg.note = pick(kind === 'house' ? ['Please leave behind the planter', ring] : [ring]);
    const planterNote = !!pkg.note && /planter/.test(pkg.note);
    const decoys = [
      { id: 'd1', to: pkg.to, number: String(Number(lot.number) + 2), street: lot.street, service: 'standard', weight: 5, size: 'm', tracking: tracking.replace(/\d$/, '7') },
      { id: 'd2', to: pkg.to, number: lot.number, street: lot.street.replace(/(St|Ave|Ln)$/, m => (m === 'St' ? 'Ct' : 'St')), service: 'standard', weight: 8, size: 'm', tracking: tracking.replace(/\d$/, '3') }
    ];
    const spec = kind === 'business'
      ? { number: lot.number, name: lot.name, accent: lot.accent, awning: lot.accent, hours: 'MON–FRI\n8AM–6PM', open: true, steps: 1 }
      : kind === 'apartment'
        ? { number: lot.number, name: 'THE ' + lot.street.toUpperCase().split(' ')[0], steps: 2 }
        : { number: lot.number, steps: 2 + Math.floor(R() * 2), wall: pick([0xE9DCC3, 0xDCE6EE, 0xF1E3C6, 0xC9D8C4, 0xF3E1D6]), roof: pick([0x4F4458, 0x6B3F3A, 0x3E4A5C, 0x5A4A3A]), door: pick([0x2F6B5A, 0xB8324A, 0x2A3F7A, 0x6B3F3A]), porchW: 420 + Math.round(R() * 60) };

    const props = [
      { type: 'mailbox', x: -200, art: { number: lot.number } },
      { type: 'streetsign', x: -270, art: { text: lot.street.toUpperCase() } }
    ];
    if (kind === 'house') props.push({ type: 'tree', x: 1150, depth: -9, art: { snow: weather === 'snow' } });
    if (planterNote && kind === 'house') props.push({ type: 'planter', x: 'porchX1-80', onPorch: true, id: 'planter' });
    if (weather === 'snow' && R() < 0.6) props.push({ type: 'ice', x: 120, hazard: 'ice', id: 'ice', label: 'the icy path', art: { w: 160 } });
    if (weather === 'rain' && R() < 0.5) props.push({ type: 'hose', x: 40, hazard: 'hose', id: 'hose', label: 'the garden hose' });
    if (weather === 'heat') props.push({ type: 'tree', x: 260, depth: 9, shade: true });

    const planterSpot = planterNote && kind === 'house';
    const expected = home
      ? Object.assign({ outcome: 'deliver', types: kind === 'business' ? ['reception'] : ['recipient', 'adult'] }, service === 'adult' ? { id: 'ok' } : {})
      : (service === 'standard'
        ? { outcome: 'deliver', types: ['left'], spot: planterSpot ? 'planter' : 'mat' }
        : { outcome: 'exception', code: 'NA', doorTag: true });

    return {
      id: `d${day}s${i + 1}`,
      brief: `${lot.number} ${lot.street}${kind === 'business' ? ' — ' + lot.name : ''}: ${service === 'signature' ? 'SIGNATURE REQUIRED' : service === 'adult' ? 'ADULT SIGNATURE' : 'standard delivery'}.`,
      par: 130,
      lot: { kind, spec, interior: kind === 'business' ? { kind: 'lobby', sign: lot.name, accent: lot.accent } : null },
      props,
      spots: (planterSpot ? [{ id: 'planter', label: 'Behind the planter (as the note asks)', x: 'planter', grade: 'good' }] : []).concat([
        { id: 'mat', label: 'On the doormat', x: 0, grade: planterSpot ? 'ok' : 'good', note: planterSpot ? 'Fine in a pinch, but the customer asked for the planter, out of view of the street.' : undefined },
        { id: 'steps', label: 'At the bottom of the steps', x: 'steps', grade: 'bad', note: 'Visible from the street and in the way on the steps.' }
      ]),
      packages: [pkg],
      decoys,
      stepHazard: weather === 'snow' ? 'ice' : weather === 'rain' ? 'wet' : null,
      // at a business the receptionist signs, and is a person with a name to record (it used to be "Reception")
      answer: home ? { name: person.name, spec: person.spec, adult: true, atAddress: true, delay: 2 + R() * 2, role: kind === 'business' ? 'reception' : 'resident', id: { dob: '05/14/1986', exp: '05/14/2030' } } : null,
      expected,
      lessons: []
    };
  },

  /* ================================================================ lifecycle */
  start(scene) {
    const day = OTR.save.data.day;
    OTR.save.data.shift = this.generate(day);
    this.save();
    this.go(scene);
  },

  resume(scene) { if (this.active()) this.go(scene); },

  abort() {
    OTR.save.data.shift = null;
    this.save();
  },

  /** Jump to the scene for the current phase. */
  go(scene) {
    const st = this.state;
    if (!st) return;
    switch (st.phase) {
      case 'brief': OTR.fx.transition(scene, 'ShiftBriefScene', {}); break;
      case 'pretrip': this.startScenario(scene, 'm1-pretrip'); break;
      case 'load': this.startScenario(scene, 'm6-load', { content: this.loadingContent() }); break;
      case 'route': this.toDrive(scene); break;
      case 'debrief': OTR.fx.transition(scene, 'ShiftDebriefScene', {}); break;
      default: OTR.fx.transition(scene, 'HubScene'); break;
    }
  },

  setPhase(scene, phase) {
    const st = this.state;
    if (!st) return;
    st.phase = phase;
    this.save();
    this.go(scene);
  },

  startScenario(scene, id, extra) {
    const sc = OTR.registry.get(id);
    if (!sc) return;
    OTR.fx.transition(scene, sc.scene, Object.assign({ scenarioId: id, shift: true }, extra || {}));
  },

  /** Packages for the loading phase, built from the route. */
  loadingContent() {
    const st = this.state;
    const packages = [];
    st.route.forEach((r, i) => {
      const p = r.stop.packages[0];
      packages.push({
        id: `s${i + 1}`, to: p.to, number: p.number, street: p.street, stop: i + 1,
        weight: p.weight, size: p.size, service: p.service, tracking: p.tracking,
        fragile: p.weight < 12 && i % 3 === 0, hazmat: false
      });
    });
    // a few extra pieces so the truck is not half empty
    st.route.forEach((r, i) => {
      const p = r.stop.decoys[0];
      packages.push({ id: `x${i + 1}`, to: p.to, number: p.number, street: p.street, stop: Math.min(9, i + 1), weight: 4 + (i * 7) % 30, size: p.size, tracking: p.tracking });
    });
    return {
      mode: 'load', par: 200,
      intro: {
        title: 'Load the truck',
        lines: [
          `Day ${st.day}. ${packages.length} pieces for ${st.route.length} stops.`,
          'Section A is stops 1-3 (nearest the door), B is 4-6, C is 7-9.',
          'Heavy low, fragile off the floor, and strap the floor load before you roll.'
        ]
      },
      keyLessons: ['Load in stop order so the first stops are nearest the door.'],
      packages
    };
  },

  /* ================================================================ driving & stops */
  toDrive(scene) {
    const st = this.state;
    const remaining = st.route.filter(r => !r.done);
    if (!remaining.length) { this.setPhase(scene, 'debrief'); return; }
    OTR.fx.transition(scene, 'TownDriveScene', {
      shift: true, seed: st.seed, weather: st.weather, tod: this.todNow(),
      start: st.van || null,
      route: st.route.filter(r => !r.done).map(r => ({ lotId: r.lotId, index: r.index })),
      total: st.route.length,                              // "STOP 2 OF 5", not of the stops still to do
      log: st.log,
      // the clock runs while you drive, at the rate arriveStop adds on (it used to stand still, then jump)
      clock: (elapsed) => OTR.shift.clockStr(st.clockMin + Math.floor((elapsed || 0) / 12))
    });
  },

  todNow() {
    const m = this.state.clockMin;
    return m < 10 * 60 ? 'morning' : m < 15 * 60 ? 'midday' : m < 18 * 60 ? 'afternoon' : 'evening';
  },

  clockStr(min) {
    const m = min === undefined ? this.state.clockMin : min;
    const h = Math.floor(m / 60), mm = Math.floor(m % 60);
    return `${((h + 11) % 12) + 1}:${String(mm).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
  },

  /** Called by TownDriveScene when the player parks at a stop. */
  arriveStop(driveScene, stopRef) {
    const st = this.state;
    st.van = { x: driveScene.van.x, y: driveScene.van.y, heading: driveScene.van.heading };
    st.log = driveScene.log.toJSON();
    st.clockMin += 6 + Math.round(driveScene.elapsed / 12);
    this.save();
    const entry = st.route.find(r => r.lotId === stopRef.lotId);
    const idx = st.route.indexOf(entry);
    st.stopIndex = idx;
    this.save();
    OTR.fx.transition(driveScene, 'StopScene', {
      shift: true,
      shiftStop: {
        set: { title: 'Route', tod: this.todNow(), weather: st.weather, time: st.clockMin, heat: st.heat ? { hydration: st.heat.hyd, bodyHeat: st.heat.temp, intensity: 1.1 } : null, talks: OTR_DATA.stopSets.m8_heat.talks },
        stop: entry.stop,
        index: entry.index,
        total: st.route.length
      },
      carry: { log: st.log, clock: st.clockMin, heat: st.heat }
    });
  },

  /** Called by StopScene when a shift stop is finished. */
  stopDone(stopScene, log, summary) {
    const st = this.state;
    const entry = st.route[st.stopIndex];
    if (entry) {
      entry.done = true;
      entry.result = summary || null;
    }
    st.log = log.toJSON();
    st.clockMin += 8 + Math.round((summary && summary.time ? summary.time : 60) / 12);
    if (stopScene.heat) st.heat = { hyd: stopScene.heat.hyd, temp: stopScene.heat.temp };
    if (summary && summary.outcome === 'delivered') st.stats.delivered++;
    else if (summary && summary.outcome === 'exception') st.stats.exceptions++;
    this.save();
    const remaining = st.route.filter(r => !r.done);
    if (!remaining.length) this.setPhase(stopScene, 'debrief');
    else this.toDrive(stopScene);
  },

  /** Hook for OTR.flow.complete: swallow scenario results that belong to the shift. */
  intercept(scene, id, result) {
    const st = this.state;
    if (!st || !scene.shiftMode) return false;
    const log = OTR.ScoreLog.from(st.log);
    // the phase's most important lesson: the top of its ranked takeaways, or the scene's own first one
    const top = result.log && result.log.takeaways ? (result.log.takeaways()[0] || {}).text : null;
    const firstLesson = top || [].concat(result.lessons || []).map(l => (l && l.text) || l)[0];
    if (st.phase === 'pretrip') {
      st.truck.pretripScore = result.ratios;
      log.check('safety', Math.round((result.ratios.safety || 0) * 4), 4, 'Pre-trip inspection', { lesson: firstLesson });
      log.check('efficiency', Math.round((result.ratios.efficiency || 0) * 2), 2, 'Pre-trip done briskly');
      st.log = log.toJSON();
      st.clockMin += 14;
      this.save();
      this.setPhase(scene, 'load');
      return true;
    }
    if (st.phase === 'load') {
      log.check('efficiency', Math.round((result.ratios.efficiency || 0) * 4), 4, 'Truck loaded in stop order', { lesson: firstLesson });
      log.check('safety', Math.round((result.ratios.safety || 0) * 3), 3, 'Load secured safely');
      st.log = log.toJSON();
      st.clockMin += 22;
      this.save();
      this.setPhase(scene, 'route');
      return true;
    }
    return false;
  },

  /* ================================================================ finishing */
  finish(scene) {
    const st = this.state;
    const log = OTR.ScoreLog.from(st.log);
    const cats = OTR.scoring.CATS;
    const ratios = log.ratios(cats);
    const stars = {};
    cats.forEach(c => { stars[c] = OTR.scoring.stars(ratios[c]); });
    const rec = {
      day: st.day, at: Date.now(), stars, ratios,
      delivered: st.stats.delivered, exceptions: st.stats.exceptions,
      weather: st.weather, minutes: Math.round(st.clockMin - (8 * 60 + 20))
    };
    const S = OTR.save.data;
    S.route = S.route || { days: 0, best: { safety: 0, efficiency: 0, service: 0 }, history: [] };
    S.route.days++;
    cats.forEach(c => { S.route.best[c] = Math.max(S.route.best[c] || 0, stars[c]); });
    S.route.history.push(rec);
    S.route.history = S.route.history.slice(-10);
    S.shift = null;
    OTR.save.endDay();
    return rec;
  }
};
