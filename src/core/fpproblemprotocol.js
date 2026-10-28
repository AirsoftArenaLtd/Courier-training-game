/* Optional road problems: bounded route/attempt observations and catalogue grading in an isolated local log. */
window.OTR=window.OTR||{};
OTR.fpProblemProtocol={
  create(id,stop,{unsafe=true,locked=false,day=4}={}){
    if(!['m4-closure','m4-blocked'].includes(id)||!stop?.packages?.[0]||typeof unsafe!=='boolean'||typeof locked!=='boolean')throw Error('Invalid road problem content');
    const spec={kind:'reattempt',parcel:stop.packages[0].id,day,nextDay:day+1,slot:'afternoon',reason:unsafe||locked?'access':'absent'},sequence=OTR.fpStops.create(spec);
    return {id,kind:id==='m4-closure'?'closure':'blocked',categories:id==='m4-closure'?['safety','efficiency']:['safety','service'],def:{...stop,par:(stop.par||120)+30},unsafe,locked,spec,sequence,elapsed:0,log:new OTR.ScoreLog(id),seen:new Set(),route:null,routeRow:null,doorReached:false,exception:null,overflow:false,phase:'active',result:null};
  },
  live(s){return s.phase==='active'&&!s.result&&!s.overflow;},
  observe(s,type,detail={}){
    const allowed=s.kind==='closure'?['drive.route','drive.contact']:['drive.sidewalk','stop.hazard','drive.contact'];
    if(!this.live(s)||!allowed.includes(type))return false;
    const key=detail.key??'once';if(!['string','number'].includes(typeof key)||String(key).length>80||typeof key==='number'&&!Number.isFinite(key))return false;
    const def=OTR_DATA.workdayEvents[type];
    if(type==='drive.route'){
      if(!s.routeRow)s.routeRow=s.log.check(def.cat,detail.ok===false?0:def.max,def.max,detail.ok===false?def.fail:def.label,{lesson:def.lesson,critical:!!def.critical,type});
      else if(detail.ok===false){Object.assign(s.routeRow,{got:0,label:def.fail,good:false,partial:false,critical:!!def.critical});}
      return true;
    }
    const token=type+'|'+key;if(s.seen.has(token))return false;
    if(s.seen.size>=32){s.overflow=true;return false;}s.seen.add(token);
    s.log.penalty(def.cat,def.pts,def.label,{lesson:def.lesson,severity:def.severity,critical:!!def.critical,type,where:detail.where});return true;
  },
  route(s,points,radius=3.5){
    if(!this.live(s)||s.kind!=='closure'||s.route||!Number.isFinite(radius)||radius<.5||radius>6||!Array.isArray(points)||points.length<2||points.length>16||points.some(p=>!p||!Number.isFinite(p.x)||!Number.isFinite(p.z)))return false;
    if(points.some((p,i)=>i&&Math.hypot(p.x-points[i-1].x,p.z-points[i-1].z)<.25))return false;
    s.route={points:points.map(p=>({x:p.x,z:p.z})),radius,next:0,lastX:null,lastZ:null,gateX:null,gateZ:null};return true;
  },
  step(s,pose,seconds,active=true){
    if(!active||!this.live(s))return false;const dt=Math.max(0,Math.min(.05,Number(seconds)||0));s.elapsed+=dt;
    const r=s.route;if(!r||pose?.mode!=='cab'||!Number.isFinite(pose.x)||!Number.isFinite(pose.z)||!Number.isFinite(pose.speed))return false;
    // A reloaded/relocated pose cannot skip route gates. Normal driving samples stay within the motor's travel.
    const jump=r.lastX!==null&&Math.hypot(pose.x-r.lastX,pose.z-r.lastZ)>Math.abs(pose.speed)*dt+.5;
    r.lastX=pose.x;r.lastZ=pose.z;
    if(jump){this.observe(s,'drive.route',{ok:false});return false;}
    const point=r.points[r.next];if(!point||Math.abs(pose.speed)<.3||Math.hypot(pose.x-point.x,pose.z-point.z)>r.radius||r.gateX!==null&&Math.hypot(pose.x-r.gateX,pose.z-r.gateZ)<.25)return false;
    r.next++;r.gateX=pose.x;r.gateZ=pose.z;return true;
  },
  reachDoor(s,pose,door){
    if(!this.live(s)||s.kind!=='blocked'||s.unsafe||s.locked||pose?.mode!=='walk'||!Number.isFinite(pose.x)||!Number.isFinite(pose.z)||!door||!Number.isFinite(door.x)||!Number.isFinite(door.z)||Math.hypot(pose.x-door.x,pose.z-door.z)>2.65)return false;
    s.doorReached=true;return true;
  },
  exception(s,code,parcel){
    if(!this.live(s)||s.kind!=='blocked'||s.exception||!parcel?.atVan||!parcel.secured||parcel.id!==s.spec.parcel)return false;
    const want=s.unsafe?'UN':s.locked?'AC':'NA';if(code!==want||want==='NA'&&!s.doorReached)return false;
    s.exception=code;return true;
  },
  retry(s,action,value,context){
    if(!this.live(s)||s.kind!=='blocked'||!s.exception)return false;
    if(action==='card'&&!context?.atCardPoint)return false;
    if(['retain','book'].includes(action)&&(!context?.atVan||!context.parcelSecured))return false;
    return OTR.fpStops.act(s.sequence,s.spec,action,value,s.elapsed);
  },
  ready(s,context){
    if(!this.live(s)||!context?.parked)return false;
    if(s.kind==='closure')return context.atDestination===true&&!!s.route&&s.route.next===s.route.points.length;
    return !!s.exception&&context.atVan&&context.parcelSecured&&OTR.fpStops.assessment(s.sequence).complete;
  },
  finish(s,context,reason='complete'){
    if(s.result)return s.result;const complete=reason==='complete'&&this.ready(s,context);
    if(reason==='complete'&&!complete)return null;
    if(complete&&s.kind==='closure'){
      if(!s.routeRow)this.observe(s,'drive.route',{ok:true});
      // Reuse the actual per-stop time rule and its labels; no second set of timing thresholds or points.
      const ref={def:s.def,S:{heavy:undefined,exitSafe:true,enterSafe:true,hazards:{},delivered:s.def.packages.map(p=>p.id),scanned:{},scannedInVan:true,outcome:'delivered',type:'recipient',signer:s.def.answer?.name,elapsed:s.elapsed,wrongPulls:0,vanTrips:0},log:new OTR.ScoreLog(s.id),collapsed:false,heat:null};
      StopScene.prototype.evaluate.call(ref);const rows=ref.log.items.filter(i=>i.cat==='efficiency'&&i.kind==='check'&&i.max===3);
      if(rows.length!==1)throw Error('The shared stop time rule changed');const row=rows[0];s.log.check(row.cat,row.got,row.max,row.label,row);
    }else if(complete){const observed=OTR.fpStops.assessment(s.sequence),def=OTR_DATA.workdayEvents[observed.type];s.log.check(def.cat,observed.ok?def.max:0,def.max,observed.ok?def.label:def.fail,{lesson:def.lesson,critical:!!def.critical,type:observed.type});}
    s.phase='done';const ratios={};for(const cat of s.categories)ratios[cat]=complete?s.log.ratio(cat):0;
    s.result={score:complete?s.log.score():0,ratios,untested:[],log:s.log,lessons:[],stats:{completed:complete,seconds:s.elapsed,par:s.def.par,route:s.route?{visited:s.route.next,total:s.route.points.length}:null,doorReached:s.doorReached,exception:s.exception,attempt:s.kind==='blocked'?{...OTR.fpStops.assessment(s.sequence),failed:s.sequence.failed}:null}};return s.result;
  }
};
