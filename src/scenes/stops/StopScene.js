/*
 * Walkable doorstep delivery (Modules 5 & 8, and every delivery stop in a shift).
 * Content: data/m5_stops.js (format documented there). One scene run = one stop; the scene restarts
 * itself for the next stop in the set, carrying the score log forward.
 */
class StopScene extends BaseScenarioScene {
  constructor() { super('StopScene'); }

  init(data) {
    super.init(data);
    this.stopIndex = data.stopIndex || 0;
    this.carry = data.carry || null;
    this.shiftMode = !!data.shift;
    this.shiftStop = data.shiftStop || null;
  }

  /** The pause menu's restarts: past the first stop of a practice set, this stop or the whole set, said plainly. */
  restartOptions() {
    if (this.shiftMode) return [{ label: 'Restart this stop', data: this.initData }];
    if (this.stopIndex === 0) return [{ label: 'Restart the set', data: this.initData }];
    return [
      { label: 'Restart this stop', data: this.initData },
      { label: 'Restart the set', data: { scenarioId: this.scenarioId } }
    ];
  }

  create() {
    // the scene instance is reused for every stop: clear per-stop references first
    ['resident', 'talkCtl', '_shelf', 'pkgProp', 'inInterior', 'photoMode', 'waitingDoor', 'talkFlags', 'running', 'interior', 'interiorX', 'outsideW', 'stopSummary', '_clockAcc', 'dog', 'dogDef', 'gate', 'heat', 'heatHud', 'shadeZones', 'collapsed', 'idCardView', 'dogBusy', 'dogGone', 'talkPending', 'sayText', 'blockedUntil']
      .forEach(k => { this[k] = undefined; });
    this.setupBase();
    this.set = this.shiftStop ? this.shiftStop.set : this.content;
    this.def = this.shiftStop ? this.shiftStop.stop : this.set.stops[this.stopIndex];
    this.cats = this.scenario ? this.scenario.categories : OTR.scoring.CATS;
    this.log = this.carry ? OTR.ScoreLog.from(this.carry.log) : new OTR.ScoreLog();
    this.log.setGroup(this.def.id);
    this.feedbackMode = this.shiftMode ? 'deferred' : 'immediate';
    this.tod = this.def.tod || this.set.tod || 'midday';
    this.weather = this.def.weather || this.set.weather || 'clear';
    this.clockMin = this.def.time || (this.carry && this.carry.clock) || this.set.time || 9 * 60;
    this.S = {
      inVan: true, carrying: [], scanned: {}, scannedInVan: false, pulls: 0, wrongPulls: 0,
      addressChecked: false, knocks: 0, answered: false, talked: false, vanTrips: 0,
      outcome: null, type: null, signer: null, code: null, tagPrinted: false, tagAttached: false,
      spot: null, photo: null, idResult: null, exitSafe: null, enterSafe: null, hazards: {}, delivered: [],
      elapsed: 0, done: false
    };

    this.buildWorld();
    this.buildHud();
    this.buildHandheld();
    this.stage.lock();
    this.cameras.main.fadeIn(300);
    const begin = () => { this.stage.unlock(); this.running = true; this.refreshObjectives(); };
    if (this.stopIndex === 0 && !this.shiftMode && this.set.intro) {
      this.introCard(this.set.intro.title, this.set.intro.lines, () => this.stopBrief(begin), { h: 470 });
    } else {
      this.stopBrief(begin);
    }
  }

  /* ================================================================== world */
  resolveX(v, base) {
    if (typeof v === 'number') return base + v;
    const L = this.lot;
    const m = String(v).match(/^([a-zA-Z0-9]+)([+-]\d+)?$/);
    if (!m) return base;
    const ref = { doorX: L.doorX, porchX0: L.porchX0, porchX1: L.porchX1, stepsX0: L.stepsX0, numberX: L.numberX, bellX: L.bellX }[m[1]];
    return (ref !== undefined ? ref : base) + (m[2] ? Number(m[2]) : 0);
  }

  buildWorld() {
    const d = this.def;
    const kind = d.lot.kind || 'house';
    const lotX = 1120;
    const facadeW = (d.lot.spec && d.lot.spec.w) || (kind === 'house' ? 1000 : 1100);
    const outsideW = lotX + facadeW + 420;
    const interiorX = outsideW + 300;
    const width = kind === 'business' ? interiorX + 1600 : outsideW;
    const st = this.stage = new OTR.Stage(this, { width, tod: this.tod, weather: this.weather });
    st.setRegion(0, outsideW);
    st.skyline(236);
    const yard = kind === 'house' ? (d.lot.ground || 'path') : 'concrete';
    const segs = [{ x0: 0, x1: 820, type: 'road' }, { x0: 820, x1: 840, type: 'curb' }, { x0: 840, x1: 1040, type: 'sidewalk' }, { x0: 1040, x1: outsideW, type: yard }];
    if (kind === 'business') segs.push({ x0: interiorX, x1: interiorX + 1600, type: 'tile' });
    st.ground(segs);

    const snow = this.weather === 'snow';
    const lit = this.tod === 'evening' || this.tod === 'night';
    const spec = Object.assign({ snow, lit }, d.lot.spec || {});
    this.lot = kind === 'house' ? st.house(lotX, spec) : st.building(lotX, Object.assign({ style: kind }, spec));
    this.lotX = lotX;

    // van at the curb
    this.van = st.van(110, { open: true });
    this.van.hazards(true);

    // props & hazards
    this.propById = {};
    (d.props || []).forEach(p => {
      const x = this.resolveX(p.x, lotX);
      const o = { art: p.art || {}, depth: p.depth };
      if (p.onPorch) { o.y = this.lot.floorY; o.depth = p.depth !== undefined ? p.depth : 6; }
      if (p.hazard) o.depth = 7;
      const img = st.prop(p.type, x, o);
      if (p.id) this.propById[p.id] = img;
      if (p.hazard) this.addHazard(p, img, x);
    });
    if (d.fence) this.buildFence(d.fence);
    if (d.dog) this.buildDog(d.dog);
    // Shade is what the scene draws as shade: trees and umbrellas, and the porch roof or shop awning over the door (the
    // heat model used to count only the trees, so the "shade by the door" heated the courier at full sun rate)
    this.shadeZones = [];
    (d.props || []).forEach(p => { if (p.shade) { const sx = this.resolveX(p.x, lotX), w = p.shadeW || 150; this.shadeZones.push([sx - w, sx + w]); } });
    if (this.set.heat) {
      const L = this.lot;
      if (kind === 'business') this.shadeZones.push([L.doorX - 190, L.doorX + 190]);
      else this.shadeZones.push([L.porchX0, L.porchX1]);
      // under trees and umbrellas the ground shows the shade (the porch and awning shade what is under them already)
      (d.props || []).forEach(p => {
        if (!p.shade) return;
        const sx = this.resolveX(p.x, lotX), w = p.shadeW || 150;
        OTR.tex.shape(this, (g) => { g.fillStyle(0x1A1030, 0.22); g.fillEllipse(0, 0, w * 2, 26); }, sx, st.G + 6).setDepth(-19);
      });
    }
    if (d.stepHazard) this.addHazard({ hazard: d.stepHazard, id: 'steps', label: 'the steps' }, this.stepGlaze(d.stepHazard), (this.lot.stepsX0 + this.lot.porchX0) / 2, this.lot.stepsX0 - 10, this.lot.porchX0 + 10);

    // business interior
    if (kind === 'business') {
      this.interiorX = interiorX;
      this.interior = st.interior(interiorX, Object.assign({ w: 1600 }, d.lot.interior || {}));
      this.outsideW = outsideW;
    }

    // courier starts in the cab doorway
    const spec0 = Object.assign({}, OTR.hub.playerSpec, this.set.courier || {}, d.courier || {});
    this.me = OTR.rig.person(this, this.van.doorX - 6, this.van.floorY, spec0, { scale: 0.8, facing: 1 });
    st.player(this.me);
    st.actors.find(a => a.rig === this.me).followGround = false;
    this.me.y = this.van.floorY;
    this.cameras.main.scrollX = 0;

    this.addInteractions();
    // In the van the courier stays in the cab doorway (shelves, water and AC are all in reach from there); outside,
    // they cannot walk back along the van's road side into the traffic lane. The only ways in and out are the E
    // climbs. (A/D or a click used to walk them straight out through the cab at floor height, into mid-air, with
    // every outside prompt switched off because they were still "in the van".)
    const dx = this.van.doorX;
    st.barrier(dx - 66, () => this.S.inVan);
    st.barrier(dx + 36, () => this.S.inVan);
    st.barrier(dx + 20, () => !this.S.inVan && !this.inInterior);
    st.onBlocked = () => this.blocked();
    (d.triggers || []).forEach(t => this.addTrigger(t));
    this.atmos = OTR.atmos.apply(this, { tod: this.tod, weather: this.weather, depth: 700 });
    st.onMove = () => {};
  }

  /** Icy or wet steps look it: a glaze on every tread, with a glint (the steps used to be drawn plain and dry). */
  stepGlaze(type) {
    const ice = type === 'ice';
    return OTR.tex.shape(this, (g) => {
      this.stage.surfaces.filter(sf => sf.kind === 'step').forEach(sf => {
        g.fillStyle(ice ? 0xDDF3FF : 0x4F76A0, ice ? 0.85 : 0.45);
        g.fillRect(sf.x0 - 2, sf.y - 2, sf.x1 - sf.x0 + 4, 7);
        g.fillStyle(0xFFFFFF, ice ? 0.9 : 0.55);
        g.fillRect(sf.x0 + 8, sf.y - 1, (sf.x1 - sf.x0) * 0.45, 2);
      });
    }).setDepth(7);
  }

  addHazard(p, img, x, x0, x1) {
    const H = { id: p.id || p.hazard + '_' + Math.round(x), type: p.hazard, label: p.label || p.hazard, img, state: 'pending', x, incident: false, fastT: 0 };
    this.S.hazards[H.id] = H;
    const clearable = p.hazard === 'hose' || p.hazard === 'toys';
    const slippery = p.hazard === 'ice' || p.hazard === 'wet';
    // the zone covers the hazard as drawn (it used to be 100 px whatever the art, so the ends of a patch were safe)
    const half = p.art && p.art.w ? p.art.w / 2 : img ? img.displayWidth / 2 : 50;
    const zx0 = x0 !== undefined ? x0 : x - half, zx1 = x1 !== undefined ? x1 : x + half;
    this.stage.zone({
      x0: zx0, x1: zx1,
      // Judged on every frame inside, not just the first: letting go of SHIFT halfway over the ice is the slip (after
      // 0.12 s, so a SHIFT pressed a moment late is forgiven). A walk the game makes (placing a package, a scripted
      // move in a conversation) runs with the stage locked and is not the trainee's step, so it is not judged.
      onInside: (rig, careful, dt) => {
        if (H.state === 'cleared' || H.incident || !this.running || this.stage.locked > 0) return;
        const fast = rig.moving && !careful;
        if (!fast) { H.fastT = 0; if (H.state === 'pending') H.state = 'careful'; return; }
        H.fastT += dt;
        if (slippery || this.S.carrying.length > 0) { if (H.fastT > 0.12) this.hazardIncident(H); }
        else H.state = 'passed';
      }
    });
    if (clearable) {
      // its E spot is the middle of the clutter, and it can be moved with a package in hand: the courier sets the
      // box down, moves it, and picks the box up again
      H.inter = this.stage.interact({
        x, y: this.stage.G - 150, range: Math.max(60, half + 10), label: p.hazard === 'hose' ? 'Move the hose aside' : 'Move the toys aside',
        when: () => H.state !== 'cleared' && !this.S.inVan && !this.S.done,
        onUse: () => {
          this.stage.lock();
          this.me.face(x);
          const holding = this.S.carrying.length > 0;
          this.me.playOnce('setDown', () => {
            if (holding) this.me.hold(null);
            H.state = 'cleared';
            if (img) this.tweens.add({ targets: img, y: img.y + 60, x: img.x + 40, alpha: 0, duration: 400, onComplete: () => img.setVisible(false) });
            OTR.audio.play('success');
            this.say('Cleared the trip hazard.', '#8BF0C6');
            this.time.delayedCall(holding ? 350 : 0, () => {
              if (holding) this.updateCarryVisual();
              this.me.playOnce('lift', () => this.stage.unlock());
            });
          });
        }
      });
    }
  }

  hazardIncident(H) {
    H.state = 'incident';
    H.incident = true;                              // kept even if the hazard is cleared afterwards
    H.withLoad = this.S.carrying.length > 0;
    const bad = H.type === 'ice' || H.type === 'wet';
    this.stage.lock();
    OTR.audio.play(bad ? 'slip' : 'thud');
    OTR.fx.shake(this, 280, 0.01);
    this.me.setExpression('shocked');
    this.me.playOnce(bad ? 'slip' : 'stumble', () => {
      this.me.setExpression('worried');
      this.stage.unlock();
      this.time.delayedCall(1200, () => this.me.setExpression('neutral'));
    });
    this.S.elapsed += bad ? 12 : 4;
    const msg = bad ? `You slipped on ${H.label}!` : `You tripped over ${H.label}!`;
    this.say(msg, '#FF8A9A');
    if (this.S.carrying.length && bad) this.S.droppedPackage = true;
  }

  addInteractions() {
    const st = this.stage, L = this.lot, d = this.def;
    const kind = d.lot.kind || 'house';

    // --- van. The courier starts at doorX - 6, between the shelves (just behind) and the door (just ahead). E offers
    // the shelves until this stop's packages are in hand and the door after that; a step towards either one
    // switches to it. (Both used to sit on the same spot, and E always searched the shelves.) Water and the AC
    // are further back in the cab.
    // Which one E prefers depends on whether anything is carried, never on whether it is the right package: that
    // is for the scan and the label to tell (the prompt used to give the answer away).
    this.itShelf = st.interact({
      x: this.van.doorX - 16, y: this.van.floorY - 230, range: 90, label: 'Search the shelves',
      when: () => this.S.inVan && !this.S.done,
      prefer: () => !this.S.carrying.length,
      onUse: () => this.openShelves()
    });
    this.itExit = st.interact({
      x: this.van.doorX + 4, y: this.van.floorY - 190, range: 90, label: 'Climb out of the van',
      when: () => this.S.inVan && !this.S.done,
      prefer: () => this.S.carrying.length > 0,
      onUse: () => this.exitVan()
    });
    st.interact({
      x: this.van.doorX - 60, y: this.van.floorY - 150, range: 120, label: 'Drink some water',
      when: () => !!this.heat && !this.S.done && (this.S.inVan || Math.abs(this.me.x - this.van.doorX) < 120) && !this.inInterior,
      onUse: () => this.drinkWater()
    });
    st.interact({
      x: this.van.doorX - 100, y: this.van.floorY - 110, range: 120, label: 'Cool off in the AC',
      when: () => !!this.heat && this.S.inVan && !this.S.done,
      onUse: () => this.coolDown(null, 3500)
    });
    (this.def.props || []).forEach(p => {
      if (!p.shade) return;
      const sx = this.resolveX(p.x, this.lotX);
      st.interact({ x: sx, y: st.G - 250, range: 110, label: 'Rest in the shade', when: () => !!this.heat && !this.S.inVan && !this.S.done, onUse: () => this.coolDown(null, 3000) });
    });
    this.itEnter = st.interact({
      x: this.van.doorX + 30, standX: this.van.doorX + 40, y: this.van.floorY - 200, range: 80, label: 'Climb into the van',
      when: () => !this.S.inVan && !this.S.done && !this.inInterior,
      onUse: () => this.enterVan()
    });

    // Every door interaction is centred on the thing it acts on (the courier stands in front of the number to check
    // it, in front of the bell to ring it), clickable there, and gone once the stop has an outcome. (The spots used to
    // sit on the other side of the door from the bell and the number, so standing at them showed nothing.)
    // --- address check
    if (L.numberX) {
      st.interact({
        x: L.numberX, standX: L.numberX, y: L.numberY - 60, range: 80, label: 'Check the address number',
        when: () => !this.S.inVan && !this.inInterior && !this.S.addressChecked && !this.waitingDoor && !this.S.outcome,
        hotspot: { y: L.numberY, w: 60, h: 50 },
        onUse: () => this.checkAddress()
      });
    }

    // --- door
    if (kind === 'business') {
      st.interact({
        x: L.doorX, standX: L.doorX - 40, y: L.floorY - 280, range: 80, label: 'Go inside',
        when: () => !this.inInterior && !this.S.inVan && (L.layout.s.open !== false) && !this.S.outcome,
        onUse: () => this.enterInterior()
      });
      st.interact({
        x: L.doorX, standX: L.doorX - 40, y: L.floorY - 280, range: 80, label: 'Try the door',
        when: () => !this.inInterior && !this.S.inVan && L.layout.s.open === false && this.S.knocks === 0 && !this.S.outcome,
        onUse: () => { this.S.knocks++; OTR.audio.play('knock'); this.me.play('knock'); this.time.delayedCall(900, () => { this.me.play('idle'); this.say('Locked. The sign says CLOSED.', '#FFE3C8'); this.refreshObjectives(); }); }
      });
      const I = this.interior;
      st.interact({
        x: I.entryX + 60, y: this.stage.G - 280, range: 90, label: 'Go back outside',
        when: () => this.inInterior,
        onUse: () => this.exitInterior()
      });
      st.interact({
        x: I.counterX - 150, y: I.counterTopY - 200, range: 90, label: 'Talk to reception',
        when: () => this.inInterior && this.resident && !this.S.talked,
        onUse: () => this.startTalk()
      });
    } else {
      const bell = kind === 'apartment' || L.layout.s.bell !== false;
      const bellLabel = kind === 'apartment' ? 'Buzz the unit' : (bell ? 'Ring the doorbell' : 'Knock');
      // a house without a bell is knocked on at the door itself
      const ringX = bell ? L.bellX : L.doorX - 40;
      const dw = (L.layout.doorW || 108) / 2;
      const hx0 = Math.min(ringX - 30, L.doorX - dw), hx1 = Math.max(ringX + 30, L.doorX + dw);
      st.interact({
        x: ringX, standX: ringX, y: L.floorY - 290, range: 80,
        label: bellLabel,
        when: () => !this.S.inVan && !this.S.answered && !this.waitingDoor && !this.S.done && !this.S.outcome,
        // the door and the bell both ring (or knock)
        hotspot: { x: (hx0 + hx1) / 2, y: L.floorY - 120, w: hx1 - hx0, h: 230 },
        onUse: () => this.knock(kind === 'apartment' ? 'buzzer' : (bell ? 'doorbell' : 'knock'))
      });
      st.interact({
        x: L.doorX - 70, standX: L.doorX - 80, y: L.floorY - 290, range: 80, label: 'Talk',
        when: () => this.S.answered && this.resident && !this.S.talked && !this.talkPending && this.def.answer && this.def.answer.talk,
        onUse: () => this.startTalk()
      });
    }
    // door tag. Its spot is 10 px from the address check's and the bell's, so with a printed tag in hand E prefers
    // it: where the courier happened to stop (a few px either way, more at a low frame rate) used to decide which
    // of the three E did.
    st.interact({
      x: L.doorX - 50, standX: L.doorX - 70, y: L.floorY - 290, range: 70, label: 'Attach the door tag',
      when: () => this.S.tagPrinted && !this.S.tagAttached && !this.inInterior,
      prefer: () => true,
      onUse: () => this.attachTag()
    });
  }

  /* ================================================================== yards, dogs, situations */
  buildFence(f) {
    const lotX = this.lotX, st = this.stage;
    const x0 = this.resolveX(f.x0, lotX), x1 = this.resolveX(f.x1, lotX), gx = this.resolveX(f.gate, lotX);
    const col = f.color || 0xFFFFFF;
    // The fence and gate stand between the yard (the dog at 25, the owner at 24) and the sidewalk (the courier at 30),
    // so the dog is behind the pickets and the courier in front of them; the courier goes behind the fence once
    // through the gate (see update). They used to bracket the actors the other way round.
    if (gx - 45 - x0 > 20) st.prop('fence', x0, { art: { w: Math.round(gx - 45 - x0), color: col }, ox: 0, depth: 27 });
    if (x1 - gx - 45 > 20) st.prop('fence', gx + 45, { art: { w: Math.round(x1 - gx - 45), color: col }, ox: 0, depth: 27 });
    const img = st.prop('gate', gx, { art: { color: col, open: false }, depth: 27 });
    this.gate = { x: gx, open: !!f.open, img, color: col, locked: !!f.locked };
    if (this.gate.open) this.setGate(true, true);
    st.barrier(gx, () => !this.gate.open);
    st.interact({
      x: gx - 60, y: st.G - 200, range: 70, label: this.gate.locked ? 'Try the gate' : 'Open the gate',
      when: () => !this.gate.open && !this.S.inVan && !this.talkCtl && !this.S.answered,   // not once the owner is out
      onUse: () => {
        if (this.gate.locked) { OTR.audio.play('click_dud'); this.say('Locked. You can\'t get in.', '#FFE3C8'); this.S.gateTried = true; return; }
        const trig = (this.def.triggers || []).find(t => t.on === 'gate' && !t.fired);
        if (trig) { trig.fired = true; this.runSituation(trig.talk); return; }
        this.setGate(true);
      }
    });
  }

  /** Walking into something that stops the courier: say what it is, once in a while (not every frame). */
  blocked() {
    if (this.time.now < (this.blockedUntil || 0)) return;
    let msg = null;
    if (this.S.inVan) msg = this.me.x > this.van.doorX - 20 ? 'Press E to climb out of the van.' : null;
    else if (this.gate && !this.gate.open && Math.abs(this.me.x - this.gate.x) < 80) msg = 'The gate is closed.';
    else if (!this.inInterior && Math.abs(this.me.x - this.van.doorX) < 80) msg = 'Press E to climb into the van.';
    if (!msg) return;
    this.blockedUntil = this.time.now + 2500;
    this.say(msg, '#FFE3C8');
  }

  setGate(open, silent) {
    if (!this.gate) return;
    this.gate.open = open;
    this.gate.img.setTexture(OTR.scenery.prop(this, 'gate', { color: this.gate.color, open }));
    if (!silent) OTR.audio.play(open ? 'door_open' : 'door_close');
  }

  buildDog(dg) {
    const x = this.resolveX(dg.x, this.lotX);
    const dog = OTR.rig.dog(this, x, 0, dg.spec || {}, { scale: dg.scale || 0.72, mood: dg.mood || 'alert', facing: dg.facing || -1 });
    this.stage.actor(dog, { depth: dg.depth || 25 });
    if (dg.hidden) dog.setAlpha(0);
    this.dog = dog;
    this.dogDef = dg;
    if (dg.patrol) {
      const [p0, p1] = dg.patrol.map(v => this.resolveX(v, this.lotX));
      const roam = () => {
        if (!dog.c.active) return;
        if (this.dogBusy || this.dogGone) { this.time.delayedCall(1500, roam); return; }
        dog.walkTo(p0 + Math.random() * (p1 - p0), () => { dog.face(this.me.x); this.time.delayedCall(900 + Math.random() * 1600, roam); }, { speed: 120 });
      };
      this.time.delayedCall(1200, roam);
    }
    if (dg.barks) {
      this.time.addEvent({ delay: 2600, loop: true, callback: () => {
        if (dog.c.active && !this.dogBusy && !this.dogGone && dog.c.alpha > 0.5 && Math.abs(this.me.x - dog.x) < dg.barks) { dog.face(this.me.x); dog.bark(2); }
      } });
    }
  }

  addTrigger(t) {
    t.fired = false;
    if (t.on === 'gate') return;
    const x = this.resolveX(t.x, this.lotX);
    this.stage.zone({
      x0: x - (t.w || 30), x1: x + (t.w || 30), once: t.once !== false && !t.rearm,
      onEnter: () => {
        if (!this.running || this.talkCtl) return;
        // rearm: after a dog has charged, going back onto its lawn sets it off again (until the stop has an outcome)
        if (t.fired) { if (t.rearm && !this.S.outcome && this.dog && !this.dogGone && this.stage.locked === 0) this.dogRecharge(); return; }
        if (t.if && !OTR.talk.test(t.if, this.flagsFor())) return;
        t.fired = true;
        this.runSituation(t.talk);
      }
    });
  }

  /** Back onto the lawn of a dog that has already charged: it charges again. Never averaged away. */
  dogRecharge() {
    const a = this.acts(this.castFor());
    this.stage.lock();
    this.me.stop();
    this.say('The dog charges again! Back to the truck, slowly.', '#FF8A9A');
    this.log.penalty('safety', 2, 'Went back towards a dog that had already charged', { critical: true, lesson: 'Once a dog has shown aggression, don\'t go back in. Record the exception.' });
    a.dogCharge(200, () => a.backAway('van', () => { this.stage.unlock(); this.dogBusy = false; }));
  }

  castFor() {
    const cast = {};
    const ans = this.def.answer;
    if (this.dog) cast.dog = { name: (this.dogDef && this.dogDef.name) || 'Dog', color: 0x8C5A2A, rig: this.dog, dog: true };
    if (ans) {
      const person = { name: ans.name, color: 0x2F8F83, rig: this.resident || null, moodStart: ans.moodStart || 0 };
      cast[ans.talk || 'resident'] = person;
      cast.owner = person;
    }
    cast.dispatch = { name: 'Dispatch', color: 0x4D148C, rig: null };
    return cast;
  }

  runSituation(key) {
    const graph = (this.def.talks && this.def.talks[key]) || (this.set.talks && this.set.talks[key]);
    if (!graph) { console.warn('[stop] missing situation', key); return; }
    if (this.hh.isOpen) this.hh.close();
    this.stage.lock();
    this.hh.setTabVisible(false);
    this.me.stop();
    const cast = this.castFor();
    // A dog is what the trainee has to read: the conversation goes to the top of the screen (the dog stands where the
    // bottom panel would be) and the camera frames the courier and the dog together.
    if (this.dog && this.dog.c.alpha > 0.5) this.stage.focus((this.me.x + this.dog.x) / 2, OTR.W / 2);
    this.talkCtl = OTR.talk.run(this, graph, {
      cast, courier: { rig: this.me, name: OTR.save.data.profile ? OTR.save.data.profile.name : 'You' },
      log: this.log, cats: OTR.scoring.CATS, feedback: this.feedbackMode, flags: this.flagsFor(),
      acts: this.acts(cast), depth: 3000, top: !!this.dog,
      onEnd: () => {
        this.talkCtl = null;
        this.stage.focus(null);
        this.stage.unlock();
        this.hh.setTabVisible(true);
        if (!this.me.once) this.me.play('idle');
        // a dog still around goes back to its yard (it used to stay wherever the scene left it, even in the road)
        if (this.dog && !this.dogGone && this.dogDef) {
          this.dogBusy = false;
          if (!this.dogDef.patrol) this.dog.walkTo(this.resolveX(this.dogDef.x, this.lotX), () => this.dog.face(this.me.x), { speed: 140 });
        }
        this.refreshObjectives();
        if (graph.hint) this.say(graph.hint, '#FFE3C8');
      }
    });
  }

  acts(cast) {
    const s = this;
    const me = () => s.me, dog = () => s.dog;
    return {
      wait: (ms, done) => s.time.delayedCall(ms || 800, done),
      focus: (arg) => { if (arg === 'dog' && s.dog) s.stage.focus((s.me.x + s.dog.x) / 2, 420); else s.stage.focus(null); },
      expr: (e) => me().setExpression(e),
      anim: (a) => me().play(a),
      say: (t) => s.say(t, '#FFE3C8'),
      honk: (arg, done) => { OTR.audio.play('horn'); s.time.delayedCall(900, done); },
      phoneCall: (arg, done) => { me().play('phone'); OTR.audio.play('phone'); s.time.delayedCall(1800, () => { me().play('idle'); done(); }); },
      // ---- dog
      dogBark: (n) => { if (dog()) { dog().face(s.me.x); dog().bark(n || 2); } },
      dogMood: (m) => { if (dog()) dog().setMood(m); },
      dogShow: (arg, done) => {
        const d = dog(); if (!d) { done(); return; }
        s.dogBusy = true;
        d.setAlpha(1);
        const tx = s.me.x + (arg || 220) * (d.x > s.me.x ? 1 : -1);
        d.walkTo(tx, () => { d.face(s.me.x); s.stage.focus((s.me.x + d.x) / 2, 420); done(); }, { speed: 420 });
      },
      dogCharge: (dist, done) => {
        const d = dog(); if (!d) { done(); return; }
        s.dogBusy = true;
        d.setAlpha(1).setMood('aggressive');
        OTR.audio.play('growl');
        // always from the house side: the dog guards the yard, it never ends up behind the courier in the road
        d.walkTo(s.me.x + (dist || 170), () => { d.face(s.me.x); d.bark(3); OTR.fx.shake(s, 200, 0.006); s.stage.focus((s.me.x + d.x) / 2, 420); done(); }, { speed: 460 });
      },
      dogLunge: (arg, done) => {
        const d = dog(); if (!d) { if (done) done(); return; }
        d.face(s.me.x);
        d.playOnce('lunge');
        s.time.delayedCall(260, () => { me().playOnce('flinch'); me().setExpression('shocked'); OTR.fx.shake(s, 260, 0.012); OTR.fx.flash(s, 0xF0435A, 0.25, 250); });
        s.time.delayedCall(900, () => { if (done) done(); });
      },
      dogJump: (arg, done) => {
        const d = dog(); if (!d) { done(); return; }
        d.setMood('playful');
        d.walkTo(s.me.x + (d.x > s.me.x ? 60 : -60), () => { d.face(s.me.x); d.playOnce('jumpUp'); me().playOnce('flinch'); OTR.audio.play('bark'); s.time.delayedCall(1000, done); }, { speed: 420 });
      },
      dogChase: (arg, done) => {
        const d = dog(); if (!d) { done(); return; }
        s.stage.focus(null);                          // the camera follows the chase (it used to stay on an empty lawn)
        me().setExpression('shocked');
        me().walkTo(s.van.doorX + 70, () => { me().face(d.x); done(); }, { speed: 340 });
        d.walkTo(s.van.doorX + 150, () => { d.face(s.me.x); d.playOnce('lunge'); me().playOnce('flinch'); OTR.fx.shake(s, 220, 0.01); }, { speed: 380 });
      },
      dogCalm: () => { if (dog()) dog().setMood('alert'); },
      dogFollowBack: () => { const d = dog(); if (d) d.walkTo(d.x - 90, () => d.face(s.me.x), { speed: 60 }); },
      dogLeave: (arg, done) => {
        const d = dog(); if (!d) { done(); return; }
        const tx = arg === 'door' ? s.lot.doorX : d.x + 500;
        d.setMood(arg === 'door' ? 'friendly' : 'alert');
        d.walkTo(tx, () => s.tweens.add({ targets: d.c, alpha: 0, duration: 300, onComplete: () => { s.dogGone = true; s.dogBusy = false; done(); } }), { speed: 260 });
      },
      // ---- courier
      freeze: () => { me().stop(); me().play('stand'); me().setExpression('worried'); },
      shield: () => { me().play('brace'); },
      backAway: (arg, done) => {
        const tx = arg === 'van' ? s.van.doorX + 70 : s.me.x - (arg || 220);
        const facingX = s.dog ? s.dog.x : s.me.x + 100;
        s.stage.focus(null);
        me().face(facingX);
        me().walkTo(tx, () => { me().face(facingX); me().play('stand'); done(); }, { speed: 75, keepFacing: true });
        // the dog follows a little, staying between the courier and the house (it used to end up on the courier)
        const d = s.dog;
        if (d) { const dx = Math.max(tx + 150, d.x - 80); if (dx < d.x) d.walkTo(dx, () => d.face(s.me.x), { speed: 50 }); }
      },
      runToVan: (arg, done) => { me().walkTo(s.van.doorX + 70, done, { speed: 330 }); },
      approach: (arg, done) => {
        const tx = arg === 'door' ? s.lot.doorX - 80 : s.resolveX(arg, s.lotX);
        me().walkTo(tx, () => { me().play('idle'); done(); }, { speed: 200 });
      },
      // ---- people
      ownerAppears: (arg, done) => {
        const ans = s.def.answer;
        if (!ans) { done(); return; }
        const L = s.lot;
        s.S.answered = true;
        L.setDoor(true);
        let r = s.resident;
        if (!r) {
          r = OTR.rig.person(s, L.doorX + 8, L.floorY, ans.spec, { scale: 0.78, facing: -1 });
          s.stage.actor(r, { depth: 24 });
          s.resident = r;
        }
        r.setAlpha(1);
        if (cast.owner) cast.owner.rig = r;
        const tx = arg === 'gate' && s.gate ? s.gate.x + 70 : typeof arg === 'number' ? arg : L.doorX - 20;
        r.walkTo(tx, () => { r.face(s.me.x); done(); }, { speed: 180 });
      },
      ownerTakesDog: (arg, done) => {
        const r = s.resident, d = s.dog;
        if (!r || !d) { done(); return; }
        s.dogBusy = true;
        d.setMood('friendly');
        d.walkTo(r.x + 30, () => {
          r.playOnce('setDown', () => {
            s.tweens.add({ targets: [d.c], alpha: 0, duration: 400 });
            r.playOnce('lift', () => { s.dogGone = true; s.flagsFor().dogSecured = true; done(); });
          });
        }, { speed: 220 });
      },
      openGate: () => s.setGate(true),
      // ---- heat
      drink: (arg, done) => s.drinkWater(done),
      rest: (arg, done) => s.coolDown(done, arg || 3000),
      collapse: (arg, done) => s.heatCollapse(done)
    };
  }

  /* ================================================================== heat */
  initHeat() {
    const H = this.set.heat;
    if (!H) return;
    const c = this.carry && this.carry.heat;
    this.heat = { hyd: c ? c.hyd : (H.hydration || 70), temp: c ? c.temp : (H.bodyHeat || 35), drinks: 0, cools: 0, maxTemp: 0, minHyd: 100, warned: false };
    const p = this.heatHud = this.add.container(OTR.W - 300, 72).setDepth(820).setScrollFactor(0);
    p.add(OTR.tex.shape(this, (g) => {
      g.fillStyle(0x0E0620, 0.8); g.fillRoundedRect(0, 0, 280, 84, 14);
      g.lineStyle(2, 0x6A45A0, 0.7); g.strokeRoundedRect(0, 0, 280, 84, 14);
    }));
    p.add(OTR.txt(this, 16, 24, 'HYDRATION', 12, '#8FD3FF', { ox: 0, weight: '900' }));
    p.add(OTR.txt(this, 16, 60, 'BODY HEAT', 12, '#FFB27A', { ox: 0, weight: '900' }));
    this.hydBar = OTR.ui.bar(this, 118, 24, 146, 12, { color: (v) => OTR.color.lerp(0xF0435A, 0x3DA5FF, v), bgAlpha: 0.5 });
    this.tempBar = OTR.ui.bar(this, 118, 60, 146, 12, { color: (v) => OTR.color.lerp(0x2BC48A, 0xF0435A, v), bgAlpha: 0.5 });
    p.add([this.hydBar, this.tempBar]);
    // where the danger starts: the warning at 72 body heat (collapse at 96) and 28 hydration
    p.add(OTR.tex.shape(this, (g) => {
      g.fillStyle(0xFFFFFF, 0.9);
      [[28, 24], [72, 60]].forEach(([v, y]) => g.fillRect(118 + 146 * v / 100 - 1, y - 9, 2, 18));
      g.fillStyle(0xF0435A, 1); g.fillRect(118 + 146 * 0.96 - 1, 60 - 9, 2, 18);
    }));
    this.shadeTag = OTR.txt(this, 264, 42, 'IN SHADE', 11, '#8FD3FF', { ox: 1, weight: '900' }).setVisible(false);
    p.add(this.shadeTag);
    this.heatGlow = this.add.image(OTR.W / 2, OTR.H / 2, OTR.atmos.vignetteTex(this)).setDisplaySize(OTR.W, OTR.H).setScrollFactor(0).setDepth(760).setTint(0xFF3010).setAlpha(0);
    this.updateHeatHud();
  }

  updateHeatHud() {
    if (!this.heat) return;
    this.hydBar.setValue(this.heat.hyd / 100);
    this.tempBar.setValue(this.heat.temp / 100);
  }

  inShade() { return (this.shadeZones || []).some(([a, b]) => this.me.x >= a && this.me.x <= b); }

  updateHeat(dt) {
    const h = this.heat, H = this.set.heat;
    if (!h || this.S.done || this.collapsed) return;
    if (this._openModals > 0 || this.talkCtl) return;
    const moving = this.me.moving;
    const carrying = this.S.carrying.length > 0;
    const k = H.intensity || 1;
    if (this.S.inVan) { h.temp -= 2.2 * dt; h.hyd -= 0.08 * dt; }
    else if (this.inInterior) { h.temp -= 1.4 * dt; h.hyd -= 0.1 * dt; }
    else if (this.inShade()) { h.temp -= 0.9 * dt; h.hyd -= 0.15 * dt; }
    else {
      h.temp += (0.45 + (moving ? 0.35 : 0) + (carrying ? 0.3 : 0)) * k * dt;
      h.hyd -= (0.3 + (moving ? 0.25 : 0) + (carrying ? 0.15 : 0)) * k * dt;
    }
    if (h.hyd < 40) h.temp += 0.3 * k * dt;
    h.temp = OTR.util.clamp(h.temp, 20, 100);
    h.hyd = OTR.util.clamp(h.hyd, 0, 100);
    h.maxTemp = Math.max(h.maxTemp, h.temp);
    h.minHyd = Math.min(h.minHyd, h.hyd);
    this._heatHudAcc = (this._heatHudAcc || 0) + dt;
    if (this._heatHudAcc > 0.25) { this._heatHudAcc = 0; this.updateHeatHud(); }
    this.heatGlow.setAlpha(OTR.util.clamp((h.temp - 60) / 45, 0, 0.7) * (0.8 + 0.2 * Math.sin(this.time.now / 300)));
    this.shadeTag.setVisible(!this.S.inVan && !this.inInterior && this.inShade());
    // the warning re-arms once the courier has recovered, so every overheat gets one before a collapse
    if (h.warned && h.temp < 55 && h.hyd > 50) h.warned = false;
    if (!h.warned && (h.temp >= 72 || h.hyd <= 28)) {
      h.warned = true;
      this.me.play('tired');
      this.me.setExpression('worried');
      this.runSituation('heatSigns');
    }
    if (h.temp >= 96) this.heatCollapse();
  }

  drinkWater(done) {
    const h = this.heat;
    this.stage.lock();
    const prev = this.me.itemKind;
    this.me.hold('bottle');
    this.me.play('drink');
    OTR.audio.play('gulp');
    this.time.delayedCall(1600, () => {
      if (h) { h.hyd = Math.min(100, h.hyd + 45); h.temp = Math.max(20, h.temp - 6); h.drinks++; this.updateHeatHud(); }
      this.me.hold(prev);
      this.updateCarryVisual();
      this.me.play('idle');
      this.stage.unlock();
      if (!done) this.say('Hydration back up.', '#8FD3FF');
      if (done) done();
    });
  }

  coolDown(done, ms) {
    const h = this.heat;
    this.stage.lock();
    this.me.play(this.S.inVan ? 'idle' : 'tired');
    this.say(this.S.inVan ? 'Cooling off in the AC…' : 'Resting in the shade…', '#8FD3FF');
    const dur = ms || 3000;
    this.time.addEvent({ delay: 100, repeat: Math.floor(dur / 100) - 1, callback: () => { if (h) { h.temp = Math.max(25, h.temp - (this.S.inVan ? 1.2 : 0.8)); this.updateHeatHud(); } } });
    this.S.elapsed += dur / 1000 * 2;
    this.time.delayedCall(dur, () => {
      if (h) h.cools++;
      this.me.play('idle');
      this.me.setExpression('neutral');
      this.stage.unlock();
      if (done) done();
    });
  }

  heatCollapse(done) {
    if (this.collapsed) return;
    this.collapsed = true;
    this.running = false;
    if (this.talkCtl) this.talkCtl.finish({ type: 'end' });
    this.stage.lock();
    this.me.setExpression('shocked');
    this.me.playOnce('slip');
    OTR.audio.play('thud');
    this.cameras.main.fade(1400, 90, 20, 10);
    this.log.penalty('safety', 5, 'Heat illness: collapsed on the route', { severity: 'major', critical: true, lesson: 'Heat illness is an emergency. At the first warning signs (dizziness, headache, nausea, cramps) stop, cool down, hydrate and get help. Don\'t push through.' });
    this.time.delayedCall(1600, () => {
      this.cameras.main.resetFX();
      this.cameras.main.fadeIn(600);
      OTR.ui.modal(this, {
        title: 'You collapsed', w: 660, h: 340, depth: 5000,
        body: 'A neighbour saw you go down and called 911. In real life heat stroke can be fatal. Watch your hydration and body heat, take breaks in shade or AC, and act on the warning signs straight away.',
        buttons: [{ label: 'See stop report', skin: 'orange', onClick: () => { this.S.done = true; this.evaluate(); this.report(); } }]
      });
      if (done) done();
    });
  }

  /* ================================================================== HUD */
  buildHud() {
    const d = this.def;
    const total = this.shiftStop ? this.shiftStop.total : this.set.stops.length;
    const idx = this.shiftStop ? this.shiftStop.index : this.stopIndex + 1;
    const pkg = d.packages[0];
    this.hud({ score: false, timer: true, title: `Stop ${idx} of ${total} · ${pkg.number} ${pkg.street}${pkg.unit ? ' #' + pkg.unit : ''}` });
    this.hudBar.setScrollFactor(0);
    this.hudBar.list.forEach(ch => ch.input && ch.setScrollFactor && ch.setScrollFactor(0));
    this.hudBar.each(ch => { if (ch.bg) ch.bg.setScrollFactor(0); });
    this.setClock();

    this.objPanel = this.add.container(20, 72).setDepth(820).setScrollFactor(0);
    this.initHeat();
    this.toastY = 0;
  }

  setClock() {
    const h = Math.floor(this.clockMin / 60), m = Math.floor(this.clockMin % 60);
    const ap = h >= 12 ? 'PM' : 'AM';
    const hh = ((h + 11) % 12) + 1;
    this.clockStr = `${hh}:${String(m).padStart(2, '0')} ${ap}`;
    if (this.timerText) { this.timerText.setText(this.clockStr); this.timerText.setFontSize(20); }
  }

  objectives() {
    const S = this.S, d = this.def, exp = d.expected;
    const items = [];
    const need = d.packages.length;
    const correctCarry = S.carrying.filter(id => d.packages.some(p => p.id === id)).length;
    items.push({ text: need > 1 ? `Pull all ${need} packages for this stop` : 'Pull this stop\'s package from the shelves', done: correctCarry >= need || S.outcome });
    items.push({ text: 'Scan it with your handheld (TAB)', done: S.carrying.length > 0 && S.carrying.every(id => S.scanned[id]) || !!S.outcome });
    if (d.lot.kind === 'business') items.push({ text: 'Find the recipient or reception', done: S.answered || S.outcome });
    else items.push({ text: 'Get the door: knock, ring or buzz', done: S.knocks > 0 || S.outcome });
    items.push({ text: 'Deliver it or record an exception', done: !!S.outcome });
    if (S.tagPrinted) items.push({ text: 'Attach the door tag', done: S.tagAttached });
    if (S.outcome === 'exception' || (S.outcome && S.carrying.length)) items.push({ text: 'Put the package back in the van', done: S.inVan });
    items.push({ text: 'Climb back into the van', done: S.inVan && !!S.outcome });
    void exp;
    return items;
  }

  refreshObjectives() {
    if (this.shiftMode && !OTR.save.data.settings.hints) { this.objPanel.setVisible(false); return; }
    const c = this.objPanel;
    c.removeAll(true);
    c.setVisible(!this.photoMode);                 // hidden only while the camera is up
    const items = this.objectives();
    const w = 330, h = 40 + items.length * 26;
    c.add(OTR.tex.shape(this, (g) => {
      g.fillStyle(0x0E0620, 0.78); g.fillRoundedRect(0, 0, w, h, 14);
      g.lineStyle(2, 0x6A45A0, 0.7); g.strokeRoundedRect(0, 0, w, h, 14);
    }));
    c.add(OTR.txt(this, 16, 18, 'THIS STOP', 12, '#FF9447', { ox: 0, weight: '900' }));
    items.forEach((it, i) => {
      const y = 44 + i * 26;
      c.add(OTR.tex.shape(this, (box) => {
        box.lineStyle(2, it.done ? 0x2BC48A : 0x9A8AB0, 1); box.strokeRoundedRect(0, -8, 16, 16, 4);
        if (it.done) { box.fillStyle(0x2BC48A, 1); box.fillRoundedRect(0, -8, 16, 16, 4); }
      }, 16, y));
      c.add(OTR.txt(this, 42, y, it.text, 14, it.done ? '#8BF0C6' : '#F4ECFF', { ox: 0, bold: false }));
    });
  }

  say(text, color) {
    // one message at a time: a new one replaces the last (two used to print on top of each other)
    if (this.sayText && this.sayText.active) { this.tweens.killTweensOf(this.sayText); this.sayText.destroy(); }
    // narrow enough to stay clear of the objectives panel on the left and the heat meters on the right
    const t = this.sayText = OTR.txt(this, OTR.W / 2, 108, text, 20, color || '#ffffff', { weight: '900', stroke: '#16062B', strokeW: 6, align: 'center', wrap: 520 }).setScrollFactor(0).setDepth(950);
    t.setAlpha(0).setScale(0.8);
    this.tweens.add({ targets: t, alpha: 1, scale: 1, duration: 180, ease: 'Back.out' });
    this.tweens.add({ targets: t, alpha: 0, y: 96, delay: 2200, duration: 400, onComplete: () => t.destroy() });
  }

  stopBrief(onGo) {
    const d = this.def;
    const pkg = d.packages[0];
    const W = { clear: 'Clear', cloudy: 'Overcast', rain: 'Rain', storm: 'Storm', snow: 'Snow / ice', heat: 'Extreme heat' }[this.weather] || this.weather;
    OTR.ui.modal(this, {
      w: 660, h: 330, depth: 5000,
      build: (box, api, w, h) => {
        box.list.forEach(ch => ch.setScrollFactor && ch.setScrollFactor(0));
        box.add(OTR.tex.shape(this, (hg) => { hg.fillStyle(0x4D148C, 1); hg.fillRoundedRect(-w / 2, -h / 2, w, 84, { tl: 22, tr: 22, bl: 0, br: 0 }); }));
        const idx = this.shiftStop ? this.shiftStop.index : this.stopIndex + 1;
        box.add(OTR.txt(this, -w / 2 + 34, -h / 2 + 28, `STOP ${idx}  ·  ${this.clockStr}  ·  ${W.toUpperCase()}`, 14, '#FFB27A', { ox: 0, weight: '900' }));
        box.add(OTR.txt(this, -w / 2 + 34, -h / 2 + 58, `${pkg.number} ${pkg.street}${pkg.unit ? ' #' + pkg.unit : ''}`, 30, '#ffffff', { ox: 0, weight: '900' }));
        box.add(this.add.image(-w / 2 + 50, -h / 2 + 122, 'ic_chat').setDisplaySize(26, 26).setTint(0xFF6600));
        box.add(OTR.txt(this, -w / 2 + 76, -h / 2 + 108, 'DISPATCH', 13, '#FF6600', { ox: 0, oy: 0, weight: '900' }));
        box.add(OTR.txt(this, -w / 2 + 76, -h / 2 + 130, d.brief || '', 19, '#3A2A50', { ox: 0, oy: 0, bold: false, wrap: w - 120, lineSpacing: 3 }));
      },
      buttons: [{ label: 'Let\'s go ▶', skin: 'orange', key: ['ENTER', 'SPACE'], onClick: onGo }]
    });
    this.fixModalScroll();
  }

  /** Modals are built in screen space; make sure every child ignores the camera scroll. */
  fixModalScroll() {
    this.children.list.forEach(ch => {
      if (ch.depth >= 4000 && ch.type === 'Container') {
        ch.setScrollFactor(0);
        const walk = (c) => c.list && c.list.forEach(k => { if (k.setScrollFactor) k.setScrollFactor(0); walk(k); });
        walk(ch);
      }
    });
  }

  /* ================================================================== van */
  exitVan() {
    this.chooseAction('How do you climb down?', [
      { text: 'Face the cab, keep a hand on the grab handle and step down', good: true },
      { text: 'Hop down to the curb. It\'s only a couple of feet.', good: false }
    ], (good) => {
      if (this.S.exitSafe === null) this.S.exitSafe = good;
      else if (!good) this.S.exitSafe = false;
      this.stage.lock();
      this.S.inVan = false;
      const tx = this.van.doorX + 46;
      this.me.setFacing(1);
      this.tweens.add({ targets: this.me.c, x: tx, y: this.stage.G, duration: good ? 850 : 600, ease: good ? 'Sine.inOut' : 'Quad.in' });
      this.me.playOnce(good ? 'stepDown' : 'jumpDown', () => {
        this.stage.actors.find(a => a.rig === this.me).followGround = true;
        this.stage.unlock();
        if (!good) {
          OTR.audio.play('thud'); this.me.setExpression('worried'); this.time.delayedCall(900, () => this.me.setExpression('neutral'));
          this.say('Jumping down is how couriers hurt knees and ankles. Three points of contact, every time.', '#FF8A9A');
        }
        this.refreshObjectives();
      });
    });
  }

  enterVan() {
    this.chooseAction('How do you climb in?', [
      { text: 'Hand on the grab handle, step up one foot at a time', good: true },
      { text: this.S.carrying.length ? 'Jump up in one move while carrying things' : 'Jump up in one move', good: false }
    ], (good) => {
      this.S.enterSafe = this.S.enterSafe === null ? good : (this.S.enterSafe && good);
      this.stage.lock();
      this.me.setFacing(-1);
      this.stage.actors.find(a => a.rig === this.me).followGround = false;
      this.tweens.add({ targets: this.me.c, x: this.van.doorX - 6, y: this.van.floorY, duration: 850, ease: 'Sine.inOut' });
      this.me.playOnce('climbUp', () => {
        this.S.inVan = true;
        this.stage.unlock();
        if (!good) {
          OTR.audio.play('thud'); OTR.fx.shake(this, 120, 0.004);
          this.say('Jumping up with your hands full is how couriers fall. Grab handle, one step at a time.', '#FF8A9A');
        }
        // returning packages that were not delivered
        if (this.S.carrying.length && (this.S.outcome !== 'delivered' || this.S.carrying.length)) {
          this.S.returned = this.S.carrying.slice();
          this.S.carrying = [];
          this.me.hold(null);
          if (good) this.say('Package back on the shelf.', '#C9B3F0');   // the safety message matters more
        }
        if (this.S.outcome) this.time.delayedCall(400, () => this.confirmFinish());
        else { if (this.S.pulls > 0) this.S.vanTrips++; this.refreshObjectives(); }   // before any package was pulled it is not an extra trip
      });
    });
  }

  chooseAction(title, options, onPick) {
    const list = OTR.util.shuffle(options);
    const m = OTR.ui.modal(this, {
      title, w: 620, h: 150 + list.length * 74, depth: 5000,
      buttons: [],
      build: (box, api, w, h) => {
        list.forEach((op, i) => {
          const b = OTR.ui.button(this, 0, -h / 2 + 110 + i * 74, `${i + 1}.  ${op.text}`, () => api.close(() => onPick(op.good, op)), { w: w - 60, h: 60, skin: 'ghost', fontSize: 17, key: ['ONE', 'TWO', 'THREE', 'FOUR'][i] });
          box.add(b);
        });
      }
    });
    this.fixModalScroll();
    return m;
  }

  /* ================================================================== shelves */
  shelfPackages() {
    if (this._shelf) return this._shelf;
    const d = this.def;
    const all = d.packages.map(p => Object.assign({ mine: true }, p)).concat((d.decoys || []).map(p => Object.assign({ mine: false }, p)));
    const R = OTR.scenery.rng(d.id + (this.set.title || ''));
    const slots = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) slots.push({ r, c });
    for (let i = slots.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [slots[i], slots[j]] = [slots[j], slots[i]]; }
    this._shelf = all.map((p, i) => Object.assign(p, { slot: slots[i], onShelf: true }));
    return this._shelf;
  }

  openShelves() {
    const S = this.S, s = this;
    const pkgs = this.shelfPackages();
    this.stage.lock();
    this.me.play('scan');
    const root = this.add.container(0, 0).setDepth(4000).setScrollFactor(0);
    this._openModals++;
    const dim = this.add.rectangle(OTR.W / 2, OTR.H / 2, OTR.W, OTR.H, 0x08030F, 0.8).setInteractive().setScrollFactor(0);
    root.add(dim);
    // cargo interior backdrop
    const bgKey = OTR.tex.make(this, 'cargo_shelves', 820, 600, (ctx, w, h) => {
      const cv = OTR.cv;
      ctx.fillStyle = cv.lin(ctx, 0, 0, 0, h, [[0, '#5A5664'], [1, '#34323C']]); ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(255,255,255,0.06)'; for (let x = 0; x < w; x += 40) ctx.fillRect(x, 0, 2, h);
      for (let r = 0; r < 3; r++) {
        const y = 60 + r * 175 + 130;
        ctx.fillStyle = cv.lin(ctx, 0, y, 0, y + 18, [[0, '#C9C6D2'], [1, '#8A8898']]); ctx.fillRect(20, y, w - 40, 18);
        ctx.fillStyle = '#FF6600'; ctx.fillRect(20, y + 18, w - 40, 4);
        ctx.fillStyle = '#fff'; ctx.font = '900 13px "Segoe UI"';
        for (let c = 0; c < 4; c++) { ctx.fillText(`${String.fromCharCode(65 + r)}${c + 1}`, 40 + c * 195, y + 38); }
      }
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(0, 0, 18, h); ctx.fillRect(w - 18, 0, 18, h);
    });
    root.add(this.add.image(440, 370, bgKey).setScrollFactor(0));
    root.add(OTR.txt(this, 440, 50, 'CARGO SHELVES — find this stop\'s package', 22, '#ffffff', { weight: '900' }).setScrollFactor(0));
    const pkg0 = this.def.packages[0];
    root.add(OTR.txt(this, 440, 80, `Stop address: ${pkg0.number} ${pkg0.street}${pkg0.unit ? ' #' + pkg0.unit : ''}  ·  hover a box to read its label`, 15, '#FFB27A', { bold: false }).setScrollFactor(0));

    // label preview panel
    const panel = this.add.container(1080, 380).setScrollFactor(0);
    root.add(panel);
    panel.add(OTR.tex.shape(this, (pg) => {
      pg.fillStyle(0x16062B, 0.95); pg.fillRoundedRect(-180, -300, 360, 600, 18);
      pg.lineStyle(2, 0x6A45A0, 1); pg.strokeRoundedRect(-180, -300, 360, 600, 18);
    }));
    const lblImg = this.add.image(0, -130, '__DEFAULT').setVisible(false).setScrollFactor(0);
    panel.add(lblImg);
    const hint = OTR.txt(this, 0, -130, 'Hover a package to read its label,\nclick it to pick it', 16, '#C9B3F0', { align: 'center', bold: false }).setScrollFactor(0);
    panel.add(hint);
    const carryTxt = OTR.txt(this, 0, 120, '', 15, '#8BF0C6', { align: 'center', wrap: 320 }).setScrollFactor(0);
    panel.add(carryTxt);
    // Hovering only previews a label; a click picks the package, and the button acts on the picked one. (Hover used
    // to pick, so the box the pointer crossed on its way to the button was the one taken.)
    let selected = null;
    const takeBtn = OTR.ui.button(this, 0, 180, 'Take this package', () => {
      if (!selected) return;
      if (selected.onShelf) {
        selected.onShelf = false;
        S.carrying.push(selected.id);
        S.pulls++;
        if (!selected.mine) S.wrongPulls++;
        this.clockMin += 0.3;
        OTR.audio.play('thud');
      } else {
        selected.onShelf = true;
        S.carrying = S.carrying.filter(id => id !== selected.id);
        OTR.audio.play('pop');
      }
      redraw();
    }, { w: 300, h: 50, skin: 'orange', fontSize: 18 });
    takeBtn.bg.setScrollFactor(0);
    panel.add(takeBtn);
    const doneBtn = OTR.ui.button(this, 0, 250, 'Done', () => close(), { w: 300, h: 50, skin: 'purple', fontSize: 18, key: 'ESC' });
    doneBtn.bg.setScrollFactor(0);
    panel.add(doneBtn);

    const boxLayer = this.add.container(0, 0).setScrollFactor(0);
    root.add(boxLayer);
    const dims = { s: [70, 50], m: [100, 72], l: [130, 96], env: [96, 20] };
    const showLabel = (p) => {
      if (!p) { lblImg.setVisible(false); hint.setVisible(true); return; }
      lblImg.setTexture(OTR.labelArt.key(this, p, 320, 213)).setVisible(true).setDisplaySize(320, 213);
      hint.setVisible(false);
    };
    const select = (p) => {
      selected = p;
      showLabel(p);
      takeBtn.setLabel(p.onShelf ? 'Take this package' : 'Put it back');
      takeBtn.setEnabled(true);
      redraw();
    };
    const redraw = () => {
      boxLayer.removeAll(true);
      pkgs.forEach(p => {
        const [bw, bh] = dims[p.size || 'm'];
        const x = 30 + 40 + p.slot.c * 195 + 80, y = 70 + 60 + p.slot.r * 175 + 130 - bh / 2 - 2;
        const key = OTR.tex.make(this, `shelfpkg_${p.size || 'm'}_${p.service || 'standard'}`, bw + 30, bh + 30, (ctx) => {
          if (p.size === 'env') {
            OTR.cv.rr(ctx, 4, 8, bw, bh, 3); ctx.fillStyle = '#F4F1FA'; ctx.fill();
            ctx.fillStyle = '#4D148C'; ctx.fillRect(4, 8, bw, 6); ctx.fillStyle = '#FF6600'; ctx.fillRect(4, 14, bw, 2);
          } else {
            OTR.draw.box(ctx, { fw: bw, fh: bh, d: 12, x: 4, y: 16, color: 0xC99A62 });
            ctx.fillStyle = '#fff'; ctx.fillRect(10, 16 + bh * 0.35, bw * 0.5, bh * 0.35);
            const svc = OTR.labelArt.SERVICE[p.service || 'standard'];
            ctx.fillStyle = OTR.color.css(svc.color); ctx.fillRect(10, 16 + bh * 0.35, bw * 0.5, 5);
          }
        });
        // a package in hand stays in its slot, ghosted and tagged, so it can be picked and put back
        const img = this.add.image(x, y, key).setScrollFactor(0).setInteractive({ useHandCursor: true }).setAlpha(p.onShelf ? 1 : 0.35);
        if (p === selected) img.setTint(0xFFD9A8);
        img.on('pointerover', () => { showLabel(p); if (p !== selected) img.setTint(0xFFE3C8); OTR.audio.play('hover'); });
        img.on('pointerout', () => { showLabel(selected); if (p !== selected) img.clearTint(); });
        img.on('pointerup', () => select(p));
        boxLayer.add(img);
        if (!p.onShelf) boxLayer.add(OTR.txt(this, x, y - bh / 2 - 6, 'IN HAND', 12, '#8BF0C6', { weight: '900', stroke: '#16062B', strokeW: 4 }).setScrollFactor(0));
      });
      const held = pkgs.filter(p => !p.onShelf);
      carryTxt.setText(held.length ? `Carrying: ${held.map(p => `${p.number} ${p.street}`).join(', ')}\n(click a box marked IN HAND to put it back)` : 'Carrying nothing yet');
      if (selected) takeBtn.setLabel(selected.onShelf ? 'Take this package' : 'Put it back');
    };
    takeBtn.setEnabled(false);
    redraw();

    root.setAlpha(0);
    this.tweens.add({ targets: root, alpha: 1, duration: 200 });
    OTR.audio.play('door_open');
    const close = () => {
      this._openModals = Math.max(0, this._openModals - 1);
      this.tweens.add({ targets: root, alpha: 0, duration: 160, onComplete: () => root.destroy() });
      this.me.play('idle');
      this.updateCarryVisual();
      this.stage.unlock();
      this.refreshObjectives();
    };
  }

  updateCarryVisual() {
    const c = this.S.carrying;
    if (!c.length) { this.me.hold(null); return; }
    const pk = this.shelfPackages().filter(p => c.indexOf(p.id) >= 0);
    const big = pk.some(p => p.size === 'l') || pk.length > 1;
    const env = pk.every(p => p.size === 'env');
    this.me.hold(env ? 'envelope' : big ? 'bigbox' : 'box');
  }

  carriedPkgs() { return this.shelfPackages().filter(p => this.S.carrying.indexOf(p.id) >= 0); }

  /** Holding every piece for this stop, and nothing else. */
  packagesInHand() {
    const mine = this.def.packages.map(p => p.id), c = this.S.carrying;
    return mine.every(id => c.indexOf(id) >= 0) && c.every(id => mine.indexOf(id) >= 0);
  }

  /* ================================================================== door & people */
  checkAddress() {
    const L = this.lot, pkg = this.def.packages[0];
    this.S.addressChecked = true;
    this.me.face(L.numberX);
    this.me.play('point');
    const houseNo = String(L.layout.s.number);
    const match = houseNo === String(pkg.number);
    OTR.ui.modal(this, {
      title: 'Address check', w: 600, h: 330, depth: 5000,
      build: (box) => {
        box.add(OTR.txt(this, -140, -70, 'ON THE BUILDING', 13, '#9A8AB0', { weight: '900' }));
        box.add(OTR.txt(this, -140, -20, houseNo, 54, '#250849', { weight: '900' }));
        box.add(OTR.txt(this, 140, -70, 'ON THE LABEL', 13, '#9A8AB0', { weight: '900' }));
        box.add(OTR.txt(this, 140, -20, `${pkg.number}`, 54, '#250849', { weight: '900' }));
        box.add(OTR.txt(this, 140, 26, pkg.street, 17, '#3A2A50', { bold: false }));
        box.add(OTR.txt(this, 0, 64, match ? 'Numbers match. You\'re at the right place.' : 'These don\'t match!', 18, match ? '#1E9E6B' : '#C8243B', { weight: '900' }));
      },
      buttons: [{ label: 'OK', skin: 'orange', key: ['ENTER', 'SPACE'], onClick: () => { this.me.play('idle'); this.refreshObjectives(); } }]
    });
    this.fixModalScroll();
  }

  knock(kind) {
    const S = this.S, L = this.lot, ans = this.def.answer;
    S.knocks++;
    this.waitingDoor = true;
    this.stage.lock();
    this.me.face(L.doorX);
    this.me.play(kind === 'knock' ? 'knock' : 'ring');
    OTR.audio.play(kind);
    this.refreshObjectives();
    this.time.delayedCall(1000, () => {
      this.me.play('idle');
      this.stage.unlock();
      const delay = ans ? (ans.delay !== undefined ? ans.delay : 2) : 4;
      const dots = this.me.emote('…', { hold: delay * 1000 });
      void dots;
      this.S.elapsed += 3;
      this.time.delayedCall(delay * 1000, () => {
        this.waitingDoor = false;
        if (ans && (!ans.afterKnocks || S.knocks >= ans.afterKnocks)) this.answerDoor();
        else { this.say(S.knocks > 1 ? 'Still no answer.' : 'No answer.', '#FFE3C8'); this.refreshObjectives(); }
      });
    });
  }

  answerDoor() {
    const L = this.lot, ans = this.def.answer;
    this.S.answered = true;
    L.setDoor(true);
    const r = OTR.rig.person(this, L.doorX + 44, L.floorY, ans.spec, { scale: 0.78, facing: -1 });
    r.setAlpha(0);
    this.stage.actor(r, { depth: 24 });
    this.tweens.add({ targets: r.c, alpha: 1, duration: 300 });
    r.walkTo(L.doorX + 20, () => { r.setFacing(-1); r.play('idle'); });   // in the doorway, a step clear of the courier at the bell
    this.resident = r;
    this.refreshObjectives();
    // the resident starts talking: no "Talk" prompt meanwhile, or E would open a second copy of the conversation
    if (ans.talk) { this.talkPending = true; this.time.delayedCall(900, () => { this.talkPending = false; this.startTalk(); }); }
    else this.time.delayedCall(700, () => { r.setExpression('happy'); r.emote('Hi!'); });
  }

  enterInterior() {
    const I = this.interior;
    this.stage.lock();
    this.cameras.main.fadeOut(220);
    this.lot.setDoor(true);
    this.time.delayedCall(240, () => {
      this.inInterior = true;
      this.stage.setRegion(this.interiorX, this.interiorX + 1600);
      this.me.x = I.entryX + 200;               // a step past the door, clear of "Go back outside"
      this.me.y = this.stage.G;
      this.me.setFacing(1);
      this.cameras.main.scrollX = this.interiorX;
      if (!this.resident && this.def.answer) {
        const ans = this.def.answer;
        const r = OTR.rig.person(this, I.counterX + 40, this.stage.G - 6, ans.spec, { scale: 0.78, facing: -1 });
        this.stage.actor(r, { depth: 24, followGround: false });
        r.y = this.stage.G - 26;                      // stands behind the counter: the feet stay hidden by its front
        this.resident = r;
        this.S.answered = true;
      }
      this.cameras.main.fadeIn(260);
      this.stage.unlock();
      this.refreshObjectives();
    });
  }

  exitInterior() {
    this.stage.lock();
    this.cameras.main.fadeOut(220);
    this.time.delayedCall(240, () => {
      this.inInterior = false;
      this.stage.setRegion(0, this.outsideW);
      this.me.x = this.lot.doorX - 150;          // clear of "Go inside", so a second E does not walk straight back in
      this.me.y = this.lot.floorY;
      this.me.setFacing(-1);
      this.cameras.main.scrollX = OTR.util.clamp(this.me.x - OTR.W / 2, 0, this.outsideW - OTR.W);
      this.lot.setDoor(false);
      this.cameras.main.fadeIn(260);
      this.stage.unlock();
    });
  }

  startTalk() {
    const ans = this.def.answer;
    const graph = this.def.talks && this.def.talks[ans.talk];
    if (!graph || this.talkCtl || this.S.talked) return;          // one conversation, however E and the timer race
    this.S.talked = true;
    this.stage.lock();
    this.hh.setTabVisible(false);
    // at a doorstep, stand a step back from the resident so the two do not overlap (reception has its own spots)
    const spot = this.resident.x - 110;
    if (!this.inInterior && Math.abs(this.me.x - spot) > 10) {
      this.me.walkTo(spot, () => this.beginTalk(ans, graph), { speed: 160 });
      return;
    }
    this.beginTalk(ans, graph);
  }

  beginTalk(ans, graph) {
    this.me.face(this.resident.x);
    this.resident.face(this.me.x);
    this.stage.focus((this.me.x + this.resident.x) / 2, 380);
    const key = ans.talk;
    const cast = {};
    cast[key] = { name: ans.name, color: 0x2F8F83, rig: this.resident, moodStart: ans.moodStart || 0 };
    this.talkCtl = OTR.talk.run(this, graph, {
      cast, courier: { rig: this.me, name: OTR.save.data.profile ? OTR.save.data.profile.name : 'You' },
      log: this.log, cats: OTR.scoring.CATS, feedback: this.feedbackMode, flags: this.flagsFor(),
      depth: 3000,
      onEnd: () => {
        this.talkCtl = null;
        this.stage.focus(null);
        this.stage.unlock();
        this.hh.setTabVisible(true);
        this.me.play('idle');
        this.resident.play('idle');
        this.say('Use your handheld (TAB) to record the delivery.', '#FFE3C8');
        this.hh.setBadge(true);
        this.refreshObjectives();
      }
    });
  }

  flagsFor() {
    this.talkFlags = this.talkFlags || {};
    return this.talkFlags;
  }

  attachTag() {
    const L = this.lot;
    this.stage.lock();
    this.me.face(L.doorX);
    this.me.play('knock');
    OTR.audio.play('paper');
    this.time.delayedCall(700, () => {
      this.S.tagAttached = true;
      this.me.hold(this.S.carrying.length ? (this.me.itemKind === 'doortag' ? null : this.me.itemKind) : null);
      this.updateCarryVisual();
      const tag = this.stage.prop('doortag', L.doorX + 30, { y: L.floorY - 110, depth: -7 });
      tag.setScale(1.2);
      this.me.play('idle');
      this.stage.unlock();
      this.say('Door tag left on the door.', '#8BF0C6');
      this.refreshObjectives();
    });
  }

  /* ================================================================== handheld */
  buildHandheld() {
    this.hh = new OTR.Handheld(this, {
      depth: 2600,
      clock: () => this.clockStr,
      home: (hh) => this.hhHome(hh),
      canToggle: () => !this.talkCtl && this._openModals === 0 && !this.photoMode && !this.S.done,
      onOpen: () => { this.stage.lock(); this.hh.setBadge(false); if (!this.me.once) this.me.play('scan'); },
      onClose: () => { this.hideIdCard(); this.stage.unlock(); if (!this.me.once) this.me.play('idle'); this.refreshObjectives(); },
      tabVisible: () => !this.talkCtl
    });
  }

  stopCardWidget() {
    const pkg = this.def.packages[0];
    const flags = [];
    const svc = OTR.labelArt.SERVICE[pkg.service || 'standard'];
    flags.push({ text: svc.text, color: svc.color });
    if (this.def.packages.length > 1) flags.push({ text: `${this.def.packages.length} PIECES`, color: 0x3A2A50 });
    if (this.def.flags) this.def.flags.forEach(f => flags.push(f));
    return { type: 'stopcard', stop: { index: this.shiftStop ? this.shiftStop.index : this.stopIndex + 1, number: pkg.number, street: pkg.street, unit: pkg.unit, to: pkg.to, note: pkg.note || this.def.customerNote }, flags };
  }

  hhHome(hh) {
    const S = this.S;
    const carrying = S.carrying.length > 0;
    const opts = [];
    opts.push({ label: 'Scan package', onPick: () => this.hhScan(), disabled: !carrying });
    opts.push({ label: 'Deliver…', onPick: () => this.hhDeliver(), disabled: !carrying || !!S.outcome });
    opts.push({ label: 'Record exception…', onPick: () => this.hhException(), disabled: !!S.outcome });
    opts.push({ label: 'Close', onPick: () => hh.close(), skin: 'ghost' });
    hh.show({
      title: S.outcome ? 'STOP RECORDED' : 'STOP DETAILS',
      color: S.outcome ? 0x1E9E6B : 0x4D148C,
      widget: this.stopCardWidget(),
      lines: S.outcome ? [{ text: S.outcome === 'delivered' ? '✓ Delivery recorded. Head back to the van.' : `✓ Exception ${S.code} recorded.`, color: '#1E9E6B', bold: true }] : (carrying ? [] : [{ text: 'Pull the package from the shelves first.', color: '#7A6A90' }]),
      options: opts
    });
  }

  hhScan() {
    const S = this.S, hh = this.hh, d = this.def;
    OTR.audio.play('scan');
    const pk = this.carriedPkgs();
    pk.forEach(p => { S.scanned[p.id] = true; });
    if (S.inVan) S.scannedInVan = true;
    const lines = [];
    let bad = false;
    pk.forEach(p => {
      if (p.mine) lines.push({ text: `✓ ${p.tracking || p.id} · belongs to this stop`, color: '#1E9E6B', bold: true });
      else { bad = true; lines.push({ text: `✗ WRONG STOP: this one goes to ${p.number} ${p.street}${p.unit ? ' #' + p.unit : ''}`, color: '#C8243B', bold: true }); }
    });
    const missing = d.packages.filter(p => S.carrying.indexOf(p.id) < 0).length;
    if (missing) lines.push({ text: `⚠ ${missing} piece${missing > 1 ? 's' : ''} for this stop still on the truck`, color: '#B26A00', bold: true });
    const svc = d.packages[0].service;
    if (svc === 'signature') lines.push('This package needs a signature. Don\'t leave it unattended.');
    if (svc === 'adult') lines.push('Adult signature: check a valid photo ID, 21 or older.');
    if (d.packages[0].note) lines.push({ text: 'Customer note: ' + d.packages[0].note, color: '#6A3FB0' });
    if (bad) { OTR.audio.play('error'); OTR.fx.shake(this, 120, 0.004); }
    else OTR.audio.play('success');
    this.refreshObjectives();
    hh.show({ title: bad ? 'SCAN ALERT' : 'SCAN OK', color: bad ? 0xC8243B : 0x1E9E6B, lines, options: [{ label: 'Back', onPick: () => this.hhHome(hh) }] });
  }

  hhDeliver() {
    const S = this.S, hh = this.hh;
    const pk = this.carriedPkgs();
    if (pk.some(p => !S.scanned[p.id])) {
      OTR.audio.play('error');
      hh.show({ title: 'NOT SCANNED', color: 0xC8243B, lines: ['Scan the package before recording a delivery.'], options: [{ label: 'Scan now', onPick: () => this.hhScan() }, { label: 'Back', onPick: () => this.hhHome(hh) }] });
      return;
    }
    const T = OTR_DATA.handheld.deliveryTypes;
    // decision lists are all plain buttons: a highlighted first option reads as the recommended answer
    const opts = Object.keys(T).map(id => ({ label: T[id].label, skin: 'ghost', onPick: () => this.deliverAs(id) }));
    opts.push({ label: 'Back', skin: 'ghost', onPick: () => this.hhHome(hh) });
    hh.show({ title: 'DELIVER: HOW?', lines: [{ text: 'How is this package being delivered?', color: '#3A2A50' }], options: opts });
  }

  personHere() {
    if (!this.resident) return null;
    if (Math.abs(this.resident.x - this.me.x) > 260) return null;
    return this.def.answer;
  }

  deliverAs(type) {
    const hh = this.hh, T = OTR_DATA.handheld.deliveryTypes[type];
    const person = this.personHere();
    if (T.needsPerson && !person) {
      OTR.audio.play('error');
      // someone is here but out of reach: say who, rather than claiming nobody answered
      const far = this.resident && this.def.answer;
      hh.show({
        title: far ? 'TOO FAR AWAY' : 'NOBODY HERE', color: 0xC8243B,
        lines: [far ? `Walk up to ${this.def.answer.name} first: you're too far away to hand it over.` : 'There\'s nobody with you to hand this to. Knock or ring first, and stay close to them.'],
        options: [{ label: 'Back', onPick: () => this.hhDeliver() }]
      });
      return;
    }
    this.S.type = type;
    if (T.pod === 'photo') { this.leaveAtSpot(); return; }
    if (this.def.packages[0].service === 'adult') { this.idCheck(person, () => this.signature(person)); return; }
    this.signature(person);
  }

  /**
   * The customer holds up their photo ID: it is shown full size beside the handheld, where the date of birth can
   * actually be read, and the handheld keeps the decision. (It used to be squeezed onto the handheld's screen,
   * which pushed the last option and Back off the screen and onto the keypad.)
   */
  idCheck(person, next) {
    const hh = this.hh;
    const id = person.id || {};
    const key = OTR.labelArt.idCard(this, { name: person.name, spec: person.spec, dob: id.dob || '03/12/1990', exp: id.exp, idNo: id.no });
    const today = this.set.today || 'Today: 09/17/2026';
    this.showIdCard(key, person.name);
    const then = (fn) => () => { this.hideIdCard(); fn(); };
    const opts = [
      { label: 'Verified: 21 or older', skin: 'ghost', onPick: then(() => { this.S.idResult = 'ok'; next(); }) },
      { label: 'Under 21: can\'t release', skin: 'ghost', onPick: then(() => { this.S.idResult = 'under'; this.idRefused(); }) },
      { label: 'ID expired / doesn\'t match', skin: 'ghost', onPick: then(() => { this.S.idResult = 'invalid'; this.idRefused(); }) }
    ];
    hh.show({
      title: 'CHECK PHOTO ID', color: 0x7B3FC4,
      lines: [{ text: today, color: '#3A2A50', bold: true }, `${person.name} holds up a photo ID. Compare the photo with the face in front of you, then the name, the date of birth and the expiry date.`],
      options: OTR.util.shuffle(opts),
      back: then(() => this.hhDeliver())
    });
  }

  showIdCard(key, name) {
    this.hideIdCard();
    // left of the courier and the customer, under the objectives panel, so both faces stay in view for the comparison
    const c = this.add.container(250, 400).setDepth(2590).setScrollFactor(0);
    const g = OTR.tex.shape(this, (g) => {
      g.fillStyle(0x0E0620, 0.82); g.fillRoundedRect(-196, -150, 392, 300, 18);
      g.lineStyle(2, 0x7B3FC4, 1); g.strokeRoundedRect(-196, -150, 392, 300, 18);
    });
    c.add([g,this.add.image(0, 10, key), OTR.txt(this, 0, -128, `PHOTO ID · ${name.toUpperCase()}`, 13, '#C9B3F0', { weight: '900' })]);
    c.setAlpha(0).setScale(0.9);
    this.tweens.add({ targets: c, alpha: 1, scale: 1, duration: 200, ease: 'Back.out' });
    this.idCardView = c;
  }

  hideIdCard() {
    if (this.idCardView) { this.idCardView.destroy(); this.idCardView = null; }
  }

  idRefused() {
    this.hh.show({ title: 'NOT RELEASED', color: 0xC8243B, lines: ['Record an exception and keep the package.'], options: [{ label: 'Record exception…', onPick: () => this.hhException() }] });
  }

  signature(person) {
    const hh = this.hh;
    const r = this.resident;
    r.face(this.me.x);
    r.play('sign');
    this.me.play('stand');
    hh.show({
      title: 'SIGNATURE', color: 0xFF6600,
      lines: [{ text: `${person.name} is signing…`, color: '#3A2A50' }],
      widget: {
        type: 'signature', onDone: () => {
          r.play('idle');
          this.printedName(person);
        }
      }
    });
  }

  printedName(person) {
    const hh = this.hh;
    const pkg = this.def.packages[0];
    const names = [person.name, pkg.to.split(',')[0], 'Occupant'];
    if (this.def.extraNames) this.def.extraNames.forEach(n => names.push(n));
    const uniq = names.filter((n, i) => names.indexOf(n) === i);
    const opts = OTR.util.shuffle(uniq).map(n => ({ label: n, skin: 'ghost', onPick: () => { this.S.signer = n; this.completeDelivery(); } }));
    hh.show({ title: 'PRINTED NAME', color: 0xFF6600, lines: ['Who signed? Record the printed name of the person who actually signed.'], options: opts });
  }

  completeDelivery() {
    const S = this.S;
    S.outcome = 'delivered';
    S.delivered = S.carrying.slice();
    OTR.audio.play('success');
    const r = this.resident;
    this.hh.close(() => {
      this.stage.lock();
      if (r) {
        this.me.face(r.x);
        this.me.playOnce('handOver', () => this.me.play('idle'));
        this.me.hold(null);
        r.hold(this.me.itemKind || 'box');
        const pk = this.carriedPkgs();
        r.hold(pk.every(p => p.size === 'env') ? 'envelope' : pk.length > 1 || pk.some(p => p.size === 'l') ? 'bigbox' : 'box');
        r.playOnce('receive', () => {
          r.setExpression('happy');
          r.emote(OTR.util.pick(['Thanks!', 'Thank you!', 'Have a good one!']));
          this.stage.unlock();
        });
      } else this.stage.unlock();
      S.carrying = [];
      this.me.hold(null);
      this.refreshObjectives();
      this.say('Delivery recorded. Head back to the van.', '#8BF0C6');
    });
  }

  leaveAtSpot() {
    const hh = this.hh;
    const spots = this.def.spots || [{ id: 'mat', label: 'On the doormat', x: 0, grade: 'good' }];
    const opts = OTR.util.shuffle(spots).map(sp => ({ label: sp.label, skin: 'ghost', onPick: () => { this.S.spot = sp.id; hh.close(() => this.placePackage(sp)); } }));
    opts.push({ label: 'Back', skin: 'ghost', onPick: () => this.hhDeliver() });
    hh.show({ title: 'LEAVE WHERE?', lines: ['Where will you leave it?'], options: opts });
  }

  spotX(sp) {
    const L = this.lot;
    if (sp.x === 'steps') return L.stepsX0 - 30;
    if (typeof sp.x === 'string' && this.propById[sp.x]) return this.propById[sp.x].x + 24;
    return L.doorX + (typeof sp.x === 'number' ? sp.x : 0);
  }

  placePackage(sp) {
    const x = this.spotX(sp);
    // "behind the planter" is drawn behind it, partly hidden by the pot (it used to sit in front, in full view)
    const behind = typeof sp.x === 'string' && this.propById[sp.x];
    this.stage.lock();
    this.stage.walkPlayerTo(x - 50, () => {                 // a scripted walk: carefully, and never judged (STOPS-M8-4)
      this.me.face(x);
      this.me.playOnce('setDown', () => {
        const y = this.stage.groundAt(x);
        const pk = this.carriedPkgs();
        this.pkgProp = this.stage.prop('package', x, { y: y + 4, depth: behind ? behind.depth - 0.5 : 8 });
        if (pk.every(p => p.size === 'env')) this.pkgProp.setScale(0.7, 0.35);
        this.S.carrying = [];
        this.S.delivered = pk.map(p => p.id);
        this.me.hold(null);
        this.me.playOnce('lift', () => {
          // step back towards the street before the camera comes up, so the photo shows the package and the house,
          // not the courier standing in front of them
          this.me.walkTo(this.stage.clampByBarriers(this.me.x, Math.max(this.me.x - 190, 900)), () => {
            this.me.face(x);
            this.me.play('idle');
            this.stage.unlock();
            this.photoMode = true;
            this.startPhoto();
          }, { speed: 200 });
        });
      });
    }, { careful: true });
  }

  startPhoto() {
    const s = this;
    this.stage.lock();
    // the whole screen is the viewfinder: the objectives panel would sit under the instructions
    if (this.objPanel) this.objPanel.setVisible(false);
    const root = this.add.container(0, 0).setDepth(4200).setScrollFactor(0);
    const fw = 380, fh = 260;
    // the viewfinder: four dark bands around the frame, and the frame's corners, moved with the pointer (plain
    // rectangles and one pre-drawn shape: nothing is re-tessellated as the mouse moves)
    const bands = [0, 1, 2, 3].map(() => this.add.rectangle(0, 0, 1, 1, 0x000000, 0.45).setOrigin(0, 0).setScrollFactor(0));
    const shade = this.add.container(0, 0, bands);
    const frame = OTR.tex.shape(this, (g) => {
      g.lineStyle(3, 0xFFFFFF, 1);
      const c = 26;
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => {
        const x = sx * fw / 2, y = sy * fh / 2;
        g.lineBetween(x, y, x - sx * c, y); g.lineBetween(x, y, x, y - sy * c);
      });
      g.lineStyle(1, 0xFFFFFF, 0.5);
      g.strokeCircle(0, 0, 10);
    }).setScrollFactor(0);
    const info = OTR.txt(this, OTR.W / 2, 90, 'PHOTO PROOF: frame the package AND the door or house number, then click', 20, '#ffffff', { weight: '900', stroke: '#16062B', strokeW: 6 }).setScrollFactor(0);
    root.add([shade, frame, info]);
    const catcher = this.add.zone(OTR.W / 2, OTR.H / 2, OTR.W, OTR.H).setInteractive({ useHandCursor: true }).setScrollFactor(0);
    root.add(catcher);
    let fx = OTR.W / 2, fy = OTR.H / 2;
    const cam = this.cameras.main;
    const pkgScreenX = this.pkgProp.x - cam.scrollX;
    fx = pkgScreenX; fy = this.pkgProp.y - 90;
    const draw = () => {
      const t = fy - fh / 2, b = fy + fh / 2, l = fx - fw / 2, r = fx + fw / 2;
      bands[0].setPosition(0, 0).setSize(OTR.W, Math.max(1, t));
      bands[1].setPosition(0, b).setSize(OTR.W, Math.max(1, OTR.H - b));
      bands[2].setPosition(0, t).setSize(Math.max(1, l), fh);
      bands[3].setPosition(r, t).setSize(Math.max(1, OTR.W - r), fh);
      frame.setPosition(fx, fy);
    };
    draw();
    catcher.on('pointermove', (p) => { fx = OTR.util.clamp(p.x, fw / 2, OTR.W - fw / 2); fy = OTR.util.clamp(p.y, fh / 2 + 60, OTR.H - fh / 2); draw(); });
    catcher.on('pointerup', () => snap());
    const keyH = OTR.onKey(this, 'keydown-SPACE', () => snap());
    let snapped = false;
    const snap = () => {
      if (snapped) return;
      snapped = true;
      this.input.keyboard.off('keydown-SPACE', keyH);
      const L = this.lot;
      const rect = { x0: fx - fw / 2 + cam.scrollX, x1: fx + fw / 2 + cam.scrollX, y0: fy - fh / 2, y1: fy + fh / 2 };
      const pb = this.pkgProp.getBounds();
      const inR = (b) => b.x >= rect.x0 && b.right <= rect.x1 && b.y >= rect.y0 && b.bottom <= rect.y1;
      const pkgIn = inR(pb);
      const doorIn = L.doorX > rect.x0 && L.doorX < rect.x1 && (L.floorY - 120) > rect.y0 && (L.floorY - 120) < rect.y1;
      const numIn = L.numberX > rect.x0 && L.numberX < rect.x1 && L.numberY > rect.y0 && L.numberY < rect.y1;
      const grade = pkgIn && (doorIn || numIn) ? 'good' : pkgIn ? 'ok' : 'bad';
      this.S.photo = { grade, pkgIn, doorIn, numIn };
      shade.setVisible(false); frame.setVisible(false); info.setVisible(false);
      OTR.audio.play('shutter');
      const key = 'pod_photo_' + this.def.id + '_' + Date.now();
      this.game.renderer.snapshotArea(Math.round(fx - fw / 2), Math.round(fy - fh / 2), fw, fh, (img) => {
        OTR.fx.flash(this, 0xFFFFFF, 0.8, 250);
        try { if (img && img.width) this.textures.addImage(key, img); } catch (e) { /* ignore */ }
        this._openModals = Math.max(0, this._openModals);
        root.destroy();
        this.photoMode = false;
        this.stage.unlock();
        this.refreshObjectives();                      // brings the objectives panel back
        this.showPhoto(key, grade);
      });
    };
  }

  showPhoto(key, grade) {
    const hh = this.hh;
    const S = this.S;
    const has = this.textures.exists(key);
    const lines = [];
    if (grade === 'good') lines.push({ text: 'Package and location are both clearly in the shot.', color: '#1E9E6B', bold: true });
    else if (grade === 'ok') lines.push({ text: 'The package is in the shot, but there\'s nothing showing WHERE it is.', color: '#B26A00', bold: true });
    else lines.push({ text: 'The package isn\'t fully in the frame.', color: '#C8243B', bold: true });
    // a photo that falls short puts Retake first (key 1) under an amber or red header; using it is still possible
    const use = { label: 'Use this photo', skin: grade === 'good' ? undefined : 'ghost', onPick: () => { S.outcome = 'delivered'; OTR.audio.play('success'); this.refreshObjectives(); hh.close(); this.say('Delivery recorded. Head back to the van.', '#8BF0C6'); } };
    const retake = { label: 'Retake', skin: grade === 'good' ? 'ghost' : undefined, onPick: () => { S.retakes = (S.retakes || 0) + 1; hh.close(() => { this.photoMode = true; this.startPhoto(); }); } };
    hh.open({
      title: 'PHOTO POD', color: grade === 'good' ? 0x1E9E6B : grade === 'ok' ? 0xB26A00 : 0xC8243B,
      image: has ? { key, w: 300, h: 205 } : null,
      lines,
      options: grade === 'good' ? [use, retake] : [retake, use]
    });
  }

  hhException() {
    const hh = this.hh;
    const opts = OTR_DATA.handheld.exceptions.map(ex => ({ label: `${ex.id} · ${ex.label}`, skin: 'ghost', onPick: () => this.confirmException(ex) }));
    hh.show({ title: 'EXCEPTION CODE', color: 0xC8243B, lines: [], options: opts.slice(0, 8), back: () => this.hhHome(hh) });
  }

  confirmException(ex) {
    const hh = this.hh, S = this.S;
    const opts = [{ label: 'Record ' + ex.id, onPick: () => {
      S.outcome = 'exception';
      S.code = ex.id;
      S.exDef = ex;
      OTR.audio.play('beep');
      if (ex.doorTag) {
        hh.show({
          title: 'DOOR TAG', color: 0xFF6600,
          lines: [`Exception ${ex.id} recorded.`, 'Print a door tag so the customer knows you tried, and what happens next?'],
          options: [
            { label: 'Print door tag', onPick: () => { S.tagPrinted = true; S.tagNo = OTR_DATA.handheld.tagPrefix + Math.floor(100000 + Math.random() * 899999); OTR.audio.play('paper'); hh.close(); this.say(`Door tag ${S.tagNo} printed. Attach it to the door.`, '#FFE3C8'); this.refreshObjectives(); } },
            { label: 'Skip the tag', skin: 'ghost', onPick: () => { hh.close(); this.refreshObjectives(); } }
          ]
        });
      } else {
        hh.close();
        this.say(`Exception ${ex.id} recorded. Return the package to the van.`, '#FFE3C8');
        this.refreshObjectives();
      }
    } }, { label: 'Back', skin: 'ghost', onPick: () => this.hhException() }];
    hh.show({ title: ex.id + ' · ' + ex.label, color: 0xC8243B, lines: [ex.desc], options: opts });
  }

  /* ================================================================== finishing */
  confirmFinish() {
    const S = this.S;
    if (!S.outcome) {
      OTR.ui.confirm(this, 'Leave this stop?', 'You haven\'t recorded a delivery or an exception. Leaving now counts as a missed stop.', () => this.finishStop(), { yes: 'Leave anyway' });
      this.fixModalScroll();
      return;
    }
    this.finishStop();
  }

  finishStop() {
    if (this.S.done) return;
    this.S.done = true;
    this.running = false;
    this.stage.lock();
    this.van.hazards(false);
    OTR.audio.play('engine_start');
    this.evaluate();
    this.time.delayedCall(500, () => this.report());
  }

  evaluate() {
    const S = this.S, d = this.def, exp = d.expected, log = this.log;
    const mineIds = d.packages.map(p => p.id);
    const svc = d.packages[0].service || 'standard';
    const lessons = d.lessons || [];
    const L0 = lessons[0];

    // --- safety
    log.check('safety', S.exitSafe === false ? 0 : 2, 2, 'Climbed down from the cab with three points of contact', { lesson: 'Use three points of contact getting in and out of the truck. Jumping down is one of the most common ways couriers get hurt.' });
    // no credit for a climb back in that never happened (a collapse, a stop left unfinished)
    if (S.enterSafe !== null || (S.outcome && !this.collapsed)) log.check('safety', S.enterSafe === false ? 0 : (S.enterSafe === null ? 1 : 2), 2, 'Climbed back into the cab safely', { lesson: 'Grab handle, one step at a time, and never jump up while carrying anything.' });
    const clearLesson = 'Clear trip hazards off the walkway with E, even with a package in hand: set it down, move them, pick it up.';
    Object.keys(S.hazards).forEach(k => {
      const H = S.hazards[k];
      const clearable = H.type === 'hose' || H.type === 'toys';
      // a slip or trip counts whatever happened afterwards (clearing the hose once you have tripped on it used to
      // wipe the fall off the report); a fall with a package in hand is critical
      if (H.incident) {
        log.check('safety', 0, 2, `Slipped or tripped on ${H.label}`, { lesson: 'Slow down on ice, wet steps and cluttered walkways. Short steps, eyes on the path, a hand free for balance.' });
        log.penalty('safety', H.type === 'ice' || H.type === 'wet' ? 2 : 1, H.withLoad ? `Fell on ${H.label} carrying a package` : 'Incident: fall risk',
          { severity: 'major', critical: !!H.withLoad, lesson: H.withLoad ? 'Hold SHIFT and take short steps over anything slippery or cluttered, above all with a package that hides your feet.' : null });
      } else if (H.state === 'cleared') log.check('safety', 2, 2, `Cleared the hazard (${H.label})`);
      else if (H.state === 'careful') {
        // stepping carefully over clutter is safe for you, but leaves it for the next person
        if (clearable) log.check('safety', 1, 2, `Stepped carefully over ${H.label}, but left it on the path`, { lesson: clearLesson });
        else log.check('safety', 2, 2, `Walked carefully over ${H.label}`);
      } else if (H.state === 'passed') log.check('safety', clearable ? 0 : 1, 2, `Got past ${H.label}, but didn't slow down${clearable ? ' or clear it' : ''}`, { lesson: clearable ? clearLesson : 'Slow down and step carefully (hold SHIFT) over uneven ground.' });
      else log.check('safety', 2, 2, `Avoided ${H.label}`);
    });

    // --- service: right package
    const delivered = S.delivered || [];
    const wrongDelivered = delivered.filter(id => mineIds.indexOf(id) < 0);
    const allMine = mineIds.every(id => delivered.indexOf(id) >= 0);
    // A package delivered where the rules said to bring it back (a closed business, a minor at the door) earns none
    // of the ticks that only make sense for a right delivery: the outcome check below is the whole story, and it is
    // critical. (It used to keep 7 of 10 service points: right package, photo, knock.)
    const againstRules = S.outcome === 'delivered' && exp.outcome !== 'deliver';
    if (S.outcome === 'delivered' && !againstRules) {
      if (wrongDelivered.length) {
        log.check('service', 0, 3, 'Delivered the correct package', { lesson: 'Match the label address against the stop before delivering. Scanning catches wrong-stop packages.' });
        log.penalty('service', 3, 'Misdelivery: another customer\'s package left here', { severity: 'major' });
      } else if (!allMine) {
        log.check('service', 1, 3, 'Delivered every piece for this stop', { lesson: 'Check the piece count ("1 of 2") and pull every piece for the stop.' });
      } else log.check('service', 3, 3, 'Delivered the correct package');
    }
    // scanning
    const scannedAll = delivered.concat(S.returned || []).every(id => S.scanned[id]) && Object.keys(S.scanned).length > 0;
    log.check('efficiency', S.scannedInVan ? 1 : 0, 1, 'Scanned the package before leaving the truck', { lesson: 'Scan before you step out. It confirms the stop and shows signature needs before you walk to the door.' });
    if (S.outcome === 'delivered' && !againstRules) log.check('service', scannedAll ? 1 : 0, 1, 'Scanned every package delivered');

    // outcome
    if (!S.outcome) {
      log.check('service', 0, 4, 'Recorded a delivery or exception', { lesson: 'Every stop needs a record: a delivery with proof, or an exception code.' });
    } else if (exp.outcome === 'deliver') {
      if (S.outcome === 'delivered') {
        const typeOk = !exp.types || exp.types.indexOf(S.type) >= 0;
        log.check('service', typeOk ? 3 : 1, 3, 'Chose the right way to deliver', { lesson: L0 });
      } else {
        log.check('service', 0, 3, 'Completed the delivery', { lesson: 'This package could have been delivered. Only use an exception when delivery really isn\'t possible.' });
      }
    } else {
      if (S.outcome === 'exception') {
        log.check('service', S.code === exp.code ? 3 : 1, 3, `Recorded the right exception (${exp.code})`, { lesson: L0 });
      } else {
        log.check('service', 0, 3, 'Delivered when the rules said not to', { lesson: L0, critical: true });
        if (svc === 'signature' || svc === 'adult') log.penalty('service', 2, 'Released a restricted package without proper verification', { severity: 'major', critical: true, lesson: L0 });
      }
    }
    // signature / photo quality
    if (S.outcome === 'delivered' && (S.type === 'left') && !againstRules) {
      if (svc === 'signature' || svc === 'adult') {
        log.check('service', 0, 2, 'Signature-required package handed to a person', { lesson: 'Never leave a signature-required package unattended. Get a signature or record an exception and leave a door tag.' });
        log.penalty('service', 3, 'Left a signature-required package unattended', { severity: 'major', critical: true, lesson: 'Never leave a signature-required package unattended. Get a signature or record an exception and leave a door tag.' });
      }
      const sp = (d.spots || []).find(x => x.id === S.spot);
      if (sp) log.check('service', sp.grade === 'good' ? 2 : sp.grade === 'ok' ? 1 : 0, 2, `Left it in a sensible spot: ${sp.report || sp.label.toLowerCase()}`, { lesson: sp.note || 'Follow the customer\'s delivery note when it\'s safe to.' });
      const ph = S.photo || { grade: 'bad' };
      log.check('service', ph.grade === 'good' ? 2 : ph.grade === 'ok' ? 1 : 0, 2, 'Took a clear proof-of-delivery photo', { lesson: 'A good POD photo shows the package AND where it was left (door, house number), never people.' });
      log.check('service', S.knocks > 0 ? 1 : 0, 1, 'Knocked or rang before leaving the package', { lesson: 'Always attempt contact first. Many customers would rather receive the package in person.' });
    }
    if (S.outcome === 'delivered' && S.type !== 'left' && !againstRules) {
      const person = d.answer || {};
      const nameOk = S.signer === person.name;
      log.check('service', nameOk ? 2 : 0, 2, 'Recorded the signer\'s real printed name', { lesson: 'Record the printed name of whoever actually signed, even if that isn\'t the addressee.' });
    }
    if (S.outcome === 'exception') {
      const ex = S.exDef || {};
      if (exp.doorTag !== undefined || ex.doorTag) {
        const wantTag = exp.doorTag !== undefined ? exp.doorTag : ex.doorTag;
        if (wantTag) log.check('service', S.tagAttached ? 2 : S.tagPrinted ? 1 : 0, 2, 'Left a door tag for the customer', { lesson: 'When a delivery attempt fails, leave a door tag so the customer knows what happened and what to do next.' });
      }
      const kept = (S.returned || []).length > 0 && !(S.delivered || []).length;
      log.check('service', kept ? 2 : 0, 2, 'Kept the package secure on the truck', { lesson: 'After an exception the package goes back on the truck. Never leave it behind.' });
      // not for an unsafe-to-deliver call: walking back to the door past the dog is exactly what not to do
      if (ex.attempt !== false) log.check('service', S.knocks > 0 || (d.lot.kind === 'business') ? 1 : 0, 1, 'Made a real attempt before the exception', { lesson: 'Knock or ring and wait a moment before recording that nobody was available.' });
    }
    if (this.heat) {
      const h = this.heat;
      log.check('safety', h.minHyd >= 35 ? 2 : h.minHyd >= 20 ? 1 : 0, 2, 'Stayed hydrated', { lesson: 'In the heat, drink water before you feel thirsty: a few sips at every stop, even if you don\'t feel like it.' });
      log.check('safety', h.maxTemp < 72 ? 2 : h.maxTemp < 90 ? 1 : 0, 2, 'Kept body heat out of the danger zone', { lesson: 'Use shade and the truck\'s AC to cool down between stops, and slow your pace in extreme heat.' });
    }
    if (svc === 'adult' && exp.id && (S.outcome === 'delivered' ? S.type !== 'left' : true)) {
      log.check('service', S.idResult === exp.id ? 2 : 0, 2, 'Checked the photo ID properly (age, expiry, name)', { lesson: 'Adult signature means a valid, unexpired photo ID showing the person is 21 or older. Check the date of birth against today\'s date.' });
    }
    if (d.checkAddress) log.check('service', S.addressChecked ? 2 : 0, 2, 'Checked the house number against the label', { lesson: 'Check the number on the building against the label. "Close enough" addresses cause misdeliveries.' });

    // --- efficiency
    const par = d.par || 120;
    const t = S.elapsed;
    const eff = t <= par ? 3 : t <= par * 1.4 ? 2 : t <= par * 2 ? 1 : 0;
    // time counts only for a stop that was finished (a collapsed stop used to earn three time stars)
    if (S.outcome && !this.collapsed) log.check('efficiency', eff, 3, `Finished the stop in good time (${Math.round(t)}s, par ${par}s)`, { lesson: 'Plan the stop before you step out: package pulled, scanned and ready. It saves walks back to the truck.' });
    if (S.vanTrips > 0) log.penalty('efficiency', Math.min(2, S.vanTrips), `Extra trip${S.vanTrips > 1 ? 's' : ''} back into the truck`);
    if (S.wrongPulls > 0) log.check('efficiency', 0, 1, 'Pulled only the right package from the shelves', { lesson: 'Read the whole address (number, street and unit) before pulling a package. Near-matches are easy to grab.' });
    else log.check('efficiency', 1, 1, 'Pulled only the right package from the shelves');
    this.stopSummary = { outcome: S.outcome, code: S.code, type: S.type, time: t };
  }

  report() {
    const log = this.log, gid = this.def.id;
    const items = log.items.filter(it => it.group === gid);
    const cats = this.cats;
    const shown = items.filter(it => cats.indexOf(it.cat) >= 0 || it.kind === 'penalty');
    const total = this.shiftStop ? this.shiftStop.total : this.set.stops.length;
    const idx = this.shiftStop ? this.shiftStop.index : this.stopIndex + 1;
    const last = idx >= total;
    const s = this;
    const w = 860, h = 620;
    OTR.ui.modal(this, {
      w, h, depth: 5000,
      build: (box, api) => {
        box.add(OTR.tex.shape(this, (hg) => { hg.fillStyle(0x4D148C, 1); hg.fillRoundedRect(-w / 2, -h / 2, w, 86, { tl: 22, tr: 22, bl: 0, br: 0 }); }));
        const pkg = this.def.packages[0];
        box.add(OTR.txt(this, -w / 2 + 30, -h / 2 + 28, `STOP ${idx} REPORT`, 14, '#FFB27A', { ox: 0, weight: '900' }));
        const oc = this.S.outcome === 'delivered' ? 'DELIVERED' : this.S.outcome === 'exception' ? `EXCEPTION ${this.S.code}` : 'NOT COMPLETED';
        box.add(OTR.txt(this, -w / 2 + 30, -h / 2 + 58, `${pkg.number} ${pkg.street} · ${oc}`, 26, '#ffffff', { ox: 0, weight: '900' }));
        // per-category mini stars
        // right-aligned, however many categories (a route-day stop reports all three)
        cats.forEach((cat, i) => {
          const r = log.ratio(cat, gid);
          // a critical mistake caps the category here too, as on the results screen
          const n = log.criticals(gid, [cat]).length ? Math.min(1, OTR.scoring.stars(r)) : OTR.scoring.stars(r);
          const cs = OTR.ui.catStars(this, w / 2 - 140 - (cats.length - 1 - i) * 118, -h / 2 + 44, cat, n, { size: 18 });
          box.add(cs);
        });
        // Every check in its logical order when they all fit. When they do not, what went wrong comes first (so it
        // is never what gets cut) and whatever is left over is summed up in one line above the button. (It used to
        // stop at 13 rows, whatever they said and however tall they were.)
        const limit = h / 2 - 96;
        const isGood = (it) => it.kind !== 'penalty' && it.got >= it.max;
        const rows = shown.map((it, i) => {
          const good = isGood(it);
          const lesson = !good && (it.feedback || it.lesson)
            ? OTR.txt(this, -w / 2 + 88, 0, '↳ ' + (it.lesson || it.feedback), 13, '#7A6A90', { ox: 0, oy: 0, bold: false, wrap: w - 180 })
            : null;
          return { it, i, good, lesson, h: 26 + (lesson ? lesson.height + 4 : 0) };
        });
        const fits = rows.reduce((n, r) => n + r.h, 0) <= limit - (-h / 2 + 110);
        if (!fits) rows.sort((a, b) => (a.good - b.good) || (!!b.it.critical - !!a.it.critical) || (a.i - b.i));
        let y = -h / 2 + 110, drawn = 0;
        for (const r of rows) {
          const left = rows.length - drawn;
          if (y + r.h > limit - (left > 1 && !fits ? 24 : 0)) break;
          const it = r.it, good = r.good;
          const part = it.kind !== 'penalty' && it.got > 0 && it.got < it.max;
          const col = good ? 0x2BC48A : part ? 0xFFB020 : 0xF0435A;
          box.add(OTR.tex.shape(this, (g) => { g.fillStyle(col, 1); g.fillCircle(0, 0, 10); }, -w / 2 + 44, y + 11));
          box.add(OTR.txt(this, -w / 2 + 44, y + 11, good ? '✓' : part ? '~' : '✗', 13, '#ffffff', { weight: '900' }));
          const def = OTR_DATA.config.categories[it.cat];
          box.add(this.add.image(-w / 2 + 70, y + 11, def.icon).setDisplaySize(16, 16).setTint(def.color));
          // one answer scored in two categories reads as two lines: name the category so they are not identical
          const twin = shown.filter(o => o.label === it.label).length > 1 ? ` (${def.label.toLowerCase()})` : '';
          box.add(OTR.txt(this, -w / 2 + 88, y + 1, (it.critical ? 'CRITICAL · ' : '') + it.label + twin, 16, it.critical ? '#B3122E' : '#250849', { ox: 0, oy: 0, weight: good ? 'normal' : 'bold', wrap: w - 220 }));
          box.add(OTR.txt(this, w / 2 - 30, y + 11, it.kind === 'penalty' ? `${it.got}` : `${it.got}/${it.max}`, 15, OTR.color.css(col), { ox: 1, weight: '900' }));
          y += 26;
          if (r.lesson) { r.lesson.setY(y - 2); box.add(r.lesson); y += r.lesson.height + 4; }
          drawn++;
        }
        rows.slice(drawn).forEach(r => { if (r.lesson) r.lesson.destroy(); });
        if (drawn < rows.length) {
          const rest = rows.slice(drawn), bad = rest.filter(r => !r.good).length;
          box.add(OTR.txt(this, -w / 2 + 88, y + 2, `+ ${rest.length} more check${rest.length > 1 ? 's' : ''}${bad ? ` (${bad} to work on)` : ', all passed'}`, 14, '#7A6A90', { ox: 0, oy: 0, bold: false }));
        }
        void api;
      },
      buttons: [{
        label: last ? (this.shiftMode ? 'Back to route ▶' : 'Finish ▶') : 'Next stop ▶', skin: 'orange', key: ['ENTER', 'SPACE'],
        onClick: () => s.nextStop()
      }]
    });
    this.fixModalScroll();
    OTR.audio.play(this.S.outcome ? 'good' : 'fail');
  }

  nextStop() {
    const total = this.set.stops ? this.set.stops.length : 1;
    if (this.shiftMode && OTR.shift) { OTR.shift.stopDone(this, this.log, this.stopSummary); return; }
    // the next stop starts from a recovered state: after a collapse as if treated and rested, otherwise after the
    // drive in the AC, never already in the danger zone (it used to start at body heat 81 with the warning firing)
    const h = this.heat;
    const heat = !h ? null : this.collapsed ? { hyd: 80, temp: 35 } : { hyd: Math.min(100, Math.max(50, h.hyd + 10)), temp: Math.min(50, Math.max(30, h.temp - 15)) };
    const carry = { log: this.log.toJSON(), clock: this.clockMin + 12, heat };
    if (this.stopIndex + 1 < total) {
      OTR.fx.transition(this, 'StopScene', { scenarioId: this.scenarioId, stopIndex: this.stopIndex + 1, carry });
      return;
    }
    const ratios = this.log.ratios(this.cats);
    this.finished = false;
    // the log ranks every stop's mistakes in the scenario's categories; the set's key lessons follow
    this.finish({ score: this.log.score(), ratios, log: this.log, lessons: this.set.keyLessons || [], stats: { log: this.log.toJSON() } }, 100);
  }

  update(time, delta) {
    if (!this.stage) return;
    this.stage.update(delta);
    // through the gate the courier is in the yard, behind the front fence
    if (this.gate && this.me && this.me.c.active) {
      const d = this.me.x > this.gate.x + 20 ? 26 : 30;
      if (this.me.c.depth !== d) this.me.setDepth(d);
    }
    if (this.running && !this.S.done) {
      const dt = delta / 1000;
      if (this._openModals === 0 && !this.talkCtl) this.S.elapsed += dt;
      this.clockMin += dt / 6;
      this.updateHeat(dt);
      this._clockAcc = (this._clockAcc || 0) + dt;
      if (this._clockAcc > 1) { this._clockAcc = 0; this.setClock(); }
    }
  }
}
OTR.registerScene(StopScene);
