/* Static review cameras must frame the actual printed top label after fitting the van floor. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {c,O,THREE,fixture}=require('./tools/fp-loading-context')(),{install,local,root}=require('./tools/fpassets-context');
const assets=install(c),manifest=JSON.parse(fs.readFileSync(root+'/assets/3d/manifest.json'));
manifest.files=manifest.files.filter(f=>f.use==='van-exterior');
c.module={exports:{}};vm.runInContext(fs.readFileSync(__dirname+'/tools/fp-loading-pose.js','utf8'),c);const pose=c.module.exports;
function bounds(parcel,camera){
 const xs=[],ys=[];camera.updateMatrixWorld(true);parcel.words.mesh.updateMatrixWorld(true);
 for(const e of parcel.words.entries){
  const matrix=new THREE.Matrix4().multiplyMatrices(parcel.words.mesh.matrixWorld,e.matrix);
  for(const x of [-.5,.5])for(const y of [-.5,.5]){
   const p=new THREE.Vector3(x,y,0).applyMatrix4(matrix).project(camera);assert.ok(p.z>=-1&&p.z<=1);
   xs.push((p.x+1)*640);ys.push((1-p.y)*360);
  }
 }
 assert.ok(xs.length>0);return {left:Math.min(...xs),right:Math.max(...xs),top:Math.min(...ys),bottom:Math.max(...ys)};
}
for(const high of [false,true])for(const loaded of [false,true])test(`${high?'High':'Low'} ${loaded?'loaded':'fallback'} top-shelf pose selects and frames every printed glyph`,async()=>{
 O.gfx={high:()=>high};const bank=loaded?await assets.preload({high,fetch:url=>url.endsWith('manifest.json')?Promise.resolve(new Response(JSON.stringify(manifest))):local(url)}):null;
 const checkpoint={campaign:{id:'preserved'}},events=[{type:'brief.read',key:'preserved'}],workday={current:{id:'preserved'}};
 O.fpStore={read:()=>checkpoint};O.workday={events};O.save={data:{workday}};
 const scene=fixture('m6-load',{bank});O.game={scene:{getScene:()=>scene}};
 const before=JSON.stringify({checkpoint,events,workday});
 try{
  pose('loadtop');const m=scene.model,parcel=scene.art.loading.parcels.find(p=>p.data.id==='l2');
  assert.equal(scene.art.pick(),'loading-parcel-l2','the camera must use the unobstructed printed top package');
  assert.equal(parcel.printVisible,true);assert.equal(m.blocked(m.player.x,m.player.z),false);
  const box=bounds(parcel,scene.view.camera);assert.ok(box.left>=32&&box.right<=1248&&box.top>=112&&box.bottom<=622,JSON.stringify(box));
  assert.equal(m.loading.pkgs.filter(p=>p.slotRef).length,12);assert.equal(m.loading.held,null);assert.equal(m.paused,true);
  assert.equal(JSON.stringify({checkpoint,events,workday}),before);
  assert.equal(scene.loadingBefore.checkpoint,JSON.stringify(checkpoint));assert.equal(scene.loadingBefore.events,JSON.stringify(events));assert.equal(scene.loadingBefore.workday,JSON.stringify(workday));
 }finally{scene.art.dispose();if(bank)bank.dispose();}
});
