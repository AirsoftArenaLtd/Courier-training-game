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
      porch_dog: { kind: 'house', tod: 'afternoon', weather: 'clear', ground: 'path', fence: true },
      street: { kind: 'street', tod: 'afternoon', weather: 'clear', ground: 'path' },
      storm: { kind: 'street', tod: 'evening', weather: 'storm', ground: 'path' },
      office: { kind: 'interior', tod: 'midday', weather: 'clear', sign: 'BRIGHTLINE', accent: 0x3DA5FF },
      depot: { kind: 'interior', tod: 'morning', weather: 'clear', sign: 'DISPATCH', accent: 0x4D148C, counter: true },
      warehouse: { kind: 'interior', tod: 'morning', weather: 'clear', sign: 'STATION', accent: 0xFF6600, counter: true },
      lot: { kind: 'street', tod: 'evening', weather: 'clear', ground: 'concrete' }
    };
    return map[name] || map.street;
  }

  /** where: optional { number, mailbox } — the address on the house and the name on its mailbox for this setting */
  buildStage(name, where) {
    if (this.stage) this.clearStage();
    this.onCall = null;                              // the courier is rebuilt below, empty-handed
    const S = this.settingSpec(name);
    const dlg = this.content;
    const number = (where && where.number) || dlg.houseNumber || '214';
    const mailboxName = (where && where.mailbox) || dlg.mailboxName || null;
    const st = this.stage = new OTR.Stage(this, { width: OTR.W, tod: S.tod, weather: S.weather, clickToWalk: false });
    st.sky();
    st.far(236);
    this.stageObjs = [];

    if (S.kind === 'interior') {
      const I = st.interior(-420, { kind: S.counter ? 'counter' : 'lobby', sign: S.sign, accent: S.accent, w: 1600, counterX: 980 });
      st.ground([{ x0: 0, x1: OTR.W, type: 'tile' }]);
      this.spotCourier = 250;
      this.spotOther = I.counterX + 50;
      this.otherY = OTR.H - 6;
    } else if (S.kind === 'house') {
      st.ground([{ x0: 0, x1: OTR.W, type: 'path' }]);
      const spec = Object.assign({ number, steps: 3, porchW: 430, porchX: 300, w: 1000 }, dlg.house || {});
      const house = st.house(-110, spec);
      this.house = house;
      if (S.fence) {
        // front-yard fence in the foreground, so it frames the scene instead of hiding the characters
        st.prop('fence', 0, { art: { w: 1280, color: 0xFFFFFF }, ox: 0, depth: 70, y: OTR.H + 42 });
        st.prop('sign', 1090, { art: { text: 'BEWARE\nOF DOG' }, depth: 9 });
      }
      st.prop('mailbox', 980, { art: { number: spec.number, name: mailboxName } });
      st.prop('tree', 1180, { depth: -9 });
      this.spotCourier = house.doorX - 210;
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

    this.me = OTR.rig.person(this, this.spotCourier, 0, OTR.hub.playerSpec, { scale: 0.82, facing: 1, depth: 30 });
    st.actor(this.me);
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

  ensureRig(key) {
    if (this.rigs[key]) return this.rigs[key];
    const c = (this.content.cast || {})[key];
    if (!c) return null;
    const p = c.portrait || {};
    let rig;
    if (p.kind === 'dog') {
      rig = OTR.rig.dog(this, this.spotOther + 80, 0, { fur: p.fur, patch: p.patch, collar: p.collar }, { scale: 0.72, facing: -1, mood: 'alert', depth: 24 });
    } else {
      rig = OTR.rig.person(this, this.spotOther + 120, 0, p, { scale: 0.8, facing: -1, depth: 25 });
      rig.y = this.otherY;
    }
    this.stage.actor(rig, { depth: p.kind === 'dog' ? 24 : 25, followGround: p.kind === 'dog' });
    if (p.kind !== 'dog') {
      const a = this.stage.actors.find(x => x.rig === rig);
      if (a) a.followGround = false;
      rig.y = this.otherY;
    }
    rig.setAlpha(0);
    this.tweens.add({ targets: rig.c, alpha: 1, duration: 280 });
    rig.walkTo(this.spotOther, () => rig.setFacing(-1));
    this.rigs[key] = rig;
    return rig;
  }

  /* ================================================================ meters */
  buildMeters() {
    const dlg = this.content;
    this.moodKey = dlg.moodMeter || null;
    if (!this.moodKey) return;
    const who = dlg.cast[this.moodKey];
    const mp = this.add.container(190, 92).setDepth(820).setScrollFactor(0);
    mp.add(OTR.ui.panel(this, 0, 0, 320, 54, { top: 0x2A0F4F, bottom: 0x1A0733, border: 0x6A45A0, borderWidth: 2, radius: 14, shadow: 0.3 }));
    // "Priya (on the phone)" → PRIYA'S MOOD
    mp.add(OTR.txt(this, -144, -12, `${who.name.replace(/\s*\(.*\)\s*$/, '').toUpperCase()}'S MOOD`, 11, '#C9B3F0', { ox: 0 }));
    this.moodBar = OTR.ui.bar(this, -144, 12, 250, 12, { color: (v) => OTR.color.lerp(0xF0435A, 0x2BC48A, v), bgAlpha: 0.4 });
    mp.add(this.moodBar);
    this.moodFace = OTR.txt(this, 130, 2, '', 24, '#ffffff');
    mp.add(this.moodFace);
    this.updateMood(who.moodStart || 0, false);
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
      cast[k] = { name: c.name, color: c.color || 0x4D148C, rig: null, moodStart: c.moodStart || 0, dog: (c.portrait || {}).kind === 'dog' };
    });
    this.cast = cast;

    const s = this;
    this.ctl = OTR.talk.run(this, this.adapt(dlg), {
      cast,
      // a change of setting rebuilds the courier, so always hand the engine the rig that is on stage now
      // (it used to keep talking through, and pointing at, the destroyed one)
      courier: { get rig() { return s.me; }, name: OTR.save.data.profile ? OTR.save.data.profile.name : 'You' },
      log: this.log, cats: OTR.scoring.CATS, feedback: 'immediate',
      acts: this.acts(cast),
      depth: 3000, choiceX: 944, choiceWidth: 640,
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
      if (n.hide) acts.push(['hide', n.show || true]);
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
          Object.keys(cast).forEach(k => { cast[k].rig = null; });
          s.cameras.main.fadeIn(280);
          s.time.delayedCall(320, done);
        });
      },
      show: (key, done) => {
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
    const dim = this.add.rectangle(OTR.W / 2, OTR.H / 2, OTR.W, OTR.H, 0x0B0418, 0).setDepth(4000).setScrollFactor(0).setInteractive();
    this.tweens.add({ targets: dim, fillAlpha: 0.62, duration: 300 });
    const w = 760;
    const body = OTR.txt(this, 0, 0, node.text || '', 21, '#3A2A50', { bold: false, wrap: w - 90, lineSpacing: 5, align: 'center' });
    const h = body.height + 250;
    const c = this.add.container(OTR.W / 2, OTR.H / 2).setDepth(4001).setScrollFactor(0);
    c.add(OTR.ui.panel(this, 0, 0, w, h, { top: 0xFFFFFF, bottom: 0xF1EAFB, border: col, borderWidth: 5, radius: 24 }));
    c.add(OTR.txt(this, 0, -h / 2 + 50, 'OUTCOME', 15, OTR.color.css(col), { weight: '900' }));
    c.add(OTR.txt(this, 0, -h / 2 + 90, node.title || '', 34, '#250849', { weight: '900', align: 'center', wrap: w - 60 }));
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
