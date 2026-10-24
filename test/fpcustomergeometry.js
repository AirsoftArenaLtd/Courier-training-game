/* CPU Low geometry guard across actual customer sites, dialogue poses and voluntary walking positions. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),THREE=require('../lib/three.min.js'),{install,local}=require('./tools/fpassets-context');
const c={THREE};c.window=c;vm.createContext(c);
for(const f of ['data/theme.js','data/config.js','data/workday_events.js','data/m3_dialogues.js','src/core/theme.js','src/core/scoring.js','src/core/scorelog.js','src/core/talk.js','src/core/workday.js','src/core/firstperson.js','src/core/fpmission.js','src/core/fpcamera.js','src/core/fpcab.js','src/core/fpmirrors.js','src/core/fprear.js','src/core/fpdriving.js','src/core/fpsignal.js','src/core/fpday.js','src/core/fpdoors.js','src/core/world3d.js','src/core/fpbranding.js','src/core/fpactors.js','src/core/fpscenario.js','src/core/fpcustomertalk.js','src/core/fpcustomerstage.js','src/core/fpcustomerworld.js','src/core/fpworld.js','src/core/fpcustomerscenario.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),c);
const O=c.OTR,F=O.fpScenario,K=O.fpCustomerTalk,S=O.fpCustomerStage,A=install(c),scenario={id:'m3-twostops',scene:'DialogueScene',scene3d:'customer-conversation',categories:['service','safety','efficiency']};O.gfx={high:()=>false};O.registry={get:()=>scenario,content:()=>c.OTR_DATA.dialogues.m3_twostops};O.academy={coaching:()=>true};
function cost(root,camera){
 camera.updateMatrixWorld(true);const f=new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));let calls=0,triangles=0;
 root.traverseVisible(o=>{if(!o.isMesh||!camera.layers.test(o.layers)||o.frustumCulled&&!f.intersectsObject(o))return;const n=o.isInstancedMesh?o.count:1;if(!n)return;const g=o.geometry,materials=Array.isArray(o.material)?o.material:null;if(materials){for(const group of g.groups)if(materials[group.materialIndex]?.visible!==false){calls++;triangles+=group.count/3*n;}}else if(o.material.visible!==false){calls++;triangles+=(g.index?g.index.count:g.attributes.position.count)/3*n;}});return {calls,triangles};
}
test('all Low customer and sidewalk views keep the original geometry ceilings with models and fallback',async()=>{
 const bank=await A.preload({high:false,fetch:local}),reports=[];
 try{for(const loaded of [true,false]){
  const r=F.create(scenario.id),m=F.model(r),world=new THREE.Scene(),camera=new THREE.PerspectiveCamera(68,16/9,.08,180);world.add(camera);
  const scene={assetBank:loaded?bank:null,view:{world,camera,mirror:{camera:new THREE.PerspectiveCamera(),on:false}}},art=O.fpWorld.build(scene,m),peak={calls:0,triangles:0};let poses=0;
  try{assert.equal(art.customer.imports.length,loaded?2:0);for(const node of ['n1','n4','n5','n6_chase']){
   K.enter(m.customerTalk,node);S.apply(m.customerStage,m.customerTalk);S.step(m.customerStage,0,true);
   for(const [x,z] of [[11,-27.9],[6.3,-27.9],[6.3,-35],[6.3,-42.6],[11,-42.6],[13,-42],[8.4,-46]])for(let yaw=0;yaw<24;yaw++)for(const pitch of [-.9,-.45,0,.45,.9]){
    Object.assign(m.player,{x,z,yaw:yaw*Math.PI/12,pitch});art.sync(m,null,'route');const main=cost(world,camera);let reflected={calls:0,triangles:0};
    for(let i=0;i<3;i++){scene.view.mirror.before(i);const view=cost(world,scene.view.mirror.camera);scene.view.mirror.after();reflected.calls=Math.max(reflected.calls,view.calls);reflected.triangles=Math.max(reflected.triangles,view.triangles);}
    const calls=main.calls+reflected.calls,triangles=main.triangles+reflected.triangles;peak.calls=Math.max(peak.calls,calls);peak.triangles=Math.max(peak.triangles,triangles);poses++;
    assert.ok(calls<=64&&triangles<=2500,JSON.stringify({loaded,node,x,z,yaw,pitch,calls,triangles}));
   }
  }}finally{art.dispose();}reports.push({loaded,poses,peak});
 }}finally{bank.dispose();}
 const out=path.join(__dirname,'out/fp-review');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'c41-customer-geometry-current.json'),JSON.stringify({scope:'CPU Low geometry only: four dialogue poses, seven sidewalk/customer positions, twenty-four yaw angles, five pitches, main plus the most costly actual mirror pass. Not GPU memory, High or Intel FPS acceptance.',reports},null,2)+'\n');console.log(JSON.stringify(reports));
});
