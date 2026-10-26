/* Every authored M8 incident path is compared with the real 2D controller and result, plus physical staging guards. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const c={Date:class extends Date{static now(){return 123;}}};c.window=c;vm.createContext(c);
for(const f of ['data/theme.js','data/config.js','data/modules.js','data/m8_incident.js','src/core/theme.js','src/core/scoring.js','src/core/scorelog.js','src/core/talk.js','src/core/fpcustomertalk.js','src/core/fpincidentstage.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),c);
const O=c.OTR,K=O.fpCustomerTalk,S=O.fpIncidentStage,graphs=c.OTR_DATA.dialogues,plain=x=>JSON.parse(JSON.stringify(x));O.audio={play(){}};O.fx={shake(){}};O.util.shuffle=a=>a;
c.BaseScenarioScene=class{};O.registerScene=klass=>{O.ReferenceDialogue=klass;};vm.runInContext(fs.readFileSync(__dirname+'/../src/scenes/shared/DialogueScene.js','utf8'),c);
const specs=c.OTR_DATA.modules.find(m=>m.id==='m8').scenarios.filter(s=>s.id==='m8-incident');
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
test('all incident endings preserve actual original dialogue results, flags, criticals and score scale',()=>{
 let endings=0,comparisons=0,timeouts=0;const before=JSON.stringify(graphs),counts={};
 assert.equal(specs.length,1);for(const spec of specs){const queue=[[]];counts[spec.id]=0;while(queue.length){const path=queue.pop();assert.ok(path.length<40,'authored graph stays bounded');const out=drive(spec,path);comparisons+=out.comparisons;
  if(out.s.phase==='done'){endings++;counts[spec.id]++;continue;}assert.equal(out.s.phase,'choices');for(let i=0;i<out.s.choices.length;i++)queue.push([...path,i]);if(out.s.node.timer){timeouts++;queue.push([...path,-1]);}
 }}
 assert.equal(endings,6561);assert.equal(timeouts,0);assert.equal(JSON.stringify(graphs),before);console.log(JSON.stringify({endings,comparisons,timeouts,counts}));
});
function fixture(){const spec=specs[0],talk=K.create(graphs.m8_incident,spec.categories),stage=S.create(spec.id,talk.content);return {talk,stage,enter(node){K.enter(talk,node);S.apply(stage,talk);return stage;}};}
test('physical destinations follow actual calls, injury checks, photographs, witness and report without altering decisions',()=>{
 const {talk,stage,enter}=fixture(),before=JSON.stringify(graphs),sites={n1:'damage',n2:'driver',n2_call:'cab',n3:'driver',n4:'driver',n5:'driver',n6:'cab',n7:'cab',n8:'damage',n9:'witness',n10:'cab'};
 for(const [node,site] of Object.entries(sites)){enter(node);assert.equal(stage.site,site);assert.ok(Number.isFinite(stage.target.x));assert.equal(stage.phone,site==='cab');assert.equal(S.apply(stage,talk),false);}
 assert.ok(stage.actors.find(a=>a.key==='ray').visible);assert.ok(stage.actors.find(a=>a.key==='neighbor').visible);assert.equal(stage.actors.find(a=>a.key==='dispatch').visible,false);assert.equal(stage.secured,true);assert.equal(JSON.stringify(graphs),before);
 const outside=JSON.stringify(talk.log.toJSON());for(let i=0;i<200;i++)S.step(stage,10);assert.ok(Math.abs(stage.time-10)<1e-9);assert.equal(JSON.stringify(talk.log.toJSON()),outside);
});
test('assessment decisions hide feedback and retain each original critical, including a shaded final report',()=>{
 for(const node of ['n1','n5','n9','n10']){const a=K.create(graphs.m8_incident,specs[0].categories,{coaching:false}),b=K.create(graphs.m8_incident,specs[0].categories);for(const s of [a,b]){K.enter(s,node);K.advance(s);const i=s.choices.findIndex(ch=>ch.critical);assert.ok(i>=0);K.choose(s,i);}assert.equal(a.feedback,null);assert.notEqual(a.phase,'feedback');assert.deepEqual(plain(a.log.toJSON()),plain(b.log.toJSON()));assert.ok(a.log.items.some(x=>x.critical));}
});
