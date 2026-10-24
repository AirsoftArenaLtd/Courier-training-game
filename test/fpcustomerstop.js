/* Tricky Doorsteps actions and unchanged 2D evaluation/results, without a renderer or workday reports. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const c={Date:class extends Date{static now(){return 123;}}};c.window=c;vm.createContext(c);
for(const f of ['data/theme.js','data/config.js','data/scanner.js','data/m3_doorsteps.js','src/core/theme.js','src/core/scoring.js','src/core/scorelog.js','src/core/talk.js','src/core/fpcustomertalk.js','src/core/fpcustomerstop.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),c);
const O=c.OTR,K=O.fpCustomerStop,T=O.fpCustomerTalk,content=c.OTR_DATA.stopSets.m3_doorsteps,cats=['service','safety','efficiency'],plain=x=>JSON.parse(JSON.stringify(x));O.util.shuffle=a=>a;O.audio={play(){}};O.fx={shake(){}};
c.BaseScenarioScene=class{};O.registerScene=C=>{O.StopReference=C;};vm.runInContext(fs.readFileSync(__dirname+'/../src/scenes/stops/StopScene.js','utf8'),c);
function fixture(index=0,coaching=true){const s=K.create(content,cats,{coaching});s.index=index;K.prepare(s);K.begin(s);return s;}
function tick(s,seconds){for(let n=0;n<Math.ceil(seconds*20)+1;n++)K.step(s,.05);}
function ref(s){const me={x:0,c:{},itemKind:'box',face(){},play(){},playOnce(k,fn){fn();},hold(){},setFacing(){},setExpression(){},emote(){}};const r=Object.create(O.StopReference.prototype);Object.assign(r,{S:plain(s.state),def:s.def,set:content,log:new O.ScoreLog(s.def.id),cats,collapsed:false,heat:null,stage:{G:0,lock(){},unlock(){},actors:[{rig:me}]},me,van:{doorX:0,floorY:0},time:{delayedCall(ms,fn){fn();}},tweens:{add(){}},say(){},refreshObjectives(){},confirmFinish(){},updateCarryVisual(){},carriedPkgs(){return s.packages.filter(p=>this.S.carrying.includes(p.id));},resident:s.def.answer?{x:0,face(){},play(){},playOnce(k,fn){fn();},hold(){},setExpression(){},emote(){}}:null,hh:{show(p){this.current=p;},close(fn){if(fn)fn();}},chooseAction(title,options,onPick){const op=options[this.selection??0];onPick(op.good,op);}});return r;}
function talk(s,choice=0){assert.equal(K.startTalk(s),true);let n=0;while(s.talk.phase!=='done'&&n++<40){if(['line','feedback'].includes(s.talk.phase))T.advance(s.talk);else T.choose(s.talk,choice<s.talk.choices.length?choice:0);}assert.ok(n<40);assert.equal(K.finishTalk(s),true);assert.equal(K.finishTalk(s),false);}
test('actual 2D scan, climb, signature and exception callbacks match the isolated action state',()=>{
 for(let index=0;index<3;index++){
  const s=fixture(index);assert.equal(K.take(s,'p1'),true);const r=ref(s);r.hhScan();K.scan(s,'p1',true);assert.deepEqual(plain(s.state.scanned),plain(r.S.scanned));assert.equal(s.state.scannedInVan,r.S.scannedInVan);
  if(index===0)K.heavy(s,'truck');r.exitVan();K.exit(s,true);assert.equal(s.state.heavy,r.S.heavy);assert.equal(s.state.exitSafe,r.S.exitSafe);assert.equal(s.state.inVan,r.S.inVan);
  if(index<2){s.state.answered=true;r.S.answered=true;assert.equal(K.requestSignature(s,'recipient'),true);assert.equal(K.recordSigner(s,s.def.answer.name),false);r.deliverAs('recipient');r.hh.current.widget.onDone();const name=s.def.answer.name;r.hh.current.options.find(o=>o.label===name).onPick();K.signed(s);K.recordSigner(s,name);}
  else{const ex=c.OTR_DATA.handheld.exceptions[0];r.confirmException(ex);r.hh.current.options[0].onPick();r.hh.current.options[0].onPick();K.exception(s,'NA');K.printTag(s);r.S.tagAttached=true;K.attachTag(s);}
  r.enterVan();K.enter(s,true);for(const key of ['inVan','carrying','delivered','returned','type','signer','outcome','code','tagPrinted','tagAttached','enterSafe'])assert.deepEqual(plain(s.state[key]??null),plain(r.S[key]??null),key);
  r.evaluate();K.evaluate(s);assert.deepEqual(plain(s.log.toJSON()),plain(r.log.toJSON()));
 }
});
test('all delivery types, signers, codes, scan states, climb choices and timing bands retain the 2D evaluator',()=>{
 let cases=0;const source=JSON.stringify(content);
 for(let index=0;index<3;index++)for(const route of ['recipient','adult','reception','neighbor','left','NA','BC','RF','AD','AC','UN','DM','ID','unfinished'])for(const good of [false,true])for(const scanned of [false,true])for(const time of [0,130,210,400]){
  const s=fixture(index);K.take(s,good?'p1':'d1');if(scanned)K.scan(s,good?'p1':'d1',good);if(index===0)K.heavy(s,good?'truck':'carry');K.exit(s,good);
  s.state.elapsed=time;s.state.knocks=good?1:0;
  if(['recipient','adult','reception','neighbor'].includes(route)&&index<2){s.state.answered=true;K.requestSignature(s,route);K.signed(s);K.recordSigner(s,good?s.def.answer.name:'Occupant');}
  else if(route==='left'){if(!good)K.scan(s,'d1',false);K.leave(s,{grade:good?'good':'private',pkgIn:true,doorIn:true,numIn:!good,personIn:!good});}
  else if(route!=='unfinished'&&c.OTR_DATA.handheld.exceptions.some(e=>e.id===route)){K.exception(s,route);if(good){K.printTag(s);K.attachTag(s);}}
  K.enter(s,good);const r=ref(s);r.evaluate();assert.equal(K.evaluate(s),true);assert.deepEqual(plain(s.log.toJSON()),plain(r.log.toJSON()));assert.deepEqual(plain(s.summaries[0]),{...plain(r.stopSummary),id:s.def.id});cases++;
 }
 assert.equal(JSON.stringify(content),source);assert.equal(cases,672);console.log(JSON.stringify({evaluationCases:cases}));
});
test('all ten authored doorstep replies score with the actual TalkController in the same stop group',()=>{
 let branches=0;for(let index=0;index<3;index++)for(let choice=0;choice<(index===1?4:3);choice++){
  const s=fixture(index);K.exit(s,true);s.state.answered=!!s.def.answer;s.stranger=!!s.def.stranger;talk(s,choice);const graph=s.def.talks[s.talkKey],log=new O.ScoreLog(s.def.id),scorer={o:{log,cats:O.scoring.CATS,feedback:'deferred'},cast:{},flags:{},moods:{},applyMoodExpr(){}};
  const checkNode=Object.values(graph.nodes).find(n=>n.choices),ch=checkNode.choices[choice];O.TalkController.prototype.applyEffects.call(scorer,ch.effects,checkNode.check,ch,checkNode);assert.deepEqual(plain(s.log.toJSON()),plain(log.toJSON()));assert.ok(s.log.items.every(i=>i.group===s.def.id));branches++;
 }assert.equal(branches,10);
});
test('the full three-stop result keeps the actual nextStop score scale, groups and local log',()=>{
 const s=K.create(content,cats);K.begin(s);for(let index=0;index<3;index++){
  K.take(s,'p1');K.scan(s,'p1',true);if(index===0)K.heavy(s,'truck');K.exit(s,true);K.knock(s);tick(s,6);talk(s);
  if(index<2){K.requestSignature(s,'recipient');K.signed(s);K.recordSigner(s,s.def.answer.name);}else{K.exception(s,'NA');K.printTag(s);K.attachTag(s);}
  K.enter(s,true);K.evaluate(s);if(index<2){assert.equal(K.result(s),null);K.next(s);}else K.next(s);
 }
 assert.equal(s.phase,'done');let original;O.StopReference.prototype.nextStop.call({set:content,stopIndex:2,shiftMode:false,heat:null,log:s.log,cats,finish(r){original=r;}});const result=K.result(s);assert.equal(result.score,original.score);assert.deepEqual(plain(result.ratios),plain(original.ratios));assert.deepEqual(plain(result.stats.log),plain(original.stats.log));assert.deepEqual(plain(result.ratios),{service:1,safety:1,efficiency:1});assert.equal(new Set(s.log.items.map(i=>i.group)).size,3);assert.equal(result.log,s.log);assert.equal(K.result(s),result);assert.equal(K.next(s),false);assert.equal(K.evaluate(s),false);console.log(JSON.stringify({goodScore:result.score,ratios:plain(result.ratios)}));
});
test('waiting, paused time and terminal guards cannot invent a signature, tag or completed stop',()=>{
 const s=fixture();assert.equal(K.result(s),null);assert.equal(K.evaluate(s),true,'leaving a stop without an outcome retains the original missed-stop checks');assert.equal(K.evaluate(s),false);assert.equal(K.result(s),null);assert.equal(K.take(s,'p1'),false);K.next(s);K.exit(s,false);K.knock(s);const before=JSON.stringify(s.state);for(let n=0;n<200;n++)K.step(s,.05,false);assert.equal(JSON.stringify(s.state),before);assert.equal(s.waiting,4);tick(s,5);assert.equal(s.state.answered,true);assert.equal(s.waiting,null);assert.equal(K.printTag(s),false);assert.equal(K.attachTag(s),false);assert.equal(K.recordSigner(s,'Occupant'),false);assert.equal(K.requestSignature(s,'unknown'),false);
});
test('assessments retain critical replies and never add trainer feedback or change a real workday',()=>{
 O.save={data:{workday:{current:{id:4}}}};O.workday={events:[{type:'brief.read',key:'real-day'}],report(){throw Error('Module entered the workday stream');}};const outside=JSON.stringify([O.save.data,O.workday.events]),s=fixture(2,false);K.exit(s,true);s.stranger=true;talk(s,2);assert.ok(s.log.criticals().length);assert.equal(s.talk.transcript.some(t=>t.speaker==='trainer'),false);assert.equal(JSON.stringify([O.save.data,O.workday.events]),outside);assert.equal(K.heavy(s,'truck'),false);assert.throws(()=>K.create({stops:[{packages:[{id:'x'},{id:'x'}]}]},cats),/Invalid/);
});
test('the two harmful signature paths retain the original complete-set scores and critical caps',()=>{
 for(const photo of [false,true]){
  const s=K.create(content,cats,{coaching:false});K.begin(s);for(let index=0;index<3;index++){
   K.take(s,'p1');K.scan(s,'p1',true);if(index===0)K.heavy(s,'truck');K.exit(s,true);K.knock(s);tick(s,6);talk(s,index===2&&!photo?2:0);
   if(index<2){K.requestSignature(s,'recipient');K.signed(s);const names=K.names(s);assert.equal(K.names(s),names,'names stay in one order while paging');K.recordSigner(s,s.def.answer.name);}else if(photo)K.leave(s,{grade:'good',pkgIn:true,doorIn:true,numIn:false,personIn:false});else{K.exception(s,'NA');K.printTag(s);K.attachTag(s);}
   K.enter(s,true);K.evaluate(s);K.next(s);
  }
  const result=K.result(s);assert.equal(result.score,photo?5400:5800);assert.equal(result.ratios.service,photo?5/6:29/35);assert.equal(result.ratios.safety,1);assert.equal(result.ratios.efficiency,1);assert.equal(s.log.criticals().length,photo?2:1);
 }
});
