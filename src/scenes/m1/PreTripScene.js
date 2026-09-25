/*
 * Module 1 · Pre-Trip Walkaround.
 *
 * You walk around the truck view by view (front → driver side → rear → curb side, plus the cab), inspect
 * each item in a close-up, and decide: pass, or flag the defect. Lamps have to be switched on in the cab
 * before you can judge them, the horn and brakes have to be tested, and tires need the tread gauge.
 *
 * Content: data/m1_pretrip.js
 */
class PreTripScene extends BaseScenarioScene {
  constructor() { super('PreTripScene'); }

  create() {
    const C = this.content;
    this.setupBase();
    this.log = new OTR.ScoreLog();
    this.cats = this.scenario ? this.scenario.categories : ['safety', 'efficiency'];
    this.elapsed = 0;
    this.running = false;
    this.lights = false;
    this.marks = {};             // itemId -> 'pass' | 'flag'
    this.tested = {};            // itemId -> true once its required test was done
    this.treadRead = {};         // itemId -> the tread depth the gauge read there
    this.viewOrder = ['front', 'driver', 'rear', 'passenger'];
    this.viewIndex = 1;
    this.inCab = false;

    // pick this run's defects: on a route day from the day's seed, so a day is the same day every time it is played
    const R = C.defects || { min: 3, max: 5 };
    const day = this.shiftMode && OTR.shift && OTR.shift.state ? OTR.shift.state : null;
    const rnd = day ? OTR.shift.rng('pretrip' + day.day) : Math.random;
    const n = R.min + Math.floor(rnd() * (R.max - R.min + 1));
    this.defects = {};
    const pool = C.items.slice();
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    pool.slice(0, n).forEach(it => { this.defects[it.id] = true; });
    this.seed = Math.floor(rnd() * 9999);
    // and in the day's weather (it used to be a clear morning whatever the day was)
    this.weather = day ? day.weather : 'clear';

    this.buildStage();
    this.buildChecklist();
    this.hud({ score: false, timer: true });
    this.hudBar.setScrollFactor(0);
    this.showView(this.viewOrder[this.viewIndex]);

    this.introCard(C.intro.title, C.intro.lines, () => { this.running = true; }, { h: 470 });
  }

  /* ================================================================ stage */
  buildStage() {
    const st = this.stage = new OTR.Stage(this, { width: OTR.W, tod: 'morning', weather: this.weather, clickToWalk: false });
    st.sky();
    st.far(250);
    st.ground([{ x0: 0, x1: OTR.W, type: 'concrete' }]);
    this.truckImg = this.add.image(OTR.W / 2, 0, '__DEFAULT').setDepth(4);
    this.spotLayer = this.add.container(0, 0).setDepth(40);   // above the courier, so a hotspot is never hidden
    this.me = OTR.rig.person(this, 300, 0, OTR.hub.playerSpec, { scale: 0.74, facing: 1, depth: 30 });
    st.actor(this.me);
    this.atmos = OTR.atmos.apply(this, { tod: 'morning', weather: this.weather, depth: 700 });

    // view arrows
    this.leftArrow = this.viewButton(52, '◀', () => this.turn(-1));
    this.rightArrow = this.viewButton(OTR.W - 52, '▶', () => this.turn(1));
    this.viewLabel = OTR.txt(this, OTR.W / 2, 84, '', 20, '#ffffff', { weight: '900', stroke: '#16062B', strokeW: 5 }).setScrollFactor(0).setDepth(820);
    this.cabBtn = OTR.ui.button(this, OTR.W / 2, OTR.H - 54, 'Climb into the cab (C)', () => this.toggleCab(), { w: 280, h: 46, skin: 'purple', fontSize: 16, key: 'C' });
    this.cabBtn.setDepth(820).setScrollFactor(0);
    this.signBtn = OTR.ui.button(this, OTR.W - 190, OTR.H - 54, 'Sign off ▶', () => this.signOff(), { w: 220, h: 48, skin: 'orange', fontSize: 17 });
    this.signBtn.setDepth(820).setScrollFactor(0);
    this.signBtn.setEnabled(false);
    // A / D or the arrow keys walk round the truck (the ◀ ▶ arrows were mouse only); L works the cab switch
    const walk = (dir) => () => { if (this.running && !this.scene.isPaused() && !(this._openModals > 0)) this.turn(dir); };
    ['keydown-LEFT', 'keydown-A'].forEach(k => OTR.onKey(this, k, walk(-1)));
    ['keydown-RIGHT', 'keydown-D'].forEach(k => OTR.onKey(this, k, walk(1)));
    OTR.onKey(this, 'keydown-L', () => { if (this.running && this.view === 'cab' && !(this._openModals > 0)) this.toggleLights(); });
    OTR.txt(this, 52, OTR.H / 2 + 52, 'A / ←', 12, '#C9B3F0', { weight: '900', stroke: '#16062B', strokeW: 4 }).setDepth(820).setScrollFactor(0).setName('hintL');
    OTR.txt(this, OTR.W - 52, OTR.H / 2 + 52, 'D / →', 12, '#C9B3F0', { weight: '900', stroke: '#16062B', strokeW: 4 }).setDepth(820).setScrollFactor(0).setName('hintR');
  }

  toggleLights() {
    this.lights = !this.lights;
    OTR.audio.play('beep');
    OTR.ui.toast(this, this.lights ? 'Lights and hazards on — now walk around and check every lamp' : 'Lights off');
    this.showView('cab');
  }

  viewButton(x, label, onClick) {
    const c = this.add.container(x, OTR.H / 2).setDepth(820).setScrollFactor(0);
    const g = OTR.tex.shape(this, (g) => {
      g.fillStyle(0x16062B, 0.7); g.fillCircle(0, 0, 34);
      g.lineStyle(2, 0xFF6600, 0.9); g.strokeCircle(0, 0, 34);
    });
    const t = OTR.txt(this, 0, -2, label, 28, '#ffffff', { weight: '900' });
    const hit = this.add.zone(0, 0, 76, 76).setInteractive({ useHandCursor: true }).setScrollFactor(0);
    hit.on('pointerover', () => this.tweens.add({ targets: c, scale: 1.12, duration: 120 }));
    hit.on('pointerout', () => this.tweens.add({ targets: c, scale: 1, duration: 120 }));
    hit.on('pointerup', () => { OTR.audio.play('click'); onClick(); });
    c.add([g, t, hit]);
    return c;
  }

  turn(dir) {
    if (this.inCab) return;
    this.viewIndex = (this.viewIndex + dir + this.viewOrder.length) % this.viewOrder.length;
    this.showView(this.viewOrder[this.viewIndex]);
  }

  toggleCab() {
    this.inCab = !this.inCab;
    if (this.inCab) this.showView('cab');
    else this.showView(this.viewOrder[this.viewIndex]);
  }

  showView(id) {
    const C = this.content;
    this.view = id;
    const oi = this.viewOrder.indexOf(id);
    if (oi >= 0) this.viewIndex = oi;              // keep the neighbour labels honest
    const V = OTR.truckArt.view(this, id, { lights: this.lights, defects: this.defects });
    // the cab is sized and centred to sit whole between the left edge and the checklist panel (x 1000)
    const scale = id === 'cab' ? 0.88 : id === 'driver' || id === 'passenger' ? 0.74 : 0.86;
    // the side views sit a little right, so the mirror at the cab end is clear of the ◀ button
    const cx = id === 'cab' ? 494 : id === 'driver' || id === 'passenger' ? 540 : 470;
    this.truckImg.setTexture(V.key).setScale(scale);
    this.truckImg.setPosition(cx, id === 'cab' ? OTR.H / 2 + 10 : OTR.scenery.GROUND - V.h * scale / 2 + 30);
    this.me.setVisible(id !== 'cab');
    this.leftArrow.setVisible(id !== 'cab');
    this.rightArrow.setVisible(id !== 'cab');
    ['hintL', 'hintR'].forEach(n => { const t = this.children.getByName(n); if (t) t.setVisible(id !== 'cab'); });
    this.cabBtn.setLabel(id === 'cab' ? 'Climb back out (C)' : 'Climb into the cab (C)');
    const names = { front: 'Front', driver: 'Driver side', rear: 'Rear', passenger: 'Curb side', cab: 'In the cab' };
    const prev = names[this.viewOrder[(this.viewIndex - 1 + this.viewOrder.length) % this.viewOrder.length]];
    const next = names[this.viewOrder[(this.viewIndex + 1) % this.viewOrder.length]];
    this.viewLabel.setText(id === 'cab' ? 'IN THE CAB' : `◀ ${prev}      ${names[id].toUpperCase()}      ${next} ▶`);

    // hotspots (a ring destroyed under the pointer never gets its pointerout, so drop its tooltip here)
    this.hideTip();
    this.spotLayer.removeAll(true);
    const items = C.items.filter(it => it.view === id);
    const left = this.truckImg.x - V.w * scale / 2, top = this.truckImg.y - V.h * scale / 2;
    this.viewGeom = { V, scale, left, top };
    const placed = [];
    items.forEach(it => {
      const s = V.spots[it.id];
      if (!s) return;
      const x = left + s[0] * V.w * scale, y = top + s[1] * V.h * scale;
      placed.push({ x, y });
      const marked = this.marks[it.id];
      const col = marked === 'pass' ? 0x2BC48A : marked === 'flag' ? 0xF0435A : 0xFFC83D;
      const halo = OTR.tex.shape(this, (g) => {
        g.fillStyle(0x16062B, 0.55); g.fillCircle(0, 0, 25);
        g.lineStyle(2, 0xFFFFFF, 0.85); g.strokeCircle(0, 0, 25);
      }, x, y);
      this.spotLayer.add(halo);
      const ring = OTR.tex.shape(this, (g) => {
        g.fillStyle(col, marked ? 0.5 : 0.3); g.fillCircle(0, 0, 20);
        g.lineStyle(3, col, 1); g.strokeCircle(0, 0, 20);
      }, x, y).setName('spot:' + it.id);
      // the click area stays the 40 px square of the ring itself, not the texture's antialiasing margin
      ring.setInteractive({ hitArea: new Phaser.Geom.Rectangle(ring.displayOriginX - 20, ring.displayOriginY - 20, 40, 40), hitAreaCallback: Phaser.Geom.Rectangle.Contains, useHandCursor: true });
      if (!marked) this.spotLayer.add(OTR.txt(this, x, y, '?', 16, '#FFE3C8', { weight: '900' }));
      ring.on('pointerup', () => this.inspect(it));
      ring.on('pointerover', () => { ring.setScale(1.15); this.showTip(it.name, x, y - 40); });
      ring.on('pointerout', () => { ring.setScale(1); this.hideTip(); });
      if (!marked) this.tweens.add({ targets: ring, scale: 1.18, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      if (marked) {
        const mark = OTR.txt(this, x, y, marked === 'pass' ? '✓' : '!', 22, marked === 'pass' ? '#8BF0C6' : '#FF9A9A', { weight: '900' });
        this.spotLayer.add(mark);
      }
      this.spotLayer.add(ring);
    });
    // stand beside the truck on the side views and off to one end on the others, and never in front of an
    // item you are meant to be looking at (the courier's body covers roughly y 440–650)
    if (this.me.c.active && id !== 'cab') {
      const side = id === 'driver' || id === 'passenger';
      const lo = side ? 250 : 110, hi = side ? 900 : 190;
      const low = placed.filter(p => p.y > 400).map(p => p.x);
      let best = OTR.util.clamp(this.me.x, lo, hi), bestGap = -1;
      for (let x = lo; x <= hi; x += 10) {
        const gap = low.length ? Math.min(...low.map(sx => Math.abs(sx - x))) : 999;
        if (gap > bestGap + 0.5) { bestGap = gap; best = x; }
      }
      this.me.x = best;
    }
    this.refreshChecklist();
  }

  showTip(text, x, y) {
    this.hideTip();
    this.tip = OTR.txt(this, x, y, text, 15, '#ffffff', { weight: '900', stroke: '#16062B', strokeW: 5 }).setDepth(900);
  }

  hideTip() { if (this.tip) { this.tip.destroy(); this.tip = null; } }

  /* ================================================================ checklist */
  buildChecklist() {
    this.listPanel = this.add.container(OTR.W - 150, 0).setDepth(820).setScrollFactor(0);
    this.refreshChecklist();
  }

  refreshChecklist() {
    const C = this.content;
    const c = this.listPanel;
    c.removeAll(true);
    const items = C.items;
    const done = items.filter(it => this.marks[it.id]).length;
    const here = items.filter(it => it.view === this.view);
    const names = { front: 'FRONT', driver: 'DRIVER SIDE', rear: 'REAR', passenger: 'CURB SIDE', cab: 'IN THE CAB' };
    const w = 260, h = 108 + here.length * 24;
    c.add(OTR.tex.shape(this, (g) => {
      g.fillStyle(0x0E0620, 0.82); g.fillRoundedRect(-w / 2, 72, w, h, 14);
      g.lineStyle(2, 0x6A45A0, 0.7); g.strokeRoundedRect(-w / 2, 72, w, h, 14);
    }));
    c.add(OTR.txt(this, -w / 2 + 14, 92, 'CHECKLIST  ' + done + '/' + items.length, 13, '#FF9447', { ox: 0, weight: '900' }));
    const bar = OTR.ui.bar(this, -w / 2 + 14, 112, w - 28, 8, { color: 0xFF6600, bgAlpha: 0.35 });
    bar.setValue(done / items.length);
    c.add(bar);
    c.add(OTR.txt(this, -w / 2 + 14, 134, names[this.view] || '', 12, '#C9B3F0', { ox: 0, weight: '900' }));
    let y = 158;
    here.forEach(it => {
      const m = this.marks[it.id];
      const col = m === 'pass' ? '#8BF0C6' : m === 'flag' ? '#FF9A9A' : '#F4ECFF';
      const icon = m === 'pass' ? '\u2713' : m === 'flag' ? '!' : '\u00b7';
      c.add(OTR.txt(this, -w / 2 + 16, y, icon + ' ' + it.name, 12, col, { ox: 0, bold: false }));
      y += 24;
    });
    const left = items.length - done;
    c.add(OTR.txt(this, -w / 2 + 16, 72 + h - 20, left ? left + ' still to check' : 'All checked \u2014 sign off', 12, left ? '#9A8AB0' : '#8BF0C6', { ox: 0, bold: false }));
    this.signBtn.setEnabled(done === items.length);
  }

  /* ================================================================ inspection */
  inspect(item) {
    if (!this.running || this._openModals > 0) return;
    this.hideTip();
    const bad = !!this.defects[item.id];
    const needs = item.needs;
    // A tire's reading comes from its own tread (item.tread: the defect's variant and depths), and the note says the
    // number only: the limits are stated once, the verdict is the trainee's (it used to say "out of service").
    const T = item.tread || {};
    const depthAt = (x) => (!bad ? (T.good || 9) : T.variant === 'edge' ? (x < 0 ? T.inner : T.outer) : T.bad);
    const state = { bad, seed: this.seed, lights: this.lights, pressed: false, gauged: !!this.tested[item.id], variant: bad ? T.variant : null };
    const readNote = () => `Gauge reads ${state.reading}/32".`;
    // a tire you already measured keeps its reading when you come back to it
    if (needs === 'gauge' && state.gauged) state.reading = this.treadRead[item.id] || depthAt(-1);
    let img = null, note = null, actionBtn = null;
    this._judge = { pass: null, flag: null };

    const canJudge = () => {
      if (needs === 'lights' && !this.lights) return false;
      if (needs === 'press' && !state.pressed) return false;
      if (needs === 'gauge' && !state.gauged) return false;
      return true;
    };
    const refresh = () => {
      img.setTexture(OTR.truckArt.closeup(this, item.kind, state));
      if (note) {
        note.setText(
          needs === 'lights' && !this.lights ? 'Switch the lights on in the cab before you judge a lamp.'
            : needs === 'press' && !state.pressed ? (item.kind === 'horn' ? 'Press the horn to test it.' : item.kind === 'pedal' ? 'Press and hold the brake.' : item.kind === 'door' ? 'Pull on the latch to test it.' : 'Pull the belt out and check the webbing.')
              : needs === 'gauge' && !state.gauged ? 'Drag the tread gauge onto the tread. Minimum: 4/32" on a steer (front) tire, 2/32" on the others.'
                : needs === 'gauge' ? `${readNote()}  (Minimum: 4/32" front, 2/32" rear.)`
                  : ''
        );
      }
      if (actionBtn) actionBtn.setEnabled(!(needs === 'lights' && !this.lights));
      const ok = canJudge();
      if (this._judge.pass) this._judge.pass.setEnabled(ok);
      if (this._judge.flag) this._judge.flag.setEnabled(ok);
    };
    this._refreshJudge = refresh;

    this.closeupModal(item, (box, m, w, h) => {
      // picture, note and test button stacked clear of the Pass / Flag row (the test button used to sit under it)
      img = this.add.image(0, -58, OTR.truckArt.closeup(this, item.kind, state)).setDisplaySize(480, 305);
      box.add(img);
      note = OTR.txt(this, 0, 118, '', 16, '#8A3A00', { align: 'center', wrap: w - 80, weight: '800' });
      box.add(note);

      if (needs === 'press') {
        actionBtn = OTR.ui.button(this, 0, 164, item.kind === 'horn' ? 'Press the horn (T)' : item.kind === 'pedal' ? 'Press and hold the brake (T)' : item.kind === 'door' ? 'Pull on the latch (T)' : 'Pull the belt out (T)', () => {
          state.pressed = true;
          this.tested[item.id] = true;
          if (item.kind === 'horn') OTR.audio.play(bad ? 'click_dud' : 'horn');
          else if (item.kind === 'pedal') OTR.audio.play('brake');
          else if (item.kind === 'door') OTR.audio.play(bad ? 'door_open' : 'door_close');
          else OTR.audio.play('paper');
          refresh();
        }, { w: 300, h: 42, skin: 'purple', fontSize: 15, key: 'T' });
        box.add(actionBtn);
      } else if (needs === 'gauge') {
        const g = this.add.image(-250, 164, OTR.truckArt.gauge(this)).setScale(0.6).setInteractive({ draggable: true, useHandCursor: true });
        this.input.setDraggable(g);
        // dragX/dragY already arrive in the parent container's space
        g.on('drag', (p, dx, dy) => { g.x = dx; g.y = dy; });
        g.on('dragend', () => {
          const onTread = Math.abs(g.x) < 220 && g.y < 90 && g.y > -210;
          if (!onTread) {
            this.tweens.add({ targets: g, x: -250, y: 164, duration: 200, ease: 'Quad.easeOut' });
            return;
          }
          // it measures where it is dropped: an edge-worn tire reads differently on its two halves
          const dropX = g.x;
          this.tweens.add({ targets: g, y: -58, duration: 160, ease: 'Quad.easeOut' });
          state.gauged = true;
          this.tested[item.id] = true;
          state.reading = depthAt(dropX);
          this.treadRead[item.id] = state.reading;
          OTR.audio.play('beep');
          refresh();
        });
        box.add(g);
      } else if (needs === 'lights') {
        actionBtn = null;
      }
      refresh();
    }, (verdict) => {
      this.marks[item.id] = verdict;
      OTR.audio.play(verdict === 'flag' ? 'stamp' : 'click');
      this.showView(this.view);
      this.refreshChecklist();
    });
  }

  /** Close-up dialog with Pass / Flag buttons that only unlock once any required test is done. */
  closeupModal(item, build, onDecide) {
    const s = this;
    let passBtn, flagBtn;
    const m = OTR.ui.modal(this, {
      w: 640, h: 560, escClose: true, depth: 5000,
      build: (box, api, w, h) => {
        box.add(OTR.txt(s, 0, -h / 2 + 34, item.name.toUpperCase(), 17, '#FF6600', { weight: '900' }));
        build(box, { box, api }, w, h);
        passBtn = OTR.ui.button(s, -110, h / 2 - 48, 'Pass (P)', () => api.close(() => onDecide('pass')), { w: 190, h: 50, skin: 'green', fontSize: 18, key: 'P' });
        flagBtn = OTR.ui.button(s, 110, h / 2 - 48, 'Flag defect (F)', () => api.close(() => onDecide('flag')), { w: 190, h: 50, skin: 'red', fontSize: 18, key: 'F' });
        box.add([passBtn, flagBtn]);
        if (s._judge) { s._judge.pass = passBtn; s._judge.flag = flagBtn; }
        if (s._refreshJudge) s._refreshJudge();          // gate them now that they exist
      },
      buttons: []
    });
    m.setJudge = (ok) => { if (passBtn) passBtn.setEnabled(ok); if (flagBtn) flagBtn.setEnabled(ok); };
    return m;
  }

  /* ================================================================ sign off */
  signOff() {
    if (!this.running) return;
    this.running = false;                 // the clock stops at the signature (it ran on under the report)
    const C = this.content;
    const items = C.items;
    const caught = [], missed = [], falseFlags = [];
    items.forEach(it => {
      const bad = !!this.defects[it.id], m = this.marks[it.id];
      if (bad && m === 'flag') caught.push(it);
      else if (bad) missed.push(it);
      else if (m === 'flag') falseFlags.push(it);
    });
    const totalDefects = Object.keys(this.defects).length;
    // Every defect here takes the truck out of service: rolling out with one is never averaged away
    this.log.check('safety', caught.length, totalDefects, `Caught the defects (${caught.length} of ${totalDefects})`, { lesson: missed.length ? missed[0].lesson : null, critical: missed.length > 0 });
    // one point per good part condemned, however many (flagging everything used to cost the same as three)
    if (falseFlags.length) this.log.penalty('safety', falseFlags.length, `Flagged ${falseFlags.length} good part${falseFlags.length === 1 ? '' : 's'}`, { lesson: C.lessons.falseFlag });
    const par = C.parTime || 220;
    // time only counts as far as the verdicts were right: rushing through earns nothing (PRP-6)
    const accuracy = totalDefects + falseFlags.length ? caught.length / (totalDefects + falseFlags.length) : 1;
    const time = this.elapsed <= par ? 1 : this.elapsed <= par * 1.4 ? 2 / 3 : this.elapsed <= par * 1.8 ? 1 / 3 : 0;
    this.log.check('efficiency', Math.round(OTR.scoring.gateTime(time, accuracy) * 3), 3, `Walked it in good time (${Math.round(this.elapsed)}s, par ${par}s)`,
      { lesson: accuracy < 1 ? 'A quick walkaround only counts if it finds what is wrong. Look properly, then decide.' : null });
    // (lamps, horn, brakes and tread cannot be passed or flagged until they have been tested, so there is no
    // separate "did you test it" score: it could never be failed)

    // defects that roll out with you
    if (this.shiftMode && OTR.shift && OTR.shift.state) {
      OTR.shift.state.truck.defects = missed.map(it => it.id);
      OTR.shift.state.truck.missed = missed.map(it => `${it.name}: ${it.defect}`);   // named in the gate check and debrief
      // and the ones flagged: the shop fixes them before the truck rolls (they used to be forgotten, so a flagged
      // dead headlight on a day that needs lights went unmentioned all day)
      OTR.shift.state.truck.fixed = caught.map(it => `${it.name}: ${it.defect}`);
      OTR.save.write();
    }

    this.report(caught, missed, falseFlags);
  }

  report(caught, missed, falseFlags) {
    const s = this;
    const w = 820, h = 560;
    OTR.ui.modal(this, {
      w, h, depth: 5000,
      build: (box, api) => {
        // condemning good parts is not a good walkaround either: the truck sits in the yard for nothing
        const verdict = missed.length ? { col: 0xC8243B, text: 'THIS TRUCK ROLLED OUT WITH DEFECTS' }
          : falseFlags.length ? { col: 0xA85A00, text: 'TRUCK HELD BACK FOR PARTS THAT WERE FINE' }
            : { col: 0x1E9E6B, text: 'GOOD WALKAROUND' };
        box.add(OTR.tex.shape(this, (hg) => { hg.fillStyle(verdict.col, 1); hg.fillRoundedRect(-w / 2, -h / 2, w, 84, { tl: 22, tr: 22, bl: 0, br: 0 }); }));
        box.add(OTR.txt(this, 0, -h / 2 + 30, verdict.text, 15, 'rgba(255,255,255,0.9)', { weight: '900' }));
        box.add(OTR.txt(this, 0, -h / 2 + 58, `${caught.length} caught · ${missed.length} missed · ${falseFlags.length} wrongly flagged`, 24, '#ffffff', { weight: '900' }));
        // Most instructive first: what rolled out, then what was condemned for nothing, then the catches.
        // Whatever does not fit above the Finish button is summed up in one line.
        const rows = [];
        missed.forEach(it => rows.push({ kind: 'missed', col: 0xF0435A, icon: 'ic_cross', text: `${it.name}: ${it.defect}`, sub: '↳ ' + it.consequence, name: it.name }));
        falseFlags.forEach(it => rows.push({ kind: 'flagged', col: 0xFFB020, icon: 'ic_flag', text: `${it.name} was fine: ${it.ok}`, name: it.name }));
        caught.forEach(it => rows.push({ kind: 'caught', col: 0x2BC48A, icon: 'ic_check', text: `${it.name}: ${it.defect} — caught.`, name: it.name }));
        if (!rows.length) rows.push({ col: 0x2BC48A, icon: 'ic_check', text: 'Nothing wrong with this truck today, and you did not condemn anything good.' });
        const limit = h / 2 - 90;                          // the Finish button's top edge, less a margin
        let y = -h / 2 + 108;
        for (let i = 0; i < rows.length; i++) {
          const r = rows[i];
          const t = OTR.txt(this, -w / 2 + 62, y, r.text, 15, '#250849', { ox: 0, oy: 0, bold: false, wrap: w - 120 });
          let hgt = t.height + 10;
          let sub = null;
          if (r.sub) {
            sub = OTR.txt(this, -w / 2 + 62, y + hgt - 4, r.sub, 13, '#7A6A90', { ox: 0, oy: 0, bold: false, wrap: w - 140 });
            hgt += sub.height + 8;
          }
          const room = i === rows.length - 1 ? limit : limit - 40;   // leave space for the summary line
          if (y + hgt > room) {
            t.destroy(); if (sub) sub.destroy();
            const rest = rows.slice(i), shown = rows.slice(0, i);
            const group = (kind, label) => {
              const list = rest.filter(x => x.kind === kind);
              if (!list.length) return null;
              const more = shown.some(x => x.kind === kind) ? 'more ' : '';
              const names = list.slice(0, 3).map(x => x.name).join(', ') + (list.length > 3 ? ', …' : '');
              return `${list.length} ${more}${label} (${names})`;
            };
            const parts = [group('missed', 'missed'), group('flagged', 'wrongly flagged'), group('caught', 'caught')].filter(Boolean);
            box.add(OTR.txt(this, -w / 2 + 62, y + 2, '+ ' + parts.join(' · '), 14, '#7A6A90', { ox: 0, oy: 0, bold: false, wrap: w - 120 }));
            break;
          }
          box.add(this.add.image(-w / 2 + 40, y + 10, r.icon).setDisplaySize(16, 16).setTint(r.col));
          box.add(t);
          if (sub) box.add(sub);
          y += hgt;
        }
        void api;
      },
      buttons: [{
        label: 'Finish ▶', skin: 'orange', key: ['ENTER', 'SPACE'],
        onClick: () => {
          const ratios = s.log.ratios(s.cats);
          const lessons = !missed.length && !falseFlags.length ? [s.content.lessons.perfect] : missed.length ? [s.content.lessons.missed] : [];
          s.finish({
            score: s.log.score(), ratios, log: s.log, lessons,
            summary: `${caught.length} caught · ${missed.length} missed · ${falseFlags.length} wrongly flagged · ${Math.round(s.elapsed)}s`,
            // a truck held back for parts that were fine is not a walkaround to praise
            headlineCap: falseFlags.length ? 'GOOD EFFORT' : undefined,
            stats: { missed: missed.map(i => i.id) }
          }, 200);
        }
      }]
    });
  }

  update(time, delta) {
    if (this.stage) this.stage.update(delta);
    if (!this.running || this.finished) return;
    this.elapsed += delta / 1000;
    this.setTimer(this.elapsed, this.elapsed > (this.content.parTime || 220));

    // the cab light switch is a live control, not a checklist item
    if (this.view === 'cab' && !this._cabHooked) {
      this._cabHooked = true;
      // place it from the geometry the cab image was actually drawn with (showView), so it sits on the switch
      const G = this.viewGeom;
      const sp = OTR.truckArt.spots('cab').light_switch;
      const zone = this.add.zone(G.left + sp[0] * G.V.w * G.scale, G.top + sp[1] * G.V.h * G.scale, 90, 60).setInteractive({ useHandCursor: true }).setDepth(7);
      zone.on('pointerup', () => {
        if (this._openModals > 0) return;
        this.toggleLights();
        this._cabZone = zone;
      });
      this._cabZone = zone;
    }
    if (this.view !== 'cab' && this._cabHooked) {
      this._cabHooked = false;
      if (this._cabZone) { this._cabZone.destroy(); this._cabZone = null; }
    }
  }
}
OTR.registerScene(PreTripScene);
