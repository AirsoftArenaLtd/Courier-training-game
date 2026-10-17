/*
 * The 3D workday from the hub, the way a new courier plays it (flow, from index.html?dev=1&workday3d=1):
 * name entry, the hub's "Start workday", the morning brief at Dispatch, loading the van with the real pickup, scanner
 * and shelf interactions, the pre-trip, belt, the first drive leg on throttle and brake (stop line included), parking,
 * the doorstep scan and a delivery outcome at each of the five stops, the return scan, "Finish workday", then the
 * results screen, the debrief and the record. The layout audit runs at the moments a trainee reads the screen,
 * including the 3D prototype's own text (it is not scroll-factor pinned, so the generic audit cannot see all of it).
 * Position fixtures skip walking between tasks (as test/fpbrowser.js does); everything else is real input.
 */
const { wait, clickText } = require('./lib/ui');

const FP = "OTR.game.scene.getScene('FirstPersonScene')";

// opts.seq / opts.day choose the day's generated route (the courier's workday number and the route's seed), so other days'
// doorstep situations are played too: node test/qa.js --only workday-3d-b,workday-3d-c (test/paths/workday-3d-b.js, -c.js)
const make = (opts) => async (page, ctx) => {
  opts = opts || {};
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
  // stand where the player would stand to use a thing, looking at it (the geometry comes from the model, so the flow
  // follows the generated route instead of fixed coordinates); the use itself is a real key press
  const at = async (id, barcode = false) => {
    await ev((id, barcode) => {
      const s = OTR.game.scene.getScene('FirstPersonScene'), m = s.model, pt = m.point(id); if (!pt) throw Error('No point ' + id); s.handheld.close(); s.closePanel();
      Object.assign(m.player, { x: pt.x, z: pt.z });
      if (id.startsWith('parcel') && m.parcel(id).location === 'depot') m.player.x -= 1.6;
      else if (id.startsWith('door')) m.player.x -= m.stop(id.slice(4)).side * 1.5;
      else if (id === 'dispatch' || id === 'returns') m.player.x -= 1.6;
      else if (id.startsWith('slot') || (id.startsWith('parcel') && m.parcel(id).location.startsWith('slot'))) { const d = barcode ? 1.15 : 0.65; m.player.x -= Math.sin(m.van.yaw) * d; m.player.z += Math.cos(m.van.yaw) * d; }
      else if (id === 'cargo' || id === 'secure') { const d = id === 'cargo' ? 1.25 : 0.65; m.player.x -= Math.sin(m.van.yaw) * d; m.player.z += Math.cos(m.van.yaw) * d; }
      else if (id.startsWith('gate')) m.player.x -= m.stop(id.slice(4)).side * 1.2;   // outside the gate, away from the yard
      else if (id === 'lights') m.player.z -= 1.2;
      else if (id === 'tyres') m.player.x -= 1.0;                          // beside the wheel, looking down at it: the driver's door above it shares the spot
      else if (id === 'driver') m.player.x -= 0.09;
      else m.player.z += 0.65;
      s.sync();
    }, id, barcode);
    await wait(160);                                  // a frame, so the camera has moved to the new place before aiming from it
    await ev((id, barcode) => {
      const s = OTR.game.scene.getScene('FirstPersonScene'), m = s.model;
      const visible = (o) => { for (let a = o; a; a = a.parent) if (!a.visible) return false; return true; };
      const o = barcode ? s.art.parcels[Number(id.slice(6))].userData.barcode : s.art.interactions.find((o) => o.userData.interaction === id && visible(o));
      if (!o) throw Error('No visible target ' + id + ' ' + JSON.stringify({ n: s.art.interactions.filter((o) => o.userData.interaction === id).length, mode: m.mode, van: m.van, player: m.player }));
      const v = o.getWorldPosition(new THREE.Vector3()), eye = s.view.camera.position, dx = v.x - eye.x, dz = v.z - eye.z;
      m.player.yaw = Math.atan2(dx, -dz); m.player.pitch = Math.atan2(eye.y - v.y, Math.hypot(dx, dz)); s.sync();
    }, id, barcode);
    await wait(100);
  };
  const use = async (id) => { await at(id); await press('KeyE'); };
  // choose an option of whatever is on screen (a panel or the handheld) by its English text, with a real number key
  const pick = async (re) => {
    const find = () => ev((src, flags) => {
      const re = new RegExp(src, flags), s = OTR.game.scene.getScene('FirstPersonScene');
      const opts = s.panel ? s.panel.choices : s.handheld.isOpen ? (s.handheld.device.current.options || []) : [];
      return opts.findIndex((o) => re.test(o.label) && !o.disabled);
    }, re.source, re.flags);
    let i = -1;
    for (let t = 0; t < 40 && i < 0; t++) { i = await find(); if (i < 0) await wait(150); }
    must(i >= 0, 'no option matching ' + re + ' on screen: ' + JSON.stringify(await ev(() => { const s = OTR.game.scene.getScene('FirstPersonScene'); return { panel: s.panel ? s.panel.choices.map((o) => o.label) : null, device: s.handheld.isOpen ? (s.handheld.device.current.options || []).map((o) => o.label) : null }; })));
    await press('Digit' + (i + 1));
  };
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
  if (opts.seq || opts.day) {
    await ev((o) => {
      const empty = OTR.fpStore.empty(); empty.sequence = (o.seq || 1) - 1; OTR.fpStore.write(empty);   // the next route's seed
      OTR.save.data.route = OTR.save.data.route || { days: 0, best: {}, history: [] }; OTR.save.data.route.days = (o.day || 1) - 1;
    }, opts);
  }
  // opts.aids: the trainer's 3D workday aids (A-21), saved as the trainer's Save rules does, before the day starts
  if (opts.aids) {
    const ok = await ev((aids) => { const s = OTR.academy.get(); return OTR.academy.saveSettings(Object.assign({}, s, { workday: Object.assign({}, s.workday, aids) })); }, opts.aids);
    must(ok === true, 'the trainer aids could not be saved: ' + ok);
  }
  await clickText(page, 'HubScene', /Start workday/);
  must(await ctx.until(`(OTR.game.scene.getScene('HubScene')._modalStack || []).length > 0`, 4000), 'Start workday opened no confirmation');
  await ctx.audit('start confirmation');
  await clickText(page, 'HubScene', /^Start ▶$/);
  must(await ctx.until(`!!(OTR.game.scene.isActive('FirstPersonScene') && !${FP}.loading && ${FP}.model)`, 90000), 'the 3D scene never opened from the hub');
  await wait(800);
  must((await state()).m.kind === 'campaign', 'the hub did not start a campaign workday');
  // the driving assists the 3D world applied (C-21 reads OTR.academy.workdayRules): full on a first day by default,
  // or what the trainer chose
  {
    const assist = await ev(() => OTR.game.scene.getScene('FirstPersonScene').model.driveAssist);
    const want = opts.expectAssist !== undefined ? opts.expectAssist : (opts.day || 1) === 1 ? 1 : undefined;
    if (want !== undefined) must(assist === want, `the 3D world's driving assist is ${assist}, not ${want}`);
  }
  if (opts.stopAfterStart) return;
  must(await ev(() => !!OTR.workday.saved().current), 'no workday in progress after Start');
  await shot('start');

  // ---- the opening panel ("Walk to Dispatch and read the morning brief"), then dispatch: the brief and the manifest
  if ((await state()).panel) { await press('Digit1'); must(!(await state()).panel, 'the opening panel did not close'); }
  await use('dispatch'); await shot('morning-brief');
  for (let i = 0; i < 40; i++) {
    const s = await state();
    if (s.m.events['brief:' + s.m.seed]) break;
    await press('Digit1');
  }
  { const s = await state(); must(!!s.m.events['brief:' + s.m.seed], 'the brief and manifest could not be read to the end'); }
  const N = (await state()).m.stops.length;
  must(N === 5, 'the generated day should have five stops, not ' + N);

  // ---- load the van with the real interactions: every parcel scanned at the table, on its own shelf, in stop order
  for (let i = 0; i < N; i++) {
    await use('parcel' + i);
    must((await state()).m.heldId === 'parcel' + i, 'could not pick up parcel ' + i);
    await scan(); must((await state()).m.parcels[i].scanned, 'the depot scan did not register for parcel ' + i);
    if (i === 0) await shot('scan-result');
    await press('Digit1');
    if (i === 0) { await use('cargo'); must((await state()).m.cargoOpen, 'the cargo doors did not open'); }
    await use('slot' + i);
    must((await state()).m.parcels[i].location === 'slot' + i, 'could not place parcel ' + i + ' on its shelf');
  }
  await use('secure'); must((await state()).m.secured, 'the cargo restraint did not secure the load');
  await shot('cargo');
  await use('cargo'); must(!(await state()).m.cargoOpen, 'the cargo doors did not close');

  // ---- pre-trip walkaround
  for (const part of ['tyres', 'lights']) {
    await use(part); await shot('inspection-' + part);
    const fault = await ev(() => OTR.game.scene.getScene('FirstPersonScene').model.fault);
    await press(part === fault ? 'Digit2' : 'Digit1');
  }

  // ---- the cab: belt, parking brake, then the start of the first leg on throttle and brake, through the first junction
  await use('driver');
  must((await state()).m.mode === 'cab', 'could not enter the cab');
  await press('KeyB'); await press('KeyM'); await shot('cab-guidance');
  await press('Space');
  const driveTo = async (z) => {
    const end = Date.now() + 60000; let fwd = false, brake = false;
    while (Date.now() < end) {
      const v = (await state()).m.van, d = v.z - z, stop = d <= v.speed * v.speed / 4 + 0.6, gas = !stop && v.speed < 4;
      if (gas !== fwd) { await page.keyboard[gas ? 'down' : 'up']('KeyW'); fwd = gas; }
      if (stop !== brake) { await page.keyboard[stop ? 'down' : 'up']('KeyS'); brake = stop; }
      if (stop && Math.abs(v.speed) < 0.04) { await page.keyboard.up('KeyW'); await page.keyboard.up('KeyS'); return; }
      await wait(120);
    }
    throw new Error('workday-3d: the drive leg did not arrive');
  };
  // the first junction line is ahead of the depot street: stop before it (the model logs the full stop), then go through
  const junctionZ = await ev(() => OTR.game.scene.getScene('FirstPersonScene').model.town.zs[1]);
  await driveTo(junctionZ + 9.5); await wait(500);
  await shot('junction');
  await driveTo(junctionZ - 9);
  must((await state()).m.logs.some((l) => /^junction:/.test(l.id) && l.outcome === 'good'), 'the full stop before the junction line was not logged as good ' + JSON.stringify(await ev(() => { const m = OTR.game.scene.getScene('FirstPersonScene').model; return { van: m.van, zs: m.town.zs, j: m.junctions.slice(0, 6).map(j => ({ x: j.x, z: j.z, s: j.stopped, p: j.passed })), logs: m.logs.filter(l => /junction|drive/.test(l.id)).map(l => l.id + ':' + l.outcome), half: m.town.road / 2 }; })));
  // the rest of the long leg is skipped with a position fixture, as test/fproutebrowser.js does
  const parkAt = async (i) => {
    await ev((i) => { const s = OTR.game.scene.getScene('FirstPersonScene'), m = s.model; Object.assign(m.van, m.stops[i].park, { speed: 0, hand: true }); m.activeStop = i; s.sync(); }, i);
    await wait(150);
  };
  await parkAt(0); await shot('arrival');
  await press('KeyE'); must((await state()).m.mode === 'walk', 'could not park and get out');

  // ---- five stops
  for (let i = 0; i < N; i++) {
    if (i > 0) { await ev(() => { const m = OTR.game.scene.getScene('FirstPersonScene').model; m.mode = 'walk'; }); await parkAt(i); }
    await use('cargo'); must((await state()).m.cargoOpen, 'could not open the cargo at stop ' + i);
    await at('parcel' + i, true);
    await scan(); must(!(await state()).m.parcels[i].stopScanned, 'a cargo scan must not count as the doorstep scan (stop ' + i + ')');
    await press('Digit1');
    await use('parcel' + i); must((await state()).m.heldId === 'parcel' + i, 'could not take parcel ' + i + ' out of the van');
    const spec = await ev((i) => JSON.parse(JSON.stringify(OTR.game.scene.getScene('FirstPersonScene').model._doorSpecs[i])), i);
    // a loose dog: stay outside the gate and have the owner secure it before going up the path
    if (spec.dog) { await at('gate' + i); await press('KeyE'); await shot('dog-gate-' + i); await pick(/Call the owner to secure the dog/); must(await ev((i) => OTR.game.scene.getScene('FirstPersonScene').model.doorsteps.stops[i].dogSecured, i), 'the owner did not secure the dog (stop ' + i + ')'); }
    await at('door' + i);
    await scan();
    if (!spec.wrong) must((await state()).m.parcels[i].stopScanned, 'the doorstep scan did not register (stop ' + i + ')');
    if (i === 0) await shot('doorstep-scan');
    await press('Digit1');
    await press('KeyE');
    // the owner who secured the dog has already come to the door; otherwise knock
    if (!(await state()).m.stops[i].contacted) await pick(/Knock/);
    await shot('contact-' + i); await pick(/Record on handheld/);
    must((await state()).device, 'the door did not open the delivery on the handheld');
    // what the situation at this door needs: the model says which outcome is right; the checks are done through the UI
    const expected = await ev((i) => OTR.fpDoors.expected(OTR.game.scene.getScene('FirstPersonScene').model, i), i);
    if (spec.adult || (spec.signature && spec.present) || spec.difficult) {
      await pick(/Delivery checks/);
      if (spec.adult) {
        const valid = await ev((i) => OTR.fpDoors.validID(OTR.game.scene.getScene('FirstPersonScene').model, i), i);
        await pick(/Check the photo ID/); await shot('id-check-' + i);
        await pick(valid ? /Accept the photo ID/ : /Decline the photo ID/);
      }
      if (spec.signature && spec.present && expected === 'handover') {
        await pick(/Capture the signature/); await pick(new RegExp('^Record ' + spec.person.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
        must(await ctx.until(`${FP}.model.doorsteps.stops[${i}].signatureName !== null`, 20000), 'the signature was not recorded (stop ' + i + ')');
        await pick(/^Back/);
      }
      if (spec.difficult) { await pick(/Speak with the customer/); await shot('customer-' + i); await pick(/Acknowledge the problem/); }
      await pick(/Record the delivery outcome/);
    }
    console.log(`      stop ${i + 1}: ` + ['dog', 'wrong', 'adult', 'signature', 'difficult'].filter((k) => spec[k]).concat(spec.hazard ? ['hazard:' + spec.hazard] : []).join(' ') + ` -> ${expected}`);
    await shot('delivery-options-' + i);
    await pick(expected === 'handover' ? /Hand to resident/ : expected === 'safeplace' ? /Leave in porch box/ : /Record a delivery exception/);
    must((await state()).m.stops[i].resolved, 'the delivery outcome was not recorded (stop ' + i + ')');
    await shot('receipt-' + i); await press('Digit1');
    if ((await state()).m.heldId) await use('slot' + i);
    await use('secure'); await use('cargo');
  }
  must((await state()).m.phase === 'return', 'the five stops did not lead to the return phase');

  // ---- back at the depot: retained parcels are scanned in at Returns, then Dispatch finishes the day
  await ev(() => { const s = OTR.game.scene.getScene('FirstPersonScene'); Object.assign(s.model.van, { x: 2.84, z: 8, yaw: 0, speed: 0, hand: true }); s.sync(); });
  await use('cargo');
  const retained = (await state()).m.parcels.filter((p) => p.returnRequired);
  // a day keeps a parcel only when a stop needs a signature and nobody is home; today's seed may have none
  for (const ret of retained) {
    await use(ret.id);
    await at('returns'); await press('KeyE');
    must((await state()).aiming, 'Returns did not open the barcode scanner');
    await page.keyboard.down('Space'); await ctx.until(`!${FP}.handheld.aiming`, 20000); await page.keyboard.up('Space'); await wait(200);
    must((await state()).m.parcels[ret.stop].location === 'returned', 'the return scan did not check the parcel in');
    await press('Digit1');
  }
  if (retained.length) await shot('return-receipt');
  await use('dispatch'); await shot('dispatch-finish');
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

module.exports = make();
module.exports.variant = make;
