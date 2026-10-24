/* Nine M5 stops retain the real 2D scanner, photo, ID, tag, evaluator and complete-set result callbacks. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const c={Date:class extends Date{static now(){return 123;}}};c.window=c;vm.createContext(c);
for(const f of ['data/theme.js','data/config.js','data/modules.js','data/scanner.js','data/m5_stops.js','src/core/theme.js','src/core/scoring.js','src/core/scorelog.js','src/core/talk.js','src/core/fpcustomertalk.js','src/core/fpcustomerstop.js','src/core/fpscannerstop.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),c);
const O=c.OTR,K=O.fpCustomerStop,A=O.fpScannerStop,T=O.fpCustomerTalk,plain=x=>JSON.parse(JSON.stringify(x));O.util.shuffle=a=>a;O.util.pick=a=>a[0];O.audio={play(){}};O.fx={shake(){}};
c.BaseScenarioScene=class{};O.registerScene=C=>{O.StopReference=C;};vm.runInContext(fs.readFileSync(__dirname+'/../src/scenes/stops/StopScene.js','utf8'),c);
const specs=c.OTR_DATA.modules.find(m=>m.id==='m5').scenarios,keys=['inVan','carrying','delivered','returned','scanned','scannedInVan','type','signer','outcome','spot','photo','idResult','code','tagPrinted','tagAttached','exitSafe','enterSafe','retakes'];
function fixture(spec,index=0,coaching=true){const s=A.create(spec.id,c.OTR_DATA.stopSets[spec.dataKey.split('.')[1]],spec.categories,{coaching});s.index=index;K.prepare(s);A.prepare(s);K.begin(s);return s;}
function ref(s){
 const rig={x:0,c:{},itemKind:'box',face(){},play(){},playOnce(k,fn){fn();},hold(){},setFacing(){},setExpression(){},emote(){},walkTo(x,fn){this.x=x;fn();}};
 const r=Object.create(O.StopReference.prototype);Object.assign(r,{S:plain(s.state),def:s.def,set:s.content,log:new O.ScoreLog(s.def.id),cats:s.categories,collapsed:false,heat:null,stage:{G:0,lock(){},unlock(){},actors:[{rig}],walkPlayerTo(x,fn){rig.x=x;fn();},groundAt(){return 0;},clampByBarriers(x,y){return y;},prop(){return {setScale(){return this;}};}},lot:{doorX:1000,stepsX0:900,floorY:0},propById:{planter:{x:1100,depth:8}},me:rig,van:{doorX:0,floorY:0},time:{delayedCall(ms,fn){fn();}},tweens:{add(){}},say(){},refreshObjectives(){},confirmFinish(){},updateCarryVisual(){},carriedPkgs(){return s.packages.filter(p=>this.S.carrying.includes(p.id));},resident:s.def.answer?{...rig}:null,hh:{show(p){this.current=p;},open(p){this.current=p;},close(fn){if(fn)fn();}},textures:{exists(){return false;}},chooseAction(title,options,onPick){const op=options[this.selection??0];onPick(op.good,op);},showIdCard(key,name){this.shownId={key,name};},hideIdCard(){this.shownId=null;},startPhoto(){this.photoStarted=true;}});
 O.labelArt={idCard(scene,args){scene.idArgs=args;return 'source-id-card';}};return r;
}
function compare(s,r){for(const key of keys)assert.deepEqual(plain(s.state[key]??null),plain(r.S[key]??null),s.def.id+': '+key);}
function begin(s,good=true){K.take(s,good?'p1':'d1');const r=ref(s);r.hhScan();K.scan(s,good?'p1':'d1',true);r.exitVan();K.exit(s,true);s.state.answered=!!s.def.answer;r.S.answered=s.state.answered;return r;}
function signature(s,r,name){r.hh.current.widget.onDone();r.hh.current.options.find(o=>o.label===name).onPick();K.signed(s);K.recordSigner(s,name);}
function handover(s,r,type,id='ok',name=s.def.answer?.name){
 r.deliverAs(type);const state=A.request(s,type);assert.equal(state,s.def.packages[0].service==='adult'?'identity':'signature');
 if(state==='identity'){
  const card=A.card(s);assert.equal(card.name,r.idArgs.name);assert.equal(card.dob,r.idArgs.dob);assert.equal(card.exp,r.idArgs.exp);assert.equal(card.no,r.idArgs.idNo);assert.equal(card.spec,s.def.answer.spec);assert.equal(card.today,s.content.today||'Today: 09/17/2026');
  const index={ok:0,under:1,invalid:2}[id];r.hh.current.options[index].onPick();const after=A.decide(s,id);assert.equal(after,id==='ok'?'signature':'refused');assert.equal(r.shownId,null);
  if(id!=='ok'){assert.equal(s.state.outcome,null);assert.equal(s.state.code,null);assert.equal(s.state.tagPrinted,false);assert.equal(s.state.carrying.length,1);assert.equal(s.signature,null);compare(s,r);return;}
 }
 signature(s,r,name);compare(s,r);
}
function photo(s,r,spot,grade){
 r.deliverAs('left');r.hh.current.options.find(o=>o.label===spot.label).onPick();assert.equal(A.place(s,spot.id),true);assert.equal(r.photoStarted,true);compare(s,r);
 const ph={grade,pkgIn:grade!=='bad',doorIn:grade==='good',numIn:grade==='private',personIn:false};r.S.photo=plain(ph);r.showPhoto('test',grade);A.capture(s,ph);r.hh.current.options.find(o=>o.label==='Use this photo').onPick();A.usePhoto(s);compare(s,r);
}
function exception(s,r,code,tag=true){const ex=c.OTR_DATA.handheld.exceptions.find(e=>e.id===code);r.confirmException(ex);r.hh.current.options[0].onPick();K.exception(s,code);if(ex.doorTag&&tag){r.hh.current.options[0].onPick();K.printTag(s);r.attachTag();K.attachTag(s);}compare(s,r);}
function finish(s,r,time=0){r.enterVan();K.enter(s,true);s.state.elapsed=r.S.elapsed=time;r.evaluate();K.evaluate(s);compare(s,r);assert.deepEqual(plain(s.log.toJSON()),plain(r.log.toJSON()));assert.deepEqual(plain(s.summaries[0]),{...plain(r.stopSummary),id:s.def.id});}
test('authored spots, all photo grades and every person/ID/exception choice retain the actual 2D callbacks',()=>{
 let cases=0;const authored=JSON.stringify(c.OTR_DATA.stopSets);
 for(const spec of specs)for(let index=0;index<3;index++)for(const good of [true,false]){
  const def=fixture(spec,index).def;
  for(const spot of A.spots(fixture(spec,index)))for(const grade of ['good','ok','private','bad']){const s=fixture(spec,index),r=begin(s,good);photo(s,r,spot,grade);finish(s,r,def.par*1.4+.1);cases++;}
  if(def.answer)for(const type of ['recipient','adult','reception','neighbor'])for(const id of def.packages[0].service==='adult'?['ok','under','invalid']:['ok'])for(const correct of [true,false]){const s=fixture(spec,index),r=begin(s,good);handover(s,r,type,id,correct?def.answer.name:'Occupant');finish(s,r,def.par);cases++;}
  for(const ex of c.OTR_DATA.handheld.exceptions)for(const tag of [true,false]){const s=fixture(spec,index),r=begin(s,good);exception(s,r,ex.id,tag);finish(s,r,def.par*2+.1);cases++;}
 }
 assert.equal(JSON.stringify(c.OTR_DATA.stopSets),authored);assert.equal(specs.length,3);assert.ok(cases>500);console.log(JSON.stringify({callbackAndEvaluationCases:cases,stops:9}));
});
test('an ID refusal never releases, records an exception or prints a tag automatically; a bad release stays critical',()=>{
 for(const index of [1,2]){
  const s=fixture(specs.find(s=>s.id==='m5-adult'),index),r=begin(s);handover(s,r,'adult',index===1?'under':'invalid');exception(s,r,'ID');finish(s,r);assert.equal(s.log.criticals().length,0);assert.equal(s.state.returned[0],'p1');
  const bad=fixture(specs.find(s=>s.id==='m5-adult'),index),b=begin(bad);handover(bad,b,'recipient','ok');finish(bad,b);assert.ok(bad.log.criticals().length>=2);assert.equal(bad.log.ratio('service'),0);
 }
});
test('original ID card data, fixed training date, Back and stale decision guards remain intact',()=>{
 const s=fixture(specs.find(s=>s.id==='m5-adult')),r=begin(s);r.deliverAs('recipient');A.request(s,'recipient');assert.equal(A.card(s).today,'Today: 09/17/2026');r.hh.current.back();assert.equal(A.cancelIdentity(s),true);compare(s,r);assert.equal(A.card(s),null);assert.equal(A.decide(s,'ok'),false);assert.equal(A.cancelIdentity(s),false);assert.equal(s.state.outcome,null);assert.equal(s.state.idResult,null);
 const closed=fixture(specs[0]);assert.equal(A.place(closed,'invented'),false);assert.equal(A.request(closed,'recipient'),false);assert.equal(A.capture(closed,{grade:'good'}),false);assert.equal(A.usePhoto(closed),false);assert.equal(A.retake(closed),false);assert.throws(()=>A.create('m5-invented',s.content,s.categories),/Invalid/);
});
test('retaking a placed package photo keeps it at the chosen spot until the original Use action',()=>{
 const s=fixture(specs.find(s=>s.id==='m5-pod')),r=begin(s),spot=A.spots(s)[0];r.deliverAs('left');r.hh.current.options.find(o=>o.label===spot.label).onPick();A.place(s,spot.id);assert.equal(A.place(s,'mat'),false);const ph={grade:'bad',pkgIn:false,doorIn:false,numIn:false,personIn:false};r.S.photo=ph;r.showPhoto('test','bad');A.capture(s,ph);r.hh.current.options.find(o=>o.label==='Retake').onPick();A.retake(s);compare(s,r);assert.equal(s.state.outcome,null);assert.deepEqual(plain(s.state.carrying),[]);assert.deepEqual(plain(s.state.delivered),['p1']);assert.equal(A.usePhoto(s),false);assert.equal(s.photoMode,true);
});
function talk(s,choice=0){assert.equal(K.startTalk(s),true);let n=0;while(s.talk.phase!=='done'&&n++<40){if(['line','feedback'].includes(s.talk.phase))T.advance(s.talk);else T.choose(s.talk,choice<s.talk.choices.length?choice:0);}assert.ok(n<40);K.finishTalk(s);}
test('all scripted scanner replies use actual TalkController effects in their original stop groups',()=>{
 let branches=0;for(const spec of specs)for(let index=0;index<3;index++){const def=fixture(spec,index).def,graph=def.talks?.[def.answer?.talk],node=Object.values(graph?.nodes||{}).find(n=>n.choices);if(!node)continue;for(let choice=0;choice<node.choices.length;choice++){const s=fixture(spec,index);K.exit(s,true);s.state.answered=true;talk(s,choice);const log=new O.ScoreLog(def.id),scorer={o:{log,cats:O.scoring.CATS,feedback:'deferred'},cast:{},flags:{},moods:{},applyMoodExpr(){}};const ch=node.choices[choice];O.TalkController.prototype.applyEffects.call(scorer,ch.effects,node.check,ch,node);assert.deepEqual(plain(s.log.toJSON()),plain(log.toJSON()));branches++;}}
 assert.equal(branches,14);console.log(JSON.stringify({authoredReplyBranches:branches}));
});
test('all three completed sets preserve original nextStop scores, ratios, lessons and group logs',()=>{
 O.workday={events:[{type:'brief.read',key:'suspended'}],report(){throw Error('Unexpected module workday event');}};O.save={data:{workday:{day:4}}};const outside=JSON.stringify([O.workday.events,O.save.data]),results=[];
 for(const spec of specs){const s=fixture(spec,0,false);for(let index=0;index<3;index++){
  K.take(s,'p1');K.scan(s,'p1',true);K.exit(s,true);K.knock(s);for(let n=0;n<120;n++)K.step(s,.05);if(s.def.answer)talk(s);const exp=s.def.expected;
  if(s.def.packages[0].service==='adult'){assert.equal(A.request(s,'adult'),'identity');A.decide(s,exp.id);}
  if(exp.outcome==='exception'){K.exception(s,exp.code);if(exp.doorTag){K.printTag(s);K.attachTag(s);}}
  else if(exp.types[0]==='left'){A.place(s,exp.spot);A.capture(s,{grade:'good',pkgIn:true,doorIn:true,numIn:false,personIn:false});A.usePhoto(s);}
  else{if(!s.signature)A.request(s,exp.types[0]);K.signed(s);K.recordSigner(s,s.def.answer.name);}
  K.enter(s,true);K.evaluate(s);A.next(s);
 }
 let original;O.StopReference.prototype.nextStop.call({set:s.content,stopIndex:2,shiftMode:false,heat:null,log:s.log,cats:s.categories,finish(result){original=result;}});const result=K.result(s);assert.equal(result.score,original.score);assert.deepEqual(plain(result.ratios),plain(original.ratios));assert.deepEqual(plain(result.stats.log),plain(original.stats.log));assert.deepEqual(plain(result.lessons),plain(original.lessons));assert.deepEqual(plain(result.ratios),{service:1,safety:1,efficiency:1});assert.equal(s.log.criticals().length,0);assert.equal(new Set(s.log.items.map(i=>i.group)).size,3);assert.equal(K.result(s),result);assert.equal(A.next(s),false);assert.equal(A.decide(s,'ok'),false);results.push({id:spec.id,score:result.score,ratios:plain(result.ratios)});}
 assert.equal(JSON.stringify([O.workday.events,O.save.data]),outside);console.log(JSON.stringify({completeSets:results}));
});
