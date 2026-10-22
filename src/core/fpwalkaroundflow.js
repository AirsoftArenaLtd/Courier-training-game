/* Opt-in mission adapter for physical pre-trip checks and honest post-trip records. */
window.OTR=window.OTR||{};
OTR.fpWalkaroundFlow={
  prepare(plan){return plan&&plan.day>=4&&plan.damage===1?{...plan,walkaround:1}:plan;},
  enabled(m){return m.kind==='campaign'&&m.routePlan&&m.routePlan.walkaround===1;},
  configure(m){if(this.enabled(m))m.walkaround=OTR.fpWalkaround.create(m.damage);},
  valid(m,s,data){return this.enabled(m)&&OTR.fpWalkaround.valid(s,data.damage)&&s.departed===data.departed&&
    data.departed===(data.phase!=='prepare')&&s.finished===(data.phase==='debrief');},
  // The roof is inspected from its reachable edge. No climbing or camera teleport is needed.
  targets:[
    {zone:'front',name:'This is the front of the van.',x:0,y:.55,z:-2.708,w:.7,h:.2,d:.04},
    {zone:'rear',name:'This is the rear of the van.',x:-.18,y:1.75,z:2.8,w:.3,h:.5,d:.04},
    {zone:'left',name:'This is the left side of the van.',x:-1.16,y:1.78,z:.6,w:.04,h:.5,d:.8},
    {zone:'right',name:'This is the right side of the van.',x:1.16,y:1.78,z:.6,w:.04,h:.5,d:.8},
    {zone:'roof',name:'This is the roof edge of the van.',x:-1.11,y:2.94,z:.6,w:.08,h:.18,d:.8},
    {zone:'wheel',name:'This is the rear left wheel.',x:-1.24,y:.42,z:1.7,w:.04,h:.6,d:.6},
    {zone:'mirror',name:'This is the left mirror.',x:-1.29,y:2.13,z:-2.95,w:.08,h:.35,d:.35}
  ],
  target(zone){for(let i=0;i<this.targets.length;i++)if(this.targets[i].zone===zone)return this.targets[i];return null;},
  point(m,zone){const t=this.target(zone);return t?Object.assign({y:t.y},OTR.fp.local(m.van,t.x,t.z)):null;},
  phase(m){
    if(!m.walkaround||!m.damage.enabled||m.walkaround.finished)return null;
    if(m.phase==='prepare'&&!m.departed)return 'pretrip';
    if(m.phase==='return'&&m.departed&&Math.hypot(m.van.x-4,m.van.z-8)<14)return 'posttrip';
    return null;
  },
  canInspect(m,zone){
    const t=this.target(zone);if(!t||!this.phase(m)||m.mode!=='walk'||!m.parked()||m.heldId||zone==='rear'&&m.cargoOpen)return false;
    // Called for each proxy in sync: scalar local coordinates avoid point objects every frame.
    const dx=m.player.x-m.van.x,dz=m.player.z-m.van.z,c=Math.cos(m.van.yaw),s=Math.sin(m.van.yaw),x=c*dx+s*dz,z=-s*dx+c*dz;
    const outside=zone==='front'?z< -2.7:zone==='rear'?z>2.7:zone==='right'?x>1.1:x< -1.1;
    return outside&&(x-t.x)**2+(z-t.z)**2<2.1**2;
  },
  inspect(m,zone){
    if(!this.canInspect(m,zone))return null;
    const result=OTR.fpWalkaround.inspect(m.walkaround,m.damage,this.phase(m),zone);if(result)m.touch();return result;
  },
  record(m,zone,level){
    if(!this.canInspect(m,zone))return null;
    const result=OTR.fpWalkaround.record(m.walkaround,m.damage,this.phase(m),zone,level);
    if(result){if(result.event)this.fire(m,result.event);m.touch();}return result;
  },
  fire(m,event){
    const pre=event.type==='inspect.damage',fake=event.type==='trip.damage-false',id='walk:'+event.type+':'+event.key;
    if(m.events[id])return;
    const text=fake?'Recorded damage in an undamaged area.':pre?
      (event.ok?'Recorded existing damage before departure.':'Missed existing damage before departure.'):
      (event.ok?'Recorded new damage after the trip.':'Finished without a correct report of new damage.');
    m.log(id,pre?'inspection':'returns',event.ok?'good':'needs',text);
    if(OTR.workday)OTR.workday.report(event.type,{key:event.key,ok:event.ok});
  },
  depart(m){if(m.walkaround)for(const event of OTR.fpWalkaround.depart(m.walkaround,m.damage))this.fire(m,event);},
  finish(m){if(m.walkaround)for(const event of OTR.fpWalkaround.finish(m.walkaround,m.damage))this.fire(m,event);}
};
