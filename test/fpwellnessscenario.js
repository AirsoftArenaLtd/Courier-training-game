/* Playable safety stops through actual mission motion, visible rays and guarded control callbacks. */
const test=require('node:test'),assert=require('node:assert/strict'),{c,O,K,B,A,S,F,fixture,tick,wait,panel,device,walk,talk,use,plain}=require('./tools/fp-wellness-scenario-context')();
function cargo(scene){
 use(scene,'cab-exit');panel(scene,'Face the cab');const p=scene.model.player;assert.equal(walk(scene,p.x,-38.2),'arrived');assert.equal(walk(scene,1.7,-38.2),'arrived');use(scene,'cargo');use(scene,'customer-stop-parcel-p1');panel(scene,'Take this package');A.handheld(scene.scenarioSession,scene);device(scene,'Scan the carried packages.');scene.closePanel();use(scene,'cargo');
}
function sign(scene,type){
 use(scene,'customer-stop-person');scene.closePanel();
 A.handheld(scene.scenarioSession,scene);device(scene,'Record a delivery.');let n=0;
 while(scene.handheld.page.options[0].label!==A.labels[type]&&n++<8)device(scene,'Read the next delivery method.');assert.ok(n<8);device(scene,A.labels[type]);assert.ok(scene.handheld.page.widget);scene.handheld.page.widget.onDone();
 const d=scene.model.customerStop;while(!scene.panel.choices[0].label.includes(d.def.answer.name)&&n++<12)panel(scene,'Read the next name.');panel(scene,`Record ${d.def.answer.name} as the signer.`);scene.closePanel();
}
async function photo(scene){
 A.handheld(scene.scenarioSession,scene);device(scene,'Record a delivery.');for(let n=0;n<3;n++)device(scene,'Read the next delivery method.');device(scene,A.labels.left);device(scene,'Place the package');
 assert.equal(scene.model.customerStop.photoMode,true);const wall=scene.model.scannerStage.wall;
 walk(scene,14.8,wall+.4);Object.assign(scene.model.player,{yaw:Math.atan2(-2.8,-(-.1)),pitch:.8});scene.sync();const p=scene.art.customerStop.photo(scene.view.camera);assert.equal(p.grade,'good',JSON.stringify(p));await A.capturePhoto(scene);device(scene,'Use this photo for the delivery.');
}
function returnToVan(scene){
 scene.handheld.close();scene.closePanel();const m=scene.model;
 assert.equal(walk(scene,7,-38.2),'arrived');assert.equal(walk(scene,-.1,-38.2),'arrived');assert.equal(walk(scene,-.1,-43.7),'arrived');use(scene,'driver');panel(scene,'Hold the grab handle');if(!m.customerStop.state.outcome){panel(scene,'Leave this stop now.');panel(scene,'Leave the stop without a record.');}assert.equal(m.customerStop.phase,'report');
}
test('all three good safety sets use the real controls and source result scale, with one result and no workday writes',async()=>{
 O.workday.events=[{type:'brief.read',key:'suspended'}];O.save={data:{workday:{current:{seed:55}}}};const outside=JSON.stringify([O.workday.events,O.save.data]);
 const original=require('./tools/fp-wellness-original'),finish=K.finishSituation,evaluate=K.evaluate;let observed=[],conversations=[];
 K.finishSituation=function(d){const result=finish.call(this,d);if(result)conversations.push({key:d.talkKey,history:plain(d.talk.history)});return result;};
 K.evaluate=function(d){const observation={index:d.index,state:plain(d.state),heat:plain(d.wellness.ref.heat),collapsed:d.wellness.ref.collapsed,conversations:conversations.slice()},result=evaluate.call(this,d);if(result){observed.push(observation);conversations=[];}return result;};
 try{
 for(const id of ['m8-steps','m8-dog','m8-heat']){
  observed=[];conversations=[];
  const scene=fixture(id),m=scene.model,d=m.customerStop;try{for(let index=0;index<3;index++){
   assert.equal(d.index,index);if(id==='m8-heat'){A.safety(scene);device(scene,'Drink some water.');wait(scene,1.6);A.safety(scene);device(scene,'Take a cooling break.');wait(scene,3.5);}
   cargo(scene);
   if(id==='m8-dog'){
    if(index===0){walk(scene,12,-38.8);use(scene,'wellness-gate');talk(scene);}
    else{walk(scene,12,index===1?-41.7:m.scannerStage.wall+1.7);talk(scene);}
   }else{
    if(id==='m8-steps'&&index===1){for(const h of m.wellnessStage.hazards.filter(h=>['hose','toys'].includes(h.type))){const z=h.z+(h.type==='hose'?-.45:-.2)+1;walk(scene,h.x+(h.type==='toys'?-.3:0),z);use(scene,'wellness-clear-'+h.id);wait(scene,.5);}}
    if(id==='m8-heat')walk(scene,10,-38.5,{careful:false});walk(scene,12,m.scannerStage.wall+1.9,{careful:id==='m8-steps'});use(scene,'customer-stop-door');panel(scene,'Knock on the door');wait(scene,6);
    if(d.def.answer?.talk){use(scene,'customer-stop-person');talk(scene);}
   }
   if(d.def.expected.outcome==='exception'){A.handheld(scene.scenarioSession,scene);device(scene,'Record an exception.');let n=0;while(scene.handheld.page.options[0].label!=='Record exception UN.'&&n++<20)device(scene,'Read the next exception code.');device(scene,'Record exception UN.');scene.closePanel();}
   else if(d.def.expected.types.includes('left'))await photo(scene);
   else{if(id==='m8-dog'&&index===2)walk(scene,12,m.scannerStage.wall+1.9);if(d.def.lot.interior)walk(scene,12,m.scannerStage.wall+.7,{careful:false});sign(scene,d.def.expected.types[0]);}
   returnToVan(scene);panel(scene,index<2?'Continue to the next stop.':'Finish the scenario.');
  }
  assert.ok(scene.completed);assert.equal(scene.completed.result.score,{'m8-steps':7500,'m8-dog':6700,'m8-heat':6900}[id]);for(const value of Object.values(scene.completed.result.ratios))assert.equal(value,1);assert.equal(F.finish(scene.scenarioSession,scene),false);assert.deepEqual(original.normalize(scene.completed.result),original.replay(id,observed).result);
 }finally{scene.art.dispose();}}
 assert.equal(JSON.stringify([O.workday.events,O.save.data]),outside);
 }finally{K.finishSituation=finish;K.evaluate=evaluate;}
});
test('paused/closed/replaced controls, source activity locks and abandoned callbacks cannot alter a stop',()=>{
 const scene=fixture('m8-heat'),m=scene.model,d=m.customerStop;try{
  A.safety(scene);const old=scene.handheld.page.options[0].onPick;scene.handheld.close();old();assert.equal(d.wellness.ref.stage.locked,0);
  A.safety(scene);const replaced=scene.handheld.page.options[0].onPick;A.handheld(scene.scenarioSession,scene);replaced();assert.equal(d.wellness.ref.stage.locked,0);
  A.safety(scene);device(scene,'Drink some water.');const before=JSON.stringify([d.state,d.wellness.ref.heat,d.wellness.clock]);scene.showPause();wait(scene,5);assert.equal(JSON.stringify([d.state,d.wellness.ref.heat,d.wellness.clock]),before);scene.closePanel();
  const p=plain(m.player);tick(scene,.05,{forward:true});assert.deepEqual(plain(m.player),p,'the drinking lock stops physical movement');wait(scene,1.6);assert.equal(d.wellness.ref.heat.drinks,1);
  A.exit(scene);const climb=scene.panel.choices[0].action;scene.closePanel();climb();assert.equal(d.state.inVan,true);
  F.abandon(scene.scenarioSession);const state=JSON.stringify([d.state,d.wellness.ref.heat,d.wellness.clock]);for(let n=0;n<100;n++)scene.scenarioSession.definition.tick(scene.scenarioSession,scene,.05,true);assert.equal(JSON.stringify([d.state,d.wellness.ref.heat,d.wellness.clock]),state);
 }finally{scene.art.dispose();}
});
function select(scene,index){const d=scene.model.customerStop;d.index=index;B.prepare(d);K.prepare(d);A.configure(scene.scenarioSession,scene.model);B.begin(d);scene.rebuildWorld();scene.closePanel();scene.sync();return d;}
function decision(scene,node){const d=scene.model.customerStop;let n=0;while((d.talk.nodeId!==node||d.talk.phase!=='choices')&&n++<1500){if(d.wellness.acting){tick(scene);continue;}if(!scene.panel)A.present(scene);if(d.talk.phase==='choices')O.fpCustomerScenario.present(scene,d.talk.choices.findIndex(ch=>ch.grade==='good'));scene.panel.choices[0].action();}assert.ok(n<1500);}
test('timed source replies advance once while read, stop in pause/handheld controls, and expire once',()=>{
 const scene=fixture('m8-dog');try{const d=select(scene,1);A.climbDown(scene,true);K.situation(d,'charge');A.present(scene);decision(scene,'c1');const t=d.talk,before=t.remaining;wait(scene,.5);assert.ok(Math.abs(t.remaining-before+.5)<1e-8);
  A.handheld(scene.scenarioSession,scene);const paused=JSON.stringify([t.remaining,d.wellness.clock,d.state.elapsed]);wait(scene,2);assert.equal(JSON.stringify([t.remaining,d.wellness.clock,d.state.elapsed]),paused);scene.handheld.close();A.present(scene);
  scene.showPause();wait(scene,2);assert.equal(JSON.stringify([t.remaining,d.wellness.clock,d.state.elapsed]),paused);scene.closePanel();A.present(scene);wait(scene,t.remaining+.1);assert.equal(t.history.length,1);assert.equal(t.history[0].text,'(no decision)');assert.equal(t.remaining,null);assert.equal(d.log.criticals().length,0);const partial=d.log.items.find(item=>item.label==='Reacted to a charging dog');assert.ok(partial.partial);assert.equal(partial.got,1);assert.equal(partial.max,3);wait(scene,2);assert.equal(t.history.length,1);
 }finally{scene.art.dispose();}
});
test('physical NPC acts wait for movement, preserve the courier pose, pause inertly and reject abandoned completions',()=>{
 const oldReduced=O.fpAccess.reduced;O.fpAccess.reduced=()=>false;const scene=fixture('m8-dog');try{
  A.climbDown(scene,true);walk(scene,12,-38.8);use(scene,'wellness-gate');const d=scene.model.customerStop,s=scene.model.wellnessStage,p=plain(scene.model.player),start={x:s.dog.x,z:s.dog.z};assert.equal(d.wellness.acting,true);const stale=s.dogTask.done;
  wait(scene,.2);assert.notDeepEqual({x:s.dog.x,z:s.dog.z},start);assert.deepEqual(plain(scene.model.player),p);
  scene.showPause();const paused=JSON.stringify([s.dog,d.wellness.clock,d.talk.entries]);wait(scene,2);assert.equal(JSON.stringify([s.dog,d.wellness.clock,d.talk.entries]),paused);scene.closePanel();wait(scene,4);assert.equal(d.wellness.acting,false);assert.equal(d.talk.phase,'line');assert.ok(scene.panel);
  F.abandon(scene.scenarioSession);const abandoned=JSON.stringify([d.state,d.talk.entries,d.talkFlags]);stale();assert.equal(JSON.stringify([d.state,d.talk.entries,d.talkFlags]),abandoned);
 }finally{scene.art.dispose();O.fpAccess.reduced=oldReduced;}
});
test('a scripted cooling response waits for real shade and then invokes the original cooling and drink callbacks',()=>{
 const scene=fixture('m8-heat');try{A.climbDown(scene,true);Object.assign(scene.model.player,{x:10,z:-38.5});scene.model.customerStop.wellness.ref.heat.temp=72.1;tick(scene);const d=scene.model.customerStop;assert.equal(d.talkKey,'heatSigns');decision(scene,'h1');O.fpCustomerScenario.present(scene,d.talk.choices.findIndex(ch=>ch.grade==='good'));scene.panel.choices[0].action();scene.panel.choices[0].action();
  assert.ok(scene.model.wellnessStage.coolTask);const pose=plain(scene.model.player);wait(scene,1);assert.deepEqual(plain(scene.model.player),pose);assert.equal(d.wellness.ref.heat.cools,0);
  const goal=scene.model.wellnessStage.coolTask;walk(scene,goal.x,goal.z,{careful:false});talk(scene);assert.equal(d.wellness.ref.heat.cools,1);assert.equal(d.wellness.ref.heat.drinks,1);assert.equal(scene.model.wellnessStage.facts.shade,true);
 }finally{scene.art.dispose();}
});
test('retreat is slow and voluntary, and its source completion waits for the dog to stay in view',()=>{
 const scene=fixture('m8-dog');try{const d=select(scene,1);A.climbDown(scene,true);Object.assign(scene.model.player,{x:12,z:-39.5});K.situation(d,'charge');A.present(scene);decision(scene,'c2');O.fpCustomerScenario.present(scene,d.talk.choices.findIndex(ch=>ch.grade==='good'));scene.panel.choices[0].action();scene.panel.choices[0].action();assert.ok(d.wellness.walkTask?.keepFacing);
  tick(scene);const goal=scene.model.wellnessStage.walkGoal,p=scene.model.player;assert.deepEqual(plain(goal),{x:4.1,z:-38.4});const before={x:p.x,z:p.z};p.yaw=Math.atan2(goal.x-p.x,-(goal.z-p.z));tick(scene,.05,{forward:true});assert.ok(Math.hypot(p.x-before.x,p.z-before.z)<=.050001);
  Object.assign(p,goal);const dog=scene.model.wellnessStage.dog;p.yaw=Math.atan2(dog.x-p.x,-(dog.z-p.z))+Math.PI;tick(scene);assert.ok(d.wellness.walkTask);const lookingAway=p.yaw;assert.equal(p.yaw,lookingAway);
  p.yaw=Math.atan2(dog.x-p.x,-(dog.z-p.z));tick(scene);assert.equal(d.wellness.walkTask,null);assert.equal(d.talk.nodeId,'c3');
 }finally{scene.art.dispose();}
});
test('clearing a real hose after a loaded trip retains the original critical in the stop report',()=>{
 const scene=fixture();try{const d=select(scene,1);A.climbDown(scene,true);B.take(d,'p1');B.scan(d,'p1',true);const h=scene.model.wellnessStage.hazards.find(h=>h.id==='hose');Object.assign(scene.model.player,{x:h.x,z:h.z+h.d/2+.1});walk(scene,h.x,h.z-h.d/2-.1,{careful:false});assert.equal(d.state.hazards.hose.incident,true);
  Object.assign(scene.model.player,{x:h.x,z:h.z+.55});scene.sync();use(scene,'wellness-clear-hose');wait(scene,.5);assert.equal(d.state.hazards.hose.state,'cleared');assert.equal(d.state.hazards.hose.incident,true);returnToVan(scene);assert.ok(d.log.criticals().some(c=>c.label==='Fell on the garden hose carrying a package'));
 }finally{scene.art.dispose();}
});
test('clinic handover requires entry, uses the physical counter, and rejects a replaced handheld callback during signing',()=>{
 const scene=fixture('m8-heat');try{const d=select(scene,2);A.climbDown(scene,true);B.take(d,'p1');B.scan(d,'p1',true);d.state.answered=true;Object.assign(scene.model.player,{x:12,z:scene.model.scannerStage.wall+1.9});tick(scene);assert.equal(A.nearPerson(scene),false);
  walk(scene,12,scene.model.scannerStage.wall+.7,{careful:false});assert.equal(A.nearPerson(scene),true);use(scene,'customer-stop-person');scene.closePanel();A.handheld(scene.scenarioSession,scene);const oldScan=scene.handheld.page.options[0].onPick;assert.equal(B.requestSignature(d,'reception'),true);A.signature(scene);const widget=scene.handheld.page.widget;oldScan();assert.equal(scene.handheld.isOpen,true);assert.equal(scene.handheld.page.widget,widget);assert.equal(d.signature.ready,false);widget.onDone();assert.equal(d.signature.ready,true);assert.ok(scene.panel.title.includes('printed name'));
 }finally{scene.art.dispose();}
});
test('collapse reports the original emergency once, omits climb-in credit and recovers the next stop as the source does',()=>{
 const scene=fixture('m8-heat');try{A.climbDown(scene,true);const d=scene.model.customerStop;d.wellness.ref.heat.temp=95.99;tick(scene);assert.equal(d.wellness.ref.collapsed,true);wait(scene,1.6);assert.equal(d.phase,'report');const log=JSON.stringify(d.log.toJSON());A.finishStop(scene);assert.equal(JSON.stringify(d.log.toJSON()),log);assert.equal(d.log.criticals().filter(c=>c.label==='Heat illness: collapsed on the route').length,1);assert.ok(!d.log.items.some(c=>c.label==='Climbed back into the cab safely'));panel(scene,'Continue to the next stop.');assert.equal(d.wellness.ref.heat.hyd,80);assert.equal(d.wellness.ref.heat.temp,35);
 }finally{scene.art.dispose();}
});
test('all authored safety climates build the real weather surfaces and valid lighting presets',()=>{
 for(const id of ['m8-steps','m8-dog','m8-heat'])for(let index=0;index<3;index++){
  const scene=fixture(id,{index});try{const d=scene.model.customerStop,weather=d.def.weather||d.content.weather,tod=d.def.tod||d.content.tod;
   assert.equal(O.fpWeather.condition(scene.model),weather);assert.equal(scene.art.lighting.time,tod==='evening'?'dusk':tod==='afternoon'?'midday':tod);
   assert.equal(!!scene.art.weatherParticles,['snow','rain','storm','ice'].includes(weather));if(scene.art.weatherParticles)assert.equal(scene.art.weatherParticles.mesh.count,18);
   assert.equal(scene.art.lighting.sun.castShadow,false);assert.equal(scene.model.wellnessStage.physical,true);
  }finally{scene.art.dispose();}
 }
});
