/* CPU geometry and scene-state checks. No WebGL context, browser or image rendering. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const THREE=require('../lib/three.min.js');
const context={THREE,Phaser:{Scene:class{}},URLSearchParams,location:{search:''}};context.window=context;
vm.createContext(context);
for(const name of ['firstperson','fpmission','fpcamera','world3d','fpbranding','fpcab','fpworld'])vm.runInContext(fs.readFileSync(__dirname+'/../src/core/'+name+'.js','utf8'),context);
context.OTR.registerScene=C=>{context.SceneClass=C;};
vm.runInContext(fs.readFileSync(__dirname+'/../src/scenes/FirstPersonScene.js','utf8'),context);
function world(high=true){
  context.OTR.gfx={high:()=>high};
  const camera=new THREE.PerspectiveCamera(68,16/9,0.08,180),world=new THREE.Scene();world.add(camera);
  const scene={view:{world,camera,mirror:{camera:new THREE.PerspectiveCamera(),on:false}},panel:null};
  const art=context.OTR.fpWorld.build(scene),m=context.OTR.fpMission.create('campaign',1);
  return {scene,art,m,camera};
}
test('render diagnostics count world, mirror and composite once per frame without accumulating',()=>{
  const original=THREE.WebGLRenderer;
  try{
    THREE.WebGLRenderer=class{
      constructor(){this.info={autoReset:true,render:{calls:0,triangles:0},memory:{textures:2,geometries:4},reset(){this.render.calls=0;this.render.triangles=0;}};}
      resetState(){} setScissorTest(){} setRenderTarget(){} setViewport(){} clear(){}
      render(root){if(this.info.autoReset)this.info.reset();this.info.render.calls+=root.children.some(o=>o.isCamera)?3:1;this.info.render.triangles+=root.children.some(o=>o.isCamera)?36:2;}
    };
    context.OTR.gfx={high:()=>false};context.OTR.W=1280;context.OTR.H=720;
    const scene={sys:{game:{canvas:{},renderer:{gl:{drawingBufferWidth:1280,drawingBufferHeight:720},pipelines:{clear(){},rebind(){}}}}},add:{extern:()=>({setDepth(){return this;}})},events:{once(){}}};
    const view=context.OTR.world3d.create(scene),d=view.diagnostics;
    view.extern.render();assert.equal(d.calls,4);assert.equal(d.triangles,38);
    view.mirror.on=true;view.extern.render();assert.equal(d.calls,7);assert.equal(d.triangles,74);
    view.extern.render();assert.equal(view.diagnostics,d);assert.equal(d.calls,7);
    assert.equal(d.targetWidth,832);assert.equal(d.targetHeight,468);assert.equal(d.attachmentBytes,3575808);
  }finally{THREE.WebGLRenderer=original;}
});
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
  w.m.cargoOpen=false;w.art.sync(w.m,null,'route');
  assert.equal(w.art.parcels[0].visible,false,'closed cargo hides its contents');
  w.camera.lookAt(w.art.parcels[0].userData.barcode.getWorldPosition(new THREE.Vector3()));w.camera.updateMatrixWorld(true);
  assert.notEqual(w.art.pick(),'parcel0');
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
test('the sprung body dives and rolls without tilting the tyres, and reduced motion removes both',()=>{
  const old=context.OTR.fpAccess;
  try{
    for(const high of [false,true]){
      let reduced=false;context.OTR.fpAccess={reduced:()=>reduced};
      const w=world(high);w.m.motion={pitch:-.03,roll:.02};w.art.sync(w.m,null,'route');
      assert.equal(w.art.chassis.rotation.x,-.03);assert.equal(w.art.chassis.rotation.z,.02);
      assert.equal(w.art.van.rotation.x,0);assert.equal(w.art.van.rotation.z,0);
      const tyre=w.art.interactions.find(o=>o.userData.interaction==='tyres');assert.equal(tyre.parent,w.art.van);
      reduced=true;w.art.sync(w.m,null,'route');assert.equal(w.art.chassis.rotation.x,0);assert.equal(w.art.chassis.rotation.z,0);
      reduced=false;w.m.motion=undefined;w.art.sync(w.m,null,'route');assert.equal(w.art.chassis.rotation.x,0);assert.equal(w.art.chassis.rotation.z,0);
      w.art.dispose();
    }
  }finally{context.OTR.fpAccess=old;}
});
test('turning the head moves the view without carrying the dashboard or changing the saved mission',()=>{
  const w=world(false);w.m.mode='cab';w.art.sync(w.m,null,'route');const dash=w.camera.getObjectByName('cab-dashboard'),before=dash.matrixWorld.clone();
  w.m.van.look=.7;w.m.elapsed+=.02;const saved=JSON.stringify(w.m.snapshot());w.art.sync(w.m,null,'route');
  for(let i=0;i<16;i++)assert.ok(Math.abs(dash.matrixWorld.elements[i]-before.elements[i])<1e-9);
  assert.ok(Math.abs(w.camera.rotation.y+.7)<1e-9);assert.equal(JSON.stringify(w.m.snapshot()),saved);w.art.dispose();
});
test('reduced motion clears even the last fractional degree of speed zoom',()=>{
  const old=context.OTR.fpAccess;let reduced=false;context.OTR.fpAccess={reduced:()=>reduced};
  try{const w=world(false);w.m.mode='cab';w.m.driveAssist=0;w.m.van.speed=8;w.art.sync(w.m,null,'route');w.m.van.speed=0;
    for(let i=0;i<80;i++){w.m.elapsed+=.05;w.art.sync(w.m,null,'route');}reduced=true;w.art.sync(w.m,null,'route');assert.equal(w.camera.fov,68);w.art.dispose();
  }finally{context.OTR.fpAccess=old;}
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
test('a carried package can still be put back on its empty depot table without another target',()=>{
  const s=new context.SceneClass(),m=context.OTR.fpMission.create('campaign',1);Object.assign(m.player,m.point('parcel0'));assert.equal(m.pickup('parcel0'),'');
  Object.assign(s,{model:m,workdaySound:{effect:()=>{}},area:'route',aimTarget:()=>null,checkpoint(){},sync(){},refresh(){},message(){}});s.interact();assert.equal(m.heldId,null);assert.equal(m.parcels[0].location,'depot');
});
test('scanner reads the barcode face, not the back of a box or through a closed door',()=>{
  const w=world();
  const scan=(position)=>{Object.assign(w.m.player,position);w.art.sync(w.m,null,'route');
    w.camera.lookAt(w.art.parcels[0].userData.barcode.getWorldPosition(new THREE.Vector3()));w.camera.updateMatrixWorld(true);return w.art.scanTarget();};
  assert.equal(scan({x:-11,z:5.8}),'parcel0');assert.equal(scan({x:-11,z:2.5}),null);
  w.m.parcels[0].location='slot0';w.m.cargoOpen=true;
  assert.equal(scan({x:4,z:11.3}),'parcel0');w.m.cargoOpen=false;assert.equal(scan({x:4,z:11.3}),null);
});
test('a carried parcel is raised for scanning and keeps its actual identity',()=>{
  const w=world();w.m.parcels[2].location='held';w.m.heldId='parcel2';
  w.scene.handheld={aiming:true};w.art.sync(w.m,null,'route');assert.equal(w.art.scanTarget(),'parcel2');
  w.scene.handheld.aiming=false;w.art.sync(w.m,null,'route');assert.equal(w.art.scanTarget(),null);
});
test('low graphics keeps barcode scanning on cargo shelves',()=>{
  const w=world(false);w.m.cargoOpen=true;w.m.parcels[0].location='slot0';Object.assign(w.m.player,{x:4,z:11.3});w.art.sync(w.m,null,'route');
  w.camera.lookAt(w.art.parcels[0].userData.barcode.getWorldPosition(new THREE.Vector3()));w.camera.updateMatrixWorld(true);
  assert.equal(w.art.scanTarget(),'parcel0');
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
test('both hub-workday exit choices checkpoint then pause without entering the prototype hub',()=>{
  const original=context.OTR.workday;
  try{
    for(const method of ['toHub','leavePrototype']){
      const s=new context.SceneClass(),calls=[];s.hubWorkday=true;
      s.checkpoint=()=>calls.push('save');s.closePanel=()=>{};s.releaseMouse=()=>{};
      s.transition=()=>assert.fail('must not enter the prototype hub');
      context.OTR.workday={pause:scene=>{assert.equal(scene,s);calls.push('pause');}};
      s[method]();assert.equal(calls.join(','),'save,pause');
    }
  }finally{context.OTR.workday=original;}
});
test('successful hub workday dispatch hands the numbered summary to results and clears its checkpoint',()=>{
  const original=context.OTR.workday;
  try{
    const s=new context.SceneClass();s.hubWorkday=true;s.model=context.OTR.fpMission.create('campaign',1);
    const m=s.model;m.stops.forEach((stop,i)=>{stop.resolved=true;stop.outcome=i===0?'handover':'retained';});
    m.elapsed=123.4;m.player={x:-12,z:11};s.progress={campaign:m.snapshot()};
    s.objectiveText=()=>'';s.showPanel=(title,body,choices)=>{s.choices=choices;};s.write=()=>true;
    s.closePanel=()=>{};s.releaseMouse=()=>{};s.showDebrief=()=>assert.fail('hub day uses results');
    let summary;context.OTR.workday={finish:(scene,value)=>{assert.equal(scene,s);summary=value;}};
    s.showDispatch();s.choices[0].action();
    assert.equal(s.progress.campaign,null);assert.equal(summary.seconds,123);
    assert.equal(summary.stops.map(s=>s.stop).join(','),'1,2,3');
    assert.equal(summary.stops.map(s=>s.delivered).join(','),'true,false,false');
    assert.equal(summary.depot.x,4);assert.equal(summary.depot.z,8);
  }finally{context.OTR.workday=original;}
});
