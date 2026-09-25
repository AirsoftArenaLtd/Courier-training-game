/*
 * Golden path shared by the doorstep stop sets (Modules 5 and 8). Every stop is played the way a careful courier
 * would, on the real controls: pull only this stop's packages from the shelves (mouse), scan them in the van (TAB and
 * number keys), climb down with three points of contact, walk carefully (SHIFT) over anything slippery or cluttered,
 * check the address when asked, knock or go in to reception, answer every conversation with the recommended line,
 * then record exactly what the stop expects — the right delivery type, the right spot and a framed photo, the
 * signer's real name, the right ID call, or the right exception code with a door tag — and climb back in safely.
 * In the heat it drinks and cools off before it overheats. A careful run of the whole set has to earn full marks.
 */
const { wait, clickText, runTalk } = require('./ui');

/** Everything needed to play one stop; `playStop(k)` plays whatever stop StopScene is showing now. */
function driver(page, ctx) {
  const S = `OTR.game.scene.getScene('StopScene')`;
  const ev = (e) => ctx.eval(e);
  const log = [];
  const note = (m) => { log.push(m); };

  const state = () => ev(`(() => { const s = ${S}; if (!s || !s.S) return null; const L = s.lot;
    return { k: s.stopIndex, running: !!s.running, done: !!s.S.done, modals: s._openModals || 0, talk: !!s.talkCtl,
      locked: s.stage ? s.stage.locked : 0, x: s.me.x, inVan: s.S.inVan, answered: s.S.answered, knocks: s.S.knocks,
      outcome: s.S.outcome, carrying: s.S.carrying.slice(), hh: s.hh.isOpen, inside: !!s.inInterior, once: !!s.me.once,
      heat: s.heat ? { hyd: s.heat.hyd, temp: s.heat.temp } : null, gate: s.gate ? { x: s.gate.x, open: s.gate.open } : null,
      door: L ? { doorX: L.doorX, numberX: L.numberX, stepsX0: L.stepsX0, porchX0: L.porchX0 } : null }; })()`);

  /** Wait until nothing is animating the courier, no modal, no talk, the stage is unlocked. */
  const settle = async (ms) => {
    const t0 = Date.now();
    while (Date.now() - t0 < (ms || 15000)) {
      const s = await state();
      if (!s) return;
      if (s.talk) { await runTalk(page, `${S}.talkCtl`, { timeout: 150000 }); continue; }
      if (s.modals === 0 && s.locked === 0 && !s.once) return s;
      await wait(80);
    }
    throw new Error('the stop never settled (locked or a modal stayed open)');
  };

  /**
   * Hold A/D (and SHIFT where it is slippery or cluttered) until the courier is within tol of x. With stopOnTalk,
   * a situation that fires on the way (a dog, a gate, the owner coming out) ends the walk: returns 'talk'.
   */
  const walkTo = async (x, tol, o) => {
    tol = tol || 10;
    o = o || {};
    const zones = await ev(`(() => { const s = ${S}; const out = [];
      Object.values(s.S.hazards).forEach(H => { if (H.id === 'steps') out.push([s.lot.stepsX0 - 70, s.lot.porchX0 + 60]); else out.push([H.x - 110, H.x + 110]); });
      return out; })()`);
    const weatherCareful = await ev(`['snow', 'rain', 'storm'].indexOf(${S}.weather) >= 0`);
    let dirKey = null, shift = false, result = 'arrived';
    const t0 = Date.now();
    try {
      while (Date.now() - t0 < 20000) {
        const s = await state();
        if (s.talk) {                                              // a situation started on the way (dog, gate, owner)
          if (dirKey) { await page.keyboard.up(dirKey); dirKey = null; }
          if (shift) { await page.keyboard.up('Shift'); shift = false; }
          await settle();
          if (o.stopOnTalk) { result = 'talk'; break; }
          continue;
        }
        const dx = x - s.x;
        if (Math.abs(dx) <= tol) break;
        const want = dx > 0 ? 'KeyD' : 'KeyA';
        const risky = weatherCareful || zones.some(([a, b]) => s.x >= a && s.x <= b) || zones.some(([a, b]) => (dx > 0 ? s.x < a && s.x + 60 > a : s.x > b && s.x - 60 < b));
        if (risky !== shift) { if (risky) await page.keyboard.down('Shift'); else await page.keyboard.up('Shift'); shift = risky; }
        if (dirKey !== want) { if (dirKey) await page.keyboard.up(dirKey); await page.keyboard.down(want); dirKey = want; }
        await wait(Math.abs(dx) < 40 ? 16 : 30);
      }
    } finally {
      if (dirKey) await page.keyboard.up(dirKey);
      if (shift) await page.keyboard.up('Shift');
    }
    await wait(60);
    return result;
  };

  /** Walk to an interaction by its label and press E. */
  const use = async (re) => {
    const it = await ev(`(() => { const s = ${S}; const rx = new RegExp(${JSON.stringify(re.source)}, '${re.flags}');
      const it = s.stage.inter.find(i => rx.test(i.label) && s.stage.usable(i)); if (!it) return null;
      return { x: it.standX !== undefined ? it.standX : it.x, range: it.range, label: it.label }; })()`);
    if (!it) throw new Error(`no usable "${re.source}" here`);
    await walkTo(it.x, 5);
    await settle();
    let near = await ev(`(() => { const n = ${S}.stage.nearest(); return n ? n.label : null; })()`);
    // at a low frame rate the courier can coast a step past a spot that sits beside another one (the van's
    // shelves and its water): the prompt says so, and a trainee taps back towards it
    for (let n = 0; n < 3 && near !== it.label; n++) {
      const x = await ev(`${S}.me.x`);
      const key = it.x > x ? 'KeyD' : 'KeyA';
      await page.keyboard.down(key); await wait(110); await page.keyboard.up(key);   // at least one frame at 12 fps
      await wait(150);
      await settle();
      near = await ev(`(() => { const n = ${S}.stage.nearest(); return n ? n.label : null; })()`);
    }
    if (near !== it.label) {
      const at = await ev(`(() => { const s = ${S}; return Math.round(s.me.x) + ' (van door ' + Math.round(s.van.doorX) + ')' + (s.scene.isPaused() ? ', paused' : '') +
        ', scenes ' + OTR.game.scene.getScenes(true).map(k => k.sys.settings.key).join('+'); })()`);
      throw new Error(`standing at "${it.label}" (x ${Math.round(it.x)}, courier at ${at}) but E would use "${near}"`);
    }
    await page.keyboard.press('KeyE');
    await wait(250);
  };

  /** Press the number key of the handheld option whose label matches. */
  const hhPick = async (re, timeout) => {
    const t0 = Date.now();
    while (Date.now() - t0 < (timeout || 6000)) {
      const i = await ev(`(() => { const hh = ${S}.hh; if (!hh.isOpen || !hh.optionBtns) return -1;
        const rx = new RegExp(${JSON.stringify(re.source)}, '${re.flags}');
        return hh.optionBtns.findIndex(b => b.active && b.enabled && rx.test(b.label.text.replace(/^\\d+\\s+/, ''))); })()`);
      if (i >= 0) { await page.keyboard.press('Digit' + (i + 1)); await wait(300); return; }
      await wait(100);
    }
    const shown = await ev(`${S}.hh.optionBtns ? ${S}.hh.optionBtns.map(b => b.label.text).join(' | ') : '(closed)'`);
    throw new Error(`handheld has no option ${re} (showing: ${shown})`);
  };
  const hhOpen = async () => { if (!(await state()).hh) { await page.keyboard.press('Tab'); await wait(420); } };
  const hhClose = async () => { if ((await state()).hh) { await page.keyboard.press('Tab'); await wait(350); } };

  /** Pick the safe answer in a "How do you climb …?" card by its number key. */
  const climbSafely = async () => {
    await ctx.until(`(${S}._openModals || 0) > 0`, 4000);
    await wait(350);
    const i = await ev(`(() => { const root = ${S}.children.list.filter(o => o.depth === 5000 && o.active).pop(); const box = root.list[1];
      const btns = box.list.filter(o => o.label && /^\\d\\./.test(o.label.text));
      return btns.findIndex(b => /grab handle/i.test(b.label.text)); })()`);
    if (i < 0) throw new Error('no safe way to climb was offered');
    await page.keyboard.press('Digit' + (i + 1));
    await wait(1200);
    await settle();
  };

  /** Cool off / drink when the heat model says so (only at the van or in shade, as a trainee would). */
  const manageHeat = async (where) => {
    const s = await state();
    if (!s.heat) return;
    if (where === 'van' || s.inVan) {
      // in the van both are one spot, which asks: 1 water, 2 the AC
      const inVan = s.inVan;
      if (s.heat.hyd < 85) {
        if (inVan) { await use(/^Water and AC$/); await ctx.until(`(${S}._openModals || 0) > 0`, 3000); await wait(350); await page.keyboard.press('Digit1'); await wait(300); }
        else await use(/^Drink some water$/);
        await settle();
      }
      const s2 = await state();
      if (s2.inVan && s2.heat.temp > 32) { await use(/^Water and AC$/); await ctx.until(`(${S}._openModals || 0) > 0`, 3000); await wait(350); await page.keyboard.press('Digit2'); await wait(300); await settle(); }
    } else if (s.heat.temp > 55 || s.heat.hyd < 45) {
      const shade = await ev(`${S}.stage.inter.some(i => /Rest in the shade/.test(i.label) && ${S}.stage.usable(i))`);
      if (shade) { await use(/Rest in the shade/); await settle(); }
    }
  };

  /** The stop's own packages, taken off the shelves by mouse. */
  const pullPackages = async () => {
    // on a route day the van holds the day's load: every piece still on board, this stop's among them (each stop
    // used to invent its own three packages)
    const van = await ev(`(() => { const s = ${S}; if (!s.shiftMode) return null; const st = OTR.shift.state;
      const want = st.route.filter((r, j) => j === st.atStop || !r.done || (r.result && r.result.outcome === 'exception')).reduce((n, r) => n + r.stop.packages.length, 0);
      return { want, have: s.shelfPackages().length, mine: s.shelfPackages().filter(p => p.mine).length }; })()`);
    if (van && (van.have !== van.want || van.mine < 1)) throw new Error(`the van shelves hold ${van.have} pieces (${van.mine} for this stop); the load still on board is ${van.want}`);
    await use(/^Search the shelves$/);
    await wait(500);
    const boxes = await ev(`(() => { const s = ${S}; const dims = { s: [70, 50], m: [100, 72], l: [130, 96], env: [96, 20] };
      return s.shelfPackages().filter(p => p.mine).map(p => { const [bw, bh] = dims[p.size || 'm'];
        return { id: p.id, x: 30 + 40 + p.slot.c * 195 + 80, y: 70 + 60 + p.slot.r * 175 + 130 - bh / 2 - 2 }; }); })()`);
    for (const b of boxes) {
      await page.mouse.click(b.x, b.y);
      await wait(200);
      await clickText(page, 'StopScene', /^Take this package$/);
      await wait(200);
    }
    const held = await ev(`${S}.S.carrying.slice()`);
    if (held.length !== boxes.length) throw new Error(`pulled ${held.length} of ${boxes.length} packages`);
    await page.keyboard.press('Escape');                       // Done
    await wait(400);
    await settle();
  };

  const scanInVan = async () => {
    await hhOpen();
    await hhPick(/^Scan package$/);
    await wait(300);
    const title = await ev(`${S}.hh.current && ${S}.hh.current.title`);
    if (title !== 'SCAN OK') throw new Error('scanning this stop\'s own packages said ' + title);
    await hhPick(/^Back$/);
    await hhClose();
    await settle();
  };

  /** Frame the package and the door in the POD camera and take the photo. */
  const takePhoto = async () => {
    if (!(await ctx.until(`${S}.photoMode === true && ${S}.stage.locked > 0`, 12000))) throw new Error('the photo camera never opened');
    await wait(300);
    const f = await ev(`(() => { const s = ${S}, cam = s.cameras.main, L = s.lot, b = s.pkgProp.getBounds();
      const px = b.centerX - cam.scrollX, py = b.centerY, dx = L.doorX - cam.scrollX, dy = L.floorY - 120;
      return { px, py, pw: b.width, ph: b.height, dx, dy }; })()`);
    // centre the 380 x 260 frame between the package and the door, but keep the whole package inside it
    let cx = (f.px + f.dx) / 2, cy = (f.py + f.dy) / 2;
    cx = Math.max(f.px + f.pw / 2 + 10 - 190, Math.min(f.px - f.pw / 2 - 10 + 190, cx));
    cy = Math.max(f.py + f.ph / 2 + 10 - 130, Math.min(f.py - f.ph / 2 - 10 + 130, cy));
    await page.mouse.move(cx, cy, { steps: 8 });
    await wait(150);
    await page.mouse.click(cx, cy);
    await wait(900);
    const grade = await ev(`${S}.S.photo && ${S}.S.photo.grade`);
    if (grade !== 'good') throw new Error('the framed photo was graded ' + grade);
    await hhPick(/^Use this photo$/);
    await hhClose();
    await settle();
  };

  const playStop = async (k) => {
    // intro card (first stop only) and the dispatcher's brief
    for (let i = 0; i < 6 && !(await state()).running; i++) { await page.keyboard.press('Enter'); await wait(700); }
    if (!(await ctx.until(`${S}.running === true`, 8000))) throw new Error(`stop ${k + 1} never started`);
    await settle();
    const d = await ev(`(() => { const s = ${S}, d = s.def; return { id: d.id, kind: d.lot.kind || 'house', exp: d.expected,
      svc: d.packages[0].service || 'standard', answer: d.answer ? { name: d.answer.name, talk: d.answer.talk, delay: d.answer.delay, afterKnocks: d.answer.afterKnocks } : null,
      checkAddress: !!d.checkAddress, spots: d.spots || null, open: s.lot.layout.s.open }; })()`);
    note(`${d.id}: ${JSON.stringify(d.exp)}`);

    await manageHeat('van');
    await pullPackages();
    await scanInVan();
    await use(/^Climb out of the van$/);
    await climbSafely();

    // gate in the way?
    let s = await state();
    if (s.gate && !s.gate.open) {
      await use(/^(Open the gate|Try the gate)$/);
      await settle();
    }
    // clear trip hazards off the path, as the intro asks (stepping carefully over clutter leaves it for the next person)
    for (let n = 0; n < 4; n++) {
      if (!(await ev(`${S}.stage.inter.some(i => /^Move the .* aside$/.test(i.label) && ${S}.stage.usable(i))`))) break;
      await use(/^Move the .* aside$/);
      await settle();
    }
    if (d.checkAddress) {
      await use(/^Check the address number$/);
      await wait(500);
      await page.keyboard.press('Enter');
      await wait(300);
      await settle();
    }
    await manageHeat('outside');

    // get the door
    if (d.kind === 'business') {
      if (d.open !== false) {
        await use(/^Go inside$/);
        await ctx.until(`${S}.inInterior === true`, 5000);
        await settle();
        if (d.answer) {
          await use(/^Talk to reception$/);
          await wait(400);
          // it has to do something: a conversation, or on a route day the receptionist's greeting (E on it used to do
          // nothing there, and this path pressed it without noticing)
          if (!(await ev(`!!(${S}.S.talked || ${S}.talkCtl)`))) throw new Error('"Talk to reception" did nothing');
          await settle();
        }
      } else {
        await use(/^Try the door$/);
        await wait(1400);
        await settle();
      }
    } else {
      // head for the door; a situation on the way (the owner comes out to meet you, or a dog sends you back to the
      // truck) settles the door for you, and then nobody knocks
      const bell = await ev(`(() => { const s = ${S}; const it = s.stage.inter.find(i => /^(Ring the doorbell|Knock|Buzz the unit)$/.test(i.label));
        return it ? (it.standX !== undefined ? it.standX : it.x) : null; })()`);
      let settled = (await state()).answered;                   // e.g. the owner already came out to the gate
      if (!settled) {
        const how = await walkTo(bell, 5, { stopOnTalk: true });
        const after = await state();
        settled = how === 'talk' && (after.answered || d.exp.outcome === 'exception');
        if (how === 'talk' && !settled) await walkTo(bell, 5);
      }
      const want = settled ? 0 : (d.answer && d.answer.afterKnocks) || 1;
      for (let i = 0; i < want; i++) {
        await use(/^(Ring the doorbell|Knock|Buzz the unit)$/);
        const delay = d.answer ? (d.answer.delay !== undefined ? d.answer.delay : 2) : 4;
        await wait(1000 + delay * 1000 + 400);
        await settle();
      }
      if (d.answer && d.answer.talk) {
        await ctx.until(`${S}.S.talked === true || !!${S}.talkCtl`, 6000);
        await settle();
      }
    }

    // record the outcome
    s = await state();
    const E = d.exp;
    if (E.outcome === 'deliver' && E.types[0] !== 'left' && !s.outcome) {
      // a hand-off: walk up to whoever came out (they may have met you on the path or at the gate)
      const rx = await ev(`${S}.resident && ${S}.resident.c.active ? ${S}.resident.x : null`);
      if (rx !== null && Math.abs(rx - s.x) > 180) { await walkTo(rx - 110, 8); await settle(); s = await state(); }
    }
    if (E.outcome === 'deliver' && !s.outcome) {
      await hhOpen();
      await hhPick(/^Deliver…$/);
      const types = await ev('OTR_DATA.handheld.deliveryTypes');
      const type = E.types[0];
      await hhPick(new RegExp('^' + types[type].label.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&') + '$'));
      if (type === 'left') {
        const spot = (d.spots || []).find(sp => sp.id === E.spot) || (d.spots || []).find(sp => sp.grade === 'good');
        await hhPick(new RegExp('^' + spot.label.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&') + '$'));
        await takePhoto();
      } else {
        if (d.svc === 'adult') await hhPick(/^Verified: 21 or older$/);
        await wait(2000);                                          // the signature draws itself
        await hhPick(new RegExp('^' + d.answer.name + '$'), 8000);
        await wait(600);
        await settle();
      }
    } else if (E.outcome === 'exception' && !s.outcome) {
      await hhOpen();
      if (d.svc === 'adult' && E.id) {
        await hhPick(/^Deliver…$/);
        await hhPick(/^Handed to recipient$/);
        await hhPick(E.id === 'under' ? /^Under 21/ : /^ID expired/);
        await hhPick(/^Record exception…$/);
      } else {
        await hhPick(/^Record exception…$/);
      }
      await hhPick(new RegExp('^' + E.code + ' · '));
      await hhPick(new RegExp('^Record ' + E.code + '$'));
      const tagScreen = await ev(`${S}.hh.isOpen && ${S}.hh.current && ${S}.hh.current.title === 'DOOR TAG'`);
      if (tagScreen) await hhPick(E.doorTag ? /^Print door tag$/ : /^Skip the tag$/);
      await hhClose();
      await settle();
      if (E.doorTag) {
        if (await ev(`${S}.inInterior`)) { await use(/^Go back outside$/); await ctx.until(`!${S}.inInterior`, 5000); await settle(); }
        await use(/^Attach the door tag$/);
        await wait(900);
        await settle();
      }
    }
    if (!(await state()).outcome) throw new Error(`stop ${d.id}: no outcome recorded`);

    // back to the van
    if (await ev(`${S}.inInterior`)) { await use(/^Go back outside$/); await ctx.until(`!${S}.inInterior`, 5000); await settle(); }
    await manageHeat('outside');
    await use(/^Climb into the van$/);
    await climbSafely();
    if (!(await ctx.until(`${S}.S.done === true && (${S}._openModals || 0) > 0`, 8000))) throw new Error(`stop ${d.id}: the stop report never came up`);
    await wait(700);
    const items = await ev(`${S}.log.items.filter(it => it.group === ${S}.def.id && (it.got < it.max || it.kind === 'penalty') && ${S}.cats.indexOf(it.cat) >= 0).map(it => it.cat + ' ' + it.got + '/' + it.max + ' ' + it.label)`);
    if (items.length) note(`${d.id} lost: ${items.join(' · ')}`);
    await ctx.snap(`report-${d.id}`);
    await page.keyboard.press('Enter');
  };

  return { S, state, settle, walkTo, use, playStop, log };
}

/** A whole practice stop set, every stop played carefully, and full marks expected. */
module.exports = async (page, ctx) => {
  const D = driver(page, ctx);
  await wait(1200);
  const n = await ctx.eval(`${D.S}.set.stops.length`);
  for (let k = 0; k < n; k++) {
    if (!(await ctx.until(`${D.S}.stopIndex === ${k} && ${D.S}.S && !${D.S}.S.done`, 12000))) throw new Error(`stop ${k + 1} never loaded`);
    await wait(500);
    await D.playStop(k);
  }
  const ok = await ctx.until('!!window.__qaResult', 10000);
  console.log('        stops: ' + D.log.join(' | '));
  if (!ok) throw new Error('the set never finished');
  const r = await ctx.eval('window.__qaResult.result.ratios');
  const short = Object.keys(r || {}).filter(c => r[c] < 1);
  if (short.length) throw new Error('a careful run did not score full marks: ' + JSON.stringify(r));
};
module.exports.driver = driver;
