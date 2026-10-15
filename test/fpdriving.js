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
 for(const condition of ['absent','stale','moved','blocked']){
  const m=make();if(condition==='blocked')m.traffic=[{id:0,x:4,z:-63.5,yaw:0,speed:0,target:0}];
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
