/*
 * Conversation scenarios (Modules 3 & 4), played on a real stage with full-body characters.
 *
 * Content format: data/m3_dialogues.js (unchanged from before). This scene adapts it to the shared
 * talk engine (src/core/talk.js), so choices are shuffled, scoring is itemised, and characters
 * walk, gesture and react in a built scene instead of being portraits on a flat backdrop.
 */
class DialogueScene extends BaseScenarioScene {
  constructor() { super('DialogueScene'); }

  create() {
    const dlg = this.content;
    this.setupBase();
    this.log = new OTR.ScoreLog();
    this.cats = this.scenario ? this.scenario.categories : OTR.scoring.CATS;
    this.rigs = {};
    this.setting = dlg.setting || 'street';

    this.buildStage(this.setting);
    this.hud({ score: false });
    this.hudBar.setScrollFactor(0);
    this.buildMeters();

    this.time.delayedCall(500, () => this.run());
  }

  /* ================================================================ stage */
  settingSpec(name) {
    const map = {
      porch: { kind: 'house', tod: 'afternoon', weather: 'clear', ground: 'path' },
      // top: the caption box goes under the HUD, so the dog on the lawn is not hidden behind it
      porch_dog: { kind: 'house', tod: 'afternoon', weather: 'clear', ground: 'path', fence: true, top: true },
      street: { kind: 'street', tod: 'afternoon', weather: 'clear', ground: 'path' },
      storm: { kind: 'street', tod: 'evening', weather: 'storm', ground: 'path' },
      office: { kind: 'interior', tod: 'midday', weather: 'clear', sign: 'BRIGHTLINE', accent: 0x3DA5FF },
      depot: { kind: 'interior', tod: 'morning', weather: 'clear', sign: 'DISPATCH', accent: OTR_DATA.theme.primary, counter: true },
      warehouse: { kind: 'interior', tod: 'morning', weather: 'clear', sign: 'STATION', accent: OTR_DATA.theme.accent, counter: true },
      lot: { kind: 'street', tod: 'evening', weather: 'clear', ground: 'concrete' },
      // on the road in the storm: the van driving, the courier in the cab (m4-storm's driving decisions)
      road: { kind: 'road', tod: 'evening', weather: 'storm' },
      // the fender-bender: the van backed out of a driveway into a parked sedan (m8-incident)
      collision: { kind: 'collision', tod: 'afternoon', weather: 'clear' }
    };
    return map[name] || map.street;
  }

  /** where: optional { number, mailbox } — the address on the house and the name on its mailbox for this setting */
  buildStage(name, where) {
    if (this.stage) this.clearStage();
    this.onCall = null;                              // the courier is rebuilt below, empty-handed
    this.inCab = false;
    this.behindCounter = false;
    this.props = {};
    this.house = null;
    this.van = null;
    const S = this.settingSpec(name);
    const dlg = this.content;
    const number = (where && where.number) || dlg.houseNumber || '214';
    const mailboxName = (where && where.mailbox) || dlg.mailboxName || null;
    const st = this.stage = new OTR.Stage(this, { width: OTR.W, tod: S.tod, weather: S.weather, clickToWalk: false });
    st.sky();
    st.far(236);
    this.stageObjs = [];

    this.otherGround = false;
    if (S.kind === 'interior') {
      // wide enough to fill the frame (it used to stop at x 1180, showing sky and a cut plant)
      const I = st.interior(-420, { kind: S.counter ? 'counter' : 'lobby', sign: S.sign, accent: S.accent, w: 1760, counterX: 980 });
      st.ground([{ x0: 0, x1: OTR.W, type: 'tile' }]);
      this.spotCourier = 250;
      // behind the counter, on the counter's own floor line so she shows from the waist up and no legs show under
      // it (she used to stand 74 px lower, only her eyes over the counter), and left of the answer cards
      this.spotOther = Math.min(I.counterX + 20, 580);
      this.otherY = I.counterTopY + 96;                  // her shoes hidden by the counter too
      this.behindCounter = true;
    } else if (S.kind === 'road') {
      // driving in the storm: the van on a wet road, the courier at the wheel (not standing on the kerb)
      st.ground([{ x0: 0, x1: 1160, type: 'road' }, { x0: 1160, x1: 1200, type: 'curb' }, { x0: 1200, x1: OTR.W, type: 'sidewalk' }]);
      this.van = st.van(260, { open: false });
      this.van.hazards(false);
      st.prop('puddle', 180, { art: { w: 220 }, depth: -4 });
      st.prop('puddle', 1000, { art: { w: 260 }, depth: -4 });
      st.prop('lamp', 1230, { depth: -9 });
      this.spotCourier = 560;
      this.spotOther = 900;
      this.otherY = OTR.H - 80;
      this.inCab = true;
    } else if (S.kind === 'collision') {
      // the van half out of the driveway on the left, the parked sedan it backed into, its front wing folded
      st.ground([{ x0: 0, x1: 820, type: 'road' }, { x0: 820, x1: 860, type: 'curb' }, { x0: 860, x1: OTR.W, type: 'driveway' }]);
      const house = st.house(820, { number, steps: 2, porchW: 360, porchX: 200, w: 860 });
      this.house = house;
      this.van = st.van(-330, { open: true });
      // on the far side of the road, so its folded wing shows above the caption box
      this.sedan = st.prop('sedan', 560, { art: { color: 0x9AA4B4, dent: true }, depth: -7, dy: -58 });
      st.prop('tree', 1250, { depth: -9 });
      this.spotCourier = 165;
      this.spotOther = 470;
      this.otherY = OTR.H - 80;
    } else if (S.kind === 'house') {
      st.ground([{ x0: 0, x1: OTR.W, type: 'path' }]);
      const spec = Object.assign({ number, steps: 3, porchW: 430, porchX: 300, w: 1000 }, dlg.house || {});
      const house = st.house(-110, spec);
      this.house = house;
      if (S.fence) {
        // The yard's gate at the foot of the path: the courier starts inside it, halfway up the path, and backs out
        // through it; the dog is on the lawn, clear of the porch railing (the two used to stand side by side at the
        // front door for the whole safety lesson).
        st.prop('gate', 105, { art: { open: true, color: 0xFFFFFF }, depth: 31 });
        st.prop('fence', 60, { art: { w: 120, color: 0xFFFFFF }, ox: 1, depth: 31 });
        st.prop('sign', 1090, { art: { text: 'BEWARE\nOF DOG' }, depth: 9 });
      }
      st.prop('mailbox', 980, { art: { number: spec.number, name: mailboxName } });
      st.prop('tree', 1180, { depth: -9 });
      this.spotCourier = S.fence ? 170 : house.doorX - 210;
      this.spotOther = house.doorX - 26;
      this.otherY = house.floorY;
    } else {
      // Framed so nothing important meets the edge: the van shows its open cab door (the courier stands in it)
      // with the brand band wholly out of shot rather than cut to "Ex", and the house's door, number and porch are
      // all inside the frame (they used to run off the right-hand edge).
      st.ground([{ x0: 0, x1: 420, type: 'road' }, { x0: 420, x1: 480, type: 'curb' }, { x0: 480, x1: 640, type: 'sidewalk' }, { x0: 640, x1: OTR.W, type: 'path' }]);
      const house = st.house(540, { number, steps: 2, porchW: 400, porchX: 260, w: 900 });
      this.house = house;
      this.van = st.van(-320, { open: true });
      st.prop('mailbox', 560, { art: { number: house.layout.s.number, name: mailboxName } });
      st.prop('tree', 1240, { depth: -9 });
      this.spotCourier = 165;
      this.spotOther = 470;
      this.otherY = OTR.H - 80;
    }

    // props the scenario places in this setting (a planter on the porch): { type, x, porch, depth, art, setting }
    (dlg.props || []).filter(p => !p.setting || p.setting === name).forEach(p => {
      this.props[p.id || p.type] = st.prop(p.type, p.x, { art: p.art || {}, depth: p.depth !== undefined ? p.depth : 8, y: p.porch && this.house ? this.house.floorY : undefined });
    });

    this.me = OTR.rig.person(this, this.spotCourier, 0, OTR.hub.playerSpec, { scale: 0.82, facing: 1, depth: 30 });
    st.actor(this.me);
    if (this.inCab) this.me.setVisible(false);
    this.atmos = OTR.atmos.apply(this, { tod: S.tod, weather: S.weather, depth: 700 });
    st.bakeBackdrop();                               // the camera never moves here
  }

  clearStage() {
    // rebuild the whole display list for a new setting
    this.rigs = {};
    if (this.atmos) this.atmos.clear();
    this.children.list.slice().forEach(o => {
      if (o.depth >= 800) return;                 // keep HUD and overlays
      o.destroy();
    });
    this.stage = null;
  }

  /**
   * Bring a cast member on stage. Their mark is the cast's `spot` (a screen x) or the first free one near the
   * setting's (a second visitor used to walk onto the first one's spot and hide them); `enter: 'left' | 'right'`
   * walks them in from that edge (a neighbour coming over) instead of appearing at the door; `ground: true` keeps
   * them on the path or lawn rather than on the porch.
   */
  ensureRig(key) {
    if (this.rigs[key]) return this.rigs[key];
    const c = (this.content.cast || {})[key];
    if (!c) return null;
    const p = c.portrait || {};
    const dog = p.kind === 'dog';
    const spot = c.spot !== undefined ? c.spot : this.freeMark(dog);
    const from = c.enter === 'right' ? OTR.W + 80 : c.enter === 'left' ? -80 : spot + (dog ? 80 : 120);
    let rig;
    if (dog) {
      rig = OTR.rig.dog(this, from, 0, { fur: p.fur, patch: p.patch, collar: p.collar }, { scale: 0.72, facing: -1, mood: 'alert', depth: 24 });
    } else {
      rig = OTR.rig.person(this, from, 0, p, { scale: 0.8, facing: -1, depth: 25 });
    }
    const onGround = dog || c.ground || this.otherGround;
    this.stage.actor(rig, { depth: dog ? 24 : 25, followGround: onGround });
    if (!onGround) {
      const a = this.stage.actors.find(x => x.rig === rig);
      if (a) a.followGround = false;
      rig.y = this.otherY;
    }
    rig.mark = spot;
    if (!c.enter) {
      rig.setAlpha(0);
      this.tweens.add({ targets: rig.c, alpha: 1, duration: 280 });
    }
    rig.walkTo(spot, () => {
      rig.setFacing(spot < this.me.x ? 1 : -1);
      if (this.me && this.me.c && this.me.c.active) this.me.setFacing(spot < this.me.x ? -1 : 1);     // the courier turns to them
    });
    this.rigs[key] = rig;
    return rig;
  }

  /** The setting's mark for a visitor, or the nearest one to it no one stands on (all clear of the answer cards). */
  freeMark(dog) {
    const taken = Object.keys(this.rigs).map(k => this.rigs[k].mark);
    const base = this.spotOther + (dog ? 60 : 0);
    const marks = [base, base + 150, base - 150, base + 290].filter(x => x > this.spotCourier + 100 && x < 610);
    return marks.find(x => taken.every(t => Math.abs(t - x) > 110)) || base;
  }

  /* ================================================================ meters */
  buildMeters() {
    const dlg = this.content;
    this.moodKey = dlg.moodMeter || null;
    if (!this.moodKey) return;
    const who = dlg.cast[this.moodKey];
    // it appears when its person joins the scene (it used to show Priya's mood from the first line, before anyone
    // had mentioned her, while the neighbour actually being spoken to had none)
    const mp = this.moodPanel = this.add.container(190, 92).setDepth(820).setScrollFactor(0).setAlpha(0);
    mp.add(OTR.ui.panel(this, 0, 0, 320, 54, { top: OTR_DATA.theme.primaryNight, bottom: OTR_DATA.theme.nightPanel, border: OTR_DATA.theme.mid, borderWidth: 2, radius: 14, shadow: 0.3 }));
    // "Priya (on the phone)" → PRIYA'S MOOD
    mp.add(OTR.txt(this, -144, -12, `${who.name.replace(/\s*\(.*\)\s*$/, '').toUpperCase()}'S MOOD`, 11, OTR_DATA.theme.css('tint'), { ox: 0 }));
    this.moodBar = OTR.ui.bar(this, -144, 12, 250, 12, { color: (v) => OTR.color.lerp(0xF0435A, 0x2BC48A, v), bgAlpha: 0.4 });
    mp.add(this.moodBar);
    this.moodFace = OTR.txt(this, 130, 2, '', 24, '#ffffff');
    mp.add(this.moodFace);
    this.updateMood(who.moodStart || 0, false);
  }

  showMeter(key) {
    if (!this.moodPanel || key !== this.moodKey || this.moodPanel.alpha > 0) return;
    this.tweens.add({ targets: this.moodPanel, alpha: 1, duration: 260 });
  }

  updateMood(m, animate) {
    if (!this.moodBar) return;
    this.moodBar.setValue((m + 3) / 6, animate, 400);
    this.moodFace.setText(m <= -2 ? '😠' : m === -1 ? '😒' : m === 0 ? '😐' : m === 1 ? '🙂' : '😄');
  }

  /* ================================================================ run */
  run() {
    const dlg = this.content;
    const cast = {};
    Object.keys(dlg.cast || {}).forEach(k => {
      const c = dlg.cast[k];
      cast[k] = { name: c.name, color: c.color || OTR_DATA.theme.primary, rig: null, moodStart: c.moodStart || 0, dog: (c.portrait || {}).kind === 'dog' };
    });
    this.cast = cast;

    const s = this;
    this.ctl = OTR.talk.run(this, this.adapt(dlg), {
      cast,
      // a change of setting rebuilds the courier, so always hand the engine the rig that is on stage now
      // (it used to keep talking through, and pointing at, the destroyed one)
      courier: { get rig() { return s.me; }, name: OTR.save.data.profile ? OTR.save.displayName() : 'You' },
      log: this.log, cats: OTR.scoring.CATS, feedback: 'immediate',
      acts: this.acts(cast),
      depth: 3000, choiceX: 944, choiceWidth: 640, top: !!this.settingSpec(this.setting).top,
      onLine: (n) => { if (n.speaker) this.showMeter(n.speaker); },
      onEffects: (eff) => {
        if (eff.mood && this.moodKey) {
          const m = this.ctl ? this.ctl.moods[this.moodKey] : 0;
          this.updateMood(m, true);
        }
      },
      onEnd: (node) => this.endScenario(node)
    });
  }

  /** Adapt the stored dialogue format to the talk engine (show/hide/mood/setting become acts). */
  adapt(dlg) {
    const nodes = {};
    Object.keys(dlg.nodes).forEach(id => {
      const n = Object.assign({}, dlg.nodes[id]);
      const acts = [];
      if (n.setting) acts.push(['setting', n.setting]);
      if (n.show) acts.push(['show', n.show]);
      if (n.hide) acts.push(['hide', typeof n.hide === 'string' ? n.hide : true]);
      // staging written on a line: what the courier holds, someone walking to a spot, a prop appearing or going
      if (n.hold !== undefined) acts.push(['hold', n.hold]);
      if (n.walk) acts.push(['walk', n.walk]);
      if (n.prop) acts.push(['prop', n.prop]);
      if (n.unprop) acts.push(['unprop', n.unprop]);
      // a sequence of those, played in turn: stage: [{ walk }, { hold }, { prop }, { unprop }, { hazards }, { wait }]
      if (n.stage) acts.push(['script', n.stage]);
      if (n.mood && typeof n.mood === 'string') n.expr = n.mood;
      delete n.mood;
      if (acts.length) {
        // chain the acts through hidden nodes so each one can animate in turn
        let target = id;
        acts.forEach(([act, arg], i) => {
          const stepId = `${id}__act${i}`;
          nodes[stepId] = { act, arg, next: target, silent: true };
          target = stepId;
        });
        n.__entry = target;
      }
      nodes[id] = n;
    });
    // rewrite every `next` to point at the act chain entry (the act nodes themselves keep their links)
    const entry = (to) => (nodes[to] && nodes[to].__entry) || to;
    Object.keys(nodes).forEach(id => {
      const n = nodes[id];
      if (n.silent) return;
      if (n.next) n.next = entry(n.next);
      // a branch's targets too (its acts used to be skipped: "He's inside now" with the dog still on the lawn)
      if (n.then) n.then = entry(n.then);
      if (n.else) n.else = entry(n.else);
      if (n.choices) n.choices.forEach(c => { c.next = entry(c.next); });
      if (n.timeout) n.timeout.next = entry(n.timeout.next);
    });
    return { start: entry(dlg.start), nodes };
  }

  acts(cast) {
    const s = this;
    return {
      // arg: a setting name, or { name, number, mailbox } to move to another address in the same kind of place
      setting: (arg, done) => {
        const spec = typeof arg === 'string' ? { name: arg } : arg;
        s.cameras.main.fadeOut(240);
        s.time.delayedCall(260, () => {
          s.setting = spec.name;
          s.buildStage(spec.name, spec);
          s.me.x = s.spotCourier;
          if (s.ctl && s.ctl.setTop) s.ctl.setTop(!!s.settingSpec(spec.name).top);
          Object.keys(cast).forEach(k => { cast[k].rig = null; });
          s.cameras.main.fadeIn(280);
          s.time.delayedCall(320, done);
        });
      },
      // the courier holds something (a box, the package), or nothing (null)
      hold: (kind) => { if (s.me && s.me.c && s.me.c.active) s.me.hold(kind || null).play('idle'); },
      // { who: 'courier' | cast key, x, face } — walk someone to a spot on the stage
      walk: (arg, done) => {
        const rig = arg.who === 'courier' || !arg.who ? s.me : s.rigs[arg.who];
        if (!rig || !rig.c || !rig.c.active) { done(); return; }
        if (arg.who === 'courier' || !arg.who) s.me.setVisible(true);
        rig.walkTo(arg.x, () => { if (arg.face) rig.setFacing(arg.face); if (rig !== s.me) rig.mark = arg.x; done(); }, { speed: arg.speed || 170 });
      },
      // { id, type, x, art, depth } — a prop the narration talks about appears (the box behind the bin, a planter)
      prop: (arg) => {
        const img = s.stage.prop(arg.type, arg.x, { art: arg.art || {}, depth: arg.depth !== undefined ? arg.depth : 8, y: arg.y });
        img.setAlpha(0);
        s.tweens.add({ targets: img, alpha: 1, duration: 300 });
        s.props[arg.id || arg.type] = img;
      },
      script: (steps, done) => {
        const acts = s.acts(cast);
        const step = (i) => {
          const st = steps[i];
          if (!st) { done(); return; }
          const name = Object.keys(st)[0], arg = st[name];
          if (name === 'wait') { s.time.delayedCall(arg, () => step(i + 1)); return; }
          if (name === 'hazards') { if (s.van) s.van.hazards(!!arg); step(i + 1); return; }
          const fn = acts[name];
          if (!fn) { step(i + 1); return; }
          if (fn.length >= 2) fn(arg, () => step(i + 1)); else { fn(arg); step(i + 1); }
        };
        step(0);
      },
      unprop: (id) => {
        const img = s.props[id];
        if (img && img.active) s.tweens.add({ targets: img, alpha: 0, duration: 250, onComplete: () => img.destroy() });
        delete s.props[id];
      },
      show: (key, done) => {
        s.showMeter(key);
        const def = (s.content.cast || {})[key];
        if (def && def.remote) {
          // a phone or radio call, not a visitor: the courier takes it on the handheld and nobody walks on
          s.onCall = key;
          s.me.hold('phone').play('phone');
          OTR.audio.play('beep');
          s.time.delayedCall(350, done);
          return;
        }
        const rig = s.ensureRig(key);
        if (rig) cast[key].rig = rig;
        s.time.delayedCall(500, done);
      },
      hide: (key, done) => {
        if (s.onCall && (typeof key !== 'string' || key === s.onCall)) {
          s.endCall();
          s.time.delayedCall(250, done);
          return;
        }
        const k = typeof key === 'string' ? key : Object.keys(s.rigs)[0];
        const rig = s.rigs[k];
        if (!rig) { done(); return; }
        // someone behind a counter fades where they stand (walking off used to slide them along the bottom edge)
        if (s.behindCounter && !(s.content.cast[k] && s.content.cast[k].portrait && s.content.cast[k].portrait.kind === 'dog')) {
          s.tweens.add({ targets: rig.c, alpha: 0, duration: 280, onComplete: () => { rig.destroy(); delete s.rigs[k]; if (cast[k]) cast[k].rig = null; done(); } });
          return;
        }
        rig.walkTo(rig.x + 220, () => {
          s.tweens.add({ targets: rig.c, alpha: 0, duration: 250, onComplete: () => { rig.destroy(); delete s.rigs[k]; if (cast[k]) cast[k].rig = null; done(); } });
        }, { speed: 150 });
      }
    };
  }

  /** Hang up: the handheld goes away. */
  endCall() {
    this.onCall = null;
    if (this.me && this.me.c && this.me.c.active) this.me.hold(null).play('idle');
  }

  /* ================================================================ ending */
  endScenario(node) {
    if (this.finished) return;
    if (this.onCall) this.endCall();
    const outcome = node.outcome || 'mixed';
    const col = outcome === 'good' ? 0x2BC48A : outcome === 'mixed' ? 0xFFB020 : 0xF0435A;
    const stampText = outcome === 'good' ? 'RESOLVED' : outcome === 'mixed' ? 'PARTIAL' : 'INCIDENT';
    const dim = this.add.rectangle(OTR.W / 2, OTR.H / 2, OTR.W, OTR.H, 0x050D17, 0).setDepth(4000).setScrollFactor(0).setInteractive();
    this.tweens.add({ targets: dim, fillAlpha: 0.62, duration: 300 });
    const w = 760;
    // notes: [{ if, text }] — sentences added for the mistakes that were actually made, so an ending names those
    // and no others (a fixed list used to blame trainees for photographs they had taken)
    const flags = (this.ctl && this.ctl.flags) || {};
    const notes = (node.notes || []).filter(n => OTR.talk.test(n.if, flags)).map(n => n.text);
    const text = [node.text || ''].concat(notes).join(' ');
    const body = OTR.txt(this, 0, 0, text, notes.length > 2 ? 18 : 21, OTR_DATA.theme.css('inkSoft'), { bold: false, wrap: w - 90, lineSpacing: 5, align: 'center' });
    const h = body.height + 250;
    const c = this.add.container(OTR.W / 2, OTR.H / 2).setDepth(4001).setScrollFactor(0);
    c.add(OTR.ui.panel(this, 0, 0, w, h, { top: 0xFFFFFF, bottom: OTR_DATA.theme.paper, border: col, borderWidth: 5, radius: 24 }));
    c.add(OTR.txt(this, 0, -h / 2 + 50, 'OUTCOME', 15, OTR.color.css(col), { weight: '900' }));
    c.add(OTR.txt(this, 0, -h / 2 + 90, node.title || '', 34, OTR_DATA.theme.css('primaryDark'), { weight: '900', align: 'center', wrap: w - 60 }));
    body.setPosition(0, -h / 2 + 132).setOrigin(0.5, 0);
    c.add(body);
    const btn = OTR.ui.button(this, 0, h / 2 - 52, 'See Results ▶', () => this.complete(node), { w: 280, h: 56, skin: 'orange', key: ['ENTER', 'SPACE'] });
    c.add(btn);
    btn.setEnabled(false);
    this.time.delayedCall(800, () => btn.setEnabled(true));
    c.setScale(0.85).setAlpha(0);
    this.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 340, ease: 'Back.out', delay: 120 });
    this.time.delayedCall(560, () => {
      OTR.fx.stamp(this, OTR.W / 2 + w / 2 - 110, OTR.H / 2 - h / 2 + 40, stampText, col, { size: 30, keep: true, depth: 4002, angle: 12 });
      if (outcome === 'good') { OTR.fx.confetti(this, OTR.W / 2, OTR.H + 20, { count: 100, depth: 4003 }); OTR.audio.play('fanfare'); }
      else if (outcome === 'bad') OTR.audio.play('fail');
    });
  }

  complete(node) {
    const dlg = this.content;
    const ratios = this.log.ratios(this.cats);
    const bonus = node.outcome === 'good' ? 500 : node.outcome === 'mixed' ? 200 : 0;
    // the log ranks the mistakes; the scenario's key lessons follow them
    this.finish({ score: this.log.score() + bonus, ratios, log: this.log, lessons: dlg.keyLessons || [], stats: { outcome: node.outcome, log: this.log.toJSON() } }, 100);
  }

  update(time, delta) {
    if (this.stage) this.stage.update(delta);
  }
}
OTR.registerScene(DialogueScene);
