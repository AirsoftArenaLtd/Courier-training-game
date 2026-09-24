/*
 * Content validator. Runs in the browser with ?dev=1 (warnings in the console)
 * and can be run from Node against the data files.
 */
window.OTR = window.OTR || {};

OTR.validate = {
  all(DATA, sceneKeys) {
    const errors = [];
    const ids = {};
    (DATA.modules || []).forEach(m => {
      (m.scenarios || []).forEach(sc => {
        if (ids[sc.id]) errors.push(`Duplicate scenario id "${sc.id}"`);
        ids[sc.id] = true;
        if (sceneKeys && sceneKeys.indexOf(sc.scene) < 0) errors.push(`${sc.id}: scene "${sc.scene}" is not registered`);
        const content = sc.dataKey.split('.').reduce((o, k) => (o == null ? undefined : o[k]), DATA);
        if (!content) errors.push(`${sc.id}: dataKey "${sc.dataKey}" not found`);
        (sc.categories || []).forEach(c => {
          if (!DATA.config.categories[c]) errors.push(`${sc.id}: unknown category "${c}"`);
        });
        if (sc.scene === 'RoutePlannerScene' && content) {
          OTR.validate.routes(sc.id, content, DATA).forEach(e => errors.push(e));
        }
        if (sc.scene === 'LabelScene' && content) {
          OTR.validate.labels(sc.id, content).forEach(e => errors.push(e));
        }
        if (sc.scene === 'DialogueScene' && content) {
          OTR.validate.dialogue(sc.id, content).forEach(e => errors.push(e));
          const max = OTR.talk.maxPoints(content, OTR.scoring.CATS);
          sc.categories.forEach(c => {
            if (!(max[c] > 0)) errors.push(`${sc.id}: category "${c}" has no positive points on any path`);
          });
          OTR.validate.recommended(sc.id, content, sc.categories).forEach(e => errors.push(e));
        }
      });
    });
    OTR.validate.town(DATA).forEach(e => errors.push(e));
    return errors;
  },

  /**
   * The town (data/town.js): every building stands on its own lawn, clear of the sidewalks, the roads and every
   * other building. The station used to stand in 2nd St, and big buildings ran into their neighbours. The mix of
   * houses, shops and apartment blocks is drawn from the day's seed, so a spread of seeds is checked.
   */
  town(DATA) {
    if (!DATA.town || !OTR.town || !OTR.townArt) return [];
    const errors = [];
    for (let seed = 1; seed <= 40 && !errors.length; seed++) {
      const T = OTR.town.build(seed), clear = T.road / 2 + OTR.townArt.WALK, D = T.depot;
      const rects = T.lots.map(l => {
        const [w, h] = OTR.town.size(l);
        return { what: `${l.number} ${l.street}`, x0: l.x - w / 2, x1: l.x + w / 2, y0: l.y - h / 2, y1: l.y + h / 2 };
      });
      rects.push({ what: 'the station', x0: D.x - D.w / 2, x1: D.x + D.w / 2, y0: D.y - D.h / 2, y1: D.y + D.h / 2 });
      rects.forEach(r => {
        if (T.vx.some(x => Math.max(r.x0 - x, x - r.x1) < clear) || T.hy.some(y => Math.max(r.y0 - y, y - r.y1) < clear)) {
          errors.push(`town (day ${seed}): ${r.what} reaches a sidewalk or the road`);
        }
      });
      for (let i = 0; i < rects.length; i++) {
        for (let j = i + 1; j < rects.length; j++) {
          const a = rects[i], b = rects[j];
          if (a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1) errors.push(`town (day ${seed}): ${a.what} overlaps ${b.what}`);
        }
      }
    }
    return errors;
  },

  /**
   * The recommended ("good") answer has to earn at least as much as any other answer shown with it, in every
   * category the scenario is scored on — otherwise doing the right thing costs stars.
   */
  recommended(id, dlg, cats) {
    const errors = [];
    const exclusive = (a, b) => typeof a === 'string' && typeof b === 'string' && (a === '!' + b || b === '!' + a);
    Object.keys(dlg.nodes || {}).forEach(nid => {
      const ch = dlg.nodes[nid].choices;
      if (!ch) return;
      ch.filter(g => g.grade === 'good').forEach(g => ch.forEach(o => {
        if (o === g || o.grade === 'good' || exclusive(o.if, g.if)) return;
        cats.forEach(c => {
          const mine = (g.effects && g.effects[c]) || 0, theirs = (o.effects && o.effects[c]) || 0;
          if (theirs > mine) errors.push(`${id}: node "${nid}" — the ${o.grade} answer earns more ${c} (${theirs}) than the recommended one (${mine})`);
        });
      }));
    });
    return errors;
  },

  dialogue(id, dlg) {
    const errors = [];
    const E = (m) => errors.push(`${id}: ${m}`);
    const nodes = dlg.nodes || {};
    const cast = dlg.cast || {};
    if (!nodes[dlg.start]) E(`start node "${dlg.start}" missing`);
    if (dlg.setting && typeof dlg.setting !== 'string') E('setting must be a string');

    const speakers = Object.assign({ narrator: 1, courier: 1 }, cast);
    const reachable = {};
    const stack = [];
    const visit = (nid, from) => {
      if (!nodes[nid]) { E(`"${from}" points to missing node "${nid}"`); return; }
      if (stack.indexOf(nid) >= 0) return;          // loops are allowed (the talk engine guards depth)
      if (reachable[nid]) return;
      reachable[nid] = true;
      stack.push(nid);
      const n = nodes[nid];
      if (n.type === 'end') {
        if (!n.title) E(`end node "${nid}" needs a title`);
      } else if (n.if !== undefined && n.then) {
        visit(n.then, nid);
        if (n.else) visit(n.else, nid);
      } else {
        if (n.speaker && !speakers[n.speaker]) E(`node "${nid}" speaker "${n.speaker}" not in cast`);
        if (n.show && !cast[n.show]) E(`node "${nid}" show "${n.show}" not in cast`);
        if (n.choices) {
          if (n.choices.length < 2 || n.choices.length > 4) E(`node "${nid}" should have 2-4 choices`);
          n.choices.forEach((c, i) => {
            if (!c.text) E(`node "${nid}" choice ${i + 1} missing text`);
            if (!c.feedback) E(`node "${nid}" choice ${i + 1} missing feedback`);
            if (['good', 'ok', 'bad'].indexOf(c.grade) < 0) E(`node "${nid}" choice ${i + 1} grade must be good/ok/bad`);
            visit(c.next, nid);
          });
          if (n.timer && !n.timeout) E(`node "${nid}" has a timer but no timeout branch`);
          if (n.timeout) visit(n.timeout.next, nid);
        } else if (n.next) {
          if (!n.text) E(`node "${nid}" missing text`);
          visit(n.next, nid);
        } else {
          E(`node "${nid}" has no next, choices, or end type`);
        }
      }
      stack.pop();
    };
    if (nodes[dlg.start]) visit(dlg.start, '(start)');
    Object.keys(nodes).forEach(nid => { if (!reachable[nid]) E(`node "${nid}" is unreachable`); });
    return errors;
  },

  /** Route Planner rounds: services, stop mixes, pickup windows and closures that exist on the map. */
  routes(id, R, DATA) {
    const errors = [];
    const E = (m) => errors.push(`${id}: ${m}`);
    const town = (DATA && DATA.town) || {};
    const rows = (town.streetsH || []).length, cols = (town.streetsV || []).length;
    const services = R.services || {};
    if (!Object.keys(services).length) E('no services defined');
    Object.keys(services).forEach(k => {
      const s = services[k];
      if (!s.label || !s.short) E(`service "${k}" needs a label and a short name`);
      if (s.by !== null && s.by !== undefined && (s.by < 0 || s.by > 24 * 60)) E(`service "${k}" commit time is out of the day`);
    });
    if (!services.pickup) E('a "pickup" service is required for pickup stops');
    if (!(R.minutesPerBlock > 0) || !(R.serviceMinutes > 0)) E('minutesPerBlock and serviceMinutes must be positive');
    (R.rounds || []).forEach((rd, i) => {
      const at = `round ${i + 1}`;
      if (!rd.name || !rd.brief) E(`${at} needs a name and a brief`);
      if (!rd.seed) E(`${at} needs a seed`);
      const stops = rd.stops || [];
      if (stops.length < 3) E(`${at} needs at least 3 stops`);
      if (stops.length > 8) E(`${at} has ${stops.length} stops — the optimal solver is capped at 8`);
      const start = rd.startMin !== undefined ? rd.startMin : R.startMin;
      stops.forEach((st, j) => {
        const where = `${at} stop ${j + 1}`;
        if (st.kind === 'pickup') {
          if (!(st.ready < st.close)) E(`${where}: pickup window must run ready -> close`);
          if (st.close < start) E(`${where}: pickup closes before you even roll out`);
        } else if (!services[st.service]) {
          E(`${where}: unknown service "${st.service}"`);
        }
      });
      (rd.closures || []).forEach((c, j) => {
        const where = `${at} closure ${j + 1}`;
        if (c[0] !== 'h' && c[0] !== 'v') E(`${where}: first entry must be 'h' or 'v'`);
        const lines = c[0] === 'h' ? rows : cols;
        const gaps = c[0] === 'h' ? cols - 1 : rows - 1;
        if (!(c[1] >= 0 && c[1] < lines)) E(`${where}: street index ${c[1]} is off the map`);
        if (!(c[2] >= 0 && c[2] < gaps)) E(`${where}: block index ${c[2]} is off the map`);
      });
    });
    ['commit', 'early', 'missed', 'long', 'perfect'].forEach(k => {
      if (!(R.lessons || {})[k]) E(`missing lessons.${k}`);
    });
    return errors;
  },

  /** Label Check: stations, precedence and the marks/faces each package carries. */
  labels(id, L) {
    const errors = [];
    const E = (m) => errors.push(`${id}: ${m}`);
    const FACES = ['front', 'right', 'back', 'left', 'top', 'base'];
    const MARKS = ['fragile', 'thisWayUp', 'keepDry', 'class2', 'class3', 'class5', 'class8', 'class9', 'class9_li', 'lithium'];
    const stations = Object.keys(L.stations || {});
    if (stations.length !== 6) E(`expected 6 handling stations, found ${stations.length}`);
    stations.forEach(k => {
      const st = L.stations[k];
      if (!st.label || !st.sub) E(`station "${k}" needs a label and a sub-line`);
    });
    const pre = L.precedence || [];
    stations.forEach(k => { if (pre.indexOf(k) < 0) E(`station "${k}" is missing from precedence`); });
    pre.forEach(k => { if (stations.indexOf(k) < 0) E(`precedence lists unknown station "${k}"`); });
    (L.guide || []).forEach(g => {
      if (MARKS.indexOf(g.mark) < 0) E(`guide entry "${g.mark}" is not a mark the engine can draw`);
      if (!g.name || !g.meaning) E(`guide entry "${g.mark}" needs a name and a meaning`);
    });
    // every mark a package carries is named on the verdict card, so it needs a guide entry or a markNames entry
    const named = (m) => (L.guide || []).some(g => g.mark === m) || !!(L.markNames || {})[m];
    const tiers = {};
    (L.items || []).forEach((it, i) => {
      const where = `item ${i + 1}`;
      Object.keys(it.marks || {}).forEach(f => (it.marks[f] || []).forEach(m => {
        if (MARKS.indexOf(m) >= 0 && !named(m)) E(`${where}: mark "${m}" has no name to show (add a guide entry or a markNames entry)`);
      }));
      if (!(it.tier >= 1 && it.tier <= 3)) E(`${where}: tier must be 1, 2 or 3`);
      tiers[it.tier] = (tiers[it.tier] || 0) + 1;
      if (stations.indexOf(it.answer) < 0) E(`${where}: unknown answer station "${it.answer}"`);
      if (!it.explain) E(`${where}: missing explain`);
      Object.keys(it.marks || {}).forEach(f => {
        if (FACES.indexOf(f) < 0) E(`${where}: "${f}" is not one of the six faces`);
        (it.marks[f] || []).forEach(m => { if (MARKS.indexOf(m) < 0) E(`${where}: unknown mark "${m}"`); });
        if ((it.marks[f] || []).length > 3) E(`${where}: only 3 marks fit on a face`);
      });
      if (it.damage) {
        if (FACES.indexOf(it.damage.face) < 0) E(`${where}: damage face "${it.damage.face}" is not one of the six`);
        if (['leak', 'crushed'].indexOf(it.damage.kind) < 0) E(`${where}: damage kind must be leak or crushed`);
      }
      if (it.answer === 'isolate' && !it.damage) E(`${where}: isolate is the answer but nothing is damaged`);
    });
    const per = Math.max(1, Math.round((L.itemsPerRun || 9) / 3));
    [1, 2, 3].forEach(t => {
      if ((tiers[t] || 0) < per) E(`only ${tiers[t] || 0} tier-${t} packages — a run needs ${per}`);
    });
    return errors;
  }
};
