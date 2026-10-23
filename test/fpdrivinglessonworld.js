/* Physical controller/render correspondence and bounded, texture-free cue geometry. Browser acceptance follows wiring. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),THREE=require('../lib/three.min.js');
const c={THREE,Phaser:{Scene:class{}}};c.window=c;vm.createContext(c);
for(const f of ['data/theme.js','data/config.js','data/m1_driving.js','data/town.js','data/workday_events.js','src/core/theme.js','src/core/rig.js','src/core/scenery.js','src/core/townart.js','src/core/town.js','src/core/scoring.js','src/core/scorelog.js','src/core/firstperson.js','src/core/fpmission.js','src/core/fpcamera.js','src/core/fproute.js','src/core/world3d.js','src/core/fpbranding.js','src/core/fpcab.js','src/core/fpmirrors.js','src/core/fprear.js','src/core/fptown.js','src/core/fpsignlettering.js','src/core/fpactors.js','src/core/fphazardlessonworld.js','src/core/fplessonbays.js','src/core/fpworld.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),c);
const O=c.OTR;O.registerScene=()=>{};for(const f of ['src/scenes/shift/TownDriveScene.js','src/scenes/m1/DrivingScene.js','src/core/fpdrivinglesson.js','src/core/fpdrivinglessonhazards.js','src/core/fpdrivinglessonworld.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),c);
const D=O.fpDrivingLesson,H=O.fpDrivingLessonHazards,C=c.OTR_DATA.driving;
function setup(high){
 O.gfx={high:()=>high};const m=D.model({content:C}),r={model:m,log:new O.ScoreLog()},world=new THREE.Scene(),camera=new THREE.PerspectiveCamera(76,16/9,.08,180);world.add(camera);H.attach(r);m.paused=false;
 const scene={view:{world,camera,mirror:{camera:new THREE.PerspectiveCamera(),on:false}}},art=O.fpWorld.build(scene,m);scene.art=art;const cues=art.drivingLessonArt;assert.ok(cues,'the world owns the single driving hazard pool');return {m,r,world,camera,scene,art,cues};
}
function pose(ctx,index,age){const {m,r,art,cues}=ctx,s=m.drivingLesson;H.hide(m);s.armed={};s.checkpoint=index;m.activeStop=index;const stop=m.stops[index];Object.assign(m.van,{x:stop.bay.streetX+stop.side*m.town.road/4,yaw:stop.park.yaw,speed:3,hand:false});for(let n=8;n<100;n+=.25){m.van.z=stop.park.z+stop.side*n;if(H.arm(r))break;}assert.equal(s.hazard.active,true);s.hazard.t=age;H.advance(r,{},.01);art.sync(m,null,'route');cues.sync(m,false);ctx.world.updateMatrixWorld(true);return s.hazard;}
test('all six cues use the controller positions, real bus length and a reused fixed geometry pool',()=>{
 for(const high of [false,true]){const ctx=setup(high),{m,art,cues,world}=ctx,count=world.children.length;
  for(let i=0;i<6;i++){const h=pose(ctx,i,2);assert.equal(world.children.length,count);assert.equal(cues.root.visible,true);if(h.kind==='ball'||h.kind==='crosswalk'){assert.equal(cues.pool.person.position.x,h.personX);assert.equal(cues.pool.person.position.z,h.personZ);assert.equal(cues.pool.person.visible,h.personVisible);}if(h.kind==='door')assert.equal(cues.pool.car.position.x,h.carX);if(h.kind==='water'){assert.equal(cues.water.position.z,h.z);assert.equal(cues.water.visible,true);}if(h.kind==='bus'){assert.equal(cues.bus.position.x,h.busBox.x);assert.equal(cues.bus.position.z,h.busBox.z);assert.equal(h.busBox.d,12);assert.ok(cues.ink.count>100);assert.equal(cues.arm.visible,h.armOut);}}
  assert.equal(art.lessonBayArt.stop,m.stops[5]);assert.equal(art.lessonBayArt.mesh.count,4);assert.equal(art.lessonBayArt.mesh.visible,true);H.hide(m);cues.sync(m,true);assert.equal(cues.root.visible,false);assert.equal(art.townArt.triangleLimit,high?Infinity:290);art.dispose();assert.equal(world.children.length,1);
 }
});
test('reduced motion keeps water still while physical bus arm, lights and lettered warning stay apparent',()=>{
 const ctx=setup(false);pose(ctx,3,2);ctx.cues.sync(ctx.m,true);assert.equal(ctx.cues.water.material.uniforms.time.value,0);pose(ctx,5,1);ctx.cues.sync(ctx.m,true);assert.equal(ctx.cues.arm.visible,true);assert.equal(ctx.cues.lamps.visible,true);assert.equal(ctx.cues.ink.visible,true);ctx.art.dispose();
});
test('the bus has valid shader colour inputs and keeps its yellow per-instance body paint',()=>{
 for(const high of [false,true]){
  const ctx=setup(high);pose(ctx,5,1);const meshes=ctx.cues.bus.children.filter(o=>o.isInstancedMesh&&o.instanceColor),colour=new THREE.Color();assert.equal(meshes.length,2);
  for(const mesh of meshes){assert.ok(!mesh.material.vertexColors||mesh.geometry.getAttribute('color'),'vertex colours require an actual geometry attribute; an absent input makes the bus black');assert.equal(mesh.instanceColor.count,mesh.count);}
  meshes[0].getColorAt(0,colour);assert.equal(colour.getHex(),0xE6B94F);assert.equal(meshes[0].material.color.getHex(),0xffffff);ctx.art.dispose();
 }
});
