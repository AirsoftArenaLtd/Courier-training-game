/*
 * The 3D workday from the hub, the way a new courier plays it (flow, from index.html?dev=1&workday3d=1):
 * name entry, the hub's "Start workday", the morning brief at Dispatch, loading the van with the real pickup, scanner
 * and shelf interactions, the pre-trip, belt, the first drive leg on throttle and brake (stop line included), parking,
 * the doorstep scan and a delivery outcome at each of the three stops, the return scan, "Finish workday", then the
 * results screen, the debrief and the record. The layout audit runs at the moments a trainee reads the screen,
 * including the 3D prototype's own text (it is not scroll-factor pinned, so the generic audit cannot see all of it).
 * Position fixtures skip walking between tasks (as test/fpbrowser.js does); everything else is real input.
 */
const { wait, clickText } = require('./lib/ui');

const FP = "OTR.game.scene.getScene('FirstPersonScene')";

module.exports = async (page, ctx) => {
  const ev = (fn, ...args) => page.evaluate(fn, ...args);
  const state = () => ev(() => { const s = OTR.game.scene.getScene('FirstPersonScene'), m = s.model; return { area: s.area, panel: !!s.panel, device: s.handheld.isOpen, aiming: s.handheld.aiming, m: m && m.snapshot() }; });
  const press = async (key) => { await page.keyboard.press(key); await wait(180); };
  const must = (ok, what) => { if (!ok) throw new Error('workday-3d: ' + what); };

  // the prototype's visible text must stay on the canvas and inside the device screen
  const shot = async (label) => {
    await wait(400);
    await ctx.audit(label);
    const bad = await ev(() => {
      const s = OTR.game.scene.getScene('FirstPersonScene'), hh = s.handheld.device, out = [];
      const visit = (o) => {
        if (!o || !o.visible || o.alpha <= 0.05) return;
        if (o.type === 'Text') { const b = o.getBounds(); if (b.x < -2 || b.y < -2 || b.right > 1282 || b.bottom > 722) out.push(OTR.i18n.src(o)); }
        (o.list || []).forEach(visit);
      };
      (s.panel ? [s.panel.root] : hh.isOpen ? [hh.root] : s.children.list).forEach(visit);
      if (hh.isOpen) hh.screen.list.filter((o) => o.type === 'Text').forEach((o) => { const b = o.getBounds(); if (b.bottom > hh.root.y + hh.sy + hh.sh + 2 || b.right > hh.root.x + hh.sx + hh.sw + 2) out.push('device: ' + OTR.i18n.src(o)); });
      return out;
    });
    must(!bad.length, `(${label}) text off the canvas: ${JSON.stringify(bad.slice(0, 3))}`);
    await ctx.snap('3d-' + label);
  };
  const pose = async (x, z, id, barcode = false) => {
    await ev((x, z, id, barcode) => {
      const s = OTR.game.scene.getScene('FirstPersonScene'), m = s.model; Object.assign(m.player, { x, z }); s.sync();
      const visible = (o) => { for (let a = o; a; a = a.parent) if (!a.visible) return false; return true; };
      const o = barcode ? s.art.parcels[Number(id.slice(6))].userData.barcode : s.art.interactions.find((o) => o.userData.interaction === id && visible(o));
      if (!o) throw Error('No visible target ' + id);
      const v = o.getWorldPosition(new THREE.Vector3()), eye = s.view.camera.position, dx = v.x - eye.x, dz = v.z - eye.z;
      m.player.yaw = Math.atan2(dx, -dz); m.player.pitch = Math.atan2(eye.y - v.y, Math.hypot(dx, dz)); s.sync();
    }, x, z, id, barcode);
    await wait(100);
  };
  const aimPoint = async (id) => { const pt = await ev((id) => OTR.game.scene.getScene('FirstPersonScene').model.point(id), id); await pose(pt.x, pt.z + 1.5, id); };
  const scan = async () => {
    await press('Tab'); await press('Digit1');
    must((await state()).aiming, 'the scanner did not enter aiming mode');
    await page.keyboard.down('Space');
    await ctx.until(`!${FP}.handheld.aiming`, 20000);
    await page.keyboard.up('Space'); await wait(180);
    must(!(await state()).aiming && (await state()).device, 'the trigger did not open a scan result');
  };

  // ---- the hub: a new courier starts the 3D workday
  await ev(() => localStorage.clear());
  await ctx.reload();
  await page.keyboard.press('Enter'); await wait(900);
  await page.keyboard.type('QA Courier'); await page.keyboard.press('Enter');
  must(await ctx.until(`OTR.game.scene.getScenes(true).some(s => s.sys.settings.key === 'HubScene')`, 15000), 'never reached the hub');
  await wait(900);
  await ctx.audit('hub with the workday card');
  await clickText(page, 'HubScene', /Start workday/);
  must(await ctx.until(`(OTR.game.scene.getScene('HubScene')._modalStack || []).length > 0`, 4000), 'Start workday opened no confirmation');
  await ctx.audit('start confirmation');
  await clickText(page, 'HubScene', /^Start ▶$/);
  must(await ctx.until(`!!(OTR.game.scene.isActive('FirstPersonScene') && !${FP}.loading && ${FP}.model)`, 90000), 'the 3D scene never opened from the hub');
  await wait(800);
  must((await state()).m.kind === 'campaign', 'the hub did not start a campaign workday');
  must(await ev(() => !!OTR.workday.saved().current), 'no workday in progress after Start');
  await shot('start');

  // ---- the opening panel ("Walk to Dispatch and read the morning brief"), then dispatch: the brief and the manifest
  if ((await state()).panel) { await press('Digit1'); must(!(await state()).panel, 'the opening panel did not close'); }
  await pose(-12.1, 11, 'dispatch'); await press('KeyE'); await shot('morning-brief');
  for (let i = 0; i < 30; i++) {
    const s = await state();
    if (s.m.events['brief:' + s.m.seed]) break;
    await press('Digit1');
  }
  { const s = await state(); must(!!s.m.events['brief:' + s.m.seed], 'the brief and manifest could not be read to the end'); }

  // ---- load the van with the real interactions
  for (let i = 0; i < 3; i++) {
    await pose(-9, 4 - i * 3, 'parcel' + i); await press('KeyE');
    must((await state()).m.heldId === 'parcel' + i, 'could not pick up parcel ' + i);
    await scan(); must((await state()).m.parcels[i].scanned, 'the depot scan did not register for parcel ' + i);
    if (i === 0) await shot('scan-result');
    await press('Digit1');
    if (i === 0) { await aimPoint('cargo'); await press('KeyE'); must((await state()).m.cargoOpen, 'the cargo doors did not open'); }
    await pose(4, 8 + 2.05 - i * 1.05 + 0.65, 'slot' + i); await press('KeyE');
    must((await state()).m.parcels[i].location === 'slot' + i, 'could not place parcel ' + i + ' on its shelf');
  }
  await aimPoint('secure'); await press('KeyE'); must((await state()).m.secured, 'the cargo restraint did not secure the load');
  await shot('cargo');
  await pose(5.5, 11.6, 'cargo'); await press('KeyE'); must(!(await state()).m.cargoOpen, 'the cargo doors did not close');

  // ---- pre-trip walkaround
  for (const part of ['tyres', 'lights']) {
    if (part === 'tyres') await pose(1.6, 6.4, part); else await pose(4, 4, part);
    await press('KeyE'); await shot('inspection-' + part);
    const fault = await ev(() => OTR.game.scene.getScene('FirstPersonScene').model.fault);
    await press(part === fault ? 'Digit2' : 'Digit1');
  }

  // ---- the cab: belt, parking brake, the first leg on throttle and brake
  await pose(1.6, 6.3, 'driver'); await press('KeyE');
  must((await state()).m.mode === 'cab', 'could not enter the cab');
  await press('KeyB'); await press('KeyM'); await shot('cab-guidance');
  await press('Space');
  const driveTo = async (z) => {
    const end = Date.now() + 60000; let fwd = false, brake = false;
    while (Date.now() < end) {
      const v = (await state()).m.van, d = v.z - z, stop = d <= v.speed * v.speed / 10 + 0.6, gas = !stop && v.speed < 5.5;
      if (gas !== fwd) { await page.keyboard[gas ? 'down' : 'up']('KeyW'); fwd = gas; }
      if (stop !== brake) { await page.keyboard[stop ? 'down' : 'up']('KeyS'); brake = stop; }
      if (stop && Math.abs(v.speed) < 0.12) { await page.keyboard.up('KeyW'); await page.keyboard.up('KeyS'); return; }
      await wait(120);
    }
    throw new Error('workday-3d: the drive leg did not arrive');
  };
  await driveTo(-20); await wait(500);
  must((await state()).m.stopSign.stopped, 'the van did not make a full stop at the junction line');
  await shot('junction');
  await driveTo(-42); await press('Space');
  must((await state()).m.logs.some((l) => l.id === 'stop-sign' && l.outcome === 'good'), 'the safe stop-line response was not logged');
  await shot('arrival');
  await press('KeyE'); must((await state()).m.mode === 'walk', 'could not park and get out');

  // ---- three stops
  for (let i = 0; i < 3; i++) {
    if (i > 0) await ev((i) => { const s = OTR.game.scene.getScene('FirstPersonScene'), m = s.model; Object.assign(m.van, { x: 4, z: m.stops[i].z, yaw: 0, speed: 0, hand: true }); m.activeStop = i; s.sync(); }, i);
    const vz = (await state()).m.van.z;
    await pose(4, vz + 4, 'cargo'); await press('KeyE'); must((await state()).m.cargoOpen, 'could not open the cargo at stop ' + i);
    const pz = vz + 2.05 - i * 1.05;
    await pose(4, pz + 1.15, 'parcel' + i, true);
    await scan(); must(!(await state()).m.parcels[i].stopScanned, 'a cargo scan must not count as the doorstep scan (stop ' + i + ')');
    await press('Digit1');
    await pose(4, pz + 0.65, 'parcel' + i); await press('KeyE'); must((await state()).m.heldId === 'parcel' + i, 'could not take parcel ' + i + ' out of the van');
    const stop = (await state()).m.stops[i];
    await pose(8.4, stop.z, 'door' + i);
    await scan(); must((await state()).m.parcels[i].stopScanned, 'the doorstep scan did not register (stop ' + i + ')');
    if (i === 0) await shot('doorstep-scan');
    await press('Digit1');
    await press('KeyE'); await press('Digit1'); await shot('contact-' + i); await press('Digit1');
    must((await state()).device, 'the door did not open the delivery on the handheld');
    await shot('delivery-options-' + i);
    await press(stop.service === 'handover' ? 'Digit1' : stop.service === 'safeplace' ? 'Digit2' : 'Digit3');
    must((await state()).m.stops[i].resolved, 'the delivery outcome was not recorded (stop ' + i + ')');
    await shot('receipt-' + i); await press('Digit1');
    if (stop.service === 'signature') { await pose(4, pz + 0.65, 'slot' + i); await press('KeyE'); must((await state()).m.parcels[i].location === 'slot' + i, 'could not put the signature parcel back'); }
    await aimPoint('secure'); await press('KeyE'); await pose(5.5, vz + 3.6, 'cargo'); await press('KeyE');
  }
  must((await state()).m.phase === 'return', 'the three stops did not lead to the return phase');

  // ---- back at the depot: the retained parcel is scanned in at Returns, then Dispatch finishes the day
  await ev(() => { const s = OTR.game.scene.getScene('FirstPersonScene'); Object.assign(s.model.van, { x: 4, z: 8, yaw: 0, speed: 0, hand: true }); s.sync(); });
  await aimPoint('cargo'); await press('KeyE');
  const ret = (await state()).m.parcels.find((p) => p.returnRequired);
  must(!!ret, 'no parcel to return (the day should keep one)');
  const slot = Number(ret.location.slice(4));
  await pose(4, 8 + 2.05 - (slot % 3) * 1.05 + 0.65, ret.id); await press('KeyE');
  await pose(-12.2, 5, 'returns'); await press('KeyE');
  must((await state()).aiming, 'Returns did not open the barcode scanner');
  await page.keyboard.down('Space'); await ctx.until(`!${FP}.handheld.aiming`, 20000); await page.keyboard.up('Space'); await wait(200);
  must((await state()).m.parcels[ret.stop].location === 'returned', 'the return scan did not check the parcel in');
  await shot('return-receipt'); await press('Digit1');
  await pose(-12.1, 11, 'dispatch'); await press('KeyE'); await shot('dispatch-finish');
  await press('Digit1');                                       // Finish workday

  // ---- the shared workday flow takes over: results, debrief, record
  must(await ctx.until(`OTR.game.scene.isActive('ResultsScene')`, 30000), 'Finish workday did not open the results screen');
  await wait(2800);
  await ctx.audit('results');
  const saved = await ev(() => { const w = OTR.workday.saved(); return { last: !!w.last, stars: w.last && w.last.stars, current: !!w.current, hist: OTR.save.data.history.map((h) => h.id) }; });
  must(saved.last && !saved.current, 'the finished day is not on the record (or is still in progress)');
  must(saved.hist.includes('workday'), 'the record has no workday run');
  must(saved.stars && Object.values(saved.stars).every((n) => n >= 0), 'the results carry no star ratings');
  const texts = await ev(() => { const out = []; const walk = (o) => { if (o.visible === false) return; if (o.type === 'Text') out.push(OTR.i18n.src(o)); (o.list || []).forEach(walk); }; OTR.game.scene.getScene('ResultsScene').children.list.forEach(walk); return out.join(' | '); });
  must(/workday|Workday/.test(texts), 'the results screen does not say it is the workday: ' + texts.slice(0, 160));
  await ctx.snap('results');
  await clickText(page, 'ResultsScene', /Debrief/);
  must(await ctx.until(`OTR.game.scene.isActive('WorkdayDebriefScene')`, 15000), 'the debrief did not open');
  await wait(1200);
  await ctx.audit('debrief');
  const rows = await ev(() => OTR.game.scene.getScene('WorkdayDebriefScene').rows.filter((r) => !r.head).length);
  must(rows >= 3, 'the debrief lists too few lines: ' + rows);
  await ctx.snap('debrief');
};
