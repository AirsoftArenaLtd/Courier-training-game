/* Live driving observations, hazard outcomes and checkpoint continuity. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const c={};c.window=c;vm.createContext(c);
for(const file of ['data/workday_events.js','src/core/scorelog.js','src/core/workday.js','src/core/firstperson.js','src/core/fpmission.js','src/core/fpdriving.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+file,'utf8'),c);
const M=c.OTR.fpMission,D=c.OTR.fpDriving,W=c.OTR.workday;
const make=()=>{W.begin();const m=M.create('campaign',7);D.configure(m);m.mode='cab';m.phase='route';m.departed=true;for(const car of m.traffic){car.x=-100;car.z=30;}m.driving.bus.state=m.driving.siren.state='done';Object.assign(m.van,{x:4,z:-70,yaw:0,hand:false,belt:true});return m;};
const events=type=>W.events.filter(e=>e.type===type);
test('each curb departure needs a recent mirror check and restores without replay',()=>{
 const m=make();m.mirror();m.van.speed=2;D.tick(m,.1);D.tick(m,.1);assert.equal(events('drive.mirrors').length,1);assert.equal(events('drive.mirrors')[0].ok,true);
 m.van.speed=0;m.van.hand=true;D.tick(m,.1);m.elapsed=20;m.van.hand=false;m.van.speed=2;D.tick(m,.1);
 assert.equal(events('drive.mirrors').length,2);assert.equal(events('drive.mirrors')[1].ok,false);
 const r=M.restore(m.snapshot());assert.ok(r);assert.equal(r.solids.length,m.solids.length);W.begin();D.tick(r,.1);assert.equal(W.events.length,0);
});
test('following credit waits until the leg ends; a later close gap cannot be hidden',()=>{
 const m=make();m.van.x=1.7;m.van.speed=4;m.traffic=[{id:0,x:1.7,z:-95,yaw:0,speed:4,target:4}];
 D.tick(m,.5);assert.equal(events('drive.following').length,0);
 m.traffic[0].z=-80;D.tick(m,.25);D.tick(m,.25);D.endLeg(m);
 assert.equal(events('drive.following').length,1);assert.equal(events('drive.following')[0].ok,false);assert.equal(events('drive.following')[0].where.z,-70);
 const n=make();n.van.speed=4;n.traffic=[{id:0,x:4,z:-95,yaw:0,speed:4,target:4}];D.tick(n,1);D.endLeg(n);
 assert.equal(events('drive.following')[0].ok,true);
});
test('opposing traffic and interrupted close-gap samples do not earn or fail following checks',()=>{
 const m=make();m.van.speed=4;m.traffic=[{id:0,x:4,z:-80,yaw:Math.PI,speed:4,target:4}];D.tick(m,1);D.endLeg(m);assert.equal(events('drive.following').length,0);
 m.traffic[0].yaw=0;D.tick(m,.3);m.van.speed=0;D.tick(m,1);m.van.speed=4;D.tick(m,.3);assert.equal(events('drive.following').length,0);
});
const goal=m=>{m.mode='walk';m.van.hand=true;m.van.speed=0;Object.assign(m.player,{x:m.van.x,z:m.van.z+4,yaw:Math.PI});return D.checkGoal(m);};
const reverse=m=>{m.mode='cab';m.van.hand=false;m.van.gear=-1;m.van.speed=-.5;D.tick(m,.1);};
test('G.O.A.L. requires physically standing behind the parked van and looking back',()=>{
 const m=make();assert.match(D.checkGoal(m),/get out/);m.mode='walk';m.van.hand=true;m.player.x=4;m.player.z=-66;m.player.yaw=0;assert.match(D.checkGoal(m),/look along/);
 assert.match(goal(m),/is clear/);reverse(m);assert.equal(events('drive.backing')[0].ok,true);D.tick(m,.1);assert.equal(events('drive.backing').length,1);
 const r=M.restore(m.snapshot());assert.ok(r);W.begin();D.tick(r,.1);assert.equal(events('drive.backing').length,0);
});
test('stale, moved and blocked reversing checks cannot approve backing',()=>{
 for(const condition of ['absent','stale','moved','blocked','pedestrian','boundary']){
  const m=make();if(condition==='blocked')m.traffic=[{id:0,x:4,z:-63.5,yaw:0,speed:0,target:0}];
  if(condition==='pedestrian')Object.assign(m.crossing,{state:'crossing',x:4,z:-63.5});
  if(condition==='boundary')m.van.z=m.bounds.z1-5;
  if(condition!=='absent')goal(m);if(condition==='stale')m.elapsed=61;if(condition==='moved')m.van.z-=3;
  reverse(m);assert.equal(events('drive.backing')[0].ok,false,condition);
 }
});
test('each new reversing manoeuvre consumes a fresh check',()=>{
 const m=make();goal(m);reverse(m);m.van.gear=1;m.van.speed=0;D.tick(m,.1);reverse(m);
 assert.equal(events('drive.backing').length,2);assert.equal(events('drive.backing')[1].ok,false);
});
const bus=m=>Object.assign(m.driving.bus,{state:'flashing',x:1.7,z:-82,yaw:0,clock:0,hold:0,passed:false});
test('waiting behind the flashing bus earns credit only after its lights go off',()=>{
 const m=make();bus(m);Object.assign(m.van,{x:1.7,speed:0,hand:true});D.tick(m,2);assert.equal(events('drive.school-bus').length,0);
 D.tick(m,2.1);assert.equal(m.driving.bus.state,'leaving');assert.equal(events('drive.school-bus')[0].ok,true);assert.equal(events('drive.school-bus-pass').length,0);
 D.syncActors(m);assert.equal(m._driveSolids.bus.z,-82);assert.equal(D.blockTraffic(m,{x:1.7,z:-72,yaw:0}),true);
});
test('going around either side of the flashing bus reports a critical pass once',()=>{
 const m=make();bus(m);Object.assign(m.van,{x:-1.7,z:-77,speed:2});D.tick(m,.1);D.tick(m,.1);
 assert.equal(events('drive.school-bus-pass').length,1);assert.equal(events('drive.school-bus')[0].ok,false);
 const r=M.restore(m.snapshot());assert.ok(r);W.begin();D.tick(r,.1);assert.equal(W.events.length,0);
});
const siren=m=>Object.assign(m.driving.siren,{state:'approaching',x:1.3,z:-45,yaw:0,clock:0,yielded:false,road:0,offset:1.3});
test('right-side yielding is credited after the emergency vehicle has passed',()=>{
 const m=make();siren(m);Object.assign(m.van,{speed:0,hand:true});D.tick(m,.1);assert.equal(m.driving.siren.state,'passing');assert.equal(events('drive.siren').length,0);
 for(let i=0;i<70;i++)D.tick(m,.1);assert.equal(events('drive.siren').length,1);assert.equal(events('drive.siren')[0].ok,true);assert.equal(m.driving.siren.state,'done');
});
test('pulling out early or failing to yield cannot receive siren credit',()=>{
 for(const early of [true,false]){
  const m=make();siren(m);Object.assign(m.van,{speed:early?0:2,hand:early});D.tick(m,.1);
  m.van.speed=2;m.van.hand=false;for(let i=0;i<260;i++)D.tick(m,.1);
  assert.equal(events('drive.siren').length,1);assert.equal(events('drive.siren')[0].ok,false);
 }
});
test('a mid-siren checkpoint keeps physical actor bounds and waits for actual passage',()=>{
 const m=make();siren(m);m.van.speed=0;m.van.hand=true;D.tick(m,.1);const r=M.restore(m.snapshot());assert.ok(r);assert.equal(r._driveSolids.siren.z,r.driving.siren.z);
 W.begin();for(let i=0;i<70;i++)D.tick(r,.1);assert.equal(events('drive.siren').length,1);assert.equal(events('drive.siren')[0].ok,true);
 const bad=m.snapshot();bad.driving.goalAt=100;assert.equal(M.restore(bad),null);
});
test('a long day bounds the HUD history while retaining once-only evidence',()=>{
 const m=make();for(let i=0;i<350;i++)m.log('observation:'+i,'driving','good','Observed the route.');
 assert.equal(m.logs.length,300);assert.equal(Object.keys(m.events).length,350);assert.ok(M.restore(m.snapshot()));
});

test('a real motor collision with the bus cannot turn into waiting credit',()=>{
 const m=make();bus(m);D.syncActors(m);Object.assign(m.van,{x:1.7,speed:4,hand:false});m.paused=false;m.secured=true;
 for(let i=0;i<260;i++)m.step({forward:true,back:false,left:false,right:false},.025);
 assert.equal(c.OTR.fp.vanBox(m.van,m._driveSolids.bus),false);assert.equal(events('drive.school-bus').length,1);assert.equal(events('drive.school-bus')[0].ok,false);
 assert.ok(events('drive.contact').length);
});
test('live hazards appear naturally on a clear road and practice keeps the old state',()=>{
 const m=make();m.driving.bus.state='waiting';m.van.speed=2;D.tick(m,.1);assert.equal(m.driving.bus.state,'flashing');
 m.driving.siren.state='waiting';m.leg=1;D.tick(m,.1);assert.equal(m.driving.siren.state,'approaching');
 const practice=M.create('practice',1);D.configure(practice);assert.equal(practice.driving,undefined);assert.ok(M.restore(practice.snapshot()));
});

test('moving hazard vehicles wait for a person or van blocking their path',()=>{
 const m=make();bus(m);m.driving.bus.state='leaving';m.mode='walk';Object.assign(m.player,{x:1.7,z:-86.3});
 D.syncActors(m);D.tick(m,.1);assert.equal(m.driving.bus.z,-82);
 m.player.x=10;Object.assign(m.van,{x:1.7,z:-88.5,yaw:0,speed:0});D.tick(m,.1);assert.equal(m.driving.bus.z,-82);
 m.van.x=5;D.tick(m,.1);assert.ok(m.driving.bus.z<-82);
});

/* C-20: use open space to measure the motor, independently from the observation scenarios above. */
const F=c.OTR.fp;
function vehicle(day=1){
 const m=make();m.solids=[];m.traffic=[];m.crossing.state='resolved';m.secured=true;m.paused=false;
 m.bounds={x0:-1000,x1:1000,z0:-2000,z1:1000};m.briefing={day,weather:'clear',clockMin:500};return m;
}
function runMotor(m,input,seconds,fps=60){for(let i=0;i<Math.round(seconds*fps);i++)m.step(input,1/fps);return m;}
test('reverse creeps gently without throttle, while either brake takes priority and holds zero',()=>{
 const m=vehicle();m.van.gear=-1;runMotor(m,{},3);assert.ok(m.van.speed<-.3&&m.van.speed>-.36);assert.ok(m.van.z>-70);
 runMotor(m,{back:true,forward:true},2);assert.equal(m.van.speed,0);assert.equal(m.van.gear,-1);
 m.van.hand=true;runMotor(m,{},2);assert.equal(m.van.speed,0);
 m.van.hand=false;runMotor(m,{forward:true},4);assert.ok(m.van.speed>=-1.7&&m.van.speed< -1.6);
 runMotor(m,{},4);assert.ok(Math.abs(m.van.speed+.35)<.001);
});
test('rear-axle reverse steering swings the nose left and the rear bumper right for right lock',()=>{
 const m=vehicle();Object.assign(m.van,{gear:-1,speed:-1.2,steer:.4});
 const body=m.van.x,front=F.local(m.van,0,-2.7),rear=F.local(m.van,0,2.7),axle=F.local(m.van,0,1.7);
 m.step({right:true},.01);
 assert.ok(m.van.yaw<0);assert.ok(m.van.x<body);assert.ok(F.local(m.van,0,-2.7).x<front.x);assert.ok(F.local(m.van,0,2.7).x>rear.x);
 assert.ok(Math.abs(F.local(m.van,0,1.7).x-axle.x)<.0001,'rear axle has no sideways tyre slip');
 const stopped=vehicle();stopped.van.hand=true;const pose=[stopped.van.x,stopped.van.z,stopped.van.yaw];runMotor(stopped,{right:true},3);assert.deepEqual([stopped.van.x,stopped.van.z,stopped.van.yaw],pose);
});
test('assists fade by workday, preserve the gentle first-day speed ceiling, and accept a trainer override',()=>{
 assert.deepEqual([1,2,3,4,5,9].map(day=>F.driveAssist(vehicle(day))),[1,.75,.5,.25,0,0]);
 const a=vehicle(),b=vehicle(5);runMotor(a,{forward:true},30);runMotor(b,{forward:true},30);
 assert.equal(a.van.speed,8);assert.ok(b.van.speed>11);assert.ok(b.van.speed<=12);
 a.driveAssist=0;assert.equal(F.driveAssist(a),0);a.driveAssist=4;assert.equal(F.driveAssist(a),1);a.driveAssist=-1;assert.equal(F.driveAssist(a),0);
});
test('actual cargo mass slows acceleration and lengthens braking; delivered and depot parcels add no load',()=>{
 const empty=vehicle(),loaded=vehicle();for(const p of loaded.parcels){p.location='slot'+p.stop;p.weight=50;}
 runMotor(empty,{forward:true},2);runMotor(loaded,{forward:true},2);assert.ok(empty.van.speed>loaded.van.speed+.1);assert.equal(loaded.motion.payload,150);
 Object.assign(empty.van,{speed:6,z:-70});Object.assign(loaded.van,{speed:6,z:-70});
 runMotor(empty,{back:true},2);runMotor(loaded,{back:true},2);assert.ok(loaded.van.z<empty.van.z-.1);assert.equal(empty.van.speed,0);assert.equal(loaded.van.speed,0);
 loaded.parcels[0].location='delivered';loaded.parcels[1].location='depot';loaded.parcels[2].location='held';assert.equal(F.payload(loaded),0);
 assert.ok(Math.abs(F.payload({routePlan:{},parcels:[{location:'slot0',weight:100}]})-45.359237)<.000001,'full-route label pounds convert to kilograms');
});
test('speed and low grip reduce steering authority without changing steering direction',()=>{
 const low=vehicle(),fast=vehicle(),ice=vehicle();low.van.speed=2;fast.van.speed=ice.van.speed=8;ice.traction=.35;
 for(const m of [low,fast,ice])runMotor(m,{right:true},.6);
 assert.ok(low.van.steer>fast.van.steer);assert.ok(fast.van.steer>ice.van.steer);assert.ok(ice.van.steer>0);
 assert.ok(Math.abs(fast.motion.roll)<=.025);assert.ok(Math.abs(fast.motion.pitch)<=.035);
});
test('braking transfers weight to the front and dives the sprung body, then settles at rest',()=>{
 const m=vehicle();m.van.speed=5;runMotor(m,{back:true},.5);const d=m.motion;
 assert.ok(d.acceleration<0);assert.ok(d.frontLoad>d.rearLoad);assert.ok(d.pitch<-.01);assert.ok(Math.abs(d.frontLoad+d.rearLoad-d.mass*9.81)<.00001);
 runMotor(m,{back:true},2);assert.equal(m.van.speed,0);assert.ok(Math.abs(d.pitch)<.001);assert.ok(Math.abs(d.frontLoad-d.rearLoad)<.001);
});
test('restoring mid-reverse preserves the exact future mission and reports without new saved fields',()=>{
 const m=make();m.paused=false;m.secured=true;Object.assign(m.van,{gear:-1,speed:-.4,steer:.15});runMotor(m,{right:true},.4);
 const raw=m.snapshot(),events=JSON.stringify(W.events),r=M.restore(raw);assert.ok(r);assert.equal(JSON.stringify(W.events),events);
 assert.equal(raw.motion,undefined);assert.equal(raw._motorPose,undefined);assert.equal(r.motion,undefined);assert.deepEqual(Object.keys(raw.van).sort(),['x','z','yaw','speed','steer','gear','hand','belt','look'].sort());
 r.paused=false;for(const input of [{right:true},{},{back:true},{left:true,forward:true}])for(let i=0;i<30;i++){m.step(input,1/60);r.step(input,1/60);assert.equal(JSON.stringify(r.snapshot()),JSON.stringify(m.snapshot()));}
});
test('a forward and reversing S-curve stays consistent at 30, 60 and 120 FPS and caps a stalled frame',()=>{
 for(const gear of [1,-1]){
  const models=[30,60,120].map(fps=>{const m=vehicle(5);m.van.gear=gear;runMotor(m,{forward:true,right:true},2,fps);runMotor(m,{forward:true,left:true},2,fps);return m;});
  for(const m of models){assert.ok(Math.hypot(m.van.x-models[0].van.x,m.van.z-models[0].van.z)<.06);assert.ok(Math.abs(m.van.yaw-models[0].van.yaw)<.01);}
 }
 const m=vehicle(5);m.van.speed=12;const z=m.van.z,t=m.elapsed;m.step({forward:true},30);assert.ok(Math.abs(m.van.z-z)<=.601);assert.ok(m.elapsed-t<=.050001);
 const frozen=m.snapshot();m.step({forward:true,right:true},0);assert.equal(JSON.stringify(m.snapshot()),JSON.stringify(frozen));assert.ok(Number.isFinite(m.motion.pitch));
});
