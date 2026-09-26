/*
 * Driving aids and the rules that go with them, installed on every town drive (TownDriveScene and the Road Hazards
 * drill): mirrors (M) and the pull-out check, the rear camera while reversing and on G.O.A.L., the parking brake at
 * every park, following distance, and (route days) an emergency vehicle coming up from behind.
 *
 *   OTR.driveAids.install(scene)   after the HUD is built
 *   OTR.driveAids.tick(scene, dt)  every frame, after the rules
 */
window.OTR = window.OTR || {};

OTR.driveAids = {
  install(s) {
    s.mirrorAt = -99;
    s.spaceAt = -99;
    s.pullOut = { pending: true };             // the first move of a drive is pulling away from the curb
    s.tailgate = { t: 0, warned: false };
    // three views onto the world, drawn only while shown: two side mirrors and the rear camera
    const mk = (x, y, w, h, name) => {
      const cam = s.cameras.add(x, y, w, h).setName(name).setZoom(0.55).setVisible(false);
      cam.setBackgroundColor(0x2E4A2A);
      return cam;
    };
    const W = OTR.W, H = OTR.H;
    s.insetCams = { left: mk(W / 2 - 330, 70, 200, 130, 'mirrorL'), right: mk(W / 2 + 130, 70, 200, 130, 'mirrorR'), rear: mk(W - 262, H - 250, 240, 150, 'rear') };
    s.insetFrames = s.add.container(0, 0).setScrollFactor(0).setDepth(790).setVisible(false);
    s.rearFrame = s.add.container(0, 0).setScrollFactor(0).setDepth(790).setVisible(false);
    const frame = (c, x, y, w, h, label) => {
      c.add(OTR.tex.shape(s, (g) => { g.lineStyle(4, 0x16062B, 1); g.strokeRoundedRect(x - 2, y - 2, w + 4, h + 4, 10); g.lineStyle(2, 0xC9B3F0, 1); g.strokeRoundedRect(x, y, w, h, 8); }));
      c.add(OTR.txt(s, x + w / 2, y + h + 12, label, 12, '#ffffff', { weight: '900', stroke: '#16062B', strokeW: 4 }));
    };
    frame(s.insetFrames, W / 2 - 330, 70, 200, 130, 'LEFT MIRROR');
    frame(s.insetFrames, W / 2 + 130, 70, 200, 130, 'RIGHT MIRROR');
    frame(s.rearFrame, W - 262, H - 250, 240, 150, 'REAR CAMERA');
    // the HUD built before these views existed stays out of them (later objects are sorted by syncCameras)
    s.children.list.forEach(o => { if (o.scrollFactorX === 0 && o.scrollFactorY === 0) Object.values(s.insetCams).forEach(c => c.ignore(o)); });
    OTR.onKey(s, 'keydown-M', () => this.checkMirrors(s));
    OTR.onKey(s, 'keydown-SPACE', () => { s.spaceAt = s.elapsed; });
    s.syncCameras();
  },

  /** M: a glance at both mirrors (the views stay up for a moment). */
  checkMirrors(s) {
    if (s.parked || s.leaving) return;
    s.mirrorAt = s.elapsed;
    OTR.audio.play('tick');
  },

  /** Point an inset at a spot beside or behind the van, turned so the van's rear is at the top of the view. */
  aim(s, cam, back, side) {
    const V = OTR.vehicle, v = s.van, f = V.fwd(v), r = V.right(v), P = s.P;
    const bc = V.bodyCentre(v);
    cam.centerOn(bc.x - f.x * back * P + r.x * side * P, bc.y - f.y * back * P + r.y * side * P);
    cam.setRotation(Math.PI / 2 - v.heading);
  },

  tick(s, dt) {
    if (!s.insetCams || s.leaving) return;
    const V = OTR.vehicle, v = s.van, mph = V.mph(v);
    // mirrors for 1.6 s after M; the rear camera in reverse and during G.O.A.L.
    const mirrors = s.elapsed - s.mirrorAt < 1.6;
    s.insetCams.left.setVisible(mirrors); s.insetCams.right.setVisible(mirrors); s.insetFrames.setVisible(mirrors);
    if (mirrors) { this.aim(s, s.insetCams.left, 5, -3); this.aim(s, s.insetCams.right, 5, 3); }
    const rear = (v.gear < 0 || s.goalBusy) && !s.parked;
    s.insetCams.rear.setVisible(rear); s.rearFrame.setVisible(rear);
    if (rear) this.aim(s, s.insetCams.rear, 6, 0);

    this.pullOutCheck(s, mph);
    this.following(s, dt, mph);
    if (s.shiftMode && !s.noEvents) this.emergency(s, dt, mph);
  },

  /** Pulling away from the curb: mirrors first (M within the last 8 s). */
  pullOutCheck(s, mph) {
    const p = s.pullOut;
    if (!p.pending || mph < 2 || s.van.gear < 0) return;
    p.pending = false;
    if (s.elapsed - s.mirrorAt < 8) s.log.check('safety', 1, 1, 'Checked the mirrors before pulling out');
    else s.violation('mirror', 'Pulled out without checking the mirrors', 'safety', 1, 'Before you pull away from the curb: mirrors (M), then go when it is clear. Pulling out is where a lot of low-speed crashes happen.');
  },

  /** Parking: the parking brake goes on (SPACE held, or pressed in the last 3 s). Scored, never refused. */
  parkingBrake(s) {
    const on = s.heldAny('Space') || s.elapsed - s.spaceAt < 3;
    s.log.check('safety', on ? 1 : 0, 1, 'Set the parking brake before leaving the seat', { lesson: 'Every stop: parking brake on (SPACE), then P. A van that rolls away with nobody in it is how people get crushed.' });
    if (!on) s.toast('Parking brake! Next time: SPACE, then P', 0xF0435A);
    s.pullOut.pending = true;                 // after a park, the next move is a pull-out again
  },

  /** Following distance: the car ahead in the van's lane, in seconds. Under 2 s for 3 s at speed is tailgating. */
  following(s, dt, mph) {
    const T = s.tailgate;
    if (mph < 10 || !s.cars || !s.cars.length) { T.t = 0; return; }
    const V = OTR.vehicle, v = s.van, f = V.fwd(v), r = V.right(v), bc = V.bodyCentre(v);
    const vpx = Math.abs(v.u) * s.P;
    let gap = Infinity;
    s.cars.forEach(c => {
      const dx = c.x - bc.x, dy = c.y - bc.y;
      const along = dx * f.x + dy * f.y, lat = dx * r.x + dy * r.y;
      if (along <= 0 || Math.abs(lat) > 30) return;
      if (Math.cos(c.heading - v.heading) < 0.9) return;         // not going the same way
      gap = Math.min(gap, along - v.g.hl * s.P - c.hl);
    });
    const secs = gap / Math.max(1, vpx);
    if (secs < 2) {
      T.t += dt;
      if (!T.warned && OTR.academy.coaching()) { T.warned = true; s.toast('Too close: drop back to four seconds behind', 0xFFC83D); }
      if (T.t > 3) {
        T.t = 0;
        s.violation('tailgate', 'Following too closely', 'safety', 2, 'Stay four seconds behind the vehicle ahead, more in rain or snow: a loaded van needs the room to stop.');
      }
    } else { T.t = Math.max(0, T.t - dt); if (secs > 4) T.warned = false; }
  },

  /**
   * Once a route day, on a straight: an ambulance comes up from behind with lights and siren, down the middle of the
   * road. Pulled in to the right and stopped as it passes is right; still driving in the lane is the violation.
   */
  emergency(s, dt, mph) {
    const st = OTR.shift && OTR.shift.state;
    if (!st) return;
    const E = s.ambulance;
    const V = OTR.vehicle, v = s.van, P = s.P, R = OTR.townArt.ROAD / 2;
    if (!E) {
      if (st.emergencyDone || s.parked || s.incidentOpen) return;
      // the day's leg for it: the second one driven, part-way in, on a straight stretch
      const doneN = st.route.filter(r => r.done).length;
      if (doneN !== 1 || s.elapsed < 15 || mph < 12) return;
      const ax = this.axis(s);
      if (!ax || ax.room < 350) return;
      st.emergencyDone = true;
      OTR.shift.save();
      const img = s.add.image(0, 0, OTR.art.carTop(s, 0xF4F4F8)).setDepth(29).setScale(0.8, 1.0);
      const bar = s.add.rectangle(0, 0, 30, 8, 0xE8304A).setDepth(30);
      s.ambulance = { img, bar, ax, d: -620, t: 0, judged: false };
      s.syncCameras();
      OTR.audio.play('alarm');
      s.toast('Siren behind you! Pull in to the right and stop until it has passed', 0xF0435A);
      return;
    }
    E.t += dt;
    const van = E.ax.pos(v);
    E.d += (Math.max(15, mph) * 0.447 * P + 260) * dt;           // it closes fast on whatever the van does
    const p = E.ax.at(van.along + E.d);
    E.img.setPosition(p.x, p.y).setRotation(E.ax.heading + Math.PI / 2);
    E.bar.setPosition(p.x, p.y).setRotation(E.ax.heading + Math.PI / 2).setFillStyle(Math.floor(E.t * 6) % 2 ? 0xE8304A : 0x3DA5FF);
    if (Math.floor(E.t / 0.6) !== Math.floor((E.t - dt) / 0.6)) OTR.audio.play(Math.floor(E.t / 0.6) % 2 ? 'beep' : 'buzz');
    if (!E.judged && E.d > -10) {
      E.judged = true;
      const off = this.axis(s);
      const pulled = off && off.gap < 1.8 && mph < 3;
      if (pulled) s.log.check('safety', 2, 2, 'Pulled over and stopped for an emergency vehicle');
      else s.violation('emergency', 'Didn\'t pull over for an emergency vehicle', 'safety', 3, 'Lights or a siren behind you: pull in to the right, stop, and wait until it has passed. Then mirrors (M) before you pull out again.');
      s.pullOut.pending = pulled;
    }
    if (E.d > 900) { E.img.destroy(); E.bar.destroy(); s.ambulance = null; }
  },

  /** The street the van is driving along: heading, how far to the next junction box, and the curb gap. */
  axis(s) {
    const V = OTR.vehicle, v = s.van, T = s.T, R = OTR.townArt.ROAD / 2, P = s.P;
    const bc = V.bodyCentre(v);
    const c = Math.cos(v.heading), sn = Math.sin(v.heading);
    const horiz = Math.abs(c) > 0.94, vert = Math.abs(sn) > 0.94;
    if (!horiz && !vert) return null;
    const lines = horiz ? T.hy : T.vx, cross = horiz ? T.vx : T.hy;
    const pos = horiz ? bc.y : bc.x, along0 = horiz ? bc.x : bc.y;
    const line = lines.reduce((b, l) => (Math.abs(l - pos) < Math.abs(b - pos) ? l : b), lines[0]);
    if (Math.abs(line - pos) > R) return null;
    const dir = horiz ? Math.sign(c) : Math.sign(sn);
    const ahead = cross.map(x => (x - along0) * dir).filter(d => d > 0);
    const room = ahead.length ? Math.min(...ahead) - R : 9999;
    const side = Math.abs(pos - line);                          // towards the right-hand curb in this lane
    const gap = (R - side - v.g.hw * P) / P;
    const heading = horiz ? (dir > 0 ? 0 : Math.PI) : (dir > 0 ? Math.PI / 2 : -Math.PI / 2);
    return {
      room, gap, heading,
      pos: (vv) => { const b = V.bodyCentre(vv); return { along: (horiz ? b.x : b.y) * dir }; },
      // the middle of the road: where the ambulance drives
      at: (a) => horiz ? { x: a * dir, y: line } : { x: line, y: a * dir }
    };
  }
};
