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

  /**
   * The career's town: built once from a fixed seed and kept (the addresses, buildings and residents stay where they
   * are from day to day; only the day's stops, weather and traffic change). It used to be rebuilt from the day
   * number, so 104 Maple Ave was Marcus Bell's house one day and Helen Ortiz's the next.
   */
  townSeed() {
    const S = OTR.save.data;
    if (S && !S.townSeed) S.townSeed = 1;
    return (S && S.townSeed) || 1;
  },

  /**
   * The kinds of stop a day is made of. A day draws five different ones from its seed (never more than one of a kind),
   * so it mixes situations from the modules instead of five doormats.
   */
  STOP_TYPES: ['leave', 'handoff', 'adult', 'exception', 'business', 'apartment', 'dog'],

  generate(day) {
    const R = this.rng(day);
    const seed = this.townSeed();
    const T = OTR.town.build(seed);
    const weather = this.weatherFor(day);
    const tod = 'morning';
    const nStops = 5;
    // Everything here draws on the day's seeded random numbers, so a day is the same day every time it is started.
    const shuffled = (list) => { const a = list.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    // a leave-at-door stop and a person at the door every day; the other three vary
    const types = ['leave', 'handoff'].concat(shuffled(['adult', 'exception', 'business', 'apartment', 'dog']).slice(0, nStops - 2));
    const pool = shuffled(T.lots);
    const kindFor = (type) => (type === 'business' ? 'business' : type === 'apartment' ? 'apartment' : 'house');
    const chosen = [];
    // spread out: never two on the same block edge
    const free = (l) => !chosen.some(c => Math.abs(c.lot.x - l.x) < 500 && Math.abs(c.lot.y - l.y) < 500);
    shuffled(types).forEach(type => {
      let lot = pool.find(l => l.kind === kindFor(type) && free(l));
      if (!lot) { type = 'leave'; lot = pool.find(l => l.kind === 'house' && free(l)); }   // no such building left
      if (lot) chosen.push({ lot, type });
    });
    const route = chosen.map((c, i) => ({
      lotId: c.lot.id, index: i + 1, done: false, type: c.type,
      stop: OTR.shift.stopFromLot(c.lot, i, R, weather, day, c.type, T.lots.indexOf(c.lot))
    }));
    return {
      day, seed, phase: 'brief', weather, tod,
      clockMin: 8 * 60 + 20,
      route, stopIndex: 0, atStop: null,
      van: null,
      log: { items: [] },
      truck: { defects: [], pretripScore: null, heldAtGate: false },
      heat: weather === 'heat' ? { hyd: 78, temp: 42 } : null,
      stats: { delivered: 0, exceptions: 0, incidents: 0 }
    };
  },

  /** Build a StopScene stop definition from a town lot, for a kind of stop (STOP_TYPES). */
  stopFromLot(lot, i, R, weather, day, type, lotIndex) {
    type = type || 'leave';
    const kind = lot.kind === 'business' ? 'business' : lot.kind === 'apartment' ? 'apartment' : 'house';
    const person = lot.person || { name: 'Resident', spec: {} };
    const pick = (list) => list[Math.floor(R() * list.length)];
    const service = type === 'adult' ? 'adult' : (type === 'handoff' || type === 'exception') ? 'signature'
      : type === 'business' ? pick(['standard', 'signature']) : 'standard';
    const home = type !== 'leave' && type !== 'exception';
    const tracking = `78${day}${String(1000 + i * 37).slice(0, 4)} ${String(2000 + i * 91).slice(0, 4)}`;
    const weight = 2 + Math.round(R() * 38);
    const pkg = {
      id: 'p1', to: kind === 'business' ? lot.name : person.name,
      number: lot.number, street: lot.street, service,
      weight, size: R() < 0.2 ? 'l' : R() < 0.35 ? 's' : 'm',
      tracking
    };
    // light pieces are sometimes fragile, and the label shows it (the load used to invent it on its own)
    if (weight < 12 && R() < 0.4) { pkg.marks = ['fragile']; pkg.fragile = true; }
    // Notes only on a standard package: "leave it behind the planter" on a signature package asked the trainee to
    // break the rule it teaches. Only notes the stop can honour.
    const ring = 'Ring the bell, please don\'t knock: baby sleeping';
    let spotChoice = null;
    if (type === 'leave') {
      spotChoice = pick(['planter', 'mat', 'mat']);
      if (spotChoice === 'planter') pkg.note = 'Please leave behind the planter';
      else if (R() < 0.35) pkg.note = ring;
    } else if (type === 'dog') pkg.note = 'Dog in yard';
    else if (service === 'standard' && R() < 0.2) pkg.note = ring;
    const planterSpot = spotChoice === 'planter';
    const decoys = [
      { id: 'd1', to: pkg.to, number: String(Number(lot.number) + 2), street: lot.street, service: 'standard', weight: 5, size: 'm', tracking: tracking.replace(/\d$/, '7') },
      { id: 'd2', to: pkg.to, number: lot.number, street: lot.street.replace(/(St|Ave|Ln)$/, m => (m === 'St' ? 'Ct' : 'St')), service: 'standard', weight: 8, size: 'm', tracking: tracking.replace(/\d$/, '3') }
    ];
    // the house looks like the one on the map (its roof is the map's roof colour, darker), and the models vary
    const tint = OTR.townArt.ROOF_TINTS[(lotIndex >= 0 ? lotIndex : i) % OTR.townArt.ROOF_TINTS.length];
    const spec = kind === 'business'
      ? { number: lot.number, name: lot.name, accent: lot.accent, awning: lot.accent, hours: 'MON–FRI\n8AM–6PM', open: true, steps: 1 }
      : kind === 'apartment'
        ? { number: lot.number, name: 'THE ' + lot.street.toUpperCase().split(' ')[0], steps: 2 }
        : {
          number: lot.number, steps: 1 + Math.floor(R() * 3),
          wall: pick([0xE9DCC3, 0xDCE6EE, 0xF1E3C6, 0xC9D8C4, 0xF3E1D6]), roof: OTR.color.shade(tint, -0.5),
          door: pick([0x2F6B5A, 0xB8324A, 0x2A3F7A, 0x6B3F3A]), porchW: 400 + Math.round(R() * 80),
          siding: pick(['lap', 'shingle']), numberOn: R() < 0.3 ? 'column' : 'wall', bell: R() < 0.8, stories: R() < 0.35 ? 1 : 2
        };

    const props = [
      { type: 'mailbox', x: -200, art: { number: lot.number } },
      { type: 'streetsign', x: -270, art: { text: lot.street.toUpperCase() } }
    ];
    if (kind === 'house' && type !== 'dog') props.push({ type: 'tree', x: 1150, depth: -9, art: { snow: weather === 'snow' } });
    if (planterSpot) props.push({ type: 'planter', x: 'porchX1-80', onPorch: true, id: 'planter' });
    if (weather === 'snow' && R() < 0.6) props.push({ type: 'ice', x: 120, hazard: 'ice', id: 'ice', label: 'the icy path', art: { w: 160 } });
    if (weather === 'rain' && R() < 0.5 && type !== 'dog') props.push({ type: 'hose', x: 40, hazard: 'hose', id: 'hose', label: 'the garden hose' });
    if (weather === 'heat') props.push({ type: 'tree', x: 260, depth: 9, shade: true });

    const expected = type === 'exception'
      ? { outcome: 'exception', code: 'NA', doorTag: true }
      : type === 'leave'
        ? { outcome: 'deliver', types: ['left'], spot: planterSpot ? 'planter' : 'mat' }
        : Object.assign({ outcome: 'deliver', types: kind === 'business' ? ['reception'] : ['recipient', 'adult'] }, service === 'adult' ? { id: 'ok' } : {});

    const stop = {
      id: `d${day}s${i + 1}`,
      brief: `${lot.number} ${lot.street}${kind === 'business' ? ' — ' + lot.name : ''}: ${service === 'signature' ? 'SIGNATURE REQUIRED' : service === 'adult' ? 'ADULT SIGNATURE' : 'standard delivery'}.${type === 'dog' ? ' Customer note: "Dog in yard."' : ''}`,
      par: 130,
      lot: { kind, spec, interior: kind === 'business' ? { kind: 'lobby', sign: lot.name, accent: lot.accent } : null },
      props,
      spots: type !== 'leave' ? null : (planterSpot ? [{ id: 'planter', label: 'Behind the planter', report: 'behind the planter, as the note asks', x: 'planter', grade: 'good' }] : []).concat([
        { id: 'mat', label: 'On the doormat', x: 0, grade: planterSpot ? 'ok' : 'good', note: planterSpot ? 'Fine in a pinch, but the customer asked for the planter, out of view of the street.' : undefined },
        { id: 'steps', label: 'At the bottom of the steps', x: 'steps', grade: 'bad', note: 'Visible from the street and in the way on the steps.' }
      ]),
      packages: [pkg],
      decoys,
      stepHazard: weather === 'snow' ? 'ice' : weather === 'rain' ? 'wet' : null,
      // at a business the receptionist signs, and is a person with a name to record
      answer: home ? { name: person.name, spec: person.spec, adult: true, atAddress: true, delay: 2 + R() * 2, role: kind === 'business' ? 'reception' : 'resident', id: { dob: '05/14/1986', exp: '05/14/2030' } } : null,
      expected,
      lessons: []
    };
    if (type === 'dog') {
      // a dog loose in the front yard (the Module 8 situation): the owner is called out and hands over at the gate
      const dg1 = OTR_DATA.stopSets.m8_dog.stops[0];
      stop.fence = { x0: -120, x1: 980, gate: 40, color: 0xFFFFFF };
      stop.props.push({ type: 'sign', x: -105, depth: 9, art: { text: 'BEWARE\nOF DOG' } }, { type: 'doghouse', x: 210, depth: 7 }, { type: 'bowl', x: 290, depth: 7 });
      stop.dog = Object.assign({}, dg1.dog);
      stop.triggers = [{ on: 'gate', talk: 'gate' }];
      stop.talks = { gate: dg1.talks.gate };
    }
    if (!stop.spots) delete stop.spots;
    return stop;
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
      // a reload (or quit) inside a stop reopens that stop, not the drive to it (which parked, logged and moved the
      // clock a second time)
      case 'route': if (st.atStop != null && st.route[st.atStop] && !st.route[st.atStop].done) this.openStop(scene); else this.toDrive(scene); break;
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

  /**
   * Packages for the loading phase: exactly the day's pieces, each as its label shows it at the stop. (Five extra
   * pieces used to be loaded for addresses that were not on the route, tagged with stop numbers they did not belong
   * to, and never delivered.)
   */
  loadingContent() {
    const st = this.state;
    const packages = st.route.map((r, i) => {
      const p = r.stop.packages[0];
      return {
        id: `s${i + 1}`, to: p.to, number: p.number, street: p.street, stop: i + 1,
        weight: p.weight, size: p.size, service: p.service, tracking: p.tracking,
        fragile: !!p.fragile, hazmat: false
      };
    });
    const n = st.route.length;
    return {
      mode: 'load', par: 200,
      intro: {
        title: 'Load the truck',
        lines: [
          `Day ${st.day}. ${packages.length} pieces for ${n} stops.`,
          n > 3 ? `Section A is stops 1-3 (nearest the door), B is stops 4-${n}.` : `Section A is stops 1-${n} (nearest the door).`,
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
    // A truck that rolled out with a defect the pre-trip missed is stopped at the gate check on the way out: held for
    // the fix, and the time counts against the day (it used to drive all day with, say, the cargo door unlatched).
    let notice = null;
    const missed = (st.truck && st.truck.missed) || [];
    if (missed.length && !st.truck.heldAtGate) {
      st.truck.heldAtGate = true;
      st.clockMin += 10;
      const log = OTR.ScoreLog.from(st.log);
      log.penalty('efficiency', 2, `Held at the gate for a missed defect (${missed.length})`, { group: 'drive', lesson: 'A defect the walkaround misses is found later, when it costs more. Look properly before you sign off.' });
      st.log = log.toJSON();
      this.save();
      notice = {
        title: 'Held at the gate',
        body: `The yard check found what the pre-trip missed:\n${missed.slice(0, 3).join('\n')}${missed.length > 3 ? `\n+ ${missed.length - 3} more` : ''}\n\nThe truck is held 10 minutes for the fix before you can roll.`,
        button: 'Roll out'
      };
    }
    OTR.fx.transition(scene, 'TownDriveScene', {
      shift: true, seed: st.seed, weather: st.weather, tod: this.todNow(),
      start: st.van || null,
      route: st.route.filter(r => !r.done).map(r => ({ lotId: r.lotId, index: r.index })),
      total: st.route.length,                              // "STOP 2 OF 5", not of the stops still to do
      log: st.log,
      notice,
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
    const entry = st.route.find(r => r.lotId === stopRef.lotId);
    st.stopIndex = st.route.indexOf(entry);
    st.atStop = st.stopIndex;                  // saved: a reload from here on reopens the stop
    st.stopLog = null;
    this.save();
    this.openStop(driveScene);
  },

  /** Open the stop the van is parked at (on arrival, or again after a reload inside it). */
  openStop(scene) {
    const st = this.state;
    const entry = st.route[st.atStop];
    OTR.fx.transition(scene, 'StopScene', {
      shift: true,
      shiftStop: {
        set: { title: 'Route', tod: this.todNow(), weather: st.weather, time: st.clockMin, heat: st.heat ? { hydration: st.heat.hyd, bodyHeat: st.heat.temp, intensity: 1.1 } : null, talks: OTR_DATA.stopSets.m8_heat.talks },
        stop: entry.stop,
        index: entry.index,
        total: st.route.length
      },
      carry: { log: st.stopLog || st.log, clock: st.clockMin, heat: st.heat }
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
    st.atStop = null;
    st.stopLog = null;
    st.clockMin += 8 + Math.round((summary && summary.time ? summary.time : 60) / 12);
    if (stopScene.heat) st.heat = { hyd: stopScene.heat.hyd, temp: stopScene.heat.temp };
    if (summary && summary.outcome === 'delivered') st.stats.delivered++;
    else if (summary && summary.outcome === 'exception') st.stats.exceptions++;
    this.save();
    const remaining = st.route.filter(r => !r.done);
    if (!remaining.length) this.setPhase(stopScene, 'debrief');
    else this.toDrive(stopScene);
  },

  /**
   * Pause → Restart inside a route day starts the part again, but not with a clean sheet: the mistakes made before
   * the restart stay on the day's record, and the restart itself is logged for the debrief (it used to be a free
   * do-over). Only the part's own checks (group) are dropped, to be earned again.
   */
  restartLog(log, group, label) {
    const items = log.items.filter(it => !(group && it.group === group && it.kind === 'check' && !it.critical));
    const out = OTR.ScoreLog.from({ items });
    // a line on the record, not a fine: what it costs is that nothing before it was erased
    out.penalty('efficiency', 0, label, { group: group || log.group });
    return out.toJSON();
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
      st.loadMap = (result.stats && result.stats.placement) || null;     // the van shelves at each stop follow it
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
    const criticals = log.criticals(undefined, cats);
    const stars = {};
    // the same rules as every scenario: a critical mistake (a hit pedestrian, a signature package left unattended)
    // caps its category at one star, whatever the rest of the day was like
    cats.forEach(c => {
      stars[c] = log.tested(c) ? OTR.scoring.stars(ratios[c]) : 0;
      if (criticals.some(it => it.cat === c)) stars[c] = Math.min(1, stars[c]);
    });
    const total = cats.reduce((n, c) => n + stars[c], 0);
    const rec = {
      day: st.day, at: Date.now(), stars, ratios,
      delivered: st.stats.delivered, exceptions: st.stats.exceptions,
      weather: st.weather, minutes: Math.round(st.clockMin - (8 * 60 + 20))
    };
    // Everything the debrief shows is kept with the day (a reload on the debrief used to lose it for good, and the
    // hub can open it again): the map, what to work on and what went well.
    const last = Object.assign({}, rec, {
      seed: st.seed,
      stops: st.route.map(r => ({ lotId: r.lotId, outcome: r.result ? r.result.outcome : null })),
      work: this.workOn(log, cats),
      well: this.wentWell(log),
      rolledOut: (st.truck && st.truck.missed) || [],
      criticals: criticals.length,
      note: OTR.util.pick(OTR_DATA.config.dayNotes[criticals.length || stars.safety <= 1 ? 'safety' : total >= 8 ? 'great' : total >= 5 ? 'good' : 'rough'])
    });
    const S = OTR.save.data;
    S.route = S.route || { days: 0, best: { safety: 0, efficiency: 0, service: 0 }, history: [] };
    S.route.days++;
    cats.forEach(c => { S.route.best[c] = Math.max(S.route.best[c] || 0, stars[c]); });
    S.route.history.push(rec);
    S.route.history = S.route.history.slice(-10);
    S.route.last = last;
    S.shift = null;
    OTR.save.endDay();
    return last;
  },

  /**
   * The day's mistakes for the debrief, one row per kind of mistake with its count and the points it cost in total
   * (repeats add up: six kerbs cost more than one), critical first, then by cost. The top mistake of every category
   * is moved up with them, so a day of driving mistakes cannot hide the doorstep ones.
   */
  workOn(log, cats) {
    const rows = [];
    log.mistakes(undefined, cats).forEach(it => {
      let r = rows.find(o => o.label === it.label);
      if (!r) { r = { label: it.label, lesson: it.lesson || null, cat: it.cat, n: 0, lost: 0, critical: false, partial: false, order: rows.length }; rows.push(r); }
      r.n++;
      r.lost += it.kind === 'penalty' ? -it.got : it.max - it.got;
      r.critical = r.critical || !!it.critical;
      r.partial = r.partial || (it.kind === 'check' && it.got > 0);
      r.lesson = r.lesson || it.lesson || null;
    });
    const rank = (a, b) => (b.critical - a.critical) || (b.lost - a.lost) || (a.order - b.order);
    rows.sort(rank);
    const firsts = cats.map(c => rows.find(r => r.cat === c)).filter(Boolean);
    const head = rows.filter(r => r.critical).concat(firsts.filter(r => !r.critical).sort(rank));
    return head.concat(rows.filter(r => head.indexOf(r) < 0))
      .map(r => ({ label: r.label, lesson: r.lesson, cat: r.cat, n: r.n, lost: r.lost, critical: r.critical, partial: r.partial && !r.critical && r.n === 1 }));
  },

  /** Checks passed in full, one row per kind with its count, the most often first. */
  wentWell(log) {
    const rows = [];
    log.items.filter(it => it.kind === 'check' && it.good && it.max > 0).forEach(it => {
      const r = rows.find(o => o.label === it.label);
      if (r) r.n++; else rows.push({ label: it.label, cat: it.cat, n: 1 });
    });
    return rows.sort((a, b) => b.n - a.n);
  }
};
