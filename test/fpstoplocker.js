/* Live locker authorisation: real scene plans, unchanged non-locker obligations, delivery and restore. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const c={console,URLSearchParams};c.window=c;c.location={search:''};c.addEventListener=()=>{};vm.createContext(c);
for(const f of ['data/theme.js','data/config.js','data/m3_doorsteps.js','data/m8_stops.js','data/town.js','data/workday_events.js','data/shift_briefs.js',
 'src/core/theme.js','src/core/rig.js','src/core/scenery.js','src/core/townart.js','src/core/town.js','src/core/shift.js',
 'src/core/scorelog.js','src/core/scoring.js','src/core/save.js','src/core/workday.js','src/core/firstperson.js',
 'src/core/fpcab.js','src/core/fpmirrors.js','src/core/fprear.js','src/core/fpmission.js','src/core/fproute.js',
 'src/core/fplater.js','src/core/fpday.js','src/core/fpdriving.js','src/core/fploadout.js','src/core/fpdoors.js',
 'src/core/fpsigns.js','src/core/fptraffic.js','src/core/fpnav.js','src/core/fpdamage.js','src/core/fpdamageflow.js','src/core/fpwalkaround.js','src/core/fpwalkaroundflow.js','src/core/fpstops.js','src/core/fpstopflow.js'])
 vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),c);
const O=c.OTR,F=O.fpStopFlow,L=O.fpLater,M=O.fpMission,W=O.workday,plain=x=>JSON.parse(JSON.stringify(x));
O.save.data=O.save.defaults();O.save.data.townSeed=1;
c.Phaser={Scene:class {}};let Scene;O.registerScene=type=>{Scene=type;};
vm.runInContext(fs.readFileSync(__dirname+'/../src/scenes/FirstPersonScene.js','utf8'),c);
const plan=(seed,day=4)=>O.fpDamageFlow.prepare(O.fpTraffic.prepare(O.fpNav.prepare(O.fpSigns.prepare(L.prepare(F.prepare(O.fpRoute.plan(day,seed),true))))));
function mission(seed=7,day=4){
 const m=M.create('campaign',seed,plan(seed,day));O.fpDay.configure(m);O.fpDoors.configure(m);F.configure(m);return m;
}
function locker(){for(let seed=1;seed<=40;seed++){const m=mission(seed);if(Number.isSafeInteger(m.routePlan.lockerStop))return m;}throw Error('No authorised locker in live plans');}
function at(m,id){
 const s=m.stops[id],p=m.parcels[id],point=F.point(m,id);Object.assign(m.van,s.park,{speed:0,hand:true});
 Object.assign(m.player,{x:point.x-s.side*.4,z:point.z});m.mode='walk';m.phase='route';m.activeStop=id;
 m.departed=true;O.fpLater.depart(m);
 Object.assign(p,{location:'held',loaded:true,scanned:true,stopScanned:true});m.heldId=p.id;m.contact(id);
}
function restore(m){const raw=plain(m.snapshot()),events=plain(W.events),r=M.restore(raw);assert.ok(r,'live checkpoint accepted');assert.deepEqual(plain(r.snapshot()),raw);assert.deepEqual(plain(W.events),events);return r;}
test.beforeEach(()=>W.begin());

test('one originally standard parcel may stay standard; every other signature, ID and dispatch obligation is unchanged',()=>{
 let count=0;
 for(let day=3;day<=7;day++)for(let seed=1;seed<=40;seed++){
  const raw=O.fpRoute.plan(day,seed),before=plain(raw),baseline=L.prepare(raw),live=L.prepare(F.prepare(raw,true));
  assert.deepEqual(plain(raw),before,'preparation never edits the original plan');
  const eligible=raw.route.flatMap((r,i)=>r.stop.packages[0].service==='standard'&&!r.stop.dog&&(!raw.dispatch||raw.dispatch.stop!==i)?[i]:[]);
  const id=live.lockerStop;
  if(eligible.length){assert.ok(eligible.includes(id),'authorisation names an original standard, non-dog, non-dispatch parcel');count++;}
  else assert.equal(id,undefined,'days without an eligible parcel retain every requirement');
  for(let i=0;i<5;i++){
   if(i===id){assert.equal(live.route[i].stop.packages[0].service,'standard');assert.equal(raw.route[i].stop.packages[0].service,'standard');}
   else assert.deepEqual(plain(live.route[i]),plain(baseline.route[i]),'stop '+i+' keeps its exact old requirements');
  }
  assert.deepEqual(plain(live.dispatch),plain(baseline.dispatch),'existing dispatch message remains unchanged');
 }
 assert.ok(count>100,'authorised lockers are reachable across real generated workdays');
});

test('the first two days and old plans have no new authorisation or requirement changes',()=>{
 for(const day of [1,2])for(let seed=1;seed<=10;seed++)assert.deepEqual(plain(L.prepare(F.prepare(O.fpRoute.plan(day,seed),true))),plain(L.prepare(O.fpRoute.plan(day,seed))));
 const old=L.prepare(F.prepare(O.fpRoute.plan(4,7))),before=plain(old);
 assert.deepEqual(plain(F.prepare(old,true)),before,'an old already-prepared day is not retrofitted');
 assert.equal(old.lockerStop,undefined);assert.equal(old.route.filter(r=>r.stop.packages[0].service!=='standard').length,5);
 const m=M.create('campaign',7,old);O.fpDay.configure(m);O.fpDoors.configure(m);F.configure(m);
 assert.equal(F.authorised(m,undefined),false);assert.equal(F.brief(m),'','older plans have no locker brief');
});

test('the actual scene launch nominates before later-day rules, and the morning brief and manifest name the locker site',()=>{
 O.save.data.route.days=3;
 const scene={progress:O.fpStore.empty(),transition:fn=>fn(),rebuildWorld(){},checkpoint(){},closePanel(){},toHub(){},showPanel(title,body){this.lastPanel={title,body};}};
 scene.progress.sequence=6;Scene.prototype.launch.call(scene,'campaign');const m=scene.model,id=m.routePlan.lockerStop;
 assert.ok(Number.isSafeInteger(id),'the real launch path includes authorisation');
 assert.equal(m.routePlan.walkaround,1);assert.equal(O.fpWalkaround.valid(m.walkaround,m.damage),true);
 assert.equal(m._deliverySpecs[id].protocol.kind,'locker');assert.equal(m._doorSpecs[id].signature,false);assert.equal(m._doorSpecs[id].adult,false);
 Object.assign(m.player,m.point('dispatch'));Scene.prototype.showMorningBrief.call(scene);
 assert.match(scene.lastPanel.body,/locker/i);assert.ok(scene.lastPanel.body.includes(m.stops[id].address));
 Scene.prototype.showManifest.call(scene,id);assert.match(scene.lastPanel.body,/locker/i);assert.ok(scene.lastPanel.body.includes(m.parcels[id].tracking));
 assert.doesNotMatch(m.serviceLabel(id),/porch box|signature required/i);
});

test('a live later-day locker completes scan, custody, closed-door photo, delivery and every checkpoint once',()=>{
 let m=locker();const id=m.routePlan.lockerStop;at(m,id);assert.equal(m.stops[id].service,'safeplace');
 assert.equal(m.routePlan.damage,1);assert.ok(m.damage,'the locker checkpoints retain merged damage state');
 assert.match(m.deliver(id,'safeplace'),/assigned locker/);assert.equal(m.stops[id].resolved,false);
 const compartment=m._deliverySpecs[id].protocol.compartment;
 for(const [action,value] of [['open',compartment],['scan',m.parcels[id].id],['deposit'],['close'],['photo']]){
  F.act(m,id,'locker.'+action,value);assert.equal(m._deliveryActionOK,true,action);m=restore(m);
 }
 assert.match(m.deliver(id,'safeplace'),/recorded/);assert.equal(m.stops[id].resolved,true);m=restore(m);
 const reports=W.events.filter(e=>e.type==='stop.locker');assert.equal(reports.length,1);assert.equal(reports[0].ok,true);
 assert.equal(reports[0].where,undefined,'a successful check has no unused map place');
 m.deliver(id,'safeplace');assert.equal(W.events.filter(e=>e.type==='stop.locker').length,1);
});

test('signed, age-restricted, dog, dispatch, invalid-index and early-day authorisations are rejected',()=>{
 const original=plan(7,3),id=original.lockerStop;assert.ok(Number.isSafeInteger(id));
 for(const edit of [p=>{p.route[id].stop.packages[0].service='signature';},p=>{p.route[id].stop.packages[0].service='adult';},
  p=>{p.route[id].stop.dog={};},p=>{p.dispatch.stop=id;},p=>{p.lockerStop=5;},p=>{p.lockerStop=-1;},p=>{p.lockerStop=1.5;},p=>{p.day=2;}]){
  const bad=plain(original);edit(bad);assert.throws(()=>M.create('campaign',7,bad),/locker|delivery-stop/i);
 }
 const m=locker(),raw=plain(m.snapshot());delete raw.routePlan.lockerStop;assert.equal(M.restore(raw),null,'an authorised locker checkpoint cannot lose its plan authorisation');
});

test('a wrong locker attempt keeps one failed report and its actual map place after recovery',()=>{
 let m=locker();const id=m.routePlan.lockerStop;at(m,id);
 F.act(m,id,'locker.open','wrong compartment');assert.equal(m._deliveryActionOK,false);
 const compartment=m._deliverySpecs[id].protocol.compartment;
 for(const [action,value] of [['open',compartment],['scan',m.parcels[id].id],['deposit'],['close'],['photo']]){
  F.act(m,id,'locker.'+action,value);assert.equal(m._deliveryActionOK,true,action);m=restore(m);
 }
 m.deliver(id,'safeplace');const reports=W.events.filter(e=>e.type==='stop.locker');
 assert.equal(reports.length,1);assert.equal(reports[0].ok,false);
 assert.ok(Math.abs(reports[0].where.x-m.player.x)<.051);assert.ok(Math.abs(reports[0].where.z-m.player.z)<.051);
 restore(m);assert.equal(W.events.filter(e=>e.type==='stop.locker').length,1);
});

test('native later-day gates keep a clear walking entry with navigation and damage present',()=>{
 let gates=0;
 for(let day=4;day<=7;day++)for(let seed=1;seed<=40;seed++){
  const m=mission(seed,day);assert.ok(m.damage);assert.equal(m._damageClearances.length,2);
  for(let id=0;id<5;id++)if(m._deliverySpecs[id].gated){
   gates++;const s=m.stops[id],p=F.point(m,id),a=m._deliverySpecs[id].protocol;at(m,id);
   Object.assign(m.player,{x:p.x-s.side*1.2,z:p.z});
   assert.equal(m.blocked(s.x-s.side*2.6,p.z),true,'the locked gate blocks the entry');
   F.act(m,id,'intercom.call',{button:a.button,purpose:'delivery'});m.elapsed+=2;F.act(m,id,'intercom.open');assert.equal(m._deliveryActionOK,true);
   const start=m.player.x,end=s.x-s.side*1.5;
   for(let n=0;n<=32;n++)assert.equal(m.blocked(start+(end-start)*n/32,p.z),false,'day '+day+', seed '+seed+', entry step '+n);
   Object.assign(m.player,{x:end,z:p.z});assert.equal(m.near('door'+id),true);
  }
 }
 assert.ok(gates>=10,'real native gates are covered');console.log('Native combined clear walking gates:',gates);
});
