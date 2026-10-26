/* Independently replay observed replies and final stop facts through the original 2D callbacks. */
const assert=require('node:assert/strict');
const normalize=result=>{const clean=v=>Array.isArray(v)?v.map(clean):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).filter(([k])=>k!=='at').map(([k,x])=>[k,clean(x)])):v;return clean(JSON.parse(JSON.stringify({score:result.score,ratios:result.ratios,log:{items:result.log.items},lessons:result.lessons})));};
function replay(id,observations){
 const {O,P,fixture,reference}=require('./fp-wellness-context')(),log=new O.ScoreLog();
 for(const observed of observations){
  const s=fixture(id,observed.index),ref=reference(s);ref.log=log;log.setGroup(s.def.id);
  for(const conversation of observed.conversations){
   const graph=s.def.talks?.[conversation.key]||s.content.talks[conversation.key],r=Object.create(O.TalkController.prototype),cast=P.castFor.call(ref);
   Object.assign(r,{graph,o:{log,cats:O.scoring.CATS,feedback:'deferred'},cast,moods:{},flags:ref.talkFlags,history:[],done:false,cards:[],choiceLayer:{list:[]},timedTag:{setVisible(){}},arrow:{setVisible(){}},scene:{time:{delayedCall(ms,fn){fn();}},tweens:{add(o){o.onComplete?.();}}}});
   for(const [key,person] of Object.entries(cast))r.moods[key]=person.moodStart||0;
   r.say=(node,done)=>done();r.showChoices=node=>{r.choiceList=node.choices.filter(ch=>O.talk.test(ch.if,r.flags));r.mode='choices';};r.showOwn=()=>{};r.coach=(ch,next)=>next();r.runAct=(name,arg,done)=>done();r.finish=node=>{r.done=true;r.mode='done';r.ending=node;};r.goto(graph.start);
   const settle=()=>{let n=0;while(!r.done&&r.mode!=='choices'){assert.ok(n++<150);r.onAdvance();}};
   for(const reply of conversation.history){settle();assert.equal(r.nodeId,reply.node);const ch=reply.text==='(no decision)'?Object.assign({grade:'bad',text:reply.text},r.node.timeout||{}):r.choiceList.find(ch=>ch.text===reply.text);assert.ok(ch,'Native reply is an authored choice');r.resolve(ch,null);}
   settle();assert.ok(r.done,'Native conversation is complete');
  }
  ref.S=observed.state;ref.heat=observed.heat;ref.collapsed=observed.collapsed;P.evaluate.call(ref);
 }
 const s=fixture(id),result={score:log.score(),ratios:log.ratios(s.categories),log,lessons:s.content.keyLessons||[]},criticals=log.criticals(undefined,s.categories),spec=s.categories;
 return {result:normalize(result),stars:Object.fromEntries(spec.map(cat=>[cat,Math.min(O.scoring.stars(result.ratios[cat]),criticals.some(c=>c.cat===cat)?1:3)]))};
}
module.exports={normalize,replay};
