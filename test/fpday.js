/* Day-specific physics, dispatch actions and compatibility without a browser. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const c={THREE:require('../lib/three.min.js')};c.window=c;vm.createContext(c);
for(const f of ['data/theme.js','data/config.js','data/m3_doorsteps.js','data/m8_stops.js','data/town.js','data/workday_events.js','src/core/theme.js','src/core/rig.js','src/core/scenery.js','src/core/townart.js','src/core/town.js','src/core/shift.js','src/core/scorelog.js','src/core/workday.js','src/core/firstperson.js','src/core/fpmission.js','src/core/fproute.js','src/core/fpday.js','src/core/world3d.js','src/core/fpbranding.js','src/core/fpworld.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),c);
c.OTR.save={data:{townSeed:1}};const M=c.OTR.fpMission,D=c.OTR.fpDay,W=c.OTR.workday;
const make=(day=2)=>{W.begin();const m=M.create('campaign',7,c.OTR.fpRoute.plan(day,7));D.configure(m);m.mode='cab';m.phase='route';m.departed=true;for(const car of m.traffic){car.x=-100;car.z=0;}return m;};
const events=t=>W.events.filter(e=>e.type===t);
test('the generated forecast sets real braking grip and survives checkpoints',()=>{
 for(const [day,w] of [[2,'rain'],[3,'heat'],[4,'snow'],[6,'storm']]){
  const m=make(day);assert.equal(m.routeDay.weather,w);const r=M.restore(m.snapshot());assert.ok(r);assert.equal(r.traction,D.conditions[w].grip);
 }
 const stopDistance=day=>{const m=make(day);Object.assign(m.van,{x:2,z:-40,yaw:0,speed:5,hand:false});m.paused=false;m.crossing.state='resolved';const z=m.van.z;for(let i=0;i<400&&m.van.speed>.01;i++)m.step({back:true},.025);return z-m.van.z;};
 assert.ok(stopDistance(4)>stopDistance(1)*1.8);assert.ok(stopDistance(2)>stopDistance(1)*1.3);
});
test('weather credit waits for the end of a driven leg; excess speed cannot be hidden',()=>{
 const m=make();m.van.speed=5;for(let i=0;i<40;i++)D.tick(m,.1);assert.equal(events('drive.weather').length,0);D.endLeg(m);assert.equal(events('drive.weather')[0].ok,true);
 const n=make();n.van.speed=9;for(let i=0;i<15;i++)D.tick(n,.1);D.endLeg(n);assert.equal(events('drive.weather').length,1);assert.equal(events('drive.weather')[0].ok,false);assert.equal(events('drive.weather')[0].where.x,Math.round(n.van.x*10)/10);
});
test('wet-weather following requires more than the normal three-second gap',()=>{
 const m=make();Object.assign(m.van,{x:2,z:-70,yaw:0,speed:4});Object.assign(m.traffic[0],{x:2,z:-88,yaw:0});
 for(let i=0;i<7;i++)D.tick(m,.1);assert.equal(events('drive.weather')[0].ok,false);
});
test('heat needs safely parked breaks and a break cannot erase a failed leg',()=>{
 const m=make(3);m.routeDay.heat=.98;Object.assign(m.van,{speed:3,hand:false});assert.match(D.rest(m),/Park safely/);
 for(let i=0;i<50;i++)D.tick(m,.1);assert.equal(events('drive.weather')[0].ok,false);
 m.van.speed=0;m.van.hand=true;const before=m.elapsed;assert.match(D.rest(m),/water and shade/);assert.ok(m.routeDay.heat<.5);assert.equal(m.elapsed,before+30);D.endLeg(m);assert.equal(events('drive.weather').length,1);
});
const send=m=>{const d=m.routeDay.dispatch;m.activeStop=d.stop;m.routeDay.distance=11;m.van.speed=3;D.tick(m,.1);return d;};
test('dispatch arrives during the drive to its actual stop and reading waits for safe parking',()=>{
 const m=make();m.routeDay.distance=11;m.activeStop=(m.routeDay.dispatch.stop+1)%5;m.van.speed=3;D.tick(m,.1);assert.equal(m.routeDay.dispatch.sent,false);
 const d=send(m);assert.equal(d.sent,true);assert.match(D.read(m),/Stop and set/);assert.equal(d.read,false);assert.equal(events('dispatch.update').length,0);
 m.van.speed=0;m.van.hand=true;D.read(m);assert.equal(d.read,true);assert.equal(events('dispatch.update').length,0);
 const r=M.restore(m.snapshot());assert.ok(r);assert.equal(r.routeDay.dispatch.read,true);if(d.kind==='signature')assert.equal(r.stops[d.stop].service,'signature');
});
const deliver=(m,choice)=>{const d=send(m),s=m.stops[d.stop],p=m.parcels[d.stop];Object.assign(m.van,s.park,{speed:0,hand:true});m.mode='walk';Object.assign(m.player,{x:s.x-s.side,z:s.z});Object.assign(p,{location:'held',loaded:true,scanned:true,stopScanned:true});m.heldId=p.id;s.contacted=true;return m.deliver(s.id,choice);};
test('signature updates change the actual shipment requirement and score the response once',()=>{
 let m;for(let variant=1;variant<30;variant++){const p=c.OTR.fpRoute.plan(2,variant);if(p.dispatch.kind==='signature'){m=M.create('campaign',variant,p);break;}}assert.ok(m);W.begin();D.configure(m);m.phase='route';m.departed=true;m.mode='cab';send(m);m.van.speed=0;m.van.hand=true;D.read(m);
 assert.match(deliver(m,'exception'),/Exception recorded/);assert.equal(events('dispatch.update')[0].ok,true);assert.equal(m.parcels[m.routeDay.dispatch.stop].returnRequired,true);
 const r=M.restore(m.snapshot());assert.ok(r);W.begin();D.outcome(r,r.stops[r.routeDay.dispatch.stop],'exception');assert.equal(W.events.length,0);
});
test('an unread update or the old porch-box choice is a missed instruction',()=>{
 const m=make();deliver(m,m.routeDay.dispatch.kind==='signature'?'safeplace':'safeplace');assert.equal(events('dispatch.update')[0].ok,false);
});
test('a planter update is fulfilled only by placing behind the planter',()=>{
 let m;for(let variant=1;variant<30;variant++){const p=c.OTR.fpRoute.plan(2,variant);if(p.dispatch.kind==='planter'){m=M.create('campaign',variant,p);break;}}assert.ok(m);W.begin();D.configure(m);m.phase='route';m.departed=true;m.mode='cab';send(m);m.van.speed=0;m.van.hand=true;D.read(m);deliver(m,'planter');assert.equal(events('dispatch.update')[0].ok,true);const p=m.parcels[m.routeDay.dispatch.stop];assert.equal(m.point(p.id).z,m.stops[p.stop].z+2.35);assert.ok(M.restore(m.snapshot()));
});
test('malformed day state is rejected and older full-route saves remain intact',()=>{
 const m=make(),raw=m.snapshot();raw.routeDay.dispatch.stop=99;assert.equal(M.restore(raw),null);const bad=m.snapshot();bad.routeDay.weather='clear';assert.equal(M.restore(bad),null);
 const old=M.create('campaign',7,c.OTR.fpRoute.plan(2,7));assert.ok(M.restore(old.snapshot()));assert.equal(M.restore(old.snapshot()).routeDay,undefined);
});
test('weather with a live mirror stays inside the low resource budget across the town',()=>{
 const T=c.THREE;c.OTR.gfx={high:()=>false};
 for(const day of [2,3,4,6]){
  const m=make(day);m.mode='cab';m.paused=false;const camera=new T.PerspectiveCamera(68,16/9,.08,180),world=new T.Scene();world.background=new T.Color();world.fog=new T.Fog(0,65,165);world.add(camera);
  const scene={view:{world,camera,mirror:{camera:new T.PerspectiveCamera(55,16/9,.08,100),on:false}}},art=c.OTR.fpWorld.build(scene,m);
  const count=cam=>{cam.updateMatrixWorld(true);const f=new T.Frustum().setFromProjectionMatrix(new T.Matrix4().multiplyMatrices(cam.projectionMatrix,cam.matrixWorldInverse));let calls=0,triangles=0;world.traverseVisible(o=>{if(!o.isMesh||(o.frustumCulled&&!f.intersectsObject(o)))return;calls++;triangles+=(o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count)/3*(o.isInstancedMesh?o.count:1);});return {calls,triangles};};
  for(const pos of [...m.stops.map(s=>s.park),{x:2,z:m.town.zs[1]+25,yaw:0}]){
   Object.assign(m.van,pos);m.mirror();art.sync(m,null,'route');const main=count(camera);scene.view.mirror.before();const mirror=count(scene.view.mirror.camera);scene.view.mirror.after();assert.ok(main.calls+mirror.calls+2<=64);assert.ok(main.triangles+mirror.triangles+4<=2500);
  }art.dispose();assert.equal(world.children.length,1);
 }
});
