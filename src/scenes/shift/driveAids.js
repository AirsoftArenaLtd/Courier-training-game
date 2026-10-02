/*
 * Driving aids and the rules that go with them, installed on every town drive (TownDriveScene and the Road Hazards
 * drill): mirrors (M) and the pull-out check, the rear camera while reversing and on G.O.A.L., the parking brake at
 * every park, following distance, and (route days) an emergency vehicle coming up from behind.
 *
 *   OTR.driveAids.install(scene)   after the HUD is built
 *   OTR.driveAids.tick(scene, dt)  every frame, after the rules
 * Route days also track fatigue: a break is due after 2.5 hours on the clock, reactions slow after 3.5, and K (pulled
 * over at the curb) takes a ten-minute break.
 */
window.OTR = window.OTR || {};

OTR.driveAids = {
  install(s) {
    s.mirrorAt = -99;
    s.spaceAt = -99;
    s.pullOut = { pending: !(s.d && s.d.midLeg) };   // the first move of a drive is pulling away from the curb (not on a resume mid-road)
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
    // following distance, in seconds, beside the speedometer while there is a car ahead in the lane
    s.gapPill = s.add.container(304, OTR.H - 76).setScrollFactor(0).setDepth(800).setVisible(false);
    s.gapBg = OTR.tex.liveShape(s);
    s.gapText = OTR.txt(s, 0, 0, '', 16, '#ffffff', { weight: '900' });
    s.gapPill.add([s.gapBg, s.gapText]);
    s._gapShown = null;
    OTR.onKey(s, 'keydown-M', () => this.checkMirrors(s));
    OTR.onKey(s, 'keydown-SPACE', () => { s.spaceAt = s.elapsed; });
    OTR.onKey(s, 'keydown-K', () => this.takeBreak(s));
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
    if (s.shiftMode) this.fatigue(s);
  },

  /* ------------------------------------------------------------------ breaks and fatigue (route days) */
  clockNow(s) { const st = OTR.shift.state; return st ? st.clockMin + Math.floor(s.elapsed / 12) : 0; },
  sinceBreak(s) { const st = OTR.shift.state; return st ? this.clockNow(s) - (st.lastBreakMin || 8 * 60 + 20) : 0; },

  fatigue(s) {
    const since = this.sinceBreak(s);
    const due = since >= 150, tired = since >= 210;
    if (due && !s.breakBadge) {
      const t = OTR.txt(s, 0, 0, 'BREAK DUE · pull over, then K', 14, '#ffffff', { weight: '900', ox: 0 });
      const w = t.width + 30; t.x = -w / 2 + 15;
      s.breakBadge = s.add.container(16 + w / 2, 116).setScrollFactor(0).setDepth(801);
      s.breakBadge.add([OTR.tex.shape(s, (g) => { g.fillStyle(0x4D148C, 1); g.fillRoundedRect(-w / 2, -15, w, 30, 15); g.lineStyle(2, 0xFFC83D, 1); g.strokeRoundedRect(-w / 2, -15, w, 30, 15); }), t]);
      s.syncCameras();
    }
    if (s.breakBadge) s.breakBadge.setVisible(due);
    if (tired && !s.fatigued) { s.fatigued = true; s.toast('You\'re tired: your reactions are slowing. Pull over and take a break (K).', 0xFFC83D); }
    if (!tired) s.fatigued = false;
  },

  /** K: a ten-minute break, pulled in at the curb and stopped (water and a stretch: the heat eases too). */
  takeBreak(s) {
    const st = OTR.shift && OTR.shift.state;
    if (!s.shiftMode || !st || s.parked || s.leaving || s.incidentOpen) return;
    const V = OTR.vehicle;
    const ax = this.axis(s);
    if (!V.stopped(s.van) || !ax || ax.gap > 1.8) { s.toast('For a break: pull in to the curb and stop, then K', 0xC9B3F0); return; }
    if (this.sinceBreak(s) < 45) { s.toast('You had a break a little while ago: keep going', 0xC9B3F0); return; }
    st.clockMin += 10;
    st.lastBreakMin = this.clockNow(s);
    st.breaks = (st.breaks || 0) + 1;
    if (st.heat) { st.heat.hyd = Math.min(100, st.heat.hyd + 30); st.heat.temp = Math.max(20, st.heat.temp - 20); }
    if (st.breaks === 1) s.log.check('safety', 1, 1, 'Took a rest break on the route', { lesson: 'A short break every couple of hours (water, a stretch) keeps your reactions sharp for the afternoon.' });
    st.log = s.log.toJSON();
    OTR.shift.save();
    s.fatigued = false;
    OTR.audio.play('gulp');
    s.pullOut.pending = true;
    s.noticeCard({ title: 'Ten-minute break', body: 'Water, a stretch, and a minute out of the seat.\nThe clock moved on ten minutes. Mirrors before you pull out again.', button: 'Back to it' });
  },

  /** Pulling away from the curb: mirrors first (M within the last 8 s). */
  pullOutCheck(s, mph) {
    const p = s.pullOut;
    if (!p.pending || mph < 2 || s.van.gear < 0) return;
    p.pending = false;
    if (s.elapsed - s.mirrorAt < 8) s.log.check('safety', 1, 1, 'Checked the mirrors before pulling out');
    else s.violation('mirror', 'Pulled out without checking the mirrors', 'safety', 1, 'Before you pull away from the curb: mirrors (M), then go when it is clear. Pulling out is where a lot of low-speed crashes happen.');
    // and the indicator: out from the right-hand curb is a move to the left (Q)
    if (s.signal === 'left') s.log.check('safety', 1, 1, 'Signaled before pulling out');
    else s.violation('signal', 'Pulled out without signaling', 'safety', 1, 'Mirrors, signal, then move: the left indicator (Q) before you pull away from the curb, so traffic behind knows you are coming out.');
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
    if (mph < 10 || !s.cars || !s.cars.length) { T.t = 0; this.showGap(s, null); return; }
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
    this.showGap(s, secs < 6 ? secs : null);
    if (secs < 2) {
      T.t += dt;
      if (!T.warned && OTR.academy.coaching()) { T.warned = true; s.toast('Too close: drop back to four seconds behind', 0xFFC83D); }
      if (T.t > 3) {
        T.t = 0;
        s.violation('tailgate', 'Following too closely', 'safety', 2, 'Stay four seconds behind the vehicle ahead, more in rain or snow: a loaded van needs the room to stop.');
      }
    } else { T.t = Math.max(0, T.t - dt); if (secs > 4) T.warned = false; }
  },

  /** The following-distance readout: seconds behind the car ahead, red under 2, amber under 4, green at 4 or more. */
  showGap(s, secs) {
    if (!s.gapPill) return;
    const key = secs === null ? null : secs.toFixed(1);
    if (key === s._gapShown) return;
    s._gapShown = key;
    if (secs === null) { s.gapPill.setVisible(false); return; }
    const col = secs < 2 ? 0xF0435A : secs < 4 ? 0xFFB020 : 0x2BC48A;
    s.gapText.setText(`${key} s behind`);
    const w = s.gapText.width + 30;
    s.gapBg.redraw((g) => { g.fillStyle(0x16062B, 0.9); g.fillRoundedRect(-w / 2, -16, w, 32, 16); g.lineStyle(3, col, 1); g.strokeRoundedRect(-w / 2, -16, w, 32, 16); });
    s.gapPill.setVisible(true);
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
    // how far towards the right-hand curb, in the van's own lane (at the left-hand curb, on the wrong side of the road,
    // is not pulled over: it used to count, for a break, the ambulance and reading a message)
    const side = (pos - line) * (horiz ? dir : -dir);
    const gap = side > 0 ? (R - side - v.g.hw * P) / P : 99;
    const heading = horiz ? (dir > 0 ? 0 : Math.PI) : (dir > 0 ? Math.PI / 2 : -Math.PI / 2);
    return {
      room, gap, heading,
      pos: (vv) => { const b = V.bodyCentre(vv); return { along: (horiz ? b.x : b.y) * dir }; },
      // the middle of the road: where the ambulance drives
      at: (a) => horiz ? { x: a * dir, y: line } : { x: line, y: a * dir }
    };
  }
};
