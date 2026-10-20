/* Bounded damage/load model. Not loaded by the scene until its adapters are ready. */
window.OTR=window.OTR||{};
OTR.fpDamage={
  zones:['front','rear','left','right','roof','wheel','mirror'],
  sources:['solid','traffic','clearance'],
  fields:['version','day','enabled','baseline','added','serial','source','contactMask','clearance','clearanceFailed','clearanceSeen','shiftMask','loadX','loadZ'],
  create(seed,day,allowed=true){
    if(!Number.isInteger(seed)||seed<1||seed>0xffffffff||!Number.isInteger(day)||day<1||day>3650||typeof allowed!=='boolean')throw Error('Invalid damage parameters');
    const enabled=allowed&&day>=4,baseline=Array(7).fill(0);
    // Starting wear is never a player-caused impact or a scoring event.
    if(enabled&&(seed+day)%4===0)baseline[(seed+day)%7]=1+seed%2;
    return {version:1,day,enabled,baseline,added:Array(7).fill(0),serial:0,source:0,contactMask:0,
      clearance:0,clearanceFailed:0,clearanceSeen:0,shiftMask:0,loadX:0,loadZ:0};
  },
  setEnabled(s,allowed){
    if(typeof allowed!=='boolean')return false;
    s.enabled=allowed&&s.day>=4;if(!s.enabled)this.release(s);return s.enabled;
  },
  level(s,zone){const i=this.zones.indexOf(zone);return i<0?0:Math.max(s.baseline[i],s.added[i]);},
  contact(s,zone,cause,speed){
    const i=this.zones.indexOf(zone),source=this.sources.indexOf(cause)+1;
    if(!s.enabled||i<0||!source||!Number.isFinite(speed)||speed<.35||speed>80)return null;
    const level=speed>=6?3:speed>=2.5?2:1;
    s.added[i]=Math.max(s.added[i],level);
    if(s.source!==source){
      if(s.serial===0x7fffffff)return null;
      s.serial++;s.source=source;s.contactMask=0;
    }
    const bit=1<<i;if(s.contactMask&bit)return null;s.contactMask|=bit;
    return {type:'van.damage-'+['scuff','dent','major'][level-1],key:zone+':'+cause+'-'+s.serial,ok:false};
  },
  release(s){s.source=0;s.contactMask=0;},
  clearance(s,index,ok){
    if(!s.enabled||!Number.isInteger(index)||index<0||index>1||typeof ok!=='boolean')return null;
    const bit=1<<index,stopped=!!(s.clearance&bit);
    if(s.clearanceFailed&bit||ok&&stopped)return null;
    s.clearance|=bit;s.clearanceSeen|=bit;if(!ok)s.clearanceFailed|=bit;
    // Moving off after a safe halt is a new decision. A later strike must not reuse
    // the successful report's key, which the scoring contract correctly deduplicates.
    return {type:'drive.clearance',key:'clearance-'+index+(stopped&&!ok?'-strike':''),ok};
  },
  shift(s,leg,input){
    if(!s.enabled||!Number.isInteger(leg)||leg<0||leg>7||!input||typeof input.secured!=='boolean'||
      !Number.isInteger(input.count)||input.count<1||input.count>6||
      !Number.isFinite(input.lateral)||Math.abs(input.lateral)>30||!Number.isFinite(input.braking)||input.braking<0||input.braking>30)return null;
    const bit=1<<leg,threshold=input.secured?6.5:3;
    if(s.shiftMask&bit||Math.max(Math.abs(input.lateral),input.braking)<threshold)return null;
    s.shiftMask|=bit;const amount=input.secured?1:3,clamp=n=>Math.max(-3,Math.min(3,n));
    if(Math.abs(input.lateral)>=threshold)s.loadX=clamp(s.loadX+Math.sign(input.lateral)*amount);
    if(input.braking>=threshold)s.loadZ=clamp(s.loadZ-amount);
    return {type:'load.shift',key:'load-'+leg,ok:false};
  },
  valid(s){
    const int=(n,max)=>Number.isInteger(n)&&n>=0&&n<=max;
    if(!s||typeof s!=='object'||Array.isArray(s)||Object.keys(s).length!==this.fields.length||
      !this.fields.every(k=>Object.prototype.hasOwnProperty.call(s,k))||s.version!==1||
      !Number.isInteger(s.day)||s.day<1||s.day>3650||typeof s.enabled!=='boolean')return false;
    for(const a of [s.baseline,s.added]){if(!Array.isArray(a)||a.length!==7)return false;for(let i=0;i<7;i++)if(!int(a[i],3))return false;}
    if(!int(s.serial,0x7fffffff)||!int(s.source,3)||!int(s.contactMask,127)||!int(s.clearance,3)||
      !int(s.clearanceFailed,3)||(s.clearanceFailed&~s.clearance)||!int(s.clearanceSeen,3)||(s.clearance&~s.clearanceSeen)||!int(s.shiftMask,255)||
      !Number.isInteger(s.loadX)||Math.abs(s.loadX)>3||!Number.isInteger(s.loadZ)||s.loadZ>0||s.loadZ<-3)return false;
    if((s.source===0)!==(s.contactMask===0)||s.source&&s.serial===0||s.loadX!==0&&!s.shiftMask||s.loadZ!==0&&!s.shiftMask)return false;
    if(!s.enabled&&s.source||(s.serial===0)!==!s.added.some(Boolean)||s.added.some((n,i)=>!n&&(s.contactMask&(1<<i))))return false;
    if(s.day<4&&(s.enabled||s.baseline.some(Boolean)||s.added.some(Boolean)||s.serial||s.clearance||s.clearanceSeen||s.shiftMask))return false;
    return true;
  },
  restore(raw){return this.valid(raw)?{...raw,baseline:raw.baseline.slice(),added:raw.added.slice()}:null;}
};
