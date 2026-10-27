/* Optional school-zone module core. Runtime registration and native acceptance follow separately. */
window.OTR=window.OTR||{};
OTR.fpSchoolLesson={
  types:new Set(['drive.sign-school','drive.school-bus','drive.school-bus-pass','drive.pedestrian']),
  create(){return {seen:new Set(),counts:{},busSeen:false,crossingSeen:false,finished:false,result:null,parking:{ok:false,reason:'',gap:0,skew:0,withTraffic:false}};},
  model(){
    const seed=7,T=OTR.town.build(seed),zone=T.spec.schoolZone,lot=T.lots.find(l=>l.row===zone.row&&l.side===1&&l.park.x>T.vx[zone.to]+200);
    if(!lot)throw Error('The school drive has no physical finish bay.');
    const lots=[lot,...T.lots.filter(l=>l.id!==lot.id).slice(0,4)],plan={day:3,variant:seed,townSeed:seed,weather:'clear',clockMin:720,signs:1,traffic:1,navigation:1,
      route:lots.map((l,i)=>({lotId:l.id,stop:{answer:true,packages:[{number:l.number,street:l.street,tracking:'school-'+i,weight:4,service:'standard'}]}}))};
    const m=OTR.fpMission.create('campaign',seed,plan),s=this.create(),stop=m.stops[0],bay=TownDriveScene.prototype.parkBay.call({van:{g:{hl:2.7}},P:20,T},lot);
    stop.index=1;stop.bay={streetX:m.town.school.x,z0:8-(bay.x1-T.depot.x)*.05,z1:8-(bay.x0-T.depot.x)*.05};
    // This entry is next to the town boundary. Keep the whole parked van inside it and face the entry sign.
    m.schoolLesson=s;s.bounds={...m.bounds};s.start={...m.van,x:m.town.school.x+m.town.road/4,z:m.town.school.z1+17.5,yaw:0,gear:1,hand:true,belt:false,look:.85};
    m.stops=[stop];m.parcels=[];m.phase='route';m.mode='cab';m.departed=m.secured=m.repaired=true;m.briefing=null;
    s.parkingModel=Object.create(m);s.parkingModel.drivingLesson={parking:s.parking};return m;
  },
  attach(run){
    const m=run.model,s=m.schoolLesson;if(s.attached)return false;s.attached=true;m.bounds={...s.bounds};m.trainingArea=null;m.mode='cab';Object.assign(m.van,s.start);run.log.setGroup('drive');
    OTR.fpDriving.configure(m);m.driving.siren.state='done';OTR.fpDriving.syncActors(m);OTR.fpNav.configure(m);
    const step=m.step;m.step=(input,seconds)=>{if(m.paused)return;step.call(m,input,seconds);const b=m.driving.bus.state,h=m.crossing.state;if(b==='flashing'||b==='leaving')s.busSeen=true;if(h==='developing'||h==='crossing')s.crossingSeen=true;};return true;
  },
  report(run,type,detail={}){
    const s=run.model.schoolLesson;if(s.finished||!this.types.has(type))return false;const key=type+'|'+String(detail.key??'');if(s.seen.has(key)||s.seen.size>=64)return false;
    const def=OTR_DATA.workdayEvents[type];s.seen.add(key);s.counts[type]=(s.counts[type]||0)+1;
    const options={lesson:def.lesson,critical:!!def.critical,severity:def.severity,where:detail.where};
    if(def.kind==='check')run.log.check(def.cat,detail.ok===false?0:def.max,def.max,detail.ok===false?def.fail:def.label,options);
    else if(def.kind==='penalty')run.log.penalty(def.cat,def.pts,def.label,options);return true;
  },
  parking(m){
    const s=m.schoolLesson,p=OTR.fpDrivingLesson.parking(s.parkingModel,m.stops[0]),v=m.van,stop=m.stops[0],b=stop.bay;
    if(!p.ok)return p;
    if(Math.cos(v.yaw-stop.park.yaw)<.94){p.ok=false;p.reason='Park the whole van in the marked bay, facing the same way as the traffic.';return p;}
    const width=Math.abs(Math.cos(v.yaw))*1.08+Math.abs(Math.sin(v.yaw))*2.7;
    const length=Math.abs(Math.sin(v.yaw))*1.08+Math.abs(Math.cos(v.yaw))*2.7;
    if(Math.abs(v.x-stop.park.x)+width>1.3||v.z-length<b.z0||v.z+length>b.z1){p.ok=false;p.reason='Keep the whole van inside the painted lines of the marked bay.';}
    return p;
  },
  ready(m){
    const s=m.schoolLesson,b=m.driving?.bus.state;
    return s.busSeen&&(b==='leaving'||b==='done')&&s.crossingSeen&&m.crossing.state==='resolved'&&this.parking(m).ok;
  },
  result(run,reason='complete'){
    const m=run.model,s=m.schoolLesson;if(s.result)return s.result;
    const complete=reason==='complete'&&this.ready(m);if(OTR.fpSigns)OTR.fpSigns.finish(m);
    for(const type of ['drive.sign-school','drive.school-bus'])if(!s.counts[type])this.report(run,type,{key:'required',ok:false});
    s.finished=true;const ratios=run.log.ratios(['safety']);if(!complete)ratios.safety=0;
    s.result={score:complete?run.log.score():0,ratios,log:run.log,lessons:complete?[]:['Complete the school drive and park in its marked bay.'],stats:{completed:complete,log:run.log.toJSON()}};return s.result;
  }
};
