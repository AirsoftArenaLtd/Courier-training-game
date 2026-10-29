/* Unloaded M8 policy kernels. Physical adapters supply real motion and local reports; no saved workday writes. */
window.OTR=window.OTR||{};
OTR.fpIceFatigue={
  box(b){
    if(!b||!['x','z','w','d'].every(k=>Number.isFinite(b[k]))||b.w<=0||b.d<=0)throw Error('Invalid wellness policy region');
    return Object.freeze({x:b.x,z:b.z,w:b.w,d:b.d});
  },
  inside(p,b){return !!p&&Number.isFinite(p.x)&&Number.isFinite(p.z)&&Math.abs(p.x-b.x)<=b.w/2&&Math.abs(p.z-b.z)<=b.d/2;},
  dt(s,m,seconds,active){return s.phase==='active'&&active&&!m.paused&&Number.isFinite(seconds)&&seconds>0?Math.min(.05,seconds):0;},
  safePark(m,b){
    const v=m.van;if(!v||![v.x,v.z,v.yaw,v.speed].every(Number.isFinite)||!v.hand||Math.abs(v.speed)>.01||v.gear!==2)return false;
    // Match the real collision footprint, including the corners of a turned van.
    const c=Math.abs(Math.cos(v.yaw)),n=Math.abs(Math.sin(v.yaw)),x=c*1.08+n*2.7,z=n*1.08+c*2.7;
    return Math.abs(v.x-b.x)+x<=b.w/2+1e-9&&Math.abs(v.z-b.z)+z<=b.d/2+1e-9;
  },
  ice(log,m,spec){
    return {phase:'active',log,time:0,start:this.box(spec.start),goal:this.box(spec.goal),ice:this.box(spec.ice),grit:this.box(spec.grit),rail:this.box(spec.rail),
      oldX:m.player.x,oldZ:m.player.z,started:false,distance:0,gritDistance:0,railDistance:0,holdingRail:false,slipped:false,slipAt:null,weather:null,result:null};
  },
  rail(s,m,hold){
    if(s.phase!=='active'||m.mode!=='walk'||!this.inside(m.player,s.rail))return false;
    s.holdingRail=!!hold;return true;
  },
  weather(s,type,detail={}){
    if(s.phase!=='active'||type!=='drive.weather')return false;
    s.weather=s.weather!==false&&detail.ok!==false;return true;
  },
  observeIce(s,m,seconds,active=true){
    const dt=this.dt(s,m,seconds,active);if(!dt)return false;s.time+=dt;
    const p=m.player,distance=Math.hypot(p.x-s.oldX,p.z-s.oldZ),moving=m.mode==='walk'&&distance>1e-8;
    s.oldX=p.x;s.oldZ=p.z;if(!moving)return true;
    if(this.inside(p,s.start))s.started=true;
    if(!s.started)return true;s.distance+=distance;
    if(this.inside(p,s.ice)&&distance/dt>1.5&&!s.slipped){s.slipped=true;s.slipAt=s.time;}
    if(this.inside(p,s.grit))s.gritDistance+=distance;
    if(!this.inside(p,s.rail))s.holdingRail=false;
    if(s.holdingRail)s.railDistance+=distance;
    return true;
  },
  iceReady(s,m){return s.phase==='active'&&s.weather!==null&&s.started&&s.distance>=2&&m.mode==='walk'&&this.inside(m.player,s.goal);},
  iceResult(s,m,reason='complete'){
    if(s.result)return s.result;const complete=reason==='complete'&&this.iceReady(s,m),def=OTR_DATA.workdayEvents['drive.weather'];
    if(s.weather!==null)s.log.check(def.cat,s.weather===true?def.max:0,def.max,s.weather===true?def.label:def.fail,{lesson:def.lesson,type:'drive.weather'});
    s.log.check('safety',complete&&!s.slipped?2:0,2,s.slipped?'Moved too quickly on the icy approach.':complete?'Used short, careful steps across the icy approach.':'Did not complete the icy approach.',{lesson:'Use short, careful steps on ice. Keep to the gritted path or use the handrail.',critical:false});
    const supported=s.gritDistance>=1||s.railDistance>=1;
    s.log.check('safety',complete&&supported?2:0,2,complete&&supported?'Used the gritted path or the handrail.':'Did not use the gritted path or the handrail.',{lesson:'Choose the gritted path. Use the handrail where one is available.',critical:false});
    s.phase='finished';s.result={score:complete?s.log.score():0,ratios:{safety:complete?s.log.ratio('safety'):0},log:s.log,stats:{completed:complete,slipped:s.slipped,gritDistance:s.gritDistance,railDistance:s.railDistance}};return s.result;
  },
  fatigue(log,spec){
    const promptAt=spec.promptAt??30,breakSeconds=spec.breakSeconds??30;
    if(!Number.isFinite(promptAt)||promptAt<0||!Number.isFinite(breakSeconds)||breakSeconds<=0)throw Error('Invalid fatigue policy timing');
    return {phase:'active',log,time:0,promptAt,breakSeconds,park:this.box(spec.park),prompted:false,parkedAt:null,lateDriving:false,
      resting:false,restSeconds:0,breakComplete:false,breakDuration:null,efficiencyFailed:false,result:null};
  },
  observeFatigue(s,m,seconds,active=true){
    const dt=this.dt(s,m,seconds,active);if(!dt)return false;s.time+=dt;
    if(s.time+1e-8>=s.promptAt)s.prompted=true;
    if(!s.prompted)return true;
    const parked=this.safePark(m,s.park);
    if(parked&&s.parkedAt===null)s.parkedAt=s.time;
    if(s.time+1e-8>=s.promptAt+120&&Math.abs(m.van.speed)>.1)s.lateDriving=true;
    if(s.resting){
      if(!parked){s.resting=false;s.efficiencyFailed=true;}
      else s.restSeconds+=dt;
    }
    return true;
  },
  startBreak(s,m){
    if(s.phase!=='active'||!s.prompted||s.resting||s.breakComplete||!this.safePark(m,s.park))return false;
    s.resting=true;s.restSeconds=0;return true;
  },
  endBreak(s,m){
    if(s.phase!=='active'||!s.resting||!this.safePark(m,s.park))return false;
    s.resting=false;s.breakDuration=s.restSeconds;
    if(s.restSeconds+1e-8<s.breakSeconds||s.restSeconds>s.breakSeconds*2+1e-8)s.efficiencyFailed=true;
    s.breakComplete=s.restSeconds+1e-8>=s.breakSeconds;return s.breakComplete;
  },
  fatigueReady(s,m){return s.phase==='active'&&s.prompted&&s.breakComplete&&this.safePark(m,s.park);},
  fatigueResult(s,m,reason='complete'){
    if(s.result)return s.result;const complete=reason==='complete'&&this.fatigueReady(s,m),safe=s.parkedAt!==null&&s.parkedAt-s.promptAt<=60+1e-8&&!s.lateDriving;
    const safety=s.log.check('safety',safe?2:0,2,safe?'Parked safely within one minute of the tiredness warning.':'Did not park safely within one minute of the tiredness warning.',{lesson:'When tiredness affects your driving, find a safe place to park and take a break.',critical:false});
    if(!safe)safety.severity='major';
    const rested=s.breakComplete&&!s.efficiencyFailed;
    s.log.check('efficiency',rested?2:0,2,rested?'Took a break for the required time.':'The required break was not completed within the allowed time.',{lesson:'Stay safely parked for the required break, then return to work when rested.',critical:false});
    s.phase='finished';s.result={score:complete?s.log.score():0,ratios:{safety:complete?s.log.ratio('safety'):0,efficiency:complete?s.log.ratio('efficiency'):0},log:s.log,stats:{completed:complete,promptAt:s.promptAt,parkedAt:s.parkedAt,lateDriving:s.lateDriving,breakDuration:s.breakDuration}};return s.result;
  }
};
