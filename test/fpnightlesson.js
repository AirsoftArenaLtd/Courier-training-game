/* Night catalogue, real controllers, pretrip timing, whole-bay gates and isolated results. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const c={Phaser:{Scene:class{}}};c.window=c;vm.createContext(c);
for(const f of ['data/theme.js','data/config.js','data/town.js','data/workday_events.js','src/core/theme.js','src/core/scorelog.js','src/core/scoring.js','src/core/scenery.js','src/core/rig.js','src/core/townart.js','src/core/town.js','src/core/firstperson.js','src/core/fpmission.js','src/core/fproute.js','src/core/fptraffic.js','src/core/fpdriving.js','src/core/fpmirrors.js','src/core/fprear.js','src/core/fpsignal.js','src/core/fpnav.js','src/core/fpsigns.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),c);
const O=c.OTR;O.registerScene=()=>{};O.workday={report(){throw Error('A night module wrote a workday report.');}};
for(const f of ['src/scenes/shift/TownDriveScene.js','src/scenes/m1/DrivingScene.js','src/core/fpdrivinglesson.js','src/core/fpschoollesson.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),c);

for(const f of ['src/core/fplighting.js','src/core/fpnight.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),c);
vm.runInContext(fs.readFileSync(__dirname+'/../src/core/fpnightlesson.js','utf8'),c);
const N=O.fpNightLesson;
function setup(){const r={phase:'active',model:N.model(),log:new O.ScoreLog()};N.attach(r);return r;}
function inspect(r,decision='repair'){const m=r.model;Object.assign(m.player,m.point('lights'));m.mode='walk';m.inspectVan('lights',decision);}
function drive(r,lights=true){const m=r.model;m.paused=false;m.mode='cab';Object.assign(m.van,{headlights:lights,hand:false,belt:true,gear:1});for(let i=0;i<300;i++)m.step({forward:m.van.speed<3},.05);return m;}
function park(m){Object.assign(m.van,m.stops[0].park,{speed:0,hand:true});}
test('the night run uses a real town, faulty lights, lead traffic and beyond-depot painted bay without a saved lesson field',()=>{
 const r=setup(),m=r.model;assert.equal(O.fpNight.required(m),true);assert.equal(m.fault,'lights');assert.equal(m.repaired,false);assert.equal(m.mode,'walk');assert.equal(m.trainingArea,null);assert.ok(m.near('lights'),'the trainee starts near the front inspection point');assert.equal(m.stops.length,1);assert.equal(m.parcels.length,0);assert.ok(m.stops[0].park.z<m.van.z-30);assert.equal(m.traffic[0].x,m.van.x);assert.equal(m.traffic[0].z,m.van.z-24);assert.equal(m.snapshot().nightLesson,undefined);assert.equal(N.attach(r),false);
});
test('actual inspection, motor, night and following controllers earn each catalogue check once',()=>{
 const r=setup();inspect(r);const m=drive(r);assert.ok(m.nightLesson.travel>30);assert.equal(m.nightLesson.started,true);assert.equal(m.nightLesson.followingSeen,true);assert.equal(m.nightDrive.required,true);assert.equal(m.checks.lights,true);assert.equal(N.ready(m),false);park(m);assert.equal(N.ready(m),true);
 const result=N.result(r);assert.equal(result.stats.completed,true);assert.equal(result.ratios.safety,1);assert.equal(result.ratios.efficiency,1);assert.equal(result.log.items.length,4);for(const [i,type] of [...N.types].entries()){const item=result.log.items[i],def=c.OTR_DATA.workdayEvents[type];assert.equal(item.got,def.max);assert.equal(item.max,def.max);assert.equal(item.label,def.label);assert.equal(item.lesson,def.lesson);}assert.equal(N.result(r),result);assert.equal(N.report(r,'drive.route',{key:'late',ok:false}),false);
});
test('driving with lights off and inspecting after departure retain their failures after correction',()=>{
 const r=setup(),m=drive(r,false);assert.equal(m.nightLesson.observations['inspect.lights'].ok,false);assert.equal(m.nightLesson.observations['drive.lights'].ok,false);inspect(r);m.van.headlights=true;park(m);const result=N.result(r);assert.equal(result.stats.completed,true);assert.equal(result.log.items[0].got,0);assert.equal(result.log.items[1].got,0);assert.equal(result.log.items[0].label,c.OTR_DATA.workdayEvents['inspect.lights'].fail);assert.equal(result.log.items[1].label,c.OTR_DATA.workdayEvents['drive.lights'].fail);
});
test('a wrong turn survives later route credit, while timeout retains observations and earns zero',()=>{
 const r=setup();inspect(r);const m=drive(r);N.report(r,'drive.route',{key:'wrong',ok:false,where:{x:2,z:3}});N.report(r,'drive.route',{key:'later',ok:true});park(m);const result=N.result(r);assert.equal(result.ratios.efficiency,0);assert.equal(result.log.items.at(-1).max,1);assert.equal(result.log.items.at(-1).got,0);
 const t=setup();inspect(t);drive(t);const timed=N.result(t,'timeout');assert.equal(timed.stats.completed,false);assert.equal(timed.score,0);assert.equal(timed.ratios.safety,0);assert.equal(timed.ratios.efficiency,0);assert.equal(timed.log.items[0].got,2);
});
test('a clean but unfinished drive, no live traffic encounter, paint overhang or reversed van cannot finish',()=>{
 const unfinished=setup();park(unfinished.model);assert.equal(N.ready(unfinished.model),false);const r=setup(),m=r.model;inspect(r);drive(r);park(m);assert.equal(N.ready(m),true);m.van.x+=.5;assert.equal(N.ready(m),false);park(m);m.van.yaw+=Math.PI;assert.equal(N.ready(m),false);park(m);m.nightLesson.followingSeen=false;assert.equal(N.ready(m),false);
});
test('the local event set is bounded, ignores unrelated checks and cannot finish after overflow',()=>{
 const r=setup();assert.equal(N.report(r,'drive.contact',{key:'ignored'}),false);for(let i=0;i<128;i++)assert.equal(N.report(r,'drive.route',{key:i}),true);assert.equal(N.report(r,'drive.route',{key:0,ok:false}),false);assert.equal(r.model.nightLesson.seen.size,128);assert.equal(N.report(r,'drive.route',{key:128}),false);assert.equal(r.overflow,true);assert.equal(N.result(r).score,0);
});

test('the lead vehicle waits through a real pretrip interval and starts only after the van moves',()=>{
 const r=setup(),m=r.model,lead=m.nightLesson.lead,x=lead.x,z=lead.z;m.paused=false;for(let i=0;i<800;i++)m.step({},.05);assert.equal(lead.x,x);assert.equal(lead.z,z);assert.equal(m.nightLesson.started,false);inspect(r);drive(r);assert.equal(m.nightLesson.started,true);assert.equal(m.nightLesson.followingSeen,true);assert.ok(lead.z<z,'the lead vehicle moves under the live traffic controller');
});

test('the optional module uses its own brief and permits real cab entry after inspection without a workday dispatch visit',()=>{
 const r=setup(),m=r.model;assert.equal(m.briefing,null);inspect(r);Object.assign(m.player,m.point('driver'));assert.equal(m.enter(),'');assert.equal(m.mode,'cab');assert.equal(m.checks.lights,true);
});

test('the stationary night spawn stays wholly inside its lane and within reach of the inspection point',()=>{
 const r=setup(),m=r.model,x=m.van.x,z=m.van.z,center=O.fpDriving.roadCenter(m,m.van);assert.ok(Math.abs(x-center)+1.08<m.town.road/2,'the whole van must start inside the road');m.paused=false;for(let i=0;i<20;i++)m.step({},.05);assert.equal(m.van.x,x);assert.equal(m.van.z,z);assert.ok(m.near('lights'),'idling must preserve the front inspection position');
});
