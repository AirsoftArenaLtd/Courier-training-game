/* CPU geometry guard for every bay direction, using real local Low GLBs and the actual reflection culling. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),THREE=require('../lib/three.min.js'),{install,local}=require('./tools/fpassets-context');
const c={THREE};c.window=c;vm.createContext(c);
for(const f of ['data/theme.js','data/config.js','data/workday_events.js','data/m2_lifting.js','src/core/theme.js','src/core/scorelog.js','src/core/workday.js','src/core/firstperson.js','src/core/fpmission.js','src/core/fpcamera.js','src/core/fpcab.js','src/core/fpmirrors.js','src/core/fprear.js','src/core/fpdriving.js','src/core/fpsignal.js','src/core/fpday.js','src/core/fpdoors.js','src/core/world3d.js','src/core/fpbranding.js','src/core/fpactors.js','src/core/fpscenario.js','src/core/fppackagelift.js','src/core/fppackageliftbay.js','src/core/fppackageliftworld.js','src/core/fpworld.js','src/core/fppackageliftscenario.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),c);
const O=c.OTR,F=O.fpScenario,B=O.fpPackageLiftBay,scenario={id:'m2-lift',scene:'LiftingScene',scene3d:'package-lift-bay',categories:['safety','efficiency']},A=install(c);
O.gfx={high:()=>false};O.registry={get:()=>scenario,content:()=>c.OTR_DATA.lifting};O.academy={coaching:()=>true};
function cost(root,camera){
 camera.updateMatrixWorld(true);const f=new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));let calls=0,triangles=0;
 root.traverseVisible(o=>{if(!o.isMesh||!camera.layers.test(o.layers)||o.frustumCulled&&!f.intersectsObject(o))return;const n=o.isInstancedMesh?o.count:1;if(!n)return;const g=o.geometry,materials=Array.isArray(o.material)?o.material:null;if(materials){for(const group of g.groups)if(materials[group.materialIndex]?.visible!==false){calls++;triangles+=group.count/3*n;}}else if(o.material.visible!==false){calls++;triangles+=(g.index?g.index.count:g.attributes.position.count)/3*n;}});return {calls,triangles};
}
function stage(s,index,phase){
 s.index=index-1;s.phase='verdict';s.result=null;B.next(s);if(!phase)return;B.choose(s,0);if(phase===1)return;
 if(s.bay.mode==='equipment'){s.pose.x=s.bay.sourceX+60;B.takeHandle(s);s.bay.transport=phase===2?.5:1;if(phase===3){s.bay.mode='unload';B.unload(s);}}
 else{if(s.bay.mode==='waiting-helper')B.requestHelper(s);s.pose.x=640;s.pose.squat=s.lift.high?0:1;B.project(s);B.grip(s);if(phase===3){s.pose.elevate=0;s.pose.dir=-1;s.pose.x=294+s.lift.w/2;s.pose.squat=1;B.project(s);B.grip(s);}}
 B.project(s);
}
test('all Low bay poses stay under the original geometry limits with real models and fallback',async()=>{
 const bank=await A.preload({high:false,fetch:local}),reports=[];
 try{for(const loaded of [true,false]){
  const r=F.create(scenario.id),m=F.model(r),world=new THREE.Scene(),camera=new THREE.PerspectiveCamera(68,16/9,.08,180);world.add(camera);
  const scene={assetBank:loaded?bank:null,view:{world,camera,mirror:{camera:new THREE.PerspectiveCamera(),on:false}}},art=O.fpWorld.build(scene,m),peak={calls:0,triangles:0};let poses=0;
  try{assert.equal(!!art.packageLift.worker,loaded);for(let index=0;index<5;index++)for(let phase=0;phase<4;phase++){
   stage(m.packageLift,index,phase);Object.assign(m.player,{x:m.packageLift.bay.body.x,z:m.packageLift.bay.body.z});
   for(let yaw=0;yaw<24;yaw++)for(const pitch of [-.9,-.45,0,.45,.9]){
    m.player.yaw=yaw*Math.PI/12;m.player.pitch=pitch;art.sync(m,null,'route');const main=cost(world,camera);let reflected={calls:0,triangles:0};
    for(let i=0;i<3;i++){scene.view.mirror.before(i);const view=cost(world,scene.view.mirror.camera);scene.view.mirror.after();reflected.calls=Math.max(reflected.calls,view.calls);reflected.triangles=Math.max(reflected.triangles,view.triangles);}
    const calls=main.calls+reflected.calls,triangles=main.triangles+reflected.triangles;peak.calls=Math.max(peak.calls,calls);peak.triangles=Math.max(peak.triangles,triangles);poses++;
    assert.ok(calls<=64&&triangles<=2500,JSON.stringify({loaded,index,phase,yaw,pitch,calls,triangles}));
   }
  }}finally{art.dispose();}reports.push({loaded,poses,peak});
 }}finally{bank.dispose();}
 const out=path.join(__dirname,'out/fp-review');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'c40-lift-geometry-current.json'),JSON.stringify({scope:'CPU Low geometry only: twenty load/stage poses, twenty-four yaw angles and five pitches, main plus the most costly actual mirror pass. Not GPU memory, startup, High or Intel FPS acceptance.',reports},null,2)+'\n');console.log(JSON.stringify(reports));
});
