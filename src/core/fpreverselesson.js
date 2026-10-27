/* Optional M8 reversing core. Existing motor, backing checks and report definitions stay authoritative. */
window.OTR=window.OTR||{};
OTR.fpReverseLesson={
  types:new Set(['drive.backing','drive.backing-walkaround','drive.mirrors','drive.contact']),
  model(){
    const m=OTR.fpMission.create('campaign',3);m.moduleReport=()=>false;OTR.fpRear.setupPractice(m);
    // The crossing lane is outside the tight bay's side walls, with room to inspect on foot.
    for(const wall of m.parkingWalls)if(wall.d>1){wall.z=-52;wall.d=6;}
    m.solids=[...m.parkingWalls,...Object.values(m._driveSolids)];
    const car={x:-8,z:-58,yaw:Math.PI/2,speed:0};m.traffic=[car];
    m.reverseLesson={attached:false,finished:false,overflow:false,result:null,seen:new Set(),checks:new Map(),
      crossing:'waiting',car,carBox:{x:-8,z:-58,w:3.6,d:1.8},carDistance:0,start:{...m.van},bounds:{x0:-11,x1:11,z0:-72,z1:-45}};
    m.stops=[];m.parcels=[];m.briefing=null;m.cargoOpen=false;m.checks={tyres:'ready',lights:'ready'};m.repaired=true;
    return m;
  },
  attach(run){
    const m=run.model,s=m.reverseLesson;if(s.attached)return false;
    s.attached=true;m.bounds={...s.bounds};Object.assign(m.van,s.start);m.mode='cab';m.phase='route';
    m.workdayRules={walkaround:'required'};m.parkingSpot='tight-drive';
    m.driving.bus.state=m.driving.siren.state='done';OTR.fpDriving.syncActors(m);run.log.setGroup('reverse');
    // Only this module's one crossing car moves. Pauses still stop the original mission step entirely.
    m.tickTraffic=dt=>{
      if(s.finished)return;
      if(s.crossing==='waiting'&&m.mode==='cab'&&m.van.gear===-1&&m.van.speed<-.1)s.crossing='crossing';
      if(s.crossing==='crossing'){
        const distance=Math.min(16-s.carDistance,1.5*dt),box=s.carBox;box.x=-8+s.carDistance+distance;box.z=s.car.z;
        // Never advance the NPC into the van's occupied footprint. The trainee can still
        // back into traffic, but a reported contact must leave room for a real recovery.
        if(OTR.fp.vanBox(m.van,box)){s.car.speed=0;return;}
        s.car.speed=1.5;s.carDistance+=distance;s.car.x=box.x;
        if(s.carDistance>=16){s.crossing='clear';s.car.speed=0;}
      }
    };
    // The ordinary pedestrian is absent; the existing traffic collision/sensor path observes the real car.
    m.crossing.state='resolved';m.crossing.x=1000;m.crossing.z=1000;m.tickCrossing=()=>{};
    const tick=m.tick;m.tick=function(input,dt){
      const reversing=this.mode==='cab'&&this.van.gear===-1;
      tick.call(this,input,dt);
      // The ordinary HUD contact report has a speed threshold. Any actual reverse contact is critical here.
      if(run.phase==='active'&&!s.finished&&!s.checks.has('drive.contact')&&reversing&&(this._rearContact||this.motion?.contact))OTR.fpMission.emit(this,'drive.contact',{
        key:'reverse:'+this.driving.reverseCount,
        where:{x:this.van.x,z:this.van.z,mph:Math.abs(this.van.speed)*2.2369362921}
      });
    };
    return true;
  },
  report(run,type,detail={}){
    const s=run.model.reverseLesson;if(run.phase!=='active'||s.finished||!this.types.has(type))return false;
    const key=type+'|'+String(detail.key??'');if(s.seen.has(key))return false;
    if(s.seen.size>=64){s.overflow=true;return false;}
    s.seen.add(key);const def=OTR_DATA.workdayEvents[type];
    const options={lesson:def.lesson,critical:!!def.critical,severity:def.severity,type,
      where:detail.where?{x:detail.where.x,z:detail.where.z,mph:detail.where.mph}:null};
    // One obligation per exercise; repeated manoeuvres cannot dilute an earlier failure or farm points.
    const previous=s.checks.get(type);
    if(previous){
      if(def.kind==='check'&&detail.ok===false&&previous.good){previous.got=0;previous.good=false;previous.partial=false;previous.label=def.fail;previous.critical=!!def.critical;previous.where=options.where;}
      return false;
    }
    const item=def.kind==='check'?run.log.check(def.cat,detail.ok===false?0:def.max,def.max,detail.ok===false?def.fail:def.label,options):
      run.log.penalty(def.cat,def.pts,def.label,options);s.checks.set(type,item);return true;
  },
  ready(m){
    const s=m.reverseLesson,v=m.van,b=m.parkingBay;
    return !s.overflow&&s.crossing==='clear'&&m.parking.done&&m.parked()&&
      Math.hypot(v.x-b.x,v.z-b.z)<.7&&Math.abs(Math.atan2(Math.sin(v.yaw-b.yaw),Math.cos(v.yaw-b.yaw)))<.12;
  },
  result(run,reason='complete'){
    const m=run.model,s=m.reverseLesson;if(s.result)return s.result;
    const complete=run.phase==='active'&&reason==='complete'&&this.ready(m);OTR.fpRear.finish(m);
    for(const type of ['drive.backing','drive.backing-walkaround','drive.mirrors'])if(!s.checks.has(type))this.report(run,type,{key:'required',ok:false});
    s.finished=true;const ratios=run.log.ratios(['safety']);if(!complete)ratios.safety=0;
    s.result={score:complete?run.log.score():0,ratios,log:run.log,
      lessons:complete?[]:['Complete the reversing maneuver and park safely inside the marked bay.'],
      stats:{completed:complete,crossing:s.crossing,log:run.log.toJSON()}};return s.result;
  }
};
