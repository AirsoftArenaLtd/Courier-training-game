/* Dispatch route changes, additional check-in stops and honest checkpoint/report boundaries. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const c={console};c.window=c;vm.createContext(c);
for(const f of ['data/theme.js','data/config.js','data/m3_doorsteps.js','data/m8_stops.js','data/town.js','data/workday_events.js','src/core/theme.js','src/core/rig.js','src/core/scenery.js','src/core/townart.js','src/core/town.js','src/core/shift.js','src/core/scorelog.js','src/core/scoring.js','src/core/workday.js','src/core/firstperson.js','src/core/fpmission.js','src/core/fpcab.js','src/core/fpmirrors.js','src/core/fprear.js','src/core/fproute.js','src/core/fpsigns.js','src/core/fptraffic.js','src/core/fpstops.js','src/core/fpstopflow.js','src/core/fpdamage.js','src/core/fpdamageflow.js','src/core/fpnav.js','src/core/fplater.js','src/core/fpday.js','src/core/fpdoors.js','src/core/fplighting.js','src/core/fpradio.js','src/core/fpnight.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),c);
const O=c.OTR,R=O.fpRadio,N=O.fpNight,M=O.fpMission,W=O.workday,plain=o=>JSON.parse(JSON.stringify(o));
O.save={data:{townSeed:1}};
const make=(day=4,seed=7)=>{W.begin();const plan=R.prepare(O.fpNav.prepare(O.fpLater.prepare(O.fpRoute.plan(day,seed))));const m=M.create('campaign',seed,plan);O.fpDay.configure(m);O.fpDoors.configure(m);R.configure(m);N.configure(m);m.mode='cab';m.phase='route';m.departed=true;m.paused=false;O.fpLater.depart(m);return m;};
const parked=m=>{m.van.speed=0;m.van.hand=true;};
const sent=m=>{m.van.speed=4;for(let i=0;i<60;i++)R.tick(m,.1);assert.equal(m.radio.sent,true);parked(m);};
const accept=m=>{sent(m);R.read(m);R.accept(m);};
const reports=t=>W.events.filter(e=>e.type===t);
// Travel and already-loaded/scanned parcel positions are fixtures; delivery completion is the real mission action.
const delivery=(m,id)=>{const s=m.stops[id],p=m.parcels[id];Object.assign(m.van,s.park,{speed:0,hand:true});m.mode='walk';Object.assign(m.player,m.point('door'+id));Object.assign(p,{location:'held',loaded:true,scanned:true,stopScanned:true});m.heldId=p.id;m.contact(id);m.deliver(id,'exception');assert.equal(s.resolved,true);};
test('first three days and unmarked older plans have no call or new night state',()=>{
 for(let day=1;day<4;day++){const plan=O.fpRoute.plan(day,7);assert.equal(R.prepare(plan),plan);const m=M.create('campaign',7,plan);R.configure(m);N.configure(m);assert.equal(m.radio,undefined);assert.equal(m.nightDrive,undefined);}
 const m=M.create('campaign',7,O.fpRoute.plan(8,7));R.configure(m);assert.equal(m.radio,undefined);
});
test('a deterministic later night retains explicit presets and respects the trainer night rule',()=>{
 const m=make(6);assert.equal(O.fpLighting.time(m),'night');m.workdayRules={night:false};assert.equal(O.fpLighting.time(m),'morning');
 const p=O.fpRoute.plan(6,1);p.timeOfDay='dusk';assert.equal(R.prepare(p).timeOfDay,'dusk');
});
test('calls wait for actual driving; pauses, walking and return do not advance them',()=>{
 const m=make();m.van.speed=4;
 for(const change of [{paused:true},{paused:false,mode:'walk'},{mode:'cab',phase:'return'},{phase:'route',departed:false}]){Object.assign(m,change);R.tick(m,5);assert.equal(m.radio.travel,0);}
 m.departed=true;R.tick(m,4.9);assert.equal(m.radio.sent,false);R.tick(m,.1);assert.equal(m.radio.sent,true);assert.equal(reports('dispatch.update').length,0);
});
test('reading and responding require the parking brake and a stopped van',()=>{
 const m=make();sent(m);for(const [speed,hand] of [[0,false],[2,true],[-2,true]]){Object.assign(m.van,{speed,hand});assert.match(R.read(m),/Stop and set/);assert.equal(m.radio.read,false);}
 parked(m);assert.match(R.read(m),/Dispatch asks/);m.van.speed=1;assert.match(R.accept(m),/Stop and set/);assert.match(R.decline(m),/Stop and set/);assert.equal(m.radio.accepted,false);assert.equal(reports('dispatch.update').length,0);
});
test('acceptance changes the real destination without changing parcel identities or crediting the call',()=>{
 const m=make(),before=plain(m.parcels);accept(m);assert.equal(m.activeStop,2);assert.equal(O.fpNav.destination(m).x,m.stops[2].park.x);assert.deepEqual(plain(m.parcels),before);assert.equal(reports('dispatch.update').length,0);assert.match(R.accept(m),/already accepted/);
 R.delivered(m,2);assert.equal(reports('dispatch.update').length,0);delivery(m,2);R.delivered(m,2);R.finish(m);assert.equal(reports('dispatch.update').length,1);assert.equal(reports('dispatch.update')[0].ok,true);assert.equal(reports('dispatch.update')[0].stop,3);assert.equal(Object.hasOwn(reports('dispatch.update')[0],'where'),false);
});
test('doing a different delivery first, declining or ignoring the call reports once and never blocks finish',()=>{
 for(const action of ['different','decline','ignore']){const m=make();sent(m);if(action!=='ignore'){R.read(m);if(action==='decline')R.decline(m);else{R.accept(m);delivery(m,0);}}R.finish(m);R.finish(m);assert.equal(reports('dispatch.update').length,1);assert.equal(reports('dispatch.update')[0].ok,false);}
});
test('additional check-ins use a different public curb with paths in both directions across forty seeds',()=>{
 for(let seed=1;seed<=40;seed++){const m=make(5,seed),a=R.descriptor(m);assert.equal(a.kind,'checkin');assert.ok(!m.stops.some(s=>s.lotId===a.lotId));assert.ok(O.fpNav.path(m,{x:2.84,z:8},a.park));assert.ok(O.fpNav.path(m,a.park,{x:2.84,z:8}));assert.equal(R.descriptor(m),a);assert.equal(m.stops.length,5);assert.equal(m.parcels.length,5);}
});
test('a check-in needs actual safe parking at the added destination; moving or remote acknowledgements fail',()=>{
 const m=make(5);accept(m);const a=R.descriptor(m);assert.equal(R.destination(m),a.park);assert.match(R.arrive(m),/Park at/);assert.equal(reports('dispatch.update').length,0);
 Object.assign(m.van,a.park,{speed:1,hand:true});assert.match(R.arrive(m),/Park at/);parked(m);assert.match(R.arrive(m),/recorded your check-in/);assert.equal(R.destination(m),null);assert.equal(reports('dispatch.update').length,1);assert.equal(reports('dispatch.update')[0].ok,true);assert.equal(reports('dispatch.update')[0].stop,null);
});
test('captions persist for unread and accepted calls regardless of audio; completion clears them',()=>{
 const m=make(5);assert.equal(R.caption(m),'');sent(m);assert.match(R.caption(m),/Park safely/);R.read(m);assert.match(R.caption(m),/waiting for your response/);R.accept(m);assert.match(R.caption(m),/check-in is pending/);Object.assign(m.van,R.descriptor(m).park);R.arrive(m);assert.equal(R.caption(m),'');
});
test('state is bounded and copied by snapshots; restore validation never emits a score report',()=>{
 const m=make();accept(m);for(let i=0;i<5000;i++)R.tick(m,.05);const raw=m.snapshot();assert.ok(JSON.stringify(m.radio).length<130);const r=plain(m.radio),n=W.events.length;assert.equal(R.valid(m,r,{...raw,radio:r}),true);assert.equal(W.events.length,n);r.travel=0;assert.equal(m.radio.travel,20);
});
test('malformed radio states and forged report boundaries reject while a missed unread call remains valid',()=>{
 const m=make();sent(m);const raw=m.snapshot(),base=plain(m.radio);
 for(const bad of [{version:2},{travel:21},{travel:-1},{sent:1},{accepted:true},{read:true,sent:false},{result:true},{extra:1}])assert.equal(R.valid(m,{...base,...bad},raw),false,JSON.stringify(bad));
 R.finish(m);assert.equal(R.valid(m,m.radio,m.snapshot()),true);const wrong=m.snapshot();delete wrong.events['radio:r0'];assert.equal(R.valid(m,m.radio,wrong),false);
});
test('headlight credit waits for leg end, requires actual movement, and omits unused places',()=>{
 const m=make(6);m.van.headlights=true;m.van.speed=0;N.tick(m);N.endLeg(m);assert.equal(reports('drive.lights').length,0);m.van.speed=3;N.tick(m);assert.equal(reports('drive.lights').length,0);N.endLeg(m);N.endLeg(m);assert.equal(reports('drive.lights').length,1);assert.equal(reports('drive.lights')[0].ok,true);assert.equal(Object.hasOwn(reports('drive.lights')[0],'where'),false);
});
test('moving without required lights is reported immediately and switching them on cannot erase it',()=>{
 for(const speed of [-1,3]){const m=make(6);m.van.speed=speed;m.van.headlights=false;N.tick(m);m.van.headlights=true;N.tick(m);N.endLeg(m);assert.equal(reports('drive.lights').length,1);assert.equal(reports('drive.lights')[0].ok,false);assert.ok(reports('drive.lights')[0].where);m.leg++;N.tick(m);N.endLeg(m);assert.equal(reports('drive.lights').length,2);assert.equal(reports('drive.lights')[1].ok,true);}
});
test('dusk, fog and storms need lights; clear mornings, parked vans and paused simulation do not',()=>{
 for(const value of ['dusk','fog','storm','morning']){const m=make();m.routePlan.timeOfDay=value==='dusk'?'dusk':'morning';m.routeDay.weather=['fog','storm'].includes(value)?value:'clear';m.van.headlights=false;m.van.speed=4;N.tick(m);assert.equal(reports('drive.lights').length,value==='morning'?0:1);}
 const m=make(6);m.van.speed=0;N.tick(m);m.van.speed=3;m.paused=true;N.tick(m);N.endLeg(m);assert.equal(reports('drive.lights').length,0);
});
test('oncoming glare reuses its output, is bounded, and is absent in reduced motion or daylight',()=>{
 const m=make(6),out={};Object.assign(m.van,{x:0,z:0,yaw:0});Object.assign(m.traffic[0],{x:-2,z:-20,yaw:Math.PI});Object.assign(m.traffic[1],{x:100,z:100});assert.equal(N.glare(m,out,false),out);assert.ok(out.strength>0&&out.strength<=.14);assert.ok(out.x<.5);N.glare(m,out,true);assert.equal(out.strength,0);m.routePlan.timeOfDay='morning';N.glare(m,out,false);assert.equal(out.strength,0);
});
test('real mission snapshots resume at each radio step without replaying reports or changing the next destination',()=>{
 for(const day of [4,5,6]){
  let m=make(day);
  const resume=()=>{const raw=plain(m.snapshot()),before=plain(W.events),next=plain(O.fpNav.destination(m)),r=M.restore(raw);assert.ok(r,'valid radio checkpoint');assert.deepEqual(plain(r.snapshot()),raw);assert.deepEqual(plain(W.events),before);assert.deepEqual(plain(O.fpNav.destination(r)),next);m=r;m.paused=false;};
  resume();sent(m);resume();R.read(m);resume();R.accept(m);resume();
  if(R.descriptor(m).kind==='checkin'){Object.assign(m.van,R.descriptor(m).park);R.arrive(m);}else delivery(m,2);
  resume();R.finish(m);assert.equal(reports('dispatch.update').length,1);
 }
});
test('an authorized route change clears the old route grace period and reanchors the navigation path',()=>{
 const m=make();sent(m);R.read(m);m.navigation.pending={at:0,leg:0,stop:1,where:{x:2,z:8,mph:4}};R.accept(m);assert.equal(m.navigation.pending,null);assert.equal(m.navigation.context,'2');assert.equal(m.navigation.origin.x,m.van.x);assert.equal(reports('drive.route').length,0);
});
test('forty complete later-day plans keep the added curb clear of solids and reachable around closures and low clearances',()=>{
 for(let seed=1;seed<=40;seed++){
  let plan=O.fpStopFlow.prepare(O.fpRoute.plan(5,seed),true);plan=R.prepare(O.fpDamageFlow.prepare(O.fpTraffic.prepare(O.fpNav.prepare(O.fpSigns.prepare(O.fpLater.prepare(plan))))));
  const m=M.create('campaign',seed,plan);O.fpDay.configure(m);O.fpDoors.configure(m);O.fpStopFlow.configure(m);const a=R.descriptor(m);
  assert.ok(!m.solids.some(b=>Math.abs(b.x-a.park.x)<b.w/2+1.15&&Math.abs(b.z-a.park.z)<b.d/2+2.9));
  assert.ok(O.fpNav.path(m,{x:2.84,z:8},a.park));assert.ok(O.fpNav.path(m,a.park,{x:2.84,z:8}));assert.ok(M.restore(m.snapshot()));
 }
});
