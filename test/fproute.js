/* Full-route identity, save compatibility and physical access, without WebGL. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const THREE=require('../lib/three.min.js');
const c={THREE};c.window=c;vm.createContext(c);
for(const file of ['data/theme.js','data/config.js','data/m3_doorsteps.js','data/m8_stops.js','data/town.js','data/workday_events.js',
 'src/core/theme.js','src/core/rig.js','src/core/scenery.js','src/core/townart.js','src/core/town.js','src/core/shift.js','src/core/scorelog.js','src/core/workday.js',
 'src/core/firstperson.js','src/core/fpmission.js','src/core/fpcamera.js','src/core/fproute.js','src/core/fplater.js','src/core/fpdriving.js','src/core/fploadout.js','src/core/fpday.js','src/core/fpdoors.js','src/core/world3d.js','src/core/fpbranding.js','src/core/fpcab.js','src/core/fpmirrors.js','src/core/fplighting.js','src/core/fpworld.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+file,'utf8'),c);
c.OTR.save={data:{townSeed:1}};
const M=c.OTR.fpMission,R=c.OTR.fpRoute,W=c.OTR.workday;
if(process.env.QA_ASSETS==='1'){
 const {install,local}=require('./tools/fpassets-context');install(c);
 test.before(async()=>{c.assetBank=await c.OTR.fpAssets.preload({fetch:local});assert.equal(c.assetBank.stats.loaded,1,JSON.stringify(c.assetBank.stats));});
 test.after(()=>c.assetBank.dispose());
}
const full=(day=1,variant=7)=>M.create('campaign',variant,process.env.QA_LATER==='1'?c.OTR.fpLater.prepare(R.plan(day,variant)):R.plan(day,variant));
const at=(m,id)=>{Object.assign(m.player,m.point(id));m.player.z+=0.6;};
test('five seeded stops match the route-day generator, addresses and package identities',()=>{
 for(let day=1;day<=14;day++){
  const generated=c.OTR.shift.generate(day,7),m=full(day);
  assert.equal(m.stops.length,5);
  assert.equal(m.stops.map(s=>s.lotId).join(),generated.route.map(r=>r.lotId).join());
  assert.equal(m.parcels.map(p=>p.tracking).join(),generated.route.map(r=>r.stop.packages[0].tracking).join());
  assert.equal(new Set(m.stops.map(s=>s.address)).size,5);
 }
 assert.notEqual(full(1,1).stops.map(s=>s.address).join(),full(1,2).stops.map(s=>s.address).join());
});
test('all town streets connect; doors and curb parking are accessible across generated days',()=>{
 for(let day=1;day<=30;day++){
  const m=full(day);m.traffic=[];
  assert.equal(m.town.xs.length,4);assert.equal(m.town.zs.length,5);
  for(const s of m.stops){
   assert.equal(R.onStreet(m,s.park.x,s.park.z),true);
   assert.equal(m.driveAllowed(s.park),true,'curb parking '+s.address);
   Object.assign(m.van,s.park);
   assert.equal(m.solids.some(b=>c.OTR.fp.vanBox(m.van,b)),false,'van clear '+s.address);
   assert.equal(m.blocked(s.x-s.side*0.7,s.z),false,'door approach '+s.address);
  }
  assert.equal(m.driveAllowed({x:18,z:m.town.zs[0]-18,yaw:0}),false,'no driving across a block');
 }
});
test('five physical load positions, stop-order reports and fifth parcel survive checkpoint restore',()=>{
 W.begin();const m=full();m.cargoOpen=true;
 for(const p of m.parcels){at(m,p.id);m.scan(p.id);assert.equal(m.pickup(p.id),'');at(m,'slot'+p.stop);assert.equal(m.place('slot'+p.stop),'');}
 m.secured=true;m.preparation();
 assert.equal(W.events.filter(e=>e.type==='load.shelf'&&e.ok).length,5);
 m.activeStop=4;m.lastScan='parcel4';
 const restored=M.restore(m.snapshot());assert.ok(restored);assert.equal(JSON.stringify(restored.snapshot()),JSON.stringify(m.snapshot()));
 const bad=m.snapshot();bad.stops[4].z+=1;assert.equal(M.restore(bad),null);
 const unknown=m.snapshot();unknown.routePlan.route[4].lotId='no-lot';assert.equal(M.restore(unknown),null);
});
test('misordered shelving is reported once and uses parcel keys',()=>{
 W.begin();const m=full();for(const p of m.parcels){p.zone='slot'+((p.stop+1)%5);p.location=p.zone;p.loaded=p.scanned=true;}
 m.parcels[0].zone='slot0';m.parcels[0].location='depot'; // A recorded shelf cannot excuse a parcel left behind.
 m.preparation();m.preparation();assert.equal(W.events.filter(e=>e.type==='load.shelf'&&!e.ok).length,5);
});
test('full-route stop-line reports have distinct junction and approach keys',()=>{
 W.begin();const m=full(),j=m.junctions[0],half=m.town.road/2;m.mode='cab';m.van.x=j.x+2;m.van.yaw=0;
 m.van.z=j.z+half+4;m.van.speed=0;R.tick(m,{x:m.van.x,z:m.van.z});
 m.van.z=j.z+half+2.6;m.van.speed=1;R.tick(m,{x:m.van.x,z:j.z+half+2.9});
 assert.equal(W.events.filter(e=>e.type==='drive.stop-line'&&e.ok).length,1);
 m.leg++;m.junctions[1].stopped=false;m.van.z=m.junctions[1].z+half+2.6;R.tick(m,{x:m.van.x,z:m.junctions[1].z+half+2.9});
 assert.equal(W.events.filter(e=>e.type==='drive.stop-line'&&!e.ok).length,1);
});
test('five deliveries and multiple scanned returns finish at the original depot',()=>{
 W.begin();const m=full();m.cargoOpen=true;
 for(const p of m.parcels){p.location='slot'+p.stop;p.zone=p.location;p.scanned=p.loaded=true;}
 for(const s of m.stops){
  Object.assign(m.van,s.park);m.activeStop=s.id;m.phase='route';at(m,'parcel'+s.id);assert.equal(m.pickup('parcel'+s.id),'');
  at(m,'door'+s.id);m.scan();m.contact(s.id);m.deliver(s.id,s.service==='signature'?'exception':s.service);
  assert.equal(s.resolved,true);
  if(m.heldId){at(m,'slot'+s.id);m.place('slot'+s.id);}
 }
 assert.equal(m.phase,'return');assert.equal(W.events.filter(e=>e.type==='deliver.outcome').length,5);
 Object.assign(m.van,{x:4,z:8,yaw:0});
 for(const p of m.parcels.filter(p=>p.returnRequired)){at(m,p.id);m.pickup(p.id);at(m,'returns');m.returnParcel();}
 at(m,'dispatch');assert.equal(m.finish(),'');
});
test('legacy three-stop saves and cargo practice remain restorable',()=>{
 for(const kind of ['campaign','practice']){const m=M.create(kind,7);assert.equal(m.stops.length,3);assert.ok(M.restore(m.snapshot()));}
});
test('all five generated facade doors are raycastable at low graphics',()=>{
 const m=full();c.OTR.gfx={high:()=>false};
 const camera=new THREE.PerspectiveCamera(68,16/9,0.08,180),world=new THREE.Scene();world.add(camera);
 const scene={view:{world,camera,mirror:{camera:new THREE.PerspectiveCamera(),on:false}}},art=c.OTR.fpWorld.build(scene,m);
 for(const s of m.stops){
  Object.assign(m.player,{x:s.x-s.side*1.5,z:s.z});art.sync(m,null,'route');
  const target=art.interactions.find(o=>o.userData.interaction==='door'+s.id);camera.lookAt(target.getWorldPosition(new THREE.Vector3()));camera.updateMatrixWorld(true);
  assert.equal(art.pick(),'door'+s.id,s.address);
 }
 art.dispose();assert.equal(world.children.length,1);
});
test('the van can steer around a right-hand grid corner without crossing buildings or leaving the street',()=>{
 const m=full();m.mode='cab';m.paused=false;m.secured=true;m.departed=true;m.crossing.state='resolved';m.traffic=[];
 // Turn in when the front axle reaches the junction; the rear-axle van now has a real tail swing.
 const j=m.junctions[1];Object.assign(m.van,{x:j.x+2.1,z:j.z+6,yaw:0,speed:2,hand:false,belt:true});
 for(let i=0;i<800&&m.van.yaw<Math.PI/2-0.03;i++)m.step({forward:m.van.speed<2,right:true},0.025);
 assert.ok(m.van.yaw>1.5,JSON.stringify(m.van));
 assert.equal(m.solids.some(b=>c.OTR.fp.vanBox(m.van,b)),false);
 assert.equal(m.driveAllowed(m.van),true);
});
test('low graphics stays within the complete-frame geometry budget at every stop, with loaded cargo and mirror',()=>{
 const records=[],cabViews=process.env.QA_CAB==='1'?['cab-park','cab-reverse','cab-neutral','cab-drive','cab-handbrake','cab-belt','cab-signal-left','cab-signal-right','cab-headlights','cab-wipers','cab-exit']:[],mirrorViews=process.env.QA_MIRRORS==='1'?['mirror-left','mirror-right','mirror-interior']:[];
 for(const variant of (process.env.QA_LATER==='1'?[1,2,3,4,5,6,7,8,9,10]:[7]))for(let day=1;day<=30;day++){
 const m=full(day,variant);c.OTR.fpDriving.configure(m);c.OTR.fpLoadout.configure(m,'extra');c.OTR.fpDay.configure(m);c.OTR.fpDoors.configure(m);for(const s of m.stops)s.contacted=true;c.OTR.fpDoors.sync(m);m.mode='cab';m.paused=false;
 c.OTR.gfx={high:()=>false};
 const camera=new THREE.PerspectiveCamera(68,16/9,0.08,180),world=new THREE.Scene();world.add(camera);
 const scene={assetBank:c.assetBank,view:{world,camera,mirror:{camera:new THREE.PerspectiveCamera(55,16/9,0.08,100),on:false}}},art=c.OTR.fpWorld.build(scene,m);
 if(c.assetBank)assert.equal(art.assetGroups.length,1);
 const count=cam=>{
  cam.updateMatrixWorld(true);const frustum=new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix,cam.matrixWorldInverse));
  let calls=0,triangles=0;
  world.traverseVisible(o=>{if(!o.isMesh||!o.layers.test(cam.layers)||(o.frustumCulled&&!frustum.intersectsObject(o)))return;calls++;const g=o.geometry;triangles+=(g.index?g.index.count:g.attributes.position.count)/3*(o.isInstancedMesh?o.count:1);});
  return {calls,triangles};
 };
 for(const loaded of [false,true]){
  for(const p of m.parcels)p.location=loaded?'slot'+(p.anomaly?5:p.stop):'depot';
  for(const s of m.stops)for(const pose of (process.env.QA_CAMERA==='1'?['steady','turn','turnleft','brake',...cabViews,...mirrorViews]:['steady'])){
   Object.assign(m.van,s.park);m.van.look=0;m.player.pitch=0;m.elapsed=0;
   if(process.env.QA_LIGHTING==='1')m.routePlan.timeOfDay=c.OTR.fpLighting.times[(day+s.id)%4];
   if(process.env.QA_CAMERA==='1'){
    const turning=pose==='turn'||pose==='turnleft',side=pose==='turnleft'?-1:1;
    m.driveAssist=0;m.van.speed=turning?8:pose==='brake'?4:0;m.van.steer=turning?side*.16:0;
    c.OTR.fp.suspension(m,1,pose==='brake'?-6:0,turning?side*4:0);m.motion.pitch=pose==='brake'?-.035:0;m.motion.roll=turning?side*.025:0;art.resetCamera();
   }
   for(const [name,z] of [['bus',-18],['siren',14]]){const p=c.OTR.fp.local(m.van,0,z);Object.assign(m.driving[name],{state:name==='bus'?'flashing':'passing',x:p.x,z:p.z,yaw:m.van.yaw});}
   art.sync(m,null,'route');
   if(pose.startsWith('cab-')||pose.startsWith('mirror-')){const at=art.interactions.find(o=>o.userData.interaction===pose).getWorldPosition(new THREE.Vector3()),eye=camera.position;m.van.look=Math.atan2(at.x-eye.x,-(at.z-eye.z))-m.van.yaw;m.player.pitch=Math.atan2(eye.y-at.y,Math.hypot(at.x-eye.x,at.z-eye.z));art.sync(m,null,'route');}
   const main=count(camera);
   for(const reflection of (process.env.QA_MIRRORS==='1'?[0,1,2]:[0])){
    scene.view.mirror.before(reflection);const mirror=count(scene.view.mirror.camera);scene.view.mirror.after();
    const total={calls:main.calls+mirror.calls+1,triangles:main.triangles+mirror.triangles+2};
    records.push({day,variant,stop:s.id,loaded,pose,reflection,...total});
    assert.ok(total.calls<=64&&total.triangles<=2500,`${day}/${variant}, ${s.address}, loaded=${loaded}, ${pose}, reflection=${reflection}: ${JSON.stringify(total)}`);
   }
  }
 }
 art.dispose();
 }
 if(process.env.QA_LATER==='1'){fs.mkdirSync(__dirname+'/out/fp-review',{recursive:true});const tag=process.env.QA_TAG||(process.env.QA_CAMERA==='1'?'c21':c.assetBank?'c19':'c18');fs.writeFileSync(__dirname+'/out/fp-review/'+tag+'-geometry.json',JSON.stringify({views:records.length,peakCalls:records.reduce((n,r)=>Math.max(n,r.calls),0),peakTriangles:records.reduce((n,r)=>Math.max(n,r.triangles),0),worst:records.reduce((a,b)=>a.triangles>b.triangles?a:b)},null,2));}
});

test('the generated route resumes every load-out variant, including the sixth physical package',()=>{
 for(const kind of c.OTR.fpLoadout.kinds){const m=full();c.OTR.fpLoadout.configure(m,kind);c.OTR.fpDriving.configure(m);c.OTR.fpDay.configure(m);c.OTR.fpDoors.configure(m);
  assert.equal(m.stops.length,5);assert.equal(m.parcels.length,['extra','missort'].includes(kind)?6:5);
  const restored=M.restore(m.snapshot());assert.ok(restored,kind);assert.equal(JSON.stringify(restored.snapshot()),JSON.stringify(m.snapshot()));
 }
});
