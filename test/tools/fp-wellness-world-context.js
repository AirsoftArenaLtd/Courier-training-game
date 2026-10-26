/* Isolated safety-world component over real delivery art. The application adapter remains unloaded. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),THREE=require('../../lib/three.min.js');
module.exports=()=>{
 const context=require('./fp-wellness-stage-context')(),{c,O,fixture:modelFixture}=context;c.THREE=THREE;
 for(const f of ['src/core/fpactors.js','src/core/fpcustomerstage.js','src/core/fpmountedwords.js','src/core/fpscannerstopworld.js','src/core/fpwellnessstopworld.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../..',f),'utf8'),c);
 O.gfx={high:()=>false};
 function fixture(id='m8-steps',index=0,{bank=null}={}){
  const m=modelFixture(id,index),d=m.customerStop,answer=d.def.answer;
  m.customerStage=O.fpCustomerStage.create({cast:{[answer?.talk||'resident']:{name:answer?.name||'The resident',portrait:answer?.spec||{}}}});
  m.customerStage.actors[0].visible=false;m.customerStage.actors[0].solid.x=10000;m.customerStage.actors[0].solid.z=10000;m.solids.push(m.customerStage.actors[0].solid);
  m.scannerSolids=[{x:10000,z:10000,w:.64,d:.64},{x:10000,z:10000,w:1.8,d:.6}];m.solids.push(...m.scannerSolids);m.cargoOpen=false;
  const root=new THREE.Scene(),interactions=[],occluders=[],world=O.fpWellnessStopWorld.build(root,m,{interactions,occluders,bank});
  const camera=new THREE.PerspectiveCamera(76,16/9,.08,180);root.add(camera);
  function sync(){world.sync(m,true);root.updateMatrixWorld(true);}
  function pick(id,x,z){sync();const object=interactions.find(o=>o.userData.interaction===id&&o.visible);if(!object)return null;const target=object.getWorldPosition(new THREE.Vector3());camera.position.set(x,1.65+O.fpScannerStopWorld.ground(m,x,z),z);camera.lookAt(target);camera.updateMatrixWorld(true);const ray=new THREE.Raycaster(camera.position,target.sub(camera.position).normalize(),0,2.65);ray.layers.enable(1);const visible=[...new Set([...interactions,...occluders])].filter(o=>{for(let p=o;p;p=p.parent)if(!p.visible)return false;return true;});return ray.intersectObjects(visible,false)[0]?.object.userData.interaction||null;}
  sync();return {m,d,world,root,camera,interactions,occluders,sync,pick};
 }
 return {...context,THREE,fixture};
};
