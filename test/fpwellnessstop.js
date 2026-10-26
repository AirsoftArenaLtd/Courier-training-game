/* Original M8 hazards, heat/actions, recovery, stop evaluator and local-log guards; no rendering claim. */
const test=require('node:test'),assert=require('node:assert/strict'),{c,O,K,B,P,specs,plain,fixture,step,reference}=require('./tools/fp-wellness-context')();
const hazardState=s=>Object.fromEntries(Object.entries(s.hazards).map(([k,h])=>[k,Object.fromEntries(['id','type','label','state','incident','fastT','wobbled','withLoad'].filter(k=>h[k]!==undefined).map(k=>[k,h[k]]))]));
test('every authored hazard keeps actual source dimensions, fall thresholds, careful recovery and irreversible loaded falls',()=>{
 let cases=0;
 for(let index=0;index<3;index++)for(const loaded of [false,true])for(const action of ['careful','fast','recover','clear-after-fall']){
  const s=fixture('m8-steps',index),r=reference(s);B.exit(s,true);r.S.inVan=false;if(loaded){B.take(s,'p1');r.S.carrying=['p1'];}assert.deepEqual(Object.keys(s.state.hazards),Object.keys(r.S.hazards));
  for(let j=0;j<s.wellness.hazards.length;j++){
   const h=s.wellness.hazards[j],source=Object.values(r.S.hazards)[j];for(let n=0;n<12;n++){const careful=action==='careful'||action==='recover'&&n>=1;K.hazard(s,h.id,true,careful,.05);r.me.moving=true;r.zones[j].onInside(r.me,careful,.05);}
   if(action==='clear-after-fall'&&['hose','toys'].includes(h.type)){const n=s.wellness.hazards.filter(h=>['hose','toys'].includes(h.type)).indexOf(h);assert.equal(K.clear(s,h.id),true);r.clears[n].onUse();step(s,.5);r.advance(500,false);assert.equal(K.clear(s,h.id),false);assert.equal(h.incident,loaded);assert.equal(source.incident,loaded);}
   cases++;
  }
  assert.deepEqual(hazardState(s.state),hazardState(r.S));s.state.elapsed=r.S.elapsed=100;B.enter(s,true);r.S=plain(s.state);r.evaluate();assert.equal(K.evaluate(s),true);assert.deepEqual(plain(s.log.toJSON()),plain(r.log.toJSON()));
 }
 assert.equal(cases,64);console.log(JSON.stringify({hazardCases:cases}));
});
test('heat rates match the actual source in the cab, sun, shade and indoors while moving/carrying, and pause is inert',()=>{
 let cases=0;
 for(let index=0;index<3;index++)for(const region of ['cab','sun','shade','inside'])for(const moving of [false,true])for(const carrying of [false,true]){
  const s=fixture('m8-heat',index),r=reference(s);if(region!=='cab'){B.exit(s,true);r.S.inVan=false;}if(carrying){B.take(s,'p1');r.S.carrying=['p1'];}r.me.moving=moving;r.shade=region==='shade';r.inInterior=region==='inside';const facts={moving,shade:r.shade,interior:r.inInterior};
  for(let n=0;n<40;n++){K.step(s,.05,true,facts);r.advance(50);}assert.deepEqual(plain(s.wellness.ref.heat),plain(r.heat));assert.equal(s.state.elapsed,r.S.elapsed);
  const before=JSON.stringify([s.state,s.wellness.ref.heat,s.wellness.clock]);for(let n=0;n<200;n++)K.step(s,.05,false,facts);assert.equal(JSON.stringify([s.state,s.wellness.ref.heat,s.wellness.clock]),before);cases++;
 }
 assert.equal(cases,48);console.log(JSON.stringify({heatRateCases:cases}));
});
test('water and AC use the original delayed callbacks and costs, and invalid or paused actions cannot complete',()=>{
 for(const action of ['water','ac','shade']){
  const s=fixture('m8-heat'),r=reference(s);if(action==='shade'){B.exit(s,true);r.S.inVan=false;s.wellness.shade=true;r.shade=true;}
  if(action==='water'){assert.equal(K.water(s),true);r.drinkWater();assert.equal(K.water(s),false);}else{assert.equal(K.rest(s),true);r.coolDown(null,action==='ac'?3500:3000);assert.equal(K.rest(s),false);}
  const before=JSON.stringify([s.wellness.ref.heat,s.state.elapsed]);for(let n=0;n<100;n++)K.step(s,.05,false);assert.equal(JSON.stringify([s.wellness.ref.heat,s.state.elapsed]),before);
  for(let n=0;n<80;n++){K.step(s,.05,true,{shade:action==='shade'});r.advance(50);}assert.deepEqual(plain(s.wellness.ref.heat),plain(r.heat));assert.equal(s.state.elapsed,r.S.elapsed);assert.equal(s.wellness.ref.stage.locked,0);
 }
 const s=fixture('m8-heat');B.exit(s,true);assert.equal(K.rest(s),false);const ordinary=fixture('m8-steps');assert.equal(K.water(ordinary),false);assert.equal(K.rest(ordinary),false);
});
test('heat warning/rearm and collapse keep the actual critical and omit stop-time credit after collapse',()=>{
 const s=fixture('m8-heat'),r=reference(s);B.exit(s,true);r.S.inVan=false;s.wellness.ref.heat.temp=r.heat.temp=71.99;K.step(s,.05);r.advance(50);assert.equal(s.wellness.pending,'heatSigns');assert.deepEqual(Array.from(r.pending),['heatSigns']);assert.deepEqual(plain(s.wellness.ref.heat),plain(r.heat));
 s.wellness.pending=null;s.wellness.ref.heat.temp=r.heat.temp=54;s.wellness.ref.heat.hyd=r.heat.hyd=70;K.step(s,.05,true,{shade:true});r.shade=true;r.advance(50);assert.equal(s.wellness.ref.heat.warned,false);assert.deepEqual(plain(s.wellness.ref.heat),plain(r.heat));
 s.wellness.ref.heat.temp=r.heat.temp=95.99;K.step(s,.05);r.shade=false;r.advance(50);assert.equal(s.wellness.ref.collapsed,true);assert.equal(r.collapsed,true);assert.deepEqual(plain(s.log.toJSON()),plain(r.log.toJSON()));assert.equal(K.water(s),false);assert.equal(K.rest(s),false);step(s,1.6);assert.equal(s.wellness.collapsedReady,true);assert.equal(K.evaluate(s),true);r.evaluate();assert.deepEqual(plain(s.log.toJSON()),plain(r.log.toJSON()));assert.ok(!s.log.items.some(x=>/Finished the stop/.test(x.label)));assert.ok(s.log.criticals().some(x=>x.label==='Heat illness: collapsed on the route'));
});
test('every stop retains source delivery/exception/hazard/heat scoring, original groups and pars',()=>{
 let cases=0;const before=JSON.stringify(c.OTR_DATA.stopSets);
 for(const spec of specs)for(let index=0;index<3;index++)for(const outcome of ['left','recipient','reception','UN','NA','unfinished'])for(const correct of [false,true])for(const elapsed of [0,170,250,600]){
  const s=fixture(spec.id,index);B.take(s,correct?'p1':'d1');B.scan(s,correct?'p1':'d1',correct);B.exit(s,correct);s.state.elapsed=elapsed;s.state.knocks=correct?1:0;
  if(outcome==='left')B.leave(s,{grade:correct?'good':'private',pkgIn:true,doorIn:true,numIn:!correct,personIn:false});else if(['recipient','reception'].includes(outcome)&&s.def.answer){s.state.answered=true;B.requestSignature(s,outcome);B.signed(s);B.recordSigner(s,correct?s.def.answer.name:'Occupant');}else if(['UN','NA'].includes(outcome)){B.exception(s,outcome);if(correct){B.printTag(s);B.attachTag(s);}}
  B.enter(s,correct);const r=reference(s);r.S=plain(s.state);r.heat=s.wellness.ref.heat?plain(s.wellness.ref.heat):null;r.evaluate();assert.equal(K.evaluate(s),true);assert.deepEqual(plain(s.log.toJSON()),plain(r.log.toJSON()));assert.equal(K.evaluate(s),false);cases++;
 }
 assert.equal(cases,432);assert.equal(JSON.stringify(c.OTR_DATA.stopSets),before);console.log(JSON.stringify({evaluationCases:cases}));
});
test('next-stop recovery and final result match the actual original nextStop rule without course/workday writes',()=>{
 O.save={data:{workday:{current:{seed:3}}}};O.workday={events:[{type:'brief.read',key:'suspended'}],report(){throw Error('Unexpected workday report');}};const outside=JSON.stringify([O.save.data,O.workday.events]);
 for(const collapsed of [false,true])for(const hyd of [0,55,95])for(const temp of [20,65,100]){
  const s=fixture('m8-heat');s.wellness.ref.heat.hyd=hyd;s.wellness.ref.heat.temp=temp;s.wellness.ref.collapsed=collapsed;const r=reference(s);r.collapsed=collapsed;r.stopIndex=0;r.scenarioId='m8-heat';r.clockMin=100;let carry;O.fx.transition=(scene,key,data)=>{carry=data.carry;};assert.equal(K.evaluate(s),true);r.nextStop();assert.equal(K.next(s),true);assert.deepEqual(plain(s.wellness.ref.heat).hyd,carry.heat.hyd);assert.deepEqual(plain(s.wellness.ref.heat).temp,carry.heat.temp);
 }
 const s=fixture('m8-steps',2);K.evaluate(s);let original;P.nextStop.call({set:s.content,stopIndex:2,shiftMode:false,heat:null,log:s.log,cats:s.categories,finish(r){original=r;}});K.next(s);const result=K.result(s);assert.equal(result.score,original.score);assert.deepEqual(plain(result.ratios),plain(original.ratios));assert.deepEqual(plain(result.stats.log),plain(original.stats.log));assert.equal(K.result(s),result);assert.equal(K.next(s),false);assert.equal(K.water(s),false);assert.equal(JSON.stringify([O.save.data,O.workday.events]),outside);
});
function goodTalk(s,key){assert.equal(K.situation(s,key),true);let n=0;while(s.talk.phase!=='done'&&n++<500){K.presentation(s);if(s.wellness.acting){K.step(s,.05,true,{atWalkGoal:true});continue;}if(['line','feedback'].includes(s.talk.phase))O.fpCustomerTalk.advance(s.talk);else O.fpCustomerTalk.choose(s.talk,s.talk.choices.findIndex(ch=>ch.grade==='good'));}assert.ok(n<500);K.presentation(s);assert.equal(K.finishSituation(s),true);}
test('all three complete good sets retain source final scales, full ratios and three distinct stop groups',()=>{
 const scores={};for(const spec of specs){const s=fixture(spec.id);for(let index=0;index<3;index++){
  assert.equal(s.index,index);B.take(s,'p1');B.scan(s,'p1',true);if(spec.id==='m8-heat'){K.water(s);step(s,1.6);K.rest(s);step(s,3.5);}B.exit(s,true);
  for(const h of s.wellness.hazards){if(['hose','toys'].includes(h.type)){assert.equal(K.clear(s,h.id),true);step(s,.5);}else K.hazard(s,h.id,true,true,.05);}
  if(spec.id==='m8-dog'){const key=['gate','charge','porch'][index];goodTalk(s,key);}
  else if(s.def.answer){B.knock(s);step(s,8);if(s.def.answer.talk)goodTalk(s,s.def.answer.talk);}
  else {B.knock(s);step(s,8);}
  if(s.def.expected.outcome==='exception'){B.exception(s,s.def.expected.code);}
  else if(s.def.expected.types.includes('left'))B.leave(s,{grade:'good',pkgIn:true,doorIn:true,numIn:false,personIn:false});
  else {assert.equal(B.requestSignature(s,s.def.expected.types[0]),true);B.signed(s);B.recordSigner(s,s.def.answer.name);}
  B.enter(s,true);assert.equal(K.evaluate(s),true);K.next(s);
 }
 let original;P.nextStop.call({set:s.content,stopIndex:2,shiftMode:false,heat:s.wellness.ref.heat,collapsed:false,log:s.log,cats:s.categories,finish(r){original=r;}});const result=K.result(s);assert.equal(result.score,original.score);assert.deepEqual(plain(result.ratios),plain(original.ratios));assert.deepEqual(plain(result.stats.log),plain(original.stats.log));for(const value of Object.values(result.ratios))assert.equal(value,1);assert.equal(new Set(s.log.items.map(i=>i.group)).size,3);scores[spec.id]=result.score;
 }console.log(JSON.stringify({completeGoodScores:scores}));
});
