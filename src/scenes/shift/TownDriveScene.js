/*
 * Top-down driving between stops, on the vehicle model in src/core/vehicle.js (tuned in data/vehicle.js).
 *
 * The van has real weight: about 8 s to reach 25 mph, about 14 m to stop from it, it runs wide when you turn in
 * too fast and it slides on wet or icy roads. Reverse is selected the way it is in the cab: stop, lift off the
 * brake, then press and hold it again. Collisions are oriented boxes against buildings and traffic, and each one
 * is judged on how fast you hit.
 *
 * One world scale for everything: OTR_DATA.vehicle.pxPerMetre. Speeds read in mph, distances in metres.
 *
 * Controls: W/↑ accelerate · S/↓ brake (in either gear) · R change gear D/R at a standstill · A/D or ←/→ steer ·
 *           SPACE parking brake · B belt · L headlights · G get out and look · P park at a stop · TAB handheld (parked)
 */
class TownDriveScene extends Phaser.Scene {
  constructor(key) { super(key || 'TownDriveScene'); }

  init(data) {
    this.d = data || {};
    this.initData = this.d;                         // the pause menu's Restart starts the drive with this again
    this.lab = !!this.d.lab;
    this.shiftMode = !!this.d.shift;
  }

  create() {
    this.P = OTR_DATA.vehicle.pxPerMetre;
    this.T = OTR.town.build(this.d.seed || 1);
    const T = this.T;
    this.blockers = OTR.town.blockers(this.T);
    this.blockers.forEach((b, i) => { b.what = i === this.blockers.length - 1 ? 'the station' : 'a building'; });
    // the town ends in a lawn margin; these keep the van on the map without counting as a crash
    this.edges = [
      { x: -400, y: -400, w: T.W + 800, h: 400, edge: true }, { x: -400, y: T.H, w: T.W + 800, h: 400, edge: true },
      { x: -400, y: 0, w: 400, h: T.H, edge: true }, { x: T.W, y: 0, w: 400, h: T.H, edge: true }
    ];
    this.log = this.d.log ? OTR.ScoreLog.from(this.d.log) : new OTR.ScoreLog();
    this.log.setGroup('drive');
    this.weather = this.d.weather || 'clear';
    this.tod = this.d.tod || 'midday';
    this.violations = {};
    this.lastViolationAt = {};
    this.buckled = false;
    this.goalAt = -99;
    this.goalBusy = false;
    this.reverseDist = 0;           // metres backed since you last drove forward
    this.elapsed = 0;
    this.stoppedAt = -9;            // when the van was last at a standstill (P allows a moment after it)
    this.parked = false;
    this.approach = null;
    this.lights = false;
    this.lightsWanted = ['rain', 'storm', 'snow', 'fog'].indexOf(this.weather) >= 0 || ['dusk', 'night', 'dawn', 'evening'].indexOf(this.tod) >= 0;
    this.grip = 1;                  // overall grip multiplier (hazards can pull it down)
    this.gripPatches = [];          // local grip: { x, y, r (px), mu: number | () => number }
    this.hazardMsg = null;
    this.damage = 0;
    this.world = {
      mu: (x, y) => this.muAt(x, y),
      rolling: (x, y) => (this.surfaceAt(x, y) === 'grass' ? OTR_DATA.vehicle.grassRolling : 0)
    };

    this.buildWorld();
    this.buildTraffic();
    this.buildVan();
    this.buildHud();
    this.setupInput();

    this.atmos = OTR.atmos.apply(this, { tod: this.tod, weather: this.weather, depth: 700, vignette: true });
    OTR.fx.enter(this);
    this.cameras.main.setBounds(0, 0, this.T.W, this.T.H);
    this.camZoom = 0.9;
    this.camLead = { x: 0, y: 0 };
    this.camPos = { x: this.van.x, y: this.van.y };
    this.updateCamera(0, true);
    this.beams = this.add.graphics().setDepth(-84).setBlendMode(Phaser.BlendModes.ADD);
    this.setupUiCamera();
    // The engine hum belongs to this drive: quiet while paused, and gone however the scene ends. (Quitting from
    // the pause menu used to leave it humming on the hub and every screen after.)
    const hush = () => OTR.audio.stopLoop('engine');
    this.events.on('pause', hush);
    this.events.once('shutdown', () => { hush(); this.events.off('pause', hush); });
    if (this.onCreated) this.onCreated();
    if (!this.quietStart) this.time.delayedCall(400, () => this.toast('Buckle up: press B', 0xFFC83D));
    if (!this.quietStart && this.lightsWanted) this.time.delayedCall(2600, () => { if (!this.lights) this.toast(`${this.weather === 'clear' ? 'Low light' : 'Bad weather'}: headlights on (L)`, 0xFFC83D); });
  }

  /* ================================================================ world */
  buildWorld() {
    const T = this.T, A = OTR.townArt;
    const full = A.ROAD + A.WALK * 2, R = A.ROAD / 2;
    this.add.tileSprite(0, 0, T.W, T.H, A.lawn(this)).setOrigin(0, 0).setDepth(-100);

    T.hy.forEach((y) => this.add.tileSprite(0, y - full / 2, T.W, full, A.roadH(this)).setOrigin(0, 0).setDepth(-90));
    T.vx.forEach((x) => this.add.tileSprite(x - full / 2, 0, full, T.H, A.roadV(this)).setOrigin(0, 0).setDepth(-90));

    const crossKey = A.cross(this), cwKey = A.crosswalk(this), slKey = A.stopLine(this);
    // approach = the side the driver arrives from; lane = which half of the road their lane is on
    this.APPROACH = {
      W: { dx: -1, dy: 0, lane: 1 }, E: { dx: 1, dy: 0, lane: -1 },
      N: { dx: 0, dy: -1, lane: -1 }, S: { dx: 0, dy: 1, lane: 1 }
    };
    T.inters.forEach(it => {
      this.add.image(it.x, it.y, crossKey).setDepth(-89);
      it.signs = {};
      Object.keys(this.APPROACH).forEach(dir => {
        const a = this.APPROACH[dir];
        const cw = this.add.image(it.x + a.dx * (R + 24), it.y + a.dy * (R + 24), cwKey).setDepth(-88);
        if (a.dx !== 0) cw.setAngle(90);
        // stop line, in the driver's own lane
        const lx = it.x + a.dx * (R + A.STOP_LINE) + (a.dx === 0 ? a.lane * R / 2 : 0);
        const ly = it.y + a.dy * (R + A.STOP_LINE) + (a.dy === 0 ? a.lane * R / 2 : 0);
        const sl = this.add.image(lx, ly, slKey).setDepth(-87);
        if (a.dx !== 0) sl.setAngle(90);
        // sign or signal on the driver's right-hand kerb, level with the stop line
        const kx = it.x + a.dx * (R + A.STOP_LINE + 12) + (a.dx === 0 ? a.lane * (R + 46) : 0);
        const ky = it.y + a.dy * (R + A.STOP_LINE + 12) + (a.dy === 0 ? a.lane * (R + 46) : 0);
        it.signs[dir] = it.stop
          ? this.add.image(kx, ky, A.signTex(this, 'stop')).setDepth(42)
          : this.add.image(kx, ky, A.trafficLight(this, 'red')).setDepth(42);
      });
    });

    const z = T.spec.schoolZone;
    if (z) {
      const y = T.hy[z.row];
      // on the right-hand kerb of each way in, before the junction where the zone starts, and big enough to read
      // (they were small, on the driver's left and 10 m inside the zone)
      this.add.image(T.vx[z.from] - R - 90, y + R + 40, A.signTex(this, 'school')).setDepth(42).setScale(1.6);
      this.add.image(T.vx[z.to] + R + 90, y - R - 40, A.signTex(this, 'school')).setDepth(42).setScale(1.6);
    }

    const houseKeys = [0, 1, 2, 3].map(v => A.house(this, v));
    const bizKeys = [0, 1].map(v => A.biz(this, v));
    const aptKey = A.apt(this);
    const roofTints = [0xB8848C, 0x8CA3B8, 0xB8A98C, 0x9AB88C, 0xA98CB8, 0xD0C0A8];
    T.lots.forEach((l, i) => {
      let img;
      if (l.kind === 'apartment') img = this.add.image(l.x, l.y, aptKey);
      else if (l.kind === 'business') img = this.add.image(l.x, l.y, bizKeys[l.variant % 2]);
      else img = this.add.image(l.x, l.y, houseKeys[l.variant % 4]).setTint(roofTints[i % roofTints.length]);
      img.setDepth(10).setScale(OTR.town.SCALE);
      l.img = img;
      const dw = this.add.image(l.x + 60, (l.curb.y + l.y) / 2, A.driveway(this)).setDepth(-80);
      dw.setDisplaySize(70, Math.abs(l.curb.y - l.y));
    });

    // trees stay on the lawns: clear of the street, the sidewalk and the buildings
    const treeKeys = [0, 1, 2].map(v => A.tree(this, v));
    const RND = OTR.scenery.rng('trees' + T.seed);
    for (let i = 0; i < 90; i++) {
      const x = 60 + RND() * (T.W - 120), y = 60 + RND() * (T.H - 120);
      const k = Math.floor(RND() * 3);
      if (this.streetDist(x, y) < R + A.WALK + 44) continue;
      if (this.blockers.some(b => x > b.x - 40 && x < b.x + b.w + 40 && y > b.y - 40 && y < b.y + b.h + 40)) continue;
      this.add.image(x, y, treeKeys[k]).setDepth(20).setAlpha(0.96);
    }

    // the station art's building is 660 x 380 at (16, 12) in its texture: land it exactly on the station's footprint
    const D = T.depot;
    this.add.image(D.x - D.w / 2, D.y - D.h / 2, A.depot(this)).setOrigin(16 / 700, 12 / 420).setScale(D.w / 660, D.h / 380).setDepth(10);
  }

  /** Distance (px) from a point to the centre line of the nearest street. */
  streetDist(x, y) {
    let best = 1e9;
    for (let i = 0; i < this.T.hy.length; i++) best = Math.min(best, Math.abs(y - this.T.hy[i]));
    for (let i = 0; i < this.T.vx.length; i++) best = Math.min(best, Math.abs(x - this.T.vx[i]));
    return best;
  }

  surfaceAt(x, y) {
    const d = this.streetDist(x, y), R = OTR.townArt.ROAD / 2;
    return d <= R ? 'road' : d <= R + OTR.townArt.WALK ? 'sidewalk' : 'grass';
  }

  /** Peak tyre grip at a point: the surface, the weather, and any hazard patch (standing water, ice). */
  muAt(x, y) {
    const D = OTR_DATA.vehicle;
    let mu = D.surfaces[this.surfaceAt(x, y)] * (D.weatherGrip[this.weather] || 1);
    for (let i = 0; i < this.gripPatches.length; i++) {
      const p = this.gripPatches[i];
      if ((x - p.x) * (x - p.x) + (y - p.y) * (y - p.y) < p.r * p.r) mu *= typeof p.mu === 'function' ? p.mu() : p.mu;
    }
    return mu * this.grip;
  }

  /* ================================================================ traffic & pedestrians */
  buildTraffic() {
    const T = this.T;
    // One seeded stream for the whole drive — where the cars start, how fast they go, which way they turn at
    // each junction, when people cross. Drawn from the day's own seed, so the same day drives the same twice.
    this.rng = OTR.scenery.rng('traffic' + T.seed + ':' + ((this.d.route && this.d.route.length) || 0));
    // the town model outlives the scene, so clear anything a previous drive left on its intersections
    T.inters.forEach(it => { it.claim = null; it.lightH = it.lightV = null; });
    this.cars = [];
    const colors = [0xC8243B, 0x3DA5FF, 0xF4F4F8, 0x2BC48A, 0x2A2A32, 0xE8A33D];
    const startX = (this.d.start && this.d.start.x) || T.depot.curb.x;
    const startY = (this.d.start && this.d.start.y) || T.laneY(0, 1);
    for (let i = 0; i < 10; i++) {
      const h = i % 2 === 0;
      // cars are drawn to the same scale as the van: about 2 m by 4.75 m
      const img = this.add.image(0, 0, OTR.art.carTop(this, colors[i % colors.length])).setDepth(28).setScale(0.7, 0.88);
      const car = { img, speed: 0, maxSpeed: 170 + this.rng() * 45, h, wait: 0, cleared: null, off: 0, turn: null, holding: null, holdT: 0, hl: 47.5, hw: 19.5 };
      // try a few lanes until one has room: two cars spawned on the same stretch start the drive overlapping
      for (let tries = 0; tries < 24; tries++) {
        car.row = Math.floor(this.rng() * T.hy.length);
        car.col = Math.floor(this.rng() * T.vx.length);
        car.dir = this.rng() < 0.5 ? 1 : -1;
        const d = car.dir;
        if (h) { car.x = T.vx[car.col] + d * (300 + this.rng() * 450); car.y = T.laneY(car.row, d); car.heading = d > 0 ? 0 : Math.PI; }
        else { car.x = T.laneX(car.col, d); car.y = T.hy[car.row] + d * (300 + this.rng() * 450); car.heading = d > 0 ? Math.PI / 2 : -Math.PI / 2; }
        if (Phaser.Math.Distance.Between(car.x, car.y, startX, startY) < 520) {
          if (h) car.x += d * 800; else car.y += d * 800;
        }
        const clash = this.cars.some(o => Math.abs(o.x - car.x) < 150 && Math.abs(o.y - car.y) < 150);
        if (!clash) break;
      }
      this.cars.push(car);
    }

    this.peds = [];
    const pedColors = [0xFF5C8A, 0x3DA5FF, 0xFFC83D, 0x2BC48A];
    const span = OTR.townArt.ROAD + OTR.townArt.WALK * 2, cross = OTR.townArt.ROAD / 2 + 24;
    T.inters.slice(0, 8).forEach((it, i) => {
      const key = OTR.townArt.pedTop(this, pedColors[i % pedColors.length]);
      // 'h' walks across the vertical street, 'v' across the horizontal one; each waits on the painted
      // crosswalk at the near end of it. dir flips as a crossing starts, so -1 here sends the first one off
      // from exactly where they are standing rather than teleporting them to the far kerb.
      const axis = i % 2 ? 'h' : 'v';
      const x = axis === 'h' ? it.x - span / 2 : it.x - cross;
      const y = axis === 'h' ? it.y + cross : it.y - span / 2;
      const img = this.add.image(x, y, key).setDepth(26);
      this.peds.push({ img, it, t: 4 + this.rng() * 8, crossing: false, dir: -1, x, y, axis, hitCool: 0 });
    });
  }

  /* ================================================================ van */
  buildVan() {
    const T = this.T, P = this.P, S = OTR_DATA.vehicle.van;
    const start = this.d.start || { x: T.depot.curb.x, y: T.laneY(0, 1), heading: 0 };
    this.van = OTR.vehicle.create(start.x, start.y, start.heading || 0);
    // the top-down van art is 62 x 126 px of body; draw it at the van's real size
    this.vanImg = this.add.image(0, 0, OTR.art.vanTop(this)).setDepth(30).setScale(S.width * P / 62, S.length * P / 126);
    this.shadow = this.add.image(0, 0, 'p_glow').setDepth(29).setScale(S.width * P / 44, S.length * P / 50).setTint(0x000000).setAlpha(0.3);
    const glow = (tint, s) => this.add.image(0, 0, 'p_glow').setDepth(31).setScale(s).setTint(tint).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
    this.tail = [glow(0xFF3040, 0.42), glow(0xFF3040, 0.42)];
    this.revLamps = [glow(0xFFF4D0, 0.38), glow(0xFFF4D0, 0.38)];

    this.skidKey = OTR.tex.make(this, 'td_skid', 12, 12, (ctx, w, h) => {
      ctx.beginPath(); ctx.arc(w / 2, h / 2, w / 2 - 1, 0, Math.PI * 2); ctx.fillStyle = '#1A1620'; ctx.fill();
    });
    this.skidPool = [];
    this.skidNext = 0;
    this.skidRun = 0;

    this.route = (this.d.route || []).map(r => Object.assign({}, r));
    if (this.lab && !this.route.length) {
      this.route = OTR.util.shuffle(T.lots).slice(0, 4).map((l, i) => ({ lotId: l.id, index: i + 1 }));
    }
    this.route.forEach(r => {
      const lot = T.lotById(r.lotId);
      r.lot = lot;
      const bay = this.parkBay(lot);
      r.zone = this.add.image((bay.x0 + bay.x1) / 2, lot.park.y, OTR.townArt.stopZone(this, bay.x1 - bay.x0)).setDepth(-86).setVisible(false);
      r.flag = this.add.image(lot.park.x, lot.park.y - 46, 'ic_pin').setDisplaySize(34, 34).setTint(0xFF6600).setDepth(45).setVisible(false);
    });
    this.activeIndex = 0;
    this.showActiveStop();
    this.drawVan(0);
  }

  showActiveStop() {
    this.route.forEach((r, i) => {
      const on = i === this.activeIndex;
      r.zone.setVisible(on && !r.done);
      r.flag.setVisible(on && !r.done);
      if (on && !r.done && !r.flagTween) {
        r.flagTween = this.tweens.add({ targets: r.flag, y: r.flag.y - 12, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      }
    });
  }

  get activeStop() { return this.route[this.activeIndex] || null; }

  /* ================================================================ HUD */
  buildHud() {
    const W = OTR.W;
    this.hudLayer = this.add.container(0, 0).setScrollFactor(0).setDepth(800);
    this.hudLayer.add(OTR.tex.shape(this, (g) => {
      g.fillStyle(0x16062B, 0.86); g.fillRect(0, 0, W, 56);
      g.fillStyle(0xFF6600, 1); g.fillRect(0, 56, W, 3);
    }));
    this.hudLayer.add(OTR.ui.iconButton(this, 32, 28, 'ic_pause', () => this.openPause(), { size: 40, skin: 'dark' }));
    this.stopLabel = OTR.txt(this, 64, 18, 'NEXT STOP', 12, '#C9B3F0', { ox: 0 });
    this.stopText = OTR.txt(this, 64, 38, '', 20, '#ffffff', { ox: 0, weight: '900' });
    this.hudLayer.add([this.stopLabel, this.stopText]);
    this.clockText = OTR.txt(this, W / 2, 28, '', 22, '#ffffff', { weight: '900' });
    this.hudLayer.add(this.clockText);

    const sx = 108, sy = OTR.H - 92;
    const sp = this.add.container(sx, sy).setScrollFactor(0).setDepth(800);
    sp.add(OTR.tex.shape(this, (sg) => {
      sg.fillStyle(0x16062B, 0.86); sg.fillCircle(0, 0, 66);
      sg.lineStyle(3, 0x6A45A0, 1); sg.strokeCircle(0, 0, 66);
    }));
    this.speedArc = OTR.tex.liveShape(this);
    sp.add(this.speedArc);
    this.speedText = OTR.txt(this, 0, -2, '0', 40, '#ffffff', { weight: '900' });
    sp.add([this.speedText, OTR.txt(this, 0, 30, 'MPH', 13, '#C9B3F0', {})]);

    // the gear, big enough to read at a glance: D in green, R in amber
    this.gearBadge = this.add.container(sx + 96, sy + 44).setScrollFactor(0).setDepth(801);
    this.gearBg = OTR.tex.liveShape(this);
    this.gearText = OTR.txt(this, 0, 0, 'D', 26, '#10301F', { weight: '900' });
    this.gearBadge.add([this.gearBg, this.gearText]);
    this._gearShown = null;

    this.limitSign = this.add.container(sx + 96, sy - 22).setScrollFactor(0).setDepth(800);
    const lg = OTR.tex.shape(this, (lg) => {
      lg.fillStyle(0xFFFFFF, 1); lg.fillRoundedRect(-28, -36, 56, 72, 6);
      lg.lineStyle(3, 0x1D1030, 1); lg.strokeRoundedRect(-24, -32, 48, 64, 4);
    });
    this.limitText = OTR.txt(this, 0, 8, '25', 30, '#1D1030', { weight: '900' });
    this.limitSign.add([lg, OTR.txt(this, 0, -18, 'SPEED', 11, '#1D1030', { weight: '900' }), this.limitText]);

    // one line above the speedometer for the gearbox and the backing check
    this.gearHint = this.add.container(40, OTR.H - 196).setScrollFactor(0).setDepth(802).setVisible(false);
    this.gearHintBg = OTR.tex.liveShape(this);
    this.gearHintText = OTR.txt(this, 16, 0, '', 15, '#FFC83D', { ox: 0, weight: '900' });
    this.gearHint.add([this.gearHintBg, this.gearHintText]);
    this._gearHint = null;

    this.signHint = this.add.container(OTR.W / 2, 98).setScrollFactor(0).setDepth(805).setVisible(false);
    this.signHintBg = OTR.tex.liveShape(this);
    this.signHintText = OTR.txt(this, 0, 0, '', 20, '#ffffff', { weight: '900' });
    this.signHint.add([this.signHintBg, this.signHintText]);

    this.mapW = 240; this.mapH = 190;
    this.mapX = OTR.W - this.mapW - 16; this.mapY = 72;
    // the map's frame, streets and depot never change: one texture. The stop dots redraw when a stop is done or
    // the next one becomes active, and the van arrow is an image turned to the van's heading.
    const T = this.T, msx = this.mapW / T.W, msy = this.mapH / T.H;
    OTR.tex.shape(this, (g) => {
      g.fillStyle(0x0E0620, 1); g.fillRoundedRect(this.mapX - 6, this.mapY - 6, this.mapW + 12, this.mapH + 12, 10);
      g.lineStyle(2, 0x6A45A0, 0.8); g.strokeRoundedRect(this.mapX - 6, this.mapY - 6, this.mapW + 12, this.mapH + 12, 10);
      g.lineStyle(3, 0x5A5668, 1);
      T.hy.forEach(y => g.lineBetween(this.mapX, this.mapY + y * msy, this.mapX + this.mapW, this.mapY + y * msy));
      T.vx.forEach(x => g.lineBetween(this.mapX + x * msx, this.mapY, this.mapX + x * msx, this.mapY + this.mapH));
      g.fillStyle(0x4D148C, 1); g.fillRect(this.mapX + T.depot.x * msx - 5, this.mapY + T.depot.y * msy - 4, 10, 8);
    }).setScrollFactor(0).setDepth(801);
    this.mapDots = OTR.tex.liveShape(this).setScrollFactor(0).setDepth(801);
    this.mapVan = OTR.tex.shape(this, (g) => { g.fillStyle(0xFFFFFF, 1); g.fillTriangle(7, 0, -4, 5, -4, -5); }).setScrollFactor(0).setDepth(801);

    this.beltPill = OTR.txt(this, OTR.W - 20, OTR.H - 24, '', 15, '#FF8A9A', { ox: 1, weight: '900' }).setScrollFactor(0).setDepth(800);
    // on a dark strip, so it reads over sidewalks, crosswalks and the white van (it used to sit straight on the map)
    const ctl = OTR.txt(this, OTR.W / 2 + 60, OTR.H - 22, 'W go · S brake · A/D steer · SPACE hold still · R reverse (stopped) · B belt · L lights · G look · P park · TAB handheld', 13, '#ffffff', { bold: false }).setScrollFactor(0).setDepth(800);
    OTR.tex.shape(this, (g) => { g.fillStyle(0x16062B, 0.72); g.fillRoundedRect(-ctl.width / 2 - 14, -13, ctl.width + 28, 26, 13); }, ctl.x, ctl.y).setScrollFactor(0).setDepth(799);
  }

  /**
   * The world camera zooms, and a zoomed camera scales fixed UI too. A second camera at zoom 1 draws
   * everything that sits still (scroll factor 0), so the HUD keeps its own size and place.
   */
  setupUiCamera() {
    this.uiCam = this.cameras.add(0, 0, OTR.W, OTR.H).setName('ui');
    this._camSeen = new Set();
    this.syncCameras();
  }

  /** Hand every new display object to whichever camera should draw it. */
  syncCameras() {
    if (!this.uiCam) return;
    const main = this.cameras.main, ui = this.uiCam;
    const list = this.children.list;
    for (let i = 0; i < list.length; i++) {
      const o = list[i];
      if (this._camSeen.has(o)) continue;
      this._camSeen.add(o);
      if (o.scrollFactorX === 0 && o.scrollFactorY === 0) main.ignore(o);
      else ui.ignore(o);
    }
    if (this._camSeen.size > 800) {
      const alive = new Set(list);
      this._camSeen.forEach(o => { if (!alive.has(o)) this._camSeen.delete(o); });
    }
  }

  /**
   * Follow the van with a look-ahead along its actual direction of travel (so a slide shows you where you are
   * going, not where the bonnet points). Rates are per second, so it frames the same at any refresh rate.
   */
  updateCamera(dt, snap) {
    const V = OTR.vehicle, v = this.van, cam = this.cameras.main, P = this.P, U = OTR.util;
    const vel = V.velocity(v);
    const lx = U.clamp(vel.x * 0.85, -10, 10) * P, ly = U.clamp(vel.y * 0.85, -10, 10) * P;
    const kl = snap ? 1 : 1 - Math.exp(-dt * 2.4);
    this.camLead.x += (lx - this.camLead.x) * kl;
    this.camLead.y += (ly - this.camLead.y) * kl;
    const bc = V.bodyCentre(v);
    const kf = snap ? 1 : 1 - Math.exp(-dt * 9);
    this.camPos.x += (bc.x + this.camLead.x - this.camPos.x) * kf;
    this.camPos.y += (bc.y + this.camLead.y - this.camPos.y) * kf;
    const want = 0.9 - 0.07 * U.clamp01(V.mph(v) / 30);
    this.camZoom += (want - this.camZoom) * (snap ? 1 : 1 - Math.exp(-dt * 1.2));
    cam.setZoom(this.camZoom);
    cam.centerOn(this.camPos.x, this.camPos.y);
  }

  setHint(text, color) {
    if (!text) { if (this._hint !== null) { this.signHint.setVisible(false); this._hint = null; } return; }
    if (this._hint === text) return;
    this._hint = text;
    this.signHintText.setText(text);
    const w = this.signHintText.width + 44, h = 40;
    this.signHintBg.redraw((g) => {
      g.fillStyle(0x16062B, 0.9); g.fillRoundedRect(-w / 2, -h / 2, w, h, 20);
      g.lineStyle(3, color || 0xFFC83D, 1); g.strokeRoundedRect(-w / 2, -h / 2, w, h, 20);
    });
    this.signHintText.setColor(color === 0x2BC48A ? '#8BF0C6' : '#ffffff');
    this.signHint.setVisible(true);
  }

  setGearHint(text) {
    if (text === this._gearHint) return;
    this._gearHint = text;
    if (!text) { this.gearHint.setVisible(false); return; }
    this.gearHintText.setText(text);
    const w = this.gearHintText.width + 32, h = 32;
    this.gearHintBg.redraw((g) => {
      g.fillStyle(0x16062B, 0.92); g.fillRoundedRect(0, -h / 2, w, h, 16);
      g.lineStyle(2, 0xFFC83D, 1); g.strokeRoundedRect(0, -h / 2, w, h, 16);
    });
    this.gearHint.setVisible(true);
  }

  drawMinimap() {
    const T = this.T;
    const sx = this.mapW / T.W, sy = this.mapH / T.H;
    const dotsKey = this.activeIndex + '|' + this.route.map(r => (r.done ? 1 : 0)).join('');
    if (this._mapDotsKey !== dotsKey) {
      this._mapDotsKey = dotsKey;
      this.mapDots.redraw((g) => {
        this.route.forEach((r, i) => {
          const c = r.done ? 0x2BC48A : i === this.activeIndex ? 0xFF6600 : 0xFFC83D;
          g.fillStyle(c, 1);
          g.fillCircle(this.mapX + r.lot.park.x * sx, this.mapY + r.lot.park.y * sy, i === this.activeIndex ? 5 : 3.5);
          // the active stop shows which way to face: with the traffic on that kerb (east on the south side)
          if (i === this.activeIndex && !r.done) {
            const x = this.mapX + r.lot.park.x * sx, y = this.mapY + r.lot.park.y * sy, d = r.lot.side > 0 ? 1 : -1;
            g.fillTriangle(x + d * 15, y, x + d * 8, y - 4, x + d * 8, y + 4);
          }
        });
      });
    }
    this.mapVan.setPosition(this.mapX + this.van.x * sx, this.mapY + this.van.y * sy).setRotation(this.van.heading);
  }

  /* ================================================================ input */
  setupInput() {
    // Key objects capture these keys (no page scrolling, no focus jumping on TAB) and stop auto-repeat
    // re-firing their events, so holding L no longer strobes the headlights.
    this.keys = this.input.keyboard.addKeys({
      up: 'UP', down: 'DOWN', left: 'LEFT', right: 'RIGHT', w: 'W', a: 'A', s: 'S', d: 'D',
      space: 'SPACE', b: 'B', g: 'G', p: 'P', l: 'L', r: 'R', tab: 'TAB', esc: 'ESC'
    });
    // What is physically held comes from the page itself: Phaser resets its keys when the scene pauses, which
    // left the van coasting after the pause menu even though the driver never lifted off.
    this.held = {};
    const kd = (e) => { this.held[e.code] = true; };
    const ku = (e) => { this.held[e.code] = false; };
    const bl = () => { this.held = {}; };
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    window.addEventListener('blur', bl);
    this.events.once('shutdown', () => {
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
      window.removeEventListener('blur', bl);
    });

    OTR.onKey(this, 'keydown-B', () => {
      this.buckled = !this.buckled;
      OTR.audio.play(this.buckled ? 'beep' : 'click');
      this.toast(this.buckled ? 'Belt on' : 'Belt off', this.buckled ? 0x2BC48A : 0xF0435A);
    });
    OTR.onKey(this, 'keydown-L', () => {
      this.lights = !this.lights;
      OTR.audio.play('click');
      this.toast(this.lights ? 'Headlights on' : 'Headlights off', this.lights ? 0xFFC83D : 0xC9B3F0);
    });
    OTR.onKey(this, 'keydown-G', () => this.getOutAndLook());
    OTR.onKey(this, 'keydown-R', () => { this.shiftAsked = true; });    // the gear selector: taken on the next frame
    OTR.onKey(this, 'keydown-P', () => this.tryPark());
    OTR.onKey(this, 'keydown-ESC', () => this.openPause());
    OTR.onKey(this, 'keydown-TAB', (e) => {
      if (e && e.preventDefault) e.preventDefault();
      if (this.parked) return;
      if (OTR.vehicle.mph(this.van) > 2) this.violation('handheld', 'Using the handheld while moving', 'safety', 2, 'The handheld waits until you are parked. Screen time at the wheel is how couriers hit things.');
      else this.toast('Park at the stop (P) to work the handheld.', 0xC9B3F0);
    });
  }

  heldAny(...codes) { for (let i = 0; i < codes.length; i++) if (this.held[codes[i]]) return true; return false; }

  /** G.O.A.L.: only from a standstill, and it takes the time it takes to walk round the van. */
  getOutAndLook() {
    if (this.goalBusy || this.parked || this.leaving) return;
    if (!OTR.vehicle.stopped(this.van)) { this.toast('Stop first, then get out and look', 0xC9B3F0); return; }
    this.goalBusy = true;
    OTR.audio.play('door_open');
    // (the HUD hint says what is happening: a toast saying the same thing at the same time was noise)
    this.time.delayedCall(2600, () => {
      if (!this.scene.isActive()) return;
      this.goalBusy = false;
      this.goalAt = this.elapsed;
      OTR.audio.play('door_close');
      this.toast('All clear behind. Back slowly — you have 25 s.', 0x2BC48A);
    });
  }

  openPause() {
    if (this.scene.isPaused()) return;
    this.scene.launch('PauseScene', { parent: this.sys.settings.key, title: this.scenario ? this.scenario.title : 'On the road' });
    this.scene.bringToTop('PauseScene');
    this.scene.pause();
  }

  /** One toast at a time: a newer message replaces the one on screen instead of stacking over it. */
  toast(text, color) {
    if (this._toast && this._toast.active) this._toast.destroy();
    this._toast = OTR.ui.toast(this, text, { color: 0x16062B, border: color || 0xFF6600, hold: 1800, y: 150 });
  }

  violation(key, label, cat, pts, lesson) {
    const now = this.elapsed;
    if (key === 'belt') this.beltBroken = true;
    if (this.lastViolationAt[key] !== undefined && now - this.lastViolationAt[key] < 5) return;
    this.lastViolationAt[key] = now;
    this.violations[key] = (this.violations[key] || 0) + 1;
    // hitting someone is never averaged away: it caps the day's safety
    this.log.penalty(cat || 'safety', pts || 2, label, { lesson, severity: pts >= 3 ? 'major' : 'minor', critical: key === 'hitped' });
    OTR.audio.play('alarm');
    OTR.fx.flash(this, 0xF0435A, 0.22, 260);
    this.toast('⚠ ' + label, 0xF0435A);
  }

  /* ================================================================ frame */
  update(time, delta) {
    const dt = Math.min(delta, 50) / 1000;
    this.syncCameras();
    if (this.leaving) return;
    this.elapsed += dt;
    this.stepVan(dt);
    if (this.onUpdate) this.onUpdate(dt);
    this.stepCars(dt);
    this.stepPeds(dt);
    this.stepLights(dt);
    this.checkRules(dt);
    this.updateCamera(dt);
    this.updateHud();
  }

  /* ---------------------------------------------------------------- vehicle */
  stepVan(dt) {
    const V = OTR.vehicle, v = this.van;
    const busy = this.goalBusy || this.parked || this.incidentOpen;
    const L = this.heldAny('KeyA', 'ArrowLeft'), Rt = this.heldAny('KeyD', 'ArrowRight');
    const inp = busy ? { throttle: false, brake: false, steer: 0, hand: true } : {
      throttle: this.heldAny('KeyW', 'ArrowUp'),
      brake: this.heldAny('KeyS', 'ArrowDown'),
      steer: L && !Rt ? -1 : Rt && !L ? 1 : 0,
      hand: this.heldAny('Space'),
      shift: !!this.shiftAsked
    };
    this.shiftAsked = false;
    this.input3 = inp;

    const ev = V.step(v, inp, dt, this.world);
    if (V.stopped(v)) this.stoppedAt = this.elapsed;
    if (ev.shifted) {
      OTR.audio.play('click');
      this.toast(v.gear < 0 ? 'R — reverse: W backs up, S brakes. R again for drive.' : 'D — drive', v.gear < 0 ? 0xFFC83D : 0x2BC48A);
    } else if (ev.shiftRefused) this.toast('Stop first, then R to change gear', 0xC9B3F0);

    const bodies = this.cars.map(c => ({
      x: c.x, y: c.y, heading: c.heading, hl: c.hl, hw: c.hw, mass: 1500, ref: c,
      vel: { x: Math.cos(c.heading) * c.speed / this.P, y: Math.sin(c.heading) * c.speed / this.P }
    }));
    const hits = V.collide(v, this.blockers.concat(this.edges), bodies);
    bodies.forEach(b => {
      const c = b.ref;
      if (b.x === c.x && b.y === c.y) return;
      c.x = b.x; c.y = b.y;
      c.speed = Math.max(0, (b.vel.x * Math.cos(c.heading) + b.vel.y * Math.sin(c.heading)) * this.P);
      c.wait = Math.max(c.wait, 1.2);
    });
    this.afterCollisions(hits);

    if (v.u < -0.1) this.reverseDist += -v.u * dt;
    else if (v.u > 1.5) this.reverseDist = 0;

    this.drawVan(dt);
  }

  afterCollisions(hits) {
    if (!hits.length) return;
    const I = OTR_DATA.vehicle.impact;
    let worst = hits[0];
    hits.forEach(h => { if (h.speed > worst.speed) worst = h; });
    if (worst.speed < I.scuff || (worst.ref && worst.ref.edge)) return;
    const what = worst.kind === 'body' ? 'another vehicle' : (worst.ref && worst.ref.what) || 'a building';
    const mph = Math.max(1, Math.round(worst.speed * OTR.vehicle.MPH));
    if (worst.speed < I.incident) {
      if (this.elapsed - (this._scuffAt === undefined ? -9 : this._scuffAt) > 2.5) {
        this._scuffAt = this.elapsed;
        OTR.audio.play('thud');
        OTR.fx.shake(this, 120, 0.003);
        this.toast(`Scuffed ${what} at ${mph} mph — slow right down near obstacles`, 0xFFB020);
      }
      return;
    }
    // a vehicle driving into a van that was standing still is not the van driver's collision
    if (worst.kind === 'body' && OTR.vehicle.mph(this.van) < 1) {
      OTR.audio.play('thud');
      this.toast('A car ran into you while you were stopped. Never stop across a lane.', 0xFFB020);
      return;
    }
    this.damage += worst.speed;
    this.crash(what, worst.speed);
  }

  crash(what, speed) {
    const serious = speed >= OTR_DATA.vehicle.impact.serious;
    const mph = Math.max(1, Math.round(speed * OTR.vehicle.MPH));
    OTR.fx.shake(this, 260, serious ? 0.016 : 0.008);
    OTR.audio.play('thud');
    this.violation('crash', `Collision with ${what} at ${mph} mph`, 'safety', serious ? 4 : 2, 'Most delivery collisions happen under 15 mph, backing or squeezing through gaps. Slow down and take the wider line.');
  }

  drawVan(dt) {
    const V = OTR.vehicle, v = this.van, g = v.g, P = this.P;
    const bc = V.bodyCentre(v);
    const rot = v.heading + Math.PI / 2;
    this.vanImg.setPosition(bc.x, bc.y).setRotation(rot);
    this.shadow.setPosition(bc.x + 5, bc.y + 7).setRotation(rot);
    const back = -g.tail + 0.15, side = g.hw - 0.35;
    const lampL = V.point(v, back, -side), lampR = V.point(v, back, side);
    const tail = v.brake > 0.1 ? 0.85 : this.lights ? 0.22 : 0;
    this.tail[0].setPosition(lampL.x, lampL.y).setAlpha(tail);
    this.tail[1].setPosition(lampR.x, lampR.y).setAlpha(tail);
    const rev = v.gear < 0 ? 0.6 : 0;
    this.revLamps[0].setPosition(lampL.x, lampL.y).setAlpha(rev);
    this.revLamps[1].setPosition(lampR.x, lampR.y).setAlpha(rev);

    this.beams && this.beams.clear();
    if (this.lights && this.beams) {
      const nose = V.point(v, g.nose, 0), f = V.fwd(v), r = V.right(v);
      this.beams.fillStyle(0xFFF0C0, 0.13);
      this.beams.fillTriangle(
        nose.x + r.x * 22, nose.y + r.y * 22,
        nose.x - r.x * 22, nose.y - r.y * 22,
        nose.x + f.x * 300, nose.y + f.y * 300
      );
    }
    if (!dt) return;

    // tyre marks, laid by distance travelled so they look the same at any frame rate
    const ground = V.groundSpeed(v);
    const marking = ground > 2 && (v.slideR > 1.05 || v.locked || v.spin || v.slideF > 1.25);
    if (marking) {
      this.skidRun += ground * dt * P;
      while (this.skidRun > 5) {
        this.skidRun -= 5;
        const pts = [V.point(v, -g.b, -(g.hw - 0.3)), V.point(v, -g.b, g.hw - 0.3)];
        if (v.slideF > 1.25) pts.push(V.point(v, g.a, -(g.hw - 0.3)), V.point(v, g.a, g.hw - 0.3));
        pts.forEach(p => this.skidMark(p.x, p.y));
      }
      if (this.elapsed - (this._squealAt || -9) > 0.7) { this._squealAt = this.elapsed; OTR.audio.play('brake'); }
    } else this.skidRun = 0;

    const mph = V.mph(v);
    OTR.audio.loop('engine', { vol: 0.04 + v.throttle * 0.05 + Math.min(mph, 35) / 35 * 0.06, freq: 70 + mph * 2.2 + v.throttle * 25 });
    if (v.gear < 0 && Math.abs(v.u) > 0.05 && this.elapsed - (this._beepAt || -9) > 0.5) { this._beepAt = this.elapsed; OTR.audio.play('beep'); }
  }

  skidMark(x, y) {
    let img = this.skidPool[this.skidNext];
    if (!img) { img = this.add.image(x, y, this.skidKey).setDepth(-85).setAlpha(0.3); this.skidPool[this.skidNext] = img; }
    else img.setPosition(x, y);
    this.skidNext = (this.skidNext + 1) % 360;
  }

  /* ---------------------------------------------------------------- AI traffic */
  /**
   * Cars keep to their lane, stop at signs and lights, follow at a safe gap, wait for people crossing, ease out
   * round a van parked at the kerb when there is room, and take their turns along an arc.
   */
  stepCars(dt) {
    const T = this.T, R = OTR.townArt.ROAD / 2, V = OTR.vehicle, P = this.P;
    const vbc = V.bodyCentre(this.van);
    const vanStill = V.stopped(this.van);
    // the van's body: its corners, mid-sides and centre (a car watches all of them, not just the centre)
    const vg = this.van.g;
    const vanPts = [[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]].map(([f, r]) => V.point(this.van, vg.centre + f * vg.hl, r * vg.hw));
    const crossing = this.peds.filter(p => p.crossing);
    this.cars.forEach(c => {
      const hx = Math.cos(c.heading), hy = Math.sin(c.heading);
      let stopDist = 1e9, wantOff = 0, cap = c.maxSpeed;
      // let go of the junction once the whole car is out of its box. The timeout is a backstop: a car shoved by
      // the van could otherwise sit in the box and hold up the whole town.
      if (c.holding) {
        const box = R + c.hl + 30;
        const clear = Math.abs(c.x - c.holding.x) > box || Math.abs(c.y - c.holding.y) > box;
        c.holdT += dt;
        if ((clear && !(c.turn && c.turn.it === c.holding)) || c.holdT > 8) {
          if (c.holding.claim === c) c.holding.claim = null;
          c.holding = null;
        }
      }
      if (!c.turn) {
        const coords = c.h ? T.vx : T.hy;
        const pos = c.h ? c.x : c.y;
        let best = null, idx = -1;
        coords.forEach((p, i) => {
          const ahead = c.dir > 0 ? p - pos : pos - p;
          if (ahead > 0 && (best === null || ahead < best)) { best = ahead; idx = i; }
        });
        const it = best === null ? null : c.h ? T.interAt(idx, c.row) : T.interAt(c.col, idx);
        if (it) {
          if (c.planFor !== it) {
            c.planFor = it;
            const r = this.rng();
            c.plan = r < 0.2 ? 'left' : r < 0.4 ? 'right' : 'straight';
          }
          const line = R + OTR.townArt.STOP_LINE + c.hl + 4;   // car centre when its nose is at the stop line
          const committed = best < R + 40;
          const sig = it.light ? this.lightFor(it, c.h) : null;
          let mustStop = !committed && (it.light
            ? sig === 'red' || (sig === 'amber' && best > line + 60)
            : c.cleared !== it);
          // give way: a stop sign is one car at a time. At a light, a queue rolls through together, but cross
          // traffic still clearing the box holds you, and so does an opposing car when either of you is
          // turning left across the other. A left turn also waits for a gap in the oncoming traffic.
          const held = it.claim;
          if (!committed && held && held !== c && (it.stop || held.h !== c.h
            || (held.dir !== c.dir && (held.plan === 'left' || c.plan === 'left')))) mustStop = true;
          if (!committed && c.plan === 'left' && this.oncoming(c, it)) mustStop = true;
          if (mustStop && best < 380) stopDist = Math.min(stopDist, best - line);
          if (it.stop && best < line + 24 && c.speed < 10 && c.cleared !== it) { c.cleared = it; c.wait = 1.1; }
          // claim the box on the way in, so the cars behind and across know it is taken
          if (!mustStop && !c.holding && best <= line + 6) { it.claim = c; c.holding = it; c.holdT = 0; }
          if (c.plan !== 'straight') {
            const startAt = c.plan === 'right' ? 52.5 + 80 : 105;
            cap = Math.min(cap, (c.plan === 'right' ? 70 : 95) + Math.max(0, best - startAt) * 0.9);
            if (!mustStop && best <= startAt && Math.abs(c.off) < 4) this.beginTurn(c, it);
          }
        }
      }
      // the van, other cars and people crossing, anywhere ahead in the lane
      const ahead = (ox, oy) => {
        const dx = ox - c.x, dy = oy - c.y;
        return { fwd: dx * hx + dy * hy, lat: -dx * hy + dy * hx };
      };
      this.cars.forEach(o => {
        if (o === c) return;
        const a = ahead(o.x, o.y);
        // a car mid-turn lies across the road rather than along it, so it has to be watched for from much
        // further to the side than one following its own lane
        const side = o.turn ? 100 : 44;
        if (a.fwd > 0 && a.fwd < 260 && Math.abs(a.lat) < side) stopDist = Math.min(stopDist, a.fwd - (c.hl + o.hl + 16));
      });
      const av = ahead(vbc.x, vbc.y);
      let easing = false;
      if (av.fwd > 0 && av.fwd < 320 && Math.abs(av.lat) < 52) {
        const vanLat = av.lat + c.off;                       // the van's offset from the lane centre, kerbward positive
        const room = vanLat - (this.van.g.hw * P + c.hw + 8);
        // easing out round it is only for a van stopped alongside the kerb, parallel to the lane
        const parallel = Math.abs(Math.cos(this.van.heading - c.heading)) > 0.95;
        if (vanStill && parallel && !c.turn && vanLat > 8 && room > -42) {
          easing = true;
          wantOff = Math.min(wantOff, room);
          if (Math.abs(av.lat) < this.van.g.hw * P + c.hw + 4) cap = Math.min(cap, 60);
        } else {
          stopDist = Math.min(stopDist, av.fwd - (c.hl + this.van.g.hl * P + 18));
        }
      }
      // any part of the van in the lane ahead stops the car short of it (a van stopped across or at an angle to a
      // lane used to be judged by its centre alone, and cars drove into its side)
      if (!easing) {
        vanPts.forEach(pt => {
          const a = ahead(pt.x, pt.y);
          if (a.fwd > 0 && a.fwd < 320 && Math.abs(a.lat) < c.hw + 10) stopDist = Math.min(stopDist, a.fwd - c.hl - 14);
        });
      }
      crossing.forEach(p => {
        const a = ahead(p.x, p.y);
        if (a.fwd > 0 && a.fwd < 240 && Math.abs(a.lat) < 60) stopDist = Math.min(stopDist, a.fwd - c.hl - 30);
      });

      if (c.wait > 0) { c.wait -= dt; c.speed = Math.max(0, c.speed - 160 * dt); }
      else {
        const want = Math.min(cap, Math.sqrt(2 * 120 * Math.max(0, stopDist - 4)));
        c.speed = want > c.speed ? Math.min(want, c.speed + 70 * dt) : Math.max(want, c.speed - 240 * dt);
        if (c.speed < 1.5 && want < 1.5) c.speed = 0;
      }

      if (c.turn) this.advanceTurn(c, c.speed * dt);
      else {
        // lane offset: absorbs a shove from a collision, or eases out round a parked van, then drifts back
        const laneY = c.h ? T.laneY(c.row, c.dir) : 0, laneX = c.h ? 0 : T.laneX(c.col, c.dir);
        c.off = c.h ? (c.y - laneY) * (c.dir > 0 ? 1 : -1) : (c.x - laneX) * (c.dir > 0 ? -1 : 1);
        c.off += (wantOff - c.off) * (1 - Math.exp(-dt * 1.8));
        if (c.h) { c.x += c.dir * c.speed * dt; c.y = laneY + c.off * (c.dir > 0 ? 1 : -1); }
        else { c.y += c.dir * c.speed * dt; c.x = laneX + c.off * (c.dir > 0 ? -1 : 1); }
      }
      if (c.x < -260) c.x = T.W + 200; if (c.x > T.W + 260) c.x = -200;
      if (c.y < -260) c.y = T.H + 200; if (c.y > T.H + 260) c.y = -200;
      c.img.setPosition(c.x, c.y).setRotation(c.heading + Math.PI / 2);
    });
  }

  /**
   * A left turn crosses the oncoming lane, so it gives way: is anything coming the other way on this street,
   * close enough to the junction to matter? A car that has already stopped is not coming.
   */
  oncoming(c, it) {
    return this.cars.some(o => {
      if (o === c || o.turn || o.h !== c.h || o.dir === c.dir || o.speed < 4) return false;
      if (c.h ? o.row !== c.row : o.col !== c.col) return false;
      const d = (c.h ? it.x - o.x : it.y - o.y) * o.dir;      // + while the junction is still ahead of them
      // a gap is time, not distance: the turn takes about three seconds to clear the box, and a car at the
      // limit covers 600 px in that time. A car already stopped is not coming, which is what breaks the tie
      // when two drivers face each other both waiting to turn left.
      return d > -40 && d < 120 + o.speed * 3;
    });
  }

  /** Start a quarter-circle turn from the car's lane into the crossing street's lane. */
  beginTurn(c, it) {
    const T = this.T;
    const h0 = { x: c.h ? c.dir : 0, y: c.h ? 0 : c.dir };
    const right = c.plan === 'right';
    const h1 = right ? { x: -h0.y, y: h0.x } : { x: h0.y, y: -h0.x };
    const r = right ? 80 : 157.5;
    const Q = c.h
      ? { x: T.laneX(it.col, h1.y > 0 ? 1 : -1), y: T.laneY(it.row, c.dir) }
      : { x: T.laneX(it.col, c.dir), y: T.laneY(it.row, h1.x > 0 ? 1 : -1) };
    const E = { x: Q.x - h0.x * r, y: Q.y - h0.y * r };
    c.x = E.x; c.y = E.y; c.off = 0;
    c.turn = { C: { x: E.x + h1.x * r, y: E.y + h1.y * r }, r, h0, h1, th: 0, it };
  }

  advanceTurn(c, ds) {
    const t = c.turn;
    t.th += ds / t.r;
    if (t.th >= Math.PI / 2) {
      const over = (t.th - Math.PI / 2) * t.r;
      c.x = t.C.x + t.h0.x * t.r + t.h1.x * over;
      c.y = t.C.y + t.h0.y * t.r + t.h1.y * over;
      c.h = t.h1.x !== 0;
      c.dir = c.h ? Math.sign(t.h1.x) : Math.sign(t.h1.y);
      if (c.h) c.row = t.it.row; else c.col = t.it.col;
      c.heading = Math.atan2(t.h1.y, t.h1.x);
      c.planFor = t.it; c.plan = 'straight'; c.off = 0;
      c.turn = null;
      return;
    }
    const s = Math.sin(t.th), co = Math.cos(t.th);
    c.x = t.C.x + t.r * (s * t.h0.x - co * t.h1.x);
    c.y = t.C.y + t.r * (s * t.h0.y - co * t.h1.y);
    c.heading = Math.atan2(co * t.h0.y + s * t.h1.y, co * t.h0.x + s * t.h1.x);
  }

  /** Where a point sits relative to the van's body: metres-free, in px along and across it. */
  relToVan(x, y) {
    const V = OTR.vehicle, v = this.van, bc = V.bodyCentre(v), f = V.fwd(v), r = V.right(v);
    const dx = x - bc.x, dy = y - bc.y;
    return { fd: dx * f.x + dy * f.y, lat: dx * r.x + dy * r.y, hl: v.g.hl * this.P, hw: v.g.hw * this.P };
  }

  stepPeds(dt) {
    const A = OTR.townArt;
    const mph = OTR.vehicle.mph(this.van);
    const span = A.ROAD + A.WALK * 2;
    this.peds.forEach(p => {
      if (p.hitCool > 0) p.hitCool -= dt;
      p.t -= dt;
      // step off only when it is safe to: at lights while the street being crossed has a red, and never in front of
      // a van too close to stop for them (they used to set off on a timer whatever was coming)
      if (!p.crossing && p.t <= 0) {
        if (this.pedMayCross(p)) { p.crossing = true; p.progress = 0; p.dir *= -1; } else p.t = 0.4;
      }
      if (p.crossing) {
        p.progress = Math.min(1, p.progress + dt * 0.13);   // a walking pace, about 1.6 m/s
        const along = (p.dir > 0 ? p.progress : 1 - p.progress) * span - span / 2;
        if (p.axis === 'h') p.x = p.it.x + along; else p.y = p.it.y + along;
        if (p.progress >= 1) { p.crossing = false; p.t = 8 + this.rng() * 10; }
      }
      p.img.setPosition(p.x, p.y);
      if (!p.crossing) return;
      // failing to yield is driving on at someone in the van's own path, just ahead of it (it used to be a wide box
      // round the van that caught people beside it and on the cross street)
      const r = this.relToVan(p.x, p.y);
      const inPath = r.fd > r.hl * 0.4 && r.fd < r.hl + 130 && Math.abs(r.lat) < r.hw + 24;
      if (inPath && mph > 3 && this.van.gear > 0) {
        this.violation('yield', 'Failed to yield to a pedestrian', 'safety', 3, 'Pedestrians in a crosswalk always have right of way. Cover the brake near crossings and school zones.');
      }
      if (Math.abs(r.fd) < r.hl + 8 && Math.abs(r.lat) < r.hw + 8 && mph > 0.5 && p.hitCool <= 0) {
        this.violation('hitped', 'You hit a pedestrian', 'safety', 5, 'Slow to a crawl near crosswalks. A person on the road is the one thing you can never undo.');
        // they carry on to the kerb rather than standing in the lane; the cooldown stops one pass scoring twice
        p.hitCool = 6;
        this.pedIncident();
      }
    });
  }

  /** Whether a pedestrian waiting at a crosswalk may step off now. */
  pedMayCross(p) {
    const it = p.it, A = OTR.townArt, R = A.ROAD / 2, v = this.van, V = OTR.vehicle;
    // 'v' walks across the horizontal street, 'h' across the vertical one
    const acrossH = p.axis === 'v';
    if (it.light && this.lightFor(it, acrossH) !== 'red') return false;
    // the van on the street being crossed, heading for this crosswalk: could it stop before it?
    const onStreet = acrossH ? Math.abs(v.y - it.y) < R : Math.abs(v.x - it.x) < R;
    if (!onStreet || V.mph(v) < 2) return true;
    const f = V.fwd(v);
    const to = acrossH ? (p.x - v.x) * Math.sign(f.x || 1) : (p.y - v.y) * Math.sign(f.y || 1);
    if (acrossH ? Math.abs(f.x) < 0.7 : Math.abs(f.y) < 0.7) return true;
    const u = Math.abs(v.u);
    const stopPx = (u * 1.2 + u * u / (2 * 5)) * this.P + v.g.nose * this.P + 60;   // a second to react, 5 m/s² brakes
    return to < 0 || to > stopPx;
  }

  /** Hitting someone stops the drive: the trainee has to deal with it before driving on. */
  pedIncident() {
    if (this.incidentOpen) return;
    this.incidentOpen = true;
    const v = this.van; v.u = 0; v.lat = 0; v.r = 0;
    OTR.ui.modal(this, {
      title: 'You hit a pedestrian', w: 680, h: 360, depth: 5000,
      body: 'Stop and put the hazards on. Check on them without moving them, call 911, and call dispatch. Stay at the scene until the police say you can leave. This is recorded as a critical safety failure.',
      buttons: [{ label: 'I understand', skin: 'orange', key: ['ENTER', 'SPACE'], onClick: () => { this.incidentOpen = false; } }]
    });
    this.syncCameras();
  }

  /**
   * The light a driver sees on their own approach. The two streets take the junction in turn, so this is the
   * only way to ask: there is no single state for a whole intersection.
   */
  lightFor(it, horizontal) { return (horizontal ? it.lightH : it.lightV) || 'red'; }

  stepLights(dt) {
    this.lightT = (this.lightT || 0) + dt;
    // one street at a time: green, amber, then a moment of all-red before the cross street is let through
    const cycle = 18, half = cycle / 2, amber = 2.6, allRed = 1.4;
    const phaseState = (u) => u < half - amber - allRed ? 'green' : u < half - allRed ? 'amber' : 'red';
    this.T.inters.forEach(it => {
      if (!it.light) return;
      const t = (this.lightT + it.phase * half) % cycle;
      const h = t < half ? phaseState(t) : 'red';
      const v = t < half ? 'red' : phaseState(t - half);
      if (h === it.lightH && v === it.lightV) return;
      it.lightH = h; it.lightV = v;
      const kh = OTR.townArt.trafficLight(this, h), kv = OTR.townArt.trafficLight(this, v);
      // W and E are the approaches of drivers on the horizontal street, N and S of those on the vertical one
      Object.keys(it.signs || {}).forEach(dir => it.signs[dir].setTexture(dir === 'W' || dir === 'E' ? kh : kv));
    });
  }

  /* ---------------------------------------------------------------- rules */
  /** Which intersection approach the van is in, if any. */
  findApproach() {
    const T = this.T, A = OTR.townArt, R = A.ROAD / 2, v = this.van;
    const cosH = Math.cos(v.heading), sinH = Math.sin(v.heading);
    let best = null;
    T.inters.forEach(it => {
      const dx = v.x - it.x, dy = v.y - it.y;
      if (Math.abs(dx) > R + 320 || Math.abs(dy) > R + 320) return;
      let dir = null;
      if (Math.abs(dy) < R && dx < -R + 12 && cosH > 0.45) dir = 'W';
      else if (Math.abs(dy) < R && dx > R - 12 && cosH < -0.45) dir = 'E';
      else if (Math.abs(dx) < R && dy < -R + 12 && sinH > 0.45) dir = 'N';
      else if (Math.abs(dx) < R && dy > R - 12 && sinH < -0.45) dir = 'S';
      if (!dir) return;
      // measured from the front bumper, since that is what has to stop behind the line
      const nose = v.g.nose * this.P;
      const dist = Math.max(0, Math.abs(dir === 'W' || dir === 'E' ? dx : dy) - R - nose);
      if (!best || dist < best.dist) best = { it, dir, dist };
    });
    return best;
  }

  checkRules(dt) {
    const T = this.T, v = this.van, A = OTR.townArt, R = A.ROAD / 2, V = OTR.vehicle;
    const mph = V.mph(v);
    const limit = T.limitAt(v.x, v.y);

    // a school zone allows 2 mph over, elsewhere 5 (20 in a 15 used to pass unremarked)
    const tol = limit <= 15 ? 2 : 5;
    if (mph > limit + tol) {
      this.speedT = (this.speedT || 0) + dt;
      if (this.speedT > 1.2) {
        this.speedT = 0;
        this.violation('speed', `Speeding: ${Math.round(mph)} in a ${limit}`, 'safety', 2, 'Speed limits in residential and school zones exist because stopping distance doubles with speed. The route time you save is never worth it.');
      }
    } else this.speedT = 0;

    // one clear warning before the first penalty (they used to start straight away, every 5 s, unannounced)
    if (this.lightsWanted && !this.lights && mph > 3) {
      this.hlT = (this.hlT || 0) + dt;
      if (!this.lightsWarned && this.hlT > 2) {
        this.lightsWarned = true;
        this.hlT = 0;
        this.toast(`${this.weather === 'clear' ? 'Low light' : 'Bad weather'}: headlights on (L)`, 0xFFC83D);
      } else if (this.lightsWarned && this.hlT > 5) {
        this.hlT = 0;
        this.violation('lights', 'Driving without headlights', 'safety', 2, 'Headlights are for being seen as much as for seeing. Rain, fog, dusk and dark: lights on (L).');
      }
    }

    if (!this.buckled && mph > 3) {
      this.beltT = (this.beltT || 0) + dt;
      if (this.beltT > 3) {
        this.beltT = 0;
        this.violation('belt', 'Driving without your seatbelt', 'safety', 3, 'Buckle up before you move, every single time. Couriers make hundreds of stops a day and the belt is what keeps you in the seat.');
      }
    }

    if (this.reverseDist > 3.5 && this.elapsed - this.goalAt > 25) {
      this.reverseDist = 0;
      this.violation('backing', 'Backed up without getting out and looking', 'safety', 3, 'Back as little as possible, and when you must: get out and look (G.O.A.L.), then back slowly with your mirrors.');
    }

    // wheels over the kerb: the classic step-van mistake is the rear wheel cutting a right turn
    const g = v.g;
    const wheels = [V.point(v, g.a, -(g.hw - 0.3)), V.point(v, g.a, g.hw - 0.3), V.point(v, -g.b, -(g.hw - 0.3)), V.point(v, -g.b, g.hw - 0.3)];
    const offRoad = wheels.some(w => this.surfaceAt(w.x, w.y) !== 'road');
    if (offRoad && mph > 1.5) {
      if (!this._offRoad) { this._offRoad = true; OTR.fx.shake(this, 90, 0.003); OTR.audio.play('thud'); }
      this.kerbT = (this.kerbT || 0) + dt;
      if (this.kerbT > 0.25) {
        this.kerbT = 0;
        this.violation('kerb', 'Drove over the kerb', 'safety', 2, 'Sidewalks are for people. Swing wider and slower on right turns — a step van\'s rear wheels cut inside the front ones.');
      }
    } else { this.kerbT = 0; if (!offRoad) this._offRoad = false; }

    // a school zone ahead is announced, as a stop sign or a light is (the limit used to change silently)
    const fw = V.fwd(v), zl = T.limitAt(v.x + fw.x * 260, v.y + fw.y * 260);
    const schoolHint = zl < limit && v.gear > 0 ? `SCHOOL ZONE AHEAD — ${zl} mph` : null;
    // --- intersections: track the approach, then judge the entry
    const ap = this.findApproach();
    if (ap) {
      if (!this.approach || this.approach.it !== ap.it || this.approach.dir !== ap.dir) {
        if (this.approach && this.approach.sign) this.approach.sign.clearTint();
        this.approach = { it: ap.it, dir: ap.dir, stopped: false, entered: false, sign: ap.it.signs && ap.it.signs[ap.dir] };
      }
      const a = this.approach;
      a.dist = ap.dist;
      if (V.stopped(v) && ap.dist < A.STOP_LINE + 92) a.stopped = true;
      // the front bumper crossing the stop line is the moment the law cares about
      if (!a.crossed && ap.dist < A.STOP_LINE) { a.crossed = true; this.judgeEntry(a, mph); }
      if (a.it.stop) {
        // only before the line: after a rolling stop it used to turn green next to the red "rolled through" toast
        if (a.stopped && !a.crossed) { this.setHint('Stopped — clear to go', 0x2BC48A); if (a.sign) a.sign.setTint(0x9BF5C0); }
        else if (ap.dist < 220 && !a.crossed) { this.setHint('STOP SIGN AHEAD — full stop at the line', 0xF0435A); if (a.sign) a.sign.clearTint(); }
        else this.setHint(schoolHint, 0xFFC83D);
      } else if (ap.dist < 240) {
        const st = this.lightFor(a.it, a.dir === 'W' || a.dir === 'E');
        this.setHint(st === 'green' ? 'Green' : st === 'amber' ? 'Amber — stop if you safely can' : 'RED LIGHT — stop at the line', st === 'green' ? 0x2BC48A : st === 'amber' ? 0xFFB020 : 0xF0435A);
      } else this.setHint(schoolHint, 0xFFC83D);
    } else this.setHint(schoolHint, 0xFFC83D);

    // judge the entry even after the approach test stops matching (you are inside the box by then)
    const a2 = this.approach;
    if (a2) {
      const inside = Math.abs(v.x - a2.it.x) < R + 6 && Math.abs(v.y - a2.it.y) < R + 6;
      if (inside && !a2.entered) {
        a2.entered = true;
        this.judgeEntry(a2, mph);
      }
      const far = Math.abs(v.x - a2.it.x) > R + 230 || Math.abs(v.y - a2.it.y) > R + 230;
      if (a2.entered && !inside && far) {
        if (a2.sign) a2.sign.clearTint();
        this.approach = null;
      }
    }

    // wrong side of the road, on either kind of street
    const rowI = T.nearestStreetH(v.y), colI = T.nearestStreetV(v.x);
    const onH = Math.abs(T.hy[rowI] - v.y) < R, onV = Math.abs(T.vx[colI] - v.x) < R;
    let wrong = false;
    if (mph > 6 && onH && !onV) {
      const east = Math.cos(v.heading) > 0.6, west = Math.cos(v.heading) < -0.6;
      const north = v.y < T.hy[rowI];
      wrong = (east && north) || (west && !north);
    } else if (mph > 6 && onV && !onH) {
      const south = Math.sin(v.heading) > 0.6, northbound = Math.sin(v.heading) < -0.6;
      const east = v.x > T.vx[colI];
      wrong = (south && east) || (northbound && !east);
    }
    if (wrong) {
      this.wrongT = (this.wrongT || 0) + dt;
      if (this.wrongT > 1.6) { this.wrongT = 0; this.violation('wrongside', 'Driving on the wrong side of the road', 'safety', 3, 'Stay in the right-hand lane. Cutting across to save a turn is how head-on collisions happen.'); }
    } else this.wrongT = 0;

    const stop = this.activeStop;
    if (stop && !stop.done) {
      const d = Phaser.Math.Distance.Between(v.x, v.y, stop.lot.park.x, stop.lot.park.y);
      const inZone = d < 150;
      if (inZone !== this.inZone) {
        this.inZone = inZone;
        if (inZone) this.toast('Stop zone — pull in to the kerb, stop, then P to park', 0xFFC83D);
      }
    }
  }

  /**
   * Judge an intersection entry, once per approach. It is called when the front bumper crosses the stop line and
   * again when the van reaches the junction box. Over the line on green or amber and you are committed, whatever
   * the light does next. Creeping over the line on red (or before stopping at a sign) is not yet running it, but
   * carrying on into the junction is.
   */
  judgeEntry(a, mph) {
    if (a.judged) return;
    if (a.it.stop) {
      if (a.stopped) { a.judged = true; return; }
      if (mph > 3) {
        a.judged = true;
        this.violation('rolling', 'Rolled through a stop sign', 'safety', 2, 'A stop means wheels stopped behind the line, then look both ways. Rolling stops are the classic delivery-driver citation.');
      }
      return;
    }
    if (this.lightFor(a.it, a.dir === 'W' || a.dir === 'E') !== 'red') { a.judged = true; return; }
    if (mph > 3) {
      a.judged = true;
      this.violation('redlight', 'Ran a red light', 'safety', 4, 'Red means stop, even when you are behind schedule. Intersection crashes are the worst ones.');
    }
  }

  /**
   * Parking at a stop: stopped, alongside the kerb on the house's side, inside the zone. Facing against the
   * traffic or leaving a wide gap still parks you, but it is scored and explained.
   */
  /**
   * The marked stop zone of a lot, as world x from x0 to x1: 150 px either side of the spot for the van's centre, plus
   * the van's own half-length, and never over a crosswalk. It is drawn exactly this size, and P accepts a van whose
   * body lies inside it (the drawn zone used to be smaller than what P accepted, and P took a van on the sidewalk).
   */
  parkBay(lot) {
    const A = OTR.townArt, hl = this.van.g.hl * this.P, cw = A.ROAD / 2 + 47 + 6;
    let x0 = lot.park.x - 150 - hl, x1 = lot.park.x + 150 + hl;
    this.T.vx.forEach(jx => {
      if (jx <= lot.park.x) x0 = Math.max(x0, jx + cw);
      else x1 = Math.min(x1, jx - cw);
    });
    return { x0, x1 };
  }

  tryPark() {
    const stop = this.activeStop, v = this.van, V = OTR.vehicle, P = this.P;
    if (!stop || stop.done || this.parked || this.leaving) return;
    const lot = stop.lot, street = this.T.hy[lot.row];
    const bc = V.bodyCentre(v);
    const along = Math.abs(bc.x - lot.park.x);
    const fromCentre = (bc.y - street) * lot.side;           // how far towards the house's kerb, px
    if (along > 220 || fromCentre < -20 || Math.abs(bc.y - street) > OTR.townArt.ROAD / 2 + 60) {
      this.toast('Not at the stop yet — pull in to the kerb inside the marked zone', 0xC9B3F0); return;
    }
    // "stopped" allows the moment after the brake is lifted, while the automatic creeps (P used to be refused then)
    if (!V.stopped(v) && !(this.elapsed - this.stoppedAt < 1 && V.mph(v) < 1.5)) { this.toast('Come to a full stop first (hold S or SPACE, then P)', 0xF0435A); return; }
    const skew = Math.abs(Math.sin(v.heading));                // 0 = parallel to the street
    if (skew > 0.34) { this.toast('Straighten up alongside the kerb first', 0xF0435A); return; }
    if (fromCentre < 20) { this.toast('Pull in to the kerb on the house\'s side of the street', 0xF0435A); return; }
    // on the road, close to the kerb, and wholly inside the marked zone
    const corners = [[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([f, r]) => V.point(v, v.g.centre + f * v.g.hl, r * v.g.hw));
    const outer = Math.max(...corners.map(c => (c.y - street) * lot.side));
    if (outer > OTR.townArt.ROAD / 2 + 4) { this.toast('You\'re up on the kerb. Back off it into the road, then park', 0xF0435A); return; }
    const gap = (OTR.townArt.ROAD / 2 - outer) / P;
    if (gap > 1.5) { this.toast(`Pull in closer to the kerb (${Math.round(gap * 3.281)} ft out)`, 0xF0435A); return; }
    const bay = this.parkBay(lot);
    const xs = corners.map(c => c.x);
    if (Math.min(...xs) < bay.x0 - 4 || Math.max(...xs) > bay.x1 + 4) { this.toast('Line up inside the marked zone, clear of the crosswalk', 0xF0435A); return; }

    const gapM = gap;                                               // kerb to the side of the van
    const withTraffic = Math.cos(v.heading) * lot.side > 0;              // the right-hand side of the road
    v.u = 0; v.lat = 0; v.r = 0; v.speed = 0;
    this.parked = true;
    OTR.audio.stopLoop('engine');
    OTR.audio.play('engine_start');
    const neat = withTraffic && gapM < 1.2 && skew < 0.14;
    this.log.check('safety', neat ? 2 : 1, 2, `Parked at ${lot.number} ${lot.street}${neat ? '' : !withTraffic ? ' (facing the traffic)' : gapM >= 1.2 ? ` (${Math.round(gapM * 3.281)} ft from the kerb)` : ' (at an angle)'}`, {
      lesson: !withTraffic
        ? 'Park on the right-hand side, facing the same way as the traffic, so you pull out into your own lane.'
        : 'Pull in close and parallel to the kerb, so passing traffic has room and you step out onto the sidewalk.'
    });
    // the belt over the whole leg, not just at the moment of parking (it used to pass after a no-belt penalty);
    // the drill judges it once over the whole drive instead
    if (!this.onPark) this.log.check('safety', this.buckled && !this.beltBroken ? 1 : 0, 1, 'Drove buckled up', { lesson: 'Buckle up before you move, every single time.' });
    this.beltBroken = false;
    if (this.onPark) { this.onPark(stop); return; }
    if (this.shiftMode && OTR.shift) { OTR.shift.arriveStop(this, stop); return; }
    stop.done = true;
    this.activeIndex = Math.min(this.route.length - 1, this.activeIndex + 1);
    this.showActiveStop();
    this.toast('Stop complete (lab mode)', 0x2BC48A);
    this.parked = false;
  }

  updateHud() {
    const v = this.van, T = this.T, V = OTR.vehicle;
    const mph = Math.round(V.mph(v));
    const limit = T.limitAt(v.x, v.y);
    // only touch the text when it changes: re-rendering a Text every frame costs real frame time
    if (this._mphShown !== mph) { this._mphShown = mph; this.speedText.setText(String(mph)); this.speedText.setColor(mph > limit + 5 ? '#FF6B7F' : '#ffffff'); }
    if (this._limitShown !== limit) { this._limitShown = limit; this.limitText.setText(String(limit)); }
    const gear = v.gear < 0 ? 'R' : 'D';
    if (this._gearShown !== gear) {
      this._gearShown = gear;
      this.gearBg.redraw((g) => {
        g.fillStyle(gear === 'R' ? 0xFFC83D : 0x2BC48A, 1); g.fillRoundedRect(-24, -18, 48, 36, 10);
        g.lineStyle(3, 0x16062B, 1); g.strokeRoundedRect(-24, -18, 48, 36, 10);
      });
      this.gearText.setText(gear).setColor(gear === 'R' ? '#3A2200' : '#0B2A1C');
    }
    const arcKey = `${mph}|${mph > limit + 5}|${gear}`;
    if (this._arcKey !== arcKey) {
      this._arcKey = arcKey;
      this.speedArc.redraw((g) => {
        g.lineStyle(7, mph > limit + 5 ? 0xF0435A : gear === 'R' ? 0xFFC83D : 0x2BC48A, 1);
        g.beginPath();
        g.arc(0, 0, 58, Math.PI * 0.75, Math.PI * 0.75 + Math.PI * 1.5 * OTR.util.clamp01(mph / 40));
        g.strokePath();
      });
    }
    let hint = V.gearPrompt(v);
    if (!hint && this.goalBusy) hint = 'G.O.A.L. — looking all round the van…';
    if (!hint && v.gear < 0 && this.elapsed - this.goalAt > 25) hint = 'Backing: stop and get out and look first (G)';
    this.setGearHint(hint);
    const belt = this.buckled ? '' : 'BELT OFF';
    if (this._beltShown !== belt) { this._beltShown = belt; this.beltPill.setText(belt); }
    const stop = this.activeStop;
    let label, text;
    if (stop) {
      // US units, like the speedometer: feet, or miles beyond 1,000 ft
      const ft = Phaser.Math.Distance.Between(v.x, v.y, stop.lot.park.x, stop.lot.park.y) / this.P * 3.281;
      const d = ft < 1000 ? `${Math.round(ft / 10) * 10} ft` : `${(ft / 5280).toFixed(1)} mi`;
      text = `${stop.lot.number} ${stop.lot.street}  ·  ${d}`;
      label = this.stopLabelFor(stop);
    } else {
      label = 'ROUTE';
      text = 'Back to the station';
    }
    if (this._stopTextShown !== text) { this._stopTextShown = text; this.stopText.setText(text); }
    if (this._stopLabelShown !== label) { this._stopLabelShown = label; this.stopLabel.setText(label); }
    if (this.d.clock) {
      const c = this.d.clock(this.elapsed);
      if (this._clockShown !== c) { this._clockShown = c; this.clockText.setText(c); }
    }
    this.drawMinimap();
  }

  stopLabelFor(stop) { return `STOP ${stop.index || this.activeIndex + 1} OF ${this.d.total || this.route.length}`; }
}
OTR.registerScene(TownDriveScene);
