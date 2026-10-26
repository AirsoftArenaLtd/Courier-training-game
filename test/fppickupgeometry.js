/* CPU-only integrated Low counter geometry, including the most costly retained mirror. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{c,O,THREE,K,fixture}=require('./tools/fp-pickup-context')(),{install,local}=require('./tools/fpassets-context'),assets=install(c);
function cost(root,camera){camera.updateMatrixWorld(true);const frustum=new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));let calls=0,triangles=0;root.traverseVisible(o=>{if(!o.isMesh||!camera.layers.test(o.layers)||o.frustumCulled&&!frustum.intersectsObject(o))return;const count=o.isInstancedMesh?o.count:1;if(!count)return;const g=o.geometry;if(Array.isArray(o.material)){for(const group of g.groups)if(o.material[group.materialIndex]?.visible!==false){calls++;triangles+=group.count/3*count;}}else if(o.material.visible!==false){calls++;triangles+=(g.index?g.index.count:g.attributes.position.count)/3*count;}});return {calls,triangles};}
test('all source pickup counter stages and headings keep the original Low main-plus-mirror geometry ceilings',async()=>{
 O.gfx={high:()=>false};const bank=await assets.preload({high:false,fetch:local}),reports=[];
 try{for(const loaded of [true,false]){const peak={calls:0,triangles:0};let poses=0,overBudget=0,worst=null;
  for(const id of ['m7-business','m7-intl','m7-dg'])for(let stage=0;stage<4;stage++){const scene=fixture(id,{bank:loaded?bank:null}),m=scene.model,s=m.pickupTask;
   try{if(stage){let guard=0;while(s.stage==='talk'&&guard++<40){if(s.talk.phase==='choices')K.chooseTalk(s,s.talk.choices.findIndex(c=>c.grade==='good'));else K.advanceTalk(s);}for(const p of s.pieces)K.count(s,p.id);}
    if(stage>=2){K.answerCount(s,K.countChoices(s)[0].id);if(s.content.docs){for(let i=0;i<s.content.docs.fields.length;i++)if(s.content.docs.fields[i].bad)K.flag(s,i);K.submitDocs(s);}for(const p of s.pieces)K.decide(s,p.id,p.accept,p.reason||null);}
    if(stage===3)K.receipt(s);
    for(const [x,z] of [[12,-40.4],[10.05,-41.7],[12,-41.7],[14.3,-41.7],[15,-44.6],[10.15,-45.2],[13.7,-45.2]])for(let heading=0;heading<12;heading++)for(const pitch of [-.8,0,.8]){
     Object.assign(m.player,{x,z,yaw:heading*Math.PI/6,pitch});scene.sync();scene.target=scene.art.pick();scene.sync();const main=cost(scene.view.world,scene.view.camera),mirror={calls:0,triangles:0};for(let n=0;n<3;n++){scene.view.mirror.before(n);const v=cost(scene.view.world,scene.view.mirror.camera);scene.view.mirror.after();mirror.calls=Math.max(mirror.calls,v.calls);mirror.triangles=Math.max(mirror.triangles,v.triangles);}
     const calls=main.calls+mirror.calls,triangles=main.triangles+mirror.triangles;if(triangles>peak.triangles)worst={id,stage,x,z,heading,pitch,calls,triangles};peak.calls=Math.max(peak.calls,calls);peak.triangles=Math.max(peak.triangles,triangles);poses++;if(calls>64||triangles>2500)overBudget++;
    }
   }finally{scene.art.dispose();}
  }reports.push({loaded,poses,peak,overBudget,worst});
 }}finally{bank.dispose();}
 const out=path.join(__dirname,'out/fp-review');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'c45-pickup-geometry-current.json'),JSON.stringify({scope:'CPU-only Low counter: three original ids, four stages, seven walking positions, twelve headings and three pitches, actual gaze ink, main plus most costly retained mirror. No compositor, rendered memory or Intel FPS acceptance.',reports},null,2)+'\n');console.log(JSON.stringify(reports));assert.ok(reports.every(r=>r.overBudget===0),'Every pose must keep original ceilings: '+JSON.stringify(reports));
});
