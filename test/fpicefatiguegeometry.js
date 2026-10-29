/* Low whole-world geometry, including real mirror culling and shipped GLBs; excludes GPU/native/FPS acceptance. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{c,O,THREE,fixture}=require('./tools/fp-ice-fatigue-context')(),{install,local}=require('./tools/fpassets-context'),assets=install(c);
function cost(root,camera){
 camera.updateMatrixWorld(true);const frustum=new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));let calls=0,triangles=0;
 root.traverseVisible(o=>{if(!o.isMesh||!camera.layers.test(o.layers)||o.frustumCulled&&!frustum.intersectsObject(o))return;const n=o.isInstancedMesh?o.count:1;if(!n)return;const g=o.geometry,a=Array.isArray(o.material)?o.material:null;if(a){for(const group of g.groups)if(a[group.materialIndex]?.visible!==false){calls++;triangles+=group.count/3*n;}}else if(o.material.visible!==false){calls++;triangles+=(g.index?g.index.count:g.attributes.position.count)/3*n;}});return {calls,triangles};
}
test('ice/grit/rail and the rest bay stay inside the unchanged Low geometry ceilings with loaded and missing assets',async()=>{
 const bank=await assets.preload({high:false,fetch:local}),reports=[];
 try{for(const loaded of [true,false]){const peak={calls:0,triangles:0};let poses=0;
  for(const kind of ['ice','fatigue']){const scene=fixture(kind,{world:true,bank:loaded?bank:null}),m=scene.model,a=m.iceFatigue;try{
   const measure=()=>{scene.sync();const main=cost(scene.view.world,scene.view.camera),mirror={calls:0,triangles:0};for(let n=0;n<(scene.view.mirror.rearOn?4:3);n++){scene.view.mirror.before(n);const p=cost(scene.view.world,scene.view.mirror.camera);scene.view.mirror.after();mirror.calls=Math.max(mirror.calls,p.calls);mirror.triangles=Math.max(mirror.triangles,p.triangles);}const calls=main.calls+mirror.calls,triangles=main.triangles+mirror.triangles;peak.calls=Math.max(peak.calls,calls);peak.triangles=Math.max(peak.triangles,triangles);poses++;assert.ok(calls<=64&&triangles<=2500,JSON.stringify({loaded,kind,mode:m.mode,calls,triangles}));};
   for(const where of [a.start,{x:a.park.x,z:a.park.z,yaw:a.start.yaw}]){Object.assign(m.van,where);m.mode='cab';for(const gear of [2,-1])for(const look of [-1.5,-.75,0,.75,1.5])for(const pitch of [-.7,0,.7]){m.van.gear=gear;m.van.look=look;m.player.pitch=pitch;measure();}}
   m.mode='walk';m.van.gear=2;for(const [x,z] of kind==='ice'?[[2.3,-35.7],[6.2,-37.1],[6.2,-40.6],[7.7,-40.2],[7.7,-41.35],[9.1,-40.6]]:[[-2.3,-40.3],[-6.25,-36.7],[-6.25,-41]])for(let yaw=0;yaw<12;yaw++)for(const pitch of [-.7,0,.7]){Object.assign(m.player,{x,z,yaw:yaw*Math.PI/6,pitch});measure();}
  }finally{scene.art.dispose();}}
  reports.push({loaded,poses,peak});
 }}finally{bank.dispose();}
 const out=path.join(__dirname,'out/fp-review');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'c46-ice-fatigue-geometry.json'),JSON.stringify({scope:'Low CPU whole-world/mirror geometry only. Real loaded GLBs versus missing assets, both adapters, both cab gears, actual notices/rail/grit and pedestrian views. No rendered resource/native/Intel FPS acceptance.',reports},null,2)+'\n');console.log(JSON.stringify(reports));
});
