/* Bounded physical bay geometry and lifetime; real imported worker rendering is covered by fpbench. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),THREE=require('../lib/three.min.js');const c={THREE};c.window=c;vm.createContext(c);
for(const f of ['data/theme.js','data/m2_lifting.js','src/core/theme.js','src/core/fppackagelift.js','src/core/fppackageliftbay.js','src/core/fppackageliftworld.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),c);
const B=c.OTR.fpPackageLiftBay,W=c.OTR.fpPackageLiftWorld,C=c.OTR_DATA.lifting;
test('one fixed bay serves every load with fixed instance buffers, targets and finite transforms',()=>{
 const root=new THREE.Scene(),interactions=[],occluders=[],a=W.build(root,{interactions,occluders}),s=B.create(C),matrix=[a.fixed.instanceMatrix.array,a.moving.instanceMatrix.array],colours=[a.fixed.instanceColor.array,a.moving.instanceColor.array],children=a.root.children.length;
 assert.equal(interactions.length,4);assert.equal(new Set(interactions.map(o=>o.userData.interaction)).size,4);
 let peak=0;for(let i=0;i<1000;i++){s.index=i%5-1;s.phase='verdict';B.next(s);B.choose(s,0);if(s.helper)B.requestHelper(s);s.pose.x=640;s.pose.squat=i%2;B.project(s);a.sync(s,i*.05,true,false);peak=Math.max(peak,(a.fixed.count+a.moving.count)*12);assert.equal(a.root.children.length,children);assert.equal(a.moving.instanceMatrix.array,matrix[1]);assert.equal(a.moving.instanceColor.array,colours[1]);for(const value of a.moving.instanceMatrix.array)assert.ok(Number.isFinite(value));}
 assert.ok(peak<800,'component-only ceiling, not the combined Low gate');assert.equal(a.fixed.instanceMatrix.array,matrix[0]);assert.equal(a.fixed.instanceColor.array,colours[0]);assert.equal(a.fixed.material.map,null);assert.equal(a.fixed.material.vertexColors,false);a.dispose();
});
test('the active load and gauge targets coincide with physical bay geometry and real rays',()=>{
 const root=new THREE.Scene(),interactions=[],occluders=[],a=W.build(root,{interactions,occluders}),s=B.create(C),ray=new THREE.Raycaster();ray.layers.enable(1);B.next(s);a.sync(s);
 for(const target of [a.parcel,a.assist,a.gauge]){const p=target.getWorldPosition(new THREE.Vector3()),eye=p.clone().add(new THREE.Vector3(0,0,1.3));ray.set(eye,p.clone().sub(eye).normalize());ray.far=2.65;assert.equal(ray.intersectObjects(occluders.filter(o=>o.visible),false)[0].object.userData.interaction,target.userData.interaction);}
 assert.equal(a.handle.visible,false);s.index=2;s.phase='verdict';B.next(s);B.choose(s,0);a.sync(s);assert.equal(a.handle.visible,true);assert.equal(a.parcel.position.z,B.loadZ);assert.ok(a.handle.position.x>a.parcel.position.x);a.dispose();
});
test('bay disposal releases owned buffers once and never disposes the shared cube',()=>{
 const cube=new THREE.BoxGeometry(),root=new THREE.Scene(),a=W.build(root,{cube});let g=0,m=0,instances=0;cube.addEventListener('dispose',()=>g++);a.fixed.material.addEventListener('dispose',()=>m++);a.fixed.addEventListener('dispose',()=>instances++);a.moving.addEventListener('dispose',()=>instances++);a.dispose();a.dispose();assert.equal(root.children.length,0);assert.equal(g,0);assert.equal(m,1);assert.equal(instances,2);cube.dispose();assert.equal(g,1);
});

test('the physical spine needle clears stale readings outside a reachable posture',()=>{
 const root=new THREE.Scene(),a=W.build(root),s=B.create(C);B.next(s);s.measure.load=.95;s.measure.reachable=true;
 const needle=()=>a.batches[1].entries.find(e=>Math.abs(e.sphere.center.z-15.49)<.001).sphere.center.x;
 a.sync(s);assert.equal(needle(),-10.3,'assessment must not display the preceding load');
 B.choose(s,0);s.measure.load=.95;s.measure.reachable=true;a.sync(s);assert.ok(Math.abs(needle()-(-10.3+.95*.6))<1e-10);
 s.measure.reachable=false;a.sync(s);assert.equal(needle(),-10.3,'an out-of-reach load has no active spine reading');
 a.dispose();
});
