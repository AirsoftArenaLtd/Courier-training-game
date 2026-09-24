/*
 * Module 1 · Road Hazards — a hazard drill driven on the town engine.
 *
 * Six checkpoints across town. Each one arms a hazard that spawns on the road in front of the van:
 * a ball with a child behind it, a car door, standing water, a crossing, a school bus. Nothing is
 * multiple choice — every hazard is judged on the speed, the clearance and the inputs at the moment
 * it matters. The drill inherits the whole driving model, so the stop signs, lights, speed limits,
 * seatbelt and backing rules are all still live while you deal with it.
 */
class DrivingScene extends TownDriveScene {
  constructor() { super('DrivingScene'); }

  init(data) {
    data = data || {};
    this.initData = data;
    const fallback = OTR.registry.all().find(s => s.scene === 'DrivingScene');
    this.scenarioId = data.scenarioId || (fallback && fallback.id);
    this.scenario = OTR.registry.get(this.scenarioId);
    this.content = data.content || (this.scenario ? OTR.registry.content(this.scenario) : null);
    this.finished = false;
    this._leaving = false;
    this._openModals = 0;
    this.score = 0;

    const C = this.content;
    this.d = { seed: (C && C.seed) || 7, weather: 'clear', tod: 'midday', clock: () => this.drillClock() };
    this.lab = false;
    this.shiftMode = false;
    this.quietStart = true;
    this.started = false;
    this.hazards = [];
    this.armedFor = {};
    this.results = [];
  }

  /* ================================================================ setup */
  create() {
    const T = OTR.town.build(this.d.seed);
    this.d.route = this.pickRoute(T);
    super.create();
    this.buildDrillHud();
    this.time.delayedCall(120, () => this.openIntro());
  }

  /** Nearest-neighbour walk from the depot, so the checkpoints make a sensible loop. */
  pickRoute(T) {
    const n = (this.content && this.content.checkpoints) || 6;
    const pool = T.lots.filter(l => l.curb).slice();
    const route = [];
    let from = { x: T.depot.curb.x, y: T.laneY(0, 1) };
    for (let i = 0; i < n && pool.length; i++) {
      let best = 0, bestD = 1e9;
      pool.forEach((l, j) => {
        const d = Phaser.Math.Distance.Between(from.x, from.y, l.curb.x, l.curb.y);
        // keep them a street apart so there is room for a hazard between checkpoints
        const score = d < 420 ? d + 3000 : d;
        if (score < bestD) { bestD = score; best = j; }
      });
      const lot = pool.splice(best, 1)[0];
      route.push({ lotId: lot.id, index: i + 1 });
      from = lot.curb;
    }
    return route;
  }

  onCreated() {
    this.log.setGroup('drive');
    this.drillStart = 0;
  }

  buildDrillHud() {
    this.hazardPill = this.add.container(OTR.W / 2, OTR.H - 96).setScrollFactor(0).setDepth(806).setVisible(false);
    this.hazardBg = OTR.tex.liveShape(this);
    this.hazardText = OTR.txt(this, 0, 0, '', 19, '#ffffff', { weight: '900' });
    this.hazardPill.add([this.hazardBg, this.hazardText]);
  }

  warn(text, color) {
    this.hazardText.setText(text);
    const w = this.hazardText.width + 46, h = 42;
    this.hazardBg.redraw((g) => {
      g.fillStyle(0x16062B, 0.92); g.fillRoundedRect(-w / 2, -h / 2, w, h, 21);
      g.lineStyle(3, color || 0xFFC83D, 1); g.strokeRoundedRect(-w / 2, -h / 2, w, h, 21);
    });
    this.hazardPill.setVisible(true).setScale(0.9);
    this.tweens.add({ targets: this.hazardPill, scale: 1, duration: 180, ease: 'Back.easeOut' });
    if (this.warnTimer) this.warnTimer.remove();
    this.warnTimer = this.time.delayedCall(3200, () => this.hazardPill.setVisible(false));
  }

  openIntro() {
    const C = this.content;
    OTR.ui.modal(this, {
      title: C.intro.title, w: 720, h: 440, depth: 5000,
      build: (box, api, w, h) => {
        let y = -h / 2 + 96;
        C.intro.lines.forEach(line => {
          const dot = this.add.image(-w / 2 + 56, y + 12, 'ic_arrow').setDisplaySize(20, 20).setTint(0xFF6600);
          const t = OTR.txt(this, -w / 2 + 78, y, line, 18, '#3A2A50', { ox: 0, oy: 0, bold: false, wrap: w - 140, lineSpacing: 3 });
          box.add([dot, t]);
          y += t.height + 14;
        });
      },
      buttons: [{
        label: 'Roll out', skin: 'orange', key: ['ENTER', 'SPACE'], onClick: () => {
          this.started = true;
          OTR.audio.play('engine_start');
          this.toast('Buckle up (B) before you move', 0xFFC83D);
        }
      }]
    });
  }

  drillClock() {
    const t = Math.max(0, Math.round(this.elapsed));
    return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
  }

  /* ================================================================ frame */
  update(time, delta) {
    if (!this.started || this.finished) {
      // still hand new objects to the right camera, or the intro card is drawn twice (once zoomed, behind itself)
      this.syncCameras();
      this.updateHud();
      return;
    }
    super.update(time, delta);
  }

  stopLabelFor() {
    const done = this.route.filter(r => r.done).length;
    return `CHECKPOINT ${Math.min(done + 1, this.route.length)} OF ${this.route.length}`;
  }

  onUpdate(dt) {
    this.armHazards();
    for (let i = this.hazards.length - 1; i >= 0; i--) {
      const hz = this.hazards[i];
      hz.t += dt;
      hz.minMph = Math.min(hz.minMph === undefined ? 99 : hz.minMph, this.mph());
      this['step_' + hz.kind](hz, dt);
      if (hz.dead && !hz.judged) {
        // expired with no moment of truth: all that is left to judge is whether they slowed for it
        if (hz.minMph < 9) this.pass(hz, 'You slowed right down for it.'); else this.fail(hz);
      }
      if (hz.dead) { this.clearHazard(hz); this.hazards.splice(i, 1); }
    }
  }

  /* ---------------------------------------------------------------- geometry helpers */
  fwd() { return { x: Math.cos(this.van.heading), y: Math.sin(this.van.heading) }; }
  right() { return { x: -Math.sin(this.van.heading), y: Math.cos(this.van.heading) }; }
  ahead(dist) {
    const F = this.fwd();
    return { x: this.van.x + F.x * dist, y: this.van.y + F.y * dist };
  }
  /**
   * Where a point sits relative to the van, in the van's own frame. `fd` is measured from the front bumper
   * (negative once the point is alongside or behind it) and `lat` from the van's centre line.
   */
  rel(p) {
    const F = this.fwd(), S = this.right();
    const dx = p.x - this.van.x, dy = p.y - this.van.y;
    return { fd: dx * F.x + dy * F.y - this.van.g.nose * this.P, lat: dx * S.x + dy * S.y };
  }
  mph() { return OTR.vehicle.mph(this.van); }
  /** True when a point is touching the van's body. */
  touching(p, pad) {
    const r = this.relToVan(p.x, p.y);
    return Math.abs(r.fd) < r.hl + (pad || 6) && Math.abs(r.lat) < r.hw + (pad || 6);
  }

  /** Arm the hazard belonging to the checkpoint the driver is heading for. */
  armHazards() {
    const stop = this.activeStop;
    if (!stop || stop.done) return;
    const list = this.content.hazards.filter(hz => hz.at === this.activeIndex && !this.armedFor[hz.id]);
    if (!list.length) return;
    const def = list[0];
    const d = Phaser.Math.Distance.Between(this.van.x, this.van.y, stop.lot.park.x, stop.lot.park.y);
    if (d > 900 || d < 260) return;
    if (def.kind !== 'phone') {
      // Far enough ahead that a driver at the limit who reacts promptly can stop (about 25 m at 25 mph),
      // and no further: arriving too fast is exactly what the drill is there to show.
      const dist = OTR.util.clamp(260 + Math.abs(this.van.u) * this.P * 1.1, 300, 560);
      const p = this.ahead(dist);
      if (!this.T.onRoad(p.x, p.y)) return;
      if (this.mph() < 6) return;                                   // needs to be rolling for the hazard to mean anything
      this.armedFor[def.id] = true;
      this['spawn_' + def.kind](def, p, dist);
    } else {
      this.armedFor[def.id] = true;
      this['spawn_phone'](def);
    }
  }

  newHazard(def, extra) {
    const hz = Object.assign({ def, kind: def.kind, t: 0, objs: [], blockers: [], judged: false, dead: false }, extra || {});
    this.hazards.push(hz);
    this.warn(def.warn, 0xFFC83D);
    OTR.audio.play('buzzer');
    return hz;
  }

  clearHazard(hz) {
    hz.objs.forEach(o => { if (o && o.destroy) o.destroy(); });
    hz.blockers.forEach(b => {
      const i = this.blockers.indexOf(b);
      if (i >= 0) this.blockers.splice(i, 1);
    });
    if (hz.patch) {
      const i = this.gripPatches.indexOf(hz.patch);
      if (i >= 0) this.gripPatches.splice(i, 1);
    }
  }

  blockAround(x, y, w, h, what) {
    const b = { x: x - w / 2, y: y - h / 2, w, h, what: what || 'an obstacle' };
    this.blockers.push(b);
    return b;
  }

  /* ---------------------------------------------------------------- judging */
  pass(hz, note) {
    if (hz.judged) return;
    hz.judged = true;
    const def = hz.def;
    this.log.check('safety', def.points, def.points, def.title);
    this.results.push({ id: def.id, ok: true });
    this.warn('✓ ' + (note || def.pass), 0x2BC48A);
    OTR.audio.play('success');
    OTR.fx.flash(this, 0x2BC48A, 0.12, 200);
  }

  fail(hz, text, extraPenalty) {
    if (hz.judged) return;
    hz.judged = true;
    const def = hz.def;
    this.log.check('safety', 0, def.points, def.title, { lesson: def.lesson, severity: 'major' });
    if (extraPenalty) this.log.penalty('safety', extraPenalty, text || def.fail, { severity: 'major' });
    this.results.push({ id: def.id, ok: false });
    this.warn('✗ ' + (text || def.fail), 0xF0435A);
    OTR.audio.play('alarm');
    OTR.fx.flash(this, 0xF0435A, 0.22, 280);
    OTR.fx.shake(this, 200, 0.008);
  }

  /* ================================================================ hazards */

  /* ---- ball, then a child after it */
  spawn_ball(def, p) {
    const S = this.right();
    const hz = this.newHazard(def, { p, side: S, childOut: false });
    const from = { x: p.x + S.x * 230, y: p.y + S.y * 230 };
    const to = { x: p.x - S.x * 260, y: p.y - S.y * 260 };
    const ball = this.add.image(from.x, from.y, OTR.townArt.ballTop(this)).setDepth(27).setScale(0.7);
    this.tweens.add({ targets: ball, x: to.x, y: to.y, duration: 2100, ease: 'Sine.easeOut' });
    this.tweens.add({ targets: ball, scale: 0.8, duration: 260, yoyo: true, repeat: 6, ease: 'Sine.inOut' });
    hz.objs.push(ball);
    hz.ball = ball;
    hz.childFrom = from;
  }

  step_ball(hz, dt) {
    const def = hz.def;
    if (!hz.childOut && hz.t > 0.85) {
      hz.childOut = true;
      const c = this.add.image(hz.childFrom.x, hz.childFrom.y, OTR.townArt.pedTop(this, 0xFFC83D)).setDepth(27).setScale(0.78);
      hz.objs.push(c);
      hz.child = c;
      hz.target = { x: hz.p.x - hz.side.x * 30, y: hz.p.y - hz.side.y * 30 };
      this.warn('CHILD!', 0xF0435A);
    }
    if (hz.child && !hz.arrived) {
      const dx = hz.target.x - hz.child.x, dy = hz.target.y - hz.child.y;
      const d = Math.hypot(dx, dy);
      if (d < 6) hz.arrived = true;
      else { hz.child.x += (dx / d) * 95 * dt; hz.child.y += (dy / d) * 95 * dt; }   // a running child, ~4.7 m/s
    }
    if (!hz.child) return;
    const r = this.rel({ x: hz.child.x, y: hz.child.y });
    const vanLen = this.van.g.hl * 2 * this.P;
    if (!hz.judged) {
      if (this.touching(hz.child)) this.fail(hz, def.hit, 4);
      else if (r.fd < 40 && r.fd > -vanLen && Math.abs(r.lat) < 110) {
        // the bumper has reached the child: only a crawl or a stop is acceptable
        if (this.mph() < 4) this.pass(hz); else this.fail(hz);
      } else if (r.fd < -vanLen) {
        if (this.mph() < 9) this.pass(hz); else this.fail(hz);
      } else if (hz.arrived && r.fd < 560 && this.mph() < 3) {
        // held back with a child standing in the road: that is the whole point
        hz.wait = (hz.wait || 0) + dt;
        if (hz.wait > 0.7) this.pass(hz, 'You held back with a child in the road. Exactly right.');
      } else hz.wait = 0;
    }
    if (hz.judged && !hz.retreat) {
      hz.retreat = true;
      this.tweens.add({ targets: hz.child, x: hz.childFrom.x, y: hz.childFrom.y, duration: 900, ease: 'Sine.easeInOut' });
      this.time.delayedCall(1400, () => { hz.dead = true; });
    }
    if (hz.t > 15) hz.dead = true;
  }

  /** Axis-aligned footprint of something lying along the van's current heading (w along, h across). */
  footprint(x, y, along, across, what) {
    const horiz = Math.abs(Math.cos(this.van.heading)) > 0.7;
    return this.blockAround(x, y, horiz ? along : across, horiz ? across : along, what);
  }

  /* ---- parked car with a door about to open */
  spawn_door(def, p) {
    const S = this.right(), A = OTR.townArt;
    const kerb = { x: p.x + S.x * (A.ROAD / 2 - 30), y: p.y + S.y * (A.ROAD / 2 - 30) };
    const hz = this.newHazard(def, { p: kerb });
    const car = this.add.image(kerb.x, kerb.y, OTR.art.carTop(this, 0x3DA5FF)).setDepth(26).setScale(0.7, 0.88).setRotation(this.van.heading + Math.PI / 2);
    hz.objs.push(car);
    hz.car = car;
    hz.blockers.push(this.footprint(kerb.x, kerb.y, 95, 40, 'a parked car'));
    // the door hangs off the traffic side, hinged at the front of the car
    const hinge = this.add.container(kerb.x - S.x * 19 + Math.cos(this.van.heading) * 16, kerb.y - S.y * 19 + Math.sin(this.van.heading) * 16).setDepth(27);
    hinge.setRotation(this.van.heading + Math.PI);    // local +y then points out into the lane
    const leaf = this.add.rectangle(0, 0, 4, 46, 0x3DA5FF).setOrigin(0.5, 0);
    const glass = this.add.rectangle(0, 8, 3, 22, 0x233A55).setOrigin(0.5, 0);
    hinge.add([leaf, glass]);
    hz.objs.push(hinge);
    hz.hinge = hz.door = hinge;
    hz.leaf = leaf;
    hz.reach = 0;
  }

  step_door(hz, dt) {
    const def = hz.def;
    const r = this.rel({ x: hz.car.x, y: hz.car.y });
    if (!hz.opened && (r.fd < 240 || hz.t > 1.6)) {
      hz.opened = true;
      this.warn('DOOR!', 0xF0435A);
      OTR.audio.play('thud');
      this.tweens.add({
        targets: hz, reach: 20, duration: 420, ease: 'Back.easeOut',          // a car door: about 1 m out into the lane
        onUpdate: () => { hz.leaf.setSize(4, 46).setScale(1, Math.max(0.02, hz.reach / 46)); }
      });
    }
    if (!hz.judged && hz.opened) {
      // gap between the van's side and the tip of the open door
      const gap = Math.abs(r.lat) - 19 - hz.reach - this.van.g.hw * this.P;
      if (r.fd < 30 && r.fd > -80) {
        if (gap < 0 && this.mph() > 3) this.fail(hz, def.hit, 3);
        else if (gap > 20 || this.mph() < 8) this.pass(hz);
        else this.fail(hz);
      } else if (r.fd < 560 && this.mph() < 3) {
        hz.wait = (hz.wait || 0) + dt;
        if (hz.wait > 1.4) this.pass(hz, 'You waited rather than squeezing past an open door.');
      } else hz.wait = 0;
    }
    if (hz.judged && !hz.closing) {
      hz.closing = true;
      this.tweens.add({ targets: hz, reach: 0, duration: 400, onUpdate: () => hz.leaf.setScale(1, Math.max(0.02, hz.reach / 46)) });
      this.time.delayedCall(2600, () => { hz.dead = true; });
    }
    if (hz.t > 18) hz.dead = true;
  }

  /* ---- standing water */
  spawn_water(def, p) {
    const hz = this.newHazard(def, { p, bad: 0, tIn: 0 });
    const A = OTR.townArt;
    const pud = this.add.image(p.x, p.y, A.puddle(this, 260, 150)).setDepth(-83).setRotation(this.van.heading);
    hz.objs.push(pud);
    hz.pud = pud;
    // The tyres ride up on the water the faster you go: plenty of grip at a crawl, almost none at 30 mph.
    hz.patch = { x: p.x, y: p.y, r: 120, mu: () => OTR.util.clamp(1 - (this.mph() - 8) / 20, 0.2, 1) * 0.8 };
    this.gripPatches.push(hz.patch);
  }

  step_water(hz, dt) {
    const def = hz.def;
    const d = Phaser.Math.Distance.Between(hz.p.x, hz.p.y, this.van.x, this.van.y);
    if (!hz.inside && d < 130) {
      if (this.mph() < 14) { this.pass(hz, 'You were already slow enough to drive straight through it.'); hz.dead = true; return; }
      hz.inside = true;
      this.warn('NO GRIP — ease off, steer straight', 0xF0435A);
      OTR.audio.play('splash');
      OTR.fx.shake(this, 500, 0.004);
    }
    if (hz.inside && !hz.judged) {
      hz.tIn += dt;
      const inp = this.input3 || {};
      if (inp.brake && this.mph() > 8) hz.bad += dt * 2;
      if (Math.abs(inp.steer) > 0) hz.bad += dt * 1.6;
      if (inp.throttle) hz.bad += dt * 0.8;
      if (hz.t > 3.4 || (d > 190 && hz.tIn > 0.3)) {
        if (hz.bad < 1.1) this.pass(hz); else this.fail(hz);
        this.time.delayedCall(2200, () => { hz.dead = true; });
      }
    }
    if (hz.t > 30) hz.dead = true;
  }

  /* ---- distracted pedestrian at a crossing */
  spawn_crosswalk(def, p) {
    const S = this.right();
    const hz = this.newHazard(def, { p, side: S });
    const A = OTR.townArt;
    const deco = this.add.image(p.x, p.y, A.crosswalk(this)).setDepth(-86).setRotation(this.van.heading + Math.PI / 2);
    hz.objs.push(deco);
    const from = { x: p.x + S.x * 210, y: p.y + S.y * 210 };
    const ped = this.add.image(from.x, from.y, A.pedTop(this, 0x3DA5FF)).setDepth(27);
    hz.objs.push(ped);
    hz.ped = ped;
    hz.to = { x: p.x - S.x * 230, y: p.y - S.y * 230 };
    hz.phone = this.add.rectangle(from.x, from.y - 10, 8, 12, 0xFFE8A0).setDepth(28);
    hz.objs.push(hz.phone);
  }

  step_crosswalk(hz, dt) {
    const def = hz.def;
    const dx = hz.to.x - hz.ped.x, dy = hz.to.y - hz.ped.y;
    const d = Math.hypot(dx, dy);
    if (d > 8) {
      hz.ped.x += (dx / d) * 36 * dt;                     // eyes on the phone, about 1.8 m/s
      hz.ped.y += (dy / d) * 36 * dt;
      hz.phone.setPosition(hz.ped.x, hz.ped.y - 12);
    } else if (!hz.judged) {
      this.pass(hz, 'They crossed without ever looking up. You let them.');
    }
    const r = this.rel({ x: hz.ped.x, y: hz.ped.y });
    const vanLen = this.van.g.hl * 2 * this.P;
    if (!hz.judged) {
      if (this.touching(hz.ped)) this.fail(hz, def.hit, 5);
      else if (r.fd < 60 && r.fd > -vanLen && Math.abs(r.lat) < 100 && this.mph() > 5) this.fail(hz);
      else if (r.fd < -vanLen - 20) this.pass(hz);
    }
    if (hz.judged && !hz.ending) {
      hz.ending = true;
      this.time.delayedCall(2600, () => { hz.dead = true; });
    }
    if (hz.t > 26) hz.dead = true;
  }

  /* ---- school bus with the stop arm out */
  spawn_bus(def, p) {
    const S = this.right(), A = OTR.townArt;
    const lane = { x: p.x - S.x * (A.ROAD / 4 + 10), y: p.y - S.y * (A.ROAD / 4 + 10) };
    const hz = this.newHazard(def, { p: lane, hold: 0 });
    // a school bus is about 2.6 m by 12 m
    const bus = this.add.image(lane.x, lane.y, A.busTop(this, false)).setDepth(28).setScale(0.55, 0.96).setRotation(this.van.heading - Math.PI / 2);
    hz.objs.push(bus);
    hz.bus = bus;
    hz.half = 0.96 * 125;
    hz.blockers.push(this.footprint(lane.x, lane.y, 240, 54, 'the school bus'));
  }

  step_bus(hz, dt) {
    const A = OTR.townArt;
    const r = this.rel({ x: hz.bus.x, y: hz.bus.y });
    const gap = r.fd - hz.half;                          // front bumper to the back of the bus
    if (!hz.armOut && (gap < 380 || hz.t > 0.8)) {
      hz.armOut = true;
      hz.bus.setTexture(A.busTop(this, true));
      this.warn('SCHOOL BUS — RED LIGHTS FLASHING', 0xF0435A);
      OTR.audio.play('buzzer');
      hz.blink = this.time.addEvent({
        delay: 420, loop: true,
        callback: () => { if (hz.bus.active) hz.bus.setAlpha(hz.bus.alpha > 0.9 ? 0.78 : 1); }
      });
    }
    if (hz.armOut && !hz.judged) {
      if (this.mph() < 2 && gap > 20) {
        hz.hold += dt;
        if (hz.hold > 2.2) {
          this.pass(hz);
          hz.bus.setTexture(A.busTop(this, false)).setAlpha(1);
          if (hz.blink) hz.blink.remove();
          this.time.delayedCall(2600, () => { hz.dead = true; });
        } else this.warn(`Hold — ${(2.2 - hz.hold).toFixed(1)}s until the arm folds`, 0xFFC83D);
      } else if (gap < 20 || r.fd < -hz.half) {
        this.fail(hz);
        hz.bus.setAlpha(1);
        if (hz.blink) hz.blink.remove();
        this.time.delayedCall(2600, () => { hz.dead = true; });
      } else hz.hold = 0;
    }
    if (hz.t > 26) { if (hz.blink) hz.blink.remove(); hz.dead = true; }
  }

  /* ---- the handheld buzzing while you drive */
  spawn_phone(def) {
    const hz = this.newHazard(def, { baseline: this.violations.handheld || 0 });
    hz.window = 14;
    OTR.audio.play('phone');
  }

  step_phone(hz) {
    if (hz.judged) { if (hz.t > hz.window + 3) hz.dead = true; return; }
    const used = (this.violations.handheld || 0) > hz.baseline;
    if (used) { this.fail(hz); return; }
    if (hz.t > hz.window) this.pass(hz);
  }

  /* ================================================================ checkpoints */
  onPark(stop) {
    stop.done = true;
    const last = this.route.every(r => r.done);
    this.log.check('efficiency', 1, 1, `Checkpoint ${stop.index} reached`);
    OTR.audio.play('success');
    if (last) { this.endDrill(); return; }
    this.activeIndex = Math.min(this.route.length - 1, this.activeIndex + 1);
    this.showActiveStop();
    this.parked = false;
    const next = this.content.hazards.find(h => h.at === this.activeIndex);
    if (this.activeIndex === this.route.length - 1) this.toast(this.content.backing.warn, 0xFFC83D);
    else this.toast(`Checkpoint ${stop.index} done — next one is on the map`, 0x2BC48A);
    if (next && next.kind === 'phone') this.armHazards();
    const C = this.content;
    if (C.rainFrom !== undefined && this.activeIndex === C.rainFrom && this.weather !== 'rain') this.turnToRain();
  }

  turnToRain() {
    this.weather = 'rain';
    this.lightsWanted = true;
    if (this.atmos && this.atmos.destroy) this.atmos.destroy();
    this.atmos = OTR.atmos.apply(this, { tod: 'dusk', weather: 'rain', depth: 700, vignette: true });
    this.warn('Rain — slow down, lights on (L), more space', 0x3DA5FF);
    OTR.audio.play('thunder');
  }

  /* ================================================================ finish */
  endDrill() {
    if (this.finished) return;
    this.finished = true;
    this.leaving = true;
    const C = this.content;
    OTR.audio.stopLoop('engine');

    // par is a careful driver in a loaded van: every stop sign and red light waited out, every hazard given its
    // room, 21 mph on the straights. It lives in the content so the route and the par stay together.
    const par = C.par;
    this.log.check('efficiency', this.elapsed <= par ? 3 : this.elapsed <= par * 1.4 ? 2 : this.elapsed <= par * 1.9 ? 1 : 0, 3,
      `Ran the drill in ${Math.round(this.elapsed)}s (par ${par}s)`, { lesson: C.lessons.speed });
    this.log.check('safety', this.buckled ? 2 : 0, 2, 'Drove buckled up', { lesson: 'Belt on before the wheels move, every stop, every time.' });
    const missed = this.content.hazards.filter(h => !this.armedFor[h.id]);
    missed.forEach(h => this.log.check('safety', 0, h.points, h.title + ' (never reached)', { lesson: h.lesson }));

    const ratios = this.log.ratios(['safety', 'efficiency']);

    this.cameras.main.stopFollow();
    OTR.flow.complete(this, this.scenarioId, {
      score: this.log.score(), ratios, log: this.log, lessons: this.log.mistakes().length ? [] : [C.lessons.perfect], stats: { log: this.log.toJSON() }
    });
  }
}
OTR.registerScene(DrivingScene);
