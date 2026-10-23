/* Compare real original scene methods with the new local grader and physical moment-of-truth rules. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const c={Phaser:{Scene:class{},Math:{Distance:{Between:(x,y,a,b)=>Math.hypot(x-a,y-b)}}}};c.window=c;vm.createContext(c);
for(const f of ['data/theme.js','data/config.js','data/m1_driving.js','data/town.js','src/core/theme.js','src/core/scoring.js','src/core/scorelog.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),c);
const O=c.OTR;O.registerScene=()=>{};O.audio={play(){},stopLoop(){}};O.fx={flash(){},shake(){}};O.vehicle={mph:v=>Math.abs(v.speed)*2.2369362921};O.townArt={busTop(){return 'bus';},ROAD:280};O.driveAids={parkingBrake(){}};
for(const f of ['src/scenes/shift/TownDriveScene.js','src/scenes/m1/DrivingScene.js','src/core/fpdrivinglesson.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),c);
for(const f of ['src/core/scenery.js','src/core/rig.js','src/core/townart.js','src/core/town.js','src/core/firstperson.js','src/core/fpmission.js','src/core/fproute.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),c);
const D=O.fpDrivingLesson,C=c.OTR_DATA.driving,old=vm.runInContext('DrivingScene.prototype',c),town=vm.runInContext('TownDriveScene.prototype',c),clean=x=>JSON.parse(JSON.stringify(x));
const items=l=>clean(l.items.map(({at,...it})=>it));
const fresh=()=>({model:{elapsed:30,van:{x:2,z:-20,speed:3},drivingLesson:D.create(C,7,{x:200,y:300,scale:.05})},log:new O.ScoreLog('drive')});
const reference=r=>{const w=D.where(r.model,'hazard');return {content:C,scenarioId:'m1-driving',van:{x:w.x,y:w.y,speed:r.model.van.speed},elapsed:r.model.elapsed,T:{seed:7},log:new O.ScoreLog('drive'),results:[],armedFor:{},violations:{},lastViolationAt:{},warn(){},toast(){},cameras:{main:{stopFollow(){}}}};};
test('all six hazard pass/fail and impact entries match the original scorer, including map positions',()=>{
 for(const def of C.hazards)for(const ok of [false,true])for(const impact of [0,3,4,5]){const r=fresh(),ref=reference(r),h={def};D.judge(r,def.id,ok,def.hit,impact);old[ok?'pass':'fail'].call(ref,h,def.hit,impact);assert.deepEqual(items(r.log),items(ref.log));assert.deepEqual(clean(r.model.drivingLesson.results),clean(ref.results));const n=r.log.items.length;assert.equal(D.judge(r,def.id,ok),false);assert.equal(r.log.items.length,n);}
});
test('violation repeat intervals, default weights and pedestrian critical flags match the original scene',()=>{
 for(const key of ['belt','hitped','speed','signal'])for(const points of [undefined,1,2,3,5]){const r=fresh(),ref=reference(r);for(const time of [30,31,34.999,35,40]){r.model.elapsed=ref.elapsed=time;D.violation(r,key,'Original violation','safety',points,'Original lesson.');town.violation.call(ref,key,'Original violation','safety',points,'Original lesson.');}assert.deepEqual(items(r.log),items(ref.log));assert.deepEqual(clean(r.model.drivingLesson.violations),clean(ref.violations));}
});
test('mixed full-drive results and all par-time boundaries match the original endDrill method',()=>{
 for(const elapsed of [0,360,360.001,504,504.001,684,684.001,900])for(const mask of [0,1,21,42,63]){
  const r=fresh();r.model.elapsed=elapsed;const ref=reference(r);
  for(let i=0;i<C.hazards.length;i++)if(mask&(1<<i)){const h=C.hazards[i],ok=i%2===0;D.judge(r,h.id,ok);ref.armedFor[h.id]=true;old[ok?'pass':'fail'].call(ref,{def:h});}
  if(mask&1){D.violation(r,'belt','Driving without your seatbelt','safety',3,'Belt lesson.');town.violation.call(ref,'belt','Driving without your seatbelt','safety',3,'Belt lesson.');}
  let expected;O.flow={complete(scene,id,result){assert.equal(id,'m1-driving');expected=result;}};old.endDrill.call(ref);const got=D.result(r);assert.deepEqual(items(got.log),items(expected.log));for(const key of ['score','ratios','lessons','summary'])assert.deepEqual(clean(got[key]),clean(expected[key]));const n=r.log.items.length;assert.equal(D.result(r),got);assert.equal(r.log.items.length,n);
 }
});
test('parking checks and checkpoint credit match the actual original parking method',()=>{
 for(const gap of [.5,1.2,1.4])for(const skew of [0,.14,.25])for(const withTraffic of [false,true]){
  const r=fresh(),ref=reference(r),side=withTraffic?1:-1,heading=Math.asin(skew)+(withTraffic?0:Math.PI),lot={number:214,street:'Maple Ave',row:0,side:1,park:{x:0,y:100}};
  const outer=O.townArt.ROAD/2-gap*20;Object.assign(ref,{activeStop:{index:1,lot},P:20,T:{hy:[0]},van:{x:0,y:100,heading,g:{hl:2.7,hw:1.08,centre:0},speed:0},stoppedAt:30,parkBay(){return {x0:-100,x1:100};},onPark(){this.log.check('efficiency',1,1,'Checkpoint 1 reached');}});
  O.vehicle.bodyCentre=()=>({x:0,y:100});O.vehicle.stopped=()=>true;O.vehicle.point=(v,f,right)=>({x:f*20,y:outer-(right<0?10:0)});town.tryPark.call(ref);
  D.checkpoint(r,{index:1,address:'214 Maple Ave'},gap,skew,withTraffic);assert.deepEqual(items(r.log),items(ref.log));assert.equal(D.checkpoint(r,{index:1,address:'214 Maple Ave'},gap,skew,withTraffic),false);
 }
});
function oldVerdict(kind,h,o,dt){
 let value=0;const ref={van:{x:0,y:0,g:{hl:o.vanLength/2,hw:1}},P:20,input3:{brake:o.brake,steer:o.steer,throttle:o.throttle},violations:{handheld:o.handheld?1:0},mph:()=>o.mph,rel:()=>({fd:(kind==='bus'?o.gap+6:o.fd)*20,lat:kind==='door'?o.gap*20+59:o.lat*20}),touching:()=>o.touching,warn(){},time:{delayedCall(){}},tweens:{add(){}},pass(h){h.judged=true;value=1;},fail(h,text,impact){h.judged=true;value=impact?-impact:-1;}};
 O.townArt.busTop=()=> 'bus';
 const sprite={x:0,y:0,setPosition(){},setTexture(){return this;},setAlpha(){return this;}};
 const hz={...h,def:C.hazards.find(x=>x.kind===kind),p:{x:o.distance*20,y:0},childOut:true,child:o.child?sprite:null,arrived:o.arrived,target:{x:1000,y:0},retreat:true,opened:o.opened,car:sprite,reach:20,closing:true,ped:sprite,to:{x:o.arrived?0:1000,y:0},phone:sprite,ending:true,armOut:o.armOut,bus:sprite,half:120,baseline:0,window:14};
 old['step_'+kind].call(ref,hz,dt);return {value,hz};
}
test('physical hazard decisions match original moment-of-truth methods across boundary cases',()=>{
 let comparisons=0;const base={fd:20,lat:0,vanLength:5.4,mph:12,child:true,arrived:false,touching:false,opened:true,gap:2,distance:8,brake:false,steer:0,throttle:false,handheld:false,armOut:true};
 const cases={phone:[{handheld:true},{},{t:14.01}],ball:[{touching:true},{fd:1.99,mph:3.99},{fd:1.99,mph:4},{fd:-5.41,mph:8.99},{fd:-5.41,mph:9},{arrived:true,mph:2.99,wait:.69},{arrived:true,mph:3,wait:.69},{child:false}],door:[{fd:1,gap:-.01,mph:3.01},{fd:1,gap:1,mph:8},{fd:1,gap:1.01,mph:8},{fd:1,gap:0,mph:7.99},{mph:2.99,wait:1.39},{mph:3,wait:1.39}],water:[{distance:6.49,mph:13.99},{distance:6.49,mph:14},{inside:true,t:3.41,bad:1.099},{inside:true,t:3.41,bad:1.1},{inside:true,brake:true,mph:9,bad:1.05,t:3.41},{inside:true,steer:1,t:3.41},{inside:true,throttle:true,t:3.41}],crosswalk:[{arrived:true},{touching:true},{fd:2.99,lat:4.99,mph:5.01},{fd:2.99,lat:4.99,mph:5},{fd:-6.41},{fd:3}],bus:[{gap:2,mph:1.99,hold:2.19},{gap:2,mph:2,hold:2.19},{gap:.99,mph:0},{gap:1,mph:1},{gap:2,mph:0,hold:1}]};
 for(const [kind,variants] of Object.entries(cases))for(const variant of variants)for(const dt of [1/120,1/60,.05]){
  const o={...base,...variant};if(kind==='bus')o.fd=o.gap+6;
  const h={kind,t:variant.t??2,wait:variant.wait||0,hold:variant.hold||0,inside:!!variant.inside,bad:variant.bad||0,tIn:0},expected=oldVerdict(kind,h,o,dt),got=D.verdict(h,o,dt);assert.equal(got,expected.value,JSON.stringify({kind,variant,dt,got,expected:expected.value}));comparisons++;
 }assert.equal(comparisons,105);
});

test('the controllable module projects the actual six-checkpoint route without changing the five-stop workday schema',()=>{
 const before=JSON.stringify(C),m=D.model({content:C}),T=O.town.build(C.seed),expected=old.pickRoute.call({content:C},T);assert.equal(m.stops.length,6);assert.deepEqual(clean(m.stops.map(s=>s.lotId)),clean(expected.map(s=>s.lotId)));assert.equal(new Set(m.stops.map(s=>s.address)).size,6);assert.equal(m.routePlan.route.length,5);assert.equal(m.parcels.length,0);
 for(const s of m.stops){assert.equal(m.driveAllowed(s.park),true,s.address);const p=m.drivingLesson.map;assert.ok(Math.abs(p.x+(8-s.park.z)/p.scale-T.lotById(s.lotId).park.x)<1e-9);assert.ok(Math.abs(p.y+s.park.x/p.scale-T.lotById(s.lotId).park.y)<1e-9);}
 m.moduleReport=()=>false;m.paused=false;m.van.hand=false;m.van.belt=true;const z=m.van.z;for(let i=0;i<120;i++)m.step({forward:true},1/60);assert.ok(m.van.z<z,'the real motor responds to driver input');assert.equal(JSON.stringify(C),before);assert.equal(m.snapshot().drivingLesson,undefined);
 const second=D.model({content:C});assert.notEqual(m.drivingLesson,second.drivingLesson);assert.equal(second.drivingLesson.checkpoint,0);
});

test('checkpoint credit requires the real stopped van wholly inside each original physical bay',()=>{
 const m=D.model({content:C}),r={model:m,log:new O.ScoreLog('drive')};m.van.hand=true;m.van.speed=0;
 for(const stop of m.stops){Object.assign(m.van,stop.park);const verdict=D.parking(m,stop);assert.equal(verdict.ok,true,stop.address+': '+verdict.reason);assert.equal(D.tryCheckpoint(r),true);assert.equal(stop.resolved,true);assert.equal(m.drivingLesson.checkpoint,stop.index);assert.equal(D.tryCheckpoint(r),false,'a repeated key away from the next bay cannot earn credit');}
 assert.equal(r.log.items.filter(x=>x.cat==='efficiency').length,6);assert.equal(r.log.items.filter(x=>x.cat==='safety').length,6);
});
test('rolling, unsecured, skewed, distant, curb-straddling and out-of-bay parking earns no checkpoint credit',()=>{
 for(const mutate of [m=>m.van.speed=.2,m=>m.van.hand=false,m=>m.van.yaw=.5,m=>m.van.z+=20,m=>m.van.x+=2,m=>m.van.x-=3,m=>m.van.z=m.stops[0].bay.z0]){
  const m=D.model({content:C}),r={model:m,log:new O.ScoreLog('drive')};Object.assign(m.van,m.stops[0].park,{speed:0,hand:true});mutate(m);assert.equal(D.tryCheckpoint(r),false);assert.equal(m.drivingLesson.checkpoint,0);assert.equal(r.log.items.length,0);assert.ok(m.drivingLesson.parking.reason.endsWith('.'));
 }
});
