/* Real mission phases, physical proximity, contract reports and strict walkaround checkpoints. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const c={URLSearchParams};c.window=c;c.location={search:''};c.addEventListener=()=>{};c.localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};vm.createContext(c);
for(const file of ['data/theme.js','data/config.js','data/town.js','data/m3_doorsteps.js','data/m8_stops.js','data/workday_events.js',
 'src/core/theme.js','src/core/rig.js','src/core/scenery.js','src/core/townart.js','src/core/town.js','src/core/shift.js',
 'src/core/scorelog.js','src/core/scoring.js','src/core/save.js','src/core/workday.js','src/core/firstperson.js','src/core/fpmission.js','src/core/fproute.js','src/core/fpsigns.js','src/core/fpnav.js','src/core/fplater.js',
 'src/core/fpday.js','src/core/fpdoors.js','src/core/fpdriving.js','src/core/fpdamage.js','src/core/fpdamageflow.js','src/core/fpwalkaround.js','src/core/fpwalkaroundflow.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+file,'utf8'),c);
const O=c.OTR,M=O.fpMission,F=O.fpWalkaroundFlow,D=O.fpDamage,W=O.workday,plain=x=>JSON.parse(JSON.stringify(x));O.save.data=O.save.defaults();O.save.data.townSeed=1;
function make(seed=7,day=4,marked=true){
 let p=O.fpDamageFlow.prepare(O.fpLater.prepare(O.fpRoute.plan(day,seed)));if(marked)p=F.prepare(p);
 const m=M.create('campaign',seed,p);O.fpDay.configure(m);O.fpDoors.configure(m);O.fpDriving.configure(m);return m;
}
function at(m,zone){const t=F.target(zone),x=t.x+(zone==='right'?.8:['front','rear'].includes(zone)?0:-.8),z=t.z+(zone==='front'?-.8:zone==='rear'?.8:0);Object.assign(m.player,O.fp.local(m.van,x,z));}
function mark(m,zone){at(m,zone);const seen=F.inspect(m,zone);assert.ok(seen,zone);assert.equal(F.record(m,zone,seen.level).correct,true);}
function readyReturn(m){m.stops.forEach(s=>{s.resolved=true;s.outcome='handover';O.fpLater.arrive(m,s.id);});m.parcels.forEach(p=>p.location='delivered');m.phase='return';m.mode='walk';m.van.hand=true;m.van.speed=0;}
function finish(m){Object.assign(m.player,m.point('dispatch'));return m.finish();}
function hit(m,zone,level=1){D.release(m.damage);const event=D.contact(m.damage,zone,'solid',[0,.5,3,8][level]);O.fpDamageFlow.fire(m,event,3);}
function resume(m){const raw=plain(m.snapshot()),events=plain(W.events),r=M.restore(raw);assert.ok(r);assert.deepEqual(plain(r.snapshot()),raw);assert.deepEqual(plain(W.events),events);return r;}
const reports=type=>W.events.filter(e=>e.type===type);
test.beforeEach(()=>{W.begin();});
test('only new marked later-day campaign plans carry the walkaround state',()=>{
 for(const day of [1,2,3]){const m=make(7,day);assert.equal(m.walkaround,undefined);assert.equal(m.routePlan.walkaround,undefined);resume(m);}
 const old=make(7,4,false);assert.equal(old.walkaround,undefined);resume(old);
 for(const kind of ['practice','parking']){if(kind==='parking')continue;const m=M.create(kind,7);assert.equal(m.walkaround,undefined);resume(m);}
 const m=make();assert.ok(m.walkaround);assert.equal(F.phase(m),'pretrip');resume(m);
});
test('all seven checks require a real outside position, empty hands, walking and a parked van',()=>{
 const m=make();for(const zone of O.fpWalkaround.zones){at(m,zone);assert.equal(F.canInspect(m,zone),true,zone);assert.ok(F.inspect(m,zone));}
 at(m,'front');const baseline=JSON.stringify(m.walkaround);
 for(const alter of [()=>m.mode='cab',()=>m.van.hand=false,()=>m.van.speed=.5,()=>m.heldId='parcel0',()=>Object.assign(m.player,m.van)]){
  m.mode='walk';m.van.hand=true;m.van.speed=0;m.heldId=null;at(m,'front');alter();assert.equal(F.inspect(m,'front'),null);assert.equal(F.record(m,'front',1),null);
 }
 assert.equal(JSON.stringify(m.walkaround),baseline);m.mode='walk';m.heldId=null;Object.assign(m.van,{speed:0,hand:true});m.player.x+=20;assert.equal(F.inspect(m,'front'),null);
});
test('a rotated moved van keeps every physical inspection point attached to its actual zone',()=>{
 const m=make();Object.assign(m.van,{x:-8,z:-32,yaw:1.7});for(const zone of O.fpWalkaround.zones){at(m,zone);assert.ok(F.inspect(m,zone));mark(m,zone);}
 resume(m);assert.equal(m.walkaround.preSeen,127);
});
test('rear checks require closed cargo and roof checks use the reachable ground-side edge',()=>{
 const m=make();at(m,'rear');m.cargoOpen=true;assert.equal(F.inspect(m,'rear'),null);m.cargoOpen=false;assert.ok(F.inspect(m,'rear'));
 at(m,'roof');const p=m.point('wear-roof');assert.ok(Math.hypot(m.player.x-p.x,m.player.z-p.z,p.y-1.65)<2.65);assert.ok(F.inspect(m,'roof'));
});
test('departure assesses only starting wear, once, without any van damage penalty',()=>{
 for(let seed=1;seed<=40;seed++){
  W.begin();const m=make(seed);for(const zone of O.fpWalkaround.zones)mark(m,zone);
  assert.equal(reports('inspect.damage').length,0);m.preparation();const count=m.damage.baseline.filter(Boolean).length;
  assert.equal(reports('inspect.damage').length,count);assert.ok(reports('inspect.damage').every(e=>e.ok));assert.equal(W.events.some(e=>e.type.startsWith('van.damage-')),false);
  m.preparation();assert.equal(reports('inspect.damage').length,count);resume(m);
 }
});
test('missed existing wear is graded at the real departure boundary and never as caused damage',()=>{
 const m=make(8);assert.ok(m.damage.baseline.some(Boolean));m.preparation();assert.equal(reports('inspect.damage').length,1);assert.equal(reports('inspect.damage')[0].ok,false);
 readyReturn(m);assert.equal(finish(m),'');assert.equal(reports('trip.damage-report').length,0);resume(m);
});
test('post-trip inspections require a return to the depot after departure',()=>{
 const m=make();m.preparation();at(m,'front');assert.equal(F.phase(m),null);assert.equal(F.inspect(m,'front'),null);
 readyReturn(m);m.van.x=40;at(m,'front');assert.equal(F.phase(m),null);assert.equal(F.inspect(m,'front'),null);
 m.van.x=4;at(m,'front');assert.ok(F.inspect(m,'front'));resume(m);
});
test('all caused zones record the actual visible condition and survive every checkpoint',()=>{
 let m=make();m.preparation();readyReturn(m);
 for(const [i,zone] of O.fpWalkaround.zones.entries()){hit(m,zone,1+i%3);m=resume(m);mark(m,zone);m=resume(m);}
 assert.equal(reports('trip.damage-report').length,0);assert.equal(finish(m),'');assert.equal(reports('trip.damage-report').length,7);assert.ok(reports('trip.damage-report').every(e=>e.ok));
 const before=plain(W.events);m=resume(m);assert.equal(finish(m),'');assert.deepEqual(plain(W.events),before);
});
test('finish guards protect missing deliveries, retained parcels and unparked or distant vans before grading',()=>{
 const m=make();m.preparation();hit(m,'rear',2);Object.assign(m.player,m.point('dispatch'));assert.notEqual(m.finish(),'');assert.equal(m.walkaround.finished,false);
 readyReturn(m);m.parcels[0].returnRequired=true;assert.notEqual(finish(m),'');assert.equal(m.walkaround.finished,false);m.parcels[0].location='returned';
 m.van.hand=false;assert.notEqual(finish(m),'');assert.equal(m.walkaround.finished,false);m.van.hand=true;m.van.x=40;assert.notEqual(finish(m),'');assert.equal(m.walkaround.finished,false);
 m.van.x=4;assert.equal(finish(m),'');assert.equal(reports('trip.damage-report').length,1);assert.equal(reports('trip.damage-report')[0].ok,false);assert.ok(W.log.criticals().some(e=>e.type==='trip.damage-report'));
});
test('false reporting uses a short zone key once, with no unused stop or map place',()=>{
 let m=make();m.preparation();readyReturn(m);at(m,'front');assert.ok(F.inspect(m,'front'));assert.ok(F.record(m,'front',2).event);m=resume(m);
 at(m,'front');assert.equal(F.record(m,'front',3).event,null);assert.equal(F.record(m,'front',0).correct,true);assert.equal(reports('trip.damage-false').length,1);
 const e=reports('trip.damage-false')[0];assert.equal(e.key,'front');assert.ok(e.where==null);assert.ok(e.stop==null);
});
test('damage after an earlier correct post-trip record still needs inspection again',()=>{
 const m=make();m.preparation();readyReturn(m);hit(m,'left');mark(m,'left');hit(m,'left',3);assert.equal(F.record(m,'left',3),null);
 assert.equal(finish(m),'');assert.equal(reports('trip.damage-report')[0].ok,false);
});
test('trainer-off suppresses inspections and grades without dropping saved prior observations',()=>{
 const m=make(8);mark(m,'wheel');D.setEnabled(m.damage,false);assert.equal(F.phase(m),null);assert.equal(F.inspect(m,'wheel'),null);resume(m);
 m.preparation();readyReturn(m);assert.equal(finish(m),'');assert.equal(reports('inspect.damage').length,0);assert.equal(reports('trip.damage-report').length,0);resume(m);
});
test('mission restore rejects missing, forged, cross-phase or unmarked walkaround records',()=>{
 const raw=plain(make().snapshot());for(const alter of [s=>delete s.walkaround,s=>s.walkaround.day++,s=>s.walkaround.departed=true,s=>s.walkaround.finished=true,s=>s.walkaround.preSeen=128,s=>s.phase='route',s=>delete s.damage,s=>delete s.routePlan.walkaround,s=>s.routePlan.walkaround=2,s=>delete s.routePlan.damage]){
  const bad=plain(raw);alter(bad);assert.equal(M.restore(bad),null);
 }
 const old=plain(make(7,4,false).snapshot());old.walkaround=raw.walkaround;assert.equal(M.restore(old),null);
 const m=make();m.preparation();readyReturn(m);const out=plain(m.snapshot());out.walkaround.finished=true;assert.equal(M.restore(out),null);
});
test('a missing shared workday service does not break physical inspection or mission completion',()=>{
 const m=make(8),workday=O.workday;try{delete O.workday;mark(m,'wheel');m.preparation();readyReturn(m);hit(m,'front');mark(m,'front');assert.equal(finish(m),'');resume(m);}finally{O.workday=workday;}
});
