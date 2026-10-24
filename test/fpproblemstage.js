/* Every authored M4 path is compared with the real 2D controller and result, plus physical staging guards. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const c={Date:class extends Date{static now(){return 123;}}};c.window=c;vm.createContext(c);
for(const f of ['data/theme.js','data/config.js','data/modules.js','data/m4_dialogues.js','data/m4_recover.js','src/core/theme.js','src/core/scoring.js','src/core/scorelog.js','src/core/talk.js','src/core/fpcustomertalk.js','src/core/fpproblemstage.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),c);
const O=c.OTR,K=O.fpCustomerTalk,S=O.fpProblemStage,graphs=c.OTR_DATA.dialogues,plain=x=>JSON.parse(JSON.stringify(x));O.audio={play(){}};O.fx={shake(){}};O.util.shuffle=a=>a;
c.BaseScenarioScene=class{};O.registerScene=klass=>{O.ReferenceDialogue=klass;};vm.runInContext(fs.readFileSync(__dirname+'/../src/scenes/shared/DialogueScene.js','utf8'),c);
const specs=c.OTR_DATA.modules.find(m=>m.id==='m4').scenarios;
function reference(content){
 const r=Object.create(O.TalkController.prototype);Object.assign(r,{graph:content,o:{log:new O.ScoreLog(),cats:O.scoring.CATS,feedback:'immediate'},cast:{},moods:{},flags:{},history:[],done:false,cards:[],choiceLayer:{list:[]},timedTag:{setVisible(){}},arrow:{setVisible(){}},scene:{time:{delayedCall(ms,fn){fn();}},tweens:{add(o){if(o.onComplete)o.onComplete();}}}});
 for(const [key,person] of Object.entries(content.cast||{})){r.cast[key]={...person,rig:null};r.moods[key]=person.moodStart||0;}
 r.say=(node,done)=>done();r.showChoices=node=>{r.choiceList=node.choices.filter(ch=>O.talk.test(ch.if,r.flags));r.mode='choices';};r.showOwn=()=>{};r.coach=(ch,next)=>next();r.runAct=(name,arg,done)=>done();r.finish=node=>{r.done=true;r.mode='done';r.ending=node;};r.goto(content.start);return r;
}
function drive(spec,path){
 const content=graphs[spec.dataKey.split(".")[1]],s=K.create(content,spec.categories),r=reference(content),stage=S.create(spec.id,content);K.begin(s);let comparisons=0;
 const settle=()=>{let n=0;while(s.phase==='feedback'||s.phase==='line'){
  S.apply(stage,s);assert.ok(n++<200);if(s.phase==='feedback'){K.advance(s);continue;}
  if(s.node.choices){K.advance(s);break;}K.advance(s);r.onAdvance();
 }
 S.apply(stage,s);assert.equal(s.nodeId,r.nodeId);assert.deepEqual(plain(s.flags),plain(r.flags));assert.deepEqual(plain(s.moods),plain(r.moods));assert.deepEqual(plain(s.log.toJSON()),plain(r.o.log.toJSON()));if(s.phase==='choices')assert.deepEqual(plain(s.choices.map(ch=>ch.text)),plain(r.choiceList.map(ch=>ch.text)));comparisons++;
 };
 settle();for(const choice of path){assert.equal(s.phase,'choices');if(choice===-1){assert.ok(K.expire(s));r.resolve(Object.assign({grade:'bad',text:'(no decision)'},r.node.timeout||{}),null);}else{assert.ok(K.choose(s,choice));r.resolve(r.choiceList[choice],null);}settle();}
 if(s.phase==='done'){
  let original;O.ReferenceDialogue.prototype.complete.call({content,cats:spec.categories,log:r.o.log,finish(result){original=result;}},r.ending);
  const result=K.result(s);assert.equal(K.result(s),result);assert.equal(result.score,original.score);assert.deepEqual(plain(result.ratios),plain(original.ratios));assert.deepEqual(plain(result.stats),plain(original.stats));assert.deepEqual(plain(s.history),plain(r.history));assert.equal(s.ending,r.ending);comparisons++;
 }
 return {s,r,stage,comparisons};
}
test('all four existing ids preserve every reachable original result, flag, critical and timeout',()=>{
 let endings=0,comparisons=0,timeouts=0;const before=JSON.stringify(graphs),counts={};
 assert.equal(specs.length,4);for(const spec of specs){const queue=[[]];counts[spec.id]=0;while(queue.length){const path=queue.pop();assert.ok(path.length<40,'authored graph stays bounded');const out=drive(spec,path);comparisons+=out.comparisons;
  if(out.s.phase==='done'){endings++;counts[spec.id]++;continue;}assert.equal(out.s.phase,'choices');for(let i=0;i<out.s.choices.length;i++)queue.push([...path,i]);if(out.s.node.timer){timeouts++;queue.push([...path,-1]);}
 }}
 assert.ok(endings>100);assert.ok(timeouts>0);assert.equal(JSON.stringify(graphs),before);console.log(JSON.stringify({endings,comparisons,timeouts,counts}));
});
function fixture(id){const spec=specs.find(s=>s.id===id),talk=K.create(graphs[spec.dataKey.split(".")[1]],spec.categories),stage=S.create(id,talk.content);return {talk,stage,enter(node){K.enter(talk,node);S.apply(stage,talk);return stage;}};}
test('address suffixes, recovery handoffs and safe isolation remain physical presentation of the authored story',()=>{
 const a=fixture('m4-address');assert.deepEqual(plain(a.stage.addresses).map(x=>[x.number,x.street]),[['412','Maple Avenue'],['421','Maple Court']]);assert.equal(a.enter('n3_dispatch').site,'cab');assert.equal(a.enter('n3_ct').site,'other');assert.equal(a.stage.routeChanged,true);a.enter('n4');assert.equal(a.stage.target.kind,'person');assert.equal(a.stage.actors.find(x=>x.key==='jo').visible,true);
 const r=fixture('m4-recover');r.enter('n0');assert.equal(r.stage.phone,true);assert.equal(r.enter('n1').site,'house');r.enter('n2');assert.equal(r.stage.target.kind,'person');assert.equal(r.enter('n3').site,'cargo');assert.equal(r.stage.held,'box');assert.equal(r.enter('n4').site,'other');r.enter('n5');assert.equal(r.stage.target.kind,'person');assert.equal(r.enter('n7').site,'cab');assert.equal(r.stage.held,null);
 const d=fixture('m4-damaged');K.begin(d.talk);S.apply(d.stage,d.talk);K.advance(d.talk);K.choose(d.talk,d.talk.choices.findIndex(ch=>ch.grade==='good'));K.advance(d.talk);S.apply(d.stage,d.talk);assert.equal(d.stage.isolated,true);assert.equal(d.stage.held,null);assert.equal(d.stage.site,'house');assert.equal(d.stage.exposed,false);
 const bad=fixture('m4-damaged');bad.enter('n1_bad');assert.equal(bad.stage.exposed,true);assert.equal(bad.stage.isolated,true);
});
test('lightning keeps the decision in the cab; the gate stays locked and the flood branch is retained',()=>{
 const f=fixture('m4-storm');assert.equal(f.enter('n4').site,'cab');assert.equal(f.stage.lightning,true);assert.equal(f.enter('n5').site,'gate');assert.equal(f.stage.lightning,false);assert.equal(f.enter('n6').site,'cab');assert.equal(f.stage.phone,true);
 const bad=fixture('m4-storm');bad.enter('n2_flood');assert.equal(bad.stage.flooded,true);bad.enter('n3f');assert.equal(bad.stage.flooded,true);assert.equal(bad.stage.site,'safe');assert.equal(bad.stage.phone,true);
});
test('staging is read-only, bounded and stable; it never moves a player, grades or writes the suspended workday',()=>{
 O.save={data:{workday:{day:4,events:[{type:'brief.read',key:'suspended'}]}},write(){throw Error('Unexpected save');}};O.workday={events:[{type:'brief.read',key:'suspended'}],report(){throw Error('Unexpected workday report');}};const outside=JSON.stringify([O.save.data,O.workday.events]);
 for(const spec of specs){const f=fixture(spec.id),s=f.stage,t=f.talk;K.begin(t);const before=JSON.stringify(t);assert.equal(S.apply(s,t),true);assert.equal(JSON.stringify(t),before);assert.equal(S.apply(s,t),false);const target=s.target,solids=S.solids(s),refs=s.actors.map(a=>a.solid);for(let i=0;i<10000;i++){S.step(s,.05);assert.equal(S.target(s),target);}assert.ok(s.actors.length<=4);for(const ref of refs)assert.ok(solids.includes(ref)||s.actors.some(a=>a.remote&&a.solid===ref));assert.equal(JSON.stringify(t),before);assert.equal(K.result(t),null);}
 assert.equal(JSON.stringify([O.save.data,O.workday.events]),outside);assert.throws(()=>S.create('unregistered',{nodes:{},cast:{}}),/Invalid/);
});
