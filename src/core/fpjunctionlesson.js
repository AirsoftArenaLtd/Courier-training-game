/* Three physical junction approaches. Each round owns bounded observations and keeps the catalogue's checks. */
window.OTR=window.OTR||{};
OTR.fpJunctionLesson={
  rounds:[
    {kind:'stop',index:2,type:'drive.sign-stop',approach:'n'},
    {kind:'signal',index:6,type:'drive.red-light',approach:'n'},
    {kind:'giveway',index:17,type:'drive.sign-giveway',approach:'e'}
  ],
  types:new Set(['drive.sign-stop','drive.red-light','drive.sign-giveway','drive.signal','drive.mirrors','drive.route']),
  create(){return {index:0,rounds:[],finished:false,result:null};},
  required(index){return [this.rounds[index].type,'drive.signal','drive.mirrors','drive.route'];},
  model(run){
    const course=run.junctionLesson||(run.junctionLesson=this.create()),def=this.rounds[course.index];
    if(!def||course.finished)throw Error('The junction course has already finished.');
    const seed=7,T=OTR.town.build(seed),scale=OTR.fpRoute.SCALE;
    const project=lot=>({x:(lot.park.y-T.hy[0])*scale,z:8-(lot.park.x-T.depot.x)*scale});
    if(run.model?.junctionLesson&&!run.model.junctionLesson.recorded)throw Error('Record the current approach before starting another.');
    const row=def.kind==='signal'?1:0,col=def.index%T.vx.length,junctionZ=8-(T.vx[col]-T.depot.x)*scale;
    const lot=T.lots.find(l=>l.row===row&&l.side===1&&project(l).z<junctionZ-21&&project(l).z>junctionZ-34);
    if(!lot)throw Error('The junction approach has no safe finish bay.');
    const lots=[lot,...T.lots.filter(l=>l.id!==lot.id).slice(0,4)],plan={day:3,variant:seed,townSeed:seed,weather:'clear',clockMin:720,signs:1,traffic:1,navigation:1,
      route:lots.map((l,i)=>({lotId:l.id,stop:{answer:true,packages:[{number:l.number,street:l.street,tracking:'junction-'+i,weight:4,service:'standard'}]}}))};
    const m=OTR.fpMission.create('campaign',seed,plan),control=OTR.fpTraffic.layout(m)[def.index],stop=m.stops[0];
    if(control.kind!==def.kind)throw Error('The junction layout no longer matches the course.');
    const sourceBay=TownDriveScene.prototype.parkBay.call({van:{g:{hl:2.7}},P:1/scale,T},lot);
    stop.index=1;stop.bay={streetX:control.x,z0:8-(sourceBay.x1-T.depot.x)*scale,z1:8-(sourceBay.x0-T.depot.x)*scale};
    const yaw=def.approach==='e'?Math.PI/2:0,half=m.town.road/2;
    const start={...m.van,x:control.x-Math.sin(yaw)*12.5+Math.cos(yaw)*1.7,z:control.z+Math.cos(yaw)*12.5+Math.sin(yaw)*1.7,
      yaw,speed:0,steer:0,gear:1,hand:true,belt:false,look:0};
    if(def.kind==='giveway'){
      const center=control.x+16,z=control.z+half-1.08-.6;
      Object.assign(stop,{x:center,z,address:'the marked bay beyond the give-way junction',side:1,
        park:{x:center,z,yaw},bay:{axis:'x',streetZ:control.z,x0:center-5,x1:center+5,z0:z-1.3,z1:z+1.3}});
    }
    m.junctionLesson={index:course.index,control: {...control},start,bounds:{...m.bounds},seen:new Set(),observations:{},travel:0,crossed:false,recorded:false,
      parking:{ok:false,reason:''}};
    m.stops=[stop];m.parcels=[];m.phase='route';m.mode='cab';m.departed=m.secured=m.repaired=true;m.cargoOpen=false;
    return m;
  },
  attach(run){
    const m=run.model,s=m.junctionLesson,def=this.rounds[s.index];if(s.attached)return false;s.attached=true;
    m.bounds={...s.bounds};m.trainingArea=null;m.mode='cab';Object.assign(m.van,s.start);
    // A declared training round begins behind its red signal. Its visible phase and observation use the same layout.
    if(def.kind==='signal')OTR.fpTraffic.layout(m)[def.index].offset=27;
    OTR.fpDriving.configure(m);m.driving.bus.state=m.driving.siren.state='done';OTR.fpDriving.syncActors(m);
    m.crossing.state='resolved';OTR.fpTraffic.syncSolids(m);
    if(def.kind==='giveway')Object.assign(m.traffic[0],{x:s.control.x+1.7,z:s.control.z+22,yaw:0,speed:4,cruise:4});
    OTR.fpNav.configure(m);
    // Round-local keys can repeat in the next approach. The course log is retained; the suspended workday is never a sink.
    m.moduleReport=(type,detail)=>this.report(run,type,detail);
    const step=m.step;m.step=(input,seconds)=>{
      if(m.paused||s.recorded)return;
      const x=m.van.x,z=m.van.z;step.call(m,input,seconds);s.travel+=Math.hypot(m.van.x-x,m.van.z-z);
    };return true;
  },
  controlKey(m){
    const s=m.junctionLesson,d=this.rounds[s.index];
    if(d.kind==='stop')return OTR.fpSigns.stopId(m,d.index,d.approach);
    return d.kind==='signal'?s.control.id+':'+d.approach:`yield:${d.index}:${d.approach}`;
  },
  report(run,type,detail={}){
    const m=run.model,s=m.junctionLesson,d=this.rounds[s.index];
    if(run.phase!=='active'||run.junctionLesson.finished||s.recorded||!this.types.has(type)||!this.required(s.index).includes(type))return false;
    if(type===d.type&&String(detail.key)!==this.controlKey(m))return false;
    const key=type+'|'+String(detail.key??'');if(s.seen.has(key))return false;
    if(s.seen.size>=128){run.overflow=true;return false;}s.seen.add(key);
    const old=s.observations[type],ok=detail.ok!==false;
    // More pull-outs cannot dilute a failed mirror/signal check with fresh positive points.
    if(!old||old.ok&&!ok)s.observations[type]={ok,where:detail.where};
    if(type===d.type)s.crossed=true;return true;
  },
  parking(m){
    const s=m.junctionLesson,p=s.parking,v=m.van,stop=m.stops[0],b=stop.bay;p.ok=false;
    if(!m.parked()){p.reason='Stop fully and set the parking brake before recording this checkpoint.';return p;}
    if(Math.cos(v.yaw-stop.park.yaw)<.94){p.reason='Park the whole van in the marked bay, facing the same way as the traffic.';return p;}
    if(b.axis!=='x'){
      const proxy=Object.create(m);proxy.drivingLesson={parking:p};return OTR.fpDrivingLesson.parking(proxy,stop);
    }
    const c=Math.cos(v.yaw),sn=Math.sin(v.yaw),halfX=Math.abs(c)*1.08+Math.abs(sn)*2.7,halfZ=Math.abs(sn)*1.08+Math.abs(c)*2.7;
    if(v.x-halfX<b.x0||v.x+halfX>b.x1||v.z-halfZ<b.z0||v.z+halfZ>b.z1||Math.cos(v.yaw-stop.park.yaw)<.94){
      p.reason='Park the whole van in the marked bay, facing the same way as the traffic.';return p;
    }
    if(m.solids.some(box=>OTR.fp.vanBox(v,box))){p.reason='Keep the whole van clear of buildings and obstacles.';return p;}
    p.ok=true;p.reason='';return p;
  },
  ready(m){const s=m.junctionLesson;return !s.recorded&&s.crossed&&s.travel>10&&this.parking(m).ok;},
  grade(run,index,observations){
    run.log.setGroup('junction-'+index);
    for(const type of this.required(index)){
      const def=OTR_DATA.workdayEvents[type],item=observations[type],ok=!!item?.ok;
      run.log.check(def.cat,ok?def.max:0,def.max,ok?def.label:def.fail,{lesson:def.lesson,critical:!!def.critical,severity:def.severity,where:item?.where});
    }
  },
  record(run){
    const m=run.model,s=m.junctionLesson,course=run.junctionLesson;
    if(run.phase!=='active'||run.overflow||course.finished||!this.ready(m))return false;
    const route=s.observations['drive.route'];if(!route)s.observations['drive.route']={ok:true};
    this.grade(run,s.index,s.observations);s.recorded=true;
    course.rounds.push({index:s.index,travel:s.travel,observations:OTR.fpMission.clone(s.observations)});course.index++;
    return true;
  },
  result(run,reason='complete'){
    const course=run.junctionLesson;if(course.result)return course.result;
    const complete=reason==='complete'&&course.index===this.rounds.length;
    for(let i=course.index;i<this.rounds.length;i++)this.grade(run,i,i===course.index?run.model.junctionLesson.observations:{});
    course.finished=true;run.model.junctionLesson.recorded=true;
    const ratios=run.log.ratios(['safety','efficiency']);if(!complete)ratios.safety=ratios.efficiency=0;
    course.result={score:complete?run.log.score():0,ratios,log:run.log,lessons:complete?[]:['Complete all three junction approaches and park in each marked bay.'],
      stats:{completed:complete,approaches:course.rounds.length,log:run.log.toJSON()}};return course.result;
  }
};
