/* Later-day difficulty, physical detours, practice windows and save compatibility without WebGL. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const c={THREE:require('../lib/three.min.js')};c.window=c;vm.createContext(c);
for(const f of ['data/theme.js','data/config.js','data/m3_doorsteps.js','data/m8_stops.js','data/town.js','data/workday_events.js','src/core/theme.js','src/core/rig.js','src/core/scenery.js','src/core/townart.js','src/core/town.js','src/core/shift.js','src/core/scorelog.js','src/core/workday.js','src/core/firstperson.js','src/core/fpmission.js','src/core/fproute.js','src/core/fplater.js','src/core/fpday.js','src/core/fpdoors.js','src/core/fpbranding.js','src/core/fpworld.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),c);
const O=c.OTR,M=O.fpMission,L=O.fpLater,W=O.workday,plain=o=>JSON.parse(JSON.stringify(o));O.save={data:{townSeed:1}};O.gfx={high:()=>false};
function make(day=2,seed=7){const m=M.create('campaign',seed,L.prepare(O.fpRoute.plan(day,seed)));O.fpDay.configure(m);O.fpDoors.configure(m);W.begin();return m;}
test('day one and existing later-day saves keep their exact generated plan and requirements',()=>{
 for(let day=1;day<=4;day++){
  const plan=O.fpRoute.plan(day,7),copy=plain(plan),m=M.create('campaign',7,plan);O.fpDay.configure(m);O.fpDoors.configure(m);
  if(day===1){assert.equal(L.prepare(plan),plan);assert.equal(L.enabled(m),false);assert.equal(m.roadworks,undefined);}
  assert.deepEqual(plain(plan),copy);assert.deepEqual(plain(M.restore(m.snapshot()).snapshot()),plain(m.snapshot()));
 }
});
test('later plans increase signed or ID stops, guarantee an absent customer and rotate weather deterministically',()=>{
 for(let day=2;day<=30;day++)for(let seed=1;seed<=10;seed++){
  const original=O.fpRoute.plan(day,seed),before=plain(original),p=L.prepare(original),m=make(day,seed);
  assert.deepEqual(plain(original),before);assert.deepEqual(plain(L.prepare(p)),plain(p));
  assert.equal(m._doorSpecs.filter(s=>s.signature).length,5);assert.ok(m._doorSpecs.some(s=>s.adult&&s.present));assert.ok(m._doorSpecs.some(s=>!s.present&&s.signature));
  assert.ok(original.route.filter(r=>r.stop.packages[0].service!=='standard').length<5);assert.equal(p.weather,L.weather(day));assert.equal(p.dispatch.kind,'signature');
  assert.equal(p.route.map(r=>r.stop.packages[0].tracking).join(),original.route.map(r=>r.stop.packages[0].tracking).join());
  assert.ok(p.route.every(r=>!r.stop.packages[0].note));
 }
 assert.ok(L.window(make(2),0).end>L.window(make(3),0).end);assert.ok(L.window(make(3),0).end>L.window(make(4),0).end);
});
test('road works block both approach lanes while all junctions, parking points and doors retain a detour',()=>{
 for(let seed=1;seed<=100;seed++){
  const m=make(2,seed),r=m.roadworks,t=m.town;assert.ok(r);assert.equal(m.solids.filter(s=>s===r).length,1);
  for(const x of [r.x-1.7,r.x+1.7])assert.ok(O.fp.vanBox({x,z:r.z,yaw:0},r));
  const xi=t.xs.indexOf(r.x),seen=new Set(['0,0']),todo=[[0,0]];
  while(todo.length){const [x,z]=todo.pop();for(const [nx,nz] of [[x+1,z],[x-1,z],[x,z+1],[x,z-1]]){
   if(nx<0||nx>=t.xs.length||nz<0||nz>=t.zs.length||nx===xi&&x===xi&&Math.min(z,nz)===r.from)continue;
   const key=nx+','+nz;if(!seen.has(key)){seen.add(key);todo.push([nx,nz]);}
  }}assert.equal(seen.size,t.xs.length*t.zs.length);
  for(const s of m.stops){assert.equal(m.driveAllowed(s.park),true,s.address);assert.equal(m.solids.some(b=>O.fp.vanBox(s.park,b)),false,s.address);assert.equal(m.blocked(s.x-s.side*.7,s.z),false,s.address);}
 }
});
test('physical driving into the barrier stops the van and reports the existing contact type',()=>{
 for(const side of [-1,1]){const m=make(),r=m.roadworks;m.traffic=[];m.mode='cab';m.departed=true;L.depart(m);m.phase='route';m.secured=true;m.paused=false;Object.assign(m.van,{x:r.x+side*1.7,z:r.z+side*6,yaw:side>0?0:Math.PI,speed:4,hand:false,belt:true});
  for(let i=0;i<60;i++)m.step({forward:true},.05);assert.ok(Math.abs(m.van.z-r.z)>3);assert.ok(W.events.some(e=>e.type==='drive.contact'));}
});
test('fog changes actual visibility, ice changes traction, and weather grades retain the existing per-leg type',()=>{
 for(const day of [2,3,4]){const m=make(day),world=new c.THREE.Scene();world.fog=new c.THREE.Fog(0,35,55);const camera=new c.THREE.PerspectiveCamera();world.add(camera);const art=O.fpWorld.build({view:{world,camera,mirror:{camera:new c.THREE.PerspectiveCamera(),on:false}}},m);
  if(day===2){assert.equal(world.fog.near,6);assert.equal(world.fog.far,28);}if(day===3)assert.equal(art.weatherDrops.count,12);if(day===4)assert.equal(m.traction,.35);
  const roadLabels=art.labels.filter(l=>l.text==='This street is closed.');assert.equal(roadLabels.length,1);world.updateMatrixWorld(true);for(const side of [-1,1]){camera.position.set(m.roadworks.x+side*1.7,1.78,m.roadworks.z+side*10);camera.lookAt(roadLabels[0].point);camera.updateMatrixWorld(true);assert.ok(art.labelPosition(roadLabels[0]),'one caption from either approach');}
  m.mode='cab';m.van.speed=10;for(let i=0;i<15;i++)O.fpDay.tick(m,.1);assert.equal(W.events.filter(e=>e.type==='drive.weather').length,1);assert.equal(W.events[0].ok,false);O.fpDay.endLeg(m);assert.equal(W.events.length,1);art.dispose();
 }
});
test('practice clock starts at departure, survives reload and never adds score events or forces unsafe delivery',()=>{
 const m=make();m.elapsed=1200;assert.match(L.status(m,0),/starts/);m.preparation();assert.equal(m.routeDay.later.departAt,1200);const count=W.events.length;
 m.elapsed+=600;assert.match(L.status(m,0),/passed/);assert.equal(W.events.length,count);
 const id=m._doorSpecs.findIndex(s=>!s.present&&!s.dog&&!s.wrong),s=m.stops[id],p=m.parcels[id];assert.ok(id>=0);m.mode='walk';Object.assign(m.van,s.park,{speed:0,hand:true});Object.assign(m.player,{x:s.x-s.side*1.5,z:s.z});Object.assign(p,{location:'held',loaded:true,scanned:true,stopScanned:true});m.heldId=p.id;m.contact(id);
 assert.match(m.deliver(id,'exception'),/Exception recorded/);assert.equal(p.returnRequired,true);assert.equal(m.routeDay.later.arrivals[id],1800);
 const raw=plain(m.snapshot()),events=plain(W.events),restored=M.restore(raw);assert.ok(restored);assert.deepEqual(plain(restored.snapshot()),raw);assert.deepEqual(plain(W.events),events);assert.match(L.status(restored,id),/10 minutes/);
 for(const change of [x=>x.routeDay.later.departAt=-1,x=>x.routeDay.later.arrivals[id]=x.elapsed+1,x=>x.routeDay.later.arrivals[id]=null,x=>x.routeDay.weather='clear',x=>x.routePlan.later=2,x=>delete x.routeDay,x=>delete x.doorsteps]){const bad=plain(raw);change(bad);assert.equal(M.restore(bad),null);}
});
test('the same brake input takes longer to slow the van on scheduled ice than in rain',()=>{
 const speed=day=>{const m=make(day);m.mode='cab';m.traffic=[];m.departed=true;L.depart(m);m.phase='route';m.secured=true;m.paused=false;Object.assign(m.van,{x:2.84,z:-30,yaw:0,speed:5,hand:false,belt:true});for(let i=0;i<10;i++)m.step({back:true},.05);return m.van.speed;};
 const rain=speed(3),ice=speed(4);assert.ok(rain>0);assert.ok(ice>rain+.5,{ice,rain});
});
