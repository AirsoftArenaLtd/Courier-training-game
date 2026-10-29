/* Native-action adapter guards and original outcomes with real walking and raycasts. */
const test=require('node:test'),assert=require('node:assert/strict'),{c,O,THREE,F,K,A,fixture,aim,use,walk}=require('./tools/fp-loading-context')();
const plain=x=>JSON.parse(JSON.stringify(x));
test('module entry keeps both original ids, pars, categories, defaults and isolated task state',()=>{
 const before=JSON.stringify(c.OTR_DATA.modules);for(const id of ['m6-load','m6-find']){const scene=fixture(id);try{const run=scene.scenarioSession,s=scene.model.loading;assert.equal(run.id,id);assert.equal(s.content.par,id==='m6-load'?210:120);assert.deepEqual(plain(s.cats),id==='m6-load'?['safety','efficiency']:['efficiency','service']);assert.equal(s.phase,'active');assert.equal(scene.model.mode,'walk');assert.equal(scene.model.van.gear,2);assert.equal(scene.model.parcels.length,0);assert.equal(scene.art.loading.slots.length,21);assert.equal(scene.art.interactions.some(o=>/^slot\d$/.test(o.userData.interaction)||o.userData.interaction==='secure'),false);}finally{scene.art.dispose();}}
 assert.equal(JSON.stringify(c.OTR_DATA.modules),before);
});
test('real keys/motor paths open the cargo doors and reach all 21 empty physical markers without entering solids',()=>{
 const scene=fixture();try{walk(scene,scene.model.van.x,scene.model.van.z+3.7);use(scene,'cargo');assert.equal(scene.model.cargoOpen,true);walk(scene,scene.model.van.x,scene.model.van.z+1.85);
  for(const slot of scene.art.loading.slots){const z=slot.slot.level==='floor'?slot.target.position.z+1.25:slot.z+(slot.slot.level==='top'?0:.85);walk(scene,scene.model.van.x,z);aim(scene,'loading-slot-'+slot.id);}
  const m=scene.model;assert.equal(m.blocked(m.van.x-.8,m.van.z+.75),true);assert.equal(m.blocked(scene.art.loading.cart.x,scene.art.loading.cart.z),true);
  walk(scene,m.van.x,m.van.z+1.5);m.player.yaw=Math.PI/2;for(let n=0;n<300;n++)m.step({forward:true},.025);assert.ok(m.player.x<=m.van.x+.32,'the player cannot walk through the shelves');
 }finally{scene.art.dispose();}
});
test('physical parcel label and stale actions cannot pick through the van, change a later round or duplicate a pick',()=>{
 const scene=fixture('m6-find');try{const s=scene.model.loading;assert.equal(scene.model.cargoOpen,false);const before=JSON.stringify(s.log.toJSON());scene.scenarioSession.definition.interact(scene.scenarioSession,scene,'loading-parcel-f1');assert.equal(JSON.stringify(s.log.toJSON()),before);assert.equal(s.roundIndex,0);scene.closePanel();
  use(scene,'cargo');walk(scene,scene.model.van.x,scene.model.van.z+1.7);use(scene,'loading-parcel-f1');assert.equal(scene.panel.title,'Read the package label.');assert.ok(!scene.panel.body.includes('stop 1'),'find labels do not answer by stop number');const choose=scene.panel.choices[0].action;choose();assert.equal(s.roundIndex,1);assert.equal(s.cleanRounds,1);choose();assert.equal(s.roundIndex,1);
  for(let n=0;n<14;n++)scene.scenarioSession.definition.tick(scene.scenarioSession,scene,.05,true);assert.equal(s.round.pkg,'f4');choose();assert.equal(s.roundIndex,1);
 }finally{scene.art.dispose();}
});
test('loading and returning a parcel require the actual cart and shelf, and an incomplete load cannot finish',()=>{
 const scene=fixture();try{const s=scene.model.loading,m=scene.model;use(scene,'cargo');
  // The cart is a real solid. Approach its rear edge and select a front-row label.
  walk(scene,m.van.x,m.van.z+4);walk(scene,scene.art.loading.cart.x,scene.art.loading.cart.z+1.7);use(scene,'loading-parcel-l10');scene.panel.choices[0].action();assert.equal(s.held,'l10');
  walk(scene,m.van.x,m.van.z+4);walk(scene,m.van.x,m.van.z+1.85);use(scene,'loading-slot-A-mid-1');scene.panel.choices[0].action();assert.equal(s.held,null);assert.equal(K.parcel(s,'l10').slotRef.id,'A-mid-1');
  // Returning this carried parcel uses the cart action, not a remote selection in the handheld.
  use(scene,'loading-parcel-l10');scene.panel.choices[0].action();walk(scene,m.van.x,m.van.z+4);walk(scene,scene.art.loading.cart.x,scene.art.loading.cart.z+1.7);use(scene,'loading-cart');scene.panel.choices[0].action();assert.equal(s.held,null);assert.equal(K.parcel(s,'l10').slotRef,null);
  A.review(scene);assert.equal(s.phase,'active');assert.match(scene.panel.body,/every package/);assert.throws(()=>scene.scenarioSession.definition.result(scene.scenarioSession),/incomplete/);
 }finally{scene.art.dispose();}
});
test('both clocks freeze with menus and an assessment timeout abandons once without awarding a result',()=>{
 const scene=fixture('m6-load',{assessment:true});try{const run=scene.scenarioSession,s=scene.model.loading;assert.equal(F.coaching(run),false);A.handheld(run,scene);const elapsed=s.elapsed;run.definition.tick(run,scene,.05,false);F.advance(run,.05,false);assert.equal(s.elapsed,elapsed);assert.equal(run.elapsed,0);
  run.definition.timeout(run,scene);assert.equal(run.phase,'timed-out');assert.equal(scene.completed,undefined);assert.match(scene.panel.body,/no result/);assert.equal(F.abandon(run),true);
 }finally{scene.art.dispose();}
});
test('all twelve packages can be physically loaded from the cart, strapped and completed with the original 2100 result',()=>{
 const scene=fixture(),m=scene.model,s=m.loading,cart=scene.art.loading.cart,slots=scene.art.loading.slotById;
 const plan={l7:'C-mid-0',l8:'C-bottom-0',l12:'C-top-0',l4:'B-top-0',l5:'B-bottom-0',l6:'B-mid-0',l11:'B-top-1',l3:'A-bottom-0',l2:'A-top-0',l1:'A-mid-0',l10:'A-mid-1',l9:'haz'};
 O.workday={events:[{type:'brief.read',key:'suspended'}],report(){assert.fail('A module sent a workday event');}};const outside=JSON.stringify(O.workday.events);
 try{use(scene,'cargo');for(const [id,slotId]of Object.entries(plan)){
  const b=scene.art.loading.parcels.find(b=>b.data.id===id),side=cart.x+(b.index%3===0?-1.35:1.35);walk(scene,m.van.x,m.van.z+3.8);walk(scene,side,m.van.z+3.8);walk(scene,side,b.z);use(scene,'loading-parcel-'+id);scene.panel.choices[0].action();assert.equal(s.held,id);
  walk(scene,side,m.van.z+3.8);walk(scene,m.van.x,m.van.z+3.8);const slot=slots.get(slotId),z=slot.slot.level==='floor'?slot.target.position.z+1.25:slot.z+(slot.slot.level==='top'?0:.85);walk(scene,m.van.x,z);use(scene,'loading-slot-'+slotId);scene.panel.choices[0].action();assert.equal(s.held,null);assert.equal(K.parcel(s,id).slotRef.id,slotId);scene.closePanel();
 }
 walk(scene,m.van.x,m.van.z+3.5);use(scene,'loading-restraints');scene.panel.choices[0].action();assert.equal(s.strapped,true);use(scene,'loading-restraints');scene.panel.choices[1].action();assert.equal(s.phase,'report');assert.equal(scene.panel.title,'Review the load.');scene.panel.choices.at(-1).action();assert.equal(scene.completed.id,'m6-load');assert.equal(scene.completed.result.score,2100);assert.deepEqual(plain(scene.completed.result.ratios),{safety:1,efficiency:1});assert.equal(JSON.stringify(O.workday.events),outside);assert.ok(s.elapsed<=210);console.log(JSON.stringify({physicalLoadSeconds:s.elapsed,placements:Object.keys(plan).length}));
 }finally{scene.art.dispose();}
});
test('all five authored find requests finish through physical labels, original delays and the isolated module result',()=>{
 const scene=fixture('m6-find'),m=scene.model,s=m.loading;try{use(scene,'cargo');walk(scene,m.van.x,m.van.z+1.7);for(const id of ['f1','f4','f6','f10','f12']){
  use(scene,'loading-parcel-'+id);scene.panel.choices[0].action();assert.equal(s.round,null);for(let n=0;n<14;n++){m.step({},.05);F.advance(scene.scenarioSession,.05,true);scene.scenarioSession.definition.tick(scene.scenarioSession,scene,.05,true);}scene.sync();
 }
 assert.equal(scene.completed.id,'m6-find');assert.equal(s.cleanRounds,5);assert.equal(s.wrongPicks,0);assert.deepEqual(plain(scene.completed.result.ratios),{efficiency:1,service:1});assert.ok(scene.completed.result.score>0&&scene.completed.result.score<=2000);assert.equal(s.extraLessons.length,1);assert.equal(O.workday.events.length,1);
 }finally{scene.art.dispose();}
});
test('assessment reports do not disclose placement findings before finishing, and captured old report actions are inert',()=>{
 const scene=fixture('m6-load',{assessment:true}),s=scene.model.loading;try{
  for(let i=0;i<s.pkgs.length;i++){K.take(s,s.pkgs[i].id);K.place(s,s.slots[i].id);}A.review(scene);assert.equal(s.phase,'report');assert.equal(scene.panel.body,'The load has been checked. Finish the scenario to view your results.');assert.equal(scene.panel.choices.length,1);const finish=scene.panel.choices[0].action;finish();const result=JSON.stringify(plain(scene.completed.result));finish();assert.equal(JSON.stringify(plain(scene.completed.result)),result);
 }finally{scene.art.dispose();}
});
test('Low mirror passes retain parcels and restore the exact main-view address ink buffers',()=>{
 const scene=fixture('m6-find'),m=scene.model;try{use(scene,'cargo');walk(scene,m.van.x,m.van.z+1.7);const art=scene.art.loading,printed=art.parcels.filter(b=>b.printVisible);assert.equal(printed.length,1);const b=printed[0],count=b.words.mesh.count,array=new Float32Array(b.words.mesh.instanceMatrix.array);assert.ok(b.batch.entries.every(e=>e.mainOnly));
  for(let n=0;n<3;n++){scene.view.mirror.before(n);assert.equal(b.words.mesh.count,0);assert.ok(art.moving.count>0,'the actual parcel geometry remains in the scene');scene.view.mirror.after();assert.equal(b.words.mesh.count,count);assert.deepEqual(b.words.mesh.instanceMatrix.array,array);}
 }finally{scene.art.dispose();}
});
test('practice gives the original timed find assistance while assessment displays no answer hint',()=>{
 for(const assessment of [false,true]){const scene=fixture('m6-find',{assessment}),s=scene.model.loading;try{scene.notice='';s.elapsed=25;scene.scenarioSession.definition.tick(scene.scenarioSession,scene,.001,true);assert.equal(s.roundHelp.nudged,true);if(assessment)assert.equal(scene.notice,'');else assert.match(scene.notice,/whole address/);
  scene.notice='';s.elapsed=45;scene.scenarioSession.definition.tick(scene.scenarioSession,scene,.001,true);assert.equal(s.roundHelp.shown,true);assert.equal(s.roundClean,false,'keep the original timed clean-round rule');if(assessment)assert.equal(scene.notice,'');else assert.match(scene.notice,/highlighted in section C/);assert.equal(scene.model.loadingCoaching,!assessment);
 }finally{scene.art.dispose();}}
});

test('paused static captures settle the real imported cargo door without changing the clocks or motion preference',async()=>{
 const fs=require('node:fs'),vm=require('node:vm'),{install,local}=require('./tools/fpassets-context');
 for(const high of [false,true]){
  const {c:context,O:runtime,fixture:make}=require('./tools/fp-loading-context')();runtime.gfx={high:()=>high};runtime.fpAccess.reduced=()=>false;const bank=await install(context).preload({high,fetch:local}),scene=make('m6-load',{bank});
  try{
   const m=scene.model;m.cargoOpen=true;m.paused=true;scene.sync();const actors=scene.art.actors,vehicle=actors.vehicle,door=vehicle.parts.find(p=>p.name==='door');assert.equal(actors.opening(),0,'a frozen clock reproduces the previously closed static door');
   const span=()=>{const p=vehicle.geometry.attributes.position;let min=Infinity,max=-Infinity;for(let i=0;i<door.p.count;i++){const y=p.getY(door.base+i);min=Math.min(min,y);max=Math.max(max,y);}return max-min;};const closedHeight=span(),before={world:m.elapsed,runner:scene.scenarioSession.elapsed,cargo:m.loading.elapsed};
   runtime.workday={events:[]};runtime.save={data:{workday:null}};runtime.game={scene:{getScene:()=>scene}};context.module={exports:null};vm.runInContext(fs.readFileSync(__dirname+'/tools/fp-loading-pose.js','utf8'),context);context.module.exports('loadstrapped');
   assert.equal(actors.opening(),1);assert.ok(span()<closedHeight/4,'the actual transformed door lies overhead instead of covering the cargo aperture');let nearestDoor=Infinity;for(let i=0;i<door.p.count;i++)nearestDoor=Math.min(nearestDoor,vehicle.geometry.attributes.position.getZ(door.base+i));assert.ok(nearestDoor>=2.4,'the cargo-only gate opens outward and leaves the upper shelves clear');assert.equal(m.loading.strapped,true);assert.equal(m.loading.cart.length,0);assert.equal(m.paused,true);assert.equal(runtime.fpAccess.reduced(),false);assert.deepEqual({world:m.elapsed,runner:scene.scenarioSession.elapsed,cargo:m.loading.elapsed},before);scene.sync();assert.equal(actors.opening(),1,'later frozen-frame syncs retain the settled actor');
  }finally{scene.art.dispose();bank.dispose();}
 }
});

test('both imported vans support all fitted positions below their roof and keep a real walkable aisle',async()=>{
 const {install,local}=require('./tools/fpassets-context');
 for(const high of [false,true]){
  const f=require('./tools/fp-loading-context')(),assets=install(f.c);f.O.gfx={high:()=>high};const bank=await assets.preload({high,fetch:local}),source=bank.models.get('van-exterior'),sourceBuffers=source.parts.map(p=>Array.from(p.geometry.attributes.position.array));
  const scene=f.fixture('m6-load',{bank}),m=scene.model,a=scene.art.loading;
  try{
   f.use(scene,'cargo');f.walk(scene,m.van.x,m.van.z+1.8);
   for(const slot of a.slots){const z=slot.slot.level==='floor'?slot.target.position.z+1.25:slot.z+(slot.slot.level==='top'?0:.85);f.walk(scene,m.van.x,z);f.aim(scene,'loading-slot-'+slot.id);}
   assert.equal(m.blocked(m.van.x,m.van.z+1.2),false);assert.equal(m.blocked(m.van.x+a.fit.side,m.van.z+1.2),true);
   const ray=new f.THREE.Raycaster(),v=scene.art.actors.vehicle.mesh;scene.view.world.updateMatrixWorld(true);
   for(const slot of a.slots){const x=slot.x,z=slot.z;ray.set(new f.THREE.Vector3(x,1.5,z),new f.THREE.Vector3(0,-1,0));const floor=ray.intersectObject(v,false)[0];assert.ok(floor&&slot.y>=floor.point.y+.005,slot.id+' stays above the actual exterior support');ray.set(new f.THREE.Vector3(x,slot.y+.01,z),new f.THREE.Vector3(0,1,0));const ceiling=ray.intersectObject(v,false)[0];assert.ok(ceiling&&slot.y+.48<ceiling.point.y,slot.id+' leaves room for the tallest original package');}
   for(let i=0;i<source.parts.length;i++)assert.deepEqual(Array.from(source.parts[i].geometry.attributes.position.array),sourceBuffers[i],'cargo-only bench adaptation must not mutate the shared source model');
  }finally{scene.art.dispose();bank.dispose();}
 }
});

test('keyboard focus reaches the loaded top-shelf label above the rack lip from nearby aisle positions',async()=>{
 const {install,local}=require('./tools/fpassets-context');
 for(const high of [false,true]){
  const f=require('./tools/fp-loading-context')();f.O.gfx={high:()=>high};const bank=await install(f.c).preload({high,fetch:local}),scene=f.fixture('m6-find',{bank}),m=scene.model;
  try{f.use(scene,'cargo');for(const z of [1.65,1.7,1.7274,1.78,1.85]){Object.assign(m.player,{x:m.van.x,z:m.van.z+z,yaw:0,pitch:0});scene.target=null;scene.sync();let selected=false;
   for(let n=0;n<80;n++){if(f.O.fpAccess.focus(scene)==='loading-parcel-f12'){selected=true;break;}}
   assert.ok(selected,(high?'High':'Low')+' actual keyboard focus at aisle '+z);assert.equal(scene.art.pick(),'loading-parcel-f12','the label-face focus must still pass the real unobscured ray');
  }}finally{scene.art.dispose();bank.dispose();}
 }
});

test('Low prints the label under the actual unit-address gaze instead of a nearer off-screen parcel',async()=>{
 const {install,local}=require('./tools/fpassets-context');
 for(const loaded of [false,true]){
  const f=require('./tools/fp-loading-context')();f.O.gfx={high:()=>false};const bank=loaded?await install(f.c).preload({high:false,fetch:local}):null,scene=f.fixture('m6-find',{bank}),m=scene.model,a=scene.art.loading;
  try{f.use(scene,'cargo');const parcel=a.parcels.find(p=>p.data.id==='f10');Object.assign(m.player,{x:2.84,z:9.7,yaw:Math.atan2(parcel.x-2.84,-(parcel.z-9.7)),pitch:0});scene.target=null;scene.sync();m.player.pitch=Math.atan2(scene.view.camera.position.y-parcel.y,Math.hypot(parcel.x-2.84,parcel.z-9.7));scene.sync();const arrays=a.batches.map(b=>b.mesh.instanceMatrix.array);
   assert.equal(scene.art.pick(),'loading-parcel-f10');scene.target=scene.art.pick();scene.sync();assert.deepEqual(plain(a.parcels.filter(p=>p.printVisible).map(p=>p.data.id)),['f10']);assert.equal(parcel.data.unit,'3B');
   for(let i=0;i<80;i++){if(f.O.fpAccess.focus(scene)==='loading-parcel-f10')break;}scene.sync();assert.equal(scene.art.pick(),'loading-parcel-f10');assert.equal(parcel.printVisible,true);
   m.loadingCoaching=true;m.loading.hint={kind:'shown',id:'f6'};scene.sync();assert.equal(parcel.printVisible,true,'the actual viewed label takes priority over assistance on another parcel');
   for(let i=0;i<arrays.length;i++)assert.equal(a.batches[i].mesh.instanceMatrix.array,arrays[i],'gaze selection reuses the fixed ink buffers');assert.equal(a.parcels.filter(p=>p.printVisible).length,1);
  }finally{scene.art.dispose();if(bank)bank.dispose();}
 }
});

test('the fitted cargo floor gives a standing eye height and an unobscured top-shelf envelope label',async()=>{
 const {install,local}=require('./tools/fpassets-context');
 for(const high of [false,true]){
  const f=require('./tools/fp-loading-context')();f.O.gfx={high:()=>high};const bank=await install(f.c).preload({high,fetch:local}),scene=f.fixture('m6-find',{bank}),m=scene.model;
  try{
   f.use(scene,'cargo');for(const id of ['f1','f4','f6','f10']){f.K.pick(m.loading,id);for(let n=0;n<14;n++)f.K.step(m.loading,.05,true);}
   Object.assign(m.player,{x:m.van.x,z:9.787251666666608,yaw:0,pitch:0});scene.target=null;scene.sync();assert.equal(m.blocked(m.player.x,m.player.z),false,'the original failed viewpoint remains legal');
   assert.ok(Math.abs(scene.view.camera.position.y-scene.art.loading.fit.floor-1.65)<1e-9,'standing height is measured from the actual fitted floor');
   let selected=false;for(let n=0;n<80;n++)if(f.O.fpAccess.focus(scene)==='loading-parcel-f9'){selected=true;break;}
   assert.ok(selected,(high?'High':'Low')+' real P selection reaches the envelope after four pulls');assert.equal(scene.art.pick(),'loading-parcel-f9');scene.sync();assert.ok(scene.art.loading.parcels.find(p=>p.data.id==='f9').printVisible,'the selected envelope has physical label ink');
   // The world override is limited to walking inside this module's open cargo.
   Object.assign(m.player,{x:m.van.x,z:m.van.z+4,yaw:0,pitch:0});scene.target=null;scene.sync();assert.equal(scene.view.camera.position.y,1.65);
  }finally{scene.art.dispose();bank.dispose();}
 }
});
