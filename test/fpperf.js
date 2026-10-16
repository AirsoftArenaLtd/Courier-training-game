/* Rendering batches keep physical occlusion and update their static buffers only when needed. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),THREE=require('../lib/three.min.js');
const c={THREE};c.window=c;vm.createContext(c);
for(const file of ['data/theme.js','data/config.js','data/m3_doorsteps.js','data/m8_stops.js','data/town.js','data/workday_events.js',
 'src/core/theme.js','src/core/rig.js','src/core/scenery.js','src/core/townart.js','src/core/town.js','src/core/shift.js','src/core/scorelog.js','src/core/workday.js',
 'src/core/firstperson.js','src/core/fpmission.js','src/core/fproute.js','src/core/fpdriving.js','src/core/fploadout.js','src/core/fpday.js','src/core/fpdoors.js','src/core/world3d.js','src/core/fpbranding.js','src/core/fpworld.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+file,'utf8'),c);
c.OTR.save={data:{townSeed:1}};
c.OTR.gfx={high:()=>false};
function build(){const m=c.OTR.fpMission.create('campaign',1,c.OTR.fpRoute.plan(4,1));c.OTR.fpDoors.configure(m);const world=new THREE.Scene(),camera=new THREE.PerspectiveCamera(68,16/9,.08,180);world.add(camera);const s={view:{world,camera,mirror:{camera:new THREE.PerspectiveCamera(),on:false}}},a=c.OTR.fpWorld.build(s,m);return {m,s,a};}
test('render batching preserves exact solid occlusion and nearby target rays',()=>{
 const {m,s,a}=build(),proxy=a.occluders.find(o=>o.layers.mask===2&&o.parent===a.route&&o.scale.z<.5);assert.ok(proxy);assert.equal(s.view.camera.layers.test(proxy.layers),false);assert.equal(a.ray.layers.test(proxy.layers),true);
 const p=proxy.getWorldPosition(new THREE.Vector3()),target=a.interactions.find(o=>o.userData.interaction==='door0'),original=target.position.clone();target.position.copy(p).add(new THREE.Vector3(0,0,-.7));target.updateMatrix();s.view.camera.position.copy(p).add(new THREE.Vector3(0,0,2));s.view.camera.lookAt(p);s.view.world.updateMatrixWorld(true);assert.equal(a.pick(),null,'solid wall still blocks interaction');proxy.visible=false;assert.equal(a.pick(),'door0','the target behind that wall is in range');proxy.visible=true;target.position.copy(original);target.updateMatrix();
 for(const stop of m.stops){Object.assign(m.player,{x:stop.x-stop.side*1.5,z:stop.z});a.sync(m,null,'route');const door=a.interactions.find(o=>o.userData.interaction==='door'+stop.id);s.view.camera.lookAt(door.getWorldPosition(new THREE.Vector3()));s.view.world.updateMatrixWorld(true);assert.equal(a.pick(),'door'+stop.id);}a.dispose();
});
test('stable residents keep GPU instance buffers unchanged; outcomes update visibility',()=>{
 const {m,a}=build(),stop=m.stops.find(s=>m._doorSpecs[s.id].present);assert.ok(stop);stop.contacted=true;Object.assign(m.player,{x:stop.x,z:stop.z});a.sync(m,null,'route');
 const batch=a.route.children.find(o=>o.isInstancedMesh&&o.geometry.type==='BoxGeometry'&&o.count>0&&o.instanceMatrix.array.length===m.stops.length*4*16);assert.ok(batch);const v=batch.instanceMatrix.version,col=batch.instanceColor.version,count=batch.count;
 for(let i=0;i<100;i++)a.sync(m,null,'route');assert.equal(batch.instanceMatrix.version,v);assert.equal(batch.instanceColor.version,col);stop.resolved=true;a.sync(m,null,'route');assert.ok(batch.count<count);assert.ok(batch.instanceMatrix.version>v);a.dispose();
});
