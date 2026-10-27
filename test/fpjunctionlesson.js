/* Actual traffic controls and motor, bounded local scoring, whole-van gates and an isolated three-round course. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const c={Phaser:{Scene:class{}}};c.window=c;vm.createContext(c);
for(const f of ['data/theme.js','data/config.js','data/town.js','data/workday_events.js','src/core/theme.js','src/core/scorelog.js','src/core/scoring.js','src/core/scenery.js','src/core/rig.js','src/core/townart.js','src/core/town.js','src/core/firstperson.js','src/core/fpmission.js','src/core/fproute.js','src/core/fptraffic.js','src/core/fpdriving.js','src/core/fpmirrors.js','src/core/fprear.js','src/core/fpsignal.js','src/core/fpnav.js','src/core/fpsigns.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),c);
const O=c.OTR;O.registerScene=()=>{};O.workday={report(){throw Error('Junction scoring leaked to the suspended workday.');}};
for(const f of ['src/scenes/shift/TownDriveScene.js','src/scenes/m1/DrivingScene.js','src/core/fpdrivinglesson.js','src/core/fpjunctionlesson.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),c);
const J=O.fpJunctionLesson,clean=x=>JSON.parse(JSON.stringify(x));
function start(index=0){const r={phase:'active',log:new O.ScoreLog(),junctionLesson:J.create()};r.junctionLesson.index=index;return next(r);}
function next(r){r.model=J.model(r);J.attach(r);return r;}
function parkFixture(r){const m=r.model,s=m.junctionLesson;s.travel=20;s.crossed=true;Object.assign(m.van,m.stops[0].park,{speed:0,hand:true});}
function control(r,ok=true,key=J.controlKey(r.model)){return J.report(r,J.rounds[r.junctionLesson.index].type,{key,ok,where:{x:1,z:2,mph:3}});}
test('each approach uses its actual signed junction, an in-bounds parked start and a reachable finish bay',()=>{
 for(let i=0;i<3;i++){
  const r=start(i),m=r.model,s=m.junctionLesson,d=J.rounds[i],layout=O.fpTraffic.layout(m);
  assert.equal(layout[d.index].kind,d.kind);assert.equal(m.mode,'cab');assert.equal(m.trainingArea,null);assert.equal(m.stops.length,1);assert.equal(m.routePlan.route.length,5);assert.equal(m.parcels.length,0);
  assert.ok(m.driveAllowed(m.van));assert.ok(m.driveAllowed(m.stops[0].park));assert.ok(m.van.x>m.bounds.x0+3&&m.van.x<m.bounds.x1-3&&m.van.z>m.bounds.z0+3&&m.van.z<m.bounds.z1-3);
  assert.ok(O.fpNav.route(m).distance>10);assert.equal(J.attach(r),false);assert.equal(m.snapshot().junctionLesson,undefined);assert.equal(m.driving.bus.state,'done');
  parkFixture(r);assert.equal(J.parking(m).ok,true,J.parking(m).reason);
  if(i===1)assert.equal(O.fpTraffic.aspect(O.fpTraffic.signal(m.elapsed,layout[d.index].offset),m.van.yaw),'red');
 }
});
test('only this round’s control key can satisfy its encounter; duplicates and unrelated reports cannot create credit',()=>{
 for(let i=0;i<3;i++){
  const r=start(i),m=r.model,s=m.junctionLesson;assert.equal(control(r,true,'another-junction'),false);assert.equal(s.crossed,false);assert.equal(J.report(r,'drive.school-bus',{key:0,ok:true}),false);
  assert.equal(control(r,false),true);assert.equal(s.crossed,true);assert.equal(control(r,true),false);assert.equal(s.observations[J.rounds[i].type].ok,false);assert.equal(r.log.items.length,0);
 }
});
test('later positive pull-outs cannot dilute a failed signal or mirror observation',()=>{
 const r=start();for(const type of ['drive.signal','drive.mirrors']){
  assert.equal(J.report(r,type,{key:0,ok:true}),true);assert.equal(J.report(r,type,{key:1,ok:false,where:{x:2,z:3,mph:4}}),true);
  for(let i=2;i<12;i++)J.report(r,type,{key:i,ok:true});assert.equal(r.model.junctionLesson.observations[type].ok,false);
 }
 control(r);parkFixture(r);assert.equal(J.record(r),true);assert.equal(r.log.items.length,4);
 for(const type of ['drive.signal','drive.mirrors']){const d=c.OTR_DATA.workdayEvents[type],item=r.log.items.find(x=>x.label===d.fail);assert.equal(item.max,d.max);assert.equal(item.got,0);assert.equal(item.lesson,d.lesson);assert.deepEqual(clean(item.where),{x:2,z:3,mph:4});}
});
test('completion needs observed travel and the whole stopped van, facing traffic, inside the actual bay',()=>{
 for(let i=0;i<3;i++)for(const mutate of [m=>m.van.speed=.2,m=>m.van.hand=false,m=>m.van.yaw+=Math.PI,m=>m.van.z+=15,m=>m.junctionLesson.travel=0,m=>m.junctionLesson.crossed=false]){
  const r=start(i);parkFixture(r);mutate(r.model);assert.equal(J.record(r),false);assert.equal(r.junctionLesson.index,i);assert.equal(r.log.items.length,0);
 }
 const r=start(2);parkFixture(r);r.model.van.x=r.model.stops[0].bay.x0;assert.equal(J.parking(r.model).ok,false);
});
test('the three-round result retains exact catalogue wording and maxima, with a single route obligation per approach',()=>{
 const r=start();for(let i=0;i<3;i++){
  control(r);for(const type of ['drive.signal','drive.mirrors'])J.report(r,type,{key:0,ok:true});parkFixture(r);assert.equal(J.record(r),true);assert.equal(J.record(r),false);
  if(i<2)next(r);
 }
 const result=J.result(r);assert.equal(result.stats.completed,true);assert.equal(result.stats.approaches,3);assert.equal(result.ratios.safety,1);assert.equal(result.ratios.efficiency,1);assert.equal(r.log.items.length,12);
 for(const item of r.log.items){const d=Object.values(c.OTR_DATA.workdayEvents).find(x=>x.label===item.label);assert.ok(d);assert.equal(item.max,d.max);assert.equal(item.got,d.max);assert.equal(item.lesson,d.lesson);assert.equal(item.critical,false,'a passed critical check is not a critical mistake');}
 assert.equal(J.result(r),result);assert.throws(()=>J.model(r),/finished/);
});
test('an actual wrong-route report stays failed at finish, and a red-light failure retains the catalogue critical',()=>{
 const r=start(1);control(r,false);J.report(r,'drive.route',{key:0,ok:false});parkFixture(r);assert.equal(J.record(r),true);
 const route=r.log.items.find(x=>x.cat==='efficiency');assert.equal(route.max,1);assert.equal(route.got,0);assert.equal(route.label,c.OTR_DATA.workdayEvents['drive.route'].fail);
 const red=r.log.items.find(x=>x.label===c.OTR_DATA.workdayEvents['drive.red-light'].fail);assert.equal(red.critical,true);assert.equal(red.got,0);
});
test('timeout retains current observations, supplies missing obligations and earns zero in both categories',()=>{
 const r=start();control(r);const result=J.result(r,'timeout');assert.equal(result.score,0);assert.equal(result.ratios.safety,0);assert.equal(result.ratios.efficiency,0);assert.equal(result.stats.completed,false);assert.equal(result.log.items.length,12);
 assert.equal(result.log.items.find(x=>x.label===c.OTR_DATA.workdayEvents['drive.sign-stop'].label).got,2);assert.equal(J.result(r),result);assert.equal(J.report(r,'drive.signal',{key:'late'}),false);
 const t=r.model.elapsed;r.model.paused=false;r.model.step({forward:true},.05);assert.equal(r.model.elapsed,t);
});
function lookLeft(m){const s=O.fpMirrors.specs[0],seat={x:-.45,y:2.05,z:-1.45},dx=s.x-seat.x,dy=s.y-seat.y,dz=s.z-seat.z;m.van.look=Math.atan2(dx,-dz);m.player.pitch=-Math.atan2(dy,Math.hypot(dx,dz));}
function approach(index,safe){
 const r=start(index),m=r.model,s=m.junctionLesson,d=J.rounds[index];m.paused=false;O.fpSignal.change(m,-1);m.van.belt=true;lookLeft(m);
 // Actual parked simulation/gaze and visible light phases. No timer, event or verdict changes after setup.
 for(let n=0;n<800;n++){
  m.step({},.05);const phase=O.fpTraffic.aspect(O.fpTraffic.signal(m.elapsed,O.fpTraffic.layout(m)[d.index].offset),m.van.yaw);
  if(m.elapsed>3.1&&(!safe||d.kind!=='signal'||phase==='green')&&(!safe||d.kind!=='giveway'||m.elapsed>10&&!O.fpTraffic.conflicts(m,s.control,m.van.yaw)))break;
 }
 m.van.hand=false;m.van.look=0;m.player.pitch=0;
 for(let n=0;n<1000&&!s.crossed;n++)m.step({forward:m.van.speed<(safe?2.5:5)},.05);
 return r;
}
test('the real motor, gaze, indicator timing and traffic phases produce safe observations at all three controls',()=>{
 for(let i=0;i<3;i++){
  const r=approach(i,true),m=r.model,s=m.junctionLesson;assert.equal(s.crossed,true,'approach '+i);assert.equal(s.observations[J.rounds[i].type]?.ok,true,'approach '+i);assert.equal(s.observations['drive.mirrors']?.ok,true);assert.equal(s.observations['drive.signal']?.ok,true);assert.ok(s.travel>2);
  assert.equal(J.record(r),false,'crossing the junction while moving is not a parked finish');const t=m.elapsed,travel=s.travel;m.paused=true;m.step({forward:true},.05);assert.equal(m.elapsed,t);assert.equal(s.travel,travel);
 }
});
test('driving into the actual red signal fails its real catalogue check',()=>{
 const r=approach(1,false),s=r.model.junctionLesson;assert.equal(s.crossed,true);assert.equal(s.observations['drive.red-light'].ok,false);
});
test('round restarts cannot discard observations, and a bounded report overflow cannot finish successfully',()=>{
 const r=start();assert.throws(()=>J.model(r),/Record/);for(let n=0;n<129;n++)J.report(r,'drive.signal',{key:n,ok:true});assert.equal(r.overflow,true);assert.equal(r.model.junctionLesson.seen.size,128);parkFixture(r);assert.equal(J.record(r),false);
});
