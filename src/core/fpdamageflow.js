/* Opt-in campaign damage adapter. The scene enables it after visual integration. */
window.OTR=window.OTR||{};
OTR.fpDamageFlow={
  prepare(plan){return plan&&plan.day>=4?{...plan,damage:1}:plan;},
  enabled(m){return m.kind==='campaign'&&m.routePlan&&m.routePlan.damage===1;},
  configure(m,saved){
    if(!this.enabled(m))return;
    m.damage=saved||OTR.fpDamage.create(m.seed,m.routePlan.day);
    m._damageLoad={secured:false,count:0,lateral:0,braking:0};m._damageProximity={x:0,z:0,w:0,d:0};m._damageContact=false;
    m._damageClearances=this.clearances(m);for(const b of m._damageClearances)m.solids.push(...b.posts);
    this.applyRules(m);
  },
  clearances(m){
    if(!this.enabled(m)||!m.town)return [];
    if(!this.layouts)this.layouts=new WeakMap();if(this.layouts.has(m))return this.layouts.get(m);
    const t=m.town,out=[],others=OTR.fpNav?OTR.fpNav.obstacles(m):[];
    for(const x of t.xs.slice(1))for(let i=1;i<t.zs.length&&out.length<2;i++){
      const z=(t.zs[i-1]+t.zs[i])/2;
      if(m.stops.some(s=>Math.abs(s.park.x-x)<t.road/2+4&&Math.abs(s.park.z-z)<14)||
        [m.roadworks,...others].some(b=>b&&Math.abs(b.x-x)<t.road/2&&Math.abs(b.z-z)<14))continue;
      const b={id:'clearance-'+out.length,index:out.length,clearance:true,x,z,w:t.road+.8,d:.4,h:2.7,kind:out.length?'overhang':'bridge'};
      b.posts=[-1,1].map(side=>({x:x+side*(b.w/2+.2),z,w:.3,d:.5,h:3.3}));out.push(b);
    }
    this.layouts.set(m,out);return out;
  },
  block(m,pose){
    if(!m.damage)return null;
    for(const b of m._damageClearances)if(OTR.fp.vanBox(pose,b))return b;
    return null;
  },
  clearanceChecks(m,old,hit){
    const s=m.damage,v=m.van;if(!s.enabled)return;
    const direction=Math.abs(v.speed)>.15?Math.sign(v.speed):v.gear===-1?-1:1;
    for(const b of m._damageClearances){
      const bit=1<<b.index;if(s.clearanceFailed&bit)continue;
      const dx=v.x-b.x,dz=v.z-b.z,distance=Math.hypot(dx,dz),facing=(dx*Math.sin(v.yaw)-dz*Math.cos(v.yaw))*direction<0;
      if(hit===b){this.fire(m,OTR.fpDamage.clearance(s,b.index,false),old.speed);continue;}
      if(Math.abs(dx)<b.w/2+1&&Math.abs(dz)>3&&distance<18&&(facing||s.clearanceSeen&bit&&Math.abs(v.speed)<.15)){
        s.clearanceSeen|=bit;
        if(Math.abs(v.speed)<.15&&(v.hand||Math.abs(old.speed)>.15))this.fire(m,OTR.fpDamage.clearance(s,b.index,true),old.speed);
      }else if(s.clearanceSeen&bit&&distance>22)this.fire(m,OTR.fpDamage.clearance(s,b.index,true),old.speed);
    }
  },
  warning(m){
    if(!m.damage||!m.damage.enabled)return '';
    const v=m.van,direction=Math.abs(v.speed)>.15?Math.sign(v.speed):v.gear===-1?-1:1;
    for(const b of m._damageClearances){const dx=m.van.x-b.x,dz=m.van.z-b.z;
      if(Math.abs(dx)<b.w/2+1&&Math.abs(dz)<24&&(dx*Math.sin(v.yaw)-dz*Math.cos(v.yaw))*direction<0)return 'The clearance is 8 feet 10 inches. Take another street.';
    }return '';
  },
  applyRules(m){if(m.damage)OTR.fpDamage.setEnabled(m.damage,!(m.workdayRules&&m.workdayRules.damage===false));},
  valid(m,raw){
    if(!this.enabled(m)||!OTR.fpDamage.valid(raw)||raw.day!==m.routePlan.day)return false;
    const expected=OTR.fpDamage.create(m.seed,m.routePlan.day);
    return expected.baseline.every((n,i)=>n===raw.baseline[i]);
  },
  fire(m,event,speed){
    if(!event)return false;const id='damage:'+event.type+':'+event.key;if(m.events[id])return false;
    const text=event.type==='load.shift'?'The cargo shifted during a hard turn or brake.':
      event.type==='drive.clearance'?(event.ok?'The van stopped or took a safe detour before the low clearance.':'The van struck a low clearance.'):
      {front:'The front of the van has new damage.',rear:'The rear of the van has new damage.',
        left:'The left side of the van has new damage.',right:'The right side of the van has new damage.',
        roof:'The roof of the van has new damage.',wheel:'A wheel on the van has new damage.',mirror:'A mirror on the van has new damage.'}[event.key.split(':')[0]];
    m.log(id,'driving',event.ok?'good':'needs',text);
    m.dayNotice=text;
    if(OTR.workday)OTR.fpMission.emit(m,event.type,{key:event.key,stop:m.phase==='route'?m.activeStop+1:undefined,ok:event.ok,
      where:event.ok?undefined:{x:m.van.x,z:m.van.z,mph:Math.abs(speed)*2.2369362921}});
    return true;
  },
  zone(m,box){
    const v=m.van,F=OTR.fp,sideways=Math.abs(Math.sin(box.yaw||0))>.7,w=box.w||(sideways?3.6:1.8),d=box.d||(sideways?1.8:3.6),px=F.clamp(v.x,box.x-w/2,box.x+w/2)-v.x,pz=F.clamp(v.z,box.z-d/2,box.z+d/2)-v.z;
    const x=Math.cos(v.yaw)*px+Math.sin(v.yaw)*pz,z=-Math.sin(v.yaw)*px+Math.cos(v.yaw)*pz;
    if(box.h>0&&box.h<=.65)return 'wheel';
    if(Math.abs(x)/1.08>Math.abs(z)/2.7)return box.h>=1.55&&box.h<=2.35&&z< -1.1?'mirror':x<0?'left':'right';
    return z<0?'front':'rear';
  },
  replacesContact(m){return !!(m.damage&&m._damageContact);},
  nearContact(m){
    const p=m._damageProximity;
    for(let set=0;set<2;set++)for(const b of (set?m.traffic:m.solids)){
      const sideways=set&&Math.abs(Math.sin(b.yaw||0))>.7;
      p.x=b.x;p.z=b.z;p.w=(b.w||(sideways?3.6:1.8))+.4;p.d=(b.d||(sideways?1.8:3.6))+.4;
      if(OTR.fp.vanBox(m.van,p))return true;
    }
    for(const b of m._damageClearances){p.x=b.x;p.z=b.z;p.w=b.w+.4;p.d=b.d+.4;if(OTR.fp.vanBox(m.van,p))return true;}
    return false;
  },
  tick(m,input,old,traffic){
    const s=m.damage;if(!s)return;m._damageContact=false;
    if(!s.enabled||m.mode!=='cab'){
      m._damageContact=m.mode==='cab'&&!!(m.motion&&m.motion.contactBox&&m.motion.contactBox.clearance);
      OTR.fpDamage.release(s);return;
    }
    const motion=m.motion,box=traffic||(motion&&motion.contactBox),hit=!!box;
    if(hit){
      const moving=!!traffic,speed=moving?Math.abs(old.speed):motion.contactNormalSpeed,
        cause=box.clearance?'clearance':moving||m._driveSolids&&(box===m._driveSolids.bus||box===m._driveSolids.siren)?'traffic':'solid';
      const event=OTR.fpDamage.contact(s,box.clearance?'roof':this.zone(m,box),cause,speed);
      m._damageContact=true;this.fire(m,event,old.speed);
    }else if(s.source&&!this.nearContact(m))OTR.fpDamage.release(s);
    this.clearanceChecks(m,old,box);
    const warning=this.warning(m);if(warning&&!m._damageWarning&&!hit)m.dayNotice=warning;m._damageWarning=!!warning;
    const load=m._damageLoad;load.count=0;for(const p of m.parcels)if(p.location.startsWith('slot'))load.count++;
    load.secured=m.secured;load.lateral=hit?0:motion?motion.lateral:0;
    load.braking=!hit&&(input.back||m.van.hand)&&motion?Math.max(0,-motion.acceleration):0;
    this.fire(m,OTR.fpDamage.shift(s,m.leg,load),old.speed);
  }
};
