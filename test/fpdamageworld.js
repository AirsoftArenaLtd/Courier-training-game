/* Located geometry, real mission state and mirror-buffer restoration without WebGL. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),THREE=require('../lib/three.min.js');
const c={THREE,URLSearchParams};c.window=c;c.location={search:''};vm.createContext(c);
for(const file of ['data/theme.js','data/config.js','data/town.js','data/m3_doorsteps.js','data/m8_stops.js',
 'src/core/theme.js','src/core/rig.js','src/core/scenery.js','src/core/townart.js','src/core/town.js','src/core/shift.js','src/core/firstperson.js',
 'src/core/fpmission.js','src/core/fproute.js','src/core/fplater.js','src/core/fpday.js','src/core/fpdoors.js','src/core/fpdriving.js','src/core/fpcamera.js',
 'src/core/fpbranding.js','src/core/fpcab.js','src/core/fpmirrors.js','src/core/fprear.js','src/core/fplighting.js','src/core/fpweather.js',
 'src/core/fpsigns.js','src/core/fpnav.js','src/core/fpdamage.js','src/core/fpdamageflow.js','src/core/fpdamageworld.js','src/core/fpworld.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+file,'utf8'),c);
const O=c.OTR,D=O.fpDamage;
O.save={data:{townSeed:1}};
function make(high=false,day=4,marked=true,seed=7){
 O.gfx={high:()=>high};let plan=O.fpNav.prepare(O.fpSigns.prepare(O.fpLater.prepare(O.fpRoute.plan(day,seed))));if(marked)plan=O.fpDamageFlow.prepare(plan);
 const m=O.fpMission.create('campaign',seed,plan);O.fpDay.configure(m);O.fpDoors.configure(m);O.fpDriving.configure(m);
 const world=new THREE.Scene(),camera=new THREE.PerspectiveCamera(68,16/9,.08,180);world.add(camera);
 const scene={view:{world,camera,mirror:{camera:new THREE.PerspectiveCamera(55,16/9,.08,100),on:false}}},art=O.fpWorld.build(scene,m);
 return {m,world,camera,scene,art};
}
test('one bounded batch presents all seven damaged zones and both clearance structures on Low and High',()=>{
 for(const high of [false,true]){const {m,art}=make(high);for(const zone of D.zones)D.contact(m.damage,zone,'solid',8);art.sync(m,null,'route');
  assert.equal(art.damage.entries.length,15);assert.equal(art.damage.mesh.geometry.attributes.position.count,9);assert.equal(art.damage.mesh.material.map,null);
  assert.equal(art.damage.entries.filter(e=>e.damageVan&&e.visible).length,7);assert.equal(art.labels.filter(l=>l.clearance).length,4);
  assert.ok(art.damage.entries.every(e=>e.sphere.radius>0&&e.matrix.elements.every(Number.isFinite)));art.dispose();
 }
});
test('unmarked and gentle first days allocate no damage batch or clearance labels',()=>{
 for(const [day,marked] of [[1,true],[2,true],[3,true],[4,false]]){const {m,art}=make(false,day,marked);art.sync(m,null,'route');assert.equal(art.damage,null);assert.equal(art.labels.some(l=>l.clearance),false);art.dispose();}
});
test('located wear follows the real van rotation and chassis pose, while starting wear stays separate',()=>{
 const {m,art}=make();D.contact(m.damage,'front','solid',3);m.van.yaw=Math.PI/2;art.sync(m,null,'route');
 const e=art.damage.entries[0],p=new THREE.Vector3().setFromMatrixPosition(e.matrix),expected=new THREE.Vector3(0,1,-2.81).applyMatrix4(art.chassis.matrixWorld);
 assert.ok(p.distanceTo(expected)<1e-8);assert.equal(e.shape,2);assert.equal(m.damage.baseline[0],0);assert.equal(m.damage.added[0],2);art.dispose();
});
test('mirror wear follows the physical housing behind its reflective glass',()=>{
 for(const high of [false,true]){
  const {m,art}=make(high),spec=O.fpMirrors.specs[0],entry=art.damage.entries[6];
  const position=new THREE.Vector3().setFromMatrixPosition(entry.local),normal=new THREE.Vector3(Math.sin(spec.angle),0,Math.cos(spec.angle));
  const offset=position.clone().sub(new THREE.Vector3(spec.x,spec.y,spec.z));
  assert.ok(Math.abs(offset.dot(normal)+.05)<1e-8);assert.ok(offset.clone().addScaledVector(normal,.05).length()<1e-8);
  assert.ok(new THREE.Vector3(0,0,1).transformDirection(entry.local).dot(normal)<-.999);
  D.contact(m.damage,'mirror','solid',3);m.van.yaw=.8;art.sync(m,null,'route');
  const world=position.clone().applyMatrix4(art.chassis.matrixWorld),actual=new THREE.Vector3().setFromMatrixPosition(entry.matrix);assert.ok(actual.distanceTo(world)<1e-8);assert.equal(entry.visible,true);assert.equal(art.damage.entries.length,15);
  art.dispose();
 }
});
test('a naturally worn starting van shows its existing dent before any player impact',()=>{
 const {m,art}=make(false,5,true,3);assert.equal(m.damage.baseline[1],2);assert.equal(m.damage.added.some(Boolean),false);
 Object.assign(m.player,O.fp.local(m.van,0,7),{yaw:0,pitch:0});
 art.sync(m,null,'route');assert.equal(art.damage.entries[1].visible,true);assert.equal(art.damage.entries[1].shape,2);
 assert.ok([...art.damage.signShapes.array.slice(0,art.damage.mesh.count)].includes(2),'the existing dent is submitted in the main view');
 assert.equal(m.damage.serial,0);assert.equal(m.logs.some(e=>e.text&&e.text.includes('new damage')),false);art.dispose();
});
test('damage-off hides wear and leaves parcel presentation at its original shelf point',()=>{
 const {m,art}=make();D.contact(m.damage,'rear','solid',3);m.parcels[0].location='slot0';m.cargoOpen=true;
 D.shift(m.damage,0,{secured:false,count:5,lateral:8,braking:8});D.setEnabled(m.damage,false);art.sync(m,null,'route');
 assert.equal(art.damage.entries.some(e=>e.damageVan&&e.visible),false);const p=m.point(m.parcels[0].id);assert.equal(art.parcels[0].position.x,p.x);assert.equal(art.parcels[0].position.z,p.z);art.dispose();
});
test('cargo movement changes only the visual transform and stays bounded in the van',()=>{
 const {m,art}=make();m.parcels[0].location='slot0';m.cargoOpen=true;const before=JSON.stringify(m.parcels[0]);
 D.shift(m.damage,0,{secured:false,count:5,lateral:8,braking:8});art.sync(m,null,'route');const p=m.point(m.parcels[0].id),v=art.parcels[0].position;
 assert.ok(Math.hypot(v.x-p.x,v.z-p.z)>.1&&Math.hypot(v.x-p.x,v.z-p.z)<.15);assert.equal(JSON.stringify(m.parcels[0]),before);art.dispose();
});
test('all reflection passes restore the main damage matrices, colours, shapes and visibility exactly',()=>{
 const {m,art,scene}=make();for(const zone of D.zones)D.contact(m.damage,zone,'solid',8);m.mode='cab';art.sync(m,null,'route');
 const b=art.damage,read=()=>JSON.stringify({count:b.mesh.count,visible:b.mesh.visible,matrix:[...b.mesh.instanceMatrix.array],colour:[...b.mesh.instanceColor.array],shapes:[...b.signShapes.array]}),before=read();
 for(let index=0;index<4;index++){scene.view.mirror.before(index);scene.view.mirror.after();assert.equal(read(),before);}art.dispose();
});
test('the single palette shader bends dent vertices and keeps clearance rectangles intact',()=>{
 const {art}=make(),shader={vertexShader:'#include <begin_vertex>'};art.damage.mesh.material.onBeforeCompile(shader);
 assert.match(shader.vertexShader,/damageShape < 0.5 \? damageQuad : position/);assert.match(shader.vertexShader,/transformed.z -=/);assert.equal(art.damage.mesh.material.side,THREE.DoubleSide);art.dispose();
});
test('a clearance caption faces its own approach, so the opposite warning is hidden',()=>{
 const {m,art,camera}=make(),b=m._damageClearances[0],labels=art.labels.filter(l=>l.clearance===b.id);
 art.route.visible=true;camera.position.set(b.x,2.05,b.z+18);camera.lookAt(b.x,b.h+1.1,b.z);camera.updateMatrixWorld(true);art.route.updateMatrixWorld(true);
 assert.ok(art.labelPosition(labels[1]));assert.equal(art.labelPosition(labels[0]),null);art.dispose();
});
