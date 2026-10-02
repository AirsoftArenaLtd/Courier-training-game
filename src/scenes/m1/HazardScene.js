/*
 * Module 1 · Spot the Hazard: hazard perception on the town engine (data/m1_hazards.js).
 *
 * The van drives itself down a street; the trainee's only input is SPACE (or a click) when they see a hazard starting
 * to develop. Each clip stages one: a ball then a child from between parked cars, a car backing out of a driveway,
 * a pedestrian on their phone heading for the crossing, a door opening from a parked car, a car running a stop sign.
 * Scored 5 down to 1 inside the window after the first clue, 0 before it or after, and 0 for clicking wildly.
 */
class HazardScene extends TownDriveScene {
  constructor() { super('HazardScene'); }

  init(data) {
    data = data || {};
    this.initData = data;
    const fallback = OTR.registry.all().find(s => s.scene === 'HazardScene');
    this.scenarioId = data.scenarioId || (fallback && fallback.id);
    this.scenario = OTR.registry.get(this.scenarioId);
    this.content = data.content || (this.scenario ? OTR.registry.content(this.scenario) : OTR_DATA.hazardClips);
    const C = this.content;
    this.d = { seed: C.seed || 7, weather: 'clear', tod: 'midday', route: [], clock: () => '' };
    this.lab = false;
    this.shiftMode = false;
    this.quietStart = true;
    this.finished = false;
    this._openModals = 0;
    this.clipIndex = -1;
    this.results = [];
  }

  create() {
    super.create();
    // no traffic, nobody walking, no rules: this is watching, not driving
    this.cars.forEach(c => c.img.destroy()); this.cars.length = 0;
    this.peds.forEach(p => p.img.destroy()); this.peds.length = 0;
    this.stepCars = () => {}; this.stepPeds = () => {}; this.checkRules = () => {};
    this.buckled = true; this.lights = true;
    this.pullOut.pending = false;
    this.stopLabel.setText('SPOT THE HAZARD');
    this.stopText.setText('');
    this.actors = [];
    this.buildFlagHud();
    // the drive's controls line: here there is one control
    const ctl = this.children.list.find(o => o.type === 'Text' && /^W go/.test(o.text));
    if (ctl) ctl.setText('SPACE or click: a hazard is developing  ·  ENTER next clip  ·  ESC pause');
    this.input.on('pointerdown', (p) => { if (p.y > 70) this.flag(); });
    OTR.onKey(this, 'keydown-SPACE', () => this.flag());
    this.time.delayedCall(150, () => this.openIntro());
  }

  /* the drive's own controls do nothing here */
  setupInput() {
    this.held = {};
    OTR.onKey(this, 'keydown-ESC', () => this.openPause());
    OTR.pauseOnBlur(this, () => this.openPause());
  }

  heldAny() { return false; }

  buildFlagHud() {
    this.flagPill = this.add.container(OTR.W / 2, OTR.H - 96).setScrollFactor(0).setDepth(806);
    const t = OTR.txt(this, 0, 0, 'SPACE or click: a hazard is developing', 18, '#ffffff', { weight: '900' });
    const w = t.width + 50;
    this.flagPill.add([OTR.tex.shape(this, (g) => { g.fillStyle(0x16062B, 0.9); g.fillRoundedRect(-w / 2, -21, w, 42, 21); g.lineStyle(3, 0xFFC83D, 1); g.strokeRoundedRect(-w / 2, -21, w, 42, 21); }), t]);
    this.flagPill.setVisible(false);
    this.marks = this.add.container(0, 0).setScrollFactor(0).setDepth(806);
    this.syncCameras();
  }

  openIntro() {
    const C = this.content;
    OTR.ui.modal(this, {
      title: C.intro.title, w: 720, h: 420, depth: 5000,
      build: (box, api, w, h) => {
        let y = -h / 2 + 96;
        C.intro.lines.forEach(line => {
          box.add(this.add.image(-w / 2 + 56, y + 12, 'ic_arrow').setDisplaySize(20, 20).setTint(0xFF6600));
          const t = OTR.txt(this, -w / 2 + 78, y, line, 18, '#3A2A50', { ox: 0, oy: 0, bold: false, wrap: w - 140, lineSpacing: 3 });
          box.add(t);
          y += t.height + 14;
        });
      },
      buttons: [{ label: 'First clip ▶', skin: 'orange', key: ['ENTER'], hint: '⏎', onClick: () => this.time.delayedCall(200, () => this.nextClip()) }]
    });
  }

  /* ------------------------------------------------------------------ clips */
  nextClip() {
    this.clipIndex++;
    const C = this.content;
    if (this.clipIndex >= C.clips.length) { this.endDrill(); return; }
    this.actors.forEach(a => a.destroy()); this.actors = [];
    this.marks.removeAll(true);
    const clip = this.clip = C.clips[this.clipIndex];
    const T = this.T, P = this.P;
    const row = Math.min(clip.row, T.hy.length - 1), dir = clip.dir;
    const speed = clip.mph * 0.447 * P;                              // px/s
    const x0 = dir > 0 ? T.vx[0] + 150 : T.vx[T.vx.length - 1] - 150;
    // in its lane, a little towards the centre line: clear of the parked cars along the curb
    this.run = { t: 0, x: x0, y: T.hy[row] + dir * (OTR.townArt.ROAD / 4 - 22), dir, speed, v: speed, row, flags: [], done: false, brakeAt: clip.at + 1.6 };
    // where the hazard is staged: 650 px ahead of the van when its first clue shows
    this.run.hx = x0 + dir * (speed * clip.at + 650);
    // a mid-block hazard (a ball, a door) stays clear of the junctions, among the parked cars
    if (clip.kind === 'ball' || clip.kind === 'door') {
      const A = OTR.townArt;
      // (the van starts as far further on, so the clue still shows 650 px ahead of it)
      for (let i = 0; i < 6 && T.vx.some(jx => Math.abs(this.run.hx - jx) < A.ROAD / 2 + 260); i++) { this.run.hx += dir * 120; this.run.x += dir * 120; }
    }
    this.stage(clip);
    this.stopLabel.setText('SPOT THE HAZARD');
    this.stopText.setText(`Clip ${this.clipIndex + 1} of ${C.clips.length} · ${clip.title}`);
    this.flagPill.setVisible(true);
    this.van.x = this.run.x; this.van.y = this.run.y; this.van.heading = dir > 0 ? 0 : Math.PI;
    this.updateCamera(0, true);
    this.syncCameras();
  }

  img(key, x, y, rot, depth) {
    const o = this.add.image(x, y, key).setRotation(rot || 0).setDepth(depth || 28);
    this.actors.push(o);
    return o;
  }

  /** The clip's actors and what they do over time (this.run.script(t) is called every frame). */
  stage(clip) {
    const R = this.run, T = this.T, dir = R.dir, A = OTR.townArt, P = this.P;
    const street = T.hy[R.row];
    const kerbY = street + dir * (A.ROAD / 2 - 23);                    // parked cars on the van's right, tight to the curb
    const walkY = street + dir * (A.ROAD / 2 + A.WALK / 2);
    const carKey = (c) => OTR.art.carTop(this, c);
    const heading = dir > 0 ? 0 : Math.PI;
    const parked = (x, c) => this.img(carKey(c), x, kerbY, heading + Math.PI / 2).setScale(0.7, 0.88);
    const at = clip.at;
    if (clip.kind === 'ball') {
      const ball = this.add.circle(R.hx, kerbY + dir * 20, 7, 0xE8304A).setDepth(29); this.actors.push(ball);
      const kid = this.img(A.pedTop(this, 0xFFC83D), R.hx - dir * 20, walkY, 0, 29).setVisible(false);
      R.script = (t) => {
        if (t >= at) ball.y = kerbY + dir * 20 - dir * Math.min(120, (t - at) * 80);
        if (t >= at + 1.4) { kid.setVisible(true); kid.y = walkY - dir * Math.min(150, (t - at - 1.4) * 70); }
      };
    } else if (clip.kind === 'reversing') {
      // a real driveway on the van's side of the street, nearest where the hazard belongs
      const lot = T.lots.filter(l => l.row === R.row && l.side === dir && l.kind === 'house')
        .sort((a, b) => Math.abs(a.x + 60 - R.hx) - Math.abs(b.x + 60 - R.hx))[0];
      if (lot) R.hx = lot.x + 60;
      const dy = street + dir * (A.ROAD / 2 + A.WALK + 58);
      const car = this.img(carKey(0x2A2A32), R.hx, dy + dir * 20, dir > 0 ? Math.PI : 0).setScale(0.7, 0.88);
      const lamps = [this.add.rectangle(R.hx - 8, 0, 6, 4, 0xFFFFFF).setDepth(29), this.add.rectangle(R.hx + 8, 0, 6, 4, 0xFFFFFF).setDepth(29)];
      lamps.forEach(l => { l.setVisible(false); this.actors.push(l); });
      R.script = (t) => {
        if (t >= at + 1.5) car.y = dy + dir * 20 - dir * Math.min(110, (t - at - 1.5) * 45);
        lamps.forEach(l => { l.setVisible(t >= at); l.y = car.y - dir * 40; });
      };
    } else if (clip.kind === 'phone') {
      const it = T.inters.reduce((b, i) => (i.row === R.row && (i.x - R.hx) * dir > -100 && (!b || Math.abs(i.x - R.hx) < Math.abs(b.x - R.hx)) ? i : b), null);
      const cx = it ? it.x - dir * (A.ROAD / 2 + 24) : R.hx;
      R.hx = cx;
      const ped = this.img(A.pedTop(this, 0x3DA5FF), cx - dir * 260, walkY, 0, 29);
      const phone = this.add.rectangle(0, 0, 6, 9, 0x16062B).setDepth(30); this.actors.push(phone);
      R.script = (t) => {
        // walking along the sidewalk to the crossing, then straight off the curb without a look
        if (t < at + 1.2) ped.x = cx - dir * Math.max(0, 260 - t * 26);
        else { ped.x = cx; ped.y = walkY - dir * Math.min(170, (t - at - 1.2) * 60); }
        phone.setPosition(ped.x + 8, ped.y - 8);
      };
    } else if (clip.kind === 'door') {
      const car = parked(R.hx, 0x7B3FC4);
      const brake = [this.add.rectangle(0, 0, 6, 4, 0xFF3040).setDepth(29), this.add.rectangle(0, 0, 6, 4, 0xFF3040).setDepth(29)];
      brake.forEach(b => { b.setVisible(false); this.actors.push(b); });
      const door = this.add.rectangle(R.hx + dir * 18, kerbY - dir * 20, 34, 5, 0x7B3FC4).setDepth(29).setStrokeStyle(1, 0x16062B).setVisible(false);
      this.actors.push(door);
      R.script = (t) => {
        brake[0].setPosition(R.hx - dir * 46, kerbY - 10); brake[1].setPosition(R.hx - dir * 46, kerbY + 10);
        brake.forEach(b => b.setVisible(t >= at));
        if (t >= at + 1.3) { door.setVisible(true); door.setRotation(-dir * Math.min(1.2, (t - at - 1.3) * 2.4)); door.setPosition(R.hx + dir * 10, kerbY - dir * 22); }
      };
      void car;
    } else if (clip.kind === 'runner') {
      const it = T.inters.reduce((b, i) => (i.row === R.row && (i.x - R.hx) * dir > -50 && (!b || Math.abs(i.x - R.hx) < Math.abs(b.x - R.hx)) ? i : b), null);
      const jx = it ? it.x : R.hx;
      R.hx = jx;
      const laneX = jx + dir * (A.ROAD / 4);                            // the side street's lane coming towards our road
      const from = street + dir * 700;
      const car = this.img(carKey(0xE8A33D), laneX, from, dir > 0 ? -Math.PI / 2 + Math.PI / 2 : Math.PI).setScale(0.7, 0.88);
      car.setRotation(dir > 0 ? 0 : Math.PI);
      R.script = (t) => {
        // it comes up the side street fast and never slows for its stop sign: in view from just before the clue,
        // into the junction as the van brakes
        const start = at - 1;
        if (t >= start) car.y = from - dir * Math.min(1400, (t - start) * 190);
        car.setVisible(t >= start);
      };
    }
    // parked cars all the way along the curb: a gap where the hazard is, none in a junction or across a driveway
    const inJunction = (x) => T.vx.some(jx => Math.abs(x - jx) < A.ROAD / 2 + A.STOP_LINE + 60);
    for (let k = -8; k <= 8; k++) {
      const x = R.hx + dir * k * 150;
      if ((k === 0 && clip.kind !== 'door') || inJunction(x)) continue;
      if (clip.kind === 'door' && k === 0) continue;                   // the door car is placed by its own staging
      parked(x, [0xC8243B, 0x3DA5FF, 0xF4F4F8, 0x2BC48A][(k + 8) % 4]);
    }
    // where the scripted van stops: short of the hazard
    R.stopX = R.hx - dir * 230;
    this.syncCameras();
  }

  /* the van: scripted along its lane, braking once the hazard is real */
  stepVan(dt) {
    const v = this.van, R = this.run;
    if (!R || R.done || this.finished) { v.u = 0; this.drawVan(dt); return; }
    R.t += dt;
    if (R.t >= R.brakeAt) R.v = Math.max(0, R.v - 7 * this.P * dt);
    OTR.audio.loop('engine', { vol: 0.05 + Math.min(1, R.v / R.speed) * 0.06, freq: 70 + (R.v / this.P) * 5 });
    // never past the stopping point
    const left = (R.stopX - R.x) * R.dir;
    const step = Math.min(R.v * dt, Math.max(0, left));
    R.x += R.dir * step;
    v.x = R.x; v.y = R.y; v.heading = R.dir > 0 ? 0 : Math.PI; v.u = (step / Math.max(dt, 1e-3)) / this.P; v.lat = 0; v.r = 0; v.gear = 1;
    v.brake = R.t >= R.brakeAt ? 1 : 0;
    if (R.script) R.script(R.t);
    this.drawVan(dt);
    if (R.t > R.brakeAt + 3.2 && !R.done) { R.done = true; this.scoreClip(); }
  }

  flag() {
    const R = this.run;
    if (!R || R.done || this.finished || (this._modalStack || []).some(m => m.active)) return;
    R.flags.push(R.t);
    OTR.audio.play('tick');
    // a flag on the timeline at the bottom of the screen
    const x = 360 + Math.min(1, R.t / (this.clip.at + this.content.window + 2)) * 560;
    this.marks.add(this.add.triangle(x, OTR.H - 132, 0, 0, 14, 0, 7, 12, 0xFFC83D).setScrollFactor(0));
    this.syncCameras();
  }

  /** A clip's points for its presses (seconds): the first inside the window counts, 5 down to 1; too many is 0. */
  points(flags, clip) {
    const C = this.content, W = C.window;
    if (flags.length > C.maxFlags) return { pts: 0, hit: null, tooMany: true };
    const hit = flags.find(f => f >= clip.at && f <= clip.at + W);
    return { pts: hit === undefined ? 0 : Math.max(1, 5 - Math.floor((hit - clip.at) / W * 5)), hit: hit === undefined ? null : hit, tooMany: false };
  }

  scoreClip() {
    const C = this.content, R = this.run, clip = this.clip;
    const { pts, hit, tooMany } = this.points(R.flags, clip);
    this.results.push({ id: clip.id, pts, flags: R.flags.length, tooMany });
    const lesson = clip.why;
    this.log.check('safety', pts, 5, `Spotted it: ${clip.title}`, { lesson });
    this.flagPill.setVisible(false);
    const head = tooMany ? 'Too many presses: 0 points' : pts ? `Spotted after ${(hit - clip.at).toFixed(1)} s: ${pts} / 5` : R.flags.some(f => f < clip.at) && !R.flags.some(f => f >= clip.at) ? 'Too early, and not again when it started: 0 / 5' : 'Missed it: 0 / 5';
    OTR.audio.play(pts >= 4 ? 'good' : pts ? 'pop' : 'fail');
    OTR.ui.modal(this, {
      title: head, w: 700, h: 330, depth: 5000, body: lesson,
      buttons: [{ label: this.clipIndex + 1 < C.clips.length ? 'Next clip ▶' : 'See my score ▶', skin: 'orange', key: ['ENTER'], hint: '⏎', keyAfter: 500, onClick: () => this.time.delayedCall(200, () => this.nextClip()) }]
    });
  }

  endDrill() {
    if (this.finished) return;
    this.finished = true;
    this.leaving = true;
    OTR.audio.stopLoop('engine');
    const total = this.results.reduce((n, r) => n + r.pts, 0), max = this.content.clips.length * 5;
    OTR.flow.complete(this, this.scenarioId, {
      score: total * 100, ratios: { safety: total / max }, log: this.log,
      lessons: total >= max - 2 ? [this.content.lessons.perfect] : [this.content.lessons.late],
      summary: 'Clips: ' + this.results.map((r, i) => `${i + 1}: ${r.pts}/5`).join('  ·  ')
    });
  }

  openPause() {
    if (this.finished || this.scene.isPaused()) return;
    this.scene.launch('PauseScene', { parent: this.scene.key, title: 'Spot the Hazard' });
    this.scene.pause();
  }
}
OTR.registerScene(HazardScene);
