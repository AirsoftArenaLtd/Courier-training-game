/* CPU geometry and scene-state checks. No WebGL context, browser or image rendering. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const THREE=require('../lib/three.min.js');
const context={THREE,Phaser:{Scene:class{}},URLSearchParams,location:{search:''}};context.window=context;
vm.createContext(context);
for(const name of ['firstperson','fpmission','world3d','fpworld'])vm.runInContext(fs.readFileSync(__dirname+'/../src/core/'+name+'.js','utf8'),context);
context.OTR.registerScene=C=>{context.SceneClass=C;};
vm.runInContext(fs.readFileSync(__dirname+'/../src/scenes/FirstPersonScene.js','utf8'),context);
function world(high=true){
  context.OTR.gfx={high:()=>high};
  const camera=new THREE.PerspectiveCamera(68,16/9,0.08,180),world=new THREE.Scene();world.add(camera);
  const scene={view:{world,camera,mirror:{camera:new THREE.PerspectiveCamera(),on:false}},panel:null};
  const art=context.OTR.fpWorld.build(scene),m=context.OTR.fpMission.create('campaign',1);
  return {scene,art,m,camera};
}
function aim(w,position,id){
  const {art,m,camera}=w;Object.assign(m.player,position);art.sync(m,null,'route');
  const candidates=art.interactions.filter(o=>o.userData.interaction===id);
  const target=candidates.find(o=>{for(let p=o;p;p=p.parent)if(!p.visible)return false;return true;});
  assert.ok(target,'visible '+id);const p=new THREE.Vector3();target.getWorldPosition(p);camera.lookAt(p);camera.updateMatrixWorld(true);
  return art.pick();
}
test('depot parcels and vehicle inspection/entry points can be reached with real raycasts',()=>{
  const w=world();
  for(let i=0;i<3;i++)assert.equal(aim(w,{x:-9,z:4-i*3+0.4},'parcel'+i),'parcel'+i);
  assert.equal(aim(w,{x:1.6,z:6.3},'driver'),'driver');
  assert.equal(aim(w,{x:1.6,z:6.4},'tyres'),'tyres');
  assert.equal(aim(w,{x:4,z:4},'lights'),'lights');
  assert.equal(aim(w,{x:4,z:12},'cargo'),'cargo');
});
test('all six empty shelf positions and the restraint are selectable from the cargo aisle',()=>{
  const w=world();w.m.cargoOpen=true;
  for(const slot of context.OTR.fpMission.slots){const p=context.OTR.fp.local(w.m.van,0,slot.z+0.45);assert.equal(aim(w,p,slot.id),slot.id);}
  assert.equal(aim(w,{x:4,z:11.6},'secure'),'secure');
});
test('loaded parcel raycasts follow the parked van rotation and obey the closed door',()=>{
  const w=world();w.m.cargoOpen=true;w.m.parcels[0].location='slot0';w.m.van.yaw=Math.PI/3;
  const p=context.OTR.fp.local(w.m.van,0,3.2);assert.equal(aim(w,p,'parcel0'),'parcel0');
  w.m.cargoOpen=false;assert.notEqual(aim(w,p,'parcel0'),'parcel0');
});
test('all customer doors are outside the house occluder and reachable from the path',()=>{
  const w=world();for(const s of w.m.stops)assert.equal(aim(w,{x:8.4,z:s.z},'door'+s.id),'door'+s.id);
});
test('hub stations are pickable and inactive route interactions are invisible',()=>{
  const w=world();const p={x:0,z:0,yaw:0,pitch:0};w.art.sync(null,p,'hub');
  for(const id of ['hub-day','hub-practice','hub-record']){
    const target=w.art.interactions.find(o=>o.userData.interaction===id),v=target.getWorldPosition(new THREE.Vector3());
    w.camera.position.set(v.x,1.65,v.z+2);w.camera.lookAt(v);w.scene.view.world.updateMatrixWorld(true);assert.equal(w.art.pick(),id);
  }
  assert.equal(w.art.route.visible,false);
});
test('low graphics retains identical parcel, door and vehicle interaction targets',()=>{
  const a=world(true),b=world(false);
  const ids=w=>w.art.interactions.map(o=>o.userData.interaction).sort().join('|');assert.equal(ids(a),ids(b));
  const count=w=>{let n=0;w.scene.view.world.traverse(o=>{if(o.isInstancedMesh)n+=o.count;});return n;};assert.ok(count(b)<count(a));
});
test('mirror observes live route actors only while requested and cab state restores afterward',()=>{
  const w=world();w.m.mode='cab';w.m.paused=false;w.m.mirror();w.art.sync(w.m,null,'route');
  assert.equal(w.scene.view.mirror.on,true);assert.equal(w.art.van.visible,false);
  w.scene.view.mirror.before();assert.equal(w.art.van.visible,true);
  const mirror=w.scene.view.mirror.camera;mirror.updateMatrixWorld(true);
  const direction=mirror.getWorldDirection(new THREE.Vector3()),ray=new THREE.Raycaster(mirror.position,direction,0.08,20);
  assert.ok(direction.z>0.9);assert.ok(direction.x<0);
  assert.equal(ray.intersectObject(w.art.van,true).length,0,'mirror centre can see behind the van');
  w.scene.view.mirror.after();assert.equal(w.art.van.visible,false);
  w.m.elapsed+=4;w.art.sync(w.m,null,'route');assert.equal(w.scene.view.mirror.on,false);
});
test('inspection refreshes the raycast rather than opening a formerly aimed-at parcel',()=>{
  const s=new context.SceneClass();s.model=context.OTR.fpMission.create('campaign',1);
  Object.assign(s.model.player,{x:-9,z:4});s.target='parcel0';s.sync=()=>{};s.art={pick:()=>null};
  s.showPanel=()=>assert.fail('occluded parcel must not open');s.showParcel();assert.equal(s.target,null);
});
test('handheld can show the last scan without remotely rescanning an unselected parcel',()=>{
  const s=new context.SceneClass();s.model=context.OTR.fpMission.create('campaign',1);
  Object.assign(s.model.player,{x:-9,z:4});s.model.lastScan='parcel0';s.target='parcel0';s.sync=()=>{};s.art={pick:()=>null};
  let choices;s.showPanel=(title,body,options)=>{choices=options;};s.showScanner();
  assert.equal(choices.length,2);assert.equal(s.target,null);
});
test('saving practice preserves a separate suspended workday',()=>{
  const s=new context.SceneClass();s.progress=context.OTR.fpStore.empty();s.progress.campaign=context.OTR.fpMission.create('campaign',9).snapshot();
  const original=JSON.stringify(s.progress.campaign);s.model=context.OTR.fpMission.create('practice',10);s.time={now:50};s.write=()=>true;
  s.checkpoint();assert.equal(JSON.stringify(s.progress.campaign),original);assert.equal(s.progress.practice.kind,'practice');
});
test('scene transition saves before swapping models and ignores duplicate requests',()=>{
  const s=new context.SceneClass();let saves=0,actions=0;const queue=[];
  s.transitioning=false;s.closePanel=()=>{};s.checkpoint=()=>saves++;s.capture=()=>{};s.sync=()=>{};s.fade={};s.panel=null;s.hubMotion={paused:true};
  s.tweens={add:o=>queue.push(o)};s.transition(()=>actions++);s.transition(()=>actions++);
  assert.equal(saves,1);assert.equal(actions,0);queue.shift().onComplete();assert.equal(actions,1);queue.shift().onComplete();assert.equal(s.transitioning,false);
});
