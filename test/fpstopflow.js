/* Generated-stop integration: real mission guards, retained parcels, reports and restores. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const c={console,URLSearchParams};c.window=c;c.location={search:''};c.addEventListener=()=>{};vm.createContext(c);
for(const f of ['data/theme.js','data/config.js','data/m3_doorsteps.js','data/m8_stops.js','data/town.js','data/workday_events.js',
 'src/core/theme.js','src/core/rig.js','src/core/scenery.js','src/core/townart.js','src/core/town.js','src/core/shift.js',
 'src/core/scorelog.js','src/core/scoring.js','src/core/save.js','src/core/workday.js','src/core/firstperson.js',
 'src/core/fpmission.js','src/core/fproute.js','src/core/fplater.js','src/core/fpday.js','src/core/fpdoors.js','src/core/fpnav.js','src/core/fpstops.js','src/core/fpstopflow.js'])
 vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),c);
const O=c.OTR,M=O.fpMission,F=O.fpStopFlow,S=O.fpStops,D=O.fpDoors,W=O.workday;
O.save.data=O.save.defaults();O.save.data.townSeed=1;
function make(seed=7,day=3,marked=true,edit){
 let plan=O.fpRoute.plan(day,seed);if(edit)edit(plan);if(marked)plan=F.prepare(plan);
 const m=M.create('campaign',seed,plan);O.fpDay.configure(m);D.configure(m);F.configure(m);
 m.phase='route';m.departed=true;return m;
}
const plain=x=>JSON.parse(JSON.stringify(x));
function find(predicate){for(let seed=1;seed<=100;seed++){const m=make(seed),id=m._deliverySpecs.findIndex((a,i)=>predicate(a,m,i));if(id>=0)return {m,id};}throw Error('Missing generated fixture');}
function at(m,id,parcel=true){
 const s=m.stops[id];Object.assign(m.van,s.park,{speed:0,hand:true});m.mode='walk';m.activeStop=id;
 const p=F.point(m,id);Object.assign(m.player,{x:p.x-s.side*.5,z:p.z,yaw:s.side*Math.PI/2,pitch:0});
 if(parcel){const p=m.parcels[id];Object.assign(p,{location:'held',loaded:true,scanned:true});m.heldId=p.id;m.scan(p.id);}
}
const act=(m,id,command,value)=>F.act(m,id,command,value);
const reports=type=>W.events.filter(e=>e.type===type);
function intercom(m,id){const a=m._deliverySpecs[id].protocol;act(m,id,'intercom.call',{button:a.button,purpose:'delivery'});m.elapsed+=2;act(m,id,'intercom.open');m.contact(id);}
function reattempt(m,id){const a=m._deliverySpecs[id].reattempt;act(m,id,'reattempt.card');act(m,id,'reattempt.retain',a.reason);act(m,id,'reattempt.book',{day:a.nextDay,slot:a.slot});}
function resume(m){const raw=plain(m.snapshot()),events=plain(W.events),r=M.restore(raw);assert.ok(r,'checkpoint accepted');assert.deepEqual(plain(r.snapshot()),raw);assert.deepEqual(plain(W.events),events,'restore must not report');assert.equal(r.solids.length,m.solids.length,'restore must not duplicate barriers');return r;}
test.beforeEach(()=>W.begin());

test('protocols match actual generated building and parcel types, not a randomly assigned facade',()=>{
 const seen=new Set();
 for(let seed=1;seed<=40;seed++){
  const m=make(seed),town=O.town.build(m.routePlan.townSeed);
  for(let i=0;i<5;i++){
   const a=m._deliverySpecs[i],p=a.protocol,door=m._doorSpecs[i],kind=town.lotById(m.stops[i].lotId).kind;
   assert.equal(a.reattempt.parcel,m.parcels[i].id);if(!p)continue;seen.add(a.gated?'gated':p.kind);
   if(p.kind==='intercom'){
    assert.ok(kind==='apartment'||a.gated);
    if(kind==='apartment'){const pkg=m.routePlan.route[i].stop.packages[0];assert.equal(p.button,String(pkg.unit||pkg.to));}
   }
   if(p.kind==='reception'){assert.equal(kind,'business');assert.equal(p.receptionist,door.person);assert.equal(door.adult,false);}
   if(p.kind==='locker'){assert.equal(kind,'house');assert.equal(door.signature,false);assert.equal(door.dog,false);assert.equal(door.wrong,false);assert.equal(door.present,false);assert.notEqual(m.routePlan.dispatch&&m.routePlan.dispatch.stop,i);}
  }
  resume(m);
 }
 assert.deepEqual([...seen].sort(),['gated','intercom','locker','reception']);
});
test('the live later-day schedule keeps all original signature and ID requirements while locker policy is pending',()=>{
 for(let day=3;day<=8;day++)for(let seed=1;seed<=10;seed++){
  const plan=O.fpLater.prepare(O.fpRoute.plan(day,seed)),before=plain(plan),m=M.create('campaign',seed,F.prepare(plan));
  O.fpDay.configure(m);D.configure(m);F.configure(m);assert.deepEqual(plain(plan),before);
  assert.equal(m._doorSpecs.filter(a=>a.signature).length,5);assert.ok(m._doorSpecs.some(a=>a.adult));
  assert.ok(m._deliverySpecs.every(a=>!a.protocol||a.protocol.kind!=='locker'),'signed parcels cannot silently become unattended locker drops');
  assert.equal(m.routePlan.dispatch.kind,'signature');resume(m);
 }
});
test('gated sites never put their intercom inside the blocked driveway car',()=>{
 let gates=0,obstructions=0;
 for(let day=4;day<=7;day++)for(let seed=1;seed<=12;seed++){
  const m=make(seed,day,true,p=>{p.navigation=1;});gates+=m._deliverySpecs.filter(a=>a.gated).length;
  for(const car of O.fpNav.obstacles(m).filter(o=>o.driveway)){
   obstructions++;assert.equal(m._deliverySpecs[car.stop].gated,false,`day ${day}, seed ${seed}: the existing blocked approach must stay walkable`);
  }
 }
 assert.ok(gates>0&&obstructions>0);
});
test('the first two days and unmarked legacy checkpoints retain their original flow',()=>{
 for(const day of [1,2,3]){
  const plan=O.fpRoute.plan(day,7);if(day<3)assert.equal(F.prepare(plan),plan);
  const m=make(7,day,day<3);assert.equal(m.deliveryStops,undefined);assert.equal(Object.hasOwn(m.snapshot(),'deliveryStops'),false);resume(m);
 }
 assert.throws(()=>M.create('campaign',7,{...O.fpRoute.plan(1,7),deliveries:1}),/Invalid delivery-stop version/);
});
test('intercom access cannot be bypassed through contact or the existing delivery API',()=>{
 const {m,id}=find(a=>a.protocol&&a.protocol.kind==='intercom');at(m,id);
 assert.match(m.contact(id),/intercom/);assert.equal(m.stops[id].contacted,false);
 m.stops[id].contacted=true;assert.match(m.deliver(id,'handover'),/intercom buzz/);assert.equal(m.stops[id].resolved,false);
 intercom(m,id);assert.equal(m.stops[id].contacted,true);assert.match(m.deliver(id,'handover'),/Delivery recorded/);
 assert.equal(reports('stop.intercom').length,1);assert.equal(reports('stop.intercom')[0].ok,true);
 assert.equal(reports('stop.intercom')[0].stop,id+1);assert.equal(reports('deliver.outcome')[0].ok,true);
 m.deliver(id,'handover');assert.equal(reports('stop.intercom').length,1);resume(m);
});
test('a premature unlock stays a failed intercom check after recovery and resume, without double grading the delivery outcome',()=>{
 let {m,id}=find(a=>a.protocol&&a.protocol.kind==='intercom');at(m,id);act(m,id,'intercom.open');
 assert.equal(m.deliveryStops.stops[id].protocol.opened,false);m=resume(m);intercom(m,id);m.deliver(id,'handover');
 assert.equal(reports('stop.intercom')[0].ok,false);assert.equal(reports('deliver.outcome')[0].ok,true);
 const before=plain(W.events);m=resume(m);F.resolve(m,id,'handover');assert.deepEqual(plain(W.events),before);
});
test('a gated site has a real walking barrier until the entry buzz; its fence remains solid',()=>{
 const {m,id}=find(a=>a.gated),s=m.stops[id];at(m,id,false);m.paused=false;
 Object.assign(m.player,{x:s.x-s.side*4,z:s.z,yaw:s.side*Math.PI/2});
 for(let i=0;i<80;i++)m.step({forward:true,careful:true},.025);
 assert.ok((s.x-m.player.x)*s.side>2.8);assert.ok(!m.deliveryStops.stops[id].protocol.opened);
 at(m,id,false);intercom(m,id);assert.equal(m._deliverySolids[id].x,1e6);
 for(const dz of [-3.1,3.1])assert.equal(m.blocked(s.x-s.side*2.6,s.z+dz),true);
 for(const dz of [-3.8,3.8])assert.equal(m.blocked(s.x-s.side*1.3,s.z+dz),true,'the side rail joins the gate fence to the facade');
 resume(m);
});
test('an unanswered apartment can be retained after waiting, without fabricating an intercom success or failure',()=>{
 const seed=find(a=>a.protocol&&a.protocol.kind==='intercom'&&!a.gated).m.seed;let chosen=-1;
 const m=make(seed,3,true,plan=>{chosen=plan.route.findIndex(r=>r.type==='apartment');assert.ok(chosen>=0);plan.route[chosen].stop.answer=null;});
 const id=chosen;at(m,id);const a=m._deliverySpecs[id].protocol;act(m,id,'intercom.call',{button:a.button,purpose:'delivery'});
 m.elapsed=7.9;assert.match(m.contact(id),/intercom/);m.elapsed=8;m.contact(id);assert.equal(m.stops[id].contacted,true);
 assert.equal(D.expected(m,id),'exception');reattempt(m,id);m.deliver(id,'exception');
 assert.equal(reports('stop.intercom').length,0);assert.equal(reports('stop.reattempt')[0].ok,true);
 assert.equal(reports('deliver.outcome')[0].ok,true);assert.equal(m.parcels[id].returnRequired,true);resume(m);
});
test('named business reception retains the original signature requirement and reports through the contract',()=>{
 const {m,id}=find(a=>a.protocol&&a.protocol.kind==='reception');at(m,id);m.contact(id);
 assert.match(m.deliver(id,'handover'),/named reception/);assert.equal(m.stops[id].resolved,false);
 const a=m._deliverySpecs[id].protocol;act(m,id,'reception.identify',{role:'reception',name:a.receptionist});
 act(m,id,'reception.sign',a.receptionist);assert.equal(m.doorsteps.stops[id].signatureName,a.receptionist);
 act(m,id,'reception.handover');m.deliver(id,'handover');assert.equal(reports('stop.reception')[0].ok,true);
 assert.equal(reports('deliver.outcome')[0].ok,true);resume(m);
});
test('remote, driving or unscanned actions cannot sign, move or book the parcel',()=>{
 const {m,id}=find(a=>a.protocol&&a.protocol.kind==='reception');const state=()=>JSON.stringify(m.deliveryStops);
 let before=state();act(m,id,'reception.sign','Someone');assert.equal(state(),before);
 at(m,id,false);m.contact(id);before=state();act(m,id,'reception.sign',m._doorSpecs[id].person);assert.equal(state(),before);
 at(m,id);m.mode='cab';before=state();act(m,id,'reattempt.retain','access');assert.equal(state(),before);
 m.mode='walk';m.van.speed=2;act(m,id,'reattempt.book',{day:4,slot:'afternoon'});assert.equal(state(),before);
});
test('locker completion guards the old porch-box route and keeps parcel verification',()=>{
 let {m,id}=find(a=>a.protocol&&a.protocol.kind==='locker');at(m,id);m.contact(id);
 assert.match(m.deliver(id,'safeplace'),/assigned locker/);assert.equal(m.stops[id].resolved,false);
 const a=m._deliverySpecs[id].protocol;act(m,id,'locker.open',a.compartment);act(m,id,'locker.scan',a.parcel);m=resume(m);
 act(m,id,'locker.deposit');act(m,id,'locker.close');assert.match(m.deliver(id,'safeplace'),/photo/);
 act(m,id,'locker.photo');m.deliver(id,'safeplace');assert.equal(reports('stop.locker')[0].ok,true);
 assert.equal(reports('deliver.outcome')[0].ok,true);assert.equal(m.parcels[id].location,'delivered');resume(m);
});
test('reattempt grades the card, retention reason and next booking once; retaining a parcel is always possible',()=>{
 for(const completed of [true,false]){
  W.begin();const {m,id}=find((a,m,i)=>!m._doorSpecs[i].present&&m._doorSpecs[i].signature);at(m,id);m.contact(id);
  if(completed)reattempt(m,id);m.deliver(id,'exception');assert.equal(m.parcels[id].returnRequired,true);
  assert.equal(reports('stop.reattempt').length,1);assert.equal(reports('stop.reattempt')[0].ok,completed);
  assert.equal(reports('deliver.outcome')[0].ok,true);resume(m);
 }
});
test('richer-stop actions cannot override adult ID, wrong-address or dispatch checks',()=>{
 const adult=find((a,m,i)=>m._doorSpecs[i].adult);at(adult.m,adult.id);adult.m.contact(adult.id);
 assert.equal(adult.m._deliverySpecs[adult.id].protocol,null);act(adult.m,adult.id,'reception.sign',adult.m._doorSpecs[adult.id].person);
 D.sign(adult.m,adult.id,adult.m._doorSpecs[adult.id].person);adult.m.deliver(adult.id,'handover');assert.equal(reports('stop.age-check')[0].ok,false);
 W.begin();const wrong=find((a,m,i)=>m._doorSpecs[i].wrong);at(wrong.m,wrong.id);wrong.m.contact(wrong.id);reattempt(wrong.m,wrong.id);wrong.m.deliver(wrong.id,'exception');
 assert.equal(reports('stop.wrong-address')[0].ok,true);assert.equal(reports('stop.reattempt')[0].ok,true);assert.equal(reports('deliver.outcome')[0].ok,true);
 for(let seed=1;seed<=30;seed++){
  const m=make(seed),dispatch=m.routePlan.dispatch;if(!dispatch)continue;const p=m._deliverySpecs[dispatch.stop].protocol;
  assert.ok(!p||p.kind!=='locker','a locker cannot replace the dispatch-selected safe place');
 }
});
test('campaign restore rejects missing, extra, mismatched and impossible richer-stop data',()=>{
 const {m,id}=find(a=>a.gated);at(m,id);intercom(m,id);const raw=plain(m.snapshot());
 for(const corrupt of [d=>{delete d.deliveryStops;},d=>{d.deliveryStops.version=2;},d=>{d.deliveryStops.stops.pop();},
  d=>{d.deliveryStops.stops[id].protocol.parcel='other';},d=>{d.deliveryStops.stops[id].protocol.calledAt=d.elapsed+1;},
  d=>{d.deliveryStops.stops[id].reattempt.booked=true;},d=>{d.deliveryStops.extra=true;}]){
  const d=plain(raw);corrupt(d);assert.equal(M.restore(d),null);
 }
 const old=make(7,3,false).snapshot();old.deliveryStops=raw.deliveryStops;assert.equal(M.restore(old),null);
});
test('actual richer-stop reports fit SCORM 1.2 and replay to the same score without counting retries',()=>{
 for(const kind of ['intercom','reception','locker','reattempt']){
  const {m,id}=find((a,m,i)=>kind==='reattempt'?!m._doorSpecs[i].present&&m._doorSpecs[i].signature:a.protocol&&a.protocol.kind===kind);at(m,id);
  if(kind==='intercom')intercom(m,id);else m.contact(id);
  const a=m._deliverySpecs[id].protocol;
  if(kind==='reception'){act(m,id,'reception.identify',{role:'reception',name:a.receptionist});act(m,id,'reception.sign',a.receptionist);act(m,id,'reception.handover');}
  if(kind==='locker')for(const [action,value] of [['open',a.compartment],['scan',a.parcel],['deposit'],['close'],['photo']])act(m,id,'locker.'+action,value);
  if(kind==='reattempt')reattempt(m,id);m.deliver(id,kind==='reattempt'?'exception':kind==='locker'?'safeplace':'handover');
 }
 const events=plain(W.events),before=W.log.score(),data=O.save.defaults();data.workday={current:{id:'c33',day:3,events},last:null};
 const packed=O.save.fit(JSON.stringify(data),O.save.SCORM12_LIMIT);assert.ok(packed.length<=4000);
 const decoded=O.save.unpackDay(JSON.parse(packed).workday.current),replayed=W.replay(decoded.events);assert.equal(replayed.log.score(),before);
 for(const type of ['stop.intercom','stop.reception','stop.locker','stop.reattempt'])assert.ok(decoded.events.some(e=>e.type===type));
 W.restore(decoded);const n=W.events.length;events.forEach(e=>W.report(e.type,e));assert.equal(W.events.length,n);
});
test('thirty five-stop model journeys resume every richer-stop step and return retained parcels to Dispatch',()=>{
 const evidence={journeys:30,stops:150,checkpoints:0,scormMax:0,ownedStateMax:0,coverage:[],travel:'Position fixtures; delivery actions, reports, checkpoint readers and returns are real.'},seen=new Set();
 const cases=Array.from({length:26},(_,i)=>({seed:i+1,day:3+(i+1)%10}));
 for(const kind of ['gated','intercom','reception','locker'])cases.push({seed:find(a=>kind==='gated'?a.gated:a.protocol&&a.protocol.kind===kind).m.seed,day:3});
 evidence.cases=cases;
 for(const {seed,day} of cases){
  W.begin();let m=make(seed,day);
  const checkpoint=()=>{m=resume(m);evidence.checkpoints++;evidence.ownedStateMax=Math.max(evidence.ownedStateMax,JSON.stringify(m.deliveryStops).length);};
  const step=(id,command,value)=>{act(m,id,command,value);checkpoint();};checkpoint();
  for(let id=0;id<5;id++){
   at(m,id);const spec=m._doorSpecs[id],a=m._deliverySpecs[id].protocol;
   if(spec.dog){const s=m.stops[id];Object.assign(m.player,{x:s.x-s.side*3.4,z:s.z});D.secureDog(m,id);m.scan();checkpoint();}
   if(a&&a.kind==='intercom'){
    seen.add(m._deliverySpecs[id].gated?'gated':'intercom');step(id,'intercom.call',{button:a.button,purpose:'delivery'});
    m.elapsed+=2;step(id,'intercom.open');
   }
   m.contact(id);checkpoint();
   if(spec.difficult){D.respond(m,id,true);checkpoint();}
   if(spec.adult){D.viewID(m,id);D.checkID(m,id,D.validID(m,id));checkpoint();}
   const outcome=D.expected(m,id);
   if(outcome==='exception'){
    const r=m._deliverySpecs[id].reattempt;seen.add('reattempt:'+r.reason);step(id,'reattempt.card');step(id,'reattempt.retain',r.reason);step(id,'reattempt.book',{day:r.nextDay,slot:r.slot});
   }else if(a&&a.kind==='reception'){
    seen.add('reception');step(id,'reception.identify',{role:'reception',name:a.receptionist});step(id,'reception.sign',a.receptionist);step(id,'reception.handover');
   }else if(a&&a.kind==='locker'){
    seen.add('locker');for(const [action,value] of [['open',a.compartment],['scan',a.parcel],['deposit'],['close'],['photo']])step(id,'locker.'+action,value);
   }else if(outcome==='handover'&&spec.signature){D.sign(m,id,spec.person);checkpoint();}
   m.deliver(id,outcome);assert.equal(m.stops[id].resolved,true,`seed ${seed}, stop ${id}`);checkpoint();
   assert.equal(reports('deliver.outcome').at(-1).ok,true,`seed ${seed}, stop ${id}`);
   if(outcome==='exception'){
    m.cargoOpen=true;Object.assign(m.player,m.point('slot'+id));assert.equal(m.place('slot'+id),'');m.cargoOpen=false;checkpoint();
   }
  }
  Object.assign(m.van,{x:4,z:8,speed:0,hand:true});m.cargoOpen=true;
  for(const p of m.parcels.filter(p=>p.returnRequired)){
   Object.assign(m.player,m.point(p.id));assert.equal(m.pickup(p.id),'');Object.assign(m.player,m.point('returns'));m.scan();assert.equal(m.returnParcel(),'Return recorded.');checkpoint();
  }
  Object.assign(m.player,m.point('dispatch'));assert.equal(m.finish(),'');checkpoint();
  for(const event of W.events)if(event.type.startsWith('stop.'))assert.equal(event.ok,true,`seed ${seed}: ${event.type}`);
  const data=O.save.defaults();data.workday={current:{id:'c33-'+seed,day:m.routePlan.day,events:plain(W.events)},last:null};
  const packed=O.save.fit(JSON.stringify(data),O.save.SCORM12_LIMIT),decoded=O.save.unpackDay(JSON.parse(packed).workday.current);
  assert.ok(packed.length<=4000);assert.equal(W.replay(decoded.events).log.score(),W.log.score());evidence.scormMax=Math.max(evidence.scormMax,packed.length);
 }
 evidence.coverage=[...seen].sort();for(const kind of ['gated','intercom','reception','locker','reattempt:address','reattempt:id'])assert.ok(seen.has(kind),kind);
 const out=__dirname+'/out/fp-review';fs.mkdirSync(out,{recursive:true});fs.writeFileSync(out+'/c33-campaign-journeys.json',JSON.stringify(evidence,null,2)+'\n');
});
