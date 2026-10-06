/* Mission/restore checks run without a browser, canvas or generated artwork. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const context = {}; context.window = context;
vm.createContext(context);
for (const file of ['firstperson','fpmission']) vm.runInContext(fs.readFileSync(__dirname + '/../src/core/' + file + '.js','utf8'), context);
const M = context.OTR.fpMission, S = context.OTR.fpStore;
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
    at(m,'parcel'+s.id); m.pickup('parcel'+s.id); at(m,'door'+s.id); m.contact(s.id);
    const outcome=s.service==='signature'?'exception':s.service;
    m.deliver(s.id,outcome); assert.equal(s.resolved,true);
    if (outcome==='exception') { at(m,'slot'+s.id); m.place('slot'+s.id); }
  }
  assert.equal(m.phase,'return'); at(m,'dispatch'); assert.notEqual(m.finish(),'');
  const ret=m.parcels.find(p=>p.returnRequired); at(m,ret.id); m.pickup(ret.id); at(m,'returns'); m.returnParcel();
  at(m,'dispatch'); assert.equal(m.finish(),''); assert.equal(m.phase,'debrief');
  assert.equal(m.logs.filter(l=>l.id.startsWith('outcome:')&&l.outcome==='good').length,3);
});
test('unsupported outcomes cannot poison the recorded delivery decision', () => {
  const m=make(); load(m); at(m,'parcel0'); m.pickup('parcel0'); at(m,'door0'); m.contact(0);
  m.deliver(0,'arbitrary'); assert.equal(m.events['outcome:0'],undefined); assert.equal(m.stop(0).resolved,false);
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
  for (const edit of [s=>s.version=99,s=>s.van.x=null,s=>s.parcels[0].location='missing',s=>{s.parcels[0].location=s.parcels[1].location='slot0';},s=>s.heldId='parcel0',s=>s.traffic[0].speed='fast']) {
    const data=make().snapshot(); edit(data); assert.equal(M.restore(data),null);
  }
});
test('local checkpoint reports storage failure and uses a separate profile key', () => {
  context.OTR.save={localKey:()=> 'course_alex'}; const values=new Map();
  context.localStorage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};
  const data=S.empty(); data.campaign=make().snapshot(); assert.equal(S.write(data),true);
  assert.equal(values.has('course_alex'),false); assert.ok(S.read().campaign);
  context.localStorage.setItem=()=>{throw Error('quota');}; assert.equal(S.write(data),false);
});
