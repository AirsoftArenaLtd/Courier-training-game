/* Dev-only lab: index.html?lab=rig | street | town | firstperson. Not reachable from the menus. */
class LabScene extends Phaser.Scene {
  constructor() { super('LabScene'); }

  init(data) { this.which = data.which || 'rig'; }

  create() {
    const fn = this['lab_' + this.which];
    if (this.which === 'rig') this.add.rectangle(OTR.W / 2, OTR.H / 2, OTR.W, OTR.H, 0xDCEBF5);
    OTR.txt(this, 20, 20, 'LAB: ' + this.which, 18, OTR_DATA.theme.css('primaryDark'), { ox: 0, oy: 0 }).setScrollFactor(0).setDepth(2000);
    if (fn) fn.call(this);
  }

  lab_town() {
    const q = new URLSearchParams(window.location.search);
    this.scene.start('TownDriveScene', { lab: true, seed: 1, tod: q.get('tod') || 'midday', weather: q.get('weather') || 'clear' });
  }

  lab_firstperson() {
    this.scene.start('FirstPersonScene');
  }

  lab_street() {
    const q = new URLSearchParams(window.location.search);
    const tod = q.get('tod') || 'morning', weather = q.get('weather') || 'clear';
    const st = new OTR.Stage(this, { width: 2600, tod, weather });
    this.stage = st;
    st.sky(); st.far(240);
    st.ground([{ x0: 0, x1: 820, type: 'road' }, { x0: 820, x1: 840, type: 'curb' }, { x0: 840, x1: 1000, type: 'sidewalk' }, { x0: 1000, x1: 2600, type: 'path' }]);
    const van = st.van(120, { open: true });
    van.hazards(true);
    const house = st.house(1150, { number: '214', steps: 3, wall: 0xDCE6EE, roof: 0x3E4A5C, door: 0xB8324A, shutters: 0x2F4F6F, snow: weather === 'snow', lit: tod === 'night' || tod === 'evening' });
    st.prop('mailbox', 930, { art: { number: '214' } });
    st.prop('streetsign', 880, { art: { text: 'BIRCH LN' } });
    st.prop('tree', 2350, { depth: -9 });
    st.prop('hose', 1260, { depth: 6 });
    st.prop('sign', 1080, { art: { text: 'BEWARE\nOF DOG' } });
    st.prop('planter', house.porchX1 - 60, { y: house.floorY, depth: 6 });
    const me = st.player(OTR.rig.person(this, 520, 0, OTR.hub.playerSpec, { scale: 0.82 }));
    me.hold('box');
    st.actor(OTR.rig.dog(this, 1900, 0, { fur: 0x3A3030, patch: 0xE8D8C0, collar: 0xE8304A }, { scale: 0.75, mood: 'alert', facing: -1 }));
    const res = st.actor(OTR.rig.person(this, house.doorX + 10, 0, { skin: 0xF1C7A5, hair: 0x8A4B2A, hairStyle: 'long', shirt: 0x2F8F83 }, { scale: 0.8, facing: -1 }), { depth: 25 });
    res.play('talk'); res.talk(true);
    house.setDoor(true);
    st.interact({ x: house.doorX - 70, y: house.floorY - 250, label: 'Knock', onUse: () => me.play('knock') });
    this.atm = OTR.atmos.apply(this, { tod, weather });
    const walkTo = q.get('x');
    if (walkTo) { me.x = Number(walkTo); }
    OTR.labStage = st;
  }

  update(time, delta) {
    if (this.stage) this.stage.update(delta);
  }

  lab_rig() {
    const g = this.add.graphics();
    g.fillStyle(0x8FBF6A, 1); g.fillRect(0, 600, OTR.W, 120);
    const courier = OTR.rig.person(this, 160, 600, OTR.hub.playerSpec, { scale: 0.9 });
    courier.hold('box');
    this.courier = courier;
    const walk = () => courier.walkTo(courier.x < 400 ? 620 : 160, () => this.time.delayedCall(400, walk));
    walk();

    const specs = [
      { skin: 0xF1C7A5, hair: 0x8A4B2A, hairStyle: 'long', shirt: 0x2F8F83, earrings: 0xFFC83D },
      { skin: 0x8D5A3B, hair: 0x1E1410, hairStyle: 'curly', shirt: 0xC8243B, glasses: true, pants: 0x2B3550 },
      { skin: 0xE0B08A, hair: 0x9A9AA0, hairStyle: 'bald', shirt: 0x6B7B8C, mustache: true, collar: true, tie: 0x2A3F7A, sleeves: 'long' },
      { skin: 0xC98E6B, hair: 0x2E2018, hairStyle: 'ponytail', shirt: 0xFFC83D, shorts: true, vest: true }
    ];
    const anims = ['talk', 'wave', 'handsHips', 'phone'];
    specs.forEach((sp, i) => {
      const r = OTR.rig.person(this, 760 + i * 120, 600, sp, { scale: 0.62, facing: -1 });
      r.play(anims[i]);
      r.setExpression(['happy', 'angry', 'worried', 'neutral'][i]);
      if (i === 0) r.talk(true);
    });
    const dogs = [['friendly', 0xC98B4F], ['aggressive', 0x3A3030], ['fearful', 0xE8D8C0]];
    dogs.forEach(([m, fur], i) => {
      OTR.rig.dog(this, 820 + i * 170, 460, { fur, patch: 0xF3E3CC, collar: 0x3DA5FF }, { scale: 0.8, mood: m, facing: -1 });
    });
    const once = ['lift', 'slip', 'badLift', 'stepDown'];
    let oi = 0;
    const lifter = OTR.rig.person(this, 460, 420, OTR.hub.playerSpec, { scale: 0.6 });
    const loop = () => {
      const n = once[oi++ % once.length];
      lifter.hold(n === 'lift' ? 'box' : null);
      lifter.playOnce(n, () => this.time.delayedCall(700, loop));
    };
    loop();
  }
}
OTR.registerScene(LabScene);
