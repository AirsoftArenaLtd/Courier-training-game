/* Mission/restore checks run without a browser, canvas or generated artwork. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const context = {}; context.window = context;
vm.createContext(context);
for (const file of ['data/workday_events.js','src/core/scorelog.js','src/core/workday.js','src/core/firstperson.js','src/core/fpmission.js','src/core/fphandheld.js'])
  vm.runInContext(fs.readFileSync(__dirname + '/../' + file,'utf8'), context);
const M = context.OTR.fpMission, S = context.OTR.fpStore;
const W = context.OTR.workday;
test.beforeEach(() => W.begin());
test('dispatch brief completion is local, once-only and persists without replay', () => {
  const m = M.create('campaign', 1); m.briefing = { day: 1, weather: 'clear', clockMin: 500 };
  assert.equal(m.readBrief(), false);
  const point = m.point('dispatch'); Object.assign(m.player, { x: point.x + 1.5, z: point.z });
  assert.equal(m.readBrief(), true); assert.equal(m.readBrief(), true);
  assert.equal(m.logs.filter(l => l.id === 'brief:1').length, 1);
  assert.equal(W.events.filter(l => l.type === 'brief.read').length, 1);
  const restored = M.restore(m.snapshot()); assert.ok(restored);
  W.begin(); restored.readBrief(); assert.equal(W.events.length, 0);
  const old = m.snapshot(); delete old.briefing; assert.ok(M.restore(old));
  const bad = m.snapshot(); bad.briefing.day = -1; assert.equal(M.restore(bad), null);
});
test('campaign briefing prevents cab entry until acknowledged; practice remains separate', () => {
  const m = M.create('campaign', 1); m.briefing = { day: 1, weather: 'clear', clockMin: 500 };
  const door = m.point('driver'); Object.assign(m.player, door);
  assert.match(m.enter(), /morning brief/); assert.equal(m.mode, 'walk');
  const desk = m.point('dispatch'); Object.assign(m.player, { x: desk.x + 1.5, z: desk.z }); m.readBrief();
  Object.assign(m.player, door); assert.equal(m.enter(), '');
  const practice = M.create('practice', 2); assert.equal(practice.readBrief(), false);
});
const make = kind => { const m = M.create(kind, 7); m.paused = false; return m; };
const at = (m, id) => { const p = m.point(id); m.player.x = p.x; m.player.z = p.z + 0.65; };
function load(m) {
  for (const p of m.parcels) {
    at(m, p.id); m.scan(p.id); assert.equal(m.pickup(p.id), '');
    if (!m.cargoOpen) { at(m, 'cargo'); assert.equal(m.toggleCargo(), ''); }
    at(m, 'slot' + p.stop); assert.equal(m.place('slot' + p.stop), '');
  }
}
test('seeds provide different service mixes while addresses remain fixed', () => {
  const a=M.create('campaign',1), b=M.create('campaign',2);
  assert.equal(a.stops[0].address,b.stops[0].address);
  assert.notEqual(a.stops[0].service,b.stops[0].service);
  assert.equal(new Set(a.stops.map(s=>s.service)).size,3);
});
test('parcel location, identity and rearrangement persist through a checkpoint', () => {
  const m=make(); load(m);
  at(m,'parcel1'); assert.equal(m.pickup('parcel1'),'');
  at(m,'slot4'); assert.equal(m.place('slot4'),'');
  const restored=M.restore(m.snapshot());
  assert.ok(restored); assert.equal(restored.parcel('parcel1').location,'slot4');
  assert.equal(restored.parcel('parcel1').tracking,m.parcel('parcel1').tracking);
  assert.equal(restored.paused,true); assert.equal(restored.secured,false);
});
test('closed cargo, remote interaction and occupied shelves cannot transfer parcels', () => {
  const m=make(); load(m);
  Object.assign(m.player,{x:4,z:11.3}); assert.equal(m.toggleCargo(),'');
  at(m,'parcel0'); m.pickup('parcel0'); assert.equal(m.heldId,null);
  at(m,'cargo'); m.toggleCargo(); at(m,'parcel0'); m.pickup('parcel0');
  const p=m.parcel('parcel0'); at(m,'slot1'); assert.notEqual(m.place('slot1'),''); assert.equal(p.location,'held');
  Object.assign(m.player,{x:15,z:-50}); assert.notEqual(m.place('slot4'),''); assert.equal(p.location,'held');
});
test('a wrong scan is recoverable and repeated scans do not duplicate evidence', () => {
  const m=make(); load(m); m.phase='route'; m.activeStop=0;
  at(m,'parcel1'); m.pickup('parcel1'); m.scan(); m.scan();
  assert.equal(m.logs.filter(l=>l.id==='mismatch:parcel1:0').length,1);
  assert.equal(m.logs.find(l=>l.id==='mismatch:parcel1:0').outcome,'recovered');
  at(m,'slot1'); m.place('slot1'); assert.equal(m.heldId,null);
});
test('wrong parcel and uncontacted address do not complete a job', () => {
  const m=make(); load(m); at(m,'parcel1'); m.pickup('parcel1'); at(m,'door0'); m.contact(0);
  m.deliver(0,'handover'); assert.equal(m.stop(0).resolved,false); assert.equal(m.heldId,'parcel1');
  at(m,'door1'); m.deliver(1,'handover'); assert.equal(m.stop(1).resolved,false);
});
test('delivery, authorised release and correct exception lead to return and debrief', () => {
  const m=make(); load(m);
  for (const s of m.stops) {
    m.van.z=s.z;m.phase='route';m.activeStop=s.id;
    at(m,'parcel'+s.id); m.pickup('parcel'+s.id);m.scan(); at(m,'door'+s.id); m.contact(s.id);
    const outcome=s.service==='signature'?'exception':s.service;
    m.deliver(s.id,outcome); assert.equal(s.resolved,true);
    if (outcome==='exception') { at(m,'slot'+s.id); m.place('slot'+s.id); }
  }
  m.van.z=8;
  assert.equal(m.phase,'return'); at(m,'dispatch'); assert.notEqual(m.finish(),'');
  const ret=m.parcels.find(p=>p.returnRequired); at(m,ret.id); m.pickup(ret.id); at(m,'returns'); m.returnParcel();
  at(m,'dispatch'); assert.equal(m.finish(),''); assert.equal(m.phase,'debrief');
  assert.equal(m.logs.filter(l=>l.id.startsWith('outcome:')&&l.outcome==='good').length,3);
});
test('unsupported outcomes cannot poison the recorded delivery decision', () => {
  const m=make(); load(m); at(m,'parcel0'); m.pickup('parcel0'); at(m,'door0'); m.contact(0);
  m.deliver(0,'arbitrary'); assert.equal(m.events['outcome:0'],undefined); assert.equal(m.stop(0).resolved,false);
});
test('an absent recipient cannot receive a handover and the parcel remains recoverable', () => {
  const m=make(); load(m); const s=m.stops.find(s=>s.service==='signature');
  m.van.z=s.z;m.activeStop=s.id;m.phase='route';
  at(m,'parcel'+s.id);m.pickup('parcel'+s.id);m.scan();at(m,'door'+s.id);m.contact(s.id);
  m.deliver(s.id,'handover');assert.equal(s.resolved,false);assert.equal(m.heldId,'parcel'+s.id);
  m.deliver(s.id,'exception');assert.equal(s.resolved,true);assert.equal(m.parcel(m.heldId).returnRequired,true);
});
test('depot scanning cannot replace a fresh scan at the delivery stop', () => {
  const m=make();load(m);const p=m.parcels[0],s=m.stop(0);assert.equal(p.scanned,true);assert.equal(p.stopScanned,false);
  m.phase='route';m.van.z=s.z;at(m,p.id);m.pickup(p.id);at(m,'door0');m.contact(0);
  m.deliver(0,s.service==='signature'?'exception':s.service);assert.equal(s.resolved,false);
  m.scan();assert.equal(p.stopScanned,true);m.deliver(0,s.service==='signature'?'exception':s.service);assert.equal(s.resolved,true);
});
test('scanning the wrong stop or scanning with an unsecured vehicle does not verify delivery', () => {
  const m=make();load(m);m.phase='route';m.van.z=m.stop(1).z;at(m,'parcel1');m.pickup('parcel1');m.scan();
  assert.equal(m.parcel('parcel1').stopScanned,false);
  m.activeStop=1;m.van.hand=false;m.scan();assert.equal(m.parcel('parcel1').stopScanned,false);
  m.van.hand=true;m.scan();assert.equal(m.parcel('parcel1').stopScanned,true);
});
test('older checkpoints retain cargo and require fresh delivery verification', () => {
  const m=make();load(m);const raw=m.snapshot();raw.parcels.forEach(p=>delete p.stopScanned);
  const n=M.restore(raw);assert.ok(n);assert.equal(n.parcels[0].scanned,true);assert.equal(n.parcels[0].location,'slot0');assert.equal(n.parcels[0].stopScanned,false);
  n.parcels[0].stopScanned=true;assert.equal(M.restore(n.snapshot()).parcels[0].stopScanned,true);
});
test('practice enforces scope and finishes only after physical retrieval and replacement', () => {
  const m=make('practice'); at(m,'driver'); assert.notEqual(m.enter(),''); assert.equal(m.mode,'walk');
  load(m); assert.ok(m.requested); at(m,'dispatch'); assert.notEqual(m.finish(),'');
  const p=m.parcel(m.requested); at(m,p.id); m.pickup(p.id); assert.equal(m.retrievals,1);
  at(m,'slot'+p.stop); m.place('slot'+p.stop); at(m,'secure'); m.secure(); at(m,'dispatch');
  assert.equal(m.finish(),''); assert.equal(m.phase,'debrief');
});
test('inspection decision is checked against the actual generated condition', () => {
  const m=make(); at(m,m.fault); m.inspectVan(m.fault,'ready'); assert.equal(m.repaired,false); assert.equal(m.checks[m.fault],false);
  m.inspectVan(m.fault,'repair'); assert.equal(m.repaired,true); assert.equal(m.checks[m.fault],true);
  assert.equal(m.logs.filter(l=>l.id==='inspect:'+m.fault).length,1);
});
test('parked cargo can be entered through the rear but walls and cab remain solid', () => {
  const m=make(); const F=context.OTR.fp;
  const middle=F.local(m.van,0,1), side=F.local(m.van,0.9,1), cab=F.local(m.van,0,-1.8);
  assert.equal(m.blocked(middle.x,middle.z),true); m.cargoOpen=true;
  assert.equal(m.blocked(middle.x,middle.z),false); assert.equal(m.blocked(side.x,side.z),true); assert.equal(m.blocked(cab.x,cab.z),true);
});
test('hub suspension or pause does not advance actors and restored events do not duplicate', () => {
  const m=make(); m.paused=true; const before=JSON.stringify(m.snapshot()); m.step({forward:true},10); assert.equal(JSON.stringify(m.snapshot()),before);
  m.log('one','safety','needs','Example'); const n=M.restore(m.snapshot()); n.log('one','safety','needs','Again'); assert.equal(n.logs.length,1);
});
test('crossing development survives save/resume and an early response is recorded once', () => {
  const m=make(); m.mode='cab'; Object.assign(m.van,{x:2,z:-36,speed:1,hand:false,belt:true});
  m.step({},0.05); assert.equal(m.crossing.state,'developing');
  const n=M.restore(m.snapshot()); assert.equal(n.crossing.clock,m.crossing.clock); n.paused=false;
  n.crossing.x=6.99; n.crossing.clock=20; n.crossing.early=true; n.step({},0.05);
  assert.equal(n.crossing.state,'resolved'); assert.equal(n.logs.filter(l=>l.id==='pedestrian').length,1);
  n.step({},0.05); assert.equal(n.logs.filter(l=>l.id==='pedestrian').length,1);
});
test('stopping before the line is recognised, crossing it without stopping is not', () => {
  for (const stopped of [true,false]) {
    const m=make(); m.mode='cab'; Object.assign(m.van,{x:2,z:-20,speed:stopped?0:2,hand:stopped});
    m.step({},0.05); m.van.z=-22; m.step({},0.05);
    assert.equal(m.logs.find(l=>l.id==='stop-sign').outcome,stopped?'good':'needs');
  }
});
test('new motion remains stable across frame rates and caps an inactive-tab frame', () => {
  const models=[30,120].map(fps=>{const m=make();m.mode='cab';m.van.hand=false;for(let i=0;i<fps*2;i++)m.step({forward:true},1/fps);return m;});
  assert.ok(Math.abs(models[0].van.z-models[1].van.z)<0.02);
  const m=models[0], z=m.van.z; m.step({forward:true},10); assert.ok(Math.abs(m.van.z-z)<0.41);
});
test('corrupted checkpoint and impossible cargo locations are rejected', () => {
  for (const edit of [s=>s.version=99,s=>s.van.x=null,s=>s.parcels[0].location='missing',s=>{s.parcels[0].location=s.parcels[1].location='slot0';},s=>s.heldId='parcel0',s=>s.traffic[0].speed='fast',s=>s.activeStop=9,s=>s.checks=null,s=>s.stopSign=null,s=>s.parcels[0].zone='missing',s=>s.logs=[null],s=>s.stops[0].z='far away']) {
    const data=make().snapshot(); edit(data); assert.equal(M.restore(data),null);
  }
});
test('traffic contact stops the vehicle and records one collision rather than two', () => {
  const m=make();m.mode='cab';Object.assign(m.van,{x:1.7,z:0,speed:2,hand:false,belt:true});
  Object.assign(m.traffic[0],{x:1.7,z:-4,speed:0});m.step({forward:true},0.05);
  assert.equal(m.van.speed,0);assert.equal(m.van.hand,true);
  assert.equal(m.logs.filter(l=>l.id.startsWith('traffic-contact:')||l.id.startsWith('contact:')).length,1);
});
test('traffic is solid for walkers and yields when a walker is directly ahead', () => {
  const m=make();Object.assign(m.traffic[0],{x:1.7,z:0});Object.assign(m.player,{x:1.7,z:-3});
  assert.equal(m.blocked(1.7,0),true);m.tickTraffic(0.5);assert.equal(m.traffic[0].z,0);
  m.player.x=8;m.tickTraffic(0.5);assert.ok(m.traffic[0].z<0);
});
test('a corrupted debrief or swapped save slot cannot break a valid campaign checkpoint', () => {
  context.OTR.save={localKey:()=> 'test'};const data=S.empty();data.campaign=make().snapshot();
  data.practice=make().snapshot();data.last={kind:'campaign',seed:1,elapsed:20,logs:[null]};
  context.localStorage={getItem:()=>JSON.stringify(data)};
  const restored=S.read();assert.ok(restored.campaign);assert.equal(restored.practice,null);assert.equal(restored.last,null);
});
test('local checkpoint reports storage failure and uses a separate profile key', () => {
  context.OTR.save={localKey:()=> 'course_alex'}; const values=new Map();
  context.localStorage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};
  const data=S.empty(); data.campaign=make().snapshot(); assert.equal(S.write(data),true);
  assert.equal(values.has('course_alex'),false); assert.ok(S.read().campaign);
  context.localStorage.setItem=()=>{throw Error('quota');}; assert.equal(S.write(data),false);
});

function report(type, key, ok, stop = null) {
  const i = W.events.findIndex(e => e.type === type && e.key === key);
  assert.notEqual(i, -1, type + ':' + key);
  assert.equal(W.events[i].ok, ok);
  assert.equal(W.events[i].stop, stop);
  const item = W.log.items[i], spec = context.OTR_DATA.workdayEvents[type];
  assert.equal(item.kind, spec.kind);
  assert.equal(item.group, stop === null ? spec.phase : 'stop' + stop);
  if (spec.kind === 'check') assert.equal(item.got, ok ? spec.max : 0);
  return item;
}

test('load scans, shelf checks and restraints report successes and failures by parcel and leg', () => {
  for (const ready of [true, false]) {
    W.begin(); const m = make();
    if (ready) load(m);
    m.secured = ready; m.preparation(); m.preparation();
    for (const p of m.parcels) {
      if (ready) report('scan.load', p.id, true);
      else assert.equal(W.events.some(e => e.type === 'scan.load'), false);
      report('load.shelf', p.id, ready);
    }
    report('load.secured', 0, ready);
    assert.equal(W.events.filter(e => e.type === 'load.secured').length, 1);
    m.mode = 'cab'; m.leg = 1; m.van.hand = false; m.van.speed = 2; m.secured = false;
    m.step({}, 0.05); report('load.secured', 1, false);
  }
});

test('both inspection points report the first decision and penalize incomplete departure checks', () => {
  for (const part of ['tyres', 'lights']) for (const correct of [true, false]) {
    W.begin(); const m = make(); at(m, part);
    const expected = m.fault === part ? 'repair' : 'ready';
    m.inspectVan(part, correct ? expected : expected === 'repair' ? 'ready' : 'repair');
    report(part === 'tyres' ? 'inspect.tires' : 'inspect.lights', part, correct);
    m.preparation();
    assert.equal(W.events.some(e => e.type === 'depart.uninspected' && e.key === part), !correct);
    assert.ok(m.logs.every(l => !/tyres/.test(l.text)));
  }
});

test('practice retrieval reports whether the requested parcel was scanned', () => {
  for (const scanned of [true, false]) {
    W.begin(); const m = make('practice'); load(m);
    const p = m.parcel(m.requested); p.scanned = scanned;
    at(m, p.id); m.pickup(p.id); report('retrieve.checked', p.id, scanned);
  }
});

test('stop scans, absent handovers, delivery decisions and returns use parcel and numeric stop keys', () => {
  for (const correct of [true, false]) {
    W.begin(); const m = make(); load(m);
    const s = m.stops.find(s => s.service === 'signature'), p = m.parcels[s.id];
    m.phase = 'route'; m.activeStop = s.id; m.van.z = s.z;
    at(m, p.id); m.pickup(p.id); m.scan(); m.scan();
    report('scan.stop', p.id, true, s.id);
    assert.equal(W.events.filter(e => e.type === 'scan.stop').length, 1);
    at(m, 'door' + s.id); m.contact(s.id); m.deliver(s.id, 'handover');
    report('deliver.no-recipient', s.id, false, s.id);
    m.deliver(s.id, correct ? 'exception' : 'safeplace');
    report('deliver.outcome', s.id, correct, s.id);
    if (correct) { at(m, 'returns'); m.returnParcel(); report('return.scanned', p.id, true); }
    else assert.equal(W.events.some(e => e.type === 'return.scanned'), false);
  }
});

test('wrong parcels and recovered mismatches are distinct for each target stop', () => {
  const m = make(); load(m); m.phase = 'route';
  at(m, 'parcel2'); m.pickup('parcel2');
  for (const stop of [0, 1]) {
    m.activeStop = stop; m.scan(); m.scan();
    report('scan.mismatch-caught', 'parcel2:' + stop, true, stop);
    at(m, 'door' + stop); m.deliver(stop, 'handover');
    report('deliver.wrong-package', 'parcel2:' + stop, false, stop);
  }
  assert.equal(W.events.filter(e => e.type === 'scan.mismatch-caught').length, 2);
});

test('legacy unverified completion maps to a failed stop scan', () => {
  const m = make(); load(m); const p = m.parcels[0], s = m.stop(0);
  at(m, p.id); m.pickup(p.id); p.stopScanned = true; p.scanned = false;
  // The current scanner sets both flags; exercise the retained legacy log branch explicitly.
  at(m, 'door0'); m.contact(0); m.deliver(0, s.service);
  report('scan.stop', p.id, false, 0);
});

test('safe driving stays unpenalized, violations are once per leg and map to van coordinates in mph', () => {
  const m = make(); m.mode = 'cab'; m.departed = true; m.secured = true;
  m.stopSign.resolved = true;
  Object.assign(m.van, { x: 2, z: -70, speed: 2, hand: false, belt: true });
  m.step({}, 0.05); assert.equal(W.events.length, 0);
  Object.assign(m.van, { x: -6, z: -70, speed: 8, belt: false });
  m.step({}, 0.05);
  for (const type of ['drive.belt', 'drive.speed', 'drive.sidewalk', 'drive.wrong-side']) {
    const item = report(type, 0, false);
    if (type !== 'drive.belt') {
      assert.equal(item.where.x, -6); assert.ok(item.where.z < -70);
      assert.ok(item.where.mph > 15 && item.where.mph < 18);
    }
  }
  m.step({}, 0.05); assert.equal(W.events.length, 4);
  m.leg = 1; m.step({}, 0.05); report('drive.speed', 1, false);
});

test('stop-line and developing hazard checks report both right and wrong responses', () => {
  for (const ok of [true, false]) {
    W.begin(); const m = make(); m.mode = 'cab'; m.departed = true;
    Object.assign(m.van, { x: 2, z: -22, speed: 0, hand: true });
    m.stopSign.stopped = ok; m.step({}, 0.05);
    assert.equal(report('drive.stop-line', null, ok).where.z, -22);
    Object.assign(m.crossing, { state: 'crossing', x: 7, clock: 20, early: ok });
    m.van.z = -62; m.tickCrossing(0, { x: 2, z: -62 });
    assert.equal(report('drive.hazard-early', null, ok).where.z, -62);
    assert.equal(W.events.some(e => e.type === 'drive.pedestrian'), false);
  }
});

test('traffic, obstacle and pedestrian contacts report critical incidents', () => {
  for (const kind of ['traffic', 'obstacle', 'pedestrian']) {
    W.begin(); const m = make(); m.mode = 'cab'; m.departed = true;
    Object.assign(m.van, { x: 1.7, z: 0, speed: 2, hand: false, belt: true });
    if (kind === 'traffic') Object.assign(m.traffic[0], { x: 1.7, z: -4, speed: 0 });
    if (kind === 'obstacle') m.solids.push({ x: 1.7, z: -2.8, w: 2, d: 1, h: 3 });
    if (kind === 'pedestrian') Object.assign(m.crossing, { state: 'crossing', x: 1.7, z: -2, clock: 3 });
    m.step({ forward: true }, 0.05);
    const item = report(kind === 'pedestrian' ? 'drive.pedestrian' : 'drive.contact', kind === 'pedestrian' ? null : 0, false);
    assert.equal(item.critical, true); assert.ok(Number.isFinite(item.where.mph));
    assert.equal(W.events.some(e => e.type === 'drive.hazard-early'), false);
  }
});

test('handheld parking guard reports through the mission log once per leg', () => {
  const m = make(), adapter = { scene: { model: m, message() {}, checkpoint() {} } };
  const allowed = () => context.OTR.fpHandheld.prototype.allowed.call(adapter);
  m.mode = 'cab'; assert.equal(allowed(), true); assert.equal(W.events.length, 0);
  m.van.hand = false; assert.equal(allowed(), false); assert.equal(allowed(), false);
  report('drive.handheld', 0, false); assert.equal(W.events.length, 1);
  m.leg = 1; allowed(); report('drive.handheld', 1, false);
});

test('restoring HUD evidence does not replay reports, and missing workday support is safe', () => {
  const m = make(); at(m, 'parcel0'); m.scan('parcel0');
  const restored = M.restore(m.snapshot()); at(restored, 'parcel0'); restored.scan('parcel0');
  assert.equal(W.events.length, 1); assert.equal(restored.logs.length, 1);
  delete context.OTR.workday;
  try { const standalone = make(); load(standalone); standalone.preparation(); assert.ok(standalone.logs.length); }
  finally { context.OTR.workday = W; }
});
