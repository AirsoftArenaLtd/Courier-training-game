/* Replay native replies through the actual original TalkController and DialogueScene result method. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),ROOT=path.resolve(__dirname,'../..');
function normalize(result){const clean=v=>Array.isArray(v)?v.map(clean):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).filter(([k])=>k!=='at').map(([k,x])=>[k,clean(x)])):v;const v=JSON.parse(JSON.stringify(result));return clean({score:v.score,ratios:v.ratios,log:{items:v.log.items},lessons:v.lessons,stats:{outcome:v.stats.outcome,log:v.stats.log}});}
function replay(observations){
 const c={};c.window=c;c.BaseScenarioScene=class{};vm.createContext(c);for(const f of ['data/theme.js','data/config.js','data/modules.js','data/m8_incident.js','src/core/theme.js','src/core/scoring.js','src/core/scorelog.js','src/core/talk.js'])vm.runInContext(fs.readFileSync(path.join(ROOT,f),'utf8'),c);
 const O=c.OTR;O.registerScene=C=>{c.Reference=C;};O.audio={play(){}};O.fx={shake(){}};O.util.shuffle=a=>a;vm.runInContext(fs.readFileSync(path.join(ROOT,'src/scenes/shared/DialogueScene.js'),'utf8'),c);
 const content=c.OTR_DATA.dialogues.m8_incident,sc=c.OTR_DATA.modules.find(m=>m.id==='m8').scenarios.find(s=>s.id==='m8-incident'),r=Object.create(O.TalkController.prototype);
 Object.assign(r,{graph:content,o:{log:new O.ScoreLog(),cats:O.scoring.CATS,feedback:'deferred'},cast:{},moods:{},flags:{},history:[],done:false,cards:[],choiceLayer:{list:[]},timedTag:{setVisible(){}},arrow:{setVisible(){}},scene:{time:{delayedCall(ms,fn){fn();}},tweens:{add(o){o.onComplete?.();}}}});
 for(const [key,person] of Object.entries(content.cast)){r.cast[key]={...person,rig:null};r.moods[key]=person.moodStart||0;}
 r.say=(node,done)=>done();r.showChoices=node=>{r.choiceList=node.choices.filter(ch=>O.talk.test(ch.if,r.flags));r.mode='choices';};r.showOwn=()=>{};r.coach=(ch,next)=>next();r.runAct=(name,arg,done)=>done();r.finish=node=>{r.done=true;r.mode='done';r.ending=node;};r.goto(content.start);
 const settle=()=>{let n=0;while(!r.done&&r.mode!=='choices'){assert.ok(n++<100);r.onAdvance();}};
 for(const choice of observations){settle();assert.equal(r.nodeId,choice.node);const ch=r.choiceList.find(ch=>ch.text===choice.text);assert.ok(ch,'The native reply is an authored original choice');r.resolve(ch,null);}
 settle();assert.ok(r.done,'The native incident report is incomplete');let result;c.Reference.prototype.complete.call({content,cats:sc.categories,log:r.o.log,finish(value){result=value;}},r.ending);
 const criticals=r.o.log.criticals(undefined,sc.categories),stars=Object.fromEntries(sc.categories.map(cat=>[cat,Math.min(O.scoring.stars(result.ratios[cat],sc.starThresholds),criticals.some(x=>x.cat===cat)?1:3)]));return {result:normalize(result),stars,history:JSON.parse(JSON.stringify(r.history))};
}
module.exports={replay,normalize};
