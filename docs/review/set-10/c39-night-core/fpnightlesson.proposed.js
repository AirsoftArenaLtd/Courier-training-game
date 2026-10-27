/* Draft optional night module. Local catalogue checks; not loaded by the game yet. */
window.OTR=window.OTR||{};
OTR.fpNightLesson={
  types:new Set(['inspect.lights','drive.lights','drive.following','drive.route']),
  create(){return {seen:new Set(),observations:{},travel:0,started:false,followingSeen:false,finished:false,result:null,parking:{ok:false,reason:''}};},
  model(){
    const seed=7,T=OTR.town.build(seed),lots=T.lots.filter(l=>l.row===0&&l.side===1),lot=lots[2];
    if(!lot)throw Error('The night run has no physical finish bay.');
    const route=[lot,...T.lots.filter(l=>l.id!==lot.id).slice(0,4)],scale=OTR.fpRoute.SCALE;
    const plan={day:6,variant:seed,townSeed:seed,weather:'clear',clockMin:1260,timeOfDay:'night',signs:1,traffic:1,navigation:1,
      route:route.map((l,i)=>({lotId:l.id,stop:{answer:true,packages:[{number:l.number,street:l.street,tracking:'night-'+i,weight:4,service:'standard'}]}}))};
    const m=OTR.fpMission.create('campaign',seed,plan),s=this.create(),stop=m.stops[0],bay=TownDriveScene.prototype.parkBay.call({van:{g:{hl:2.7}},P:1/scale,T},lot);
    stop.index=1;stop.bay={streetX:0,z0:8-(bay.x1-T.depot.x)*scale,z1:8-(bay.x0-T.depot.x)*scale};
    m.nightLesson=s;s.bounds={...m.bounds};s.start={...m.van};const front=OTR.fp.local(m.van,2.3,-3.5),light=m.point('lights');s.playerStart={...m.player,...front,yaw:Math.atan2(light.x-front.x,-(light.z-front.z))};s.parkingModel=Object.create(m);s.parkingModel.drivingLesson={parking:s.parking};
    m.stops=[stop];m.parcels=[];m.phase='route';m.departed=m.secured=true;m.mode='walk';m.cargoOpen=false;return m;
  },
  attach(run){
    const m=run.model,s=m.nightLesson;if(s.attached)return false;s.attached=true;m.bounds={...s.bounds};m.trainingArea=null;Object.assign(m.van,s.start);Object.assign(m.player,s.playerStart);m.mode='walk';
    m.nightDrive={version:1,leg:0,required:false,failed:false};
    OTR.fpDriving.configure(m);m.driving.bus.state=m.driving.siren.state='done';OTR.fpDriving.syncActors(m);m.crossing.state='resolved';
    // A real moving lead vehicle supplies the existing three-second-gap observation.
    s.lead=m.traffic[0];Object.assign(s.lead,{x:m.van.x,z:m.van.z-24,yaw:0,speed:0,cruise:0});OTR.fpNav.configure(m);
    m.moduleReport=(type,detail)=>this.report(run,type,detail);
    const step=m.step;m.step=(input,seconds)=>{
      if(m.paused||s.finished)return;if(!s.started)s.lead.speed=s.lead.cruise=0;else s.lead.cruise=4;const x=m.van.x,z=m.van.z;step.call(m,input,seconds);s.travel+=Math.hypot(m.van.x-x,m.van.z-z);
      if(!s.started&&Math.abs(m.van.speed)>.3){s.started=true;this.report(run,'inspect.lights',{key:'before-moving',ok:m.checks.lights===true});}
      if(m.driving.followingSeen)s.followingSeen=true;
    };return true;
  },
  report(run,type,detail={}){
    const s=run.model.nightLesson;if(run.phase!=='active'||s.finished||!this.types.has(type))return false;
    const key=type+'|'+String(detail.key??'');if(s.seen.has(key))return false;if(s.seen.size>=128){run.overflow=true;return false;}s.seen.add(key);
    const old=s.observations[type],ok=detail.ok!==false;if(!old||old.ok&&!ok)s.observations[type]={ok,where:detail.where};return true;
  },
  parking(m){
    const s=m.nightLesson,p=OTR.fpDrivingLesson.parking(s.parkingModel,m.stops[0]),v=m.van,stop=m.stops[0],b=stop.bay;if(!p.ok)return p;
    const c=Math.cos(v.yaw),sn=Math.sin(v.yaw),width=Math.abs(c)*1.08+Math.abs(sn)*2.7,length=Math.abs(sn)*1.08+Math.abs(c)*2.7;
    if(Math.cos(v.yaw-stop.park.yaw)<.94||Math.abs(v.x-stop.park.x)+width>1.3||v.z-length<b.z0||v.z+length>b.z1){p.ok=false;p.reason='Keep the whole van inside the painted lines of the marked bay.';}return p;
  },
  ready(m){const s=m.nightLesson;return s.started&&s.travel>30&&s.followingSeen&&!!m.nightDrive.required&&this.parking(m).ok;},
  result(run,reason='complete'){
    const m=run.model,s=m.nightLesson;if(s.result)return s.result;
    const complete=reason==='complete'&&!run.overflow&&this.ready(m);
    OTR.fpNight.endLeg(m);OTR.fpDriving.endLeg(m);
    run.log.setGroup('night');
    for(const type of this.types){const def=OTR_DATA.workdayEvents[type],item=s.observations[type],ok=type==='drive.route'?complete&&item?.ok!==false:!!item?.ok;
      run.log.check(def.cat,ok?def.max:0,def.max,ok?def.label:def.fail,{lesson:def.lesson,critical:!!def.critical,severity:def.severity,where:item?.where});}
    s.finished=true;const ratios=run.log.ratios(['safety','efficiency']);if(!complete)ratios.safety=ratios.efficiency=0;
    s.result={score:complete?run.log.score():0,ratios,log:run.log,lessons:[],stats:{completed:complete,log:run.log.toJSON()}};return s.result;
  }
};
