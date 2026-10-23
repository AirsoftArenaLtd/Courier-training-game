/* Local six-face package inspection, preserving the existing m2-labels content and grading scale. */
window.OTR=window.OTR||{};
OTR.fpPackageLabels={
  faces:Object.freeze(['front','right','back','left','top','base']),
  faceNames:Object.freeze({front:'FRONT',right:'RIGHT SIDE',back:'BACK',left:'LEFT SIDE',top:'TOP',base:'BASE'}),
  create(content,{log=new OTR.ScoreLog(),shuffle=items=>OTR.util.shuffle(items)}={}){
    const per=Math.max(1,Math.round(content.itemsPerRun/3)),tier=n=>shuffle(content.items.filter(item=>item.tier===n));
    return {content,log,queue:tier(1).slice(0,per).concat(tier(2).slice(0,per),tier(3).slice(0,content.itemsPerRun-per*2)),
      index:-1,item:null,phase:'brief',answering:false,guideOpen:false,face:'front',seen:{},itemTime:0,score:0,outcomes:[],result:null,
      stats:{correct:0,total:0,blind:0,speed:[],wrong:[],slow:0}};
  },
  next(s,{frontVisible=true}={}){
    if(s.result||s.guideOpen||!['brief','verdict'].includes(s.phase))return false;
    s.index++;if(s.index>=s.queue.length){s.phase='done';s.answering=false;return false;}
    s.item=s.queue[s.index];s.phase='run';s.answering=true;s.face='front';s.seen=frontVisible?{front:true}:{};s.itemTime=0;return true;
  },
  see(s,face){
    if(s.phase!=='run'||!s.answering||s.guideOpen||!this.faces.includes(face))return false;
    s.face=face;s.seen[face]=true;return true;
  },
  advance(s,seconds,active=true){
    if(!active||s.phase!=='run'||!s.answering||s.guideOpen)return false;
    s.itemTime+=Math.max(0,Math.min(.05,Number(seconds)||0));
    return s.itemTime>=s.content.timePerItem?this.grade(s,null):false;
  },
  answer(s,station){
    if(s.phase!=='run'||!s.answering||s.guideOpen||!Object.hasOwn(s.content.stations,station))return false;
    return this.grade(s,station);
  },
  markName(s,id){const c=s.content,g=c.guide.find(g=>g.mark===id);return g?g.name:c.markNames?.[id]||id;},
  marksSummary(s){
    const item=s.item,bits=[];
    for(const face of Object.keys(item.marks||{}))for(const mark of item.marks[face])bits.push(`${this.markName(s,mark)} (${this.faceNames[face].toLowerCase()})`);
    if(item.damage)bits.push(`${item.damage.kind} (${this.faceNames[item.damage.face].toLowerCase()})`);
    return bits.join(', ');
  },
  faceList(faces){
    const names=faces.map(face=>'the '+this.faceNames[face].toLowerCase());
    return names.length>1?names.slice(0,-1).join(', ')+' and '+names[names.length-1]:names[0]||'';
  },
  lesson(s){const c=s.content,id=s.item.answer;return id==='isolate'?c.lessons.damage:id==='hazmat'?c.lessons.hazmat:id==='upright'?c.lessons.orientation:c.lessons.sixSides;},
  grade(s,station){
    if(s.phase!=='run'||!s.answering||s.guideOpen||station!==null&&!Object.hasOwn(s.content.stations,station)||station===null&&s.itemTime<s.content.timePerItem)return false;
    const c=s.content,item=s.item,ok=station===item.answer,unseen=this.faces.filter(face=>!s.seen[face]),blind=!!station&&unseen.length>0,t=s.itemTime;
    const speed=ok?OTR.util.clamp01(1-(t-4)/(c.timePerItem-4)):0;
    s.answering=false;s.phase='verdict';s.stats.total++;s.stats.speed.push(speed);if(!station)s.stats.slow++;
    s.log.check('safety',ok?2:0,2,`${c.stations[item.answer].label} · ${this.marksSummary(s)||'no marks'}`,{lesson:ok?null:this.lesson(s)});
    s.log.check('efficiency',ok?Math.max(1,Math.round(speed*3)):0,3,`Read package ${s.index+1} in ${Math.round(t)}s`,{lesson:null});
    if(blind){s.stats.blind++;s.log.penalty('safety',1,`Called it without checking ${this.faceList(unseen)}`,{lesson:c.lessons.sixSides});}
    const points=ok?200+Math.round(speed*150)-(blind?100:0):0;
    if(ok){s.stats.correct++;s.score+=points;}else s.stats.wrong.push(item);
    const outcome={index:s.index,station,ok,blind,unseen,time:t,speed,points};s.outcomes.push(outcome);return outcome;
  },
  result(s){
    if(s.result)return s.result;
    // A whole-scenario expiry must include the uncompleted items, just as each original item timing out would.
    s.guideOpen=false;if(s.phase==='brief')this.next(s);
    while(s.phase!=='done'){
      if(s.phase==='run'){s.itemTime=Math.max(s.itemTime,s.content.timePerItem);this.grade(s,null);}
      this.next(s);
    }
    const stats=s.stats,inspected=s.outcomes.filter(outcome=>outcome.unseen.length===0).length;
    s.result={score:s.score,ratios:s.log.ratios(['safety','efficiency']),log:s.log,lessons:s.log.mistakes().length?[]:[s.content.lessons.perfect],
      summary:`You placed ${stats.correct} of ${stats.total} correctly. You made ${stats.blind} decision${stats.blind===1?'':'s'} before checking every side. You checked all six sides of ${inspected} package${inspected===1?'':'s'}.`,stats};
    return s.result;
  }
};
