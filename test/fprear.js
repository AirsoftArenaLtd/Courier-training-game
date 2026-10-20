/* Rear-camera contract, real obstacle sensing, practice isolation and bounded rendering. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),THREE=require('../lib/three.min.js');
let clock=0;const c={THREE,performance:{now:()=>clock}};c.window=c;vm.createContext(c);
for(const f of ['data/theme.js','data/config.js','data/workday_events.js','src/core/theme.js','src/core/scorelog.js','src/core/workday.js','src/core/firstperson.js','src/core/fpmission.js','src/core/fpcamera.js','src/core/fpcab.js','src/core/fpmirrors.js','src/core/fprear.js','src/core/fpdriving.js','src/core/world3d.js','src/core/fpbranding.js','src/core/fpworld.js','src/core/fpaccess.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),c);
const O=c.OTR,P=O.fpRear,M=O.fpMission,D=O.fpDriving,W=O.workday,raw=[];const report=W.report.bind(W);W.report=(type,detail)=>{raw.push({type,...detail});return report(type,detail);};
test.beforeEach(()=>{raw.length=0;W.begin();});
const make=()=>{const m=M.create('campaign',7);D.configure(m);m.mode='cab';m.phase='route';m.paused=false;m.departed=m.secured=true;Object.assign(m.van,{x:0,z:-65,yaw:0,gear:-1,speed:-.5,hand:false,belt:true});m.crossing.state='resolved';m.traffic.forEach(c=>{c.x=18;c.z=-130;c.speed=0;});return m;};
const tick=(m,dt=.1,old={speed:m.van.speed})=>{m.elapsed+=dt;P.tick(m,dt,old);};
const backing=()=>raw.filter(e=>e.type==='drive.backing');
test('safe backing needs no walk-around and reports once when the manoeuvre ends',()=>{
 const m=make();tick(m);assert.equal(backing().length,0);assert.equal(m.driving.reverseActive,true);m.van.speed=0;tick(m);assert.equal(backing().length,0,'braking alone keeps one manoeuvre');m.van.hand=true;tick(m);
 assert.equal(backing().length,1);assert.equal(backing()[0].ok,true);assert.equal(backing()[0].cameraSeconds,.3);assert.equal(backing()[0].stop,1);assert.equal(backing()[0].where.z,-65);tick(m);assert.equal(backing().length,1);assert.equal(raw.some(e=>e.type==='drive.backing-walkaround'),false);
});
test('contact and more than 5 mph fail immediately and cannot become a later pass',()=>{
 for(const reason of ['speed','wall','traffic']){W.begin();raw.length=0;const m=make();tick(m);if(reason==='speed')m.van.speed=-5.01/2.2369362921;else if(reason==='wall')m.motion={contact:true};else m._rearContact=true;tick(m);assert.equal(backing().length,1,reason);assert.equal(backing()[0].ok,false,reason);m.van.speed=0;m.van.hand=true;tick(m);assert.equal(backing().length,1,reason);}
 const m=make();W.begin();raw.length=0;m.van.speed=-5/2.2369362921;tick(m);m.van.speed=0;m.van.hand=true;tick(m);assert.equal(backing()[0].ok,true);
});
test('a collision from rest while attempting reverse is still a backing failure',()=>{
 const m=make();m.van.speed=0;m.motion={contact:true};tick(m,.0125,{speed:0});assert.equal(backing().length,1);assert.equal(backing()[0].ok,false);
});
test('setting the parking brake while still rolling finishes one manoeuvre after stopping',()=>{
 const m=make();m.driving.bus.state=m.driving.siren.state='done';m.step({forward:true},.05);assert.equal(m.driving.reverseActive,true);m.van.hand=true;
 for(let i=0;i<100;i++)m.step({},.0125);assert.equal(m.van.speed,0);assert.equal(backing().length,1);assert.equal(backing()[0].ok,true);assert.equal(m.driving.reverseCount,1);assert.equal(m.driving.reverseActive,false);
});
test('camera time counts only when visible, in reverse and unpaused, and survives an unfinished reload',()=>{
 const m=make();tick(m,.2);m.rearVisible=false;tick(m,.2);assert.equal(m.driving.backing[0],.2);
 const r=M.restore(m.snapshot());assert.ok(r);assert.equal(r.driving.reverseActive,true);const elapsed=r.elapsed;r.step({forward:true},1);assert.equal(r.elapsed,elapsed);r.paused=false;r.rearVisible=true;tick(r,.1);r.van.speed=0;r.selectGear(0);tick(r);
 assert.equal(backing().length,1);assert.equal(backing()[0].cameraSeconds,.3);const done=M.restore(r.snapshot());assert.ok(done);tick(done);assert.equal(backing().length,1);assert.equal(done.driving.backing,undefined);
});
test('only trainer-required tight scenarios report the optional walk-around type',()=>{
 for(const [rules,spot,expected] of [['optional','tight-drive',false],['required','alley',false],['required','tight-drive',true]]){W.begin();raw.length=0;const m=make();m.workdayRules={walkaround:rules};m.parkingSpot=spot;tick(m);const e=raw.filter(e=>e.type==='drive.backing-walkaround');assert.equal(e.length,Number(expected));if(expected)assert.equal(e[0].ok,false);}
 const m=make();W.begin();raw.length=0;m.workdayRules={walkaround:'required'};m.parkingSpot='tight-drive';Object.assign(m.driving,{goalClear:true,goalAt:0,goalX:0,goalZ:-65,goalYaw:0});tick(m);assert.equal(raw.find(e=>e.type==='drive.backing-walkaround').ok,true);
});
test('trainer rules are cached outside the frame loop and never enter the mission checkpoint',()=>{
 const m=make();let calls=0;O.academy={workdayRules(day){calls++;assert.equal(day,1);return {assists:'full',walkaround:'required',night:false,damage:false};}};
 try{O.fp.applyDriveRules(m);assert.equal(m.driveAssist,1);assert.equal(m.workdayRules.walkaround,'required');for(let i=0;i<10;i++)tick(m);assert.equal(calls,1);assert.equal(m.snapshot().workdayRules,undefined);}finally{delete O.academy;}
});
test('invalid camera counters and malformed practice checkpoints are rejected without breaking old saves',()=>{
 const m=make();assert.ok(M.restore(m.snapshot()));for(const b of [[0],[100,false,false],[-1,false,false],[0,1,false],[0,false,false,1]]){const save=m.snapshot();save.driving.backing=b;assert.equal(M.restore(save),null);}
 const p=M.create('parking',3),save=p.snapshot();delete save.parking;assert.equal(M.restore(save),null);const other=M.create('parking',2).snapshot();other.routePlan={};assert.equal(M.restore(other),null);
});
test('three sensor rays find rotated world obstacles, cars and a crossing pedestrian',()=>{
 const m=make();m.solids=[];let r=P.sense(m);assert.equal(r.distance,6);m.solids.push({x:0,z:-60,w:.3,d:.2});r=P.sense(m);assert.ok(Math.abs(r.centre-2.18)<1e-8);assert.equal(r.left,6);assert.equal(r.right,6);
 m.solids=[];Object.assign(m.van,{x:0,z:0,yaw:Math.PI/2});m.solids.push({x:-4,z:0,w:.2,d:.3});r=P.sense(m);assert.ok(Math.abs(r.centre-1.18)<1e-8);
 m.solids=[];Object.assign(m.van,{x:0,z:0,yaw:0});Object.assign(m.traffic[0],{x:0,z:5,yaw:0});assert.ok(P.sense(m).distance<.5);m.traffic[0].x=18;Object.assign(m.crossing,{state:'crossing',x:0,z:4});assert.ok(Math.abs(P.sense(m).centre-.88)<1e-8);
});
test('sensor bands and text distinguish distance without relying on colour or sound',()=>{
 const m=make();for(const [gap,band,words] of [[.4,3,/Stop/],[1,2,/one meter/],[2,1,/2 meters/],[7,0,/no obstacle/]]){m.solids=[{x:0,z:m.van.z+2.72+gap+.05,w:3,d:.1}];const r=P.sense(m);assert.equal(r.band,band);assert.match(P.hint(m),words);}m.van.gear=1;assert.match(P.hint(m),/automatically/);
});
test('sensor sectors cover the van width without gaps between three thin rays',()=>{
 const m=make();for(const x of [-1.05,-.5,0,.5,1.05]){m.solids=[{x,z:m.van.z+4,w:.05,d:.1}];assert.ok(P.sense(m).distance<2,String(x));}
});
test('guidelines follow reverse rear-axle arcs and bend in opposite directions',()=>{
 const a={},b={},straight={};P.path(0,-1.1,3,straight);assert.deepEqual(straight,{x:-1.1,y:.045,z:5.7});P.path(.3,0,4,a);P.path(-.3,0,4,b);assert.ok(a.x>0&&b.x<0);assert.ok(Math.abs(a.x+b.x)<1e-8);assert.equal(a.z,b.z);
});
test('alley, dock and tight-drive practice have real collision walls, isolated saves and no workday reports',()=>{
 for(let seed=1;seed<=3;seed++){W.begin();raw.length=0;const m=M.create('parking',seed);assert.equal(m.parkingSpot,P.spots[seed-1]);assert.equal(m.parcels.length,0);assert.equal(m.blocked(m.parkingWalls[0].x,m.parkingWalls[0].z),true);m.paused=false;m.van.gear=-1;m.van.hand=false;m.van.speed=-.4;tick(m);const r=M.restore(m.snapshot());assert.ok(r);assert.equal(r.parkingSpot,m.parkingSpot);assert.deepEqual(JSON.parse(JSON.stringify(r.parkingBay)),JSON.parse(JSON.stringify(m.parkingBay)));
 Object.assign(r.van,{x:0,z:-53,yaw:0,speed:0,hand:true});tick(r);assert.equal(r.parking.done,true);assert.equal(r.finish(),'');assert.equal(raw.length,0);}
});
function scene(high=false){O.gfx={high:()=>high};const world=new THREE.Scene(),camera=new THREE.PerspectiveCamera(68,16/9,.08,180);world.add(camera);const s={view:{world,camera,mirror:{camera:new THREE.PerspectiveCamera()}},model:make()};s.art=O.fpWorld.build(s,s.model);s.sync=()=>s.art.sync(s.model,'route');s.sync();return s;}
test('the screen powers automatically, is keyboard reachable, and does not feed its own reflection',()=>{
 for(const high of [false,true]){const s=scene(high),r=s.art.rear;assert.equal(r.screen.position.y,s.art.cab.navigation.local.y);s.model.van.speed=0;s.model.van.hand=true;s.sync();assert.equal(s.view.mirror.rearOn,true);assert.equal(r.screen.material.uniforms.active.value,1);let found=false;for(let i=0;i<32;i++){s.message=()=>{};if(O.fpAccess.focus(s)==='cab-camera'){found=true;break;}}assert.equal(found,true);s.sync();assert.equal(r.inView,true);
 const camera=r.camera.matrixWorld.clone(),screen=r.screen.matrixWorld.clone();s.model.van.look=-.4;s.sync();assert.deepEqual(r.camera.matrixWorld.elements,camera.elements);for(let n=0;n<16;n++)assert.ok(Math.abs(r.screen.matrixWorld.elements[n]-screen.elements[n])<1e-10);
 s.view.mirror.before(3);assert.equal(r.screen.visible,false);s.view.mirror.after(3);assert.equal(r.screen.visible,true);s.model.van.gear=1;s.sync();assert.equal(s.view.mirror.rearOn,false);assert.equal(r.screen.material.uniforms.active.value,0);s.art.dispose();assert.equal(s.view.mirror.rearCamera,null);}
});
test('all practice spaces and reflection cameras fit the unchanged complete-frame Low budget',()=>{
 const records=[];O.gfx={high:()=>false};
 for(let seed=1;seed<=3;seed++){
  const m=M.create('parking',seed),world=new THREE.Scene(),camera=new THREE.PerspectiveCamera(68,16/9,.08,180);world.add(camera);const s={model:m,view:{world,camera,mirror:{camera:new THREE.PerspectiveCamera()}}};s.art=O.fpWorld.build(s,m);
  const count=cam=>{cam.updateMatrixWorld(true);const f=new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix,cam.matrixWorldInverse));let calls=0,triangles=0;world.traverseVisible(o=>{if(!o.isMesh||!o.layers.test(cam.layers)||o.frustumCulled&&!f.intersectsObject(o))return;calls++;const g=o.geometry;triangles+=(g.index?g.index.count:g.attributes.position.count)/3*(o.isInstancedMesh?o.count:1);});return {calls,triangles};};
  for(const z of [-65,-59,-53])for(const look of [0,-1.1,1.1])for(const steer of [-.4,0,.4]){Object.assign(m.van,{z,look,steer,gear:-1});s.art.sync(m,'route');const a=count(camera);for(let i=0;i<4;i++){s.view.mirror.before(i);const b=count(s.view.mirror.camera);s.view.mirror.after(i);const total={spot:m.parkingSpot,z,look,steer,reflection:i,calls:a.calls+b.calls+1,triangles:a.triangles+b.triangles+2};records.push(total);assert.ok(total.calls<=64&&total.triangles<=2500,JSON.stringify(total));}}
  s.art.dispose();
 }
 fs.mkdirSync(__dirname+'/out/fp-review',{recursive:true});fs.writeFileSync(__dirname+'/out/fp-review/c24-practice-geometry.json',JSON.stringify({views:records.length,peakCalls:Math.max(...records.map(r=>r.calls)),peakTriangles:Math.max(...records.map(r=>r.triangles)),worst:records.reduce((a,b)=>a.triangles>b.triangles?a:b)},null,2));
});
test('reverse scheduling keeps all mirrors live and updates only one atlas cell per frame',()=>{
 const Original=THREE.WebGLRenderer;try{for(const high of [false,true]){clock=0;O.gfx={high:()=>high};O.W=1280;O.H=720;let worldDraws=0;
 THREE.WebGLRenderer=class{constructor(){this.info={autoReset:false,render:{calls:0,triangles:0},memory:{textures:2,geometries:4},reset(){this.render.calls=this.render.triangles=0;}};}resetState(){}setScissorTest(){}setScissor(){}setRenderTarget(){}setViewport(){}clear(){}render(root){if(root.children.some(o=>o.isCamera))worldDraws++;this.info.render.calls++;this.info.render.triangles+=2;}};
 const s={sys:{game:{canvas:{},renderer:{gl:{drawingBufferWidth:1280,drawingBufferHeight:720},pipelines:{clear(){},rebind(){}}}}},add:{extern:()=>({setDepth(){return this;}})},events:{once(){}}},v=O.world3d.create(s);v.mirror.on=v.mirror.rearOn=true;v.mirror.rearCamera=new THREE.PerspectiveCamera();v.mirror.updates[3]=0;
 for(let f=0;f<120;f++){const before=worldDraws;clock=f*1000/60;v.extern.render();assert.ok(worldDraws-before>=1&&worldDraws-before<=2);}
 assert.equal(v.mirror.filled,15);assert.ok(v.mirror.updates.slice(0,3).every(n=>n>=8));assert.ok(v.mirror.updates[3]>=v.mirror.updates[0]*2);assert.ok(v.mirror.updates.reduce((a,b)=>a+b,0)<=(high?120:66));assert.equal(v.diagnostics.textures,2);assert.equal(v.diagnostics.attachmentBytes,high?9142272:3557376);
 }}finally{THREE.WebGLRenderer=Original;}
});
