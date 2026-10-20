/* Sign data must agree with generated routes and the 3D stop obligations. No WebGL. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const c={THREE:require('../lib/three.min.js')};c.window=c;vm.createContext(c);
for(const name of ['data/theme.js','data/config.js','data/town.js','data/m3_doorsteps.js','data/m8_stops.js','data/workday_events.js','src/core/theme.js','src/core/rig.js','src/core/scenery.js','src/core/townart.js','src/core/town.js','src/core/shift.js','src/core/scorelog.js','src/core/workday.js','src/core/firstperson.js','src/core/fpmission.js','src/core/fplater.js','src/core/fproute.js','src/core/fpsigns.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+name,'utf8'),c);
c.OTR.save={data:{townSeed:1}};
const O=c.OTR,make=(day=1,variant=7)=>O.fpMission.create('campaign',variant,O.fpSigns.prepare(O.fpRoute.plan(day,variant)));
test('signs are derived without changing the mission or its checkpoint',()=>{
 const m=make(),before=JSON.stringify(m.snapshot()),a=O.fpSigns.catalog(m),b=O.fpSigns.catalog(m);
 assert.equal(JSON.stringify(a),JSON.stringify(b));assert.equal(JSON.stringify(m.snapshot()),before);
 assert.equal(O.fpSigns.catalog(null),null);assert.equal(O.fpSigns.catalog(O.fpMission.create('campaign',1)),null);
});
test('both actual street names appear at every junction after the rotated projection',()=>{
 const m=make(),a=O.fpSigns.catalog(m);assert.equal(a.streets.length,40);
 for(let row=0;row<m.town.xs.length;row++)for(let col=0;col<m.town.zs.length;col++){
  const h=a.streets.find(s=>s.id===`street:${row}:${col}:x`),v=a.streets.find(s=>s.id===`street:${row}:${col}:z`);
  assert.equal(h.name,c.OTR_DATA.town.streetsH[row]);assert.equal(v.name,c.OTR_DATA.town.streetsV[col]);
  assert.equal(h.x,v.x);assert.equal(h.z,v.z);assert.equal(O.fpRoute.onStreet(m,h.x,h.z),false);
 }
});
test('all four approach signs sit on the right and before their existing stop line',()=>{
 const m=make(),a=O.fpSigns.catalog(m);assert.equal(a.stops.length,m.junctions.length*4);
 for(const s of a.stops){const j=m.junctions[s.junction],fx=Math.sin(s.yaw),fz=-Math.cos(s.yaw),rx=Math.cos(s.yaw),rz=Math.sin(s.yaw);
  assert.ok((s.x-j.x)*rx+(s.z-j.z)*rz>m.town.road/2);
  assert.ok((s.line.x-s.x)*fx+(s.line.z-s.z)*fz>0);
  assert.ok(Math.abs((s.line.x-j.x)*fx+(s.line.z-j.z)*fz+m.town.road/2+.25)<1e-9);
 }
});
test('all delivered addresses keep their generated number and actual facade position',()=>{
 for(let day=1;day<=30;day++)for(const variant of [1,7,13]){const m=make(day,variant),a=O.fpSigns.catalog(m),ids=[...a.stops,...a.streets,...a.numbers].map(s=>s.id);
  assert.equal(new Set(ids).size,ids.length);
  for(const stop of m.stops){const n=a.numbers.find(n=>n.lotId===stop.lotId);assert.ok(n);assert.equal(n.number+' '+n.street,stop.address);assert.equal(n.x,stop.x);assert.equal(n.z,stop.z);}
  assert.equal(a.limit,m.town.limit);assert.equal(a.schoolLimit,m.town.schoolLimit);
  assert.equal(a.school.from.x,m.town.school.x);assert.equal(a.school.to.x,m.town.school.x);
  assert.equal(a.school.from.z,m.town.school.z1);assert.equal(a.school.to.z,m.town.school.z0);
 }
});
test('later restrictions stay off day one and match their peripheral road segment',()=>{
 assert.ok(O.fpSigns.catalog(make(1)).regulatory.every(s=>!['oneway','noentry'].includes(s.kind)));
 const m=make(3),a=O.fpSigns.catalog(m),one=a.regulatory.find(s=>s.kind==='oneway'),no=a.regulatory.find(s=>s.kind==='noentry');
 assert.equal(one.from,no.from);assert.equal(one.to,no.to);assert.equal(one.roadZ,m.town.zs[0]);
 assert.equal(one.yaw,0);assert.ok(one.z<one.roadZ);assert.match(O.fpSigns.text(one),/^Traffic travels east on /);
 assert.ok(m.stops.every(s=>s.park.z!==one.roadZ));
});
test('Low shares one two-triangle surface and chooses at most five instances in any view',()=>{
 const T=c.THREE,m=make(3);O.gfx={high:()=>false};const entries=[],route=new T.Group(),art=O.fpSigns.build({},m,route,e=>entries.push(e));
 assert.ok(entries.length>120);assert.equal(art.limit,5);const cam=new T.PerspectiveCamera(68,16/9,.08,180),frustum=new T.Frustum();
 for(const stop of m.stops)for(let angle=-Math.PI;angle<Math.PI;angle+=.3){cam.position.set(stop.park.x,2,stop.park.z);cam.rotation.set(0,-angle,0);cam.updateMatrixWorld(true);frustum.setFromProjectionMatrix(new T.Matrix4().multiplyMatrices(cam.projectionMatrix,cam.matrixWorldInverse));art.choose(cam,frustum,true);
  assert.ok(entries.filter(e=>e.signChosen).length<=5);assert.ok(entries.every(e=>!e.signChosen||(cam.position.x-e.x)*e.normal.x+(cam.position.z-e.z)*e.normal.z>=.1));
 }
 const plane=new T.PlaneGeometry(1,1).rotateX(-Math.PI/2),paint=new T.MeshLambertMaterial(),mesh=new T.InstancedMesh(plane,paint,entries.length),shapes=O.fpSigns.decorate(mesh,entries);
 assert.equal(mesh.geometry.index.count/3,2);assert.equal(shapes.count,entries.length);assert.notEqual(mesh.geometry,plane);assert.notEqual(mesh.material,paint);
 mesh.geometry.dispose();mesh.material.dispose();mesh.dispose();plane.dispose();paint.dispose();
});
test('posts stay off every driving lane, including the cross streets at junctions',()=>{
 for(let day=1;day<=15;day++){const plan=O.fpSigns.prepare(O.fpLater.prepare(O.fpRoute.plan(day,7))),m=O.fpMission.create('campaign',7,plan),a=O.fpSigns.catalog(m);
  for(const [i,sign] of a.regulatory.entries())for(const other of a.regulatory.slice(i+1))assert.ok(Math.hypot(sign.x-other.x,sign.z-other.z)>1.2,'Separate sign posts '+sign.id+' / '+other.id);
  for(const sign of [...a.stops,...a.streets,...a.regulatory])assert.equal(O.fpRoute.onStreet(m,sign.x,sign.z),false,`${sign.id} at ${sign.x}, ${sign.z}`);
 }
});
const signed=()=>{const m=O.fpMission.create('campaign',7,O.fpSigns.prepare(O.fpRoute.plan(3,7)));m.mode='cab';m.paused=false;m.departed=true;m.phase='route';m.van.hand=false;m.van.belt=true;return m;};
test('new signed stops replace the legacy report and older checkpoints retain their type',()=>{
 for(const enabled of [false,true]){O.workday.begin();const m=enabled?signed():O.fpMission.create('campaign',7,O.fpRoute.plan(3,7));m.log('junction:0:n:0','driving','needs','Passed the junction stop line without stopping.');m.log('junction:0:n:0','driving','needs','Repeated.');
  assert.equal(O.workday.events.length,1);assert.equal(O.workday.events[0].type,enabled?'drive.sign-stop':'drive.stop-line');assert.equal(O.workday.events[0].key,enabled?'stop:0:0:n':'0:n:0');assert.ok(O.fpMission.restore(m.snapshot()));
 }
});
test('signed speed and school checks cannot also emit the old speed type; violations survive resume',()=>{
 O.workday.begin();let m=signed();Object.assign(m.van,{x:2.5,z:0,yaw:0,speed:12});O.fpRoute.tick(m,{x:2.5,z:.1,speed:12});assert.equal(O.workday.events.filter(e=>e.type==='drive.sign-speed').length,1);assert.ok(!O.workday.events.some(e=>e.type==='drive.speed'));
 m=O.fpMission.restore(m.snapshot());assert.ok(m);m.paused=false;O.fpRoute.tick(m,{x:2.5,z:.1,speed:12});assert.equal(O.workday.events.filter(e=>e.type==='drive.sign-speed').length,1);
 Object.assign(m.van,{x:m.town.school.x+2,z:(m.town.school.z0+m.town.school.z1)/2,speed:8});O.fpRoute.tick(m,{x:m.van.x,z:m.van.z+.1,speed:8});assert.equal(O.workday.events.filter(e=>e.type==='drive.sign-school').length,1);O.fpSigns.finish(m);assert.ok(O.workday.events.filter(e=>e.type.startsWith('drive.sign-')).every(e=>e.ok===false));
});
test('speed credit waits until the day ends, so an earlier safe leg cannot mask a later violation',()=>{
 O.workday.begin();const m=signed();Object.assign(m.van,{x:2.5,z:0,yaw:0,speed:5});O.fpRoute.tick(m,{x:2.5,z:.1,speed:5});assert.ok(!O.workday.events.some(e=>e.type==='drive.sign-speed'));
 m.leg++;m.van.speed=12;O.fpRoute.tick(m,{x:2.5,z:.1,speed:12});O.fpSigns.finish(m);const grade=O.workday.events.filter(e=>e.type==='drive.sign-speed');assert.equal(grade.length,1);assert.equal(grade[0].ok,false);
 O.workday.begin();const safe=signed();Object.assign(safe.van,{x:2.5,z:0,yaw:0,speed:5});O.fpRoute.tick(safe,{x:2.5,z:.1,speed:5});O.fpSigns.finish(safe);assert.equal(O.workday.events.find(e=>e.type==='drive.sign-speed').ok,true);
});
test('no-entry and mid-segment wrong-way mistakes each produce one distinct penalty',()=>{
 for(const entry of [true,false]){O.workday.begin();const m=signed(),d=O.fpSigns.runtime(m),g=d.oneway,extent=2.7;Object.assign(m.van,{x:entry?d.noentry.x+extent-.1:(g.from+g.to)/2,z:g.roadZ-2,yaw:-Math.PI/2,speed:2});
  O.fpSigns.tick(m,{x:entry?d.noentry.x+extent+.1:m.van.x+.2,z:m.van.z,speed:2});O.fpSigns.tick(m,{x:m.van.x+.2,z:m.van.z,speed:2});
  const penalties=O.workday.events.filter(e=>['drive.sign-oneway','drive.sign-noentry'].includes(e.type));assert.equal(penalties.length,1);assert.equal(penalties[0].type,entry?'drive.sign-noentry':'drive.sign-oneway');
 }
});
test('depot departure grades available traffic space once',()=>{
 for(const blocked of [false,true]){O.workday.begin();const m=signed();Object.assign(m.van,{x:2.84,z:4.9,yaw:0,speed:2});if(blocked)Object.assign(m.traffic[0],{x:2.5,z:8,speed:3});else m.traffic.forEach(car=>car.z=-100);
  O.fpSigns.tick(m,{x:2.84,z:5.1,speed:2});const event=O.workday.events.find(e=>e.type==='drive.sign-giveway');assert.ok(event);assert.equal(event.ok,!blocked);
 }
});
test('both lanes may travel east on the signed one-way segment without consuming a later lane check',()=>{
 O.workday.begin();const m=signed(),g=O.fpSigns.runtime(m).oneway;Object.assign(m.van,{x:(g.from+g.to)/2,z:g.roadZ-2,yaw:Math.PI/2,speed:2});O.fpRoute.tick(m,{x:m.van.x-.1,z:m.van.z,speed:2});assert.ok(!m.events['lane:0']);assert.ok(!O.workday.events.some(e=>e.type==='drive.wrong-side'));
 Object.assign(m.van,{x:m.town.xs[0]-2,z:(m.town.zs[1]+m.town.zs[2])/2,yaw:0,speed:2});O.fpRoute.tick(m,{x:m.van.x,z:m.van.z+.1,speed:2});assert.equal(O.workday.events.filter(e=>e.type==='drive.wrong-side').length,1);
 const old=O.fpMission.create('campaign',7,O.fpRoute.plan(3,7));assert.ok(O.fpSigns.catalog(old).regulatory.every(s=>!['oneway','noentry'].includes(s.kind)));
});
test('a seen road closure accepts a real detour and rejects contact with its barrier',()=>{
 for(const contact of [false,true]){O.workday.begin();const plan=O.fpSigns.prepare(O.fpLater.prepare(O.fpRoute.plan(3,7))),m=O.fpMission.create('campaign',7,plan);m.mode='cab';m.paused=false;m.departed=true;m.phase='route';m.van.hand=false;m.van.speed=2;const r=m.roadworks;
  Object.assign(m.van,{x:r.x,z:r.z+10});O.fpSigns.tick(m,{x:r.x,z:r.z+11,speed:2});
  if(contact){m.motion={contact:true};Object.assign(m.van,{x:r.x,z:r.z+3});O.fpSigns.tick(m,{x:r.x,z:r.z+3.1,speed:2});}
  else{Object.assign(m.van,{x:r.x+45,z:r.z-1});O.fpSigns.tick(m,{x:r.x+45,z:r.z+1,speed:2});}
  const grade=O.workday.events.find(e=>e.type==='drive.sign-roadworks');assert.ok(grade);assert.equal(grade.ok,!contact);
 }
});

test('the signed route marker is validated and restoring a signed day emits nothing',()=>{
 O.workday.begin();const m=signed(),snap=m.snapshot();const restored=O.fpMission.restore(snap);assert.ok(restored);assert.equal(O.workday.events.length,0);assert.equal(restored.routePlan.signs,1);
 snap.routePlan.signs=2;assert.equal(O.fpMission.restore(snap),null);
});

test('a physical closure collision replaces the generic contact report only on a new signed day',()=>{
 for(const enabled of [true,false]){O.workday.begin();let plan=O.fpLater.prepare(O.fpRoute.plan(3,7));if(enabled)plan=O.fpSigns.prepare(plan);const m=O.fpMission.create('campaign',7,plan),r=m.roadworks;m.mode='cab';m.phase='route';m.departed=m.secured=true;m.paused=false;m.traffic=[];Object.assign(m.van,{x:r.x+2,z:r.z+3.3,yaw:0,speed:2,hand:false,belt:true,gear:1});m.step({forward:true},.1);
  const contact=O.workday.events.filter(e=>['drive.contact','drive.sign-roadworks'].includes(e.type));assert.equal(contact.length,1);assert.equal(contact[0].type,enabled?'drive.sign-roadworks':'drive.contact');assert.equal(contact[0].ok,false);
 }
});

test('keyboard reading still reaches a visible physical sign when a long label cannot fit',()=>{
 let said='';const entry={mainVisible:true,label:{text:'Stop before the junction line.'}},scene={signUI:{pool:[],readIndex:-1},art:{signs:{entries:[entry]},labelPosition:()=>({x:640,y:300})},message:text=>said=text};O.fpSigns.read(scene);assert.equal(said,entry.label.text);entry.mainVisible=false;O.fpSigns.read(scene);assert.equal(said,'Look toward a road sign, then read it again.');
});

test('sign shader composition retains existing road-grain and material hooks',()=>{
 const T=c.THREE,previous=new T.MeshLambertMaterial(),geometry=new T.PlaneGeometry(),mesh=new T.InstancedMesh(geometry,previous,1);let called=0;previous.onBeforeCompile=function(shader){called++;shader.fragmentShader='road-grain\n'+shader.fragmentShader;assert.equal(this,mesh.material);};previous.customProgramCacheKey=()=> 'otr-town-grain-1';const a=O.fpSigns.decorate(mesh,[{sign:{kind:'stop'}}]);const shader={vertexShader:'#include <common>\n#include <begin_vertex>',fragmentShader:'#include <common>\n#include <color_fragment>'};mesh.material.onBeforeCompile(shader);assert.equal(called,1);assert.match(shader.fragmentShader,/road-grain/);assert.match(shader.fragmentShader,/signShape/);assert.equal(mesh.material.customProgramCacheKey(),'otr-town-grain-1|otr-sign-shapes-3');assert.equal(a.count,1);mesh.geometry.dispose();mesh.material.dispose();mesh.dispose();geometry.dispose();previous.dispose();
});

test('the depot give-way face points toward the loading-bay approach',()=>{
 const m=make(),s=O.fpSigns.catalog(m).regulatory.find(s=>s.kind==='giveway');const dot=(2.84-s.x)*-Math.sin(s.yaw)+(8-s.z)*Math.cos(s.yaw);assert.ok(dot>0,'The departing driver sees the front of the sign.');
});
