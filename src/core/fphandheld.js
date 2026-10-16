/* First-person workflow adapter for the existing courier handheld. No course record writes. */
window.OTR = window.OTR || {};
OTR.fpHandheld = class {
  constructor(scene) {
    this.scene = scene;
    this.mode = 'closed'; this.trigger = false; this.focusId = null; this.progress = 0;
    const Device=OTR.fpBrand?class extends OTR.Handheld{
      deviceTex(){return OTR.fpBrand.deviceTexture(this.scene,this);}
      show(def){super.show(def);OTR.fpBrand.deviceBackground(this,def);return this;}
    }:OTR.Handheld;
    this.device = new Device(scene, { depth: 110, canToggle: () => false, tabVisible: () => false });
    this.device.Yopen = OTR.H / 2;
    this.device.setTabVisible(false);
    // The first-person scene owns input, including pointer lock and pause. Do not answer keys twice.
    this.device.keyHandlers.forEach(([name, handler]) => scene.input.keyboard.off(name, handler));
    this.device.keyHandlers = [];
  }
  get isOpen() { return this.device.isOpen; }
  get aiming() { return this.isOpen && this.mode === 'aim'; }
  allowed() {
    const s = this.scene, m = s.model;
    if (!m || m.phase === 'debrief' || s.transitioning || s.external) return false;
    if (m.mode === 'cab' && !m.parked()) {
      m.log('handheld:' + m.leg, 'safety', 'needs', 'Tried to use the handheld before parking safely.');
      s.message('Stop and set the parking brake before using the handheld.'); s.checkpoint(); return false;
    }
    return true;
  }
  show(def, aiming = false) {
    if (!this.allowed()) return false;
    const s = this.scene;
    this.signatureToken=null;this.mode = aiming ? 'aim' : 'menu'; this.trigger = false; this.progress = 0; this.focusId = null;
    s.closePanel(false); s.model.paused = !aiming; s.held = Object.create(null); s.pointerStart = null;
    this.device.open(def); if (!aiming) s.releaseMouse(); s.checkpoint();
    if(OTR.fpAccess)OTR.fpAccess.layoutDevice(this);
    if (OTR.a11y) OTR.a11y.say([def.title,...(def.lines||[]).map(line=>typeof line==='string'?line:line.text),...(def.options||[]).map(o=>o.label)].map(t=>OTR.i18n.t(t)).join('. '));
    return true;
  }
  close(resume = true) {
    if (!this.isOpen) return;
    const s = this.scene;
    this.signatureToken=null;this.mode = 'closed'; this.trigger = false; this.progress = 0; this.focusId = null;
    this.device.close(); this.device.root.setVisible(false);
    if (OTR.a11y) OTR.a11y.hush();
    s.held = Object.create(null); s.pointerStart = null; s.inputBlockedUntil = s.time.now + 180;
    if (s.model) s.model.paused = !resume || s.model.phase === 'debrief';
    s.checkpoint(); if (resume) s.capture();
  }
  toggle() { if (this.isOpen) this.close(); else this.home(); }
  choose(index) {
    const option = this.device.current && (this.device.current.options || [])[index];
    if (option && !option.disabled && option.onPick) option.onPick();
  }
  home() {
    const m = this.scene.model; if (!m) return;
    const p = m.parcel(m.heldId), stop = m.stop(m.activeStop);
    this.show({ title: 'HANDHELD', lines: [
      { text: stop.address, bold: true },
      p ? `Carrying: ${p.address}` : 'Retrieve the parcel from its cargo shelf.',
      m.serviceLabel(stop.id)
    ], options: [
      { label: 'Scan package', onPick: () => this.scan() },
      { label: 'Stop details', onPick: () => this.stop(stop.id) },
      { label: 'Route', onPick: () => this.route() },
      ...(m.loadout&&(m.phase==='prepare'||m.near('dispatch'))?[{label:'Check the load',onPick:()=>this.loadCheck()}]:[]),
      ...(m.routeDay&&m.phase!=='prepare'&&!(m.loadout&&m.near('dispatch'))?[{label:'Route-day updates',onPick:()=>this.day()}]:[])
    ], footer: OTR.fpAccess?`Press ${OTR.fpAccess.key('Tab')} to put the handheld away.`:'TAB put away' });
  }
  day(){
    const m=this.scene.model,d=m.routeDay.dispatch;
    this.show({title:'ROUTE-DAY UPDATES',lines:[`The forecast is ${m.routeDay.weather}.`,d&&d.sent?'Dispatch has sent a stop update.':'There is no dispatch update yet.'],options:[
      {label:'Read the dispatch update',disabled:!d||!d.sent,onPick:()=>{if(!this.allowed())return;this.show({title:'DISPATCH UPDATE',lines:[OTR.fpDay.read(m)],options:[{label:'Back',onPick:()=>this.day()}]});}},
      {label:'Weather and breaks',onPick:()=>this.show({title:'TODAY’S WEATHER',lines:[OTR.fpDay.driveText(m)||'Conditions are clear. Follow the posted speed limits.'],options:[
        ...(m.routeDay.weather==='heat'?[{label:'Take a water and shade break',onPick:()=>{this.scene.message(OTR.fpDay.rest(m));this.scene.checkpoint();this.close();}}]:[]),
        {label:'Back',onPick:()=>this.day()}]})}
    ],back:()=>this.home()});
  }
  loadCheck(){
    const m=this.scene.model;if(!m||!m.loadout)return;
    const action=fn=>{const text=fn();this.scene.checkpoint();this.show({title:'LOAD CHECK',lines:[text],options:[{label:'Back',onPick:()=>this.loadCheck()},{label:'Put away',onPick:()=>this.close()}]});};
    this.show({title:'LOAD CHECK',lines:[`The manifest lists ${m.stops.length} packages.`,m.departed?'Bring missing or unlisted packages to Dispatch.':'Match the loaded packages to the manifest.'],options:[
      {label:'Confirm the load count',disabled:m.departed,onPick:()=>{if(!m.near('dispatch')){action(()=> 'Confirm the load count at Dispatch.');return;}this.close(false);this.scene.showLoadCount();}},
      {label:'Report a missing package',onPick:()=>action(()=>OTR.fpLoadout.missing(m))},
      {label:'Set the unlisted package aside',onPick:()=>action(()=>OTR.fpLoadout.aside(m))}
    ],back:()=>this.home()});
  }
  route() {
    const m = this.scene.model;
    if(m.town){this.close(false);this.scene.showRoute();return;}
    this.show({ title: 'ROUTE', lines: ['Choose a stop to see its requirements and recorded shelf.'],
      options: m.stops.map(stop => ({ label: (stop.resolved ? '✓ ' : '') + stop.address, onPick: () => this.stop(stop.id) })),
      back: () => this.home() });
  }
  stop(id) {
    const m = this.scene.model, stop = m.stop(id), p = m.parcels.find(p => p.stop === id);
    const shelf = OTR.fpMission.slots.find(slot => slot.id === p.zone);
    this.show({ title: stop.resolved ? 'STOP RECORDED' : 'STOP DETAILS', lines: [
      { text: stop.address, bold: true }, m.serviceLabel(id),
      `Recorded shelf: ${shelf ? shelf.name : 'Not recorded'}`,
      stop.resolved ? `Outcome: ${({ handover: 'Handed to resident', safeplace: 'Left in porch box', exception: 'Recipient absent' })[stop.outcome] || stop.outcome}` : p.stopScanned ? 'Scanned at this stop' : 'Delivery scan required'
    ], options: [
      { label: 'Scan package', onPick: () => this.scan(), disabled: stop.resolved },
      { label: 'Record delivery / exception', onPick: () => this.delivery(id), disabled: stop.resolved || m.kind === 'practice' },
      { label: 'Set as next stop', onPick: () => { m.activeStop = id; m.touch(); this.scene.checkpoint(); this.close(); }, disabled: stop.resolved || m.kind === 'practice' }
    ], back: () => this.home() });
  }
  scan() {
    const m = this.scene.model;
    if (!m || !this.allowed()) return;
    if (m.mode !== 'walk') {
      this.show({ title: 'SCAN', lines: ['Step out of the cab and find the physical parcel first.'],
        options: [{ label: 'Back', onPick: () => this.home() }] }); return;
    }
    if (!this.show({ title: 'SCAN', lines: [
      'Aim at the barcode on the parcel.', OTR.fpAccess?`Hold ${OTR.fpAccess.key('Space')} or the left mouse button until the scan completes.`:'Hold Space or the left mouse button until the scan completes.'
    ], options: [{ label: 'Cancel', onPick: () => this.home() }], footer: OTR.fpAccess?`Press ${OTR.fpAccess.key('Tab')} to put the handheld away.`:'TAB put away' }, true)) return;
    // Locked-pointer trigger clicks must not also press a device button under the old cursor position.
    (this.device.optionBtns || []).forEach(button => button.bg.disableInteractive());
    this.mode = 'aim'; m.paused = false; this.scene.capture(); this.scene.sync();
  }
  tick(seconds, pressed) {
    if (!this.aiming) return;
    const s = this.scene, m = s.model;
    const id = s.art.scanTarget(), p = m.parcel(id);
    const accessible = p && m.canParcel(p);
    if (!accessible || !pressed) { this.progress = 0; this.focusId = accessible ? p.id : null; return; }
    if (this.focusId !== id) { this.focusId = id; this.progress = 0; }
    this.progress += Math.min(Math.max(seconds, 0), 0.05);
    if (this.progress < 0.45) return;
    const result = m.scan(id), mismatch = !!p.anomaly || m.phase === 'route' && p.stop !== m.activeStop && !p.returnRequired;
    const returned = p.returnRequired && m.heldId === p.id && m.near('returns');
    const receipt = returned ? m.returnParcel() : result;
    s.checkpoint(); if (OTR.audio) OTR.audio.play(mismatch ? 'error' : 'scan');
    this.show({ title: returned ? 'RETURN RECORDED' : mismatch ? 'SCAN ALERT' : 'SCAN OK', color: mismatch ? 0xC8243B : 0x1E9E6B,
      lines: [{ text: p.tracking, bold: true }, p.address, receipt], options: [
        { label: 'Put away', onPick: () => this.close() },
        { label: 'Stop details', onPick: () => this.stop(m.activeStop) }
      ] });
  }
  checks(id){
    const m=this.scene.model,a=m._doorSpecs[id],d=m.doorsteps.stops[id];if(!OTR.fpDoors.can(m,id))return;
    this.show({title:'DELIVERY CHECKS',lines:[a.person?`Person at the door: ${a.person}`:'Nobody is present to receive the parcel.',m.serviceLabel(id)],options:[
      ...(a.adult?[{label:d.idViewed?'Review the photo ID':'Check the photo ID',onPick:()=>{this.close(false);this.scene.showIdentity(id);}}]:[]),
      ...(a.signature&&a.present?[{label:d.signatureName?'Review the signature':'Capture the signature',onPick:()=>this.signature(id)}]:[]),
      ...(a.difficult?[{label:'Speak with the customer',onPick:()=>{this.close(false);this.scene.showCustomer(id);}}]:[]),
      {label:'Record the delivery outcome',onPick:()=>this.delivery(id)}
    ],back:()=>this.delivery(id)});
  }
  signature(id){
    const m=this.scene.model,a=m._doorSpecs[id];if(!OTR.fpDoors.can(m,id)||!a.present)return;
    const sign=name=>{
      const token={};this.show({title:'SIGNATURE',lines:['The recipient signs below.'],widget:{type:'signature',onDone:()=>{
        if(this.signatureToken!==token||!this.isOpen)return;
        const text=OTR.fpDoors.sign(m,id,name);this.scene.checkpoint();this.show({title:'SIGNATURE RECORDED',lines:[text,`Printed name: ${name}`],options:[{label:'Back',onPick:()=>this.checks(id)}]});
      }},options:[{label:'Cancel',onPick:()=>this.checks(id)}]});this.signatureToken=token;
    };
    this.show({title:'SIGNER’S PRINTED NAME',lines:[`Person at the door: ${a.person}`,'Record the name of the person who signs.'],options:[
      {label:`Record ${a.person}`,onPick:()=>sign(a.person)},
      ...(a.to!==a.person?[{label:`Record ${a.to}`,onPick:()=>sign(a.to)}]:[{label:'Record Occupant',onPick:()=>sign('Occupant')}]),
      {label:'Back',onPick:()=>this.checks(id)}]});
  }
  delivery(id) {
    const m = this.scene.model, stop = m.stop(id);
    if (!stop || m.kind !== 'campaign') return;
    if (!(m.doorsteps?OTR.fpDoors.near(m,id):m.near('door' + id)) || m.mode !== 'walk') {
      this.show({ title: 'DELIVERY', lines: ['Approach the delivery point with the parcel first.'],
        options: [{ label: 'Back', onPick: () => this.stop(id) }] }); return;
    }
    const p = m.parcel(m.heldId);
    if (!p || !p.stopScanned) {
      this.show({ title: 'NOT SCANNED', lines: ['Retrieve and scan the physical parcel at this stop before recording a delivery.'],
        options: [{ label: 'Scan package', onPick: () => this.scan() }, { label: 'Put away', onPick: () => this.close() }] }); return;
    }
    const record = outcome => {
      const text = m.deliver(id, outcome); this.scene.checkpoint();
      this.show({ title: stop.resolved ? 'STOP RECORDED' : 'CHECK DELIVERY', lines: [stop.address, text],
        options: [{ label: 'Put away', onPick: () => this.close() }, { label: 'Stop details', onPick: () => this.stop(id) }] });
    };
    this.show({ title: 'DELIVERY', lines: [stop.address, m.serviceLabel(id)], options: [
      { label: 'Hand to resident', skin: 'ghost', onPick: () => record('handover') },
      { label: 'Leave in porch box', skin: 'ghost', onPick: () => record('safeplace') },
      { label: m.doorsteps?'Record a delivery exception':'Recipient absent', skin: 'ghost', onPick: () => record('exception') },
      ...(m.doorsteps&&(m._doorSpecs[id].adult||m._doorSpecs[id].signature&&m._doorSpecs[id].present||m._doorSpecs[id].difficult)?[{label:'Delivery checks',skin:'ghost',onPick:()=>this.checks(id)}]:[]),
      ...(m.routeDay&&OTR.fpDay.planter(m,id)?[{label:'Place behind the planter',skin:'ghost',onPick:()=>record('planter')}]:[])
    ], back: () => this.stop(id) });
  }
};
