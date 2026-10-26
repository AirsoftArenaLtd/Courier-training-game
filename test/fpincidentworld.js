/* Asset/fallback surfaces, real visible rays, stable buffers and disposal. No native-key or GPU claim. */
const test=require('node:test'),assert=require('node:assert/strict'),{c,O,THREE,fixture}=require('./tools/fp-incident-context')(),{install,local}=require('./tools/fpassets-context'),A=install(c),K=O.fpCustomerTalk,S=O.fpIncidentStage;
test('bundled sedan/house and High people have bounded fallbacks, stable buffers and private disposal',async()=>{
 for(const high of [false,true]){O.gfx={high:()=>high};const bank=await A.preload({high,fetch:local});try{for(const loaded of [true,false]){const scene=fixture('m8-incident',{bank:loaded?bank:null}),art=scene.art.customer,stage=scene.model.incidentStage,buffers=[art.fixed.instanceMatrix.array,art.moving.instanceMatrix.array],children=art.root.children.length;
  try{assert.equal(art.imports.length,loaded?2:0);assert.equal(art.people.filter(p=>p.actor).length,loaded&&high?2:0);const nodes=['n1','n2','n3','n3b','n4','n6','n7','n8','n9','n10'];
   for(let i=0;i<300;i++){K.enter(scene.model.customerTalk,nodes[i%nodes.length]);S.apply(stage,scene.model.customerTalk);S.step(stage,.05);scene.sync();assert.equal(art.root.children.length,children);assert.equal(art.fixed.instanceMatrix.array,buffers[0]);assert.equal(art.moving.instanceMatrix.array,buffers[1]);assert.ok(art.fixed.count<=64&&art.moving.count<=32);for(const value of buffers[1])assert.ok(Number.isFinite(value));}
   assert.equal(scene.model.blocked(stage.car.x,stage.car.z),true);assert.equal(scene.model.blocked(12,-47),true);assert.equal(scene.model.blocked(7.5,-39.9),false);
  }finally{let disposed=0;const shared=bank.models.get('town-parked-car').parts[0].geometry;shared.addEventListener('dispose',()=>disposed++);scene.art.dispose();scene.art.dispose();assert.equal(disposed,0);assert.equal(art.root.parent,null);}
 }}finally{bank.dispose();}}
});
test('all physical conversation points remain visible from nearby legal positions with loaded assets and fallback',async()=>{
 for(const high of [false,true]){O.gfx={high:()=>high};const bank=await A.preload({high,fetch:local});try{for(const loaded of [true,false]){const scene=fixture('m8-incident',{bank:loaded?bank:null}),m=scene.model,talk=m.customerTalk;try{
  for(const [node,mode,x,z] of [['n1','walk',-.3,-38],['n2','walk',4.8,-39.1],['n3','walk',6,-39.1],['n6','cab',-.1,-42.65],['n8','walk',-.3,-38],['n9','walk',10.8,-40.6],['n10','cab',-.1,-42.65]]){
   K.enter(talk,node);S.apply(m.incidentStage,talk);m.mode=mode;Object.assign(m.player,{x,z});scene.sync();const t=m.incidentStage.target,eye=scene.view.camera.position,yaw=Math.atan2(t.x-eye.x,-(t.z-eye.z));m.player.pitch=Math.atan2(eye.y-t.y,Math.hypot(t.x-eye.x,t.z-eye.z));if(mode==='cab')m.van.look=yaw;else m.player.yaw=yaw;scene.sync();assert.equal(scene.art.pick(),'customer-conversation',JSON.stringify({high,loaded,node,target:t,eye,pick:scene.art.pick()}));
  }
 }finally{scene.art.dispose();}}}finally{bank.dispose();}}
});
