/*
 * A careless driver. The van is driven by seeded random input for minutes at a time, every key a trainee has
 * (throttle, brake, steering, reverse, the parking brake, the indicators, mirrors, belt, lights, G.O.A.L., park, the
 * handheld), held for random spells, in three towns with their traffic live. Every frame:
 *
 *   - nothing throws
 *   - the van's state stays finite, and the van stays on the map
 *   - no car drives into the van (a car's own move taking it into the van's body)
 *   - no car stands still for over a minute unless the van is in its way
 *
 * Where the golden paths drive well, this drives badly, which is how most of the odd states a trainee reaches get found.
 */
const SEEDS = (process.env.QA_FUZZ_SEEDS || '11,12,13').split(',').map(Number);
const SECONDS = Number(process.env.QA_FUZZ_SEC || 150);

module.exports = async (page, ctx) => {
  if (!(await ctx.until('!!(window.OTR && OTR.game && OTR.game.isBooted && OTR.shift)', 20000))) throw new Error('the game never booted');
  const bad = [], report = [];
  for (const seed of SEEDS) {
    const out = await ctx.eval(`(() => {
      OTR.game.loop.sleep();
      let t = performance.now();
      const mgr = OTR.game.scene;
      mgr.getScenes(true).forEach(s => mgr.stop(s.sys.settings.key));
      t += 16.7; OTR.game.step(t, 16.7);
      mgr.start('TownDriveScene', { seed: ${seed}, weather: ${seed % 2 ? "'rain'" : "'clear'"}, tod: 'midday', route: [] });
      for (let k = 0; k < 3; k++) { t += 16.7; OTR.game.step(t, 16.7); }
      const s = mgr.getScene('TownDriveScene'), T = s.T, V = OTR.vehicle, v = s.van, P = s.P;
      let r = ${seed} * 7919 % 2147483647;
      const rnd = () => { r = (r * 16807) % 2147483647; return r / 2147483647; };
      const errors = [], notes = {};
      const note = (k, d) => { if (!notes[k]) notes[k] = { n: 0, first: d }; notes[k].n++; };
      const onErr = (e) => errors.push(String(e.message || e).slice(0, 200));
      window.addEventListener('error', onErr);
      // the keys a trainee has; the ones that act on a press are pressed, the rest held
      const HOLD = ['KeyW', 'KeyS', 'KeyA', 'KeyD', 'Space'];
      const PRESS = ['KeyQ', 'KeyE', 'KeyM', 'KeyB', 'KeyL', 'KeyG', 'KeyR', 'KeyP', 'Tab'];
      const press = (code) => { const key = code === 'Tab' ? 'Tab' : code.slice(3).toLowerCase(); const kc = code === 'Tab' ? 9 : code.charCodeAt(3);
        window.dispatchEvent(new KeyboardEvent('keydown', { code, key, keyCode: kc, bubbles: true }));
        window.dispatchEvent(new KeyboardEvent('keyup', { code, key, keyCode: kc, bubbles: true })); };
      let spell = 0;
      const still = s.cars.map(() => 0);
      const frames = ${SECONDS} * 60;
      for (let f = 0; f < frames; f++) {
        if (spell <= 0) {
          spell = 10 + Math.floor(rnd() * 90);
          const held = {};
          // mostly driving forward, sometimes braking, reversing or flailing
          if (rnd() < 0.6) held.KeyW = true; else if (rnd() < 0.5) held.KeyS = true;
          if (rnd() < 0.45) held[rnd() < 0.5 ? 'KeyA' : 'KeyD'] = true;
          if (rnd() < 0.05) held.Space = true;
          s.held = held;
          if (rnd() < 0.25) press(PRESS[Math.floor(rnd() * PRESS.length)]);
        }
        spell--;
        // whatever modal a key opened (a notice, an incident), dismiss it as a trainee would
        if (s.incidentOpen && rnd() < 0.05) { s.incidentOpen = false; (s._modalStack || []).slice().forEach(m => m.close && m.close()); }
        if (s.parked && rnd() < 0.02) { s.parked = false; s.leaving = false; }
        const before = s.cars.map(c => ({ x: c.x, y: c.y }));
        const ob0 = V.obbOf(v);
        try { t += 16.7; s.sys.step(t, 16.7); } catch (e) { errors.push(String(e.stack || e).slice(0, 300)); break; }
        if (![v.x, v.y, v.u, v.lat, v.r, v.heading].every(Number.isFinite)) { note('van state not finite', JSON.stringify({ x: v.x, y: v.y, u: v.u })); break; }
        if (v.x < -100 || v.y < -100 || v.x > T.W + 100 || v.y > T.H + 100) note('van off the map', Math.round(v.x) + ',' + Math.round(v.y));
        const ob = V.obbOf(v);
        s.cars.forEach((c, i) => {
          const box = { c: { x: c.x, y: c.y }, f: { x: Math.cos(c.heading), y: Math.sin(c.heading) }, rt: { x: -Math.sin(c.heading), y: Math.cos(c.heading) }, hl: c.hl, hw: c.hw };
          if (V.sat(ob, box)) {
            const b = before[i], mx = c.x - b.x, my = c.y - b.y, tx = ob0.c.x - b.x, ty = ob0.c.y - b.y;
            const towards = (mx * tx + my * ty) / Math.max(1, Math.hypot(tx, ty));
            if (towards > 0.3) note('a car drove into the van', 't=' + (f / 60).toFixed(1) + ' car ' + i + ' speed ' + Math.round(c.speed) + (c.turn ? ' turning' : ''));
          }
          still[i] = c.speed < 1 ? still[i] + 1 / 60 : 0;
          const vanNear = Math.hypot(c.x - ob.c.x, c.y - ob.c.y) < 500;
          if (still[i] > 60 && !vanNear) { note('a car stood still over a minute', 'car ' + i + ' at ' + Math.round(c.x) + ',' + Math.round(c.y)); still[i] = 0; }
        });
      }
      window.removeEventListener('error', onErr);
      return { errors, notes, violations: s.violations, mph: +V.mph(v).toFixed(1), crashes: s.violations.crash || 0 };
    })()`);
    report.push(`town ${seed}: ${Object.keys(out.violations).length} kinds of violation (${Object.entries(out.violations).map(([k, n]) => k + ' ' + n).join(', ')})`);
    out.errors.forEach(e => bad.push(`town ${seed}: error ${e}`));
    Object.entries(out.notes).forEach(([k, n]) => bad.push(`town ${seed}: ${k} (${n.n}×, first ${n.first})`));
  }
  report.forEach(r => console.log('        ' + r));
  if (bad.length) throw new Error(`${bad.length} problem(s): ${bad.slice(0, 8).join(' | ')}`);
};
