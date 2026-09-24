/*
 * Side-view walkable stage: layered backdrop, ground height profile (steps, porches, floors),
 * actors that follow the ground, a player controller, camera follow and "press E" interactables.
 *
 *   const st = new OTR.Stage(scene, { width: 2600, tod: 'morning', weather: 'clear' });
 *   st.sky(); st.far(); st.ground([...]);
 *   const house = st.house(1000, { number: '214', steps: 3 });
 *   const me = st.player(OTR.rig.person(scene, 300, 0, spec, { scale: 0.8 }));
 *   st.interact({ x: house.doorX, label: 'Knock', onUse: () => ... });
 *   // in scene.update: st.update(delta)
 *
 * Depths: sky -100 · far -90 · ground -20 · facades -10 · doors -8 · props 5 · actors 20-40 · front layers 60 · prompts 900
 */
window.OTR = window.OTR || {};

OTR.Stage = class {
  constructor(scene, o) {
    o = o || {};
    this.scene = scene;
    this.width = o.width || 2600;
    this.tod = o.tod || 'midday';
    this.weather = o.weather || 'clear';
    this.G = OTR.scenery.GROUND;
    this.surfaces = [];
    this.actors = [];
    this.inter = [];
    this.zones = [];
    this.barriers = [];
    this.me = null;
    this.locked = 0;
    this.prompt = null;
    this.promptFor = null;
    this.cam = scene.cameras.main;
    this.region = { x0: 0, x1: this.width };
    this.cam.setBounds(0, 0, this.width, OTR.H);
    this.keys = scene.input.keyboard.addKeys({ left: 'LEFT', right: 'RIGHT', a: 'A', d: 'D', shift: 'SHIFT', e: 'E' });
    OTR.onKey(scene, 'keydown-E', () => this.useNearest());
    this.clickToWalk = o.clickToWalk !== false;
    scene.input.on('pointerdown', (p, over) => {
      if (!this.me || this.locked > 0 || !this.clickToWalk || (over && over.length) || scene._openModals > 0) return;
      if (p.y < 70 || p.y > OTR.H - 10) return;
      this.walkPlayerTo(p.worldX);
    });
  }

  /* ------------------------------------------------------------ backdrop */
  sky() {
    return this.scene.add.image(OTR.W / 2, OTR.H / 2, OTR.scenery.sky(this.scene, this.tod, this.weather)).setScrollFactor(0).setDepth(-100);
  }

  far(y, factor) {
    const t = this.scene.add.tileSprite(0, y || 250, OTR.W, 420, OTR.scenery.far(this.scene, this.tod, this.weather, 1)).setOrigin(0, 0).setScrollFactor(0).setDepth(-90);
    this.farLayer = { t, factor: factor === undefined ? 0.25 : factor };
    return t;
  }

  /**
   * sky() and far() as one picture, for a stage whose camera scrolls: the hills tiled over a sky as wide as the
   * hills' parallax needs, scrolling at the hills' factor (the sky drifts with them). One full-screen layer instead
   * of two.
   */
  skyline(y, factor) {
    const s = this.scene;
    y = y || 250;
    factor = factor === undefined ? 0.25 : factor;
    const w = Math.ceil(OTR.W + Math.max(0, this.width - OTR.W) * factor);
    const skyKey = OTR.scenery.sky(s, this.tod, this.weather, w);
    const farKey = OTR.scenery.far(s, this.tod, this.weather, 1);
    const key = OTR.tex.make(s, `skyline_${skyKey}_${farKey}_${y}`, w, OTR.H, (ctx) => {
      ctx.drawImage(s.textures.get(skyKey).getSourceImage(), 0, 0);
      const far = s.textures.get(farKey).getSourceImage();
      for (let x = 0; x < w; x += far.width) ctx.drawImage(far, x, y);
    });
    return s.add.image(0, 0, key).setOrigin(0, 0).setScrollFactor(factor, 0).setDepth(-100);
  }

  ground(segments, key) {
    const k = OTR.scenery.ground(this.scene, key || `gnd_${OTR.rig.hash([segments, this.weather, this.width])}`, this.width, segments, { weather: this.weather });
    return this.scene.add.image(0, this.G - 60, k).setOrigin(0, 0).setDepth(-20);
  }

  /**
   * For a stage whose camera never moves (a conversation): draw the bottom layers into one picture and hide them.
   * Sky, hills, ground and walls are each a near-full-screen layer, and every layer costs 1-2 ms a frame on
   * integrated graphics. It takes the layers from the bottom up and stops at the first one that can change (a door,
   * the van, anything tweened, blended or clickable), so nothing above that is drawn out of order.
   */
  bakeBackdrop() {
    const s = this.scene;
    const live = new Set([].concat(...(this.liveParts || [])));
    const list = s.children.list.slice().sort((a, b) => a.depth - b.depth);
    const baked = [];
    for (const o of list) {
      if (!o.visible) continue;
      const still = (o.type === 'Image' || o.type === 'TileSprite') && !live.has(o) && !o.input && o.alpha === 1 &&
        o.blendMode === Phaser.BlendModes.NORMAL && !s.tweens.isTweening(o);
      if (!still) break;
      baked.push(o);
    }
    if (baked.length < 2) return null;
    const rt = s.add.renderTexture(0, 0, OTR.W, OTR.H).setOrigin(0, 0).setScrollFactor(0).setDepth(baked[0].depth);
    rt.draw(baked);
    baked.forEach(o => o.setVisible(false));
    return rt;
  }

  /* ------------------------------------------------------------ walkable surfaces */
  /** A raised flat surface between x0..x1 at world y. priority: higher wins where surfaces overlap. */
  surface(x0, x1, y, o) {
    o = o || {};
    const s = { x0, x1, y, kind: o.kind || 'floor', priority: o.priority || 1, id: o.id };
    this.surfaces.push(s);
    return s;
  }

  stairs(x0, stepW, stepH, count, baseY) {
    for (let k = 0; k < count; k++) {
      this.surface(x0 + k * stepW, x0 + (k + 1) * stepW, baseY - (k + 1) * stepH, { kind: 'step', priority: 2 + k });
    }
  }

  groundAt(x) {
    let best = null;
    this.surfaces.forEach(s => { if (x >= s.x0 && x < s.x1 && (!best || s.priority > best.priority)) best = s; });
    return best ? best.y : this.G;
  }

  surfaceAt(x) {
    let best = null;
    this.surfaces.forEach(s => { if (x >= s.x0 && x < s.x1 && (!best || s.priority > best.priority)) best = s; });
    return best;
  }

  /* ------------------------------------------------------------ structures */
  house(x, spec) {
    const s = this.scene, H = OTR.scenery.house(s, spec), L = H.layout;
    const top = this.G - L.h;
    const img = s.add.image(x, top, H.key).setOrigin(0, 0).setDepth(-10);
    const door = s.add.image(x + L.doorX, top + L.doorTop, H.doorKey).setOrigin(0.5, 0).setDepth(-8);
    const front = s.add.image(x, top, H.frontKey).setOrigin(0, 0).setDepth(60);
    this.stairs(x + L.stepsX0, OTR.scenery.STEP_W, OTR.scenery.STEP_H, L.s.steps, this.G);
    this.surface(x + L.porchX0, x + L.porchX1, top + L.floorY, { kind: 'porch', priority: 20 });
    return this.wrapStructure(x, top, L, { img, door, front, doorKey: H.doorKey, doorOpenKey: H.doorOpenKey });
  }

  building(x, spec) {
    const s = this.scene, B = OTR.scenery.building(s, spec), L = B.layout;
    const top = this.G - L.h;
    const img = s.add.image(x, top, B.key).setOrigin(0, 0).setDepth(-10);
    const door = s.add.image(x + L.doorX, top + L.doorTop, B.doorKey).setOrigin(0.5, 0).setDepth(-8);
    const front = s.add.image(x, top, B.frontKey).setOrigin(0, 0).setDepth(60);
    this.stairs(x + L.stepsX0, OTR.scenery.STEP_W, OTR.scenery.STEP_H, L.steps, this.G);
    this.surface(x + L.porchX0, x + L.porchX1 + 40, top + L.floorY, { kind: 'porch', priority: 20 });
    return this.wrapStructure(x, top, L, { img, door, front, doorKey: B.doorKey, doorOpenKey: B.doorOpenKey, glass: true });
  }

  interior(x, spec) {
    const s = this.scene, I = OTR.scenery.interior(s, spec), L = I.layout;
    const top = this.G - L.h;
    const img = s.add.image(x, top, I.key).setOrigin(0, 0).setDepth(-10);
    const front = s.add.image(x, top, I.frontKey).setOrigin(0, 0).setDepth(27);
    return { img, front, layout: L, counterX: x + L.counterX, entryX: x + L.entryX, elevatorX: x + L.elevatorX, counterTopY: top + L.counterTop };
  }

  wrapStructure(x, top, L, parts) {
    (this.liveParts = this.liveParts || []).push([parts.door]);
    const st = Object.assign({
      layout: L, x, top,
      doorX: x + L.doorX, floorY: top + L.floorY,
      bellX: x + (L.bellX || L.panelX || L.doorX), bellY: top + (L.bellY || L.panelY || L.floorY - 120),
      numberX: x + L.numberX, numberY: top + L.numberY,
      stepsX0: x + L.stepsX0, porchX0: x + L.porchX0, porchX1: x + L.porchX1,
      isOpen: false
    }, parts);
    st.setDoor = (open) => {
      if (st.isOpen === open) return;
      st.isOpen = open;
      if (parts.glass) {
        this.scene.tweens.add({ targets: parts.door, alpha: open ? 0.25 : 1, duration: 220 });
      } else {
        parts.door.setTexture(open ? parts.doorOpenKey : parts.doorKey);
      }
      OTR.audio.play(open ? 'door_open' : 'door_close');
    };
    return st;
  }

  van(x, o) {
    o = o || {};
    const s = this.scene;
    const closed = OTR.scenery.van(s, 'closed'), open = OTR.scenery.van(s, 'open');
    const L = closed.layout;
    const top = this.G + 18 - L.h;
    const img = s.add.image(x, top, o.open ? open.key : closed.key).setOrigin(0, 0).setDepth(-6);
    const hz = L.hazards.map(([hx, hy]) => s.add.image(x + hx, top + hy, 'p_glow').setScale(0.9).setTint(0xFFB020).setBlendMode(Phaser.BlendModes.ADD).setDepth(-5).setAlpha(0));
    (this.liveParts = this.liveParts || []).push([img, ...hz]);
    const v = {
      img, layout: L, x, top,
      doorX: x + (L.doorX0 + L.doorX1) / 2, floorY: top + L.floorY, stepY: top + L.stepY, handleX: x + L.handleX,
      isOpen: !!o.open,
      setOpen: (op) => { v.isOpen = op; img.setTexture(op ? open.key : closed.key); OTR.audio.play(op ? 'door_open' : 'door_close'); },
      hazards: (on) => {
        if (v._hzTimer) { v._hzTimer.remove(); v._hzTimer = null; }
        hz.forEach(h => h.setAlpha(0));
        if (on) {
          let lit = false;
          v._hzTimer = s.time.addEvent({ delay: 450, loop: true, callback: () => { lit = !lit; hz.forEach(h => h.setAlpha(lit ? 0.95 : 0)); } });
        }
      }
    };
    return v;
  }

  prop(type, x, o) {
    o = o || {};
    const key = OTR.scenery.prop(this.scene, type, o.art || {});
    const y = o.y !== undefined ? o.y : this.groundAt(x) + (o.dy || 0);
    const img = this.scene.add.image(x, y, key).setOrigin(o.ox !== undefined ? o.ox : 0.5, o.oy !== undefined ? o.oy : 1).setDepth(o.depth !== undefined ? o.depth : 5);
    if (o.scale) img.setScale(o.scale);
    if (o.flip) img.setFlipX(true);
    if (o.scrollFactor !== undefined) img.setScrollFactor(o.scrollFactor, 1);
    return img;
  }

  /* ------------------------------------------------------------ actors */
  actor(rig, o) {
    o = o || {};
    const a = { rig, followGround: o.followGround !== false, depthBase: o.depth || 20, lastY: null };
    rig.y = this.groundAt(rig.x);
    rig.setDepth(a.depthBase);
    this.actors.push(a);
    return rig;
  }

  player(rig, o) {
    o = o || {};
    this.actor(rig, Object.assign({ depth: 30 }, o));
    this.me = rig;
    this.walkSpeed = o.speed || 230;
    this.carefulSpeed = o.carefulSpeed || 95;
    this.cam.scrollX = OTR.util.clamp(rig.x - OTR.W / 2, 0, this.width - OTR.W);
    return rig;
  }

  /** Restrict camera + walking to x0..x1 (e.g. a building interior placed off to the side). */
  setRegion(x0, x1, snap) {
    this.region = { x0, x1 };
    this.cam.setBounds(x0, 0, x1 - x0, OTR.H);
    if (snap && this.me) this.cam.scrollX = OTR.util.clamp(this.me.x - OTR.W / 2, x0, x1 - OTR.W);
  }

  /** Frame the camera so world x sits at screen x (e.g. keep a conversation on the left third). null to follow the player. */
  focus(worldX, screenX) {
    this.focusPt = worldX === null || worldX === undefined ? null : { x: worldX, sx: screenX === undefined ? OTR.W / 2 : screenX };
  }

  /** A wall the player can't walk through from either side while active() is true. */
  barrier(x, active, o) {
    const b = Object.assign({ x, active: active || (() => true), pad: 26 }, o || {});
    this.barriers.push(b);
    return b;
  }

  clampByBarriers(fromX, toX) {
    let t = toX;
    this.barriers.forEach(b => {
      if (!b.active()) return;
      if (fromX < b.x && t > b.x - b.pad) t = b.x - b.pad;
      if (fromX > b.x && t < b.x + b.pad) t = b.x + b.pad;
    });
    return t;
  }

  lock() { this.locked++; if (this.me) this.me.stop(); }
  unlock() { this.locked = Math.max(0, this.locked - 1); }

  walkPlayerTo(x, onArrive, o) {
    if (!this.me) return;
    x = OTR.util.clamp(x, this.region.x0 + 40, this.region.x1 - 40);
    x = this.clampByBarriers(this.me.x, x);
    const careful = this.keys.shift.isDown || (o && o.careful);
    this.me.walkTo(x, onArrive, { speed: careful ? this.carefulSpeed : this.walkSpeed });
    this.onMove && this.onMove(careful);
  }

  get careful() {
    return !!(this.me && this.me.moveTarget && this.me.moveTarget.speed <= this.carefulSpeed + 1);
  }

  /* ------------------------------------------------------------ interactables */
  /**
   * o: { id, x, y, range, label, key, onUse, when(), prefer(), hotspot: {x?, y, w, h} }
   * A hotspot makes the thing clickable: the courier walks to it and uses it (and just walks there when it cannot
   * be used right now, as a click on the ground would).
   */
  interact(o) {
    const it = Object.assign({ range: 80, label: 'Use', enabled: true }, o);
    this.inter.push(it);
    if (o.hotspot) {
      const hs = o.hotspot;
      const z = this.scene.add.zone(hs.x !== undefined ? hs.x : it.x, hs.y, hs.w, hs.h).setInteractive({ useHandCursor: true }).setDepth(70);
      z.on('pointerup', () => {
        if (this.locked > 0 || this.scene._openModals > 0) return;
        const tx = it.standX !== undefined ? it.standX : it.x;
        if (!this.usable(it)) { if (this.clickToWalk) this.walkPlayerTo(tx); return; }
        if (Math.abs(this.me.x - tx) <= it.range) this.use(it);
        else this.walkPlayerTo(tx, () => { if (this.usable(it) && Math.abs(this.me.x - tx) <= it.range) this.use(it); });
      });
      it.zone = z;
    }
    return it;
  }

  remove(it) {
    this.inter = this.inter.filter(i => i !== it);
    if (it.zone) it.zone.destroy();
    if (this.promptFor === it) this.hidePrompt();
  }

  usable(it) {
    return it.enabled && (!it.when || it.when());
  }

  /**
   * The interaction E would use: the closest one in range. An interaction can say it is the natural next step
   * (`prefer()`), which counts as standing 14 px closer, so when two sit side by side (the van's shelves and its
   * door) E offers the one that fits the moment, while walking up to another one still selects that.
   */
  nearest() {
    if (!this.me) return null;
    let best = null, bd = 1e9;
    this.inter.forEach(it => {
      if (!this.usable(it)) return;
      const tx = it.standX !== undefined ? it.standX : it.x;
      const d = Math.abs(this.me.x - tx);
      if (d > it.range) return;
      const score = d - (it.prefer && it.prefer() ? 14 : 0);
      if (score < bd) { best = it; bd = score; }
    });
    return best;
  }

  useNearest() {
    if (this.locked > 0 || this.scene._openModals > 0 || this.scene.scene.isPaused()) return;
    const it = this.nearest();
    if (it) this.use(it);
  }

  use(it) {
    this.me.stop();
    this.hidePrompt();
    OTR.audio.play('click');
    it.onUse(it);
  }

  showPrompt(it) {
    if (this.promptFor === it) return;
    this.hidePrompt();
    const s = this.scene;
    const c = s.add.container(it.x, (it.y !== undefined ? it.y : this.groundAt(it.x) - 260)).setDepth(900);
    const t = OTR.txt(s, 16, 0, it.label, 17, '#ffffff', { ox: 0, weight: '900' });
    const w = t.width + 58, h = 36;
    const g = OTR.tex.shape(s, (g) => {
      g.fillStyle(0x16062B, 0.88); g.fillRoundedRect(-w / 2, -h / 2, w, h, 18);
      g.lineStyle(2, 0xFF6600, 1); g.strokeRoundedRect(-w / 2, -h / 2, w, h, 18);
    });
    const cap = OTR.ui.keyCap(s, -w / 2 + 22, 0, 'E', { size: 13 });
    t.setX(-w / 2 + 40);
    c.add([g, cap, t]);
    c.setScale(0.6).setAlpha(0);
    s.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 160, ease: 'Back.out' });
    s.tweens.add({ targets: c, y: c.y - 5, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.prompt = c;
    this.promptFor = it;
  }

  hidePrompt() {
    if (this.prompt) { this.prompt.destroy(); this.prompt = null; }
    this.promptFor = null;
  }

  /* ------------------------------------------------------------ zones (hazards etc.) */
  /** o: { x0, x1, onEnter(rig, careful), onExit, once } */
  zone(o) {
    const z = Object.assign({ inside: false, fired: false }, o);
    this.zones.push(z);
    return z;
  }

  /* ------------------------------------------------------------ frame */
  update(delta) {
    const dt = Math.min(delta, 100) / 1000;
    if (this.me && this.locked === 0 && this.scene._openModals === 0 && !this.me.once) {
      const L = this.keys.left.isDown || this.keys.a.isDown;
      const R = this.keys.right.isDown || this.keys.d.isDown;
      if (L !== R) {
        const careful = this.keys.shift.isDown;
        const sp = careful ? this.carefulSpeed : this.walkSpeed;
        this.me.walkTo(this.me.x + (R ? 60 : -60), null, { speed: sp });
        this.me.moveTarget.x = this.clampByBarriers(this.me.x, OTR.util.clamp(this.me.moveTarget.x, this.region.x0 + 40, this.region.x1 - 40));
        if (Math.abs(this.me.moveTarget.x - this.me.x) < 2) { this.me.stop(); if (this.onBlocked) this.onBlocked(); }
        this.kbWalking = true;
        this.onMove && this.onMove(careful);
      } else if (this.kbWalking) {
        this.kbWalking = false;
        this.me.stop();
      }
    }
    this.actors.forEach(a => {
      if (!a.rig.c.active || !a.followGround) return;
      const gy = this.groundAt(a.rig.x);
      a.rig.y += (gy - a.rig.y) * Math.min(1, dt * 14);
      if (Math.abs(gy - a.rig.y) < 0.5) a.rig.y = gy;
    });
    if (this.me) {
      const want = this.focusPt ? this.focusPt.x - this.focusPt.sx : this.me.x - OTR.W / 2 + this.me.facing * 60;
      const target = OTR.util.clamp(want, this.region.x0, this.region.x1 - OTR.W);
      this.cam.scrollX += (target - this.cam.scrollX) * Math.min(1, dt * 4);
      // The prompt shows whenever E would do something, walking or not. (It used to wait until the courier stood
      // still, so a trainee walking past a window, or stopping just beyond it, never saw one and had to "wiggle".)
      const it = this.locked === 0 ? this.nearest() : null;
      if (it) this.showPrompt(it);
      else this.hidePrompt();
      this.zones.forEach(z => {
        const inside = this.me.x >= z.x0 && this.me.x <= z.x1;
        if (inside && !z.inside) {
          z.inside = true;
          if (!(z.once && z.fired)) { z.fired = true; if (z.onEnter) z.onEnter(this.me, this.careful || this.keys.shift.isDown); }
        } else if (!inside && z.inside) {
          z.inside = false;
          if (z.onExit) z.onExit(this.me);
        }
      });
    }
    if (this.farLayer) this.farLayer.t.tilePositionX = this.cam.scrollX * this.farLayer.factor;
  }
};
