/* Damage placement against the shipped van meshes, including their unsprung wheels. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),THREE=require('../lib/three.min.js'),{install,local}=require('./tools/fpassets-context');
const c={THREE,URLSearchParams};c.window=c;c.location={search:''};vm.createContext(c);
for(const f of ['data/theme.js','data/config.js','data/m3_doorsteps.js','data/m8_stops.js','data/town.js',
 'src/core/theme.js','src/core/rig.js','src/core/scenery.js','src/core/townart.js','src/core/town.js','src/core/shift.js',
 'src/core/firstperson.js','src/core/fpmission.js','src/core/fproute.js','src/core/fplater.js','src/core/fpday.js','src/core/fpdoors.js','src/core/fpdriving.js','src/core/fpcamera.js',
 'src/core/fpbranding.js','src/core/fpcab.js','src/core/fpmirrors.js','src/core/fprear.js','src/core/fplighting.js','src/core/fpweather.js','src/core/fptown.js','src/core/fpactors.js',
 'src/core/fpsigns.js','src/core/fpnav.js','src/core/fpdamage.js','src/core/fpdamageflow.js','src/core/fpdamageworld.js','src/core/fpworld.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),c);
const O=c.OTR,A=install(c),banks={};O.save={data:{townSeed:1}};
test.before(async()=>{for(const high of [false,true])banks[high]=await A.preload({high,fetch:local});});
test.after(()=>Object.values(banks).forEach(b=>b.dispose()));
function make(high,loaded=true){
 O.gfx={high:()=>high};const plan=O.fpDamageFlow.prepare(O.fpNav.prepare(O.fpSigns.prepare(O.fpLater.prepare(O.fpRoute.plan(4,7))))),m=O.fpMission.create('campaign',7,plan);
 O.fpDay.configure(m);O.fpDoors.configure(m);O.fpDriving.configure(m);
 const world=new THREE.Scene(),camera=new THREE.PerspectiveCamera(68,16/9,.08,180);world.add(camera);
 const scene={assetBank:loaded?banks[high]:null,view:{world,camera,mirror:{camera:new THREE.PerspectiveCamera(),on:false}}},art=O.fpWorld.build(scene,m);
 O.fpDamage.contact(m.damage,'wheel','solid',3);return {m,art};
}
test('wheel damage sits on the actual imported rear tire in both quality presets',()=>{
 for(const high of [false,true]){
  const {m,art}=make(high),wheel=art.actors.vehicle.parts.find(p=>p.name==='wheel-back-left'),b=wheel.g.boundingBox,p=b.getCenter(new THREE.Vector3());
  p.x=b.min.x-.008;art.sync(m,null,'route');p.applyMatrix4(art.van.matrixWorld);
  const actual=new THREE.Vector3().setFromMatrixPosition(art.damage.entries[5].matrix);
  assert.ok(actual.distanceTo(p)<1e-7,JSON.stringify({high,actual:actual.toArray(),tire:p.toArray()}));art.dispose();
 }
});
test('wheel damage follows the wheel rather than the sprung body during pitch and roll',()=>{
 for(const loaded of [false,true]){
  const {m,art}=make(false,loaded);art.sync(m,null,'route');const before=art.damage.entries[5].matrix.clone();
  art.chassis.position.y=.12;art.chassis.rotation.set(.08,0,.1);art.damage.sync(m);
  assert.ok(art.damage.entries[5].matrix.equals(before));art.dispose();
 }
});
test('a missing van model keeps wheel damage on the procedural tire face',()=>{
 const {m,art}=make(false,false);art.sync(m,null,'route');
 const p=new THREE.Vector3(-1.208,.42,1.7).applyMatrix4(art.van.matrixWorld),actual=new THREE.Vector3().setFromMatrixPosition(art.damage.entries[5].matrix);
 assert.ok(actual.distanceTo(p)<1e-7);art.dispose();
});
test('rear damage stays on the imported cargo door while it opens',()=>{
 for(const high of [false,true]){
  const {m,art}=make(high),door=art.actors.vehicle.parts.find(p=>p.name==='door');
  O.fpDamage.release(m.damage);O.fpDamage.contact(m.damage,'rear','solid',3);art.sync(m,null,'route');
  const entry=art.damage.entries[1];assert.ok(Math.abs(entry.local.elements[14]-door.g.boundingBox.max.z-.008)<1e-7);
  m.cargoOpen=true;m.elapsed+=.1;art.sync(m,null,'route');
  const expected=art.chassis.matrixWorld.clone().multiply(new THREE.Matrix4().makeTranslation(0,3.02,2.4))
   .multiply(new THREE.Matrix4().makeRotationX(art.actors.opening()*Math.PI/2))
   .multiply(new THREE.Matrix4().makeTranslation(0,-3.02,-2.4)).multiply(entry.local);
  assert.ok(entry.matrix.equals(expected));assert.ok(entry.visible);art.dispose();
 }
});
test('the procedural rear patch disappears with its removed cargo door and returns when closed',()=>{
 const {m,art}=make(false,false);O.fpDamage.release(m.damage);O.fpDamage.contact(m.damage,'rear','solid',3);
 m.cargoOpen=true;art.sync(m,null,'route');assert.equal(art.damage.entries[1].visible,false);
 m.cargoOpen=false;art.sync(m,null,'route');assert.equal(art.damage.entries[1].visible,true);art.dispose();
});
