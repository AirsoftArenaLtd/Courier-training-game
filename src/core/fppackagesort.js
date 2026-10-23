/* Bounded local conveyor model. Retains the 2D sort rules, scoring, combo and wave boundaries. */
window.OTR=window.OTR||{};
OTR.fpPackageSort={
  capacity:16,
  create(content,{random=Math.random}={}){
    const binKeys={};for(const w of content.waves)for(const id of w.bins)if(!binKeys[id])binKeys[id]=Object.keys(binKeys).length+1;
    return {content,random,binKeys,wave:null,waveIndex:-1,waveTime:0,state:'brief',elapsed:0,spawnTimer:0,beltSpeed:0,packages:[],serial:0,
      sinceDamage:0,jammed:null,jamTimer:0,jamAt:null,streak:0,bestStreak:0,score:0,result:null,
      stats:{correct:0,wrong:0,missed:0,excTotal:0,excCorrect:0,damageErr:0,priorityErr:0,routeErr:0,dgErr:0,heavyErr:0,scanned:0,blind:0,jams:0,jamsCleared:0}};
  },
  random(s){return Math.max(0,Math.min(1-Number.EPSILON,Number(s.random())||0));},
  begin(s){if(!['brief','rule'].includes(s.state))return false;if(s.state==='brief')this.wave(s,0);s.state='play';s.spawnTimer=s.waveIndex===0?.4:.3;return true;},
  wave(s,index){
    const wave=s.content.waves[index];if(!wave)return false;
    if(s.packages.length)return false; // A DG parcel must never be regraded under the following wave's route bins.
    s.waveIndex=index;s.wave=wave;s.waveTime=0;s.state='rule';if(s.jammed)this.clearJam(s,true);this.scheduleJam(s);return true;
  },
  scheduleJam(s){const j=s.wave?.jamEvery;s.jamAt=j?s.waveTime+j[0]+this.random(s)*(j[1]-j[0]):null;},
  front(s,unscanned=false){let best=null;for(const p of s.packages)if(!p.done&&(!unscanned||!p.scanned)&&(!best||p.position>best.position))best=p;return best;},
  spawn(s){
    if(s.state!=='play'||s.jammed||s.packages.length>=this.capacity)return null;
    const w=s.wave,r=this.random(s),size=r<.35?'s':r<.8?'m':'l',route=1+Math.floor(this.random(s)*3),priority=this.random(s)<w.priorityChance,dg=this.random(s)<(w.dgChance||0),heavy=!dg&&this.random(s)<(w.heavyChance||0);let damage=null;
    s.sinceDamage++;if(w.damageChance>0&&(this.random(s)<w.damageChance||s.sinceDamage>=6)){damage=this.random(s)<.5?'crushed':'leak';s.sinceDamage=0;}
    const pick=values=>values[Math.floor(this.random(s)*values.length)],marks=dg?[pick(['class3','class2','class8','class9_li'])]:[],tint=pick([0xC99A62,0xBF8D55,0xD4A56E]),weight=heavy?52+Math.floor(this.random(s)*28):2+Math.floor(this.random(s)*30);
    const p={id:++s.serial,route,priority,damage,dg,heavy,marks,size:heavy?'l':size,tint,weight,done:false,scanned:false,jammed:false,position:-70,bob:this.random(s)*6};s.packages.push(p);return p;
  },
  scan(s,p){if(s.state!=='play'||!s.packages.includes(p)||p.done||p.scanned)return false;p.scanned=true;s.stats.scanned++;return true;},
  correctBin(s,p){if(p.damage)return 'EXC';if(p.dg&&s.wave.bins.includes('DG'))return 'DG';if(p.heavy&&s.wave.bins.includes('HVY'))return 'HVY';if(p.priority&&s.wave.bins.includes('PRI'))return 'PRI';return 'R'+p.route;},
  addScore(s,points){s.score=Math.max(0,s.score+points);},
  remove(s,p){p.done=true;s.packages.splice(s.packages.indexOf(p),1);if(p.jammed)this.clearJam(s,true);},
  sort(s,p,bin){
    if(s.state!=='play'||!s.packages.includes(p)||p.done||!s.wave.bins.includes(bin))return false;
    const right=this.correctBin(s,p),ok=bin===right,blind=!p.scanned,pts=s.content.points,stats=s.stats;
    this.remove(s,p);if(blind)stats.blind++;if(p.damage||p.dg||p.heavy)stats.excTotal++;
    if(ok&&blind){s.streak=0;stats.correct++;this.addScore(s,pts.blind);}
    else if(ok){s.streak++;s.bestStreak=Math.max(s.bestStreak,s.streak);stats.correct++;if(p.damage||p.dg||p.heavy)stats.excCorrect++;this.addScore(s,pts.correct*Math.min(pts.maxMultiplier,1+Math.floor(s.streak/pts.comboStep)));}
    else{s.streak=0;stats.wrong++;if(p.damage)stats.damageErr++;else if(p.dg)stats.dgErr++;else if(p.heavy)stats.heavyErr++;else if(p.priority||bin==='PRI')stats.priorityErr++;else stats.routeErr++;this.addScore(s,pts.wrong);}
    return {id:p.id,ok,blind,station:bin,correct:right};
  },
  miss(s,p){
    if(s.state!=='play'||!s.packages.includes(p)||p.done)return false;
    this.remove(s,p);s.stats.missed++;if(p.damage||p.dg||p.heavy){s.stats.excTotal++;if(p.damage)s.stats.damageErr++;else if(p.dg)s.stats.dgErr++;else s.stats.heavyErr++;}s.streak=0;this.addScore(s,s.content.points.missed);return true;
  },
  jam(s){const p=this.front(s);if(s.state!=='play'||s.jammed||!p)return false;s.jammed=p;p.jammed=true;s.stats.jams++;s.jamTimer=s.content.jam.window;return true;},
  clearJam(s,byPlayer){
    if(!s.jammed)return false;s.jammed.jammed=false;s.jammed=null;
    if(byPlayer)s.stats.jamsCleared++;else this.addScore(s,-s.content.jam.penalty);this.scheduleJam(s);return true;
  },
  advance(s,seconds,active=true){
    if(s.state!=='play'||!active)return false;
    const dt=Math.max(0,Math.min(.05,Number(seconds)||0));s.beltSpeed+=((s.jammed?0:s.wave.beltSpeed)-s.beltSpeed)*Math.min(1,dt*6);s.waveTime+=dt;s.elapsed+=dt;
    if(s.jammed){s.jamTimer-=dt;if(s.jamTimer<=0)this.clearJam(s,false);}
    else if(s.jamAt!==null&&s.waveTime>s.jamAt&&!this.jam(s))s.jamTimer=4;
    s.spawnTimer-=dt;if(!s.jammed&&s.spawnTimer<=0&&s.waveTime<s.wave.duration-2){this.spawn(s);s.spawnTimer=s.wave.spawnEvery*(.8+this.random(s)*.4);}
    for(let i=s.packages.length-1;i>=0;i--){const p=s.packages[i];p.position+=s.beltSpeed*dt;if(p.position>1182)this.miss(s,p);}
    if(s.waveTime>=s.wave.duration&&!s.packages.length){if(s.waveIndex+1<s.content.waves.length)this.wave(s,s.waveIndex+1);else s.state='done';return true;}return false;
  },
  result(s){
    if(s.result)return s.result;
    if(s.state!=='done')return null;
    const a=s.stats,C=s.content,resolved=a.correct+a.wrong+a.missed,sorted=a.correct+a.wrong,scanRate=sorted?OTR.util.clamp01((sorted-a.blind)/sorted):1,handled=a.excTotal?a.excCorrect/a.excTotal:.5,jamRate=a.jams?a.jamsCleared/a.jams:1;
    const lessons=[],add=(n,text)=>{if(n)lessons.push({text,n});};add(a.dgErr,C.lessons.dg);add(a.heavyErr,C.lessons.heavy);add(a.damageErr,C.lessons.damage);add(a.missed,C.lessons.missed);add(a.jams-a.jamsCleared,C.lessons.jam);add(a.blind,C.lessons.scan);add(a.priorityErr,C.lessons.priority);add(a.routeErr,C.lessons.route);
    const mistakes=a.wrong+a.missed+a.blind+(a.jams-a.jamsCleared);if(!mistakes)lessons.push(C.lessons.perfect);
    s.result={score:s.score,ratios:{efficiency:resolved?a.correct/resolved:0,safety:handled*.55+scanRate*.3+jamRate*.15},lessons,mistakes,stats:a,
      summary:`You sorted ${a.correct} of ${resolved} packages correctly. You scanned ${sorted-a.blind} of ${sorted} sorted packages. Your best streak was ${s.bestStreak}. You handled ${a.excCorrect} of ${a.excTotal} special packages correctly.`};
    s.state='done';return s.result;
  }
};
