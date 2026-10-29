/* Exercise the actual browser walking helper against real motor/collision and batched game frames. */
const test=require('node:test'),assert=require('node:assert/strict'),makeWalk=require('./tools/fp-loading-walk');
function controls(f,scene,batch){
 const held={};let checks=0,frames=0;
 const page={evaluate:async()=>({player:{...scene.model.player},controlsOpen:!!scene.panel||!!scene.handheld?.isOpen}),keyboard:{down:async code=>{held[code]=true;},up:async code=>{delete held[code];}}};
 const walk=makeWalk({page,ok:(value,message)=>{assert.ok(value,message);checks++;},frames:async()=>{for(let i=0;i<batch;i++){
  f.O.fpAccess.look(scene,held,.05);scene.model.step({forward:!!held.KeyW,back:!!held.KeyS,left:!!held.KeyA,right:!!held.KeyD,careful:!!held.ShiftLeft},.05);frames++;
 }}});
 return {walk,held,counts:()=>({checks,frames})};
}
test('the observed missed waypoint terminates with one through four real frames between observations',async()=>{
 for(const batch of [1,2,3,4]){const f=require('./tools/fp-loading-context')(),scene=f.fixture();try{
  Object.assign(scene.model.player,{x:2.8328535866790623,z:9.956618227464842,yaw:10.071088381154466,pitch:0});
  const input=controls(f,scene,batch);await input.walk(2.84,10);assert.ok(Math.hypot(scene.model.player.x-2.84,scene.model.player.z-10)<.12);assert.deepEqual(input.held,{});assert.ok(input.counts().frames<40,'do not orbit an already passed waypoint');
 }finally{scene.art.dispose();}}
});
test('the actual native cart and shelf route remains clear in both imported vans with batched frames',async()=>{
 const {install,local}=require('./tools/fpassets-context');
 for(const high of [false,true])for(const batch of [2,3,4]){
  const f=require('./tools/fp-loading-context')();f.O.gfx={high:()=>high};const bank=await install(f.c).preload({high,fetch:local}),scene=f.fixture('m6-load',{bank}),m=scene.model,a=scene.art.loading;
  try{f.use(scene,'cargo');const input=controls(f,scene,batch),walk=input.walk,bypass=m.van.z+4.5;
   const focus=id=>{scene.sync();scene.target=null;let found=false;for(let i=0;i<80;i++)if(f.O.fpAccess.focus(scene)===id){found=true;break;}assert.ok(found,(high?'High':'Low')+' batch '+batch+' target '+id);assert.equal(scene.art.pick(),id);};
   for(const slot of a.slots){const z=slot.slot.level==='floor'?slot.target.position.z+1.25:slot.z+(slot.slot.level==='top'?0:.85);await walk(m.van.x,z);focus('loading-slot-'+slot.id);}
   const plan={l7:'C-mid-0',l8:'C-bottom-0',l12:'C-top-0',l4:'B-top-0',l5:'B-bottom-0',l6:'B-mid-0',l11:'B-top-1',l3:'A-bottom-0',l2:'A-top-0',l1:'A-mid-0',l10:'A-mid-1',l9:'haz'};
   for(const [id,position]of Object.entries(plan)){
    const p=a.parcels.find(p=>p.data.id===id),side=a.cart.x+(p.index%3===0?-1.35:1.35);await walk(m.van.x,bypass);await walk(side,bypass);await walk(side,p.z);focus('loading-parcel-'+id);scene.scenarioSession.definition.interact(scene.scenarioSession,scene,'loading-parcel-'+id);scene.panel.choices[0].action();assert.equal(m.loading.held,id);
    await walk(side,bypass);await walk(m.van.x,bypass);const slot=a.slotById.get(position),z=slot.slot.level==='floor'?slot.target.position.z+1.25:slot.z+(slot.slot.level==='top'?0:.85);await walk(m.van.x,z);focus('loading-slot-'+position);scene.scenarioSession.definition.interact(scene.scenarioSession,scene,'loading-slot-'+position);scene.panel.choices[0].action();assert.equal(m.loading.held,null);assert.equal(f.K.parcel(m.loading,id).slotRef.id,position);scene.closePanel();
   }
   assert.deepEqual(input.held,{});assert.equal(input.counts().checks,12*6+21);
  }finally{scene.art.dispose();bank.dispose();}
 }
});
test('batched native walking keeps all five actual find labels reachable in both imported vans',async()=>{
 const {install,local}=require('./tools/fpassets-context');
 for(const high of [false,true])for(const batch of [2,3,4]){
  const f=require('./tools/fp-loading-context')();f.O.gfx={high:()=>high};const bank=await install(f.c).preload({high,fetch:local}),scene=f.fixture('m6-find',{bank}),m=scene.model;
  try{f.use(scene,'cargo');const input=controls(f,scene,batch);await input.walk(m.van.x,m.van.z+1.7);
   for(const id of ['f1','f4','f6','f10','f12']){
    const parcel=scene.art.loading.parcels.find(p=>p.data.id===id),level=parcel.data.slotRef.level;await input.walk(m.van.x,level==='top'?m.van.z+1.7:Math.max(m.van.z+1.7,parcel.z+(level==='floor'?1.3:1)));
    scene.sync();scene.target=null;let found=false;for(let i=0;i<80;i++)if(f.O.fpAccess.focus(scene)==='loading-parcel-'+id){found=true;break;}assert.ok(found,(high?'High':'Low')+' batch '+batch+' find '+id);assert.equal(scene.art.pick(),'loading-parcel-'+id);
    scene.scenarioSession.definition.interact(scene.scenarioSession,scene,'loading-parcel-'+id);scene.panel.choices[0].action();for(let i=0;i<14;i++)scene.scenarioSession.definition.tick(scene.scenarioSession,scene,.05,true);
   }
   assert.equal(scene.completed.id,'m6-find');assert.equal(m.loading.cleanRounds,5);assert.deepEqual(input.held,{});
  }finally{scene.art.dispose();bank.dispose();}
 }
});

// C46 reuses the native helper while timed conversations can interrupt walking.
test('native walking yields to an open conversation and releases held movement',async()=>{
 const f=require('./tools/fp-loading-context')(),scene=f.fixture();
 try{const input=controls(f,scene,3),before={...scene.model.player};scene.showPanel('Conversation','A real panel is open.',[]);const result=await input.walk(before.x+2,before.z,{stopOnPanel:true});assert.equal(result.interrupted,true);assert.deepEqual({...scene.model.player},before);assert.deepEqual(input.held,{});}
 finally{scene.art.dispose();}
});
