/* Unloaded 3D conversation model. Authored graphs and the original TalkController score checks stay authoritative. */
window.OTR=window.OTR||{};
OTR.fpCustomerTalk={
  create(content,categories,{coaching=true}={}){
    if(!content?.nodes||!content.nodes[content.start]||!Array.isArray(categories)||!categories.length)throw Error('Invalid customer dialogue');
    const flags={},moods={},cast={};for(const [key,person] of Object.entries(content.cast||{})){cast[key]={...person,rig:null};moods[key]=person.moodStart||0;}
    const log=new OTR.ScoreLog(),s={content,categories:categories.slice(),coaching,log,flags,moods,cast,phase:'brief',node:null,nodeId:null,choices:[],history:[],entries:0,elapsed:0,remaining:null,lastChoice:null,feedback:null,result:null,ending:null,notes:[],presentation:null};
    // Reuse the shared scoring implementation, including its worse-repeat checks, penalties and critical flags.
    s.scorer={o:{log,cats:OTR.scoring.CATS,feedback:coaching?'immediate':'deferred'},flags,moods,cast,applyMoodExpr(){}};
    return s;
  },
  apply(s,effects,label,choice,node){OTR.TalkController.prototype.applyEffects.call(s.scorer,effects||{},label,choice,node);},
  begin(s){if(s.phase!=='brief')return false;return this.enter(s,s.content.start);},
  enter(s,id){
    if(s.phase==='done'||s.phase==='blocked')return false;
    for(let hops=0;hops<200;hops++){
      if(++s.entries>512){s.phase='blocked';return false;}const node=s.content.nodes[id];if(!node){s.phase='blocked';return false;}
      s.node=node;s.nodeId=id;s.feedback=null;s.lastChoice=null;s.choices=[];s.remaining=null;s.presentation=node;
      if(node.set)Object.assign(s.flags,node.set);
      if(node.type==='end'){s.phase='done';s.ending=node;s.notes=(node.notes||[]).filter(n=>OTR.talk.test(n.if,s.flags)).map(n=>n.text);return true;}
      if(node.if!==undefined&&node.then){id=OTR.talk.test(node.if,s.flags)?node.then:node.else;continue;}
      if(node.effects)this.apply(s,Object.assign({moodTarget:s.cast[node.speaker]?node.speaker:undefined},node.effects),node.check||null,null);
      if(node.text===undefined&&!node.choices){id=node.next;continue;}
      s.phase='line';return true;
    }
    s.phase='blocked';return false;
  },
  advance(s){
    if(s.phase==='feedback')return this.follow(s,s.lastChoice);
    if(s.phase!=='line')return false;
    if(!s.node.choices)return this.enter(s,s.node.next);
    s.choices=OTR.util.shuffle(s.node.choices.filter(ch=>OTR.talk.test(ch.if,s.flags)));s.phase='choices';
    if(s.node.timer)s.remaining=Math.max(s.node.timer,Math.ceil(4+s.choices.reduce((n,ch)=>n+ch.text.length,0)/20));return true;
  },
  choose(s,index){
    if(s.phase!=='choices'||!Number.isInteger(index)||!s.choices[index])return false;
    return this.resolve(s,s.choices[index]);
  },
  resolve(s,choice){
    if(s.phase!=='choices')return false;s.remaining=null;s.lastChoice=choice;
    s.history.push({node:s.nodeId,text:choice.text,grade:choice.grade});if(choice.set)Object.assign(s.flags,choice.set);
    this.apply(s,choice.effects,s.node.check||'Conversation choice',choice,s.node);
    if(s.coaching&&choice.feedback){s.feedback=choice.feedback;s.phase='feedback';return true;}
    return this.follow(s,choice);
  },
  follow(s,choice){
    // Choice acts are presentation metadata, consumed by the future physical adapter; they never score here.
    s.lastAct=choice?.act?{act:choice.act,arg:choice.arg}:null;return this.enter(s,choice?.next);
  },
  expire(s){if(s.phase!=='choices'||!s.node.timer)return false;return this.resolve(s,Object.assign({grade:'bad',text:'(no decision)'},s.node.timeout||{}));},
  step(s,seconds,active=true){
    if(!active||s.phase!=='choices'||s.remaining===null)return false;
    const dt=Math.max(0,Math.min(.05,Number(seconds)||0));s.elapsed+=dt;s.remaining=Math.max(0,s.remaining-dt);
    if(s.remaining<=1e-8)return this.expire(s);return false;
  },
  result(s){
    if(s.result)return s.result;if(s.phase!=='done')return null;
    const bonus=s.ending.outcome==='good'?500:s.ending.outcome==='mixed'?200:0;
    s.result={score:s.log.score()+bonus,ratios:s.log.ratios(s.categories),log:s.log,lessons:s.content.keyLessons||[],stats:{outcome:s.ending.outcome,log:s.log.toJSON()}};return s.result;
  }
};
