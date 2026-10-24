/* Graph transitions and results against the actual 2D TalkController/DialogueScene, with UI calls stubbed only. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const c={Date:class extends Date{static now(){return 123;}}};c.window=c;vm.createContext(c);
for(const f of ['data/theme.js','data/config.js','data/m3_dialogues.js','src/core/theme.js','src/core/scoring.js','src/core/scorelog.js','src/core/talk.js','src/core/fpcustomertalk.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),c);
const O=c.OTR,K=O.fpCustomerTalk,graphs=c.OTR_DATA.dialogues,plain=x=>JSON.parse(JSON.stringify(x));O.audio={play(){}};O.fx={shake(){}};O.util.shuffle=a=>a;
c.BaseScenarioScene=class{};O.registerScene=klass=>{O.ReferenceDialogue=klass;};vm.runInContext(fs.readFileSync(__dirname+'/../src/scenes/shared/DialogueScene.js','utf8'),c);
const specs=[['m3_missing',['service','efficiency']],['m3_signature',['service','safety']],['m3_twostops',['service','safety','efficiency']]];
function reference(content){
 const r=Object.create(O.TalkController.prototype);Object.assign(r,{graph:content,o:{log:new O.ScoreLog(),cats:O.scoring.CATS,feedback:'immediate'},cast:{},moods:{},flags:{},history:[],done:false,cards:[],choiceLayer:{list:[]},timedTag:{setVisible(){}},arrow:{setVisible(){}},scene:{time:{delayedCall(ms,fn){fn();}},tweens:{add(o){if(o.onComplete)o.onComplete();}}}});
 for(const [key,person] of Object.entries(content.cast||{})){r.cast[key]={...person,rig:null};r.moods[key]=person.moodStart||0;}
 r.say=(node,done)=>done();r.showChoices=node=>{r.choiceList=node.choices.filter(ch=>O.talk.test(ch.if,r.flags));r.mode='choices';};r.showOwn=()=>{};r.coach=(ch,next)=>next();r.runAct=(name,arg,done)=>done();r.finish=node=>{r.done=true;r.mode='done';r.ending=node;};r.goto(content.start);return r;
}
function drive(content,cats,path){
 const s=K.create(content,cats),r=reference(content);K.begin(s);let comparisons=0;
 const settle=()=>{let n=0;while(s.phase==='feedback'||s.phase==='line'){
  assert.ok(n++<200);if(s.phase==='feedback'){K.advance(s);continue;}
  if(s.node.choices){K.advance(s);break;}K.advance(s);r.onAdvance();
 }
 assert.equal(s.nodeId,r.nodeId);assert.deepEqual(plain(s.flags),plain(r.flags));assert.deepEqual(plain(s.moods),plain(r.moods));assert.deepEqual(plain(s.log.toJSON()),plain(r.o.log.toJSON()));if(s.phase==='choices')assert.deepEqual(plain(s.choices.map(ch=>ch.text)),plain(r.choiceList.map(ch=>ch.text)));comparisons++;
 };
 settle();for(const choice of path){assert.equal(s.phase,'choices');if(choice===-1){assert.ok(K.expire(s));r.resolve(Object.assign({grade:'bad',text:'(no decision)'},r.node.timeout||{}),null);}else{assert.ok(K.choose(s,choice));r.resolve(r.choiceList[choice],null);}settle();}
 if(s.phase==='done'){
  let original;O.ReferenceDialogue.prototype.complete.call({content,cats,log:r.o.log,finish(result){original=result;}},r.ending);
  const result=K.result(s);assert.equal(K.result(s),result);assert.equal(result.score,original.score);assert.deepEqual(plain(result.ratios),plain(original.ratios));assert.deepEqual(plain(result.stats),plain(original.stats));assert.deepEqual(plain(s.history),plain(r.history));assert.equal(s.ending,r.ending);comparisons++;
 }
 return {s,r,comparisons};
}
test('all reachable paths preserve the actual 2D transitions, flags, score lines, criticals and result scale',()=>{
 let endings=0,comparisons=0,timeouts=0;const before=JSON.stringify(graphs);
 for(const [key,cats] of specs){const content=graphs[key],queue=[[]];while(queue.length){const path=queue.pop();assert.ok(path.length<40,'authored graph stays bounded');const out=drive(content,cats,path);comparisons+=out.comparisons;
  if(out.s.phase==='done'){endings++;continue;}assert.equal(out.s.phase,'choices');for(let i=0;i<out.s.choices.length;i++)queue.push([...path,i]);if(out.s.node.timer){timeouts++;queue.push([...path,-1]);}
 }}
 assert.ok(endings>50);assert.ok(timeouts>0);assert.equal(JSON.stringify(graphs),before);console.log(JSON.stringify({endings,comparisons,timeouts}));
});
test('the decision timer begins after the reading and pauses with the world or handheld',()=>{
 const content=graphs.m3_twostops,s=K.create(content,['safety']);K.enter(s,'n5');assert.equal(s.remaining,null);K.step(s,100);assert.equal(s.elapsed,0);K.advance(s);
 const expected=Math.max(s.node.timer,Math.ceil(4+s.choices.reduce((n,ch)=>n+ch.text.length,0)/20));assert.equal(s.remaining,expected);assert.ok(expected>s.node.timer);K.step(s,10,false);assert.equal(s.remaining,expected);
 for(let n=0;n<expected*20-1;n++)K.step(s,.05);assert.equal(s.phase,'choices');K.step(s,.05);assert.equal(s.phase,'feedback');assert.equal(s.lastChoice.text,'(no decision)');assert.ok(s.log.items.some(i=>i.cat==='safety'&&i.got<0));
});
test('assessment has the same scoring but exposes no per-answer feedback',()=>{
 const content=graphs.m3_signature,practice=K.create(content,['service','safety']),assess=K.create(content,['service','safety'],{coaching:false});for(const s of [practice,assess]){K.enter(s,'n1');K.advance(s);}
 const bad=practice.choices.findIndex(ch=>ch.critical);assert.ok(bad>=0);K.choose(practice,bad);K.choose(assess,bad);assert.equal(practice.phase,'feedback');assert.equal(assess.feedback,null);assert.notEqual(assess.phase,'feedback');assert.deepEqual(plain(practice.log.toJSON()),plain(assess.log.toJSON()));assert.ok(assess.log.items.some(i=>i.critical));
});
test('repeated questions keep the worse check and retain an earlier critical mistake',()=>{
 const content=graphs.m3_signature,s=K.create(content,['service','safety']);K.enter(s,'n1');K.advance(s);const bad=s.choices.findIndex(ch=>ch.critical);K.choose(s,bad);
 const checks=s.log.items.filter(i=>i.kind==='check');K.enter(s,'n1');K.advance(s);K.choose(s,s.choices.findIndex(ch=>ch.grade==='good'));assert.equal(s.log.items.filter(i=>i.kind==='check').length,checks.length);assert.ok(s.log.items.some(i=>i.critical&&i.tries===2));
});
test('invalid or repeated actions never complete an unfinished dialogue or change outside state',()=>{
 const content=graphs.m3_missing,s=K.create(content,['service','efficiency']),before=JSON.stringify(content);assert.equal(K.result(s),null);assert.equal(K.choose(s,0),false);K.begin(s);assert.equal(K.begin(s),false);while(s.phase==='line')K.advance(s);assert.equal(K.choose(s,-1),false);assert.equal(K.choose(s,999),false);assert.equal(K.result(s),null);assert.equal(JSON.stringify(content),before);
 const loop={start:'a',nodes:{a:{if:'yes',then:'a',else:'a'}}},bounded=K.create(loop,['service']);assert.equal(K.begin(bounded),false);assert.equal(bounded.phase,'blocked');assert.equal(K.result(bounded),null);assert.ok(bounded.entries<=200);
});

test('a completed conversation stays terminal and preserves the suspended course and workday',()=>{
 O.save={data:{workday:{day:4,events:[{type:'brief.read',key:'suspended'}]}},write(){throw Error('Unexpected course write');}};
 O.workday={events:[{type:'brief.read',key:'suspended'}],report(){throw Error('Unexpected workday report');}};const outside=JSON.stringify([O.save.data,O.workday.events]);
 const s=K.create(graphs.m3_missing,['service','efficiency']);K.begin(s);let steps=0;
 while(s.phase!=='done'&&steps++<50){if(s.phase==='line'||s.phase==='feedback')K.advance(s);else K.choose(s,s.choices.findIndex(ch=>ch.grade==='good'));}
 assert.equal(s.phase,'done');const result=K.result(s),log=JSON.stringify(s.log.toJSON());assert.ok(result.score>0);assert.equal(K.begin(s),false);assert.equal(K.enter(s,s.content.start),false);assert.equal(K.advance(s),false);assert.equal(K.choose(s,0),false);assert.equal(K.step(s,1),false);assert.equal(K.result(s),result);assert.equal(JSON.stringify(s.log.toJSON()),log);assert.equal(JSON.stringify([O.save.data,O.workday.events]),outside);
});
