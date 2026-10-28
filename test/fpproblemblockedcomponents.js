/* Unloaded UI/fixture components. No native-input, full-world integration or render-budget claim. */
const test=require('node:test'),assert=require('node:assert/strict'),{c,O,THREE,fixture}=require('./tools/fp-problem-blocked-context')(),B=O.fpProblemBlocked,U=O.fpProblemBlockedUI,W=O.fpProblemBlockedWorld;
test('component menus require the actual card pose and exception, then finish through the original kernel',()=>{
 const scene=fixture(),m=scene.model,state=m.blockedProblem.state;U.card(scene);assert.match(scene.panel.body,/Approach/);scene.closePanel();assert.equal(B.exception(m,'UN'),true);
 m.mode='walk';const c=m.blockedProblem.card;Object.assign(m.player,{x:c.x-1.4,z:c.z});scene.target='blocked-card';assert.equal(scene.scenarioSession.definition.interact(scene.scenarioSession,scene,'blocked-card'),true);scene.panel.choices[0].action();assert.equal(state.sequence.card,true);
 m.mode='cab';U.retention(scene);assert.match(scene.panel.body,/Access/);scene.panel.choices[0].action();assert.match(scene.panel.title,/Book/);scene.panel.choices[0].action();assert.equal(B.ready(m),true);U.finish(scene);assert.equal(scene.scenarioSession.result.score,200);assert.equal(scene.scenarioSession.result.ratios.safety,1);assert.equal(scene.scenarioSession.result.ratios.service,1);
});
test('wrong booking stays failed after correction and menu actions from abandoned runs cannot mutate a new state',()=>{
 const scene=fixture(),m=scene.model,s=m.blockedProblem.state;assert.equal(B.exception(m,'UN'),true);m.mode='walk';Object.assign(m.player,{x:m.blockedProblem.card.x-1.4,z:m.blockedProblem.card.z});assert.equal(B.retry(m,'card'),true);m.mode='cab';U.retention(scene);scene.panel.choices[0].action();scene.panel.choices[1].action();assert.equal(s.sequence.failed,true);assert.equal(s.sequence.booked,false);U.booking(scene);scene.panel.choices[0].action();U.finish(scene);assert.equal(scene.scenarioSession.result.ratios.service,0);
 const stale=fixture();assert.equal(B.exception(stale.model,'UN'),true);stale.model.mode='walk';Object.assign(stale.model.player,{x:stale.model.blockedProblem.card.x-1.4,z:stale.model.blockedProblem.card.z});U.card(stale);const action=stale.panel.choices[0].action;O.fpScenario.abandon(stale.scenarioSession);action();assert.equal(stale.model.blockedProblem.state.sequence.card,false);
});
test('the component consumes unrelated completion targets and checks the selected physical target before opening a card menu',()=>{
 const scene=fixture(),d=scene.scenarioSession.definition;assert.equal(d.key(scene.scenarioSession,scene,'KeyF'),true);assert.equal(scene.scenarioSession.phase,'active');assert.match(scene.panel.body,/safe card/);scene.closePanel();
 scene.target='cargo';scene.model.mode='walk';assert.equal(d.interact(scene.scenarioSession,scene,'blocked-card'),true);assert.match(scene.panel.body,/face it/);assert.equal(d.interact(scene.scenarioSession,scene,'cab-handbrake'),false);assert.equal(d.interact(scene.scenarioSession,scene,'parcel0'),false);
 assert.equal(d.interact(scene.scenarioSession,scene,'visit0'),true);assert.equal(scene.handheld.page.options.length,3);assert.equal(scene.handheld.page.options[2].label,'Finish this stop.');
});
test('all component controls and exception descriptions use bounded pages and remapped physical controls',()=>{
 const scene=fixture();O.fpAccess.key=k=>({KeyP:'O',KeyE:'U'}[k]||k);U.controls(scene.scenarioSession,scene);assert.match(scene.panel.body,/O.*U/);
 for(let n=0;n<3;n++){assert.ok(scene.panel.body.length<420);assert.equal(scene.panel.choices.length,2);scene.panel.choices[0].action();}
 for(let n=0;n<c.OTR_DATA.handheld.exceptions.length;n++){U.exception(scene,n);assert.ok(scene.panel.body.length>0&&scene.panel.body.length<700);assert.equal(scene.panel.choices.length,3);}
});
function geometry(m){
 const root=new THREE.Group(),cube=new THREE.BoxGeometry(),material=new THREE.MeshBasicMaterial(),interactions=[],occluders=[];
 function box(parent,x,y,z,w,h,d,color,id,solid){const mesh=new THREE.Mesh(cube,material);mesh.position.set(x,y,z);mesh.scale.set(w,h,d);mesh.updateMatrix();parent.add(mesh);if(!id)mesh.userData.fpBatchEntry={visible:true};if(id){mesh.userData.interaction=id;interactions.push(mesh);}if(solid)occluders.push(mesh);return mesh;}
 const art=W.build(root,m,{box,interactions});root.updateMatrixWorld(true);return {root,cube,material,art,interactions,occluders};
}
test('physical component rays reach the mounted holder and notice from walkable safe poses, with stable paper buffers',()=>{
 const m=B.model(),run={model:m};B.attach(run);const a=geometry(m);try{
  assert.equal(a.art.targets.length,2);assert.equal(a.art.parts.length<32,true);assert.equal(a.art.paperEntry.visible,false);
  const card=m.blockedProblem.card,warning=m.blockedProblem.warning;
  for(const [id,from,to] of [['blocked-card',new THREE.Vector3(card.x-1.4,1.65,card.z),new THREE.Vector3(card.x,card.y,card.z)],['blocked-warning',new THREE.Vector3(warning.x-1.2,1.65,warning.z),new THREE.Vector3(warning.x,2.3,warning.z)]]){
   assert.equal(m.blocked(from.x,from.z),false,'the ray starts on a walkable safe pose');const ray=new THREE.Raycaster(from,to.clone().sub(from).normalize(),0,2.65);ray.layers.enable(1);const hit=ray.intersectObjects([...new Set([...a.interactions,...a.occluders])],false)[0];assert.equal(hit?.object.userData.interaction,id);
  }
  const parts=a.root.children.length,entry=a.art.paperEntry;m.blockedProblem.state.sequence.card=true;for(let i=0;i<500;i++)a.art.sync(m,null,true);assert.equal(a.root.children.length,parts);assert.equal(a.art.paperEntry,entry);assert.equal(entry.visible,true);
  const camera=new THREE.PerspectiveCamera();m.mode='walk';m.blockedProblem.slipAt=0;m.blockedProblem.state.elapsed=.35;camera.position.y=1.65;a.art.sync(m,camera,false);assert.equal(camera.position.y,1.47);camera.position.y=1.65;a.art.sync(m,camera,true);assert.equal(camera.position.y,1.65);
 }finally{a.cube.dispose();a.material.dispose();}
});
test('locked access has a physical gate and the mounted sign describes the actual access variant',()=>{
 for(const [options,access] of [[{unsafe:true},'unsafe'],[{unsafe:false,locked:true},'locked'],[{unsafe:false,locked:false},'blocked']]){
  const m=B.model(options),a=geometry(m);try{assert.equal(W.signs(m)[0].access,access);assert.equal(W.signs(m)[1].kind,'attempt-card');if(access==='locked'){assert.ok(m.solids.includes(m.blockedProblem.gate));assert.equal(m.blocked(m.blockedProblem.gate.x,m.blockedProblem.gate.z),true);}}finally{a.cube.dispose();a.material.dispose();}
 }
});
