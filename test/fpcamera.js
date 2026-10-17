const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const c={OTR_DATA:{config:{}},localStorage:{getItem:()=>null},console};c.window=c;vm.createContext(c);
for(const f of ['firstperson','fpmission','fpcamera','academy'])vm.runInContext(fs.readFileSync(__dirname+'/../src/core/'+f+'.js','utf8'),c);
const F=c.OTR.fp,C=c.OTR.fpCamera,M=c.OTR.fpMission;
const model=()=>{const m=M.create('campaign',7);m.mode='cab';m.paused=false;m.briefing={day:1,weather:'clear',clockMin:500};m.solids=[];m.bounds={x0:-2000,x1:2000,z0:-2000,z1:2000};Object.assign(m.van,{x:0,z:-40,yaw:0,speed:0,hand:false});return m;};
const update=(r,m,dt=1/60,reduced=false,high=false,precise=false)=>{m.elapsed+=dt;return C.update(r,m,reduced,high,precise);};
test('the first view matches the existing eye and is reused without touching saved mission state',()=>{
 const m=model(),r=C.create(),before=JSON.stringify(m.snapshot()),p=C.update(r,m,false,false,false);
 assert.equal(p.x,-.45);assert.equal(p.y,2.05);assert.equal(p.z,-41.85);assert.equal(p.fov,68);assert.equal(JSON.stringify(m.snapshot()),before);
 assert.equal(update(r,m),p);assert.equal(m.cameraMotion,p);assert.equal(m.snapshot().cameraMotion,undefined);
});
test('turns have bounded heading lag and forward/reverse look-ahead; player look is immediate',()=>{
 for(const sign of [1,-1]){
  const m=model(),r=C.create();m.van.speed=sign*4;C.update(r,m,false,false,false);m.van.steer=.25;
  for(let i=0;i<45;i++){m.van.yaw+=sign*.004;m.van.z-=sign*.05;update(r,m);}
  assert.ok(C.angle(m.van.yaw-r.heading)*sign>0);assert.ok(r.look*sign>0);assert.ok(Math.abs(r.look)<=.085);assert.ok(C.angle(r.pose.yaw-m.van.yaw)*sign>0);
  const before=r.pose.yaw;m.van.look=.7;update(r,m,0);assert.ok(Math.abs(r.pose.yaw-before-.7)<1e-9);
 }
 const m=model(),r=C.create();m.van.yaw=Math.PI-.005;C.update(r,m,false,false,false);m.van.yaw=-Math.PI+.005;update(r,m);assert.ok(Math.abs(C.angle(r.pose.yaw-Math.PI))<.02,'crossing pi takes the short arc');
});
test('zoom eases with speed and remains smaller on Low, while reduced motion restores the original view',()=>{
 const results=[];for(const high of [false,true]){const m=model(),r=C.create();m.driveAssist=0;m.player.pitch=.2;C.update(r,m,false,high,false);m.van.speed=12;
  for(let i=0;i<120;i++)update(r,m,1/60,false,high);results.push(r.pose.fov);assert.ok(r.pose.fov>68&&r.pose.fov<=(high?72:70));
  const p=update(r,m,1/60,true,high);assert.equal(p.fov,68);assert.equal(p.roll,0);assert.equal(p.pitch,-m.player.pitch);assert.equal(p.y,2.05);
 }assert.ok(results[1]>results[0]+1.9);
});
test('acceleration, cornering and braking move the head inside the cab and retain physical body pitch',()=>{
 const m=model(),r=C.create();m.driveAssist=0;m.motion={acceleration:-6,lateral:4,pitch:-.035,roll:.02};m.van.speed=4;C.update(r,m,false,false,false);
 for(let i=0;i<45;i++){m.van.z-=.06;update(r,m);}
 assert.ok(r.z<-.02&&r.z>=-.025);assert.ok(r.x<-.02&&r.x>=-.03);assert.equal(r.pose.bodyPitch,-.035);assert.equal(r.pose.bodyRoll,.02);assert.ok(r.pose.pitch<0);assert.ok(r.pose.roll>0);
 assert.ok(Math.abs(r.pose.x-r.pose.baseX)<.04);assert.ok(Math.abs(r.pose.z-r.pose.baseZ)<.03);assert.ok(Math.abs(r.pose.y-2.05)<.12);
 const before=JSON.stringify(m.snapshot());update(r,m,0);assert.equal(JSON.stringify(m.snapshot()),before);
});
test('a wheel crossing a curb gives a small decaying impulse, with no impulse from teleporting',()=>{
 const m=model(),r=C.create();m.town={xs:[0],zs:[-100,0],road:7};m.van.x=2.3;m.van.speed=4;C.update(r,m,false,false,false);
 m.van.x=2.5;m.van.z-=.05;let p=update(r,m);assert.ok(p.roadImpact>.7);p=update(r,m);assert.ok(p.heave>0&&p.heave<.03);
 for(let i=0;i<120;i++){m.van.z-=.05;update(r,m);}assert.ok(r.pose.roadImpact<.31);
 m.van.x=-2.5;m.van.z=-80;p=update(r,m);assert.equal(r.hit,0);assert.ok(Math.abs(p.heave)<.001);
});
test('walking head movement stops for precision work, cargo and reduced motion without moving the player',()=>{
 const m=model(),r=C.create();m.mode='walk';Object.assign(m.player,{x:0,z:-40,yaw:0,pitch:.1});C.update(r,m,false,false,false);let peak=0;
 for(let i=0;i<80;i++){m.player.z-=2.5/60;const z=m.player.z,p=update(r,m);assert.equal(m.player.z,z);peak=Math.max(peak,Math.abs(p.y-1.65));assert.ok(Math.abs(p.x-m.player.x)<.004);}
 assert.ok(peak>.001);let p=update(r,m,1/60,false,false,true);assert.equal(p.y,1.65);assert.equal(p.x,m.player.x);assert.equal(p.pitch,-.1);
 p=update(r,m,1/60,true);assert.equal(p.y,1.65);assert.equal(p.x,m.player.x);m.cargoOpen=true;Object.assign(m.player,{x:m.van.x,z:m.van.z+1});p=update(r,m);assert.equal(p.y,2.15);
});
test('stationary, paused and duplicate frame samples remain stable, and a camera reset cannot change the score',()=>{
 const m=model(),r=C.create();m.van.speed=4;m.van.steer=.2;C.update(r,m,false,false,false);m.van.yaw=.1;update(r,m);const pose=JSON.stringify(r.pose),snapshot=JSON.stringify(m.snapshot());
 C.update(r,m,false,false,false);assert.equal(JSON.stringify(r.pose),pose);assert.equal(JSON.stringify(m.snapshot()),snapshot);
 m.elapsed-=1;C.update(r,m,false,false,false);assert.equal(r.heading,m.van.yaw);assert.ok(Number.isFinite(r.pose.fov));
});
test('camera movement remains consistent at 30, 60 and 120 FPS',()=>{
 const samples=[];for(const fps of [30,60,120]){const m=model(),r=C.create();m.driveAssist=.5;C.update(r,m,false,false,false);
  for(let i=0;i<fps*3;i++){const t=(i+1)/fps;m.elapsed=t;m.van.speed=4;m.van.steer=.12;m.van.yaw=t*.14;m.van.x=t*.25;m.van.z=-40-t*4;C.update(r,m,false,false,false);}samples.push({...r.pose});
 }for(const p of samples){assert.ok(Math.abs(p.yaw-samples[1].yaw)<.003);assert.ok(Math.abs(p.fov-samples[1].fov)<.003);assert.ok(Math.abs(p.y-samples[1].y)<.003);}
});
test('the approved trainer API is cached at launch/resume and never called by the motor or camera',()=>{
 const academy=c.OTR.academy,original=academy.workdayRules;let calls=0;academy.workdayRules=function(day){calls++;return original.call(this,day);};
 try{
  for(const [day,level] of [[1,1],[2,.5],[3,.5],[4,0],[10,0]]){const m=model();m.briefing.day=day;const snapshot=JSON.stringify(m.snapshot());F.applyDriveRules(m);assert.equal(F.driveAssist(m),level);assert.equal(JSON.stringify(m.snapshot()),snapshot);}
  const m=model(),r=C.create();F.applyDriveRules(m);const start=calls;for(let i=0;i<300;i++){F.drive(m,{forward:true},1/60);update(r,m);}assert.equal(calls,start);
  const saved=JSON.parse(JSON.stringify(m.snapshot())),restored=M.restore(saved);assert.ok(restored);F.applyDriveRules(restored);assert.equal(restored.driveAssist,m.driveAssist);
  for(const assists of ['full','light','off']){academy.settings=academy.merge({workday:{assists}});F.applyDriveRules(restored);assert.equal(F.driveAssist(restored),{full:1,light:.5,off:0}[assists]);}
 }finally{academy.workdayRules=original;academy.settings=null;}
});
