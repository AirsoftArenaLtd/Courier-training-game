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
  // B-112: QA_TIMING=1 prints the time since the start and since the last mark at each screenshot and each line logged
  const T0 = Date.now(); let Tl = T0;
  const mark = (label) => { if (!process.env.QA_TIMING) return; const t = Date.now(); process.stdout.write(`      [${((t - T0) / 1000).toFixed(0)} s, +${((t - Tl) / 1000).toFixed(1)} s] ${label}\n`); Tl = t; };
  const log = (line) => { console.log(line); mark(line.trim().slice(0, 50)); };

  // the prototype's visible text must stay on the canvas and inside the device screen
  const shot = async (label) => {
    mark('shot ' + label);
    await wait(400);
    // the handheld slides up over about a quarter of a second of game time, which is longer on a slow PC: audit it
    // where it stops, not on the way
    await ctx.until(`(() => { const s = OTR.game.scene.getScene('FirstPersonScene'), r = s.handheld.device.root;
      return !s.tweens.isTweening(r) && (!s.panel || !s.panel.root || !s.tweens.isTweening(s.panel.root)); })()`, 5000);
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
  // in the cab, step the view to a control with the target key (P) and use it with the action key, as a trainee
  // without a mouse does (the mouse and the arrow keys reach the same controls)
  const focus = async (id) => {
    for (let n = 0; n < 40; n++) {
      if (await ev((id) => OTR.game.scene.getScene('FirstPersonScene').target === id, id)) return;
      await press('KeyP');
    }
    throw new Error('workday-3d: the target key never reached ' + id);
  };
  const cabUse = async (id) => { await focus(id); await press('KeyE'); };
  // look at a mirror until the game counts the check (0.4 s of simulated time, longer on a slow PC)
  const lookAt = async (id, index) => {
    await focus(id);
    must(await ctx.until(`OTR.fpMirrors.recent(${FP}.model, ${index})`, 6000), 'looking at ' + id + ' did not count as a mirror check');
  };
  // reverse the given distance at walking pace: release the parking brake, throttle in R, then stop and set the brake
  const reverseBy = async (metres) => {
    const from = (await state()).m.van;
    await press('Space');                                            // parking brake off
    const end = Date.now() + 30000;
    await page.keyboard.down('KeyW');
    try {
      while (Date.now() < end) {
        const v = (await state()).m.van;
        if (Math.hypot(v.x - from.x, v.z - from.z) >= metres) break;
        if (v.speed < -1.2) { await page.keyboard.up('KeyW'); await wait(150); await page.keyboard.down('KeyW'); }   // stay at walking pace
        await wait(60);
      }
    } finally { await page.keyboard.up('KeyW'); }
    await page.keyboard.down('KeyS');
    must(await ctx.until(`Math.abs(${FP}.model.van.speed) < 0.04`, 8000), 'the van did not stop after reversing');
    await page.keyboard.up('KeyS');
    await press('Space');                                            // parking brake on: the manoeuvre ends
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

  // ---- C-33's richer stops (B-89): the delivery controls at an intercom, a reception desk or a parcel locker, used
  // where the trainee stands to use them: the stop's delivery point, the target key (P) until it is selected, then E
  const controls = async (i, stay) => {
    if (!stay) await ev((i) => { const s = OTR.game.scene.getScene('FirstPersonScene'), m = s.model, st = m.stops[i], pt = OTR.fpStopFlow.point(m, i);
      s.handheld.close(); s.closePanel(); Object.assign(m.player, { x: pt.x - st.side * 1.2, z: pt.z, yaw: st.side * Math.PI / 2, pitch: 0 }); s.sync(); }, i);
    await wait(160);
    // look at the controls themselves (a resident or the desk can stand between a fixed heading and them)
    await ev((i) => { const s = OTR.game.scene.getScene('FirstPersonScene'), m = s.model;
      const vis = (o) => { for (let a = o; a; a = a.parent) if (!a.visible) return false; return true; };
      const o = s.art.interactions.find((o) => o.userData.interaction === 'visit' + i && vis(o)); if (!o) return;
      const v = o.getWorldPosition(new THREE.Vector3()), eye = s.view.camera.position, dx = v.x - eye.x, dz = v.z - eye.z;
      m.player.yaw = Math.atan2(dx, -dz); m.player.pitch = Math.atan2(eye.y - v.y, Math.hypot(dx, dz)); s.sync(); }, i);
    await wait(120);
    for (let n = 0; n < 12 && !(await ev((i) => OTR.game.scene.getScene('FirstPersonScene').target === 'visit' + i, i)); n++) await press('KeyP');
    must(await ev((i) => OTR.game.scene.getScene('FirstPersonScene').target === 'visit' + i, i), 'the target key never reached the delivery controls (stop ' + i + ')');
    await press('KeyE');
    if (!(await state()).panel) {
      const why = await ev((i) => { const s = OTR.game.scene.getScene('FirstPersonScene'), m = s.model, st = m.stops[i];
        return { target: s.target, mode: m.mode, parked: m.parked(), vanDist: Math.hypot(m.van.x - st.x, m.van.z - st.z), near: OTR.fpDoors.near(m, i), can: OTR.fpStopFlow.can(m, i), resolved: st.resolved,
          device: s.handheld.isOpen, notice: s.notice, msg: s.lastMessage || null, activeStop: m.activeStop, player: m.player, point: OTR.fpStopFlow.point(m, i) }; }, i);
      must(false, 'the delivery controls did not open (stop ' + i + '): ' + JSON.stringify(why));
    }
  };
  const holdScan = async () => {
    must(await ctx.until(`${FP}.handheld.aiming`, 5000), 'the scanner did not start aiming');
    await page.keyboard.down('Space'); await ctx.until(`!${FP}.handheld.aiming`, 20000); await page.keyboard.up('Space'); await wait(200);
  };
  // the failed-delivery sequence: the card, the reason the parcel is kept, the next-day slot, then the exception
  const reattempt = async (i) => {
    await pick(/^Leave a delivery attempt card\.$/);
    await pick(/^Record this retention reason\.$/);
    await pick(/^Book the afternoon of day \d+\.$/);
    await pick(/^Record the exception and keep the parcel\.$/);
    await pick(/^Record a delivery exception\.$/);
  };
  const lookAhead = async () => { if ((await state()).device) await press('Digit1'); };   // put away a receipt

  // ---- C-35's walkaround (B-99): on a day that has one, every area of the van inspected and recorded on the handheld,
  // as docs/3D-WALKAROUND.md's recipe says: stand outside the area, P until its wear-<zone> target is selected, E, then
  // choose the description the handheld shows (or See more descriptions. first), and put the handheld away
  const walkPhase = () => ev(() => { const s = OTR.game.scene.getScene('FirstPersonScene'), m = s.model; return OTR.fpWalkaroundFlow && m.walkaround ? OTR.fpWalkaroundFlow.phase(m) || null : null; });
  const walkaround = async (phase) => {
    if ((await walkPhase()) !== phase) return false;
    const zones = await ev(() => OTR.fpWalkaround.zones.slice());
    for (const zone of zones) {
      // stand where fpWalkaroundFlow.canInspect allows: outside the area's face of the van, within 2.1 m of it (in the
      // van's own coordinates), then look at the area's target, which only shows from there
      await ev((zone) => { const s = OTR.game.scene.getScene('FirstPersonScene'), m = s.model, F = OTR.fpWalkaroundFlow, t = F.target(zone);
        s.handheld.close(); s.closePanel();
        const lx = zone === 'right' ? Math.max(t.x + 0.8, 1.25) : zone === 'front' || zone === 'rear' ? t.x : Math.min(t.x - 0.8, -1.25);
        const lz = zone === 'front' ? Math.min(t.z - 0.8, -2.85) : zone === 'rear' ? Math.max(t.z + 0.8, 2.85) : t.z;
        const c = Math.cos(m.van.yaw), sn = Math.sin(m.van.yaw);
        Object.assign(m.player, { x: m.van.x + c * lx - sn * lz, z: m.van.z + sn * lx + c * lz }); s.sync(); }, zone);
      await wait(200);
      await ev((zone) => { const s = OTR.game.scene.getScene('FirstPersonScene'), m = s.model;
        const o = (s.art.walkaroundTargets || []).find((o) => o.name === 'walkaround-' + zone);
        if (!o || !o.visible) throw Error('No visible wear-' + zone + ' ' + JSON.stringify({ can: OTR.fpWalkaroundFlow.canInspect(m, zone), player: m.player, van: m.van }));
        const v = o.getWorldPosition(new THREE.Vector3()), eye = s.view.camera.position, ex = v.x - eye.x, ez = v.z - eye.z;
        m.player.yaw = Math.atan2(ex, -ez); m.player.pitch = Math.atan2(eye.y - v.y, Math.hypot(ex, ez)); s.sync(); }, zone);
      await wait(160);
      for (let n = 0; n < 14 && !(await ev((z) => OTR.game.scene.getScene('FirstPersonScene').target === 'wear-' + z, zone)); n++) await press('KeyP');
      must(await ev((z) => OTR.game.scene.getScene('FirstPersonScene').target === 'wear-' + z, zone), `the target key never reached the ${zone} of the van (${phase})`);
      await press('KeyE');
      must(await ctx.until(`${FP}.handheld.isOpen && ${FP}.handheld.device.current && ${FP}.handheld.device.current.title === 'Inspect the van.'`, 5000), `inspecting the ${zone} did not open "Inspect the van." (${phase})`);
      if (zone === zones[0]) await shot('walkaround-' + phase);
      const seen = await ev(() => { const c = OTR.game.scene.getScene('FirstPersonScene').handheld.device.current; const l = c.lines[1]; return typeof l === 'string' ? l : l.text; });
      const esc = seen.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (!(await ev((t) => OTR.game.scene.getScene('FirstPersonScene').handheld.device.current.options.some((o) => o.label === t), seen))) await pick(/^See more descriptions\.$/);
      await pick(new RegExp('^' + esc + '$'));
      must(await ctx.until(`${FP}.handheld.device.current && ${FP}.handheld.device.current.title === 'It is recorded.'`, 5000), `the ${zone}'s condition was not recorded (${phase})`);
      await pick(/^Put away the handheld\.$/);
    }
    log(`      walkaround (${phase}): all ${zones.length} areas recorded`);
    return true;
  };
  // the reports it leads to: one per area with damage, right, by zone, with no stop and no place (the recipe's step 4)
  // once the day is finished its live log is cleared, and the reports are read from the saved record (dayEvents)
  const dayEvents = `(OTR.workday.log ? OTR.workday.events : (OTR.workday.saved().last || {}).events || [])`;
  const walkReports = async (type, field) => {
    const want = await ev((field) => { const m = OTR.game.scene.getScene('FirstPersonScene').model, Z = OTR.fpWalkaround.zones; return Z.filter((z, i) => m.damage[field][i] > 0).sort(); }, field);
    const got = await ev(`${dayEvents}.filter((e) => e.type === '${type}').map((e) => ({ key: e.key, ok: e.ok, stop: e.stop, where: e.where }))`);
    must(JSON.stringify(got.map((e) => e.key).sort()) === JSON.stringify(want) && got.every((e) => e.ok === true && e.stop == null && !e.where),
      `${type} should be one right report per damaged area (${want.join(', ') || 'none'}), with no stop or place: ${JSON.stringify(got)}`);
    return want.length;
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
  if (ctx.resample) await ctx.resample();                           // the 3D world runs slower than the hub (B-48)
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
  // the load-out exercise (B-90): a day can hold one parcel back (missing, or found later at a stop) or add one that is
  // not on the manifest (another route's, or an extra); a parcel still pending is loaded once Dispatch has found it
  const load = async (i) => {
    await use('parcel' + i);
    must((await state()).m.heldId === 'parcel' + i, 'could not pick up parcel ' + i);
    await scan(); must((await state()).m.parcels[i].scanned, 'the depot scan did not register for parcel ' + i);
    if (i === 0) await shot('scan-result');
    await press('Digit1');
    if (!(await state()).m.cargoOpen) { await use('cargo'); must((await state()).m.cargoOpen, 'the cargo doors did not open'); }
    await use('slot' + i);
    must((await state()).m.parcels[i].location === 'slot' + i, 'could not place parcel ' + i + ' on its shelf');
  };
  const loadCheck = async (choice) => { await at('dispatch'); await press('Tab'); await pick(/^Check the load$/); await pick(choice); };
  for (let i = 0; i < N; i++) if ((await state()).m.parcels[i].location === 'depot') await load(i);
  const L = (await state()).m.loadout;
  if (L) {
    const extra = (await state()).m.parcels.find((p) => p.anomaly && p.location === 'depot');
    if (extra) {
      // scanned at the table, it says it is not on the manifest: take it to Dispatch and set it aside
      await use(extra.id); await scan(); await press('Digit1');
      await loadCheck(/^Set the unlisted package aside$/);
      must((await state()).m.parcels.find((p) => p.id === extra.id).location === 'aside', 'the unlisted package was not set aside');
      await press('Digit2');                                         // Put away
    }
    if (L.missingId && (await state()).m.parcels.find((p) => p.id === L.missingId).location === 'pending') {
      await loadCheck(/^Report a missing package$/); await press('Digit2');
      const found = (await state()).m.parcels.find((p) => p.id === L.missingId);
      if (found.location === 'depot') await load(found.stop);       // Dispatch found it at the depot
    }
    // count what is on the shelves and confirm it against the manifest
    const n = (await state()).m.parcels.filter((p) => p.location.startsWith('slot')).length;
    await loadCheck(/^Confirm the load count$/);
    await pick(new RegExp('^I counted ' + (n === 1 ? 'one package' : n + ' packages') + '\\.$'));
    must(await ev(() => OTR.workday.events.some((e) => e.type === 'load.count' && e.ok)), 'the load count was not confirmed as right (' + L.kind + ')');
    log(`      load-out: ${L.kind}${extra ? ' (set ' + extra.id + ' aside)' : ''}${L.missingId ? ' (' + L.missingId + ' reported missing)' : ''}, ${n} counted`);
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

  const preWalk = await walkaround('pretrip');                    // B-99: C-35's walkaround before the first drive
  // ---- the cab: belt, parking brake, then the start of the first leg on throttle and brake, through the first junction
  await use('driver');
  must((await state()).m.mode === 'cab', 'could not enter the cab');
  await press('KeyB'); await shot('cab-guidance');
  // opts.night (A-24b): a later day that runs after dark (C-36): the headlights go on before the van moves, so every leg
  // reports drive.lights as right; the check is read at the results
  if (opts.night) {
    must(await ev(() => { const m = OTR.game.scene.getScene('FirstPersonScene').model; return !!m.nightDrive && OTR.fpLighting.time(m) === 'night' && OTR.fpNight.required(m); }), 'the night day does not run at night with the headlights required');
    await press('KeyL');
    must((await state()).m.van.headlights === true, 'L did not switch the headlights on');
    await shot('night-cab');
  }
  // the physical cab (A-24): the gear selector is used by looking at it and pressing the action key, and a mirror is
  // checked by looking at it (there is no mirror button since C-23); the left mirror just before moving off
  await cabUse('cab-drive'); must((await state()).m.van.gear === 1, 'the selector did not put the van in Drive');
  await lookAt('mirror-left', 0);
  await press('KeyV');                                             // look forward again
  await press('Space');
  if (process.env.QA_GFX) must(await ev((g) => OTR.gfx.level() === g, process.env.QA_GFX), 'the 3D workday did not run at QA_GFX=' + process.env.QA_GFX);
  if (process.env.QA_LANG) must(await ev((l) => OTR.i18n.lang === l, process.env.QA_LANG), 'the 3D workday did not run in QA_LANG=' + process.env.QA_LANG);   // B-60
  // a leg fails only when the van stops getting closer for 30 s of wall time (or after 5 minutes): on a software-rendered
  // High run the game may simulate a tenth of a second in five, so a fixed deadline measured the PC, not the drive
  const driveTo = async (z) => {
    const end = Date.now() + 300000; let fwd = false, brake = false, best = Infinity, lastGain = Date.now();
    while (Date.now() < end && Date.now() - lastGain < 30000) {
      const v = (await state()).m.van, d = v.z - z, stop = d <= v.speed * v.speed / 4 + 0.6, gas = !stop && v.speed < 4;
      if (Math.abs(d) < best - 0.05 || Math.abs(v.speed) > 0.04) { best = Math.min(best, Math.abs(d)); lastGain = Date.now(); }
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
  must(await ev(() => OTR.workday.events.some((e) => e.type === 'drive.mirrors' && /^\d+:1$/.test(String(e.key)) && e.ok)), 'moving off after the mirror look was not reported as a mirror check');
  if (preWalk) log(`      walkaround: ${await walkReports('inspect.damage', 'baseline')} damaged area(s) found before departure`);
  // B-108: on some days a school bus starts flashing ahead on this leg. A careful courier stops 6.5 to 20 m behind it
  // and waits for its lights to go off (fpdriving.js), before the fixture below moves the van on
  const bus = () => ev(() => { const d = OTR.game.scene.getScene('FirstPersonScene').model.driving; return d && d.bus ? { state: d.bus.state, z: d.bus.z } : null; });
  const b0 = await bus();
  if (b0 && b0.state === 'flashing') {
    await driveTo(b0.z + 11);
    must(await ctx.until(`(OTR.game.scene.getScene('FirstPersonScene').model.driving.bus.state !== 'flashing')`, 60000), 'the school bus never switched off its lights while the van waited behind it');
    must(await ev(() => OTR.workday.events.some((e) => e.type === 'drive.school-bus' && e.ok)), 'waiting behind the school bus was not reported as right');
    log('      school bus: stopped behind it and waited');
  }
  // the rest of the long leg is skipped with a position fixture, as test/fproutebrowser.js does
  const parkAt = async (i) => {
    await ev((i) => { const s = OTR.game.scene.getScene('FirstPersonScene'), m = s.model; Object.assign(m.van, m.stops[i].park, { speed: 0, hand: true }); m.activeStop = i; s.sync(); }, i);
    await wait(150);
  };
  await parkAt(0); await shot('arrival');
  // opts.scuff (A-24b): a slow scrape along the left side on the way in (the van's own contact path, as a fixture, like
  // the parking above): a van.damage-scuff at the first stop that the post-trip walkaround must then report
  if (opts.scuff) {
    const hit = await ev(() => { const s = OTR.game.scene.getScene('FirstPersonScene'), m = s.model;
      const e = OTR.fpDamage.contact(m.damage, 'left', 'solid', 1.2); const ok = OTR.fpDamageFlow.fire(m, e, 1.2); OTR.fpDamage.release(m.damage); s.sync(); return ok && e.type; });
    must(hit === 'van.damage-scuff', 'the scrape did not register as a scuff: ' + hit);
    must(await ev(() => OTR.workday.events.some((e) => e.type === 'van.damage-scuff' && /^left:solid-/.test(e.key) && e.stop === 1 && !!e.where)), 'the scuff was not reported with its stop and place');
  }
  // reverse a metre with the automatic rear camera (C-24): R at the selector, the screen comes on by itself, back slowly,
  // stop and set the parking brake, which ends the manoeuvre and reports it
  await cabUse('cab-reverse');
  must((await state()).m.van.gear === -1, 'the selector did not put the van in Reverse');
  must(await ctx.until(`${FP}.view.mirror.rearOn === true`, 3000), 'the rear camera did not switch on in reverse');
  await shot('rear-camera');
  await reverseBy(1);
  await cabUse('cab-park');
  must(await ev(() => OTR.workday.events.some((e) => e.type === 'drive.backing' && e.ok)), 'a slow reverse with the camera was not reported as safe backing');
  await press('KeyV');                                             // look forward: the action key now opens the door
  await press('KeyE'); must((await state()).m.mode === 'walk', 'could not park and get out');

  // ---- five stops
  for (let i = 0; i < N; i++) {
    if (i > 0) { await ev(() => { const m = OTR.game.scene.getScene('FirstPersonScene').model; m.mode = 'walk'; }); await parkAt(i); }
    await use('cargo'); must((await state()).m.cargoOpen, 'could not open the cargo at stop ' + i);
    // a parcel missed at load-out turns up when the cargo is opened at the first stop (B-90)
    if ((await state()).m.parcels[i].location === 'pending') must(await ctx.until(`${FP}.model.parcels[${i}].location !== 'pending'`, 8000), 'the parcel missed at load-out was never found (stop ' + i + ')');
    await at('parcel' + i, true);
    await scan(); must(!(await state()).m.parcels[i].stopScanned, 'a cargo scan must not count as the doorstep scan (stop ' + i + ')');
    await press('Digit1');
    await use('parcel' + i); must((await state()).m.heldId === 'parcel' + i, 'could not take parcel ' + i + ' out of the van');
    const spec = await ev((i) => JSON.parse(JSON.stringify(OTR.game.scene.getScene('FirstPersonScene').model._doorSpecs[i])), i);
    // a loose dog: stay outside the gate and have the owner secure it before going up the path
    if (spec.dog) { await at('gate' + i); await press('KeyE'); await shot('dog-gate-' + i); await pick(/Call the owner to secure the dog/); must(await ev((i) => OTR.game.scene.getScene('FirstPersonScene').model.doorsteps.stops[i].dogSecured, i), 'the owner did not secure the dog (stop ' + i + ')'); }
    const expected = await ev((i) => OTR.fpDoors.expected(OTR.game.scene.getScene('FirstPersonScene').model, i), i);
    const marked = await ev((i) => { const m = OTR.game.scene.getScene('FirstPersonScene').model; if (!m.deliveryStops) return null;
      const d = m._deliverySpecs[i]; return { protocol: d.protocol ? JSON.parse(JSON.stringify(d.protocol)) : null, gated: !!d.gated }; }, i);
    if (marked && marked.protocol) {
      // C-33 (B-89): the marked site's own protocol, with real keys and the scene's sentence choices
      const a = marked.protocol, before = await ev(() => OTR.workday.events.length);
      await controls(i); await ev(() => { const s = OTR.game.scene.getScene('FirstPersonScene'); s.closePanel(); });
      await scan(); must((await state()).m.parcels[i].stopScanned, 'the scan at the delivery point did not register (stop ' + i + ')'); await press('Digit1');
      await controls(i);
      if (i === 0 || a.kind !== 'intercom') await shot('controls-' + a.kind + '-' + i);
      let outcome;
      if (a.kind === 'intercom') {
        await pick(/^Choose an intercom button\.$/); await pick(new RegExp('^Call ' + a.button.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\.$')); await pick(/^I am the courier, and I have a parcel for this address\.$/);
        if (a.available && expected === 'handover') {
          must(await ctx.until(`(() => { const m = ${FP}.model; return OTR.fpStops.ready(m.deliveryStops.stops[${i}].protocol, m._deliverySpecs[${i}].protocol, m.elapsed); })()`, 120000), 'the entry never buzzed (stop ' + i + ')');
          await controls(i); await pick(/^Unlock the entry\.$/);
          if (marked.gated) {
            await ev((i) => { const m = OTR.game.scene.getScene('FirstPersonScene').model; m.player.yaw = m.stops[i].side * Math.PI / 2; }, i);
            await page.keyboard.down('KeyW');
            try { must(await ctx.until(`${FP}.model.near('door${i}', 2.4)`, 60000), 'could not walk through the opened gate (stop ' + i + ')'); } finally { await page.keyboard.up('KeyW'); }
          }
          await controls(i, marked.gated); await pick(/^Record on handheld$/);
          const sp = await ev((i) => { const d = OTR.game.scene.getScene('FirstPersonScene').model._doorSpecs[i]; return { adult: d.adult, signature: d.signature && d.present, person: d.person }; }, i);
          if (sp.adult || sp.signature) {
            await pick(/^Review the delivery checks\.$/);
            if (sp.adult) { const valid = await ev((i) => OTR.fpDoors.validID(OTR.game.scene.getScene('FirstPersonScene').model, i), i); await pick(/^Check the required photo ID\.$/); await pick(valid ? /Accept the photo ID/ : /Decline the photo ID/); }
            if (sp.signature) {
              await pick(/^Capture the recipient signature\.$/); await pick(new RegExp('^Record ' + sp.person.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
              must(await ctx.until(`!!${FP}.model.doorsteps.stops[${i}].signatureName`, 20000), 'the signature was not recorded (stop ' + i + ')');
              await pick(/^Back/); await pick(/^Return to the delivery controls\.$/); await pick(/^Record on handheld$/);
            }
          }
          await pick(/^Hand the parcel to the recipient\.$/); outcome = 'handover';
        } else {
          // nobody answers (or the parcel cannot be handed over): eight seconds on the street, then the retained exception
          if (!a.available) must(await ctx.until(`(() => { const m = ${FP}.model, d = m.deliveryStops.stops[${i}].protocol; return d.calledAt !== null && m.elapsed >= d.calledAt + 8; })()`, 120000), 'the unanswered entry never timed out (stop ' + i + ')');
          await controls(i); await pick(/^Record a failed delivery\.$/); await reattempt(i); outcome = 'exception';
        }
      } else if (a.kind === 'reception') {
        await pick(/^Greet the person and confirm the address\.$/);
        await pick(new RegExp('^Record ' + a.receptionist.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ' at reception\\.$'));
        await pick(/^Return to the street\.$/);
        await controls(i); await pick(/^Capture the matching signature\.$/);
        must(await ctx.until(`${FP}.model.deliveryStops.stops[${i}].protocol.signed`, 20000), 'the reception signature was not captured (stop ' + i + ')');
        await pick(/^Hand over and record the parcel\.$/); await pick(/^Hand the parcel to the recipient\.$/); outcome = 'handover';
      } else if (a.kind === 'locker') {
        await pick(new RegExp('^Open compartment ' + a.compartment + '\\.$')); await pick(/^Scan the physical parcel\.$/); await holdScan(); await pick(/^Put away$/);
        await controls(i); await pick(/^Place the parcel inside\.$/); await pick(/^Return to the street\.$/);
        await controls(i); await pick(/^Close the locker door\.$/); await pick(/^Photograph the closed locker door\.$/);
        await controls(i); await pick(/^Record the locker delivery\.$/); await pick(/^Record the locker delivery\.$/); outcome = 'locker';
      } else { await reattempt(i); outcome = 'exception'; }
      const reported = await ev((n) => OTR.workday.events.slice(n).filter((e) => /^stop\.(intercom|reception|locker|reattempt)$/.test(e.type)).map((e) => ({ type: e.type, key: e.key, stop: e.stop, ok: e.ok, where: !!e.where })), before);
      must(reported.length === 1, `stop ${i + 1} (${a.kind}) should report its protocol once, not ${JSON.stringify(reported)}`);
      must(reported[0].ok === (outcome !== 'exception' || a.kind === 'reattempt' || !a.available) && reported[0].stop === i + 1 && /^\d+$/.test(String(reported[0].key)) && !(reported[0].ok && reported[0].where), `stop ${i + 1}: the protocol report is not as the contract says: ${JSON.stringify(reported[0])}`);
      log(`      stop ${i + 1}: ${a.kind}${marked.gated ? ' (gated)' : ''}${a.kind === 'intercom' && !a.available ? ' (no answer)' : ''} -> ${outcome}`);
      must((await state()).m.stops[i].resolved, 'the delivery outcome was not recorded (stop ' + i + ')');
      await shot('receipt-' + i); await lookAhead();
      if ((await state()).m.heldId) await use('slot' + i);
      await use('secure'); await use('cargo');
      continue;
    }
    await at('door' + i);
    await scan();
    if (!spec.wrong) must((await state()).m.parcels[i].stopScanned, 'the doorstep scan did not register (stop ' + i + ')');
    if (i === 0) await shot('doorstep-scan');
    await press('Digit1');
    await press('KeyE');
    // the owner who secured the dog has already come to the door; otherwise knock
    if (!(await state()).m.stops[i].contacted) await pick(/Knock/);
    if (marked && expected === 'exception' && !spec.wrong && !spec.adult) {
      // a marked day (C-33): nobody to sign, so the failed delivery and its reattempt (B-89)
      await shot('contact-' + i); await pick(/^Arrange a failed delivery and reattempt\.$/); await reattempt(i);
      log(`      stop ${i + 1}: ` + ['dog', 'signature'].filter((k) => spec[k]).join(' ') + ' -> exception (reattempt booked)');
      must((await state()).m.stops[i].resolved, 'the failed delivery was not recorded (stop ' + i + ')');
      await shot('receipt-' + i); await lookAhead();
      if ((await state()).m.heldId) await use('slot' + i);
      await use('secure'); await use('cargo');
      continue;
    }
    await shot('contact-' + i); await pick(/Record on handheld/);
    // on a marked day the outcome is a panel of whole sentences (C-33); before, it was the handheld's list
    if (!marked) must((await state()).device, 'the door did not open the delivery on the handheld');
    else must((await state()).panel, 'the door did not open the delivery outcome');
    if (marked && (spec.adult || (spec.signature && spec.present) || spec.difficult)) {
      await pick(/^Review the delivery checks\.$/);
      if (spec.adult) { const valid = await ev((i) => OTR.fpDoors.validID(OTR.game.scene.getScene('FirstPersonScene').model, i), i); await pick(/^Check the required photo ID\.$/); await shot('id-check-' + i); await pick(valid ? /Accept the photo ID/ : /Decline the photo ID/); }
      if (spec.signature && spec.present && expected === 'handover') {
        await pick(/^Capture the recipient signature\.$/); await pick(new RegExp('^Record ' + spec.person.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
        must(await ctx.until(`${FP}.model.doorsteps.stops[${i}].signatureName !== null`, 20000), 'the signature was not recorded (stop ' + i + ')');
        await pick(/^Back/);
      }
      if (spec.difficult) { await pick(/^Speak with the customer calmly\.$/); await shot('customer-' + i); await pick(/Acknowledge the problem/); }
      if ((await state()).panel && await ev(() => OTR.game.scene.getScene('FirstPersonScene').panel.choices.some((o) => /^Return to the delivery controls\.$/.test(o.label)))) await pick(/^Return to the delivery controls\.$/);
      if (!(await ev(() => { const p = OTR.game.scene.getScene('FirstPersonScene').panel; return !!p && p.choices.some((o) => /^Hand the parcel to the recipient\.$/.test(o.label)); }))) await pick(/Record on handheld/);
    } else if (spec.adult || (spec.signature && spec.present) || spec.difficult) {
      await pick(/Delivery checks/);
      if (spec.adult) {
        const valid = await ev((i) => OTR.fpDoors.validID(OTR.game.scene.getScene('FirstPersonScene').model, i), i);
        await pick(/Check the photo ID/); await shot('id-check-' + i);
        await pick(valid ? /Accept the photo ID/ : /Decline the photo ID/);
      }
      if (spec.signature && spec.present && expected === 'handover') {
        await pick(/Capture the signature/); await pick(new RegExp('^Record ' + spec.person.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
        if (!(await ctx.until(`${FP}.model.doorsteps.stops[${i}].signatureName !== null`, 20000))) {
          // what the handheld was showing when it went wrong (B-33): the screen, its options and whether it is still open
          const seen = await ev((i) => { const s = OTR.game.scene.getScene('FirstPersonScene'), h = s.handheld, d = h.device, c = d.current || {};
            return { open: h.isOpen, title: c.title, lines: c.lines, options: (c.options || []).map((o) => o.label), token: !!h.signatureToken,
              stop: s.model.doorsteps.stops[i], mode: s.model.mode, panel: s.panel ? s.panel.choices.map((o) => o.label) : null,
              // the scribble is a timer on the device's scene clock: is that clock running?
              clock: { scene: d.scene && d.scene.sys.settings.key, active: d.scene && d.scene.sys.isActive(), paused: d.scene && d.scene.time.paused,
                scale: d.scene && d.scene.time.timeScale, timers: d.scene && d.scene.time._active ? d.scene.time._active.map((e) => ({ delay: e.delay, repeat: e.repeatCount, elapsed: Math.round(e.elapsed), paused: e.paused, hasDispatched: e.hasDispatched })) : null,
                now: d.scene && Math.round(d.scene.time.now), screenItems: d.screen ? d.screen.list.length : null, errors: (window.__qaErrors || []).slice(-3) } }; }, i);
          must(false, 'the signature was not recorded (stop ' + i + '): ' + JSON.stringify(seen));
        }
        await pick(/^Back/);
      }
      if (spec.difficult) { await pick(/Speak with the customer/); await shot('customer-' + i); await pick(/Acknowledge the problem/); }
      await pick(/Record the delivery outcome/);
    }
    log(`      stop ${i + 1}: ` + ['dog', 'wrong', 'adult', 'signature', 'difficult'].filter((k) => spec[k]).concat(spec.hazard ? ['hazard:' + spec.hazard] : []).join(' ') + ` -> ${expected}`);
    await shot('delivery-options-' + i);
    if (marked) await pick(expected === 'handover' ? /^Hand the parcel to the recipient\.$/ : expected === 'safeplace' ? /^(Leave the parcel in the approved safe place|Place the parcel behind the planter)\.$/ : /^Record a delivery exception\.$/);
    else await pick(expected === 'handover' ? /Hand to resident/ : expected === 'safeplace' ? /Leave in porch box/ : /Record a delivery exception/);
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
  if ((await state()).m.cargoOpen) await use('cargo');           // the rear is checked with the cargo shut
  // opts.unreported (A-24b): the courier skips the post-trip record, so the scrape they caused goes unreported
  const postWalk = opts.unreported ? false : await walkaround('posttrip');                  // B-99: and again after the trip, before finishing
  await use('dispatch'); await shot('dispatch-finish');
  await press('Digit1');                                       // Finish workday

  // ---- the shared workday flow takes over: results, debrief, record
  must(await ctx.until(`OTR.game.scene.isActive('ResultsScene')`, 30000), 'Finish workday did not open the results screen');
  if (postWalk) {
    log(`      walkaround: ${await walkReports('trip.damage-report', 'added')} new damaged area(s) reported after the trip`);
    must(await ev(`!${dayEvents}.some((e) => e.type === 'trip.damage-false')`), 'a right post-trip record reported damage that was not there');
  }
  if (opts.night) {
    const lights = await ev(`${dayEvents}.filter((e) => e.type === 'drive.lights').map((e) => ({ key: e.key, ok: e.ok }))`);
    must(lights.length >= 1 && lights.every((e) => e.ok === true), 'every leg after dark should report the headlights as on: ' + JSON.stringify(lights));
    log(`      night: headlights on for ${lights.length} leg(s)`);
  }
  if (opts.scuff) {
    const rep = await ev(`${dayEvents}.filter((e) => e.type === 'trip.damage-report').map((e) => ({ key: e.key, ok: e.ok }))`);
    const left = rep.find((e) => e.key === 'left');
    must(left && left.ok === !opts.unreported, `the post-trip report of the left scuff should be ${opts.unreported ? 'missed' : 'right'}: ` + JSON.stringify(rep));
    const crit = await ev(() => { const r = OTR.workday.saved().last; return { types: r.criticalTypes, safety: r.stars.safety, service: r.stars.service }; });
    if (opts.unreported) must(crit.types.includes('trip.damage-report') && crit.service <= 1, 'unreported damage should be a critical that caps service at one star: ' + JSON.stringify(crit));
    else must(!crit.types.includes('trip.damage-report'), 'a right post-trip report should not be a critical: ' + JSON.stringify(crit));
    log(`      scuff: ${opts.unreported ? 'left unreported, a critical' : 'reported after the trip'} (${JSON.stringify(crit)})`);
  }
  // B-108: the golden path earns no critical apart from what a variant sets out to do
  const crits = await ev(() => (OTR.workday.saved().last.criticalTypes || []).filter((t) => t !== 'trip.damage-report'));
  must(!crits.length, 'the careful day carries a critical: ' + crits.join(', '));
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
