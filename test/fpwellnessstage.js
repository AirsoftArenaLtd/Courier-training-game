/* CPU motor geometry and safety facts. This is not rendered or native-key acceptance. */
const test=require('node:test'),assert=require('node:assert/strict'),{O,K,B,S,fixture,input,tick,walk,plain}=require('./tools/fp-wellness-stage-context')();
test('all nine physical stops fit each source hazard once per surface, keep stable facts and never mutate source data',()=>{
 const before=JSON.stringify(O.fpWellnessStop);let surfaces=0;
 for(const id of ['m8-steps','m8-dog','m8-heat'])for(let index=0;index<3;index++){
  const m=fixture(id,index),s=m.wellnessStage,d=m.customerStop,facts=s.facts;
  for(const hazard of d.wellness.hazards){const boxes=s.hazards.filter(b=>b.id===hazard.id);assert.equal(boxes.length,hazard.id==='steps'?d.def.lot.spec.steps:1);for(const box of boxes){for(const key of ['x','z','y','w','d'])assert.ok(Number.isFinite(box[key]));assert.ok(box.w>0&&box.d>0);}surfaces+=boxes.length;}
  for(let n=0;n<100;n++){tick(m,input());assert.equal(s.facts,facts);}
  assert.equal(s.stop,d);assert.ok(s.solids.length<=7);assert.ok(s.hazards.length<=5);
  S.fit(m,-44.65,(d.def.lot.spec.steps||0)*.17);assert.equal(s.wall,-44.65);assert.equal(s.facts,facts);
 }
 assert.equal(surfaces,12);assert.equal(JSON.stringify(O.fpWellnessStop),before);console.log(JSON.stringify({physicalStops:9,hazardSurfaces:surfaces}));
});
test('walking with the real motor preserves careful recovery and loaded fall criticals on a physical patch',()=>{
 for(const careful of [true,false]){
  const m=fixture(),d=m.customerStop,s=m.wellnessStage,box=s.hazards.find(h=>h.id==='ice_walk');B.take(d,'p1');
  Object.assign(m.player,{x:box.x,z:box.z+box.d/2+.08});s.oldX=m.player.x;s.oldZ=m.player.z;
  assert.equal(walk(m,box.x,box.z-box.d/2-.08,careful),true);
  const hazard=d.state.hazards.ice_walk;assert.equal(hazard.incident,!careful);if(careful)assert.equal(hazard.state,'careful');else assert.equal(hazard.withLoad,true);
  B.enter(d,true);K.evaluate(d);assert.equal(d.log.criticals().some(c=>/ice|icy|slip/.test(c.label)),!careful);
 }
 const m=fixture(),d=m.customerStop,box=m.wellnessStage.hazards[0];B.take(d,'p1');Object.assign(m.player,{x:box.x,z:box.z,yaw:0});tick(m,input({forward:true}));assert.equal(d.state.hazards.ice_walk.wobbled,true);
 for(let n=0;n<12;n++)tick(m,input({forward:true,careful:true}));assert.equal(d.state.hazards.ice_walk.incident,false);assert.equal(d.state.hazards.ice_walk.fastT,0);
});
test('one boundary between slippery stair treads cannot double the original fall timer',()=>{
 const m=fixture(),d=m.customerStop,boxes=m.wellnessStage.hazards.filter(h=>h.id==='steps');B.take(d,'p1');
 Object.assign(m.player,{x:12,z:(boxes[0].z+boxes[1].z)/2});m.wellnessStage.oldZ=m.player.z+.01;
 S.observe(m,input({forward:true}),.05,true);assert.equal(d.state.hazards.steps.fastT,.05);
});
test('clearable clutter needs physical proximity, preserves a prior loaded incident and cannot be cleared twice',()=>{
 const m=fixture('m8-steps',1),d=m.customerStop,s=m.wellnessStage;B.take(d,'p1');
 assert.equal(S.clear(m,'hose'),false);const box=s.hazards.find(h=>h.id==='hose');Object.assign(m.player,{x:box.x,z:box.z+box.d/2+.03,yaw:0});
 assert.equal(walk(m,box.x,box.z-box.d/2-.03),true);assert.equal(d.state.hazards.hose.incident,true);
 assert.equal(S.clear(m,'hose'),true);for(let n=0;n<40;n++)tick(m,input());assert.equal(S.clear(m,'hose'),false);assert.equal(d.state.hazards.hose.incident,true);assert.equal(d.state.hazards.hose.state,'cleared');
});
test('the closed gate blocks actual walking and its source action opens the same physical gap',()=>{
 const m=fixture('m8-dog'),s=m.wellnessStage,d=m.customerStop;Object.assign(m.player,{x:12,z:-39.8,yaw:0});
 for(let n=0;n<30;n++)tick(m,input({forward:true}));assert.ok(m.player.z>=s.gate.z+.32);assert.equal(d.talk,null);
 assert.equal(K.gate(d),true);O.fpCustomerTalk.advance(d.talk);O.fpCustomerTalk.advance(d.talk);assert.equal(d.talk.phase,'choices');const choice=d.talk.choices.findIndex(ch=>ch.grade==='bad'&&ch.critical);assert.equal(O.fpCustomerTalk.choose(d.talk,choice),true);O.fpCustomerTalk.advance(d.talk);K.presentation(d);S.pose(m);assert.equal(s.gate.open,true);
 // The critical is retained even if the physical gate is subsequently crossed safely.
 assert.ok(d.log.criticals().length);assert.equal(m.blocked(12,s.gate.z),false);
});
test('entering a charging-dog volume starts the original graph once; returning retains its original critical',()=>{
 const m=fixture('m8-dog',1),d=m.customerStop,s=m.wellnessStage,trigger=s.triggers[0];Object.assign(m.player,{x:12,z:trigger.z+trigger.d/2+.06});
 for(let n=0;n<4;n++)tick(m,input({forward:true}),.025);assert.equal(d.talkKey,'charge');const talk=d.talk;
 for(let n=0;n<10;n++)tick(m,input());assert.equal(d.talk,talk);
 d.talk.phase='done';d.wellness.acting=false;K.finishSituation(d);Object.assign(m.player,{x:7,z:-38});tick(m,input());Object.assign(m.player,{x:12,z:trigger.z});tick(m,input());assert.ok(d.log.criticals().some(i=>i.label==='Went back towards a dog that had already charged'));assert.ok(d.wellness.walkTask);
});
test('scripted retreat waits for voluntary physical movement and never changes player/camera coordinates or yaw',()=>{
 const m=fixture('m8-dog',1),d=m.customerStop,s=m.wellnessStage;Object.assign(m.player,{x:9,z:-39,yaw:.7,pitch:.2});
 d.wellness.command={name:'backAway',arg:'van'};let completed=0;d.wellness.acts.backAway('van',()=>completed++);const original=plain(m.player);
 for(let n=0;n<10;n++)tick(m,input());assert.deepEqual(plain(m.player),original);assert.equal(completed,0);assert.deepEqual(plain(s.walkGoal),{x:.05,z:-43.7});
 // Walk around the parked van instead of passing through its collision box.
 assert.equal(walk(m,4,-37.7),true);assert.equal(walk(m,-.1,-37.7),true);assert.equal(walk(m,.05,-43.15,true),true);assert.equal(completed,1);assert.equal(d.wellness.walkTask,null);
});
test('heat cooling facts require real shade or renderer-confirmed enclosure, with water restricted to the van',()=>{
 const m=fixture('m8-heat'),d=m.customerStop,s=m.wellnessStage;assert.equal(S.water(m),false);assert.equal(S.rest(m),false);
 const shade=s.shades.find(h=>h.kind==='tree');Object.assign(m.player,{x:shade.x,z:shade.z});tick(m,input());assert.equal(s.facts.shade,true);assert.equal(S.rest(m),true);for(let n=0;n<60;n++)tick(m,input());assert.equal(d.wellness.ref.heat.cools,1);
 Object.assign(m.player,{x:s.bottle.x,z:s.bottle.z});tick(m,input());assert.equal(S.water(m),true);for(let n=0;n<32;n++)tick(m,input());assert.equal(d.wellness.ref.heat.drinks,1);
 const clinic=fixture('m8-heat',2),q=clinic.wellnessStage;Object.assign(clinic.player,{x:12,z:q.wall+.55});tick(clinic,input());assert.equal(q.facts.interior,false);q.interiorBuilt=true;tick(clinic,input());assert.equal(q.facts.interior,true);
});
test('pause, settings, handheld and a finished stop cannot advance physical facts, timers or heat',()=>{
 const m=fixture('m8-heat'),d=m.customerStop,s=m.wellnessStage;Object.assign(m.player,{x:s.bottle.x,z:s.bottle.z});assert.equal(S.water(m),true);
 const original=JSON.stringify([d.state,d.wellness.ref.heat,d.wellness.clock,s.time,s.dog,s.facts]);
 for(let n=0;n<100;n++){tick(m,input(),.05,false);m.paused=true;S.observe(m,input(),.05,true);m.paused=false;}assert.equal(JSON.stringify([d.state,d.wellness.ref.heat,d.wellness.clock,s.time,s.dog,s.facts]),original);
 B.enter(d,true);K.evaluate(d);const done=JSON.stringify([d.state,d.wellness.ref.heat,s.time]);for(let n=0;n<100;n++)tick(m,input());assert.equal(JSON.stringify([d.state,d.wellness.ref.heat,s.time]),done);
});
