/* Opt-in first-person courier prototype. Placeholder geometry; no career progress writes. */
class FirstPersonScene extends Phaser.Scene {
  constructor() { super('FirstPersonScene'); }

  create() {
    this.view = null; this.message = ''; this.messageUntil = 0;
    const token = {}; this.loadingToken = token;
    this.events.once('shutdown', () => { this.loadingToken = null; });
    this.model = OTR.fp.create();
    this.held = Object.create(null); this.target = null; this.lastAim = 0;
    this.makeHud();
    this.loading = true;
    OTR.world3d.load().then(() => {
      if (!this.sys.isActive() || this.loadingToken !== token) return;
      this.view = OTR.world3d.create(this);
      this.buildWorld(); this.installInput(); this.loading = false;
      this.refresh(); this.syncWorld();
    }).catch(error => {
      if (!this.sys.isActive() || this.loadingToken !== token) return;
      if (this.view) this.view.dispose(); this.view = null;
      this.loading = false;
      this.title.setText('The first-person prototype could not start');
      this.objective.setText('WebGL is required. Reload to try again.');
      console.warn('first-person prototype', error);
    });
  }

  makeHud() {
    const g = this.add.graphics().setDepth(20);
    g.fillStyle(0x16062B, 0.88); g.fillRect(0, 0, OTR.W, 82);
    g.fillStyle(0x16062B, 0.88); g.fillRect(0, OTR.H - 90, OTR.W, 90);
    this.title = OTR.txt(this, 24, 24, 'FIRST-PERSON PROTOTYPE', 18, '#FFC83D', { ox:0, fit:600 }).setDepth(21);
    this.status = OTR.txt(this, OTR.W - 24, 24, '', 16, '#ffffff', { ox:1, fit:560 }).setDepth(21);
    this.objective = OTR.txt(this, OTR.W / 2, 56, 'Loading…', 18, '#ffffff', { fit:OTR.W - 48 }).setDepth(21);
    this.hint = OTR.txt(this, OTR.W / 2, OTR.H - 116, '', 18, '#ffffff', { stroke:'#16062B', strokeW:5, fit:OTR.W - 48 }).setDepth(21);
    this.controls = OTR.txt(this, OTR.W / 2, OTR.H - 61, '', 15, '#ffffff', { fit:OTR.W - 48 }).setDepth(21);
    this.help = OTR.txt(this, OTR.W / 2, OTR.H - 28, 'Click for mouse look · Esc pauses · Drag to look if mouse capture is unavailable', 14, '#C9B3F0', { fit:OTR.W - 48 }).setDepth(21);
    this.reticle = this.add.graphics().setDepth(21);
    this.reticle.lineStyle(2, 0xFFFFFF, 0.9);
    this.reticle.lineBetween(OTR.W / 2 - 7, OTR.H / 2, OTR.W / 2 + 7, OTR.H / 2);
    this.reticle.lineBetween(OTR.W / 2, OTR.H / 2 - 7, OTR.W / 2, OTR.H / 2 + 7);
    this.pauseShade = this.add.rectangle(OTR.W / 2, OTR.H / 2, OTR.W, OTR.H - 172, 0x16062B, 0.72).setDepth(30);
    this.pauseTitle = OTR.txt(this, OTR.W / 2, 250, 'Click to start', 34, '#ffffff', { fit:OTR.W - 100 }).setDepth(31);
    this.pauseHelp = OTR.txt(this, OTR.W / 2, 356, 'Walk around the depot, scan and load the package, then deliver it to the house.', 21, '#ffffff', { wrap:850, align:'center' }).setDepth(31);
    this.inspectShade = this.add.rectangle(990, 347, 510, 380, 0x16062B, 0.94).setDepth(22).setVisible(false);
    this.inspectLabel = OTR.txt(this, 990, 240, '214 Maple Ave', 28, '#ffffff', { fit:450 }).setDepth(23).setVisible(false);
    this.inspectText = OTR.txt(this, 990, 355, 'Check the label before loading.\nE scan · A/D rotate · F return', 20, '#ffffff', { wrap:440, align:'center' }).setDepth(23).setVisible(false);
    this.ui = {};
  }

  buildWorld() {
    const T = THREE, { world, camera } = this.view;
    const geometry = new T.BoxGeometry(1, 1, 1), materials = new Map();
    this.occluders = []; this.interactions = [];
    const box = (parent, x, y, z, w, h, d, color, options) => {
      options = options || {};
      if (!materials.has(color)) materials.set(color, new T.MeshLambertMaterial({ color }));
      const mesh = new T.Mesh(geometry, materials.get(color));
      mesh.position.set(x, y, z); mesh.scale.set(w, h, d); parent.add(mesh);
      mesh.updateMatrix(); mesh.matrixAutoUpdate = false;
      if (options.solid) this.occluders.push(mesh);
      if (options.id) { mesh.userData.interaction = options.id; this.interactions.push(mesh); }
      return mesh;
    };
    this.box = box;
    box(world, 0, -0.08, -18, 28, 0.16, 60, 0x719267);
    box(world, 0, -0.01, -18, 8, 0.04, 60, 0x484D57);
    box(world, -7, 0, 3, 10, 0.06, 14, 0xB6B7BA);
    box(world, 4.5, 0, -35, 3, 0.06, 9, 0xC9C4B8);
    for (let z = -43; z < 10; z += 5) box(world, 0, 0.025, z, 0.08, 0.015, 2.3, 0xF1CA57);
    [-4, 4].forEach(x => box(world, x, 0.03, -18, 0.08, 0.025, 60, 0xECEBE5));
    this.model.solids.forEach((s, i) => box(world, s.x, s.h / 2, s.z, s.w, s.h, s.d,
      i === 5 ? 0x8D7461 : i === 6 ? 0xD8CBB9 : 0xCAD4DE, {solid:true}));
    // Package label is blank geometry with a barcode. All readable words use Phaser Text.
    const parcel = () => {
      const root = new T.Group();
      box(root, 0, 0, 0, 0.65, 0.45, 0.45, 0xBC8E57);
      box(root, 0, 0.23, 0, 0.11, 0.014, 0.47, 0xDFC59A);
      box(root, 0, 0, 0.228, 0.33, 0.2, 0.012, 0xF5F3EC);
      for (let i = 0; i < 9; i++) box(root, -0.12 + i * 0.03, 0, 0.237, i % 3 === 0 ? 0.014 : 0.006, 0.11, 0.005, 0x272D36);
      return root;
    };
    this.parcel = parcel(); world.add(this.parcel);
    this.parcel.position.set(-8, 1.15, 0);
    this.parcel.children.forEach(o => { o.userData.interaction = 'package'; this.interactions.push(o); });
    this.carried = parcel(); camera.add(this.carried); this.carried.position.set(0.38, -0.5, -0.82); this.carried.scale.setScalar(0.72);
    this.inspected = parcel(); camera.add(this.inspected); this.inspected.position.set(-0.52, -0.05, -1.35);
    this.vanMesh = new T.Group(); world.add(this.vanMesh);
    box(this.vanMesh, 0, 1.25, 0.6, 2.05, 2.3, 3.7, 0xEEEAE3, {solid:true});
    box(this.vanMesh, 0, 0.58, -1.7, 2.05, 1, 1.65, 0xEEEAE3, {solid:true});
    box(this.vanMesh, 0, 0.23, 0, 2.08, 0.2, 5.3, 0x343941);
    [-1.04, 1.04].forEach(x => [-1.7, 1.65].forEach(z => box(this.vanMesh, x, 0.35, z, 0.22, 0.65, 0.65, 0x252930)));
    this.driverDoor = box(this.vanMesh, -1.045, 1.35, -1.7, 0.04, 0.75, 1.2, 0x42556D, {id:'driver'});
    this.cargoDoor = box(this.vanMesh, 0, 1.25, 2.47, 1.65, 1.7, 0.06, 0x5D4A7C, {id:'cargo'});
    box(this.vanMesh, 0, 1.4, -0.9, 1.95, 0.17, 0.13, 0x5D4A7C);
    this.cabDash = new T.Group(); camera.add(this.cabDash);
    box(this.cabDash, 0, -0.69, -1.05, 2.3, 0.32, 0.45, 0x323341);
    // A simple steering wheel stays out of the centre of the windscreen.
    const wheel = new T.Mesh(new T.TorusGeometry(0.17, 0.025, 6, 20), new T.MeshLambertMaterial({color:0x191C25}));
    wheel.position.set(-0.3, -0.5, -0.72); this.cabDash.add(wheel); this.wheel = wheel;
    this.customer = box(world, 5.94, 1.35, -35, 0.08, 2.25, 1.2, 0x704D78, {id:'customer'});
    [-38.2, -31.8].forEach(z => box(world, 5.97, 2.35, z, 0.04, 0.9, 1.4, 0x506F86));
    const bay = (x,z,w,d) => box(world,x,0.04,z,w,0.025,d,0xFFAA45);
    bay(1.8,-35,0.08,6.2); bay(4.4,-35,0.08,6.2); bay(3.1,-38.1,2.6,0.08); bay(3.1,-31.9,2.6,0.08);
    if (OTR.gfx.high()) {
      // Decorative meshes are absent on low; no shadows or post-processing in either setting.
      [-6,-9].forEach(x => box(world,x,0.17,7.4,1.5,0.34,1.2,0x9B825F));
      [-42,-27].forEach(z => {
        box(world,10,1.1,z,0.35,2.2,0.35,0x7E6350);
        box(world,10,3,z,2.8,2.4,2.8,0x628759);
      });
    }
    this.ray = new T.Raycaster(); this.ray.far = 3;
  }

  installInput() {
    const canvas = this.sys.game.canvas, handlers = [];
    const sensitivity = OTR.fp.clamp(Number(new URLSearchParams(location.search).get('sensitivity')) || 0.002, 0.0005, 0.006);
    const listen = (object, name, fn) => { object.addEventListener(name, fn); handlers.push(() => object.removeEventListener(name, fn)); };
    this.lockMouse = () => {
      if (!canvas.requestPointerLock || document.pointerLockElement === canvas) return;
      try { const pending = canvas.requestPointerLock(); if (pending && pending.catch) pending.catch(() => {}); } catch (_) { /* Drag look remains available. */ }
    };
    this.pause = () => { this.held = Object.create(null); this.model.paused = true; this.target = null; this.refresh(); };
    listen(canvas, 'pointerdown', e => {
      if (e.button !== 0 || this.loading) return;
      this.model.paused = false; this.lockMouse(); this.refresh();
    });
    listen(window, 'mousemove', e => {
      if (this.model.paused || this.model.mode === 'inspect') return;
      if (document.pointerLockElement !== canvas && !(e.buttons & 1 && e.target === canvas)) return;
      const m = this.model;
      if (m.mode === 'cab') m.van.look = OTR.fp.clamp(m.van.look + e.movementX * sensitivity, -1.25, 1.25);
      else m.player.yaw += e.movementX * sensitivity;
      m.player.pitch = OTR.fp.clamp(m.player.pitch + e.movementY * sensitivity, -1.1, 1.1);
    });
    const codes = new Set(['KeyW','KeyS','KeyA','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyE','KeyF','KeyR','KeyB','KeyN','Space','Escape','Enter']);
    listen(window, 'keydown', e => {
      if (!codes.has(e.code) || e.ctrlKey || e.metaKey || e.altKey) return;
      e.preventDefault();
      const first = !this.held[e.code]; this.held[e.code] = true;
      if (!first || e.repeat) return;
      if (e.code === 'Escape') {
        if (this.model.mode === 'inspect') this.model.mode = 'walk';
        this.pause(); if (document.pointerLockElement === canvas) document.exitPointerLock(); return;
      }
      if (e.code === 'Enter' && this.model.paused) { this.model.paused = false; this.lockMouse(); this.refresh(); return; }
      if (this.model.paused) return;
      const m = this.model;
      if (e.code === 'KeyN') { this.scene.restart(); return; }
      if (e.code === 'KeyE') {
        this.syncWorld(); this.aim();
        if (!m.use(this.target)) this.message = m.mode === 'cab' ? 'Stop and set the parking brake before exiting' : m.mode === 'inspect' ? 'Rotate the package so the label faces you' : '';
        else this.message = '';
        this.messageUntil = this.time.now + 2400;
      }
      if (e.code === 'KeyF') { if (m.mode === 'inspect') m.mode = 'walk'; else m.inspect(this.target); }
      if (m.mode === 'cab') {
        if (e.code === 'Space') m.van.hand = !m.van.hand;
        if (e.code === 'KeyB') m.van.belt = !m.van.belt;
        if (e.code === 'KeyR') {
          if (!m.shiftGear()) { this.message = 'Stop before changing gear'; this.messageUntil = this.time.now + 2400; }
        }
      }
      this.syncWorld(); this.refresh();
    });
    listen(window, 'keyup', e => { delete this.held[e.code]; });
    listen(window, 'blur', this.pause);
    listen(document, 'visibilitychange', () => { if (document.hidden) this.pause(); });
    listen(document, 'pointerlockchange', () => { if (document.pointerLockElement !== canvas) this.pause(); });
    this.events.once('shutdown', () => {
      handlers.forEach(remove => remove()); this.held = Object.create(null);
      if (document.pointerLockElement === canvas) document.exitPointerLock();
    });
  }

  aim() {
    this.target = null;
    if (this.model.mode !== 'walk' || this.model.paused) return;
    this.view.world.updateMatrixWorld(true);
    this.target = OTR.world3d.pick(this.view.camera, this.occluders, this.interactions, this.ray);
  }

  syncWorld() {
    if (!this.view) return;
    const m = this.model, p = m.player, v = m.van, camera = this.view.camera;
    this.vanMesh.position.set(v.x,0,v.z); this.vanMesh.rotation.y = -v.yaw;
    this.parcel.visible = m.package === 'table' && m.mode !== 'inspect';
    this.carried.visible = m.package === 'held' && m.mode === 'walk';
    this.inspected.visible = m.mode === 'inspect'; this.inspected.rotation.y = m.inspectYaw || 0;
    this.cabDash.visible = m.mode === 'cab'; this.wheel.rotation.z = -v.steer * 3;
    // Hide the external door/cargo hull in the cab; it would obstruct the driver's eye.
    this.vanMesh.visible = m.mode !== 'cab';
    if (m.mode === 'cab') {
      const eye = OTR.fp.local(v,-0.45,-1.8); camera.position.set(eye.x,1.85,eye.z);
      camera.rotation.set(-p.pitch,-v.yaw-v.look,0,'YXZ');
    } else {
      camera.position.set(p.x,1.65,p.z); camera.rotation.set(-p.pitch,-p.yaw,0,'YXZ');
    }
    this.view.world.updateMatrixWorld(true);
  }

  refresh() {
    if (!this.model) return;
    const m = this.model, mode = m.mode;
    const update = (key, text) => {
      if (this.ui[key] === text) return;
      this.ui[key] = text; const object = this[key]; object.setText(text);
      object.setScale(1); const room = key === 'status' ? 560 : OTR.W - 48;
      if (object.width > room) object.setScale(room / object.width);
    };
    update('objective', m.objective());
    update('controls', mode === 'cab' ? 'W accelerate · S brake · A/D steer · Space parking brake · R gear · B belt · E exit' : mode === 'inspect' ? 'A/D rotate · E scan · F return' : 'WASD or arrows walk · E interact · F inspect carried package · N restart');
    update('status', mode === 'cab' ? Math.round(Math.abs(m.van.speed) * 2.23694) + ' mph  ·  ' + (m.van.gear > 0 ? 'D' : 'R') + '  ·  ' + (m.van.hand ? 'Parking brake on' : 'Parking brake off') + '  ·  ' + (m.van.belt ? 'Belt on' : 'Belt off') : m.package === 'held' ? 'Carrying package' : '');
    let hint = '';
    if (mode === 'cab') hint = m.van.hand ? 'Release the parking brake with Space before moving' : 'Follow the road to the orange bay beside the house';
    else if (mode === 'inspect') hint = m.scanned ? 'Package scanned — F to return' : 'Turn the label towards you, then press E to scan';
    else if (this.target === 'package') hint = m.scanned ? 'E pick up package · F inspect' : 'E inspect package';
    else if (this.target === 'driver') hint = m.package === 'held' ? 'Load the package before entering the cab' : 'E enter van';
    else if (this.target === 'cargo') hint = m.package === 'held' ? 'E load package' : m.package === 'loaded' ? 'E retrieve package' : '';
    else if (this.target === 'customer') hint = m.package === 'held' && m.parkedAtDelivery() ? 'E deliver package' : 'Delivery destination';
    if (this.message && this.time.now < this.messageUntil) hint = this.message;
    update('hint', m.paused ? '' : hint);
    const paused = m.paused;
    this.pauseShade.setVisible(paused); this.pauseTitle.setVisible(paused); this.pauseHelp.setVisible(paused);
    this.reticle.setVisible(!paused && mode === 'walk');
    [this.inspectShade,this.inspectLabel,this.inspectText].forEach(o => o.setVisible(!paused && mode === 'inspect'));
  }

  update(time, delta) {
    if (this.loading || !this.view) return;
    const h = this.held;
    this.model.step({forward:!!(h.KeyW||h.ArrowUp),back:!!(h.KeyS||h.ArrowDown),left:!!(h.KeyA||h.ArrowLeft),right:!!(h.KeyD||h.ArrowRight)},delta/1000);
    this.syncWorld();
    if (time - this.lastAim > 80) { this.aim(); this.lastAim = time; }
    this.refresh();
  }
}
OTR.registerScene(FirstPersonScene);
