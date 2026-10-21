/* Bounded walkaround records. Proximity and workday reporting belong to the scene adapter. */
window.OTR=window.OTR||{};
OTR.fpWalkaround=(()=>{
  const zones=['front','rear','left','right','roof','wheel','mirror'];
  const descriptions=['No damage is visible.','The paint is scuffed here.','A dent is visible here.','Major damage is visible here.'];
  const fields=['version','day','preSeen','postSeen','pre','post','observed','departed','finished','falseMask'];
  const damage=d=>OTR.fpDamage.valid(d),enabled=d=>d.enabled&&d.day>=4;
  const code=n=>Number.isInteger(n)&&n>=-1&&n<=3;
  function create(d){
    if(!damage(d))throw Error('Invalid walkaround damage');
    return {version:1,day:d.day,preSeen:0,postSeen:0,pre:Array(7).fill(-1),post:Array(7).fill(-1),observed:Array(7).fill(-1),departed:false,finished:false,falseMask:0};
  }
  function valid(s,d){
    const mask=n=>Number.isInteger(n)&&n>=0&&n<=127;
    if(!damage(d)||!s||typeof s!=='object'||Array.isArray(s)||Object.keys(s).length!==fields.length||fields.some(k=>!Object.hasOwn(s,k))||
      s.version!==1||s.day!==d.day||!mask(s.preSeen)||!mask(s.postSeen)||!mask(s.falseMask)||
      typeof s.departed!=='boolean'||typeof s.finished!=='boolean'||s.finished&&!s.departed||
      !s.departed&&(s.postSeen||s.falseMask)||s.falseMask&~s.postSeen)return false;
    for(const a of [s.pre,s.post,s.observed]){
      if(!Array.isArray(a)||a.length!==7)return false;
      for(let i=0;i<7;i++)if(!code(a[i]))return false;
    }
    for(let i=0;i<7;i++){
      const bit=1<<i;
      if(s.pre[i]>=0&&!(s.preSeen&bit)||s.post[i]>=0&&!(s.postSeen&bit)||
        !!(s.postSeen&bit)!==(s.observed[i]>=0)||s.observed[i]>d.added[i])return false;
    }
    if(d.day<4&&(s.preSeen||s.postSeen||s.falseMask||s.pre.some(n=>n>=0)||s.post.some(n=>n>=0)))return false;
    return true;
  }
  function allowed(s,d,phase){
    return valid(s,d)&&enabled(d)&&!s.finished&&(phase==='pretrip'?!s.departed:phase==='posttrip'&&s.departed);
  }
  function inspect(s,d,phase,zone){
    const i=zones.indexOf(zone);if(i<0||!allowed(s,d,phase))return null;
    const pre=phase==='pretrip',bit=1<<i;
    if(pre)s.preSeen|=bit;
    else{
      if(s.observed[i]!==d.added[i])s.post[i]=-1;
      s.postSeen|=bit;s.observed[i]=d.added[i];
    }
    const level=pre?d.baseline[i]:Math.max(d.baseline[i],d.added[i]);
    return {zone,level,description:descriptions[level]};
  }
  function record(s,d,phase,zone,level){
    const i=zones.indexOf(zone),pre=phase==='pretrip',bit=1<<i;
    if(i<0||!Number.isInteger(level)||level<0||level>3||!allowed(s,d,phase)||
      !((pre?s.preSeen:s.postSeen)&bit)||!pre&&s.observed[i]!==d.added[i])return null;
    const actual=pre?d.baseline[i]:Math.max(d.baseline[i],d.added[i]);
    (pre?s.pre:s.post)[i]=level;let event=null;
    if(!pre&&level>0&&actual===0&&!(s.falseMask&bit)){
      s.falseMask|=bit;event={type:'trip.damage-false',key:zone,ok:false};
    }
    return {correct:level===actual,event};
  }
  function depart(s,d){
    if(!valid(s,d)||s.departed||s.finished)return [];
    s.departed=true;if(!enabled(d))return [];
    const events=[];
    for(let i=0;i<7;i++)if(d.baseline[i]>0)events.push({type:'inspect.damage',key:zones[i],ok:!!(s.preSeen&(1<<i))&&s.pre[i]===d.baseline[i]});
    return events;
  }
  function finish(s,d){
    if(!valid(s,d)||!s.departed||s.finished)return [];
    s.finished=true;if(!enabled(d))return [];
    const events=[];
    for(let i=0;i<7;i++)if(d.added[i]>0)events.push({type:'trip.damage-report',key:zones[i],ok:!!(s.postSeen&(1<<i))&&
      s.observed[i]===d.added[i]&&s.post[i]===Math.max(d.baseline[i],d.added[i])});
    return events;
  }
  function restore(raw,d){return valid(raw,d)?{...raw,pre:raw.pre.slice(),post:raw.post.slice(),observed:raw.observed.slice()}:null;}
  return {zones,descriptions,create,valid,inspect,record,depart,finish,restore};
})();
