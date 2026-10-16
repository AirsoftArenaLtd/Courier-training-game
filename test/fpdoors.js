/* Real doorstep requirements, choices, physical barriers and optional checkpoints. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const c={THREE:require('../lib/three.min.js')};c.window=c;vm.createContext(c);
for(const f of ['data/theme.js','data/config.js','data/m3_doorsteps.js','data/m8_stops.js','data/town.js','data/workday_events.js','src/core/theme.js','src/core/rig.js','src/core/scenery.js','src/core/townart.js','src/core/town.js','src/core/shift.js','src/core/scorelog.js','src/core/workday.js','src/core/firstperson.js','src/core/fpmission.js','src/core/fproute.js','src/core/fpday.js','src/core/fpdoors.js','src/core/world3d.js','src/core/fpbranding.js','src/core/fpworld.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),c);
c.OTR.save={data:{townSeed:1}};const M=c.OTR.fpMission,D=c.OTR.fpDoors,W=c.OTR.workday;
const make=(seed=7,day=2)=>{const m=M.create('campaign',seed,c.OTR.fpRoute.plan(day,seed));D.configure(m);m.doorsteps.date='2026-10-15';D.configure(m,m.doorsteps);m.phase='route';m.departed=true;return m;};
const find=predicate=>{for(let seed=1;seed<100;seed++){const m=make(seed),id=m._doorSpecs.findIndex(a=>predicate(a,seed));if(id>=0)return {m,id};}throw Error('No generated fixture');};
const atDoor=(m,id)=>{const s=m.stops[id],p=m.parcels[id];Object.assign(m.van,s.park,{speed:0,hand:true});m.mode='walk';m.activeStop=id;Object.assign(m.player,{x:s.x-s.side,z:s.z,yaw:s.side*Math.PI/2,pitch:0});Object.assign(p,{location:'held',loaded:true,scanned:true,stopScanned:true});m.heldId=p.id;m.contact(id);return p;};
const events=t=>W.events.filter(e=>e.type===t);
test.beforeEach(()=>W.begin());
test('generated recipients, signatures, dogs and hazards match the source lessons',()=>{
 for(let seed=1;seed<=15;seed++){
  const m=make(seed);for(let i=0;i<5;i++){const a=m._doorSpecs[i],source=m.routePlan.route[i].stop;assert.equal(a.present,!!source.answer);assert.equal(a.adult,source.packages[0].service==='adult');assert.equal(a.dog,!!source.dog);assert.equal(a.signature,['signature','adult'].includes(source.packages[0].service));}
 }
});
test('signature delivery records the actual signer; an omitted or wrong name fails the outcome',()=>{
 for(const choice of ['correct','wrong','omitted']){W.begin();const {m,id}=find(a=>a.signature&&a.present&&!a.adult&&!a.dog&&!a.wrong);atDoor(m,id);if(choice!=='omitted')D.sign(m,id,choice==='correct'?m._doorSpecs[id].person:'Occupant');m.deliver(id,'handover');assert.equal(events('deliver.outcome')[0].ok,choice==='correct',choice);}
});
test('an absent signature recipient requires a retained exception',()=>{
 const {m,id}=find(a=>a.signature&&!a.present&&!a.wrong);atDoor(m,id);assert.match(m.deliver(id,'handover'),/Nobody is present/);assert.equal(m.stops[id].resolved,false);assert.match(m.deliver(id,'exception'),/Exception recorded/);assert.equal(m.parcels[id].returnRequired,true);
});
test('photo ID checks cover age, expiry, photo and name before a signed handover',()=>{
 for(let variant=0;variant<5;variant++){
  W.begin();const {m,id}=find((a,seed)=>a.adult&&seed%5===variant);atDoor(m,id);assert.equal(D.viewID(m,id),true);D.checkID(m,id,true);D.sign(m,id,m._doorSpecs[id].person);m.deliver(id,'handover');assert.equal(events('stop.age-check')[0].ok,variant===0,'ID variant '+variant);
 }
});
test('skipped ID is critical, while declining invalid ID keeps the parcel',()=>{
 let {m,id}=find(a=>a.adult);atDoor(m,id);D.sign(m,id,m._doorSpecs[id].person);m.deliver(id,'handover');assert.equal(events('stop.age-check')[0].ok,false);assert.ok(W.log.criticals().some(e=>e.cat==='service'));
 W.begin();({m,id}=find(a=>a.adult));atDoor(m,id);m.deliver(id,'exception');assert.equal(events('stop.age-check')[0].ok,false,'An exception alone cannot claim an ID inspection');
 W.begin();({m,id}=find((a,seed)=>a.adult&&seed%5===1));atDoor(m,id);D.viewID(m,id);D.checkID(m,id,false);m.deliver(id,'exception');assert.equal(events('stop.age-check')[0].ok,true);assert.equal(m.parcels[id].returnRequired,true);
});
test('a wrong label is caught by the physical stop scan and kept as an address exception',()=>{
 const {m,id}=find(a=>a.wrong),p=atDoor(m,id);assert.notEqual(p.address,m.stops[id].address);p.stopScanned=false;assert.match(m.scan(),/does not match/);assert.equal(events('stop.wrong-address').length,0);m.deliver(id,'exception');assert.equal(events('stop.wrong-address')[0].ok,true);assert.equal(p.returnRequired,true);assert.ok(M.restore(m.snapshot()));
 const r=m.snapshot();r.parcels[id].address=m.stops[id].address;assert.equal(M.restore(r),null);
});
test('ignoring an address alert and leaving the package cannot earn caught credit',()=>{
 const {m,id}=find(a=>a.wrong);atDoor(m,id);m.scan();m.deliver(id,'safeplace');assert.equal(events('stop.wrong-address')[0].ok,false);
});
test('an address safety exception overrides planter placement after reading the dispatch update',()=>{
 let m,id;for(let seed=3;seed<100;seed+=3){m=make(seed);c.OTR.fpDay.configure(m);const d=m.routeDay.dispatch;if(d&&d.kind==='planter'&&m._doorSpecs[d.stop].wrong){id=d.stop;break;}}
 assert.notEqual(id,undefined);const d=m.routeDay.dispatch;d.sent=true;atDoor(m,id);c.OTR.fpDay.read(m);m.scan();m.deliver(id,'exception');assert.equal(events('dispatch.update')[0].ok,true);assert.equal(events('stop.wrong-address')[0].ok,true);assert.equal(events('deliver.outcome')[0].ok,true);assert.ok(M.restore(m.snapshot()));
});
test('a resident blocks walking while at the door and leaves after the recorded outcome',()=>{
 const {m,id}=find(a=>a.present&&!a.dog&&!a.wrong);atDoor(m,id);const s=m.stops[id];m.paused=false;Object.assign(m.player,{x:s.x-s.side*2,z:s.z,yaw:s.side*Math.PI/2});
 for(let i=0;i<60;i++)m.step({forward:true,careful:true},.025);assert.ok((s.x-m.player.x)*s.side>1);assert.notEqual(m._doorSolids[id].resident.x,1e6);
 m.deliver(id,'exception');assert.equal(m.stops[id].resolved,true);assert.equal(m._doorSolids[id].resident.x,1e6);
});
test('closed gates block actual walking; waiting outside removes the loose-dog barrier safely',()=>{
 const {m,id}=find(a=>a.dog),s=m.stops[id];Object.assign(m.van,s.park);m.mode='walk';m.paused=false;Object.assign(m.player,{x:s.x-s.side*4,z:s.z,yaw:s.side*Math.PI/2});
 for(let i=0;i<100;i++)m.step({forward:true},.025);assert.ok((s.x-m.player.x)*s.side>2.8);assert.equal(events('stop.dog').length,0);assert.match(D.secureDog(m,id),/secured/);assert.equal(events('stop.dog')[0].ok,true);assert.equal(m._doorSolids[id].gate.x,1e6);
});
test('unsafe gate opening is recorded once and survives recovery and reload',()=>{
 const {m,id}=find(a=>a.dog),s=m.stops[id];Object.assign(m.van,s.park);m.mode='walk';Object.assign(m.player,{x:s.x-s.side*3.4,z:s.z});D.openGate(m,id);D.secureDog(m,id);assert.equal(events('stop.dog').length,1);assert.equal(events('stop.dog')[0].ok,false);const r=M.restore(m.snapshot());assert.ok(r);assert.equal(r.solids.length,m.solids.length);W.begin();D.secureDog(r,id);assert.equal(W.events.length,0);
});
test('both fixed fence sections block walking even after the dog is secured',()=>{
 const {m,id}=find(a=>a.dog),s=m.stops[id];Object.assign(m.van,s.park);m.mode='walk';m.paused=false;
 for(const secured of [false,true])for(const dz of [-3.1,3.1]){
  if(secured){Object.assign(m.player,{x:s.x-s.side*3.4,z:s.z});D.secureDog(m,id);}
  Object.assign(m.player,{x:s.x-s.side*4,z:s.z+dz,yaw:s.side*Math.PI/2});
  for(let i=0;i<80;i++)m.step({forward:true},.025);
  assert.ok((s.x-m.player.x)*s.side>2.8,`Walked through the fence at ${dz}, secured: ${secured}`);
 }assert.ok(M.restore(m.snapshot()));
});
test('a safe-access exception can be scanned and recorded from outside the closed gate',()=>{
 const {m,id}=find(a=>a.dog),s=m.stops[id],p=atDoor(m,id);Object.assign(m.player,{x:s.x-s.side*3.4,z:s.z});m.scan();assert.equal(m.atDelivery(p),true);assert.match(m.deliver(id,'exception'),/Exception recorded/);assert.equal(events('stop.dog')[0].ok,true);
});
test('ice and wet patches need careful steps; movable hazards must be cleared or avoided',()=>{
 const {m,id}=find(a=>a.hazard==='wet'||a.hazard==='ice');atDoor(m,id);Object.assign(m.player,D.point(m,id,'hazard'));D.tick(m,{forward:true,careful:true});assert.equal(events('stop.hazard').length,0);D.tick(m,{forward:true});D.tick(m,{forward:true});assert.equal(events('stop.hazard').length,1);assert.ok(M.restore(m.snapshot()));
 const f=find(a=>a.hazard&&a.hazard!=='wet'&&a.hazard!=='ice');atDoor(f.m,f.id);Object.assign(f.m.player,D.point(f.m,f.id,'hazard'));assert.match(D.clearHazard(f.m,f.id),/Put the parcel/);f.m.parcels[f.id].location='slot'+f.id;f.m.heldId=null;assert.match(D.clearHazard(f.m,f.id),/clear of the path/);assert.equal(f.m.doorsteps.stops[f.id].hazardCleared,true);
});
test('customer responses are graded once and a later polite choice cannot hide an argument',()=>{
 const {m,id}=find(a=>a.difficult);atDoor(m,id);D.respond(m,id,false);D.respond(m,id,true);assert.equal(events('stop.difficult').length,1);assert.equal(events('stop.difficult')[0].ok,false);
});
test('checkpoint validation retains optional evidence and leaves older games compatible',()=>{
 const m=make();assert.ok(M.restore(m.snapshot()));const bad=m.snapshot();bad.doorsteps.stops[0].idDecision=true;assert.equal(M.restore(bad),null);
 for(const kind of ['campaign','practice']){const old=M.create(kind,7);D.configure(old);assert.equal(old.doorsteps,undefined);assert.ok(M.restore(old.snapshot()));}
});
