/* First-person workflow adapter for the existing courier handheld. No course record writes. */
window.OTR = window.OTR || {};
OTR.fpHandheld = class {
  constructor(scene) {
    this.scene = scene;
    this.mode = 'closed'; this.trigger = false; this.focusId = null; this.progress = 0;
    this.device = new OTR.Handheld(scene, { depth: 110, canToggle: () => false, tabVisible: () => false });
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
    this.mode = aiming ? 'aim' : 'menu'; this.trigger = false; this.progress = 0; this.focusId = null;
    s.closePanel(false); s.model.paused = !aiming; s.held = Object.create(null); s.pointerStart = null;
    this.device.open(def); if (!aiming) s.releaseMouse(); s.checkpoint();
    if (OTR.a11y) OTR.a11y.say(OTR.i18n.t(def.title) + '. ' + (def.lines || []).map(line => OTR.i18n.t(typeof line === 'string' ? line : line.text)).join(' '));
    return true;
  }
  close(resume = true) {
    if (!this.isOpen) return;
    const s = this.scene;
    this.mode = 'closed'; this.trigger = false; this.progress = 0; this.focusId = null;
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
      { label: 'Route', onPick: () => this.route() }
    ], footer: 'TAB put away' });
  }
  route() {
    const m = this.scene.model;
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
      'Aim at the barcode on the parcel.', 'Hold Space or the left mouse button until the scan completes.'
    ], options: [{ label: 'Cancel', onPick: () => this.home() }], footer: 'TAB put away' }, true)) return;
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
    const result = m.scan(id), mismatch = m.phase === 'route' && p.stop !== m.activeStop && !p.returnRequired;
    const returned = p.returnRequired && m.heldId === p.id && m.near('returns');
    const receipt = returned ? m.returnParcel() : result;
    s.checkpoint(); if (OTR.audio) OTR.audio.play(mismatch ? 'error' : 'scan');
    this.show({ title: returned ? 'RETURN RECORDED' : mismatch ? 'SCAN ALERT' : 'SCAN OK', color: mismatch ? 0xC8243B : 0x1E9E6B,
      lines: [{ text: p.tracking, bold: true }, p.address, receipt], options: [
        { label: 'Put away', onPick: () => this.close() },
        { label: 'Stop details', onPick: () => this.stop(m.activeStop) }
      ] });
  }
  delivery(id) {
    const m = this.scene.model, stop = m.stop(id);
    if (!stop || m.kind !== 'campaign') return;
    if (!m.near('door' + id) || m.mode !== 'walk') {
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
      { label: 'Recipient absent', skin: 'ghost', onPick: () => record('exception') }
    ], back: () => this.stop(id) });
  }
};
