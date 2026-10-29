/* Markings must match actual graded bays, remain bounded and release only owned materials. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),THREE=require('../lib/three.min.js');
const c={THREE,Phaser:{Scene:class{}}};c.window=c;vm.createContext(c);
for(const f of ['data/theme.js','data/config.js','data/m1_driving.js','data/town.js','src/core/theme.js','src/core/rig.js','src/core/scenery.js','src/core/townart.js','src/core/town.js','src/core/firstperson.js','src/core/fpmission.js','src/core/fproute.js','src/core/fptraffic.js','src/core/fpnav.js','src/core/fplessonbays.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),c);
const O=c.OTR;O.registerScene=()=>{};for(const f of ['src/scenes/shift/TownDriveScene.js','src/scenes/m1/DrivingScene.js','src/core/fpdrivinglesson.js','src/core/fpschoollesson.js','src/core/fpjunctionlesson.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),c);
test('one fixed marking follows all six original driving bays and hides after the last checkpoint',()=>{
 const m=O.fpDrivingLesson.model({content:c.OTR_DATA.driving}),root=new THREE.Group(),cube=new THREE.BoxGeometry(),art=O.fpLessonBays.build(root,cube,m),matrix=new THREE.Matrix4(),pos=new THREE.Vector3(),rot=new THREE.Quaternion(),scale=new THREE.Vector3();
 assert.equal(root.children.length,1);assert.equal(art.mesh.count,4);assert.equal(art.mesh.geometry,cube);assert.equal(art.mesh.material.map,null);assert.equal(cube.index.count/3*art.mesh.count,48);
 for(let i=0;i<6;i++){m.drivingLesson.checkpoint=i;art.sync(m);const stop=m.stops[i];assert.equal(art.stop,stop);
  for(let j=0;j<4;j++){art.mesh.getMatrixAt(j,matrix);matrix.decompose(pos,rot,scale);assert.ok(Math.abs(pos.y-.065)<1e-6);assert.ok(Math.abs(pos.x-stop.park.x)<=1.30001);assert.ok(pos.z>=stop.bay.z0-1e-5&&pos.z<=stop.bay.z1+1e-5);if(j<2)assert.ok(Math.abs(scale.z-(stop.bay.z1-stop.bay.z0))<1e-5);else assert.ok(Math.abs(pos.z-(j===2?stop.bay.z0:stop.bay.z1))<1e-5);}
  const updates=art.updates;for(let j=0;j<100;j++)art.sync(m);assert.equal(art.updates,updates);
 }
 m.drivingLesson.checkpoint=6;art.sync(m);assert.equal(art.mesh.visible,false);assert.equal(art.updates,6);
});
test('the optional school finish uses its real bay, with no floating text or new texture',()=>{
 const m=O.fpSchoolLesson.model(),root=new THREE.Group(),cube=new THREE.BoxGeometry(),art=O.fpLessonBays.build(root,cube,m);assert.equal(art.stop,m.stops[0]);assert.ok(m.stops[0].park.z<m.town.school.z0);assert.equal(root.children.length,1);assert.equal(art.mesh.material.map,null);
 let own=0,shared=0;art.mesh.material.addEventListener('dispose',()=>own++);cube.addEventListener('dispose',()=>shared++);art.dispose();assert.equal(own,1);assert.equal(shared,0);
});

test('the horizontal give-way finish marking matches all four edges of the graded bay',()=>{
 const run={junctionLesson:O.fpJunctionLesson.create()};run.junctionLesson.index=2;const m=O.fpJunctionLesson.model(run),b=m.stops[0].bay,root=new THREE.Group(),cube=new THREE.BoxGeometry(),art=O.fpLessonBays.build(root,cube,m),matrix=new THREE.Matrix4(),pos=new THREE.Vector3(),rot=new THREE.Quaternion(),scale=new THREE.Vector3();
 assert.equal(art.mesh.count,4);assert.equal(art.mesh.material.map,null);assert.equal(cube.index.count/3*art.mesh.count,48);
 for(let i=0;i<4;i++){art.mesh.getMatrixAt(i,matrix);matrix.decompose(pos,rot,scale);assert.ok(Math.abs(pos.y-.065)<1e-6);assert.ok(pos.x>=b.x0-1e-5&&pos.x<=b.x1+1e-5&&pos.z>=b.z0-1e-5&&pos.z<=b.z1+1e-5);if(i<2){assert.ok(Math.abs(scale.x-(b.x1-b.x0))<1e-5);assert.ok(Math.abs(pos.z-(i?b.z1:b.z0))<1e-5);}else{assert.ok(Math.abs(pos.x-(i===2?b.x0:b.x1))<1e-5);assert.ok(Math.abs(scale.z-2.6)<1e-5);}}
 const updates=art.updates;for(let n=0;n<100;n++)art.sync(m);assert.equal(art.updates,updates);assert.equal(root.children.length,1);
});
