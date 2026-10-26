/* Whole-world Low CPU count with the actual original mirrors. The safety adapter remains unloaded. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{c,O,THREE,fixture}=require('./tools/fp-wellness-full-context')(),{install,local}=require('./tools/fpassets-context'),assets=install(c);
function cost(root,camera){camera.updateMatrixWorld(true);const frustum=new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));let calls=0,triangles=0;root.traverseVisible(o=>{if(!o.isMesh||!camera.layers.test(o.layers)||o.frustumCulled&&!frustum.intersectsObject(o))return;const n=o.isInstancedMesh?o.count:1;if(!n)return;const g=o.geometry,materials=Array.isArray(o.material)?o.material:null;if(materials){for(const group of g.groups)if(materials[group.materialIndex]?.visible!==false){calls++;triangles+=group.count/3*n;}}else if(o.material.visible!==false){calls++;triangles+=(g.index?g.index.count:g.attributes.position.count)/3*n;}});return {calls,triangles};}
test('all nine safety stops and actual mirrors retain the original 64-call / 2500-triangle Low geometry limits',async()=>{
 O.gfx={high:()=>false};const bank=await assets.preload({high:false,fetch:local}),reports=[];try{for(const loaded of [true,false]){
  const peak={calls:0,triangles:0};let poses=0;
  for(const id of ['m8-steps','m8-dog','m8-heat'])for(let index=0;index<3;index++){
   const scene=fixture(id,index,{bank:loaded?bank:null}),m=scene.model,d=m.customerStop;try{
    const measure=where=>{scene.sync();const main=cost(scene.view.world,scene.view.camera),reflected={calls:0,triangles:0};for(let n=0;n<(scene.view.mirror.rearOn?4:3);n++){scene.view.mirror.before(n);const v=cost(scene.view.world,scene.view.mirror.camera);scene.view.mirror.after();reflected.calls=Math.max(reflected.calls,v.calls);reflected.triangles=Math.max(reflected.triangles,v.triangles);}const calls=main.calls+reflected.calls,triangles=main.triangles+reflected.triangles;peak.calls=Math.max(peak.calls,calls);peak.triangles=Math.max(peak.triangles,triangles);poses++;assert.ok(calls<=64&&triangles<=2500,JSON.stringify({loaded,id,index,...where,calls,triangles}));};
    for(const gear of [2,-1]){m.mode='cab';m.van.gear=gear;for(const look of [-1.5,-.75,0,.75,1.5])for(const pitch of [-.7,0,.7]){m.van.look=look;m.player.pitch=pitch;measure({gear,look,pitch});}}
    m.mode='walk';m.van.gear=2;for(let stage=0;stage<4;stage++){
     m.cargoOpen=stage===0;if(stage===1)O.fpCustomerStop.take(d,'p1');d.state.answered=stage===2&&!!d.def.answer;if(d.wellness.ref.gate)d.wellness.ref.gate.open=stage===3;
     if(d.wellness.ref.dog){d.wellness.ref.dog.setAlpha(1);d.wellness.ref.dogGone=stage===3;}
     for(const [x,z] of [[-.2,-43.7],[1.7,-38.2],[5,-40],[12,-42.9],[12.8,-43.2],[14.8,-44.6],[7.3,-42]])for(let yaw=0;yaw<12;yaw++)for(const pitch of [-.8,0,.8]){Object.assign(m.player,{x,z,yaw:yaw*Math.PI/6,pitch});measure({stage,x,z,yaw,pitch});}
    }
   }finally{scene.art.dispose();}
  }
  reports.push({loaded,poses,peak});
 }}finally{bank.dispose();}
 const out=path.join(__dirname,'out/fp-review');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'c46-wellness-geometry-current.json'),JSON.stringify({scope:'CPU whole-world geometry with injected unloaded safety components, nine stops and original mirrors; excludes rendered resource, native gameplay, application adapter, GPU and Intel FPS acceptance.',reports},null,2)+'\n');console.log(JSON.stringify(reports));
});
