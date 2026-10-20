/* CPU world checks for physical richer-stop props, occlusion, custody and reflection buffers. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),THREE=require('../lib/three.min.js');
const c={THREE};c.window=c;vm.createContext(c);
for(const f of ['data/theme.js','data/config.js','data/m3_doorsteps.js','data/m8_stops.js','data/town.js','data/workday_events.js',
 'src/core/theme.js','src/core/rig.js','src/core/scenery.js','src/core/townart.js','src/core/town.js','src/core/shift.js','src/core/scorelog.js','src/core/workday.js',
 'src/core/firstperson.js','src/core/fpmission.js','src/core/fproute.js','src/core/fplater.js','src/core/fpday.js','src/core/fpdoors.js','src/core/fpstops.js','src/core/fpstopflow.js','src/core/fpstopscene.js',
 'src/core/world3d.js','src/core/fpbranding.js','src/core/fptown.js','src/core/fpworld.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),c);
const O=c.OTR,F=O.fpStopFlow;O.save={data:{townSeed:1}};
function world(kind,high=false){
 O.gfx={high:()=>high};let m,id;
 for(let seed=1;seed<=100;seed++){
  m=O.fpMission.create('campaign',seed,F.prepare(O.fpRoute.plan(3,seed)));O.fpDay.configure(m);O.fpDoors.configure(m);F.configure(m);
  id=m._deliverySpecs.findIndex(a=>kind==='gated'?a.gated:a.protocol&&a.protocol.kind===kind);if(id>=0)break;
 }
 assert.ok(id>=0);const s=m.stops[id],point=F.point(m,id),p=m.parcels[id];Object.assign(m.van,s.park,{hand:true,speed:0});
 m.phase='route';m.departed=true;m.mode='walk';m.activeStop=id;Object.assign(m.player,{x:point.x-s.side*1.2,z:point.z,yaw:s.side*Math.PI/2,pitch:0});
 Object.assign(p,{location:'held',loaded:true,scanned:true,stopScanned:true});m.heldId=p.id;
 const camera=new THREE.PerspectiveCamera(68,16/9,.08,180),root=new THREE.Scene();root.add(camera);const scene={view:{world:root,camera,mirror:{camera:new THREE.PerspectiveCamera(),on:false}}};
 const art=O.fpWorld.build(scene,m);art.sync(m,null,'route');return {m,id,art,scene,p};
}
test('delivery controls share the existing palette batches and retain exact invisible raycast proxies',()=>{
 for(const high of [false,true]){
  const w=world('intercom',high),part=w.art.deliveryArt.parts.find(p=>p.id===w.id);
  assert.equal(part.button.proxy.layers.isEnabled(0),false);assert.equal(part.button.proxy.layers.isEnabled(1),true);
  assert.ok(part.button.entry.matrix.equals(part.button.proxy.matrix));
  w.scene.view.camera.lookAt(part.button.proxy.getWorldPosition(new THREE.Vector3()));w.scene.view.world.updateMatrixWorld(true);assert.equal(w.art.pick(),'visit'+w.id);
  w.art.dispose();
 }
});
test('the physical gate disappears from pixels and rays only after the valid buzz and unlock',()=>{
 const w=world('gated'),a=w.m._deliverySpecs[w.id].protocol,gate=w.art.deliveryArt.parts.find(p=>p.id===w.id).gate;
 assert.equal(gate.entry.visible,true);F.act(w.m,w.id,'intercom.open');w.art.sync(w.m,null,'route');assert.equal(gate.entry.visible,true);
 F.act(w.m,w.id,'intercom.call',{button:a.button,purpose:'delivery'});w.m.elapsed+=2;F.act(w.m,w.id,'intercom.open');w.art.sync(w.m,null,'route');
 assert.equal(gate.entry.visible,false);assert.equal(gate.proxy.visible,false);assert.equal(w.m._deliverySolids[w.id].x,1e6);w.art.dispose();
});
test('an open locker displays the deposited parcel and its true barcode instead of a second carried parcel',()=>{
 for(const high of [false,true]){
  const w=world('locker',high),a=w.m._deliverySpecs[w.id].protocol;w.m.contact(w.id);F.act(w.m,w.id,'locker.open',a.compartment);F.act(w.m,w.id,'locker.scan',w.p.id);F.act(w.m,w.id,'locker.deposit');w.art.sync(w.m,null,'route');
  assert.equal(w.art.carried.visible,false);assert.equal(w.art.parcels[w.id].visible,true);
  assert.deepEqual(w.art.parcels[w.id].position.toArray(),Object.values(F.parcelPoint(w.m,w.p)));
  const barcode=w.art.parcels[w.id].userData.barcode.getWorldPosition(new THREE.Vector3());w.scene.view.camera.lookAt(barcode);w.scene.view.world.updateMatrixWorld(true);assert.equal(w.art.scanTarget(),w.p.id);
  const raw=w.m.snapshot(),r=O.fpMission.restore(raw);assert.ok(r);assert.equal(r.solids.length,w.m.solids.length);assert.equal(F.inLocker(r,r.parcel(r.heldId)),true);
  w.art.dispose();
 }
});
test('closing the locker occludes the barcode and opening it invalidates the photo and moves the hinge and solid together',()=>{
 const w=world('locker'),a=w.m._deliverySpecs[w.id].protocol,door=w.art.deliveryArt.parts.find(p=>p.id===w.id).door;
 const bounds=()=>{const vertices=door.proxy.geometry.attributes.position;for(let i=0;i<vertices.count;i++){
  const corner=new THREE.Vector3().fromBufferAttribute(vertices,i).applyMatrix4(door.entry.matrix);
  assert.ok(corner.distanceTo(door.entry.sphere.center)<=door.entry.sphere.radius+1e-6,'the whole hinged door must remain inside its culling sphere');
 }};
 w.m.contact(w.id);F.act(w.m,w.id,'locker.open',a.compartment);F.act(w.m,w.id,'locker.scan',w.p.id);F.act(w.m,w.id,'locker.deposit');F.act(w.m,w.id,'locker.close');F.act(w.m,w.id,'locker.photo');w.art.sync(w.m,null,'route');
 bounds();
 w.scene.view.camera.lookAt(w.art.parcels[w.id].userData.barcode.getWorldPosition(new THREE.Vector3()));w.scene.view.world.updateMatrixWorld(true);assert.equal(w.art.scanTarget(),null);
 F.act(w.m,w.id,'locker.open',a.compartment);w.art.sync(w.m,null,'route');assert.equal(w.m.deliveryStops.stops[w.id].protocol.photo,false);
 bounds();
 const physical=w.m._deliveryFurniture[w.id].door;assert.equal(door.proxy.position.x,physical.x);assert.equal(door.proxy.position.z,physical.z);assert.ok(door.entry.matrix.equals(door.proxy.matrix));w.art.dispose();
});
test('a deposited parcel must be retrieved before it can return to cargo or become a retained exception',()=>{
 const w=world('locker'),a=w.m._deliverySpecs[w.id].protocol;w.m.contact(w.id);F.act(w.m,w.id,'locker.open',a.compartment);F.act(w.m,w.id,'locker.scan',w.p.id);F.act(w.m,w.id,'locker.deposit');
 assert.match(w.m.deliver(w.id,'exception'),/retrieve/);assert.match(w.m.place('slot'+w.id),/Retrieve/);assert.match(w.m.putBack(),/Retrieve/);assert.match(w.m.returnParcel(),/Retrieve/);
 F.act(w.m,w.id,'locker.retrieve');w.art.sync(w.m,null,'route');assert.equal(F.inLocker(w.m,w.p),false);assert.equal(w.art.carried.visible,true);assert.equal(w.art.parcels[w.id].visible,false);
 const bad=w.m.snapshot();bad.deliveryStops.stops[w.id].protocol.deposited=true;bad.parcels[w.id].location='slot'+w.id;bad.heldId=null;assert.equal(O.fpMission.restore(bad),null);w.art.dispose();
});
test('mirror compaction restores the exact main-view palette matrices after a locker hinge changes',()=>{
 const w=world('locker'),a=w.m._deliverySpecs[w.id].protocol;F.act(w.m,w.id,'locker.open',a.compartment);w.art.sync(w.m,null,'route');
 const batches=w.art.route.children.filter(o=>o.isInstancedMesh).map(o=>({o,count:o.count,visible:o.visible,matrix:Array.from(o.instanceMatrix.array)}));
 w.scene.view.mirror.before();w.scene.view.mirror.after();
 for(const b of batches){assert.equal(b.o.count,b.count);assert.equal(b.o.visible,b.visible);assert.deepEqual(Array.from(b.o.instanceMatrix.array),b.matrix);}w.art.dispose();
});
