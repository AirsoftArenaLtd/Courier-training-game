/* Optional school core: actual catalogue entries, physical town/parking and isolated live school-bus observations. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const c={Phaser:{Scene:class{}}};c.window=c;vm.createContext(c);
for(const f of ['data/theme.js','data/config.js','data/town.js','data/workday_events.js','src/core/theme.js','src/core/scorelog.js','src/core/scoring.js','src/core/scenery.js','src/core/rig.js','src/core/townart.js','src/core/town.js','src/core/firstperson.js','src/core/fpmission.js','src/core/fproute.js','src/core/fptraffic.js','src/core/fpdriving.js','src/core/fpmirrors.js','src/core/fprear.js','src/core/fpsignal.js','src/core/fpnav.js','src/core/fpsigns.js'])vm.runInContext(fs.readFileSync(f==='src/core/fpschoollesson.js'?'/workspace/c39-route-driving/docs/review/set-10/c39-school-paint/fpschoollesson.proposed.js':'/workspace/c39-route-driving/'+f,'utf8'),c);
const O=c.OTR;O.registerScene=()=>{};O.workday={report(){throw Error('A school module wrote a workday report.');}};
for(const f of ['src/scenes/shift/TownDriveScene.js','src/scenes/m1/DrivingScene.js','src/core/fpdrivinglesson.js','src/core/fpschoollesson.js'])vm.runInContext(fs.readFileSync(f==='src/core/fpschoollesson.js'?'/workspace/c39-route-driving/docs/review/set-10/c39-school-paint/fpschoollesson.proposed.js':'/workspace/c39-route-driving/'+f,'utf8'),c);
const S=O.fpSchoolLesson,D=O.fpDrivingLesson,clean=v=>JSON.parse(JSON.stringify(v));
function setup(){const m=S.model(),r={model:m,log:new O.ScoreLog()};m.moduleReport=(type,detail)=>S.report(r,type,detail);S.attach(r);return r;}
test('only the four agreed school types score, with their exact catalogue wording, weights and critical flags',()=>{
 for(const type of S.types)for(const ok of [false,true]){const r=setup(),e=c.OTR_DATA.workdayEvents[type];assert.equal(S.report(r,type,{key:'one',ok,where:{x:1,z:2,mph:3}}),true);const item=r.log.items[0];assert.equal(item.cat,e.cat);assert.equal(item.label,e.kind==='check'&&!ok?e.fail:e.label);assert.equal(item.lesson,e.lesson);assert.equal(item.critical,!!e.critical);assert.equal(item.got,e.kind==='check'?(ok?e.max:0):-e.pts);assert.equal(S.report(r,type,{key:'one',ok:!ok}),false);assert.equal(r.log.items.length,1);assert.equal(S.report(r,'drive.route',{key:'no',ok:false}),false);}
});
test('the school drive has a real school-street entry and a real bay beyond the zone, without changing the workday schema',()=>{
 const r=setup(),m=r.model,s=m.schoolLesson;assert.equal(m.stops.length,1);assert.equal(m.routePlan.route.length,5);assert.equal(m.parcels.length,0);assert.equal(m.trainingArea,null);assert.equal(m.mode,'cab');assert.ok(m.van.z>m.town.school.z1);assert.ok(m.stops[0].park.z<m.town.school.z0);assert.ok(m.driveAllowed(m.van));assert.ok(m.van.z+2.7<m.bounds.z1&&m.van.z-2.7>m.bounds.z0&&m.van.x+1.08<m.bounds.x1&&m.van.x-1.08>m.bounds.x0,'the whole initial van must be inside the map');assert.ok(m.driveAllowed(m.stops[0].park));assert.equal(m.snapshot().schoolLesson,undefined);assert.equal(m.driving.siren.state,'done');assert.equal(m.driving.bus.state,'waiting');assert.equal(S.attach(r),false);
});
test('completion requires the actual whole stopped van in the finish bay after both live road encounters',()=>{
 const r=setup(),m=r.model,s=m.schoolLesson;Object.assign(m.van,m.stops[0].park,{speed:0,hand:true});assert.equal(S.ready(m),false);s.busSeen=s.crossingSeen=true;m.driving.bus.state='leaving';m.crossing.state='resolved';assert.equal(S.ready(m),true);m.van.speed=.2;assert.equal(S.ready(m),false);m.van.speed=0;m.van.hand=false;assert.equal(S.ready(m),false);m.van.hand=true;m.van.z=m.stops[0].bay.z0;assert.equal(S.ready(m),false);
});
test('unseen obligations and an unfinished route cannot earn a successful result, and finishing is idempotent',()=>{
 const r=setup(),result=S.result(r,'timeout');assert.equal(result.score,0);assert.equal(result.ratios.safety,0);assert.equal(result.stats.completed,false);assert.equal(result.log.items.length,2);assert.ok(result.log.items.every(x=>x.got===0));assert.equal(S.result(r),result);assert.equal(S.report(r,'drive.pedestrian',{key:'late'}),false);
 const a=setup(),m=a.model,s=m.schoolLesson;Object.assign(m.van,m.stops[0].park,{speed:0,hand:true});s.busSeen=s.crossingSeen=true;m.driving.bus.state='done';m.crossing.state='resolved';S.report(a,'drive.sign-school',{key:'north'});S.report(a,'drive.school-bus',{key:'bus'});const full=S.result(a);assert.equal(full.score,400);assert.equal(full.ratios.safety,1);assert.equal(full.stats.completed,true);
});
test('the actual motor and live bus produce their agreed local check while pause freezes observation',()=>{
 const r=setup(),m=r.model,s=m.schoolLesson;m.paused=false;m.van.hand=false;m.van.belt=true;let time=0;
 while(time<24&&m.driving.bus.state!=='leaving'){const b=m.driving.bus,v=m.van,ahead=(b.x-v.x)*Math.sin(v.yaw)-(b.z-v.z)*Math.cos(v.yaw),wait=b.state==='flashing'&&ahead<19;m.step({forward:!wait&&v.speed<5,back:wait},.05);time+=.05;}
 assert.equal(m.driving.bus.state,'leaving');assert.equal(s.busSeen,true);assert.equal(s.counts['drive.school-bus'],1);assert.equal(r.log.items.find(x=>x.label===c.OTR_DATA.workdayEvents['drive.school-bus'].label)?.got,2);const t=m.elapsed;m.paused=true;m.step({forward:true},.05);assert.equal(m.elapsed,t);
});
test('a continuous physical school approach clears the live bus and children without injecting verdicts',()=>{
 const r=setup(),m=r.model,s=m.schoolLesson;m.paused=false;m.van.hand=false;m.van.belt=true;
 for(let frame=0;frame<4000&&m.van.z>m.town.school.z0-8;frame++){
  const b=m.driving.bus,v=m.van,busAhead=v.z-b.z,crossAhead=v.z-m.crossing.z;
  const wait=b.state==='flashing'&&busAhead<19||m.crossing.state!=='resolved'&&crossAhead>0&&crossAhead<18;
  m.step({forward:!wait&&v.speed<4,back:wait},.05);
 }
 assert.ok(m.van.z<m.town.school.z0,'the motor must actually pass through the school zone');
 assert.equal(s.busSeen,true);assert.equal(s.crossingSeen,true);assert.equal(m.crossing.state,'resolved');assert.equal(s.counts['drive.school-bus'],1);
 O.fpSigns.finish(m);assert.equal(s.counts['drive.sign-school'],1);assert.ok(r.log.items.every(x=>x.got===2));assert.equal(s.counts['drive.pedestrian'],undefined);assert.equal(s.counts['drive.school-bus-pass'],undefined);
});
test('driving into the actual live crossing produces the catalogue critical instead of a successful school result',()=>{
 const r=setup(),m=r.model;m.paused=false;m.driving.bus.state='done';Object.assign(m.van,{x:m.town.school.x+3.5,z:m.crossing.z+7,yaw:0,speed:0,hand:true,belt:true});
 for(let n=0;n<400&&m.crossing.x<m.town.school.x+1.5;n++)m.step({},.05);
 assert.equal(m.crossing.state,'crossing');m.van.hand=false;
 for(let n=0;n<100&&!m.schoolLesson.counts['drive.pedestrian'];n++)m.step({forward:true},.05);
 assert.equal(m.schoolLesson.counts['drive.pedestrian'],1);const penalty=r.log.items.find(x=>x.label===c.OTR_DATA.workdayEvents['drive.pedestrian'].label);assert.equal(penalty.critical,true);assert.equal(penalty.got,-4);assert.equal(S.result(r,'timeout').ratios.safety,0);
});

function finishPose(){const r=setup(),m=r.model,s=m.schoolLesson;Object.assign(m.van,m.stops[0].park,{speed:0,hand:true});s.busSeen=s.crossingSeen=true;m.driving.bus.state='done';m.crossing.state='resolved';return r;}
test('the school bay rejects a body beyond either painted side while preserving a van just inside',()=>{
 for(const side of [-1,1]){const r=finishPose(),m=r.model;m.van.x+=side*.5;assert.equal(S.ready(m),false,'lateral body overhang '+side);}
 const r=finishPose();r.model.van.x+=.21;assert.equal(S.ready(r.model),true,'one centimetre inside the painted edge');
});
test('the school bay rejects the former end tolerance and a rotated body crossing a side',()=>{
 for(const end of ['z0','z1']){const r=finishPose(),m=r.model;m.van.z=m.stops[0].bay[end]+(end==='z0'?2.6:-2.6);assert.equal(S.ready(m),false,'ten-centimetre end overhang '+end);}
 const r=finishPose();r.model.van.yaw+=.1;assert.equal(S.ready(r.model),false,'the rotated corners cross the paint');
});
test('a reversed whole van cannot finish, and invalid paint parking retains observations with a zero result',()=>{
 const reverse=finishPose();reverse.model.van.yaw+=Math.PI;assert.equal(S.ready(reverse.model),false);
 const r=finishPose();S.report(r,'drive.sign-school',{key:'school'});S.report(r,'drive.school-bus',{key:'bus'});r.model.van.x+=.5;
 const result=S.result(r);assert.equal(result.stats.completed,false);assert.equal(result.score,0);assert.equal(result.ratios.safety,0);assert.equal(result.log.items.length,2);assert.ok(result.log.items.every(x=>x.got===2));
});
