/* Connected first-person prototype. Pure mission state; metres/seconds, classic scripts. */
window.OTR = window.OTR || {};
OTR.fpMission = {
  VERSION: 2,
  addresses: ['214 Maple Ave', '216 Maple Ave', '214 Birch Lane'],
  slots: Array.from({ length: 6 }, (_, i) => ({
    id: 'slot' + i, name: i < 3 ? `Left shelf ${i % 3 + 1}` : `Right shelf ${i % 3 + 1}`,
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
  create(kind, seed, routePlan) {
    const F = OTR.fp, M = this, motor = F.create();
    seed = (Number(seed) >>> 0) || 1;
    const variant = seed % 3;
    const m = {
      version: M.VERSION, kind: kind === 'parking' ? 'parking' : kind === 'practice' ? 'practice' : 'campaign', seed,
      briefKey: 'brief:' + seed,
      phase: 'prepare', mode: 'walk', paused: true, elapsed: 0, revision: 0,
      player: { x: -9, z: 10, yaw: 0, pitch: 0 },
      van: { x: 4, z: 8, yaw: 0, speed: 0, steer: 0, gear: 1, hand: true, belt: false, look: 0 },
      cargoOpen: false, secured: false, heldId: null, lastScan: null, briefing: null,
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
        if(this.logs.length>300)this.logs.shift();
        this.touch();
        this.report(id, skill, outcome);
      },
      report(id, skill, outcome) {
        if (!OTR.workday || this.kind==='parking') return;
        // Map only accepted HUD outcomes, so repeated driving ticks allocate nothing here.
        // Keep legacy HUD/save ids (tyres, pavement) separate from the report vocabulary.
        const [event, key, stop] = id.split(':');
        const d = { key, ok: outcome !== 'needs' };
        let type, driving = false;
        switch (event) {
          case 'brief': type = 'brief.read'; d.key = this.seed; break;
          case 'scan': type = 'scan.load'; break;
          case 'stop-scan': case 'unverified':
            type = 'scan.stop'; d.stop = this.parcel(key).stop + 1; break;
          case 'mismatch': case 'wrong':
            type = event === 'mismatch' ? 'scan.mismatch-caught' : 'deliver.wrong-package';
            d.key = key + ':' + stop; d.stop = Number(stop) + 1; break;
          case 'absent-handover': case 'outcome':
            type = event === 'outcome' ? 'deliver.outcome' : 'deliver.no-recipient';
            d.key = Number(key); d.stop = Number(key) + 1; break;
          case 'practice': type = 'retrieve.checked'; d.key = this.requested; break;
          case 'inspect': type = key === 'tyres' ? 'inspect.tires' : 'inspect.lights'; break;
          case 'departure':
            if (key === 'tyres' || key === 'lights') {
              if (d.ok) return;
              type = 'depart.uninspected';
            } else if (key === 'load') {
              type = 'load.secured'; d.key = this.leg;
            } else { if (this.routePlan) return; type = 'load.shelf'; }
            break;
          case 'shelf': type = 'load.shelf'; break;
          case 'load': type = 'load.secured'; d.key = Number(key); break;
          case 'belt': type = 'drive.belt'; d.key = Number(key); break;
          case 'handheld': type = 'drive.handheld'; d.key = Number(key); break;
          case 'speed': type = 'drive.speed'; driving = true; break;
          case 'pavement': type = 'drive.sidewalk'; driving = true; break;
          case 'lane': type = 'drive.wrong-side'; driving = true; break;
          case 'junction': type = 'drive.stop-line'; d.key = id.slice(9); driving = true; break;
          case 'stop-sign': type = 'drive.stop-line'; driving = true; break;
          case 'traffic-contact': case 'contact': type = 'drive.contact'; driving = true; break;
          case 'pedestrian':
            type = skill === 'safety' ? 'drive.pedestrian' : 'drive.hazard-early'; driving = true; break;
          case 'returned': type = 'return.scanned'; break;
          // Pull-out observation has no report type in the current contract; retain its HUD log.
          default: return;
        }
        if (driving) {
          if (key !== undefined && event !== 'junction') d.key = Number(key);
          d.where = { x: this.van.x, z: this.van.z, mph: Math.abs(this.van.speed) * 2.2369362921 };
        }
        OTR.workday.report(type, d);
      },
      readBrief() {
        if (this.kind !== 'campaign' || !this.briefing || this.mode !== 'walk' || !this.near('dispatch')) return false;
        this.log(this.briefKey, 'service', 'good', 'Read the morning brief and route manifest at Dispatch.');
        return true;
      },
      parcel(id) { return this.parcels.find(p => p.id === id); },
      stop(id) { return this.stops.find(s => s.id === Number(id)); },
      pending() { return this.stops.filter(s => !s.resolved); },
      point(id) {
        if (id === 'driver') return Object.assign({ y: 1.65 }, F.local(this.van, -1.15, -1.7));
        if (id === 'cargo') return Object.assign({ y: 1.4 }, F.local(this.van, 0, 2.75));
        if (id === 'tyres') return Object.assign({ y: 0.4 }, F.local(this.van, -1.15, -1.6));
        if (id === 'lights') return Object.assign({ y: 0.95 }, F.local(this.van, 0, -2.75));
        if (id === 'dispatch') return { x: this.routePlan ? 13.8 : -13.8, y: 1.3, z: 11 };
        if (id === 'returns') return { x: this.routePlan ? 13.8 : -13.8, y: 1, z: 5 };
        if (id === 'secure') return Object.assign({ y: 0.8 }, F.local(this.van, 0, 2.5));
        if (id && id.startsWith('slot')) {
          const s = M.slots.find(s => s.id === id);
          return s ? Object.assign({ y: s.y }, F.local(this.van, s.x, s.z)) : null;
        }
        if(this.doorsteps&&id&&id.startsWith('gate'))return OTR.fpDoors.point(this,Number(id.slice(4)),'gate');
        if(this.doorsteps&&id&&id.startsWith('hazard'))return OTR.fpDoors.point(this,Number(id.slice(6)),'hazard');
        if (id && id.startsWith('door')) { const s = this.stop(id.slice(4)); return s && { x: s.x, y: 1.5, z: s.z }; }
        const p = this.parcel(id);
        if (!p) return null;
        if(p.anomaly&&p.location==='depot'){const desk=this.point('dispatch');return {x:desk.x,y:1.2,z:desk.z};}
        if (p.location === 'depot') return this.depotPoint(p);
        if (p.location.startsWith('slot')) return this.point(p.location);
        if (p.location === 'held') return { x: this.player.x, y: 1.1, z: this.player.z };
        const s = this.stop(p.stop);
        if(p.location==='delivered'&&this.routeDay&&OTR.fpDay.planter(this,p.stop))return {x:s.x-(s.side||1)*.6,y:.28,z:s.z+2.35};
        if (p.location === 'delivered') return { x: s.x - (s.side || 1) * 0.6, y: 0.28, z: s.z + 1.4 };
        if (p.location === 'returned') return { x: this.routePlan ? 13.8 : -13.8, y: 1.1, z: 4.5 + p.stop * 0.5 };
        return null;
      },
      depotPoint(p) { return { x: this.routePlan ? 11 : -11, y: 1.2, z: 4 - p.stop * (this.routePlan ? 2 : 3) }; },
      driveAllowed(v) {
        if (!this.town) return true;
        const c=Math.cos(v.yaw),s=Math.sin(v.yaw);
        for(let i=-1;i<=1;i+=2)for(let j=-1;j<=1;j+=2){
          const x=v.x+c*i*1.08-s*j*2.7,z=v.z+s*i*1.08+c*j*2.7;
          if(!OTR.fpRoute.onStreet(this,x,z)&&!(x>=1&&x<=8&&z>=-7&&z<=17))return false;
        }
        return true;
      },
      near(id, distance) {
        const p = this.point(id);
        return !!p && Math.hypot(this.player.x - p.x, this.player.z - p.z) < (distance || 2.65);
      },
      parked() { return Math.abs(this.van.speed) < 0.12 && this.van.hand; },
      driveHint() {
        const v = this.van, s = this.stop(this.activeStop);
        if (this.mode !== 'cab' || this.kind !== 'campaign') return '';
        if (this.town) {
          if (!v.belt) return 'Fasten the seatbelt before moving.';
          const tx=this.phase==='return'?4:s.park.x,tz=this.phase==='return'?8:s.park.z;
          if (this.parked() && Math.hypot(v.x-tx,v.z-tz) < 6) return 'Parked at the stop. Check traffic before exiting.';
          if (v.hand) return 'Check mirrors, signal and wait for a clear gap before pulling out.';
          return OTR.fpRoute.limit(this) === 15 ? 'Speed limit: 15 mph. Stop at every junction line. Check the route map while parked.' : 'Speed limit: 25 mph. Stop at every junction line. Check the route map while parked.';
        }
        if (this.phase === 'return') return '';
        if (!v.belt) return 'Fasten the seatbelt before moving.';
        const atStop = Math.abs(v.z - s.z) < 6 && v.x >= 3.1 && Math.cos(v.yaw) > 0.85;
        if (this.parked() && atStop) return 'Parked at the stop. Check traffic before exiting.';
        if (Math.abs(v.z - s.z) < 10) return 'Pull over on the right at the address. Stop and set the parking brake.';
        if (v.hand) return 'Check mirrors, signal left and wait for a clear gap before pulling out.';
        if (!this.stopSign.resolved && v.z > -24 && v.z < -10)
          return 'Stop before the white junction line. Yield before continuing north.';
        return 'Continue north in the right lane. Speed limit: 15 mph.';
      },
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
          (this.doorsteps?OTR.fpDoors.near(this,s.id):this.near('door' + s.id));
      },
      scan(id) {
        const p = this.parcel(id || this.heldId);
        if (!this.canParcel(p)) return 'Move close to the parcel and face its label.';
        if(p.anomaly)return OTR.fpLoadout.scan(this,p);
        p.scanned = true; this.lastScan = p.id; this.touch();
        if (p.stop !== this.activeStop && this.phase === 'route' && !p.returnRequired) {
          this.log('mismatch:' + p.id + ':' + this.activeStop, 'verification', 'recovered', 'Scanner identified a parcel for a different stop.');
          return 'This parcel is for a different stop. Check the address before carrying it out.';
        }
        if (this.kind === 'campaign' && p.loaded && !this.stop(p.stop).resolved && this.atDelivery(p)) {
          p.stopScanned = true;
          this.log('stop-scan:' + p.id, 'verification', 'good', `Scanned the parcel at ${p.address} before delivery.`);
        }
        this.log('scan:' + p.id, 'verification', 'good', `Verified ${p.address} on the scanner.`);
        const addressAlert=this.doorsteps?OTR.fpDoors.address(this,p):'';
        return addressAlert||p.address + ' · ' + this.serviceLabel(p.stop);
      },
      serviceLabel(id) {
        const s = this.stop(id);
        if(!s)return 'This package is not on the route manifest.';
        if(this.doorsteps){const text=OTR.fpDoors.label(this,id);if(text)return text;}
        if(this.routeDay&&OTR.fpDay.planter(this,id))return 'Leave the parcel behind the planter, as dispatch requested.';
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
        if (!p || Math.hypot(this.player.x - this.depotPoint(p).x, this.player.z - this.depotPoint(p).z) > 2.8) return 'Return to the parcel table or choose an empty cargo shelf.';
        p.location = 'depot'; this.heldId = null; this.touch(); return '';
      },
      inspectVan(part, decision) {
        if (!['tyres','lights'].includes(part) || !this.near(part) || this.mode !== 'walk') return 'Move close to the inspection point.';
        const defect = !this.repaired && this.fault === part;
        const correct = decision === (defect ? 'repair' : 'ready');
        this.checks[part] = correct;
        // whole sentences, so each language can word them its own way
        const said = part === 'tyres' ? (correct ? 'Correctly assessed the tires.' : 'Recheck the condition of the tires.')
          : (correct ? 'Correctly assessed the lights.' : 'Recheck the condition of the lights.');
        this.log('inspect:' + part, 'inspection', correct ? 'good' : 'needs', said);
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
        if (this.briefing && !this.events[this.briefKey]) return 'Read the morning brief and manifest at Dispatch before entering the cab.';
        if (this.mode !== 'walk' || this.heldId || !this.near('driver')) return 'Place the parcel before entering the cab.';
        if (this.cargoOpen) return 'Close the cargo doors before entering the cab.';
        this.mode = 'cab'; this.van.look = 0; this.player.pitch = 0; this.touch(); return '';
      },
      exit() {
        if (this.mode !== 'cab' || !this.parked()) return false;
        for (const side of [-1.8, 1.8]) {
          const p = F.local(this.van, side, -1.7);
          if (!this.blocked(p.x, p.z)) {
            if(this.routeDay)OTR.fpDay.endLeg(this);
            if(this.driving)OTR.fpDriving.endLeg(this);
            Object.assign(this.player, p, { yaw: this.van.yaw, pitch: 0 });
            this.mode = 'walk'; this.leg++; this.van.belt = false; this.touch(); return true;
          }
        }
        return false;
      },
      shiftGear: motor.shiftGear,
      selectGear: motor.selectGear,
      mirror() { return false; }, // Retained for old integrations; only physical gaze can establish a check.
      contact(id) {
        const s = this.stop(id);
        if (this.kind !== 'campaign' || !s || !(this.doorsteps?OTR.fpDoors.near(this,id):this.near('door' + id)) || this.mode !== 'walk') return 'Approach the correct delivery point.';
        s.contacted = true;if(this.doorsteps)OTR.fpDoors.sync(this);this.touch();
        return s.service === 'handover' ? 'The resident answers and confirms the address.' : 'Nobody answers the door.';
      },
      deliver(id, outcome) {
        const s = this.stop(id), p = this.parcel(this.heldId),choice=outcome;
        if(outcome==='planter'&&this.routeDay&&OTR.fpDay.planter(this,id))outcome='safeplace';
        if (!['handover','safeplace','exception'].includes(outcome)) return 'Choose a delivery outcome.';
        if (this.kind !== 'campaign' || !s || s.resolved || !(this.doorsteps?OTR.fpDoors.near(this,id):this.near('door' + id)) || this.mode !== 'walk') return 'Approach an unfinished delivery point.';
        if (!p) return 'Retrieve the parcel from the van first.';
        if (p.stop !== s.id) {
          this.log('wrong:' + p.id + ':' + id, 'verification', 'needs', 'Attempted a delivery with the wrong parcel.');
          return 'The address does not match. Return this parcel to the van and retrieve the correct one.';
        }
        if (!p.loaded) return 'Prepare and load this parcel at the depot first.';
        if (!this.atDelivery(p)) return 'Park the van near this address and set the parking brake first.';
        if (!s.contacted) return 'Attempt contact before recording the outcome.';
        if (!p.stopScanned) return 'Scan this parcel at the door before recording the outcome.';
        if (outcome === 'handover' && s.service !== 'handover') {
          this.log('absent-handover:' + id, 'delivery', 'needs', 'Tried to record a handover with no recipient present.');
          return 'Nobody is present to receive the parcel. Choose an outcome that matches the situation.';
        }
        if (!p.scanned) this.log('unverified:' + p.id, 'verification', 'needs', 'Completed a stop without scanning the parcel.');
        const expected = s.service === 'handover' ? 'handover' : s.service === 'safeplace' ? 'safeplace' : 'exception';
        const doorCorrect=this.doorsteps?OTR.fpDoors.assess(this,id,outcome):outcome===expected;
        const response=this.routeDay?OTR.fpDay.outcome(this,s,choice,!!this.doorsteps&&doorCorrect&&outcome==='exception'):null;
        const correct=doorCorrect&&response!==false;
        this.log('outcome:' + id, 'delivery', correct ? 'good' : 'needs', correct ?
          (outcome === 'exception' ? 'Retained the parcel and recorded the delivery exception.' : `Followed the delivery requirements at ${s.address}.`) :
          `The outcome did not match the requirements at ${s.address}.`);
        s.resolved = true; s.outcome = outcome;
        if(OTR.fpLater)OTR.fpLater.arrive(this,id);
        if (outcome !== 'exception') { p.location = 'delivered'; this.heldId = null; }
        else p.returnRequired = true;
        this.activeStop = this.pending().length ? this.pending()[0].id : this.activeStop;
        if (!this.pending().length) this.phase = 'return';
        if(this.doorsteps)OTR.fpDoors.sync(this);
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
        if(this.kind==='parking')return this.parking.done?'':'Park inside the practice bay and set the parking brake first.';
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
        if(OTR.fpLater)OTR.fpLater.depart(this);
        ['tyres','lights'].forEach(part => {
          const ok = this.checks[part], said = part === 'tyres'
            ? (ok ? 'Completed the tire check before departure.' : 'Departed without a correct tire check.')
            : (ok ? 'Completed the lights check before departure.' : 'Departed without a correct lights check.');
          this.log('departure:' + part, 'inspection', ok ? 'good' : 'needs', said);
        });
        this.log('departure:load', 'loading', this.secured ? 'good' : 'needs', this.secured ? 'Secured the load before departure.' : 'Departed with an unsecured load.');
        this.parcels.filter(p=>!p.anomaly).forEach(p => {
          if (this.routePlan) this.log('shelf:' + p.id, 'loading', p.location === 'slot' + p.stop ? 'good' : 'needs', p.location === 'slot' + p.stop ? 'Loaded the parcel in stop order.' : 'The parcel was not loaded in stop order.');
          this.log('departure:' + p.id, 'loading', p.scanned && p.location.startsWith('slot') ? 'good' : 'needs', p.scanned && p.location.startsWith('slot') ? `Loaded and scanned ${p.address}.` : 'A parcel was unscanned or left at the depot.'); });
        if(this.loadout)OTR.fpLoadout.depart(this);
      },
      tick(input, dt) {
        this.elapsed += dt;
        this._rearContact=false;
        if(OTR.fpMirrors)OTR.fpMirrors.tick(this,dt);
        if (this.kind === 'campaign') this.tickTraffic(dt);
        if(this.loadout)OTR.fpLoadout.findLater(this);
        const v = this.van, old = { x: v.x, z: v.z, speed: v.speed };
        motor.tick.call(this, input, dt);
        if(this.doorsteps)OTR.fpDoors.tick(this,input);
        if(this.routeDay)OTR.fpDay.tick(this,dt);
        if(this.driving)OTR.fpDriving.tick(this,dt,old);
        if (this.mode !== 'cab') return;
        if (Math.abs(v.speed) > 0.3 && !this.departed) this.preparation();
        if (Math.abs(v.speed) > 0.3) {
          if (!v.belt) this.log('belt:' + this.leg, 'safety', 'needs', 'Moved the van without fastening the seatbelt.');
          if (!this.secured) this.log('load:' + this.leg, 'loading', 'needs', 'Moved the van before securing the load.');
          if (!this.town && Math.abs(v.speed) > 6.71) this.log('speed:' + this.leg, 'driving', 'needs', 'Exceeded the posted 15 mph limit.');
          const junction = Math.abs(v.z + 27) < 7 || Math.abs(v.z + 89) < 7 || v.z < -116 || v.z > -8;
          if (!this.town && !junction && Math.abs(v.x) > 5.2) this.log('pavement:' + this.leg, 'driving', 'needs', 'Drove onto the sidewalk beside the road.');
          if (!this.town && !junction && Math.abs(v.speed) > 1 && ((Math.cos(v.yaw) > 0.7 && v.x < -0.4) || (Math.cos(v.yaw) < -0.7 && v.x > 0.4))) this.log('lane:' + this.leg, 'driving', 'needs', 'Travelled on the wrong side of the road.');
        }
        if (old.x >= 3.1 && v.x < 3.1 && v.speed > 0.3 && Math.cos(v.yaw) > 0.5) {
          const conflict = this.traffic.some(c => c.yaw === 0 && c.z > v.z - 4 && c.z < v.z + 17);
          this.log('pullout:' + this.leg, 'observation', !conflict && this.signal === -1 && (OTR.fpMirrors?OTR.fpMirrors.recent(this,0):false) ? 'good' : 'needs',
            conflict ? 'Pulled into the path of approaching traffic.' : this.signal !== -1 ? 'Pulled away without signaling left.' : !(OTR.fpMirrors&&OTR.fpMirrors.recent(this,0)) ? 'Pulled away without a recent mirror check.' : 'Checked, signaled and waited for a clear gap.');
          this.signal = 0;
        }
        const front = F.local(v, 0, -2.7), mark = this.stopSign;
        if (!this.town && !mark.resolved && v.x > 0 && Math.cos(v.yaw) > 0.7) {
          if (front.z > -24.1 && front.z < -19 && Math.abs(v.speed) < 0.1) mark.stopped = true;
          if (front.z < -24) { mark.resolved = true; this.log('stop-sign', 'driving', mark.stopped ? 'good' : 'needs', mark.stopped ? 'Stopped before the junction line.' : 'Passed the junction stop line without stopping.'); }
        }
        if (this.town) OTR.fpRoute.tick(this, old);
        this.tickCrossing(dt, old);
        const hitCar = this.traffic.some(c => F.vanBox(v, { x: c.x, z: c.z, w: 1.8, d: 3.6 }));
        if (hitCar) { this._rearContact=true;v.x = old.x; v.z = old.z; v.speed = 0; v.hand = true; this.log('traffic-contact:' + this.leg, 'safety', 'needs', 'Contact with traffic: stop and review the manoeuvre.'); }
        if(this._rearContact&&OTR.fpRear&&this.driving)OTR.fpRear.tick(this,0,old);
        if (!hitCar && Math.abs(old.speed) > 1 && v.speed === 0 && (input.forward || !input.back) && !v.hand) this.log('contact:' + this.leg, 'safety', 'needs', 'The van contacted an obstacle.');
      },
      tickTraffic(dt) {
        this.traffic.forEach(c => {
          const dir = c.yaw === 0 ? -1 : 1;
          const ahead = (this.van.z - c.z) * dir;
          const personAhead = (this.player.z - c.z) * dir;
          const walker = this.mode === 'walk' && Math.abs(this.player.x - c.x) < 1.3 && personAhead > 0 && personAhead < 4;
          const blocked = (this.driving&&OTR.fpDriving.blockTraffic(this,c)) || (Math.abs(this.van.x - c.x) < 2 && ahead > 0 && ahead < 9) || walker;
          const h = this.crossing, pedestrian = h.state === 'crossing' && Math.abs(h.x - c.x) < 2 && (h.z - c.z) * dir > 0 && (h.z - c.z) * dir < 10;
          const atLine = dir < 0 && c.z > -22.3 && c.z < -21.9 && !c.stopPassed;
          if (atLine) { c.wait = (c.wait || 0) + dt; if (c.wait >= 1) c.stopPassed = true; }
          if (!blocked && !pedestrian && !atLine) c.z += dir * c.speed * dt;
          if (c.z < (this.town ? this.bounds.z0 + 2 : -134) && this.van.z > (this.town ? this.bounds.z0 + 24 : -112)) { c.z = this.town ? this.bounds.z1 - 2 : 35; c.stopPassed = false; c.wait = 0; }
          if (c.z > (this.town ? this.bounds.z1 - 2 : 34) && this.van.z < (this.town ? this.bounds.z1 - 24 : 12)) c.z = this.town ? this.bounds.z0 + 2 : -134;
        });
      },
      tickCrossing(dt, old) {
        const h = this.crossing, v = this.van;
        if (h.state === 'waiting' && v.z < h.z+23 && v.z > h.z+3 && Math.cos(v.yaw) > 0.5) { h.state = 'developing'; this.touch(); }
        if (h.state === 'waiting' || h.state === 'resolved') return;
        h.clock += dt;
        if (v.z > h.z+7 && Math.abs(v.speed) < 3) h.early = true;
        if (h.clock > 2) { h.state = 'crossing'; h.x = Math.min(7, h.x + 1.1 * dt); }
        if (F.vanBox(v, { x: h.x, z: h.z, w: 0.55, d: 0.55 })) {
          this._rearContact=true;
          v.x = old.x; v.z = old.z; v.speed = 0; v.hand = true;
          this.log('pedestrian', 'safety', 'needs', 'Pedestrian conflict: the vehicle was stopped. Review the approach and yielding.');
        }
        if (v.z < h.z-4 || h.x >= 7) {
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
        const fields = ['version','kind','seed','phase','mode','elapsed','player','van','cargoOpen','secured','heldId','lastScan','briefing','checks','repaired','stops','parcels','logs','events','retrievals','departed','activeStop','requested','leg','mirrorAt','signal','crossing','stopSign','traffic'];
        if (this.routePlan) fields.push('routePlan', 'junctions');
        if(this.doorsteps)fields.push('doorsteps');
        if(this.routeDay)fields.push('routeDay');
        if(this.driving)fields.push('driving');
        if(this.loadout)fields.push('loadout');
        if(this.parking)fields.push('parking');
        const out = {}; fields.forEach(k => { out[k] = M.clone(this[k]); }); return out;
      }
    };
    if (routePlan && m.kind === 'campaign') OTR.fpRoute.apply(m, routePlan);
    m.parcels = m.stops.map(s => ({ id: 'parcel' + s.id, stop: s.id, address: s.address,
      tracking: routePlan ? routePlan.route[s.id].stop.packages[0].tracking : 'OTR-' + (10000 + seed % 80000) + '-' + (s.id + 1), weight: routePlan ? routePlan.route[s.id].stop.packages[0].weight : [4, 7, 3][s.id],
      location: 'depot', zone: null, scanned: false, stopScanned: false, loaded: false, returnRequired: false }));
    if(m.kind==='parking')OTR.fpRear.setupPractice(m);
    return m;
  },
  restore(raw) {
    try {
      if (!raw || raw.version !== this.VERSION || !['campaign','practice','parking'].includes(raw.kind)) return null;
      const m = this.create(raw.kind, raw.seed, raw.routePlan), data = this.clone(raw);
      if(OTR.fpLater&&OTR.fpLater.enabled(m)&&(!data.routeDay||!data.doorsteps))return null;
      if(data.doorsteps){if(!m.routePlan||!OTR.fpDoors.valid(m,data.doorsteps))return null;OTR.fpDoors.configure(m,data.doorsteps);}
      if(data.routeDay){if(!m.routePlan||!OTR.fpDay.valid(m,data.routeDay,data))return null;OTR.fpDay.configure(m,data.routeDay);}
      if(data.driving){if(!['campaign','parking'].includes(data.kind))return null;OTR.fpDriving.configure(m);if(!OTR.fpDriving.valid(m,data.driving,data.elapsed))return null;}
      if(data.kind==='parking'&&(!data.parking||typeof data.parking.done!=='boolean'||data.routePlan||data.loadout||data.routeDay||data.doorsteps))return null;
      if(data.loadout){if(data.kind!=='campaign')return null;OTR.fpLoadout.configure(m,data.loadout.kind);if(!OTR.fpLoadout.valid(m,data.loadout))return null;}
      if (data.briefing === undefined) data.briefing = null;
      if (data.briefing !== null && (!Number.isSafeInteger(data.briefing.day) || data.briefing.day < 1 ||
        typeof data.briefing.weather !== 'string' || !Number.isFinite(data.briefing.clockMin))) return null;
      if (!['prepare','route','return','debrief'].includes(data.phase) || !['walk','cab'].includes(data.mode)) return null;
      if (data.kind === 'practice' && data.mode === 'cab') return null;
      if (!Number.isFinite(data.elapsed) || data.elapsed < 0 || !Number.isFinite(data.seed)) return null;
      for (const actor of [data.player, data.van]) {
        if (!actor || !['x','z','yaw'].every(k => Number.isFinite(actor[k]))) return null;
        if (actor.x < m.bounds.x0 || actor.x > m.bounds.x1 || actor.z < m.bounds.z0 || actor.z > Math.max(40, m.bounds.z1)) return null;
      }
      if (!['speed','steer','gear','look'].every(k => Number.isFinite(data.van[k])) || !Number.isFinite(data.player.pitch)) return null;
      if (![2,-1,0,1].includes(data.van.gear) || !m.stops.some(s => s.id === data.activeStop) || ![-1,0,1].includes(data.signal)) return null;
      if(['headlights','wipers'].some(k=>data.van[k]!==undefined&&typeof data.van[k]!=='boolean') ||
        data.van.shifts!==undefined&&(!Number.isSafeInteger(data.van.shifts)||data.van.shifts<0))return null;
      if(OTR.fpMirrors&&!OTR.fpMirrors.valid(data.van.mirrors,data.elapsed))return null;
      if (!['retrievals','leg','mirrorAt'].every(k => Number.isFinite(data[k]))) return null;
      if (!data.checks || !['tyres','lights'].every(k => [null,true,false].includes(data.checks[k]))) return null;
      if (!data.stopSign || !['stopped','resolved'].every(k => typeof data.stopSign[k] === 'boolean')) return null;
      if (!['cargoOpen','secured','repaired','departed'].every(k => typeof data[k] === 'boolean') ||
        !['hand','belt'].every(k => typeof data.van[k] === 'boolean')) return null;
      if (![null,...m.parcels.map(p=>p.id)].includes(data.lastScan) || ![null,...m.parcels.map(p=>p.id)].includes(data.requested)) return null;
      if (!Array.isArray(data.parcels) || data.parcels.length !== m.parcels.length || !Array.isArray(data.stops) || data.stops.length !== m.stops.length) return null;
      const places = new Set(), held = [];
      for(let i=0;i<m.stops.length;i++){
        const s=data.stops[i],expected=m.stops[i];
        if(!s||s.id!==expected.id||s.address!==expected.address||s.x!==expected.x||s.z!==expected.z||s.service!==expected.service)return null;
        if(!['contacted','resolved'].every(k=>typeof s[k]==='boolean')||(s.resolved&&!['handover','safeplace','exception'].includes(s.outcome)))return null;
      }
      for (let i = 0; i < m.parcels.length; i++) {
        const p=data.parcels[i],expected=m.parcels[i];
        if(p&&p.stopScanned===undefined)p.stopScanned=false;
        if(!p||p.id!==expected.id||p.stop!==expected.stop||p.address!==expected.address||p.anomaly!==expected.anomaly)return null;
        if(!['scanned','stopScanned','loaded','returnRequired'].every(k=>typeof p[k]==='boolean')||typeof p.tracking!=='string'||!Number.isFinite(p.weight))return null;
        if(p.zone!==null&&!this.slots.some(s=>s.id===p.zone))return null;
        const locations=['depot','held','delivered','returned',...this.slots.map(s=>s.id)];
        if(expected.anomaly)locations.push('aside');
        if(m.loadout&&p.id===m.loadout.missingId)locations.push('pending');
        if(!locations.includes(p.location))return null;
        if(p.anomaly&&(['delivered','returned'].includes(p.location)||p.returnRequired||p.stopScanned))return null;
        if(p.location.startsWith('slot')){if(places.has(p.location))return null;places.add(p.location);}
        if(p.location==='held')held.push(p.id);
      }
      if(data.loadout){const L=data.loadout,p=data.parcels.find(p=>p.id===L.missingId);
        if(!p&&(L.missingReported||L.found||L.notice))return null;
        if(L.found&&(L.kind!=='late'||p.location==='pending'))return null;
        if(L.notice&&!L.found)return null;
        if(L.kind==='missing'&&L.missingReported&&p.location==='pending')return null;
      }
      if (held.length > 1 || (held[0] || null) !== data.heldId || !this.validLogs(data.logs)) return null;
      if (!data.events || typeof data.events !== 'object' || Array.isArray(data.events) || Object.values(data.events).some(v => v !== true)) return null;
      if (data.logs.some(l => data.events[l.id] !== true)) return null;
      if (!data.crossing || !['waiting','developing','crossing','resolved'].includes(data.crossing.state)) return null;
      if (![data.crossing.x,data.crossing.z,data.crossing.clock].every(Number.isFinite)) return null;
      if (!Array.isArray(data.traffic) || data.traffic.length !== 2 || data.traffic.some(c => ![c.x,c.z,c.yaw,c.speed].every(Number.isFinite))) return null;
      if (m.routePlan && (!Array.isArray(data.junctions) || data.junctions.length !== m.junctions.length || data.junctions.some((j,i) => j.x !== m.junctions[i].x || j.z !== m.junctions[i].z || typeof j.stopped !== 'boolean' || typeof j.passed !== 'boolean'))) return null;
      Object.keys(m.snapshot()).forEach(k => { if (!(k in data)) throw new Error('Missing field'); m[k] = data[k]; });
      if(m.doorsteps)OTR.fpDoors.attach(m);
      if(m.routeDay)OTR.fpDay.attach(m);
      if(m.driving)OTR.fpDriving.attach(m);
      m.paused = true; return m;
    } catch (_) { return null; }
  }
};

/* Local prototype checkpoints are deliberately separate from course/LMS records. */
OTR.fpStore = {
  key() { return (OTR.save ? OTR.save.localKey() : 'otr_save_v1') + '_firstperson_v2'; },
  empty() { return { version: 2, sequence: 0, welcomed: false, campaign: null, practice: null, parking:null, last: null, guidance:{intro:false,seen:[]} }; },
  read() {
    try {
      const data = JSON.parse(window.localStorage.getItem(this.key()));
      if (!data || data.version !== 2) return this.empty();
      const out = this.empty(); out.sequence = Number.isSafeInteger(data.sequence) && data.sequence >= 0 ? data.sequence : 0; out.welcomed = !!data.welcomed;
      if(data.guidance&&typeof data.guidance.intro==='boolean'&&Array.isArray(data.guidance.seen))out.guidance={intro:data.guidance.intro,seen:[...new Set(data.guidance.seen.filter(k=>typeof k==='string'&&/^[a-z]{1,20}$/.test(k)))].slice(0,24)};
      ['campaign','practice','parking'].forEach(k => { const m = OTR.fpMission.restore(data[k]); out[k] = m && m.kind === k ? m.snapshot() : null; });
      const last = data.last;
      out.last = last && ['campaign','practice'].includes(last.kind) && Number.isFinite(last.seed) &&
        Number.isFinite(last.elapsed) && last.elapsed >= 0 && OTR.fpMission.validLogs(last.logs) ? last : null; return out;
    } catch (_) { return this.empty(); }
  },
  write(data) {
    try { window.localStorage.setItem(this.key(), JSON.stringify(data)); return true; } catch (_) { return false; }
  }
};
