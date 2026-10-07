/* Connected first-person prototype. Pure mission state; metres/seconds, classic scripts. */
window.OTR = window.OTR || {};
OTR.fpMission = {
  VERSION: 2,
  addresses: ['214 Maple Ave', '216 Maple Ave', '214 Birch Lane'],
  slots: Array.from({ length: 6 }, (_, i) => ({
    id: 'slot' + i, name: (i < 3 ? 'Left' : 'Right') + ' shelf ' + (i % 3 + 1),
    x: i < 3 ? -0.72 : 0.72, y: 1.35, z: 2.05 - (i % 3) * 1.05
  })),
  clone(value) { return JSON.parse(JSON.stringify(value)); },
  validLogs(logs) {
    return Array.isArray(logs) && logs.length <= 300 && logs.every(l => l &&
      ['id','skill','text'].every(k => typeof l[k] === 'string') &&
      ['good','needs','recovered'].includes(l.outcome) && Number.isFinite(l.at) && l.at >= 0);
  },
  local(v, p) {
    const x = p.x - v.x, z = p.z - v.z, c = Math.cos(v.yaw), s = Math.sin(v.yaw);
    return { x: c * x + s * z, z: -s * x + c * z };
  },
  create(kind, seed) {
    const F = OTR.fp, M = this, motor = F.create();
    seed = (Number(seed) >>> 0) || 1;
    const variant = seed % 3;
    const m = {
      version: M.VERSION, kind: kind === 'practice' ? 'practice' : 'campaign', seed,
      phase: 'prepare', mode: 'walk', paused: true, elapsed: 0, revision: 0,
      player: { x: -9, z: 10, yaw: 0, pitch: 0 },
      van: { x: 4, z: 8, yaw: 0, speed: 0, steer: 0, gear: 1, hand: true, belt: false, look: 0 },
      cargoOpen: false, secured: false, heldId: null, lastScan: null,
      checks: { tyres: null, lights: null }, repaired: false, fault: seed % 2 ? 'lights' : 'tyres',
      stops: [-42, -72, -105].map((z, i) => ({ id: i, x: 10, z, address: M.addresses[i],
        service: ['handover', 'safeplace', 'signature'][(i + variant) % 3], contacted: false, resolved: false })),
      parcels: [], logs: [], events: {}, retrievals: 0, departed: false,
      activeStop: 0, requested: null, leg: 0, mirrorAt: -100, signal: 0,
      crossing: { state: 'waiting', x: -7, z: -57, clock: 0, early: false },
      stopSign: { stopped: false, resolved: false },
      traffic: [{ x: 1.7, z: 35, yaw: 0, speed: 4 }, { x: -1.7, z: -123, yaw: Math.PI, speed: 3.7 }],
      bounds: { x0: -20, x1: 20, z0: -136, z1: 22 },
      solids: [
        { x: -16, z: 5, w: 0.25, d: 24, h: 3.6 },
        { x: -10.5, z: 17, w: 11, d: 0.25, h: 3.6 },
        { x: -10.5, z: -7, w: 11, d: 0.25, h: 3.6 },
        { x: -11, z: 1, w: 1.6, d: 9, h: 0.9 },
        ...[-42, -72, -105].map(z => ({ x: 13, z, w: 6, d: 9, h: 4.2 })),
        { x: -13.8, z: 11, w: 2, d: 1.2, h: 1 },
        { x: -13.8, z: 5, w: 1.8, d: 1.6, h: 0.96 }
      ],
      touch() { this.revision++; },
      log(id, skill, outcome, text) {
        if (this.events[id]) return;
        this.events[id] = true;
        this.logs.push({ id, skill, outcome, text, at: Math.round(this.elapsed) });
        this.touch();
      },
      parcel(id) { return this.parcels.find(p => p.id === id); },
      stop(id) { return this.stops.find(s => s.id === Number(id)); },
      pending() { return this.stops.filter(s => !s.resolved); },
      point(id) {
        if (id === 'driver') return Object.assign({ y: 1.65 }, F.local(this.van, -1.15, -1.7));
        if (id === 'cargo') return Object.assign({ y: 1.4 }, F.local(this.van, 0, 2.75));
        if (id === 'tyres') return Object.assign({ y: 0.4 }, F.local(this.van, -1.15, -1.6));
        if (id === 'lights') return Object.assign({ y: 0.95 }, F.local(this.van, 0, -2.75));
        if (id === 'dispatch') return { x: -13.8, y: 1.3, z: 11 };
        if (id === 'returns') return { x: -13.8, y: 1, z: 5 };
        if (id === 'secure') return Object.assign({ y: 0.8 }, F.local(this.van, 0, 2.5));
        if (id && id.startsWith('slot')) {
          const s = M.slots.find(s => s.id === id);
          return s ? Object.assign({ y: s.y }, F.local(this.van, s.x, s.z)) : null;
        }
        if (id && id.startsWith('door')) { const s = this.stop(id.slice(4)); return s && { x: 9.92, y: 1.5, z: s.z }; }
        const p = this.parcel(id);
        if (!p) return null;
        if (p.location === 'depot') return { x: -11, y: 1.2, z: 4 - p.stop * 3 };
        if (p.location.startsWith('slot')) return this.point(p.location);
        if (p.location === 'held') return { x: this.player.x, y: 1.1, z: this.player.z };
        const s = this.stop(p.stop);
        if (p.location === 'delivered') return { x: 9.3, y: 0.28, z: s.z + 1.4 };
        if (p.location === 'returned') return { x: -13.8, y: 1.1, z: 4.5 + p.stop * 0.5 };
        return null;
      },
      near(id, distance) {
        const p = this.point(id);
        return !!p && Math.hypot(this.player.x - p.x, this.player.z - p.z) < (distance || 2.65);
      },
      parked() { return Math.abs(this.van.speed) < 0.12 && this.van.hand; },
      blocked(x, z, radius) {
        const r = radius || 0.24, b = this.bounds;
        if (x - r < b.x0 || x + r > b.x1 || z - r < b.z0 || z + r > b.z1) return true;
        if (this.solids.some(s => F.circleBox(x, z, r, s))) return true;
        if (this.kind === 'campaign' && this.traffic.some(c => F.circleBox(x,z,r,{x:c.x,z:c.z,w:1.8,d:3.6}))) return true;
        const p = M.local(this.van, { x, z });
        if (!this.cargoOpen) return F.circleBox(p.x, p.z, r, { x: 0, z: 0, w: 2.16, d: 5.4 });
        return [
          { x: 0, z: -1.85, w: 2.16, d: 1.7 },
          { x: -0.85, z: 0.65, w: 0.5, d: 3.35 },
          { x: 0.85, z: 0.65, w: 0.5, d: 3.35 }
        ].some(s => F.circleBox(p.x, p.z, r, s));
      },
      canParcel(p) {
        if (!p || this.mode !== 'walk' || this.phase === 'debrief') return false;
        if (p.location === 'held') return p.id === this.heldId;
        return (p.location === 'depot' || (p.location.startsWith('slot') && this.cargoOpen && this.parked())) && this.near(p.id);
      },
      atDelivery(p) {
        const s = p && this.stop(p.stop);
        return !!s && this.parked() && Math.hypot(this.van.x - s.x, this.van.z - s.z) < 18 &&
          Math.hypot(this.player.x - s.x, this.player.z - s.z) < 18;
      },
      scan(id) {
        const p = this.parcel(id || this.heldId);
        if (!this.canParcel(p)) return 'Move close to the parcel and face its label.';
        p.scanned = true; this.lastScan = p.id; this.touch();
        if (p.stop !== this.activeStop && this.phase === 'route' && !p.returnRequired) {
          this.log('mismatch:' + p.id + ':' + this.activeStop, 'verification', 'recovered', 'Scanner identified a parcel for a different stop.');
          return 'This parcel is for a different stop. Check the address before carrying it out.';
        }
        if (this.kind === 'campaign' && p.loaded && !this.stop(p.stop).resolved && this.atDelivery(p)) {
          p.stopScanned = true;
          this.log('stop-scan:' + p.id, 'verification', 'good', 'Scanned the parcel at ' + p.address + ' before delivery.');
        }
        this.log('scan:' + p.id, 'verification', 'good', 'Verified ' + p.address + ' on the scanner.');
        return p.address + ' · ' + this.serviceLabel(p.stop);
      },
      serviceLabel(id) {
        const s = this.stop(id);
        return s.service === 'signature' ? 'Signature required' : s.service === 'safeplace' ? 'Leave in the porch box if nobody answers' : 'Hand to the resident';
      },
      pickup(id) {
        const p = this.parcel(id);
        if (!this.canParcel(p) || this.heldId) return 'Put down the parcel you are carrying first.';
        if (p.location.startsWith('slot')) {
          this.secured = false;
          if (this.kind === 'practice' && p.id === this.requested) {
            this.log('practice:retrieve', 'retrieval', p.scanned ? 'good' : 'needs', p.scanned ? 'Retrieved the requested parcel after checking its label.' : 'Retrieved the requested parcel without scanning it.');
            this.retrievals = 1;
          }
        }
        p.location = 'held'; this.heldId = p.id; this.touch(); return '';
      },
      place(slotId) {
        const slot = M.slots.find(s => s.id === slotId), p = this.parcel(this.heldId);
        if (!slot || !p || !this.parked() || !this.cargoOpen || !this.near(slotId)) return 'Open the cargo doors and move close to a shelf.';
        if (this.parcels.some(q => q.location === slotId)) return 'That shelf position is occupied.';
        p.location = slotId; p.loaded = true; p.zone = slotId;
        this.heldId = null; this.secured = false; this.touch();
        if (this.kind === 'practice' && this.parcels.every(q => q.loaded) && !this.requested) this.requested = this.parcels[this.seed % 3].id;
        return '';
      },
      putBack() {
        const p = this.parcel(this.heldId);
        if (!p || Math.hypot(this.player.x + 11, this.player.z - (4 - p.stop * 3)) > 2.8) return 'Return to the parcel table or choose an empty cargo shelf.';
        p.location = 'depot'; this.heldId = null; this.touch(); return '';
      },
      inspectVan(part, decision) {
        if (!['tyres','lights'].includes(part) || !this.near(part) || this.mode !== 'walk') return 'Move close to the inspection point.';
        const defect = !this.repaired && this.fault === part;
        const correct = decision === (defect ? 'repair' : 'ready');
        this.checks[part] = correct;
        this.log('inspect:' + part, 'inspection', correct ? 'good' : 'needs', correct ? 'Correctly assessed the ' + part + '.' : 'Recheck the condition of the ' + part + '.');
        if (defect && decision === 'repair') { this.repaired = true; this.touch(); return 'Dispatch arranged the repair. The vehicle is now serviceable.'; }
        this.touch(); return correct ? 'Inspection recorded.' : 'Inspection recorded. Review the condition before departure.';
      },
      toggleCargo() {
        if (!this.near('cargo') || !this.parked() || this.mode !== 'walk') return 'Stop and secure the van before opening cargo.';
        const p = M.local(this.van, this.player);
        if (this.cargoOpen && Math.abs(p.x) < 1.1 && p.z < 2.9) return 'Step outside before closing the cargo doors.';
        this.cargoOpen = !this.cargoOpen; this.touch(); return '';
      },
      secure() {
        if (!this.cargoOpen || !this.near('secure') || this.heldId) return 'Place the parcel and move to the cargo restraints.';
        this.secured = true; this.touch(); return 'Load secured.';
      },
      enter() {
        if (this.kind === 'practice') return 'This lesson covers loading and retrieval. Driving is available in the workday.';
        if (this.mode !== 'walk' || this.heldId || !this.near('driver')) return 'Place the parcel before entering the cab.';
        if (this.cargoOpen) return 'Close the cargo doors before entering the cab.';
        this.mode = 'cab'; this.van.look = 0; this.player.pitch = 0; this.touch(); return '';
      },
      exit() {
        if (this.mode !== 'cab' || !this.parked()) return false;
        for (const side of [-1.8, 1.8]) {
          const p = F.local(this.van, side, -1.7);
          if (!this.blocked(p.x, p.z)) {
            Object.assign(this.player, p, { yaw: this.van.yaw, pitch: 0 });
            this.mode = 'walk'; this.leg++; this.van.belt = false; this.touch(); return true;
          }
        }
        return false;
      },
      shiftGear: motor.shiftGear,
      mirror() { if (this.mode === 'cab') { this.mirrorAt = this.elapsed; this.touch(); } },
      contact(id) {
        const s = this.stop(id);
        if (this.kind !== 'campaign' || !s || !this.near('door' + id) || this.mode !== 'walk') return 'Approach the correct delivery point.';
        s.contacted = true; this.touch();
        return s.service === 'handover' ? 'The resident answers and confirms the address.' : 'Nobody answers the door.';
      },
      deliver(id, outcome) {
        const s = this.stop(id), p = this.parcel(this.heldId);
        if (!['handover','safeplace','exception'].includes(outcome)) return 'Choose a delivery outcome.';
        if (this.kind !== 'campaign' || !s || s.resolved || !this.near('door' + id) || this.mode !== 'walk') return 'Approach an unfinished delivery point.';
        if (!p) return 'Retrieve the parcel from the van first.';
        if (p.stop !== s.id) {
          this.log('wrong:' + p.id + ':' + id, 'verification', 'needs', 'Attempted a delivery with the wrong parcel.');
          return 'The address does not match. Return this parcel to the van and retrieve the correct one.';
        }
        if (!p.loaded) return 'Prepare and load this parcel at the depot first.';
        if (!s.contacted) return 'Attempt contact before recording the outcome.';
        if (!p.stopScanned) return 'Scan this parcel at the delivery stop before recording the outcome.';
        if (outcome === 'handover' && s.service !== 'handover') {
          this.log('absent-handover:' + id, 'delivery', 'needs', 'Tried to record a handover with no recipient present.');
          return 'Nobody is present to receive the parcel. Choose an outcome that matches the situation.';
        }
        if (!p.scanned) this.log('unverified:' + p.id, 'verification', 'needs', 'Completed a stop without scanning the parcel.');
        const expected = s.service === 'handover' ? 'handover' : s.service === 'safeplace' ? 'safeplace' : 'exception';
        const correct = outcome === expected;
        this.log('outcome:' + id, 'delivery', correct ? 'good' : 'needs', correct ?
          (outcome === 'exception' ? 'Retained the signature parcel when the recipient was absent.' : 'Followed the delivery requirements at ' + s.address + '.') :
          'The outcome did not match the requirements at ' + s.address + '.');
        s.resolved = true; s.outcome = outcome;
        if (outcome !== 'exception') { p.location = 'delivered'; this.heldId = null; }
        else p.returnRequired = true;
        this.activeStop = this.pending().length ? this.pending()[0].id : this.activeStop;
        if (!this.pending().length) this.phase = 'return';
        this.touch();
        return correct ? (outcome === 'exception' ? 'Exception recorded. Keep the parcel and return it to the depot.' : 'Delivery recorded.') : 'Outcome recorded. Review this decision in the debrief.';
      },
      returnParcel() {
        const p = this.parcel(this.heldId);
        if (!p || !p.returnRequired || !this.near('returns') || this.mode !== 'walk') return 'Bring an undelivered parcel to the returns desk.';
        p.location = 'returned'; this.heldId = null;
        this.log('returned:' + p.id, 'returns', 'good', 'Scanned the undelivered parcel back into the depot.'); this.touch(); return 'Return recorded.';
      },
      finish() {
        if (!this.near('dispatch') || this.mode !== 'walk') return 'Return to the dispatch desk.';
        if (this.kind === 'practice') {
          if (!this.retrievals || this.heldId || !this.secured || this.parcels.some(p => !p.location.startsWith('slot'))) return 'Retrieve the requested parcel, put it back and secure the load before finishing.';
        } else {
          if (this.pending().length) return 'Complete the remaining delivery stops first.';
          if (this.parcels.some(p => p.returnRequired && p.location !== 'returned')) return 'Bring retained parcels to the returns desk first.';
          if (Math.hypot(this.van.x - 4, this.van.z - 8) > 14 || !this.parked()) return 'Return the van to the depot and set the parking brake.';
        }
        this.phase = 'debrief'; this.paused = true; this.touch(); return '';
      },
      preparation() {
        this.departed = true; this.phase = 'route';
        ['tyres','lights'].forEach(part => this.log('departure:' + part, 'inspection', this.checks[part] ? 'good' : 'needs', this.checks[part] ? 'Completed the ' + part + ' check before departure.' : 'Departed without a correct ' + part + ' check.'));
        this.log('departure:load', 'loading', this.secured ? 'good' : 'needs', this.secured ? 'Secured the load before departure.' : 'Departed with an unsecured load.');
        this.parcels.forEach(p => this.log('departure:' + p.id, 'loading', p.scanned && p.location.startsWith('slot') ? 'good' : 'needs', p.scanned && p.location.startsWith('slot') ? 'Loaded and scanned ' + p.address + '.' : 'A parcel was unscanned or left at the depot.'));
      },
      tick(input, dt) {
        this.elapsed += dt;
        if (this.kind === 'campaign') this.tickTraffic(dt);
        const v = this.van, old = { x: v.x, z: v.z, speed: v.speed };
        motor.tick.call(this, input, dt);
        if (this.mode !== 'cab') return;
        if (Math.abs(v.speed) > 0.3 && !this.departed) this.preparation();
        if (Math.abs(v.speed) > 0.3) {
          if (!v.belt) this.log('belt:' + this.leg, 'safety', 'needs', 'Moved the van without fastening the seatbelt.');
          if (!this.secured) this.log('load:' + this.leg, 'loading', 'needs', 'Moved the van before securing the load.');
          if (Math.abs(v.speed) > 6.71) this.log('speed:' + this.leg, 'driving', 'needs', 'Exceeded the posted 15 mph limit.');
          const junction = Math.abs(v.z + 27) < 7 || Math.abs(v.z + 89) < 7 || v.z < -116 || v.z > -8;
          if (!junction && Math.abs(v.x) > 5.2) this.log('pavement:' + this.leg, 'driving', 'needs', 'Drove onto the pavement beside the road.');
          if (!junction && Math.abs(v.speed) > 1 && ((Math.cos(v.yaw) > 0.7 && v.x < -0.4) || (Math.cos(v.yaw) < -0.7 && v.x > 0.4))) this.log('lane:' + this.leg, 'driving', 'needs', 'Travelled on the wrong side of the road.');
        }
        if (old.x >= 3.1 && v.x < 3.1 && v.speed > 0.3 && Math.cos(v.yaw) > 0.5) {
          const conflict = this.traffic.some(c => c.yaw === 0 && c.z > v.z - 4 && c.z < v.z + 17);
          this.log('pullout:' + this.leg, 'observation', !conflict && this.signal === -1 && this.elapsed - this.mirrorAt < 10 ? 'good' : 'needs',
            conflict ? 'Pulled into the path of approaching traffic.' : this.signal !== -1 ? 'Pulled away without signalling left.' : this.elapsed - this.mirrorAt >= 10 ? 'Pulled away without a recent mirror check.' : 'Checked, signalled and waited for a clear gap.');
          this.signal = 0;
        }
        const front = F.local(v, 0, -2.7), mark = this.stopSign;
        if (!mark.resolved && v.x > 0 && Math.cos(v.yaw) > 0.7) {
          if (front.z > -24.1 && front.z < -19 && Math.abs(v.speed) < 0.1) mark.stopped = true;
          if (front.z < -24) { mark.resolved = true; this.log('stop-sign', 'driving', mark.stopped ? 'good' : 'needs', mark.stopped ? 'Stopped before the junction line.' : 'Passed the junction stop line without stopping.'); }
        }
        this.tickCrossing(dt, old);
        const hitCar = this.traffic.some(c => F.vanBox(v, { x: c.x, z: c.z, w: 1.8, d: 3.6 }));
        if (hitCar) { v.x = old.x; v.z = old.z; v.speed = 0; v.hand = true; this.log('traffic-contact:' + this.leg, 'safety', 'needs', 'Contact with traffic: stop and review the manoeuvre.'); }
        if (!hitCar && Math.abs(old.speed) > 1 && v.speed === 0 && (input.forward || !input.back) && !v.hand) this.log('contact:' + this.leg, 'safety', 'needs', 'The van contacted an obstacle.');
      },
      tickTraffic(dt) {
        this.traffic.forEach(c => {
          const dir = c.yaw === 0 ? -1 : 1;
          const ahead = (this.van.z - c.z) * dir;
          const personAhead = (this.player.z - c.z) * dir;
          const walker = this.mode === 'walk' && Math.abs(this.player.x - c.x) < 1.3 && personAhead > 0 && personAhead < 4;
          const blocked = (Math.abs(this.van.x - c.x) < 2 && ahead > 0 && ahead < 9) || walker;
          const h = this.crossing, pedestrian = h.state === 'crossing' && Math.abs(h.x - c.x) < 2 && (h.z - c.z) * dir > 0 && (h.z - c.z) * dir < 10;
          const atLine = dir < 0 && c.z > -22.3 && c.z < -21.9 && !c.stopPassed;
          if (atLine) { c.wait = (c.wait || 0) + dt; if (c.wait >= 1) c.stopPassed = true; }
          if (!blocked && !pedestrian && !atLine) c.z += dir * c.speed * dt;
          if (c.z < -134 && this.van.z > -112) { c.z = 35; c.stopPassed = false; c.wait = 0; }
          if (c.z > 34 && this.van.z < 12) c.z = -134;
        });
      },
      tickCrossing(dt, old) {
        const h = this.crossing, v = this.van;
        if (h.state === 'waiting' && v.z < -34 && v.z > -54 && Math.cos(v.yaw) > 0.5) { h.state = 'developing'; this.touch(); }
        if (h.state === 'waiting' || h.state === 'resolved') return;
        h.clock += dt;
        if (v.z > -50 && Math.abs(v.speed) < 3) h.early = true;
        if (h.clock > 2) { h.state = 'crossing'; h.x = Math.min(7, h.x + 1.1 * dt); }
        if (F.vanBox(v, { x: h.x, z: h.z, w: 0.55, d: 0.55 })) {
          v.x = old.x; v.z = old.z; v.speed = 0; v.hand = true;
          this.log('pedestrian', 'safety', 'needs', 'Pedestrian conflict: the vehicle was stopped. Review the approach and yielding.');
        }
        if (v.z < -61 || h.x >= 7) {
          h.state = 'resolved';
          if (!this.events.pedestrian) this.log('pedestrian', 'anticipation', h.early ? 'good' : 'needs', h.early ? 'Reduced speed early for the developing crossing hazard.' : 'Passed the crossing without an early speed reduction.');
          this.touch();
        }
      },
      step(input, seconds) {
        if (this.paused || this.phase === 'debrief') return;
        input = Object.assign({ forward: false, back: false, left: false, right: false }, input);
        const dt = F.clamp(Number(seconds) || 0, 0, 0.05), n = Math.max(1, Math.ceil(dt / 0.0125));
        for (let i = 0; i < n; i++) this.tick(input, dt / n);
      },
      snapshot() {
        const fields = ['version','kind','seed','phase','mode','elapsed','player','van','cargoOpen','secured','heldId','lastScan','checks','repaired','stops','parcels','logs','events','retrievals','departed','activeStop','requested','leg','mirrorAt','signal','crossing','stopSign','traffic'];
        const out = {}; fields.forEach(k => { out[k] = M.clone(this[k]); }); return out;
      }
    };
    m.parcels = m.stops.map(s => ({ id: 'parcel' + s.id, stop: s.id, address: s.address,
      tracking: 'OTR-' + (10000 + seed % 80000) + '-' + (s.id + 1), weight: [4, 7, 3][s.id],
      location: 'depot', zone: null, scanned: false, stopScanned: false, loaded: false, returnRequired: false }));
    return m;
  },
  restore(raw) {
    try {
      if (!raw || raw.version !== this.VERSION || !['campaign','practice'].includes(raw.kind)) return null;
      const m = this.create(raw.kind, raw.seed), data = this.clone(raw);
      if (!['prepare','route','return','debrief'].includes(data.phase) || !['walk','cab'].includes(data.mode)) return null;
      if (data.kind === 'practice' && data.mode === 'cab') return null;
      if (!Number.isFinite(data.elapsed) || data.elapsed < 0 || !Number.isFinite(data.seed)) return null;
      for (const actor of [data.player, data.van]) {
        if (!actor || !['x','z','yaw'].every(k => Number.isFinite(actor[k]))) return null;
        if (actor.x < -20 || actor.x > 20 || actor.z < -136 || actor.z > 40) return null;
      }
      if (!['speed','steer','gear','look'].every(k => Number.isFinite(data.van[k])) || !Number.isFinite(data.player.pitch)) return null;
      if (![1,-1].includes(data.van.gear) || ![0,1,2].includes(data.activeStop) || ![-1,0,1].includes(data.signal)) return null;
      if (!['retrievals','leg','mirrorAt'].every(k => Number.isFinite(data[k]))) return null;
      if (!data.checks || !['tyres','lights'].every(k => [null,true,false].includes(data.checks[k]))) return null;
      if (!data.stopSign || !['stopped','resolved'].every(k => typeof data.stopSign[k] === 'boolean')) return null;
      if (!['cargoOpen','secured','repaired','departed'].every(k => typeof data[k] === 'boolean') ||
        !['hand','belt'].every(k => typeof data.van[k] === 'boolean')) return null;
      if (![null,'parcel0','parcel1','parcel2'].includes(data.lastScan) || ![null,'parcel0','parcel1','parcel2'].includes(data.requested)) return null;
      if (!Array.isArray(data.parcels) || data.parcels.length !== 3 || !Array.isArray(data.stops) || data.stops.length !== 3) return null;
      const places = new Set(), held = [];
      for (let i = 0; i < 3; i++) {
        const p = data.parcels[i], s = data.stops[i];
        // Existing v2 saves preserve loading scans; unfinished stops require a new delivery scan.
        if (p && p.stopScanned === undefined) p.stopScanned = false;
        if (p.id !== 'parcel' + i || p.stop !== i || s.id !== i || s.address !== this.addresses[i] || p.address !== s.address) return null;
        if (s.x !== m.stops[i].x || s.z !== m.stops[i].z || s.service !== m.stops[i].service) return null;
        if (!['contacted','resolved'].every(k => typeof s[k] === 'boolean') || (s.resolved && !['handover','safeplace','exception'].includes(s.outcome))) return null;
        if (!['scanned','stopScanned','loaded','returnRequired'].every(k => typeof p[k] === 'boolean') || typeof p.tracking !== 'string' || !Number.isFinite(p.weight)) return null;
        if (p.zone !== null && !this.slots.some(s => s.id === p.zone)) return null;
        if (!['depot','held','delivered','returned',...this.slots.map(s => s.id)].includes(p.location)) return null;
        if (!['handover','safeplace','signature'].includes(s.service)) return null;
        if (p.location.startsWith('slot')) { if (places.has(p.location)) return null; places.add(p.location); }
        if (p.location === 'held') held.push(p.id);
      }
      if (held.length > 1 || (held[0] || null) !== data.heldId || !this.validLogs(data.logs)) return null;
      if (!data.events || typeof data.events !== 'object' || Array.isArray(data.events) || Object.values(data.events).some(v => v !== true)) return null;
      if (data.logs.some(l => data.events[l.id] !== true)) return null;
      if (!data.crossing || !['waiting','developing','crossing','resolved'].includes(data.crossing.state)) return null;
      if (![data.crossing.x,data.crossing.z,data.crossing.clock].every(Number.isFinite)) return null;
      if (!Array.isArray(data.traffic) || data.traffic.length !== 2 || data.traffic.some(c => ![c.x,c.z,c.yaw,c.speed].every(Number.isFinite))) return null;
      Object.keys(m.snapshot()).forEach(k => { if (!(k in data)) throw new Error('Missing field'); m[k] = data[k]; });
      m.paused = true; return m;
    } catch (_) { return null; }
  }
};

/* Local prototype checkpoints are deliberately separate from course/LMS records. */
OTR.fpStore = {
  key() { return (OTR.save ? OTR.save.localKey() : 'otr_save_v1') + '_firstperson_v2'; },
  empty() { return { version: 2, sequence: 0, welcomed: false, campaign: null, practice: null, last: null }; },
  read() {
    try {
      const data = JSON.parse(window.localStorage.getItem(this.key()));
      if (!data || data.version !== 2) return this.empty();
      const out = this.empty(); out.sequence = Number.isSafeInteger(data.sequence) && data.sequence >= 0 ? data.sequence : 0; out.welcomed = !!data.welcomed;
      ['campaign','practice'].forEach(k => { const m = OTR.fpMission.restore(data[k]); out[k] = m && m.kind === k ? m.snapshot() : null; });
      const last = data.last;
      out.last = last && ['campaign','practice'].includes(last.kind) && Number.isFinite(last.seed) &&
        Number.isFinite(last.elapsed) && last.elapsed >= 0 && OTR.fpMission.validLogs(last.logs) ? last : null; return out;
    } catch (_) { return this.empty(); }
  },
  write(data) {
    try { window.localStorage.setItem(this.key(), JSON.stringify(data)); return true; } catch (_) { return false; }
  }
};
