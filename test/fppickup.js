/* Compare pickup actions with the actual original count, invoice, parcel and final callbacks. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const c={Phaser:{Scene:class{}},Date:class extends Date{static now(){return 123;}}};c.window=c;vm.createContext(c);
for(const file of ['data/theme.js','data/config.js','data/modules.js','data/m7_pickups.js','src/core/theme.js','src/core/scoring.js','src/core/scorelog.js','src/core/talk.js','src/core/fpcustomertalk.js','src/scenes/BaseScenarioScene.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+file,'utf8'),c);
const O=c.OTR;O.registerScene=P=>{O.ReferencePickup=P;};O.audio={play(){}};O.util.shuffle=a=>a;
O.ui={toast(){},modal(scene,spec){scene.lastModal=spec;if(scene.captureCount&&spec.build)spec.build({add(){}},{close:fn=>fn()},spec.w,spec.h);},button(){return {};}};
vm.runInContext(fs.readFileSync(__dirname+'/../src/scenes/m7/PickupScene.js','utf8'),c);
vm.runInContext(fs.readFileSync(__dirname+'/../src/core/fppickup.js','utf8'),c);
const K=O.fpPickup,P=O.ReferencePickup.prototype,plain=x=>JSON.parse(JSON.stringify(x)),specs=c.OTR_DATA.modules.find(m=>m.id==='m7').scenarios;
function pair(id){
 const spec=specs.find(s=>s.id===id),C=c.OTR_DATA.pickups[id.replace('-','_')],s=K.create(id,C,spec.categories),r=Object.create(P);
 Object.assign(r,{content:C,cats:spec.categories,pieces:C.pieces.map(p=>({...p})),manifest:C.manifest,counted:{},decided:{},docFlags:{},docDone:false,countAnswered:false,shortRaised:0,elapsed:0,log:new O.ScoreLog(),pieceImgs:{},tweens:{add(){}},refreshPanel(){},finish(result){this.result=result;}});
 for(const p of r.pieces)r.pieceImgs[p.id]={setTint(){}};
 K.begin(s);return {s,r,C};
}
function same(s,r){assert.deepEqual(plain(s.log.toJSON()),plain(r.log.toJSON()));assert.equal(s.manifest,r.manifest);assert.equal(s.countAnswered,r.countAnswered);assert.equal(s.docDone,r.docDone);assert.equal(s.shortRaised,r.shortRaised||0);assert.deepEqual(plain(s.decided),plain(r.decided));}
function talk(x,choice=0){
 const {s,r}=x;let guard=0;while(s.stage==='talk'){
  assert.ok(++guard<30);if(s.talk.phase==='choices'){
   const node=s.talk.node,ch=s.talk.choices[choice];const scorer={o:{log:r.log,cats:O.scoring.CATS},cast:{},moods:{},flags:{}};
   O.TalkController.prototype.applyEffects.call(scorer,ch.effects,node.check,ch,node);assert.ok(K.chooseTalk(s,choice));
  }else assert.ok(K.advanceTalk(s));
 }same(s,r);
}
function options(r){r.captureCount=true;P.confirmCount.call(r);r.captureCount=false;return r.countChoices;}
function countAll(x){for(const p of x.s.pieces){assert.ok(K.count(x.s,p.id));x.r.counted[p.id]=true;}const original=options(x.r);const id=K.countChoices(x.s)[0].id;K.answerCount(x.s,id);P.answerCount.call(x.r,original[0]);same(x.s,x.r);}
function docs(x,mask){if(!x.C.docs)return;for(let i=0;i<x.C.docs.fields.length;i++)if(mask===undefined?x.C.docs.fields[i].bad:(mask&(1<<i))){K.flag(x.s,i);x.r.docFlags[i]=true;}assert.ok(K.submitDocs(x.s));P.openDocs.call(x.r);x.r.lastModal.buttons[0].onClick();same(x.s,x.r);}
function prepared(id,choice=0){const x=pair(id);talk(x,choice);countAll(x);docs(x);return x;}
function decision(x,id,accept,reason){assert.ok(K.decide(x.s,id,accept,reason));P.decide.call(x.r,x.r.pieces.find(p=>p.id===id),accept,reason);same(x.s,x.r);}
function complete(x,seconds){
 for(const p of x.s.pieces)if(!x.s.decided[p.id])decision(x,p.id,p.accept,p.reason||null);
 x.s.elapsed=x.r.elapsed=seconds;assert.ok(K.receipt(x.s));if(K.accepted(x.s).length){assert.equal(K.complete(x.s),false);assert.ok(K.signed(x.s));assert.equal(K.signed(x.s),false);}assert.ok(K.complete(x.s));P.endScenario.call(x.r);
 assert.deepEqual(plain(K.result(x.s)),plain(x.r.result));assert.equal(K.complete(x.s),false);return x.s.result;
}
test('every count choice at each partial/full count matches actual source options, recounts and checks',()=>{
 let comparisons=0;
 for(const spec of specs){const C=c.OTR_DATA.pickups[spec.id.replace('-','_')];for(let n=1;n<=C.pieces.length;n++)for(let choice=0;choice<3;choice++){
  const x=pair(spec.id);talk(x);for(const p of x.s.pieces.slice(0,n)){K.count(x.s,p.id);x.r.counted[p.id]=true;}
  const authored=options(x.r),ours=K.countChoices(x.s);assert.deepEqual(plain(ours.map(o=>o.text)),plain(authored.map(o=>o.text)));
  K.answerCount(x.s,ours[choice].id);P.answerCount.call(x.r,authored[choice]);same(x.s,x.r);comparisons++;
 }}assert.equal(comparisons,36);console.log(JSON.stringify({countComparisons:comparisons}));
});
test('raising a short count never reconciles it; the eventual full recount retains the source second-try penalty',()=>{
 const x=pair('m7-business');talk(x);for(const p of x.s.pieces.slice(0,3)){K.count(x.s,p.id);x.r.counted[p.id]=true;}
 assert.equal(K.answerCount(x.s,'raise'),'recount');P.answerCount.call(x.r,options(x.r)[0]);same(x.s,x.r);assert.equal(x.s.countAnswered,false);assert.equal(x.s.manifest,7);assert.equal(x.s.log.items.length,2);
 for(const p of x.s.pieces.slice(3)){K.count(x.s,p.id);x.r.counted[p.id]=true;}assert.equal(K.answerCount(x.s,'raise'),true);P.answerCount.call(x.r,options(x.r)[0]);same(x.s,x.r);assert.equal(x.s.manifest,6);assert.equal(x.s.log.items.find(i=>i.label.includes('second try')).got,0);
});
test('all 2048 invoice flag sets retain original misses, false-positive subtraction, first lesson and irreversible submission',()=>{
 let comparisons=0;for(let mask=0;mask<2048;mask++){
  const x=pair('m7-intl');talk(x);countAll(x);docs(x,mask);const before=JSON.stringify(x.s.log.toJSON());assert.equal(K.submitDocs(x.s),false);assert.equal(K.flag(x.s,0),false);assert.equal(JSON.stringify(x.s.log.toJSON()),before);comparisons++;
 }assert.equal(comparisons,2048);console.log(JSON.stringify({invoiceFlagComparisons:comparisons}));
});
test('every parcel accept/refusal/reason and all time boundaries match original criticals, points, ratios and final results',()=>{
 let results=0,criticals=0;
 for(const spec of specs){const C=c.OTR_DATA.pickups[spec.id.replace('-','_')];for(const p of C.pieces)for(const choice of [null,...c.OTR_DATA.pickups.reasons.map(r=>r.id)])for(const seconds of [0,C.par,C.par+.01,C.par*1.5,C.par*1.5+.01]){
  const x=prepared(spec.id);decision(x,p.id,choice===null,choice);const answer=x.s.log.items.filter(i=>/^(Accepted|Refused) /.test(i.label)).at(-1);
  if(answer.critical)criticals++;const result=complete(x,seconds);assert.ok(result.score>=0);results++;
 }}assert.equal(results,360);assert.ok(criticals>0);console.log(JSON.stringify({originalResultComparisons:results,criticalAnswers:criticals}));
});
test('all authored conversation answers keep original penalties and criticals, even when every subsequent parcel call is right',()=>{
 let choices=0;for(const spec of specs){const C=c.OTR_DATA.pickups[spec.id.replace('-','_')],node=Object.values(C.talk.nodes).find(n=>n.choices);for(let i=0;i<node.choices.length;i++){
  const x=prepared(spec.id,i),result=complete(x,0);if(node.choices[i].critical)assert.ok(result.log.items.some(it=>it.critical));choices++;
 }}assert.equal(choices,8);
});
test('no count, inspection, invoice, receipt or duplicate decision can bypass its phase; pauses preserve clocks and outside state',()=>{
 const outside=JSON.stringify(c.OTR_DATA.pickups),x=pair('m7-intl'),s=x.s;assert.equal(K.decide(s,'i1',true),false);assert.equal(K.receipt(s),false);assert.equal(K.answerCount(s,'match'),false);assert.equal(K.step(s,10,false),false);assert.equal(s.elapsed,0);K.step(s,10);assert.equal(s.elapsed,.05);
 talk(x);assert.equal(K.count(s,'invented'),false);assert.equal(K.count(s,'i1'),true);assert.equal(K.count(s,'i1'),false);assert.equal(K.decide(s,'i1',true),false);assert.equal(K.submitDocs(s),false);
 K.count(s,'i2');assert.equal(K.answerCount(s,'match'),true);assert.equal(K.answerCount(s,'match'),false);assert.equal(K.decide(s,'i1',true),false);assert.equal(K.flag(s,-1),false);assert.equal(K.flag(s,11),false);K.submitDocs(s);assert.equal(K.decide(s,'i1',false,'invented'),false);assert.equal(K.decide(s,'i1',false,'DOC'),true);const log=JSON.stringify(s.log.toJSON());assert.equal(K.decide(s,'i1',true),false);assert.equal(JSON.stringify(s.log.toJSON()),log);assert.equal(K.receipt(s),false);K.decide(s,'i2',false,'DOC');K.receipt(s);assert.equal(K.signed(s),false);assert.equal(K.complete(s),true);assert.equal(K.step(s,.05),false);assert.equal(K.result(s),s.result);assert.equal(JSON.stringify(c.OTR_DATA.pickups),outside);
 assert.throws(()=>K.create('m7-invented',x.C,['service']),/Invalid/);assert.throws(()=>K.create('m7-intl',x.C,['safety']),/Invalid/);
});
