/* Compare the existing town rule methods with bounded observations from the physical 3D drill. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const c={Phaser:{Scene:class{},Math:{Distance:{Between:Math.hypot}}}};c.window=c;vm.createContext(c);
for(const f of ['data/theme.js','data/config.js','data/m1_driving.js','data/town.js','data/vehicle.js','data/workday_events.js','src/core/theme.js','src/core/scorelog.js','src/core/scoring.js','src/core/scenery.js','src/core/rig.js','src/core/townart.js','src/core/town.js','src/core/firstperson.js','src/core/fpmission.js','src/core/fproute.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),c);
const O=c.OTR;O.registerScene=()=>{};O.fx={shake(){},flash(){}};O.audio={play(){}};
O.vehicle={MPH:2.2369362921,mph:v=>Math.abs(v.u)*2.2369362921,stopped:v=>Math.abs(v.u)<.1,point(v,f,r){return {x:v.x+20*(Math.cos(v.heading)*f-Math.sin(v.heading)*r),y:v.y+20*(Math.sin(v.heading)*f+Math.cos(v.heading)*r)};},fwd:v=>({x:Math.cos(v.heading),y:Math.sin(v.heading)})};
for(const f of ['src/scenes/shift/TownDriveScene.js','src/scenes/m1/DrivingScene.js','src/core/fpdrivinglesson.js','src/core/fpdrivinglessonrules.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),c);
const D=O.fpDrivingLesson,R=O.fpDrivingLessonRules,C=c.OTR_DATA.driving,town=vm.runInContext('TownDriveScene.prototype',c),clean=x=>JSON.parse(JSON.stringify(x)),items=log=>clean(log.items.map(({at,...item})=>item));
function setup(){O.fpTraffic=undefined;const m=D.model({content:C}),run={model:m,log:new O.ScoreLog('drive')};R.attach(run);m.paused=false;m.van.belt=true;m.van.hand=false;m.van.x=m.town.road/4;m.van.z=-45;const map=m.drivingLesson.map,T=O.town.build(C.seed);
 const ref={T,P:20,elapsed:0,van:{x:0,y:0,heading:0,u:0,gear:1,g:{a:1.6,b:1.7,hw:1.09,nose:2.7}},log:new O.ScoreLog('drive'),violations:{},lastViolationAt:{},goalAt:0,reverseDist:0,signal:null,signalOnAt:0,buckled:true,lights:false,lightsWanted:false,weather:'clear',toast(){},setHint(){},findApproach:()=>null,surfaceAt(x,y){return R.road(m,(y-map.y)*map.scale,8-(x-map.x)*map.scale)?'road':'sidewalk';},violation:town.violation};
 const w=D.where(m,'rule');Object.assign(ref.van,{x:w.x,y:w.y,heading:m.van.yaw,u:m.van.speed});return {m,run,ref,map};
}
function advance(ctx,dt){const {m,run,ref,map}=ctx;m.elapsed+=dt;ref.elapsed=m.elapsed;Object.assign(ref.van,{x:map.x+(8-m.van.z)/map.scale,y:map.y+m.van.x/map.scale,heading:m.van.yaw,u:m.van.speed,gear:m.van.gear});ref.buckled=m.van.belt;ref.lights=!!m.van.headlights;ref.lightsWanted=m.routePlan.weather!=='clear'||m.routePlan.timeOfDay==='night';ref.weather=m.routePlan.weather;town.checkRules.call(ref,dt);R.advance(run,dt);}
function same(ctx){assert.deepEqual(items(ctx.run.log),items(ctx.ref.log));assert.deepEqual(clean(ctx.m.drivingLesson.violations),clean(ctx.ref.violations));}
test('speed tolerance and repeat timing match the original town rules at school and residential limits',()=>{
 for(const school of [false,true])for(const excess of [0,1.99,2,2.01,4.99,5,5.01]){const x=setup(),s=x.m.town.school;x.m.van.x=school?s.x+3.5:3.5;x.m.van.z=school?(s.z0+s.z1)/2:-45;const limit=O.fpRoute.limit(x.m);x.m.van.speed=(limit+excess)/2.2369362921;for(let i=0;i<14*60;i++)advance(x,1/60);same(x);}
});
test('headlight warning, one fine per dark stretch and belt stretches retain the original timers and weights',()=>{
 for(const kind of ['belt','lights']){const x=setup();x.m.van.speed=4;if(kind==='belt')x.m.van.belt=false;else x.m.routePlan.weather='rain';for(let i=0;i<18*60;i++){if(i===180&&kind==='lights')assert.ok(x.m.drivingLesson.rules.warning.endsWith('.'));if(i===600){x.m.van.belt=true;x.m.van.headlights=true;}if(i===720){if(kind==='belt')x.m.van.belt=false;else x.m.van.headlights=false;}advance(x,1/60);}same(x);assert.equal(x.m.drivingLesson.violations[kind],2);}
});
test('wrong-side dwell and actual four-wheel curb climbs match the original physical rules',()=>{
 for(const mode of ['wrongside','kerb']){const x=setup();x.m.van.speed=5;if(mode==='wrongside')x.m.van.x=-3.5;for(let i=0;i<10*60;i++){if(mode==='kerb')x.m.van.x=i<30?3.5:7.2;advance(x,1/60);if(mode==='kerb')assert.ok(Math.abs(x.m.van.speed-x.ref.van.u)<1e-9);}same(x);assert.ok(x.m.drivingLesson.violations[mode]);}
});
test('stop and light entry use the original boundary decisions and weights while reading the actual rendered control',()=>{
 for(const kind of ['stop','signal'])for(const stopped of [false,true])for(const aspect of ['red','amber','green'])for(const mph of [0,.5,.5001,1,1.0001,1.5,1.5001,5])for(const box of [false,true]){
  const x=setup(),a={index:0,dir:0,kind,stopped,judged:false},old={it:{stop:kind==='stop'},stopped,judged:false};x.ref.lightFor=()=>aspect;O.fpTraffic={layout:()=>[{offset:0}],signal:()=>aspect,aspect:v=>v};town.judgeEntry.call(x.ref,old,mph,box);R.entry(x.run,a,mph,box);assert.equal(a.judged,old.judged);same(x);
 }O.fpTraffic=undefined;
});
test('a full stop behind the drawn line is held for half a second before crossing, and revisits reset it',()=>{
 const x=setup(),m=x.m,j=m.junctions.find(j=>j.x===m.town.xs[0]&&j.z===m.town.zs[1]),half=m.town.road/2;m.van.x=j.x+3.5;m.van.z=j.z+half+2.7+.5;m.van.speed=0;
 for(let i=0;i<29;i++){m.elapsed+=1/60;R.advance(x.run,1/60);}assert.equal(m.drivingLesson.rules.approach.stopped,false);
 for(let i=0;i<2;i++){m.elapsed+=1/60;R.advance(x.run,1/60);}assert.equal(m.drivingLesson.rules.approach.stopped,true);
 m.van.z=j.z+half+2.7+.1;m.van.speed=1;R.advance(x.run,.01);assert.equal(x.run.log.items.length,0);
 m.van.z=j.z;R.advance(x.run,.01);m.van.z=j.z-half-12;R.advance(x.run,.01);assert.equal(m.drivingLesson.rules.approach.index,-1);
 m.van.z=j.z+half+2.7+.1;R.advance(x.run,.01);assert.equal(m.drivingLesson.violations.rolling,1,'returning without a fresh stop fails');
});
test('reverse camera replaces mandatory walkaround while unsafe reverse and contact retain their penalty weights',()=>{
 const x=setup(),m=x.m;m.van.gear=-1;m.van.speed=-1;for(let i=0;i<60;i++){m.elapsed+=.05;R.advance(x.run,.05);}assert.equal(x.run.log.items.length,0,'safe reverse never requires G');m.van.speed=-5.01/2.2369362921;R.advance(x.run,.05);assert.equal(x.run.log.items[0].got,-3);for(let i=0;i<60;i++){m.elapsed+=.05;R.advance(x.run,.05);}assert.equal(m.drivingLesson.violations.backing,1);m.van.gear=1;R.advance(x.run,.05);m.elapsed+=5;m.van.gear=-1;m.van.speed=0;m.motion={contact:true};R.advance(x.run,.05,-4.6);assert.equal(m.drivingLesson.violations.backing,2);assert.equal(m.drivingLesson.violations.crash,1);assert.equal(x.run.log.items.at(-1).got,-4);
 const count=x.run.log.items.length;m.paused=true;for(let i=0;i<120;i++)R.advance(x.run,.05,-10);assert.equal(x.run.log.items.length,count);assert.equal(R.attach(x.run),false);
});

test('physical signals require the current three-second contract, keeping the original one-point turn penalty',()=>{
 for(const side of [-1,1])for(const sig of [-1,0,1])for(const seconds of [0,.999,1,2.999,3,3.001]){
  const x=setup();x.m.van.yaw=side*Math.PI/2;const a={heading0:0,sig,sigFor:seconds};R.turn(x.run,a);
  const wrong=sig!==side||seconds<3;assert.equal(x.run.log.items.length,Number(wrong));if(wrong){assert.equal(x.run.log.items[0].got,-1);assert.equal(x.run.log.items[0].lesson,c.OTR_DATA.workdayEvents['drive.signal'].lesson);}
 }
});
