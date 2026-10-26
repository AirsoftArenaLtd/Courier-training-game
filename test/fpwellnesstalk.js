/* Source dog/heat/safety conversations and acts, including bounded loop histories and the charging timeout. */
const test=require('node:test'),assert=require('node:assert/strict'),{c,O,K,B,P,plain,fixture,reference}=require('./tools/fp-wellness-context')(),T=O.fpCustomerTalk;
function original(ref,graph){
 const cast=P.castFor.call(ref),r=Object.create(O.TalkController.prototype);Object.assign(r,{graph,o:{log:ref.log,cats:O.scoring.CATS,feedback:'immediate',acts:P.acts.call(ref,cast)},cast,moods:{},flags:ref.talkFlags,history:[],done:false,cards:[],choiceLayer:{list:[]},timedTag:{setVisible(){}},arrow:{setVisible(){}},scene:{time:{delayedCall(ms,fn){fn();}},tweens:{add(t){t.onComplete?.();}}}});
 for(const [key,a] of Object.entries(cast))r.moods[key]=a.moodStart||0;
 r.say=(node,done)=>done();r.showChoices=node=>{r.choiceList=node.choices.filter(ch=>O.talk.test(ch.if,r.flags));r.mode='choices';};r.showOwn=()=>{};r.coach=(ch,next)=>next();r.setPanelVisible=()=>{};r.finish=node=>{r.done=true;r.mode='done';r.ending=node;ref.dogBusy=false;if(ref.dog&&!ref.dogGone&&ref.dogDef&&!ref.dogDef.patrol)ref.dog.walkTo(P.resolveX.call(ref,ref.dogDef.x,ref.lotX),()=>ref.dog.face(ref.me.x));};r.goto(graph.start);return r;
}
function drive(id,index,key,path,coaching=true){
 const s=fixture(id,index,coaching);B.take(s,'p1');B.exit(s,true);const ref=reference(s),graph=s.def.talks?.[key]||s.content.talks[key];ref.talkCtl=true;assert.equal(K.situation(s,key),true);const r=original(ref,graph);let comparisons=0;
 const settle=()=>{for(let n=0;n<1200;n++){
   K.presentation(s);
   if(s.wellness.acting||r.mode==='acting'){K.step(s,.05,true,{atWalkGoal:true});ref.advance(50,false);continue;}
   if(s.talk.phase==='feedback'){T.advance(s.talk);continue;}
   if(s.talk.phase==='line'){if(s.talk.node.choices){T.advance(s.talk);continue;}assert.equal(r.mode,'line');T.advance(s.talk);r.onAdvance();continue;}
   assert.equal(s.talk.phase,r.done?'done':'choices');assert.equal(s.talk.nodeId,r.nodeId);assert.deepEqual(plain(s.talk.flags),plain(r.flags));assert.deepEqual(plain(s.log.toJSON()),plain(r.o.log.toJSON()));
   if(s.talk.phase==='choices')assert.deepEqual(plain(s.talk.choices.map(ch=>ch.text)),plain(r.choiceList.map(ch=>ch.text)));comparisons++;return;
  }throw Error('A safety conversation did not settle');};
 settle();for(const pick of path){assert.equal(s.talk.phase,'choices');if(pick===-1){assert.equal(T.expire(s.talk),true);r.resolve(Object.assign({grade:'bad',text:'(no decision)'},r.node.timeout||{}),null);}else{T.choose(s.talk,pick);r.resolve(r.choiceList[pick],null);}settle();}
 if(s.talk.phase==='done'){
  assert.equal(K.finishSituation(s),true);assert.equal(K.finishSituation(s),false);assert.deepEqual(plain(s.talk.history),plain(r.history));assert.equal(s.wellness.ref.dogGone,ref.dogGone);assert.equal(s.wellness.ref.gate?.open,ref.gate?.open);assert.equal(s.state.answered,ref.S.answered);assert.equal(s.wellness.ref.stage.locked,0);assert.deepEqual(plain(s.log.toJSON()),plain(ref.log.toJSON()));
  if(ref.heat)assert.deepEqual(plain(s.wellness.ref.heat),plain(ref.heat));assert.equal(s.wellness.ref.dog?.x,ref.dog?.x);
 }
 return {s,r,comparisons};
}
test('all five authored graphs retain every bounded source ending, reply effect, dog-secured flag, critical and timeout',()=>{
 const before=JSON.stringify(c.OTR_DATA.stopSets),specs=[['m8-steps',1,'sam'],['m8-dog',0,'gate'],['m8-dog',1,'charge'],['m8-dog',2,'porch'],['m8-heat',0,'heatSigns']];let endings=0,comparisons=0,timeouts=0,loops=0;
 for(const [id,index,key] of specs){const queue=[[]];while(queue.length){const path=queue.pop(),out=drive(id,index,key,path);comparisons+=out.comparisons;if(out.s.talk.phase==='done'){endings++;continue;}const t=out.s.talk,visits=path.filter((_,i)=>out.s.talk.history[i]?.node===t.nodeId).length;if(visits>=2){loops++;continue;}for(let i=0;i<t.choices.length;i++)queue.push([...path,i]);if(t.node.timer){timeouts++;queue.push([...path,-1]);}}}
 assert.ok(endings>30);assert.ok(timeouts>0&&loops>0);assert.equal(JSON.stringify(c.OTR_DATA.stopSets),before);console.log(JSON.stringify({endings,comparisons,timeouts,boundedRepeatedPrefixes:loops}));
});
test('assessment replies retain original criticals with no trainer transcript or ending bonus',()=>{
 const practice=drive('m8-dog',2,'porch',[1,0]),assessment=drive('m8-dog',2,'porch',[1,0],false);assert.equal(assessment.s.talk.transcript.some(t=>t.speaker==='trainer'),false);assert.deepEqual(plain(practice.s.log.toJSON()),plain(assessment.s.log.toJSON()));assert.ok(assessment.s.log.criticals().length);assert.equal(K.result(assessment.s),null,'a conversation ending is not a completed stop set');
});
test('gate and charging triggers remain once-only, and returning to a charging dog keeps the source critical',()=>{
 const gated=fixture('m8-dog');B.exit(gated,true);assert.equal(K.gate(gated),true);assert.equal(gated.wellness.triggers[0].fired,true);assert.equal(K.gate(gated),false);assert.equal(gated.wellness.ref.gate.open,false);
 const out=drive('m8-dog',1,'charge',[0,0,0]),s=out.s;assert.equal(K.trigger(s,0),true);assert.equal(s.wellness.triggers[0].fired,true);while(s.talk.phase!=='done'){K.presentation(s);if(s.wellness.acting){K.step(s,.05,true,{atWalkGoal:true});continue;}if(['line','feedback'].includes(s.talk.phase))T.advance(s.talk);else T.choose(s.talk,s.talk.choices.findIndex(ch=>ch.grade==='good'));}K.presentation(s);K.finishSituation(s);const before=s.log.criticals().length;assert.equal(K.trigger(s,0),true);assert.equal(s.log.criticals().length,before+1);assert.equal(s.log.items.at(-1).label,'Went back towards a dog that had already charged');assert.ok(s.wellness.walkTask);K.completeWalk(s);assert.equal(s.wellness.ref.stage.locked,0);
});
test('paused actions, stale timer handles and old-stop completion callbacks cannot act on a replacement stop',()=>{
 const s=fixture('m8-heat');let a=0,b=0;const old=K.schedule(s,1,()=>a++);K.step(s,.05);K.schedule(s,1,()=>b++);old.remove();K.step(s,.05);assert.equal(a,1);assert.equal(b,1);
 const dog=drive('m8-dog',1,'charge',[0,0]);assert.equal(dog.s.talk.phase,'choices');T.choose(dog.s.talk,1);T.advance(dog.s.talk);K.presentation(dog.s);T.advance(dog.s.talk);K.presentation(dog.s);const callback=dog.s.wellness.walkDone;assert.equal(typeof callback,'function');{dog.s.phase='report';K.next(dog.s);const before=JSON.stringify([dog.s.state,dog.s.wellness.ref.heat,dog.s.talk]);callback();assert.equal(JSON.stringify([dog.s.state,dog.s.wellness.ref.heat,dog.s.talk]),before);}
});
